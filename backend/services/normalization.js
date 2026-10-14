const aliases = require('../../shared/categories.json');
const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const categoryOf = value => aliases[key(value)] || value || 'Sem categoria';
module.exports = { categoryOf };
