const test = require('node:test');
const assert = require('node:assert/strict');
const { descricaoDoAgendamento, proximaColeta } = require('../services/estatisticas');

// Texto do agendamento no painel: no Render o node-cron fica desligado e a coleta roda pelo
// GitHub Actions, nos mesmos horarios; o painel nao pode dizer "desligado" nesse caso.

function comAmbiente(variaveis, fn) {
    const anteriores = {};
    for (const [chave, valor] of Object.entries(variaveis)) {
        anteriores[chave] = process.env[chave];
        if (valor === undefined) delete process.env[chave];
        else process.env[chave] = valor;
    }
    try {
        fn();
    } finally {
        for (const [chave, valor] of Object.entries(anteriores)) {
            if (valor === undefined) delete process.env[chave];
            else process.env[chave] = valor;
        }
    }
}

test('agendador ligado: 6h e 18h e proxima coleta calculada', () => {
    comAmbiente({ SCHEDULER_ENABLED: undefined, COLETA_EXTERNA: undefined, SCRAPER_CRON: undefined }, () => {
        assert.equal(descricaoDoAgendamento(), 'todos os dias às 6h e às 18h');
        // 02h de Brasilia (05h UTC) -> proxima coleta as 6h de Brasilia (09h UTC).
        assert.equal(proximaColeta(new Date('2026-11-07T05:00:00Z')).toISOString(), '2026-11-07T09:00:00.000Z');
    });
});

test('agendador desligado sem coleta externa: desligado e sem proxima coleta', () => {
    comAmbiente({ SCHEDULER_ENABLED: 'false', COLETA_EXTERNA: undefined, SCRAPER_CRON: undefined }, () => {
        assert.equal(descricaoDoAgendamento(), 'desligado');
        assert.equal(proximaColeta(), null);
    });
});

test('agendador desligado com coleta pelo GitHub Actions: mostra os horarios programados', () => {
    comAmbiente({ SCHEDULER_ENABLED: 'false', COLETA_EXTERNA: 'GitHub Actions', SCRAPER_CRON: undefined }, () => {
        assert.equal(descricaoDoAgendamento(), 'todos os dias às 6h e às 18h, pelo GitHub Actions');
        // 19h de Brasilia (22h UTC) -> proxima coleta as 6h do dia seguinte (09h UTC).
        assert.equal(proximaColeta(new Date('2026-11-07T22:00:00Z')).toISOString(), '2026-11-08T09:00:00.000Z');
    });
});
