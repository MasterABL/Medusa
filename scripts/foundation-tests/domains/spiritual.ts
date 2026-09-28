/**
 * MEDUSA — Spiritual Domain — testes de contrato (seção 38)
 *
 * Inclui as garantias de privacidade da seção 26: conteúdo de reflexão nunca
 * aparece em evento, em contrato genérico nem em mensagem de sistema.
 */

import { resetAll, seedTrust, makeChecker } from './_helpers';
import * as EventBus from '../../../src/foundation/eventBus';
import { createInMemorySpiritualRepository } from '../../../src/domains/spiritual/repository/inMemory';
import { createFixtureGoal, createFixturePractice, createFixtureReflection } from '../../../src/domains/spiritual/fixtures';
import { recordPractice } from '../../../src/domains/spiritual/useCases/recordPractice';
import { createReflection } from '../../../src/domains/spiritual/useCases/createReflection';
import { createGoal } from '../../../src/domains/spiritual/useCases/createGoal';
import { schedulePractice } from '../../../src/domains/spiritual/useCases/schedulePractice';
import { reviewRoutine } from '../../../src/domains/spiritual/useCases/reviewRoutine';
import { computeGoalProgress } from '../../../src/domains/spiritual/services/goalEngine';
import { resolveSpiritualTodayContext } from '../../../src/domains/spiritual/adapters/hojeResolver';
import { SpiritualValidationError, validateGoalConsistency } from '../../../src/domains/spiritual/validators';
import * as SpiritualApi from '../../../src/domains/spiritual/api';

const NOW = '2026-02-01T10:00:00.000Z';

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('spiritual');

  // 1. Registrar prática sem meta: só evento, nenhuma Action (registrar não é decisão de autonomia)
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    const { practice, goalUpdateEvaluation } = recordPractice(repo, createFixturePractice(), NOW);
    check('1.1: prática persistida', repo.getPractice(practice.id) !== undefined);
    check('1.2: evento PRACTICE_COMPLETED emitido', EventBus.getHistory({ domain: 'spiritual', type: 'PRACTICE_COMPLETED' }).length === 1);
    check('1.3: sem meta vinculada, nenhuma Action é criada', goalUpdateEvaluation === undefined);
  }

  // 2. Meta: progresso é DERIVADO do histórico (CENÁRIO 4)
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    createGoal(repo, createFixtureGoal());

    let manualThrew = false;
    try {
      createGoal(repo, createFixtureGoal({ id: 'g_fake', currentPracticeCount: 9 }));
    } catch (e) {
      manualThrew = e instanceof SpiritualValidationError;
    }
    check('2.1: meta não pode nascer com progresso manual incoerente', manualThrew);

    const pending = recordPractice(repo, createFixturePractice({ id: 'p1', relatedGoalId: 'fixture_goal_1' }), NOW);
    check('2.2: prática vinculada dispara UPDATE_GOAL_PROGRESS pelo Guardian', pending.goalUpdateEvaluation?.action.type === 'UPDATE_GOAL_PROGRESS');
    check('2.3: sem confiança acumulada, é L2 e o progresso NÃO muda sozinho', pending.goalUpdateEvaluation?.decision.requiresApproval === true && repo.getGoal('fixture_goal_1')?.currentPracticeCount === 0);

    seedTrust('spiritual', 'UPDATE_GOAL_PROGRESS');
    recordPractice(repo, createFixturePractice({ id: 'p2', relatedGoalId: 'fixture_goal_1' }), NOW);
    const goal = repo.getGoal('fixture_goal_1')!;
    check('2.4: com confiança real, L1 recalcula o progresso pelo histórico (2 práticas vinculadas)', goal.currentPracticeCount === 2);
    check('2.5: progresso derivado = 2/30', Math.abs(computeGoalProgress(goal) - 2 / 30) < 1e-9);
    check('2.6: consistência meta×histórico é verificável', (() => { try { validateGoalConsistency(goal, repo.listPractices({ relatedGoalId: goal.id })); return true; } catch { return false; } })());
    check('2.7: incoerência é detectada', (() => { try { validateGoalConsistency({ ...goal, currentPracticeCount: 99 }, repo.listPractices({ relatedGoalId: goal.id })); return false; } catch { return true; } })());
  }

  // 3. Marco automático por contagem
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    createGoal(repo, createFixtureGoal({ targetPracticeCount: 3, milestones: [{ id: 'm', label: '2 práticas', achieved: false }] }));
    seedTrust('spiritual', 'UPDATE_GOAL_PROGRESS');
    recordPractice(repo, createFixturePractice({ id: 'a', relatedGoalId: 'fixture_goal_1' }), NOW);
    recordPractice(repo, createFixturePractice({ id: 'b', relatedGoalId: 'fixture_goal_1' }), NOW);
    check('3.1: marco "2 práticas" é atingido pelo histórico', repo.getGoal('fixture_goal_1')?.milestones[0].achieved === true);
  }

  // 4. PRIVACIDADE (seção 26)
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    const secret = 'TEXTO_MUITO_PRIVADO_DA_REFLEXAO';
    createReflection(repo, createFixtureReflection({ content: secret }));

    const events = EventBus.getHistory({ domain: 'spiritual', type: 'REFLECTION_CREATED' });
    check('4.1: evento REFLECTION_CREATED emitido', events.length === 1);
    check('4.2: o evento NUNCA carrega o conteúdo da reflexão', !JSON.stringify(events[0]).includes(secret));
    check('4.3: metadado expõe só o tamanho do texto', (events[0].payload as { contentLength: number }).contentLength === secret.length);
    check('4.4: listReflectionMetadata() não contém o conteúdo', !JSON.stringify(repo.listReflectionMetadata()).includes(secret));
    check('4.5: o contrato público não expõe conteúdo', !JSON.stringify(SpiritualApi.getReflectionsMetadata(repo)).includes(secret));
    check('4.6: contrato público NÃO tem getReflections() (minimização por desenho)', !('getReflections' in SpiritualApi));
    check('4.7: o conteúdo continua acessível pela via privada (repository)', repo.getReflection('fixture_reflection_1')?.content === secret);

    let sharedThrew = false;
    try {
      createReflection(repo, { ...createFixtureReflection({ id: 'x' }), visibility: 'public' as unknown as 'private' });
    } catch (e) {
      sharedThrew = e instanceof SpiritualValidationError;
    }
    check('4.8: visibilidade diferente de private é rejeitada (compartilhar não existe)', sharedThrew);
  }

  // 5. Agenda: só domain/sourceType/sourceId
  resetAll();
  {
    seedTrust('spiritual', 'SCHEDULE_PRACTICE');
    const res = schedulePractice('oracao', 'Oração da noite', '2026-02-05');
    check('5.1: agendar prática (com confiança) é L1 e gera requisição', !res.evaluation.decision.requiresApproval && res.schedulingRequest !== undefined);
    check('5.2: Agenda sem AgendaDomain dedicado recebe "external" (fallback documentado)', res.schedulingRequest?.agendaDomain === 'external');
    check('5.3: evento PRACTICE_SCHEDULED emitido', EventBus.getHistory({ domain: 'spiritual', type: 'PRACTICE_SCHEDULED' }).length === 1);
  }

  // 6. Revisar rotina + Hoje
  resetAll();
  {
    const review = reviewRoutine(
      { id: 'r', practiceType: 'oracao', preferredDays: [1], active: true },
      [createFixturePractice({ completedAt: '2026-01-30T07:00:00.000Z' }), createFixturePractice({ id: 'old', completedAt: '2025-12-01T07:00:00.000Z' })],
      NOW
    );
    check('6.1: revisão conta só práticas dentro da janela', review.completedInWindow === 1);

    const ctx = resolveSpiritualTodayContext('Ler os Salmos', 'g', 1, 2, 30);
    check('6.2: Hoje recebe uma frase compacta de progresso, sem conteúdo de reflexão', ctx?.headline.includes('avançou') === true && ctx.detail === '2/30 práticas.');
    check('6.3: sem mudança de progresso, Hoje não recebe nada', resolveSpiritualTodayContext('x', 'g', 2, 2) === null);
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[spiritual] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
