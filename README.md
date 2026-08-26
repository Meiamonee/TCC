# TCC - Comparador de Precos

Projeto de comparacao de precos entre SuperVale e Supermercado Fonseca.

Fluxo atual:

1. Os scrapers coletam produtos nos sites dos mercados.
2. O backend importa os arquivos `products.json` gerados para o MongoDB.
3. A API Express consulta o MongoDB.
4. O frontend React consome a API em tempo de execucao.

## Comandos principais

Instalar dependencias do backend e do frontend:

```bash
npm run install:all
```

Iniciar backend e frontend juntos:

```bash
npm start
```

Isso sobe a API em `http://localhost:3001` e o frontend em `http://localhost:5173`.
Use `Ctrl+C` no terminal para encerrar os dois processos.

Backend/API, se quiser rodar separadamente:

```bash
cd backend
npm run dev
```

Atualizar dados via scraping:

```bash
cd backend
npm run atualizar
```

Rodar frontend:

```bash
cd frontend
npm run dev
```

Por padrao, a API usa `mongodb://localhost:27017/Mercados`.
Para trocar, defina `MONGODB_URI` no ambiente do backend. O backend tambem aceita `MONGO_URI` e `MONGO_URL`.

Os scrapers esperam entre as paginas para reduzir a frequencia de requisicoes.
Configure `SCRAPER_PAGE_DELAY_MS` e `SCRAPER_PAGE_DELAY_JITTER_MS` no `.env` do backend.
Os scrapers usam Selenium com Chrome. Por padrao, o Selenium Manager resolve o ChromeDriver automaticamente.
Se precisar informar caminhos manualmente, use:

- `CHROME_BINARY_PATH` ou `SELENIUM_CHROME_BINARY_PATH`: caminho do executavel do Chrome.
- `CHROMEDRIVER_PATH` ou `SELENIUM_CHROMEDRIVER_PATH`: caminho do ChromeDriver.
- `SE_MANAGER_PATH`: caminho de um Selenium Manager customizado.
