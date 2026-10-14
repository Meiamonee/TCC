import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, ExternalLink, Info, Plus } from 'lucide-react';
import { useApp } from '../AppContext';
import { fetchComparacao, fetchHistorico, fetchProduto } from '../services/api';
import { formatarDataColeta, formatarMoeda, formatarPrecoUnidade } from '../formatar';
import { corBarraDoSupermercado } from '../supermercados';
import SeloMercado from '../components/SeloMercado';
import Preco from '../components/Preco';
import GraficoHistorico from '../components/GraficoHistorico';
import ImagemProduto from '../components/ImagemProduto';
import SimilaresMaisBaratos from '../components/SimilaresMaisBaratos';
import { useDispositivo } from '../useDispositivo';

const Produto = () => {
    const { id } = useParams();
    const { adicionarNaLista } = useApp();
    const dispositivo = useDispositivo();
    const mobile = dispositivo === 'mobile';
    const tablet = dispositivo === 'tablet';
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
            <div className="mx-auto grid max-w-7xl animate-pulse gap-10 px-4 py-10 md:grid-cols-2">
                <div className="aspect-square rounded-3xl bg-papel-200" />
                <div className="space-y-4">
                    <div className="h-6 w-24 rounded bg-papel-200" />
                    <div className="h-10 rounded bg-papel-200" />
                    <div className="h-20 w-56 rounded bg-papel-200" />
                </div>
            </div>
        );
    }

    if (erro || !produto) {
        return (
            <div className="mx-auto max-w-xl px-4 py-24 text-center">
                <h1 className="text-3xl font-extrabold text-feira-900">Produto não encontrado</h1>
                <p className="mt-2 text-tinta-500">{erro || 'Ele pode ter saído do site do supermercado.'}</p>
                <Link to="/produtos" className="mt-6 inline-block rounded-xl bg-feira-700 px-6 py-3 text-sm font-bold text-papel-50">Ver produtos</Link>
            </div>
        );
    }

    const opcoes = comparacao?.equivalentes || [];
    const outros = opcoes.length - 1;
    const maisBarato = opcoes.find(item => item.maisBarato);
    const esteEhMaisBarato = maisBarato?.id === produto.id;
    const vendidoAPeso = produto.unit === 'kg';
    const maiorPreco = Math.max(...opcoes.map(item => item.priceNumber), produto.priceNumber);
    const emOferta = produto.originalPriceNumber && produto.originalPriceNumber > produto.priceNumber;

    const precoUnidade = !vendidoAPeso && formatarPrecoUnidade(produto);

    return (
        <div className={mobile ? 'pb-[76px]' : ''}>
            <div className="fundo-encarte border-b border-papel-300">
                <div className={`mx-auto max-w-7xl ${mobile ? 'px-4 pb-6 pt-3' : tablet ? 'px-6 pb-10 pt-5' : 'px-4 pb-12 pt-5'}`}>
                    <nav className={`flex flex-wrap items-center gap-1 text-tinta-500 ${mobile ? 'mb-3 text-xs' : 'mb-6 text-sm'}`} aria-label="Você está em">
                        {!mobile && <><Link to="/" className="hover:text-feira-700">Início</Link><ChevronRight size={14} /></>}
                        <Link to={`/produtos?departamento=${encodeURIComponent(produto.department)}`} className="hover:text-feira-700">{produto.department}</Link>
                        <ChevronRight size={14} />
                        <span className="line-clamp-1 font-semibold text-tinta-700">{produto.subcategory || produto.name}</span>
                    </nav>

                    <div className={`grid ${mobile ? 'gap-5' : tablet ? 'grid-cols-[0.85fr_1.15fr] gap-7' : 'grid-cols-[1fr_1.1fr] gap-10'}`}>
                        <div className={`relative flex items-center justify-center border border-papel-300 bg-white shadow-cartao ${mobile ? 'aspect-[4/3] rounded-3xl p-6' : 'aspect-square rounded-[2rem] p-10'}`}>
                            <ImagemProduto src={produto.image} alt={produto.name} className="max-h-full max-w-full rounded-2xl object-contain" tamanhoIcone={64} />
                            {emOferta && (
                                <span className="absolute left-5 top-5 rotate-[-8deg] rounded-lg bg-oferta-500 px-3 py-1.5 font-preco text-xl font-extrabold uppercase text-white shadow-lg">
                                    Oferta
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <SeloMercado slug={produto.supermercado} nome={produto.supermercadoNome} tamanho="grande" />
                                <span className="text-xs text-tinta-500">{produto.subcategory || produto.department}</span>
                            </div>
                            <h1 className={`mt-3 font-extrabold leading-[1.1] text-feira-900 ${mobile ? 'text-[1.6rem]' : tablet ? 'text-3xl' : 'text-[2.6rem]'}`}>{produto.name}</h1>

                            <div className={`flex flex-wrap items-end gap-x-6 gap-y-3 ${mobile ? 'mt-5' : 'mt-7'}`}>
                                <div className={`etiqueta inline-block ${mobile ? 'py-2 pr-5' : 'py-3 pr-6'} ${emOferta ? 'etiqueta-oferta' : ''}`} style={{ '--furo': '#fbf7ef' }}>
                                    <Preco valor={produto.priceNumber} tamanho={mobile ? 'm' : 'g'} sufixo={vendidoAPeso ? 'kg' : undefined} />
                                </div>
                                <div className="pb-1 text-sm text-tinta-500">
                                    {emOferta && <p>de <span className="line-through">{formatarMoeda(produto.originalPriceNumber)}</span></p>}
                                    {precoUnidade && <p>equivale a <strong className="text-tinta-900">{precoUnidade}</strong></p>}
                                    {produto.tag && <p className="font-bold text-feira-700">{produto.tag}</p>}
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-tinta-500">Preço coletado no site do {produto.supermercadoNome} em {formatarDataColeta(produto.dataColeta)}.</p>

                            {outros > 0 && (
                                <div className={`mt-6 rounded-2xl border-l-4 p-4 text-[15px] ${esteEhMaisBarato ? 'border-feira-500 bg-feira-50 text-feira-900' : 'border-etiqueta-500 bg-etiqueta-100 text-tinta-900'}`}>
                                    {esteEhMaisBarato
                                        ? <>Boa escolha: este é o <strong>menor preço</strong> entre os {opcoes.length} supermercados que vendem este produto.</>
                                        : <>No <strong>{maisBarato.supermercadoNome}</strong> sai por <strong>{formatarMoeda(maisBarato.priceNumber)}</strong> — <span className="marcador font-bold">{formatarMoeda(produto.priceNumber - maisBarato.priceNumber)} a menos</span>.</>}
                                </div>
                            )}

                            <div className={`mt-8 flex flex-wrap gap-3 ${mobile ? 'hidden' : ''}`}>
                                <button
                                    onClick={() => adicionarNaLista(produto)}
                                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-feira-700 px-6 font-display text-[15px] font-bold text-papel-50 shadow-cartao transition hover:bg-feira-800"
                                >
                                    <Plus size={19} strokeWidth={2.75} /> Adicionar à lista
                                </button>
                                <a
                                    href={produto.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-papel-300 bg-papel-50 px-5 text-sm font-bold text-tinta-700 transition hover:border-feira-400 hover:text-feira-700"
                                >
                                    Site do mercado <ExternalLink size={15} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`mx-auto max-w-7xl ${mobile ? 'space-y-8 px-4 py-7' : tablet ? 'space-y-10 px-6 py-10' : 'space-y-10 px-4 py-12'}`}>
                <section>
                    <p className="font-preco text-sm font-bold uppercase tracking-[0.2em] text-oferta-500">Comparação</p>
                    <h2 className={`font-extrabold text-feira-900 ${mobile ? 'text-[1.4rem]' : 'text-[2rem]'}`}>
                        {outros > 0 ? `Em ${opcoes.length} supermercados` : 'Só encontramos neste supermercado'}
                    </h2>
                    <p className="mt-1 text-sm text-tinta-500">
                        {outros > 0 ? 'Do mais barato para o mais caro.' : 'Os outros mercados não vendem este mesmo produto pelo site. Veja abaixo as opções parecidas de outras marcas.'}
                    </p>

                    <ol className="mt-6 space-y-3">
                        {opcoes.map((item, posicao) => {
                            const ehEste = item.id === produto.id;
                            const primeiro = posicao === 0 && outros > 0;
                            if (mobile) {
                                return (
                                    <li key={item.id} className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-papel-50 p-3 ${primeiro ? 'border-feira-300 shadow-cartao' : 'border-papel-300'}`}>
                                        <span className={`w-7 shrink-0 text-center font-preco text-2xl font-extrabold ${primeiro ? 'text-feira-600' : 'text-papel-300'}`}>{posicao + 1}º</span>
                                        {(() => {
                                            const conteudo = (
                                                <>
                                                    <span className="flex flex-wrap items-center gap-1.5">
                                                        <SeloMercado slug={item.supermercado} nome={item.supermercadoNome} />
                                                        {ehEste && <span className="text-[10px] font-bold uppercase text-tinta-400">este</span>}
                                                    </span>
                                                    <span className="mt-1 block line-clamp-2 text-[12.5px] leading-[1.1rem] text-tinta-700">{item.name}</span>
                                                </>
                                            );
                                            return ehEste
                                                ? <div className="min-w-0 flex-1">{conteudo}</div>
                                                : <Link to={`/produto/${item.id}`} className="min-w-0 flex-1">{conteudo}</Link>;
                                        })()}
                                        <span className="shrink-0 text-right">
                                            <Preco valor={item.priceNumber} tamanho="p" className={primeiro ? 'text-feira-700' : ''} />
                                            {item.diferenca > 0 && <span className="block font-preco text-xs font-bold text-oferta-600">+{formatarMoeda(item.diferenca)}</span>}
                                        </span>
                                        <button onClick={() => adicionarNaLista(item)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-feira-600 text-white active:scale-90" aria-label={`Adicionar ${item.name} do ${item.supermercadoNome} à lista`}>
                                            <Plus size={17} strokeWidth={2.75} />
                                        </button>
                                    </li>
                                );
                            }
                            return (
                                <li
                                    key={item.id}
                                    className={`relative overflow-hidden rounded-2xl border bg-papel-50 p-5 ${primeiro ? 'border-feira-300 shadow-cartao' : 'border-papel-300'}`}
                                >
                                    <span
                                        className="absolute inset-y-0 left-0 opacity-[0.07]"
                                        style={{ width: `${(item.priceNumber / maiorPreco) * 100}%`, background: corBarraDoSupermercado(item.supermercado) }}
                                        aria-hidden="true"
                                    />
                                    <div className="relative flex items-center gap-4">
                                        <span className={`font-preco text-5xl font-extrabold leading-none ${primeiro ? 'text-feira-600' : 'text-papel-300'}`}>
                                            {posicao + 1}º
                                        </span>
                                        <div className="flex min-w-0 flex-1 items-center gap-4">
                                            <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
                                                <ImagemProduto src={item.image} alt="" className="h-full w-full object-contain p-1" tamanhoIcone={22} />
                                            </span>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <SeloMercado slug={item.supermercado} nome={item.supermercadoNome} />
                                                    {ehEste && <span className="text-[11px] font-bold uppercase tracking-wide text-tinta-400">você está vendo</span>}
                                                </div>
                                                {ehEste
                                                    ? <p className="mt-1 line-clamp-1 text-sm text-tinta-700">{item.name}</p>
                                                    : <Link to={`/produto/${item.id}`} className="mt-1 line-clamp-1 text-sm text-tinta-700 hover:text-feira-700">{item.name}</Link>}
                                                <p className="text-[11px] text-tinta-400">coletado em {formatarDataColeta(item.dataColeta)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end gap-5">
                                            <div className="text-right">
                                                <Preco valor={item.priceNumber} tamanho="m" className={primeiro ? 'text-feira-700' : ''} />
                                                <div className="text-[11px] text-tinta-500">
                                                    {item.diferenca > 0 && <span className="font-bold text-oferta-600">+{formatarMoeda(item.diferenca)} </span>}
                                                    {item.unit !== 'kg' && formatarPrecoUnidade(item)}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => adicionarNaLista(item)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-feira-600 text-white hover:bg-feira-700" aria-label={`Adicionar ${item.name} do ${item.supermercadoNome} à lista`}>
                                                    <Plus size={18} strokeWidth={2.75} />
                                                </button>
                                                <a href={item.url} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl border border-papel-300 bg-white text-tinta-500 hover:text-feira-700" aria-label={`Abrir no site do ${item.supermercadoNome}`}>
                                                    <ExternalLink size={16} />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>

                    <p className="mt-4 flex items-start gap-2 text-xs text-tinta-500">
                        <Info size={14} className="mt-0.5 shrink-0" />
                        Consideramos o mesmo produto quando marca, versão (zero, integral, sabor...) e tamanho da embalagem coincidem.
                    </p>
                </section>

                <SimilaresMaisBaratos produto={produto} />

                <section className="rounded-[2rem] border border-papel-300 bg-papel-50 p-5 sm:p-8">
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="font-preco text-sm font-bold uppercase tracking-[0.2em] text-oferta-500">Histórico</p>
                            <h2 className="text-2xl font-extrabold text-feira-900">Como o preço variou</h2>
                            <p className="text-sm text-tinta-500">No {produto.supermercadoNome}, nos últimos {historico?.dias || 90} dias</p>
                        </div>
                        {historico?.menorPrecoDoPeriodo && (
                            <span className="rounded-lg bg-feira-600 px-3 py-1.5 font-preco text-sm font-bold uppercase tracking-wide text-white">Menor preço do período</span>
                        )}
                    </div>
                    <GraficoHistorico historico={historico} />
                </section>
            </div>

            {mobile && (
                <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-t border-papel-300 bg-papel-50/95 px-4 py-2.5 shadow-[0_-8px_20px_-12px_rgba(29,27,22,.35)] backdrop-blur">
                    <div className="min-w-0 flex-1">
                        <Preco valor={produto.priceNumber} tamanho="p" sufixo={vendidoAPeso ? 'kg' : undefined} className={emOferta ? 'text-oferta-600' : 'text-feira-900'} />
                        <p className="truncate text-[11px] text-tinta-500">{produto.supermercadoNome}{precoUnidade ? ` · ${precoUnidade}` : ''}</p>
                    </div>
                    <a href={produto.url} target="_blank" rel="noreferrer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-papel-300 bg-white text-tinta-500" aria-label="Abrir no site do mercado">
                        <ExternalLink size={17} />
                    </a>
                    <button onClick={() => adicionarNaLista(produto)} className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-feira-700 px-4 font-display text-sm font-bold text-papel-50 active:scale-95">
                        <Plus size={17} strokeWidth={2.75} /> Adicionar
                    </button>
                </div>
            )}
        </div>
    );
};

export default Produto;
