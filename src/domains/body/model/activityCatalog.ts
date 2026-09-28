/**
 * MEDUSA — Body Domain — Catálogo inicial de atividades (seção 13)
 *
 * NÃO é um banco de exercícios exaustivo — é infraestrutura extensível: um
 * catálogo pequeno e real, o suficiente pra provar o planning engine e a
 * integração com Agenda/Guardian de ponta a ponta. Crescer o catálogo não
 * exige mudar nenhum motor, só adicionar entradas aqui (ou, no futuro, um
 * repository real por trás de `BodyRepository.listActivities`).
 */

import type { BodyActivity } from './types';

export const BODY_ACTIVITY_CATALOG: BodyActivity[] = [
  {
    id: 'act_caminhada_leve',
    category: 'caminhada',
    label: 'Caminhada leve',
    defaultDurationMinutes: 20,
    difficultyDescriptor: 'leve',
    equipment: [],
    environment: 'qualquer',
    recoveryExpectation: 'Baixo impacto — recuperação imediata, pode repetir no dia seguinte.',
  },
  {
    id: 'act_caminhada_moderada',
    category: 'caminhada',
    label: 'Caminhada em ritmo moderado',
    defaultDurationMinutes: 30,
    difficultyDescriptor: 'moderada',
    equipment: [],
    environment: 'ar_livre',
    recoveryExpectation: 'Recuperação em poucas horas para a maioria das pessoas.',
    progressionFromActivityId: 'act_caminhada_leve',
  },
  {
    id: 'act_mobilidade_geral',
    category: 'mobilidade',
    label: 'Sessão de mobilidade/alongamento',
    defaultDurationMinutes: 15,
    difficultyDescriptor: 'leve',
    equipment: [],
    environment: 'casa',
    recoveryExpectation: 'Sem necessidade de recuperação — pode ser feita diariamente.',
  },
  {
    id: 'act_treino_geral_casa',
    category: 'treino_geral',
    label: 'Treino geral em casa (peso do corpo)',
    defaultDurationMinutes: 30,
    difficultyDescriptor: 'moderada',
    equipment: [],
    environment: 'casa',
    recoveryExpectation: 'Recuperação recomendada de 1 dia entre sessões para o mesmo grupo muscular.',
  },
  {
    id: 'act_treino_geral_academia',
    category: 'treino_geral',
    label: 'Treino geral em academia',
    defaultDurationMinutes: 45,
    difficultyDescriptor: 'desafiadora',
    equipment: ['academia'],
    environment: 'academia',
    recoveryExpectation: 'Recuperação recomendada de 1-2 dias entre sessões para o mesmo grupo muscular.',
    progressionFromActivityId: 'act_treino_geral_casa',
  },
  {
    id: 'act_atividade_recreativa',
    category: 'atividade_recreativa',
    label: 'Atividade recreativa (esporte, dança, jogo)',
    defaultDurationMinutes: 40,
    difficultyDescriptor: 'moderada',
    equipment: [],
    environment: 'qualquer',
    recoveryExpectation: 'Varia conforme a intensidade percebida — ouvir o corpo no dia seguinte.',
  },
];

export function getActivity(id: string): BodyActivity | undefined {
  return BODY_ACTIVITY_CATALOG.find((a) => a.id === id);
}
