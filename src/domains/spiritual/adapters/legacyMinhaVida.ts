/**
 * MEDUSA — Spiritual — Adapter do MINHA-VIDA (espiritual_gratidao, revisoes de memorização)
 *
 * O que entra: gratidão (texto PRIVADO, mantido privado) e o agendamento de
 * revisão de versículos. O que NÃO entra, de propósito: XP por dia, sequência
 * e qualquer pontuação — o MINHA-VIDA gamificava continuidade; aqui isso
 * não existe (ver model/memory.ts). Um adapter que importasse esses campos
 * estaria reintroduzindo pontuação pela porta dos fundos.
 *
 * Memorização no legado usa a escada fixa [1,3,7,14,30] (`revisoes.intervalo_dias`),
 * não SM-2. O estado SM-2 é RECOMEÇADO do que dá pra saber com honestidade:
 * `ease` inicial, repetições = 0 e vencimento = `data_revisao` já agendada.
 * Fingir um histórico de facilidade que o legado nunca mediu seria inventar dado.
 */

import type { GratitudeEntry, ScriptureMemoryCard } from '../model/memory';
import type { BibleReference } from '../model/bible';
import { parseReference } from '../model/bible';
import { INITIAL_EASE } from '../services/memorySrs';

export interface LegacyGratidaoRow {
  id: number | string;
  data: string;
  texto: string;
  criado_em?: string;
}

export interface LegacyRevisaoRow {
  id: number | string;
  origem: string;
  /** "Salmos 23:1" / "PSA 23:1" — texto livre no legado. */
  topico: string;
  data_revisao: string;
  intervalo_dias: number;
  feita_em?: string | null;
}

export function mapGratitude(row: LegacyGratidaoRow): GratitudeEntry {
  return { id: `grat-${row.id}`, date: row.data.slice(0, 10), content: row.texto, createdAt: row.criado_em ?? `${row.data.slice(0, 10)}T00:00:00.000Z`, private: true };
}

const BOOK_ALIASES: Record<string, string> = { salmos: 'PSA', salmo: 'PSA', joao: 'JHN', joão: 'JHN', provérbios: 'PRO', proverbios: 'PRO', romanos: 'ROM', filipenses: 'PHP', mateus: 'MAT', isaias: 'ISA', isaías: 'ISA' };

/** Lê "Salmos 23:1" ou "PSA 23:1". Devolve undefined quando não dá pra ler — nunca chuta um livro. */
export function readLegacyReference(topico: string): BibleReference | undefined {
  const text = topico.trim();
  try {
    return parseReference(text);
  } catch {
    const m = /^([^\d]+?)\s+(\d+(?::\d+(?:-\d+)?)?)$/.exec(text);
    const code = m ? BOOK_ALIASES[m[1].trim().toLowerCase()] : undefined;
    if (!m || !code) return undefined;
    try {
      return parseReference(`${code} ${m[2]}`);
    } catch {
      return undefined;
    }
  }
}

export function mapMemoryCards(rows: LegacyRevisaoRow[]): { cards: ScriptureMemoryCard[]; skipped: Array<{ id: number | string; reason: string }> } {
  const skipped: Array<{ id: number | string; reason: string }> = [];
  const groups = new Map<string, { reference: BibleReference; rows: LegacyRevisaoRow[] }>();

  for (const r of rows) {
    if (!/memoriz|biblia_memoria|versic/i.test(r.origem)) {
      skipped.push({ id: r.id, reason: `origem "${r.origem}" não é de memorização.` });
      continue;
    }
    const reference = readLegacyReference(r.topico);
    if (!reference) {
      skipped.push({ id: r.id, reason: `referência ilegível: "${r.topico}".` });
      continue;
    }
    const key = `${reference.book}.${reference.chapter}.${reference.verseStart ?? 0}.${reference.verseEnd ?? 0}`;
    groups.set(key, { reference, rows: [...(groups.get(key)?.rows ?? []), r] });
  }

  // Um cartão por versículo. Vale o agendamento PENDENTE mais próximo; sem pendente, o mais recente.
  const cards = Array.from(groups.values()).map(({ reference, rows: rs }): ScriptureMemoryCard => {
    const pending = rs.filter((r) => !r.feita_em).sort((a, b) => a.data_revisao.localeCompare(b.data_revisao));
    const chosen = pending[0] ?? [...rs].sort((a, b) => b.data_revisao.localeCompare(a.data_revisao))[0];
    const due = chosen.data_revisao.slice(0, 10);
    return {
      id: `mem-${chosen.id}`,
      reference,
      addedAt: `${rs.map((r) => r.data_revisao.slice(0, 10)).sort()[0]}T00:00:00.000Z`,
      status: 'active',
      srs: { ease: INITIAL_EASE, intervalDays: chosen.intervalo_dias, repetitions: 0, lapses: 0, dueDate: due, lastReviewedAt: chosen.feita_em ?? undefined },
    };
  });
  return { cards, skipped };
}
