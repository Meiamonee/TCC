// Graficos em SVG para o texto do TCC (figuras estaticas, para impressao). Sem bibliotecas:
// barras horizontais de uma cor so, com o rotulo de cada barra a esquerda e o valor na ponta,
// grade discreta e fonte do sistema.

const COR_BARRA = '#1f7a45'; // verde do SuperPreco (feira-500)
const COR_DESTAQUE = '#0c3d24'; // barra em destaque (ex.: compra dividida)
const TINTA = '#1d1b16';
const TINTA_SECUNDARIA = '#6b665b';
const GRADE = '#e6dcc8';
const FUNDO = '#ffffff';
const FONTE = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function escapar(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Retangulo com a ponta direita arredondada (4px) e a base reta, encostada no eixo.
function barra(x, y, largura, altura, cor) {
    const r = Math.min(4, largura / 2, altura / 2);
    if (largura <= 0) return '';
    return `<path d="M${x},${y} H${x + largura - r} Q${x + largura},${y} ${x + largura},${y + r} V${y + altura - r} Q${x + largura},${y + altura} ${x + largura - r},${y + altura} H${x} Z" fill="${cor}"/>`;
}

function escalaBonita(maximo) {
    if (maximo <= 0) return { topo: 1, passo: 0.25 };
    const potencia = 10 ** Math.floor(Math.log10(maximo));
    const passos = [1, 2, 2.5, 5, 10].map(n => n * potencia);
    const passo = passos.find(p => maximo / p <= 5) || passos[passos.length - 1];
    return { topo: Math.ceil(maximo / passo) * passo, passo };
}

/**
 * Grafico de barras horizontais.
 * itens: [{ rotulo, valor, texto?, destaque? }]; formatar: valor -> texto do eixo.
 */
// semTitulo: versao para documentos, em que o titulo e a fonte ficam na legenda da figura.
function graficoDeBarras({ titulo, subtitulo = '', itens, formatar = valor => String(valor), fonte = '', semTitulo = false }) {
    const largura = 760;
    const margemEsquerda = 190;
    const margemDireita = 90;
    const alturaBarra = 22;
    const espaco = 12;
    const topo = semTitulo ? 18 : subtitulo ? 74 : 54;
    const areaLargura = largura - margemEsquerda - margemDireita;
    const areaAltura = itens.length * (alturaBarra + espaco) - espaco;
    const altura = topo + areaAltura + 44 + (fonte && !semTitulo ? 18 : 0);

    const { topo: maximo, passo } = escalaBonita(Math.max(...itens.map(item => item.valor), 0));
    const xDe = valor => margemEsquerda + (valor / maximo) * areaLargura;

    const grade = [];
    for (let valor = 0; valor <= maximo + 1e-9; valor += passo) {
        const x = xDe(valor);
        grade.push(`<line x1="${x}" y1="${topo - 6}" x2="${x}" y2="${topo + areaAltura + 4}" stroke="${GRADE}" stroke-width="1"/>`);
        grade.push(`<text x="${x}" y="${topo + areaAltura + 20}" font-size="11" fill="${TINTA_SECUNDARIA}" text-anchor="middle">${escapar(formatar(valor))}</text>`);
    }

    const barras = itens.map((item, indice) => {
        const y = topo + indice * (alturaBarra + espaco);
        const fim = xDe(item.valor);
        // 2px de folga entre a barra e o eixo vertical (espaco de superficie).
        return [
            `<text x="${margemEsquerda - 10}" y="${y + alturaBarra / 2 + 4}" font-size="13" fill="${TINTA}" text-anchor="end">${escapar(item.rotulo)}</text>`,
            barra(margemEsquerda + 2, y, Math.max(fim - margemEsquerda - 2, 0), alturaBarra, item.destaque ? COR_DESTAQUE : COR_BARRA),
            `<text x="${fim + 8}" y="${y + alturaBarra / 2 + 4}" font-size="13" font-weight="600" fill="${TINTA}">${escapar(item.texto ?? formatar(item.valor))}</text>`
        ].join('\n  ');
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" font-family="${FONTE}" role="img" aria-label="${escapar(titulo)}">
  <title>${escapar(titulo)}</title>
  <rect width="${largura}" height="${altura}" fill="${FUNDO}"/>
  ${semTitulo ? '' : `<text x="16" y="28" font-size="17" font-weight="700" fill="${TINTA}">${escapar(titulo)}</text>`}
  ${subtitulo && !semTitulo ? `<text x="16" y="50" font-size="12.5" fill="${TINTA_SECUNDARIA}">${escapar(subtitulo)}</text>` : ''}
  ${grade.join('\n  ')}
  <line x1="${margemEsquerda}" y1="${topo - 6}" x2="${margemEsquerda}" y2="${topo + areaAltura + 4}" stroke="${TINTA_SECUNDARIA}" stroke-width="1"/>
  ${barras.join('\n  ')}
  ${fonte && !semTitulo ? `<text x="16" y="${altura - 10}" font-size="11" fill="${TINTA_SECUNDARIA}">${escapar(fonte)}</text>` : ''}
</svg>
`;
}

module.exports = {
    graficoDeBarras
};
