/**
 * MEDUSA FOUNDATION — Adapters do MINHA-VIDA (tradução pura de linhas legadas)
 *
 * Prova que o conhecimento do produto histórico entra nos contratos do Medusa
 * sem arrastar layout, pontuação nem a semântica de autonomia invertida.
 */

import { makeChecker } from './_helpers';
import * as BodyLegacy from '../../../src/domains/body/adapters/legacyMinhaVida';
import * as FinLegacy from '../../../src/domains/finance/adapters/legacyMinhaVida';
import * as SpiLegacy from '../../../src/domains/spiritual/adapters/legacyMinhaVida';
import * as AgLegacy from '../../../src/domains/agenda/adapters/legacyMinhaVida';
import * as GuLegacy from '../../../src/foundation/guardianTrace/legacyMinhaVida';
import { createInMemoryBodyTrainingRepository } from '../../../src/domains/body/repository/trainingInMemory';
import * as BodySel from '../../../src/domains/body/selectors';
import { createInMemoryFinanceRepository } from '../../../src/domains/finance/repository/inMemory';
import * as FinSel from '../../../src/domains/finance/selectors';
import { buildDay } from '../../../src/domains/agenda/services/timeline';
import { computeFreeSlots } from '../../../src/domains/agenda/services/freeTime';
import { toHHmm } from '../../../src/domains/agenda/services/time';
import { progressionFor } from '../../../src/domains/body/services/progressionEngine';

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('legacy-adapters');

  // 1. Corpo
  {
    const sheets = BodyLegacy.mapSheets([
      { id: 12, treino: 'B', nome: 'Agachamento', series: 4, reps: '8 a 10', ordem: 1 },
      { id: 11, treino: 'B', nome: 'Leg press', series: 3, reps: 'FALHA', ordem: 0, wger_id: 99 },
      { id: 1, treino: 'A', nome: 'Supino', series: 3, reps: '10 a 12', ordem: 0 },
    ]);
    check('1.1: fichas A e B agrupadas e ordenadas', sheets.map((s) => s.label).join() === 'A,B');
    check('1.2: exercícios seguem a coluna `ordem`, não a ordem de chegada', sheets[1].exercises.map((e) => e.name).join() === 'Leg press,Agachamento');
    check('1.3: reps em texto livre preservadas ("FALHA" sem número inventado)', sheets[1].exercises[0].reps.raw === 'FALHA' && sheets[1].exercises[0].reps.min === undefined && sheets[1].exercises[1].reps.max === 10);
    check('1.4: vínculo com catálogo externo vira referência', sheets[1].exercises[0].catalogRef?.provider === 'wger' && sheets[1].exercises[0].catalogRef.id === '99');

    const loads = BodyLegacy.mapLoads([
      { exercicio_id: 1, carga_kg: '40.5', data: '2026-09-01' },
      { exercicio_id: 1, carga_kg: 45, data: '2026-09-08' },
      { exercicio_id: 1, carga_kg: 'lixo', data: '2026-09-09' },
    ]);
    check('1.5: carga corrompida é descartada (nunca vira 0 kg)', loads.length === 2);
    check('1.6: ids legados viram ids do Medusa consistentes entre ficha e carga', loads[0].exerciseId === sheets[0].exercises[0].id);
    const p = progressionFor(sheets[0].exercises[0].id, loads);
    check('1.7: progressão funciona sobre dados importados (40.5 → 45, subiu 4.5)', p.trend === 'subiu' && p.deltaKg === 4.5);

    const metrics = BodyLegacy.mapMetrics([
      { data: '2026-09-08', sono_horas: '7.5', passos: 6000, calorias: null, treino_tipo: 'A', treino_minutos: 50, origem: 'manual', criado_em: '2026-09-08T10:00:00Z' },
      { data: '2026-09-09', peso_kg: 80, origem: 'fitness_api' },
    ]);
    check('1.8: métricas: campos independentes, ausente fica ausente (não vira 0)', metrics[0].sleepHours === 7.5 && metrics[0].calories === undefined && metrics[1].sleepHours === undefined);
    check('1.9: origem fitness_api vira "imported"; manual continua manual', metrics[1].source === 'imported' && metrics[0].source === 'manual');
    check('1.10: nenhum campo de frequência cardíaca/HRV/sensor existe no contrato importado', !JSON.stringify(metrics).match(/heart|hrv|cardiac|frequencia/i));

    const repo = createInMemoryBodyTrainingRepository('real');
    sheets.forEach((s) => repo.saveSheet(s));
    loads.forEach((l) => repo.saveLoad(l));
    const view = BodySel.selectWorkoutView(repo, '2026-09-10T09:00:00Z', 'A');
    check('1.11: dado importado alimenta o mesmo seletor da tela (ready, origem real)', view.status === 'ready' && view.origin === 'real' && view.data.currentLoadKg === 45 && view.data.previousLoadKg === 40.5);
  }

  // 2. Finanças
  {
    const card = FinLegacy.mapAccount({ id: 3, nome: 'GOLD', tipo: 'cartao', saldo_atual: '9999.9', provider: 'pluggy', dia_fechamento: 5, dia_vencimento: 15 });
    check('2.1: cartão: tipo, ciclo e origem preservados', card.type === 'credit_card' && card.cardCycle?.closingDay === 5 && card.cardCycle.dueDay === 15 && card.dataSource === 'integration');
    check('2.2: conta manual sem provedor', FinLegacy.mapAccount({ id: 1, nome: 'Carteira', tipo: 'carteira', saldo_atual: 10 }).dataSource === 'manual');
    check('2.3: cartão sem ciclo no legado fica SEM ciclo (não se inventa fechamento)', FinLegacy.mapAccount({ id: 4, nome: 'X', tipo: 'cartao', saldo_atual: 0 }).cardCycle === undefined);
    check('2.4: tipo desconhecido vira "other", não quebra', FinLegacy.mapAccount({ id: 5, nome: 'Y', tipo: 'cripto', saldo_atual: 1 }).type === 'other');
    check('2.5: conta inativa preservada', FinLegacy.mapAccount({ id: 6, nome: 'Z', tipo: 'corrente', saldo_atual: 0, ativo: false }).active === false);

    const t1 = FinLegacy.mapTransaction({ id: 1, conta_bancaria_id: 3, descricao: 'Amazon Prime 4/12', valor: '-13.9', tipo: 'saida', data: '2026-09-02', provider_transaction_id: 'p-1', parcela_atual: 4, total_parcelas: 12, fatura_mes: '2026-09' });
    check('2.6: valor sempre positivo, sinal vem do tipo; parcelas e mês da fatura preservados', t1.amount === 13.9 && t1.type === 'expense' && t1.installment?.current === 4 && t1.invoiceMonth === '2026-09' && t1.externalId === 'p-1');
    check('2.7: compra à vista não ganha parcelamento; fatura_mes inválido é descartado', (() => { const t = FinLegacy.mapTransaction({ id: 2, conta_bancaria_id: 3, descricao: 'x', valor: 1, tipo: 'entrada', data: '2026-09-02', total_parcelas: 1, parcela_atual: 1, fatura_mes: 'set/26' }); return t.installment === undefined && t.invoiceMonth === undefined && t.type === 'income'; })());
    const bill = FinLegacy.mapFixedBill({ id: 9, nome: 'Aluguel', valor: '800', dia_vencimento: 10, ativo: true });
    check('2.8: conta fixa vira compromisso mensal', bill.frequency === 'monthly' && bill.dueDayOfMonth === 10 && bill.expectedAmount === 800 && bill.type === 'expense');

    // E2E: linhas legadas -> contratos -> snapshot. Saldo do cartão (dívida) NÃO entra no Tenho e NÃO é a fatura.
    const repo = createInMemoryFinanceRepository();
    repo.saveAccount(FinLegacy.mapAccount({ id: 1, nome: 'Inter', tipo: 'corrente', saldo_atual: 3000, provider: 'pluggy' }));
    repo.saveAccount(card);
    repo.saveTransaction(t1);
    repo.saveTransaction(FinLegacy.mapTransaction({ id: 7, conta_bancaria_id: 3, descricao: 'Mercado', valor: 100, tipo: 'saida', data: '2026-09-03', fatura_mes: '2026-09' }));
    repo.saveTransaction(FinLegacy.mapTransaction({ id: 8, conta_bancaria_id: 1, descricao: 'Mercado', valor: 50, tipo: 'saida', data: '2026-09-03' }));
    repo.saveRecurringCommitment(bill);
    const snap = FinSel.selectFinanceSnapshot(repo, '2026-09-10', { origin: 'real' });
    check('2.9: pipeline legado→snapshot: Tenho = só a conta corrente (3000), nunca a dívida do cartão (9999.9)', (snap.status === 'ready' || snap.status === 'partial') && snap.data.tenho.total === 3000);
    check('2.10: a fatura de setembro sai das transações (113.9), não do saldo de 9999.9', (snap.status === 'ready' || snap.status === 'partial') && snap.data.comprometido.parts.faturas === 113.9);
    check('2.11: conta fixa do legado entra no Comprometido', (snap.status === 'ready' || snap.status === 'partial') && snap.data.comprometido.parts.contasFixas === 800);
  }

  // 3. Espiritual
  {
    const g = SpiLegacy.mapGratitude({ id: 5, data: '2026-09-09', texto: 'Obrigado pelo dia' });
    check('3.1: gratidão importada continua privada', g.private === true && g.content === 'Obrigado pelo dia' && g.date === '2026-09-09');
    check('3.2: referência por extenso e por código', SpiLegacy.readLegacyReference('Salmos 23:1')?.book === 'PSA' && SpiLegacy.readLegacyReference('JHN 3:16')?.verseStart === 16);
    check('3.3: referência ilegível NÃO é chutada', SpiLegacy.readLegacyReference('meu versículo favorito') === undefined && SpiLegacy.readLegacyReference('Livro Inexistente 3:1') === undefined);

    const { cards, skipped } = SpiLegacy.mapMemoryCards([
      { id: 1, origem: 'biblia_memoria', topico: 'Salmos 23:1', data_revisao: '2026-09-15', intervalo_dias: 7, feita_em: null },
      { id: 2, origem: 'biblia_memoria', topico: 'Salmos 23:1', data_revisao: '2026-09-08', intervalo_dias: 3, feita_em: '2026-09-08T10:00:00Z' },
      { id: 3, origem: 'biblia_memoria', topico: 'João 3:16', data_revisao: '2026-09-11', intervalo_dias: 1, feita_em: null },
      { id: 4, origem: 'faculdade_nota', topico: 'Cálculo', data_revisao: '2026-09-11', intervalo_dias: 1, feita_em: null },
      { id: 5, origem: 'biblia_memoria', topico: '???', data_revisao: '2026-09-11', intervalo_dias: 1, feita_em: null },
    ]);
    check('3.4: um cartão por versículo; vale o agendamento PENDENTE', cards.length === 2 && cards.find((c) => c.reference.book === 'PSA')?.srs.dueDate === '2026-09-15');
    check('3.5: o que não é memorização ou não tem referência legível é pulado COM motivo', skipped.length === 2 && skipped.every((s) => s.reason.length > 10));
    check('3.6: SM-2 recomeça honesto: sem histórico de facilidade inventado', cards.every((c) => c.srs.ease === 2.5 && c.srs.repetitions === 0 && c.srs.lapses === 0));
    check('3.7: nada de XP/sequência/pontos no que foi importado', !JSON.stringify([g, ...cards]).match(/xp|streak|sequencia|pontos|points/i));
  }

  // 4. Agenda: rotina legada
  {
    const mapped = AgLegacy.mapRoutine([
      { id: 'acorda', horaInicio: '06:20', horaFim: null, titulo: 'Acordar', diasSemana: [1, 2, 3, 4, 5] },
      { id: 'sai', horaInicio: '07:05', horaFim: null, titulo: 'Sair de casa', diasSemana: [1, 2, 3, 4, 5] },
      { id: 'onibus', horaInicio: '07:20', horaFim: '07:50', titulo: 'Ônibus 030 → INAPEL (Toppan)', diasSemana: [1, 2, 3, 4, 5] },
      { id: 'trab', horaInicio: '08:00', horaFim: '15:00', titulo: 'Trabalho — fiscal/logística', diasSemana: [1, 2, 3, 4, 5] },
      { id: 'estudo', horaInicio: '18:00', horaFim: '21:00', titulo: 'Bloco de estudo (EAD/Inglês/Enem)', diasSemana: [1, 2, 3, 4, 5] },
      { id: 'misterio', horaInicio: '21:30', horaFim: '22:00', titulo: 'Coisa qualquer' },
    ]);
    check('4.1: marcos sem fim (acordar, sair) NÃO ocupam tempo', mapped.milestones.map((m) => m.id).join() === 'acorda,sai' && mapped.blocks.every((b) => b.id !== 'acorda'));
    check('4.2: ônibus vira deslocamento; trabalho vira work; estudo vira education', mapped.blocks.find((b) => b.id === 'onibus')?.kind === 'deslocamento' && mapped.blocks.find((b) => b.id === 'trab')?.domain === 'work' && mapped.blocks.find((b) => b.id === 'estudo')?.domain === 'education');
    check('4.3: texto não reconhecido é declarado, não classificado em silêncio', mapped.unclassified.join() === 'misterio');
    check('4.4: sem diasSemana => dias úteis (mesmo fallback do legado)', mapped.blocks.find((b) => b.id === 'misterio')?.daysOfWeek.join() === '1,2,3,4,5');

    const day = buildDay({ date: '2026-09-10', items: [], routine: mapped.blocks });
    const free = computeFreeSlots(day.entries).map((s) => `${toHHmm(s.startMin)}-${toHHmm(s.endMin)}`);
    check('4.5: a rotina real dele, numa quinta: o vão de 10 min entre ônibus e trabalho some; 21:00–21:30 (exatos 30 min) conta', free.join() === '06:00-07:20,15:00-18:00,21:00-21:30,22:00-23:00');
    check('4.6: fim de semana não tem rotina de trabalho', buildDay({ date: '2026-09-12', items: [], routine: mapped.blocks }).entries.length === 0);
  }

  // 5. Guardian: semântica de autonomia invertida
  {
    const auto = GuLegacy.mapExecution({ id: 'e1', decision_id: 'd1', agent_id: 'repriorizador', action_key: 'notificar_usuario', action_type: 'x', trigger_reason: 'auto_l3', status: 'succeeded', started_at: '2026-09-01T10:00:00Z', finished_at: '2026-09-01T10:00:02Z' });
    const human = GuLegacy.mapExecution({ id: 'e2', decision_id: 'd2', agent_id: 'a', action_key: 'k', action_type: 'x', trigger_reason: 'confirmacao_humana', status: 'failed', error: 'timeout', started_at: '2026-09-01T10:00:00Z' });
    check('5.1: "auto_l3" do legado (autonomia MÁXIMA) vira "rodou sem aprovação" = L1 do Medusa — não L3', 'ranWithoutApproval' in auto && auto.ranWithoutApproval && auto.autonomyLevel === 'L1');
    check('5.2: "confirmacao_humana" passou por aprovação => L2', 'ranWithoutApproval' in human && !human.ranWithoutApproval && human.autonomyLevel === 'L2');
    check('5.3: status e erro preservados', 'status' in auto && auto.status === 'SUCCESS' && 'status' in human && human.status === 'FAILED' && 'error' in human && human.error === 'timeout');
    check('5.4: nível numérico legado: 3 (roda sozinho) => L1; 1 e 2 (decisão humana) => L2', GuLegacy.legacyLevelToMedusa(3) === 'L1' && GuLegacy.legacyLevelToMedusa(1) === 'L2' && GuLegacy.legacyLevelToMedusa(2) === 'L2');
    check('5.5: nada é L3 na importação (L3 do Medusa = alto impacto, nunca vem de contagem legada)', !['L3'].includes(GuLegacy.legacyLevelToMedusa(1)) && !['L3'].includes(GuLegacy.legacyLevelToMedusa(3)));
    check('5.6: trigger/status desconhecidos são pulados com motivo (não adivinha se houve aprovação)', 'skipped' in GuLegacy.mapExecution({ id: 'x', decision_id: 'd', agent_id: 'a', action_key: 'k', action_type: 't', trigger_reason: 'magia', status: 'succeeded', started_at: 'x' }) && 'skipped' in GuLegacy.mapExecution({ id: 'x', decision_id: 'd', agent_id: 'a', action_key: 'k', action_type: 't', trigger_reason: 'auto_l3', status: 'cancelado', started_at: 'x' }));
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[legacy-adapters] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
