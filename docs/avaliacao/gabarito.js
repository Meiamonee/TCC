// Calcula o gabarito do teste de tempo: o preco de cada item da lista nos 4 mercados e o total
// de cada mercado, no momento em que roda. Rode no dia do teste, logo antes de comecar, e anote
// o mercado mais barato na ficha do avaliador.
// Uso: node docs/avaliacao/gabarito.js [url-da-api]
const API = process.argv[2] || 'https://superpreco-api.onrender.com/api';
const NOMES = { supervale: 'SuperVale', vilasul: 'Vila Sul', sanmichel: 'San Michel', pedrilho: 'Pedrilho' };

// Itens da tarefa (os mesmos da ficha): busca + palavras que o nome precisa ter.
const ITENS = [
    ['Arroz Super Ecco tipo 1, 5 kg', 'arroz super ecco 5kg'],
    ['Feijão carioca Du Irineu, 1 kg', 'feijao carioca irineu'],
    ['Açúcar refinado União, 1 kg', 'acucar refinado uniao 1kg'],
    ['Café 3 Corações tradicional, 500 g', 'cafe tradicional 3 coracoes 500g'],
    ['Óleo de soja Liza, 900 ml', 'oleo soja liza 900ml'],
    ['Leite integral Itambé, 1 L', 'leite integral itambe'],
    ['Macarrão espaguete nº 8 Galo, 500 g', 'espaguete 8 galo 500g'],
    ['Farinha de trigo Renata, 1 kg', 'farinha trigo tipo 1 tradicional renata 1kg'],
    ['Sal refinado Cisne, 1 kg', 'sal refinado cisne 1kg'],
    ['Margarina Doriana com sal, 500 g', 'margarina doriana 500g']
];

const buscar = caminho => fetch(API + caminho).then(resposta => resposta.json());

(async () => {
    const totais = Object.fromEntries(Object.keys(NOMES).map(mercado => [mercado, 0]));
    const faltando = Object.fromEntries(Object.keys(NOMES).map(mercado => [mercado, []]));
    for (const [item, busca] of ITENS) {
        const { data } = await buscar(`/produtos?search=${encodeURIComponent(busca)}&limit=20`);
        // Usa o primeiro resultado que tenha o mesmo produto no maior numero de mercados.
        let melhor = [];
        for (const produto of data) {
            const { equivalentes = [] } = await buscar(`/produtos/${produto.id}/comparacao`);
            if (equivalentes.length > melhor.length) melhor = equivalentes;
            if (melhor.length === 4) break;
        }
        const precos = Object.fromEntries(melhor.map(p => [p.supermercado, p.priceNumber]));
        for (const mercado of Object.keys(NOMES)) {
            if (precos[mercado] == null) faltando[mercado].push(item);
            else totais[mercado] += precos[mercado];
        }
        console.log(item.padEnd(38), `[${melhor[0]?.name ?? '?'}]`, Object.keys(NOMES).map(m => `${NOMES[m]} ${precos[m]?.toFixed(2) ?? '—'}`).join('  '));
    }
    console.log('\nTotal da lista:');
    Object.entries(totais).sort((a, b) => a[1] - b[1]).forEach(([mercado, total]) => {
        const aviso = faltando[mercado].length ? `  (sem: ${faltando[mercado].join(', ')})` : '';
        console.log(`  ${NOMES[mercado].padEnd(11)} R$ ${total.toFixed(2).replace('.', ',')}${aviso}`);
    });
})();
