/**
 * MEDUSA — Spiritual ↔ Hoje resolver (CENÁRIO 4 da missão)
 *
 * practice completed → event → goal progress → Today contextual update.
 * Saída compacta — e NUNCA inclui conteúdo de reflexão (seção 26), só
 * progresso de meta e prática, que são metadado.
 */

export interface SpiritualTodayContext {
  headline: string;
  detail?: string;
  goalId: string;
}

export function resolveSpiritualTodayContext(
  goalLabel: string,
  goalId: string,
  previousCount: number,
  newCount: number,
  targetPracticeCount?: number
): SpiritualTodayContext | null {
  if (newCount === previousCount) return null;

  const detail = targetPracticeCount ? `${newCount}/${targetPracticeCount} práticas.` : `${newCount} prática(s) registrada(s).`;

  return {
    headline: `Meta "${goalLabel}" avançou.`,
    detail,
    goalId,
  };
}
