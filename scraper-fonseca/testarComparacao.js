require('dotenv').config({ quiet: true });
const connectDB = require('../backend/config/database');
const Produto = require('../backend/models/Produto');

async function testarComparacao() {
    try {
        console.log('Testando comparacao de precos entre SuperVale e Fonseca\n');

        await connectDB();

        console.log('Teste 1: buscar "coca cola" em ambos os supermercados\n');
        const cocaCola = await Produto.find({
            nomeNormalizado: /coca cola/i,
            disponivel: true
        })
            .sort({ preco: 1 })
            .limit(10);

        console.log(`Encontrados: ${cocaCola.length} produtos\n`);
        cocaCola.forEach((produto, index) => {
            console.log(`${index + 1}. ${produto.nome}`);
            console.log(`   Mercado: ${produto.supermercado.toUpperCase()}`);
            console.log(`   Preco: ${produto.precoOriginal}`);
        });

        console.log('\nTeste 2: preco medio por categoria em cada supermercado\n');
        const precosPorCategoria = await Produto.aggregate([
            { $match: { disponivel: true } },
            {
                $group: {
                    _id: { categoria: '$categoria', supermercado: '$supermercado' },
                    precoMedio: { $avg: '$preco' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.categoria': 1, '_id.supermercado': 1 } }
        ]);

        const categorias = {};
        precosPorCategoria.forEach(item => {
            const categoria = item._id.categoria;
            if (!categorias[categoria]) categorias[categoria] = {};
            categorias[categoria][item._id.supermercado] = {
                preco: item.precoMedio,
                count: item.count
            };
        });

        Object.keys(categorias).forEach(categoria => {
            console.log(`${categoria}:`);
            const dados = categorias[categoria];

            if (dados.supervale) {
                console.log(`   SuperVale: R$ ${dados.supervale.preco.toFixed(2)} (${dados.supervale.count} produtos)`);
            }
            if (dados.fonseca) {
                console.log(`   Fonseca: R$ ${dados.fonseca.preco.toFixed(2)} (${dados.fonseca.count} produtos)`);
            }

            if (dados.supervale && dados.fonseca) {
                const diff = dados.supervale.preco - dados.fonseca.preco;
                if (diff > 0) {
                    console.log(`   Fonseca e R$ ${diff.toFixed(2)} mais barato em media`);
                } else if (diff < 0) {
                    console.log(`   SuperVale e R$ ${Math.abs(diff).toFixed(2)} mais barato em media`);
                } else {
                    console.log('   Precos iguais em media');
                }
            }
        });

        console.log('\nTeste 3: produto mais barato de "Bebidas" em cada supermercado\n');
        const [maisBaratoSupervale, maisBaratoFonseca] = await Promise.all([
            Produto.findOne({
                categoria: 'Bebidas',
                supermercado: 'supervale',
                disponivel: true
            }).sort({ preco: 1 }),
            Produto.findOne({
                categoria: 'Bebidas',
                supermercado: 'fonseca',
                disponivel: true
            }).sort({ preco: 1 })
        ]);

        if (maisBaratoSupervale) {
            console.log('SuperVale:');
            console.log(`   ${maisBaratoSupervale.nome}`);
            console.log(`   ${maisBaratoSupervale.precoOriginal}`);
        }

        if (maisBaratoFonseca) {
            console.log('Fonseca:');
            console.log(`   ${maisBaratoFonseca.nome}`);
            console.log(`   ${maisBaratoFonseca.precoOriginal}`);
        }

        console.log('\nTestes concluidos.');
        process.exit(0);
    } catch (error) {
        console.error('Erro nos testes:', error);
        process.exit(1);
    }
}

testarComparacao();
