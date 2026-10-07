/**
 * Harness dos testes de integração do runtime do Personal OS.
 * Relógio controlável, armazenamento em memória compartilhável entre "sessões"
 * (simula recarregar a página: novo runtime + estado de módulo zerado + mesmo storage).
 */
import { resetAll } from '../domains/_helpers';
import { createMemoryStorageAdapter } from '../../../src/foundation/persistence/storage';
import type { StorageAdapter } from '../../../src/foundation/persistence/storage';
import { createPersonalOS } from '../../../src/foundation/runtime/personalOS';
import type { AgendaWriter, PersonalOS } from '../../../src/foundation/runtime/personalOS';
import type { AgendaItem, AgendaDomain } from '../../../src/types/agenda';
import type { NotificationPayload, WebNotificationEnv } from '../../../src/foundation/reminders/channels';
import { __resetExecutorsForTests } from '../../../src/foundation/actions/executors';

export const DAY = '2026-10-06'; // terça
export const WED = '2026-10-07';

export class Clock {
  constructor(public t: Date) {}
  set(iso: string) {
    this.t = new Date(`${iso}`);
  }
  now = () => this.t;
}

export interface Session {
  os: PersonalOS;
  clock: Clock;
  storage: StorageAdapter;
  island: NotificationPayload[];
  web: string[];
  agenda: AgendaItem[];
  writer: AgendaWriter;
  /** Re-sincroniza a Agenda (o que o AgendaContext faz a cada mudança). */
  syncAgenda(): void;
}

export async function session(opts: { storage?: StorageAdapter; at?: string; agenda?: AgendaItem[]; permission?: WebNotificationEnv['permission'] } = {}): Promise<Session> {
  resetAll();
  __resetExecutorsForTests();
  const storage = opts.storage ?? createMemoryStorageAdapter();
  const clock = new Clock(new Date(opts.at ?? `${DAY}T14:00:00`));
  const island: NotificationPayload[] = [];
  const web: string[] = [];
  const os = createPersonalOS({
    storage,
    clock: clock.now,
    autoFlushMs: 0,
    webNotificationEnv: () => ({ supported: true, permission: opts.permission ?? 'granted', show: (title) => web.push(title) }),
  });
  const agenda: AgendaItem[] = [...(opts.agenda ?? [])];
  const s: Session = {
    os,
    clock,
    storage,
    island,
    web,
    agenda,
    writer: {
      add: (item) => {
        agenda.push(item);
        s.syncAgenda();
      },
      has: (id) => agenda.some((i) => i.id === id),
    },
    syncAgenda: () => os.setAgenda([...agenda], s.writer),
  };
  await os.hydrate();
  os.setIslandSink((p) => island.push(p));
  s.syncAgenda();
  return s;
}

export function item(id: string, title: string, start: string, end: string, o: Partial<AgendaItem> = {}): AgendaItem {
  return {
    id,
    title,
    kind: 'event',
    domain: 'personal' as AgendaDomain,
    categoryId: 'c',
    colorId: 'x',
    date: DAY,
    startTime: start,
    endTime: end,
    source: { sourceType: 'manual' },
    status: 'scheduled',
    createdAt: `${DAY}T00:00:00`,
    updatedAt: `${DAY}T00:00:00`,
    ...o,
  };
}
