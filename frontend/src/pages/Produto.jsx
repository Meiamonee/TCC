import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, ExternalLink, Info, LineChart, Plus, Scale, TrendingDown, Trophy } from 'lucide-react';
import { useApp } from '../AppContext';
import { fetchComparacao, fetchHistorico, fetchProduto } from '../services/api';
import { formatarDataColeta, formatarMoeda, formatarPrecoUnidade } from '../formatar';
import SeloMercado from '../components/SeloMercado';
import GraficoHistorico from '../components/GraficoHistorico';

const Produto = () => {
    const { id } = useParams();
    const { adicionarNaLista } = useApp();
    const [estado, setEstado] = useState({ carregando: true, erro: null, produto: null, comparacao: null, historico: null });

    useEffect(() => {
        let cancelado = false;
        const carregar = async () => {
            setEstado(atual => ({ ...atual, carregando: true, erro: null }));
            try {
                const [produto, comparacao, historico] = await Promise.all([fetchProduto(id), fetchComparacao(id), fetchHistorico(id)]);
                if (!cancelado) setEstado({ carregando: false, erro: null, produto, comparacao, historico });
            } catch (error) {
                if (!cancelado) setEstado({ carregando: false, erro: error.message, produto: null, comparacao: null, historico: null });
            }
        };
        carregar();
        window.scrollTo({ top: 0 });
        return () => { cancelado = true; };
    }, [id]);

    const { carregando, erro, produto, comparacao, historico } = estado;

    if (carregando && !produto) {
        return (
            <div className="mx-auto grid max-w-7xl animate-pulse gap-8 px-4 py-8 md:grid-cols-2">
                <div className="aspect-square rounded-3xl bg-zinc-100" />
                <div className="space-y-4">
                    <div className="h-6 w-24 rounded-full bg-zinc-100" />
                    <div className="h-8 rounded bg-zinc-100" />
                    <div className="h-12 w-40 rounded bg-zinc-100" />
                </div>
            </div>
        );
    }

    if (erro || !produto) {
        return (
            <div className="mx-auto max-w-xl px-4 py-20 text-center">
                <h1 className="text-2xl font-extrabold">Produto não encontrado</h1>
                <p className="mt-2 text-zinc-500">{erro || 'Ele pode ter saído do site do supermercado.'}</p>
                <Link to="/produtos" className="mt-6 inline-block rounded-full bg-green-600 px-6 py-3 text-sm font-bold text-white">Ver produtos</Link>
            </div>
        );
    }

    const opcoes = comparacao?.equivalentes || [];
    const outros = opcoes.length - 1;
    const maisBarato = opcoes.find(item => item.maisBarato);
    const esteEhMaisBarato = maisBarato?.id === produto.id;
    const vendidoAPeso = produto.unit === 'kg';

    return (
        <div className="mx-auto max-w-7xl px-4 py-6">
            <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-zinc-500" aria-label="Você está em">
                <Link to="/" className="hover:text-green-700">Início</Link>
                <ChevronRight size={14} />
                <Link to={`/produtos?departamento=${encodeURIComponent(produto.department)}`} className="hover:text-green-700">{produto.department}</Link>
                <ChevronRight size={14} />
                <span className="line-clamp-1 font-semibold text-zinc-800">{produto.name}</span>
            </nav>

            <div className="grid gap-8 md:grid-cols-2">
                <div className="flex aspect-square items-center justify-center rounded-3xl border border-zinc-200 bg-white p-8">
                    {produto.image
                        ? <img src={produto.image} alt={produto.name} className="max-h-full max-w-full object-contain" />
                        : <span className="text-zinc-300">Sem imagem</span>}
                </div>

                <div>
                    <SeloMercado slug={produto.supermercado} nome={produto.supermercadoNome} tamanho="grande" />
                    <h1 className="mt-3 text-2xl font-extrabold leading-tight text-zinc-900 sm:text-3xl">{produto.name}</h1>
                    <p className="mt-1 text-sm text-zinc-500">{produto.department}{produto.subcategory ? ` · ${produto.subcategory}` : ''}</p>

                    <div className="mt-6 rounded-2xl bg-zinc-50 p-5">
                        {produto.originalPriceNumber && (
                            <div className="text-sm text-zinc-400 line-through">{formatarMoeda(produto.originalPriceNumber)}</div>
                        )}
                        <div className="text-4xl font-extrabold text-zinc-900">
                            {formatarMoeda(produto.priceNumber)}
                            {vendidoAPeso && <span className="text-lg font-semibold text-zinc-500"> /kg</span>}
                        </div>
                        {!vendidoAPeso && formatarPrecoUnidade(produto) && (
                            <p className="mt-1 text-sm text-zinc-500">Equivale a {formatarPrecoUnidade(produto)}</p>
                        )}
                        {produto.tag && <span className="mt-2 inline-block rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-800">{produto.tag}</span>}
                        <p className="mt-3 text-xs text-zinc-500">Preço coletado no site do {produto.supermercadoNome} em {formatarDataColeta(produto.dataColeta)}.</p>
                    </div>

                    {outros > 0 && (
                        <div className={`mt-4 flex items-start gap-3 rounded-2xl p-4 text-sm ${esteEhMaisBarato ? 'bg-green-50 text-green-900' : 'bg-yellow-50 text-yellow-900'}`}>
                            {esteEhMaisBarato ? <Trophy size={20} className="shrink-0" /> : <TrendingDown size={20} className="shrink-0" />}
                            <span>
                                {esteEhMaisBarato
                                    ? <>Este é o <strong>menor preço</strong> entre {opcoes.length} supermercados.</>
                                    : <>Encontramos mais barato no <strong>{maisBarato.supermercadoNome}</strong>: {formatarMoeda(maisBarato.priceNumber)} (economia de {formatarMoeda(produto.priceNumber - maisBarato.priceNumber)}).</>}
                            </span>
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            onClick={() => adicionarNaLista(produto)}
                            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-green-600 px-6 text-sm font-extrabold text-white shadow-sm hover:bg-green-700"
                        >
                            <Plus size={18} strokeWidth={2.5} /> Adicionar à lista
                        </button>
                        <a
                            href={produto.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-zinc-300 px-6 text-sm font-bold text-zinc-700 hover:border-green-500 hover:text-green-700"
                        >
                            Ver no site do mercado <ExternalLink size={16} />
                        </a>
                    </div>
                </div>
            </div>

            <section className="mt-12 rounded-3xl border border-zinc-200 bg-white">
                <div className="flex items-center gap-3 border-b border-zinc-100 p-5 sm:p-6">
                    <Scale className="text-green-700" />
                    <div>
                        <h2 className="text-xl font-extrabold">Compare nos supermercados</h2>
                        <p className="text-sm text-zinc-500">
                            {outros > 0 ? `O mesmo produto em ${opcoes.length} supermercados, do mais barato para o mais caro.` : 'Não encontramos este produto nos outros supermercados.'}
                        </p>
                    </div>
                </div>

                <ul className="divide-y divide-zinc-100">
                    {opcoes.map((item, posicao) => {
                        const ehEste = item.id === produto.id;
                        return (
                            <li key={item.id} className={`flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:gap-5 sm:px-6 ${item.maisBarato && outros > 0 ? 'bg-green-50/70' : ''}`}>
                                <span className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold sm:flex ${posicao === 0 ? 'bg-green-600 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                                    {posicao + 1}º
                                </span>
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    {item.image && <img src={item.image} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain" loading="lazy" />}
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <SeloMercado slug={item.supermercado} nome={item.supermercadoNome} />
                                            {ehEste && <span className="text-[11px] font-bold uppercase text-zinc-400">Produto atual</span>}
                                            {item.maisBarato && outros > 0 && <span className="text-[11px] font-extrabold uppercase text-green-700">Melhor preço</span>}
                                        </div>
                                        {ehEste
                                            ? <p className="mt-1 line-clamp-1 text-sm text-zinc-700">{item.name}</p>
                                            : <Link to={`/produto/${item.id}`} className="mt-1 line-clamp-1 text-sm text-zinc-700 hover:text-green-700">{item.name}</Link>}
                                        <p className="text-[11px] text-zinc-400">Coletado em {formatarDataColeta(item.dataColeta)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-4 sm:justify-end">
                                    <div className="text-right">
                                        <div className={`text-xl font-extrabold ${item.maisBarato && outros > 0 ? 'text-green-700' : 'text-zinc-900'}`}>{formatarMoeda(item.priceNumber)}</div>
                                        <div className="text-[11px] text-zinc-500">
                                            {item.diferenca > 0 ? <span className="font-bold text-red-600">+{formatarMoeda(item.diferenca)} </span> : null}
                                            {formatarPrecoUnidade(item) && item.unit !== 'kg' ? formatarPrecoUnidade(item) : ''}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => adicionarNaLista(item)} className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700" aria-label={`Adicionar ${item.name} do ${item.supermercadoNome} à lista`}>
                                            <Plus size={18} strokeWidth={2.5} />
                                        </button>
                                        <a href={item.url} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 hover:text-green-700" aria-label={`Abrir no site do ${item.supermercadoNome}`}>
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>

                <p className="flex items-start gap-2 border-t border-zinc-100 p-5 text-xs text-zinc-500 sm:px-6">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    Consideramos o mesmo produto quando marca, versão (zero, integral, sabor...) e tamanho da embalagem coincidem.
                </p>
            </section>

            <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                    <LineChart className="text-green-700" />
                    <div>
                        <h2 className="text-xl font-extrabold">Histórico de preço</h2>
                        <p className="text-sm text-zinc-500">Variação no {produto.supermercadoNome} nos últimos {historico?.dias || 90} dias</p>
                    </div>
                </div>
                {historico?.menorPrecoDoPeriodo && (
                    <p className="mb-3 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">Menor preço do período!</p>
                )}
                <GraficoHistorico historico={historico} />
            </section>
        </div>
    );
};

export default Produto;
