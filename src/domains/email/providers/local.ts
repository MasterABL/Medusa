/**
 * Provedor LOCAL de e-mail — o único que funciona sem integração externa.
 *
 * Gmail e Outlook continuam BLOQUEADOS (sem OAuth/backend). Este adaptador deixa o
 * usuário trazer um e-mail que ELE escolheu (colado ou digitado) para o mesmo pipeline
 * que um provedor real alimentaria: classificação → risco → extração → candidatos →
 * Guardian → lembretes/Agenda. Nada é buscado de fora e nada é enviado para fora.
 *
 * Origem `manual`: é dado do usuário (não fixture), mas não veio de uma caixa
 * sincronizada — a UI deve dizer "importado manualmente", nunca "sua caixa do Gmail".
 */
import type { EmailMessage } from '../model/types';
import { parseAddress } from './types';

export interface LocalEmailInput {
  from: string;
  subject: string;
  body: string;
  /** ISO local (YYYY-MM-DDTHH:mm:ss). Ausente = agora. */
  receivedAt?: string;
}

/** Limite do que fica guardado: o modelo de e-mail só guarda prévia curta. */
export const LOCAL_SNIPPET_MAX = 600;

const HEADER = /^(de|from|assunto|subject|data|date|para|to)\s*:\s*(.*)$/i;

/**
 * Lê um e-mail colado como texto. Aceita cabeçalhos em português ou inglês
 * ("De:", "Assunto:", "Data:") no topo; o resto é o corpo. Sem "De:" o remetente
 * fica como "desconhecido" — o texto não inventa um endereço.
 */
export function parsePastedEmail(raw: string): LocalEmailInput {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const out: LocalEmailInput = { from: '', subject: '', body: '' };
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (out.from || out.subject) {
        i++;
        break;
      }
      continue;
    }
    const m = line.match(HEADER);
    if (!m) break;
    const key = m[1].toLowerCase();
    if (key === 'de' || key === 'from') out.from = m[2].trim();
    else if (key === 'assunto' || key === 'subject') out.subject = m[2].trim();
    else if (key === 'data' || key === 'date') {
      const d = new Date(m[2].trim());
      if (!Number.isNaN(d.getTime())) out.receivedAt = toLocalIso(d);
    }
  }
  out.body = lines.slice(i).join('\n').trim();
  if (!out.subject) out.subject = out.body.split('\n')[0]?.slice(0, 120) ?? '';
  return out;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Id estável pelo conteúdo: importar o mesmo e-mail duas vezes não duplica. */
function stableId(input: LocalEmailInput): string {
  const text = `${input.from}|${input.subject}|${input.body.slice(0, 200)}`;
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function localEmailMessage(input: LocalEmailInput, now: Date = new Date()): EmailMessage {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject && !body) throw new Error('E-mail vazio: informe pelo menos assunto ou texto.');
  const sender = input.from.trim() ? parseAddress(input.from.trim()) : { address: 'desconhecido@local' };
  const id = `local-${stableId(input)}`;
  return {
    id,
    threadId: `local-th-${stableId({ ...input, body: '' })}`,
    source: { provider: 'local', origin: 'manual', account: 'importado manualmente' },
    direction: 'received',
    sender,
    recipients: [],
    subject: subject || '(sem assunto)',
    snippet: body.slice(0, LOCAL_SNIPPET_MAX),
    receivedAt: input.receivedAt ?? toLocalIso(now),
    isRead: false,
    isStarred: false,
    labels: ['INBOX', 'UNREAD'],
    attachments: [],
  };
}
