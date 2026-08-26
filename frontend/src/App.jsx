import { useCallback, useEffect, useMemo, useState } from 'react'
import { Menu, RefreshCw, Search, X } from 'lucide-react'
import ProductList from './components/ProductList'
import CategoryMenu from './components/CategoryMenu'
import SupermarketMenu from './components/SupermarketMenu'
import ComparisonSidebar from './components/ComparisonSidebar'
import Pagination from './components/Pagination'
import { fetchProducts } from './services/api'

const ITEMS_PER_PAGE = 40

function App() {
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSupermarket, setSelectedSupermarket] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [comparisonSidebarOpen, setComparisonSidebarOpen] = useState(false)
  const [selectedProductForComparison, setSelectedProductForComparison] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  const loadProducts = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setLoadError(null)
      const response = await fetchProducts()

      setProducts(response.data || [])
      setLastUpdatedAt(new Date())
    } catch {
      setLoadError('Nao foi possivel carregar os produtos da API.')
      if (!silent) {
        setProducts([])
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()

    const refreshTimer = window.setInterval(() => {
      loadProducts({ silent: true })
    }, 60000)

    return () => window.clearInterval(refreshTimer)
  }, [loadProducts])

  useEffect(() => {
    setCurrentPage(1)
    setIsMenuOpen(false)
  }, [selectedCategory, selectedSupermarket, searchTerm])

  const categoryStats = useMemo(() => {
    return products.reduce((acc, product) => {
      if (!product.department) return acc
      acc[product.department] = (acc[product.department] || 0) + 1
      return acc
    }, {})
  }, [products])

  const categories = useMemo(() => {
    return Object.keys(categoryStats).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [categoryStats])

  const supermarkets = useMemo(() => {
    const countsBySupermarket = products.reduce((acc, product) => {
      if (!product.supermercado) return acc
      acc[product.supermercado] = (acc[product.supermercado] || 0) + 1
      return acc
    }, {})

    return [
      {
        id: null,
        name: 'Todos os Supermercados',
        count: products.length
      },
      {
        id: 'supervale',
        name: 'SuperVale',
        count: countsBySupermarket.supervale || 0
      },
      {
        id: 'fonseca',
        name: 'Supermercado Fonseca',
        count: countsBySupermarket.fonseca || 0
      }
    ]
  }, [products])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return products.filter(product => {
      const matchesCategory = selectedCategory ? product.department === selectedCategory : true
      const matchesSupermarket = selectedSupermarket ? product.supermercado === selectedSupermarket : true
      const matchesSearch = normalizedSearch ? product.name.toLowerCase().includes(normalizedSearch) : true
      return matchesCategory && matchesSupermarket && matchesSearch
    })
  }, [products, selectedCategory, selectedSupermarket, searchTerm])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, currentPage])

  const selectedSupermarketName = supermarkets.find(item => item.id === selectedSupermarket)?.name
  const listTitle = selectedCategory || 'Todos os produtos'
  const lastUpdatedLabel = lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'

  const handlePageChange = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCompareProduct = (product) => {
    setSelectedProductForComparison(product)
    setComparisonSidebarOpen(true)
  }

  const handleCloseSidebar = () => {
    setComparisonSidebarOpen(false)
  }

  const clearFilters = () => {
    setSelectedCategory(null)
    setSelectedSupermarket(null)
    setSearchTerm('')
  }

  const filters = (
    <div className="space-y-5">
      <SupermarketMenu
        supermarkets={supermarkets}
        selectedSupermarket={selectedSupermarket}
        onSelectSupermarket={setSelectedSupermarket}
      />

      <div className="rounded border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-950">Resumo</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Produtos</span>
            <span className="font-semibold text-zinc-950">{products.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Categorias</span>
            <span className="font-semibold text-zinc-950">{categories.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Atualizado</span>
            <span className="font-semibold text-zinc-950">{lastUpdatedLabel}</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f7f7fb] font-sans text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-violet-900/30 bg-violet-800 text-white">
        <div className="mx-auto flex min-h-20 max-w-[1480px] items-center gap-3 px-4 py-3 lg:px-8">
          <button
            className="rounded p-2 text-white/85 transition-colors hover:bg-white/10 lg:hidden"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Abrir filtros"
          >
            <Menu size={24} />
          </button>

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white text-sm font-semibold text-violet-800">
              PM
            </div>
            <div className="hidden min-w-0 sm:block">
              <div className="text-xl font-semibold leading-5">Preco Mercado</div>
              <div className="text-xs font-medium text-white/70">SuperVale e Fonseca</div>
            </div>
          </div>

          <div className="flex flex-1 items-center rounded bg-white p-1">
            <button
              className="hidden h-11 shrink-0 items-center rounded px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 md:flex"
              onClick={() => setSelectedCategory(null)}
            >
              Todas as categorias
            </button>
            <div className="hidden h-7 w-px bg-zinc-200 md:block" />
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={19} />
              <input
                type="text"
                placeholder="Digite sua busca..."
                className="h-11 w-full rounded border-0 bg-white pl-10 pr-3 text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <button
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            onClick={() => loadProducts({ silent: true })}
            disabled={isRefreshing}
            title={lastUpdatedAt ? `Atualizado ${lastUpdatedLabel}` : 'Atualizar produtos'}
            aria-label="Atualizar produtos"
          >
            <RefreshCw size={21} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 py-6 lg:px-8">
        <section className="mb-6 overflow-hidden rounded border border-zinc-200 bg-white">
          <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="px-5 py-6 text-zinc-950 sm:px-8 lg:px-10">
              <div className="mb-3 inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold uppercase text-zinc-600">
                {products.length} ofertas monitoradas
              </div>
              <h1 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
                Comparacao de precos de mercado
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-zinc-600 sm:text-base">
                Produtos coletados dos mercados locais, organizados para busca, filtro e comparacao direta.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-px bg-zinc-200">
              <button
                className={`bg-white p-5 text-left transition-colors hover:bg-zinc-50 ${selectedSupermarket === 'supervale' ? 'ring-1 ring-inset ring-violet-700' : ''}`}
                onClick={() => setSelectedSupermarket('supervale')}
              >
                <div className="text-2xl font-semibold text-zinc-950">{supermarkets.find(item => item.id === 'supervale')?.count || 0}</div>
                <div className="mt-1 text-sm font-semibold text-zinc-600">SuperVale</div>
              </button>
              <button
                className={`bg-white p-5 text-left transition-colors hover:bg-zinc-50 ${selectedSupermarket === 'fonseca' ? 'ring-1 ring-inset ring-violet-700' : ''}`}
                onClick={() => setSelectedSupermarket('fonseca')}
              >
                <div className="text-2xl font-semibold text-zinc-950">{supermarkets.find(item => item.id === 'fonseca')?.count || 0}</div>
                <div className="mt-1 text-sm font-semibold text-zinc-600">Fonseca</div>
              </button>
              <div className="col-span-2 bg-white p-5">
                <div className="text-sm font-semibold text-zinc-950">Dados importados no MongoDB</div>
                <div className="text-sm font-medium text-zinc-500">Ultima leitura: {lastUpdatedLabel}</div>
              </div>
            </div>
          </div>
        </section>

        {isMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              className="absolute inset-0 bg-zinc-950/50"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Fechar filtros"
            />
            <aside className="absolute left-0 top-0 h-full w-[min(88vw,360px)] overflow-y-auto bg-[#f7f7fb] p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-950">Filtros</span>
                <button
                  className="rounded border border-zinc-200 bg-white p-2 text-zinc-600"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Fechar filtros"
                >
                  <X size={20} />
                </button>
              </div>
              {filters}
            </aside>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-32">
              {filters}
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-950">Departamentos</h2>
                {(selectedCategory || selectedSupermarket || searchTerm) && (
                  <button
                    className="text-sm font-semibold text-violet-700 hover:text-violet-900"
                    onClick={clearFilters}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
              <CategoryMenu
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>

            <div className="mb-4 flex flex-col gap-2 border-b border-zinc-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">{listTitle}</h2>
                <p className="text-sm font-medium text-zinc-500">
                  {selectedSupermarketName ? `${selectedSupermarketName} - ` : ''}{filteredProducts.length} resultados
                </p>
              </div>
              <div className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700">
                Pagina {Math.min(currentPage, Math.max(totalPages, 1))} de {Math.max(totalPages, 1)}
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center rounded border border-zinc-200 bg-white py-20 text-sm font-semibold text-zinc-500">
                Carregando produtos...
              </div>
            ) : loadError ? (
              <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {loadError}
              </div>
            ) : (
              <>
                <ProductList
                  products={paginatedProducts}
                  onCompare={handleCompareProduct}
                />

                <div className="pt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      <ComparisonSidebar
        isOpen={comparisonSidebarOpen}
        onClose={handleCloseSidebar}
        selectedProduct={selectedProductForComparison}
        allProducts={products}
      />

      <footer className="mt-10 border-t border-zinc-200 bg-white py-8">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-2 px-4 text-sm font-medium text-zinc-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>Comparador de precos de mercado</span>
          <span>{products.length} produtos monitorados</span>
        </div>
      </footer>
    </div>
  )
}

export default App
