import { useState } from "react";
import { Package } from "lucide-react";
export default function ProductImage({ product }) {
  const [failed, setFailed] = useState(false);
  return product.image && !failed ? (
    <img
      src={product.image}
      alt={product.name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <span className="image-fallback">
      <Package size={36} strokeWidth={1} />
      <span>Imagem indisponível</span>
    </span>
  );
}
