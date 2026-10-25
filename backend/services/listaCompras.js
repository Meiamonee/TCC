const mongoose = require('mongoose');
const Produto = require('../models/Produto');
const { SUPERMARKETS } = require('./importProducts');
const { buscarEquivalentes, buscarSimilares } = require('./comparacao');

const MAX_ITENS = 100;

function arredondar(valor) {
    return Math.round(valor * 100) / 100;
}

// O mesmo produto (marca, versao e tamanho) em cada mercado. So esses entram nos totais,
// para que a comparacao entre mercados seja sempre do mesmo carrinho.
async function iguaisDoItem(original) {
    const iguais = {};
    if (original.disponivel) {
        iguais[original.supermercado] = original;
    }
    for (const { produto } of await buscarEquivalentes(original)) {
        iguais[produto.supermercado] = produto;
    }
    return iguais;
}

// Nos mercados que nao tem o mesmo produto, o similar mais barato (por kg/L/un) de outra
// marca. Aparece numa lista separada e nao entra nos totais.
async function similaresDoItem(original, faltando) {
    const similares = {};
    if (faltando.length === 0) {
        return similares;
    }
    // Ja vem ordenado do menor preco por kg/L; o primeiro de cada mercado e o melhor.
    for (const similar of await buscarSimilares(original, { supermercados: faltando })) {
        if (!similares[similar.supermercado]) {
            similares[similar.supermercado] = similar;
        }
    }
    return similares;
}

// Quando o item ou o similar e vendido por kg, os tamanhos nao batem (1 kg de tomate a granel
// contra uma bandeja de 700 g). Nesse caso o similar e calculado pelo preco por kg, na mesma
// quantidade do item original. Devolve null quando nao da para converter.
function custoPorKg(original, similar) {
    if (original.unidade !== 'kg' && similar.unidade !== 'kg') {
        return null;
    }
    const kgDoOriginal = original.unidade === 'kg'
        ? 1
        : original.medida === 'massa' && original.quantidadeBase ? original.quantidadeBase / 1000 : null;
    const precoPorKg = similar.unidade === 'kg'
        ? similar.preco
        : similar.medida === 'massa' ? similar.precoPorUnidade : null;
    if (!kgDoOriginal || !precoPorKg) {
        return null;
    }
    return { precoPorKg, custo: precoPorKg * kgDoOriginal };
}

const resumo = produto => ({ id: String(produto._id), nome: produto.nome, preco: produto.preco, dataColeta: produto.dataColeta || null });

// O que a lista usa para um item num mercado: o mesmo produto ou, se faltar, o similar
// (calculado pelo preco por kg quando os tamanhos nao batem). null se nao houver nenhum.
function opcaoNoMercado(linha, slug) {
    const igual = linha.iguais[slug];
    const produto = igual || linha.similares[slug];
    if (!produto) {
        return null;
    }
    const porKg = igual ? null : custoPorKg(linha.original, produto);
    return {
        ...resumo(produto),
        tipo: igual ? 'igual' : 'similar',
        precoPorKg: porKg ? arredondar(porKg.precoPorKg) : null,
        subtotal: arredondar((porKg ? porKg.custo : produto.preco) * linha.item.quantidade)
    };
}

// Data da coleta mais recente entre os precos usados de um mercado.
function coletaMaisRecente(datas) {
    const validas = datas.filter(Boolean).map(data => new Date(data).getTime());
    return validas.length ? new Date(Math.max(...validas)) : null;
}

// Cota uma lista de compras em todos os supermercados.
async function cotarLista(itens) {
    const validos = (itens || [])
        .filter(item => mongoose.isValidObjectId(item.id))
        .slice(0, MAX_ITENS)
        .map(item => ({
            id: String(item.id),
            quantidade: Math.max(Number(item.quantidade) || 1, 0.001)
        }));

    const produtos = await Produto.find({ _id: { $in: validos.map(item => item.id) } }).lean();
    const produtoPorId = new Map(produtos.map(produto => [String(produto._id), produto]));
    const slugs = Object.keys(SUPERMARKETS);

    const linhas = [];
    for (const item of validos) {
        const original = produtoPorId.get(item.id);
        if (!original) continue;
        const iguais = await iguaisDoItem(original);
        const faltando = slugs.filter(slug => !iguais[slug]);
        linhas.push({ item, original, iguais, faltando, similares: await similaresDoItem(original, faltando) });
    }

    const porMercado = slugs.map(slug => {
        let total = 0;
        const faltando = [];
        const itensDoMercado = [];

        for (const linha of linhas) {
            const produto = linha.iguais[slug];
            if (!produto) {
                faltando.push(linha.original.nome);
                continue;
            }
            const subtotal = produto.preco * linha.item.quantidade;
            total += subtotal;
            itensDoMercado.push({ item: linha.item.id, ...resumo(produto), quantidade: linha.item.quantidade, subtotal: arredondar(subtotal) });
        }

        return {
            supermercado: slug,
            supermercadoNome: SUPERMARKETS[slug].nome,
            dataColeta: coletaMaisRecente(linhas.map(linha => opcaoNoMercado(linha, slug)?.dataColeta)),
            total: arredondar(total),
            encontrados: itensDoMercado.length,
            produtos: itensDoMercado,
            faltando
        };
    });

    // Melhor mercado para comprar tudo num lugar so: o que tem mais itens iguais e, entre
    // esses, o menor total.
    const melhorMercado = [...porMercado]
        .filter(mercado => mercado.encontrados > 0)
        .sort((a, b) => b.encontrados - a.encontrados || a.total - b.total)[0] || null;

    // Compra dividida: cada item no mercado onde o mesmo produto sai mais barato.
    const divisao = linhas.map(linha => {
        const produto = Object.values(linha.iguais).sort((a, b) => a.preco - b.preco)[0];
        return {
            id: linha.item.id,
            nome: linha.original.nome,
            quantidade: linha.item.quantidade,
            supermercado: produto ? produto.supermercado : null,
            supermercadoNome: produto ? SUPERMARKETS[produto.supermercado]?.nome : null,
            produtoId: produto ? String(produto._id) : null,
            produto: produto ? produto.nome : null,
            preco: produto ? produto.preco : null,
            subtotal: produto ? arredondar(produto.preco * linha.item.quantidade) : null
        };
    });

    const totalDividido = arredondar(divisao.reduce((soma, linha) => soma + (linha.subtotal || 0), 0));

    const precosPorItem = linhas.map(linha => ({
        id: linha.item.id,
        nome: linha.original.nome,
        quantidade: linha.item.quantidade,
        // Por mercado: o mesmo produto, o similar (tipo "similar") ou null.
        precos: Object.fromEntries(slugs.map(slug => [slug, opcaoNoMercado(linha, slug)]))
    }));

    // Itens que nao existem iguais em todos os mercados, com o similar de cada mercado que falta.
    const similares = linhas
        .filter(linha => linha.faltando.length > 0)
        .map(linha => ({
            id: linha.item.id,
            nome: linha.original.nome,
            quantidade: linha.item.quantidade,
            faltaEm: linha.faltando,
            opcoes: linha.faltando.map(slug => ({
                supermercado: slug,
                supermercadoNome: SUPERMARKETS[slug].nome,
                produto: linha.similares[slug] ? resumo(linha.similares[slug]) : null
            }))
        }));

    // Lista completa de cada mercado: o mesmo produto quando ele tem, e o similar no lugar do
    // que falta. Fica separada dos totais acima, que comparam so produtos iguais.
    const comSimilares = slugs.map(slug => {
        const itensDoMercado = [];
        const semOpcao = [];
        for (const linha of linhas) {
            const opcao = opcaoNoMercado(linha, slug);
            if (!opcao) {
                semOpcao.push(linha.original.nome);
                continue;
            }
            itensDoMercado.push({ item: linha.item.id, itemNome: linha.original.nome, quantidade: linha.item.quantidade, ...opcao });
        }
        return {
            supermercado: slug,
            supermercadoNome: SUPERMARKETS[slug].nome,
            total: arredondar(itensDoMercado.reduce((soma, item) => soma + item.subtotal, 0)),
            encontrados: itensDoMercado.length,
            similares: itensDoMercado.filter(item => item.tipo === 'similar').length,
            itens: itensDoMercado,
            semOpcao
        };
    });

    return {
        itens: precosPorItem,
        comSimilares,
        porMercado,
        melhorMercado,
        compraDividida: {
            total: totalDividido,
            economiaSobreMelhorMercado: melhorMercado && melhorMercado.encontrados === linhas.length
                ? arredondar(melhorMercado.total - totalDividido)
                : null,
            itens: divisao
        },
        similares
    };
}

module.exports = {
    cotarLista
};
