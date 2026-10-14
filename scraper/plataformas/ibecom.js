const { By, until } = require('selenium-webdriver');
const { aguardarEntrePaginas, comTentativas, sleep } = require('../lib/navegador');
const { confirmarUnidade } = require('../lib/unidade');

// Extrator para lojas da plataforma iBecom (Pedrilho).
// Categorias ficam em /cat/<slug>; cada categoria mostra secoes por subcategoria com
// um link "Ver todos" (/sub/<categoria>/<id>), cuja listagem usa rolagem infinita.

const CARD_SELECTOR = '[data-testid="product-card"]';
const MAX_ROLAGENS_POR_SUBCATEGORIA = 200;
const ROLAGENS_SEM_NOVIDADE_PARA_PARAR = 3;

// Abre a pagina e espera os cards de produto, com novas tentativas em caso de lentidao.
async function abrirComProdutos(driver, url) {
    try {
        await comTentativas(url, async () => {
            await driver.get(url);
            await driver.wait(until.elementLocated(By.css(CARD_SELECTOR)), 30000);
        });
        await sleep(1500);
        return true;
    } catch (_error) {
        console.log(`  ${url}: nenhum produto carregou; pagina ignorada.`);
        return false;
    }
}

async function descobrirCategorias(driver, mercado) {
    await driver.get(mercado.url);
    await driver.wait(until.elementLocated(By.css('a[href^="/cat/"]')), 30000);
    await confirmarUnidade(driver, mercado);

    const links = await driver.executeScript(() => {
        return Array.from(document.querySelectorAll('a[href^="/cat/"]')).map(link => ({
            href: link.getAttribute('href'),
            texto: (link.innerText || '').trim()
        }));
    });

    const categorias = new Map();
    for (const link of links) {
        const slug = link.href.replace('/cat/', '').split(/[/?#]/)[0];
        if (!slug) continue;

        const atual = categorias.get(slug);
        if (!atual || (!atual.nome && link.texto)) {
            categorias.set(slug, { slug, nome: link.texto, url: `${mercado.url}/cat/${slug}` });
        }
    }

    return [...categorias.values()].filter(categoria => categoria.nome);
}

async function descobrirSubcategorias(driver, categoria) {
    if (!(await abrirComProdutos(driver, categoria.url))) {
        return [];
    }

    const links = await driver.executeScript(() => {
        return Array.from(document.querySelectorAll('a[href^="/sub/"]'))
            .filter(link => /ver todos/i.test(link.innerText || ''))
            .map(link => {
                const secao = link.closest('.flex.items-center.justify-between');
                const titulo = secao ? secao.querySelector('p') : null;
                return {
                    href: link.getAttribute('href'),
                    nome: titulo ? titulo.innerText.trim() : ''
                };
            });
    });

    const subcategorias = new Map();
    for (const link of links) {
        if (!subcategorias.has(link.href)) {
            subcategorias.set(link.href, { nome: link.nome, url: new URL(link.href, categoria.url).href });
        }
    }

    return [...subcategorias.values()];
}

async function extrairProdutosDaPagina(driver) {
    return driver.executeScript((cardSelector) => {
        const textoDe = el => (el && el.innerText ? el.innerText.trim() : '');

        return Array.from(document.querySelectorAll(cardSelector)).map(card => {
            const href = card.getAttribute('href') || '';
            const slugMatch = href.match(/^\/p\/([^/?#]+)/);
            const precoAtual = card.querySelector('[data-testid="price-display-price"]');
            const areaPreco = card.querySelector('[data-testid="price-display"]');
            const precoAnterior = areaPreco
                ? Array.from(areaPreco.querySelectorAll('p, span')).find(el => el !== precoAtual && /line-through/.test(el.className) && /R\$/.test(textoDe(el)))
                : null;
            // Produtos vendidos a peso exibem a unidade colada ao preco (ex: "R$ 7,89kg").
            const unidadeMatch = textoDe(areaPreco).replace(/\s+/g, '').match(/R\$[\d.,]+\/?([a-z]+)/);
            const nome = textoDe(card.querySelector('p.line-clamp-2')) || (card.querySelector('img') || {}).alt || '';
            const imagem = card.querySelector('img');

            return {
                id: slugMatch ? slugMatch[1] : null,
                name: nome,
                price: textoDe(precoAtual).replace(/[a-z/]+$/i, '').trim() || null,
                originalPrice: textoDe(precoAnterior) || null,
                unit: unidadeMatch ? unidadeMatch[1].toLowerCase() : 'un',
                tag: null,
                image: imagem ? imagem.src : null,
                url: new URL(href, location.origin).href
            };
        }).filter(produto => produto.id && produto.name && produto.price);
    }, CARD_SELECTOR);
}

async function rasparSubcategoria(driver, subcategoria, opcoes) {
    if (!(await abrirComProdutos(driver, subcategoria.url))) {
        return [];
    }

    let ultimaContagem = 0;
    let rolagensSemNovidade = 0;

    for (let i = 0; i < MAX_ROLAGENS_POR_SUBCATEGORIA; i++) {
        const contagem = await driver.executeScript(
            selector => document.querySelectorAll(selector).length,
            CARD_SELECTOR
        );

        if (contagem > ultimaContagem) {
            ultimaContagem = contagem;
            rolagensSemNovidade = 0;
        } else if (++rolagensSemNovidade >= ROLAGENS_SEM_NOVIDADE_PARA_PARAR) {
            break;
        }

        await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
        await sleep(2500);
    }

    const produtos = await extrairProdutosDaPagina(driver);
    await aguardarEntrePaginas(opcoes.delay);
    return produtos;
}

async function raspar(driver, mercado, opcoes) {
    const categorias = await descobrirCategorias(driver, mercado);
    console.log(`[${mercado.slug}] ${categorias.length} categorias encontradas.`);

    const produtos = new Map();

    for (const categoria of categorias) {
        const subcategorias = await descobrirSubcategorias(driver, categoria);
        let totalNaCategoria = 0;

        for (const subcategoria of subcategorias) {
            const encontrados = await rasparSubcategoria(driver, subcategoria, opcoes);

            for (const produto of encontrados) {
                if (!produtos.has(produto.id)) {
                    produtos.set(produto.id, {
                        ...produto,
                        department: categoria.nome,
                        subcategory: subcategoria.nome || null
                    });
                    totalNaCategoria++;
                }
            }
        }

        console.log(`[${mercado.slug}] ${categoria.nome}: ${totalNaCategoria} produtos em ${subcategorias.length} subcategorias.`);
    }

    return [...produtos.values()];
}

module.exports = {
    raspar
};
