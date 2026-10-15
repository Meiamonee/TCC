// Gera os graficos do artigo (SVG, sem titulo interno: o titulo e a fonte ficam na legenda da
// figura, como pede a ABNT) a partir dos numeros da analise em docs/resultados/dados.json.
// Depois de gerar, converta para PNG (o Word e o Google Docs nao aceitam bem SVG).
const fs = require('fs');
const path = require('path');
const { graficoDeBarras } = require('../../../backend/analise/graficos');

const dados = require('../../resultados/dados.json');
const SAIDA = path.resolve(__dirname, '../figuras');
const NOMES = { supervale: 'SuperVale', vilasul: 'Vila Sul', sanmichel: 'San Michel', pedrilho: 'Pedrilho' };
const porcento = valor => `${String(valor).replace('.', ',')}%`;
const reais = valor => `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
const numero = valor => Number(valor).toLocaleString('pt-BR');
const comum = { semTitulo: true, titulo: '' };

const graficos = {
    'grafico-cobertura.svg': graficoDeBarras({
        ...comum,
        titulo: 'Produtos que podem ser comparados',
        itens: [
            { rotulo: 'Mesmo produto', valor: dados.cobertura.geral.percentualEquivalente, texto: porcento(dados.cobertura.geral.percentualEquivalente) },
            { rotulo: 'Mesmo produto ou similar', valor: dados.cobertura.geral.percentualEquivalenteOuSimilar, texto: porcento(dados.cobertura.geral.percentualEquivalenteOuSimilar), destaque: true },
            { rotulo: 'Nos 4 mercados (c/ similar)', valor: dados.cobertura.geral.percentualEmTodos, texto: porcento(dados.cobertura.geral.percentualEmTodos) }
        ],
        formatar: valor => `${valor}%`
    }),
    'grafico-diferenca.svg': graficoDeBarras({
        ...comum,
        titulo: 'Diferença de preço do mesmo produto',
        itens: dados.precos.faixas.map(faixa => ({
            rotulo: faixa.rotulo,
            valor: faixa.grupos,
            texto: `${numero(faixa.grupos)} produtos (${porcento(Math.round((faixa.grupos / dados.precos.grupos) * 1000) / 10)})`
        })),
        formatar: numero
    }),
    'grafico-mais-barato.svg': graficoDeBarras({
        ...comum,
        titulo: 'Quem tem o menor preço',
        itens: [...dados.precos.maisBarato].sort((a, b) => b.percentualDasPresencas - a.percentualDasPresencas).map(m => ({
            rotulo: NOMES[m.supermercado], valor: m.percentualDasPresencas, texto: porcento(m.percentualDasPresencas)
        })),
        formatar: valor => `${valor}%`
    }),
    'grafico-cesta.svg': graficoDeBarras({
        ...comum,
        titulo: 'Cesta básica',
        itens: [...dados.cesta.porMercado].sort((a, b) => a.total - b.total).map(m => ({
            rotulo: NOMES[m.supermercado],
            valor: m.total,
            texto: `${reais(m.total)}${m.itensEncontrados < m.itensTotal ? ` (${m.itensEncontrados} de ${m.itensTotal} itens)` : ''}`
        })),
        formatar: valor => `R$ ${valor}`
    })
};

for (const [arquivo, svg] of Object.entries(graficos)) {
    fs.writeFileSync(path.join(SAIDA, arquivo), svg, 'utf8');
    console.log('ok', arquivo);
}
