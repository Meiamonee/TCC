import React from 'react';
import { AlertCircle, ExternalLink, Plus } from 'lucide-react';
import { iniciais, logoDoSupermercado } from '../supermercados';
import { formatarDataColeta, formatarMoeda, formatarPrecoUnidade } from '../formatar';

const ProductCard = ({ product, onCompare, onAddToList }) => {
    const isDisponivel = product.disponivel !== false;
    const supermarketName = product.supermercadoNome || product.supermercado;
    const supermarketLogo = logoDoSupermercado(product.supermercado);
    const precoUnidade = formatarPrecoUnidade(product);
    const dataColeta = formatarDataColeta(product.dataColeta);
    const vendidoAPeso = product.unit === 'kg';

    return (
        <article className={`flex h-full flex-col overflow-hidden rounded border bg-white transition-colors ${isDisponivel
            ? 'border-zinc-200 hover:border-violet-300'
            : 'border-zinc-100 opacity-60'
            }`}>
            <div className="relative aspect-square overflow-hidden bg-white">
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className={`absolute inset-0 h-full w-full object-contain p-5 ${isDisponivel ? '' : 'grayscale'}`}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-zinc-300">Sem imagem</div>
                )}

                <div
                    title={supermarketName}
                    aria-label={supermarketName}
                    className="absolute left-3 top-3 flex h-9 min-w-12 items-center justify-center rounded border border-zinc-200 bg-white p-1"
                >
                    {supermarketLogo ? (
                        <img src={supermarketLogo} alt={supermarketName} className="h-full w-full object-contain" />
                    ) : (
                        <span className="px-1 text-xs font-bold text-violet-700">{iniciais(supermarketName)}</span>
                    )}
                </div>

                {product.originalPriceNumber && (
                    <div className="absolute right-3 top-3 rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold uppercase text-white">
                        Oferta
                    </div>
                )}

                {!isDisponivel && (
                    <div className="absolute right-3 top-3 flex items-center gap-1 rounded border border-zinc-200 bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-500">
                        <AlertCircle size={12} />
                        Indisponível
                    </div>
                )}
            </div>

            <div className="flex flex-grow flex-col border-t border-zinc-100 p-4">
                <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase text-zinc-500">
                    <span className="truncate">{product.department}</span>
                    <span className="shrink-0 normal-case text-zinc-400">{supermarketName}</span>
                </div>

                <h3 className="mb-3 line-clamp-2 min-h-[40px] text-sm font-medium leading-5 text-zinc-800" title={product.name}>
                    {product.name}
                </h3>

                <div className="mt-auto">
                    {product.originalPriceNumber && (
                        <div className="text-xs font-medium text-zinc-400 line-through">
                            {formatarMoeda(product.originalPriceNumber)}
                        </div>
                    )}
                    <div className={`text-xl font-bold ${isDisponivel ? 'text-zinc-950' : 'text-zinc-300'}`}>
                        {formatarMoeda(product.priceNumber)}
                        {vendidoAPeso && <span className="ml-1 text-sm font-semibold text-zinc-500">/kg</span>}
                    </div>
                    {precoUnidade && !vendidoAPeso && (
                        <div className="text-xs font-medium text-zinc-500">{precoUnidade}</div>
                    )}
                    {product.tag && (
                        <div className="mt-1 inline-block rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                            {product.tag}
                        </div>
                    )}
                    {dataColeta && (
                        <div className="mt-2 text-[11px] text-zinc-400" title="Data em que o preço foi coletado no site do supermercado">
                            Coletado em {dataColeta}
                        </div>
                    )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                    <button
                        className={`flex h-10 flex-1 items-center justify-center rounded border text-sm font-semibold transition-colors ${isDisponivel
                            ? 'border-violet-700 bg-violet-700 text-white hover:border-violet-800 hover:bg-violet-800'
                            : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300'
                            }`}
                        disabled={!isDisponivel}
                        onClick={() => onCompare(product)}
                        title="Comparar preço nos outros supermercados"
                    >
                        Comparar
                    </button>
                    <button
                        className="flex h-10 w-10 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-violet-300 hover:text-violet-700 disabled:opacity-40"
                        disabled={!isDisponivel}
                        onClick={() => onAddToList(product)}
                        title="Adicionar à lista de compras"
                        aria-label="Adicionar à lista de compras"
                    >
                        <Plus size={18} />
                    </button>
                    <a
                        className="flex h-10 w-10 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-violet-300 hover:text-violet-700"
                        href={product.url}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir no site do supermercado"
                        aria-label="Abrir no site do supermercado"
                    >
                        <ExternalLink size={16} />
                    </a>
                </div>
            </div>
        </article>
    );
};

export default ProductCard;
