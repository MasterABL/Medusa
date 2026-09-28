/**
 * MEDUSA — Spiritual — Propósito, práticas, tradição e versículo do dia
 *
 * Propósito NÃO é medalha nem pontuação: é o "para quê" que conecta práticas,
 * estudos, leitura e metas, e influencia o que o Hoje/Agenda sugerem.
 */

import type { BibleReference, Canon } from './bible';

export interface SpiritualPurpose {
  id: string;
  label: string;
  description?: string;
  themes: string[];
  status: 'active' | 'paused' | 'archived';
  createdAt: string;
}

export type PracticeKind = 'oracao' | 'leitura' | 'estudo' | 'contemplacao' | 'silencio';

export interface PracticeDefinition {
  id: string;
  kind: PracticeKind;
  /** Intenção em texto livre do usuário — tratada como privada. */
  intention: string;
  purposeId?: string;
  frequency?: { timesPerWeek?: number; days?: number[] };
  durationMinutes?: number;
  /** Contexto livre ("antes de sair de casa"). */
  context?: string;
  status: 'active' | 'paused' | 'archived';
  /** Prioridade espiritual: informa Agenda/Hoje; não altera a Agenda. */
  priority: 'alta' | 'normal';
  preferredWindowLabels?: string[];
  createdAt: string;
}

/** Tradição informa a personalização; o domínio não assume autoridade espiritual. */
export interface SpiritualTraditionPrefs {
  label: string;
  canon: Canon;
  language: string;
  preferredTranslationId?: string;
}

export interface PrayerIntention {
  id: string;
  /** Texto da oração/intenção — privado, nunca em evento ou contrato genérico. */
  content: string;
  theme?: string;
  purposeId?: string;
  status: 'open' | 'answered' | 'archived';
  createdAt: string;
}

export type DailyVerseSource = 'curated_pool' | 'reading_plan' | 'study' | 'user_selected';

export interface DailyVerse {
  date: string;
  reference: BibleReference;
  translationId?: string;
  source: DailyVerseSource;
  context?: string;
  relatedStudyId?: string;
  relatedPracticeId?: string;
  /** Presente SÓ se um BibleTextProvider devolveu o texto. Nunca é gerado aqui. */
  text?: { value: string; providerId: string };
}
