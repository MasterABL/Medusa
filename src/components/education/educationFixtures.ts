/**
 * MEDUSA — EDUCAÇÃO / FIXTURES DE DEMONSTRAÇÃO
 * ==============================================================================
 * REGRA ANTI-FICÇÃO / ESPECIFICAÇÃO DE PROTÓTIPO:
 * Os dados abaixo são fixtures controlados para a validação da experiência
 * de estudo de "Física · Mecânica Ondulatória".
 *
 * NÃO contêm métricas arbitrárias ou inventadas (ex: "+5.0% retenção").
 * Todos os cálculos de score, duração e revisão derivam estritamente do
 * comportamento do usuário durante a sessão.
 * ==============================================================================
 */

import { ExerciseQuestion, LiveSummaryPoint, LessonMetadata } from './types';

export const LESSON_FIXTURE: LessonMetadata = {
  discipline: 'Física',
  topic: 'Mecânica Ondulatória',
  estimatedDuration: '45 min',
  actualDurationSeconds: 2700, // 45 minutos exatos
  module: 'Física Geral · Módulo 03',
  nextTopic: 'Física · Acústica e Fenômenos Sonoros',
};

export const INITIAL_SUMMARY_POINTS: LiveSummaryPoint[] = [
  {
    id: 'sum-1',
    timestamp: 120,
    formattedTime: '02:00',
    title: 'Definição de Onda Mecânica',
    text: 'Perturbação que transporta energia e quantidade de movimento através de um meio elástico, sem transportar matéria.',
    icon: 'waves',
  },
  {
    id: 'sum-2',
    timestamp: 480,
    formattedTime: '08:00',
    title: 'Equação Fundamental: v = λ · f',
    text: 'A velocidade de propagação depende exclusivamente das propriedades do meio; na refração, a frequência permanece constante.',
    icon: 'calculate',
  },
  {
    id: 'sum-3',
    timestamp: 950,
    formattedTime: '15:50',
    title: 'Interferência e Superposição',
    text: 'O princípio da superposição estabelece que o deslocamento resultante é a soma algébrica dos deslocamentos individuais.',
    icon: 'grain',
  },
  {
    id: 'sum-4',
    timestamp: 1420,
    formattedTime: '23:40',
    title: 'Ondas Estacionárias',
    text: 'Resultam da superposição de duas ondas periódicas de mesma frequência e amplitude que se propagam em sentidos opostos.',
    icon: 'line_weight',
  },
];

export const EXERCISE_QUESTIONS: ExerciseQuestion[] = [
  {
    id: 1,
    topic: 'Natureza das Ondas Mecânicas',
    question:
      'Uma explosão hipotética ocorre na superfície de um satélite lunar no vácuo do espaço. Um astronauta a 500 metros de distância poderá ouvir o estrondo da explosão?',
    options: [
      {
        id: 'opt-1a',
        letter: 'A',
        text: 'Sim, pois a energia mecânica da explosão se propaga por ondas longitudinais no vácuo.',
      },
      {
        id: 'opt-1b',
        letter: 'B',
        text: 'Não, pois as ondas sonoras são ondas mecânicas e exigem um meio material para propagação de perturbação de pressão.',
      },
      {
        id: 'opt-1c',
        letter: 'C',
        text: 'Sim, contanto que o astronauta esteja com o rádio do traje desativado.',
      },
      {
        id: 'opt-1d',
        letter: 'D',
        text: 'Não, pois a velocidade do som no vácuo é instantânea e inaudível pelo ouvido humano.',
      },
    ],
    correctOptionId: 'opt-1b',
    explanation:
      'Ondas sonoras são ondas mecânicas longitudinais. Elas propagam oscilações de pressão através da colisão entre partículas de um meio material. No vácuo, não há matéria para sustentar essa propagação.',
    confusionDiagnosis:
      'É comum confundir ondas mecânicas (som) com ondas eletromagnéticas (luz, rádio). A luz da explosão seria vista imediatamente, mas o som mecânico é fisicamente impossível no vácuo.',
  },
  {
    id: 2,
    topic: 'Refração e Equação v = λ · f',
    question:
      'Quando uma onda sonora passa do ar para a água, sua velocidade de propagação aumenta significativamente (de ~340 m/s para ~1500 m/s). O que ocorre com a sua frequência e seu comprimento de onda?',
    options: [
      {
        id: 'opt-2a',
        letter: 'A',
        text: 'A frequência aumenta proporcionalmente à velocidade e o comprimento de onda permanece fixo.',
      },
      {
        id: 'opt-2b',
        letter: 'B',
        text: 'A frequência e o comprimento de onda diminuem pela maior densidade da água.',
      },
      {
        id: 'opt-2c',
        letter: 'C',
        text: 'A frequência permanece constante (determinada pela fonte) e o comprimento de onda aumenta proporcionalmente.',
      },
      {
        id: 'opt-2d',
        letter: 'D',
        text: 'O comprimento de onda diminui e a frequência duplica para conservar o momento.',
      },
    ],
    correctOptionId: 'opt-2c',
    explanation:
      'A frequência de uma onda é determinada unicamente pela fonte emissora e não se altera ao mudar de meio. Como v = λ · f e a velocidade v aumentou na água, o comprimento de onda λ necessariamente aumenta na mesma proporção.',
    confusionDiagnosis:
      'Costuma-se imaginar que a frequência muda com a velocidade do meio. Lembre-se: meio altera velocidade e comprimento de onda; fonte emissora fixa a frequência.',
  },
  {
    id: 3,
    topic: 'Efeito Doppler',
    question:
      'Uma ambulância com sirene ligada aproxima-se rapidamente de um observador em repouso na calçada. O que o observador percebe em relação ao som emitido?',
    options: [
      {
        id: 'opt-3a',
        letter: 'A',
        text: 'Uma frequência aparente maior (som mais agudo) devido à compressão espacial das frentes de onda na direção do movimento.',
      },
      {
        id: 'opt-3b',
        letter: 'B',
        text: 'Uma velocidade de propagação maior do som no ar atmosférico.',
      },
      {
        id: 'opt-3c',
        letter: 'C',
        text: 'Uma frequência aparente menor (som mais grave) porque a fonte se move mais rápido que o vento.',
      },
      {
        id: 'opt-3d',
        letter: 'D',
        text: 'A mesma frequência e amplitude, pois o ar circundante é estacionário.',
      },
    ],
    correctOptionId: 'opt-3a',
    explanation:
      'Pelo Efeito Doppler, quando a fonte se move em direção ao observador, cada nova frente de onda é emitida mais próxima da anterior, reduzindo a distância espacial aparente (λ) e aumentando a taxa de frentes de onda recebidas por segundo (frequência percebida mais alta / tom agudo).',
    confusionDiagnosis:
      'O Efeito Doppler não altera a velocidade da onda no meio (que continua sendo a velocidade do som no ar), mas sim o comprimento aparente das frentes e a frequência detectada.',
  },
  {
    id: 4,
    topic: 'Ondas Estacionárias',
    question:
      'Em uma corda vibrante de extremidades fixas no modo fundamental (1º harmônico), a estrutura de interferência formada apresenta:',
    options: [
      {
        id: 'opt-4a',
        letter: 'A',
        text: 'Apenas nós em toda a extensão da corda sem deslocamento de energia.',
      },
      {
        id: 'opt-4b',
        letter: 'B',
        text: 'Dois nós nas extremidades fixas e um ventre de amplitude máxima no centro.',
      },
      {
        id: 'opt-4c',
        letter: 'C',
        text: 'Três ventres centrais e nenhum ponto de amplitude nula.',
      },
      {
        id: 'opt-4d',
        letter: 'D',
        text: 'Um nó móvel no centro que se desloca periodicamente em direção às pontas.',
      },
    ],
    correctOptionId: 'opt-4b',
    explanation:
      'Nas extremidades fixas da corda, o deslocamento é necessariamente nulo, formando nós (pontos de interferência destrutiva total). No modo fundamental, a corda vibra com um único ventre (ponto de interferência construtiva de amplitude máxima) localizado exatamente no ponto médio.',
    confusionDiagnosis:
      'Muitos estudantes confundem nós (amplitude zero / repouso) com ventres (amplitude máxima / oscilação pico a pico).',
  },
  {
    id: 5,
    topic: 'Difração de Ondas',
    question:
      'Para que uma onda mecânica contorne um obstáculo ou atravesse uma abertura manifestando difração acentuada e nítida, qual condição dimensional deve ser satisfeita?',
    options: [
      {
        id: 'opt-5a',
        letter: 'A',
        text: 'O comprimento de onda (λ) deve ser da mesma ordem de grandeza ou maior que as dimensões do obstáculo ou fenda.',
      },
      {
        id: 'opt-5b',
        letter: 'B',
        text: 'A fenda precisa ser pelo menos 1000 vezes maior que a amplitude da onda.',
      },
      {
        id: 'opt-5c',
        letter: 'C',
        text: 'A velocidade da onda precisa superar a velocidade de escape no meio elástico.',
      },
      {
        id: 'opt-5d',
        letter: 'D',
        text: 'O obstáculo deve absorver 100% da energia eletromagnética incidente.',
      },
    ],
    correctOptionId: 'opt-5a',
    explanation:
      'A difração é a propriedade das ondas de contornar obstáculos e fendas. O efeito é tanto mais perceptível quanto mais próximo o comprimento de onda estiver das dimensões lineares da abertura (d ~ λ). Quando d >> λ, a propagação se aproxima da ótica geométrica em linha reta.',
    confusionDiagnosis:
      'Achar que qualquer fenda difrata igualmente qualquer onda. O som (λ de centímetros a metros) difrata facilmente em portas, enquanto a luz visível (λ de centenas de nanômetros) exige fendas micrométricas para difração evidente.',
  },
];

export const EDUCATION_TRACK_FIXTURE = [
  {
    id: 'track-1',
    code: 'FIS-101',
    title: 'Cinemática Vetorial & Dinâmica Newtoniana',
    status: 'completed' as const,
    score: '9.2',
    date: 'Concluído em 10/Set',
    duration: '12h acumuladas',
  },
  {
    id: 'track-2',
    code: 'FIS-102',
    title: 'Trabalho, Energia & Sistemas Conservativos',
    status: 'completed' as const,
    score: '8.8',
    date: 'Concluído em 12/Set',
    duration: '8h acumuladas',
  },
  {
    id: 'track-3',
    code: 'FIS-103',
    title: 'Gravitação Universal & Leis de Kepler',
    status: 'completed' as const,
    score: '9.5',
    date: 'Concluído em 14/Set',
    duration: '6h acumuladas',
  },
  {
    id: 'track-4',
    code: 'FIS-201',
    title: 'Mecânica Ondulatória: Perturbação e Superposição',
    status: 'in_progress' as const, // vira 'completed' após a sessão!
    score: 'Pendente',
    date: 'Hoje · Sessão Recomendada',
    duration: '45 min programados',
  },
  {
    id: 'track-5',
    code: 'FIS-202',
    title: 'Acústica, Ressonância e Fenômenos Sonoros',
    status: 'locked' as const,
    score: 'Bloqueado',
    date: 'Próxima etapa da trilha',
    duration: '50 min estimados',
  },
];
