'use client';

import React, { useMemo } from 'react';
import {
  CATEGORIA_LABEL,
  alternarEstrela,
  arquivar,
  gmailUi,
  selecionar,
  textoHoras,
  useGmail,
  visiveis,
} from './gmailSession';
import type { Categoria, Filtro } from './gmailSession';
import { Acoes, CategoriaChip, ExplicacaoIA, LinhaTriagem } from './GmailParts';

/* ---------------- Modelo A — Triagem por prioridade ---------------- */
export function ModeloTriagem() {
  const s = useGmail();
  const ativos = s.mensagens.filter((m) => !m.arquivada);
  const precisa = ativos.filter((m) => m.ia?.prioridade === 'alta' || (m.ia?.categoria === 'responder' && m.ia.prioridade !== 'baixa'));
  const prazos = ativos.filter((m) => m.ia?.prazo && !precisa.includes(m)).concat([]);
  const sairDaFrente = ativos.filter((m) => m.ia?.acao === 'arquivar' && m.sugestaoPendente);
  const resto = ativos.filter((m) => !precisa.includes(m) && !prazos.includes(m) && !sairDaFrente.includes(m));
  const naoClass = ativos.filter((m) => !m.ia).length;

  return (
    <div className="gm-stack">
      <section className="gm-section dm-rise" aria-label="Precisa de você">
        <h2 className="dm-h2">Precisa de você{precisa.length ? ` · ${precisa.length}` : ''}</h2>
        {precisa.length === 0 ? <p className="dm-muted text-[13px]">Nada urgente. {naoClass > 0 ? 'Há e-mails ainda não organizados.' : 'Caixa sob controle.'}</p> : <div className="gm-list">{precisa.map((m, i) => <LinhaTriagem key={m.id} m={m} defaultOpen={i === 0} />)}</div>}
      </section>

      {prazos.length > 0 && (
        <section className="gm-section dm-rise" style={{ ['--i' as string]: 1 }} aria-label="Prazos e vencimentos">
          <h2 className="dm-h2">Prazos e vencimentos · {prazos.length}</h2>
          <div className="gm-list">{prazos.map((m) => <LinhaTriagem key={m.id} m={m} />)}</div>
        </section>
      )}

      {sairDaFrente.length > 0 && (
        <section className="dm-card dm-card-pad gm-bulk dm-rise" style={{ ['--i' as string]: 2 }} aria-label="Pode sair da frente">
          <div className="flex-1 min-w-[220px]">
            <h2 className="dm-h2">Pode sair da frente · {sairDaFrente.length}</h2>
            <p className="dm-muted text-[13px] leading-snug">A IA vê propaganda e boletins sem ação para você. Arquivar é reversível — dá para desfazer.</p>
            <ul className="gm-mini">{sairDaFrente.map((m) => <li key={m.id}><span className="truncate">{m.de}</span><span className="dm-faint text-[12px]">{m.assunto}</span></li>)}</ul>
          </div>
          <button type="button" className="dm-btn" data-variant="primary" onClick={() => arquivar(sairDaFrente.map((m) => m.id), `${sairDaFrente.length} e-mails arquivados.`)}>
            <span className="material-symbols-outlined" aria-hidden="true">archive</span>Arquivar {sairDaFrente.length}
          </button>
        </section>
      )}

      {resto.length > 0 && (
        <section className="gm-section dm-rise" style={{ ['--i' as string]: 3 }} aria-label="Já organizados">
          <h2 className="dm-h2">Já organizados pela IA · {resto.length}</h2>
          <div className="gm-list">{resto.map((m) => <LinhaTriagem key={m.id} m={m} />)}</div>
        </section>
      )}
    </div>
  );
}

/* ---------------- Modelo B — Caixa de entrada em lista ---------------- */
const FILTROS: Array<[Filtro, string]> = [['todos', 'Todos'], ['nao_lidos', 'Não lidos'], ['alta', 'Prioridade alta']];

export function ModeloCaixa() {
  const s = useGmail();
  const lista = useMemo(() => visiveis(s), [s]);
  const atual = s.mensagens.find((m) => m.id === s.selecionada && !m.arquivada);
  const categorias = Object.keys(CATEGORIA_LABEL) as Categoria[];

  return (
    <div className="gm-caixa" data-lendo={!!atual}>
      <div className="gm-lista-col">
        <label className="sr-only" htmlFor="gm-busca">Buscar e-mails</label>
        <input id="gm-busca" className="dm-field" type="search" placeholder="Buscar remetente ou assunto" value={s.busca} onChange={(e) => gmailUi.set({ busca: e.target.value })} />
        <div className="gm-filtros" role="group" aria-label="Filtros">
          {[...FILTROS, ...categorias.map((c) => [c, CATEGORIA_LABEL[c]] as [Filtro, string])].map(([f, nome]) => (
            <button key={f} type="button" className="gm-filtro" aria-pressed={s.filtro === f} onClick={() => gmailUi.set({ filtro: f })}>{nome}</button>
          ))}
        </div>
        {lista.length === 0 ? (
          <p className="dm-muted text-[13px] gm-vazio">Nenhum e-mail neste filtro.</p>
        ) : (
          <ul className="gm-linhas" role="list">
            {lista.map((m) => (
              <li key={m.id}>
                <div className="gm-linha" data-ativa={m.id === s.selecionada} data-lida={m.lida}>
                  <button type="button" className="gm-estrela" aria-pressed={m.estrela} aria-label={m.estrela ? 'Remover estrela' : 'Marcar com estrela'} onClick={() => alternarEstrela(m.id)}>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${m.estrela ? 1 : 0}` }}>star</span>
                  </button>
                  <button type="button" className="gm-linha-btn" onClick={() => selecionar(m.id)} aria-current={m.id === s.selecionada ? 'true' : undefined}>
                    <span className="flex items-baseline justify-between gap-2"><strong className="gm-remetente">{!m.lida && <span className="gm-dot" aria-label="não lido" />}{m.de}</strong><span className="dm-faint text-[11px] shrink-0">{textoHoras(m.horasAtras)}</span></span>
                    <span className="gm-assunto-linha">{m.assunto}</span>
                    <span className="flex gap-1.5 items-center flex-wrap"><CategoriaChip m={m} />{m.ia?.prioridade === 'alta' && <span className="dm-chip" data-tone="alert">Alta</span>}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="gm-leitura dm-card" aria-label="Leitura" aria-live="polite">
        {atual ? (
          <>
            <button type="button" className="dm-btn gm-voltar" data-variant="quiet" data-size="sm" onClick={() => selecionar(null)}><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Voltar à lista</button>
            <p className="dm-eyebrow">{atual.de} · {atual.email}</p>
            <h2 className="gm-leitura-titulo">{atual.assunto}</h2>
            <p className="dm-faint text-[12px]">{textoHoras(atual.horasAtras)}</p>
            <div className="gm-corpo">{atual.corpo}</div>
            <ExplicacaoIA m={atual} />
            <Acoes m={atual} />
          </>
        ) : (
          <div className="gm-leitura-vazia">
            <span className="material-symbols-outlined" aria-hidden="true">mail</span>
            <p className="dm-muted text-[14px]">Escolha um e-mail para ler. A IA mostra o resumo e por que classificou assim.</p>
          </div>
        )}
      </section>
    </div>
  );
}
