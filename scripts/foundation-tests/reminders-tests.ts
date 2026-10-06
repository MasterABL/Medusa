/**
 * MEDUSA FOUNDATION — Proactive Reminders & Telemedicine Case Tests
 *
 * Validação rigorosa dos requisitos:
 * 1. Caso Telemedicina: Alta importância, T-5 principal, contextual
 * 2. Classificação de eventos por importância e contexto (sem hardcode único)
 * 3. ReminderPolicy extensível (T-5, T-15, etc.)
 * 4. Adapters reais: Dynamic Island, Web Notification e Alarme Nativo explicitamente BLOQUEADO
 * 5. Nenhuma feature ou sucesso falso simulado
 */

import {
  classifyEventImportance,
  resolvePolicyForEvent,
  evaluateEventForReminders,
  ReminderOrchestrator,
  NativeMobileAlarmAdapter,
  DynamicIslandAdapter,
  WebNotificationAdapter,
} from '../../src/foundation/reminders';
import type { AgendaItem } from '../../src/types/agenda';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`PASS: ${msg}`);
}

async function runTests() {
  console.log('=== TESTES DO PROACTIVE REMINDER ENGINE (CASO TELEMEDICINA & PERSONAL OS) ===\n');

  // 1. Caso Real Telemedicina
  const telemedicinaEvent: AgendaItem = {
    id: 'evt_telemed_01',
    title: 'Telemedicina com Dr. Ricardo (Cardiologista)',
    kind: 'event',
    domain: 'personal',
    categoryId: 'saude',
    colorId: 'emerald',
    date: '2026-10-05',
    startTime: '20:30',
    endTime: '21:00',
    durationMinutes: 30,
    source: { sourceType: 'manual' },
    status: 'scheduled',
    createdAt: '2026-10-05T00:00:00Z',
    updatedAt: '2026-10-05T00:00:00Z',
  };

  const teleClass = classifyEventImportance(telemedicinaEvent);
  assert(teleClass.importance === 'high', 'Telemedicina classificada como ALTA importância');
  assert(teleClass.category === 'telemedicine', 'Telemedicina classificada na categoria contextual "telemedicine"');

  const telePolicy = resolvePolicyForEvent(telemedicinaEvent);
  assert(telePolicy.triggerOffsetsMinutes.includes(5), 'Política de Telemedicina inclui T-5 minutos');
  assert(telePolicy.triggerOffsetsMinutes.includes(15), 'Política de Telemedicina inclui T-15 minutos');
  assert(telePolicy.allowedChannels.includes('dynamic_island'), 'Canal Dynamic Island permitido');
  assert(telePolicy.allowedChannels.includes('native_mobile_alarm'), 'Canal de alarme nativo contemplado na intenção');

  // 2. Avaliação de Gatilho T-5 para Telemedicina
  // Simular agora como 20:25 (exatos 5 minutos antes de 20:30)
  const nowTMinus5 = new Date('2026-10-05T20:25:00');
  const intents = evaluateEventForReminders(telemedicinaEvent, nowTMinus5, telePolicy);
  assert(intents.length >= 1, 'Intenção de lembrete gerada para T-5');
  const t5Intent = intents.find((i) => i.triggerOffsetMinutes === 5);
  assert(!!t5Intent, 'Intent T-5 encontrado');
  assert(t5Intent?.urgency === 'critical', 'Lembrete T-5 de telemedicina tem urgência crítica');
  assert(t5Intent?.actionLabel === 'Abrir compromisso', 'Ação contextual para abrir compromisso existe');
  assert(Boolean(t5Intent?.message.includes('5 min')), 'Mensagem expressa tempo restante exato');

  // 3. Classificação de outras categorias de eventos (sem hardcode isolado)
  const exameEvent: AgendaItem = {
    ...telemedicinaEvent,
    id: 'evt_02',
    title: 'Exame de sangue e ultrassom',
  };
  assert(classifyEventImportance(exameEvent).importance === 'high', 'Exame médico classificado como alto impacto');

  const provaEvent: AgendaItem = {
    ...telemedicinaEvent,
    id: 'evt_03',
    title: 'Prova de Certificação Cloud',
  };
  assert(classifyEventImportance(provaEvent).importance === 'high', 'Prova classificada como alto impacto');

  const treinoEvent: AgendaItem = {
    ...telemedicinaEvent,
    id: 'evt_04',
    title: 'Treino A - Peito e Tríceps',
    domain: 'body',
  };
  assert(classifyEventImportance(treinoEvent).importance === 'medium', 'Treino classificado como médio impacto');

  const oracaoEvent: AgendaItem = {
    ...telemedicinaEvent,
    id: 'evt_05',
    title: 'Momento de Oração e Devoção',
    domain: 'spiritual',
  };
  assert(classifyEventImportance(oracaoEvent).importance === 'medium', 'Prática espiritual classificada como médio impacto');

  const flexEvent: AgendaItem = {
    ...telemedicinaEvent,
    id: 'evt_06',
    title: 'Organizar gaveta',
    isFlexible: true,
  };
  assert(classifyEventImportance(flexEvent).importance === 'low', 'Bloco flexível classificado como baixo impacto');

  // 4. Teste de Adapters e Honestidade de Alarme Nativo
  const nativeAdapter = new NativeMobileAlarmAdapter();
  assert(nativeAdapter.getStatus() === 'BLOCKED', 'Alarme nativo de celular retorna status BLOCKED no ambiente Web');
  const nativeDelivery = await nativeAdapter.deliver(t5Intent!);
  assert(nativeDelivery.status === 'blocked', 'Entrega no alarme nativo é registrada como bloqueada');
  assert(
    Boolean(nativeDelivery.blockReason?.includes('BLOQUEADO')),
    'Motivo da limitação nativa está explicitamente documentado sem simulação falsa'
  );

  let islandDeliveredIntent: any = null;
  const islandAdapter = new DynamicIslandAdapter((intent) => {
    islandDeliveredIntent = intent;
  });
  assert(islandAdapter.getStatus() === 'AVAILABLE', 'Dynamic Island está disponível');
  const islandDelivery = await islandAdapter.deliver(t5Intent!);
  assert(islandDelivery.status === 'delivered', 'Dynamic Island entrega o lembrete com sucesso');
  assert(islandDeliveredIntent?.id === t5Intent?.id, 'Dynamic Island recebeu a intenção correta');

  // 5. Orquestrador, Cooldown e Acknowledgement
  const orchestrator = new ReminderOrchestrator();
  let islandUpdate: any = null;
  orchestrator.setIslandChangeHandler((item) => {
    islandUpdate = item;
  });

  const deliveries = await orchestrator.processAgendaItems([telemedicinaEvent], nowTMinus5);
  assert(deliveries.length > 0, 'Orquestrador processou itens da agenda');
  assert(islandUpdate?.eventId === telemedicinaEvent.id, 'Dynamic Island foi atualizada pelo orquestrador');
  assert(orchestrator.getActiveIslandReminder()?.eventId === telemedicinaEvent.id, 'Lembrete ativo no orquestrador');

  // Teste de Cooldown: processar novamente no mesmo minuto não deve re-disparar
  const repeatDeliveries = await orchestrator.processAgendaItems([telemedicinaEvent], nowTMinus5);
  assert(repeatDeliveries.length === 0, 'Deduplicação e cooldown evitaram spam de lembrete repetido');

  // Teste de Acknowledgement
  const ack = orchestrator.acknowledge(t5Intent!.id, 'opened');
  assert(ack.action === 'opened', 'Acknowledgement registrado com ação "opened"');
  orchestrator.dismissActiveIslandReminder('opened');
  assert(orchestrator.getActiveIslandReminder() === null, 'Lembrete dispensado da Dynamic Island após ação do usuário');

  console.log('\nTODOS OS 17 TESTES DO REMINDER ENGINE PASSARAM COM SUCESSO!\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
