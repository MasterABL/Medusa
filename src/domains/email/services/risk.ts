/**
 * MEDUSA — E-mail — Risco
 *
 * Generaliza o "risco financeiro" do minha-vida para os tipos que importam na vida
 * (prazo, dinheiro, saúde, faculdade, trabalho, reunião, segurança, documento, pedido,
 * acompanhamento). Regras determinísticas; cada risco carrega evidência e confiança.
 * Sem nenhum sinal, o e-mail recebe um único risco `informational` de severidade baixa —
 * o "não há risco" também é uma conclusão explícita.
 */

import type { EmailClassification, EmailExtraction, EmailMessage, EmailRisk, RiskSeverity, TemporalImpact } from '../model/types';
import { PATTERNS } from './classify';

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b.slice(0, 10)}T12:00:00`) - Date.parse(`${a.slice(0, 10)}T12:00:00`)) / 86_400_000);

export function temporalImpact(date: string | undefined, now: string): TemporalImpact {
  if (!date) return 'nenhum';
  const d = daysBetween(now, date);
  if (d < 0) return 'vencido';
  if (d === 0) return 'hoje';
  return d <= 7 ? 'proximo' : 'futuro';
}

const bump = (s: RiskSeverity, t: TemporalImpact): RiskSeverity =>
  t === 'vencido' || t === 'hoje' ? (s === 'low' ? 'medium' : s === 'medium' ? 'high' : s) : s;

export function assessRisk(msg: EmailMessage, c: EmailClassification, x: EmailExtraction, now: string): EmailRisk[] {
  const text = `${msg.subject}\n${msg.snippet}`;
  const risks: EmailRisk[] = [];
  const dl = x.deadline?.value;
  const dlImpact = temporalImpact(dl?.date, now);
  const amount = x.amounts[0]?.value;

  if (c.bulk) {
    return [{ type: 'informational', severity: 'low', reason: 'envio em massa, nada a fazer', temporalImpact: 'nenhum', domain: c.domain, confidence: c.confidence, evidence: [] }];
  }

  if (c.category === 'medical' && x.meeting) {
    const t = temporalImpact(x.meeting.value.date, now);
    risks.push({ type: 'medical', severity: x.cancellation ? 'medium' : 'critical', reason: x.cancellation ? `compromisso de saúde ${x.cancellation.value.kind}` : 'compromisso de saúde com horário marcado', deadline: x.meeting.value.date, temporalImpact: t, domain: 'body', confidence: x.meeting.confidence, evidence: [x.meeting.evidence] });
  } else if (c.category === 'medical') {
    risks.push({ type: 'medical', severity: 'medium', reason: 'assunto de saúde sem compromisso marcado', temporalImpact: dlImpact, domain: 'body', confidence: 0.6, evidence: [] });
  }

  if (c.category === 'finance') {
    const critical = PATTERNS.financeCritical.test(text);
    const high = PATTERNS.financeHigh.test(text);
    const base: RiskSeverity = critical ? 'critical' : high || c.importance === 'high' ? 'high' : c.importance === 'low' ? 'low' : 'medium';
    risks.push({
      type: 'financial',
      severity: bump(base, dlImpact),
      reason: critical ? 'risco de negativação/bloqueio' : high ? 'cobrança ou atraso' : c.importance === 'low' ? 'confirmação financeira' : dl ? 'pagamento com vencimento' : 'assunto financeiro',
      deadline: dl?.date,
      financialImpact: amount ? { amount: amount.amount, currency: 'BRL' } : undefined,
      temporalImpact: dlImpact,
      domain: 'finance',
      confidence: c.confidence,
      evidence: [x.deadline?.evidence, x.amounts[0]?.evidence].filter(Boolean) as EmailRisk['evidence'],
    });
  }

  if (c.category === 'security') {
    risks.push({ type: 'security', severity: 'high', reason: 'alerta de segurança de conta — confira se foi você', temporalImpact: 'hoje', domain: 'personal', confidence: c.confidence, evidence: [] });
  }

  if (dl && c.category !== 'finance') {
    const sev: RiskSeverity = c.importance === 'critical' ? 'critical' : c.importance === 'high' ? 'high' : 'medium';
    risks.push({ type: 'deadline', severity: bump(sev, dlImpact), reason: dl.alreadyPast ? 'prazo já vencido' : `prazo: ${dl.phrase}`, deadline: dl.time ? `${dl.date}T${dl.time}:00` : dl.date, temporalImpact: dl.alreadyPast ? 'vencido' : dlImpact, domain: c.domain, confidence: x.deadline!.confidence, evidence: [x.deadline!.evidence] });
    if (c.category === 'academic') risks.push({ type: 'academic', severity: bump(sev, dlImpact), reason: x.discipline ? `entrega de ${x.discipline.value.name}` : 'entrega acadêmica', deadline: dl.date, temporalImpact: dlImpact, domain: 'education', confidence: x.deadline!.confidence, evidence: [x.deadline!.evidence, ...(x.discipline ? [x.discipline.evidence] : [])] });
    if (c.category === 'work') risks.push({ type: 'work', severity: bump(sev, dlImpact), reason: 'prazo de trabalho', deadline: dl.date, temporalImpact: dlImpact, domain: 'work', confidence: x.deadline!.confidence, evidence: [x.deadline!.evidence] });
  }

  if (x.meeting && c.category !== 'medical') {
    const t = temporalImpact(x.meeting.value.date, now);
    const sev: RiskSeverity = x.meeting.value.kind === 'prova' ? 'critical' : c.importance === 'high' || c.importance === 'critical' ? 'high' : 'medium';
    risks.push({ type: 'meeting', severity: x.cancellation ? 'medium' : sev, reason: x.cancellation ? `compromisso ${x.cancellation.value.kind}` : `${x.meeting.value.kind} marcada`, deadline: x.meeting.value.date, temporalImpact: t, domain: c.domain, confidence: x.meeting.confidence, evidence: [x.meeting.evidence] });
  }

  if (x.documents.length > 0 && (x.actionRequest?.value.verb === 'enviar' || x.actionRequest?.value.verb === 'assinar' || msg.attachments.length > 0)) {
    risks.push({ type: 'document', severity: x.actionRequest ? 'medium' : 'low', reason: x.actionRequest ? `documento a ${x.actionRequest.value.verb}` : 'documento anexado', temporalImpact: dlImpact, domain: c.domain, confidence: 0.7, evidence: x.documents.slice(0, 2).map((d) => d.evidence) });
  }

  if (x.actionRequest && !['pagar'].includes(x.actionRequest.value.verb)) {
    const sev: RiskSeverity = dl ? bump(c.importance === 'high' || c.importance === 'critical' ? 'high' : 'medium', dlImpact) : 'medium';
    risks.push({ type: 'request', severity: sev, reason: `pedido: ${x.actionRequest.value.verb}${x.actionRequest.value.object ? ` ${x.actionRequest.value.object}` : ''}`, deadline: dl?.date, temporalImpact: dlImpact, domain: c.domain, confidence: x.actionRequest.confidence, evidence: [x.actionRequest.evidence] });
  }

  if (risks.length === 0) {
    risks.push({ type: 'informational', severity: 'low', reason: 'nenhum prazo, compromisso, pedido ou risco encontrado', temporalImpact: 'nenhum', domain: c.domain, confidence: c.confidence, evidence: [] });
  }
  const rank: Record<RiskSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return risks.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
