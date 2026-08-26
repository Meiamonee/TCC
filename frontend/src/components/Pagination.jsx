import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else if (currentPage <= 3) {
            pages.push(1, 2, 3, 4, '...', totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
        }

        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex h-10 items-center gap-1 rounded border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <ChevronLeft size={18} />
                <span className="hidden sm:inline">Anterior</span>
            </button>

            <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-zinc-400">...</span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`h-10 min-w-10 rounded px-3 text-sm font-semibold transition-colors ${currentPage === page
                                ? 'bg-violet-700 text-white'
                                : 'border border-zinc-200 bg-white text-zinc-700 hover:border-violet-300 hover:text-violet-700'
                                }`}
                        >
                            {page}
                        </button>
                    )
                ))}
            </div>

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex h-10 items-center gap-1 rounded border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <span className="hidden sm:inline">Proxima</span>
                <ChevronRight size={18} />
            </button>
        </div>
    );
};

export default Pagination;
