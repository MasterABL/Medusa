'use client';

import { useEffect, useState } from 'react';

/**
 * Modo demonstração: só com `?demo=1` na URL (ou `medusa-demo-mode=1` no localStorage).
 *
 * Fora dele, nenhuma tela que tem dado real (Hoje, Tarefas, Guardian · Action Center)
 * completa o vazio com exemplos. Dentro dele, os exemplos aparecem SEMPRE marcados
 * como "Dados de exemplo". Começa `false` no servidor e no 1º render do cliente para
 * não quebrar a hidratação; o valor real chega no efeito.
 */
export function readDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('demo') === '1') return true;
    return window.localStorage.getItem('medusa-demo-mode') === '1';
  } catch {
    return false;
  }
}

export function useDemoMode(): boolean {
  const [demo, setDemo] = useState(false);
  useEffect(() => setDemo(readDemoMode()), []);
  return demo;
}

/** Procedência do que a tela mostra. */
export type DataProvenance = 'real' | 'fixture' | 'empty' | 'partial' | 'blocked';
