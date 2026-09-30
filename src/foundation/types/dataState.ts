/**
 * MEDUSA FOUNDATION — DataState<T>
 *
 * Contrato único de "em que situação está este dado" que qualquer tela (hoje
 * ou futura) consome. Existe pra UI conseguir distinguir — sem adivinhar —
 * "ainda carregando" de "não existe" de "existe mas parcial" de "não deu pra
 * buscar" de "precisa de aprovação". Sem isso, cada tela inventa a sua
 * própria leitura de `undefined`/`[]`, e o vazio passa a significar cinco
 * coisas diferentes.
 *
 * Nada aqui conhece layout, cor ou componente.
 */

/**
 * De onde o dado veio. Regra de honestidade: um dado `fixture` nunca pode ser
 * apresentado como real — quem renderiza decide o rótulo, mas o contrato
 * carrega a verdade.
 */
export type DataOrigin = 'real' | 'fixture' | 'derived' | 'manual';

export type PartialReason =
  | 'fonte_incompleta' // a fonte respondeu, mas faltou parte do que se esperava
  | 'fonte_indisponivel' // uma de várias fontes não respondeu
  | 'dados_insuficientes'; // há dado, mas não o bastante pra um cálculo confiável

export interface DataStateMeta {
  origin: DataOrigin;
  /** ISO 8601 — quando este dado foi produzido/lido. */
  asOf?: string;
}

export type DataState<T> =
  | { status: 'loading'; previous?: T }
  | ({ status: 'ready'; data: T } & DataStateMeta)
  | ({ status: 'empty'; reason: string } & Partial<DataStateMeta>)
  | ({ status: 'stale'; data: T; staleSince: string; reason: string } & DataStateMeta)
  | { status: 'error'; message: string; retryable: boolean; previous?: T }
  | { status: 'offline'; previous?: T; lastSyncAt?: string }
  | { status: 'permission-required'; permission: string; reason: string }
  | { status: 'approval-required'; actionId?: string; reason: string }
  | ({ status: 'partial'; data: T; missing: string[]; reason: PartialReason } & DataStateMeta);

export type DataStatus = DataState<unknown>['status'];
