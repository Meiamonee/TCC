const test = require('node:test');
const assert = require('node:assert/strict');
const { extractAdminKey, requireAdminKey, secureEqual } = require('./adminAuth');

function request(headers = {}) {
    const normalized = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
    return { get: name => normalized[name.toLowerCase()] };
}

function response() {
    return {
        statusCode: 200,
        headers: {},
        body: null,
        status(code) { this.statusCode = code; return this; },
        set(name, value) { this.headers[name] = value; return this; },
        json(body) { this.body = body; return this; }
    };
}

test('extracts the admin key from the dedicated header or Bearer token', () => {
    assert.equal(extractAdminKey(request({ 'x-admin-key': ' secret ' })), 'secret');
    assert.equal(extractAdminKey(request({ authorization: 'Bearer token-value' })), 'token-value');
});

test('uses a timing-safe comparison for equal values', () => {
    assert.equal(secureEqual('same-value', 'same-value'), true);
    assert.equal(secureEqual('same-value', 'other-value'), false);
});

test('rejects manual collection when the server key is absent or invalid', () => {
    const previous = process.env.ADMIN_API_KEY;
    try {
        delete process.env.ADMIN_API_KEY;
        const missingResponse = response();
        requireAdminKey(request(), missingResponse, () => assert.fail('should not continue'));
        assert.equal(missingResponse.statusCode, 503);

        process.env.ADMIN_API_KEY = 'configured-secret-with-32-characters';
        const invalidResponse = response();
        requireAdminKey(request({ 'x-admin-key': 'wrong-secret' }), invalidResponse, () => assert.fail('should not continue'));
        assert.equal(invalidResponse.statusCode, 401);
        assert.match(invalidResponse.headers['WWW-Authenticate'], /Bearer/);
    } finally {
        if (previous === undefined) delete process.env.ADMIN_API_KEY;
        else process.env.ADMIN_API_KEY = previous;
    }
});

test('accepts a valid administrative key', () => {
    const previous = process.env.ADMIN_API_KEY;
    process.env.ADMIN_API_KEY = 'configured-secret-with-32-characters';
    try {
        let called = false;
        requireAdminKey(request({ authorization: 'Bearer configured-secret-with-32-characters' }), response(), () => { called = true; });
        assert.equal(called, true);
    } finally {
        if (previous === undefined) delete process.env.ADMIN_API_KEY;
        else process.env.ADMIN_API_KEY = previous;
    }
});
