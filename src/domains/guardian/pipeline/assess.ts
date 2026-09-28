/**
 * Etapa ASSESS — a confiança PARTICIPA da decisão e a decisão é explicável.
 *
 * Usa a MESMA `classify()` da fundação que o Guardian usa para decidir de
 * verdade (sem chamar dispatch: não gera Action nem auditoria). Assim a
 * previsão nunca diverge da decisão real.
 */

import { GuardianPolicy, GuardianTrust } from '../../../foundation/guardian';
import type { AutonomyLevel } from '../../../foundation/types/autonomy';
import type { Cooldown } from '../model/types';
import type { GuardianRepository } from '../repository/types';
import type { RemediationRegistry } from '../remediation/registry';

export type ExpectedRoute = 'auto' | 'approval' | 'blocked';

export interface AutonomyAssessment {
  actionKey: string;
  hasRemediation: boolean;
  policyCeiling: AutonomyLevel | 'sem_regra';
  trustState: string;
  sampleSize: number;
  acceptanceRate: number | null;
  cooldown?: Cooldown;
  expectedRoute: ExpectedRoute;
  explanation: string;
}

export function assessAutonomy(input: {
  actionKey: string;
  reversible: boolean;
  repository: GuardianRepository;
  remediations: RemediationRegistry;
  now: Date;
  dedupeKey?: string;
}): AutonomyAssessment {
  const { actionKey, reversible, repository, remediations, now } = input;
  const trust = GuardianTrust.getTrust('guardian', actionKey);
  const rule = GuardianPolicy.getAutonomyRule('guardian', actionKey);
  const decision = GuardianPolicy.classify({ domain: 'guardian', type: actionKey, reversible }, trust);
  const cooldown =
    repository.getActiveCooldown(`action:${actionKey}`, now) ??
    (input.dedupeKey ? repository.getActiveCooldown(`finding:${input.dedupeKey}`, now) : undefined);
  const hasRemediation = remediations.has(actionKey);

  let expectedRoute: ExpectedRoute;
  let explanation: string;
  if (!hasRemediation) {
    expectedRoute = 'blocked';
    explanation = `Bloqueada: não existe remediador registrado para "${actionKey}" — só uma pessoa pode resolver.`;
  } else if (cooldown) {
    expectedRoute = 'blocked';
    explanation = `Bloqueada em cooldown até ${cooldown.until}: ${cooldown.reason}.`;
  } else if (decision.requiresApproval) {
    expectedRoute = 'approval';
    const sample = trust ? `${trust.sampleSize} amostra(s), estado "${trust.state}"` : 'nenhuma evidência de confiança ainda';
    explanation =
      decision.level === 'L1' || decision.level === 'L2'
        ? `Exige aprovação: ${decision.reason} (${sample}).`
        : `Exige aprovação: ${decision.reason}`;
    if (rule?.ceilingLevel === 'L1' && !trust) explanation = `Exige aprovação porque ainda não existe confiança suficiente (${sample}).`;
  } else {
    expectedRoute = 'auto';
    explanation = `Pode corrigir sozinha: ${decision.reason}`;
  }

  return {
    actionKey,
    hasRemediation,
    policyCeiling: rule?.ceilingLevel ?? 'sem_regra',
    trustState: trust?.state ?? 'sem_evidencia',
    sampleSize: trust?.sampleSize ?? 0,
    acceptanceRate: trust?.recentAcceptanceRate ?? null,
    cooldown,
    expectedRoute,
    explanation,
  };
}
