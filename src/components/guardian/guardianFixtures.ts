/**
 * GUARDIAN FOUNDATION — Decision Chain Fixtures (Modelo B)
 *
 * Princípio Arquitetural:
 * Cadeia causal viva: EVENTO -> CONTEXTO -> DECISÃO -> AÇÃO -> RESULTADO.
 * Sem jargão de infraestrutura ou hacker aesthetic. Linguagem clara de proteção pessoal.
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
  domain: 'agenda' | 'financas' | 'corpo';
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
];
