const mongoose = require('mongoose');

const canonicalProductSchema = new mongoose.Schema({
    sourceKey: {type:String, required:true, unique:true},
    name: {type:String, required:true},
    brand: String,
    category: String,
    type: String,
    quantity: mongoose.Schema.Types.Mixed,
    variant: [String],
    packaging: String,
    gtin: String,
    offerCount: {type:Number, default:1}
}, {timestamps:true});

module.exports = mongoose.model('CanonicalProduct', canonicalProductSchema, 'productreferences');
