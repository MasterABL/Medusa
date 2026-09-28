/**
 * MEDUSA FOUNDATION — Comunicação proativa (seções 16/17/31/39/57)
 *
 * Uma única ProactiveMessage pode aparecer em até 4 canais (Guardian/Hoje/
 * Island/Notificação), cada um com apresentação adaptada — nunca a mesma
 * string repetida 4 vezes (`presentFor()`).
 *
 * "Inteligência não significa spam" (seção 57): `publish()` recusa uma nova
 * mensagem do mesmo (domain, cooldownKey) enquanto o cooldown anterior não
 * expirou, e `groupRecent()` permite que quem for montar a UI sintetize
 * várias mensagens simultâneas de domínios diferentes numa só apresentação,
 * em vez de disparar N avisos separados ao mesmo tempo.
 */

import type { MessageEvidence, ProactiveMessage, SurfaceTarget } from '../types/messaging';
import type { DomainId } from '../types/domain';

const messages: ProactiveMessage[] = [];
const cooldowns = new Map<string, string>(); // `${domain}::${cooldownKey}` -> ISO timestamp
let counter = 0;

function cooldownKeyFor(domain: DomainId, cooldownKey: string): string {
  return `${domain}::${cooldownKey}`;
}

export interface PublishMessageInput {
  domain: DomainId;
  message: string;
  evidence: MessageEvidence;
  priority?: number;
  urgency?: ProactiveMessage['urgency'];
  surfaceTargets: SurfaceTarget[];
  requiresResponse?: boolean;
  expiresAt?: string;
  cooldownKey?: string;
  cooldownMs?: number;
}

/** Devolve a mensagem publicada, ou `null` quando suprimida por cooldown ativo. */
export function publish(input: PublishMessageInput): ProactiveMessage | null {
  const now = new Date();

  if (input.cooldownKey) {
    const key = cooldownKeyFor(input.domain, input.cooldownKey);
    const until = cooldowns.get(key);
    if (until && new Date(until) > now) {
      return null; // ainda em cooldown — não é falha, é o sistema funcionando
    }
  }

  counter += 1;
  const message: ProactiveMessage = {
    id: `msg_${Date.now()}_${counter}`,
    domain: input.domain,
    message: input.message,
    evidence: input.evidence,
    priority: input.priority ?? 0,
    urgency: input.urgency ?? 'normal',
    surfaceTargets: input.surfaceTargets,
    requiresResponse: input.requiresResponse ?? false,
    createdAt: now.toISOString(),
    expiresAt: input.expiresAt,
    cooldownKey: input.cooldownKey,
    cooldownUntil: input.cooldownMs ? new Date(now.getTime() + input.cooldownMs).toISOString() : undefined,
    read: false,
    dismissed: false,
  };

  if (input.cooldownKey && input.cooldownMs) {
    cooldowns.set(cooldownKeyFor(input.domain, input.cooldownKey), message.cooldownUntil!);
  }

  messages.push(message);
  return message;
}

export function markRead(id: string): ProactiveMessage {
  const message = messages.find((m) => m.id === id);
  if (!message) throw new Error(`ProactiveMessage "${id}" não encontrada.`);
  message.read = true;
  return message;
}

export function dismiss(id: string): ProactiveMessage {
  const message = messages.find((m) => m.id === id);
  if (!message) throw new Error(`ProactiveMessage "${id}" não encontrada.`);
  message.dismissed = true;
  return message;
}

export function list(filter?: { domain?: DomainId; surface?: SurfaceTarget; includeDismissed?: boolean }): ProactiveMessage[] {
  return messages.filter(
    (m) =>
      (!filter?.domain || m.domain === filter.domain) &&
      (!filter?.surface || m.surfaceTargets.includes(filter.surface)) &&
      (filter?.includeDismissed || !m.dismissed)
  );
}

/**
 * Agrupa mensagens ativas surgidas dentro de `windowMs` uma da outra — quem
 * monta a UI usa isto para decidir "sintetizar" em vez de empilhar N avisos
 * (seção 57, exemplo: Educação + Corpo + Agenda detectando 3 coisas juntas).
 */
export function groupRecent(windowMs: number, surface?: SurfaceTarget): ProactiveMessage[][] {
  const active = list({ surface })
    .filter((m) => !m.dismissed)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const groups: ProactiveMessage[][] = [];
  for (const message of active) {
    const lastGroup = groups[groups.length - 1];
    const lastMessage = lastGroup?.[lastGroup.length - 1];
    if (
      lastMessage &&
      new Date(message.createdAt).getTime() - new Date(lastMessage.createdAt).getTime() <= windowMs
    ) {
      lastGroup.push(message);
    } else {
      groups.push([message]);
    }
  }
  return groups;
}

/**
 * Adapta a apresentação por canal — nunca repete o texto cru em todo lugar
 * (seção 31/32).
 */
export function presentFor(message: ProactiveMessage, surface: SurfaceTarget): string {
  switch (surface) {
    case 'guardian':
      return `${message.message}\n\nMotivo: ${message.evidence.reason}${
        message.evidence.impact ? `\nImpacto: ${message.evidence.impact}` : ''
      }`;
    case 'hoje':
      return message.message;
    case 'island':
      return message.message.length > 40 ? `${message.message.slice(0, 37)}...` : message.message;
    case 'notification':
      return message.requiresResponse ? `${message.message} Toque para revisar.` : message.message;
    default:
      return message.message;
  }
}

/** Só para testes de contrato. */
export function __resetProactiveMessagesForTests(): void {
  messages.length = 0;
  cooldowns.clear();
  counter = 0;
}
