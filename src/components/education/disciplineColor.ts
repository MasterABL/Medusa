/**
 * Medusa — Identidade de cor por disciplina (Round 5 §16)
 *
 * Extensão explícita da paleta oficial, documentada em DESIGN.md §1 — os 7 tokens originais já
 * têm papel fixo na "Gramática de Cor" (primary=ação, support=progresso, accent=revisão,
 * alert=urgência...) e nenhum deles está livre para virar "a cor da Física" sem contradizer esse
 * significado em outro lugar do app. Estes 7 tokens novos (`--color-subject-*`, ver globals.css)
 * só existem para isso, e só são usados dentro do Cronograma do ENEM — nunca fora dali.
 *
 * Uso deliberadamente pequeno (§16: "aplicada a elementos pequenos... não blocos totalmente
 * saturados"): ponto/traço de cor num chip de filtro, na legenda e na borda esquerda de um bloco
 * do Cronograma — nunca o fundo inteiro de um card.
 *
 * Mesma restrição de Tailwind JIT já documentada em trackAccent.ts: cada classe precisa existir
 * como string literal aqui, nunca montada por concatenação em runtime, senão o Tailwind não gera
 * o CSS correspondente.
 */

export interface DisciplineColorClasses {
  /** Ponto sólido pequeno (legenda, chip de filtro). */
  dot: string;
  /** Texto (nome da disciplina destacado). */
  text: string;
  /** Borda esquerda de um bloco do Cronograma (acento, não preenchimento). */
  leftBorder: string;
  /** Fundo do chip de filtro quando essa disciplina está selecionada. */
  softBg: string;
  softBorder: string;
}

const PALETTE: Record<string, DisciplineColorClasses> = {
  Matemática: {
    dot: 'bg-medusa-subjectBlue',
    text: 'text-medusa-subjectBlue',
    leftBorder: 'border-l-4 border-l-medusa-subjectBlue',
    softBg: 'bg-medusa-subjectBlue/15',
    softBorder: 'border-medusa-subjectBlue/40',
  },
  Física: {
    dot: 'bg-medusa-subjectViolet',
    text: 'text-medusa-subjectViolet',
    leftBorder: 'border-l-4 border-l-medusa-subjectViolet',
    softBg: 'bg-medusa-subjectViolet/15',
    softBorder: 'border-medusa-subjectViolet/40',
  },
  Química: {
    dot: 'bg-medusa-subjectAmber',
    text: 'text-medusa-subjectAmber',
    leftBorder: 'border-l-4 border-l-medusa-subjectAmber',
    softBg: 'bg-medusa-subjectAmber/15',
    softBorder: 'border-medusa-subjectAmber/40',
  },
  Biologia: {
    dot: 'bg-medusa-subjectMoss',
    text: 'text-medusa-subjectMoss',
    leftBorder: 'border-l-4 border-l-medusa-subjectMoss',
    softBg: 'bg-medusa-subjectMoss/15',
    softBorder: 'border-medusa-subjectMoss/40',
  },
  Humanas: {
    dot: 'bg-medusa-subjectRose',
    text: 'text-medusa-subjectRose',
    leftBorder: 'border-l-4 border-l-medusa-subjectRose',
    softBg: 'bg-medusa-subjectRose/15',
    softBorder: 'border-medusa-subjectRose/40',
  },
  Linguagens: {
    dot: 'bg-medusa-subjectCyan',
    text: 'text-medusa-subjectCyan',
    leftBorder: 'border-l-4 border-l-medusa-subjectCyan',
    softBg: 'bg-medusa-subjectCyan/15',
    softBorder: 'border-medusa-subjectCyan/40',
  },
  Redação: {
    dot: 'bg-medusa-subjectClay',
    text: 'text-medusa-subjectClay',
    leftBorder: 'border-l-4 border-l-medusa-subjectClay',
    softBg: 'bg-medusa-subjectClay/15',
    softBorder: 'border-medusa-subjectClay/40',
  },
};

/**
 * "Todas as áreas" (simulados que cruzam disciplinas) e qualquer disciplina fora da lista acima
 * ficam neutras de propósito — não pertencem a UMA disciplina, então não ganham uma cor de
 * disciplina (evita inventar uma 8ª cor sem significado).
 */
const NEUTRAL: DisciplineColorClasses = {
  dot: 'bg-text-muted',
  text: 'text-text-muted',
  leftBorder: 'border-l-4 border-l-border-strong',
  softBg: 'bg-surface-secondary/60',
  softBorder: 'border-border/50',
};

export function getDisciplineColor(discipline: string): DisciplineColorClasses {
  return PALETTE[discipline] ?? NEUTRAL;
}

/** Disciplinas com cor própria, na ordem de exibição da legenda — "Todas as áreas" fica de fora. */
export const COLORED_DISCIPLINES = Object.keys(PALETTE);
