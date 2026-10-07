/**
 * Provedor LOCAL de e-mail pelo runtime (o caminho que a aba E-mail usa via useEmailWorkspace).
 * Gmail/Outlook seguem BLOQUEADOS; o local é o único conectado e alimenta o MESMO pipeline.
 */
import { makeChecker } from '../domains/_helpers';
import { DAY, WED, session } from './harness';
import { parsePastedEmail, localEmailMessage } from '../../../src/domains/email/providers/local';
import { getAction } from '../../../src/foundation/actionBus';

const COLADO = `De: Clínica Vida <agenda@clinicavida.com.br>
Assunto: Consulta confirmada

Sua teleconsulta foi confirmada para amanhã às 18h com a Dra. Ana Souza.`;

export async function run(): Promise<{ total: number; fails: number }> {
  const { check, result } = makeChecker('email-local');

  // parser
  const p = parsePastedEmail(COLADO);
  check('EL.1: lê "De:" e "Assunto:" em português e separa o corpo', p.from.includes('agenda@clinicavida.com.br') && p.subject === 'Consulta confirmada' && p.body.startsWith('Sua teleconsulta'));
  const semCabecalho = parsePastedEmail('Reunião amanhã às 10h\nlink no convite');
  check('EL.2: sem cabeçalho, o assunto vem da 1ª linha e o remetente não é inventado', semCabecalho.subject === 'Reunião amanhã às 10h' && semCabecalho.from === '' && localEmailMessage(semCabecalho).sender.address === 'desconhecido@local');
  let vazio = false;
  try {
    localEmailMessage({ from: '', subject: ' ', body: ' ' });
  } catch {
    vazio = true;
  }
  check('EL.3: e-mail vazio é recusado (não cria mensagem fantasma)', vazio);
  const m = localEmailMessage(p);
  check('EL.4: origem "manual" e provedor "local" — nunca apresentado como Gmail nem como fixture', m.source.provider === 'local' && m.source.origin === 'manual');

  // runtime
  const s = await session({ at: `${DAY}T09:10:00` });
  const before = s.os.emailInbox();
  check('EL.5: sem mensagens, a caixa é "requer conexão" (Gmail bloqueado), não uma caixa vazia falsa', before.status === 'permission-required');
  const prov = s.os.providerStates();
  check('EL.6: Gmail e Outlook BLOQUEADOS; provedor local conectado', prov.gmail.status !== 'connected' && prov.outlook.status === 'permission-required' && prov.local_email.status === 'connected');

  const r = s.os.importLocalEmail(COLADO);
  check('EL.7: importar o e-mail colado gera proposta ao Guardian', !r.duplicate && r.proposals >= 1);
  const inbox = s.os.emailInbox();
  check('EL.8: a caixa passa a ter a conversa importada (dado real do usuário, não fixture)', inbox.status !== 'permission-required' && !(s.os.providerStates().local_email.isFixture ?? false));
  const again = s.os.importLocalEmail(COLADO);
  check('EL.9: importar o MESMO e-mail de novo não duplica mensagem nem proposta', again.duplicate && again.proposals === 0 && s.os.emailProposals().length === r.proposals);

  const prop = s.os.emailProposals().find((x) => /calendar_event$/.test(x.candidateId));
  check('EL.10: o compromisso fica AGUARDANDO APROVAÇÃO e não entra sozinho na Agenda', !!prop && getAction(prop.actionId)?.status === 'AWAITING_APPROVAL' && !s.agenda.some((i) => /email-event/.test(i.id)));
  const d = s.os.approve(prop!.actionId);
  const evento = s.agenda.find((i) => /email-event/.test(i.id));
  check('EL.11: aprovado → executado → compromisso gravado na Agenda amanhã às 18:00', d.state === 'executada' && !!evento && evento.date === WED && evento.startTime === '18:00');
  check('EL.12: lembretes do compromisso agendados sem duplicar', s.os.reminders(evento!.id).filter((x) => x.state === 'scheduled').length === 2);

  await s.os.flush();
  const s2 = await session({ storage: s.storage, at: `${DAY}T09:20:00`, agenda: s.agenda });
  check('EL.13: a mensagem importada sobrevive a recarregar a página', s2.os.emailInbox().status !== 'permission-required');
  const again2 = s2.os.importLocalEmail(COLADO);
  check('EL.14: depois de recarregar, reimportar continua sem duplicar', again2.duplicate && again2.proposals === 0);

  return result();
}
