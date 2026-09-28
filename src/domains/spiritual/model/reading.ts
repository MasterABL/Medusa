/**
 * MEDUSA — Spiritual — Plano de leitura e progresso
 *
 * O plano guarda POSIÇÃO e continuidade, não só "hábito cumprido": sabe onde
 * o usuário está, o que vem depois, o que ficou para trás e desde quando.
 */

import type { BibleReference, Canon } from './bible';

export interface ReadingPlanEntry {
  id: string;
  label?: string;
  references: BibleReference[];
}

export interface ReadingPlan {
  id: string;
  title: string;
  canon: Canon;
  entries: ReadingPlanEntry[];
  /** YYYY-MM-DD — dia da 1ª entrada. */
  startDate: string;
  purposeId?: string;
  createdAt: string;
}

export interface ReadingProgress {
  planId: string;
  completed: Array<{ entryId: string; completedAt: string }>;
  /** A entrada esperada em `anchorDate` é a de índice `anchorIndex`. Retomar move a âncora, sem apagar histórico. */
  anchorDate: string;
  anchorIndex: number;
  pausedSince?: string;
  resumedAt?: string;
  startedAt: string;
}

export type ReadingStatus = 'nao_iniciado' | 'em_dia' | 'ficou_para_tras' | 'retomada_sugerida' | 'pausado' | 'concluido';

export interface ReadingState {
  planId: string;
  status: ReadingStatus;
  total: number;
  completedCount: number;
  remaining: number;
  dueCount: number;
  behindBy: number;
  aheadBy: number;
  todayEntry?: ReadingPlanEntry;
  nextEntry?: ReadingPlanEntry;
  upNext: ReadingPlanEntry[];
  missed: ReadingPlanEntry[];
  lastReadDate?: string;
  daysSinceLastRead: number | null;
  /** Texto de retomada sem culpa — nunca "você falhou". */
  message: string;
}
