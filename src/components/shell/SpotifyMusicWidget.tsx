'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useClickOutside } from '@/lib/useClickOutside';

/**
 * Medusa — Entrada de música/Spotify (Round 5 §20)
 *
 * AUDITORIA DE VIABILIDADE (feita antes de escrever qualquer código, como o pedido exigiu):
 *
 * 1. **Spotify Web Playback SDK** (controle total de reprodução, qualquer faixa) — descartado:
 *    exige conta Premium E um app registrado no Spotify Developer Dashboard (Client ID/Secret) E
 *    OAuth do usuário. Nenhuma dessas três coisas existe neste ambiente, e criar um app Spotify
 *    é uma decisão de credencial externa que caberia ao Abimael, não a mim decidir sozinho.
 * 2. **Spotify oEmbed / iframe estático** (só o player visual da Spotify, sem controle via JS) —
 *    funciona sem credencial nenhuma, mas não dá pra reagir ao estado de play/pause de fora do
 *    iframe (exatamente o que o pedido pede: "waveform reagindo ao estado").
 * 3. **Spotify IFrame API** (`https://open.spotify.com/embed/iframe-api/v1`) — official, pública,
 *    SEM OAuth/credencial nenhuma (funciona pra qualquer link público do Spotify, conta free ou
 *    Premium). Expõe `createController()` com eventos reais (`playback_update`) e métodos reais
 *    (`.play()`/`.pause()`) — exatamente o que permite a waveform reagir a um estado de verdade,
 *    não decorativo. **Esta é a opção escolhida.**
 *
 * **Bloqueio real encontrado, não simulado**: o proxy de rede deste ambiente sandboxed recusa
 * qualquer conexão com `open.spotify.com` (`curl` direto devolve erro de túnel/403, confirmado
 * antes de escrever este arquivo — não é suposição). Isso significa que **não consegui verificar
 * neste ambiente** se o script da IFrame API carrega e se os eventos disparam como a documentação
 * pública descreve. Por isso, em vez de fingir que funciona, o componente:
 * - tenta carregar o script de verdade;
 * - se não conseguir responder em 5s (rede bloqueada, ad-blocker, etc.), cai num estado de
 *   fallback HONESTO — um link real "Abrir no Spotify", nunca um controle falso/travado.
 * - só mostra o player com controles reais depois que a API confirma ter inicializado.
 *
 * **Nenhuma faixa/playlist vem fixa no código**: eu não tenho como confirmar que um ID de
 * playlist específico ainda existe/está público, e inventar um arriscaria linkar pra algo
 * quebrado. Em vez disso, o Abimael cola o link do que quiser ouvir — mesmo princípio já usado
 * no projeto irmão (campo de playlist configurável pelo usuário).
 */

type LoadState = 'idle' | 'loading' | 'ready' | 'failed';

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (IFrameAPI: SpotifyIFrameAPI) => void;
  }
}

interface SpotifyIFrameAPI {
  createController: (
    element: HTMLElement,
    options: { uri: string; width?: string | number; height?: string | number },
    callback: (controller: SpotifyEmbedController) => void
  ) => void;
}

interface SpotifyEmbedController {
  play: () => void;
  pause: () => void;
  addListener: (event: 'playback_update' | 'ready', cb: (e: { data: { isPaused: boolean; isBuffering: boolean } }) => void) => void;
  destroy: () => void;
}

let scriptLoadPromise: Promise<SpotifyIFrameAPI> | null = null;

function loadSpotifyIframeApi(): Promise<SpotifyIFrameAPI> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout')), 5000);
    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      clearTimeout(timeout);
      resolve(IFrameAPI);
    };
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('script-error'));
    };
    document.body.appendChild(script);
  });
  return scriptLoadPromise;
}

/** Aceita link normal (open.spotify.com/track/ID) ou URI (spotify:track:ID). */
function parseSpotifyUri(input: string): string | null {
  const trimmed = input.trim();
  if (/^spotify:(track|playlist|album|show|episode):[A-Za-z0-9]+/.test(trimmed)) return trimmed;
  const match = trimmed.match(/open\.spotify\.com\/(track|playlist|album|show|episode)\/([A-Za-z0-9]+)/);
  if (match) return `spotify:${match[1]}:${match[2]}`;
  return null;
}

export function SpotifyMusicWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [linkInput, setLinkInput] = useState('');
  const [isPaused, setIsPaused] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const embedHostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SpotifyEmbedController | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useClickOutside(popoverRef, () => setIsOpen(false), isOpen);
  useEscapeKey(isOpen, () => setIsOpen(false));

  useEffect(() => {
    return () => {
      controllerRef.current?.destroy();
    };
  }, []);

  const handleCarregar = async () => {
    const uri = parseSpotifyUri(linkInput);
    if (!uri) {
      setError('Link do Spotify não reconhecido — cole o link de uma faixa, playlist ou álbum.');
      return;
    }
    setError(null);
    setLoadState('loading');
    try {
      const IFrameAPI = await loadSpotifyIframeApi();
      if (!embedHostRef.current) return;
      embedHostRef.current.innerHTML = '';
      IFrameAPI.createController(embedHostRef.current, { uri, height: '80' }, (controller) => {
        controllerRef.current = controller;
        controller.addListener('playback_update', (e) => setIsPaused(e.data.isPaused));
        setLoadState('ready');
      });
    } catch {
      // Bloqueio real deste ambiente (rede negada pelo proxy) — nunca finge que carregou.
      setLoadState('failed');
    }
  };

  const externalUrl = (() => {
    const uri = parseSpotifyUri(linkInput);
    if (!uri) return 'https://open.spotify.com';
    const [, type, id] = uri.split(':');
    return `https://open.spotify.com/${type}/${id}`;
  })();

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        id="btn-spotify-entry"
        onClick={() => setIsOpen((v) => !v)}
        title="Música (Spotify)"
        aria-label="Abrir player de música"
        aria-expanded={isOpen}
        className={`btn-interactive w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface/80 border border-border/60 text-text-secondary hover:text-text-primary hover:border-medusa-primary/40 shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex items-center justify-center flex-shrink-0 ${
          loadState === 'ready' && !isPaused ? 'text-[#18534B] dark:text-medusa-primary border-medusa-primary/40' : ''
        }`}
      >
        <span className="material-symbols-outlined text-[16px]">graphic_eq</span>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          id="spotify-widget-popover"
          role="dialog"
          aria-label="Player de música"
          className="modal-pop-enter absolute right-0 top-10 z-40 w-72 bg-surface border border-border/70 rounded-2xl shadow-island p-3.5 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">Música</span>
            <button
              type="button"
              id="btn-close-spotify-widget"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar"
              className="btn-interactive p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          {loadState !== 'ready' && (
            <>
              <input
                type="text"
                id="spotify-link-input"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Cole um link do Spotify (faixa, playlist, álbum)"
                className="w-full bg-surface-secondary/60 border border-border/60 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-medusa-primary/80 focus:ring-1 focus:ring-medusa-primary/50 transition-all"
              />
              {error && <p className="text-[11px] text-[#8A3D3D] dark:text-medusa-alert">{error}</p>}
              <button
                type="button"
                id="btn-spotify-carregar"
                onClick={handleCarregar}
                disabled={!linkInput.trim() || loadState === 'loading'}
                className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] disabled:opacity-40 disabled:pointer-events-none px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              >
                {loadState === 'loading' ? (
                  <span className="material-symbols-outlined text-[14px] living-pulse">graphic_eq</span>
                ) : (
                  <span className="material-symbols-outlined text-[14px]">play_circle</span>
                )}
                <span>{loadState === 'loading' ? 'Carregando player...' : 'Carregar'}</span>
              </button>
            </>
          )}

          {loadState === 'failed' && (
            <div id="spotify-fallback" className="flex flex-col gap-1.5 text-[11px] text-text-secondary">
              <p>
                Não consegui carregar o player do Spotify aqui — pode ser bloqueio de rede ou
                extensão do navegador.
              </p>
              <a
                id="link-spotify-external"
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-interactive inline-flex items-center gap-1.5 text-[#18534B] dark:text-medusa-primary font-semibold"
              >
                <span>Abrir no Spotify</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            </div>
          )}

          {/* Host real do embed controller da Spotify IFrame API — nunca removido do DOM enquanto
              `loadState === 'ready'`, senão o controller perde a referência ao elemento. */}
          <div ref={embedHostRef} id="spotify-embed-host" className={loadState === 'ready' ? 'block' : 'hidden'} />

          {loadState === 'ready' && (
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                id="btn-spotify-playpause"
                onClick={() => (isPaused ? controllerRef.current?.play() : controllerRef.current?.pause())}
                aria-label={isPaused ? 'Tocar' : 'Pausar'}
                className="btn-interactive w-9 h-9 rounded-full bg-medusa-primary/90 hover:bg-medusa-primary text-[#1C2420] flex items-center justify-center shadow-subtle flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">{isPaused ? 'play_arrow' : 'pause'}</span>
              </button>
              {/* Waveform reagindo a estado REAL (`isPaused` vem do evento `playback_update` da
                  própria Spotify) — não uma animação decorativa desacoplada do player. */}
              <div className="flex items-end gap-0.5 h-6 flex-1" aria-hidden="true">
                {[40, 70, 50, 90, 60, 35, 75, 55].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: !isPaused ? `${h}%` : '20%' }}
                    className="flex-1 bg-medusa-primary rounded-full transition-all duration-300 ease-out"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
