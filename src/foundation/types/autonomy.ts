/**
 * MEDUSA FOUNDATION — Autonomia L1 / L2 / L3
 *
 * Não é badge visual — é o núcleo do sistema de governança (ver Guardian).
 *
 * L1 — Operacional: baixo risco, reversível, escopo previsível → pode executar
 *      sozinho quando autorizado pela AutonomyPolicy.
 * L2 — Supervisionada: mais impacto/contexto → a IA prepara/propõe, o usuário
 *      decide (Aplicar / Revisar).
 * L3 — Alto impacto: potencialmente irreversível/sensível → sempre passa por
 *      aprovação humana antes de executar.
 */

import type { DomainId } from './domain';

export type AutonomyLevel = 'L1' | 'L2' | 'L3';

export type RiskLevel = 'baixo' | 'moderado' | 'alto';

/**
 * Regra de política para UM tipo de ação de UM domínio — nunca "Agenda = 80%".
 * A granularidade é domain + actionType, exatamente como a missão exige
 * (seção 5: "confiança por tipo de ação, não por domínio apenas").
 */
export interface AutonomyPolicyRule {
  domain: DomainId;
  actionType: string;
  baseRisk: RiskLevel;
  reversible: boolean;
  /** Nível máximo que esta ação pode alcançar mesmo com confiança perfeita. */
  ceilingLevel: AutonomyLevel;
  /** Nível mínimo de confiança (ver trust.ts) exigido para operar em L1. */
  minTrustForL1?: number;
  /** Nível mínimo de confiança exigido para operar em L2 sem aprovação extra. */
  minTrustForL2?: number;
  notes?: string;
}

/**
 * Resultado de classificar uma ação concreta contra a política + o trust
 * profile atual. É isto que o Guardian devolve — nunca um "true/false" cru.
 */
export interface AutonomyDecision {
  level: AutonomyLevel;
  requiresApproval: boolean;
  reason: string;
  matchedRule?: AutonomyPolicyRule;
  /** Ausência de regra conhecida é tratada como risco MÁXIMO, nunca liberal. */
  isUnknownActionType: boolean;
}
