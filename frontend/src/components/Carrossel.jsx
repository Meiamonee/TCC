import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Faixa horizontal com deslize (celular) e setas (tablet e computador).
// `larguraItem` define a largura de cada item em classes do Tailwind.
const Carrossel = ({ children, larguraItem = 'w-[44vw] max-w-[220px] sm:w-[220px]', rotulo = 'Carrossel' }) => {
    const trilho = useRef(null);
    const [bordas, setBordas] = useState({ inicio: true, fim: false });

    const atualizarBordas = useCallback(() => {
        const elemento = trilho.current;
        if (!elemento) return;
        setBordas({
            inicio: elemento.scrollLeft <= 4,
            fim: elemento.scrollLeft + elemento.clientWidth >= elemento.scrollWidth - 4
        });
    }, []);

    useEffect(() => {
        atualizarBordas();
        const elemento = trilho.current;
        if (!elemento) return undefined;
        const observador = new ResizeObserver(atualizarBordas);
        observador.observe(elemento);
        return () => observador.disconnect();
    }, [atualizarBordas, children]);

    const rolar = direcao => {
        const elemento = trilho.current;
        if (elemento) elemento.scrollBy({ left: direcao * elemento.clientWidth * 0.85, behavior: 'smooth' });
    };

    const itens = React.Children.toArray(children);

    return (
        <div className="group/carrossel relative" role="region" aria-label={rotulo}>
            <div
                ref={trilho}
                onScroll={atualizarBordas}
                className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1 scrollbar-hide sm:mx-0 sm:scroll-px-0 sm:gap-4 sm:px-0"
            >
                {itens.map((item, indice) => (
                    <div key={item.key ?? indice} className={`shrink-0 snap-start ${larguraItem}`}>{item}</div>
                ))}
            </div>

            {!bordas.inicio && (
                <>
                    <span className="pointer-events-none absolute inset-y-0 left-0 hidden w-12 bg-gradient-to-r from-papel-100 sm:block" aria-hidden="true" />
                    <button
                        onClick={() => rolar(-1)}
                        className="absolute left-0 top-1/2 hidden h-11 w-11 -translate-x-1/3 -translate-y-1/2 items-center justify-center rounded-full border border-papel-300 bg-papel-50 text-feira-800 shadow-cartao transition hover:bg-etiqueta-400 sm:flex"
                        aria-label="Ver anteriores"
                    >
                        <ChevronLeft size={22} />
                    </button>
                </>
            )}
            {!bordas.fim && (
                <>
                    <span className="pointer-events-none absolute inset-y-0 right-0 hidden w-12 bg-gradient-to-l from-papel-100 sm:block" aria-hidden="true" />
                    <button
                        onClick={() => rolar(1)}
                        className="absolute right-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 translate-x-1/3 items-center justify-center rounded-full border border-papel-300 bg-papel-50 text-feira-800 shadow-cartao transition hover:bg-etiqueta-400 sm:flex"
                        aria-label="Ver próximos"
                    >
                        <ChevronRight size={22} />
                    </button>
                </>
            )}
        </div>
    );
};

export default Carrossel;
