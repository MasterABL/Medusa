/**
 * MEDUSA FOUNDATION — Motion Identity por domínio (seção 28)
 *
 * Cada domínio tem sua própria gramática de movimento (construção/descoberta
 * para Educação, deslocamento/fluxo para Agenda, etc.), mas a diferença deve
 * ser perceptível sem ficar escancarada — nunca "pulse em tudo" ou
 * "transition-all como solução".
 *
 * Este contrato só nomeia METÁFORAS e referencia PRIMITIVOS (classes CSS já
 * existentes, ex.: `stagger-item`, `fadeRise` — ver globals.css); não define
 * keyframes novos aqui. A implementação visual continua no CSS/Tailwind.
 */

import type { DomainId } from './domain';

export type MotionMetaphor =
  | 'construcao' // Educação: construção / descoberta / progressão
  | 'deslocamento' // Agenda: deslocamento / expansão / acomodação / fluxo temporal
  | 'fluxo' // Finanças: fluxo / distribuição / equilíbrio / acumulação
  | 'respiracao' // Corpo: respiração / cadência / movimento / recuperação
  | 'contencao'; // Guardian: contenção / confirmação / proteção / confiança

export interface DomainMotionProfile {
  id: string;
  domain: DomainId;
  metaphor: MotionMetaphor;
  /** Nomes de classes/utilities CSS já existentes que expressam esta metáfora. */
  primitives: string[];
  /** Descrição curta do "porquê", para quem for implementar a UI depois. */
  rationale: string;
}
