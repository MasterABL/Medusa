/**
 * MEDUSA — Guardian — Consequência ANTES da mudança de autonomia
 *
 * Mudar autonomia nunca é só `autonomy = L2`: antes de aplicar, o domínio
 * calcula — com a MESMA `classify()` que decide de verdade e a confiança atual —
 * o que passa a ser automático, o que continua pedindo aprovação e o que
 * continua bloqueado. Nada é gravado: o preview registra uma regra hipotética
 * e a restaura no mesmo instante.
 */

import { GuardianPolicy, GuardianTrust } from '../../foundation/guardian';
import type { AutonomyLevel, AutonomyPolicyRule } from '../../foundation/types/autonomy';
import type { DomainId } from '../../foundation/types/domain';

export type Route = 'auto' | 'approval' | 'blocked';

export interface AutonomyChangeItem {
  actionType: string;
  before: Route;
  after: Route;
  /** verdadeiro quando, depois da mudança, a ação poderá rodar sozinha SE acumular confiança. */
  autoWhenTrusted: boolean;
  consequence: string;
}

export interface AutonomyChangePreview {
  domain: DomainId;
  description: string;
  items: AutonomyChangeItem[];
  becomeAutomatic: string[];
  becomeApproval: string[];
  stayApproval: string[];
  stayBlocked: string[];
  warnings: string[];
  summary: string[];
}

const RANK: Record<AutonomyLevel, number> = { L1: 1, L2: 2, L3: 3 };

function routeWith(rule: AutonomyPolicyRule, executable: boolean): Route {
  if (!executable) return 'blocked';
  const prior = GuardianPolicy.getAutonomyRule(rule.domain, rule.actionType);
  GuardianPolicy.registerAutonomyRule(rule);
  try {
    const trust = GuardianTrust.getTrust(rule.domain, rule.actionType);
    const decision = GuardianPolicy.classify({ domain: rule.domain, type: rule.actionType, reversible: rule.reversible }, trust);
    return decision.requiresApproval ? 'approval' : 'auto';
  } finally {
    if (prior) GuardianPolicy.registerAutonomyRule(prior);
    else GuardianPolicy.unregisterAutonomyRule(rule.domain, rule.actionType);
  }
}

function describeItem(rule: AutonomyPolicyRule, before: Route, after: Route, autoWhenTrusted: boolean): string {
  const trust = GuardianTrust.getTrust(rule.domain, rule.actionType);
  const sample = trust ? `${trust.sampleSize} amostra(s), estado "${trust.state}"` : 'sem evidência de confiança';
  if (after === 'blocked') return `${rule.actionType}: continua bloqueada — não há executor disponível.`;
  if (before === after && after === 'auto') return `${rule.actionType}: continua automática (${sample}).`;
  if (before === after) return `${rule.actionType}: continua exigindo aprovação${autoWhenTrusted ? ` (pode virar automática ao acumular confiança; hoje ${sample})` : ''}.`;
  if (after === 'auto') return `${rule.actionType}: passa a executar sozinha (${sample}).`;
  return `${rule.actionType}: passa a exigir aprovação${before === 'auto' ? ' — hoje executa sozinha' : ''}.`;
}

function build(
  domain: DomainId,
  description: string,
  changes: Array<{ current: AutonomyPolicyRule; proposed: AutonomyPolicyRule }>,
  isExecutable: (actionType: string) => boolean
): AutonomyChangePreview {
  const warnings: string[] = [];
  const items: AutonomyChangeItem[] = changes.map(({ current, proposed }) => {
    const executable = isExecutable(current.actionType);
    const before = routeWith(current, executable);
    const after = routeWith(proposed, executable);
    const autoWhenTrusted = executable && proposed.ceilingLevel === 'L1' && proposed.reversible;
    if (proposed.ceilingLevel === 'L1' && !proposed.reversible) {
      warnings.push(`${proposed.actionType} é irreversível: mesmo com teto L1 continuará sendo rebaixada para supervisão.`);
    }
    if (RANK[proposed.ceilingLevel] < RANK[current.ceilingLevel] && current.baseRisk === 'alto') {
      warnings.push(`${proposed.actionType} é de alto risco: reduzir o teto de ${current.ceilingLevel} para ${proposed.ceilingLevel} afrouxa a proteção.`);
    }
    return { actionType: current.actionType, before, after, autoWhenTrusted, consequence: describeItem(proposed, before, after, autoWhenTrusted) };
  });

  const by = (pred: (i: AutonomyChangeItem) => boolean) => items.filter(pred).map((i) => i.actionType);
  return {
    domain,
    description,
    items,
    becomeAutomatic: by((i) => i.before !== 'auto' && i.after === 'auto'),
    becomeApproval: by((i) => i.before === 'auto' && i.after === 'approval'),
    stayApproval: by((i) => i.before === 'approval' && i.after === 'approval'),
    stayBlocked: by((i) => i.after === 'blocked'),
    warnings,
    summary: items.map((i) => i.consequence),
  };
}

/**
 * `setting` = o quão permissivo o domínio pode ser: L1 mantém as políticas como
 * estão; L2/L3 elevam o teto de TODAS as ações do domínio a, no mínimo, esse nível
 * (L2 → nada executa sem supervisão; L3 → tudo é tratado como alto impacto).
 */
export function previewDomainAutonomyChange(input: {
  domain: DomainId;
  setting: AutonomyLevel;
  isExecutable?: (actionType: string) => boolean;
}): AutonomyChangePreview {
  const rules = GuardianPolicy.listAutonomyRules().filter((r) => r.domain === input.domain);
  const changes = rules.map((current) => ({
    current,
    proposed: { ...current, ceilingLevel: RANK[current.ceilingLevel] >= RANK[input.setting] ? current.ceilingLevel : input.setting },
  }));
  return build(input.domain, `Autonomia do domínio "${input.domain}" → ${input.setting}`, changes, input.isExecutable ?? (() => true));
}

export function previewActionAutonomyChange(input: {
  domain: DomainId;
  actionType: string;
  newCeiling: AutonomyLevel;
  isExecutable?: (actionType: string) => boolean;
}): AutonomyChangePreview {
  const current = GuardianPolicy.getAutonomyRule(input.domain, input.actionType);
  if (!current) throw new Error(`Sem regra registrada para ${input.domain}/${input.actionType} — não há o que mudar (hoje é tratada como L3).`);
  return build(
    input.domain,
    `${input.actionType}: teto ${current.ceilingLevel} → ${input.newCeiling}`,
    [{ current, proposed: { ...current, ceilingLevel: input.newCeiling } }],
    input.isExecutable ?? (() => true)
  );
}
