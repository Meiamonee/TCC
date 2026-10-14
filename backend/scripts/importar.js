require('dotenv').config({ quiet: true });
const { importarProdutosDoJson, sincronizarSupermercados, SUPERMARKETS } = require('../services/importProducts');

// Importa os arquivos ja coletados em scraper/output, sem executar scraping novo.
// Uso: node scripts/importar.js [slug-do-mercado|todos]
const alvo = process.argv[2] || 'todos';
const slugs = alvo === 'todos' ? Object.keys(SUPERMARKETS) : [alvo];

async function importar() {
    await sincronizarSupermercados();

    for (const slug of slugs) {
        const resultado = await importarProdutosDoJson(slug);
        console.log(JSON.stringify(resultado, null, 2));
    }
}

importar()
    .then(() => {
        console.log('Importacao concluida.');
        process.exit(0);
    })
    .catch(error => {
        console.error('Erro na importacao:', error.message);
        process.exit(1);
    });
