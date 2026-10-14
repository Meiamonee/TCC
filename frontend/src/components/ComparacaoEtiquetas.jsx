import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Eye, Plus } from 'lucide-react';
import { useApp } from '../AppContext';
import { useDispositivo } from '../useDispositivo';
import { formatarDataColeta, formatarMoeda, formatarPrecoUnidade } from '../formatar';
import { corBarraDoSupermercado } from '../supermercados';
import Preco from './Preco';

const Diferenca = ({ item, percentual, ehMaisBarato, haComparacao }) => {
    if (!haComparacao) return <span className="font-normal text-tinta-400">só neste mercado</span>;
    if (ehMaisBarato) return <span className="font-preco uppercase tracking-wider text-oferta-500">Mais barato</span>;
    return (
        <span className="text-oferta-600">
            +{formatarMoeda(item.diferenca)}
            <span className="block font-normal text-tinta-400 sm:mt-0.5">{percentual}% a mais</span>
        </span>
    );
};

// Uma linha do quadro de precos: posicao, mercado ...... preco, diferenca e botoes.
const LinhaMercado = ({ item, posicao, idAtual, menorPreco, haComparacao }) => {
    const { adicionarNaLista } = useApp();
    const dispositivo = useDispositivo();
    const ehAtual = item.id === idAtual;
    const ehMaisBarato = haComparacao && item.priceNumber === menorPreco;
    const percentual = menorPreco > 0 ? Math.round((item.diferenca / menorPreco) * 100) : 0;
    const precoUnidade = item.unit !== 'kg' && formatarPrecoUnidade(item);
    const tamanhoPreco = dispositivo === 'mobile' ? 'p' : 'm';
    const sufixo = item.unit === 'kg' ? 'kg' : undefined;
    const diferenca = <Diferenca item={item} percentual={percentual} ehMaisBarato={ehMaisBarato} haComparacao={haComparacao} />;
    const nome = ehAtual
        ? <span>{item.name}</span>
        : <Link to={`/produto/${item.id}`} className="underline-offset-2 hover:text-feira-700 hover:underline">{item.name}</Link>;

    return (
        <li className={`grid grid-cols-[2rem_minmax(0,1fr)_auto_auto] items-center gap-x-3 rounded-2xl px-3 py-4 sm:grid-cols-[3rem_minmax(0,1fr)_auto_6.5rem_auto] sm:gap-x-5 sm:px-5 ${ehMaisBarato ? 'bg-etiqueta-100' : ''}`}>
            <span className={`font-preco text-[2rem] font-bold leading-none sm:text-[2.75rem] ${ehMaisBarato ? 'text-oferta-500' : 'text-tinta-400/45'}`}>
                {posicao}º
            </span>

            <div className="flex min-w-0 items-center gap-4">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 font-display text-base font-bold leading-tight text-tinta-900 sm:text-lg">
                        <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: corBarraDoSupermercado(item.supermercado) }} />
                        <span className="truncate">{item.supermercadoNome}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-tinta-700">{nome}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-tinta-400">
                        <span>{precoUnidade ? `${precoUnidade} · ` : ''}coletado {formatarDataColeta(item.dataColeta)}</span>
                        {ehAtual && <span className="flex items-center gap-1 font-semibold text-feira-600"><Eye size={12} /> você está vendo</span>}
                    </p>
                </div>
                {/* Pontilhado ligando o mercado ao preco, como nas listas de preco impressas. */}
                <span className="hidden h-0 min-w-8 flex-1 border-b-2 border-dotted border-tinta-400/40 sm:block" />
            </div>

            <div className="flex flex-col items-end">
                {ehMaisBarato
                    ? <span className="etiqueta inline-block py-1 pr-3 [--furo:#fff6cc]"><Preco valor={item.priceNumber} tamanho={tamanhoPreco} sufixo={sufixo} /></span>
                    : <Preco valor={item.priceNumber} tamanho={tamanhoPreco} sufixo={sufixo} className="text-tinta-900" />}
                <span className="mt-1 text-right text-[11px] font-bold leading-tight sm:hidden">{diferenca}</span>
            </div>

            <span className="hidden text-right text-[13px] font-bold leading-tight sm:block">{diferenca}</span>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => adicionarNaLista(item)}
                    className="flex h-10 min-w-10 items-center justify-center gap-1 rounded-full bg-feira-600 px-2.5 text-sm font-bold text-white transition hover:bg-feira-700 active:scale-95 sm:px-4"
                    aria-label={`Adicionar ${item.name} do ${item.supermercadoNome} à lista`}
                >
                    <Plus size={16} strokeWidth={2.75} /><span className="hidden sm:inline">Lista</span>
                </button>
                <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden h-10 w-10 items-center justify-center rounded-full text-tinta-400 transition hover:bg-papel-200 hover:text-feira-700 sm:flex"
                    aria-label={`Abrir no site do ${item.supermercadoNome}`}
                    title="Ver no site do mercado"
                >
                    <ExternalLink size={16} />
                </a>
            </div>
        </li>
    );
};

// Quadro de precos do mesmo produto em cada supermercado, do mais barato ao mais caro.
const ComparacaoEtiquetas = ({ opcoes, idAtual }) => {
    const menorPreco = Math.min(...opcoes.map(item => item.priceNumber));
    const haComparacao = opcoes.length > 1;

    return (
        <ol>
            {opcoes.map((item, indice) => (
                <Fragment key={item.id}>
                    {indice > 0 && <li aria-hidden="true" className="mx-3 border-t-2 border-dashed border-tinta-400/25 sm:mx-5" />}
                    {/* Precos empatados dividem a mesma posicao. */}
                    <LinhaMercado item={item} posicao={opcoes.filter(outro => outro.priceNumber < item.priceNumber).length + 1} idAtual={idAtual} menorPreco={menorPreco} haComparacao={haComparacao} />
                </Fragment>
            ))}
        </ol>
    );
};

export default ComparacaoEtiquetas;
