/**
 * MEDUSA — Spiritual — serialização (seção 34)
 *
 * Reflexão serializada carrega o conteúdo (é o dado do próprio usuário), então
 * este arquivo só deve ser usado por um adapter de persistência PRIVADO — nunca
 * por um canal genérico de sistema (seção 26).
 */

import { deserialize, serialize } from '../shared/serialization';
import { validateReflection, validatePractice } from './validators';
import type { SpiritualPractice, SpiritualReflection } from './model/types';

export const serializePractice = (p: SpiritualPractice): string => serialize('spiritual.practice', p);
export const deserializePractice = (payload: string): SpiritualPractice => deserialize<SpiritualPractice>('spiritual.practice', payload, validatePractice);

export const serializeReflection = (r: SpiritualReflection): string => serialize('spiritual.reflection', r);
export const deserializeReflection = (payload: string): SpiritualReflection => deserialize<SpiritualReflection>('spiritual.reflection', payload, validateReflection);
