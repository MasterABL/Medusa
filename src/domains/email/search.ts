/**
 * MEDUSA — E-mail → documentos da busca global (sem corpo, só assunto + snippet curto).
 */
import type { SearchDocument } from '../../foundation/search/types';
import type { Task } from '../tasks/model/types';
import type { Project } from '../projects/model/types';
import type { CanonicalEvent } from '../../foundation/events/canonical';
import type { EmailAnalysis, EmailMessage, EmailThread } from './model/types';

export function emailToSearchDocument(m: EmailMessage, a?: EmailAnalysis): SearchDocument {
  return { ref: { kind: 'email', id: m.id }, title: m.subject, preview: m.snippet.slice(0, 160), domain: a?.classification.domain, at: m.receivedAt, keywords: [m.sender.name ?? '', m.sender.address, ...(a?.extraction.discipline ? [a.extraction.discipline.value.name] : [])].filter(Boolean) };
}
export function threadToSearchDocument(t: EmailThread): SearchDocument {
  return { ref: { kind: 'email_thread', id: t.threadId }, title: t.subject, at: t.lastMessageAt, keywords: t.participants.map((p) => p.name ?? p.address) };
}
export function taskToSearchDocument(t: Task): SearchDocument {
  return { ref: { kind: 'task', id: t.id }, title: t.title, preview: t.description?.slice(0, 160), domain: t.domain, at: t.dueAt };
}
export function projectToSearchDocument(p: Project): SearchDocument {
  return { ref: { kind: 'project', id: p.id }, title: p.title, preview: p.objective?.slice(0, 160), at: p.updatedAt };
}
export function eventToSearchDocument(e: CanonicalEvent): SearchDocument {
  return { ref: { kind: 'event', id: e.id }, title: e.title, preview: e.location, domain: e.domain, at: e.start };
}
export function attachmentDocuments(m: EmailMessage): SearchDocument[] {
  return m.attachments.map((x, i) => ({ ref: { kind: 'document' as const, id: `${m.id}:att:${x.id ?? i}` }, title: x.filename, preview: `anexo de "${m.subject}"`.slice(0, 160), at: m.receivedAt }));
}
