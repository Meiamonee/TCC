import React from 'react';
import { ShoppingCart } from 'lucide-react';

const ProductCard = ({ product }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col h-full border border-gray-100">
            <div className="relative pt-[100%] overflow-hidden group">
                <img
                    src={product.image || 'https://via.placeholder.com/250'}
                    alt={product.name}
                    className="absolute top-0 left-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                />
            </div>

            <div className="p-4 flex flex-col flex-grow">
                <div className="text-xs text-green-600 font-semibold mb-1 uppercase tracking-wider">
                    {product.department}
                </div>

                <h3 className="text-gray-800 font-medium text-sm mb-2 line-clamp-2 flex-grow" title={product.name}>
                    {product.name}
                </h3>

                <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div className="text-lg font-bold text-gray-900">
                        {product.price}
                    </div>

                    <button className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full transition-colors duration-200" aria-label="Adicionar ao carrinho">
                        <ShoppingCart size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
