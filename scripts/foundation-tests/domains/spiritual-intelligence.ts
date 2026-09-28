/**
 * MEDUSA — Espiritual (inteligência): Bíblia, leitura, estudo, propósito,
 * práticas, versículo do dia, Agenda/Hoje, contexto de IA e privacidade.
 *
 * Fixtures de texto bíblico NUNCA usam escritura real ou inventada: o provedor
 * de teste devolve um marcador "[texto de teste]".
 */

import { resetAll, seedTrust, makeChecker } from './_helpers';
import * as EventBus from '../../../src/foundation/eventBus';
import { getTodayContextSnapshot } from '../../../src/foundation/hojeContext';
import {
  CANON_66,
  DailyVerse as DailyVerseService,
  PracticeEngine,
  ReadingPlanEngine,
  SpiritualAI,
  SpiritualAgendaSuggestions,
  SpiritualApi,
  SpiritualHojeIntelligence,
  SpiritualPrivacy,
  StudyEngine,
  addItemToStudy,
  completeReadingEntry,
  concludeStudyUseCase,
  createInMemorySpiritualRepository,
  createPurpose,
  createReadingPlan,
  definePractice,
  formatReference,
  getReadingState,
  parseReference,
  pickDailyVerse,
  proposePracticeToAgenda,
  recordPrayerIntention,
  recordPractice,
  resumeReadingPlan,
  saveNewStudy,
  validateReference,
} from '../../../src/domains/spiritual';
import type { BibleTextProvider, PracticeDefinition, SpiritualPurpose, Study, StudyItem } from '../../../src/domains/spiritual';
import { deserializeStudy, serializeStudy } from '../../../src/domains/spiritual/serialization';
import { createReflection } from '../../../src/domains/spiritual/useCases/createReflection';
import { createFixtureReflection } from '../../../src/domains/spiritual/fixtures';
import { defineSource, createInMemoryGuardianRepository, createRemediationRegistry, runGuardianCycle, spiritualPrivacyAuditor, GuardianDomainApi } from '../../../src/domains/guardian';

const NOW = new Date('2026-03-10T12:00:00.000Z');
const iso = (d: string) => `${d}T08:00:00.000Z`;

const purpose = (over: Partial<SpiritualPurpose> = {}): SpiritualPurpose => ({ id: 'pur1', label: 'Crescer em paciência', themes: ['paciência'], status: 'active', createdAt: iso('2026-03-01'), ...over });
const prayerDef = (over: Partial<PracticeDefinition> = {}): PracticeDefinition => ({
  id: 'def_oracao',
  kind: 'oracao',
  intention: 'pedir calma para a semana difícil do meu trabalho',
  purposeId: 'pur1',
  frequency: { timesPerWeek: 7 },
  durationMinutes: 10,
  status: 'active',
  priority: 'alta',
  preferredWindowLabels: ['manha'],
  createdAt: iso('2026-03-01'),
  ...over,
});

const testProvider: BibleTextProvider = {
  id: 'provider-de-teste',
  async getPassage(ref, translationId) {
    return ref.book === 'PSA' ? { text: `[texto de teste ${formatReference(ref)}]`, translationId } : undefined;
  },
};

function item(over: Partial<StudyItem> & Pick<StudyItem, 'id' | 'kind' | 'origin'>): StudyItem {
  return { content: 'conteúdo', createdAt: iso('2026-03-10'), private: false, ...over };
}

export async function run(): Promise<{ total: number; fails: number }> {
  const { check, result } = makeChecker('espiritual-inteligência');
  const throws = (fn: () => unknown, ctor?: new (...a: never[]) => Error): boolean => {
    try {
      fn();
      return false;
    } catch (e) {
      return ctor ? e instanceof ctor : true;
    }
  };

  // 1. Bíblia
  resetAll();
  {
    check('1.1: o cânone de 66 livros soma 1189 capítulos', CANON_66.length === 66 && CANON_66.reduce((n, b) => n + b.chapters, 0) === 1189);
    const ref = parseReference('JHN 3:16-18');
    check('1.2: parse/format de referência (com nome legível)', ref.book === 'JHN' && ref.chapter === 3 && ref.verseStart === 16 && ref.verseEnd === 18 && formatReference(ref, { names: true }) === 'João 3:16-18');
    check('1.3: capítulo inexistente é rejeitado (Salmos 151)', throws(() => parseReference('PSA 151')));
    check('1.4: livro fora do cânone de 66 é rejeitado, mas aceito em cânone "open" (não impõe tradição)', throws(() => validateReference({ book: 'TOB', chapter: 1 })) && !throws(() => validateReference({ book: 'TOB', chapter: 1 }, 'open')));
    check('1.5: versículo final antes do inicial é rejeitado', throws(() => validateReference({ book: 'PSA', chapter: 23, verseStart: 5, verseEnd: 2 })));
  }

  // 2. Práticas: definição, continuidade e linguagem sem culpa
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    createPurpose(repo, purpose());
    check('2.1: prática sem intenção é rejeitada', throws(() => definePractice(repo, prayerDef({ intention: ' ' }))));
    check('2.2: prática ligada a propósito inexistente é rejeitada', throws(() => definePractice(repo, prayerDef({ purposeId: 'nao_existe' }))));
    definePractice(repo, prayerDef());

    const def = repo.getPracticeDefinition('def_oracao')!;
    const done = (d: string) => ({ id: `p_${d}`, type: 'oracao' as const, label: 'Oração', completedAt: iso(d), definitionId: 'def_oracao' });
    const at = (completions: ReturnType<typeof done>[]) => PracticeEngine.practiceContinuity(def, completions, NOW);

    check('2.3: sem nenhum registro → "sem_registro", convite para começar', at([]).status === 'sem_registro' && at([]).message.includes('começar hoje'));
    check('2.4: registrada hoje → em ritmo e não "devida hoje"', at([done('2026-03-10')]).status === 'em_ritmo' && !at([done('2026-03-10')]).dueToday);
    const short = at([done('2026-03-08')]);
    check('2.5: alguns dias sem praticar → pausa curta, com convite "Quer retomar hoje?"', short.status === 'pausa_curta' && short.message === 'Você ficou alguns dias sem orar. Quer retomar hoje?');
    const long = at([done('2026-02-01')]);
    check('2.6: muito tempo → pausa longa, convite gentil', long.status === 'pausa_longa' && long.message.includes('sem pressa'));
    check('2.7: pausada e arquivada não cobram nada', PracticeEngine.practiceContinuity({ ...def, status: 'paused' }, [], NOW).status === 'pausada' && PracticeEngine.practiceContinuity({ ...def, status: 'archived' }, [], NOW).status === 'arquivada');

    const allMessages = [at([]), at([done('2026-03-10')]), short, long, PracticeEngine.practiceContinuity({ ...def, status: 'paused' }, [], NOW), PracticeEngine.practiceContinuity({ ...def, kind: 'leitura' }, [done('2026-03-05')], NOW)].map((c) => c.message.toLowerCase());
    check('2.8: nenhuma mensagem de continuidade usa culpa ("falhou", "perdeu", "streak"...)', allMessages.every((m) => PracticeEngine.GUILT_WORDS.every((w) => !m.includes(w))));
    check('2.9: frequência em dias específicos só é "devida" nesses dias', !PracticeEngine.practiceContinuity({ ...def, frequency: { days: [1] } }, [], NOW).dueToday); // 10/03/2026 é terça (2)
    check('2.10: sugestão de momento respeita a janela preferida, ou explica que não há janela', PracticeEngine.suggestPrayerMoment(def, ['tarde', 'manha']).windowLabel === 'manha' && PracticeEngine.suggestPrayerMoment(def, []).windowLabel === undefined);
  }

  // 3. Plano de leitura: posição, atraso, continuidade, retomada
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    const plan = ReadingPlanEngine.planFromChapters({ id: 'plano_salmos', title: 'Salmos em 7 dias', chapters: [1, 2, 3, 4, 5, 6, 7].map((c) => ({ book: 'PSA', chapter: c })), startDate: '2026-03-01', createdAt: iso('2026-03-01') });
    createReadingPlan(repo, plan, iso('2026-03-01'));
    const e = (n: number) => plan.entries[n - 1].id;

    const s0 = getReadingState(repo, plan.id, '2026-02-28');
    check('3.1: antes da data de início → "nao_iniciado"', s0.status === 'nao_iniciado' && s0.dueCount === 0);

    const s3 = getReadingState(repo, plan.id, '2026-03-03');
    check('3.2: no dia 3 sem ler nada → 2 leituras ficaram para depois, hoje é o Salmo 3', s3.status === 'ficou_para_tras' && s3.behindBy === 2 && s3.todayEntry?.id === e(3) && s3.missed.length === 2);
    check('3.3: a posição e o que vem depois são conhecidos (próximo = o 1º não lido)', s3.nextEntry?.id === e(1) && s3.upNext.length === 3);

    completeReadingEntry(repo, { planId: plan.id, entryId: e(1), completedAt: iso('2026-03-01'), today: '2026-03-01' });
    completeReadingEntry(repo, { planId: plan.id, entryId: e(2), completedAt: iso('2026-03-02'), today: '2026-03-02' });
    const s3b = completeReadingEntry(repo, { planId: plan.id, entryId: e(3), completedAt: iso('2026-03-03'), today: '2026-03-03' });
    check('3.4: lendo em dia → "em_dia", com mensagem de hoje', s3b.status === 'em_dia' && s3b.message.includes('em dia'));
    check('3.5: completar duas vezes a mesma entrada é idempotente e emite UM evento', (() => { completeReadingEntry(repo, { planId: plan.id, entryId: e(3), completedAt: iso('2026-03-03'), today: '2026-03-03' }); return repo.getReadingProgress(plan.id)!.completed.length === 3 && EventBus.getHistory({ domain: 'spiritual', type: 'READING_ENTRY_COMPLETED' }).length === 3; })());
    check('3.6: o evento carrega só ids e contagens', JSON.stringify(EventBus.getHistory({ domain: 'spiritual', type: 'READING_ENTRY_COMPLETED' })[0].payload) === JSON.stringify({ planId: plan.id, entryId: e(1), completedCount: 1, total: 7 }));

    const late = getReadingState(repo, plan.id, '2026-03-08');
    check('3.7: vários dias sem ler → "retomada_sugerida" com convite, sem culpa', late.status === 'retomada_sugerida' && late.message.includes('Quer retomar hoje') && PracticeEngine.GUILT_WORDS.every((w) => !late.message.toLowerCase().includes(w)));
    check('3.8: dias desde a última leitura são conhecidos', late.daysSinceLastRead === 5 && late.lastReadDate === '2026-03-03');

    const resumed = resumeReadingPlan(repo, { planId: plan.id, today: '2026-03-08' });
    check('3.9: retomar move a âncora: a leitura de hoje é a próxima não lida (Salmo 4) e o estado volta a "em_dia"', resumed.status === 'em_dia' && resumed.todayEntry?.id === e(4));
    check('3.10: retomar NÃO apaga o histórico', repo.getReadingProgress(plan.id)!.completed.length === 3 && repo.getReadingProgress(plan.id)!.resumedAt === '2026-03-08');

    const paused = ReadingPlanEngine.pausePlan(repo.getReadingProgress(plan.id)!, '2026-03-09');
    check('3.11: pausa congela o plano (sem atraso acumulando)', ReadingPlanEngine.computeReadingState(plan, paused, '2026-03-30').status === 'pausado');
    check('3.12: entrada de outro plano é rejeitada', throws(() => completeReadingEntry(repo, { planId: plan.id, entryId: 'x', completedAt: iso('2026-03-08'), today: '2026-03-08' })));

    let progress = repo.getReadingProgress(plan.id)!;
    for (let n = 4; n <= 7; n += 1) progress = ReadingPlanEngine.completeEntry(plan, progress, e(n), iso('2026-03-09'));
    check('3.13: todas lidas → "concluido"', ReadingPlanEngine.computeReadingState(plan, progress, '2026-03-10').status === 'concluido');
    check('3.14: plano com referência inválida é rejeitado na criação', throws(() => ReadingPlanEngine.planFromChapters({ id: 'x', title: 'x', chapters: [{ book: 'PSA', chapter: 200 }], startDate: '2026-03-01', createdAt: iso('2026-03-01') })));
  }

  // 4. Estudo: texto × IA × reflexão pessoal
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    saveNewStudy(repo, StudyEngine.startStudy({ id: 'est1', reference: { book: 'PSA', chapter: 23 }, topic: 'confiança', question: 'O que significa não ter falta?', createdAt: iso('2026-03-10') }));
    const SECRET = 'minha reflexao pessoal muito intima sobre esta semana';
    addItemToStudy(repo, 'est1', item({ id: 'i1', kind: 'scripture_text', origin: 'scripture', content: '[texto de teste PSA 23]', reference: { book: 'PSA', chapter: 23 }, translationId: 'teste' }));
    addItemToStudy(repo, 'est1', item({ id: 'i2', kind: 'ai_explanation', origin: 'ai', content: 'Contexto histórico geral do salmo.', aiDisclosure: { generatedByAi: true, isNotSpiritualAuthority: true } }));
    addItemToStudy(repo, 'est1', item({ id: 'i3', kind: 'cross_reference', origin: 'system', content: 'ver também', reference: { book: 'JHN', chapter: 10 } }));
    addItemToStudy(repo, 'est1', item({ id: 'i4', kind: 'user_reflection', origin: 'user', content: SECRET, private: true }));

    const bad = (i: StudyItem) => throws(() => addItemToStudy(repo, 'est1', i), StudyEngine.StudyError);
    check('4.1: texto bíblico sem tradução é rejeitado', bad(item({ id: 'b1', kind: 'scripture_text', origin: 'scripture', reference: { book: 'PSA', chapter: 23 } })));
    check('4.2: texto bíblico com origem "ai" é rejeitado (não mistura escritura com explicação)', bad(item({ id: 'b2', kind: 'scripture_text', origin: 'ai', reference: { book: 'PSA', chapter: 23 }, translationId: 't' })));
    check('4.3: explicação de IA sem a marca de IA é rejeitada', bad(item({ id: 'b3', kind: 'ai_explanation', origin: 'ai' })));
    check('4.4: reflexão pessoal não-privada é rejeitada', bad(item({ id: 'b4', kind: 'user_reflection', origin: 'user', private: false })));
    check('4.5: reflexão pessoal com origem "ai" é rejeitada', bad(item({ id: 'b5', kind: 'user_reflection', origin: 'ai', private: true })));
    check('4.6: interpretação precisa declarar de quem é', bad(item({ id: 'b6', kind: 'interpretation', origin: 'system' })));

    const summary = SpiritualApi.getStudySummaries(repo)[0];
    check('4.7: o resumo público conta itens por tipo e NUNCA carrega conteúdo do usuário', summary.itemCounts.user_reflection === 1 && !JSON.stringify(summary).includes(SECRET) && summary.publicItemCount === 3);

    const concluded = concludeStudyUseCase(repo, 'est1', {
      conclusion: item({ id: 'c1', kind: 'conclusion', origin: 'user', content: 'minha conclusão pessoal sobre confiança', private: true }),
      nextExploration: item({ id: 'n1', kind: 'next_exploration', origin: 'system', content: 'Ler João 10 e comparar as imagens de pastor.' }),
      concludedAt: iso('2026-03-10'),
    });
    check('4.8: concluir exige a conclusão e registra a próxima exploração', concluded.status === 'concluded' && concluded.items.some((i) => i.kind === 'next_exploration'));
    check('4.9: estudo concluído não recebe novos itens', bad(item({ id: 'late', kind: 'question', origin: 'system' })));
    const event = EventBus.getHistory({ domain: 'spiritual', type: 'STUDY_CONCLUDED' })[0];
    check('4.10: o evento de conclusão traz só a referência (sem conclusão/reflexão)', JSON.stringify(event.payload) === JSON.stringify({ studyId: 'est1', reference: 'PSA 23' }));
    const q = StudyEngine.studyQuestionTemplates({ book: 'PSA', chapter: 23 });
    check('4.11: perguntas por TEMPLATE (observação/interpretação/aplicação), rotuladas como template — não IA', q.length === 5 && q.every((x) => x.source === 'template') && new Set(q.map((x) => x.stage)).size === 3);
    check('4.12: estudo restaurado é revalidado item a item', throws(() => deserializeStudy(serializeStudy({ ...concluded, items: [...concluded.items, item({ id: 'z', kind: 'user_reflection', origin: 'user', private: false })] }))) && deserializeStudy(serializeStudy(concluded)).id === 'est1');
  }

  // 5. Propósito: ligação e continuidade (sem pontos)
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    createPurpose(repo, purpose());
    const inputs = () => ({
      definitions: repo.listPracticeDefinitions(),
      practices: repo.listPractices(),
      studies: repo.listStudies(),
      plans: repo.listReadingPlans(),
      progresses: repo.listReadingPlans().flatMap((p) => repo.getReadingProgress(p.id) ?? []),
      goals: repo.listGoals(),
    });
    const p0 = SpiritualApi.getPurposeContinuities(repo, NOW)[0];
    check('5.1: propósito sem nada ligado → convite a escolher um primeiro passo', p0.status === 'sem_atividade_registrada' && p0.message.includes('primeiro passo'));

    definePractice(repo, prayerDef());
    recordPractice(repo, { id: 'pr1', type: 'oracao', label: 'Oração', completedAt: iso('2026-03-09'), definitionId: 'def_oracao' }, NOW.toISOString());
    const plan = ReadingPlanEngine.planFromChapters({ id: 'pl', title: 'Provérbios', chapters: [{ book: 'PRO', chapter: 1 }, { book: 'PRO', chapter: 2 }], startDate: '2026-03-09', purposeId: 'pur1', createdAt: iso('2026-03-09') });
    createReadingPlan(repo, plan, iso('2026-03-09'));
    completeReadingEntry(repo, { planId: 'pl', entryId: plan.entries[0].id, completedAt: iso('2026-03-09'), today: '2026-03-09' });
    saveNewStudy(repo, StudyEngine.startStudy({ id: 's_pur', reference: { book: 'PRO', chapter: 3 }, purposeId: 'pur1', createdAt: iso('2026-03-08') }));

    const p1 = SpiritualApi.getPurposeContinuities(repo, NOW)[0];
    check('5.2: prática, leitura e estudo ligados ao propósito contam como continuidade', p1.status === 'ativo' && p1.linked.definitions === 1 && p1.linked.plans === 1 && p1.linked.studies === 1 && p1.activityInWindow.practices === 1 && p1.activityInWindow.readingEntries === 1);
    check('5.3: continuidade descreve o caminho, sem pontos/medalhas', !/ponto|medalha|nível|xp/i.test(p1.message));
    const far = new Date('2026-04-30T12:00:00.000Z');
    check('5.4: muito tempo sem atividade → "quieto", com convite simples', SpiritualApi.getPurposeContinuities(repo, far)[0].status === 'quieto' && SpiritualApi.getPurposeContinuities(repo, far)[0].message.includes('retomar com algo simples'));
    void inputs;
  }

  // 6. Sugestões: propósito influencia Hoje/Agenda; prioridade espiritual
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    createPurpose(repo, purpose());
    createPurpose(repo, purpose({ id: 'pur2', label: 'Serviço', status: 'paused' }));
    definePractice(repo, prayerDef());
    definePractice(repo, prayerDef({ id: 'def_sil', kind: 'silencio', purposeId: undefined, priority: 'normal', frequency: { timesPerWeek: 7 }, intention: 'silêncio para desacelerar' }));
    definePractice(repo, prayerDef({ id: 'def_pausado', kind: 'leitura', purposeId: 'pur2', priority: 'alta', intention: 'leitura ligada a propósito pausado' }));
    const view = SpiritualApi.getTodayView(repo, NOW);
    check('6.1: o Hoje recebe no máximo 3 itens compactos', view.items.length <= 3 && view.items.length > 0);
    check('6.2: prioridade espiritual "alta" vem primeiro', view.items[0].refId === 'def_oracao' && view.items[0].priority === 'alta');
    check('6.3: prática ligada a propósito PAUSADO não gera sugestão', !view.items.some((i) => i.refId === 'def_pausado'));
    check('6.4: o Hoje nunca carrega a intenção do usuário', !JSON.stringify(view).includes('semana difícil') && !JSON.stringify(view).includes('desacelerar'));
  }

  // 7. Versículo do dia
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    const cands = ['PSA 23', 'PRO 3:5-6', 'ISA 41:10', 'JHN 14:27'].map((r) => ({ reference: parseReference(r), source: 'curated_pool' as const }));
    check('7.1: sem candidatos, NÃO fabrica versículo (null)', DailyVerseService.selectDailyVerse({ date: '2026-03-10', userSeed: 'u', candidates: [], recent: [] }) === null);
    const a = DailyVerseService.selectDailyVerse({ date: '2026-03-10', userSeed: 'u', candidates: cands, recent: [] })!;
    const b = DailyVerseService.selectDailyVerse({ date: '2026-03-10', userSeed: 'u', candidates: cands, recent: [] })!;
    check('7.2: escolha determinística por data+usuário', formatReference(a.reference) === formatReference(b.reference));
    const recent = cands.slice(0, 3).map((c, i) => ({ date: `2026-03-0${i + 5}`, reference: c.reference, source: 'curated_pool' as const }));
    const c = DailyVerseService.selectDailyVerse({ date: '2026-03-10', userSeed: 'u', candidates: cands, recent })!;
    check('7.3: evita repetir o que saiu recentemente', formatReference(c.reference) === 'JHN 14:27');
    const allRecent = DailyVerseService.selectDailyVerse({ date: '2026-03-10', userSeed: 'u', candidates: cands, recent: cands.map((x, i) => ({ date: `2026-03-0${i + 1}`, reference: x.reference, source: 'curated_pool' as const })) });
    check('7.4: se tudo é recente, repete em vez de não mostrar nada', allRecent !== null);
    check('7.5: candidato inválido é descartado', DailyVerseService.selectDailyVerse({ date: '2026-03-10', userSeed: 'u', candidates: [{ reference: { book: 'PSA', chapter: 999 }, source: 'curated_pool' }], recent: [] }) === null);
    const planVerse = DailyVerseService.selectDailyVerse({ date: '2026-03-10', userSeed: 'u', candidates: cands, planToday: { reference: parseReference('PSA 5'), context: 'Leitura de hoje' }, recent: [] })!;
    check('7.6: a leitura de hoje do plano tem prioridade e o versículo declara essa origem', planVerse.source === 'reading_plan' && formatReference(planVerse.reference) === 'PSA 5');
    const noText = await DailyVerseService.attachVerseText(a, undefined, 'teste');
    const withText = await DailyVerseService.attachVerseText({ ...a, reference: parseReference('PSA 23') }, testProvider, 'teste');
    const missing = await DailyVerseService.attachVerseText({ ...a, reference: parseReference('JHN 3:16') }, testProvider, 'teste');
    check('7.7: sem provedor ou sem passagem, o versículo NÃO ganha texto (nada é inventado)', noText.text === undefined && missing.text === undefined);
    check('7.8: com provedor, o texto vem dele e registra qual provedor', withText.text?.providerId === 'provider-de-teste' && withText.text.value.includes('texto de teste'));

    const picked = await pickDailyVerse(repo, { date: '2026-03-10', userSeed: 'u', candidates: cands, provider: testProvider, translationId: 'teste' });
    const again = await pickDailyVerse(repo, { date: '2026-03-10', userSeed: 'u', candidates: cands, provider: testProvider, translationId: 'teste' });
    check('7.9: escolher duas vezes no mesmo dia devolve o mesmo versículo e emite UM evento', picked !== null && JSON.stringify(picked) === JSON.stringify(again) && EventBus.getHistory({ domain: 'spiritual', type: 'DAILY_VERSE_SELECTED' }).length === 1);
  }

  // 8. Agenda: práticas viram sugestões temporais
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    createPurpose(repo, purpose());
    const def = prayerDef();
    const kinds = (['oracao', 'leitura', 'estudo', 'contemplacao', 'silencio'] as const).map((k) => SpiritualAgendaSuggestions.suggestPracticeSchedule({ definition: { ...def, kind: k }, availableWindows: ['manha'], date: '2026-03-11' }).kind);
    check('8.1: oração→bloco de horário · leitura→compromisso · estudo→sessão · contemplação/silêncio→prática', kinds.join(',') === 'time_block,event,time_block,routine,routine');
    const s = SpiritualAgendaSuggestions.suggestPracticeSchedule({ definition: def, availableWindows: ['tarde', 'manha'], date: '2026-03-11' });
    check('8.2: usa a janela preferida, carrega prioridade e duração', s.windowLabel === 'manha' && s.priority === 'alta' && s.durationMinutes === 10);
    check('8.3: a Agenda só recebe domain/sourceType/sourceId — nunca a intenção', s.agendaDomain === 'external' && s.source.sourceId === 'def_oracao' && !JSON.stringify(s).includes('semana difícil'));
    check('8.4: sem janelas, diz isso em vez de inventar horário', SpiritualAgendaSuggestions.suggestPracticeSchedule({ definition: def, availableWindows: [], date: '2026-03-11' }).rationale.includes('Nenhuma janela'));

    definePractice(repo, def);
    const before = proposePracticeToAgenda(repo, { definitionId: 'def_oracao', availableWindows: ['manha'], date: '2026-03-11' });
    check('8.5: sem confiança acumulada, a sugestão passa pelo Guardian e fica como proposta (L2)', before.evaluation.decision.requiresApproval && before.suggestion === undefined);
    seedTrust('spiritual', 'SCHEDULE_PRACTICE');
    const after = proposePracticeToAgenda(repo, { definitionId: 'def_oracao', availableWindows: ['manha'], date: '2026-03-11' });
    check('8.6: com confiança real (L1) a sugestão é liberada para a Agenda', !after.evaluation.decision.requiresApproval && after.suggestion?.windowLabel === 'manha');
    definePractice(repo, prayerDef({ id: 'def_off', status: 'paused' }));
    check('8.7: prática pausada não gera sugestão', throws(() => proposePracticeToAgenda(repo, { definitionId: 'def_off', availableWindows: [], date: '2026-03-11' })));

    const plan = ReadingPlanEngine.planFromChapters({ id: 'pl', title: 'Salmos', chapters: [{ book: 'PSA', chapter: 1 }], startDate: '2026-03-10', createdAt: iso('2026-03-10') });
    createReadingPlan(repo, plan, iso('2026-03-10'));
    const reading = SpiritualAgendaSuggestions.suggestReadingSchedule({ plan, state: getReadingState(repo, 'pl', '2026-03-10'), availableWindows: ['noite'], date: '2026-03-10' });
    check('8.8: leitura do plano vira compromisso com a referência legível', reading?.kind === 'event' && reading.title === 'Leitura: Salmos 1' && reading.windowLabel === 'noite');
  }

  // 9. Hoje: mensagens proativas sem repetição
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    createPurpose(repo, purpose());
    definePractice(repo, prayerDef());
    const view = SpiritualApi.getTodayView(repo, NOW);
    const first = SpiritualHojeIntelligence.publishSpiritualHojeMessages(view);
    const second = SpiritualHojeIntelligence.publishSpiritualHojeMessages(view);
    check('9.1: mensagens vão para o Hoje com evidência e cooldown (2ª publicação é suprimida)', first === view.items.length && second === 0);
    check('9.2: aparecem no snapshot do Hoje', getTodayContextSnapshot().messagesForToday.some((m) => m.domain === 'spiritual' && m.evidence.evidence.length > 0));
  }

  // 10. IA contextual + privacidade
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    createPurpose(repo, purpose());
    repo.saveProfile({ id: 'perfil', focusAreas: [], preferredPracticeTypes: [], tradition: { label: 'Minha tradição', canon: 'standard66', language: 'pt-BR', preferredTranslationId: 'teste' }, createdAt: iso('2026-03-01'), updatedAt: iso('2026-03-01') });
    definePractice(repo, prayerDef());
    const REFLECTION = 'texto da reflexao privada que jamais pode chegar na inteligencia externa';
    const PRAYER = 'conteudo intimo de uma oracao que pertence apenas ao usuario';
    createReflection(repo, createFixtureReflection({ id: 'refl', content: REFLECTION }));
    recordPrayerIntention(repo, { id: 'int1', content: PRAYER, status: 'open', createdAt: iso('2026-03-01') });
    const plan = ReadingPlanEngine.planFromChapters({ id: 'pl', title: 'Salmos', chapters: [{ book: 'PSA', chapter: 1 }, { book: 'PSA', chapter: 2 }], startDate: '2026-03-10', createdAt: iso('2026-03-10') });
    createReadingPlan(repo, plan, iso('2026-03-10'));
    saveNewStudy(repo, StudyEngine.startStudy({ id: 'est', reference: { book: 'PSA', chapter: 23 }, topic: 'confiança', createdAt: iso('2026-03-10') }));
    addItemToStudy(repo, 'est', item({ id: 'u1', kind: 'user_reflection', origin: 'user', content: 'anotacao pessoal privada de estudo que nao pode sair', private: true }));
    addItemToStudy(repo, 'est', item({ id: 's1', kind: 'scripture_text', origin: 'scripture', content: '[texto de teste PSA 23]', reference: { book: 'PSA', chapter: 23 }, translationId: 'teste' }));

    const all = { shareTradition: true, sharePractices: true, shareStudies: true, shareReadingPlan: true, shareGoals: true, sharePurposes: true };
    const ctx = SpiritualAI.buildAIContext(repo, { consent: all, profileId: 'perfil', focus: { studyId: 'est', planId: 'pl', definitionId: 'def_oracao' }, now: NOW });
    const json = JSON.stringify(ctx);
    check('10.1: contexto autorizado leva tradição, plano, estudo, prática e propósito', ctx.tradition?.label === 'Minha tradição' && !!ctx.readingPlan && !!ctx.study && !!ctx.practice && ctx.purposes?.length === 1 && ctx.scopes.length === 6);
    check('10.2: mesmo com TODO o consentimento, reflexão, oração, intenção e anotação privada NÃO entram', !json.includes('reflexao privada') && !json.includes('oracao que pertence') && !json.includes('semana difícil') && !json.includes('anotacao pessoal'));
    check('10.3: não existe flag de consentimento para reflexões/orações (não dá nem para pedir)', !Object.keys(all).some((k) => /reflex|orac|prayer|reflection|intent/i.test(k)));
    check('10.4: sem consentimento, o escopo simplesmente não entra', SpiritualAI.buildAIContext(repo, { consent: { ...all, shareStudies: false, sharePurposes: false, shareGoals: false, sharePractices: false, shareReadingPlan: false, shareTradition: false }, now: NOW }).scopes.length === 0);
    check('10.5: cada montagem de contexto é registrada como acesso sensível (sem o conteúdo)', repo.listSensitiveAccess().filter((a) => a.scope === 'ai_context').length === 2 && !JSON.stringify(repo.listSensitiveAccess()).includes('reflexao privada'));
    check('10.6: contexto contaminado é recusado antes de chegar à IA', throws(() => SpiritualAI.assertContextIsPrivacySafe({ scopes: [], purposes: [{ label: REFLECTION, themes: [] }] }, repo), SpiritualAI.PrivacyViolationError));
    check('10.7: itens privados de estudo ficam fora dos tipos de item enviados', !ctx.study!.itemKinds.includes('user_reflection'));

    const opened = SpiritualPrivacy.openPrivateContent(repo, { scope: 'reflection', id: 'refl', accessor: 'tela-reflexao', purpose: 'usuário leu a própria reflexão', now: NOW });
    check('10.8: ler conteúdo privado é possível, mas SEMPRE deixa registro de acesso', opened === REFLECTION && repo.listSensitiveAccess().some((a) => a.scope === 'reflection' && a.targetId === 'refl' && a.accessor === 'tela-reflexao'));

    const template = SpiritualAI.createTemplateAssistant();
    const questions = await template.respond({ intent: 'suggest_study_questions', context: ctx });
    SpiritualAI.validateAIResponse(questions);
    check('10.9: assistente por template devolve perguntas de estudo, referências e se declara template/não-autoridade', questions.studyQuestions.length === 5 && questions.disclosure.source === 'template' && questions.disclosure.isNotSpiritualAuthority && questions.disclosure.traditionAware);
    const steps = await template.respond({ intent: 'suggest_next_step', context: ctx });
    check('10.10: próximos passos vêm do contexto autorizado', steps.nextSteps.length >= 1);
    const explain = await template.respond({ intent: 'explain_passage', context: ctx });
    check('10.11: o template é honesto: não finge explicar passagem', explain.answer.includes('não explica passagens'));
    const empty = await template.respond({ intent: 'suggest_next_step', context: { scopes: [] } });
    check('10.12: sem contexto autorizado, diz que não há base para sugerir', empty.nextSteps.length === 0 && empty.answer.toLowerCase().includes('não há contexto'));

    const base = { references: [], nextSteps: [], studyQuestions: [], suggestions: [], disclosure: { source: 'ai' as const, isNotSpiritualAuthority: true as const, traditionAware: false } };
    check('10.13: resposta que se apresenta como voz divina é recusada', throws(() => SpiritualAI.validateAIResponse({ ...base, answer: 'Assim diz o Senhor: faça isto.' }), SpiritualAI.AIContractError));
    check('10.14: citação longa sem referência bíblica é recusada (nada de "escritura" sem fonte)', throws(() => SpiritualAI.validateAIResponse({ ...base, answer: 'A passagem diz "uma frase longa que parece escritura mas não tem nenhuma referência anexada".' }), SpiritualAI.AIContractError));
    check('10.15: resposta sem a declaração de não-autoridade é recusada', throws(() => SpiritualAI.validateAIResponse({ ...base, answer: 'ok', disclosure: { source: 'ai', isNotSpiritualAuthority: false as unknown as true, traditionAware: false } }), SpiritualAI.AIContractError));
    check('10.16: resposta válida de IA passa, com referência', !throws(() => SpiritualAI.validateAIResponse({ ...base, answer: 'Uma leitura possível, entre outras.', references: [parseReference('PSA 23')] })));

    // 11. Guardian protege o domínio espiritual
    const outbound = [{ channel: 'notificacao', text: `Lembrete: ${REFLECTION}` }, { channel: 'hoje', text: 'Meta avançou.' }];
    const guardianRepo = createInMemoryGuardianRepository();
    const report = await runGuardianCycle({
      repository: guardianRepo,
      sources: [defineSource(spiritualPrivacyAuditor, () => ({ privateItems: SpiritualPrivacy.collectPrivateItems(repo).map((p) => ({ id: p.id, kind: p.kind, content: p.content })), outbound }))],
      remediations: createRemediationRegistry(),
    });
    const finding = guardianRepo.listFindings()[0];
    check('11.1: Guardian detecta reflexão vazando para uma notificação e bloqueia (não corrige por conta própria)', report.newFindings === 1 && finding.severity === 'critica' && finding.status === 'blocked' && finding.evidence[0].reference === 'notificacao');
    check('11.2: a evidência cita item e canal, mas nunca o texto privado', finding.evidence[0].observation.includes('refl') && !JSON.stringify(guardianRepo.listEvents()).includes('reflexao privada') && !JSON.stringify(finding).includes('jamais pode chegar'));
    const clean = await runGuardianCycle({
      repository: createInMemoryGuardianRepository(),
      sources: [defineSource(spiritualPrivacyAuditor, () => ({ privateItems: SpiritualPrivacy.collectPrivateItems(repo).map((p) => ({ id: p.id, kind: p.kind, content: p.content })), outbound: [outbound[1]] }))],
      remediations: createRemediationRegistry(),
    });
    check('11.3: canais limpos não geram achado', clean.newFindings === 0);
    const policies = GuardianDomainApi.explainPolicies('spiritual');
    check('11.4: Guardian explica as políticas do domínio em linguagem simples (governança, não moderação religiosa)', policies.length === 2 && policies.every((p) => p.text.length > 20));
    check('11.5: os acessos sensíveis ficam consultáveis para auditoria', repo.listSensitiveAccess().length >= 3);
  }

  return result();
}

if (require.main === module) {
  run().then(({ total, fails }) => {
    console.log(`\n[espiritual-inteligência] ${total - fails}/${total} checagens OK`);
    process.exit(fails > 0 ? 1 : 0);
  });
}
