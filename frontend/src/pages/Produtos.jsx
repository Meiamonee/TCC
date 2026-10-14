import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownUp, Check, ChevronRight, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { useDispositivo } from '../useDispositivo';
import { fetchProducts } from '../services/api';
import { estiloDepartamento } from '../departamentos';
import { corBarraDoSupermercado } from '../supermercados';
import ProductList from '../components/ProductList';
import Pagination from '../components/Pagination';

const POR_PAGINA = 40;

const ORDENACOES = [
    { valor: '', rotulo: 'Relevância' },
    { valor: 'menor-preco', rotulo: 'Menor preço' },
    { valor: 'menor-preco-unidade', rotulo: 'Menor preço por kg/L' },
    { valor: 'maior-preco', rotulo: 'Maior preço' },
    { valor: 'nome', rotulo: 'Nome (A-Z)' }
];

const OpcaoFiltro = ({ ativo, onClick, children, contagem, cor }) => (
    <button
        onClick={onClick}
        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition sm:py-2 ${ativo ? 'bg-feira-50 font-bold text-feira-800' : 'text-tinta-700 hover:bg-papel-100 active:bg-papel-200'}`}
    >
        <span className="flex items-center gap-2.5">
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${ativo ? 'border-feira-600' : 'border-papel-300'}`}>
                {ativo && <span className="h-2 w-2 rounded-full bg-feira-600" />}
            </span>
            {cor && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cor }} />}
            {children}
        </span>
        {contagem !== undefined && <span className="font-preco text-sm text-tinta-400">{contagem.toLocaleString('pt-BR')}</span>}
    </button>
);

const TituloFiltro = ({ children }) => (
    <h3 className="mb-1.5 px-3 font-preco text-[13px] font-bold uppercase tracking-[0.18em] text-tinta-500">{children}</h3>
);

// Painel que sobe da parte de baixo da tela (celular).
const PainelInferior = ({ titulo, aoFechar, children }) => (
    <div className="fixed inset-0 z-50">
        <button className="absolute inset-0 bg-feira-900/50" onClick={aoFechar} aria-label="Fechar" />
        <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-papel-50 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-papel-300" />
            <div className="mb-2 flex items-center justify-between px-5">
                <span className="font-display text-xl font-extrabold text-feira-900">{titulo}</span>
                <button onClick={aoFechar} className="rounded-full p-2 text-tinta-500 hover:bg-papel-200" aria-label="Fechar"><X size={20} /></button>
            </div>
            {children}
        </div>
    </div>
);

// Gaveta que desliza da esquerda (tablet).
const GavetaLateral = ({ titulo, aoFechar, children }) => (
    <div className="fixed inset-0 z-50">
        <button className="absolute inset-0 bg-feira-900/40" onClick={aoFechar} aria-label="Fechar" />
        <aside className="absolute inset-y-0 left-0 w-[320px] overflow-y-auto bg-papel-50 py-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between px-5">
                <span className="font-display text-xl font-extrabold text-feira-900">{titulo}</span>
                <button onClick={aoFechar} className="rounded-full p-2 text-tinta-500 hover:bg-papel-200" aria-label="Fechar"><X size={20} /></button>
            </div>
            {children}
        </aside>
    </div>
);

const Produtos = () => {
    const { supermercados, departamentos } = useApp();
    const dispositivo = useDispositivo();
    const mobile = dispositivo === 'mobile';
    const [params, setParams] = useSearchParams();
    const [resultado, setResultado] = useState({ data: [], total: 0, totalPages: 0 });
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);
    const [painelAberto, setPainelAberto] = useState(null); // 'filtros' | 'ordem' | null

    const filtros = {
        busca: params.get('busca') || '',
        departamento: params.get('departamento') || '',
        mercado: params.get('mercado') || '',
        alimentos: params.get('alimentos') === '1',
        ofertas: params.get('ofertas') === '1',
        ordem: params.get('ordem') || '',
        pagina: Math.max(Number(params.get('pagina')) || 1, 1)
    };
    const chave = params.toString();

    useEffect(() => {
        let cancelado = false;
        const atuais = new URLSearchParams(chave);

        const carregar = async () => {
            setCarregando(true);
            setErro(null);
            try {
                const resposta = await fetchProducts({
                    search: atuais.get('busca') || '',
                    categoria: atuais.get('departamento') || '',
                    supermercado: atuais.get('mercado') || '',
                    alimentos: atuais.get('alimentos') === '1',
                    ofertas: atuais.get('ofertas') === '1',
                    ordenar: atuais.get('ordem') || '',
                    page: Math.max(Number(atuais.get('pagina')) || 1, 1),
                    limit: POR_PAGINA
                });
                if (!cancelado) setResultado(resposta);
            } catch (error) {
                if (!cancelado) setErro(error.message);
            } finally {
                if (!cancelado) setCarregando(false);
            }
        };

        carregar();
        return () => { cancelado = true; };
    }, [chave]);

    // Atualiza a URL; qualquer mudanca de filtro volta para a primeira pagina.
    const alterar = (mudancas, { manterPagina = false } = {}) => {
        const novos = new URLSearchParams(params);
        for (const [nome, valor] of Object.entries(mudancas)) {
            if (valor === '' || valor === null || valor === false) novos.delete(nome);
            else novos.set(nome, valor === true ? '1' : String(valor));
        }
        if (!manterPagina) novos.delete('pagina');
        setParams(novos);
        setPainelAberto(null);
    };

    const mudarPagina = pagina => {
        alterar({ pagina }, { manterPagina: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const nomeMercado = supermercados.find(item => item.slug === filtros.mercado)?.nome;
    const titulo = filtros.busca
        ? <>“{filtros.busca}”</>
        : filtros.ofertas ? 'Ofertas' : filtros.departamento || (nomeMercado ? nomeMercado : 'Todos os produtos');
    const sobretitulo = filtros.busca ? 'Resultado da busca' : filtros.departamento ? 'Corredor' : nomeMercado ? 'Supermercado' : 'Catálogo';
    const estilo = filtros.departamento ? estiloDepartamento(filtros.departamento) : null;
    const IconeDepartamento = estilo?.icone;
    const rotuloOrdem = ORDENACOES.find(opcao => opcao.valor === filtros.ordem)?.rotulo || 'Relevância';

    const chips = [
        filtros.busca && { rotulo: `“${filtros.busca}”`, limpar: { busca: '' } },
        filtros.departamento && { rotulo: filtros.departamento, limpar: { departamento: '' } },
        nomeMercado && { rotulo: nomeMercado, limpar: { mercado: '' } },
        filtros.alimentos && { rotulo: 'Só alimentos', limpar: { alimentos: false } },
        filtros.ofertas && { rotulo: 'Em oferta', limpar: { ofertas: false } }
    ].filter(Boolean);
    // A busca nao conta como filtro: ela ja aparece no campo de busca.
    const filtrosAtivos = chips.filter(chip => !('busca' in chip.limpar)).length;

    const painelFiltros = (
        <div className="space-y-6">
            <div>
                <TituloFiltro>Supermercado</TituloFiltro>
                <OpcaoFiltro ativo={!filtros.mercado} onClick={() => alterar({ mercado: '' })}>Todos</OpcaoFiltro>
                {supermercados.map(mercado => (
                    <OpcaoFiltro
                        key={mercado.slug}
                        ativo={filtros.mercado === mercado.slug}
                        onClick={() => alterar({ mercado: mercado.slug })}
                        contagem={mercado.totalProdutos}
                        cor={corBarraDoSupermercado(mercado.slug)}
                    >
                        {mercado.nome}
                    </OpcaoFiltro>
                ))}
            </div>

            <div>
                <TituloFiltro>Corredor</TituloFiltro>
                <OpcaoFiltro ativo={!filtros.departamento} onClick={() => alterar({ departamento: '' })}>Todos</OpcaoFiltro>
                {departamentos
                    .filter(departamento => !filtros.alimentos || departamento.alimento)
                    .map(departamento => (
                        <OpcaoFiltro key={departamento.nome} ativo={filtros.departamento === departamento.nome} onClick={() => alterar({ departamento: departamento.nome })}>
                            {departamento.nome}
                        </OpcaoFiltro>
                    ))}
            </div>

            <div className="space-y-3 px-3">
                <TituloFiltro>Mostrar</TituloFiltro>
                {[
                    { campo: 'alimentos', rotulo: 'Apenas alimentos', extra: { departamento: '' } },
                    { campo: 'ofertas', rotulo: 'Apenas ofertas', extra: {} }
                ].map(opcao => (
                    <label key={opcao.campo} className="flex cursor-pointer items-center gap-2.5 text-sm text-tinta-700">
                        <input
                            type="checkbox"
                            className="h-5 w-5 rounded accent-feira-600 sm:h-4 sm:w-4"
                            checked={filtros[opcao.campo]}
                            onChange={e => alterar({ [opcao.campo]: e.target.checked, ...opcao.extra })}
                        />
                        {opcao.rotulo}
                    </label>
                ))}
            </div>
        </div>
    );

    const listaChips = chips.length > 0 && (
        <div className={`flex items-center gap-2 ${mobile ? '-mx-4 overflow-x-auto px-4 scrollbar-hide' : 'mt-5 flex-wrap'}`}>
            {chips.map(chip => (
                <button
                    key={chip.rotulo}
                    onClick={() => alterar(chip.limpar)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-etiqueta-400 px-3 py-1.5 text-xs font-bold text-feira-900 transition hover:bg-etiqueta-300"
                >
                    {chip.rotulo} <X size={13} strokeWidth={3} />
                </button>
            ))}
            <button onClick={() => setParams(new URLSearchParams())} className="shrink-0 px-1 text-xs font-bold text-tinta-500 underline decoration-dotted underline-offset-2 hover:text-tinta-900">
                Limpar tudo
            </button>
        </div>
    );

    const contagem = carregando && resultado.total === 0
        ? 'Procurando...'
        : <><strong className="font-preco text-base text-tinta-900">{resultado.total.toLocaleString('pt-BR')}</strong> produtos</>;

    const conteudo = erro ? (
        <div className="rounded-2xl border border-oferta-500/30 bg-oferta-100 p-6 text-sm text-oferta-700">
            Não foi possível carregar os produtos ({erro}). Verifique se a API está rodando e tente novamente.
        </div>
    ) : (
        <ProductList
            products={resultado.data}
            carregando={carregando}
            quantidadeEsqueleto={mobile ? 6 : 9}
            vazio={
                <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-papel-300 bg-papel-50 px-6 py-16 text-center">
                    <SearchX size={40} className="text-tinta-400" />
                    <p className="mt-3 font-display text-xl font-extrabold text-feira-900">Nada nesta prateleira</p>
                    <p className="mt-1 max-w-sm text-sm text-tinta-500">Tente outra palavra, confira a ortografia ou remova algum filtro.</p>
                    <button onClick={() => setParams(new URLSearchParams())} className="mt-5 rounded-xl bg-feira-700 px-5 py-2.5 text-sm font-bold text-papel-50 hover:bg-feira-800">
                        Ver todos os produtos
                    </button>
                </div>
            }
        />
    );

    // ---------- Celular ----------
    if (mobile) {
        return (
            <div>
                <div className="fundo-encarte px-4 pb-3 pt-5">
                    <p className="font-preco text-xs font-bold uppercase tracking-[0.2em] text-oferta-500">{sobretitulo}</p>
                    <h1 className="line-clamp-2 text-[1.75rem] font-extrabold leading-tight text-feira-900">{titulo}</h1>
                    <p className="text-sm text-tinta-500">{contagem}</p>
                </div>

                <div className="sticky top-[var(--altura-cabecalho)] z-20 space-y-2.5 border-y border-papel-300 bg-papel-100/95 px-4 py-2.5 backdrop-blur">
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setPainelAberto('filtros')} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-papel-300 bg-papel-50 text-sm font-bold text-tinta-900 active:bg-papel-200">
                            <SlidersHorizontal size={16} /> Filtrar
                            {filtrosAtivos > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-feira-600 px-1 text-[11px] text-white">{filtrosAtivos}</span>}
                        </button>
                        <button onClick={() => setPainelAberto('ordem')} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-papel-300 bg-papel-50 text-sm font-bold text-tinta-900 active:bg-papel-200">
                            <ArrowDownUp size={16} /> <span className="truncate">{rotuloOrdem}</span>
                        </button>
                    </div>
                    {listaChips}
                </div>

                <section className="px-3 py-4">
                    {conteudo}
                    <div className="pt-8"><Pagination currentPage={filtros.pagina} totalPages={resultado.totalPages} onPageChange={mudarPagina} /></div>
                </section>

                {painelAberto === 'filtros' && <PainelInferior titulo="Filtrar produtos" aoFechar={() => setPainelAberto(null)}>{painelFiltros}</PainelInferior>}
                {painelAberto === 'ordem' && (
                    <PainelInferior titulo="Ordenar por" aoFechar={() => setPainelAberto(null)}>
                        <ul className="px-2">
                            {ORDENACOES.map(opcao => (
                                <li key={opcao.valor}>
                                    <button
                                        onClick={() => alterar({ ordem: opcao.valor })}
                                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-[15px] ${filtros.ordem === opcao.valor ? 'bg-feira-50 font-bold text-feira-800' : 'text-tinta-700 active:bg-papel-200'}`}
                                    >
                                        {opcao.rotulo}
                                        {filtros.ordem === opcao.valor && <Check size={18} className="text-feira-600" />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </PainelInferior>
                )}
            </div>
        );
    }

    // ---------- Tablet e computador ----------
    const tablet = dispositivo === 'tablet';

    return (
        <div>
            <div className="fundo-encarte border-b border-papel-300">
                <div className={`mx-auto max-w-7xl pb-7 pt-5 ${tablet ? 'px-6' : 'px-4'}`}>
                    <nav className="mb-5 flex items-center gap-1 text-sm text-tinta-500" aria-label="Você está em">
                        <Link to="/" className="hover:text-feira-700">Início</Link>
                        <ChevronRight size={14} />
                        <span className="font-semibold text-tinta-700">{filtros.departamento || (filtros.busca ? 'Busca' : 'Produtos')}</span>
                    </nav>

                    <div className="flex items-end justify-between gap-5">
                        <div className="flex items-center gap-4">
                            {IconeDepartamento && (
                                <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${estilo.cor}`}>
                                    <IconeDepartamento size={30} />
                                </span>
                            )}
                            <div>
                                <p className="font-preco text-sm font-bold uppercase tracking-[0.2em] text-oferta-500">{sobretitulo}</p>
                                <h1 className="text-4xl font-extrabold leading-tight text-feira-900">{titulo}</h1>
                                <p className="mt-1 text-sm text-tinta-500">{contagem} encontrados</p>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            {tablet && (
                                <button
                                    onClick={() => setPainelAberto('filtros')}
                                    className="flex h-11 items-center gap-2 rounded-xl border border-papel-300 bg-papel-50 px-4 text-sm font-bold text-tinta-700 hover:border-feira-400"
                                >
                                    <SlidersHorizontal size={16} /> Filtros
                                    {filtrosAtivos > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-feira-600 px-1 text-[11px] text-white">{filtrosAtivos}</span>}
                                </button>
                            )}
                            <label className="flex h-11 items-center gap-2 rounded-xl border border-papel-300 bg-papel-50 pl-4 pr-2 text-sm text-tinta-500">
                                <span>Ordenar</span>
                                <select
                                    value={filtros.ordem}
                                    onChange={e => alterar({ ordem: e.target.value })}
                                    className="h-full bg-transparent pr-1 font-bold text-tinta-900 outline-none"
                                    aria-label="Ordenar produtos"
                                >
                                    {ORDENACOES.map(opcao => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
                                </select>
                            </label>
                        </div>
                    </div>

                    {listaChips}
                </div>
            </div>

            <div className={`mx-auto max-w-7xl py-8 ${tablet ? 'px-6' : 'grid grid-cols-[250px_1fr] gap-8 px-4'}`}>
                {!tablet && (
                    <aside>
                        <div className="sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto rounded-2xl border border-papel-300 bg-papel-50 py-4 scrollbar-hide">
                            {painelFiltros}
                        </div>
                    </aside>
                )}

                <section className="min-w-0">
                    {conteudo}
                    <div className="pt-10"><Pagination currentPage={filtros.pagina} totalPages={resultado.totalPages} onPageChange={mudarPagina} /></div>
                </section>
            </div>

            {tablet && painelAberto === 'filtros' && (
                <GavetaLateral titulo="Filtrar produtos" aoFechar={() => setPainelAberto(null)}>{painelFiltros}</GavetaLateral>
            )}
        </div>
    );
};

export default Produtos;
