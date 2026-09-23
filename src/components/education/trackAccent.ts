import { StudyTrack } from './types';

/**
 * Cor de identidade contextual por trilha (Refinamento Visual — ver DESIGN.md §2). Reaproveita
 * os 3 tokens de paleta já existentes (nunca uma cor nova) e o campo `accentColor` que já vivia
 * em `TrackDefinition` sem nunca ser lido por nenhum componente — este é o primeiro lugar que
 * de fato usa essa identidade. Os pares de texto claro/escuro já existiam espalhados pelo
 * código (ex.: `text-[#18534B] dark:text-[#71DBD2]` no hero do dashboard, `text-[#8A6D00]
 * dark:text-medusa-accent` nos avisos "atenção" da Faculdade, `text-[#3D4C1D]
 * dark:text-[#D0EAA3]` no botão de QA) — centralizados aqui como fonte única, não recriados.
 *
 * Faculdade = primary (teal, já era a cor de ação/foco do produto — reforça, não introduz).
 * ENEM = accent (amarelo — mesmo tom já usado para "próxima ação"/atenção leve).
 * Inglês = tertiary (lima — já era o `accentColor` fixture da trilha antes de ser dado morto).
 */
export interface TrackAccentClasses {
  /** Texto de ênfase sobre superfície clara (título de seção, ícone ativo). */
  text: string;
  /** Fundo suave para badges/pills/ícones em círculo. */
  softBg: string;
  /** Borda suave para cards/badges. */
  softBorder: string;
  /**
   * Classe completa `hover:border-...` já composta — o scanner estático do Tailwind (JIT) só
   * gera CSS para tokens que aparecem literalmente no código-fonte. Concatenar `hover:` com uma
   * classe guardada em variável em tempo de execução (`` `hover:${accent.softBorder}` ``) NUNCA
   * apareceria como substring literal em nenhum arquivo, então o Tailwind não geraria essa
   * classe — por isso ela precisa existir pronta, por extenso, aqui.
   */
  hoverBorder: string;
  /** Fundo sólido para CTA primário da trilha. */
  solidBg: string;
  /** Texto sobre o fundo sólido acima. */
  solidText: string;
}

const TRACK_ACCENT: Record<StudyTrack, TrackAccentClasses> = {
  faculdade: {
    text: 'text-[#18534B] dark:text-[#71DBD2]',
    softBg: 'bg-[#71DBD2]/15',
    softBorder: 'border-[#71DBD2]/30',
    hoverBorder: 'hover:border-[#71DBD2]/50',
    solidBg: 'bg-medusa-primary',
    solidText: 'text-[#1C2420]',
  },
  vestibular: {
    text: 'text-[#8A6D00] dark:text-medusa-accent',
    softBg: 'bg-medusa-accent/15',
    softBorder: 'border-medusa-accent/30',
    hoverBorder: 'hover:border-medusa-accent/50',
    solidBg: 'bg-medusa-accent',
    solidText: 'text-[#4A3B00]',
  },
  ingles: {
    text: 'text-[#3D4C1D] dark:text-[#D0EAA3]',
    softBg: 'bg-medusa-tertiary/20',
    softBorder: 'border-medusa-tertiary/40',
    hoverBorder: 'hover:border-medusa-tertiary/50',
    solidBg: 'bg-medusa-tertiary',
    solidText: 'text-[#1C2420]',
  },
};

export function getTrackAccent(track: StudyTrack): TrackAccentClasses {
  return TRACK_ACCENT[track];
}
