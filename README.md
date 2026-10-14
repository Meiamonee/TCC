# SuperPreço

Ferramenta web para análise e comparação de preços em supermercados de Poços de Caldas (TCC — IFSULDEMINAS, campus Poços de Caldas).

Supermercados monitorados: **SuperVale, Vila Sul, San Michel e Pedrilho** (unidades de Poços de Caldas).

## Como funciona

1. O scraper (`scraper/`) abre os sites com **Selenium WebDriver**, confere se a loja exibida é a unidade de Poços de Caldas, percorre departamentos e páginas e lê os produtos exibidos na tela (nome, preço, preço "de" em ofertas, unidade, imagem, link e data da coleta).
2. O backend (`backend/`, **Node.js + Express**) importa os arquivos `scraper/output/<mercado>.json` no **MongoDB** (via Mongoose), calcula os campos de comparação e registra o histórico de preços.
3. A coleta roda automaticamente com **node-cron** (padrão: 6h e 18h) junto com a API.
4. O frontend (`frontend/`, **React + Tailwind CSS**) consome a API: busca, filtros, comparação entre mercados, lista de compras e cesta básica.

## Páginas

| Página | Endereço | Conteúdo |
|---|---|---|
| Início | `/` | Busca, departamentos, ofertas, cesta básica e supermercados participantes |
| Produtos | `/produtos` | Busca e navegação com filtros (supermercado, departamento, alimentos, ofertas) e ordenação; os filtros ficam na URL |
| Produto | `/produto/:id` | Preço, comparação nos outros supermercados e histórico de preço |
| Lista de compras | `/lista` | Itens escolhidos, total em cada supermercado e compra dividida |
| Painel de preços | `/painel` | Produtos coletados, data e hora da última e da próxima coleta, cesta básica, variações de preço e números por supermercado |
| Corredores | `/corredores` | Todos os departamentos e supermercados (aba de navegação do celular) |

O site tem três versões, escolhidas pela largura da tela (`frontend/src/useDispositivo.js`):

- **Celular** (até 639 px): barra de navegação inferior, carrosséis com deslize, filtros e ordenação em painéis que sobem da parte de baixo e barras fixas com a ação principal (adicionar à lista, comparar a lista).
- **Tablet** (640 a 1023 px): barra lateral de ícones, grades de 2 a 3 colunas e filtros em gaveta lateral.
- **Computador** (1024 px ou mais): cabeçalho completo e filtros fixos ao lado dos produtos.

Para abrir o site no celular ou tablet pela mesma rede Wi-Fi durante o desenvolvimento, inicie com a variável `EXPOR_NA_REDE=1` (no PowerShell: `$env:EXPOR_NA_REDE = '1'; npm start`) e acesse o endereço "Network" mostrado pelo Vite.

## Funcionalidades

- Busca por nome (sem diferenciar acentos), filtros por supermercado, categoria padronizada e "apenas alimentos", paginação no servidor.
- **Data da coleta** em cada produto.
- **Preço por kg/L/m/unidade**, calculado a partir do nome do produto.
- **Comparação do mesmo produto entre supermercados**: considera marca, variante (zero, integral, sabor...) e tamanho da embalagem (ver `backend/services/comparacao.js`).
- **Produtos similares**: quando o mesmo produto não existe em outro mercado (ou existe mais barato de outra marca), o sistema sugere opções do mesmo tipo, mesma versão e tamanho parecido, comparadas pelo preço por kg/L. Na lista de compras, cada item pode aceitar ou não um substituto de outra marca, e cada mercado mostra o total "só com itens iguais" e "com substitutos".
- **Histórico de preços** de cada produto, com destaque para o menor preço do período.
- **Lista de compras**: total em cada supermercado e a economia comprando cada item onde é mais barato.
- **Cesta básica do DIEESE** (Região Sudeste): custo mínimo em cada supermercado.

## Comandos principais

Instalar dependências do backend, frontend e scraper:

```bash
npm run install:all
```

Iniciar backend (API + coleta agendada) e frontend juntos:

```bash
npm start
```

Isso sobe a API em `http://localhost:3001` e o frontend em `http://localhost:5173`. Use `Ctrl+C` para encerrar.

Coletar e importar agora (todos os mercados ou um só):

```bash
npm --prefix backend run atualizar
npm --prefix backend run atualizar -- pedrilho
```

Rodar os testes (backend com `node:test` + lint do frontend):

```bash
npm test
```

Os testes de integração usam o banco `SuperPreco_test` no MongoDB local (configurável em `MONGODB_TEST_URI`) e são pulados se o MongoDB não estiver rodando.

Atualizar um banco criado por versões anteriores (move o histórico, recalcula os campos de comparação e as categorias):

```bash
npm --prefix backend run migrar
```

Calcular a cesta básica e registrar em `backend/logs/cesta-basica.csv`:

```bash
node backend/scripts/cestaBasica.js
```

## Supermercados e plataformas

Os mercados ficam configurados em `scraper/mercados.js`, com o endereço da unidade de Poços de Caldas usado na conferência antes da coleta. Cada plataforma de e-commerce tem um extrator em `scraper/plataformas/`:

| Mercado | Site | Plataforma | Unidade |
|---|---|---|---|
| SuperVale | supervalesupermercados.com.br | VipCommerce | Av. João Pinheiro, 1460 |
| Vila Sul | vilasul.com.br | VipCommerce | Av. Sílvio Monteiro dos Santos, 180 |
| San Michel | supersanmichel.com.br | VipCommerce | Av. Mansur Frayha, 875 |
| Pedrilho | pedrilho.com.br | iBecom | R. José Augusto de Carvalho, 55 |

Para incluir outro mercado de uma plataforma já suportada, basta adicionar uma entrada em `scraper/mercados.js`.

Rodar só o scraper, sem importar no banco:

```bash
cd scraper
node index.js supervale
```

O scraper lê apenas páginas públicas permitidas pelo `robots.txt` dos sites (departamentos, categorias e produtos) e respeita a pausa configurada entre páginas.

## Configuração

Por padrão, a API usa `mongodb://localhost:27017/Mercados`. Veja `backend/.env.example` e `backend/README.md` para as variáveis disponíveis (conexão, pausa do scraper, agendamento e token da atualização manual).
