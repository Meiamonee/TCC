const fs = require('node:fs');
const path = require('node:path');
const { createDriver } = require('./browser');
const { createPacer } = require('./pacing');
const { acquireLock, openCheckpoint } = require('./state');
const { readCatalog, readCategories, readSubcategories, advanceCatalog, readStore, readProductDetail } = require('./dom');

const { retryCategory, invalidSession } = require('./retry');
const { completionEvidence } = require('./completion');
const signature = state => state.ids.join('|') + ':' + (state.cardCount ?? '');
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toLowerCase();

async function verifyStore(driver, config) {
    const store = await driver.executeScript(readStore, config.platform);
    if (!normalize(store).includes(normalize(config.address))) {
        throw Object.assign(new Error(`Unidade de Pocos de Caldas nao confirmada. Esperado: ${config.address}. Exibido: ${store.slice(0, 220)}`),{code:'STORE_MISMATCH'});
    }
    return { city: config.city, address: config.address };
}

async function waitForCatalog(driver, platform, previous = null, timeout = 30000) {
    let lastSignature;
    let stableSince = 0;
    return driver.wait(async () => {
        const blocked = await driver.executeScript(() => /access denied|acesso negado|too many requests|verifique que voce e humano|verify you are human|just a moment/i.test(document.title + ' ' + (document.querySelector('main')?.innerText || '').slice(0, 1200)) || [...document.querySelectorAll('iframe[src*="captcha"]')].some(e => e.getClientRects().length));
        if (blocked) throw Object.assign(new Error('Bloqueio ou desafio do site. Coleta parada, sem contornar a restricao.'), {code:'BLOCKED'});
        const state = await driver.executeScript(readCatalog, platform);
        if (previous !== null && signature(state) === previous) return false;
        if (!state.items.length && !state.empty) return false;
        const current = signature(state) + ':' + state.items.length;
        if (lastSignature !== current) {
            lastSignature = current;
            stableSince = Date.now();
            return false;
        }
        return Date.now() - stableSince >= 1200 ? state : false;
    }, timeout, 'Catalogo nao carregou produtos com preco.', 400);
}

async function enrichUnknownPriceMetadata(driver, config, products, cache = new Map()) {
    const pending = products.filter(product => product.priceBasis === 'unknown' && !cache.has(product.id));
    if (pending.length) {
        const listingHandle = await driver.getWindowHandle();
        let detailHandle;
        try {
            await driver.switchTo().newWindow('tab');
            detailHandle = await driver.getWindowHandle();
            for (const product of pending) {
                try {
                    await driver.get(product.url);
                    const detail = await driver.wait(async () => {
                        const blocked = await driver.executeScript(() => /access denied|acesso negado|too many requests|verifique que voce e humano|verify you are human|just a moment/i.test(document.title + ' ' + (document.querySelector('main')?.innerText || '').slice(0, 1200)) || [...document.querySelectorAll('iframe[src*="captcha"]')].some(e => e.getClientRects().length));
                        if (blocked) throw Object.assign(new Error('Bloqueio ou desafio do site. Coleta parada, sem contornar a restricao.'), {code:'BLOCKED'});
                        return await driver.executeScript(readProductDetail, config.platform) || false;
                    }, 3000, 'Detalhe do produto nao publicou preco.', 200);
                    const metadata = detail.priceBasis !== 'unknown' ? {
                        priceBasis: detail.priceBasis,
                        priceScope: detail.priceScope,
                        pricePackageQuantity: detail.pricePackageQuantity,
                        priceUnitRaw: detail.priceUnitRaw,
                        priceBasisSource: detail.priceBasisSource,
                        priceBasisConfidence: detail.priceBasisConfidence
                    } : null;
                    cache.set(product.id, metadata);
                } catch (error) {
                    if (error.code === 'BLOCKED') throw error;
                    console.log(`[detalhe] ${product.id}: unidade nao confirmada (${error.message})`);
                    cache.set(product.id, null);
                }
            }
        } finally {
            try {
                if (detailHandle) {
                    await driver.switchTo().window(detailHandle);
                    await driver.close();
                }
            } finally {
                await driver.switchTo().window(listingHandle);
            }
        }
    }
    return products.map(product => ({...product,...(cache.get(product.id) || {})}));
}

async function scrapeListing(driver, config, options, pause) {
    const items = new Map();
    const seenIds = new Set();
    const pages = new Set();
    let state = await waitForCatalog(driver, config.platform);
    let rounds = 0;
    let completion;
    while (true) {
        rounds++;
        const currentItems = options.enrichItems ? await options.enrichItems(state.items) : state.items;
        for (const item of currentItems) items.set(item.id, item);
        await options.onBatch?.([...items.values()], rounds);
        state.ids.forEach(id => seenIds.add(id));
        const current = signature(state);
        if (pages.has(current) && state.ids.length) throw new Error('A navegacao repetiu uma pagina de produtos.');
        pages.add(current);
        console.log(`  Lote ${rounds}: ${seenIds.size}${state.total === null ? '' : '/' + state.total} itens (${items.size} com preco)`);
        completion = completionEvidence(state, seenIds.size);
        if (completion.complete) {
            if (completion.reason === 'duplicate-cards') console.log('[catalogo] Total inclui cartões repetidos: ' + JSON.stringify(completion));
            break;
        }
        if (options.maxPages && rounds >= options.maxPages) return { items: [...items.values()], rounds, complete: false };
        if (rounds >= 2000) throw new Error('Limite de navegacao atingido; catalogo nao sera publicado como completo.');
        await pause();
        const action = await driver.executeScript(advanceCatalog, config.platform);
        if (action === 'end') {
            if (state.total !== null && seenIds.size < state.total) throw new Error(`Navegacao terminou antes do total: ${seenIds.size} de ${state.total} produtos.`);
            break;
        }
        try {
            state = await waitForCatalog(driver, config.platform, current, 12000);
        } catch (error) {
            if (error.name !== 'TimeoutError') throw error;
            // Com total conhecido, uma rolagem travada nao significa fim do catalogo.
            if (state.total !== null && seenIds.size < state.total) {
                await pause(1);
                await driver.executeScript(advanceCatalog, config.platform);
                state = await waitForCatalog(driver, config.platform, current, 30000);
                continue;
            }
            if (action !== 'scroll') throw error;
            // Confirma o fim em uma segunda tentativa antes de encerrar listas sem total.
            await pause();
            await driver.executeScript(advanceCatalog, config.platform);
            try {
                state = await waitForCatalog(driver, config.platform, current, 6000);
            } catch (retryError) {
                if (retryError.name !== 'TimeoutError') throw retryError;
                break;
            }
        }
    }
    return { items: [...items.values()], rounds, complete: true, completion };
}

function saveJson(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', 'utf8');
    fs.renameSync(temporary, file);
}

async function scrapeMarket(config, options = {}) {
    const limited = !!(options.maxPages || options.maxDepartments || options.department || options.pilot);
    const output = options.outputPath || path.join(config.outputDir, options.pilot ? 'products.pilot.json' : limited ? 'products.sample.json' : 'products.json');
    if (!/\.json$/i.test(output) || (limited && path.basename(output).toLowerCase() === 'products.json')) throw new Error('Coleta limitada deve usar um JSON de amostra.');
    const unlock = acquireLock(path.join(config.outputDir, '.collection.lock'));
    let checkpoint, driver, stopped=false, browserRestarts=0;
    const stopFile=path.join(config.outputDir, '.stop');
    const requestStop=()=>{stopped=true;};
    process.on('SIGINT',requestStop);process.on('SIGTERM',requestStop);
    const reportFile=output.replace(/\.json$/i,'.report.json');
    const report={supermercado:config.slug,complete:false,categories:[],errors:[]};
    try {
        if(fs.existsSync(stopFile)) throw Object.assign(new Error('Parada solicitada em .stop; remova o arquivo para retomar.'),{code:'STOPPED'});
        checkpoint=openCheckpoint(output.replace(/\.json$/i,'.checkpoint.json'),{market:config.slug,address:config.address,department:options.department||null,pilot:!!options.pilot,maxPages:options.maxPages||null,maxDepartments:options.maxDepartments||null}, {fresh:!!options.fresh,resumeOld:!!options.resume});
        delete checkpoint.state.error;
        report.startedAt=checkpoint.state.startedAt;
        const pause=createPacer({...options,shouldStop:()=>stopped||fs.existsSync(stopFile),onWait:wait=>{Object.assign(checkpoint.state,wait);checkpoint.save();}});
        driver=await createDriver(options.headless ?? process.env.SCRAPER_HEADLESS!=='false',options);
        await driver.manage().setTimeouts({pageLoad:60000,script:30000});
        await pause(); await driver.get(config.baseUrl);
        let departments=await driver.wait(async()=>{const list=await driver.executeScript(readCategories,config.platform);return list.length?list:false;},30000);
        report.discoveredDepartments=departments;
        report.store=await verifyStore(driver,config);
        // O banco já recebeu estes lotes na execução anterior. Não reaplica
        // dados antigos ao retomar em outro dia.
        if(options.onProducts && !checkpoint.state.resumedAcrossDays && checkpoint.products().length) await options.onProducts(checkpoint.products());
        if(options.department) departments=departments.filter(d=>d.url.endsWith('/'+options.department));
        if(options.pilot) departments=departments.filter(d=>/mercearia|cereais|alimentos-basicos|matinais|laticinios/.test(d.url));
        if(options.maxDepartments) departments=departments.slice(0,options.maxDepartments);
        if(!departments.length)throw new Error('Nenhum departamento elegivel.');
        for(const department of departments) {
            let summary=checkpoint.state.categories[department.url];
            if(summary?.complete){console.log(`[retomada] ${department.name} ja concluido`);report.categories.push(summary);continue;}
            summary={...department,products:0,batches:0,complete:false};
            report.categories.push(summary);checkpoint.state.categories[department.url]=summary;
            try {
                await retryCategory(async () => {
                console.log(`[${config.slug}] ${department.name}: ${department.url}`);
                await pause();await driver.get(department.url);
                await waitForCatalog(driver,config.platform);await verifyStore(driver,config);
                let listings=config.platform==='instabuy'?await driver.executeScript(readSubcategories):[];
                if(!listings.length)listings=[department];
                const detailCache=new Map();
                summary.listings=listings.map(l=>l.url);
                for(const listing of listings){
                    if(checkpoint.state.listings[listing.url]?.complete)continue;
                    if(listing.url!==department.url){await pause();await driver.get(listing.url);await waitForCatalog(driver,config.platform);await verifyStore(driver,config);}
                    const result=await scrapeListing(driver,config,{...options,enrichItems:items=>enrichUnknownPriceMetadata(driver,config,items,detailCache),onBatch:async(items,rounds)=>{
                        const previous=checkpoint.state.listings[listing.url]?.items || [];
                        const incoming=items.map(p=>({...p,department:department.name,capturedAt:new Date().toISOString()}));
                        // Mantem os lotes anteriores ate a listagem ser lida por completo novamente.
                        checkpoint.state.listings[listing.url]={department:department.name,items:[...new Map([...previous,...incoming].map(p=>[p.id,p])).values()],rounds,complete:false};
                        checkpoint.state.currentListing=listing.url;checkpoint.save();
                        if(options.onProducts) await options.onProducts(incoming);
                    }},pause);
                    const items=result.items.map(p=>({...p,department:department.name,capturedAt:new Date().toISOString()}));
                    checkpoint.state.listings[listing.url]={department:department.name,items,rounds:result.rounds,complete:result.complete,completion:result.completion};
                    summary.batches+=result.rounds;checkpoint.save();
                    if(options.maxPages && summary.batches>=options.maxPages)break;
                }
                summary.complete=listings.every(l=>checkpoint.state.listings[l.url]?.complete);
                summary.products=new Set(listings.flatMap(l=>checkpoint.state.listings[l.url]?.items || []).map(p=>p.id)).size;
                checkpoint.save();
                }, pause, failure => { summary.lastError=failure.error; summary.attempts=failure.attempt; checkpoint.save(); }, async error => {
                    if (!invalidSession(error)) return;
                    browserRestarts++;
                    if (browserRestarts > 3) throw Object.assign(new Error('O Chrome perdeu a sessão repetidamente; progresso salvo.'), {code:'BROWSER_FAILED'});
                    console.log(`[navegador] Sessão perdida; abrindo Chrome novamente (${browserRestarts}/3).`);
                    try { await driver.quit(); } catch { /* A sessão anterior já foi encerrada. */ }
                    try {
                        driver=await createDriver(options.headless ?? process.env.SCRAPER_HEADLESS!=='false',options);
                        await driver.manage().setTimeouts({pageLoad:60000,script:30000});
                        await pause();await driver.get(config.baseUrl);
                        await driver.wait(async()=>{const list=await driver.executeScript(readCategories,config.platform);return list.length?list:false;},30000);
                        await verifyStore(driver,config);
                    } catch (cause) {
                        cause.code ||= 'BROWSER_FAILED';
                        throw cause;
                    }
                });
                delete summary.lastError;
            }catch(error){
                report.errors.push({department:department.name,error:error.message});checkpoint.save();
                if(['BLOCKED','STOPPED','IMPORT_FAILED','STORE_MISMATCH','BROWSER_FAILED'].includes(error.code))throw error;
                summary.lastError=error.message;checkpoint.save();console.error(error.message);
            }
        }
        const activeListings = new Set(report.categories.flatMap(c => c.listings || []));
        const all=[...new Map([...activeListings].flatMap(url => checkpoint.state.listings[url]?.items || []).map(p=>[p.id,p])).values()];
        const finished=!report.errors.length && report.categories.every(c=>c.complete) && all.length>0;
        report.complete=finished && !limited;report.products=all.length;report.finishedAt=new Date().toISOString();
        report.resumedAcrossDays=!!checkpoint.state.resumedAcrossDays;
        checkpoint.state.complete=finished;if(finished)delete checkpoint.state.error;checkpoint.save();
        saveJson(reportFile,report);
        if(!limited && !report.complete){saveJson(output.replace(/\.json$/i,'.partial.json'),all);throw Object.assign(new Error('Coleta incompleta; categorias pendentes preservadas para retomada.'),{code:'INCOMPLETE',pending:report.categories.filter(c=>!c.complete).map(c=>({name:c.name,url:c.url,error:c.lastError}))});}
        saveJson(output,all);
        if(report.errors.length || !all.length)throw new Error('Coleta com falhas; veja relatorio.');
        console.log(`[${config.slug}] ${all.length} produtos salvos em ${output}`);
        return all;
    }catch(error){
        report.complete=false;report.error=error.message;report.status=error.code || 'ERROR';report.finishedAt=new Date().toISOString();
        if(checkpoint){checkpoint.state.error=error.message;checkpoint.save();saveJson(output.replace(/\.json$/i,'.partial.json'),checkpoint.products());}
        saveJson(reportFile,report);throw error;
    }finally{process.off('SIGINT',requestStop);process.off('SIGTERM',requestStop);try{if(driver)try{await driver.quit();}catch(error){if(!invalidSession(error))throw error;}}finally{unlock();}}
}
module.exports={scrapeMarket,scrapeListing,waitForCatalog,verifyStore,enrichUnknownPriceMetadata};
