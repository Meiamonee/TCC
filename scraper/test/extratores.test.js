const test = require('node:test');
const assert = require('node:assert/strict');
const { criarNavegador } = require('../lib/navegador');
const { confirmarUnidade } = require('../lib/unidade');
const vipcommerce = require('../plataformas/vipcommerce');
const ibecom = require('../plataformas/ibecom');
const { iniciarServidor } = require('./servidorFixtures');

// Testes de integracao dos extratores: o Chrome (Selenium, headless) abre paginas de exemplo
// servidas localmente, com cards copiados do DOM dos sites, e o extrator le o DOM como na coleta real.

let servidor;
let driver;

test.before(async () => {
    servidor = await iniciarServidor();
    driver = await criarNavegador({ headless: true });
});

test.after(async () => {
    if (driver) await driver.quit();
    if (servidor) await servidor.fechar();
});

const SEM_ESPERA = { delay: { pageDelayMs: 0, pageDelayJitterMs: 0 } };
const porId = produtos => Object.fromEntries(produtos.map(produto => [produto.id, produto]));

test('VipCommerce: descobre departamentos sem repetir e com o nome certo', async () => {
    const mercado = { slug: 'teste', url: `${servidor.url}/vip`, enderecoLoja: 'Av. João Pinheiro, 1460' };
    const departamentos = await vipcommerce.descobrirDepartamentos(driver, mercado);

    assert.deepEqual(departamentos, [
        // Nome vindo do aria-label "Ir para departamento de ...".
        { slug: 'hortifruti', nome: 'Hortifruti', url: `${servidor.url}/vip/departamentos/hortifruti` },
        // So a primeira linha do texto do link (a segunda e a contagem de produtos).
        { slug: 'bebidas-alcoolicas', nome: 'Bebidas Alcoólicas', url: `${servidor.url}/vip/departamentos/bebidas-alcoolicas` },
        // Link sem texto: o nome e montado a partir do slug.
        { slug: 'frios-e-laticinios', nome: 'Frios e laticinios', url: `${servidor.url}/vip/departamentos/frios-e-laticinios` }
    ]);
});

test('VipCommerce: le nome, preco, unidade, oferta e URL de cada card', async () => {
    await driver.get(`${servidor.url}/vip/departamentos/hortifruti?page=1`);
    const produtos = porId(await vipcommerce.extrairProdutosDaPagina(driver));

    assert.equal(Object.keys(produtos).length, 6);

    // Produto a peso em oferta: preco por kg e preco anterior riscado.
    assert.equal(produtos['6216'].name, 'Batata Doce Rosada 1kg (qtd.aprox.2un)');
    assert.equal(produtos['6216'].price, 'R$ 4,39');
    assert.equal(produtos['6216'].originalPrice, 'R$ 5,90');
    assert.equal(produtos['6216'].unit, 'kg');
    assert.equal(produtos['6216'].tag, 'Clube SuperVale');

    // Produto vendido por unidade, sem oferta.
    assert.equal(produtos['6173'].name, 'Massa Espaguete Renata Com Ovos Numero 9 500gr');
    assert.equal(produtos['6173'].price, 'R$ 4,69');
    assert.equal(produtos['6173'].originalPrice, null);
    assert.equal(produtos['6173'].unit, 'un');
    assert.equal(produtos['6173'].url, `${servidor.url}/produto/6173/massa-espaguete-renata-com-ovos-numero-9-500gr`);
    assert.match(produtos['6173'].image, /^https:\/\//);
});

test('VipCommerce: em embalagem fechada a peso, o preco anterior tambem e convertido para kg', async () => {
    await driver.get(`${servidor.url}/vip/departamentos/hortifruti?page=1`);
    const abobora = porId(await vipcommerce.extrairProdutosDaPagina(driver))['5752'];

    // O card mostra R$ 3,99/kg, R$ 11,17 pela embalagem de 2,8 kg e "de R$ 13,97" (da embalagem).
    assert.equal(abobora.price, 'R$ 3,99');
    assert.equal(abobora.unit, 'kg');
    assert.equal(abobora.originalPrice, 'R$ 4,99');
});

test('VipCommerce: percorre as paginas e para quando nao aparecem produtos novos', async () => {
    const mercado = { slug: 'teste', url: `${servidor.url}/vip`, enderecoLoja: 'Av. João Pinheiro, 1460' };
    // O servidor de teste devolve os mesmos cards em toda pagina: a pagina 1 traz 6 produtos
    // e as paginas 2 e 3 nao trazem nada novo, entao cada departamento termina ali.
    const produtos = await vipcommerce.raspar(driver, mercado, SEM_ESPERA);

    assert.equal(produtos.length, 6);
    // Cada produto fica no primeiro departamento em que apareceu.
    assert.ok(produtos.every(produto => produto.department === 'Hortifruti'));
});

test('iBecom: descobre categorias com nome, esperando o endereco da loja carregar', async () => {
    const mercado = { slug: 'teste', url: `${servidor.url}/ibecom`, enderecoLoja: 'R. José Augusto de Carvalho, 55, Poços de Caldas' };
    const categorias = await ibecom.descobrirCategorias(driver, mercado);

    assert.deepEqual(categorias, [
        // O link de imagem (sem texto) e o de texto apontam para a mesma categoria: fica o nome do texto.
        { slug: 'frutas-legumes-e-verduras', nome: 'Hortifruti', url: `${servidor.url}/ibecom/cat/frutas-legumes-e-verduras` },
        // Parametros da URL sao descartados; a categoria so com icone e ignorada.
        { slug: 'bebidas', nome: 'Bebidas', url: `${servidor.url}/ibecom/cat/bebidas` }
    ]);
});

test('iBecom: usa os links "Ver todos" para achar as subcategorias', async () => {
    const subcategorias = await ibecom.descobrirSubcategorias(driver, { url: `${servidor.url}/ibecom/cat/frutas-legumes-e-verduras` });

    assert.deepEqual(subcategorias, [
        { nome: 'Frutas', url: `${servidor.url}/sub/frutas-legumes-e-verduras/10` },
        { nome: 'Legumes', url: `${servidor.url}/sub/frutas-legumes-e-verduras/11` }
    ]);
});

test('iBecom: le preco com a unidade colada, ofertas e ignora produto sem preco', async () => {
    await driver.get(`${servidor.url}/sub/frutas-legumes-e-verduras/10`);
    const produtos = porId(await ibecom.extrairProdutosDaPagina(driver));

    // 4 cards reais + 1 oferta; o card "Indisponivel" (sem preco) fica de fora.
    assert.equal(Object.keys(produtos).length, 5);
    assert.ok(!Object.keys(produtos).some(id => id.startsWith('sem-estoque')));

    // "R$ 7,89kg": o preco sai sem a unidade e a unidade vira kg.
    assert.equal(produtos['banana-prata-grauda-kg'].price, 'R$ 7,89');
    assert.equal(produtos['banana-prata-grauda-kg'].unit, 'kg');
    assert.equal(produtos['banana-prata-grauda-kg'].name, 'Banana Prata Grauda');

    // Sem unidade no preco, o produto e vendido por unidade.
    const ameixa = produtos['ameixa-tozzi-70g-seca-sem-caroco-sache'];
    assert.equal(ameixa.unit, 'un');
    assert.equal(ameixa.originalPrice, null);
    assert.equal(ameixa.url, `${servidor.url}/p/ameixa-tozzi-70g-seca-sem-caroco-sache`);

    const oferta = produtos['oferta-ameixa-tozzi-70g-seca-sem-caroco-sache'];
    assert.equal(oferta.price, 'R$ 5,69');
    assert.equal(oferta.originalPrice, 'R$ 6,99');
});

test('a coleta e abortada quando a pagina mostra outra unidade da rede', async () => {
    await driver.get(`${servidor.url}/outra-unidade`);
    const mercado = { slug: 'teste', enderecoLoja: 'R. José Augusto de Carvalho, 55, Poços de Caldas' };

    await assert.rejects(
        confirmarUnidade(driver, mercado, { tempoMaximoMs: 500 }),
        /Unidade inesperada/
    );
});
