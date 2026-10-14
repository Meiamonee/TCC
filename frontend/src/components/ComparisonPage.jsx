import {useRef} from 'react';
import {ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Check} from 'lucide-react';
import {attributes, comparablePriceBasis, eligibleForRanking, money, priceOf, promotionOf, unitPrice} from '../services/comparison';
import {getSupermarket, supermarkets} from '../services/supermarkets';
import ProductImage from './ProductImage';

const date = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('pt-BR') : 'Data não informada';
function quantityLabel(quantity) {
  if (!quantity) return 'Não identificado';
  const small = (quantity.unit === 'kg' || quantity.unit === 'L') && quantity.value < 1;
  const value = small ? quantity.value * 1000 : quantity.value;
  const unit = small ? (quantity.unit === 'kg' ? 'g' : 'ml') : quantity.unit;
  return `${quantity.pack > 1 ? `${quantity.pack} × ` : ''}${value.toLocaleString('pt-BR')} ${unit}`;
}

const definitions = [
  ['sameProduct', 'Mesmo produto em outros mercados', 'Nenhuma outra oferta disponível agora.'],
  ['similar', 'Produtos similares', 'Nenhum produto similar disponível agora.'],
  ['alternatives', 'Alternativas', 'Nenhuma alternativa disponível agora.']
];

function Group({type, title, emptyMessage, offers, selected}) {
  const carouselRef = useRef(null);
  const carousel = type === 'similar' || type === 'alternatives';
  const metric = product => carousel ? unitPrice(product)?.price : priceOf(product);
  const selectedUnit = carousel ? unitPrice(selected)?.unit : null;
  const comparable = product => carousel
    ? !!selectedUnit && product.match.unitComparisonEligible && unitPrice(product)?.unit === selectedUnit
    : comparablePriceBasis(selected, product);
  const ranked = offers.filter(product => comparable(product) && eligibleForRanking(product) && Number.isFinite(metric(product)));
  const values = ranked.map(metric);
  if (ranked.length && eligibleForRanking(selected) && Number.isFinite(metric(selected))) values.push(metric(selected));
  const lowest = values.length > 1 ? Math.min(...values) : null;
  const sorted = [...offers].sort((a, b) => Number(b.disponivel !== false) - Number(a.disponivel !== false) || (metric(a) ?? Infinity) - (metric(b) ?? Infinity));
  const scroll = direction => carouselRef.current?.scrollBy({left:direction * Math.min(carouselRef.current.clientWidth * .85, 360), behavior:'smooth'});
  return <section className={`comparison-group group-${type}`}>
    <div className="group-heading">
      <div className="group-heading-copy">
        <h2>{title}</h2>
      </div>
      <div className="group-actions">
        <span className="count-label">{offers.length} {offers.length === 1 ? 'oferta' : 'ofertas'}</span>
        {carousel && offers.length > 1 && <div className="carousel-controls" aria-label={`Navegação de ${title.toLowerCase()}`}>
          <button type="button" onClick={() => scroll(-1)} aria-label={`Ver itens anteriores em ${title.toLowerCase()}`}><ChevronLeft size={18}/></button>
          <button type="button" onClick={() => scroll(1)} aria-label={`Ver próximos itens em ${title.toLowerCase()}`}><ChevronRight size={18}/></button>
        </div>}
      </div>
    </div>
    {sorted.length === 0
      ? <div className="group-empty" role="status"><strong>{emptyMessage}</strong></div>
      : <div className={`market-offers${carousel ? ' alternative-carousel' : ''}`} ref={carousel ? carouselRef : null}>
      {sorted.map(product => {
        const unit = unitPrice(product);
        const promotion = promotionOf(product);
        const rankable = comparable(product) && eligibleForRanking(product);
        return <article className={`comparison-offer${carousel ? ' alternative-card' : ''}`} key={product.id}>
          <div className="comparison-offer-image"><ProductImage product={product}/></div>
          <div className="offer-copy">
            <div className="offer-store-row">
              <span className="eyebrow">{getSupermarket(product.supermercado).name}</span>
            </div>
            <h3>{product.name}</h3>
            <div className="offer-tags">
              {product.disponivel === false && <span className="status-tag">Indisponível</span>}
              {promotion && <span className="status-tag status-warning">{promotion.label} · fora do ranking normal</span>}
              {!promotion && product.priceBasis === 'unknown' && <span className="status-tag status-warning">Unidade do preço não identificada</span>}
            </div>
            {promotion?.text && <p className="small muted">{promotion.text}</p>}
          </div>
          <div className="offer-amount">
            <strong>{money(promotion?.promotionalPrice || priceOf(product))}{product.priceBasis === 'kg' ? ' / kg' : product.priceBasis === 'L' ? ' / L' : ''}</strong>
            {promotion?.promotionalPrice && promotion.promotionalPrice !== priceOf(product) && <span className="small muted">Preço normal: {money(priceOf(product))}</span>}
            {unit && product.priceBasis === 'unit' && <span className="unit-cost">{money(unit.price)} / {unit.unit}</span>}
            {lowest !== null && rankable && Math.abs(metric(product) - lowest) < .000001 && <span className="lowest"><Check size={12}/>{carousel ? 'Menor preço por unidade' : 'Menor preço normal'}</span>}
            <a className="outline-button" href={product.url} target="_blank" rel="noreferrer">Ver na loja <ExternalLink size={15}/></a>
          </div>
        </article>;
      })}
    </div>}
  </section>;
}

export default function ComparisonPage({product, groups}) {
  const profile = attributes(product);
  const unit = unitPrice(product);
  const promotion = promotionOf(product);
  const present = new Set([product.supermercado, ...Object.values(groups).flat().map(item => item.supermercado)]);
  const missing = supermarkets.filter(market => !present.has(market.id));

  return <main className="shell detail-page">
    <a href="#/" className="back-link"><ArrowLeft size={17}/> Voltar aos produtos</a>
    <div className="detail-layout">
      <section className="selected-product">
        <div className="detail-image"><ProductImage key={product.id} product={product}/></div>
        <div className="selected-product-copy">
          <span className="eyebrow">OFERTA DE REFERÊNCIA · {getSupermarket(product.supermercado).name}</span>
          <h1>{product.name}</h1>
          <dl className="product-facts">
            <div><dt>Marca</dt><dd>{profile.brand || 'Não identificada'}</dd></div>
            <div><dt>Conteúdo</dt><dd>{product.priceBasis === 'kg' ? 'Vendido por kg' : product.priceBasis === 'L' ? 'Vendido por litro' : quantityLabel(profile.quantity)}</dd></div>
          </dl>
          <div className="selected-price-panel">
            <span className="price-label">{promotion ? 'Preço promocional' : 'Preço atual'}</span>
            <div className="detail-price">{money(promotion?.promotionalPrice || priceOf(product))}{product.priceBasis === 'kg' ? ' / kg' : product.priceBasis === 'L' ? ' / L' : ''}</div>
            {promotion?.promotionalPrice && promotion.promotionalPrice !== priceOf(product) && <p className="small muted">Preço normal: {money(priceOf(product))}</p>}
            {unit && product.priceBasis === 'unit' && <p className="unit-cost">{money(unit.price)} / {unit.unit}</p>}
          </div>
          <p className="small muted selected-date">Atualizado em {date(product.ultimaAtualizacao)}</p>
          {promotion && <div className="offer-tags"><span className="status-tag status-warning">{promotion.label} · fora do ranking normal</span></div>}
          <a className="primary-button" href={product.url} target="_blank" rel="noreferrer">Consultar oferta <ExternalLink size={16}/></a>
        </div>
      </section>
      <div className="market-comparison">
        <div className="comparison-intro">
          <span className="eyebrow">COMPARE COM CLAREZA</span>
          <h2 className="comparison-title">Compare preços, tamanhos e alternativas</h2>
        </div>
        {definitions.map(([type, title, emptyMessage]) => <Group key={type} type={type} title={title} emptyMessage={emptyMessage} offers={groups[type] || []} selected={product}/>)}
        {missing.length > 0 && <div className="missing-markets"><h3>Sem outras ofertas</h3><p>{missing.map(market => market.name).join(' · ')}</p></div>}
      </div>
    </div>
  </main>;
}
