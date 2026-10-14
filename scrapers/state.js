const fs = require('node:fs');
const path = require('node:path');
function saveJson(file,value) { fs.mkdirSync(path.dirname(file),{recursive:true}); const tmp=file+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n'); fs.renameSync(tmp,file); }
function acquireLock(file) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  if(fs.existsSync(file)) {
    const previous=JSON.parse(fs.readFileSync(file,'utf8'));
    let alive=true; try {process.kill(previous.pid,0);} catch(e) {if(e.code==='ESRCH') alive=false;}
    if(alive) throw new Error('Outra coleta ja esta em execucao: '+file);
    fs.unlinkSync(file);
  }
  const fd=fs.openSync(file,'wx'); fs.writeFileSync(fd,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()})); fs.closeSync(fd);
  return ()=>{if(fs.existsSync(file) && JSON.parse(fs.readFileSync(file,'utf8')).pid===process.pid) fs.unlinkSync(file);};
}
function openCheckpoint(file,scope,{fresh=false,resumeOld=false,maxAgeMs=86400000}={}) {
  let state={version:1,scope,startedAt:new Date().toISOString(),complete:false,listings:{},categories:{}};
  if(!fresh && fs.existsSync(file)) {
    const old=JSON.parse(fs.readFileSync(file,'utf8'));
    if(!old.complete) {
      if(old.version!==1 || JSON.stringify(old.scope)!==JSON.stringify(scope)) throw new Error('Checkpoint de outro escopo. Use --fresh ou outro --output.');
      if(Date.now()-Date.parse(old.startedAt)>maxAgeMs) {
        if(!resumeOld) throw new Error('Checkpoint com mais de 24h. Use --fresh para atualizar os precos, ou --resume para continuar com as datas originais.');
        old.resumedAcrossDays=true;
      }
      state=old;
    }
  }
  return {state,save(){state.updatedAt=new Date().toISOString();saveJson(file,state);},products(){return [...new Map(Object.values(state.listings).flatMap(l=>l.items || []).map(p=>[p.id,p])).values()];}};
}
module.exports={saveJson,acquireLock,openCheckpoint};
