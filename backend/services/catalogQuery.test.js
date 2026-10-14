const test = require('node:test');
const assert = require('node:assert/strict');
const {catalogQuery} = require('./catalogQuery');

test('applies filters and pagination without accepting disabled markets', () => {
    const result = catalogQuery({
        page:'2',limit:'24',supermercado:'fonseca',categoria:'Bebidas',
        search:'Café (250g)',min:'5',max:'20',sort:'low'
    }, ['pedrilho','supervale'], text => text.toLowerCase());
    assert.deepEqual(result.filter.supermercado, {$in:[]});
    assert.equal(result.filter.categoria.test('BEBIDAS'),true);
    assert.equal(result.filter.categoria.test('Bebidas alcoólicas'),false);
    assert.deepEqual(result.filter.$text, {$search:'café (250g)'});
    assert.deepEqual(result.filter.preco, {$gte:5,$lte:20});
    assert.deepEqual(result.sort,{preco:1,_id:1});
    assert.equal(result.page,2);
    assert.equal(result.limit,24);
});

test('available products remain the default and sorting has a stable key', () => {
    const normalizer = text => text;
    const defaultQuery = catalogQuery({},['pedrilho'],normalizer);
    assert.equal(defaultQuery.filter.disponivel,true);
    assert.deepEqual(defaultQuery.sort,{nomeNormalizado:1,_id:1});
    assert.equal(defaultQuery.limit,24);
    const allQuery = catalogQuery({includeIndisponiveis:'true',sort:'high'},['pedrilho'],normalizer);
    assert.equal(allQuery.filter.disponivel,undefined);
    assert.deepEqual(allQuery.sort,{preco:-1,_id:1});
});

test('text search uses the existing index and public page size is capped', () => {
    const result = catalogQuery({search:'  Cerveja  ',limit:'500'},['pedrilho'],text=>text.toLowerCase());
    assert.deepEqual(result.filter.$text,{$search:'cerveja'});
    assert.deepEqual(result.sort,{searchScore:{$meta:'textScore'},_id:1});
    assert.equal(result.limit,100);
});
