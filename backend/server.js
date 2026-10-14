require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Produto = require('./models/Produto');
const Categoria = require('./models/Categoria');
const Supermercado = require('./models/Supermercado');
const CanonicalProduct = require('./models/CanonicalProduct');
const { formatarPreco } = require('./services/importProducts');
const {catalogQuery} = require('./services/catalogQuery');
const {categoryOf} = require('./services/normalization');
const {categoryNamesFor} = require('./services/comparisonCategories');
const { requireAdminKey } = require('./services/adminAuth');
const {
    getCollectionStatus,
    isCollectionActive,
    launchCollection,
    recoverInterruptedRuns
} = require('./services/collectionRunner');
const { startScheduler } = require('./scheduler');

const enabledMarkets = require('../config/supermarkets.json').filter(m => m.collectionEnabled !== false).map(m => m.slug);
const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = String(process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        const error = new Error('Origem nao permitida');
        error.code = 'CORS_NOT_ALLOWED';
        error.statusCode = 403;
        return callback(error);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key']
}));
app.use(express.json({ limit: '32kb' }));
app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.API_RATE_LIMIT) || 600,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Muitas requisicoes. Tente novamente em alguns minutos.' }
}));

const adminRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.ADMIN_RATE_LIMIT) || 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Muitas tentativas administrativas. Tente novamente mais tarde.' }
});

const comparisonModule = import('../shared/comparison.mjs');
const comparisonFields='_id produtoId canonicalProductId promotion nome precoOriginal preco imagem url categoria categoriaOriginal priceBasis priceScope pricePackageQuantity priceUnitRaw priceBasisSource priceBasisConfidence gtin supermercado disponivel ultimaAtualizacao comparisonKey similarityKey alternativeFamilyKey unitPrice';
const MAX_RELATION_CANDIDATES = 80;

function formatarProduto(produto) {
    return {
        id: String(produto._id),
        productId: produto.produtoId,
        canonicalProductId: produto.canonicalProductId ? String(produto.canonicalProductId) : null,
        promotion: produto.promotion || null,
        name: produto.nome,
        price: produto.precoOriginal || formatarPreco(produto.preco),
        priceNumber: produto.preco,
        image: produto.imagem,
        url: produto.url,
        department: categoryOf(produto.categoria),
        originalDepartment: produto.categoriaOriginal,
        priceBasis: produto.priceBasis || 'unknown',
        priceScope: produto.priceScope || 'UNKNOWN',
        pricePackageQuantity: produto.pricePackageQuantity || null,
        priceUnitRaw: produto.priceUnitRaw || null,
        priceBasisSource: produto.priceBasisSource || 'unknown',
        priceBasisConfidence: produto.priceBasisConfidence || 0,
        unitPrice: produto.unitPrice || null,
        gtin: produto.gtin || null,
        supermercado: produto.supermercado,
        disponivel: produto.disponivel,
        ultimaAtualizacao: produto.ultimaAtualizacao
    };
}

app.get('/api/health', async (_req, res) => {
    res.json({
        ok: true,
        database: mongoose.connection.name || null,
        scrapingEmExecucao: isCollectionActive()
    });
});

app.get('/api/coleta/status', async (req, res, next) => {
    try {
        res.json(await getCollectionStatus(req.query.limit));
    } catch (error) {
        next(error);
    }
});

app.get('/api/produtos', async (req, res, next) => {
    try {
        const {filter,sort,page,limit} = catalogQuery(req.query, enabledMarkets, Produto.normalizarNome);
        if (req.query.categoria) {
            const knownCategories = await Produto.distinct('categoria', {supermercado: {$in: enabledMarkets}});
            filter.categoria = {$in: categoryNamesFor(req.query.categoria, knownCategories)};
        }
        const skip = (page - 1) * limit;

        const [produtos, total] = await Promise.all([
            Produto.find(filter)
                .select(comparisonFields)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Produto.countDocuments(filter)
        ]);

        res.json({
            data: produtos.map(formatarProduto),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        next(error);
    }
});

app.get('/api/catalogo/filtros', async (req, res, next) => {
    try {
        const base = {supermercado: {$in: enabledMarkets}};
        const available = req.query.includeIndisponiveis === 'true' ? base : {...base, disponivel:true};
        const [marketRows, categories] = await Promise.all([
            Produto.aggregate([{$match:available},{$group:{_id:'$supermercado',count:{$sum:1}}}]),
            Produto.distinct('categoria', base)
        ]);
        res.json({markets:Object.fromEntries(marketRows.map(row=>[row._id,row.count])),categories:[...new Set(categories.filter(Boolean).map(categoryOf))].sort((a,b)=>a.localeCompare(b,'pt-BR'))});
    } catch (error) { next(error); }
});

app.get('/api/produtos/:id/comparacoes', async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({error:'Produto não encontrado'});
        const source = await Produto.findOne({_id:req.params.id,supermercado:{$in:enabledMarkets}}).select(comparisonFields).lean();
        if (!source) return res.status(404).json({error:'Produto não encontrado'});
        const selected = formatarProduto(source);
        const [canonical,offerCount] = source.canonicalProductId ? await Promise.all([
            CanonicalProduct.findById(source.canonicalProductId).lean(),
            Produto.countDocuments({canonicalProductId:source.canonicalProductId,supermercado:{$in:enabledMarkets}})
        ]) : [null,0];
        const candidateBase = {
            supermercado:{$in:enabledMarkets.filter(slug=>slug!==source.supermercado)},
            disponivel:true
        };
        let candidateRows;
        if (source.canonicalProductId || source.comparisonKey || source.similarityKey
            || (source.alternativeFamilyKey && source.unitPrice?.unit)) {
            const relationQueries = [];
            if (source.canonicalProductId) relationQueries.push(
                Produto.find({...candidateBase,canonicalProductId:source.canonicalProductId})
                    .select(comparisonFields).limit(MAX_RELATION_CANDIDATES).lean()
            );
            if (source.comparisonKey) relationQueries.push(
                Produto.find({...candidateBase,comparisonKey:source.comparisonKey})
                    .select(comparisonFields).limit(MAX_RELATION_CANDIDATES).lean()
            );
            if (source.similarityKey) relationQueries.push(
                Produto.find({...candidateBase,similarityKey:source.similarityKey})
                    .select(comparisonFields).limit(MAX_RELATION_CANDIDATES).lean()
            );
            if (source.alternativeFamilyKey && source.unitPrice?.unit) relationQueries.push(
                Produto.find({
                    ...candidateBase,
                    alternativeFamilyKey:source.alternativeFamilyKey,
                    'unitPrice.unit':source.unitPrice.unit
                })
                    .select(comparisonFields)
                    .sort({'unitPrice.value':1})
                    .limit(MAX_RELATION_CANDIDATES)
                    .lean()
            );
            const relationResults = await Promise.all(relationQueries);
            candidateRows = [...new Map(relationResults.flat().map(product=>[String(product._id),product])).values()];
        } else {
            // Compatibilidade durante uma migração incompleta dos produtos antigos.
            const knownCategories = await Produto.distinct('categoria', {supermercado: {$in: enabledMarkets}});
            const relatedCategories = categoryNamesFor(source.categoria, knownCategories, true);
            candidateRows = await Produto.find({...candidateBase,categoria:{$in:relatedCategories}})
                .select(comparisonFields)
                .lean();
        }
        const {comparisonGroups} = await comparisonModule;
        res.json({product:selected,canonical:canonical && {
            id:String(canonical._id),name:canonical.name,brand:canonical.brand,
            type:canonical.type,quantity:canonical.quantity,variant:canonical.variant,
            packaging:canonical.packaging,offerCount
        },groups:comparisonGroups(selected,candidateRows.map(formatarProduto))});
    } catch (error) { next(error); }
});

app.get('/api/categorias', async (_req, res, next) => {
    try {
        const ids = await Produto.distinct('categoriaId', { supermercado: { $in: enabledMarkets } });
        const categorias = await Categoria.find({ _id: { $in: ids } })
            .select('nome slug')
            .sort({ nome: 1 })
            .lean();

        res.json(categorias);
    } catch (error) {
        next(error);
    }
});

app.get('/api/supermercados', async (_req, res, next) => {
    try {
        const supermercados = await Supermercado.find({ ativo: true, slug: { $in: enabledMarkets } })
            .select('nome slug url ultimaAtualizacao')
            .sort({ nome: 1 })
            .lean();

        res.json(supermercados);
    } catch (error) {
        next(error);
    }
});

app.post('/api/scraping/atualizar', adminRateLimiter, requireAdminKey, async (req, res, next) => {
    try {
        const run = await launchCollection({
            trigger: 'manual',
            market: req.body?.mercado || req.query.mercado
        });
        res.status(202).json({
            message: 'Coleta iniciada em segundo plano.',
            run,
            statusUrl: '/api/coleta/status'
        });
    } catch (error) {
        next(error);
    }
});

app.use((error, _req, res, _next) => {
    console.error(error);
    const status = error.statusCode
        || (error.type === 'entity.parse.failed' ? 400 : 500);
    const safeMessages = {
        400: error.message || 'Requisicao invalida',
        401: 'Nao autorizado',
        403: 'Origem nao permitida',
        409: 'Uma coleta ja esta em execucao',
        413: 'Corpo da requisicao muito grande'
    };
    res.status(status).json({
        error: safeMessages[status] || 'Erro interno do servidor'
    });
});

async function startServer() {
    await connectDB();
    await recoverInterruptedRuns();
    startScheduler();
    app.listen(PORT, () => {
        console.log(`API rodando em http://localhost:${PORT}`);
    });
}

startServer().catch(error => {
    console.error('Falha ao iniciar a API:', error);
    process.exitCode = 1;
});
