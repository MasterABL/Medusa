/**
 * MEDUSA — Spiritual — Contrato da IA contextual (futura)
 *
 * NÃO há LLM aqui. Este arquivo define (1) o que a IA pode RECEBER — um
 * contexto AUTORIZADO, montado por consentimento — e (2) o que deve DEVOLVER —
 * uma resposta estruturada que se declara não-autoridade. Reflexões, orações,
 * intenções e itens privados de estudo NÃO têm flag de consentimento: nunca
 * entram no contexto.
 */

import { validateReference } from '../model/bible';
import type { BibleReference } from '../model/bible';
import type { SpiritualRepository } from '../repository/types';
import { computeReadingState } from './readingPlanEngine';
import { practiceContinuity } from './practiceEngine';
import { collectPrivateItems } from './privacy';
import { leaksPrivateText } from '../../shared/privateText';
import { studyQuestionTemplates } from './studyEngine';
import { todayOf } from './dates';

export class PrivacyViolationError extends Error {}
export class AIContractError extends Error {}

export interface SpiritualConsent {
  shareTradition: boolean;
  sharePractices: boolean;
  shareStudies: boolean;
  shareReadingPlan: boolean;
  shareGoals: boolean;
  sharePurposes: boolean;
}

export interface SpiritualAIContext {
  scopes: string[];
  tradition?: { label: string; canon: string; language: string; preferredTranslationId?: string };
  currentPassage?: BibleReference;
  practice?: { kind: string; status: string; daysSince: number | null };
  readingPlan?: { title: string; position: string; status: string; nextReferences: BibleReference[] };
  study?: { reference: BibleReference; topic?: string; question?: string; scriptureReferences: BibleReference[]; itemKinds: string[] };
  purposes?: Array<{ label: string; themes: string[] }>;
  goals?: Array<{ label: string; progress: string }>;
}

export type SpiritualAIIntent = 'explain_passage' | 'suggest_study_questions' | 'suggest_next_step' | 'contextualize' | 'organize';

export interface SpiritualAIRequest {
  intent: SpiritualAIIntent;
  question?: string;
  context: SpiritualAIContext;
}

export interface SpiritualAIResponse {
  answer: string;
  references: BibleReference[];
  nextSteps: string[];
  studyQuestions: string[];
  suggestions: string[];
  disclosure: { source: 'ai' | 'template'; isNotSpiritualAuthority: true; traditionAware: boolean };
}

export interface SpiritualAssistant {
  readonly id: string;
  respond(request: SpiritualAIRequest): Promise<SpiritualAIResponse>;
}

export function buildAIContext(
  repo: SpiritualRepository,
  input: { consent: SpiritualConsent; profileId?: string; focus?: { studyId?: string; planId?: string; definitionId?: string }; now: Date; accessor?: string }
): SpiritualAIContext {
  const { consent, focus, now } = input;
  const today = todayOf(now);
  const ctx: SpiritualAIContext = { scopes: [] };

  if (consent.shareTradition) {
    const t = input.profileId ? repo.getProfile(input.profileId)?.tradition : undefined;
    if (t) ctx.tradition = { label: t.label, canon: t.canon, language: t.language, preferredTranslationId: t.preferredTranslationId };
    ctx.scopes.push('tradition');
  }
  if (consent.shareReadingPlan && focus?.planId) {
    const plan = repo.getReadingPlan(focus.planId);
    const progress = repo.getReadingProgress(focus.planId);
    if (plan && progress) {
      const st = computeReadingState(plan, progress, today);
      ctx.readingPlan = { title: plan.title, position: `${st.completedCount}/${st.total}`, status: st.status, nextReferences: st.upNext.flatMap((e) => e.references) };
      ctx.currentPassage = st.todayEntry?.references[0] ?? st.nextEntry?.references[0];
    }
    ctx.scopes.push('reading_plan');
  }
  if (consent.shareStudies && focus?.studyId) {
    const study = repo.getStudy(focus.studyId);
    if (study) {
      ctx.study = {
        reference: study.reference,
        topic: study.topic,
        question: study.question,
        scriptureReferences: study.items.filter((i) => i.kind === 'scripture_text' && i.reference).map((i) => i.reference!),
        itemKinds: Array.from(new Set(study.items.filter((i) => !i.private).map((i) => i.kind))),
      };
      ctx.currentPassage = study.reference;
    }
    ctx.scopes.push('study');
  }
  if (consent.sharePractices && focus?.definitionId) {
    const def = repo.getPracticeDefinition(focus.definitionId);
    if (def) {
      const c = practiceContinuity(def, repo.listPractices(), now);
      ctx.practice = { kind: def.kind, status: c.status, daysSince: c.daysSince };
    }
    ctx.scopes.push('practice');
  }
  if (consent.sharePurposes) {
    ctx.purposes = repo.listPurposes({ status: 'active' }).map((p) => ({ label: p.label, themes: p.themes }));
    ctx.scopes.push('purposes');
  }
  if (consent.shareGoals) {
    ctx.goals = repo.listGoals().map((g) => ({ label: g.label, progress: g.targetPracticeCount ? `${g.currentPracticeCount}/${g.targetPracticeCount}` : `${g.currentPracticeCount}` }));
    ctx.scopes.push('goals');
  }

  assertContextIsPrivacySafe(ctx, repo);
  repo.appendSensitiveAccess({ at: now.toISOString(), accessor: input.accessor ?? 'ai_context_builder', scope: 'ai_context', purpose: `contexto autorizado: ${ctx.scopes.join(', ') || 'nenhum escopo'}` });
  return ctx;
}

/** Última barreira: nenhum texto privado (reflexão, oração, intenção, item privado de estudo) pode estar no contexto. */
export function assertContextIsPrivacySafe(context: SpiritualAIContext, repo: SpiritualRepository): void {
  const serialized = JSON.stringify(context);
  for (const item of collectPrivateItems(repo)) {
    if (leaksPrivateText(item.content, serialized)) {
      throw new PrivacyViolationError(`Contexto de IA recusado: contém trecho do item privado "${item.id}" (${item.kind}).`);
    }
  }
}

const AUTHORITY_CLAIMS = [/\bassim diz o senhor\b/i, /\beu sou deus\b/i, /\bdeus (te )?diz\b/i, /\bfalo em nome de deus\b/i, /\beu, (teu|seu) deus\b/i];

export function validateAIResponse(response: SpiritualAIResponse): void {
  if (!response.disclosure || response.disclosure.isNotSpiritualAuthority !== true) throw new AIContractError('Resposta sem declaração de que não é autoridade espiritual.');
  if (!['ai', 'template'].includes(response.disclosure.source)) throw new AIContractError('disclosure.source inválido.');
  for (const ref of response.references) validateReference(ref, 'open');
  // Heurística de autoridade (não é moderação teológica): a IA não se apresenta como voz divina.
  for (const re of AUTHORITY_CLAIMS) {
    if (re.test(response.answer)) throw new AIContractError('Resposta se apresenta como voz divina/autoridade espiritual — recusada.');
  }
  // Heurística de citação: trecho longo entre aspas sem nenhuma referência pode ser "escritura" fabricada.
  if (/["“”][^"“”]{40,}["“”]/.test(response.answer) && response.references.length === 0) {
    throw new AIContractError('Citação longa sem referência bíblica — não é aceito texto com aparência de escritura sem fonte.');
  }
}

/** Assistente por TEMPLATE: determinístico, útil e honesto sobre não ser IA. */
export function createTemplateAssistant(): SpiritualAssistant {
  return {
    id: 'template-assistant',
    async respond(request) {
      const passage = request.context.currentPassage ?? request.context.study?.reference;
      const disclosure = { source: 'template' as const, isNotSpiritualAuthority: true as const, traditionAware: !!request.context.tradition };
      const traditionNote = request.context.tradition ? ` Considere como a tradição "${request.context.tradition.label}" costuma ler esta passagem.` : '';

      if (request.intent === 'suggest_study_questions' && passage) {
        return { answer: `Perguntas para conduzir o estudo.${traditionNote}`, references: [passage], nextSteps: [], studyQuestions: studyQuestionTemplates(passage).map((q) => q.question), suggestions: [], disclosure };
      }
      if (request.intent === 'suggest_next_step') {
        const steps: string[] = [];
        if (request.context.readingPlan?.nextReferences.length) steps.push('Continuar a leitura do plano no próximo trecho.');
        if (request.context.practice && request.context.practice.status !== 'em_ritmo') steps.push('Retomar a prática com um momento curto e simples.');
        if (request.context.study) steps.push('Registrar sua própria conclusão do estudo (fica só com você).');
        return { answer: steps.length ? 'Próximos passos possíveis, no seu ritmo.' : 'Não há contexto autorizado suficiente para sugerir um próximo passo.', references: request.context.readingPlan?.nextReferences ?? [], nextSteps: steps, studyQuestions: [], suggestions: [], disclosure };
      }
      return {
        answer: 'Este assistente por template não explica passagens: só organiza perguntas e próximos passos. Uma explicação exige a IA contextual (ainda não conectada).',
        references: passage ? [passage] : [],
        nextSteps: [],
        studyQuestions: [],
        suggestions: [],
        disclosure,
      };
    },
  };
}
