const test = require('node:test');
const assert = require('node:assert/strict');
const { MERCADOS, buscarMercado } = require('../mercados');

const PLATAFORMAS_COM_EXTRATOR = ['vipcommerce', 'ibecom'];

test('todo mercado tem slug unico, URL https, plataforma conhecida e endereco da unidade', () => {
    const slugs = new Set();

    for (const mercado of MERCADOS) {
        assert.match(mercado.slug, /^[a-z]+$/, `slug invalido: ${mercado.slug}`);
        assert.ok(!slugs.has(mercado.slug), `slug repetido: ${mercado.slug}`);
        slugs.add(mercado.slug);

        assert.ok(mercado.nome, `${mercado.slug} sem nome`);
        assert.match(mercado.url, /^https:\/\/[^/]+$/, `${mercado.slug}: URL deve ser https e sem barra no fim`);
        assert.ok(PLATAFORMAS_COM_EXTRATOR.includes(mercado.plataforma), `${mercado.slug}: plataforma sem extrator`);
        // Sem o endereco nao da para garantir que a coleta e da unidade de Pocos de Caldas.
        assert.ok(mercado.enderecoLoja && mercado.enderecoLoja.length > 10, `${mercado.slug} sem enderecoLoja`);
    }
});

test('os quatro mercados de Pocos de Caldas estao configurados', () => {
    assert.deepEqual(MERCADOS.map(mercado => mercado.slug).sort(), ['pedrilho', 'sanmichel', 'supervale', 'vilasul']);
});

test('buscarMercado encontra pelo slug e devolve vazio para slug desconhecido', () => {
    assert.equal(buscarMercado('pedrilho').plataforma, 'ibecom');
    assert.equal(buscarMercado('supervale').plataforma, 'vipcommerce');
    assert.ok(!buscarMercado('fonseca'));
});
