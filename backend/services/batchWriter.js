const fingerprint = p => JSON.stringify([p.name,p.price,p.department,p.priceBasis,p.priceScope,p.pricePackageQuantity,p.priceUnitRaw,p.disponivel,p.image,p.url,p.gtin,p.priceConditions]);
function createBatchWriter(write) {
    const saved = new Map();
    return async products => {
        const unique = new Map(products.map(p => [String(p.id),p]));
        const changed = [...unique.values()].filter(p => saved.get(String(p.id)) !== fingerprint(p));
        if (!changed.length) return null;
        try {
            const result = await write(changed);
            for (const p of changed) saved.set(String(p.id),fingerprint(p));
            return result;
        } catch (cause) {
            throw Object.assign(new Error('Falha ao gravar lote no MongoDB; progresso local preservado. '+cause.message),{code:'IMPORT_FAILED',cause});
        }
    };
}
module.exports = {createBatchWriter};
