'use client';

/**
 * Sessão do Espiritual na UI. Tudo o que a pessoa escreve ou marca (propósito, práticas, plano de
 * leitura, reflexões, notas de estudo) fica num único documento local (`SpiritualUserData`) e o
 * repositório em memória é RECONSTRUÍDO a partir dele pelos casos de uso do domínio.
 * Como registrar não é uma decisão do Guardian (é entrada de dado), reconstruir não fabrica
 * nenhuma aprovação. Reflexões e notas são privadas: ficam só neste aparelho, sem criptografia —
 * consentimento formal e criptografia em repouso continuam pendentes no domínio.
 */

import {
  CANON_66,
  ReadingPlanEngine,
  SpiritualApi,
  StudyEngine,
  addItemToStudy,
  completeReadingEntry,
  concludeStudyUseCase,
  createInMemorySpiritualRepository,
  createPurpose,
  createReadingPlan,
  createReflection,
  definePractice,
  formatReference,
  recordPractice,
  resumeReadingPlan,
  saveNewStudy,
  SpiritualPrivacy,
  SpiritualAI,
} from '@/domains/spiritual';
import type {
  BibleReference,
  PracticeKind,
  ReadingPlan,
  SpiritualRepository,
} from '@/domains/spiritual';
import { buildAIContext } from '@/domains/spiritual/services/aiContext';
import type { SpiritualConsent } from '@/domains/spiritual/services/aiContext';
import { ensureDomains } from '../shared/runtime';
import { createUiStore, useUiStore } from '../shared/uiStore';

const KEY = 'medusa-espiritual-v1';

export type PlanKey = 'joao' | 'proverbios' | 'salmos' | 'nt';

export const PLAN_CATALOG: Record<PlanKey, { title: string; blurb: string; chapters: Array<{ book: string; chapter: number }> }> = {
  joao: { title: 'Evangelho de João', blurb: '21 capítulos, um por dia', chapters: chaptersOf(['JHN']) },
  proverbios: { title: 'Provérbios', blurb: '31 capítulos — um por dia do mês', chapters: chaptersOf(['PRO']) },
  salmos: { title: 'Salmos', blurb: '150 capítulos, no seu passo', chapters: chaptersOf(['PSA']) },
  nt: { title: 'Novo Testamento', blurb: '260 capítulos, de Mateus a Apocalipse', chapters: chaptersOf(CANON_66.slice(CANON_66.findIndex((b) => b.code === 'MAT')).map((b) => b.code)) },
};

function chaptersOf(codes: string[]): Array<{ book: string; chapter: number }> {
  return CANON_66.filter((b) => codes.includes(b.code)).flatMap((b) => Array.from({ length: b.chapters }, (_, i) => ({ book: b.code, chapter: i + 1 })));
}

export const PRACTICE_KINDS: Array<{ kind: PracticeKind; label: string; hint: string }> = [
  { kind: 'oracao', label: 'Oração', hint: 'conversar, agradecer, pedir' },
  { kind: 'leitura', label: 'Leitura', hint: 'ler com calma' },
  { kind: 'contemplacao', label: 'Contemplação', hint: 'parar e prestar atenção' },
  { kind: 'silencio', label: 'Silêncio', hint: 'sem falar, sem produzir' },
  { kind: 'estudo', label: 'Estudo', hint: 'entender uma passagem' },
];

interface PracticeData { id: string; kind: PracticeKind; intention: string; timesPerWeek: number; durationMinutes: number }
interface StudyNote { id: string; stage: 'observacao' | 'interpretacao' | 'aplicacao'; text: string; at: string }
interface StudyData { id: string; ref: BibleReference; notes: StudyNote[]; concluded?: { text: string; at: string } }

export interface SpiritualUserData {
  v: 1;
  purpose?: { label: string; description?: string; at: string };
  practices: PracticeData[];
  plan?: { key: PlanKey; startDate: string; startedAt: string; resumedOn?: string };
  readEntries: Array<{ entryId: string; at: string }>;
  completions: Array<{ id: string; definitionId: string; kind: PracticeKind; at: string; minutes: number }>;
  reflections: Array<{ id: string; content: string; at: string }>;
  studies: StudyData[];
  prayerHistory?: Array<{ date: string; prayed: boolean; at: string }>;
}

const EMPTY: SpiritualUserData = { v: 1, practices: [], readEntries: [], completions: [], reflections: [], studies: [] };

export const spiritualUi = createUiStore<{ version: number; consent: SpiritualConsent }>({
  version: 0,
  consent: { shareTradition: false, sharePractices: false, shareStudies: false, shareReadingPlan: false, shareGoals: false, sharePurposes: false },
});
export const useSpiritualState = () => useUiStore(spiritualUi);

let data: SpiritualUserData = EMPTY;
let repo: SpiritualRepository | undefined;
let loaded = false;

const day = (iso: string) => iso.slice(0, 10);
const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) data = { ...EMPTY, ...(JSON.parse(raw) as SpiritualUserData) };
  } catch {
    data = EMPTY;
  }
}

function persist(): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage restrito: vale nesta sessão
  }
}

export function planOf(d: SpiritualUserData = data): ReadingPlan | null {
  if (!d.plan) return null;
  const cat = PLAN_CATALOG[d.plan.key];
  return ReadingPlanEngine.planFromChapters({ id: 'plan_1', title: cat.title, chapters: cat.chapters, startDate: d.plan.startDate, purposeId: d.purpose ? 'purpose_1' : undefined, createdAt: d.plan.startedAt });
}

function rebuild(): SpiritualRepository {
  const r = createInMemorySpiritualRepository();
  const now = new Date();
  const today = day(now.toISOString());
  if (data.purpose) createPurpose(r, { id: 'purpose_1', label: data.purpose.label, description: data.purpose.description, themes: [], status: 'active', createdAt: data.purpose.at });
  for (const p of data.practices) {
    definePractice(r, { id: p.id, kind: p.kind, intention: p.intention, purposeId: data.purpose ? 'purpose_1' : undefined, frequency: { timesPerWeek: p.timesPerWeek }, durationMinutes: p.durationMinutes, status: 'active', priority: 'normal', createdAt: data.purpose?.at ?? now.toISOString() });
  }
  const plan = planOf();
  if (plan && data.plan) {
    createReadingPlan(r, plan, data.plan.startedAt);
    for (const e of data.readEntries) completeReadingEntry(r, { planId: plan.id, entryId: e.entryId, completedAt: e.at, today });
    if (data.plan.resumedOn) resumeReadingPlan(r, { planId: plan.id, today: data.plan.resumedOn });
  }
  for (const c of data.completions) {
    recordPractice(r, { id: c.id, type: c.kind, label: PRACTICE_KINDS.find((k) => k.kind === c.kind)?.label ?? c.kind, completedAt: c.at, durationMinutes: c.minutes, definitionId: c.definitionId }, c.at);
  }
  for (const f of data.reflections) {
    const at = f.at ?? (f as any).createdAt ?? new Date().toISOString();
    createReflection(r, { id: f.id, content: f.content, createdAt: at, visibility: 'private' });
  }
  for (const s of data.studies) {
    saveNewStudy(r, StudyEngine.startStudy({ id: s.id, reference: s.ref, purposeId: data.purpose ? 'purpose_1' : undefined, createdAt: s.notes[0]?.at ?? now.toISOString() }));
    for (const n of s.notes) addItemToStudy(r, s.id, { id: n.id, kind: 'user_reflection', origin: 'user', content: n.text, createdAt: n.at, private: true });
    if (s.concluded) concludeStudyUseCase(r, s.id, { conclusion: { id: `${s.id}_concl`, kind: 'conclusion', origin: 'user', content: s.concluded.text, createdAt: s.concluded.at, private: true }, concludedAt: s.concluded.at });
  }
  return r;
}

export function getSpiritualRepository(): SpiritualRepository {
  ensureDomains();
  load();
  if (!repo) repo = rebuild();
  return repo;
}

export function hasStarted(): boolean {
  load();
  return !!(data.purpose || data.practices.length || data.plan);
}

function commit(): void {
  persist();
  repo = rebuild();
  spiritualUi.set((s) => ({ version: s.version + 1 }));
}

export function getData(): SpiritualUserData {
  load();
  return data;
}

// ---- mutações (entrada de dado da própria pessoa) ----
export function setPurpose(label: string, description?: string): void {
  load();
  data = { ...data, purpose: { label: label.trim(), description: description?.trim() || undefined, at: data.purpose?.at ?? new Date().toISOString() } };
  commit();
}
export function addPractice(kind: PracticeKind, intention: string, timesPerWeek: number, durationMinutes: number): void {
  load();
  data = { ...data, practices: [...data.practices, { id: uid('prac'), kind, intention: intention.trim(), timesPerWeek, durationMinutes }] };
  commit();
}
export function choosePlan(key: PlanKey): void {
  load();
  const now = new Date();
  data = { ...data, plan: { key, startDate: day(now.toISOString()), startedAt: now.toISOString() }, readEntries: [] };
  commit();
}
export function markReading(entryId: string): void {
  load();
  if (data.readEntries.some((e) => e.entryId === entryId)) return;
  data = { ...data, readEntries: [...data.readEntries, { entryId, at: new Date().toISOString() }] };
  commit();
}
export function resumeReading(): void {
  load();
  if (!data.plan) return;
  data = { ...data, plan: { ...data.plan, resumedOn: day(new Date().toISOString()) } };
  commit();
}
export function completePractice(definitionId: string): void {
  load();
  const p = data.practices.find((x) => x.id === definitionId);
  if (!p) return;
  data = { ...data, completions: [...data.completions, { id: uid('done'), definitionId, kind: p.kind, at: new Date().toISOString(), minutes: p.durationMinutes }] };
  commit();
}
export function addReflection(content: string): void {
  load();
  if (!content.trim()) return;
  data = { ...data, reflections: [{ id: uid('refl'), content: content.trim(), at: new Date().toISOString() }, ...data.reflections] };
  commit();
}
export function ensureStudy(ref: BibleReference): StudyData {
  load();
  const key = formatReference(ref);
  const found = data.studies.find((s) => formatReference(s.ref) === key);
  if (found) return found;
  const created: StudyData = { id: uid('study'), ref, notes: [] };
  data = { ...data, studies: [...data.studies, created] };
  commit();
  return created;
}
export function addStudyNote(studyId: string, stage: StudyNote['stage'], text: string): void {
  load();
  if (!text.trim()) return;
  data = { ...data, studies: data.studies.map((s) => (s.id === studyId ? { ...s, notes: [...s.notes, { id: uid('note'), stage, text: text.trim(), at: new Date().toISOString() }] } : s)) };
  commit();
}
export function concludeStudy(studyId: string, text: string): void {
  load();
  if (!text.trim()) return;
  data = { ...data, studies: data.studies.map((s) => (s.id === studyId ? { ...s, concluded: { text: text.trim(), at: new Date().toISOString() } } : s)) };
  commit();
}
export function resetAll(): void {
  data = EMPTY;
  commit();
}

// ---- oração diária sem gamificação ----
export function hasPrayedToday(): boolean {
  load();
  const todayStr = day(new Date().toISOString());
  const entry = data.prayerHistory?.find((p) => p.date === todayStr);
  if (entry) return entry.prayed;
  return data.completions.some((c) => c.kind === 'oracao' && day(c.at) === todayStr);
}

export function setPrayedToday(prayed: boolean): void {
  load();
  const now = new Date();
  const todayStr = day(now.toISOString());
  const history = data.prayerHistory ? [...data.prayerHistory] : [];
  const idx = history.findIndex((p) => p.date === todayStr);
  if (idx >= 0) {
    history[idx] = { date: todayStr, prayed, at: now.toISOString() };
  } else {
    history.unshift({ date: todayStr, prayed, at: now.toISOString() });
  }
  data = { ...data, prayerHistory: history };
  if (prayed) {
    if (!data.completions.some((c) => c.kind === 'oracao' && day(c.at) === todayStr)) {
      data = {
        ...data,
        completions: [
          ...data.completions,
          { id: uid('prayer'), definitionId: 'prayer_daily', kind: 'oracao', at: now.toISOString(), minutes: 10 },
        ],
      };
    }
  }
  commit();
}

export function getPrayerLog(): Array<{ date: string; prayed: boolean; at: string }> {
  load();
  return data.prayerHistory ? [...data.prayerHistory] : [];
}

// ---- leitura para as telas ----
export function readReflection(id: string): string | undefined {
  const r = getSpiritualRepository();
  return SpiritualPrivacy.openPrivateContent(r, { scope: 'reflection', id, accessor: 'espiritual-ui', purpose: 'a própria pessoa relendo a reflexão', now: new Date() });
}

export function buildView() {
  const r = getSpiritualRepository();
  const now = new Date();
  const purposeC = SpiritualApi.getPurposeContinuities(r, now)[0];
  const readings = SpiritualApi.getReadingStates(r, now);
  const reading = readings[0];
  const plan = planOf();
  const practices = r.listPracticeDefinitions().filter((d) => d.status === 'active');
  const continuities = SpiritualApi.getPracticeContinuities(r, now);
  const today = SpiritualApi.getTodayView(r, now);
  const reflections = SpiritualApi.getReflectionsMetadata(r);
  const todayDay = day(now.toISOString());
  const doneToday = new Set(data.completions.filter((c) => day(c.at) === todayDay).map((c) => c.definitionId));
  return { data, purpose: data.purpose, purposeC, reading, plan, practices, continuities, today, reflections, doneToday };
}

/** Contexto que uma IA RECEBERIA, dado o consentimento atual — sem chamar nenhuma IA. */
export async function previewAIContext(consent: SpiritualConsent, intent: 'suggest_study_questions' | 'suggest_next_step') {
  const r = getSpiritualRepository();
  const now = new Date();
  const study = data.studies[data.studies.length - 1];
  const context = buildAIContext(r, { consent, focus: { planId: data.plan ? 'plan_1' : undefined, studyId: study?.id, definitionId: data.practices[0]?.id }, now, accessor: 'espiritual-ui' });
  const assistant = SpiritualAI.createTemplateAssistant();
  const response = await assistant.respond({ intent, context });
  SpiritualAI.validateAIResponse(response);
  return { context, response };
}
