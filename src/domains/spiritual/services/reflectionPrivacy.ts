/**
 * MEDUSA — Spiritual Domain — Reflection Privacy (seção 26)
 *
 * Separação explícita entre METADADO e CONTEÚDO. Nunca expor `content` numa
 * mensagem de sistema genérica, num evento publicado no Event Bus, ou em
 * qualquer superfície que não seja a própria tela de reflexão do usuário.
 */

import type { SpiritualReflection } from '../model/types';

export interface SpiritualReflectionMetadata {
  id: string;
  createdAt: string;
  visibility: SpiritualReflection['visibility'];
  relatedPracticeId?: string;
  /** Só o TAMANHO do texto — nunca o conteúdo, nem um trecho dele. */
  contentLength: number;
}

export function toMetadata(reflection: SpiritualReflection): SpiritualReflectionMetadata {
  return {
    id: reflection.id,
    createdAt: reflection.createdAt,
    visibility: reflection.visibility,
    relatedPracticeId: reflection.relatedPracticeId,
    contentLength: reflection.content.length,
  };
}
