import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function paginasVisiveis(atual, total) {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (atual <= 3) return [1, 2, 3, 4, '...', total];
    if (atual >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
    return [1, '...', atual - 1, atual, atual + 1, '...', total];
}

const BOTAO = 'flex h-10 min-w-10 items-center justify-center rounded-xl px-3 font-preco text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-40';
const NEUTRO = 'border border-papel-300 bg-papel-50 text-tinta-700 hover:border-feira-400 hover:text-feira-700';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    return (
        <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Paginação">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className={`${BOTAO} ${NEUTRO} gap-1`}>
                <ChevronLeft size={18} />
                <span className="hidden font-sans text-sm sm:inline">Anterior</span>
            </button>

            {paginasVisiveis(currentPage, totalPages).map((pagina, indice) => (
                pagina === '...' ? (
                    <span key={`reticencias-${indice}`} className="px-1 text-tinta-400">…</span>
                ) : (
                    <button
                        key={pagina}
                        onClick={() => onPageChange(pagina)}
                        aria-current={currentPage === pagina ? 'page' : undefined}
                        className={`${BOTAO} ${currentPage === pagina ? 'bg-feira-700 text-papel-50' : NEUTRO}`}
                    >
                        {pagina}
                    </button>
                )
            ))}

            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className={`${BOTAO} ${NEUTRO} gap-1`}>
                <span className="hidden font-sans text-sm sm:inline">Próxima</span>
                <ChevronRight size={18} />
            </button>
        </nav>
    );
};

export default Pagination;
