/**
 * MEDUSA — Body Domain — testes de contrato (seção 38)
 */

import { resetAll, seedTrust, makeChecker } from './_helpers';
import * as EventBus from '../../../src/foundation/eventBus';
import { createInMemoryBodyRepository } from '../../../src/domains/body/repository/inMemory';
import { createFixtureAnswers } from '../../../src/domains/body/fixtures';
import { createDiagnosticSession } from '../../../src/domains/body/useCases/createDiagnosticSession';
import { answerDiagnosticQuestion } from '../../../src/domains/body/useCases/answerDiagnosticQuestion';
import { completeDiagnosticSession } from '../../../src/domains/body/useCases/completeDiagnosticSession';
import { createBodyPlan } from '../../../src/domains/body/useCases/createBodyPlan';
import { scheduleWorkout } from '../../../src/domains/body/useCases/scheduleWorkout';
import { scheduleLightActivity } from '../../../src/domains/body/useCases/scheduleLightActivity';
import { pauseBodyPlan, resumeBodyPlan } from '../../../src/domains/body/useCases/pauseResumeBodyPlan';
import { computeRoutineLoad } from '../../../src/domains/body/services/routineLoadHeuristic';
import { generateBodyInsights } from '../../../src/domains/body/services/insightsEngine';
import { resolveBodyTodayContext } from '../../../src/domains/body/adapters/hojeResolver';
import { BodyValidationError } from '../../../src/domains/body/validators';
import { DiagnosticSessionError } from '../../../src/domains/body/services/diagnosticEngine';
import * as BodyApi from '../../../src/domains/body/api';
import type { BodyAnswer } from '../../../src/domains/body/model/types';

const NOW = '2026-02-01T10:00:00.000Z';

function answered(repo: ReturnType<typeof createInMemoryBodyRepository>, sessionId: string): void {
  for (const a of createFixtureAnswers(NOW)) answerDiagnosticQuestion(repo, sessionId, a);
}

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('body');

  // 1. Sessão de diagnóstico + validação das respostas
  resetAll();
  {
    const repo = createInMemoryBodyRepository();
    const session = createDiagnosticSession(repo, 's1', NOW);
    check('1.1: sessão nasce in_progress e é persistida', session.status === 'in_progress' && repo.getDiagnosticSession('s1') !== undefined);

    answered(repo, 's1');
    check('1.2: respostas válidas (single/multi/scale/free_text) são aceitas', repo.getDiagnosticSession('s1')?.answers.length === 6);

    const bad = (a: BodyAnswer): boolean => {
      try {
        answerDiagnosticQuestion(repo, 's1', a);
        return false;
      } catch (e) {
        return e instanceof BodyValidationError || e instanceof DiagnosticSessionError;
      }
    };
    check(
      '1.3: multi com opção inexistente é rejeitado',
      bad({ id: 'b1', questionId: 'q_disponibilidade_janelas', type: 'multi', value: ['madrugada_inventada'], answeredAt: NOW, source: 'self_reported' })
    );
    check(
      '1.4: scale fora da faixa é rejeitada',
      bad({ id: 'b2', questionId: 'q_frequencia_semanal', type: 'scale', value: 42, answeredAt: NOW, source: 'self_reported' })
    );
    check(
      '1.5: tipo diferente do da pergunta é rejeitado',
      bad({ id: 'b3', questionId: 'q_experiencia', type: 'scale', value: 3, answeredAt: NOW, source: 'self_reported' })
    );
    check(
      '1.6: pergunta desconhecida é rejeitada',
      bad({ id: 'b4', questionId: 'q_nao_existe', type: 'single', value: 'x', answeredAt: NOW, source: 'self_reported' })
    );

    answerDiagnosticQuestion(repo, 's1', { id: 'novo', questionId: 'q_experiencia', type: 'single', value: 'intermediario', answeredAt: NOW, source: 'self_reported' });
    const experienceAnswers = repo.getDiagnosticSession('s1')!.answers.filter((a) => a.questionId === 'q_experiencia');
    check('1.7: responder de novo SUBSTITUI (nunca acumula respostas contraditórias)', experienceAnswers.length === 1 && experienceAnswers[0].value === 'intermediario');
  }

  // 2. Concluir sessão => perfil, com origem explícita
  resetAll();
  {
    const repo = createInMemoryBodyRepository();
    createDiagnosticSession(repo, 's2', NOW);
    answered(repo, 's2');
    const { session, profile } = completeDiagnosticSession(repo, 's2', 'p1', NOW);
    check('2.1: sessão concluída', session.status === 'completed');
    check('2.2: perfil construído e persistido', repo.getProfile('p1')?.id === 'p1');
    check('2.3: campos vindos de resposta direta têm origin self_reported', profile.experienceLevel.origin === 'self_reported' && profile.weeklyFrequency.value === 3);

    let threw = false;
    try {
      answerDiagnosticQuestion(repo, 's2', createFixtureAnswers(NOW)[0]);
    } catch {
      threw = true;
    }
    check('2.4: não dá pra responder numa sessão já concluída', threw);

    const incomplete = createInMemoryBodyRepository();
    createDiagnosticSession(incomplete, 's3', NOW);
    let incompleteThrew = false;
    try {
      completeDiagnosticSession(incomplete, 's3', 'p2', NOW);
    } catch (e) {
      incompleteThrew = e instanceof BodyValidationError;
    }
    check('2.5: sem as respostas obrigatórias, NÃO constrói perfil (erro interpretável)', incompleteThrew);
  }

  // 3. Routine load: determinístico, transparente, nunca diagnóstico
  resetAll();
  {
    const high = computeRoutineLoad({ workMinutes: 480, studyMinutes: 180, commuteMinutes: 120, plannedActivityMinutes: 0, sleepQuality: 'ruim', energyLevel: 'baixa' });
    const moderate = computeRoutineLoad({ workMinutes: 480, studyMinutes: 180, commuteMinutes: 60, plannedActivityMinutes: 0, sleepQuality: 'regular' });
    const low = computeRoutineLoad({ workMinutes: 0, studyMinutes: 0, commuteMinutes: 0, plannedActivityMinutes: 0 });
    check('3.1: carga alta', high.level === 'alta');
    check('3.2: carga moderada', moderate.level === 'moderada');
    check('3.3: carga baixa', low.level === 'baixa');
    check('3.4: determinístico (mesma entrada, mesma saída)', JSON.stringify(computeRoutineLoad({ workMinutes: 480, studyMinutes: 180, commuteMinutes: 60, plannedActivityMinutes: 0, sleepQuality: 'regular' })) === JSON.stringify(moderate));
    check('3.5: evidência exposta e descrita como heurística de rotina, não diagnóstico', high.evidence.length >= 3 && high.evidence.some((e) => e.includes('não diagnóstico')));
  }

  // 4. Plano candidato + Guardian
  resetAll();
  {
    const repo = createInMemoryBodyRepository();
    createDiagnosticSession(repo, 's4', NOW);
    answered(repo, 's4');
    const { profile } = completeDiagnosticSession(repo, 's4', 'p4', NOW);

    const first = createBodyPlan(repo, 'plan_1', { profile, availableWindows: ['manha'] }, NOW);
    check('4.1: plano gerado é uma PROPOSTA (draft) com a frequência do perfil', first.plan.status === 'draft' && first.plan.frequencyPerWeek === 3);
    check('4.2: iniciante recebe atividade leve como ponto de partida', first.plan.sessions[0].activityId === 'act_caminhada_leve' && first.plan.sessions[0].intensity === 'leve');
    check('4.3: dias preferidos distribuídos ao longo da semana', JSON.stringify(first.plan.sessions[0].preferredDays) === JSON.stringify([0, 2, 5]));
    check('4.4: sem confiança acumulada, criar plano é L2 e NÃO persiste', first.evaluation.decision.requiresApproval && repo.getPlan('plan_1') === undefined);

    seedTrust('body', 'CREATE_BODY_PLAN');
    const second = createBodyPlan(repo, 'plan_2', { profile, availableWindows: ['manha'] }, NOW);
    check('4.5: com confiança real, criar plano é L1 e persiste', !second.evaluation.decision.requiresApproval && repo.getPlan('plan_2') !== undefined);

    check('4.5b: BODY_PLAN_CREATED só é emitido quando o plano foi de fato persistido (1 evento, do plan_2)', EventBus.getHistory({ domain: 'body', type: 'BODY_PLAN_CREATED' }).length === 1);

    const noWindows = createBodyPlan(repo, 'plan_3', { profile, availableWindows: [] }, NOW);
    check('4.6: sem janelas informadas, o plano diz isso em vez de inventar horário', (noWindows.plan.notes ?? '').includes('Nenhuma janela'));
  }

  // 5. Agenda: light activity é L1 (com confiança), workout é L2 SEMPRE (teto)
  resetAll();
  {
    const repo = createInMemoryBodyRepository();
    createDiagnosticSession(repo, 's5', NOW);
    answered(repo, 's5');
    const { profile } = completeDiagnosticSession(repo, 's5', 'p5', NOW);
    seedTrust('body', 'CREATE_BODY_PLAN');
    const { plan } = createBodyPlan(repo, 'plan_5', { profile, availableWindows: ['noite'] }, NOW);

    const withoutTrust = scheduleLightActivity('act_caminhada_leve', '2026-02-02', 20, 'carga alta hoje');
    check('5.1: atividade leve sem histórico de confiança é proposta (L2), sem requisição à Agenda', withoutTrust.evaluation.decision.requiresApproval && withoutTrust.schedulingRequest === undefined);

    seedTrust('body', 'SCHEDULE_LIGHT_ACTIVITY');
    const light = scheduleLightActivity('act_caminhada_leve', '2026-02-02', 20, 'carga alta hoje');
    check('5.2: com confiança, vira L1 e gera requisição de Agenda com domain body/workout', !light.evaluation.decision.requiresApproval && light.schedulingRequest?.agendaDomain === 'body' && light.schedulingRequest?.source.sourceType === 'workout');
    check('5.3: a requisição carrega só domain/sourceType/sourceId — a Agenda decide o horário', light.schedulingRequest?.date === '2026-02-02');

    seedTrust('body', 'SCHEDULE_WORKOUT', 30);
    const workout = scheduleWorkout(repo, plan.id, plan.sessions[0].id, '2026-02-03');
    check('5.4: agendar treino completo é L2 mesmo com muita confiança (teto da política)', workout.evaluation.decision.level === 'L2' && workout.schedulingRequest === undefined);
  }

  // 6. Pausar/retomar
  resetAll();
  {
    const repo = createInMemoryBodyRepository();
    repo.savePlan({
      id: 'plan_6',
      stage: 'ativacao',
      status: 'active',
      sessions: [{ id: 'sess', activityId: 'act_caminhada_leve', preferredDays: [1], durationMinutes: 20, intensity: 'leve' }],
      frequencyPerWeek: 1,
      createdAt: NOW,
      updatedAt: NOW,
    });
    seedTrust('body', 'PAUSE_BODY_PLAN');
    seedTrust('body', 'RESUME_BODY_PLAN');
    pauseBodyPlan(repo, 'plan_6', 'viagem');
    check('6.1: pausar muda o status do plano', repo.getPlan('plan_6')?.status === 'paused');
    resumeBodyPlan(repo, 'plan_6');
    check('6.2: retomar volta a active', repo.getPlan('plan_6')?.status === 'active');
  }

  // 7. Insights + Hoje
  resetAll();
  {
    const high = computeRoutineLoad({ workMinutes: 480, studyMinutes: 180, commuteMinutes: 120, plannedActivityMinutes: 0, sleepQuality: 'ruim', energyLevel: 'baixa' });
    const insights = generateBodyInsights({ routineLoad: high, now: NOW });
    check('7.1: carga alta gera routine_load_high com ação proposta SCHEDULE_LIGHT_ACTIVITY', insights.some((i) => i.type === 'routine_load_high' && i.proposedActionType === 'SCHEDULE_LIGHT_ACTIVITY'));
    check('7.2: insight carrega evidência (não é afirmação solta)', insights.find((i) => i.type === 'routine_load_high')!.evidence.length > 0);
    check('7.3: sem dado nenhum => insufficient_evidence', generateBodyInsights({ now: NOW })[0].type === 'insufficient_evidence');
    check('7.4: resolver do Hoje devolve uma única frase compacta', resolveBodyTodayContext(insights)?.headline.length! > 0 && resolveBodyTodayContext(generateBodyInsights({ now: NOW })) === null);
  }

  // 8. Contrato público
  resetAll();
  {
    const repo = createInMemoryBodyRepository();
    createDiagnosticSession(repo, 's8', NOW);
    answered(repo, 's8');
    completeDiagnosticSession(repo, 's8', 'p8', NOW);
    check('8.1: getProfile() devolve o perfil real', BodyApi.getProfile(repo, 'p8')?.id === 'p8');
    check('8.2: getAvailableWindows() só repassa rótulos vindos de fora', JSON.stringify(BodyApi.getAvailableWindows(['manha'])) === '["manha"]');
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[body] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
