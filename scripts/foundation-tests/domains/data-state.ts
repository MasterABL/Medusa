/**
 * MEDUSA FOUNDATION — DataState<T>: distinção honesta entre os 9 estados
 */

import { makeChecker } from './_helpers';
import * as DS from '../../../src/foundation/dataState';
import type { DataState } from '../../../src/foundation/types/dataState';

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('data-state');

  check('1.1: "empty" e "loading" são estados diferentes (UI não confunde vazio com carregando)', DS.empty<number>('x').status !== DS.loading<number>().status);
  check('1.2: os 9 status existem e são distintos', new Set(DS.ALL_STATUSES).size === 9);

  const r = DS.ready(5, 'real', '2026-01-01T00:00:00Z');
  check('2.1: dataOf(ready) devolve o dado', DS.dataOf(r) === 5);
  check('2.2: dataOf(empty) é undefined', DS.dataOf(DS.empty<number>('nada')) === undefined);
  check('2.3: erro com `previous` ainda expõe o último dado bom', DS.dataOf(DS.failed<number>('timeout', true, 7)) === 7);
  check('2.4: erro sem previous não expõe nada', DS.dataOf(DS.failed<number>('timeout')) === undefined);
  check('2.5: permission/approval nunca expõem dado', DS.dataOf(DS.permissionRequired<number>('gmail', 'x')) === undefined && DS.dataOf(DS.approvalRequired<number>('x')) === undefined);

  check('3.1: só "ready" é confiável', DS.isTrustworthy(r) && !DS.isTrustworthy(DS.stale(1, '2026-01-01', 'sync antigo')) && !DS.isTrustworthy(DS.partial(1, ['a'], 'fonte_incompleta', 'real')));
  check('3.2: stale e partial exigem ressalva; ready não', DS.needsCaveat(DS.stale(1, 'd', 'r')) && DS.needsCaveat(DS.partial(1, ['a'], 'fonte_incompleta', 'real')) && !DS.needsCaveat(r));
  check('3.3: partial sem nada faltando vira ready (parcial falso é mentira)', DS.partial(1, [], 'fonte_incompleta', 'real').status === 'ready');
  check('3.4: erro com dado anterior exige ressalva', DS.needsCaveat(DS.failed<number>('x', true, 1)));

  check('4.1: fixture nunca é descrito como dado real', DS.describe(DS.ready(1, 'fixture')) === 'Dados de exemplo');
  check('4.2: describe() de cada estado é texto não vazio (sem depender de cor)', DS.ALL_STATUSES.every((s) => {
    const sample: Record<string, DataState<number>> = {
      loading: DS.loading(), ready: DS.ready(1, 'real'), empty: DS.empty('vazio'), stale: DS.stale(1, 'd', 'r'),
      error: DS.failed('e'), offline: DS.offline(), 'permission-required': DS.permissionRequired('p', 'r'),
      'approval-required': DS.approvalRequired('r'), partial: DS.partial(1, ['a'], 'fonte_incompleta', 'real'),
    };
    return DS.describe(sample[s]).length > 0;
  }));

  // combine: sempre o pior estado honesto
  const a = DS.ready(1, 'real');
  const b = DS.ready(2, 'real');
  const sum = (x: number, y: number) => x + y;
  check('5.1: combine(ready, ready) é ready e mescla', (() => { const c = DS.combine(a, b, sum); return c.status === 'ready' && DS.dataOf(c) === 3; })());
  check('5.2: fixture contamina o todo', DS.originOf(DS.combine(a, DS.ready(2, 'fixture'), sum)) === 'fixture');
  check('5.3: loading em qualquer lado => loading', DS.combine(a, DS.loading<number>(), sum).status === 'loading');
  check('5.4: erro vence loading', DS.combine(DS.loading<number>(), DS.failed<number>('x'), sum).status === 'error');
  check('5.5: aprovação pendente vence erro', DS.combine(DS.failed<number>('x'), DS.approvalRequired<number>('r'), sum).status === 'approval-required');
  check('5.6: vazio em um lado => vazio com a razão dele', (() => { const c = DS.combine(a, DS.empty<number>('sem contas'), sum); return c.status === 'empty' && DS.describe(c) === 'sem contas'; })());
  check('5.7: parcial propaga o que falta', (() => { const c = DS.combine(a, DS.partial(2, ['faturas'], 'fonte_incompleta', 'real'), sum); return c.status === 'partial' && c.missing.includes('faturas'); })());
  check('5.8: stale propaga (nunca vira ready)', DS.combine(a, DS.stale(2, '2026-01-01', 'velho'), sum).status === 'stale');

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[data-state] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
