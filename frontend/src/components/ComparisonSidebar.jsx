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

    const getProductPrice = (product) => {
        if (typeof product.priceNumber === 'number') return product.priceNumber;

        const normalized = String(product.price || '')
            .normalize('NFKC')
            .replace(/\s/g, '')
            .replace(/[^\d,.-]/g, '')
            .replace(/\.(?=\d{3}(?:\D|$))/g, '')
            .replace(',', '.');

        const match = normalized.match(/\d+(?:\.\d+)?/);
        return match ? Number(match[0]) : 0;
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
            return getProductPrice(a) - getProductPrice(b);
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
            const minPrice = getProductPrice(min);
            const productPrice = getProductPrice(product);
            return productPrice < minPrice ? product : min;
        });
    }, [allProductsToCompare]);

    // Calcular diferença de preço
    const getPriceDifference = (product) => {
        if (!cheapestProduct) return null;
        const cheapestPrice = getProductPrice(cheapestProduct);
        const productPrice = getProductPrice(product);
        const diff = productPrice - cheapestPrice;
        return diff > 0 ? `+R$ ${diff.toFixed(2).replace('.', ',')}` : null;
    };

    const getSupermarketName = (product) => product.supermercadoNome || product.supermercado;

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Sidebar */}
            <div className={`fixed top-0 right-0 h-full w-full md:w-[450px] bg-white shadow-2xl z-50 transform transition-transform duration-300 overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}>
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            Comparar Preços
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">Encontre a melhor oferta</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {selectedProduct && (
                    <div className="p-6 space-y-8">
                        {/* Produto Selecionado */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Produto Selecionado</h3>
                            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex gap-4">
                                <div className="w-20 h-20 flex-shrink-0 bg-slate-50 rounded-lg p-2">
                                    <img
                                        src={selectedProduct.image}
                                        alt={selectedProduct.name}
                                        className="w-full h-full object-contain mix-blend-multiply"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-2 bg-violet-50 text-violet-700">
                                        {getSupermarketName(selectedProduct)}
                                    </div>
                                    <h4 className="font-medium text-slate-900 text-sm line-clamp-2 mb-2">{selectedProduct.name}</h4>
                                    <div className="text-xl font-bold text-slate-900">{selectedProduct.price}</div>
                                </div>
                            </div>
                        </div>

                        {/* Comparação */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                                {allProductsToCompare.length > 0 ? 'Disponível em outras lojas' : 'Sem similares encontrados'}
                            </h3>

                            {allProductsToCompare.length > 0 ? (
                                <div className="space-y-3">
                                    {allProductsToCompare.map((product, index) => {
                                        const isCheapest = cheapestProduct && product.name === cheapestProduct.name && product.supermercado === cheapestProduct.supermercado;
                                        const priceDiff = getPriceDifference(product);

                                        return (
                                            <div
                                                key={`${product.supermercado}-${index}`}
                                                className={`rounded-xl p-4 border transition-all ${isCheapest
                                                    ? 'bg-emerald-50/50 border-emerald-200 ring-1 ring-emerald-100'
                                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 text-zinc-700">
                                                        {getSupermarketName(product)}
                                                    </div>
                                                    {isCheapest && (
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-full shadow-sm border border-emerald-100">
                                                            <Check size={12} strokeWidth={3} />
                                                            MELHOR PREÇO
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-slate-600 line-clamp-1 mb-1">{product.name}</p>
                                                        <div className="flex items-baseline gap-2">
                                                            <span className={`text-lg font-bold ${isCheapest ? 'text-emerald-700' : 'text-slate-900'}`}>
                                                                {product.price}
                                                            </span>
                                                            {priceDiff && (
                                                                <span className="text-xs font-medium text-red-500 flex items-center">
                                                                    <TrendingUp size={12} className="mr-0.5" />
                                                                    {priceDiff}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-slate-500 text-sm font-medium">Nenhum similar encontrado</p>
                                    <p className="text-xs text-slate-400 mt-1">Mesma unidade e quantidade</p>
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
