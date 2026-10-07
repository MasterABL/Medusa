'use client';

/**
 * PersonalOSProvider — o único lugar onde a camada visual encontra a fundação.
 *
 *  - cria UM runtime do Personal OS (tarefas, projetos, lembretes v2, Guardian,
 *    e-mail local, corpo, espiritual) com persistência em localStorage;
 *  - entrega à fundação os itens REAIS da Agenda (recorrência expandida) e um
 *    "escritor" que grava na Agenda só pelo AgendaContext (camada temporal oficial);
 *  - transforma lembrete entregue em notificação da Dynamic Island, com
 *    "Abrir compromisso" que reconhece o lembrete (acknowledgement real);
 *  - roda o relógio (tick) a cada 30 s.
 *
 * Nada aqui decide regra de negócio nem desenha tela.
 */

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPersonalOS } from '@/foundation/runtime/personalOS';
import type { PersonalOS } from '@/foundation/runtime/personalOS';
import { createLocalStorageAdapter } from '@/foundation/persistence/storage';
import type { StorageAvailability } from '@/foundation/persistence/storage';
import { useAgenda } from '@/context/AgendaContext';
import { useShell } from '@/context/ShellContext';
import { expandRecurringItems } from '@/components/agenda/agendaHelpers';
import { readDemoMode } from '@/lib/dataMode';
import { exampleEmails } from '@/fixtures/emailFixtures';
import { withoutAgendaExamples } from '@/lib/agendaExamples';

interface PersonalOSContextValue {
  os: PersonalOS;
  /** true depois que o estado salvo foi carregado. Antes disso, nada de "vazio" definitivo. */
  ready: boolean;
  /** Muda a cada alteração no runtime (para re-render). */
  version: number;
  storage: StorageAvailability;
  saveError?: string;
}

const PersonalOSContext = createContext<PersonalOSContextValue | undefined>(undefined);

export function PersonalOSProvider({ children }: { children: React.ReactNode }) {
  const { items, addExternalItem, setSelectedItemId } = useAgenda();
  const { triggerIslandNotification, setActiveRoute } = useShell();
  const [os] = useState(() => createPersonalOS({ storage: createLocalStorageAdapter() }));
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // carregar o que foi salvo + assinar mudanças
  useEffect(() => {
    const unsubscribe = os.subscribe(() => setVersion(os.getVersion()));
    let alive = true;
    void os.hydrate().then(() => {
      if (!alive) return;
      if (readDemoMode()) os.ingestEmails(exampleEmails());
      setReady(true);
      setVersion(os.getVersion());
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [os]);

  // lembrete entregue → Dynamic Island (a entrega já passou pelo Guardian dentro do motor)
  useEffect(() => {
    os.setIslandSink((p) => {
      triggerIslandNotification({
        title: p.title,
        tag: p.tier === 'critical' ? 'COMPROMISSO CRÍTICO' : 'LEMBRETE',
        description: p.body,
        badge: p.offsetMinutes > 0 ? `T-${p.offsetMinutes} MIN` : 'AGORA',
        state: p.tier === 'critical' || p.tier === 'high' ? 'attention' : 'active',
        durationMs: 9000,
        actionLabel: 'Abrir compromisso',
        onAction: () => {
          setActiveRoute('agenda');
          setSelectedItemId(p.eventId);
          try {
            os.acknowledgeReminder(p.reminderId, 'opened');
          } catch {
            // já reconhecido em outra aba/clique: nada a fazer
          }
        },
      });
    });
  }, [os, triggerIslandNotification, setActiveRoute, setSelectedItemId]);

  // Agenda real → fundação (lembretes, Hoje, prioridade, planner)
  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 16);
    // itens de exemplo da Agenda nunca geram lembrete/prioridade fora do modo demonstração
    const expanded = withoutAgendaExamples(expandRecurringItems(items, start, end), readDemoMode());
    os.setAgenda(expanded, {
      add: (item) => addExternalItem(item),
      has: (id) => itemsRef.current.some((it) => it.id === id),
    });
  }, [os, items, addExternalItem]);

  // relógio: lembretes vencidos, aprovações expiradas, virada do dia
  useEffect(() => {
    if (!ready) return;
    os.tick();
    const id = setInterval(() => os.tick(), 30_000);
    return () => clearInterval(id);
  }, [os, ready]);

  const value = useMemo<PersonalOSContextValue>(
    () => ({ os, ready, version, storage: os.storageAvailability(), saveError: os.lastFlushError() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [os, ready, version]
  );

  return <PersonalOSContext.Provider value={value}>{children}</PersonalOSContext.Provider>;
}

export function usePersonalOS(): PersonalOSContextValue {
  const ctx = useContext(PersonalOSContext);
  if (!ctx) throw new Error('usePersonalOS precisa estar dentro de <PersonalOSProvider>.');
  return ctx;
}
