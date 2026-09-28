/**
 * MEDUSA — Body — serialização (seção 34)
 */

import { deserialize, serialize } from '../shared/serialization';
import { BodyValidationError, validatePlanIntegrity } from './validators';
import type { BodyPlan, BodyProfile, DiagnosticSession } from './model/types';

export const serializePlan = (p: BodyPlan): string => serialize('body.plan', p);
export const deserializePlan = (payload: string): BodyPlan => deserialize<BodyPlan>('body.plan', payload, validatePlanIntegrity);

export const serializeSession = (s: DiagnosticSession): string => serialize('body.diagnosticSession', s);
export const deserializeSession = (payload: string): DiagnosticSession =>
  deserialize<DiagnosticSession>('body.diagnosticSession', payload, (s) => {
    if (!Array.isArray(s.answers)) throw new BodyValidationError('session.answers precisa ser um array.');
    if (!['in_progress', 'completed', 'abandoned'].includes(s.status)) {
      throw new BodyValidationError(`session.status inválido: "${String(s.status)}".`);
    }
  });

export const serializeProfile = (p: BodyProfile): string => serialize('body.profile', p);
export const deserializeProfile = (payload: string): BodyProfile =>
  deserialize<BodyProfile>('body.profile', payload, (p) => {
    // Cada campo do perfil precisa dizer a origem — nunca aceitar dado sem saber se é relatado ou derivado.
    for (const field of ['objectives', 'routineSummary', 'availabilityWindows', 'weeklyFrequency', 'experienceLevel', 'habits', 'limitations', 'preferences'] as const) {
      const value = p[field] as { origin?: string } | undefined;
      if (!value || (value.origin !== 'self_reported' && value.origin !== 'derived')) {
        throw new BodyValidationError(`profile.${field} precisa declarar origin ("self_reported" | "derived").`);
      }
    }
  });
