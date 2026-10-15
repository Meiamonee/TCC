const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const mongoose = require('mongoose');
const Produto = require('./models/Produto');
const HistoricoPreco = require('./models/HistoricoPreco');
const Supermercado = require('./models/Supermercado');
const { formatarPreco, SUPERMARKETS } = require('./services/importProducts');
const { buscarEquivalentes, buscarSimilares, carregarEstatisticas, palavrasDeTipo, precoComparavel } = require('./services/comparacao');
const { cotarLista } = require('./services/listaCompras');
const { calcularCestaBasica } = require('./services/cestaBasica');
const { obterEstatisticas } = require('./services/estatisticas');
const { executarAtualizacao, obterEstado } = require('./services/agendador');

const LIMITE_PADRAO = 40;
const LIMITE_MAXIMO = 100;
const PAGINA_MAXIMA = 1000;
const BUSCA_MAXIMA = 100;
const DIAS_HISTORICO = 90;
const QUANTIDADE_MAXIMA = 999;
const ITENS_MAXIMOS_NA_LISTA = 100;
const TAMANHO_MINIMO_TOKEN_ADMIN = 16;

// Limite de requisicoes por IP em uma janela de tempo, para que um cliente nao sobrecarregue a
// API nem o banco. Os valores podem ser trocados nos testes (criarApp({ limites })).
const LIMITES_PADRAO = {
    janelaMs: 60 * 1000,
    geral: 300, // consultas por minuto
    cotacao: 30, // cotacoes de lista por minuto (cada uma faz varias consultas)
    admin: 5 // tentativas por minuto na rota administrativa
};

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

// Le um parametro da URL como texto; parametros repetidos (?a=1&a=2) sao recusados.
function textoDaQuery(query, nome) {
    const valor = query[nome];
    if (valor === undefined || valor === '') return '';
    if (typeof valor !== 'string') {
        throw erroHttp(400, `Parametro invalido: ${nome}`);
    }
    return valor;
}

function validarSupermercado(slug) {
    if (slug && !SUPERMARKETS[slug]) {
        throw erroHttp(400, `Supermercado desconhecido: ${slug}`);
    }
    return slug;
}

function montarFiltroProdutos(query) {
    const filtro = {
        supermercado: { $in: Object.keys(SUPERMARKETS) }
    };

    if (query.includeIndisponiveis !== 'true') {
        filtro.disponivel = true;
    }

    const supermercado = validarSupermercado(textoDaQuery(query, 'supermercado'));
    if (supermercado) {
        filtro.supermercado = supermercado;
    }

    const busca = textoDaQuery(query, 'search');
    if (busca.length > BUSCA_MAXIMA) {
        throw erroHttp(400, `A busca pode ter no maximo ${BUSCA_MAXIMA} caracteres`);
    }

    const categoria = textoDaQuery(query, 'categoria');
    if (categoria) {
        filtro.categoria = categoria;
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
    const termos = Produto.normalizarNome(busca).split(' ').filter(Boolean).slice(0, 8);
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

// Valida os itens da lista de compras. Ids que nao existem mais sao ignorados na cotacao
// (a lista fica salva no navegador e pode ter produtos antigos), mas o formato precisa estar certo.
function validarItensDaLista(corpo) {
    const itens = corpo?.itens;
    if (!Array.isArray(itens)) {
        throw erroHttp(400, 'Envie { itens: [{ id, quantidade }] }');
    }
    if (itens.length > ITENS_MAXIMOS_NA_LISTA) {
        throw erroHttp(400, `A lista pode ter no maximo ${ITENS_MAXIMOS_NA_LISTA} itens`);
    }

    return itens.map((item, indice) => {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string') {
            throw erroHttp(400, `Item ${indice + 1} invalido: envie { id, quantidade }`);
        }
        if (item.quantidade !== undefined) {
            const quantidade = Number(item.quantidade);
            if (!Number.isFinite(quantidade) || quantidade <= 0 || quantidade > QUANTIDADE_MAXIMA) {
                throw erroHttp(400, `Item ${indice + 1}: a quantidade deve estar entre 0 e ${QUANTIDADE_MAXIMA}`);
            }
        }
        return { id: item.id, quantidade: item.quantidade, aceitaSimilar: item.aceitaSimilar !== false };
    });
}

// Protege rotas administrativas com o token definido em ADMIN_TOKEN.
function exigirAdmin(req, _res, next) {
    const esperado = process.env.ADMIN_TOKEN;
    // Um token curto seria facil de adivinhar; nesse caso a rota fica desligada.
    if (!esperado || esperado.length < TAMANHO_MINIMO_TOKEN_ADMIN) {
        next(erroHttp(503, `Atualizacao manual desabilitada: defina ADMIN_TOKEN no backend (minimo ${TAMANHO_MINIMO_TOKEN_ADMIN} caracteres)`));
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

function criarLimitador(maximo, janelaMs, { ignorar } = {}) {
    return rateLimit({
        windowMs: janelaMs,
        skip: ignorar,
        limit: maximo,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: (_req, res) => {
            res.status(429).json({ error: 'Muitas requisicoes. Aguarde um pouco e tente de novo.' });
        }
    });
}

function criarApp({ limites = {} } = {}) {
    const app = express();
    const limite = { ...LIMITES_PADRAO, ...limites };

    app.disable('x-powered-by');
    // Atras de um proxy (Render, Caddy), o IP do cliente vem no cabecalho X-Forwarded-For.
    // TRUST_PROXY diz quantos proxies confiar; sem isso, o limite seria por IP do proxy.
    if (process.env.TRUST_PROXY) {
        const saltos = Number.parseInt(process.env.TRUST_PROXY, 10);
        app.set('trust proxy', Number.isNaN(saltos) ? process.env.TRUST_PROXY : saltos);
    }

    // Cabecalhos de seguranca (nosniff, HSTS, bloqueio de iframe etc.). A API so devolve JSON,
    // entao a politica de conteudo bloqueia tudo; o site e servido separadamente (Cloudflare Pages).
    app.use(helmet({
        contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
        crossOriginResourcePolicy: { policy: 'cross-origin' }
    }));
    app.use(cors({
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(origem => origem.trim()) : true
    }));
    // A verificacao de saude (chamada o tempo todo pelo Render) fica fora do limite.
    app.use('/api', criarLimitador(limite.geral, limite.janelaMs, { ignorar: req => req.path === '/health' }));
    app.use(express.json({ limit: '20kb' }));

    app.get('/api/health', (req, res) => {
        res.json({
            ok: true,
            database: mongoose.connection.name || null,
            scrapingEmExecucao: obterEstado().emExecucao,
            // So para conferir o TRUST_PROXY na hospedagem: mostra o IP que a API enxerga
            // (o de quem fez a requisicao), usado no limite de requisicoes.
            ...(process.env.MOSTRAR_IP === 'true' ? {
                ip: req.ip,
                cadeia: req.ips,
                cabecalhos: Object.fromEntries(Object.entries(req.headers).filter(([nome]) => /ip|forwarded|^cf-|^x-real/i.test(nome)))
            } : {})
        });
    });

    // Lista paginada de produtos com busca e filtros.
    app.get('/api/produtos', rota(async (req, res) => {
        const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), PAGINA_MAXIMA);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || LIMITE_PADRAO, 1), LIMITE_MAXIMO);
        const filtro = montarFiltroProdutos(req.query);
        const ordenar = textoDaQuery(req.query, 'ordenar');
        if (ordenar && !ORDENACOES[ordenar]) {
            throw erroHttp(400, `Ordenacao desconhecida: ${ordenar}. Use ${Object.keys(ORDENACOES).join(', ')}`);
        }
        const ordenacao = ORDENACOES[ordenar] || { categoria: 1, nome: 1 };

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

    // Outros produtos do mesmo tipo (ex.: outras cervejas), para continuar navegando.
    // Sem tipo identificado, usa o mesmo departamento.
    app.get('/api/produtos/:id/relacionados', rota(async (req, res) => {
        const produto = await carregarProduto(req.params.id);
        const limite = Math.min(Math.max(Number.parseInt(req.query.limite, 10) || 12, 1), 30);
        const [nucleo] = palavrasDeTipo(produto, await carregarEstatisticas());

        const filtro = {
            _id: { $ne: produto._id },
            disponivel: true,
            categoria: produto.categoria,
            supermercado: { $in: Object.keys(SUPERMARKETS) }
        };
        if (nucleo) filtro.tokens = nucleo;

        const candidatos = await Produto.find(filtro).limit(400).lean();

        // Um item por nome (o mesmo produto aparece em varios mercados), do menor preco por kg/L.
        const vistos = new Set([produto.nomeNormalizado]);
        const relacionados = candidatos
            .sort((a, b) => precoComparavel(a) - precoComparavel(b))
            .filter(item => {
                if (vistos.has(item.nomeNormalizado)) return false;
                vistos.add(item.nomeNormalizado);
                return true;
            })
            .slice(0, limite);

        res.json({ tipo: nucleo || null, produtos: relacionados.map(formatarProduto) });
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
        const supermercado = validarSupermercado(textoDaQuery(req.query, 'supermercado'));
        if (supermercado) {
            filtro.supermercado = supermercado;
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
    app.post('/api/lista/cotacao', criarLimitador(limite.cotacao, limite.janelaMs), rota(async (req, res) => {
        res.json(await cotarLista(validarItensDaLista(req.body)));
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
    app.post('/api/scraping/atualizar', criarLimitador(limite.admin, limite.janelaMs), exigirAdmin, (req, res, next) => {
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
        const status = error.status || error.statusCode || (error.type === 'entity.parse.failed' ? 400 : 500);
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
