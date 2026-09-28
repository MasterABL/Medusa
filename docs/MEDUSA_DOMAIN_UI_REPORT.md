# UI dos domínios — relatório da rodada de implementação

Branch `claude/domain-ui-implementation`, empilhada sobre o PR #28 (contratos de domínio). Nenhum código de domínio,
da Agenda, da Educação, do Modo Estudo ou do Dynamic Island foi alterado. Toda a UI vive em `src/components/domains/`.

## Fonte visual

As telas do Stitch não puderam ser baixadas (o proxy do ambiente bloqueia `lh3.googleusercontent.com` e
`contribution.usercontent.google.com`, e isso não foi contornado). A referência visual usada foram **5 capturas de tela
enviadas pelo dono**: Finanças (Visão Principal), Corpo (Rotina Ativa), Guardian (home com decisão pendente) e Espiritual
(Espaço Principal e Práticas). **Não foram observadas**: as telas de primeira entrada do Stitch, os layouts mobile e os
estados "Sob Pressão"/"Retomada Sem Culpa" como telas próprias. Esses estados foram projetados a partir da intenção descrita
no pedido, não copiados — por isso nada aqui é declarado "fiel ao Stitch" além da composição das 5 capturas.

Conflitos resolvidos pela ordem do pedido: JetBrains Mono, cantos retos e a paleta menta do design system do Stitch **não**
foram importados; ficaram Epilogue, off-white, raio 8–12, grade de 8px, tokens Medusa.

## O que existe

| Domínio | Primeira entrada (motion próprio) | Home | Expansão | Context Panel |
|---|---|---|---|---|
| Finanças | "Fluxo": 4 respostas contam até o valor real, barra de distribuição se desenha; a barra faz view-transition até a Home | 4 tiles (tenho/recebi/gastei/falta pagar), atenção, distribuição, contas, orçamentos, metas, assinaturas | contas → propor pagamento; orçamentos → lançamentos; metas → aporte; "decidir um gasto" (simulador) | próxima conta, orçamento mais apertado, metas, atenção — cada bloco abre e rola até o item |
| Corpo | "Entender": 7 passos reais do diagnóstico, trilha de 4 estágios (Entender → Perfil → Plano → Ativação) | estado, próxima atividade, recuperação, ritmo semanal, sessão com onda de ritmo, semana | "ajustar ao meu dia" (carga de rotina), perfil | próxima atividade, rotina, recuperação, progresso |
| Guardian | "Observação": verificação real roda enquanto as áreas são reveladas com o que foi achado em cada uma | veredito, cobertura honesta, achados a decidir, pedidos de outros domínios, bloqueados, log humano, autonomia | achado expande no lugar: evidência, hipótese, proposta, aprovação (o quê/onde/por quê/consequência/reversível/confiança) | finding selecionado: cadeia de verificação, evidência, aprovação |
| Espiritual | "Presença": uma pergunta por vez ("O que importa agora?"); o propósito escrito desliza até a Home (view-transition) | propósito em foco, "hoje, com calma", onde estou na Bíblia, práticas, estudo, reflexão privada | estudo da passagem (observar → entender → viver), reler reflexão | prática vigente, leitura, propósito, companheiro de estudo (contrato de IA) |

Retorno: quem já viu a entrada vai direto à Home (`localStorage`, chave `medusa-domain-entry-v1`); "Rever introdução"/"Refazer
diagnóstico" reabre a entrada.

## Ligação com o domínio (nada de segundo sistema de dados)

- Finanças lê `FinanceApi` (overview, orçamentos, metas, recorrência, insights). Pagar = `proposePayment` (L3): vira pedido
  pendente e, se aprovado, o executor real **falha de propósito** ("sem integração bancária") — a UI mostra "Aprovado, mas não
  executado". Aporte em meta = `contributeToGoal` (passa pelo Guardian).
- Corpo usa os casos de uso reais: `createDiagnosticSession` → `answerDiagnosticQuestion` → `completeDiagnosticSession` →
  `createBodyPlan` → `resumeBodyPlan`. "Aceitar plano e ativar" percorre `approveAndRun` (AWAITING_APPROVAL → AUTHORIZED →
  EXECUTING → SUCCESS). Perfil e plano persistem pela serialização do próprio domínio; as aprovações **não** são refeitas ao voltar.
- Guardian roda `runGuardianCycle` de verdade. Aprovar grava a decisão e o ciclo seguinte executa e verifica; a cadeia
  mostrada reflete PROPOSED → PENDING_APPROVAL → APPROVED → EXECUTING → SUCCEEDED + verificação. Nunca aparece "feito" antes.
- Espiritual reconstrói o repositório a partir do que a pessoa escreveu/marcou, pelos casos de uso (registrar não é decisão do
  Guardian). Texto bíblico **não é exibido**: não existe `BibleTextProvider`, e o domínio proíbe gerar escritura.

## PROVADO (executado no navegador, Chromium)

- Fluxos completos: Finanças (entrada → home → propor pagamento → pedido pendente → simulador); Corpo (7 passos → perfil → plano →
  aceitar e ativar → home → recarregar → volta direto à Home); Guardian (entrada → achado → aprovar → executar → verificar →
  cadeia toda concluída, duplicata movida para a lixeira recuperável); Espiritual (propósito → prática → plano → marcar leitura →
  prática → estudo → nota → recarregar → volta à Home com o propósito).
- Sem overflow horizontal em 1440×900, 1024×768, 820×1180 e 390×844, claro e escuro, nos 4 domínios.
- Movimento reduzido: números aparecem finais (sem contagem), animação do fluxo = `none`, View Transitions desligadas.
- Expansões: `aria-expanded`/`aria-controls`, região fechada fica `inert` (fora da ordem de Tab).
- `npm run typecheck` limpo · `npm run build` ok · `npm run test:all` 373/373 nos domínios (+ fundação) · `npm run lint` sem avisos novos.

## PARCIAL

- Dados de Finanças e da parte "Dados/Segurança" do Guardian são **de demonstração**, rotulados na tela. Não há Open Finance nem
  adapter real para dados do Medusa.
- O estado do Guardian (achados, propostas, confiança, aprovações) é **em memória**: recarregar refaz a verificação. Só
  Corpo e Espiritual persistem (localStorage do aparelho; reflexões sem criptografia).
- Corpo: sem lista de exercícios/séries (o domínio só tem 6 atividades) e sem registro de sessão concluída — por isso não há
  "sequência" nem "2 de 3 treinos". Agendar gera um pedido pronto para a Agenda; a Agenda não foi tocada.
- Espiritual: sem texto bíblico e sem IA/LLM. O "companheiro de estudo" mostra o **contrato** de contexto (consentimento por
  escopo + barreira de privacidade) com o assistente por modelo fixo; a tela declara "IA não conectada".
- Lacuna do domínio, contornada e registrada no código: `UPDATE_GOAL` aprovado depois não tem ramo no executor de Finanças (a UI
  aplica o mesmo `GoalEngine.addContribution`); `ACTIVATE` não existe no Corpo (ativa-se via `RESUME_BODY_PLAN`).
- Insights `category_spike` de Finanças ficam **ocultos**: o domínio ainda compara com média histórica aproximada.
- Comparação visual com o Stitch feita só contra as 5 capturas; sem as telas de entrada e mobile do Stitch.

## NÃO IMPLEMENTADO

Versículo do dia na tela, exercícios/séries do Corpo, gráficos de fluxo de caixa por dia, telas Stitch adicionais (54 no projeto),
persistência do Guardian, notificação push de aprovação, integração real Agenda/Hoje (a UI só consome os contratos),
Dynamic Island e Sound Map (fora do escopo pedido).

## Segurança

A chave do Stitch colada no chat não foi gravada em nenhum arquivo, commit, comando persistente ou URL do repositório; foi usada
só por variável de ambiente numa sessão anterior de leitura. **Considere-a comprometida e faça a rotação.** Nada no projeto do
Stitch foi alterado.
