const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

module.exports = { createDriver, sleep };
