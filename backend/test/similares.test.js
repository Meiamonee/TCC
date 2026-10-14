const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizarProduto } = require('../services/normalizacao');
const { montarEstatisticas, palavrasDeTipo, saoSimilares } = require('../services/comparacao');

function produto(nome, departamento = 'Mercearia', unidade = 'un') {
    return { nome, unidade, ...normalizarProduto({ nome, preco: 10, unidadeVenda: unidade, departamento }), categoria: normalizarProduto({ nome, departamento }).categoriaPadrao };
}

// Catalogo pequeno, mas com a mesma estrutura do real: varios feijoes (carioca e preto),
// cervejas, vinhos e marcas que aparecem em varios tipos de produto (Camil, Kometudo).
const catalogo = [
    produto('Feijao Carioca Kometudo 1kg'),
    produto('Feijao Carioca Camil 1kg'),
    produto('Feijao Carioca Cabrera 1kg'),
    produto('Feijao Carioca Du Irineu 1kg'),
    produto('Feijao Carioca San Michel 1kg'),
    produto('Feijao Preto Camil 1kg'),
    produto('Feijao Du Irineu 1kg'),
    produto('Arroz Camil 5kg'),
    produto('Arroz Kometudo 5kg'),
    produto('Arroz Tio Joao 5kg'),
    produto('Arroz Camil Parboilizado 5kg'),
    produto('Arroz Kometudo Integral 5kg'),
    produto('Acucar Camil 1kg'),
    produto('Acucar Kometudo 1kg'),
    produto('Acucar Uniao 1kg'),
    produto('Vinho Tinto Concha Y Toro 750ml', 'Bebidas'),
    produto('Vinho Tinto Santa Carolina 750ml', 'Bebidas'),
    produto('Vinho Branco Salton 750ml', 'Bebidas'),
    produto('Vinho Tinto Campino 750ml', 'Bebidas'),
    produto('Vinho Tinto Galo 750ml', 'Bebidas'),
    produto('Vinagre de Vinho Tinto Castelo 750ml'),
    produto('Cerveja Lager Budweiser 350ml', 'Bebidas'),
    produto('Cerveja Lager Kaiser 350ml', 'Bebidas'),
    produto('Cerveja Lager Itaipava 350ml', 'Bebidas'),
    produto('Cerveja Puro Malte Petra 350ml', 'Bebidas'),
    produto('Cerveja Lager Brahma 600ml', 'Bebidas')
];

const stats = montarEstatisticas(catalogo.map(item => item.tokens));
const buscar = nome => catalogo.find(item => item.nome === nome);

test('identifica o nucleo e os qualificadores, deixando a marca de fora', () => {
    assert.deepEqual(palavrasDeTipo(buscar('Feijao Carioca Kometudo 1kg'), stats), ['feijao', 'carioca']);
    assert.deepEqual(palavrasDeTipo(buscar('Cerveja Lager Budweiser 350ml'), stats), ['cerveja', 'lager']);
});

test('aceita outra marca do mesmo tipo e tamanho', () => {
    const original = buscar('Feijao Carioca Kometudo 1kg');
    assert.ok(saoSimilares(original, buscar('Feijao Carioca Camil 1kg'), stats));
    assert.ok(saoSimilares(buscar('Cerveja Lager Budweiser 350ml'), buscar('Cerveja Lager Kaiser 350ml'), stats));
});

test('aceita a versao generica do mesmo tipo (sem qualificador)', () => {
    assert.ok(saoSimilares(buscar('Feijao Carioca Kometudo 1kg'), buscar('Feijao Du Irineu 1kg'), stats));
});

test('rejeita outro tipo, outra versao, outro departamento ou tamanho muito diferente', () => {
    const feijao = buscar('Feijao Carioca Kometudo 1kg');
    assert.ok(!saoSimilares(feijao, buscar('Feijao Preto Camil 1kg'), stats), 'preto nao substitui carioca');
    assert.ok(!saoSimilares(feijao, buscar('Arroz Kometudo 5kg'), stats), 'mesma marca, outro produto');

    const vinho = buscar('Vinho Tinto Concha Y Toro 750ml');
    assert.ok(saoSimilares(vinho, buscar('Vinho Tinto Santa Carolina 750ml'), stats));
    assert.ok(!saoSimilares(vinho, buscar('Vinho Branco Salton 750ml'), stats), 'branco nao substitui tinto');
    assert.ok(!saoSimilares(vinho, buscar('Vinagre de Vinho Tinto Castelo 750ml'), stats), 'vinagre esta em outro departamento');

    assert.ok(!saoSimilares(buscar('Cerveja Lager Budweiser 350ml'), buscar('Cerveja Lager Brahma 600ml'), stats), '600ml e grande demais');
    assert.ok(!saoSimilares(buscar('Arroz Camil 5kg'), buscar('Arroz Camil Parboilizado 5kg'), stats), 'parboilizado e outra versao');
});
