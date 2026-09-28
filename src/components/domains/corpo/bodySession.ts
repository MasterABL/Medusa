'use client';

/**
 * Sessão de Corpo na UI. Repositório em memória + persistência local do RESULTADO das decisões já
 * tomadas (perfil e plano serializados pela serialização do próprio domínio, mais as respostas).
 * Ao voltar, o resultado é restaurado direto no repositório — as aprovações do Guardian NÃO são
 * refeitas (isso fabricaria decisões humanas novas a cada visita).
 */

import {
  BODY_DIAGNOSTIC_QUESTIONS,
  BodyApi,
  createBodyPlan,
  createDiagnosticSession,
  answerDiagnosticQuestion,
  completeDiagnosticSession,
  createInMemoryBodyRepository,
  executeBodyAction,
  resumeBodyPlan,
  scheduleLightActivity,
  scheduleWorkout,
} from '@/domains/body';
import type { BodySession, BodyAnswer, BodyPlan, BodyProfile, BodyRepository, BodyDiagnosticQuestion } from '@/domains/body';
import * as BodySerialization from '@/domains/body/serialization';
import type { AgendaSchedulingRequest } from '@/domains/body/adapters/agendaAdapter';
import { getAction } from '@/foundation/actionBus';
import type { Action } from '@/foundation/types/action';
import { buildLightActivitySchedulingRequest, buildSessionSchedulingRequest } from '@/domains/body/adapters/agendaAdapter';
import { ensureDomains, approveAndRun, routeOf } from '../shared/runtime';
import type { DecisionRoute } from '../shared/runtime';
import { createUiStore, useUiStore } from '../shared/uiStore';
import { isoDay } from '../shared/format';

const STORE_KEY = 'medusa-corpo-v1';
export const PROFILE_ID = 'body_profile_1';
export const PLAN_ID = 'body_plan_1';

export const corpoUi = createUiStore<{ version: number; agendaRequests: AgendaSchedulingRequest[] }>({ version: 0, agendaRequests: [] });
export const useCorpoState = () => useUiStore(corpoUi);

let repo: BodyRepository | undefined;

export function getBodyRepository(): BodyRepository {
  ensureDomains();
  if (!repo) repo = createInMemoryBodyRepository();
  return repo;
}

export type AnswerMap = Record<string, string | string[] | number>;

interface Stored {
  answers: AnswerMap;
  profile: string;
  plan: string;
}

function bump() {
  corpoUi.set((s) => ({ version: s.version + 1 }));
}

/** Tenta restaurar uma configuração anterior. Devolve true se havia um plano ativo salvo. */
export function restoreBody(): boolean {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    const stored = JSON.parse(raw) as Stored;
    const r = getBodyRepository();
    const profile = BodySerialization.deserializeProfile(stored.profile);
    const plan = BodySerialization.deserializePlan(stored.plan);
    r.saveProfile(profile);
    r.savePlan(plan);
    bump();
    return plan.status === 'active';
  } catch {
    return false;
  }
}

export function loadStoredAnswers(): AnswerMap {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Stored).answers : {};
  } catch {
    return {};
  }
}

function persist(answers: AnswerMap, profile: BodyProfile, plan: BodyPlan) {
  try {
    const stored: Stored = { answers, profile: BodySerialization.serializeProfile(profile), plan: BodySerialization.serializePlan(plan) };
    window.localStorage.setItem(STORE_KEY, JSON.stringify(stored));
  } catch {
    // storage restrito: o plano vale nesta sessão e a introdução volta na próxima
  }
}

export const QUESTIONS_BY_SECTION: Array<{ section: string; questions: BodyDiagnosticQuestion[] }> = (() => {
  const order: string[] = [];
  for (const q of BODY_DIAGNOSTIC_QUESTIONS) if (!order.includes(q.section)) order.push(q.section);
  return order.map((section) => ({ section, questions: BODY_DIAGNOSTIC_QUESTIONS.filter((q) => q.section === section) }));
})();

export const SECTION_TITLE: Record<string, { title: string; hint: string }> = {
  objetivos: { title: 'O que você quer do movimento?', hint: 'Pode marcar mais de um.' },
  rotina: { title: 'Como é o seu dia hoje?', hint: 'Sem detalhes demais — o essencial.' },
  disponibilidade: { title: 'Onde o movimento cabe?', hint: 'O tempo real quem confirma é a sua Agenda.' },
  experiencia: { title: 'De onde você parte?', hint: 'Não existe nível certo, só um ponto de partida.' },
  habitos: { title: 'O que já faz parte do seu dia?', hint: 'Pequenos hábitos contam.' },
  sono_energia: { title: 'Como você tem se sentido?', hint: 'Só o que você percebe — isto não é avaliação de saúde.' },
  limitacoes: { title: 'Algo que devemos respeitar?', hint: 'Você relata, eu considero. Nada aqui é diagnóstico.' },
};

/** Roda a sessão de diagnóstico pelos casos de uso do domínio e devolve o perfil. */
export function buildProfile(answers: AnswerMap): BodyProfile {
  const r = getBodyRepository();
  const now = new Date().toISOString();
  const sessionId = `diag_${Date.now()}`;
  createDiagnosticSession(r, sessionId, now);
  for (const q of BODY_DIAGNOSTIC_QUESTIONS) {
    const value = answers[q.id];
    if (value === undefined) continue;
    const answer: BodyAnswer = { id: `${sessionId}_${q.id}`, questionId: q.id, type: q.type, value, answeredAt: now, source: 'self_reported' };
    answerDiagnosticQuestion(r, sessionId, answer);
  }
  const { profile } = completeDiagnosticSession(r, sessionId, PROFILE_ID, now);
  bump();
  return profile;
}

export interface PlanProposal {
  plan: BodyPlan;
  createActionId: string;
  createRoute: DecisionRoute;
  createReason: string;
}

/** Gera o plano candidato pelo motor do domínio; o Guardian decide se pede aprovação. */
export function proposePlan(profile: BodyProfile): PlanProposal {
  const r = getBodyRepository();
  const { evaluation, plan } = createBodyPlan(r, PLAN_ID, { profile, availableWindows: profile.availabilityWindows.value }, new Date().toISOString());
  return { plan, createActionId: evaluation.action.id, createRoute: routeOf(evaluation), createReason: evaluation.decision.reason };
}

export interface ActivationResult {
  steps: Array<{ intent: string; reason: string; ok: boolean; error?: string }>;
  plan?: BodyPlan;
}

/**
 * "Aceitar plano e ativar": um clique humano que resolve, na ordem, as duas decisões do Guardian
 * (criar o plano e ativá-lo). Cada uma percorre a máquina de estados real; se alguma falhar, para.
 * Ativar usa RESUME_BODY_PLAN — hoje o único caminho de ativação do contrato (não existe um ACTIVATE explícito).
 */
export function acceptAndActivate(proposal: PlanProposal, answers: AnswerMap, profile: BodyProfile): ActivationResult {
  const r = getBodyRepository();
  const steps: ActivationResult['steps'] = [];
  try {
    if (proposal.createRoute === 'aguardando_aprovacao') {
      approveAndRun(proposal.createActionId, () => {
        const action = getActionOrThrow(proposal.createActionId);
        executeBodyAction(r, action);
      });
    }
    steps.push({ intent: 'Criar o plano', reason: proposal.createReason, ok: true });

    const activation = resumeBodyPlan(r, PLAN_ID);
    if (activation.decision.requiresApproval) {
      approveAndRun(activation.action.id, () => executeBodyAction(r, activation.action));
    }
    steps.push({ intent: 'Ativar o plano', reason: activation.decision.reason, ok: true });

    const plan = r.getPlan(PLAN_ID)!;
    persist(answers, profile, plan);
    bump();
    return { steps, plan };
  } catch (error) {
    steps.push({ intent: 'Concluir ativação', reason: '', ok: false, error: error instanceof Error ? error.message : 'falha desconhecida' });
    return { steps };
  }
}

function getActionOrThrow(id: string): Action {
  const action = getAction(id);
  if (!action) throw new Error(`Ação "${id}" não encontrada.`);
  return action;
}

export interface AgendaOutcome {
  route: DecisionRoute;
  actionId: string;
  reason: string;
  request?: AgendaSchedulingRequest;
}

export function proposeSessionToAgenda(date: string): AgendaOutcome {
  const r = getBodyRepository();
  const plan = r.getPlan(PLAN_ID);
  if (!plan || plan.sessions.length === 0) throw new Error('Não há sessão no plano para propor.');
  const result = scheduleWorkout(r, PLAN_ID, plan.sessions[0].id, date);
  if (result.schedulingRequest) rememberRequest(result.schedulingRequest);
  bump();
  return { route: routeOf(result.evaluation), actionId: result.evaluation.action.id, reason: result.evaluation.decision.reason, request: result.schedulingRequest };
}

export function proposeLightActivity(date: string, reason: string): AgendaOutcome {
  const result = scheduleLightActivity('act_mobilidade_geral', date, 15, reason);
  if (result.schedulingRequest) rememberRequest(result.schedulingRequest);
  bump();
  return { route: routeOf(result.evaluation), actionId: result.evaluation.action.id, reason: result.evaluation.decision.reason, request: result.schedulingRequest };
}

function rememberRequest(req: AgendaSchedulingRequest) {
  corpoUi.set((s) => ({ agendaRequests: [req, ...s.agendaRequests].slice(0, 5) }));
}

/**
 * Executor pós-aprovação: agendar NÃO altera o domínio (quem cria o item é a Agenda), então o efeito
 * é registrar o pedido pronto para a Agenda, que é exatamente o que o caso de uso devolveria sem pendência.
 */
export function executeApprovedBodyAction(action: Action): void {
  const r = getBodyRepository();
  executeBodyAction(r, action);
  const plan = r.getPlan(PLAN_ID);
  if (action.type === 'SCHEDULE_WORKOUT' && plan) {
    const p = action.payload as { sessionId: string; proposedDate: string };
    const session = plan.sessions.find((s) => s.id === p.sessionId);
    if (session) rememberRequest(buildRequest(plan.id, session, p.proposedDate));
  }
  if (action.type === 'SCHEDULE_LIGHT_ACTIVITY') {
    const p = action.payload as { activityId: string; proposedDate: string; durationMinutes: number; reason: string };
    rememberRequest(buildLight(p));
  }
  bump();
}

const buildRequest = (planId: string, session: BodySession, date: string) => buildSessionSchedulingRequest(planId, session, date);
const buildLight = (p: { activityId: string; proposedDate: string; durationMinutes: number; reason: string }) => buildLightActivitySchedulingRequest(p.activityId, p.proposedDate, p.durationMinutes, p.reason);

export function todayISO(): string {
  return isoDay(new Date());
}

export { BodyApi };
