/**
 * Extração (data, horário, prazo, valor, reunião), classificação (importância ≠ prestígio),
 * risco (saúde, faculdade, finanças, trabalho, informativo) e privacidade.
 */
import { makeChecker, resetAll } from '../domains/_helpers';
import { DAY, at, mail, SAMPLES } from './fixtures';
import { extractContext } from '../../../src/domains/email/services/extract';
import { analyzeEmail } from '../../../src/domains/email/services/pipeline';

const NOW = at('09:05');

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('email-understanding');
  resetAll();

  // ===== Extração =====
  {
    const x = extractContext(SAMPLES.telemedicina());
    check('1.1: "amanhã" é lido a partir do dia em que o e-mail chegou', x.dates[0]?.value.date === '2026-10-07');
    const old = extractContext(mail('o', 'Consulta', 'Consulta amanhã às 10h', { receivedAt: '2026-10-01T08:00:00' }));
    check('1.2: e-mail antigo: o "amanhã" dele é 02/10, não o amanhã de hoje', old.dates[0]?.value.date === '2026-10-02');
    check('1.3: horário "às 18h" → 18:00 com evidência no texto', x.times[0]?.value.time === '18:00' && x.times[0].evidence.field === 'snippet' && x.times[0].evidence.excerpt.includes('18h'));
    check('1.4: compromisso de saúde com data e horário', x.meeting?.value.kind === 'consulta' && x.meeting.value.date === '2026-10-07' && x.meeting.value.time === '18:00');
    check('1.5: pessoa extraída do texto ("Dra. Ana Souza")', x.people.some((p) => p.value.name === 'Dra. Ana Souza'));

    const c = extractContext(SAMPLES.contabilidade());
    check('1.6: "deve ser entregue sexta" → prazo na sexta 09/10', c.deadline?.value.date === '2026-10-09' && !c.meeting);
    check('1.7: disciplina extraída ("Contabilidade")', c.discipline?.value.name === 'Contabilidade');
    check('1.8: esforço só quando dito no texto ("cerca de 45 min")', c.effort?.value.minutes === 45);

    const f = extractContext(SAMPLES.fatura());
    check('1.9: valor em reais "R$ 1.234,56" → 1234.56', f.amounts[0]?.value.amount === 1234.56);
    check('1.10: "vence dia 10" → prazo 10/10', f.deadline?.value.date === '2026-10-10');

    const r = extractContext(mail('r', 'Reunião', 'Reunião das 14h às 15h30 na sala 3, terça que vem'));
    check('1.11: faixa de horário (início e fim) e local', !!(r.meeting?.value.time === '14:00' && r.meeting.value.endTime === '15:30' && r.location?.value.text.toLowerCase().startsWith('sala 3')));
    check('1.12: "terça que vem" numa terça → semana seguinte (13/10)', r.meeting?.value.date === '2026-10-13');

    const dur = extractContext(mail('d', 'Processo', 'Atendimento 24h. Leva 2h para processar.'));
    check('1.13: "24h" e "leva 2h" NÃO viram horário (duração ≠ horário)', dur.times.length === 0 && dur.effort?.value.minutes === 120);
    const past = extractContext(mail('p', 'Boleto', 'Seu boleto venceu em 01/10.'));
    check('1.14: "venceu em 01/10" fica no passado (não vira 01/10 do ano que vem)', past.dates[0]?.value.date === '2026-10-01');
    const none = extractContext(SAMPLES.informativo());
    check('1.15: sem data no texto → nenhum prazo inventado', !none.deadline && none.dates.length === 0 && !none.meeting);
    const noDate = extractContext(mail('n', 'Call', 'Vamos fazer uma call às 15h?'));
    check('1.16: horário sem data: o horário é extraído, mas a data fica ausente', noDate.meeting?.value.time === '15:00' && noDate.meeting.value.date === undefined);
  }

  // ===== Classificação e risco =====
  resetAll();
  {
    const a = (m: ReturnType<typeof mail>) => analyzeEmail(m, { now: NOW });
    const tele = a(SAMPLES.telemedicina());
    check('2.1: saúde: consulta confirmada → medical / body / critical', tele.classification.category === 'medical' && tele.classification.domain === 'body' && tele.classification.importance === 'critical');
    check('2.2: risco medical crítico com evidência', tele.risks[0].type === 'medical' && tele.risks[0].severity === 'critical' && tele.risks[0].evidence.length > 0);

    const cont = a(SAMPLES.contabilidade());
    check('2.3: faculdade: entrega em 3 dias → academic / education / high', cont.classification.category === 'academic' && cont.classification.importance === 'high');
    check('2.4: risco acadêmico + prazo', cont.risks.some((r) => r.type === 'academic') && cont.risks.some((r) => r.type === 'deadline' && r.deadline === '2026-10-09'));

    const fech = a(SAMPLES.fechamento());
    check('2.5: trabalho: fechamento para amanhã → work / high', fech.classification.domain === 'work' && fech.classification.importance === 'high' && fech.risks.some((r) => r.type === 'work'));

    const fat = a(SAMPLES.fatura());
    check('2.6: finanças: fatura vencendo em 4 dias → finance / high, risco com valor', fat.classification.domain === 'finance' && fat.classification.importance === 'high' && fat.risks[0].type === 'financial' && fat.risks[0].financialImpact?.amount === 1234.56);

    const neg = a(SAMPLES.negativacao());
    check('2.7: risco vence propaganda: negativação com "desconto 50%" continua CRÍTICA', neg.classification.importance === 'critical' && neg.risks[0].severity === 'critical' && neg.extraction.deadline?.value.date === '2026-10-11');

    const promo = a(SAMPLES.promo());
    check('2.8: importância ≠ prestígio: propaganda do "CEO" é baixa e sem candidato', promo.classification.importance === 'low' && promo.classification.bulk && promo.candidates.length === 0);
    const vip = a(mail('vip', 'Newsletter da semana', 'Resumo da semana. Descadastre-se.', { sender: { name: 'Presidente da Empresa', address: 'presidente@empresa.com.br' } }));
    check('2.9: newsletter de remetente "importante" continua baixa', vip.classification.importance === 'low');
    const unknown = a(mail('unk', 'Consulta', 'Sua consulta está confirmada para amanhã às 9h.', { sender: { address: 'x1234@desconhecido.net' } }));
    check('2.10: remetente desconhecido com consulta marcada continua crítico', unknown.classification.importance === 'critical');

    const info = a(SAMPLES.informativo());
    check('2.11: informativo → risco "informational" baixo, explícito', info.risks.length === 1 && info.risks[0].type === 'informational' && info.risks[0].severity === 'low');
    const conf = a(mail('cf', 'Pagamento recebido', 'Recebemos seu pagamento. Obrigado!', { sender: { name: 'Loja', address: 'nao-responda@loja.com' } }));
    check('2.12: confirmação de pagamento não acionável → baixa, sem tarefa', conf.classification.importance === 'low' && !conf.candidates.some((c) => c.kind === 'task'));
    check('2.13: cada classificação explica o motivo (sem caixa-preta)', [tele, cont, fat, promo].every((x) => x.classification.reasons.length > 0));
  }

  // ===== Estados de leitura, rótulos, privacidade =====
  resetAll();
  {
    const read = analyzeEmail(mail('rd', 'Info', 'Só para saber.', { isRead: true, labels: ['INBOX'] }), { now: NOW });
    const unread = analyzeEmail(SAMPLES.telemedicina(), { now: NOW });
    check('3.1: lido/não lido vêm do provedor', read.readingStates.includes('read') && unread.readingStates.includes('unread'));
    check('3.2: importante e acionável derivados da análise', unread.readingStates.includes('important') && unread.readingStates.includes('actionable'));
    const archived = analyzeEmail(mail('ar', 'Velho', 'Coisa antiga', { labels: ['CATEGORY_UPDATES'], isRead: true, source: { provider: 'gmail', origin: 'real' } }), { now: NOW });
    check('3.3: Gmail sem rótulo INBOX → arquivado', archived.readingStates.includes('archived'));
    const done = analyzeEmail(SAMPLES.contabilidade(), { now: NOW, userStates: { cont: ['done'] } });
    check('3.4: estado do usuário (concluído) tira o "acionável"', done.readingStates.includes('done') && !done.readingStates.includes('actionable'));

    const body = 'Corpo longo e confidencial: senha do portal 1234, endereço completo, ' + 'x'.repeat(500) + ' Entregar o relatório até amanhã.';
    const withBody = analyzeEmail(mail('bd', 'Relatório', 'Veja abaixo'), { now: NOW, contents: [{ messageId: 'bd', text: body, retention: 'transient' }] });
    const serialized = JSON.stringify(withBody);
    check('3.5: corpo transitório é usado para extrair (prazo achado no corpo)…', withBody.extraction.deadline?.value.date === '2026-10-07' && withBody.extraction.deadline.evidence.field === 'body');
    check('3.6: …mas não fica guardado: só trechos curtos de evidência (≤ 80 caracteres)', !serialized.includes('senha do portal') && !serialized.includes('x'.repeat(100)) && withBody.audit.every((e) => !e.reason.includes('senha')));
    check('3.7: toda evidência tem no máximo 80 caracteres', [unread, withBody].every((x) => JSON.stringify(x).match(/"excerpt":"([^"]*)"/g)!.every((e) => e.length - 12 <= 80)));
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[email-understanding] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
