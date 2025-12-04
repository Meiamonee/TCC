const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log('Starting pagination debug scraper...');
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

    console.log('Waiting for 10 seconds...');
    await new Promise(r => setTimeout(r, 10000));

    console.log('Scrolling to bottom...');
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    console.log('Waiting for 5 seconds after scroll...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('Taking screenshot of bottom...');
    await page.screenshot({ path: 'debug_pagination_bottom.png', fullPage: true });

    console.log('Saving HTML...');
    const html = await page.content();
    fs.writeFileSync('debug_pagination.html', html);

    await browser.close();
})();
