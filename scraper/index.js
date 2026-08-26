const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const DEFAULT_PAGE_DELAY_MS = 8000;
const DEFAULT_PAGE_DELAY_JITTER_MS = 4000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function parseNonNegativeInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getDelayConfig(options) {
    return {
        pageDelayMs: parseNonNegativeInteger(
            options.pageDelayMs ?? process.env.SCRAPER_PAGE_DELAY_MS,
            DEFAULT_PAGE_DELAY_MS
        ),
        pageDelayJitterMs: parseNonNegativeInteger(
            options.pageDelayJitterMs ?? process.env.SCRAPER_PAGE_DELAY_JITTER_MS,
            DEFAULT_PAGE_DELAY_JITTER_MS
        )
    };
}

function getChromeBinaryPath(options) {
    return options.chromeBinaryPath
        || process.env.CHROME_BINARY_PATH
        || process.env.SELENIUM_CHROME_BINARY_PATH;
}

function getChromeDriverPath(options) {
    return options.chromeDriverPath
        || process.env.CHROMEDRIVER_PATH
        || process.env.SELENIUM_CHROMEDRIVER_PATH;
}

function getSeleniumManagerPath(options) {
    return options.seleniumManagerPath
        || process.env.SE_MANAGER_PATH;
}

function buildChromeOptions(headless, options) {
    const chromeOptions = new chrome.Options()
        .addArguments(
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1366,768',
            `--user-agent=${USER_AGENT}`
        );

    if (headless) {
        chromeOptions.addArguments('--headless=new');
    } else {
        chromeOptions.addArguments('--start-maximized');
    }

    const chromeBinaryPath = getChromeBinaryPath(options);
    if (chromeBinaryPath) {
        console.log(`Using Chrome binary from ${chromeBinaryPath}`);
        chromeOptions.setChromeBinaryPath(chromeBinaryPath);
    }

    return chromeOptions;
}

async function createDriver(headless, options) {
    const seleniumManagerPath = getSeleniumManagerPath(options);
    if (options.seleniumManagerPath) {
        process.env.SE_MANAGER_PATH = options.seleniumManagerPath;
    }

    let builder = new Builder()
        .forBrowser('chrome')
        .setChromeOptions(buildChromeOptions(headless, options));

    const chromeDriverPath = getChromeDriverPath(options);
    if (chromeDriverPath) {
        console.log(`Using ChromeDriver from ${chromeDriverPath}`);
        builder = builder.setChromeService(new chrome.ServiceBuilder(chromeDriverPath));
    } else if (seleniumManagerPath) {
        console.log(`Using Selenium Manager from ${seleniumManagerPath} to resolve ChromeDriver.`);
    } else {
        console.log('Using Selenium Manager to resolve ChromeDriver automatically.');
    }

    return builder.build();
}

async function waitBeforeScrapingNextPage(pageDelayMs, pageDelayJitterMs) {
    const jitter = pageDelayJitterMs > 0 ? Math.floor(Math.random() * (pageDelayJitterMs + 1)) : 0;
    const waitMs = pageDelayMs + jitter;

    if (waitMs > 0) {
        console.log(`  Waiting ${(waitMs / 1000).toFixed(1)}s before scraping the next page...`);
        await sleep(waitMs);
    }
}

async function extractProducts(driver, selectors) {
    return driver.executeScript((domSelectors) => {
        const items = [];
        const productCards = document.querySelectorAll(domSelectors.productContainer);

        productCards.forEach(card => {
            const titleEl = card.querySelector(domSelectors.productTitle);
            const priceEl = card.querySelector(domSelectors.productPrice);
            const imgEl = card.querySelector(domSelectors.productImage);
            const linkEl = card.querySelector('a[href^="/produto/"]');

            if (titleEl && priceEl && linkEl) {
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
    }, selectors);
}

async function clickNextPage(driver, selectors) {
    return driver.executeScript((domSelectors) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const nextBtn = buttons.find(btn =>
            btn.getAttribute('aria-label')?.includes(domSelectors.paginationNextText) ||
            btn.getAttribute('title')?.includes(domSelectors.paginationNextText)
        );

        if (nextBtn && !nextBtn.disabled) {
            nextBtn.click();
            return true;
        }

        return false;
    }, selectors);
}

async function scrapeProducts(options = {}) {
    const outputPath = options.outputPath || path.join(__dirname, 'products.json');
    const headless = options.headless ?? process.env.SCRAPER_HEADLESS !== 'false';
    const { pageDelayMs, pageDelayJitterMs } = getDelayConfig(options);

    console.log('Starting SuperVale scraper...');
    console.log(`Page delay configured: ${pageDelayMs}ms + up to ${pageDelayJitterMs}ms random jitter.`);

    const driver = await createDriver(headless, options);
    const allProducts = [];

    try {
        for (const dept of config.departments) {
            console.log(`Scraping department: ${dept.name} (${dept.url})`);

            try {
                await driver.get(dept.url);
            } catch (error) {
                console.error(`Failed to load department ${dept.name}: ${error.message}`);
                continue;
            }

            let pageNum = 1;
            let previousProductIds = new Set();

            while (true) {
                console.log(`  Scraping page ${pageNum}...`);

                try {
                    await driver.wait(until.elementLocated(By.css(config.selectors.productContainer)), 15000);
                } catch (_error) {
                    console.log('  No products found on this page. Stopping pagination.');
                    break;
                }

                const products = await extractProducts(driver, config.selectors);

                console.log(`    Found ${products.length} products.`);

                const currentProductIds = new Set(products.map(p => p.id).filter(Boolean));

                if (currentProductIds.size === 0) {
                    console.log('  No valid products on this page. Stopping pagination.');
                    break;
                }

                const allDuplicates = products.every(p => previousProductIds.has(p.id));
                if (pageNum > 1 && allDuplicates) {
                    console.log('  All products are duplicates from previous page. Reached the end.');
                    break;
                }

                products.forEach(product => {
                    product.department = dept.name;
                    allProducts.push(product);
                });

                previousProductIds = currentProductIds;

                const clickedNext = await clickNextPage(driver, config.selectors);

                if (!clickedNext) {
                    console.log('  No next page button available. This is the last page.');
                    break;
                }

                await sleep(3000);

                try {
                    await driver.wait(until.elementLocated(By.css(config.selectors.productContainer)), 10000);
                    pageNum++;
                    await waitBeforeScrapingNextPage(pageDelayMs, pageDelayJitterMs);
                } catch (error) {
                    console.log(`  Error waiting for page update: ${error.message}`);
                    break;
                }
            }
        }

        fs.writeFileSync(outputPath, JSON.stringify(allProducts, null, 2), 'utf8');
        console.log(`Scraping complete. Total products found: ${allProducts.length}`);
        console.log(`Data saved to ${outputPath}`);

        return allProducts;
    } finally {
        await driver.quit();
    }
}

if (require.main === module) {
    scrapeProducts()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Scraper failed:', error);
            process.exit(1);
        });
}

module.exports = scrapeProducts;
