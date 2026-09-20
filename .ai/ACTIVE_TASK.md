# ACTIVE_TASK.md — Contrato da Tarefa Ativa

Este arquivo contém, a qualquer momento, **no máximo uma tarefa**: a que está de fato em
`IN_PROGRESS`. É o documento que pode ser enviado diretamente ao Antigravity via `HANDOFF.md`.

Formato obrigatório:

```
TASK ID
OBJECTIVE
CONTEXT
FILES EXPECTED
CONSTRAINTS
ACCEPTANCE CRITERIA
TESTS
BROWSER QA
REGRESSION
EXPECTED EVIDENCE
```

---

## Estado atual

**Nenhuma tarefa está ativa neste momento.**

`TASK-AGENDA-001` existe em `TASK_QUEUE.md` com status `PENDING`, aguardando resolução de
`HDR-001` e `HDR-003` (ver `DECISIONS.md`) antes de poder ser promovida a `READY` e depois a
`IN_PROGRESS` aqui.

Quando `TASK-AGENDA-001` for promovida a `IN_PROGRESS`, este arquivo deve ser preenchido assim
(rascunho pronto para uso, ainda não ativado):

```
TASK ID: TASK-AGENDA-001

OBJECTIVE:
Implementar a primeira versão real da Agenda dentro do Shell existente do Medusa, cobrindo as
4 views (Dia/Semana/Mês/Lista), modelo de dados de 4 tipos, conflitos com duração, tempo livre,
Now Indicator, 24 cores, categorias com domínio e edição, filtros, temas, drawer, detalhe,
Context Panel, acessibilidade e reduced motion — sem persistência real e sem tocar Educação.

CONTEXT:
Ver PRODUCT_CONTRACT.md (responsabilidade da Agenda), ARCHITECTURE.md (Shell/ShellGeometry/
padrão de integração de módulo), CURRENT_STATE.md (Agenda: design auditado, implementação não
iniciada), e EVIDENCE.md (achados da auditoria do protótipo Figma Make usado como referência de
contrato, incluindo os desvios já conhecidos: bug de breakpoint em 820px, conflito sem duração,
categoria sem domínio/edição, List View agrupada por dia em vez de Agora/Próximo/Depois/Mais
tarde).

FILES EXPECTED:
- src/components/agenda/AgendaContainer.tsx (novo)
- src/components/agenda/{AgendaHeader,DayView,WeekView,MonthView,ListView,EventDetail,
  EventDrawer,ContextPanel,agendaFixtures,types}.tsx|ts (novos)
- src/app/page.tsx (uma condicional a mais para activeRoute === 'agenda', mesmo padrão de
  Educação — não redesenhar o arquivo)
- Nenhum arquivo de src/components/education/** ou src/context/ShellContext.tsx deveria precisar
  mudar; se precisar, isso é um sinal de alerta a reportar antes de prosseguir.

CONSTRAINTS:
Ver AGENT_RULES.md na íntegra. Resumo: não tocar Educação; reutilizar tokens/ShellGeometry
existentes; sem magic numbers; sem persistência real; sem as capacidades da seção "Escopo"
(sync externo, IA de agendamento, multiusuário); branch própria, nunca commit direto em main.

ACCEPTANCE CRITERIA:
Ver TASK_QUEUE.md → TASK-AGENDA-001 → ACCEPTANCE CRITERIA (9 itens).

TESTS:
npx tsc --noEmit
npm run build

BROWSER QA:
Ver TASK_QUEUE.md → TASK-AGENDA-001 → QA REQUIREMENTS. Obrigatório nos 4 breakpoints
(390/820/1024/1440), com atenção específica ao valor exato 820px.

REGRESSION:
Abrir Educação/Study Mode e confirmar visualmente que nada mudou. Confirmar Sidebar/Header/
Context Panel/Dynamic Island funcionando fora da Agenda.

EXPECTED EVIDENCE:
Saída real de tsc/build, screenshots ou asserções programáticas dos 4 breakpoints, screenshot de
Educação intacta — tudo anexado/registrado em EVIDENCE.md antes de marcar a tarefa como PROVADO.
```
