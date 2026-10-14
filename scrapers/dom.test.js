const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createDriver } = require('./browser');
const { readCatalog, advanceCatalog, readStore, readProductDetail } = require('./dom');
const { parseOptions } = require('./cli');
const { verifyStore } = require('./catalog');

let driver;
before(async () => { driver = await createDriver(true, {}); });
after(async () => { if (driver) await driver.quit(); });
const page = html => driver.get('data:text/html;charset=utf-8,' + encodeURIComponent(html));

test('VipCommerce: preco atual, ID, imagem; ignora item sem preco e preserva indisponibilidade', async () => {
    await page(`<base href="https://www.vilasul.com.br/">
      <vip-lista-produtos-desktop-toolbar>4 Produtos</vip-lista-produtos-desktop-toolbar>
      <vip-infinite-scroll>
        <vip-card-produto><a href="/produto/12/arroz"><img src="/arroz.jpg"></a><span class="vip-card-produto-descricao">Arroz 5kg</span><del>R$ 30,00</del><vip-produto-preco-valor><div role="text"><span class="medio font-bold">R$ 24,99</span><span>/un</span></div></vip-produto-preco-valor></vip-card-produto>
        <vip-card-produto><a href="/produto/13/feijao">Feijão</a><span class="vip-card-produto-descricao">Feijão 1kg</span></vip-card-produto>
        <vip-card-produto><a href="/produto/14/leite">Leite</a><span class="vip-card-produto-descricao">Leite 1L</span><vip-produto-preco-valor><span class="medio font-bold">R$ 4,00</span></vip-produto-preco-valor>Indisponível</vip-card-produto>
        <vip-card-produto><a href="/produto/15/manga">Manga</a><span class="vip-card-produto-descricao">Manga 1,35kg</span><vip-produto-preco-valor><div role="text"><span class="medio font-bold">R$ 29,15</span><span>/1,35kg</span></div></vip-produto-preco-valor></vip-card-produto>
      </vip-infinite-scroll>`);
    const result = await driver.executeScript(readCatalog, 'vipcommerce');
    assert.equal(result.total, 4);
    assert.deepEqual(result.ids, ['12', '13', '14', '15']);
    assert.equal(result.items.length, 3);
    assert.equal(result.items[0].price, 'R$ 24,99');
    assert.equal(result.items[0].priceBasis, 'unit');
    assert.equal(result.items[0].priceUnitRaw, '/un');
    assert.equal(result.items[0].priceConditions, 'Preço promocional');
    assert.equal(result.items[0].image, 'https://www.vilasul.com.br/arroz.jpg');
    assert.equal(result.items[0].url, 'https://www.vilasul.com.br/produto/12/arroz');
    assert.equal(result.items[1].disponivel, false);
    assert.equal(result.items[2].priceBasis, 'unit');
    assert.equal(result.items[2].priceScope, 'TOTAL');
    assert.deepEqual(result.items[2].pricePackageQuantity,{value:1.35,unit:'kg'});
    assert.equal(result.items[2].priceBasisSource, 'card');
    assert.equal(result.items[2].priceBasisConfidence, 100);
});

test('Instabuy: preco promocional separado do preco anterior e unidade; slug como ID', async () => {
    await page(`<base href="https://www.pedrilho.com.br/"><main>
      <a data-testid="product-card" href="/p/banana-prata"><img alt="Banana Prata" src="/banana.jpg"><del>R$ 9,99</del><p data-testid="price-display-price">R$ 7,89<small>kg</small></p><span>Cashback para cliente do clube</span><button data-testid="button-qtd-increment">+</button></a>
      <a data-testid="product-card" href="/p/feijao"><img alt="Feijão"><p data-testid="price-display-price">R$ 8,00</p><span>Produto indisponível</span></a>
      <a data-testid="product-card" href="/p/arroz"><img alt="Arroz"><p data-testid="price-display-price">R$ 9,00</p></a>
    </main>`);
    const result = await driver.executeScript(readCatalog, 'instabuy');
    assert.equal(result.items[0].id, 'banana-prata');
    assert.equal(result.items[0].price, 'R$ 7,89');
    assert.equal(result.items[0].priceBasis, 'kg');
    assert.equal(result.items[0].priceUnitRaw, 'kg');
    assert.equal(result.items[0].priceConditions, 'Preço promocional · Preço de clube · Cashback');
    assert.equal(result.items[0].disponivel, true);
    assert.equal(result.items[1].disponivel, false);
    assert.equal(result.items[1].priceBasis, 'unit');
    assert.equal(result.items[1].priceUnitRaw, null);
    assert.equal(result.items[2].disponivel, true);
});

test('Navegacao usa proxima pagina, nunca os botoes de compra ou os carrosseis', async () => {
    await page(`<button title="Próxima página" disabled>Próxima</button><button aria-label="Adicionar ao carrinho">+</button>`);
    assert.equal(await driver.executeScript(advanceCatalog, 'vipcommerce'), 'end');
    await page(`<main><button aria-label="Próximo">Carrossel</button></main>`);
    assert.equal(await driver.executeScript(advanceCatalog, 'instabuy'), 'scroll');
});

test('Endereco da unidade vem do seletor da loja, nao de qualquer texto da pagina', async () => {
    await page(`<p>Avenida Mansur Frayha, 875</p><button aria-label="Entrega ou Retirada">Retirar em outra cidade</button>`);
    assert.equal(await driver.executeScript(readStore, 'vipcommerce'), 'Retirar em outra cidade');
    await assert.rejects(() => verifyStore(driver, { platform: 'vipcommerce', address: 'Avenida Mansur Frayha, 875' }), /Unidade de Pocos de Caldas nao confirmada/);
    await page('<button aria-label="Entrega ou Retirada">Retirar na loja: Avenida Mansur Frayha, 875</button>');
    assert.equal((await verifyStore(driver, { platform: 'vipcommerce', address: 'Avenida Mansur Frayha, 875', city: 'Poços de Caldas' })).city, 'Poços de Caldas');
});

test('detalhe confirma escopo por kg e preço total de embalagem',async()=>{
 await page('<main><p data-testid="price-display"><span data-testid="price-display-price">R$ 2,99<small>/kg</small></span></p></main>');
 assert.deepEqual(await driver.executeScript(readProductDetail,'instabuy'),{price:'R$ 2,99',priceBasis:'kg',priceScope:'PER_KG',priceUnitRaw:'/kg',pricePackageQuantity:null,priceBasisSource:'detail',priceBasisConfidence:100});
 await page('<main><vip-produto-preco-valor><div role="text"><span class="medio font-bold">R$ 29,15</span><span>/1,35kg</span></div></vip-produto-preco-valor></main>');
 assert.deepEqual(await driver.executeScript(readProductDetail,'vipcommerce'),{price:'R$ 29,15',priceBasis:'unit',priceScope:'TOTAL',priceUnitRaw:'/1,35kg',pricePackageQuantity:{value:1.35,unit:'kg'},priceBasisSource:'detail',priceBasisConfidence:100});
});

test('VipCommerce usa quantidade do nome antes de abrir o detalhe',async()=>{
 await page('<vip-infinite-scroll><vip-card-produto><a href="https://example.org/produto/1/item"><img></a><span class="vip-card-produto-descricao">Abóbora Cabotiá 2,800kg</span><vip-produto-preco-valor><span class="medio font-bold">R$ 19,46</span></vip-produto-preco-valor></vip-card-produto></vip-infinite-scroll>');
 const [item]=(await driver.executeScript(readCatalog,'vipcommerce')).items;
 assert.equal(item.priceBasis,'unit');assert.equal(item.priceBasisSource,'name');assert.equal(item.priceBasisConfidence,90);
 assert.deepEqual(item.pricePackageQuantity,{value:2.8,unit:'kg'});
});

test('Amostra valida limites e nao aceita opcoes desconhecidas', () => {
    assert.deepEqual(parseOptions(['--smoke']), { maxDepartments: 2, maxPages: 2 });
    assert.throws(() => parseOptions(['--max-pages', '0']));
    assert.throws(() => parseOptions(['--max-departments', 'x']));
    assert.throws(() => parseOptions(['--unknown']));
    assert.throws(() => parseOptions(['--department']));
    assert.throws(() => parseOptions(['--output', 'catalogo']));
});

test('cartoes repetidos contam no total do site, mas IDs continuam unicos',async()=>{
 await page(`<vip-lista-produtos-desktop-toolbar>3 Produtos</vip-lista-produtos-desktop-toolbar><vip-infinite-scroll>${['12','13','13'].map(id=>`<vip-card-produto><a href="https://example.org/produto/${id}/item">Item</a></vip-card-produto>`).join('')}</vip-infinite-scroll>`);
 const state=await driver.executeScript(readCatalog,'vipcommerce');
 assert.equal(state.cardCount,3);assert.equal(state.identifiedCardCount,3);assert.deepEqual(state.ids,['12','13']);assert.deepEqual(state.duplicateIds,['13']);
 assert.equal(require('./completion').completionEvidence(state,2).complete,true);
});
