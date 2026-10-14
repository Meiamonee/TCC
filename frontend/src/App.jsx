import { Link, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Inicio from './pages/Inicio'
import Produtos from './pages/Produtos'
import Produto from './pages/Produto'
import Lista from './pages/Lista'
import Painel from './pages/Painel'
import Corredores from './pages/Corredores'

const NaoEncontrada = () => (
  <div className="fundo-encarte">
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <span className="etiqueta inline-block rotate-[-4deg] py-2 pr-6 font-preco text-6xl font-extrabold">404</span>
      <h1 className="mt-6 text-3xl font-extrabold text-feira-900">Essa prateleira está vazia</h1>
      <p className="mt-2 text-tinta-500">O endereço pode estar errado ou a página foi removida.</p>
      <Link to="/" className="mt-8 inline-block rounded-xl bg-feira-700 px-6 py-3.5 font-display font-bold text-papel-50 hover:bg-feira-800">
        Voltar ao início
      </Link>
    </div>
  </div>
)

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="produtos" element={<Produtos />} />
        <Route path="produto/:id" element={<Produto />} />
        <Route path="lista" element={<Lista />} />
        <Route path="painel" element={<Painel />} />
        <Route path="corredores" element={<Corredores />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}

export default App
