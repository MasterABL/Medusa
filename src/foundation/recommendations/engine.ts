/**
 * MEDUSA FOUNDATION — Recommendation Engine (regras determinísticas)
 *
 *   "Você tem 70 min livres. O projeto integrado precisa de 45 min." → forte
 *   "Você tem 20 min antes de sair." → revisão curta de inglês
 *
 * Considera: janelas livres REAIS (Agenda: deslocamento e buffer já fora),
 * prioridade calculada (nunca recomenda item bloqueado/dependente), esforço,
 * prazo, energia/contexto e práticas curtas disponíveis (rotina).
 * Sem IA generativa: cada recomendação traz os motivos estruturados.
 * Recomendação é SUGESTÃO — virar bloco na Agenda passa pelo Guardian (L2).
 */

import type { PriorityResult } from '../priority/engine';
import type { LifeDomain } from '../types/lifeDomain';
import { submitThroughGuardian } from '../actions/submit';
import type { SubmittedAction } from '../actions/submit';

export interface FreeWindow {
  /** ISO local. */
  startIso: string;
  endIso: string;
  minutes: number;
}

export interface ShortPractice {
  id: string;
  title: string;
  domain: LifeDomain;
  minutes: number;
  /** Ex.: revisão de inglês, flashcards, leitura do plano. */
  kind: 'revisao' | 'flashcards' | 'leitura' | 'pratica';
}

export type EnergyLevel = 'baixa' | 'media' | 'alta';
export type ContextTag = 'antes_de_sair' | 'pos_trabalho' | 'livre' | 'deslocamento';

export interface RecommendationInput {
  now: string;
  /** Janelas livres do resto do dia, em ordem. */
  freeWindows: FreeWindow[];
  ranked: PriorityResult[];
  practices?: ShortPractice[];
  energy?: EnergyLevel;
  contextTag?: ContextTag;
  /** Folga deixada no fim da janela (preparar, sair). */
  bufferMinutes?: number;
}

export type RecommendationStrength = 'forte' | 'moderada' | 'fraca';

export interface RecommendationReason {
  key: 'cabe_na_janela' | 'prioridade' | 'prazo' | 'energia' | 'contexto' | 'pratica_curta' | 'dividido';
  detail: string;
}

export interface Recommendation {
  id: string;
  kind: 'bloco_de_foco' | 'tarefa_curta' | 'pratica_curta';
  title: string;
  targetRef: { taskId?: string; projectId?: string; practiceId?: string; emailCandidateId?: string };
  durationMinutes: number;
  window: FreeWindow;
  /** Começa já (janela atual) ou mais tarde no dia. */
  timing: 'agora' | 'mais_tarde';
  strength: RecommendationStrength;
  reasons: RecommendationReason[];
}

const STRENGTH_ORDER: RecommendationStrength[] = ['forte', 'moderada', 'fraca'];
const downgrade = (s: RecommendationStrength): RecommendationStrength => STRENGTH_ORDER[Math.min(2, STRENGTH_ORDER.indexOf(s) + 1)];

export function recommend(input: RecommendationInput, limit = 3): Recommendation[] {
  const buffer = input.bufferMinutes ?? 5;
  const nowMs = Date.parse(input.now);
  const windows = input.freeWindows.filter((w) => Date.parse(w.endIso) > nowMs && w.minutes >= 10);
  const out: Recommendation[] = [];

  const usable = (w: FreeWindow) => {
    const startMs = Math.max(Date.parse(w.startIso), nowMs);
    // antes de sair, a folga de preparo é obrigatória (mínimo 5 min), mas não se soma ao buffer
    const reserve = input.contextTag === 'antes_de_sair' && startMs <= nowMs ? Math.max(buffer, 5) : buffer;
    const minutes = Math.floor((Date.parse(w.endIso) - startMs) / 60_000) - reserve;
    return { minutes, timing: (Date.parse(w.startIso) <= nowMs ? 'agora' : 'mais_tarde') as Recommendation['timing'] };
  };

  const tasks = input.ranked.filter((r) => r.candidate.kind === 'task' && r.band !== 'bloqueada' && r.candidate.estimatedMinutes !== undefined);
  const usedTasks = new Set<string>();

  for (const w of windows) {
    const u = usable(w);
    if (u.minutes < 10) continue;
    for (const r of tasks) {
      if (usedTasks.has(r.candidate.id)) continue;
      const est = r.candidate.estimatedMinutes!;
      const reasons: RecommendationReason[] = [];
      let duration = est;
      if (est > u.minutes) {
        // tarefa longa de prioridade alta pode avançar num bloco parcial (≥ 25 min); as outras esperam janela maior
        if ((r.band === 'maxima' || r.band === 'alta') && u.minutes >= 25) {
          duration = u.minutes;
          reasons.push({ key: 'dividido', detail: `${u.minutes} de ${est} min nesta janela` });
        } else continue;
      }
      let strength: RecommendationStrength = r.band === 'maxima' || r.band === 'alta' ? 'forte' : r.band === 'media' ? 'moderada' : 'fraca';
      reasons.push({ key: 'cabe_na_janela', detail: `${duration} min em ${u.minutes} min livres` });
      reasons.push({ key: 'prioridade', detail: `banda ${r.band} (score ${r.score})` });
      if (r.flags.includes('esforco_maior_que_tempo') || r.factors.find((f) => f.key === 'proximidade')!.value >= 0.7) reasons.push({ key: 'prazo', detail: r.factors.find((f) => f.key === 'proximidade')!.basis });
      if (input.energy === 'baixa' && duration > 30) {
        strength = downgrade(strength);
        reasons.push({ key: 'energia', detail: 'energia baixa: bloco longo vale menos agora' });
      }
      if (input.contextTag === 'antes_de_sair' && u.timing === 'agora') reasons.push({ key: 'contexto', detail: 'janela antes de sair: reservada folga de preparo' });
      out.push({
        id: `rec:${r.candidate.id}:${w.startIso}`,
        kind: duration >= 25 ? 'bloco_de_foco' : 'tarefa_curta',
        title: r.candidate.title,
        targetRef: { taskId: r.candidate.refs?.taskId, projectId: r.candidate.refs?.projectId, emailCandidateId: r.candidate.refs?.emailCandidateId },
        durationMinutes: duration,
        window: w,
        timing: u.timing,
        strength,
        reasons,
      });
      usedTasks.add(r.candidate.id);
      break; // uma recomendação por janela
    }
    // janela curta sem tarefa que caiba → prática curta (rotina)
    if (!out.some((o) => o.window === w) && input.practices) {
      const p = [...input.practices].filter((x) => x.minutes <= u.minutes).sort((a, b) => b.minutes - a.minutes)[0];
      if (p) {
        out.push({
          id: `rec:practice:${p.id}:${w.startIso}`,
          kind: 'pratica_curta',
          title: p.title,
          targetRef: { practiceId: p.id },
          durationMinutes: p.minutes,
          window: w,
          timing: u.timing,
          strength: 'moderada',
          reasons: [{ key: 'pratica_curta', detail: `${p.minutes} min cabem em ${u.minutes} min livres` }, ...(input.contextTag ? [{ key: 'contexto' as const, detail: input.contextTag }] : [])],
        });
      }
    }
  }

  return out
    .sort((a, b) => STRENGTH_ORDER.indexOf(a.strength) - STRENGTH_ORDER.indexOf(b.strength) || a.window.startIso.localeCompare(b.window.startIso))
    .slice(0, limit);
}

/** Transformar a recomendação em proposta: passa pelo Guardian como SUGGEST_FOCUS_BLOCK (L2: o usuário decide). */
export function proposeRecommendation(rec: Recommendation): SubmittedAction<{ recommendationId: string; window: FreeWindow; durationMinutes: number }> {
  return submitThroughGuardian({
    domain: 'agenda',
    type: 'SUGGEST_FOCUS_BLOCK',
    intent: `Reservar ${rec.durationMinutes} min para "${rec.title}"`,
    payload: { recommendationId: rec.id, window: rec.window, durationMinutes: rec.durationMinutes },
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Remover o bloco sugerido.',
    correlationId: `recommendation:${rec.id}`,
    signals: rec.reasons.slice(0, 4).map((r, i) => ({ kind: r.key, ref: `${rec.id}#${i}`, summary: r.detail.slice(0, 200) })),
  });
}
