import React from 'react';
import { Link } from 'react-router-dom';
import { formatarMoeda } from '../formatar';
import { corBarraDoSupermercado } from '../supermercados';

// Tabela item x mercado da lista de compras.
// - modo "iguais": so o mesmo produto em cada mercado; verde = onde o item e mais barato.
// - modo "similares": a lista inteira de cada mercado, com o similar de outra marca no lugar
//   do que falta; o rodape traz o total da lista completa (iguais + similares).
const TabelaComparacao = ({ cotacao, mercados, modo = 'iguais' }) => {
    const comSimilares = modo === 'similares';
    const linhas = cotacao.itens;
    const totalCompleto = Object.fromEntries(cotacao.comSimilares.map(mercado => [mercado.supermercado, mercado]));

    const celula = (item, mercado, menor) => {
        const opcao = item.precos[mercado.supermercado];
        const visivel = opcao && (comSimilares || opcao.tipo === 'igual');
        if (!visivel) {
            return <td key={mercado.supermercado} className="px-2 py-2 text-right text-tinta-400" title="O mercado não tem este produto">—</td>;
        }
        const similar = opcao.tipo === 'similar';
        const maisBarato = !comSimilares && opcao.subtotal === menor;
        return (
            <td key={mercado.supermercado} className="px-2 py-2 text-right">
                <Link
                    to={`/produto/${opcao.id}`}
                    title={opcao.nome}
                    className={`inline-block rounded px-1.5 font-preco text-[15px] font-bold hover:underline ${maisBarato ? 'bg-feira-100 text-feira-800' : similar ? 'bg-etiqueta-100 text-tinta-900' : 'text-tinta-900'}`}
                >
                    {formatarMoeda(opcao.subtotal)}
                </Link>
                {similar && (
                    <span className="mt-0.5 block text-[10px] leading-3 text-tinta-500">
                        <span className="line-clamp-2">{opcao.nome}</span>
                        {opcao.precoPorKg && <span className="block">a {formatarMoeda(opcao.precoPorKg)}/kg</span>}
                    </span>
                )}
            </td>
        );
    };

    return (
        <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                    <tr className="border-b-2 border-papel-300 text-left">
                        <th className="py-2 pr-3 font-display text-xs font-bold uppercase tracking-wide text-tinta-500">Item</th>
                        {mercados.map(mercado => (
                            <th key={mercado.supermercado} className="px-2 py-2 text-right font-display text-xs font-bold uppercase tracking-wide text-tinta-700">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full" style={{ background: corBarraDoSupermercado(mercado.supermercado) }} />
                                    {mercado.supermercadoNome}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {linhas.map(item => {
                        const iguais = mercados
                            .map(mercado => item.precos[mercado.supermercado])
                            .filter(opcao => opcao?.tipo === 'igual')
                            .map(opcao => opcao.subtotal);
                        const menor = iguais.length ? Math.min(...iguais) : null;
                        return (
                            <tr key={item.id} className="border-b border-dashed border-papel-300 align-top">
                                <td className="py-2 pr-3 text-tinta-900">
                                    <span className="line-clamp-2">{item.nome}</span>
                                    {item.quantidade > 1 && <span className="text-[11px] text-tinta-500">{item.quantidade} unidades</span>}
                                </td>
                                {mercados.map(mercado => celula(item, mercado, menor))}
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-papel-300">
                        <td className="py-2 pr-3 text-xs font-bold uppercase text-tinta-700">
                            {comSimilares ? 'Total da lista completa' : 'Total'}
                        </td>
                        {mercados.map(mercado => {
                            const dados = comSimilares ? totalCompleto[mercado.supermercado] : mercado;
                            return (
                                <td key={mercado.supermercado} className="px-2 py-2 text-right">
                                    <strong className="font-preco text-base text-feira-900">{formatarMoeda(dados.total)}</strong>
                                    <span className="block text-[11px] text-tinta-500">
                                        {comSimilares
                                            ? `${dados.similares} similar${dados.similares === 1 ? '' : 'es'}${dados.semOpcao.length ? ` · ${dados.semOpcao.length} sem opção` : ''}`
                                            : `${dados.encontrados} de ${cotacao.itens.length} itens`}
                                    </span>
                                </td>
                            );
                        })}
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default TabelaComparacao;
