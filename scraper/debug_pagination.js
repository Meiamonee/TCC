const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    console.log('Starting pagination debug scraper...');
    const options = new chrome.Options()
        .addArguments(
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            `--user-agent=${USER_AGENT}`
        );
    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    try {
        await driver.manage().setTimeouts({ pageLoad: 60000 });

        const url = "https://www.supervalesupermercados.com.br/departamentos/bebidas";
        console.log(`Navigating to ${url}`);

        await driver.get(url);

        console.log('Waiting for 10 seconds...');
        await sleep(10000);

        console.log('Scrolling to bottom...');
        await driver.executeScript('window.scrollTo(0, document.body.scrollHeight);');

        console.log('Waiting for 5 seconds after scroll...');
        await sleep(5000);

        console.log('Taking screenshot of bottom...');
        const screenshot = await driver.takeScreenshot();
        fs.writeFileSync('debug_pagination_bottom.png', screenshot, 'base64');

        console.log('Saving HTML...');
        const html = await driver.executeScript('return document.documentElement.outerHTML;');
        fs.writeFileSync('debug_pagination.html', html);
    } finally {
        await driver.quit();
    }
})();
