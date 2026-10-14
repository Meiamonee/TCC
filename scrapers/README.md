# Coletores de supermercados de Poços de Caldas

Os quatro novos coletores usam **Selenium WebDriver + Chrome** e produzem o mesmo
array JSON esperado pelo importador: `id`, `name`, `price`, `image`, `url`,
`department`. O campo adicional `disponivel` preserva o estado exibido na loja.
Nenhum login ou compra é necessário.

## Sites e unidades verificadas

| Mercado | Site | Unidade em Poços de Caldas | Plataforma |
| --- | --- | --- | --- |
| Vila Sul | https://www.vilasul.com.br | Av. Sílvio Monteiro dos Santos, 180 | VipCommerce |
| San Michel | https://www.supersanmichel.com.br | Av. Mansur Frayha, 875 | VipCommerce |
| VN Autosserviço | https://www.vnautosservico.com.br | Av. João Pinheiro, 2345 | VipCommerce |
| Pedrilho | https://www.pedrilho.com.br | R. José Augusto de Carvalho, 55 | Instabuy |

O cadastro fica em `config/supermarkets.json`. Antes da coleta, o endereço precisa
corresponder ao da unidade cadastrada. Nos sites VipCommerce, a verificação usa
o seletor de entrega/retirada; no Pedrilho, o endereço publicado no rodapé.
Uma seleção de outra unidade interrompe a coleta.

## Reaproveitamento de HTML

Vila Sul, San Michel e VN compartilham os seletores usados no SuperVale:
`vip-card-produto`, `.vip-card-produto-descricao`,
`vip-produto-preco-valor .medio.font-bold`, `vip-image img` e `/produto/ID/slug`.
Os departamentos são descobertos no menu, porque seus nomes diferem entre lojas.
As páginas atuais carregam lotes por rolagem. O coletor também reconhece o botão
de próxima página caso ele exista. Aguarda os IDs e preços novos antes de avançar.

No Pedrilho, a extração é específica para Instabuy: `[data-testid="product-card"]`,
`[data-testid="price-display-price"]`, imagem/nome e links `/p/slug`.
O slug é o ID local do produto. A categoria é preservada ao visitar as
subcategorias `/sub/`, evitando coletar somente os carrosséis da página inicial.

## Instalação e execução

Na raiz do projeto, com Node.js 22 ou superior e Chrome instalado:

```powershell
npm run install:all
node scraper-vilasul/index.js
node scraper-sanmichel/index.js
node scraper-vn/index.js
node scraper-pedrilho/index.js
```

Cada comando completo salva `products.json` na pasta do respectivo coletor.
O Selenium Manager resolve o driver. Também são aceitas as mesmas variáveis
`CHROME_BINARY_PATH`, `CHROMEDRIVER_PATH` e `SE_MANAGER_PATH` do projeto.
Não há intervalo artificial entre páginas: o coletor avança assim que o HTML
fica estável. Uma repetição após erro mantém apenas um recuo curto, configurável
por `SCRAPER_RETRY_DELAY_MS`.

### Coleta de teste sem alterar o catálogo importável

```powershell
node scraper-vilasul/index.js --smoke
node scraper-sanmichel/index.js --smoke
node scraper-vn/index.js --smoke
node scraper-pedrilho/index.js --smoke
```

`--smoke` limita a duas categorias e dois lotes por listagem (no Pedrilho,
interrompe a categoria após atingir dois lotes). Salva `products.sample.json`
e `products.sample.report.json`, nunca `products.json`.

Também existem `--department SLUG`, `--max-pages N`, `--max-departments N`
e `--output CAMINHO`. Qualquer limitação produz uma amostra. Os relatórios
registram endereço, categorias descobertas, contagens, erros e conclusão.
Uma falha na coleta completa preserva o `products.json` anterior e grava
`products.partial.json` e `products.report.json` para diagnóstico. O processo
retorna erro, impedindo a importação automática desse resultado incompleto.

### Atualizar e importar no MongoDB

Com MongoDB disponível, execute na raiz:

```powershell
npm run coleta -- coletar vilasul
npm run coleta -- coletar sanmichel
npm run coleta -- coletar vn
npm run coleta -- coletar pedrilho
```

Para importar uma coleta completa já existente, use
`node backend/scripts/mercado.js importar MERCADO`.
`npm --prefix backend run atualizar` e o scheduler percorrem os cinco mercados cadastrados.

## Validação

```powershell
npm run test:scrapers
npm test
npm run build
```

Os testes de extração executam Selenium contra HTML local e não fazem compras
nem acessam o banco. Os testes `--smoke` acessam os catálogos reais e verificam
o carregamento de lotes adicionais. Uma amostra validada não equivale a uma
coleta completa de todos os departamentos.

Validação realizada nos sites reais: as amostras de duas categorias retornaram
80 produtos do Vila Sul, 80 do San Michel, 80 do VN e 60 do Pedrilho.
Também foram percorridos todos os lotes de Açougue do VN (92 itens, dos quais
76 tinham preço publicado) e as subcategorias de Hortifruti do Pedrilho
(107 produtos). Esses resultados estão em `products.validation.json` nas
pastas de VN e Pedrilho, acompanhados dos relatórios. Não houve importação no
MongoDB nem coleta integral de todos os departamentos nesta validação.

### Base parcial para testar a interface

Para importar apenas os arquivos de amostra e validação já salvos, execute em
`backend`: `node scripts/importarAmostras.js`. O comando reúne os produtos sem
duplicar IDs em `products.test.json` e os importa sem desativar outros produtos
ausentes da amostra. Essa base é parcial e não equivale à coleta completa.

Após a solicitação de interromper as coletas completas, foram importados 412
produtos de teste: Vila Sul 80, San Michel 80, VN 116 e Pedrilho 136.
