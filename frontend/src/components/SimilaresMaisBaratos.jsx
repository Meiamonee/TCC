import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, Plus, Shuffle } from 'lucide-react';
import { useApp } from '../AppContext';
import { useDispositivo } from '../useDispositivo';
import { fetchSimilares } from '../services/api';
import { formatarPrecoUnidade } from '../formatar';
import SeloMercado from './SeloMercado';
import Preco from './Preco';
import ImagemProduto from './ImagemProduto';

// Produtos do mesmo tipo, de outras marcas, que saem mais baratos por kg/L/un.
const SimilaresMaisBaratos = ({ produto }) => {
    const { adicionarNaLista } = useApp();
    const mobile = useDispositivo() === 'mobile';
    const [estado, setEstado] = useState({ carregando: true, similares: [], criterio: '' });

    useEffect(() => {
        let cancelado = false;
        fetchSimilares(produto.id)
            .then(resposta => { if (!cancelado) setEstado({ carregando: false, similares: resposta.similares, criterio: resposta.criterio }); })
            .catch(() => { if (!cancelado) setEstado({ carregando: false, similares: [], criterio: '' }); });
        return () => { cancelado = true; };
    }, [produto.id]);

    if (estado.carregando || estado.similares.length === 0) {
        return null;
    }

    const unidade = produto.unitPriceLabel || 'un';

    return (
        <section>
            <p className="flex items-center gap-1.5 font-preco text-sm font-bold uppercase tracking-[0.2em] text-oferta-500">
                <Shuffle size={15} /> Outras marcas
            </p>
            <h2 className={`font-extrabold text-feira-900 ${mobile ? 'text-[1.4rem]' : 'text-[2rem]'}`}>Opções parecidas mais baratas</h2>
            <p className="mt-1 text-sm text-tinta-500">
                O mesmo tipo de produto, de outra marca, comparado pelo preço por {unidade}.
            </p>

            <ul className={`mt-5 ${mobile ? 'space-y-2.5' : 'grid grid-cols-2 gap-4 lg:grid-cols-3'}`}>
                {estado.similares.map(item => (
                    <li
                        key={item.id}
                        className={`relative flex overflow-hidden rounded-2xl border border-papel-300 bg-papel-50 ${mobile ? 'items-center gap-3 p-3' : 'gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-cartao'}`}
                    >
                        <span className="absolute right-0 top-0 rounded-bl-xl bg-feira-600 px-2.5 py-1 font-preco text-sm font-bold text-white">
                            -{item.economiaPercentual}%/{unidade}
                        </span>
                        <Link to={`/produto/${item.id}`} className={`shrink-0 overflow-hidden rounded-xl bg-white ${mobile ? 'h-16 w-16' : 'h-24 w-24'}`}>
                            <ImagemProduto src={item.image} alt={item.name} className="h-full w-full object-contain p-1.5" tamanhoIcone={22} />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                            <span className="flex flex-wrap items-center gap-1.5 pr-16">
                                <SeloMercado slug={item.supermercado} nome={item.supermercadoNome} />
                                {item.mesmoSupermercado && <span className="text-[10px] font-bold uppercase text-feira-600">mesmo mercado</span>}
                            </span>
                            <Link to={`/produto/${item.id}`} className={`mt-1 line-clamp-2 text-tinta-700 hover:text-feira-700 ${mobile ? 'text-[12.5px] leading-[1.1rem]' : 'text-sm'}`}>
                                {item.name}
                            </Link>
                            <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                                <div>
                                    <Preco valor={item.priceNumber} tamanho="p" sufixo={item.unit === 'kg' ? 'kg' : undefined} />
                                    {item.unit !== 'kg' && formatarPrecoUnidade(item) && (
                                        <span className="block text-[11px] text-tinta-500">{formatarPrecoUnidade(item)}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => adicionarNaLista(item)}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-feira-600 text-white transition hover:bg-feira-700 active:scale-90"
                                    aria-label={`Adicionar ${item.name} à lista`}
                                >
                                    <Plus size={17} strokeWidth={2.75} />
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

            {estado.criterio && (
                <p className="mt-4 flex items-start gap-2 text-xs text-tinta-500">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    {estado.criterio}
                </p>
            )}
        </section>
    );
};

export default SimilaresMaisBaratos;
