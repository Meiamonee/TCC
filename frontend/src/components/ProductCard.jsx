import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import SeloMercado from './SeloMercado';
import Preco from './Preco';
import ImagemProduto from './ImagemProduto';
import { formatarDataColeta, formatarMoeda, formatarPrecoUnidade } from '../formatar';
import { useApp } from '../AppContext';
import { useDispositivo } from '../useDispositivo';

function percentualDesconto(produto) {
    if (!produto.originalPriceNumber || produto.originalPriceNumber <= produto.priceNumber) return null;
    return Math.round((1 - produto.priceNumber / produto.originalPriceNumber) * 100);
}

const ProductCard = ({ product }) => {
    const { adicionarNaLista } = useApp();
    const compacto = useDispositivo() === 'mobile';
    const desconto = percentualDesconto(product);
    const vendidoAPeso = product.unit === 'kg';
    const precoUnidade = !vendidoAPeso && formatarPrecoUnidade(product);
    const linkProduto = `/produto/${product.id}`;

    return (
        <article className={`group relative flex h-full flex-col overflow-hidden border border-papel-300 bg-papel-50 transition duration-200 ${compacto ? 'rounded-xl active:scale-[0.98]' : 'rounded-2xl hover:-translate-y-1 hover:border-feira-300 hover:shadow-cartao'}`}>
            {desconto > 0 && (
                <span className={`absolute right-0 z-10 rounded-l-md bg-oferta-500 py-1 pl-2 pr-1.5 font-preco font-bold uppercase leading-none text-white shadow ${compacto ? 'top-2 text-xs' : 'top-3 text-sm'}`}>
                    -{desconto}%
                </span>
            )}

            <Link to={linkProduto} className={`relative block aspect-square overflow-hidden bg-white ${compacto ? 'mx-2 mt-2 rounded-lg' : 'mx-3 mt-3 rounded-xl'}`}>
                <ImagemProduto
                    src={product.image}
                    alt={product.name}
                    className={`h-full w-full object-contain transition duration-300 group-hover:scale-105 ${compacto ? 'p-2' : 'p-3'}`}
                    tamanhoIcone={compacto ? 26 : 32}
                />
                <span className={`absolute ${compacto ? 'bottom-1.5 left-1.5' : 'bottom-2 left-2'}`}>
                    <SeloMercado slug={product.supermercado} nome={product.supermercadoNome} />
                </span>
            </Link>

            <div className={`flex flex-1 flex-col ${compacto ? 'px-2.5 pb-2.5 pt-2' : 'px-3.5 pb-3.5 pt-3'}`}>
                <Link
                    to={linkProduto}
                    className={`text-tinta-700 hover:text-feira-700 ${compacto ? 'line-clamp-3 min-h-[3.4rem] text-[12.5px] leading-[1.13rem]' : 'line-clamp-2 min-h-[2.6rem] text-[13.5px] font-medium leading-[1.3rem]'}`}
                    title={product.name}
                >
                    {product.name}
                </Link>

                <div className={`mt-auto ${compacto ? 'pt-2' : 'pt-3'}`}>
                    <div className="min-h-[15px] truncate text-[11px] text-tinta-400">
                        {product.originalPriceNumber ? <>de <span className="line-through">{formatarMoeda(product.originalPriceNumber)}</span></> : precoUnidade || ' '}
                    </div>
                    <div className="mt-1 flex items-end justify-between gap-1.5">
                        <span className={`etiqueta inline-block ${compacto ? 'py-0.5 pr-2.5' : 'py-1 pr-3.5'} ${desconto ? 'etiqueta-oferta' : ''}`}>
                            <Preco valor={product.priceNumber} tamanho={compacto ? 'p' : 'm'} sufixo={vendidoAPeso ? 'kg' : undefined} />
                        </span>
                        <button
                            onClick={() => adicionarNaLista(product)}
                            className={`flex shrink-0 items-center justify-center rounded-xl bg-feira-600 text-white shadow-sm transition hover:bg-feira-700 active:scale-90 ${compacto ? 'h-9 w-9' : 'h-10 w-10'}`}
                            title="Adicionar à lista de compras"
                            aria-label={`Adicionar ${product.name} à lista de compras`}
                        >
                            <Plus size={compacto ? 18 : 20} strokeWidth={2.75} />
                        </button>
                    </div>
                </div>

                {!compacto && (
                    <div className="linha-picotada mt-3.5 flex items-center justify-between pt-2.5">
                        <span className="text-[10px] text-tinta-400" title="Data em que o preço foi coletado no site do supermercado">
                            {formatarDataColeta(product.dataColeta)}
                        </span>
                        <Link to={linkProduto} className="flex items-center gap-1 text-xs font-bold text-feira-600 hover:text-feira-800">
                            Comparar <ArrowRight size={13} strokeWidth={2.5} />
                        </Link>
                    </div>
                )}
            </div>
        </article>
    );
};

export const ProductCardSkeleton = () => (
    <div className="flex h-full animate-pulse flex-col rounded-2xl border border-papel-300 bg-papel-50 p-3">
        <div className="aspect-square rounded-xl bg-papel-200" />
        <div className="mt-3 h-3 rounded bg-papel-200" />
        <div className="mt-2 h-3 w-2/3 rounded bg-papel-200" />
        <div className="mt-6 h-9 w-24 rounded bg-papel-200" />
    </div>
);

export default ProductCard;
