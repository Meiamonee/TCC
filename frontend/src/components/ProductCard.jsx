import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import SeloMercado from './SeloMercado';
import Preco from './Preco';
import ImagemProduto from './ImagemProduto';
import { formatarDataColeta, formatarMoeda, formatarPrecoUnidade } from '../formatar';
import { useApp } from '../AppContext';

function percentualDesconto(produto) {
    if (!produto.originalPriceNumber || produto.originalPriceNumber <= produto.priceNumber) return null;
    return Math.round((1 - produto.priceNumber / produto.originalPriceNumber) * 100);
}

const ProductCard = ({ product }) => {
    const { adicionarNaLista } = useApp();
    const desconto = percentualDesconto(product);
    const vendidoAPeso = product.unit === 'kg';
    const precoUnidade = !vendidoAPeso && formatarPrecoUnidade(product);
    const linkProduto = `/produto/${product.id}`;

    return (
        <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-papel-300 bg-papel-50 transition duration-200 hover:-translate-y-1 hover:border-feira-300 hover:shadow-cartao">
            {desconto > 0 && (
                <span className="absolute right-0 top-3 z-10 rounded-l-md bg-oferta-500 py-1 pl-2.5 pr-2 font-preco text-sm font-bold uppercase leading-none text-white shadow">
                    -{desconto}%
                </span>
            )}

            <Link to={linkProduto} className="relative mx-3 mt-3 block aspect-square overflow-hidden rounded-xl bg-white">
                <ImagemProduto
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105"
                />
                <span className="absolute bottom-2 left-2">
                    <SeloMercado slug={product.supermercado} nome={product.supermercadoNome} />
                </span>
            </Link>

            <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
                <Link to={linkProduto} className="line-clamp-2 min-h-[2.6rem] text-[13.5px] font-medium leading-[1.3rem] text-tinta-700 hover:text-feira-700" title={product.name}>
                    {product.name}
                </Link>

                <div className="mt-auto pt-3">
                    <div className="min-h-[15px] text-[11px] text-tinta-400">
                        {product.originalPriceNumber ? <>de <span className="line-through">{formatarMoeda(product.originalPriceNumber)}</span> por</> : precoUnidade || ' '}
                    </div>
                    <div className="mt-1 flex items-end justify-between gap-2">
                        <span className={`etiqueta inline-block py-1 pr-3.5 ${desconto ? 'etiqueta-oferta' : ''}`}>
                            <Preco valor={product.priceNumber} tamanho="m" sufixo={vendidoAPeso ? 'kg' : undefined} />
                        </span>
                        <button
                            onClick={() => adicionarNaLista(product)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-feira-600 text-white shadow-sm transition hover:bg-feira-700 active:scale-95"
                            title="Adicionar à lista de compras"
                            aria-label={`Adicionar ${product.name} à lista de compras`}
                        >
                            <Plus size={20} strokeWidth={2.75} />
                        </button>
                    </div>
                </div>

                <div className="linha-picotada mt-3.5 flex items-center justify-between pt-2.5">
                    <span className="text-[10px] text-tinta-400" title="Data em que o preço foi coletado no site do supermercado">
                        {formatarDataColeta(product.dataColeta)}
                    </span>
                    <Link to={linkProduto} className="flex items-center gap-1 text-xs font-bold text-feira-600 hover:text-feira-800">
                        Comparar <ArrowRight size={13} strokeWidth={2.5} />
                    </Link>
                </div>
            </div>
        </article>
    );
};

export const ProductCardSkeleton = () => (
    <div className="flex h-full animate-pulse flex-col rounded-2xl border border-papel-300 bg-papel-50 p-3">
        <div className="aspect-square rounded-xl bg-papel-200" />
        <div className="mt-3 h-3 rounded bg-papel-200" />
        <div className="mt-2 h-3 w-2/3 rounded bg-papel-200" />
        <div className="mt-6 h-9 w-28 rounded bg-papel-200" />
        <div className="mt-4 h-3 rounded bg-papel-200" />
    </div>
);

export default ProductCard;
