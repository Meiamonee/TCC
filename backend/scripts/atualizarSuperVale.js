require('dotenv').config();
const connectDB = require('../config/database');
const Supermercado = require('../models/Supermercado');
const Categoria = require('../models/Categoria');
const Produto = require('../models/Produto');
const fs = require('fs');
const path = require('path');

// Função para extrair preço numérico
function extrairPreco(precoString) {
    if (!precoString) return 0;
    const preco = precoString
        .replace(/R\$\s*/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
    return parseFloat(preco) || 0;
}

async function atualizarSuperVale() {
    try {
        console.log('🔄 Iniciando atualização do SuperVale...');
        console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}\n`);

        await connectDB();

        // Buscar supermercado
        const supermercado = await Supermercado.findOne({ slug: 'supervale' });
        if (!supermercado) {
            throw new Error('Supermercado SuperVale não encontrado no banco');
        }

        // Carregar produtos do JSON (resultado do scraper)
        const productsPath = path.join(__dirname, '../../scraper/products.json');
        console.log(`📂 Carregando produtos de: ${productsPath}`);
        const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        console.log(`📦 Total de produtos no scraper: ${productsData.length}\n`);

        // Estatísticas
        let novos = 0;
        let atualizados = 0;
        let precosMudaram = 0;
        let erros = 0;

        console.log('🔍 Processando produtos...\n');

        for (const p of productsData) {
            try {
                const preco = extrairPreco(p.price);
                const nomeNormalizado = Produto.normalizarNome(p.name);

                // Extrair ID do produto da URL
                const urlMatch = p.url?.match(/\/produto\/(\d+)\//);
                const produtoId = urlMatch ? urlMatch[1] : null;

                if (!produtoId) {
                    console.log(`⚠️  Produto sem ID: ${p.name}`);
                    erros++;
                    continue;
                }

                // Buscar categoria
                const categoria = await Categoria.findOne({
                    'mapeamentos.supermercado': 'supervale',
                    'mapeamentos.nomeOriginal': p.department
                });

                // Buscar produto existente
                const produtoExistente = await Produto.findOne({
                    supermercado: 'supervale',
                    produtoId: produtoId
                });

                if (produtoExistente) {
                    // Produto existe - verificar se preço mudou
                    if (produtoExistente.preco !== preco) {
                        // Preço mudou!
                        console.log(`💰 Preço alterado: ${p.name}`);
                        console.log(`   De: R$ ${produtoExistente.preco.toFixed(2)} → Para: R$ ${preco.toFixed(2)}`);

                        // Atualizar produto e adicionar ao histórico
                        await Produto.updateOne(
                            { _id: produtoExistente._id },
                            {
                                $set: {
                                    preco: preco,
                                    precoOriginal: p.price,
                                    nome: p.name,
                                    nomeNormalizado: nomeNormalizado,
                                    imagem: p.image,
                                    url: p.url,
                                    disponivel: true,
                                    ultimaAtualizacao: new Date()
                                },
                                $push: {
                                    historico: {
                                        preco: preco,
                                        data: new Date()
                                    }
                                }
                            }
                        );

                        precosMudaram++;
                    } else {
                        // Preço igual - apenas atualizar timestamp
                        await Produto.updateOne(
                            { _id: produtoExistente._id },
                            {
                                $set: {
                                    disponivel: true,
                                    ultimaAtualizacao: new Date()
                                }
                            }
                        );
                    }
                    atualizados++;
                } else {
                    // Produto novo - inserir
                    await Produto.create({
                        nome: p.name,
                        nomeNormalizado,
                        supermercado: 'supervale',
                        supermercadoId: supermercado._id,
                        categoria: p.department,
                        categoriaId: categoria?._id,
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
                    });

                    console.log(`✨ Novo produto: ${p.name} - R$ ${preco.toFixed(2)}`);
                    novos++;
                }
            } catch (error) {
                console.error(`❌ Erro ao processar ${p.name}:`, error.message);
                erros++;
            }
        }

        // Marcar produtos que não estão mais disponíveis
        const idsNoScraper = productsData
            .map(p => p.url?.match(/\/produto\/(\d+)\//)?.[1])
            .filter(id => id);

        const indisponiveis = await Produto.updateMany(
            {
                supermercado: 'supervale',
                produtoId: { $nin: idsNoScraper },
                disponivel: true
            },
            {
                $set: {
                    disponivel: false,
                    ultimaAtualizacao: new Date()
                }
            }
        );

        // Atualizar timestamp do supermercado
        await Supermercado.updateOne(
            { _id: supermercado._id },
            { $set: { ultimaAtualizacao: new Date() } }
        );

        console.log('\n✅ Atualização concluída!');
        console.log(`\n📊 Resumo:`);
        console.log(`   ✨ Novos produtos: ${novos}`);
        console.log(`   🔄 Atualizados: ${atualizados}`);
        console.log(`   💰 Preços alterados: ${precosMudaram}`);
        console.log(`   🚫 Marcados como indisponíveis: ${indisponiveis.modifiedCount}`);
        console.log(`   ❌ Erros: ${erros}`);
        console.log('');

        return {
            novos,
            atualizados,
            precosMudaram,
            indisponiveis: indisponiveis.modifiedCount,
            erros
        };
    } catch (error) {
        console.error('❌ Erro na atualização:', error);
        throw error;
    }
}

// Se executado diretamente
if (require.main === module) {
    atualizarSuperVale()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = atualizarSuperVale;
