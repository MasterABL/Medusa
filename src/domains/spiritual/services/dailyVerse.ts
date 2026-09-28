/**
 * MEDUSA — Spiritual — Versículo do dia
 *
 * O domínio escolhe a REFERÊNCIA; o TEXTO só existe se um BibleTextProvider o
 * devolver. Nunca fabrica frase "com cara de versículo": sem candidato → null,
 * sem texto → o campo `text` simplesmente não existe.
 */

import { referenceKey, validateReference } from '../model/bible';
import type { BibleReference, BibleTextProvider, Canon } from '../model/bible';
import type { DailyVerse, DailyVerseSource } from '../model/purpose';
import { dayDiff } from './dates';

export interface VerseCandidate {
  reference: BibleReference;
  source: DailyVerseSource;
  context?: string;
  relatedStudyId?: string;
  relatedPracticeId?: string;
}

function seedIndex(seed: string, size: number): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i += 1) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  return h % size;
}

export function selectDailyVerse(input: {
  date: string;
  userSeed: string;
  candidates: VerseCandidate[];
  /** Referência de HOJE no plano de leitura (tem prioridade sobre o sorteio). */
  planToday?: { reference: BibleReference; context?: string };
  recent: DailyVerse[];
  recentWindowDays?: number;
  translationId?: string;
  canon?: Canon;
}): DailyVerse | null {
  const canon = input.canon ?? 'standard66';
  const windowDays = input.recentWindowDays ?? 90;

  if (input.planToday) {
    validateReference(input.planToday.reference, canon);
    return { date: input.date, reference: input.planToday.reference, translationId: input.translationId, source: 'reading_plan', context: input.planToday.context };
  }

  const valid = input.candidates.filter((c) => {
    try {
      validateReference(c.reference, canon);
      return true;
    } catch {
      return false;
    }
  });
  if (valid.length === 0) return null;

  const recentKeys = new Set(input.recent.filter((v) => dayDiff(v.date, input.date) >= 0 && dayDiff(v.date, input.date) <= windowDays).map((v) => referenceKey(v.reference)));
  const fresh = valid.filter((c) => !recentKeys.has(referenceKey(c.reference)));
  const pool = fresh.length > 0 ? fresh : valid; // repetir é melhor que não mostrar nada
  const pick = pool[seedIndex(`${input.userSeed}|${input.date}`, pool.length)];

  return {
    date: input.date,
    reference: pick.reference,
    translationId: input.translationId,
    source: pick.source,
    context: pick.context,
    relatedStudyId: pick.relatedStudyId,
    relatedPracticeId: pick.relatedPracticeId,
  };
}

/** Só anexa texto que o provedor realmente devolveu. Sem provedor/resposta → versículo sem `text`. */
export async function attachVerseText(verse: DailyVerse, provider: BibleTextProvider | undefined, translationId: string): Promise<DailyVerse> {
  if (!provider) return verse;
  const passage = await provider.getPassage(verse.reference, translationId);
  if (!passage) return verse;
  return { ...verse, translationId: passage.translationId, text: { value: passage.text, providerId: provider.id } };
}
