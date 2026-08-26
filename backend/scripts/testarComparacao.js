require('dotenv').config({ quiet: true });
const connectDB = require('../config/database');
const Produto = require('../models/Produto');

async function testarComparacao() {
    try {
        console.log('Testando queries de comparacao de precos\n');

        await connectDB();

        console.log('Teste 1: buscar produtos similares');
        console.log('Buscando: "coca cola"...\n');

        const cocaCola = await Produto.find({
            nomeNormalizado: /coca cola/i,
            disponivel: true
        })
            .sort({ preco: 1 })
            .limit(5);

        console.log(`Encontrados: ${cocaCola.length} produtos`);
        cocaCola.forEach((produto, index) => {
            console.log(`${index + 1}. ${produto.nome}`);
            console.log(`   Preco: R$ ${produto.preco.toFixed(2)}`);
            console.log(`   Categoria: ${produto.categoria}`);
        });

        console.log('\nTeste 2: produtos mais baratos da categoria "Bebidas"');
        const maisBaratos = await Produto.find({
            categoria: 'Bebidas',
            disponivel: true
        })
            .sort({ preco: 1 })
            .limit(10);

        maisBaratos.forEach((produto, index) => {
            console.log(`${index + 1}. ${produto.nome} - R$ ${produto.preco.toFixed(2)}`);
        });

        console.log('\nTeste 3: estatisticas de preco por categoria');
        const stats = await Produto.aggregate([
            { $match: { disponivel: true } },
            {
                $group: {
                    _id: '$categoria',
                    count: { $sum: 1 },
                    precoMedio: { $avg: '$preco' },
                    precoMinimo: { $min: '$preco' },
                    precoMaximo: { $max: '$preco' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        stats.forEach(categoria => {
            console.log(`${categoria._id}:`);
            console.log(`   Produtos: ${categoria.count}`);
            console.log(`   Preco medio: R$ ${categoria.precoMedio.toFixed(2)}`);
            console.log(`   Mais barato: R$ ${categoria.precoMinimo.toFixed(2)}`);
            console.log(`   Mais caro: R$ ${categoria.precoMaximo.toFixed(2)}`);
        });

        console.log('\nTeste 4: busca por texto "arroz"');
        const arroz = await Produto.find({
            $text: { $search: 'arroz' },
            disponivel: true
        })
            .sort({ preco: 1 })
            .limit(5);

        arroz.forEach((produto, index) => {
            console.log(`${index + 1}. ${produto.nome} - R$ ${produto.preco.toFixed(2)}`);
        });

        console.log('\nTeste 5: produtos por supermercado');
        const porSupermercado = await Produto.aggregate([
            {
                $group: {
                    _id: '$supermercado',
                    totalProdutos: { $sum: 1 },
                    precoMedio: { $avg: '$preco' }
                }
            }
        ]);

        porSupermercado.forEach(supermercado => {
            console.log(`${supermercado._id}:`);
            console.log(`   Total de produtos: ${supermercado.totalProdutos}`);
            console.log(`   Preco medio: R$ ${supermercado.precoMedio.toFixed(2)}`);
        });

        console.log('\nTestes concluidos.');
        process.exit(0);
    } catch (error) {
        console.error('Erro nos testes:', error);
        process.exit(1);
    }
}

testarComparacao();
