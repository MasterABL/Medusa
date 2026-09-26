/**
 * Medusa — Motor de planejamento do Cronograma (Temporal OS / Learning OS)
 *
 * Lógica pura, sem UI, para poder ser testada isoladamente.
 * Calcula um plano REAL a partir de 26 dimensões temporais e cognitivas:
 * rotina semanal, compromissos fixos, disponibilidade líquida, picos de foco,
 * metas, ritmo de sessão, pausas, prioridades e critérios de tradeoff.
 *
 * Princípio: "A Agenda conhece o tempo; cada domínio conhece o significado."
 */

export type DomainLevel = 'baixo' | 'medio' | 'alto';

export const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  seg: 'Seg',
  ter: 'Ter',
  qua: 'Qua',
  qui: 'Qui',
  sex: 'Sex',
  sab: 'Sáb',
  dom: 'Dom',
};

/** As 7 disciplinas do Cronograma ENEM */
export const CRONOGRAMA_DISCIPLINES = [
  'Matemática',
  'Física',
  'Química',
  'Biologia',
  'Humanas',
  'Linguagens',
  'Redação',
] as const;

export type Intensidade = 'longo-prazo' | 'moderado' | 'intensivo' | 'critico';

export const INTENSIDADE_LABEL: Record<Intensidade, string> = {
  'longo-prazo': 'Longo prazo',
  moderado: 'Moderado',
  intensivo: 'Intensivo',
  critico: 'Crítico',
};

export const INTENSIDADE_DESCRICAO: Record<Intensidade, string> = {
  'longo-prazo': 'Tempo de sobra para construir base sólida antes de acelerar.',
  moderado: 'Dá para equilibrar teoria nova e revisão sem correria.',
  intensivo: 'Prioridade em fechar lacunas — foco em questões e revisão contínua.',
  critico: 'Foco total em simulados, redação e pontos de maior rentabilidade da TRI.',
};

export interface DisciplinaAlocacao {
  disciplina: string;
  dominio: DomainLevel;
  horasSemana: number;
  percentual: number;
}

export interface CronogramaPlan {
  semanasRestantes: number;
  horasSemanais: number;
  intensidade: Intensidade;
  alocacao: DisciplinaAlocacao[];
  blocoMinutosIdeal: number;
  horarioPico: string;
  bufferMinutos: number;
  areaPrioritaria: string;
  metaConcorrencia: string;
  estrategiaCompensacao?: string;
  dataCalculada?: string;
  diagnosticoRespostas?: Record<string, number>;
}

export interface CronogramaAnswers {
  diasDisponiveis: Weekday[];
  horasPorDia: number;
  dataProva: string; // "YYYY-MM-DD"
  dominio: Partial<Record<string, DomainLevel>>;
  horasComprometidasSemana?: number;
  diagnosticoRespostas?: Record<string, number>;
  blocoMinutosIdeal?: number;
  horarioPico?: string;
  bufferMinutos?: number;
  areaPrioritaria?: string;
  metaConcorrencia?: string;
}

/** Peso base por autopercepção de domínio */
const PESO_POR_DOMINIO: Record<DomainLevel, number> = {
  baixo: 3,
  medio: 2,
  alto: 1,
};

export function calcularSemanasRestantes(hoje: Date, dataProva: Date): number {
  const diffMs = dataProva.getTime() - hoje.getTime();
  const diffDias = diffMs / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(diffDias / 7));
}

export function calcularIntensidade(semanasRestantes: number): Intensidade {
  if (semanasRestantes > 16) return 'longo-prazo';
  if (semanasRestantes > 8) return 'moderado';
  if (semanasRestantes > 3) return 'intensivo';
  return 'critico';
}

// =========================================================================
// DIAGNÓSTICO TEMPORAL COESO COM 26 PERGUNTAS ESTRUTURADAS (FASE 2)
// =========================================================================

export type TemporalBlockCategory =
  | 'rotina_fixa'
  | 'disponibilidade_real'
  | 'restricoes_e_energia'
  | 'metas_e_prazos'
  | 'ritmo_e_foco'
  | 'prioridades_e_tradeoffs';

export interface DiagnosticoQuestaoTemporal {
  id: string;
  bloco: TemporalBlockCategory;
  blocoTitulo: string;
  numero: number;
  pergunta: string;
  detalhe?: string;
  opcoes: {
    texto: string;
    subtexto?: string;
    horasSemanaImpacto?: number;
    pesoExatas?: number;
    pesoNatureza?: number;
    pesoLinguagens?: number;
    pesoHumanas?: number;
    minutosSessao?: number;
    bufferMinutos?: number;
    horarioSugerido?: string;
  }[];
}

export const DIAGNOSTICO_QUESTOES_TEMPORAIS: DiagnosticoQuestaoTemporal[] = [
  // --- Bloco 1: Rotina Semanal e Compromissos Fixos ---
  {
    id: 'dt_01',
    bloco: 'rotina_fixa',
    blocoTitulo: 'Rotina & Obrigações Fixas',
    numero: 1,
    pergunta: 'Qual é a sua carga horária semanal média com trabalho ou estágio?',
    detalhe: 'Ajuda a estimar o limite seguro de horas de estudo sem risco de estafa.',
    opcoes: [
      { texto: 'Não trabalho atualmente (0h)', subtexto: 'Dedicação exclusiva a estudos e projetos', horasSemanaImpacto: 0 },
      { texto: 'Trabalho meio período (15h a 20h/semana)', subtexto: 'Estágio ou regime de meio turno', horasSemanaImpacto: 20 },
      { texto: 'Trabalho período integral (30h a 40h/semana)', subtexto: 'Rotina corporativa ou comercial padrão', horasSemanaImpacto: 40 },
      { texto: 'Carga alta ou turnos extras (+40h/semana)', subtexto: 'Jornada intensa com horas extras frequentes', horasSemanaImpacto: 50 },
    ],
  },
  {
    id: 'dt_02',
    bloco: 'rotina_fixa',
    blocoTitulo: 'Rotina & Obrigações Fixas',
    numero: 2,
    pergunta: 'Em quais turnos suas obrigações fixas (trabalho ou aulas) estão concentradas?',
    detalhe: 'Identifica o espaço livre principal na sua grade semanal.',
    opcoes: [
      { texto: 'Apenas no período matutino (07h às 13h)', subtexto: 'Tardes e noites disponíveis' },
      { texto: 'Apenas no período vespertino (13h às 19h)', subtexto: 'Manhãs e noites disponíveis' },
      { texto: 'Manhã e tarde integrais (08h às 18h)', subtexto: 'Janela de estudo concentrada à noite' },
      { texto: 'Turno noturno (18h às 23h)', subtexto: 'Janela de estudo durante a manhã ou tarde' },
      { texto: 'Horários flexíveis ou home office dinâmico', subtexto: 'Grade adaptável dia a dia' },
    ],
  },
  {
    id: 'dt_03',
    bloco: 'rotina_fixa',
    blocoTitulo: 'Rotina & Obrigações Fixas',
    numero: 3,
    pergunta: 'Quanto tempo você despende diariamente com deslocamentos e transporte?',
    detalhe: 'Tempo em trânsito é tempo não recuperável na timeline.',
    opcoes: [
      { texto: 'Menos de 30 minutos (ou 100% remoto)', subtexto: 'Praticamente sem perda de tempo em trânsito', horasSemanaImpacto: 2 },
      { texto: '30 minutos a 1 hora diária', subtexto: 'Deslocamento urbano padrão', horasSemanaImpacto: 5 },
      { texto: '1 a 2 horas diárias no trânsito', subtexto: 'Trajeto moderado entre cidades/bairros', horasSemanaImpacto: 10 },
      { texto: 'Mais de 2 horas diárias', subtexto: 'Deslocamento longo com fadiga acumulada', horasSemanaImpacto: 15 },
    ],
  },
  {
    id: 'dt_04',
    bloco: 'rotina_fixa',
    blocoTitulo: 'Rotina & Obrigações Fixas',
    numero: 4,
    pergunta: 'Você possui vínculo ativo com Faculdade, Graduação ou Cursinho presencial?',
    detalhe: 'Cruza a demanda acadêmica do Learning OS com o Cronograma ENEM.',
    opcoes: [
      { texto: 'Não curso faculdade/cursinho atualmente', subtexto: 'Foco exclusivo na preparação', horasSemanaImpacto: 0 },
      { texto: 'Sim, graduação em período integral', subtexto: 'Alta demanda paralela de provas e trabalhos', horasSemanaImpacto: 25 },
      { texto: 'Sim, graduação ou cursinho meio período', subtexto: 'Demanda acadêmica equilibrada', horasSemanaImpacto: 15 },
      { texto: 'Sim, formato EAD com horários autônomos', subtexto: 'Flexibilidade de estudo sob demanda', horasSemanaImpacto: 10 },
    ],
  },
  {
    id: 'dt_05',
    bloco: 'rotina_fixa',
    blocoTitulo: 'Rotina & Obrigações Fixas',
    numero: 5,
    pergunta: 'Você mantém dedicação regular a estudos ou aulas de Inglês?',
    detalhe: 'Permite sincronizar blocos de idiomas na Agenda sem canibalizar o ENEM.',
    opcoes: [
      { texto: 'Não estudo inglês no momento', subtexto: 'Foco apenas nas 5 questões do ENEM', horasSemanaImpacto: 0 },
      { texto: '1 a 2 horas semanais de manutenção', subtexto: 'Prática de vocabulário e leitura', horasSemanaImpacto: 2 },
      { texto: '3 a 5 horas semanais (curso ativo)', subtexto: 'Trilha de fluência ativa', horasSemanaImpacto: 4 },
      { texto: 'Imersão intensa (+5 horas semanais)', subtexto: 'Preparação para certificação ou intercâmbio', horasSemanaImpacto: 7 },
    ],
  },
  {
    id: 'dt_06',
    bloco: 'rotina_fixa',
    blocoTitulo: 'Rotina & Obrigações Fixas',
    numero: 6,
    pergunta: 'Qual é a sua frequência semanal de treinos, exercícios físicos ou esportes?',
    detalhe: 'Saúde física e sono são componentes do domínio Corpo no Medusa.',
    opcoes: [
      { texto: 'Sedentário / Nenhuma atividade física regular', subtexto: 'Sem blocos de treino na timeline', horasSemanaImpacto: 0 },
      { texto: '1 a 2 vezes por semana', subtexto: 'Caminhadas ou treinos eventuais', horasSemanaImpacto: 2 },
      { texto: '3 a 4 vezes por semana', subtexto: 'Musculação, corrida ou natação com frequência', horasSemanaImpacto: 5 },
      { texto: '5 ou mais vezes por semana (regular/atleta)', subtexto: 'Compromisso diário de saúde e performance', horasSemanaImpacto: 8 },
    ],
  },
  {
    id: 'dt_07',
    bloco: 'rotina_fixa',
    blocoTitulo: 'Rotina & Obrigações Fixas',
    numero: 7,
    pergunta: 'Existem compromissos recorrentes inegociáveis (família, religião, cuidados)?',
    detalhe: 'Evita que a Agenda sugira horários conflitantes com a sua vida pessoal.',
    opcoes: [
      { texto: 'Nenhum compromisso fixo extra relevante', subtexto: 'Total liberdade para planejar a semana' },
      { texto: '1 compromisso semanal previsível', subtexto: 'Ex: almoço familiar ou culto aos fins de semana' },
      { texto: '2 a 3 compromissos fixos por semana', subtexto: 'Ex: terapia, cuidados familiares ou reuniões' },
      { texto: 'Múltiplas obrigações diárias recorrentes', subtexto: 'Ex: filhos, dependentes ou responsabilidades do lar' },
    ],
  },

  // --- Bloco 2: Horas e Disponibilidade Real ---
  {
    id: 'dt_08',
    bloco: 'disponibilidade_real',
    blocoTitulo: 'Disponibilidade Real',
    numero: 8,
    pergunta: 'Quantos dias da semana você pode dedicar com consistência aos estudos do ENEM?',
    detalhe: 'Consistência sustentável vence picos pontuais de estudo seguidos de burnout.',
    opcoes: [
      { texto: '3 a 4 dias na semana', subtexto: 'Ritmo dosado com dias de descanso intercalados' },
      { texto: '5 dias úteis (segunda a sexta)', subtexto: 'Jornada clássica com fins de semana livres' },
      { texto: '6 dias na semana (incluindo sábado)', subtexto: 'Rotina intensa mantendo um dia sagrado de folga' },
      { texto: 'Todos os 7 dias (com ritmo dosado)', subtexto: 'Contato diário sem interrupção de ciclo' },
    ],
  },
  {
    id: 'dt_09',
    bloco: 'disponibilidade_real',
    blocoTitulo: 'Disponibilidade Real',
    numero: 9,
    pergunta: 'Quantas horas líquidas diárias você consegue cumprir com energia mental em dias úteis?',
    detalhe: 'Hora líquida significa estudo sem celular, sem pausas longas e com foco real.',
    opcoes: [
      { texto: '1 a 2 horas líquidas por dia', subtexto: 'Excelente para quem trabalha período integral' },
      { texto: '3 a 4 horas líquidas por dia', subtexto: 'Ritmo padrão altamente produtivo' },
      { texto: '5 a 6 horas líquidas por dia', subtexto: 'Carga pesada para quem tem turnos livres' },
      { texto: 'Mais de 6 horas líquidas por dia', subtexto: 'Dedicação quase exclusiva à preparação' },
    ],
  },
  {
    id: 'dt_10',
    bloco: 'disponibilidade_real',
    blocoTitulo: 'Disponibilidade Real',
    numero: 10,
    pergunta: 'Como você deseja utilizar os fins de semana no seu cronograma de estudos?',
    detalhe: 'Fins de semana definem a viabilidade de simulados de 5 horas de prova.',
    opcoes: [
      { texto: 'Fins de semana 100% livres para descanso', subtexto: 'Zero blocos de estudo no sábado e domingo' },
      { texto: 'Apenas a manhã de sábado (estudos leves)', subtexto: 'Revisão rápida de pendências' },
      { texto: 'Sábado para simulados/redação e domingo livre', subtexto: 'Simulação real do dia de prova' },
      { texto: 'Sábado e domingo com carga distribuída', subtexto: 'Aproveitamento total dos dois dias' },
    ],
  },
  {
    id: 'dt_11',
    bloco: 'disponibilidade_real',
    blocoTitulo: 'Disponibilidade Real',
    numero: 11,
    pergunta: 'Até que horário você tolera encerrar sua jornada diária de estudos?',
    detalhe: 'Protege a qualidade do seu sono e o bio-estado monitorado pelo Guardian.',
    opcoes: [
      { texto: 'Até as 18:00 (prefiro noites livres)', subtexto: 'Encerramento precoce para lazer e descanso' },
      { texto: 'Até as 21:00 ou 22:00 (rotina padrão)', subtexto: 'Janela clássica para quem estuda à noite' },
      { texto: 'Até as 23:30 (estudo noturno moderado)', subtexto: 'Estende até o limiar antes de deitar' },
      { texto: 'Madrugada adentro (hábito notívago)', subtexto: 'Produtividade máxima no silêncio da noite' },
    ],
  },
  {
    id: 'dt_12',
    bloco: 'disponibilidade_real',
    blocoTitulo: 'Disponibilidade Real',
    numero: 12,
    pergunta: 'Em qual faixa de horário seu cérebro atinge o pico absoluto de clareza cognitiva?',
    detalhe: 'A Agenda alocará as matérias de maior peso ou dificuldade nesta janela de ouro.',
    opcoes: [
      { texto: 'Manhã cedo (06:00 às 11:00)', subtexto: 'Mente fresca logo após acordar', horarioSugerido: '08:00' },
      { texto: 'Início da tarde (13:00 às 17:00)', subtexto: 'Ritmo contínuo durante o dia', horarioSugerido: '14:00' },
      { texto: 'Noite (18:30 às 22:30)', subtexto: 'Foco consolidado após as tarefas externas', horarioSugerido: '19:30' },
      { texto: 'Madrugada (23:00 às 03:00)', subtexto: 'Silêncio total e zero interrupções externas', horarioSugerido: '23:00' },
    ],
  },

  // --- Bloco 3: Restrições & Energia Mental ---
  {
    id: 'dt_13',
    bloco: 'restricoes_e_energia',
    blocoTitulo: 'Restrições & Energia',
    numero: 13,
    pergunta: 'Existe algum período do dia em que estudar é absolutamente inviável ou improdutivo?',
    detalhe: 'Garante que nenhum bloco de alta exigência seja colocado em momento de baixa energia.',
    opcoes: [
      { texto: 'Nenhum horário é proibitivo', subtexto: 'Boa adaptabilidade a qualquer momento' },
      { texto: 'Início da tarde (sonolência pós-almoço)', subtexto: 'Queda drástica de energia entre 12h e 14h30' },
      { texto: 'Noite (esgotamento de energia mental)', subtexto: 'Dificuldade para reter conteúdo denso à noite' },
      { texto: 'Manhã cedo (dificuldade para despertar)', subtexto: 'Inércia do sono até as 09h' },
    ],
  },
  {
    id: 'dt_14',
    bloco: 'restricoes_e_energia',
    blocoTitulo: 'Restrições & Energia',
    numero: 14,
    pergunta: 'Como você prefere encaixar o estudo em relação ao trabalho ou faculdade?',
    detalhe: 'Define a ordem espacial dos blocos na sua timeline.',
    opcoes: [
      { texto: 'Estudar antes de iniciar as obrigações do dia', subtexto: 'Garante a prioridade máxima antes que surjam imprevistos' },
      { texto: 'Estudar logo após terminar o trabalho/aula', subtexto: 'Aproveita o embalo antes de relaxar em definitivo' },
      { texto: 'Ter 1 a 2 horas de transição/descanso antes de estudar', subtexto: 'Pausa para banho, refeição e descompressão prévia' },
      { texto: 'Fracionar em pequenas janelas ao longo do dia', subtexto: 'Aproveitamento de micro-intervalos livres' },
    ],
  },
  {
    id: 'dt_15',
    bloco: 'restricoes_e_energia',
    blocoTitulo: 'Restrições & Energia',
    numero: 15,
    pergunta: 'Qual margem de segurança (buffer) você precisa entre compromissos diferentes?',
    detalhe: 'Evita a sensação de correria e reduz conflitos de agenda.',
    opcoes: [
      { texto: 'Sem intervalo (transição direta entre blocos)', subtexto: 'Mudança instantânea de contexto', bufferMinutos: 0 },
      { texto: '15 a 20 minutos de respiro mental', subtexto: 'Intervalo curto para água, postura e respiração', bufferMinutos: 15 },
      { texto: '30 a 45 minutos (tempo de pausa e lanche)', subtexto: 'Margem segura para transição com conforto', bufferMinutos: 30 },
      { texto: '60 minutos ou mais de descompressão', subtexto: 'Buffer amplo para deslocamento ou refeição', bufferMinutos: 60 },
    ],
  },

  // --- Bloco 4: Metas e Prazos do ENEM ---
  {
    id: 'dt_16',
    bloco: 'metas_e_prazos',
    blocoTitulo: 'Metas & Prazos',
    numero: 16,
    pergunta: 'Qual é o horizonte temporal e objetivo principal da sua preparação?',
    detalhe: 'Calcula o número de semanas e ajusta a intensidade geral do cronograma.',
    opcoes: [
      { texto: 'ENEM deste ano — reta final acelerada', subtexto: 'Menos de 6 meses até a prova oficial' },
      { texto: 'ENEM do próximo ano — construção de base sólida', subtexto: 'Preparação contínua de médio prazo (+9 meses)' },
      { texto: 'Vestibular específico de meio de ano (FUVEST/UNICAMP)', subtexto: 'Foco nas bancas paulistas ou militares' },
      { texto: 'Plano contínuo de longo prazo (treineiro / base)', subtexto: 'Sem pressão de data imediata' },
    ],
  },
  {
    id: 'dt_17',
    bloco: 'metas_e_prazos',
    blocoTitulo: 'Metas & Prazos',
    numero: 17,
    pergunta: 'Qual é a faixa de nota de corte pretendida para o seu curso de interesse?',
    detalhe: 'Define o nível de rigor na alocação de Matemática e Redação.',
    opcoes: [
      { texto: 'Alta concorrência: nota > 780 pts (Medicina, Engenharias de topo)', subtexto: 'Exige pontuação de elite em todas as áreas', pesoExatas: 1.4, pesoNatureza: 1.4 },
      { texto: 'Média-alta: nota 700 a 780 pts (Direito, Computação, Odonto)', subtexto: 'Forte concorrência com foco em pesos estratégicos', pesoExatas: 1.2 },
      { texto: 'Concorrência padrão: nota 600 a 700 pts', subtexto: 'Domínio equilibrado dos conteúdos essenciais' },
      { texto: 'Aprimoramento pessoal sem foco estrito em nota de corte', subtexto: 'Meta flexível orientada ao aprendizado' },
    ],
  },
  {
    id: 'dt_18',
    bloco: 'metas_e_prazos',
    blocoTitulo: 'Metas & Prazos',
    numero: 18,
    pergunta: 'Qual a periodicidade ideal para realização de simulados de prova completa?',
    detalhe: 'Simulados requerem janelas longas de 5h reservadas na Agenda.',
    opcoes: [
      { texto: 'Simulado completo a cada semana', subtexto: 'Treinamento intensivo de resistência física e tempo' },
      { texto: 'Simulado quinzenal intercalado', subtexto: 'Ritmo ideal de aferição com tempo de análise de erros' },
      { texto: 'Simulado mensal de diagnóstico', subtexto: 'Medição de evolução sem cansaço excessivo' },
      { texto: 'Apenas simulados nas últimas 4 semanas antes da prova', subtexto: 'Prioridade quase total em teoria e listas de questões' },
    ],
  },
  {
    id: 'dt_19',
    bloco: 'metas_e_prazos',
    blocoTitulo: 'Metas & Prazos',
    numero: 19,
    pergunta: 'Qual é a sua urgência em relação à produção de redações semanais?',
    detalhe: 'A Redação é a única nota do ENEM que vai até 1000 sem a curvatura da TRI.',
    opcoes: [
      { texto: 'Crítica: preciso de 2 redações corrigidas por semana', subtexto: 'Meta de nota 960+ com treino constante de repertório', pesoLinguagens: 1.5 },
      { texto: 'Padrão: 1 redação semanal obrigatória', subtexto: 'Constância sólida para alcançar nota 900+' },
      { texto: 'Moderada: 1 redação a cada 15 dias', subtexto: 'Foco equilibrado entre redação e matérias teóricas' },
      { texto: 'Baixa: foco maior em questões objetivas no momento', subtexto: 'Redação apenas pontual' },
    ],
  },

  // --- Bloco 5: Ritmo, Sessão e Foco ---
  {
    id: 'dt_20',
    bloco: 'ritmo_e_foco',
    blocoTitulo: 'Ritmo & Foco',
    numero: 20,
    pergunta: 'Qual é a duração contínua mais eficiente para um bloco de estudo individual?',
    detalhe: 'Determina o tamanho padrão dos time_blocks criados na Agenda.',
    opcoes: [
      { texto: 'Blocos ágeis de 25 a 30 minutos (estilo Pomodoro)', subtexto: 'Ideal para evitar perda de atenção', minutosSessao: 30 },
      { texto: 'Blocos médios de 45 a 50 minutos (foco escolar)', subtexto: 'Equilíbrio ideal entre teoria e exercícios', minutosSessao: 45 },
      { texto: 'Imersões profundas de 80 a 90 minutos (Deep Work)', subtexto: 'Aprofundamento em deduções e listas densas', minutosSessao: 90 },
      { texto: 'Super blocos de 120 minutos (estudo analítico denso)', subtexto: 'Treinamento de resistência para o dia do ENEM', minutosSessao: 120 },
    ],
  },
  {
    id: 'dt_21',
    bloco: 'ritmo_e_foco',
    blocoTitulo: 'Ritmo & Foco',
    numero: 21,
    pergunta: 'Qual é a sua dinâmica preferida para intervalos entre sessões?',
    detalhe: 'Ajuda a calibrar o tempo livre sugerido entre blocos adjacentes.',
    opcoes: [
      { texto: 'Micro-pausas de 5 minutos a cada bloco curto', subtexto: 'Alongamento rápido sem sair do ambiente' },
      { texto: 'Pausa de 15 minutos a cada hora completa', subtexto: 'Descompressão com lanche ou café' },
      { texto: 'Uma única pausa longa de 30 minutos após 2 horas', subtexto: 'Bloco contínuo seguido de intervalo substancial' },
      { texto: 'Sem pausas pré-definidas (paro apenas sob fadiga)', subtexto: 'Fluxo livre orientado ao estado de Flow' },
    ],
  },
  {
    id: 'dt_22',
    bloco: 'ritmo_e_foco',
    blocoTitulo: 'Ritmo & Foco',
    numero: 22,
    pergunta: 'Como você lida com interrupções e distrações no seu ambiente de estudo?',
    detalhe: 'Calibra o nível de proteção de foco solicitado ao shell.',
    opcoes: [
      { texto: 'Retomo o foco imediatamente sem atrito', subtexto: 'Boa capacidade de retorno pós-notificação' },
      { texto: 'Levo de 5 a 10 minutos para voltar ao ritmo', subtexto: 'Custo de troca de contexto perceptível' },
      { texto: 'Interrupções quebram a qualidade da minha sessão inteira', subtexto: 'Exige silenciamento de notificações e modo foco' },
      { texto: 'Necessito de isolamento absoluto para render', subtexto: 'Ambiente controlado e fones de cancelamento de ruído' },
    ],
  },

  // --- Bloco 6: Prioridades, Tradeoffs e Conflitos ---
  {
    id: 'dt_23',
    bloco: 'prioridades_e_tradeoffs',
    blocoTitulo: 'Prioridades & Tradeoffs',
    numero: 23,
    pergunta: 'Qual área do conhecimento exige o maior reforço e peso na sua rotina?',
    detalhe: 'Esta área receberá automaticamente a maior fatia proporcional de tempo semanal.',
    opcoes: [
      { texto: 'Matemática e suas Tecnologias', subtexto: 'Maior potencial de alavancagem de pontuação pela TRI', pesoExatas: 1.6 },
      { texto: 'Ciências da Natureza (Física, Química, Biologia)', subtexto: 'Muitos conteúdos conceituais e fórmulas', pesoNatureza: 1.6 },
      { texto: 'Redação e Linguagens', subtexto: 'Domínio textual e interpretação crítica', pesoLinguagens: 1.6 },
      { texto: 'Ciências Humanas (História, Geografia, Filosofia)', subtexto: 'Grande volume de contextualização histórica', pesoHumanas: 1.6 },
      { texto: 'Equilíbrio proporcional entre todas as áreas', subtexto: 'Distribuição homogênea sem favorecimento' },
    ],
  },
  {
    id: 'dt_24',
    bloco: 'prioridades_e_tradeoffs',
    blocoTitulo: 'Prioridades & Tradeoffs',
    numero: 24,
    pergunta: 'Quando ocorrer um imprevisto inevitável em um dia, como o cronograma deve reagir?',
    detalhe: 'Regra de ouro da Agenda para reorganização temporal de blocos atrasados.',
    opcoes: [
      { texto: 'Reprogramar o bloco para o próximo dia livre da semana', subtexto: 'Mantém a carga horária original sem cortar conteúdo' },
      { texto: 'Encurtar as sessões mantendo o contato com todas as matérias', subtexto: 'Preserva a frequência mesmo com menos minutos' },
      { texto: 'Pular temporariamente a matéria em que já tenho bom domínio', subtexto: 'Protege as disciplinas mais frágeis' },
      { texto: 'Compensar no fim de semana ou horário reserva', subtexto: 'Usa a margem de segurança do sábado/domingo' },
    ],
  },
  {
    id: 'dt_25',
    bloco: 'prioridades_e_tradeoffs',
    blocoTitulo: 'Prioridades & Tradeoffs',
    numero: 25,
    pergunta: 'Se o tempo disponível for menor do que o necessário, qual é o seu critério de corte?',
    detalhe: 'Critério de desempate explícito quando a grade horária ficar superlotada.',
    opcoes: [
      { texto: 'Priorizar matérias de maior peso para o meu curso pretendido', subtexto: 'Foco pragmático na pontuação do SISU' },
      { texto: 'Priorizar matérias com as quais tenho maior dificuldade', subtexto: 'Fechamento urgente de lacunas conceituais' },
      { texto: 'Reduzir o tempo de teoria e focar exclusivamente em resolução de questões', subtexto: 'Método reverso ativo' },
      { texto: 'Reduzir igualmente a carga de todas as disciplinas', subtexto: 'Corte linear proporcional para manter a visão geral' },
    ],
  },
  {
    id: 'dt_26',
    bloco: 'prioridades_e_tradeoffs',
    blocoTitulo: 'Prioridades & Tradeoffs',
    numero: 26,
    pergunta: 'Qual é o seu nível de tolerância a ajustes automáticos e flexibilidade na agenda?',
    detalhe: 'Dita a autonomia do Temporal OS sobre reagendamentos.',
    opcoes: [
      { texto: 'Alta: prefiro uma agenda viva que se reacomoda ativamente', subtexto: 'Sugestões inteligentes aceitas com facilidade' },
      { texto: 'Moderada: prefiro estabilidade com sugestões para eu aceitar', subtexto: 'Controle manual guiado por alertas claros' },
      { texto: 'Rígida: meus horários precisam ser rigorosamente fixos e previsíveis', subtexto: 'Sem alterações automáticas em compromissos agendados' },
    ],
  },
];

// Compatibilidade com código legado que ainda faça referência a DIAGNOSTICO_QUESTOES
export type AreaEnem = 'matematica' | 'linguagens' | 'humanas' | 'natureza';
export interface DiagnosticoQuestao {
  id: string;
  area: AreaEnem;
  dificuldade: 'facil' | 'media' | 'dificil';
  pergunta: string;
  opcoes: string[];
  respostaCorretaIndex: number;
}
export const DIAGNOSTICO_QUESTOES: DiagnosticoQuestao[] = [
  {
    id: 'q1',
    area: 'matematica',
    dificuldade: 'facil',
    pergunta: 'Se um produto custava R$ 80 e teve um desconto de 25%, qual o novo preço?',
    opcoes: ['R$ 55', 'R$ 60', 'R$ 65', 'R$ 70'],
    respostaCorretaIndex: 1,
  },
  {
    id: 'q2',
    area: 'linguagens',
    dificuldade: 'media',
    pergunta: '"O rio corria manso, sem pressa, como quem já sabe onde vai chegar." A comparação do rio com "quem já sabe onde vai chegar" sugere principalmente:',
    opcoes: [
      'Urgência e inconstância do curso do rio',
      'Serenidade ligada a um destino certo',
      'Perigo iminente na travessia',
      'Ausência total de movimento',
    ],
    respostaCorretaIndex: 1,
  },
  {
    id: 'q3',
    area: 'matematica',
    dificuldade: 'dificil',
    pergunta: 'Numa progressão geométrica, o 2º termo é 6 e o 5º termo é 162. Qual é a razão da progressão?',
    opcoes: ['2', '3', '4', '9'],
    respostaCorretaIndex: 1,
  },
];

export function ajustarDominioPorDiagnostico(
  dominio: Partial<Record<string, DomainLevel>>,
  acertos: number
): Partial<Record<string, DomainLevel>> {
  if (acertos === DIAGNOSTICO_QUESTOES.length) {
    return Object.fromEntries(
      Object.entries(dominio).map(([disciplina, nivel]) => [disciplina, nivel === 'baixo' ? 'medio' : nivel])
    );
  }
  if (acertos === 0) {
    return Object.fromEntries(
      Object.entries(dominio).map(([disciplina, nivel]) => [disciplina, nivel === 'alto' ? 'medio' : nivel])
    );
  }
  return dominio;
}

/**
 * Gera o plano a partir de todas as respostas temporais e autopercepções de domínio.
 */
export function gerarPlano(answers: CronogramaAnswers, hoje: Date = new Date()): CronogramaPlan {
  const dataProva = new Date(`${answers.dataProva}T00:00:00`);
  const semanasRestantes = calcularSemanasRestantes(hoje, dataProva);
  const intensidade = calcularIntensidade(semanasRestantes);

  // Calcula horas brutas disponíveis
  const diasCount = Math.max(1, answers.diasDisponiveis.length || 5);
  const horasPorDia = answers.horasPorDia || 3;
  const horasBrutas = diasCount * horasPorDia;

  // Deduz horas comprometidas com trabalho, deslocamento, treinos etc.
  const horasComprometidas = answers.horasComprometidasSemana ?? 0;
  // Margem mínima de 4 horas/semana para que o plano seja sempre viável e positivo
  const horasSemanais = Math.max(4, Math.round((horasBrutas - Math.min(horasComprometidas * 0.35, horasBrutas * 0.6)) * 2) / 2);

  // Moduladores por área derivados de respostas temporais (Q23, Q17, Q19)
  let modExatas = 1.0;
  let modNatureza = 1.0;
  let modLinguagens = 1.0;
  let modHumanas = 1.0;

  if (answers.diagnosticoRespostas) {
    const r23 = answers.diagnosticoRespostas['dt_23'];
    if (r23 === 0) modExatas *= 1.4;
    else if (r23 === 1) modNatureza *= 1.4;
    else if (r23 === 2) modLinguagens *= 1.4;
    else if (r23 === 3) modHumanas *= 1.4;

    const r17 = answers.diagnosticoRespostas['dt_17'];
    if (r17 === 0) {
      modExatas *= 1.25;
      modNatureza *= 1.25;
    }

    const r19 = answers.diagnosticoRespostas['dt_19'];
    if (r19 === 0) modLinguagens *= 1.3;
  }

  // Pesos específicos por disciplina
  const pesos = CRONOGRAMA_DISCIPLINES.map((disciplina) => {
    const dominio = answers.dominio[disciplina] ?? 'medio';
    let basePeso = PESO_POR_DOMINIO[dominio];

    if (disciplina === 'Matemática') basePeso *= modExatas;
    else if (disciplina === 'Física' || disciplina === 'Química' || disciplina === 'Biologia') basePeso *= modNatureza;
    else if (disciplina === 'Redação' || disciplina === 'Linguagens') basePeso *= modLinguagens;
    else if (disciplina === 'Humanas') basePeso *= modHumanas;

    return { disciplina, dominio, peso: basePeso };
  });

  const somaPesos = pesos.reduce((soma, p) => soma + p.peso, 0);

  const alocacao: DisciplinaAlocacao[] = pesos.map(({ disciplina, dominio, peso }) => {
    const percentual = somaPesos > 0 ? (peso / somaPesos) * 100 : 100 / pesos.length;
    // Arredonda para múltiplos de 0.5h
    const horasSemana = Math.max(0.5, Math.round(((percentual / 100) * horasSemanais) * 2) / 2);
    return { disciplina, dominio, horasSemana, percentual: Math.round(percentual) };
  });

  // Extrai preferências operacionais do diagnóstico
  let blocoMinutosIdeal = answers.blocoMinutosIdeal || 45;
  let horarioPico = answers.horarioPico || '14:00';
  let bufferMinutos = answers.bufferMinutos ?? 15;
  let areaPrioritaria = answers.areaPrioritaria || 'Matemática';
  let metaConcorrencia = answers.metaConcorrencia || 'Média-Alta (700-780 pts)';
  let estrategiaCompensacao = 'Reprogramar para o próximo dia livre';

  if (answers.diagnosticoRespostas) {
    const r20 = answers.diagnosticoRespostas['dt_20'];
    if (r20 === 0) blocoMinutosIdeal = 30;
    else if (r20 === 1) blocoMinutosIdeal = 45;
    else if (r20 === 2) blocoMinutosIdeal = 90;
    else if (r20 === 3) blocoMinutosIdeal = 120;

    const r12 = answers.diagnosticoRespostas['dt_12'];
    if (r12 === 0) horarioPico = '08:00';
    else if (r12 === 1) horarioPico = '14:00';
    else if (r12 === 2) horarioPico = '19:30';
    else if (r12 === 3) horarioPico = '23:00';

    const r15 = answers.diagnosticoRespostas['dt_15'];
    if (r15 === 0) bufferMinutos = 0;
    else if (r15 === 1) bufferMinutos = 15;
    else if (r15 === 2) bufferMinutos = 30;
    else if (r15 === 3) bufferMinutos = 60;

    const r23 = answers.diagnosticoRespostas['dt_23'];
    if (r23 === 0) areaPrioritaria = 'Matemática e Tecnologias';
    else if (r23 === 1) areaPrioritaria = 'Ciências da Natureza';
    else if (r23 === 2) areaPrioritaria = 'Redação e Linguagens';
    else if (r23 === 3) areaPrioritaria = 'Ciências Humanas';
    else areaPrioritaria = 'Equilíbrio Geral';

    const r17 = answers.diagnosticoRespostas['dt_17'];
    if (r17 === 0) metaConcorrencia = 'Alta Concorrência (>780 pts)';
    else if (r17 === 1) metaConcorrencia = 'Média-Alta (700-780 pts)';
    else if (r17 === 2) metaConcorrencia = 'Padrão (600-700 pts)';
    else metaConcorrencia = 'Aprimoramento Geral';

    const r24 = answers.diagnosticoRespostas['dt_24'];
    if (r24 === 0) estrategiaCompensacao = 'Reprogramar para o próximo dia livre';
    else if (r24 === 1) estrategiaCompensacao = 'Encurtar sessões mantendo frequência';
    else if (r24 === 2) estrategiaCompensacao = 'Pular matéria de maior domínio';
    else if (r24 === 3) estrategiaCompensacao = 'Compensar no fim de semana';
  }

  return {
    semanasRestantes,
    horasSemanais,
    intensidade,
    alocacao,
    blocoMinutosIdeal,
    horarioPico,
    bufferMinutos,
    areaPrioritaria,
    metaConcorrencia,
    estrategiaCompensacao,
    dataCalculada: hoje.toISOString(),
    diagnosticoRespostas: answers.diagnosticoRespostas,
  };
}

export function gerarPlanoGenerico(hoje: Date = new Date()): CronogramaPlan {
  const dataProvaGenerica = new Date(hoje);
  dataProvaGenerica.setDate(dataProvaGenerica.getDate() + 90);
  return gerarPlano(
    {
      diasDisponiveis: ['seg', 'ter', 'qua', 'qui', 'sex'],
      horasPorDia: 2,
      dataProva: dataProvaGenerica.toISOString().slice(0, 10),
      dominio: {},
    },
    hoje
  );
}

export interface BlocoAgendaCronograma {
  disciplina: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
}

const ISO_WEEKDAY: Record<Weekday, number> = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, dom: 7 };

function dataDaSemana(dia: Weekday, hoje: Date): Date {
  const hojeIso = hoje.getDay() === 0 ? 7 : hoje.getDay();
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - (hojeIso - 1));
  const data = new Date(segunda);
  data.setDate(segunda.getDate() + (ISO_WEEKDAY[dia] - 1));
  return data;
}

function somarMinutos(horaStr: string, minutos: number): string {
  const [h, m] = horaStr.split(':').map(Number);
  const total = (h || 0) * 60 + (m || 0) + minutos;
  const novaHora = Math.floor((total % (24 * 60)) / 60);
  const novoMin = total % 60;
  return `${String(novaHora).padStart(2, '0')}:${String(novoMin).padStart(2, '0')}`;
}

export function gerarBlocosAgendaSemana(
  plan: CronogramaPlan,
  diasDisponiveis: Weekday[],
  hoje: Date = new Date()
): BlocoAgendaCronograma[] {
  if (diasDisponiveis.length === 0) return [];
  const disciplinasComHoras = plan.alocacao.filter((a) => a.horasSemana > 0);
  const baseHoraInicio = plan.horarioPico || '14:00';

  return disciplinasComHoras.map((a, i) => {
    const dia = diasDisponiveis[i % diasDisponiveis.length];
    const data = dataDaSemana(dia, hoje);
    const durationMinutes = Math.min(180, Math.max(30, Math.round(a.horasSemana * 60)));
    const startTime = baseHoraInicio;
    const endTime = somarMinutos(startTime, durationMinutes);

    return {
      disciplina: a.disciplina,
      date: data.toISOString().slice(0, 10),
      durationMinutes,
      startTime,
      endTime,
    };
  });
}
