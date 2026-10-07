/**
 * MEDUSA FOUNDATION — LifeDomain
 *
 * A que área da vida algo pertence. Mais largo que `DomainId` (domínios com
 * implementação/registro) porque tarefa, prazo e evento podem ser de áreas
 * que não têm módulo próprio ainda (trabalho, pessoal). Inclui os mesmos
 * valores de `AgendaDomain` para uma tarefa poder virar bloco de Agenda sem
 * tradução com perda.
 */
export type LifeDomain =
  | 'work'
  | 'education'
  | 'body'
  | 'finance'
  | 'spiritual'
  | 'personal'
  | 'guardian'
  | 'external';

export const LIFE_DOMAINS: readonly LifeDomain[] = ['work', 'education', 'body', 'finance', 'spiritual', 'personal', 'guardian', 'external'];
