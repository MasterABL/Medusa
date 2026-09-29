'use client';

import React, { useEffect } from 'react';
import './gmail.css';
import { DemoBadge } from '../shared/DemoBadge';
import { DomainHeader } from '../shared/DomainHeader';
import { ModeloCaixa, ModeloTriagem } from './GmailModelos';
import { dispensarDesfazer, desfazerArquivo, organizarComIA, restoreModelo, setModelo, useGmail } from './gmailSession';

/**
 * Aba Gmail com DOIS modelos de tela sobre o mesmo estado, para comparar:
 *  - Triagem: resumo primeiro — o que precisa de você, prazos, o que pode sair da frente.
 *  - Caixa: lista + painel de leitura, com filtros e busca.
 * Dados de demonstração; a IA é uma tabela fixa de classificação, e o que teria efeito fora
 * (responder, criar evento) só é proposto.
 */
export function GmailContainer() {
  const s = useGmail();
  useEffect(() => restoreModelo(), []);

  const ativos = s.mensagens.filter((m) => !m.arquivada);
  const naoLidos = ativos.filter((m) => !m.lida).length;
  const altas = ativos.filter((m) => m.ia?.prioridade === 'alta').length;
  const naoClass = ativos.filter((m) => !m.ia).length;

  return (
    <div className="dm-root gm-root" data-domain="gmail">
      <DomainHeader
        eyebrow="Gmail · controle e classificação"
        title={altas > 0 ? <><span className="dm-accent-text dm-num">{altas}</span> e-mail{altas > 1 ? 's precisam' : ' precisa'} de você hoje.</> : <>Sua caixa está sob controle.</>}
        subtitle={`${ativos.length} na caixa, ${naoLidos} não lido${naoLidos === 1 ? '' : 's'}${naoClass ? `, ${naoClass} ainda sem organizar` : ', todos organizados'}.`}
        aside={<DemoBadge label="Gmail não conectado" hint="Estes e-mails são exemplos. Nenhuma conta foi lida e nada é enviado, arquivado ou criado de verdade." />}
      />

      <div className="gm-toolbar">
        <div className="gm-seg" role="group" aria-label="Modelo da aba">
          <button type="button" aria-pressed={s.modelo === 'triagem'} onClick={() => setModelo('triagem')}><span className="material-symbols-outlined" aria-hidden="true">priority_high</span>Modelo A · Triagem</button>
          <button type="button" aria-pressed={s.modelo === 'caixa'} onClick={() => setModelo('caixa')}><span className="material-symbols-outlined" aria-hidden="true">view_list</span>Modelo B · Caixa</button>
        </div>
        <button type="button" className="dm-btn" data-variant="primary" onClick={() => void organizarComIA()} disabled={s.organizando || naoClass === 0}>
          <span className="material-symbols-outlined" aria-hidden="true">{s.organizando ? 'progress_activity' : 'auto_awesome'}</span>
          {s.organizando ? 'Organizando…' : naoClass === 0 ? 'Tudo organizado' : `Organizar com IA (${naoClass})`}
        </button>
      </div>

      {s.modelo === 'triagem' ? <ModeloTriagem /> : <ModeloCaixa />}

      {s.desfazer && (
        <div className="gm-toast" role="status">
          <span>{s.desfazer.texto}</span>
          <button type="button" className="dm-btn" data-size="sm" onClick={desfazerArquivo}>Desfazer</button>
          <button type="button" className="dm-btn" data-size="sm" data-variant="quiet" aria-label="Fechar aviso" onClick={dispensarDesfazer}>×</button>
        </div>
      )}
    </div>
  );
}
