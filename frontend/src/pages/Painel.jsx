import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Activity, BadgePercent, CalendarClock, CheckCircle2, Clock, Database, Info, Loader2, Package, RefreshCw, ShoppingBasket,
    Store, TrendingDown, TrendingUp, Trophy
} from 'lucide-react';
import { fetchEstatisticas } from '../services/api';
import { formatarDataCompleta, formatarMoeda, formatarTempoRelativo } from '../formatar';
import { estiloDepartamento } from '../departamentos';
import SeloMercado from '../components/SeloMercado';

const numero = valor => (valor ?? 0).toLocaleString('pt-BR');

const Cartao = ({ icone, rotulo, valor, detalhe, destaque }) => {
    const Icone = icone;
    return (
    <div className={`rounded-2xl border p-5 ${destaque ? 'border-green-200 bg-green-50' : 'border-zinc-200 bg-white'}`}>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-500">
            <Icone size={17} className={destaque ? 'text-green-700' : 'text-zinc-400'} />
            {rotulo}
        </div>
        <div className="text-2xl font-extrabold text-zinc-900">{valor}</div>
        {detalhe && <div className="mt-0.5 text-xs text-zinc-500">{detalhe}</div>}
    </div>
    );
};

const Secao = ({ icone, titulo, subtitulo, children }) => {
    const Icone = icone;
    return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
            <Icone className="mt-0.5 shrink-0 text-green-700" />
            <div>
                <h2 className="text-lg font-extrabold text-zinc-900 sm:text-xl">{titulo}</h2>
                {subtitulo && <p className="text-sm text-zinc-500">{subtitulo}</p>}
            </div>
        </div>
        {children}
    </section>
    );
};

const ListaVariacoes = ({ itens, tipo }) => {
    if (itens.length === 0) {
        return <p className="text-sm text-zinc-500">Nenhuma {tipo === 'queda' ? 'queda' : 'alta'} registrada ainda.</p>;
    }
    return (
        <ul className="divide-y divide-zinc-100">
            {itens.map(item => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                    {item.imagem && <img src={item.imagem} alt="" className="h-11 w-11 shrink-0 rounded-lg object-contain" loading="lazy" />}
                    <div className="min-w-0 flex-1">
                        <Link to={`/produto/${item.id}`} className="line-clamp-1 text-sm font-semibold text-zinc-800 hover:text-green-700">{item.nome}</Link>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <SeloMercado slug={item.supermercado} nome={item.supermercadoNome} />
                            <span className="line-through">{formatarMoeda(item.precoAnterior)}</span>
                            <span>→</span>
                            <strong className="text-zinc-800">{formatarMoeda(item.precoAtual)}</strong>
                        </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${tipo === 'queda' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
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
            <div className="mx-auto max-w-xl px-4 py-20 text-center">
                <h1 className="text-2xl font-extrabold">Não foi possível carregar o painel</h1>
                <p className="mt-2 text-zinc-500">{erro}</p>
                <button onClick={() => setRecarregar(v => v + 1)} className="mt-6 rounded-full bg-green-600 px-6 py-3 text-sm font-bold text-white">Tentar novamente</button>
            </div>
        );
    }

    if (!dados) {
        return (
            <div className="flex items-center justify-center gap-2 py-32 text-zinc-500">
                <Loader2 className="animate-spin" /> Carregando painel...
            </div>
        );
    }

    const { resumo, coleta, porMercado, categorias, cestaBasica, variacoes } = dados;
    const cestas = [...cestaBasica.porMercado].sort((a, b) =>
        (b.itensEncontrados === b.itensTotal) - (a.itensEncontrados === a.itensTotal) || a.total - b.total);
    const maiorCesta = Math.max(...cestas.map(item => item.total), 1);
    const maiorCategoria = Math.max(...categorias.map(item => item.total), 1);
    const ultimaExecucao = coleta.ultimaExecucao;

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">Painel de preços</h1>
                    <p className="text-sm text-zinc-500">Números da coleta automática nos supermercados de Poços de Caldas</p>
                </div>
                <button
                    onClick={() => setRecarregar(v => v + 1)}
                    className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-green-500 hover:text-green-700"
                >
                    <RefreshCw size={15} /> Atualizar painel
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Cartao icone={Package} rotulo="Produtos coletados" valor={numero(resumo.produtosDisponiveis)} detalhe={`${numero(resumo.alimentos)} são alimentos`} destaque />
                <Cartao
                    icone={Clock}
                    rotulo="Última atualização"
                    valor={formatarDataCompleta(resumo.ultimaColeta).replace(/\/\d{4}/, '')}
                    detalhe={formatarTempoRelativo(resumo.ultimaColeta)}
                />
                <Cartao
                    icone={CalendarClock}
                    rotulo="Próxima coleta"
                    valor={resumo.proximaColeta ? formatarDataCompleta(resumo.proximaColeta).replace(/\/\d{4}/, '') : '--'}
                    detalhe={resumo.proximaColeta ? formatarTempoRelativo(resumo.proximaColeta) : coleta.agendamento}
                />
                <Cartao
                    icone={Trophy}
                    rotulo="Cesta básica mais barata"
                    valor={cestaBasica.maisBarato ? formatarMoeda(cestaBasica.maisBarato.total) : '--'}
                    detalhe={cestaBasica.maisBarato?.supermercadoNome}
                    destaque
                />
                <Cartao icone={Store} rotulo="Supermercados" valor={resumo.supermercados} detalhe={`${resumo.categorias} departamentos`} />
                <Cartao icone={BadgePercent} rotulo="Produtos em oferta" valor={numero(resumo.ofertas)} detalhe="com preço “de/por” no site" />
                <Cartao icone={Activity} rotulo="Mudanças de preço" valor={numero(resumo.mudancasDePreco)} detalhe={`${numero(variacoes.quantidadeQuedas)} quedas · ${numero(variacoes.quantidadeAltas)} altas`} />
                <Cartao icone={Database} rotulo="Monitorando desde" valor={resumo.primeiraColeta ? new Date(resumo.primeiraColeta).toLocaleDateString('pt-BR') : '--'} detalhe={`${numero(resumo.produtosIndisponiveis)} produtos saíram dos sites`} />
            </div>

            <Secao icone={RefreshCw} titulo="Coleta automática" subtitulo={`Agendamento: ${coleta.agendamento}`}>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    {coleta.emExecucao ? (
                        <span className="flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1.5 font-bold text-yellow-800">
                            <Loader2 size={15} className="animate-spin" /> Coleta em andamento desde {formatarDataCompleta(coleta.inicio)}
                        </span>
                    ) : (
                        <span className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 font-bold text-green-800">
                            <CheckCircle2 size={15} /> Aguardando a próxima coleta
                        </span>
                    )}
                    {ultimaExecucao && (
                        <span className="text-zinc-600">
                            Última execução pelo sistema: {formatarDataCompleta(ultimaExecucao.fim)}
                            {ultimaExecucao.erro ? ` (falhou: ${ultimaExecucao.erro})` : ''}
                            {ultimaExecucao.falhas?.length ? ` · ${ultimaExecucao.falhas.length} mercado(s) com falha` : ''}
                        </span>
                    )}
                </div>
            </Secao>

            <Secao icone={Store} titulo="Por supermercado" subtitulo="Preços das unidades de Poços de Caldas">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                        <thead>
                            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
                                <th className="py-2 pr-4 font-bold">Supermercado</th>
                                <th className="px-3 py-2 text-right font-bold">Produtos</th>
                                <th className="px-3 py-2 text-right font-bold">Alimentos</th>
                                <th className="px-3 py-2 text-right font-bold">Ofertas</th>
                                <th className="px-3 py-2 text-right font-bold">Saíram do site</th>
                                <th className="px-3 py-2 text-right font-bold">Cesta básica</th>
                                <th className="py-2 pl-3 text-right font-bold">Última coleta</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {porMercado.map(mercado => (
                                <tr key={mercado.slug}>
                                    <td className="py-3 pr-4">
                                        <SeloMercado slug={mercado.slug} nome={mercado.nome} />
                                        <div className="mt-1 text-xs text-zinc-500">{mercado.endereco?.replace(/,\s*Po[cç]os de Caldas$/i, '')}</div>
                                    </td>
                                    <td className="px-3 py-3 text-right font-extrabold tabular-nums">{numero(mercado.disponiveis)}</td>
                                    <td className="px-3 py-3 text-right tabular-nums">{numero(mercado.alimentos)}</td>
                                    <td className="px-3 py-3 text-right tabular-nums">{numero(mercado.ofertas)}</td>
                                    <td className="px-3 py-3 text-right tabular-nums text-zinc-500">{numero(mercado.indisponiveis)}</td>
                                    <td className="px-3 py-3 text-right tabular-nums">
                                        {mercado.cestaBasica ? formatarMoeda(mercado.cestaBasica.total) : '--'}
                                        {mercado.cestaBasica && !mercado.cestaBasica.completa && <div className="text-[11px] text-zinc-400">incompleta</div>}
                                    </td>
                                    <td className="py-3 pl-3 text-right">
                                        <div className="font-semibold">{formatarDataCompleta(mercado.ultimaColeta)}</div>
                                        <div className="text-[11px] text-zinc-400">{formatarTempoRelativo(mercado.ultimaColeta)} · {mercado.coletasRealizadas} coleta(s) registradas</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Secao>

            <div className="grid gap-6 lg:grid-cols-2">
                <Secao icone={ShoppingBasket} titulo="Cesta básica por supermercado" subtitulo={cestaBasica.referencia}>
                    <ul className="space-y-4">
                        {cestas.map(item => {
                            const completa = item.itensEncontrados === item.itensTotal;
                            const ehMaisBarato = cestaBasica.maisBarato?.supermercado === item.supermercado;
                            return (
                                <li key={item.supermercado}>
                                    <div className="mb-1 flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2">
                                            <SeloMercado slug={item.supermercado} nome={item.supermercadoNome} />
                                            {!completa && <span className="text-xs text-zinc-400">{item.itensEncontrados}/{item.itensTotal} itens</span>}
                                        </span>
                                        <strong className={ehMaisBarato ? 'text-green-700' : ''}>{formatarMoeda(item.total)}</strong>
                                    </div>
                                    <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                                        <div
                                            className={`h-full rounded-full ${ehMaisBarato ? 'bg-green-600' : completa ? 'bg-zinc-400' : 'bg-zinc-300'}`}
                                            style={{ width: `${(item.total / maiorCesta) * 100}%` }}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    <p className="mt-4 text-xs text-zinc-500">Mercados com cesta incompleta não vendem algum item pelo site e ficam fora da comparação.</p>
                </Secao>

                <Secao icone={Package} titulo="Produtos por departamento" subtitulo="Quantidade de produtos coletados em cada seção">
                    <ul className="space-y-2.5">
                        {categorias.map(categoria => {
                            const { icone: Icone, cor } = estiloDepartamento(categoria.nome);
                            return (
                                <li key={categoria.nome}>
                                    <Link to={`/produtos?departamento=${encodeURIComponent(categoria.nome)}`} className="group flex items-center gap-3">
                                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cor}`}><Icone size={14} /></span>
                                        <span className="w-40 shrink-0 truncate text-sm text-zinc-700 group-hover:text-green-700">{categoria.nome}</span>
                                        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                                            <span className="block h-full rounded-full bg-green-500" style={{ width: `${(categoria.total / maiorCategoria) * 100}%` }} />
                                        </span>
                                        <span className="w-14 shrink-0 text-right text-sm font-bold tabular-nums">{numero(categoria.total)}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </Secao>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Secao icone={TrendingDown} titulo="Maiores quedas de preço" subtitulo="Comparando a última coleta com o preço anterior">
                    <ListaVariacoes itens={variacoes.quedas} tipo="queda" />
                </Secao>
                <Secao icone={TrendingUp} titulo="Maiores altas de preço" subtitulo="Comparando a última coleta com o preço anterior">
                    <ListaVariacoes itens={variacoes.altas} tipo="alta" />
                </Secao>
            </div>

            <Secao icone={Info} titulo="Como os dados são coletados">
                <ul className="grid gap-4 text-sm text-zinc-600 sm:grid-cols-2">
                    <li><strong className="text-zinc-800">Coleta automática:</strong> um robô com Selenium WebDriver abre o site de cada supermercado e lê os produtos exibidos nas páginas, {coleta.agendamento}.</li>
                    <li><strong className="text-zinc-800">Unidade de Poços de Caldas:</strong> antes de coletar, o sistema confere se o site está mostrando a loja de Poços de Caldas, para não misturar preços de outras unidades.</li>
                    <li><strong className="text-zinc-800">Comparação justa:</strong> o mesmo produto é identificado pela marca, versão (zero, integral, sabor...) e tamanho da embalagem; o preço por kg ou litro é calculado a partir do nome.</li>
                    <li><strong className="text-zinc-800">Uso responsável:</strong> são lidas apenas páginas públicas permitidas pelos sites (robots.txt). Confira sempre o preço no site do mercado antes de comprar.</li>
                </ul>
                <p className="mt-4 text-xs text-zinc-400">Painel gerado em {formatarDataCompleta(dados.geradoEm)}.</p>
            </Secao>
        </div>
    );
};

export default Painel;
