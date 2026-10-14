// Identidade visual de cada supermercado: logo (quando houver em /public/logos) e cor do selo.
const MERCADOS = {
    supervale: { logo: '/logos/supervale.png', cor: 'bg-red-600 text-white' },
    vilasul: { logo: null, cor: 'bg-blue-700 text-white' },
    sanmichel: { logo: null, cor: 'bg-orange-500 text-white' },
    pedrilho: { logo: null, cor: 'bg-emerald-700 text-white' }
}

export function logoDoSupermercado(slug) {
    return MERCADOS[slug]?.logo || null
}

export function corDoSupermercado(slug) {
    return MERCADOS[slug]?.cor || 'bg-zinc-700 text-white'
}

export function iniciais(nome = '') {
    return nome
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => parte[0].toUpperCase())
        .join('')
}
