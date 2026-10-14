const mongoose = require('mongoose');

const produtoSchema = new mongoose.Schema({
    canonicalProductId: {type: mongoose.Schema.Types.ObjectId, ref: 'CanonicalProduct', index:true},
    promotion: {
        type: {type:String, enum:['bundle','club','cashback','discount']},
        label: String,
        text: String,
        requiredQuantity: Number,
        paidQuantity: Number,
        promotionalPrice: Number
    },
    categoriaOriginal: String,
    priceBasis: { type: String, enum: ['kg', 'L', 'unit', 'unknown'], default: 'unknown' },
    priceScope: { type: String, enum: ['PER_KG', 'PER_L', 'TOTAL', 'UNKNOWN'], default: 'UNKNOWN' },
    pricePackageQuantity: {
        value: Number,
        unit: {type: String, enum: ['kg', 'L', 'un']}
    },
    priceUnitRaw: String,
    priceBasisSource: {type: String, enum: ['card', 'detail', 'name', 'platform-default', 'legacy', 'unknown'], default: 'unknown'},
    priceBasisConfidence: {type: Number, min: 0, max: 100, default: 0},
    gtin: String,
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
    comparisonKey: {type: String, index: true},
    similarityKey: String,
    alternativeFamilyKey: String,
    unitPrice: {
        type: {
            value: Number,
            unit: {type: String, enum: ['kg', 'L', 'un']}
        },
        default: null,
        _id: false
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

// Índices alinhados às consultas públicas do catálogo.
produtoSchema.index(
    { disponivel: 1, nomeNormalizado: 1, _id: 1, supermercado: 1 },
    { name: 'catalog_available_name' }
);
produtoSchema.index(
    { disponivel: 1, preco: 1, _id: 1, supermercado: 1 },
    { name: 'catalog_available_price' }
);
produtoSchema.index(
    { categoria: 1, disponivel: 1, nomeNormalizado: 1, _id: 1, supermercado: 1 },
    { name: 'catalog_category_name' }
);
produtoSchema.index(
    { supermercado: 1, disponivel: 1, nomeNormalizado: 1, _id: 1 },
    { name: 'catalog_market_name' }
);

// Chaves calculadas na importação evitam varrer uma categoria inteira na comparação.
produtoSchema.index(
    { similarityKey: 1, disponivel: 1, 'unitPrice.unit': 1, 'unitPrice.value': 1 },
    { name: 'comparison_similar_v2' }
);
produtoSchema.index(
    { alternativeFamilyKey: 1, disponivel: 1, 'unitPrice.unit': 1, 'unitPrice.value': 1 },
    { name: 'comparison_alternative_v2' }
);
produtoSchema.index(
    { canonicalProductId: 1, supermercado: 1, disponivel: 1 },
    { name: 'comparison_canonical' }
);

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
