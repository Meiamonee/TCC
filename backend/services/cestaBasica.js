const Produto = require('../models/Produto');
const { SUPERMARKETS } = require('./importProducts');

// Cesta basica do DIEESE para a Regiao Sudeste (Decreto-Lei 399/1938): 13 itens e as
// quantidades mensais de referencia. Para cada item, o custo usa o menor preco por kg/L
// encontrado no supermercado entre os produtos que correspondem ao item.
//
// A banana e medida em duzias pelo DIEESE; aqui usamos peso, com 1 duzia ~= 1,2 kg.
const ITENS_CESTA = [
    { item: 'Carne bovina', quantidade: 6, unidade: 'kg', incluir: /\b(acem|musculo|patinho|coxao|paleta)\b/, excluir: /moida temperad|hamburguer|almondega|congelad/ },
    { item: 'Leite', quantidade: 7.5, unidade: 'L', incluir: /^leite\b.*\b(integral|uht|longa vida)\b/, excluir: /\b(po|condensado|fermentado|achocolatado|coco|soja|aveia|amendoa|lactose|semidesnatado|desnatado)\b/ },
    // Alguns mercados nao escrevem "carioca"; aceitamos qualquer feijao que nao seja de outro tipo.
    { item: 'Feijão', quantidade: 4.5, unidade: 'kg', incluir: /^feijao\b/, excluir: /\b(preto|branco|fradinho|rajado|jalo|vermelho|bolinha|corda|verde|azuki|cozido|pronto|lata|temperado|feijoada|caldo)\b/ },
    { item: 'Arroz', quantidade: 3, unidade: 'kg', incluir: /^arroz\b/, excluir: /\b(integral|parboilizado|arboreo|japones|preto|vermelho|7 graos|cateto|basmati|pronto|biro)\b/ },
    { item: 'Farinha de trigo', quantidade: 1.5, unidade: 'kg', incluir: /^farinha de trigo\b/, excluir: /\b(integral|fermento|pizza|bolo)\b/ },
    { item: 'Batata', quantidade: 6, unidade: 'kg', incluir: /^batata\b/, excluir: /\b(palha|frita|doce|chips|congelada|pre frita|smiles|lisa|ondulada|yakisoba)\b/ },
    { item: 'Tomate', quantidade: 9, unidade: 'kg', incluir: /^tomate\b/, excluir: /\b(molho|extrato|seco|pelado|cereja|sweet|grape|pomodoro|polpa)\b/ },
    { item: 'Pão francês', quantidade: 6, unidade: 'kg', incluir: /\bpao frances\b/, excluir: /\b(integral|recheado|congelado|pre assado|homebake)\b/ },
    { item: 'Café em pó', quantidade: 0.6, unidade: 'kg', incluir: /^cafe\b/, excluir: /\b(capsula|capsulas|soluvel|cappuccino|graos|grao|filtro|coador|cafeteira|xicara|bebida|gelado|leite)\b/ },
    { item: 'Banana', quantidade: 9, unidade: 'kg', incluir: /^banana\b.*\b(prata|nanica|maca|da terra|ouro)\b/, excluir: /\b(chips|passa|desidratada|doce|bananinha|zero)\b/ },
    { item: 'Açúcar', quantidade: 3, unidade: 'kg', incluir: /^acucar\b.*\b(refinado|cristal)\b/, excluir: /\b(sache|mascavo|demerara|organico|light|confeiteiro|glacucar)\b/ },
    { item: 'Óleo de soja', quantidade: 0.75, unidade: 'L', incluir: /^oleo\b.*\bsoja\b/, excluir: /\b(composto|spray)\b/ },
    { item: 'Manteiga', quantidade: 0.75, unidade: 'kg', incluir: /^manteiga\b/, excluir: /\b(cacau|garrafa|ghee|amendoim|biscoito)\b/ }
];

function arredondar(valor) {
    return Math.round(valor * 100) / 100;
}

// Os precos so mudam a cada coleta (2 vezes por dia); guardar o calculo por alguns minutos evita
// ler milhares de produtos do banco a cada visita (a rota levava ~3,8 s no servidor gratuito).
const VALIDADE_CACHE_MS = 10 * 60 * 1000;
let cache = null;

async function calcularCestaBasica({ forcar = false } = {}) {
    if (!forcar && cache && Date.now() - cache.calculadoEm < VALIDADE_CACHE_MS) {
        return cache.valor;
    }
    const valor = await calcularSemCache();
    cache = { valor, calculadoEm: Date.now() };
    return valor;
}

function invalidarCestaBasica() {
    cache = null;
}

// Custo minimo da cesta basica em cada supermercado, com o produto escolhido para cada item.
async function calcularSemCache() {
    const slugs = Object.keys(SUPERMARKETS);
    const produtos = await Produto.find({
        disponivel: true,
        supermercado: { $in: slugs },
        alimento: true,
        precoPorUnidade: { $ne: null },
        unidadeMedida: { $in: ['kg', 'L'] }
    }).select('nome nomeNormalizado supermercado preco precoPorUnidade unidadeMedida url').lean();

    const porMercado = slugs.map(slug => {
        const itens = ITENS_CESTA.map(definicao => {
            const candidatos = produtos.filter(produto =>
                produto.supermercado === slug
                && produto.unidadeMedida === definicao.unidade
                && definicao.incluir.test(produto.nomeNormalizado)
                && !definicao.excluir.test(produto.nomeNormalizado));
            const maisBarato = candidatos.sort((a, b) => a.precoPorUnidade - b.precoPorUnidade)[0];

            return {
                item: definicao.item,
                quantidade: definicao.quantidade,
                unidade: definicao.unidade,
                produto: maisBarato ? maisBarato.nome : null,
                precoPorUnidade: maisBarato ? maisBarato.precoPorUnidade : null,
                custo: maisBarato ? arredondar(maisBarato.precoPorUnidade * definicao.quantidade) : null,
                opcoes: candidatos.length
            };
        });

        const encontrados = itens.filter(item => item.custo !== null);
        return {
            supermercado: slug,
            supermercadoNome: SUPERMARKETS[slug].nome,
            total: arredondar(encontrados.reduce((soma, item) => soma + item.custo, 0)),
            itensEncontrados: encontrados.length,
            itensTotal: ITENS_CESTA.length,
            itens
        };
    });

    // So faz sentido comparar o total entre mercados que tem a cesta completa.
    const completos = porMercado.filter(mercado => mercado.itensEncontrados === ITENS_CESTA.length);
    const maisBarato = [...completos].sort((a, b) => a.total - b.total)[0] || null;

    return {
        referencia: 'Cesta básica DIEESE - Região Sudeste (Decreto-Lei 399/1938)',
        calculadoEm: new Date(),
        porMercado,
        maisBarato: maisBarato ? { supermercado: maisBarato.supermercado, supermercadoNome: maisBarato.supermercadoNome, total: maisBarato.total } : null
    };
}

module.exports = {
    ITENS_CESTA,
    calcularCestaBasica,
    invalidarCestaBasica
};
