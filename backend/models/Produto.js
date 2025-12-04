const mongoose = require('mongoose');

const produtoSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true,
        index: true
    },
    // Nome normalizado para comparação entre supermercados
    nomeNormalizado: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },
    supermercado: {
        type: String,
        required: true,
        index: true
    },
    supermercadoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supermercado',
        required: true
    },
    categoria: {
        type: String,
        required: true,
        index: true
    },
    categoriaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categoria'
    },
    preco: {
        type: Number,
        required: true,
        index: true
    },
    precoOriginal: {
        type: String // Como veio do scraper (ex: "R$ 8,99")
    },
    imagem: String,
    url: {
        type: String,
        required: true
    },
    produtoId: {
        type: String, // ID do produto no site original
        required: true
    },
    disponivel: {
        type: Boolean,
        default: true
    },
    dataCaptura: {
        type: Date,
        default: Date.now,
        index: true
    },
    ultimaAtualizacao: {
        type: Date,
        default: Date.now
    },
    // Histórico de preços para rastrear variações
    historico: [{
        preco: Number,
        data: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Índice composto para busca eficiente por categoria e preço
produtoSchema.index({ categoriaId: 1, preco: 1 });
produtoSchema.index({ supermercado: 1, categoria: 1 });

// Índice de texto para busca por nome
produtoSchema.index({ nomeNormalizado: 'text', nome: 'text' });

// Método para normalizar nome do produto
produtoSchema.statics.normalizarNome = function (nome) {
    return nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^\w\s]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, ' ') // Remove espaços extras
        .trim();
};

// Método para comparar preços de produtos similares
produtoSchema.statics.compararPrecos = async function (nomeNormalizado) {
    return this.find({
        nomeNormalizado: new RegExp(nomeNormalizado, 'i'),
        disponivel: true
    })
        .sort({ preco: 1 })
        .populate('supermercadoId')
        .exec();
};

module.exports = mongoose.model('Produto', produtoSchema);
