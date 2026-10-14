import { useCallback, useEffect, useMemo, useState } from 'react'

const CHAVE = 'superpreco:lista-compras'

function carregar() {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE) || '[]')
        // Listas salvas antes da opcao de substituicao aceitam outra marca por padrao.
        return Array.isArray(salvo) ? salvo.map(item => ({ aceitaSimilar: true, ...item })) : []
    } catch {
        return []
    }
}

// Lista de compras guardada no navegador do usuario (sem necessidade de login).
export function useListaCompras() {
    const [itens, setItens] = useState(carregar)

    useEffect(() => {
        try {
            localStorage.setItem(CHAVE, JSON.stringify(itens))
        } catch {
            // Navegacao privada ou armazenamento bloqueado: a lista vale so nesta sessao.
        }
    }, [itens])

    const adicionar = useCallback((produto) => {
        setItens(atual => {
            if (atual.some(item => item.id === produto.id)) {
                return atual.map(item => item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item)
            }
            return [...atual, {
                id: produto.id,
                nome: produto.name,
                preco: produto.priceNumber,
                supermercadoNome: produto.supermercadoNome,
                imagem: produto.image,
                quantidade: 1,
                // Se o mercado nao tiver este produto, aceita um similar de outra marca.
                aceitaSimilar: true
            }]
        })
    }, [])

    const alterarQuantidade = useCallback((id, quantidade) => {
        setItens(atual => quantidade <= 0
            ? atual.filter(item => item.id !== id)
            : atual.map(item => item.id === id ? { ...item, quantidade } : item))
    }, [])

    const alternarSimilar = useCallback((id) => {
        setItens(atual => atual.map(item => item.id === id ? { ...item, aceitaSimilar: !item.aceitaSimilar } : item))
    }, [])

    const limpar = useCallback(() => setItens([]), [])

    return useMemo(
        () => ({ itens, adicionar, alterarQuantidade, alternarSimilar, limpar }),
        [itens, adicionar, alterarQuantidade, alternarSimilar, limpar]
    )
}
