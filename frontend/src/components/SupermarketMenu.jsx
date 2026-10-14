import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { iniciais, logoDoSupermercado } from '../supermercados';

const SupermarketMenu = ({ supermarkets = [], selectedSupermarket, onSelectSupermarket }) => {
    return (
        <div className="rounded border border-zinc-200 bg-white p-5">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wide text-zinc-950">
                Supermercados
            </h2>

            <div className="space-y-2">
                {supermarkets.map((item) => {
                    const isSelected = selectedSupermarket === item.id;
                    const logo = logoDoSupermercado(item.id);

                    return (
                        <button
                            key={item.id || 'all'}
                            onClick={() => onSelectSupermarket(item.id)}
                            className={`flex w-full items-center gap-3 rounded px-3 py-3 text-sm font-semibold transition-colors ${isSelected
                                ? 'bg-violet-700 text-white'
                                : 'text-zinc-700 hover:bg-zinc-50 hover:text-violet-700'
                                }`}
                        >
                            <span className={`flex h-7 w-8 shrink-0 items-center justify-center rounded border ${isSelected ? 'border-white/20 bg-white' : 'border-zinc-200 bg-white'}`}>
                                {logo ? (
                                    <img src={logo} alt={item.name} className="h-full w-full object-contain p-0.5" />
                                ) : item.id ? (
                                    <span className="text-[10px] font-bold text-violet-700">{iniciais(item.name)}</span>
                                ) : (
                                    <LayoutGrid size={17} className={isSelected ? 'text-violet-700' : 'text-zinc-400'} />
                                )}
                            </span>
                            <span className="flex-1 text-left">{item.name}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${isSelected ? 'bg-white/15 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                                {item.count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SupermarketMenu;
