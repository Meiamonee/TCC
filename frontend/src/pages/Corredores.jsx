import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LayoutGrid, MapPin } from 'lucide-react';
import { useApp } from '../AppContext';
import { estiloDepartamento } from '../departamentos';
import { corBarraDoSupermercado } from '../supermercados';

// Todos os departamentos e supermercados, para navegar no celular e no tablet.
const Corredores = () => {
    const { departamentos, supermercados, totalProdutos } = useApp();

    return (
        <div className="fundo-encarte min-h-[70vh]">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
                <p className="font-preco text-sm font-bold uppercase tracking-[0.2em] text-oferta-500">Corredores</p>
                <h1 className="text-3xl font-extrabold text-feira-900 sm:text-4xl">O que você procura?</h1>

                <Link
                    to="/produtos"
                    className="mt-5 flex items-center gap-3 rounded-2xl bg-feira-700 p-4 text-papel-50 shadow-cartao"
                >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-etiqueta-400 text-feira-900"><LayoutGrid size={22} /></span>
                    <span className="flex-1">
                        <span className="block font-display text-lg font-bold">Todos os produtos</span>
                        <span className="text-xs text-feira-200">{totalProdutos.toLocaleString('pt-BR')} preços</span>
                    </span>
                    <ChevronRight className="text-etiqueta-300" />
                </Link>

                <ul className="mt-4 divide-y divide-dashed divide-papel-300 overflow-hidden rounded-2xl border border-papel-300 bg-papel-50 sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0 sm:border-0 sm:bg-transparent">
                    {departamentos.map((departamento, indice) => {
                        const { icone: Icone, cor, tom } = estiloDepartamento(departamento.nome);
                        return (
                            <li key={departamento.nome}>
                                <Link
                                    to={`/produtos?departamento=${encodeURIComponent(departamento.nome)}`}
                                    className="relative flex items-center gap-3 px-4 py-3.5 active:bg-papel-200 sm:rounded-2xl sm:border sm:border-papel-300 sm:bg-papel-50 sm:py-4 sm:transition sm:hover:-translate-y-0.5 sm:hover:shadow-cartao"
                                >
                                    <span className="absolute inset-y-3 left-0 hidden w-1.5 rounded-r sm:block" style={{ background: tom }} />
                                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cor}`}><Icone size={22} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-preco text-[11px] font-bold uppercase tracking-[0.15em] text-tinta-400">Corredor {String(indice + 1).padStart(2, '0')}</span>
                                        <span className="block font-display text-[15px] font-bold leading-tight text-feira-900">{departamento.nome}</span>
                                    </span>
                                    <span className="font-preco text-base font-bold text-tinta-500">{departamento.total.toLocaleString('pt-BR')}</span>
                                    <ChevronRight size={18} className="text-tinta-400" />
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                <h2 className="mt-10 text-2xl font-extrabold text-feira-900">Por supermercado</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {supermercados.map(mercado => (
                        <Link
                            key={mercado.slug}
                            to={`/produtos?mercado=${mercado.slug}`}
                            className="relative overflow-hidden rounded-2xl border border-papel-300 bg-papel-50 p-4 active:bg-papel-200"
                        >
                            <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: corBarraDoSupermercado(mercado.slug) }} />
                            <span className="block font-display text-lg font-extrabold text-feira-900">{mercado.nome}</span>
                            <span className="mt-1 flex items-start gap-1 text-[11px] leading-4 text-tinta-500">
                                <MapPin size={12} className="mt-0.5 shrink-0" />
                                {mercado.endereco?.replace(/,\s*Po[cç]os de Caldas$/i, '')}
                            </span>
                            <span className="mt-3 block font-preco text-2xl font-bold text-feira-800">{mercado.totalProdutos.toLocaleString('pt-BR')}</span>
                            <span className="text-[11px] text-tinta-500">produtos</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Corredores;
