import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgePercent, ChevronRight, ListChecks, MapPin, Scale, Search, Store } from 'lucide-react';
import { useApp } from '../AppContext';
import { fetchProducts } from '../services/api';
import { estiloDepartamento } from '../departamentos';
import { formatarDataColeta } from '../formatar';
import ProductList from '../components/ProductList';
import CestaBasica from '../components/CestaBasica';
import SeloMercado from '../components/SeloMercado';

const TituloSecao = ({ titulo, subtitulo, link, textoLink }) => (
    <div className="mb-4 flex items-end justify-between gap-4">
        <div>
            <h2 className="text-xl font-extrabold text-zinc-900 sm:text-2xl">{titulo}</h2>
            {subtitulo && <p className="text-sm text-zinc-500">{subtitulo}</p>}
        </div>
        {link && (
            <Link to={link} className="flex shrink-0 items-center gap-0.5 text-sm font-bold text-green-700 hover:text-green-900">
                {textoLink} <ChevronRight size={16} />
            </Link>
        )}
    </div>
);

const PASSOS = [
    { icone: Search, titulo: 'Busque o produto', texto: 'Procure pelo nome, marca ou tamanho, ou navegue pelos departamentos.' },
    { icone: Scale, titulo: 'Compare os preços', texto: 'Veja o mesmo produto nos supermercados de Poços de Caldas, com o preço por kg ou litro.' },
    { icone: ListChecks, titulo: 'Monte sua lista', texto: 'Descubra em qual mercado sua compra sai mais barata e quanto você economiza.' }
];

const Inicio = () => {
    const { supermercados, departamentos, totalProdutos, ultimaColeta } = useApp();
    const [ofertas, setOfertas] = useState({ carregando: true, itens: [] });

    useEffect(() => {
        let cancelado = false;
        fetchProducts({ ofertas: true, alimentos: true, ordenar: 'menor-preco', limit: 10 })
            .then(resposta => { if (!cancelado) setOfertas({ carregando: false, itens: resposta.data }); })
            .catch(() => { if (!cancelado) setOfertas({ carregando: false, itens: [] }); });
        return () => { cancelado = true; };
    }, []);

    return (
        <div>
            <section className="bg-gradient-to-br from-green-700 via-green-700 to-green-800 text-white">
                <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[1.3fr_1fr] lg:items-center">
                    <div>
                        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-3 py-1 text-xs font-extrabold uppercase text-green-950">
                            <MapPin size={13} /> Poços de Caldas
                        </span>
                        <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
                            Compare preços e economize nas compras do mês
                        </h1>
                        <p className="mt-4 max-w-xl text-base text-green-50 sm:text-lg">
                            Os preços de {supermercados.length || 4} supermercados da cidade em um só lugar, atualizados automaticamente todos os dias.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link to="/produtos" className="rounded-full bg-yellow-400 px-6 py-3 text-sm font-extrabold text-green-950 shadow transition hover:bg-yellow-300">
                                Ver todos os produtos
                            </Link>
                            <Link to="/lista" className="rounded-full border-2 border-white/70 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                                Minha lista de compras
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                            <div className="text-3xl font-extrabold">{totalProdutos.toLocaleString('pt-BR')}</div>
                            <div className="text-sm text-green-100">preços monitorados</div>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                            <div className="text-3xl font-extrabold">{supermercados.length}</div>
                            <div className="text-sm text-green-100">supermercados</div>
                        </div>
                        <div className="col-span-2 rounded-2xl bg-white/10 p-5 backdrop-blur">
                            <div className="text-sm text-green-100">Última atualização dos preços</div>
                            <div className="text-xl font-extrabold">{ultimaColeta ? formatarDataColeta(ultimaColeta) : '--'}</div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="mx-auto max-w-7xl space-y-12 px-4 py-10">
                <section>
                    <TituloSecao titulo="Departamentos" subtitulo="Navegue pelos produtos de cada seção" link="/produtos" textoLink="Ver tudo" />
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                        {departamentos.map(departamento => {
                            const { icone: Icone, cor } = estiloDepartamento(departamento.nome);
                            return (
                                <Link
                                    key={departamento.nome}
                                    to={`/produtos?departamento=${encodeURIComponent(departamento.nome)}`}
                                    className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-center transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md"
                                >
                                    <span className={`flex h-12 w-12 items-center justify-center rounded-full ${cor}`}>
                                        <Icone size={24} />
                                    </span>
                                    <span className="text-xs font-bold leading-tight text-zinc-800 sm:text-sm">{departamento.nome}</span>
                                    <span className="text-[11px] text-zinc-400">{departamento.total.toLocaleString('pt-BR')} itens</span>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {(ofertas.carregando || ofertas.itens.length > 0) && (
                    <section>
                        <TituloSecao
                            titulo={<span className="flex items-center gap-2"><BadgePercent className="text-red-600" /> Ofertas nos supermercados</span>}
                            subtitulo="Produtos com preço promocional nos sites dos mercados"
                            link="/produtos?ofertas=1"
                            textoLink="Ver todas as ofertas"
                        />
                        <ProductList products={ofertas.itens} carregando={ofertas.carregando} quantidadeEsqueleto={5} />
                    </section>
                )}

                <CestaBasica />

                <section>
                    <TituloSecao titulo="Supermercados participantes" subtitulo="Preços das unidades de Poços de Caldas" />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {supermercados.map(mercado => (
                            <Link
                                key={mercado.slug}
                                to={`/produtos?mercado=${mercado.slug}`}
                                className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-green-300 hover:shadow-md"
                            >
                                <div className="mb-3 flex items-center gap-2">
                                    <Store size={20} className="text-zinc-400" />
                                    <SeloMercado slug={mercado.slug} nome={mercado.nome} tamanho="grande" />
                                </div>
                                {mercado.endereco && (
                                    <p className="text-sm text-zinc-600">{mercado.endereco.replace(/,\s*Po[cç]os de Caldas$/i, '')}</p>
                                )}
                                <p className="mt-3 text-2xl font-extrabold text-zinc-900">{mercado.totalProdutos.toLocaleString('pt-BR')}</p>
                                <p className="text-xs text-zinc-500">produtos · coletado em {formatarDataColeta(mercado.ultimaColeta)}</p>
                                <span className="mt-4 text-sm font-bold text-green-700">Ver produtos →</span>
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="rounded-3xl bg-yellow-50 p-6 sm:p-10">
                    <h2 className="mb-6 text-center text-xl font-extrabold text-zinc-900 sm:text-2xl">Como funciona</h2>
                    <div className="grid gap-6 sm:grid-cols-3">
                        {PASSOS.map((passo, indice) => {
                            const Icone = passo.icone;
                            return (
                                <div key={passo.titulo} className="text-center">
                                    <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white">
                                        <Icone size={26} />
                                    </span>
                                    <h3 className="font-extrabold text-zinc-900">{indice + 1}. {passo.titulo}</h3>
                                    <p className="mt-1 text-sm text-zinc-600">{passo.texto}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Inicio;
