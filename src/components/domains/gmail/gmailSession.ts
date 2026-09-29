'use client';

/**
 * Sessão da aba Gmail. NENHUM Gmail real está conectado: as mensagens são DADOS DE DEMONSTRAÇÃO
 * e a "IA" é uma tabela fixa de classificação (não um modelo). Tudo o que a tela permite — organizar,
 * arquivar, corrigir categoria, propor evento — age só neste estado em memória, e o que exigiria
 * efeito fora dele (responder, criar evento) é apenas PROPOSTO, nunca executado.
 */

import { createUiStore, useUiStore } from '../shared/uiStore';

export type Categoria = 'responder' | 'prazo' | 'financeiro' | 'faculdade' | 'pessoal' | 'informativo' | 'promocional';
export type Prioridade = 'alta' | 'media' | 'baixa';
export type Acao = 'responder' | 'criar_evento' | 'arquivar' | 'ler_depois';

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  responder: 'Precisa de resposta', prazo: 'Prazo', financeiro: 'Financeiro', faculdade: 'Faculdade', pessoal: 'Pessoal', informativo: 'Informativo', promocional: 'Promocional',
};
export const ACAO_LABEL: Record<Acao, string> = { responder: 'Responder', criar_evento: 'Propor evento na Agenda', arquivar: 'Arquivar', ler_depois: 'Ler depois' };

export interface Classificacao {
  categoria: Categoria;
  prioridade: Prioridade;
  resumo: string;
  motivo: string;
  confianca: number;
  acao?: Acao;
  prazo?: string;
}

export interface Mensagem {
  id: string;
  de: string;
  email: string;
  assunto: string;
  previa: string;
  corpo: string;
  horasAtras: number;
  lida: boolean;
  estrela: boolean;
  arquivada: boolean;
  /** Classificação que a IA de demonstração ainda vai produzir; `ia` só existe depois de "Organizar". */
  ia?: Classificacao;
  /** Correção feita pela pessoa: vale mais que a IA e conta como aprendizado. */
  corrigidaPara?: Categoria;
  /** Sugestão da IA ainda pendente de decisão. */
  sugestaoPendente?: boolean;
  eventoProposto?: boolean;
  rascunho?: string;
}

interface Seed { msg: Omit<Mensagem, 'ia' | 'sugestaoPendente' | 'arquivada' | 'estrela' | 'corrigidaPara'>; ia: Classificacao }

const SEEDS: Seed[] = [
  { msg: { id: 'm1', de: 'Coordenação do polo (exemplo)', email: 'polo@exemplo.edu', assunto: 'Prorrogação da entrega do projeto multidisciplinar', previa: 'A entrega foi prorrogada até sexta-feira, 18h…', corpo: 'Prezados alunos, a entrega do Projeto Multidisciplinar foi prorrogada até sexta-feira às 18h. Não haverá nova prorrogação. Enviem pelo ambiente virtual.', horasAtras: 2, lida: false },
    ia: { categoria: 'prazo', prioridade: 'alta', resumo: 'Entrega do projeto prorrogada até sexta, 18h. Sem nova prorrogação.', motivo: 'Contém data-limite e a palavra "não haverá nova prorrogação".', confianca: 0.93, acao: 'criar_evento', prazo: 'sexta, 18h' } },
  { msg: { id: 'm2', de: 'Marina (exemplo)', email: 'marina@exemplo.com', assunto: 'Você consegue revisar o texto até amanhã?', previa: 'Oi! Preciso da sua opinião no rascunho antes de enviar…', corpo: 'Oi! Preciso da sua opinião no rascunho antes de enviar para o editor. Consegue dar uma olhada até amanhã de manhã? Obrigada!', horasAtras: 5, lida: false },
    ia: { categoria: 'responder', prioridade: 'alta', resumo: 'Marina pede revisão de um texto até amanhã de manhã.', motivo: 'Pergunta direta a você, com prazo curto.', confianca: 0.88, acao: 'responder', prazo: 'amanhã cedo' } },
  { msg: { id: 'm3', de: 'Banco (exemplo)', email: 'avisos@banco.exemplo', assunto: 'Sua fatura fecha em 2 dias', previa: 'O vencimento é dia 30. Consulte o valor no aplicativo…', corpo: 'Sua fatura fecha em 2 dias e vence no dia 30. O valor não é enviado por e-mail: consulte no aplicativo do banco.', horasAtras: 9, lida: true },
    ia: { categoria: 'financeiro', prioridade: 'media', resumo: 'Fatura vence dia 30; o valor só aparece no aplicativo.', motivo: 'Remetente bancário com data de vencimento.', confianca: 0.9, acao: 'criar_evento', prazo: 'dia 30' } },
  { msg: { id: 'm4', de: 'Ambiente virtual (exemplo)', email: 'nao-responda@ead.exemplo', assunto: 'Novo aviso: disciplina Administração II', previa: 'O professor publicou uma orientação sobre a prova…', corpo: 'O professor publicou uma orientação sobre a prova da disciplina. Acesse o ambiente virtual para ler o aviso completo.', horasAtras: 14, lida: false },
    ia: { categoria: 'faculdade', prioridade: 'media', resumo: 'Aviso do professor sobre a prova — o conteúdo está no ambiente virtual.', motivo: 'Remetente do ambiente da faculdade; o e-mail só avisa que há aviso.', confianca: 0.86, acao: 'ler_depois' } },
  { msg: { id: 'm5', de: 'Loja de eletrônicos (exemplo)', email: 'ofertas@loja.exemplo', assunto: 'Só hoje: até 60% OFF', previa: 'Aproveite descontos imperdíveis em toda a loja…', corpo: 'Aproveite descontos imperdíveis em toda a loja. Só hoje! Clique e confira.', horasAtras: 3, lida: false },
    ia: { categoria: 'promocional', prioridade: 'baixa', resumo: 'Propaganda de loja, sem ação para você.', motivo: 'Linguagem de oferta e remetente de marketing.', confianca: 0.97, acao: 'arquivar' } },
  { msg: { id: 'm6', de: 'Boletim semanal (exemplo)', email: 'news@boletim.exemplo', assunto: 'As 5 notícias da semana', previa: 'Resumo do que aconteceu nos últimos sete dias…', corpo: 'Resumo do que aconteceu nos últimos sete dias, em cinco tópicos.', horasAtras: 30, lida: true },
    ia: { categoria: 'informativo', prioridade: 'baixa', resumo: 'Boletim semanal de notícias.', motivo: 'Newsletter recorrente, sem pergunta nem prazo.', confianca: 0.91, acao: 'arquivar' } },
  { msg: { id: 'm7', de: 'Loja de roupas (exemplo)', email: 'promo@roupas.exemplo', assunto: 'Seu cupom expira à meia-noite', previa: 'Use o cupom antes que acabe…', corpo: 'Use o cupom antes que acabe. Válido apenas hoje.', horasAtras: 6, lida: false },
    ia: { categoria: 'promocional', prioridade: 'baixa', resumo: 'Cupom de loja que expira hoje.', motivo: 'Marketing com urgência artificial.', confianca: 0.95, acao: 'arquivar' } },
  { msg: { id: 'm8', de: 'Rafael (exemplo)', email: 'rafael@exemplo.com', assunto: 'Fotos do fim de semana', previa: 'Segue o álbum com as fotos que a gente tirou…', corpo: 'Segue o álbum com as fotos que a gente tirou no sábado. Depois me diz quais você quer impressas.', horasAtras: 26, lida: true },
    ia: { categoria: 'pessoal', prioridade: 'baixa', resumo: 'Rafael enviou fotos e pergunta quais imprimir.', motivo: 'Pessoa conhecida, assunto social.', confianca: 0.8, acao: 'responder' } },
  { msg: { id: 'm9', de: 'Plataforma de cursos (exemplo)', email: 'aulas@cursos.exemplo', assunto: 'Você parou na aula 4 — continue de onde parou', previa: 'Faltam 3 aulas para concluir o módulo…', corpo: 'Faltam 3 aulas para concluir o módulo. Continue de onde parou.', horasAtras: 40, lida: true },
    ia: { categoria: 'informativo', prioridade: 'baixa', resumo: 'Lembrete de curso: faltam 3 aulas do módulo.', motivo: 'Notificação automática de plataforma.', confianca: 0.74, acao: 'ler_depois' } },
  { msg: { id: 'm10', de: 'Operadora (exemplo)', email: 'contas@operadora.exemplo', assunto: 'Sua fatura de internet já está disponível', previa: 'Vencimento em 5 dias. Valor disponível no portal…', corpo: 'Sua fatura já está disponível. O vencimento é em 5 dias; consulte o valor no portal.', horasAtras: 20, lida: false },
    ia: { categoria: 'financeiro', prioridade: 'media', resumo: 'Fatura de internet disponível, vence em 5 dias.', motivo: 'Remetente de cobrança com vencimento.', confianca: 0.89, acao: 'criar_evento', prazo: 'em 5 dias' } },
];

/** Estado inicial: as 3 últimas mensagens ainda sem classificação — dá algo real para "Organizar com IA" fazer. */
const JA_CLASSIFICADAS = 7;

function inicial(): Mensagem[] {
  return SEEDS.map(({ msg, ia }, i) => ({ ...msg, arquivada: false, estrela: false, ...(i < JA_CLASSIFICADAS ? { ia, sugestaoPendente: !!ia.acao && ia.acao !== 'ler_depois' } : {}) }));
}

export type Modelo = 'triagem' | 'caixa';
export type Filtro = 'todos' | 'nao_lidos' | 'alta' | Categoria;

interface State {
  modelo: Modelo;
  mensagens: Mensagem[];
  selecionada: string | null;
  filtro: Filtro;
  busca: string;
  organizando: boolean;
  desfazer: { ids: string[]; texto: string; pendentes: string[] } | null;
  correcoes: number;
}

const MODEL_KEY = 'medusa-gmail-modelo';

export const gmailUi = createUiStore<State>({ modelo: 'triagem', mensagens: inicial(), selecionada: null, filtro: 'todos', busca: '', organizando: false, desfazer: null, correcoes: 0 });
export const useGmail = () => useUiStore(gmailUi);

export function restoreModelo(): void {
  try {
    const m = window.localStorage.getItem(MODEL_KEY);
    if (m === 'triagem' || m === 'caixa') gmailUi.set({ modelo: m });
  } catch { /* storage restrito */ }
}
export function setModelo(m: Modelo): void {
  gmailUi.set({ modelo: m });
  try { window.localStorage.setItem(MODEL_KEY, m); } catch { /* ignorar */ }
}

const map = (fn: (m: Mensagem) => Mensagem) => gmailUi.set((s) => ({ mensagens: s.mensagens.map(fn) }));
const patch = (ids: string[], p: Partial<Mensagem>) => map((m) => (ids.includes(m.id) ? { ...m, ...p } : m));

export const categoriaDe = (m: Mensagem): Categoria | undefined => m.corrigidaPara ?? m.ia?.categoria;

export function selecionar(id: string | null) {
  gmailUi.set({ selecionada: id });
  if (id) patch([id], { lida: true });
}
export function alternarEstrela(id: string) { map((m) => (m.id === id ? { ...m, estrela: !m.estrela } : m)); }
export function marcarLida(id: string, lida: boolean) { patch([id], { lida }); }

/** Arquivar é reversível: some da vista e o "Desfazer" devolve. */
export function arquivar(ids: string[], texto?: string) {
  const pendentes = gmailUi.get().mensagens.filter((m) => ids.includes(m.id) && m.sugestaoPendente).map((m) => m.id);
  patch(ids, { arquivada: true, sugestaoPendente: false });
  gmailUi.set({ desfazer: { ids, pendentes, texto: texto ?? (ids.length === 1 ? 'E-mail arquivado.' : `${ids.length} e-mails arquivados.`) } });
}
export function desfazerArquivo() {
  const d = gmailUi.get().desfazer;
  if (!d) return;
  patch(d.ids, { arquivada: false });
  patch(d.pendentes, { sugestaoPendente: true }); // a sugestão da IA volta junto com o e-mail
  gmailUi.set({ desfazer: null });
}
export function dispensarDesfazer() { gmailUi.set({ desfazer: null }); }

export function corrigirCategoria(id: string, c: Categoria) {
  map((m) => (m.id === id ? { ...m, corrigidaPara: c, sugestaoPendente: false } : m));
  gmailUi.set((s) => ({ correcoes: s.correcoes + 1 }));
}
export function dispensarSugestao(id: string) { patch([id], { sugestaoPendente: false }); }
export function proporEvento(id: string) { patch([id], { eventoProposto: true, sugestaoPendente: false }); }
export function salvarRascunho(id: string, texto: string) { patch([id], { rascunho: texto }); }

/** "Organizar com IA": classifica o que ainda não foi classificado, uma mensagem por vez. */
export async function organizarComIA(): Promise<void> {
  if (gmailUi.get().organizando) return;
  gmailUi.set({ organizando: true });
  try {
    for (const seed of SEEDS) {
      const atual = gmailUi.get().mensagens.find((m) => m.id === seed.msg.id);
      if (!atual || atual.ia) continue;
      await new Promise((r) => setTimeout(r, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450));
      patch([seed.msg.id], { ia: seed.ia, sugestaoPendente: !!seed.ia.acao && seed.ia.acao !== 'ler_depois' });
    }
  } finally {
    gmailUi.set({ organizando: false });
  }
}

export function aplicarSugestao(id: string) {
  const m = gmailUi.get().mensagens.find((x) => x.id === id);
  const acao = m?.ia?.acao;
  if (!m || !acao) return;
  if (acao === 'arquivar') arquivar([id], 'Arquivado como a IA sugeriu.');
  else if (acao === 'criar_evento') proporEvento(id);
  else dispensarSugestao(id);
}

export function textoHoras(h: number): string {
  if (h < 1) return 'agora';
  if (h < 24) return `há ${Math.round(h)} h`;
  return `há ${Math.round(h / 24)} d`;
}

export function visiveis(s: State): Mensagem[] {
  const q = s.busca.trim().toLowerCase();
  return s.mensagens
    .filter((m) => !m.arquivada)
    .filter((m) => (s.filtro === 'todos' ? true : s.filtro === 'nao_lidos' ? !m.lida : s.filtro === 'alta' ? m.ia?.prioridade === 'alta' : categoriaDe(m) === s.filtro))
    .filter((m) => !q || `${m.de} ${m.assunto} ${m.previa}`.toLowerCase().includes(q))
    .sort((a, b) => a.horasAtras - b.horasAtras);
}
