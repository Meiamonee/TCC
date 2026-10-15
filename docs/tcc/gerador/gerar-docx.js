// Gera o artigo do TCC em Word (.docx), no formato ABNT de artigo, a partir de docs/tcc/artigo.md.
// Uso: npm --prefix docs/tcc/gerador install && npm --prefix docs/tcc/gerador run gerar
//
// Marcacoes aceitas no Markdown:
//   #! TITULO        titulo centralizado sem numero (RESUMO, ABSTRACT)
//   # / ## / ###     secoes numeradas automaticamente (REFERÊNCIAS fica sem numero)
//   ![Figura N – legenda](figuras/arquivo.png)   figura, com a legenda acima
//   Tabela N – ...   legenda de tabela, seguida de uma tabela em Markdown
//   Fonte: ...       fonte da figura ou tabela (fonte menor)
//   - item           lista com marcadores
//   **negrito**, *italico*, [[texto]] (destacado em amarelo: trecho a completar)
const fs = require('fs');
const path = require('path');
const {
    AlignmentType, BorderStyle, Document, Footer, FootnoteReferenceRun, HeadingLevel, ImageRun,
    LevelFormat, Packer, PageNumber, Paragraph, Table, TableCell, TableRow, TextRun, WidthType
} = require('docx');

const RAIZ = path.resolve(__dirname, '..');
const ENTRADA = path.join(RAIZ, 'artigo.md');
const SAIDA = path.join(RAIZ, 'SuperPreco-artigo-TCC.docx');

const FONTE = 'Arial';
const TAMANHO = 24; // 12 pt (em meios-pontos)
const TAMANHO_PEQUENO = 20; // 10 pt
const LINHA_1_5 = 360;
const RECUO = 709; // 1,25 cm
const CM = 567; // 1 cm em DXA
const LARGURA_TEXTO = 16 * CM; // A4 (21 cm) - margens 3 cm + 2 cm
const LARGURA_IMAGEM_PX = 580;

const TITULO = 'SUPERPREÇO: UMA FERRAMENTA WEB PARA ANÁLISE E COMPARAÇÃO DE PREÇOS EM SUPERMERCADOS';
const AUTORES = [
    { nome: 'Pedro Lucas de Souza Faria', nota: 'Discente, IFSULDEMINAS – campus Poços de Caldas. E-mail: pedro.faria@alunos.ifsuldeminas.edu.br' },
    { nome: 'Douglas Fabiano de Sousa Nunes', nota: 'Docente orientador, IFSULDEMINAS – campus Poços de Caldas. E-mail: douglas.nunes@ifsuldeminas.edu.br' }
];

// ---------- Texto com negrito, italico e destaque ----------
function trechos(texto, base = {}) {
    const runs = [];
    const padrao = /(\*\*[^*]+\*\*|\*[^*]+\*|\[\[[\s\S]+?\]\])/g;
    let ultimo = 0;
    for (const m of texto.matchAll(padrao)) {
        if (m.index > ultimo) runs.push(new TextRun({ text: texto.slice(ultimo, m.index), ...base }));
        const t = m[0];
        if (t.startsWith('**')) runs.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
        else if (t.startsWith('[[')) runs.push(new TextRun({ text: t.slice(2, -2), highlight: 'yellow', ...base }));
        else runs.push(new TextRun({ text: t.slice(1, -1), italics: true, ...base }));
        ultimo = m.index + t.length;
    }
    if (ultimo < texto.length) runs.push(new TextRun({ text: texto.slice(ultimo), ...base }));
    return runs;
}

function paragrafo(texto, { contexto = 'corpo', ...opcoes } = {}) {
    const corpo = contexto === 'corpo';
    return new Paragraph({
        children: trechos(texto),
        alignment: contexto === 'referencias' ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
        indent: corpo ? { firstLine: RECUO } : undefined,
        spacing: contexto === 'referencias'
            ? { line: 240, after: 240 }
            : contexto === 'resumo' ? { line: 240, after: 120 } : { line: LINHA_1_5, after: 0 },
        ...opcoes
    });
}

// ---------- Imagens ----------
function tamanhoPng(arquivo) {
    const buffer = fs.readFileSync(arquivo);
    return { buffer, largura: buffer.readUInt32BE(16), altura: buffer.readUInt32BE(20) };
}

function figura(legenda, caminho) {
    const { buffer, largura, altura } = tamanhoPng(path.join(RAIZ, caminho));
    // Capturas de celular ficam mais estreitas para nao ocuparem uma pagina inteira.
    const alvo = largura < altura ? 260 : LARGURA_IMAGEM_PX;
    const escala = alvo / largura;
    return [
        new Paragraph({
            children: trechos(legenda, { size: TAMANHO_PEQUENO }),
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 60, line: 240 },
            keepNext: true
        }),
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
    return new Table({
        width: { size: LARGURA_TEXTO, type: WidthType.DXA },
        columnWidths: larguras,
        rows: celulas.map((linha, i) => new TableRow({
            tableHeader: i === 0,
            cantSplit: true,
            children: linha.map((texto, j) => new TableCell({
                width: { size: larguras[j], type: WidthType.DXA },
                borders: { top: borda, bottom: borda, left: borda, right: borda },
                margins: { top: 40, bottom: 40, left: 80, right: 80 },
                children: [new Paragraph({
                    children: trechos(i === 0 ? `**${texto.replace(/\*\*/g, '')}**` : texto, { size: TAMANHO_PEQUENO }),
                    alignment: alinhamentoDireita[j] ? AlignmentType.RIGHT : AlignmentType.LEFT,
                    spacing: { line: 240 },
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

    // Titulo e autores (com as notas de rodape), como no modelo do TCC.
    filhos.push(new Paragraph({
        children: [new TextRun({ text: TITULO, bold: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 360, line: 276 }
    }));
    AUTORES.forEach((autor, i) => filhos.push(new Paragraph({
        children: [new TextRun({ text: autor.nome }), new FootnoteReferenceRun(i + 1)],
        alignment: AlignmentType.RIGHT,
        spacing: { after: i === AUTORES.length - 1 ? 360 : 0 }
    })));

    for (const bloco of blocos(md)) {
        const linhas = bloco.split('\n');

        if (bloco.startsWith('#! ')) {
            contexto = 'resumo';
            filhos.push(new Paragraph({
                children: [new TextRun({ text: bloco.slice(3).trim(), bold: true })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 240 },
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
            let rotulo = nome;
            if (!semNumero) {
                numeros[nivel - 1]++;
                for (let i = nivel; i < 3; i++) numeros[i] = 0;
                rotulo = `${numeros.slice(0, nivel).join('.')} ${nivel === 1 ? nome.toUpperCase() : nome}`;
            }
            filhos.push(new Paragraph({
                heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][nivel - 1],
                children: [new TextRun({ text: rotulo, bold: nivel < 3, font: FONTE, size: TAMANHO, color: '000000' })],
                alignment: semNumero ? AlignmentType.CENTER : AlignmentType.LEFT,
                spacing: { before: nivel === 1 ? 480 : 360, after: 240, line: LINHA_1_5 },
                keepNext: true
            }));
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

        if (bloco.startsWith('Tabela ')) {
            filhos.push(new Paragraph({
                children: trechos(bloco, { size: TAMANHO_PEQUENO }),
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 60, line: 240 },
                keepNext: true
            }));
            continue;
        }

        if (bloco.startsWith('Fonte:')) {
            filhos.push(new Paragraph({
                children: trechos(bloco, { size: TAMANHO_PEQUENO }),
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 240, line: 240 }
            }));
            continue;
        }

        if (linhas.every(l => l.startsWith('- '))) {
            for (const linha of linhas) {
                filhos.push(new Paragraph({
                    children: trechos(linha.slice(2)),
                    numbering: { reference: 'marcadores', level: 0 },
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { line: LINHA_1_5 }
                }));
            }
            continue;
        }

        const semRecuo = contexto !== 'corpo' || /^\*\*(Palavras-chave|Keywords):\*\*/.test(bloco);
        filhos.push(paragrafo(linhas.join(' '), { contexto: semRecuo && contexto === 'corpo' ? 'resumo' : contexto }));
    }

    return filhos;
}

const documento = new Document({
    creator: 'Pedro Lucas de Souza Faria',
    title: TITULO,
    styles: {
        default: { document: { run: { font: FONTE, size: TAMANHO } } },
        paragraphStyles: [1, 2, 3].map(n => ({
            id: `Heading${n}`,
            name: `Heading ${n}`,
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: { font: FONTE, size: TAMANHO, bold: n < 3, color: '000000' },
            paragraph: { outlineLevel: n - 1 }
        }))
    },
    numbering: {
        config: [{
            reference: 'marcadores',
            levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 709, hanging: 283 } } } }]
        }]
    },
    footnotes: Object.fromEntries(AUTORES.map((autor, i) => [i + 1, {
        children: [new Paragraph({ children: [new TextRun({ text: autor.nota, size: TAMANHO_PEQUENO })] })]
    }])),
    sections: [{
        properties: {
            page: {
                size: { width: 21 * CM, height: Math.round(29.7 * CM) },
                margin: { top: 3 * CM, left: 3 * CM, bottom: 2 * CM, right: 2 * CM }
            }
        },
        footers: {
            default: new Footer({
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], size: TAMANHO_PEQUENO })] })]
            })
        },
        children: montar()
    }]
});

Packer.toBuffer(documento).then(buffer => {
    fs.writeFileSync(SAIDA, buffer);
    console.log(`Artigo gerado: ${SAIDA}`);
});
