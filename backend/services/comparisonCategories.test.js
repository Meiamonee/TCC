const { test } = require('node:test');
const assert = require('node:assert/strict');
const { categoryNamesFor } = require('./comparisonCategories');

test('categorias originais equivalentes entram no filtro e na comparação', () => {
    const known = ['Animais', 'Pet shop', 'Peixaria', 'Carnes', 'Padaria-lanchonete- conf', 'Padaria', 'Bazar e flores', 'Bazar e utilidades', 'Mercearia', 'Cereais e farináceos'];
    assert.deepEqual(categoryNamesFor('Animais', known), ['Animais', 'Pet shop']);
    assert.deepEqual(categoryNamesFor('Peixaria', known), ['Peixaria', 'Carnes']);
    assert.deepEqual(categoryNamesFor('Padaria', known), ['Padaria-lanchonete- conf', 'Padaria']);
    assert.deepEqual(categoryNamesFor('Bazar e utilidades', known), ['Bazar e flores', 'Bazar e utilidades']);
    assert.deepEqual(categoryNamesFor('Cereais e farináceos', known, true), ['Mercearia', 'Cereais e farináceos']);
});
