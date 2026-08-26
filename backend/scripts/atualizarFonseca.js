require('dotenv').config({ quiet: true });
const { executarPipelineScraping } = require('../services/scrapingPipeline');

executarPipelineScraping({ mercado: 'fonseca' })
    .then(resultado => {
        console.log('Atualizacao do Fonseca concluida.');
        console.log(JSON.stringify(resultado.resultados, null, 2));
        process.exit(0);
    })
    .catch(error => {
        console.error('Erro na atualizacao do Fonseca:', error);
        process.exit(1);
    });
