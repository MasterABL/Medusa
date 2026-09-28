'use client';

import React from 'react';
import './espiritual.css';
import { useDomainEntry } from '../shared/useDomainEntry';
import { runTransition } from '../shared/viewTransition';
import { EspiritualEntrada } from './EspiritualEntrada';
import { EspiritualHome } from './EspiritualHome';

export function EspiritualContainer() {
  const { phase, complete, replay } = useDomainEntry('espiritual');

  if (phase === 'loading') return <div className="dm-root" aria-busy="true" />;
  if (phase === 'first') return <EspiritualEntrada onDone={() => runTransition(complete)} />;
  return <EspiritualHome onReplayIntro={() => runTransition(replay)} />;
}
