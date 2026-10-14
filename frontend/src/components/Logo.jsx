import React from 'react';

// Marca do SuperPreco: uma etiqueta de preco com o "S" e o nome em duas cores.
export const MarcaEtiqueta = ({ className = 'h-10 w-10' }) => (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
        <path d="M13 4h21a3 3 0 0 1 3 3v26a3 3 0 0 1-3 3H13L3 20z" fill="#ffd23f" />
        <path d="M13 4h21a3 3 0 0 1 3 3v26a3 3 0 0 1-3 3H13L3 20z" fill="none" stroke="#1d1b16" strokeOpacity=".12" />
        <circle cx="12" cy="20" r="2.4" fill="#0c3d24" />
        <path
            d="M29.6 13.4c-1.1-1.6-3-2.5-5.2-2.5-3 0-5.2 1.6-5.2 4 0 5.5 9.7 3.2 9.7 7.8 0 2-2.1 3.4-4.7 3.4-2.4 0-4.4-1-5.5-2.8"
            fill="none"
            stroke="#0c3d24"
            strokeWidth="3"
            strokeLinecap="round"
        />
    </svg>
);

const Logo = ({ claro = true, subtitulo = true }) => (
    <span className="flex items-center gap-2.5">
        <MarcaEtiqueta className="h-11 w-11 shrink-0 -rotate-6 drop-shadow" />
        <span className="leading-none">
            <span className={`block font-display text-[1.6rem] font-extrabold tracking-tight ${claro ? 'text-papel-50' : 'text-feira-800'}`}>
                Super<span className="text-etiqueta-400">Preço</span>
            </span>
            {subtitulo && (
                <span className={`mt-1 block text-[11px] font-semibold uppercase tracking-[0.18em] ${claro ? 'text-feira-200' : 'text-tinta-500'}`}>
                    Poços de Caldas
                </span>
            )}
        </span>
    </span>
);

export default Logo;
