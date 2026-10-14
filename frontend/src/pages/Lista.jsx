import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Split, Trash2, Trophy } from 'lucide-react';
import { useApp } from '../AppContext';
import { cotarLista } from '../services/api';
import { formatarMoeda } from '../formatar';
import SeloMercado from '../components/SeloMercado';

const Lista = () => {
    const { lista } = useApp();
    const { itens, alterarQuantidade, limpar } = lista;
    const [cotacao, setCotacao] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState(null);

    const totalEstimado = itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
    const quantidadeItens = itens.reduce((soma, item) => soma + item.quantidade, 0);

    const cotar = async () => {
        setCarregando(true);
        setErro(null);
        try {
            setCotacao(await cotarLista(itens.map(item => ({ id: item.id, quantidade: item.quantidade }))));
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
            <div className="mx-auto max-w-xl px-4 py-20 text-center">
                <span className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <ShoppingCart size={36} />
                </span>
                <h1 className="text-2xl font-extrabold">Sua lista de compras está vazia</h1>
                <p className="mt-2 text-zinc-500">
                    Adicione produtos com o botão <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-600 align-middle text-white"><Plus size={12} /></span> e descubra em qual supermercado sua compra sai mais barata.
                </p>
                <Link to="/produtos" className="mt-6 inline-block rounded-full bg-green-600 px-6 py-3 text-sm font-extrabold text-white hover:bg-green-700">
                    Escolher produtos
                </Link>
            </div>
        );
    }

    const melhor = cotacao?.melhorMercado;
    const totalLinhas = cotacao?.itens.length || 0;
    const mercadosOrdenados = cotacao
        ? [...cotacao.porMercado].sort((a, b) => b.encontrados - a.encontrados || a.total - b.total)
        : [];

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold sm:text-3xl">Minha lista de compras</h1>
                    <p className="text-sm text-zinc-500">{quantidadeItens} itens · a lista fica salva neste navegador</p>
                </div>
                <button onClick={() => { limpar(); setCotacao(null); }} className="flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-red-600">
                    <Trash2 size={16} /> Esvaziar lista
                </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
                <section className="rounded-3xl border border-zinc-200 bg-white">
                    <ul className="divide-y divide-zinc-100">
                        {itens.map(item => (
                            <li key={item.id} className="flex items-center gap-4 p-4 sm:p-5">
                                <Link to={`/produto/${item.id}`} className="h-16 w-16 shrink-0 rounded-xl bg-white p-1 ring-1 ring-zinc-100">
                                    {item.imagem && <img src={item.imagem} alt="" className="h-full w-full object-contain" />}
                                </Link>
                                <div className="min-w-0 flex-1">
                                    <Link to={`/produto/${item.id}`} className="line-clamp-2 text-sm font-semibold text-zinc-800 hover:text-green-700">{item.nome}</Link>
                                    <p className="text-xs text-zinc-500">Escolhido no {item.supermercadoNome} · {formatarMoeda(item.preco)} cada</p>
                                </div>
                                <div className="flex items-center rounded-full border border-zinc-300">
                                    <button onClick={() => mudarQuantidade(item.id, item.quantidade - 1)} className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100" aria-label="Diminuir quantidade">
                                        {item.quantidade === 1 ? <Trash2 size={15} /> : <Minus size={15} />}
                                    </button>
                                    <span className="w-7 text-center text-sm font-extrabold tabular-nums">{item.quantidade}</span>
                                    <button onClick={() => mudarQuantidade(item.id, item.quantidade + 1)} className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100" aria-label="Aumentar quantidade">
                                        <Plus size={15} />
                                    </button>
                                </div>
                                <div className="hidden w-24 text-right text-sm font-extrabold sm:block">{formatarMoeda(item.preco * item.quantidade)}</div>
                            </li>
                        ))}
                    </ul>
                    <div className="flex items-center justify-between border-t border-zinc-100 p-5 text-sm">
                        <span className="text-zinc-500">Total nos mercados escolhidos</span>
                        <span className="text-lg font-extrabold">{formatarMoeda(totalEstimado)}</span>
                    </div>
                </section>

                <aside className="space-y-4">
                    <div className="rounded-3xl bg-green-700 p-6 text-white">
                        <h2 className="text-lg font-extrabold">Onde comprar mais barato?</h2>
                        <p className="mt-1 text-sm text-green-100">Comparamos cada item da sua lista nos {cotacao?.porMercado.length || 4} supermercados.</p>
                        <button
                            onClick={cotar}
                            disabled={carregando}
                            className="mt-4 h-12 w-full rounded-full bg-yellow-400 text-sm font-extrabold text-green-950 hover:bg-yellow-300 disabled:opacity-60"
                        >
                            {carregando ? 'Comparando...' : cotacao ? 'Comparar novamente' : 'Comparar minha lista'}
                        </button>
                    </div>

                    {erro && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</p>}

                    {cotacao && (
                        <>
                            <div className="rounded-3xl border border-zinc-200 bg-white p-5">
                                <h3 className="mb-3 flex items-center gap-2 font-extrabold"><Trophy size={18} className="text-yellow-500" /> Tudo em um só mercado</h3>
                                <ul className="space-y-2">
                                    {mercadosOrdenados.map(mercado => {
                                        const ehMelhor = melhor?.supermercado === mercado.supermercado;
                                        return (
                                            <li key={mercado.supermercado} className={`rounded-2xl border p-3 ${ehMelhor ? 'border-green-300 bg-green-50' : 'border-zinc-200'}`}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <SeloMercado slug={mercado.supermercado} nome={mercado.supermercadoNome} />
                                                    {mercado.encontrados > 0
                                                        ? <span className={`text-lg font-extrabold ${ehMelhor ? 'text-green-700' : ''}`}>{formatarMoeda(mercado.total)}</span>
                                                        : <span className="text-sm font-semibold text-zinc-400">Não encontrado</span>}
                                                </div>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {mercado.encontrados === totalLinhas
                                                        ? 'Tem todos os itens'
                                                        : mercado.encontrados === 0 ? 'Nenhum item da lista neste mercado' : `Tem ${mercado.encontrados} de ${totalLinhas} itens`}
                                                </p>
                                                {mercado.faltando.length > 0 && mercado.encontrados > 0 && (
                                                    <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-400">Falta: {mercado.faltando.join(', ')}</p>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <div className="rounded-3xl border-2 border-yellow-300 bg-yellow-50 p-5">
                                <h3 className="flex items-center gap-2 font-extrabold"><Split size={18} /> Dividindo a compra</h3>
                                <p className="text-sm text-zinc-600">Cada item no mercado onde está mais barato:</p>
                                <p className="mt-2 text-3xl font-extrabold text-zinc-900">{formatarMoeda(cotacao.compraDividida.total)}</p>
                                {cotacao.compraDividida.economiaSobreMelhorMercado > 0 && (
                                    <p className="text-sm font-bold text-green-700">
                                        Economia de {formatarMoeda(cotacao.compraDividida.economiaSobreMelhorMercado)} em relação a comprar tudo no {melhor.supermercadoNome}
                                    </p>
                                )}
                                <ul className="mt-3 space-y-1.5">
                                    {cotacao.compraDividida.itens.map(item => (
                                        <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
                                            <span className="truncate text-zinc-700">{item.quantidade}× {item.nome}</span>
                                            <span className="flex shrink-0 items-center gap-1.5">
                                                <SeloMercado slug={item.supermercado} nome={item.supermercadoNome} />
                                                <strong>{formatarMoeda(item.subtotal)}</strong>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default Lista;
