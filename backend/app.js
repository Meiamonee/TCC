const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Produto = require('./models/Produto');
const HistoricoPreco = require('./models/HistoricoPreco');
const Supermercado = require('./models/Supermercado');
const { formatarPreco, SUPERMARKETS } = require('./services/importProducts');
const { buscarEquivalentes, buscarSimilares, precoComparavel } = require('./services/comparacao');
const { cotarLista } = require('./services/listaCompras');
const { calcularCestaBasica } = require('./services/cestaBasica');
const { obterEstatisticas } = require('./services/estatisticas');
const { executarAtualizacao, obterEstado } = require('./services/agendador');

const LIMITE_PADRAO = 40;
const LIMITE_MAXIMO = 100;
const DIAS_HISTORICO = 90;

const ORDENACOES = {
    nome: { nome: 1 },
    'menor-preco': { preco: 1, nome: 1 },
    'maior-preco': { preco: -1, nome: 1 },
    'menor-preco-unidade': { precoPorUnidade: 1, nome: 1 }
};

// Erro esperado, cuja mensagem pode ser mostrada ao cliente.
function erroHttp(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    erro.expose = true;
    return erro;
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nomeDoMercado(slug) {
    return SUPERMARKETS[slug]?.nome || slug;
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
        unitPrice: produto.precoPorUnidade || null,
        unitPriceLabel: produto.unidadeMedida || null,
        tag: produto.etiqueta || null,
        image: produto.imagem,
        url: produto.url,
        department: produto.categoria,
        originalDepartment: produto.departamentoOriginal || null,
        subcategory: produto.subcategoria || null,
        isFood: produto.alimento !== false,
        supermercado: produto.supermercado,
        supermercadoNome: nomeDoMercado(produto.supermercado),
        disponivel: produto.disponivel,
        dataColeta: produto.dataColeta || produto.ultimaAtualizacao
    };
}

function montarFiltroProdutos(query) {
    const filtro = {
        supermercado: { $in: Object.keys(SUPERMARKETS) }
    };

    if (query.includeIndisponiveis !== 'true') {
        filtro.disponivel = true;
    }

    if (query.supermercado) {
        filtro.supermercado = String(query.supermercado);
    }

    if (query.categoria) {
        filtro.categoria = String(query.categoria);
    }

    if (query.alimentos === 'true') {
        filtro.alimento = true;
    }

    if (query.ofertas === 'true') {
        filtro.precoAnterior = { $ne: null };
    }

    if (query.ordenar === 'menor-preco-unidade') {
        filtro.precoPorUnidade = { $ne: null };
    }

    // Cada palavra digitada precisa aparecer no nome (sem diferenciar acentos).
    const termos = Produto.normalizarNome(query.search || '').split(' ').filter(Boolean).slice(0, 8);
    if (termos.length > 0) {
        filtro.$and = termos.map(termo => ({ nomeNormalizado: new RegExp(escapeRegex(termo)) }));
    }

    return filtro;
}

async function carregarProduto(id) {
    if (!mongoose.isValidObjectId(id)) {
        throw erroHttp(404, 'Produto nao encontrado');
    }

    const produto = await Produto.findById(id).lean();
    if (!produto) {
        throw erroHttp(404, 'Produto nao encontrado');
    }

    return produto;
}

// Protege rotas administrativas com o token definido em ADMIN_TOKEN.
function exigirAdmin(req, _res, next) {
    const esperado = process.env.ADMIN_TOKEN;
    if (!esperado) {
        next(erroHttp(503, 'Atualizacao manual desabilitada: defina ADMIN_TOKEN no backend'));
        return;
    }

    const recebido = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const a = Buffer.from(recebido);
    const b = Buffer.from(esperado);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        next(erroHttp(401, 'Nao autorizado'));
        return;
    }

    next();
}

const rota = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function criarApp() {
    const app = express();

    app.disable('x-powered-by');
    app.use(cors({
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true
    }));
    app.use(express.json({ limit: '100kb' }));

    app.get('/api/health', (_req, res) => {
        res.json({
            ok: true,
            database: mongoose.connection.name || null,
            scrapingEmExecucao: obterEstado().emExecucao
        });
    });

    // Lista paginada de produtos com busca e filtros.
    app.get('/api/produtos', rota(async (req, res) => {
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || LIMITE_PADRAO, 1), LIMITE_MAXIMO);
        const filtro = montarFiltroProdutos(req.query);
        const ordenacao = ORDENACOES[req.query.ordenar] || { categoria: 1, nome: 1 };

        const [produtos, total] = await Promise.all([
            Produto.find(filtro).sort(ordenacao).skip((page - 1) * limit).limit(limit).lean(),
            Produto.countDocuments(filtro)
        ]);

        res.json({
            data: produtos.map(formatarProduto),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    }));

    app.get('/api/produtos/:id', rota(async (req, res) => {
        res.json(formatarProduto(await carregarProduto(req.params.id)));
    }));

    // Mesmo produto nos outros supermercados, do mais barato para o mais caro.
    app.get('/api/produtos/:id/comparacao', rota(async (req, res) => {
        const produto = await carregarProduto(req.params.id);
        const equivalentes = await buscarEquivalentes(produto);

        const opcoes = [{ produto, similaridade: 1 }, ...equivalentes]
            .sort((a, b) => precoComparavel(a.produto) - precoComparavel(b.produto));
        const maisBarato = opcoes[0].produto;

        res.json({
            produto: formatarProduto(produto),
            equivalentes: opcoes.map(({ produto: item, similaridade }) => ({
                ...formatarProduto(item),
                similaridade: Math.round(similaridade * 100) / 100,
                diferenca: Math.round((item.preco - maisBarato.preco) * 100) / 100,
                maisBarato: String(item._id) === String(maisBarato._id)
            })),
            economiaMaxima: Math.round((Math.max(...opcoes.map(o => o.produto.preco)) - maisBarato.preco) * 100) / 100
        });
    }));

    // Produtos parecidos de outras marcas (em qualquer supermercado) mais baratos por kg/L/un.
    app.get('/api/produtos/:id/similares', rota(async (req, res) => {
        const produto = await carregarProduto(req.params.id);
        const limite = Math.min(Math.max(Number.parseInt(req.query.limite, 10) || 6, 1), 20);
        const referencia = precoComparavel(produto);

        const similares = (await buscarSimilares(produto))
            .filter(item => precoComparavel(item) < referencia)
            .slice(0, limite);

        res.json({
            produto: formatarProduto(produto),
            criterio: 'Mesmo tipo de produto, mesma versão e tamanho parecido (até 25% de diferença), de outra marca.',
            similares: similares.map(item => ({
                ...formatarProduto(item),
                similar: true,
                mesmoSupermercado: item.supermercado === produto.supermercado,
                economiaPorUnidade: produto.precoPorUnidade && item.precoPorUnidade
                    ? Math.round((produto.precoPorUnidade - item.precoPorUnidade) * 100) / 100
                    : null,
                economiaPercentual: Math.round((1 - precoComparavel(item) / referencia) * 100)
            }))
        });
    }));

    // Historico de precos dos ultimos dias, com menor e maior preco do periodo.
    app.get('/api/produtos/:id/historico', rota(async (req, res) => {
        const produto = await carregarProduto(req.params.id);
        const dias = Math.min(Math.max(Number.parseInt(req.query.dias, 10) || DIAS_HISTORICO, 1), 365);
        const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

        const [registros, anterior] = await Promise.all([
            HistoricoPreco.find({ produto: produto._id, data: { $gte: desde } }).sort({ data: 1 }).lean(),
            HistoricoPreco.findOne({ produto: produto._id, data: { $lt: desde } }).sort({ data: -1 }).lean()
        ]);

        // O preco vigente no inicio do periodo e o ultimo registrado antes dele.
        const pontos = [
            ...(anterior ? [{ data: desde, preco: anterior.preco }] : []),
            ...registros.map(registro => ({ data: registro.data, preco: registro.preco }))
        ];
        const precos = pontos.map(ponto => ponto.preco);

        res.json({
            produtoId: String(produto._id),
            dias,
            pontos,
            menorPreco: precos.length ? Math.min(...precos) : null,
            maiorPreco: precos.length ? Math.max(...precos) : null,
            precoAtual: produto.preco,
            consultadoEm: new Date(),
            menorPrecoDoPeriodo: precos.length > 1 && produto.preco <= Math.min(...precos)
        });
    }));

    app.get('/api/categorias', rota(async (req, res) => {
        const filtro = { disponivel: true, supermercado: { $in: Object.keys(SUPERMARKETS) } };
        if (req.query.supermercado) {
            filtro.supermercado = String(req.query.supermercado);
        }

        const categorias = await Produto.aggregate([
            { $match: filtro },
            { $group: { _id: '$categoria', total: { $sum: 1 }, alimento: { $first: '$alimento' } } },
            { $sort: { _id: 1 } }
        ]);

        res.json(categorias.map(item => ({ nome: item._id, total: item.total, alimento: item.alimento !== false })));
    }));

    app.get('/api/supermercados', rota(async (_req, res) => {
        const [supermercados, contagens] = await Promise.all([
            Supermercado.find({ ativo: true, slug: { $in: Object.keys(SUPERMARKETS) } })
                .select('nome slug url ultimaAtualizacao')
                .sort({ nome: 1 })
                .lean(),
            Produto.aggregate([
                { $match: { disponivel: true } },
                { $group: { _id: '$supermercado', total: { $sum: 1 }, ultimaColeta: { $max: '$dataColeta' } } }
            ])
        ]);

        const porSlug = new Map(contagens.map(item => [item._id, item]));
        res.json(supermercados.map(item => ({
            nome: item.nome,
            slug: item.slug,
            url: item.url,
            endereco: SUPERMARKETS[item.slug]?.enderecoLoja || null,
            totalProdutos: porSlug.get(item.slug)?.total || 0,
            ultimaColeta: porSlug.get(item.slug)?.ultimaColeta || item.ultimaAtualizacao
        })));
    }));

    // Cotacao da lista de compras em todos os mercados.
    app.post('/api/lista/cotacao', rota(async (req, res) => {
        const itens = Array.isArray(req.body?.itens) ? req.body.itens : null;
        if (!itens) {
            throw erroHttp(400, 'Envie { itens: [{ id, quantidade }] }');
        }
        res.json(await cotarLista(itens));
    }));

    // Custo da cesta basica do DIEESE em cada supermercado.
    app.get('/api/cesta-basica', rota(async (_req, res) => {
        res.json(await calcularCestaBasica());
    }));

    // Painel com numeros da coleta: produtos, ultima atualizacao, cesta basica e variacoes de preco.
    app.get('/api/estatisticas', rota(async (_req, res) => {
        res.json(await obterEstatisticas());
    }));

    app.get('/api/scraping/status', (_req, res) => {
        res.json(obterEstado());
    });

    // Dispara a coleta manualmente. Como leva bastante tempo, responde na hora e roda em segundo plano.
    app.post('/api/scraping/atualizar', exigirAdmin, (req, res, next) => {
        const mercado = req.body?.mercado || req.query.mercado;
        if (mercado && mercado !== 'todos' && !SUPERMARKETS[mercado]) {
            next(erroHttp(400, `Supermercado desconhecido: ${mercado}`));
            return;
        }
        if (obterEstado().emExecucao) {
            next(erroHttp(409, 'Atualizacao ja esta em execucao'));
            return;
        }

        executarAtualizacao({ mercado, origem: 'api' }).catch(error => {
            console.error('Falha na atualizacao pela API:', error.message);
        });
        res.status(202).json({ mensagem: 'Atualizacao iniciada', acompanhe: '/api/scraping/status' });
    });

    app.use('/api', (_req, _res, next) => next(erroHttp(404, 'Rota nao encontrada')));

    // Erros esperados devolvem a mensagem; erros internos sao registrados e nao expostos ao cliente.
    app.use((error, _req, res, _next) => {
        const status = error.status || (error.type === 'entity.parse.failed' ? 400 : 500);
        const exposto = error.expose || status < 500;
        if (!exposto) {
            console.error(error);
        }
        res.status(status).json({
            error: exposto ? error.message : 'Erro interno do servidor'
        });
    });

    return app;
}

module.exports = {
    criarApp,
    formatarProduto
};
