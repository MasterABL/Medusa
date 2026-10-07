# MEDUSA — Inventário Completo de Produto e Funções

> **Natureza deste documento**: auditoria só de leitura. Nenhum código foi alterado,
> refatorado ou corrigido nesta rodada. Nenhum merge foi feito. Os bugs encontrados
> estão **registrados**, não corrigidos.
>
> **Regra de leitura**: cada afirmação abaixo vem de leitura do código-fonte desta árvore
> ou de execução real dos testes (ver §1). Onde algo **não** foi verificado, está escrito.
> Relatórios anteriores (`.ai/*.md`, docs de rodadas antigas) **não** foram usados como
> fonte de verdade — vários estão desatualizados (ver §1.6).
>
> Data da auditoria: 07/10/2026.

---

## Legenda de estados

| Código | Estado | Significado |
|---|---|---|
| **FUNCIONA** | EXISTE E FUNCIONA | Implementado, alcançável pela UI, com dado real do usuário (digitado por ele ou persistido). |
| **PARCIAL** | EXISTE MAS ESTÁ PARCIAL | Alcançável e faz algo de verdade, mas falta parte relevante (persistência, edição, ligação, etc.). |
| **CONTRATO** | SOMENTE COMO CONTRATO/FUNDAÇÃO | Existe como tipo/serviço/teste em `src/foundation` ou `src/domains`, **sem nenhuma tela usando**. |
| **FIXTURE** | SOMENTE COMO FIXTURE/MOCK | A tela existe e reage, mas o conteúdo é dado de exemplo fixo no código. |
| **BLOQUEADO** | PREPARADO MAS BLOQUEADO POR INTEGRAÇÃO | Contrato/adapter pronto; depende de credencial/API externa não conectada. |
| **PLANEJADO** | PLANEJADO MAS NÃO IMPLEMENTADO | Citado em contrato, rota ou doc; não há implementação. |
| **NÃO EXISTE** | NÃO EXISTE | Procurado e não encontrado em lugar nenhum da árvore. |

Classificação de área: **PRIMARY TAB** (item da sidebar com tela própria),
**SECONDARY EXPERIENCE** (experiência dentro de uma aba), **CROSS-CUTTING SYSTEM**
(atravessa as abas), **PLANNED** (só existe como intenção).

---

## 1. Baseline

### 1.1 Repositório e árvore auditada

| Item | Valor |
|---|---|
| Repositório | `MasterABL/medusa` |
| Árvore auditada | `feat/email-agenda-foundation` @ `ebdfd0d` (este documento vive em `docs/product-inventory`, criado a partir dela) |
| `main` | `fa47076` — "promote approved human visual gate 2 education to main (#18)" |
| Distância | a árvore auditada está **42 commits à frente de `main`**, `main` 0 à frente |
| Working tree antes da auditoria | limpo (`git status --short` vazio) |
| Working tree depois dos testes | limpo (os testes não escrevem no repositório) |

**Importante — o que está em `main` e o que não está.** A maior parte do que este
inventário descreve **ainda não está em `main`**. A árvore auditada empilha:

| Camada | Commits | Onde está | PR |
|---|---|---|---|
| `main` (Shell, Educação "Human Visual Gate 2", Agenda base) | — | `main` | #18 (mergeada) |
| Agenda Temporal OS + cronograma persistente + drag-and-drop | 6 | `feat/agenda-temporal-os` e sucessoras | #26 (aberta) |
| UI dos domínios (Hoje "matriz viva", Finanças B, Corpo C/A, Guardian B, Espiritual C) | 7 | `feat/design-refinement-living-experience` (branch do Anti) | sem PR própria listada |
| Personal OS Core (tarefas, projetos, prioridade, lembretes v2, ações, planner, agregador, acadêmico, persistência, evento canônico, relações) | 19 | `feat/personal-os-core` | #32 (draft) |
| Gmail/Agenda — fundação do domínio de comunicação | 10 | `feat/email-agenda-foundation` | #33 (draft) |

PRs abertas relevantes que **não** estão nesta árvore: #27 → #28 → #29 → #30 → #31 (cadeia
"foundation-architecture / domain-buildout / domain-ui / personality / domain-contracts").
A **aba Gmail com UI** existe apenas na branch da #29 (`claude/domain-ui-implementation`);
**não existe nesta árvore**. Há ainda 7 PRs do Dependabot (#19–#25) e PRs de documentação
do protocolo de agentes (#3, #10, #14, #17).

### 1.2 Stack

- Next.js 14 (App Router) com **uma única página** (`src/app/page.tsx`) que troca o
  conteúdo por `activeRoute`; não há rotas Next por aba. Uma rota extra de dev:
  `/dev/motion-lab`.
- React 18, TypeScript strict, Tailwind 3.
- Dependências de runtime: **apenas** `next`, `react`, `react-dom`. Nenhum cliente de
  banco, nenhum SDK de IA, nenhum SDK de calendário/e-mail.
- **Não existe backend**: não há `fetch` para API própria, não há rotas `app/api`, não há
  Supabase, não há serviço remoto. Todo estado vive no navegador (memória ou
  `localStorage`).
- Único script externo carregado: **Spotify IFrame API** (widget de música).

### 1.3 Testes executados nesta auditoria

| Suíte | Comando | Resultado |
|---|---|---|
| Contratos da fundação | `npm run test:foundation` | **64/64** checagens OK |
| Domínios (Finanças, Corpo, Espiritual, Guardian, Agenda, integrações, serialização, adapters legados) | `npm run test:domains` | **676/676** OK |
| Reminder Engine v1 | `npm run test:reminders` | **17/17** testes OK |
| Personal OS | `npm run test:personal-os` | **230/230** OK |
| E-mail | `npm run test:email` | **148/148** OK |
| **Total** | `npm run test:all` | **1.135 checagens, 0 falhas** |
| Typecheck | `npx tsc --noEmit` | sem erros |

**Não executado nesta rodada**: `npm run build` (gera `.next/`, e a regra da rodada era
não alterar o workspace) e os 25 scripts de QA visual com Puppeteer em `scripts/qa-*.js`
(precisam de servidor de dev rodando). O build foi validado em rodadas anteriores, mas
**não foi reconfirmado hoje**.

### 1.4 Tamanho da base

| Área | Arquivos `.ts/.tsx` |
|---|---|
| `src/components` (UI) | 85 |
| `src/foundation` | 92 |
| `src/domains` | 188 |
| `src/context`, `src/lib`, `src/types`, `src/fixtures`, `src/app` | 14 |

A maior fixture é `src/components/education/educationFixtures.ts` com **1.486 linhas** —
todo o conteúdo pedagógico do app vem dela.

### 1.5 Achado estrutural nº 1 — a UI quase não usa a fundação

Busca por imports de `@/foundation` e `@/domains` dentro de `src/components`,
`src/context`, `src/app` e `src/lib`:

| Arquivo de UI | O que importa da fundação |
|---|---|
| `src/components/financas/financeBridge.ts` | `domains/finance` (repositório em memória + `selectFinanceSnapshot`) e `foundation/dataState` |
| `src/context/AgendaContext.tsx` | `foundation/reminders` (orquestrador **v1**, `globalReminderOrchestrator`) |

**Só esses dois.** Tudo o que foi construído em `src/foundation` e `src/domains` —
Guardian (política, trust, aprovação, runtime de auditoria), Reminder Engine **v2**,
Priority Engine, Recommendation Engine, Planner, Context Aggregator do Hoje, Tarefas,
Projetos, Acadêmico, Corpo, Espiritual, E-mail, Calendário, persistência, evento canônico,
relações, busca — **não está ligado a nenhuma tela**. É código testado (1.135 checagens),
mas invisível para o usuário.

Consequência prática: a aba Hoje **não** usa o Context Aggregator; a aba Guardian **não**
usa o Guardian; a aba Corpo **não** usa o domínio Corpo; a aba Espiritual **não** usa o
domínio Espiritual. Cada uma tem sua própria fixture.

### 1.6 Documentação desatualizada encontrada

- `.ai/*.md` ainda afirmam que Corpo, Finanças e Guardian "não estão implementados" — falso
  nesta árvore (há telas, ainda que de fixture).
- `src/app/layout.tsx` declara no `<meta description>` "3 Modos e **3 Temas**" — só existem
  2 temas (o Sépia foi removido; `Theme = 'light' | 'dark'` em `src/types/shell.ts`). O
  título da aba do navegador é "Medusa Shell · Arquitetura Definitiva V2".
- `docs/` tem só 3 documentos (`MEDUSA_FOUNDATION_CONTRACTS.md`,
  `MEDUSA_PERSONAL_OS_CORE.md`, `MEDUSA_GMAIL_AGENDA_ARCHITECTURE.md`) + `DESIGN.md` na raiz.

---

## 2. Mapa do Produto

### 2.1 Navegação real

A sidebar (`src/components/shell/Sidebar.tsx`) tem **8 itens + 1 atalho**:

| # | Rota | Rótulo | Classificação | Renderiza | Badge na sidebar |
|---|---|---|---|---|---|
| 1 | `hoje` | Hoje | PRIMARY TAB | `HojeContainer` | ponto (fixo) |
| 2 | `agenda` | Agenda | PRIMARY TAB | `AgendaContainer` | **"3" fixo** |
| 3 | `educacao` | Educação | PRIMARY TAB | `EducationContainer` | **"14" fixo** |
| 4 | `corpo` | Corpo | PRIMARY TAB | `BodyContainer` | — |
| 5 | `financas` | Finanças | PRIMARY TAB | `FinanceContainer` | ponto de destaque (fixo) |
| 6 | `guardian` | Guardian | PRIMARY TAB | `GuardianContainer` | — |
| 7 | `espiritual` | Espiritual | PRIMARY TAB | `SpiritualContainer` | — |
| 8 | `progresso` | Progresso | PLANNED | `RoutePending` ("ainda está por vir") | — |
| — | — | Comandos / Busca ⌘K | CROSS-CUTTING | abre `CommandModal` | — |

Os badges "3" e "14" **não são calculados**: são strings literais no array `navItems`.
Não refletem quantos compromissos ou aulas existem.

**Rota desconhecida**: qualquer valor de rota fora da lista cai numa página de vitrine
"Shell V2 Foundation" com texto e métricas fixos ("14 rpm", "02h45m", "0.02%") e link para
`/dev/motion-lab`. Só é alcançável por hash manual (ex.: `#xyz`).

### 2.2 Mapa por classificação

| Área | Classificação | Estado dominante |
|---|---|---|
| Hoje | PRIMARY TAB | PARCIAL (lê a Agenda real; o resto é fixo ou só de sessão) |
| Agenda | PRIMARY TAB | **FUNCIONA** (CRUD completo com `localStorage`) |
| Educação — Faculdade | SECONDARY EXPERIENCE | FIXTURE (interação rica, conteúdo fixo) |
| Educação — Inglês | SECONDARY EXPERIENCE | FIXTURE |
| Educação — ENEM + Cronograma | SECONDARY EXPERIENCE | PARCIAL (plano real e persistido; conteúdo fixo) |
| Modo Estudo (aula/resumo/tutor/voz/exercícios/flashcards) | SECONDARY EXPERIENCE | FIXTURE / simulado |
| Corpo | PRIMARY TAB | FIXTURE |
| Finanças | PRIMARY TAB | FIXTURE (passa pelo domínio real, com dados fixos) |
| Guardian | PRIMARY TAB | FIXTURE |
| Espiritual | PRIMARY TAB | FIXTURE |
| Progresso | PLANNED | NÃO IMPLEMENTADO (honesto) |
| Buscar | CROSS-CUTTING | **NÃO EXISTE** (campo sem função) |
| Gmail / caixa de entrada | PLANNED (nesta árvore) | CONTRATO + BLOQUEADO |
| Personal OS Core | CROSS-CUTTING | CONTRATO |
| Dynamic Island | CROSS-CUTTING | FUNCIONA (com conteúdo de fixture em vários estados) |
| Context Panel | CROSS-CUTTING | FUNCIONA (conteúdo por aba, em geral fixture) |
| Shell (sidebar, header, modos, tema) | CROSS-CUTTING | FUNCIONA |
| Notificações | CROSS-CUTTING | PARCIAL (só Island; Web Notification sem pedido de permissão) |
| Áudio de feedback | CROSS-CUTTING | FUNCIONA |
| Música (Spotify) | CROSS-CUTTING | FUNCIONA (sem lembrar o link) |
| Motion | CROSS-CUTTING | FUNCIONA (com `prefers-reduced-motion`) |

---

## 3. Hoje

**Classificação**: PRIMARY TAB. **Arquivos**: `src/components/hoje/HojeContainer.tsx`,
`TodayContextPanel.tsx`, `src/lib/hojeFoundation.ts`, `src/fixtures/hojeFixtures.ts`.

### 3.1 Blocos da tela

| Bloco | O que mostra | Fonte | Estado |
|---|---|---|---|
| Cabeçalho "Central de Contexto" | relógio (atualiza a cada 30 s), data em pt-BR, "N blocos hoje" | relógio local + Agenda | FUNCIONA |
| **Agora** | item em andamento, % de progresso, minutos restantes | itens de **hoje** da Agenda (`AgendaContext`) | FUNCIONA (leitura) |
| Agora → "Estender +15 min" | estica o bloco na tela | estado local | PARCIAL — não grava na Agenda, some ao recarregar |
| Agora → "Concluir" | marca concluído + Island "Bloco concluído" + som | `Set` local | PARCIAL — não persiste, não altera a Agenda |
| **Próximo** | próximo item (título, horário) | Agenda | FUNCIONA |
| **Atenção** | se um evento de hoje tem no título *telemedicina/consulta/médico/medico/exame*: card com contagem regressiva, "Confirmar check-in", link "Entrar na Sala" (se o local começa com `http`) | Agenda + regra de palavra-chave | PARCIAL — check-in é só local; detecção por palavra no título |
| Atenção (sem evento) | "Sem alertas críticos … Guardian Ativo" | **texto fixo** | FIXTURE — não consulta Guardian nenhum |
| **Ritmo do Dia** | faixa 07h–21h com blocos coloridos por categoria; clique abre inspetor (categoria, horário, duração, título) | Agenda | FUNCIONA (leitura) |
| **Recomendação Medusa** | "Janela de transição pós-trabalho… 15 min de descompressão"; botões Dispensar / Ver Treino | **texto fixo** | FIXTURE — não usa o Recommendation Engine; "Ver Treino" navega para Corpo |

**Fallback que esconde vazio**: se a Agenda **não tem nenhum item hoje**, o Hoje mostra
**6 blocos de exemplo** (`hojeFixtureItems`) como se fossem o dia do usuário. Não há
estado "dia livre" honesto.

### 3.2 Context Panel do Hoje

| Seção | Conteúdo | Estado |
|---|---|---|
| Guardian & Bio-Estado | "99.8% Estável · Sync ativo há 2m · Nuvem Pessoal" | **FIXTURE e enganoso** — não existe sync nem nuvem |
| Próxima Transição | 1º item de hoje da Agenda; senão "Revisão Estratégica do Sistema — Em 2h 15m" (fixo) | PARCIAL |
| Marcos da Sessão | até 4 itens de hoje, ou fixos | PARCIAL |
| Avisos | avisos das disciplinas da Faculdade **da fixture** de Educação | FIXTURE |

### 3.3 Relatório de profundidade — Hoje

- **Consegue**: mostrar o que está acontecendo agora e o que vem depois a partir da Agenda
  real; destacar consulta/telemedicina; navegar para Corpo.
- **Não consegue**: gravar conclusão/extensão; mostrar dia vazio honestamente; recomendar
  com base em contexto; mostrar tarefas, prazos de faculdade, finanças ou estado do
  Guardian reais.
- **Conectado a**: Agenda (leitura), Dynamic Island, áudio, navegação.
- **Depende de**: `AgendaContext` (`localStorage`).
- **Persiste**: nada próprio.
- CRUD: não. Histórico: não. Integração externa: não. Automação: não.
  Recomendações: texto fixo. Notificações: Island no concluir/check-in. Motion: pulse,
  ping, fade de entrada.
- **Fundação pronta e não ligada**: `foundation/context/aggregator.ts` + `today.ts`
  (Agora/Próximo/Atenção/Ritmo/Recomendação com estado por fonte), Recommendation Engine,
  Priority Engine.

---

## 4. Agenda

**Classificação**: PRIMARY TAB. **Arquivos**: `src/context/AgendaContext.tsx`,
`src/components/agenda/*` (19 arquivos), `src/types/agenda.ts`.
**É a aba mais completa e a única com CRUD real persistido.**

### 4.1 Persistência

| Dado | Onde | Observação |
|---|---|---|
| Itens da agenda | `localStorage['medusa-agenda-items']` | 1ª carga semeia **17 itens de exemplo** relativos à data atual (`getInitialAgendaItems`) |
| Modo de visão | `localStorage['medusa-agenda-view-mode']` | |
| Categorias (7 iniciais: Faculdade, Inglês, ENEM, Treino, Trabalho, Pessoal, Finanças) | **memória** | criar/editar/excluir categoria **some ao recarregar** |

O cabeçalho se rotula honestamente: "Agenda · Estado Local Ativo — sem backend remoto".

### 4.2 Visões e navegação

- Dia, Semana, Mês, Lista — atalhos `1`–`4`; `←`/`→` mudam o período; `T` volta para hoje.
- Indicador de "agora" (`NowIndicator`) nas grades.
- Filtro por domínio: Todos / Educação / Corpo / Trabalho / Pessoal / Finanças.
- **Sem busca por texto.**

### 4.3 Campos de um item

título · tipo (**Evento / Bloco / Deadline / Rotina**) · domínio · categoria · cor (paleta)
· data · dia inteiro · início/fim (`MedusaTimePicker`) · flexível (só Bloco) ·
**recorrência só para Rotina** (diária / semanal com dias / mensal, intervalo, fim:
nunca / data / contagem) · local · descrição. Deadline é sempre dia inteiro.

### 4.4 Operações

| Operação | Como | Estado |
|---|---|---|
| Criar | botão Adicionar; clique em horário vazio abre o drawer já com a hora | FUNCIONA |
| Ler | 4 visões + painel de detalhe | FUNCIONA |
| Editar | duplo clique / "Editar" | FUNCIONA |
| Excluir | com confirmação | FUNCIONA |
| Desfazer exclusão | toast de 6–7 s | FUNCIONA |
| Duplicar | painel de detalhe | FUNCIONA |
| Excluir em lote | Lista: checkboxes, selecionar todos, excluir selecionados | FUNCIONA |
| Série recorrente | editar/excluir "este / este e seguintes / série inteira" | FUNCIONA |
| Reagendar arrastando | Dia e Semana, Pointer Events, encaixe de 15 min, "fantasma" | FUNCIONA |
| Reagendar ±30 min | painel de detalhe | FUNCIONA |
| Sugestão de horário compatível | `findCompatibleTimeSlots`, aplicável com um clique | FUNCIONA |
| Redimensionar arrastando a borda | — | **NÃO EXISTE** |
| Conflitos | `detectTimeConflicts` + layout em colunas + marcação visual (Dia/Semana/Lista) | FUNCIONA |
| Tempo livre | `calculateFreeTimeSlots` na grade e no Context Panel | FUNCIONA |
| Concluir item | — | **NÃO EXISTE** na Agenda (só "Pago" para finanças, ver abaixo) |

### 4.5 Ações por domínio no painel de detalhe

| Domínio | Ação | O que faz de verdade |
|---|---|---|
| Educação | Começar | Island + navega para Educação |
| Educação | Revisar / Abrir Aula | Island (simulado) |
| Finanças / Deadline | Analisar prazo, Ver impacto | Island com texto simulado |
| Finanças / Deadline | Registrar pagamento | marca "Pago" no estado local |

A origem do item (`sourceType`) aparece no detalhe.

### 4.6 Lembretes

`AgendaContext` roda o **orquestrador de lembretes v1** (`foundation/reminders`) a cada
30 s: prioridade alta/média → T-15 e T-5; baixa → T-5. Entrega:

- **Dynamic Island** por 9 s, com ação "Abrir compromisso" — FUNCIONA.
- **Web Notification** via adapter **somente se a permissão já estiver concedida**.
  `Notification.requestPermission()` existe no adapter
  (`foundation/reminders/adapters.ts:135`) mas **nenhuma tela chama** — então, na prática,
  a notificação do sistema nunca aparece para quem não concedeu por fora. PARCIAL.
- Notificação nativa (celular): BLOQUEADO.

O Reminder Engine **v2** (estados por lembrete, T-30 para críticos, dedup entre fontes,
follow-up, Guardian) existe na fundação e **não** é o que a Agenda usa.

### 4.7 Ponte com o Cronograma ENEM

`reconcileEducationBlocks` troca os blocos `education_session` por blocos flexíveis
"Estudo: <disciplina> (ENEM)". Ver bug do gerador em §5.4.

### 4.8 Relatório de profundidade — Agenda

- **Consegue**: tudo do §4.4, com persistência local; recorrência com 3 escopos;
  conflitos; tempo livre; lembretes na Island.
- **Não consegue**: sincronizar com Google/Outlook; buscar por texto; persistir
  categorias; concluir item; redimensionar arrastando; avisar fora do app.
- **Conectado a**: Hoje (leitura), Educação/Cronograma (escrita de blocos), Island,
  áudio, lembretes v1.
- **Persiste**: itens e modo de visão (`localStorage`).
- CRUD: sim. Histórico: não (só o desfazer de alguns segundos). Integração: não.
  Automação: lembretes. Recomendações: horários compatíveis. Notificações: Island.
  Motion: drag "fantasma", entrada de visão.

---

## 5. Educação

**Classificação**: PRIMARY TAB com 3 SECONDARY EXPERIENCES (Faculdade, Inglês, ENEM) + o
Modo Estudo. **Arquivos**: `src/components/education/*` (38 arquivos),
`src/context/EducationPanelContext.tsx`.

### 5.1 Persistência

| Dado | Onde |
|---|---|
| Trilha selecionada | `localStorage['medusa_education_track']` |
| Visão do ENEM (`visao-geral` / `cronograma`) | `localStorage['medusa_enem_view']` |
| Plano do cronograma | `localStorage['medusa_cronograma_plan']` |
| "Já viu o cronograma" | `localStorage['medusa_cronograma_seen']` |
| Respostas do onboarding (passo, respostas, múltiplas, personalizadas, bloco) | `localStorage['medusa_cronograma_diag_*']` |
| Disciplina extra adicionada na Faculdade | memória |
| Intervalo de estudo | memória |
| Material enviado (PDF, slides, planilha, imagem) | URL de objeto local — **a própria tela avisa** que recarregar remove |
| Notas da aula, progresso de exercício, flashcards, resultado da sessão | memória |

### 5.2 Conteúdo

**Todo o conteúdo pedagógico é fixture** (`educationFixtures.ts`):

- **Faculdade**: disciplinas FIS-204, MAT-215, MEC-130, CMP-102 com módulos, avisos,
  materiais e prazos; aula de Física II — MHS — com 5 questões.
- **Inglês B1**: módulos ENG-101/102/201/202 com lições; domínio Speaking 62, Listening
  74, Reading 81, Writing 55; 6 itens de vocabulário; 6 prompts de voz; imersão "Pedindo
  um café em Londres".
- **ENEM**: Física — Ondulatória — com 5 questões; módulos ENEM-01 a 05.

### 5.3 Funções

| Função | Estado | Detalhe |
|---|---|---|
| Painel inicial com seletor de trilha e transição animada | FUNCIONA | |
| Hero "Próxima ação" que acompanha a disciplina selecionada | FUNCIONA | sobre conteúdo fixo |
| Carregamento | FIXTURE | `setTimeout` simulado |
| Estado de erro + tentar de novo | PARCIAL | só alcançável com `?qa=1` (painel de QA escondido) |
| Faculdade: adicionar disciplina | PARCIAL | memória |
| Faculdade: enviar material | PARCIAL | object URL local, aviso honesto |
| Faculdade: avisos, prazos com urgência (<48 h), materiais | FIXTURE | |
| **Modo Estudo**: "player de vídeo" | FIXTURE | timer simulado, barra de progresso, play/pause, 1×/1,25×/1,5× — não há vídeo |
| Modos de aula: aula / aula + resumo / resumo | FUNCIONA (sobre fixture) | |
| Abas: resumo, notas (com marcação de tempo + marcador rápido), vocabulário | PARCIAL | notas em memória |
| Interromper e retomar sessão (tempo + modo) | PARCIAL | memória |
| Modo Estudo põe o Shell em modo foco | FUNCIONA | |
| **Blocos interativos** | FUNCIONA | Hooke (sliders x e k, SVG animado), comparação de rigidez, onda (sliders de frequência e comprimento), espectro eletromagnético (ENEM), bloco de inglês, linha do tempo gramatical (passado/futuro) |
| **Tutor** | FIXTURE | resposta pronta após 900 ms; "modo voz" simulado com timeouts |
| **Exercício de voz** (Inglês) | FIXTURE | transcrição simulada por `setTimeout`, **sem microfone** |
| **Imersão ao vivo** (Inglês) | FIXTURE | idem |
| Exercícios de múltipla escolha | FUNCIONA (sobre fixture) | correto/errado, explicação, tentar de novo, abrir Tutor no erro, som |
| Flashcards | PARCIAL | virar carta, contadores "revisar"/"já sei" em memória, **sem repetição espaçada** |
| Conclusão da sessão | PARCIAL | % de acerto e tópicos a reforçar calculados; "Amanhã · 09:00" **fixo** |
| Revisão de aula concluída (modal, lista de concluídas, "Recém-concluída") | FIXTURE / PARCIAL | lista vem da fixture; recém-concluída em memória |
| Fluxo Inglês | — | aula → voz → imersão → exercícios → flashcards → conclusão |
| Fluxo ENEM/Faculdade | — | aula → exercícios → conclusão |

### 5.4 Cronograma ENEM (a parte "real" da Educação)

- **Onboarding em tela cheia** (`CronogramaOnboarding.tsx`, 949 linhas): intro →
  diagnóstico → domínio por disciplina → "revelando" → resultado. **26 perguntas temporais**
  (`dt_01`…`dt_26`: rotina, compromissos, pico de foco, tamanho de bloco, pausas,
  prioridade, critério de compensação…) + **3 perguntas de diagnóstico** (`q1`–`q3`).
  Respostas persistidas — dá para sair e voltar.
- **Motor de plano** (`cronogramaPlanner.ts`, lógica pura): semanas restantes até a prova →
  intensidade (longo prazo >16 semanas, moderado >8, intensivo >3, crítico ≤3); horas
  líquidas = brutas − 35% das comprometidas (piso de 4 h/semana); peso por autopercepção
  (baixo 3, médio 2, alto 1) × moduladores de área vindos de `dt_23`, `dt_17`, `dt_19`;
  alocação em múltiplos de 0,5 h para as 7 disciplinas (Matemática, Física, Química,
  Biologia, Humanas, Linguagens, Redação); bloco ideal, horário de pico, buffer, área
  prioritária, meta de concorrência e estratégia de compensação tirados das respostas.
  Ajuste do domínio pelo diagnóstico (acertou tudo sobe "baixo" para "médio"; errou tudo
  desce "alto" para "médio"). Plano genérico (90 dias, 5 dias × 2 h) para quem pula.
- **Visão do cronograma** (`EnemCronogramaView.tsx`): período, filtro por disciplina,
  intervalo de estudo, refazer cronograma (com confirmação), ir para a Agenda, "Começar"
  se o bloco é de hoje.
- **Envio para a Agenda**: `gerarBlocosAgendaSemana` → `reconcileEducationBlocks`.

> **BUG REGISTRADO (não corrigido) — blocos caem numa semana fixa.**
> `gerarBlocosAgendaSemana(plan, diasDisponiveis, hoje = new Date(2026, 8, 28))` tem como
> padrão a data **28/09/2026**, e os **dois** chamadores (`EnemHub.tsx:166` e
> `CronogramaOverlay.tsx:54`) **não passam** `hoje`. Resultado: os blocos de estudo são
> sempre gerados na semana de 28/09 a 04/10/2026 — que, na data desta auditoria
> (07/10/2026), **já passou**. O usuário gera o cronograma e não vê os blocos na semana
> atual.
>
> Dois problemas menores na mesma função: (a) **todos os blocos começam no mesmo
> `horarioPico`**, um por disciplina distribuídos em rodízio pelos dias disponíveis — com
> menos de 7 dias disponíveis, duas disciplinas caem no mesmo dia e horário (sobreposição);
> (b) a data sai de `toISOString()` (UTC), o que pode deslocar um dia em horários perto da
> meia-noite.

### 5.5 Relatório de profundidade — Educação

- **Consegue**: conduzir uma sessão de estudo inteira e muito interativa sobre conteúdo
  fixo; montar um cronograma ENEM de verdade a partir de 29 perguntas e lembrar dele.
- **Não consegue**: ter conteúdo do usuário (aulas, disciplinas reais, avisos reais da
  faculdade); tutor ou voz reais; repetição espaçada; histórico de sessões; colocar os
  blocos do cronograma na semana certa (bug).
- **Conectado a**: Agenda (escreve blocos), Shell (modo foco), Island, áudio, Hoje (os
  avisos da fixture aparecem no painel do Hoje).
- **Depende de**: `EducationPanelContext`, `AgendaContext`.
- CRUD: só "adicionar disciplina" (memória) e cronograma (criar/refazer). Histórico: não.
  Integração: não. Automação: não. Recomendações: hero "próxima ação" (fixo). Notificações:
  Island. Motion: a área com mais motion do app (troca de trilha, entrada de estágio,
  slide de exercício, recuo).
- **Fundação pronta e não ligada**: `domains/academic` (contratos de Faculdade, Curso,
  ENEM, Inglês e pontes para tarefa, evento crítico, prazo e prática curta).

---

## 6. Corpo

**Classificação**: PRIMARY TAB. **Arquivos**: `src/components/corpo/BodyContainer.tsx`,
`BodyContextPanel.tsx`, `bodyFixtures.ts`.

### 6.1 Funções

| Função | Estado | Detalhe |
|---|---|---|
| "Como estou hoje": prontidão 89, VFC 68 ms, FC de repouso 56, sono 7h42 (eficiência 92%, profundo 1,8 h, REM 1,9 h), passos 8.420/10.000 | **FIXTURE** | números fixos, **sem nenhum rótulo de "exemplo"** |
| "Como estou evoluindo": 4 movimentos fundamentais (agachamento, terra romeno, supino, barra lastrada) com 7 semanas de carga; tonelagem semanal de 7 semanas | FIXTURE | seletor de movimento com gráfico funciona |
| "Qual é meu próximo estímulo": Sessão B · Tração & Posterior | FIXTURE | |
| **Bancada de treino** | PARCIAL | ±2 kg na carga, "concluir série" (avança série/exercício), descanso de 90 s com ±15 s e pausa, roteiro dos exercícios, "finalizar treino" → Island + som de celebração |
| Persistência do treino | **NÃO EXISTE** | tudo em memória; recarregar zera |
| Histórico de treinos | FIXTURE | `history` dos exercícios na fixture |

### 6.2 Relatório de profundidade — Corpo

- **Consegue**: conduzir uma sessão de treino com cronômetro de descanso e ajuste de carga.
- **Não consegue**: salvar uma série, um treino ou uma medida; ler dados de relógio/app de
  saúde; montar plano; mostrar evolução real.
- **Conectado a**: Island, áudio; "Ver Treino" do Hoje aponta para cá.
- **Persiste**: nada.
- **Fundação pronta e não ligada**: `domains/body` (36 arquivos): diagnóstico, perfil,
  planejamento, sessão, progressão de carga, métricas (sono, passos, calorias, peso),
  insights, heurística de carga da rotina, adapter do Minha Vida (`treino_exercicios`,
  `treino_cargas`, `corpo_registros`), pontes com Agenda e Hoje.

---

## 7. Finanças

**Classificação**: PRIMARY TAB. **Arquivos**: `src/components/financas/FinanceContainer.tsx`,
`FinanceContextPanel.tsx`, `financeBridge.ts`, `financeFixtures.ts`.

### 7.1 Como os números chegam na tela

Finanças é a **única aba que passa pelo domínio real**: `financeBridge.ts` cria um
repositório **em memória** do domínio `finance`, semeia contas, compromissos e transações
**fixos**, e chama `selectFinanceSnapshot(repo, '2026-10-05', { origin: 'fixture' })`.
Os totais Tenho / Comprometido / Livre / Sustento vêm do motor canônico
(`domains/finance/services/snapshotEngine.ts`).

Mas:

- a data de referência é **fixa em 05/10/2026** (`asOf` padrão do bridge, e o container
  não passa outra);
- `isFixtureData: true` é devolvido pelo bridge e **não é exibido em lugar nenhum** — a
  tela apresenta os números como se fossem do usuário;
- as **entradas** (salário R$ 14.200, consultoria R$ 5.650, dividendos R$ 1.820) estão
  escritas direto no bridge, não vêm do domínio.

### 7.2 Funções

| Função | Estado | Detalhe |
|---|---|---|
| Equilíbrio central Tenho / Comprometido / Livre com barra | FIXTURE via domínio real | |
| Gavetas "origens", "compromissos", "sustento" | FIXTURE | |
| **Simulador "E se eu tomar uma decisão?"** | PARCIAL | o gasto simulado recalcula comprometido/livre/margem por dia/runway — **mas o runway é recalculado na própria UI** (`tenho / (comprometido/30)`), divergindo do `sustento.runwayDays` do domínio. Contradiz o princípio "zero matemática paralela na UI" escrito no cabeçalho do bridge |
| "O que vem depois" (3 contas: SaaS Cloud Sync, Energia & Fibra, Aluguel & Condomínio) | FIXTURE | escritas direto no JSX |
| **"Existe algo estranho" — anomalia** | FIXTURE + **mensagem falsa** | cobrança duplicada fixa de R$ 89,90. O botão marca como resolvida e a Island diz **"Estorno de R$ 89,90 solicitado ao emissor do cartão com sucesso."** Nenhum estorno é solicitado a ninguém. O card se rotula "Ação L2 sugerida", mas a ação **não passa pelo Guardian** |
| Context Panel | FIXTURE | mistura o bridge (runway, Tenho, Livre) com `FINANCAS_DATA`, outra fixture mais antiga (contas a vencer) — **duas fontes diferentes no mesmo painel** |
| Registrar transação, categorizar, orçamento, metas, faturas | CONTRATO | existem no domínio, sem tela |
| Open Finance (Pluggy) | BLOQUEADO / NÃO EXISTE | só `syncState.ts` (estado do sync como DataState) e o adapter legado |

### 7.3 Relatório de profundidade — Finanças

- **Consegue**: demonstrar o modelo Tenho/Comprometido/Livre/Sustento com o motor real;
  simular o efeito de um gasto.
- **Não consegue**: aceitar qualquer dado do usuário (nem uma transação manual);
  conectar banco; contestar cobrança (apesar da mensagem dizer que sim).
- **Persiste**: nada.
- **Fundação pronta e não ligada**: 14 serviços (orçamento, fluxo de caixa, categorias,
  **detecção de duplicidade**, metas, insights, **fatura de cartão**, obrigações, projeção,
  recorrência, compromissos recorrentes, runway, snapshot, sync), 10 casos de uso
  (ajustar/criar orçamento, categorizar, lembrete financeiro, projeção, transação,
  vincular recorrência, **propor pagamento**, contribuir para meta), adapter do Minha Vida
  (`financas_contas_bancarias`, `financas_transacoes_of`, …).

---

## 8. Espiritual

**Classificação**: PRIMARY TAB. **Arquivos**: `src/components/espiritual/SpiritualContainer.tsx`,
`SpiritualContextPanel.tsx`, `spiritualFixtures.ts`.

### 8.1 Funções

| Função | Estado | Detalhe |
|---|---|---|
| Passagens | FIXTURE | **2**: Romanos 8:31-39 e Filipenses 4:4-9, com reflexão por versículo |
| Modo **Leitura** | FUNCIONA (sobre fixture) | versículo em foco + reflexão |
| Modo **Memória** | FUNCIONA (sobre fixture) | ocultar/revelar palavra a palavra, revelar o versículo todo |
| Notas por versículo | PARCIAL | memória |
| Modo **Oração** | FUNCIONA | respiração guiada (inspira/retém/expira a cada 4 s) + cronômetro de silêncio |
| Context Panel | FIXTURE | "vigília 48 dias", hora litúrgica, ciclo, 2 intenções fixas |
| Inconsistência | — | a Island mostra **"DIA 47"** para Espiritual e o painel mostra **48 dias** — duas fixtures que não batem |
| Bíblia completa, plano de leitura, SRS de memorização, gratidão, versículo do dia | CONTRATO | no domínio, sem tela |

### 8.2 Relatório de profundidade — Espiritual

- **Consegue**: ler, memorizar e orar com 2 passagens.
- **Não consegue**: escolher outra passagem fora das 2; salvar nota; seguir plano;
  revisar com repetição espaçada; registrar gratidão.
- **Persiste**: nada.
- **Fundação pronta e não ligada**: `domains/spiritual` (45 arquivos): referência bíblica,
  plano de leitura, estudo, **memorização SM-2**, gratidão, presença "sem culpa e sem
  streak", propósito, sugestões, privacidade de reflexões, contrato de IA contextual
  futura, adapter do Minha Vida (`espiritual_gratidao`, revisões de memorização).

---

## 9. Guardian

**Classificação**: PRIMARY TAB (UI) + CROSS-CUTTING SYSTEM (fundação).

### 9.1 A tela

`src/components/guardian/GuardianContainer.tsx` + `guardianFixtures.ts`:

| Função | Estado | Detalhe |
|---|---|---|
| 3 casos | FIXTURE | telemedicina-t5, cobrança duplicada, modulação de carga |
| Cadeia causal evento → contexto → decisão → ação → resultado | FIXTURE | clique em cada etapa mostra o texto |
| "Simular fluxo" | FIXTURE | anima as etapas a cada 600 ms com som |
| "Aprovar ação" | FIXTURE | `Set` local + Island "L2 CONFIRMADO"; nada é executado |
| Explicação L1 / L2 / L3 | estático | texto |
| Context Panel | FIXTURE | lista os mesmos 3 casos |

A tela **não** lê nenhuma decisão, aprovação, trust ou auditoria real.

### 9.2 A fundação (existe e é testada, mas não aparece)

| Peça | Arquivo | Estado |
|---|---|---|
| Política L1/L2/L3 (`policy.classify`): L1 automático só com confiança ou `informationalOnly`; L2 sempre pede aprovação; L3 sempre pede aprovação; ação desconhecida → L3 | `foundation/guardian/policy.ts` | CONTRATO |
| Trust Engine | `foundation/guardian/trust.ts` | CONTRATO |
| Ciclo de aprovação | `foundation/guardian/approval.ts`, `guardianLifecycle.ts` | CONTRATO |
| Log de auditoria de ações | `foundation/guardian/auditLog.ts` | CONTRATO |
| Porta única `submitThroughGuardian` / `executeAuthorized` | `foundation/actions/submit.ts` | CONTRATO |
| Action Center (leitura) | `foundation/actions/universal.ts`, `guardianTrace/actionCenter.ts` | CONTRATO |
| Trilha causal, contexto da decisão, feedback, grants, resultado (append-only) | `foundation/guardianTrace/*` | CONTRATO |
| Runtime de auditoria: observar → detectar → dedup → classificar → explicar → avaliar → propor → autorizar → executar → verificar → registrar | `domains/guardian/runtime/*` | CONTRATO |
| Auditores: código, dados, produto, segurança, privacidade espiritual, por relato (UX/visual/runtime/integração) | `domains/guardian/auditors/*` | CONTRATO — recebem conteúdo como entrada; nada os alimenta em produção |
| Remediadores embutidos + registro | `domains/guardian/remediation/*` | CONTRATO |
| Prévia de consequência ao mudar autonomia | `domains/guardian/autonomyPreview.ts` | CONTRATO |
| Adapter do Minha Vida (`agent_action_executions`) | `foundation/guardianTrace/legacyMinhaVida.ts` | CONTRATO |

### 9.3 Relatório de profundidade — Guardian

- **Consegue (na tela)**: explicar visualmente o conceito de cadeia causal e níveis de
  autonomia.
- **Não consegue (na tela)**: mostrar qualquer decisão real, aprovar algo real, ajustar
  confiança ou autonomia, ver o histórico de ações.
- **Contradição de produto**: Finanças executa um "estorno" e Hoje diz "Guardian Ativo",
  mas nenhuma das duas passa pelo Guardian.
- **Persiste**: nada. A fundação tem `serialization.ts` e repositório em memória.

---

## 10. Progresso

**Classificação**: PLANNED. Renderiza `RoutePending`: "Progresso ainda está por vir —
Preferimos não mostrar nada aqui a mostrar algo inventado." Estado: **PLANEJADO MAS NÃO
IMPLEMENTADO**, com estado vazio honesto.

A fundação tem `foundation/goals/goalModel.ts` (Goal / Progress / Insight) e
`foundation/metrics/metricModel.ts` (métricas com revelação progressiva) — CONTRATO, sem
tela. Não há XP, nível, conquistas nem gráfico de evolução no Medusa.

---

## 11. Buscar

**Classificação**: CROSS-CUTTING SYSTEM. **Estado: NÃO EXISTE como função.**

- A sidebar tem "Comandos / Busca ⌘K" e `⌘K`/`Ctrl+K` abre o `CommandModal`.
- O campo de texto do modal **não filtra nada nem busca nada**.
- O modal lista **4 ações fixas**: modo foco, alternar tema, tema escuro, tema claro.
- Não há busca em agenda, aulas, finanças ou passagens.
- A fundação tem o **contrato** da busca global (`foundation/search/types.ts`) e o
  conversor de e-mail para documento de busca (`domains/email/search.ts`) — CONTRATO,
  sem índice nem tela.

---

## 12. Gmail / Agenda (comunicação)

**Classificação nesta árvore**: PLANNED (UI) + CONTRATO (fundação) + BLOQUEADO
(provedores).

| Peça | Estado | Onde |
|---|---|---|
| Aba Gmail com UI | **NÃO EXISTE nesta árvore** | só na branch da PR #29 |
| Contratos `EmailMessage`, `EmailThread`, risco, evidência, candidatos | CONTRATO | `domains/email/model/types.ts` |
| Extração com evidência (datas relativas ao recebimento, horário, prazo, valor, local, pessoa, disciplina, pedido) | CONTRATO | `services/extract.ts` |
| Classificação e risco determinísticos (importância nunca vem do prestígio do remetente) | CONTRATO | `classify.ts`, `risk.ts` |
| Candidatos: tarefa, evento, prazo, lembrete, finanças, resposta — com dedup contra o que já existe e por conversa | CONTRATO | `candidates.ts` |
| Ações via Guardian: L1 classificar/detectar, L2 sugerir, L3 responder/encaminhar/excluir/cancelar/pagar | CONTRATO | `services/actions.ts` |
| Pontes com Reminder v2, Prioridade, Recomendação e Hoje | CONTRATO | `services/bridges.ts` |
| Acompanhamento sem spam | CONTRATO | `followUp.ts` |
| Provedor Gmail | **BLOQUEADO** — chamada falha alto e o estado vira "permissão necessária" (não "caixa vazia") | `domains/email/providers/types.ts` |
| Provedor Google Calendar / Outlook | **BLOQUEADO** com motivo declarado; mapeador da API do Google pronto (`fromGoogleCalendarEvent`) | `domains/calendar/providers.ts` |
| Provedor de calendário interno sobre `Repository` | CONTRATO | idem |
| Arquitetura | documentada | `docs/MEDUSA_GMAIL_AGENDA_ARCHITECTURE.md` |
| Testes | 148/148 OK | `scripts/foundation-tests/email/*` |

---

## 13. Personal OS Core

**Classificação**: CROSS-CUTTING SYSTEM. **Estado geral: CONTRATO** — testado
(230 checagens na suíte própria + parte das 64 de contratos), sem nenhuma tela.

| Módulo | Arquivo(s) | O que faz | Estado |
|---|---|---|---|
| Tarefas | `domains/tasks/*` | contrato de Task (evento ≠ tarefa), ciclo de vida imutável, dependências derivadas | CONTRATO (repositório só em memória) |
| Projetos | `domains/projects/*` | marcos, prazos, esforço restante, viabilidade contra tempo disponível | CONTRATO |
| Contexto de evento + importância por regras | `foundation/context/eventContext.ts`, `importance.ts` | tier `critical` configurável, `dedupKey`, `intentKey` | CONTRATO |
| Priority Engine | `foundation/priority/*` | fatores ponderados, sobreposições (rígido iminente, não executável), explicação estruturada | CONTRATO |
| Reminder Engine v2 | `foundation/reminders/engine.ts` | estado por lembrete, canais padronizados, Guardian, follow-up, **T-30/15/5/0 para críticos**, um aviso só por compromisso entre fontes, export/import de estado | CONTRATO (a Agenda usa a v1) |
| Ações universais | `foundation/actions/*` | porta única via Guardian, Action Center | CONTRATO |
| Recommendation Engine | `foundation/recommendations/engine.ts` | por janela livre real (5 min de folga), prioridade, energia, contexto; propõe via Guardian (L2) | CONTRATO |
| Planner | `foundation/planner/planner.ts` | `SuggestedSchedule` determinístico respeitando rotina, deslocamento, folga, sono, dependências, janelas protegidas | CONTRATO |
| Context Aggregator / Hoje | `foundation/context/aggregator.ts`, `sources.ts`, `today.ts` | Agora, Próximo, Atenção, Ritmo, Recomendação com estado por fonte | CONTRATO |
| Acadêmico | `domains/academic/*` | Faculdade, Curso, ENEM, Inglês + pontes | CONTRATO |
| Persistência | `foundation/persistence/*` | `StorageAdapter` (memória / localStorage / indisponível), `PersistenceAdapter`, `Repository`, log append-only, matriz de persistência | CONTRATO — adapters prontos, nada da UI usa |
| Evento canônico | `foundation/events/canonical.ts` | 10 tipos de origem, conversão de/para item da Agenda, resolvedor de política de lembrete, `isAuthoritative` | CONTRATO |
| Relações entre entidades | `foundation/relations/graph.ts` | ligação idempotente, saída/entrada, vizinhança, export/import | CONTRATO |
| Estado de provedor | `foundation/providers/state.ts` | 8 estados de integração externa | CONTRATO |
| Barramentos | `foundation/eventBus.ts`, `actionBus.ts`, `domainRegistry.ts` | eventos de domínio, ações, registro de domínios | CONTRATO |
| Comunicação proativa | `foundation/messaging/proactiveMessage.ts` | mensagens proativas | CONTRATO |
| DataState | `foundation/dataState.ts` | 9 estados (carregando, vazio, erro, bloqueado…) | **usado** só pelo `financeBridge` |

---

## 14. Dynamic Island

**Classificação**: CROSS-CUTTING SYSTEM. **Arquivos**: `src/components/shell/DynamicIsland.tsx`,
`MobileIsland.tsx`, `src/fixtures/islandFixtures.ts`, `src/context/ShellContext.tsx`.

| Função | Estado | Detalhe |
|---|---|---|
| 10 estados: idle, context, active, processing, success, attention, error, summary, focus, collapsed | FUNCIONA | |
| Conteúdo padrão por estado | FIXTURE | `islandFixtures` |
| Conteúdo padrão por rota | FIXTURE | Finanças "R$ 4.310", Corpo "420 TSS", Guardian "NOMINAL", Espiritual "DIA 47" — fixos e **não batem** com as próprias telas (ex.: Espiritual mostra 48 dias) |
| Fila de notificações | FUNCIONA | prioridade (atenção/erro = 3, sucesso = 2, demais = 1), **máximo 3 na fila**, mínimo de 1.000 ms em tela, duração ≥ 1.400 ms (padrão 1.800) |
| Notificações reais vindas das abas | FUNCIONA | concluir bloco, check-in, série registrada, treino concluído, lembretes da Agenda, troca de visão da Agenda, etc. |
| Ação dentro da notificação | FUNCIONA | ex.: "Abrir compromisso", "Abrir sala" |
| Estado silencioso com o `⌘K` aberto | FUNCIONA | |
| Modo muda estado (foco → focus, compacto → context, amplo → active) | FUNCIONA | |
| Overlay de voz | FIXTURE | visual; clique encerra; sem microfone |
| Som a cada mudança de estado | FUNCIONA | |
| Ilha móvel (abrir/recolher) | FUNCIONA | |
| Mídia na ilha (protótipo) | só em `/dev/motion-lab` | `IslandMediaPrototype` |

---

## 15. Context Panel

**Classificação**: CROSS-CUTTING SYSTEM. **Arquivo**: `src/components/shell/ContextPanel.tsx`.

- Painel direito no desktop; **bottom sheet** no celular; escondido no modo foco.
- Aberto/fechado persiste em `localStorage['medusa-context-panel-open']`.
- Conteúdo por rota:

| Rota | Painel | Fonte |
|---|---|---|
| Hoje | `TodayContextPanel` | Agenda + fixtures (ver §3.2) |
| Agenda | `AgendaContextSummary` | Agenda real (dia, próximo item, tempo livre, voltar a hoje) |
| Educação | `TrackContextPanel` → Faculdade / Inglês / ENEM | fixture + estado de sessão; Faculdade aceita upload local; Inglês abre painel do "professor"; ENEM abre o cronograma |
| Finanças | `FinanceContextPanel` | bridge + fixture antiga (duas fontes) |
| Corpo | `BodyContextPanel` | fixture |
| Guardian | `GuardianContextPanel` | fixture |
| Espiritual | `SpiritualContextPanel` | fixture |

A fundação tem um **registro** de Context Panels por domínio
(`foundation/contextPanel/*`) — CONTRATO, não é o que a UI usa (a UI escolhe por `if` de
rota).

---

## 16. Shell

**Classificação**: CROSS-CUTTING SYSTEM. Estado: **FUNCIONA**.

| Função | Detalhe | Persistência |
|---|---|---|
| Rota ativa | 8 rotas; padrão `hoje`; refletida no hash `#rota`; voltar/avançar via `hashchange` | `medusa-active-route` |
| Tema claro/escuro | View Transitions API + classe de transição de 380 ms | `medusa-theme-v2` |
| Modos amplo / compacto / foco | geometria única (`calculateShellGeometry`); foco esconde sidebar (vira gaveta) e painel | memória |
| Breakpoints | desktop ≥ 1024, tablet ≥ 768, celular abaixo | — |
| Sidebar | 240 px / 68 px recolhida; gaveta no foco e no celular | memória |
| Header | breadcrumb, `⌘K`, menu de modo, menu de tema, alternar painel, configurações de áudio, música | — |
| Atalhos | `⌘K`/`Ctrl+K` abre/fecha comandos; `Esc` fecha | — |
| Áudio destravado no 1º gesto | `unlockAudioOnFirstGesture` | — |

---

## 17. Notificações

**Classificação**: CROSS-CUTTING SYSTEM.

| Canal | Estado | Detalhe |
|---|---|---|
| Dynamic Island | **FUNCIONA** | §14 |
| Web Notification do navegador | **PARCIAL** | adapter pronto; só dispara se a permissão já estiver concedida; **nenhuma tela pede a permissão** |
| Push (service worker) | **NÃO EXISTE** | não há service worker nem manifest de PWA |
| Notificação nativa (Android/iOS) | **BLOQUEADO** | declarado como canal bloqueado na fundação |
| E-mail / SMS | NÃO EXISTE | |
| Central de notificações (histórico) | **NÃO EXISTE** | o que passou pela Island se perde |
| Janelas de silêncio / não perturbe | CONTRATO parcial | o planner tem `ProtectedWindow`; o Reminder v2 tem política; nada na UI |

---

## 18. Áudio

**Classificação**: CROSS-CUTTING SYSTEM. **Arquivos**: `src/lib/audioFeedback.ts`,
`AudioSettingsWidget.tsx`, `SpotifyMusicWidget.tsx`.

| Função | Estado | Detalhe |
|---|---|---|
| Sons de interface sintetizados (Web Audio, osciladores, sem arquivos de áudio) | FUNCIONA | 14 categorias + apelidos (press, action, success, celebration, ready, learning_correct, learning_error…) |
| Preferências: ligar/desligar, volume (padrão 0,5), liga/desliga por categoria com prévia | FUNCIONA | `localStorage['medusa-audio-prefs-v2']` |
| Respeitar `prefers-reduced-motion` ou preferência de som do sistema | **NÃO EXISTE** | o som toca mesmo com "reduzir movimento" ligado |
| Música — Spotify IFrame API real | FUNCIONA | o usuário cola link de faixa/playlist/álbum/podcast/episódio; play/pause refletido via `playback_update`; mensagem de erro se o player for bloqueado; nenhuma playlist fixa no código |
| Lembrar o último link do Spotify | **NÃO EXISTE** | sem `localStorage` no widget |
| TTS (ler texto em voz alta) | NÃO EXISTE | nenhum `speechSynthesis` |
| STT (microfone) | NÃO EXISTE | nenhum `getUserMedia` / `SpeechRecognition` / `MediaRecorder` |

---

## 19. Motion

**Classificação**: CROSS-CUTTING SYSTEM. Estado: **FUNCIONA**.

- **42 `@keyframes`** em `src/app/globals.css`: respiração viva, onda de processamento,
  dois pulsos de atenção, tremida de erro, assentamento de sucesso, troca de conteúdo da
  ilha, entrada de estágio de estudo, entrada de resumo, entrada de exercício, recuo,
  modal, gaveta, troca de trilha (4 direções), pulso de escuta de voz, mola de sucesso,
  11 animações de ícone (play/pause morph, check desenhado, upload, logout, mic, refresh,
  configurações, tutor, calendário, volume, seta), fluxo tracejado, agulha, pulmão,
  "sentinela"…
- **`prefers-reduced-motion`**: regra global zera `animation` e `transform` e mantém só um
  crossfade de 140 ms em cor/opacidade, mais uma lista explícita de classes. O protótipo de
  mídia da ilha também respeita.
- `AnimatedIcon` (`src/components/ui/AnimatedIcon.tsx`) — ícones semânticos com animação.
- `/dev/motion-lab` (576 linhas) — vitrine de motion para desenvolvimento; não está na
  navegação.
- A fundação tem `foundation/motion/motionIdentity.ts` (identidade de motion por domínio)
  — CONTRATO, não usado pela UI.

---

## 20. Integrações

| Integração | Existe? | Funciona? | Real? | Bloqueio | Onde é usada |
|---|---|---|---|---|---|
| Spotify (IFrame API) | Sim | Sim | **Sim** — player oficial no navegador | depende de o navegador permitir o embed | Header → widget de música |
| Web Audio API (sons) | Sim | Sim | Sim (local) | — | todo o app |
| View Transitions API | Sim | Sim (com fallback quando o navegador não tem) | Sim (local) | — | troca de tema |
| Web Notification API | Adapter | Só com permissão já concedida | Sim, mas nunca pedida | falta UI de pedido de permissão | lembretes da Agenda |
| `localStorage` | Sim | Sim | Sim (só neste navegador) | não sincroniza entre aparelhos | Agenda, Educação, Shell, áudio |
| Gmail | Contrato de provedor | Não | Não | **BLOQUEADO** — sem OAuth, sem backend | `domains/email/providers` |
| Google Calendar | Contrato + mapeador da API | Não | Não | **BLOQUEADO** | `domains/calendar/providers.ts` |
| Outlook Calendar | Contrato | Não | Não | **BLOQUEADO** | idem |
| Open Finance / Pluggy | Estado de sync + adapter legado | Não | Não | sem backend, sem credencial | `domains/finance/services/syncState.ts` |
| Relógio / app de saúde (Google Fit, Health Connect, etc.) | Não | — | — | — | NÃO EXISTE |
| IA (Gemini, OpenAI, OpenRouter, etc.) | **Não** | — | — | — | NÃO EXISTE — o Tutor é texto pronto; `domains/spiritual/services/aiContext.ts` é só o contrato de uma IA futura |
| Voz (STT/TTS, ElevenLabs, etc.) | **Não** | — | — | — | NÃO EXISTE — telas de voz são simuladas |
| Supabase / banco remoto | **Não** | — | — | — | NÃO EXISTE — `Repository` tem o "degrau" Supabase só como intenção documentada |
| Android / MacroDroid | Não | — | — | — | NÃO EXISTE no Medusa |
| Adapters do Minha Vida (leitura de tabelas antigas) | Sim, como funções puras | Só em teste | Não há conexão com o banco do Minha Vida | sem backend | `domains/*/adapters/legacyMinhaVida.ts` (agenda, body, finance, spiritual) + `guardianTrace/legacyMinhaVida.ts` |

---

## 21. Persistência

| Entidade | Em memória | localStorage | Supabase | Externa | Estado |
|---|---|---|---|---|---|
| Rota ativa | — | ✅ `medusa-active-route` (+ hash) | — | — | FUNCIONA |
| Tema | — | ✅ `medusa-theme-v2` | — | — | FUNCIONA |
| Painel de contexto aberto | — | ✅ `medusa-context-panel-open` | — | — | FUNCIONA |
| Modo do Shell (amplo/compacto/foco) | ✅ | — | — | — | volta ao padrão ao recarregar |
| Preferências de áudio | — | ✅ `medusa-audio-prefs-v2` | — | — | FUNCIONA |
| Link do Spotify | ✅ | — | — | Spotify | não lembrado |
| Itens da Agenda | — | ✅ `medusa-agenda-items` | — | — | FUNCIONA |
| Visão da Agenda | — | ✅ `medusa-agenda-view-mode` | — | — | FUNCIONA |
| Categorias da Agenda | ✅ | — | — | — | **perde ao recarregar** |
| Itens concluídos / estendidos no Hoje | ✅ | — | — | — | perde |
| Check-in de consulta | ✅ | — | — | — | perde |
| Trilha de Educação | — | ✅ `medusa_education_track` | — | — | FUNCIONA |
| Visão do ENEM | — | ✅ `medusa_enem_view` | — | — | FUNCIONA |
| Plano do cronograma | — | ✅ `medusa_cronograma_plan` | — | — | FUNCIONA |
| Cronograma visto | — | ✅ `medusa_cronograma_seen` | — | — | FUNCIONA |
| Respostas do onboarding | — | ✅ `medusa_cronograma_diag_answers`, `_multi`, `_custom`, `_step`, `_bloco` | — | — | FUNCIONA |
| Disciplina extra (Faculdade) | ✅ | — | — | — | perde |
| Material enviado | ✅ (object URL) | — | — | — | perde (aviso honesto) |
| Notas de aula, sessão interrompida, flashcards, resultado | ✅ | — | — | — | perde |
| Treino (séries, cargas, descanso) | ✅ | — | — | — | perde |
| Notas espirituais | ✅ | — | — | — | perde |
| Aprovações do Guardian (tela) | ✅ | — | — | — | perde |
| Anomalia "resolvida" (Finanças) | ✅ | — | — | — | perde |
| Tarefas, projetos, lembretes v2, log de eventos de contexto, histórico de ações (fundação) | ✅ repositórios | adapter **pronto** (`createLocalStorageAdapter`), não ligado | ❌ | — | CONTRATO |
| Finanças (domínio) | ✅ repositório em memória semeado com fixture | — | ❌ | — | FIXTURE |
| E-mail, calendário externo | — | — | ❌ | ❌ bloqueado | BLOQUEADO |

**Total de chaves de `localStorage` encontradas: 15** (contando as 5 do onboarding).

---

## 22. CRUD Matrix

Legenda: ✅ funciona e persiste · 🟡 funciona só na sessão (memória) · 🔵 só contrato na
fundação · — não existe.

| Entidade | Create | Read | Update | Delete | Complete | Reschedule | History |
|---|---|---|---|---|---|---|---|
| Item da Agenda (evento/bloco/prazo/rotina) | ✅ | ✅ | ✅ | ✅ (+ lote, + desfazer) | — | ✅ (arrastar, ±30 min, sugestão) | — |
| Série recorrente (Rotina) | ✅ | ✅ | ✅ (3 escopos) | ✅ (3 escopos) | — | ✅ | — |
| Categoria da Agenda | 🟡 | ✅ | 🟡 | 🟡 | — | — | — |
| Bloco do Hoje | — | ✅ (da Agenda) | 🟡 (+15 min) | — | 🟡 | — | — |
| Plano do cronograma ENEM | ✅ | ✅ | ✅ (refazer) | ✅ (refazer zera) | — | — | — |
| Blocos de estudo na Agenda | ✅ (via cronograma) | ✅ | ✅ (como item da Agenda) | ✅ | — | ✅ | — |
| Disciplina da Faculdade | 🟡 | fixture | — | — | — | — | — |
| Material de disciplina | 🟡 | 🟡 | — | 🟡 | — | — | — |
| Nota de aula | 🟡 | 🟡 | — | — | — | — | — |
| Sessão de estudo | 🟡 | 🟡 | — | — | 🟡 | — | — |
| Flashcard | — | fixture | — | — | 🟡 (contador) | — | — |
| Sessão de treino / série | — | fixture | 🟡 (carga) | — | 🟡 | — | fixture |
| Transação financeira | 🔵 | fixture | 🔵 | — | — | — | — |
| Orçamento / meta financeira | 🔵 | — | 🔵 | — | — | — | — |
| Nota de versículo | 🟡 | 🟡 | 🟡 | — | — | — | — |
| Passagem bíblica | — | fixture | — | — | — | — | — |
| Decisão / aprovação do Guardian | — | fixture | — | — | 🟡 (aprovar) | — | — |
| Tarefa | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | — |
| Projeto / marco | 🔵 | 🔵 | 🔵 | — | 🔵 | — | — |
| Lembrete v2 | 🔵 | 🔵 | 🔵 | 🔵 (cancelar) | 🔵 (ack) | 🔵 (adiar) | 🔵 |
| E-mail / conversa | — | 🔵 (bloqueado) | — | — | — | — | — |
| Ação universal (Action Center) | 🔵 | 🔵 | 🔵 (status) | — | 🔵 | — | 🔵 (log) |

---

## 23. Relationship Matrix

| Origem → Destino | Relação | Estado |
|---|---|---|
| Agenda → Hoje | Hoje lê os itens de hoje | **Implementada** |
| Cronograma ENEM → Agenda | gera blocos "Estudo: …" | **Implementada** (com bug de semana, §5.4) |
| Agenda → Educação | "Começar" navega para Educação | **Implementada** (navegação simples) |
| Hoje → Corpo | "Ver Treino" navega | **Implementada** (navegação simples) |
| Agenda → Dynamic Island | lembretes T-15/T-5 | **Implementada** |
| Todas as abas → Dynamic Island | notificações de ação | **Implementada** |
| Educação → Shell | Modo Estudo liga o modo foco | **Implementada** |
| Educação (fixture de avisos) → Hoje | avisos no painel do Hoje | **Implementada** (sobre fixture) |
| Finanças → Guardian | "Ação L2 sugerida" | **Não implementada** — só rótulo |
| Guardian → todas | aprovar/explicar ações | **Preparada** (fundação), não ligada |
| E-mail → Tarefa / Evento / Prazo / Lembrete / Finanças | candidatos com dedup | **Preparada** |
| E-mail → Hoje / Prioridade / Recomendação | pontes | **Preparada** |
| Acadêmico → Tarefa / Evento crítico / Prazo / Prática curta | pontes | **Preparada** |
| Corpo ↔ Agenda / Hoje | adapters e resolvers | **Preparada** |
| Finanças ↔ Agenda / Hoje | adapters e resolvers | **Preparada** |
| Espiritual ↔ Agenda / Hoje | adapters, sugestões temporais, "inteligência" para o Hoje | **Preparada** |
| Projeto → Tarefa → dependências | grafo de dependências | **Preparada** |
| Qualquer entidade ↔ qualquer entidade | `RelationStore` | **Preparada** |
| Evento canônico ↔ item da Agenda | conversão nos dois sentidos | **Preparada** |
| Google Calendar / Outlook → Agenda | sync | **Bloqueada** |
| Gmail → E-mail | ingestão | **Bloqueada** |
| Progresso ← todos os domínios | metas e métricas | **Planejada** (`goalModel`, `metricModel`) |
| Busca ← todos os domínios | índice global | **Planejada** (contrato) |

---

## 24. User Journeys

Cada jornada foi seguida no código, do clique ao efeito.

| # | Jornada | Funciona de ponta a ponta? | Onde quebra |
|---|---|---|---|
| J1 | Criar um compromisso na Agenda, recarregar e ele continua lá | **Sim** | — |
| J2 | Criar uma rotina semanal e editar só "este e seguintes" | **Sim** | — |
| J3 | Arrastar um evento para outro horário na Semana | **Sim** | — |
| J4 | Ser avisado 15 min antes de um compromisso | **Sim, dentro do app** (Island) | fora do app só se a permissão de notificação já estiver concedida — nenhuma tela pede |
| J5 | Abrir o Hoje e ver o que estou fazendo agora | **Sim** se houver item hoje na Agenda | sem item hoje, mostra 6 blocos de exemplo como se fossem do usuário |
| J6 | Concluir um bloco no Hoje e ver isso amanhã | **Não** | conclusão só em memória |
| J7 | Teleconsulta: ver alerta, confirmar check-in, entrar na sala | **Sim, parcial** | depende de palavra no título; check-in não persiste |
| J8 | Fazer o diagnóstico do ENEM e ver o plano | **Sim** | — |
| J9 | Mandar o cronograma para a Agenda e ver os blocos desta semana | **Não** | blocos vão para a semana de 28/09/2026 (§5.4) |
| J10 | Assistir uma aula, anotar, fazer exercícios e ver o resultado | **Sim, sobre conteúdo fixo** | nada é salvo; "revisar amanhã 09:00" é fixo e não cria nada |
| J11 | Treinar inglês falando no microfone | **Não** | voz simulada, sem microfone |
| J12 | Perguntar uma dúvida ao Tutor | **Não** | resposta pronta |
| J13 | Revisar flashcards com repetição espaçada | **Não** | só contadores de sessão |
| J14 | Registrar o treino de hoje e ver a evolução amanhã | **Não** | treino em memória; gráficos são fixture |
| J15 | Lançar uma despesa e ver o "Livre" mudar | **Não** | não existe entrada de transação; só o simulador temporário |
| J16 | Contestar uma cobrança duplicada | **Não** — e a tela diz que sim | mensagem de "estorno solicitado com sucesso" sem ação real |
| J17 | Ler a Bíblia além das 2 passagens | **Não** | só 2 passagens |
| J18 | Fazer uma oração guiada com respiração | **Sim** | — |
| J19 | Aprovar uma ação proposta pelo Guardian | **Não** (é demonstração) | casos fixos, aprovação local |
| J20 | Buscar "consulta" e achar o compromisso | **Não** | busca não existe |
| J21 | Ver meu progresso geral | **Não** | aba "ainda está por vir" |
| J22 | Trocar o tema para escuro e voltar no dia seguinte com escuro | **Sim** | — |
| J23 | Ouvir minha playlist durante o estudo | **Sim** | precisa colar o link de novo a cada visita |
| J24 | Desligar só os sons de erro | **Sim** | — |
| J25 | Usar no celular | **Sim** (layout responsivo, ilha móvel, painel como bottom sheet) | sem PWA/instalação, sem push |
| J26 | Usar o app em outro aparelho com os mesmos dados | **Não** | tudo em `localStorage` deste navegador |
| J27 | Ler um e-mail e transformar em tarefa | **Não nesta árvore** | UI não existe aqui; provedor bloqueado |

---

## 25. Feature Inventory

Uma linha por função identificável. A coluna **Estado** usa os códigos da legenda; as
contagens do §28 saem desta tabela.

| # | Feature | Domínio | Estado | Onde está | Fonte de dados | Persistência | Integrações | Observação |
|---|---|---|---|---|---|---|---|---|
| F001 | Navegação por 8 abas com hash | Shell | FUNCIONA | `ShellContext`, `Sidebar` | usuário | localStorage | — | voltar/avançar funciona |
| F002 | Tema claro/escuro com transição | Shell | FUNCIONA | `ShellContext` | usuário | localStorage | View Transitions | |
| F003 | Modos amplo/compacto/foco | Shell | FUNCIONA | `ShellContext`, `types/shell.ts` | usuário | memória | — | |
| F004 | Sidebar recolhível / gaveta | Shell | FUNCIONA | `Sidebar.tsx` | — | memória | — | |
| F005 | Badges da sidebar | Shell | FIXTURE | `Sidebar.tsx` | literais "3", "14" | — | — | não refletem dados |
| F006 | Header com breadcrumb e menus | Shell | FUNCIONA | `Header.tsx` | — | — | — | |
| F007 | Paleta de comandos ⌘K | Shell | PARCIAL | `CommandModal.tsx` | 4 ações fixas | — | — | campo de texto sem função |
| F008 | Busca global | Busca | NÃO EXISTE | — | — | — | — | contrato em `foundation/search` |
| F009 | Página de vitrine para rota desconhecida | Shell | FIXTURE | `page.tsx` | texto fixo | — | — | só por hash manual |
| F010 | Responsividade (desktop/tablet/celular) | Shell | FUNCIONA | `calculateShellGeometry` | — | — | — | |
| F011 | Context Panel por aba (desktop + bottom sheet) | Painel | FUNCIONA | `ContextPanel.tsx` | por aba | localStorage (aberto) | — | conteúdo majoritariamente fixture |
| F012 | Dynamic Island — 10 estados | Island | FUNCIONA | `DynamicIsland.tsx` | eventos do app | — | — | |
| F013 | Island — fila com prioridade | Island | FUNCIONA | `ShellContext` | eventos do app | — | — | máx. 3 |
| F014 | Island — conteúdo padrão por rota | Island | FIXTURE | `islandFixtures.ts` | literais | — | — | inconsistente com as telas |
| F015 | Island — overlay de voz | Island | FIXTURE | `DynamicIsland.tsx` | — | — | — | sem microfone |
| F016 | Ilha móvel | Island | FUNCIONA | `MobileIsland.tsx` | — | — | — | |
| F017 | Sons de interface sintetizados | Áudio | FUNCIONA | `audioFeedback.ts` | — | — | Web Audio | |
| F018 | Preferências de som por categoria | Áudio | FUNCIONA | `AudioSettingsWidget.tsx` | usuário | localStorage | — | |
| F019 | Respeito a reduzir movimento no áudio | Áudio | NÃO EXISTE | — | — | — | — | |
| F020 | Player do Spotify | Áudio | FUNCIONA | `SpotifyMusicWidget.tsx` | link do usuário | memória | Spotify IFrame | link não é lembrado |
| F021 | Motion global (42 keyframes) + reduced-motion | Motion | FUNCIONA | `globals.css` | — | — | — | |
| F022 | Ícones animados semânticos | Motion | FUNCIONA | `AnimatedIcon.tsx` | — | — | — | |
| F023 | Motion lab (dev) | Motion | FUNCIONA | `/dev/motion-lab` | demo | — | — | fora da navegação |
| F024 | Hoje — Agora (progresso, minutos restantes) | Hoje | FUNCIONA | `HojeContainer.tsx` | Agenda | — | — | |
| F025 | Hoje — Estender +15 min | Hoje | PARCIAL | `HojeContainer.tsx` | sessão | memória | — | não grava na Agenda |
| F026 | Hoje — Concluir bloco | Hoje | PARCIAL | `HojeContainer.tsx` | sessão | memória | Island | |
| F027 | Hoje — Próximo | Hoje | FUNCIONA | `HojeContainer.tsx` | Agenda | — | — | |
| F028 | Hoje — Atenção para consulta/telemedicina | Hoje | PARCIAL | `HojeContainer.tsx` | Agenda (palavra no título) | memória (check-in) | Island | |
| F029 | Hoje — "Sem alertas críticos / Guardian Ativo" | Hoje | FIXTURE | `HojeContainer.tsx` | texto fixo | — | — | não consulta o Guardian |
| F030 | Hoje — Ritmo do Dia + inspetor | Hoje | FUNCIONA | `HojeContainer.tsx` | Agenda | — | — | |
| F031 | Hoje — Recomendação Medusa | Hoje | FIXTURE | `HojeContainer.tsx` | texto fixo | memória (dispensar) | — | |
| F032 | Hoje — 6 blocos de exemplo quando o dia está vazio | Hoje | FIXTURE | `hojeFixtures.ts` | fixture | — | — | esconde o vazio |
| F033 | Hoje — painel "99.8% Estável · Sync ativo" | Hoje | FIXTURE | `TodayContextPanel.tsx` | texto fixo | — | — | afirma sync inexistente |
| F034 | Hoje — Próxima transição / marcos | Hoje | PARCIAL | `TodayContextPanel.tsx` | Agenda + fallback fixo | — | — | |
| F035 | Agenda — visões Dia/Semana/Mês/Lista + atalhos | Agenda | FUNCIONA | `components/agenda/*` | usuário | localStorage | — | |
| F036 | Agenda — criar/editar/excluir/duplicar | Agenda | FUNCIONA | `AgendaContext.tsx` | usuário | localStorage | — | |
| F037 | Agenda — excluir em lote | Agenda | FUNCIONA | `ListView.tsx` | usuário | localStorage | — | |
| F038 | Agenda — desfazer exclusão | Agenda | FUNCIONA | `AgendaContainer.tsx` | sessão | — | — | 6–7 s |
| F039 | Agenda — recorrência de Rotina (3 escopos) | Agenda | FUNCIONA | `AgendaContext.tsx` | usuário | localStorage | — | só tipo Rotina |
| F040 | Agenda — arrastar para reagendar | Agenda | FUNCIONA | `DayView`, `WeekView` | usuário | localStorage | — | encaixe 15 min |
| F041 | Agenda — ±30 min e horário compatível | Agenda | FUNCIONA | `EventDetailPanel.tsx` | usuário | localStorage | — | |
| F042 | Agenda — redimensionar arrastando | Agenda | NÃO EXISTE | — | — | — | — | |
| F043 | Agenda — detecção e layout de conflitos | Agenda | FUNCIONA | `agendaHelpers.ts` | usuário | — | — | |
| F044 | Agenda — tempo livre | Agenda | FUNCIONA | `agendaHelpers.ts`, `FreeTimeSlot` | usuário | — | — | |
| F045 | Agenda — filtro por domínio | Agenda | FUNCIONA | `AgendaFilters.tsx` | — | — | — | |
| F046 | Agenda — busca por texto | Agenda | NÃO EXISTE | — | — | — | — | |
| F047 | Agenda — categorias personalizadas | Agenda | PARCIAL | `CategoryModal.tsx` | usuário | memória | — | perde ao recarregar |
| F048 | Agenda — 17 itens de exemplo na 1ª carga | Agenda | FIXTURE | `agendaFixtures.ts` | fixture | localStorage | — | viram "dados do usuário" depois de gravados |
| F049 | Agenda — ações de domínio no detalhe (analisar prazo, ver impacto) | Agenda | FIXTURE | `EventDetailPanel.tsx` | texto | — | Island | |
| F050 | Agenda — registrar pagamento ("Pago") | Agenda | PARCIAL | `EventDetailPanel.tsx` | sessão | memória | — | |
| F051 | Agenda — lembretes T-15/T-5 na Island | Agenda | FUNCIONA | `AgendaContext.tsx` + reminders v1 | Agenda | — | Island | |
| F052 | Agenda — Web Notification | Notificações | PARCIAL | `foundation/reminders/adapters.ts` | Agenda | — | Notification API | nunca pede permissão |
| F053 | Agenda — sync Google/Outlook | Agenda | BLOQUEADO | `domains/calendar/providers.ts` | — | — | Google, Microsoft | |
| F054 | Educação — seletor de trilha animado | Educação | FUNCIONA | `EducationDashboard.tsx` | — | localStorage | — | |
| F055 | Educação — conteúdo de Faculdade | Educação | FIXTURE | `educationFixtures.ts` | fixture | — | — | 4 disciplinas |
| F056 | Educação — adicionar disciplina | Educação | PARCIAL | `FaculdadeHub.tsx` | usuário | memória | — | |
| F057 | Educação — enviar material | Educação | PARCIAL | `FaculdadeContextPanel.tsx` | arquivo do usuário | memória (object URL) | — | aviso honesto |
| F058 | Educação — avisos/prazos da Faculdade | Educação | FIXTURE | `educationFixtures.ts` | fixture | — | — | |
| F059 | Educação — conteúdo de Inglês B1 | Educação | FIXTURE | `educationFixtures.ts` | fixture | — | — | |
| F060 | Educação — conteúdo do ENEM | Educação | FIXTURE | `educationFixtures.ts` | fixture | — | — | |
| F061 | Educação — carregamento | Educação | FIXTURE | `EducationContainer.tsx` | `setTimeout` | — | — | |
| F062 | Educação — estado de erro + retry | Educação | PARCIAL | `StudyErrorState.tsx` | — | — | — | só com `?qa=1` |
| F063 | Modo Estudo — player simulado | Educação | FIXTURE | `StudyModeView.tsx` | timer | memória | — | não há vídeo |
| F064 | Modo Estudo — aula / aula+resumo / resumo | Educação | FUNCIONA | `StudyModeView.tsx` | fixture | memória | — | |
| F065 | Modo Estudo — notas com marcação de tempo | Educação | PARCIAL | `StudyModeView.tsx` | usuário | memória | — | |
| F066 | Modo Estudo — interromper e retomar | Educação | PARCIAL | `EducationContainer.tsx` | sessão | memória | — | |
| F067 | Modo Estudo — liga o modo foco | Educação | FUNCIONA | `EducationContainer.tsx` | — | — | Shell | |
| F068 | Bloco interativo — Lei de Hooke | Educação | FUNCIONA | `InteractiveSimulationHooke.tsx` | entrada do usuário | — | — | simulação de verdade |
| F069 | Bloco interativo — comparação de rigidez | Educação | FUNCIONA | `InteractiveStiffnessComparison.tsx` | entrada do usuário | — | — | |
| F070 | Bloco interativo — onda | Educação | FUNCIONA | `InteractiveWaveBlock.tsx` | entrada do usuário | — | — | |
| F071 | Bloco interativo — espectro eletromagnético | Educação | FUNCIONA | `InteractiveEnemElectromagneticSpectrum.tsx` | entrada do usuário | — | — | |
| F072 | Bloco interativo — inglês | Educação | FUNCIONA | `InteractiveEnglishBlock.tsx` | fixture | — | — | |
| F073 | Bloco interativo — linha do tempo gramatical | Educação | FUNCIONA | `InteractiveEnglishTimelineGrammar.tsx` | fixture | — | — | |
| F074 | Tutor | Educação | FIXTURE | `TutorDrawer.tsx` | resposta pronta | — | — | sem IA |
| F075 | Exercício de voz (Inglês) | Educação | FIXTURE | `VoiceExerciseView.tsx` | transcrição simulada | — | — | sem microfone |
| F076 | Imersão ao vivo (Inglês) | Educação | FIXTURE | `LiveImmersionView.tsx` | simulada | — | — | |
| F077 | Exercícios com feedback e retry | Educação | FUNCIONA | `StudyExercisesView.tsx` | fixture | memória | áudio | |
| F078 | Flashcards | Educação | PARCIAL | `FlashcardsView.tsx` | fixture | memória | — | sem repetição espaçada |
| F079 | Tela de conclusão com acerto e tópicos | Educação | PARCIAL | `StudyCompletionView.tsx` | sessão | memória | — | "amanhã 09:00" fixo |
| F080 | Revisão de aulas concluídas | Educação | FIXTURE | `LessonReviewModal.tsx`, `CompletedActivityList.tsx` | fixture | — | — | |
| F081 | Domínio por habilidade (Speaking/Listening/…) | Educação | FIXTURE | `MasteryBars.tsx` | fixture | — | — | |
| F082 | Cronograma — onboarding de 29 perguntas | Educação | FUNCIONA | `CronogramaOnboarding.tsx` | usuário | localStorage | — | |
| F083 | Cronograma — motor de plano | Educação | FUNCIONA | `cronogramaPlanner.ts` | respostas | localStorage | — | lógica pura |
| F084 | Cronograma — visão por período/disciplina | Educação | FUNCIONA | `EnemCronogramaView.tsx` | plano | localStorage | — | |
| F085 | Cronograma — refazer | Educação | FUNCIONA | `EnemCronogramaView.tsx` | — | localStorage | — | com confirmação |
| F086 | Cronograma → Agenda | Educação | PARCIAL | `EnemHub.tsx`, `CronogramaOverlay.tsx` | plano | localStorage | Agenda | **bug: semana fixa 28/09/2026** |
| F087 | Corpo — prontidão, VFC, FC, sono, passos | Corpo | FIXTURE | `bodyFixtures.ts` | fixture | — | — | sem rótulo de exemplo |
| F088 | Corpo — evolução de 4 movimentos + tonelagem | Corpo | FIXTURE | `bodyFixtures.ts` | fixture | — | — | |
| F089 | Corpo — próximo estímulo | Corpo | FIXTURE | `bodyFixtures.ts` | fixture | — | — | |
| F090 | Corpo — bancada de treino (série, carga, descanso) | Corpo | PARCIAL | `BodyContainer.tsx` | sessão | memória | Island, áudio | |
| F091 | Corpo — salvar treino | Corpo | NÃO EXISTE | — | — | — | — | |
| F092 | Corpo — integração com relógio/app de saúde | Corpo | NÃO EXISTE | — | — | — | — | |
| F093 | Corpo — diagnóstico, plano, progressão, métricas | Corpo | CONTRATO | `domains/body/*` | — | memória | — | |
| F094 | Finanças — Tenho/Comprometido/Livre | Finanças | FIXTURE | `financeBridge.ts` → `domains/finance` | fixture no motor real | — | — | `asOf` fixo 05/10/2026 |
| F095 | Finanças — gavetas de detalhe | Finanças | FIXTURE | `FinanceContainer.tsx` | fixture | — | — | |
| F096 | Finanças — simulador "E se" | Finanças | PARCIAL | `FinanceContainer.tsx` | entrada do usuário | memória | — | runway calculado na UI |
| F097 | Finanças — próximas contas | Finanças | FIXTURE | `FinanceContainer.tsx` | JSX | — | — | |
| F098 | Finanças — anomalia + "estorno" | Finanças | FIXTURE | `FinanceContainer.tsx` | fixture | memória | Island | **afirma ação externa que não acontece** |
| F099 | Finanças — Context Panel | Finanças | FIXTURE | `FinanceContextPanel.tsx` | bridge + fixture antiga | — | — | duas fontes |
| F100 | Finanças — registrar transação | Finanças | CONTRATO | `domains/finance/useCases/createTransaction.ts` | — | memória | — | |
| F101 | Finanças — orçamento e metas | Finanças | CONTRATO | `domains/finance/useCases/*` | — | memória | — | |
| F102 | Finanças — fatura de cartão | Finanças | CONTRATO | `invoiceEngine.ts` | — | — | — | |
| F103 | Finanças — detecção de duplicidade (sugere, nunca apaga) | Finanças | CONTRATO | `duplicateDetection.ts` | — | — | — | |
| F104 | Finanças — recorrência e projeção | Finanças | CONTRATO | `recurrenceHeuristic.ts`, `runwayProjection.ts` | — | — | — | |
| F105 | Finanças — Open Finance | Finanças | BLOQUEADO | `syncState.ts` | — | — | Pluggy | sem backend |
| F106 | Espiritual — leitura com reflexão | Espiritual | FIXTURE | `SpiritualContainer.tsx` | 2 passagens | — | — | |
| F107 | Espiritual — memorização por palavras | Espiritual | FIXTURE | `SpiritualContainer.tsx` | 2 passagens | memória | — | |
| F108 | Espiritual — notas por versículo | Espiritual | PARCIAL | `SpiritualContainer.tsx` | usuário | memória | — | |
| F109 | Espiritual — oração com respiração e silêncio | Espiritual | FUNCIONA | `SpiritualContainer.tsx` | timer | — | — | |
| F110 | Espiritual — painel (vigília, intenções) | Espiritual | FIXTURE | `SpiritualContextPanel.tsx` | fixture | — | — | 48 × 47 dias |
| F111 | Espiritual — Bíblia, plano, SRS, gratidão, versículo do dia | Espiritual | CONTRATO | `domains/spiritual/*` | — | memória | — | |
| F112 | Guardian — 3 casos com cadeia causal | Guardian | FIXTURE | `GuardianContainer.tsx` | fixture | — | — | |
| F113 | Guardian — simular fluxo | Guardian | FIXTURE | `GuardianContainer.tsx` | animação | — | — | |
| F114 | Guardian — aprovar ação | Guardian | FIXTURE | `GuardianContainer.tsx` | fixture | memória | Island | nada executa |
| F115 | Guardian — política L1/L2/L3 | Guardian | CONTRATO | `foundation/guardian/policy.ts` | — | — | — | |
| F116 | Guardian — trust, aprovação, log de auditoria | Guardian | CONTRATO | `foundation/guardian/*` | — | memória | — | |
| F117 | Guardian — trilha causal, grants, feedback, resultado | Guardian | CONTRATO | `foundation/guardianTrace/*` | — | memória | — | |
| F118 | Guardian — runtime de auditoria + auditores + remediadores | Guardian | CONTRATO | `domains/guardian/*` | — | memória | — | |
| F119 | Progresso | Progresso | PLANEJADO | `RoutePending.tsx` | — | — | — | estado vazio honesto |
| F120 | Metas e métricas | Progresso | CONTRATO | `foundation/goals`, `foundation/metrics` | — | — | — | |
| F121 | Tarefas | Personal OS | CONTRATO | `domains/tasks/*` | — | memória | — | |
| F122 | Projetos e marcos | Personal OS | CONTRATO | `domains/projects/*` | — | memória | — | |
| F123 | Priority Engine | Personal OS | CONTRATO | `foundation/priority/*` | — | — | — | |
| F124 | Reminder Engine v2 | Personal OS | CONTRATO | `foundation/reminders/engine.ts` | — | adapter pronto | — | Agenda usa a v1 |
| F125 | Recommendation Engine | Personal OS | CONTRATO | `foundation/recommendations/engine.ts` | — | — | — | |
| F126 | Planner determinístico | Personal OS | CONTRATO | `foundation/planner/planner.ts` | — | — | — | |
| F127 | Context Aggregator do Hoje | Personal OS | CONTRATO | `foundation/context/*` | — | — | — | |
| F128 | Ações universais via Guardian | Personal OS | CONTRATO | `foundation/actions/*` | — | memória | — | |
| F129 | Contratos acadêmicos | Personal OS | CONTRATO | `domains/academic/*` | — | — | — | |
| F130 | Persistência (memória → localStorage → Supabase) | Personal OS | CONTRATO | `foundation/persistence/*` | — | adapters | — | degrau Supabase não existe |
| F131 | Evento canônico | Personal OS | CONTRATO | `foundation/events/canonical.ts` | — | — | — | |
| F132 | Relações entre entidades | Personal OS | CONTRATO | `foundation/relations/graph.ts` | — | — | — | |
| F133 | Estado de provedor externo | Personal OS | CONTRATO | `foundation/providers/state.ts` | — | — | — | |
| F134 | E-mail — extração, classificação, risco | Gmail | CONTRATO | `domains/email/services/*` | — | — | — | |
| F135 | E-mail — candidatos com dedup | Gmail | CONTRATO | `candidates.ts` | — | — | — | |
| F136 | E-mail — ações via Guardian | Gmail | CONTRATO | `services/actions.ts` | — | — | — | |
| F137 | E-mail — acompanhamento sem spam | Gmail | CONTRATO | `followUp.ts` | — | — | — | |
| F138 | Provedor Gmail | Gmail | BLOQUEADO | `domains/email/providers/types.ts` | — | — | Google | |
| F139 | Aba Gmail com UI | Gmail | NÃO EXISTE | só na branch da PR #29 | — | — | — | não está nesta árvore |
| F140 | Notificação push / PWA | Notificações | NÃO EXISTE | — | — | — | — | sem service worker |
| F141 | Central de notificações | Notificações | NÃO EXISTE | — | — | — | — | |
| F142 | Notificação nativa | Notificações | BLOQUEADO | `foundation/reminders/channels.ts` | — | — | — | |
| F143 | IA em qualquer parte | IA | NÃO EXISTE | — | — | — | — | contrato de IA espiritual futura |
| F144 | Voz (STT/TTS) | Áudio | NÃO EXISTE | — | — | — | — | |
| F145 | Backend / sync entre aparelhos | Infra | NÃO EXISTE | — | — | — | — | |
| F146 | Login / conta de usuário | Infra | NÃO EXISTE | — | — | — | — | |
| F147 | Adapters de leitura das tabelas do Minha Vida | Infra | CONTRATO | `domains/*/adapters/legacyMinhaVida.ts` | — | — | — | só em teste |
| F148 | Barramento de eventos e de ações, registro de domínios | Infra | CONTRATO | `foundation/eventBus.ts`, `actionBus.ts`, `domainRegistry.ts` | — | — | — | |
| F149 | DataState (9 estados honestos) | Infra | PARCIAL | `foundation/dataState.ts` | — | — | — | só Finanças usa |
| F150 | Suíte de testes (1.135 checagens) | Infra | FUNCIONA | `scripts/foundation-tests/*` | — | — | — | só cobre fundação/domínios, não a UI |

---

## 26. Feature Gaps

### 26.1 Funções incompletas (começam e não terminam)

| Gap | Onde | Efeito para o usuário |
|---|---|---|
| Cronograma → Agenda gera blocos na semana fixa de 28/09/2026 | `cronogramaPlanner.ts` (`gerarBlocosAgendaSemana`) + 2 chamadores | blocos não aparecem na semana atual |
| Blocos do cronograma no mesmo horário | idem | sobreposição quando há menos de 7 dias disponíveis |
| "Revisar amanhã 09:00" na conclusão de estudo | `StudyCompletionView.tsx` | texto fixo; não cria lembrete nem bloco |
| Lembretes fora do app | `foundation/reminders/adapters.ts` | permissão nunca pedida |
| Paleta ⌘K | `CommandModal.tsx` | campo de busca sem função |

### 26.2 Funções parciais (fazem algo, mas só durante a sessão)

Concluir/estender bloco no Hoje · check-in de consulta · categorias da Agenda · adicionar
disciplina · material enviado · notas de aula · retomar sessão · flashcards · treino ·
notas de versículo · aprovação no Guardian · anomalia resolvida · link do Spotify · modo
do Shell.

### 26.3 Funções que existem sem UI (fundação pronta, sem tela)

Tarefas · Projetos · Priority Engine · Reminder Engine v2 · Recommendation Engine ·
Planner · Context Aggregator · Ações universais / Action Center · Guardian real (política,
trust, aprovação, auditoria, runtime, auditores, remediadores) · Acadêmico · Corpo (36
arquivos) · Espiritual (45 arquivos) · Finanças além do snapshot (orçamento, metas,
fatura, duplicidade, recorrência) · E-mail (pipeline inteiro) · Evento canônico ·
Relações · Persistência · Busca (contrato) · Metas e métricas · registro de Context Panel ·
identidade de motion e mapa de som por domínio.

### 26.4 UI sem backend (a tela promete algo que não acontece)

| Tela | Promessa | Realidade |
|---|---|---|
| Finanças → anomalia | "Estorno … solicitado ao emissor do cartão com sucesso" | nada é enviado — **é a promessa mais grave do app** |
| Hoje → painel | "Sync ativo há 2m · Nuvem Pessoal" | não há sync nem nuvem |
| Hoje → Atenção | "Guardian Ativo" | não consulta o Guardian |
| Educação → Tutor | conversa | resposta pronta |
| Educação → voz e imersão | "ouvindo…", transcrição | simulado, sem microfone |
| Island → overlay de voz | escuta | visual |
| Guardian → aprovar | "L2 CONFIRMADO" | nada executa |
| Agenda → "Analisar prazo" / "Ver impacto" | análise | texto simulado na Island |
| Corpo → números de saúde | prontidão, VFC, sono | fixos, sem rótulo de exemplo |
| Sidebar → badges "3" e "14" | contagem | literais |

### 26.5 Backend sem persistência

Todos os repositórios da fundação (`domains/*/repository/inMemory.ts`, tarefas, projetos,
lembretes v2, Guardian) são **em memória**. Os adapters de `localStorage` existem
(`createLocalStorageAdapter`, `bindRepositoryPersistence`, `bindStatePersistence`) mas
**nenhum repositório está ligado a eles** na UI. O degrau Supabase é só intenção.

### 26.6 Integrações preparadas sem conexão

Gmail · Google Calendar (com mapeador da API pronto) · Outlook Calendar · Open Finance
(Pluggy) · notificação nativa · adapters das tabelas do Minha Vida.

### 26.7 Inconsistências entre fontes

- Espiritual: Island "DIA 47" × painel "48 dias".
- Finanças: Context Panel usa bridge **e** `FINANCAS_DATA` (fixture antiga).
- Finanças: runway da UI (simulador) × `sustento.runwayDays` do domínio.
- Finanças: `asOf` fixo 05/10/2026 × data real.
- Island Finanças "R$ 4.310" × tela de Finanças (valor do snapshot).
- `<meta description>` "3 Temas" × 2 temas reais.

---

## 27. Histórico Minha-Vida

> **HISTÓRICO — NÃO CONFIRMADO NO MEDUSA.** Tudo nesta seção existiu (ou existe) no
> projeto anterior, `MasterABL/minha-vida` (Svelte 4 + Vite + Supabase + Vercel). Foi
> levantado pela estrutura do repositório antigo (15 abas em `src/components/tabs/`,
> 11 Serverless Functions em `api/`, 85 `create table` em `sql/schema.sql`) e pelo
> registro histórico do próprio projeto. **O Minha Vida não é fonte de verdade do Medusa**
> e nada aqui deve ser lido como "o Medusa tem". Cada item é **CANDIDATO PARA FUTURA
> ANÁLISE**.

| Capacidade no Minha Vida | Como era | Equivalente no Medusa hoje | Classificação |
|---|---|---|---|
| Login com Google + banco real (Supabase com RLS) | contas reais, dados sincronizados entre aparelhos | não existe (tudo em `localStorage`) | CANDIDATO |
| Calendário Google bidirecional (pull paginado, push, webhook, renovação de canal, edição de série pelo evento-mestre) | real, em produção | contrato + mapeador, BLOQUEADO | CANDIDATO |
| Gmail: filtro executivo, leitura de avisos do EAD (Blackboard / polo), lixeira de verdade, classificação por IA | real | pipeline determinístico em contrato, BLOQUEADO | CANDIDATO |
| Finanças via Open Finance (Pluggy / Meu Pluggy) com 3 bancos, fatura por `billForecastDate`, parcelas projetadas, categorização por regex + IA | real | motor de snapshot com fixture | CANDIDATO |
| Hoje com timeline (rotina fixa + agenda real), relógio, briefing matinal por IA, clima (Open-Meteo, UV, qualidade do ar, chuva nos trajetos) | real | Hoje lê a Agenda local; sem clima, sem briefing | CANDIDATO |
| Motor de decisão "próxima melhor ação" em SQL (prazo > bloco do dia > flashcards, cruzando treino de ontem) | real | Priority/Recommendation em contrato | CANDIDATO |
| Web Push com fila, prioridade e janelas de silêncio (pg_cron + VAPID); Guardião do streak; gatilho de foco às 18h com botão | real | Island + Web Notification sem permissão | CANDIDATO |
| Modo Estudo global com Pomodoro, XP com teto e piso, play do Spotify | real | Modo Estudo de fixture, sem XP | CANDIDATO |
| SRS: SM-2 em SQL (`srs_respostas` + trigger), baralho de inglês B1 com Tatoeba e TTS calibrado | real | flashcards de sessão; SM-2 só no domínio Espiritual (contrato) | CANDIDATO |
| Central de Educação: temas de ouro do ENEM, sprint, motor matinal alocando blocos nas brechas, videoaulas do YouTube com cache de cota | real | cronograma ENEM com motor próprio (diferente) | CANDIDATO |
| Treino A/B com carga por dia, base wger traduzida, Personal Trainer por IA com aviso médico | real | bancada de treino de fixture | CANDIDATO |
| Espiritual: Bíblia completa no banco (31.101 versículos), pool curado de 119 passagens, versículo do dia semeado pela data, diário de gratidão | real | 2 passagens fixture | CANDIDATO |
| Guardian com autonomia real (L1/L2/L3, trust, grants, cooldown, ledger de execução, idempotência) + Guardian de saúde do banco em SQL | real (autonomia L3 nunca chegou a disparar sozinha em produção) | fundação em contrato, UI demonstrativa | CANDIDATO |
| Ponte Android (MacroDroid) com HMAC, comandos (DND), eventos e notificações classificadas alimentando o contexto | real | não existe | CANDIDATO |
| Gamificação: XP, níveis, streak, escudo, desafio da semana, Loja, Prêmios, confete com orçamento | real | não existe (Progresso "ainda está por vir") | CANDIDATO |
| Projetos com Kanban multi-contexto + painel do Maestro (Blackout, Pacto de Ulisses) | real | Projetos em contrato | CANDIDATO |
| Command palette (Ctrl+K) que navega, executa ações e marca hábito | real | ⌘K com 4 ações | CANDIDATO |
| Desfazer exclusão adiada (nada apagado enquanto o toast está na tela) e seleção múltipla | real | desfazer na Agenda (há, por toast) e lote na Lista | parcialmente equivalente |
| Hábitos e streak | real | **não existe no Medusa** (nem em contrato com esse nome) | CANDIDATO |
| PWA instalável com service worker | real | não existe | CANDIDATO |

---

## 28. Resumo Executivo

### 28.1 Números (todos tirados desta auditoria)

| Medida | Valor |
|---|---|
| Abas na sidebar | 8 (7 com tela + Progresso pendente) |
| Funções inventariadas (§25) | **150** |
| — EXISTE E FUNCIONA | **46** |
| — SOMENTE COMO FIXTURE/MOCK | **35** |
| — SOMENTE COMO CONTRATO/FUNDAÇÃO | **31** |
| — EXISTE MAS ESTÁ PARCIAL | **20** |
| — NÃO EXISTE | **13** |
| — PREPARADO MAS BLOQUEADO POR INTEGRAÇÃO | **4** |
| — PLANEJADO MAS NÃO IMPLEMENTADO | **1** |
| Jornadas de usuário seguidas (§24) | 27 — **9 funcionam de ponta a ponta** (J1, J2, J3, J8, J18, J22, J23, J24, J25), **4 funcionam parcialmente** (J4 só dentro do app, J5 só com item na Agenda, J7 sem persistir o check-in, J10 sobre conteúdo fixo), **14 não funcionam** |
| Arquivos de UI que usam a fundação | **2** de 99 (`src/components` + `context`/`lib`/`types`/`fixtures`/`app`) |
| Chaves de `localStorage` | 15 |
| Integrações externas reais em uso | **1** (Spotify) |
| Checagens de teste automatizado | **1.135**, 0 falhas |
| Bugs registrados (não corrigidos) | 1 de função (cronograma → semana fixa) + 1 de mensagem falsa (estorno) + inconsistências do §26.7 |

Por domínio (§25): **Agenda** é o mais real (11 de 18 funções funcionam); **Educação**
tem a maior quantidade de interação funcionando (14), mas sobre conteúdo fixo (11 fixture);
**Corpo, Finanças, Espiritual e Guardian** são majoritariamente fixture na tela e contrato
na fundação; **Personal OS** é 100% contrato (13 de 13); **Gmail** não tem UI nesta árvore.

### 28.2 O que o Medusa é hoje, em uma frase honesta

Uma **agenda local completa e um cronograma ENEM real**, envoltos num Shell muito bem
acabado (modos, tema, ilha, painel, som, motion), com **cinco outras áreas que são
demonstrações interativas sobre dados fixos**, e uma **fundação grande e bem testada que
ainda não chega em nenhuma tela**.

### 28.3 Os 5 achados que mais importam

1. **A fundação não está ligada à UI** (§1.5). O maior trabalho já feito (Guardian,
   lembretes v2, prioridade, recomendação, planner, agregador, domínios) é invisível.
2. **Mensagens que afirmam ações que não acontecem** (§26.4) — principalmente o
   "estorno solicitado com sucesso" em Finanças. Contradiz a regra de produto "honesto
   antes de bonito" que o próprio código defende em `RoutePending`.
3. **Dados de exemplo sem rótulo** em Corpo, Finanças, Espiritual, Guardian e no fallback
   do Hoje — o usuário não tem como saber que não são dele.
4. **Bug do cronograma** (§5.4): o fluxo mais "real" da Educação entrega os blocos na
   semana errada.
5. **Nada sai do navegador**: sem conta, sem sync, sem push, sem IA, sem voz. Tudo que é
   real hoje vive num único `localStorage`.

### 28.4 O que está em `main` × o que está em PR

Este inventário descreve a árvore `feat/email-agenda-foundation`. Em `main` (#18) **só
existem** o Shell, a Educação "Human Visual Gate 2" e a Agenda base; as telas de Hoje,
Corpo, Finanças, Guardian e Espiritual descritas aqui, a Agenda Temporal OS, o Personal OS
e o domínio de E-mail estão nas PRs #26, #32, #33 e na branch de design do Anti — **ainda
não revisados nem mergeados**.

---

## 29. O que eu melhoraria e acrescentaria

> Opinião, não inventário. Ordenado pelo que dá mais valor com menos risco. Nada disto foi
> implementado.

### 29.1 Primeiro: tornar honesto o que já existe (pouco código, muito valor)

1. **Tirar a mensagem de "estorno solicitado"** em Finanças, ou trocá-la por "Marcado
   para revisar — nenhuma contestação foi enviada". Mesma coisa para "Sync ativo" e
   "Guardian Ativo" no Hoje.
2. **Selo "Dados de exemplo"** em toda tela alimentada por fixture (Corpo, Finanças,
   Espiritual, Guardian, conteúdo da Educação). O `DataState` já tem o estado certo;
   `isFixtureData` já é devolvido pelo bridge de Finanças — só falta mostrar.
3. **Hoje sem item = "Dia livre"**, não 6 blocos inventados.
4. **Corrigir o cronograma** (passar `new Date()` nos dois chamadores e distribuir os
   horários dentro do dia) — é o fluxo real mais valioso da Educação.
5. **Badges da sidebar calculados** (compromissos de hoje, revisões pendentes) ou
   removidos.
6. **Persistir o que já é estado**: categorias da Agenda, treino, notas de aula, notas de
   versículo, conclusões do Hoje, link do Spotify. Os adapters já existem em
   `foundation/persistence`.

### 29.2 Segundo: ligar a fundação nas telas (o grande salto)

7. **Hoje ligado ao Context Aggregator** (`foundation/context/today.ts`) — Agora/Próximo/
   Atenção/Recomendação passam a vir de regras, não de texto fixo.
8. **Agenda migrando para o Reminder Engine v2** — ganha T-30 para compromissos críticos,
   aviso único entre fontes e follow-up.
9. **Toda ação "L2" passando por `submitThroughGuardian`**, e a aba Guardian lendo o
   Action Center de verdade em vez dos 3 casos fixos. Uma tela de "Ações pendentes de
   aprovação" vira o coração do produto.
10. **Tarefas como entidade de primeira classe** (o contrato já existe): uma lista
    "Tarefas" no Hoje e na Agenda, com dependências e prazos.
11. **Finanças aceitando lançamento manual** (`createTransaction` já existe) — sem banco
    conectado, o usuário já teria números próprios.
12. **Corpo registrando treino** pelo `sessionEngine` + `progressionEngine` — a evolução
    passaria a ser real depois de algumas semanas.
13. **Espiritual com plano de leitura e memorização SM-2** (`readingPlanEngine`,
    `memorySrs`) — e o mesmo SM-2 servindo os flashcards da Educação.

### 29.3 Terceiro: sair do navegador

14. **Conta + banco** (o degrau Supabase do `Repository`) para sincronizar entre celular
    e computador. Sem isso, qualquer dado real continua frágil.
15. **Pedir permissão de notificação** num momento com contexto ("quer ser avisado 15 min
    antes?"), e depois **PWA instalável com push** — lembrete que só aparece com o app
    aberto vale pouco.
16. **Google Calendar** primeiro (o mapeador já está pronto), depois Gmail pelo pipeline
    determinístico que já existe.

### 29.4 Funções novas que fariam sentido

17. **Busca de verdade no ⌘K**: compromissos, aulas, passagens, comandos — o contrato
    `foundation/search` já define o formato.
18. **Captura rápida** ("+ tarefa / + gasto / + nota" de qualquer tela, inclusive pelo ⌘K).
19. **Revisão semanal**: domingo à noite, um resumo do que foi concluído, o que atrasou e
    a semana que vem (usa Agenda + Tarefas + Planner).
20. **Planejamento matinal automático** ("encaixar 30 min de ENEM na primeira brecha
    livre") com o Planner que já respeita rotina, deslocamento e janelas protegidas.
21. **Modo foco com cronômetro** (Pomodoro) ligado ao bloco atual do Hoje, com bloqueio
    de notificações não críticas.
22. **Central de notificações** — histórico do que passou pela ilha, para quem não viu a
    tempo.
23. **Exportar/importar dados** (JSON) — enquanto não há backend, é a única proteção
    contra perder o `localStorage`.
24. **Progresso** com metas por domínio usando `goalModel`/`metricModel` — sem streak
    punitivo, no espírito do domínio Espiritual ("continuidade sem culpa").
25. **Clima nos trajetos e chuva no horário dos compromissos** (Open-Meteo não precisa
    de chave) — foi uma das coisas mais úteis do Minha Vida.
26. **Tutor e voz reais** só depois de decidir custo e privacidade — até lá, rotular como
    "demonstração".
27. **Respeitar "reduzir movimento" também no som**, e um modo "silencioso" por horário.
28. **Testes de interface automatizados no CI** — hoje os 1.135 testes cobrem só a
    fundação; os 25 scripts Puppeteer existem mas não rodam sozinhos.

### 29.5 Ordem sugerida

Semana 1: itens 1–6 (honestidade + persistência local).
Semanas 2–3: itens 7–9 (Hoje, lembretes v2, Guardian real).
Semanas 4–5: itens 10–13 (tarefas, finanças manual, treino, espiritual).
Depois: 14–16 (conta, push, Google), e as funções novas conforme prioridade do Abimael.
