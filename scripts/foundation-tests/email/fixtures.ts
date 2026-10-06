/**
 * Fixtures dos testes de e-mail. Tudo marcado como origem de teste; nenhuma caixa real.
 * DAY = terça-feira 06/10/2026.
 */
import type { EmailMessage, EmailThread } from '../../../src/domains/email/model/types';

export const DAY = '2026-10-06';
export const at = (hhmm: string, day = DAY) => `${day}T${hhmm}:00`;

export function mail(id: string, subject: string, snippet: string, o: Partial<EmailMessage> = {}): EmailMessage {
  return {
    id,
    threadId: o.threadId ?? `th-${id}`,
    source: { provider: 'gmail', externalId: id, origin: 'fixture' },
    direction: 'received',
    sender: { name: 'Remetente', address: 'pessoa@empresa.com.br' },
    recipients: [{ address: 'eu@medusa.test' }],
    subject,
    snippet,
    receivedAt: at('09:00'),
    isRead: false,
    isStarred: false,
    labels: ['INBOX', 'UNREAD'],
    attachments: [],
    ...o,
  };
}

export const SAMPLES = {
  telemedicina: () => mail('tele', 'Consulta confirmada', 'Sua teleconsulta foi confirmada para amanhã às 18h com a Dra. Ana Souza.', { sender: { name: 'Clínica Vida', address: 'agenda@clinicavida.com.br' } }),
  contabilidade: () => mail('cont', 'Projeto de Contabilidade', 'O Projeto de Contabilidade deve ser entregue sexta. Leva cerca de 45 min.', { sender: { name: 'Prof. Carlos', address: 'carlos@faculdade.edu.br' } }),
  fechamento: () => mail('fech', 'Fechamento do mês', 'Fechamento do mês precisa ser concluído amanhã.', { sender: { name: 'Marina', address: 'marina@empresa.com.br' } }),
  fatura: () => mail('fat', 'Sua fatura chegou', 'Pagamento da fatura de R$ 1.234,56 vence dia 10.', { sender: { name: 'Nubank', address: 'todomundo@nubank.com.br' } }),
  negativacao: () => mail('neg', 'Aviso importante', 'Seu CPF poderá ser negativado em 5 dias se não pagar. Aproveite desconto de 50%!', { sender: { name: 'Cobrança', address: 'cobranca@financeira.com' } }),
  promo: () => mail('promo', 'Black Friday antecipada', '50% off em tudo, frete grátis. Descadastre-se aqui.', { sender: { name: 'CEO da Loja', address: 'ceo@loja.com' }, labels: ['INBOX', 'CATEGORY_PROMOTIONS'] }),
  reuniao: () => mail('reun', 'Reunião de planejamento', 'Nossa reunião será terça-feira às 14h no meet.google.com/abc-defg-hij', { sender: { name: 'Paulo', address: 'paulo@empresa.com.br' } }),
  pedido: () => mail('ped', 'Documento', 'Oi! Você pode me enviar o documento até sexta-feira? Responda quando puder.', { sender: { name: 'Ana', address: 'ana@gmail.com' } }),
  informativo: () => mail('info', 'Atualização do projeto', 'Segue um resumo do que avançamos na semana, só para você acompanhar.', { sender: { name: 'Equipe', address: 'equipe@empresa.com.br' } }),
};

export function thread(threadId: string, messages: EmailMessage[]): EmailThread {
  const sorted = [...messages].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  return {
    threadId,
    messages: sorted.map((m) => ({ ...m, threadId })),
    participants: [],
    subject: sorted[0].subject,
    lastMessageAt: sorted[sorted.length - 1].receivedAt,
    unreadCount: sorted.filter((m) => !m.isRead).length,
    status: 'informational',
  };
}
