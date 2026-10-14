require('dotenv').config({quiet:true});
const mongoose=require('mongoose');const connect=require('../config/database');const Produto=require('../models/Produto');const Categoria=require('../models/Categoria');const {categoryOf}=require('../services/normalization');
(async()=>{await connect();const rows=await Produto.find({}).select('_id categoria categoriaOriginal').lean();let count=0;
for(const old of [...new Set(rows.map(p=>p.categoria))]){const name=categoryOf(old);const slug=name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w\s-]/g,'').replace(/\s+/g,'-');const cat=await Categoria.findOneAndUpdate({slug},{$set:{nome:name}},{upsert:true,new:true});
for(const p of rows.filter(p=>p.categoria===old)){await Produto.updateOne({_id:p._id},{$set:{categoria:name,categoriaId:cat._id,categoriaOriginal:p.categoriaOriginal||old}},{timestamps:false});count++;}}
console.log(`Categorias normalizadas em ${count} registros; preços e datas de coleta preservados.`);
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>mongoose.disconnect());
