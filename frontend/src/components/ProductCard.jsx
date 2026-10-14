import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Scale } from 'lucide-react';
import SeloMercado from './SeloMercado';
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
    const dataColeta = formatarDataColeta(product.dataColeta);
    const linkProduto = `/produto/${product.id}`;

    return (
        <article className="group flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-3 transition hover:border-green-300 hover:shadow-md sm:p-4">
            <Link to={linkProduto} className="relative mb-3 block aspect-square overflow-hidden rounded-lg bg-white">
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-contain p-2 transition group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-300">Sem imagem</div>
                )}
                {desconto > 0 && (
                    <span className="absolute left-0 top-0 rounded-md bg-red-600 px-2 py-1 text-xs font-bold text-white">
                        -{desconto}%
                    </span>
                )}
            </Link>

            <div className="mb-1.5">
                <SeloMercado slug={product.supermercado} nome={product.supermercadoNome} />
            </div>

            <Link to={linkProduto} className="mb-2 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-zinc-800 hover:text-green-800" title={product.name}>
                {product.name}
            </Link>

            <div className="mt-auto">
                {product.originalPriceNumber && (
                    <div className="text-xs text-zinc-400 line-through">{formatarMoeda(product.originalPriceNumber)}</div>
                )}
                <div className="flex items-end justify-between gap-2">
                    <div>
                        <div className={`text-xl font-extrabold leading-tight ${desconto ? 'text-red-600' : 'text-zinc-900'}`}>
                            {formatarMoeda(product.priceNumber)}
                            {vendidoAPeso && <span className="text-sm font-semibold text-zinc-500"> /kg</span>}
                        </div>
                        {precoUnidade && <div className="text-[11px] text-zinc-500">{precoUnidade}</div>}
                    </div>
                    <button
                        onClick={() => adicionarNaLista(product)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white shadow-sm transition hover:bg-green-700"
                        title="Adicionar à lista de compras"
                        aria-label={`Adicionar ${product.name} à lista de compras`}
                    >
                        <Plus size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <Link
                    to={linkProduto}
                    className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-green-600 text-sm font-semibold text-green-700 transition hover:bg-green-50"
                >
                    <Scale size={15} />
                    Comparar preços
                </Link>

                {dataColeta && (
                    <p className="mt-2 text-center text-[10px] text-zinc-400" title="Data em que o preço foi coletado no site do supermercado">
                        Preço coletado em {dataColeta}
                    </p>
                )}
            </div>
        </article>
    );
};

export const ProductCardSkeleton = () => (
    <div className="flex h-full animate-pulse flex-col rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 aspect-square rounded-lg bg-zinc-100" />
        <div className="mb-2 h-4 w-16 rounded-full bg-zinc-100" />
        <div className="mb-1 h-3 rounded bg-zinc-100" />
        <div className="mb-4 h-3 w-2/3 rounded bg-zinc-100" />
        <div className="mt-auto h-6 w-24 rounded bg-zinc-100" />
        <div className="mt-3 h-9 rounded-lg bg-zinc-100" />
    </div>
);

export default ProductCard;
