/**
 * MEDUSA — Spiritual — Casos de uso: versículo do dia e sugestão à Agenda
 */

import { publish as publishEvent } from '../../../foundation/eventBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { formatReference } from '../model/bible';
import type { BibleTextProvider } from '../model/bible';
import type { DailyVerse } from '../model/purpose';
import { SPIRITUAL_EVENT_TYPES } from '../events/types';
import type { PracticeAgendaSuggestion } from '../adapters/agendaSuggestions';
import { suggestPracticeSchedule } from '../adapters/agendaSuggestions';
import type { SpiritualRepository } from '../repository/types';
import { attachVerseText, selectDailyVerse } from '../services/dailyVerse';
import type { VerseCandidate } from '../services/dailyVerse';
import { computeReadingState } from '../services/readingPlanEngine';
import { schedulePractice } from './schedulePractice';
import { SpiritualValidationError } from '../validators';

/** Idempotente por dia: o mesmo dia devolve o mesmo versículo já escolhido. */
export async function pickDailyVerse(
  repo: SpiritualRepository,
  input: { date: string; userSeed: string; candidates: VerseCandidate[]; provider?: BibleTextProvider; translationId?: string }
): Promise<DailyVerse | null> {
  const existing = repo.getDailyVerse(input.date);
  if (existing) return existing;

  let planToday: { reference: DailyVerse['reference']; context?: string } | undefined;
  for (const plan of repo.listReadingPlans()) {
    const progress = repo.getReadingProgress(plan.id);
    if (!progress) continue;
    const state = computeReadingState(plan, progress, input.date);
    if (state.status === 'em_dia' && state.todayEntry) {
      planToday = { reference: state.todayEntry.references[0], context: `Leitura de hoje em "${plan.title}".` };
      break;
    }
  }

  const chosen = selectDailyVerse({ date: input.date, userSeed: input.userSeed, candidates: input.candidates, planToday, recent: repo.listDailyVerses(), translationId: input.translationId });
  if (!chosen) return null;
  const verse = await attachVerseText(chosen, input.provider, input.translationId ?? 'default');
  repo.saveDailyVerse(verse);
  publishEvent({
    domain: 'spiritual',
    type: SPIRITUAL_EVENT_TYPES.DAILY_VERSE_SELECTED,
    payload: { date: verse.date, reference: formatReference(verse.reference), source: verse.source },
    dedupeKey: `daily-verse-${verse.date}`,
  });
  return verse;
}

export interface PracticeProposalResult {
  evaluation: GuardianEvaluation;
  /** Só existe quando o Guardian já autorizou; senão a sugestão espera aprovação. */
  suggestion?: PracticeAgendaSuggestion;
}

/** Espiritual → Agenda: monta a sugestão e a passa pelo Guardian (SCHEDULE_PRACTICE). A Agenda decide o horário. */
export function proposePracticeToAgenda(repo: SpiritualRepository, input: { definitionId: string; availableWindows: string[]; date: string }): PracticeProposalResult {
  const definition = repo.getPracticeDefinition(input.definitionId);
  if (!definition) throw new SpiritualValidationError(`Prática "${input.definitionId}" não encontrada.`);
  if (definition.status !== 'active') throw new SpiritualValidationError('Só práticas ativas geram sugestão para a Agenda.');
  const suggestion = suggestPracticeSchedule({ definition, availableWindows: input.availableWindows, date: input.date });
  const { evaluation } = schedulePractice(definition.kind, suggestion.title, input.date);
  return { evaluation, suggestion: evaluation.decision.requiresApproval ? undefined : suggestion };
}
