const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {createPacer}=require('./pacing');const {openCheckpoint,acquireLock}=require('./state');
test('navegacao normal nao espera; falha tem apenas recuo curto e permite parada',async()=>{
 let elapsed=0;const pause=createPacer({retryDelayMs:5000},{sleep:async ms=>{elapsed+=ms;}});
 assert.equal(await pause(),0);assert.equal(await pause(2),10000);assert.equal(elapsed,10000);
 await assert.rejects(createPacer({shouldStop:()=>true},{sleep:async()=>{}}),{code:'STOPPED'});
 assert.throws(()=>createPacer({retryDelayMs:-1}));
});
test('checkpoint retoma lotes, deduplica e rejeita escopo ou data antigos; lock impede concorrencia',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tcc-checkpoint-'));const file=path.join(dir,'checkpoint.json');
 try{const state=openCheckpoint(file,{market:'teste'});state.state.listings.a={items:[{id:'1',price:1}],complete:true};state.state.listings.b={items:[{id:'1',price:2},{id:'2'}],complete:false};state.save();
 const resumed=openCheckpoint(file,{market:'teste'});assert.equal(resumed.products().length,2);assert.equal(resumed.products()[0].price,2);assert.equal(resumed.state.listings.a.complete,true);
 assert.throws(()=>openCheckpoint(file,{market:'outro'}),/escopo/);
 resumed.state.startedAt='2020-01-01';resumed.save();assert.throws(()=>openCheckpoint(file,{market:'teste'}),/24h/);
 const late=openCheckpoint(file,{market:'teste'},{resumeOld:true});assert.equal(late.products().length,2);assert.equal(late.state.resumedAcrossDays,true);
 assert.equal(openCheckpoint(file,{market:'novo'},{fresh:true}).products().length,0);
 const lock=path.join(dir,'lock');const unlock=acquireLock(lock);assert.throws(()=>acquireLock(lock),/execucao/);unlock();acquireLock(lock)();
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

const {completionEvidence}=require('./completion');
test('fim exige total real ou duplicata comprovada, nunca tolerancia de um item',()=>{
 const s={total:3,ids:['a','b'],cardCount:3,identifiedCardCount:3,duplicateIds:['b'],infinite:true};
 assert.equal(completionEvidence(s,2).reason,'duplicate-cards');
 for(const change of [{cardCount:2},{identifiedCardCount:2},{duplicateIds:[]},{infinite:false},{total:4}])assert.equal(completionEvidence({...s,...change},2).complete,false);
 assert.equal(completionEvidence({total:583,ids:Array(582),infinite:true},582).complete,false);
});

test('coletor termina com duplicata comprovada e salva um produto por ID',async()=>{
 const {scrapeListing}=require('./catalog');
 const states=[
  {ids:['a'],items:[{id:'a',price:'R$ 1,00'}],total:3,cardCount:1,identifiedCardCount:1,duplicateIds:[],infinite:true},
  {ids:['a','b'],items:[{id:'a',price:'R$ 1,00'},{id:'b',price:'R$ 2,00'},{id:'b',price:'R$ 2,00'}],total:3,cardCount:3,identifiedCardCount:3,duplicateIds:['b'],infinite:true}
 ];
 const driver={wait:async()=>states.shift(),executeScript:async()=>'scroll'};
 const result=await scrapeListing(driver,{platform:'vipcommerce'},{},async()=>{});
 assert.equal(result.complete,true);assert.equal(result.items.length,2);assert.equal(result.completion.reason,'duplicate-cards');
});
