import React from 'react';
import { Store, Check } from 'lucide-react';

const SupermarketMenu = ({ selectedSupermarket, onSelectSupermarket }) => {
    const supermarkets = [
        { id: null, name: 'Todos os Supermercados', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
        { id: 'supervale', name: 'SuperVale', color: 'bg-gradient-to-r from-green-500 to-emerald-600' },
        { id: 'fonseca', name: 'Supermercado Fonseca', color: 'bg-gradient-to-r from-blue-500 to-cyan-600' }
    ];

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                    <Store className="text-white" size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Supermercados</h2>
                    <p className="text-sm text-gray-500">Escolha onde comparar</p>
                </div>
            </div>

            <div className="space-y-3">
                {supermarkets.map((market) => {
                    const isSelected = selectedSupermarket === market.id;

                    return (
                        <button
                            key={market.id || 'all'}
                            onClick={() => onSelectSupermarket(market.id)}
                            className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${isSelected
                                    ? 'ring-2 ring-offset-2 ring-purple-500 shadow-lg transform scale-105'
                                    : 'hover:shadow-md hover:scale-102'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`w-12 h-12 ${market.color} rounded-lg flex items-center justify-center shadow-md`}>
                                        <Store className="text-white" size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-800">{market.name}</div>
                                        {market.id && (
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {market.id === 'supervale' ? '3.580 produtos' : '7.416 produtos'}
                                            </div>
                                        )}
                                        {!market.id && (
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                10.996 produtos
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {isSelected && (
                                    <div className="ml-3">
                                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                            <Check className="text-white" size={14} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Indicador de filtro ativo */}
            {selectedSupermarket && (
                <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                        <span className="text-purple-700 font-medium">
                            Filtrando por {selectedSupermarket === 'supervale' ? 'SuperVale' : 'Fonseca'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupermarketMenu;
