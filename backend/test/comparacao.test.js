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
