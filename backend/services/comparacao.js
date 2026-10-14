const Produto = require('../models/Produto');

// Comparacao do mesmo produto entre supermercados.
//
// Dois produtos sao considerados equivalentes quando:
// 1. tem as mesmas variantes (zero, integral, sabor...);
// 2. tem a mesma quantidade (tolerancia de 2%) ou sao ambos vendidos a peso;
// 3. as palavras do nome sao parecidas, pesando mais as palavras raras (em geral a marca);
// 4. nao ha, nos dois lados, palavras distintivas que o outro nao tem (marcas diferentes).

const LIMITE_SIMILARIDADE = 0.6;
const TOLERANCIA_QUANTIDADE = 0.02;
// Palavras presentes em menos de 1,1% dos produtos sao tratadas como distintivas.
const FRACAO_PALAVRA_DISTINTIVA = 0.011;
const VALIDADE_ESTATISTICAS_MS = 10 * 60 * 1000;
// Coocorrencias minimas para uma palavra contar como acompanhante de um nucleo.
const MINIMO_COOCORRENCIAS = 3;

let estatisticas = null;

// Estatisticas do catalogo usadas na comparacao, calculadas a partir das palavras de cada produto:
// - frequencia: em quantos produtos cada palavra aparece (pesa as palavras raras, em geral a marca);
// - porNucleo: para cada "nucleo" (primeira palavra do nome, ex.: feijao, cerveja), quantos
//   produtos comecam com ele e com que frequencia cada outra palavra o acompanha;
// - nucleosPorPalavra: com quantos nucleos diferentes uma palavra aparece. Marcas acompanham
//   muitos tipos de produto (Itambe: leite, queijo, manteiga); qualificadores, poucos (carioca).
function montarEstatisticas(listaDeTokens) {
    const frequencia = new Map();
    const porNucleo = new Map();

    for (const tokens of listaDeTokens) {
        const unicos = [...new Set(tokens || [])];
        for (const token of unicos) {
            frequencia.set(token, (frequencia.get(token) || 0) + 1);
        }

        const nucleo = unicos[0];
        if (!nucleo) continue;
        if (!porNucleo.has(nucleo)) porNucleo.set(nucleo, { total: 0, contagem: new Map() });
        const grupo = porNucleo.get(nucleo);
        grupo.total++;
        for (const token of unicos.slice(1)) {
            grupo.contagem.set(token, (grupo.contagem.get(token) || 0) + 1);
        }
    }

    const nucleosPorPalavra = new Map();
    for (const grupo of porNucleo.values()) {
        for (const [token, n] of grupo.contagem) {
            if (n >= MINIMO_COOCORRENCIAS) {
                nucleosPorPalavra.set(token, (nucleosPorPalavra.get(token) || 0) + 1);
            }
        }
    }

    return {
        total: Math.max(listaDeTokens.length, 1),
        frequencia,
        porNucleo,
        nucleosPorPalavra,
        carregadoEm: Date.now()
    };
}

async function carregarEstatisticas({ forcar = false } = {}) {
    if (!forcar && estatisticas && Date.now() - estatisticas.carregadoEm < VALIDADE_ESTATISTICAS_MS) {
        return estatisticas;
    }

    const produtos = await Produto.find({ disponivel: true }).select('tokens -_id').lean();
    estatisticas = montarEstatisticas(produtos.map(produto => produto.tokens));
    return estatisticas;
}

function invalidarEstatisticas() {
    estatisticas = null;
}

function peso(token, stats) {
    return Math.log(stats.total / (stats.frequencia.get(token) || 1));
}

function vendidoAPeso(produto) {
    return produto.unidade === 'kg';
}

function quantidadesCompativeis(a, b) {
    if (vendidoAPeso(a) || vendidoAPeso(b)) {
        return vendidoAPeso(a) === vendidoAPeso(b) || a.medida === b.medida;
    }

    if (a.quantidadeBase && b.quantidadeBase) {
        const diferenca = Math.abs(a.quantidadeBase - b.quantidadeBase) / Math.max(a.quantidadeBase, b.quantidadeBase);
        return a.medida === b.medida && diferenca <= TOLERANCIA_QUANTIDADE;
    }

    return !a.quantidadeBase && !b.quantidadeBase;
}

function mesmasVariantes(a, b) {
    return (a.variantes || []).join('|') === (b.variantes || []).join('|');
}

// Similaridade entre 0 e 1 (coeficiente de Dice ponderado pela raridade das palavras).
function similaridade(a, b, stats) {
    const tokensA = new Set(a.tokens || []);
    const tokensB = new Set(b.tokens || []);
    const limiteDistintiva = stats.total * FRACAO_PALAVRA_DISTINTIVA;
    const distintiva = token => (stats.frequencia.get(token) || 0) < limiteDistintiva;

    const sobraEmA = [...tokensA].some(token => !tokensB.has(token) && distintiva(token));
    const sobraEmB = [...tokensB].some(token => !tokensA.has(token) && distintiva(token));
    if (sobraEmA && sobraEmB) {
        return 0;
    }

    let comum = 0;
    let total = 0;
    for (const token of tokensA) {
        const p = peso(token, stats);
        total += p;
        if (tokensB.has(token)) comum += p;
    }
    for (const token of tokensB) {
        total += peso(token, stats);
    }

    return total > 0 ? (2 * comum) / total : 0;
}

function saoEquivalentes(a, b, stats) {
    if (!mesmasVariantes(a, b) || !quantidadesCompativeis(a, b)) {
        return 0;
    }
    return similaridade(a, b, stats);
}

// Preco usado para escolher o mais barato: por kg/L/un quando possivel, senao o preco da embalagem.
function precoComparavel(produto) {
    return produto.precoPorUnidade || produto.preco;
}

// Encontra, em cada um dos outros supermercados, o produto equivalente mais parecido.
async function buscarEquivalentes(produto) {
    if (!produto.tokens || produto.tokens.length === 0) {
        return [];
    }

    const stats = await carregarEstatisticas();

    // Busca candidatos pelas palavras mais raras do nome, que costumam identificar marca e tipo.
    const palavrasChave = [...produto.tokens]
        .sort((x, y) => peso(y, stats) - peso(x, stats))
        .slice(0, 3);

    const candidatos = await Produto.find({
        disponivel: true,
        supermercado: { $ne: produto.supermercado },
        tokens: { $in: palavrasChave },
        variantes: produto.variantes || []
    }).limit(800).lean();

    const melhorPorMercado = new Map();

    for (const candidato of candidatos) {
        const pontuacao = saoEquivalentes(produto, candidato, stats);
        if (pontuacao < LIMITE_SIMILARIDADE) continue;

        const atual = melhorPorMercado.get(candidato.supermercado);
        const melhor = !atual
            || pontuacao > atual.similaridade
            || (pontuacao === atual.similaridade && candidato.preco < atual.produto.preco);

        if (melhor) {
            melhorPorMercado.set(candidato.supermercado, { produto: candidato, similaridade: pontuacao });
        }
    }

    return [...melhorPorMercado.values()].sort((a, b) => precoComparavel(a.produto) - precoComparavel(b.produto));
}

// ---------------------------------------------------------------------------
// Produtos similares (substitutos): mesmo tipo de produto, porem de outra marca.
//
// Um produto e similar a outro quando:
// 1. esta no mesmo departamento (evita "vinho tinto" x "vinagre de vinho tinto");
// 2. tem as mesmas variantes (zero, integral, sabor...);
// 3. tem tamanho parecido (ate 25% de diferenca) ou ambos sao vendidos a peso;
// 4. contem todas as "palavras de tipo" do produto original: o nucleo (o que o produto e:
//    feijao, cerveja, bacon) e os qualificadores do nucleo (carioca, lager). A marca fica de
//    fora e pode ser diferente.
// Como os tamanhos variam, similares sao comparados pelo preco por kg/L/un.

const TOLERANCIA_TAMANHO_SIMILAR = 0.25;
// Um nucleo precisa iniciar o nome de pelo menos 5 produtos do catalogo.
const MINIMO_PRODUTOS_NUCLEO = 5;
// Qualificador: acompanha pelo menos 10% dos produtos do nucleo e no maximo 2 nucleos diferentes.
const FRACAO_QUALIFICADOR = 0.1;
const MAXIMO_NUCLEOS_QUALIFICADOR = 2;

function palavrasDeTipo(produto, stats) {
    const tokens = produto.tokens || [];
    const tamanhoDoNucleo = token => stats.porNucleo.get(token)?.total || 0;

    // O nucleo e a palavra do nome que mais aparece como primeira palavra no catalogo,
    // o que cobre nomes em outra ordem ("Puro Malte Pilsen Cerveja 350ml").
    const nucleo = [...tokens].sort((a, b) => tamanhoDoNucleo(b) - tamanhoDoNucleo(a))[0];
    if (!nucleo || tamanhoDoNucleo(nucleo) < MINIMO_PRODUTOS_NUCLEO) {
        return [];
    }

    const grupo = stats.porNucleo.get(nucleo);
    const minimo = Math.max(MINIMO_COOCORRENCIAS, grupo.total * FRACAO_QUALIFICADOR);
    const qualificadores = tokens.filter(token => token !== nucleo
        && (grupo.contagem.get(token) || 0) >= minimo
        && (stats.nucleosPorPalavra.get(token) || 0) <= MAXIMO_NUCLEOS_QUALIFICADOR);

    return [nucleo, ...qualificadores];
}

function tamanhosParecidos(a, b) {
    if (vendidoAPeso(a) || vendidoAPeso(b)) {
        return vendidoAPeso(a) === vendidoAPeso(b) || a.medida === b.medida;
    }
    if (!a.quantidadeBase || !b.quantidadeBase || a.medida !== b.medida) {
        return false;
    }
    const razao = a.quantidadeBase / b.quantidadeBase;
    return razao >= 1 - TOLERANCIA_TAMANHO_SIMILAR && razao <= 1 / (1 - TOLERANCIA_TAMANHO_SIMILAR);
}

function saoSimilares(original, candidato, stats) {
    if (original.categoria !== candidato.categoria) return false;
    if (!mesmasVariantes(original, candidato) || !tamanhosParecidos(original, candidato)) return false;

    const [nucleo, ...qualificadores] = palavrasDeTipo(original, stats);
    const tokensCandidato = new Set(candidato.tokens || []);
    if (!nucleo || !tokensCandidato.has(nucleo)) return false;

    if (qualificadores.every(token => tokensCandidato.has(token))) return true;

    // Aceita a versao generica do mesmo nucleo, sem qualificador nenhum ("Feijao Du Irineu 1kg"
    // no lugar de "Feijao Carioca X"), mas nao uma de outro tipo ("Feijao Preto").
    const [, ...qualificadoresCandidato] = palavrasDeTipo({ tokens: [nucleo, ...tokensCandidato] }, stats);
    return qualificadoresCandidato.length === 0;
}

// Busca similares do produto. Por padrao exclui os equivalentes exatos (que ja aparecem
// na comparacao) e devolve do menor para o maior preco por kg/L/un.
async function buscarSimilares(produto, { limite = 50, supermercados = null } = {}) {
    const stats = await carregarEstatisticas();
    const tipo = palavrasDeTipo(produto, stats);
    if (tipo.length === 0) {
        return [];
    }

    const filtro = {
        _id: { $ne: produto._id },
        disponivel: true,
        categoria: produto.categoria,
        variantes: produto.variantes || [],
        tokens: tipo[0]
    };
    if (supermercados) {
        filtro.supermercado = { $in: supermercados };
    }

    const candidatos = await Produto.find(filtro).limit(1500).lean();

    return candidatos
        .filter(candidato => saoSimilares(produto, candidato, stats))
        .filter(candidato => saoEquivalentes(produto, candidato, stats) < LIMITE_SIMILARIDADE)
        .sort((a, b) => precoComparavel(a) - precoComparavel(b))
        .slice(0, limite);
}

module.exports = {
    LIMITE_SIMILARIDADE,
    buscarEquivalentes,
    buscarSimilares,
    montarEstatisticas,
    palavrasDeTipo,
    saoSimilares,
    carregarEstatisticas,
    invalidarEstatisticas,
    precoComparavel,
    quantidadesCompativeis,
    saoEquivalentes,
    similaridade
};
