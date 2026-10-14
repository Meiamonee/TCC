require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const { calcularCestaBasica } = require('../services/cestaBasica');

// Calcula o custo da cesta basica em cada supermercado, mostra no terminal e acrescenta uma
// linha por mercado em logs/cesta-basica.csv, para acompanhar a variacao ao longo do tempo.
const ARQUIVO_CSV = path.join(__dirname, '..', 'logs', 'cesta-basica.csv');

async function executar() {
    await connectDB();
    const resultado = await calcularCestaBasica();

    console.log(`\n${resultado.referencia}\n`);
    for (const mercado of resultado.porMercado) {
        console.log(`${mercado.supermercadoNome}: R$ ${mercado.total.toFixed(2)} (${mercado.itensEncontrados}/${mercado.itensTotal} itens)`);
        for (const item of mercado.itens) {
            const detalhe = item.produto
                ? `R$ ${item.custo.toFixed(2)} = ${item.quantidade} ${item.unidade} x R$ ${item.precoPorUnidade.toFixed(2)} (${item.produto})`
                : 'nao encontrado';
            console.log(`   ${item.item.padEnd(17)} ${detalhe}`);
        }
    }
    if (resultado.maisBarato) {
        console.log(`\nCesta mais barata: ${resultado.maisBarato.supermercadoNome} (R$ ${resultado.maisBarato.total.toFixed(2)})`);
    }

    fs.mkdirSync(path.dirname(ARQUIVO_CSV), { recursive: true });
    if (!fs.existsSync(ARQUIVO_CSV)) {
        fs.writeFileSync(ARQUIVO_CSV, 'data;supermercado;total;itens_encontrados\n', 'utf8');
    }
    const data = resultado.calculadoEm.toISOString();
    const linhas = resultado.porMercado
        .map(mercado => `${data};${mercado.supermercado};${mercado.total.toFixed(2).replace('.', ',')};${mercado.itensEncontrados}`)
        .join('\n');
    fs.appendFileSync(ARQUIVO_CSV, `${linhas}\n`, 'utf8');
    console.log(`Registro adicionado em ${ARQUIVO_CSV}`);
}

executar()
    .then(() => mongoose.disconnect())
    .catch(async error => {
        console.error('Falha ao calcular a cesta basica:', error);
        await mongoose.disconnect();
        process.exit(1);
    });
