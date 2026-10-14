import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { fetchCestaBasica } from '../services/api';
import { formatarMoeda } from '../formatar';

// Custo da cesta basica do DIEESE em cada supermercado.
const CestaBasica = () => {
    const [cesta, setCesta] = useState(null);
    const [aberta, setAberta] = useState(null);

    useEffect(() => {
        let cancelado = false;
        fetchCestaBasica()
            .then(dados => { if (!cancelado) setCesta(dados); })
            .catch(() => { if (!cancelado) setCesta(null); });
        return () => { cancelado = true; };
    }, []);

    if (!cesta) return null;

    const mercados = [...cesta.porMercado].sort((a, b) =>
        (b.itensEncontrados === b.itensTotal) - (a.itensEncontrados === a.itensTotal) || a.total - b.total);

    return (
        <section className="mb-6 rounded border border-zinc-200 bg-white p-5 sm:p-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-zinc-950">Cesta básica em cada supermercado</h2>
                <p className="text-sm text-zinc-500">
                    Menor custo dos 13 itens da cesta do DIEESE (Região Sudeste), usando o produto mais barato por kg/L de cada mercado.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {mercados.map(mercado => {
                    const completa = mercado.itensEncontrados === mercado.itensTotal;
                    const ehMaisBarato = cesta.maisBarato?.supermercado === mercado.supermercado;
                    const expandida = aberta === mercado.supermercado;

                    return (
                        <div key={mercado.supermercado} className={`rounded-lg border p-4 ${ehMaisBarato ? 'border-emerald-200 bg-emerald-50/60' : 'border-zinc-200'}`}>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-zinc-800">{mercado.supermercadoNome}</span>
                                {ehMaisBarato && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Mais barata</span>}
                            </div>
                            <div className={`mt-1 text-2xl font-bold ${ehMaisBarato ? 'text-emerald-700' : 'text-zinc-950'}`}>
                                {formatarMoeda(mercado.total)}
                            </div>
                            <div className="text-xs text-zinc-500">
                                {completa ? 'Cesta completa' : `${mercado.itensEncontrados} de ${mercado.itensTotal} itens no site`}
                            </div>
                            <button
                                className="mt-2 flex items-center gap-1 text-xs font-semibold text-violet-700"
                                onClick={() => setAberta(expandida ? null : mercado.supermercado)}
                            >
                                {expandida ? 'Ocultar itens' : 'Ver itens'}
                                <ChevronDown size={14} className={expandida ? 'rotate-180' : ''} />
                            </button>
                            {expandida && (
                                <ul className="mt-2 space-y-1">
                                    {mercado.itens.map(item => (
                                        <li key={item.item} className="flex justify-between gap-2 text-[11px] text-zinc-600" title={item.produto || ''}>
                                            <span>{item.item} ({item.quantidade} {item.unidade})</span>
                                            <span className="font-semibold">{item.custo !== null ? formatarMoeda(item.custo) : 'não encontrado'}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default CestaBasica;
