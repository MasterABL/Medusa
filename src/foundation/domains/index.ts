/**
 * MEDUSA FOUNDATION — bootstrap dos domínios (seções 4/28/29/35/37)
 *
 * Um único ponto que registra os domínios já conhecidos, a política de
 * autonomia padrão (seção 4 — os exemplos concretos L1/L2/L3 dados na
 * missão), os perfis de motion/sound e os placeholders de Context Panel.
 *
 * DELIBERADAMENTE não chamado em nenhum componente React ainda (ver
 * relatório da rodada, seção "NÃO FAZER AGORA" / seção 43) — integrar isto
 * num Provider real é o próximo passo de quem for ligar a fundação à UI, não
 * desta rodada, pra não competir com o trabalho de experiência em andamento
 * em paralelo (Agenda/Cronograma/Educação/motion).
 */

import { registerDomain } from '../domainRegistry';
import { registerAutonomyRule } from '../guardian/policy';
import { registerSoundProfile } from '../sound/soundMap';
import { registerMotionProfile } from '../motion/motionIdentity';
import { registerDefaultContextPanels } from '../contextPanel/register';
import type { AutonomyPolicyRule } from '../types/autonomy';
import type { DomainSoundProfile } from '../types/sound';
import type { DomainMotionProfile } from '../types/motion';

import { hojeDomain } from './hoje';
import { agendaDomain } from './agenda';
import { educationDomain } from './education';
import { guardianDomain } from './guardian';
import { financeDomain } from './finance';
import { bodyDomain } from './body';
import { spiritualDomain } from './spiritual';

export { hojeDomain, agendaDomain, educationDomain, guardianDomain, financeDomain, bodyDomain, spiritualDomain };

const DOMAINS = [hojeDomain, agendaDomain, educationDomain, guardianDomain, financeDomain, bodyDomain, spiritualDomain];

// Seção 4 da missão — exemplos concretos, granularidade domain+actionType.
const DEFAULT_AUTONOMY_RULES: AutonomyPolicyRule[] = [
  {
    domain: 'agenda',
    actionType: 'MOVE_STUDY_BLOCK_WITHIN_WINDOW',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Mover um estudo dentro de uma janela já autorizada.',
  },
  {
    domain: 'agenda',
    actionType: 'RESCHEDULE_IMPORTANT_EVENT',
    baseRisk: 'moderado',
    reversible: true,
    ceilingLevel: 'L2',
    notes: 'Reagendar compromisso importante — confiança moderada, sempre proposta.',
  },
  {
    domain: 'agenda',
    actionType: 'CANCEL_EVENT',
    baseRisk: 'alto',
    reversible: false,
    ceilingLevel: 'L3',
    notes: 'Cancelar compromisso — aprovação obrigatória.',
  },
  {
    domain: 'education',
    actionType: 'CREATE_REVIEW_BLOCK',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Criar revisão derivada de uma aula concluída.',
  },
  {
    domain: 'body',
    actionType: 'SCHEDULE_LIGHT_ACTIVITY',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Encaixar caminhada de baixa duração numa janela já autorizada.',
  },
  {
    domain: 'finance',
    actionType: 'CATEGORIZE_TRANSACTION',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Categorizar automaticamente uma transação conhecida.',
  },
  {
    domain: 'finance',
    actionType: 'ADJUST_BUDGET',
    baseRisk: 'moderado',
    reversible: true,
    ceilingLevel: 'L2',
    notes: 'Alterar orçamento — supervisão.',
  },
  {
    domain: 'finance',
    actionType: 'EXECUTE_PAYMENT',
    baseRisk: 'alto',
    reversible: false,
    ceilingLevel: 'L3',
    notes: 'Realizar pagamento — aprovação obrigatória, nunca automático.',
  },
  {
    domain: 'finance',
    actionType: 'TRANSFER_FUNDS',
    baseRisk: 'alto',
    reversible: false,
    ceilingLevel: 'L3',
    notes: 'Transferência entre contas — aprovação obrigatória, nunca automático (mesma classe de EXECUTE_PAYMENT).',
  },
  {
    domain: 'finance',
    actionType: 'CREATE_BUDGET',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Criar orçamento é planejamento, não movimenta dinheiro.',
  },
  {
    domain: 'finance',
    actionType: 'CREATE_FINANCIAL_REMINDER',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Lembrete não tem efeito financeiro real — só comunicação.',
  },
  {
    domain: 'finance',
    actionType: 'LINK_RECURRING_COMMITMENT',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Associar uma transação a um compromisso recorrente já conhecido é metadado, não movimenta dinheiro.',
  },
  {
    domain: 'finance',
    actionType: 'UPDATE_GOAL',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Atualizar contribuição/meta é registro, não execução financeira.',
  },
  {
    domain: 'finance',
    actionType: 'CREATE_PROJECTION',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Cálculo puro sobre dado já conhecido — nenhum efeito colateral real.',
  },
  {
    domain: 'body',
    actionType: 'CREATE_BODY_PLAN',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Gerar uma proposta de plano é planejamento — nada é executado sozinho a partir disso.',
  },
  {
    domain: 'body',
    actionType: 'SCHEDULE_WORKOUT',
    baseRisk: 'moderado',
    reversible: true,
    ceilingLevel: 'L2',
    notes: 'Sessão de treino completa é um compromisso maior que uma caminhada leve — supervisão.',
  },
  {
    domain: 'body',
    actionType: 'MOVE_BODY_SESSION',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Mover uma sessão já agendada dentro de uma janela livre.',
  },
  {
    domain: 'body',
    actionType: 'PAUSE_BODY_PLAN',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Pausar é sempre reversível e de baixo impacto.',
  },
  {
    domain: 'body',
    actionType: 'RESUME_BODY_PLAN',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Retomar um plano pausado — mesmo risco de pausar.',
  },
  {
    domain: 'spiritual',
    actionType: 'SCHEDULE_PRACTICE',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Agendar uma prática já escolhida pelo usuário numa janela livre.',
  },
  {
    domain: 'spiritual',
    actionType: 'UPDATE_GOAL_PROGRESS',
    baseRisk: 'baixo',
    reversible: true,
    ceilingLevel: 'L1',
    notes: 'Atualizar progresso de meta espiritual a partir de uma prática concluída — registro, não decisão sensível.',
  },
];

const DEFAULT_SOUND_PROFILES: DomainSoundProfile[] = [
  { id: 'sound-system', domain: 'guardian', keys: ['action', 'success', 'warning', 'error', 'attention'] },
  { id: 'sound-agenda', domain: 'agenda', keys: ['create', 'edit', 'move', 'conflict', 'delete'] },
  {
    id: 'sound-education',
    domain: 'education',
    keys: ['lesson-start', 'lesson-complete', 'exercise-correct', 'exercise-incorrect', 'material-ready', 'tutor'],
  },
  {
    id: 'sound-finance',
    domain: 'finance',
    keys: ['transaction', 'payment', 'goal-progress', 'budget-warning', 'projection'],
  },
  { id: 'sound-body', domain: 'body', keys: ['workout-start', 'workout-complete', 'habit', 'recovery', 'plan-ready'] },
  {
    id: 'sound-guardian',
    domain: 'guardian',
    keys: ['approval-request', 'permission-change', 'trust-change', 'security-alert'],
  },
  {
    id: 'sound-spiritual',
    domain: 'spiritual',
    keys: ['practice-complete', 'reflection-saved', 'goal-progress', 'practice-scheduled'],
  },
];

const DEFAULT_MOTION_PROFILES: DomainMotionProfile[] = [
  {
    id: 'motion-education',
    domain: 'education',
    metaphor: 'construcao',
    primitives: ['stagger-item', 'fadeRise'],
    rationale: 'Aprendizado é construção progressiva — cada elemento aparece como uma camada a mais.',
  },
  {
    id: 'motion-agenda',
    domain: 'agenda',
    metaphor: 'deslocamento',
    primitives: ['translateX', 'translateY'],
    rationale: 'Tempo se desloca — mover/reagendar deveria parecer um deslizar, não um corte.',
  },
  {
    id: 'motion-finance',
    domain: 'finance',
    metaphor: 'fluxo',
    primitives: ['fadeRise'],
    rationale: 'Dinheiro flui e se distribui — movimento deveria sugerir corrente, não impacto.',
  },
  {
    id: 'motion-body',
    domain: 'body',
    metaphor: 'respiracao',
    primitives: ['fadeRise'],
    rationale: 'Corpo pede cadência/respiração — nunca abrupto, nunca "pulse em tudo".',
  },
  {
    id: 'motion-guardian',
    domain: 'guardian',
    metaphor: 'contencao',
    primitives: ['fadeRise'],
    rationale: 'Governança comunica confirmação/proteção — contida, nunca festiva.',
  },
  {
    id: 'motion-spiritual',
    domain: 'spiritual',
    metaphor: 'quietude',
    primitives: ['fadeRise'],
    rationale: 'Espiritual pede presença/recolhimento — nunca urgente, nunca chamativo, sem pulse ou destaque.',
  },
];

let bootstrapped = false;

/**
 * Idempotente: chamar mais de uma vez não duplica registros nem lança erro —
 * importante porque em React StrictMode/HMR um módulo pode ser reavaliado.
 */
export function bootstrapDomains(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  for (const domain of DOMAINS) {
    registerDomain(domain);
  }
  for (const rule of DEFAULT_AUTONOMY_RULES) {
    registerAutonomyRule(rule);
  }
  for (const profile of DEFAULT_SOUND_PROFILES) {
    registerSoundProfile(profile);
  }
  for (const profile of DEFAULT_MOTION_PROFILES) {
    registerMotionProfile(profile);
  }
  registerDefaultContextPanels();
}

export function __isBootstrapped(): boolean {
  return bootstrapped;
}

/** Só para testes de contrato — não usar em código de produção. */
export function __resetBootstrapForTests(): void {
  bootstrapped = false;
}
