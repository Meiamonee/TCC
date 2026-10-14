const mongoose = require('mongoose');

const produtoSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true,
        index: true
    },
    // Nome sem acentos e em minusculas, usado na busca textual
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
    // Categoria padronizada entre os mercados (ex: "Carnes e Peixes")
    categoria: {
        type: String,
        required: true,
        index: true
    },
    categoriaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categoria'
    },
    // Departamento como aparece no site do mercado (ex: "Açougue")
    departamentoOriginal: String,
    subcategoria: {
        type: String,
        default: null
    },
    alimento: {
        type: Boolean,
        default: true,
        index: true
    },
    preco: {
        type: Number,
        required: true,
        index: true
    },
    precoOriginal: {
        type: String // Como veio do scraper (ex: "R$ 8,99")
    },
    // Preco "de" exibido riscado quando o produto esta em oferta
    precoAnterior: {
        type: Number,
        default: null
    },
    // Unidade de venda exibida pelo site (ex: "un", "kg", "pt")
    unidade: {
        type: String,
        default: null
    },
    // Tamanho da embalagem informado pelo site junto ao preco (ex: "700g" em "R$ 48,93 /700g")
    embalagem: {
        type: String,
        default: null
    },
    // Etiqueta promocional exibida no card (ex: "Clube SuperVale")
    etiqueta: {
        type: String,
        default: null
    },
    // Campos derivados para comparacao (ver services/normalizacao.js)
    tokens: {
        type: [String],
        index: true
    },
    variantes: [String],
    medida: {
        type: String,
        enum: ['massa', 'volume', 'comprimento', 'unidade', null],
        default: null
    },
    quantidadeBase: {
        type: Number,
        default: null
    },
    precoPorUnidade: {
        type: Number,
        default: null
    },
    unidadeMedida: {
        type: String,
        default: null
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
        default: true,
        index: true
    },
    // Primeira vez em que o produto foi coletado
    dataCaptura: {
        type: Date,
        default: Date.now,
        index: true
    },
    // Momento da coleta mais recente do preco no site do supermercado
    dataColeta: {
        type: Date,
        default: Date.now
    },
    ultimaAtualizacao: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

produtoSchema.index({ supermercado: 1, produtoId: 1 }, { unique: true });
produtoSchema.index({ supermercado: 1, categoria: 1 });
produtoSchema.index({ disponivel: 1, categoria: 1, preco: 1 });

// Nome sem acentos, pontuacao e espacos extras, para busca
produtoSchema.statics.normalizarNome = function (nome) {
    return String(nome || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

module.exports = mongoose.model('Produto', produtoSchema);
