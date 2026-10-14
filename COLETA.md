# Coleta e confiabilidade

Execute os comandos na raiz interna do projeto (a pasta com este arquivo).

## Operação

- `npm run coleta -- piloto todos --max-pages 2 --max-departments 1`: validação limitada nos cinco mercados elegíveis. Importa parcialmente, preservando os demais produtos.
- `npm run coleta -- piloto todos`: departamentos de mercearia, cereais, matinais e laticínios; ainda é uma coleta parcial.
- `npm run coleta -- coletar todos`: catálogo completo, um supermercado por vez, gravando cada lote no MongoDB antes de continuar a navegação. Ordem: SuperVale, Vila Sul, San Michel, VN e Pedrilho.
- `npm run coleta -- status`: progresso salvo, quantidade, última atualização e erro. O horário da próxima navegação é o último registrado, não prova que existe processo ativo.
- `npm run coleta -- parar todos`: solicita parada cooperativa; aguarde o lote atual salvar e o navegador fechar.
- `npm run coleta -- retomar todos`: remove a solicitação de parada. Depois repita o comando original, com os mesmos limites.
- `npm run coleta -- coletar pedrilho --resume`: continua as categorias pendentes mesmo após 24 horas. Os preços já salvos mantêm a data original; a retomada entre dias não marca produtos ausentes como indisponíveis. Use `--fresh` depois para obter uma coleta inteira com preços do mesmo ciclo.
- `npm run coleta -- coletar todos --resume`: retoma as categorias pendentes dos cinco mercados e pula mercados concluídos nas últimas 24 horas.
- Acrescente `--fresh` para iniciar um novo ciclo. Checkpoints incompletos com mais de 24 horas exigem isso para não misturar preços antigos e novos.
- Troque `todos` por `supervale`, `vilasul`, `sanmichel`, `vn` ou `pedrilho` para operar uma loja.

O progresso é salvo atomicamente em `products*.checkpoint.json` após cada lote. Listagens concluídas são puladas; uma listagem interrompida é percorrida novamente desde o início e deduplicada por ID, pois a rolagem dinâmica não oferece um endereço estável de página. Falha na coleta completa gera `products.partial.json` e preserva `products.json`. Relatórios ficam ao lado dos arquivos de produtos; o resumo das importações fica em `scrapers/pipeline.report.json`.

Há trava por mercado e por pipeline. Uma chamada concorrente não inicia outra coleta da mesma loja. `index.legacy.js` preserva os antigos coletores apenas como referência; use os comandos acima.

O catálogo aparece no banco durante a coleta, sem esperar o mercado terminar. Os lotes são deduplicados por mercado e ID; mudanças são atualizadas. Somente ao concluir o catálogo inteiro da loja os produtos ausentes são marcados como indisponíveis. Se a gravação no banco falhar, o pipeline para e preserva o checkpoint, sem avançar para outra loja. A criação de referências de comparação fica para uma etapa posterior. O relatório `scrapers/pipeline.report.json` mostra a loja atual, lotes gravados, novos registros e horário da última importação.

## Navegação

Não há atraso artificial entre páginas nem descanso periódico. O coletor avança assim que o conteúdo atual termina de carregar. Apenas uma nova tentativa após erro usa um recuo curto, configurável por `SCRAPER_RETRY_DELAY_MS`. Captcha ou bloqueio reconhecido interrompe a loja, sem tentar contorná-lo.

Quando o cartão não informa a unidade, a coleta tenta primeiro a quantidade presente no nome (`500g`, `2kg`, `350ml`). Se ainda houver ambiguidade, abre a página de detalhe e salva a origem e a confiança da decisão junto ao produto.

## Comparação e dados

Quantidade, embalagem, categoria, marca e variante determinam a relação entre as ofertas. A interface separa `Mesmo produto em outros mercados`, `Produtos similares` e `Alternativas`. O mesmo produto mantém os níveis de confiança certo (95–100) e provável (80–94); similares e alternativas exigem unidade de preço comparável. Promoções são exibidas separadamente e ficam fora do ranking de preço normal.

Categorias são normalizadas preservando a original. `node backend/scripts/normalizarCategorias.js` atualiza os registros existentes sem alterar preços, histórico ou data de coleta. A lista de marcas pode ser ampliada em `shared/brands.json`.

Somente os cinco mercados listados em `config/supermarkets.json` participam da coleta e da apresentação.

## Atualizações periódicas

O scheduler inicia automaticamente junto com o backend por `npm start` e executa às 6h e 18h, no horário de São Paulo. `npm --prefix backend run scheduler` continua disponível para execução isolada e `scheduler:now` também começa imediatamente. Chamadas simultâneas são impedidas e cada tentativa fica registrada na coleção `collectionruns` do MongoDB.

`GET /api/coleta/status` informa se existe uma coleta ativa e lista as execuções recentes. `POST /api/scraping/atualizar` inicia a coleta em segundo plano, responde com HTTP 202 e exige `ADMIN_API_KEY` pelo cabeçalho `X-Admin-Key` ou `Authorization: Bearer <chave>`. O arquivo `backend/.env.example` documenta o agendamento, CORS e limites de requisições.

## Verificações

`npm test`, `npm run test:scrapers` (Chrome/Selenium) e `npm run build`.

## Contagem de resultados

Cartões repetidos no HTML são registrados separadamente dos IDs únicos. Uma listagem com total conhecido só termina pelo total de IDs ou quando todos os cartões anunciados estão presentes, todos têm ID e as repetições explicam exatamente a diferença. Não há tolerância para produtos ausentes. O banco continua recebendo um único registro por ID. A evidência fica no campo completion da listagem no checkpoint.

## Falhas por categoria

Cada categoria tem até três tentativas. Após falhas, o coletor espera aproximadamente 60 e 120 segundos, além da pausa normal de navegação. Listagens já concluídas são preservadas. Esgotadas as tentativas, as categorias ficam pendentes no relatório e o pipeline segue para o próximo mercado, com status final `partial`. Uma coleta incompleta nunca marca produtos ausentes como indisponíveis. Bloqueio, parada solicitada, unidade incorreta ou falha de gravação no MongoDB interrompem o pipeline.

Se o Chrome perder a sessão durante uma categoria, o coletor fecha a sessão antiga, abre um navegador novo, confirma novamente a loja e tenta a categoria. Após perdas repetidas, interrompe a coleta e preserva o checkpoint para investigação.
