/**
 * MEDUSA — Spiritual — Motor do plano de leitura
 *
 * Determinístico. Continuidade em vez de cobrança: atrasar nunca gera texto de
 * culpa; o motor oferece DUAS saídas — ler o que ficou para depois, ou retomar
 * do ponto atual (a âncora do calendário se move; o histórico não é apagado).
 */

import { formatReference, validateReference } from '../model/bible';
import type { BibleReference, Canon } from '../model/bible';
import type { ReadingPlan, ReadingPlanEntry, ReadingProgress, ReadingState, ReadingStatus } from '../model/reading';
import { dayDiff, dayOf, todayOf } from './dates';

export class ReadingPlanError extends Error {}

export function planFromChapters(input: {
  id: string;
  title: string;
  chapters: Array<{ book: string; chapter: number }>;
  startDate: string;
  canon?: Canon;
  purposeId?: string;
  createdAt: string;
}): ReadingPlan {
  const canon = input.canon ?? 'standard66';
  if (input.chapters.length === 0) throw new ReadingPlanError('Um plano precisa de ao menos uma leitura.');
  const entries: ReadingPlanEntry[] = input.chapters.map((c, i) => {
    const ref: BibleReference = { book: c.book, chapter: c.chapter };
    validateReference(ref, canon);
    return { id: `${input.id}_e${i + 1}`, references: [ref] };
  });
  return { id: input.id, title: input.title, canon, entries, startDate: input.startDate, purposeId: input.purposeId, createdAt: input.createdAt };
}

export function initProgress(plan: ReadingPlan, startedAt: string): ReadingProgress {
  return { planId: plan.id, completed: [], anchorDate: plan.startDate, anchorIndex: 0, startedAt };
}

export function completeEntry(plan: ReadingPlan, progress: ReadingProgress, entryId: string, completedAt: string): ReadingProgress {
  if (!plan.entries.some((e) => e.id === entryId)) throw new ReadingPlanError(`Entrada "${entryId}" não pertence ao plano "${plan.id}".`);
  if (progress.completed.some((c) => c.entryId === entryId)) return progress; // idempotente
  return { ...progress, completed: [...progress.completed, { entryId, completedAt }] };
}

export function pausePlan(progress: ReadingProgress, today: string): ReadingProgress {
  return progress.pausedSince ? progress : { ...progress, pausedSince: today };
}

/** Retomar de onde parou: a leitura de HOJE passa a ser a próxima não lida. Nada é apagado. */
export function resumePlan(plan: ReadingPlan, progress: ReadingProgress, today: string): ReadingProgress {
  const next = plan.entries.findIndex((e) => !progress.completed.some((c) => c.entryId === e.id));
  return { ...progress, anchorDate: today, anchorIndex: next === -1 ? plan.entries.length : next, pausedSince: undefined, resumedAt: today };
}

function label(entry: ReadingPlanEntry | undefined): string {
  if (!entry) return 'o próximo trecho';
  return entry.label ?? entry.references.map((r) => formatReference(r, { names: true })).join(' + ');
}

export function computeReadingState(plan: ReadingPlan, progress: ReadingProgress, today: string): ReadingState {
  const total = plan.entries.length;
  const doneIds = new Set(progress.completed.map((c) => c.entryId));
  const completedCount = plan.entries.filter((e) => doneIds.has(e.id)).length;
  const nextIndex = plan.entries.findIndex((e) => !doneIds.has(e.id));
  const nextEntry = nextIndex === -1 ? undefined : plan.entries[nextIndex];

  const effectiveDay = progress.pausedSince && progress.pausedSince < today ? progress.pausedSince : today;
  const notStartedYet = effectiveDay < progress.anchorDate;
  const dueCount = notStartedYet ? 0 : Math.min(total, progress.anchorIndex + dayDiff(progress.anchorDate, effectiveDay) + 1);
  const overdue = Math.max(0, dueCount - 1 - completedCount);
  const aheadBy = Math.max(0, completedCount - dueCount);
  const todayEntry = dueCount > 0 ? plan.entries[Math.min(dueCount, total) - 1] : undefined;
  const missed = plan.entries.filter((e, i) => i < dueCount - 1 && !doneIds.has(e.id));

  const lastReadDate = progress.completed.map((c) => dayOf(c.completedAt)).sort().pop();
  const daysSinceLastRead = lastReadDate ? dayDiff(lastReadDate, today) : null;

  let status: ReadingStatus;
  if (completedCount === total) status = 'concluido';
  else if (progress.pausedSince) status = 'pausado';
  else if (notStartedYet && completedCount === 0) status = 'nao_iniciado';
  else if (overdue === 0) status = 'em_dia';
  else if (overdue <= 2) status = 'ficou_para_tras';
  else status = 'retomada_sugerida';

  const title = `"${plan.title}"`;
  const messages: Record<ReadingStatus, string> = {
    nao_iniciado: `O plano ${title} começa em ${plan.startDate}.`,
    concluido: `Você concluiu o plano ${title}.`,
    pausado: `O plano ${title} está em pausa. Quando quiser, retome de onde parou: ${label(nextEntry)}.`,
    em_dia: aheadBy > 0 ? `Você está adiantado em ${title}. Próximo: ${label(nextEntry)}.` : `Você está em dia com ${title}. Hoje: ${label(todayEntry)}.`,
    ficou_para_tras: `Ficaram ${overdue} leitura(s) de ${title} para depois. Você pode ler quando puder ou retomar de ${label(nextEntry)}.`,
    retomada_sugerida: `Você ficou alguns dias sem ler ${title}. Quer retomar hoje de ${label(nextEntry)}?`,
  };

  return {
    planId: plan.id,
    status,
    total,
    completedCount,
    remaining: total - completedCount,
    dueCount,
    behindBy: overdue,
    aheadBy,
    todayEntry,
    nextEntry,
    upNext: plan.entries.filter((e) => !doneIds.has(e.id)).slice(0, 3),
    missed,
    lastReadDate,
    daysSinceLastRead,
    message: messages[status],
  };
}

export function readingLabel(entry: ReadingPlanEntry | undefined): string {
  return label(entry);
}

export { todayOf };
