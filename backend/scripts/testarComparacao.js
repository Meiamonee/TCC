require('dotenv').config();
const connectDB = require('../config/database');
const Produto = require('../models/Produto');
const Categoria = require('../models/Categoria');

async function testarComparacao() {
    try {
        console.log('🧪 Testando queries de comparação de preços\n');

        await connectDB();

        // Teste 1: Buscar produtos por nome normalizado
        console.log('📝 Teste 1: Buscar produtos similares');
        console.log('   Buscando: "coca cola"...\n');

        const cocaCola = await Produto.find({
            nomeNormalizado: /coca cola/i,
            disponivel: true
        })
            .sort({ preco: 1 })
            .limit(5);

        console.log(`   Encontrados: ${cocaCola.length} produtos`);
        cocaCola.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.nome}`);
            console.log(`      Preço: R$ ${p.preco.toFixed(2)}`);
            console.log(`      Categoria: ${p.categoria}`);
            console.log('');
        });

        // Teste 2: Produtos mais baratos por categoria
        console.log('\n📊 Teste 2: Produtos mais baratos da categoria "Bebidas"');
        console.log('   Top 10 mais baratos:\n');

        const maisBaratos = await Produto.find({
            categoria: 'Bebidas',
            disponivel: true
        })
            .sort({ preco: 1 })
            .limit(10);

        maisBaratos.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.nome}`);
            console.log(`      R$ ${p.preco.toFixed(2)}`);
        });

        // Teste 3: Estatísticas de preços por categoria
        console.log('\n\n📈 Teste 3: Estatísticas de preços por categoria\n');

        const stats = await Produto.aggregate([
            {
                $match: { disponivel: true }
            },
            {
                $group: {
                    _id: '$categoria',
                    count: { $sum: 1 },
                    precoMedio: { $avg: '$preco' },
                    precoMinimo: { $min: '$preco' },
                    precoMaximo: { $max: '$preco' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        stats.forEach(cat => {
            console.log(`   ${cat._id}:`);
            console.log(`      Produtos: ${cat.count}`);
            console.log(`      Preço médio: R$ ${cat.precoMedio.toFixed(2)}`);
            console.log(`      Mais barato: R$ ${cat.precoMinimo.toFixed(2)}`);
            console.log(`      Mais caro: R$ ${cat.precoMaximo.toFixed(2)}`);
            console.log('');
        });

        // Teste 4: Busca por texto (simulando busca do usuário)
        console.log('\n🔍 Teste 4: Busca por texto "arroz"');
        console.log('   Resultados:\n');

        const arroz = await Produto.find({
            $text: { $search: 'arroz' },
            disponivel: true
        })
            .sort({ preco: 1 })
            .limit(5);

        arroz.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.nome} - R$ ${p.preco.toFixed(2)}`);
        });

        // Teste 5: Comparação futura entre supermercados (preparado para quando houver mais)
        console.log('\n\n🏪 Teste 5: Produtos por supermercado\n');

        const porSupermercado = await Produto.aggregate([
            {
                $group: {
                    _id: '$supermercado',
                    totalProdutos: { $sum: 1 },
                    precoMedio: { $avg: '$preco' }
                }
            }
        ]);

        porSupermercado.forEach(s => {
            console.log(`   ${s._id}:`);
            console.log(`      Total de produtos: ${s.totalProdutos}`);
            console.log(`      Preço médio: R$ ${s.precoMedio.toFixed(2)}`);
            console.log('');
        });

        console.log('✅ Todos os testes concluídos!\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro nos testes:', error);
        process.exit(1);
    }
}

testarComparacao();
