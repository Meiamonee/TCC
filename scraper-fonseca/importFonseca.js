require('dotenv').config({ quiet: true });
const { importarProdutosDoJson } = require('../backend/services/importProducts');

importarProdutosDoJson('fonseca')
    .then(resultado => {
        console.log('Importacao do Fonseca concluida.');
        console.log(JSON.stringify(resultado, null, 2));
        process.exit(0);
    })
    .catch(error => {
        console.error('Erro na importacao do Fonseca:', error);
        process.exit(1);
    });
