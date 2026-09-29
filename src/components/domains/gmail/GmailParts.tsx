'use client';

import React, { useState } from 'react';
import { Disclosure } from '../shared/Disclosure';
import {
  ACAO_LABEL,
  CATEGORIA_LABEL,
  aplicarSugestao,
  arquivar,
  categoriaDe,
  corrigirCategoria,
  dispensarSugestao,
  proporEvento,
  salvarRascunho,
  textoHoras,
} from './gmailSession';
import type { Categoria, Mensagem } from './gmailSession';

export function CategoriaChip({ m }: { m: Mensagem }) {
  const c = categoriaDe(m);
  if (!c) return <span className="dm-chip">Não classificado</span>;
  const tone = c === 'prazo' || c === 'responder' ? 'accent' : c === 'promocional' ? undefined : 'support';
  return (
    <span className="dm-chip" data-tone={tone}>
      {CATEGORIA_LABEL[c]}
      {m.corrigidaPara && <span className="sr-only"> (corrigido por você)</span>}
      {m.corrigidaPara && <span aria-hidden="true">·você</span>}
    </span>
  );
}

/** Resumo da IA + por quê + confiança — a explicação que a classificação sempre carrega. */
export function ExplicacaoIA({ m }: { m: Mensagem }) {
  if (!m.ia) return <p className="dm-muted text-[13px]">Ainda não organizado. Use “Organizar com IA”.</p>;
  return (
    <div className="gm-ia">
      <p className="dm-eyebrow">Resumo (IA de demonstração)</p>
      <p className="text-[14px] leading-snug">{m.ia.resumo}</p>
      <p className="dm-faint text-[12px] leading-snug">Por quê: {m.ia.motivo} Confiança {Math.round(m.ia.confianca * 100)}%.</p>
    </div>
  );
}

export function Acoes({ m }: { m: Mensagem }) {
  const [rascunho, setRascunho] = useState(m.rascunho ?? '');
  const [aberto, setAberto] = useState(false);
  const acao = m.ia?.acao;
  return (
    <div className="gm-acoes">
      {m.sugestaoPendente && acao && (
        <div className="gm-sugestao" role="group" aria-label="Sugestão da IA">
          <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
          <span className="flex-1 min-w-[160px] text-[13px]">IA sugere: <strong>{ACAO_LABEL[acao]}</strong>{m.ia?.prazo ? ` (${m.ia.prazo})` : ''}</span>
          <button type="button" className="dm-btn" data-size="sm" data-variant="primary" onClick={() => aplicarSugestao(m.id)}>Aceitar</button>
          <button type="button" className="dm-btn" data-size="sm" data-variant="quiet" onClick={() => dispensarSugestao(m.id)}>Dispensar</button>
        </div>
      )}
      {m.eventoProposto && (
        <p className="fin-outcome" role="status"><span className="material-symbols-outlined" aria-hidden="true">event</span><span>Pedido pronto para a Agenda{m.ia?.prazo ? ` (${m.ia.prazo})` : ''}. Nada foi criado: a Agenda escolhe o horário.</span></p>
      )}
      <div className="flex gap-2 flex-wrap">
        <button type="button" className="dm-btn" data-size="sm" onClick={() => setAberto((v) => !v)} aria-expanded={aberto}><span className="material-symbols-outlined" aria-hidden="true">reply</span>Responder</button>
        {!m.eventoProposto && <button type="button" className="dm-btn" data-size="sm" onClick={() => proporEvento(m.id)}><span className="material-symbols-outlined" aria-hidden="true">event</span>Propor evento</button>}
        <button type="button" className="dm-btn" data-size="sm" onClick={() => arquivar([m.id])}><span className="material-symbols-outlined" aria-hidden="true">archive</span>Arquivar</button>
        <label className="gm-corrigir">
          <span className="sr-only">Corrigir categoria</span>
          <select className="dm-field" value={categoriaDe(m) ?? ''} onChange={(e) => corrigirCategoria(m.id, e.target.value as Categoria)} aria-label="Corrigir categoria">
            <option value="" disabled>Categoria…</option>
            {(Object.keys(CATEGORIA_LABEL) as Categoria[]).map((c) => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
          </select>
        </label>
      </div>
      {aberto && (
        <div className="gm-rascunho">
          <label className="sr-only" htmlFor={`r-${m.id}`}>Rascunho de resposta</label>
          <textarea id={`r-${m.id}`} className="dm-field" rows={3} value={rascunho} onChange={(e) => setRascunho(e.target.value)} placeholder="Escreva um rascunho…" />
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" className="dm-btn" data-size="sm" onClick={() => salvarRascunho(m.id, rascunho)} disabled={!rascunho.trim()}>Guardar rascunho</button>
            <span className="dm-faint text-[12px]">Só guarda aqui. Nenhum e-mail é enviado nesta demonstração.</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function LinhaTriagem({ m, defaultOpen = false }: { m: Mensagem; defaultOpen?: boolean }) {
  return (
    <article className="gm-item" data-lida={m.lida} data-prio={m.ia?.prioridade}>
      <Disclosure
        defaultOpen={defaultOpen}
        buttonClassName="gm-item-btn"
        summary={
          <span className="gm-item-head">
            <span className="flex items-center gap-2 flex-wrap">
              <CategoriaChip m={m} />
              {m.ia?.prazo && <span className="dm-chip" data-tone="accent"><span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 13 }}>schedule</span>{m.ia.prazo}</span>}
              <span className="dm-faint text-[12px]">{m.de} · {textoHoras(m.horasAtras)}</span>
            </span>
            <strong className="gm-assunto">{!m.lida && <span className="gm-dot" aria-label="não lido" />}{m.assunto}</strong>
            <span className="dm-muted text-[13px] leading-snug">{m.ia?.resumo ?? m.previa}</span>
          </span>
        }
      >
        <div className="gm-detalhe">
          <p className="text-[14px] leading-relaxed">{m.corpo}</p>
          <ExplicacaoIA m={m} />
          <Acoes m={m} />
        </div>
      </Disclosure>
    </article>
  );
}
