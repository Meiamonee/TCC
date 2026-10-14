import { useCallback, useEffect, useMemo, useState } from 'react'
import { Menu, RefreshCw, Search, ShoppingCart, X } from 'lucide-react'
import ProductList from './components/ProductList'
import CategoryMenu from './components/CategoryMenu'
import SupermarketMenu from './components/SupermarketMenu'
import ComparisonSidebar from './components/ComparisonSidebar'
import ShoppingListSidebar from './components/ShoppingListSidebar'
import Pagination from './components/Pagination'
import CestaBasica from './components/CestaBasica'
import { fetchCategorias, fetchProducts, fetchSupermercados } from './services/api'
import { formatarDataColeta } from './formatar'
import { useListaCompras } from './useListaCompras'

const ITEMS_PER_PAGE = 40
const DEBOUNCE_BUSCA_MS = 350

const ORDENACOES = [
  { valor: '', rotulo: 'Categoria' },
  { valor: 'menor-preco', rotulo: 'Menor preço' },
  { valor: 'menor-preco-unidade', rotulo: 'Menor preço por kg/L' },
  { valor: 'maior-preco', rotulo: 'Maior preço' },
  { valor: 'nome', rotulo: 'Nome (A-Z)' }
]

function App() {
  const [filtros, setFiltros] = useState({ search: '', categoria: null, supermercado: null, alimentos: false, ordenar: '', page: 1 })
  const [textoBusca, setTextoBusca] = useState('')
  const [resultado, setResultado] = useState({ data: [], total: 0, totalPages: 0 })
  const [categorias, setCategorias] = useState([])
  const [supermercados, setSupermercados] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [recarregar, setRecarregar] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [produtoComparado, setProdutoComparado] = useState(null)
  const [listaAberta, setListaAberta] = useState(false)
  const lista = useListaCompras()

  const atualizarFiltros = useCallback((mudancas) => {
    // Qualquer mudanca de filtro volta para a primeira pagina.
    setFiltros(atual => ({ ...atual, page: 1, ...mudancas }))
    setIsMenuOpen(false)
  }, [])

  // Aplica a busca alguns milissegundos depois que o usuario para de digitar.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFiltros(atual => (atual.search === textoBusca.trim() ? atual : { ...atual, search: textoBusca.trim(), page: 1 }))
    }, DEBOUNCE_BUSCA_MS)
    return () => window.clearTimeout(timer)
  }, [textoBusca])

  useEffect(() => {
    let cancelado = false
    const carregar = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const resposta = await fetchProducts({ ...filtros, limit: ITEMS_PER_PAGE })
        if (!cancelado) setResultado(resposta)
      } catch (error) {
        if (!cancelado) setLoadError(`Não foi possível carregar os produtos: ${error.message}`)
      } finally {
        if (!cancelado) setIsLoading(false)
      }
    }
    carregar()
    return () => { cancelado = true }
  }, [filtros, recarregar])

  useEffect(() => {
    let cancelado = false
    fetchCategorias(filtros.supermercado)
      .then(dados => { if (!cancelado) setCategorias(dados) })
      .catch(() => { if (!cancelado) setCategorias([]) })
    return () => { cancelado = true }
  }, [filtros.supermercado, recarregar])

  useEffect(() => {
    let cancelado = false
    fetchSupermercados()
      .then(dados => { if (!cancelado) setSupermercados(dados) })
      .catch(() => { if (!cancelado) setSupermercados([]) })
    return () => { cancelado = true }
  }, [recarregar])

  const totalMonitorado = useMemo(
    () => supermercados.reduce((soma, item) => soma + item.totalProdutos, 0),
    [supermercados]
  )

  const ultimaColeta = useMemo(() => {
    const datas = supermercados.map(item => new Date(item.ultimaColeta).getTime()).filter(Boolean)
    return datas.length ? new Date(Math.max(...datas)) : null
  }, [supermercados])

  const categoriasVisiveis = filtros.alimentos ? categorias.filter(item => item.alimento) : categorias

  const opcoesSupermercado = [
    { id: null, name: 'Todos os supermercados', count: totalMonitorado },
    ...supermercados.map(item => ({ id: item.slug, name: item.nome, count: item.totalProdutos }))
  ]

  const nomeSupermercado = supermercados.find(item => item.slug === filtros.supermercado)?.nome
  const temFiltros = Boolean(filtros.categoria || filtros.supermercado || filtros.search || filtros.alimentos)
  const totalItensLista = lista.itens.reduce((soma, item) => soma + item.quantidade, 0)

  const handlePageChange = (page) => {
    setFiltros(atual => ({ ...atual, page }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const limparFiltros = () => {
    setTextoBusca('')
    atualizarFiltros({ search: '', categoria: null, supermercado: null, alimentos: false })
  }

  const painelFiltros = (
    <div className="space-y-5">
      <SupermarketMenu
        supermarkets={opcoesSupermercado}
        selectedSupermarket={filtros.supermercado}
        onSelectSupermarket={supermercado => atualizarFiltros({ supermercado })}
      />

      <div className="space-y-4 rounded border border-zinc-200 bg-white p-5">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-zinc-700">
          Apenas alimentos
          <input
            type="checkbox"
            className="h-4 w-4 accent-violet-700"
            checked={filtros.alimentos}
            onChange={event => atualizarFiltros({ alimentos: event.target.checked, categoria: null })}
          />
        </label>

        <label className="block text-sm font-semibold text-zinc-700">
          Ordenar por
          <select
            className="mt-2 h-10 w-full rounded border border-zinc-200 bg-white px-2 text-sm font-medium"
            value={filtros.ordenar}
            onChange={event => atualizarFiltros({ ordenar: event.target.value })}
          >
            {ORDENACOES.map(opcao => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
          </select>
        </label>
      </div>

      <div className="rounded border border-zinc-200 bg-white p-5 text-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-950">Coleta de preços</h2>
        <p className="text-zinc-500">
          Última coleta: <span className="font-semibold text-zinc-900">{ultimaColeta ? formatarDataColeta(ultimaColeta) : '--'}</span>
        </p>
        <p className="mt-1 text-xs text-zinc-400">Os preços são atualizados automaticamente duas vezes por dia.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f7f7fb] font-sans text-zinc-950">
      <header className="sticky top-0 z-30 border-b border-violet-900/30 bg-violet-800 text-white">
        <div className="mx-auto flex min-h-20 max-w-[1480px] items-center gap-3 px-4 py-3 lg:px-8">
          <button
            className="rounded p-2 text-white/85 transition-colors hover:bg-white/10 lg:hidden"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Abrir filtros"
          >
            <Menu size={24} />
          </button>

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white text-sm font-bold text-violet-800">
              SP
            </div>
            <div className="hidden min-w-0 sm:block">
              <div className="text-xl font-semibold leading-5">SuperPreço</div>
              <div className="text-xs font-medium text-white/70">Poços de Caldas · {supermercados.length} supermercados</div>
            </div>
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={19} />
            <input
              type="search"
              placeholder="Buscar produto, marca ou tamanho (ex.: arroz 5kg)"
              className="h-12 w-full rounded border-0 bg-white pl-10 pr-3 text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
              value={textoBusca}
              onChange={event => setTextoBusca(event.target.value)}
              aria-label="Buscar produtos"
            />
          </div>

          <button
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={() => setListaAberta(true)}
            title="Lista de compras"
            aria-label="Abrir lista de compras"
          >
            <ShoppingCart size={21} />
            {totalItensLista > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-bold">
                {totalItensLista}
              </span>
            )}
          </button>

          <button
            className="hidden h-12 w-12 shrink-0 items-center justify-center rounded bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-50 sm:flex"
            onClick={() => setRecarregar(valor => valor + 1)}
            disabled={isLoading}
            title="Recarregar produtos"
            aria-label="Recarregar produtos"
          >
            <RefreshCw size={21} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 py-6 lg:px-8">
        <section className="mb-6 overflow-hidden rounded border border-zinc-200 bg-white">
          <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="px-5 py-6 sm:px-8 lg:px-10">
              <div className="mb-3 inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold uppercase text-zinc-600">
                {totalMonitorado.toLocaleString('pt-BR')} preços monitorados
              </div>
              <h1 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
                Compare preços dos supermercados de Poços de Caldas
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-zinc-600 sm:text-base">
                Preços coletados automaticamente nos sites dos supermercados. Compare o mesmo produto entre as lojas e monte sua lista para descobrir onde a compra sai mais barata.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-px bg-zinc-200">
              {supermercados.map(item => (
                <button
                  key={item.slug}
                  className={`bg-white p-5 text-left transition-colors hover:bg-zinc-50 ${filtros.supermercado === item.slug ? 'ring-1 ring-inset ring-violet-700' : ''}`}
                  onClick={() => atualizarFiltros({ supermercado: filtros.supermercado === item.slug ? null : item.slug })}
                >
                  <div className="text-2xl font-semibold text-zinc-950">{item.totalProdutos.toLocaleString('pt-BR')}</div>
                  <div className="mt-1 text-sm font-semibold text-zinc-600">{item.nome}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {!temFiltros && filtros.page === 1 && <CestaBasica />}

        {isMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-zinc-950/50" onClick={() => setIsMenuOpen(false)} aria-label="Fechar filtros" />
            <aside className="absolute left-0 top-0 h-full w-[min(88vw,360px)] overflow-y-auto bg-[#f7f7fb] p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-950">Filtros</span>
                <button className="rounded border border-zinc-200 bg-white p-2 text-zinc-600" onClick={() => setIsMenuOpen(false)} aria-label="Fechar filtros">
                  <X size={20} />
                </button>
              </div>
              {painelFiltros}
            </aside>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-28">{painelFiltros}</div>
          </aside>

          <section className="min-w-0">
            <div className="mb-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-950">Categorias</h2>
                {temFiltros && (
                  <button className="text-sm font-semibold text-violet-700 hover:text-violet-900" onClick={limparFiltros}>
                    Limpar filtros
                  </button>
                )}
              </div>
              <CategoryMenu
                categories={categoriasVisiveis}
                selectedCategory={filtros.categoria}
                onSelectCategory={categoria => atualizarFiltros({ categoria })}
              />
            </div>

            <div className="mb-4 flex flex-col gap-2 border-b border-zinc-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
                  {filtros.search ? `Resultados para "${filtros.search}"` : filtros.categoria || 'Todos os produtos'}
                </h2>
                <p className="text-sm font-medium text-zinc-500">
                  {nomeSupermercado ? `${nomeSupermercado} · ` : ''}{resultado.total.toLocaleString('pt-BR')} produtos
                </p>
              </div>
              {resultado.totalPages > 0 && (
                <div className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700">
                  Página {filtros.page} de {resultado.totalPages}
                </div>
              )}
            </div>

            {loadError ? (
              <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {loadError}
              </div>
            ) : isLoading && resultado.data.length === 0 ? (
              <div className="flex items-center justify-center rounded border border-zinc-200 bg-white py-20 text-sm font-semibold text-zinc-500">
                Carregando produtos...
              </div>
            ) : (
              <div className={isLoading ? 'opacity-60 transition-opacity' : ''}>
                <ProductList
                  products={resultado.data}
                  onCompare={setProdutoComparado}
                  onAddToList={lista.adicionar}
                />
                <div className="pt-6">
                  <Pagination currentPage={filtros.page} totalPages={resultado.totalPages} onPageChange={handlePageChange} />
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <ComparisonSidebar
        isOpen={Boolean(produtoComparado)}
        onClose={() => setProdutoComparado(null)}
        selectedProduct={produtoComparado}
        onAddToList={lista.adicionar}
      />

      <ShoppingListSidebar isOpen={listaAberta} onClose={() => setListaAberta(false)} lista={lista} />

      <footer className="mt-10 border-t border-zinc-200 bg-white py-8">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-2 px-4 text-sm font-medium text-zinc-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>SuperPreço · TCC IFSULDEMINAS Campus Poços de Caldas</span>
          <span>Preços coletados dos sites dos supermercados; confira no site antes de comprar.</span>
        </div>
      </footer>
    </div>
  )
}

export default App
