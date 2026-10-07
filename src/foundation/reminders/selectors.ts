/**
 * MEDUSA FOUNDATION — Leitura do Reminder Engine (DataState)
 */
import type { ReminderEngine, ReminderRecord } from './engine';
import type { ChannelCapability } from './channels';
import type { DataState } from '../types/dataState';
import * as DS from '../dataState';

export interface ReminderOverview {
  upcoming: ReminderRecord[];
  delivered: ReminderRecord[];
  /** Entregues, de evento crítico/alto, ainda sem reconhecimento. */
  awaitingAcknowledgement: ReminderRecord[];
  held: ReminderRecord[];
  channels: ChannelCapability[];
}

export function selectReminderOverview(engine: ReminderEngine, now: string): DataState<ReminderOverview> {
  const all = engine.list();
  const channels = engine.capabilities();
  if (all.length === 0) return DS.empty('Nenhum lembrete planejado.');
  const overview: ReminderOverview = {
    upcoming: all.filter((r) => r.state === 'scheduled' && r.triggerAtIso >= now.slice(0, 19)),
    delivered: all.filter((r) => r.state === 'delivered' || r.state === 'partially_delivered' || r.state === 'acknowledged'),
    awaitingAcknowledgement: all.filter((r) => (r.state === 'delivered' || r.state === 'partially_delivered') && r.requiresAcknowledgement),
    held: all.filter((r) => r.state === 'held_for_approval'),
    channels,
  };
  // Lembrete parado em aprovação é decisão do usuário, não dado faltando.
  if (overview.held.length > 0 && overview.upcoming.length === 0 && overview.delivered.length === 0) {
    return DS.approvalRequired<ReminderOverview>('Há lembretes aguardando aprovação no Action Center.', overview.held[0].actionId);
  }
  const unavailable = channels.filter((c) => c.status !== 'available').map((c) => `${c.channel}: ${c.status}`);
  return DS.partial(overview, unavailable, 'fonte_indisponivel', 'derived', now);
}
