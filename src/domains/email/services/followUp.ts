/**
 * MEDUSA — E-mail — Acompanhamento (sem spam)
 *
 *   recebido "pode me enviar até amanhã?" → tarefa → passou do prazo e não foi feita
 *     → candidato de acompanhamento (uma vez)
 *   enviado por mim, pedindo algo → 3 dias sem resposta → sugerir cobrar (uma vez)
 *
 * Isto só PREPARA candidatos (L2, SUGGEST_FOLLOW_UP). Não envia nada. A trava contra spam é
 * explícita: um acompanhamento por thread e motivo dentro da janela (`cooldownDays`), e
 * nunca mais que `maxPerThread` no total.
 */

import type { EmailThread } from '../model/types';
import type { Task } from '../../tasks/model/types';
import type { RelationStore } from '../../../foundation/relations/graph';
import { emailRef } from './actions';

export type FollowUpReason = 'prazo_vencido_sem_conclusao' | 'aguardando_resposta';

export interface FollowUpCandidate {
  id: string;
  threadId: string;
  messageId: string;
  reason: FollowUpReason;
  title: string;
  since: string;
  taskId?: string;
  guardianActionType: 'SUGGEST_FOLLOW_UP';
}

export interface FollowUpLedgerEntry {
  key: string;
  at: string;
}

export interface FollowUpOptions {
  now: string;
  waitingDays?: number;
  cooldownDays?: number;
  maxPerThread?: number;
  /** O que já foi sugerido antes (persistível). */
  ledger?: FollowUpLedgerEntry[];
}

const DAY = 86_400_000;
const ms = (iso: string) => Date.parse(iso.length === 10 ? `${iso}T23:59:59` : iso);

export function detectFollowUps(threads: EmailThread[], tasks: Task[], relations: RelationStore, opts: FollowUpOptions): { candidates: FollowUpCandidate[]; ledger: FollowUpLedgerEntry[] } {
  const now = Date.parse(opts.now);
  const waiting = (opts.waitingDays ?? 3) * DAY;
  const cooldown = (opts.cooldownDays ?? 3) * DAY;
  const max = opts.maxPerThread ?? 2;
  const ledger = [...(opts.ledger ?? [])];
  const out: FollowUpCandidate[] = [];

  const allowed = (threadId: string, reason: FollowUpReason) => {
    const key = `${threadId}|${reason}`;
    const mine = ledger.filter((l) => l.key.startsWith(`${threadId}|`));
    if (mine.length >= max) return false;
    const last = ledger.filter((l) => l.key === key).map((l) => Date.parse(l.at)).sort((a, b) => b - a)[0];
    return last === undefined || now - last >= cooldown;
  };
  const record = (threadId: string, reason: FollowUpReason) => ledger.push({ key: `${threadId}|${reason}`, at: opts.now });

  for (const t of threads) {
    const msgs = [...t.messages].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
    // 1) tarefa derivada de e-mail desta thread, vencida e não concluída
    for (const m of msgs.filter((x) => x.direction === 'received')) {
      const linked = relations.findLinked(emailRef(m.id), 'task', ['derived_from']);
      const task = linked && tasks.find((x) => x.id === linked.id);
      if (!task || !task.dueAt || task.status === 'done' || task.status === 'cancelled') continue;
      if (ms(task.dueAt) >= now || !allowed(t.threadId, 'prazo_vencido_sem_conclusao')) continue;
      out.push({ id: `followup:${t.threadId}:prazo:${m.id}`, threadId: t.threadId, messageId: m.id, reason: 'prazo_vencido_sem_conclusao', title: `Prazo passou: ${task.title}`, since: task.dueAt, taskId: task.id, guardianActionType: 'SUGGEST_FOLLOW_UP' });
      record(t.threadId, 'prazo_vencido_sem_conclusao');
      break;
    }
    // 2) última mensagem é minha, pedindo algo, e ninguém respondeu
    const last = msgs[msgs.length - 1];
    if (last && last.direction === 'sent' && /\?|aguardo|poderia|pode me|consegue/i.test(`${last.subject} ${last.snippet}`)) {
      if (now - Date.parse(last.receivedAt) >= waiting && allowed(t.threadId, 'aguardando_resposta')) {
        out.push({ id: `followup:${t.threadId}:resposta:${last.id}`, threadId: t.threadId, messageId: last.id, reason: 'aguardando_resposta', title: `Sem resposta: ${t.subject}`, since: last.receivedAt, guardianActionType: 'SUGGEST_FOLLOW_UP' });
        record(t.threadId, 'aguardando_resposta');
      }
    }
  }
  return { candidates: out, ledger };
}
