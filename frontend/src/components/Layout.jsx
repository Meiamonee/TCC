import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, CheckCircle2, LayoutGrid, Receipt, Search } from 'lucide-react';
import { useApp } from '../AppContext';
import { estiloDepartamento } from '../departamentos';
import { formatarDataColeta, formatarMoeda } from '../formatar';
import Logo, { MarcaEtiqueta } from './Logo';

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
        <form onSubmit={buscar} className="flex h-12 flex-1 overflow-hidden rounded-xl bg-papel-50 ring-2 ring-transparent transition focus-within:ring-etiqueta-400" role="search">
            <Search size={19} className="ml-4 mt-[14px] shrink-0 text-tinta-400" aria-hidden="true" />
            <input
                type="search"
                value={termo}
                onChange={evento => setTermo(evento.target.value)}
                placeholder="Buscar arroz 5kg, leite integral, café..."
                className="min-w-0 flex-1 bg-transparent px-3 text-[15px] text-tinta-900 outline-none placeholder:text-tinta-400"
                aria-label="Buscar produtos"
            />
            <button type="submit" className="bg-etiqueta-400 px-5 font-display text-sm font-extrabold text-feira-900 transition hover:bg-etiqueta-300">
                Buscar
            </button>
        </form>
    );
};

const Layout = () => {
    const { supermercados, departamentos, totalProdutos, ultimaColeta, lista, aviso } = useApp();
    const [params] = useSearchParams();
    const { pathname } = useLocation();
    const termoAtual = pathname === '/produtos' ? params.get('busca') || '' : '';
    const departamentoAtual = pathname === '/produtos' ? params.get('departamento') : null;
    const quantidadeItens = lista.itens.reduce((soma, item) => soma + item.quantidade, 0);
    const totalLista = lista.itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0);

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-30 shadow-[0_6px_20px_-12px_rgba(8,42,25,.6)]">
                <div className="fundo-feira">
                    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 sm:flex-nowrap">
                        <Link to="/" aria-label="SuperPreço - página inicial" className="shrink-0">
                            <Logo />
                        </Link>

                        <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
                            <CampoBusca key={termoAtual} termoInicial={termoAtual} />
                        </div>

                        <nav className="order-2 ml-auto flex items-center gap-1 sm:order-3 sm:ml-0">
                            <Link
                                to="/painel"
                                className={`hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition md:flex ${pathname === '/painel' ? 'bg-white/10 text-etiqueta-300' : 'text-feira-100 hover:bg-white/10'}`}
                            >
                                <BarChart3 size={18} /> Painel
                            </Link>
                            <Link
                                to="/lista"
                                className={`flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition ${pathname === '/lista' ? 'bg-white/10' : 'hover:bg-white/10'}`}
                                aria-label={`Minha lista com ${quantidadeItens} itens`}
                            >
                                <span className="relative text-papel-50">
                                    <Receipt size={26} strokeWidth={1.8} />
                                    {quantidadeItens > 0 && (
                                        <span className="absolute -right-2 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-oferta-500 px-1 font-preco text-xs font-bold text-white ring-2 ring-feira-800">
                                            {quantidadeItens}
                                        </span>
                                    )}
                                </span>
                                <span className="hidden text-left leading-tight lg:block">
                                    <span className="block text-[11px] font-medium text-feira-200">Minha lista</span>
                                    <span className="block font-preco text-lg font-bold text-papel-50">{formatarMoeda(totalLista)}</span>
                                </span>
                            </Link>
                        </nav>
                    </div>
                </div>

                <nav className="border-b-2 border-feira-900/10 bg-etiqueta-400" aria-label="Departamentos">
                    <div className="mx-auto flex max-w-7xl items-center gap-0.5 overflow-x-auto px-2 scrollbar-hide sm:px-4">
                        <Link
                            to="/produtos"
                            className={`flex shrink-0 items-center gap-1.5 border-b-[3px] px-3 py-2.5 text-[13px] font-extrabold uppercase tracking-wide transition ${pathname === '/produtos' && !departamentoAtual && !termoAtual ? 'border-feira-800 text-feira-900' : 'border-transparent text-feira-800/80 hover:text-feira-900'}`}
                        >
                            <LayoutGrid size={15} /> Tudo
                        </Link>
                        {departamentos.map(departamento => {
                            const Icone = estiloDepartamento(departamento.nome).icone;
                            const ativo = departamentoAtual === departamento.nome;
                            return (
                                <Link
                                    key={departamento.nome}
                                    to={`/produtos?departamento=${encodeURIComponent(departamento.nome)}`}
                                    className={`flex shrink-0 items-center gap-1.5 border-b-[3px] px-3 py-2.5 text-[13px] font-bold transition ${ativo ? 'border-feira-800 text-feira-900' : 'border-transparent text-feira-800/80 hover:text-feira-900'}`}
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

            <footer className="fundo-feira mt-16 text-feira-100">
                <div className="h-3 faixa-listrada opacity-90" aria-hidden="true" />
                <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
                    <div>
                        <Logo />
                        <p className="mt-4 max-w-sm text-sm leading-6 text-feira-200">
                            Comparamos {totalProdutos.toLocaleString('pt-BR')} preços dos supermercados de Poços de Caldas para você saber onde a compra sai mais barata.
                        </p>
                        {ultimaColeta && (
                            <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-feira-100">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-etiqueta-400" />
                                Preços atualizados em {formatarDataColeta(ultimaColeta)}
                            </p>
                        )}
                    </div>
                    <div>
                        <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-etiqueta-300">Supermercados</h3>
                        <ul className="space-y-2 text-sm">
                            {supermercados.map(mercado => (
                                <li key={mercado.slug}>
                                    <Link to={`/produtos?mercado=${mercado.slug}`} className="text-feira-100 hover:text-white">{mercado.nome}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-etiqueta-300">Navegue</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/produtos" className="hover:text-white">Todos os produtos</Link></li>
                            <li><Link to="/produtos?ofertas=1" className="hover:text-white">Ofertas</Link></li>
                            <li><Link to="/lista" className="hover:text-white">Minha lista de compras</Link></li>
                            <li><Link to="/painel" className="hover:text-white">Painel de preços</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-white/10">
                    <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-feira-300 sm:flex-row sm:justify-between">
                        <span>SuperPreço · Trabalho de Conclusão de Curso · IFSULDEMINAS Campus Poços de Caldas</span>
                        <span>Preços coletados dos sites dos supermercados. Confira no site antes de comprar.</span>
                    </div>
                </div>
            </footer>

            {aviso && (
                <div className="fixed bottom-5 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-xl bg-feira-900 py-2.5 pl-3 pr-4 text-sm text-papel-50 shadow-2xl" role="status">
                    <MarcaEtiqueta className="h-7 w-7 shrink-0" />
                    <CheckCircle2 size={16} className="hidden shrink-0 text-etiqueta-400 sm:block" />
                    <span className="truncate">{aviso}</span>
                    <Link to="/lista" className="shrink-0 font-bold text-etiqueta-300 hover:underline">Ver lista</Link>
                </div>
            )}
        </div>
    );
};

export default Layout;
