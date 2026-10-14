# Comparação de produtos

O comparador possui duas entidades simples:

- `CanonicalProduct`: identidade interna do produto, sem loja e sem preço.
- `Produto`: oferta publicada por um supermercado, com preço, URL, disponibilidade e data.

`Produto.canonicalProductId` liga uma oferta ao produto canônico. Para reconstruir os vínculos de uma base existente, execute `npm run catalog:sync`.

## Normalização e atributos

O módulo `shared/comparison.mjs` normaliza os nomes e extrai marca, categoria, peso ou volume, quantidade, variante e embalagem. Termos promocionais não participam da identidade.

As unidades são convertidas para kg, litro ou unidade. Assim, embalagens diferentes do mesmo produto podem ser comparadas pelo preço por unidade de medida.

## Matching

Os filtros obrigatórios verificam categoria, marca quando identificada, tipo do produto, variante, quantidade e embalagem. Depois é calculado um score explicável com pesos para nome, marca, quantidade, categoria e variante.

- 95 a 100: correspondência certa.
- 80 a 94: correspondência provável, exibida com aviso.
- abaixo de 80: não é comparada automaticamente.

Hortifruti não depende de marca. Leite e iogurte dão mais peso ao volume e à variante. Outros produtos usam os pesos gerais definidos no módulo compartilhado.

## Grupos apresentados

- `Mesmo produto em outros mercados`: mantém a lista vertical e reúne as correspondências certas e prováveis da mesma entidade canônica.
- `Produtos similares`: usa carrossel para a mesma marca e o mesmo tipo em outro tamanho ou apresentação. A comparação usa o preço por kg, litro ou unidade.
- `Alternativas`: usa carrossel para substitutos da mesma família funcional. Em hortifruti, frutas frescas são comparadas com frutas frescas e vegetais frescos com vegetais frescos; o mesmo hortifruti em outra variedade ou embalagem fica em `Produtos similares`, e itens processados não entram como substitutos frescos. Em bebidas, limpeza, congelados e nas demais categorias, o tipo precisa ser o mesmo: cerveja com cerveja, detergente com detergente, pizza com pizza e assim por diante. Outra embalagem da mesma marca é similar; outra marca compatível é alternativa.

As regras continuam específicas por família para evitar que apenas pertencer à mesma categoria ampla transforme dois itens sem relação em alternativas. Famílias funcionais também evitam carrosséis pobres: por exemplo, pizza e lasanha podem compartilhar `refeições congeladas`, limpador e desinfetante podem compartilhar `limpeza de superfícies`, enquanto amaciante e bolo continuam fora desses grupos.

Os três blocos permanecem visíveis em todas as páginas de produto. Quando um grupo não possui uma correspondência segura, a interface apresenta seu estado vazio e a razão geral, em vez de remover a seção e alterar a estrutura da página.

## Promoções

Promoções são armazenadas no campo `promotion` da oferta. Clube, cashback e “leve X, pague Y” ficam fora do ranking de preço normal. A interface mostra a condição separadamente e orienta a confirmação no site da loja.
