require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

// Copia o banco inteiro (produtos, historico de precos, categorias e supermercados) de um
// MongoDB para outro, com os indices. Usado para levar o banco local para o MongoDB Atlas
// sem perder o historico de precos ja coletado.
//
// Uso:
//   MONGODB_URI_ORIGEM=mongodb://localhost:27017/Mercados \
//   MONGODB_URI_DESTINO="mongodb+srv://usuario:senha@cluster.../Mercados" \
//   npm run copiar-banco -- --substituir
//
// Sem --substituir o script so mostra o que faria. Com ele, as colecoes do destino sao
// apagadas e recriadas com o conteudo da origem.

const LOTE = 1000;

function nomeSeguro(uri) {
    // Nunca mostra usuario e senha no terminal.
    return uri.replace(/\/\/[^@/]+@/, '//***@');
}

async function copiarColecao(origem, destino, nome, substituir) {
    const total = await origem.collection(nome).countDocuments();
    if (!substituir) {
        console.log(`  ${nome}: ${total} documentos (simulacao)`);
        return;
    }

    await destino.collection(nome).drop().catch(() => {});

    let lote = [];
    let copiados = 0;
    for await (const documento of origem.collection(nome).find()) {
        lote.push(documento);
        if (lote.length === LOTE) {
            await destino.collection(nome).insertMany(lote, { ordered: false });
            copiados += lote.length;
            lote = [];
            process.stdout.write(`\r  ${nome}: ${copiados}/${total}`);
        }
    }
    if (lote.length) {
        await destino.collection(nome).insertMany(lote, { ordered: false });
        copiados += lote.length;
    }

    const indices = (await origem.collection(nome).indexes()).filter(indice => indice.name !== '_id_');
    for (const { key, v: _versao, ns: _ns, ...opcoes } of indices) {
        await destino.collection(nome).createIndex(key, opcoes);
    }

    console.log(`\r  ${nome}: ${copiados}/${total} documentos, ${indices.length} indices`);
}

async function main() {
    const uriOrigem = process.env.MONGODB_URI_ORIGEM || process.env.MONGODB_URI;
    const uriDestino = process.env.MONGODB_URI_DESTINO;
    const substituir = process.argv.includes('--substituir');

    if (!uriOrigem || !uriDestino) {
        throw new Error('Defina MONGODB_URI_ORIGEM (ou MONGODB_URI) e MONGODB_URI_DESTINO.');
    }
    if (uriOrigem === uriDestino) {
        throw new Error('Origem e destino sao o mesmo banco.');
    }

    const origem = await mongoose.createConnection(uriOrigem).asPromise();
    const destino = await mongoose.createConnection(uriDestino).asPromise();

    try {
        console.log(`Origem:  ${nomeSeguro(uriOrigem)} (${origem.name})`);
        console.log(`Destino: ${nomeSeguro(uriDestino)} (${destino.name})`);
        if (!substituir) {
            console.log('Simulacao: rode com --substituir para copiar de verdade.');
        }

        const colecoes = (await origem.db.listCollections().toArray())
            .filter(colecao => colecao.type === 'collection' && !colecao.name.startsWith('system.'))
            .map(colecao => colecao.name);

        for (const nome of colecoes) {
            await copiarColecao(origem.db, destino.db, nome, substituir);
        }

        console.log(substituir ? 'Copia concluida.' : 'Nada foi alterado.');
    } finally {
        await origem.close();
        await destino.close();
    }
}

main().catch(error => {
    console.error(`Erro: ${error.message}`);
    process.exit(1);
});
