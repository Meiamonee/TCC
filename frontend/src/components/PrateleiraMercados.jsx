import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { formatarDataColeta } from '../formatar';
import { corBarraDoSupermercado, escalaDaLogo, fundoDaLogo, logoDoSupermercado } from '../supermercados';

// Supermercados na mesma "prateleira" dos departamentos: logo redonda, nome, endereco,
// faixa amarela com o total de produtos e a gondola embaixo.
const PrateleiraMercados = ({ supermercados, compacto = false }) => (
    <div className={`grid gap-y-8 ${compacto ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {supermercados.map(mercado => {
            const logo = logoDoSupermercado(mercado.slug);
            const cor = corBarraDoSupermercado(mercado.slug);
            return (
                <Link key={mercado.slug} to={`/produtos?mercado=${mercado.slug}`} className="group flex flex-col items-center text-center">
                    <span
                        className={`flex items-center justify-center overflow-hidden rounded-full border-4 border-papel-50 shadow-[0_10px_20px_-10px_rgba(29,27,22,.5)] outline outline-2 outline-offset-0 transition duration-200 group-hover:-translate-y-2 group-hover:shadow-[0_16px_26px_-12px_rgba(29,27,22,.55)] ${compacto ? 'h-[104px] w-[104px]' : 'h-36 w-36'}`}
                        style={{ background: fundoDaLogo(mercado.slug), outlineColor: cor }}
                    >
                        {logo
                            ? <img src={logo} alt="" className="w-[84%] object-contain" style={{ transform: `scale(${escalaDaLogo(mercado.slug)})` }} loading="lazy" />
                            : <span className="font-display text-lg font-extrabold" style={{ color: cor }}>{mercado.nome}</span>}
                    </span>

                    <span className={`mt-3 font-display font-bold text-feira-900 group-hover:text-feira-600 ${compacto ? 'text-[15px]' : 'text-lg'}`}>{mercado.nome}</span>
                    {mercado.endereco && (
                        <span className={`mt-0.5 flex min-h-[2.5rem] items-start justify-center gap-1 px-2 leading-5 text-tinta-500 ${compacto ? 'text-[11px]' : 'text-[13px]'}`}>
                            <MapPin size={13} className="mt-[3px] shrink-0" style={{ color: cor }} />
                            {mercado.endereco.replace(/,\s*Po[cç]os de Caldas$/i, '')}
                        </span>
                    )}

                    <span className="mt-2 flex h-8 w-full items-center justify-center border-r border-feira-900/15 bg-etiqueta-400 font-preco text-lg font-bold leading-none text-feira-900">
                        {mercado.totalProdutos.toLocaleString('pt-BR')}
                        <span className="ml-1 text-xs font-semibold text-feira-800/70">produtos</span>
                    </span>
                    <span className="h-2.5 w-full bg-feira-800 shadow-[0_6px_10px_-4px_rgba(8,42,25,.45)]" aria-hidden="true" />
                    <span className="mt-2.5 text-[11px] text-tinta-400">coletado {formatarDataColeta(mercado.ultimaColeta)}</span>
                </Link>
            );
        })}
    </div>
);

export default PrateleiraMercados;
