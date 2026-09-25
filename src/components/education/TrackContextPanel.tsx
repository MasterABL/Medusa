'use client';

import React from 'react';
import { useEducationPanel } from '@/context/EducationPanelContext';
import { EnglishContextPanel } from './EnglishContextPanel';
import { EnemContextPanel } from './EnemContextPanel';
import { FaculdadeContextPanel } from './FaculdadeContextPanel';

/**
 * Dispatcher do Context Panel para a área de Educação — cada trilha tem seu próprio painel
 * (mesmo princípio da Hub: sem arquitetura de informação artificialmente igual entre trilhas).
 */
export function TrackContextPanel() {
  const { currentTrack } = useEducationPanel();

  if (currentTrack === 'ingles') return <EnglishContextPanel />;
  if (currentTrack === 'vestibular') return <EnemContextPanel />;
  return <FaculdadeContextPanel />;
}
