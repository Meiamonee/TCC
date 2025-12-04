import { useState, useEffect, useMemo } from 'react'
import { Search, ShoppingBag, Menu } from 'lucide-react'
import ProductList from './components/ProductList'
import CategoryMenu from './components/CategoryMenu'
import Pagination from './components/Pagination'
import productsData from './data/products.json'

const ITEMS_PER_PAGE = 40;

function App() {
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    // In a real app, you might fetch this from an API
    setProducts(productsData)
  }, [])

  // Reset to page 1 when category or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, searchTerm])

  const categories = useMemo(() => {
    const cats = new Set(productsData.map(p => p.department))
    return Array.from(cats).sort()
  }, [])

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory ? product.department === selectedCategory : true
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [products, selectedCategory, searchTerm])

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, currentPage])

  const handlePageChange = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <Menu size={24} className="text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-green-700 tracking-tight">
                Super<span className="text-red-600">Vale</span>
              </h1>
            </div>

            <div className="hidden md:flex flex-1 max-w-xl mx-4 relative">
              <input
                type="text"
                placeholder="O que você procura hoje?"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-transparent focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 rounded-full transition-all duration-300 outline-none text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>

            <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ShoppingBag size={24} className="text-gray-700" />
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                0
              </span>
            </button>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden mt-4 relative">
            <input
              type="text"
              placeholder="Buscar produtos..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-transparent focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 rounded-lg transition-all duration-300 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Categories */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Departamentos</h2>
          <CategoryMenu
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </section>


        {/* Products */}
        <section>
          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="text-xl font-bold text-gray-800">
              {selectedCategory || 'Todos os Produtos'}
            </h2>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm text-gray-500 font-medium">
                {filteredProducts.length} produtos
              </span>
              {totalPages > 1 && (
                <span className="text-xs text-gray-400">
                  Página {currentPage} de {totalPages}
                </span>
              )}
            </div>
          </div>

          <ProductList products={paginatedProducts} />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2025 Supervale Supermercados. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
