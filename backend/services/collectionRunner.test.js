const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeMarket, summarizeResult } = require('./collectionRunner');

test('accepts all enabled markets and rejects unknown ones', () => {
    assert.equal(normalizeMarket(), 'todos');
    assert.equal(normalizeMarket(' PEDRILHO '), 'pedrilho');
    assert.throws(() => normalizeMarket('mercado-inexistente'), error => {
        assert.equal(error.code, 'COLLECTION_VALIDATION');
        assert.equal(error.statusCode, 400);
        return true;
    });
});

test('summarizes a collection without persisting the full scraper report', () => {
    const summary = summarizeResult({
        status: 'complete',
        mercados: ['pedrilho', 'supervale'],
        resultados: [
            { encontrados: 10, processados: 9, novos: 2, atualizados: 7, precosMudaram: 3, indisponiveis: 1, erros: 0 },
            { encontrados: 20, processados: 20, novos: 1, atualizados: 19, precosMudaram: 4, indisponiveis: 2, erros: 1 }
        ]
    });
    assert.equal(summary.pipelineStatus, 'complete');
    assert.deepEqual(summary.markets, ['pedrilho', 'supervale']);
    assert.deepEqual(summary.totals, {
        found: 30,
        processed: 29,
        new: 3,
        updated: 26,
        priceChanges: 7,
        unavailable: 3,
        errors: 1
    });
});
