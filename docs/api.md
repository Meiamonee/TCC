# API do SuperPreço

**Endereço base:**
- Produção: `https://superpreco-api.onrender.com/api`
- Local: `http://localhost:3001/api`

**Formato:**
- Todas as respostas são JSON.
- Os erros vêm como `{ "error": "mensagem" }`, com o código HTTP correspondente.
- Os produtos usam os nomes de campo em inglês do frontend (`name`, `price`…) e os textos ficam em português.

## Produto (formato comum)

Este é o formato de cada produto nas respostas das rotas abaixo:

```json
{
  "id": "6acf131910fd0b23fe2d2d98",
  "name": "Salame Perdigão 700g",
  "price": "R$ 48,93",
  "priceNumber": 48.93,
  "originalPriceNumber": 88.19,
  "unit": "un",
  "unitPrice": 69.9,
  "unitPriceLabel": "kg",
  "tag": null,
  "image": "https://...",
  "url": "https://www.vilasul.com.br/produto/11941/salame-perdigao-700g",
  "department": "Frios e Laticínios",
  "originalDepartment": "Frios e laticínios",
  "isFood": true,
  "supermercado": "vilasul",
  "supermercadoNome": "Vila Sul",
  "disponivel": true,
  "dataColeta": "2026-10-15T05:06:57.132Z"
}
```

Campos que precisam de explicação:
- `originalPriceNumber`: preço "de" quando o produto está em oferta; `null` quando não está.
- `unitPrice` e `unitPriceLabel`: preço por kg, L, m ou unidade, usado para comparar embalagens de tamanhos diferentes.
- `url`: página do produto no site do mercado.
- `dataColeta`: data e hora em que o preço foi lido no site.

## Rotas

### Produtos

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/produtos` | Busca e lista produtos, paginada. |
| GET | `/produtos/:id` | Detalhe de um produto. |
| GET | `/produtos/:id/comparacao` | O mesmo produto (marca, versão e tamanho) nos outros mercados, do mais barato ao mais caro. |
| GET | `/produtos/:id/similares?limite=6` | Produtos parecidos de outra marca e mais baratos por kg/L/un. `limite` vai de 1 a 20. |
| GET | `/produtos/:id/relacionados?limite=12` | Outros produtos do mesmo tipo (ex.: outras cervejas). `limite` vai de 1 a 30. |
| GET | `/produtos/:id/historico?dias=90` | Histórico de preços, com o menor e o maior preço do período. `dias` vai de 1 a 365. |

**Parâmetros de `GET /produtos`:**

| Parâmetro | Valores | Padrão |
| --- | --- | --- |
| `search` | texto, até 100 caracteres; cada palavra precisa estar no nome, sem diferenciar acentos | — |
| `supermercado` | `supervale`, `vilasul`, `sanmichel`, `pedrilho` | todos |
| `categoria` | nome da categoria padronizada (ver `/categorias`) | todas |
| `alimentos` | `true`: só alimentos | — |
| `ofertas` | `true`: só produtos com preço "de" | — |
| `ordenar` | `nome`, `menor-preco`, `maior-preco`, `menor-preco-unidade` | por categoria e nome |
| `page` | 1 a 1000 | 1 |
| `limit` | 1 a 100 | 40 |
| `includeIndisponiveis` | `true`: inclui produtos que saíram do site | — |

A resposta tem o formato `{ data: [produtos], total, page, limit, totalPages }`.

### Mercados, categorias e painel

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/supermercados` | Mercados com endereço da unidade de Poços de Caldas, total de produtos e última coleta. |
| GET | `/categorias?supermercado=` | Categorias padronizadas com o total de produtos. |
| GET | `/cesta-basica` | Custo da cesta básica do DIEESE em cada mercado. |
| GET | `/estatisticas` | Números do painel: produtos, última e próxima coleta, cesta básica e variações de preço. |

### Lista de compras

`POST /lista/cotacao` cota a lista em todos os mercados.

Exemplo de requisição:

```json
{ "itens": [ { "id": "6acf131910fd0b23fe2d2d98", "quantidade": 2, "aceitaSimilar": true } ] }
```

Regras dos itens:
- `id` é obrigatório.
- `quantidade` vai de mais de 0 até 999; o padrão é 1.
- `aceitaSimilar` (padrão `true`) permite trocar por outra marca quando o mercado não tem o item.
- A lista pode ter no máximo 100 itens.
- Ids que não existem mais são ignorados.

A resposta mostra, por mercado:
- o total e quanto sai só com itens iguais;
- as trocas feitas e os itens que faltaram;
- o melhor mercado;
- a compra dividida, com o mais barato de cada item.

### Coleta e saúde

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | Diz se a API está no ar (`ok`), o banco em uso e se há coleta rodando. |
| GET | `/scraping/status` | Estado da última coleta disparada por esta API. |
| POST | `/scraping/atualizar` | Dispara a coleta (Selenium) nesta máquina. Corpo: `{ "mercado": "supervale" }` ou `"todos"`. |

`POST /scraping/atualizar` exige o cabeçalho `Authorization: Bearer <ADMIN_TOKEN>`. Ela responde `202` e roda a coleta em segundo plano.

A rota fica desligada (`503`) quando `ADMIN_TOKEN` não está definido ou tem menos de 16 caracteres. No Render o token não é definido, porque lá não há Chrome; a coleta em produção roda no GitHub Actions.

## Segurança

| Medida | Como funciona |
| --- | --- |
| Limite de requisições por IP | 300 consultas/min no geral; 30 cotações/min; 5 tentativas/min na rota administrativa. Passou do limite, a resposta é `429` com o cabeçalho `Retry-After`. `/health` fica fora do limite. Atrás de proxy, `TRUST_PROXY` diz quantos proxies confiar para achar o IP real. |
| Cabeçalhos de segurança (helmet) | `Content-Security-Policy: default-src 'none'`, HSTS, `X-Content-Type-Options: nosniff`, proibição de iframe; sem `X-Powered-By`. |
| CORS | Só o endereço do site (`CORS_ORIGIN`) pode chamar a API pelo navegador. |
| Validação das entradas | Parâmetros desconhecidos, repetidos ou fora da faixa geram `400` com uma mensagem clara. A busca é tratada como texto: caracteres especiais não viram expressão regular. Corpo das requisições limitado a 20 KB (`413`). |
| Token administrativo | Comparado em tempo constante (`crypto.timingSafeEqual`), para não vazar informação pelo tempo de resposta. |
| Erros internos | Registrados no servidor e respondidos só como "Erro interno do servidor", sem detalhes. |
| Segredos | A conexão com o banco e o token ficam em variáveis de ambiente, fora do git. |

## Códigos de resposta

| Código | Quando |
| --- | --- |
| 200 | Sucesso. |
| 202 | Coleta iniciada (`/scraping/atualizar`). |
| 400 | Parâmetro ou corpo inválido. |
| 401 | Token administrativo ausente ou errado. |
| 404 | Produto ou rota inexistente. |
| 409 | Já existe uma coleta em execução. |
| 413 | Corpo da requisição maior que 20 KB. |
| 429 | Muitas requisições; aguarde o tempo indicado em `Retry-After`. |
| 500 | Erro interno. |
| 503 | Coleta manual desligada nesta instalação. |
