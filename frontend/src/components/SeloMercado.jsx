import React from 'react';
import { corDoSupermercado } from '../supermercados';

// Etiqueta com o nome do supermercado, na cor de cada rede.
const SeloMercado = ({ slug, nome, tamanho = 'pequeno' }) => {
    const classes = tamanho === 'grande' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';
    return (
        <span className={`inline-flex items-center rounded-full font-bold ${classes} ${corDoSupermercado(slug)}`}>
            {nome}
        </span>
    );
};

export default SeloMercado;
