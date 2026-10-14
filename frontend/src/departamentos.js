import {
    Apple, Bath, Beef, Coffee, Cookie, Croissant, CupSoda, Lamp, Milk, Package, PawPrint, Snowflake, SprayCan, Wheat
} from 'lucide-react'

// Icone e cor de cada categoria padronizada pelo backend (services/normalizacao.js).
const DEPARTAMENTOS = {
    'Hortifruti': { icone: Apple, cor: 'bg-lime-100 text-lime-700' },
    'Carnes e Peixes': { icone: Beef, cor: 'bg-red-100 text-red-700' },
    'Frios e Laticínios': { icone: Milk, cor: 'bg-sky-100 text-sky-700' },
    'Mercearia': { icone: Wheat, cor: 'bg-amber-100 text-amber-700' },
    'Bebidas': { icone: CupSoda, cor: 'bg-orange-100 text-orange-700' },
    'Matinais e Sobremesas': { icone: Coffee, cor: 'bg-yellow-100 text-yellow-800' },
    'Biscoitos e Chocolates': { icone: Cookie, cor: 'bg-rose-100 text-rose-700' },
    'Padaria': { icone: Croissant, cor: 'bg-orange-100 text-orange-800' },
    'Congelados': { icone: Snowflake, cor: 'bg-cyan-100 text-cyan-700' },
    'Limpeza': { icone: SprayCan, cor: 'bg-teal-100 text-teal-700' },
    'Higiene e Saúde': { icone: Bath, cor: 'bg-violet-100 text-violet-700' },
    'Pet': { icone: PawPrint, cor: 'bg-stone-200 text-stone-700' },
    'Bazar e Utilidades': { icone: Lamp, cor: 'bg-slate-200 text-slate-700' }
}

// Ordem de exibicao: alimentos primeiro, como nos sites de supermercado.
export const ORDEM_DEPARTAMENTOS = Object.keys(DEPARTAMENTOS)

export function estiloDepartamento(nome) {
    return DEPARTAMENTOS[nome] || { icone: Package, cor: 'bg-zinc-100 text-zinc-600' }
}

export function ordenarDepartamentos(lista) {
    const posicao = nome => {
        const indice = ORDEM_DEPARTAMENTOS.indexOf(nome)
        return indice === -1 ? ORDEM_DEPARTAMENTOS.length : indice
    }
    return [...lista].sort((a, b) => posicao(a.nome) - posicao(b.nome))
}
