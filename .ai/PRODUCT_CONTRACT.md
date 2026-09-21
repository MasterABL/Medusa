# PRODUCT_CONTRACT.md — Contrato de Domínios do Medusa

Este documento define a responsabilidade de cada domínio do Medusa. É a fonte de verdade para
decidir "isso pertence a este módulo ou a outro?" durante qualquer implementação.

## Regra de Não-Sobreposição

> Nenhum domínio deve absorver silenciosamente a responsabilidade de outro.

Um domínio pode **referenciar** dados de outro (por id, por resumo, por link), mas nunca duplicar
ou reimplementar a lógica de negócio de outro domínio. Quando um agente perceber que uma tarefa
exige que um domínio A calcule/decida algo que é, por definição, responsabilidade do domínio B, a
tarefa para e vira uma entrada em `DECISIONS.md`.

## Domínios

| Domínio | Responsabilidade | O que NÃO é responsabilidade dele |
|---|---|---|
| **Agenda** | Representação temporal: compromissos, blocos de tempo, prazos, rotinas, tempo livre, conflitos de horário. Responde "como meu tempo está organizado?" | Não decide o que é importante (isso é Hoje); não guarda estado de aprendizagem (isso é Educação); não é uma segunda instância de nenhum outro domínio |
| **Educação** | Aprendizado: sessões de estudo, trilhas, exercícios, SRS/mastery, tutor contextual. Responde "o que e como estou aprendendo?" | Não decide quando uma sessão de estudo acontece no tempo (isso é Agenda, quando/se um evento de Agenda referenciar uma sessão) |
| **Corpo** | Treinos e saúde: rotina de exercício, métricas de saúde, consultas. Responde "como está meu corpo?" | Não agenda os treinos no tempo (isso é Agenda); Corpo é a fonte de significado, Agenda é a fonte de tempo |
| **Finanças** | Obrigações e transações financeiras: vencimentos, contas, orçamento. Responde "como está meu dinheiro?" | Não decide quando um vencimento aparece na timeline (isso é Agenda, via um item do tipo deadline referenciando Finanças) |
| **Tarefas** | Itens/tarefas discretas, não necessariamente com horário fixo. Responde "o que eu preciso fazer?" | Não é um segundo calendário; uma tarefa pode aparecer na Agenda como bloco/prazo, mas a lista mestra de tarefas vive em Tarefas |
| **Hoje** | Resumo operacional: o que merece atenção agora, agregando sinais de outros domínios (incluindo Agenda). Responde "o que importa agora?" | Não é dono de nenhum dado primário — é uma camada de consumo/agregação sobre os outros domínios |
| **Guardian** | Monitoramento e incidentes do próprio sistema (saúde técnica, alertas, auditoria). Responde "o sistema está bem?" | Não é sobre a vida do usuário — é sobre a saúde operacional do produto |
| **Buscar** | Descoberta e busca transversal entre domínios. Responde "onde está X?" | Não guarda dados próprios — indexa/consulta o que já existe nos outros domínios |

## Relação Agenda ↔ Hoje (já decidida)

- **Agenda**: "Como meu tempo está organizado?" — fonte de fatos temporais brutos.
- **Hoje**: "O que merece minha atenção agora?" — consome fatos temporais da Agenda (e de outras
  fontes futuras) para decidir prioridade.
- A Agenda deve **expor** dados de forma consumível por Hoje; nesta fase, essa integração real
  ainda não existe (`NÃO IMPLEMENTADO` — ver `MASTER_PLAN.md`).

## Relação Agenda ↔ Educação (já decidida)

- Um evento de Agenda pode se originar de uma sessão de Educação (campo `origin`).
- A Agenda representa **compromisso temporal** (quando, quanto tempo).
- O Learning OS (Educação) representa **aprendizagem** (SRS, mastery, estado de estudo).
- Nunca confundir os dois: um evento de Agenda do tipo "Estudo — Função Afim" não guarda nenhum
  estado de aprendizagem — apenas referencia que aquele bloco de tempo *se origina* de Educação.

## Regra geral de origem

Um item de Agenda pode ter uma origem informativa (`Educação`, `Corpo`, `Financeiro`, `Rotina`,
`Manual`, etc.), mas a origem é só um rótulo de proveniência. O domínio de origem continua
responsável por **o que aquilo significa**; a Agenda mostra apenas **quando acontece**.
