// Hoje Foundation v1 — algoritmo de item atual e agrupamento temporal.
//
// Padrão adaptado de `minha-vida/src/lib/hoje.js` (`itemAtualId`, `montarLinhaDoTempo`):
// generalizado para fixtures genéricas (não a rotina pessoal hardcoded do legacy) e para o
// idioma de agrupamento "Agora / Próximo / Depois / Mais tarde" já estabelecido em Agenda
// (`feature/agenda`, ainda não mesclada). Usa Local State — não existe persistência real ainda.

export type HojeCategoria = 'estudo' | 'trabalho' | 'saude' | 'pessoal' | 'descanso';

export interface HojeItem {
  id: string;
  title: string;
  category: HojeCategoria;
  /** minutos desde 00:00 */
  startMinutes: number;
  durationMinutes: number;
}

export function formatMinutes(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Encontra o item "atual": o que está em andamento agora; se nenhum estiver em andamento,
 * o último que já começou (mesmo que tecnicamente tenha terminado) — mesma regra do legacy
 * `itemAtualId`.
 */
export function pickCurrentItemId(items: HojeItem[], nowMinutes: number): string | null {
  const inProgress = items.find(
    (item) => item.startMinutes <= nowMinutes && nowMinutes < item.startMinutes + item.durationMinutes
  );
  if (inProgress) return inProgress.id;

  const started = items
    .filter((item) => item.startMinutes <= nowMinutes)
    .sort((a, b) => b.startMinutes - a.startMinutes);

  return started[0]?.id ?? null;
}

export interface HojeGroups {
  agora: HojeItem | null;
  proximo: HojeItem | null;
  depois: HojeItem[];
  maisTarde: HojeItem[];
}

const DEPOIS_LIMIT_MINUTES = 180;

/**
 * Agrupa os itens do dia em Agora/Próximo/Depois/Mais tarde — mesmo idioma temporal usado na
 * List View de Agenda. "Depois" cobre as próximas 3h após o próximo item; "Mais tarde" cobre o
 * restante. Itens já encerrados (exceto o item atual) não são exibidos nesta v1.
 */
export function groupHojeItems(items: HojeItem[], nowMinutes: number): HojeGroups {
  const currentId = pickCurrentItemId(items, nowMinutes);
  const agora = items.find((item) => item.id === currentId) ?? null;

  const upcoming = items
    .filter((item) => item.id !== currentId && item.startMinutes >= nowMinutes)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const [proximo = null, ...rest] = upcoming;

  const depois: HojeItem[] = [];
  const maisTarde: HojeItem[] = [];
  for (const item of rest) {
    if (!proximo) {
      maisTarde.push(item);
      continue;
    }
    if (item.startMinutes - proximo.startMinutes <= DEPOIS_LIMIT_MINUTES) {
      depois.push(item);
    } else {
      maisTarde.push(item);
    }
  }

  return { agora, proximo, depois, maisTarde };
}

export const CATEGORY_ICON: Record<HojeCategoria, string> = {
  estudo: 'menu_book',
  trabalho: 'terminal',
  saude: 'fitness_center',
  pessoal: 'self_improvement',
  descanso: 'nightlight',
};

export const CATEGORY_LABEL: Record<HojeCategoria, string> = {
  estudo: 'Estudo',
  trabalho: 'Trabalho',
  saude: 'Corpo',
  pessoal: 'Pessoal',
  descanso: 'Descanso',
};
