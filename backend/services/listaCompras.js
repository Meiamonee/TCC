const mongoose = require('mongoose');
const Produto = require('../models/Produto');
const { SUPERMARKETS } = require('./importProducts');
const { buscarEquivalentes } = require('./comparacao');

const MAX_ITENS = 100;

function arredondar(valor) {
    return Math.round(valor * 100) / 100;
}

// Cota uma lista de compras em todos os supermercados.
// Cada item e um produto escolhido pelo usuario; nos outros mercados usamos o equivalente encontrado.
async function cotarLista(itens) {
    const validos = (itens || [])
        .filter(item => mongoose.isValidObjectId(item.id))
        .slice(0, MAX_ITENS)
        .map(item => ({ id: String(item.id), quantidade: Math.max(Number(item.quantidade) || 1, 0.001) }));

    const produtos = await Produto.find({ _id: { $in: validos.map(item => item.id) } }).lean();
    const produtoPorId = new Map(produtos.map(produto => [String(produto._id), produto]));
    const slugs = Object.keys(SUPERMARKETS);

    const linhas = [];
    for (const item of validos) {
        const original = produtoPorId.get(item.id);
        if (!original) continue;

        const opcoes = {};
        if (original.disponivel) {
            opcoes[original.supermercado] = original;
        }
        for (const { produto } of await buscarEquivalentes(original)) {
            opcoes[produto.supermercado] = produto;
        }

        linhas.push({ item, original, opcoes });
    }

    const porMercado = slugs.map(slug => {
        let total = 0;
        const faltando = [];

        for (const linha of linhas) {
            const produto = linha.opcoes[slug];
            if (produto) {
                total += produto.preco * linha.item.quantidade;
            } else {
                faltando.push(linha.original.nome);
            }
        }

        return {
            supermercado: slug,
            supermercadoNome: SUPERMARKETS[slug].nome,
            total: arredondar(total),
            encontrados: linhas.length - faltando.length,
            faltando
        };
    });

    // Melhor mercado para comprar tudo em um lugar: o que tem mais itens e, entre esses, o menor total.
    const melhorMercado = [...porMercado]
        .filter(mercado => mercado.encontrados > 0)
        .sort((a, b) => b.encontrados - a.encontrados || a.total - b.total)[0] || null;

    // Compra dividida: cada item no mercado onde ele esta mais barato.
    const divisao = linhas.map(linha => {
        const melhor = Object.values(linha.opcoes).sort((a, b) => a.preco - b.preco)[0];
        return {
            id: linha.item.id,
            nome: linha.original.nome,
            quantidade: linha.item.quantidade,
            supermercado: melhor ? melhor.supermercado : null,
            supermercadoNome: melhor ? SUPERMARKETS[melhor.supermercado]?.nome : null,
            produto: melhor ? melhor.nome : null,
            preco: melhor ? melhor.preco : null,
            subtotal: melhor ? arredondar(melhor.preco * linha.item.quantidade) : null
        };
    });

    const totalDividido = arredondar(divisao.reduce((soma, linha) => soma + (linha.subtotal || 0), 0));

    const precosPorItem = linhas.map(linha => ({
        id: linha.item.id,
        nome: linha.original.nome,
        quantidade: linha.item.quantidade,
        precos: Object.fromEntries(slugs.map(slug => [
            slug,
            linha.opcoes[slug]
                ? { id: String(linha.opcoes[slug]._id), nome: linha.opcoes[slug].nome, preco: linha.opcoes[slug].preco }
                : null
        ]))
    }));

    return {
        itens: precosPorItem,
        porMercado,
        melhorMercado,
        compraDividida: {
            total: totalDividido,
            economiaSobreMelhorMercado: melhorMercado && melhorMercado.encontrados === linhas.length
                ? arredondar(melhorMercado.total - totalDividido)
                : null,
            itens: divisao
        }
    };
}

module.exports = {
    cotarLista
};
