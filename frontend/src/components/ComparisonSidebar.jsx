import React, { useMemo } from 'react';
import { X, TrendingDown, TrendingUp, Check } from 'lucide-react';

const ComparisonSidebar = ({ isOpen, onClose, selectedProduct, allProducts }) => {
    // Normalizar nome para comparação
    const normalizeProductName = (name) => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
            .trim();
    };

    // Extrair unidade de medida do nome do produto
    const extractUnit = (name) => {
        const normalized = name.toLowerCase();

        // Padrões de unidades (ordem importa - do mais específico para o menos)
        const patterns = [
            { regex: /(\d+(?:[.,]\d+)?)\s*l(?:t|itros?)?(?:\s|$)/i, unit: 'L', multiplier: 1 },
            { regex: /(\d+(?:[.,]\d+)?)\s*ml(?:\s|$)/i, unit: 'ml', multiplier: 0.001 },
            { regex: /(\d+(?:[.,]\d+)?)\s*kg(?:\s|$)/i, unit: 'kg', multiplier: 1 },
            { regex: /(\d+(?:[.,]\d+)?)\s*g(?:r(?:amas?)?)?(?:\s|$)/i, unit: 'g', multiplier: 0.001 },
        ];

        for (const pattern of patterns) {
            const match = normalized.match(pattern.regex);
            if (match) {
                const value = parseFloat(match[1].replace(',', '.'));
                // Normalizar para unidade base (L ou kg)
                const normalizedValue = value * pattern.multiplier;
                const baseUnit = pattern.unit === 'L' || pattern.unit === 'ml' ? 'L' : 'kg';
                return { value: normalizedValue, unit: baseUnit, original: match[0] };
            }
        }

        return null;
    };

    // Buscar produtos similares COM MESMA UNIDADE
    const similarProducts = useMemo(() => {
        if (!selectedProduct) return [];

        const selectedNormalized = normalizeProductName(selectedProduct.name);
        const selectedUnit = extractUnit(selectedProduct.name);

        // Se não conseguir extrair unidade, não comparar
        if (!selectedUnit) return [];

        const keywords = selectedNormalized.split(' ').filter(word => word.length > 3);

        // Buscar produtos de outros supermercados
        const similar = allProducts.filter(product => {
            if (product.supermercado === selectedProduct.supermercado) return false;
            if (!product.supermercado) return false;

            const productNormalized = normalizeProductName(product.name);
            const productUnit = extractUnit(product.name);

            // IMPORTANTE: Comparar apenas produtos com MESMA UNIDADE e MESMA QUANTIDADE
            if (!productUnit || productUnit.unit !== selectedUnit.unit) return false;

            // Tolerância de 10% na quantidade (ex: 2L vs 2.1L)
            const quantityDiff = Math.abs(productUnit.value - selectedUnit.value) / selectedUnit.value;
            if (quantityDiff > 0.1) return false;

            // Verificar se tem pelo menos 2 palavras-chave em comum
            const matchCount = keywords.filter(keyword =>
                productNormalized.includes(keyword)
            ).length;

            return matchCount >= Math.min(2, keywords.length);
        });

        // Ordenar por preço
        return similar.sort((a, b) => {
            const priceA = parseFloat(a.price.replace(/[^\d,]/g, '').replace(',', '.'));
            const priceB = parseFloat(b.price.replace(/[^\d,]/g, '').replace(',', '.'));
            return priceA - priceB;
        });
    }, [selectedProduct, allProducts]);

    // Lista de produtos para comparar (apenas produtos similares)
    const allProductsToCompare = useMemo(() => {
        if (!selectedProduct) return [];
        return similarProducts;
    }, [selectedProduct, similarProducts]);

    // Encontrar o mais barato
    const cheapestProduct = useMemo(() => {
        if (allProductsToCompare.length === 0) return null;
        return allProductsToCompare.reduce((min, product) => {
            const minPrice = parseFloat(min.price.replace(/[^\d,]/g, '').replace(',', '.'));
            const productPrice = parseFloat(product.price.replace(/[^\d,]/g, '').replace(',', '.'));
            return productPrice < minPrice ? product : min;
        });
    }, [allProductsToCompare]);

    // Calcular diferença de preço
    const getPriceDifference = (product) => {
        if (!cheapestProduct) return null;
        const cheapestPrice = parseFloat(cheapestProduct.price.replace(/[^\d,]/g, '').replace(',', '.'));
        const productPrice = parseFloat(product.price.replace(/[^\d,]/g, '').replace(',', '.'));
        const diff = productPrice - cheapestPrice;
        return diff > 0 ? `+R$ ${diff.toFixed(2).replace('.', ',')}` : null;
    };

    const getSupermarketColor = (supermercado) => {
        return supermercado === 'supervale'
            ? 'from-green-500 to-emerald-600'
            : 'from-blue-500 to-cyan-600';
    };

    const getSupermarketName = (supermercado) => {
        return supermercado === 'supervale' ? 'SuperVale' : 'Fonseca';
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Sidebar */}
            <div className={`fixed top-0 right-0 h-full w-full md:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}>
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 flex items-center justify-between shadow-lg z-10">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <TrendingDown size={24} />
                        Comparar Preços
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {selectedProduct && (
                    <div className="p-4">
                        {/* Produto Selecionado */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Produto Selecionado</h3>
                            <div className="bg-gray-50 rounded-xl p-4 border-2 border-purple-200">
                                <img
                                    src={selectedProduct.image}
                                    alt={selectedProduct.name}
                                    className="w-full h-32 object-contain mb-3"
                                />
                                <h4 className="font-semibold text-gray-800 mb-2 line-clamp-2">{selectedProduct.name}</h4>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-bold text-purple-600">{selectedProduct.price}</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getSupermarketColor(selectedProduct.supermercado)}`}>
                                        {getSupermarketName(selectedProduct.supermercado)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Comparação */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                                {allProductsToCompare.length > 0 ? 'Comparação de Preços' : 'Produto não encontrado em outras lojas'}
                            </h3>

                            {allProductsToCompare.length > 0 ? (
                                <div className="space-y-3">
                                    {allProductsToCompare.map((product, index) => {
                                        const isCheapest = cheapestProduct && product.name === cheapestProduct.name && product.supermercado === cheapestProduct.supermercado;
                                        const priceDiff = getPriceDifference(product);

                                        return (
                                            <div
                                                key={`${product.supermercado}-${index}`}
                                                className={`rounded-xl p-4 border-2 transition-all ${isCheapest
                                                        ? 'bg-green-50 border-green-500 shadow-lg'
                                                        : 'bg-white border-gray-200'
                                                    }`}
                                            >
                                                {isCheapest && (
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                                            <Check size={14} />
                                                            MAIS BARATO
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getSupermarketColor(product.supermercado)} mb-2`}>
                                                            {getSupermarketName(product.supermercado)}
                                                        </div>
                                                        <p className="text-sm text-gray-600 line-clamp-2">{product.name}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xl font-bold ${isCheapest ? 'text-green-600' : 'text-gray-800'}`}>
                                                        {product.price}
                                                    </span>
                                                    {priceDiff && (
                                                        <span className="text-sm text-red-600 font-semibold flex items-center gap-1">
                                                            <TrendingUp size={16} />
                                                            {priceDiff}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>Nenhum produto similar encontrado em outras lojas.</p>
                                    <p className="text-xs mt-2">Comparamos apenas produtos com mesma unidade e quantidade.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ComparisonSidebar;
