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

## 9. Final Gate — Classificação

| Situação | Status correto |
|---|---|
| Todos os gates 1–8 passaram com evidência real | `PROVADO` |
| Gates 1–5 passaram, mas Browser QA/Regression não foram feitos ou falharam parcialmente | `PARCIAL` |
| Qualquer gate anterior bloqueia o andamento (ex.: decisão humana pendente, ambiente sem browser) | `BLOQUEADO` |
| A tarefa nem chegou a ser implementada | `NÃO IMPLEMENTADO` |

**Regra de ouro**: build verde e typecheck limpo não é QA. Eles são pré-requisito para QA começar.
