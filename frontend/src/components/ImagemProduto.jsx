import React, { useState } from 'react';
import { ShoppingBasket } from 'lucide-react';

// Foto do produto vinda do site do supermercado, com uma ilustracao no lugar quando ela nao carrega.
const ImagemProduto = ({ src, alt, className = '', tamanhoIcone = 32 }) => {
    const [falhou, setFalhou] = useState(false);

    if (!src || falhou) {
        return (
            <span className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-papel-100 text-tinta-400 ${className}`} role="img" aria-label={alt}>
                <ShoppingBasket size={tamanhoIcone} strokeWidth={1.5} />
                {tamanhoIcone >= 28 && <span className="text-[10px] font-semibold uppercase tracking-wider">Sem foto</span>}
            </span>
        );
    }

    return <img src={src} alt={alt} loading="lazy" onError={() => setFalhou(true)} className={className} />;
};

export default ImagemProduto;
