const path = require('path');
const { spawn } = require('child_process');
const { importarProdutosDoJson, SUPERMARKETS } = require('./importProducts');

const SCRAPERS = {
    supervale: {
        cwd: path.resolve(__dirname, '../../scraper')
    },
    fonseca: {
        cwd: path.resolve(__dirname, '../../scraper-fonseca')
    }
};

function executarComandoNode(cwd, args, label) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, args, {
            cwd,
            env: {
                ...process.env,
                SCRAPER_HEADLESS: process.env.SCRAPER_HEADLESS || 'true'
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', chunk => {
            const text = chunk.toString();
            stdout += text;
            process.stdout.write(text);
        });

        child.stderr.on('data', chunk => {
            const text = chunk.toString();
            stderr += text;
            process.stderr.write(text);
        });

        child.on('error', reject);
        child.on('close', code => {
            if (code === 0) {
                resolve({ label, stdout, stderr });
                return;
            }

            reject(new Error(`${label} terminou com codigo ${code}: ${stderr || stdout}`));
        });
    });
}

function resolverMercados(mercado) {
    if (!mercado || mercado === 'todos') {
        return Object.keys(SUPERMARKETS);
    }

    if (!SUPERMARKETS[mercado]) {
        throw new Error(`Supermercado desconhecido: ${mercado}`);
    }

    return [mercado];
}

async function executarPipelineScraping(options = {}) {
    const startedAt = new Date();
    const mercados = resolverMercados(options.mercado);
    const resultados = [];

    for (const mercado of mercados) {
        const scraper = SCRAPERS[mercado];
        if (!scraper) {
            throw new Error(`Scraper nao configurado para: ${mercado}`);
        }

        console.log(`\n[${mercado}] Executando scraper...`);
        await executarComandoNode(scraper.cwd, ['index.js'], `scraper:${mercado}`);

        console.log(`[${mercado}] Importando produtos no MongoDB...`);
        const importacao = await importarProdutosDoJson(mercado);
        resultados.push(importacao);
    }

    return {
        startedAt,
        finishedAt: new Date(),
        mercados,
        resultados
    };
}

module.exports = {
    executarPipelineScraping
};
