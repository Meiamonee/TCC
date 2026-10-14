import React from 'react';
import ProductCard, { ProductCardSkeleton } from './ProductCard';

const GRADE = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5';

const ProductList = ({ products, carregando = false, quantidadeEsqueleto = 10, vazio }) => {
    if (carregando && products.length === 0) {
        return (
            <div className={GRADE}>
                {Array.from({ length: quantidadeEsqueleto }, (_, i) => <ProductCardSkeleton key={i} />)}
            </div>
        );
    }

    if (products.length === 0) {
        return vazio || null;
    }

    return (
        <div className={`${GRADE} ${carregando ? 'opacity-60 transition-opacity' : ''}`}>
            {products.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
    );
};

export default ProductList;
