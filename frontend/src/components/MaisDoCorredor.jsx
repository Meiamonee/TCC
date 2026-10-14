import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { fetchRelacionados } from '../services/api';
import { estiloDepartamento } from '../departamentos';
import ProductCard from './ProductCard';
import Carrossel from './Carrossel';

// Vitrine com outros produtos do mesmo tipo (ex.: outras cervejas), para continuar navegando.
const MaisDoCorredor = ({ produto }) => {
    const [produtos, setProdutos] = useState([]);
    const departamento = produto.department;

    useEffect(() => {
        let cancelado = false;
        fetchRelacionados(produto.id, 12)
            .then(resposta => { if (!cancelado) setProdutos(resposta.produtos); })
            .catch(() => { if (!cancelado) setProdutos([]); });
        return () => { cancelado = true; };
    }, [produto.id]);

    if (produtos.length === 0) return null;

    const { icone: Icone, cor } = estiloDepartamento(departamento);

    return (
        <section>
            <div className="mb-4 flex items-end justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-full ${cor}`}><Icone size={22} /></span>
                    <div>
                        <p className="font-preco text-sm font-bold uppercase tracking-[0.2em] text-oferta-500">Corredor de {departamento}</p>
                        <h2 className="text-[1.4rem] font-extrabold text-feira-900 sm:text-[2rem]">Você também pode gostar</h2>
                    </div>
                </div>
                <Link to={`/produtos?departamento=${encodeURIComponent(departamento)}`} className="flex shrink-0 items-center gap-1 text-sm font-bold text-feira-600 hover:text-feira-800">
                    Ver corredor <ArrowRight size={16} />
                </Link>
            </div>
            <Carrossel rotulo={`Mais produtos de ${departamento}`}>
                {produtos.map(item => <ProductCard key={item.id} product={item} />)}
            </Carrossel>
        </section>
    );
};

export default MaisDoCorredor;
