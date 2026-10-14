import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { formatarDataColeta } from '../formatar';
import { corBarraDoSupermercado, fundoDaLogo, logoDoSupermercado } from '../supermercados';

// Cartao do supermercado desenhado como uma fachada: placa com a logo e toldo listrado na cor do mercado.
const FachadaMercado = ({ mercado, className = '' }) => {
    const cor = corBarraDoSupermercado(mercado.slug);
    const logo = logoDoSupermercado(mercado.slug);

    return (
        <Link
            to={`/produtos?mercado=${mercado.slug}`}
            className={`group flex flex-col overflow-hidden rounded-2xl border border-papel-300 bg-papel-50 transition hover:-translate-y-1 hover:shadow-cartao ${className}`}
        >
            <div className="flex h-24 items-center justify-center px-6" style={{ background: fundoDaLogo(mercado.slug) }}>
                {logo
                    ? <img src={logo} alt={mercado.nome} className="max-h-16 max-w-full object-contain transition group-hover:scale-105" loading="lazy" />
                    : <span className="font-display text-2xl font-extrabold" style={{ color: cor }}>{mercado.nome}</span>}
            </div>

            {/* Toldo: listras na cor do mercado e borda recortada em meia-lua. */}
            <div aria-hidden="true">
                <div className="h-4" style={{ background: `repeating-linear-gradient(90deg, ${cor} 0 18px, #fffdf8 18px 36px)` }} />
                <div className="h-[9px]" style={{ background: `radial-gradient(circle at 9px 0, ${cor} 8.5px, transparent 9px) 0 0 / 36px 9px repeat-x, radial-gradient(circle at 9px 0, #fffdf8 8.5px, transparent 9px) 18px 0 / 36px 9px repeat-x` }} />
            </div>

            <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
                <h3 className="sr-only">{mercado.nome}</h3>
                {mercado.endereco && (
                    <p className="flex items-start gap-1.5 text-[13px] leading-5 text-tinta-500">
                        <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: cor }} />
                        {mercado.endereco.replace(/,\s*Po[cç]os de Caldas$/i, '')}
                    </p>
                )}
                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                    <div>
                        <p className="font-preco text-[2.4rem] font-bold leading-none text-feira-900">{mercado.totalProdutos.toLocaleString('pt-BR')}</p>
                        <p className="mt-1 text-[11px] text-tinta-400">produtos · {formatarDataColeta(mercado.ultimaColeta)}</p>
                    </div>
                    <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition group-hover:translate-x-0.5"
                        style={{ background: cor }}
                        aria-hidden="true"
                    >
                        <ArrowRight size={18} strokeWidth={2.5} />
                    </span>
                </div>
            </div>
        </Link>
    );
};

export default FachadaMercado;
