/**
 * MEDUSA FOUNDATION — Espiritual: memorização (SM-2), gratidão, histórico,
 * presença sem pontuação e fluxo do dia.
 */

import { makeChecker } from './_helpers';
import { createInMemorySpiritualRepository } from '../../../src/domains/spiritual/repository/inMemory';
import { createInMemorySpiritualMemoryRepository } from '../../../src/domains/spiritual/repository/memory';
import * as Srs from '../../../src/domains/spiritual/services/memorySrs';
import * as Presence from '../../../src/domains/spiritual/services/presence';
import * as Selectors from '../../../src/domains/spiritual/selectors';
import { planFromChapters, initProgress, completeEntry } from '../../../src/domains/spiritual/services/readingPlanEngine';
import { GUILT_WORDS } from '../../../src/domains/spiritual/services/practiceEngine';
import type { ScriptureMemoryCard } from '../../../src/domains/spiritual/model/memory';

const TODAY = '2026-09-10';
const NOW = '2026-09-10T08:00:00.000Z';
const card = (id = 'c1', ref = { book: 'PSA', chapter: 23, verseStart: 1 }): ScriptureMemoryCard => Srs.newMemoryCard({ id, reference: ref, today: TODAY, now: NOW });

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('spiritual-foundation');

  // 1. SM-2
  {
    const c0 = card();
    check('1.1: cartão novo vence HOJE, ease 2.5, sem repetições', c0.srs.dueDate === TODAY && c0.srs.ease === 2.5 && c0.srs.repetitions === 0);
    let s = Srs.nextSrsState(c0.srs, 'facil', TODAY, NOW);
    check('1.2: 1ª repetição => 1 dia, ease sobe (q=5: +0.1)', s.intervalDays === 1 && s.ease === 2.6 && s.repetitions === 1 && s.dueDate === '2026-09-11');
    s = Srs.nextSrsState(s, 'facil', '2026-09-11', NOW);
    check('1.3: 2ª repetição => 6 dias', s.intervalDays === 6 && s.repetitions === 2);
    s = Srs.nextSrsState(s, 'facil', '2026-09-17', NOW);
    check('1.4: 3ª => round(6 × ease atualizado 2.8) = 17', s.intervalDays === 17 && s.ease === 2.8);
    const missed = Srs.nextSrsState(s, 'errei', '2026-10-04', NOW);
    check('1.5: "errei" zera repetições, volta pra amanhã, conta a falha', missed.repetitions === 0 && missed.intervalDays === 1 && missed.dueDate === '2026-10-05' && missed.lapses === 1);
    check('1.6: "errei" não reseta o ease, só aplica a fórmula (2.8 → 2.0)', missed.ease === 2.0);
    check('1.7: ease nunca passa de baixo de 1.3', (() => { let x = c0.srs; for (let i = 0; i < 10; i += 1) x = Srs.nextSrsState(x, 'errei', TODAY, NOW); return x.ease === 1.3; })());
    check('1.8: "difícil" (q=3) conta como acerto mas não sobe o ease (2.5 → 2.36)', (() => { const x = Srs.nextSrsState(c0.srs, 'dificil', TODAY, NOW); return x.repetitions === 1 && x.ease === 2.36; })());
    check('1.9: revisar devolve cartão novo e log, sem mutar o original', (() => { const r = Srs.reviewMemoryCard(c0, 'bom', TODAY, NOW); return r.card !== c0 && c0.srs.repetitions === 0 && r.log.grade === 'bom' && r.log.intervalAfter === 1; })());
    check('1.10: cartão arquivado não é revisado', (() => { try { Srs.reviewMemoryCard({ ...c0, status: 'archived' }, 'bom', TODAY, NOW); return false; } catch { return true; } })());
  }

  // 2. Fila: vencidos primeiro, sem inflar
  {
    const a = { ...card('a'), srs: { ...card('a').srs, dueDate: '2026-09-01' } };
    const b = { ...card('b'), srs: { ...card('b').srs, dueDate: '2026-09-08' } };
    const future = { ...card('f'), srs: { ...card('f').srs, dueDate: '2026-09-12' } };
    const archived = { ...card('z'), status: 'archived' as const, srs: { ...card('z').srs, dueDate: '2026-08-01' } };
    const q = Srs.dueCards([b, future, archived, a], TODAY);
    check('2.1: só ativos vencidos, os mais atrasados primeiro', q.map((d) => d.card.id).join() === 'a,b' && q[0].overdueDays === 9);
    check('2.2: limite evita fila-cobrança', Srs.dueCards([a, b], TODAY, 1).length === 1 && Srs.dueCards([a, b], TODAY, 0).length === 0);
    check('2.3: contagem dos próximos dias', Srs.upcomingCount([a, b, future], TODAY, 7) === 1);
  }

  // 3. Presença: sem streak, sem culpa
  {
    const first = Presence.summarizePresence([], TODAY);
    check('3.1: nunca houve presença => primeira_vez, acolhedor', first.stance === 'primeira_vez' && first.daysSincePresence === null && !first.presentToday);
    const today = Presence.summarizePresence(['2026-09-10', '2026-09-09'], TODAY);
    check('3.2: presente hoje => seguindo', today.stance === 'seguindo' && today.presentToday && today.presentDaysInWindow === 2);
    check('3.3: 5 dias => retomar_leve', Presence.summarizePresence(['2026-09-05'], TODAY).stance === 'retomar_leve');
    check('3.4: 30 dias => retomar_com_calma', Presence.summarizePresence(['2026-08-11'], TODAY).stance === 'retomar_com_calma');
    check('3.5: datas repetidas contam um dia; futuras são ignoradas', Presence.summarizePresence(['2026-09-10', '2026-09-10', '2026-09-20'], TODAY).presentDaysInWindow === 1);
    check('3.6: janela respeitada (dia 15 atrás fora da janela de 14)', Presence.summarizePresence(['2026-08-26'], TODAY).presentDaysInWindow === 0);

    const outputs = [first, today, Presence.summarizePresence(['2026-09-05'], TODAY), Presence.summarizePresence(['2026-08-11'], TODAY)];
    check('3.7: NENHUMA mensagem usa linguagem de culpa (mesma lista do motor de práticas)', outputs.every((o) => !GUILT_WORDS.some((w) => o.message.toLowerCase().includes(w))));
    const keys = Object.keys(today).join(' ').toLowerCase();
    check('3.8: o contrato não tem streak, pontos, nível, selo, ranking ou recompensa', !/streak|sequencia|points|pontos|xp|level|nivel|badge|selo|rank|reward|recompensa/.test(keys));
  }

  // 4. Histórico: sem conteúdo privado
  {
    const spiritual = createInMemorySpiritualRepository();
    const memory = createInMemorySpiritualMemoryRepository('manual');
    const SECRET = 'segredo-que-nao-pode-vazar';
    spiritual.saveReflection({ id: 'r1', content: SECRET, createdAt: '2026-09-09T20:00:00Z', visibility: 'private' });
    spiritual.savePrayerIntention({ id: 'p1', content: SECRET, status: 'open', createdAt: '2026-09-08T07:00:00Z' });
    memory.saveGratitude({ id: 'g1', date: TODAY, content: SECRET, createdAt: '2026-09-10T07:00:00Z', private: true });
    spiritual.savePractice({ id: 'pr1', type: 'oracao', label: 'Oração da manhã', completedAt: '2026-09-10T06:30:00Z' });
    const plan = planFromChapters({ id: 'plan', title: 'NT', chapters: [{ book: 'JHN', chapter: 1 }, { book: 'JHN', chapter: 2 }], startDate: '2026-09-09', createdAt: NOW });
    spiritual.saveReadingPlan(plan);
    spiritual.saveReadingProgress(completeEntry(plan, initProgress(plan, NOW), 'plan_e1', '2026-09-09T21:00:00Z'));
    const c = card();
    memory.saveCard(c);
    const rev = Srs.reviewMemoryCard(c, 'bom', TODAY, '2026-09-10T09:00:00Z');
    memory.saveCard(rev.card);
    memory.appendReview(rev.log);

    const history = Selectors.selectHistory(spiritual, memory);
    check('4.1: histórico unificado pronto, origem derivada', history.status === 'ready' && history.origin === 'derived');
    const items = history.status === 'ready' ? history.data : [];
    check('4.2: 6 tipos de registro aparecem (prática, reflexão, oração, gratidão, leitura, memorização)', new Set(items.map((i) => i.kind)).size === 6);
    check('4.3: conteúdo privado NUNCA aparece em nenhum campo', !JSON.stringify(items).includes(SECRET));
    check('4.4: itens com conteúdo privado são sinalizados', items.filter((i) => i.hasPrivateContent).length === 3);
    check('4.5: mais recente primeiro', items.every((it, i) => i === 0 || items[i - 1].at >= it.at));
    check('4.6: leitura carrega a referência do plano', items.some((i) => i.kind === 'leitura' && i.label.includes('João 1')));
    check('4.7: metadado de gratidão expõe só o tamanho', (() => { const m = memory.listGratitudeMetadata()[0]; return m.contentLength === SECRET.length && !('content' in m); })());
    check('4.8: histórico vazio => empty', Selectors.selectHistory(createInMemorySpiritualRepository(), createInMemorySpiritualMemoryRepository()).status === 'empty');

    const presence = Selectors.selectPresence(spiritual, memory, TODAY);
    check('4.9: presença derivada de todas as fontes (hoje houve prática/gratidão/memorização)', presence.status === 'ready' && presence.data.presentToday);
    check('4.10: nenhuma presença ainda => ready (estado acolhedor), não erro', (() => { const p = Selectors.selectPresence(createInMemorySpiritualRepository(), createInMemorySpiritualMemoryRepository(), TODAY); return p.status === 'ready' && p.data.stance === 'primeira_vez'; })());

    // 5. Fluxo do dia
    const flowEmpty = Selectors.selectDayFlow(createInMemorySpiritualRepository(), createInMemorySpiritualMemoryRepository(), TODAY);
    check('5.1: fluxo segue a ordem presença→versículo→leitura→prática→memória→continuidade', flowEmpty.status === 'partial' && flowEmpty.data.steps.map((s) => s.id).join() === 'presenca,versiculo,leitura,pratica,memoria,continuidade');
    check('5.2: sem versículo do dia, o passo é "indisponível" e o estado é parcial (não some)', flowEmpty.status === 'partial' && flowEmpty.data.steps[1].status === 'indisponivel' && flowEmpty.missing.includes('versiculo'));
    check('5.3: sem plano/práticas/cartões => passos "não aplicável", nunca "pendente"', flowEmpty.status === 'partial' && ['leitura', 'pratica', 'memoria'].every((id) => flowEmpty.data.steps.find((s) => s.id === id)?.status === 'nao_aplicavel'));

    spiritual.saveDailyVerse({ date: TODAY, reference: { book: 'PSA', chapter: 23, verseStart: 1 }, source: 'curated_pool' });
    const flow = Selectors.selectDayFlow(spiritual, memory, TODAY);
    const step = (id: string) => (flow.status === 'ready' ? flow.data.steps.find((s) => s.id === id)?.status : undefined);
    check('5.4: com versículo e atividade hoje, fluxo fica ready', flow.status === 'ready');
    check('5.5: presença feita, versículo disponível, memória feita (revisou hoje, nada vencido)', step('presenca') === 'feito' && step('versiculo') === 'disponivel' && step('memoria') === 'feito');
    check('5.6: leitura do plano ainda disponível hoje (leu ontem, nada hoje)', step('leitura') === 'disponivel');
    check('5.7: versículo não carrega texto se nenhum provedor devolveu', flow.status === 'ready' && flow.data.steps[1].detail?.hasText === false);
  }

  // 6. Memória: selector
  {
    const memory = createInMemorySpiritualMemoryRepository('fixture');
    check('6.1: sem cartões => empty', Selectors.selectMemoryQueue(memory, TODAY).status === 'empty');
    memory.saveCard(card('x'));
    const q = Selectors.selectMemoryQueue(memory, TODAY);
    check('6.2: com cartão vencido => ready, origem fixture preservada', q.status === 'ready' && q.data.due.length === 1 && q.origin === 'fixture');
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[spiritual-foundation] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
