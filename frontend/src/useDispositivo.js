import { useSyncExternalStore } from 'react'

// Faixas de largura de cada versao do site (as mesmas dos prefixos sm: e lg: do Tailwind).
const CONSULTA_TABLET = '(min-width: 640px)'
const CONSULTA_DESKTOP = '(min-width: 1024px)'

function lerDispositivo() {
    if (typeof window === 'undefined' || !window.matchMedia) return 'desktop'
    if (window.matchMedia(CONSULTA_DESKTOP).matches) return 'desktop'
    if (window.matchMedia(CONSULTA_TABLET).matches) return 'tablet'
    return 'mobile'
}

function assinar(aoMudar) {
    const consultas = [CONSULTA_TABLET, CONSULTA_DESKTOP].map(consulta => window.matchMedia(consulta))
    consultas.forEach(consulta => consulta.addEventListener('change', aoMudar))
    return () => consultas.forEach(consulta => consulta.removeEventListener('change', aoMudar))
}

// Retorna 'mobile', 'tablet' ou 'desktop' e atualiza quando a tela muda de faixa.
export function useDispositivo() {
    return useSyncExternalStore(assinar, lerDispositivo, () => 'desktop')
}
