/**
 * ESPIRITUAL — Escritura Viva Fixtures
 * Sistema completo de Leitura Bíblica, Planos, Memória SRS, Oração Contemplativa e Gratidão.
 */

export interface ScriptureVerse {
  number: number;
  text: string;
  reflection: string;
  keyWords: string[]; // palavras ocultadas no modo memória
}

export interface ScripturePassage {
  id: string;
  title: string;
  reference: string;
  book: string;
  chapter: number;
  summary: string;
  theme: string;
  verses: ScriptureVerse[];
}

export interface ReadingPlanItem {
  id: string;
  title: string;
  durationDays: number;
  completedDays: number;
  currentDayTitle: string;
  currentReadingReference: string;
  todayCompleted: boolean;
  category: string;
}

export interface MemoryVerseCard {
  id: string;
  reference: string;
  theme: string;
  fullText: string;
  keyWords: string[];
  retentionLevel: 'novo' | 'revisando' | 'retido';
  nextReviewDays: number;
  masteryPercent: number;
}

export interface PrayerIntention {
  id: string;
  category: 'Família' | 'Paz & Direção' | 'Gratidão' | 'Saúde' | 'Propósito';
  text: string;
  date: string;
  isAnswered: boolean;
}

export interface GratitudeEntry {
  id: string;
  date: string;
  motives: string[];
}

export const SCRIPTURE_PASSAGES: ScripturePassage[] = [
  {
    id: 'romanos-8',
    title: 'Mais que Vencedores no Amor Eterno',
    reference: 'Romanos 8:31-39',
    book: 'Romanos',
    chapter: 8,
    summary: 'A segurança inabalável do crente na soberania e no amor de Deus através de Cristo.',
    theme: 'Esperança & Segurança Eterna',
    verses: [
      {
        number: 31,
        text: 'Que diremos, pois, diante destas coisas? Se Deus é por nós, quem será contra nós?',
        reflection: 'A soberania de Deus não é teoria abstrata, mas escudo diante de qualquer adversidade presente.',
        keyWords: ['Deus', 'nós', 'contra'],
      },
      {
        number: 32,
        text: 'Aquele que não poupou o seu próprio Filho, mas por todos nós o entregou, como não nos dará também com ele todas as coisas?',
        reflection: 'A dádiva maior já foi concedida na Cruz. Nenhuma necessidade legítima ficará desamparada.',
        keyWords: ['poupou', 'Filho', 'entregou', 'todas'],
      },
      {
        number: 35,
        text: 'Quem nos separará do amor de Cristo? Será tribulação, ou angústia, ou perseguição, ou fome, ou nudez, ou perigo, ou espada?',
        reflection: 'As aflições do mundo presente não têm poder ontológico para romper o laço da graça.',
        keyWords: ['separará', 'amor', 'Cristo', 'tribulação'],
      },
      {
        number: 37,
        text: 'Mas em todas estas coisas somos mais do que vencedores, por meio daquele que nos amou.',
        reflection: 'A vitória cristã não é ausência de batalha, mas perseverança vitoriosa no meio dela.',
        keyWords: ['todas', 'vencedores', 'amou'],
      },
      {
        number: 38,
        text: 'Porque estou bem certo de que nem a morte, nem a vida, nem os anjos, nem os principados, nem as coisas do presente, nem do porvir, nem os poderes,',
        reflection: 'Nenhuma dimensão temporal ou espiritual escapa ao senhorio absoluto de Deus.',
        keyWords: ['certo', 'morte', 'vida', 'presente', 'porvir'],
      },
      {
        number: 39,
        text: 'nem a altura, nem a profundidade, nem qualquer outra criatura poderá nos separar do amor de Deus, que está em Cristo Jesus, nosso Senhor.',
        reflection: 'O ápice da Escritura: o amor de Deus encarnado em Cristo é eterno, imutável e seguro.',
        keyWords: ['separar', 'amor', 'Deus', 'Cristo', 'Jesus'],
      },
    ],
  },
  {
    id: 'salmo-23',
    title: 'O Senhor é o Meu Pastor',
    reference: 'Salmos 23:1-6',
    book: 'Salmos',
    chapter: 23,
    summary: 'O cuidado terno e providencial de Deus nos vales de sombra e na mesa da comunhão.',
    theme: 'Confiança & Refrigério',
    verses: [
      {
        number: 1,
        text: 'O Senhor é o meu pastor; de nada terei falta.',
        reflection: 'O descanso da alma reside em saber que Aquele que cuida de nós não falha nem dorme.',
        keyWords: ['Senhor', 'pastor', 'falta'],
      },
      {
        number: 2,
        text: 'Em verdes pastagens me faz repousar e me conduz a águas tranquilas;',
        reflection: 'A quietude da mente é um presente concedido quando confiamos na condução do Bom Pastor.',
        keyWords: ['pastagens', 'repousar', 'águas', 'tranquilas'],
      },
      {
        number: 3,
        text: 'restaura-me o vigor. Guia-me pelas veredas da justiça por amor do seu nome.',
        reflection: 'A restauração interior precede o caminhar correto nas veredas da vida diária.',
        keyWords: ['restaura', 'vigor', 'justiça', 'nome'],
      },
      {
        number: 4,
        text: 'Mesmo quando eu andar por um vale de trevas e morte, não temerei perigo algum, pois tu estás comigo; a tua vara e o teu cajado me protegem.',
        reflection: 'A presença de Deus transforma o vale mais sombrio em lugar de proteção e amparo.',
        keyWords: ['vale', 'trevas', 'perigo', 'comigo', 'protegem'],
      },
      {
        number: 6,
        text: 'Sei que a bondade e a fidelidade me acompanharão todos os dias da minha vida, e voltarei à casa do Senhor para sempre.',
        reflection: 'A bondade e a misericórdia divinas nos seguem como guardiãs fiéis por todos os dias.',
        keyWords: ['bondade', 'fidelidade', 'todos', 'casa', 'sempre'],
      },
    ],
  },
  {
    id: 'filipenses-4',
    title: 'A Paz que Excede Todo o Entendimento',
    reference: 'Filipenses 4:4-9',
    book: 'Filipenses',
    chapter: 4,
    summary: 'Aquietamento da ansiedade através da oração, gratidão e meditação no que é puro e justo.',
    theme: 'Paz Interior & Oração',
    verses: [
      {
        number: 4,
        text: 'Alegrai-vos sempre no Senhor; outra vez digo: alegrai-vos.',
        reflection: 'A alegria cristã é fruto do Espírito e repousa no caráter de Deus, não em circunstâncias passageiras.',
        keyWords: ['Alegrai-vos', 'sempre', 'Senhor'],
      },
      {
        number: 6,
        text: 'Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas diante de Deus as vossas petições, pela oração e pela súplica, com ações de graças.',
        reflection: 'O antídoto contra a ansiedade não é o esforço mental, mas a oração filial regada a gratidão.',
        keyWords: ['ansiosos', 'petições', 'oração', 'graças'],
      },
      {
        number: 7,
        text: 'E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e as vossas mentes em Cristo Jesus.',
        reflection: 'A paz divina atua como sentinela de guarnição sobre o coração e os pensamentos.',
        keyWords: ['paz', 'excede', 'guardará', 'corações', 'mentes'],
      },
    ],
  },
];

export const READING_PLANS: ReadingPlanItem[] = [
  {
    id: 'plan-1',
    title: 'Cartas Paulinas & Teologia da Graça',
    durationDays: 45,
    completedDays: 28,
    currentDayTitle: 'Dia 29 · Romanos 8 (Segurança Eterna)',
    currentReadingReference: 'Romanos 8:1-39',
    todayCompleted: false,
    category: 'Epístolas',
  },
  {
    id: 'plan-2',
    title: 'Salmos de Refrigério & Louvor',
    durationDays: 30,
    completedDays: 14,
    currentDayTitle: 'Dia 15 · Salmo 23 e 24',
    currentReadingReference: 'Salmos 23:1-6',
    todayCompleted: true,
    category: 'Poesia & Oração',
  },
  {
    id: 'plan-3',
    title: 'Evangelho de João · O Verbo Vivo',
    durationDays: 21,
    completedDays: 7,
    currentDayTitle: 'Dia 8 · João 15 (A Videira Verdadeira)',
    currentReadingReference: 'João 15:1-17',
    todayCompleted: false,
    category: 'Evangelhos',
  },
];

export const MEMORY_CARDS: MemoryVerseCard[] = [
  {
    id: 'mem-1',
    reference: 'Romanos 8:31',
    theme: 'Soberania & Proteção',
    fullText: 'Que diremos, pois, diante destas coisas? Se Deus é por nós, quem será contra nós?',
    keyWords: ['Deus', 'nós', 'contra'],
    retentionLevel: 'revisando',
    nextReviewDays: 2,
    masteryPercent: 80,
  },
  {
    id: 'mem-2',
    reference: 'Filipenses 4:6-7',
    theme: 'Paz & Ansiedade',
    fullText: 'Não andeis ansiosos de coisa alguma; em tudo, pela oração e com ações de graças, sejam conhecidas as vossas petições.',
    keyWords: ['ansiosos', 'oração', 'graças', 'petições'],
    retentionLevel: 'novo',
    nextReviewDays: 1,
    masteryPercent: 50,
  },
  {
    id: 'mem-3',
    reference: 'Salmos 23:1',
    theme: 'Descanso na Provisão',
    fullText: 'O Senhor é o meu pastor; de nada terei falta.',
    keyWords: ['Senhor', 'pastor', 'falta'],
    retentionLevel: 'retido',
    nextReviewDays: 7,
    masteryPercent: 100,
  },
];

export const PRAYER_INTENTIONS: PrayerIntention[] = [
  {
    id: 'p-1',
    category: 'Família',
    text: 'Saúde e paz no lar, proteção sobre meus pais e irmãos.',
    date: 'Hoje',
    isAnswered: false,
  },
  {
    id: 'p-2',
    category: 'Paz & Direção',
    text: 'Sabedoria e discernimento nas decisões profissionais e de estudos.',
    date: 'Hoje',
    isAnswered: false,
  },
  {
    id: 'p-3',
    category: 'Gratidão',
    text: 'Paz no trabalho e superação de um ciclo desafiador.',
    date: 'Ontem',
    isAnswered: true,
  },
];

export const GRATITUDE_ENTRIES: GratitudeEntry[] = [
  {
    id: 'grat-1',
    date: 'Hoje · 06 Out',
    motives: [
      'Paz e clareza mental durante a sessão de trabalho matinal.',
      'Saúde e fôlego para treinar e caminhar em paz.',
      'Provisão diária e teto seguro com o alimento de cada dia.',
    ],
  },
  {
    id: 'grat-2',
    date: 'Ontem · 05 Out',
    motives: [
      'Alinhamento tranquilo de tarefas com a equipe.',
      'Sessão profunda de leitura bíblica ao amanhecer.',
      'Cuidado providencial de Deus nos detalhes financeiros.',
    ],
  },
];

export const ESPIRITUAL_DATA = {
  sanctuaryState: {
    vigilDays: 48,
    currentHourName: 'Vésperas (Silêncio Contemplativo)',
    cycleName: 'Leitura Contínua · Ano II',
    atmosphere: 'Serena & Imersiva',
  },
  intentionsLedger: [
    { id: 'int-1', category: 'Discernimento', text: 'Clareza e perseverança no trabalho e decisões diárias.', day: 'Hoje' },
    { id: 'int-2', category: 'Gratidão', text: 'Paz no lar e saúde restaurada.', day: 'Ontem' },
  ],
};
