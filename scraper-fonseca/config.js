module.exports = {
    baseUrl: 'https://www.supermercadosfonseca.com.br',

    departments: [
        { name: 'Bebidas', url: 'https://www.supermercadosfonseca.com.br/departamentos/bebidas' },
        { name: 'Animais', url: 'https://www.supermercadosfonseca.com.br/departamentos/animais' },
        { name: 'Bazar e utilidades', url: 'https://www.supermercadosfonseca.com.br/departamentos/bazar-e-utilidades' },
        { name: 'Biscoitos e chocolates', url: 'https://www.supermercadosfonseca.com.br/departamentos/biscoitos-e-chocolates' },
        { name: 'Carnes', url: 'https://www.supermercadosfonseca.com.br/departamentos/carnes' },
        { name: 'Cereais e farináceos', url: 'https://www.supermercadosfonseca.com.br/departamentos/cereais-e-farinaceos' },
        { name: 'Congelados', url: 'https://www.supermercadosfonseca.com.br/departamentos/congelados' },
        { name: 'Frios e laticínios', url: 'https://www.supermercadosfonseca.com.br/departamentos/frios-e-laticinios' },
        { name: 'Hortifruti', url: 'https://www.supermercadosfonseca.com.br/departamentos/hortifruti' },
        { name: 'Limpeza', url: 'https://www.supermercadosfonseca.com.br/departamentos/limpeza' },
        { name: 'Matinais e sobremesas', url: 'https://www.supermercadosfonseca.com.br/departamentos/matinais-e-sobremesas' },
        { name: 'Mercearia', url: 'https://www.supermercadosfonseca.com.br/departamentos/mercearia' },
        { name: 'Padaria', url: 'https://www.supermercadosfonseca.com.br/departamentos/padaria' },
        { name: 'Perfumaria e higiene', url: 'https://www.supermercadosfonseca.com.br/departamentos/perfumaria-e-higiene' }
    ],

    selectors: {
        productContainer: 'vip-card-produto',
        productTitle: '.vip-card-produto-descricao',
        productPrice: 'vip-produto-preco-valor .medio.font-bold',
        productImage: 'vip-image img',
        paginationNext: 'button[title="Próxima página"], button[aria-label="Próxima página"]',
        paginationNextText: 'Próxima página'
    }
};
