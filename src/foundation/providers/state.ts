/**
 * MEDUSA FOUNDATION — Estado de integração externa
 *
 * Toda integração (Gmail, Google Calendar, Outlook, notificação nativa...) declara em que
 * pé está. Indisponibilidade nunca é escondida: vira um DataState honesto para a UI.
 *
 *   available            implementado, mas a conta ainda não foi conectada
 *   connected            conectado e respondendo
 *   permission-required  falta autorização/escopo
 *   expired              a autorização venceu — reconectar
 *   rate-limited         o provedor pediu para esperar
 *   error                falhou
 *   offline              sem rede
 *   partial              respondeu, mas faltou parte (ex.: um calendário de três)
 */

import type { DataOrigin, DataState } from '../types/dataState';
import * as DS from '../dataState';

export type ProviderStatus = 'available' | 'connected' | 'permission-required' | 'expired' | 'rate-limited' | 'error' | 'offline' | 'partial';

export interface ProviderState {
  provider: string;
  status: ProviderStatus;
  detail?: string;
  /** Escopos que faltam (permission-required). */
  missingScopes?: string[];
  /** Quando tentar de novo (rate-limited). */
  retryAfter?: string;
  /** O que faltou (partial). */
  missing?: string[];
  lastSyncAt?: string;
  /** Dado de demonstração: nunca pode ser apresentado como real. */
  isFixture?: boolean;
}

export function providerStateToDataState<T>(state: ProviderState, data: T | undefined, now: string, isEmpty?: (d: T) => boolean): DataState<T> {
  const origin: DataOrigin = state.isFixture ? 'fixture' : 'real';
  switch (state.status) {
    case 'connected':
      if (data === undefined) return DS.loading<T>();
      return isEmpty?.(data) ? DS.empty<T>(`nada em ${state.provider}`) : DS.ready(data, origin, now);
    case 'partial':
      return data === undefined ? DS.failed<T>(state.detail ?? `${state.provider} respondeu parcialmente`, true) : DS.partial(data, state.missing ?? [state.provider], 'fonte_incompleta', origin, now);
    case 'available':
      return DS.permissionRequired<T>(state.provider, state.detail ?? `${state.provider} não está conectado`);
    case 'permission-required':
      return DS.permissionRequired<T>(state.missingScopes?.join(', ') || state.provider, state.detail ?? `${state.provider} precisa de autorização`);
    case 'expired':
      return DS.permissionRequired<T>(state.provider, state.detail ?? `a autorização de ${state.provider} expirou — reconectar`);
    case 'rate-limited':
      return data !== undefined ? DS.stale(data, now, `${state.provider} pediu para esperar${state.retryAfter ? ` até ${state.retryAfter}` : ''}`, origin) : DS.failed<T>(`${state.provider} limitou as requisições`, true);
    case 'offline':
      return DS.offline<T>(data, state.lastSyncAt);
    case 'error':
    default:
      return DS.failed<T>(state.detail ?? `${state.provider} falhou`, true, data);
  }
}

/** Integração conhecida mas sem credenciais neste ambiente: BLOQUEADO, com o motivo. */
export function blockedProviderState(provider: string, reason: string): ProviderState {
  return { provider, status: 'available', detail: `BLOQUEADO: ${reason}` };
}
