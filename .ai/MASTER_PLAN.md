# MASTER_PLAN.md — Visão de Ponta a Ponta do Medusa

Este documento ordena o desenvolvimento do Medusa na sequência arquitetural correta: nenhuma fase
depende de uma fase posterior. Não inventa funcionalidade — onde a especificação existente não é
suficiente para virar tarefa executável, isso é marcado `HUMAN DECISION REQUIRED` em vez de
preenchido com suposição.

## Ordem das fases

### 1. Foundation
**Status real**: PARCIAL. Shell V2 base está em `main`. A correção de hardening (Context Panel +
tema Claro) existe como PR #1 aberto, não mesclado. Ver `CURRENT_STATE.md`.
**Depende de**: nada.
**Bloqueia**: todas as fases seguintes que renderizam UI dentro do Shell.

### 2. Shell
**Status real**: PROVADO (baseline) em `main` — Sidebar, Header, Dynamic Island, Mobile Island,
Context Panel, Command Modal, 3 temas, 3 modos, motion, reduced motion.
**Depende de**: Foundation.
**Observação**: "Shell" e "Foundation" se sobrepõem propositalmente aqui porque o Shell É a
Foundation visual do produto — a separação nas duas linhas reflete que a fase 1 é sobre a base de
tokens/geometria e a fase 2 é sobre os componentes de chrome que consomem essa base.

### 3. Hoje
**Status real**: NÃO IMPLEMENTADO. Nenhum arquivo no repositório.
**Depende de**: Shell (para renderizar), e de pelo menos um domínio de dados real para agregar
(Agenda é o primeiro candidato natural, conforme `PRODUCT_CONTRACT.md`).
**HUMAN DECISION REQUIRED (HDR-006)**: contrato exato de que dados a Agenda expõe para Hoje
consumir, e se Hoje pode nascer antes ou só depois da Agenda ter dados reais para agregar.

### 4. Agenda
**Status real**: DESIGN auditado, FIGMA encerrado, IMPLEMENTATION não iniciada. Ver
`CURRENT_STATE.md` e `TASK_QUEUE.md` → `TASK-AGENDA-001`.
**Depende de**: Shell + Foundation (ShellGeometry/Context Panel corrigidos — ver HDR-001).
**Primeira tarefa real**: `TASK-AGENDA-001`.

### 5. Educação
**Status real**: PROVADO (baseline), congelado. Nenhuma nova funcionalidade nesta fase do
protocolo — este bootstrap não altera Educação.
**Depende de**: Shell.
**Trabalho futuro** (fora do escopo deste bootstrap): integração de eventos de Educação → Agenda
via campo `origin` (contrato já existe em `PRODUCT_CONTRACT.md`, implementação real ainda não).

### 6. Corpo
**Status real**: NÃO IMPLEMENTADO. **HUMAN DECISION REQUIRED**: não existe especificação de
produto além da responsabilidade geral ("treinos/saúde") em `PRODUCT_CONTRACT.md`. Precisa de uma
rodada de definição de contrato + UX antes de virar tarefa.

### 7. Finanças
**Status real**: NÃO IMPLEMENTADO. **HUMAN DECISION REQUIRED**: mesma situação de Corpo —
responsabilidade geral definida ("obrigações/transações"), sem especificação executável.

### 8. Progresso
**Status real**: NÃO IMPLEMENTADO. **HUMAN DECISION REQUIRED**: nem a responsabilidade geral deste
domínio está detalhada além do nome — precisa de definição de escopo antes mesmo do contrato.

### 9. Guardian
**Status real**: NÃO IMPLEMENTADO. **HUMAN DECISION REQUIRED**: responsabilidade geral definida
("monitoramento/incidentes" do próprio sistema) em `PRODUCT_CONTRACT.md`, mas sem especificação de
que eventos monitora, para quem, e onde aparece na UI.

### 10. Buscar
**Status real**: NÃO IMPLEMENTADO. **HUMAN DECISION REQUIRED**: responsabilidade geral definida
("descoberta"), sem especificação de escopo de busca (só Agenda? todos os domínios? busca de texto
livre via Command Modal já existente é o ponto de entrada natural, mas isso não foi decidido
formalmente).

### 11. Integrações Transversais
**Status real**: NÃO IMPLEMENTADO. Inclui: Agenda↔Hoje, Agenda↔Educação (origem), Buscar↔todos os
domínios, Guardian↔todos os domínios. **HUMAN DECISION REQUIRED** para cada par não coberto ainda
em `PRODUCT_CONTRACT.md`.

### 12. Persistência
**Status real**: NÃO IMPLEMENTADO. Hoje tudo é `localStorage`/memória de sessão.
**HUMAN DECISION REQUIRED (HDR-004)**: escolha de backend (Supabase é mencionado no protocolo
solicitado, mas nenhuma dependência ou configuração existe no repositório hoje — não presumir que
já foi escolhido), modelo de dados real, estratégia de migração de Local State → persistido.

### 13. QA Final
**Status real**: NÃO IMPLEMENTADO como processo formal. Depende de cada domínio ter sua própria
evidência de QA (ver `QA_GATE.md`) antes de existir um "QA final" agregado.

### 14. Production Gate
**Status real**: NÃO IMPLEMENTADO. **HUMAN DECISION REQUIRED**: critérios objetivos de "pronto para
produção" (métricas, checklist, quem aprova) ainda não foram definidos além dos gates de QA por
tarefa já descritos em `QA_GATE.md`.

## Regra de avanço

Uma fase só é considerada iniciável quando todas as fases das quais ela depende estão, no mínimo,
`PARCIAL` com os blocos que a fase seguinte precisa já resolvidos — nunca por calendário ou
pressão de escopo. Ver `ROADMAP.md` para o detalhamento fase-a-fase com os gates
`CONTRACT → PLAN → IMPLEMENTATION → TEST → BUILD → BROWSER QA → REGRESSION → EVIDENCE → GATE`.
