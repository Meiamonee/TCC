# Backend

API do SuperPreço (Node.js + Express + MongoDB/Mongoose).

Responsabilidades:

- Servir a API HTTP consumida pelo frontend.
- Executar a coleta (scraper Selenium) e importar os produtos no MongoDB, de forma agendada (node-cron) ou manual.
- Normalizar os produtos para comparação entre supermercados e registrar o histórico de preços.

## Estrutura

- `app.js`: rotas da API (sem iniciar o servidor, para facilitar os testes).
- `server.js`: conecta ao MongoDB, inicia a API e o agendamento da coleta.
- `services/normalizacao.js`: palavras relevantes, variantes, quantidade, preço por unidade e categoria padronizada.
- `services/comparacao.js`: encontra o mesmo produto nos outros supermercados e os similares de outras marcas (núcleo do produto + qualificadores, mesma versão e tamanho parecido).
- `services/listaCompras.js`: cotação da lista de compras.
- `services/cestaBasica.js`: custo da cesta básica do DIEESE por supermercado.
- `services/importProducts.js`: importação dos arquivos do scraper e histórico de preços.
- `services/agendador.js`: coleta agendada e controle de execução.
- `models/`: Produto, HistoricoPreco, Categoria, Supermercado.

## Scripts

```bash
npm run dev
```

Inicia a API em `http://localhost:3001` (e o agendamento da coleta, a menos que `SCHEDULER_ENABLED=false`).

```bash
npm run atualizar
npm run atualizar -- pedrilho
```

Executa o scraper de todos os supermercados configurados em `scraper/mercados.js` (ou de um só: `supervale`, `vilasul`, `sanmichel`, `pedrilho`) e importa os dados.

```bash
npm run importar
npm run importar -- supervale
```

Importa os arquivos já coletados em `scraper/output/`, sem executar scraping novo.

```bash
npm run migrar
```

Atualiza um banco criado por versões anteriores. Pode ser executado mais de uma vez.

```bash
npm test
```

Testes unitários (normalização e comparação) e de integração (API) com `node:test`. A integração usa o banco `SuperPreco_test`.

## API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Situação da API |
| GET | `/api/produtos` | Lista paginada. Parâmetros: `search`, `categoria`, `supermercado`, `alimentos=true`, `ofertas=true`, `ordenar` (`menor-preco`, `maior-preco`, `menor-preco-unidade`, `nome`), `page`, `limit` (máx. 100) |
| GET | `/api/produtos/:id` | Um produto |
| GET | `/api/produtos/:id/comparacao` | O mesmo produto nos outros supermercados, do mais barato ao mais caro |
| GET | `/api/produtos/:id/similares` | Produtos parecidos de outras marcas, mais baratos por kg/L/un (`limite`, padrão 6) |
| GET | `/api/produtos/:id/historico` | Histórico de preço (`dias`, padrão 90) |
| GET | `/api/categorias` | Categorias padronizadas com total de produtos |
| GET | `/api/supermercados` | Supermercados ativos, total de produtos e última coleta |
| GET | `/api/cesta-basica` | Custo da cesta básica do DIEESE em cada supermercado |
| GET | `/api/estatisticas` | Painel: produtos coletados, última e próxima coleta, números por mercado e departamento, cesta básica e maiores variações de preço |
| POST | `/api/lista/cotacao` | Cota uma lista: `{ "itens": [{ "id": "...", "quantidade": 2, "aceitaSimilar": true }] }`. Com `aceitaSimilar`, mercados sem o mesmo produto entram com o similar mais barato |
| GET | `/api/scraping/status` | Situação da coleta |
| POST | `/api/scraping/atualizar` | Dispara a coleta (requer `Authorization: Bearer <ADMIN_TOKEN>`) |

## Variáveis de ambiente

- `MONGODB_URI`: conexão MongoDB. Padrão: `mongodb://localhost:27017/Mercados` (também aceita `MONGO_URI` ou `MONGO_URL`).
- `MONGODB_TEST_URI`: banco dos testes de integração. Padrão: `mongodb://localhost:27017/SuperPreco_test`.
- `PORT`: porta da API. Padrão: `3001`.
- `CORS_ORIGIN`: origens liberadas, separadas por vírgula.
- `ADMIN_TOKEN`: token exigido em `POST /api/scraping/atualizar`. Sem ele, a atualização manual pela API fica desabilitada.
- `SCHEDULER_ENABLED`: `false` desliga a coleta agendada junto com a API.
- `SCRAPER_CRON`: horário da coleta (formato cron). Padrão: `0 6,18 * * *` (6h e 18h, horário de Brasília).
- `SCRAPER_PAGE_DELAY_MS` e `SCRAPER_PAGE_DELAY_JITTER_MS`: pausa entre páginas do scraper (base + variação aleatória).
- `CHROME_BINARY_PATH` ou `SELENIUM_CHROME_BINARY_PATH`: caminho do Chrome usado pelo Selenium.
- `CHROMEDRIVER_PATH` ou `SELENIUM_CHROMEDRIVER_PATH`: caminho do ChromeDriver. Se não for definido, o Selenium Manager resolve automaticamente.
- `SE_MANAGER_PATH`: caminho de um Selenium Manager customizado.
