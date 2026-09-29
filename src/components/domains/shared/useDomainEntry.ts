'use client';

import { useCallback, useEffect, useState } from 'react';

export type DomainKey = 'financas' | 'corpo' | 'guardian' | 'espiritual';
export type EntryPhase = 'loading' | 'first' | 'returning';

const KEY = 'medusa-domain-entry-v1';

function read(): Partial<Record<DomainKey, string>> {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<DomainKey, string>>) : {};
  } catch {
    return {};
  }
}

function write(map: Partial<Record<DomainKey, string>>): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // storage restrito: a entrada simplesmente volta a aparecer na próxima visita
  }
}

/**
 * Primeira entrada × retorno, persistido no mesmo mecanismo que o Shell já usa (localStorage).
 * `loading` existe para não piscar a entrada de quem já a viu antes de o storage ser lido.
 */
export function useDomainEntry(domain: DomainKey) {
  const [phase, setPhase] = useState<EntryPhase>('loading');

  useEffect(() => {
    setPhase(read()[domain] ? 'returning' : 'first');
  }, [domain]);

  const complete = useCallback(() => {
    write({ ...read(), [domain]: new Date().toISOString() });
    setPhase('returning');
  }, [domain]);

  const replay = useCallback(() => {
    const map = read();
    delete map[domain];
    write(map);
    setPhase('first');
  }, [domain]);

  return { phase, complete, replay };
}
