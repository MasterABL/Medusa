'use client';

import React, { useState, useEffect } from 'react';
import { playFeedback } from '@/lib/audioFeedback';

interface EmailImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (content: string) => void;
  lastImportStatus?: { ok: boolean; message: string } | null;
}

const TEMPLATES = [
  {
    id: 'telemedicina',
    title: 'Telemedicina · Dra. Ana Souza',
    badge: 'Saúde · L2',
    text: `De: Clinica Central <agendamento@clinicacentral.com.br>
Assunto: Confirmação de Consulta - Dra. Ana Souza
Data: 2026-10-08T18:00:00

Olá, confirmamos sua teleconsulta com a Dra. Ana Souza para amanhã às 18:00.
O link de acesso ao Google Meet estará disponível 15 minutos antes do início.
Por favor confirme sua presença ou avise com antecedência em caso de imprevisto.`,
  },
  {
    id: 'faculdade',
    title: 'Faculdade · Trabalho Integrador',
    badge: 'Acadêmico · L2',
    text: `De: Prof. Roberto Mendes <roberto.mendes@faculdade.edu.br>
Assunto: Trabalho Integrador de Contabilidade - Entrega Final
Data: 2026-10-08T09:00:00

Prezados alunos,
Lembramos que o Trabalho Integrador de Contabilidade deve ser entregue amanhã até as 23:59 via portal acadêmico.
A atividade vale 40% da nota semestral e requer envio em formato PDF.
Tempo estimado para revisão e envio: cerca de 45 minutos.`,
  },
  {
    id: 'financeiro',
    title: 'Financeiro · Fatura Nubank',
    badge: 'Finanças · L3',
    text: `De: Nubank <fatura@nubank.com.br>
Assunto: Sua fatura de Outubro fechou - R$ 1.420,00
Data: 2026-10-07T14:30:00

Olá! A sua fatura do cartão Nubank no valor de R$ 1.420,00 vence no dia 12/10.
Você pode pagar pelo aplicativo utilizando saldo da conta ou gerar o boleto bancário.
Evite encargos por atraso pagando até a data de vencimento.`,
  },
  {
    id: 'informativo',
    title: 'Informativo · Architecture Weekly',
    badge: 'Leitura · L1',
    text: `De: Architecture Weekly <newsletter@archweekly.io>
Assunto: Architecture Weekly #142 - Padrões em Sistemas Pessoais Autônomos
Data: 2026-10-07T11:00:00

Nesta edição semanal, exploramos como o conceito de Personal OS está redefinindo o design de sistemas cognitivos e a governança de agentes locais.
Uma leitura de 8 minutos para o seu café da tarde. Sem prazos ou ações imediatas requeridas.`,
  },
];

export function EmailImportModal({ isOpen, onClose, onImport, lastImportStatus }: EmailImportModalProps) {
  const [content, setContent] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setContent('');
      setSelectedTemplateId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
    playFeedback('press');
    setSelectedTemplateId(template.id);
    setContent(template.text);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    playFeedback('action');
    onImport(content);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-import-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="w-full max-w-2xl bg-surface border border-border/80 rounded-2xl shadow-floating overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-medusa-primary living-pulse" />
            <h2 id="email-import-modal-title" className="text-base font-semibold text-text-primary">
              Importar / Colar E-mail no Provedor Local
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              playFeedback('close');
              onClose();
            }}
            aria-label="Fechar janela"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Explanatory callout */}
          <div className="p-3.5 rounded-xl bg-medusa-primary/10 border border-medusa-primary/20 text-text-secondary text-xs leading-relaxed flex items-start gap-3">
            <span className="material-symbols-outlined text-medusa-primary text-[18px] flex-shrink-0 mt-0.5">
              shield_person
            </span>
            <div>
              <span className="font-semibold text-text-primary block mb-0.5">
                Privacidade por Desenho & Provedor Local
              </span>
              O Medusa processa esta mensagem no runtime da sua máquina. O motor analisa risco, extrai
              entidades e formula propostas para o Guardian sem conectar à nuvem e sem expor dados.
            </div>
          </div>

          {/* Quick Templates */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2 font-semibold">
              Modelos Rápidos Canônicos:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`text-left p-3 rounded-xl border text-xs transition-all flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'border-medusa-primary bg-medusa-primary/10 shadow-subtle'
                        : 'border-border/60 bg-surface-secondary/50 hover:bg-surface-secondary hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-text-primary truncate">{tmpl.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border/60 text-text-muted">
                        {tmpl.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-muted line-clamp-1">
                      {tmpl.text.split('\n')[1]?.replace('Assunto: ', '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="email-raw-input" className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold">
                Texto do E-mail (com cabeçalhos ou livre):
              </label>
              <span className="text-[10px] font-mono text-text-muted">
                {content.length} caracteres
              </span>
            </div>
            <textarea
              id="email-raw-input"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Cole aqui o e-mail completo com cabeçalhos:\n\nDe: nome@exemplo.com\nAssunto: Título da mensagem\nData: 2026-10-08T14:00:00\n\nCorpo da mensagem com o conteúdo...`}
              className="w-full p-3.5 rounded-xl bg-surface-secondary/60 border border-border/80 text-text-primary placeholder:text-text-muted/60 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-medusa-primary/50 focus:border-medusa-primary resize-y"
            />
          </div>

          {/* Status Message */}
          {lastImportStatus && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                lastImportStatus.ok
                  ? 'bg-[#18534B]/10 text-[#18534B] dark:text-[#71DBD2] border border-[#18534B]/20'
                  : 'bg-[#C45B5B]/10 text-[#C45B5B] border border-[#C45B5B]/20'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {lastImportStatus.ok ? 'check_circle' : 'error'}
              </span>
              <span>{lastImportStatus.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/60 bg-surface-secondary/30">
          <button
            type="button"
            onClick={() => {
              playFeedback('press');
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-medusa-primary text-[#1C2420] shadow-subtle hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            <span>Processar Mensagem</span>
          </button>
        </div>
      </div>
    </div>
  );
}
