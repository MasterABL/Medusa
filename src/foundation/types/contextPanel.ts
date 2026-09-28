/**
 * MEDUSA FOUNDATION — Domain Context Panel registry (seção 35)
 *
 * O ContextPanel continua sendo a mesma infraestrutura de geometria/abertura/
 * fechamento/scroll/responsividade já existente (ver
 * src/components/shell/ContextPanel.tsx). O que este contrato acrescenta é só
 * a forma de um domínio se REGISTRAR como dono de um painel — nunca um
 * "GenericContextPanel" que troca apenas o título.
 *
 * `resolve` é opcional de propósito: um domínio pode existir no registry sem
 * ainda ter um painel de UI implementado (ex.: Finance/Body nesta rodada).
 */

import type { DomainId } from './domain';
import type { ReactNode } from 'react';

export interface ContextPanelRegistration {
  domain: DomainId;
  id: string;
  label: string;
  /** true = já existe componente de UI real; false = fundação, sem painel ainda. */
  implemented: boolean;
  /** Renderiza o conteúdo específico do domínio. Ausente quando implemented=false. */
  resolve?: () => ReactNode;
}
