// Gera o artigo do TCC em Word (.docx) a partir de docs/tcc/artigo.md, com o mesmo modelo do
// artigo original do campus (TCC-4): pagina Carta com margens de 2,54 cm, Times New Roman 12,
// espacamento 1,5, titulos "1. INTRODUÇÃO" em negrito, autores a direita e notas de rodape.
// Uso: npm --prefix docs/tcc/gerador install && npm --prefix docs/tcc/gerador run gerar
//
// Marcacoes aceitas no Markdown:
//   #! TITULO        titulo sem numero (RESUMO, ABSTRACT), a esquerda e em negrito
//   # / ## / ###     secoes numeradas automaticamente (REFERÊNCIAS fica sem numero)
//   ![Figura N. legenda](figuras/arquivo.png)   figura, com a legenda acima
//   Tabela N. ...    legenda de tabela, seguida de uma tabela em Markdown
//   Fonte: ...       fonte da figura ou tabela
//   - item           lista com marcadores
//   **negrito**, *italico*, [[texto]] (destacado em amarelo: trecho a completar)
const fs = require('fs');
const path = require('path');
const {
    AlignmentType, BorderStyle, Document, FootnoteReferenceRun, HeadingLevel, ImageRun,
    LevelFormat, Packer, PageBreak, Paragraph, Table, TableCell, TableRow, TextRun, WidthType
} = require('docx');

const RAIZ = path.resolve(__dirname, '..');
const ENTRADA = path.join(RAIZ, 'artigo.md');
const SAIDA = path.join(RAIZ, 'SuperPreco-artigo-TCC.docx');

// ---------- Modelo do artigo original ----------
const FONTE = 'Times New Roman';
const FONTE_TABELA = 'Arial'; // as tabelas do original usam Arial
const TAMANHO = 24; // 12 pt (em meios-pontos)
const TAMANHO_TITULO = 26; // 13 pt
const TAMANHO_TABELA = 20; // 10 pt
const TAMANHO_NOTA = 20; // 10 pt
const LINHA_1_5 = 360;
const LINHA_SIMPLES = 240;
const RECUO = 720; // 1,27 cm, como no original
const POLEGADA = 1440; // em DXA
const PAGINA = { width: 12240, height: 15840 }; // Carta (21,59 x 27,94 cm)
const MARGEM = POLEGADA; // 2,54 cm
const LARGURA_TEXTO = PAGINA.width - 2 * MARGEM;
const LARGURA_IMAGEM_PX = 600;

const TITULO = 'SUPERPREÇO: UMA FERRAMENTA WEB PARA ANÁLISE E COMPARAÇÃO DE PREÇOS EM SUPERMERCADOS.';
const AUTORES = [
    { nome: 'Pedro Lucas de Souza Faria', nota: ['Discente, IFSULDEMINAS – ', '*campus*', ' Poços de Caldas. E-mail: pedro.faria@alunos.ifsuldeminas.edu.br'] },
    { nome: 'Douglas Fabiano de Sousa Nunes', nota: ['Docente orientador, IFSULDEMINAS – ', '*campus*', ' Poços de Caldas. E-mail: douglas.nunes@ifsuldeminas.edu.br'] }
];

// ---------- Texto com negrito, italico e destaque ----------
function trechos(texto, base = {}) {
    const runs = [];
    const padrao = /(\*\*[^*]+\*\*|\*[^*]+\*|\[\[[\s\S]+?\]\])/g;
    let ultimo = 0;
    for (const m of texto.matchAll(padrao)) {
        if (m.index > ultimo) runs.push(new TextRun({ text: texto.slice(ultimo, m.index), ...base }));
        const t = m[0];
        if (t.startsWith('**')) runs.push(new TextRun({ text: t.slice(2, -2), ...base, bold: true }));
        else if (t.startsWith('[[')) runs.push(new TextRun({ text: t.slice(2, -2), ...base, highlight: 'yellow' }));
        else runs.push(new TextRun({ text: t.slice(1, -1), ...base, italics: true }));
        ultimo = m.index + t.length;
    }
    if (ultimo < texto.length) runs.push(new TextRun({ text: texto.slice(ultimo), ...base }));
    return runs;
}

// ---------- Imagens ----------
function tamanhoPng(arquivo) {
    const buffer = fs.readFileSync(arquivo);
    return { buffer, largura: buffer.readUInt32BE(16), altura: buffer.readUInt32BE(20) };
}

function legenda(texto) {
    return new Paragraph({
        children: trechos(texto),
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120, line: LINHA_SIMPLES },
        keepNext: true
    });
}

function figura(texto, caminho) {
    const { buffer, largura, altura } = tamanhoPng(path.join(RAIZ, caminho));
    // Capturas de celular ficam mais estreitas para nao ocuparem uma pagina inteira.
    const alvo = largura < altura ? 260 : LARGURA_IMAGEM_PX;
    const escala = alvo / largura;
    return [
        legenda(texto),
        new Paragraph({
            children: [new ImageRun({ type: 'png', data: buffer, transformation: { width: Math.round(largura * escala), height: Math.round(altura * escala) } })],
            alignment: AlignmentType.CENTER,
            keepNext: true
        })
    ];
}

// ---------- Tabelas ----------
function tabela(linhas) {
    const celulas = linhas
        .filter(linha => !/^\|\s*-{3,}/.test(linha))
        .map(linha => linha.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    const alinhamentoDireita = linhas.find(l => /^\|\s*-{3,}/.test(l))
        .trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim().endsWith(':'));

    // Largura de cada coluna proporcional ao maior texto dela.
    const pesos = celulas[0].map((_, i) => Math.max(6, ...celulas.map(l => (l[i] || '').replace(/\*/g, '').length)));
    const soma = pesos.reduce((a, b) => a + b, 0);
    const larguras = pesos.map(p => Math.round((p / soma) * LARGURA_TEXTO));
    larguras[larguras.length - 1] += LARGURA_TEXTO - larguras.reduce((a, b) => a + b, 0);

    const borda = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
    const base = { font: FONTE_TABELA, size: TAMANHO_TABELA };
    return new Table({
        width: { size: LARGURA_TEXTO, type: WidthType.DXA },
        columnWidths: larguras,
        rows: celulas.map((linha, i) => new TableRow({
            tableHeader: i === 0,
            cantSplit: true,
            children: linha.map((texto, j) => new TableCell({
                width: { size: larguras[j], type: WidthType.DXA },
                borders: { top: borda, bottom: borda, left: borda, right: borda },
                margins: { top: 60, bottom: 60, left: 100, right: 100 },
                children: [new Paragraph({
                    children: trechos(i === 0 ? `**${texto.replace(/\*\*/g, '')}**` : texto, base),
                    alignment: i === 0 ? AlignmentType.CENTER : alinhamentoDireita[j] ? AlignmentType.RIGHT : AlignmentType.LEFT,
                    spacing: { line: LINHA_SIMPLES },
                    // Mantem a tabela inteira na mesma pagina (e junto da fonte, logo abaixo).
                    keepNext: true
                })]
            }))
        }))
    });
}

// ---------- Leitura do Markdown ----------
function blocos(texto) {
    return texto.replace(/\r\n/g, '\n').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
}

function montar() {
    const md = fs.readFileSync(ENTRADA, 'utf8');
    const filhos = [];
    const numeros = [0, 0, 0];
    let contexto = 'resumo';
    let primeiraSecao = true;

    // Titulo e autores, como no modelo: titulo centralizado em negrito; autores a direita,
    // em negrito, com o numero da nota de rodape.
    filhos.push(new Paragraph({
        children: [new TextRun({ text: TITULO, bold: true, size: TAMANHO_TITULO })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 720, after: 720, line: LINHA_1_5 }
    }));
    AUTORES.forEach((autor, i) => filhos.push(new Paragraph({
        children: [new TextRun({ text: autor.nome, bold: true }), new FootnoteReferenceRun(i + 1)],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 240, line: LINHA_1_5 }
    })));

    for (const bloco of blocos(md)) {
        const linhas = bloco.split('\n');

        if (bloco.startsWith('#! ')) {
            contexto = 'resumo';
            const nome = bloco.slice(3).trim();
            filhos.push(new Paragraph({
                children: [new TextRun({ text: nome, bold: true })],
                // O abstract comeca na pagina seguinte ao resumo.
                pageBreakBefore: /^ABSTRACT$/i.test(nome),
                spacing: { before: 120, after: 0, line: LINHA_1_5 },
                keepNext: true
            }));
            continue;
        }

        const titulo = bloco.match(/^(#{1,3}) (.+)$/);
        if (titulo && linhas.length === 1) {
            const nivel = titulo[1].length;
            const nome = titulo[2].trim();
            const semNumero = /^REFER[ÊE]NCIAS$/i.test(nome);
            contexto = semNumero ? 'referencias' : 'corpo';
            let rotulo = nome.toUpperCase();
            if (!semNumero) {
                numeros[nivel - 1]++;
                for (let i = nivel; i < 3; i++) numeros[i] = 0;
                rotulo = nivel === 1 ? `${numeros[0]}. ${nome.toUpperCase()}` : `${numeros.slice(0, nivel).join('.')} ${nome}`;
            }
            filhos.push(new Paragraph({
                heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][nivel - 1],
                children: [new TextRun({ text: rotulo, bold: true, font: FONTE, size: TAMANHO, color: '000000' })],
                // Como no original, a introducao comeca em uma pagina nova, depois do resumo.
                pageBreakBefore: nivel === 1 && primeiraSecao,
                spacing: { before: nivel === 1 ? 360 : 240, after: 0, line: LINHA_1_5 },
                keepNext: true
            }));
            if (nivel === 1) primeiraSecao = false;
            continue;
        }

        const imagem = bloco.match(/^!\[(.+)\]\((.+)\)$/);
        if (imagem) {
            filhos.push(...figura(imagem[1], imagem[2]));
            continue;
        }

        if (linhas.every(l => l.trim().startsWith('|'))) {
            filhos.push(tabela(linhas));
            continue;
        }

        if (/^Tabela \d+\./.test(bloco)) {
            filhos.push(legenda(bloco));
            continue;
        }

        if (bloco.startsWith('Fonte:')) {
            filhos.push(new Paragraph({
                children: trechos(bloco, { size: TAMANHO_NOTA }),
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 240, line: LINHA_SIMPLES }
            }));
            continue;
        }

        if (linhas.every(l => l.startsWith('- '))) {
            linhas.forEach((linha, i) => filhos.push(new Paragraph({
                children: trechos(linha.slice(2)),
                numbering: { reference: 'marcadores', level: 0 },
                alignment: AlignmentType.LEFT,
                spacing: { before: i === 0 ? 120 : 0, after: i === linhas.length - 1 ? 120 : 0, line: 276 }
            })));
            continue;
        }

        const texto = linhas.join(' ');
        if (/^\*\*(Palavras-chave|Keywords):\*\*/.test(texto)) {
            // No original a linha de palavras-chave fica inteira em negrito.
            filhos.push(new Paragraph({
                children: [new TextRun({ text: texto.replace(/\*\*/g, ''), bold: true })],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { before: 480, after: 0, line: LINHA_1_5 }
            }));
            continue;
        }

        if (contexto === 'referencias') {
            filhos.push(new Paragraph({
                children: trechos(texto),
                alignment: AlignmentType.JUSTIFIED,
                spacing: { line: LINHA_SIMPLES, after: 240 }
            }));
            continue;
        }

        filhos.push(new Paragraph({
            children: trechos(texto),
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: RECUO },
            spacing: { line: LINHA_1_5, after: 0 }
        }));
    }

    return filhos;
}

const documento = new Document({
    creator: 'Pedro Lucas de Souza Faria',
    title: TITULO,
    styles: {
        default: { document: { run: { font: FONTE, size: TAMANHO } } },
        paragraphStyles: [
            ...[1, 2, 3].map(n => ({
                id: `Heading${n}`,
                name: `Heading ${n}`,
                basedOn: 'Normal',
                next: 'Normal',
                quickFormat: true,
                run: { font: FONTE, size: TAMANHO, bold: true, color: '000000' },
                paragraph: { outlineLevel: n - 1 }
            })),
            {
                id: 'FootnoteText',
                name: 'footnote text',
                basedOn: 'Normal',
                run: { font: FONTE, size: TAMANHO_NOTA },
                paragraph: { spacing: { line: LINHA_SIMPLES } }
            }
        ]
    },
    numbering: {
        config: [{
            reference: 'marcadores',
            levels: [{ level: 0, format: LevelFormat.BULLET, text: '●', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
        }]
    },
    footnotes: Object.fromEntries(AUTORES.map((autor, i) => [i + 1, {
        children: [new Paragraph({ children: autor.nota.flatMap(parte => trechos(parte, { size: TAMANHO_NOTA })) })]
    }])),
    sections: [{
        properties: {
            page: {
                size: PAGINA,
                margin: { top: MARGEM, left: MARGEM, bottom: MARGEM, right: MARGEM }
            }
        },
        children: montar()
    }]
});

Packer.toBuffer(documento).then(buffer => {
    fs.writeFileSync(SAIDA, buffer);
    console.log(`Artigo gerado: ${SAIDA}`);
});
