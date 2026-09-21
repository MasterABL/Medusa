# AGENT_RULES.md — Regras Obrigatórias de Operação

Este documento é normativo. Qualquer agente (Claude, Antigravity, ou humano operando neste
protocolo) deve segui-lo. Em caso de conflito entre uma instrução de tarefa e este documento,
este documento prevalece — a exceção precisa ser justificada explicitamente em `DECISIONS.md`.

## 1. Git

- **Nunca editar `main` diretamente.** Toda alteração nasce em uma branch nova (`feature/*`,
  `fix/*`, `chore/*`) e chega a `main` via Pull Request revisado.
- **Uma branch por tarefa/fase.** Não acumular múltiplas tarefas não relacionadas na mesma branch.
- **Preservar a base.** Nunca `git reset --hard`, `git push --force` ou `git clean -fd` sem
  autorização humana explícita e específica para aquele comando.
- **Não sobrescrever trabalho alheio.** Antes de criar uma branch, verificar `git fetch origin` e
  branches/PRs abertos relacionados à mesma área. Se já existir uma branch/PR cobrindo o mesmo
  escopo, não duplicar — continuar aquele trabalho ou escalar para decisão humana.
- **Não fazer merge silencioso.** Merges para `main` acontecem via PR, nunca via `git merge` local
  seguido de push direto.
- **Verificar topologia real antes de assumir a base de uma PR.** O campo "base" que o GitHub
  mostra numa PR nem sempre reflete de onde a branch realmente parte — confirmar com
  `git merge-base --is-ancestor <branch-A> <branch-B>` antes de tratar duas PRs como independentes.
  Uma PR construída em cima de outra PR não mesclada **não pode ser mesclada isoladamente** (achado
  real: PR #2 deste repositório continha os commits de PR #1 apesar de ambas declararem `base:
  main` — ver `DECISIONS.md` → D-008).

## 2. Produto

- **Não inventar funcionalidade.** Toda funcionalidade implementada precisa estar coberta por
  `PRODUCT_CONTRACT.md`, `MASTER_PLAN.md` ou uma tarefa aprovada em `TASK_QUEUE.md`.
- **Não ampliar escopo sem decisão.** Se durante a implementação surgir a tentação de "já que estou
  aqui, vou adicionar X", isso para e vira uma entrada em `DECISIONS.md` marcada
  `HUMAN DECISION REQUIRED`, não uma linha de código.
- **Respeitar o Product Contract.** Nenhum domínio absorve silenciosamente a responsabilidade de
  outro (ver `PRODUCT_CONTRACT.md`, seção "Regra de Não-Sobreposição").

## 3. Código

- **Reutilizar arquitetura existente.** Antes de criar um novo padrão, verificar se `ShellGeometry`,
  os tokens de `globals.css`, os padrões de `ShellContext` ou os componentes de `src/components/shell`
  já resolvem o problema.
- **Evitar duplicação.** Se uma tarefa precisa de lógica que já existe em outro domínio (ex.: cálculo
  de layout, paginação, filtros), extrair/reutilizar, não reimplementar.
- **Não introduzir magic numbers.** Valores de layout, cor, duração e easing vêm de tokens nomeados
  (`SHELL_DIMENSIONS`, variáveis CSS em `globals.css`, `tailwind.config.ts`). Um número solto
  repetido em 2+ lugares é um bug de arquitetura, não um detalhe.
- **Preservar frozen areas.** Ver `ARCHITECTURE.md` → "Áreas Congeladas". Nenhum arquivo listado ali
  é tocado sem uma decisão humana explícita e registrada em `DECISIONS.md`.

## 4. QA

- **Build não equivale a QA.** `npm run build` e `npx tsc --noEmit` passando é condição necessária,
  nunca suficiente, para `PROVADO`.
- **Browser QA obrigatório quando há UI.** Toda tarefa que toca `src/app` ou `src/components` precisa
  de evidência de execução real em navegador (screenshot e/ou asserção programática), não apenas
  leitura de código.
- **Responsive obrigatório quando aplicável.** Qualquer componente de Shell ou de domínio visível ao
  usuário precisa de evidência em pelo menos: mobile (390px), tablet (820px), desktop (1024px),
  desktop amplo (1440px) — os mesmos quatro breakpoints já usados nas auditorias anteriores do
  projeto.
- **Regressão obrigatória.** Toda tarefa que toca Shell, ShellContext ou tokens globais precisa
  reconfirmar Educação/Study Mode intacta (área congelada) antes de ser considerada `PROVADO`.

## 5. Honestidade

- **Nunca declarar `PROVADO` sem evidência.** Evidência = link/arquivo de screenshot, saída de
  comando real, ou trecho de código citado com caminho e linha. "Deveria funcionar" não é evidência.
- **Nunca representar mock/local state como persistência real.** Se os dados vivem em `useState`/
  memória do navegador, isso é dito explicitamente (`LOCAL STATE`), nunca implicitamente tratado
  como `REAL`/persistido.
- Ao reportar resultado de uma tarefa, distinguir sempre: o que foi **verificado nesta sessão** do
  que foi **alegado por um agente anterior** (ex.: números de teste citados na descrição de um PR
  não são evidência até serem reproduzidos).

## 6. Escopo

Não implementar, sem decisão humana explícita registrada em `DECISIONS.md`:

- Sincronização com Google Calendar, Outlook, iCloud;
- IA de agendamento automático ou resolução automática de conflitos;
- Suporte multiusuário / calendários compartilhados / convites / salas;
- Qualquer integração externa não contratada em `PRODUCT_CONTRACT.md` ou `MASTER_PLAN.md`.

## 7. Executor e Fallback

Nenhuma tarefa fica parada esperando um executor específico ficar disponível. A cadeia de
execução é, nesta ordem:

```
PRIMARY EXECUTOR:  Antigravity (agy)
FALLBACK EXECUTOR: Claude Code (execução direta)
FINAL STATE:       BLOQUEADO (só para bloqueios reais — ver abaixo)
```

Regras:

- **Antigravity é preferencial, não obrigatório.** Quando `scripts/agent-orchestrator.cjs`
  confirma que `agy` está disponível e autenticado, tarefas grandes de implementação são
  delegadas a ele via `HANDOFF.md`.
- **Tarefas pequenas podem ser sempre executadas diretamente por Claude, mesmo com Antigravity
  disponível**, quando isso for mais eficiente do que preparar um handoff completo para uma
  mudança pontual, local e de baixo risco (ex.: corrigir um texto, ajustar um valor, um componente
  novo isolado). A preferência por Antigravity nunca deve virar burocracia desnecessária para
  tarefas triviais.
- **Tarefas grandes preferem Antigravity quando disponível**, mas isso não é um requisito duro:
  se Antigravity está indisponível (ver `BLOCKERS.md` → BLOCK-001), **Claude assume a
  implementação diretamente**, seguindo exatamente o mesmo contrato de `HANDOFF.md`/
  `ACTIVE_TASK.md` que seria enviado ao Antigravity — a especificação não muda por causa de quem
  executa.
- **Nunca bloquear o roadmap só porque o executor preferencial está indisponível.** A
  indisponibilidade de `agy` (documentada em `BLOCKERS.md`) não é, por si só, motivo para marcar
  uma tarefa como `BLOQUEADO` — é motivo para acionar o fallback (Claude direto).
- **`BLOQUEADO` é reservado para bloqueios reais**: decisão humana pendente (`HUMAN DECISION
  REQUIRED` em `DECISIONS.md`), ambiguidade de contrato de produto, ou impossibilidade técnica
  verificada (ex.: gate de QA que não pode ser executado neste ambiente). Nunca é usado apenas
  como sinônimo de "o executor favorito não respondeu".
- **Decisões de produto/arquitetura nunca são inventadas pelo agente que está executando**,
  seja ele Antigravity ou Claude. Se a execução de uma tarefa exigir uma decisão não coberta por
  `PRODUCT_CONTRACT.md`/`MASTER_PLAN.md`/`ACTIVE_TASK.md`, a execução para e a decisão vira uma
  entrada em `DECISIONS.md` — isso vale exatamente da mesma forma para os dois executores.
- **Claude auditando sua própria execução direta**: quando Claude é quem implementa (fallback),
  ele não se audita menos rigorosamente do que auditaria o Antigravity. Os mesmos gates de
  `QA_GATE.md` (Test/Build/Browser QA/Regression/Evidence) se aplicam integralmente antes de
  qualquer alegação de `PROVADO`.
- **Permissões do Antigravity, quando disponível**: restritas aos comandos necessários ao Medusa —
  `git` (branch/commit/status/diff, nunca push --force/reset --hard sem autorização), `npm run
  typecheck`, `npm run build`, `npm run lint`, `npm run test` (quando existir), e os scripts de QA
  em `scripts/*.js`. **Nunca configurar `--dangerously-skip-permissions` como padrão permanente** —
  preferir permissões específicas por comando.
- **Nota de arquitetura de ambiente**: `agy` instalado numa máquina (ex.: Windows do usuário) só é
  utilizável por uma sessão do Claude Code que rode **naquela mesma máquina** (localmente, ou via
  WSL apontando para o mesmo PATH). Uma sessão de Claude Code em ambiente remoto/nuvem (como esta)
  roda num container isolado sem acesso ao sistema de arquivos ou PATH da máquina do usuário —
  `agy` instalado lá **não é alcançável daqui**, mesmo que `agy --version` funcione perfeitamente
  quando o próprio usuário o testa localmente. Isso não é uma falha de configuração corrigível
  remotamente — é uma fronteira de isolamento do ambiente. Ver `BLOCKERS.md` → BLOCK-001.

## 8. Checkpoints Obrigatórios (retomabilidade)

Toda tarefa longa precisa poder ser retomada mesmo se a sessão do Claude terminar, o limite de uso
for atingido, houver perda de contexto, ou o processo for interrompido por qualquer motivo. Isso é
alcançado através do Git como memória persistente, nunca da memória de conversa.

**Antes de encerrar qualquer tarefa ou sessão que tenha alterado o estado do protocolo**, os
seguintes arquivos devem refletir o estado real e atual:

- `CURRENT_STATE.md` — bloco "CHECKPOINT ATUAL" no topo, sempre atualizado.
- `ACTIVE_TASK.md` — a tarefa em `IN_PROGRESS` (se houver) com seu próprio checkpoint.
- `HANDOFF.md` — o handoff correspondente, se uma delegação estiver em andamento.
- `TASK_QUEUE.md` — status operacional da tarefa atualizado (`PENDING/READY/IN_PROGRESS/BLOCKED/
  PROVADO/PARTIAL`).
- `EVIDENCE.md` — toda evidência já produzida até o ponto de interrupção, mesmo parcial.

**Formato obrigatório de um bloco de checkpoint** (usado em qualquer um dos arquivos acima quando
descrevem uma tarefa em andamento):

```
STATUS:        <PENDING|READY|IN_PROGRESS|BLOCKED|PROVADO|PARTIAL>
FASE ATUAL:    <em qual etapa do fluxo de orquestração isto está — ver seção 9>
CONCLUÍDO:     <lista objetiva do que já foi feito e verificado>
RESTANTE:      <lista objetiva do que ainda falta>
ÚLTIMO TESTE:  <comando exato + resultado do último teste real executado, ou "nenhum ainda">
FALHAS:        <qualquer falha real encontrada e seu estado atual — corrigida/pendente>
PRÓXIMO PASSO: <a próxima ação concreta e específica, não "continuar o trabalho">
BLOCKERS:      <referência a BLOCKERS.md, ou "nenhum">
```

Qualquer sessão futura (Claude ou humano) deve conseguir ler apenas esses 5 arquivos e retomar o
trabalho exatamente de onde parou, sem depender de memória de conversa anterior.

## 9. Fluxo Oficial de Orquestração

Toda tarefa percorre este fluxo, nesta ordem, sem pular etapas:

```
TASK_QUEUE
  ↓
ACTIVE_TASK           (promoção: só quando DEPENDENCIES/HDR relevantes estão resolvidos)
  ↓
PLAN                  (confirmar PRODUCT_CONTRACT.md/MASTER_PLAN.md cobrem o escopo)
  ↓
HANDOFF               (formato completo — ver HANDOFF.md; nunca uma instrução vaga)
  ↓
EXECUTOR              (Antigravity, ou fallback Claude direto — ver seção 7 acima)
  ↓
CODE                  (implementação na branch da tarefa, nunca em main)
  ↓
TEST                  (tsc --noEmit, build — comandos reais, saída real)
  ↓
BROWSER QA            (execução real em navegador, 4 breakpoints — nunca leitura de código)
  ↓
REGRESSION            (áreas congeladas reconfirmadas intactas)
  ↓
AUDIT                 (Claude confere os gates 4-8 de QA_GATE.md, mesmo que tenha sido o próprio
                        executor — nunca aceitar a própria alegação sem reconferir)
  ↓
PROVADO / PARCIAL / BLOQUEADO / NÃO IMPLEMENTADO
  ↓
TASK_QUEUE.next       (só avança automaticamente se o resultado foi PROVADO; qualquer outro
                        resultado exige revisão explícita antes de prosseguir)
```

**Nunca avançar automaticamente quando houver falha real ou decisão humana pendente.** Um
resultado `PARCIAL` ou `BLOQUEADO` interrompe o avanço da fila até ser resolvido — isso vale
mesmo que exista uma "próxima tarefa" tecnicamente pronta para começar.

## 10. Classificação de status

Usar exclusivamente estes rótulos ao reportar evidência de qualquer tipo:

```
PROVADO
PARCIAL
BLOQUEADO
NÃO IMPLEMENTADO
```

Para o ciclo de vida operacional de uma tarefa na fila (`TASK_QUEUE.md`), usar:

```
PENDING
READY
IN_PROGRESS
BLOCKED
PROVADO
PARTIAL
```

Os dois vocabulários não são a mesma coisa: o primeiro descreve o **resultado verificado** de um
artefato; o segundo descreve o **estado operacional** de uma tarefa na fila.
