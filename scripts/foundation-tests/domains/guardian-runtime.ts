/**
 * MEDUSA — Guardian runtime — testes do ciclo observe → decide → age → verifica.
 *
 * "Runtime preparado para execução contínua": nada aqui roda por relógio. Cada
 * teste chama `runGuardianCycle` explicitamente, como um scheduler futuro faria.
 */

import { resetAll, seedTrust, makeChecker } from './_helpers';
import * as DomainRegistry from '../../../src/foundation/domainRegistry';
import * as ActionBus from '../../../src/foundation/actionBus';
import * as Lifecycle from '../../../src/foundation/guardianLifecycle';
import { GuardianAuditLog, GuardianPolicy, GuardianTrust } from '../../../src/foundation/guardian';
import {
  GuardianDomainApi,
  GuardianValidationError,
  SECRET_PATTERNS,
  codeAuditor,
  createDuplicateRemovalHandler,
  createInMemoryGuardianRepository,
  createRemediationRegistry,
  createSecretRedactionHandler,
  dataAuditor,
  defineSource,
  deserializeFinding,
  deserializeProposal,
  integrationAuditor,
  partitionReports,
  previewActionAutonomyChange,
  previewDomainAutonomyChange,
  productAuditor,
  runGuardianCycle,
  securityAuditor,
  serializeFinding,
  serializeProposal,
  spiritualPrivacyAuditor,
  uxAuditor,
  validateDraft,
  verifyActionOutcome,
} from '../../../src/domains/guardian';
import type { Auditor, GuardianCycleContext, RecordStore, TextStore } from '../../../src/domains/guardian';

type Rec = { id: string } & Record<string, unknown>;

function makeStore(initial: Rec[]): RecordStore & { trash: Rec[]; all(): Rec[] } {
  let records = [...initial];
  const trash: Rec[] = [];
  return {
    trash,
    all: () => records,
    list: () => records,
    remove(_collection, ids) {
      trash.push(...records.filter((r) => ids.includes(r.id)));
      records = records.filter((r) => !ids.includes(r.id));
    },
  };
}

function makeTextStore(files: Record<string, string>): TextStore & { files: Record<string, string> } {
  return { files, read: (l) => files[l], write: (l, t) => void (files[l] = t) };
}

const DUP: Rec[] = [
  { id: 't1', ref: 'A-1', valor: 10 },
  { id: 't2', ref: 'A-1', valor: 10 },
  { id: 't3', ref: 'B-2', valor: 20 },
];

function dataSource(store: RecordStore) {
  return defineSource(dataAuditor, () => ({ collection: 'transacoes', records: store.list('transacoes'), uniqueKeys: [['ref']] }));
}

function makeCtx(store: RecordStore, extra: Partial<GuardianCycleContext> = {}): GuardianCycleContext {
  const remediations = createRemediationRegistry();
  remediations.register(createDuplicateRemovalHandler(store));
  return { repository: createInMemoryGuardianRepository(), sources: [dataSource(store)], remediations, ...extra };
}

export async function run(): Promise<{ total: number; fails: number }> {
  const { check, result } = makeChecker('guardian-runtime');

  // 1. Evidence first
  resetAll();
  {
    let threw = false;
    try {
      validateDraft({ category: 'data', severity: 'alta', origin: 'x', evidence: [], context: {}, impact: 'i', confidence: 0.5, hypothesis: 'h', dedupeKey: 'k' });
    } catch (e) {
      threw = e instanceof GuardianValidationError;
    }
    check('1.1: finding sem evidência é rejeitado (Guardian não afirma problema sem provar)', threw);

    const store = makeStore(DUP);
    const ctx = makeCtx(store);
    await runGuardianCycle(ctx);
    const finding = ctx.repository.listFindings()[0];
    const e = finding.evidence[0];
    check('1.2: evidência responde onde / o quê / esperado / diferença', e.reference === 'transacoes#t1,t2' && e.observation.includes('2 registros') && !!e.expectation && !!e.difference);
    check('1.3: explicação é gerada a partir dos dados do finding', !!finding.explanation && finding.explanation.includes('Onde: transacoes#t1,t2') && finding.explanation.includes('Por que importa'));
    check('1.4: finding carrega categoria, origem, confiança, hipótese, autonomia exigida e correlationId', finding.category === 'data' && finding.origin === 'data-auditor' && finding.confidence > 0 && !!finding.hypothesis && finding.requiredAutonomy === 'L1' && !!finding.correlationId);
  }

  // 2. Sem confiança => proposta pendente; dedupe entre ciclos
  resetAll();
  {
    const store = makeStore(DUP);
    const ctx = makeCtx(store);
    const r1 = await runGuardianCycle(ctx);
    const finding = ctx.repository.listFindings()[0];
    const proposal = ctx.repository.getProposal(finding.proposalId!)!;
    check('2.1: sem confiança, NÃO corrige sozinho: fica aguardando aprovação', r1.awaitingApproval === 1 && r1.autoFixed === 0 && finding.status === 'awaiting_approval');
    check('2.2: o motivo é explicável ("ainda não existe confiança suficiente")', proposal.authorizationReason!.includes('ainda não existe confiança suficiente'));
    check('2.3: nada foi alterado nos dados', store.all().length === 3);
    check('2.4: proposta nasceu PROPOSED → PENDING_APPROVAL', proposal.status === 'PENDING_APPROVAL' && proposal.history.map((h) => h.status).join('>') === 'PROPOSED>PENDING_APPROVAL');

    const r2 = await runGuardianCycle(ctx);
    check('2.5: segundo ciclo deduplica (mesmo problema, sem novo finding nem nova proposta)', r2.deduped === 1 && r2.newFindings === 0 && ctx.repository.listFindings().length === 1 && ctx.repository.listProposals().length === 1);
    check('2.6: ocorrências contadas', ctx.repository.listFindings()[0].occurrences === 2);
  }

  // 3. Aprovação → execução → verificação (CENÁRIO 1)
  resetAll();
  {
    const store = makeStore(DUP);
    const ctx = makeCtx(store);
    await runGuardianCycle(ctx);
    const proposal = ctx.repository.listProposals()[0];
    Lifecycle.resolveApproval(proposal.approvalRequestId!, 'approve');
    check('3.1: aprovar não executa por si só (execução acontece no ciclo)', store.all().length === 3);

    const r = await runGuardianCycle(ctx);
    const finding = ctx.repository.listFindings()[0];
    const done = ctx.repository.getProposal(proposal.id)!;
    check('3.2: depois da aprovação o ciclo executa a correção', store.all().length === 2 && r.approvedAndExecuted === 1);
    check('3.3: duplicata foi para a lixeira recuperável (não apagada)', store.trash.length === 1 && store.trash[0].id === 't2');
    check('3.4: verificação real (estado esperado × observado) marca resolvido', finding.status === 'resolved' && finding.outcome?.verification?.status === 'verified' && finding.outcome.verification.method === 'handler');
    check('3.5: ciclo de vida completo da proposta', done.history.map((h) => h.status).join('>') === 'PROPOSED>PENDING_APPROVAL>APPROVED>EXECUTING>SUCCEEDED');
    check('3.6: auditoria da fundação registrou cada transição da Action', GuardianAuditLog.listForAction(done.actionId!).map((e) => e.statusAtLog).join('>') === 'AWAITING_APPROVAL>AUTHORIZED>EXECUTING>SUCCESS');
    check('3.7: a aprovação humana virou evidência de confiança', GuardianTrust.getTrust('guardian', 'REMOVE_DUPLICATE_RECORDS')?.acceptedCount === 1);
    check('3.8: trilha do Guardian tem detecção, proposta, autorização, execução e verificação', ['FINDING_DETECTED', 'PROPOSAL_CREATED', 'AUTHORIZATION_DECIDED', 'EXECUTION_STARTED', 'VERIFICATION_RECORDED'].every((t) => ctx.repository.listEvents({ findingId: finding.id }).some((e) => e.type === t)));
  }

  // 4. Auto-fix permitido (confiança real) e sem auto-inflar a própria confiança
  resetAll();
  {
    seedTrust('guardian', 'REMOVE_DUPLICATE_RECORDS', 6);
    const store = makeStore(DUP);
    const ctx = makeCtx(store);
    const r = await runGuardianCycle(ctx);
    const finding = ctx.repository.listFindings()[0];
    const proposal = ctx.repository.listProposals()[0];
    check('4.1: com política L1 + confiança + reversível, corrige sozinho', r.autoFixed === 1 && r.awaitingApproval === 0 && store.all().length === 2);
    check('4.2: e só conta como resolvido depois de verificar', finding.status === 'resolved' && finding.outcome?.verification?.status === 'verified');
    check('4.3: proposta automática: PROPOSED → APPROVED → EXECUTING → SUCCEEDED', proposal.history.map((h) => h.status).join('>') === 'PROPOSED>APPROVED>EXECUTING>SUCCEEDED');
    check('4.4: correção automática NÃO aumenta a própria confiança (evita autoconfiança em laço)', GuardianTrust.getTrust('guardian', 'REMOVE_DUPLICATE_RECORDS')?.sampleSize === 6);
  }

  // 5. Rejeição impede execução e gera cooldown
  resetAll();
  {
    const store = makeStore(DUP);
    const ctx = makeCtx(store);
    await runGuardianCycle(ctx);
    const proposal = ctx.repository.listProposals()[0];
    Lifecycle.resolveApproval(proposal.approvalRequestId!, 'reject');
    const r = await runGuardianCycle(ctx);
    const finding = ctx.repository.listFindings()[0];
    check('5.1: rejeitada NÃO executa e os dados ficam intactos', store.all().length === 3 && ctx.repository.getProposal(proposal.id)!.status === 'REJECTED');
    check('5.2: finding fica bloqueado com o motivo', finding.status === 'blocked' && finding.outcome!.reason.includes('recusada') && r.rejectedByUser === 1);
    await runGuardianCycle(ctx);
    check('5.3: durante o cooldown a mesma correção não é reproposta', ctx.repository.listProposals().length === 1);
    check('5.4: a recusa virou evidência de confiança', GuardianTrust.getTrust('guardian', 'REMOVE_DUPLICATE_RECORDS')?.rejectedCount === 1);

    const later = { ...ctx, now: () => new Date(Date.now() + 8 * 24 * 60 * 60 * 1000) };
    await runGuardianCycle(later);
    check('5.5: passado o cooldown, o problema persistente volta a ser proposto', ctx.repository.listProposals().length === 2);
  }

  // 6. Expiração impede execução; o achado volta a ser reavaliado
  resetAll();
  {
    const store = makeStore(DUP);
    const ctx = makeCtx(store);
    await runGuardianCycle(ctx);
    const first = ctx.repository.listProposals()[0];
    const r = await runGuardianCycle({ ...ctx, now: () => new Date(Date.now() + 25 * 60 * 60 * 1000) });
    check('6.1: aprovação vencida expira e nada é executado', ctx.repository.getProposal(first.id)!.status === 'EXPIRED' && store.all().length === 3 && r.expiredApprovals === 1);
    check('6.2: o achado é reavaliado e ganha NOVA proposta pendente', ctx.repository.listProposals().length === 2 && ctx.repository.listProposals().filter((p) => p.status === 'PENDING_APPROVAL').length === 1);
    let approvedExpired = false;
    try {
      Lifecycle.resolveApproval(first.approvalRequestId!, 'approve');
      approvedExpired = true;
    } catch {
      /* esperado */
    }
    check('6.3: aprovar a proposta expirada lança', !approvedExpired);
  }

  // 7. Verificação: falha, não-verificável e nunca "sucesso por não dar erro"
  resetAll();
  {
    const store = makeStore(DUP);
    const noop = createRemediationRegistry();
    noop.register({ actionKey: 'REMOVE_DUPLICATE_RECORDS', expectation: () => 'duplicata removida', describe: () => 'não faz nada', execute: () => undefined });
    seedTrust('guardian', 'REMOVE_DUPLICATE_RECORDS', 6);
    const ctx = makeCtx(store, { remediations: noop });
    const r = await runGuardianCycle(ctx);
    const finding = ctx.repository.listFindings()[0];
    check('7.1: executou sem erro, mas a re-detecção prova que nada mudou → FAILED, não resolvido', finding.status === 'failed' && finding.outcome?.verification?.status === 'failed' && finding.outcome.verification.method === 'redetection' && r.failed === 1);
    check('7.2: falha verificada reduz a confiança e abre cooldown', GuardianTrust.getTrust('guardian', 'REMOVE_DUPLICATE_RECORDS')!.correctedCount === 1 && !!ctx.repository.getActiveCooldown('action:REMOVE_DUPLICATE_RECORDS', new Date()));

    const again = await runGuardianCycle(ctx);
    check('7.3: em cooldown, a ação perde autonomia (não tenta de novo em rajada)', again.autoFixed === 0 && ctx.repository.listExecutions().length === 1);
  }
  resetAll();
  {
    const store = makeStore(DUP);
    const noVerify = createRemediationRegistry();
    noVerify.register({ actionKey: 'REMOVE_DUPLICATE_RECORDS', expectation: () => 'duplicata removida', describe: () => 'remove sem verificador', execute: () => store.remove('transacoes', ['t2']) });
    const ctx = makeCtx(store, { remediations: noVerify });
    await runGuardianCycle(ctx);
    Lifecycle.resolveApproval(ctx.repository.listProposals()[0].approvalRequestId!, 'approve');
    const r = await runGuardianCycle({ ...ctx, sources: [] }); // sem fonte para re-detectar
    const finding = ctx.repository.listFindings()[0];
    check('7.4: sem verificador nem fonte → "não verificável": nunca vira resolvido', finding.status === 'unverified' && finding.outcome?.verification?.status === 'unverifiable' && finding.outcome.verification.method === 'none' && r.unverified === 1);
    const direct = await verifyActionOutcome({ expected: 'x', method: 'handler', now: new Date() });
    check('7.5: verifyActionOutcome sem observador é explicitamente "unverifiable"', direct.status === 'unverifiable' && direct.observed.includes('nenhum verificador'));
  }

  // 8. Falha de execução
  resetAll();
  {
    const store = makeStore(DUP);
    const boom = createRemediationRegistry();
    boom.register({ actionKey: 'REMOVE_DUPLICATE_RECORDS', expectation: () => 'x', describe: () => 'explode', execute: () => { throw new Error('disco cheio'); } });
    seedTrust('guardian', 'REMOVE_DUPLICATE_RECORDS', 6);
    const ctx = makeCtx(store, { remediations: boom });
    await runGuardianCycle(ctx);
    const finding = ctx.repository.listFindings()[0];
    const proposal = ctx.repository.listProposals()[0];
    check('8.1: exceção na execução → proposta FAILED, finding failed, erro registrado', proposal.status === 'FAILED' && finding.status === 'failed' && ctx.repository.listExecutions()[0].error === 'disco cheio');
    check('8.2: a Action da fundação também termina FAILED', ActionBus.getAction(proposal.actionId!)?.status === 'FAILED');
  }

  // 9. Auto-fix bloqueado: L3, L2, sem remediador, cooldown, sem ação sugerida
  resetAll();
  {
    const files = makeTextStore({ '.env.example': 'AWS=AKIAABCDEFGHIJKLMNOP\n', 'chave.pem': '-----BEGIN RSA PRIVATE KEY-----\nxxxx' });
    const remediations = createRemediationRegistry();
    remediations.register(createSecretRedactionHandler(files, SECRET_PATTERNS));
    seedTrust('guardian', 'REDACT_EXPOSED_SECRET', 30);
    seedTrust('guardian', 'ROTATE_SECRET', 30);
    const ctx: GuardianCycleContext = {
      repository: createInMemoryGuardianRepository(),
      sources: [defineSource(securityAuditor, () => ({ items: Object.entries(files.files).map(([location, content]) => ({ location, content })) }))],
      remediations,
    };
    const r = await runGuardianCycle(ctx);
    const redact = ctx.repository.listFindings().find((f) => f.suggestedActionKey === 'REDACT_EXPOSED_SECRET')!;
    const rotate = ctx.repository.listFindings().find((f) => f.suggestedActionKey === 'ROTATE_SECRET')!;
    check('9.1: mascarar segredo é L2: mesmo com muita confiança, exige aprovação', redact.status === 'awaiting_approval' && files.files['.env.example'].includes('AKIA'));
    check('9.2: rotacionar credencial é L3 sem remediador → bloqueado com motivo claro', rotate.status === 'blocked' && rotate.outcome!.reason.includes('não existe remediador'));
    check('9.3: a evidência de segredo NUNCA contém o segredo', !JSON.stringify(redact).includes('ABCDEFGHIJKLMNOP') && redact.evidence[0].observation.includes('AKIA…'));
    check('9.4: severidade crítica de segurança preservada', redact.severity === 'critica');
    check('9.5: relatório separa aguardando aprovação de bloqueado', r.awaitingApproval === 1 && r.blocked === 1 && r.autoFixed === 0);

    Lifecycle.resolveApproval(ctx.repository.getProposal(redact.proposalId!)!.approvalRequestId!, 'approve');
    await runGuardianCycle(ctx);
    check('9.6: aprovado, o segredo é mascarado e a verificação confirma', !files.files['.env.example'].includes('AKIA') && ctx.repository.getFinding(redact.id)!.status === 'resolved');
  }
  resetAll();
  {
    const rem = createRemediationRegistry();
    rem.register({ actionKey: 'ROTATE_SECRET', expectation: () => 'rotacionada', describe: () => 'rotaciona', execute: () => undefined });
    seedTrust('guardian', 'ROTATE_SECRET', 50);
    const ctx: GuardianCycleContext = {
      repository: createInMemoryGuardianRepository(),
      sources: [defineSource(securityAuditor, () => ({ items: [{ location: 'k.pem', content: '-----BEGIN PRIVATE KEY-----' }] }))],
      remediations: rem,
    };
    const r = await runGuardianCycle(ctx);
    check('9.7: com remediador presente, L3 continua exigindo aprovação (confiança nunca concede autoridade)', r.awaitingApproval === 1 && r.autoFixed === 0 && ctx.repository.listExecutions().length === 0);
  }
  resetAll();
  {
    const ctx: GuardianCycleContext = {
      repository: createInMemoryGuardianRepository(),
      sources: [defineSource(codeAuditor, () => ({ files: [{ path: 'a.ts', content: 'try { x() } catch (e) {}\n' }] }))],
      remediations: createRemediationRegistry(),
    };
    const r = await runGuardianCycle(ctx);
    const f = ctx.repository.listFindings()[0];
    check('9.8: achado sem ação sugerida vira bloqueado (decisão humana), sem inventar correção', f.status === 'blocked' && f.outcome!.reason.includes('decisão humana') && r.blocked === 1 && ctx.repository.listProposals().length === 0);
  }

  // 10. Teto de correções automáticas por ciclo
  resetAll();
  {
    seedTrust('guardian', 'REMOVE_DUPLICATE_RECORDS', 6);
    const store = makeStore([
      { id: 'a1', ref: 'X', v: 1 }, { id: 'a2', ref: 'X', v: 1 },
      { id: 'b1', ref: 'Y', v: 2 }, { id: 'b2', ref: 'Y', v: 2 },
    ]);
    const ctx = makeCtx(store, { config: { maxAutoFixesPerCycle: 1 } });
    const r1 = await runGuardianCycle(ctx);
    check('10.1: só 1 correção automática no ciclo (teto)', r1.autoFixed === 1 && store.all().length === 3);
    const r2 = await runGuardianCycle(ctx);
    check('10.2: a segunda, já autorizada, executa no ciclo seguinte sem nova proposta', r2.autoFixed === 1 && store.all().length === 2 && ctx.repository.listProposals().length === 2);
  }

  // 11. Regressão + deixou de ser observado
  resetAll();
  {
    seedTrust('guardian', 'REMOVE_DUPLICATE_RECORDS', 6);
    const store = makeStore(DUP);
    const ctx = makeCtx(store);
    await runGuardianCycle(ctx);
    const original = ctx.repository.listFindings()[0];
    store.remove('transacoes', []); // nada
    (store.all() as Rec[]).push({ id: 't9', ref: 'A-1', valor: 10 });
    const r = await runGuardianCycle(ctx);
    const reopened = ctx.repository.listFindings().find((f) => f.regressionOf === original.id);
    check('11.1: problema resolvido que volta é reaberto como regressão, com o mesmo correlationId', r.reopened === 1 && !!reopened && reopened.correlationId === original.correlationId);
  }
  resetAll();
  {
    let files = [{ path: 'a.ts', content: 'try { x() } catch (e) {}\n' }];
    const ctx: GuardianCycleContext = {
      repository: createInMemoryGuardianRepository(),
      sources: [defineSource(codeAuditor, () => ({ files }))],
      remediations: createRemediationRegistry(),
    };
    await runGuardianCycle(ctx);
    files = [{ path: 'a.ts', content: 'try { x() } catch (e) { log(e) }\n' }];
    const r = await runGuardianCycle(ctx);
    const f = ctx.repository.listFindings()[0];
    check('11.2: quando o auditor não vê mais o problema, resolve como "no_longer_observed" (sem atribuir ao Guardian)', r.noLongerObserved === 1 && f.status === 'resolved' && f.outcome?.status === 'no_longer_observed');
  }

  // 12. Isolamento de falha de auditor + rascunho inválido
  resetAll();
  {
    const store = makeStore(DUP);
    const broken: Auditor<unknown> = { id: 'broken', category: 'runtime', detect: () => { throw new Error('fonte offline'); } };
    const invalid: Auditor<unknown> = {
      id: 'invalid',
      category: 'runtime',
      detect: () => [{ category: 'runtime', severity: 'alta', origin: 'invalid', evidence: [], context: {}, impact: 'x', confidence: 1, hypothesis: 'x', dedupeKey: 'inv' }],
    };
    const ctx = makeCtx(store, { sources: [defineSource(broken, () => ({})), defineSource(invalid, () => ({})), dataSource(store)] });
    const r = await runGuardianCycle(ctx);
    check('12.1: auditor que falha não derruba o ciclo — os outros continuam', r.auditorFailures.some((f) => f.auditor === 'broken') && r.newFindings === 1);
    check('12.2: rascunho sem evidência é rejeitado e registrado, nunca vira finding', ctx.repository.listFindings().every((f) => f.origin !== 'invalid') && r.auditorFailures.some((f) => f.auditor === 'invalid'));
  }

  // 13. Expiração de confiança
  resetAll();
  {
    for (let i = 0; i < 6; i += 1) {
      GuardianTrust.recordOutcome({ domain: 'guardian', actionType: 'REMOVE_DUPLICATE_RECORDS', outcome: 'accepted', actionId: `old${i}`, occurredAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() });
    }
    const store = makeStore(DUP);
    const ctx = makeCtx(store);
    const r = await runGuardianCycle(ctx);
    check('13.1: confiança antiga expira e a ação volta a exigir aprovação', r.trustEvidenceExpired === 6 && r.autoFixed === 0 && r.awaitingApproval === 1);
  }

  // 14. Persistência (fronteira) e serialização
  resetAll();
  {
    const store = makeStore(DUP);
    const ctx = makeCtx(store);
    await runGuardianCycle(ctx);
    const finding = ctx.repository.listFindings()[0];
    const proposal = ctx.repository.listProposals()[0];
    check('14.1: finding e proposta fazem roundtrip idêntico', JSON.stringify(deserializeFinding(serializeFinding(finding))) === JSON.stringify(finding) && JSON.stringify(deserializeProposal(serializeProposal(proposal))) === JSON.stringify(proposal));
    let threw = false;
    try {
      deserializeFinding(serializeFinding({ ...finding, evidence: [] }));
    } catch {
      threw = true;
    }
    check('14.2: finding restaurado sem evidência é rejeitado', threw);
    const other = createInMemoryGuardianRepository();
    check('14.3: repositórios são isolados (nenhum estado global do runtime)', other.listFindings().length === 0 && other.listEvents().length === 0);
    check('14.4: o histórico de eventos é append-only (sem update/delete na interface)', !Object.keys(ctx.repository).some((k) => /^(update|delete|remove)Event/.test(k)));
  }

  // 15. Autonomia: consequência ANTES da mudança
  resetAll();
  {
    seedTrust('guardian', 'REMOVE_DUPLICATE_RECORDS', 6);
    const rem = createRemediationRegistry();
    rem.register({ actionKey: 'REMOVE_DUPLICATE_RECORDS', expectation: () => '', describe: () => '', execute: () => undefined });
    const preview = previewDomainAutonomyChange({ domain: 'guardian', setting: 'L2', isExecutable: (a) => rem.has(a) });
    check('15.1: subir o domínio para L2 mostra o que deixa de ser automático', preview.becomeApproval.includes('REMOVE_DUPLICATE_RECORDS') && preview.summary.some((s) => s.includes('passa a exigir aprovação')));
    check('15.2: ações sem executor aparecem como bloqueadas', preview.stayBlocked.includes('ROTATE_SECRET') && preview.stayBlocked.includes('REDACT_EXPOSED_SECRET'));
    check('15.3: o preview NÃO altera a política real', GuardianPolicy.getAutonomyRule('guardian', 'REMOVE_DUPLICATE_RECORDS')?.ceilingLevel === 'L1');

    const loosen = previewActionAutonomyChange({ domain: 'guardian', actionType: 'REDACT_EXPOSED_SECRET', newCeiling: 'L1', isExecutable: () => true });
    check('15.4: afrouxar ação irreversível avisa que continuará sob supervisão', loosen.warnings.some((w) => w.includes('irreversível')) && loosen.items[0].after === 'approval');
    const rotate = previewActionAutonomyChange({ domain: 'guardian', actionType: 'ROTATE_SECRET', newCeiling: 'L2', isExecutable: () => true });
    check('15.5: reduzir o teto de uma ação de alto risco gera aviso', rotate.warnings.some((w) => w.includes('alto risco')));
    check('15.6: preview de ação sem regra é recusado', (() => { try { previewActionAutonomyChange({ domain: 'guardian', actionType: 'NAO_EXISTE', newCeiling: 'L1' }); return false; } catch { return true; } })());
    const explained = GuardianDomainApi.explainPolicies('guardian');
    check('15.7: políticas explicadas em linguagem simples', explained.length === 4 && explained.find((e) => e.actionType === 'ROTATE_SECRET')!.text.includes('alto impacto'));
  }

  // 16. Auditores: produto (contrato × implementação), UX/visual por relato, privacidade
  resetAll();
  {
    const domains = DomainRegistry.listDomains().map((d) => ({ id: d.id, actionTypes: d.actionTypes, eventTypes: d.eventTypes }));
    const rules = GuardianPolicy.listAutonomyRules().map((r) => ({ domain: r.domain, actionType: r.actionType }));
    const drafts = productAuditor.detect({ domains, rules }, new Date());
    check('16.1: Product Auditor roda sobre o registro REAL e cada achado cita domínio/ação', drafts.length > 0 && drafts.every((d) => d.evidence[0].reference.length > 0));
    check('16.1b: Finanças, Corpo, Espiritual e Guardian estão consistentes (contrato = política)', drafts.every((d) => !['finance', 'body', 'spiritual', 'guardian'].includes(String(d.context.domain))));
    const gaps = drafts.map((d) => d.dedupeKey).sort();
    check('16.1c: achados reais restantes: 6 ações de Agenda/Educação declaradas SEM política (decisão de produto, não alterada aqui)', gaps.length === 6 && gaps.every((k) => /^product:no-rule:(agenda|education):/.test(k)));
    const synthetic = productAuditor.detect({ domains: [{ id: 'x', actionTypes: ['A_SEM_REGRA'], eventTypes: ['E_SEM_EMISSOR'] }], rules: [{ domain: 'x', actionType: 'B_SEM_CONTRATO' }], emittedEvents: [] }, new Date());
    check('16.2: detecta ação sem política, política sem contrato e evento sem emissor', ['product:no-rule:x:A_SEM_REGRA', 'product:undeclared-action:x:B_SEM_CONTRATO', 'product:event-no-emitter:x:E_SEM_EMISSOR'].every((k) => synthetic.some((d) => d.dedupeKey === k)));

    const base = { source: 'axe-core', reference: '/finance#contraste', observation: 'contraste 2.1:1', observedAt: new Date().toISOString(), severity: 'alta' as const, impact: 'texto ilegível', hypothesis: 'token de cor fraco', confidence: 0.8, dedupeKey: 'ux:contraste' };
    const parts = partitionReports([base, { ...base, reference: '', dedupeKey: 'ux:x' }, { ...base, observation: '', dedupeKey: 'ux:y' }]);
    check('16.3: relato sem referência/observação é rejeitado (não inventa evidência)', parts.accepted.length === 1 && parts.rejected.length === 2);
    check('16.4: UX/Visual/Integração são contratos: só produzem finding a partir de relato válido', uxAuditor.detect({ reports: [base] }, new Date())[0].category === 'ux' && integrationAuditor.detect({ reports: [] }, new Date()).length === 0);

    const leak = spiritualPrivacyAuditor.detect(
      {
        privateItems: [{ id: 'refl_1', kind: 'reflexao', content: 'texto privado muito pessoal do usuario sobre a semana' }],
        outbound: [{ channel: 'notification', text: 'Lembrete: texto privado muito pessoal do usuario sobre a semana!' }, { channel: 'hoje', text: 'Meta avançou.' }],
      },
      new Date()
    );
    check('16.5: detecta conteúdo privado em canal de saída, sem reproduzir o texto na evidência', leak.length === 1 && leak[0].category === 'security' && !JSON.stringify(leak).includes('muito pessoal'));
  }

  // 17. Privacidade pelo runtime: vazamento vira finding crítico bloqueado
  resetAll();
  {
    const ctx: GuardianCycleContext = {
      repository: createInMemoryGuardianRepository(),
      sources: [
        defineSource(spiritualPrivacyAuditor, () => ({
          privateItems: [{ id: 'refl_1', kind: 'reflexao', content: 'conteudo privado que nunca deveria sair do espaco do usuario' }],
          outbound: [{ channel: 'log', text: 'debug: conteudo privado que nunca deveria sair do espaco do usuario' }],
        })),
      ],
      remediations: createRemediationRegistry(),
    };
    const r = await runGuardianCycle(ctx);
    const f = ctx.repository.listFindings()[0];
    check('17.1: vazamento de reflexão é finding crítico, bloqueado (Guardian protege privacidade, não corrige por conta própria)', f.severity === 'critica' && f.status === 'blocked' && r.newFindings === 1);
    check('17.2: nem o finding nem os eventos do Guardian carregam o texto privado', !JSON.stringify(f).includes('nunca deveria sair') && !JSON.stringify(ctx.repository.listEvents()).includes('nunca deveria sair'));
  }

  return result();
}

if (require.main === module) {
  run().then(({ total, fails }) => {
    console.log(`\n[guardian-runtime] ${total - fails}/${total} checagens OK`);
    process.exit(fails > 0 ? 1 : 0);
  });
}
