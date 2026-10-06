/**
 * MEDUSA FOUNDATION — registro do domínio E-mail (Gmail / Agenda)
 *
 * FUNDAÇÃO, não aba pronta (`isLive: false`). O domínio transforma comunicação recebida
 * em contexto acionável — não é um cliente de e-mail nem uma segunda Agenda. A Agenda
 * continua sendo a camada temporal oficial; daqui só saem PROPOSTAS (evento, prazo,
 * tarefa, lembrete) que passam pelo Guardian.
 *
 * Autonomia (regras em domains/index.ts):
 *   L1  classificar, detectar provável evento, abrir anexo (informativo, auditado)
 *   L1* criar tarefa / marcar importante / marcar lido — só com confiança conquistada;
 *       sem histórico caem para L2 (proposta)
 *   L2  sugerir tarefa, evento, prazo, resposta, acompanhamento; arquivar
 *   L3  enviar resposta, encaminhar, excluir, cancelar compromisso, agendar pagamento
 */

import type { DomainDefinition } from '../types/domain';

export const EMAIL_ACTION_TYPES = [
  'CLASSIFY_EMAIL',
  'DETECT_EMAIL_EVENT',
  'OPEN_EMAIL_DOCUMENT',
  'CREATE_TASK_FROM_EMAIL',
  'MARK_EMAIL_IMPORTANT',
  'MARK_EMAIL_READ',
  'SUGGEST_TASK_FROM_EMAIL',
  'SUGGEST_EVENT_FROM_EMAIL',
  'SUGGEST_DEADLINE_FROM_EMAIL',
  'SUGGEST_REPLY',
  'SUGGEST_FOLLOW_UP',
  'ARCHIVE_EMAIL',
  'SEND_EMAIL_REPLY',
  'FORWARD_EMAIL',
  'DELETE_EMAIL',
  'CANCEL_EVENT_FROM_EMAIL',
  'SCHEDULE_PAYMENT_FROM_EMAIL',
] as const;

export const emailDomain: DomainDefinition = {
  id: 'email',
  label: 'Gmail / Agenda',
  icon: 'mail',
  accentToken: '--email-accent',
  route: '#email',
  isLive: false,
  persona: {
    id: 'persona-email',
    domain: 'email',
    displayName: 'Comunicação',
    tone: 'objetivo, sempre diz de qual e-mail tirou a conclusão',
    interactionStyle: 'propõe tarefa/evento/prazo com a evidência do texto; nunca responde, apaga ou paga sozinho',
    initiativeLevel: 'moderado',
    decisionStyle: 'na dúvida entre evento e prazo, propõe prazo; sem data no texto, não presume o dia',
  },
  capabilities: [
    { id: 'understand', domain: 'email', label: 'Entender e-mail', description: 'Classifica, extrai contexto com evidência e avalia risco (determinístico).', implemented: true, actionTypes: ['CLASSIFY_EMAIL', 'DETECT_EMAIL_EVENT'] },
    { id: 'propose', domain: 'email', label: 'Propor ação', description: 'Tarefa, evento, prazo, resposta ou acompanhamento derivados do e-mail — passam pelo Guardian.', implemented: true, actionTypes: ['SUGGEST_TASK_FROM_EMAIL', 'SUGGEST_EVENT_FROM_EMAIL', 'SUGGEST_DEADLINE_FROM_EMAIL', 'SUGGEST_REPLY', 'SUGGEST_FOLLOW_UP', 'CREATE_TASK_FROM_EMAIL'] },
    { id: 'organize', domain: 'email', label: 'Organizar caixa', description: 'Marcar importante/lido, arquivar, abrir anexo — contrato pronto, provedor real BLOQUEADO.', implemented: false, actionTypes: ['MARK_EMAIL_IMPORTANT', 'MARK_EMAIL_READ', 'ARCHIVE_EMAIL', 'OPEN_EMAIL_DOCUMENT'] },
    { id: 'sensitive', domain: 'email', label: 'Ações sensíveis', description: 'Responder, encaminhar, excluir, cancelar compromisso, agendar pagamento — sempre aprovação humana.', implemented: false, actionTypes: ['SEND_EMAIL_REPLY', 'FORWARD_EMAIL', 'DELETE_EMAIL', 'CANCEL_EVENT_FROM_EMAIL', 'SCHEDULE_PAYMENT_FROM_EMAIL'] },
  ],
  eventTypes: ['EMAIL_RECEIVED', 'EMAIL_CLASSIFIED', 'EMAIL_CANDIDATE_PROPOSED', 'EMAIL_FOLLOW_UP_DUE'],
  actionTypes: [...EMAIL_ACTION_TYPES],
};
