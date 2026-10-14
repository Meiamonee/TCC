require('dotenv').config({ quiet: true });
const connectDB = require('./config/database');
const { criarApp } = require('./app');
const { iniciarAgendamento } = require('./services/agendador');

const PORT = process.env.PORT || 3001;

connectDB().then(() => {
    criarApp().listen(PORT, () => {
        console.log(`API rodando em http://localhost:${PORT}`);
    });

    // A coleta periodica roda junto com a API, a menos que seja desligada explicitamente.
    if (process.env.SCHEDULER_ENABLED !== 'false') {
        iniciarAgendamento();
    }
});
