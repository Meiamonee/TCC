import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, Plus, TrendingDown, X } from 'lucide-react';
import { fetchComparacao, fetchHistorico } from '../services/api';
import { formatarDataColeta, formatarMoeda, formatarPrecoUnidade } from '../formatar';

// Grafico simples da variacao de preco do produto ao longo do tempo.
const HistoricoGrafico = ({ historico }) => {
    const pontos = historico.pontos || [];

    if (pontos.length < 2) {
        return (
            <p className="text-xs text-slate-500">
                Ainda sem variação registrada. O histórico é montado a cada coleta automática.
            </p>
        );
    }

    const largura = 360;
    const altura = 80;
    const tempos = pontos.map(p => new Date(p.data).getTime());
    const precos = pontos.map(p => p.preco);
    const [tMin, tMax] = [Math.min(...tempos), Math.max(...tempos)];
    const [pMin, pMax] = [Math.min(...precos), Math.max(...precos)];
    const x = t => ((t - tMin) / Math.max(tMax - tMin, 1)) * (largura - 8) + 4;
    const y = p => altura - 6 - ((p - pMin) / Math.max(pMax - pMin, 0.01)) * (altura - 12);
    // Degraus: o preco vale ate a proxima mudanca.
    const caminho = pontos.map((p, i) => {
        const px = x(tempos[i]);
        const py = y(p.preco);
        return i === 0 ? `M${px},${py}` : `H${px} V${py}`;
    }).join(' ');

    return (
        <div>
            <svg viewBox={`0 0 ${largura} ${altura}`} className="h-20 w-full" role="img" aria-label="Histórico de preço">
                <path d={caminho} fill="none" stroke="#6d28d9" strokeWidth="2" />
            </svg>
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                <span>Menor: {formatarMoeda(historico.menorPreco)}</span>
                <span>Maior: {formatarMoeda(historico.maiorPreco)}</span>
            </div>
        </div>
    );
};

const ComparisonSidebar = ({ isOpen, onClose, selectedProduct, onAddToList }) => {
    const [estado, setEstado] = useState({ carregando: false, erro: null, comparacao: null, historico: null });
    const produtoId = selectedProduct?.id;

    useEffect(() => {
        if (!isOpen || !produtoId) return undefined;
        let cancelado = false;

        const carregar = async () => {
            setEstado({ carregando: true, erro: null, comparacao: null, historico: null });
            try {
                const [comparacao, historico] = await Promise.all([fetchComparacao(produtoId), fetchHistorico(produtoId)]);
                if (!cancelado) setEstado({ carregando: false, erro: null, comparacao, historico });
            } catch (error) {
                if (!cancelado) setEstado({ carregando: false, erro: error.message, comparacao: null, historico: null });
            }
        };

        carregar();
        return () => { cancelado = true; };
    }, [isOpen, produtoId]);

    if (!isOpen || !selectedProduct) return null;

    const { carregando, erro, comparacao, historico } = estado;
    const equivalentes = comparacao?.equivalentes || [];
    const outrosMercados = equivalentes.length - 1;

    return (
        <>
            <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="fixed right-0 top-0 z-50 h-full w-full overflow-y-auto bg-white shadow-2xl md:w-[460px]">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Comparar preços</h2>
                        <p className="mt-0.5 text-xs text-slate-500">O mesmo produto nos outros supermercados</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" aria-label="Fechar">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-8 p-6">
                    <div className="flex gap-4 rounded-xl border border-slate-200 p-4">
                        <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-slate-50 p-2">
                            {selectedProduct.image && <img src={selectedProduct.image} alt={selectedProduct.name} className="h-full w-full object-contain mix-blend-multiply" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="mb-1 text-[10px] font-bold uppercase text-violet-700">{selectedProduct.supermercadoNome}</div>
                            <h4 className="mb-1 line-clamp-2 text-sm font-medium text-slate-900">{selectedProduct.name}</h4>
                            <div className="text-xl font-bold text-slate-900">{formatarMoeda(selectedProduct.priceNumber)}</div>
                        </div>
                    </div>

                    {carregando && <p className="text-sm font-medium text-slate-500">Procurando nos outros supermercados...</p>}
                    {erro && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erro}</p>}

                    {comparacao && (
                        <div>
                            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                {outrosMercados > 0 ? `Encontrado em ${equivalentes.length} supermercados` : 'Não encontrado em outros supermercados'}
                            </h3>

                            {outrosMercados > 0 && comparacao.economiaMaxima > 0 && (
                                <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                                    <TrendingDown size={16} />
                                    Economia de até {formatarMoeda(comparacao.economiaMaxima)} escolhendo o mais barato
                                </div>
                            )}

                            <div className="space-y-3">
                                {equivalentes.map(item => (
                                    <div
                                        key={item.id}
                                        className={`rounded-xl border p-4 ${item.maisBarato ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}
                                    >
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-700">
                                                {item.supermercadoNome}
                                            </span>
                                            {item.maisBarato && (
                                                <span className="flex items-center gap-1 rounded-full border border-emerald-100 bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                                    <Check size={12} strokeWidth={3} />
                                                    MELHOR PREÇO
                                                </span>
                                            )}
                                        </div>
                                        <p className="mb-1 line-clamp-2 text-sm text-slate-600">{item.name}</p>
                                        <div className="flex items-end justify-between gap-2">
                                            <div>
                                                <span className={`text-lg font-bold ${item.maisBarato ? 'text-emerald-700' : 'text-slate-900'}`}>
                                                    {formatarMoeda(item.priceNumber)}
                                                </span>
                                                {item.diferenca > 0 && (
                                                    <span className="ml-2 text-xs font-medium text-red-500">+{formatarMoeda(item.diferenca)}</span>
                                                )}
                                                <div className="text-[11px] text-slate-500">
                                                    {[formatarPrecoUnidade(item), formatarDataColeta(item.dataColeta) && `coletado em ${formatarDataColeta(item.dataColeta)}`]
                                                        .filter(Boolean).join(' · ')}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => onAddToList(item)}
                                                    className="rounded border border-slate-200 p-2 text-slate-500 hover:text-violet-700"
                                                    title="Adicionar à lista"
                                                    aria-label="Adicionar à lista"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                                <a href={item.url} target="_blank" rel="noreferrer" className="rounded border border-slate-200 p-2 text-slate-500 hover:text-violet-700" title="Abrir no site" aria-label="Abrir no site">
                                                    <ExternalLink size={16} />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="mt-3 text-[11px] leading-4 text-slate-400">
                                A comparação considera marca, variante (zero, integral, sabor...) e tamanho da embalagem.
                            </p>
                        </div>
                    )}

                    {historico && (
                        <div>
                            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                Histórico de preço ({selectedProduct.supermercadoNome})
                            </h3>
                            {historico.menorPrecoDoPeriodo && (
                                <p className="mb-2 text-xs font-semibold text-emerald-700">Menor preço dos últimos {historico.dias} dias</p>
                            )}
                            <HistoricoGrafico historico={historico} />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ComparisonSidebar;
