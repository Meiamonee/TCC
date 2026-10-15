const dns = require('dns');

// O MongoDB Atlas usa enderecos "mongodb+srv://", que dependem de uma consulta DNS do tipo SRV.
// Em alguns computadores Windows o Node nao consegue fazer essa consulta pelo DNS do sistema
// (erro "querySrv ECONNREFUSED"). Com DNS_SERVERS=1.1.1.1,8.8.8.8 no .env, o Node passa a usar
// esses servidores DNS publicos.
function configurarDns() {
    const servidores = (process.env.DNS_SERVERS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (servidores.length) {
        dns.setServers(servidores);
    }
}

module.exports = configurarDns;
