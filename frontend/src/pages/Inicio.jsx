import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LayoutGrid, MapPin } from 'lucide-react';
import { useApp } from '../AppContext';
import { useDispositivo } from '../useDispositivo';
import { fetchCestaBasica, fetchProducts } from '../services/api';
import { estiloDepartamento } from '../departamentos';
import { formatarDataColeta } from '../formatar';
import { corBarraDoSupermercado } from '../supermercados';
import ProductList from '../components/ProductList';
import CestaBasica from '../components/CestaBasica';
import FachadaMercado from '../components/FachadaMercado';
import Preco from '../components/Preco';

// Quantas ofertas cabem na vitrine de cada dispositivo (linhas completas na grade).
const OFERTAS_POR_DISPOSITIVO = { mobile: 10, tablet: 6, desktop: 8 };

const Cabecalho = ({ sobretitulo, titulo, link, textoLink, compacto }) => (
    <div className={`flex items-end justify-between gap-4 ${compacto ? 'mb-4' : 'mb-6'}`}>
        <div>
            {sobretitulo && <p className="mb-0.5 font-preco text-sm font-bold uppercase tracking-[0.2em] text-oferta-500">{sobretitulo}</p>}
            <h2 className={`font-extrabold text-feira-900 ${compacto ? 'text-[1.4rem] leading-tight' : 'text-2xl sm:text-[2rem]'}`}>{titulo}</h2>
        </div>
        {link && (
            <Link to={link} className="group flex shrink-0 items-center gap-1 text-sm font-bold text-feira-600 hover:text-feira-800">
                {textoLink} <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </Link>
        )}
    </div>
);

function ordenarCesta(cesta) {
    const completa = item => item.itensEncontrados === item.itensTotal;
    return [...cesta.porMercado].sort((a, b) => completa(b) - completa(a) || a.total - b.total);
}

// Etiqueta de preco da cesta basica de um mercado.
const EtiquetaCesta = ({ mercado, maisBarata, rotacao = '', className = '' }) => (
    <div className={`relative ${rotacao} ${className}`}>
        <div className={`etiqueta flex items-center justify-between gap-3 py-2.5 pr-4 ${maisBarata ? '' : '!bg-papel-50'}`}>
            <span className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: corBarraDoSupermercado(mercado.supermercado) }} />
                <span className="truncate font-display text-base font-bold">{mercado.supermercadoNome}</span>
            </span>
            <span className="text-right">
                <Preco valor={mercado.total} tamanho="m" />
                {mercado.itensEncontrados !== mercado.itensTotal && <span className="block text-[10px] font-semibold text-tinta-500">faltam itens no site</span>}
            </span>
        </div>
        {maisBarata && (
            <span className="absolute -right-2 -top-3 rotate-6 rounded-md border-2 border-oferta-500 bg-papel-50 px-2 py-0.5 font-preco text-xs font-extrabold uppercase tracking-wider text-oferta-500 shadow">
                Mais barata
            </span>
        )}
    </div>
);

// Destaque da cesta basica: pilha de etiquetas (computador), grade 2x2 (tablet) ou carrossel (celular).
const DestaqueCesta = ({ dispositivo }) => {
    const [cesta, setCesta] = useState(null);

    useEffect(() => {
        let cancelado = false;
        fetchCestaBasica()
            .then(dados => { if (!cancelado) setCesta(dados); })
            .catch(() => {});
        return () => { cancelado = true; };
    }, []);

    if (!cesta) {
        return <div className="h-48 animate-pulse rounded-3xl bg-feira-800/20 lg:h-[340px]" />;
    }

    const mercados = ordenarCesta(cesta);
    const ehMaisBarata = mercado => cesta.maisBarato?.supermercado === mercado.supermercado;
    const titulo = (
        <div className="mb-4 flex items-baseline justify-between gap-2">
            <p className="font-display text-lg font-extrabold">Cesta básica hoje</p>
            <p className="text-xs text-feira-200">13 itens · DIEESE</p>
        </div>
    );

    if (dispositivo === 'mobile') {
        return (
            <div className="-mx-4 bg-feira-800 px-4 pb-5 pt-4 text-papel-50" style={{ '--furo': '#0c3d24' }}>
                {titulo}
                <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 pt-3 scrollbar-hide">
                    {mercados.map(mercado => (
                        <EtiquetaCesta key={mercado.supermercado} mercado={mercado} maisBarata={ehMaisBarata(mercado)} className="w-[78vw] max-w-[300px] shrink-0 snap-start" />
                    ))}
                </div>
                <Link to="/painel" className="mt-3 flex items-center gap-1 text-xs font-bold text-etiqueta-300">
                    Deslize para ver todos · Como calculamos <ArrowRight size={13} />
                </Link>
            </div>
        );
    }

    if (dispositivo === 'tablet') {
        return (
            <div className="rounded-[1.75rem] bg-feira-800 p-6 text-papel-50 shadow-cartao" style={{ '--furo': '#0c3d24' }}>
                {titulo}
                <div className="grid grid-cols-2 gap-x-4 gap-y-5 pt-2">
                    {mercados.map(mercado => (
                        <EtiquetaCesta key={mercado.supermercado} mercado={mercado} maisBarata={ehMaisBarata(mercado)} />
                    ))}
                </div>
                <Link to="/painel" className="mt-5 flex items-center gap-1 text-xs font-bold text-etiqueta-300">Como calculamos <ArrowRight size={13} /></Link>
            </div>
        );
    }

    const rotacoes = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];
    return (
        <div className="relative">
            <div className="absolute -inset-4 rotate-2 rounded-[2rem] bg-feira-700/90" aria-hidden="true" />
            <div className="relative rounded-[1.75rem] bg-feira-800 p-6 text-papel-50 shadow-2xl" style={{ '--furo': '#0c3d24' }}>
                {titulo}
                <ul className="space-y-3">
                    {mercados.map((mercado, indice) => (
                        <li key={mercado.supermercado}>
                            <EtiquetaCesta mercado={mercado} maisBarata={ehMaisBarata(mercado)} rotacao={`${rotacoes[indice % rotacoes.length]} transition hover:rotate-0`} />
                        </li>
                    ))}
                </ul>
                <Link to="/painel" className="mt-5 flex items-center gap-1 text-xs font-bold text-etiqueta-300 hover:text-etiqueta-200">Como calculamos <ArrowRight size={13} /></Link>
            </div>
        </div>
    );
};

const PASSOS = [
    { titulo: 'Procure', texto: 'Busque pelo nome, marca ou tamanho, ou passeie pelos corredores.' },
    { titulo: 'Compare', texto: 'Veja o mesmo produto em cada mercado, com o preço por kg ou litro.' },
    { titulo: 'Economize', texto: 'Monte sua lista e descubra onde a compra inteira sai mais barata.' }
];

const Numeros = ({ totalProdutos, supermercados, ultimaColeta, compacto }) => (
    <dl className={`flex flex-wrap border-t border-dashed border-tinta-400/40 ${compacto ? 'mt-6 gap-x-6 gap-y-2 pt-4' : 'mt-10 gap-x-8 gap-y-4 pt-6'}`}>
        {[
            ['Preços', totalProdutos.toLocaleString('pt-BR')],
            ['Mercados', supermercados.length],
            ['Atualizado', ultimaColeta ? formatarDataColeta(ultimaColeta) : '--']
        ].map(([rotulo, valor]) => (
            <div key={rotulo}>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-tinta-500">{rotulo}</dt>
                <dd className={`font-preco font-bold text-feira-800 ${compacto ? 'text-2xl' : 'text-3xl'}`}>{valor}</dd>
            </div>
        ))}
    </dl>
);

const Inicio = () => {
    const { supermercados, departamentos, totalProdutos, ultimaColeta } = useApp();
    const dispositivo = useDispositivo();
    const mobile = dispositivo === 'mobile';
    const tablet = dispositivo === 'tablet';
    const [ofertas, setOfertas] = useState({ carregando: true, itens: [] });

    useEffect(() => {
        let cancelado = false;
        fetchProducts({ ofertas: true, alimentos: true, ordenar: 'menor-preco', limit: 10 })
            .then(resposta => { if (!cancelado) setOfertas({ carregando: false, itens: resposta.data }); })
            .catch(() => { if (!cancelado) setOfertas({ carregando: false, itens: [] }); });
        return () => { cancelado = true; };
    }, []);

    const ofertasVisiveis = ofertas.itens.slice(0, OFERTAS_POR_DISPOSITIVO[dispositivo]);

    return (
        <div>
            <section className="fundo-encarte overflow-hidden border-b border-papel-300">
                {/* minmax(0,1fr) impede que o carrossel da cesta estique a coluna alem da tela. */}
                <div className={`mx-auto grid max-w-7xl items-center px-4 ${mobile ? 'grid-cols-[minmax(0,1fr)] gap-6 pt-7' : tablet ? 'grid-cols-[minmax(0,1fr)] gap-8 px-6 py-10' : 'grid-cols-[1.15fr_1fr] gap-12 py-16'}`}>
                    <div>
                        {!mobile && (
                            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-feira-200 bg-papel-50 px-3 py-1 text-xs font-bold text-feira-700">
                                <MapPin size={13} /> Supermercados de Poços de Caldas
                            </p>
                        )}
                        <h1 className={`font-extrabold text-feira-900 ${mobile ? 'text-[2.6rem] leading-[0.98]' : tablet ? 'text-6xl leading-[0.98]' : 'text-7xl leading-[0.98]'}`}>
                            Quem compara,<br /><span className="marcador">economiza.</span>
                        </h1>
                        <p className={`max-w-lg text-tinta-700 ${mobile ? 'mt-4 text-[15px] leading-6' : 'mt-6 text-lg leading-relaxed'}`}>
                            {mobile
                                ? `Os preços de ${supermercados.length || 4} supermercados de Poços de Caldas num só lugar.`
                                : `O SuperPreço junta os preços de ${supermercados.length || 4} supermercados da cidade num só lugar e mostra onde cada produto — e a sua compra inteira — sai mais barato.`}
                        </p>
                        {!mobile && (
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link to="/produtos" className="rounded-xl bg-feira-700 px-6 py-3.5 font-display text-[15px] font-bold text-papel-50 shadow-cartao transition hover:bg-feira-800">Ver os produtos</Link>
                                <Link to="/lista" className="rounded-xl border-2 border-feira-700 px-6 py-3 font-display text-[15px] font-bold text-feira-700 transition hover:bg-feira-50">Montar minha lista</Link>
                            </div>
                        )}
                        <Numeros totalProdutos={totalProdutos} supermercados={supermercados} ultimaColeta={ultimaColeta} compacto={mobile} />
                    </div>

                    <DestaqueCesta dispositivo={dispositivo} />
                </div>
            </section>

            <div className={`mx-auto max-w-7xl ${mobile ? 'space-y-10 px-4 py-8' : tablet ? 'space-y-12 px-6 py-10' : 'space-y-16 px-4 py-14'}`}>
                <section>
                    <Cabecalho sobretitulo="Corredores" titulo={mobile ? 'Departamentos' : 'Passeie pelos departamentos'} link={mobile ? '/corredores' : '/produtos'} textoLink="Ver tudo" compacto={mobile} />
                    {mobile ? (
                        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 scrollbar-hide">
                            {departamentos.map(departamento => {
                                const { icone: Icone, cor } = estiloDepartamento(departamento.nome);
                                return (
                                    <Link key={departamento.nome} to={`/produtos?departamento=${encodeURIComponent(departamento.nome)}`} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center active:scale-95">
                                        <span className={`flex h-16 w-16 items-center justify-center rounded-full border-2 border-white shadow-sm ${cor}`}><Icone size={26} /></span>
                                        <span className="text-[11px] font-bold leading-tight text-feira-900">{departamento.nome}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : tablet ? (
                        <div className="grid grid-cols-2 gap-3">
                            {departamentos.map((departamento, indice) => {
                                const { icone: Icone, cor, tom } = estiloDepartamento(departamento.nome);
                                return (
                                    <Link
                                        key={departamento.nome}
                                        to={`/produtos?departamento=${encodeURIComponent(departamento.nome)}`}
                                        className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-papel-300 bg-papel-50 py-3 pl-5 pr-4 transition hover:shadow-cartao"
                                    >
                                        <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: tom }} aria-hidden="true" />
                                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cor}`}><Icone size={22} /></span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-preco text-[11px] font-bold uppercase tracking-[0.15em] text-tinta-400">Corredor {String(indice + 1).padStart(2, '0')}</span>
                                            <span className="block truncate font-display text-[15px] font-bold text-feira-900">{departamento.nome}</span>
                                        </span>
                                        <span className="font-preco text-base font-bold text-tinta-500">{departamento.total.toLocaleString('pt-BR')}</span>
                                    </Link>
                                );
                            })}
                            <Link to="/produtos" className="flex items-center justify-center gap-2 rounded-2xl bg-feira-700 px-4 py-3 font-display text-[15px] font-bold text-papel-50 hover:bg-feira-800">
                                Todos os produtos <ArrowRight size={16} />
                            </Link>
                        </div>
                    ) : (
                        // Prateleira: icones redondos apoiados numa gondola, com a faixa amarela de preco
                        // mostrando quantos produtos ha em cada corredor. 14 itens: 1 prateleira (xl) ou 2 de 7.
                        <div className="grid grid-cols-7 gap-y-10 xl:grid-cols-[repeat(14,minmax(0,1fr))]">
                            {[
                                ...departamentos.map(departamento => ({
                                    chave: departamento.nome,
                                    para: `/produtos?departamento=${encodeURIComponent(departamento.nome)}`,
                                    nome: departamento.nome,
                                    total: departamento.total,
                                    ...estiloDepartamento(departamento.nome)
                                })),
                                { chave: 'todos', para: '/produtos', nome: 'Todos os produtos', total: totalProdutos, icone: LayoutGrid, cor: 'bg-feira-700 text-etiqueta-400', tom: '#0f4d2c' }
                            ].map(item => {
                                const Icone = item.icone;
                                return (
                                    <Link key={item.chave} to={item.para} className="group flex flex-col items-center text-center">
                                        <span
                                            className={`flex h-[76px] w-[76px] items-center justify-center rounded-full xl:h-[64px] xl:w-[64px] border-4 border-papel-50 shadow-[0_8px_16px_-8px_rgba(29,27,22,.45)] transition duration-200 group-hover:-translate-y-2 group-hover:shadow-[0_14px_22px_-10px_rgba(29,27,22,.5)] ${item.cor}`}
                                        >
                                            <Icone className="h-8 w-8 xl:h-7 xl:w-7" strokeWidth={1.9} />
                                        </span>
                                        <span className="mt-2.5 flex min-h-[2.4rem] items-start justify-center px-1 font-display text-[13px] font-bold leading-[1.15rem] text-feira-900 group-hover:text-feira-600">
                                            {item.nome}
                                        </span>
                                        <span className="mt-1.5 flex h-7 w-full items-center justify-center border-r border-feira-900/15 bg-etiqueta-400 font-preco text-[15px] font-bold leading-none text-feira-900">
                                            {item.total.toLocaleString('pt-BR')}
                                            <span className="ml-1 text-[11px] font-semibold text-feira-800/70">itens</span>
                                        </span>
                                        <span className="h-2.5 w-full bg-feira-800 shadow-[0_6px_10px_-4px_rgba(8,42,25,.45)]" aria-hidden="true" />
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>

                {(ofertas.carregando || ofertas.itens.length > 0) && (
                    mobile ? (
                        <section>
                            <div className="faixa-listrada -mx-4 mb-4 flex items-center justify-between px-4 py-2.5">
                                <h2 className="font-preco text-2xl font-extrabold uppercase tracking-wide text-white">Ofertas</h2>
                                <Link to="/produtos?ofertas=1" className="rounded-lg bg-white px-3 py-1 text-xs font-extrabold uppercase text-oferta-600">Ver todas</Link>
                            </div>
                            <ProductList products={ofertasVisiveis} carregando={ofertas.carregando} quantidadeEsqueleto={3} modo="carrossel" />
                        </section>
                    ) : (
                        <section className="overflow-hidden rounded-[2rem] border-2 border-oferta-500/20 bg-papel-50">
                            <div className="faixa-listrada flex items-center justify-between gap-4 px-6 py-3 sm:px-7">
                                <h2 className="font-preco text-3xl font-extrabold uppercase tracking-wide text-white">Ofertas nos sites</h2>
                                <Link to="/produtos?ofertas=1" className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-extrabold uppercase text-oferta-600 hover:bg-oferta-100">Ver todas</Link>
                            </div>
                            <div className="p-5 sm:p-6">
                                <p className="mb-5 text-sm text-tinta-500">Produtos com preço “de/por” nos sites dos supermercados, do mais barato ao mais caro.</p>
                                <ProductList products={ofertasVisiveis} carregando={ofertas.carregando} quantidadeEsqueleto={tablet ? 3 : 4} />
                            </div>
                        </section>
                    )
                )}

                <CestaBasica />

                <section>
                    <Cabecalho sobretitulo="Quem participa" titulo="Os supermercados" compacto={mobile} />
                    <div className={mobile ? '-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide' : `grid gap-4 ${tablet ? 'grid-cols-2' : 'grid-cols-4'}`}>
                        {supermercados.map(mercado => (
                            <FachadaMercado key={mercado.slug} mercado={mercado} className={mobile ? 'w-[70vw] max-w-[280px] shrink-0 snap-start' : ''} />
                        ))}
                    </div>
                </section>

                <section className={`fundo-feira relative overflow-hidden text-papel-50 ${mobile ? '-mx-4 px-5 py-8' : 'rounded-[2rem] px-8 py-10 lg:px-10'}`}>
                    <h2 className={`font-extrabold ${mobile ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>Como funciona</h2>
                    <div className={`grid ${mobile ? 'mt-5 gap-5' : 'mt-8 grid-cols-3 gap-8'}`}>
                        {PASSOS.map((passo, indice) => (
                            <div key={passo.titulo} className={mobile ? 'flex items-start gap-4' : ''}>
                                <span className={`font-preco font-extrabold leading-none text-etiqueta-400 ${mobile ? 'text-5xl' : 'text-6xl'}`}>0{indice + 1}</span>
                                <div>
                                    <h3 className={`font-extrabold ${mobile ? 'text-lg' : 'mt-2 text-xl'}`}>{passo.titulo}</h3>
                                    <p className="mt-1 text-sm leading-6 text-feira-100">{passo.texto}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Inicio;
