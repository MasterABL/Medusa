/**
 * MEDUSA FOUNDATION — testes de contrato (seção 51)
 *
 * Provam a ARQUITETURA, não só a existência de arquivos: registrar domínio,
 * resolver persona, registrar capability, emitir evento, transformar evento
 * em ação, passar ação pelo Guardian policy, classificar L1/L2/L3, consultar
 * trust profile, gerar Approval Request, registrar ActionAuditLog, publicar
 * mensagem proativa, enviar evento pra fila do Island, preservar prioridade,
 * evitar eventos duplicados, manter independência de domínio.
 *
 * Rodar com: npx tsx scripts/foundation-tests/contract-tests.ts
 */

import * as DomainRegistry from '../../src/foundation/domainRegistry';
import * as EventBus from '../../src/foundation/eventBus';
import * as ActionBus from '../../src/foundation/actionBus';
import { GuardianPolicy, GuardianTrust, GuardianApproval, GuardianAuditLog } from '../../src/foundation/guardian';
import * as IslandQueue from '../../src/foundation/island/eventQueue';
import * as SoundMap from '../../src/foundation/sound/soundMap';
import * as MotionIdentity from '../../src/foundation/motion/motionIdentity';
import * as Goals from '../../src/foundation/goals/goalModel';
import * as Metrics from '../../src/foundation/metrics/metricModel';
import * as ProactiveMessaging from '../../src/foundation/messaging/proactiveMessage';
import * as ContextPanelRegistry from '../../src/foundation/contextPanel/contextPanelRegistry';
import { bootstrapDomains, __resetBootstrapForTests } from '../../src/foundation/domains';
import { toAgendaDomain, toAgendaSourceRef } from '../../src/foundation/domains/agendaBridge';
import { getTodayContextSnapshot } from '../../src/foundation/hojeContext';
import type { DomainDefinition } from '../../src/foundation/types/domain';

let fails = 0;
let total = 0;

function check(label: string, cond: boolean): void {
  total += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`);
  if (!cond) fails += 1;
}

function resetAll(): void {
  DomainRegistry.__resetRegistryForTests();
  EventBus.__resetEventBusForTests();
  ActionBus.__resetActionBusForTests();
  GuardianPolicy.__resetPolicyForTests();
  GuardianTrust.__resetTrustForTests();
  GuardianApproval.__resetApprovalsForTests();
  GuardianAuditLog.__resetAuditLogForTests();
  IslandQueue.__resetIslandQueueForTests();
  SoundMap.__resetSoundMapForTests();
  MotionIdentity.__resetMotionIdentityForTests();
  Goals.__resetGoalsForTests();
  Metrics.__resetMetricsForTests();
  ProactiveMessaging.__resetProactiveMessagesForTests();
  ContextPanelRegistry.__resetContextPanelsForTests();
  __resetBootstrapForTests();
}

// =============================================================================
// 1. Registrar novo domínio (prova de extensibilidade — inclui o futuro Espiritual)
// =============================================================================
resetAll();
{
  const spiritualDomain: DomainDefinition = {
    id: 'spiritual',
    label: 'Espiritual',
    isLive: false,
    capabilities: [],
    eventTypes: ['DEVOTIONAL_COMPLETED'],
    actionTypes: [],
  };
  DomainRegistry.registerDomain(spiritualDomain);
  check(
    '1.1: um domínio futuro (Espiritual) registra sem nenhuma mudança estrutural no registry',
    DomainRegistry.getDomain('spiritual')?.id === 'spiritual'
  );

  let threw = false;
  try {
    DomainRegistry.registerDomain(spiritualDomain);
  } catch {
    threw = true;
  }
  check('1.2: registrar o mesmo domínio duas vezes lança erro (nunca sobrescreve em silêncio)', threw);
}

// =============================================================================
// 2. Resolver persona + capability (contra domínios REAIS: Educação e Agenda)
// =============================================================================
resetAll();
bootstrapDomains();
{
  const persona = DomainRegistry.getPersona('education');
  check('2.1: persona de um domínio real é resolvível', persona?.displayName === 'Educação');
  check('2.2: persona carrega initiativeLevel (não é caricata, mas tem substância)', persona?.initiativeLevel === 'moderado');

  const capability = DomainRegistry.getCapability('agenda', 'detectConflict');
  check('2.3: capability real de um domínio existente é resolvível', capability?.implemented === true);

  const futureCapability = DomainRegistry.getCapability('finance', 'analyzeTransaction');
  check(
    '2.4: capability de domínio futuro existe no contrato mas marcada implemented=false (sem fake integration)',
    futureCapability !== undefined && futureCapability.implemented === false
  );
}

// =============================================================================
// 3. Manter independência de domínio (o registro de um não vaza no outro)
// =============================================================================
{
  const education = DomainRegistry.requireDomain('education');
  const agenda = DomainRegistry.requireDomain('agenda');
  check(
    '3.1: capabilities de Educação e Agenda não se misturam',
    !education.capabilities.some((c) => agenda.capabilities.some((a) => a.id === c.id)) ||
      education.capabilities.length === 0
  );
  check('3.2: cada domínio mantém seu próprio motionIdentityId', education.motionIdentityId !== agenda.motionIdentityId);
}

// =============================================================================
// 4. Emitir evento + dedup
// =============================================================================
resetAll();
{
  const e1 = EventBus.publish({ domain: 'education', type: 'LESSON_COMPLETED', payload: { lessonId: 'l1' } });
  check('4.1: publish() devolve o evento publicado', e1?.type === 'LESSON_COMPLETED');
  check('4.2: evento fica no histórico do bus', EventBus.getHistory({ type: 'LESSON_COMPLETED' }).length === 1);

  const e2 = EventBus.publish({
    domain: 'education',
    type: 'LESSON_COMPLETED',
    payload: { lessonId: 'l1' },
    dedupeKey: 'lesson-l1',
  });
  const e3 = EventBus.publish({
    domain: 'education',
    type: 'LESSON_COMPLETED',
    payload: { lessonId: 'l1' },
    dedupeKey: 'lesson-l1',
  });
  check('4.3: primeiro evento com dedupeKey é aceito', e2 !== null);
  check('4.4: segundo evento com a MESMA dedupeKey na janela é descartado (evita duplicate events)', e3 === null);
}

// =============================================================================
// 5. Transformar evento em ação (o fluxo de orquestração da seção 58)
// =============================================================================
resetAll();
{
  let actionCreatedFromEvent: string | null = null;
  const unsubscribe = EventBus.subscribe('LESSON_COMPLETED', (event) => {
    const action = ActionBus.createAction({
      domain: 'education',
      type: 'CREATE_REVIEW_BLOCK',
      intent: 'Criar bloco de revisão para a aula concluída',
      payload: { lessonId: (event.payload as { lessonId: string }).lessonId },
      riskLevel: 'baixo',
      reversible: true,
      source: event.id,
    });
    actionCreatedFromEvent = action.id;
  });

  EventBus.publish({ domain: 'education', type: 'LESSON_COMPLETED', payload: { lessonId: 'l2' } });
  unsubscribe();

  check('5.1: EVENTO ≠ AÇÃO — um listener transforma o evento numa Action separada', actionCreatedFromEvent !== null);
  const createdAction = ActionBus.getAction(actionCreatedFromEvent!);
  check('5.2: a Action criada carrega o evento de origem em `source`', createdAction?.source !== undefined);
  check('5.3: a Action nasce como PROPOSED, antes de passar pelo Guardian', createdAction?.status === 'PROPOSED');
}

// =============================================================================
// 6. Passar ação pelo Guardian policy + classificar L1/L2/L3
// =============================================================================
resetAll();
bootstrapDomains();
{
  const l1Action = ActionBus.createAction({
    domain: 'education',
    type: 'CREATE_REVIEW_BLOCK',
    intent: 'Criar revisão',
    payload: {},
    riskLevel: 'baixo',
    reversible: true,
  });
  const l1Evaluation = ActionBus.dispatch(l1Action);
  check(
    '6.1: ação com regra L1 e SEM histórico ainda não executa sozinha (precisa de evidência primeiro)',
    l1Evaluation.decision.level === 'L2' && l1Evaluation.decision.requiresApproval === true
  );

  // Constrói confiança suficiente antes de tentar de novo.
  for (let i = 0; i < 8; i += 1) {
    GuardianTrust.recordOutcome({
      domain: 'education',
      actionType: 'CREATE_REVIEW_BLOCK',
      outcome: 'accepted',
      actionId: `seed_${i}`,
    });
  }
  const l1ActionTrusted = ActionBus.createAction({
    domain: 'education',
    type: 'CREATE_REVIEW_BLOCK',
    intent: 'Criar revisão',
    payload: {},
    riskLevel: 'baixo',
    reversible: true,
  });
  const l1EvaluationTrusted = ActionBus.dispatch(l1ActionTrusted);
  check(
    '6.2: com confiança acumulada suficiente, a MESMA ação agora classifica como L1 automático',
    l1EvaluationTrusted.decision.level === 'L1' && l1EvaluationTrusted.decision.requiresApproval === false
  );
  check('6.3: Action L1 autorizada tem status AUTHORIZED (nunca AWAITING_APPROVAL)', l1EvaluationTrusted.action.status === 'AUTHORIZED');

  const l2Action = ActionBus.createAction({
    domain: 'agenda',
    type: 'RESCHEDULE_IMPORTANT_EVENT',
    intent: 'Reagendar compromisso importante',
    payload: {},
    riskLevel: 'moderado',
    reversible: true,
  });
  const l2Evaluation = ActionBus.dispatch(l2Action);
  check('6.4: ação L2 sempre exige decisão humana (Aplicar/Revisar)', l2Evaluation.decision.level === 'L2' && l2Evaluation.decision.requiresApproval);

  const l3Action = ActionBus.createAction({
    domain: 'finance',
    type: 'EXECUTE_PAYMENT',
    intent: 'Realizar pagamento de R$ 100',
    payload: {},
    riskLevel: 'alto',
    reversible: false,
  });
  const l3Evaluation = ActionBus.dispatch(l3Action);
  check('6.5: pagamento é sempre L3, mesmo sem nenhum histórico', l3Evaluation.decision.level === 'L3');
  check('6.6: Action L3 fica AWAITING_APPROVAL, nunca executa sozinha', l3Evaluation.action.status === 'AWAITING_APPROVAL');

  const unknownAction = ActionBus.createAction({
    domain: 'finance',
    type: 'TIPO_INVENTADO_SEM_REGRA',
    intent: 'Ação sem política conhecida',
    payload: {},
    riskLevel: 'baixo',
    reversible: true,
  });
  const unknownEvaluation = ActionBus.dispatch(unknownAction);
  check(
    '6.7: tipo de ação SEM regra registrada é tratado como risco MÁXIMO (L3), nunca liberado por padrão',
    unknownEvaluation.decision.level === 'L3' && unknownEvaluation.decision.isUnknownActionType === true
  );

  const irreversibleL1Rule = ActionBus.createAction({
    domain: 'body',
    type: 'SCHEDULE_LIGHT_ACTIVITY',
    intent: 'Encaixar caminhada',
    payload: {},
    riskLevel: 'baixo',
    reversible: false, // marcado irreversível de propósito, mesmo a regra sendo L1
  });
  const irreversibleEvaluation = ActionBus.dispatch(irreversibleL1Rule);
  check(
    '6.8: rede de segurança — ação irreversível nunca auto-executa mesmo com política L1',
    irreversibleEvaluation.decision.level === 'L2'
  );
}

// =============================================================================
// 7. Consultar trust profile (interpretável, não número mágico solto)
// =============================================================================
resetAll();
{
  const empty = GuardianTrust.getTrust('finance', 'CATEGORIZE_TRANSACTION');
  check('7.1: sem evidência nenhuma, trust profile não existe ainda', empty === undefined);

  GuardianTrust.recordOutcome({ domain: 'finance', actionType: 'CATEGORIZE_TRANSACTION', outcome: 'accepted', actionId: 'a1' });
  GuardianTrust.recordOutcome({ domain: 'finance', actionType: 'CATEGORIZE_TRANSACTION', outcome: 'accepted', actionId: 'a2' });
  const learning = GuardianTrust.getTrust('finance', 'CATEGORIZE_TRANSACTION');
  check('7.2: com poucas amostras, estado é "aprendendo" (nunca "confiavel" prematuramente)', learning?.state === 'aprendendo');

  for (let i = 0; i < 8; i += 1) {
    GuardianTrust.recordOutcome({ domain: 'finance', actionType: 'CATEGORIZE_TRANSACTION', outcome: 'accepted', actionId: `b${i}` });
  }
  const confident = GuardianTrust.getTrust('finance', 'CATEGORIZE_TRANSACTION');
  check('7.3: amostra suficiente com alta aceitação vira "confiavel"', confident?.state === 'confiavel');

  GuardianTrust.recordOutcome({ domain: 'finance', actionType: 'CATEGORIZE_TRANSACTION', outcome: 'rejected', actionId: 'c1' });
  GuardianTrust.recordOutcome({ domain: 'finance', actionType: 'CATEGORIZE_TRANSACTION', outcome: 'rejected', actionId: 'c2' });
  GuardianTrust.recordOutcome({ domain: 'finance', actionType: 'CATEGORIZE_TRANSACTION', outcome: 'rejected', actionId: 'c3' });
  GuardianTrust.recordOutcome({ domain: 'finance', actionType: 'CATEGORIZE_TRANSACTION', outcome: 'rejected', actionId: 'c4' });
  GuardianTrust.recordOutcome({ domain: 'finance', actionType: 'CATEGORIZE_TRANSACTION', outcome: 'rejected', actionId: 'c5' });
  GuardianTrust.recordOutcome({ domain: 'finance', actionType: 'CATEGORIZE_TRANSACTION', outcome: 'rejected', actionId: 'c6' });
  const attention = GuardianTrust.getTrust('finance', 'CATEGORIZE_TRANSACTION');
  check(
    '7.4: uma sequência de rejeições recentes derruba o estado para "requer_atencao" (a IA não some com o problema)',
    attention?.state === 'requer_atencao'
  );
}

// =============================================================================
// 8. Gerar Approval Request + auditoria (seção 32)
// =============================================================================
resetAll();
bootstrapDomains();
{
  const action = ActionBus.createAction({
    domain: 'finance',
    type: 'EXECUTE_PAYMENT',
    intent: 'Pagamento de R$ 250',
    payload: {},
    riskLevel: 'alto',
    reversible: false,
  });
  const evaluation = ActionBus.dispatch(action);

  check('8.1: ação L3 gera uma ApprovalRequest de verdade', evaluation.approvalRequest !== undefined);
  check('8.2: ApprovalRequest nasce "pending"', evaluation.approvalRequest?.status === 'pending');

  const approved = GuardianApproval.approve(evaluation.approvalRequest!.id);
  check('8.3: approve() muda o status pra "approved"', approved.status === 'approved');

  let threwOnDoubleResolve = false;
  try {
    GuardianApproval.reject(evaluation.approvalRequest!.id);
  } catch {
    threwOnDoubleResolve = true;
  }
  check('8.4: uma ApprovalRequest já resolvida não pode ser resolvida de novo', threwOnDoubleResolve);

  check('8.5: toda avaliação gera uma ActionAuditLogEntry, mesmo em L3', evaluation.auditLogEntry !== undefined);
  const recent = GuardianAuditLog.listRecent(5, { domain: 'finance' });
  check('8.6: o audit log é consultável por domínio, mais recente primeiro', recent[0]?.id === evaluation.auditLogEntry.id);
}

// =============================================================================
// 9. Undo de ação reversível (seção 33)
// =============================================================================
resetAll();
{
  const action = ActionBus.createAction({
    domain: 'agenda',
    type: 'RESCHEDULE_ITEM',
    intent: 'Mover evento',
    payload: {},
    riskLevel: 'baixo',
    reversible: true,
  });
  ActionBus.updateStatus(action.id, 'EXECUTING');
  ActionBus.updateStatus(action.id, 'SUCCESS');
  const undone = ActionBus.undo(action.id);
  check('9.1: ação reversível em SUCCESS pode ser desfeita', undone.status === 'UNDONE');

  const irreversible = ActionBus.createAction({
    domain: 'finance',
    type: 'EXECUTE_PAYMENT',
    intent: 'Pagamento',
    payload: {},
    riskLevel: 'alto',
    reversible: false,
  });
  ActionBus.updateStatus(irreversible.id, 'EXECUTING');
  ActionBus.updateStatus(irreversible.id, 'SUCCESS');
  let threwOnIrreversibleUndo = false;
  try {
    ActionBus.undo(irreversible.id);
  } catch {
    threwOnIrreversibleUndo = true;
  }
  check('9.2: ação irreversível nunca pode ser desfeita', threwOnIrreversibleUndo);
}

// =============================================================================
// 10. Publicar mensagem proativa (cooldown/dedup/canal)
// =============================================================================
resetAll();
{
  const msg1 = ProactiveMessaging.publish({
    domain: 'finance',
    message: 'Pagamento vence amanhã.',
    evidence: { reason: 'Compromisso financeiro com vencimento em 24h', evidence: ['dueDate=amanhã'] },
    surfaceTargets: ['hoje', 'notification'],
    cooldownKey: 'payment-due-x',
    cooldownMs: 60_000,
  });
  check('10.1: primeira mensagem proativa é publicada', msg1 !== null);

  const msg2 = ProactiveMessaging.publish({
    domain: 'finance',
    message: 'Pagamento vence amanhã (de novo).',
    evidence: { reason: 'Mesmo compromisso', evidence: [] },
    surfaceTargets: ['hoje'],
    cooldownKey: 'payment-due-x',
    cooldownMs: 60_000,
  });
  check('10.2: segunda mensagem com a mesma cooldownKey dentro da janela é suprimida (não é spam)', msg2 === null);

  const guardianView = ProactiveMessaging.presentFor(msg1!, 'guardian');
  const islandView = ProactiveMessaging.presentFor(msg1!, 'island');
  check('10.3: a apresentação em Guardian é mais detalhada que no Island (adaptada por canal)', guardianView.length > islandView.length);
  check('10.4: a apresentação no Island nunca ultrapassa o teto curto', islandView.length <= 40);
}

// =============================================================================
// 11. Island Event Queue — prioridade, interrupção, dedup, independência de domínio
// =============================================================================
resetAll();
{
  const now = new Date().toISOString();
  const infoEvent = IslandQueue.enqueue({
    id: 'isl_1',
    domain: 'education',
    islandState: 'processing',
    priority: 1,
    severity: 'info',
    message: 'Processando material',
    requiresAttention: false,
    interruptible: true,
    createdAt: now,
  });
  check('11.1: evento informativo é enfileirado', infoEvent !== null);
  check('11.2: com só 1 evento, peek() devolve ele', IslandQueue.peek()?.id === 'isl_1');

  const criticalEvent = IslandQueue.enqueue({
    id: 'isl_2',
    domain: 'finance',
    islandState: 'attention',
    priority: 2,
    severity: 'critical',
    message: 'Pagamento aguardando aprovação',
    requiresAttention: true,
    interruptible: false,
    createdAt: new Date(Date.now() + 10).toISOString(),
  });
  check('11.3: evento crítico de outro domínio é aceito na mesma fila', criticalEvent !== null);
  check('11.4: preservar prioridade — o evento crítico agora vence o peek(), não o mais antigo', IslandQueue.peek()?.id === 'isl_2');

  const current = IslandQueue.peek()!;
  const wouldInterruptInfo = IslandQueue.wouldInterrupt(
    { ...current, id: 'isl_1', severity: 'info', interruptible: true } as never,
    criticalEvent!
  );
  check('11.5: um evento interruptible cede lugar a um evento de maior precedência', wouldInterruptInfo);

  const dup = IslandQueue.enqueue({
    id: 'isl_3',
    domain: 'finance',
    islandState: 'attention',
    priority: 2,
    severity: 'critical',
    message: 'Pagamento aguardando aprovação (duplicado)',
    requiresAttention: true,
    interruptible: false,
    createdAt: new Date(Date.now() + 20).toISOString(),
    dedupeKey: criticalEvent!.dedupeKey ?? 'never-set',
  });
  // sem dedupeKey nos dois primeiros, este teste confirma que a dedup só age quando a key é usada
  check('11.6: sem dedupeKey compartilhada, eventos distintos não são fundidos indevidamente', dup !== null);

  const educationEvents = IslandQueue.listByDomain('education');
  const financeEvents = IslandQueue.listByDomain('finance');
  check(
    '11.7: manter independência de domínio — filtrar por domínio nunca mistura eventos de outro',
    educationEvents.every((e) => e.domain === 'education') && financeEvents.every((e) => e.domain === 'finance')
  );
}

// =============================================================================
// 12. Sound Map + Motion Identity — extensível, com validação de chave
// =============================================================================
resetAll();
bootstrapDomains();
{
  check('12.1: chave de som válida para o domínio é reconhecida', SoundMap.isValidSoundKey('education', 'lesson-complete'));
  check('12.2: chave de som inventada/fora do contrato é rejeitada', !SoundMap.isValidSoundKey('education', 'hover-qualquer-coisa'));
  check('12.3: cada domínio tem seu próprio Motion Identity, sem colisão', MotionIdentity.getMotionProfile('agenda')?.metaphor === 'deslocamento');
}

// =============================================================================
// 13. Goals compartilhados
// =============================================================================
resetAll();
{
  const goal = Goals.createGoal({
    domain: 'education',
    title: 'Passar no ENEM',
    milestones: [{ label: 'Concluir diagnóstico' }, { label: 'Completar simulado 1' }],
  });
  check('13.1: goal nasce com progress derivado dos milestones (0 aqui, nenhum concluído)', goal.progress === 0);

  const updated = Goals.achieveMilestone(goal.id, goal.milestones[0].id);
  check('13.2: progress é recalculado automaticamente ao concluir um milestone', updated.progress === 0.5);

  const insight = Goals.createInsight({
    domain: 'body',
    observation: 'Dia mais carregado que o normal',
    evidence: ['trabalho', 'faculdade', '90min de estudo'],
    reasoningSummary: 'Densidade de compromissos acima da média dos últimos 7 dias',
    confidence: 0.7,
    relatedGoalId: goal.id,
  });
  check('13.3: Insight carrega evidência explícita, nunca só uma conclusão solta', insight.evidence.length > 0);
}

// =============================================================================
// 14. Context Panel registry — implementado vs. fundação apenas
// =============================================================================
resetAll();
bootstrapDomains();
{
  check('14.1: domínio real (Agenda) tem Context Panel implementado', ContextPanelRegistry.hasImplementedContextPanel('agenda'));
  check('14.2: domínio futuro (Finanças) está registrado mas SEM painel implementado ainda', !ContextPanelRegistry.hasImplementedContextPanel('finance'));
}

// =============================================================================
// 15. Bootstrap é idempotente (StrictMode/HMR não duplica registros)
// =============================================================================
resetAll();
{
  bootstrapDomains();
  const countAfterFirst = DomainRegistry.listDomains().length;
  bootstrapDomains();
  bootstrapDomains();
  const countAfterRepeated = DomainRegistry.listDomains().length;
  check('15.1: chamar bootstrapDomains() múltiplas vezes não duplica nem lança erro', countAfterFirst === countAfterRepeated);
}

// =============================================================================
// 16. Agenda reconhece origem dos blocos (ponte com AgendaDomain/AgendaSourceRef já existentes)
// =============================================================================
{
  check('16.1: domínio Educação mapeia pra AgendaDomain "education"', toAgendaDomain('education') === 'education');
  check('16.2: domínio Corpo mapeia pra AgendaDomain "body"', toAgendaDomain('body') === 'body');
  check('16.3: domínio Finanças mapeia pra AgendaDomain "finance"', toAgendaDomain('finance') === 'finance');
  check(
    '16.4: domínio sem AgendaDomain dedicado (Guardian) cai em "external", nunca quebra',
    toAgendaDomain('guardian') === 'external'
  );

  const sourceRef = toAgendaSourceRef('finance', 'commitment_1', 'Mensalidade da faculdade');
  check('16.5: AgendaSourceRef gerado usa o sourceType certo pro domínio', sourceRef.sourceType === 'finance_deadline');
  check('16.6: AgendaSourceRef preserva sourceId/sourceLabel', sourceRef.sourceId === 'commitment_1' && sourceRef.sourceLabel === 'Mensalidade da faculdade');
}

// =============================================================================
// 17. Hoje consome contexto multidomínio (camada de síntese, seção 3/13)
// =============================================================================
resetAll();
bootstrapDomains();
{
  Goals.createInsight({
    domain: 'body',
    observation: 'Dia carregado',
    evidence: ['agenda densa'],
    reasoningSummary: 'Muitos compromissos hoje',
    confidence: 0.6,
  });
  Goals.createInsight({
    domain: 'finance',
    observation: 'Pagamento perto do vencimento',
    evidence: ['dueDate=amanhã'],
    reasoningSummary: 'Vencimento em 24h',
    confidence: 0.9,
  });
  ProactiveMessaging.publish({
    domain: 'education',
    message: 'Revisão disponível numa janela livre amanhã.',
    evidence: { reason: 'Cronograma detectou brecha', evidence: [] },
    surfaceTargets: ['hoje'],
  });

  const snapshot = getTodayContextSnapshot();
  const insightDomains = new Set(snapshot.recentInsights.map((i) => i.domain));
  check(
    '17.1: Hoje agrega insights de MAIS DE UM domínio na mesma leitura, sem importar nenhum deles diretamente',
    insightDomains.has('body') && insightDomains.has('finance')
  );
  check('17.2: Hoje só vê mensagens proativas endereçadas explicitamente a "hoje"', snapshot.messagesForToday.every((m) => m.surfaceTargets.includes('hoje')));
  check('17.3: Hoje enxerga a lista de domínios "ao vivo" (não os contratos futuros)', snapshot.liveDomains.every((d) => d.isLive));
}

console.log(`\n${total - fails}/${total} checagens OK`);
console.log(fails === 0 ? 'RESULTADO: PASS' : `RESULTADO: FAIL (${fails} falha(s))`);
process.exit(fails > 0 ? 1 : 0);
