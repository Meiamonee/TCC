// Gera a ficha do teste com usuarios em Word (para imprimir): termo de participacao, perfil,
// tarefa, questionario SUS, perguntas abertas e a folha de registro do avaliador.
// Uso: node docs/tcc/gerador/gerar-ficha.js
const fs = require('fs');
const path = require('path');
const {
    AlignmentType, BorderStyle, Document, Packer, PageBreak, Paragraph, Table, TableCell,
    TableRow, TextRun, VerticalAlign, WidthType
} = require('docx');

const SAIDA = path.resolve(__dirname, '../../avaliacao/ficha-teste-usuarios.docx');
const FONTE = 'Arial';
const CAIXA = '☐';

// Os mesmos itens de docs/avaliacao/gabarito.js.
const ITENS = [
    'Arroz Super Ecco tipo 1, 5 kg',
    'Feijão carioca Du Irineu, 1 kg',
    'Açúcar refinado União, 1 kg',
    'Café 3 Corações tradicional, 500 g',
    'Óleo de soja Liza, 900 ml',
    'Leite integral Itambé, 1 L',
    'Macarrão espaguete nº 8 Galo, 500 g',
    'Farinha de trigo Renata tradicional, 1 kg',
    'Sal refinado Cisne, 1 kg',
    'Margarina Doriana com sal, 500 g'
];

// System Usability Scale (BROOKE, 1996), na traducao usada em docs/avaliacao/README.md.
const SUS = [
    'Eu acho que gostaria de usar este sistema com frequência.',
    'Eu achei o sistema desnecessariamente complexo.',
    'Eu achei o sistema fácil de usar.',
    'Eu acho que precisaria de ajuda de uma pessoa com conhecimentos técnicos para usar o sistema.',
    'Eu acho que as várias funções do sistema estão muito bem integradas.',
    'Eu acho que o sistema apresenta muita inconsistência.',
    'Eu imagino que as pessoas aprenderão como usar este sistema rapidamente.',
    'Eu achei o sistema atrapalhado de usar.',
    'Eu me senti confiante ao usar o sistema.',
    'Eu precisei aprender várias coisas novas antes de conseguir usar o sistema.'
];

// ---------- Blocos ----------
const texto = (conteudo, opcoes = {}) => new TextRun({ text: conteudo, font: FONTE, size: 22, ...opcoes });

function paragrafo(conteudo, { negrito = false, tamanho = 22, alinhamento, antes = 0, depois = 120, italico = false } = {}) {
    const partes = Array.isArray(conteudo) ? conteudo : [texto(conteudo, { bold: negrito, size: tamanho, italics: italico })];
    return new Paragraph({ children: partes, alignment: alinhamento, spacing: { before: antes, after: depois, line: 300 } });
}

const titulo = conteudo => paragrafo(conteudo, { negrito: true, tamanho: 30, alinhamento: AlignmentType.CENTER, depois: 80 });
const subtitulo = conteudo => paragrafo(conteudo, { tamanho: 20, alinhamento: AlignmentType.CENTER, depois: 280, italico: true });
const secao = conteudo => paragrafo(conteudo, { negrito: true, tamanho: 24, antes: 240, depois: 120 });
const linhas = (quantidade, rotulo = '') => Array.from({ length: quantidade }, (_, i) =>
    paragrafo(`${i === 0 ? rotulo : ''}${'_'.repeat(i === 0 && rotulo ? Math.max(10, 74 - rotulo.length) : 74)}`, { depois: 200 }));
const quebra = () => new Paragraph({ children: [new PageBreak()] });
const codigo = () => paragrafo([texto('Participante nº: ', { bold: true }), texto('P______')], { alinhamento: AlignmentType.RIGHT });

function pergunta(numero, enunciado, opcoes) {
    return [
        paragrafo(`${numero}. ${enunciado}`, { negrito: true, antes: 120, depois: 60 }),
        paragrafo(opcoes.map(opcao => `${CAIXA} ${opcao}`).join('     '), { depois: 120 })
    ];
}

const borda = { style: BorderStyle.SINGLE, size: 4, color: '808080' };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };

function celula(conteudo, { largura, negrito = false, centro = false, fundo, tamanho = 20 } = {}) {
    return new TableCell({
        width: { size: largura, type: WidthType.DXA },
        borders: bordas,
        verticalAlign: VerticalAlign.CENTER,
        shading: fundo ? { fill: fundo } : undefined,
        margins: { top: 70, bottom: 70, left: 100, right: 100 },
        children: [new Paragraph({
            alignment: centro ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [texto(conteudo, { bold: negrito, size: tamanho })]
        })]
    });
}

function tabela(larguras, linhasDaTabela, { cabecalho = true, centralizar = true } = {}) {
    return new Table({
        width: { size: larguras.reduce((a, b) => a + b, 0), type: WidthType.DXA },
        columnWidths: larguras,
        rows: linhasDaTabela.map((linha, i) => new TableRow({
            tableHeader: cabecalho && i === 0,
            children: linha.map((valor, j) => celula(valor, {
                largura: larguras[j],
                negrito: cabecalho && i === 0,
                fundo: cabecalho && i === 0 ? 'E8F1EA' : undefined,
                centro: j > 0 && cabecalho && centralizar
            }))
        }))
    });
}

// ---------- Paginas ----------
const termo = [
    titulo('Termo de participação'),
    subtitulo('SuperPreço: uma ferramenta web para análise e comparação de preços em supermercados'),
    paragrafo('Você está sendo convidado(a) a participar de um teste do SuperPreço, um site que compara os preços de quatro supermercados de Poços de Caldas. O teste faz parte do Trabalho de Conclusão de Curso de Pedro Lucas de Souza Faria, do IFSULDEMINAS, campus Poços de Caldas, com orientação do professor Douglas Fabiano de Sousa Nunes.'),
    paragrafo('No teste, você vai descobrir em qual supermercado uma lista de 10 produtos sai mais barata, primeiro de um jeito e depois de outro (pelos sites dos mercados e pelo SuperPreço). O tempo de cada tentativa será cronometrado. Depois, você responderá a um questionário curto sobre a sua experiência. Tudo leva cerca de 30 minutos.'),
    paragrafo('O que é avaliado é o site, não você: não existe resposta certa ou errada sobre a sua opinião. A participação é voluntária, e você pode desistir a qualquer momento, sem precisar explicar o motivo. Seu nome não aparecerá no trabalho: as respostas são identificadas apenas por um número (P1, P2, ...), e este termo fica guardado separado das respostas. Os dados serão usados somente neste trabalho acadêmico.'),
    paragrafo('Declaro que li as informações acima e aceito participar.', { negrito: true, antes: 200, depois: 360 }),
    ...linhas(1, 'Nome: '),
    ...linhas(1, 'Assinatura: '),
    paragrafo('Data: ____/____/________', { depois: 200 })
];

const perfil = [
    quebra(),
    codigo(),
    titulo('Ficha do participante'),
    subtitulo('Preencha antes de começar o teste.'),
    secao('Parte 1 — Sobre você'),
    ...pergunta(1, 'Idade:', ['até 24 anos', '25 a 39', '40 a 59', '60 anos ou mais']),
    ...pergunta(2, 'Com que frequência você faz compras de supermercado?', ['mais de uma vez por semana', 'uma vez por semana', 'a cada 15 dias', 'uma vez por mês ou menos']),
    ...pergunta(3, 'Você costuma comparar preços entre supermercados antes de comprar?', ['sempre', 'às vezes', 'nunca']),
    ...pergunta(4, 'Como você compara os preços? (pode marcar mais de uma)', ['indo aos mercados', 'pelos sites ou aplicativos dos mercados', 'por folhetos/encartes ou redes sociais', 'não comparo']),
    ...pergunta(5, 'Você já usou algum site ou aplicativo comparador de preços (como Buscapé ou Zoom)?', ['sim', 'não']),
    ...pergunta(6, 'Com que facilidade você usa a internet no celular ou no computador?', ['tenho muita facilidade', 'tenho alguma facilidade', 'tenho dificuldade']),
    ...pergunta(7, 'Em qual aparelho você fará o teste?', ['celular', 'computador'])
];

const tarefa = [
    quebra(),
    codigo(),
    titulo('Parte 2 — A tarefa'),
    subtitulo('O avaliador vai dizer se você começa pelos sites dos mercados ou pelo SuperPreço.'),
    paragrafo('Descubra em qual dos quatro supermercados (SuperVale, Vila Sul, San Michel e Pedrilho) a lista abaixo sai mais barata e quanto ela custa nesse mercado. Considere exatamente a marca e o tamanho indicados, uma unidade de cada.', { depois: 200 }),
    tabela([600, 8760], [['Nº', 'Produto'], ...ITENS.map((item, i) => [String(i + 1), item])], { centralizar: false }),
    paragrafo('Sites dos mercados: supervalesupermercados.com.br · vilasul.com.br · supersanmichel.com.br · pedrilho.com.br', { tamanho: 18, antes: 160, italico: true }),
    paragrafo('SuperPreço: superpreco.pages.dev', { tamanho: 18, italico: true, depois: 240 }),
    secao('Sua resposta'),
    tabela([2400, 3480, 3480], [
        ['', 'Mercado mais barato', 'Total da lista (R$)'],
        ['1ª tentativa', '', ''],
        ['2ª tentativa', '', '']
    ])
];

const questionario = [
    quebra(),
    codigo(),
    titulo('Parte 3 — O que você achou do SuperPreço'),
    subtitulo('Marque um X no número que melhor representa a sua opinião sobre cada frase. Responda pensando apenas no SuperPreço.'),
    tabela([5360, 800, 800, 800, 800, 800], [
        ['Afirmação', '1', '2', '3', '4', '5'],
        ...SUS.map((frase, i) => [`${i + 1}. ${frase}`, CAIXA, CAIXA, CAIXA, CAIXA, CAIXA])
    ]),
    paragrafo('1 = discordo totalmente · 2 = discordo · 3 = não concordo nem discordo · 4 = concordo · 5 = concordo totalmente', { tamanho: 18, antes: 120, italico: true }),
    secao('Parte 4 — Comentários'),
    paragrafo('1. O que você mais gostou no SuperPreço?', { negrito: true, depois: 80 }),
    ...linhas(2),
    paragrafo('2. Teve algo difícil, confuso ou que você não encontrou?', { negrito: true, depois: 80 }),
    ...linhas(2),
    paragrafo('3. Você usaria o SuperPreço para planejar as suas compras?', { negrito: true, depois: 60 }),
    paragrafo(`${CAIXA} sim     ${CAIXA} talvez     ${CAIXA} não     Por quê? ____________________________________________`, { depois: 160 }),
    paragrafo('4. O que você mudaria ou acrescentaria?', { negrito: true, depois: 80 }),
    ...linhas(2),
    paragrafo('Obrigado pela participação!', { negrito: true, alinhamento: AlignmentType.CENTER, antes: 240 })
];

const avaliador = [
    quebra(),
    codigo(),
    titulo('Registro do avaliador'),
    subtitulo('Esta folha fica com o avaliador. Não mostre ao participante.'),
    secao('Antes de começar'),
    paragrafo('Rode o gabarito no dia (node docs/avaliacao/gabarito.js) e anote o resultado. Alterne a ordem: participantes ímpares começam pelos sites dos mercados; pares, pelo SuperPreço. No SuperPreço, a pessoa começa na página inicial, sem ajuda; só intervenha se ela pedir.', { depois: 160 }),
    paragrafo('Data e hora do teste: ____/____/________  ____:____      Aparelho: ' + `${CAIXA} celular   ${CAIXA} computador`, { depois: 120 }),
    paragrafo('Gabarito do dia — mercado mais barato: __________________   Total: R$ __________', { negrito: true, depois: 120 }),
    paragrafo(`Ordem: ${CAIXA} sites dos mercados → SuperPreço     ${CAIXA} SuperPreço → sites dos mercados`, { depois: 200 }),
    secao('Tempo de cada tentativa'),
    paragrafo('O cronômetro começa quando a pessoa recebe a tarefa e para quando ela diz o mercado e o total.', { tamanho: 20, depois: 120 }),
    tabela([2160, 1440, 1440, 1440, 1440, 1440], [
        ['Método', 'Início', 'Fim', 'Tempo (seg.)', 'Acertou o mercado?', 'Desistiu?'],
        ['Sites dos mercados', '', '', '', `${CAIXA} sim ${CAIXA} não`, `${CAIXA} sim`],
        ['SuperPreço', '', '', '', `${CAIXA} sim ${CAIXA} não`, `${CAIXA} sim`]
    ]),
    secao('O que você observou'),
    paragrafo('Onde a pessoa travou, o que ela procurou e não achou, se pediu ajuda, comentários feitos em voz alta:', { tamanho: 20, depois: 120 }),
    ...linhas(6),
    secao('Depois do teste'),
    paragrafo('Passe as respostas para as planilhas: docs/avaliacao/tempo.csv (participante;metodo;segundos;acertou, com metodo = manual ou superpreco e acertou = s ou n) e docs/avaliacao/sus.csv (participante;q1;...;q10).', { tamanho: 20 })
];

const documento = new Document({
    creator: 'Pedro Lucas de Souza Faria',
    title: 'Ficha do teste com usuários — SuperPreço',
    styles: { default: { document: { run: { font: FONTE, size: 22 } } } },
    sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        children: [...termo, ...perfil, ...tarefa, ...questionario, ...avaliador]
    }]
});

Packer.toBuffer(documento).then(buffer => {
    fs.writeFileSync(SAIDA, buffer);
    console.log('Ficha gerada:', SAIDA);
});
