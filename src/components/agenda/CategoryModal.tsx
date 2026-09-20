/**
 * Medusa — Category Management Modal
 *
 * Permite criar e editar categorias personalizadas vinculadas aos domínios do Medusa.
 * Oferece seletor visual interativo das 24 cores pastel/soft canônicas.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AgendaCategory, AgendaDomain } from '@/types/agenda';
import { useShell } from '@/context/ShellContext';
import { PASTEL_PALETTE, getPastelThemeStyle } from './palette';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: AgendaCategory[];
  onSaveCategory: (category: AgendaCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
}

export function CategoryModal({
  isOpen,
  onClose,
  categories,
  onSaveCategory,
  onDeleteCategory,
}: CategoryModalProps) {
  const { theme } = useShell();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState<AgendaDomain>('education');
  const [colorId, setColorId] = useState('lavanda');
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Tecla Escape para fechar
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

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDomain('education');
    setColorId('lavanda');
    setError(null);
  };

  const handleEditClick = (cat: AgendaCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDomain(cat.domain);
    setColorId(cat.colorId);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Informe o nome da categoria.');
      return;
    }

    onSaveCategory({
      id: editingId || `cat-custom-${Date.now()}`,
      name: name.trim(),
      domain,
      colorId,
      isCustom: true,
    });

    resetForm();
  };

  const activeColorStyle = getPastelThemeStyle(colorId, theme);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-surface rounded-2xl border border-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header do Modal */}
        <div className="p-5 sm:p-6 border-b border-border/70 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              Personalização Visual
            </span>
            <h2 id="category-modal-title" className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
              Gerenciar Categorias &amp; Cores
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar categorias"
            className="btn-interactive p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Formulário de Criação/Edição */}
          <form onSubmit={handleSubmit} className="p-4 bg-surface-secondary/40 rounded-xl border border-border/60 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-mono uppercase tracking-wider font-semibold text-text-primary">
                {editingId ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] font-mono text-text-muted hover:text-text-primary underline"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            {error && (
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="cat-name-input" className="block text-[10px] font-mono uppercase text-text-muted">
                  Nome
                </label>
                <input
                  id="cat-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: TCC, Natação, Freelance..."
                  className="w-full bg-surface border border-border/80 rounded-lg px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="cat-domain-select" className="block text-[10px] font-mono uppercase text-text-muted">
                  Domínio Associado
                </label>
                <select
                  id="cat-domain-select"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value as AgendaDomain)}
                  className="w-full bg-surface border border-border/80 rounded-lg px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
                >
                  <option value="education">Educação</option>
                  <option value="body">Corpo</option>
                  <option value="finance">Finanças</option>
                  <option value="work">Trabalho</option>
                  <option value="personal">Pessoal</option>
                  <option value="external">Externo</option>
                </select>
              </div>
            </div>

            {/* Grid das 24 Cores Pastel/Soft */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-text-muted">
                  Paleta de Cores (24 Tons Pastel)
                </span>
                <span className="text-[11px] font-mono text-text-secondary">
                  Selecionado: <strong>{activeColorStyle.name}</strong>
                </span>
              </div>

              <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5 p-2 bg-surface rounded-xl border border-border/60">
                {PASTEL_PALETTE.map((color) => {
                  const isCurrent = color.id === colorId;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setColorId(color.id)}
                      title={color.name}
                      aria-label={`Selecionar cor ${color.name}`}
                      style={{ backgroundColor: color.swatch }}
                      className={`w-7 h-7 rounded-lg transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring flex items-center justify-center ${
                        isCurrent
                          ? 'ring-2 ring-medusa-primary scale-110 shadow-sm'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {isCurrent && (
                        <span className="material-symbols-outlined text-[14px] text-gray-900 drop-shadow-sm font-bold">
                          check
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview da Categoria */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-text-muted uppercase">Preview:</span>
                <span
                  className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-subtle"
                  style={{
                    backgroundColor: activeColorStyle.bg,
                    borderColor: activeColorStyle.border,
                    color: activeColorStyle.text,
                  }}
                >
                  {name || 'Nome da Categoria'}
                </span>
              </div>

              <button
                type="submit"
                className="btn-interactive px-4 py-2 rounded-xl bg-medusa-primary text-[#1C2420] text-[12px] font-semibold hover:brightness-105 shadow-subtle"
              >
                {editingId ? 'Salvar Categoria' : '+ Adicionar Categoria'}
              </button>
            </div>
          </form>

          {/* Lista de Categorias Ativas */}
          <div className="space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
              Categorias Existentes ({categories.length})
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {categories.map((cat) => {
                const style = getPastelThemeStyle(cat.colorId, theme);
                return (
                  <div
                    key={cat.id}
                    className="p-2.5 bg-surface-secondary/40 rounded-xl border border-border/70 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: style.accent }}
                      />
                      <span
                        className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full border truncate"
                        style={{
                          backgroundColor: style.bg,
                          borderColor: style.border,
                          color: style.text,
                        }}
                      >
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono truncate">
                        ({cat.domain})
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditClick(cat)}
                        aria-label={`Editar categoria ${cat.name}`}
                        className="btn-interactive p-1 text-text-muted hover:text-text-primary rounded hover:bg-surface"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                      {cat.isCustom && (
                        <button
                          type="button"
                          onClick={() => onDeleteCategory(cat.id)}
                          aria-label={`Excluir categoria ${cat.name}`}
                          className="btn-interactive p-1 text-text-muted hover:text-rose-600 rounded hover:bg-surface"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé com botão Concluir */}
        <div className="p-4 border-t border-border/70 flex justify-end bg-surface">
          <button
            type="button"
            onClick={onClose}
            className="btn-interactive px-5 py-2 rounded-xl bg-surface-secondary hover:bg-surface-subtle text-text-primary text-[12px] font-medium border border-border"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
