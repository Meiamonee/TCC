const mongoose = require('mongoose');

// Models
const produtoSchema = new mongoose.Schema({
    nome: String,
    nomeNormalizado: String,
    supermercado: String,
    categoria: String,
    preco: Number,
    precoOriginal: String,
    disponivel: Boolean
});

const Produto = mongoose.model('Produto', produtoSchema);

async function testarComparacao() {
    try {
        console.log('🧪 Testando comparação de preços entre SuperVale e Fonseca\n');

        await mongoose.connect('mongodb://localhost:27017/Mercados');
        console.log('✅ MongoDB conectado!\n');

        // Teste 1: Buscar "coca cola" em ambos os supermercados
        console.log('📝 Teste 1: Buscar "coca cola" em ambos os supermercados\n');

        const cocaCola = await Produto.find({
            nomeNormalizado: /coca cola/i,
            disponivel: true
        })
            .sort({ preco: 1 })
            .limit(10);

        console.log(`   Encontrados: ${cocaCola.length} produtos\n`);
        cocaCola.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.nome}`);
            console.log(`      🏪 ${p.supermercado.toUpperCase()}`);
            console.log(`      💰 ${p.precoOriginal}`);
            console.log('');
        });

        // Teste 2: Comparar preços médios por categoria
        console.log('\n📊 Teste 2: Preço médio por categoria em cada supermercado\n');

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
            const cat = item._id.categoria;
            if (!categorias[cat]) categorias[cat] = {};
            categorias[cat][item._id.supermercado] = {
                preco: item.precoMedio,
                count: item.count
            };
        });

        Object.keys(categorias).forEach(cat => {
            console.log(`   ${cat}:`);
            const dados = categorias[cat];

            if (dados.supervale) {
                console.log(`      SuperVale: R$ ${dados.supervale.preco.toFixed(2)} (${dados.supervale.count} produtos)`);
            }
            if (dados.fonseca) {
                console.log(`      Fonseca: R$ ${dados.fonseca.preco.toFixed(2)} (${dados.fonseca.count} produtos)`);
            }

            // Mostrar qual é mais barato
            if (dados.supervale && dados.fonseca) {
                const diff = dados.supervale.preco - dados.fonseca.preco;
                if (diff > 0) {
                    console.log(`      ✅ Fonseca é R$ ${diff.toFixed(2)} mais barato em média`);
                } else if (diff < 0) {
                    console.log(`      ✅ SuperVale é R$ ${Math.abs(diff).toFixed(2)} mais barato em média`);
                } else {
                    console.log(`      ⚖️  Preços iguais em média`);
                }
            }
            console.log('');
        });

        // Teste 3: Produtos mais baratos por categoria
        console.log('\n🏆 Teste 3: Produto mais barato de "Bebidas" em cada supermercado\n');

        const maisBaratoSupervale = await Produto.findOne({
            categoria: 'Bebidas',
            supermercado: 'supervale',
            disponivel: true
        }).sort({ preco: 1 });

        const maisBaratoFonseca = await Produto.findOne({
            categoria: 'Bebidas',
            supermercado: 'fonseca',
            disponivel: true
        }).sort({ preco: 1 });

        if (maisBaratoSupervale) {
            console.log(`   SuperVale:`);
            console.log(`      ${maisBaratoSupervale.nome}`);
            console.log(`      ${maisBaratoSupervale.precoOriginal}\n`);
        }

        if (maisBaratoFonseca) {
            console.log(`   Fonseca:`);
            console.log(`      ${maisBaratoFonseca.nome}`);
            console.log(`      ${maisBaratoFonseca.precoOriginal}\n`);
        }

        console.log('✅ Testes concluídos!\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro nos testes:', error);
        process.exit(1);
    }
}

testarComparacao();
