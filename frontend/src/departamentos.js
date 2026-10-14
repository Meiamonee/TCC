import {
    Apple, Bath, Beef, Coffee, Cookie, Croissant, CupSoda, Lamp, Milk, Package, PawPrint, Snowflake, SprayCan, Wheat
} from 'lucide-react'

// Icone e cores de cada categoria padronizada pelo backend (services/normalizacao.js).
// `cor` e o par fundo/texto do icone; `tom` e a cor solida usada em destaques.
const DEPARTAMENTOS = {
    'Hortifruti': { icone: Apple, cor: 'bg-[#e4f2d5] text-[#3f7a1d]', tom: '#5b9a2c' },
    'Carnes e Peixes': { icone: Beef, cor: 'bg-[#fbe0dc] text-[#a3202c]', tom: '#c2413a' },
    'Frios e Laticínios': { icone: Milk, cor: 'bg-[#dfeef8] text-[#1f5f8b]', tom: '#3a86b8' },
    'Mercearia': { icone: Wheat, cor: 'bg-[#f6e7c8] text-[#8a5a0b]', tom: '#c08a2a' },
    'Bebidas': { icone: CupSoda, cor: 'bg-[#fde3cf] text-[#b04a0c]', tom: '#e0702a' },
    'Matinais e Sobremesas': { icone: Coffee, cor: 'bg-[#efe1d4] text-[#6b3f1f]', tom: '#8f5a35' },
    'Biscoitos e Chocolates': { icone: Cookie, cor: 'bg-[#f8dde6] text-[#9c2c55]', tom: '#c4507a' },
    'Padaria': { icone: Croissant, cor: 'bg-[#f7e6c5] text-[#94570f]', tom: '#c98a2e' },
    'Congelados': { icone: Snowflake, cor: 'bg-[#dcf1f3] text-[#13737d]', tom: '#2a9aa5' },
    'Limpeza': { icone: SprayCan, cor: 'bg-[#dbf0e8] text-[#13704f]', tom: '#2b9672' },
    'Higiene e Saúde': { icone: Bath, cor: 'bg-[#e9e2f5] text-[#5b3a94]', tom: '#7d5cb8' },
    'Pet': { icone: PawPrint, cor: 'bg-[#ebe6dc] text-[#5d5243]', tom: '#857761' },
    'Bazar e Utilidades': { icone: Lamp, cor: 'bg-[#e4e7ea] text-[#3f4a55]', tom: '#66727e' }
}

// Ordem de exibicao: alimentos primeiro, como nos sites de supermercado.
export const ORDEM_DEPARTAMENTOS = Object.keys(DEPARTAMENTOS)

export function estiloDepartamento(nome) {
    return DEPARTAMENTOS[nome] || { icone: Package, cor: 'bg-papel-200 text-tinta-700', tom: '#6b665b' }
}

export function ordenarDepartamentos(lista) {
    const posicao = nome => {
        const indice = ORDEM_DEPARTAMENTOS.indexOf(nome)
        return indice === -1 ? ORDEM_DEPARTAMENTOS.length : indice
    }
    return [...lista].sort((a, b) => posicao(a.nome) - posicao(b.nome))
}
