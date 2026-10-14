// Supermercados mapeados pelo SuperPreco.
// Para incluir um novo mercado, basta adicionar uma entrada aqui com a plataforma
// de e-commerce que ele usa (cada plataforma tem um extrator em ./plataformas).
//
// `enderecoLoja` identifica a unidade de Pocos de Caldas: antes de coletar, o scraper
// confere se o site esta mostrando precos dessa unidade e aborta caso contrario.
const MERCADOS = [
    {
        slug: 'supervale',
        nome: 'SuperVale',
        url: 'https://www.supervalesupermercados.com.br',
        plataforma: 'vipcommerce',
        enderecoLoja: 'Av. João Pinheiro, 1460'
    },
    {
        slug: 'vilasul',
        nome: 'Vila Sul',
        url: 'https://www.vilasul.com.br',
        plataforma: 'vipcommerce',
        enderecoLoja: 'Avenida Sílvio Monteiro dos Santos, 180'
    },
    {
        slug: 'sanmichel',
        nome: 'San Michel',
        url: 'https://www.supersanmichel.com.br',
        plataforma: 'vipcommerce',
        enderecoLoja: 'Avenida Mansur Frayha, 875'
    },
    {
        slug: 'pedrilho',
        nome: 'Pedrilho',
        url: 'https://www.pedrilho.com.br',
        plataforma: 'ibecom',
        enderecoLoja: 'R. José Augusto de Carvalho, 55, Poços de Caldas'
    }
];

function buscarMercado(slug) {
    return MERCADOS.find(mercado => mercado.slug === slug) || null;
}

module.exports = {
    MERCADOS,
    buscarMercado
};
