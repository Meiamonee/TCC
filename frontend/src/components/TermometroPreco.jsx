import React from 'react';
import { formatarMoeda } from '../formatar';
import { corBarraDoSupermercado } from '../supermercados';

// Regua do mais barato ao mais caro, com um marcador por supermercado.
const TermometroPreco = ({ opcoes, idAtual }) => {
    if (!opcoes || opcoes.length < 2) return null;

    const precos = opcoes.map(opcao => opcao.priceNumber);
    const menor = Math.min(...precos);
    const maior = Math.max(...precos);
    const amplitude = maior - menor;
    const posicao = preco => (amplitude > 0 ? ((preco - menor) / amplitude) * 100 : 50);
    const diferencaPercentual = menor > 0 ? Math.round((amplitude / menor) * 100) : 0;

    return (
        <div className="rounded-2xl border border-papel-300 bg-papel-50 p-5">
            <div className="flex items-baseline justify-between gap-3">
                <p className="font-display text-base font-bold text-feira-900">Termômetro de preço</p>
                <p className="text-xs text-tinta-500">
                    {amplitude > 0
                        ? <>diferença de <strong className="text-oferta-600">{formatarMoeda(amplitude)} ({diferencaPercentual}%)</strong></>
                        : 'mesmo preço em todos'}
                </p>
            </div>

            <div className="relative mx-2 mb-2 mt-9">
                <div className="h-2.5 rounded-full bg-gradient-to-r from-feira-400 via-etiqueta-400 to-oferta-500" />
                {opcoes.map((opcao, indice) => {
                    const ehAtual = opcao.id === idAtual;
                    // Alterna os rotulos acima e abaixo para nao se sobreporem quando os precos sao proximos.
                    const acima = indice % 2 === 0;
                    return (
                        <div key={opcao.id} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${posicao(opcao.priceNumber)}%` }}>
                            <span
                                className={`block rounded-full border-[3px] border-papel-50 shadow ${ehAtual ? 'h-6 w-6' : 'h-5 w-5'}`}
                                style={{ background: corBarraDoSupermercado(opcao.supermercado) }}
                                title={`${opcao.supermercadoNome}: ${formatarMoeda(opcao.priceNumber)}`}
                            />
                            <span className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-preco text-[13px] font-bold leading-none text-tinta-900 ${acima ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}>
                                {formatarMoeda(opcao.priceNumber)}
                            </span>
                        </div>
                    );
                })}
            </div>

            <ul className="mt-9 flex flex-wrap gap-x-4 gap-y-1.5">
                {opcoes.map(opcao => (
                    <li key={opcao.id} className={`flex items-center gap-1.5 text-xs ${opcao.id === idAtual ? 'font-bold text-tinta-900' : 'text-tinta-500'}`}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: corBarraDoSupermercado(opcao.supermercado) }} />
                        {opcao.supermercadoNome}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TermometroPreco;
