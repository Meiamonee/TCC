const path=require('node:path');
const fs=require('node:fs');
require('../backend/node_modules/dotenv').config({path:path.join(__dirname,'../backend/.env'),quiet:true});
const markets=require('../config/supermarkets.json');
const {parseOptions}=require('./cli');
const {executarPipelineScraping}=require('../backend/services/scrapingPipeline');
const {spawnSync}=require('node:child_process');
const mongoose=require('../backend/node_modules/mongoose');
const [command='status',slug='todos',...args]=process.argv.slice(2);
const selected=markets.filter(m=>slug==='todos'||m.slug===slug);
(async()=>{
    if(!selected.length)throw new Error('Mercado desconhecido');
    if(command==='parar'||command==='retomar'){
        for(const m of selected){const file=path.join(__dirname,'..',m.directory,'.stop');if(command==='parar')fs.writeFileSync(file,'Parada solicitada\n');else if(fs.existsSync(file))fs.unlinkSync(file);}
        const global=path.join(__dirname,'.stop');
        if(command==='parar'&&slug==='todos')fs.writeFileSync(global,'Parada solicitada\n');
        if(command==='retomar'&&fs.existsSync(global))fs.unlinkSync(global);
        console.log(command==='parar'?'Parada solicitada; aguarde o lote atual salvar.':'Paradas removidas; execute piloto ou coletar com o mesmo escopo para retomar.');
        return;
    }
    if(command==='status'){
        for(const m of selected){console.log(m.slug,m.collectionEnabled===false?m.disabledReason:'');const dir=path.join(__dirname,'..',m.directory);for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.checkpoint.json'))){const s=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));console.log(name,JSON.stringify({complete:s.complete,updatedAt:s.updatedAt,currentListing:s.currentListing,nextNavigationAt:s.nextNavigationAt,products:new Set(Object.values(s.listings).flatMap(l=>l.items||[]).map(p=>p.id)).size,error:s.error}));}}return;
    }
    if(!['piloto','coletar'].includes(command))throw new Error('Use status, parar, retomar, piloto ou coletar.');
    const report=await executarPipelineScraping({...parseOptions(args),mercado:slug,pilot:command==='piloto'});
    console.log(JSON.stringify(report,null,2));
    const complete=command==='coletar'&&Object.values(report.progress).every(item=>item.complete||item.skipped);
    if(complete){
        console.log('Coleta completa; iniciando reconhecimento de marcas e auditoria do comparador.');
        const maintenance=spawnSync(process.execPath,[path.join(__dirname,'../backend/scripts/maintainCatalog.js')],{cwd:path.join(__dirname,'..'),stdio:'inherit'});
        if(maintenance.error)throw maintenance.error;
        if(maintenance.status!==0)throw new Error(`Manutenção do catálogo falhou com código ${maintenance.status}.`);
    }
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>mongoose.disconnect());
