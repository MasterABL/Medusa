/**
 * MEDUSA — Finance — Seletores de leitura (o que uma tela consome)
 *
 * UI -> seletor -> repositório -> fonte. O componente nunca calcula
 * Comprometido/Livre nem sabe de onde vêm os dados.
 */

import type { FinanceRepository } from './repository/types';
import type { CardInvoice, DuplicateGroup, FinanceSnapshot, ProjectionWithAssumptions } from './model/statements';
import type { DataOrigin, DataState } from '../../foundation/types/dataState';
import * as DS from '../../foundation/dataState';
import { computeFinanceSnapshot } from './services/snapshotEngine';
import { projectWithAssumptions } from './services/runwayProjection';
import { findDuplicateGroups } from './services/duplicateDetection';
import { buildInvoices } from './services/invoiceEngine';

export interface FinanceSelectorOptions {
  /** Origem declarada da fonte do repositório (o repositório de finanças não a carrega hoje). */
  origin: DataOrigin;
  currency?: string;
  horizonDays?: number;
  burnWindowDays?: number;
  excludeCategoryIds?: string[];
}

export function selectFinanceSnapshot(repo: FinanceRepository, asOf: string, opts: FinanceSelectorOptions): DataState<FinanceSnapshot> {
  const accounts = repo.listAccounts({ active: true });
  if (accounts.length === 0) return DS.empty('Nenhuma conta cadastrada.');
  const snapshot = computeFinanceSnapshot({
    accounts: repo.listAccounts(),
    transactions: repo.listTransactions(),
    commitments: repo.listRecurringCommitments(),
    asOf,
    currency: opts.currency,
    horizonDays: opts.horizonDays,
    burnWindowDays: opts.burnWindowDays,
    excludeCategoryIds: opts.excludeCategoryIds,
  });
  return DS.partial(snapshot, snapshot.gaps, 'dados_insuficientes', opts.origin, asOf);
}

export function selectProjection(repo: FinanceRepository, asOf: string, monthsAhead: number, opts: FinanceSelectorOptions): DataState<ProjectionWithAssumptions> {
  const snap = selectFinanceSnapshot(repo, asOf, opts);
  const snapshot = DS.dataOf(snap);
  if (!snapshot) return snap as unknown as DataState<ProjectionWithAssumptions>;
  const projection = projectWithAssumptions({
    snapshot,
    accounts: repo.listAccounts(),
    transactions: repo.listTransactions(),
    commitments: repo.listRecurringCommitments(),
    monthsAhead,
  });
  // A projeção herda do snapshot o que faltou, mas NUNCA é "ready" sem ressalva: é estimativa por natureza.
  const missing = snap.status === 'partial' ? snap.missing : [];
  return DS.partial(projection, missing.length > 0 ? missing : ['projeção é estimativa'], 'dados_insuficientes', opts.origin, asOf);
}

export function selectInvoices(repo: FinanceRepository, cardAccountId: string, asOf: string, origin: DataOrigin): DataState<CardInvoice[]> {
  const card = repo.getAccount(cardAccountId);
  if (!card || card.type !== 'credit_card') return DS.empty('Cartão não encontrado.');
  const invoices = buildInvoices(card, repo.listTransactions({ accountId: card.id }), asOf);
  if (invoices.length === 0) return DS.empty('Nenhuma compra neste cartão ainda.');
  const approximated = invoices.some((i) => i.approximated);
  return approximated ? DS.partial(invoices, ['dia de fechamento'], 'dados_insuficientes', origin, asOf) : DS.ready(invoices, origin, asOf);
}

export function selectDuplicates(repo: FinanceRepository, asOf: string): DataState<DuplicateGroup[]> {
  const groups = findDuplicateGroups(repo.listTransactions());
  return groups.length === 0 ? DS.empty('Nenhuma duplicidade provável encontrada.') : DS.ready(groups, 'derived', asOf);
}
