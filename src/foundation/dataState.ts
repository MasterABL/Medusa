/**
 * MEDUSA FOUNDATION — construtores e leitores de DataState<T>
 *
 * Funções puras. A UI nunca monta um DataState na mão: usa estes construtores,
 * pra nenhuma tela inventar um estado "quase ready".
 */

import type { DataOrigin, DataState, DataStatus, PartialReason } from './types/dataState';

export const loading = <T>(previous?: T): DataState<T> => ({ status: 'loading', previous });

export const ready = <T>(data: T, origin: DataOrigin, asOf?: string): DataState<T> => ({ status: 'ready', data, origin, asOf });

export const empty = <T>(reason: string): DataState<T> => ({ status: 'empty', reason });

export const stale = <T>(data: T, staleSince: string, reason: string, origin: DataOrigin = 'real'): DataState<T> => ({
  status: 'stale',
  data,
  staleSince,
  reason,
  origin,
});

export const failed = <T>(message: string, retryable = true, previous?: T): DataState<T> => ({
  status: 'error',
  message,
  retryable,
  previous,
});

export const offline = <T>(previous?: T, lastSyncAt?: string): DataState<T> => ({ status: 'offline', previous, lastSyncAt });

export const permissionRequired = <T>(permission: string, reason: string): DataState<T> => ({
  status: 'permission-required',
  permission,
  reason,
});

export const approvalRequired = <T>(reason: string, actionId?: string): DataState<T> => ({
  status: 'approval-required',
  reason,
  actionId,
});

export function partial<T>(data: T, missing: string[], reason: PartialReason, origin: DataOrigin, asOf?: string): DataState<T> {
  // "parcial" sem nada faltando é mentira: vira ready.
  if (missing.length === 0) return ready(data, origin, asOf);
  return { status: 'partial', data, missing, reason, origin, asOf };
}

/** O estado traz dado que pode ser mostrado? (ready/stale/partial sempre; loading/error/offline só se houver `previous`.) */
export function dataOf<T>(state: DataState<T>): T | undefined {
  switch (state.status) {
    case 'ready':
    case 'stale':
    case 'partial':
      return state.data;
    case 'loading':
    case 'error':
    case 'offline':
      return state.previous;
    default:
      return undefined;
  }
}

/** Dado atual e confiável (não velho, não parcial, não de erro). */
export function isTrustworthy<T>(state: DataState<T>): state is Extract<DataState<T>, { status: 'ready' }> {
  return state.status === 'ready';
}

/** Dado exibível, mas que exige sinalização (stale/partial/previous de erro). */
export function needsCaveat<T>(state: DataState<T>): boolean {
  return state.status === 'stale' || state.status === 'partial' || ((state.status === 'error' || state.status === 'offline') && dataOf(state) !== undefined);
}

/** Origem efetiva do dado exibido; `undefined` quando nada é exibido. */
export function originOf<T>(state: DataState<T>): DataOrigin | undefined {
  if (state.status === 'ready' || state.status === 'stale' || state.status === 'partial') return state.origin;
  if (state.status === 'empty') return state.origin;
  return undefined;
}

/** Mensagem legível, sem depender de cor — pra leitor de tela e rótulo textual. */
export function describe<T>(state: DataState<T>): string {
  switch (state.status) {
    case 'loading':
      return 'Carregando';
    case 'ready':
      return state.origin === 'fixture' ? 'Dados de exemplo' : 'Dados atualizados';
    case 'empty':
      return state.reason;
    case 'stale':
      return `Dados desatualizados desde ${state.staleSince}: ${state.reason}`;
    case 'error':
      return state.retryable ? `Falha ao carregar: ${state.message}. Tente novamente.` : `Falha: ${state.message}`;
    case 'offline':
      return state.lastSyncAt ? `Sem conexão. Última sincronização: ${state.lastSyncAt}` : 'Sem conexão';
    case 'permission-required':
      return `Permissão necessária (${state.permission}): ${state.reason}`;
    case 'approval-required':
      return `Aguardando sua aprovação: ${state.reason}`;
    case 'partial':
      return `Dados parciais — faltam: ${state.missing.join(', ')}`;
  }
}

/**
 * Combina estados de várias fontes num só. O resultado é sempre o PIOR
 * estado honesto: nunca "ready" se qualquer parte não está pronta.
 * Prioridade: permission/approval > error > offline > loading > (algum vazio/stale/partial) > ready.
 */
export function combine<A, B, R>(a: DataState<A>, b: DataState<B>, merge: (a: A, b: B) => R): DataState<R> {
  const both: Array<DataState<unknown>> = [a, b];
  const blocked = both.find((s) => s.status === 'permission-required' || s.status === 'approval-required');
  if (blocked) return blocked as unknown as DataState<R>;
  const failedOne = both.find((s) => s.status === 'error');
  if (failedOne && failedOne.status === 'error') return failed(failedOne.message, failedOne.retryable);
  if (a.status === 'offline' || b.status === 'offline') return offline();
  if (a.status === 'loading' || b.status === 'loading') return loading();

  const da = dataOf(a);
  const db = dataOf(b);
  if (da === undefined || db === undefined) {
    // pelo menos um lado é `empty`: sem dado combinável, e a razão é do lado que está vazio
    const emptyOne = a.status === 'empty' ? a : b.status === 'empty' ? b : undefined;
    return empty(emptyOne && emptyOne.status === 'empty' ? emptyOne.reason : 'Sem dados');
  }

  const merged = merge(da, db);
  const states = both;
  const missing = states.flatMap((s) => (s.status === 'partial' ? s.missing : []));
  const origins = states.map((s) => originOf(s)).filter((o): o is DataOrigin => o !== undefined);
  // fixture contamina: basta uma parte de exemplo e o todo não pode ser chamado de real.
  const origin: DataOrigin = origins.includes('fixture') ? 'fixture' : origins.includes('derived') ? 'derived' : origins.includes('manual') ? 'manual' : 'real';

  const staleOne = states.find((s) => s.status === 'stale');
  if (staleOne && staleOne.status === 'stale') return stale(merged, staleOne.staleSince, staleOne.reason, origin);
  if (missing.length > 0) return partial(merged, missing, 'fonte_incompleta', origin);
  return ready(merged, origin);
}

/** Todos os status possíveis — útil pra teste exaustivo e pra UI checar cobertura. */
export const ALL_STATUSES: readonly DataStatus[] = [
  'loading',
  'ready',
  'empty',
  'stale',
  'error',
  'offline',
  'permission-required',
  'approval-required',
  'partial',
];
