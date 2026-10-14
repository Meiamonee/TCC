import markets from '../../../config/supermarkets.json';

export const supermarkets = markets
    .filter(m => m.collectionEnabled !== false)
    .map(({ slug, nome, logo, url }) => ({ id: slug, name: nome, logo, url }));
export function getSupermarket(slug) {
    return supermarkets.find(market => market.id === slug) || { id: slug, name: slug || 'Supermercado' };
}
