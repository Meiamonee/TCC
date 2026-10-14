require('dotenv').config({quiet:true});
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const {syncCanonicalProducts} = require('../services/canonicalProducts');

(async () => {
    await connectDB();
    const result = await syncCanonicalProducts();
    const Produto = require('../models/Produto');
    await Produto.createIndexes();
    console.log(`Produtos canônicos: ${result.canonicalProducts}`);
    console.log(`Ofertas analisadas: ${result.offers}`);
    console.log(`Vínculos atualizados: ${result.changed}`);
    console.log('Índices de catálogo e comparação verificados.');
})().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
}).finally(() => mongoose.disconnect());
