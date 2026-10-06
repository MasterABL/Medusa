/**
 * MEDUSA — Body Domain — Profile Engine (seção 11)
 *
 * Etapa final do fluxo Question → Answer → Diagnostic session → Body
 * profile. Mapeamento determinístico por `questionId` — toda pergunta
 * nova precisa de um `case` aqui (ou ela simplesmente não alimenta o
 * perfil, o que é uma omissão visível, não um erro silencioso).
 *
 * Toda resposta direta do usuário vira `origin: 'self_reported'`. Nenhum
 * campo aqui é `derived` — inferência (ex.: routine load) mora em outro
 * motor e escreve no perfil separadamente, sempre marcando a origem certa.
 */

import { BodyValidationError } from '../validators';
import type { BodyAnswer, BodyProfile, DiagnosticSession, ExperienceLevel } from '../model/types';

function findAnswer(session: DiagnosticSession, questionId: string): BodyAnswer | undefined {
  return session.answers.find((a) => a.questionId === questionId);
}

function requireAnswer(session: DiagnosticSession, questionId: string): BodyAnswer {
  const answer = findAnswer(session, questionId);
  if (!answer) {
    throw new BodyValidationError(`Sessão de diagnóstico não tem resposta para "${questionId}" — não é possível construir o perfil ainda.`);
  }
  return answer;
}

function asStringArray(value: BodyAnswer['value']): string[] {
  return Array.isArray(value) ? value : [String(value)];
}

export function buildProfileFromAnswers(session: DiagnosticSession, profileId: string, nowISO: string): BodyProfile {
  if (session.status !== 'completed') {
    throw new BodyValidationError(`Só é possível construir o perfil a partir de uma sessão "completed" (recebeu "${session.status}").`);
  }

  const objetivos = requireAnswer(session, 'q_objetivos');
  const rotina = requireAnswer(session, 'q_rotina_resumo');
  const disponibilidade = requireAnswer(session, 'q_disponibilidade_janelas');
  const frequencia = requireAnswer(session, 'q_frequencia_semanal');
  const experiencia = requireAnswer(session, 'q_experiencia');

  const local = findAnswer(session, 'q_local');
  const academia = findAnswer(session, 'q_contexto_academia');
  const deslocamento = findAnswer(session, 'q_deslocamento');
  const habitos = findAnswer(session, 'q_habitos');
  const sono = findAnswer(session, 'q_qualidade_sono');
  const energia = findAnswer(session, 'q_nivel_energia');
  const recuperacao = findAnswer(session, 'q_qualidade_recuperacao');
  const limitacoes = findAnswer(session, 'q_limitacoes');
  const preferencias = findAnswer(session, 'q_preferencias');

  const profile: BodyProfile = {
    id: profileId,
    objectives: { value: asStringArray(objetivos.value), origin: objetivos.source },
    routineSummary: { value: String(rotina.value), origin: rotina.source },
    availabilityWindows: { value: asStringArray(disponibilidade.value), origin: disponibilidade.source },
    weeklyFrequency: { value: Number(frequencia.value), origin: frequencia.source },
    experienceLevel: { value: experiencia.value as ExperienceLevel, origin: experiencia.source },
    habits: { value: habitos ? asStringArray(habitos.value) : [], origin: habitos?.source ?? 'self_reported' },
    limitations: { value: limitacoes ? asStringArray(limitacoes.value) : [], origin: limitacoes?.source ?? 'self_reported' },
    preferences: { value: preferencias ? asStringArray(preferencias.value) : [], origin: preferencias?.source ?? 'self_reported' },
    createdAt: nowISO,
    updatedAt: nowISO,
  };

  if (local) profile.location = { value: String(local.value), origin: local.source };
  if (academia) profile.gymContext = { value: String(academia.value), origin: academia.source };
  if (deslocamento) profile.commuteMinutes = { value: Number(deslocamento.value), origin: deslocamento.source };
  if (sono) profile.sleepQuality = { value: sono.value as 'ruim' | 'regular' | 'boa', origin: sono.source };
  if (energia) profile.energyLevel = { value: energia.value as 'baixa' | 'moderada' | 'alta', origin: energia.source };
  if (recuperacao) profile.recoveryQuality = { value: recuperacao.value as 'ruim' | 'regular' | 'boa', origin: recuperacao.source };

  return profile;
}

/**
 * Atualiza um campo do perfil já existente marcando a origem correta — usada
 * quando um motor de inferência (ex.: routine load) deriva algo novo, sem
 * misturar com o que o usuário relatou diretamente.
 */
export function applyDerivedField<K extends keyof BodyProfile>(
  profile: BodyProfile,
  field: K,
  value: BodyProfile[K] extends { value: infer V } ? V : never,
  nowISO: string
): BodyProfile {
  return {
    ...profile,
    [field]: { value, origin: 'derived' },
    updatedAt: nowISO,
  };
}
