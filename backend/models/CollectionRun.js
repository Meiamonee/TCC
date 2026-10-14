const mongoose = require('mongoose');

const collectionRunSchema = new mongoose.Schema({
    trigger: {
        type: String,
        enum: ['scheduled', 'manual'],
        required: true
    },
    market: {
        type: String,
        required: true,
        default: 'todos'
    },
    status: {
        type: String,
        enum: ['queued', 'running', 'completed', 'partial', 'failed', 'interrupted', 'skipped'],
        required: true,
        default: 'queued'
    },
    requestedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    startedAt: Date,
    finishedAt: Date,
    durationMs: Number,
    summary: mongoose.Schema.Types.Mixed,
    errorCode: String,
    errorMessage: String,
    processId: Number
}, {
    timestamps: true,
    collection: 'collectionruns'
});

collectionRunSchema.index({ createdAt: -1 });
collectionRunSchema.index({ status: 1, startedAt: -1 });

module.exports = mongoose.model('CollectionRun', collectionRunSchema);
