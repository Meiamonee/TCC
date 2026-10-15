const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Produto = require('../models/Produto');
const { importarProdutosDoJson } = require('../services/importProducts');

// Banco proprio deste arquivo, apagado no inicio e no fim.
const MONGO_TESTE = (process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/SuperPreco_test').replace(/\/([^/?]+)(\?|$)/, '/$1_importacao$2');

let mongoDisponivel = true;

function produtos(quantidade, preco = 'R$ 5,00') {
    return Array.from({ length: quantidade }, (_, i) => ({
        id: String(i + 1),
        name: `Produto de teste ${i + 1} 500g`,
        price: preco,
        unit: 'un',
        department: 'Mercearia',
        url: `https://supervale.test/produto/${i + 1}`
    }));
}

test.before(async () => {
    try {
        await mongoose.connect(MONGO_TESTE, { serverSelectionTimeoutMS: 3000 });
        await mongoose.connection.dropDatabase();
    } catch {
        mongoDisponivel = false;
    }
});

test.after(async () => {
    if (mongoDisponivel) {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
});

test('coleta bem menor que o normal nao some com os produtos do mercado', async (t) => {
    if (!mongoDisponivel) return t.skip('MongoDB nao esta rodando');

    await importarProdutosDoJson('supervale', { connect: false, produtos: produtos(200), agora: new Date('2026-10-01T09:00:00Z') });

    // Coleta que falhou no meio: so 50 dos 200 produtos (ex.: menu do site nao carregou).
    const parcial = await importarProdutosDoJson('supervale', { connect: false, produtos: produtos(50, 'R$ 4,50'), agora: new Date('2026-10-01T21:00:00Z') });

    assert.equal(parcial.coletaIncompleta, true);
    assert.equal(parcial.indisponiveis, 0);
    assert.equal(await Produto.countDocuments({ supermercado: 'supervale', disponivel: true }), 200);
    // Os produtos que vieram sao atualizados normalmente.
    assert.equal((await Produto.findOne({ supermercado: 'supervale', produtoId: '1' }).lean()).preco, 4.5);
});

test('coleta completa marca como indisponivel o que saiu do site', async (t) => {
    if (!mongoDisponivel) return t.skip('MongoDB nao esta rodando');

    // 190 dos 200: dez produtos sairam do site de verdade.
    const resultado = await importarProdutosDoJson('supervale', { connect: false, produtos: produtos(190), agora: new Date('2026-10-02T09:00:00Z') });

    assert.equal(resultado.coletaIncompleta, false);
    assert.equal(resultado.indisponiveis, 10);
    assert.equal(await Produto.countDocuments({ supermercado: 'supervale', disponivel: true }), 190);
});

test('preco da embalagem fica no produto e o preco por kg vem do tamanho informado pelo site', async (t) => {
    if (!mongoDisponivel) return t.skip('MongoDB nao esta rodando');

    await importarProdutosDoJson('vilasul', {
        connect: false,
        agora: new Date('2026-10-02T09:00:00Z'),
        produtos: [{ id: '11941', name: 'Salame Perdigão 700g', price: 'R$ 48,93', unit: 'un', packageSize: '700g', department: 'Frios e laticínios', url: 'https://vilasul.test/produto/11941' }]
    });

    const salame = await Produto.findOne({ supermercado: 'vilasul', produtoId: '11941' }).lean();
    assert.equal(salame.preco, 48.93);
    assert.equal(salame.embalagem, '700g');
    assert.equal(salame.precoPorUnidade, 69.9);
    assert.equal(salame.unidadeMedida, 'kg');
});
