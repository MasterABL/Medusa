/**
 * MEDUSA — Spiritual — Referência bíblica
 *
 * Só REFERÊNCIA e estrutura do cânone — nenhum texto bíblico mora aqui (texto
 * vem de um `BibleTextProvider`). O cânone padrão é o de 66 livros; tradições
 * com outro cânone usam `canon: 'open'` (aceita livros fora da lista, exige
 * capítulo ≥ 1) em vez de o domínio decidir por elas.
 */

export interface BibleReference {
  /** Código do livro (estilo USFM: GEN, PSA, JHN...). */
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

export type Canon = 'standard66' | 'open';

export class BibleValidationError extends Error {}

/** Livros na ordem do cânone com nº de capítulos (soma = 1189). */
export const CANON_66: Array<{ code: string; chapters: number; name: string }> = [
  { code: 'GEN', chapters: 50, name: 'Gênesis' }, { code: 'EXO', chapters: 40, name: 'Êxodo' }, { code: 'LEV', chapters: 27, name: 'Levítico' },
  { code: 'NUM', chapters: 36, name: 'Números' }, { code: 'DEU', chapters: 34, name: 'Deuteronômio' }, { code: 'JOS', chapters: 24, name: 'Josué' },
  { code: 'JDG', chapters: 21, name: 'Juízes' }, { code: 'RUT', chapters: 4, name: 'Rute' }, { code: '1SA', chapters: 31, name: '1 Samuel' },
  { code: '2SA', chapters: 24, name: '2 Samuel' }, { code: '1KI', chapters: 22, name: '1 Reis' }, { code: '2KI', chapters: 25, name: '2 Reis' },
  { code: '1CH', chapters: 29, name: '1 Crônicas' }, { code: '2CH', chapters: 36, name: '2 Crônicas' }, { code: 'EZR', chapters: 10, name: 'Esdras' },
  { code: 'NEH', chapters: 13, name: 'Neemias' }, { code: 'EST', chapters: 10, name: 'Ester' }, { code: 'JOB', chapters: 42, name: 'Jó' },
  { code: 'PSA', chapters: 150, name: 'Salmos' }, { code: 'PRO', chapters: 31, name: 'Provérbios' }, { code: 'ECC', chapters: 12, name: 'Eclesiastes' },
  { code: 'SNG', chapters: 8, name: 'Cantares' }, { code: 'ISA', chapters: 66, name: 'Isaías' }, { code: 'JER', chapters: 52, name: 'Jeremias' },
  { code: 'LAM', chapters: 5, name: 'Lamentações' }, { code: 'EZK', chapters: 48, name: 'Ezequiel' }, { code: 'DAN', chapters: 12, name: 'Daniel' },
  { code: 'HOS', chapters: 14, name: 'Oseias' }, { code: 'JOL', chapters: 3, name: 'Joel' }, { code: 'AMO', chapters: 9, name: 'Amós' },
  { code: 'OBA', chapters: 1, name: 'Obadias' }, { code: 'JON', chapters: 4, name: 'Jonas' }, { code: 'MIC', chapters: 7, name: 'Miqueias' },
  { code: 'NAM', chapters: 3, name: 'Naum' }, { code: 'HAB', chapters: 3, name: 'Habacuque' }, { code: 'ZEP', chapters: 3, name: 'Sofonias' },
  { code: 'HAG', chapters: 2, name: 'Ageu' }, { code: 'ZEC', chapters: 14, name: 'Zacarias' }, { code: 'MAL', chapters: 4, name: 'Malaquias' },
  { code: 'MAT', chapters: 28, name: 'Mateus' }, { code: 'MRK', chapters: 16, name: 'Marcos' }, { code: 'LUK', chapters: 24, name: 'Lucas' },
  { code: 'JHN', chapters: 21, name: 'João' }, { code: 'ACT', chapters: 28, name: 'Atos' }, { code: 'ROM', chapters: 16, name: 'Romanos' },
  { code: '1CO', chapters: 16, name: '1 Coríntios' }, { code: '2CO', chapters: 13, name: '2 Coríntios' }, { code: 'GAL', chapters: 6, name: 'Gálatas' },
  { code: 'EPH', chapters: 6, name: 'Efésios' }, { code: 'PHP', chapters: 4, name: 'Filipenses' }, { code: 'COL', chapters: 4, name: 'Colossenses' },
  { code: '1TH', chapters: 5, name: '1 Tessalonicenses' }, { code: '2TH', chapters: 3, name: '2 Tessalonicenses' }, { code: '1TI', chapters: 6, name: '1 Timóteo' },
  { code: '2TI', chapters: 4, name: '2 Timóteo' }, { code: 'TIT', chapters: 3, name: 'Tito' }, { code: 'PHM', chapters: 1, name: 'Filemom' },
  { code: 'HEB', chapters: 13, name: 'Hebreus' }, { code: 'JAS', chapters: 5, name: 'Tiago' }, { code: '1PE', chapters: 5, name: '1 Pedro' },
  { code: '2PE', chapters: 3, name: '2 Pedro' }, { code: '1JN', chapters: 5, name: '1 João' }, { code: '2JN', chapters: 1, name: '2 João' },
  { code: '3JN', chapters: 1, name: '3 João' }, { code: 'JUD', chapters: 1, name: 'Judas' }, { code: 'REV', chapters: 22, name: 'Apocalipse' },
];

const INDEX = new Map(CANON_66.map((b, i) => [b.code, i]));

export function validateReference(ref: BibleReference, canon: Canon = 'standard66'): void {
  if (!ref.book?.trim()) throw new BibleValidationError('Referência sem livro.');
  if (!Number.isInteger(ref.chapter) || ref.chapter < 1) throw new BibleValidationError(`Capítulo inválido: ${ref.chapter}.`);
  const entry = CANON_66[INDEX.get(ref.book) ?? -1];
  if (!entry && canon === 'standard66') throw new BibleValidationError(`Livro "${ref.book}" não pertence ao cânone de 66 livros (use canon "open" para outras tradições).`);
  if (entry && ref.chapter > entry.chapters) throw new BibleValidationError(`${entry.name} tem ${entry.chapters} capítulos; recebeu ${ref.chapter}.`);
  if (ref.verseStart !== undefined && (!Number.isInteger(ref.verseStart) || ref.verseStart < 1)) throw new BibleValidationError(`Versículo inicial inválido: ${ref.verseStart}.`);
  if (ref.verseEnd !== undefined) {
    if (ref.verseStart === undefined) throw new BibleValidationError('verseEnd exige verseStart.');
    if (ref.verseEnd < ref.verseStart) throw new BibleValidationError(`Versículo final (${ref.verseEnd}) antes do inicial (${ref.verseStart}).`);
  }
}

export function formatReference(ref: BibleReference, opts: { names?: boolean } = {}): string {
  const entry = CANON_66[INDEX.get(ref.book) ?? -1];
  const book = opts.names && entry ? entry.name : ref.book;
  let out = `${book} ${ref.chapter}`;
  if (ref.verseStart !== undefined) out += `:${ref.verseStart}${ref.verseEnd !== undefined && ref.verseEnd !== ref.verseStart ? `-${ref.verseEnd}` : ''}`;
  return out;
}

/** "JHN 3", "JHN 3:16", "JHN 3:16-18". */
export function parseReference(text: string, canon: Canon = 'standard66'): BibleReference {
  const m = text.trim().match(/^([1-3]?[A-Za-z]{2,3})\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
  if (!m) throw new BibleValidationError(`Referência ilegível: "${text}".`);
  const ref: BibleReference = { book: m[1].toUpperCase(), chapter: Number(m[2]) };
  if (m[3]) ref.verseStart = Number(m[3]);
  if (m[4]) ref.verseEnd = Number(m[4]);
  validateReference(ref, canon);
  return ref;
}

export function compareReferences(a: BibleReference, b: BibleReference): number {
  const ia = INDEX.get(a.book) ?? Number.MAX_SAFE_INTEGER;
  const ib = INDEX.get(b.book) ?? Number.MAX_SAFE_INTEGER;
  return ia - ib || a.chapter - b.chapter || (a.verseStart ?? 0) - (b.verseStart ?? 0);
}

export function referenceKey(ref: BibleReference): string {
  return formatReference(ref);
}

/** Provedor de TEXTO bíblico. O domínio nunca gera texto de escritura: só repassa o que o provedor devolve. */
export interface BibleTextProvider {
  id: string;
  getPassage(ref: BibleReference, translationId: string): Promise<{ text: string; translationId: string } | undefined>;
}
