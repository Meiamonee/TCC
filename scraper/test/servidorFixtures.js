const fs = require('fs');
const http = require('http');
const path = require('path');

// Servidor local que entrega as paginas de exemplo em test/fixtures, simulando os sites
// dos supermercados. Assim os extratores rodam no Chrome de verdade, mas sem internet.
const FIXTURES = path.join(__dirname, 'fixtures');

const ROTAS = [
    [/^\/vip\/?$/, 'vipcommerce-inicio.html'],
    [/^\/vip\/departamentos\//, 'vipcommerce-departamento.html'],
    [/^\/ibecom\/?$/, 'ibecom-inicio.html'],
    [/^\/ibecom\/cat\//, 'ibecom-categoria.html'],
    // Os links "Ver todos" do iBecom apontam para a raiz do site (/sub/...).
    [/^(\/ibecom)?\/sub\//, 'ibecom-subcategoria.html'],
    [/^\/outra-unidade\/?$/, 'outra-unidade.html']
];

function iniciarServidor() {
    const servidor = http.createServer((req, res) => {
        const caminho = new URL(req.url, 'http://localhost').pathname;
        const rota = ROTAS.find(([padrao]) => padrao.test(caminho));

        if (!rota) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('nao encontrado');
            return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(path.join(FIXTURES, rota[1])));
    });

    return new Promise(resolve => {
        servidor.listen(0, '127.0.0.1', () => {
            const { port } = servidor.address();
            resolve({
                url: `http://127.0.0.1:${port}`,
                fechar: () => new Promise(fim => servidor.close(fim))
            });
        });
    });
}

module.exports = {
    iniciarServidor
};
