const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Supermercado = require('../models/Supermercado');
const Categoria = require('../models/Categoria');
const Produto = require('../models/Produto');
const { categoryOf } = require('./normalization');

const SUPERMARKETS = Object.fromEntries(require('../../config/supermarkets.json').map(market => [
    market.slug,
    { ...market, productsPath: path.resolve(__dirname, '../..', market.directory, 'products.json') }
]));

function slugify(value) {
    return String(value || 'sem-categoria')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

function extrairPreco(precoString) {
    if (!precoString) return 0;

    const normalized = String(precoString)
        .normalize('NFKC')
        .replace(/\s/g, '')
        .replace(/[^\d,.-]/g, '');

    const decimal = normalized
        .replace(/\.(?=\d{3}(?:\D|$))/g, '')
        .replace(',', '.');

    const match = decimal.match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
}

function formatarPreco(preco) {
    return `R$ ${Number(preco || 0).toFixed(2).replace('.', ',')}`;
}

function priceMetadataFor(config, product) {
    const validBases = new Set(['kg', 'L', 'unit', 'unknown']);
    let priceBasis = validBases.has(product.priceBasis) ? product.priceBasis : 'unknown';
    let priceBasisSource = ['card','detail','name','platform-default','legacy','unknown'].includes(product.priceBasisSource)
        ? product.priceBasisSource : priceBasis === 'unknown' ? 'unknown' : 'legacy';
    let priceBasisConfidence = Number.isFinite(Number(product.priceBasisConfidence))
        ? Math.max(0, Math.min(100, Number(product.priceBasisConfidence)))
        : priceBasis === 'unknown' ? 0 : 70;

    // Arquivos antigos do Instabuy nao registravam o sufixo de unidade.
    if (config.slug === 'pedrilho' && priceBasis === 'unknown') {
        priceBasis = 'unit';
        priceBasisSource = 'legacy';
        priceBasisConfidence = 60;
    }

    const derivedScope = priceBasis === 'kg' ? 'PER_KG' : priceBasis === 'L' ? 'PER_L' : priceBasis === 'unit' ? 'TOTAL' : 'UNKNOWN';
    const priceScope = ['PER_KG','PER_L','TOTAL','UNKNOWN'].includes(product.priceScope) && product.priceScope !== 'UNKNOWN'
        ? product.priceScope : derivedScope;
    const quantity = product.pricePackageQuantity;
    let pricePackageQuantity;
    if (quantity && Number(quantity.value) > 0) {
        let value = Number(quantity.value);
        let unit = String(quantity.unit || '').toLowerCase();
        if (unit === 'g' || unit === 'gr') { value /= 1000; unit = 'kg'; }
        else if (unit === 'ml') { value /= 1000; unit = 'L'; }
        else if (unit === 'l' || unit === 'lt') unit = 'L';
        else if (/^un/.test(unit)) unit = 'un';
        if (['kg','L','un'].includes(unit)) pricePackageQuantity = {value,unit};
    }
    return {
        priceBasis,
        priceScope,
        pricePackageQuantity: pricePackageQuantity || null,
        priceUnitRaw: product.priceUnitRaw || null,
        priceBasisSource,
        priceBasisConfidence
    };
}

function priceBasisFor(config, product) {
    return priceMetadataFor(config, product).priceBasis;
}

function extrairProdutoId(produto) {
    if (produto.id) return String(produto.id);
    const urlMatch = produto.url?.match(/\/produto\/(\d+)\//);
    return urlMatch ? urlMatch[1] : null;
}

function carregarProdutos(productsPath) {
    if (!fs.existsSync(productsPath)) {
        throw new Error(`Arquivo de produtos nao encontrado: ${productsPath}`);
    }

    const data = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    if (!Array.isArray(data)) {
        throw new Error(`Arquivo de produtos invalido: ${productsPath}`);
    }

    return data;
}

function deduplicarProdutos(productsData) {
    const seen = new Set();
    const produtos = [];
    let ignorados = 0;

    for (const product of productsData) {
        const produtoId = extrairProdutoId(product);
        const key = produtoId || product.url || `${product.name}-${product.department}`;

        if (!key || seen.has(key)) {
            ignorados++;
            continue;
        }

        seen.add(key);
        produtos.push({
            ...product,
            produtoId
        });
    }

    return { produtos, ignorados };
}

async function garantirConexao() {
    if (mongoose.connection.readyState !== 1) {
        await connectDB();
    }
}

async function importarProdutosDoJson(supermercadoSlug, options = {}) {
    const config = SUPERMARKETS[supermercadoSlug];
    if (!config) {
        throw new Error(`Supermercado desconhecido: ${supermercadoSlug}`);
    }

    if (config.collectionEnabled === false) throw new Error(config.disabledReason);

    if (options.connect !== false) {
        await garantirConexao();
    }

    const productsPath = options.productsPath || config.productsPath;
    const productsData = (options.products || carregarProdutos(productsPath)).map(p => ({...p, originalDepartment: p.originalDepartment || p.department, department: categoryOf(p.department)}));
    if (!productsData.length) throw new Error('Arquivo vazio: importacao interrompida para preservar produtos existentes.');
    const { produtos, ignorados } = deduplicarProdutos(productsData);
    if (!produtos.some(p => p.produtoId)) throw new Error('Nenhum produto com ID válido; importação cancelada.');
    if (produtos.some(p => p.capturedAt && !Number.isFinite(Date.parse(p.capturedAt)))) throw new Error('Data de captura inválida.');
    const now = new Date();

    const supermercado = await Supermercado.findOneAndUpdate(
        { slug: config.slug },
        {
            nome: config.nome,
            slug: config.slug,
            url: config.url,
            ativo: true,
            ultimaAtualizacao: now
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const categoriasUnicas = [...new Set(produtos.map(p => p.department || 'Sem categoria'))];
    const categoriasMap = {};

    for (const nomeCategoria of categoriasUnicas) {
        const slug = slugify(nomeCategoria);
        const categoria = await Categoria.findOneAndUpdate(
            { slug },
            {
                nome: nomeCategoria,
                slug,
                $addToSet: {
                    mapeamentos: {
                        supermercado: config.slug,
                        nomeOriginal: nomeCategoria
                    }
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        categoriasMap[nomeCategoria] = categoria._id;
    }

    const produtosValidos = produtos.filter(p => p.produtoId);
    const { comparisonKey, comparisonMetadata, promotionOf } = await import('../../shared/comparison.mjs');
    const idsNoScraper = produtosValidos.map(p => p.produtoId);
    const existentes = await Produto.find({
        supermercado: config.slug,
        produtoId: { $in: idsNoScraper }
    }).select('_id produtoId preco').lean();

    const existentesMap = new Map(existentes.map(p => [p.produtoId, p]));
    const bulkOps = [];
    let novos = 0;
    let atualizados = 0;
    let precosMudaram = 0;
    let erros = produtos.length - produtosValidos.length + ignorados;

    for (const product of produtosValidos) {
        const categoriaNome = product.department || 'Sem categoria';
        const preco = extrairPreco(product.regularPrice || product.normalPrice || product.price);
        const nome = product.name || 'Produto sem nome';
        const nomeNormalizado = Produto.normalizarNome(nome);
        const priceMetadata = priceMetadataFor(config, product);
        const existente = existentesMap.get(product.produtoId);
        const detectedPromotion = promotionOf(product);
        const promotionalPrice = detectedPromotion
            ? extrairPreco(product.promotionPrice || product.promotionalPrice || product.price)
            : 0;
        const promotion = detectedPromotion ? {
            ...detectedPromotion,
            promotionalPrice: promotionalPrice > 0 ? promotionalPrice : undefined
        } : null;
        const comparisonProduct = {
            name: nome,
            department: categoriaNome,
            priceBasis: priceMetadata.priceBasis,
            priceNumber: preco,
            promotion
        };
        const candidateKey = comparisonKey(comparisonProduct);
        const relationMetadata = comparisonMetadata(comparisonProduct);

        const base = {
            nome,
            nomeNormalizado,
            comparisonKey: candidateKey,
            ...relationMetadata,
            supermercado: config.slug,
            supermercadoId: supermercado._id,
            categoria: categoriaNome,
            categoriaOriginal: product.originalDepartment || categoriaNome,
            ...priceMetadata,
            promotion,
            gtin: product.gtin || product.ean || null,
            categoriaId: categoriasMap[categoriaNome],
            preco,
            precoOriginal: product.regularPrice || product.normalPrice || product.price || formatarPreco(preco),
            imagem: product.image || null,
            url: product.url || config.url,
            produtoId: product.produtoId,
            disponivel: product.disponivel !== false,
            ultimaAtualizacao: product.capturedAt ? new Date(product.capturedAt) : now
        };

        if (existente) {
            const precoMudou = Number(existente.preco) !== preco;
            const update = {
                $set: base
            };

            if (precoMudou) {
                update.$push = {
                    historico: {
                        preco,
                        data: now
                    }
                };
                precosMudaram++;
            }

            bulkOps.push({
                updateOne: {
                    filter: { _id: existente._id },
                    update
                }
            });
            atualizados++;
        } else {
            bulkOps.push({
                insertOne: {
                    document: {
                        ...base,
                        dataCaptura: now,
                        historico: [{
                            preco,
                            data: now
                        }]
                    }
                }
            });
            novos++;
        }
    }

    if (bulkOps.length > 0) {
        await Produto.bulkWrite(bulkOps, { ordered: false });
    }

    if (options.syncCanonicalProducts !== false) {
        await require('./canonicalProducts').syncCanonicalProducts({supermercado:config.slug,produtoId:{$in:idsNoScraper}});
    }

    // Uma amostra nao permite concluir que os demais produtos sairam da loja.
    const indisponiveis = options.partial ? { modifiedCount: 0 } : await Produto.updateMany(
        {
            supermercado: config.slug,
            produtoId: { $nin: idsNoScraper },
            disponivel: true
        },
        {
            $set: {
                disponivel: false,
                ultimaAtualizacao: now
            }
        }
    );

    await Supermercado.updateOne(
        { _id: supermercado._id },
        { $set: { ultimaAtualizacao: now } }
    );

    return {
        supermercado: config.slug,
        arquivo: productsPath,
        encontrados: productsData.length,
        processados: produtosValidos.length,
        novos,
        atualizados,
        precosMudaram,
        indisponiveis: indisponiveis.modifiedCount,
        erros
    };
}

module.exports = {
    SUPERMARKETS,
    extrairPreco,
    formatarPreco,
    priceMetadataFor,
    priceBasisFor,
    importarProdutosDoJson
};
