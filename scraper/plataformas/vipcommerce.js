const { By, until } = require('selenium-webdriver');
const { aguardarEntrePaginas, comTentativas, sleep } = require('../lib/navegador');
const { confirmarUnidade } = require('../lib/unidade');

// Extrator para lojas da plataforma VipCommerce (SuperVale, Vila Sul, San Michel).
// A listagem de cada departamento e paginada pela URL: /departamentos/<slug>?page=N.

const CARD_SELECTOR = 'vip-card-produto';
const MAX_PAGINAS_POR_DEPARTAMENTO = 300;
const PAGINAS_SEM_NOVIDADE_PARA_PARAR = 2;

function nomeDoSlug(slug) {
    const texto = slug.replace(/-/g, ' ');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Links do menu "Departamentos" tem aria-label "Ir para departamento de <nome>". A pagina
// inicial tambem tem banners que apontam para departamentos (ex.: "QUINTA DA CARNE SITE" ->
// /departamentos/carnes), e eles podem carregar antes do menu.
const MENU_DEPARTAMENTOS = 'a[href*="/departamentos/"][aria-label^="Ir para departamento"]';
const ESPERA_MENU_MS = 30000;

async function descobrirDepartamentos(driver, mercado) {
    await driver.get(mercado.url);
    await driver.wait(until.elementLocated(By.css('a[href*="/departamentos/"]')), 30000);
    await confirmarUnidade(driver, mercado);

    // Espera o menu de departamentos; so usa os outros links se a loja nao tiver esse menu.
    const temMenu = await driver.wait(until.elementLocated(By.css(MENU_DEPARTAMENTOS)), ESPERA_MENU_MS)
        .then(() => true, () => false);
    if (!temMenu) {
        console.log(`[${mercado.slug}] Menu de departamentos nao encontrado; usando os links da pagina.`);
    }

    const links = await driver.executeScript((seletor) => {
        return Array.from(document.querySelectorAll(seletor)).map(link => ({
            href: link.getAttribute('href'),
            texto: (link.innerText || '').trim(),
            rotulo: link.getAttribute('aria-label') || link.getAttribute('title') || ''
        }));
    }, temMenu ? MENU_DEPARTAMENTOS : 'a[href*="/departamentos/"]');

    const departamentos = new Map();

    for (const link of links) {
        const match = link.href.match(/\/departamentos\/([^/?#]+)/);
        if (!match) continue;

        const slug = match[1];
        const rotulo = link.rotulo.replace(/^Ir para departamento de\s*/i, '').trim();
        const nome = rotulo || link.texto.split('\n')[0].trim() || nomeDoSlug(slug);

        if (!departamentos.has(slug)) {
            departamentos.set(slug, { slug, nome, url: `${mercado.url}/departamentos/${slug}` });
        }
    }

    return [...departamentos.values()];
}

async function extrairProdutosDaPagina(driver) {
    return driver.executeScript((cardSelector) => {
        const textoDe = el => (el && el.innerText ? el.innerText.trim() : '');

        return Array.from(document.querySelectorAll(cardSelector)).map(card => {
            const link = card.querySelector('a[href*="/produto/"]');
            if (!link) return null;

            const href = link.getAttribute('href');
            const idMatch = href.match(/\/produto\/(\d+)/);
            const nome = textoDe(card.querySelector('.vip-card-produto-descricao')) || link.getAttribute('title') || '';
            const imagem = card.querySelector('vip-image img, img');

            // O card marca cada valor com data-cy: "preco" e o valor cobrado, "unidade" diz a que
            // ele se refere ("/un", "/kg" ou o tamanho da embalagem, ex. "/700g"), "preco-unidade"
            // e so o preco por kg informativo e "preco-antigo" e o valor riscado da oferta.
            // Ex.: Salame 700g mostra "R$ 48,93 /700g" (o que se paga) e "R$ 69,90/kg".
            let preco = textoDe(card.querySelector('[data-cy="preco"]'));
            let unidade = textoDe(card.querySelector('[data-cy="unidade"]')).replace('/', '').trim().toLowerCase();
            let precoAntigo = textoDe(card.querySelector('[data-cy="preco-antigo"]'));

            if (!preco) {
                // Layout sem data-cy: primeiro preco nao riscado do card, com a unidade colada
                // ("R$ 39,90/kg") ou em um elemento proprio ("/un").
                const folhas = Array.from(card.querySelectorAll('span, div'))
                    .filter(el => el.children.length === 0 && textoDe(el));
                const precos = folhas.filter(el => /^R\$/.test(textoDe(el)));
                const precoAtual = precos.find(el => !el.className.includes('line-through'));
                const unidadeColada = textoDe(precoAtual).match(/\/\s*([a-z]+)$/i);
                const elUnidade = folhas.find(el => /^\/\s*[a-z]+$/i.test(textoDe(el)));
                preco = textoDe(precoAtual).replace(/\/\s*[a-z]+$/i, '').trim();
                unidade = elUnidade ? textoDe(elUnidade).replace('/', '').trim().toLowerCase() : (unidadeColada ? unidadeColada[1].toLowerCase() : '');
                precoAntigo = textoDe(precos.find(el => el.className.includes('line-through')));
            }

            // "700g" ou "2,8kg" e o tamanho da embalagem: o produto e vendido por unidade e o
            // backend calcula o preco por kg a partir desse tamanho.
            const embalagem = /^\d/.test(unidade) ? unidade : null;

            return {
                id: idMatch ? idMatch[1] : null,
                name: nome,
                price: preco || null,
                originalPrice: precoAntigo || null,
                unit: embalagem ? 'un' : (unidade || null),
                packageSize: embalagem,
                tag: textoDe(card.querySelector('.vip-tag-text')) || null,
                image: imagem ? imagem.src : null,
                url: new URL(href, location.origin).href
            };
        }).filter(produto => produto && produto.id && produto.name && produto.price);
    }, CARD_SELECTOR);
}

async function raspar(driver, mercado, opcoes) {
    const departamentos = await descobrirDepartamentos(driver, mercado);
    console.log(`[${mercado.slug}] ${departamentos.length} departamentos encontrados.`);

    const produtos = new Map();

    for (const departamento of departamentos) {
        let pagina = 1;
        let paginasSemNovidade = 0;
        const vistosNoDepartamento = new Set();

        while (pagina <= MAX_PAGINAS_POR_DEPARTAMENTO) {
            const url = `${departamento.url}?page=${pagina}`;

            try {
                await comTentativas(`${departamento.nome} p.${pagina}`, async () => {
                    await driver.get(url);
                    await driver.wait(until.elementLocated(By.css(CARD_SELECTOR)), 20000);
                });
                await sleep(1500);
            } catch (_error) {
                console.log(`[${mercado.slug}] ${departamento.nome}: pagina ${pagina} nao carregou; encerrando o departamento.`);
                break;
            }

            const encontrados = await extrairProdutosDaPagina(driver);
            // A ordenacao do site pode repetir produtos entre paginas vizinhas, entao so
            // consideramos o fim depois de paginas seguidas sem nenhum produto novo.
            const novos = encontrados.filter(produto => !vistosNoDepartamento.has(produto.id));

            // O site lista os produtos sem estoque (sem preco) depois dos disponiveis;
            // ao chegar neles nao ha mais nada a coletar no departamento.
            if (encontrados.length === 0) {
                break;
            }

            if (novos.length === 0) {
                if (++paginasSemNovidade >= PAGINAS_SEM_NOVIDADE_PARA_PARAR) {
                    break;
                }
                pagina++;
                await aguardarEntrePaginas(opcoes.delay);
                continue;
            }

            paginasSemNovidade = 0;

            for (const produto of novos) {
                vistosNoDepartamento.add(produto.id);
                if (!produtos.has(produto.id)) {
                    produtos.set(produto.id, { ...produto, department: departamento.nome });
                }
            }

            pagina++;
            await aguardarEntrePaginas(opcoes.delay);
        }

        console.log(`[${mercado.slug}] ${departamento.nome}: ${vistosNoDepartamento.size} produtos em ${pagina - 1} paginas.`);
    }

    return [...produtos.values()];
}

module.exports = {
    descobrirDepartamentos,
    extrairProdutosDaPagina,
    raspar
};
