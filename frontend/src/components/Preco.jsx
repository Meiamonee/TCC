import React from 'react';

const TAMANHOS = {
    p: { reais: 'text-2xl', centavos: 'text-xs', moeda: 'text-[10px]', sufixo: 'text-[11px]' },
    m: { reais: 'text-[2.1rem]', centavos: 'text-sm', moeda: 'text-xs', sufixo: 'text-xs' },
    g: { reais: 'text-6xl', centavos: 'text-2xl', moeda: 'text-base', sufixo: 'text-base' },
    gg: { reais: 'text-7xl sm:text-8xl', centavos: 'text-3xl', moeda: 'text-lg', sufixo: 'text-lg' }
};

// Preco no estilo de encarte de supermercado: reais grandes e centavos sobrescritos (R$ 26,⁹⁰).
const Preco = ({ valor, tamanho = 'm', sufixo, className = '' }) => {
    if (typeof valor !== 'number') {
        return <span className={className}>--</span>;
    }

    const [reais, centavos] = valor.toFixed(2).split('.');
    const t = TAMANHOS[tamanho] || TAMANHOS.m;

    return (
        <span className={`inline-flex items-start font-preco font-bold leading-none tracking-tight ${className}`} aria-label={`R$ ${reais},${centavos}${sufixo ? ` por ${sufixo}` : ''}`}>
            <span className={`mr-0.5 mt-[0.2em] font-semibold ${t.moeda}`} aria-hidden="true">R$</span>
            <span className={t.reais} aria-hidden="true">{Number(reais).toLocaleString('pt-BR')}</span>
            <span className="flex flex-col" aria-hidden="true">
                <span className={`${t.centavos} mt-[0.1em]`}>,{centavos}</span>
                {sufixo && <span className={`${t.sufixo} font-semibold opacity-70`}>/{sufixo}</span>}
            </span>
        </span>
    );
};

export default Preco;
