import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCestaBasica } from '../services/api';
import { formatarMoeda } from '../formatar';

const LINHAS_INICIAIS = 6;

// Cesta basica do DIEESE item a item, no estilo de cupom fiscal comparativo.
const CestaBasica = () => {
    const [cesta, setCesta] = useState(null);
    const [completa, setCompleta] = useState(false);

    useEffect(() => {
        let cancelado = false;
        fetchCestaBasica()
            .then(dados => { if (!cancelado) setCesta(dados); })
            .catch(() => { if (!cancelado) setCesta(null); });
        return () => { cancelado = true; };
    }, []);

    if (!cesta) return null;

    const estaCompleta = mercado => mercado.itensEncontrados === mercado.itensTotal;
    const mercados = [...cesta.porMercado].sort((a, b) => estaCompleta(b) - estaCompleta(a) || a.total - b.total);
    const itens = mercados[0]?.itens.map(item => item.item) || [];
    const visiveis = completa ? itens : itens.slice(0, LINHAS_INICIAIS);
    const maisBarato = cesta.maisBarato;
    const maisCaro = mercados.filter(estaCompleta).at(-1);
    const diferenca = maisBarato && maisCaro ? maisCaro.total - maisBarato.total : 0;

    return (
        <section className="grid gap-8 lg:grid-cols-[0.8fr_1.6fr] lg:items-start">
            <div className="min-w-0 lg:sticky lg:top-40">
                <p className="mb-1 font-preco text-sm font-bold uppercase tracking-[0.2em] text-oferta-500">Cesta básica</p>
                <h2 className="text-2xl font-extrabold text-feira-900 sm:text-[2rem]">Item por item, mercado por mercado</h2>
                <p className="mt-3 text-tinta-700">
                    Os 13 itens da cesta do DIEESE para a Região Sudeste, escolhendo em cada mercado a opção mais barata por kg ou litro.
                </p>
                {maisBarato && diferenca > 0 && (
                    <p className="mt-5 rounded-2xl bg-etiqueta-100 p-4 text-sm text-tinta-900">
                        Comprar a cesta no <strong>{maisBarato.supermercadoNome}</strong> custa{' '}
                        <strong className="marcador">{formatarMoeda(diferenca)} a menos</strong> por mês do que no {maisCaro.supermercadoNome}.
                    </p>
                )}
                <Link to="/painel" className="mt-4 inline-block text-sm font-bold text-feira-600 hover:text-feira-800">Ver no painel de preços →</Link>
            </div>

            <div className="serrilhado-baixo min-w-0 rounded-t-2xl bg-white px-4 pt-5 font-cupom text-[13px] text-tinta-900 shadow-cartao sm:px-6">
                <div className="text-center">
                    <p className="font-semibold tracking-[0.3em]">SUPERPREÇO</p>
                    <p className="text-[11px] text-tinta-500">CESTA BÁSICA · DIEESE · SUDESTE</p>
                </div>
                <div className="linha-picotada my-3" />

                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                    <table className="w-full min-w-[520px]">
                        <thead>
                            <tr className="text-[11px] text-tinta-500">
                                <th className="pb-2 text-left font-medium">ITEM</th>
                                {mercados.map(mercado => (
                                    <th key={mercado.supermercado} className="pb-2 text-right font-medium uppercase">{mercado.supermercadoNome}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {visiveis.map(nomeItem => {
                                const custos = mercados.map(mercado => mercado.itens.find(item => item.item === nomeItem));
                                const valores = custos.filter(item => item?.custo != null).map(item => item.custo);
                                const menor = valores.length ? Math.min(...valores) : null;
                                return (
                                    <tr key={nomeItem} className="align-top">
                                        <td className="py-1 pr-3">
                                            {nomeItem.toUpperCase()}
                                            <span className="block text-[11px] text-tinta-400">{String(custos[0]?.quantidade).replace('.', ',')} {custos[0]?.unidade}</span>
                                        </td>
                                        {custos.map((item, i) => (
                                            <td key={mercados[i].supermercado} className="py-1 text-right numeros-tabulares" title={item?.produto || 'não encontrado no site'}>
                                                {item?.custo != null
                                                    ? <span className={item.custo === menor ? 'marcador font-semibold' : ''}>{item.custo.toFixed(2).replace('.', ',')}</span>
                                                    : <span className="text-tinta-400">—</span>}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr><td colSpan={mercados.length + 1}><div className="linha-picotada my-3" /></td></tr>
                            <tr className="text-[15px] font-semibold">
                                <td>TOTAL R$</td>
                                {mercados.map(mercado => (
                                    <td key={mercado.supermercado} className="text-right numeros-tabulares">
                                        <span className={maisBarato?.supermercado === mercado.supermercado ? 'marcador' : ''}>
                                            {mercado.total.toFixed(2).replace('.', ',')}
                                        </span>
                                        {!estaCompleta(mercado) && <span className="block text-[10px] font-normal text-tinta-400">incompleta</span>}
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {itens.length > LINHAS_INICIAIS && (
                    <button onClick={() => setCompleta(valor => !valor)} className="mt-4 w-full rounded-lg border border-dashed border-tinta-400/50 py-2 text-xs font-semibold text-tinta-700 hover:bg-papel-100">
                        {completa ? 'MOSTRAR MENOS' : `MOSTRAR OS ${itens.length} ITENS`}
                    </button>
                )}
                <p className="mt-4 text-center text-[11px] text-tinta-400">— menor preço de cada item destacado —</p>
            </div>
        </section>
    );
};

export default CestaBasica;
