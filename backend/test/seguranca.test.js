const test = require('node:test');
const assert = require('node:assert/strict');
const { criarApp } = require('../app');

// Testes de seguranca da API: cabecalhos, limite de requisicoes, CORS e validacao das entradas.
// Nao precisam do MongoDB: todas as requisicoes daqui sao respondidas (ou recusadas) antes de
// qualquer consulta ao banco.

async function subir(opcoes) {
    const servidor = criarApp(opcoes).listen(0);
    await new Promise(resolve => servidor.once('listening', resolve));
    return { servidor, base: `http://127.0.0.1:${servidor.address().port}` };
}

async function chamar(base, caminho, opcoes = {}) {
    const resposta = await fetch(`${base}${caminho}`, {
        ...opcoes,
        headers: { 'Content-Type': 'application/json', ...opcoes.headers }
    });
    const texto = await resposta.text();
    let corpo = null;
    try { corpo = JSON.parse(texto); } catch { corpo = texto; }
    return { status: resposta.status, headers: resposta.headers, corpo };
}

const postar = (base, caminho, corpo, headers = {}) => chamar(base, caminho, {
    method: 'POST',
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
    headers
});

let app;

test.before(async () => {
    app = await subir();
});

test.after(() => {
    app.servidor.close();
});

test('envia cabecalhos de seguranca e esconde a tecnologia do servidor', async () => {
    const { status, headers } = await chamar(app.base, '/api/scraping/status');
    assert.equal(status, 200);
    assert.equal(headers.get('x-content-type-options'), 'nosniff');
    assert.match(headers.get('content-security-policy'), /default-src 'none'/);
    assert.match(headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.ok(headers.get('strict-transport-security'), 'deve exigir HTTPS (HSTS)');
    assert.equal(headers.get('x-powered-by'), null, 'nao deve anunciar o Express');
});

test('rotas desconhecidas e JSON invalido respondem com erro em JSON', async () => {
    const rota = await chamar(app.base, '/api/nao-existe');
    assert.equal(rota.status, 404);
    assert.equal(rota.corpo.error, 'Rota nao encontrada');

    const json = await postar(app.base, '/api/lista/cotacao', '{ itens: [');
    assert.equal(json.status, 400);
    assert.ok(json.corpo.error);
});

test('recusa corpo de requisicao grande demais', async () => {
    const itens = Array.from({ length: 2000 }, () => ({ id: '6600aaaaaaaaaaaaaaaaaaaa', quantidade: 1 }));
    const { status } = await postar(app.base, '/api/lista/cotacao', { itens });
    assert.equal(status, 413);
});

test('valida os filtros da busca de produtos', async () => {
    const mercado = await chamar(app.base, '/api/produtos?supermercado=fonseca');
    assert.equal(mercado.status, 400);
    assert.match(mercado.corpo.error, /Supermercado desconhecido/);

    const ordem = await chamar(app.base, '/api/produtos?ordenar=aleatorio');
    assert.equal(ordem.status, 400);
    assert.match(ordem.corpo.error, /menor-preco/);

    const busca = await chamar(app.base, `/api/produtos?search=${'a'.repeat(101)}`);
    assert.equal(busca.status, 400);

    // Parametro repetido vira lista, o que nao e aceito.
    const repetido = await chamar(app.base, '/api/produtos?categoria=Bebidas&categoria=Mercearia');
    assert.equal(repetido.status, 400);

    const categorias = await chamar(app.base, '/api/categorias?supermercado=fonseca');
    assert.equal(categorias.status, 400);
});

test('valida os itens da lista de compras', async () => {
    const id = '6600aaaaaaaaaaaaaaaaaaaa';
    const casos = [
        [{}, /itens/],
        [{ itens: 'arroz' }, /itens/],
        [{ itens: [null] }, /Item 1 invalido/],
        [{ itens: [{ quantidade: 1 }] }, /Item 1 invalido/],
        [{ itens: [{ id: 123 }] }, /Item 1 invalido/],
        [{ itens: [{ id, quantidade: 0 }] }, /quantidade/],
        [{ itens: [{ id, quantidade: -2 }] }, /quantidade/],
        [{ itens: [{ id, quantidade: 1000 }] }, /quantidade/],
        [{ itens: [{ id, quantidade: 'muito' }] }, /quantidade/],
        [{ itens: Array.from({ length: 101 }, () => ({ id })) }, /maximo 100 itens/]
    ];

    for (const [corpo, mensagem] of casos) {
        const resposta = await postar(app.base, '/api/lista/cotacao', corpo);
        assert.equal(resposta.status, 400, JSON.stringify(corpo).slice(0, 60));
        assert.match(resposta.corpo.error, mensagem);
    }
});

test('rota administrativa fica desligada sem token ou com token curto demais', async (t) => {
    const original = process.env.ADMIN_TOKEN;
    t.after(() => {
        if (original === undefined) delete process.env.ADMIN_TOKEN;
        else process.env.ADMIN_TOKEN = original;
    });

    delete process.env.ADMIN_TOKEN;
    assert.equal((await postar(app.base, '/api/scraping/atualizar', {})).status, 503);

    process.env.ADMIN_TOKEN = 'curto';
    const curto = await postar(app.base, '/api/scraping/atualizar', {}, { Authorization: 'Bearer curto' });
    assert.equal(curto.status, 503, 'token curto nao pode liberar a coleta');
});

test('limita as requisicoes por IP e informa quando liberar de novo', async () => {
    const limitado = await subir({ limites: { geral: 3 } });
    try {
        for (let i = 0; i < 3; i++) {
            assert.equal((await chamar(limitado.base, '/api/scraping/status')).status, 200);
        }
        const bloqueado = await chamar(limitado.base, '/api/scraping/status');
        assert.equal(bloqueado.status, 429);
        assert.match(bloqueado.corpo.error, /Muitas requisicoes/);
        assert.ok(bloqueado.headers.get('retry-after'), 'deve dizer quando tentar de novo');

        // A verificacao de saude usada pelo Render nao entra no limite.
        assert.equal((await chamar(limitado.base, '/api/health')).status, 200);
    } finally {
        limitado.servidor.close();
    }
});

test('cotacao e rota administrativa tem limites proprios, menores', async (t) => {
    const original = process.env.ADMIN_TOKEN;
    t.after(() => {
        if (original === undefined) delete process.env.ADMIN_TOKEN;
        else process.env.ADMIN_TOKEN = original;
    });
    process.env.ADMIN_TOKEN = 'segredo-de-teste-bem-longo';

    const limitado = await subir({ limites: { cotacao: 2, admin: 2 } });
    try {
        for (let i = 0; i < 2; i++) {
            assert.equal((await postar(limitado.base, '/api/lista/cotacao', {})).status, 400);
        }
        assert.equal((await postar(limitado.base, '/api/lista/cotacao', {})).status, 429);

        // Tentativas de adivinhar o token sao barradas depois de poucas tentativas.
        for (let i = 0; i < 2; i++) {
            const errado = await postar(limitado.base, '/api/scraping/atualizar', {}, { Authorization: `Bearer chute-${i}` });
            assert.equal(errado.status, 401);
        }
        const bloqueado = await postar(limitado.base, '/api/scraping/atualizar', {}, { Authorization: 'Bearer chute-3' });
        assert.equal(bloqueado.status, 429);

        // As consultas comuns continuam liberadas.
        assert.equal((await chamar(limitado.base, '/api/scraping/status')).status, 200);
    } finally {
        limitado.servidor.close();
    }
});

test('CORS libera so o endereco do site configurado', async (t) => {
    const original = process.env.CORS_ORIGIN;
    t.after(() => {
        if (original === undefined) delete process.env.CORS_ORIGIN;
        else process.env.CORS_ORIGIN = original;
    });
    process.env.CORS_ORIGIN = 'https://superpreco.pages.dev, http://localhost:5173';

    const comCors = await subir();
    try {
        const site = await chamar(comCors.base, '/api/health', { headers: { Origin: 'https://superpreco.pages.dev' } });
        assert.equal(site.headers.get('access-control-allow-origin'), 'https://superpreco.pages.dev');

        const local = await chamar(comCors.base, '/api/health', { headers: { Origin: 'http://localhost:5173' } });
        assert.equal(local.headers.get('access-control-allow-origin'), 'http://localhost:5173');

        const outro = await chamar(comCors.base, '/api/health', { headers: { Origin: 'https://site-estranho.com' } });
        assert.equal(outro.headers.get('access-control-allow-origin'), null);
    } finally {
        comCors.servidor.close();
    }
});
