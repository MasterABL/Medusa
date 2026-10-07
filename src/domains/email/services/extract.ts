/**
 * MEDUSA — E-mail — Extração de contexto (determinística)
 *
 * Regras, não modelo. Cada valor extraído carrega a EVIDÊNCIA (campo + trecho + posição)
 * e uma confiança. Nunca inventa: sem padrão no texto, o campo fica ausente.
 *
 * Datas relativas ("amanhã", "sexta", "dia 10", "em 5 dias") são resolvidas a partir de
 * `receivedAt` — o "amanhã" de um e-mail de ontem é hoje, não amanhã.
 *
 * Herdado conceitualmente do minha-vida (`emailRiscoClassifier.js`): "N dias" e DD/MM;
 * data sem ano no passado vai para o ano seguinte, EXCETO quando o texto já fala no
 * passado ("venceu em 01/09") — aí a data passada é o ponto.
 */

import type {
  ActionVerb, EmailContentForAnalysis, EmailExtraction, EmailMessage, Evidence, Extracted, MeetingKind,
} from '../model/types';

type Field = Evidence['field'];
interface Chunk { field: Field; text: string }
interface Hit { field: Field; start: number; end: number; m: RegExpExecArray }

const L = '\\p{L}\\d';
const B0 = `(?<![${L}])`;
const B1 = `(?![${L}])`;
const rx = (body: string, flags = 'giu') => new RegExp(body, flags);

const MAX_EXCERPT = 80;

export function excerptOf(text: string, start: number, end: number): string {
  const pad = Math.max(0, Math.floor((MAX_EXCERPT - (end - start)) / 2));
  const s = Math.max(0, start - pad);
  const e = Math.min(text.length, end + pad);
  const cut = text.slice(s, e).replace(/\s+/g, ' ').trim();
  return cut.length > MAX_EXCERPT ? cut.slice(0, MAX_EXCERPT - 1) + '…' : cut;
}

function evidence(c: Chunk, start: number, end: number): Evidence {
  return { field: c.field, excerpt: excerptOf(c.text, start, end), start, end };
}

function allHits(chunks: Chunk[], re: RegExp): Hit[] {
  const out: Hit[] = [];
  for (const c of chunks) {
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = r.exec(c.text))) {
      out.push({ field: c.field, start: m.index, end: m.index + m[0].length, m });
      if (m[0].length === 0) r.lastIndex++;
    }
  }
  return out;
}

// ===== datas =====

const pad2 = (n: number) => String(n).padStart(2, '0');
const toDate = (y: number, mo: number, d: number) => `${y}-${pad2(mo)}-${pad2(d)}`;
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return toDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
const weekdayOf = (date: string) => new Date(`${date}T12:00:00`).getDay();
const validDate = (y: number, mo: number, d: number) => {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(`${toDate(y, mo, d)}T12:00:00`);
  return dt.getMonth() + 1 === mo && dt.getDate() === d;
};

const WEEKDAYS: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const PAST_CONTEXT = rx(`${B0}(venceu|vencid[oa]s?|expirou|expirad[oa]|atrasad[oa]s?|em atraso)${B1}`);

interface DateHit { date: string; kind: EmailExtraction['dates'][number]['value']['kind']; raw: string; field: Field; start: number; end: number; chunk: Chunk; confidence: number }

function extractDates(chunks: Chunk[], base: string): DateHit[] {
  const year = Number(base.slice(0, 4));
  const pastText = chunks.some((c) => PAST_CONTEXT.test(c.text));
  PAST_CONTEXT.lastIndex = 0;
  const found: DateHit[] = [];
  const chunkOf = (f: Field) => chunks.find((c) => c.field === f)!;
  const push = (h: Hit, date: string, kind: DateHit['kind'], confidence: number) =>
    found.push({ date, kind, raw: h.m[0], field: h.field, start: h.start, end: h.end, chunk: chunkOf(h.field), confidence });

  // 10 de outubro (de 2026)
  for (const h of allHits(chunks, rx(`${B0}(\\d{1,2})\\s+de\\s+(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\\s+de\\s+(\\d{4}))?${B1}`))) {
    const d = Number(h.m[1]);
    const mo = MONTHS[fold(h.m[2])];
    let y = h.m[3] ? Number(h.m[3]) : year;
    if (!h.m[3] && toDate(y, mo, Math.min(d, 28)) < base.slice(0, 10) && !pastText && toDate(y, mo, d) < base.slice(0, 10)) y += 1;
    if (validDate(y, mo, d)) push(h, toDate(y, mo, d), 'absoluta', 0.95);
  }
  // DD/MM(/AAAA)
  for (const h of allHits(chunks, rx(`${B0}(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?${B1}`))) {
    const d = Number(h.m[1]);
    const mo = Number(h.m[2]);
    let y = h.m[3] ? Number(h.m[3]) : year;
    if (y < 100) y += 2000;
    if (!h.m[3] && !pastText && validDate(y, mo, d) && toDate(y, mo, d) < base.slice(0, 10)) y += 1;
    if (validDate(y, mo, d)) push(h, toDate(y, mo, d), 'absoluta', 0.9);
  }
  // depois de amanhã / amanhã / hoje
  for (const h of allHits(chunks, rx(`${B0}(depois de amanh[ãa]|amanh[ãa]|hoje)${B1}`))) {
    const w = fold(h.m[1]);
    push(h, addDays(base, w.startsWith('depois') ? 2 : w === 'amanha' ? 1 : 0), 'relativa', 0.9);
  }
  // em / daqui a / dentro de N dias
  for (const h of allHits(chunks, rx(`${B0}(?:em|daqui a|dentro de)\\s+(\\d{1,3})\\s+dias?${B1}`))) {
    const n = Number(h.m[1]);
    if (n <= 365) push(h, addDays(base, n), 'relativa', 0.85);
  }
  // (próxima) sexta(-feira) (que vem)
  for (const h of allHits(chunks, rx(`${B0}(pr[óo]xim[ao]\\s+)?(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)(?:-feira)?(\\s+que\\s+vem)?${B1}`))) {
    const target = WEEKDAYS[fold(h.m[2])];
    const today = weekdayOf(base);
    let delta = (target - today + 7) % 7;
    if (h.m[1] || h.m[3]) delta = delta === 0 ? 7 : delta;
    push(h, addDays(base, delta), 'dia_da_semana', delta === 0 ? 0.7 : 0.8);
  }
  // dia 10
  for (const h of allHits(chunks, rx(`${B0}dia\\s+(\\d{1,2})${B1}(?!\\s*\\/)(?!\\s+de\\s+[a-zç]+)`))) {
    const d = Number(h.m[1]);
    let y = year;
    let mo = Number(base.slice(5, 7));
    if (d < Number(base.slice(8, 10)) && !pastText) {
      mo += 1;
      if (mo > 12) { mo = 1; y += 1; }
    }
    if (validDate(y, mo, d)) push(h, toDate(y, mo, d), 'dia_do_mes', 0.75);
  }

  // sobreposição: fica o primeiro (mais específico) de cada trecho
  const accepted: DateHit[] = [];
  for (const d of found) {
    if (!accepted.some((a) => a.field === d.field && d.start < a.end && a.start < d.end)) accepted.push(d);
  }
  return accepted.sort((a, b) => (a.field === b.field ? a.start - b.start : fieldRank(a.field) - fieldRank(b.field)));
}

const fieldRank = (f: Field) => ({ subject: 0, snippet: 1, body: 2, sender: 3, attachment: 4 })[f];

// ===== horários =====

interface TimeHit { time: string; raw: string; field: Field; start: number; end: number; chunk: Chunk; confidence: number; endTime?: string }

const DURATION_BEFORE = rx(`(leva|levar[áa]?|dura|dura[çc][ãa]o( de)?|cerca de|aproximadamente|uns|umas|em)\\s*$`, 'iu');

function extractTimes(chunks: Chunk[]): TimeHit[] {
  const out: TimeHit[] = [];
  const chunkOf = (f: Field) => chunks.find((c) => c.field === f)!;
  const re = rx(`${B0}(?:([àa]s|a partir das|das)\\s+)?(\\d{1,2})(?:\\s?(?:h|hs|horas?)\\s?(\\d{2})?|:(\\d{2}))(?:\\s?min)?${B1}(?:\\s*(?:[àa]s|-|até|a)\\s*(\\d{1,2})(?:\\s?(?:h|hs|horas?)\\s?(\\d{2})?|:(\\d{2})))?`);
  for (const h of allHits(chunks, re)) {
    const hh = Number(h.m[2]);
    const mm = Number(h.m[3] ?? h.m[4] ?? 0);
    if (hh > 23 || mm > 59) continue;
    const before = chunkOf(h.field).text.slice(Math.max(0, h.start - 25), h.start);
    if (!h.m[1] && DURATION_BEFORE.test(before)) continue; // "leva 2h" é duração, não horário
    const time = `${pad2(hh)}:${pad2(mm)}`;
    let endTime: string | undefined;
    if (h.m[5] !== undefined) {
      const eh = Number(h.m[5]);
      const em = Number(h.m[6] ?? h.m[7] ?? 0);
      if (eh <= 23 && em <= 59 && eh * 60 + em > hh * 60 + mm) endTime = `${pad2(eh)}:${pad2(em)}`;
    }
    out.push({ time, endTime, raw: h.m[0], field: h.field, start: h.start, end: h.end, chunk: chunkOf(h.field), confidence: h.m[1] || h.m[4] ? 0.9 : 0.75 });
  }
  for (const h of allHits(chunks, rx(`${B0}(meio-dia|meio dia)${B1}`))) {
    out.push({ time: '12:00', raw: h.m[0], field: h.field, start: h.start, end: h.end, chunk: chunkOf(h.field), confidence: 0.85 });
  }
  // "às 14h, das 14h às 15h30": o mesmo início citado duas vezes vira um horário só, com o fim
  const merged: TimeHit[] = [];
  for (const t of out.sort((a, b) => fieldRank(a.field) - fieldRank(b.field) || a.start - b.start)) {
    const twin = merged.find((m) => m.field === t.field && m.time === t.time && Math.abs(m.start - t.start) <= 30);
    if (twin) twin.endTime = twin.endTime ?? t.endTime;
    else merged.push({ ...t });
  }
  return merged;
}

// ===== auxiliares de vizinhança =====

/** Primeiro item de `list` que começa até `gap` caracteres depois de `end`, no mesmo campo. */
function nextAfter<T extends { field: Field; start: number }>(list: T[], field: Field, end: number, gap: number): T | undefined {
  return list.filter((x) => x.field === field && x.start >= end && x.start - end <= gap).sort((a, b) => a.start - b.start)[0];
}
function nearest<T extends { field: Field; start: number }>(list: T[], field: Field, pos: number, max: number): T | undefined {
  return list
    .filter((x) => x.field === field && Math.abs(x.start - pos) <= max)
    .sort((a, b) => Math.abs(a.start - pos) - Math.abs(b.start - pos))[0];
}

// ===== padrões de conteúdo =====

const DEADLINE_TRIGGER = rx(
  `${B0}(at[ée]|prazo(?:\\s+final)?(?:\\s+(?:[ée]|para|at[ée]))?|vence(?:m|r[áa]?)?(?:\\s+(?:no|na|em))?|vencimento(?:\\s+(?:em|no|dia|para))?|entreg(?:ue|ues|ar|a)(?:\\s+at[ée])?|conclu[íi]d[oa]s?(?:\\s+at[ée])?|finalizad[oa]s?(?:\\s+at[ée])?|limite(?:\\s+(?:[ée]|at[ée]))?)${B1}`
);

const MEETING_KINDS: Array<[MeetingKind, RegExp]> = [
  ['consulta', rx(`${B0}(consulta|telemedicina|teleconsulta|atendimento m[ée]dico|exame|retorno m[ée]dico)${B1}`)],
  ['prova', rx(`${B0}(prova|avalia[çc][ãa]o presencial|exame final)${B1}`)],
  ['entrevista', rx(`${B0}(entrevista)${B1}`)],
  ['reuniao', rx(`${B0}(reuni[ãa]o|meeting|call|alinhamento|videoconfer[êe]ncia)${B1}`)],
  ['aula', rx(`${B0}(aula ao vivo|aula|webinar|live)${B1}`)],
  ['evento', rx(`${B0}(evento|palestra|encontro|culto|cerim[ôo]nia)${B1}`)],
];

const CANCELLATION = rx(`${B0}(cancelad[oa]|desmarcad[oa]|foi cancelad[oa]|remarcad[oa]|reagendad[oa])${B1}`);

const ACTIONS: Array<[ActionVerb, RegExp]> = [
  ['pagar', rx(`${B0}(pague|pagar|efetu(?:e|ar) o pagamento|quite|quitar)${B1}`)],
  ['enviar', rx(`${B0}(envie|enviar|mande|mandar|me (?:envie|mande|passe)|pode(?:ria)? me enviar|encaminhe)${B1}`)],
  ['entregar', rx(`${B0}(entregar|entregue|deve(?:m)? ser entregues?)${B1}`)],
  ['assinar', rx(`${B0}(assine|assinar|assinatura pendente)${B1}`)],
  ['confirmar', rx(`${B0}(confirme|confirmar (?:sua )?(?:presen[çc]a|participa[çc][ãa]o|recebimento)|favor confirmar)${B1}`)],
  ['responder', rx(`${B0}(responda|responder|aguardo (?:sua |seu )?(?:resposta|retorno)|me retorne)${B1}`)],
  ['revisar', rx(`${B0}(revise|revisar|analise|analisar|d[êe] uma olhada)${B1}`)],
  ['agendar', rx(`${B0}(agende|agendar|marque|marcar (?:um )?hor[áa]rio)${B1}`)],
  ['comparecer', rx(`${B0}(compare[çc]a|comparecer|presen[çc]a obrigat[óo]ria)${B1}`)],
  ['concluir', rx(`${B0}(precisa(?:m)? ser conclu[íi]d[oa]s?|concluir|finalizar)${B1}`)],
];

const AMOUNT = rx(`R\\$\\s?(\\d{1,3}(?:\\.\\d{3})+|\\d+)(?:,(\\d{2}))?`);
const ONLINE = rx(`(meet\\.google\\.com\\/[\\w-]+|zoom\\.us\\/j\\/\\d+|teams\\.microsoft\\.com\\S*|teams\\.live\\.com\\S*)`);
const LOCATION = rx(`${B0}(?:local|endere[çc]o)\\s*:\\s*([^.;\\n]{3,60})`);
const ROOM = rx(`${B0}((?:sala|audit[óo]rio|bloco|consult[óo]rio)\\s+[\\p{L}\\d-]+)`);
const PERSON = rx(`${B0}((?:Dr|Dra|Prof|Profa)\\.?|Professora?|Doutora?)\\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\\p{L}]+(?:\\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\\p{L}]+)?)`, 'gu');
const CAP = `[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\\p{L}]+`;
const DISCIPLINE = [
  rx(`${B0}(?:[Dd]isciplina|[Mm]at[ée]ria)\\s*(?:de\\s+)?:?\\s*(${CAP}(?:\\s+(?:de|e|da|do|das|dos)?\\s*${CAP}){0,3})`, 'gu'),
  rx(`${B0}(?:[Tt]rabalho|[Pp]rojeto|[Pp]rova|[Aa]tividade|[Ll]ista|[Ss]emin[áa]rio)\\s+de\\s+(${CAP}(?:\\s+${CAP}){0,2})`, 'gu'),
];
const COURSE = rx(`${B0}[Cc]urso\\s+(?:de\\s+)?(${CAP}(?:\\s+(?:de|e|em)?\\s*${CAP}){0,3})`, 'gu');
const GENERIC_PROJECT = rx(`${B0}(projeto (?:integrado|multidisciplinar|interdisciplinar|de extens[ãa]o)(?:\\s+[IVX]+)?)${B1}`);
const DOCUMENT = rx(`${B0}(documento|contrato|comprovante|nota fiscal|boleto|declara[çc][ãa]o|certificado|relat[óo]rio|curr[íi]culo|atestado)${B1}`);
const EFFORT = rx(`${B0}(?:leva|levar[áa]?|dura|dura[çc][ãa]o de|cerca de|aproximadamente|uns|umas)\\s+(\\d{1,3})\\s*(min|minutos|h|horas?)${B1}`);

const GENERIC_MAIL = /^(gmail|hotmail|outlook|live|yahoo|icloud|uol|bol|terra|proton|protonmail)\./i;
const ORG_WORDS = rx(`${B0}(cl[íi]nica|hospital|laborat[óo]rio|universidade|faculdade|banco|ltda|s\\.a\\.|escola|instituto|centro|grupo|prefeitura)${B1}`, 'iu');

export interface ExtractOptions {
  /** Projetos conhecidos para casar menções ("Projeto Integrado" → id). */
  knownProjects?: Array<{ id: string; title: string; aliases?: string[] }>;
}

export function extractContext(msg: EmailMessage, content?: EmailContentForAnalysis, opts: ExtractOptions = {}): EmailExtraction {
  const chunks: Chunk[] = [
    { field: 'subject', text: msg.subject ?? '' },
    { field: 'snippet', text: msg.snippet ?? '' },
    ...(content && content.messageId === msg.id ? [{ field: 'body' as const, text: content.text }] : []),
  ];
  const base = msg.receivedAt.slice(0, 10);
  const dates = extractDates(chunks, base);
  const times = extractTimes(chunks);
  const out: EmailExtraction = {
    dates: dates.map((d) => ({ value: { date: d.date, kind: d.kind, raw: d.raw }, evidence: evidence(d.chunk, d.start, d.end), confidence: d.confidence })),
    times: times.map((t) => ({ value: { time: t.time, raw: t.raw }, evidence: evidence(t.chunk, t.start, t.end), confidence: t.confidence })),
    amounts: [],
    people: [],
    documents: [],
  };
  const chunkOf = (f: Field) => chunks.find((c) => c.field === f)!;
  const pastText = chunks.some((c) => new RegExp(PAST_CONTEXT.source, 'iu').test(c.text));

  // prazo: gatilho seguido de data em até 25 caracteres
  for (const h of allHits(chunks, DEADLINE_TRIGGER)) {
    const d = nextAfter(dates, h.field, h.end, 25);
    if (!d) continue;
    const t = nextAfter(times, h.field, d.end, 15);
    out.deadline = {
      value: { date: d.date, time: t?.time, phrase: chunkOf(h.field).text.slice(h.start, t ? t.end : d.end), alreadyPast: d.date < base || pastText },
      evidence: evidence(chunkOf(h.field), h.start, t ? t.end : d.end),
      confidence: Math.min(0.95, d.confidence + 0.05),
    };
    break;
  }

  // "poderá ser negativado em 5 dias se não pagar": prazo relativo sem gatilho clássico
  if (!out.deadline) {
    const rel = dates.find((d) => d.kind === 'relativa' && /^(em|daqui|dentro)/i.test(d.raw));
    if (rel && chunks.some((c) => /pag|negativ|regulariz|quit|prazo|venc|bloque/i.test(c.text))) {
      out.deadline = { value: { date: rel.date, phrase: rel.raw, alreadyPast: false }, evidence: evidence(rel.chunk, rel.start, rel.end), confidence: 0.75 };
    }
  }

  // compromisso: palavra de encontro + horário (data perto, ou nenhuma)
  for (const [kind, re] of MEETING_KINDS) {
    const h = allHits(chunks, re)[0];
    if (!h) continue;
    const time = nearest(times, h.field, h.start, 80) ?? times[0];
    const date = nearest(dates, h.field, h.start, 80) ?? dates.find((x) => x.field === h.field) ?? dates[0];
    if (!time && !(kind === 'prova' && date)) continue; // sem horário, só prova ainda vira compromisso (dia inteiro)
    const ends = [h.end, time?.end ?? 0, date && date.field === h.field ? date.end : 0];
    out.meeting = {
      value: { kind, date: date?.date, time: time?.time, endTime: time?.endTime },
      evidence: evidence(chunkOf(h.field), Math.min(h.start, date && date.field === h.field ? date.start : h.start), Math.max(...ends)),
      confidence: (time ? 0.6 : 0.45) + (date ? 0.2 : 0) + (chunks.some((c) => /confirmad|agendad|marcad/i.test(c.text)) ? 0.1 : 0),
    };
    break;
  }

  const cancel = allHits(chunks, CANCELLATION)[0];
  if (cancel) {
    const w = fold(cancel.m[1]);
    out.cancellation = { value: { kind: w.includes('remarcad') || w.includes('reagendad') ? 'remarcado' : 'cancelado' }, evidence: evidence(chunkOf(cancel.field), cancel.start, cancel.end), confidence: 0.8 };
  }

  for (const h of allHits(chunks, AMOUNT)) {
    const int = Number(h.m[1].replace(/\./g, ''));
    const amount = int + (h.m[2] ? Number(h.m[2]) / 100 : 0);
    out.amounts.push({ value: { amount, currency: 'BRL' }, evidence: evidence(chunkOf(h.field), h.start, h.end), confidence: 0.95 });
  }

  const online = allHits(chunks, ONLINE)[0];
  const loc = allHits(chunks, LOCATION)[0];
  const room = allHits(chunks, ROOM)[0];
  if (online) out.location = { value: { text: online.m[1], online: true }, evidence: evidence(chunkOf(online.field), online.start, online.end), confidence: 0.95 };
  else if (loc) out.location = { value: { text: loc.m[1].trim(), online: false }, evidence: evidence(chunkOf(loc.field), loc.start, loc.end), confidence: 0.85 };
  else if (room) out.location = { value: { text: room.m[1], online: false }, evidence: evidence(chunkOf(room.field), room.start, room.end), confidence: 0.7 };

  for (const h of allHits(chunks, PERSON)) {
    out.people.push({ value: { name: `${h.m[1].replace(/\.$/, '')}. ${h.m[2]}`.replace('..', '.') }, evidence: evidence(chunkOf(h.field), h.start, h.end), confidence: 0.8 });
  }
  if (msg.sender.name && !ORG_WORDS.test(msg.sender.name) && !/no-?reply|nao-?responda|notifica/i.test(msg.sender.address)) {
    const sc: Chunk = { field: 'sender', text: msg.sender.name };
    out.people.push({ value: { name: msg.sender.name }, evidence: evidence(sc, 0, sc.text.length), confidence: 0.6 });
  }
  ORG_WORDS.lastIndex = 0;

  if (msg.sender.name && new RegExp(ORG_WORDS.source, 'iu').test(msg.sender.name)) {
    const sc: Chunk = { field: 'sender', text: msg.sender.name };
    out.organization = { value: { name: msg.sender.name }, evidence: evidence(sc, 0, sc.text.length), confidence: 0.8 };
  } else {
    const domain = msg.sender.address.split('@')[1] ?? '';
    if (domain && !GENERIC_MAIL.test(domain) && msg.sender.name && fold(msg.sender.name).replace(/\s+/g, '') === fold(domain.split('.')[0])) {
      const sc: Chunk = { field: 'sender', text: msg.sender.name };
      out.organization = { value: { name: msg.sender.name }, evidence: evidence(sc, 0, sc.text.length), confidence: 0.75 };
    } else if (domain && !GENERIC_MAIL.test(domain)) {
      const label = domain.split('.')[0];
      const sc: Chunk = { field: 'sender', text: msg.sender.address };
      out.organization = { value: { name: label }, evidence: evidence(sc, sc.text.indexOf(domain), sc.text.length), confidence: 0.5 };
    }
  }

  for (const re of DISCIPLINE) {
    const h = allHits(chunks, re)[0];
    if (h) {
      out.discipline = { value: { name: h.m[1].trim() }, evidence: evidence(chunkOf(h.field), h.start, h.end), confidence: 0.75 };
      break;
    }
  }
  const course = allHits(chunks, COURSE)[0];
  if (course) out.course = { value: { name: course.m[1].trim() }, evidence: evidence(chunkOf(course.field), course.start, course.end), confidence: 0.7 };

  for (const p of opts.knownProjects ?? []) {
    const names = [p.title, ...(p.aliases ?? [])].map(fold);
    const c = chunks.find((ch) => names.some((n) => fold(ch.text).includes(n)));
    if (c) {
      const n = names.find((x) => fold(c.text).includes(x))!;
      const at = fold(c.text).indexOf(n);
      out.project = { value: { name: p.title, matchedProjectId: p.id }, evidence: evidence(c, at, at + n.length), confidence: 0.9 };
      break;
    }
  }
  if (!out.project) {
    const g = allHits(chunks, GENERIC_PROJECT)[0];
    if (g) out.project = { value: { name: g.m[1] }, evidence: evidence(chunkOf(g.field), g.start, g.end), confidence: 0.6 };
  }

  for (const a of msg.attachments) {
    const ac: Chunk = { field: 'attachment', text: a.filename };
    out.documents.push({ value: { name: a.filename }, evidence: evidence(ac, 0, a.filename.length), confidence: 0.95 });
  }
  for (const h of allHits(chunks, DOCUMENT)) {
    if (!out.documents.some((d) => fold(d.value.name).includes(fold(h.m[1])))) {
      out.documents.push({ value: { name: h.m[1] }, evidence: evidence(chunkOf(h.field), h.start, h.end), confidence: 0.6 });
    }
  }

  for (const [verb, re] of ACTIONS) {
    const h = allHits(chunks, re)[0];
    if (!h) continue;
    const text = chunkOf(h.field).text;
    let obj = text.slice(h.end).split(/[.;!?\n]/)[0].trim();
    obj = obj.replace(new RegExp(`\\s*(?:${DEADLINE_TRIGGER.source}).*$`, 'iu'), '');
    // a data/horário não fazem parte do objeto ("entregue sexta" → objeto vazio, não "sexta")
    for (const d of [...dates, ...times]) if (d.field === h.field) obj = obj.split(d.raw).join(' ');
    obj = obj.replace(/\s+/g, ' ').replace(/^(o|a|os|as|um|uma|me|nos|para mim)\s+/i, '').replace(/[\s,]+$/, '').trim();
    out.actionRequest = { value: { verb, object: obj ? obj.slice(0, 50) : undefined }, evidence: evidence(chunkOf(h.field), h.start, Math.min(text.length, h.end + (obj ? obj.length + 1 : 0))), confidence: 0.75 };
    break;
  }

  const eff = allHits(chunks, EFFORT)[0];
  if (eff) {
    const n = Number(eff.m[1]);
    const minutes = /^h/i.test(eff.m[2]) ? n * 60 : n;
    if (minutes > 0 && minutes <= 12 * 60) out.effort = { value: { minutes }, evidence: evidence(chunkOf(eff.field), eff.start, eff.end), confidence: 0.85 };
  }

  return out;
}

export { addDays as addDaysLocal };
export type { Extracted };
