require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Produto = require('../models/Produto');
const HistoricoPreco = require('../models/HistoricoPreco');
const { SUPERMARKETS } = require('../services/importProducts');
const { montarEstatisticas, precoComparavel } = require('../services/comparacao');
const { cotarLista } = require('../services/listaCompras');
const { calcularCestaBasica } = require('../services/cestaBasica');
const {
    analisarHistorico,
    analisarPrecos,
    arredondar,
    calcularCobertura,
    calcularEquivalentes,
    escolherProdutoDaLista,
    analisarSus,
    analisarTempos,
    mediana,
    montarGrupos,
    sortearAmostra
} = require('../analise/calculos');
const { graficoDeBarras } = require('../analise/graficos');

// Analise dos dados coletados (Etapa 4 do TCC): gera em docs/resultados/ um relatorio em
// Markdown, as tabelas em CSV e os graficos em SVG para o capitulo de resultados.
//
// Uso (no banco definido em MONGODB_URI, normalmente o MongoDB Atlas de producao):
//   npm --prefix backend run analise
//   npm --prefix backend run analise -- --api https://superpreco-api.onrender.com/api
// Com --api, mede tambem o tempo de resposta da API publicada.

// ANALISE_SAIDA e ANALISE_AVALIACAO permitem testar o script sem mexer em docs/.
const SAIDA = process.env.ANALISE_SAIDA || path.resolve(__dirname, '../../docs/resultados');

// A variacao de precos so e medida a partir desta data. Antes dela o historico mistura mudancas de
// verdade com efeitos das correcoes da coleta (ex.: preco por kg trocado pelo preco da embalagem
// em 14 e 15/10/2026), que pareceriam altas e quedas que nao aconteceram.
const INICIO_HISTORICO_CONFIAVEL = new Date('2026-10-15T06:00:00Z');
const REPOSITORIO = 'Meiamonee/TCC';
const FONTE = 'Fonte: dados coletados pelo SuperPreço';

// Lista de compras de exemplo: itens basicos de mercearia, um de cada.
const LISTA_EXEMPLO = [
    'arroz tipo 1 5kg',
    'feijao carioca 1kg',
    'acucar refinado 1kg',
    'cafe 500g',
    'oleo soja 900ml',
    'leite integral 1l',
    'macarrao espaguete 500g',
    'farinha trigo 1kg',
    'sal refinado 1kg',
    'margarina 500g',
    'molho tomate',
    'achocolatado 400g'
];

const reais = valor => `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
const numero = valor => Number(valor).toLocaleString('pt-BR');
const porcento = valor => `${String(valor).replace('.', ',')}%`;
const nomeDe = slug => SUPERMARKETS[slug]?.nome || slug;

// Tabela em Markdown: colunas de numeros, precos e percentuais alinhadas a direita; texto a esquerda.
function tabela(cabecalho, linhas) {
    const ehNumero = valor => /^\**(R\$ )?-?[\d.,]+(%| ms| min)?( de \d+)?\**$/.test(String(valor).trim());
    const alinhamentos = cabecalho.map((_, i) => (linhas.length && linhas.every(linha => ehNumero(linha[i])) ? '---:' : '---'));
    return [
        `| ${cabecalho.join(' | ')} |`,
        `| ${alinhamentos.join(' | ')} |`,
        ...linhas.map(linha => `| ${linha.join(' | ')} |`)
    ].join('\n');
}

function csv(cabecalho, linhas) {
    const celula = valor => (/[",;\n]/.test(String(valor)) ? `"${String(valor).replace(/"/g, '""')}"` : String(valor));
    return [cabecalho, ...linhas].map(linha => linha.map(celula).join(';')).join('\n') + '\n';
}

// Separa uma linha de CSV com ";" respeitando campos entre aspas (ex.: "Bala Mentos 37,5g").
function lerLinhaCsv(linha) {
    const campos = [];
    let atual = '';
    let entreAspas = false;
    for (let i = 0; i < linha.length; i++) {
        const c = linha[i];
        if (c === '"' && entreAspas && linha[i + 1] === '"') { atual += '"'; i++; } else if (c === '"') { entreAspas = !entreAspas; } else if (c === ';' && !entreAspas) { campos.push(atual); atual = ''; } else { atual += c; }
    }
    campos.push(atual);
    return campos;
}

function salvar(caminho, conteudo) {
    fs.mkdirSync(path.dirname(caminho), { recursive: true });
    fs.writeFileSync(caminho, conteudo, 'utf8');
}

async function buscarJson(url) {
    const resposta = await fetch(url, { headers: { 'User-Agent': 'superpreco-analise' } });
    if (!resposta.ok) throw new Error(`${resposta.status} em ${url}`);
    return resposta.json();
}

// Execucoes da coleta no GitHub Actions (API publica do GitHub, sem token).
async function analisarColetasNoGitHub() {
    try {
        const { workflow_runs: execucoes } = await buscarJson(`https://api.github.com/repos/${REPOSITORIO}/actions/workflows/coleta.yml/runs?per_page=30`);
        const concluidas = execucoes.filter(execucao => execucao.status === 'completed' && execucao.conclusion !== 'cancelled');
        const duracoes = {};
        let jobs = 0;
        let jobsComSucesso = 0;

        for (const execucao of concluidas) {
            const { jobs: lista } = await buscarJson(`https://api.github.com/repos/${REPOSITORIO}/actions/runs/${execucao.id}/jobs`);
            for (const job of lista) {
                if (job.conclusion === 'skipped') continue;
                const mercado = job.name.replace(/^Coleta\s+/, '').trim();
                if (!SUPERMARKETS[mercado]) continue;
                jobs++;
                if (job.conclusion === 'success') {
                    jobsComSucesso++;
                    duracoes[mercado] ||= [];
                    duracoes[mercado].push((new Date(job.completed_at) - new Date(job.started_at)) / 60000);
                }
            }
        }

        return {
            execucoes: concluidas.length,
            agendadas: concluidas.filter(execucao => execucao.event === 'schedule').length,
            jobs,
            jobsComSucesso,
            taxaDeSucesso: jobs ? arredondar((jobsComSucesso / jobs) * 100, 1) : null,
            duracaoMedianaMinutos: Object.fromEntries(Object.entries(duracoes).map(([mercado, lista]) => [mercado, arredondar(mediana(lista), 1)]))
        };
    } catch (error) {
        console.warn(`Aviso: nao foi possivel ler as coletas do GitHub Actions (${error.message}).`);
        return null;
    }
}

// Tempo de resposta da API publicada (requisito nao funcional): mediana e percentil 90.
async function medirApi(base) {
    const tempo = async (caminho, opcoes) => {
        const inicio = performance.now();
        const resposta = await fetch(`${base}${caminho}`, opcoes);
        await resposta.arrayBuffer();
        if (!resposta.ok) throw new Error(`${resposta.status} em ${caminho}`);
        return performance.now() - inicio;
    };

    // A API gratuita "dorme" sem uso: a primeira chamada mede o tempo para acordar.
    const acordar = await tempo('/health');
    const { data } = await buscarJson(`${base}/produtos?search=arroz&limit=1`);
    const id = data[0].id;
    const lista = JSON.stringify({ itens: [{ id, quantidade: 2 }] });

    const rotas = [
        ['Busca de produtos', '/produtos?search=feijao%20carioca&limit=40'],
        ['Detalhe do produto', `/produtos/${id}`],
        ['Comparação entre mercados', `/produtos/${id}/comparacao`],
        ['Similares de outras marcas', `/produtos/${id}/similares`],
        ['Histórico de preços', `/produtos/${id}/historico`],
        ['Cotação da lista de compras', '/lista/cotacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: lista }],
        ['Cesta básica', '/cesta-basica'],
        ['Painel de estatísticas', '/estatisticas']
    ];

    const resultados = [];
    for (const [nome, caminho, opcoes] of rotas) {
        await tempo(caminho, opcoes); // aquece cache e conexao
        const tempos = [];
        for (let i = 0; i < 10; i++) tempos.push(await tempo(caminho, opcoes));
        tempos.sort((a, b) => a - b);
        resultados.push({ rota: nome, caminho: caminho.split('?')[0].replace(id, ':id'), medianaMs: Math.round(mediana(tempos)), p90Ms: Math.round(tempos[8]) });
    }
    return { base, primeiraRespostaMs: Math.round(acordar), rotas: resultados, medidoEm: new Date().toISOString() };
}

// Validacao manual da comparacao: sorteia 50 pares "mesmo produto" e grava em
// docs/resultados/validacao/amostra.csv para alguem conferir (coluna mesmo_produto: s ou n).
// O arquivo so e criado se ainda nao existir; quando estiver preenchido, a precisao e calculada.
const ARQUIVO_VALIDACAO = path.join(SAIDA, 'validacao', 'amostra.csv');

function prepararValidacao(grupos) {
    if (!fs.existsSync(ARQUIVO_VALIDACAO)) {
        const amostra = sortearAmostra(grupos);
        salvar(ARQUIVO_VALIDACAO, csv(
            ['n', 'mercado_a', 'produto_a', 'preco_a', 'mercado_b', 'produto_b', 'preco_b', 'mesmo_produto'],
            amostra.map(([a, b], i) => [i + 1, nomeDe(a.supermercado), a.nome, a.preco, nomeDe(b.supermercado), b.nome, b.preco, ''])
        ));
        return { amostra: amostra.length, respondidos: 0, corretos: 0, precisao: null };
    }

    // Le a coluna mesmo_produto pelo cabecalho (pode haver uma coluna de observacao depois dela).
    const [cabecalho, ...linhas] = fs.readFileSync(ARQUIVO_VALIDACAO, 'utf8').trim().split(/\r?\n/);
    const coluna = cabecalho.split(';').indexOf('mesmo_produto');
    const respostas = linhas.map(linha => (lerLinhaCsv(linha)[coluna] || '').trim().toLowerCase()).filter(Boolean);
    const corretos = respostas.filter(resposta => resposta.startsWith('s')).length;
    return {
        amostra: linhas.length,
        respondidos: respostas.length,
        corretos,
        precisao: respostas.length ? arredondar((corretos / respostas.length) * 100, 1) : null
    };
}

// Testes com usuarios (docs/avaliacao): planilhas preenchidas a mao, separador ";".
const AVALIACAO = process.env.ANALISE_AVALIACAO || path.resolve(__dirname, '../../docs/avaliacao');

function lerPlanilha(arquivo) {
    const caminho = path.join(AVALIACAO, arquivo);
    if (!fs.existsSync(caminho)) return [];
    const [cabecalho, ...linhas] = fs.readFileSync(caminho, 'utf8').trim().split(/\r?\n/).map(linha => linha.split(';').map(celula => celula.trim()));
    return linhas.filter(linha => linha.some(Boolean)).map(linha => Object.fromEntries(cabecalho.map((coluna, i) => [coluna, linha[i]])));
}

function lerAvaliacao() {
    const sus = lerPlanilha('sus.csv').map(linha => ({
        participante: linha.participante,
        respostas: Array.from({ length: 10 }, (_, i) => Number.parseInt(linha[`q${i + 1}`], 10))
    }));
    const tempos = lerPlanilha('tempo.csv').map(linha => ({
        participante: linha.participante,
        metodo: String(linha.metodo).toLowerCase().replace(/[^a-z]/g, ''),
        segundos: Number(String(linha.segundos).replace(',', '.')),
        acertou: String(linha.acertou).toLowerCase().startsWith('s')
    }));
    return {
        sus: sus.length ? analisarSus(sus) : null,
        tempos: tempos.length ? analisarTempos(tempos) : null
    };
}

async function main() {
    const indiceApi = process.argv.indexOf('--api');
    const apiBase = indiceApi > -1 ? process.argv[indiceApi + 1] : null;
    const slugs = Object.keys(SUPERMARKETS);

    await connectDB();
    console.log('Carregando produtos...');
    const produtos = await Produto.find({ disponivel: true, supermercado: { $in: slugs } })
        .select('nome nomeNormalizado supermercado categoria alimento preco precoAnterior precoPorUnidade unidadeMedida unidade medida quantidadeBase tokens variantes dataColeta')
        .lean();
    const indisponiveis = await Produto.countDocuments({ disponivel: false, supermercado: { $in: slugs } });
    const stats = montarEstatisticas(produtos.map(produto => produto.tokens));

    // 1. Volume coletado
    const porMercado = slugs.map(slug => {
        const doMercado = produtos.filter(produto => produto.supermercado === slug);
        return {
            slug,
            nome: nomeDe(slug),
            produtos: doMercado.length,
            alimentos: doMercado.filter(produto => produto.alimento !== false).length,
            ofertas: doMercado.filter(produto => produto.precoAnterior).length,
            comPrecoPorUnidade: doMercado.filter(produto => produto.precoPorUnidade).length,
            ultimaColeta: doMercado.reduce((ultima, produto) => (produto.dataColeta > ultima ? produto.dataColeta : ultima), new Date(0))
        };
    });
    const categorias = Object.entries(produtos.reduce((contagem, produto) => {
        contagem[produto.categoria] = (contagem[produto.categoria] || 0) + 1;
        return contagem;
    }, {})).sort((a, b) => b[1] - a[1]);

    // 2. Comparacao entre mercados
    console.log('Calculando equivalentes e similares (pode levar alguns minutos)...');
    const equivalentes = calcularEquivalentes(produtos, stats);
    const cobertura = calcularCobertura(produtos, equivalentes, stats, slugs);
    const grupos = montarGrupos(produtos, equivalentes);
    const precos = analisarPrecos(grupos, slugs);
    const validacao = prepararValidacao(grupos);

    // 3. Cesta basica e lista de exemplo
    console.log('Calculando cesta basica e lista de exemplo...');
    const cesta = await calcularCestaBasica();
    const itensLista = LISTA_EXEMPLO
        .map(termo => ({ termo, produto: escolherProdutoDaLista(termo, produtos, equivalentes, Produto.normalizarNome) }))
        .filter(item => item.produto);
    const cotacao = await cotarLista(itensLista.map(item => ({ id: String(item.produto._id), quantidade: 1, aceitaSimilar: true })));

    // 4. Historico de precos
    const registros = await HistoricoPreco.find({ data: { $gte: INICIO_HISTORICO_CONFIAVEL } }).select('produto supermercado preco data -_id').lean();
    const produtosPorId = new Map(produtos.map(produto => [String(produto._id), produto]));
    const historico = analisarHistorico(registros, produtosPorId);

    // 5. Coletas no GitHub Actions e tempo de resposta da API
    console.log('Lendo as coletas no GitHub Actions...');
    const coletas = await analisarColetasNoGitHub();
    let api = null;
    if (apiBase) {
        console.log(`Medindo o tempo de resposta de ${apiBase}...`);
        api = await medirApi(apiBase.replace(/\/$/, ''));
    }

    await mongoose.disconnect();

    const geradoEm = new Date();
    const avaliacao = lerAvaliacao();
    const dados = { geradoEm, banco: mongoose.connection.name, validacao, avaliacao, porMercado, indisponiveis, categorias, cobertura, precos, cesta, lista: { itens: itensLista.map(item => ({ termo: item.termo, produto: item.produto.nome, supermercado: item.produto.supermercado })), cotacao }, historico, coletas, api };
    escrever(dados);
}

const minutos = segundos => `${String(arredondar(segundos / 60, 1)).replace('.', ',')} min`;

function textoAvaliacao({ sus, tempos }) {
    const partes = [];
    if (tempos) {
        partes.push(`**Tempo da pesquisa de preços.** Tarefa: descobrir em qual mercado uma lista de 10 itens sai mais barata.

- **Participantes:** ${tempos.participantes}, cada um fez a tarefa dos dois jeitos.

${tabela(['Método', 'Tentativas', 'Tempo médio', 'Mediana', 'Acertaram o mercado mais barato'], [
            ['Manual (sites dos mercados)', String(tempos.manual.tentativas), minutos(tempos.manual.mediaSegundos), minutos(tempos.manual.medianaSegundos), `${tempos.manual.acertos} de ${tempos.manual.tentativas}`],
            ['SuperPreço', String(tempos.superpreco.tentativas), minutos(tempos.superpreco.mediaSegundos), minutos(tempos.superpreco.medianaSegundos), `${tempos.superpreco.acertos} de ${tempos.superpreco.tentativas}`]
        ])}

- **Redução média do tempo** com o SuperPreço: ${porcento(tempos.reducaoMediaPercentual)} por participante.`);
    } else {
        partes.push('**Tempo da pesquisa de preços:** ainda não aplicado. Preencha `docs/avaliacao/tempo.csv`.');
    }

    if (sus) {
        partes.push(`**Usabilidade (SUS).**
- **Pontuação média:** ${String(sus.media).replace('.', ',')}${sus.desvioPadrao !== null ? ` (desvio padrão ${String(sus.desvioPadrao).replace('.', ',')})` : ''}, de 0 a 100, com ${sus.participantes} participantes.
- **Faixa:** de ${String(sus.minimo).replace(".", ",")} a ${String(sus.maximo).replace(".", ",")}.
- **Acima da média de referência (68):** ${sus.acimaDaMedia68} de ${sus.participantes} participantes.`);
    } else {
        partes.push('**Usabilidade (SUS):** ainda não aplicado. Preencha `docs/avaliacao/sus.csv`.');
    }
    return partes.join('\n\n');
}

// So da para comparar o total da cesta entre mercados que tem todos os itens.
function textoCesta(cesta) {
    const incompletos = cesta.porMercado.filter(m => m.itensEncontrados < m.itensTotal);
    const linhas = [];
    if (cesta.maisBarato) {
        const completos = cesta.porMercado.filter(m => m.itensEncontrados === m.itensTotal).sort((a, b) => a.total - b.total);
        const maisCaro = completos[completos.length - 1];
        linhas.push(`- **Mais barato com a cesta completa:** ${nomeDe(cesta.maisBarato.supermercado)}, com ${reais(cesta.maisBarato.total)}.`);
        if (maisCaro && maisCaro.supermercado !== cesta.maisBarato.supermercado) {
            linhas.push(`- **Mais caro:** ${nomeDe(maisCaro.supermercado)}, com ${reais(maisCaro.total)}. A diferença é de ${reais(maisCaro.total - cesta.maisBarato.total)} por mês (${porcento(arredondar(((maisCaro.total - cesta.maisBarato.total) / cesta.maisBarato.total) * 100, 1))}).`);
        }
    }
    for (const m of incompletos) {
        const faltando = m.itens.filter(item => item.custo === null).map(item => item.item).join(', ');
        linhas.push(`- **${nomeDe(m.supermercado)}** não entra na comparação do total: falta ${faltando} no site.`);
    }
    return linhas.join('\n');
}

function textoValidacao(validacao) {
    if (validacao.precisao !== null) {
        return `na conferência manual de ${validacao.respondidos} pares sorteados, ${validacao.corretos} eram de fato o mesmo produto (${porcento(validacao.precisao)})`;
    }
    return `ainda não conferida. Preencha a coluna \`mesmo_produto\` (s/n) de \`validacao/amostra.csv\`, com ${validacao.amostra} pares sorteados, e rode o script de novo`;
}

function escrever(d) {
    const { porMercado, cobertura, precos, cesta, historico, coletas, api } = d;
    const total = porMercado.reduce((soma, mercado) => soma + mercado.produtos, 0);
    const dataTexto = new Date(d.geradoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const graficos = path.join(SAIDA, 'graficos');
    const tabelas = path.join(SAIDA, 'dados');

    // ---------- Graficos ----------
    const figuras = [];
    const figura = (arquivo, legenda, svg) => {
        salvar(path.join(graficos, arquivo), svg);
        figuras.push({ arquivo, legenda });
        return `![${legenda}](graficos/${arquivo})`;
    };

    const fProdutos = figura('produtos-por-mercado.svg', 'Produtos disponíveis por supermercado', graficoDeBarras({
        titulo: 'Produtos disponíveis por supermercado',
        subtitulo: `${numero(total)} preços coletados dos sites, unidades de Poços de Caldas`,
        itens: [...porMercado].sort((a, b) => b.produtos - a.produtos).map(m => ({ rotulo: m.nome, valor: m.produtos, texto: numero(m.produtos) })),
        formatar: numero,
        fonte: FONTE
    }));

    const fCobertura = figura('cobertura-da-comparacao.svg', 'Produtos que podem ser comparados com outro mercado', graficoDeBarras({
        titulo: 'Produtos que podem ser comparados com outro mercado',
        subtitulo: 'Mesmo produto (marca, versão e tamanho) ou similar de outra marca em pelo menos um outro mercado',
        itens: [
            { rotulo: 'Mesmo produto', valor: cobertura.geral.percentualEquivalente, texto: porcento(cobertura.geral.percentualEquivalente) },
            { rotulo: 'Mesmo produto ou similar', valor: cobertura.geral.percentualEquivalenteOuSimilar, texto: porcento(cobertura.geral.percentualEquivalenteOuSimilar), destaque: true },
            { rotulo: 'Nos 4 mercados (c/ similar)', valor: cobertura.geral.percentualEmTodos, texto: porcento(cobertura.geral.percentualEmTodos) }
        ],
        formatar: valor => `${valor}%`,
        fonte: FONTE
    }));

    const fMaisBarato = figura('mais-barato-por-mercado.svg', 'Quantas vezes cada mercado tem o menor preço do mesmo produto', graficoDeBarras({
        titulo: 'Quando o mesmo produto está em vários mercados, quem cobra menos?',
        subtitulo: 'Percentual das comparações em que o mercado tem o menor preço (empates divididos)',
        itens: [...precos.maisBarato].sort((a, b) => b.percentualDasPresencas - a.percentualDasPresencas)
            .map(m => ({ rotulo: nomeDe(m.supermercado), valor: m.percentualDasPresencas, texto: `${porcento(m.percentualDasPresencas)} de ${numero(m.presencas)}` })),
        formatar: valor => `${valor}%`,
        fonte: FONTE
    }));

    const fDiferenca = figura('diferenca-de-preco.svg', 'Diferença de preço do mesmo produto entre os mercados', graficoDeBarras({
        titulo: 'Diferença entre o maior e o menor preço do mesmo produto',
        subtitulo: `${numero(precos.grupos)} produtos encontrados em mais de um mercado`,
        itens: precos.faixas.map(faixa => ({ rotulo: faixa.rotulo, valor: faixa.grupos, texto: `${numero(faixa.grupos)} (${porcento(arredondar((faixa.grupos / precos.grupos) * 100, 1))})` })),
        formatar: numero,
        fonte: FONTE
    }));

    const cestaCompleta = cesta.porMercado.filter(m => m.itensEncontrados > 0);
    const fCesta = figura('cesta-basica.svg', 'Custo da cesta básica (DIEESE) em cada mercado', graficoDeBarras({
        titulo: 'Cesta básica (DIEESE) em cada supermercado',
        subtitulo: 'Menor preço por kg/L de cada item, nas quantidades do DIEESE; entre parênteses, quando faltam itens',
        itens: [...cestaCompleta].sort((a, b) => a.total - b.total).map(m => ({
            rotulo: nomeDe(m.supermercado),
            valor: m.total,
            texto: `${reais(m.total)}${m.itensEncontrados < m.itensTotal ? ` (${m.itensEncontrados} de ${m.itensTotal} itens)` : ''}`
        })),
        formatar: valor => `R$ ${valor}`,
        fonte: FONTE
    }));

    const fLista = figura('lista-de-compras.svg', 'Total de uma lista de compras de exemplo em cada mercado', graficoDeBarras({
        titulo: `Lista de compras de exemplo (${d.lista.itens.length} itens básicos)`,
        subtitulo: 'Com troca por similar quando o mercado não tem o item; última barra: comprando cada item onde é mais barato',
        itens: [
            ...[...d.lista.cotacao.porMercado].sort((a, b) => a.total - b.total).map(m => ({ rotulo: nomeDe(m.supermercado), valor: m.total, texto: `${reais(m.total)}${m.faltando.length ? ` (faltam ${m.faltando.length})` : ''}` })),
            ...(d.lista.cotacao.compraDividida ? [{ rotulo: 'Compra dividida', valor: d.lista.cotacao.compraDividida.total, texto: reais(d.lista.cotacao.compraDividida.total), destaque: true }] : [])
        ],
        formatar: valor => `R$ ${valor}`,
        fonte: FONTE
    }));

    const fColeta = coletas && Object.keys(coletas.duracaoMedianaMinutos).length ? figura('tempo-de-coleta.svg', 'Tempo da coleta de cada mercado no GitHub Actions', graficoDeBarras({
        titulo: 'Tempo de coleta por supermercado (GitHub Actions)',
        subtitulo: 'Mediana das coletas concluídas; os quatro mercados rodam em paralelo',
        itens: Object.entries(coletas.duracaoMedianaMinutos).sort((a, b) => b[1] - a[1]).map(([slug, minutos]) => ({ rotulo: nomeDe(slug), valor: minutos, texto: `${String(minutos).replace('.', ',')} min` })),
        formatar: valor => `${valor} min`,
        fonte: 'Fonte: execuções do GitHub Actions do projeto'
    })) : null;

    const fApi = api ? figura('tempo-de-resposta-da-api.svg', 'Tempo de resposta da API publicada', graficoDeBarras({
        titulo: 'Tempo de resposta da API publicada (mediana de 10 requisições)',
        subtitulo: 'Medido do Brasil até o servidor gratuito do Render, com a API já acordada',
        itens: [...api.rotas].sort((a, b) => b.medianaMs - a.medianaMs).map(r => ({ rotulo: r.rota, valor: r.medianaMs, texto: `${numero(r.medianaMs)} ms` })),
        formatar: valor => `${numero(valor)} ms`,
        fonte: `Fonte: medição em ${dataTexto}`
    })) : null;

    // ---------- Tabelas em CSV ----------
    salvar(path.join(tabelas, 'mercados.csv'), csv(['supermercado', 'produtos', 'alimentos', 'ofertas', 'com_preco_por_unidade', 'ultima_coleta'],
        porMercado.map(m => [m.nome, m.produtos, m.alimentos, m.ofertas, m.comPrecoPorUnidade, new Date(m.ultimaColeta).toISOString()])));
    salvar(path.join(tabelas, 'cobertura.csv'), csv(['supermercado', 'produtos', 'com_mesmo_produto_%', 'com_mesmo_ou_similar_%', 'nos_4_mercados_%'],
        [...Object.entries(cobertura.porMercado).map(([slug, c]) => [nomeDe(slug), c.total, c.percentualEquivalente, c.percentualEquivalenteOuSimilar, c.percentualEmTodos]),
            ['Geral', cobertura.geral.total, cobertura.geral.percentualEquivalente, cobertura.geral.percentualEquivalenteOuSimilar, cobertura.geral.percentualEmTodos]]));
    salvar(path.join(tabelas, 'comparacao-entre-pares.csv'), csv(['mercado_a', 'mercado_b', 'produtos_em_comum', 'a_mais_barato_%', 'b_mais_barato_%', 'empate_%', 'diferenca_mediana_%_b_sobre_a'],
        precos.pares.map(p => [nomeDe(p.a), nomeDe(p.b), p.produtosEmComum, p.aMaisBaratoPercentual, p.bMaisBaratoPercentual, p.empatesPercentual, p.diferencaMedianaPercentual])));
    salvar(path.join(tabelas, 'mais-barato-por-categoria.csv'), csv(['categoria', 'produtos_comparados', 'mercado_mais_barato_mais_vezes', '%_das_vezes'],
        precos.porCategoria.map(c => [c.categoria, c.grupos, nomeDe(c.maisBaratoMaisVezes), c.percentual])));
    salvar(path.join(tabelas, 'cesta-basica.csv'), csv(['supermercado', 'item', 'produto', 'custo'],
        cesta.porMercado.flatMap(m => m.itens.map(item => [nomeDe(m.supermercado), item.item, item.produto || '', item.custo ?? '']))));
    salvar(path.join(tabelas, 'lista-de-exemplo.csv'), csv(['termo', 'produto_escolhido', 'mercado_de_origem'],
        d.lista.itens.map(item => [item.termo, item.produto, nomeDe(item.supermercado)])));
    salvar(path.join(tabelas, 'variacoes-por-dia.csv'), csv(['data', 'altas', 'quedas'], historico.porDia.map(dia => [dia.data, dia.altas, dia.quedas])));
    if (api) salvar(path.join(tabelas, 'tempo-de-resposta-api.csv'), csv(['rota', 'caminho', 'mediana_ms', 'p90_ms'], api.rotas.map(r => [r.rota, r.caminho, r.medianaMs, r.p90Ms])));
    salvar(path.join(SAIDA, 'dados.json'), JSON.stringify(d, null, 2));

    // ---------- Relatorio ----------
    const pares = precos.pares.map(p => [`${nomeDe(p.a)} × ${nomeDe(p.b)}`, numero(p.produtosEmComum), porcento(p.aMaisBaratoPercentual), porcento(p.bMaisBaratoPercentual), porcento(p.empatesPercentual)]);
    const melhorLista = d.lista.cotacao.melhorMercado;
    const dividida = d.lista.cotacao.compraDividida;
    const piorLista = [...d.lista.cotacao.porMercado].filter(m => m.faltando.length === 0).sort((a, b) => b.total - a.total)[0];

    const md = `# Resultados: análise dos dados coletados

Relatório gerado por \`npm --prefix backend run analise\` em **${dataTexto}**, a partir do banco \`${d.banco}\`.
Figuras em \`graficos/\` (SVG), tabelas em \`dados/\` (CSV, separador \`;\`) e todos os números em \`dados.json\`.

> Os números mudam a cada coleta. Rode o script de novo perto da entrega para atualizar o capítulo.

## 1. Dados coletados

${tabela(['Supermercado', 'Produtos', 'Alimentos', 'Em oferta', 'Com preço por kg/L/un', 'Última coleta'],
        porMercado.map(m => [m.nome, numero(m.produtos), numero(m.alimentos), numero(m.ofertas), numero(m.comPrecoPorUnidade), new Date(m.ultimaColeta).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })]))}

- **Total:** ${numero(total)} produtos disponíveis e ${numero(d.indisponiveis)} indisponíveis (saíram do site).
- **Departamentos:** ${d.categorias.length} categorias padronizadas. As maiores são ${d.categorias.slice(0, 3).map(([nome, n]) => `${nome} (${numero(n)})`).join(', ')}.

${fProdutos}
${coletas ? `
**Atualização periódica (GitHub Actions).**
- **Execuções:** ${coletas.execucoes} coletas concluídas, ${coletas.agendadas} delas agendadas (6h e 18h).
- **Mercados coletados:** ${coletas.jobsComSucesso} de ${coletas.jobs} terminaram com sucesso (${porcento(coletas.taxaDeSucesso)}).
- **Tempo:** cada mercado roda em paralelo, então a coleta completa leva o tempo do mais lento, cerca de ${String(Math.max(...Object.values(coletas.duracaoMedianaMinutos))).replace('.', ',')} min.

${fColeta || ''}
` : ''}
## 2. Comparação entre mercados

${tabela(['Supermercado', 'Produtos', 'Mesmo produto em outro mercado', 'Mesmo ou similar', 'Comparável nos 4 mercados'],
        [...Object.entries(cobertura.porMercado).map(([slug, c]) => [nomeDe(slug), numero(c.total), porcento(c.percentualEquivalente), porcento(c.percentualEquivalenteOuSimilar), porcento(c.percentualEmTodos)]),
            ['**Geral**', `**${numero(cobertura.geral.total)}**`, `**${porcento(cobertura.geral.percentualEquivalente)}**`, `**${porcento(cobertura.geral.percentualEquivalenteOuSimilar)}**`, `**${porcento(cobertura.geral.percentualEmTodos)}**`]])}

- **Mesmo produto:** só ${porcento(cobertura.geral.percentualEquivalente)} dos produtos aparecem em pelo menos um outro mercado com a mesma marca, versão e tamanho.
- **Com similares:** contando produtos parecidos de outra marca, ${porcento(cobertura.geral.percentualEquivalenteOuSimilar)} passam a ter com o que comparar. Os similares têm o mesmo tipo e departamento e tamanho até 25% diferente, comparados por kg/L/un.
- **Por que isso importa:** a diferença justifica a funcionalidade de similares e de substitutos na lista de compras.

${fCobertura}

### Diferença de preço do mesmo produto

- **Produtos comparados:** ${numero(precos.grupos)} produtos estão em mais de um mercado.
- **Diferença entre o maior e o menor preço:** em média ${porcento(precos.diferencaMediaPercentual)} (mediana ${porcento(precos.diferencaMedianaPercentual)}), ou ${reais(precos.diferencaMediaReais)} por produto.
- **Acima de 20%:** em ${numero(precos.gruposComDiferencaAcimaDe20)} produtos (${porcento(arredondar((precos.gruposComDiferencaAcimaDe20 / precos.grupos) * 100, 1))}).
- **Mesmo preço em todos:** só ${numero(precos.gruposMesmoPreco)} produtos.
- **Metade dos produtos:** diferença de até ${porcento(precos.diferencaMedianaPercentual)}; três quartos, até ${porcento(precos.diferencaP75Percentual)}.
- **Casos anormais:** ${numero(precos.gruposAnormais)} produtos com o maior preço acima do triplo do menor ficaram fora das contas. Quase sempre são erro de identificação ou de cadastro no site (ex.: ${precos.exemplosAnormais[0] || '—'}).
- **Precisão da comparação:** ${textoValidacao(d.validacao)}.

${fDiferenca}

${fMaisBarato}

**Comparação de dois em dois mercados** (produtos vendidos nos dois):

${tabela(['Mercados (A × B)', 'Produtos em comum', 'A mais barato', 'B mais barato', 'Mesmo preço'], pares)}

**Mercado com o menor preço mais vezes, por categoria:**

${tabela(['Categoria', 'Produtos comparados', 'Mais barato mais vezes', '% das vezes'],
        precos.porCategoria.map(c => [c.categoria, numero(c.grupos), nomeDe(c.maisBaratoMaisVezes), porcento(c.percentual)]))}

## 3. Cesta básica e lista de compras

${tabela(['Supermercado', 'Cesta básica', 'Itens encontrados'],
        [...cesta.porMercado].sort((a, b) => a.total - b.total).map(m => [nomeDe(m.supermercado), reais(m.total), `${m.itensEncontrados} de ${m.itensTotal}`]))}

${textoCesta(cesta)}

${fCesta}

**Lista de exemplo** com ${d.lista.itens.length} itens básicos, um de cada. Para cada item foi escolhido o produto vendido no maior número de mercados:

${tabela(['Item procurado', 'Produto', 'Mercado'], d.lista.itens.map(item => [item.termo, item.produto, nomeDe(item.supermercado)]))}

${tabela(['Supermercado', 'Total', 'Só itens iguais', 'Trocas por similar', 'Itens faltando'],
        [...d.lista.cotacao.porMercado].sort((a, b) => a.total - b.total).map(m => [nomeDe(m.supermercado), reais(m.total), reais(m.totalIguais), String(m.substituicoes.length), String(m.faltando.length)]))}

- **Melhor mercado:** ${melhorLista ? `${nomeDe(melhorLista.supermercado)}, com ${reais(melhorLista.total)}` : '—'}.
- **Mais caro com a lista completa:** ${piorLista ? `${nomeDe(piorLista.supermercado)}, com ${reais(piorLista.total)}. A diferença é de ${reais(piorLista.total - (melhorLista?.total || 0))} (${porcento(arredondar(((piorLista.total - melhorLista.total) / melhorLista.total) * 100, 1))})` : '—'}.
- **Compra dividida** (cada item no mercado onde é mais barato): ${dividida ? `${reais(dividida.total)}, ${reais(dividida.economiaSobreMelhorMercado)} a menos que o melhor mercado` : '—'}.

${fLista}

## 4. Variação de preços no período

A variação é medida só a partir de ${INICIO_HISTORICO_CONFIAVEL.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Antes disso, o histórico mistura mudanças reais com efeitos das correções feitas na coleta, como a troca do preço por kg pelo preço da embalagem, que apareceriam como altas e quedas que não aconteceram.

- **Período:** ${historico.primeiraData || '—'} a ${historico.ultimaData || '—'}.
- **Registros:** ${numero(historico.registros)} registros de preço de ${numero(historico.produtosAcompanhados)} produtos.
- **Mudanças de preço:** ${numero(historico.mudancas)} (${numero(historico.altas)} altas e ${numero(historico.quedas)} quedas), em ${numero(historico.produtosQueMudaram)} produtos.
- **Tamanho típico da mudança:** alta mediana de ${porcento(historico.variacaoMedianaAltas)} e queda mediana de ${porcento(historico.variacaoMedianaQuedas)}.

${historico.mudancas ? `**Maiores altas:**

${tabela(['Produto', 'Mercado', 'Data', 'De', 'Para', 'Variação'], historico.maioresAltas.map(m => [m.produto, nomeDe(m.supermercado), m.data, reais(m.anterior), reais(m.atual), porcento(m.percentual)]))}

**Maiores quedas:**

${tabela(['Produto', 'Mercado', 'Data', 'De', 'Para', 'Variação'], historico.maioresQuedas.map(m => [m.produto, nomeDe(m.supermercado), m.data, reais(m.anterior), reais(m.atual), porcento(m.percentual)]))}` : '_Ainda não há mudanças suficientes no histórico; rode de novo depois de algumas semanas de coleta._'}
${api ? `
## 5. Tempo de resposta da API

Medido em ${dataTexto}, contra \`${api.base}\`.
- **Primeira resposta:** ${numero(api.primeiraRespostaMs)} ms. Inclui acordar o servidor gratuito se ele estava parado.
- **Demais respostas:** mediana e percentil 90 de 10 requisições por rota.

${tabela(['Rota', 'Caminho', 'Mediana', 'Percentil 90'], api.rotas.map(r => [r.rota, `\`${r.caminho}\``, `${numero(r.medianaMs)} ms`, `${numero(r.p90Ms)} ms`]))}

${fApi}
` : ''}
## 6. Avaliação com usuários

Roteiro e planilhas em \`docs/avaliacao/\`. A conferência dos requisitos do TCC também está lá.

${textoAvaliacao(d.avaliacao)}

## Figuras

${figuras.map((f, i) => `${i + 1}. \`graficos/${f.arquivo}\`: ${f.legenda}`).join('\n')}
`;

    salvar(path.join(SAIDA, 'README.md'), md);
    console.log(`Relatorio salvo em ${path.join(SAIDA, 'README.md')}`);
}

main().catch(async error => {
    console.error('Erro na analise:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
