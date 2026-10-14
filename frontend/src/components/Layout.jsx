import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BadgePercent, BarChart3, CheckCircle2, Home, LayoutGrid, Receipt, Search } from 'lucide-react';
import { useApp } from '../AppContext';
import { useDispositivo } from '../useDispositivo';
import { estiloDepartamento } from '../departamentos';
import { formatarDataColeta, formatarMoeda } from '../formatar';
import Logo, { MarcaEtiqueta } from './Logo';

// Campo de busca. Recebe o termo atual via `key` para reiniciar quando a URL muda.
const CampoBusca = ({ termoInicial, compacto = false }) => {
    const [termo, setTermo] = useState(termoInicial);
    const navigate = useNavigate();

    const buscar = (evento) => {
        evento.preventDefault();
        const texto = termo.trim();
        navigate(texto ? `/produtos?busca=${encodeURIComponent(texto)}` : '/produtos');
    };

    return (
        <form
            onSubmit={buscar}
            className={`flex flex-1 overflow-hidden rounded-xl bg-papel-50 ring-2 ring-transparent transition focus-within:ring-etiqueta-400 ${compacto ? 'h-11' : 'h-12'}`}
            role="search"
        >
            <Search size={19} className={`ml-3.5 shrink-0 self-center text-tinta-400`} aria-hidden="true" />
            <input
                type="search"
                enterKeyHint="search"
                value={termo}
                onChange={evento => setTermo(evento.target.value)}
                placeholder={compacto ? 'Buscar produtos...' : 'Buscar arroz 5kg, leite integral, café...'}
                className="min-w-0 flex-1 bg-transparent px-3 text-[15px] text-tinta-900 outline-none placeholder:text-tinta-400"
                aria-label="Buscar produtos"
            />
            {!compacto && (
                <button type="submit" className="bg-etiqueta-400 px-5 font-display text-sm font-extrabold text-feira-900 transition hover:bg-etiqueta-300">
                    Buscar
                </button>
            )}
        </form>
    );
};

const ContadorLista = ({ quantidade, className = '' }) => quantidade > 0 && (
    <span className={`absolute flex h-5 min-w-5 items-center justify-center rounded-full bg-oferta-500 px-1 font-preco text-xs font-bold text-white ring-2 ring-feira-800 ${className}`}>
        {quantidade}
    </span>
);

// Faixa amarela com os departamentos (tablet e computador).
const FaixaDepartamentos = ({ departamentos, ativo, todosAtivo }) => (
    <nav className="border-b-2 border-feira-900/10 bg-etiqueta-400" aria-label="Departamentos">
        <div className="mx-auto flex max-w-7xl items-center gap-0.5 overflow-x-auto px-2 scrollbar-hide sm:px-4">
            <Link
                to="/produtos"
                className={`flex shrink-0 items-center gap-1.5 border-b-[3px] px-3 py-2.5 text-[13px] font-extrabold uppercase tracking-wide transition ${todosAtivo ? 'border-feira-800 text-feira-900' : 'border-transparent text-feira-800/80 hover:text-feira-900'}`}
            >
                <LayoutGrid size={15} /> Tudo
            </Link>
            {departamentos.map(departamento => {
                const Icone = estiloDepartamento(departamento.nome).icone;
                return (
                    <Link
                        key={departamento.nome}
                        to={`/produtos?departamento=${encodeURIComponent(departamento.nome)}`}
                        className={`flex shrink-0 items-center gap-1.5 border-b-[3px] px-3 py-2.5 text-[13px] font-bold transition ${ativo === departamento.nome ? 'border-feira-800 text-feira-900' : 'border-transparent text-feira-800/80 hover:text-feira-900'}`}
                    >
                        <Icone size={15} />
                        {departamento.nome}
                    </Link>
                );
            })}
        </div>
    </nav>
);

// Destinos principais da navegacao no celular (barra inferior) e no tablet (barra lateral).
const DESTINOS = [
    { para: '/', rotulo: 'Início', icone: Home, ativo: (caminho) => caminho === '/' },
    { para: '/corredores', rotulo: 'Corredores', icone: LayoutGrid, ativo: (caminho, params) => caminho === '/corredores' || (caminho.startsWith('/produto') && !params.get('ofertas')) },
    { para: '/produtos?ofertas=1', rotulo: 'Ofertas', icone: BadgePercent, ativo: (caminho, params) => caminho === '/produtos' && params.get('ofertas') === '1' },
    { para: '/lista', rotulo: 'Lista', icone: Receipt, ativo: (caminho) => caminho === '/lista', contador: true },
    { para: '/painel', rotulo: 'Painel', icone: BarChart3, ativo: (caminho) => caminho === '/painel' }
];

const BarraInferior = ({ caminho, params, quantidade }) => (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-feira-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Navegação principal">
        <ul className="grid h-16 grid-cols-5">
            {DESTINOS.map(destino => {
                const Icone = destino.icone;
                const ativo = destino.ativo(caminho, params);
                return (
                    <li key={destino.rotulo}>
                        <Link to={destino.para} className="relative flex h-16 flex-col items-center justify-center gap-0.5" aria-current={ativo ? 'page' : undefined}>
                            <span className={`absolute top-0 h-[3px] w-8 rounded-b-full transition ${ativo ? 'bg-etiqueta-400' : 'bg-transparent'}`} />
                            <span className="relative">
                                <Icone size={22} strokeWidth={ativo ? 2.4 : 1.8} className={ativo ? 'text-etiqueta-400' : 'text-feira-200'} />
                                {destino.contador && <ContadorLista quantidade={quantidade} className="-right-2.5 -top-1.5" />}
                            </span>
                            <span className={`text-[10.5px] font-semibold ${ativo ? 'text-etiqueta-300' : 'text-feira-200'}`}>{destino.rotulo}</span>
                        </Link>
                    </li>
                );
            })}
        </ul>
    </nav>
);

const BarraLateral = ({ caminho, params, quantidade }) => (
    <nav className="fundo-feira fixed inset-y-0 left-0 z-40 flex w-[84px] flex-col items-center gap-1 py-4" aria-label="Navegação principal">
        <Link to="/" className="mb-4" aria-label="SuperPreço - página inicial">
            <MarcaEtiqueta className="h-11 w-11 -rotate-6 drop-shadow" />
        </Link>
        {DESTINOS.map(destino => {
            const Icone = destino.icone;
            const ativo = destino.ativo(caminho, params);
            return (
                <Link
                    key={destino.rotulo}
                    to={destino.para}
                    aria-current={ativo ? 'page' : undefined}
                    className={`relative flex w-[68px] flex-col items-center gap-1 rounded-2xl py-2.5 transition ${ativo ? 'bg-etiqueta-400 text-feira-900' : 'text-feira-100 hover:bg-white/10'}`}
                >
                    <span className="relative">
                        <Icone size={22} strokeWidth={ativo ? 2.4 : 1.9} />
                        {destino.contador && <ContadorLista quantidade={quantidade} className="-right-3 -top-2" />}
                    </span>
                    <span className="text-[11px] font-bold">{destino.rotulo}</span>
                </Link>
            );
        })}
    </nav>
);

const Rodape = ({ supermercados, totalProdutos, ultimaColeta, compacto }) => (
    <footer className={`fundo-feira text-feira-100 ${compacto ? 'mt-10' : 'mt-16'}`}>
        <div className="faixa-listrada h-3 opacity-90" aria-hidden="true" />
        {compacto ? (
            <div className="px-5 py-8 text-center">
                <div className="flex justify-center"><Logo /></div>
                <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-feira-200">
                    {totalProdutos.toLocaleString('pt-BR')} preços de {supermercados.length} supermercados de Poços de Caldas.
                </p>
                {ultimaColeta && <p className="mt-2 text-xs text-feira-300">Atualizado em {formatarDataColeta(ultimaColeta)}</p>}
                <p className="mt-5 text-[11px] leading-5 text-feira-300">TCC · IFSULDEMINAS Campus Poços de Caldas<br />Confira o preço no site do mercado antes de comprar.</p>
            </div>
        ) : (
            <>
                <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
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
                                <li key={mercado.slug}><Link to={`/produtos?mercado=${mercado.slug}`} className="hover:text-white">{mercado.nome}</Link></li>
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
                    <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-feira-300 md:flex-row md:justify-between">
                        <span>SuperPreço · Trabalho de Conclusão de Curso · IFSULDEMINAS Campus Poços de Caldas</span>
                        <span>Preços coletados dos sites dos supermercados. Confira no site antes de comprar.</span>
                    </div>
                </div>
            </>
        )}
    </footer>
);

const Aviso = ({ texto, dispositivo }) => (
    <div
        className={`fixed left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-xl bg-feira-900 py-2.5 pl-3 pr-4 text-sm text-papel-50 shadow-2xl ring-1 ring-white/10 ${dispositivo === 'mobile' ? 'bottom-[84px]' : 'bottom-6'}`}
        role="status"
    >
        <MarcaEtiqueta className="h-7 w-7 shrink-0" />
        <CheckCircle2 size={16} className="hidden shrink-0 text-etiqueta-400 sm:block" />
        <span className="truncate">{texto}</span>
        <Link to="/lista" className="shrink-0 font-bold text-etiqueta-300 hover:underline">Ver lista</Link>
    </div>
);

const Layout = () => {
    const { supermercados, departamentos, totalProdutos, ultimaColeta, lista, aviso } = useApp();
    const dispositivo = useDispositivo();
    const [params] = useSearchParams();
    const { pathname } = useLocation();
    const termoAtual = pathname === '/produtos' ? params.get('busca') || '' : '';
    const departamentoAtual = pathname === '/produtos' ? params.get('departamento') : null;
    const todosAtivo = pathname === '/produtos' && !departamentoAtual && !termoAtual && !params.get('ofertas');
    const quantidadeItens = lista.itens.reduce((soma, item) => soma + item.quantidade, 0);
    const totalLista = lista.itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
    const rodape = { supermercados, totalProdutos, ultimaColeta };

    if (dispositivo === 'mobile') {
        return (
            // --altura-cabecalho: 12 + 44 (logo) + 12 + 44 (busca) + 12 = 124px; usada por barras fixas das paginas.
            <div className="flex min-h-screen flex-col pb-[72px]" style={{ '--altura-cabecalho': '124px' }}>
                <header className="fundo-feira sticky top-0 z-30 h-[124px] px-4 pb-3 pt-3 shadow-[0_6px_20px_-12px_rgba(8,42,25,.6)]">
                    <div className="mb-3 flex h-11 items-center justify-between">
                        <Link to="/" aria-label="SuperPreço - página inicial"><Logo subtitulo={false} /></Link>
                        {ultimaColeta && (
                            <Link to="/painel" className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-feira-100">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-etiqueta-400" />
                                {formatarDataColeta(ultimaColeta)}
                            </Link>
                        )}
                    </div>
                    <CampoBusca key={termoAtual} termoInicial={termoAtual} compacto />
                </header>
                <main className="flex-1"><Outlet /></main>
                <Rodape {...rodape} compacto />
                <BarraInferior caminho={pathname} params={params} quantidade={quantidadeItens} />
                {aviso && <Aviso texto={aviso} dispositivo={dispositivo} />}
            </div>
        );
    }

    if (dispositivo === 'tablet') {
        return (
            <div className="min-h-screen pl-[84px]">
                <BarraLateral caminho={pathname} params={params} quantidade={quantidadeItens} />
                <div className="flex min-h-screen flex-col">
                    <header className="sticky top-0 z-30 shadow-[0_6px_20px_-12px_rgba(8,42,25,.6)]">
                        <div className="fundo-feira flex items-center gap-4 px-5 py-3">
                            <Link to="/" className="shrink-0" aria-label="SuperPreço - página inicial">
                                <span className="font-display text-2xl font-extrabold tracking-tight text-papel-50">Super<span className="text-etiqueta-400">Preço</span></span>
                            </Link>
                            <CampoBusca key={termoAtual} termoInicial={termoAtual} compacto />
                            <Link to="/lista" className="shrink-0 rounded-xl bg-white/10 px-3 py-1.5 text-right leading-tight hover:bg-white/15">
                                <span className="block text-[11px] text-feira-200">Minha lista</span>
                                <span className="block font-preco text-lg font-bold text-papel-50">{formatarMoeda(totalLista)}</span>
                            </Link>
                        </div>
                        <FaixaDepartamentos departamentos={departamentos} ativo={departamentoAtual} todosAtivo={todosAtivo} />
                    </header>
                    <main className="flex-1"><Outlet /></main>
                    <Rodape {...rodape} />
                </div>
                {aviso && <Aviso texto={aviso} dispositivo={dispositivo} />}
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-30 shadow-[0_6px_20px_-12px_rgba(8,42,25,.6)]">
                <div className="fundo-feira">
                    <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3.5">
                        <Link to="/" aria-label="SuperPreço - página inicial" className="shrink-0"><Logo /></Link>
                        <CampoBusca key={termoAtual} termoInicial={termoAtual} />
                        <nav className="flex items-center gap-1">
                            <NavLink
                                to="/painel"
                                className={({ isActive }) => `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-white/10 text-etiqueta-300' : 'text-feira-100 hover:bg-white/10'}`}
                            >
                                <BarChart3 size={18} /> Painel
                            </NavLink>
                            <NavLink
                                to="/lista"
                                className={({ isActive }) => `flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition ${isActive ? 'bg-white/10' : 'hover:bg-white/10'}`}
                                aria-label={`Minha lista com ${quantidadeItens} itens`}
                            >
                                <span className="relative text-papel-50">
                                    <Receipt size={26} strokeWidth={1.8} />
                                    <ContadorLista quantidade={quantidadeItens} className="-right-2 -top-1.5" />
                                </span>
                                <span className="text-left leading-tight">
                                    <span className="block text-[11px] font-medium text-feira-200">Minha lista</span>
                                    <span className="block font-preco text-lg font-bold text-papel-50">{formatarMoeda(totalLista)}</span>
                                </span>
                            </NavLink>
                        </nav>
                    </div>
                </div>
                <FaixaDepartamentos departamentos={departamentos} ativo={departamentoAtual} todosAtivo={todosAtivo} />
            </header>
            <main className="flex-1"><Outlet /></main>
            <Rodape {...rodape} />
            {aviso && <Aviso texto={aviso} dispositivo={dispositivo} />}
        </div>
    );
};

export default Layout;
