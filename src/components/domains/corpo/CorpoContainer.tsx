'use client';

import React, { useEffect, useState } from 'react';
import './corpo.css';
import { useDomainEntry } from '../shared/useDomainEntry';
import { runTransition } from '../shared/viewTransition';
import { CorpoHome } from './CorpoHome';
import { CorpoOnboarding } from './CorpoOnboarding';
import { restoreBody } from './bodySession';

export function CorpoContainer() {
  const { phase, complete, replay } = useDomainEntry('corpo');
  const [restored, setRestored] = useState<'checking' | 'yes' | 'no'>('checking');

  useEffect(() => {
    if (phase === 'returning') setRestored(restoreBody() ? 'yes' : 'no');
  }, [phase]);

  if (phase === 'loading' || (phase === 'returning' && restored === 'checking')) return <div className="dm-root" aria-busy="true" />;
  // Voltou mas não há plano salvo (storage limpo): a introdução recomeça em vez de mostrar uma home vazia.
  if (phase === 'first' || restored === 'no') return <CorpoOnboarding onDone={() => runTransition(() => { complete(); setRestored('yes'); })} />;
  return <CorpoHome onRedo={() => runTransition(() => { replay(); setRestored('checking'); })} />;
}
