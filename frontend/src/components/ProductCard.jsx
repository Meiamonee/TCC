import React from 'react';
import { Scale, AlertCircle } from 'lucide-react';

const ProductCard = ({ product, onCompare }) => {
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

                {/* Badge de Supermercado */}
                {product.supermercado && (
                    <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold shadow-md ${product.supermercado === 'supervale'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white'
                        }`}>
                        {product.supermercado === 'supervale' ? 'SuperVale' : 'Fonseca'}
                    </div>
                )}

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

                <div className={`text-2xl font-bold mb-3 ${isDisponivel ? 'text-gray-900' : 'text-gray-400'}`}>
                    {product.price}
                </div>

                <div className="mt-auto pt-3 border-t border-gray-50">
                    <button
                        className={`w-full py-2.5 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${isDisponivel
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transform hover:scale-105'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        disabled={!isDisponivel}
                        onClick={() => isDisponivel && onCompare && onCompare(product)}
                    >
                        <Scale size={18} />
                        {isDisponivel ? 'Comparar' : 'Indisponível'}
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

