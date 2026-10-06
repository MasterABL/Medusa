/**
 * MEDUSA FOUNDATION — Guardian Policy (seções 4/5/41)
 *
 * Mapa imutável por (domain, actionType) — o emissor da ação NUNCA escolhe o
 * próprio risco (mesmo princípio já usado em outro produto deste mesmo autor
 * para comandos de dispositivo: um catálogo fechado, com "desconhecido = risco
 * MÁXIMO", nunca liberal por padrão).
 *
 * `classify()` não decide sozinho: ele lê a regra (o que É POSSÍVEL para este
 * tipo de ação) e o trust profile atual (o que JÁ FOI observado) e devolve uma
 * AutonomyDecision — nunca eleva a autoridade do próprio domínio por conta
 * própria (isso seria exatamente o "bypass" proibido na seção 41).
 */

import type { AutonomyDecision, AutonomyPolicyRule } from '../types/autonomy';
import type { Action } from '../types/action';
import type { ActionTrustProfile } from '../types/trust';
import type { DomainId } from '../types/domain';

const rules = new Map<string, AutonomyPolicyRule>();

function ruleKey(domain: DomainId, actionType: string): string {
  return `${domain}::${actionType}`;
}

export function registerAutonomyRule(rule: AutonomyPolicyRule): void {
  rules.set(ruleKey(rule.domain, rule.actionType), rule);
}

/** Remove uma regra (usado para pré-visualizar mudanças de autonomia sem deixar rastro). */
export function unregisterAutonomyRule(domain: DomainId, actionType: string): void {
  rules.delete(ruleKey(domain, actionType));
}

export function getAutonomyRule(domain: DomainId, actionType: string): AutonomyPolicyRule | undefined {
  return rules.get(ruleKey(domain, actionType));
}

export function listAutonomyRules(): AutonomyPolicyRule[] {
  return Array.from(rules.values());
}

const DEFAULT_MIN_SAMPLE_FOR_L1 = 5;
const DEFAULT_MIN_ACCEPTANCE_FOR_L1 = 0.85;

function hasSufficientTrustForL1(rule: AutonomyPolicyRule, trust: ActionTrustProfile | undefined): boolean {
  if (!trust) return false;
  const minSample = rule.minTrustForL1 !== undefined ? undefined : DEFAULT_MIN_SAMPLE_FOR_L1;
  const minAcceptance = rule.minTrustForL1 ?? DEFAULT_MIN_ACCEPTANCE_FOR_L1;
  const sampleOk = trust.sampleSize >= (minSample ?? 0);
  const acceptanceOk = (trust.recentAcceptanceRate ?? 0) >= minAcceptance;
  return trust.state === 'confiavel' && sampleOk && acceptanceOk;
}

export function classify(
  action: Pick<Action, 'domain' | 'type' | 'reversible'>,
  trust: ActionTrustProfile | undefined
): AutonomyDecision {
  const rule = getAutonomyRule(action.domain, action.type);

  if (!rule) {
    return {
      level: 'L3',
      requiresApproval: true,
      reason:
        'Tipo de ação sem política registrada — tratado como risco máximo por padrão, nunca liberado sem regra explícita.',
      isUnknownActionType: true,
    };
  }

  if (rule.ceilingLevel === 'L3') {
    return {
      level: 'L3',
      requiresApproval: true,
      reason: `Ação "${action.type}" é classificada como alto impacto pela política do domínio "${action.domain}" — sempre exige aprovação humana.`,
      matchedRule: rule,
      isUnknownActionType: false,
    };
  }

  if (rule.ceilingLevel === 'L2') {
    return {
      level: 'L2',
      requiresApproval: true,
      reason: `Ação "${action.type}" exige supervisão (analisar/preparar/propor) — Guardian nunca a executa sozinho neste nível.`,
      matchedRule: rule,
      isUnknownActionType: false,
    };
  }

  // Rede de segurança (seção 41, "nenhum domínio possui bypass"): mesmo que a regra autorize
  // L1, uma ação marcada como irreversível nunca executa sozinha sem supervisão — uma política
  // mal configurada não pode contornar isto.
  if (rule.ceilingLevel === 'L1' && action.reversible === false) {
    return {
      level: 'L2',
      requiresApproval: true,
      reason: `Ação "${action.type}" está marcada como irreversível — rebaixada para supervisão mesmo com política L1, nunca executa sozinha sem confirmação.`,
      matchedRule: rule,
      isUnknownActionType: false,
    };
  }

  // ceilingLevel === 'L1': só executa sozinho se a confiança observada já sustenta isso.
  if (hasSufficientTrustForL1(rule, trust)) {
    return {
      level: 'L1',
      requiresApproval: false,
      reason: `Confiança observada (${trust?.sampleSize ?? 0} amostras, ${Math.round(
        (trust?.recentAcceptanceRate ?? 0) * 100
      )}% de aceitação) sustenta execução automática para "${action.type}".`,
      matchedRule: rule,
      isUnknownActionType: false,
    };
  }

  return {
    level: 'L2',
    requiresApproval: true,
    reason: trust
      ? `Ainda sem confiança suficiente para L1 (${trust.sampleSize} amostras registradas) — tratado como proposta supervisionada nesta ocorrência.`
      : 'Nenhuma evidência de confiança ainda para este tipo de ação — tratado como proposta supervisionada até acumular histórico.',
    matchedRule: rule,
    isUnknownActionType: false,
  };
}

/** Só para testes de contrato. */
export function __resetPolicyForTests(): void {
  rules.clear();
}
