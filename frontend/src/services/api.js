const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        cache: 'no-store',
        ...options,
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers
        }
    })

    if (!response.ok) {
        const corpo = await response.json().catch(() => ({}))
        throw new Error(corpo.error || `Erro ${response.status} ao chamar ${path}`)
    }

    return response.json()
}

export function fetchProducts({ search, categoria, supermercado, alimentos, ordenar, page, limit = 40 } = {}) {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (categoria) params.set('categoria', categoria)
    if (supermercado) params.set('supermercado', supermercado)
    if (alimentos) params.set('alimentos', 'true')
    if (ordenar) params.set('ordenar', ordenar)
    params.set('page', String(page || 1))
    params.set('limit', String(limit))
    return request(`/produtos?${params}`)
}

export function fetchCategorias(supermercado) {
    return request(`/categorias${supermercado ? `?supermercado=${encodeURIComponent(supermercado)}` : ''}`)
}

export function fetchSupermercados() {
    return request('/supermercados')
}

export function fetchComparacao(id) {
    return request(`/produtos/${id}/comparacao`)
}

export function fetchHistorico(id) {
    return request(`/produtos/${id}/historico`)
}

export function fetchCestaBasica() {
    return request('/cesta-basica')
}

export function cotarLista(itens) {
    return request('/lista/cotacao', {
        method: 'POST',
        body: JSON.stringify({ itens })
    })
}
