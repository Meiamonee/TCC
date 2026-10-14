// Um total anunciado só é aceito quando todos os cartões têm ID.
// Duplicatas comprovadas no DOM não são novos produtos no banco.
function completionEvidence(state, seenCount) {
    if (state.empty) return { complete: true, reason: 'empty' };
    if (state.total === null) return { complete: false };
    if (seenCount >= state.total) return { complete: true, reason: 'unique-total' };
    const duplicates = state.duplicateIds || [];
    if (state.infinite && state.cardCount === state.total && state.identifiedCardCount === state.cardCount &&
        duplicates.length > 0 && state.ids.length + duplicates.length === state.cardCount && seenCount === state.ids.length) {
        return { complete: true, reason: 'duplicate-cards', total: state.total, unique: seenCount, duplicates };
    }
    return { complete: false };
}
module.exports = { completionEvidence };
