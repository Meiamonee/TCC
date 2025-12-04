const puppeteer = require('puppeteer');
const fs = require('fs');
const config = require('./config');

(async () => {
    console.log('Starting scraper...');
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const allProducts = [];

    for (const dept of config.departments) {
        console.log(`Scraping department: ${dept.name} (${dept.url})`);

        try {
            await page.goto(dept.url, { waitUntil: 'networkidle2', timeout: 60000 });
        } catch (error) {
            console.error(`Failed to load department ${dept.name}: ${error.message}`);
            continue;
        }

        let pageNum = 1;
        let previousProductIds = new Set();

        while (true) {
            console.log(`  Scraping page ${pageNum}...`);

            // Wait for products to load
            try {
                await page.waitForSelector(config.selectors.productContainer, { timeout: 15000 });
            } catch (e) {
                console.log('  No products found on this page (or timeout). Stopping pagination.');
                break;
            }

            // Extract products with IDs to detect duplicates
            const products = await page.evaluate((selectors) => {
                const items = [];
                const productCards = document.querySelectorAll(selectors.productContainer);

                productCards.forEach(card => {
                    const titleEl = card.querySelector(selectors.productTitle);
                    const priceEl = card.querySelector(selectors.productPrice);
                    const imgEl = card.querySelector(selectors.productImage);
                    const linkEl = card.querySelector('a[href^="/produto/"]');

                    if (titleEl && priceEl && linkEl) {
                        // Extract product ID from URL
                        const urlMatch = linkEl.href.match(/\/produto\/(\d+)\//);
                        const productId = urlMatch ? urlMatch[1] : null;

                        items.push({
                            id: productId,
                            name: titleEl.innerText.trim(),
                            price: priceEl.innerText.trim(),
                            image: imgEl ? imgEl.src : null,
                            url: linkEl.href
                        });
                    }
                });
                return items;
            }, config.selectors);

            console.log(`    Found ${products.length} products.`);

            // Check if we're seeing the same products (duplicate page)
            const currentProductIds = new Set(products.map(p => p.id).filter(id => id));

            if (currentProductIds.size === 0) {
                console.log('  No valid products on this page. Stopping pagination.');
                break;
            }

            // Check for duplicates - if all products are the same as previous page, we've looped
            const allDuplicates = products.every(p => previousProductIds.has(p.id));
            if (pageNum > 1 && allDuplicates) {
                console.log('  All products are duplicates from previous page. Reached the end.');
                break;
            }

            // Add products to results
            products.forEach(p => {
                p.department = dept.name;
                allProducts.push(p);
            });

            // Update previous IDs for next iteration
            previousProductIds = currentProductIds;

            // Try to click "Next page" button
            const clickedNext = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const nextBtn = buttons.find(btn =>
                    btn.getAttribute('aria-label')?.includes('Próxima página') ||
                    btn.getAttribute('title')?.includes('Próxima página')
                );

                if (nextBtn && !nextBtn.disabled) {
                    nextBtn.click();
                    return true;
                }
                return false;
            });

            if (!clickedNext) {
                console.log('  No next page button available. This is the last page.');
                break;
            }

            console.log('  Clicked next page button. Waiting for page to update...');

            // Wait for page to update after clicking
            try {
                // Get current URL before waiting
                const urlBefore = page.url();

                // Wait for page to update (give it time to navigate)
                await new Promise(r => setTimeout(r, 3000));

                // Check if URL changed
                const urlAfter = page.url();
                if (urlBefore === urlAfter) {
                    console.log('  URL did not change after clicking. Might be last page.');
                }

                // Wait for products to reload
                await page.waitForSelector(config.selectors.productContainer, { timeout: 10000 });

                pageNum++;
                await new Promise(r => setTimeout(r, 1000));
            } catch (err) {
                console.log('  Error waiting for page update:', err.message);
                break;
            }
        }
    }

    console.log(`Scraping complete. Total products found: ${allProducts.length}`);

    fs.writeFileSync('products.json', JSON.stringify(allProducts, null, 2));
    console.log('Data saved to products.json');

    await browser.close();
})();
