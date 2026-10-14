const path = require('node:path');
const fs = require('node:fs');
const { importarProdutosDoJson, SUPERMARKETS } = require('./importProducts');
const { acquireLock, saveJson } = require('../../scrapers/state');
const { scrapeMarket } = require('../../scrapers/catalog');
const { configFor } = require('../../scrapers/cli');
const { createBatchWriter } = require('./batchWriter');
const { syncCanonicalProducts } = require('./canonicalProducts');
const ROOT = path.resolve(__dirname, '../..');
async function executarPipelineScraping(options = {}) {
    const selected = options.mercado && options.mercado !== 'todos'
        ? [options.mercado] : Object.keys(SUPERMARKETS).filter(s => SUPERMARKETS[s].collectionEnabled !== false);
    for (const slug of selected) {
        if (!SUPERMARKETS[slug]) throw new Error('Supermercado desconhecido: '+slug);
        if (SUPERMARKETS[slug].collectionEnabled === false) throw new Error(SUPERMARKETS[slug].disabledReason);
    }
    const release = acquireLock(path.join(ROOT,'scrapers','.pipeline.lock'));
    const reportFile = path.join(ROOT,'scrapers','pipeline.report.json');
    const report = {startedAt:new Date(),status:'running',mercados:selected,resultados:[],errors:[],progress:{}};
    async function updateCanonical(slug) {
        try {
            const result=await syncCanonicalProducts({supermercado:slug});
            report.progress[slug].canonical={products:result.canonicalProducts,changed:result.changed};
            console.log(`[${slug}] Produtos canônicos: ${result.canonicalProducts}, ${result.changed} vínculos atualizados.`);
        } catch (error) {
            report.errors.push({mercado:slug,phase:'canonical',error:error.message});
            console.error(`[${slug}] Falha ao atualizar referências canônicas: ${error.message}`);
        }
        saveJson(reportFile,report);
    }
    try {
        for (const slug of selected) {
            if (fs.existsSync(path.join(ROOT,'scrapers','.stop'))) throw new Error('Coleta parada; use retomar para continuar.');
            if (options.resume && !options.fresh && !options.pilot && !options.maxPages && !options.maxDepartments && !options.department && !options.outputPath) {
                const checkpointFile = path.join(configFor(slug).outputDir, 'products.checkpoint.json');
                if (fs.existsSync(checkpointFile)) {
                    const checkpoint = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
                    if (checkpoint.complete && Date.now() - Date.parse(checkpoint.startedAt) < 86400000) {
                        report.progress[slug] = {complete:true, skipped:true};
                        console.log(`[${slug}] Coleta recente concluída; preservada na retomada.`);
                        saveJson(reportFile,report);
                        continue;
                    }
                }
            }
            report.currentMarket = slug;
            report.progress[slug] = {batches:0,processed:0,new:0,updated:0};
            const checkpointFile = path.join(configFor(slug).outputDir, 'products.checkpoint.json');
            const oldCheckpoint = options.resume && fs.existsSync(checkpointFile)
                ? JSON.parse(fs.readFileSync(checkpointFile, 'utf8')) : null;
            const resumedAcrossDays = !!(oldCheckpoint && !oldCheckpoint.complete && Date.now() - Date.parse(oldCheckpoint.startedAt) > 86400000);
            if (resumedAcrossDays) report.progress[slug].resumedAcrossDays = true;
            saveJson(reportFile,report);
            const write = createBatchWriter(async products => {
                const result = await importarProdutosDoJson(slug,{products,partial:true,syncCanonicalProducts:false});
                const progress = report.progress[slug];
                progress.batches++;progress.processed+=result.processados;progress.new+=result.novos;progress.updated+=result.atualizados;
                progress.lastImportedAt = new Date().toISOString();
                saveJson(reportFile,report);
                console.log(`[${slug}] MongoDB: +${result.novos} novos, ${result.atualizados} atualizados (${result.processados} neste lote).`);
                return result;
            });
            try {
                console.log(`[${slug}] Coletando e gravando cada lote no MongoDB antes de avançar.`);
                const products = await scrapeMarket(configFor(slug),{...options,onProducts:write});
                const limited = !!(options.pilot || options.maxPages || options.maxDepartments || options.department || resumedAcrossDays);
                // Uma retomada entre dias não representa uma fotografia completa
                // do catálogo num único momento; preserva os produtos ausentes.
                report.resultados.push(await importarProdutosDoJson(slug,{products,partial:limited,syncCanonicalProducts:false}));
                await updateCanonical(slug);
                report.progress[slug].complete = !limited;
                if(resumedAcrossDays) report.progress[slug].coverageComplete = true;
                saveJson(reportFile,report);
            } catch (error) {
                report.errors.push({mercado:slug,error:error.message,pending:error.pending});
                if (error.code === 'INCOMPLETE') {
                    report.progress[slug].complete = false;
                    report.progress[slug].pending = error.pending;
                    await updateCanonical(slug);
                    saveJson(reportFile,report);
                    console.log(`[${slug}] Categorias pendentes registradas; seguindo para o próximo mercado.`);
                    continue;
                }
                throw error;
            }
        }
        report.status=report.errors.length || Object.values(report.progress).some(p=>p.resumedAcrossDays) ? 'partial' : 'complete';
        return report;
    } catch(error) {
        report.status='stopped';report.error=error.message;throw error;
    } finally {
        report.finishedAt=new Date();saveJson(reportFile,report);release();
    }
}
module.exports={executarPipelineScraping};
