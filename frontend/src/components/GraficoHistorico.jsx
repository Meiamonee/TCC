import React from 'react';
import { formatarMoeda } from '../formatar';

// Grafico em degraus do preco ao longo do tempo (o preco vale ate a proxima mudanca).
const GraficoHistorico = ({ historico }) => {
    const pontos = historico?.pontos || [];

    if (pontos.length < 2) {
        return (
            <p className="rounded-xl border border-dashed border-papel-300 p-5 text-sm text-tinta-500">
                Ainda não houve mudança de preço registrada. O histórico é montado a cada coleta automática.
            </p>
        );
    }

    const largura = 600;
    const altura = 160;
    const margem = 12;
    const tempos = pontos.map(ponto => new Date(ponto.data).getTime());
    const precos = pontos.map(ponto => ponto.preco);
    // A linha vai ate o momento da consulta, pois o ultimo preco continua valendo.
    const consulta = historico.consultadoEm ? new Date(historico.consultadoEm).getTime() : 0;
    const [tMin, tMax] = [Math.min(...tempos), Math.max(consulta, ...tempos)];
    const [pMin, pMax] = [Math.min(...precos), Math.max(...precos)];
    const x = t => margem + ((t - tMin) / Math.max(tMax - tMin, 1)) * (largura - 2 * margem);
    const y = p => altura - margem - ((p - pMin) / Math.max(pMax - pMin, 0.01)) * (altura - 2 * margem);
    const caminho = pontos
        .map((ponto, i) => (i === 0 ? `M${x(tempos[i])},${y(ponto.preco)}` : `H${x(tempos[i])} V${y(ponto.preco)}`))
        .join(' ') + ` H${x(tMax)}`;

    return (
        <div>
            {/* preserveAspectRatio="none" estica o grafico na largura toda; a linha mantem a espessura. */}
            <svg viewBox={`0 0 ${largura} ${altura}`} preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label="Histórico de preço">
                <path d={`${caminho} V${altura - margem} H${x(tMin)} Z`} fill="#d5eadb" />
                <path d={caminho} fill="none" stroke="#1f7a45" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-tinta-500">
                <span>{new Date(tMin).toLocaleDateString('pt-BR')}</span>
                <span>
                    Menor: <strong className="text-feira-600">{formatarMoeda(historico.menorPreco)}</strong>
                    {' · '}Maior: <strong className="text-tinta-900">{formatarMoeda(historico.maiorPreco)}</strong>
                </span>
                <span>Hoje</span>
            </div>
        </div>
    );
};

export default GraficoHistorico;
