import React from 'react';
import { corDoSupermercado } from '../supermercados';

// Etiqueta com o nome do supermercado, na cor de cada rede.
const SeloMercado = ({ slug, nome, tamanho = 'pequeno' }) => {
    const classes = tamanho === 'grande' ? 'px-2.5 py-1 text-xs' : 'px-2 py-[3px] text-[10px]';
    return (
        <span className={`inline-flex items-center gap-1 rounded-md font-extrabold uppercase tracking-wide ${classes} ${corDoSupermercado(slug)}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" aria-hidden="true" />
            {nome}
        </span>
    );
};

export default SeloMercado;
