const { configFor, run } = require('../scrapers/cli');
const { scrapeMarket } = require('../scrapers/catalog');
const config = configFor('vilasul');
if (require.main === module) run(config.slug);
module.exports = options => scrapeMarket(config, options);
