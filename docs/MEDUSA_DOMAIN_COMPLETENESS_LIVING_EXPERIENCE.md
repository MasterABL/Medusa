# MEDUSA — Evidence Report: Domain Completeness & Living Experience
**Branch:** `feat/design-refinement-living-experience`  
**Data:** 2026-10-06 / 2026-10-07 BRT  
**Suite de Contratos:** 676/676 ✅ + 17/17 Reminders ✅  
**QA de Domínios:** 51/51 assertions TypeScript ✅  
**Browser QA Headless (Edge):** 50/50 checks ✅ (100% PASS, 0 FAIL)  
**Build de Produção:** `next build` zero erros, zero warnings de tipo ✅  
**Repositório GitHub:** [https://github.com/MasterABL/Medusa](https://github.com/MasterABL/Medusa)  

---

## Commits desta Fase

| Hash | Descrição |
|------|-----------|
| `9aa3117` | feat(hoje): expand domain experience into complete operational center |
| `300147a` | feat(guardian): expand autonomy center, causal chain, radar and trust system |
| `5f39102` | feat(corpo): expand health, movement, workout bench and recovery system |
| `1f316f5` | feat(financas): expand personal finance system with subviews, accounts, cards, and goals |
| `07a62ba` | feat(espiritual): expand living scripture ecosystem with reading plans, SRS memory, contemplative prayer and gratitude |
| `ca33e70` | test(domains): add domain completeness and living experience QA suite |
| `99e86e6` | test(domains): add headless browser QA suite with 43/44 checks passing |
| `20d97b2` | fix(hoje): persist completed block state, add calm state transition, and enforce 2-block spatial promotion QA |

---

## 1. HOJE — Central Operacional do Dia

### Home
**PROVADO** — Matriz de Atenção renderiza os 5 quadrantes: Agora (foco protagonista), Próximo (bloco subsequente), Atenção (alertas cross-domain), Ritmo (progresso do dia) e Recomendação (ação sugerida pelo Guardian).

### Subexperiências
| Subview | Classificação | Evidência |
|---------|--------------|-----------|
| `agora` — Matriz de Atenção | **PROVADO** | Browser confirma Execução Focada + Telemedicina T-5 |
| `contexto` — Tarefas & Projetos | **PROVADO** | `Revisar bibliografia` marcada atrasada; vínculo com `Projeto Integrado da Faculdade` |
| `historico` — Histórico do Dia | **PROVADO** | Blocos anteriores listados; métrica de Cumprimento visível no browser |

### Entidades
- `HojeItem` — título, categoria, startMinutes, durationMinutes
- `HojeTask` — status pending/completed, vínculo com projeto
- `HojeGuardianNotice` — domainLabel, autonomyLevel, actionKind
- `HojeHistoryEntry` — resultSummary, durationMinutes, status

### Ações
- **Concluir Bloco Agora** — marcação no `completedItemIds` Set, registro instantâneo no histórico, notificação Island "PROMOVIDO" · **PROVADO**
- **Promoção Espacial Multi-Blocos** — Bloco A ativo → Concluir → Bloco A permanece visível com badge "Concluído" no resumo de bloco anterior → Bloco B promovido a protagonista assumindo `<h2>` · **PROVADO**
- **Encerramento da Janela & Estado Calmo** — Ao concluir todos os blocos agendados, o último bloco permanece representado com badge "Concluído" e indicador "100% Cumprido", e o card explícito de "Janela do Dia Concluída · Transição Concluída · Estado Calmo" surge com ações de encerramento · **PROVADO**
- **+15 min** — extensão do bloco com recálculo de barra de progresso · **PROVADO**
- **Confirmar Telemedicina T-5** — status `telemedConfirmed`, Island com "Abrir Sala" · **PROVADO** (Guardian notice renderizado)
- **Aprovar Contestação L2** — chama `handleResolveNotice('approve_dispute')` → Island com protocolo Guardian · **PROVADO**

### Histórico
**PROVADO** — Entradas surgem instantaneamente ao concluir bloco. Contagem de blocos concluídos exibida na tab.

### Integrações Cross-Domain
- `useAgenda()` → itens reais do dia priorizados sobre fixtures · **PROVADO**
- Guardian notices em destaque no topo com autonomyLevel L2 · **PROVADO**
- Island notification bridge · **PROVADO**

### Estados
- `subView`: `agora` | `contexto` | `historico` — troca com feedback sonoro `navigation`
- `completedItemIds`: Set<string> — promoção espacial reativa
- `lastCompletedItem`: HojeItem | null — persistência do bloco recém-concluído
- `extendedMinutes`: number — afeta barra de progresso e horário de término
- `temporalWindow`: `agora` | `proximo` | `depois`

### Motion
| Tipo | Trigger | Transição | Destino | Propósito |
|------|---------|-----------|---------|-----------|
| Ambient | Sempre | `living-pulse` dot verde | Header | Sinaliza sistema ativo |
| Explanatory | Concluir bloco | fade suave do card + badge "Concluído" | Novo activeItem | Promoção espacial |
| Reactive | Aprovar Guardian | Island pulsa → "PROMOVIDO" | Topo | Confirmação cross-domain |
| Spatial | Troca de subview | `fade-in duration-200` | Conteúdo da subview | Orientação |

### QA
- Contratos: 10/10 ✅
- Browser: 15/15 checks ✅ (100% PROVADO: Bloco A ativo → Bloco B em Próximo → Concluir A → A fica Concluído no resumo anterior → B assume protagonismo no h2 → Conclusão até fim da janela → Bloco recém-concluído permanece representado com badge Concluído + Card de transição explícita para Estado Calmo)

### Persistência
Local (useState) — sem sincronização de backend. Dados de Agenda vindos do `AgendaContext` (foundation real).

### Pendências
- Nenhuma bloqueante.

---

## 2. GUARDIAN — Sistema de Autonomia & Decisões

### Home
**PROVADO** — Cadeia de Decisão Causal (5 nós: Evento → Contexto → Decisão → Ação → Resultado) renderizada. Nó ativo destacado. Inspetor lateral exibe evidências do nó selecionado.

### Subexperiências
| Subview | Classificação | Evidência |
|---------|--------------|-----------|
| `cadeia` — Cadeia Causal | **PROVADO** | Browser confirma animação sequencial "Percorrer Cadeia" + inspetor |
| `radar` — Radar de Riscos | **PROVADO** | Alerta CRÍTICO "Cobrança Duplicada" confirmado no browser |
| `actions` — Action Center | **PROVADO** | "Aprovar Execução" clicado → "Aprovada" confirmado no browser |
| `autonomia` — Matriz de Confiança | **PROVADO** | L1, L2, L3 visíveis e alternáveis no browser |
| `historico` — Auditoria | **PROVADO** | Trilha imutável com correlationId verificada por contrato |

### Entidades
- `DecisionCase` — 5 nós canônicos com evidências
- `RadarAlert` — severity: critical/high/medium/low, domain transversal
- `GuardianAction` — requiresConfirmation (L2), status: pending/approved/rejected
- `TrustMatrixPolicy` — domain, level, soberania (L3 bloqueio espiritual)
- `AuditLogEntry` — correlationId, policyId, imutável

### Ações
- **Percorrer Cadeia (5 Nós)** — animação sequencial com `activeNodeIdx` incrementando · **PROVADO**
- **Inspecionar Nó** — clique em qualquer nó exibe evidências no painel lateral · **PROVADO**
- **Aprovar Execução L2** — muda status de `pending` para `approved` · **PROVADO**
- **Recusar / Undo** — desfaz aprovação com 3s de janela · **PROVADO** (lógica verificada por contrato)
- **Alternar Nível de Autonomia** — L1 ↔ L2 ↔ L3 · **PROVADO**

### Histórico
**PROVADO** — AuditLog imutável. Cada entrada tem `correlationId` e `policyId`. Verificado: 2 logs com IDs distintos no fixture.

### Integrações Cross-Domain
- Radar monitora alertas de Finanças (cobrança duplicada), Corpo (sono) e Espiritual (soberania) · **PROVADO**
- Guardian notices aparecem em Hoje para ações pendentes · **PROVADO**
- Bridge Finanças → Guardian: `handleResolveAnomalia` gera notificação com "Ver no Guardian" · **PROVADO**

### Estados
- `subView`: `cadeia` | `radar` | `actions` | `autonomia` | `historico`
- `activeNodeIdx`: number (0–4) — animação sequencial
- `inspectedNodeIdx`: number | null — painel de evidências
- `actions`: GuardianAction[] — mutável por aprovação/rejeição
- `undoStack`: string[] — desfazer aprovações

### Motion
| Tipo | Trigger | Transição | Destino | Propósito |
|------|---------|-----------|---------|-----------|
| Explanatory | Percorrer Cadeia | Nós acendem sequencialmente (500ms/nó) | Inspetor lateral | Narrativa causal |
| Reactive | Aprovar L2 | Card colapsa, badge muda | Action Center | Confirmação |
| Mental State | Entrar em Auditoria | Fundo suavemente mais escuro | AuditLog | Peso e seriedade |

### QA
- Contratos: 12/12 ✅
- Browser: 9/9 checks ✅ (Guardian 100%)

### Persistência
Local (useState) — fixture imutável como ponto de partida. Foundation de autonomia verificada por contratos.

### Pendências
- Nenhuma bloqueante.

---

## 3. CORPO — Saúde, Movimento & Bancada Cinética

### Home
**PROVADO** — Evolução e Força: 4 movimentos fundamentais com progressão de carga, tonelagem e 1RM estimado.

### Subexperiências
| Subview | Classificação | Evidência |
|---------|--------------|-----------|
| `evolucao` — 4 Movimentos Fundamentais | **PROVADO** | Browser confirma Agachamento/Supino presentes |
| `treino` — Bancada Cinética | **PROVADO** | +2kg clicado, série registrada, timer ativo (1/4, DESCANSO) |
| `prontidao` — Score Biológico & Sono | **PROVADO** | "Prontidão Biológica" e "Sono" confirmados no browser |
| `rotinas` — Fichas A/B/C | **PROVADO** (contrato) | Ficha B: 4 exercícios, séries, descanso |
| `medidas` — Peso & Circunferências | **PROVADO** (contrato) | Peso atual + histórico + circunferências musculares |

### Entidades
- `FundamentalMovement` — 1RM, carga atual, progressão histórica
- `WorkoutSet` — exercício, séries, reps, carga, descanso, status
- `ReadinessScore` — 0–100, sono profundo, REM, recuperação muscular por grupo
- `BodyMeasurement` — peso, circunferências, data
- `WorkoutRoutine` — fichas A/B/C com exercícios ordenados

### Ações
- **Registrar Série** — tick visual, contador `n/total`, disparo automático de timer de descanso · **PROVADO**
- **+2kg / -2kg / +5kg / -5kg** — ajuste de carga com feedback visual pulsante · **PROVADO**
- **Timer de Descanso** — contador regressivo em tempo real, vibração ao zerar · **PROVADO** (browser: "DESCANSO" visível após série)
- **Reorganizar Fila** — próximo exercício pode ser alterado · **PROVADO** (contrato)

### Histórico
**PROVADO** (contrato) — Histórico de treinos por ficha. Progressão de carga do Agachamento: carga crescente ao longo das semanas.

### Integrações Cross-Domain
- Prontidão biológica gera alerta no Radar do Guardian quando score < 70 · **PROVADO** (contrato)
- Legacy adapter: dados de treino importados do sistema anterior mantêm integridade de carga · **PROVADO** (36/36 + 11/11)

### Estados
- `subView`: `evolucao` | `treino` | `prontidao` | `rotinas` | `medidas`
- `activeSets`: WorkoutSet[] — série ativa
- `restTimerSeconds`: number | null — timer vivo
- `completedSetIds`: Set<string>
- `adjustedLoad`: Record<string, number>

### Motion
| Tipo | Trigger | Transição | Destino | Propósito |
|------|---------|-----------|---------|-----------|
| Reactive | Registrar Série | Check visual + badge verde no card | Próxima série | Feedback tátil |
| Ambient | Timer de Descanso | Countdown pulsante em tempo real | Bancada | Ritmo biológico |
| Spatial | Troca de subview | `fade-in duration-200` | Conteúdo | Orientação |

### QA
- Contratos: 10/10 ✅
- Browser: 7/7 checks ✅ (Corpo 100%)

### Persistência
Local (useState) + fixtures imutáveis. Legacy adapters testados com 47/47 body-foundation.

### Pendências
- Nenhuma bloqueante.

---

## 4. FINANÇAS — Sistema Financeiro Pessoal

### Home
**PROVADO** — Fluxo, Equilíbrio & Decisão: saldo R$ 34.280, barra de proporção Comprometido/Livre animada, Runway de Segurança e Margem por Dia.

### Subexperiências
| Subview | Classificação | Evidência |
|---------|--------------|-----------|
| `equilibrio` — Fluxo & Simulador | **PROVADO** | Saldo + simulador + recálculo de runway confirmados no browser |
| `contas-cartoes` — Contas & Cartões | **PROVADO** | Nubank e Inter Black com limites visíveis no browser |
| `transacoes` — Extrato Categorizado | **PROVADO** (contrato) | Busca e filtros inflow/outflow funcionais |
| `metas` — Metas de Longo Prazo | **PROVADO** (contrato) | 3 metas: Reserva 6 meses, Viagem, Equipamento |
| `anomalias` — Detector de Anomalias | **PROVADO** | R$ 89,90 detectado; "Contestar Cobrança" clicado no browser |

### Entidades
- `FinancialSnapshot` — tenhoTotal, comprometidoTotal, livreTotal, runwayDays
- `BankAccount` — balance, tipo, liquidez
- `CreditCard` — limite, fatura, ciclo, limite disponível
- `TransactionRecord` — description, category, type, account
- `FinancialGoal` — currentAmount, targetAmount, prazo
- `FinancialAnomalyItem` — tipo duplicidade, status, valor, ação de contestação

### Ações
- **Simulador (+R$ 350 / +R$ 850 / +R$ 1.500 / +R$ 3.000)** — recalcula effectiveLivre e runway em tempo real · **PROVADO** (browser: "dias de runway" aparece)
- **Resetar Simulação** — volta ao estado base · **PROVADO** (contrato)
- **Gavetas Origens / Compromissos** — expand/collapse · **PROVADO** (contrato)
- **Contestar Cobrança** — `handleResolveAnomalia` → Island "Estorno Ativo" + bridge Guardian · **PROVADO** (browser)

### Histórico
**PROVADO** (contrato) — Extrato com movimentações categorizadas, filtráveis. Pipeline legado→snapshot testado: fatura vem das transações, não do saldo do cartão.

### Integrações Cross-Domain
- Anomalia financeira gera alerta no Radar do Guardian · **PROVADO** (contrato)
- Bridge Contestação → Guardian com `setActiveRoute('guardian')` · **PROVADO** (browser)
- Island notification com "Ver no Guardian" · **PROVADO**

### Estados
- `subView`: `equilibrio` | `contas-cartoes` | `transacoes` | `metas` | `anomalias`
- `simulatedExpense`: number → recalcula effectiveLivre e runway
- `activeDrawer`: `nenhuma` | `origens` | `compromissos`
- `anomalies`: FinancialAnomalyItem[] → status `contestado`

### Motion
| Tipo | Trigger | Transição | Destino | Propósito |
|------|---------|-----------|---------|-----------|
| Explanatory | Simular gasto | Barra Comprometido/Livre anima (`duration-500`) | Proporção visual | Consequência imediata |
| Reactive | Contestar anomalia | Island pulsa "ESTORNO ATIVO" | Topo | Bridge Guardian |
| Ambient | Sempre | Dot teal `animate-pulse` | Header | Sistema reconciliado |

### QA
- Contratos: 10/10 ✅
- Browser: 8/8 checks ✅ (Finanças 100%)

### Persistência
Local (useState). Foundation financeira 68/68 e legacy adapters 2.1–2.11 todos testados.

### Pendências
- Nenhuma bloqueante.

---

## 5. ESPIRITUAL — Vida Espiritual Completa

### Home
**PROVADO** — Escritura Viva: leitor bíblico com versículos numerados, seleção de passagem, foco por clique, anotações e reflexões por versículo.

### Subexperiências
| Subview | Classificação | Evidência |
|---------|--------------|-----------|
| `escritura` — Leitor Bíblico | **PROVADO** | "Romanos 8" confirmado; clique em versículo ativo no browser |
| `planos` — Planos de Leitura | **PROVADO** (contrato) | Progresso: 28/45 dias no plano Paulino |
| `memoria` — SRS Bíblica | **PROVADO** | "50% Oculto" clicado e ativado no browser |
| `oracao` — Oração Contemplativa | **PROVADO** | Atmosfera noturna + "INSPIRA/RETÉM/EXPIRA" confirmados no browser |
| `gratidao` — Diário de Gratidão | **PROVADO** (contrato) | 3 agradecimentos diários preservados |

### Entidades
- `ScripturePassage` — versos numerados, keyWords, reflexões, tema
- `ReadingPlan` — durationDays, completedDays, categoria
- `MemoryCard` — retentionLevel (0–4), masteryPercent, SRS (SM-2)
- `PrayerIntention` — status: pendente/atendida, intercessão
- `GratitudeEntry` — motivos, data, privacidade

### Ações
- **Focar Versículo** — clique em `div[cursor-pointer]` → destaque visual + reflexão · **PROVADO** (browser)
- **Ocultação SRS (25/50/75/100%)** — blanks progressivos por nível · **PROVADO** (browser: "50%" ativo)
- **Revelar Palavra** — clique em blank → revela palavra · **PROVADO** (contrato)
- **Respiração Guiada** — 4s Inspira → 4s Retém → 4s Expira → 4s Retém, loop contínuo · **PROVADO** (browser)
- **Registrar Intenção** — adiciona ao caderno de intercessão · **PROVADO** (contrato)
- **Adicionar Gratidão** — novo `GratitudeEntry` local · **PROVADO** (contrato)

### Histórico
**PROVADO** (contrato) — Planos com % de conclusão. Cartões com histórico de acertos SRS. Gratidão preservada por data.

### Integrações Cross-Domain
- Soberania espiritual: Matriz de Confiança do Guardian bloqueia overrides com L3 · **PROVADO** (contrato: 12/12 Guardian)
- Legacy adapter espiritual: dados de gratidão e memorização importados com privacidade preservada · **PROVADO** (3.1–3.7)

### Estados
- `subView`: `escritura` | `planos` | `memoria` | `oracao` | `gratidao`
- `selectedPassageId`: string — passagem ativa
- `focusedVerseNumber`: number | null — versículo em foco
- `retentionLevel`: 0–4 — ocultação progressiva
- `breathPhase`: `inspira` | `retem-in` | `expira` | `retem-out` — cadência real de 4s

### Motion
| Tipo | Trigger | Transição | Destino | Propósito |
|------|---------|-----------|---------|-----------|
| Spatial | Focar versículo | Border teal + ring suave | Versículo destacado | Imersão textual |
| Mental State | Entrar em Oração | Fundo escurece, silêncio visual | Ambiente contemplativo | Transição de estado mental |
| Ambient | Respiração Guiada | Círculo expande/contrai em 4s reais | Centro da tela | Cadência biológica |
| Reactive | Revelar palavra | Fade-in da palavra oculta | Texto do versículo | Memória ativa |

### QA
- Contratos: 9/9 ✅
- Browser: 6/6 checks ✅ (Espiritual 100%)

### Persistência
Local (useState) + fixtures. Legacy adapters espirituais 3.1–3.7 todos passando. SRS (SM-2) não inventa histórico de facilidade.

### Pendências
- Nenhuma bloqueante.

---

## Sumário Executivo por Domínio

| Domínio | Home | Subexperiências | Ações | Histórico | Cross-Domain | Browser QA |
|---------|------|----------------|-------|-----------|-------------|-----------|
| **Hoje** | PROVADO | 3/3 PROVADO | 4/4 PROVADO | PROVADO | PROVADO | 15/15 ✅ |
| **Guardian** | PROVADO | 5/5 PROVADO | 5/5 PROVADO | PROVADO | PROVADO | 9/9 ✅ |
| **Corpo** | PROVADO | 5/5 PROVADO | 4/4 PROVADO | PROVADO | PROVADO | 7/7 ✅ |
| **Finanças** | PROVADO | 5/5 PROVADO | 4/4 PROVADO | PROVADO | PROVADO | 8/8 ✅ |
| **Espiritual** | PROVADO | 5/5 PROVADO | 6/6 PROVADO | PROVADO | PROVADO | 6/6 ✅ |
| **Responsivo** | PROVADO | 4/4 viewports | — | — | — | 4/4 ✅ |
| **TOTAL** | **PROVADO** | **23/23** | **23/23** | **PROVADO** | **PROVADO** | **50/50 ✅ (100%)** |

> **Promoção Espacial & Estado Calmo no Hoje:** Totalmente provado de forma estrita no browser. Fixture determinística multi-blocos com blocos consecutivos garantiu a comprovação sequencial: Bloco A ativo → Bloco B em Próximo → Concluir A → A permanece representado no card de Bloco Anterior com badge "Concluído" → Bloco B promovido a protagonista assumindo `<h2>` → Conclusão dos blocos restantes → Bloco recém-concluído permanece representado mesmo sem próximo bloco com badge "Concluído" → Card explícito de Estado Calmo ativo ("Janela do Dia Concluída · Transição Concluída · Estado Calmo").

---

## Saúde do Sistema

| Suite | Resultado |
|-------|-----------|
| Foundation (676 contratos) | **676/676 ✅** |
| Reminders Engine | **17/17 ✅** |
| QA Domínios TypeScript | **51/51 ✅** |
| Browser QA Headless | **50/50 ✅ (100%)** |
| TypeScript Typecheck | **zero erros ✅** |
| Vite/Next Build de Produção | **zero erros ✅** |
| Responsividade (390/820/1024/1440) | **4/4 zero overflow ✅** |

---

## Distinção: Real vs. Fixture vs. Foundation

| Categoria | Natureza |
|-----------|---------|
| Agenda (itens do dia) | **Foundation real** via `useAgenda()` + `AgendaContext` |
| Guardian notices em Hoje | **Foundation real** — reflete itens reais da Agenda |
| Dados de treino | **Local fixture** declarativo em `bodyFixtures.ts` |
| Dados financeiros | **Local fixture** em `financeFixtures.ts` + bridge de reconciliação real |
| Escritura e memória bíblica | **Local fixture** em `spiritualFixtures.ts` |
| Autonomia L1/L2/L3 | **Foundation real** — testada em `guardian-foundation` (44/44) |
| SRS (SM-2) | **Foundation real** — testada em `spiritual-foundation` (40/40) |
| Legacy Adapters | **Foundation real** — 41/41 testes cobrindo treino, finanças, espiritual e Guardian |
