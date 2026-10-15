const test = require('node:test');
const assert = require('node:assert/strict');
const {
    calcularPrecoPorUnidade,
    categoriaCanonica,
    extrairQuantidade,
    gerarTokens
} = require('../services/normalizacao');
const { extrairPreco } = require('../services/importProducts');

test('extrairPreco entende o formato brasileiro', () => {
    assert.equal(extrairPreco('R$ 1.234,56'), 1234.56);
    assert.equal(extrairPreco('R$ 7,89kg'), 7.89);
    assert.equal(extrairPreco('R$ 39,90/kg'), 39.9);
    assert.equal(extrairPreco(''), 0);
});

test('extrairQuantidade le volume, massa, multipacks e rolos', () => {
    assert.deepEqual(extrairQuantidade('Refrigerante Coca Cola Pet 2,5lt'), { medida: 'volume', quantidade: 2500 });
    assert.deepEqual(extrairQuantidade('Cerveja Heineken 350ml'), { medida: 'volume', quantidade: 350 });
    assert.deepEqual(extrairQuantidade('Cerveja Brahma 12x350ml'), { medida: 'volume', quantidade: 4200 });
    assert.deepEqual(extrairQuantidade('Arroz Tio João Tipo 1 5kg'), { medida: 'massa', quantidade: 5000 });
    assert.deepEqual(extrairQuantidade('Biscoito Integrale Renata 150gr'), { medida: 'massa', quantidade: 150 });
    assert.deepEqual(extrairQuantidade('Papel Higienico Neve 20m Com 12 Rolos'), { medida: 'comprimento', quantidade: 240 });
    assert.deepEqual(extrairQuantidade('Papel Higiênico Neve Supreme 20m Leve 12 Pague 11'), { medida: 'comprimento', quantidade: 240 });
    // Em massa/volume o numero do nome ja e o total da embalagem.
    assert.deepEqual(extrairQuantidade('Caldo Maggi Galinha 57g 06.unid'), { medida: 'massa', quantidade: 57 });
    assert.deepEqual(extrairQuantidade('Alface Crespa'), { medida: null, quantidade: null });
});

test('pacote promocional "leve X pague Y" soma as unidades do pacote', () => {
    // Encontrado na analise de dados: o pacote com 12 cremes dentais era comparado com um avulso.
    assert.deepEqual(extrairQuantidade('Creme Dental Oral B 70g L12p10 4em1'), { medida: 'massa', quantidade: 840 });
    assert.deepEqual(extrairQuantidade('Sabonete Lux 85g Leve 6 Pague 5'), { medida: 'massa', quantidade: 510 });
    assert.deepEqual(extrairQuantidade('Creme Dental Oral-b 4 Em 1 70g'), { medida: 'massa', quantidade: 70 });
});

test('calcularPrecoPorUnidade converte para R$/kg, R$/L e R$/m', () => {
    assert.deepEqual(
        calcularPrecoPorUnidade({ nome: 'Refrigerante Coca Cola Pet 2lt', preco: 10.99, unidadeVenda: 'un' }),
        { medida: 'volume', quantidadeBase: 2000, precoPorUnidade: 5.5, unidadeMedida: 'L' }
    );
    assert.equal(calcularPrecoPorUnidade({ nome: 'Café Pilão Tradicional 500g', preco: 26.9 }).precoPorUnidade, 53.8);
    assert.equal(calcularPrecoPorUnidade({ nome: 'Papel Neve 20m Com 12 Rolos', preco: 18.8 }).unidadeMedida, 'm');
});

test('produtos vendidos a peso ja tem o preco por kg', () => {
    const resultado = calcularPrecoPorUnidade({ nome: 'Carne Bovina Acem Moído 500gr', preco: 39.9, unidadeVenda: 'kg' });
    assert.equal(resultado.precoPorUnidade, 39.9);
    assert.equal(resultado.unidadeMedida, 'kg');
});

test('embalagem informada pelo site define o preco por kg', () => {
    // Vila Sul: "Salame Perdigão 700g" custa R$ 48,93 a peca (/700g), ou R$ 69,90/kg.
    const salame = calcularPrecoPorUnidade({ nome: 'Salame Perdigão 700g', preco: 48.93, unidadeVenda: 'un', embalagem: '700g' });
    assert.equal(salame.precoPorUnidade, 69.9);
    assert.equal(salame.unidadeMedida, 'kg');

    // Peso real da peca vale mais que o arredondado no nome.
    const abobora = calcularPrecoPorUnidade({ nome: 'Abobora Cabotia 3kg', preco: 11.17, unidadeVenda: 'un', embalagem: '2,8kg' });
    assert.equal(abobora.quantidadeBase, 2800);
    assert.equal(abobora.precoPorUnidade, 3.99);
});

test('gerarTokens normaliza abreviacoes e separa variantes', () => {
    const vilaSul = gerarTokens('Refrig.coca Cola 2l S/acucar');
    const pedrilho = gerarTokens('Refrigerante sem Açúcar Coca-Cola Zero Garrafa 2l');
    assert.deepEqual(vilaSul.tokens, ['refrigerante', 'coca', 'cola']);
    assert.deepEqual(vilaSul.variantes, ['zero']);
    assert.deepEqual(pedrilho.tokens.sort(), ['coca', 'cola', 'refrigerante']);
    assert.deepEqual(pedrilho.variantes, ['zero']);
});

test('nomes comerciais de acucar revelam o tipo (cristal x refinado)', () => {
    assert.deepEqual(gerarTokens('Açúcar Cristalçúcar União 1kg').variantes, ['cristal']);
    assert.deepEqual(gerarTokens('Açúcar União Glaçúcar De Confeiteiro 500g').variantes, ['confeiteiro']);
    assert.deepEqual(gerarTokens('Acucar Refinado Uniao 1kg').variantes, []);
});

test('cerveja zero e sem alcool, e cafe extra forte e uma variante', () => {
    assert.deepEqual(gerarTokens('Cerveja Heineken Zero 350ml').variantes, ['semalcool']);
    assert.deepEqual(gerarTokens('Cerveja Lager Zero Álcool Heineken Lata 350ml').variantes, ['semalcool']);
    assert.deepEqual(gerarTokens('Café Pilão Extra Forte Vácuo 500g').variantes, ['extraforte']);
    assert.deepEqual(gerarTokens('Leite UHT Integral Zero Lactose Italac 1l').variantes, ['integral', 'semlactose']);
});

test('categoriaCanonica padroniza os departamentos dos mercados', () => {
    assert.deepEqual(categoriaCanonica('Açougue'), { nome: 'Carnes e Peixes', alimento: true });
    assert.deepEqual(categoriaCanonica('Peixaria'), { nome: 'Carnes e Peixes', alimento: true });
    assert.deepEqual(categoriaCanonica('Padaria-lanchonete- conf'), { nome: 'Padaria', alimento: true });
    assert.deepEqual(categoriaCanonica('Perfumaria e higiene'), { nome: 'Higiene e Saúde', alimento: false });
    assert.deepEqual(categoriaCanonica('Pet shop'), { nome: 'Pet', alimento: false });
    assert.deepEqual(categoriaCanonica('Cereais e Farináceos'), { nome: 'Mercearia', alimento: true });
    assert.equal(categoriaCanonica('Departamento desconhecido').nome, 'Outros');
});
