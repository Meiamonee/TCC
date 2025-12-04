import React from 'react';

const CategoryMenu = ({ categories, selectedCategory, onSelectCategory }) => {
    return (
        <div className="flex overflow-x-auto pb-4 gap-2 mb-6 scrollbar-hide">
            <button
                onClick={() => onSelectCategory(null)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${selectedCategory === null
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
            >
                Todos
            </button>

            {categories.map((category) => (
                <button
                    key={category}
                    onClick={() => onSelectCategory(category)}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${selectedCategory === category
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                >
                    {category}
                </button>
            ))}
        </div>
    );
};

export default CategoryMenu;
