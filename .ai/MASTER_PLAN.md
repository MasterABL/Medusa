# MASTER_PLAN.md — Plano Mestre Definitivo do Medusa

Este documento responde a uma pergunta: **"se ninguém precisar dizer ao Claude o que fazer, qual é
a sequência completa para transformar o Medusa atual no produto definido?"** Não inventa
funcionalidade — onde a especificação existente não é suficiente para virar tarefa executável,
isso é marcado `HUMAN DECISION REQUIRED` (referenciando o HDR correspondente em `DECISIONS.md`) em
vez de preenchido com suposição.

**Regra de autoridade** (usada em toda revisão deste documento): 1) estado real do código, 2)
decisões explícitas já tomadas, 3) contrato do produto, 4) arquitetura existente, 5) evidências de
QA, 6) documentação histórica. Onde há divergência entre eles, ela é registrada em `DECISIONS.md`
ou `BLOCKERS.md`, nunca silenciosamente resolvida a favor da fonte mais antiga.

## Visão do produto

Medusa é um **Personal Life OS + Learning OS**. A arquitetura conceitual central, que todo domínio
deve respeitar:

```
Evento → Contexto → Decisão → Ação → Resultado → Feedback
```

A arquitetura temporal, que rege a relação entre domínios e o eixo do tempo:

```
Domínios → Agenda → Hoje
```

**A Agenda conhece o tempo; cada domínio conhece o significado.** A Agenda nunca é dona do
significado de um evento (por que ele existe, o que ele representa) — isso pertence ao domínio de
origem (Educação, Corpo, Finanças...). Hoje nunca duplica a posse de dado de nenhum domínio — ele
consome e resume.

## Modelo de ciclo de vida de um domínio

Todo domínio de produto (Agenda, Educação, Corpo, Finanças, Progresso...) percorre este ciclo,
**mas não precisa esperar sua "fase" numerada para começar o Contract/Foundation/UI/Local State** —
essa é a correção estrutural mais importante desta revisão (ver D-006 em `DECISIONS.md`):

```
Contract → Foundation → UI → Local State → Persistence Slice → Integration → QA → Gate
                                                  ↑
                                    Auth (Fase 2) é pré-requisito só a partir daqui
```

Isso já aconteceu na prática: a Agenda (nominalmente Fase 3) teve Contract→Foundation→UI→Local
State→QA implementados e verificados (ver `CURRENT_STATE.md`, `EVIDENCE.md` → E-013 a E-019) antes
de qualquer trabalho de Auth (Fase 2) começar — isso é válido, não uma violação de ordem, porque a
Agenda não implementou persistência real. O que a ordem de fases realmente governa é: **nenhum
domínio implementa seu Persistence Slice antes de Auth existir**, e **nenhuma fase de integração
transversal roda antes dos domínios que ela integra terem pelo menos Contract+UI prontos**.

## Fases (numeração alinhada 1:1 com os Gates de `ROADMAP.md`)

### FASE 0 — Agent Operating System
**Status real**: PROVADO. `.ai/` existe com os 12 arquivos de protocolo, `scripts/agent-orchestrator.cjs`
implementa a cadeia de fallback (Antigravity → Claude direto → BLOQUEADO). Ver `AGENT_RULES.md`.
**Depende de**: nada. **Bloqueia**: nada (é infraestrutura de processo, não de produto) — mas todo
o resto deste plano só é executável de forma autônoma porque esta fase existe.
**Não precisa ser reconstruída a cada módulo** — é usada, não repetida.

### FASE 1 — Foundation / Shell Closure
**Status real**: Implementation/Test/Build/Browser QA Gate = **PROVADO** (verificado nesta sessão,
`EVIDENCE.md` → E-014 a E-016) via PR #1 (`fix/foundation-hardening`). Merge Gate = **BLOQUEADO**
(não mesclado — `DECISIONS.md` → HDR-001).
**Áreas cobertas**: Shell, ShellGeometry/`SHELL_DIMENSIONS`, Sidebar, Context Panel, Dynamic
Island, Mobile Island, tema (Claro/Sépia/Escuro), motion, responsividade, routing por
`activeRoute`, padrões de componente. Todas mapeadas em `ARCHITECTURE.md`.
**Depende de**: nada. **Bloqueia**: toda fase que renderiza UI dentro do Shell (praticamente todas).
**Achado**: PR #1 também contém a expansão multi-trilha de Educação (ver Fase 4) — bundled na mesma
branch, não separado. Ver HDR-010.
**Fechamento da fase requer**: merge de PR #1 a `main` + regressão confirmada.

### FASE 2 — Auth / Identity
**Status real**: NÃO IMPLEMENTADO. Nenhuma dependência de autenticação em `package.json` em
nenhuma branch existente.
**Depende de**: Foundation (Fase 1) mesclada — não estritamente necessário tecnicamente, mas evita
retrabalho se o Shell mudar de novo.
**Bloqueia**: o Persistence Slice de qualquer domínio (não bloqueia Contract/Foundation/UI/Local
State desses domínios — ver modelo de ciclo de vida acima).
**HUMAN DECISION REQUIRED (HDR-011)**: escolha de provedor de Auth. Não implementar uma plataforma
de autenticação desnecessariamente complexa; usar o que já existir de fato disponível no projeto
(hoje, nada — o MCP do Supabase está disponível no ambiente de execução, mas isso não é uma
decisão tomada, apenas uma opção candidata).
**Escopo mínimo esperado quando decidido**: login, sessão, associação de dado a usuário — nada além
disso nesta fase (SSO, múltiplos provedores, recuperação de senha customizada etc. são
`FUTURE/OUT OF SCOPE` até haver necessidade real).

### FASE 3 — Agenda / Temporal OS
**Status real**: Implementation/Test/Build/Browser QA Gate = **PROVADO** (PR #2 `feature/agenda`,
verificado nesta sessão — `EVIDENCE.md` → E-014, E-017, E-018). Merge Gate = **BLOQUEADO**
(depende de Fase 1 mesclar primeiro — dependência técnica de Git, `DECISIONS.md` → D-008).
**Escopo implementado** (verificado por leitura de código + QA real): Dia/Semana/Mês/Lista, 4 tipos
de item (Event/TimeBlock/Deadline/Routine), conflito com duração real, tempo livre textual, Now
Indicator, 24 cores pastel, categorias com domínio associado e editáveis, filtros por domínio,
criação/edição/exclusão via drawer com confirmação em 2 passos, painel de detalhe lateral, Context
Panel específico da Agenda, breakpoint 820px correto, temas herdados, Local State explícito.
**NÃO implementado nesta fase** (confirmado — nenhuma dependência nova em `package.json`): Google
Calendar/Outlook/iCloud, multiusuário, convites, AI scheduling, persistência real.
**Pendente**: ratificação humana do agrupamento Agora/Próximo/Depois/Mais tarde da List View
(`HDR-003`, resolvido na prática pelo código, falta confirmação formal) + merge sequencial.
**Fechamento da fase requer**: merge de PR #2 (após PR #1) + ratificação de HDR-003.

### FASE 4 — Education Stabilization / Integration Contract
**Status real**: Base single-track PROVADO e congelada em `main`. Expansão multi-trilha
(Faculdade/Inglês/Vestibular) implementada dentro de PR #1/#2 (commit `e616635`) —
Implementation/QA = **PROVADO** (verificado via `qa-browser.js` real), mas **governança BLOQUEADA**:
tocou área congelada sem decisão prévia registrada (`DECISIONS.md` → HDR-010).
**O que já existe e é válido preservar**: máquina de estados (dashboard→loading→ready→study→
exercises→completion), Focus Mode real, Tutor Drawer com voz, sistema de notas com timestamp,
diagnóstico de erro em exercícios, dados derivados (nunca "fake retention").
**O que esta fase deve fazer**: (1) ratificar ou revisar a expansão multi-trilha já implementada;
(2) formalizar o contrato de integração Educação→Agenda via campo `origin` (já existe em
`PRODUCT_CONTRACT.md`, implementação real ainda não conectada); (3) manter Educação como dona do
significado pedagógico — Agenda representa apenas o horário da sessão.
**Não reimplementar Educação do zero.** **Depende de**: Fase 1.

### FASE 5 — Hoje (Foundation + Integration, split obrigatório)
**Status real**: NÃO IMPLEMENTADO.
**5a. Hoje Foundation** — estrutura visual, layout, contratos de UI. **Depende de**: Fase 1
apenas. Pode começar mesmo sem Agenda/Educação/Corpo/Finanças prontos, desde que não exiba nenhum
dado fingindo ser real (fixtures explicitamente rotuladas, nunca apresentadas como integração).
**5b. Hoje Integration** — consumo progressivo de dados reais: Agenda primeiro (compromissos,
próxima ação), depois Educação, Corpo, Finanças, Progresso, na medida em que cada um tiver Contract
+ UI prontos. **Nunca usar fixture para representar integração real** (`AGENT_RULES.md` →
Honestidade). **HUMAN DECISION REQUIRED (HDR-006)**: shape exato do contrato de consumo por
domínio, à medida que cada domínio fica disponível.
**Hoje é consumidor/orquestrador operacional — nunca uma cópia de Agenda, Educação ou um Task
Manager próprio.**

### FASE 6 — Corpo
**Status real**: NÃO IMPLEMENTADO. **HUMAN DECISION REQUIRED (HDR-005)**: não existe especificação
de produto além da responsabilidade geral ("treinos/saúde") em `PRODUCT_CONTRACT.md`.
**Ciclo de vida completo**: Contract → Foundation → UI → Local State → Persistence Slice (após
Fase 2) → Integration com Agenda (Agenda representa "quando o treino está marcado"; Corpo é dono
do significado do treino — execução, resultado, histórico) → QA → Gate.
**Não duplicar dado de treino na Agenda.**
**Paralelizável com**: Fase 7 (Finanças) — não compartilham dados nem arquivos sensíveis.

### FASE 7 — Finanças
**Status real**: NÃO IMPLEMENTADO. **HUMAN DECISION REQUIRED (HDR-005)**: mesma situação de Corpo.
**Ciclo de vida completo**: igual ao de Corpo. Agenda representa "quando vence"; Finanças é dona de
"o que é a obrigação, quanto, origem, status".
**Não duplicar dado financeiro na Agenda.**
**Paralelizável com**: Fase 6 (Corpo).

### FASE 8 — Progresso
**Status real**: NÃO IMPLEMENTADO. **HUMAN DECISION REQUIRED (HDR-005)**: nem a responsabilidade
geral está detalhada além do nome.
**Princípio obrigatório**: distinguir **dado operacional** de **indicador derivado**. Evitar
gamificação artificial — nunca usar XP fictício para representar progresso real. Priorizar
objetivos, evolução, mastery, hábitos, consistência, tendências — todos derivados de dados reais de
outros domínios (Educação, Corpo, Finanças), nunca inventados.
**Depende de**: pelo menos um domínio-fonte (Educação já serve) ter dados reais para derivar.

### FASE 9 — Guardian (trilha independente)
**Status real**: NÃO IMPLEMENTADO. **HUMAN DECISION REQUIRED**: as regras determinísticas
mencionadas em conversas anteriores (`workflow_run failed`, 2 erros/10min em endpoint crítico,
Dependabot critical/high, push fora de janela) **não estão registradas em nenhum arquivo deste
repositório** — tratadas aqui como `DECISION REQUIRED / CONTRACT MISSING`, não como fato já
decidido, até serem formalizadas em `PRODUCT_CONTRACT.md` ou `DECISIONS.md`.
**Guardian não depende da cadeia de domínios de produto** (Corpo/Finanças/Progresso/Buscar) — sua
única dependência real é a Fase 1 (Shell, para ter onde renderizar incidentes) e o acesso a
GitHub/Vercel (já disponível neste ambiente via MCP). Pode avançar **independentemente**, no
sentido de que não existe dependência lógica obrigando-o a esperar — não significa execução
simultânea de verdade (ver seção "Paralelismo" abaixo).
**Arquitetura**: `GitHub/Vercel → webhook/events → deterministic rules → findings → Guardian UI`.
Segurança em repo privado: Gitleaks/CodeQL/Dependabot — **não assumir que GitHub Secret
Scanning/Code Scanning gratuitos estão disponíveis em todos os planos**; verificar antes de
depender disso.
**Guardian produz incidente + evidência + timeline + recomendação — não é um dashboard genérico.**

### FASE 10 — Buscar
**Status real**: NÃO IMPLEMENTADO. **HUMAN DECISION REQUIRED**: escopo de busca (Command Modal já
existente é o ponto de entrada natural, mas isso não foi decidido formalmente).
**Depende de**: pelo menos os domínios que serão indexados terem Contract+UI prontos (Educação já
serve; idealmente Agenda também, dado que já está implementada).
**Buscar referencia os domínios, nunca assume a posse deles — sem duplicação de dado.**

### FASE 11 — Cross-Domain Integration
**Status real**: NÃO IMPLEMENTADO.
```
Education ──┐
Body ───────┤
Finance ────┤
Tasks ──────┤
Routines ───┤
Events ─────┤
            ↓
          Agenda
            ↓
           Hoje
            ↓
        Progresso
```
Para cada par de domínios integrados, definir explicitamente **fonte de verdade** vs.
**projeção/derivação**. Exemplo já decidido: `Education owns lesson; Agenda owns scheduled time;
Today consumes both; Progress derives results.`
**Depende de**: os domínios envolvidos terem pelo menos Contract+UI prontos.

### FASE 12 — Persistence / Data Hardening (global, não "big bang")
**Status real**: NÃO IMPLEMENTADO globalmente — mas **cada domínio já implementa seu próprio
Persistence Slice como parte do seu próprio ciclo de vida** (Fases 3, 6, 7 etc.), não aqui. Esta
fase cuida apenas do que é **transversal**: consistência de schema entre domínios, migrations,
indexes, auditoria de RLS, ownership, integridade cross-domain, observabilidade, recuperação.
**Depende de**: Fase 2 (Auth) para qualquer domínio começar seu próprio Persistence Slice; esta
fase global roda depois que pelo menos um domínio já tiver um Persistence Slice real para
consolidar/auditar.
**Nunca transformar todos os domínios de Local State em persistência real de uma vez.**

### FASE 13 — Intelligence / Automation
**Status real**: NÃO IMPLEMENTADO. Só começa depois da base (Fases 1-12) estar estável.
Capacidades possíveis: recomendações, assistente, next-best-action, scheduling assistido,
recuperação, análise, automações. **Sempre separar lógica determinística de inferência de IA** —
não usar IA onde uma regra determinística resolve. **Não introduzir serviços pagos sem decisão
humana explícita** (respeita a restrição de custo já existente do projeto).

### FASE 14 — Final QA / Production Gate
**Status real**: NÃO IMPLEMENTADO como processo formal — mas os gates individuais por tarefa já
existem e funcionam (`QA_GATE.md`). Este é o gate global agregado: typecheck, lint, build, testes,
Browser QA (desktop/tablet/mobile, fluxos críticos), responsividade (390/820/1024/1440), temas (3),
acessibilidade (teclado, foco, ARIA, reduced motion, contraste), regressão de todos os módulos,
dados (RLS, ownership, sem vazamento, sem mock apresentado como real), infra (Vercel, env, deploy,
health), segurança (secrets, headers, auth, logs).
**HUMAN DECISION REQUIRED**: critérios objetivos de "pronto para produção" (quem aprova, o que é
inegociável) ainda não formalizados além dos gates já descritos aqui.

## Áreas Principais mapeadas para fases

| Área | Fase(s) | Observação |
|---|---|---|
| Shell / ShellGeometry / Navigation | 1 | Fechamento definitivo aqui; consumida por todas as demais |
| Context Panel | 1 (base), depois cada domínio adiciona sua síntese (já aconteceu em Agenda, Fase 3) |
| Dynamic Island / Mobile Island | 1 | Catálogo de 10 estados é área congelada — ver `ARCHITECTURE.md` |
| Autenticação | 2 | Pré-requisito só de Persistence Slice, não de UI/Local State |
| Dados / Persistência | Por domínio (slice incremental) + 12 (consolidação global) |
| Integrações externas | 13 (Intelligence) ou `FUTURE/OUT OF SCOPE` — nunca implícitas em nenhuma fase de domínio |
| QA | Transversal — `QA_GATE.md` aplica a toda fase, não é uma fase isolada |
| Infraestrutura (Vercel/CI) | 0 (Vercel já confirmado funcional) / GitHub Actions ainda `HUMAN DECISION REQUIRED` (HDR-007) |

## Visual Baseline

Figma e Stitch **não são mais utilizados** como fonte de design a partir deste plano. A fonte
visual para qualquer trabalho futuro é, nesta ordem: 1) design e linguagem já existentes no Medusa
(tokens em `globals.css`, `ARCHITECTURE.md`); 2) componentes reais do repositório; 3) material/
protótipos já produzidos e auditados em sessões anteriores (ex.: a auditoria do protótipo Figma
Make da Agenda, cujo contrato já foi extraído e está implementado); 4) `PRODUCT_CONTRACT.md`; 5)
decisões visuais já registradas em `DECISIONS.md`. **Não criar uma nova fase obrigatória de design
nem voltar a depender de uma ferramenta externa de design.**

## FUTURE / OUT OF SCOPE

Registrado aqui para não virar backlog infinito dentro das fases acima. Nada disto tem prioridade
de construção até uma decisão humana explícita mudar isso:

- Sincronização com Google Calendar, Outlook, iCloud.
- IA de agendamento automático / resolução automática de conflitos.
- Suporte multiusuário, calendários compartilhados, convites, salas.
- SSO / múltiplos provedores de Auth / recuperação de senha customizada.
- Qualquer integração externa não contratada em `PRODUCT_CONTRACT.md` ou aqui.
- Dashboard genérico de Guardian (Guardian produz incidentes, não é um painel de métricas solto).

## Paralelismo (definição oficial)

Neste documento, **"paralelizável"** significa exclusivamente: **não existe dependência lógica
obrigatória entre as duas tarefas/fases** — nunca "serão executadas ao mesmo tempo de verdade". O
executor atual é Claude Code, serial, dentro de uma única sessão de conversa (`AGENT_RULES.md` →
seção 7). Antigravity, quando disponível, pode tornar execução simultânea real possível no futuro —
até lá, "paralelizável" só evita ordem arbitrária, não implica velocidade de entrega maior.

## Regra de avanço

Uma fase só é considerada iniciável quando todas as fases das quais ela depende (ver "Depende de"
em cada fase acima) estão, no mínimo, com Contract+Foundation resolvidos — nunca por calendário ou
pressão de escopo. Ver `ROADMAP.md` para o grafo de dependências completo e o detalhamento por
gate (`CONTRACT → PLAN → IMPLEMENTATION → TEST → BUILD → BROWSER QA → REGRESSION → EVIDENCE →
REVIEW/AUDIT → MERGE → GATE`).
