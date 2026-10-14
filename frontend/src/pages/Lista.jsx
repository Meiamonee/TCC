import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Receipt, Split, Trash2, Trophy } from 'lucide-react';
import { useApp } from '../AppContext';
import { cotarLista } from '../services/api';
import { formatarMoeda } from '../formatar';
import { corBarraDoSupermercado } from '../supermercados';
import SeloMercado from '../components/SeloMercado';
import Preco from '../components/Preco';
import { useDispositivo } from '../useDispositivo';

const valorCupom = valor => valor.toFixed(2).replace('.', ',');

const Lista = () => {
    const { lista } = useApp();
    const { itens, alterarQuantidade, alternarSimilar, limpar } = lista;
    const [mercadoAberto, setMercadoAberto] = useState(null);
    const [cotacao, setCotacao] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState(null);
    const [hoje] = useState(() => new Date().toLocaleDateString('pt-BR'));
    const mobile = useDispositivo() === 'mobile';
    const resultadoRef = useRef(null);

    const totalEstimado = itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
    const quantidadeItens = itens.reduce((soma, item) => soma + item.quantidade, 0);

    const cotar = async () => {
        setCarregando(true);
        setErro(null);
        try {
            setCotacao(await cotarLista(itens.map(item => ({
                id: item.id,
                quantidade: item.quantidade,
                aceitaSimilar: item.aceitaSimilar !== false
            }))));
            // No celular o resultado fica abaixo do cupom; leva o usuario ate ele.
            if (mobile) window.setTimeout(() => resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        } catch (error) {
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    };

    const mudarQuantidade = (id, quantidade) => {
        alterarQuantidade(id, quantidade);
        setCotacao(null);
    };

    if (itens.length === 0) {
        return (
            <div className="fundo-encarte">
                <div className="mx-auto max-w-md px-4 py-20">
                    <div className="serrilhado-baixo rotate-[-1.5deg] rounded-t-2xl bg-white px-8 pt-8 text-center font-cupom shadow-cartao">
                        <Receipt size={40} className="mx-auto text-tinta-400" strokeWidth={1.5} />
                        <p className="mt-4 text-sm tracking-[0.3em] text-tinta-500">LISTA DE COMPRAS</p>
                        <div className="linha-picotada my-4" />
                        <p className="text-sm text-tinta-700">NENHUM ITEM AINDA</p>
                        <p className="mt-2 font-sans text-sm text-tinta-500">
                            Toque no <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-feira-600 align-middle text-white"><Plus size={12} strokeWidth={3} /></span> dos produtos para montar sua lista e descobrir onde ela sai mais barata.
                        </p>
                        <div className="linha-picotada my-4" />
                        <p className="text-sm">TOTAL R$ 0,00</p>
                    </div>
                    <div className="mt-10 text-center">
                        <Link to="/produtos" className="inline-block rounded-xl bg-feira-700 px-6 py-3.5 font-display font-bold text-papel-50 shadow-cartao hover:bg-feira-800">
                            Escolher produtos
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const melhor = cotacao?.melhorMercado;
    const totalLinhas = cotacao?.itens.length || 0;
    const mercadosOrdenados = cotacao
        ? [...cotacao.porMercado].sort((a, b) => b.encontrados - a.encontrados || a.total - b.total)
        : [];

    return (
        <div className={`fundo-encarte min-h-[70vh] ${mobile ? 'pb-[76px]' : ''}`}>
            <div className={`mx-auto max-w-7xl ${mobile ? 'px-3 py-6' : 'px-6 py-10'}`}>
                <div className={mobile ? 'mb-5 px-1' : 'mb-8'}>
                    <p className="font-preco text-sm font-bold uppercase tracking-[0.2em] text-oferta-500">Minha lista</p>
                    <h1 className={`font-extrabold text-feira-900 ${mobile ? 'text-[1.7rem] leading-tight' : 'text-4xl'}`}>Onde sua compra sai mais barata?</h1>
                    <p className="mt-1 text-sm text-tinta-500">A lista fica salva neste navegador.</p>
                </div>

                <div className="grid gap-8 md:grid-cols-[minmax(0,360px)_1fr] md:items-start lg:grid-cols-[minmax(0,440px)_1fr]">
                    <section className="serrilhado-baixo rounded-t-2xl bg-white px-5 pt-6 font-cupom text-[13px] text-tinta-900 shadow-cartao sm:px-7">
                        <div className="text-center">
                            <p className="text-base font-semibold tracking-[0.3em]">SUPERPREÇO</p>
                            <p className="text-[11px] text-tinta-500">LISTA DE COMPRAS · {hoje}</p>
                        </div>
                        <div className="linha-picotada my-4" />
                        <div className="flex justify-between text-[11px] text-tinta-500">
                            <span>ITEM</span><span>QTD × UN = R$</span>
                        </div>
                        <ul className="mt-2 space-y-3">
                            {itens.map(item => (
                                <li key={item.id}>
                                    <Link to={`/produto/${item.id}`} className="line-clamp-2 uppercase hover:underline">{item.nome}</Link>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-1">
                                            <button onClick={() => mudarQuantidade(item.id, item.quantidade - 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-papel-300 text-tinta-500 hover:bg-papel-100 hover:text-oferta-600" aria-label="Diminuir quantidade">
                                                {item.quantidade === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                                            </button>
                                            <span className="w-7 text-center font-semibold">{item.quantidade}</span>
                                            <button onClick={() => mudarQuantidade(item.id, item.quantidade + 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-papel-300 text-tinta-500 hover:bg-papel-100 hover:text-feira-700" aria-label="Aumentar quantidade">
                                                <Plus size={13} />
                                            </button>
                                            <span className="ml-1 text-[11px] text-tinta-400">× {valorCupom(item.preco)} · {item.supermercadoNome}</span>
                                        </span>
                                        <span className="numeros-tabulares font-semibold">{valorCupom(item.preco * item.quantidade)}</span>
                                    </div>
                                    <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] text-tinta-500">
                                        <input
                                            type="checkbox"
                                            className="h-3.5 w-3.5 accent-feira-600"
                                            checked={item.aceitaSimilar !== false}
                                            onChange={() => { alternarSimilar(item.id); setCotacao(null); }}
                                        />
                                        ACEITO OUTRA MARCA SE NÃO TIVER
                                    </label>
                                </li>
                            ))}
                        </ul>
                        <div className="linha-picotada my-4" />
                        <div className="flex justify-between text-[11px] text-tinta-500">
                            <span>QTD. TOTAL DE ITENS</span><span>{quantidadeItens}</span>
                        </div>
                        <div className="mt-1 flex justify-between text-lg font-semibold">
                            <span>TOTAL R$</span><span className="numeros-tabulares">{valorCupom(totalEstimado)}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-tinta-400">nos mercados onde cada item foi escolhido</p>
                        <button
                            onClick={() => { limpar(); setCotacao(null); }}
                            className="mt-5 w-full rounded-lg border border-dashed border-tinta-400/50 py-2 text-xs font-semibold text-tinta-500 hover:border-oferta-500 hover:text-oferta-600"
                        >
                            ESVAZIAR LISTA
                        </button>
                    </section>

                    <section ref={resultadoRef} className="scroll-mt-[140px] space-y-5">
                        <div className={`fundo-feira rounded-[1.75rem] p-6 text-papel-50 shadow-cartao sm:p-7 ${mobile ? 'hidden' : ''}`}>
                            <h2 className="text-2xl font-extrabold">Comparar nos {cotacao?.porMercado.length || 4} supermercados</h2>
                            <p className="mt-1 text-sm text-feira-100">
                                Procuramos cada item nos outros mercados. Se um mercado não tiver o mesmo produto, usamos o similar mais barato de outra marca (quando você aceitar).
                            </p>
                            <button
                                onClick={cotar}
                                disabled={carregando}
                                className="mt-5 h-12 w-full rounded-xl bg-etiqueta-400 font-display text-[15px] font-extrabold text-feira-900 transition hover:bg-etiqueta-300 disabled:opacity-60 sm:w-auto sm:px-8"
                            >
                                {carregando ? 'Comparando...' : cotacao ? 'Comparar de novo' : 'Comparar minha lista'}
                            </button>
                        </div>

                        {erro && <p className="rounded-2xl border border-oferta-500/30 bg-oferta-100 p-4 text-sm text-oferta-700">{erro}</p>}

                        {cotacao && (
                            <>
                                <div>
                                    <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold text-feira-900">
                                        <Trophy size={19} className="text-etiqueta-500" /> Tudo num mercado só
                                    </h3>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {mercadosOrdenados.map(mercado => {
                                            const ehMelhor = melhor?.supermercado === mercado.supermercado;
                                            const temTudo = mercado.encontrados === totalLinhas;
                                            return (
                                                <div
                                                    key={mercado.supermercado}
                                                    className={`relative overflow-hidden rounded-2xl border bg-papel-50 p-4 ${ehMelhor ? 'border-feira-400 ring-2 ring-feira-400/30' : 'border-papel-300'}`}
                                                >
                                                    <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: corBarraDoSupermercado(mercado.supermercado) }} />
                                                    <div className="flex items-start justify-between gap-2">
                                                        <SeloMercado slug={mercado.supermercado} nome={mercado.supermercadoNome} />
                                                        {ehMelhor && <span className="rounded-md bg-feira-600 px-2 py-0.5 font-preco text-xs font-bold uppercase text-white">Melhor opção</span>}
                                                    </div>
                                                    <div className="mt-3">
                                                        {mercado.encontrados > 0
                                                            ? <Preco valor={mercado.total} tamanho="m" className={ehMelhor ? 'text-feira-700' : ''} />
                                                            : <span className="font-display text-lg font-bold text-tinta-400">Não encontrado</span>}
                                                    </div>
                                                    <p className="mt-1 text-xs text-tinta-500">
                                                        {mercado.encontrados === 0
                                                            ? 'Nenhum item da lista'
                                                            : <>
                                                                {temTudo ? 'Lista completa' : `${mercado.encontrados} de ${totalLinhas} itens`}
                                                                {mercado.substituicoes.length > 0 && (
                                                                    <> · <strong className="text-etiqueta-500">{mercado.substituicoes.length} similar{mercado.substituicoes.length > 1 ? 'es' : ''}</strong></>
                                                                )}
                                                            </>}
                                                    </p>
                                                    {mercado.substituicoes.length > 0 && (
                                                        <p className="mt-0.5 text-[11px] text-tinta-500">
                                                            Só itens iguais: <strong className="font-preco text-sm text-tinta-900">{formatarMoeda(mercado.totalIguais)}</strong> ({mercado.encontradosIguais} de {totalLinhas})
                                                        </p>
                                                    )}
                                                    {mercado.faltando.length > 0 && mercado.encontrados > 0 && (
                                                        <p className="mt-1 line-clamp-2 text-[11px] text-tinta-400">Falta: {mercado.faltando.join(', ')}</p>
                                                    )}
                                                    {mercado.substituicoes.length > 0 && (
                                                        <>
                                                            <button
                                                                onClick={() => setMercadoAberto(aberto => aberto === mercado.supermercado ? null : mercado.supermercado)}
                                                                className="mt-2 text-[11px] font-bold text-feira-600 hover:text-feira-800"
                                                            >
                                                                {mercadoAberto === mercado.supermercado ? 'Ocultar trocas' : 'Ver trocas'}
                                                            </button>
                                                            {mercadoAberto === mercado.supermercado && (
                                                                <ul className="mt-2 space-y-1.5 border-t border-dashed border-papel-300 pt-2">
                                                                    {mercado.substituicoes.map(troca => (
                                                                        <li key={troca.original} className="text-[11px] leading-4">
                                                                            <span className="text-tinta-400 line-through">{troca.original}</span>
                                                                            <span className="block text-tinta-700">→ {troca.substituto} <strong className="font-preco text-xs">{formatarMoeda(troca.preco)}</strong></span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="rounded-[1.75rem] border-2 border-dashed border-etiqueta-500 bg-etiqueta-100 p-5 sm:p-6">
                                    <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-feira-900"><Split size={19} /> Dividindo a compra</h3>
                                    <p className="text-sm text-tinta-700">Cada item no mercado onde ele está mais barato:</p>
                                    <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
                                        <span className="etiqueta inline-block py-2 pr-5" style={{ '--furo': '#fff6cc' }}>
                                            <Preco valor={cotacao.compraDividida.total} tamanho="m" />
                                        </span>
                                        {cotacao.compraDividida.economiaSobreMelhorMercado > 0 && (
                                            <span className="pb-1 text-sm font-bold text-feira-700">
                                                <span className="marcador">{formatarMoeda(cotacao.compraDividida.economiaSobreMelhorMercado)} a menos</span> que tudo no {melhor.supermercadoNome}
                                            </span>
                                        )}
                                    </div>
                                    <ul className="mt-4 space-y-2">
                                        {cotacao.compraDividida.itens.map(item => (
                                            <li key={item.id} className="flex items-center justify-between gap-3 border-b border-dashed border-etiqueta-500/40 pb-2 text-sm">
                                                <span className="min-w-0 text-tinta-700">
                                                    <span className="block truncate">{item.quantidade}× {item.nome}</span>
                                                    {item.tipo === 'similar' && (
                                                        <span className="block truncate text-[11px] text-tinta-500">
                                                            <span className="mr-1 rounded bg-etiqueta-400 px-1 font-bold uppercase text-feira-900">similar</span>
                                                            {item.produto}
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="flex shrink-0 items-center gap-2">
                                                    <SeloMercado slug={item.supermercado} nome={item.supermercadoNome} />
                                                    <strong className="font-preco text-base">{formatarMoeda(item.subtotal)}</strong>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </div>

            {mobile && (
                <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-t border-papel-300 bg-papel-50/95 px-4 py-2.5 shadow-[0_-8px_20px_-12px_rgba(29,27,22,.35)] backdrop-blur">
                    <div className="min-w-0 flex-1 leading-tight">
                        <p className="text-[11px] text-tinta-500">{quantidadeItens} itens na lista</p>
                        <p className="font-preco text-xl font-bold text-feira-900">{formatarMoeda(totalEstimado)}</p>
                    </div>
                    <button
                        onClick={cotar}
                        disabled={carregando}
                        className="h-11 shrink-0 rounded-xl bg-etiqueta-400 px-5 font-display text-sm font-extrabold text-feira-900 active:scale-95 disabled:opacity-60"
                    >
                        {carregando ? 'Comparando...' : cotacao ? 'Comparar de novo' : 'Onde é mais barato?'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default Lista;
