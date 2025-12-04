const mongoose = require('mongoose');

const supermercadoSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true,
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    url: {
        type: String,
        required: true
    },
    ativo: {
        type: Boolean,
        default: true
    },
    ultimaAtualizacao: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Supermercado', supermercadoSchema);
