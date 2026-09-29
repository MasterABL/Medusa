'use client';

import React from 'react';
import { CATEGORIA_LABEL, categoriaDe, gmailUi, useGmail } from './gmailSession';
import type { Categoria } from './gmailSession';

/** Context Panel do Gmail: o que a IA fez, por categoria, prazos e o que você corrigiu. */
export function GmailContextPanel() {
  const s = useGmail();
  const ativos = s.mensagens.filter((m) => !m.arquivada);
  const porCat = (Object.keys(CATEGORIA_LABEL) as Categoria[]).map((c) => [c, ativos.filter((m) => categoriaDe(m) === c).length] as const).filter(([, n]) => n > 0);
  const prazos = ativos.filter((m) => m.ia?.prazo);
  const pendentes = ativos.filter((m) => m.sugestaoPendente).length;
  const arquivados = s.mensagens.filter((m) => m.arquivada).length;

  return (
    <>
      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Assistente <span className="dm-chip" data-tone="accent">demonstração</span></p>
        <p className="text-[13px] leading-snug">Classificação por regras fixas de exemplo. Nenhum modelo de IA nem conta Gmail está conectado.</p>
        <p className="dm-faint text-[12px]">{pendentes} sugest{pendentes === 1 ? 'ão pendente' : 'ões pendentes'} · {arquivados} arquivado{arquivados === 1 ? '' : 's'} · {s.correcoes} correç{s.correcoes === 1 ? 'ão sua' : 'ões suas'}</p>
      </div>
      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Por categoria</p>
        {porCat.length === 0 ? <p className="dm-muted text-[13px]">Nada organizado ainda.</p> : (
          <ul className="gm-cats">
            {porCat.map(([c, n]) => (
              <li key={c}>
                <button type="button" className="dm-ctx-link" onClick={() => gmailUi.set({ modelo: 'caixa', filtro: c })}>
                  <span className="text-[13px]">{CATEGORIA_LABEL[c]}</span><strong className="dm-num text-[13px]">{n}</strong>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Prazos vindos dos e-mails</p>
        {prazos.length === 0 ? <p className="dm-muted text-[13px]">Nenhum prazo detectado.</p> : prazos.map((m) => (
          <button key={m.id} type="button" className="dm-ctx-link" onClick={() => gmailUi.set({ modelo: 'caixa', selecionada: m.id })}>
            <span className="min-w-0"><strong className="block text-[13px] truncate">{m.assunto}</strong><span className="dm-muted text-[12px]">{m.ia?.prazo}</span></span>
          </button>
        ))}
      </div>
      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Privacidade</p>
        <p className="dm-muted text-[12px] leading-snug">Quando houver Gmail real, a IA só receberá o que você autorizar por escopo, e o Guardian pedirá aprovação para arquivar, responder ou criar evento.</p>
      </div>
    </>
  );
}
