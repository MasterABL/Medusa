/**
 * MEDUSA — E-mail — Provedores
 *
 * Contrato único para Gmail (hoje), Outlook (futuro) e fixture de demonstração.
 *
 *   Operações seguras:   listThreads, getThread, getMessage, search,
 *                        markRead, markUnread, archive, star
 *   Operações sensíveis: sendReply, forward, delete — separadas de propósito e só
 *                        aceitas com o id de uma ação do Guardian JÁ AUTORIZADA, do tipo
 *                        certo. Não existe atalho.
 *
 * Gmail real: BLOQUEADO. O Medusa não tem backend nem OAuth do Google; tokens nunca vão
 * para o cliente. O que está pronto é o MAPEAMENTO da resposta da API (formato metadata —
 * assunto, remetente, data, snippet, rótulos, nomes de anexo; sem corpo) para o contrato,
 * testado com o formato documentado da API.
 */

import type { ProviderState } from '../../../foundation/providers/state';
import { blockedProviderState } from '../../../foundation/providers/state';
import { getAction } from '../../../foundation/actionBus';
import type { EmailAddress, EmailMessage, EmailThread } from '../model/types';
import { groupIntoThreads } from '../services/pipeline';

export interface ListQuery {
  /** Busca no formato do provedor (Gmail: "is:unread newer_than:7d"). */
  query?: string;
  labelIds?: string[];
  maxResults?: number;
  pageToken?: string;
}

export interface Page<T> {
  items: T[];
  nextPageToken?: string;
}

export interface EmailProvider {
  readonly kind: EmailMessage['source']['provider'];
  state(): ProviderState;
  listThreads(q?: ListQuery): Promise<Page<EmailThread>>;
  getThread(threadId: string): Promise<EmailThread | undefined>;
  getMessage(messageId: string): Promise<EmailMessage | undefined>;
  search(query: string, max?: number): Promise<EmailMessage[]>;
  markRead(messageId: string): Promise<void>;
  markUnread(messageId: string): Promise<void>;
  archive(messageId: string): Promise<void>;
  star(messageId: string, starred: boolean): Promise<void>;
}

export interface EmailSensitiveOperations {
  sendReply(approvedActionId: string, messageId: string, body: string): Promise<void>;
  forward(approvedActionId: string, messageId: string, to: EmailAddress[]): Promise<void>;
  delete(approvedActionId: string, messageId: string): Promise<void>;
}

export class SensitiveActionNotApprovedError extends Error {
  constructor(readonly actionId: string, readonly reason: string) {
    super(`Operação sensível recusada (${actionId}): ${reason}`);
    this.name = 'SensitiveActionNotApprovedError';
  }
}

export class ProviderUnavailableError extends Error {
  constructor(readonly state: ProviderState) {
    super(`${state.provider} indisponível (${state.status}): ${state.detail ?? ''}`.trim());
    this.name = 'ProviderUnavailableError';
  }
}

/** Confere no Action Bus que a ação existe, é do tipo certo, do domínio e-mail, e foi autorizada. */
export function assertApproved(actionId: string, expectedType: string, messageId: string): void {
  const a = getAction(actionId);
  if (!a) throw new SensitiveActionNotApprovedError(actionId, 'ação inexistente');
  if (a.domain !== 'email' || a.type !== expectedType) throw new SensitiveActionNotApprovedError(actionId, `ação é ${a.domain}/${a.type}, esperado email/${expectedType}`);
  if ((a.payload as { messageId?: string })?.messageId !== messageId) throw new SensitiveActionNotApprovedError(actionId, 'ação aprovada para outra mensagem');
  if (a.status !== 'AUTHORIZED') throw new SensitiveActionNotApprovedError(actionId, `ação não autorizada (status: ${a.status})`);
}

/**
 * Fixture de DEMONSTRAÇÃO. Estado sempre `isFixture: true` e mensagens com
 * `source.origin = 'fixture'` — nunca podem ser apresentadas como caixa real. As
 * operações sensíveis não enviam nada: só registram numa caixa de saída falsa, e só
 * depois da aprovação.
 */
export function createFixtureEmailProvider(messages: EmailMessage[]) {
  const store = new Map<string, EmailMessage>(messages.map((m) => [m.id, { ...m, source: { ...m.source, provider: 'fixture', origin: 'fixture' } }]));
  const outbox: Array<{ op: 'reply' | 'forward' | 'delete'; messageId: string; actionId: string }> = [];
  const patch = (id: string, p: Partial<EmailMessage>) => {
    const m = store.get(id);
    if (m) store.set(id, { ...m, ...p });
  };
  const provider: EmailProvider & EmailSensitiveOperations & { outbox: typeof outbox } = {
    kind: 'fixture',
    outbox,
    state: () => ({ provider: 'fixture', status: 'connected', isFixture: true, detail: 'dados de demonstração' }),
    listThreads: async (q) => {
      const all = groupIntoThreads(Array.from(store.values()).filter((m) => !q?.labelIds || q.labelIds.every((l) => m.labels.includes(l))));
      const sorted = all.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
      return { items: sorted.slice(0, q?.maxResults ?? 50) };
    },
    getThread: async (id) => groupIntoThreads(Array.from(store.values()).filter((m) => m.threadId === id))[0],
    getMessage: async (id) => store.get(id),
    search: async (query, max = 20) => {
      const q = query.toLowerCase();
      return Array.from(store.values()).filter((m) => `${m.subject} ${m.snippet} ${m.sender.address}`.toLowerCase().includes(q)).slice(0, max);
    },
    markRead: async (id) => patch(id, { isRead: true }),
    markUnread: async (id) => patch(id, { isRead: false }),
    archive: async (id) => patch(id, { labels: (store.get(id)?.labels ?? []).filter((l) => l !== 'INBOX') }),
    star: async (id, starred) => patch(id, { isStarred: starred }),
    sendReply: async (actionId, id) => {
      assertApproved(actionId, 'SEND_EMAIL_REPLY', id);
      outbox.push({ op: 'reply', messageId: id, actionId });
    },
    forward: async (actionId, id) => {
      assertApproved(actionId, 'FORWARD_EMAIL', id);
      outbox.push({ op: 'forward', messageId: id, actionId });
    },
    delete: async (actionId, id) => {
      assertApproved(actionId, 'DELETE_EMAIL', id);
      store.delete(id);
      outbox.push({ op: 'delete', messageId: id, actionId });
    },
  };
  return provider;
}

/** Provedor declarado mas não conectado: toda chamada falha alto com o estado. */
export function createUnavailableEmailProvider(kind: 'gmail' | 'outlook', state: ProviderState): EmailProvider & EmailSensitiveOperations {
  const fail = async (): Promise<never> => {
    throw new ProviderUnavailableError(state);
  };
  return { kind, state: () => state, listThreads: fail, getThread: fail, getMessage: fail, search: fail, markRead: fail, markUnread: fail, archive: fail, star: fail, sendReply: fail, forward: fail, delete: fail };
}

export const GMAIL_READ_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
export const GMAIL_MODIFY_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';

export function gmailProviderState(): ProviderState {
  return { ...blockedProviderState('gmail', 'o Medusa não tem backend nem OAuth do Google conectados; tokens nunca vão para o cliente'), missingScopes: [GMAIL_READ_SCOPE] };
}

// ===== Mapeamento da API do Gmail (users.messages.get?format=metadata) =====

export interface GmailApiMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    parts?: GmailApiPart[];
  };
}

export interface GmailApiPart {
  filename?: string;
  mimeType?: string;
  body?: { attachmentId?: string; size?: number };
  parts?: GmailApiPart[];
}

export function parseAddress(raw: string): EmailAddress {
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || undefined, address: m[2].trim().toLowerCase() };
  return { address: raw.trim().toLowerCase() };
}

const splitAddresses = (raw: string | undefined) => (raw ? raw.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(parseAddress).filter((a) => a.address) : []);

function localIsoFromMs(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Resposta `format=metadata` do Gmail → EmailMessage. Só metadados e snippet; nomes de
 * anexo vêm das partes, conteúdo nunca. `myAddress` decide se a mensagem foi enviada.
 */
export function fromGmailApiMessage(api: GmailApiMessage, opts: { myAddress?: string; account?: string } = {}): EmailMessage {
  const header = (n: string) => api.payload?.headers?.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value;
  const labels = api.labelIds ?? [];
  const sender = parseAddress(header('From') ?? 'desconhecido');
  const attachments: EmailMessage['attachments'] = [];
  const walk = (parts: GmailApiPart[] | undefined) => {
    for (const p of parts ?? []) {
      if (p.filename) attachments.push({ id: p.body?.attachmentId, filename: p.filename, mimeType: p.mimeType, sizeBytes: p.body?.size });
      walk(p.parts);
    }
  };
  walk(api.payload?.parts);
  const dateHeader = header('Date');
  const ms = api.internalDate ? Number(api.internalDate) : dateHeader ? Date.parse(dateHeader) : NaN;
  const sent = labels.includes('SENT') || (!!opts.myAddress && sender.address === opts.myAddress.toLowerCase());
  return {
    id: api.id,
    threadId: api.threadId,
    source: { provider: 'gmail', externalId: api.id, account: opts.account, origin: 'real' },
    direction: sent ? 'sent' : 'received',
    sender,
    recipients: [...splitAddresses(header('To')), ...splitAddresses(header('Cc'))],
    subject: header('Subject') ?? '(sem assunto)',
    snippet: decodeEntities(api.snippet ?? ''),
    receivedAt: Number.isFinite(ms) ? localIsoFromMs(ms) : localIsoFromMs(0),
    isRead: !labels.includes('UNREAD'),
    isStarred: labels.includes('STARRED'),
    labels,
    attachments,
  };
}

function decodeEntities(s: string): string {
  return s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
