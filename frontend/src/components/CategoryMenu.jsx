import React from 'react';

const CategoryMenu = ({ categories, selectedCategory, onSelectCategory }) => {
    return (
        <div className="flex overflow-x-auto pb-4 gap-2 mb-6 scrollbar-hide">
            <button
                onClick={() => onSelectCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 ${selectedCategory === null
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
            >
                Todos
            </button>

            {categories.map((category) => (
                <button
                    key={category}
                    onClick={() => onSelectCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 ${selectedCategory === category
                            ? 'bg-green-600 text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                >
                    {category}
                </button>
            ))}
        </div>
    );
};

export default CategoryMenu;
