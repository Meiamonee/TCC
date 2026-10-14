const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// Banco separado so para os testes; o banco da aplicacao nao e tocado.
const MONGO_TESTE = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/SuperPreco_test';

const { criarApp } = require('../app');
const { importarProdutosDoJson, sincronizarSupermercados } = require('../services/importProducts');
const { invalidarEstatisticas } = require('../services/comparacao');

const COLETA_1 = new Date('2026-10-01T09:00:00Z');
const COLETA_2 = new Date('2026-10-02T09:00:00Z');

const supervale = [
    { id: '1', name: 'Refrigerante Coca Cola Pet 2lt', price: 'R$ 10,99', unit: 'un', department: 'Bebidas', url: 'https://supervale.test/produto/1/coca' },
    { id: '2', name: 'Cerveja Heineken 350ml', price: 'R$ 4,98', unit: 'un', department: 'Bebidas', url: 'https://supervale.test/produto/2/heineken' },
    { id: '3', name: 'Feijao Carioca Camil 1kg', price: 'R$ 6,99', unit: 'un', department: 'Cereais e farináceos', url: 'https://supervale.test/produto/3/feijao' },
    { id: '4', name: 'Sabonete Lux Rosas 85g', price: 'R$ 2,49', unit: 'un', department: 'Perfumaria e higiene', url: 'https://supervale.test/produto/4/sabonete' }
];

const vilasul = [
    { id: '10', name: 'Refrigerante Coca-Cola Garrafa 2l', price: 'R$ 9,89', unit: 'un', department: 'Bebidas', url: 'https://vilasul.test/produto/10/coca' },
    { id: '11', name: 'Cerveja Lager Heineken Lata 350ml', price: 'R$ 5,71', unit: 'un', department: 'Bebidas', url: 'https://vilasul.test/produto/11/heineken' },
    { id: '12', name: 'Feijão Carioca Tipo 1 Cabrera 1kg', price: 'R$ 10,07', unit: 'un', department: 'Mercearia', url: 'https://vilasul.test/produto/12/feijao' }
];

let servidor;
let base;
let mongoDisponivel = true;

async function api(caminho, opcoes = {}) {
    const resposta = await fetch(`${base}${caminho}`, {
        ...opcoes,
        headers: { 'Content-Type': 'application/json', ...opcoes.headers }
    });
    return { status: resposta.status, corpo: await resposta.json() };
}

async function buscarId(termo) {
    const { corpo } = await api(`/api/produtos?search=${encodeURIComponent(termo)}`);
    return corpo.data[0].id;
}

test.before(async () => {
    try {
        await mongoose.connect(MONGO_TESTE, { serverSelectionTimeoutMS: 3000 });
    } catch {
        mongoDisponivel = false;
        return;
    }

    await mongoose.connection.dropDatabase();
    await sincronizarSupermercados({ connect: false });
    await importarProdutosDoJson('supervale', { connect: false, produtos: supervale, agora: COLETA_1 });
    await importarProdutosDoJson('vilasul', { connect: false, produtos: vilasul, agora: COLETA_1 });
    invalidarEstatisticas();

    servidor = criarApp().listen(0);
    base = `http://127.0.0.1:${servidor.address().port}`;
});

test.after(async () => {
    if (servidor) servidor.close();
    if (mongoDisponivel) {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
});

test('API e banco de dados', async (t) => {
    if (!mongoDisponivel) {
        t.skip(`MongoDB indisponivel em ${MONGO_TESTE}`);
        return;
    }

    await t.test('lista produtos com busca sem acento e paginacao', async () => {
        const { status, corpo } = await api('/api/produtos?search=feijao&limit=1');
        assert.equal(status, 200);
        assert.equal(corpo.total, 2);
        assert.equal(corpo.data.length, 1);
        assert.equal(corpo.totalPages, 2);
        assert.ok(corpo.data[0].dataColeta, 'produto deve trazer a data da coleta');
    });

    await t.test('filtra por categoria padronizada e por alimentos', async () => {
        const mercearia = await api('/api/produtos?categoria=Mercearia');
        assert.equal(mercearia.corpo.total, 2, 'Cereais (SuperVale) e Mercearia (Vila Sul) viram Mercearia');

        const alimentos = await api('/api/produtos?alimentos=true');
        assert.equal(alimentos.corpo.total, 6, 'o sabonete nao e alimento');
    });

    await t.test('expoe preco por unidade', async () => {
        const { corpo } = await api('/api/produtos?search=coca&supermercado=supervale');
        assert.equal(corpo.data[0].unitPrice, 5.5);
        assert.equal(corpo.data[0].unitPriceLabel, 'L');
    });

    await t.test('compara o mesmo produto entre supermercados', async () => {
        const id = await buscarId('coca cola pet 2lt');
        const { status, corpo } = await api(`/api/produtos/${id}/comparacao`);
        assert.equal(status, 200);
        assert.equal(corpo.equivalentes.length, 2);
        const maisBarato = corpo.equivalentes.find(item => item.maisBarato);
        assert.equal(maisBarato.supermercado, 'vilasul');
        assert.equal(corpo.economiaMaxima, 1.1);
    });

    await t.test('nao compara marcas diferentes', async () => {
        const id = await buscarId('feijao camil');
        const { corpo } = await api(`/api/produtos/${id}/comparacao`);
        assert.equal(corpo.equivalentes.length, 1, 'so o proprio produto');
    });

    await t.test('cota uma lista de compras', async () => {
        const itens = [
            { id: await buscarId('coca cola pet 2lt'), quantidade: 2 },
            { id: await buscarId('cerveja heineken 350ml'), quantidade: 6 }
        ];
        const { status, corpo } = await api('/api/lista/cotacao', { method: 'POST', body: JSON.stringify({ itens }) });
        assert.equal(status, 200);

        const porSlug = Object.fromEntries(corpo.porMercado.map(item => [item.supermercado, item]));
        assert.equal(porSlug.supervale.total, 51.86);
        assert.equal(porSlug.vilasul.total, 54.04);
        assert.equal(corpo.melhorMercado.supermercado, 'supervale');
        // Coca na Vila Sul (2 x 9,89) + Heineken no SuperVale (6 x 4,98)
        assert.equal(corpo.compraDividida.total, 49.66);
        assert.equal(corpo.compraDividida.economiaSobreMelhorMercado, 2.2);
    });

    await t.test('calcula a cesta basica com o menor preco por kg de cada item', async () => {
        const { status, corpo } = await api('/api/cesta-basica');
        assert.equal(status, 200);
        const supervaleCesta = corpo.porMercado.find(item => item.supermercado === 'supervale');
        const feijao = supervaleCesta.itens.find(item => item.item === 'Feijão');
        assert.equal(feijao.custo, 31.46, '4,5 kg x R$ 6,99/kg');
        assert.equal(supervaleCesta.itensEncontrados, 1);
        assert.equal(corpo.maisBarato, null, 'nenhum mercado tem a cesta completa nos dados de teste');
    });

    await t.test('registra historico e marca produtos que sumiram como indisponiveis', async () => {
        const novaColeta = supervale
            .filter(produto => produto.id !== '4')
            .map(produto => (produto.id === '1' ? { ...produto, price: 'R$ 9,49' } : produto));
        const resultado = await importarProdutosDoJson('supervale', { connect: false, produtos: novaColeta, agora: COLETA_2 });
        assert.equal(resultado.precosMudaram, 1);
        assert.equal(resultado.indisponiveis, 1);

        const id = await buscarId('coca cola pet 2lt');
        const { corpo } = await api(`/api/produtos/${id}/historico?dias=365`);
        assert.deepEqual(corpo.pontos.map(ponto => ponto.preco), [10.99, 9.49]);
        assert.equal(corpo.menorPreco, 9.49);
        assert.equal(corpo.menorPrecoDoPeriodo, true);

        const sabonete = await api('/api/produtos?search=sabonete');
        assert.equal(sabonete.corpo.total, 0);
    });

    await t.test('valida entradas e protege a rota de scraping', async () => {
        assert.equal((await api('/api/produtos/123/comparacao')).status, 404);
        assert.equal((await api('/api/produtos/6600aaaaaaaaaaaaaaaaaaaa')).status, 404);
        assert.equal((await api('/api/lista/cotacao', { method: 'POST', body: '{}' })).status, 400);

        const tokenOriginal = process.env.ADMIN_TOKEN;
        try {
            delete process.env.ADMIN_TOKEN;
            assert.equal((await api('/api/scraping/atualizar', { method: 'POST' })).status, 503);

            process.env.ADMIN_TOKEN = 'segredo-de-teste';
            const semToken = await api('/api/scraping/atualizar', { method: 'POST' });
            assert.equal(semToken.status, 401);
            const tokenErrado = await api('/api/scraping/atualizar', { method: 'POST', headers: { Authorization: 'Bearer outro' } });
            assert.equal(tokenErrado.status, 401);
            const mercadoInvalido = await api('/api/scraping/atualizar', {
                method: 'POST',
                headers: { Authorization: 'Bearer segredo-de-teste' },
                body: JSON.stringify({ mercado: 'inexistente' })
            });
            assert.equal(mercadoInvalido.status, 400);
        } finally {
            if (tokenOriginal === undefined) delete process.env.ADMIN_TOKEN;
            else process.env.ADMIN_TOKEN = tokenOriginal;
        }
    });
});
