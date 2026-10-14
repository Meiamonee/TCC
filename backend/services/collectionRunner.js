const fs = require('node:fs');
const path = require('node:path');
const CollectionRun = require('../models/CollectionRun');
const { executarPipelineScraping } = require('./scrapingPipeline');

const configuredMarkets = require('../../config/supermarkets.json');
const enabledMarkets = configuredMarkets
    .filter(market => market.collectionEnabled !== false)
    .map(market => market.slug);
const pipelineLock = path.join(__dirname, '../../scrapers/.pipeline.lock');

let starting = false;
let currentRunId = null;
let currentPromise = null;

class CollectionBusyError extends Error {
    constructor() {
        super('Uma coleta ja esta em execucao');
        this.code = 'COLLECTION_BUSY';
        this.statusCode = 409;
    }
}

class CollectionValidationError extends Error {
    constructor(message) {
        super(message);
        this.code = 'COLLECTION_VALIDATION';
        this.statusCode = 400;
    }
}

function externalCollectionActive() {
    try {
        const { pid } = JSON.parse(fs.readFileSync(pipelineLock, 'utf8'));
        if (!Number.isInteger(pid) || pid <= 0) return false;
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

function normalizeMarket(value) {
    const market = String(value || 'todos').trim().toLowerCase();
    if (market === 'todos') return market;
    if (!enabledMarkets.includes(market)) {
        throw new CollectionValidationError('Mercado invalido ou com coleta desabilitada');
    }
    return market;
}

function summarizeResult(result = {}) {
    const rows = Array.isArray(result.resultados) ? result.resultados : [];
    const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
    return {
        pipelineStatus: result.status || 'complete',
        markets: Array.isArray(result.mercados) ? result.mercados : [],
        totals: rows.reduce((totals, row) => ({
            found: totals.found + number(row.encontrados),
            processed: totals.processed + number(row.processados),
            new: totals.new + number(row.novos),
            updated: totals.updated + number(row.atualizados),
            priceChanges: totals.priceChanges + number(row.precosMudaram),
            unavailable: totals.unavailable + number(row.indisponiveis),
            errors: totals.errors + number(row.erros)
        }), {
            found: 0,
            processed: 0,
            new: 0,
            updated: 0,
            priceChanges: 0,
            unavailable: 0,
            errors: 0
        })
    };
}

function publicRun(run) {
    if (!run) return null;
    const value = typeof run.toObject === 'function' ? run.toObject() : run;
    return {
        id: String(value._id),
        trigger: value.trigger,
        market: value.market,
        status: value.status,
        requestedAt: value.requestedAt,
        startedAt: value.startedAt || null,
        finishedAt: value.finishedAt || null,
        durationMs: value.durationMs || null,
        summary: value.summary || null,
        error: value.status === 'failed' || value.status === 'interrupted'
            ? 'A coleta nao foi concluida. Consulte os logs do servidor.'
            : null
    };
}

async function executeRun(runId, market) {
    const startedAt = new Date();
    try {
        await CollectionRun.findByIdAndUpdate(runId, {
            status: 'running',
            startedAt,
            processId: process.pid
        });
        const result = await executarPipelineScraping({
            mercado: market === 'todos' ? undefined : market
        });
        const finishedAt = new Date();
        const status = result.status === 'partial' ? 'partial' : 'completed';
        await CollectionRun.findByIdAndUpdate(runId, {
            status,
            finishedAt,
            durationMs: finishedAt.getTime() - startedAt.getTime(),
            summary: summarizeResult(result)
        });
    } catch (error) {
        const finishedAt = new Date();
        console.error(`[coleta ${runId}] Falha:`, error);
        try {
            await CollectionRun.findByIdAndUpdate(runId, {
                status: 'failed',
                finishedAt,
                durationMs: finishedAt.getTime() - startedAt.getTime(),
                errorCode: error.code || 'COLLECTION_FAILED',
                errorMessage: String(error.message || 'Erro desconhecido').slice(0, 1000)
            });
        } catch (statusError) {
            console.error(`[coleta ${runId}] Nao foi possivel registrar a falha:`, statusError);
        }
    } finally {
        if (currentRunId === String(runId)) {
            currentRunId = null;
            currentPromise = null;
        }
    }
}

async function launchCollection({ trigger = 'manual', market } = {}) {
    const normalizedMarket = normalizeMarket(market);
    if (starting || currentPromise || externalCollectionActive()) {
        throw new CollectionBusyError();
    }

    starting = true;
    try {
        const run = await CollectionRun.create({
            trigger,
            market: normalizedMarket,
            status: 'queued',
            processId: process.pid
        });
        currentRunId = String(run._id);
        currentPromise = executeRun(run._id, normalizedMarket);
        return publicRun(run);
    } finally {
        starting = false;
    }
}

async function recordSkippedCollection({ trigger = 'scheduled', market, reason } = {}) {
    const now = new Date();
    const run = await CollectionRun.create({
        trigger,
        market: normalizeMarket(market),
        status: 'skipped',
        startedAt: now,
        finishedAt: now,
        durationMs: 0,
        summary: { reason: String(reason || 'Coleta ja estava em execucao') }
    });
    return publicRun(run);
}

async function getCollectionStatus(limit = 5) {
    const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);
    const runs = await CollectionRun.find()
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .lean();
    return {
        running: Boolean(starting || currentPromise || externalCollectionActive()),
        currentRunId,
        runs: runs.map(publicRun)
    };
}

async function recoverInterruptedRuns() {
    if (externalCollectionActive()) return { modifiedCount: 0 };
    const now = new Date();
    return CollectionRun.updateMany({ status: { $in: ['queued', 'running'] } }, {
        $set: {
            status: 'interrupted',
            finishedAt: now,
            errorCode: 'PROCESS_INTERRUPTED',
            errorMessage: 'O processo foi encerrado antes da conclusao da coleta.'
        }
    });
}

async function waitForCurrentCollection() {
    const runId = currentRunId;
    if (currentPromise) await currentPromise;
    return runId;
}

function isCollectionActive() {
    return Boolean(starting || currentPromise || externalCollectionActive());
}

module.exports = {
    CollectionBusyError,
    CollectionValidationError,
    enabledMarkets,
    externalCollectionActive,
    getCollectionStatus,
    isCollectionActive,
    launchCollection,
    normalizeMarket,
    publicRun,
    recordSkippedCollection,
    recoverInterruptedRuns,
    summarizeResult,
    waitForCurrentCollection
};
