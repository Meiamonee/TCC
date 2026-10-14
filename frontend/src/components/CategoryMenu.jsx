import React from 'react';

const botao = ativo => `whitespace-nowrap rounded px-4 py-2.5 text-sm font-semibold transition-colors ${ativo
    ? 'bg-violet-700 text-white'
    : 'border border-zinc-200 bg-white text-zinc-700 hover:border-violet-300 hover:text-violet-700'
    }`;

const CategoryMenu = ({ categories, selectedCategory, onSelectCategory }) => {
    return (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => onSelectCategory(null)} className={botao(selectedCategory === null)}>
                Todas
            </button>

            {categories.map(category => (
                <button
                    key={category.nome}
                    onClick={() => onSelectCategory(category.nome)}
                    className={botao(selectedCategory === category.nome)}
                >
                    {category.nome}
                    <span className={`ml-1.5 text-xs ${selectedCategory === category.nome ? 'text-white/70' : 'text-zinc-400'}`}>
                        {category.total}
                    </span>
                </button>
            ))}
        </div>
    );
};

export default CategoryMenu;
