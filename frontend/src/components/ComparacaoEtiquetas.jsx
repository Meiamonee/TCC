import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Plus } from 'lucide-react';
import { useApp } from '../AppContext';
import { useDispositivo } from '../useDispositivo';
import { formatarDataColeta, formatarMoeda, formatarPrecoUnidade } from '../formatar';
import { corBarraDoSupermercado } from '../supermercados';
import Preco from './Preco';
import ImagemProduto from './ImagemProduto';
import Carrossel from './Carrossel';

// Um cartao por supermercado, como etiquetas de gondola lado a lado.
const CartaoMercado = ({ item, posicao, idAtual, menorPreco, haComparacao }) => {
    const { adicionarNaLista } = useApp();
    const ehAtual = item.id === idAtual;
    const ehMaisBarato = haComparacao && item.priceNumber === menorPreco;
    const cor = corBarraDoSupermercado(item.supermercado);
    const percentual = menorPreco > 0 ? Math.round((item.diferenca / menorPreco) * 100) : 0;
    const precoUnidade = item.unit !== 'kg' && formatarPrecoUnidade(item);

    return (
        <article className={`relative flex h-full flex-col overflow-hidden rounded-2xl bg-papel-50 ${ehAtual ? 'border-2 border-feira-500 shadow-cartao' : 'border border-papel-300'}`}>
            <header className="flex items-center justify-between gap-2 px-4 py-2.5 text-white" style={{ background: cor }}>
                <span className="truncate font-display text-[15px] font-bold">{item.supermercadoNome}</span>
                <span className="shrink-0 rounded-md bg-black/20 px-1.5 py-0.5 font-preco text-sm font-bold">{posicao}º</span>
            </header>

            {ehMaisBarato && (
                <span className="absolute right-3 top-12 z-10 rotate-6 rounded-md border-2 border-oferta-500 bg-papel-50 px-2 py-0.5 font-preco text-xs font-extrabold uppercase tracking-wider text-oferta-500 shadow">
                    Mais barato
                </span>
            )}

            <div className="flex flex-1 flex-col p-4">
                <div className="mx-auto h-28 w-28 overflow-hidden rounded-xl bg-white">
                    <ImagemProduto src={item.image} alt={item.name} className="h-full w-full object-contain p-2" tamanhoIcone={26} />
                </div>
                {ehAtual
                    ? <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-center text-[13px] leading-5 text-tinta-700">{item.name}</p>
                    : <Link to={`/produto/${item.id}`} className="mt-3 line-clamp-2 min-h-[2.5rem] text-center text-[13px] leading-5 text-tinta-700 hover:text-feira-700">{item.name}</Link>}

                <div className="mt-3 flex justify-center">
                    <span className={`etiqueta inline-block py-1.5 pr-4 ${ehMaisBarato ? '' : '!bg-papel-200'}`}>
                        <Preco valor={item.priceNumber} tamanho="m" sufixo={item.unit === 'kg' ? 'kg' : undefined} />
                    </span>
                </div>

                <p className="mt-2 text-center text-xs">
                    {!haComparacao
                        ? <span className="text-tinta-500">único mercado com este produto</span>
                        : item.diferenca > 0
                            ? <span className="font-bold text-oferta-600">+{formatarMoeda(item.diferenca)} ({percentual}% a mais)</span>
                            : <span className="font-bold text-feira-600">menor preço</span>}
                </p>
                <p className="mt-0.5 text-center text-[11px] text-tinta-400">
                    {precoUnidade ? `${precoUnidade} · ` : ''}coletado {formatarDataColeta(item.dataColeta)}
                </p>

                <div className="mt-auto flex gap-2 pt-4">
                    <button
                        onClick={() => adicionarNaLista(item)}
                        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-feira-600 text-sm font-bold text-white transition hover:bg-feira-700 active:scale-95"
                        aria-label={`Adicionar ${item.name} do ${item.supermercadoNome} à lista`}
                    >
                        <Plus size={16} strokeWidth={2.75} /> Lista
                    </button>
                    <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-papel-300 bg-white text-tinta-500 hover:text-feira-700"
                        aria-label={`Abrir no site do ${item.supermercadoNome}`}
                    >
                        <ExternalLink size={16} />
                    </a>
                </div>
            </div>

            {ehAtual && (
                <span className="bg-feira-500 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-white">Você está vendo</span>
            )}
        </article>
    );
};

const ComparacaoEtiquetas = ({ opcoes, idAtual }) => {
    const dispositivo = useDispositivo();
    const menorPreco = Math.min(...opcoes.map(item => item.priceNumber));
    const haComparacao = opcoes.length > 1;
    const cartoes = opcoes.map((item, indice) => (
        <CartaoMercado key={item.id} item={item} posicao={indice + 1} idAtual={idAtual} menorPreco={menorPreco} haComparacao={haComparacao} />
    ));

    if (dispositivo === 'mobile' && opcoes.length > 1) {
        return <Carrossel larguraItem="w-[62vw] max-w-[250px]" rotulo="Preço em cada supermercado">{cartoes}</Carrossel>;
    }

    return (
        <div
            className="grid gap-4"
            style={{
                // Com 3 ou 4 mercados os cartoes ocupam a largura toda; com 1 ou 2, ficam com largura fixa.
                gridTemplateColumns: dispositivo === 'tablet' && opcoes.length > 2
                    ? 'repeat(2, minmax(0, 1fr))'
                    : `repeat(${Math.min(opcoes.length, 4)}, minmax(0, ${opcoes.length >= 3 ? '1fr' : '280px'}))`
            }}
        >
            {cartoes}
        </div>
    );
};

export default ComparacaoEtiquetas;
