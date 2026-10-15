const test = require('node:test');
const assert = require('node:assert/strict');
const { analisarHistorico, analisarPrecos, analisarSus, analisarTempos, mediana, montarGrupos, pontuacaoSus, sortearAmostra } = require('../analise/calculos');

// Calculos da analise de dados (capitulo de resultados) com dados pequenos e conhecidos.

const SLUGS = ['supervale', 'vilasul', 'sanmichel', 'pedrilho'];
const p = (id, supermercado, preco, categoria = 'Mercearia') => ({ _id: id, supermercado, preco, categoria, nome: `Produto ${id}` });

test('mediana de listas pares, impares e vazias', () => {
    assert.equal(mediana([3, 1, 2]), 2);
    assert.equal(mediana([4, 1, 3, 2]), 2.5);
    assert.equal(mediana([]), null);
});

test('montarGrupos junta o produto com os equivalentes e conta cada grupo uma vez', () => {
    const a = p('a', 'supervale', 10);
    const b = p('b', 'vilasul', 12);
    const c = p('c', 'sanmichel', 9);
    const equivalentes = new Map([
        ['a', [{ produto: b }]],
        ['b', [{ produto: a }]], // o mesmo grupo visto pelo outro lado
        ['c', []]
    ]);

    const grupos = montarGrupos([a, b, c], equivalentes);
    assert.equal(grupos.length, 1);
    assert.deepEqual(grupos[0].map(item => item._id).sort(), ['a', 'b']);
});

test('analisarPrecos mede a diferenca, o mais barato e separa os casos anormais', () => {
    const grupos = [
        [p('1', 'supervale', 10), p('2', 'vilasul', 12)], // 20%, SuperVale mais barato
        [p('3', 'supervale', 5), p('4', 'vilasul', 5)], // mesmo preco: empate dividido
        [p('5', 'pedrilho', 8), p('6', 'vilasul', 10), p('7', 'supervale', 9)], // 25%, Pedrilho
        [p('8', 'pedrilho', 46.8), p('9', 'supervale', 3.58)] // fardo anunciado como lata: anormal
    ];

    const resultado = analisarPrecos(grupos, SLUGS);

    assert.equal(resultado.grupos, 3);
    assert.equal(resultado.gruposAnormais, 1);
    assert.equal(resultado.gruposMesmoPreco, 1);
    assert.equal(resultado.diferencaMedianaPercentual, 20);
    assert.equal(resultado.diferencaMediaPercentual, 15);

    const supervale = resultado.maisBarato.find(item => item.supermercado === 'supervale');
    assert.equal(supervale.presencas, 3);
    assert.equal(supervale.vezesMaisBarato, 1.5);
    assert.equal(supervale.percentualDasPresencas, 50);

    const par = resultado.pares.find(item => item.a === 'supervale' && item.b === 'vilasul');
    assert.equal(par.produtosEmComum, 3);
    assert.equal(par.aMaisBaratoPercentual, 66.7);
    assert.equal(par.empatesPercentual, 33.3);

    assert.deepEqual(resultado.faixas.map(faixa => faixa.grupos), [1, 0, 1, 1, 0]);
});

test('analisarHistorico conta altas e quedas entre coletas, ignorando a primeira', () => {
    const registros = [
        { produto: 'x', supermercado: 'vilasul', preco: 10, data: '2026-10-14T21:00:00Z' },
        { produto: 'x', supermercado: 'vilasul', preco: 12, data: '2026-10-15T09:00:00Z' },
        { produto: 'x', supermercado: 'vilasul', preco: 9, data: '2026-10-16T09:00:00Z' },
        { produto: 'y', supermercado: 'pedrilho', preco: 5, data: '2026-10-14T21:00:00Z' },
        { produto: 'y', supermercado: 'pedrilho', preco: 5, data: '2026-10-15T09:00:00Z' } // voltou ao estoque, mesmo preco
    ];
    const nomes = new Map([['x', { nome: 'Cafe' }], ['y', { nome: 'Arroz' }]]);

    const resultado = analisarHistorico(registros, nomes);

    assert.equal(resultado.produtosAcompanhados, 2);
    assert.equal(resultado.mudancas, 2);
    assert.equal(resultado.altas, 1);
    assert.equal(resultado.quedas, 1);
    assert.equal(resultado.variacaoMedianaAltas, 20);
    assert.equal(resultado.variacaoMedianaQuedas, -25);
    assert.deepEqual(resultado.porDia, [
        { data: '2026-10-15', altas: 1, quedas: 0 },
        { data: '2026-10-16', altas: 0, quedas: 1 }
    ]);
});

test('sortearAmostra e reproduzivel e nao repete pares', () => {
    const grupos = Array.from({ length: 30 }, (_, i) => [p(`a${i}`, 'supervale', 10), p(`b${i}`, 'vilasul', 11), p(`c${i}`, 'pedrilho', 12)]);

    const primeira = sortearAmostra(grupos, 20);
    const segunda = sortearAmostra(grupos, 20);

    assert.equal(primeira.length, 20);
    assert.deepEqual(primeira.map(([a, b]) => a._id + b._id), segunda.map(([a, b]) => a._id + b._id));
    assert.equal(new Set(primeira.map(([a, b]) => a._id + b._id)).size, 20);
});

test('pontuacao SUS segue a regra de Brooke (impares r-1, pares 5-r, soma x 2,5)', () => {
    assert.equal(pontuacaoSus([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), 100);
    assert.equal(pontuacaoSus([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]), 0);
    assert.equal(pontuacaoSus([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]), 50);
    assert.equal(pontuacaoSus([4, 2, 4, 1, 4, 2, 5, 1, 4, 2]), 82.5);
    assert.throws(() => pontuacaoSus([5, 1, 5]), /10 respostas/);
    assert.throws(() => pontuacaoSus([6, 1, 5, 1, 5, 1, 5, 1, 5, 1]), /entre 1 e 5/);
});

test('analisarSus resume a media e quantos ficaram acima de 68', () => {
    const resultado = analisarSus([
        { participante: 'A', respostas: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1] },
        { participante: 'B', respostas: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3] }
    ]);
    assert.equal(resultado.participantes, 2);
    assert.equal(resultado.media, 75);
    assert.equal(resultado.acimaDaMedia68, 1);
});

test('analisarTempos compara a pesquisa manual com o SuperPreco por participante', () => {
    const resultado = analisarTempos([
        { participante: 'A', metodo: 'manual', segundos: 600, acertou: true },
        { participante: 'A', metodo: 'superpreco', segundos: 120, acertou: true },
        { participante: 'B', metodo: 'manual', segundos: 400, acertou: false },
        { participante: 'B', metodo: 'superpreco', segundos: 200, acertou: true }
    ]);
    assert.equal(resultado.participantes, 2);
    assert.equal(resultado.manual.mediaSegundos, 500);
    assert.equal(resultado.superpreco.mediaSegundos, 160);
    assert.equal(resultado.manual.acertos, 1);
    assert.equal(resultado.reducaoMediaPercentual, 65); // (80% + 50%) / 2
});
