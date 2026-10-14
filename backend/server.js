require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Produto = require('./models/Produto');
const Categoria = require('./models/Categoria');
const Supermercado = require('./models/Supermercado');
const { formatarPreco, SUPERMARKETS } = require('./services/importProducts');
const { executarPipelineScraping } = require('./services/scrapingPipeline');

const app = express();
const PORT = process.env.PORT || 3001;
let scrapingEmExecucao = false;

app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true
}));
app.use(express.json({ limit: '1mb' }));

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatarProduto(produto) {
    return {
        id: String(produto._id),
        productId: produto.produtoId,
        name: produto.nome,
        price: produto.precoOriginal || formatarPreco(produto.preco),
        priceNumber: produto.preco,
        originalPriceNumber: produto.precoAnterior || null,
        unit: produto.unidade || null,
        tag: produto.etiqueta || null,
        image: produto.imagem,
        url: produto.url,
        department: produto.categoria,
        subcategory: produto.subcategoria || null,
        supermercado: produto.supermercado,
        supermercadoNome: SUPERMARKETS[produto.supermercado]?.nome || produto.supermercado,
        disponivel: produto.disponivel,
        dataColeta: produto.dataColeta || produto.ultimaAtualizacao,
        ultimaAtualizacao: produto.ultimaAtualizacao
    };
}

function montarFiltroProdutos(queryParams) {
    const filtro = {};

    if (queryParams.includeIndisponiveis !== 'true') {
        filtro.disponivel = true;
    }

    if (queryParams.supermercado) {
        filtro.supermercado = queryParams.supermercado;
    }

    if (queryParams.categoria) {
        filtro.categoria = queryParams.categoria;
    }

    if (queryParams.search) {
        const termoNormalizado = Produto.normalizarNome(queryParams.search);
        const regex = new RegExp(escapeRegex(termoNormalizado), 'i');
        filtro.nomeNormalizado = regex;
    }

    return filtro;
}

app.get('/api/health', async (_req, res) => {
    res.json({
        ok: true,
        database: mongoose.connection.name || null,
        scrapingEmExecucao
    });
});

app.get('/api/produtos', async (req, res, next) => {
    try {
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10000, 1), 50000);
        const skip = (page - 1) * limit;
        const filtro = montarFiltroProdutos(req.query);

        const [produtos, total] = await Promise.all([
            Produto.find(filtro)
                .sort({ supermercado: 1, categoria: 1, nome: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Produto.countDocuments(filtro)
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

app.get('/api/categorias', async (_req, res, next) => {
    try {
        const categorias = await Categoria.find({})
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
        const supermercados = await Supermercado.find({ ativo: true })
            .select('nome slug url ultimaAtualizacao')
            .sort({ nome: 1 })
            .lean();

        res.json(supermercados);
    } catch (error) {
        next(error);
    }
});

app.post('/api/scraping/atualizar', async (req, res, next) => {
    if (scrapingEmExecucao) {
        res.status(409).json({ error: 'Scraping ja esta em execucao' });
        return;
    }

    scrapingEmExecucao = true;

    try {
        const resultado = await executarPipelineScraping({
            mercado: req.body?.mercado || req.query.mercado
        });

        res.json(resultado);
    } catch (error) {
        next(error);
    } finally {
        scrapingEmExecucao = false;
    }
});

app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({
        error: error.message || 'Erro interno do servidor'
    });
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`API rodando em http://localhost:${PORT}`);
    });
});
