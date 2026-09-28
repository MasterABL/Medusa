/**
 * MEDUSA — Spiritual Domain — Use Case: criar reflexão (seção 25/26)
 *
 * Entrada de dado privada — não passa pelo Guardian. O evento publicado
 * carrega só metadado (seção 26): nenhum consumidor do Event Bus jamais vê
 * o texto da reflexão por essa via.
 */

import { publish as publishEvent } from '../../../foundation/eventBus';
import { SPIRITUAL_EVENT_TYPES } from '../events/types';
import { toMetadata } from '../services/reflectionPrivacy';
import { validateReflection } from '../validators';
import type { SpiritualReflection } from '../model/types';
import type { SpiritualRepository } from '../repository/types';

export function createReflection(repository: SpiritualRepository, reflection: SpiritualReflection): SpiritualReflection {
  validateReflection(reflection);
  repository.saveReflection(reflection);

  const metadata = toMetadata(reflection);
  publishEvent({
    domain: 'spiritual',
    type: SPIRITUAL_EVENT_TYPES.REFLECTION_CREATED,
    payload: { reflectionId: metadata.id, contentLength: metadata.contentLength },
  });

  return reflection;
}
