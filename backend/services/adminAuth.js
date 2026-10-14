const crypto = require('node:crypto');

function configuredAdminKey() {
    return String(process.env.ADMIN_API_KEY || '').trim();
}

function extractAdminKey(req) {
    const headerKey = req.get?.('x-admin-key');
    if (headerKey) return String(headerKey).trim();

    const authorization = String(req.get?.('authorization') || '');
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : '';
}

function secureEqual(left, right) {
    const leftBuffer = Buffer.from(String(left));
    const rightBuffer = Buffer.from(String(right));
    return leftBuffer.length === rightBuffer.length
        && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function requireAdminKey(req, res, next) {
    const expected = configuredAdminKey();
    if (expected.length < 32) {
        return res.status(503).json({
            error: 'Coleta manual desabilitada. Configure ADMIN_API_KEY com pelo menos 32 caracteres.'
        });
    }

    const received = extractAdminKey(req);
    if (!received || !secureEqual(received, expected)) {
        res.set('WWW-Authenticate', 'Bearer realm="SuperPreco Admin"');
        return res.status(401).json({ error: 'Nao autorizado' });
    }

    return next();
}

module.exports = {
    configuredAdminKey,
    extractAdminKey,
    requireAdminKey,
    secureEqual
};
