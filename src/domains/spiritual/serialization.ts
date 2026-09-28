/**
 * MEDUSA — Spiritual — serialização (seção 34)
 *
 * Reflexão serializada carrega o conteúdo (é o dado do próprio usuário), então
 * este arquivo só deve ser usado por um adapter de persistência PRIVADO — nunca
 * por um canal genérico de sistema (seção 26).
 */

import { deserialize, serialize } from '../shared/serialization';
import { validateReflection, validatePractice, SpiritualValidationError } from './validators';
import { validateReference } from './model/bible';
import type { PracticeDefinition, SpiritualPurpose } from './model/purpose';
import type { ReadingPlan, ReadingProgress } from './model/reading';
import type { Study } from './model/study';
import { validateStudyItem } from './services/studyEngine';

import type { SpiritualPractice, SpiritualReflection } from './model/types';

export const serializePractice = (p: SpiritualPractice): string => serialize('spiritual.practice', p);
export const deserializePractice = (payload: string): SpiritualPractice => deserialize<SpiritualPractice>('spiritual.practice', payload, validatePractice);

export const serializeReflection = (r: SpiritualReflection): string => serialize('spiritual.reflection', r);
export const deserializeReflection = (payload: string): SpiritualReflection => deserialize<SpiritualReflection>('spiritual.reflection', payload, validateReflection);

// --- Bíblia, leitura, estudo e propósito ---

function validatePlan(plan: ReadingPlan): void {
  if (!Array.isArray(plan.entries) || plan.entries.length === 0) throw new SpiritualValidationError('plano restaurado sem entradas.');
  for (const entry of plan.entries) entry.references.forEach((r) => validateReference(r, plan.canon));
}

export const serializeReadingPlan = (p: ReadingPlan): string => serialize('spiritual.readingPlan', p);
export const deserializeReadingPlan = (payload: string): ReadingPlan => deserialize<ReadingPlan>('spiritual.readingPlan', payload, validatePlan);

export const serializeReadingProgress = (p: ReadingProgress): string => serialize('spiritual.readingProgress', p);
export const deserializeReadingProgress = (payload: string): ReadingProgress =>
  deserialize<ReadingProgress>('spiritual.readingProgress', payload, (p) => {
    if (!p.planId || !Array.isArray(p.completed)) throw new SpiritualValidationError('progresso restaurado inválido.');
  });

/** Estudo restaurado é revalidado item a item: texto, IA e reflexão continuam separados. */
export const serializeStudy = (s: Study): string => serialize('spiritual.study', s);
export const deserializeStudy = (payload: string): Study =>
  deserialize<Study>('spiritual.study', payload, (s) => {
    validateReference(s.reference, 'open');
    if (!Array.isArray(s.items)) throw new SpiritualValidationError('estudo restaurado sem lista de itens.');
    s.items.forEach((i) => validateStudyItem(i, 'open'));
  });

export const serializePurpose = (p: SpiritualPurpose): string => serialize('spiritual.purpose', p);
export const deserializePurpose = (payload: string): SpiritualPurpose =>
  deserialize<SpiritualPurpose>('spiritual.purpose', payload, (p) => {
    if (!p.label?.trim()) throw new SpiritualValidationError('propósito restaurado sem rótulo.');
  });

export const serializePracticeDefinition = (d: PracticeDefinition): string => serialize('spiritual.practiceDefinition', d);
export const deserializePracticeDefinition = (payload: string): PracticeDefinition =>
  deserialize<PracticeDefinition>('spiritual.practiceDefinition', payload, (d) => {
    if (!d.intention?.trim()) throw new SpiritualValidationError('prática restaurada sem intenção.');
  });
