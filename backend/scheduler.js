require('dotenv').config();
const cron = require('node-cron');
const atualizarSuperVale = require('./scripts/atualizarSuperVale');
const path = require('path');
const fs = require('fs');

// Configurações
const LOG_DIR = path.join(__dirname, 'logs');

// Criar diretório de logs se não existir
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Função principal de atualização
async function executarAtualizacao() {
    const logFile = path.join(LOG_DIR, `atualizacao-${Date.now()}.log`);
    const logStream = fs.createWriteStream(logFile);

    // Redirecionar console para arquivo de log
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
        originalLog(...args);
        logStream.write(args.join(' ') + '\n');
    };

    console.error = (...args) => {
        originalError(...args);
        logStream.write('[ERRO] ' + args.join(' ') + '\n');
    };

    try {
        console.log('═══════════════════════════════════════════════════');
        console.log('🚀 INICIANDO ATUALIZAÇÃO AUTOMÁTICA');
        console.log('═══════════════════════════════════════════════════');
        console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
        console.log('═══════════════════════════════════════════════════\n');

        // Executar atualização do MongoDB
        const resultado = await atualizarSuperVale();

        console.log('\n═══════════════════════════════════════════════════');
        console.log('✅ ATUALIZAÇÃO COMPLETA CONCLUÍDA!');
        console.log('═══════════════════════════════════════════════════\n');

        return resultado;
    } catch (error) {
        console.error('\n═══════════════════════════════════════════════════');
        console.error('❌ ERRO NA ATUALIZAÇÃO AUTOMÁTICA');
        console.error('═══════════════════════════════════════════════════');
        console.error(error);
        console.error('');
    } finally {
        // Restaurar console
        console.log = originalLog;
        console.error = originalError;
        logStream.end();

        console.log(`📝 Log salvo em: ${logFile}\n`);
    }
}

// Configurar agendamentos
console.log('⏰ Configurando agendamentos...\n');

// Atualizar diariamente às 6h da manhã
cron.schedule('0 6 * * *', () => {
    console.log('⏰ Executando atualização agendada (diária às 6h)');
    executarAtualizacao();
}, {
    timezone: "America/Sao_Paulo"
});

// Atualizar a cada 12 horas (6h e 18h)
cron.schedule('0 6,18 * * *', () => {
    console.log('⏰ Executando atualização agendada (12h em 12h)');
    executarAtualizacao();
}, {
    timezone: "America/Sao_Paulo"
});

console.log('✅ Scheduler configurado!');
console.log('\n📋 Agendamentos ativos:');
console.log('   • Diariamente às 6h (America/Sao_Paulo)');
console.log('   • A cada 12 horas (6h e 18h)');
console.log('\n💡 IMPORTANTE: Execute o scraper manualmente antes:');
console.log('   cd ../scraper && node index.js');
console.log('\n💡 Para atualizar MongoDB manualmente: npm run atualizar\n');

// Manter o processo rodando
console.log('🔄 Scheduler rodando... (Pressione Ctrl+C para parar)\n');

// Executar uma vez ao iniciar (opcional)
if (process.argv.includes('--run-now')) {
    console.log('🚀 Executando atualização inicial...\n');
    executarAtualizacao();
}
