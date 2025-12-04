import React from 'react';
import { Scale, AlertCircle } from 'lucide-react';

const ProductCard = ({ product, onCompare }) => {
    const isDisponivel = product.disponivel !== false;

    return (
        <div className={`group bg-white rounded-xl border transition-all duration-300 flex flex-col h-full ${isDisponivel
                ? 'border-slate-200 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5'
                : 'border-slate-100 opacity-60'
            }`}>
            {/* Image Container */}
            <div className="relative pt-[100%] overflow-hidden rounded-t-xl bg-white">
                <img
                    src={product.image || 'https://via.placeholder.com/250'}
                    alt={product.name}
                    className={`absolute top-0 left-0 w-full h-full object-contain p-6 transition-transform duration-500 ${isDisponivel ? 'group-hover:scale-105' : 'grayscale'
                        }`}
                />

                {/* Supermarket Badge - Minimalist */}
                {product.supermercado && (
                    <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase ${product.supermercado === 'supervale'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                        {product.supermercado === 'supervale' ? 'SuperVale' : 'Fonseca'}
                    </div>
                )}

                {/* Unavailable Badge */}
                {!isDisponivel && (
                    <div className="absolute top-3 right-3 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Indisponível
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-grow border-t border-slate-50">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {product.department}
                </div>

                <h3 className="text-slate-700 font-medium text-sm leading-relaxed mb-4 line-clamp-2 flex-grow group-hover:text-blue-600 transition-colors" title={product.name}>
                    {product.name}
                </h3>

                <div className="flex items-end justify-between gap-3 mt-auto">
                    <div className={`text-xl font-bold tracking-tight ${isDisponivel ? 'text-slate-900' : 'text-slate-300'}`}>
                        {product.price}
                    </div>

                    <button
                        className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${isDisponivel
                                ? 'bg-slate-50 text-slate-600 hover:bg-blue-600 hover:text-white border border-slate-200 hover:border-blue-600'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                            }`}
                        disabled={!isDisponivel}
                        onClick={() => isDisponivel && onCompare && onCompare(product)}
                        title="Comparar Preço"
                    >
                        <Scale size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;

