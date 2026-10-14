# Notas para o texto do TCC

Registro das decisões, números e problemas encontrados durante o desenvolvimento do SuperPreço, para servir de base aos capítulos de metodologia, desenvolvimento, testes e resultados. Atualizado a cada etapa concluída.

## Coleta de preços (Selenium WebDriver)

- **Um scraper único** (`scraper/`) com um extrator por plataforma de e-commerce, em vez de um scraper por mercado. Novos mercados da mesma plataforma entram só com configuração em `scraper/mercados.js` (requisito de expansão para novos mercados).
  - **VipCommerce** (SuperVale, Vila Sul, San Michel): descobre os departamentos na página inicial e percorre a listagem pela URL `?page=N`; para depois de 2 páginas seguidas sem produto novo, porque a ordenação do site pode repetir itens entre páginas.
  - **iBecom** (Pedrilho): categorias → links "Ver todos" de cada subcategoria → rolagem infinita até não carregar mais produtos.
- **Leitura do DOM**: o Selenium lê o que a página exibe (nome, preço, preço anterior, unidade, imagem, link). A alternativa de ler a API interna das plataformas foi descartada, por equivaler a usar a API dos sites e fugir da proposta de web scraping.
- **Unidade de Poços de Caldas**: as redes têm mais de uma loja e os preços podem variar entre elas. Antes de coletar, o scraper confere se o endereço da loja de Poços (`enderecoLoja`) aparece na página; se for outra unidade, a coleta é abortada.
- **Robustez**:
  - Cada página tem até 3 tentativas, para uma lentidão passageira não fazer o scraper pular um departamento inteiro.
  - O user agent é de navegador comum, porque o Chrome headless se identificava como "HeadlessChrome" e a listagem do Pedrilho não era exibida.
  - A espera entre páginas é configurável (`SCRAPER_PAGE_DELAY_MS`).
- **Descartados**:
  - Código de barras (EAN): só existe na API privada, não na página.
  - Supermercado Fonseca: retirado do escopo.

## Volume coletado

Coleta de 14/10/2026:

| Supermercado | Plataforma | Produtos |
| --- | --- | ---: |
| Pedrilho | iBecom | 9.497 |
| Vila Sul | VipCommerce | 8.923 |
| San Michel | VipCommerce | 5.008 |
| SuperVale | VipCommerce | 3.291 |
| **Total** | | **26.719** |

## Comparação entre mercados

- **Normalização dos nomes** (`backend/services/normalizacao.js`):
  - Separa o nome em palavras e expande abreviações ("refrig" → refrigerante, "s/" → sem).
  - Identifica variantes: zero, integral, sabores, cores (preto/carioca), vinho tinto/branco, açúcar cristal/refinado/confeiteiro.
  - Extrai a quantidade da embalagem para calcular o **preço por unidade** (R$/kg, R$/L, R$/un).
- **Produto equivalente** (`backend/services/comparacao.js`) quando:
  - a semelhança dos nomes passa de 0,6, medida pelo coeficiente de Dice, em que palavras raras pesam mais que palavras comuns;
  - as variantes são as mesmas;
  - a quantidade da embalagem difere no máximo 2%.
- Apenas **cerca de 37%** dos produtos têm um equivalente exato em outro mercado. Daí surgiram:
  - **Produtos similares**: mesmo tipo e categoria, outra marca, tamanho até 25% diferente, ordenados pelo preço por unidade.
  - **Substitutos na lista de compras**: o usuário pode aceitar outra marca quando o mercado não tem o item, e o sistema mostra o total "com substitutos" e "só itens iguais".
- **Casos reais que viraram regras**:
  - feijão preto aparecia como similar de feijão carioca;
  - vinho tinto aparecia como similar de branco;
  - "Cristalçúcar" (açúcar cristal) era tratado como refinado.

## Funcionalidades além da proposta inicial

- Preço por unidade e comparação justa entre embalagens de tamanhos diferentes.
- Produtos similares e substitutos na lista de compras, com compra dividida entre mercados.
- Histórico de preços (coleção `HistoricoPreco`) e gráfico na página do produto.
- Cesta básica (itens do DIEESE) montada em cada mercado.
- Painel com estatísticas da coleta.
- Atualização automática com node-cron às 6h e às 18h.
- Versões próprias para celular e tablet e identidade visual inspirada em encarte de supermercado.

## Testes

| Módulo | Testes | Como |
| --- | ---: | --- |
| Backend | 28 | `node:test`; integração com MongoDB no banco `SuperPreco_test` |
| Scraper | 16 | `node:test` + Selenium; o Chrome headless abre páginas de exemplo |

- **Testes do scraper**:
  - As páginas de exemplo (`scraper/test/fixtures`) têm cards de produto copiados do DOM real do SuperVale e do Pedrilho e são servidas por um servidor local. Os extratores rodam no navegador como na coleta real, mas sem depender dos sites nem de internet (cerca de 20 s).
  - Cobrem: descoberta de departamentos e categorias, leitura dos cards (preço, preço anterior, unidade, oferta, produto sem estoque), paginação, conferência da unidade, configuração dos mercados e utilitários.
- **Bug encontrado pelos testes**:
  - No VipCommerce, produtos a peso em embalagem fechada vinham com o preço atual por kg e o preço anterior da embalagem inteira.
  - Exemplo: abóbora de 2,8 kg aparecia como "de R$ 13,97 por R$ 3,99/kg", um desconto aparente de 71%, quando o correto é de R$ 4,99/kg para R$ 3,99/kg (20%).
  - Corrigido convertendo também o preço anterior para kg.

## Histórico do repositório

- Em 14/10/2026 o `main` do GitHub passou a ser a versão alinhada ao texto do TCC.
- Uma versão paralela anterior (um scraper por mercado, com Fonseca e arquivos de produtos versionados) foi preservada na branch `backup-main-d847fbc`.
