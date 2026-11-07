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
- `npm test` (raiz): testes do backend, do scraper e lint do frontend. Integração usa o banco `SuperPreco_test`; os testes do scraper abrem o Chrome headless em páginas de `scraper/test/fixtures` (servidas localmente, sem internet).
- `npm --prefix backend run atualizar [-- <slug>]`: coleta + importação.
- `npm --prefix backend run migrar`: atualiza bancos de versões anteriores.
- `npm --prefix docs/tcc/gerador run gerar`: gera `docs/tcc/SuperPreco-artigo-TCC.docx` a partir de `docs/tcc/artigo.md` (instale antes com `npm --prefix docs/tcc/gerador install`).
- `npm --prefix backend run analise -- --api https://superpreco-api.onrender.com`: refaz a análise de dados em `docs/resultados/` (precisa de `MONGODB_URI` do Atlas no ambiente).

## Produção

- Site: https://superpreco.pages.dev (Cloudflare Pages, publica sozinho a cada push na `main`).
- API: https://superpreco-api.onrender.com (Render, plano gratuito: dorme quando ninguém acessa e leva ~1 min para acordar). Configuração em `render.yaml`; o agendador da API fica desligado (`SCHEDULER_ENABLED=false`).
- Banco: MongoDB Atlas (São Paulo). A senha nunca vai para o git: fica em `backend/.env.atlas` no PC do autor, no Render e no secret `MONGODB_URI` do GitHub. Numa sessão na nuvem, use a variável de ambiente `MONGODB_URI` do ambiente; não peça nem imprima a senha.
- Coleta: GitHub Actions (`.github/workflows/coleta.yml`), agendada para 6h e 18h de Brasília, mas costuma começar algumas horas depois (mediana de ~4h20). O repositório precisa continuar **público** para os minutos do Actions serem ilimitados.
- Branches: trabalhamos em `etapa-3-testes` e enviamos a mesma coisa para `main` (`git push origin etapa-3-testes etapa-3-testes:main`). A versão antiga do projeto está em `backup-main-d847fbc`.

## Texto do TCC (artigo)

- Fonte: `docs/tcc/artigo.md` (marcação: `#` seção, `##` subseção, `[[...]]` = trecho a revisar, destacado em amarelo no Word). Figuras em `docs/tcc/figuras/` (PNGs gerados dos SVGs; gráficos por `docs/tcc/gerador/graficos-tcc.js` a partir de `docs/resultados/dados.json`).
- Base para os números e decisões: `docs/notas-tcc.md` (atualizar a cada etapa) e `docs/resultados/`. Avaliação com usuários (38 respostas, SUS 87,2) em `docs/avaliacao/`.
- Modelo do campus (aplicado pelo gerador): Carta, margens 2,54 cm, Times 12, espaço 1,5, autores à direita com notas de rodapé, legendas "Tabela N." e "Figura N." centralizadas.
- Estilo pedido pelo autor: linguagem acessível, "em camadas" (o quê → exemplo → detalhe técnico), sem parecer texto de IA; o coordenador achou a primeira versão técnica demais.
- O orientador lê a versão no Google Docs (link com o autor). O Claude não consegue colar no Google Docs pelo navegador: o autor cola a partir do Word (abrir o .docx, Ctrl+A, Ctrl+C e colar no Docs); trechos pontuais dá para trocar pelo "Localizar e substituir" do Docs. Confira depois pela visualização `/mobilebasic?v=<número>` (sem o número ela vem do cache).
- Conferido em 07/11/2026: os números do texto batem com o site, a API e a análise da coleta de 06/11/2026.
