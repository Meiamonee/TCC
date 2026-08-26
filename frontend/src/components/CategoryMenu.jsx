import React from 'react';

const CategoryMenu = ({ categories, selectedCategory, onSelectCategory }) => {
    return (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
                onClick={() => onSelectCategory(null)}
                className={`whitespace-nowrap rounded px-4 py-2.5 text-sm font-semibold transition-colors ${selectedCategory === null
                    ? 'bg-violet-700 text-white'
                    : 'border border-zinc-200 bg-white text-zinc-700 hover:border-violet-300 hover:text-violet-700'
                    }`}
            >
                Todos
            </button>

            {categories.map((category) => (
                <button
                    key={category}
                    onClick={() => onSelectCategory(category)}
                    className={`whitespace-nowrap rounded px-4 py-2.5 text-sm font-semibold transition-colors ${selectedCategory === category
                        ? 'bg-violet-700 text-white'
                        : 'border border-zinc-200 bg-white text-zinc-700 hover:border-violet-300 hover:text-violet-700'
                        }`}
                >
                    {category}
                </button>
            ))}
        </div>
    );
};

export default CategoryMenu;
