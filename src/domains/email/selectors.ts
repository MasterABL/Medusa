/**
 * MEDUSA — E-mail — Seletores e modelo de consulta (sem UI)
 *
 * Filtros que a futura aba vai oferecer, como dados: cada filtro é uma função pura sobre
 * (thread, análises). A aba consome `selectEmailInbox`, que devolve DataState — Gmail
 * desconectado aparece como "precisa de permissão", não como caixa vazia.
 */

import type { DataState } from '../../foundation/types/dataState';
import * as DS from '../../foundation/dataState';
import type { ProviderState } from '../../foundation/providers/state';
import { providerStateToDataState } from '../../foundation/providers/state';
import type { EmailAnalysis, EmailThread } from './model/types';
import type { ThreadAnalysis } from './services/pipeline';

export type EmailFilterId =
  | 'todos'
  | 'nao_lidos'
  | 'importantes'
  | 'preciso_agir'
  | 'aguardando_resposta'
  | 'com_prazo'
  | 'com_evento'
  | 'financeiro'
  | 'faculdade'
  | 'trabalho'
  | 'saude';

export interface EmailFilterDef {
  id: EmailFilterId;
  label: string;
  matches(t: EmailThread, analyses: EmailAnalysis[]): boolean;
}

const anyA = (as: EmailAnalysis[], f: (a: EmailAnalysis) => boolean) => as.some(f);

export const EMAIL_FILTERS: readonly EmailFilterDef[] = [
  { id: 'todos', label: 'Todos', matches: (t) => t.status !== 'archived' },
  { id: 'nao_lidos', label: 'Não lidos', matches: (t) => t.unreadCount > 0 },
  { id: 'importantes', label: 'Importantes', matches: (t, as) => anyA(as, (a) => a.readingStates.includes('important')) },
  { id: 'preciso_agir', label: 'Preciso agir', matches: (t, as) => t.status === 'needs_action' || anyA(as, (a) => a.readingStates.includes('actionable')) },
  { id: 'aguardando_resposta', label: 'Aguardando resposta', matches: (t) => t.status === 'waiting_reply' },
  { id: 'com_prazo', label: 'Com prazo', matches: (t, as) => anyA(as, (a) => a.candidates.some((c) => c.kind === 'deadline' && c.status !== 'dismissed')) },
  { id: 'com_evento', label: 'Com evento', matches: (t, as) => anyA(as, (a) => a.candidates.some((c) => c.kind === 'calendar_event' && c.status !== 'dismissed')) },
  { id: 'financeiro', label: 'Financeiro', matches: (t, as) => anyA(as, (a) => a.classification.domain === 'finance') },
  { id: 'faculdade', label: 'Faculdade', matches: (t, as) => anyA(as, (a) => a.classification.category === 'academic') },
  { id: 'trabalho', label: 'Trabalho', matches: (t, as) => anyA(as, (a) => a.classification.domain === 'work') },
  { id: 'saude', label: 'Saúde', matches: (t, as) => anyA(as, (a) => a.classification.category === 'medical') },
];

const RANK = { critical: 0, high: 1, medium: 2, low: 3 } as const;

export interface EmailInboxRow {
  thread: EmailThread;
  analyses: EmailAnalysis[];
  /** Por que esta conversa importa — a primeira razão da mensagem mais importante. */
  why: string;
  candidateCount: number;
}

export interface EmailInbox {
  filter: EmailFilterId;
  rows: EmailInboxRow[];
  counts: Record<EmailFilterId, number>;
}

export function filterThreads(items: ThreadAnalysis[], filter: EmailFilterId): ThreadAnalysis[] {
  const def = EMAIL_FILTERS.find((f) => f.id === filter)!;
  return items.filter((x) => def.matches(x.thread, x.analyses));
}

export function selectEmailInbox(provider: ProviderState, items: ThreadAnalysis[] | undefined, filter: EmailFilterId, now: string): DataState<EmailInbox> {
  if (provider.status !== 'connected' && provider.status !== 'partial') return providerStateToDataState<EmailInbox>(provider, undefined, now);
  if (!items) return DS.loading();
  const counts = Object.fromEntries(EMAIL_FILTERS.map((f) => [f.id, filterThreads(items, f.id).length])) as Record<EmailFilterId, number>;
  const rows = filterThreads(items, filter)
    .map((x): EmailInboxRow => {
      const top = [...x.analyses].sort((a, b) => RANK[a.classification.importance] - RANK[b.classification.importance])[0];
      return { thread: x.thread, analyses: x.analyses, why: top?.classification.reasons[0] ?? '', candidateCount: x.analyses.reduce((s, a) => s + a.candidates.filter((c) => c.status === 'proposed').length, 0) };
    })
    .sort((a, b) => RANK[a.thread.importance ?? 'low'] - RANK[b.thread.importance ?? 'low'] || b.thread.lastMessageAt.localeCompare(a.thread.lastMessageAt));
  const inbox: EmailInbox = { filter, rows, counts };
  if (items.length === 0) return DS.empty('Nenhum e-mail.');
  return providerStateToDataState(provider, inbox, now);
}
