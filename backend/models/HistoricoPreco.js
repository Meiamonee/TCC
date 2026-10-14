const mongoose = require('mongoose');

// Um registro por mudanca de preco de um produto, para acompanhar a variacao no tempo.
const historicoPrecoSchema = new mongoose.Schema({
    produto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Produto',
        required: true
    },
    supermercado: {
        type: String,
        required: true
    },
    preco: {
        type: Number,
        required: true
    },
    data: {
        type: Date,
        default: Date.now
    }
}, {
    versionKey: false
});

historicoPrecoSchema.index({ produto: 1, data: 1 });

module.exports = mongoose.model('HistoricoPreco', historicoPrecoSchema);
