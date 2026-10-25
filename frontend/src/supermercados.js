// Identidade visual de cada supermercado: logo (em /public/logos, tirada do cabecalho do site do mercado),
// cor do fundo onde a logo aparece no site e cores usadas no SuperPreço.
const MERCADOS = {
    supervale: { nome: 'SuperVale', logo: '/logos/supervale.png', fundoLogo: '#ffffff', escalaLogo: 1.35, cor: 'bg-[#fde8e6] text-[#b42318]', barra: '#d6402f' },
    vilasul: { nome: 'Vila Sul', logo: '/logos/vilasul.png', fundoLogo: '#000915', escalaLogo: 1.7, cor: 'bg-[#e3ecfb] text-[#1f4fa3]', barra: '#2f62c4' },
    sanmichel: { nome: 'San Michel', logo: '/logos/sanmichel.png', fundoLogo: '#ffffff', escalaLogo: 1.45, cor: 'bg-[#fff0dc] text-[#b54708]', barra: '#e07b12' },
    pedrilho: { nome: 'Pedrilho', logo: '/logos/pedrilho.jpeg', fundoLogo: '#ffffff', escalaLogo: 1.05, cor: 'bg-feira-100 text-feira-700', barra: '#1f7a45' }
}

// Os supermercados acompanhados, na ordem usada nas telas.
export const SUPERMERCADOS = Object.entries(MERCADOS).map(([slug, mercado]) => ({ slug, nome: mercado.nome }))

export function logoDoSupermercado(slug) {
    return MERCADOS[slug]?.logo || null
}

// As logos dos sites tem margens diferentes; a escala compensa para todas parecerem do mesmo tamanho.
export function escalaDaLogo(slug) {
    return MERCADOS[slug]?.escalaLogo || 1
}

export function fundoDaLogo(slug) {
    return MERCADOS[slug]?.fundoLogo || '#ffffff'
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
