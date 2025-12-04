const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Model
const produtoSchema = new mongoose.Schema({
    nome: String,
    nomeNormalizado: String,
    supermercado: String,
    categoria: String,
    preco: Number,
    precoOriginal: String,
    imagem: String,
    url: String,
    disponivel: Boolean
});

const Produto = mongoose.model('Produto', produtoSchema);

async function exportarParaFrontend() {
    try {
        console.log('🚀 Exportando produtos do MongoDB para o frontend...\n');

        await mongoose.connect('mongodb://localhost:27017/Mercados');
        console.log('✅ MongoDB conectado!\n');

        // Buscar todos os produtos disponíveis
        const produtos = await Produto.find({ disponivel: true })
            .select('nome preco precoOriginal imagem url categoria supermercado')
            .lean();

        console.log(`📦 Total de produtos encontrados: ${produtos.length}\n`);

        // Transformar para formato do frontend
        const produtosFormatados = produtos.map(p => ({
            name: p.nome,
            price: p.precoOriginal,
            image: p.imagem,
            url: p.url,
            department: p.categoria,
            supermercado: p.supermercado
        }));

        // Salvar no frontend
        const frontendPath = path.join(__dirname, '../../frontend/src/data/products.json');
        fs.writeFileSync(frontendPath, JSON.stringify(produtosFormatados, null, 2), 'utf8');

        console.log(`✅ Arquivo salvo em: ${frontendPath}\n`);

        // Estatísticas
        const supervale = produtosFormatados.filter(p => p.supermercado === 'supervale').length;
        const fonseca = produtosFormatados.filter(p => p.supermercado === 'fonseca').length;

        console.log('📊 Estatísticas:');
        console.log(`   SuperVale: ${supervale} produtos`);
        console.log(`   Fonseca: ${fonseca} produtos`);
        console.log(`   Total: ${produtosFormatados.length} produtos`);
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

exportarParaFrontend();
