# TCC - Comparador de Precos

Projeto de comparacao de precos de supermercados de Pocos de Caldas: SuperVale,
Vila Sul, San Michel, VN Autosservico e Pedrilho.

Os cinco coletores ativos usam Selenium, verificam o endereco da unidade e
descobrem os departamentos no proprio site. Consulte [a documentacao dos
coletores](scrapers/README.md) para executar, validar e importar cada mercado.

Timer, retomada, parada, validacao e atualizacoes periodicas: veja [COLETA.md](COLETA.md).

Fluxo atual:

1. Os scrapers coletam produtos nos sites dos mercados.
2. O pipeline coleta um supermercado por vez e grava cada lote no MongoDB durante a execução. Os arquivos JSON preservam o progresso; veja [Coleta](COLETA.md) para iniciar e retomar.
3. A API Express consulta o MongoDB.
4. O frontend React pede 24 produtos por página; mercado, categoria, busca, preço e ordenação são aplicados no MongoDB. A comparação é carregada ao abrir um produto.

O comparador usa uma entidade canônica interna e apresenta três grupos: mesmo produto em outros mercados, produtos similares e alternativas da mesma família. Promoções ficam separadas do preço normal. Veja [COMPARACAO.md](COMPARACAO.md).

## Comandos principais

Instalar dependencias do backend e do frontend:

```bash
npm run install:all
```

Esse comando tambem instala o Selenium compartilhado na raiz. Requer Node.js 22+
e Chrome instalado para executar os coletores.

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
Opcionalmente configure `SCRAPER_RETRY_DELAY_MS` no `.env` do backend para o recuo após falhas.
Os scrapers usam Selenium com Chrome. Por padrao, o Selenium Manager resolve o ChromeDriver automaticamente.
Se precisar informar caminhos manualmente, use:

- `CHROME_BINARY_PATH` ou `SELENIUM_CHROME_BINARY_PATH`: caminho do executavel do Chrome.
- `CHROMEDRIVER_PATH` ou `SELENIUM_CHROMEDRIVER_PATH`: caminho do ChromeDriver.
- `SE_MANAGER_PATH`: caminho de um Selenium Manager customizado.
