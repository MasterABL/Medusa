/**
 * MEDUSA PERSONAL OS — Persistência: StorageAdapter → PersistenceAdapter → Repository/Engine.
 * Tudo em memória ou com um localStorage falso injetado: nenhum backend real é tocado.
 */
import { makeChecker, resetAll } from '../domains/_helpers';
import { DAY, agendaItem, task, project } from './fixtures';
import {
  createMemoryStorageAdapter, createLocalStorageAdapter, createUnavailableStorageAdapter, StorageUnavailableError,
} from '../../../src/foundation/persistence/storage';
import type { KeyValueStore } from '../../../src/foundation/persistence/storage';
import { createSnapshotPersistence, bindRepositoryPersistence, bindStatePersistence, createInMemoryRepository } from '../../../src/foundation/persistence/snapshot';
import {
  createTaskPersistence, createProjectPersistence, createReminderPersistence, createContextEventLog, snapshotEventHistory, exportActionHistory, PERSISTENCE_KEYS, PERSISTENCE_MATRIX,
} from '../../../src/foundation/persistence/stores';
import { createInMemoryTaskRepository } from '../../../src/domains/tasks/repository/types';
import { createInMemoryProjectRepository } from '../../../src/domains/projects/repository/types';
import { buildEventContexts } from '../../../src/foundation/context/eventContext';
import { createReminderEngine } from '../../../src/foundation/reminders/engine';
import { createChannelRegistry, createDynamicIslandChannel } from '../../../src/foundation/reminders/channels';
import type { NotificationPayload } from '../../../src/foundation/reminders/channels';
import { publish } from '../../../src/foundation/eventBus';
import { submitThroughGuardian } from '../../../src/foundation/actions/submit';

const at = (hhmm: string) => `${DAY}T${hhmm}:00`;

function fakeLocalStorage(): KeyValueStore & { dump: Map<string, string> } {
  const m = new Map<string, string>();
  return {
    dump: m,
    get length() { return m.size; },
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    key: (i) => Array.from(m.keys())[i] ?? null,
  };
}

function engineWith(island: NotificationPayload[]) {
  return createReminderEngine({
    channels: createChannelRegistry([createDynamicIslandChannel((p) => island.push(p))]),
    policyFor: () => ({ id: 'p', offsetsMinutes: [5], channels: ['dynamic_island'], minGapMs: 60_000, requiresAcknowledgement: true }),
  });
}

export async function run(): Promise<{ total: number; fails: number }> {
  const { check, result } = makeChecker('persistence');

  // ===== StorageAdapter =====
  {
    const mem = createMemoryStorageAdapter();
    await mem.set('a/1', 'x');
    await mem.set('b/1', 'y');
    check('1.1: memória grava, lê e lista por prefixo', (await mem.get('a/1')) === 'x' && (await mem.keys('a/')).join() === 'a/1');

    const fake = fakeLocalStorage();
    const ls = createLocalStorageAdapter({ store: fake, namespace: 'medusa' });
    await ls.set('personal-os/tasks', '[]');
    check('1.2: localStorage usa namespace e não vaza a chave crua', fake.dump.has('medusa:personal-os/tasks') && (await ls.keys()).join() === 'personal-os/tasks');

    const none = createLocalStorageAdapter({ store: null });
    let threw = false;
    try { await none.set('x', '1'); } catch (e) { threw = e instanceof StorageUnavailableError; }
    check('1.3: sem localStorage (servidor/modo privado) → unavailable e gravar falha alto, nunca finge', none.availability().status === 'unavailable' && threw);

    const supa = createUnavailableStorageAdapter('supabase', 'Medusa sem backend/credenciais');
    check('1.4: Supabase declarado como BLOQUEADO, com motivo', supa.availability().status === 'unavailable' && (supa.availability() as any).reason.includes('credenciais'));
  }

  // ===== PersistenceAdapter =====
  {
    const storage = createMemoryStorageAdapter();
    const p = createSnapshotPersistence<number[]>({ storage, key: 'k', version: 2 });
    check('2.1: nada salvo → empty (não erro, não lista vazia inventada)', (await p.load()).status === 'empty');
    await p.save([1, 2], at('08:00'));
    const back = await p.load();
    check('2.2: salvo → ready com o horário em que foi salvo', back.status === 'ready' && back.data.join() === '1,2' && back.asOf === at('08:00'));

    await storage.set('old', JSON.stringify({ version: 1, savedAt: at('07:00'), data: [9] }));
    const strict = await createSnapshotPersistence<number[]>({ storage, key: 'old', version: 2 }).load();
    check('2.3: versão diferente sem migração → erro explícito (não chuta o formato)', strict.status === 'error');
    const migrated = await createSnapshotPersistence<number[]>({ storage, key: 'old', version: 2, migrate: (d) => (d as number[]).map((x) => x * 10) }).load();
    check('2.4: com migração → dado convertido', migrated.status === 'ready' && migrated.data[0] === 90);

    await storage.set('bad', '{nao json');
    check('2.5: snapshot corrompido → erro, nunca dado parcial', (await createSnapshotPersistence({ storage, key: 'bad', version: 1 }).load()).status === 'error');

    const blocked = createSnapshotPersistence<number[]>({ storage: createUnavailableStorageAdapter('supabase', 'sem backend'), key: 'k', version: 1 });
    const saved = await blocked.save([1], at('08:00'));
    check('2.6: gravar em backend bloqueado devolve ok:false com o motivo', !saved.ok && saved.error.includes('sem backend') && (await blocked.load()).status === 'error');
  }

  // ===== Repositórios de domínio =====
  resetAll();
  {
    const storage = createLocalStorageAdapter({ store: fakeLocalStorage() });
    const repo = createInMemoryTaskRepository('manual', [task('t1', { title: 'Enviar documento' }), task('t2', { dependsOn: ['t1'] })]);
    const bound = bindRepositoryPersistence(repo, createTaskPersistence(storage));
    check('3.1: flush das tarefas grava', (await bound.flush(at('09:00'))).ok);
    const fresh = createInMemoryTaskRepository();
    const state = await bindRepositoryPersistence(fresh, createTaskPersistence(storage)).hydrate();
    check('3.2: "recarregar a página": repositório novo hidratado com as mesmas tarefas e dependências', state.status === 'ready' && fresh.list().length === 2 && fresh.get('t2')!.dependsOn.join() === 't1');

    await storage.set(PERSISTENCE_KEYS.tasks, JSON.stringify({ version: 1, savedAt: at('09:00'), data: [{ foo: 1 }] }));
    const junk = createInMemoryTaskRepository();
    const junkState = await bindRepositoryPersistence(junk, createTaskPersistence(storage)).hydrate();
    check('3.3: snapshot de tarefas inválido é recusado e o repositório não é contaminado', junkState.status === 'error' && junk.list().length === 0);

    const prepo = createInMemoryProjectRepository('manual', [project('p1', { title: 'Projeto Integrado' })]);
    await bindRepositoryPersistence(prepo, createProjectPersistence(storage)).flush(at('09:00'));
    const pfresh = createInMemoryProjectRepository();
    await bindRepositoryPersistence(pfresh, createProjectPersistence(storage)).hydrate();
    check('3.4: projetos usam o mesmo contrato', pfresh.get('p1')?.title === 'Projeto Integrado');

    const generic = createInMemoryRepository<{ id: string; v: number }>('manual', [{ id: 'a', v: 1 }]);
    generic.remove('a');
    check('3.5: repositório genérico (contrato Repository) cobre remoção', generic.list().length === 0);
  }

  // ===== Reminder Engine =====
  resetAll();
  {
    const storage = createLocalStorageAdapter({ store: fakeLocalStorage() });
    const island1: NotificationPayload[] = [];
    const e1 = engineWith(island1);
    e1.syncEvents(buildEventContexts({ date: DAY, items: [agendaItem('tele', 'Telemedicina', '10:05', '10:35')] }), at('09:00'));
    e1.tick(at('10:00'));
    await bindStatePersistence(e1, createReminderPersistence(storage)).flush(at('10:00'));

    const island2: NotificationPayload[] = [];
    const e2 = engineWith(island2);
    const restored = await bindStatePersistence(e2, createReminderPersistence(storage)).hydrate();
    e2.syncEvents(buildEventContexts({ date: DAY, items: [agendaItem('tele', 'Telemedicina', '10:05', '10:35')] }), at('10:01'));
    e2.tick(at('10:01'));
    check('4.1: lembretes persistidos e restaurados → o T-5 já entregue não sai de novo depois de recarregar', restored.status === 'ready' && island1.length === 1 && island2.length === 0);

    const island3: NotificationPayload[] = [];
    const e3 = engineWith(island3);
    const lost = await bindStatePersistence(e3, createReminderPersistence(createLocalStorageAdapter({ store: null }))).hydrate();
    e3.syncEvents(buildEventContexts({ date: DAY, items: [agendaItem('tele', 'Telemedicina', '10:05', '10:35')] }), at('10:01'));
    e3.tick(at('10:01'));
    check('4.2: sem armazenamento disponível o estado é "erro" (não "vazio") — e o risco de repetir fica visível', lost.status === 'error' && island3.length === 1);
  }

  // ===== Eventos de contexto e ações =====
  resetAll();
  {
    const storage = createMemoryStorageAdapter();
    const log = createContextEventLog(storage, 3);
    for (let i = 0; i < 5; i++) await log.append({ id: `e${i}`, domain: 'agenda', type: 'X', payload: {}, priority: 1, createdAt: at(`0${i}:00`) }, at(`0${i}:00`));
    const listed = await log.list();
    check('5.1: log de contexto limitado (guarda só os mais recentes)', listed.status === 'ready' && listed.data.map((e) => e.id).join() === 'e2,e3,e4');

    publish({ domain: 'agenda', type: 'TIME_CONFLICT_DETECTED', payload: {}, priority: 1 });
    publish({ domain: 'agenda', type: 'TIME_CONFLICT_DETECTED', payload: { b: 1 }, priority: 1 });
    const s2 = createMemoryStorageAdapter();
    await snapshotEventHistory(s2, at('11:00'));
    await snapshotEventHistory(s2, at('11:05'));
    const snap = JSON.parse((await s2.get(PERSISTENCE_KEYS.contextEvents))!);
    check('5.2: snapshot do Event Bus não duplica eventos ao gravar duas vezes', snap.data.length === 2);

    submitThroughGuardian({ domain: 'agenda', type: 'CREATE_REMINDER', intent: 'teste', payload: {}, riskLevel: 'baixo', reversible: true, correlationId: 'c1' });
    const s3 = createMemoryStorageAdapter();
    const exp = await exportActionHistory(s3, at('11:00'));
    check('5.3: histórico de ações exportável para auditoria (somente leitura)', exp.ok && JSON.parse((await s3.get(PERSISTENCE_KEYS.actionHistory))!).data.length >= 1);
    check('5.4: matriz de persistência declara o que é real, preparado, só exportação e bloqueado', PERSISTENCE_MATRIX['agenda.items'].status === 'real' && PERSISTENCE_MATRIX.tasks.status === 'adapter_preparado' && PERSISTENCE_MATRIX.actions.status === 'somente_exportacao' && PERSISTENCE_MATRIX.supabase.status === 'bloqueado');
  }

  return result();
}

if (require.main === module) {
  run().then(({ total, fails }) => {
    console.log(`\n[persistence] ${total - fails}/${total} checagens OK`);
    process.exit(fails > 0 ? 1 : 0);
  });
}
