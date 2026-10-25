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
| Backend | 62 | `node:test`; integração com MongoDB no banco `SuperPreco_test`, testes de segurança e dos cálculos da análise |
| Scraper | 16 | `node:test` + Selenium; o Chrome headless abre páginas de exemplo |

- **Testes do scraper**:
  - As páginas de exemplo (`scraper/test/fixtures`) têm cards de produto copiados do DOM real do SuperVale e do Pedrilho e são servidas por um servidor local. Os extratores rodam no navegador como na coleta real, mas sem depender dos sites nem de internet (cerca de 20 s).
  - Cobrem: descoberta de departamentos e categorias, leitura dos cards (preço, preço anterior, unidade, oferta, produto sem estoque), paginação, conferência da unidade, configuração dos mercados e utilitários.
- **Bug encontrado pelos testes**:
  - No VipCommerce, produtos a peso em embalagem fechada vinham com o preço atual por kg e o preço anterior da embalagem inteira.
  - Exemplo: abóbora de 2,8 kg aparecia como "de R$ 13,97 por R$ 3,99/kg", um desconto aparente de 71%, quando o correto é de R$ 4,99/kg para R$ 3,99/kg (20%).
  - Primeira correção: converter o preço anterior para kg. Depois foi substituída pela solução definitiva do item abaixo: guardar o preço cobrado pela embalagem (R$ 11,17 por 2,8 kg, "de" R$ 13,97).

- **Preço da embalagem × preço por kg** (encontrado comparando com o site):
  - Produtos pesados em bandeja no VipCommerce mostram dois preços: o cobrado pela embalagem ("R$ 48,93 /700g") e o preço por kg só como informação ("R$ 69,90/kg").
  - O scraper guardava o preço por kg como se fosse o preço do produto. Afetava cerca de 560 produtos (SuperVale 120, Vila Sul 339, San Michel 100), quase todos carnes e frios.
  - Correção: o extrator lê os campos `data-cy` do card ("preco", "unidade", "preco-antigo") e guarda o preço cobrado e o tamanho da embalagem. O backend calcula o preço por kg a partir do peso informado pelo site.

## Segurança da API (Etapa 3)

Medidas, testadas em `backend/test/seguranca.test.js` e documentadas em `docs/api.md`:

- **Limite de requisições por IP** (express-rate-limit):
  - 300 consultas/min no geral, 30 cotações de lista/min e 5 tentativas/min na rota administrativa.
  - Acima do limite, a resposta é `429` com `Retry-After`.
  - No Render o visitante é identificado pelo `CF-Connecting-IP` da Cloudflare. O número de saltos no `X-Forwarded-For` variava entre requisições, e com um valor fixo de `TRUST_PROXY` um IP falso enviado pelo cliente chegou a ser aceito. Na versão final, foi conferido que um IP falso no `X-Forwarded-For` é ignorado e que a Cloudflare recusa um `CF-Connecting-IP` falso.
- **Cabeçalhos de segurança** (helmet): CSP `default-src 'none'`, HSTS, `nosniff` e bloqueio de iframe; o servidor não anuncia o Express.
- **Validação das entradas**:
  - supermercado e ordenação desconhecidos geram `400`;
  - busca de até 100 caracteres, parâmetros repetidos recusados e página máxima;
  - lista de compras com até 100 itens e quantidade entre 0 e 999;
  - corpo das requisições limitado a 20 KB.
  - Os testes acharam um erro: um item `null` na lista derrubava a cotação com erro 500.
- **Rota administrativa**: token de no mínimo 16 caracteres, comparado em tempo constante.
- **Dependências**: o `npm audit` apontou 3 vulnerabilidades no backend (proxy-addr crítica, mongoose alta, qs moderada), corrigidas com `npm audit fix`. Backend, scraper e as dependências de produção do frontend ficaram com 0 vulnerabilidades. Restam 7 em ferramentas de build do frontend (Tailwind 3), que não vão para o site; corrigi-las exigiria migrar para o Tailwind 4.

## Análise de dados e avaliação (Etapa 4)

- **Relatório:** `npm --prefix backend run analise -- --api <url>` gera `docs/resultados/README.md` com tabelas (CSV) e gráficos (SVG). A comparação usa as mesmas regras do site, com todos os produtos na memória (cerca de 1,5 min no Atlas). Rodar de novo perto da entrega.
- **Avaliação da funcionalidade:** em `docs/avaliacao/` ficam a tabela "requisito × entrega" e os roteiros do teste de tempo (manual × SuperPreço) e do SUS. As planilhas `tempo.csv` e `sus.csv` entram no relatório automaticamente.
- **Primeiros números** (15/10/2026, banco de produção):
  - 26.826 produtos.
  - 34,6% têm o mesmo produto em outro mercado; com similares, 72,7%.
  - Diferença entre o maior e o menor preço do mesmo produto: mediana 18,8% (média 26,2%), acima de 20% em 47% dos produtos.
  - San Michel é o mais barato em 62% das comparações em que aparece, e Vila Sul em 17%.
  - Cesta básica completa: Pedrilho R$ 664,42 × Vila Sul R$ 905,44 (36% a mais). O San Michel ficou de fora por não vender pão francês no site.
  - Lista de 12 itens: San Michel R$ 99,72 × Pedrilho R$ 110,02. Comprando cada item onde é mais barato, R$ 92,01.
  - API publicada: mediana de 150 a 500 ms por rota.
- **Problemas que a análise revelou** (corrigidos):
  - granel (por kg) era tratado como o mesmo produto que uma embalagem;
  - pacotes "leve 12 pague 10" (L12p10) eram comparados com o produto avulso;
  - "sal para churrasco" era tratado como o mesmo produto que "sal refinado";
  - a migração ignorava o tamanho da embalagem;
  - a cesta básica levava 3,8 s por chamada e passou para 0,15 s com cache.
- **Limitações a discutir no texto:**
  - nomes genéricos sem marca ("Lemon Pepper 250g") podem casar com produtos de marca;
  - cadastros errados nos próprios sites (lata de Amstel a R$ 46,80) aparecem como diferenças anormais. As diferenças acima de 200% ficaram fora das médias (73 produtos);
- **Precisão da comparação** (validação manual feita pelo autor em 15/10/2026, com 50 pares "mesmo produto" sorteados e semente fixa, em `docs/resultados/validacao/amostra.csv`): **88%** (44 de 50). Os 6 erros, com o motivo anotado no arquivo:
  - **outra versão ou sabor:** Coca-Cola Plus Café × Coca-Cola comum; Waffer chocolate × chocolate e avelã; biscoito amanteigado de chocolate × biscoito de chocolate;
  - **kit × avulso:** shampoo + condicionador × só condicionador;
  - **número de unidades:** 1 escova × pacote com 2;
  - **embalagem:** garrafa de 355 ml × lata de 350 ml. A tolerância de 2% no tamanho aceitou a diferença de 1,4%.
  - Todos vêm de palavras que distinguem o produto ("plus", "avelã", "kit", "2 unids", "garrafa") e que pesam pouco na semelhança dos nomes. Fica como melhoria futura.
- **Variação de preços:** medida só a partir de 15/10/2026, porque antes o histórico mistura efeitos das correções da coleta.

## Tempo de coleta

Coleta das 18h de 14/10/2026, sequencial e sem pausa entre páginas:
- cerca de 16 min por mercado VipCommerce (San Michel: 5.016 produtos em 16,2 min);
- 45 min no Pedrilho (9.516 produtos).

Uma coleta completa dos 4 mercados leva cerca de 1h30. Por isso a atualização é periódica (node-cron, 6h e 18h) e não contínua; recoletar tudo a todo momento também sobrecarregaria os sites.

## Implantação

Ambiente em produção (out/2026), todo gratuito; detalhes em `docs/implantacao.md`:
- **Site**: Cloudflare Pages (https://superpreco.pages.dev).
- **API**: Render, plano grátis (https://superpreco-api.onrender.com), configurada pelo `render.yaml`.
- **Banco**: MongoDB Atlas Free em São Paulo; o banco tinha cerca de 40 MB, com 27 mil produtos e 30 mil pontos de histórico.
- **Coleta**: GitHub Actions às 6h e 18h, com Selenium e Chrome headless e um job por mercado em paralelo, gravando no Atlas.

Decisões:
- **Cloudflare Workers descartado**: no plano gratuito são 10 ms de CPU por requisição e 128 MB de memória, e não há Chrome para o Selenium.
- **VM Oracle Always Free**: era a primeira opção, mas não foi possível criar a conta; o instalador ficou em `deploy/oracle/`.
- **Render**: não tem Chrome e "dorme" após 15 minutos sem uso, por isso a coleta roda no GitHub Actions.
- **Repositório público**: necessário para ter minutos ilimitados de Actions. O histórico foi verificado e não continha segredos; a conexão com o banco fica em secrets do GitHub e do Render.
- **node-cron**: continua sendo o agendador quando a API roda em servidor próprio. No Render fica desligado (`SCHEDULER_ENABLED=false`).

Primeira coleta completa no GitHub Actions (15/10/2026), com os 4 mercados em paralelo, pausa de 0,5 s entre páginas e todos com sucesso:

| Mercado | Duração | Produtos |
| --- | --- | ---: |
| SuperVale | 20 min | 3.287 |
| San Michel | 29 min | 5.010 |
| Pedrilho | 45 min | 9.516 |
| Vila Sul | 62 min | 9.013 |

O total foi de cerca de 1 hora, contra cerca de 1h30 da coleta sequencial no PC. O Pedrilho, que tem proteção contra robôs (Cloudflare), não bloqueou as máquinas do GitHub.

Problemas resolvidos na implantação:
- No Windows, o Node não resolvia o endereço `mongodb+srv://` (`querySrv ECONNREFUSED`). Foi criada a opção `DNS_SERVERS`.
- O SuperVale passou a ter banners de campanha que carregam antes do menu. O scraper pegou só 6 "departamentos" e o importador marcou 2.146 produtos como indisponíveis. A correção foi esperar o menu "Ir para departamento de ..." e não marcar indisponíveis quando a coleta traz menos de 60% dos produtos.
- Foram removidos 548 pontos de histórico gravados com o preço por kg nos produtos em embalagem, antes da correção do preço da embalagem.

## Histórico do repositório

- Em 14/10/2026 o `main` do GitHub passou a ser a versão alinhada ao texto do TCC.
- Uma versão paralela anterior (um scraper por mercado, com Fonseca e arquivos de produtos versionados) foi preservada na branch `backup-main-d847fbc`.

## Lista de compras: só produtos iguais nos totais (25/10/2026)

- **Problema relatado pelo usuário:** o similar entrava no total de cada mercado e não ficava claro o que estava sendo comparado. Num teste, o "mesmo produto" do Pedrilho era o bolinho com massa e recheio invertidos, e a tela não mostrava qual produto foi usado.
- **Nova página:** (1) cartões com o total **só de produtos iguais**, quantos itens cada mercado tem e a data da coleta; (2) tabela item × mercado com o mais barato em verde e a compra dividida; (3) tabela "Completando com similares": a lista inteira de cada mercado com o similar no lugar do que falta. Item vendido por kg é calculado pelo preço por kg (1 kg de tomate a granel × bandeja de 700 g).
- **Teste com uma cesta básica (13 itens)** mostrou similares errados: carne suína (orelha) por carne bovina moída, batata doce por inglesa, pão de forma por pão francês, banana nanica por prata, margarina por manteiga. Corrigido com: nomes compostos (batata doce, pão de forma/queijo/francês viram um termo só), variantes bovina/suína e prata/nanica, "moída" como variante só para carne, núcleo do nome = primeira palavra e o candidato precisa ter o mesmo núcleo. Casos viraram testes (backend 63 testes).
