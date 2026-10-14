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

let estatisticas = null;

// Frequencia de cada palavra entre os produtos disponiveis, usada para pesar as palavras.
async function carregarEstatisticas({ forcar = false } = {}) {
    const agora = Date.now();
    if (!forcar && estatisticas && agora - estatisticas.carregadoEm < VALIDADE_ESTATISTICAS_MS) {
        return estatisticas;
    }

    const [total, frequencias] = await Promise.all([
        Produto.countDocuments({ disponivel: true }),
        Produto.aggregate([
            { $match: { disponivel: true } },
            { $unwind: '$tokens' },
            { $group: { _id: '$tokens', n: { $sum: 1 } } }
        ])
    ]);

    estatisticas = {
        total: Math.max(total, 1),
        frequencia: new Map(frequencias.map(item => [item._id, item.n])),
        carregadoEm: agora
    };

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

module.exports = {
    LIMITE_SIMILARIDADE,
    buscarEquivalentes,
    carregarEstatisticas,
    invalidarEstatisticas,
    precoComparavel,
    quantidadesCompativeis,
    saoEquivalentes,
    similaridade
};
