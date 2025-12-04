import React from 'react';
import { ShoppingCart, AlertCircle } from 'lucide-react';

const ProductCard = ({ product }) => {
    const isDisponivel = product.disponivel !== false; // Se não tiver o campo, assume disponível

    return (
        <div className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col h-full border ${isDisponivel ? 'border-gray-100' : 'border-red-200 opacity-75'
            }`}>
            <div className="relative pt-[100%] overflow-hidden group">
                <img
                    src={product.image || 'https://via.placeholder.com/250'}
                    alt={product.name}
                    className={`absolute top-0 left-0 w-full h-full object-contain p-4 transition-transform duration-300 ${isDisponivel ? 'group-hover:scale-105' : 'grayscale'
                        }`}
                />

                {/* Badge de Indisponível */}
                {!isDisponivel && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <AlertCircle size={14} />
                        Indisponível
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col flex-grow">
                <div className="text-xs text-green-600 font-semibold mb-1 uppercase tracking-wider">
                    {product.department}
                </div>

                <h3 className="text-gray-800 font-medium text-sm mb-2 line-clamp-2 flex-grow" title={product.name}>
                    {product.name}
                </h3>

                <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div className={`text-lg font-bold ${isDisponivel ? 'text-gray-900' : 'text-gray-400'}`}>
                        {product.price}
                    </div>

                    <button
                        className={`p-2 rounded-full transition-colors duration-200 ${isDisponivel
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        aria-label="Adicionar ao carrinho"
                        disabled={!isDisponivel}
                    >
                        <ShoppingCart size={18} />
                    </button>
                </div>

                {/* Mensagem de Indisponível */}
                {!isDisponivel && (
                    <div className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle size={12} />
                        Produto temporariamente indisponível
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductCard;

