import React from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';

const ProductCard = ({ product, onCompare }) => {
    const isDisponivel = product.disponivel !== false;
    const supermarketName = product.supermercado === 'supervale' ? 'SuperVale' : 'Fonseca';
    const supermarketLogo = product.supermercado === 'supervale'
        ? '/logos/supervale.png'
        : '/logos/fonseca.png';

    return (
        <article className={`flex h-full flex-col overflow-hidden rounded border bg-white transition-colors ${isDisponivel
            ? 'border-zinc-200 hover:border-violet-300'
            : 'border-zinc-100 opacity-60'
            }`}>
            <div className="relative aspect-square overflow-hidden bg-white">
                <img
                    src={product.image || 'https://via.placeholder.com/250'}
                    alt={product.name}
                    className={`absolute inset-0 h-full w-full object-contain p-5 ${isDisponivel ? '' : 'grayscale'
                        }`}
                />

                {product.supermercado && (
                    <div
                        title={supermarketName}
                        aria-label={supermarketName}
                        className="absolute left-3 top-3 flex h-9 w-12 items-center justify-center rounded border border-zinc-200 bg-white p-1"
                    >
                        <img
                            src={supermarketLogo}
                            alt={supermarketName}
                            className="h-full w-full object-contain"
                        />
                    </div>
                )}

                {!isDisponivel && (
                    <div className="absolute right-3 top-3 flex items-center gap-1 rounded border border-zinc-200 bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-500">
                        <AlertCircle size={12} />
                        Indisponivel
                    </div>
                )}
            </div>

            <div className="flex flex-grow flex-col border-t border-zinc-100 p-4">
                <div className="mb-2 text-[10px] font-semibold uppercase text-zinc-500">
                    {product.department}
                </div>

                <h3 className="mb-3 line-clamp-2 min-h-[40px] text-sm font-medium leading-5 text-zinc-800" title={product.name}>
                    {product.name}
                </h3>

                <div className="mt-auto">
                    <div className="mb-1 text-[11px] font-medium text-zinc-500">a partir de</div>
                    <div className={`text-xl font-bold ${isDisponivel ? 'text-zinc-950' : 'text-zinc-300'}`}>
                        {product.price}
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                    <button
                        className={`flex h-10 flex-1 items-center justify-center rounded border text-sm font-semibold transition-colors ${isDisponivel
                            ? 'border-violet-700 bg-violet-700 text-white hover:border-violet-800 hover:bg-violet-800'
                            : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300'
                            }`}
                        disabled={!isDisponivel}
                        onClick={() => isDisponivel && onCompare && onCompare(product)}
                        title="Comparar preco"
                    >
                        Comparar
                    </button>
                    <a
                        className="flex h-10 w-10 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-violet-300 hover:text-violet-700"
                        href={product.url}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir oferta"
                    >
                        <ExternalLink size={16} />
                    </a>
                </div>
            </div>
        </article>
    );
};

export default ProductCard;
