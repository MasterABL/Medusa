'use client';

import React, { useState } from 'react';
import { formatReference, type BibleReference } from '@/domains/spiritual';
import { getPassageData } from './biblePassages';
import { addStudyNote, concludeStudy, ensureStudy, getData, useSpiritualState } from './spiritualSession';

interface EspiritualEstudoProps {
  reference: BibleReference;
  onBack: () => void;
}

export function EspiritualEstudo({ reference, onBack }: EspiritualEstudoProps) {
  const { version } = useSpiritualState();
  const passage = getPassageData(reference.book, reference.chapter);
  const study = ensureStudy(reference);
  const studyData = getData().studies.find((s) => s.id === study.id) || study;

  // Local note drafts
  const [observeDraft, setObserveDraft] = useState('');
  const [personalDraft, setPersonalDraft] = useState('');
  const [lifeDraft, setLifeDraft] = useState('');
  const [concludingText, setConcludingText] = useState('');
  const [aiExpanded, setAiExpanded] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  // AI assistant preview
  const aiAssistQuestions = [
    {
      q: 'Qual o contexto histórico e cultural desta passagem?',
      ans: `No contexto do primeiro século sob a Pax Romana, este texto oferece um contraste profundo entre o poder impositivo e a paz interior oferecida por Cristo. A promessa é de presença e fidelidade, não de ausência de aflições externas.`,
    },
    {
      q: 'O que a palavra original expressa no hebraico/grego?',
      ans: passage.exegeticalNotes?.[0]
        ? `${passage.exegeticalNotes[0].transliteration} (${passage.exegeticalNotes[0].wordOriginal}): ${passage.exegeticalNotes[0].meaning} ${passage.exegeticalNotes[0].contrastContext}`
        : 'Os termos originais enfatizam integridade do coração, confiança firme e aliança contínua com Deus.',
    },
    {
      q: 'Quais perguntas ajudam a aprofundar minha meditação pessoal?',
      ans: '1. Onde hoje me sinto tentado a perder a paz?\n2. O que me impede de descansar na promessa deste texto?\n3. Que atitude prática de amor e serenidade posso exercer nas próximas horas?',
    },
  ];

  const handleSaveNote = (stage: 'observacao' | 'interpretacao' | 'aplicacao', text: string) => {
    if (!text.trim()) return;
    addStudyNote(study.id, stage, text);
    if (stage === 'observacao') setObserveDraft('');
    if (stage === 'interpretacao') setPersonalDraft('');
    if (stage === 'aplicacao') setLifeDraft('');
  };

  const handleConclude = () => {
    if (!concludingText.trim()) return;
    concludeStudy(study.id, concludingText);
    setConcludingText('');
  };

  const name = formatReference(reference, { names: true });

  return (
    <div className="esp-study-subexperience dm-rise" aria-label={`Estudo aprofundado de ${name}`}>
      {/* Top Navigation & Breadcrumbs */}
      <div className="esp-study-nav">
        <button
          type="button"
          className="dm-btn"
          data-variant="quiet"
          data-size="sm"
          onClick={onBack}
        >
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          Voltar ao Santuário
        </button>
        <div className="esp-study-breadcrumbs">
          <span className="dm-faint text-[12px]">Espiritual</span>
          <span className="dm-faint text-[12px]">/</span>
          <span className="text-[12px] font-medium">Estudo Contemplativo</span>
        </div>
      </div>

      {/* Header Editorial */}
      <header className="esp-study-header">
        <p className="dm-eyebrow">Leitura & Reflexão Guiada</p>
        <h1 className="esp-study-title">{name}</h1>
        <p className="esp-study-theme">{passage.theme}</p>
        <div className="esp-study-meta">
          <span className="dm-faint text-[12px]">
            Tradução: {passage.translation}
          </span>
          {passage.isDemoText && (
            <span className="esp-demo-tag">Demonstração canônica</span>
          )}
        </div>
      </header>

      {/* Subexperiência em 2 Colunas no Desktop */}
      <div className="esp-study-grid">
        {/* Coluna da Esquerda: A Passagem Aberta */}
        <section className="esp-study-passage-col" aria-label="Texto da Escritura">
          <div className="esp-scripture-book">
            <div className="esp-book-header">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">menu_book</span>
              <span className="dm-eyebrow text-[11px]">Passagem Completa</span>
            </div>

            <div className="esp-scripture-verses">
              {passage.verses.map((v) => (
                <p key={v.number} className={`esp-verse-line ${v.isKeyVerse ? 'esp-key-verse' : ''}`}>
                  <sup className="esp-verse-num">{v.number}</sup>
                  <span className="esp-verse-text">{v.text}</span>
                </p>
              ))}
            </div>

            {/* Notas de Vocabulário Original */}
            {passage.exegeticalNotes && passage.exegeticalNotes.length > 0 && (
              <div className="esp-exegetical-box">
                <div className="flex items-center gap-1.5 text-primary mb-1">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_stories</span>
                  <span className="text-[12px] font-semibold uppercase tracking-wider">Vocabulário Original</span>
                </div>
                {passage.exegeticalNotes.map((n, i) => (
                  <div key={i} className="text-[13px] leading-relaxed">
                    <p className="font-medium text-text-primary">
                      <span className="text-primary font-mono">{n.wordOriginal}</span> · {n.transliteration} ({n.language})
                    </p>
                    <p className="dm-muted mt-1">{n.meaning}</p>
                    <p className="dm-faint text-[12px] mt-1">{n.contrastContext}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Conexões Escriturais */}
            {passage.crossReferences && passage.crossReferences.length > 0 && (
              <div className="esp-cross-refs">
                <span className="dm-faint text-[11px] uppercase tracking-wider block mb-1">Conexões Escriturais</span>
                <div className="flex flex-wrap gap-2">
                  {passage.crossReferences.map((ref) => (
                    <span key={ref} className="esp-ref-pill">{ref}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Coluna da Direita: Os 3 Passos Contemplativos */}
        <section className="esp-study-inquiry-col" aria-label="Jornada de Estudo">
          {/* Passo 1: O que esse texto apresenta? */}
          <article className="esp-inquiry-step">
            <div className="esp-step-header">
              <span className="esp-step-num">1</span>
              <div>
                <h2 className="esp-step-title">O que esse texto apresenta?</h2>
                <p className="dm-faint text-[12px]">Observe os fatos, os verbos, as promessas e o tom da passagem.</p>
              </div>
            </div>

            <div className="esp-notes-list">
              {studyData.notes.filter((n) => n.stage === 'observacao').map((n) => (
                <div key={n.id} className="esp-note-item">
                  <p className="text-[13px] text-text-primary leading-relaxed">{n.text}</p>
                  <span className="dm-faint text-[11px] block mt-1">Salvo no seu dispositivo</span>
                </div>
              ))}
            </div>

            <div className="esp-input-box">
              <textarea
                className="dm-field text-[13px]"
                rows={2}
                value={observeDraft}
                onChange={(e) => setObserveDraft(e.target.value)}
                placeholder="O que você nota de mais marcante nos verbos ou na cena descrita?"
                aria-label="Anotação de observação"
              />
              <button
                type="button"
                className="dm-btn"
                data-size="sm"
                disabled={!observeDraft.trim()}
                onClick={() => handleSaveNote('observacao', observeDraft)}
              >
                Guardar observação
              </button>
            </div>
          </article>

          {/* Passo 2: O que chamou minha atenção? */}
          <article className="esp-inquiry-step">
            <div className="esp-step-header">
              <span className="esp-step-num">2</span>
              <div>
                <h2 className="esp-step-title">O que chamou minha atenção?</h2>
                <p className="dm-faint text-[12px]">Qual palavra, frase ou promessa ecoou na sua consciência?</p>
              </div>
            </div>

            <div className="esp-notes-list">
              {studyData.notes.filter((n) => n.stage === 'interpretacao').map((n) => (
                <div key={n.id} className="esp-note-item">
                  <p className="text-[13px] text-text-primary leading-relaxed">{n.text}</p>
                  <span className="dm-faint text-[11px] block mt-1">Salvo no seu dispositivo</span>
                </div>
              ))}
            </div>

            <div className="esp-input-box">
              <textarea
                className="dm-field text-[13px]"
                rows={2}
                value={personalDraft}
                onChange={(e) => setPersonalDraft(e.target.value)}
                placeholder="Escreva a impressão ou inquietação que esta leitura despertou…"
                aria-label="Anotação de interpretação"
              />
              <button
                type="button"
                className="dm-btn"
                data-size="sm"
                disabled={!personalDraft.trim()}
                onClick={() => handleSaveNote('interpretacao', personalDraft)}
              >
                Guardar reflexão
              </button>
            </div>
          </article>

          {/* Passo 3: Como isso conversa com minha vida? */}
          <article className="esp-inquiry-step">
            <div className="esp-step-header">
              <span className="esp-step-num">3</span>
              <div>
                <h2 className="esp-step-title">Como isso conversa com minha vida?</h2>
                <p className="dm-faint text-[12px]">Que decisão, paciência, perdão ou atitude sincera isso pede hoje?</p>
              </div>
            </div>

            <div className="esp-notes-list">
              {studyData.notes.filter((n) => n.stage === 'aplicacao').map((n) => (
                <div key={n.id} className="esp-note-item">
                  <p className="text-[13px] text-text-primary leading-relaxed">{n.text}</p>
                  <span className="dm-faint text-[11px] block mt-1">Salvo no seu dispositivo</span>
                </div>
              ))}
            </div>

            <div className="esp-input-box">
              <textarea
                className="dm-field text-[13px]"
                rows={2}
                value={lifeDraft}
                onChange={(e) => setLifeDraft(e.target.value)}
                placeholder="Como posso viver essa verdade nas minhas relações ou trabalho hoje?"
                aria-label="Anotação de aplicação"
              />
              <button
                type="button"
                className="dm-btn"
                data-size="sm"
                disabled={!lifeDraft.trim()}
                onClick={() => handleSaveNote('aplicacao', lifeDraft)}
              >
                Guardar para o dia
              </button>
            </div>
          </article>

          {/* Conclusão Final do Estudo */}
          <div className="esp-conclude-block">
            {studyData.concluded ? (
              <div className="esp-concluded-card">
                <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">check_circle</span>
                <div>
                  <p className="text-[12px] uppercase font-semibold text-primary">Estudo Concluído</p>
                  <p className="text-[13px] text-text-primary mt-1 leading-relaxed">
                    “{studyData.concluded.text}”
                  </p>
                </div>
              </div>
            ) : (
              <div className="esp-inquiry-step">
                <h2 className="esp-step-title">Concluir Estudo</h2>
                <p className="dm-faint text-[12px]">Sintetize em uma frase o que fica desta passagem no seu coração.</p>
                <textarea
                  className="dm-field text-[13px] mt-2"
                  rows={2}
                  value={concludingText}
                  onChange={(e) => setConcludingText(e.target.value)}
                  placeholder="Em resumo: o que levo desta meditação…"
                  aria-label="Conclusão do estudo"
                />
                <button
                  type="button"
                  className="dm-btn mt-2"
                  data-size="sm"
                  disabled={!concludingText.trim()}
                  onClick={handleConclude}
                >
                  Concluir estudo
                </button>
              </div>
            )}
          </div>

          {/* Espaço Arquitetado para Futuro Companheiro de Estudo IA */}
          <div className="esp-ai-companion-slot">
            <button
              type="button"
              className="esp-ai-header-btn"
              onClick={() => setAiExpanded(!aiExpanded)}
              aria-expanded={aiExpanded}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">psychology</span>
                <span className="text-[13px] font-medium text-text-primary">Companheiro de Estudo (IA Assistiva)</span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-text-muted" aria-hidden="true">
                {aiExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {aiExpanded && (
              <div className="esp-ai-body dm-rise">
                <div className="esp-ai-disclaimer">
                  <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">info</span>
                  <p className="text-[12px] text-text-muted leading-relaxed">
                    A IA auxilia com contexto histórico, traduções comparadas e perguntas reflexivas. Ela nunca substitui o discernimento pessoal e <strong>não possui autoridade espiritual nem fala em nome de Deus</strong>.
                  </p>
                </div>

                <p className="dm-eyebrow mt-3 text-[11px]">Perguntas Contextuais de Apoio</p>
                <div className="flex flex-col gap-2 mt-1.5">
                  {aiAssistQuestions.map((q, i) => (
                    <div key={i} className="esp-ai-q-box">
                      <button
                        type="button"
                        className="esp-ai-q-btn"
                        onClick={() => setSelectedQuestion(selectedQuestion === q.q ? null : q.q)}
                      >
                        <span className="text-[12px] font-medium text-text-primary text-left">{q.q}</span>
                        <span className="material-symbols-outlined text-[16px] text-text-muted" aria-hidden="true">
                          {selectedQuestion === q.q ? 'remove' : 'add'}
                        </span>
                      </button>
                      {selectedQuestion === q.q && (
                        <div className="esp-ai-ans dm-rise">
                          <p className="text-[12px] text-text-muted leading-relaxed whitespace-pre-line">{q.ans}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
