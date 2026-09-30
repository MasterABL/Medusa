/**
 * MEDUSA — Spiritual — Memorização, gratidão, histórico e continuidade
 *
 * Procedência: memorização (SM-2) e gratidão vêm do MINHA-VIDA
 * (espiritual_memorizacao / espiritual_gratidao); o modelo de continuidade
 * SEM streak/XP/nível é NOVA decisão de produto: no MINHA-VIDA continuidade
 * era gamificada (XP por dia, sequência). Aqui presença não é pontuação —
 * nenhum contrato abaixo tem pontos, nível, selo, ranking ou recompensa.
 *
 * O texto bíblico NUNCA mora aqui: um cartão guarda só a REFERÊNCIA; o texto
 * vem de um BibleTextProvider (ver model/bible.ts).
 */

import type { BibleReference } from './bible';

/** Botões de autoavaliação. Mapeados pra qualidade SM-2 em services/memorySrs.ts. */
export type RecallGrade = 'errei' | 'dificil' | 'bom' | 'facil';

export interface SrsState {
  /** Fator de facilidade SM-2 (mín. 1.3). */
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  /** YYYY-MM-DD — quando volta a aparecer. */
  dueDate: string;
  lastReviewedAt?: string;
}

export interface ScriptureMemoryCard {
  id: string;
  reference: BibleReference;
  translationId?: string;
  addedAt: string;
  status: 'active' | 'archived';
  srs: SrsState;
}

export interface MemoryReviewLog {
  cardId: string;
  reviewedAt: string;
  grade: RecallGrade;
  intervalBefore: number;
  intervalAfter: number;
}

/** Gratidão é PRIVADA como a reflexão: só metadado sai por canais genéricos. */
export interface GratitudeEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  content: string;
  createdAt: string;
  private: true;
}

export interface GratitudeMetadata {
  id: string;
  date: string;
  createdAt: string;
  contentLength: number;
}

export type SpiritualHistoryKind = 'pratica' | 'leitura' | 'estudo' | 'reflexao' | 'oracao' | 'gratidao' | 'memorizacao';

export interface SpiritualHistoryItem {
  id: string;
  kind: SpiritualHistoryKind;
  /** YYYY-MM-DD */
  date: string;
  at: string;
  /** Texto seguro pra listar. Nunca é conteúdo privado. */
  label: string;
  /** true = existe conteúdo privado por trás; a tela abre pelo caminho que registra acesso. */
  hasPrivateContent: boolean;
}

/**
 * Continuidade como PRESENÇA, não como sequência. Não existe aqui campo de
 * streak, recorde ou pontuação — de propósito (teste trava isso).
 */
export interface PresenceSummary {
  today: string;
  lastPresenceDate?: string;
  /** Dias desde a última presença; null = nunca houve. */
  daysSincePresence: number | null;
  windowDays: number;
  /** Quantos dias DISTINTOS da janela tiveram alguma presença (contagem descritiva, não meta). */
  presentDaysInWindow: number;
  presentToday: boolean;
  /** Sugestão de retomada sem cobrança. */
  stance: 'primeira_vez' | 'seguindo' | 'retomar_leve' | 'retomar_com_calma';
  message: string;
}

export type FlowStepId = 'presenca' | 'versiculo' | 'leitura' | 'pratica' | 'memoria' | 'continuidade';
export type FlowStepStatus = 'feito' | 'disponivel' | 'indisponivel' | 'nao_aplicavel';

export interface FlowStep {
  id: FlowStepId;
  status: FlowStepStatus;
  /** Informação estruturada pra tela compor; nunca texto de UI pronto. */
  detail?: Record<string, string | number | boolean | undefined>;
}

/** presença → versículo → leitura → prática → memória → continuidade, nessa ordem. */
export interface SpiritualDayFlow {
  date: string;
  steps: FlowStep[];
}
