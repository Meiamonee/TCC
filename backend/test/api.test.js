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

    await t.test('filtra ofertas e monta o painel de estatisticas', async () => {
        const ofertas = await api('/api/produtos?ofertas=true');
        assert.equal(ofertas.corpo.total, 0, 'nenhum produto de teste tem preco "de"');

        const { status, corpo } = await api('/api/estatisticas');
        assert.equal(status, 200);
        assert.equal(corpo.resumo.produtosDisponiveis, 7);
        assert.equal(corpo.resumo.supermercados, 4);
        const supervaleResumo = corpo.porMercado.find(item => item.slug === 'supervale');
        assert.equal(supervaleResumo.disponiveis, 4);
        assert.equal(new Date(supervaleResumo.ultimaColeta).toISOString(), COLETA_1.toISOString());
        assert.ok(corpo.categorias.some(item => item.nome === 'Bebidas' && item.total === 4));
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

    await t.test('sugere similares de outra marca e mostra na lista separados do total', async () => {
        const sanmichel = [
            { id: '20', name: 'Feijão Carioca San Michel 1kg', price: 'R$ 5,49', unit: 'un', department: 'Mercearia', url: 'https://sanmichel.test/produto/20/feijao' },
            { id: '21', name: 'Feijão Carioca Du Irineu 1kg', price: 'R$ 7,95', unit: 'un', department: 'Mercearia', url: 'https://sanmichel.test/produto/21/feijao' },
            { id: '22', name: 'Feijão Carioca Kicaldo 1kg', price: 'R$ 6,50', unit: 'un', department: 'Mercearia', url: 'https://sanmichel.test/produto/22/feijao' },
            { id: '23', name: 'Feijão Preto San Michel 1kg', price: 'R$ 4,99', unit: 'un', department: 'Mercearia', url: 'https://sanmichel.test/produto/23/feijao' }
        ];
        await importarProdutosDoJson('sanmichel', { connect: false, produtos: sanmichel, agora: COLETA_2 });
        invalidarEstatisticas();

        const id = await buscarId('feijao carioca camil');
        const { status, corpo } = await api(`/api/produtos/${id}/similares`);
        assert.equal(status, 200);
        assert.deepEqual(
            corpo.similares.map(item => item.name),
            ['Feijão Carioca San Michel 1kg', 'Feijão Carioca Kicaldo 1kg'],
            'so cariocas de outra marca e mais baratos por kg; preto fica de fora'
        );
        assert.equal(corpo.similares[0].economiaPercentual, 21);

        // Na lista, o similar nao entra no total: aparece separado, no mercado que nao tem o item.
        const cotacao = (await api('/api/lista/cotacao', { method: 'POST', body: JSON.stringify({ itens: [{ id, quantidade: 2 }] }) })).corpo;
        const sanMichel = cotacao.porMercado.find(item => item.supermercado === 'sanmichel');
        assert.equal(sanMichel.encontrados, 0);
        assert.equal(sanMichel.total, 0);
        assert.deepEqual(sanMichel.faltando, ['Feijao Carioca Camil 1kg']);
        assert.equal(cotacao.compraDividida.itens[0].supermercado, 'supervale', 'a compra dividida so usa o mesmo produto');

        assert.equal(cotacao.similares.length, 1);
        const similarSanMichel = cotacao.similares[0].opcoes.find(opcao => opcao.supermercado === 'sanmichel');
        assert.equal(similarSanMichel.produto.nome, 'Feijão Carioca San Michel 1kg');
        assert.ok(cotacao.similares[0].faltaEm.includes('sanmichel'));
        assert.ok(!cotacao.similares[0].faltaEm.includes('supervale'));

        // Lista completa com similares: o San Michel entra com o feijao de outra marca.
        const completaSanMichel = cotacao.comSimilares.find(item => item.supermercado === 'sanmichel');
        assert.equal(completaSanMichel.total, 10.98);
        assert.equal(completaSanMichel.itens[0].tipo, 'similar');
        assert.equal(cotacao.comSimilares.find(item => item.supermercado === 'supervale').itens[0].tipo, 'igual');

        // Tabela item x mercado: igual, similar ou nada; e a data da coleta de cada mercado.
        assert.equal(cotacao.itens[0].precos.supervale.tipo, 'igual');
        assert.equal(cotacao.itens[0].precos.sanmichel.tipo, 'similar');
        assert.equal(cotacao.itens[0].precos.sanmichel.subtotal, 10.98);
        assert.ok(cotacao.porMercado.find(item => item.supermercado === 'supervale').dataColeta);
    });

    // Daqui em diante: SuperVale (coca, heineken, feijao camil; sabonete indisponivel),
    // Vila Sul (coca, heineken, feijao cabrera) e San Michel (4 feijoes) = 10 disponiveis.

    await t.test('mostra o detalhe de um produto com mercado e data da coleta', async () => {
        const id = await buscarId('cerveja heineken 350ml');
        const { status, corpo } = await api(`/api/produtos/${id}`);
        assert.equal(status, 200);
        assert.equal(corpo.id, id);
        assert.equal(corpo.supermercado, 'supervale');
        assert.equal(corpo.supermercadoNome, 'SuperVale');
        assert.equal(corpo.priceNumber, 4.98);
        assert.equal(corpo.url, 'https://supervale.test/produto/2/heineken');
        assert.ok(corpo.dataColeta);
    });

    await t.test('ordena e pagina a lista de produtos', async () => {
        const menor = await api('/api/produtos?ordenar=menor-preco&limit=3');
        assert.deepEqual(menor.corpo.data.map(item => item.priceNumber), [4.98, 4.99, 5.49]);
        assert.equal(menor.corpo.total, 10);
        assert.equal(menor.corpo.totalPages, 4);

        const maior = await api('/api/produtos?ordenar=maior-preco&limit=1');
        assert.equal(maior.corpo.data[0].priceNumber, 10.07);

        const porKg = await api('/api/produtos?ordenar=menor-preco-unidade&search=feijao&limit=1');
        assert.equal(porKg.corpo.data[0].name, 'Feijão Preto San Michel 1kg');

        const alem = await api('/api/produtos?page=99');
        assert.equal(alem.status, 200);
        assert.deepEqual(alem.corpo.data, []);

        // Limite fora da faixa e corrigido (1 a 100), em vez de devolver tudo de uma vez.
        const grande = await api('/api/produtos?limit=100000');
        assert.equal(grande.corpo.limit, 100);
    });

    await t.test('so mostra indisponiveis quando pedido', async () => {
        const padrao = await api('/api/produtos?search=sabonete');
        assert.equal(padrao.corpo.total, 0);

        const todos = await api('/api/produtos?search=sabonete&includeIndisponiveis=true');
        assert.equal(todos.corpo.total, 1);
        assert.equal(todos.corpo.data[0].disponivel, false);
    });

    await t.test('lista categorias padronizadas, com filtro por mercado', async () => {
        const { status, corpo } = await api('/api/categorias');
        assert.equal(status, 200);
        const porNome = Object.fromEntries(corpo.map(item => [item.nome, item]));
        assert.equal(porNome.Mercearia.total, 6);
        assert.equal(porNome.Bebidas.total, 4);
        assert.equal(porNome.Mercearia.alimento, true);
        assert.ok(!porNome['Higiene e Saúde'], 'o sabonete esta indisponivel');

        const sanMichel = await api('/api/categorias?supermercado=sanmichel');
        assert.deepEqual(sanMichel.corpo, [{ nome: 'Mercearia', total: 4, alimento: true }]);
    });

    await t.test('lista os supermercados com endereco, total e ultima coleta', async () => {
        const { status, corpo } = await api('/api/supermercados');
        assert.equal(status, 200);
        assert.deepEqual(corpo.map(item => item.slug).sort(), ['pedrilho', 'sanmichel', 'supervale', 'vilasul']);

        const supervaleInfo = corpo.find(item => item.slug === 'supervale');
        assert.equal(supervaleInfo.totalProdutos, 3);
        assert.equal(supervaleInfo.endereco, 'Av. João Pinheiro, 1460');
        assert.equal(new Date(supervaleInfo.ultimaColeta).toISOString(), COLETA_2.toISOString());

        assert.equal(corpo.find(item => item.slug === 'pedrilho').totalProdutos, 0);
    });

    await t.test('sugere produtos relacionados do mesmo tipo, sem repetir o proprio', async () => {
        const id = await buscarId('feijao carioca camil');
        const { status, corpo } = await api(`/api/produtos/${id}/relacionados?limite=3`);
        assert.equal(status, 200);
        assert.equal(corpo.tipo, 'feijao');
        assert.equal(corpo.produtos.length, 3);
        assert.ok(corpo.produtos.every(item => item.id !== id && /feij/i.test(item.name)));
        // Do menor preco por kg para o maior.
        assert.equal(corpo.produtos[0].name, 'Feijão Preto San Michel 1kg');
    });

    await t.test('informa a saude da API e o estado da coleta', async () => {
        const saude = await api('/api/health');
        assert.equal(saude.status, 200);
        assert.equal(saude.corpo.ok, true);
        assert.equal(saude.corpo.database, mongoose.connection.name);

        const coleta = await api('/api/scraping/status');
        assert.equal(coleta.status, 200);
        assert.equal(coleta.corpo.emExecucao, false);
    });

    await t.test('ignora ids que nao existem mais na lista de compras', async () => {
        const id = await buscarId('cerveja heineken 350ml');
        const { status, corpo } = await api('/api/lista/cotacao', {
            method: 'POST',
            body: JSON.stringify({ itens: [{ id, quantidade: 1 }, { id: '6600aaaaaaaaaaaaaaaaaaaa', quantidade: 3 }, { id: 'nao-e-id' }] })
        });
        assert.equal(status, 200);
        assert.equal(corpo.itens.length, 1);
        assert.equal(corpo.melhorMercado.supermercado, 'supervale');
    });

    await t.test('valida entradas e protege a rota de scraping', async () => {
        assert.equal((await api('/api/produtos/123/comparacao')).status, 404);
        assert.equal((await api('/api/produtos/6600aaaaaaaaaaaaaaaaaaaa')).status, 404);
        assert.equal((await api('/api/lista/cotacao', { method: 'POST', body: '{}' })).status, 400);

        const tokenOriginal = process.env.ADMIN_TOKEN;
        try {
            delete process.env.ADMIN_TOKEN;
            assert.equal((await api('/api/scraping/atualizar', { method: 'POST' })).status, 503);

            process.env.ADMIN_TOKEN = 'segredo-de-teste-bem-longo';
            const semToken = await api('/api/scraping/atualizar', { method: 'POST' });
            assert.equal(semToken.status, 401);
            const tokenErrado = await api('/api/scraping/atualizar', { method: 'POST', headers: { Authorization: 'Bearer outro' } });
            assert.equal(tokenErrado.status, 401);
            const mercadoInvalido = await api('/api/scraping/atualizar', {
                method: 'POST',
                headers: { Authorization: 'Bearer segredo-de-teste-bem-longo' },
                body: JSON.stringify({ mercado: 'inexistente' })
            });
            assert.equal(mercadoInvalido.status, 400);
        } finally {
            if (tokenOriginal === undefined) delete process.env.ADMIN_TOKEN;
            else process.env.ADMIN_TOKEN = tokenOriginal;
        }
    });
});
