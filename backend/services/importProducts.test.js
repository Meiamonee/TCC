const { test } = require('node:test');
const assert = require('node:assert/strict');
const { priceBasisFor, priceMetadataFor } = require('./importProducts');

test('importação antiga do Pedrilho preserva peso e corrige preço por embalagem', () => {
    assert.equal(priceBasisFor({slug:'pedrilho'}, {priceBasis:'unknown'}), 'unit');
    assert.equal(priceBasisFor({slug:'pedrilho'}, {}), 'unit');
    assert.equal(priceBasisFor({slug:'pedrilho'}, {priceBasis:'kg'}), 'kg');
    assert.equal(priceBasisFor({slug:'vilasul'}, {priceBasis:'unknown'}), 'unknown');
});

test('metadados de preço preservam evidência e normalizam quantidade', () => {
    assert.deepEqual(priceMetadataFor({slug:'vilasul'}, {
        priceBasis:'unit', priceScope:'TOTAL', pricePackageQuantity:{value:500,unit:'g'},
        priceUnitRaw:'/500g', priceBasisSource:'detail', priceBasisConfidence:100
    }), {
        priceBasis:'unit', priceScope:'TOTAL', pricePackageQuantity:{value:.5,unit:'kg'},
        priceUnitRaw:'/500g', priceBasisSource:'detail', priceBasisConfidence:100
    });
    assert.deepEqual(priceMetadataFor({slug:'vilasul'}, {priceBasis:'unknown'}), {
        priceBasis:'unknown', priceScope:'UNKNOWN', pricePackageQuantity:null,
        priceUnitRaw:null, priceBasisSource:'unknown', priceBasisConfidence:0
    });
});
