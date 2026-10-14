# Fonseca — investigação da unidade de Poços

Verificado em 17/09/2026, sem interromper a coleta dos demais mercados.

## Evidências

1. A página oficial da Loja III confirma Av. Francisco Salles, 425, Poços de Caldas:
   https://fonsecasupermercados.com.br/portal/lojass/3/0/0/0/Loja3.html
2. O portal oficial aponta para https://online.fonsecasupermercados.com.br/.
   Selenium confirmou redirecionamento para https://www.supermercadosfonseca.com.br/.
3. No seletor de retirada, as únicas opções observadas foram:
   - Av. Deputado Eduardo Vicente Nasser, 700 — São José do Rio Pardo/SP.
   - Avenida João Osório, 10 — São João da Boa Vista/SP.
4. Em Receber em Casa → Informar um CEP, o CEP público da unidade de Poços, 37701-013, retornou: “Ainda não atendemos no seu CEP”. Não foi informado e-mail nem feito cadastro. Esse teste confirma a recusa desse CEP, não a inexistência de atendimento em toda a cidade.
5. A página oficial https://fonsecasupermercados.com.br/portal/ofertas contém link específico para `libhtml/ofertas/jornal/JornalPocos.pdf`. O destino https://fonsecasupermercados.com.br/portal/libhtml/ofertas/jornal/JornalPocos.pdf retornou HTML informando página inexistente ou com problema, não um PDF utilizável.

## Resultado

Não foi confirmado catálogo estruturado de produtos/preços da unidade de Poços. Não há correção de seletor HTML que torne os preços das unidades de SP preços locais. `collectionEnabled: false` permanece no cadastro. Os registros anteriores continuam preservados e excluídos da apresentação.

## Próximo passo necessário

Obter do Fonseca o link público específico do catálogo da Loja III ou confirmação documentada sobre a aplicação dos preços a Poços. A existência de entrega domiciliar anunciada no portal institucional não comprova a cobertura do e-commerce.

Texto pronto para consulta (não enviado):

“Olá! Estamos desenvolvendo um comparador de preços dos supermercados de Poços de Caldas. A loja da Av. Francisco Salles, 425 possui catálogo online com produtos e preços? No site encontramos apenas retirada em São José do Rio Pardo e São João da Boa Vista, e o CEP 37701-013 não foi atendido. Poderiam informar o link específico de Poços? O link do encarte JornalPocos.pdf também está indisponível.”

## Evidência técnica

- `investigation.json`: redirecionamento, seletor de lojas e links oficiais.
- `delivery-result.json`: resposta do formulário de CEP.
- Scripts de diagnóstico em `tmp/investigate-fonseca.js` e `tmp/fonseca-test-public-cep.js`.

Para reativar: confirmar endereço/unidade dentro do catálogo, testar categoria e preço, atualizar URL/configuração, coletar novamente e substituir os registros antigos apenas com uma coleta local validada.
