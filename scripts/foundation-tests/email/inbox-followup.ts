/**
 * Filtros da caixa (query model), acompanhamento sem spam, busca global e trilha de auditoria.
 */
import { makeChecker, resetAll } from '../domains/_helpers';
import { at, mail, SAMPLES, thread } from './fixtures';
import { analyzeEmail, analyzeThread } from '../../../src/domains/email/services/pipeline';
import { selectEmailInbox, filterThreads, EMAIL_FILTERS } from '../../../src/domains/email/selectors';
import { detectFollowUps } from '../../../src/domains/email/services/followUp';
import { createEmailActionCenter, derivedTaskId } from '../../../src/domains/email/services/actions';
import { createRelationStore } from '../../../src/foundation/relations/graph';
import { createInMemoryTaskRepository } from '../../../src/domains/tasks/repository/types';
import { createInMemorySearchIndex } from '../../../src/foundation/search/types';
import { emailToSearchDocument, taskToSearchDocument, attachmentDocuments, eventToSearchDocument } from '../../../src/domains/email/search';
import { createAppendLog, createSnapshotPersistence } from '../../../src/foundation/persistence/snapshot';
import { createMemoryStorageAdapter } from '../../../src/foundation/persistence/storage';
import type { EmailAuditEntry } from '../../../src/domains/email/model/types';
import * as Lifecycle from '../../../src/foundation/guardianLifecycle';

const NOW = at('09:05');

export async function run(): Promise<{ total: number; fails: number }> {
  const { check, result } = makeChecker('email-inbox-followup');

  // ===== Filtros =====
  resetAll();
  {
    const sent = mail('s1', 'Orçamento', 'Você consegue me mandar o orçamento?', { direction: 'sent', sender: { address: 'eu@medusa.test' }, isRead: true, receivedAt: '2026-10-02T10:00:00' });
    const items = [
      analyzeThread(thread('t-tele', [SAMPLES.telemedicina()]), { now: NOW }),
      analyzeThread(thread('t-cont', [SAMPLES.contabilidade()]), { now: NOW }),
      analyzeThread(thread('t-fech', [SAMPLES.fechamento()]), { now: NOW }),
      analyzeThread(thread('t-fat', [SAMPLES.fatura()]), { now: NOW }),
      analyzeThread(thread('t-promo', [SAMPLES.promo()]), { now: NOW }),
      analyzeThread(thread('t-info', [mail('info', 'Atualização', 'Só um resumo.', { isRead: true })]), { now: NOW }),
      analyzeThread(thread('t-sent', [sent]), { now: NOW }),
    ];
    const ids = (f: Parameters<typeof filterThreads>[1]) => filterThreads(items, f).map((x) => x.thread.threadId).sort().join();
    check('1.1: os 11 filtros previstos existem', ['todos', 'nao_lidos', 'importantes', 'preciso_agir', 'aguardando_resposta', 'com_prazo', 'com_evento', 'financeiro', 'faculdade', 'trabalho', 'saude'].every((f) => EMAIL_FILTERS.some((d) => d.id === f)));
    check('1.2: Saúde = consulta', ids('saude') === 't-tele');
    check('1.3: Faculdade = Contabilidade', ids('faculdade') === 't-cont');
    check('1.4: Financeiro = fatura', ids('financeiro') === 't-fat');
    check('1.5: Trabalho inclui o fechamento (e não propaganda nem saúde)', ids('trabalho').includes('t-fech') && !ids('trabalho').includes('t-promo') && !ids('trabalho').includes('t-tele'));
    check('1.6: Com evento = consulta', ids('com_evento') === 't-tele');
    check('1.7: Com prazo = Contabilidade, fechamento, fatura', ids('com_prazo') === 't-cont,t-fat,t-fech');
    check('1.8: Aguardando resposta = a pergunta que eu enviei', ids('aguardando_resposta') === 't-sent');
    check('1.9: Preciso agir não inclui propaganda nem informativo', !ids('preciso_agir').includes('t-promo') && !ids('preciso_agir').includes('t-info'));
    const inbox = selectEmailInbox({ provider: 'gmail', status: 'connected' }, items, 'importantes', NOW);
    check('1.10: caixa ordenada por importância, cada linha diz POR QUÊ importa e quantas propostas tem', inbox.status === 'ready' && inbox.data.rows[0].thread.threadId === 't-tele' && inbox.data.rows[0].why.length > 0 && inbox.data.rows[0].candidateCount >= 1 && inbox.data.counts.saude === 1);
    check('1.11: sem Gmail conectado → "permissão necessária" (não caixa vazia)', selectEmailInbox({ provider: 'gmail', status: 'expired' }, items, 'todos', NOW).status === 'permission-required');
    check('1.12: conectado e sem e-mails → empty', selectEmailInbox({ provider: 'gmail', status: 'connected' }, [], 'todos', NOW).status === 'empty');
  }

  // ===== Acompanhamento sem spam =====
  resetAll();
  {
    const relations = createRelationStore();
    const tasks = createInMemoryTaskRepository();
    const center = createEmailActionCenter({ relations, tasks });
    const ped = mail('ped', 'Documento', 'Você pode me enviar o documento até amanhã?', { sender: { name: 'Ana', address: 'ana@gmail.com' } });
    const a = analyzeEmail(ped, { now: NOW });
    const p = center.propose(a, 'ped:task', NOW);
    Lifecycle.resolveApproval(p.evaluation.approvalRequest!.id, 'approve');
    center.apply(a, 'ped:task', NOW);
    const t = thread('th-ped', [ped]);
    const before = detectFollowUps([t], tasks.list(), relations, { now: at('20:00', '2026-10-07') });
    check('2.1: prazo ainda não passou → nenhum acompanhamento', before.candidates.length === 0);
    const late = detectFollowUps([t], tasks.list(), relations, { now: at('09:00', '2026-10-08') });
    check('2.2: prazo passou e a tarefa não foi feita → um candidato de acompanhamento (L2, só proposta)', late.candidates.length === 1 && late.candidates[0].reason === 'prazo_vencido_sem_conclusao' && late.candidates[0].guardianActionType === 'SUGGEST_FOLLOW_UP');
    const again = detectFollowUps([t], tasks.list(), relations, { now: at('15:00', '2026-10-08'), ledger: late.ledger });
    check('2.3: sem spam: rodar de novo dentro da janela não repete', again.candidates.length === 0);
    tasks.save({ ...tasks.get(derivedTaskId('ped'))!, status: 'done' });
    check('2.4: tarefa concluída → acompanhamento some', detectFollowUps([t], tasks.list(), relations, { now: at('09:00', '2026-10-12') }).candidates.length === 0);

    const sent = mail('s1', 'Orçamento', 'Você consegue me mandar o orçamento?', { direction: 'sent', sender: { address: 'eu@medusa.test' }, receivedAt: '2026-10-02T10:00:00', isRead: true });
    const ts = thread('th-s', [sent]);
    const w1 = detectFollowUps([ts], [], relations, { now: at('09:00', '2026-10-04') });
    const w2 = detectFollowUps([ts], [], relations, { now: at('11:00', '2026-10-05') });
    check('2.5: e-mail enviado sem resposta: antes de 3 dias nada; depois, sugerir cobrar', w1.candidates.length === 0 && w2.candidates.length === 1 && w2.candidates[0].reason === 'aguardando_resposta');
    let ledger = w2.ledger;
    let total = 1;
    for (const day of ['2026-10-09', '2026-10-13', '2026-10-17', '2026-10-21']) {
      const r = detectFollowUps([ts], [], relations, { now: at('11:00', day), ledger });
      total += r.candidates.length;
      ledger = r.ledger;
    }
    check('2.6: teto por conversa: no máximo 2 acompanhamentos, mesmo com semanas sem resposta', total === 2);
    const replied = thread('th-s2', [sent, mail('r1', 'Re: Orçamento', 'Segue o orçamento.', { receivedAt: '2026-10-03T10:00:00' })]);
    check('2.7: se responderam, não há o que cobrar', detectFollowUps([replied], [], relations, { now: at('11:00', '2026-10-09') }).candidates.length === 0);
  }

  // ===== Busca global =====
  resetAll();
  {
    const idx = createInMemorySearchIndex();
    const cont = SAMPLES.contabilidade();
    const withAtt = mail('att', 'Contrato', 'Segue o contrato assinado.', { attachments: [{ filename: 'contrato-locacao.pdf', mimeType: 'application/pdf' }] });
    idx.upsert([
      emailToSearchDocument(cont, analyzeEmail(cont, { now: NOW })),
      ...attachmentDocuments(withAtt),
      taskToSearchDocument({ id: 'email-task:cont', title: 'Entregar: Projeto de Contabilidade', priority: 'high', status: 'todo', domain: 'education', dependsOn: [], createdAt: NOW, updatedAt: NOW }),
      eventToSearchDocument({ id: 'e', source: { kind: 'internal' }, title: 'Consulta Dra. Ana', start: at('18:00', '2026-10-07'), status: 'confirmed' }),
    ]);
    const hits = idx.search('contabilidade');
    check('3.1: uma busca acha e-mail e tarefa relacionados (índice único, não um por domínio)', hits.some((h) => h.doc.ref.kind === 'email') && hits.some((h) => h.doc.ref.kind === 'task'));
    check('3.2: anexo é documento pesquisável pelo nome', idx.search('locacao').some((h) => h.doc.ref.kind === 'document'));
    check('3.3: filtro por tipo (só eventos)', idx.search('consulta', { kinds: ['event'] }).length === 1);
    check('3.4: prévia da busca é curta (nunca corpo inteiro)', hits.every((h) => (h.doc.preview ?? '').length <= 160));
  }

  // ===== Trilha de auditoria =====
  resetAll();
  {
    const audit: EmailAuditEntry[] = [];
    const center = createEmailActionCenter({ relations: createRelationStore(), tasks: createInMemoryTaskRepository(), audit });
    const a = analyzeEmail(SAMPLES.contabilidade(), { now: NOW });
    const p = center.propose(a, 'cont:task', NOW);
    Lifecycle.resolveApproval(p.evaluation.approvalRequest!.id, 'approve');
    center.apply(a, 'cont:task', NOW);
    const steps = [...a.audit, ...audit].map((e) => e.step);
    check('4.1: cada transformação deixa rastro: extração → classificação → risco → candidato → guardian → resultado', ['extracao', 'classificacao', 'risco', 'candidato', 'guardian', 'resultado'].every((s) => steps.includes(s as any)));
    const full = [...a.audit, ...audit];
    check('4.2: toda linha tem fonte, decisão e motivo; candidato/Guardian com confiança', full.every((e) => e.source && e.decision !== undefined && e.reason !== undefined) && full.filter((e) => e.step === 'candidato' && e.refs?.candidateId).every((e) => typeof e.confidence === 'number'));
    check('4.3: resultado diz que o usuário aceitou, qual ação e qual entidade nasceu', audit.some((e) => e.step === 'resultado' && e.outcome === 'aceito' && !!e.refs?.actionId && e.refs.entity?.kind === 'task'));
    const log = createAppendLog<EmailAuditEntry>(createSnapshotPersistence({ storage: createMemoryStorageAdapter(), key: 'email/audit', version: 1 }), 200);
    for (const e of full) await log.append(e, NOW);
    const stored = await log.list();
    check('4.4: a trilha cabe no mesmo log persistível do Personal OS', stored.status === 'ready' && stored.data.length === full.length);
  }

  return result();
}

if (require.main === module) {
  run().then(({ total, fails }) => {
    console.log(`\n[email-inbox-followup] ${total - fails}/${total} checagens OK`);
    process.exit(fails > 0 ? 1 : 0);
  });
}
