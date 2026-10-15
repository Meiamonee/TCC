# Resultados: análise dos dados coletados

Relatório gerado por `npm --prefix backend run analise` em **15/10/2026, 11:13:24**, a partir do banco `Mercados`.
Figuras em `graficos/` (SVG), tabelas em `dados/` (CSV, separador `;`) e todos os números em `dados.json`.

> Os números mudam a cada coleta. Rode o script de novo perto da entrega para atualizar o capítulo.

## 1. Dados coletados

| Supermercado | Produtos | Alimentos | Em oferta | Com preço por kg/L/un | Última coleta |
| --- | ---: | ---: | ---: | ---: | --- |
| SuperVale | 3.287 | 2.116 | 44 | 3.078 | 15/10/2026, 01:24:56 |
| Vila Sul | 9.013 | 5.821 | 0 | 8.193 | 15/10/2026, 02:06:57 |
| San Michel | 5.010 | 3.134 | 115 | 4.378 | 15/10/2026, 01:33:56 |
| Pedrilho | 9.516 | 5.500 | 0 | 8.628 | 15/10/2026, 01:50:20 |

- **Total:** 26.826 produtos disponíveis e 143 indisponíveis (saíram do site).
- **Departamentos:** 13 categorias padronizadas. As maiores são Higiene e Saúde (4.861), Mercearia (3.453), Bebidas (3.003).

![Produtos disponíveis por supermercado](graficos/produtos-por-mercado.svg)

**Atualização periódica (GitHub Actions).**
- **Execuções:** 1 coletas concluídas, 0 delas agendadas (6h e 18h).
- **Mercados coletados:** 4 de 4 terminaram com sucesso (100%).
- **Tempo:** cada mercado roda em paralelo, então a coleta completa leva o tempo do mais lento, cerca de 61,9 min.

![Tempo da coleta de cada mercado no GitHub Actions](graficos/tempo-de-coleta.svg)

## 2. Comparação entre mercados

| Supermercado | Produtos | Mesmo produto em outro mercado | Mesmo ou similar | Comparável nos 4 mercados |
| --- | ---: | ---: | ---: | ---: |
| SuperVale | 3.287 | 52,7% | 86,4% | 59% |
| Vila Sul | 9.013 | 30,7% | 68,5% | 41,7% |
| San Michel | 5.010 | 46,7% | 78,2% | 48,8% |
| Pedrilho | 9.516 | 25,7% | 68,8% | 43,3% |
| **Geral** | **26.826** | **34,6%** | **72,6%** | **45,7%** |

- **Mesmo produto:** só 34,6% dos produtos aparecem em pelo menos um outro mercado com a mesma marca, versão e tamanho.
- **Com similares:** contando produtos parecidos de outra marca, 72,6% passam a ter com o que comparar. Os similares têm o mesmo tipo e departamento e tamanho até 25% diferente, comparados por kg/L/un.
- **Por que isso importa:** a diferença justifica a funcionalidade de similares e de substitutos na lista de compras.

![Produtos que podem ser comparados com outro mercado](graficos/cobertura-da-comparacao.svg)

### Diferença de preço do mesmo produto

- **Produtos comparados:** 4.696 produtos estão em mais de um mercado.
- **Diferença entre o maior e o menor preço:** em média 26,2% (mediana 18,8%), ou R$ 2,57 por produto.
- **Acima de 20%:** em 2.206 produtos (47%).
- **Mesmo preço em todos:** só 57 produtos.
- **Metade dos produtos:** diferença de até 18,8%; três quartos, até 32,4%.
- **Casos anormais:** 73 produtos com o maior preço acima do triplo do menor ficaram fora das contas. Quase sempre são erro de identificação ou de cadastro no site (ex.: Lasanha Seara 4 Queijos 600gr (supervale, R$ 16.99) × Lasanha 4 Queijos Seara Caixa 600g (pedrilho, R$ 6.6) × Lasanha Seara 4 Queijos 600gr (sanmichel, R$ 15.99) × Lasanha Seara 4 Queijos 600gr (vilasul, R$ 20.41)).
- **Precisão da comparação:** ainda não conferida. Preencha a coluna `mesmo_produto` (s/n) de `validacao/amostra.csv`, com 50 pares sorteados, e rode o script de novo.

![Diferença de preço do mesmo produto entre os mercados](graficos/diferenca-de-preco.svg)

![Quantas vezes cada mercado tem o menor preço do mesmo produto](graficos/mais-barato-por-mercado.svg)

**Comparação de dois em dois mercados** (produtos vendidos nos dois):

| Mercados (A × B) | Produtos em comum | A mais barato | B mais barato | Mesmo preço |
| --- | ---: | ---: | ---: | ---: |
| San Michel × Vila Sul | 2.053 | 85,7% | 13,6% | 0,6% |
| Pedrilho × Vila Sul | 1.853 | 72,7% | 26,2% | 1% |
| Pedrilho × San Michel | 1.524 | 43,1% | 53,7% | 3,1% |
| SuperVale × Vila Sul | 1.434 | 58,4% | 40,4% | 1,3% |
| Pedrilho × SuperVale | 1.426 | 66,5% | 29,2% | 4,3% |
| San Michel × SuperVale | 1.239 | 67,6% | 24,3% | 8,1% |

**Mercado com o menor preço mais vezes, por categoria:**

| Categoria | Produtos comparados | Mais barato mais vezes | % das vezes |
| --- | ---: | --- | ---: |
| Higiene e Saúde | 839 | San Michel | 40,9% |
| Mercearia | 767 | San Michel | 39,4% |
| Bebidas | 579 | Pedrilho | 35,8% |
| Biscoitos e Chocolates | 525 | San Michel | 44,5% |
| Matinais e Sobremesas | 493 | Pedrilho | 42% |
| Limpeza | 461 | Pedrilho | 44% |
| Frios e Laticínios | 363 | San Michel | 51,1% |
| Bazar e Utilidades | 202 | Pedrilho | 41,5% |
| Congelados | 162 | Pedrilho | 41,7% |
| Padaria | 116 | Pedrilho | 41,4% |
| Hortifruti | 71 | Pedrilho | 48,6% |
| Carnes e Peixes | 68 | Pedrilho | 38,2% |
| Pet | 50 | San Michel | 48% |

## 3. Cesta básica e lista de compras

| Supermercado | Cesta básica | Itens encontrados |
| --- | ---: | ---: |
| San Michel | R$ 613,87 | 12 de 13 |
| Pedrilho | R$ 664,42 | 13 de 13 |
| SuperVale | R$ 720,82 | 13 de 13 |
| Vila Sul | R$ 905,44 | 13 de 13 |

- **Mais barato com a cesta completa:** Pedrilho, com R$ 664,42.
- **Mais caro:** Vila Sul, com R$ 905,44. A diferença é de R$ 241,02 por mês (36,3%).
- **San Michel** não entra na comparação do total: falta Pão francês no site.

![Custo da cesta básica (DIEESE) em cada mercado](graficos/cesta-basica.svg)

**Lista de exemplo** com 12 itens básicos, um de cada. Para cada item foi escolhido o produto vendido no maior número de mercados:

| Item procurado | Produto | Mercado |
| --- | --- | --- |
| arroz tipo 1 5kg | Arroz Polido Tipo 1 Super Ecco Pacote 5kg | Pedrilho |
| feijao carioca 1kg | Feijão Carioca Du Irineu 1kg | San Michel |
| acucar refinado 1kg | Acucar Refinado Uniao 1kg | SuperVale |
| cafe 500g | Café Torrado E Moído Tradicional Café Pacaembu Pacote 500g | San Michel |
| oleo soja 900ml | Óleo Soja Liza Pet 900ml | San Michel |
| leite integral 1l | Leite Quata 1l Integral | San Michel |
| macarrao espaguete 500g | Macarrao Galo Semola Espaguete Furadinho Pa 500g | SuperVale |
| farinha trigo 1kg | Farinha De Trigo Renata Dia A Dia 1kg | SuperVale |
| sal refinado 1kg | Sal Refinado Cisne Pacote 1kg | Pedrilho |
| margarina 500g | Margarina Doriana Cremosa Com Sal 500gr | SuperVale |
| molho tomate | Molho De Tomate Fugini Tradicional 300g | Vila Sul |
| achocolatado 400g | Achocolatado em Pó Muky Chocolate Pacote 400g | Pedrilho |

| Supermercado | Total | Só itens iguais | Trocas por similar | Itens faltando |
| --- | ---: | ---: | ---: | ---: |
| San Michel | R$ 99,72 | R$ 90,54 | 2 | 0 |
| SuperVale | R$ 107,40 | R$ 98,41 | 1 | 0 |
| Vila Sul | R$ 109,15 | R$ 103,56 | 1 | 0 |
| Pedrilho | R$ 110,02 | R$ 110,02 | 0 | 0 |

- **Melhor mercado:** San Michel, com R$ 99,72.
- **Mais caro com a lista completa:** Pedrilho, com R$ 110,02. A diferença é de R$ 10,30 (10,3%).
- **Compra dividida** (cada item no mercado onde é mais barato): R$ 92,01, R$ 7,71 a menos que o melhor mercado.

![Total de uma lista de compras de exemplo em cada mercado](graficos/lista-de-compras.svg)

## 4. Variação de preços no período

A variação é medida só a partir de 15/10/2026. Antes disso, o histórico mistura mudanças reais com efeitos das correções feitas na coleta, como a troca do preço por kg pelo preço da embalagem, que apareceriam como altas e quedas que não aconteceram.

- **Período:** — a —.
- **Registros:** 0 registros de preço de 0 produtos.
- **Mudanças de preço:** 0 (0 altas e 0 quedas), em 0 produtos.
- **Tamanho típico da mudança:** alta mediana de 0% e queda mediana de 0%.

_Ainda não há mudanças suficientes no histórico; rode de novo depois de algumas semanas de coleta._

## 5. Tempo de resposta da API

Medido em 15/10/2026, 11:13:24, contra `https://superpreco-api.onrender.com/api`.
- **Primeira resposta:** 474 ms. Inclui acordar o servidor gratuito se ele estava parado.
- **Demais respostas:** mediana e percentil 90 de 10 requisições por rota.

| Rota | Caminho | Mediana | Percentil 90 |
| --- | --- | ---: | ---: |
| Busca de produtos | `/produtos` | 596 ms | 701 ms |
| Detalhe do produto | `/produtos/:id` | 275 ms | 306 ms |
| Comparação entre mercados | `/produtos/:id/comparacao` | 389 ms | 411 ms |
| Similares de outras marcas | `/produtos/:id/similares` | 389 ms | 397 ms |
| Histórico de preços | `/produtos/:id/historico` | 387 ms | 399 ms |
| Cotação da lista de compras | `/lista/cotacao` | 508 ms | 515 ms |
| Cesta básica | `/cesta-basica` | 153 ms | 161 ms |
| Painel de estatísticas | `/estatisticas` | 155 ms | 158 ms |

![Tempo de resposta da API publicada](graficos/tempo-de-resposta-da-api.svg)

## 6. Avaliação com usuários

Roteiro e planilhas em `docs/avaliacao/`. A conferência dos requisitos do TCC também está lá.

**Tempo da pesquisa de preços:** ainda não aplicado. Preencha `docs/avaliacao/tempo.csv`.

**Usabilidade (SUS):** ainda não aplicado. Preencha `docs/avaliacao/sus.csv`.

## Figuras

1. `graficos/produtos-por-mercado.svg`: Produtos disponíveis por supermercado
2. `graficos/cobertura-da-comparacao.svg`: Produtos que podem ser comparados com outro mercado
3. `graficos/mais-barato-por-mercado.svg`: Quantas vezes cada mercado tem o menor preço do mesmo produto
4. `graficos/diferenca-de-preco.svg`: Diferença de preço do mesmo produto entre os mercados
5. `graficos/cesta-basica.svg`: Custo da cesta básica (DIEESE) em cada mercado
6. `graficos/lista-de-compras.svg`: Total de uma lista de compras de exemplo em cada mercado
7. `graficos/tempo-de-coleta.svg`: Tempo da coleta de cada mercado no GitHub Actions
8. `graficos/tempo-de-resposta-da-api.svg`: Tempo de resposta da API publicada
