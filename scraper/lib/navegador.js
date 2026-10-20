const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// O Chrome headless se identifica como "HeadlessChrome" no user agent, e alguns
// sites deixam de renderizar a listagem de produtos nesse caso.
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const DEFAULT_PAGE_DELAY_MS = 4000;
const DEFAULT_PAGE_DELAY_JITTER_MS = 2000;

function parseNonNegativeInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getDelayConfig(options = {}) {
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

// Espera entre paginas para reduzir a frequencia de requisicoes aos sites.
async function aguardarEntrePaginas(delayConfig) {
    const { pageDelayMs, pageDelayJitterMs } = delayConfig;
    const jitter = pageDelayJitterMs > 0 ? Math.floor(Math.random() * (pageDelayJitterMs + 1)) : 0;
    const waitMs = pageDelayMs + jitter;

    if (waitMs > 0) {
        await sleep(waitMs);
    }
}

// Executa uma etapa de navegacao com novas tentativas, para que uma lentidao passageira
// do site nao faca o scraper pular um departamento inteiro.
async function comTentativas(descricao, acao, tentativas = 3, esperaBaseMs = 5000) {
    for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
        try {
            return await acao();
        } catch (error) {
            if (tentativa === tentativas) {
                throw error;
            }
            console.log(`  ${descricao}: falhou (tentativa ${tentativa}/${tentativas}), tentando de novo...`);
            await sleep(esperaBaseMs * tentativa);
        }
    }
    return undefined;
}

function buildChromeOptions(headless, options) {
    const chromeOptions = new chrome.Options().addArguments(
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1366,900',
        '--lang=pt-BR',
        `--user-agent=${USER_AGENT}`
    );

    if (headless) {
        chromeOptions.addArguments('--headless=new');
    }

    const chromeBinaryPath = options.chromeBinaryPath
        || process.env.CHROME_BINARY_PATH
        || process.env.SELENIUM_CHROME_BINARY_PATH;

    if (chromeBinaryPath) {
        console.log(`Usando Chrome em ${chromeBinaryPath}`);
        chromeOptions.setChromeBinaryPath(chromeBinaryPath);
    }

    return chromeOptions;
}

async function criarNavegador(options = {}) {
    const headless = options.headless ?? process.env.SCRAPER_HEADLESS !== 'false';

    if (options.seleniumManagerPath) {
        process.env.SE_MANAGER_PATH = options.seleniumManagerPath;
    }

    let builder = new Builder()
        .forBrowser('chrome')
        .setChromeOptions(buildChromeOptions(headless, options));

    const chromeDriverPath = options.chromeDriverPath
        || process.env.CHROMEDRIVER_PATH
        || process.env.SELENIUM_CHROMEDRIVER_PATH;

    if (chromeDriverPath) {
        console.log(`Usando ChromeDriver em ${chromeDriverPath}`);
        builder = builder.setChromeService(new chrome.ServiceBuilder(chromeDriverPath));
    }

    const driver = await builder.build();
    await abrirAbaReserva(driver);
    return driver;
}

// Quando a aba do Chrome trava ("tab crashed"), todo comando seguinte nela falha, inclusive
// abrir uma aba nova a partir dela. Por isso o navegador ja nasce com uma aba reserva em branco:
// se a aba da coleta travar, passamos para a reserva, fechamos a travada e abrimos outra reserva.
const ABA_TRAVADA = /tab crashed|target crashed|page crash/i;

async function abrirAbaReserva(driver) {
    const atual = await driver.getWindowHandle();
    await driver.switchTo().newWindow('tab');
    await driver.switchTo().window(atual);
}

// Devolve true se a aba estava travada e a coleta pode continuar na aba nova.
async function recuperarAbaTravada(driver, error) {
    if (!ABA_TRAVADA.test(error?.message || '')) {
        return false;
    }

    console.log('  A aba do navegador travou; continuando em uma aba nova.');
    let viva = null;
    for (const aba of await driver.getAllWindowHandles()) {
        await driver.switchTo().window(aba);
        try {
            await driver.getTitle();
            viva = viva || aba;
        } catch (_erro) {
            await driver.close().catch(() => {});
        }
    }
    if (!viva) {
        throw error;
    }
    await driver.switchTo().window(viva);
    await abrirAbaReserva(driver);
    return true;
}

module.exports = {
    aguardarEntrePaginas,
    comTentativas,
    criarNavegador,
    recuperarAbaTravada,
    getDelayConfig,
    sleep
};
