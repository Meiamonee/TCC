// Calculos da analise de dados do TCC (capitulo de resultados). Funcoes puras: recebem os
// produtos ja carregados do banco e usam as mesmas regras de comparacao do site
// (services/comparacao.js), sem consultar o banco produto a produto.
const {
    LIMITE_SIMILARIDADE,
    escolherEquivalentes,
    palavrasChave,
    palavrasDeTipo,
    precoComparavel,
    saoEquivalentes,
    saoSimilares
} = require('../services/comparacao');

const arredondar = (valor, casas = 2) => Math.round(valor * 10 ** casas) / 10 ** casas;

function mediana(valores) {
    if (valores.length === 0) return null;
    const ordenados = [...valores].sort((a, b) => a - b);
    const meio = Math.floor(ordenados.length / 2);
    return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

function media(valores) {
    return valores.length ? valores.reduce((soma, valor) => soma + valor, 0) / valores.length : null;
}

function indexarPorToken(produtos) {
    const indice = new Map();
    for (const produto of produtos) {
        for (const token of new Set(produto.tokens || [])) {
            if (!indice.has(token)) indice.set(token, []);
            indice.get(token).push(produto);
        }
    }
    return indice;
}

// Para cada produto, o equivalente (mesmo produto: marca, versao e tamanho) em cada um dos
// outros mercados, com a mesma regra de GET /api/produtos/:id/comparacao.
function calcularEquivalentes(produtos, stats) {
    const indice = indexarPorToken(produtos);
    const resultado = new Map();

    for (const produto of produtos) {
        if (!produto.tokens || produto.tokens.length === 0) {
            resultado.set(String(produto._id), []);
            continue;
        }
        const variantes = (produto.variantes || []).join('|');
        const candidatos = new Map();
        for (const chave of palavrasChave(produto, stats)) {
            for (const candidato of indice.get(chave) || []) {
                if (candidato.supermercado !== produto.supermercado && (candidato.variantes || []).join('|') === variantes) {
                    candidatos.set(String(candidato._id), candidato);
                }
            }
        }
        resultado.set(String(produto._id), escolherEquivalentes(produto, [...candidatos.values()], stats));
    }

    return resultado;
}

// Mercados (alem do proprio) onde ha um produto similar de outra marca, com a mesma regra de
// GET /api/produtos/:id/similares: mesmo tipo e departamento, tamanho ate 25% diferente.
function mercadosComSimilar(produto, indice, stats) {
    const tipo = palavrasDeTipo(produto, stats);
    if (tipo.length === 0) return new Set();
    const mercados = new Set();
    for (const candidato of indice.get(tipo[0]) || []) {
        if (candidato.supermercado === produto.supermercado || mercados.has(candidato.supermercado)) continue;
        if (saoSimilares(produto, candidato, stats) && saoEquivalentes(produto, candidato, stats) < LIMITE_SIMILARIDADE) {
            mercados.add(candidato.supermercado);
        }
    }
    return mercados;
}

// Cobertura da comparacao: em quantos outros mercados cada produto pode ser comparado
// (mesmo produto) e em quantos pode ser comparado ou substituido por um similar.
function calcularCobertura(produtos, equivalentes, stats, slugs) {
    const indice = indexarPorToken(produtos);
    const porMercado = Object.fromEntries(slugs.map(slug => [slug, { total: 0, comEquivalente: 0, comEquivalenteOuSimilar: 0, emTodosComSubstituto: 0 }]));
    const geral = { total: 0, comEquivalente: 0, comEquivalenteOuSimilar: 0, emTodosComSubstituto: 0 };

    for (const produto of produtos) {
        const linha = porMercado[produto.supermercado];
        if (!linha) continue;
        const comEquivalente = new Set(equivalentes.get(String(produto._id)).map(item => item.produto.supermercado));
        const comAlgum = new Set([...comEquivalente, ...mercadosComSimilar(produto, indice, stats)]);
        const outros = slugs.length - 1;

        for (const alvo of [linha, geral]) {
            alvo.total++;
            if (comEquivalente.size > 0) alvo.comEquivalente++;
            if (comAlgum.size > 0) alvo.comEquivalenteOuSimilar++;
            if (comAlgum.size === outros) alvo.emTodosComSubstituto++;
        }
    }

    const percentuais = linha => ({
        ...linha,
        percentualEquivalente: linha.total ? arredondar((linha.comEquivalente / linha.total) * 100, 1) : 0,
        percentualEquivalenteOuSimilar: linha.total ? arredondar((linha.comEquivalenteOuSimilar / linha.total) * 100, 1) : 0,
        percentualEmTodos: linha.total ? arredondar((linha.emTodosComSubstituto / linha.total) * 100, 1) : 0
    });

    return {
        geral: percentuais(geral),
        porMercado: Object.fromEntries(Object.entries(porMercado).map(([slug, linha]) => [slug, percentuais(linha)]))
    };
}

// Grupos de comparacao: um produto e seus equivalentes nos outros mercados (cada grupo contado
// uma vez). Usados para medir a diferenca de preco do MESMO produto entre os mercados.
function montarGrupos(produtos, equivalentes) {
    const grupos = new Map();
    for (const produto of produtos) {
        const itens = [produto, ...equivalentes.get(String(produto._id)).map(item => item.produto)];
        if (itens.length < 2) continue;
        const chave = itens.map(item => String(item._id)).sort().join('|');
        if (!grupos.has(chave)) grupos.set(chave, itens);
    }
    return [...grupos.values()];
}

// Diferenca acima disso (o maior preco mais que o triplo do menor) quase sempre e erro de
// identificacao ou de cadastro no site (ex.: fardo anunciado como lata); fica fora das medias.
const DIFERENCA_ANORMAL_PERCENTUAL = 200;

function percentil(valores, p) {
    if (valores.length === 0) return null;
    const ordenados = [...valores].sort((a, b) => a - b);
    return ordenados[Math.min(ordenados.length - 1, Math.floor((p / 100) * ordenados.length))];
}

function analisarPrecos(todosOsGrupos, slugs) {
    // Compara pelo preco por kg/L/un quando ha (mesmo criterio do site para o "mais barato").
    const diferencaDe = itens => {
        const precos = itens.map(precoComparavel);
        return ((Math.max(...precos) - Math.min(...precos)) / Math.min(...precos)) * 100;
    };
    const anormais = todosOsGrupos.filter(itens => diferencaDe(itens) > DIFERENCA_ANORMAL_PERCENTUAL);
    const grupos = todosOsGrupos.filter(itens => diferencaDe(itens) <= DIFERENCA_ANORMAL_PERCENTUAL);
    const diferencas = [];
    const vezesMaisBarato = Object.fromEntries(slugs.map(slug => [slug, 0]));
    const presencas = Object.fromEntries(slugs.map(slug => [slug, 0]));
    const pares = {};
    const porCategoria = {};

    for (const itens of grupos) {
        const precos = itens.map(precoComparavel);
        const menor = Math.min(...precos);
        const maior = Math.max(...precos);
        const embalagens = itens.map(item => item.preco);
        diferencas.push({ percentual: ((maior - menor) / menor) * 100, reais: Math.max(...embalagens) - Math.min(...embalagens) });

        // Empates dividem a vitoria.
        const maisBaratos = itens.filter(item => precoComparavel(item) === menor);
        for (const item of itens) presencas[item.supermercado]++;
        for (const item of maisBaratos) vezesMaisBarato[item.supermercado] += 1 / maisBaratos.length;

        const categoria = itens[0].categoria;
        porCategoria[categoria] ||= { grupos: 0, vitorias: Object.fromEntries(slugs.map(slug => [slug, 0])) };
        porCategoria[categoria].grupos++;
        for (const item of maisBaratos) porCategoria[categoria].vitorias[item.supermercado] += 1 / maisBaratos.length;

        // Comparacao de dois em dois mercados.
        for (let i = 0; i < itens.length; i++) {
            for (let j = i + 1; j < itens.length; j++) {
                const [a, b] = [itens[i], itens[j]].sort((x, y) => x.supermercado.localeCompare(y.supermercado));
                const chave = `${a.supermercado}|${b.supermercado}`;
                pares[chave] ||= { total: 0, aMaisBarato: 0, bMaisBarato: 0, empates: 0, diferencasPercentuais: [] };
                const par = pares[chave];
                par.total++;
                const [pa, pb] = [precoComparavel(a), precoComparavel(b)];
                if (pa < pb) par.aMaisBarato++;
                else if (pb < pa) par.bMaisBarato++;
                else par.empates++;
                par.diferencasPercentuais.push(((pb - pa) / Math.min(pa, pb)) * 100);
            }
        }
    }

    const percentuais = diferencas.map(item => item.percentual);
    return {
        grupos: grupos.length,
        gruposAnormais: anormais.length,
        exemplosAnormais: anormais.slice(0, 5).map(itens => itens.map(item => `${item.nome} (${item.supermercado}, R$ ${item.preco})`).join(' × ')),
        diferencaP75Percentual: arredondar(percentil(diferencas.map(item => item.percentual), 75) ?? 0, 1),
        diferencaMediaPercentual: arredondar(media(percentuais) ?? 0, 1),
        diferencaMedianaPercentual: arredondar(mediana(percentuais) ?? 0, 1),
        diferencaMediaReais: arredondar(media(diferencas.map(item => item.reais)) ?? 0),
        gruposComDiferencaAcimaDe20: diferencas.filter(item => item.percentual > 20).length,
        gruposMesmoPreco: diferencas.filter(item => item.percentual === 0).length,
        faixas: [
            ['Mesmo preço', item => item === 0],
            ['Até 10%', item => item > 0 && item <= 10],
            ['10% a 20%', item => item > 10 && item <= 20],
            ['20% a 50%', item => item > 20 && item <= 50],
            ['Mais de 50%', item => item > 50]
        ].map(([rotulo, teste]) => ({ rotulo, grupos: percentuais.filter(teste).length })),
        maisBarato: slugs.map(slug => ({
            supermercado: slug,
            presencas: presencas[slug],
            vezesMaisBarato: arredondar(vezesMaisBarato[slug], 1),
            percentualDasPresencas: presencas[slug] ? arredondar((vezesMaisBarato[slug] / presencas[slug]) * 100, 1) : 0
        })),
        pares: Object.entries(pares).map(([chave, par]) => {
            const [a, b] = chave.split('|');
            return {
                a, b,
                produtosEmComum: par.total,
                aMaisBaratoPercentual: arredondar((par.aMaisBarato / par.total) * 100, 1),
                bMaisBaratoPercentual: arredondar((par.bMaisBarato / par.total) * 100, 1),
                empatesPercentual: arredondar((par.empates / par.total) * 100, 1),
                // Positivo: em media, b e mais caro que a.
                diferencaMedianaPercentual: arredondar(mediana(par.diferencasPercentuais) ?? 0, 1)
            };
        }).sort((x, y) => y.produtosEmComum - x.produtosEmComum),
        porCategoria: Object.entries(porCategoria)
            .map(([categoria, dados]) => {
                const [vencedor, vitorias] = Object.entries(dados.vitorias).sort((x, y) => y[1] - x[1])[0];
                return { categoria, grupos: dados.grupos, maisBaratoMaisVezes: vencedor, percentual: arredondar((vitorias / dados.grupos) * 100, 1) };
            })
            .sort((x, y) => y.grupos - x.grupos)
    };
}

// Sorteia pares "mesmo produto" para conferencia manual (precisao da comparacao). A semente
// fixa faz o sorteio sair igual a cada execucao com os mesmos dados.
function sortearAmostra(grupos, quantidade = 50, semente = 2026) {
    let estado = semente;
    const aleatorio = () => {
        estado = (estado * 1103515245 + 12345) % 2147483648;
        return estado / 2147483648;
    };
    const pares = [];
    for (const itens of grupos) {
        for (let i = 1; i < itens.length; i++) pares.push([itens[0], itens[i]]);
    }
    const ordenados = [...pares].sort((x, y) => String(x[0]._id + x[1]._id).localeCompare(String(y[0]._id + y[1]._id)));
    const amostra = [];
    while (amostra.length < Math.min(quantidade, ordenados.length)) {
        amostra.push(ordenados.splice(Math.floor(aleatorio() * ordenados.length), 1)[0]);
    }
    return amostra;
}

// Escolhe, para cada termo da lista de exemplo, o produto que aparece no maior numero de
// mercados (o mais comparavel) e, entre esses, o de menor preco por kg/L/un.
function escolherProdutoDaLista(termo, produtos, equivalentes, normalizar) {
    const palavras = normalizar(termo).split(' ').filter(Boolean);
    const candidatos = produtos.filter(produto => palavras.every(palavra => produto.nomeNormalizado.includes(palavra)));
    if (candidatos.length === 0) return null;
    return candidatos
        .map(produto => ({ produto, mercados: equivalentes.get(String(produto._id)).length + 1 }))
        .sort((a, b) => b.mercados - a.mercados || precoComparavel(a.produto) - precoComparavel(b.produto))[0].produto;
}

// Variacao de precos no historico: mudancas por dia e por mercado, altas e quedas.
function analisarHistorico(registros, produtosPorId) {
    const porProduto = new Map();
    for (const registro of registros) {
        const id = String(registro.produto);
        if (!porProduto.has(id)) porProduto.set(id, []);
        porProduto.get(id).push(registro);
    }

    const mudancas = [];
    for (const [id, pontos] of porProduto) {
        pontos.sort((a, b) => new Date(a.data) - new Date(b.data));
        for (let i = 1; i < pontos.length; i++) {
            const anterior = pontos[i - 1].preco;
            const atual = pontos[i].preco;
            if (anterior > 0 && atual !== anterior) {
                const produto = produtosPorId.get(id);
                mudancas.push({
                    produto: produto?.nome || id,
                    supermercado: pontos[i].supermercado,
                    data: new Date(pontos[i].data).toISOString().slice(0, 10),
                    anterior,
                    atual,
                    percentual: arredondar(((atual - anterior) / anterior) * 100, 1)
                });
            }
        }
    }

    const porDia = {};
    for (const mudanca of mudancas) {
        porDia[mudanca.data] ||= { altas: 0, quedas: 0 };
        porDia[mudanca.data][mudanca.percentual > 0 ? 'altas' : 'quedas']++;
    }

    const datas = registros.map(registro => new Date(registro.data).getTime());
    return {
        registros: registros.length,
        produtosAcompanhados: porProduto.size,
        produtosQueMudaram: new Set(mudancas.map(mudanca => mudanca.produto + mudanca.supermercado)).size,
        mudancas: mudancas.length,
        altas: mudancas.filter(mudanca => mudanca.percentual > 0).length,
        quedas: mudancas.filter(mudanca => mudanca.percentual < 0).length,
        variacaoMedianaAltas: arredondar(mediana(mudancas.filter(m => m.percentual > 0).map(m => m.percentual)) ?? 0, 1),
        variacaoMedianaQuedas: arredondar(mediana(mudancas.filter(m => m.percentual < 0).map(m => m.percentual)) ?? 0, 1),
        primeiraData: datas.length ? new Date(Math.min(...datas)).toISOString().slice(0, 10) : null,
        ultimaData: datas.length ? new Date(Math.max(...datas)).toISOString().slice(0, 10) : null,
        porDia: Object.entries(porDia).sort().map(([data, valores]) => ({ data, ...valores })),
        maioresAltas: [...mudancas].sort((a, b) => b.percentual - a.percentual).slice(0, 5),
        maioresQuedas: [...mudancas].sort((a, b) => a.percentual - b.percentual).slice(0, 5)
    };
}

// System Usability Scale (Brooke, 1996): respostas de 1 a 5 nas 10 afirmacoes. Impares contam
// (resposta - 1), pares (5 - resposta); a soma vezes 2,5 vai de 0 a 100.
function pontuacaoSus(respostas) {
    if (respostas.length !== 10 || respostas.some(r => !Number.isInteger(r) || r < 1 || r > 5)) {
        throw new Error('O SUS precisa de 10 respostas entre 1 e 5');
    }
    const soma = respostas.reduce((total, resposta, i) => total + (i % 2 === 0 ? resposta - 1 : 5 - resposta), 0);
    return soma * 2.5;
}

function desvioPadrao(valores) {
    if (valores.length < 2) return null;
    const m = media(valores);
    return Math.sqrt(valores.reduce((soma, valor) => soma + (valor - m) ** 2, 0) / (valores.length - 1));
}

function analisarSus(linhas) {
    const pontuacoes = linhas.map(linha => ({ participante: linha.participante, pontuacao: pontuacaoSus(linha.respostas) }));
    const valores = pontuacoes.map(item => item.pontuacao);
    return {
        participantes: pontuacoes.length,
        media: valores.length ? arredondar(media(valores), 1) : null,
        desvioPadrao: valores.length > 1 ? arredondar(desvioPadrao(valores), 1) : null,
        minimo: valores.length ? Math.min(...valores) : null,
        maximo: valores.length ? Math.max(...valores) : null,
        acimaDaMedia68: valores.filter(valor => valor > 68).length,
        pontuacoes
    };
}

// Teste de tempo: cada participante cota a mesma lista nos sites (manual) e no SuperPreco.
function analisarTempos(linhas) {
    const por = metodo => linhas.filter(linha => linha.metodo === metodo);
    const resumo = lista => ({
        tentativas: lista.length,
        mediaSegundos: lista.length ? arredondar(media(lista.map(l => l.segundos)), 1) : null,
        medianaSegundos: lista.length ? arredondar(mediana(lista.map(l => l.segundos)), 1) : null,
        acertos: lista.filter(l => l.acertou).length
    });
    const manual = resumo(por('manual'));
    const superpreco = resumo(por('superpreco'));

    // Reducao por participante (so quem fez os dois jeitos).
    const reducoes = [...new Set(linhas.map(l => l.participante))].map(participante => {
        const m = linhas.find(l => l.participante === participante && l.metodo === 'manual');
        const s = linhas.find(l => l.participante === participante && l.metodo === 'superpreco');
        return m && s ? ((m.segundos - s.segundos) / m.segundos) * 100 : null;
    }).filter(valor => valor !== null);

    return {
        participantes: reducoes.length,
        manual,
        superpreco,
        reducaoMediaPercentual: reducoes.length ? arredondar(media(reducoes), 1) : null
    };
}

module.exports = {
    analisarHistorico,
    analisarSus,
    analisarTempos,
    pontuacaoSus,
    analisarPrecos,
    arredondar,
    calcularCobertura,
    calcularEquivalentes,
    escolherProdutoDaLista,
    media,
    mediana,
    montarGrupos,
    sortearAmostra
};
