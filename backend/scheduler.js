require('dotenv').config({ quiet: true });
const { executarAtualizacao, iniciarAgendamento } = require('./services/agendador');

// Agendador independente da API. Normalmente nao e necessario: a API (server.js) ja inicia
// o agendamento, a menos que SCHEDULER_ENABLED=false.
iniciarAgendamento();
console.log('Scheduler rodando. Pressione Ctrl+C para parar.');

if (process.argv.includes('--run-now')) {
    executarAtualizacao({ origem: 'manual' }).catch(error => {
        console.error('Falha na execucao inicial:', error.message);
    });
}
