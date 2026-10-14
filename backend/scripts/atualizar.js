require('dotenv').config({ quiet: true });
const { executarPipelineScraping } = require('../services/scrapingPipeline');

// Uso: node scripts/atualizar.js [slug-do-mercado|todos]
const mercado = process.argv[2] || 'todos';

executarPipelineScraping({ mercado })
    .then(resultado => {
        console.log('\nAtualizacao concluida.');
        console.log(JSON.stringify({ resultados: resultado.resultados, falhas: resultado.falhas }, null, 2));
        process.exit(resultado.falhas.length > 0 ? 1 : 0);
    })
    .catch(error => {
        console.error('Erro na atualizacao:', error);
        process.exit(1);
    });
