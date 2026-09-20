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

**Atualização importante desta sessão**: `TASK-AGENDA-001` deixou de ser `PENDING`/"a implementar"
— uma implementação real já existe em PR #2 (`feature/agenda`), criada fora deste protocolo, e foi
auditada de verdade (ver `EVIDENCE.md` → E-013 a E-019, `TASK_QUEUE.md` → status `PARTIAL`). O
rascunho abaixo (originalmente escrito para "implementar do zero") **não deve mais ser ativado como
está** — ficaria pedindo para reimplementar algo que já existe. Ele é preservado como referência
histórica do contrato original. A tarefa realmente ativável agora é `TASK-MERGE-PREP-001` (ver
`TASK_QUEUE.md`), que não precisa deste formato de `ACTIVE_TASK` completo por ser uma correção de
texto, não uma implementação de produto.

Rascunho original de `TASK-AGENDA-001` (histórico — não ativar sem revisar primeiro se ainda faz
sentido, dado que o código já existe):

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

**Nota de execução (ver AGENT_RULES.md → seção 7):** ao promover esta tarefa, rodar
`node scripts/agent-orchestrator.cjs` primeiro. Se retornar exit 2 (`FALLBACK: CLAUDE_DIRECT`,
caso esperado hoje — ver `BLOCKERS.md` → BLOCK-001), Claude implementa diretamente usando o
`HANDOFF.md` já preenchido como especificação exata. Isso não é um desvio do protocolo.

**Nota de checkpoint (ver AGENT_RULES.md → seção 8):** assim que esta tarefa for promovida a
`IN_PROGRESS`, este arquivo passa a manter também um bloco `CHECKPOINT ATUAL` (mesmo formato usado
em `CURRENT_STATE.md`) refletindo o progresso real da implementação, atualizado antes de encerrar
qualquer sessão — para que uma sessão futura possa retomar exatamente de onde esta parou.
