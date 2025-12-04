const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Models
const supermercadoSchema = new mongoose.Schema({
    nome: String,
    slug: String,
    url: String,
    ativo: Boolean,
    ultimaAtualizacao: Date
}, { timestamps: true });

const categoriaSchema = new mongoose.Schema({
    nome: String,
    slug: String,
    mapeamentos: [{
        supermercado: String,
        nomeOriginal: String
    }]
}, { timestamps: true });

const produtoSchema = new mongoose.Schema({
    nome: String,
    nomeNormalizado: String,
    supermercado: String,
    supermercadoId: mongoose.Schema.Types.ObjectId,
    categoria: String,
    categoriaId: mongoose.Schema.Types.ObjectId,
    preco: Number,
    precoOriginal: String,
    imagem: String,
    url: String,
    produtoId: String,
    disponivel: Boolean,
    dataCaptura: Date,
    ultimaAtualizacao: Date,
    historico: [{ preco: Number, data: Date }]
}, { timestamps: true });

produtoSchema.statics.normalizarNome = function (nome) {
    return nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const Supermercado = mongoose.model('Supermercado', supermercadoSchema);
const Categoria = mongoose.model('Categoria', categoriaSchema);
const Produto = mongoose.model('Produto', produtoSchema);

// Função para extrair preço numérico do formato "R$ 8,99"
function extrairPreco(precoString) {
    if (!precoString) return 0;
    const preco = precoString
        .replace(/R\$\s*/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
    return parseFloat(preco) || 0;
}

async function importarFonseca() {
    try {
        console.log('🚀 Iniciando importação do Fonseca...\n');

        // Conectar ao MongoDB
        await mongoose.connect('mongodb://localhost:27017/Mercados');
        console.log('✅ MongoDB conectado com sucesso!\n');

        // 1. Criar/Atualizar Supermercado
        console.log('📍 Criando registro do supermercado...');
        const supermercado = await Supermercado.findOneAndUpdate(
            { slug: 'fonseca' },
            {
                nome: 'Supermercado Fonseca',
                slug: 'fonseca',
                url: 'https://www.supermercadosfonseca.com.br',
                ativo: true,
                ultimaAtualizacao: new Date()
            },
            { upsert: true, new: true }
        );
        console.log(`✅ Supermercado criado: ${supermercado.nome} (ID: ${supermercado._id})\n`);

        // 2. Carregar produtos do JSON
        const productsPath = path.join(__dirname, 'products.json');
        console.log(`📂 Carregando produtos de: ${productsPath}`);
        const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        console.log(`📦 Total de produtos carregados: ${productsData.length}\n`);

        // 3. Extrair categorias únicas
        const categoriasUnicas = [...new Set(productsData.map(p => p.department))];
        console.log(`🏷️  Categorias encontradas: ${categoriasUnicas.length}`);

        // 4. Criar/Atualizar Categorias
        const categoriasMap = {};
        for (const nomeCategoria of categoriasUnicas) {
            const slug = nomeCategoria.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '-');

            const categoria = await Categoria.findOneAndUpdate(
                { slug },
                {
                    nome: nomeCategoria,
                    slug,
                    $addToSet: {
                        mapeamentos: {
                            supermercado: 'fonseca',
                            nomeOriginal: nomeCategoria
                        }
                    }
                },
                { upsert: true, new: true }
            );
            categoriasMap[nomeCategoria] = categoria._id;
            console.log(`  ✓ ${nomeCategoria}`);
        }
        console.log('');

        // 5. Limpar produtos antigos do Fonseca
        console.log('🗑️  Removendo produtos antigos do Fonseca...');
        const deleteResult = await Produto.deleteMany({ supermercado: 'fonseca' });
        console.log(`   Removidos: ${deleteResult.deletedCount} produtos\n`);

        // 6. Importar produtos
        console.log('📥 Importando produtos...');
        let importados = 0;
        let erros = 0;
        const batchSize = 100;

        for (let i = 0; i < productsData.length; i += batchSize) {
            const batch = productsData.slice(i, i + batchSize);
            const produtosParaInserir = batch.map(p => {
                const preco = extrairPreco(p.price);
                const nomeNormalizado = Produto.normalizarNome(p.name);

                const urlMatch = p.url?.match(/\/produto\/(\d+)\//);
                const produtoId = urlMatch ? urlMatch[1] : `${Date.now()}-${Math.random()}`;

                return {
                    nome: p.name,
                    nomeNormalizado,
                    supermercado: 'fonseca',
                    supermercadoId: supermercado._id,
                    categoria: p.department,
                    categoriaId: categoriasMap[p.department],
                    preco,
                    precoOriginal: p.price,
                    imagem: p.image,
                    url: p.url,
                    produtoId,
                    disponivel: true,
                    dataCaptura: new Date(),
                    ultimaAtualizacao: new Date(),
                    historico: [{
                        preco,
                        data: new Date()
                    }]
                };
            });

            try {
                await Produto.insertMany(produtosParaInserir, { ordered: false });
                importados += produtosParaInserir.length;
                process.stdout.write(`\r   Progresso: ${importados}/${productsData.length} produtos`);
            } catch (error) {
                if (error.code === 11000) {
                    importados += produtosParaInserir.length;
                } else {
                    erros += produtosParaInserir.length;
                    console.error(`\n   ❌ Erro no batch ${i}: ${error.message}`);
                }
            }
        }

        console.log('\n');
        console.log('✅ Importação concluída!');
        console.log(`   📊 Produtos importados: ${importados}`);
        console.log(`   ❌ Erros: ${erros}`);
        console.log('');

        // 7. Estatísticas
        console.log('📊 Estatísticas do banco:');
        const totalProdutos = await Produto.countDocuments();
        const totalCategorias = await Categoria.countDocuments();
        const totalSupermercados = await Supermercado.countDocuments();

        console.log(`   Supermercados: ${totalSupermercados}`);
        console.log(`   Categorias: ${totalCategorias}`);
        console.log(`   Produtos: ${totalProdutos}`);
        console.log('');

        // Produtos por supermercado
        console.log('📈 Produtos por supermercado:');
        const produtosPorMercado = await Produto.aggregate([
            { $group: { _id: '$supermercado', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        produtosPorMercado.forEach(m => {
            console.log(`   ${m._id}: ${m.count} produtos`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro na importação:', error);
        process.exit(1);
    }
}

importarFonseca();
