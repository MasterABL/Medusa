/**
 * MEDUSA — Finance — Estado do sync Open Finance como DataState
 *
 * O domínio não chama a fonte: só interpreta o que a fonte informou. A
 * interpretação vive aqui (e é testada) pra nenhuma tela decidir sozinha o
 * que é "atualizado" ou "desatualizado".
 */

import type { OpenFinanceSyncState } from '../model/statements';
import * as DS from '../../../foundation/dataState';
import type { DataState } from '../../../foundation/types/dataState';

export const DEFAULT_STALE_AFTER_HOURS = 24;

export function evaluateSync(state: OpenFinanceSyncState | undefined, now: string, staleAfterHours = DEFAULT_STALE_AFTER_HOURS): DataState<OpenFinanceSyncState> {
  if (!state) return DS.empty('Nenhuma conexão bancária configurada.');
  if (!state.authorized) return DS.permissionRequired('open_finance', 'A autorização da conexão bancária expirou ou foi revogada.');
  if (!state.lastSyncAt) return DS.empty('Conexão configurada, mas ainda não sincronizada.');

  if (state.lastResult === 'erro') return DS.failed(state.lastError ?? 'Erro desconhecido no último sync.', true, state);

  const ageHours = (Date.parse(now) - Date.parse(state.lastSyncAt)) / 3_600_000;
  const expected = state.itemsExpected;
  const synced = state.itemsSynced;
  const incomplete = state.lastResult === 'parcial' || (expected !== undefined && synced !== undefined && synced < expected);

  if (ageHours > staleAfterHours) return DS.stale(state, state.lastSyncAt, `Última sincronização há ${Math.floor(ageHours)}h.`, 'real');
  if (incomplete) {
    const missing = expected !== undefined && synced !== undefined ? [`${expected - synced} conexão(ões)`] : ['parte das conexões'];
    return DS.partial(state, missing, 'fonte_incompleta', 'real', state.lastSyncAt);
  }
  return DS.ready(state, 'real', state.lastSyncAt);
}
