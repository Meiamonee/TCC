require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Produto = require('../models/Produto');
const Categoria = require('../models/Categoria');
const HistoricoPreco = require('../models/HistoricoPreco');
const { normalizarProduto } = require('../services/normalizacao');

// Atualiza um banco criado por versoes anteriores:
// 1. move o historico de precos embutido no produto para a colecao HistoricoPreco;
// 2. recalcula os campos de comparacao (tokens, variantes, preco por unidade, categoria padrao);
// 3. recria as categorias padronizadas com os departamentos de origem de cada mercado;
// 4. sincroniza os indices. Pode ser executado mais de uma vez.

function slugify(texto) {
    return String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

async function migrarHistorico(colecao) {
    const comHistorico = colecao.find({ historico: { $exists: true } }, { projection: { supermercado: 1, historico: 1 } });
    const registros = [];
    let produtos = 0;

    for await (const doc of comHistorico) {
        produtos++;
        for (const item of doc.historico || []) {
            registros.push({ produto: doc._id, supermercado: doc.supermercado, preco: item.preco, data: item.data || new Date() });
        }
        if (registros.length >= 5000) {
            await HistoricoPreco.insertMany(registros.splice(0), { ordered: false });
        }
    }
    if (registros.length > 0) {
        await HistoricoPreco.insertMany(registros, { ordered: false });
    }

    await colecao.updateMany({ historico: { $exists: true } }, { $unset: { historico: '' } });
    return produtos;
}

async function recalcularCampos(colecao) {
    const cursor = colecao.find({}, { projection: { nome: 1, preco: 1, unidade: 1, categoria: 1, departamentoOriginal: 1 } });
    let operacoes = [];
    let total = 0;

    for await (const doc of cursor) {
        const departamento = doc.departamentoOriginal || doc.categoria;
        const n = normalizarProduto({ nome: doc.nome, preco: doc.preco, unidadeVenda: doc.unidade, departamento });

        operacoes.push({
            updateOne: {
                filter: { _id: doc._id },
                update: {
                    $set: {
                        nomeNormalizado: Produto.normalizarNome(doc.nome),
                        categoria: n.categoriaPadrao,
                        departamentoOriginal: departamento,
                        alimento: n.alimento,
                        tokens: n.tokens,
                        variantes: n.variantes,
                        medida: n.medida,
                        quantidadeBase: n.quantidadeBase,
                        precoPorUnidade: n.precoPorUnidade,
                        unidadeMedida: n.unidadeMedida
                    }
                }
            }
        });
        total++;

        if (operacoes.length >= 2000) {
            await colecao.bulkWrite(operacoes, { ordered: false });
            operacoes = [];
        }
    }
    if (operacoes.length > 0) {
        await colecao.bulkWrite(operacoes, { ordered: false });
    }

    return total;
}

async function recriarCategorias() {
    const grupos = await Produto.aggregate([
        { $group: { _id: { categoria: '$categoria', supermercado: '$supermercado', departamento: '$departamentoOriginal' } } }
    ]);

    const porCategoria = new Map();
    for (const { _id } of grupos) {
        if (!porCategoria.has(_id.categoria)) porCategoria.set(_id.categoria, []);
        porCategoria.get(_id.categoria).push({ supermercado: _id.supermercado, nomeOriginal: _id.departamento });
    }

    await Categoria.deleteMany({});
    for (const [nome, mapeamentos] of porCategoria) {
        const categoria = await Categoria.create({ nome, slug: slugify(nome), mapeamentos });
        await Produto.updateMany({ categoria: nome }, { $set: { categoriaId: categoria._id } });
    }

    return porCategoria.size;
}

async function migrar() {
    await connectDB();
    const colecao = mongoose.connection.collection('produtos');

    console.log('Historico movido de', await migrarHistorico(colecao), 'produtos.');
    console.log('Campos recalculados em', await recalcularCampos(colecao), 'produtos.');
    console.log('Categorias padronizadas:', await recriarCategorias());

    await Produto.syncIndexes();
    await HistoricoPreco.syncIndexes();
    console.log('Indices sincronizados.');
}

migrar()
    .then(() => mongoose.disconnect())
    .catch(async error => {
        console.error('Falha na migracao:', error);
        await mongoose.disconnect();
        process.exit(1);
    });
