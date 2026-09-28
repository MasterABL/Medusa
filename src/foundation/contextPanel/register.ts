/**
 * MEDUSA FOUNDATION — registro dos Context Panels (seção 35)
 *
 * `implemented: true` para Educação/Agenda porque os componentes de UI já
 * existem de verdade (EducationContextPanel-família, AgendaContextSummary) —
 * mas este módulo NÃO os importa (evitaria puxar toda a árvore de
 * componentes React pra dentro de um teste de contrato em Node puro). Quem
 * for ligar isto à UI real passa o `resolve` de dentro de um Client Component,
 * não daqui.
 */

import { registerContextPanel } from './contextPanelRegistry';

export function registerDefaultContextPanels(): void {
  registerContextPanel({ domain: 'hoje', id: 'context-panel-hoje', label: 'Contexto do dia', implemented: false });
  registerContextPanel({
    domain: 'agenda',
    id: 'context-panel-agenda',
    label: 'Contexto da Agenda',
    implemented: true,
  });
  registerContextPanel({
    domain: 'education',
    id: 'context-panel-education',
    label: 'Contexto da Educação',
    implemented: true,
  });
  registerContextPanel({
    domain: 'guardian',
    id: 'context-panel-guardian',
    label: 'Contexto do Guardian',
    implemented: false,
  });
  registerContextPanel({
    domain: 'finance',
    id: 'context-panel-finance',
    label: 'Contexto de Finanças',
    implemented: false,
  });
  registerContextPanel({ domain: 'body', id: 'context-panel-body', label: 'Contexto de Corpo', implemented: false });
  registerContextPanel({
    domain: 'spiritual',
    id: 'context-panel-spiritual',
    label: 'Contexto Espiritual',
    implemented: false,
  });
}
