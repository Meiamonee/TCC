// Confere se a pagina aberta esta exibindo a unidade esperada do supermercado.
// Os precos podem variar entre lojas de uma mesma rede, entao a coleta so prossegue
// quando o endereco da unidade de Pocos de Caldas aparece na pagina.

function normalizar(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim();
}

const TEMPO_MAXIMO_MS = 20000;

async function confirmarUnidade(driver, mercado) {
    if (!mercado.enderecoLoja) {
        return;
    }

    const esperado = normalizar(mercado.enderecoLoja);
    const limite = Date.now() + TEMPO_MAXIMO_MS;
    let encontrado = false;

    // O endereco da loja e carregado depois do restante da pagina.
    while (!encontrado && Date.now() < limite) {
        const textoPagina = await driver.executeScript(() => document.body.innerText);
        encontrado = normalizar(textoPagina).includes(esperado);
        if (!encontrado) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    if (!encontrado) {
        throw new Error(
            `Unidade inesperada: o site nao exibe "${mercado.enderecoLoja}". ` +
            'Coleta abortada para nao misturar precos de outra loja.'
        );
    }

    console.log(`[${mercado.slug}] Unidade confirmada: ${mercado.enderecoLoja}.`);
}

module.exports = {
    confirmarUnidade
};
