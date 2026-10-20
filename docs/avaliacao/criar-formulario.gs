// Cria no Google Forms o questionario rapido de avaliacao do SuperPreco (cerca de 5 minutos):
// a pessoa usa o site em duas tarefas curtas e responde ao SUS e a poucas perguntas. Cria tambem
// uma planilha ligada ao formulario para receber as respostas.
//
// Como usar: abra https://script.google.com/home/projects/create > apague o que estiver no
// editor > cole este arquivo > salve > Executar (funcao criarFormulario) > autorize com a sua
// conta. Os links aparecem no "Registro de execucao".

const SITE = 'https://superpreco.pages.dev';

// System Usability Scale (BROOKE, 1996). A ordem importa: o calculo da nota usa a posicao.
const SUS = [
  'Eu acho que gostaria de usar este sistema com frequência.',
  'Eu achei o sistema desnecessariamente complexo.',
  'Eu achei o sistema fácil de usar.',
  'Eu acho que precisaria de ajuda de uma pessoa com conhecimentos técnicos para usar o sistema.',
  'Eu acho que as várias funções do sistema estão muito bem integradas.',
  'Eu acho que o sistema apresenta muita inconsistência.',
  'Eu imagino que as pessoas aprenderão como usar este sistema rapidamente.',
  'Eu achei o sistema atrapalhado de usar.',
  'Eu me senti confiante ao usar o sistema.',
  'Eu precisei aprender várias coisas novas antes de conseguir usar o sistema.'
];

const MERCADOS = ['SuperVale', 'Vila Sul', 'San Michel', 'Pedrilho', 'Não consegui descobrir'];
const TEMPO_NO_SITE = ['Menos de 1 minuto', 'De 1 a 3 minutos', 'Mais de 3 minutos'];

function escala(form, titulo, obrigatoria = true) {
  return form.addScaleItem().setTitle(titulo)
    .setBounds(1, 5).setLabels('Discordo totalmente', 'Concordo totalmente').setRequired(obrigatoria);
}

function criarFormulario() {
  const form = FormApp.create('SuperPreço — avaliação rápida');
  form.setDescription(
    'O SuperPreço é um site que compara os preços de quatro supermercados de Poços de Caldas ' +
    '(SuperVale, Vila Sul, San Michel e Pedrilho). Esta avaliação faz parte do TCC de Pedro Lucas de ' +
    'Souza Faria (IFSULDEMINAS, campus Poços de Caldas) e leva cerca de 5 minutos.\n\n' +
    'O que é avaliado é o site, não você. A participação é voluntária e anônima: não pedimos nome nem ' +
    'e-mail, e as respostas serão usadas somente neste trabalho acadêmico.'
  );
  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('Obrigado pela participação!');

  form.addCheckboxItem().setTitle('Consentimento')
    .setChoiceValues(['Li as informações acima e aceito participar.']).setRequired(true);

  // ---------- Perfil ----------
  form.addPageBreakItem().setTitle('Sobre você');
  form.addMultipleChoiceItem().setTitle('Idade')
    .setChoiceValues(['Até 24 anos', '25 a 39 anos', '40 a 59 anos', '60 anos ou mais']).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Você costuma comparar preços entre supermercados antes de comprar?')
    .setChoiceValues(['Sempre', 'Às vezes', 'Nunca']).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Em qual aparelho você está respondendo?')
    .setChoiceValues(['Celular', 'Computador', 'Tablet']).setRequired(true);

  // ---------- Tarefas ----------
  form.addPageBreakItem().setTitle('Tarefa 1').setHelpText(
    `Abra o SuperPreço em ${SITE} (pode ser em outra aba) e procure por "café 3 corações 500g". ` +
    'Abra o café tradicional e veja em qual mercado ele está mais barato.'
  );
  form.addListItem().setTitle('Em qual mercado o café 3 Corações tradicional 500 g está mais barato?')
    .setChoiceValues(MERCADOS).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Quanto tempo você levou nesta tarefa?')
    .setChoiceValues(TEMPO_NO_SITE).setRequired(true);

  form.addPageBreakItem().setTitle('Tarefa 2').setHelpText(
    'Ainda no SuperPreço, descubra em qual mercado a cesta básica sai mais barata hoje. ' +
    'Dica: a cesta básica aparece na página inicial.'
  );
  form.addListItem().setTitle('Em qual mercado a cesta básica está mais barata?')
    .setChoiceValues(MERCADOS).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Quanto tempo você levou nesta tarefa?')
    .setChoiceValues(TEMPO_NO_SITE).setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle('Sem o SuperPreço, quanto tempo você acha que levaria para descobrir isso olhando os sites ou indo aos mercados?')
    .setChoiceValues(['Menos de 5 minutos', 'De 5 a 15 minutos', 'De 15 a 30 minutos', 'Mais de 30 minutos', 'Não faria essa comparação'])
    .setRequired(true);

  // ---------- SUS ----------
  form.addPageBreakItem().setTitle('O que você achou do SuperPreço')
    .setHelpText('Para cada frase, escolha de 1 (discordo totalmente) a 5 (concordo totalmente).');
  SUS.forEach((frase, i) => escala(form, `${i + 1}. ${frase}`));

  // ---------- Percepcao ----------
  form.addPageBreakItem().setTitle('Para terminar');
  escala(form, 'O SuperPreço me ajudaria a economizar nas compras.');
  escala(form, 'Eu confiaria nos preços mostrados, já que o site informa a data em que cada preço foi coletado.');
  form.addMultipleChoiceItem().setTitle('Você usaria o SuperPreço para planejar as suas compras?')
    .setChoiceValues(['Sim', 'Talvez', 'Não']).setRequired(true);
  form.addParagraphTextItem().setTitle('Algum comentário? O que gostou, o que achou difícil ou o que mudaria (opcional)');

  // Planilha que recebe as respostas.
  const planilha = SpreadsheetApp.create('SuperPreço — respostas da avaliação');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilha.getId());

  Logger.log('Link para os participantes: ' + form.getPublishedUrl());
  Logger.log('Editar o formulário: ' + form.getEditUrl());
  Logger.log('Planilha de respostas: ' + planilha.getUrl());
}
