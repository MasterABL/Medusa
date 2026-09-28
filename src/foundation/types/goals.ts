/**
 * MEDUSA FOUNDATION — Goals compartilhados (seção 34)
 *
 * O domínio determina O SIGNIFICADO de um objetivo ("passar no ENEM", "reserva
 * financeira", "rotina de treino"). A infraestrutura aqui só determina COMO
 * progresso/marcos/ações se conectam — não inventa metas concretas.
 */

import type { DomainId } from './domain';

export interface Milestone {
  id: string;
  label: string;
  achieved: boolean;
  achievedAt?: string;
  targetDate?: string;
}

export interface Goal {
  id: string;
  domain: DomainId;
  title: string;
  description?: string;
  milestones: Milestone[];
  /** 0–1. Derivado dos milestones — nunca digitado à mão pela UI. */
  progress: number;
  createdAt: string;
  targetDate?: string;
  /** Ações (Action.id) que este objetivo já gerou. */
  relatedActionIds: string[];
}

/**
 * Explicação de por que uma recomendação existe, ligada (ou não) a um Goal.
 * Reaproveita a mesma forma de MessageEvidence (ver messaging.ts) porque a
 * missão pede o mesmo modelo de "intent + evidence" em toda a plataforma.
 */
export interface Insight {
  id: string;
  domain: DomainId;
  observation: string;
  evidence: string[];
  reasoningSummary: string;
  /** 0–1, interpretável junto de `reasoningSummary` — nunca exibido sozinho. */
  confidence: number;
  proposedActionId?: string;
  relatedGoalId?: string;
  createdAt: string;
}

export function computeGoalProgress(goal: Pick<Goal, 'milestones'>): number {
  if (goal.milestones.length === 0) return 0;
  const achieved = goal.milestones.filter((m) => m.achieved).length;
  return achieved / goal.milestones.length;
}
