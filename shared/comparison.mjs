import brands from './brands.json' with { type: 'json' };
import brandAliases from './brand-aliases.json' with { type: 'json' };
import generatedBrandAliases from './brand-aliases.generated.json' with { type: 'json' };
import categories from './categories.json' with { type: 'json' };

export const normalize = value => String(value || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/\bs\s*\/\s*sal\b/g, 'sem sal')
  .replace(/\bc\s*\/\s*sal\b/g, 'com sal').replace(/([a-z])\.([a-z])/g, '$1 $2')
  .replace(/[^a-z0-9\s.,%]/g, ' ').replace(/\s+/g, ' ').trim();

const cleanName = value => normalize(value)
  .replace(/\bleve\s+\d+\s+(?:e\s+)?pague\s+\d+\b/g, ' ')
  .replace(/\b(?:oferta|promocao|promocional|cashback|clube)\b/g, ' ')
  .replace(/\bachoc\b/g, 'achocolatado').replace(/\bacuc\b/g, 'acucar')
  .replace(/\bcilindrico\b/g, 'cilindro').replace(/\btp\s*([12])\b/g, 'tipo$1')
  .replace(/\btipo\s*([12])\b/g, 'tipo$1').replace(/\btres coracoes\b/g, '3 coracoes')
  .replace(/(\d)\s*lt\b/g, '$1l').replace(/\blt\b/g, 'l').replace(/\s+/g, ' ').trim();

export const categoryOf = value => categories[normalize(value)] || value || 'Sem categoria';
export const priceOf = product => typeof product.priceNumber === 'number' ? product.priceNumber
  : Number(String(product.price || '').replace(/[^\d,]/g, '').replace(',', '.'));
export const money = value => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(value);

const brandTerms = [
  ...brands.map(brand => ({brand:normalize(brand), alias:normalize(brand)})),
  ...Object.entries({...generatedBrandAliases, ...brandAliases})
    .flatMap(([brand, aliases]) => aliases.map(alias => ({brand:normalize(brand), alias:normalize(alias)})))
];
const sortedBrands = [...new Map(brandTerms.map(item => [item.alias, item])).values()]
  .sort((a, b) => b.alias.length - a.alias.length);
const whole = (text, term) => (` ${text} `).includes(` ${term} `);

const promotionLabels = {bundle:'Leve mais, pague menos', club:'Preço de clube', cashback:'Cashback', discount:'Promoção'};
export function promotionOf(product) {
  if (product && typeof product === 'object' && product.promotion?.type) {
    return {...product.promotion, label:product.promotion.label || promotionLabels[product.promotion.type] || 'Condição especial'};
  }
  const source = typeof product === 'string' ? product : `${product?.name || ''} ${product?.priceConditions || ''}`;
  const text = normalize(source);
  const bundle = text.match(/\bleve\s+(\d+).*?\bpague\s+(\d+)\b/);
  if (bundle) return {type:'bundle', label:promotionLabels.bundle, requiredQuantity:Number(bundle[1]), paidQuantity:Number(bundle[2]), text:source.trim()};
  if (/\bcashback\b/.test(text)) return {type:'cashback', label:promotionLabels.cashback, text:source.trim()};
  if (/\bclube\b/.test(text)) return {type:'club', label:promotionLabels.club, text:source.trim()};
  if (/\b(?:oferta|promocao|promocional)\b/.test(text) || (typeof product === 'object' && product?.priceConditions)) {
    return {type:'discount', label:promotionLabels.discount, text:source.trim()};
  }
  return null;
}

export function unitOf(name) {
  const text = cleanName(name).replace(/\b(?:qtd\s*)?(?:aprox|aprx|aproximadamente)\s*[.,]?\s*\d+(?:[.,]\d+)?\s*(?:un(?:idades?)?|unid|und)\b/g, ' ');
  if (/\bleve\s*\d+.*\bpague\b/.test(normalize(name))) return null;
  const matches = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|gr(?:amas?)?|g|ml|litros?|l|un(?:idades?)?)\b/g)];
  if (matches.length !== 1) return null;
  const match = matches[0];
  const amount = Number(match[1].replace(',', '.'));
  const unit = /kg|gr|^g$/.test(match[2]) ? 'kg' : /ml|litro|^l$/.test(match[2]) ? 'L' : 'un';
  const value = amount * (/^(g|gr|gramas?|ml)$/.test(match[2]) ? .001 : 1);
  const packMatch = text.match(/(?:\b(?:c|com|pack|kit)\s*(\d+)\b|\b(\d+)\s*x\s*\d)/);
  const pack = unit !== 'un' && packMatch ? Number(packMatch[1] || packMatch[2]) : 1;
  return value > 0 ? {value, unit, pack, token:match[0]} : null;
}

export function validGtin(value) {
  const code = String(value || '');
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code) || /^(\d)\1+$/.test(code)) return false;
  const digits = code.slice(0, -1).split('').reverse();
  const sum = digits.reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === Number(code.at(-1));
}

const packagingOf = text => text.match(/\b(?:lata|sache|pacote|caixa|pote|garrafa|frasco|bandeja)\b/)?.[0] || null;
const variantGroups = [
  ['integral','desnatado','semidesnatado'], ['zero','diet','light','tradicional'], ['po','liquido'],
  ['graos','moido','soluvel'], ['branco','parboilizado'], ['tipo1','tipo2'], ['descafeinado'],
  ['sem sal','com sal'], ['lactose'], ['original','subzero'],
  ['puro malte','malzbier','ipa','stout','weiss','witbier']
];
// A ordem importa: nomes compostos vêm antes dos termos genéricos.
const productTypes = [
  'agua tonica','agua de coco','agua sanitaria','agua mineral','lava roupas','lava loucas',
  'papel higienico','papel toalha','creme dental','escova dental','pao de queijo','leite fermentado',
  'creme de leite','molho de tomate','palha de aco','saco de lixo','papel aluminio','filme pvc',
  'alimento para gato','alimento gato','alim gato','racao para gato','racao gato',
  'alimento para cao','alimento cao','alim cao','racao para cao','racao cao',
  'cerveja','refrigerante','suco','nectar','vinho','espumante','whisky','vodka','cachaca','gin','energetico','isotonico','agua',
  'detergente','desinfetante','amaciante','alvejante','limpador','multiuso','sabao','esponja','inseticida',
  'pizza','lasanha','hamburguer','nugget','empanado','sorvete','acai','polpa','steak',
  'banana','maca','laranja','abacate','mamao','pera','uva','manga','melancia','melao','morango','limao','kiwi','abacaxi',
  'batata','tomate','cebola','cenoura','beterraba','mandioca','abobora','abobrinha','berinjela','pepino','pimentao','brocolis','couve flor','alface','couve','repolho','rucula','chuchu','inhame','quiabo','vagem','nabo','agriao','escarola','acelga',
  'arroz','leite','cafe','achocolatado','iogurte','chocolate','farinha','amendoim','salsicha','feijao','acucar','oleo','macarrao','biscoito','bolacha','molho',
  'queijo','presunto','mussarela','manteiga','margarina','requeijao',
  'shampoo','condicionador','sabonete','desodorante','fralda','absorvente',
  'racao','petisco','areia sanitaria','frango','linguica','costela','picanha','acem','carne','peixe',
  'baguete','pao','bolo','torta','rosca','broa','sonho',
  'lampada','pilha','vela','copo','prato','talher','filtro','fosforo','isqueiro','pano','vassoura','rodo','balde','assadeira','panela','abracadeira',
  'vitamina','suplemento','colageno','adocante'
];
const typeAliases = new Map([
  ...['alimento para gato','alimento gato','alim gato','racao para gato','racao gato'].map(value => [value, 'racao gato']),
  ...['alimento para cao','alimento cao','alim cao','racao para cao','racao cao'].map(value => [value, 'racao cao'])
]);
const fruitTypes = new Set(['banana','maca','laranja','abacate','mamao','pera','uva','manga','melancia','melao','morango','limao','kiwi','abacaxi']);
const vegetableTypes = new Set(['batata','tomate','cebola','cenoura','beterraba','mandioca','abobora','abobrinha','berinjela','pepino','pimentao','brocolis','couve flor','alface','couve','repolho','rucula','chuchu','inhame','quiabo','vagem','nabo','agriao','escarola','acelga']);
const processedFruit = /\b(?:passa|desidrat\w*|congelad\w*|picad\w*|polpa|suco|geleia|compota|doce|chips|snack|barra|zero)\b/;
const produceGroup = profile => fruitTypes.has(profile.type) ? 'fruit' : vegetableTypes.has(profile.type) ? 'vegetable' : null;
const freshProduce = (product, profile) => profile.category === 'Hortifruti' && produceGroup(profile)
  && !processedFruit.test(profile.normalizedName)
  && (product.priceBasis === 'kg' || (profile.quantity?.unit === 'kg' && profile.quantity.value >= .2));
const stopWords = new Set(['de','do','da','dos','das','com','para','em','e','tipo','produto']);
const familyOf = category => ['Mercearia','Cereais e farináceos','Matinais e sobremesas'].includes(category) ? 'Mercearia' : category;
const sameCategory = (left, right) => familyOf(left) === familyOf(right);
const alternativeFamilyEntries = [
  ['cervejas', ['cerveja']],
  ['refrigerantes e tônicas', ['refrigerante','agua tonica']],
  ['sucos e néctares', ['suco','nectar','agua de coco']],
  ['vinhos e espumantes', ['vinho','espumante']],
  ['destilados', ['whisky','vodka','cachaca','gin']],
  ['limpeza de louças', ['detergente','lava loucas']],
  ['limpeza de superfícies', ['desinfetante','limpador','multiuso']],
  ['refeições congeladas', ['pizza','lasanha']],
  ['proteínas congeladas', ['hamburguer','nugget','empanado','steak']],
  ['sobremesas congeladas', ['sorvete','acai']],
  ['pães', ['baguete','pao','rosca','broa']],
  ['cortes bovinos', ['costela','picanha','acem','carne']],
  ['embutidos', ['salsicha','linguica']],
  ['queijos', ['queijo','mussarela']],
  ['biscoitos', ['biscoito','bolacha']],
  ['suplementos', ['vitamina','suplemento','colageno']]
];
const alternativeFamilyByType = new Map(alternativeFamilyEntries.flatMap(([family, types]) => types.map(type => [type, family])));
const alternativeFamilyOf = profile => alternativeFamilyByType.get(profile.type) || `${familyOf(profile.category)}:${profile.type}`;
const alternativeFamilyLabel = profile => alternativeFamilyByType.get(profile.type) || profile.type;
const quantityEqual = (left, right) => !!left && !!right && left.unit === right.unit
  && Math.abs(left.value - right.value) < 1e-6 && left.pack === right.pack;

export function productProfile(product) {
  const text = cleanName(product.name);
  const quantity = unitOf(product.name);
  const brandMatch = sortedBrands.find(item => whole(text, item.alias)) || null;
  const brand = brandMatch?.brand || null;
  const stripped = text.replace(quantity?.token || /$^/, ' ').replace(brandMatch?.alias || /$^/, ' ');
  const tokens = stripped.split(/\s+/).filter(token => token.length > 1 && !stopWords.has(token)).sort();
  const detectedType = productTypes.find(candidate => whole(text, candidate));
  const type = typeAliases.get(detectedType) || detectedType || tokens.find(token => /^[a-z]{4,}$/.test(token)) || null;
  const variant = variantGroups.flatMap(group => group.filter(item => whole(text, item))).sort();
  return {normalizedName:text, brand, category:categoryOf(product.department), type, quantity, variant,
    packaging:packagingOf(text), tokens, promotion:promotionOf(product)};
}

export const attributes = productProfile;

const editSimilarity = (left, right) => {
  if (left === right) return 1;
  if (left.length < 4 || right.length < 4 || /\d/.test(left + right)) return 0;
  let previous = Array.from({length:right.length + 1}, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(left[i - 1] !== right[j - 1]));
    previous = current;
  }
  const score = 1 - previous[right.length] / Math.max(left.length, right.length);
  return score >= .8 ? score : 0;
};

const tokenSimilarity = (left, right) => {
  if (!left.length || !right.length) return 0;
  const a = [...new Set(left)], b = [...new Set(right)], used = new Set();
  let total = 0;
  for (const token of a) {
    let best = 0, index = -1;
    for (let i = 0; i < b.length; i++) if (!used.has(i)) {
      const score = editSimilarity(token, b[i]);
      if (score > best) { best = score; index = i; }
    }
    if (index >= 0) { used.add(index); total += best; }
  }
  return total / Math.max(a.length, b.length);
};

const weightsFor = profile => profile.category === 'Hortifruti'
  ? {name:.4, brand:0, quantity:.2, category:.3, variant:.1}
  : ['leite','iogurte'].includes(profile.type)
    ? {name:.2, brand:.2, quantity:.3, category:.1, variant:.2}
    : {name:.3, brand:.25, quantity:.2, category:.15, variant:.1};

export function matchConfidence(left, right) {
  const a = productProfile(left), b = productProfile(right), weights = weightsFor(a);
  const factors = {
    name:tokenSimilarity(a.tokens, b.tokens),
    brand:a.category === 'Hortifruti' ? 1 : a.brand && b.brand ? Number(a.brand === b.brand) : !a.brand && !b.brand ? .6 : .5,
    quantity:quantityEqual(a.quantity, b.quantity) ? 1 : !a.quantity && !b.quantity ? .5 : 0,
    category:a.category === b.category ? 1 : sameCategory(a.category, b.category) ? .8 : 0,
    variant:a.variant.join('|') === b.variant.join('|') ? 1 : 0
  };
  const score = Math.round(100 * Object.entries(weights).reduce((sum, [name, weight]) => sum + weight * factors[name], 0));
  return {score, level:score >= 95 ? 'certain' : score >= 80 ? 'probable' : 'rejected', factors};
}

const rejected = reason => ({level:'rejected', score:0, reason});

export function matchProduct(left, right) {
  if (left.canonicalProductId && left.canonicalProductId === right.canonicalProductId) return {level:'certain', score:100, reason:'Ofertas vinculadas ao mesmo produto canônico'};
  const a = productProfile(left), b = productProfile(right);
  const gtinA = left.gtin || left.ean, gtinB = right.gtin || right.ean;
  if (validGtin(gtinA) && validGtin(gtinB)) {
    if (String(gtinA).padStart(14, '0') !== String(gtinB).padStart(14, '0')) return rejected('Códigos de barras diferentes');
    if (a.quantity && b.quantity && !quantityEqual(a.quantity, b.quantity)) return rejected('Código igual, mas quantidade divergente');
    return {level:'certain', score:100, reason:'Mesmo código de barras válido'};
  }
  if (!sameCategory(a.category, b.category)) return rejected('Categorias diferentes');
  if (a.type && b.type && a.type !== b.type) return rejected('Tipos de produto diferentes');
  if (a.brand && b.brand && a.brand !== b.brand) return rejected('Marcas diferentes');
  if (a.variant.join('|') !== b.variant.join('|')) return rejected('Variante diferente');
  if (a.packaging && b.packaging && a.packaging !== b.packaging) return rejected('Embalagem diferente');
  if (a.quantity || b.quantity) {
    if (!quantityEqual(a.quantity, b.quantity)) return rejected('Peso, volume ou quantidade diferente');
  } else if (!(a.category === 'Hortifruti' && left.priceBasis === 'kg' && right.priceBasis === 'kg') && a.normalizedName !== b.normalizedName) {
    return rejected('Quantidade não identificada');
  }
  if (!a.brand && !b.brand && a.normalizedName !== b.normalizedName && tokenSimilarity(a.tokens, b.tokens) < .8) {
    return rejected('Descrição insuficiente para confirmar o mesmo produto');
  }
  const confidence = matchConfidence(left, right);
  if (confidence.score >= 95) return {level:'certain', score:confidence.score, reason:'Atributos e descrição coincidem'};
  if (confidence.score >= 80) return {level:'probable', score:confidence.score, reason:'Atributos compatíveis; confira a embalagem'};
  return rejected('Confiança abaixo de 80%');
}

export function unitPrice(product) {
  if (Number(product?.unitPrice?.value) > 0 && ['kg','L','un'].includes(product?.unitPrice?.unit)) {
    return {price:Number(product.unitPrice.value), unit:product.unitPrice.unit};
  }
  if (promotionOf(product)) return null;
  const price = priceOf(product);
  if (!Number.isFinite(price) || price <= 0 || product.priceBasis === 'unknown') return null;
  if (product.priceBasis === 'kg' || product.priceBasis === 'L') return {price, unit:product.priceBasis};
  const quantity = unitOf(product.name);
  return quantity ? {price:price / (quantity.value * quantity.pack), unit:quantity.unit} : null;
}

export function comparisonMetadata(product) {
  const profile = productProfile(product);
  const comparableUnitPrice = unitPrice({...product, unitPrice:null});
  const produceFamily = freshProduce(product, profile) ? produceGroup(profile) : null;
  const alternativeFamily = produceFamily
    ? `hortifruti:${produceFamily}`
    : profile.type
      ? `alternativa:${familyOf(profile.category)}:${alternativeFamilyByType.get(profile.type) || profile.type}`
      : null;
  return {
    similarityKey: profile.type
      ? ['similar', familyOf(profile.category), profile.type, profile.brand || 'sem-marca'].join('|')
      : null,
    alternativeFamilyKey: alternativeFamily,
    unitPrice: comparableUnitPrice
      ? {value:comparableUnitPrice.price, unit:comparableUnitPrice.unit}
      : null
  };
}

export function matchSimilar(left, right) {
  const a = productProfile(left), b = productProfile(right);
  if (!sameCategory(a.category, b.category) || !a.type || a.type !== b.type) return rejected('Finalidade diferente');
  if (a.brand && b.brand && a.brand !== b.brand) return rejected('Marcas diferentes');
  const leftUnit = unitPrice(left), rightUnit = unitPrice(right);
  if (!leftUnit || !rightUnit || leftUnit.unit !== rightUnit.unit) return rejected('Preço por unidade não disponível');
  if (a.category === 'Hortifruti') {
    if (!freshProduce(left, a) || !freshProduce(right, b)) return rejected('Não são duas apresentações frescas comparáveis');
    return {level:'similar', score:95, reason:'Mesmo hortifruti em outra variedade ou apresentação', unitComparisonEligible:true};
  }
  const quantityDiffers = !!a.quantity && !!b.quantity && a.quantity.unit === b.quantity.unit && !quantityEqual(a.quantity, b.quantity);
  const variantDiffers = a.variant.join('|') !== b.variant.join('|');
  const packagingDiffers = !!a.packaging && !!b.packaging && a.packaging !== b.packaging;
  const sameKnownBrand = !!a.brand && a.brand === b.brand;
  if (sameKnownBrand && (quantityDiffers || variantDiffers || packagingDiffers)) {
    return {level:'similar', score:90, reason:'Mesmo tipo e marca em outra apresentação; compare o preço por unidade', unitComparisonEligible:true};
  }
  if (variantDiffers) return rejected('Variante diferente');
  if (packagingDiffers) return rejected('Embalagem diferente');
  if (!quantityDiffers) return rejected('Não é uma alternativa de tamanho');
  if (tokenSimilarity(a.tokens, b.tokens) < .7) return rejected('Descrições pouco semelhantes');
  const score = Math.max(80, Math.min(94, matchConfidence(left, right).score + 20));
  return {level:'similar', score, reason:'Mesmo produto em outro tamanho; compare o preço por unidade', unitComparisonEligible:true};
}

export function matchAlternative(left, right) {
  const a = productProfile(left), b = productProfile(right);
  if (!sameCategory(a.category, b.category)) return rejected('Categorias diferentes');
  const leftUnit = unitPrice(left), rightUnit = unitPrice(right);
  if (!leftUnit || !rightUnit || leftUnit.unit !== rightUnit.unit) return rejected('Unidade incompatível para alternativa');
  if (a.category === 'Hortifruti') {
    if (!freshProduce(left, a) || !freshProduce(right, b)) return rejected('Alternativa não pertence ao hortifruti fresco');
    if (a.type === b.type) return rejected('É o mesmo hortifruti em outra apresentação');
    if (produceGroup(a) !== produceGroup(b)) return rejected('Grupos de hortifruti diferentes');
    const label = produceGroup(a) === 'fruit' ? 'Outra fruta' : 'Outro vegetal';
    return {level:'alternative', score:100, reason:`${label}; compare o preço por kg`, unitComparisonEligible:true};
  }
  if (!a.type || !b.type || alternativeFamilyOf(a) !== alternativeFamilyOf(b)) return rejected('Famílias funcionais diferentes');
  const sameType = a.type === b.type;
  if (sameType && a.brand && b.brand && a.brand === b.brand) return rejected('É produto similar, não alternativa');
  if (sameType && a.variant.length && b.variant.length && a.variant.join('|') !== b.variant.join('|')) return rejected('Variante incompatível');
  const familyLabel = alternativeFamilyLabel(a);
  return {
    level:'alternative',
    score:sameType ? 90 : 85,
    reason:sameType && a.brand && b.brand && a.brand !== b.brand
      ? `Outra marca de ${a.type}; compare o preço por ${leftUnit.unit}`
      : `Outra opção de ${familyLabel}; compare o preço por ${leftUnit.unit}`,
    unitComparisonEligible:true
  };
}

export function comparisonGroups(selected, products) {
  const groups = {sameProduct:[], similar:[], alternatives:[]}, seen = new Set();
  for (const product of products) {
    if (product.id === selected.id || product.supermercado === selected.supermercado) continue;
    const key = [product.supermercado, normalize(product.name), priceOf(product), product.priceBasis || 'unknown'].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    let match = matchProduct(selected, product);
    if (match.level === 'certain' || match.level === 'probable') {
      groups.sameProduct.push({...product, match});
      continue;
    }
    match = matchSimilar(selected, product);
    if (match.level === 'similar') {
      groups.similar.push({...product, match});
      continue;
    }
    match = matchAlternative(selected, product);
    if (match.level === 'alternative') groups.alternatives.push({...product, match});
  }
  const relationOrder = (left, right) => Number(right.disponivel !== false) - Number(left.disponivel !== false)
    || (unitPrice(left)?.price ?? Infinity) - (unitPrice(right)?.price ?? Infinity)
    || priceOf(left) - priceOf(right);
  groups.similar.sort(relationOrder);
  groups.alternatives.sort(relationOrder);
  groups.similar = groups.similar.slice(0, 24);
  groups.alternatives = groups.alternatives.slice(0, 24);
  return groups;
}

export function canonicalSourceKey(product) {
  const gtin = product.gtin || product.ean;
  if (validGtin(gtin)) return `gtin:${String(gtin).padStart(14, '0')}`;
  const profile = productProfile(product);
  if (!profile.type) return null;
  const quantity = profile.quantity ? `${profile.quantity.value}:${profile.quantity.unit}:${profile.quantity.pack}`
    : profile.category === 'Hortifruti' && product.priceBasis === 'kg' ? 'por-kg' : null;
  if (!quantity) return null;
  return ['product', familyOf(profile.category), profile.type, profile.brand || '', quantity,
    profile.variant.join(','), profile.packaging || '', profile.tokens.join(',')].join('|');
}

export function comparisonKey(product) {
  const profile = productProfile(product);
  return profile.type ? ['candidate', familyOf(profile.category), profile.type, profile.brand || ''].join('|') : null;
}

export const comparablePriceBasis = (left, right) => ['kg','L','unit'].includes(left.priceBasis) && left.priceBasis === right.priceBasis;
export function eligibleForRanking(product, now = Date.now()) {
  if (product.disponivel === false || promotionOf(product)) return false;
  const price = priceOf(product);
  if (!Number.isFinite(price) || price <= 0 || product.priceBasis === 'unknown') return false;
  const captured = Date.parse(product.ultimaAtualizacao);
  return Number.isFinite(captured) && captured <= now && now - captured <= 7 * 24 * 60 * 60 * 1000;
}
export const matchLabel = level => ({certain:'Mesmo produto', probable:'Mesmo produto provável', similar:'Produto similar', alternative:'Alternativa'})[level] || 'Sem correspondência';
