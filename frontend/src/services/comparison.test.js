import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalSourceKey, comparisonGroups, comparisonMetadata, eligibleForRanking, matchAlternative, matchSimilar,
  matchConfidence, matchProduct, productProfile, promotionOf, unitOf, unitPrice
} from './comparison.js';

const product = (name, extras = {}) => ({
  name,
  department:'Mercearia',
  priceBasis:'unit',
  priceNumber:10,
  ultimaAtualizacao:'2026-09-23T12:00:00Z',
  disponivel:true,
  ...extras
});

test('normaliza e extrai os atributos centrais do produto', () => {
  const profile = productProfile(product('Oferta Arroz Tio João Tipo 1 5 kg'));
  assert.equal(profile.brand, 'tio joao');
  assert.equal(profile.type, 'arroz');
  assert.deepEqual(profile.quantity, {value:5, unit:'kg', pack:1, token:'5 kg'});
  assert.deepEqual(profile.variant, ['tipo1']);
  assert.equal(unitOf('Leite 1000ml').value, 1);
});

test('mesmo produto recebe confiança certa e chave canônica estável', () => {
  const left = product('Arroz Tio João 5kg');
  const right = product('Tio João Arroz 5 Kg');
  assert.equal(matchProduct(left, right).level, 'certain');
  assert.equal(canonicalSourceKey(left), canonicalSourceKey(right));
  assert.ok(matchConfidence(left, right).score >= 95);
});

test('correspondência provável fica entre 80 e 94', () => {
  const left = product('Biscoito Chocolate Marcaex 100g');
  const right = product('Marcaex Biscoito Chocolate 100g');
  const match = matchProduct(left, right);
  assert.equal(match.level, 'probable');
  assert.ok(match.score >= 80 && match.score < 95);
});

test('marca, categoria e variante incompatíveis bloqueiam comparação', () => {
  assert.equal(matchProduct(product('Arroz Camil 5kg'), product('Arroz Tio João 5kg')).level, 'rejected');
  assert.equal(matchProduct(product('Leite Italac Integral 1L'), product('Leite Italac Desnatado 1L')).level, 'rejected');
  assert.equal(matchProduct(product('Arroz Camil 5kg'), product('Arroz Camil 5kg', {department:'Animais'})).level, 'rejected');
});

test('tamanhos diferentes do mesmo produto são similares pelo preço por unidade', () => {
  const five = product('Arroz Camil 5kg', {priceNumber:20});
  const one = product('Arroz Camil 1kg', {priceNumber:5});
  const match = matchSimilar(five, one);
  assert.equal(match.level, 'similar');
  assert.equal(match.unitComparisonEligible, true);
  assert.equal(unitPrice(five).price, 4);
  assert.equal(unitPrice(one).price, 5);
});

test('metadados persistidos direcionam similares, alternativas e preço unitário', () => {
  const beer = comparisonMetadata(product('Cerveja Heineken 350ml', {department:'Bebidas',priceNumber:3.5}));
  const competingBeer = comparisonMetadata(product('Cerveja Amstel 473ml', {department:'Bebidas',priceNumber:4.5}));
  assert.match(beer.similarityKey,/cerveja.*heineken/);
  assert.equal(beer.alternativeFamilyKey,competingBeer.alternativeFamilyKey);
  assert.equal(beer.unitPrice.unit,'L');
  assert.equal(Number(beer.unitPrice.value.toFixed(2)),10);

  const fruit = comparisonMetadata(product('Banana Prata', {department:'Hortifruti',priceBasis:'kg',priceNumber:5}));
  assert.equal(fruit.alternativeFamilyKey,'hortifruti:fruit');
});

test('grupos separam mesmo produto, similares e alternativas', () => {
  const selected = product('Arroz Camil 5kg', {id:'a', supermercado:'a'});
  const certain = product('Camil Arroz 5kg', {id:'b', supermercado:'b'});
  const similar = product('Arroz Camil 1kg', {id:'c', supermercado:'c'});
  const alternative = product('Arroz Tio João 5kg', {id:'d', supermercado:'d'});
  const groups = comparisonGroups(selected, [selected, certain, similar, alternative]);
  assert.deepEqual(Object.keys(groups), ['sameProduct','similar','alternatives']);
  assert.equal(groups.sameProduct.length, 1);
  assert.equal(groups.similar.length, 1);
  assert.equal(groups.alternatives.length, 1);
});

test('frutas diferentes são alternativas e a mesma fruta é similar', () => {
  const selected = product('Abacate', {department:'Hortifruti', priceBasis:'kg', priceNumber:3});
  const sameFruit = product('Abacate Hass', {department:'Hortifruti', priceBasis:'kg', priceNumber:4});
  const otherFruit = product('Banana Prata', {department:'Hortifruti', priceBasis:'kg', priceNumber:5});
  assert.equal(matchSimilar(selected, sameFruit).level, 'similar');
  assert.equal(matchAlternative(selected, otherFruit).level, 'alternative');
});

test('produto processado com nome de fruta não vira alternativa fresca', () => {
  const selected = product('Abacate', {department:'Hortifruti', priceBasis:'kg', priceNumber:3});
  const snack = product('Banana DaColonia Zero 180g', {department:'Hortifruti', priceNumber:15});
  const frozen = product('Abacaxi Picado Congelado 500g', {department:'Hortifruti', priceNumber:19});
  assert.equal(matchAlternative(selected, snack).level, 'rejected');
  assert.equal(matchAlternative(selected, frozen).level, 'rejected');
});

test('cerveja da mesma marca é similar e de outra marca é alternativa', () => {
  const selected = product('Cerveja Heineken 350ml', {department:'Bebidas'});
  const sameBrand = product('Cerveja Heineken 473ml', {department:'Bebidas'});
  const otherBrand = product('Cerveja Amstel 350ml', {department:'Bebidas'});
  assert.equal(matchSimilar(selected, sameBrand).level, 'similar');
  assert.equal(matchAlternative(selected, otherBrand).level, 'alternative');
});

test('marcas de cerveja impedem que concorrentes virem o mesmo produto', () => {
  const antarctica = product('Cerveja Antarctica Lata 350ml', {department:'Bebidas'});
  const bohemia = product('Cerveja Bohemia Lata 350ml', {department:'Bebidas'});
  assert.equal(productProfile(antarctica).brand, 'antarctica');
  assert.equal(productProfile(bohemia).brand, 'bohemia');
  assert.equal(matchProduct(antarctica, bohemia).level, 'rejected');
  assert.equal(matchAlternative(antarctica, bohemia).level, 'alternative');
});

test('linha diferente da mesma cerveja fica em similares, não no mesmo produto', () => {
  const regular = product('Cerveja Antarctica Lata 350ml', {department:'Bebidas'});
  const original = product('Cerveja Antarctica Original Lata 350ml', {department:'Bebidas'});
  assert.equal(matchProduct(regular, original).level, 'rejected');
  assert.equal(matchSimilar(regular, original).level, 'similar');
  assert.equal(matchAlternative(regular, original).level, 'rejected');
});

test('limpeza e congelados usam o mesmo modelo de similares e alternativas', () => {
  const detergent = product('Detergente Ypê Neutro 500ml', {department:'Limpeza'});
  const detergentLarge = product('Detergente Ypê Neutro 1L', {department:'Limpeza'});
  const competingDetergent = product('Detergente Minuano Neutro 500ml', {department:'Limpeza'});
  const disinfectant = product('Desinfetante Minuano 500ml', {department:'Limpeza'});
  assert.equal(matchSimilar(detergent, detergentLarge).level, 'similar');
  assert.equal(matchAlternative(detergent, competingDetergent).level, 'alternative');
  assert.equal(matchAlternative(detergent, disinfectant).level, 'rejected');

  const pizza = product('Pizza Seara Calabresa 460g', {department:'Congelados'});
  const competingPizza = product('Pizza Sadia Calabresa 460g', {department:'Congelados'});
  const lasagna = product('Lasanha Sadia Bolonhesa 460g', {department:'Congelados'});
  assert.equal(matchAlternative(pizza, competingPizza).level, 'alternative');
  assert.equal(matchAlternative(pizza, lasagna).level, 'alternative');
});

test('hortifruti separa frutas e vegetais em famílias de alternativas', () => {
  const potato = product('Batata Inglesa 1kg', {department:'Hortifruti', priceBasis:'kg'});
  const carrot = product('Cenoura 1kg', {department:'Hortifruti', priceBasis:'kg'});
  const orange = product('Laranja Pera 1kg', {department:'Hortifruti', priceBasis:'kg'});
  assert.equal(matchAlternative(potato, carrot).level, 'alternative');
  assert.equal(matchAlternative(potato, orange).level, 'rejected');
});

test('hortifruti igual em outra variedade ou embalagem é similar, não alternativa', () => {
  const japanese = product('Abóbora Japonesa', {department:'Hortifruti', priceBasis:'kg', priceNumber:6.75});
  const packaged = product('Abóbora Cabotiá La Vita 400g', {department:'Hortifruti', priceBasis:'unit', priceNumber:7.99});
  const carrot = product('Cenoura 1kg', {department:'Hortifruti', priceBasis:'kg', priceNumber:5});
  assert.equal(matchSimilar(japanese, packaged).level, 'similar');
  assert.equal(matchAlternative(japanese, packaged).level, 'rejected');
  assert.equal(matchAlternative(japanese, carrot).level, 'alternative');
});

test('hortifruti processado não aparece como similar ou alternativa fresca', () => {
  const pineapple = product('Abacaxi 1kg', {department:'Hortifruti', priceBasis:'kg'});
  const frozen = product('Abacaxi Picado Congelado 500g', {department:'Hortifruti'});
  assert.equal(matchSimilar(pineapple, frozen).level, 'rejected');
  assert.equal(matchAlternative(pineapple, frozen).level, 'rejected');
});

test('carrosséis são limitados aos 24 resultados mais baratos por unidade', () => {
  const selected = product('Cerveja Antarctica Lata 350ml', {id:'selected', supermercado:'a', department:'Bebidas'});
  const alternatives = Array.from({length:30}, (_, index) => product(`Cerveja Marca${index} Lata 350ml`, {
    id:`beer-${index}`, supermercado:`market-${index}`, department:'Bebidas', priceNumber:30 - index
  }));
  const groups = comparisonGroups(selected, alternatives);
  assert.equal(groups.alternatives.length, 24);
  assert.equal(groups.alternatives[0].priceNumber, 1);
});

test('regra genérica de alternativas cobre todas as categorias normalizadas', () => {
  const cases = [
    ['Animais', 'Ração Pedigree para Cão 1kg', 'Ração Purina para Cão 1kg'],
    ['Bazar e utilidades', 'Esponja Ypê 3 unidades', 'Esponja Minuano 3 unidades'],
    ['Bebidas', 'Refrigerante Coca Cola 2L', 'Refrigerante Pepsi 2L'],
    ['Biscoitos e chocolates', 'Chocolate Lacta 90g', 'Chocolate Garoto 90g'],
    ['Carnes', 'Salsicha Sadia 500g', 'Salsicha Perdigão 500g'],
    ['Cereais e farináceos', 'Arroz Camil 5kg', 'Arroz Tio João 5kg'],
    ['Congelados', 'Pizza Seara 460g', 'Pizza Sadia 460g'],
    ['Frios e laticínios', 'Iogurte Danone 170g', 'Iogurte Vigor 170g'],
    ['Limpeza', 'Lava Roupas Omo 1L', 'Lava Roupas Minuano 1L'],
    ['Matinais e sobremesas', 'Achocolatado Nescau 400g', 'Achocolatado Toddy 400g'],
    ['Mercearia', 'Macarrão Renata 500g', 'Macarrão Adria 500g'],
    ['Padaria', 'Pão Nutrella 500g', 'Pão Bauducco 500g'],
    ['Perfumaria e higiene', 'Shampoo Seda 400ml', 'Shampoo Pantene 400ml'],
    ['Saude e bem estar', 'Adoçante Zero Cal 100ml', 'Adoçante Linea 100ml']
  ];
  for (const [department, leftName, rightName] of cases) {
    assert.equal(matchAlternative(product(leftName, {department}), product(rightName, {department})).level, 'alternative', department);
  }
});

test('famílias funcionais ampliam alternativas sem misturar categorias inteiras', () => {
  const surfaceCleaner = product('Limpador Veja 500ml', {department:'Limpeza'});
  const disinfectant = product('Desinfetante Minuano 500ml', {department:'Limpeza'});
  const fabricSoftener = product('Amaciante Minuano 500ml', {department:'Limpeza'});
  assert.equal(matchAlternative(surfaceCleaner, disinfectant).level, 'alternative');
  assert.equal(matchAlternative(surfaceCleaner, fabricSoftener).level, 'rejected');

  const bread = product('Pão Nutrella 500g', {department:'Padaria'});
  const baguette = product('Baguete Bauducco 500g', {department:'Padaria'});
  const cake = product('Bolo Bauducco 500g', {department:'Padaria'});
  assert.equal(matchAlternative(bread, baguette).level, 'alternative');
  assert.equal(matchAlternative(bread, cake).level, 'rejected');
});

test('promoções são estruturadas e ficam fora do preço normal', () => {
  const bundle = product('Arroz Camil 1kg Leve 3 Pague 2');
  assert.deepEqual(promotionOf(bundle), {
    type:'bundle', label:'Leve mais, pague menos', requiredQuantity:3, paidQuantity:2,
    text:'Arroz Camil 1kg Leve 3 Pague 2'
  });
  assert.equal(unitPrice(bundle), null);
  assert.equal(eligibleForRanking(bundle, Date.parse('2026-09-23T13:00:00Z')), false);
});

test('ranking normal exige disponibilidade, unidade e coleta recente', () => {
  const normal = product('Arroz Camil 5kg');
  const now = Date.parse('2026-09-23T13:00:00Z');
  assert.equal(eligibleForRanking(normal, now), true);
  assert.equal(eligibleForRanking({...normal, disponivel:false}, now), false);
  assert.equal(eligibleForRanking({...normal, priceBasis:'unknown'}, now), false);
  assert.equal(eligibleForRanking({...normal, ultimaAtualizacao:'2026-09-01'}, now), false);
});
