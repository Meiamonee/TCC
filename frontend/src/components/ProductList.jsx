import React from 'react';
import ProductCard, { ProductCardSkeleton } from './ProductCard';

// Grade: 2 colunas no celular, 3 no tablet, 4 a 5 no computador.
const GRADE = 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5';
// Carrossel com deslize lateral, usado nas vitrines do celular.
const CARROSSEL = 'flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide -mx-4 scroll-px-4';
const ITEM_CARROSSEL = 'w-[44vw] max-w-[190px] shrink-0 snap-start';

const ProductList = ({ products, carregando = false, quantidadeEsqueleto = 10, vazio, modo = 'grade' }) => {
    const carrossel = modo === 'carrossel';

    if (carregando && products.length === 0) {
        return (
            <div className={carrossel ? CARROSSEL : GRADE}>
                {Array.from({ length: quantidadeEsqueleto }, (_, i) => (
                    <div key={i} className={carrossel ? ITEM_CARROSSEL : ''}><ProductCardSkeleton /></div>
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return vazio || null;
    }

    return (
        <div className={`${carrossel ? CARROSSEL : GRADE} ${carregando ? 'opacity-60 transition-opacity' : ''}`}>
            {products.map(product => (
                carrossel
                    ? <div key={product.id} className={ITEM_CARROSSEL}><ProductCard product={product} /></div>
                    : <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );
};

export default ProductList;
