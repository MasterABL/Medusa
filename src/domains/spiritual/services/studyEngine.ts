/**
 * MEDUSA — Spiritual — Motor de estudo bíblico
 *
 * Mantém separados TEXTO bíblico, explicação de IA e reflexão pessoal. Os
 * invariantes são validados em `addStudyItem`: um item que mistura origens é
 * rejeitado, não "consertado".
 */

import { formatReference, validateReference } from '../model/bible';
import type { BibleReference, Canon } from '../model/bible';
import type { Study, StudyItem, StudyItemKind } from '../model/study';

export class StudyError extends Error {}

export function startStudy(input: { id: string; reference: BibleReference; topic?: string; question?: string; purposeId?: string; canon?: Canon; createdAt: string }): Study {
  validateReference(input.reference, input.canon ?? 'standard66');
  return { id: input.id, reference: input.reference, topic: input.topic, question: input.question, purposeId: input.purposeId, items: [], status: 'open', createdAt: input.createdAt };
}

export function validateStudyItem(item: StudyItem, canon: Canon = 'standard66'): void {
  if (!item.content?.trim()) throw new StudyError('Item de estudo sem conteúdo.');
  switch (item.kind) {
    case 'scripture_text':
      if (item.origin !== 'scripture') throw new StudyError('Texto bíblico precisa ter origin "scripture" — nunca misturado com explicação ou reflexão.');
      if (!item.translationId) throw new StudyError('Texto bíblico precisa declarar a tradução (translationId).');
      if (!item.reference) throw new StudyError('Texto bíblico precisa da referência.');
      validateReference(item.reference, canon);
      break;
    case 'ai_explanation':
      if (item.origin !== 'ai') throw new StudyError('Explicação de IA precisa ter origin "ai".');
      if (!item.aiDisclosure?.generatedByAi || !item.aiDisclosure.isNotSpiritualAuthority) throw new StudyError('Conteúdo de IA precisa carregar a marca de que é gerado por IA e não é autoridade espiritual.');
      break;
    case 'cross_reference':
      if (!item.reference) throw new StudyError('Referência cruzada precisa de uma referência bíblica.');
      validateReference(item.reference, canon);
      break;
    case 'user_reflection':
      if (item.origin !== 'user') throw new StudyError('Reflexão pessoal precisa ter origin "user".');
      if (!item.private) throw new StudyError('Reflexão pessoal é sempre privada.');
      break;
    case 'interpretation':
      if (item.origin !== 'ai' && item.origin !== 'user') throw new StudyError('Interpretação precisa declarar se é da IA ou do usuário.');
      if (item.origin === 'ai' && !item.aiDisclosure?.generatedByAi) throw new StudyError('Interpretação de IA precisa da marca de IA.');
      if (item.origin === 'user' && !item.private) throw new StudyError('Interpretação do usuário é privada.');
      break;
    case 'conclusion':
      if (item.origin === 'user' && !item.private) throw new StudyError('Conclusão do usuário é privada.');
      break;
    default:
      break;
  }
  if (item.origin === 'user' && !item.private) throw new StudyError('Conteúdo do usuário nunca é público.');
  if (item.origin === 'scripture' && item.kind !== 'scripture_text') throw new StudyError('origin "scripture" é exclusivo de texto bíblico.');
}

export function addStudyItem(study: Study, item: StudyItem, canon: Canon = 'standard66'): Study {
  if (study.status === 'concluded') throw new StudyError('Estudo concluído não recebe novos itens.');
  validateStudyItem(item, canon);
  if (study.items.some((i) => i.id === item.id)) throw new StudyError(`Item "${item.id}" já existe.`);
  return { ...study, items: [...study.items, item] };
}

export function concludeStudy(study: Study, input: { conclusion: StudyItem; nextExploration?: StudyItem; concludedAt: string }): Study {
  if (input.conclusion.kind !== 'conclusion') throw new StudyError('A conclusão precisa ser um item do tipo "conclusion".');
  if (input.nextExploration && input.nextExploration.kind !== 'next_exploration') throw new StudyError('A próxima exploração precisa ser do tipo "next_exploration".');
  let next = addStudyItem(study, input.conclusion);
  if (input.nextExploration) next = addStudyItem(next, input.nextExploration);
  return { ...next, status: 'concluded', concludedAt: input.concludedAt };
}

/** Perguntas de estudo por TEMPLATE (observação → interpretação → aplicação). Determinístico, não é IA. */
export function studyQuestionTemplates(reference: BibleReference): Array<{ stage: 'observacao' | 'interpretacao' | 'aplicacao'; question: string; source: 'template' }> {
  const ref = formatReference(reference, { names: true });
  return [
    { stage: 'observacao', question: `O que ${ref} diz? Quem fala, para quem e em que situação?`, source: 'template' },
    { stage: 'observacao', question: `Que palavras ou ideias se repetem em ${ref}?`, source: 'template' },
    { stage: 'interpretacao', question: `Que sentido ${ref} tinha para os primeiros leitores?`, source: 'template' },
    { stage: 'interpretacao', question: `Que outras passagens ajudam a entender ${ref}? Como a sua tradição costuma lê-la?`, source: 'template' },
    { stage: 'aplicacao', question: `O que ${ref} muda na forma como você pensa ou age hoje?`, source: 'template' },
  ];
}

const PUBLIC_KINDS: StudyItemKind[] = ['scripture_text', 'context', 'question', 'cross_reference', 'ai_explanation', 'next_exploration'];

/** Resumo SEM conteúdo do usuário — o único formato que sai do domínio por canais genéricos. */
export function toStudySummary(study: Study): {
  id: string;
  reference: BibleReference;
  topic?: string;
  status: Study['status'];
  itemCounts: Partial<Record<StudyItemKind, number>>;
  hasConclusion: boolean;
  publicItemCount: number;
} {
  const itemCounts: Partial<Record<StudyItemKind, number>> = {};
  for (const item of study.items) itemCounts[item.kind] = (itemCounts[item.kind] ?? 0) + 1;
  return {
    id: study.id,
    reference: study.reference,
    topic: study.topic,
    status: study.status,
    itemCounts,
    hasConclusion: study.items.some((i) => i.kind === 'conclusion'),
    publicItemCount: study.items.filter((i) => !i.private && PUBLIC_KINDS.includes(i.kind)).length,
  };
}
