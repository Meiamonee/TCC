const Produto = require('../models/Produto');
const CanonicalProduct = require('../models/CanonicalProduct');

async function syncCanonicalProducts(filter = {}) {
    const {canonicalSourceKey, comparisonKey, comparisonMetadata, productProfile, validGtin} = await import('../../shared/comparison.mjs');
    const offers = await Produto.find(filter).select('_id nome categoria priceBasis preco promotion gtin canonicalProductId comparisonKey similarityKey alternativeFamilyKey unitPrice').lean();
    const records = new Map();
    const assignments = [];
    for (const offer of offers) {
        const product = {
            name: offer.nome,
            department: offer.categoria,
            priceBasis: offer.priceBasis,
            priceNumber: offer.preco,
            promotion: offer.promotion,
            gtin: offer.gtin
        };
        const profile = productProfile(product);
        const sourceKey = canonicalSourceKey(product) || `offer:${offer._id}`;
        const relationMetadata = comparisonMetadata(product);
        const candidateKey = comparisonKey(product);
        if (!records.has(sourceKey)) records.set(sourceKey, {sourceKey, name:offer.nome, brand:profile.brand,
            category:profile.category, type:profile.type, quantity:profile.quantity, variant:profile.variant,
            packaging:profile.packaging, gtin:validGtin(offer.gtin) ? offer.gtin : null});
        assignments.push({
            offerId: offer._id,
            previous: offer.canonicalProductId && String(offer.canonicalProductId),
            sourceKey,
            candidateKey,
            relationMetadata,
            metadataChanged: offer.comparisonKey !== candidateKey
                || offer.similarityKey !== relationMetadata.similarityKey
                || offer.alternativeFamilyKey !== relationMetadata.alternativeFamilyKey
                || Number(offer.unitPrice?.value || 0) !== Number(relationMetadata.unitPrice?.value || 0)
                || (offer.unitPrice?.unit || null) !== (relationMetadata.unitPrice?.unit || null)
        });
    }
    const rows = [...records.values()];
    for (let start = 0; start < rows.length; start += 500) {
        await CanonicalProduct.bulkWrite(rows.slice(start, start + 500).map(record => ({
            updateOne:{filter:{sourceKey:record.sourceKey}, update:{$set:record}, upsert:true}
        })), {ordered:false});
    }
    const references = await CanonicalProduct.find({sourceKey:{$in:rows.map(row => row.sourceKey)}}).select('_id sourceKey').lean();
    const ids = new Map(references.map(reference => [reference.sourceKey, reference._id]));
    const updates = assignments
        .filter(row => row.previous !== String(ids.get(row.sourceKey)) || row.metadataChanged)
        .map(row => ({
            updateOne:{
                filter:{_id:row.offerId},
                update:{
                    $set:{
                        canonicalProductId:ids.get(row.sourceKey),
                        comparisonKey:row.candidateKey,
                        similarityKey:row.relationMetadata.similarityKey,
                        alternativeFamilyKey:row.relationMetadata.alternativeFamilyKey,
                        unitPrice:row.relationMetadata.unitPrice
                    },
                    $unset:{referenceId:'', referenceReview:''}
                }
            }
        }));
    for (let start = 0; start < updates.length; start += 500) {
        await Produto.bulkWrite(updates.slice(start, start + 500), {ordered:false, timestamps:false});
    }
    const counts = references.length ? await Produto.aggregate([
        {$match:{canonicalProductId:{$in:references.map(reference => reference._id)}}},
        {$group:{_id:'$canonicalProductId', count:{$sum:1}}}
    ]) : [];
    if (counts.length) await CanonicalProduct.bulkWrite(counts.map(row => ({
        updateOne:{filter:{_id:row._id}, update:{$set:{offerCount:row.count}}}
    })), {ordered:false});
    return {offers:offers.length, canonicalProducts:records.size, changed:updates.length};
}

module.exports = {syncCanonicalProducts};
