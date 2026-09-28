/**
 * MEDUSA — Spiritual — Fronteira de privacidade
 *
 * Reflexões, orações e itens de estudo do usuário são PRIVADOS. Este arquivo:
 *  - lista os itens privados (só para auditoria interna, ex.: Guardian);
 *  - abre um conteúdo privado registrando o acesso (nunca o conteúdo acessado).
 */

import type { SpiritualRepository } from '../repository/types';

export interface PrivateItem {
  id: string;
  kind: 'reflection' | 'prayer' | 'study_item' | 'practice_intention';
  content: string;
}

export function collectPrivateItems(repo: SpiritualRepository): PrivateItem[] {
  return [
    ...repo.listReflections().map((r): PrivateItem => ({ id: r.id, kind: 'reflection', content: r.content })),
    ...repo.listPrayerIntentions().map((p): PrivateItem => ({ id: p.id, kind: 'prayer', content: p.content })),
    ...repo.listStudies().flatMap((s) => s.items.filter((i) => i.private).map((i): PrivateItem => ({ id: `${s.id}/${i.id}`, kind: 'study_item', content: i.content }))),
    ...repo.listPracticeDefinitions().map((d): PrivateItem => ({ id: d.id, kind: 'practice_intention', content: d.intention })),
  ];
}

/** Único caminho para ler conteúdo privado com registro de acesso. */
export function openPrivateContent(
  repo: SpiritualRepository,
  input: { scope: 'reflection' | 'prayer'; id: string; accessor: string; purpose: string; now: Date }
): string | undefined {
  const content = input.scope === 'reflection' ? repo.getReflection(input.id)?.content : repo.getPrayerIntention(input.id)?.content;
  repo.appendSensitiveAccess({ at: input.now.toISOString(), accessor: input.accessor, scope: input.scope, targetId: input.id, purpose: input.purpose });
  return content;
}

export function toPrayerMetadata(repo: SpiritualRepository): Array<{ id: string; createdAt: string; status: string; purposeId?: string; contentLength: number }> {
  return repo.listPrayerIntentions().map((p) => ({ id: p.id, createdAt: p.createdAt, status: p.status, purposeId: p.purposeId, contentLength: p.content.length }));
}
