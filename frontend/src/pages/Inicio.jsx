import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { useApp } from '../AppContext';
import { fetchCestaBasica, fetchProducts } from '../services/api';
import { estiloDepartamento } from '../departamentos';
import { formatarDataColeta } from '../formatar';
import { corBarraDoSupermercado } from '../supermercados';
import ProductList from '../components/ProductList';
import CestaBasica from '../components/CestaBasica';
import Preco from '../components/Preco';

const Cabecalho = ({ sobretitulo, titulo, link, textoLink }) => (
    <div className="mb-6 flex items-end justify-between gap-4">
        <div>
            {sobretitulo && <p className="mb-1 font-preco text-sm font-bold uppercase tracking-[0.2em] text-oferta-500">{sobretitulo}</p>}
            <h2 className="text-2xl font-extrabold text-feira-900 sm:text-[2rem]">{titulo}</h2>
        </div>
        {link && (
            <Link to={link} className="group flex shrink-0 items-center gap-1 text-sm font-bold text-feira-600 hover:text-feira-800">
                {textoLink} <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </Link>
        )}
    </div>
);

// Etiquetas com o custo da cesta basica de cada mercado, usadas no destaque da pagina inicial.
const EtiquetasCesta = () => {
    const [cesta, setCesta] = useState(null);

    useEffect(() => {
        let cancelado = false;
        fetchCestaBasica()
            .then(dados => { if (!cancelado) setCesta(dados); })
            .catch(() => {});
        return () => { cancelado = true; };
    }, []);

    if (!cesta) {
        return <div className="h-[340px] animate-pulse rounded-3xl bg-white/40" />;
    }

    const completa = item => item.itensEncontrados === item.itensTotal;
    const mercados = [...cesta.porMercado].sort((a, b) => completa(b) - completa(a) || a.total - b.total);
    const rotacoes = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];

    return (
        <div className="relative">
            <div className="absolute -inset-4 rotate-2 rounded-[2rem] bg-feira-700/90" aria-hidden="true" />
            <div className="relative rounded-[1.75rem] bg-feira-800 p-5 text-papel-50 shadow-2xl sm:p-6" style={{ '--furo': '#0c3d24' }}>
                <div className="mb-4 flex items-baseline justify-between gap-2">
                    <p className="font-display text-lg font-extrabold">Cesta básica hoje</p>
                    <p className="text-xs text-feira-200">13 itens · DIEESE</p>
                </div>
                <ul className="space-y-3">
                    {mercados.map((mercado, indice) => {
                        const maisBarata = cesta.maisBarato?.supermercado === mercado.supermercado;
                        return (
                            <li key={mercado.supermercado} className={`relative ${rotacoes[indice % rotacoes.length]} transition hover:rotate-0`}>
                                <div className={`etiqueta flex items-center justify-between gap-3 py-2.5 pr-4 ${maisBarata ? '' : '!bg-papel-50'}`}>
                                    <span className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-sm" style={{ background: corBarraDoSupermercado(mercado.supermercado) }} />
                                        <span className="font-display text-base font-bold">{mercado.supermercadoNome}</span>
                                    </span>
                                    <span className="text-right">
                                        <Preco valor={mercado.total} tamanho="m" />
                                        {!completa(mercado) && <span className="block text-[10px] font-semibold text-tinta-500">faltam itens no site</span>}
                                    </span>
                                </div>
                                {maisBarata && (
                                    <span className="absolute -right-2 -top-3 rotate-6 rounded-md border-2 border-oferta-500 bg-papel-50 px-2 py-0.5 font-preco text-xs font-extrabold uppercase tracking-wider text-oferta-500 shadow">
                                        Mais barata
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
                <Link to="/painel" className="mt-5 flex items-center gap-1 text-xs font-bold text-etiqueta-300 hover:text-etiqueta-200">
                    Como calculamos <ArrowRight size={13} />
                </Link>
            </div>
        </div>
    );
};

const PASSOS = [
    { titulo: 'Procure', texto: 'Busque pelo nome, marca ou tamanho, ou passeie pelos corredores.' },
    { titulo: 'Compare', texto: 'Veja o mesmo produto em cada mercado, com o preço por kg ou litro.' },
    { titulo: 'Economize', texto: 'Monte sua lista e descubra onde a compra inteira sai mais barata.' }
];

const Inicio = () => {
    const { supermercados, departamentos, totalProdutos, ultimaColeta } = useApp();
    const [ofertas, setOfertas] = useState({ carregando: true, itens: [] });

    useEffect(() => {
        let cancelado = false;
        fetchProducts({ ofertas: true, alimentos: true, ordenar: 'menor-preco', limit: 8 })
            .then(resposta => { if (!cancelado) setOfertas({ carregando: false, itens: resposta.data }); })
            .catch(() => { if (!cancelado) setOfertas({ carregando: false, itens: [] }); });
        return () => { cancelado = true; };
    }, []);

    return (
        <div>
            <section className="fundo-encarte overflow-hidden border-b border-papel-300">
                <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr]">
                    <div>
                        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-feira-200 bg-papel-50 px-3 py-1 text-xs font-bold text-feira-700">
                            <MapPin size={13} /> Supermercados de Poços de Caldas
                        </p>
                        <h1 className="text-[2.75rem] font-extrabold leading-[0.98] text-feira-900 sm:text-7xl">
                            Quem compara,<br /><span className="marcador">economiza.</span>
                        </h1>
                        <p className="mt-6 max-w-lg text-lg leading-relaxed text-tinta-700">
                            O SuperPreço junta os preços de {supermercados.length || 4} supermercados da cidade num só lugar e mostra onde cada produto — e a sua compra inteira — sai mais barato.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link to="/produtos" className="rounded-xl bg-feira-700 px-6 py-3.5 font-display text-[15px] font-bold text-papel-50 shadow-cartao transition hover:bg-feira-800">
                                Ver os produtos
                            </Link>
                            <Link to="/lista" className="rounded-xl border-2 border-feira-700 px-6 py-3 font-display text-[15px] font-bold text-feira-700 transition hover:bg-feira-50">
                                Montar minha lista
                            </Link>
                        </div>
                        <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-dashed border-tinta-400/40 pt-6">
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wider text-tinta-500">Preços</dt>
                                <dd className="font-preco text-3xl font-bold text-feira-800">{totalProdutos.toLocaleString('pt-BR')}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wider text-tinta-500">Mercados</dt>
                                <dd className="font-preco text-3xl font-bold text-feira-800">{supermercados.length}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wider text-tinta-500">Atualizado</dt>
                                <dd className="font-preco text-3xl font-bold text-feira-800">{ultimaColeta ? formatarDataColeta(ultimaColeta) : '--'}</dd>
                            </div>
                        </dl>
                    </div>

                    <EtiquetasCesta />
                </div>
            </section>

            <div className="mx-auto max-w-7xl space-y-16 px-4 py-14">
                <section>
                    <Cabecalho sobretitulo="Corredores" titulo="Passeie pelos departamentos" link="/produtos" textoLink="Ver tudo" />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
                        {departamentos.map((departamento, indice) => {
                            const { icone: Icone, cor, tom } = estiloDepartamento(departamento.nome);
                            return (
                                <Link
                                    key={departamento.nome}
                                    to={`/produtos?departamento=${encodeURIComponent(departamento.nome)}`}
                                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-papel-300 bg-papel-50 p-4 transition hover:-translate-y-1 hover:shadow-cartao"
                                >
                                    <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: tom }} aria-hidden="true" />
                                    <span className="font-preco text-xs font-bold uppercase tracking-[0.15em] text-tinta-400">
                                        Corredor {String(indice + 1).padStart(2, '0')}
                                    </span>
                                    <span className={`mt-3 flex h-12 w-12 items-center justify-center rounded-xl ${cor} transition group-hover:scale-110`}>
                                        <Icone size={24} />
                                    </span>
                                    <span className="mt-3 font-display text-[15px] font-bold leading-tight text-feira-900">{departamento.nome}</span>
                                    <span className="mt-1 text-xs text-tinta-500">{departamento.total.toLocaleString('pt-BR')} produtos</span>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {(ofertas.carregando || ofertas.itens.length > 0) && (
                    <section className="overflow-hidden rounded-[2rem] border-2 border-oferta-500/20 bg-papel-50">
                        <div className="faixa-listrada flex items-center justify-between gap-4 px-5 py-3 sm:px-7">
                            <h2 className="font-preco text-2xl font-extrabold uppercase tracking-wide text-white sm:text-3xl">Ofertas nos sites</h2>
                            <Link to="/produtos?ofertas=1" className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-extrabold uppercase text-oferta-600 hover:bg-oferta-100">
                                Ver todas
                            </Link>
                        </div>
                        <div className="p-4 sm:p-6">
                            <p className="mb-5 text-sm text-tinta-500">Produtos com preço “de/por” nos sites dos supermercados, do mais barato ao mais caro.</p>
                            <ProductList products={ofertas.itens} carregando={ofertas.carregando} quantidadeEsqueleto={4} />
                        </div>
                    </section>
                )}

                <CestaBasica />

                <section>
                    <Cabecalho sobretitulo="Quem participa" titulo="Os supermercados" />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {supermercados.map(mercado => (
                            <Link
                                key={mercado.slug}
                                to={`/produtos?mercado=${mercado.slug}`}
                                className="group relative overflow-hidden rounded-2xl border border-papel-300 bg-papel-50 p-5 transition hover:-translate-y-1 hover:shadow-cartao"
                            >
                                <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: corBarraDoSupermercado(mercado.slug) }} aria-hidden="true" />
                                <h3 className="font-display text-xl font-extrabold text-feira-900">{mercado.nome}</h3>
                                {mercado.endereco && (
                                    <p className="mt-1 flex items-start gap-1 text-sm text-tinta-500">
                                        <MapPin size={14} className="mt-0.5 shrink-0" />
                                        {mercado.endereco.replace(/,\s*Po[cç]os de Caldas$/i, '')}
                                    </p>
                                )}
                                <p className="mt-5 font-preco text-4xl font-bold text-feira-800">{mercado.totalProdutos.toLocaleString('pt-BR')}</p>
                                <p className="text-xs text-tinta-500">produtos · coletado em {formatarDataColeta(mercado.ultimaColeta)}</p>
                                <span className="mt-4 flex items-center gap-1 text-sm font-bold text-feira-600 group-hover:text-feira-800">
                                    Ver produtos <ArrowRight size={15} />
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="fundo-feira relative overflow-hidden rounded-[2rem] px-6 py-10 text-papel-50 sm:px-10">
                    <h2 className="text-3xl font-extrabold sm:text-4xl">Como funciona</h2>
                    <div className="mt-8 grid gap-8 sm:grid-cols-3">
                        {PASSOS.map((passo, indice) => (
                            <div key={passo.titulo}>
                                <span className="font-preco text-6xl font-extrabold leading-none text-etiqueta-400">0{indice + 1}</span>
                                <h3 className="mt-2 text-xl font-extrabold">{passo.titulo}</h3>
                                <p className="mt-1 text-sm leading-6 text-feira-100">{passo.texto}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Inicio;
