const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Supermercado = require('../models/Supermercado');
const Categoria = require('../models/Categoria');
const Produto = require('../models/Produto');

const { MERCADOS } = require('../../scraper/mercados');

const SCRAPER_OUTPUT_DIR = path.resolve(__dirname, '../../scraper/output');

const SUPERMARKETS = Object.fromEntries(MERCADOS.map(mercado => [
    mercado.slug,
    {
        nome: mercado.nome,
        slug: mercado.slug,
        url: mercado.url,
        productsPath: path.join(SCRAPER_OUTPUT_DIR, `${mercado.slug}.json`)
    }
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

    if (options.connect !== false) {
        await garantirConexao();
    }

    const productsPath = options.productsPath || config.productsPath;
    const productsData = carregarProdutos(productsPath);
    const { produtos, ignorados } = deduplicarProdutos(productsData);
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
        const preco = extrairPreco(product.price);
        const nome = product.name || 'Produto sem nome';
        const nomeNormalizado = Produto.normalizarNome(nome);
        const existente = existentesMap.get(product.produtoId);

        const precoAnterior = product.originalPrice ? extrairPreco(product.originalPrice) : null;
        const dataColeta = product.collectedAt ? new Date(product.collectedAt) : now;

        const base = {
            nome,
            nomeNormalizado,
            supermercado: config.slug,
            supermercadoId: supermercado._id,
            categoria: categoriaNome,
            categoriaId: categoriasMap[categoriaNome],
            subcategoria: product.subcategory || null,
            preco,
            precoOriginal: product.price || formatarPreco(preco),
            precoAnterior: precoAnterior && precoAnterior > preco ? precoAnterior : null,
            unidade: product.unit || null,
            etiqueta: product.tag || null,
            imagem: product.image || null,
            url: product.url || config.url,
            produtoId: product.produtoId,
            disponivel: true,
            dataColeta,
            ultimaAtualizacao: now
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

    const indisponiveis = await Produto.updateMany(
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

// Garante que o banco reflita a lista de mercados configurada: os mapeados ficam ativos e
// mercados removidos da configuracao (e seus produtos) deixam de aparecer na aplicacao.
async function sincronizarSupermercados(options = {}) {
    if (options.connect !== false) {
        await garantirConexao();
    }

    const slugsAtivos = Object.keys(SUPERMARKETS);

    for (const config of Object.values(SUPERMARKETS)) {
        await Supermercado.updateOne(
            { slug: config.slug },
            { $set: { nome: config.nome, url: config.url, ativo: true } },
            { upsert: true }
        );
    }

    const desativados = await Supermercado.updateMany(
        { slug: { $nin: slugsAtivos }, ativo: true },
        { $set: { ativo: false } }
    );

    const produtosOcultos = await Produto.updateMany(
        { supermercado: { $nin: slugsAtivos }, disponivel: true },
        { $set: { disponivel: false } }
    );

    return {
        ativos: slugsAtivos,
        supermercadosDesativados: desativados.modifiedCount,
        produtosOcultos: produtosOcultos.modifiedCount
    };
}

module.exports = {
    SUPERMARKETS,
    sincronizarSupermercados,
    extrairPreco,
    formatarPreco,
    importarProdutosDoJson
};
