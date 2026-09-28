/**
 * MEDUSA — Body Domain — Public API (seção 36)
 *
 * Contratos internos claros pra futura UI (Stitch) consumir — sem nenhum
 * componente visual aqui.
 */

import type { BodyRepository } from './repository/types';
import { computeRoutineLoad } from './services/routineLoadHeuristic';
import type { RoutineLoadInput } from './services/routineLoadHeuristic';
import { generateBodyInsights } from './services/insightsEngine';
import type { BodyInsightContext, BodyInsightType } from './services/insightsEngine';
import type { DomainInsight } from '../shared/insight';
import type { BodyPlan, BodyProfile } from './model/types';

export function getProfile(repository: BodyRepository, profileId: string): BodyProfile | undefined {
  return repository.getProfile(profileId);
}

export function getPlan(repository: BodyRepository, planId: string): BodyPlan | undefined {
  return repository.getPlan(planId);
}

export function getActivePlans(repository: BodyRepository): BodyPlan[] {
  return repository.listPlans({ status: 'active' });
}

export function getInsights(
  repository: BodyRepository,
  routineLoadInput: RoutineLoadInput | undefined,
  planId: string | undefined,
  now: string
): Array<DomainInsight<BodyInsightType>> {
  const ctx: BodyInsightContext = {
    routineLoad: routineLoadInput ? computeRoutineLoad(routineLoadInput) : undefined,
    plan: planId ? repository.getPlan(planId) : undefined,
    now,
  };
  return generateBodyInsights(ctx);
}

/**
 * "Janelas disponíveis" no sentido do domínio Corpo são só os RÓTULOS que já
 * vieram de fora (tipicamente um cruzamento com a Agenda) — este domínio
 * nunca calcula disponibilidade de horário real por conta própria (seção 14).
 */
export function getAvailableWindows(candidateWindowLabels: string[]): string[] {
  return [...candidateWindowLabels];
}
