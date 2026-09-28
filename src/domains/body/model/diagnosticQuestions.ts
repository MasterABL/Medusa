/**
 * MEDUSA — Body Domain — Catálogo canônico de perguntas do diagnóstico
 *
 * Este NÃO é dado de fixture/teste — é o schema real do questionário que o
 * domínio usa pra construir um BodyProfile (seção 10-11). Extensível: uma
 * pergunta nova só precisa entrar neste array e ganhar um `case` em
 * `profileEngine.ts` — não redesenha o motor.
 */

import type { BodyDiagnosticQuestion } from './types';

export const BODY_DIAGNOSTIC_QUESTIONS: BodyDiagnosticQuestion[] = [
  {
    id: 'q_objetivos',
    section: 'objetivos',
    type: 'multi',
    prompt: 'Quais são seus objetivos com movimento/atividade física agora?',
    options: ['saude_geral', 'disposicao', 'forca', 'mobilidade', 'lazer', 'controle_de_peso'],
    allowMultiple: true,
    allowCustom: true,
    validation: { required: true, minSelected: 1 },
  },
  {
    id: 'q_preferencias',
    section: 'objetivos',
    type: 'multi',
    prompt: 'Que tipo de atividade você prefere ou já gosta de fazer?',
    options: ['caminhada', 'academia', 'esportes', 'yoga_alongamento', 'ciclismo'],
    allowMultiple: true,
    allowCustom: true,
  },
  {
    id: 'q_rotina_resumo',
    section: 'rotina',
    type: 'free_text',
    prompt: 'Descreva em poucas palavras como é sua rotina hoje (trabalho, estudo, deslocamento).',
    allowMultiple: false,
    allowCustom: true,
    validation: { required: true },
  },
  {
    id: 'q_deslocamento',
    section: 'rotina',
    type: 'duration',
    prompt: 'Quantos minutos por dia você gasta se deslocando (ida + volta)?',
    allowMultiple: false,
    allowCustom: false,
  },
  {
    id: 'q_disponibilidade_janelas',
    section: 'disponibilidade',
    type: 'multi',
    prompt: 'Em quais janelas do dia você normalmente teria tempo livre?',
    options: ['manha', 'almoco', 'tarde', 'noite'],
    allowMultiple: true,
    allowCustom: false,
    validation: { required: true, minSelected: 1 },
  },
  {
    id: 'q_local',
    section: 'disponibilidade',
    type: 'single',
    prompt: 'Onde você normalmente faria a atividade?',
    options: ['casa', 'academia', 'ar_livre', 'qualquer'],
    allowMultiple: false,
    allowCustom: false,
  },
  {
    id: 'q_contexto_academia',
    section: 'disponibilidade',
    type: 'single',
    prompt: 'Você tem acesso a academia ou equipamento?',
    options: ['tenho_academia', 'tenho_equipamento_em_casa', 'nao_tenho'],
    allowMultiple: false,
    allowCustom: false,
  },
  {
    id: 'q_frequencia_semanal',
    section: 'disponibilidade',
    type: 'scale',
    prompt: 'Quantas vezes por semana você consegue se dedicar a isso, de forma realista?',
    allowMultiple: false,
    allowCustom: false,
    validation: { scaleMin: 0, scaleMax: 7 },
  },
  {
    id: 'q_experiencia',
    section: 'experiencia',
    type: 'single',
    prompt: 'Qual seu nível de experiência com atividade física estruturada?',
    options: ['iniciante', 'intermediario', 'avancado'],
    allowMultiple: false,
    allowCustom: false,
    validation: { required: true },
  },
  {
    id: 'q_habitos',
    section: 'habitos',
    type: 'multi',
    prompt: 'Quais hábitos relacionados a movimento já fazem parte do seu dia?',
    options: ['caminha_bastante', 'sobe_escada', 'pratica_esporte', 'nenhum_no_momento'],
    allowMultiple: true,
    allowCustom: true,
  },
  {
    id: 'q_qualidade_sono',
    section: 'sono_energia',
    type: 'single',
    prompt: 'Como você descreveria a qualidade do seu sono recentemente?',
    options: ['ruim', 'regular', 'boa'],
    allowMultiple: false,
    allowCustom: false,
  },
  {
    id: 'q_nivel_energia',
    section: 'sono_energia',
    type: 'single',
    prompt: 'Como está seu nível de energia no dia a dia?',
    options: ['baixa', 'moderada', 'alta'],
    allowMultiple: false,
    allowCustom: false,
  },
  {
    id: 'q_qualidade_recuperacao',
    section: 'sono_energia',
    type: 'single',
    prompt: 'Depois de um dia cheio, como você sente sua recuperação (disposição no dia seguinte)?',
    options: ['ruim', 'regular', 'boa'],
    allowMultiple: false,
    allowCustom: false,
  },
  {
    id: 'q_limitacoes',
    section: 'limitacoes',
    type: 'multi',
    prompt: 'Há alguma limitação ou restrição que devemos considerar ao sugerir atividades? (relatado por você, não diagnóstico)',
    options: ['nenhuma_no_momento'],
    allowMultiple: true,
    allowCustom: true,
  },
];

export function getDiagnosticQuestion(id: string): BodyDiagnosticQuestion | undefined {
  return BODY_DIAGNOSTIC_QUESTIONS.find((q) => q.id === id);
}
