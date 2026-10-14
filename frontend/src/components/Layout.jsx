import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, CheckCircle2, LayoutGrid, MapPin, Search, ShoppingBasket, ShoppingCart } from 'lucide-react';
import { useApp } from '../AppContext';
import { estiloDepartamento } from '../departamentos';
import { formatarDataColeta, formatarMoeda } from '../formatar';

// Campo de busca do cabecalho. Recebe o termo atual via `key` para reiniciar quando a URL muda.
const CampoBusca = ({ termoInicial }) => {
    const [termo, setTermo] = useState(termoInicial);
    const navigate = useNavigate();

    const buscar = (evento) => {
        evento.preventDefault();
        const texto = termo.trim();
        navigate(texto ? `/produtos?busca=${encodeURIComponent(texto)}` : '/produtos');
    };

    return (
        <form onSubmit={buscar} className="flex h-12 flex-1 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5" role="search">
            <input
                type="search"
                value={termo}
                onChange={evento => setTermo(evento.target.value)}
                placeholder="O que você procura? Ex.: arroz 5kg, leite integral"
                className="min-w-0 flex-1 px-5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                aria-label="Buscar produtos"
            />
            <button type="submit" className="flex w-14 items-center justify-center bg-yellow-400 text-green-950 transition hover:bg-yellow-300" aria-label="Buscar">
                <Search size={20} strokeWidth={2.5} />
            </button>
        </form>
    );
};

const Layout = () => {
    const { supermercados, departamentos, totalProdutos, ultimaColeta, lista, aviso } = useApp();
    const [params] = useSearchParams();
    const { pathname } = useLocation();
    const termoAtual = pathname === '/produtos' ? params.get('busca') || '' : '';
    const quantidadeItens = lista.itens.reduce((soma, item) => soma + item.quantidade, 0);
    const totalLista = lista.itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
    const departamentoAtual = pathname === '/produtos' ? params.get('departamento') : null;

    return (
        <div className="flex min-h-screen flex-col bg-zinc-50 font-sans text-zinc-900">
            <div className="bg-green-950 text-[12px] text-green-100">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5">
                    <span className="flex items-center gap-1.5">
                        <MapPin size={13} />
                        Preços de {supermercados.length || 4} supermercados de Poços de Caldas
                    </span>
                    <Link to="/painel" className="flex shrink-0 items-center gap-1.5 font-semibold text-yellow-300 hover:text-yellow-200">
                        <BarChart3 size={13} />
                        <span className="hidden sm:inline">
                            {ultimaColeta ? `Atualizado em ${formatarDataColeta(ultimaColeta)} · ` : ''}Painel de preços
                        </span>
                        <span className="sm:hidden">Painel</span>
                    </Link>
                </div>
            </div>

            <header className="sticky top-0 z-30 bg-green-700 shadow-md">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-6">
                    <Link to="/" className="flex shrink-0 items-center gap-2 text-white" aria-label="SuperPreço - página inicial">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-green-900">
                            <ShoppingBasket size={22} strokeWidth={2.5} />
                        </span>
                        <span className="leading-tight">
                            <span className="block text-xl font-extrabold tracking-tight">SuperPreço</span>
                            <span className="hidden text-[11px] font-medium text-green-100 sm:block">Compare antes de comprar</span>
                        </span>
                    </Link>

                    <Link
                        to="/lista"
                        className="order-2 ml-auto flex items-center gap-2 rounded-full px-2 py-1 text-white transition hover:bg-white/10 sm:order-3 sm:ml-0"
                        aria-label={`Lista de compras com ${quantidadeItens} itens`}
                    >
                        <span className="relative">
                            <ShoppingCart size={26} />
                            {quantidadeItens > 0 && (
                                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1 text-[11px] font-bold text-green-950">
                                    {quantidadeItens}
                                </span>
                            )}
                        </span>
                        <span className="hidden text-left leading-tight md:block">
                            <span className="block text-[11px] text-green-100">Minha lista</span>
                            <span className="block text-sm font-bold">{formatarMoeda(totalLista)}</span>
                        </span>
                    </Link>

                    <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
                        <CampoBusca key={termoAtual} termoInicial={termoAtual} />
                    </div>
                </div>

                <nav className="border-t border-green-600/60 bg-green-800" aria-label="Departamentos">
                    <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-1.5 scrollbar-hide">
                        <NavLink
                            to="/produtos"
                            end
                            className={() => `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${pathname === '/produtos' && !departamentoAtual && !termoAtual ? 'bg-white text-green-800' : 'text-white hover:bg-white/10'}`}
                        >
                            <LayoutGrid size={15} />
                            Todos
                        </NavLink>
                        {departamentos.map(departamento => {
                            const Icone = estiloDepartamento(departamento.nome).icone;
                            const ativo = departamentoAtual === departamento.nome;
                            return (
                                <Link
                                    key={departamento.nome}
                                    to={`/produtos?departamento=${encodeURIComponent(departamento.nome)}`}
                                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${ativo ? 'bg-white text-green-800' : 'text-white hover:bg-white/10'}`}
                                >
                                    <Icone size={15} />
                                    {departamento.nome}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </header>

            <main className="flex-1">
                <Outlet />
            </main>

            <footer className="mt-12 bg-green-950 text-green-100">
                <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-lg font-extrabold text-white">
                            <ShoppingBasket size={20} /> SuperPreço
                        </div>
                        <p className="text-sm leading-6 text-green-200">
                            Comparação de preços dos supermercados de Poços de Caldas. {totalProdutos.toLocaleString('pt-BR')} preços monitorados.
                        </p>
                    </div>
                    <div>
                        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-white">Supermercados</h3>
                        <ul className="space-y-1 text-sm text-green-200">
                            {supermercados.map(mercado => (
                                <li key={mercado.slug}>
                                    <Link to={`/produtos?mercado=${mercado.slug}`} className="hover:text-white">{mercado.nome}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-white">Sobre os preços</h3>
                        <p className="text-sm leading-6 text-green-200">
                            Os preços são coletados automaticamente nos sites dos supermercados duas vezes por dia. Confira o valor no site do mercado antes de comprar.
                        </p>
                        <Link to="/painel" className="mt-2 inline-block text-sm font-bold text-yellow-300 hover:text-yellow-200">
                            Ver o painel de preços →
                        </Link>
                    </div>
                </div>
                <div className="border-t border-green-900 py-4 text-center text-xs text-green-300">
                    SuperPreço · Trabalho de Conclusão de Curso · IFSULDEMINAS Campus Poços de Caldas
                </div>
            </footer>

            {aviso && (
                <div className="fixed bottom-5 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm text-white shadow-lg" role="status">
                    <CheckCircle2 size={18} className="shrink-0 text-green-400" />
                    <span className="truncate">{aviso}</span>
                    <Link to="/lista" className="shrink-0 font-semibold text-yellow-300 hover:underline">Ver lista</Link>
                </div>
            )}
        </div>
    );
};

export default Layout;
