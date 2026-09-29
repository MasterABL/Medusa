'use client';

import React, { useMemo, useState } from 'react';
import { CANON_66, formatReference, type BibleReference } from '@/domains/spiritual';
import { DemoBadge } from '../shared/DemoBadge';
import { DomainHeader } from '../shared/DomainHeader';
import { AtmosphericSanctuary, type AmbientTime } from './AtmosphericSanctuary';
import { EspiritualEstudo } from './EspiritualEstudo';
import { getPassageData, OLD_TESTAMENT_CODES } from './biblePassages';
import {
  addReflection,
  buildView,
  hasPrayedToday,
  readReflection,
  setPrayedToday,
  setPurpose,
  useSpiritualState,
} from './spiritualSession';

export function EspiritualHome({ onReplayIntro }: { onReplayIntro: () => void }) {
  const { version } = useSpiritualState();
  const v = useMemo(() => buildView(), [version]);

  // View state: 'home' ou 'estudo'
  const [viewMode, setViewMode] = useState<'home' | 'estudo'>('home');
  const [ambientTime, setAmbientTime] = useState<AmbientTime>('auto');

  // Navegação Bíblica: Livro → Capítulo → Passagem
  const [selectedBook, setSelectedBook] = useState<string>('JHN');
  const [selectedChapter, setSelectedChapter] = useState<number>(14);

  // Propósito edit state
  const [editingPurpose, setEditingPurpose] = useState(false);
  const [purposeDraft, setPurposeDraft] = useState(
    v.purpose?.label ?? 'Cultivar a quietude interior e a presença serena em cada ação do dia.'
  );

  // Oração do dia
  const prayedToday = hasPrayedToday();

  // Reflexão privada
  const [reflectionDraft, setReflectionDraft] = useState('');
  const [shownReflections, setShownReflections] = useState<Record<string, string | undefined>>({});

  const bookEntry = CANON_66.find((b) => b.code === selectedBook) || CANON_66[0];
  const activePassage = useMemo(
    () => getPassageData(selectedBook, selectedChapter),
    [selectedBook, selectedChapter]
  );
  const activeRef: BibleReference = { book: selectedBook, chapter: selectedChapter };

  // Se o usuário navegou para a subexperiência de Estudo, renderiza EspiritualEstudo diretamente
  if (viewMode === 'estudo') {
    return (
      <div className="dm-root esp-root" data-domain="espiritual">
        <AtmosphericSanctuary ambientTime={ambientTime} onAmbientTimeChange={setAmbientTime}>
          <EspiritualEstudo reference={activeRef} onBack={() => setViewMode('home')} />
        </AtmosphericSanctuary>
      </div>
    );
  }

  return (
    <div className="dm-root esp-root" data-domain="espiritual">
      <AtmosphericSanctuary ambientTime={ambientTime} onAmbientTimeChange={setAmbientTime}>
        <DomainHeader
          eyebrow="Espiritual · Santuário de Presença, Fé e Caminho"
          title={
            <span>
              Paz e silêncio interior. <span className="dm-accent-text font-serif italic">Sem pressa.</span>
            </span>
          }
          subtitle="Um ambiente contemplativo e contínuo para ancorar a alma, orar com sinceridade e ler a Escritura sem ruído."
          aside={
            <>
              <DemoBadge hint="Navegação bíblica canônica e anotações guardadas localmente neste navegador. Sem compartilhamento externo." />
              <button
                type="button"
                className="dm-btn"
                data-variant="quiet"
                data-size="sm"
                onClick={onReplayIntro}
              >
                <span className="material-symbols-outlined" aria-hidden="true">replay</span>
                Rever introdução
              </button>
            </>
          }
        />

        {/* DIMENSÃO 1: PROPÓSITO — Representação visual de caminho contínuo */}
        <section
          className="esp-sanctuary-block esp-purpose-block dm-rise"
          style={{ ['--i' as string]: 0 }}
          aria-label="Caminho e Propósito"
        >
          <div className="esp-purpose-header">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">explore</span>
              <p className="dm-eyebrow">Dimensão 1 · O Caminho que Busco Viver</p>
            </div>
            <button
              type="button"
              className="dm-btn"
              data-variant="quiet"
              data-size="sm"
              onClick={() => setEditingPurpose(!editingPurpose)}
            >
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">edit</span>
              {editingPurpose ? 'Cancelar' : 'Revisar propósito'}
            </button>
          </div>

          {editingPurpose ? (
            <div className="esp-purpose-editor dm-rise">
              <textarea
                className="dm-field text-[14px]"
                rows={2}
                value={purposeDraft}
                onChange={(e) => setPurposeDraft(e.target.value)}
                placeholder="Qual intenção espiritual orienta seus passos nesta fase da vida?"
                aria-label="Editar propósito espiritual"
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  className="dm-btn"
                  data-size="sm"
                  disabled={!purposeDraft.trim()}
                  onClick={() => {
                    setPurpose(purposeDraft);
                    setEditingPurpose(false);
                  }}
                >
                  Confirmar intenção
                </button>
              </div>
            </div>
          ) : (
            <div className="esp-purpose-display">
              <blockquote className="esp-purpose-quote">
                “{v.purpose?.label || purposeDraft}”
              </blockquote>
            </div>
          )}

          {/* Trilha Visual de Caminho e Presença Semanal (sem gamificação punitiva) */}
          <div className="esp-path-track" aria-label="Continuidade no Caminho">
            <div className="esp-path-milestone completed">
              <span className="esp-path-dot" />
              <span className="esp-path-label">Amanhecer em Silêncio</span>
            </div>
            <div className="esp-path-line completed" />
            <div className={`esp-path-milestone ${prayedToday ? 'completed' : 'current'}`}>
              <span className="esp-path-dot" />
              <span className="esp-path-label">Presença no Meio do Dia</span>
            </div>
            <div className="esp-path-line" />
            <div className="esp-path-milestone">
              <span className="esp-path-dot" />
              <span className="esp-path-label">Exame & Gratidão</span>
            </div>
          </div>
        </section>

        {/* DIMENSÃO 4: ORAÇÃO — Pergunta simples, sincera e humana */}
        <section
          className="esp-sanctuary-block esp-prayer-block dm-rise"
          style={{ ['--i' as string]: 1 }}
          aria-label="Oração do Dia"
        >
          <div className="esp-prayer-inner">
            <div className="flex items-center gap-3">
              <div className="esp-prayer-icon-wrap" data-prayed={prayedToday}>
                <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
                  {prayedToday ? 'done_all' : 'self_improvement'}
                </span>
              </div>
              <div>
                <p className="dm-eyebrow">Dimensão 4 · Conexão Sincera</p>
                <h2 className="esp-prayer-question">Orei hoje?</h2>
                <p className="dm-muted text-[13px] mt-0.5">
                  {prayedToday
                    ? 'Momento orante registrado. Não há cobrança de sequência; Deus acolhe o coração sincero.'
                    : 'No seu tempo e no seu ritmo. Uma respiração calma já é o início de uma oração.'}
                </p>
              </div>
            </div>

            <div className="esp-prayer-actions" role="group" aria-label="Registro de oração">
              <button
                type="button"
                className="dm-btn"
                data-variant={prayedToday ? 'quiet' : 'default'}
                data-size="sm"
                onClick={() => setPrayedToday(false)}
              >
                Ainda não
              </button>
              <button
                type="button"
                className="dm-btn"
                data-variant={prayedToday ? 'default' : 'quiet'}
                data-size="sm"
                onClick={() => setPrayedToday(true)}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">check</span>
                Orei
              </button>
            </div>
          </div>
        </section>

        {/* DIMENSÃO 2: LEITURA — Navegação Natural pela Bíblia */}
        <section
          className="esp-sanctuary-block esp-reading-block dm-rise"
          style={{ ['--i' as string]: 2 }}
          aria-label="Leitura da Escritura"
        >
          <div className="esp-reading-topbar">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">menu_book</span>
              <p className="dm-eyebrow">Dimensão 2 · Leitura Contínua da Escritura</p>
            </div>
            <span className="dm-faint text-[12px] font-mono">{activePassage.translation}</span>
          </div>

          {/* Navegador Canônico Natural: Livro → Capítulo */}
          <div className="esp-bible-nav-bar">
            <div className="esp-nav-field">
              <label htmlFor="select-book" className="dm-faint text-[11px] uppercase tracking-wider block mb-1">
                Livro ({CANON_66.length} livros)
              </label>
              <select
                id="select-book"
                className="dm-select text-[13px]"
                value={selectedBook}
                onChange={(e) => {
                  const newBook = e.target.value;
                  setSelectedBook(newBook);
                  setSelectedChapter(1);
                }}
              >
                <optgroup label="Novo Testamento">
                  {CANON_66.filter((b) => !OLD_TESTAMENT_CODES.has(b.code)).map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Antigo Testamento">
                  {CANON_66.filter((b) => OLD_TESTAMENT_CODES.has(b.code)).map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="esp-nav-field">
              <label htmlFor="select-chapter" className="dm-faint text-[11px] uppercase tracking-wider block mb-1">
                Capítulo (1 a {bookEntry.chapters})
              </label>
              <select
                id="select-chapter"
                className="dm-select text-[13px]"
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(Number(e.target.value))}
              >
                {Array.from({ length: bookEntry.chapters }, (_, i) => i + 1).map((ch) => (
                  <option key={ch} value={ch}>
                    Capítulo {ch}
                  </option>
                ))}
              </select>
            </div>

            <div className="esp-nav-actions">
              <button
                type="button"
                className="dm-btn"
                data-size="sm"
                onClick={() => setViewMode('estudo')}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">school</span>
                Aprofundar em Estudo
              </button>
            </div>
          </div>

          {/* Bíblia Aberta: Destaque da Leitura Atual */}
          <div className="esp-open-scripture">
            <div className="esp-passage-headline">
              <h2 className="esp-passage-name">
                {bookEntry.name} {selectedChapter}
              </h2>
              <p className="esp-passage-theme">{activePassage.theme}</p>
            </div>

            {/* Versículos representativos / Citação Principal */}
            <div className="esp-scripture-preview">
              {activePassage.verses.slice(0, 4).map((v) => (
                <p key={v.number} className={`esp-verse-line ${v.isKeyVerse ? 'esp-key-verse' : ''}`}>
                  <sup className="esp-verse-num">{v.number}</sup>
                  <span className="esp-verse-text">{v.text}</span>
                </p>
              ))}
              {activePassage.verses.length > 4 && (
                <p className="dm-faint text-[12px] italic mt-2">
                  + {activePassage.verses.length - 4} versículos neste capítulo.
                </p>
              )}
            </div>

            {/* Ação de Transição Direta para a Subexperiência de Estudo */}
            <div className="esp-passage-footer">
              <button
                type="button"
                className="dm-btn"
                data-variant="default"
                data-size="sm"
                onClick={() => setViewMode('estudo')}
              >
                <span>Entrar no Estudo Contemplativo</span>
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>

        {/* DIMENSÃO 3: ESTUDO — Destaque e Acesso à Subexperiência */}
        <section
          className="esp-sanctuary-block esp-study-preview-block dm-rise"
          style={{ ['--i' as string]: 3 }}
          aria-label="Dimensão de Estudo"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">school</span>
                <p className="dm-eyebrow">Dimensão 3 · Estudo da Palavra</p>
              </div>
              <h2 className="dm-h2 mt-1">Estudo Contemplativo sem Pressa</h2>
              <p className="dm-muted text-[13px] mt-1 max-w-xl">
                Não é um quiz e não é um teste. É um espaço de leitura lenta e três perguntas que tocam a inteligência e o coração: o que o texto apresenta, o que chamou atenção e como isso conversa com sua vida real.
              </p>
            </div>

            <button
              type="button"
              className="dm-btn"
              data-variant="default"
              data-size="sm"
              onClick={() => setViewMode('estudo')}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_stories</span>
              Abrir Estudo de {formatReference(activeRef, { names: true })}
            </button>
          </div>
        </section>

        {/* Reflexão Privada do Dia */}
        <section
          className="esp-sanctuary-block esp-reflection-block dm-rise"
          style={{ ['--i' as string]: 4 }}
          aria-label="Reflexão Privada"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">edit_note</span>
            <h2 className="dm-h2">Reflexão Pessoal Privada</h2>
          </div>
          <p className="dm-muted text-[13px] mt-0.5">
            Um diário silencioso guardado exclusivamente neste aparelho. Nenhuma IA lê este campo e ele nunca sai deste dispositivo.
          </p>

          <div className="mt-3">
            <textarea
              className="dm-field text-[13px]"
              rows={3}
              value={reflectionDraft}
              onChange={(e) => setReflectionDraft(e.target.value)}
              placeholder="O que tocou sua consciência ou oração hoje? Escreva com calma…"
              aria-label="Diário espiritual privado"
            />
            <div className="flex items-center justify-between gap-2 mt-2">
              <button
                type="button"
                className="dm-btn"
                data-size="sm"
                disabled={!reflectionDraft.trim()}
                onClick={() => {
                  addReflection(reflectionDraft);
                  setReflectionDraft('');
                }}
              >
                Guardar reflexão
              </button>
              <span className="dm-faint text-[12px]">
                {v.reflections.length === 0
                  ? 'Nenhuma nota gravada ainda.'
                  : `${v.reflections.length} reflexão${v.reflections.length > 1 ? 'ões' : ''} guardada${v.reflections.length > 1 ? 's' : ''}.`}
              </span>
            </div>
          </div>

          {v.reflections.length > 0 && (
            <ul className="esp-refl-list mt-3">
              {v.reflections.map((r) => (
                <li key={r.id}>
                  <span className="dm-faint text-[12px]">
                    {new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · {r.contentLength} caracteres
                  </span>
                  {shownReflections[r.id] === undefined ? (
                    <button
                      type="button"
                      className="dm-btn"
                      data-variant="quiet"
                      data-size="sm"
                      onClick={() =>
                        setShownReflections((s) => ({ ...s, [r.id]: readReflection(r.id) ?? '' }))
                      }
                    >
                      Reler
                    </button>
                  ) : (
                    <p className="esp-refl-text">{shownReflections[r.id]}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </AtmosphericSanctuary>
    </div>
  );
}
