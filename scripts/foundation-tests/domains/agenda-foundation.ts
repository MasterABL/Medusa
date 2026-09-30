/**
 * MEDUSA FOUNDATION — Agenda: camada temporal (conflito, prioridade, buffer,
 * deslocamento, tempo livre, linha do tempo, contexto) + paridade com os
 * helpers que a Agenda do Medusa já usa (que NÃO foram alterados).
 */

import { makeChecker } from './_helpers';
import type { AgendaDomain, AgendaItem } from '../../../src/types/agenda';
import type { BufferRule, RoutineBlock, TravelLeg } from '../../../src/domains/agenda/model/temporal';
import { buildDay, phaseEntries } from '../../../src/domains/agenda/services/timeline';
import { detectConflicts, resolve } from '../../../src/domains/agenda/services/conflicts';
import { computeFreeSlots, suggestSlots } from '../../../src/domains/agenda/services/freeTime';
import { toMin, toHHmm } from '../../../src/domains/agenda/services/time';
import { createInMemoryAgendaSource } from '../../../src/domains/agenda/repository/source';
import * as Selectors from '../../../src/domains/agenda/selectors';
import { calculateFreeTimeSlots, detectTimeConflicts, layoutConflictColumns } from '../../../src/components/agenda/agendaHelpers';

const D = '2026-09-10'; // quinta-feira
const item = (id: string, start: string, end: string, domain: AgendaDomain = 'personal', o: Partial<AgendaItem> = {}): AgendaItem => ({
  id, title: id, kind: 'event', domain, categoryId: 'c', colorId: 'x', date: D, startTime: start, endTime: end,
  source: { sourceType: 'manual' }, status: 'scheduled', createdAt: D, updatedAt: D, ...o,
});
const day = (items: AgendaItem[], extra: { routine?: RoutineBlock[]; travel?: TravelLeg[]; buffers?: BufferRule[] } = {}) => buildDay({ date: D, items, ...extra });

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('agenda-foundation');

  // 1. Paridade com os helpers existentes (sem deslocamento/buffer/rotina)
  {
    const sets: AgendaItem[][] = [
      [],
      [item('a', '09:00', '10:00')],
      [item('a', '09:00', '10:30'), item('b', '10:00', '11:00'), item('c', '13:00', '14:00')],
      [item('a', '06:00', '07:00'), item('b', '22:00', '23:30')],
      [item('a', '08:00', '12:00'), item('b', '09:00', '10:00'), item('c', '11:30', '13:00')],
      [item('dia', '00:00', '00:00', 'personal', { allDay: true }), item('prazo', '10:00', '11:00', 'finance', { kind: 'deadline' }), item('x', '10:00', '11:00')],
    ];
    const parityFree = sets.every((items) => {
      const mine = computeFreeSlots(day(items).entries).map((s) => `${toHHmm(s.startMin)}-${toHHmm(s.endMin)}:${s.durationMinutes}`);
      const theirs = calculateFreeTimeSlots(items).map((s) => `${s.start}-${s.end}:${s.durationMinutes}`);
      return JSON.stringify(mine) === JSON.stringify(theirs);
    });
    check('1.1: tempo livre idêntico ao calculateFreeTimeSlots da Agenda em 6 cenários', parityFree);

    const parityConflicts = sets.every((items) => {
      const mine = detectConflicts(day(items).entries).map((c) => `${[c.a.itemId, c.b.itemId].sort().join('+')}:${c.overlapMinutes}:${toHHmm(c.startMin)}-${toHHmm(c.endMin)}`).sort();
      const theirs = detectTimeConflicts(items).map((c) => `${[c.itemA.id, c.itemB.id].sort().join('+')}:${c.overlapMinutes}:${c.start}-${c.end}`).sort();
      return JSON.stringify(mine) === JSON.stringify(theirs);
    });
    check('1.2: conflitos idênticos ao detectTimeConflicts da Agenda (mesmos pares, sobreposição e janela)', parityConflicts);

    // a ordem de prioridade da política padrão é a mesma que a Agenda usa pra distribuir colunas
    const doms: AgendaDomain[] = ['external', 'education', 'finance', 'body', 'personal', 'work'];
    const cols = layoutConflictColumns(doms.map((d) => item(d, '09:00', '10:00', d)));
    const byTheirs = doms.slice().sort((a, b) => cols.get(a)!.colIndex - cols.get(b)!.colIndex).join();
    const byMine = doms.slice().sort((a, b) => {
      const ea = day([item(a, '09:00', '10:00', a)]).entries[0];
      const eb = day([item(b, '09:00', '10:00', b)]).entries[0];
      return resolve(ea, eb).keepId === ea.id ? -1 : 1;
    }).join();
    check('1.3: a política de prioridade padrão coincide com a ordem de colunas da Agenda (work primeiro)', byTheirs === byMine && byMine.startsWith('work'));
  }

  // 2. Entradas: o que entra e o que não entra
  {
    const d = day([
      item('cancelado', '09:00', '10:00', 'personal', { status: 'cancelled' }),
      item('dia-todo', '09:00', '10:00', 'personal', { allDay: true }),
      item('prazo', '09:00', '10:00', 'finance', { kind: 'deadline' }),
      item('sem-fim', '09:00', '', 'personal', { endTime: undefined }),
      item('duracao', '11:00', '', 'personal', { endTime: undefined, durationMinutes: 45 }),
      item('invertido', '15:00', '14:00'),
      item('ilegivel', 'abc', '14:00'),
      item('outro-dia', '09:00', '10:00', 'personal', { date: '2026-09-11' }),
    ]);
    check('2.1: cancelado, dia inteiro, prazo e outro dia não ocupam faixa', !d.entries.some((e) => ['cancelado', 'dia-todo', 'prazo', 'outro-dia'].includes(e.itemId ?? '')));
    check('2.2: início + duração sem fim => fim calculado (11:00 + 45min)', d.entries.find((e) => e.itemId === 'duracao')?.endMin === toMin('11:45'));
    check('2.3: item sem fim nem duração, fim antes do início e hora ilegível viram issue com motivo (nunca somem)', d.issues.length === 3 && d.issues.some((i) => i.includes('sem horário de fim')) && d.issues.some((i) => i.includes('não é depois')) && d.issues.some((i) => i.includes('ilegível')));
    check('2.4: entradas saem ordenadas por início', d.entries.every((e, i) => i === 0 || d.entries[i - 1].startMin <= e.startMin));
  }

  // 3. Prioridade: trabalho vence estudo/inglês
  {
    const work = day([item('trabalho', '08:00', '15:00', 'work')]).entries[0];
    const study = day([item('estudo', '14:00', '16:00', 'education')]).entries[0];
    const r = resolve(work, study);
    check('3.1: trabalho > estudo quando há conflito (regra do produto preservada)', r.keepId === work.id && r.yieldId === study.id && r.rule === 'prioridade_do_dominio');
    check('3.2: a resolução é simétrica (ordem dos argumentos não importa)', resolve(study, work).keepId === work.id);
    const flexWork = day([item('trabalho-flex', '08:00', '15:00', 'work', { isFlexible: true })]).entries[0];
    check('3.3: fixo vence flexível MESMO contra trabalho (flexível cede)', resolve(flexWork, study).keepId === study.id && resolve(flexWork, study).rule === 'fixo_sobre_flexivel');
    const a = day([item('a', '09:00', '10:00', 'personal')]).entries[0];
    const b = day([item('b', '09:30', '10:30', 'personal')]).entries[0];
    check('3.4: mesmo domínio e mesma fixidez => quem começou antes', resolve(a, b).keepId === a.id && resolve(a, b).rule === 'comecou_antes');
    const c = day([item('c', '09:00', '10:00', 'personal')]).entries[0];
    check('3.5: empate total => desempate determinístico por id', resolve(a, c).rule === 'desempate_por_id' && resolve(c, a).keepId === a.id);
    check('3.6: política customizada muda quem vence, sem mexer no código', resolve(work, study, { domainOrder: ['education', 'work'] }).keepId === study.id);
    const conflicts = detectConflicts(day([item('trabalho', '08:00', '15:00', 'work'), item('estudo', '14:00', '16:00', 'education')]).entries);
    check('3.7: conflito traz sobreposição e sugestão de quem cede, sem mover nada', conflicts.length === 1 && conflicts[0].overlapMinutes === 60 && conflicts[0].resolution.yieldId === 'item:estudo');
  }

  // 4. Deslocamento: ocupa tempo, nunca é livre
  {
    const travel: TravelLeg[] = [{ id: 'onibus', date: D, startTime: '07:20', endTime: '07:50', label: 'Ônibus' }];
    const routine: RoutineBlock[] = [{ id: 'trab', label: 'Trabalho', daysOfWeek: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '15:00', domain: 'work', kind: 'rotina' }];
    const d = day([], { travel, routine });
    const free = computeFreeSlots(d.entries).map((s) => `${toHHmm(s.startMin)}-${toHHmm(s.endMin)}`);
    check('4.1: deslocamento e rotina de trabalho descontados do tempo livre (quinta): 06:00–07:20 e 15:00–23:00', free.join() === '06:00-07:20,15:00-23:00');
    check('4.2: o vão de 10 min entre ônibus e trabalho some por ser menor que o mínimo de 30 (não "reaparece")', !free.includes('07:50-08:00'));
    check('4.3: rotina só vale nos dias da semana configurados (sábado não tem trabalho)', buildDay({ date: '2026-09-12', items: [], routine }).entries.length === 0);
    const clash = detectConflicts(day([item('consulta', '07:30', '08:30')], { travel }).entries);
    check('4.4: evento durante o deslocamento é conflito HARD', clash.length === 1 && clash[0].severity === 'hard' && clash[0].overlapMinutes === 20);
    check('4.5: deslocamento inválido vira issue', day([], { travel: [{ id: 'x', date: D, startTime: '09:00', endTime: '08:00' }] }).issues.length === 1);
  }

  // 5. Buffers: não somem
  {
    const buffers: BufferRule[] = [{ appliesTo: { domain: 'work' }, beforeMinutes: 0, afterMinutes: 15 }];
    const d = day([item('reuniao', '10:00', '11:00', 'work')], { buffers });
    check('5.1: buffer de 15 min depois da reunião existe como entrada', d.entries.some((e) => e.kind === 'buffer' && e.startMin === toMin('11:00') && e.endMin === toMin('11:15')));
    const withBuf = computeFreeSlots(d.entries, { minMinutes: 1 }).map((s) => `${toHHmm(s.startMin)}-${toHHmm(s.endMin)}`);
    check('5.2: o buffer entra no cálculo de tempo livre (livre só a partir de 11:15)', withBuf.includes('11:15-23:00') && !withBuf.some((x) => x.startsWith('11:00')));
    check('5.3: ignorar buffers é opção explícita, nunca padrão', computeFreeSlots(d.entries, { minMinutes: 1, respectBuffers: false }).some((s) => toHHmm(s.startMin) === '11:00'));
    const invaded = detectConflicts(day([item('reuniao', '10:00', '11:00', 'work'), item('cafe', '11:05', '11:30', 'personal')], { buffers }).entries);
    check('5.4: compromisso que invade o buffer é conflito SOFT, com quem deve ceder', invaded.length === 1 && invaded[0].severity === 'soft' && invaded[0].overlapMinutes === 10 && invaded[0].resolution.yieldId === 'item:cafe');
    check('5.5: buffer nunca conflita com o próprio dono nem com outro buffer', (() => {
      const two = day([item('r1', '10:00', '11:00', 'work'), item('r2', '11:10', '12:00', 'work')], { buffers: [{ appliesTo: { domain: 'work' }, beforeMinutes: 15, afterMinutes: 15 }] });
      return detectConflicts(two.entries).every((c) => !(c.a.kind === 'buffer' && c.b.kind === 'buffer'));
    })());
    check('5.6: regra por item vence regra por domínio', (() => {
      const r = day([item('reuniao', '10:00', '11:00', 'work')], { buffers: [{ appliesTo: { domain: 'work' }, beforeMinutes: 0, afterMinutes: 15 }, { appliesTo: { itemId: 'reuniao' }, beforeMinutes: 0, afterMinutes: 30 }] });
      return r.entries.find((e) => e.kind === 'buffer')?.endMin === toMin('11:30');
    })());
    check('5.7: buffer não nasce de rotina/deslocamento', day([], { routine: [{ id: 't', label: 'T', daysOfWeek: [4], startTime: '08:00', endTime: '09:00', domain: 'work', kind: 'rotina' }], buffers }).entries.every((e) => e.kind !== 'buffer'));
  }

  // 6. Sugestão de horário: deslocamento e buffer descontados, dia a dia
  {
    const source = createInMemoryAgendaSource('fixture', {
      items: [item('reuniao', '09:00', '17:00', 'work'), item('amanha', '09:00', '22:00', 'work', { date: '2026-09-11' })],
      travel: [{ id: 'volta', date: D, startTime: '17:00', endTime: '17:40' }],
      buffers: [{ appliesTo: { domain: 'work' }, beforeMinutes: 0, afterMinutes: 20 }],
    });
    const s = suggestSlots(60, D, (date) => Selectors.dayInputFrom(source, date), { maxSuggestions: 2 });
    check('6.1: sugestões: manhã livre e, depois de reunião + buffer (17:00–17:20) + deslocamento (até 17:40), só a partir de 17:40', s[0].startMin === toMin('06:00') && s[1].date === D && s[1].startMin === toMin('17:40'));
    const afterTravel = suggestSlots(60, D, (date) => Selectors.dayInputFrom(source, date), { maxSuggestions: 5, fromMin: toMin('12:00')! });
    check('6.2: a partir do meio-dia, nada antes de 17:40 (reunião, buffer e deslocamento descontados)', afterTravel.filter((x) => x.date === D).every((x) => x.startMin >= toMin('17:40')!));
    check('6.3: dia totalmente ocupado é pulado', !s.some((x) => x.date === '2026-09-11' && x.startMin < toMin('22:00')!));
    check('6.4: nenhuma janela => empty (com a razão)', Selectors.selectSlotSuggestions(source, D, 24 * 60).status === 'empty');
  }

  // 7. Linha do tempo e contexto
  {
    const source = createInMemoryAgendaSource('real', {
      items: [item('reuniao', '09:00', '10:00', 'work'), item('consulta', '14:00', '15:00', 'personal')],
      travel: [{ id: 'ida', date: D, startTime: '13:30', endTime: '14:00' }],
    });
    const built = day(source.listItems(), { travel: source.listTravel() });
    const phased = phaseEntries(built.entries, toMin('11:00')!);
    check('7.1: fases: reunião passada, deslocamento é o próximo, consulta futura', phased.find((p) => p.entry.itemId === 'reuniao')?.phase === 'passado' && phased.find((p) => p.entry.kind === 'deslocamento')?.phase === 'proximo' && phased.find((p) => p.entry.itemId === 'consulta')?.phase === 'futuro');
    check('7.2: durante o compromisso a fase é "agora"', phaseEntries(built.entries, toMin('09:30')!).find((p) => p.entry.itemId === 'reuniao')?.phase === 'agora');

    const ctx = Selectors.selectContext(source, D, toMin('11:00')!);
    check('7.3: contexto: sem atual, próximo é o deslocamento (começa 13:30)', ctx.status === 'ready' && ctx.data.current === undefined && ctx.data.next?.kind === 'deslocamento');
    check('7.4: folga real até o próximo = 150 min (11:00→13:30)', ctx.status === 'ready' && ctx.data.freeUntilNextMinutes === 150);
    const inMeeting = Selectors.selectContext(source, D, toMin('09:30')!);
    check('7.5: no meio da reunião, current preenchido', inMeeting.status === 'ready' && inMeeting.data.current?.itemId === 'reuniao');
    check('7.6: depois do último compromisso não há próximo nem folga calculada', (() => { const c = Selectors.selectContext(source, D, toMin('20:00')!); return c.status === 'ready' && c.data.next === undefined && c.data.freeUntilNextMinutes === undefined; })());
    check('7.7: origem do dado viaja até o contexto', ctx.status === 'ready' && ctx.origin === 'real');
  }

  // 8. Estados de dado
  {
    const empty = createInMemoryAgendaSource('manual');
    check('8.1: dia sem nada => empty', Selectors.selectDay(empty, D).status === 'empty' && Selectors.selectContext(empty, D, 600).status === 'empty');
    const dirty = createInMemoryAgendaSource('manual', { items: [item('ok', '09:00', '10:00'), item('quebrado', '11:00', '10:00')] });
    const s = Selectors.selectDay(dirty, D);
    check('8.2: item inválido torna o dia PARCIAL e diz qual (não esconde o que falta)', s.status === 'partial' && s.missing.length === 1 && s.data.entries.length === 1);
    check('8.3: dia limpo com dado => ready', Selectors.selectDay(createInMemoryAgendaSource('manual', { items: [item('ok', '09:00', '10:00')] }), D).status === 'ready');
    check('8.4: fixture nunca passa por real', (() => { const r = Selectors.selectDay(createInMemoryAgendaSource('fixture', { items: [item('ok', '09:00', '10:00')] }), D); return r.status === 'ready' && r.origin === 'fixture'; })());
    check('8.5: conflitos aparecem no resumo do dia', (() => { const r = Selectors.selectDay(createInMemoryAgendaSource('manual', { items: [item('a', '09:00', '10:00', 'work'), item('b', '09:30', '10:30', 'education')] }), D); return r.status === 'ready' && r.data.conflicts.length === 1; })());
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[agenda-foundation] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
