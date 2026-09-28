/**
 * MEDUSA — Guardian — contrato dos auditores
 *
 * Um auditor recebe EVIDÊNCIA ESTRUTURADA (não vai buscar nada sozinho) e
 * devolve rascunhos de finding. Coletar a evidência é papel de uma
 * `ObservationSource` — assim o mesmo auditor funciona sobre dado de teste,
 * de um repositório ou de uma ferramenta futura, sem mudar.
 */

import type { FindingCategory, FindingDraft } from '../model/types';

export interface Auditor<TInput> {
  id: string;
  category: FindingCategory;
  detect(input: TInput, now: Date): FindingDraft[];
}

export interface ObservationSource {
  auditor: Auditor<never>;
  collect(): Promise<unknown> | unknown;
}

/** Junta um auditor tipado com a sua coleta sem espalhar `any` pelo runtime. */
export function defineSource<TInput>(auditor: Auditor<TInput>, collect: () => Promise<TInput> | TInput): ObservationSource {
  return { auditor: auditor as unknown as Auditor<never>, collect };
}

/** Hash determinístico curto (djb2) — só para dedupeKey/fingerprint, nunca segurança. */
export function fingerprint(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) h = ((h << 5) + h + value.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}
