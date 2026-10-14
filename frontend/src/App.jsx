import { Link, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Inicio from './pages/Inicio'
import Produtos from './pages/Produtos'
import Produto from './pages/Produto'
import Lista from './pages/Lista'
import Painel from './pages/Painel'

const NaoEncontrada = () => (
  <div className="mx-auto max-w-xl px-4 py-24 text-center">
    <p className="text-6xl font-extrabold text-green-600">404</p>
    <h1 className="mt-2 text-2xl font-extrabold">Página não encontrada</h1>
    <p className="mt-2 text-zinc-500">O endereço pode estar errado ou a página foi removida.</p>
    <Link to="/" className="mt-6 inline-block rounded-full bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700">
      Voltar ao início
    </Link>
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
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}

export default App
