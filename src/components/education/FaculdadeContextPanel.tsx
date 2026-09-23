'use client';

import React, { useRef, useState } from 'react';
import { TRACK_DEFINITIONS } from './educationFixtures';
import { ContextPanelSection } from '@/components/shell/ContextPanelSection';
import { useEducationPanel } from '@/context/EducationPanelContext';
import { NoticeSeverity } from './types';

const MATERIAL_ICON: Record<string, string> = {
  pdf: 'picture_as_pdf',
  slides: 'slideshow',
  planilha: 'table_chart',
  imagem: 'image',
};

const NOTICE_STYLE: Record<NoticeSeverity, { icon: string; className: string }> = {
  informativo: { icon: 'info', className: 'text-medusa-primary' },
  atencao: { icon: 'error_outline', className: 'text-[#8A6D00] dark:text-medusa-accent' },
  urgente: { icon: 'warning', className: 'text-medusa-alert' },
};

// Semana de referência (mesma âncora usada no cronograma do ENEM): hoje = Terça-feira, 22/Set.
// Um prazo cujo rótulo é literalmente "hoje" ou "amanhã" (regra <48h) ganha destaque de urgência
// real — nunca aplicado a datas distantes ("10/Out") só por estarem em uma lista de prazos.
const URGENT_DEADLINE_LABELS = ['Terça-feira', 'Quarta-feira'];

function inferFileKind(fileName: string): 'pdf' | 'slides' | 'planilha' | 'imagem' {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['ppt', 'pptx', 'key'].includes(ext)) return 'slides';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'planilha';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'imagem';
  return 'pdf';
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SessionUploadedFile {
  id: string;
  name: string;
  kind: 'pdf' | 'slides' | 'planilha' | 'imagem';
  sizeLabel: string;
  objectUrl: string;
}

/**
 * Painel contextual da Faculdade — composição-base (Contexto → Próxima Ação → Domínio →
 * Revisões → Cronograma, ver DESIGN.md) + Avisos com semântica visual real e um card de
 * Materiais com upload de verdade (File API do navegador, arrastar-e-soltar ou seleção manual).
 *
 * AUDITORIA ANTI-FICÇÃO: o upload é real (o navegador lê o arquivo de verdade e permite abri-lo
 * via `URL.createObjectURL`), mas a persistência é escopo-de-sessão — vive só em memória deste
 * componente React. Recarregar a página (F5) ou trocar de disciplina e voltar depois de um
 * refresh perde os arquivos adicionados nesta sessão, porque não existe um backend de Storage
 * real conectado a este fluxo ainda. Isso é dito explicitamente na UI (não fingido como
 * persistência real).
 */
export function FaculdadeContextPanel() {
  const trackDef = TRACK_DEFINITIONS.faculdade;
  const { faculdadeDisciplineCode, openReviewModal } = useEducationPanel();
  const disciplines = trackDef.disciplines ?? [];
  const selected = disciplines.find((d) => d.code === faculdadeDisciplineCode) ?? disciplines[0];

  const [uploadsByDiscipline, setUploadsByDiscipline] = useState<Record<string, SessionUploadedFile[]>>({});
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!selected) return null;

  const sessionUploads = uploadsByDiscipline[selected.code] ?? [];

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: SessionUploadedFile[] = Array.from(files).map((file) => ({
      id: `upload-${selected.code}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      kind: inferFileKind(file.name),
      sizeLabel: formatSize(file.size),
      objectUrl: URL.createObjectURL(file),
    }));
    setUploadsByDiscipline((prev) => ({
      ...prev,
      [selected.code]: [...(prev[selected.code] ?? []), ...added],
    }));
  };

  const removeUpload = (id: string) => {
    setUploadsByDiscipline((prev) => ({
      ...prev,
      [selected.code]: (prev[selected.code] ?? []).filter((f) => {
        if (f.id === id) {
          URL.revokeObjectURL(f.objectUrl);
          return false;
        }
        return true;
      }),
    }));
  };

  const contentToShow = selected.content;
  const completedCount = contentToShow.filter((m) => m.status === 'completed').length;
  const totalCount = contentToShow.length;
  const masteryPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextAction = contentToShow.find((m) => m.status !== 'completed');
  const reviewCandidates = contentToShow.filter((m) => m.status === 'completed').slice(0, 2);

  const notices: { text: string; severity: NoticeSeverity }[] =
    selected.noticeDetails ?? selected.notices.map((text) => ({ text, severity: 'informativo' as NoticeSeverity }));

  return (
    <div id="context-panel-track-faculdade" key={selected.code} className="flex flex-col gap-6 study-summary-enter">
      {/* 1. CONTEXTO DA TRILHA — compacto */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[16px] text-medusa-primary flex-shrink-0">school</span>
          <span className="text-[11px] font-semibold text-text-primary truncate">
            {selected.code} · {selected.title}
          </span>
        </div>
        <span className="text-[10px] font-mono text-text-muted flex-shrink-0">{selected.credits} créditos</span>
      </div>
      <p className="text-[11px] text-text-secondary -mt-4">{selected.dateRange}</p>

      {/* 2. PRÓXIMA AÇÃO — protagonista do painel */}
      {nextAction && (
        <ContextPanelSection label="Próxima Ação">
          <div id="panel-next-action-faculdade" className="p-3.5 rounded-xl bg-medusa-primary/10 border border-medusa-primary/30 flex flex-col gap-1">
            <h4 className="text-[13px] font-semibold text-text-primary leading-snug">{nextAction.title}</h4>
            <p className="text-[11px] text-text-secondary">{selected.focusDuration} · {nextAction.code}</p>
          </div>
        </ContextPanelSection>
      )}

      {/* 3. DOMÍNIO — calculado ao vivo a partir do progresso real de conteúdos da disciplina */}
      <ContextPanelSection label="Domínio da Disciplina Ativa">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">{masteryPercent}%</span>
          <span className="text-[11px] text-text-secondary">{completedCount}/{totalCount} conteúdos</span>
        </div>
        <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
          <div
            className={`${masteryPercent >= 70 ? 'bg-medusa-support' : 'bg-medusa-accent'} h-full rounded-full transition-all duration-500`}
            style={{ width: `${masteryPercent}%` }}
          />
        </div>
      </ContextPanelSection>

      {/* 4. PRÓXIMAS REVISÕES — destino real: mesmo modal usado por "Aulas Concluídas" no Hub */}
      {reviewCandidates.length > 0 && (
        <ContextPanelSection label="Próximas Revisões">
          <div id="panel-reviews-faculdade" className="flex flex-col gap-2">
            {reviewCandidates.map((m) => (
              <div key={m.id} className="p-3 rounded-xl bg-surface/70 border border-border/50 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h5 className="text-[12px] font-semibold text-text-primary truncate">{m.title}</h5>
                  <p className="text-[11px] text-text-muted truncate">{m.code} · Próxima revisão: {trackDef.nextReviewSuggestion}</p>
                </div>
                <button
                  type="button"
                  id={`btn-panel-review-${m.id}`}
                  onClick={() =>
                    openReviewModal({
                      id: m.id,
                      title: m.title,
                      subtitle: m.code,
                      completedAt: m.date,
                      durationMinutes: undefined,
                    })
                  }
                  className="flex-shrink-0 text-[11px] font-mono text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2.5 py-1 rounded-full border border-[#71DBD2]/30 hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  Revisão
                </button>
              </div>
            ))}
          </div>
        </ContextPanelSection>
      )}

      {/* 5. CRONOGRAMA DA SEMANA = prazos com urgência semântica real (<48h) */}
      {selected.deadlines.length > 0 && (
        <ContextPanelSection label="Cronograma da Semana">
          <div className="flex flex-col gap-1.5">
            {selected.deadlines.map((dl) => {
              const isUrgent = URGENT_DEADLINE_LABELS.includes(dl.date);
              return (
                <div key={dl.id} className="flex items-center justify-between text-[12px]">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    {isUrgent && <span className="material-symbols-outlined text-[14px] text-medusa-alert">warning</span>}
                    {dl.label}
                  </span>
                  <span className={`font-mono text-[11px] ${isUrgent ? 'text-medusa-alert font-semibold' : 'text-text-muted'}`}>
                    {dl.date}
                  </span>
                </div>
              );
            })}
          </div>
        </ContextPanelSection>
      )}

      {/* Avisos — semântica visual real (informativo/atenção/urgente), nunca tudo vermelho */}
      {notices.length > 0 && (
        <ContextPanelSection label="Avisos">
          <div id="context-panel-faculdade-notices" className="flex flex-col gap-1.5">
            {notices.map((notice, i) => {
              const style = NOTICE_STYLE[notice.severity];
              return (
                <div key={i} className="flex items-start gap-1.5 text-[12px] text-text-secondary">
                  <span className={`material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0 ${style.className}`}>
                    {style.icon}
                  </span>
                  <span>{notice.text}</span>
                </div>
              );
            })}
          </div>
        </ContextPanelSection>
      )}

      {/* Materiais — upload real via File API (sessão apenas, sem backend de Storage) */}
      <ContextPanelSection label="Materiais" noBorder>
        <div
          id="faculdade-materials-dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`rounded-xl border-2 border-dashed p-3 flex flex-col items-center gap-1.5 text-center transition-colors ${
            isDraggingOver ? 'border-medusa-primary bg-medusa-primary/10' : 'border-border/60 bg-surface-subtle/50'
          }`}
        >
          <span className="material-symbols-outlined text-[22px] text-text-muted">upload_file</span>
          <p className="text-[11px] text-text-secondary">Arraste o PDF da aula aqui</p>
          <button
            type="button"
            id="btn-faculdade-select-file"
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] font-mono text-[#18534B] dark:text-[#71DBD2] hover:opacity-80 underline underline-offset-2"
          >
            ou selecionar arquivo
          </button>
          <input
            ref={fileInputRef}
            id="faculdade-material-file-input"
            type="file"
            multiple
            accept=".pdf,.ppt,.pptx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5 mt-2">
          {selected.materials.map((mat) => (
            <div key={mat.id} className="flex items-center justify-between gap-2 text-[12px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-[15px] text-text-muted flex-shrink-0">
                  {MATERIAL_ICON[mat.kind]}
                </span>
                <span className="text-text-secondary truncate">{mat.name}</span>
              </div>
              <span className="text-[10px] font-mono text-text-muted flex-shrink-0">{mat.sizeLabel}</span>
            </div>
          ))}

          {sessionUploads.map((file) => (
            <a
              key={file.id}
              href={file.objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 text-[12px] group"
              title="Abrir arquivo enviado nesta sessão"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-[15px] text-medusa-primary flex-shrink-0">
                  {MATERIAL_ICON[file.kind]}
                </span>
                <span className="text-text-primary truncate underline-offset-2 group-hover:underline">{file.name}</span>
                <span className="text-[9px] font-mono uppercase text-medusa-primary bg-medusa-primary/15 px-1.5 py-0.5 rounded flex-shrink-0">
                  novo
                </span>
              </div>
              <span className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-mono text-text-muted">{file.sizeLabel}</span>
                <button
                  type="button"
                  aria-label={`Remover ${file.name}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeUpload(file.id);
                  }}
                  className="text-text-muted hover:text-medusa-alert focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none rounded-full"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              </span>
            </a>
          ))}

          {selected.materials.length === 0 && sessionUploads.length === 0 && (
            <p className="text-[11px] text-text-muted italic">Nenhum material disponível ainda para esta disciplina.</p>
          )}
        </div>

        <p className="text-[10px] text-text-muted italic mt-2 leading-relaxed">
          Arquivos enviados aqui ficam disponíveis só nesta sessão do navegador (sem backend de
          armazenamento conectado ainda) — recarregar a página os remove.
        </p>
      </ContextPanelSection>
    </div>
  );
}
