import { useState, useEffect, useMemo } from 'react'
import { Search, ShoppingBag, Menu } from 'lucide-react'
import ProductList from './components/ProductList'
import CategoryMenu from './components/CategoryMenu'
import SupermarketMenu from './components/SupermarketMenu'
import ComparisonSidebar from './components/ComparisonSidebar'
import Pagination from './components/Pagination'
import productsData from './data/products.json'

const ITEMS_PER_PAGE = 40;

function App() {
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSupermarket, setSelectedSupermarket] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [comparisonSidebarOpen, setComparisonSidebarOpen] = useState(false)
  const [selectedProductForComparison, setSelectedProductForComparison] = useState(null)

  useEffect(() => {
    // In a real app, you might fetch this from an API
    setProducts(productsData)
  }, [])

  // Reset to page 1 when category, supermarket or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, selectedSupermarket, searchTerm])

  const categories = useMemo(() => {
    const cats = new Set(productsData.map(p => p.department))
    return Array.from(cats).sort()
  }, [])

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory ? product.department === selectedCategory : true
      const matchesSupermarket = selectedSupermarket ? product.supermercado === selectedSupermarket : true
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSupermarket && matchesSearch
    })
  }, [products, selectedCategory, selectedSupermarket, searchTerm])

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

  const handleCompareProduct = (product) => {
    setSelectedProductForComparison(product)
    setComparisonSidebarOpen(true)
  }

  const handleCloseSidebar = () => {
    setComparisonSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Minimalist Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu size={24} />
          </button>

          {/* Centered Search Bar */}
          <div className="flex-1 max-w-2xl mx-auto relative">
            <div className="relative group">
              <input
                type="text"
                placeholder="Buscar produtos..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-100 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all duration-200 outline-none text-sm font-medium placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors relative">
              <ShoppingBag size={22} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full border border-white"></span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Sidebar - Supermercados (3 cols) */}
          <aside className="lg:col-span-3 space-y-8">
            <SupermarketMenu
              selectedSupermarket={selectedSupermarket}
              onSelectSupermarket={setSelectedSupermarket}
            />
          </aside>

          {/* Main Content Area (9 cols) */}
          <div className="lg:col-span-9 space-y-8">

            {/* Categories */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Departamentos</h2>
              </div>
              <CategoryMenu
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </section>

            {/* Products Header */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {selectedCategory || 'Todos os Produtos'}
              </h1>
              <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {filteredProducts.length} resultados
              </span>
            </div>

            {/* Product Grid */}
            <ProductList
              products={paginatedProducts}
              onCompare={handleCompareProduct}
            />

            {/* Pagination */}
            <div className="pt-8 border-t border-slate-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Comparison Sidebar */}
      <ComparisonSidebar
        isOpen={comparisonSidebarOpen}
        onClose={handleCloseSidebar}
        selectedProduct={selectedProductForComparison}
        allProducts={products}
      />

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 mt-20 py-12 bg-white">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm font-medium">
            © 2025 Comparador de Preços.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
