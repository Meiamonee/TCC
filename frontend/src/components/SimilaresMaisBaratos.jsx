import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, Plus, Shuffle } from 'lucide-react';
import { useApp } from '../AppContext';
import { fetchSimilares } from '../services/api';
import { formatarPrecoUnidade } from '../formatar';
import SeloMercado from './SeloMercado';
import Preco from './Preco';
import ImagemProduto from './ImagemProduto';
import Carrossel from './Carrossel';

const CartaoSimilar = ({ item, unidade }) => {
    const { adicionarNaLista } = useApp();
    const precoUnidade = item.unit !== 'kg' && formatarPrecoUnidade(item);

    return (
        <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-papel-300 bg-papel-50 transition hover:-translate-y-0.5 hover:shadow-cartao">
            <span className="absolute right-0 top-3 z-10 rounded-l-md bg-feira-600 py-1 pl-2 pr-1.5 font-preco text-sm font-bold leading-none text-white">
                -{item.economiaPercentual}%<span className="text-[11px] font-semibold opacity-80">/{unidade}</span>
            </span>
            <Link to={`/produto/${item.id}`} className="relative mx-3 mt-3 block aspect-square overflow-hidden rounded-xl bg-white">
                <ImagemProduto src={item.image} alt={item.name} className="h-full w-full object-contain p-3" tamanhoIcone={28} />
                <span className="absolute bottom-2 left-2"><SeloMercado slug={item.supermercado} nome={item.supermercadoNome} /></span>
            </Link>
            <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-2.5">
                {item.mesmoSupermercado && <span className="text-[10px] font-bold uppercase tracking-wide text-feira-600">no mesmo mercado</span>}
                <Link to={`/produto/${item.id}`} className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-tinta-700 hover:text-feira-700">{item.name}</Link>
                <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                    <div>
                        <span className="etiqueta inline-block py-1 pr-3">
                            <Preco valor={item.priceNumber} tamanho="p" sufixo={item.unit === 'kg' ? 'kg' : undefined} />
                        </span>
                        {precoUnidade && <span className="mt-1 block text-[11px] text-tinta-500">{precoUnidade}</span>}
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
        </article>
    );
};

// Produtos do mesmo tipo, de outras marcas, que saem mais baratos por kg/L/un.
const SimilaresMaisBaratos = ({ produto }) => {
    const [estado, setEstado] = useState({ carregando: true, similares: [], criterio: '' });

    useEffect(() => {
        let cancelado = false;
        fetchSimilares(produto.id, 12)
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
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                    <p className="flex items-center gap-1.5 font-preco text-sm font-bold uppercase tracking-[0.2em] text-oferta-500">
                        <Shuffle size={15} /> Outras marcas
                    </p>
                    <h2 className="text-[1.4rem] font-extrabold text-feira-900 sm:text-[2rem]">Opções parecidas mais baratas</h2>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-tinta-500">
                    <Info size={14} className="shrink-0" /> {estado.criterio}
                </p>
            </div>
            <Carrossel rotulo="Opções parecidas mais baratas">
                {estado.similares.map(item => <CartaoSimilar key={item.id} item={item} unidade={unidade} />)}
            </Carrossel>
        </section>
    );
};

export default SimilaresMaisBaratos;
