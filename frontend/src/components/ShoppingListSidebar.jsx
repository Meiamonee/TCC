import React, { useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { cotarLista } from '../services/api';
import { formatarMoeda } from '../formatar';

const ShoppingListSidebar = ({ isOpen, onClose, lista }) => {
    const { itens, alterarQuantidade, limpar } = lista;
    const [cotacao, setCotacao] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState(null);

    if (!isOpen) return null;

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

    const melhor = cotacao?.melhorMercado;
    const totalItens = cotacao?.itens.length || 0;

    return (
        <>
            <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="fixed right-0 top-0 z-50 h-full w-full overflow-y-auto bg-white shadow-2xl md:w-[460px]">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Lista de compras</h2>
                        <p className="mt-0.5 text-xs text-slate-500">Descubra onde sua compra sai mais barata</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Fechar">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6 p-6">
                    {itens.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                            <ShoppingCart className="mx-auto mb-2 text-slate-300" size={28} />
                            <p className="text-sm font-medium text-slate-500">Sua lista está vazia</p>
                            <p className="mt-1 text-xs text-slate-400">Use o botão + nos produtos para adicionar</p>
                        </div>
                    ) : (
                        <>
                            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                                {itens.map(item => (
                                    <li key={item.id} className="flex items-center gap-3 p-3">
                                        <div className="h-12 w-12 flex-shrink-0 rounded bg-slate-50 p-1">
                                            {item.imagem && <img src={item.imagem} alt="" className="h-full w-full object-contain mix-blend-multiply" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="line-clamp-2 text-sm text-slate-800">{item.nome}</p>
                                            <p className="text-[11px] text-slate-400">{item.supermercadoNome} · {formatarMoeda(item.preco)}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => mudarQuantidade(item.id, item.quantidade - 1)} className="rounded border border-slate-200 p-1 text-slate-500" aria-label="Diminuir quantidade">
                                                {item.quantidade === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                                            </button>
                                            <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.quantidade}</span>
                                            <button onClick={() => mudarQuantidade(item.id, item.quantidade + 1)} className="rounded border border-slate-200 p-1 text-slate-500" aria-label="Aumentar quantidade">
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex gap-2">
                                <button
                                    onClick={cotar}
                                    disabled={carregando}
                                    className="flex h-11 flex-1 items-center justify-center rounded bg-violet-700 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
                                >
                                    {carregando ? 'Cotando...' : 'Comparar a lista nos supermercados'}
                                </button>
                                <button
                                    onClick={() => { limpar(); setCotacao(null); }}
                                    className="h-11 rounded border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Limpar
                                </button>
                            </div>
                        </>
                    )}

                    {erro && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erro}</p>}

                    {cotacao && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Total por supermercado</h3>
                            <div className="space-y-2">
                                {[...cotacao.porMercado]
                                    .sort((a, b) => b.encontrados - a.encontrados || a.total - b.total)
                                    .map(mercado => {
                                        const ehMelhor = melhor && mercado.supermercado === melhor.supermercado;
                                        return (
                                            <div key={mercado.supermercado} className={`rounded-lg border p-3 ${ehMelhor ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200'}`}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-slate-800">{mercado.supermercadoNome}</span>
                                                    <span className={`text-base font-bold ${ehMelhor ? 'text-emerald-700' : 'text-slate-900'}`}>{formatarMoeda(mercado.total)}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500">
                                                    {mercado.encontrados} de {totalItens} itens
                                                    {mercado.faltando.length > 0 && ` · faltam: ${mercado.faltando.join(', ')}`}
                                                </p>
                                            </div>
                                        );
                                    })}
                            </div>

                            <div className="rounded-xl bg-violet-50 p-4">
                                <h3 className="text-sm font-bold text-violet-900">Comprando cada item onde é mais barato</h3>
                                <p className="mt-1 text-2xl font-bold text-violet-900">{formatarMoeda(cotacao.compraDividida.total)}</p>
                                {cotacao.compraDividida.economiaSobreMelhorMercado > 0 && (
                                    <p className="text-xs font-semibold text-violet-700">
                                        {formatarMoeda(cotacao.compraDividida.economiaSobreMelhorMercado)} a menos que comprar tudo em {melhor.supermercadoNome}
                                    </p>
                                )}
                                <ul className="mt-3 space-y-1">
                                    {cotacao.compraDividida.itens.map(item => (
                                        <li key={item.id} className="flex justify-between gap-2 text-xs text-violet-900">
                                            <span className="truncate">{item.quantidade}× {item.nome}</span>
                                            <span className="shrink-0 font-semibold">{item.supermercadoNome} · {formatarMoeda(item.subtotal)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ShoppingListSidebar;
