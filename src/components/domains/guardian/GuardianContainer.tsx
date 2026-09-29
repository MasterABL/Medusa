'use client';

import React from 'react';
import './guardian.css';
import { useDomainEntry } from '../shared/useDomainEntry';
import { runTransition } from '../shared/viewTransition';
import { GuardianEntrada } from './GuardianEntrada';
import { GuardianHome } from './GuardianHome';
import { getGuardianSession } from './guardianSession';

export function GuardianContainer() {
  const { phase, complete, replay } = useDomainEntry('guardian');
  React.useMemo(() => getGuardianSession(), []);

  if (phase === 'loading') return <div className="dm-root" aria-busy="true" />;
  if (phase === 'first') return <GuardianEntrada onContinue={() => runTransition(complete)} />;
  return <GuardianHome onReplayIntro={() => runTransition(replay)} />;
}
