/**
 * MEDUSA — Spiritual — Sugestões contextuais (propósito → prática/leitura/estudo)
 *
 * Só usa METADADO (tipos, títulos, referências, estados) — nunca intenção,
 * reflexão, oração nem texto de estudo do usuário.
 */

import { formatReference } from '../model/bible';
import type { PracticeDefinition, SpiritualPurpose } from '../model/purpose';
import type { ReadingPlan, ReadingProgress } from '../model/reading';
import type { Study } from '../model/study';
import type { SpiritualPractice } from '../model/types';
import { practiceContinuity } from './practiceEngine';
import { computeReadingState, readingLabel } from './readingPlanEngine';
import { todayOf } from './dates';

export interface SpiritualSuggestion {
  kind: 'practice' | 'reading' | 'study' | 'resume';
  refId: string;
  purposeId?: string;
  priority: 'alta' | 'normal';
  text: string;
}

const KIND_ORDER: Record<SpiritualSuggestion['kind'], number> = { resume: 0, practice: 1, reading: 2, study: 3 };

export function buildSuggestions(input: {
  now: Date;
  purposes: SpiritualPurpose[];
  definitions: PracticeDefinition[];
  practices: SpiritualPractice[];
  plans: ReadingPlan[];
  progresses: ReadingProgress[];
  studies: Study[];
}): SpiritualSuggestion[] {
  const today = todayOf(input.now);
  const activePurposes = new Set(input.purposes.filter((p) => p.status === 'active').map((p) => p.id));
  const purposeLabel = (id?: string) => input.purposes.find((p) => p.id === id)?.label;
  const out: SpiritualSuggestion[] = [];

  for (const def of input.definitions.filter((d) => d.status === 'active')) {
    const c = practiceContinuity(def, input.practices, input.now);
    if (def.purposeId && !activePurposes.has(def.purposeId)) continue;
    const forPurpose = purposeLabel(def.purposeId) ? ` — ligado a "${purposeLabel(def.purposeId)}"` : '';
    if (c.status === 'pausa_curta' || c.status === 'pausa_longa') {
      out.push({ kind: 'resume', refId: def.id, purposeId: def.purposeId, priority: def.priority, text: `${c.message}${forPurpose}` });
    } else if (c.dueToday) {
      out.push({ kind: 'practice', refId: def.id, purposeId: def.purposeId, priority: def.priority, text: `Momento de ${def.kind === 'silencio' ? 'silêncio' : def.kind === 'oracao' ? 'oração' : def.kind === 'contemplacao' ? 'contemplação' : def.kind}${forPurpose}.` });
    }
  }

  for (const plan of input.plans) {
    if (plan.purposeId && !activePurposes.has(plan.purposeId)) continue;
    const progress = input.progresses.find((p) => p.planId === plan.id);
    if (!progress) continue;
    const state = computeReadingState(plan, progress, today);
    if (state.status === 'ficou_para_tras' || state.status === 'retomada_sugerida') {
      out.push({ kind: 'resume', refId: plan.id, purposeId: plan.purposeId, priority: 'normal', text: state.message });
    } else if (state.status === 'em_dia' && state.todayEntry && !progress.completed.some((c) => c.entryId === state.todayEntry!.id)) {
      out.push({ kind: 'reading', refId: plan.id, purposeId: plan.purposeId, priority: 'normal', text: `Leitura de hoje: ${readingLabel(state.todayEntry)}.` });
    }
  }

  for (const study of input.studies.filter((s) => s.status === 'open')) {
    if (study.purposeId && !activePurposes.has(study.purposeId)) continue;
    out.push({ kind: 'study', refId: study.id, purposeId: study.purposeId, priority: 'normal', text: `Continue o estudo de ${formatReference(study.reference, { names: true })}.` });
  }

  return out
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (a.s.priority === b.s.priority ? 0 : a.s.priority === 'alta' ? -1 : 1) || KIND_ORDER[a.s.kind] - KIND_ORDER[b.s.kind] || a.i - b.i)
    .map((x) => x.s);
}
