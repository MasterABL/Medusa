import React from 'react';

const ROUTE_LABEL: Record<string, string> = {
  agenda: 'Agenda',
  corpo: 'Corpo',
  financas: 'Finanças',
  progresso: 'Progresso',
};

/**
 * Estado honesto para rotas cujo contrato de produto ainda não está especificado o suficiente
 * para implementação sem inventar (ver `.ai/DECISIONS.md` HDR-005). Substitui a antiga página de
 * documentação do Shell com estatísticas fabricadas ("14 rpm", "0.02%") que era exibida como se
 * fosse o conteúdo real dessas abas.
 */
export function RoutePending({ route }: { route: string }) {
  const label = ROUTE_LABEL[route] ?? route;
  return (
    <main className="w-full pb-20 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col gap-6 pt-6 flex-1 study-stage-enter">
      <div className="flex flex-col items-center justify-center text-center gap-4 p-10 sm:p-16 rounded-2xl border border-dashed border-border/60 bg-surface/60 mt-6">
        <span className="material-symbols-outlined text-[28px] text-text-muted">construction</span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold text-text-primary tracking-tight">{label} ainda está por vir</h1>
          <p className="text-[13px] text-text-secondary max-w-md">
            Ainda estamos definindo como {label.toLowerCase()} vai funcionar. Preferimos não
            mostrar nada aqui a mostrar algo inventado.
          </p>
        </div>
      </div>
    </main>
  );
}
