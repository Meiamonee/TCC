const mongoose = require('mongoose');
const Produto = require('../models/Produto');
const { SUPERMARKETS } = require('./importProducts');
const { buscarEquivalentes, buscarSimilares, precoComparavel } = require('./comparacao');

const MAX_ITENS = 100;

function arredondar(valor) {
    return Math.round(valor * 100) / 100;
}

// Opcoes de cada mercado para um item da lista:
// - "igual": o mesmo produto (marca, versao e tamanho);
// - "similar": outra marca do mesmo tipo, usada so quando o mercado nao tem o igual
//   e o usuario aceita substituicao.
async function opcoesDoItem(original, aceitaSimilar) {
    const opcoes = {};

    if (original.disponivel) {
        opcoes[original.supermercado] = { produto: original, tipo: 'igual' };
    }
    for (const { produto } of await buscarEquivalentes(original)) {
        opcoes[produto.supermercado] = { produto, tipo: 'igual' };
    }

    if (aceitaSimilar) {
        const faltando = Object.keys(SUPERMARKETS).filter(slug => !opcoes[slug]);
        if (faltando.length > 0) {
            // Ja vem ordenado do menor preco por kg/L; o primeiro de cada mercado e o melhor.
            for (const similar of await buscarSimilares(original, { supermercados: faltando })) {
                if (!opcoes[similar.supermercado]) {
                    opcoes[similar.supermercado] = { produto: similar, tipo: 'similar' };
                }
            }
        }
    }

    return opcoes;
}

// Cota uma lista de compras em todos os supermercados.
async function cotarLista(itens) {
    const validos = (itens || [])
        .filter(item => mongoose.isValidObjectId(item.id))
        .slice(0, MAX_ITENS)
        .map(item => ({
            id: String(item.id),
            quantidade: Math.max(Number(item.quantidade) || 1, 0.001),
            aceitaSimilar: item.aceitaSimilar !== false
        }));

    const produtos = await Produto.find({ _id: { $in: validos.map(item => item.id) } }).lean();
    const produtoPorId = new Map(produtos.map(produto => [String(produto._id), produto]));
    const slugs = Object.keys(SUPERMARKETS);

    const linhas = [];
    for (const item of validos) {
        const original = produtoPorId.get(item.id);
        if (!original) continue;
        linhas.push({ item, original, opcoes: await opcoesDoItem(original, item.aceitaSimilar) });
    }

    const porMercado = slugs.map(slug => {
        let total = 0;
        let totalIguais = 0;
        let encontradosIguais = 0;
        const faltando = [];
        const substituicoes = [];

        for (const linha of linhas) {
            const opcao = linha.opcoes[slug];
            if (!opcao) {
                faltando.push(linha.original.nome);
                continue;
            }
            const custo = opcao.produto.preco * linha.item.quantidade;
            total += custo;
            if (opcao.tipo === 'igual') {
                totalIguais += custo;
                encontradosIguais++;
            } else {
                substituicoes.push({ original: linha.original.nome, substituto: opcao.produto.nome, preco: opcao.produto.preco });
            }
        }

        return {
            supermercado: slug,
            supermercadoNome: SUPERMARKETS[slug].nome,
            total: arredondar(total),
            totalIguais: arredondar(totalIguais),
            encontrados: linhas.length - faltando.length,
            encontradosIguais,
            substituicoes,
            faltando
        };
    });

    // Melhor mercado para comprar tudo num lugar so: o que tem mais itens (contando substitutos)
    // e, entre esses, o menor total.
    const melhorMercado = [...porMercado]
        .filter(mercado => mercado.encontrados > 0)
        .sort((a, b) => b.encontrados - a.encontrados || a.total - b.total)[0] || null;

    // Compra dividida: cada item onde ele sai mais barato. Entre opcoes de tamanhos
    // diferentes (substitutos), compara o preco por kg/L/un.
    const divisao = linhas.map(linha => {
        const melhor = Object.values(linha.opcoes).sort((a, b) => precoComparavel(a.produto) - precoComparavel(b.produto))[0];
        const produto = melhor?.produto;
        return {
            id: linha.item.id,
            nome: linha.original.nome,
            quantidade: linha.item.quantidade,
            tipo: melhor?.tipo || null,
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
        aceitaSimilar: linha.item.aceitaSimilar,
        precos: Object.fromEntries(slugs.map(slug => {
            const opcao = linha.opcoes[slug];
            return [slug, opcao
                ? { id: String(opcao.produto._id), nome: opcao.produto.nome, preco: opcao.produto.preco, tipo: opcao.tipo }
                : null];
        }))
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
