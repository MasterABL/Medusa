/**
 * MEDUSA — Cenários de integração da rodada Guardian + Espiritual
 *
 * 1. Guardian encontra problema → proposta → aprovação → execução → verificação
 * 2. Guardian encontra problema que não pode corrigir → bloqueia/propõe
 * 3. Espiritual cria prática → sugere Agenda → aparece em Hoje
 * 4. Plano de leitura avança → atualiza progresso/contexto sem vazar reflexão
 */

import { resetAll, seedTrust, makeChecker } from './_helpers';
import * as EventBus from '../../../src/foundation/eventBus';
import * as ProactiveMessaging from '../../../src/foundation/messaging/proactiveMessage';
import * as Lifecycle from '../../../src/foundation/guardianLifecycle';
import { getTodayContextSnapshot } from '../../../src/foundation/hojeContext';
import {
  GuardianDomainApi,
  codeAuditor,
  createDuplicateRemovalHandler,
  createInMemoryGuardianRepository,
  createRemediationRegistry,
  dataAuditor,
  defineSource,
  runGuardianCycle,
  securityAuditor,
  spiritualPrivacyAuditor,
} from '../../../src/domains/guardian';
import type { RecordStore } from '../../../src/domains/guardian';
import {
  ReadingPlanEngine,
  SpiritualAI,
  SpiritualApi,
  SpiritualHojeIntelligence,
  SpiritualPrivacy,
  completeReadingEntry,
  createInMemorySpiritualRepository,
  createPurpose,
  createReadingPlan,
  definePractice,
  proposePracticeToAgenda,
} from '../../../src/domains/spiritual';
import { createReflection } from '../../../src/domains/spiritual/useCases/createReflection';
import { createFixtureReflection } from '../../../src/domains/spiritual/fixtures';

const NOW = new Date('2026-03-10T12:00:00.000Z');
const iso = (d: string) => `${d}T08:00:00.000Z`;

export async function run(): Promise<{ total: number; fails: number }> {
  const { check, result } = makeChecker('integração-2');

  // ===== CENÁRIO 1 — Guardian: problema → proposta → aprovação → execução → verificação =====
  resetAll();
  {
    let records = [
      { id: 'r1', ref: 'X', v: 1 },
      { id: 'r2', ref: 'X', v: 1 },
      { id: 'r3', ref: 'Y', v: 2 },
    ] as Array<{ id: string } & Record<string, unknown>>;
    const store: RecordStore = { list: () => records, remove: (_c, ids) => void (records = records.filter((r) => !ids.includes(r.id))) };
    const remediations = createRemediationRegistry();
    remediations.register(createDuplicateRemovalHandler(store));
    const repository = createInMemoryGuardianRepository();
    const ctx = { repository, remediations, sources: [defineSource(dataAuditor, () => ({ collection: 'lancamentos', records: store.list('lancamentos'), uniqueKeys: [['ref']] }))] };

    const r1 = await runGuardianCycle(ctx);
    const finding = repository.listFindings()[0];
    check('G1.1: o Guardian observa, detecta e classifica com evidência (onde/o quê/esperado/diferença)', r1.newFindings === 1 && finding.evidence[0].reference === 'lancamentos#r1,r2' && !!finding.evidence[0].difference);
    check('G1.2: gera proposta e, sem confiança acumulada, pede aprovação em vez de agir', r1.awaitingApproval === 1 && records.length === 3);
    check('G1.3: a aprovação pendente aparece no contexto do Hoje', getTodayContextSnapshot().pendingApprovals.length === 1);
    GuardianDomainApi.publishFindingMessages(repository);
    check('G1.4: e vira aviso no canal "guardian"', ProactiveMessaging.list({ domain: 'guardian', surface: 'guardian' }).length === 1);

    const proposal = repository.getProposal(finding.proposalId!)!;
    Lifecycle.resolveApproval(proposal.approvalRequestId!, 'approve');
    const r2 = await runGuardianCycle(ctx);
    const done = repository.getFinding(finding.id)!;
    check('G1.5: aprovado, o próximo ciclo executa e VERIFICA (esperado × observado)', r2.approvedAndExecuted === 1 && records.length === 2 && done.status === 'resolved' && done.outcome?.verification?.status === 'verified');
    check('G1.6: a aprovação sai da lista pendente e o histórico fica completo', getTodayContextSnapshot().pendingApprovals.length === 0 && repository.listEvents({ findingId: finding.id }).some((e) => e.type === 'VERIFICATION_RECORDED'));
    const r3 = await runGuardianCycle(ctx);
    check('G1.7: ciclo seguinte encontra tudo limpo (nada novo, nada reaberto)', r3.newFindings === 0 && r3.reopened === 0 && r3.observed === 0);
  }

  // ===== CENÁRIO 2 — Guardian: não pode corrigir → bloqueia/propõe =====
  resetAll();
  {
    const repository = createInMemoryGuardianRepository();
    const ctx = {
      repository,
      remediations: createRemediationRegistry(),
      sources: [
        defineSource(securityAuditor, () => ({ items: [{ location: 'infra/chave.pem', content: '-----BEGIN RSA PRIVATE KEY-----\nabc' }] })),
        defineSource(codeAuditor, () => ({ files: [{ path: 'src/x.ts', content: 'try { a() } catch (e) {}' }] })),
      ],
    };
    seedTrust('guardian', 'ROTATE_SECRET', 40);
    const r = await runGuardianCycle(ctx);
    const rotate = repository.listFindings().find((f) => f.category === 'security')!;
    const smell = repository.listFindings().find((f) => f.category === 'code')!;
    check('G2.1: chave privada exposta: L3 e sem remediador → bloqueada, explicando por quê', rotate.status === 'blocked' && rotate.severity === 'critica' && rotate.requiredAutonomy === 'L3' && rotate.outcome!.reason.includes('não existe remediador'));
    check('G2.2: catch vazio: sem correção segura sugerida → decisão humana, sem inventar conserto', smell.status === 'blocked' && smell.outcome!.reason.includes('decisão humana'));
    check('G2.3: nada foi executado nem proposto às cegas', r.autoFixed === 0 && repository.listExecutions().length === 0 && repository.listProposals().length === 0 && r.blocked === 2);
    check('G2.4: mesmo com confiança alta em ROTATE_SECRET, o teto L3 continua valendo', r.awaitingApproval === 0 && r.autoFixed === 0);
    const surfaced = GuardianDomainApi.publishFindingMessages(repository);
    check('G2.5: os bloqueios chegam a uma pessoa pelo canal do Guardian', surfaced === 2);

    // Registrar o remediador depois NÃO faz L3 executar: passa a pedir aprovação.
    ctx.remediations.register({ actionKey: 'ROTATE_SECRET', expectation: () => 'rotacionada', describe: () => 'rotacionar chave', execute: () => undefined });
    GuardianDomainApi.reconsiderFinding(repository, rotate.id, NOW);
    const r2 = await runGuardianCycle(ctx);
    check('G2.6: com remediador presente, L3 vira pedido de aprovação — continua sem executar sozinho', r2.awaitingApproval === 1 && repository.listExecutions().length === 0);
  }

  // ===== CENÁRIO 3 — Espiritual: prática → Agenda → Hoje =====
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    createPurpose(repo, { id: 'pur', label: 'Crescer em paciência', themes: ['paciência'], status: 'active', createdAt: iso('2026-03-01') });
    definePractice(repo, {
      id: 'def',
      kind: 'oracao',
      intention: 'pedir calma para uma semana muito difícil no trabalho',
      purposeId: 'pur',
      frequency: { timesPerWeek: 7 },
      durationMinutes: 10,
      status: 'active',
      priority: 'alta',
      preferredWindowLabels: ['manha'],
      createdAt: iso('2026-03-01'),
    });
    seedTrust('spiritual', 'SCHEDULE_PRACTICE');
    const proposal = proposePracticeToAgenda(repo, { definitionId: 'def', availableWindows: ['tarde', 'manha'], date: '2026-03-11' });
    check('S3.1: a prática vira sugestão de Agenda (janela preferida, duração, prioridade espiritual) passando pelo Guardian', !proposal.evaluation.decision.requiresApproval && proposal.suggestion?.windowLabel === 'manha' && proposal.suggestion.priority === 'alta' && proposal.suggestion.kind === 'time_block');
    check('S3.2: a Agenda recebe só metadado — nunca a intenção da oração', !JSON.stringify(proposal.suggestion).includes('semana muito difícil'));

    const view = SpiritualApi.getTodayView(repo, NOW);
    SpiritualHojeIntelligence.publishSpiritualHojeMessages(view);
    const snapshot = getTodayContextSnapshot().messagesForToday.filter((m) => m.domain === 'spiritual');
    check('S3.3: a prática aparece no Hoje como item compacto de prioridade alta', view.items[0].kind === 'practice' && view.items[0].priority === 'alta' && snapshot.length === 1);
    check('S3.4: nem o Hoje nem a mensagem trazem a intenção', !JSON.stringify(view).includes('semana muito difícil') && !JSON.stringify(snapshot).includes('semana muito difícil'));
  }

  // ===== CENÁRIO 4 — Plano de leitura avança sem vazar reflexão =====
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    const SECRET = 'reflexao intima que nunca deve aparecer em evento, mensagem, contexto ou log';
    createReflection(repo, createFixtureReflection({ id: 'refl', content: SECRET }));
    const plan = ReadingPlanEngine.planFromChapters({ id: 'pl', title: 'Salmos', chapters: [1, 2, 3, 4].map((c) => ({ book: 'PSA', chapter: c })), startDate: '2026-03-09', createdAt: iso('2026-03-09') });
    createReadingPlan(repo, plan, iso('2026-03-09'));
    completeReadingEntry(repo, { planId: 'pl', entryId: plan.entries[0].id, completedAt: iso('2026-03-09'), today: '2026-03-09' });
    const state = completeReadingEntry(repo, { planId: 'pl', entryId: plan.entries[1].id, completedAt: iso('2026-03-10'), today: '2026-03-10' });
    check('S4.1: o avanço atualiza progresso e continuidade (2/4, em dia, próximo = Salmo 3)', state.completedCount === 2 && state.status === 'em_dia' && state.nextEntry?.references[0].chapter === 3);
    check('S4.2: o estado aparece pelo contrato público', SpiritualApi.getReadingStates(repo, NOW)[0].completedCount === 2);

    const ctx = SpiritualAI.buildAIContext(repo, { consent: { shareTradition: false, sharePractices: false, shareStudies: false, shareReadingPlan: true, shareGoals: false, sharePurposes: false }, focus: { planId: 'pl' }, now: NOW });
    check('S4.3: o contexto de IA recebe posição e próximos trechos do plano', ctx.readingPlan?.position === '2/4' && ctx.readingPlan.nextReferences.length === 2);

    SpiritualHojeIntelligence.publishSpiritualHojeMessages(SpiritualApi.getTodayView(repo, NOW));
    const outbound = [
      ...EventBus.getHistory().map((e) => ({ channel: `evento:${e.type}`, text: JSON.stringify(e.payload) })),
      ...ProactiveMessaging.list({ includeDismissed: true }).map((m) => ({ channel: `mensagem:${m.domain}`, text: `${m.message} ${m.evidence.reason} ${m.evidence.evidence.join(' ')}` })),
      { channel: 'contexto-ia', text: JSON.stringify(ctx) },
    ];
    const guardianRepo = createInMemoryGuardianRepository();
    const report = await runGuardianCycle({
      repository: guardianRepo,
      remediations: createRemediationRegistry(),
      sources: [defineSource(spiritualPrivacyAuditor, () => ({ privateItems: SpiritualPrivacy.collectPrivateItems(repo).map((p) => ({ id: p.id, kind: p.kind, content: p.content })), outbound }))],
    });
    check(`S4.4: o Guardian auditou ${outbound.length} canais de saída (eventos, mensagens, contexto de IA) e não achou a reflexão em nenhum`, outbound.length >= 3 && report.newFindings === 0 && report.auditorFailures.length === 0);
    const control = await runGuardianCycle({
      repository: createInMemoryGuardianRepository(),
      remediations: createRemediationRegistry(),
      sources: [defineSource(spiritualPrivacyAuditor, () => ({ privateItems: [{ id: 'refl', kind: 'reflection', content: SECRET }], outbound: [...outbound, { channel: 'log-de-debug', text: `debug ${SECRET}` }] }))],
    });
    check('S4.5: controle positivo — se a reflexão vazasse num log, o mesmo auditor pegaria', control.newFindings === 1);
  }

  return result();
}

if (require.main === module) {
  run().then(({ total, fails }) => {
    console.log(`\n[integração-2] ${total - fails}/${total} checagens OK`);
    process.exit(fails > 0 ? 1 : 0);
  });
}
