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

// Casos encontrados ao montar uma cesta basica na lista de compras.
test('na cesta basica, rejeita trocas que mudam o alimento', () => {
    const cesta = [
        produto('Carne Bovina Paleta Moida 500g', 'Acougue'),
        produto('Carne Bovina Acem Moido 500g', 'Acougue'),
        produto('Carne Suina Mascara 500g', 'Acougue'),
        produto('Carne Moida Suina Pamplona 500g', 'Acougue'),
        produto('Carne Bovina Patinho 500g', 'Acougue'),
        produto('Batata Inglesa 1kg', 'Hortifruti'),
        produto('Batata Escovada 1kg', 'Hortifruti'),
        produto('Batata Doce Roxa 1kg', 'Hortifruti'),
        produto('Batata Lavada 1kg', 'Hortifruti'),
        produto('Batata Monalisa 1kg', 'Hortifruti'),
        produto('Batata Asterix 1kg', 'Hortifruti'),
        produto('Banana Prata 1kg', 'Hortifruti'),
        produto('Banana Prata da Roca 1kg', 'Hortifruti'),
        produto('Banana Nanica 1kg', 'Hortifruti'),
        produto('Banana Maca 1kg', 'Hortifruti'),
        produto('Banana da Terra 1kg', 'Hortifruti'),
        produto('Pao Frances Tradicional 500g', 'Padaria'),
        produto('Pao Frances Mini 500g', 'Padaria'),
        produto('Pao Frances Integral 500g', 'Padaria'),
        produto('Pao Frances Supervale 500g', 'Padaria'),
        produto('Pao Frances Homebake 500g', 'Padaria'),
        produto('Pao de Forma Newbread 500g', 'Padaria'),
        produto('Pao de Forma Pullman 500g', 'Padaria'),
        produto('Pao de Queijo Forno de Minas 500g', 'Padaria'),
        produto('Manteiga Aviacao Com Sal 200g', 'Frios e laticinios'),
        produto('Manteiga Itambe Com Sal 200g', 'Frios e laticinios'),
        produto('Manteiga Tirolez Com Sal 200g', 'Frios e laticinios'),
        produto('Manteiga Batavo Sem Sal 200g', 'Frios e laticinios'),
        produto('Manteiga President Com Sal 200g', 'Frios e laticinios'),
        produto('Margarina Delicata Com Sal 250g', 'Frios e laticinios'),
        produto('Margarina Qualy Com Sal 250g', 'Frios e laticinios'),
        produto('Margarina Manteiga Claybom Com Sal 250g', 'Frios e laticinios'),
        produto('Margarina Vigor Com Sal 250g', 'Frios e laticinios'),
        produto('Margarina Becel Com Sal 250g', 'Frios e laticinios'),
        produto('Carne Bovina Figado 500g', 'Acougue'),
        produto('Sal Refinado Cisne 1kg'),
        produto('Sal Refinado Lebre 1kg'),
        produto('Sal Grosso Cisne 1kg'),
        produto('Sal Refinado Moc 1kg'),
        produto('Sal Marinho Smart 1kg')
    ];
    const statsCesta = montarEstatisticas(cesta.map(item => item.tokens));
    const de = nome => cesta.find(item => item.nome === nome);
    const similar = (a, b) => saoSimilares(de(a), de(b), statsCesta);

    assert.ok(similar('Carne Bovina Paleta Moida 500g', 'Carne Bovina Acem Moido 500g'), 'outro corte bovino serve');
    assert.ok(!similar('Carne Bovina Paleta Moida 500g', 'Carne Suina Mascara 500g'), 'suina nao substitui bovina');
    assert.ok(similar('Batata Inglesa 1kg', 'Batata Escovada 1kg'));
    assert.ok(!similar('Batata Inglesa 1kg', 'Batata Doce Roxa 1kg'), 'batata doce e outro alimento');
    assert.ok(similar('Banana Prata 1kg', 'Banana Prata da Roca 1kg'));
    assert.ok(!similar('Banana Prata 1kg', 'Banana Nanica 1kg'), 'nanica nao substitui prata');
    assert.ok(similar('Pao Frances Tradicional 500g', 'Pao Frances Mini 500g'));
    assert.ok(!similar('Pao Frances Tradicional 500g', 'Pao de Forma Newbread 500g'), 'pao de forma nao substitui frances');
    assert.ok(!similar('Pao Frances Tradicional 500g', 'Pao de Queijo Forno de Minas 500g'));
    assert.ok(similar('Manteiga Aviacao Com Sal 200g', 'Manteiga Itambe Com Sal 200g'));
    assert.ok(!similar('Manteiga Aviacao Com Sal 200g', 'Margarina Delicata Com Sal 250g'), 'margarina nao substitui manteiga');
    assert.ok(!similar('Manteiga Aviacao Com Sal 200g', 'Margarina Manteiga Claybom Com Sal 250g'), 'margarina que cita manteiga no nome');
    assert.ok(!similar('Carne Bovina Paleta Moida 500g', 'Carne Bovina Figado 500g'), 'figado nao substitui carne moida');
});
