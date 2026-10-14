import React from 'react';
import ProductCard from './ProductCard';

const ProductList = ({ products, onCompare, onAddToList }) => {
    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded border border-dashed border-zinc-300 bg-white px-4 py-20 text-center text-zinc-500">
                <p className="text-xl font-semibold text-zinc-800">Nenhum produto encontrado</p>
                <p className="text-sm">Tente outra busca, categoria ou supermercado</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
            {products.map(product => (
                <ProductCard
                    key={product.id}
                    product={product}
                    onCompare={onCompare}
                    onAddToList={onAddToList}
                />
            ))}
        </div>
    );
};

export default ProductList;
