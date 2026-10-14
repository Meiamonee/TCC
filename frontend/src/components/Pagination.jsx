import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function paginasVisiveis(atual, total) {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (atual <= 3) return [1, 2, 3, 4, '...', total];
    if (atual >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
    return [1, '...', atual - 1, atual, atual + 1, '...', total];
}

const BOTAO = 'flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    return (
        <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Paginação">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`${BOTAO} gap-1 border border-zinc-300 bg-white text-zinc-700 hover:border-green-500 hover:text-green-700`}
            >
                <ChevronLeft size={18} />
                <span className="hidden sm:inline">Anterior</span>
            </button>

            {paginasVisiveis(currentPage, totalPages).map((pagina, indice) => (
                pagina === '...' ? (
                    <span key={`reticencias-${indice}`} className="px-1 text-zinc-400">…</span>
                ) : (
                    <button
                        key={pagina}
                        onClick={() => onPageChange(pagina)}
                        aria-current={currentPage === pagina ? 'page' : undefined}
                        className={`${BOTAO} ${currentPage === pagina ? 'bg-green-600 text-white' : 'border border-zinc-300 bg-white text-zinc-700 hover:border-green-500 hover:text-green-700'}`}
                    >
                        {pagina}
                    </button>
                )
            ))}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`${BOTAO} gap-1 border border-zinc-300 bg-white text-zinc-700 hover:border-green-500 hover:text-green-700`}
            >
                <span className="hidden sm:inline">Próxima</span>
                <ChevronRight size={18} />
            </button>
        </nav>
    );
};

export default Pagination;
