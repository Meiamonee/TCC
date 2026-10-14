const Produto = require('../models/Produto');
const HistoricoPreco = require('../models/HistoricoPreco');
const { SUPERMARKETS } = require('./importProducts');
const { calcularCestaBasica } = require('./cestaBasica');
const { obterEstado } = require('./agendador');

const VALIDADE_CACHE_MS = 5 * 60 * 1000;
const HORARIOS_PADRAO = [6, 18];
const FUSO_OFFSET_HORAS = -3; // America/Sao_Paulo (sem horario de verao)

let cache = null;

function arredondar(valor) {
    return Math.round(valor * 100) / 100;
}

// Proximo horario da coleta automatica padrao (6h e 18h de Brasilia).
function proximaColeta(agora = new Date()) {
    if (process.env.SCRAPER_CRON || process.env.SCHEDULER_ENABLED === 'false') {
        return null;
    }

    const local = new Date(agora.getTime() + FUSO_OFFSET_HORAS * 3600 * 1000);
    for (let dia = 0; dia < 2; dia++) {
        for (const hora of HORARIOS_PADRAO) {
            const candidato = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + dia, hora - FUSO_OFFSET_HORAS);
            if (candidato > agora.getTime()) return new Date(candidato);
        }
    }
    return null;
}

// Produtos cujo preco mudou na ultima variacao registrada, com a diferenca em relacao ao preco anterior.
async function variacoesRecentes(slugs, limite = 6) {
    const variacoes = await HistoricoPreco.aggregate([
        { $match: { supermercado: { $in: slugs } } },
        { $sort: { produto: 1, data: -1 } },
        { $group: { _id: '$produto', precos: { $push: '$preco' }, datas: { $push: '$data' } } },
        { $match: { 'precos.1': { $exists: true } } },
        {
            $project: {
                atual: { $arrayElemAt: ['$precos', 0] },
                anterior: { $arrayElemAt: ['$precos', 1] },
                data: { $arrayElemAt: ['$datas', 0] }
            }
        },
        { $match: { $expr: { $ne: ['$atual', '$anterior'] } } },
        { $addFields: { percentual: { $divide: [{ $subtract: ['$atual', '$anterior'] }, '$anterior'] } } }
    ]);

    const ids = variacoes.map(item => item._id);
    const produtos = await Produto.find({ _id: { $in: ids }, disponivel: true })
        .select('nome supermercado imagem preco')
        .lean();
    const porId = new Map(produtos.map(produto => [String(produto._id), produto]));

    const completas = variacoes
        .filter(item => porId.has(String(item._id)))
        .map(item => {
            const produto = porId.get(String(item._id));
            return {
                id: String(item._id),
                nome: produto.nome,
                imagem: produto.imagem,
                supermercado: produto.supermercado,
                supermercadoNome: SUPERMARKETS[produto.supermercado]?.nome || produto.supermercado,
                precoAnterior: item.anterior,
                precoAtual: item.atual,
                diferenca: arredondar(item.atual - item.anterior),
                percentual: Math.round(item.percentual * 1000) / 10,
                data: item.data
            };
        });

    return {
        total: completas.length,
        quedas: completas.filter(item => item.diferenca < 0).sort((a, b) => a.percentual - b.percentual).slice(0, limite),
        altas: completas.filter(item => item.diferenca > 0).sort((a, b) => b.percentual - a.percentual).slice(0, limite),
        quantidadeQuedas: completas.filter(item => item.diferenca < 0).length,
        quantidadeAltas: completas.filter(item => item.diferenca > 0).length
    };
}

async function calcularEstatisticas() {
    const slugs = Object.keys(SUPERMARKETS);

    const [porMercadoBruto, porCategoria, coletas, primeiraColeta, variacoes, cesta] = await Promise.all([
        Produto.aggregate([
            { $match: { supermercado: { $in: slugs } } },
            {
                $group: {
                    _id: '$supermercado',
                    disponiveis: { $sum: { $cond: ['$disponivel', 1, 0] } },
                    indisponiveis: { $sum: { $cond: ['$disponivel', 0, 1] } },
                    ofertas: { $sum: { $cond: [{ $and: ['$disponivel', { $ne: ['$precoAnterior', null] }] }, 1, 0] } },
                    alimentos: { $sum: { $cond: [{ $and: ['$disponivel', '$alimento'] }, 1, 0] } },
                    ultimaColeta: { $max: '$dataColeta' }
                }
            }
        ]),
        Produto.aggregate([
            { $match: { supermercado: { $in: slugs }, disponivel: true } },
            { $group: { _id: { categoria: '$categoria', supermercado: '$supermercado' }, total: { $sum: 1 } } }
        ]),
        // Cada coleta grava seus registros de historico com o mesmo horario.
        HistoricoPreco.aggregate([
            { $match: { supermercado: { $in: slugs } } },
            { $group: { _id: { supermercado: '$supermercado', data: '$data' } } },
            { $group: { _id: '$_id.supermercado', coletas: { $sum: 1 } } }
        ]),
        Produto.findOne({ supermercado: { $in: slugs } }).sort({ dataCaptura: 1 }).select('dataCaptura').lean(),
        variacoesRecentes(slugs),
        calcularCestaBasica()
    ]);

    const brutoPorSlug = new Map(porMercadoBruto.map(item => [item._id, item]));
    const coletasPorSlug = new Map(coletas.map(item => [item._id, item.coletas]));
    const cestaPorSlug = new Map(cesta.porMercado.map(item => [item.supermercado, item]));

    const porMercado = slugs.map(slug => {
        const bruto = brutoPorSlug.get(slug) || {};
        const cestaMercado = cestaPorSlug.get(slug);
        return {
            slug,
            nome: SUPERMARKETS[slug].nome,
            url: SUPERMARKETS[slug].url,
            endereco: SUPERMARKETS[slug].enderecoLoja,
            disponiveis: bruto.disponiveis || 0,
            indisponiveis: bruto.indisponiveis || 0,
            ofertas: bruto.ofertas || 0,
            alimentos: bruto.alimentos || 0,
            ultimaColeta: bruto.ultimaColeta || null,
            coletasRealizadas: coletasPorSlug.get(slug) || 0,
            cestaBasica: cestaMercado ? { total: cestaMercado.total, completa: cestaMercado.itensEncontrados === cestaMercado.itensTotal } : null
        };
    });

    const categorias = {};
    for (const { _id, total } of porCategoria) {
        categorias[_id.categoria] = categorias[_id.categoria] || { nome: _id.categoria, total: 0, porMercado: {} };
        categorias[_id.categoria].total += total;
        categorias[_id.categoria].porMercado[_id.supermercado] = total;
    }

    const ultimas = porMercado.map(item => item.ultimaColeta).filter(Boolean).map(data => new Date(data).getTime());
    const estado = obterEstado();

    return {
        geradoEm: new Date(),
        resumo: {
            produtosDisponiveis: porMercado.reduce((soma, item) => soma + item.disponiveis, 0),
            produtosIndisponiveis: porMercado.reduce((soma, item) => soma + item.indisponiveis, 0),
            ofertas: porMercado.reduce((soma, item) => soma + item.ofertas, 0),
            alimentos: porMercado.reduce((soma, item) => soma + item.alimentos, 0),
            supermercados: slugs.length,
            categorias: Object.keys(categorias).length,
            ultimaColeta: ultimas.length ? new Date(Math.max(...ultimas)) : null,
            primeiraColeta: primeiraColeta?.dataCaptura || null,
            proximaColeta: proximaColeta(),
            mudancasDePreco: variacoes.total
        },
        coleta: {
            emExecucao: estado.emExecucao,
            inicio: estado.inicio,
            ultimaExecucao: estado.ultimaExecucao,
            agendamento: process.env.SCHEDULER_ENABLED === 'false'
                ? 'desligado'
                : (process.env.SCRAPER_CRON || 'todos os dias às 6h e às 18h')
        },
        porMercado,
        categorias: Object.values(categorias).sort((a, b) => b.total - a.total),
        cestaBasica: {
            referencia: cesta.referencia,
            maisBarato: cesta.maisBarato,
            porMercado: cesta.porMercado.map(item => ({
                supermercado: item.supermercado,
                supermercadoNome: item.supermercadoNome,
                total: item.total,
                itensEncontrados: item.itensEncontrados,
                itensTotal: item.itensTotal
            }))
        },
        variacoes
    };
}

// As estatisticas mudam apenas a cada coleta, entao guardamos o resultado por alguns minutos.
async function obterEstatisticas({ forcar = false } = {}) {
    if (!forcar && cache && Date.now() - cache.em < VALIDADE_CACHE_MS && !obterEstado().emExecucao) {
        return { ...cache.dados, coleta: { ...cache.dados.coleta, ...obterEstado() } };
    }
    const dados = await calcularEstatisticas();
    cache = { em: Date.now(), dados };
    return dados;
}

function invalidarEstatisticasGerais() {
    cache = null;
}

module.exports = {
    invalidarEstatisticasGerais,
    obterEstatisticas,
    proximaColeta
};
