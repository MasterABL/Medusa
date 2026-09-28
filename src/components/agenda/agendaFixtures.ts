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

function computeWeekDays(ref: Date): Date[] {
  const d = new Date(ref);
  const dayOfWeek = d.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const next = new Date(d);
    next.setDate(d.getDate() + i);
    return next;
  });
}

/**
 * Gera as fixtures iniciais ancoradas na data atual do navegador e na semana canônica
 */
export function getInitialAgendaItems(referenceDate: Date = new Date()): AgendaItem[] {
  const weekDays = computeWeekDays(referenceDate);
  const daySeg = formatDateISO(weekDays[0]); // Segunda
  const dayTer = formatDateISO(weekDays[1]); // Terça
  const dayQua = formatDateISO(weekDays[2]); // Quarta
  const dayQui = formatDateISO(weekDays[3]); // Quinta
  const daySex = formatDateISO(weekDays[4]); // Sexta
  const daySab = formatDateISO(weekDays[5]); // Sábado
  const dayDom = formatDateISO(weekDays[6]); // Domingo

  const items: AgendaItem[] = [
    // 1. Estudo — Função Afim (Educação, time_block)
    {
      id: 'item-estudo-afim',
      title: 'Estudo — Função Afim',
      kind: 'time_block',
      domain: 'education',
      categoryId: 'cat-enem',
      colorId: 'amarelo_baunilha',
      date: daySeg,
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
      date: daySeg,
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

    // 3. Revisão — Inglês (Educação, time_block) - Evento Isolado de 30 min
    {
      id: 'item-revisao-ingles',
      title: 'Revisão — Inglês',
      kind: 'time_block',
      domain: 'education',
      categoryId: 'cat-ingles',
      colorId: 'azul_ceu',
      date: daySeg,
      startTime: '17:30',
      endTime: '18:00',
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

    // 4. Consulta Médica (Pessoal, event) - Evento Isolado de 1h
    {
      id: 'item-consulta-medica',
      title: 'Consulta Médica',
      kind: 'event',
      domain: 'personal',
      categoryId: 'cat-pessoal',
      colorId: 'pessego',
      date: daySeg,
      startTime: '18:30',
      endTime: '19:30',
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

    // 5. Rotina de Trabalho (Trabalho, routine) Qui-Sex 08:00-12:00
    {
      id: 'item-rotina-trabalho',
      title: 'Trabalho — Jornada Operacional',
      kind: 'routine',
      domain: 'work',
      categoryId: 'cat-trabalho',
      colorId: 'azul_nevoa',
      date: dayQui,
      startTime: '08:00',
      endTime: '12:00',
      durationMinutes: 240,
      allDay: false,
      isFlexible: false,
      recurrence: {
        frequency: 'weekly',
        daysOfWeek: [4, 5], // Quinta e Sexta
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
      date: daySeg,
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
      date: daySex,
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

    // 8. Evento All-Day canônico
    {
      id: 'item-allday-prova',
      title: 'Prova Regimental — Teoria Geral',
      kind: 'event',
      domain: 'education',
      categoryId: 'cat-faculdade',
      colorId: 'violeta_pastel',
      date: dayQua,
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

    // 9. Compromisso
    {
      id: 'item-alinhamento-arquit',
      title: 'Alinhamento Arquitetural Medusa',
      kind: 'event',
      domain: 'work',
      categoryId: 'cat-trabalho',
      colorId: 'azul_nevoa',
      date: dayTer,
      startTime: '17:30',
      endTime: '18:30',
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

    // 10. Compromisso
    {
      id: 'item-leitura-sintese',
      title: 'Sessão de Leitura & Síntese',
      kind: 'time_block',
      domain: 'education',
      categoryId: 'cat-enem',
      colorId: 'amarelo_baunilha',
      date: dayQui,
      startTime: '16:30',
      endTime: '17:30',
      durationMinutes: 60,
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

    // 11. Evento Longo de 3 Horas (Isolado na Terça-feira)
    {
      id: 'item-estudo-3h-enem',
      title: 'Estudo: Matemática (ENEM)',
      kind: 'time_block',
      domain: 'education',
      categoryId: 'cat-enem',
      colorId: 'amarelo_baunilha',
      date: dayTer,
      startTime: '13:00',
      endTime: '16:00',
      durationMinutes: 180,
      allDay: false,
      isFlexible: true,
      description: 'Bloco de aprofundamento em Geometria e Álgebra.',
      source: {
        sourceType: 'education_session',
        sourceLabel: 'Cronograma ENEM',
      },
      status: 'scheduled',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },

    // 12 e 13. Cluster de 2 Eventos Simultâneos na Terça-feira (11:00–12:00)
    {
      id: 'item-concorrente-2a',
      title: 'Mentoria de Redação e Argumentação ENEM',
      kind: 'event',
      domain: 'education',
      categoryId: 'cat-enem',
      colorId: 'coral_pastel',
      date: dayTer,
      startTime: '11:00',
      endTime: '12:00',
      durationMinutes: 60,
      allDay: false,
      description: 'Mentoria individual sobre tese e intervenção.',
      source: {
        sourceType: 'manual',
        sourceLabel: 'Entrada Manual',
      },
      status: 'scheduled',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
    {
      id: 'item-concorrente-2b',
      title: 'Treino',
      kind: 'event',
      domain: 'body',
      categoryId: 'cat-treino',
      colorId: 'sage',
      date: dayTer,
      startTime: '11:00',
      endTime: '12:00',
      durationMinutes: 60,
      allDay: false,
      description: 'Sessão rápida de mobilidade articular.',
      source: {
        sourceType: 'manual',
        sourceLabel: 'Entrada Manual',
      },
      status: 'scheduled',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },

    // 14, 15 e 16. Cluster de 3 Eventos Simultâneos na Quarta-feira (15:00–16:00)
    {
      id: 'item-concorrente-3a-longo',
      title: 'Seminário de Pesquisa Acadêmica e Extensão Universitária',
      kind: 'event',
      domain: 'education',
      categoryId: 'cat-faculdade',
      colorId: 'violeta_pastel',
      date: dayQua,
      startTime: '15:00',
      endTime: '16:00',
      durationMinutes: 60,
      allDay: false,
      description: 'Apresentação de artigos e painel interdisciplinar.',
      source: {
        sourceType: 'manual',
        sourceLabel: 'Entrada Manual',
      },
      status: 'scheduled',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
    {
      id: 'item-concorrente-3b-medio',
      title: 'Plantão de Dúvidas ENEM',
      kind: 'time_block',
      domain: 'education',
      categoryId: 'cat-enem',
      colorId: 'amarelo_baunilha',
      date: dayQua,
      startTime: '15:00',
      endTime: '16:00',
      durationMinutes: 60,
      allDay: false,
      description: 'Resolução ao vivo de questões complexas.',
      source: {
        sourceType: 'manual',
        sourceLabel: 'Entrada Manual',
      },
      status: 'scheduled',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
    {
      id: 'item-concorrente-3c-curto',
      title: 'Sync',
      kind: 'event',
      domain: 'work',
      categoryId: 'cat-trabalho',
      colorId: 'azul_nevoa',
      date: dayQua,
      startTime: '15:00',
      endTime: '16:00',
      durationMinutes: 60,
      allDay: false,
      description: 'Alinhamento rápido de 15 minutos.',
      source: {
        sourceType: 'manual',
        sourceLabel: 'Entrada Manual',
      },
      status: 'scheduled',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
  ];

  return items;
}
