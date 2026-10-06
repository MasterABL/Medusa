/**
 * MEDUSA — Spiritual — Casos de uso: propósito, definição de prática, intenção de oração
 * Entrada de dado do próprio usuário: não passa pelo Guardian (registrar ≠ agir).
 */

import type { PracticeDefinition, PrayerIntention, SpiritualPurpose } from '../model/purpose';
import type { SpiritualRepository } from '../repository/types';
import { SpiritualValidationError } from '../validators';

export function createPurpose(repo: SpiritualRepository, purpose: SpiritualPurpose): SpiritualPurpose {
  if (!purpose.label.trim()) throw new SpiritualValidationError('purpose.label não pode ser vazio.');
  repo.savePurpose(purpose);
  return purpose;
}

export function definePractice(repo: SpiritualRepository, def: PracticeDefinition): PracticeDefinition {
  if (!def.intention.trim()) throw new SpiritualValidationError('Uma prática precisa de uma intenção (o "para quê").');
  if (def.purposeId && !repo.getPurpose(def.purposeId)) throw new SpiritualValidationError(`Propósito "${def.purposeId}" não existe.`);
  if (def.frequency?.timesPerWeek !== undefined && (def.frequency.timesPerWeek < 1 || def.frequency.timesPerWeek > 14)) throw new SpiritualValidationError('frequency.timesPerWeek fora de 1-14.');
  if (def.frequency?.days?.some((d) => d < 0 || d > 6)) throw new SpiritualValidationError('frequency.days precisa estar entre 0 e 6.');
  if (def.durationMinutes !== undefined && def.durationMinutes <= 0) throw new SpiritualValidationError('durationMinutes precisa ser positivo.');
  repo.savePracticeDefinition(def);
  return def;
}

export function recordPrayerIntention(repo: SpiritualRepository, intention: PrayerIntention): PrayerIntention {
  if (!intention.content.trim()) throw new SpiritualValidationError('A intenção de oração não pode ser vazia.');
  if (intention.purposeId && !repo.getPurpose(intention.purposeId)) throw new SpiritualValidationError(`Propósito "${intention.purposeId}" não existe.`);
  repo.savePrayerIntention(intention);
  return intention;
}
