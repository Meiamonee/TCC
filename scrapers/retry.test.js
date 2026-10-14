const test=require('node:test');const assert=require('node:assert/strict');
const {retryCategory}=require('../scrapers/retry');
test('retries twice with increasing pauses and returns successful result',async()=>{
 let attempts=0;const waits=[];const result=await retryCategory(async()=>{if(++attempts<3)throw new Error('timeout');return 42;},async n=>waits.push(n));
 assert.equal(result,42);assert.deepEqual(waits,[2,3]);
});
test('exhaustion keeps original error and limits attempts',async()=>{
 let attempts=0;const error=new Error('timeout');await assert.rejects(retryCategory(async()=>{attempts++;throw error;},async()=>{}),e=>e===error);assert.equal(attempts,3);
});
test('stop, blocked, database and wrong store errors never retry',async()=>{
 for(const code of ['STOPPED','BLOCKED','IMPORT_FAILED','STORE_MISMATCH']){let attempts=0;await assert.rejects(retryCategory(async()=>{attempts++;throw Object.assign(new Error(code),{code});},async()=>assert.fail('must not wait')),e=>e.code===code);assert.equal(attempts,1);}
});
test('browser session failure recreates the driver before the category retries',async()=>{
 let browser=1;const used=[];
 const result=await retryCategory(async()=>{
   used.push(browser);
   if(browser===1)throw new Error('invalid session id');
   return 'ok';
 },async()=>{},()=>{},async()=>{browser=2;});
 assert.equal(result,'ok');assert.deepEqual(used,[1,2]);
});
test('repeated lost browser session stops the market',async()=>{
 let retries=0;
 await assert.rejects(retryCategory(async()=>{throw new Error('invalid session id');},async()=>{},()=>{},async()=>{retries++;}),e=>e.code==='BROWSER_FAILED');
 assert.equal(retries,2);
});
