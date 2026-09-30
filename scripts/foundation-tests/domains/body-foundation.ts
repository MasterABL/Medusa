/**
 * MEDUSA FOUNDATION — Corpo: ficha, sessão, progressão de carga, métricas
 */

import { makeChecker } from './_helpers';
import type { LoadEntry, WorkoutSheet, BodyMetricEntry } from '../../../src/domains/body/model/training';
import { createInMemoryBodyTrainingRepository } from '../../../src/domains/body/repository/trainingInMemory';
import * as Session from '../../../src/domains/body/services/sessionEngine';
import * as Progression from '../../../src/domains/body/services/progressionEngine';
import * as Metrics from '../../../src/domains/body/services/metricsEngine';
import * as Selectors from '../../../src/domains/body/selectors';

const T0 = '2026-09-10T09:00:00.000Z';
const sec = (base: string, s: number) => new Date(Date.parse(base) + s * 1000).toISOString();

const sheetA: WorkoutSheet = {
  id: 'A',
  label: 'A',
  exercises: [
    { id: 'supino', name: 'Supino', order: 0, plannedSets: 2, reps: Session.parseReps('8 a 10'), restSeconds: 90 },
    { id: 'remada', name: 'Remada', order: 1, plannedSets: 2, reps: Session.parseReps('FALHA'), restSeconds: 60 },
    { id: 'rosca', name: 'Rosca', order: 2, plannedSets: 1, reps: Session.parseReps('12') },
  ],
};

const load = (exerciseId: string, date: string, loadKg: number, recordedAt = `${date}T10:00:00Z`): LoadEntry => ({ exerciseId, date, loadKg, recordedAt, source: 'manual' });

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('body-foundation');

  // 1. reps como texto livre
  check('1.1: "8 a 10" vira faixa', (() => { const r = Session.parseReps('8 a 10'); return r.min === 8 && r.max === 10 && r.raw === '8 a 10'; })());
  check('1.2: "FALHA" mantém só o texto, sem inventar número', (() => { const r = Session.parseReps('FALHA'); return r.min === undefined && r.max === undefined && r.raw === 'FALHA'; })());
  check('1.3: "12" vira faixa 12-12', (() => { const r = Session.parseReps('12'); return r.min === 12 && r.max === 12; })());

  // 2. progressão atual/anterior
  {
    const loads = [load('supino', '2026-09-01', 40), load('supino', '2026-09-05', 45), load('supino', '2026-09-08', 47.5)];
    const p = Progression.progressionFor('supino', loads);
    check('2.1: atual = entrada mais recente', p.current?.loadKg === 47.5);
    check('2.2: anterior = entrada imediatamente anterior', p.previous?.loadKg === 45);
    check('2.3: trend subiu + delta 2.5', p.trend === 'subiu' && p.deltaKg === 2.5);
    check('2.4: com asOf, ignora o futuro', Progression.progressionFor('supino', loads, '2026-09-05').current?.loadKg === 45);
    check('2.5: uma entrada só => sem_base (sem anterior inventado)', (() => { const x = Progression.progressionFor('supino', [load('supino', '2026-09-01', 40)]); return x.trend === 'sem_base' && x.previous === undefined && x.current?.loadKg === 40; })());
    check('2.6: nenhuma entrada => sem_base sem atual', (() => { const x = Progression.progressionFor('supino', []); return x.trend === 'sem_base' && x.current === undefined; })());
    check('2.7: reduziu e manteve', Progression.progressionFor('a', [load('a', '2026-09-01', 50), load('a', '2026-09-02', 40)]).trend === 'reduziu' && Progression.progressionFor('a', [load('a', '2026-09-01', 50), load('a', '2026-09-02', 50)]).trend === 'manteve');
    check('2.8: mesmo dia colapsa na última (correção não cria ponto falso)', (() => {
      const loads2 = Progression.upsertLoad(Progression.upsertLoad([], load('a', '2026-09-01', 50, '2026-09-01T08:00:00Z')), load('a', '2026-09-01', 55, '2026-09-01T09:00:00Z'));
      return loads2.length === 1 && loads2[0].loadKg === 55;
    })());
    check('2.9: carga negativa é rejeitada', (() => { try { Progression.upsertLoad([], load('a', '2026-09-01', -1)); return false; } catch { return true; } })());
    check('2.10: exercícios não se misturam', Progression.progressionFor('remada', loads).trend === 'sem_base');
  }

  // 3. sessão: "o que estou fazendo agora?"
  {
    const loads = [load('supino', '2026-09-01', 40), load('supino', '2026-09-08', 45), load('remada', '2026-09-08', 30)];
    const before = Session.viewWorkout({ sheet: sheetA, loads, now: T0 });
    check('3.1: sem sessão iniciada, aponta o 1º exercício, série 1', before.phase === 'executando' && before.currentExercise?.id === 'supino' && before.currentSet === 1);

    let s = Session.startWorkout(sheetA, 'w1', T0);
    const v0 = Session.viewWorkout({ sheet: sheetA, session: s, loads, now: T0 });
    check('3.2: posição 1 de 3, 2 séries planejadas, reps alvo 8-10', v0.position?.index === 1 && v0.position.total === 3 && v0.plannedSets === 2 && v0.repsTarget?.max === 10);
    check('3.3: carga atual 45, anterior 40', v0.currentLoadKg === 45 && v0.previousLoadKg === 40);
    check('3.4: sem exercício anterior no primeiro; próximo = Remada', v0.previousExercise === undefined && v0.nextExercise?.id === 'remada');

    s = Session.logSet(sheetA, s, { reps: 9, loadKg: 45 }, sec(T0, 30));
    const v1 = Session.viewWorkout({ sheet: sheetA, session: s, loads, now: sec(T0, 40) });
    check('3.5: após 1ª série, entra em descanso (90s - 10s = 80s)', v1.phase === 'descansando' && v1.restRemainingSeconds === 80 && v1.currentSet === 2);
    const v1b = Session.viewWorkout({ sheet: sheetA, session: s, loads, now: sec(T0, 200) });
    check('3.6: descanso passou => executando, mesma série 2', v1b.phase === 'executando' && v1b.currentSet === 2 && v1b.restRemainingSeconds === undefined);

    s = Session.logSet(sheetA, s, { reps: 8, loadKg: 45 }, sec(T0, 210));
    const v2 = Session.viewWorkout({ sheet: sheetA, session: s, loads, now: sec(T0, 215) });
    check('3.7: exercício avança na ordem da ficha, série volta a 1', v2.currentExercise?.id === 'remada' && v2.currentSet === 1 && v2.position?.index === 2);
    check('3.8: exercício anterior = Supino, próximo = Rosca', v2.previousExercise?.id === 'supino' && v2.nextExercise?.id === 'rosca');
    check('3.9: descanso vem do exercício que acabou de ser feito (90s), não do próximo', v2.phase === 'descansando' && v2.restSeconds === 90);
    check('3.10: totais de séries', v2.completedSetsTotal === 2 && v2.plannedSetsTotal === 5);

    s = Session.logSet(sheetA, s, { reps: 10 }, sec(T0, 400));
    s = Session.logSet(sheetA, s, { reps: 10 }, sec(T0, 500));
    const v3 = Session.viewWorkout({ sheet: sheetA, session: s, loads, now: sec(T0, 600) });
    check('3.11: último exercício não tem próximo', v3.currentExercise?.id === 'rosca' && v3.nextExercise === undefined);
    s = Session.logSet(sheetA, s, { reps: 12 }, sec(T0, 700));
    check('3.12: completar a última série fecha a sessão', s.status === 'completed' && s.endedAt === sec(T0, 700));
    check('3.13: view de sessão concluída = concluido', Session.viewWorkout({ sheet: sheetA, session: s, loads, now: sec(T0, 710) }).phase === 'concluido');
    check('3.14: não aceita série depois de concluída', (() => { try { Session.logSet(sheetA, s, { reps: 1 }, T0); return false; } catch (e) { return e instanceof Session.WorkoutError; } })());
    check('3.15: logSet é imutável', (() => { const a = Session.startWorkout(sheetA, 'w2', T0); Session.logSet(sheetA, a, { reps: 5 }, T0); return a.sets.length === 0; })());
    check('3.16: abandonar => encerrado', Session.viewWorkout({ sheet: sheetA, session: Session.endWorkout(Session.startWorkout(sheetA, 'w3', T0), T0), loads, now: T0 }).phase === 'encerrado');
    check('3.17: ficha vazia => sem_ficha; startWorkout recusa', Session.viewWorkout({ sheet: { id: 'x', label: 'X', exercises: [] }, loads: [], now: T0 }).phase === 'sem_ficha' && (() => { try { Session.startWorkout({ id: 'x', label: 'X', exercises: [] }, 'w', T0); return false; } catch { return true; } })());
    check('3.18: reps negativos rejeitados', (() => { try { Session.logSet(sheetA, Session.startWorkout(sheetA, 'w4', T0), { reps: -1 }, T0); return false; } catch { return true; } })());
    check('3.19: a ordem segue `order`, não a posição no array', (() => {
      const shuffled: WorkoutSheet = { ...sheetA, exercises: [sheetA.exercises[2], sheetA.exercises[0], sheetA.exercises[1]] };
      return Session.viewWorkout({ sheet: shuffled, loads: [], now: T0 }).currentExercise?.id === 'supino';
    })());
  }

  // 4. métricas: lacuna não é zero
  {
    const entries: BodyMetricEntry[] = [
      { date: '2026-09-08', sleepHours: 6, source: 'manual', recordedAt: '2026-09-08T08:00:00Z' },
      { date: '2026-09-10', sleepHours: 8, steps: 4000, source: 'manual', recordedAt: '2026-09-10T08:00:00Z' },
    ];
    const sleep = Metrics.summarizeMetric(entries, 'sleepHours', '2026-09-10', 7);
    check('4.1: média só sobre dias com dado (7h, não 2h)', sleep.average === 7 && sleep.daysWithData === 2);
    check('4.2: lista os dias sem registro em vez de preencher com 0', sleep.missingDates.length === 5 && sleep.missingDates.includes('2026-09-09'));
    check('4.3: latest é o dia mais recente com dado', sleep.latest?.date === '2026-09-10' && sleep.latest.value === 8);
    check('4.4: métrica sem nenhum dado => average undefined', Metrics.summarizeMetric(entries, 'weightKg', '2026-09-10', 7).average === undefined);
    check('4.5: janela tem o tamanho certo e termina em endDate', (() => { const d = Metrics.datesInWindow('2026-09-10', 7); return d.length === 7 && d[6] === '2026-09-10' && d[0] === '2026-09-04'; })());
    check('4.6: registros do mesmo dia mesclam campo a campo', (() => {
      const m = Metrics.mergeByDate([
        { date: '2026-09-10', steps: 1000, source: 'imported', recordedAt: '2026-09-10T07:00:00Z' },
        { date: '2026-09-10', sleepHours: 7, source: 'manual', recordedAt: '2026-09-10T08:00:00Z' },
      ]);
      return m.length === 1 && m[0].steps === 1000 && m[0].sleepHours === 7;
    })());
    check('4.7: validação rejeita sono de 30h e registro vazio', Metrics.validateMetricEntry({ date: '2026-09-10', sleepHours: 30, source: 'manual', recordedAt: T0 }).length > 0 && Metrics.validateMetricEntry({ date: '2026-09-10', source: 'manual', recordedAt: T0 }).length > 0);
    check('4.8: registro plausível passa', Metrics.validateMetricEntry({ date: '2026-09-10', sleepHours: 7.5, steps: 8000, source: 'manual', recordedAt: T0 }).length === 0);
  }

  // 5. seletores: estados de dado honestos
  {
    const repo = createInMemoryBodyTrainingRepository('manual');
    check('5.1: sem ficha => empty (não erro, não loading)', Selectors.selectWorkoutView(repo, T0).status === 'empty');
    check('5.2: sem métricas => empty', Selectors.selectMetrics(repo, '2026-09-10', 7).status === 'empty');

    repo.saveSheet(sheetA);
    const noLoads = Selectors.selectWorkoutView(repo, T0);
    check('5.3: ficha sem nenhuma carga => partial (faltam cargas), e ainda mostra o exercício', noLoads.status === 'partial' && noLoads.missing.includes('cargas') && noLoads.data.currentExercise?.id === 'supino');

    repo.saveLoad(load('supino', '2026-09-08', 45));
    const withLoads = Selectors.selectWorkoutView(repo, T0);
    check('5.4: com cargas => ready, origem propagada', withLoads.status === 'ready' && withLoads.origin === 'manual');

    repo.saveMetric({ date: '2026-09-10', sleepHours: 7, source: 'manual', recordedAt: T0 });
    const metrics = Selectors.selectMetrics(repo, '2026-09-10', 7);
    check('5.5: métricas parciais listam o que nunca foi registrado', metrics.status === 'partial' && metrics.missing.includes('steps') && !metrics.missing.includes('sleepHours'));

    const fixtureRepo = createInMemoryBodyTrainingRepository('fixture');
    fixtureRepo.saveSheet(sheetA);
    fixtureRepo.saveLoad(load('supino', '2026-09-08', 45));
    const fx = Selectors.selectWorkoutView(fixtureRepo, T0);
    check('5.6: repositório de fixture nunca produz dado "real"', fx.status === 'ready' && fx.origin === 'fixture');

    repo.saveSession(Session.startWorkout(sheetA, 'live', T0));
    check('5.7: sessão ativa é encontrada por getActiveSession', repo.getActiveSession()?.id === 'live');
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[body-foundation] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
