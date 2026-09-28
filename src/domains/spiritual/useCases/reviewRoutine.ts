/**
 * MEDUSA — Spiritual Domain — Use Case: revisar rotina (capability `reviewRoutine`)
 *
 * Leitura pura — nunca decide nada, só resume aderência observada. Nenhuma
 * recomendação prescritiva de conteúdo espiritual, só fato: quantas práticas
 * do tipo esperado aconteceram nos últimos N dias.
 */

import type { SpiritualPractice, SpiritualRoutine } from '../model/types';

export interface RoutineReview {
  routineId: string;
  practiceType: string;
  completedInWindow: number;
  windowDays: number;
}

export function reviewRoutine(routine: SpiritualRoutine, practices: SpiritualPractice[], nowISO: string, windowDays = 7): RoutineReview {
  const windowStart = new Date(nowISO);
  windowStart.setDate(windowStart.getDate() - windowDays);

  const completedInWindow = practices.filter(
    (p) => p.type === routine.practiceType && new Date(p.completedAt) >= windowStart && new Date(p.completedAt) <= new Date(nowISO)
  ).length;

  return { routineId: routine.id, practiceType: routine.practiceType, completedInWindow, windowDays };
}
