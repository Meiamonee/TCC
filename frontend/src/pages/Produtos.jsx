import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { fetchProducts } from '../services/api';
import { estiloDepartamento } from '../departamentos';
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

const OpcaoFiltro = ({ ativo, onClick, children, contagem }) => (
    <button
        onClick={onClick}
        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${ativo ? 'bg-green-50 font-bold text-green-800' : 'text-zinc-700 hover:bg-zinc-50'}`}
    >
        <span className="flex items-center gap-2">
            <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${ativo ? 'border-green-600 bg-green-600 ring-2 ring-inset ring-white' : 'border-zinc-300'}`} />
            {children}
        </span>
        {contagem !== undefined && <span className="text-xs text-zinc-400">{contagem.toLocaleString('pt-BR')}</span>}
    </button>
);

const Produtos = () => {
    const { supermercados, departamentos } = useApp();
    const [params, setParams] = useSearchParams();
    const [resultado, setResultado] = useState({ data: [], total: 0, totalPages: 0 });
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);
    const [filtrosAbertos, setFiltrosAbertos] = useState(false);

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
        setFiltrosAbertos(false);
    };

    const mudarPagina = pagina => {
        alterar({ pagina }, { manterPagina: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const nomeMercado = supermercados.find(item => item.slug === filtros.mercado)?.nome;
    const titulo = filtros.busca
        ? `Resultados para "${filtros.busca}"`
        : filtros.ofertas ? 'Ofertas' : filtros.departamento || (nomeMercado ? `Produtos do ${nomeMercado}` : 'Todos os produtos');
    const IconeDepartamento = filtros.departamento ? estiloDepartamento(filtros.departamento).icone : null;

    const chips = [
        filtros.busca && { rotulo: `Busca: ${filtros.busca}`, limpar: { busca: '' } },
        filtros.departamento && { rotulo: filtros.departamento, limpar: { departamento: '' } },
        nomeMercado && { rotulo: nomeMercado, limpar: { mercado: '' } },
        filtros.alimentos && { rotulo: 'Apenas alimentos', limpar: { alimentos: false } },
        filtros.ofertas && { rotulo: 'Em oferta', limpar: { ofertas: false } }
    ].filter(Boolean);

    const painelFiltros = (
        <div className="space-y-6">
            <div>
                <h3 className="mb-2 px-3 text-xs font-extrabold uppercase tracking-wide text-zinc-500">Supermercado</h3>
                <OpcaoFiltro ativo={!filtros.mercado} onClick={() => alterar({ mercado: '' })}>Todos</OpcaoFiltro>
                {supermercados.map(mercado => (
                    <OpcaoFiltro key={mercado.slug} ativo={filtros.mercado === mercado.slug} onClick={() => alterar({ mercado: mercado.slug })} contagem={mercado.totalProdutos}>
                        {mercado.nome}
                    </OpcaoFiltro>
                ))}
            </div>

            <div>
                <h3 className="mb-2 px-3 text-xs font-extrabold uppercase tracking-wide text-zinc-500">Departamento</h3>
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
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">Mostrar</h3>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                    <input type="checkbox" className="h-4 w-4 accent-green-600" checked={filtros.alimentos} onChange={e => alterar({ alimentos: e.target.checked, departamento: '' })} />
                    Apenas alimentos
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                    <input type="checkbox" className="h-4 w-4 accent-green-600" checked={filtros.ofertas} onChange={e => alterar({ ofertas: e.target.checked })} />
                    Apenas ofertas
                </label>
            </div>
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl px-4 py-6">
            <nav className="mb-4 flex items-center gap-1 text-sm text-zinc-500" aria-label="Você está em">
                <Link to="/" className="hover:text-green-700">Início</Link>
                <ChevronRight size={14} />
                <span className="font-semibold text-zinc-800">{filtros.departamento || (filtros.busca ? 'Busca' : 'Produtos')}</span>
            </nav>

            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-3">
                    {IconeDepartamento && (
                        <span className={`flex h-12 w-12 items-center justify-center rounded-full ${estiloDepartamento(filtros.departamento).cor}`}>
                            <IconeDepartamento size={24} />
                        </span>
                    )}
                    <div>
                        <h1 className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">{titulo}</h1>
                        <p className="text-sm text-zinc-500">
                            {carregando && resultado.total === 0 ? 'Carregando...' : `${resultado.total.toLocaleString('pt-BR')} produtos encontrados`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFiltrosAbertos(true)}
                        className="flex h-10 items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 lg:hidden"
                    >
                        <SlidersHorizontal size={16} /> Filtrar
                    </button>
                    <label className="flex h-10 items-center gap-2 rounded-full border border-zinc-300 bg-white pl-4 pr-2 text-sm text-zinc-600">
                        <span className="hidden sm:inline">Ordenar:</span>
                        <select
                            value={filtros.ordem}
                            onChange={e => alterar({ ordem: e.target.value })}
                            className="h-full bg-transparent pr-1 font-semibold text-zinc-800 outline-none"
                            aria-label="Ordenar produtos"
                        >
                            {ORDENACOES.map(opcao => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
                        </select>
                    </label>
                </div>
            </div>

            {chips.length > 0 && (
                <div className="mb-5 flex flex-wrap items-center gap-2">
                    {chips.map(chip => (
                        <button
                            key={chip.rotulo}
                            onClick={() => alterar(chip.limpar)}
                            className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 hover:bg-green-200"
                        >
                            {chip.rotulo} <X size={13} />
                        </button>
                    ))}
                    <button onClick={() => setParams(new URLSearchParams())} className="text-xs font-bold text-zinc-500 underline hover:text-zinc-800">
                        Limpar tudo
                    </button>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                <aside className="hidden lg:block">
                    <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white py-4">
                        {painelFiltros}
                    </div>
                </aside>

                <section className="min-w-0">
                    {erro ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                            Não foi possível carregar os produtos ({erro}). Verifique se a API está rodando e tente novamente.
                        </div>
                    ) : (
                        <ProductList
                            products={resultado.data}
                            carregando={carregando}
                            vazio={
                                <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
                                    <p className="text-lg font-extrabold text-zinc-800">Nenhum produto encontrado</p>
                                    <p className="mt-1 text-sm text-zinc-500">Tente outra palavra, confira a ortografia ou remova algum filtro.</p>
                                    <button onClick={() => setParams(new URLSearchParams())} className="mt-4 rounded-full bg-green-600 px-5 py-2 text-sm font-bold text-white hover:bg-green-700">
                                        Ver todos os produtos
                                    </button>
                                </div>
                            }
                        />
                    )}
                    <div className="pt-8">
                        <Pagination currentPage={filtros.pagina} totalPages={resultado.totalPages} onPageChange={mudarPagina} />
                    </div>
                </section>
            </div>

            {filtrosAbertos && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button className="absolute inset-0 bg-black/40" onClick={() => setFiltrosAbertos(false)} aria-label="Fechar filtros" />
                    <aside className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white pb-8 pt-4 shadow-2xl">
                        <div className="mb-2 flex items-center justify-between px-5">
                            <span className="text-lg font-extrabold">Filtrar produtos</span>
                            <button onClick={() => setFiltrosAbertos(false)} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100" aria-label="Fechar filtros">
                                <X size={20} />
                            </button>
                        </div>
                        {painelFiltros}
                    </aside>
                </div>
            )}
        </div>
    );
};

export default Produtos;
