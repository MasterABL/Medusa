/**
 * Medusa — Motor de planejamento do Cronograma (Round 5 §15)
 *
 * Lógica pura, sem UI, para poder ser testada isoladamente (Round 5 §28: separar lógica de
 * apresentação). Calcula um plano REAL a partir de 4 entradas (rotina, disponibilidade,
 * objetivo/prazo, domínio por disciplina) — nunca um cenário fixo tipo "ENEM 2028 = plano X".
 *
 * Honestidade (Round 5 §27): este motor decide QUANTAS horas por semana faz sentido dedicar a
 * cada disciplina dado o prazo e o autorrelato de domínio — ele NÃO gera os blocos específicos
 * do Cronograma (que continuam sendo a fixture curada de `educationFixtures.ts`, sem backend
 * nenhum por trás). O resultado é apresentado como "seu plano calculado" (um resumo real,
 * derivado das respostas), separado do "cronograma detalhado" (que não muda com as respostas) —
 * nunca confundindo os dois.
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

/** As 7 disciplinas do Cronograma — mesma lista de `disciplineColor.ts`, não duplicada aqui. */
export const CRONOGRAMA_DISCIPLINES = [
  'Matemática',
  'Física',
  'Química',
  'Biologia',
  'Humanas',
  'Linguagens',
  'Redação',
] as const;

export interface CronogramaAnswers {
  diasDisponiveis: Weekday[];
  horasPorDia: number;
  dataProva: string; // "YYYY-MM-DD"
  dominio: Partial<Record<string, DomainLevel>>;
  /**
   * Round 6 §16 (Bloco 3 — Outras Atividades): soma de horas/semana já comprometidas com
   * atividades recorrentes fora do estudo (academia, cursos, compromissos fixos) que o
   * onboarding coleta. Sai da conta ANTES de distribuir horas entre disciplinas — é o que faz
   * "tenho academia 3x por semana" mudar o plano de verdade, em vez de só ser uma pergunta
   * decorativa. Nunca negativo no resultado final (`Math.max(0, ...)`).
   */
  horasComprometidasSemana?: number;
}

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
  intensivo: 'Prioridade em fechar lacunas — menos espaço para explorar temas novos.',
  critico: 'Foco total em revisão e simulados; pouco tempo para conteúdo inédito.',
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
}

/** Peso inverso ao domínio: quem domina menos recebe mais horas. Nunca zero — mesmo "alto" domínio continua precisando de revisão. */
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
  if (semanasRestantes > 12) return 'longo-prazo';
  if (semanasRestantes > 6) return 'moderado';
  if (semanasRestantes > 2) return 'intensivo';
  return 'critico';
}

/**
 * Gera o plano a partir das respostas. `hoje` é injetável para permitir teste determinístico
 * (sem depender de `new Date()` no momento exato da chamada).
 */
export function gerarPlano(answers: CronogramaAnswers, hoje: Date = new Date()): CronogramaPlan {
  const dataProva = new Date(`${answers.dataProva}T00:00:00`);
  const semanasRestantes = calcularSemanasRestantes(hoje, dataProva);
  const intensidade = calcularIntensidade(semanasRestantes);
  const horasBrutas = answers.diasDisponiveis.length * answers.horasPorDia;
  const horasSemanais = Math.max(0, horasBrutas - (answers.horasComprometidasSemana ?? 0));

  const pesos = CRONOGRAMA_DISCIPLINES.map((disciplina) => {
    const dominio = answers.dominio[disciplina] ?? 'medio';
    return { disciplina, dominio, peso: PESO_POR_DOMINIO[dominio] };
  });
  const somaPesos = pesos.reduce((soma, p) => soma + p.peso, 0);

  const alocacao: DisciplinaAlocacao[] = pesos.map(({ disciplina, dominio, peso }) => {
    const percentual = somaPesos > 0 ? (peso / somaPesos) * 100 : 100 / pesos.length;
    // Arredonda pra múltiplos de 0,5h — nenhum aluno agenda "1.37h de Física".
    const horasSemana = Math.round(((percentual / 100) * horasSemanais) * 2) / 2;
    return { disciplina, dominio, horasSemana, percentual: Math.round(percentual) };
  });

  return { semanasRestantes, horasSemanais, intensidade, alocacao };
}

/** Plano genérico (resposta "Não" ao personalizar) — prazo/rotina neutros, domínio uniforme (tudo "médio"), então a alocação sai igual entre as 7 disciplinas. Rotulado como genérico onde é exibido, nunca como se fosse calculado a partir de respostas reais. */
export function gerarPlanoGenerico(hoje: Date = new Date()): CronogramaPlan {
  const dataProvaGenerica = new Date(hoje);
  dataProvaGenerica.setDate(dataProvaGenerica.getDate() + 90); // ~3 meses, prazo neutro de referência
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

/**
 * Mini-diagnóstico adaptativo (Round 6 §17) — 3 questões de dificuldade crescente (fácil,
 * intermediária, difícil), a mesma estrutura pedida explicitamente. Não é dividido por
 * disciplina (21 perguntas — 3 por cada uma das 7 — inflaria o onboarding sem uma base de
 * conteúdo real por trás pra validar cada resposta corretamente) — é um recorte único de
 * raciocínio geral, usado só como um AJUSTE FINO sobre a autoavaliação por disciplina que o
 * usuário já deu, nunca como substituto dela. Rotulado na UI como "Estimativa inicial de
 * domínio", nunca como precisão científica (§17 explícito).
 */
/**
 * Round 7 §19: `area` existe pra que o mini-diagnóstico NUNCA seja arquiteturalmente "só
 * matemática" — o protótipo de hoje tem mais perguntas de raciocínio lógico-matemático porque são
 * as mais fáceis de validar objetivamente sem uma IA por trás, mas a estrutura já suporta as 4
 * áreas do ENEM (prova disso: `DIAGNOSTICO_QUESTOES` abaixo já tem 1 questão de Linguagens, não só
 * matemática). Não infla o número de perguntas artificialmente pra "parecer mais completo" — o
 * baseline de UI continua pequeno, só a premissa de "diagnóstico = matemática" foi removida.
 */
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

/**
 * Aplica o resultado do diagnóstico como um pequeno ajuste sobre a autoavaliação (Round 6 §18 —
 * as respostas precisam realmente alterar o plano, não só decorar a tela). Regra deliberadamente
 * conservadora e unidirecional por faixa de acerto — nunca inventa precisão que 3 perguntas não
 * têm:
 * - 3/3 acertos: sinal de que o autorrelato pode estar subestimado — "baixo" sobe pra "medio"
 *   (nunca pula direto pra "alto": o diagnóstico é genérico, não valida a disciplina específica).
 * - 0/3 acertos: sinal oposto — "alto" desce pra "medio" (mesma lógica, nunca derruba até "baixo").
 * - 1-2/3: nenhum ajuste — resultado ambíguo demais pra alterar o que o usuário já disse sobre
 *   si mesmo.
 */
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
 * Fundação de integração Cronograma -> Agenda (Round 6 §19). Converte a alocação semanal do
 * plano em blocos concretos com DATA real (não recorrência infinita — representa só a semana
 * atual/próxima ocorrência de cada dia escolhido, dentro dos próximos 7 dias a partir de hoje).
 * Decisão consciente de escopo: gerar uma série recorrente de verdade exigiria também a UI pra
 * editar/cancelar essa série depois (o mesmo cuidado que a Agenda já tem pra rotinas existentes,
 * ver `deleteRecurringOccurrence` em AgendaContext.tsx) — isso fica registrado como próximo passo,
 * não implementado agora, pra não criar uma responsabilidade que a Agenda não consegue gerenciar
 * de volta ainda.
 *
 * Uma disciplina por dia disponível, round-robin (disciplina[i % diasDisponiveis.length]) —
 * simples o bastante pra não inventar heurística de "melhor dia pra cada matéria" sem dado real
 * pra basear isso (ver §19: "quando tecnicamente possível", não "adivinhar o resto").
 */
export interface BlocoAgendaCronograma {
  disciplina: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
}

const ISO_WEEKDAY: Record<Weekday, number> = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, dom: 7 };

function proximaDataDoDia(dia: Weekday, hoje: Date): Date {
  const hojeIso = hoje.getDay() === 0 ? 7 : hoje.getDay();
  const delta = (ISO_WEEKDAY[dia] - hojeIso + 7) % 7;
  const data = new Date(hoje);
  data.setDate(data.getDate() + delta);
  return data;
}

export function gerarBlocosAgendaSemana(
  plan: CronogramaPlan,
  diasDisponiveis: Weekday[],
  hoje: Date = new Date()
): BlocoAgendaCronograma[] {
  if (diasDisponiveis.length === 0) return [];
  const disciplinasComHoras = plan.alocacao.filter((a) => a.horasSemana > 0);

  return disciplinasComHoras.map((a, i) => {
    const dia = diasDisponiveis[i % diasDisponiveis.length];
    const data = proximaDataDoDia(dia, hoje);
    return {
      disciplina: a.disciplina,
      date: data.toISOString().slice(0, 10),
      durationMinutes: Math.round(a.horasSemana * 60),
    };
  });
}
