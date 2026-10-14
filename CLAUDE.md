# SuperPreço — contexto para o Claude

TCC de Pedro Lucas de Souza Faria (orientador: Douglas Fabiano de Sousa Nunes), IFSULDEMINAS campus Poços de Caldas: "SuperPreço: uma ferramenta web para análise e comparação de preços em supermercados".

## O que o texto do TCC promete (não contrariar)

- Stack: React.js + Tailwind CSS (frontend), Node.js + Express (backend), MongoDB + Mongoose, **Selenium WebDriver em JavaScript** para a coleta, **node-cron** para a atualização periódica.
- Dados por produto: nome, preço, supermercado, URL e **data da coleta** (exibida ao usuário).
- Requisitos: busca, preços por estabelecimento, comparação entre mercados, interface responsiva; API organizada e segura; expansão para novos mercados.
- Foco em produtos alimentícios de supermercados regionais (Poços de Caldas).

## Regras do projeto

- A coleta é **web scraping com Selenium lendo o DOM** (o que a página exibe). Não usar nem interceptar as APIs internas das plataformas (VipCommerce, iBecom).
- Coletar apenas preços da **unidade de Poços de Caldas**: cada mercado tem `enderecoLoja` em `scraper/mercados.js`, conferido antes da coleta (`scraper/lib/unidade.js`).
- Mercados atuais: SuperVale, Vila Sul, San Michel (VipCommerce) e Pedrilho (iBecom).
- Textos de interface e comentários em português.

## Onde fica cada coisa

- `scraper/`: `mercados.js` (configuração), `plataformas/` (um extrator por plataforma), saída em `scraper/output/<slug>.json` (ignorada no git).
- `backend/`: `app.js` (rotas), `services/normalizacao.js` e `services/comparacao.js` (comparação entre mercados), `services/importProducts.js`, `services/agendador.js`, `services/cestaBasica.js`, `test/` (`node:test`).
- `frontend/src/`: `App.jsx`, `components/`, `services/api.js`.

## Comandos

- `npm start` (raiz): API em 3001 + frontend em 5173.
- `npm test` (raiz): testes do backend + lint do frontend. Integração usa o banco `SuperPreco_test`.
- `npm --prefix backend run atualizar [-- <slug>]`: coleta + importação.
- `npm --prefix backend run migrar`: atualiza bancos de versões anteriores.
