require('dotenv').config({ quiet: true });
const cron = require('node-cron');
const connectDB = require('./config/database');
const {
    CollectionBusyError,
    launchCollection,
    recordSkippedCollection,
    recoverInterruptedRuns,
    waitForCurrentCollection
} = require('./services/collectionRunner');

const DEFAULT_SCHEDULE = '0 6,18 * * *';
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
let scheduledTask = null;

async function executeScheduledCollection() {
    try {
        const run = await launchCollection({ trigger: 'scheduled', market: 'todos' });
        console.log(`[scheduler] Coleta ${run.id} iniciada.`);
        return run;
    } catch (error) {
        if (error instanceof CollectionBusyError || error.code === 'COLLECTION_BUSY') {
            const skipped = await recordSkippedCollection({
                trigger: 'scheduled',
                market: 'todos',
                reason: 'Outra coleta ja estava em execucao no horario agendado.'
            });
            console.log(`[scheduler] Execucao ${skipped.id} ignorada porque ja existe uma coleta ativa.`);
            return skipped;
        }
        console.error('[scheduler] Falha ao iniciar coleta:', error);
        throw error;
    }
}

function startScheduler() {
    if (process.env.SCHEDULER_ENABLED === 'false') {
        console.log('[scheduler] Desabilitado por SCHEDULER_ENABLED=false.');
        return null;
    }
    if (scheduledTask) return scheduledTask;

    const expression = process.env.COLLECTION_CRON || DEFAULT_SCHEDULE;
    const timezone = process.env.COLLECTION_TIMEZONE || DEFAULT_TIMEZONE;
    if (!cron.validate(expression)) {
        throw new Error('COLLECTION_CRON invalido');
    }

    scheduledTask = cron.schedule(expression, () => {
        executeScheduledCollection().catch(() => undefined);
    }, {
        timezone,
        noOverlap: true
    });

    console.log(`[scheduler] Ativo: ${expression} (${timezone}).`);
    return scheduledTask;
}

function stopScheduler() {
    if (!scheduledTask) return;
    scheduledTask.stop();
    scheduledTask = null;
}

async function runStandalone() {
    await connectDB();
    await recoverInterruptedRuns();
    startScheduler();

    if (process.argv.includes('--run-now')) {
        await executeScheduledCollection();
        await waitForCurrentCollection();
    }
}

if (require.main === module) {
    runStandalone().catch(error => {
        console.error('[scheduler] Falha fatal:', error);
        process.exitCode = 1;
    });
}

module.exports = {
    DEFAULT_SCHEDULE,
    DEFAULT_TIMEZONE,
    executeScheduledCollection,
    startScheduler,
    stopScheduler
};
