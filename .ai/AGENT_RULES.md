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

## 7. Classificação de status

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
