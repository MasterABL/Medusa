/**
 * MEDUSA FOUNDATION — Finanças: Tenho / Comprometido / Livre / Sustento,
 * faturas, parcelas, duplicidades, sync e projeção com premissas.
 */

import { makeChecker } from './_helpers';
import type { FinancialAccount, RecurringCommitment, Transaction } from '../../../src/domains/finance/model/types';
import { createInMemoryFinanceRepository } from '../../../src/domains/finance/repository/inMemory';
import * as Invoice from '../../../src/domains/finance/services/invoiceEngine';
import * as Snapshot from '../../../src/domains/finance/services/snapshotEngine';
import * as Runway from '../../../src/domains/finance/services/runwayProjection';
import * as Dups from '../../../src/domains/finance/services/duplicateDetection';
import * as Sync from '../../../src/domains/finance/services/syncState';
import * as Selectors from '../../../src/domains/finance/selectors';

const ASOF = '2026-09-10';

const acc = (o: Partial<FinancialAccount> & Pick<FinancialAccount, 'id' | 'type'>): FinancialAccount => ({
  name: o.id, currentBalance: 0, currency: 'BRL', active: true, dataSource: 'manual', createdAt: ASOF, updatedAt: ASOF, ...o,
});
const tx = (o: Partial<Transaction> & Pick<Transaction, 'id' | 'accountId' | 'amount' | 'occurredAt'>): Transaction => ({
  currency: 'BRL', type: 'expense', description: o.id, source: 'manual', status: 'posted', ...o,
});
const commitment = (o: Partial<RecurringCommitment> & Pick<RecurringCommitment, 'id' | 'label' | 'expectedAmount'>): RecurringCommitment => ({
  type: 'expense', frequency: 'monthly', startDate: '2026-01-01', active: true, source: 'manual', ...o,
});

function scenario() {
  const accounts = [
    acc({ id: 'cc', type: 'checking', currentBalance: 2000 }),
    acc({ id: 'sv', type: 'savings', currentBalance: 500 }),
    acc({ id: 'inv', type: 'investment', currentBalance: 10000 }),
    acc({ id: 'card', type: 'credit_card', currentBalance: 9999, cardCycle: { closingDay: 5, dueDay: 15 } }),
    acc({ id: 'usd', type: 'checking', currentBalance: 100, currency: 'USD' }),
    acc({ id: 'old', type: 'checking', currentBalance: 300, active: false }),
  ];
  const transactions = [
    tx({ id: 'salario', accountId: 'cc', amount: 3000, type: 'income', occurredAt: '2026-08-01' }),
    tx({ id: 'mercado1', accountId: 'cc', amount: 300, occurredAt: '2026-09-01' }),
    tx({ id: 'mercado2', accountId: 'cc', amount: 150, occurredAt: '2026-08-20' }),
    tx({ id: 'farmacia', accountId: 'cc', amount: 150, occurredAt: '2026-08-15' }),
    tx({ id: 'transf', accountId: 'cc', amount: 500, type: 'transfer', occurredAt: '2026-09-02' }),
    tx({ id: 'netflix', accountId: 'cc', amount: 40, occurredAt: '2026-09-11', recurringCommitmentId: 'c_netflix' }),
    tx({ id: 'pend', accountId: 'cc', amount: 60, occurredAt: '2026-09-09', status: 'pending' }),
    tx({ id: 'k1', accountId: 'card', amount: 100, occurredAt: '2026-08-20' }),
    tx({ id: 'k2', accountId: 'card', amount: 50, occurredAt: '2026-09-03' }),
    tx({ id: 'k3', accountId: 'card', amount: 200, occurredAt: '2026-09-02', description: 'Geladeira 2/3', installment: { current: 2, total: 3 } }),
    tx({ id: 'k3a', accountId: 'card', amount: 200, occurredAt: '2026-08-02', description: 'Geladeira 1/3', installment: { current: 1, total: 3 } }),
    tx({ id: 'kref', accountId: 'card', amount: 30, type: 'income', occurredAt: '2026-09-04' }),
  ];
  const commitments = [
    commitment({ id: 'c_aluguel', label: 'Aluguel', expectedAmount: 800, dueDayOfMonth: 20 }),
    commitment({ id: 'c_netflix', label: 'Netflix', expectedAmount: 40, dueDayOfMonth: 12 }),
  ];
  return { accounts, transactions, commitments };
}

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('finance-foundation');

  // 1. Invoice: mês da fatura, estorno, parcelas
  {
    const card = acc({ id: 'card', type: 'credit_card', cardCycle: { closingDay: 5, dueDay: 15 } });
    check('1.1: compra após o fechamento cai na fatura seguinte', Invoice.invoiceMonthOf(tx({ id: 'a', accountId: 'card', amount: 1, occurredAt: '2026-08-20' }), 5).month === '2026-09');
    check('1.2: compra até o dia do fechamento fica no mês', Invoice.invoiceMonthOf(tx({ id: 'a', accountId: 'card', amount: 1, occurredAt: '2026-09-05' }), 5).month === '2026-09');
    check('1.3: mês informado pela fonte vence o cálculo local', Invoice.invoiceMonthOf(tx({ id: 'a', accountId: 'card', amount: 1, occurredAt: '2026-08-20', invoiceMonth: '2026-08' }), 5).month === '2026-08');
    const noCycle = Invoice.invoiceMonthOf(tx({ id: 'a', accountId: 'card', amount: 1, occurredAt: '2026-08-20' }));
    check('1.4: sem fechamento, usa mês da compra E marca aproximado (não inventa fechamento)', noCycle.month === '2026-08' && noCycle.approximated);
    check('1.5: virada de ano', Invoice.addMonthsToLabel('2026-12', 1) === '2027-01' && Invoice.addMonthsToLabel('2026-01', -1) === '2025-12');

    const { transactions } = scenario();
    const invoices = Invoice.buildInvoices(card, transactions, ASOF);
    const sep = invoices.find((i) => i.month === '2026-09');
    check('1.6: fatura de setembro = 100+50+200−30 (estorno abate)', sep?.total === 320);
    check('1.7: vencimento calculado do dia de vencimento', sep?.dueDate === '2026-09-15');
    check('1.8: agosto já fechada', invoices.find((i) => i.month === '2026-08')?.status === 'fechada');
    const oct = invoices.find((i) => i.month === '2026-10');
    check('1.9: parcela 3/3 projetada em outubro, marcada como projetada', oct?.total === 200 && oct.projectedTotal === 200 && oct.lines[0].projected && oct.status === 'projetada');
    check('1.10: setembro não tem nada projetado', sep?.projectedTotal === 0);
    check('1.11: cancelada não entra', Invoice.buildInvoices(card, [...transactions, tx({ id: 'x', accountId: 'card', amount: 999, occurredAt: '2026-09-03', status: 'cancelled' })], ASOF).find((i) => i.month === '2026-09')?.total === 320);
  }

  // 2. Parcelas: nunca contar a mesma parcela duas vezes
  {
    const card = acc({ id: 'card', type: 'credit_card', cardCycle: { closingDay: 28, dueDay: 5 } });
    const allSent = [1, 2, 3].map((n) => tx({ id: `p${n}`, accountId: 'card', amount: 50, occurredAt: `2026-0${6 + n}-10`, invoiceMonth: `2026-0${6 + n}`, description: `Amazon ${n}/3`, installment: { current: n, total: 3 } }));
    const inv = Invoice.buildInvoices(card, allSent, '2026-07-15');
    check('2.1: fonte que já mandou TODAS as parcelas => zero projeção', inv.every((i) => i.projectedTotal === 0) && inv.length === 3);
    check('2.2: total geral = 3 parcelas, nenhuma duplicada', inv.reduce((s, i) => s + i.total, 0) === 150);

    const partial = [1, 2].map((n) => tx({ id: `q${n}`, accountId: 'card', amount: 50, occurredAt: `2026-0${6 + n}-10`, invoiceMonth: `2026-0${6 + n}`, description: `Loja ${n}/4`, installment: { current: n, total: 4 } }));
    const inv2 = Invoice.buildInvoices(card, partial, '2026-08-15');
    const projectedLines = inv2.flatMap((i) => i.lines.filter((l) => l.projected));
    check('2.3: só a parcela mais avançada projeta: 3/4 e 4/4 uma vez cada', projectedLines.length === 2 && projectedLines.map((l) => l.installment!.current).sort().join() === '3,4');
    check('2.4: valor da parcela NÃO é dividido de novo', projectedLines.every((l) => l.amount === 50));
    check('2.5: séries distintas (total ou valor diferente) não se misturam', (() => {
      const a = tx({ id: 'a', accountId: 'card', amount: 50, occurredAt: '2026-08-10', description: 'X 1/3', installment: { current: 1, total: 3 } });
      const b = tx({ id: 'b', accountId: 'card', amount: 80, occurredAt: '2026-08-10', description: 'X 1/3', installment: { current: 1, total: 3 } });
      return Invoice.installmentSeriesKey(a) !== Invoice.installmentSeriesKey(b);
    })());
  }

  // 3. Snapshot: Tenho / Comprometido / Livre
  const { accounts, transactions, commitments } = scenario();
  const snap = Snapshot.computeFinanceSnapshot({ accounts, transactions, commitments, asOf: ASOF });
  {
    check('3.1: Tenho = corrente + poupança (2500); cartão, investimento, outra moeda e inativa ficam fora', snap.tenho.total === 2500 && snap.tenho.lines.length === 2);
    const reasons = snap.tenho.excluded.map((e) => e.reason).sort().join();
    check('3.2: cada exclusão tem motivo explícito', reasons === 'cartao_e_divida,inativa,investimento_fora_do_liquido,outra_moeda');
    check('3.3: investimento aparece à parte, não no Tenho', snap.investido === 10000);
    check('3.4: fatura com vencimento na janela entra no Comprometido (320)', snap.comprometido.parts.faturas === 320);
    check('3.5: conta fixa não acertada entra (Aluguel 800); a já paga (Netflix) não', snap.comprometido.parts.contasFixas === 800 && !snap.comprometido.items.some((i) => i.label === 'Netflix'));
    check('3.6: despesa pendente entra (60)', snap.comprometido.parts.pendentes === 60);
    check('3.7: Comprometido = 1180 e Livre = Tenho − Comprometido = 1320', snap.comprometido.total === 1180 && snap.livre.value === 1320 && !snap.livre.negativo);
    check('3.8: fatura de agosto (vencida) não é recontada', !snap.comprometido.items.some((i) => i.sourceId === 'card:2026-08'));
    check('3.9: a premissa "fatura vencida = paga" é declarada, não escondida', snap.comprometido.assumptions.some((a) => a.key === 'fatura_vencida'));
    check('3.10: outra moeda vira lacuna declarada', snap.gaps.some((g) => g.includes('outra moeda')));
    check('3.11: janela maior enxerga a fatura de outubro, incluindo a parcela projetada', (() => {
      const wide = Snapshot.computeFinanceSnapshot({ accounts, transactions, commitments, asOf: ASOF, horizonDays: 40 });
      const octItem = wide.comprometido.items.find((i) => i.sourceId === 'card:2026-10');
      return octItem?.amount === 200 && octItem.projected && octItem.projectedAmount === 200;
    })());
    check('3.12: cartão sem dia de vencimento: só a fatura do mês atual entra E a lacuna é declarada', (() => {
      const noDue = accounts.map((a) => (a.id === 'card' ? { ...a, cardCycle: { closingDay: 5 } } : a));
      const s = Snapshot.computeFinanceSnapshot({ accounts: noDue, transactions, commitments, asOf: ASOF });
      return s.comprometido.parts.faturas === 320 && s.gaps.some((g) => g.includes('sem dia de vencimento')) && !s.comprometido.items.some((i) => i.sourceId === 'card:2026-10');
    })());
  }

  // 4. Livre negativo e Sustento
  {
    const big = [...commitments, commitment({ id: 'c_big', label: 'Seguro', expectedAmount: 5000, dueDayOfMonth: 25 })];
    const neg = Snapshot.computeFinanceSnapshot({ accounts, transactions, commitments: big, asOf: ASOF });
    check('4.1: Livre negativo NÃO é truncado em zero — o sinal é informação', neg.livre.value < 0 && neg.livre.negativo);
    check('4.2: sem Livre positivo, sem dias de sustento (e explica por quê)', neg.sustento.runwayDays === undefined && neg.sustento.assumptions.some((a) => a.key === 'livre_nao_positivo'));

    check('4.3: ritmo = 600 / 30 dias = 20/dia (transferência e conta fixa ficam fora)', snap.sustento.dailyBurn === 20);
    check('4.4: sustento = ⌊1320 / 20⌋ = 66 dias', snap.sustento.runwayDays === 66);
    check('4.5: SEMPRE estimativa, com premissas', snap.sustento.kind === 'estimativa' && snap.sustento.assumptions.length >= 4);
    check('4.6: lacuna rebaixa a confiança (alta -> média)', snap.sustento.confidence === 'media');
    const clean = Snapshot.computeFinanceSnapshot({ accounts: accounts.filter((a) => a.id !== 'usd'), transactions, commitments, asOf: ASOF });
    check('4.7: sem lacuna e 30 dias observados => confiança alta', clean.gaps.length === 0 && clean.sustento.confidence === 'alta');

    const young = Snapshot.computeFinanceSnapshot({ accounts: [acc({ id: 'cc', type: 'checking', currentBalance: 1000 })], transactions: [tx({ id: 'a', accountId: 'cc', amount: 100, occurredAt: '2026-09-08' })], commitments, asOf: ASOF });
    check('4.8: menos de 7 dias de dados => sem estimativa de dias, confiança baixa', young.sustento.runwayDays === undefined && young.sustento.confidence === 'baixa' && young.sustento.assumptions.some((a) => a.key === 'poucos_dias'));
    const noSpend = Snapshot.computeFinanceSnapshot({ accounts: [acc({ id: 'cc', type: 'checking', currentBalance: 1000 })], transactions: [tx({ id: 's', accountId: 'cc', amount: 100, type: 'income', occurredAt: '2026-08-01' })], commitments, asOf: ASOF });
    check('4.9: sem nenhuma despesa => sem ritmo (não divide por zero, não "infinito")', noSpend.sustento.dailyBurn === undefined && noSpend.sustento.runwayDays === undefined);
    check('4.10: categorias excluíveis do ritmo (ex.: pagamento de fatura)', (() => {
      const withPay = [...transactions, tx({ id: 'pagfat', accountId: 'cc', amount: 900, occurredAt: '2026-09-06', categoryId: 'cat_cartao' })];
      const a = Snapshot.computeFinanceSnapshot({ accounts, transactions: withPay, commitments, asOf: ASOF });
      const b = Snapshot.computeFinanceSnapshot({ accounts, transactions: withPay, commitments, asOf: ASOF, excludeCategoryIds: ['cat_cartao'] });
      return (a.sustento.dailyBurn ?? 0) > (b.sustento.dailyBurn ?? 0) && b.sustento.dailyBurn === 20;
    })());
  }

  // 5. Projeção com premissas
  {
    const projection = Runway.projectWithAssumptions({ snapshot: snap, accounts, transactions, commitments, monthsAhead: 2 });
    check('5.1: projeção é estimativa, nunca saldo', projection.kind === 'estimativa' && projection.assumptions.length >= 4);
    check('5.2: mês 1 = 2500 − 800 (aluguel) − 320 (fatura) − 600 (variável) = 780; Netflix já paga não recai', projection.points[0].projectedBalance === 780);
    check('5.3: mês 2 sai do mês 1 (Aluguel + Netflix + variável; fatura de outubro 200 vence dia 15)', projection.points[1].projectedBalance === Math.round((780 - 800 - 40 - 200 - 600) * 100) / 100);
    check('5.4: horizonte longo derruba a confiança', Runway.projectWithAssumptions({ snapshot: snap, accounts, transactions, commitments, monthsAhead: 6 }).confidence === 'baixa');
    check('5.5: toda premissa tem texto e chave', projection.assumptions.every((a) => a.key && a.text));
    check('5.6: receita recorrente cadastrada entra', (() => {
      const withSalary = [...commitments, commitment({ id: 'c_sal', label: 'Salário', type: 'income', expectedAmount: 3000, dueDayOfMonth: 28 })];
      const p = Runway.projectWithAssumptions({ snapshot: snap, accounts, transactions, commitments: withSalary, monthsAhead: 1 });
      return p.points[0].projectedBalance === 3780;
    })());
  }

  // 6. Duplicidades
  {
    const base = tx({ id: 'm1', accountId: 'cc', amount: 59.9, occurredAt: '2026-09-05', description: 'Uber *Trip', source: 'manual' });
    const of = tx({ id: 'o1', accountId: 'cc', amount: 59.9, occurredAt: '2026-09-06', description: 'UBER TRIP SAO PAULO', source: 'integration' });
    const g = Dups.findDuplicateGroups([base, of]);
    check('6.1: manual + Open Finance do mesmo fato (1 dia de diferença) => grupo de confiança média', g.length === 1 && g[0].confidence === 'media');
    check('6.2: mesmo dia e mesma descrição => alta', Dups.findDuplicateGroups([base, { ...base, id: 'm2' }])[0]?.confidence === 'alta');
    check('6.3: mesmo externalId na mesma fonte => alta', Dups.findDuplicateGroups([tx({ id: 'a', accountId: 'cc', amount: 1, occurredAt: '2026-09-01', source: 'integration', externalId: 'X1' }), tx({ id: 'b', accountId: 'cc', amount: 2, occurredAt: '2026-09-02', source: 'integration', externalId: 'X1' })])[0]?.confidence === 'alta');
    check('6.4: parcelas diferentes da mesma compra NÃO são duplicata', Dups.findDuplicateGroups([
      tx({ id: 'p1', accountId: 'cc', amount: 50, occurredAt: '2026-09-01', description: 'Loja 1/3', installment: { current: 1, total: 3 } }),
      tx({ id: 'p2', accountId: 'cc', amount: 50, occurredAt: '2026-09-01', description: 'Loja 2/3', installment: { current: 2, total: 3 } }),
    ]).length === 0);
    check('6.5: valores diferentes, contas diferentes ou cancelada => nunca', Dups.findDuplicateGroups([base, { ...of, id: 'o2', amount: 60 }]).length === 0 && Dups.findDuplicateGroups([base, { ...of, id: 'o3', accountId: 'sv' }]).length === 0 && Dups.findDuplicateGroups([base, { ...of, id: 'o4', status: 'cancelled' }]).length === 0);
    check('6.6: mesma fonte, dias diferentes, descrições diferentes => não agrupa (na dúvida não agrupa)', Dups.findDuplicateGroups([base, tx({ id: 'z', accountId: 'cc', amount: 59.9, occurredAt: '2026-09-06', description: 'Padaria', source: 'manual' })]).length === 0);
    check('6.7: detecção é só sugestão — não altera a lista recebida', (() => { const list = [base, of]; Dups.findDuplicateGroups(list); return list.length === 2; })());
  }

  // 7. Sync Open Finance
  {
    const now = '2026-09-10T12:00:00Z';
    check('7.1: sem conexão => empty', Sync.evaluateSync(undefined, now).status === 'empty');
    check('7.2: autorização vencida => permission-required', Sync.evaluateSync({ provider: 'pluggy', authorized: false, lastSyncAt: now }, now).status === 'permission-required');
    check('7.3: nunca sincronizou => empty', Sync.evaluateSync({ provider: 'pluggy', authorized: true }, now).status === 'empty');
    check('7.4: último sync com erro => error retryable, sem esconder o estado anterior', (() => { const s = Sync.evaluateSync({ provider: 'pluggy', authorized: true, lastSyncAt: now, lastResult: 'erro', lastError: 'timeout' }, now); return s.status === 'error' && s.retryable; })());
    check('7.5: sync de 30h atrás => stale', Sync.evaluateSync({ provider: 'pluggy', authorized: true, lastSyncAt: '2026-09-09T06:00:00Z', lastResult: 'ok' }, now).status === 'stale');
    check('7.6: 2 de 3 conexões sincronizadas => partial listando o que falta', (() => { const s = Sync.evaluateSync({ provider: 'pluggy', authorized: true, lastSyncAt: now, lastResult: 'ok', itemsExpected: 3, itemsSynced: 2 }, now); return s.status === 'partial' && s.missing[0].startsWith('1'); })());
    check('7.7: tudo certo e recente => ready', Sync.evaluateSync({ provider: 'pluggy', authorized: true, lastSyncAt: now, lastResult: 'ok', itemsExpected: 3, itemsSynced: 3 }, now).status === 'ready');
  }

  // 8. Seletores: estados de dado
  {
    const empty = createInMemoryFinanceRepository();
    check('8.1: sem contas => empty (não erro, não zero)', Selectors.selectFinanceSnapshot(empty, ASOF, { origin: 'manual' }).status === 'empty');

    const repo = createInMemoryFinanceRepository();
    accounts.forEach((a) => repo.saveAccount(a));
    transactions.forEach((t) => repo.saveTransaction(t));
    commitments.forEach((c) => repo.saveRecurringCommitment(c));
    const partial = Selectors.selectFinanceSnapshot(repo, ASOF, { origin: 'manual' });
    check('8.2: lacunas (outra moeda) => partial, dado continua disponível', partial.status === 'partial' && partial.data.livre.value === 1320);

    const repo2 = createInMemoryFinanceRepository();
    repo2.saveAccount(acc({ id: 'cc', type: 'checking', currentBalance: 100 }));
    const noCommit = Selectors.selectFinanceSnapshot(repo2, ASOF, { origin: 'fixture' });
    check('8.3: sem contas fixas cadastradas => partial e diz isso', noCommit.status === 'partial' && noCommit.missing.some((m) => m.includes('conta fixa')));
    check('8.4: origem fixture viaja até a tela', noCommit.status === 'partial' && noCommit.origin === 'fixture');

    const proj = Selectors.selectProjection(repo, ASOF, 3, { origin: 'manual' });
    check('8.5: projeção nunca sai como "ready" — é estimativa', proj.status === 'partial' && proj.data.kind === 'estimativa');
    check('8.6: projeção sem contas propaga o vazio', Selectors.selectProjection(empty, ASOF, 3, { origin: 'manual' }).status === 'empty');
    check('8.7: faturas de um cartão; conta que não é cartão => empty', Selectors.selectInvoices(repo, 'card', ASOF, 'manual').status === 'ready' && Selectors.selectInvoices(repo, 'cc', ASOF, 'manual').status === 'empty');
    check('8.8: cartão sem fechamento => partial (faturas aproximadas)', (() => { const r = createInMemoryFinanceRepository(); r.saveAccount(acc({ id: 'k', type: 'credit_card' })); r.saveTransaction(tx({ id: 'a', accountId: 'k', amount: 10, occurredAt: '2026-09-01' })); return Selectors.selectInvoices(r, 'k', ASOF, 'manual').status === 'partial'; })());
    check('8.9: duplicidades: nenhuma => empty; com par => ready/derived', Selectors.selectDuplicates(empty, ASOF).status === 'empty' && (() => { const r = createInMemoryFinanceRepository(); r.saveTransaction(tx({ id: 'a', accountId: 'cc', amount: 1, occurredAt: '2026-09-01', description: 'X' })); r.saveTransaction(tx({ id: 'b', accountId: 'cc', amount: 1, occurredAt: '2026-09-01', description: 'X' })); const s = Selectors.selectDuplicates(r, ASOF); return s.status === 'ready' && s.origin === 'derived'; })());
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[finance-foundation] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
