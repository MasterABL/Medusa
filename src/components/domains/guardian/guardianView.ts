import type { Finding, FindingCategory, FindingSeverity, FindingStatus, GuardianEvent, Proposal } from '@/domains/guardian';

export const CATEGORY_LABEL: Record<FindingCategory, string> = {
  code: 'Código', data: 'Dados', security: 'Segurança', product: 'Produto', ux: 'UX', visual: 'Visual', runtime: 'Execução', integration: 'Integração',
};

export const SEVERITY_LABEL: Record<FindingSeverity, string> = { baixa: 'Baixa', moderada: 'Moderada', alta: 'Alta', critica: 'Crítica' };

export const STATUS_LABEL: Record<FindingStatus, string> = {
  detected: 'Detectado',
  awaiting_approval: 'Aguardando sua decisão',
  in_progress: 'Em execução',
  resolved: 'Resolvido e verificado',
  unverified: 'Executado, sem verificação',
  failed: 'Falhou',
  blocked: 'Sem correção automática',
  dismissed: 'Dispensado',
};

const OPEN: FindingStatus[] = ['detected', 'awaiting_approval', 'in_progress', 'unverified', 'failed', 'blocked'];
export const isOpen = (f: Finding) => OPEN.includes(f.status);

export function findingTitle(f: Finding): string {
  const text = f.evidence[0]?.observation ?? 'Achado sem descrição';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type Health = { key: 'saudavel' | 'pendencias' | 'atencao'; label: string; verdict: string; icon: string };

/** Composição de leitura: nenhum aberto = saudável; algo alto/crítico aberto = precisa de atenção. */
export function healthOf(open: Finding[]): Health {
  if (open.length === 0) return { key: 'saudavel', label: 'Saudável', verdict: 'O Medusa está saudável.', icon: 'verified_user' };
  if (open.some((f) => f.severity === 'alta' || f.severity === 'critica')) return { key: 'atencao', label: 'Precisa de atenção', verdict: 'O Medusa precisa de atenção.', icon: 'shield' };
  return { key: 'pendencias', label: 'Estável, com pendências', verdict: 'O Medusa está estável, com pendências.', icon: 'shield' };
}

export type StepState = 'done' | 'current' | 'pending' | 'failed';
export interface ChainStep {
  key: string;
  title: string;
  detail: string;
  state: StepState;
}

/** Cadeia de verificação: cada passo reflete o estado REAL da proposta/execução/verificação. */
export function chainOf(f: Finding, proposal: Proposal | undefined): ChainStep[] {
  const ps = proposal?.status;
  const verification = f.outcome?.verification;
  const decisionDone = ps && !['PROPOSED', 'PENDING_APPROVAL'].includes(ps);
  const executed = ps === 'SUCCEEDED' || ps === 'FAILED';
  return [
    { key: 'found', title: 'Encontrado', detail: `por ${f.origin}`, state: 'done' },
    { key: 'evidence', title: 'Evidência registrada', detail: `${f.evidence.length} observação(ões) com origem e local`, state: 'done' },
    { key: 'proposal', title: 'Proposta', detail: proposal ? 'correção descrita, com reversibilidade' : 'nenhuma correção disponível', state: proposal ? 'done' : f.status === 'blocked' ? 'failed' : 'pending' },
    {
      key: 'decision',
      title: 'Decisão',
      detail: !proposal ? '—' : ps === 'PENDING_APPROVAL' ? 'aguardando você' : ps === 'REJECTED' ? 'recusada por você' : ps === 'EXPIRED' ? 'expirou sem decisão' : decisionDone ? 'aprovada' : 'a propor',
      state: !proposal ? 'pending' : ps === 'PENDING_APPROVAL' ? 'current' : ps === 'REJECTED' || ps === 'EXPIRED' ? 'failed' : decisionDone ? 'done' : 'pending',
    },
    {
      key: 'execution',
      title: 'Execução',
      detail: ps === 'EXECUTING' ? 'em andamento' : ps === 'SUCCEEDED' ? 'concluída' : ps === 'FAILED' ? 'falhou' : ps === 'APPROVED' ? 'roda no próximo ciclo' : 'ainda não executada',
      state: ps === 'EXECUTING' || ps === 'APPROVED' ? 'current' : ps === 'SUCCEEDED' ? 'done' : ps === 'FAILED' ? 'failed' : 'pending',
    },
    {
      key: 'verification',
      title: 'Verificação',
      detail: verification ? (verification.status === 'verified' ? 'esperado = observado' : verification.status === 'failed' ? 'não bateu com o esperado' : 'sem verificador — não conta como resolvido') : executed ? 'pendente' : 'depois da execução',
      state: verification ? (verification.status === 'verified' ? 'done' : verification.status === 'failed' ? 'failed' : 'current') : 'pending',
    },
  ];
}

export function eventTime(e: GuardianEvent): string {
  return new Date(e.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Eventos que uma pessoa entende (o resto — transições internas de estado — fica na trilha técnica do Guardian). */
export const HUMAN_EVENTS: GuardianEvent['type'][] = ['FINDING_DETECTED', 'PROPOSAL_CREATED', 'EXECUTION_FINISHED', 'VERIFICATION_RECORDED', 'FINDING_BLOCKED', 'FINDING_NO_LONGER_OBSERVED', 'CYCLE_FINISHED'];

export function humanMessage(e: GuardianEvent): string {
  return e.message
    .replace(/Ciclo cycle_\d+ concluído/, 'Verificação concluída')
    .replace(/Verificação: verified \(handler\)\./, 'Verificado: o resultado bate com o esperado.')
    .replace(/Verificação: (failed|unverifiable)[^.]*\./, 'Verificação não confirmou o resultado.');
}
