import { ArrowRight } from "lucide-react";
import { getSupermarket } from "../services/supermarkets";
import { money, priceOf, promotionOf } from "../services/comparison";
import ProductImage from "./ProductImage";
export default function CatalogCard({ product }) {
  const promotion = promotionOf(product);
  const displayedPrice = promotion?.promotionalPrice || priceOf(product);
  const suffix = product.priceBasis === "kg" ? " / kg" : product.priceBasis === "L" ? " / L" : "";
  return (
    <article className="product-card">
      <a
        className="product-image"
        href={`#/produto/${product.id}`}
        aria-label={`Ver ofertas de ${product.name}`}
      >
        <ProductImage product={product} />
      </a>
      <div className="product-body">
        <span className="eyebrow">{product.department}</span>
        <h3>
          <a href={`#/produto/${product.id}`}>{product.name}</a>
        </h3>
        <span className="muted small">
          {getSupermarket(product.supermercado).name}
        </span>
        <div className="card-price">
          <span className="muted small">
            {product.disponivel === false
              ? "Último preço · indisponível"
              : "Preço nesta loja"}
          </span>
          <strong>{money(displayedPrice)}{suffix}</strong>
          {promotion?.promotionalPrice && promotion.promotionalPrice !== priceOf(product) && (
            <span className="muted small">Preço normal: {money(priceOf(product))}</span>
          )}
          {promotion && <span className="price-warning">{promotion.label} · condição separada</span>}
        </div>
        <p className="comparison-note">
          Compare as ofertas e confira a disponibilidade na loja.
        </p>
        <a
          className="outline-button card-link"
          href={`#/produto/${product.id}`}
        >
          Ver ofertas <ArrowRight size={17} />
        </a>
      </div>
    </article>
  );
}
