# QA_GATE.md — Critério Objetivo de Aprovação

Nenhuma tarefa é marcada `PROVADO` sem passar, nesta ordem, pelos gates abaixo. Se qualquer etapa
falhar ou não puder ser executada, o status correto é `BLOQUEADO` ou `PARCIAL` — nunca `PROVADO`.

## 1. Contract Gate
A tarefa cita explicitamente qual seção de `PRODUCT_CONTRACT.md` e/ou `MASTER_PLAN.md` ela
implementa. Se a tarefa exige algo não coberto por nenhum dos dois, ela para e vira uma entrada em
`DECISIONS.md` (`HUMAN DECISION REQUIRED`), não uma suposição.

## 2. Plan Gate
A tarefa tem `ACCEPTANCE CRITERIA` objetivos e verificáveis (ver formato em `TASK_QUEUE.md`), não
descrições vagas como "melhorar a UX".

## 3. Implementation Gate
Código escrito em branch própria (nunca em `main` diretamente), respeitando `AGENT_RULES.md`
(reuso de arquitetura, sem magic numbers, sem tocar áreas congeladas sem decisão).

## 4. Test Gate
```bash
npx tsc --noEmit
```
Comando real executado, saída real registrada em `EVIDENCE.md`. Zero erros é condição necessária,
não suficiente.

## 5. Build Gate
```bash
npm run build
```
Comando real executado, saída real registrada. Build verde é condição necessária, não suficiente.

## 6. Browser QA Gate
Obrigatório sempre que a tarefa toca `src/app` ou `src/components`. Não é satisfeito por leitura de
código. Formas aceitas de evidência:
- Screenshot real de um navegador renderizando a mudança (arquivo anexado ou caminho registrado).
- Saída de uma asserção programática rodada de fato (ex.: `scripts/qa-browser.js` ou equivalente),
  com o comando exato e a saída completa em `EVIDENCE.md`.

Responsivo obrigatório nos 4 breakpoints já padronizados neste projeto: **390px (mobile)**,
**820px (tablet)**, **1024px (desktop)**, **1440px (desktop amplo)** — com atenção especial a
qualquer breakpoint interno do próprio componente (ex.: um componente que usa
`window.innerWidth < 820` precisa ser testado exatamente em 820px, não só "perto" de 820px — um
bug real já foi encontrado dessa forma na auditoria do protótipo da Agenda).

## 7. Regression Gate
Sempre que a tarefa tocar `ShellContext`, `ShellGeometry`/`SHELL_DIMENSIONS`, `globals.css` ou
qualquer arquivo de `src/components/shell/`, reconfirmar que Educação/Study Mode continua
funcionando (área congelada) — abrir o módulo, navegar por pelo menos um fluxo completo, confirmar
visualmente que nada mudou.

## 8. Evidence Gate
Tudo dos gates 4–7 vive em `EVIDENCE.md` com: comando exato executado, data/sessão, saída real
(ou caminho do arquivo de saída/screenshot), e quem/o que executou (Claude, Antigravity, humano).

## 9. Review/Audit Gate
Depois dos gates 4-8, Claude (ou um humano) audita o diff contra `ACCEPTANCE CRITERIA` e
`AGENT_RULES.md` — mesmo quando Claude foi quem implementou (executar e auditar são papéis
distintos, ver `AGENT_RULES.md` → seção 7). Este gate também verifica se algum arquivo de área
congelada foi tocado sem decisão registrada em `DECISIONS.md` — se sim, o gate para aqui até a
ratificação, mesmo que os gates 4-8 tenham passado.

## 10. Merge Gate (distinto de Implementation Gate — ver `DECISIONS.md` → D-007)
Merge para `main` nunca é automático. Mesmo com os gates 1-9 todos `PROVADO`, o PR só fecha depois
de: (a) decisão humana explícita de mesclar (`AGENT_RULES.md` → Git), (b) se a branch depende de
outra branch não mesclada (ver `git merge-base --is-ancestor`), a base mescla primeiro. Uma
tarefa pode legitimamente estar com Implementation/Test/Build/Browser QA todos `PROVADO` e o Merge
Gate ainda `BLOQUEADO` — isso não é uma contradição, é a distinção Merge Gate ≠ Implementation Gate.

## 11. Closed Gate — Classificação final

| Situação | Status correto |
|---|---|
| Gates 1–10 passaram com evidência real, incluindo merge em `main` | `PROVADO` (fechado) |
| Gates 1–9 passaram com evidência real, mas Merge Gate (10) ainda pendente | `PROVADO` (implementação) / `PARCIAL` (fechamento de fase) — nunca descrito como "concluído" sem dizer que não está em `main` |
| Gates 1–5 passaram, mas Browser QA/Regression não foram feitos ou falharam parcialmente | `PARCIAL` |
| Qualquer gate anterior bloqueia o andamento (ex.: decisão humana pendente, ambiente sem browser) | `BLOQUEADO` |
| A tarefa nem chegou a ser implementada | `NÃO IMPLEMENTADO` |

**Regra de ouro**: build verde e typecheck limpo não é QA. Eles são pré-requisito para QA começar.
**Segunda regra de ouro**: implementado não é mesclado. Nenhum documento `.ai/` descreve uma
funcionalidade como "concluída" sem dizer explicitamente se ela já está em `main` ou não.
