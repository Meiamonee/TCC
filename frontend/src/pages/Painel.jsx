import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { fetchEstatisticas } from '../services/api';
import { formatarDataCompleta, formatarMoeda, formatarTempoRelativo } from '../formatar';
import { estiloDepartamento } from '../departamentos';
import { corBarraDoSupermercado } from '../supermercados';
import SeloMercado from '../components/SeloMercado';
import Preco from '../components/Preco';

const numero = valor => (valor ?? 0).toLocaleString('pt-BR');
const semAno = data => formatarDataCompleta(data).replace(/\/\d{4}/, '');

const Numero = ({ rotulo, valor, detalhe, destaque }) => (
    <div className={`p-4 sm:p-5 ${destaque ? 'bg-etiqueta-100' : ''}`}>
        <dt className="font-preco text-[12px] font-bold uppercase tracking-[0.14em] text-tinta-500 sm:text-[13px] sm:tracking-[0.16em]">{rotulo}</dt>
        <dd className="mt-1 font-preco text-[1.7rem] font-bold leading-none text-feira-900 sm:text-[2.4rem]">{valor}</dd>
        {detalhe && <dd className="mt-1.5 text-xs text-tinta-500">{detalhe}</dd>}
    </div>
);

const Secao = ({ sobretitulo, titulo, subtitulo, children, className = '' }) => (
    <section className={`rounded-[1.75rem] border border-papel-300 bg-papel-50 p-5 sm:p-7 ${className}`}>
        <p className="font-preco text-sm font-bold uppercase tracking-[0.2em] text-oferta-500">{sobretitulo}</p>
        <h2 className="text-xl font-extrabold text-feira-900 sm:text-2xl">{titulo}</h2>
        {subtitulo && <p className="mt-0.5 text-sm text-tinta-500">{subtitulo}</p>}
        <div className="mt-5">{children}</div>
    </section>
);

const ListaVariacoes = ({ itens, tipo }) => {
    if (itens.length === 0) {
        return <p className="text-sm text-tinta-500">Nenhuma {tipo} registrada ainda. As variações aparecem a partir da segunda coleta.</p>;
    }
    return (
        <ul className="divide-y divide-dashed divide-papel-300">
            {itens.map(item => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                    {item.imagem && <img src={item.imagem} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain p-0.5" loading="lazy" />}
                    <div className="min-w-0 flex-1">
                        <Link to={`/produto/${item.id}`} className="line-clamp-1 text-sm font-semibold text-tinta-900 hover:text-feira-700">{item.nome}</Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-tinta-500">
                            <SeloMercado slug={item.supermercado} nome={item.supermercadoNome} />
                            <span className="line-through">{formatarMoeda(item.precoAnterior)}</span>
                            <span>→</span>
                            <strong className="font-preco text-sm text-tinta-900">{formatarMoeda(item.precoAtual)}</strong>
                        </div>
                    </div>
                    <span className={`shrink-0 rounded-lg px-2.5 py-1 font-preco text-base font-bold ${tipo === 'queda' ? 'bg-feira-100 text-feira-700' : 'bg-oferta-100 text-oferta-700'}`}>
                        {item.percentual > 0 ? '+' : ''}{item.percentual.toLocaleString('pt-BR')}%
                    </span>
                </li>
            ))}
        </ul>
    );
};

const Painel = () => {
    const [dados, setDados] = useState(null);
    const [erro, setErro] = useState(null);
    const [recarregar, setRecarregar] = useState(0);

    useEffect(() => {
        let cancelado = false;
        fetchEstatisticas()
            .then(resposta => { if (!cancelado) { setDados(resposta); setErro(null); } })
            .catch(error => { if (!cancelado) setErro(error.message); });
        return () => { cancelado = true; };
    }, [recarregar]);

    if (erro && !dados) {
        return (
            <div className="mx-auto max-w-xl px-4 py-24 text-center">
                <h1 className="text-3xl font-extrabold text-feira-900">Não foi possível carregar o painel</h1>
                <p className="mt-2 text-tinta-500">{erro}</p>
                <button onClick={() => setRecarregar(v => v + 1)} className="mt-6 rounded-xl bg-feira-700 px-6 py-3 text-sm font-bold text-papel-50">Tentar novamente</button>
            </div>
        );
    }

    if (!dados) {
        return (
            <div className="flex items-center justify-center gap-2 py-32 text-tinta-500">
                <Loader2 className="animate-spin" /> Montando o boletim...
            </div>
        );
    }

    const { resumo, coleta, porMercado, categorias, cestaBasica, variacoes } = dados;
    const completa = item => item.itensEncontrados === item.itensTotal;
    const cestas = [...cestaBasica.porMercado].sort((a, b) => completa(b) - completa(a) || a.total - b.total);
    const maiorCesta = Math.max(...cestas.map(item => item.total), 1);
    const maiorCategoria = Math.max(...categorias.map(item => item.total), 1);
    const maiorMercado = Math.max(...porMercado.map(item => item.disponiveis), 1);
    const ultimaExecucao = coleta.ultimaExecucao;

    return (
        <div>
            <div className="fundo-encarte border-b border-papel-300">
                <div className="mx-auto max-w-7xl px-4 pb-10 pt-10">
                    <div className="flex flex-wrap items-end justify-between gap-4 border-b-4 border-double border-feira-800/70 pb-4">
                        <div>
                            <p className="font-preco text-sm font-bold uppercase tracking-[0.25em] text-oferta-500">Painel de preços</p>
                            <h1 className="text-4xl font-extrabold text-feira-900 sm:text-6xl">Boletim do SuperPreço</h1>
                        </div>
                        <div className="text-sm text-tinta-500 sm:text-right">
                            <p>Edição de {formatarDataCompleta(dados.geradoEm)}</p>
                            <button
                                onClick={() => setRecarregar(v => v + 1)}
                                className="mt-1 inline-flex items-center gap-1.5 font-bold text-feira-600 hover:text-feira-800"
                            >
                                <RefreshCw size={14} /> Atualizar
                            </button>
                        </div>
                    </div>

                    <dl className="mt-6 grid grid-cols-2 divide-x divide-y divide-dashed divide-papel-300 overflow-hidden rounded-2xl border border-papel-300 bg-papel-50 md:grid-cols-4 md:divide-y-0 [&>*:nth-child(n+5)]:md:border-t [&>*:nth-child(n+5)]:md:border-dashed">
                        <Numero rotulo="Produtos coletados" valor={numero(resumo.produtosDisponiveis)} detalhe={`${numero(resumo.alimentos)} alimentos`} destaque />
                        <Numero rotulo="Última atualização" valor={semAno(resumo.ultimaColeta)} detalhe={formatarTempoRelativo(resumo.ultimaColeta)} />
                        <Numero
                            rotulo="Próxima coleta"
                            valor={resumo.proximaColeta ? semAno(resumo.proximaColeta) : '--'}
                            detalhe={resumo.proximaColeta ? formatarTempoRelativo(resumo.proximaColeta) : coleta.agendamento}
                        />
                        <Numero
                            rotulo="Cesta mais barata"
                            valor={cestaBasica.maisBarato ? formatarMoeda(cestaBasica.maisBarato.total) : '--'}
                            detalhe={cestaBasica.maisBarato ? `no ${cestaBasica.maisBarato.supermercadoNome}` : undefined}
                            destaque
                        />
                        <Numero rotulo="Supermercados" valor={resumo.supermercados} detalhe={`${resumo.categorias} corredores`} />
                        <Numero rotulo="Em oferta" valor={numero(resumo.ofertas)} detalhe="com preço de/por" />
                        <Numero rotulo="Mudanças de preço" valor={numero(resumo.mudancasDePreco)} detalhe={`${numero(variacoes.quantidadeQuedas)} quedas · ${numero(variacoes.quantidadeAltas)} altas`} />
                        <Numero rotulo="Monitorando desde" valor={resumo.primeiraColeta ? new Date(resumo.primeiraColeta).toLocaleDateString('pt-BR') : '--'} detalhe={`${numero(resumo.produtosIndisponiveis)} saíram dos sites`} />
                    </dl>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                        {coleta.emExecucao ? (
                            <span className="flex items-center gap-2 rounded-lg bg-etiqueta-400 px-3 py-1.5 font-bold text-feira-900">
                                <Loader2 size={15} className="animate-spin" /> Coleta em andamento desde {formatarDataCompleta(coleta.inicio)}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 rounded-lg bg-feira-100 px-3 py-1.5 font-bold text-feira-800">
                                <CheckCircle2 size={15} /> Coleta automática ativa · {coleta.agendamento}
                            </span>
                        )}
                        {ultimaExecucao && (
                            <span className="text-tinta-500">
                                Última execução: {formatarDataCompleta(ultimaExecucao.fim)}
                                {ultimaExecucao.erro ? ` (falhou: ${ultimaExecucao.erro})` : ''}
                                {ultimaExecucao.falhas?.length ? ` · ${ultimaExecucao.falhas.length} mercado(s) com falha` : ''}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
                <Secao sobretitulo="Supermercados" titulo="Quanto coletamos de cada um" subtitulo="Preços das unidades de Poços de Caldas">
                    <div className="space-y-4">
                        {porMercado.map(mercado => (
                            <div key={mercado.slug} className="grid gap-3 border-b border-dashed border-papel-300 pb-4 last:border-0 last:pb-0 md:grid-cols-[220px_1fr_auto] md:items-center">
                                <div>
                                    <p className="font-display text-lg font-extrabold text-feira-900">{mercado.nome}</p>
                                    <p className="text-xs text-tinta-500">{mercado.endereco?.replace(/,\s*Po[cç]os de Caldas$/i, '')}</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className="h-3 flex-1 overflow-hidden rounded-full bg-papel-200">
                                            <span className="block h-full rounded-full" style={{ width: `${(mercado.disponiveis / maiorMercado) * 100}%`, background: corBarraDoSupermercado(mercado.slug) }} />
                                        </span>
                                        <span className="w-16 text-right font-preco text-2xl font-bold text-feira-900">{numero(mercado.disponiveis)}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-tinta-500">
                                        {numero(mercado.alimentos)} alimentos · {numero(mercado.ofertas)} em oferta · {numero(mercado.indisponiveis)} saíram do site
                                    </p>
                                </div>
                                <div className="text-left text-xs text-tinta-500 md:text-right">
                                    <p className="font-semibold text-tinta-900">Coletado em {formatarDataCompleta(mercado.ultimaColeta)}</p>
                                    <p>{formatarTempoRelativo(mercado.ultimaColeta)} · {mercado.coletasRealizadas} coleta(s) registradas</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Secao>

                <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
                    <Secao sobretitulo="Cesta básica" titulo="Custo mensal em cada mercado" subtitulo={cestaBasica.referencia}>
                        <ul className="space-y-4">
                            {cestas.map(item => {
                                const ehMaisBarato = cestaBasica.maisBarato?.supermercado === item.supermercado;
                                return (
                                    <li key={item.supermercado}>
                                        <div className="mb-1.5 flex items-end justify-between">
                                            <span className="flex items-center gap-2">
                                                <SeloMercado slug={item.supermercado} nome={item.supermercadoNome} />
                                                {!completa(item) && <span className="text-xs text-tinta-400">{item.itensEncontrados}/{item.itensTotal} itens</span>}
                                                {ehMaisBarato && <span className="font-preco text-xs font-bold uppercase tracking-wider text-feira-600">mais barata</span>}
                                            </span>
                                            <Preco valor={item.total} tamanho="p" className={ehMaisBarato ? 'text-feira-700' : 'text-tinta-900'} />
                                        </div>
                                        <div className="h-3 overflow-hidden rounded-full bg-papel-200">
                                            <div
                                                className="h-full rounded-full"
                                                style={{ width: `${(item.total / maiorCesta) * 100}%`, background: completa(item) ? corBarraDoSupermercado(item.supermercado) : '#cfc6b4' }}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="mt-5 text-xs text-tinta-500">Mercados com cesta incompleta não vendem algum item pelo site e ficam fora da comparação.</p>
                    </Secao>

                    <Secao sobretitulo="Corredores" titulo="Produtos por departamento">
                        <ul className="space-y-2.5">
                            {categorias.map(categoria => {
                                const { icone: Icone, cor, tom } = estiloDepartamento(categoria.nome);
                                return (
                                    <li key={categoria.nome}>
                                        <Link to={`/produtos?departamento=${encodeURIComponent(categoria.nome)}`} className="group flex items-center gap-3">
                                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cor}`}><Icone size={14} /></span>
                                            <span className="w-36 shrink-0 truncate text-sm text-tinta-700 group-hover:text-feira-700 sm:w-44">{categoria.nome}</span>
                                            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-papel-200">
                                                <span className="block h-full rounded-full" style={{ width: `${(categoria.total / maiorCategoria) * 100}%`, background: tom }} />
                                            </span>
                                            <span className="w-14 shrink-0 text-right font-preco text-base font-bold text-tinta-900">{numero(categoria.total)}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </Secao>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Secao sobretitulo={<span className="flex items-center gap-1.5"><TrendingDown size={15} /> Baixaram</span>} titulo="Maiores quedas de preço" subtitulo="Última coleta comparada ao preço anterior">
                        <ListaVariacoes itens={variacoes.quedas} tipo="queda" />
                    </Secao>
                    <Secao sobretitulo={<span className="flex items-center gap-1.5"><TrendingUp size={15} /> Subiram</span>} titulo="Maiores altas de preço" subtitulo="Última coleta comparada ao preço anterior">
                        <ListaVariacoes itens={variacoes.altas} tipo="alta" />
                    </Secao>
                </div>

                <section className="fundo-feira rounded-[1.75rem] p-6 text-papel-50 sm:p-8">
                    <p className="font-preco text-sm font-bold uppercase tracking-[0.2em] text-etiqueta-300">Metodologia</p>
                    <h2 className="text-2xl font-extrabold">Como os dados são coletados</h2>
                    <div className="mt-6 grid gap-6 text-sm leading-6 text-feira-100 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <p className="font-display text-base font-bold text-papel-50">Coleta automática</p>
                            <p>Um robô com Selenium WebDriver abre o site de cada supermercado e lê os produtos exibidos nas páginas, {coleta.agendamento}.</p>
                        </div>
                        <div>
                            <p className="font-display text-base font-bold text-papel-50">Unidade de Poços</p>
                            <p>Antes de coletar, o sistema confere se o site mostra a loja de Poços de Caldas, para não misturar preços de outras unidades.</p>
                        </div>
                        <div>
                            <p className="font-display text-base font-bold text-papel-50">Comparação justa</p>
                            <p>O mesmo produto é identificado por marca, versão e tamanho; o preço por kg ou litro é calculado a partir do nome.</p>
                        </div>
                        <div>
                            <p className="font-display text-base font-bold text-papel-50">Uso responsável</p>
                            <p>São lidas só páginas públicas permitidas pelos sites (robots.txt). Confira o preço no site do mercado antes de comprar.</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Painel;
