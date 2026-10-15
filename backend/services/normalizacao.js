// Normalizacao de produtos para comparacao entre supermercados.
// Cada site descreve o mesmo produto de um jeito ("Refrig.coca Cola 2l S/acucar" x
// "Refrigerante sem Acucar Coca-Cola Garrafa 2l"); estas funcoes extraem o que
// importa para comparar: palavras relevantes, variantes, quantidade e preco por unidade.

// Abreviacoes comuns nos nomes de produtos.
const ABREVIACOES = {
    refrig: 'refrigerante',
    refri: 'refrigerante',
    beb: 'bebida',
    cerv: 'cerveja',
    deterg: 'detergente',
    sab: 'sabonete',
    choc: 'chocolate',
    bisc: 'biscoito',
    amac: 'amaciante',
    desod: 'desodorante',
    cond: 'condicionador',
    sh: 'shampoo',
    mac: 'macarrao',
    trad: 'tradicional',
    integ: 'integral',
    desnat: 'desnatado',
    ret: 'retornavel',
    // Nomes comerciais de acucar da Uniao que escondem o tipo do produto.
    cristalcucar: 'cristal',
    glacucar: 'confeiteiro'
};

// Palavras que descrevem embalagem, classificacao generica ou ligacao, e nao o produto.
const PALAVRAS_IGNORADAS = new Set([
    'de', 'da', 'do', 'das', 'dos', 'e', 'com', 'c', 'em', 'a', 'o', 'para', 'p', 'sabor', 'tipo',
    'pet', 'garrafa', 'lata', 'latinha', 'caixa', 'cx', 'pacote', 'pct', 'pc', 'sache', 'sachet', 'frasco',
    'pote', 'vidro', 'bandeja', 'tampa', 'embalagem', 'economica', 'leve', 'pague', 'gratis',
    'uht', 'polido', 'refinado', 'tradicional', 'original', 'classico', 'unidade', 'unidades', 'un', 'und', 'unid',
    'rolos', 'rolo', 'kit', 'cada', 'aprox', 'qtd', 'x', 'n', 'no', 'nr', 'numero'
]);

// Variantes que mudam o produto: so comparamos itens com exatamente as mesmas variantes.
// Inclui versoes (zero, integral...), sabores/fragancias e intensidades (cafe extra forte).
const VARIANTES = new Set([
    'zero', 'diet', 'light', 'integral', 'desnatado', 'semidesnatado', 'semlactose', 'semalcool',
    'semgluten', 'parboilizado', 'retornavel', 'organico', 'demerara', 'mascavo', 'cristal', 'confeiteiro',
    'descafeinado', 'infantil', 'kids', 'refil',
    'intenso', 'forte', 'extraforte', 'suave', 'gourmet', 'expresso', 'espresso',
    'coco', 'limao', 'neutro', 'maca', 'laranja', 'uva', 'morango', 'baunilha', 'menta',
    'hortela', 'lavanda', 'abacaxi', 'maracuja', 'pessego', 'cereja', 'canela',
    'guarana', 'tangerina', 'manga', 'goiaba', 'framboesa', 'amora', 'caramelo',
    'flores', 'floral', 'talco', 'eucalipto', 'pinho', 'clear', 'pimenta', 'ervas',
    // Tipos de vinho (e de feijao/chocolate "branco"): tinto nao substitui branco.
    'tinto', 'branco', 'rose', 'seco',
    // Cores e tipos de grao: feijao preto nao substitui carioca; azeitona verde nao substitui preta.
    'preto', 'preta', 'vermelho', 'vermelha', 'verde', 'rajado', 'fradinho', 'jalo', 'bolinha', 'mulatinho'
]);

const UNIDADES_MEDIDA = [
    { regex: '(?:kg|kgs|quilos?)', medida: 'massa', fator: 1000 },
    { regex: '(?:g|gr|grs|gramas?)', medida: 'massa', fator: 1 },
    { regex: '(?:l|lt|lts|litros?)', medida: 'volume', fator: 1000 },
    { regex: '(?:ml|mls)', medida: 'volume', fator: 1 },
    { regex: '(?:m|mt|mts|metros?)', medida: 'comprimento', fator: 1 }
];

// Rotulo e divisor para exibir o preco por unidade de medida (R$/kg, R$/L, R$/m, R$/un).
const BASE_POR_MEDIDA = {
    massa: { rotulo: 'kg', divisor: 1000 },
    volume: { rotulo: 'L', divisor: 1000 },
    comprimento: { rotulo: 'm', divisor: 1 },
    unidade: { rotulo: 'un', divisor: 1 }
};

function removerAcentos(texto) {
    return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizarTexto(texto) {
    return removerAcentos(texto)
        .toLowerCase()
        .replace(/\bs\//g, ' sem ')
        .replace(/\bc\//g, ' com ')
        .replace(/\btipo\s*[0-9]\b|\bt1\b/g, ' ')
        .replace(/\bextra\s*forte\b/g, ' extraforte ')
        .replace(/\b(sem|zero|0%?)\s*a[cç]?ucar(es)?\b/g, ' zero ')
        .replace(/\b(sem|zero|0%?)\s*lactose\b|\blacfree\b/g, ' semlactose ')
        .replace(/\b(sem|zero|0%?)\s*alcool\b/g, ' semalcool ')
        .replace(/\b(sem|zero)\s*gluten\b/g, ' semgluten ')
        .replace(/\bsemi\s*desnatado\b/g, ' semidesnatado ')
        .replace(/(\d),(\d)/g, '$1.$2')
        .replace(/[^a-z0-9.%\s]/g, ' ')
        .replace(/\.(?!\d)|(?<!\d)\./g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Extrai a quantidade total da embalagem a partir do nome.
// Ex.: "2,5l" -> 2500 ml; "12x350ml" -> 4200 ml; "20m Com 12 Rolos" -> 240 m.
function extrairQuantidade(nome) {
    const texto = normalizarTexto(nome);
    let medida = null;
    let quantidade = null;

    for (const unidade of UNIDADES_MEDIDA) {
        const multipack = texto.match(new RegExp(`\\b(\\d+)\\s*x\\s*(\\d+(?:\\.\\d+)?)\\s*${unidade.regex}\\b`));
        if (multipack) {
            medida = unidade.medida;
            quantidade = Number(multipack[1]) * Number(multipack[2]) * unidade.fator;
            break;
        }

        const simples = texto.match(new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*${unidade.regex}\\b`));
        if (simples) {
            medida = unidade.medida;
            quantidade = Number(simples[1]) * unidade.fator;
            break;
        }
    }

    // Pacote promocional "leve 12 pague 10", escrito por extenso ou abreviado ("L12p10"):
    // a quantidade do nome e de cada unidade do pacote.
    const promocao = texto.match(/\bleve\s*(\d+)\s*pague\b/) || texto.match(/\bl(\d+)p\d+\b/);

    // Embalagens com varias unidades: "12 rolos", "com 4 unid", "leve 12 pague 11", "10 unidades".
    const contagem = promocao
        || texto.match(/\b(\d+)\s*(?:un|und|unid|unidades?|rolos?|pecas?|saches?|capsulas?|cap)\b/)
        || texto.match(/\bcom\s*(\d+)\b/);
    const multiplicador = contagem ? Number(contagem[1]) : 1;

    if (medida && quantidade > 0) {
        // Em massa e volume a quantidade do nome ja e o total ("Caldo 57g 6 unid"), exceto nos
        // pacotes promocionais; em comprimento ela e por rolo ("Papel 20m com 12 rolos").
        const porItem = (medida === 'comprimento' && !/\b\d+\s*x\s*\d/.test(texto)) || Boolean(promocao);
        return { medida, quantidade: porItem ? quantidade * multiplicador : quantidade };
    }

    if (multiplicador > 1) {
        return { medida: 'unidade', quantidade: multiplicador };
    }

    return { medida: null, quantidade: null };
}

// Calcula o preco por kg, litro, metro ou unidade.
// Produtos vendidos a peso ja tem o preco expresso por kg no site. Quando o site informa o
// tamanho da embalagem junto ao preco (ex: "/700g"), ele vale mais que o tamanho escrito no nome.
function calcularPrecoPorUnidade({ nome, preco, unidadeVenda, embalagem }) {
    if (!(preco > 0)) {
        return { medida: null, quantidadeBase: null, precoPorUnidade: null, unidadeMedida: null };
    }

    if (unidadeVenda === 'kg') {
        return { medida: 'massa', quantidadeBase: null, precoPorUnidade: preco, unidadeMedida: 'kg' };
    }

    const daEmbalagem = embalagem ? extrairQuantidade(embalagem) : { medida: null };
    const { medida, quantidade } = daEmbalagem.medida ? daEmbalagem : extrairQuantidade(nome);
    if (!medida) {
        return { medida: null, quantidadeBase: null, precoPorUnidade: null, unidadeMedida: null };
    }

    const base = BASE_POR_MEDIDA[medida];
    const precoPorUnidade = Math.round((preco / (quantidade / base.divisor)) * 100) / 100;

    return { medida, quantidadeBase: quantidade, precoPorUnidade, unidadeMedida: base.rotulo };
}

function ehTokenDeQuantidade(token) {
    return /^\d/.test(token) || /^\d*(ml|l|lt|lts|g|gr|grs|kg|kgs|m|mt|mts|cm|mm|un|und|unid|x)$/.test(token);
}

// Palavras relevantes e variantes do produto, usadas na comparacao entre mercados.
function gerarTokens(nome) {
    const palavras = normalizarTexto(nome)
        .split(' ')
        .map(palavra => ABREVIACOES[palavra] || palavra)
        .filter(palavra => palavra.length > 1 && !ehTokenDeQuantidade(palavra) && !PALAVRAS_IGNORADAS.has(palavra));

    const variantes = new Set(palavras.filter(palavra => VARIANTES.has(palavra)));

    // "Cerveja ... Zero" e cerveja sem alcool, nao sem acucar.
    if (palavras.includes('cerveja') && variantes.delete('zero')) {
        variantes.add('semalcool');
    }

    const tokens = [...new Set(palavras.filter(palavra => !VARIANTES.has(palavra) && palavra !== 'sem' && palavra !== 'alcool'))];

    return { tokens, variantes: [...variantes].sort() };
}

// Categorias padronizadas: cada mercado nomeia seus departamentos de um jeito.
const CATEGORIAS = [
    { nome: 'Hortifruti', alimento: true, termos: ['hortifruti', 'frutas', 'legumes', 'verduras', 'flv'] },
    { nome: 'Carnes e Peixes', alimento: true, termos: ['acougue', 'carne', 'carnes', 'peixaria', 'peixe', 'aves'] },
    { nome: 'Frios e Laticínios', alimento: true, termos: ['frios', 'laticinios', 'laticinio'] },
    { nome: 'Bebidas', alimento: true, termos: ['bebida', 'bebidas', 'adega'] },
    { nome: 'Matinais e Sobremesas', alimento: true, termos: ['matinais', 'sobremesas', 'cafe da manha'] },
    { nome: 'Biscoitos e Chocolates', alimento: true, termos: ['biscoitos', 'chocolates', 'doces'] },
    { nome: 'Padaria', alimento: true, termos: ['padaria', 'lanchonete', 'confeitaria'] },
    { nome: 'Congelados', alimento: true, termos: ['congelados', 'sorvetes'] },
    { nome: 'Mercearia', alimento: true, termos: ['mercearia', 'cereais', 'farinaceos', 'alimentos basicos', 'oriental', 'importados', 'mercado'] },
    { nome: 'Limpeza', alimento: false, termos: ['limpeza', 'lavagem'] },
    { nome: 'Higiene e Saúde', alimento: false, termos: ['perfumaria', 'higiene', 'saude', 'bem estar', 'farmacia'] },
    { nome: 'Pet', alimento: false, termos: ['animais', 'pet'] },
    { nome: 'Bazar e Utilidades', alimento: false, termos: ['bazar', 'utilidades', 'flores', 'casa'] }
];

function categoriaCanonica(departamento) {
    const texto = normalizarTexto(departamento).replace(/[^a-z ]/g, ' ');
    const categoria = CATEGORIAS.find(item => item.termos.some(termo => new RegExp(`\\b${termo}\\b`).test(texto)));
    return categoria
        ? { nome: categoria.nome, alimento: categoria.alimento }
        : { nome: 'Outros', alimento: false };
}

// Campos derivados gravados junto com o produto no momento da importacao.
function normalizarProduto({ nome, preco, unidadeVenda, embalagem, departamento }) {
    const { tokens, variantes } = gerarTokens(nome);
    const precoUnitario = calcularPrecoPorUnidade({ nome, preco, unidadeVenda, embalagem });
    const categoria = categoriaCanonica(departamento);

    return {
        tokens,
        variantes,
        medida: precoUnitario.medida,
        quantidadeBase: precoUnitario.quantidadeBase,
        precoPorUnidade: precoUnitario.precoPorUnidade,
        unidadeMedida: precoUnitario.unidadeMedida,
        categoriaPadrao: categoria.nome,
        alimento: categoria.alimento
    };
}

module.exports = {
    CATEGORIAS,
    calcularPrecoPorUnidade,
    categoriaCanonica,
    extrairQuantidade,
    gerarTokens,
    normalizarProduto,
    normalizarTexto,
    removerAcentos
};
