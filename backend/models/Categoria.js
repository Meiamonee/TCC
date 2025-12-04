const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
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
    descricao: String,
    // Mapeia nomes de categorias de diferentes supermercados para esta categoria normalizada
    mapeamentos: [{
        supermercado: {
            type: String,
            required: true
        },
        nomeOriginal: {
            type: String,
            required: true
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Categoria', categoriaSchema);
