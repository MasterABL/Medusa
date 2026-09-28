/**
 * MEDUSA — Spiritual — Continuidade de práticas (sem culpa, sem "streak")
 *
 * Nenhum contador de sequência perdida. A saída descreve o ritmo observado e
 * OFERECE retomar — a linguagem é convite, nunca cobrança.
 */

import type { PracticeDefinition, PracticeKind } from '../model/purpose';
import type { SpiritualPractice } from '../model/types';
import { dayDiff, todayOf, weekdayOf } from './dates';

export type PracticeContinuityStatus = 'em_ritmo' | 'pausa_curta' | 'pausa_longa' | 'sem_registro' | 'pausada' | 'arquivada';

export interface PracticeContinuity {
  definitionId: string;
  status: PracticeContinuityStatus;
  lastCompletedAt?: string;
  daysSince: number | null;
  expectedIntervalDays: number;
  dueToday: boolean;
  message: string;
}

const VERB: Record<PracticeKind, { infinitive: string; noun: string }> = {
  oracao: { infinitive: 'orar', noun: 'oração' },
  leitura: { infinitive: 'ler', noun: 'leitura' },
  estudo: { infinitive: 'estudar', noun: 'estudo' },
  contemplacao: { infinitive: 'contemplar', noun: 'contemplação' },
  silencio: { infinitive: 'praticar o silêncio', noun: 'silêncio' },
};

/** Palavras que NUNCA devem aparecer em mensagem de continuidade (usadas em teste de linguagem). */
export const GUILT_WORDS = ['falhou', 'falhaste', 'fracassou', 'perdeu', 'culpa', 'vergonha', 'decepcion', 'streak', 'quebrou a sequência', 'atrasado'];

export function expectedIntervalDays(def: PracticeDefinition): number {
  if (def.frequency?.days && def.frequency.days.length > 0) return 7 / def.frequency.days.length;
  if (def.frequency?.timesPerWeek && def.frequency.timesPerWeek > 0) return 7 / def.frequency.timesPerWeek;
  return 7;
}

export function practiceContinuity(def: PracticeDefinition, completions: SpiritualPractice[], now: Date): PracticeContinuity {
  const today = todayOf(now);
  const mine = completions.filter((c) => c.definitionId === def.id).map((c) => c.completedAt).sort();
  const last = mine[mine.length - 1];
  const daysSince = last ? dayDiff(last.slice(0, 10), today) : null;
  const interval = expectedIntervalDays(def);
  const doneToday = last?.slice(0, 10) === today;
  const scheduledToday = def.frequency?.days ? def.frequency.days.includes(weekdayOf(today)) : true;
  const dueToday = def.status === 'active' && !doneToday && scheduledToday && (daysSince === null || daysSince >= Math.floor(interval));
  const verb = VERB[def.kind];

  let status: PracticeContinuityStatus;
  let message: string;
  if (def.status === 'archived') {
    status = 'arquivada';
    message = `A prática de ${verb.noun} está arquivada.`;
  } else if (def.status === 'paused') {
    status = 'pausada';
    message = `A prática de ${verb.noun} está em pausa. Quando quiser, ela volta.`;
  } else if (daysSince === null) {
    status = 'sem_registro';
    message = `Ainda não há registro de ${verb.noun}. Que tal começar hoje?`;
  } else if (daysSince <= interval * 1.5) {
    status = 'em_ritmo';
    message = doneToday ? `Você já reservou um momento de ${verb.noun} hoje.` : `Seu ritmo de ${verb.noun} está bom.`;
  } else if (daysSince <= interval * 3) {
    status = 'pausa_curta';
    message = `Você ficou alguns dias sem ${verb.infinitive}. Quer retomar hoje?`;
  } else {
    status = 'pausa_longa';
    message = `Faz um tempo desde a última ${verb.noun}. Quer voltar com calma, sem pressa?`;
  }

  return { definitionId: def.id, status, lastCompletedAt: last, daysSince, expectedIntervalDays: interval, dueToday, message };
}

/** Sugere um momento entre as janelas livres fornecidas — nunca calcula disponibilidade de horário. */
export function suggestPrayerMoment(def: PracticeDefinition, availableWindows: string[]): { windowLabel?: string; rationale: string } {
  if (availableWindows.length === 0) return { rationale: 'Nenhuma janela livre informada pela Agenda — sem horário sugerido.' };
  const preferred = def.preferredWindowLabels?.find((w) => availableWindows.includes(w));
  if (preferred) return { windowLabel: preferred, rationale: `Janela preferida disponível: ${preferred}.` };
  return { windowLabel: availableWindows[0], rationale: `Nenhuma janela preferida livre; primeira disponível: ${availableWindows[0]}.` };
}
