'use client';

/**
 * Sessão do Guardian na UI: repositório do runtime (o mesmo `GuardianRepository` em memória do
 * domínio), fontes de observação e remediadores. Quem decide, propõe, executa e verifica é o
 * `runGuardianCycle` — a UI só o dispara e mostra o que ficou no repositório.
 *
 * Fontes desta sessão:
 *  - PRODUTO: real — compara o contrato dos domínios registrados com as políticas registradas.
 *  - DADOS e SEGURANÇA: rodam sobre um armazenamento de DEMONSTRAÇÃO (uma coleção com duplicata e um
 *    texto com a chave de exemplo da documentação da AWS), porque ainda não existe adapter para os
 *    dados reais. A lógica de detecção, aprovação, correção e verificação é a real.
 *  - Código, privacidade espiritual, UX/Visual/Runtime/Integração: sem fonte conectada (ver COVERAGE).
 */

import {
  GuardianDomainApi,
  SECRET_PATTERNS,
  createDuplicateRemovalHandler,
  createInMemoryGuardianRepository,
  createRemediationRegistry,
  createSecretRedactionHandler,
  dataAuditor,
  defineSource,
  previewActionAutonomyChange,
  productAuditor,
  runGuardianCycle,
  securityAuditor,
} from '@/domains/guardian';
import type { GuardianCycleReport, GuardianRepository, RecordStore, RemediationRegistry, TextStore } from '@/domains/guardian';
import type { ObservationSource } from '@/domains/guardian';
import * as DomainRegistry from '@/foundation/domainRegistry';
import { GuardianPolicy } from '@/foundation/guardian';
import { resolveApproval } from '@/foundation/guardianLifecycle';
import type { AutonomyLevel } from '@/foundation/types/autonomy';
import { ensureDomains } from '../shared/runtime';
import { createUiStore, useUiStore } from '../shared/uiStore';

type Rec = { id: string } & Record<string, unknown>;

export const guardianUi = createUiStore<{ version: number; selectedId: string | null; running: boolean; lastReport: GuardianCycleReport | null; cycles: number }>({
  version: 0,
  selectedId: null,
  running: false,
  lastReport: null,
  cycles: 0,
});
export const useGuardianState = () => useUiStore(guardianUi);

interface Session {
  repo: GuardianRepository;
  remediations: RemediationRegistry;
  sources: ObservationSource[];
  records: () => Rec[];
  trash: () => Rec[];
  text: () => string;
}

let session: Session | undefined;

export const DEMO_COLLECTION = 'lancamentos (demonstração)';
export const DEMO_TEXT_LOCATION = 'demonstração/config.env';

export function getGuardianSession(): Session {
  ensureDomains();
  if (session) return session;

  let records: Rec[] = [
    { id: 'l1', ref: 'NF-1001', valor: 145 },
    { id: 'l2', ref: 'NF-1001', valor: 145 },
    { id: 'l3', ref: 'NF-1002', valor: 680 },
  ];
  const trash: Rec[] = [];
  const recordStore: RecordStore = {
    list: () => records,
    remove(_c, ids) {
      trash.push(...records.filter((r) => ids.includes(r.id)));
      records = records.filter((r) => !ids.includes(r.id));
    },
  };
  let text = 'APP_ENV=demo\nAWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\n';
  const textStore: TextStore = { read: (l) => (l === DEMO_TEXT_LOCATION ? text : undefined), write: (l, t) => void (l === DEMO_TEXT_LOCATION && (text = t)) };

  const remediations = createRemediationRegistry();
  remediations.register(createDuplicateRemovalHandler(recordStore));
  remediations.register(createSecretRedactionHandler(textStore, SECRET_PATTERNS));

  const sources: ObservationSource[] = [
    defineSource(productAuditor, () => ({
      domains: DomainRegistry.listDomains().map((d) => ({ id: d.id, actionTypes: d.actionTypes, eventTypes: d.eventTypes })),
      rules: GuardianPolicy.listAutonomyRules().map((r) => ({ domain: r.domain, actionType: r.actionType })),
    })),
    defineSource(dataAuditor, () => ({ collection: DEMO_COLLECTION, records: recordStore.list(DEMO_COLLECTION), uniqueKeys: [['ref']] })),
    defineSource(securityAuditor, () => ({ items: [{ location: DEMO_TEXT_LOCATION, content: text }] })),
  ];

  session = { repo: createInMemoryGuardianRepository(), remediations, sources, records: () => records, trash: () => trash, text: () => text };
  return session;
}

/** Cobertura honesta: o que observa de verdade, o que observa sobre demonstração e o que ainda não tem fonte. */
export const COVERAGE: Array<{ key: string; name: string; mode: 'real' | 'demo' | 'sem_fonte'; what: string; categories: string[] }> = [
  { key: 'product', name: 'Produto', mode: 'real', what: 'Contrato dos domínios × políticas do Guardian', categories: ['product'] },
  { key: 'data', name: 'Dados', mode: 'demo', what: 'Duplicidade e integridade — sobre uma coleção de demonstração', categories: ['data'] },
  { key: 'security', name: 'Segurança', mode: 'demo', what: 'Segredos expostos — sobre um texto de demonstração', categories: ['security'] },
  { key: 'code', name: 'Código', mode: 'sem_fonte', what: 'Arquivos grandes, catch vazio, @ts-ignore — precisa ler o repositório', categories: ['code'] },
  { key: 'privacy', name: 'Privacidade espiritual', mode: 'sem_fonte', what: 'Vazamento de texto privado em canais — nenhum canal conectado', categories: [] },
  { key: 'ux', name: 'UX e Visual', mode: 'sem_fonte', what: 'Aceita relatos de ferramentas; nenhuma conectada', categories: ['ux', 'visual'] },
  { key: 'runtime', name: 'Execução e integrações', mode: 'sem_fonte', what: 'Aceita relatos de ferramentas; nenhuma conectada', categories: ['runtime', 'integration'] },
];

function bump() {
  guardianUi.set((s) => ({ version: s.version + 1 }));
}

let inFlight: Promise<GuardianCycleReport> | null = null;

/** Um ciclo por vez: chamadas concorrentes (StrictMode, duplo clique) esperam o mesmo ciclo em andamento. */
export function runCycle(): Promise<GuardianCycleReport> {
  if (inFlight) return inFlight;
  const s = getGuardianSession();
  guardianUi.set({ running: true });
  inFlight = runGuardianCycle({ repository: s.repo, sources: s.sources, remediations: s.remediations })
    .then((report) => {
      guardianUi.set((st) => ({ lastReport: report, cycles: st.cycles + 1, version: st.version + 1 }));
      return report;
    })
    .finally(() => {
      inFlight = null;
      guardianUi.set({ running: false });
    });
  return inFlight;
}

/** Decisão humana sobre a proposta de um finding. A execução acontece no ciclo seguinte (contrato do runtime). */
export function decideProposal(findingId: string, decision: 'approve' | 'reject'): void {
  const { repo } = getGuardianSession();
  const finding = repo.getFinding(findingId);
  const proposal = finding?.proposalId ? repo.getProposal(finding.proposalId) : undefined;
  if (!proposal?.approvalRequestId) throw new Error('Este achado não tem um pedido de aprovação pendente.');
  resolveApproval(proposal.approvalRequestId, decision);
  bump();
}

export function assessments() {
  const s = getGuardianSession();
  return GuardianDomainApi.getAutonomyAssessments(s.repo, s.remediations, new Date());
}

export function previewCeiling(actionType: string, newCeiling: AutonomyLevel) {
  const s = getGuardianSession();
  return previewActionAutonomyChange({ domain: 'guardian', actionType, newCeiling, isExecutable: (a) => s.remediations.has(a) });
}

export function selectFinding(id: string | null) {
  guardianUi.set({ selectedId: id });
}
