// Logos disponiveis em /public/logos. Mercados sem logo exibem as iniciais do nome.
const LOGOS = {
    supervale: '/logos/supervale.png'
}

export function logoDoSupermercado(slug) {
    return LOGOS[slug] || null
}

export function iniciais(nome = '') {
    return nome
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => parte[0].toUpperCase())
        .join('')
}
