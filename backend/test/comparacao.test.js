const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizarProduto } = require('../services/normalizacao');
const { saoEquivalentes, LIMITE_SIMILARIDADE } = require('../services/comparacao');

function produto(nome, preco, unidade = 'un') {
    return { nome, preco, unidade, ...normalizarProduto({ nome, preco, unidadeVenda: unidade, departamento: 'Mercearia' }) };
}

// Frequencia das palavras num catalogo ficticio de 5000 produtos:
// palavras genericas aparecem muito; marcas aparecem pouco.
const stats = {
    total: 5000,
    frequencia: new Map(Object.entries({
        feijao: 300, carioca: 200, camil: 40, cabrera: 15, refrigerante: 400, coca: 60, cola: 90,
        cerveja: 350, heineken: 30, lager: 80, arroz: 250, pilecco: 12, nobre: 20, cafe: 300,
        pilao: 25, vacuo: 120, torrado: 150, moido: 150, detergente: 200, liquido: 300, ype: 70, suprema: 10
    }))
};

const equivalentes = (a, b) => saoEquivalentes(a, b, stats) >= LIMITE_SIMILARIDADE;

test('mesmo produto escrito de formas diferentes e equivalente', () => {
    assert.ok(equivalentes(produto('Refrigerante Coca Cola Pet 2lt', 10.99), produto('Refrigerante Coca-Cola Garrafa 2l', 9.89)));
    assert.ok(equivalentes(produto('Cerveja Heineken 350ml', 4.98), produto('Cerveja Lager Heineken Lata 350ml', 5.89)));
    assert.ok(equivalentes(produto('Arroz Pilecco Nobre Tipo1 5kg', 26.89), produto('Arroz Polido Tipo 1 Pilecco Nobre Pacote 5kg', 26.8)));
});

test('produto a granel so equivale a outro a granel, nao a uma embalagem', () => {
    // Encontrado na analise de dados: "Bacon R$ 37,90/kg" era comparado com "Bacon Sadia 100g".
    const statsBacon = { total: 5000, frequencia: new Map(Object.entries({ bacon: 40, sadia: 60, seara: 60 })) };
    const granel = produto('Bacon', 37.9, 'kg');
    assert.ok(saoEquivalentes(granel, produto('Bacon Sadia 100g', 2.49), statsBacon) < LIMITE_SIMILARIDADE);
    assert.ok(saoEquivalentes(granel, produto('Bacon Kg', 39.9, 'kg'), statsBacon) >= LIMITE_SIMILARIDADE);
});

test('pacote com varias unidades nao equivale ao produto avulso', () => {
    assert.ok(!equivalentes(produto('Cerveja Heineken 350ml', 4.98), produto('Cerveja Heineken 350ml Leve 12 Pague 10', 49.8)));
});

test('marcas diferentes nao sao equivalentes', () => {
    assert.ok(!equivalentes(produto('Feijão Carioca Camil 1kg', 6.99), produto('Feijão Carioca Tipo 1 Cabrera 1kg', 10.07)));
    assert.ok(!equivalentes(produto('Detergente Líquido Ypê Neutro 500ml', 2.59), produto('Detergente Liquido Suprema Neutro 500ml', 2.66)));
});

test('variantes diferentes nao sao equivalentes', () => {
    assert.ok(!equivalentes(produto('Refrigerante Coca Cola Pet 2lt', 10.99), produto('Refrig.coca Cola 2l S/acucar', 12.09)));
    assert.ok(!equivalentes(produto('Cerveja Heineken 350ml', 4.98), produto('Cerveja Heineken Zero 350ml', 5.45)));
    assert.ok(!equivalentes(produto('Detergente Líquido Ypê Neutro 500ml', 2.59), produto('Detergente Liquido Ype Coco 500ml', 2.98)));
});

test('tamanhos diferentes nao sao equivalentes', () => {
    assert.ok(!equivalentes(produto('Cerveja Heineken 350ml', 4.98), produto('Cerveja Heineken 600ml', 9.9)));
    assert.ok(!equivalentes(produto('Refrigerante Coca Cola Pet 2lt', 10.99), produto('Refrigerante Coca Cola Pet 2,5lt', 11.9)));
});

test('sal grosso ou para churrasco nao equivale ao sal refinado', () => {
    // Encontrado na amostra de validacao da analise de dados.
    const statsSal = { total: 5000, frequencia: new Map(Object.entries({ sal: 60, cisne: 30, churrasco: 40, grosso: 20 })) };
    const refinado = produto('Sal Refinado Cisne Pacote 1kg', 4.19);
    assert.ok(saoEquivalentes(refinado, produto('Sal Para Churrasco Cisne 1kg', 5.29), statsSal) < LIMITE_SIMILARIDADE);
    assert.ok(saoEquivalentes(refinado, produto('Sal Grosso Cisne 1kg', 4.99), statsSal) < LIMITE_SIMILARIDADE);
    assert.ok(saoEquivalentes(refinado, produto('Sal Refinado Iodado Cisne 1kg', 4.29), statsSal) >= LIMITE_SIMILARIDADE);
});

// Taxonomia, etapa 1: marcas, fabricantes, embalagens, sabores e numero de rolos.
test('marcas diferentes nunca sao o mesmo produto, mesmo uma marca muito frequente', () => {
    const catalogo = { total: 5000, frequencia: new Map(Object.entries({ requeijao: 120, cremoso: 150, nestle: 900, danone: 60, tirolez: 30, iogurte: 300, grego: 80, itambe: 200 })) };
    const iguais = (a, b) => saoEquivalentes(produto(a, 8), produto(b, 8), catalogo) >= LIMITE_SIMILARIDADE;
    assert.ok(!iguais('Requeijao Cremoso Nestle 200gr', 'Requeijão Cremoso Danone 200g'));
    assert.ok(!iguais('Requeijao Cremoso Nestle 200gr', 'Requeijão Tirolez Cremoso 200g'));
    assert.ok(!iguais('Iogurte Grego Nestle 450g', 'Iogurte Itambe Grego 450gr'));
});

test('o nome do fabricante pode aparecer ou nao no mesmo produto', () => {
    const catalogo = { total: 5000, frequencia: new Map(Object.entries({ biscoito: 400, recheado: 130, nestle: 900, negresco: 20, leite: 600, condensado: 60, moca: 40, detergente: 200, liquido: 300, limpol: 30, bril: 25, bom: 80 })) };
    const iguais = (a, b) => saoEquivalentes(produto(a, 5), produto(b, 5), catalogo) >= LIMITE_SIMILARIDADE;
    assert.ok(iguais('Biscoito Nestlé Negresco 90g', 'Biscoito Recheado Negresco 90g'));
    assert.ok(iguais('Leite Condensado Moça Nestlé 395g', 'Leite Condensado Integral Moça Lata 395g'));
    assert.ok(iguais('Detergente Líquido Limpol Bom Bril 500ml', 'Detergente Líquido Limpol Squeeze 500ml'));
});

test('embalagem e abreviacao nao atrapalham; sabor, kit e numero de rolos sim', () => {
    const catalogo = { total: 5000, frequencia: new Map(Object.entries({ macarrao: 500, instantaneo: 200, cup: 50, noodles: 44, bolonhesa: 54, molho: 470, tomate: 230, pomarola: 20, ketchup: 70, heinz: 30, papel: 230, higienico: 110, personal: 40, vip: 30, folha: 120, dupla: 90 })) };
    const iguais = (a, b) => saoEquivalentes(produto(a, 5), produto(b, 5), catalogo) >= LIMITE_SIMILARIDADE;
    assert.ok(iguais('Macarrao Ins. Cup Noodles Bolonhesa 72g', 'Macarrão Instantâneo Bolonhesa Cup Noodles Copo 72g'));
    assert.ok(!iguais('Molho De Tomate Pomarola Bolonhesa Sachê 300g', 'Molho De Tomate Pomarola Tradicional Sache 300g'), 'bolonhesa e outro sabor');
    assert.ok(!iguais('Ketchup Heinz Squeeze 397g', 'Kit Ketchup Maionese Heinz 397g'), 'kit nao e o produto avulso');
    assert.ok(!iguais('Papel Higiênico Personal Vip Folha Dupla 30m Pacote 8 Unidades', 'Papel Higiênico Personal Vip Folha Dupla 40m 6un'), '8 rolos de 30 m nao sao 6 de 40 m');
    assert.ok(iguais('Papel Higiênico Personal Vip Folha Dupla 20m Leve 12 Pague 11', 'Papel Higiênico Personal Vip Folha Dupla 20m 12 Unidades'));
});
