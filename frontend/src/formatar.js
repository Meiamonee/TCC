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

// "14/10/2026 às 05:02"
export function formatarDataCompleta(data) {
    if (!data) return '--'
    const d = new Date(data)
    if (Number.isNaN(d.getTime())) return '--'
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

// "há 3 horas", "em 5 horas"
export function formatarTempoRelativo(data, agora = Date.now()) {
    if (!data) return ''
    const diferencaMin = Math.round((new Date(data).getTime() - agora) / 60000)
    const absoluto = Math.abs(diferencaMin)
    const [valor, unidade] = absoluto < 60
        ? [absoluto, absoluto === 1 ? 'minuto' : 'minutos']
        : absoluto < 60 * 48
            ? [Math.round(absoluto / 60), Math.round(absoluto / 60) === 1 ? 'hora' : 'horas']
            : [Math.round(absoluto / 1440), 'dias']
    return diferencaMin < 0 ? `há ${valor} ${unidade}` : `em ${valor} ${unidade}`
}

// "R$ 5,50/L"
export function formatarPrecoUnidade(produto) {
    if (!produto.unitPrice || !produto.unitPriceLabel) return null
    return `${formatarMoeda(produto.unitPrice)}/${produto.unitPriceLabel}`
}
