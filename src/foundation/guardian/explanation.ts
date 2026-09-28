/**
 * MEDUSA FOUNDATION — Guardian Explanation (seção 24)
 *
 * Gerador ESTRUTURADO — nunca "chain of thought" solto em texto livre. Uma
 * futura UI pode renderizar isto diretamente: reason/evidence/impact/
 * requestedDecision são campos fixos, não um parágrafo pra interpretar.
 */

import type { GuardianEvaluation } from '../types/guardian';

export interface GuardianExplanation {
  actionId: string;
  actionType: string;
  domain: string;
  /** Por que o Guardian decidiu o que decidiu — frase única, sem jargão interno. */
  reason: string;
  /** Fatos observáveis que sustentam a decisão — nunca opinião, sempre dado. */
  evidence: string[];
  /** O que muda no mundo se esta ação for autorizada. */
  impact: string;
  /** O que está sendo pedido de fato — nunca ambíguo. */
  requestedDecision: 'executar_automaticamente' | 'aguardar_aprovacao_humana';
  autonomyLevel: GuardianEvaluation['decision']['level'];
  auditReference: string;
}

export function explain(evaluation: GuardianEvaluation): GuardianExplanation {
  const { action, decision, auditLogEntry } = evaluation;

  const evidence: string[] = [];
  if (decision.matchedRule) {
    evidence.push(`Política registrada para "${action.domain}/${action.type}": teto ${decision.matchedRule.ceilingLevel}, risco base ${decision.matchedRule.baseRisk}.`);
  } else {
    evidence.push(`Nenhuma política registrada para "${action.domain}/${action.type}" — tratado como risco máximo por padrão.`);
  }
  evidence.push(`Ação declarada como ${action.reversible ? 'reversível' : 'irreversível'}.`);

  return {
    actionId: action.id,
    actionType: action.type,
    domain: action.domain,
    reason: decision.reason,
    evidence,
    impact: action.intent,
    requestedDecision: decision.requiresApproval ? 'aguardar_aprovacao_humana' : 'executar_automaticamente',
    autonomyLevel: decision.level,
    auditReference: auditLogEntry.id,
  };
}
