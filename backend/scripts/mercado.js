require('dotenv').config({ quiet: true });
const { executarPipelineScraping } = require('../services/scrapingPipeline');
const { importarProdutosDoJson, SUPERMARKETS } = require('../services/importProducts');

async function main() {
    const [action, mercado] = process.argv.slice(2);
    if (!['atualizar', 'importar'].includes(action) || !SUPERMARKETS[mercado]) {
        throw new Error(`Uso: node scripts/mercado.js atualizar|importar ${Object.keys(SUPERMARKETS).join('|')}`);
    }
    const result = action === 'atualizar'
        ? await executarPipelineScraping({ mercado })
        : await importarProdutosDoJson(mercado);
    console.log(JSON.stringify(result, null, 2));
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
