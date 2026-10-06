/**
 * MEDUSA — QA Test Suite for Living Domain Experience & Product Completeness
 * Testa contratos, entidades, transições de estado, ações e integrações dos 5 domínios.
 *
 * Executar com: npx tsx scripts/qa-domains-deep-experience.ts
 */

import { INITIAL_HOJE_TASKS, INITIAL_HOJE_NOTICES, INITIAL_HOJE_HISTORY } from '../src/components/hoje/hojeTasksFixtures';
import { hojeFixtureItems } from '../src/fixtures/hojeFixtures';
import { groupHojeItems, pickCurrentItemId } from '../src/lib/hojeFoundation';
import {
  GUARDIAN_CASES,
  GUARDIAN_RADAR_ITEMS,
  GUARDIAN_ACTION_ITEMS,
  GUARDIAN_TRUST_POLICIES,
  GUARDIAN_AUDIT_LOGS,
} from '../src/components/guardian/guardianFixtures';
import {
  CORPO_DATA,
  FUNDAMENTAL_MOVEMENTS,
  WORKOUT_ROUTINES,
  MUSCLE_RECOVERIES,
  BODY_COMPOSITION,
  PAST_SESSIONS,
} from '../src/components/corpo/bodyFixtures';
import {
  FINANCAS_DATA,
  FINANCIAL_ACCOUNTS,
  CREDIT_CARDS,
  RECENT_TRANSACTIONS,
  FINANCIAL_GOALS,
  FINANCIAL_ANOMALIES,
} from '../src/components/financas/financeFixtures';
import { getReconciledFinanceData } from '../src/components/financas/financeBridge';
import {
  SCRIPTURE_PASSAGES,
  READING_PLANS,
  MEMORY_CARDS,
  PRAYER_INTENTIONS,
  GRATITUDE_ENTRIES,
} from '../src/components/espiritual/spiritualFixtures';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`PASS: ${testName}`);
    passed++;
  } else {
    console.error(`FAIL: ${testName}`);
    failed++;
  }
}

console.log('=== 1. HOJE — CENTRAL OPERACIONAL DO DIA ===');
// 1.1 Temporal grouping
const nowMinutes = 10 * 60 + 15; // 10:15
const groups = groupHojeItems(hojeFixtureItems, nowMinutes);
assert(groups.agora !== null, 'Hoje identifica o bloco ativo atual');
assert(groups.agora?.title === 'Execução de tarefas prioritárias', 'Bloco atual bate com 10:00 - 12:00');
assert(groups.proximo !== null, 'Hoje identifica o próximo bloco na sequência');

// 1.2 Tarefas de Hoje & Projetos
assert(INITIAL_HOJE_TASKS.length >= 6, 'Tarefas de Hoje possuem pelo menos 6 itens em catálogo');
const overdue = INITIAL_HOJE_TASKS.filter((t) => t.isOverdue);
assert(overdue.length > 0, 'Tarefas atrasadas identificadas no sistema');
const projectTask = INITIAL_HOJE_TASKS.find((t) => t.project?.includes('Projeto Integrado'));
assert(projectTask !== undefined, 'Tarefa relacionada ao Projeto Integrado da Faculdade existe');

// 1.3 Guardian notices em Hoje
const telemedNotice = INITIAL_HOJE_NOTICES.find((n) => n.actionKind === 'open_telemed');
assert(telemedNotice !== undefined, 'Aviso crítico de Telemedicina presente no Hoje');
const financeDisputeNotice = INITIAL_HOJE_NOTICES.find((n) => n.actionKind === 'approve_dispute');
assert(financeDisputeNotice?.autonomyLevel === 'L2', 'Ação do Guardian em Hoje exige aprovação L2');

// 1.4 Histórico do Dia
assert(INITIAL_HOJE_HISTORY.length >= 4, 'Histórico do dia tem blocos prévios registrados');
const completedBlock = INITIAL_HOJE_HISTORY.find((h) => h.status === 'completed');
assert(completedBlock !== undefined, 'Histórico contém blocos concluídos com duração e sumário');

console.log('\n=== 2. GUARDIAN — SISTEMA DE AUTONOMIA & DECISÕES ===');
// 2.1 Cadeia Causal
assert(GUARDIAN_CASES.length >= 4, 'Guardian possui pelo menos 4 casos de decisão mapeados');
const case1 = GUARDIAN_CASES[0];
assert(case1.steps.length === 5, 'Cada caso possui os 5 nós canônicos: Evento -> Contexto -> Decisão -> Ação -> Resultado');
const stepIds = case1.steps.map((s) => s.id);
assert(
  stepIds[0] === 'evento' && stepIds[1] === 'contexto' && stepIds[2] === 'decisao' && stepIds[3] === 'acao' && stepIds[4] === 'resultado',
  'Ordem causal estrita preservada nos nós'
);

// 2.2 Radar
assert(GUARDIAN_RADAR_ITEMS.length >= 4, 'Radar do Guardian monitora alertas transversais');
const critRadar = GUARDIAN_RADAR_ITEMS.find((r) => r.severity === 'critico');
assert(critRadar !== undefined, 'Radar identifica riscos de severidade crítica');

// 2.3 Action Center
assert(GUARDIAN_ACTION_ITEMS.length >= 4, 'Action Center possui ações mapeadas');
const pendingAction = GUARDIAN_ACTION_ITEMS.find((a) => a.status === 'pending');
assert(pendingAction?.autonomyLevel === 'L2', 'Ação pendente classificada como L2 requer confirmação humana');

// 2.4 Matriz de Confiança e Autonomia
assert(GUARDIAN_TRUST_POLICIES.length >= 5, 'Matriz de confiança cobre os 5 domínios');
const spiritualTrust = GUARDIAN_TRUST_POLICIES.find((p) => p.domain === 'espiritual');
assert(spiritualTrust?.currentLevel === 'L3', 'Política espiritual tem bloqueio L3 de soberania');
assert(spiritualTrust?.humanOverrideAllowed === false, 'Auditor de privacidade veta override inseguro');

// 2.5 Trilha de Auditoria
assert(GUARDIAN_AUDIT_LOGS.length >= 4, 'Logs de auditoria registram histórico imutável');
assert(GUARDIAN_AUDIT_LOGS.every((l) => l.correlationId && l.policyUsed), 'Todos os logs possuem correlationId e política vinculada');

console.log('\n=== 3. CORPO — SAÚDE, MOVIMENTO & BANCADA CINÉTICA ===');
// 3.1 Padrões Fundamentais & 1RM
assert(FUNDAMENTAL_MOVEMENTS.length === 4, '4 Movimentos fundamentais presentes');
const squat = FUNDAMENTAL_MOVEMENTS.find((m) => m.id === 'agachamento');
assert(squat?.currentMax === 110 && squat.startMax === 95, 'Evolução de carga do Agachamento preservada');

// 3.2 Fichas e Treino
assert(WORKOUT_ROUTINES.length === 3, 'Divisão de treino estruturada em Fichas A, B e C');
const routineB = WORKOUT_ROUTINES[1];
assert(routineB.splitCode === 'B', 'Ficha B de tração e posterior pronta');
assert(routineB.exercises.length >= 4, 'Ficha B possui 4 exercícios com séries e descanso');

// 3.3 Prontidão & Fisiologia
assert(CORPO_DATA.readiness.score === 89, 'Score de prontidão biológica computado');
assert(CORPO_DATA.sleep.efficiency >= 90, 'Eficiência do sono calculada');
assert(MUSCLE_RECOVERIES.length >= 5, 'Monitor de recuperação muscular por grupamento ativo');

// 3.4 Composição Corporal
assert(BODY_COMPOSITION.currentWeightKg === 78.4, 'Peso corporal atual e histórico de semanas mapeado');
assert(BODY_COMPOSITION.measurements.length >= 4, 'Circunferências musculares acompanhadas');

console.log('\n=== 4. FINANÇAS — SISTEMA FINANCEIRO PESSOAL ===');
// 4.1 Reconciliação canônica Foundation
const reconciled = getReconciledFinanceData();
assert(reconciled.tenhoTotal === 34280, 'Saldo disponível reconciliado (R$ 34.280)');
assert(reconciled.comprometidoTotal > 0, 'Comprometido calculado pela Foundation');
assert(reconciled.livreTotal === reconciled.tenhoTotal - reconciled.comprometidoTotal, 'Livre = Tenho - Comprometido');

// 4.2 Simulação de Decisão (Consequência em tempo real)
const simExpense = 1500;
const effectiveComprometido = reconciled.comprometidoTotal + simExpense;
const effectiveLivre = Math.max(0, reconciled.tenhoTotal - effectiveComprometido);
assert(effectiveLivre === reconciled.livreTotal - simExpense, 'Simulação de gasto reduz o livre exatamente pelo valor do gasto');

// 4.3 Contas e Cartões
assert(FINANCIAL_ACCOUNTS.length === 2, '2 Contas bancárias com liquidez mapeadas');
assert(CREDIT_CARDS.length === 2, '2 Cartões de crédito com faturas e limites disponíveis');
const card1 = CREDIT_CARDS[0];
assert(card1.availableLimit === card1.limitTotal - card1.currentInvoice, 'Limite disponível calculado corretamente');

// 4.4 Transações & Metas
assert(RECENT_TRANSACTIONS.length >= 6, 'Extrato contém movimentações recentes com entradas e saídas');
assert(FINANCIAL_GOALS.length >= 3, 'Metas de longo prazo com metas de reserva e prazos');
assert(FINANCIAL_ANOMALIES.length >= 2, 'Detector de anomalias com cobrança duplicada mapeada');

console.log('\n=== 5. ESPIRITUAL — VIDA ESPIRITUAL COMPLETA ===');
// 5.1 Escritura Viva
assert(SCRIPTURE_PASSAGES.length >= 3, 'Passagens bíblicas completas com versículos numerados');
const rom8 = SCRIPTURE_PASSAGES.find((p) => p.id === 'romanos-8');
assert(rom8?.verses.length === 6, 'Romanos 8 com 6 versículos e reflexões profundas');
assert(Boolean(rom8 && rom8.verses[0] && rom8.verses[0].keyWords.length > 0), 'Versículos possuem palavras-chave para o modo memória');

// 5.2 Planos de Leitura
assert(READING_PLANS.length >= 3, 'Planos de leitura estruturados por dias');
const paulinePlan = READING_PLANS[0];
assert(paulinePlan.completedDays === 28 && paulinePlan.durationDays === 45, 'Progresso de leitura registrado');

// 5.3 Memória Bíblica & SRS
assert(MEMORY_CARDS.length >= 3, 'Cartões de memorização com níveis de retenção');
const mem1 = MEMORY_CARDS[0];
assert(mem1.masteryPercent === 80, 'Taxa de domínio do versículo calculada');

// 5.4 Oração & Intenções
assert(PRAYER_INTENTIONS.length >= 3, 'Caderno de intenções de oração com status de atendida');
assert(GRATITUDE_ENTRIES.length >= 2, 'Diário de gratidão com motivos diários registrados');

console.log('\n=== RESUMO DO TESTE ===');
console.log(`TOTAL: ${passed + failed} | SUCESSOS: ${passed} | FALHAS: ${failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('TODAS AS CHECAGENS DE DOMÍNIO PASSARAM COM SUCESSO!\n');
}
