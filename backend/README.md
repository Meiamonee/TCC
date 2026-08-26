# Backend

Backend do comparador de precos.

Ele tem duas responsabilidades:

- Executar o pipeline de scraping e importar os produtos no MongoDB.
- Servir uma API HTTP para o frontend consultar os produtos em tempo de execucao.

## Scripts

```bash
npm run dev
```

Inicia a API em `http://localhost:3001`.

```bash
npm run atualizar
```

Executa os scrapers de SuperVale e Fonseca e importa os dados para o MongoDB.

```bash
npm run atualizar:supervale
npm run atualizar:fonseca
```

Executa o scraping e a importacao de apenas um mercado.

```bash
npm run importar:supervale
npm run importar:fonseca
```

Importa os arquivos `products.json` ja existentes, sem executar scraping novo.

```bash
npm run scheduler
```

Mantem o agendamento ativo para atualizar todos os dias as 6h e 18h.

## API

- `GET /api/health`
- `GET /api/produtos`
- `GET /api/categorias`
- `GET /api/supermercados`
- `POST /api/scraping/atualizar`

Variaveis de ambiente:

- `MONGODB_URI`: conexao MongoDB usada pelo backend. Padrao: `mongodb://localhost:27017/Mercados`
- `MONGO_URI` ou `MONGO_URL`: nomes alternativos aceitos para a mesma conexao.
- `PORT`: porta da API. Padrao: `3001`
- `CORS_ORIGIN`: origens liberadas, separadas por virgula.
- `SCRAPER_PAGE_DELAY_MS`: pausa base entre paginas do scraper. Padrao no `.env`: `8000`
- `SCRAPER_PAGE_DELAY_JITTER_MS`: variacao aleatoria somada a pausa base. Padrao no `.env`: `4000`
- `CHROME_BINARY_PATH` ou `SELENIUM_CHROME_BINARY_PATH`: caminho do executavel do Chrome usado pelo Selenium.
- `CHROMEDRIVER_PATH` ou `SELENIUM_CHROMEDRIVER_PATH`: caminho do ChromeDriver. Se nao for definido, o Selenium Manager resolve automaticamente.
- `SE_MANAGER_PATH`: caminho de um Selenium Manager customizado.
