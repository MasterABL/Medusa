import { CANON_66, type BibleReference } from '@/domains/spiritual';

export interface BibleVerse {
  number: number;
  text: string;
  isKeyVerse?: boolean;
}

export interface ExegeticalNote {
  wordOriginal: string;
  transliteration: string;
  language: 'grego' | 'hebraico' | 'aramaico';
  meaning: string;
  contrastContext: string;
}

export interface PassageData {
  reference: BibleReference;
  bookName: string;
  chapter: number;
  translation: string;
  theme: string;
  verses: BibleVerse[];
  exegeticalNotes?: ExegeticalNote[];
  crossReferences?: string[];
  isDemoText: boolean;
}

export const OLD_TESTAMENT_CODES = new Set([
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI',
  '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER',
  'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP',
  'HAG', 'ZEC', 'MAL',
]);

const SAMPLE_PASSAGES: Record<string, PassageData> = {
  'JHN:14': {
    reference: { book: 'JHN', chapter: 14 },
    bookName: 'Evangelho de João',
    chapter: 14,
    translation: 'Almeida Revista e Atualizada (Demonstração)',
    theme: 'O Caminho, a Verdade, o Consolador e a Paz Interior',
    verses: [
      { number: 1, text: 'Não se turbe o vosso coração; credes em Deus, crede também em mim.' },
      { number: 2, text: 'Na casa de meu Pai há muitas moradas; se não fosse assim, eu vo-lo teria dito. Vou preparar-vos lugar.' },
      { number: 3, text: 'E quando eu for, e vos preparar lugar, virei outra vez, e vos levarei para mim mesmo, para que onde eu estiver estejais vós também.' },
      { number: 6, text: 'Disse-lhe Jesus: Eu sou o caminho, e a verdade e a vida; ninguém vem ao Pai, senão por mim.' },
      { number: 15, text: 'Se me amais, guardai os meus mandamentos.' },
      { number: 16, text: 'E eu rogarei ao Pai, e ele vos dará outro Consolador, para que fique convosco para sempre;' },
      { number: 23, text: 'Jesus respondeu, e disse-lhe: Se alguém me ama, guardará a minha palavra, e meu Pai o amará, e viremos para ele, e faremos nele morada.' },
      {
        number: 27,
        text: 'Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá. Não se turbe o vosso coração, nem se atemorize.',
        isKeyVerse: true,
      },
    ],
    exegeticalNotes: [
      {
        wordOriginal: 'εἰρήνη',
        transliteration: 'Eirēnē (derivado do hebraico Shalom)',
        language: 'grego',
        meaning: 'Plenitude, harmonia interior restaurada e integridade da alma.',
        contrastContext: 'Diferente da Pax Romana, que era imposta pela força militar, a paz de Cristo é enraizada no perdão e na certeza da presença de Deus.',
      },
    ],
    crossReferences: ['Isaías 26:3', 'Filipenses 4:6-7', 'Colossenses 3:15'],
    isDemoText: true,
  },
  'PSA:23': {
    reference: { book: 'PSA', chapter: 23 },
    bookName: 'Salmos',
    chapter: 23,
    translation: 'Almeida Revista e Atualizada (Demonstração)',
    theme: 'O Cuidado Providencial de Deus em Meio aos Vales',
    verses: [
      { number: 1, text: 'O Senhor é o meu pastor, nada me faltará.', isKeyVerse: true },
      { number: 2, text: 'Deitar-me faz em verdes pastos, guia-me mansamente a águas tranqüilas.' },
      { number: 3, text: 'Refrigera a minha alma; guia-me pelas veredas da justiça, por amor do seu nome.' },
      { number: 4, text: 'Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo; a tua vara e o teu cajado me consolam.' },
      { number: 5, text: 'Preparas uma mesa perante mim na presença dos meus inimigos, unges a minha cabeça com óleo, o meu cálice transborda.' },
      { number: 6, text: 'Certamente que a bondade e a misericórdia me seguirão todos os dias da minha vida; e habitarei na casa do Senhor por longos dias.' },
    ],
    exegeticalNotes: [
      {
        wordOriginal: 'יְהוָה רֹעִי',
        transliteration: 'Yahweh Rohi',
        language: 'hebraico',
        meaning: 'O Senhor meu Pastor — relacionamento íntimo, proteção vigilante e condução compassiva.',
        contrastContext: 'No antigo oriente próximo, reis eram chamados de pastores, mas mantinham distância do povo. Davi descreve um Deus que caminha junto na poeira do deserto.',
      },
    ],
    crossReferences: ['João 10:11', 'Isaías 40:11', 'Apocalipse 7:17'],
    isDemoText: true,
  },
  'PRO:3': {
    reference: { book: 'PRO', chapter: 3 },
    bookName: 'Provérbios',
    chapter: 3,
    translation: 'Almeida Revista e Atualizada (Demonstração)',
    theme: 'Sabedoria, Confiança Total e Direção de Caminhos',
    verses: [
      { number: 1, text: 'Filho meu, não te esqueças da minha lei, e o teu coração guarde os meus mandamentos.' },
      { number: 3, text: 'Não te desamparem a benignidade e a fidelidade; ata-as ao teu pescoço; escreve-as na tábua do teu coração.' },
      { number: 5, text: 'Confia no Senhor de todo o teu coração, e não te estribes no teu próprio entendimento.', isKeyVerse: true },
      { number: 6, text: 'Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas.' },
      { number: 7, text: 'Não sejas sábio a teus próprios olhos; teme ao Senhor e aparta-te do mal.' },
      { number: 8, text: 'Isto será saúde para o teu corpo, e refrigério para os teus ossos.' },
    ],
    exegeticalNotes: [
      {
        wordOriginal: 'בָּטַח',
        transliteration: 'Batach',
        language: 'hebraico',
        meaning: 'Lançar todo o peso sobre algo seguro; repousar sem reservas.',
        contrastContext: 'Contrasta com a autosuficiência humana que tenta prever e controlar cada detalhe pelo medo.',
      },
    ],
    crossReferences: ['Salmo 37:5', 'Jeremias 17:7-8', 'Tiago 1:5'],
    isDemoText: true,
  },
  'PHP:4': {
    reference: { book: 'PHP', chapter: 4 },
    bookName: 'Filipenses',
    chapter: 4,
    translation: 'Almeida Revista e Atualizada (Demonstração)',
    theme: 'Alegria Serena, Gratidão e Contentamento',
    verses: [
      { number: 4, text: 'Alegrai-vos sempre no Senhor; outra vez digo, alegrai-vos.' },
      { number: 5, text: 'Seja a vossa eqüidade notória a todos os homens. Perto está o Senhor.' },
      { number: 6, text: 'Não estejais inquietos por coisa alguma; antes as vossas petições sejam em tudo conhecidas diante de Deus pela oração e súplica, com ação de graças.' },
      { number: 7, text: 'E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos pensamentos em Cristo Jesus.', isKeyVerse: true },
      { number: 8, text: 'Quanto ao mais, irmãos, tudo o que é verdadeiro, tudo o que é honesto, tudo o que é justo, tudo o que é puro, tudo o que é amável, tudo o que é de boa fama, se há alguma virtude, e se há algum louvor, nisso pensai.' },
      { number: 13, text: 'Posso todas as coisas em Cristo que me fortalece.' },
    ],
    exegeticalNotes: [
      {
        wordOriginal: 'φρουρέω',
        transliteration: 'Phroureo',
        language: 'grego',
        meaning: 'Montar guarda como sentinela militar diante de uma fortaleza.',
        contrastContext: 'Escrito por Paulo de dentro de uma prisão romana; a paz de Deus é descrita não como ausência de grades, mas como sentinela que impede a ansiedade de invadir a alma.',
      },
    ],
    crossReferences: ['Isaías 26:3', '1 Pedro 5:7', 'Colossenses 3:15'],
    isDemoText: true,
  },
  'ROM:8': {
    reference: { book: 'ROM', chapter: 8 },
    bookName: 'Romanos',
    chapter: 8,
    translation: 'Almeida Revista e Atualizada (Demonstração)',
    theme: 'Vida no Espírito, Esperança e Vitória Inabalável',
    verses: [
      { number: 1, text: 'Portanto, agora nenhuma condenação há para os que estão em Cristo Jesus, que não andam segundo a carne, mas segundo o Espírito.' },
      { number: 14, text: 'Porque todos os que são guiados pelo Espírito de Deus, esses são filhos de Deus.' },
      { number: 18, text: 'Porque para mim tenho por certo que as aflições deste tempo presente não são para comparar com a glória que em nós há de ser revelada.' },
      { number: 26, text: 'E da mesma maneira também o Espírito ajuda as nossas fraquezas; porque não sabemos o que havemos de pedir como convém, mas o mesmo Espírito intercede por nós com gemidos inexprimíveis.' },
      { number: 28, text: 'E sabemos que todas as coisas concorrem para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.', isKeyVerse: true },
      { number: 38, text: 'Porque estou certo de que, nem a morte, nem a vida, nem os anjos, nem os principados, nem as potestades, nem o presente, nem o porvir,' },
      { number: 39, text: 'Nem a altura, nem a profundidade, nem alguma outra criatura nos poderá separar do amor de Deus, que está em Cristo Jesus nosso Senhor.' },
    ],
    crossReferences: ['Efésios 1:13-14', 'Gálatas 4:6', '2 Coríntios 4:17'],
    isDemoText: true,
  },
};

export function getPassageData(bookCode: string, chapter: number): PassageData {
  const key = `${bookCode.toUpperCase()}:${chapter}`;
  if (SAMPLE_PASSAGES[key]) {
    return SAMPLE_PASSAGES[key];
  }

  const bookEntry = CANON_66.find((b) => b.code === bookCode.toUpperCase()) || {
    code: bookCode,
    name: bookCode,
    chapters: 1,
  };

  return {
    reference: { book: bookEntry.code, chapter },
    bookName: bookEntry.name,
    chapter,
    translation: 'Texto de Demonstração (Cânone de 66 Livros)',
    theme: `Leitura estruturada de ${bookEntry.name} — Capítulo ${chapter}`,
    verses: [
      {
        number: 1,
        text: `Passagem demonstrativa de ${bookEntry.name} ${chapter}. Conecte uma fonte de dados oficial (BibleBrain, CNBB, API Bíblica aberta) para carregar o texto bíblico integral deste capítulo.`,
        isKeyVerse: true,
      },
      {
        number: 2,
        text: `A estrutura canônica do Medusa suporta navegação por todos os 66 livros e 1.189 capítulos sem adulterar as escrituras.`,
      },
      {
        number: 3,
        text: `O estudo e a reflexão pessoal permanecem estritamente privados e salvos localmente no seu dispositivo.`,
      },
    ],
    crossReferences: ['Salmos 119:105', 'Hebreus 4:12'],
    isDemoText: true,
  };
}
