require('dotenv').config({ quiet: true });
const { importarProdutosDoJson } = require('../services/importProducts');

importarProdutosDoJson('supervale')
    .then(resultado => {
        console.log('Importacao do SuperVale concluida.');
        console.log(JSON.stringify(resultado, null, 2));
        process.exit(0);
    })
    .catch(error => {
        console.error('Erro na importacao do SuperVale:', error);
        process.exit(1);
    });
