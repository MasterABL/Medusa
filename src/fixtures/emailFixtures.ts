/**
 * FIXTURE — e-mails de EXEMPLO para o provedor local (modo demonstração).
 * Só entram com `?demo=1`. Origem `fixture`: o runtime marca o provedor como
 * "mensagens de exemplo" e nada aqui pode ser apresentado como caixa real.
 */
import type { EmailMessage } from '@/domains/email/model/types';

const pad = (n: number) => String(n).padStart(2, '0');

function mail(id: string, subject: string, snippet: string, senderName: string, senderAddress: string, receivedAt: string): EmailMessage {
  return {
    id: `exemplo-${id}`,
    threadId: `exemplo-th-${id}`,
    source: { provider: 'fixture', origin: 'fixture', account: 'exemplo' },
    direction: 'received',
    sender: { name: senderName, address: senderAddress },
    recipients: [{ address: 'voce@exemplo.medusa' }],
    subject,
    snippet,
    receivedAt,
    isRead: false,
    isStarred: false,
    labels: ['INBOX', 'UNREAD'],
    attachments: [],
  };
}

export function exampleEmails(now: Date = new Date()): EmailMessage[] {
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const at = (hhmm: string) => `${day}T${hhmm}:00`;
  return [
    mail('tele', 'Consulta confirmada', 'Sua teleconsulta foi confirmada para amanhã às 18h com a Dra. Ana Souza.', 'Clínica (exemplo)', 'agenda@clinica.exemplo', at('08:00')),
    mail('prof', 'Projeto de Contabilidade', 'O Projeto de Contabilidade deve ser entregue sexta. Leva cerca de 45 min.', 'Prof. (exemplo)', 'professor@faculdade.exemplo', at('08:05')),
    mail('fatura', 'Sua fatura chegou', 'Pagamento da fatura de R$ 1.234,56 vence dia 10.', 'Banco (exemplo)', 'fatura@banco.exemplo', at('08:10')),
  ];
}
