/**
 * ESPIRITUAL — Escritura Viva Fixtures (Modelo C)
 *
 * Protagonista: A Escritura.
 * Suporta Modos:
 * 1. Leitura & Foco (selecionar versículo revela foco e reflexão)
 * 2. Memória / SRS (palavras transformadas em lacunas de memorização)
 * 3. Oração & Silêncio (mudança de atmosfera, respiração contemplativa)
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
        number: 5,
        text: 'Seja a vossa moderação conhecida de todos os homens. Perto está o Senhor.',
        reflection: 'A mansidão prática no trato com os outros brota da convicção da proximidade divina.',
        keyWords: ['moderação', 'Perto', 'Senhor'],
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
      {
        number: 8,
        text: 'Finalmente, irmãos, tudo o que é verdadeiro, tudo o que é nobre, tudo o que é correto, tudo o que é puro, tudo o que é amável, tudo o que é de boa fama, se há alguma virtude e se há algum louvor, nisso pensai.',
        reflection: 'A disciplina dos pensamentos: alimentar a mente com aquilo que glorifica a Deus e edifica a alma.',
        keyWords: ['verdadeiro', 'nobre', 'puro', 'amável', 'pensai'],
      },
    ],
  },
];

// Preservação de dados para compatibilidade com o ContextPanel e registros
export const ESPIRITUAL_DATA = {
  sanctuaryState: {
    vigilDays: 48,
    currentHourName: 'Vésperas (Silêncio)',
    cycleName: 'Leitura Contínua · Ano II',
    atmosphere: 'Serena & Imersiva',
  },
  intentionsLedger: [
    { id: 'int-1', category: 'Discernimento', text: 'Clareza e perseverança no trabalho e decisões diárias.', day: 'Hoje' },
    { id: 'int-2', category: 'Gratidão', text: 'Paz no lar e saúde restaurada.', day: 'Ontem' },
  ],
};
