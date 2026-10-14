// Funcoes autocontidas: executadas pelo Selenium dentro da pagina (sem chamadas a APIs privadas).
function readCatalog(platform) {
    const vip = platform === 'vipcommerce';
    const priceMetadata = (unitText, productName) => {
        const text = String(unitText || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const normalizePackage = match => {
            let value = Number(match[1].replace(',', '.'));
            let unit = match[2].toLowerCase();
            if (unit === 'g' || unit === 'gr') { value /= 1000; unit = 'kg'; }
            else if (unit === 'ml') { value /= 1000; unit = 'L'; }
            else if (unit === 'l' || unit === 'lt' || unit === 'litro' || unit === 'litros') unit = 'L';
            else if (/^un/.test(unit)) unit = 'un';
            return {value, unit};
        };
        const packagePattern = /(?:^|[\/\s])([0-9]+(?:[.,][0-9]+)?)\s*(kg|g|gr|l|lt|litros?|ml|un|und|unid(?:ade)?s?)\b/i;
        const explicitPackage = text.match(packagePattern);
        if (explicitPackage) return {priceBasis:'unit',priceScope:'TOTAL',pricePackageQuantity:normalizePackage(explicitPackage),priceBasisSource:'card',priceBasisConfidence:100};
        if (/^(?:\/\s*)?kg\b|\bpor\s+kg\b/.test(text)) return {priceBasis:'kg',priceScope:'PER_KG',pricePackageQuantity:null,priceBasisSource:'card',priceBasisConfidence:100};
        if (/^(?:\/\s*)?(?:l|litro)\b|\bpor\s+litro\b/.test(text)) return {priceBasis:'L',priceScope:'PER_L',pricePackageQuantity:null,priceBasisSource:'card',priceBasisConfidence:100};
        if (/^(?:\/\s*)?(?:un|und|unidade)\b/.test(text)) return {priceBasis:'unit',priceScope:'TOTAL',pricePackageQuantity:null,priceBasisSource:'card',priceBasisConfidence:100};
        const namedPackage = String(productName || '').match(packagePattern);
        if (namedPackage) return {priceBasis:'unit',priceScope:'TOTAL',pricePackageQuantity:normalizePackage(namedPackage),priceBasisSource:'name',priceBasisConfidence:90};
        if (/\bkg\s*$/i.test(productName || '')) return {priceBasis:'kg',priceScope:'PER_KG',pricePackageQuantity:null,priceBasisSource:'name',priceBasisConfidence:85};
        if (/\b(?:un|und|unidade)s?\s*$/i.test(productName || '')) return {priceBasis:'unit',priceScope:'TOTAL',pricePackageQuantity:null,priceBasisSource:'name',priceBasisConfidence:85};
        if (!vip) return {priceBasis:'unit',priceScope:'TOTAL',pricePackageQuantity:null,priceBasisSource:'platform-default',priceBasisConfidence:80};
        return {priceBasis:'unknown',priceScope:'UNKNOWN',pricePackageQuantity:null,priceBasisSource:'unknown',priceBasisConfidence:0};
    };
    const root = vip ? document.querySelector('vip-infinite-scroll') || document : document.querySelector('main') || document;
    const cards = [...root.querySelectorAll(vip ? 'vip-card-produto' : '[data-testid="product-card"]')];
    const items = [];
    const ids = [];
    for (const card of cards) {
        const link = vip ? card.querySelector('a[href*="/produto/"]') : card;
        const id = vip ? link?.href.match(/\/produto\/([^/]+)/)?.[1] : link?.href.match(/\/p\/([^/?#]+)/)?.[1];
        if (!id) continue;
        ids.push(id);
        const name = vip ? card.querySelector('.vip-card-produto-descricao')?.textContent.trim() : card.querySelector('img')?.alt?.trim();
        const priceElement = card.querySelector(vip ? 'vip-produto-preco-valor .medio.font-bold' : '[data-testid="price-display-price"]');
        const price = priceElement?.textContent.replace(/\s+/g, ' ').trim().match(/R\$\s*[\d.]+,\d{2}/)?.[0];
        // Sem preco publicado, o item nao e elegivel para o comparador.
        if (!name || !price) continue;
        const image = card.querySelector('img');
        const available = vip
            ? !/indispon[ií]vel|avise-me/i.test(card.innerText)
            : !/indispon[ií]vel|sem estoque|avise-me/i.test(card.innerText);
        const priceText = (vip ? priceElement?.closest('[role="text"]')?.textContent || priceElement?.textContent : priceElement?.textContent)?.toLowerCase() || '';
        const priceUnit = priceText.replace(/r\$\s*[\d.]+,\d{2}/, ' ').trim();
        const metadata = priceMetadata(priceUnit, name);
        const cardText = card.innerText || '';
        const conditions = [];
        if (/R\$\s*[\d.]+,\d{2}/.test(card.querySelector('del')?.textContent || '')) conditions.push('Preço promocional');
        if (/\bclube\b/i.test(cardText)) conditions.push('Preço de clube');
        if (/\bcashback\b/i.test(cardText)) conditions.push('Cashback');
        if (/\bleve\s*\d+.*\bpague\s*\d+/i.test(cardText)) conditions.push('Leve mais, pague menos');
        if (/\bgr[aá]tis\b/i.test(cardText)) conditions.push('Conteúdo grátis');
        items.push({ id, name, price, ...metadata, priceUnitRaw:priceUnit || null, priceConditions:conditions.join(' · ') || null, image: image?.src || null, url: link.href, disponivel: available });
    }
    const seen = new Set();
    const duplicateIds = ids.filter(id => { if (seen.has(id)) return true; seen.add(id); return false; });
    const toolbar = document.querySelector('vip-lista-produtos-desktop-toolbar');
    const totalMatch = toolbar?.textContent.match(/([\d.]+)\s+Produtos?/i);
    const total = totalMatch ? Number(totalMatch[1].replace(/\./g, '')) : null;
    const empty = total === 0 || (!cards.length && /nenhum produto encontrado|nenhum resultado encontrado|não encontramos produtos/i.test((document.querySelector('main') || document.body).innerText));
    return { items, ids: [...new Set(ids)], cardCount: cards.length, identifiedCardCount: ids.length, duplicateIds, total, empty, infinite: !!document.querySelector('vip-infinite-scroll') };
}

function readCategories(platform) {
    const selector = platform === 'vipcommerce' ? 'a[href*="/departamentos/"]' : 'nav a[href*="/cat/"]';
    const seen = new Set();
    return [...document.querySelectorAll(selector)].flatMap(a => {
        const url = new URL(a.href);
        const name = a.textContent.trim();
        if (url.origin !== location.origin || !name || url.hash || seen.has(url.pathname)) return [];
        seen.add(url.pathname);
        return [{ name, url: url.origin + url.pathname }];
    });
}

function readSubcategories() {
    const seen = new Set();
    return [...document.querySelectorAll('a[href*="/sub/"]')].flatMap(a => {
        const url = new URL(a.href);
        const parts = url.pathname.split('/').filter(Boolean);
        // O Pedrilho apresenta o mesmo link por slug e por ID; usamos os links nomeados do menu.
        if (url.origin !== location.origin || /ver todos/i.test(a.textContent) || parts.length !== 3 || seen.has(url.pathname)) return [];
        seen.add(url.pathname);
        return [{ name: a.textContent.trim(), url: url.origin + url.pathname }];
    });
}

function advanceCatalog(platform) {
    const visible = e => e.getClientRects().length > 0;
    const next = [...document.querySelectorAll('button')].find(b => visible(b) && /próxima página/i.test(`${b.title} ${b.getAttribute('aria-label')}`));
    if (next) {
        if (next.disabled || next.getAttribute('aria-disabled') === 'true') return 'end';
        next.click();
        return 'page';
    }
    const root = platform === 'vipcommerce' ? document.querySelector('vip-infinite-scroll') : document.querySelector('main');
    const more = root && [...root.querySelectorAll('button')].find(b => visible(b) && /^(carregar mais|mostrar mais|ver mais produtos)$/i.test(b.innerText.trim()));
    if (more && !more.disabled) {
        more.click();
        return 'more';
    }
    // As versoes atuais dos tres sites VipCommerce usam rolagem, sem botao Proxima pagina.
    if (platform === 'vipcommerce') {
        // O site bloqueia loadMore no fim absoluto da pagina: aciona prefetch antes do rodape.
        const footerHeight = document.querySelector('footer')?.clientHeight || 0;
        const distance = Math.max(800, window.innerHeight * 0.9, footerHeight);
        const remaining = distance * 0.85;
        window.scrollTo(0, Math.max(1, document.documentElement.scrollHeight - window.innerHeight - remaining));
    } else {
        window.scrollTo(0, document.documentElement.scrollHeight);
    }
    return 'scroll';
}

function readStore(platform) {
    if (platform === 'vipcommerce') {
        return document.querySelector('button[aria-label="Entrega ou Retirada"]')?.innerText || '';
    }
    return document.querySelector('footer')?.innerText || '';
}

function readProductDetail(platform) {
    const priceMetadata = (unitText, productName) => {
        const text = String(unitText || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const normalizePackage = match => {
            let value = Number(match[1].replace(',', '.'));
            let unit = match[2].toLowerCase();
            if (unit === 'g' || unit === 'gr') { value /= 1000; unit = 'kg'; }
            else if (unit === 'ml') { value /= 1000; unit = 'L'; }
            else if (unit === 'l' || unit === 'lt' || unit === 'litro' || unit === 'litros') unit = 'L';
            else if (/^un/.test(unit)) unit = 'un';
            return {value, unit};
        };
        const packagePattern = /(?:^|[\/\s])([0-9]+(?:[.,][0-9]+)?)\s*(kg|g|gr|l|lt|litros?|ml|un|und|unid(?:ade)?s?)\b/i;
        const explicitPackage = text.match(packagePattern);
        if (explicitPackage) return {priceBasis:'unit',priceScope:'TOTAL',pricePackageQuantity:normalizePackage(explicitPackage),priceBasisSource:'detail',priceBasisConfidence:100};
        if (/^(?:\/\s*)?kg\b|\bpor\s+kg\b/.test(text)) return {priceBasis:'kg',priceScope:'PER_KG',pricePackageQuantity:null,priceBasisSource:'detail',priceBasisConfidence:100};
        if (/^(?:\/\s*)?(?:l|litro)\b|\bpor\s+litro\b/.test(text)) return {priceBasis:'L',priceScope:'PER_L',pricePackageQuantity:null,priceBasisSource:'detail',priceBasisConfidence:100};
        if (/^(?:\/\s*)?(?:un|und|unidade)\b/.test(text)) return {priceBasis:'unit',priceScope:'TOTAL',pricePackageQuantity:null,priceBasisSource:'detail',priceBasisConfidence:100};
        const namedPackage = String(productName || '').match(packagePattern);
        if (namedPackage) return {priceBasis:'unit',priceScope:'TOTAL',pricePackageQuantity:normalizePackage(namedPackage),priceBasisSource:'name',priceBasisConfidence:90};
        if (/\bkg\s*$/i.test(productName || '')) return {priceBasis:'kg',priceScope:'PER_KG',pricePackageQuantity:null,priceBasisSource:'name',priceBasisConfidence:85};
        if (/\b(?:un|und|unidade)s?\s*$/i.test(productName || '')) return {priceBasis:'unit',priceScope:'TOTAL',pricePackageQuantity:null,priceBasisSource:'name',priceBasisConfidence:85};
        if (platform === 'instabuy') return {priceBasis:'unit',priceScope:'TOTAL',pricePackageQuantity:null,priceBasisSource:'platform-default',priceBasisConfidence:80};
        return {priceBasis:'unknown',priceScope:'UNKNOWN',pricePackageQuantity:null,priceBasisSource:'unknown',priceBasisConfidence:0};
    };
    const root = document.querySelector('main') || document;
    const selector = platform === 'instabuy'
        ? '[data-testid="price-display-price"]'
        : 'vip-produto-preco-valor .medio.font-bold, [class*="produto-preco"] .medio.font-bold, .medio.font-bold';
    const element = [...root.querySelectorAll(selector)].find(node => node.getClientRects().length && /R\$\s*[\d.]+,\d{2}/.test(node.textContent || ''));
    if (!element) return null;
    const price = element.textContent.replace(/\s+/g,' ').match(/R\$\s*[\d.]+,\d{2}/)?.[0] || null;
    if (!price) return null;
    const container = element.closest('[data-testid="price-display"], [role="text"], vip-produto-preco-valor') || element;
    const rawText = container.textContent.replace(/\s+/g,' ').trim();
    const unitText = rawText.toLowerCase().replace(/r\$\s*[\d.]+,\d{2}/,' ').trim();
    const productName = root.querySelector('h1')?.textContent.trim() || '';
    return {price,...priceMetadata(unitText,productName),priceUnitRaw:unitText || null};
}

module.exports = { readCatalog, readCategories, readSubcategories, advanceCatalog, readStore, readProductDetail };
