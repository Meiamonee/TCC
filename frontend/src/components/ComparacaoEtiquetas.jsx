import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Plus } from 'lucide-react';
import { useApp } from '../AppContext';
import { useDispositivo } from '../useDispositivo';
import { formatarDataColeta, formatarMoeda, formatarPrecoUnidade } from '../formatar';
import { corBarraDoSupermercado } from '../supermercados';
import Preco from './Preco';
import ImagemProduto from './ImagemProduto';

// Uma linha do quadro de precos: posicao, mercado, produto ...... preco.
const LinhaMercado = ({ item, posicao, idAtual, menorPreco, haComparacao }) => {
    const { adicionarNaLista } = useApp();
    const dispositivo = useDispositivo();
    const ehAtual = item.id === idAtual;
    const ehMaisBarato = haComparacao && item.priceNumber === menorPreco;
    const percentual = menorPreco > 0 ? Math.round((item.diferenca / menorPreco) * 100) : 0;
    const precoUnidade = item.unit !== 'kg' && formatarPrecoUnidade(item);
    const nome = ehAtual
        ? <span className="text-tinta-700">{item.name}</span>
        : <Link to={`/produto/${item.id}`} className="text-tinta-700 underline-offset-2 hover:text-feira-700 hover:underline">{item.name}</Link>;

    return (
        <li className="flex items-center gap-3 py-3.5 sm:gap-4">
            <span className={`w-7 shrink-0 text-center font-preco text-[1.9rem] font-bold leading-none sm:w-9 sm:text-[2.4rem] ${ehMaisBarato ? 'text-oferta-500' : 'text-tinta-300'}`}>
                {posicao}
            </span>

            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white sm:h-14 sm:w-14">
                <ImagemProduto src={item.image} alt={item.name} className="h-full w-full object-contain p-1" tamanhoIcone={18} />
            </div>

            <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="flex items-center gap-1.5 font-display text-[15px] font-bold text-tinta-900">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: corBarraDoSupermercado(item.supermercado) }} />
                        {item.supermercadoNome}
                    </span>
                    {ehMaisBarato && <span className="font-preco text-xs font-bold uppercase tracking-wider text-oferta-500">mais barato</span>}
                    {ehAtual && <span className="font-preco text-xs font-bold uppercase tracking-wider text-feira-600">você está vendo</span>}
                </p>
                <div className="flex items-baseline gap-2">
                    <p className="min-w-0 truncate text-[13px]">{nome}</p>
                    {/* Pontilhado ligando o nome ao preco, como nas listas de preco impressas. */}
                    <span className="hidden min-w-6 flex-1 translate-y-[-3px] border-b-2 border-dotted border-tinta-400/70 sm:block" />
                </div>
                <p className="mt-0.5 text-[11px] text-tinta-400">
                    {precoUnidade ? `${precoUnidade} · ` : ''}coletado {formatarDataColeta(item.dataColeta)}
                </p>
            </div>

            <div className="shrink-0 text-right">
                <span className={`text-tinta-900 ${ehMaisBarato ? 'marcador' : ''}`}>
                    <Preco valor={item.priceNumber} tamanho={dispositivo === 'mobile' ? 'p' : 'm'} sufixo={item.unit === 'kg' ? 'kg' : undefined} />
                </span>
                <p className="mt-0.5 text-[11px] font-bold">
                    {!haComparacao
                        ? <span className="font-normal text-tinta-400">só aqui</span>
                        : item.diferenca > 0
                            ? <span className="text-oferta-600">+{formatarMoeda(item.diferenca)} · {percentual}%</span>
                            : <span className="text-feira-600">menor preço</span>}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
                <button
                    onClick={() => adicionarNaLista(item)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-feira-600 text-white transition hover:bg-feira-700 active:scale-95"
                    aria-label={`Adicionar ${item.name} do ${item.supermercadoNome} à lista`}
                    title="Adicionar à lista"
                >
                    <Plus size={18} strokeWidth={2.75} />
                </button>
                <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden h-9 w-9 items-center justify-center rounded-full text-tinta-400 transition hover:bg-papel-200 hover:text-feira-700 sm:flex"
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
        <ol className="border-y-2 border-tinta-900/80 [&>li+li]:border-t-2 [&>li+li]:border-dashed [&>li+li]:border-tinta-400/30">
            {opcoes.map((item, indice) => (
                <LinhaMercado key={item.id} item={item} posicao={indice + 1} idAtual={idAtual} menorPreco={menorPreco} haComparacao={haComparacao} />
            ))}
        </ol>
    );
};

export default ComparacaoEtiquetas;
