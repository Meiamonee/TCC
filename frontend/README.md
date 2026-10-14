# Frontend — SuperPreço

Interface React/Vite para os preços coletados dos supermercados de Poços de Caldas.

## Telas

- `/#/`: catálogo, busca sem distinção de acentos, filtros por mercado/categoria/faixa de preço/disponibilidade, ordenação e paginação de 24 itens.
- `/#/produto/ID`: produto selecionado e correspondências nos seis mercados, preços, disponibilidade, data da coleta e links externos. A rota funciona ao recarregar e com voltar/avançar do navegador.
- `/#/como-funciona`: explicação do comparador e das limitações da base parcial.
- Endereços e produtos desconhecidos mostram uma tela de retorno ao catálogo.

O frontend consulta a API real a cada 60 segundos. O botão de atualização relê a API, sem iniciar scraping. O filtro padrão exibe somente disponíveis; desmarcá-lo inclui os demais registros.

## Comparação

`src/services/comparison.js` centraliza a heurística já existente: palavras no nome e quantidade/unidade com tolerância de 10%. Não confirma marca ou identidade. Por isso a interface identifica as correspondências como similares, mostra a descrição completa na tela de comparação e não promete economia entre produtos distintos. O menor valor listado inclui o produto selecionado e ignora indisponíveis.

Os preços da proposta visual não são usados no código. Todos os preços e imagens dos cartões vêm da API. Mercados sem correspondência são exibidos explicitamente, sem inventar ofertas. Não foi retomado o scraping completo.

## Execução e verificação

Na raiz do projeto: `npm start`, `npm test` e `npm run build`.
Requer API e MongoDB disponíveis. A API pode ser configurada com `VITE_API_URL`.

Validação manual no navegador: catálogo com 899 disponíveis, busca por arroz Casili, comparação dos seis mercados, recarregamento da rota de produto, página Como funciona, faixa de preço, ordenação, paginação e filtro de indisponíveis. Layout conferido em 1440 px e 390 px, sem transbordamento horizontal da página. As abas de mercados possuem rolagem própria no celular.

## Banner

Arquivo: `public/images/groceries-banner.png`. Gerado com a ferramenta integrada de imagens (image_gen); fotografia ilustrativa, não é uma foto de uma loja específica. O degradê é aplicado em CSS para adaptar o efeito aos tamanhos de tela.

Prompt utilizado:

> Generate a website hero background photograph ONLY, no website UI, no text, no letters, no logos. Wide landscape 3:2. Natural editorial photo of groceries just brought home in a modest real Brazilian kitchen, daylight through window on right. Right half: slouched off-white cotton grocery tote with small lettuce emerging, three imperfect red tomatoes, small bunch of naturally speckled bananas, a plain transparent bag of rice on beige stone counter. Left half mostly empty light warm ivory wall and counter, generous negative space for a heading to be added in code. Gentle ordinary window light, realistic matte surfaces, subtle grain, unpretentious candid composition, eye-level counter height, slight soft background. Avoid glossy 3D fruit, HDR, hyper saturation, fake city skyline, decorative slogans, overflowing food, people or hands. Professional natural photographic banner that pairs with a restrained dark-green and ivory grocery price comparison website.
