/**
 * MEDUSA — E-mail — Classificação (domínio, categoria, importância)
 *
 * Determinística e auditável, como no minha-vida: cada motivo cita a regra que bateu.
 *
 * Duas regras de produto que os testes travam:
 *   1. IMPORTÂNCIA ≠ PRESTÍGIO DO REMETENTE. Nada aqui olha "quem" mandou para subir a
 *      importância — só o que o e-mail diz (compromisso, prazo, risco, pedido).
 *   2. Risco vence propaganda: um aviso de negativação que por acaso tenha "desconto"
 *      no texto continua crítico (lição direta do classificador antigo).
 */

import type { EmailCategory, EmailClassification, EmailExtraction, EmailMessage } from '../model/types';
import type { ImportanceTier } from '../../../foundation/context/importance';
import type { LifeDomain } from '../../../foundation/types/lifeDomain';

const L = '\\p{L}\\d';
const w = (body: string) => new RegExp(`(?<![${L}])(${body})(?![${L}])`, 'iu');

export const PATTERNS = {
  financeCritical: w('negativad[oa]|negativa[çc][ãa]o|protest(?:o|ado|ar)|spc|serasa|cart[ãa]o (?:ser[áa] )?bloqueado|conta (?:ser[áa] )?bloqueada|restri[çc][ãa]o (?:no |ao )?(?:cpf|nome)'),
  financeHigh: w('fatura (?:em aberto|vencida|pendente)|em atraso|atraso no pagamento|cobran[çc]a|inadimpl[êe]ncia|juros de mora|multa por atraso'),
  finance: w('fatura|boleto|pagamento|cobran[çc]a|vencimento|vence|pix|transfer[êe]ncia|d[ée]bito|cart[ãa]o de cr[ée]dito|mensalidade|parcela|extrato'),
  financeConfirmation: w('pagamento (?:recebido|confirmado|aprovado|realizado)|recebemos (?:o )?seu pagamento|compra aprovada|comprovante de pagamento'),
  security: w('login suspeito|tentativa de acesso|acesso n[ãa]o reconhecido|nova senha|redefini[çc][ãa]o de senha|c[óo]digo de verifica[çc][ãa]o|verifica[çc][ãa]o de seguran[çc]a'),
  medical: w('consulta|telemedicina|teleconsulta|exame|m[ée]dic[oa]|cl[íi]nica|hospital|laborat[óo]rio|dentista|psic[óo]log[oa]|receita m[ée]dica|vacina'),
  academic: w('prova|disciplina|faculdade|universidade|aula|turma|professora?|semestre|matr[íi]cula|tcc|trabalho de|atividade avaliativa|ava|blackboard|ead|polo|projeto integrado|projeto multidisciplinar|nota final|frequ[êe]ncia'),
  work: w('reuni[ãa]o|fechamento|relat[óo]rio|cliente|equipe|gestor|diretoria|entrega do projeto|sprint|planilha|or[çc]amento|proposta comercial'),
  marketing: w('promo[çc][ãa]o|cupom|desconto|\\d{1,3}\\s?%\\s?off|frete gr[áa]tis|oferta|black friday|liquida[çc][ãa]o|[úu]ltimas (?:horas|unidades|vagas)|imperd[íi]vel'),
  newsletter: w('newsletter|resumo da semana|novidades da semana|descadastr\\p{L}*|unsubscribe|cancelar inscri[çc][ãa]o'),
  spam: w('voc[êe] ganhou|clique aqui urgente|empr[ée]stimo aprovado sem consulta|heran[çc]a'),
  confirmationOnly: w('pedido (?:foi )?confirmado|seu pedido|pedido enviado|recebemos sua solicita[çc][ãa]o|cadastro realizado|obrigado pela compra'),
};

const BULK_LABELS = ['CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_FORUMS', 'CATEGORY_UPDATES'];
/** Remetente institucional de ensino decide a CATEGORIA (faculdade), nunca a importância. */
const ACADEMIC_SENDER = /\.edu(\.br)?$|faculdade|universidade|blackboard|cruzeirodosul|unip|anhanguera|estacio/i;
const NOREPLY = /no-?reply|noreply|nao-?responda|naoresponda|notifica(?:cao|coes)|mailer|news@|marketing@/i;

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b.slice(0, 10)}T12:00:00`) - Date.parse(`${a.slice(0, 10)}T12:00:00`)) / 86_400_000);

export interface ClassifyOptions {
  /** Referência para "o prazo está perto?" — normalmente agora. Padrão: receivedAt. */
  now?: string;
}

export function classifyEmail(msg: EmailMessage, x: EmailExtraction, opts: ClassifyOptions = {}): EmailClassification {
  const text = `${msg.subject}\n${msg.snippet}`;
  const now = opts.now ?? msg.receivedAt;
  const reasons: string[] = [];
  const has = (k: keyof typeof PATTERNS) => PATTERNS[k].test(text);
  const deadlineDays = x.deadline ? daysBetween(now, x.deadline.value.date) : undefined;
  const actionRequested = !!x.actionRequest;
  const automated = NOREPLY.test(msg.sender.address);
  const bulkLabel = msg.labels.some((l) => BULK_LABELS.includes(l));

  let category: EmailCategory;
  let domain: LifeDomain;
  let importance: ImportanceTier;
  let confidence = 0.5;

  if (has('financeCritical')) {
    category = 'finance';
    domain = 'finance';
    importance = 'critical';
    reasons.push('risco financeiro crítico no texto (negativação/protesto/bloqueio)');
    confidence = 0.85;
  } else if (has('spam')) {
    category = 'spam';
    domain = 'external';
    importance = 'low';
    reasons.push('padrão de spam');
    confidence = 0.7;
  } else if (has('security')) {
    category = 'security';
    domain = 'personal';
    importance = 'high';
    reasons.push('alerta de segurança de conta');
    confidence = 0.8;
  } else if ((has('marketing') || has('newsletter') || bulkLabel) && !x.meeting && !(x.deadline && actionRequested)) {
    category = has('newsletter') ? 'newsletter' : 'marketing';
    domain = 'external';
    importance = 'low';
    reasons.push(bulkLabel ? 'marcado pelo provedor como envio em massa' : `padrão de ${category === 'newsletter' ? 'newsletter' : 'propaganda'}`);
    confidence = 0.75;
  } else if (has('medical') || x.meeting?.value.kind === 'consulta') {
    category = 'medical';
    domain = 'body';
    const appointment = x.meeting?.value.kind === 'consulta' && !!x.meeting.value.time && !!x.meeting.value.date;
    importance = appointment && !x.cancellation ? 'critical' : 'high';
    reasons.push(appointment ? 'compromisso de saúde com data e horário' : 'assunto de saúde');
    confidence = appointment ? 0.85 : 0.65;
  } else if (has('academic') || !!x.discipline || x.meeting?.value.kind === 'prova' || ACADEMIC_SENDER.test(msg.sender.address)) {
    category = 'academic';
    domain = 'education';
    if (x.meeting?.value.kind === 'prova') {
      importance = 'critical';
      reasons.push('prova com data');
    } else if (deadlineDays !== undefined && deadlineDays <= 3) {
      importance = 'high';
      reasons.push(`entrega acadêmica em ${Math.max(deadlineDays, 0)} dia(s)`);
    } else if (x.deadline || actionRequested) {
      importance = 'medium';
      reasons.push('aviso acadêmico com ação/prazo não imediato');
    } else {
      importance = 'medium';
      reasons.push('informação acadêmica');
    }
    confidence = x.discipline ? 0.8 : 0.65;
  } else if (has('finance')) {
    category = 'finance';
    domain = 'finance';
    if (has('financeConfirmation') && !has('financeHigh')) {
      importance = 'low';
      reasons.push('confirmação financeira sem nada a fazer');
    } else if (has('financeHigh') || (deadlineDays !== undefined && deadlineDays <= 7)) {
      importance = 'high';
      reasons.push(has('financeHigh') ? 'cobrança/atraso' : `vencimento em ${Math.max(deadlineDays!, 0)} dia(s)`);
    } else {
      importance = 'medium';
      reasons.push('assunto financeiro');
    }
    confidence = 0.75;
  } else if (has('work') || x.meeting?.value.kind === 'reuniao') {
    category = x.meeting && !x.deadline ? 'meeting' : 'work';
    domain = 'work';
    if (deadlineDays !== undefined && deadlineDays <= 2) {
      importance = 'high';
      reasons.push(`prazo de trabalho em ${Math.max(deadlineDays, 0)} dia(s)`);
    } else if (x.meeting?.value.time && x.meeting.value.date) {
      importance = 'high';
      reasons.push('reunião com data e horário');
    } else {
      importance = 'medium';
      reasons.push('assunto de trabalho');
    }
    confidence = 0.7;
  } else if (x.meeting) {
    category = 'meeting';
    domain = 'personal';
    importance = x.meeting.value.date && x.meeting.value.time ? 'high' : 'medium';
    reasons.push('compromisso com horário');
    confidence = 0.6;
  } else if (x.documents.length > 0 && (msg.attachments.length > 0 || actionRequested)) {
    category = 'document';
    domain = 'personal';
    importance = 'medium';
    reasons.push('documento anexado ou pedido');
    confidence = 0.6;
  } else if (automated || has('confirmationOnly')) {
    category = 'notification';
    domain = 'external';
    importance = 'low';
    reasons.push('notificação automática sem ação');
    confidence = 0.6;
  } else {
    category = 'personal';
    domain = 'personal';
    importance = actionRequested ? 'medium' : 'low';
    reasons.push(actionRequested ? 'pedido direto de uma pessoa' : 'mensagem pessoal sem pedido');
    confidence = 0.5;
  }

  // pedido com prazo curto sobe de "medium" para "high" em qualquer domínio que não seja propaganda
  if (importance === 'medium' && actionRequested && deadlineDays !== undefined && deadlineDays <= 1 && !['marketing', 'newsletter', 'spam'].includes(category)) {
    importance = 'high';
    reasons.push(`pedido com prazo ${deadlineDays <= 0 ? 'para hoje' : 'para amanhã'}`);
  }
  if (x.deadline?.value.alreadyPast && importance !== 'low') reasons.push('prazo já passou');
  if (x.cancellation) reasons.push(`compromisso ${x.cancellation.value.kind}`);

  return {
    category,
    domain,
    importance,
    reasons,
    confidence: Math.min(0.95, Number((confidence + (x.deadline ? 0.05 : 0)).toFixed(2))),
    actionRequested,
    bulk: ['marketing', 'newsletter', 'spam'].includes(category) || bulkLabel,
  };
}
