'use client';

/**
 * Camada funcional da aba E-mail (o visual é do Anti; este hook é só o contrato de dados).
 *
 * Tudo passa pelo runtime único do Personal OS:
 *  - inbox: DataState real (permission-required enquanto não houver mensagem; nunca uma
 *    caixa "vazia" fingindo estar sincronizada);
 *  - providerStates: Gmail / Outlook / Google Agenda / Outlook Agenda continuam BLOQUEADOS
 *    e dizem por quê; o provedor local é o único conectado;
 *  - importLocal: o usuário cola um e-mail e ele entra no mesmo pipeline
 *    (classificação → risco → extração → candidatos → Guardian → lembretes/Agenda);
 *  - proposals/approve/reject: as ações propostas a partir dos e-mails são as do Guardian
 *    (mesmo Action Center da aba Guardian), não uma fila paralela.
 */

import { useCallback, useMemo, useState } from 'react';
import { usePersonalOS } from '@/context/PersonalOSContext';
import type { EmailFilterId } from '@/domains/email/selectors';
import type { LocalEmailInput } from '@/domains/email/providers/local';

export function useEmailWorkspace(initialFilter: EmailFilterId = 'todos') {
  const { os, ready, version } = usePersonalOS();
  const [filter, setFilter] = useState<EmailFilterId>(initialFilter);
  const [lastImport, setLastImport] = useState<{ ok: boolean; message: string } | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const inbox = useMemo(() => os.emailInbox(filter), [os, version, filter]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const providers = useMemo(() => os.providerStates(), [os, version]);
  const proposals = useMemo(() => {
    const views = new Map(os.actionViews(200).map((a) => [a.id, a]));
    return os
      .emailProposals()
      .map((p) => ({ ...p, view: views.get(p.actionId) }))
      .filter((p) => p.view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os, version]);

  const importLocal = useCallback(
    (input: string | LocalEmailInput) => {
      try {
        const r = os.importLocalEmail(input);
        const msg = r.duplicate
          ? 'Este e-mail já tinha sido importado — nada foi duplicado.'
          : r.proposals > 0
          ? `E-mail importado. ${r.proposals} ${r.proposals === 1 ? 'ação proposta' : 'ações propostas'} ao Guardian, aguardando sua aprovação.`
          : 'E-mail importado e analisado. Nenhuma ação proposta.';
        setLastImport({ ok: true, message: msg });
        return r;
      } catch (e) {
        setLastImport({ ok: false, message: e instanceof Error ? e.message : 'Não foi possível importar o e-mail.' });
        return undefined;
      }
    },
    [os]
  );

  const approve = useCallback((actionId: string) => os.approve(actionId), [os]);
  const reject = useCallback((actionId: string) => os.reject(actionId), [os]);

  return {
    ready,
    filter,
    setFilter,
    inbox,
    providers,
    proposals,
    analysis: (messageId: string) => os.emailAnalysis(messageId),
    candidates: (messageId: string) => os.emailCandidatesFor(messageId),
    importLocal,
    lastImport,
    approve,
    reject,
  };
}
