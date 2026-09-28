import React from 'react';

/**
 * Marca de proveniência: todo dado que não vem de uma fonte real do usuário se declara assim.
 * Nunca é decorativo — some quando (e só quando) o domínio passar a ler de um repositório real.
 */
export function DemoBadge({ label = 'Dados de demonstração', hint }: { label?: string; hint?: string }) {
  return (
    <span
      className="dm-demo-badge"
      title={hint ?? 'Exemplo para mostrar o produto. Não são dados reais seus.'}
    >
      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 14 }}>
        science
      </span>
      {label}
    </span>
  );
}
