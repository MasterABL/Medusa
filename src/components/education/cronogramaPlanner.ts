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
  const horasSemanais = answers.diasDisponiveis.length * answers.horasPorDia;

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
