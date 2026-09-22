/**
 * MEDUSA — EDUCAÇÃO / FIXTURES MULTI-TRILHA
 * ==============================================================================
 * REGRA DE AUDITORIA E TRANSPARÊNCIA:
 * Os dados abaixo são FIXTURES pré-definidas para as 3 trilhas oficiais do
 * Learning OS: Faculdade, Inglês e Vestibular.
 *
 * Taxonomia Estrita de Dados:
 * - FIXTURE: Metadados, currículos de módulos, 5 questões por trilha, diagnósticos
 *   e próxima data de revisão nominal.
 * - LOCAL STATE / DERIVED: Scores, anotações e respostas são computados em memória
 *   React durante a sessão ativa.
 * - NÃO IMPLEMENTADO: Persistência em banco de dados Supabase e processamento de
 *   voz real em backend (Whisper / TTS).
 * ==============================================================================
 */

import { StudyTrack, TrackDefinition } from './types';

export const TRACK_DEFINITIONS: Record<StudyTrack, TrackDefinition> = {
  faculdade: {
    id: 'faculdade',
    name: 'Faculdade',
    tagline: 'Física II · Engenharia & Ciências Exatas',
    domainLabel: 'Ensino Superior · Bacharelado',
    accentColor: '#71DBD2',
    lesson: {
      track: 'faculdade',
      trackLabel: 'Faculdade',
      discipline: 'Física II',
      topic: 'Oscilações · Movimento Harmônico Simples (MHS)',
      sessionObjective: 'Compreender a dinâmica do MHS, a força restauradora elástica e a dedução da equação diferencial do oscilador harmônico.',
      estimatedDuration: '45 min',
      actualDurationSeconds: 2700,
      module: 'Física Geral II · Módulo 02: Sistemas Dinâmicos',
      nextTopic: 'Física II · Oscilações Amortecidas, Forçadas e Ressonância',
      nextTopicDescription: 'Dissipação viscosa de energia mecânica, fator de amortecimento γ, ressonância e curva de potência.',
    },
    summaryPoints: [
      {
        id: 'fac-sum-1',
        timestamp: 120,
        formattedTime: '02:00',
        title: 'Força Restauradora e Lei de Hooke',
        text: 'Em sistemas elásticos lineares, a força restauradora é proporcional e oposta ao deslocamento: F = -k·x, originando uma aceleração dependente da posição.',
        icon: 'tune',
      },
      {
        id: 'fac-sum-2',
        timestamp: 480,
        formattedTime: '08:00',
        title: 'Equação Diferencial: d²x/dt² + ω₀²x = 0',
        text: 'A frequência angular natural é ω₀ = √(k/m). A solução geral x(t) = A·cos(ω₀t + φ) descreve a evolução temporal com conservação de energia.',
        icon: 'functions',
      },
      {
        id: 'fac-sum-3',
        timestamp: 950,
        formattedTime: '15:50',
        title: 'Conservação de Energia no MHS',
        text: 'A energia mecânica total E = ½kA² é constante, alternando continuamente entre energia cinética máxima no equilíbrio (x=0) e potencial máxima nos pontos de retorno (x=±A).',
        icon: 'bolt',
      },
      {
        id: 'fac-sum-4',
        timestamp: 1420,
        formattedTime: '23:40',
        title: 'Pêndulo Simples e Aproximação Harmônica',
        text: 'Para pequenas amplitudes lineares (θ << 1 rad), sen(θ) ≈ θ, resultando em período independente da massa da esfera: T = 2π√(L/g).',
        icon: 'timelapse',
      },
    ],
    exerciseQuestions: [
      {
        id: 1,
        topic: 'Dinâmica do Oscilador Harmônico',
        question:
          'Um bloco acoplado a uma mola ideal de constante k oscila em MHS horizontal sobre uma superfície sem atrito. No ponto de deslocamento máximo (x = +A), quais são os valores relativos da velocidade e da aceleração do bloco?',
        options: [
          {
            id: 'opt-fac-1a',
            letter: 'A',
            text: 'Velocidade nula e aceleração máxima em módulo, apontando para a posição de equilíbrio.',
          },
          {
            id: 'opt-fac-1b',
            letter: 'B',
            text: 'Velocidade máxima em módulo e aceleração nula, pois o bloco está na extremidade.',
          },
          {
            id: 'opt-fac-1c',
            letter: 'C',
            text: 'Velocidade e aceleração ambas nulas, pois o corpo inverte momentaneamente o sentido.',
          },
          {
            id: 'opt-fac-1d',
            letter: 'D',
            text: 'Velocidade máxima e aceleração máxima apontando no mesmo sentido da oscilação.',
          },
        ],
        correctOptionId: 'opt-fac-1a',
        explanation:
          'Nas extremidades x = ±A, a velocidade v(t) inverte de sentido e passa pelo zero. Pela Lei de Hooke (F = -kx = ma), a força elástica atinge seu valor máximo, gerando aceleração máxima em módulo dirigida ao centro.',
        confusionDiagnosis:
          'Confundir aceleração máxima com velocidade máxima. Lembre-se de que a velocidade é defasada em 90° (π/2 rad) em relação ao deslocamento, enquanto a aceleração está em oposição de fase (180° / π rad).',
      },
      {
        id: 2,
        topic: 'Frequência Angular e Inércia',
        question:
          'Se a massa acoplada a um sistema oscilador massa-mola ideal for quadruplicada (4m) mantendo-se a mesma constante de rigidez k, o que ocorre com o período T da oscilação?',
        options: [
          {
            id: 'opt-fac-2a',
            letter: 'A',
            text: 'O período é reduzido à metade (T/2).',
          },
          {
            id: 'opt-fac-2b',
            letter: 'B',
            text: 'O período é duplicado (2T), pois T = 2π√(m/k).',
          },
          {
            id: 'opt-fac-2c',
            letter: 'C',
            text: 'O período quadruplica (4T) de forma linear com a massa inercial.',
          },
          {
            id: 'opt-fac-2d',
            letter: 'D',
            text: 'O período permanece inalterado, pois depende apenas da rigidez elástica da mola.',
          },
        ],
        correctOptionId: 'opt-fac-2b',
        explanation:
          'A relação analítica do período no MHS é T = 2π√(m/k). Multiplicar a massa por 4 resulta em √(4m/k) = 2·√(m/k), dobrando o período da oscilação.',
        confusionDiagnosis:
          'Esquecer a raiz quadrada na relação do período com a massa inercial (achar que quadruplica em vez de duplicar).',
      },
      {
        id: 3,
        topic: 'Energia Mecânica em Função da Amplitude',
        question:
          'Um estudante duplica a amplitude de oscilação de um oscilador harmônico simples (de A para 2A). O que acontece com a energia mecânica total do sistema?',
        options: [
          {
            id: 'opt-fac-3a',
            letter: 'A',
            text: 'A energia mecânica total quadruplica (4E), pois E é proporcional ao quadrado da amplitude (E = ½kA²).',
          },
          {
            id: 'opt-fac-3b',
            letter: 'B',
            text: 'A energia mecânica dobra (2E), crescendo na mesma proporção da amplitude.',
          },
          {
            id: 'opt-fac-3c',
            letter: 'C',
            text: 'A energia mecânica permanece constante, pois a frequência diminui para compensar.',
          },
          {
            id: 'opt-fac-3d',
            letter: 'D',
            text: 'A energia potencial aumenta 8 vezes enquanto a energia cinética diminui.',
          },
        ],
        correctOptionId: 'opt-fac-3a',
        explanation:
          'A energia mecânica total em um oscilador MHS é calculada por E = ½kA². Portanto, ao substituir A por 2A, obtemos E\' = ½k(2A)² = 4·(½kA²) = 4E.',
        confusionDiagnosis:
          'Imaginar que a energia mecânica tem crescimento linear com a amplitude geométrica. A dependência é estritamente quadrática.',
      },
      {
        id: 4,
        topic: 'Pêndulo Simples e Aceleração Gravitacional',
        question:
          'Um pêndulo simples de comprimento L opera com pequenas oscilações na Terra (g = 9,8 m/s²). Se esse mesmo pêndulo for levado à Lua (g ≈ 1,6 m/s²), o que ocorrerá com a frequência de oscilação f?',
        options: [
          {
            id: 'opt-fac-4a',
            letter: 'A',
            text: 'A frequência aumentará, pois a gravidade reduzida oferece menor resistência inercial.',
          },
          {
            id: 'opt-fac-4b',
            letter: 'B',
            text: 'A frequência diminuirá, pois f = (1/2π)√(g/L) e a aceleração da gravidade menor reduz a força restauradora tangencial.',
          },
          {
            id: 'opt-fac-4c',
            letter: 'C',
            text: 'A frequência permanecerá rigorosamente idêntica, pois depende unicamente do comprimento L.',
          },
          {
            id: 'opt-fac-4d',
            letter: 'D',
            text: 'O pêndulo parará de oscilar, necessitando de uma força externa contínua.',
          },
        ],
        correctOptionId: 'opt-fac-4b',
        explanation:
          'A frequência do pêndulo simples é dada por f = (1/2π)·√(g/L). Como a gravidade na Lua é cerca de 6 vezes menor que na Terra, a força restauradora gravitacional tangencial é menor, reduzindo a frequência de oscilação.',
        confusionDiagnosis:
          'Confundir período com frequência (o período T aumenta, logo a frequência f necessariamente diminui).',
      },
      {
        id: 5,
        topic: 'Defasagem no Espaço de Fase',
        question:
          'No espaço de fase analítico do MHS (gráfico de momento linear p vs posição x), a trajetória de um oscilador harmônico simples sem perdas dissipativas é descrita geometricamente por:',
        options: [
          {
            id: 'opt-fac-5a',
            letter: 'A',
            text: 'Uma elipse fechada (ou circunferência em coordenadas normalizadas), refletindo a conservação estrita da energia mecânica.',
          },
          {
            id: 'opt-fac-5b',
            letter: 'B',
            text: 'Uma espiral convergente para a origem (0,0), indicando repouso térmico assintótico.',
          },
          {
            id: 'opt-fac-5c',
            letter: 'C',
            text: 'Uma reta diagonal passando pela origem com inclinação proporcional a ω.',
          },
          {
            id: 'opt-fac-5d',
            letter: 'D',
            text: 'Uma hipérbole aberta que diverge para o infinito nos pontos de equilíbrio.',
          },
        ],
        correctOptionId: 'opt-fac-5a',
        explanation:
          'A equação de conservação E = p²/(2m) + ½kx² = constante tem a forma canônica x²/A² + p²/p_max² = 1, o que descreve uma elipse fechada no plano de fase para um sistema conservativo periódico.',
        confusionDiagnosis:
          'Confundir o gráfico temporal senoidal x(t) com o retrato de fase (p vs x), ou confundir sistema ideal conservativo com sistema amortecido (que formaria uma espiral).',
      },
    ],
    modules: [
      {
        id: 'fac-mod-1',
        code: 'FIS-201',
        title: 'Cinemática Vetorial & Dinâmica Newtoniana',
        status: 'completed',
        score: '9.2',
        date: 'Concluído em 08/Set',
        duration: '14h acumuladas',
      },
      {
        id: 'fac-mod-2',
        code: 'FIS-202',
        title: 'Trabalho, Energia & Sistemas Conservativos',
        status: 'completed',
        score: '8.9',
        date: 'Concluído em 11/Set',
        duration: '10h acumuladas',
      },
      {
        id: 'fac-mod-3',
        code: 'FIS-203',
        title: 'Gravitação Newtoniana & Leis de Kepler',
        status: 'completed',
        score: '9.4',
        date: 'Concluído em 14/Set',
        duration: '8h acumuladas',
      },
      {
        id: 'fac-mod-4',
        code: 'FIS-204',
        title: 'Oscilações: MHS, Dinâmica e Energia',
        status: 'in_progress',
        score: 'Pendente',
        date: 'Hoje · Sessão Recomendada',
        duration: '45 min programados',
      },
      {
        id: 'fac-mod-5',
        code: 'FIS-205',
        title: 'Oscilações Amortecidas, Forçadas e Ressonância',
        status: 'locked',
        score: 'Bloqueado',
        date: 'Próxima etapa da trilha',
        duration: '50 min estimados',
      },
    ],
    tutorGreeting:
      'Olá! Sou seu tutor acadêmico para Física II. Posso esclarecer dúvidas sobre a dedução das equações diferenciais, o comportamento dos vetores no espaço de fase ou os passos dos exercícios.',
    voiceEmphasis: false,
    nextReviewSuggestion: 'Amanhã às 09:00',
    notices: [
      'Professor alterou o prazo da lista de exercícios para sexta-feira.',
      'Nova mensagem da monitoria sobre a Questão 3.',
    ],
    disciplines: [
      { code: 'FIS-204', title: 'Física II', dateRange: '05/Ago – 14/Dez', credits: 4, isActive: true },
      { code: 'MAT-215', title: 'Cálculo Numérico', dateRange: '05/Ago – 12/Dez', credits: 4, isActive: false },
      { code: 'MEC-130', title: 'Resistência dos Materiais', dateRange: '06/Ago – 15/Dez', credits: 3, isActive: false },
      { code: 'CMP-102', title: 'Algoritmos & Estruturas de Dados', dateRange: '07/Ago – 10/Dez', credits: 3, isActive: false },
    ],
  },

  ingles: {
    id: 'ingles',
    name: 'Inglês',
    tagline: 'Inglês Intermediário · Fluência Oral & Compreensão Auditiva',
    domainLabel: 'Idioma Global · Nível CEFR B1',
    accentColor: '#D0EAA3',
    lesson: {
      track: 'ingles',
      trackLabel: 'Inglês B1',
      discipline: 'Inglês B1',
      topic: 'Conversas do Cotidiano · Compreensão Auditiva & Fala',
      sessionObjective: 'Compreender e responder com naturalidade a perguntas em conversas cotidianas, com precisão gramatical e fluidez de turn-taking.',
      estimatedDuration: '30 min',
      actualDurationSeconds: 1800,
      module: 'Módulo 03 · Interação Oral & Fluência',
      nextTopic: 'Inglês B1 · Pedidos Educados, Esclarecimentos e Perguntas Indiretas',
      nextTopicDescription: 'Fórmulas de polidez para pedidos indiretos ("Would you mind...", "Could you tell me..."), pedidos de esclarecimento e entonação natural.',
    },
    summaryPoints: [
      {
        id: 'ing-sum-1',
        timestamp: 90,
        formattedTime: '01:30',
        title: 'Natural Turn-Taking in Conversations',
        text: 'Em conversas cotidianas em inglês, evite silêncios longos usando marcadores naturais de fala (e.g., "Well...", "Actually...", "To be honest...") enquanto formula sua resposta.',
        icon: 'record_voice_over',
      },
      {
        id: 'ing-sum-2',
        timestamp: 360,
        formattedTime: '06:00',
        title: 'Common Phrasal Verbs in Daily Talk',
        text: 'Expressões como "catch up", "run into", "figure out" e "call off" são essenciais para soar natural sem tradução palavra por palavra do português.',
        icon: 'chat',
      },
      {
        id: 'ing-sum-3',
        timestamp: 720,
        formattedTime: '12:00',
        title: 'Connected Speech & Word Reductions',
        text: 'Nativos conectam consoantes finais a vogais iniciais ("pick it up" soa como "pi-ki-tup") e reduzem preposições como "to" (/tə/) e "for" (/fər/).',
        icon: 'graphic_eq',
      },
      {
        id: 'ing-sum-4',
        timestamp: 1100,
        formattedTime: '18:20',
        title: 'Polite Inquiries and Softening',
        text: 'Suavizar declarações com "I was wondering if...", "Could you possibly..." em vez de comandos diretos ("Give me...") melhora a aceitação social e a naturalidade.',
        icon: 'sentiment_satisfied',
      },
    ],
    exerciseQuestions: [
      {
        id: 1,
        topic: 'Listening Comprehension & Context',
        question:
          'Você ouve a seguinte fala em um diálogo casual: "Hey Sarah, I completely lost track of time! Are you still up for catching that film tonight?" O que o falante está comunicando?',
        options: [
          {
            id: 'opt-ing-1a',
            letter: 'A',
            text: 'Ele perdeu o relógio e quer saber se o cinema ainda existe.',
          },
          {
            id: 'opt-ing-1b',
            letter: 'B',
            text: 'Ele se atrasou ou perdeu a noção das horas, mas ainda quer saber se Sarah tem interesse em ir ao cinema juntos.',
          },
          {
            id: 'opt-ing-1c',
            letter: 'C',
            text: 'Ele está cancelando o encontro porque o filme já terminou.',
          },
          {
            id: 'opt-ing-1d',
            letter: 'D',
            text: 'Ele está pedindo para Sarah comprar os ingressos pela internet.',
          },
        ],
        correctOptionId: 'opt-ing-1b',
        explanation:
          '"Lost track of time" é uma expressão idiomática muito comum que significa "perder a noção da hora". "To be up for something" significa estar disposto ou animado para fazer algo.',
        confusionDiagnosis:
          'Traduzir "track of time" literalmente como "trilha de tempo" ou achar que "catch a film" significa segurar algo físico, perdendo o sentido de ver um filme.',
      },
      {
        id: 2,
        topic: 'Situational Polite Response',
        question:
          'Um colega de trabalho lhe faz uma solicitação durante um dia atarefado: "Could you possibly look over this report before the two o\'clock meeting?" Qual é a resposta mais adequada e natural em um contexto profissional B1?',
        options: [
          {
            id: 'opt-ing-2a',
            letter: 'A',
            text: '"I am busy now, do it yourself."',
          },
          {
            id: 'opt-ing-2b',
            letter: 'B',
            text: '"Sure, I\'d be happy to. Just give me twenty minutes to wrap up what I\'m working on."',
          },
          {
            id: 'opt-ing-2c',
            letter: 'C',
            text: '"Yes, I look over report yesterday already."',
          },
          {
            id: 'opt-ing-2d',
            letter: 'D',
            text: '"No, because meetings are useless in my opinion."',
          },
        ],
        correctOptionId: 'opt-ing-2b',
        explanation:
          'A alternativa B usa estrutura polida e comum no ambiente corporativo internacional ("Sure, I\'d be happy to... Just give me... to wrap up..."), mantendo cordialidade e clareza de prazo.',
        confusionDiagnosis:
          'Usar respostas excessivamente rudes ou frases com gramática truncada ("I look over report yesterday").',
      },
      {
        id: 3,
        topic: 'Phrasal Verbs in Real Context',
        question:
          'Complete a lacuna na frase: "We spent two hours discussing the budget issue, but we still haven\'t _______ a feasible solution." Qual phrasal verb preenche a frase corretamente?',
        options: [
          {
            id: 'opt-ing-3a',
            letter: 'A',
            text: 'come up with (elaborar / propor)',
          },
          {
            id: 'opt-ing-3b',
            letter: 'B',
            text: 'run out of (ficar sem mantimentos)',
          },
          {
            id: 'opt-ing-3c',
            letter: 'C',
            text: 'give up on (desistir de)',
          },
          {
            id: 'opt-ing-3d',
            letter: 'D',
            text: 'look down on (menosprezar alguém)',
          },
        ],
        correctOptionId: 'opt-ing-3a',
        explanation:
          '"To come up with a solution/idea" significa propor, criar ou alcançar uma solução mentalmente. É a regência exata para problemas e ideias.',
        confusionDiagnosis:
          'Confundir phrasal verbs de três palavras com partículas parecidas (come up with vs. run out of).',
      },
      {
        id: 4,
        topic: 'Indirect Questions Structure',
        question:
          'Como transformar a pergunta direta "What time does the presentation start?" em uma pergunta indireta formal e polida?',
        options: [
          {
            id: 'opt-ing-4a',
            letter: 'A',
            text: '"Could you tell me what time does the presentation start?"',
          },
          {
            id: 'opt-ing-4b',
            letter: 'B',
            text: '"Could you tell me what time the presentation starts?"',
          },
          {
            id: 'opt-ing-4c',
            letter: 'C',
            text: '"Tell me what time is the start of presentation?"',
          },
          {
            id: 'opt-ing-4d',
            letter: 'D',
            text: '"What time presentation is starting, please tell?"',
          },
        ],
        correctOptionId: 'opt-ing-4b',
        explanation:
          'Em perguntas indiretas ("Could you tell me..."), a oração subordinada perde a inversão interrogativa e o auxiliar "does": o verbo volta para a ordem afirmativa direta ("the presentation starts").',
        confusionDiagnosis:
          'Manter o auxiliar interrogativo "does" dentro da pergunta indireta (erro comum: "Could you tell me what time does...").',
      },
      {
        id: 5,
        topic: 'Spoken Fluency & Clarification',
        question:
          'Durante uma conversa em inglês com ruído ambiente, você não compreendeu o último ponto mencionado. Qual frase expressa pedido de esclarecimento com cortesia e naturalidade?',
        options: [
          {
            id: 'opt-ing-5a',
            letter: 'A',
            text: '"What? Speak louder!"',
          },
          {
            id: 'opt-ing-5b',
            letter: 'B',
            text: '"I didn\'t quite catch that last point, would you mind repeating it?"',
          },
          {
            id: 'opt-ing-5c',
            letter: 'C',
            text: '"Your voice is bad, say again."',
          },
          {
            id: 'opt-ing-5d',
            letter: 'D',
            text: '"I do not understand anything you talked."',
          },
        ],
        correctOptionId: 'opt-ing-5b',
        explanation:
          '"I didn\'t quite catch that" é a forma mais natural e idiomática de expressar que não conseguiu ouvir ou compreender algo, seguida por "would you mind repeating it?" que denota alto grau de cortesia.',
        confusionDiagnosis:
          'Usar "What?" ou transferir a culpa para o interlocutor ("say again"), o que pode soar agressivo em conversas em inglês.',
      },
    ],
    modules: [
      {
        id: 'ing-mod-1',
        code: 'ENG-101',
        title: 'A1 Fundamentals: Pronouns, To Be & Basic Routine',
        status: 'completed',
        score: '9.8',
        date: 'Concluído em 05/Set',
        duration: '12h acumuladas',
        lessons: [
          { id: 'ing-mod-1-l1', title: 'Pronomes pessoais & verbo To Be', status: 'completed', durationMinutes: 25 },
          { id: 'ing-mod-1-l2', title: 'Rotina diária & advérbios de frequência', status: 'completed', durationMinutes: 30 },
          { id: 'ing-mod-1-l3', title: 'Perguntas básicas & Wh-questions', status: 'completed', durationMinutes: 25 },
          { id: 'ing-mod-1-l4', title: 'Revisão A1 & checkpoint de fluência', status: 'completed', durationMinutes: 20 },
        ],
      },
      {
        id: 'ing-mod-2',
        code: 'ENG-102',
        title: 'A2 Routine, Past Simple & Everyday Places',
        status: 'completed',
        score: '9.0',
        date: 'Concluído em 10/Set',
        duration: '10h acumuladas',
        lessons: [
          { id: 'ing-mod-2-l1', title: 'Passado simples: verbos regulares', status: 'completed', durationMinutes: 30 },
          { id: 'ing-mod-2-l2', title: 'Passado simples: verbos irregulares comuns', status: 'completed', durationMinutes: 30 },
          { id: 'ing-mod-2-l3', title: 'Lugares do dia a dia & preposições', status: 'completed', durationMinutes: 25 },
        ],
      },
      {
        id: 'ing-mod-3',
        code: 'ENG-201',
        title: 'B1 Spoken Interaction: Natural Conversations',
        status: 'in_progress',
        score: 'Pendente',
        date: 'Hoje · Sessão Recomendada',
        duration: '30 min programados',
        lessons: [
          { id: 'ing-mod-3-l1', title: 'Small talk & marcadores de conversa', status: 'completed', durationMinutes: 30 },
          { id: 'ing-mod-3-l2', title: 'Everyday Conversations: Listening & Speaking', status: 'current', durationMinutes: 30 },
          { id: 'ing-mod-3-l3', title: 'Phrasal verbs do cotidiano', status: 'locked', durationMinutes: 30 },
          { id: 'ing-mod-3-l4', title: 'Pedidos educados & esclarecimentos', status: 'locked', durationMinutes: 30 },
        ],
      },
      {
        id: 'ing-mod-4',
        code: 'ENG-202',
        title: 'B1 Business Communication & Problem Solving',
        status: 'locked',
        score: 'Bloqueado',
        date: 'Próxima etapa da trilha',
        duration: '35 min estimados',
        lessons: [
          { id: 'ing-mod-4-l1', title: 'E-mails profissionais & tom formal', status: 'locked', durationMinutes: 35 },
          { id: 'ing-mod-4-l2', title: 'Reuniões: propor e negociar', status: 'locked', durationMinutes: 35 },
          { id: 'ing-mod-4-l3', title: 'Resolução de problemas em equipe', status: 'locked', durationMinutes: 35 },
        ],
      },
      {
        id: 'ing-mod-5',
        code: 'ENG-203',
        title: 'B2 Spoken Argumentation, Debate & Idioms',
        status: 'locked',
        score: 'Bloqueado',
        date: 'Etapa avançada',
        duration: '40 min estimados',
        lessons: [
          { id: 'ing-mod-5-l1', title: 'Construindo argumentos com coesão', status: 'locked', durationMinutes: 40 },
          { id: 'ing-mod-5-l2', title: 'Idioms & expressões idiomáticas', status: 'locked', durationMinutes: 40 },
        ],
      },
    ],
    completedLessonsHistory: [
      { id: 'hist-1', title: 'Small talk & marcadores de conversa', moduleTitle: 'B1 Spoken Interaction', completedAt: 'Ontem às 18:40', durationMinutes: 30 },
      { id: 'hist-2', title: 'Lugares do dia a dia & preposições', moduleTitle: 'A2 Routine & Past Simple', completedAt: '10/Set', durationMinutes: 25 },
      { id: 'hist-3', title: 'Passado simples: verbos irregulares comuns', moduleTitle: 'A2 Routine & Past Simple', completedAt: '09/Set', durationMinutes: 30 },
      { id: 'hist-4', title: 'Revisão A1 & checkpoint de fluência', moduleTitle: 'A1 Fundamentals', completedAt: '05/Set', durationMinutes: 20 },
    ],
    tutorGreeting:
      'Olá! Sou seu parceiro de conversação e treinador de idioma. Posso ajudar você a praticar respostas, tirar dúvidas de vocabulário ou exercitar pronúncia e conversação oral.',
    voiceEmphasis: true,
    nextReviewSuggestion: 'Amanhã às 08:30',
    vocabulary: [
      {
        id: 'ing-voc-1',
        term: 'come up with',
        translation: 'propor, elaborar (uma ideia ou solução)',
        example: 'We need to come up with a plan before Friday.',
      },
      {
        id: 'ing-voc-2',
        term: 'run into',
        translation: 'encontrar alguém por acaso',
        example: 'I ran into my old teacher at the supermarket.',
      },
      {
        id: 'ing-voc-3',
        term: 'catch up',
        translation: 'colocar o papo em dia / recuperar o atraso',
        example: 'Let\'s catch up over coffee this weekend.',
      },
      {
        id: 'ing-voc-4',
        term: 'I was wondering if...',
        translation: 'fórmula educada para um pedido indireto',
        example: 'I was wondering if you could help me with this report.',
      },
      {
        id: 'ing-voc-5',
        term: 'I didn\'t quite catch that',
        translation: 'pedido educado de repetição/esclarecimento',
        example: 'Sorry, I didn\'t quite catch that — could you repeat it?',
      },
      {
        id: 'ing-voc-6',
        term: 'to wrap up',
        translation: 'finalizar, encerrar algo',
        example: 'Give me ten minutes to wrap up this email.',
      },
    ],
    voicePrompts: [
      {
        id: 'ing-voice-1',
        instruction: 'Leia a frase em voz alta, com atenção à entonação natural.',
        targetPhrase: 'I was wondering if you could tell me what time the meeting starts.',
        simulatedTranscript: '"I was wondering if you could tell me what time the meeting starts."',
        feedback: 'Boa pronúncia. A entonação ficou natural, como em uma conversa real.',
      },
      {
        id: 'ing-voice-2',
        instruction: 'Agora pratique um pedido de esclarecimento educado.',
        targetPhrase: 'Sorry, I didn\'t quite catch that. Could you say it again?',
        simulatedTranscript: '"Sorry, I didn\'t quite catch that. Could you say it again?"',
        feedback: 'Você foi compreendido. Essa é exatamente a forma natural de pedir para repetir.',
      },
    ],
    immersionScenario: {
      title: 'Pedindo um café em Londres',
      setting: 'Você está em uma cafeteria e o atendente pergunta o que você deseja pedir.',
      turns: [
        {
          id: 'imm-1',
          speakerLine: '"Hi there! What can I get started for you today?"',
          userPromptHint: 'Peça um cappuccino e pergunte se eles têm leite de aveia.',
          simulatedTranscript: '"Hi, could I get a cappuccino, please? Do you have oat milk?"',
          feedback: 'Muito bem. Pedido claro e educado — exatamente como um falante nativo faria.',
        },
        {
          id: 'imm-2',
          speakerLine: '"Sure! For here or to go?"',
          userPromptHint: 'Diga que é para levar (to go).',
          simulatedTranscript: '"To go, please."',
          feedback: 'Perfeito. Resposta curta e natural, sem soar robotizada.',
        },
      ],
    },
  },

  vestibular: {
    id: 'vestibular',
    // "ENEM" por instrução explícita de produto (ENEM/Inglês/Faculdade) — o resto do conteúdo
    // desta trilha (tagline, domainLabel, lesson.*) já usava "ENEM" consistentemente; só este
    // campo `name` (usado em cabeçalhos/rótulos de sessão em toda a UI) ainda dizia
    // "Vestibular". O id interno permanece `vestibular` (StudyTrack) sem mudança de tipo.
    name: 'ENEM',
    tagline: 'ENEM · Ciências da Natureza & Tecnologias',
    domainLabel: 'Matriz de Referência ENEM · Habilidades 01 a 04',
    accentColor: '#18534B',
    lesson: {
      track: 'vestibular',
      trackLabel: 'ENEM · Ciências da Natureza',
      discipline: 'ENEM · Física',
      topic: 'Ondulatória · Fenômenos e Aplicações no Cotidiano',
      sessionObjective: 'Resolver questões contextualizadas da Matriz de Referência do ENEM, aplicar v = λ · f e identificar distratores conceituais comuns em refração e difração.',
      estimatedDuration: '45 min',
      actualDurationSeconds: 2700,
      module: 'Caderno de Ouro ENEM · Habilidades 01 a 04',
      nextTopic: 'ENEM · Acústica, Efeito Doppler e Fenômenos Sonoros',
      nextTopicDescription: 'Ressonância sonora, timbre vs. altura, poluição sonora em centros urbanos e cálculo de frequência percebida em fontes móveis.',
    },
    summaryPoints: [
      {
        id: 'vest-sum-1',
        timestamp: 120,
        formattedTime: '02:00',
        title: 'Classificação de Ondas no ENEM',
        text: 'Ondas mecânicas transportam apenas energia e momentum através de meios materiais (ex: som, ondas no mar). Ondas eletromagnéticas propagam-se no vácuo com velocidade c ≈ 3·10⁸ m/s.',
        icon: 'waves',
      },
      {
        id: 'vest-sum-2',
        timestamp: 480,
        formattedTime: '08:00',
        title: 'A Equação Fundamental: v = λ · f',
        text: 'Regra de ouro das questões do ENEM: a frequência f depende exclusivamente da fonte emissora. Na refração (mudança de meio), f é constante; se v varia, λ varia na mesma proporção.',
        icon: 'calculate',
      },
      {
        id: 'vest-sum-3',
        timestamp: 950,
        formattedTime: '15:50',
        title: 'Fenômenos Ondulatórios Recorrentes',
        text: 'Difração (contorno de fendas da ordem de λ), Interferência (superposição construtiva/destrutiva) e Polarização (exclusiva de ondas transversais, muito cobrada em óculos 3D).',
        icon: 'grain',
      },
      {
        id: 'vest-sum-4',
        timestamp: 1420,
        formattedTime: '23:40',
        title: 'Diagnóstico de Distratores do ENEM',
        text: 'O distrator mais frequente no ENEM supõe que "a frequência do som muda ao entrar na água" ou que "ondas sonoras se propagam no vácuo cósmico". Atenção ao enunciado!',
        icon: 'fact_check',
      },
    ],
    exerciseQuestions: [
      {
        id: 1,
        topic: 'Natureza das Ondas Mecânicas no Vácuo',
        question:
          '(ENEM Adaptado) Em uma cena de ficção científica ambientada no espaço interestelar profundo (vácuo absoluto), uma nave alienígena explode a curta distância de uma estação orbital. Um astronauta dentro de seu traje observa o clarão luminoso da explosão e, em seguida, ouve um estrondo ensurdecedor. Do ponto de vista da física ondulatória, por que essa cena comete um erro conceitual?',
        options: [
          {
            id: 'opt-vest-1a',
            letter: 'A',
            text: 'Porque as ondas sonoras são longitudinais e mecânicas, exigindo colisões entre partículas materiais de um meio para propagar variações de pressão.',
          },
          {
            id: 'opt-vest-1b',
            letter: 'B',
            text: 'Porque no vácuo a velocidade do som é tão alta que o astronauta ouviria o som antes de enxergar o clarão luminoso.',
          },
          {
            id: 'opt-vest-1c',
            letter: 'C',
            text: 'Porque ondas eletromagnéticas e sonoras sofrem difração total nas paredes do traje espacial, impedindo a audição.',
          },
          {
            id: 'opt-vest-1d',
            letter: 'D',
            text: 'Porque a gravidade zero do espaço anula a amplitude de qualquer onda senoidal longitudinal.',
          },
        ],
        correctOptionId: 'opt-vest-1a',
        explanation:
          'Ondas sonoras são perturbações mecânicas de pressão que necessitam de átomos/moléculas para se propagar. No vácuo cósmico, não há meio material para transmitir a onda sonora.',
        confusionDiagnosis:
          'Distrator clássico do ENEM: associar som à luz. A luz da explosão é visível no vácuo (onda eletromagnética), mas o som mecânico é fisicamente impossível sem meio.',
      },
      {
        id: 2,
        topic: 'Refração e Conservação de Frequência',
        question:
          '(ENEM Adaptado) Um sonar emite um pulso sonoro que se propaga inicialmente no ar atmosférico (v ≈ 340 m/s) e em seguida penetra na água do mar, onde a velocidade de propagação salta para aproximadamente 1500 m/s. Em relação à frequência e ao comprimento de onda do pulso sonoro refratado na água, o que ocorre?',
        options: [
          {
            id: 'opt-vest-2a',
            letter: 'A',
            text: 'A frequência aumenta proporcionalmente à velocidade e o comprimento de onda permanece fixo.',
          },
          {
            id: 'opt-vest-2b',
            letter: 'B',
            text: 'A frequência permanece constante (determinada pela fonte emissora) e o comprimento de onda aumenta proporcionalmente.',
          },
          {
            id: 'opt-vest-2c',
            letter: 'C',
            text: 'A frequência e o comprimento de onda diminuem pela maior densidade da massa de água salgada.',
          },
          {
            id: 'opt-vest-2d',
            letter: 'D',
            text: 'O comprimento de onda diminui à metade e a frequência quadruplica para conservar a energia mecânica.',
          },
        ],
        correctOptionId: 'opt-vest-2b',
        explanation:
          'A frequência de uma onda é fixada unicamente pela fonte emissora e nunca varia com o meio. Pela equação fundamental v = λ · f, se a velocidade v cresceu no meio líquido, o comprimento de onda λ obrigatoriamente cresce na mesma proporção.',
        confusionDiagnosis:
          'O distrator mais escolhido pelos candidatos afirma que a frequência muda com a velocidade do meio. Lembre-se: meio dita velocidade e comprimento; fonte fixa a frequência.',
      },
      {
        id: 3,
        topic: 'Efeito Doppler em Veículos de Emergência',
        question:
          '(ENEM Adaptado) Uma ambulância emite som com frequência constante f₀ por sua sirene. Um pedestre parado na calçada observa o veículo se aproximar em alta velocidade e, logo após passar, se afastar. Como o pedestre percebe o som da sirene durante essa passagem?',
        options: [
          {
            id: 'opt-vest-3a',
            letter: 'A',
            text: 'Mais agudo (maior frequência percebida) durante a aproximação, e mais grave (menor frequência percebida) durante o afastamento.',
          },
          {
            id: 'opt-vest-3b',
            letter: 'B',
            text: 'Com velocidade de propagação maior durante a aproximação porque a velocidade da ambulância se soma à do som no ar.',
          },
          {
            id: 'opt-vest-3c',
            letter: 'C',
            text: 'Mais grave durante a aproximação devido à compressão do ar frontal.',
          },
          {
            id: 'opt-vest-3d',
            letter: 'D',
            text: 'Com a mesma frequência exata e inalterada, variando apenas o volume sonoro.',
          },
        ],
        correctOptionId: 'opt-vest-3a',
        explanation:
          'Pelo Efeito Doppler, quando a fonte se aproxima, as frentes de onda são comprimidas espacialmente, aumentando o número de cristas por segundo detectadas pelo ouvinte (tom mais agudo). No afastamento, as frentes se distanciam (tom mais grave).',
        confusionDiagnosis:
          'Achar que a velocidade do som muda no ar (distrator B). A velocidade do som depende apenas do meio atmosférico, não da velocidade do carro emissor.',
      },
      {
        id: 4,
        topic: 'Ondas Estacionárias e Instrumentos de Corda',
        question:
          '(ENEM Adaptado) Em um violão, uma corda de comprimento L fixa nas duas extremidades é dedilhada, emitindo sua nota fundamental. Nessa condição de vibração, a configuração geométrica da onda estacionária formada na corda possui:',
        options: [
          {
            id: 'opt-vest-4a',
            letter: 'A',
            text: 'Apenas ventres em toda a extensão da corda sem nenhum ponto em repouso.',
          },
          {
            id: 'opt-vest-4b',
            letter: 'B',
            text: 'Dois nós nas extremidades fixas (amplitude nula) e um ventre central (ponto de oscilação de amplitude máxima).',
          },
          {
            id: 'opt-vest-4c',
            letter: 'C',
            text: 'Três ventres centrais e nenhum ponto de interferência destrutiva.',
          },
          {
            id: 'opt-vest-4d',
            letter: 'D',
            text: 'Um nó móvel que corre de uma ponta a outra da escala do instrumento.',
          },
        ],
        correctOptionId: 'opt-vest-4b',
        explanation:
          'Nas extremidades fixas, o deslocamento é impedido, constituindo nós de interferência destrutiva. No primeiro harmônico (modo fundamental), a corda vibra com um único ventre central de amplitude máxima.',
        confusionDiagnosis:
          'Inverter nós (pontos parados de amplitude zero) com ventres (pontos de oscilação máxima).',
      },
      {
        id: 5,
        topic: 'Difração e Comprimento de Onda',
        question:
          '(ENEM Adaptado) Por que uma pessoa em uma sala consegue ouvir com clareza a voz de outra pessoa conversando no corredor ao lado através de uma porta aberta, mas não consegue enxergá-la pela mesma abertura?',
        options: [
          {
            id: 'opt-vest-5a',
            letter: 'A',
            text: 'Porque o comprimento de onda do som (ordem de decímetros a metros) é comparável à abertura da porta, sofrendo difração acentuada, enquanto a luz possui comprimento de onda submicrométrico.',
          },
          {
            id: 'opt-vest-5b',
            letter: 'B',
            text: 'Porque o som é uma onda eletromagnética e a luz é uma onda mecânica mais pesada.',
          },
          {
            id: 'opt-vest-5c',
            letter: 'C',
            text: 'Porque a luz sofre refração completa nas bordas da porta e se anula por polarização.',
          },
          {
            id: 'opt-vest-5d',
            letter: 'D',
            text: 'Porque a velocidade do som é maior que a da luz nas condições ambientais de uma sala.',
          },
        ],
        correctOptionId: 'opt-vest-5a',
        explanation:
          'A difração é a capacidade da onda de contornar obstáculos ou aberturas. O fenômeno é perceptível quando a dimensão do obstáculo d é da mesma ordem do comprimento de onda λ (d ~ λ). Para o som, λ está entre centímetros e metros (ordem da porta). Para a luz visível, λ é de centenas de nanômetros, comportando-se como raios em linha reta.',
        confusionDiagnosis:
          'Achar que a difração depende da velocidade da onda e não da relação dimensional entre o comprimento de onda e o obstáculo.',
      },
    ],
    modules: [
      {
        id: 'vest-mod-1',
        code: 'ENEM-01',
        title: 'Mecânica, Leis de Newton e Conservação da Energia',
        status: 'completed',
        score: '9.5',
        date: 'Concluído em 07/Set',
        duration: '15h acumuladas',
      },
      {
        id: 'vest-mod-2',
        code: 'ENEM-02',
        title: 'Termologia, Calorimetria e Termodinâmica',
        status: 'completed',
        score: '9.0',
        date: 'Concluído em 11/Set',
        duration: '12h acumuladas',
      },
      {
        id: 'vest-mod-3',
        code: 'ENEM-03',
        title: 'Ondulatória: Ondas Mecânicas, Eletromagnéticas e Fenômenos',
        status: 'in_progress',
        score: 'Pendente',
        date: 'Hoje · Sessão Recomendada',
        duration: '45 min programados',
      },
      {
        id: 'vest-mod-4',
        code: 'ENEM-04',
        title: 'Acústica, Efeito Doppler e Fenômenos Sonoros',
        status: 'locked',
        score: 'Bloqueado',
        date: 'Próxima etapa da trilha',
        duration: '50 min estimados',
      },
      {
        id: 'vest-mod-5',
        code: 'ENEM-05',
        title: 'Eletricidade, Circuitos e Potência Elétrica no ENEM',
        status: 'locked',
        score: 'Bloqueado',
        date: 'Etapa seguinte',
        duration: '55 min estimados',
      },
    ],
    tutorGreeting:
      'Olá! Sou seu mentor estratégico para o ENEM. Vamos analisar as questões pela Matriz de Referência, identificar os distratores clássicos e reforçar a fundamentação para garantir sua pontuação.',
    voiceEmphasis: false,
    nextReviewSuggestion: 'Amanhã às 07:30',
    cronograma: [
      { id: 'cron-1', date: '22/Set', weekday: 'Hoje', label: 'Ondulatória · Sessão de estudo', type: 'estudo', description: 'Física · v = λ·f e refração' },
      { id: 'cron-2', date: '23/Set', weekday: 'Amanhã', label: 'Simulado ENEM · Ciências da Natureza', type: 'simulado', description: '45 questões · 90 min' },
      { id: 'cron-3', date: '25/Set', weekday: 'Quinta', label: 'Revisão espaçada · Cinemática', type: 'revisao', description: 'Pontos de baixo domínio da Semana 1' },
      { id: 'cron-4', date: '28/Set', weekday: 'Domingo', label: 'Redação · Tema social contemporâneo', type: 'estudo', description: 'Treino cronometrado, 90 min' },
      { id: 'cron-5', date: '05/Out', weekday: 'Domingo', label: 'Simulado geral · 4 áreas', type: 'prova', description: 'Prova completa, condições reais de exame' },
    ],
  },
};

// Aliases de retrocompatibilidade para componentes legados
export const LESSON_FIXTURE = TRACK_DEFINITIONS.faculdade.lesson;
export const INITIAL_SUMMARY_POINTS = TRACK_DEFINITIONS.faculdade.summaryPoints;
export const EXERCISE_QUESTIONS = TRACK_DEFINITIONS.faculdade.exerciseQuestions;
export const EDUCATION_TRACK_FIXTURE = TRACK_DEFINITIONS.faculdade.modules;
