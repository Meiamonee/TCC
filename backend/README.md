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

Executa os scrapers de SuperVale, Vila Sul, San Michel, VN e Pedrilho e importa os dados para o MongoDB.

Para executar somente um mercado, use na raiz `npm run coleta -- coletar supervale`,
trocando o último argumento por `vilasul`, `sanmichel`, `vn` ou `pedrilho`.
Para importar um JSON já coletado, use `node backend/scripts/mercado.js importar MERCADO`.

Os novos coletores verificam a unidade de Pocos de Caldas. Consulte [execucao e validacao dos coletores](../scrapers/README.md) para dependencias, amostras e relatórios. Arquivos de amostra nao sao importados por esses comandos.

```bash
npm run scheduler
```

Mantem o agendamento ativo para atualizar todos os dias as 6h e 18h.

## API

- `GET /api/health`
- `GET /api/produtos?page=1&limit=24&sort=name`: catálogo paginado. Aceita `supermercado`, `categoria`, `search`, `min`, `max`, `sort=low|high|name` e `includeIndisponiveis=true`.
- `GET /api/catalogo/filtros`: categorias e quantidades por supermercado para a barra de filtros.
- `GET /api/produtos/:id/comparacoes`: produto selecionado e grupos de ofertas de outros mercados.
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
