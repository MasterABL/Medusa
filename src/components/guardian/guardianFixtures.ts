/**
 * GUARDIAN FOUNDATION — Decision Chain & Autonomy Center Fixtures
 *
 * Princípio Arquitetural:
 * Cadeia causal viva: EVENTO -> CONTEXTO -> DECISÃO -> AÇÃO -> RESULTADO.
 * Radar de riscos, Centro de Ações (L1/L2/L3), Matriz de Confiança Humana e Auditoria.
 */

export type DecisionStepId = 'evento' | 'contexto' | 'decisao' | 'acao' | 'resultado';

export interface DecisionChainStep {
  id: DecisionStepId;
  label: string;
  icon: string;
  headline: string;
  summary: string;
  evidence: { label: string; value: string }[];
  highlightColor: string; // pastel hex
}

export interface DecisionChainCase {
  id: string;
  title: string;
  domain: 'agenda' | 'financas' | 'corpo' | 'espiritual' | 'educacao';
  domainLabel: string;
  domainIcon: string;
  autonomyLevel: 'L1' | 'L2' | 'L3';
  autonomyLabel: string;
  status: 'concluido' | 'aguardando_aprovacao' | 'em_observacao';
  steps: DecisionChainStep[];
  actionPrompt?: {
    label: string;
    confirmMessage: string;
    successMessage: string;
  };
}

export interface GuardianRadarItem {
  id: string;
  domain: 'agenda' | 'financas' | 'corpo' | 'espiritual' | 'educacao';
  domainLabel: string;
  domainIcon: string;
  severity: 'critico' | 'atencao' | 'informativo';
  headline: string;
  description: string;
  detectedAt: string;
  interventionProposal: string;
  autonomyLevel: 'L1' | 'L2' | 'L3';
}

export interface GuardianActionItem {
  id: string;
  domain: 'agenda' | 'financas' | 'corpo' | 'espiritual' | 'educacao';
  domainLabel: string;
  domainIcon: string;
  title: string;
  intent: string;
  autonomyLevel: 'L1' | 'L2' | 'L3';
  status: 'pending' | 'approved' | 'executed' | 'rejected' | 'undone';
  reversible: boolean;
  reason: string;
  requestedAt: string;
  expiresIn?: string;
  executedAt?: string;
  /** Ação real do Guardian (Action Center) por trás do card. */
  realId?: string;
  /** Rótulo verdadeiro do estado de execução (ex.: "Ação aprovada — executor não conectado"). */
  stateLabel?: string;
  /** Dado de exemplo (modo demonstração). */
  isExample?: boolean;
}

export interface GuardianTrustPolicy {
  id: string;
  domain: 'agenda' | 'financas' | 'corpo' | 'espiritual' | 'educacao';
  domainLabel: string;
  domainIcon: string;
  actionCategory: string;
  currentLevel: 'L1' | 'L2' | 'L3';
  trustScorePercent: number;
  description: string;
  humanOverrideAllowed: boolean;
}

export interface GuardianAuditLogEntry {
  id: string;
  timestamp: string;
  domain: string;
  actionTitle: string;
  autonomyApplied: 'L1' | 'L2' | 'L3';
  policyUsed: string;
  verdict: 'EXECUTADO_AUTONOMO' | 'APROVADO_USUARIO' | 'RECUSADO_USUARIO' | 'BLOQUEADO_SEGURANCA';
  correlationId: string;
  details: string;
  /** Status real registrado no audit log (quando a entrada é real). */
  statusLabel?: string;
  isExample?: boolean;
}

export const GUARDIAN_CASES: DecisionChainCase[] = [
  {
    id: 'telemedicina-t5',
    title: 'Compromisso Crítico: Consulta de Telemedicina',
    domain: 'agenda',
    domainLabel: 'Agenda & Presença',
    domainIcon: 'schedule',
    autonomyLevel: 'L1',
    autonomyLabel: 'L1 · Autônomo',
    status: 'concluido',
    steps: [
      {
        id: 'evento',
        label: 'Evento',
        icon: 'notifications_active',
        headline: 'Consulta Médica Detectada',
        summary: 'Consulta com Dr. Roberto identificada na Agenda para hoje com link externo.',
        evidence: [
          { label: 'Horário', value: '17:00' },
          { label: 'Canal', value: 'Google Meet / Telemedicina' },
          { label: 'Antecedência', value: 'Janela T-15 e T-5 min' },
        ],
        highlightColor: '#FFF18C',
      },
      {
        id: 'contexto',
        label: 'Contexto',
        icon: 'history',
        headline: 'Histórico & Relevância',
        summary: 'Compromisso inadiável. Ocorrência prévia de consulta perdida por falta de alarme audível.',
        evidence: [
          { label: 'Prioridade', value: 'Crítica / Alta' },
          { label: 'Impacto de Falha', value: 'Perda de receita médica' },
          { label: 'Estado Atual', value: 'Usuário em sessão de trabalho' },
        ],
        highlightColor: '#71DBD2',
      },
      {
        id: 'decisao',
        label: 'Decisão',
        icon: 'gavel',
        headline: 'Política de Interrupção Gradual',
        summary: 'Ativar aviso antecipado e sobrepor Dynamic Island em T-5 com botão direto para o link.',
        evidence: [
          { label: 'Regra', value: 'Política de Telemedicina #MED-01' },
          { label: 'Nível', value: 'L1 (Execução sem burocracia)' },
          { label: 'Canais', value: 'Dynamic Island + Web Banner' },
        ],
        highlightColor: '#ADE4B5',
      },
      {
        id: 'acao',
        label: 'Ação',
        icon: 'bolt',
        headline: 'Disparo do Lembrete Ativo',
        summary: 'Dynamic Island iluminada com contagem regressiva e link direto para a sala.',
        evidence: [
          { label: 'Disparo', value: 'T-5 minutos antes' },
          { label: 'Ação Disponível', value: 'Abrir Sala da Consulta' },
          { label: 'Status', value: 'Entregue com sucesso' },
        ],
        highlightColor: '#71DBD2',
      },
      {
        id: 'resultado',
        label: 'Resultado',
        icon: 'verified',
        headline: 'Presença Assegurada',
        summary: 'Usuário alertado no momento exato com antecedência para abrir o histórico e a câmera.',
        evidence: [
          { label: 'Confirmação', value: 'Check-in realizado' },
          { label: 'Atraso', value: '0 minutos' },
          { label: 'Proteção', value: '100% íntegra' },
        ],
        highlightColor: '#D0EAA3',
      },
    ],
  },
  {
    id: 'cobranca-duplicada',
    title: 'Anomalia Financeira: Cobrança Repetida',
    domain: 'financas',
    domainLabel: 'Finanças & Solvência',
    domainIcon: 'account_balance_wallet',
    autonomyLevel: 'L2',
    autonomyLabel: 'L2 · Requer Aprovação',
    status: 'aguardando_aprovacao',
    actionPrompt: {
      label: 'Aprovar Pedido de Estorno (R$ 89,90)',
      confirmMessage: 'Confirmar contestação de cobrança duplicada?',
      successMessage: 'Contestação enviada ao emissor. R$ 89,90 protegidos.',
    },
    steps: [
      {
        id: 'evento',
        label: 'Evento',
        icon: 'error_outline',
        headline: 'Lançamento Repetido Detectado',
        summary: 'Dois débitos idênticos de R$ 89,90 registrados na mesma fatura com 4 minutos de intervalo.',
        evidence: [
          { label: 'Origem', value: 'SaaS Cloud Sync' },
          { label: 'Valor', value: 'R$ 89,90 x 2' },
          { label: 'Intervalo', value: '3 min 42 seg' },
        ],
        highlightColor: '#C45B5B',
      },
      {
        id: 'contexto',
        label: 'Contexto',
        icon: 'manage_search',
        headline: 'Verificação de Contrato',
        summary: 'O plano contratado é mensal simples de licença única. Não há compras adicionais registradas.',
        evidence: [
          { label: 'Histórico', value: 'Cobrança única habitual' },
          { label: 'Impacto', value: 'Redução desnecessária de margem' },
          { label: 'Classificação', value: 'Duplicidade de transação' },
        ],
        highlightColor: '#FFF18C',
      },
      {
        id: 'decisao',
        label: 'Decisão',
        icon: 'policy',
        headline: 'Aprovação de Estorno Solicitada',
        summary: 'Classificado como L2: Guardian prepara a contestação mas aguarda o aval do usuário.',
        evidence: [
          { label: 'Regra', value: 'Antifraude & Duplicidade #FIN-04' },
          { label: 'Autonomia', value: 'L2 (Humano no comando)' },
          { label: 'Recomendação', value: 'Contestação imediata' },
        ],
        highlightColor: '#71DBD2',
      },
      {
        id: 'acao',
        label: 'Ação',
        icon: 'send',
        headline: 'Contestação Formatada',
        summary: 'Comprovante e protocolo de cobrança duplicada montados para estorno com um toque.',
        evidence: [
          { label: 'Canal', value: 'Emissor do Cartão' },
          { label: 'Status', value: 'Pronto para envio' },
          { label: 'Ação Pendente', value: 'Clique para aprovar' },
        ],
        highlightColor: '#FFF18C',
      },
      {
        id: 'resultado',
        label: 'Resultado',
        icon: 'savings',
        headline: 'Proteção de Capital',
        summary: 'Recuperação do valor indevido e prevenção de novos débitos duplicados na fatura.',
        evidence: [
          { label: 'Economia', value: 'R$ 89,90 recuperados' },
          { label: 'Runway', value: 'Margem livre preservada' },
          { label: 'Garantia', value: 'Zero perda silenciosa' },
        ],
        highlightColor: '#D0EAA3',
      },
    ],
  },
  {
    id: 'modulacao-carga',
    title: 'Recuperação Biológica: Modulação de Carga',
    domain: 'corpo',
    domainLabel: 'Corpo & Movimento',
    domainIcon: 'fitness_center',
    autonomyLevel: 'L1',
    autonomyLabel: 'L1 · Autônomo',
    status: 'concluido',
    steps: [
      {
        id: 'evento',
        label: 'Evento',
        icon: 'bedtime',
        headline: 'Sono Abaixo da Média',
        summary: 'Registro de apenas 5h40 de sono após dia de esforço elevado no Agachamento.',
        evidence: [
          { label: 'Sono Real', value: '5h 40min' },
          { label: 'Treino Prévio', value: 'Agachamento 110 kg' },
          { label: 'Horas Decorridas', value: '18 horas' },
        ],
        highlightColor: '#FFF18C',
      },
      {
        id: 'contexto',
        label: 'Contexto',
        icon: 'analytics',
        headline: 'Índice de Fadiga Neuromuscular',
        summary: 'Fadiga central elevada aumenta em 4x a probabilidade de falha técnica no Levantamento Terra.',
        evidence: [
          { label: 'Treino de Hoje', value: 'Ficha B (Posteriores / Terra)' },
          { label: 'Risco Articular', value: 'Lombar e isquiotibiais' },
          { label: 'Princípio', value: 'Sobrecarga sustentável' },
        ],
        highlightColor: '#71DBD2',
      },
      {
        id: 'decisao',
        label: 'Decisão',
        icon: 'auto_fix_high',
        headline: 'Ajuste de Volume Preventivo',
        summary: 'Manter a sessão para consistência, mas reduzir carga em 15% focando em velocidade e técnica.',
        evidence: [
          { label: 'Regra', value: 'Biofeedback & Longevidade #BIO-02' },
          { label: 'Nível', value: 'L1 (Ajuste adaptativo)' },
          { label: 'Meta Adaptada', value: '3x5 com 90 kg (em vez de 105)' },
        ],
        highlightColor: '#ADE4B5',
      },
      {
        id: 'acao',
        label: 'Ação',
        icon: 'tune',
        headline: 'Atualização da Bancada de Treino',
        summary: 'Metas ajustadas automaticamente na ficha com nota explicativa discreta para o aquecimento.',
        evidence: [
          { label: 'Destino', value: 'Modo Treino do Medusa' },
          { label: 'Aquecimento', value: '2 séries extras de mobilidade' },
          { label: 'Status', value: 'Aplicado na sessão' },
        ],
        highlightColor: '#71DBD2',
      },
      {
        id: 'resultado',
        label: 'Resultado',
        icon: 'shield_check',
        headline: 'Estímulo Mantido sem Lesão',
        summary: 'Estímulo neural preservado sem sobrecarga articular, garantindo recuperação para a semana.',
        evidence: [
          { label: 'Adesão', value: '100% da rotina cumprida' },
          { label: 'Integridade', value: 'Zero dor articular' },
          { label: 'Progressão', value: 'Base sólida para próxima carga' },
        ],
        highlightColor: '#D0EAA3',
      },
    ],
  },
  {
    id: 'privacidade-espiritual',
    title: 'Auditoria de Privacidade: Reflexão Pessoal',
    domain: 'espiritual',
    domainLabel: 'Espiritual & Privacidade',
    domainIcon: 'lock',
    autonomyLevel: 'L3',
    autonomyLabel: 'L3 · Bloqueio Estrito',
    status: 'concluido',
    steps: [
      {
        id: 'evento',
        label: 'Evento',
        icon: 'edit_note',
        headline: 'Registro de Oração e Gratidão Criado',
        summary: 'Nova anotação íntima no diário espiritual contendo nomes de familiares e intenções.',
        evidence: [
          { label: 'Origem', value: 'Espiritual · Oração Contemplativa' },
          { label: 'Classificação', value: 'Dado de Intimidade / Fé' },
          { label: 'Sensibilidade', value: 'Máxima' },
        ],
        highlightColor: '#ADE4B5',
      },
      {
        id: 'contexto',
        label: 'Contexto',
        icon: 'security',
        headline: 'Política de Soberania Pessoal',
        summary: 'O Medusa veta categoricamente indexação ou envio de diários espirituais para nuvens públicas.',
        evidence: [
          { label: 'Auditor', value: 'SpiritualPrivacyAuditor' },
          { label: 'Criptografia', value: 'AES-256 no dispositivo' },
          { label: 'Status', value: 'Isolamento verificado' },
        ],
        highlightColor: '#71DBD2',
      },
      {
        id: 'decisao',
        label: 'Decisão',
        icon: 'shield',
        headline: 'Bloqueio de Compartilhamento L3',
        summary: 'Impedir qualquer sincronização externa que não seja a chave privada do usuário.',
        evidence: [
          { label: 'Nível', value: 'L3 (Proibição absoluta)' },
          { label: 'Regra', value: 'Constituição de Privacidade #ESP-01' },
          { label: 'Exceção', value: 'Nenhuma' },
        ],
        highlightColor: '#C45B5B',
      },
      {
        id: 'acao',
        label: 'Ação',
        icon: 'vpn_key',
        headline: 'Cifragem Local & Blindagem',
        summary: 'Registro gravado estritamente no armazenamento local com chave derivada.',
        evidence: [
          { label: 'Localização', value: 'Storage Local Privado' },
          { label: 'Auditoria', value: 'Aprovada sem vazamentos' },
          { label: 'Acesso', value: 'Somente pelo usuário' },
        ],
        highlightColor: '#71DBD2',
      },
      {
        id: 'resultado',
        label: 'Resultado',
        icon: 'check_circle',
        headline: 'Intimidade Preservada',
        summary: 'O usuário desfruta de um ambiente 100% seguro para orar, meditar e agradecer sem vigilância.',
        evidence: [
          { label: 'Vazamentos', value: 'Zero' },
          { label: 'Confiabilidade', value: '100%' },
          { label: 'Paz Mental', value: 'Garantida' },
        ],
        highlightColor: '#D0EAA3',
      },
    ],
  },
];

export const GUARDIAN_RADAR_ITEMS: GuardianRadarItem[] = [
  {
    id: 'radar-1',
    domain: 'financas',
    domainLabel: 'Finanças',
    domainIcon: 'credit_card',
    severity: 'critico',
    headline: 'Cobrança Duplicada Detectada (R$ 89,90)',
    description: 'Dois lançamentos idênticos em menos de 4 minutos no cartão de crédito.',
    detectedAt: 'Há 12 min',
    interventionProposal: 'Submeter contestação ao emissor do cartão.',
    autonomyLevel: 'L2',
  },
  {
    id: 'radar-2',
    domain: 'agenda',
    domainLabel: 'Agenda & Saúde',
    domainIcon: 'medical_services',
    severity: 'critico',
    headline: 'Telemedicina T-5 minutos',
    description: 'Dr. Roberto Mendes às 17:00. Link da sala pronto.',
    detectedAt: 'Há 2 min',
    interventionProposal: 'Fixar atalho na Dynamic Island e disparar alarme discreto.',
    autonomyLevel: 'L1',
  },
  {
    id: 'radar-3',
    domain: 'educacao',
    domainLabel: 'Educação',
    domainIcon: 'school',
    severity: 'atencao',
    headline: 'Entrega do Projeto Integrado em 22 horas',
    description: 'Relatório final com 2 seções ainda marcadas como rascunho.',
    detectedAt: 'Há 1 hora',
    interventionProposal: 'Sugerir bloco de revisão de 45m na Matriz de Atenção Hoje.',
    autonomyLevel: 'L1',
  },
  {
    id: 'radar-4',
    domain: 'corpo',
    domainLabel: 'Corpo',
    domainIcon: 'fitness_center',
    severity: 'informativo',
    headline: 'Recuperação Lombar Completa',
    description: 'Intervalo de 72h após treino de pernas cumprido com sucesso.',
    detectedAt: 'Há 3 horas',
    interventionProposal: 'Liberar progressão de carga no Treino B.',
    autonomyLevel: 'L1',
  },
];

export const GUARDIAN_ACTION_ITEMS: GuardianActionItem[] = [
  {
    id: 'act-1',
    domain: 'financas',
    domainLabel: 'Finanças',
    domainIcon: 'credit_card',
    title: 'Contestação de Cobrança Duplicada (R$ 89,90)',
    intent: 'Proteger o caixa contra cobrança em duplicidade de assinatura SaaS.',
    autonomyLevel: 'L2',
    status: 'pending',
    reversible: true,
    reason: 'Política de proteção de solvência #FIN-04 exige confirmação humana para débitos de cartão.',
    requestedAt: 'Hoje às 11:42',
    expiresIn: 'Vence em 23h',
  },
  {
    id: 'act-2',
    domain: 'agenda',
    domainLabel: 'Agenda',
    domainIcon: 'schedule',
    title: 'Disparo de Alarme Antecipado T-5 (Telemedicina)',
    intent: 'Assegurar presença pontual em compromisso médico inadiável.',
    autonomyLevel: 'L1',
    status: 'executed',
    reversible: false,
    reason: 'Executado com autonomia L1 conforme rotina médica aprovada.',
    requestedAt: 'Hoje às 16:55',
    executedAt: 'Hoje às 16:55',
  },
  {
    id: 'act-3',
    domain: 'corpo',
    domainLabel: 'Corpo',
    domainIcon: 'fitness_center',
    title: 'Modulação de Volume na Bancada (Agachamento -15%)',
    intent: 'Prevenir lesão por fadiga acumulada mantendo estímulo neural.',
    autonomyLevel: 'L1',
    status: 'executed',
    reversible: true,
    reason: 'Ajuste adaptativo baseado em registro de sono inferior a 6 horas.',
    requestedAt: 'Hoje às 08:15',
    executedAt: 'Hoje às 08:15',
  },
  {
    id: 'act-4',
    domain: 'espiritual',
    domainLabel: 'Espiritual',
    domainIcon: 'lock',
    title: 'Blindagem Criptográfica de Anotação Íntima',
    intent: 'Cifrar reflexão espiritual impedindo telemetria e sincronização insegura.',
    autonomyLevel: 'L3',
    status: 'executed',
    reversible: false,
    reason: 'Cláusula pétrea de soberania pessoal #ESP-01.',
    requestedAt: 'Hoje às 07:45',
    executedAt: 'Hoje às 07:45',
  },
];

export const GUARDIAN_TRUST_POLICIES: GuardianTrustPolicy[] = [
  {
    id: 'trust-agenda-reminders',
    domain: 'agenda',
    domainLabel: 'Agenda & Compromissos',
    domainIcon: 'schedule',
    actionCategory: 'Lembretes e Antecipação',
    currentLevel: 'L1',
    trustScorePercent: 98,
    description: 'Criação de lembretes, antecipação de janelas de trânsito e avisos contextuais.',
    humanOverrideAllowed: true,
  },
  {
    id: 'trust-finance-disputes',
    domain: 'financas',
    domainLabel: 'Finanças Pessoais',
    domainIcon: 'account_balance_wallet',
    actionCategory: 'Estornos e Movimentações',
    currentLevel: 'L2',
    trustScorePercent: 85,
    description: 'Contestação de compras, categorização de transferências e simulação de gastos.',
    humanOverrideAllowed: true,
  },
  {
    id: 'trust-body-workouts',
    domain: 'corpo',
    domainLabel: 'Corpo & Movimento',
    domainIcon: 'fitness_center',
    actionCategory: 'Ajuste Adaptativo de Carga',
    currentLevel: 'L1',
    trustScorePercent: 94,
    description: 'Modulação de tonelagem e repetições em função de fadiga e sono.',
    humanOverrideAllowed: true,
  },
  {
    id: 'trust-education-planning',
    domain: 'educacao',
    domainLabel: 'Educação & Metas',
    domainIcon: 'school',
    actionCategory: 'Replanejamento de Cronograma',
    currentLevel: 'L1',
    trustScorePercent: 92,
    description: 'Sugestão de módulos prioritários e espaçamento de revisões.',
    humanOverrideAllowed: true,
  },
  {
    id: 'trust-spiritual-privacy',
    domain: 'espiritual',
    domainLabel: 'Vida Espiritual & Textos',
    domainIcon: 'lock',
    actionCategory: 'Sigilo e Privacidade Absoluta',
    currentLevel: 'L3',
    trustScorePercent: 100,
    description: 'Bloqueio irrestrito de qualquer telemetria de orações ou diários pessoais.',
    humanOverrideAllowed: false,
  },
];

export const GUARDIAN_AUDIT_LOGS: GuardianAuditLogEntry[] = [
  {
    id: 'aud-1',
    timestamp: 'Hoje às 16:55:01',
    domain: 'Agenda',
    actionTitle: 'Disparo de Lembrete T-5 Telemedicina',
    autonomyApplied: 'L1',
    policyUsed: 'Política de Telemedicina #MED-01',
    verdict: 'EXECUTADO_AUTONOMO',
    correlationId: 'corr-telemed-20261006',
    details: 'Lembrete enviado via Dynamic Island com link do Google Meet.',
  },
  {
    id: 'aud-2',
    timestamp: 'Hoje às 11:42:15',
    domain: 'Finanças',
    actionTitle: 'Detecção de Cobrança Duplicada R$ 89,90',
    autonomyApplied: 'L2',
    policyUsed: 'Antifraude & Duplicidade #FIN-04',
    verdict: 'APROVADO_USUARIO',
    correlationId: 'corr-saas-dup-8990',
    details: 'Contestação formatada e autorizada pelo usuário no Action Center.',
  },
  {
    id: 'aud-3',
    timestamp: 'Hoje às 08:15:30',
    domain: 'Corpo',
    actionTitle: 'Ajuste de Carga no Treino B (-15%)',
    autonomyApplied: 'L1',
    policyUsed: 'Biofeedback & Longevidade #BIO-02',
    verdict: 'EXECUTADO_AUTONOMO',
    correlationId: 'corr-body-fatigue-44',
    details: 'Sono de 5h40 disparou modulação preventiva no levantamento terra.',
  },
  {
    id: 'aud-4',
    timestamp: 'Hoje às 07:45:00',
    domain: 'Espiritual',
    actionTitle: 'Cifragem Local de Registro de Oração',
    autonomyApplied: 'L3',
    policyUsed: 'Constituição de Privacidade #ESP-01',
    verdict: 'BLOQUEADO_SEGURANCA',
    correlationId: 'corr-esp-vault-01',
    details: 'Veto preventivo de sincronização não cifrada com nuvem.',
  },
];
