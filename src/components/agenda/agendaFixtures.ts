/**
 * Medusa — Agenda Fixtures
 *
 * Conjunto canônico de dados iniciais para a Agenda.
 * Representa múltiplos domínios, tipos conceituais e origens sem duplicar dados reais.
 */

import { AgendaCategory, AgendaItem } from '@/types/agenda';

export const INITIAL_CATEGORIES: AgendaCategory[] = [
  {
    id: 'cat-faculdade',
    name: 'Faculdade',
    colorId: 'lavanda',
    domain: 'education',
    isCustom: false,
  },
  {
    id: 'cat-ingles',
    name: 'Inglês',
    colorId: 'azul_ceu',
    domain: 'education',
    isCustom: false,
  },
  {
    id: 'cat-enem',
    name: 'ENEM',
    colorId: 'amarelo_baunilha',
    domain: 'education',
    isCustom: false,
  },
  {
    id: 'cat-treino',
    name: 'Treino',
    colorId: 'sage',
    domain: 'body',
    isCustom: false,
  },
  {
    id: 'cat-trabalho',
    name: 'Trabalho',
    colorId: 'azul_nevoa',
    domain: 'work',
    isCustom: false,
  },
  {
    id: 'cat-pessoal',
    name: 'Pessoal',
    colorId: 'pessego',
    domain: 'personal',
    isCustom: false,
  },
  {
    id: 'cat-financas',
    name: 'Finanças',
    colorId: 'terracota_suave',
    domain: 'finance',
    isCustom: false,
  },
];

/**
 * Retorna a data no formato YYYY-MM-DD
 */
export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gera as fixtures iniciais ancoradas na data atual do navegador e na semana canônica
 */
export function getInitialAgendaItems(referenceDate: Date = new Date()): AgendaItem[] {
  const todayStr = formatDateISO(referenceDate);

  // Data canônica do prompt (Setembro 2026)
  const canonicalYear = 2026;
  const canonicalMonth = 8; // 0-indexed: Setembro
  const d21 = formatDateISO(new Date(canonicalYear, canonicalMonth, 21));
  const d22 = formatDateISO(new Date(canonicalYear, canonicalMonth, 22));
  const d23 = formatDateISO(new Date(canonicalYear, canonicalMonth, 23));
  const d24 = formatDateISO(new Date(canonicalYear, canonicalMonth, 24));
  const d25 = formatDateISO(new Date(canonicalYear, canonicalMonth, 25));
  const d28 = formatDateISO(new Date(canonicalYear, canonicalMonth, 28));

  const items: AgendaItem[] = [
    // 1. Estudo — Função Afim (Educação, time_block)
    {
      id: 'item-estudo-afim',
      title: 'Estudo — Função Afim',
      kind: 'time_block',
      domain: 'education',
      categoryId: 'cat-enem',
      colorId: 'amarelo_baunilha',
      date: todayStr,
      startTime: '09:00',
      endTime: '10:00',
      durationMinutes: 60,
      allDay: false,
      isFlexible: false,
      description: 'Resolução de listas e revisão dos gráficos lineares.',
      location: 'Mesa de Estudo',
      source: {
        sourceType: 'education_session',
        sourceId: 'session-afim-101',
        sourceLabel: 'Educação · Sessão de Aprendizado',
      },
      status: 'scheduled',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },

    // 2. Treino de Força (Corpo, event) — SOBREPÕE 30 MIN COM ESTUDO (09:30-10:30) PARA CONFLITO REAL
    {
      id: 'item-treino-forca',
      title: 'Treino de Força',
      kind: 'event',
      domain: 'body',
      categoryId: 'cat-treino',
      colorId: 'sage',
      date: todayStr,
      startTime: '09:30',
      endTime: '10:30',
      durationMinutes: 60,
      allDay: false,
      isFlexible: false,
      description: 'Treino de membros superiores com foco em hipertrofia.',
      location: 'Academia BioRitmo',
      source: {
        sourceType: 'workout',
        sourceId: 'workout-push-a',
        sourceLabel: 'Corpo · Treino de Força',
      },
      status: 'scheduled',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },

    // 3. Revisão — Inglês (Educação, time_block)
    {
      id: 'item-revisao-ingles',
      title: 'Revisão — Inglês',
      kind: 'time_block',
      domain: 'education',
      categoryId: 'cat-ingles',
      colorId: 'azul_ceu',
      date: todayStr,
      startTime: '14:00',
      endTime: '14:30',
      durationMinutes: 30,
      allDay: false,
      isFlexible: true,
      description: 'Spaced repetition flashcards de phrasal verbs.',
      source: {
        sourceType: 'review',
        sourceId: 'review-cards-en-34',
        sourceLabel: 'Educação · Revisão Espaçada',
      },
      status: 'scheduled',
      createdAt: '2026-09-02T10:00:00Z',
      updatedAt: '2026-09-02T10:00:00Z',
    },

    // 4. Consulta Médica (Pessoal, event)
    {
      id: 'item-consulta-medica',
      title: 'Consulta Médica',
      kind: 'event',
      domain: 'personal',
      categoryId: 'cat-pessoal',
      colorId: 'pessego',
      date: todayStr,
      startTime: '18:00',
      endTime: '19:00',
      durationMinutes: 60,
      allDay: false,
      isFlexible: false,
      description: 'Checkup anual de rotina e entrega de exames.',
      location: 'Consultório Dr. Marcelo — Sala 402',
      source: {
        sourceType: 'manual',
        sourceLabel: 'Entrada Manual',
      },
      status: 'scheduled',
      createdAt: '2026-09-03T11:00:00Z',
      updatedAt: '2026-09-03T11:00:00Z',
    },

    // 5. Rotina de Trabalho (Trabalho, routine) Seg-Qui 08:00-15:30
    {
      id: 'item-rotina-trabalho',
      title: 'Trabalho — Jornada Operacional',
      kind: 'routine',
      domain: 'work',
      categoryId: 'cat-trabalho',
      colorId: 'azul_nevoa',
      date: todayStr,
      startTime: '08:00',
      endTime: '15:30',
      durationMinutes: 450,
      allDay: false,
      isFlexible: false,
      recurrence: {
        frequency: 'weekly',
        daysOfWeek: [1, 2, 3, 4], // Segunda a Quinta
      },
      description: 'Desenvolvimento de features e suporte de engenharia.',
      location: 'Escritório Híbrido / Remoto',
      source: {
        sourceType: 'routine',
        sourceLabel: 'Rotina Recorrente',
      },
      status: 'scheduled',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },

    // 6. Deadline: Trabalho de Direito (Educação, deadline)
    {
      id: 'item-deadline-direito',
      title: 'Trabalho de Direito Constitucional',
      kind: 'deadline',
      domain: 'education',
      categoryId: 'cat-faculdade',
      colorId: 'lavanda',
      date: d28, // 28 de setembro
      allDay: true,
      description: 'Entrega do artigo sobre controle de constitucionalidade.',
      source: {
        sourceType: 'task',
        sourceId: 'task-direito-final',
        sourceLabel: 'Tarefas · Deadline Acadêmico',
      },
      status: 'scheduled',
      createdAt: '2026-09-05T09:00:00Z',
      updatedAt: '2026-09-05T09:00:00Z',
    },

    // 7. Obrigação Financeira: Vencimento — Internet (Finanças, deadline)
    {
      id: 'item-vencimento-internet',
      title: 'Vencimento — Internet Fibra',
      kind: 'deadline',
      domain: 'finance',
      categoryId: 'cat-financas',
      colorId: 'terracota_suave',
      date: d25, // 25 de setembro
      allDay: true,
      description: 'Fatura mensal de banda larga residencial.',
      source: {
        sourceType: 'finance_deadline',
        sourceId: 'fin-bill-net-2026-09',
        sourceLabel: 'Finanças · Vencimento',
      },
      status: 'scheduled',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },

    // 8. Evento All-Day canônico do dia 23 de Setembro
    {
      id: 'item-allday-prova',
      title: 'Prova Regimental — Teoria Geral',
      kind: 'event',
      domain: 'education',
      categoryId: 'cat-faculdade',
      colorId: 'violeta_pastel',
      date: d23,
      allDay: true,
      description: 'Avaliação presencial no campus universitário.',
      source: {
        sourceType: 'education_session',
        sourceLabel: 'Educação · Avaliação Oficial',
      },
      status: 'scheduled',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },

    // 9. Compromisso do dia 22 de Setembro
    {
      id: 'item-alinhamento-arquit',
      title: 'Alinhamento Arquitetural Medusa',
      kind: 'event',
      domain: 'work',
      categoryId: 'cat-trabalho',
      colorId: 'azul_nevoa',
      date: d22,
      startTime: '11:00',
      endTime: '12:00',
      durationMinutes: 60,
      allDay: false,
      description: 'Revisão do modelo de dados do Temporal OS.',
      location: 'Sala Virtual Medusa',
      source: {
        sourceType: 'manual',
        sourceLabel: 'Entrada Manual',
      },
      status: 'scheduled',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },

    // 10. Compromisso do dia 24 de Setembro
    {
      id: 'item-leitura-sintese',
      title: 'Sessão de Leitura & Síntese',
      kind: 'time_block',
      domain: 'education',
      categoryId: 'cat-enem',
      colorId: 'amarelo_baunilha',
      date: d24,
      startTime: '16:00',
      endTime: '17:30',
      durationMinutes: 90,
      allDay: false,
      isFlexible: true,
      description: 'Leitura de filosofia moderna e resumo esquemático.',
      source: {
        sourceType: 'education_session',
        sourceLabel: 'Educação · Sessão de Foco',
      },
      status: 'scheduled',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
  ];

  return items;
}
