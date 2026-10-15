# Avaliação da funcionalidade (Etapa 4.a)

Este documento traz três coisas:
1. a conferência dos requisitos do TCC contra o que foi entregue;
2. o roteiro de dois testes com usuários: o tempo da pesquisa de preços e o questionário de usabilidade SUS;
3. as planilhas para registrar os testes.

Os resultados dos testes entram no relatório `docs/resultados/README.md` quando as planilhas são preenchidas e a análise roda de novo:

```bash
npm --prefix backend run analise -- --api https://superpreco-api.onrender.com/api
```

## 1. Requisitos × entrega

Requisitos definidos na seção 3.1 (Levantamento de Requisitos) e nos objetivos específicos (1.2.2) do TCC.

### Requisitos funcionais

| Requisito | Como foi atendido | Evidência |
| --- | --- | --- |
| Busca por produto | Busca por palavras, sem diferenciar acentos, com filtros por mercado, departamento, alimentos e ofertas, e ordenação por preço ou preço por kg/L | Página Produtos; `GET /api/produtos`; testes em `backend/test/api.test.js` |
| Visualização de preços por estabelecimento | Cada produto mostra o supermercado, o preço, o preço por kg/L/un e o link para a página no site do mercado; filtro por supermercado | Página do produto; `GET /api/produtos/:id` |
| Comparação entre mercados | O mesmo produto (marca, versão e tamanho) nos outros mercados, do mais barato ao mais caro, com a diferença em R$ e %; similares de outra marca; lista de compras cotada em todos os mercados | Página do produto (quadro de preços); `/comparacao`, `/similares`, `/lista/cotacao`; seção 2 do relatório de resultados |
| Exibição da data da coleta | Data e hora da coleta em cada preço e no painel | Cartões de produto, página do produto, Painel; campo `dataColeta` |
| Interface adaptada a dispositivos móveis | Versões próprias para celular (< 640 px), tablet (640–1023 px) e computador | `frontend/src/useDispositivo.js`; capturas de tela nas três larguras |
| Coleta automatizada dos sites (objetivo) | Selenium WebDriver lendo o DOM, um extrator por plataforma (VipCommerce e iBecom), conferindo a unidade de Poços de Caldas | `scraper/`; 16 testes em `scraper/test/` |
| Atualização periódica (objetivo / resultados esperados) | Coleta às 6h e às 18h: node-cron quando a API roda em servidor próprio e GitHub Actions na hospedagem gratuita | `backend/services/agendador.js`; `.github/workflows/coleta.yml`; seção 1 do relatório |

### Requisitos não funcionais

| Requisito | Como foi atendido | Evidência |
| --- | --- | --- |
| Usabilidade | Interface no estilo de encarte de supermercado, navegação por departamentos, lista de compras salva no aparelho | Questionário SUS (seção 3 deste documento) |
| Organização dos dados | MongoDB com Mongoose: produtos com campos padronizados (categoria, preço por unidade, palavras de comparação), histórico de preços em coleção própria, categorias padronizadas entre os mercados | `backend/models/`; `docs/api.md` |
| Tempo de resposta da API | Mediana entre ~150 e ~500 ms nas rotas principais, medida no servidor publicado; resultados guardados em cache onde os dados só mudam a cada coleta | Seção 5 do relatório de resultados |
| API organizada e segura (objetivo) | Rotas REST documentadas, respostas JSON, erros padronizados, validação das entradas, limite de requisições, cabeçalhos de segurança, CORS restrito | `docs/api.md`; `backend/test/seguranca.test.js` |
| Expansão para novos supermercados | Um mercado de plataforma já suportada entra só com uma linha de configuração (`scraper/mercados.js`: URL, plataforma e endereço da loja). Uma plataforma nova exige um extrator em `scraper/plataformas/` | `scraper/mercados.js` |

### Testes automatizados

| Módulo | Testes |
| --- | ---: |
| Backend: normalização, comparação, similares, importação, API, segurança e análise | 62 |
| Scraper: extratores no Chrome com páginas de exemplo, configuração e utilitários | 16 |
| **Total** (`npm test`) | **78** |

## 2. Teste de tempo: pesquisa manual × SuperPreço

**Objetivo:** verificar o resultado esperado de "reduzir o tempo médio gasto em pesquisas manuais de preços".

**Participantes:** de 3 a 8 pessoas. Cada uma faz a tarefa **dos dois jeitos**. Para metade, comece pelo manual; para a outra metade, pelo SuperPreço. Assim o aprendizado da primeira vez não favorece nenhum dos dois.

**Tarefa:** com a lista abaixo, descobrir **em qual dos 4 supermercados a lista sai mais barata e quanto custa**.

1. Arroz tipo 1, 5 kg
2. Feijão carioca, 1 kg
3. Açúcar refinado, 1 kg
4. Café, 500 g
5. Óleo de soja, 900 ml
6. Leite integral, 1 L
7. Macarrão espaguete, 500 g
8. Farinha de trigo, 1 kg
9. Sal refinado, 1 kg
10. Margarina, 500 g

**Como fazer:**
- **Manual:** a pessoa usa só os sites dos mercados (supervalesupermercados.com.br, vilasul.com.br, supersanmichel.com.br, pedrilho.com.br) e anota os preços, em papel ou calculadora.
- **SuperPreço:** a pessoa usa só https://superpreco.pages.dev, adicionando os itens à lista de compras.
- **Cronômetro:** começa quando a pessoa recebe a tarefa e para quando ela diz o mercado e o total.

**Registro:** preencha `tempo.csv` com uma linha por tentativa (`participante;metodo;segundos;acertou`):
- `metodo` é `manual` ou `superpreco`;
- `acertou` é `s` se o mercado indicado for de fato o mais barato.

## 3. Questionário de usabilidade (SUS)

**Instrumento:** o System Usability Scale (BROOKE, 1996), um questionário de 10 afirmações. A pessoa responde depois de usar o SuperPreço, por exemplo logo após o teste de tempo. Cada afirmação vai de **1 (discordo totalmente)** a **5 (concordo totalmente)**:

1. Eu acho que gostaria de usar este sistema com frequência.
2. Eu achei o sistema desnecessariamente complexo.
3. Eu achei o sistema fácil de usar.
4. Eu acho que precisaria de ajuda de uma pessoa com conhecimentos técnicos para usar o sistema.
5. Eu acho que as várias funções do sistema estão muito bem integradas.
6. Eu acho que o sistema apresenta muita inconsistência.
7. Eu imagino que as pessoas aprenderão como usar este sistema rapidamente.
8. Eu achei o sistema atrapalhado de usar.
9. Eu me senti confiante ao usar o sistema.
10. Eu precisei aprender várias coisas novas antes de conseguir usar o sistema.

**Pontuação** (o script calcula sozinho):
- Nas afirmações ímpares, a nota é a resposta − 1.
- Nas pares, a nota é 5 − a resposta.
- A soma das notas × 2,5 dá de 0 a 100.
- A média de referência da literatura é 68; acima disso, a usabilidade é considerada acima da média.

**Registro:** preencha `sus.csv` com uma linha por pessoa (`participante;q1;q2;...;q10`).

**Formulário:** dá para montar com as 10 afirmações acima numa escala de 1 a 5, por exemplo no Google Forms. Depois copie as respostas para o `sus.csv`.

## Referência

BROOKE, John. SUS: a "quick and dirty" usability scale. In: JORDAN, P. W. et al. (ed.). *Usability Evaluation in Industry*. London: Taylor & Francis, 1996. p. 189-194.
