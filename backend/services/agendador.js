const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { executarPipelineScraping } = require('./scrapingPipeline');
const { invalidarEstatisticas } = require('./comparacao');

// Horario padrao da coleta automatica: todos os dias as 6h e as 18h.
const AGENDAMENTO_PADRAO = '0 6,18 * * *';
const FUSO_HORARIO = 'America/Sao_Paulo';
const LOG_DIR = path.join(__dirname, '..', 'logs');

const estado = {
    emExecucao: false,
    inicio: null,
    ultimaExecucao: null
};

function obterEstado() {
    return { ...estado };
}

// Duplica a saida do console em um arquivo de log da execucao.
function abrirLog() {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const arquivo = path.join(LOG_DIR, `atualizacao-${Date.now()}.log`);
    const stream = fs.createWriteStream(arquivo, { encoding: 'utf8' });
    const log = console.log;
    const error = console.error;

    console.log = (...args) => {
        log(...args);
        stream.write(`${args.join(' ')}\n`);
    };
    console.error = (...args) => {
        error(...args);
        stream.write(`[ERRO] ${args.join(' ')}\n`);
    };

    return () => {
        console.log = log;
        console.error = error;
        stream.end();
        return arquivo;
    };
}

// Executa scraping + importacao. Apenas uma execucao por vez.
async function executarAtualizacao(opcoes = {}) {
    if (estado.emExecucao) {
        const erro = new Error('Atualizacao ja esta em execucao');
        erro.status = 409;
        erro.expose = true;
        throw erro;
    }

    estado.emExecucao = true;
    estado.inicio = new Date();
    const fecharLog = abrirLog();

    try {
        console.log(`Atualizacao iniciada em ${estado.inicio.toLocaleString('pt-BR')} (${opcoes.origem || 'manual'}).`);
        const resultado = await executarPipelineScraping({ mercado: opcoes.mercado });
        invalidarEstatisticas();
        estado.ultimaExecucao = {
            inicio: resultado.startedAt,
            fim: resultado.finishedAt,
            resultados: resultado.resultados,
            falhas: resultado.falhas
        };
        console.log('Atualizacao concluida.');
        return resultado;
    } catch (error) {
        estado.ultimaExecucao = { inicio: estado.inicio, fim: new Date(), erro: error.message };
        console.error('Falha na atualizacao:', error.message);
        throw error;
    } finally {
        const arquivo = fecharLog();
        estado.emExecucao = false;
        estado.inicio = null;
        console.log(`Log salvo em ${arquivo}`);
    }
}

function iniciarAgendamento() {
    const expressao = process.env.SCRAPER_CRON || AGENDAMENTO_PADRAO;

    if (!cron.validate(expressao)) {
        throw new Error(`SCRAPER_CRON invalido: ${expressao}`);
    }

    cron.schedule(expressao, () => {
        executarAtualizacao({ origem: 'agendada' }).catch(error => {
            console.error('Falha na atualizacao agendada:', error.message);
        });
    }, { timezone: FUSO_HORARIO });

    console.log(`Coleta automatica agendada: "${expressao}" (${FUSO_HORARIO}).`);
}

module.exports = {
    executarAtualizacao,
    iniciarAgendamento,
    obterEstado
};
