/**
 * MEDUSA — Spiritual — Estudo bíblico
 *
 * Três coisas NUNCA se misturam: o TEXTO bíblico (origin "scripture"), a
 * explicação/interpretação de uma IA (origin "ai") e a reflexão pessoal do
 * usuário (origin "user", sempre privada). Cada item declara a própria origem.
 */

import type { BibleReference } from './bible';

export type StudyItemKind =
  | 'scripture_text'
  | 'context'
  | 'question'
  | 'ai_explanation'
  | 'cross_reference'
  | 'interpretation'
  | 'user_reflection'
  | 'conclusion'
  | 'next_exploration';

export type ContentOrigin = 'scripture' | 'ai' | 'user' | 'system';

export interface StudyItem {
  id: string;
  kind: StudyItemKind;
  origin: ContentOrigin;
  content: string;
  createdAt: string;
  reference?: BibleReference;
  /** Obrigatório em texto de escritura: de qual tradução veio. */
  translationId?: string;
  /** Obrigatório em conteúdo de IA: marca explícita de que não é escritura nem autoridade. */
  aiDisclosure?: { generatedByAi: true; isNotSpiritualAuthority: true };
  /** Conteúdo do usuário é sempre privado; nada dele sai deste objeto por canais genéricos. */
  private: boolean;
}

export interface Study {
  id: string;
  reference: BibleReference;
  topic?: string;
  question?: string;
  purposeId?: string;
  items: StudyItem[];
  status: 'open' | 'concluded';
  createdAt: string;
  concludedAt?: string;
}
