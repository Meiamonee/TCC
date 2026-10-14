const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Supermercado = require('../models/Supermercado');
const Categoria = require('../models/Categoria');
const Produto = require('../models/Produto');
const HistoricoPreco = require('../models/HistoricoPreco');
const { normalizarProduto } = require('./normalizacao');

const { MERCADOS } = require('../../scraper/mercados');

const SCRAPER_OUTPUT_DIR = path.resolve(__dirname, '../../scraper/output');

const SUPERMARKETS = Object.fromEntries(MERCADOS.map(mercado => [
    mercado.slug,
    {
        nome: mercado.nome,
        slug: mercado.slug,
        url: mercado.url,
        enderecoLoja: mercado.enderecoLoja || null,
        productsPath: path.join(SCRAPER_OUTPUT_DIR, `${mercado.slug}.json`)
    }
]));

function slugify(value) {
    return String(value || 'sem-categoria')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
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

// Converte um produto coletado pelo scraper no documento gravado no MongoDB.
function montarDocumento(product, config, supermercadoId, now) {
    const preco = extrairPreco(product.price);
    const nome = product.name || 'Produto sem nome';
    const precoAnterior = product.originalPrice ? extrairPreco(product.originalPrice) : null;
    const departamento = product.department || 'Sem categoria';
    const normalizado = normalizarProduto({
        nome,
        preco,
        unidadeVenda: product.unit,
        embalagem: product.packageSize,
        departamento
    });

    return {
        nome,
        nomeNormalizado: Produto.normalizarNome(nome),
        supermercado: config.slug,
        supermercadoId,
        categoria: normalizado.categoriaPadrao,
        departamentoOriginal: departamento,
        subcategoria: product.subcategory || null,
        alimento: normalizado.alimento,
        preco,
        precoOriginal: product.price || formatarPreco(preco),
        precoAnterior: precoAnterior && precoAnterior > preco ? precoAnterior : null,
        unidade: product.unit || null,
        embalagem: product.packageSize || null,
        etiqueta: product.tag || null,
        tokens: normalizado.tokens,
        variantes: normalizado.variantes,
        medida: normalizado.medida,
        quantidadeBase: normalizado.quantidadeBase,
        precoPorUnidade: normalizado.precoPorUnidade,
        unidadeMedida: normalizado.unidadeMedida,
        imagem: product.image || null,
        url: product.url || config.url,
        produtoId: product.produtoId,
        disponivel: true,
        dataColeta: product.collectedAt ? new Date(product.collectedAt) : now,
        ultimaAtualizacao: now
    };
}

// Garante a categoria padronizada e registra de qual departamento de cada mercado ela veio.
async function registrarCategorias(documentos, slugMercado) {
    const mapa = new Map();
    for (const doc of documentos) {
        if (!mapa.has(doc.categoria)) mapa.set(doc.categoria, new Set());
        mapa.get(doc.categoria).add(doc.departamentoOriginal);
    }

    const ids = {};
    for (const [nomeCategoria, departamentos] of mapa) {
        const slug = slugify(nomeCategoria);
        const categoria = await Categoria.findOneAndUpdate(
            { slug },
            {
                $set: { nome: nomeCategoria, slug },
                $addToSet: {
                    mapeamentos: {
                        $each: [...departamentos].map(nomeOriginal => ({ supermercado: slugMercado, nomeOriginal }))
                    }
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        ids[nomeCategoria] = categoria._id;
    }

    return ids;
}

// Importa os produtos coletados de um mercado: insere novos, atualiza existentes,
// registra mudancas de preco no historico e marca como indisponiveis os que sumiram do site.
async function importarProdutosDoJson(supermercadoSlug, options = {}) {
    const config = SUPERMARKETS[supermercadoSlug];
    if (!config) {
        throw new Error(`Supermercado desconhecido: ${supermercadoSlug}`);
    }

    if (options.connect !== false) {
        await garantirConexao();
    }

    const productsPath = options.productsPath || config.productsPath;
    const productsData = options.produtos || carregarProdutos(productsPath);
    const { produtos, ignorados } = deduplicarProdutos(productsData);
    const now = options.agora || new Date();

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

    const produtosValidos = produtos.filter(p => p.produtoId && extrairPreco(p.price) > 0);
    const documentos = produtosValidos.map(p => montarDocumento(p, config, supermercado._id, now));
    const categoriasIds = await registrarCategorias(documentos, config.slug);

    const idsNoScraper = documentos.map(doc => doc.produtoId);
    const existentes = await Produto.find({
        supermercado: config.slug,
        produtoId: { $in: idsNoScraper }
    }).select('_id produtoId preco disponivel').lean();

    const existentesMap = new Map(existentes.map(p => [p.produtoId, p]));
    const bulkOps = [];
    const historicoPendente = [];
    let novos = 0;
    let atualizados = 0;
    let precosMudaram = 0;
    const erros = produtos.length - produtosValidos.length + ignorados;

    for (const documento of documentos) {
        documento.categoriaId = categoriasIds[documento.categoria];
        const existente = existentesMap.get(documento.produtoId);

        if (existente) {
            if (Number(existente.preco) !== documento.preco || !existente.disponivel) {
                historicoPendente.push({ produtoId: documento.produtoId, preco: documento.preco });
                if (Number(existente.preco) !== documento.preco) precosMudaram++;
            }

            bulkOps.push({
                updateOne: {
                    filter: { _id: existente._id },
                    update: { $set: documento }
                }
            });
            atualizados++;
        } else {
            bulkOps.push({
                insertOne: {
                    document: { ...documento, dataCaptura: now }
                }
            });
            historicoPendente.push({ produtoId: documento.produtoId, preco: documento.preco });
            novos++;
        }
    }

    if (bulkOps.length > 0) {
        await Produto.bulkWrite(bulkOps, { ordered: false });
    }

    if (historicoPendente.length > 0) {
        const ids = await Produto.find({
            supermercado: config.slug,
            produtoId: { $in: historicoPendente.map(item => item.produtoId) }
        }).select('_id produtoId').lean();
        const idPorProduto = new Map(ids.map(p => [p.produtoId, p._id]));

        await HistoricoPreco.insertMany(historicoPendente.map(item => ({
            produto: idPorProduto.get(item.produtoId),
            supermercado: config.slug,
            preco: item.preco,
            data: now
        })), { ordered: false });
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
        arquivo: options.produtos ? null : productsPath,
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
