export interface HojeTask {
  id: string;
  title: string;
  project?: string;
  domain: 'education' | 'finance' | 'body' | 'spiritual' | 'work' | 'pessoal';
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  dueLabel: string;
  isOverdue?: boolean;
  guardianActionRequired?: boolean;
  guardianActionLabel?: string;
  /** Dado de exemplo (só no modo demonstração) — a tela marca. */
  isExample?: boolean;
  /** Motivo de não estar executável (dependência pendente, bloqueio manual...). */
  blockedReason?: string;
}

export interface HojeHistoryEntry {
  id: string;
  title: string;
  category: 'estudo' | 'trabalho' | 'saude' | 'pessoal' | 'descanso';
  timeLabel: string;
  status: 'completed' | 'delayed' | 'missed' | 'cancelled';
  durationMinutes: number;
  resultSummary?: string;
  isExample?: boolean;
}

export interface HojeGuardianNotice {
  id: string;
  type: 'critical_reminder' | 'pending_approval' | 'risk_alert' | 'recommendation';
  title: string;
  domain: 'finance' | 'body' | 'education' | 'spiritual' | 'agenda';
  domainLabel: string;
  domainIcon: string;
  description: string;
  autonomyLevel: 'L1' | 'L2' | 'L3';
  actionLabel: string;
  actionKind: 'open_telemed' | 'approve_dispute' | 'review_deadline' | 'dismiss' | 'approve_action' | 'open_tasks' | 'open_agenda';
  status: 'active' | 'resolved' | 'dismissed';
  /** Ação real do Guardian por trás do aviso (Action Center). */
  actionId?: string;
  /** Dado de exemplo (só no modo demonstração) — a tela marca. */
  isExample?: boolean;
}

export const INITIAL_HOJE_TASKS: HojeTask[] = [
  {
    id: 'task-1',
    title: 'Revisar bibliografia para entrega de Metodologia',
    project: 'Projeto Integrado · Faculdade',
    domain: 'education',
    status: 'in_progress',
    priority: 'high',
    estimatedMinutes: 45,
    dueLabel: 'Hoje até 18:00',
    isOverdue: false,
  },
  {
    id: 'task-2',
    title: 'Enviar relatório de encerramento de sprint',
    project: 'Engenharia de Sistemas',
    domain: 'work',
    status: 'delayed',
    priority: 'high',
    estimatedMinutes: 30,
    dueLabel: 'Ontem (Atrasada)',
    isOverdue: true,
  },
  {
    id: 'task-3',
    title: 'Simulado de Física — Leis de Newton & Eletromagnetismo',
    project: 'Cronograma ENEM 2026',
    domain: 'education',
    status: 'pending',
    priority: 'medium',
    estimatedMinutes: 60,
    dueLabel: 'Hoje às 16:30',
  },
  {
    id: 'task-4',
    title: 'Confirmar contestação de cobrança streaming (R$ 89,90)',
    project: 'Proteção Financeira',
    domain: 'finance',
    status: 'pending',
    priority: 'high',
    estimatedMinutes: 5,
    dueLabel: 'Guardian L2 Requerido',
    guardianActionRequired: true,
    guardianActionLabel: 'Aprovar no Guardian',
  },
  {
    id: 'task-5',
    title: 'Treino B (Costas & Bíceps) — 4 séries de Barra Fixa',
    project: 'Rotina de Força & Hipertrofia',
    domain: 'body',
    status: 'pending',
    priority: 'medium',
    estimatedMinutes: 50,
    dueLabel: 'Hoje às 18:30',
  },
  {
    id: 'task-6',
    title: 'Leitura de Romanos 8 + 10 min de respiração e silêncio',
    project: 'Vida Espiritual · Prática Matinal',
    domain: 'spiritual',
    status: 'completed',
    priority: 'medium',
    estimatedMinutes: 20,
    dueLabel: 'Concluído às 07:45',
  },
];

export const INITIAL_HOJE_NOTICES: HojeGuardianNotice[] = [
  {
    id: 'notice-telemed',
    type: 'critical_reminder',
    title: 'Telemedicina T-5 minutos',
    domain: 'body',
    domainLabel: 'Corpo & Saúde',
    domainIcon: 'medical_services',
    description: 'Dr. Roberto Mendes — Consulta de rotina. Sala virtual pronta para acesso.',
    autonomyLevel: 'L2',
    actionLabel: 'Entrar na Sala Virtual',
    actionKind: 'open_telemed',
    status: 'active',
  },
  {
    id: 'notice-finance-dispute',
    type: 'pending_approval',
    title: 'Cobrança duplicada identificada (R$ 89,90)',
    domain: 'finance',
    domainLabel: 'Finanças Pessoais',
    domainIcon: 'credit_card',
    description: 'Streaming debitado 2x no cartão de crédito. Ação de estorno preparada para envio.',
    autonomyLevel: 'L2',
    actionLabel: 'Autorizar Contestação L2',
    actionKind: 'approve_dispute',
    status: 'active',
  },
  {
    id: 'notice-project-deadline',
    type: 'risk_alert',
    title: 'Prazo crítico da Faculdade amanhã',
    domain: 'education',
    domainLabel: 'Faculdade · Engenharia',
    domainIcon: 'school',
    description: 'Entrega do Projeto Integrado vence em 22 horas. 2 tarefas pendentes na trilha.',
    autonomyLevel: 'L1',
    actionLabel: 'Abrir Trilha do Projeto',
    actionKind: 'review_deadline',
    status: 'active',
  },
];

export const INITIAL_HOJE_HISTORY: HojeHistoryEntry[] = [
  {
    id: 'hist-1',
    title: 'Leitura & planejamento matinal',
    category: 'pessoal',
    timeLabel: '07:00 — 07:30',
    status: 'completed',
    durationMinutes: 30,
    resultSummary: 'Planejamento alinhado e rotina do dia configurada.',
  },
  {
    id: 'hist-2',
    title: 'Sessão de Leitura de Romanos 8',
    category: 'pessoal',
    timeLabel: '07:30 — 07:50',
    status: 'completed',
    durationMinutes: 20,
    resultSummary: 'Capítulo 8 lido e reflexão sobre versículo 31 registrada.',
  },
  {
    id: 'hist-3',
    title: 'Bloco de estudo focado (Física ENEM)',
    category: 'estudo',
    timeLabel: '08:00 — 09:30',
    status: 'completed',
    durationMinutes: 90,
    resultSummary: '8 exercícios de mecânica resolvidos com 87% de acerto.',
  },
  {
    id: 'hist-4',
    title: 'Alinhamento da equipe de produto',
    category: 'trabalho',
    timeLabel: '10:00 — 10:45',
    status: 'delayed',
    durationMinutes: 45,
    resultSummary: 'Reunião adiada para o período da tarde a pedido da liderança.',
  },
];
