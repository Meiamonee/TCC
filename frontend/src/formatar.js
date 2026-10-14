const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarMoeda(valor) {
    return typeof valor === 'number' ? moeda.format(valor) : '--'
}

// "14/10 às 05:02"
export function formatarDataColeta(data) {
    if (!data) return null
    const d = new Date(data)
    if (Number.isNaN(d.getTime())) return null
    const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `${dia} às ${hora}`
}

// "R$ 5,50/L"
export function formatarPrecoUnidade(produto) {
    if (!produto.unitPrice || !produto.unitPriceLabel) return null
    return `${formatarMoeda(produto.unitPrice)}/${produto.unitPriceLabel}`
}
