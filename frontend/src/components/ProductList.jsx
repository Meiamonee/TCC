import React from 'react';
import ProductCard from './ProductCard';

const ProductList = ({ products }) => {
    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <p className="text-xl font-medium">Nenhum produto encontrado</p>
                <p className="text-sm">Tente selecionar outra categoria</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {products.map((product, index) => (
                <ProductCard key={`${product.url}-${index}`} product={product} />
            ))}
        </div>
    );
};

export default ProductList;
