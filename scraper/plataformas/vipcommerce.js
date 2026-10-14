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

async function descobrirDepartamentos(driver, mercado) {
    await driver.get(mercado.url);
    await driver.wait(until.elementLocated(By.css('a[href*="/departamentos/"]')), 30000);
    await confirmarUnidade(driver, mercado);

    const links = await driver.executeScript(() => {
        return Array.from(document.querySelectorAll('a[href*="/departamentos/"]')).map(link => ({
            href: link.getAttribute('href'),
            texto: (link.innerText || '').trim(),
            rotulo: link.getAttribute('aria-label') || link.getAttribute('title') || ''
        }));
    });

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
            const folhas = Array.from(card.querySelectorAll('span, div'))
                .filter(el => el.children.length === 0 && textoDe(el));

            const precos = folhas.filter(el => /^R\$/.test(textoDe(el)));
            const precoAtual = precos.find(el => !el.className.includes('line-through'));
            const precoAnterior = precos.find(el => el.className.includes('line-through'));
            const unidade = folhas.find(el => /^\/\s*[a-z]+$/i.test(textoDe(el)));
            // Alguns produtos a peso trazem preco e unidade juntos (ex: "R$ 39,90/kg").
            const unidadeNoPreco = textoDe(precoAtual).match(/\/\s*([a-z]+)$/i);
            const nome = textoDe(card.querySelector('.vip-card-produto-descricao')) || link.getAttribute('title') || '';
            const imagem = card.querySelector('vip-image img, img');

            // Produtos a peso em embalagem fechada mostram o preco por kg e o da embalagem
            // (ex: "R$ 3,99/kg" e "R$ 11,17 /2,8kg"), mas o preco antigo e o da embalagem.
            // Nesse caso o preco antigo e convertido para kg, como o preco atual.
            let precoAntigo = textoDe(precoAnterior) || null;
            const pesoEmbalagem = textoDe(card.querySelector('[data-cy="unidade"]')).match(/^\/\s*([\d.,]+)\s*kg$/i);
            if (precoAntigo && unidadeNoPreco && pesoEmbalagem) {
                const peso = Number.parseFloat(pesoEmbalagem[1].replace(',', '.'));
                const valor = Number.parseFloat(precoAntigo.replace(/[^\d,]/g, '').replace(',', '.'));
                if (peso > 0 && Number.isFinite(valor)) {
                    precoAntigo = `R$ ${(valor / peso).toFixed(2).replace('.', ',')}`;
                }
            }

            return {
                id: idMatch ? idMatch[1] : null,
                name: nome,
                price: textoDe(precoAtual).replace(/\/\s*[a-z]+$/i, '').trim() || null,
                originalPrice: precoAntigo,
                unit: unidade
                    ? textoDe(unidade).replace('/', '').trim().toLowerCase()
                    : (unidadeNoPreco ? unidadeNoPreco[1].toLowerCase() : null),
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
