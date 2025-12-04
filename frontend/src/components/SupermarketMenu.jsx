import React from 'react';
import { Store, LayoutGrid, ShoppingCart } from 'lucide-react';

const SupermarketMenu = ({ selectedSupermarket, onSelectSupermarket }) => {
    const menuItems = [
        {
            id: null,
            name: 'Todos os Supermercados',
            icon: LayoutGrid
        },
        {
            id: 'supervale',
            name: 'SuperVale',
            icon: ShoppingCart
        },
        {
            id: 'fonseca',
            name: 'Supermercado Fonseca',
            icon: Store
        }
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-24">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-6">
                Supermercados
            </h2>

            <div className="space-y-2">
                {menuItems.map((item) => {
                    const isSelected = selectedSupermarket === item.id;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id || 'all'}
                            onClick={() => onSelectSupermarket(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-sm font-medium ${isSelected
                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <Icon size={20} className={isSelected ? 'text-white' : 'text-slate-400'} />
                            <span>{item.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SupermarketMenu;
