const fs = require('fs');
const path = require('path');
const { MERCADOS, buscarMercado } = require('./mercados');
const { criarNavegador, getDelayConfig } = require('./lib/navegador');

const PLATAFORMAS = {
    vipcommerce: require('./plataformas/vipcommerce'),
    ibecom: require('./plataformas/ibecom')
};

const OUTPUT_DIR = path.join(__dirname, 'output');

function caminhoSaida(slug) {
    return path.join(OUTPUT_DIR, `${slug}.json`);
}

// Coleta todos os produtos de um supermercado com Selenium e salva em output/<slug>.json.
async function rasparMercado(slug, options = {}) {
    const mercado = buscarMercado(slug);
    if (!mercado) {
        throw new Error(`Supermercado desconhecido: ${slug}`);
    }

    const plataforma = PLATAFORMAS[mercado.plataforma];
    if (!plataforma) {
        throw new Error(`Plataforma sem extrator: ${mercado.plataforma}`);
    }

    const delay = getDelayConfig(options);
    console.log(`[${slug}] Iniciando coleta em ${mercado.url} (${mercado.plataforma}).`);
    console.log(`[${slug}] Espera entre paginas: ${delay.pageDelayMs}ms + ate ${delay.pageDelayJitterMs}ms.`);

    const inicio = Date.now();
    const driver = await criarNavegador(options);

    try {
        const produtos = await plataforma.raspar(driver, mercado, { delay });
        const coletadoEm = new Date().toISOString();
        const registros = produtos.map(produto => ({ ...produto, collectedAt: coletadoEm }));

        if (registros.length === 0) {
            throw new Error(`[${slug}] Nenhum produto coletado; arquivo anterior mantido.`);
        }

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        const outputPath = options.outputPath || caminhoSaida(slug);
        fs.writeFileSync(outputPath, JSON.stringify(registros, null, 2), 'utf8');

        const minutos = ((Date.now() - inicio) / 60000).toFixed(1);
        console.log(`[${slug}] Coleta concluida: ${registros.length} produtos em ${minutos} min.`);
        console.log(`[${slug}] Arquivo salvo em ${outputPath}`);

        return registros;
    } finally {
        await driver.quit();
    }
}

async function main() {
    const alvo = process.argv[2] || 'todos';
    const slugs = alvo === 'todos' ? MERCADOS.map(mercado => mercado.slug) : [alvo];
    let falhas = 0;

    for (const slug of slugs) {
        try {
            await rasparMercado(slug);
        } catch (error) {
            falhas++;
            console.error(`[${slug}] Falha na coleta: ${error.message}`);
        }
    }

    process.exit(falhas > 0 ? 1 : 0);
}

if (require.main === module) {
    main();
}

module.exports = {
    caminhoSaida,
    rasparMercado
};
