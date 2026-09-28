/**
 * MEDUSA — Body Domain — Planning Engine (seção 14)
 *
 * Recebe `profile + janelas disponíveis + objetivos` e produz um plano
 * CANDIDATO — nunca auto-executado, sempre uma proposta que passa pelo
 * Guardian antes de virar sessão agendada de verdade (seção 15).
 *
 * Determinístico: mesma entrada → mesma saída, sem aleatoriedade.
 */

import { BODY_ACTIVITY_CATALOG, getActivity } from '../model/activityCatalog';
import type { BodyPlan, BodyProfile, BodySession, IntensityDescriptor } from '../model/types';

export interface PlanningContext {
  profile: BodyProfile;
  /**
   * Janelas livres já resolvidas por quem chama (tipicamente um cruzamento
   * com a Agenda) — ex.: ['manha', 'noite']. Este motor nunca calcula
   * disponibilidade real de horário, só reage às janelas dadas.
   */
  availableWindows: string[];
}

function intensityForExperience(level: BodyProfile['experienceLevel']['value']): IntensityDescriptor {
  if (level === 'iniciante') return 'leve';
  if (level === 'intermediario') return 'moderada';
  return 'desafiadora';
}

function pickBaseActivityId(profile: BodyProfile): string {
  const local = profile.location?.value;
  const gymContext = profile.gymContext?.value;

  if (profile.experienceLevel.value === 'iniciante') {
    return 'act_caminhada_leve';
  }
  if (local === 'academia' || gymContext === 'tenho_academia') {
    return 'act_treino_geral_academia';
  }
  return 'act_treino_geral_casa';
}

/** Espalha N sessões pelos dias da semana o mais uniformemente possível (0=domingo). */
function distributeDays(count: number): number[] {
  if (count <= 0) return [];
  const step = 7 / count;
  const days = new Set<number>();
  for (let i = 0; i < count; i += 1) {
    days.add(Math.round(i * step) % 7);
  }
  // Garantir exatamente `count` dias mesmo se o arredondamento colidir.
  let candidate = 1;
  while (days.size < count && candidate < 7) {
    days.add(candidate);
    candidate += 1;
  }
  return Array.from(days).sort((a, b) => a - b).slice(0, count);
}

export function generateCandidatePlan(planId: string, ctx: PlanningContext, nowISO: string): BodyPlan {
  const frequencyPerWeek = Math.max(0, Math.min(Math.round(ctx.profile.weeklyFrequency.value), 7));
  const baseActivityId = pickBaseActivityId(ctx.profile);
  const baseActivity = getActivity(baseActivityId) ?? BODY_ACTIVITY_CATALOG[0];
  const intensity = intensityForExperience(ctx.profile.experienceLevel.value);
  const preferredWindowLabel = ctx.availableWindows[0];
  const preferredDays = distributeDays(frequencyPerWeek);

  const sessions: BodySession[] = frequencyPerWeek === 0
    ? []
    : [
        {
          id: `${planId}_session_1`,
          activityId: baseActivity.id,
          preferredDays,
          preferredWindowLabel,
          durationMinutes: baseActivity.defaultDurationMinutes,
          intensity,
        },
      ];

  return {
    id: planId,
    stage: 'plano',
    status: 'draft',
    sessions,
    frequencyPerWeek,
    progressionNotes:
      frequencyPerWeek > 0
        ? `Ponto de partida: ${baseActivity.label} (${intensity}). Progressão futura pode migrar para "${
            BODY_ACTIVITY_CATALOG.find((a) => a.progressionFromActivityId === baseActivity.id)?.label ?? 'uma atividade mais desafiadora'
          }".`
        : undefined,
    recoveryNotes: baseActivity.recoveryExpectation,
    notes:
      ctx.availableWindows.length === 0
        ? 'Nenhuma janela disponível informada — plano gerado sem preferência de horário definida.'
        : undefined,
    createdAt: nowISO,
    updatedAt: nowISO,
  };
}
