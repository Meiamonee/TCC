// Identidade visual de cada supermercado: logo (quando houver em /public/logos) e cores.
const MERCADOS = {
    supervale: { logo: '/logos/supervale.png', cor: 'bg-[#fde8e6] text-[#b42318]', barra: '#d6402f' },
    vilasul: { logo: null, cor: 'bg-[#e3ecfb] text-[#1f4fa3]', barra: '#2f62c4' },
    sanmichel: { logo: null, cor: 'bg-[#fff0dc] text-[#b54708]', barra: '#e07b12' },
    pedrilho: { logo: null, cor: 'bg-feira-100 text-feira-700', barra: '#1f7a45' }
}

export function logoDoSupermercado(slug) {
    return MERCADOS[slug]?.logo || null
}

export function corDoSupermercado(slug) {
    return MERCADOS[slug]?.cor || 'bg-papel-200 text-tinta-700'
}

// Cor solida usada em barras e marcadores de graficos.
export function corBarraDoSupermercado(slug) {
    return MERCADOS[slug]?.barra || '#6b665b'
}

export function iniciais(nome = '') {
    return nome
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => parte[0].toUpperCase())
        .join('')
}
