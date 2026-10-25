// Dicionario de marcas (taxonomia, etapa 1).
//
// Montado a partir das palavras que aparecem em varios mercados no catalogo coletado e revisado
// a mao: ficaram so as palavras que sao marca (ou fabricante) de produto. Marcas de duas palavras
// entram pela palavra que as identifica ("Tres Coracoes" -> coracoes, "Bom Bril" -> bril).
//
// Uso na comparacao:
// - uma marca sempre distingue produtos, mesmo quando e muito frequente (Nestle aparece em
//   centenas de produtos e, pela frequencia, deixaria de contar);
// - se os dois produtos tem marca e nenhuma em comum, nao sao o mesmo produto
//   ("Requeijao Cremoso Danone" x "Requeijao Cremoso Nestle");
// - nos similares, marca nao e palavra de tipo ("Feijao Carioca Du Irineu": o tipo e feijao carioca).
const MARCAS = new Set([
    // Alimentos e bebidas
    'nestle', 'nescafe', 'nescau', 'ninho', 'moca', 'molico', 'neston', 'nesfit', 'kitkat', 'garoto', 'lacta',
    'danone', 'activia', 'danoninho', 'danette', 'itambe', 'piracanjuba', 'italac', 'tirolez', 'vigor', 'batavo',
    'president', 'aviacao', 'catupiry', 'polenghi', 'quata', 'elege', 'jussara', 'yakult', 'chamyto', 'nolac',
    'seara', 'sadia', 'perdigao', 'aurora', 'friboi', 'swift', 'pamplona', 'frimesa', 'rezende',
    'oetker', 'fleischmann', 'bauducco', 'marilan', 'piraque', 'aymore', 'mabel', 'tostines', 'nabisco', 'oreo',
    'negresco', 'passatempo', 'trakinas', 'bono', 'treloso', 'wickbold', 'pullman', 'newbread', 'seven', 'plusvita',
    'coracoes', 'pilao', 'melitta', 'pacaembu', 'caboclo', 'marata',
    'renata', 'galo', 'amalia', 'adria', 'barilla', 'divella', 'petybon', 'nissin', 'miojo', 'maggi', 'knorr',
    'sazon', 'kisabor', 'arisco', 'yoki', 'kitano', 'elefante', 'pomarola', 'predilecta', 'predilleta', 'fugini',
    'quero', 'salsaretti', 'heinz', 'hellmann', 'hellmanns', 'cepera', 'castelo', 'gallo', 'andorinha', 'borges',
    'camil', 'kicaldo', 'cabrera', 'irineu', 'joao', 'pocos', 'alegrete', 'komabem', 'casili', 'uniao',
    'caravelas', 'liza', 'soya', 'qualy', 'delicata', 'claybom', 'becel', 'doriana', 'primor',
    'junita', 'tozzi', 'dori', 'fini', 'arcor', 'trident', 'halls', 'mentos', 'kinder', 'ferrero', 'nutella',
    'hershey', 'hersheys', 'milka', 'snickers', 'tortuguita', 'bis', 'prestigio', 'chokito', 'baton', 'talento',
    'elma', 'ruffles', 'doritos', 'cheetos', 'fandangos', 'pringles', 'kelloggs', 'kellogg', 'sucrilhos', 'quaker',
    'mucilon', 'neston', 'toddy', 'ovomaltine', 'tang', 'clight', 'maguary', 'dafruta', 'tampico', 'ades',
    'kapo', 'sococo', 'coqueiro', 'gomes', 'costa', 'kibon', 'cocriacoes', 'nutry', 'trento', 'docile', 'florestal',
    'coca', 'fanta', 'sprite', 'kuat', 'schweppes', 'guarany', 'antarctica', 'pepsi', 'sukita', 'tubaina', 'dolly',
    'skol', 'brahma', 'heineken', 'amstel', 'budweiser', 'itaipava', 'petra', 'eisenbahn', 'corona', 'stella',
    'imperio', 'devassa', 'gorillaz', 'crystal', 'monster', 'redbull', 'gatorade', 'powerade',
    'salton', 'aurora', 'campino', 'casillero', 'concha', 'chalise', 'pergola', 'smirnoff', 'ypioca',
    'leao', 'matte', 'sakura', 'kenko', 'mezzani', 'sanremo', 'visconti', 'bordon',
    // Limpeza e casa
    'ype', 'omo', 'ariel', 'tixan', 'surf', 'comfort', 'downy', 'mon', 'bijou', 'fofo', 'confort',
    'limpol', 'bril', 'bombril', 'assolan', 'scotch', 'brite', 'esfrebom', 'esfrelux', 'uau', 'ingleza', 'veja',
    'cif', 'ajax', 'mr', 'musculo', 'pato', 'harpic', 'sanol', 'kalipto', 'vim', 'qboa', 'candura', 'brisa',
    'glade', 'bom', 'air', 'wick', 'raid', 'sbp', 'baygon', 'vanish', 'azulim', 'kodilar', 'starlux', 'ourolux',
    'plasutil', 'tramontina', 'bettanin', 'sanro', 'condor', 'noviça', 'perfex', 'lysoform', 'amacitel', 'sapolio',
    'radium', 'duracell', 'rayovac', 'panasonic', 'elgin', 'personal', 'neve', 'mimmo', 'fofinho', 'snob',
    'scala', 'snob', 'finess', 'bigfral', 'pampers', 'huggies', 'turma', 'mili', 'carinho', 'always',
    'intimus', 'carefree', 'sempre', 'livre',
    // Higiene e beleza
    'dove', 'rexona', 'nivea', 'axe', 'monange', 'herbissimo', 'avanço', 'avanco', 'giovanna', 'davene', 'granado',
    'phebo', 'lux', 'protex', 'palmolive', 'francis', 'albany', 'nazca', 'johnson', 'johnsons', 'isababy',
    'isacare', 'colgate', 'sorriso', 'closeup', 'close', 'sensodyne', 'listerine', 'plax', 'dentil',
    'gillette', 'prestobarba', 'bic', 'pantene', 'seda', 'elseve', 'loreal', 'tresemme', 'head', 'shoulders',
    'niely', 'skala', 'salon', 'line', 'siage', 'eudora', 'wyda', 'darling', 'neutrox', 'kanechom',
    'farmax', 'tenys', 'baruel', 'risque', 'impala', 'colorama', 'koleston', 'ricca', 'vult',
    // Pet
    'pedigree', 'whiskas', 'friskies', 'purina', 'chow', 'golden', 'premier', 'pettiz'
]);

// Fabricantes que aparecem antes da marca do produto ("Biscoito Nestle Negresco", "Detergente
// Limpol Bom Bril", "Multiuso Uau Ingleza"). Contam como marca para dizer que dois produtos sao de
// marcas diferentes (Requeijao Nestle x Requeijao Danone), mas nao como palavra que sobra: o mesmo
// produto aparece com e sem o nome do fabricante.
const FABRICANTES = new Set([
    'nestle', 'danone', 'garoto', 'lacta', 'arcor', 'elma', 'kelloggs', 'kellogg', 'bril', 'bombril', 'bom',
    'ingleza', 'unilever', 'itambe'
]);

// Marcas que estavam fora da lista e confundiam a comparacao (aveia Natural Life, chocolate Diplomata).
for (const marca of ['lollo', 'charge', 'sensacao', 'serenata', 'laka', 'pratic', 'roceiro', 'presidente', 'viscont', 'crunch', 'philadelphia', 'danubio', 'galbani', 'cruzilia', 'vitoria', 'roseira', 'cemil', 'mirafiori', 'sublime', 'hemmer', 'bon', 'life', 'diplomata', 'suflair', 'calipso', 'alpino', 'chambinho', 'chandelle', 'galak', 'chokito', 'frades']) {
    MARCAS.add(marca);
}
for (const fabricante of FABRICANTES) {
    MARCAS.add(fabricante);
}

module.exports = { MARCAS, FABRICANTES };
