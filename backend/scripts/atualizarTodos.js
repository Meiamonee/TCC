require('dotenv').config({ quiet: true });
const { executarPipelineScraping } = require('../services/scrapingPipeline');

executarPipelineScraping()
    .then(resultado => {
        console.log('\nAtualizacao concluida.');
        console.log(JSON.stringify(resultado.resultados, null, 2));
        process.exit(0);
    })
    .catch(error => {
        console.error('Erro na atualizacao:', error);
        process.exit(1);
    });
