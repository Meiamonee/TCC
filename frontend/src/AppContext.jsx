import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { fetchCategorias, fetchSupermercados } from './services/api'
import { ordenarDepartamentos } from './departamentos'
import { useListaCompras } from './useListaCompras'

const AppContext = createContext(null)

// Dados compartilhados por todas as paginas: supermercados, departamentos e lista de compras.
export function AppProvider({ children }) {
    const [supermercados, setSupermercados] = useState([])
    const [departamentos, setDepartamentos] = useState([])
    const [aviso, setAviso] = useState(null)
    const timerAviso = useRef(null)
    const lista = useListaCompras()

    useEffect(() => {
        let cancelado = false
        Promise.all([fetchSupermercados(), fetchCategorias()])
            .then(([mercados, categorias]) => {
                if (cancelado) return
                setSupermercados(mercados)
                setDepartamentos(ordenarDepartamentos(categorias))
            })
            .catch(() => {})
        return () => { cancelado = true }
    }, [])

    const mostrarAviso = useCallback((texto) => {
        setAviso(texto)
        window.clearTimeout(timerAviso.current)
        timerAviso.current = window.setTimeout(() => setAviso(null), 2500)
    }, [])

    const adicionarNaLista = useCallback((produto) => {
        lista.adicionar(produto)
        mostrarAviso(`"${produto.name}" adicionado à lista`)
    }, [lista, mostrarAviso])

    const valor = useMemo(() => {
        const datas = supermercados.map(item => new Date(item.ultimaColeta).getTime()).filter(Boolean)
        return {
            supermercados,
            departamentos,
            totalProdutos: supermercados.reduce((soma, item) => soma + item.totalProdutos, 0),
            ultimaColeta: datas.length ? new Date(Math.max(...datas)) : null,
            nomeDoMercado: slug => supermercados.find(item => item.slug === slug)?.nome || slug,
            lista,
            adicionarNaLista,
            aviso
        }
    }, [supermercados, departamentos, lista, adicionarNaLista, aviso])

    return <AppContext.Provider value={valor}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
    return useContext(AppContext)
}
