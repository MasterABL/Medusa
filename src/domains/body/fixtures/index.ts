/**
 * MEDUSA — Body Domain — Fixtures (seção 37)
 *
 * FIXTURE / SYNTHETIC / TEST — nunca estado real de usuário.
 */

import type { BodyAnswer, DiagnosticSession } from '../model/types';

export const FIXTURE_TAG = 'fixture' as const;

export function createFixtureAnswers(nowISO = '2026-01-01T00:00:00.000Z'): BodyAnswer[] {
  return [
    { id: 'fixture_answer_1', questionId: 'q_objetivos', type: 'multi', value: ['saude_geral', 'disposicao'], answeredAt: nowISO, source: 'self_reported' },
    { id: 'fixture_answer_2', questionId: 'q_rotina_resumo', type: 'free_text', value: 'Trabalho período integral, estudo à noite (fixture).', answeredAt: nowISO, source: 'self_reported' },
    { id: 'fixture_answer_3', questionId: 'q_disponibilidade_janelas', type: 'multi', value: ['manha', 'noite'], answeredAt: nowISO, source: 'self_reported' },
    { id: 'fixture_answer_4', questionId: 'q_frequencia_semanal', type: 'scale', value: 3, answeredAt: nowISO, source: 'self_reported' },
    { id: 'fixture_answer_5', questionId: 'q_experiencia', type: 'single', value: 'iniciante', answeredAt: nowISO, source: 'self_reported' },
    { id: 'fixture_answer_6', questionId: 'q_local', type: 'single', value: 'casa', answeredAt: nowISO, source: 'self_reported' },
  ];
}

export function createFixtureDiagnosticSession(overrides: Partial<DiagnosticSession> = {}): DiagnosticSession {
  return {
    id: 'fixture_session_1',
    startedAt: '2026-01-01T00:00:00.000Z',
    answers: createFixtureAnswers(),
    status: 'in_progress',
    ...overrides,
  };
}
