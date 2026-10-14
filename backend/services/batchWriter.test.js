const {test}=require('node:test');const assert=require('node:assert/strict');
const {createBatchWriter}=require('./batchWriter');
test('grava somente novos ou alterados; espera MongoDB e permite repetir lote que falhou',async()=>{
 const calls=[];let fail=true;
 const write=createBatchWriter(async batch=>{await new Promise(r=>setTimeout(r,5));if(fail)throw Error('offline');calls.push(batch);return {processados:batch.length};});
 const a={id:'1',name:'Arroz',price:'R$ 10,00',department:'Mercearia'};
 await assert.rejects(write([a]),{code:'IMPORT_FAILED'});assert.equal(calls.length,0);fail=false;
 await write([a,a]);assert.equal(calls[0].length,1);
 assert.equal(await write([{...a,capturedAt:new Date().toISOString()}]),null);
 await write([a,{id:'2',name:'Café',price:'R$ 9,00'}]);assert.deepEqual(calls[1].map(p=>p.id),['2']);
 await write([{...a,price:'R$ 11,00'}]);assert.equal(calls[2][0].price,'R$ 11,00');
});
test('falha de importacao interrompe navegacao antes do proximo lote',async()=>{
 const {scrapeListing}=require('../../scrapers/catalog');let navigations=0;
 const driver={wait:async()=>({ids:['1'],items:[{id:'1'}],total:20,cardCount:1}),executeScript:async()=>{navigations++;}};
 await assert.rejects(scrapeListing(driver,{platform:'vipcommerce'},{onBatch:async()=>{throw Object.assign(Error('DB offline'),{code:'IMPORT_FAILED'});}},async()=>{}),{code:'IMPORT_FAILED'});
 assert.equal(navigations,0);
});
