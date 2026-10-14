const test = require('node:test');
const assert = require('node:assert/strict');
const { comTentativas, getDelayConfig } = require('../lib/navegador');
const { normalizar } = require('../lib/unidade');

test('getDelayConfig usa as opcoes, depois o .env e por fim o padrao', (t) => {
    t.after(() => {
        delete process.env.SCRAPER_PAGE_DELAY_MS;
        delete process.env.SCRAPER_PAGE_DELAY_JITTER_MS;
    });

    delete process.env.SCRAPER_PAGE_DELAY_MS;
    delete process.env.SCRAPER_PAGE_DELAY_JITTER_MS;
    assert.deepEqual(getDelayConfig(), { pageDelayMs: 4000, pageDelayJitterMs: 2000 });

    process.env.SCRAPER_PAGE_DELAY_MS = '0';
    process.env.SCRAPER_PAGE_DELAY_JITTER_MS = '0';
    assert.deepEqual(getDelayConfig(), { pageDelayMs: 0, pageDelayJitterMs: 0 });

    assert.deepEqual(getDelayConfig({ pageDelayMs: 100, pageDelayJitterMs: 50 }), { pageDelayMs: 100, pageDelayJitterMs: 50 });
});

test('getDelayConfig ignora valores invalidos ou negativos', () => {
    assert.deepEqual(getDelayConfig({ pageDelayMs: 'abc', pageDelayJitterMs: -5 }), { pageDelayMs: 4000, pageDelayJitterMs: 2000 });
});

test('comTentativas repete a acao ate dar certo', async () => {
    let chamadas = 0;
    const resultado = await comTentativas('teste', async () => {
        chamadas++;
        if (chamadas < 3) throw new Error('site lento');
        return 'ok';
    }, 3, 1);

    assert.equal(resultado, 'ok');
    assert.equal(chamadas, 3);
});

test('comTentativas desiste depois do numero maximo de tentativas', async () => {
    let chamadas = 0;
    await assert.rejects(
        comTentativas('teste', async () => {
            chamadas++;
            throw new Error('fora do ar');
        }, 2, 1),
        /fora do ar/
    );
    assert.equal(chamadas, 2);
});

test('normalizar ignora acentos, maiusculas e espacos extras ao comparar enderecos', () => {
    assert.equal(normalizar('  Av. João   Pinheiro, 1460 '), 'av. joao pinheiro, 1460');
    assert.ok(normalizar('Retirada: R. JOSÉ Augusto de Carvalho, 55').includes(normalizar('R. José Augusto de Carvalho, 55')));
});
