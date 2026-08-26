require('dotenv').config({ quiet: true });
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const { executarPipelineScraping } = require('./services/scrapingPipeline');

const LOG_DIR = path.join(__dirname, 'logs');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

async function executarAtualizacao() {
    const logFile = path.join(LOG_DIR, `atualizacao-${Date.now()}.log`);
    const logStream = fs.createWriteStream(logFile, { encoding: 'utf8' });
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
        originalLog(...args);
        logStream.write(`${args.join(' ')}\n`);
    };

    console.error = (...args) => {
        originalError(...args);
        logStream.write(`[ERRO] ${args.join(' ')}\n`);
    };

    try {
        console.log('==================================================');
        console.log('INICIANDO ATUALIZACAO AUTOMATICA');
        console.log(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
        console.log('==================================================');

        const resultado = await executarPipelineScraping();

        console.log('\nATUALIZACAO CONCLUIDA');
        console.log(JSON.stringify(resultado.resultados, null, 2));
        return resultado;
    } catch (error) {
        console.error('ERRO NA ATUALIZACAO AUTOMATICA');
        console.error(error);
        throw error;
    } finally {
        console.log = originalLog;
        console.error = originalError;
        logStream.end();
        console.log(`Log salvo em: ${logFile}\n`);
    }
}

cron.schedule('0 6,18 * * *', () => {
    console.log('Executando atualizacao agendada (6h e 18h).');
    executarAtualizacao().catch(error => {
        console.error('Falha no scheduler:', error.message);
    });
}, {
    timezone: 'America/Sao_Paulo'
});

console.log('Scheduler configurado.');
console.log('Agendamento ativo: todos os dias as 6h e 18h (America/Sao_Paulo).');
console.log('Para atualizar agora: npm run scheduler:now');
console.log('Scheduler rodando. Pressione Ctrl+C para parar.\n');

if (process.argv.includes('--run-now')) {
    executarAtualizacao().catch(error => {
        console.error('Falha na execucao inicial:', error.message);
    });
}
