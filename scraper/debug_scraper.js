const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log('Starting tag debug scraper...');
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const url = "https://www.supervalesupermercados.com.br/departamentos/bebidas";
    console.log(`Navigating to ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('Waiting for 15 seconds...');
    await new Promise(r => setTimeout(r, 15000));

    console.log('Evaluating...');
    const result = await page.evaluate(() => {
        const vipImageTags = document.querySelectorAll('vip-image');
        const vipItemProductTags = document.querySelectorAll('vip-item-product');
        const appProdutoCardTags = document.querySelectorAll('app-produto-card');

        // Find text again and get context
        function findTextNode(text) {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                if (node.textContent.includes(text)) {
                    return node.parentElement;
                }
            }
            return null;
        }
        const textEl = findTextNode('686 Produtos');
        let contextHTML = '';
        if (textEl) {
            // Go up 4 levels to see the container
            let parent = textEl;
            for (let i = 0; i < 4; i++) {
                if (parent.parentElement) parent = parent.parentElement;
            }
            contextHTML = parent.outerHTML;
        }

        return {
            vipImageTagCount: vipImageTags.length,
            vipItemProductTagCount: vipItemProductTags.length,
            appProdutoCardTagCount: appProdutoCardTags.length,
            contextHTML: contextHTML,
            fullBodyHTML: document.body.innerHTML
        };
    });

    console.log('Tag counts:', {
        vipImage: result.vipImageTagCount,
        vipItemProduct: result.vipItemProductTagCount,
        appProdutoCard: result.appProdutoCardTagCount
    });

    fs.writeFileSync('debug_context.html', result.contextHTML);
    fs.writeFileSync('debug_full_body.html', result.fullBodyHTML);

    await browser.close();
})();
