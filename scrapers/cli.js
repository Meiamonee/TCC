const path = require('node:path');
const { scrapeMarket } = require('./catalog');
const markets = require('../config/supermarkets.json');

function configFor(slug) {
    const market = markets.find(m => m.slug === slug && m.platform);
    if (!market) throw new Error(`Coletor compartilhado nao configurado: ${slug}`);
    if (market.collectionEnabled === false) throw new Error(market.disabledReason);
    return { ...market, baseUrl: market.url, outputDir: path.resolve(__dirname, '..', market.directory) };
}

function parseOptions(args) {
    const options = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--smoke') Object.assign(options, { maxDepartments: 2, maxPages: 2 });
        else if (args[i] === '--fresh') options.fresh = true;
        else if (args[i] === '--resume') options.resume = true;
        else if (args[i] === '--pilot') options.pilot = true;
        else if (args[i] === '--department' || args[i] === '--output') {
            const key = args[i];
            const value = args[++i];
            if (!value || value.startsWith('--')) throw new Error(`Valor obrigatorio para ${key}.`);
            if (key === '--department') options.department = value;
            else {
                if (!value.toLowerCase().endsWith('.json')) throw new Error('--output deve terminar em .json.');
                options.outputPath = path.resolve(value);
            }
        }
        else if (['--max-pages', '--max-departments'].includes(args[i])) {
            const key = args[i] === '--max-pages' ? 'maxPages' : 'maxDepartments';
            const value = Number(args[++i]);
            if (!Number.isInteger(value) || value < 1) throw new Error('Limite deve ser um inteiro positivo.');
            options[key] = value;
        } else throw new Error(`Opcao desconhecida: ${args[i]}`);
    }
    return options;
}

function run(slug) {
    Promise.resolve().then(() => scrapeMarket(configFor(slug), parseOptions(process.argv.slice(2))))
        .catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { configFor, parseOptions, run };
