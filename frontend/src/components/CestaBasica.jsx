import React, { useEffect, useState } from 'react';
import { ShoppingBasket, Trophy } from 'lucide-react';
import { fetchCestaBasica } from '../services/api';
import { formatarMoeda } from '../formatar';
import SeloMercado from './SeloMercado';

// Custo da cesta basica do DIEESE em cada supermercado, em formato de tabela comparativa.
const CestaBasica = () => {
    const [cesta, setCesta] = useState(null);
    const [detalhes, setDetalhes] = useState(false);

    useEffect(() => {
        let cancelado = false;
        fetchCestaBasica()
            .then(dados => { if (!cancelado) setCesta(dados); })
            .catch(() => { if (!cancelado) setCesta(null); });
        return () => { cancelado = true; };
    }, []);

    if (!cesta) return null;

    const completa = mercado => mercado.itensEncontrados === mercado.itensTotal;
    const mercados = [...cesta.porMercado].sort((a, b) => completa(b) - completa(a) || a.total - b.total);
    const itens = mercados[0]?.itens.map(item => item.item) || [];
    const maisBarato = cesta.maisBarato;
    const maisCaro = mercados.filter(completa).at(-1);
    const diferenca = maisBarato && maisCaro ? maisCaro.total - maisBarato.total : 0;

    return (
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-zinc-100 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                        <ShoppingBasket size={24} />
                    </span>
                    <div>
                        <h2 className="text-xl font-extrabold text-zinc-900 sm:text-2xl">Quanto custa a cesta básica?</h2>
                        <p className="text-sm text-zinc-500">13 itens da cesta do DIEESE (Região Sudeste), escolhendo a opção mais barata por kg/L de cada mercado.</p>
                    </div>
                </div>
                {maisBarato && diferenca > 0 && (
                    <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-900">
                        <span className="flex items-center gap-1.5 font-extrabold"><Trophy size={16} /> Mais barata: {maisBarato.supermercadoNome}</span>
                        <span>Economia de {formatarMoeda(diferenca)} por mês em relação à mais cara</span>
                    </div>
                )}
            </div>

            <div className="grid gap-px bg-zinc-100 sm:grid-cols-2 lg:grid-cols-4">
                {mercados.map(mercado => {
                    const ehMaisBarato = maisBarato?.supermercado === mercado.supermercado;
                    return (
                        <div key={mercado.supermercado} className={`p-5 ${ehMaisBarato ? 'bg-green-50' : 'bg-white'}`}>
                            <SeloMercado slug={mercado.supermercado} nome={mercado.supermercadoNome} />
                            <div className={`mt-2 text-3xl font-extrabold ${ehMaisBarato ? 'text-green-700' : 'text-zinc-900'}`}>
                                {formatarMoeda(mercado.total)}
                            </div>
                            <div className="text-xs text-zinc-500">
                                {completa(mercado) ? 'Cesta completa' : `Faltam ${mercado.itensTotal - mercado.itensEncontrados} item(ns) no site`}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 text-center">
                <button onClick={() => setDetalhes(valor => !valor)} className="text-sm font-bold text-green-700 hover:text-green-900">
                    {detalhes ? 'Ocultar preço de cada item' : 'Ver preço de cada item'}
                </button>
            </div>

            {detalhes && (
                <div className="overflow-x-auto border-t border-zinc-100">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead>
                            <tr className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                                <th className="px-4 py-2 font-bold">Item</th>
                                {mercados.map(mercado => (
                                    <th key={mercado.supermercado} className="px-4 py-2 text-right font-bold">{mercado.supermercadoNome}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {itens.map((nomeItem, indice) => {
                                const custos = mercados.map(mercado => mercado.itens[mercado.itens.findIndex(item => item.item === nomeItem)]);
                                const menor = Math.min(...custos.filter(item => item?.custo != null).map(item => item.custo));
                                return (
                                    <tr key={nomeItem} className={indice % 2 ? 'bg-zinc-50/60' : ''}>
                                        <td className="px-4 py-2 text-zinc-700">
                                            {nomeItem} <span className="text-xs text-zinc-400">({custos[0]?.quantidade} {custos[0]?.unidade})</span>
                                        </td>
                                        {custos.map((item, i) => (
                                            <td
                                                key={mercados[i].supermercado}
                                                className={`px-4 py-2 text-right tabular-nums ${item?.custo === menor ? 'font-bold text-green-700' : 'text-zinc-700'}`}
                                                title={item?.produto || ''}
                                            >
                                                {item?.custo != null ? formatarMoeda(item.custo) : '—'}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
};

export default CestaBasica;
