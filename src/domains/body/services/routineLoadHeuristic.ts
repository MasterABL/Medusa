/**
 * MEDUSA — Body Domain — Routine Load Heuristic (seção 16)
 *
 * Heurística de ORGANIZAÇÃO DE ROTINA, nunca diagnóstico. Nunca afirma uma
 * condição fisiológica. Determinística, transparente e testável: dado o
 * mesmo input, sempre produz o mesmo `RoutineLoadResult`, com a evidência
 * (pontuação por fator) exposta, não escondida atrás de um score opaco.
 */

import type { RoutineLoadLevel, RoutineLoadResult } from '../model/types';

export interface RoutineLoadInput {
  /** minutos comprometidos hoje com trabalho */
  workMinutes: number;
  /** minutos comprometidos hoje com faculdade/estudo agendado */
  studyMinutes: number;
  /** minutos de deslocamento (ida + volta) */
  commuteMinutes: number;
  /** minutos já alocados hoje pra atividade física planejada */
  plannedActivityMinutes: number;
  /** qualidade de sono relatada, se houver (self-reported, nunca clínico) */
  sleepQuality?: 'ruim' | 'regular' | 'boa';
  /** energia relatada, se houver */
  energyLevel?: 'baixa' | 'moderada' | 'alta';
}

const MINUTES_PER_DAY = 24 * 60;

/**
 * Cada fator contribui um peso pra um score 0-1. Pesos e limiares são
 * constantes documentadas aqui — nenhuma "mágica" escondida em outro lugar.
 */
export function computeRoutineLoad(input: RoutineLoadInput): RoutineLoadResult {
  const evidence: string[] = [];
  let score = 0;

  const committedMinutes = input.workMinutes + input.studyMinutes + input.commuteMinutes + input.plannedActivityMinutes;
  const committedRatio = Math.min(committedMinutes / MINUTES_PER_DAY, 1);
  const committedScore = committedRatio * 0.6;
  score += committedScore;
  evidence.push(
    `${committedMinutes} min comprometidos hoje (trabalho+estudo+deslocamento+atividade planejada) de ${MINUTES_PER_DAY} min no dia (contribuição: ${committedScore.toFixed(2)}).`
  );

  if (input.sleepQuality) {
    const sleepScore = input.sleepQuality === 'ruim' ? 0.2 : input.sleepQuality === 'regular' ? 0.1 : 0;
    score += sleepScore;
    evidence.push(`Sono relatado como "${input.sleepQuality}" (contribuição: ${sleepScore.toFixed(2)}).`);
  }

  if (input.energyLevel) {
    const energyScore = input.energyLevel === 'baixa' ? 0.2 : input.energyLevel === 'moderada' ? 0.1 : 0;
    score += energyScore;
    evidence.push(`Energia relatada como "${input.energyLevel}" (contribuição: ${energyScore.toFixed(2)}).`);
  }

  score = Math.min(Math.round(score * 100) / 100, 1);

  let level: RoutineLoadLevel;
  if (score >= 0.66) level = 'alta';
  else if (score >= 0.35) level = 'moderada';
  else level = 'baixa';

  evidence.push(`Score final: ${score.toFixed(2)} → nível "${level}" (heurística de organização de rotina, não diagnóstico).`);

  return { level, score, evidence };
}
