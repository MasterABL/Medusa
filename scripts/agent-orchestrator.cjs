#!/usr/bin/env node
/**
 * agent-orchestrator.cjs — invólucro mínimo entre Claude e um executor externo (ex.: Antigravity/agy),
 * com fallback explícito para execução direta por Claude quando o executor preferencial está
 * indisponível (ver .ai/AGENT_RULES.md → seção 7, "Executor e Fallback").
 *
 * Deliberadamente simples: não tenta orquestrar múltiplos agentes, não faz retry automático, não
 * decide se uma tarefa está PROVADO — apenas executa (ou detecta que não pode), captura e registra.
 * A decisão de status final é sempre de Claude, via auditoria contra QA_GATE.md.
 *
 * Uso:
 *   node scripts/agent-orchestrator.cjs [--dry-run]
 *
 * O payload enviado ao executor é sempre o conteúdo de .ai/HANDOFF.md (o contrato formal),
 * nunca um prompt improvisado — .ai/ACTIVE_TASK.md só é lido para confirmar o TASK ID ativo e
 * checar consistência com HANDOFF.md.
 *
 * Cadeia de execução (AGENT_RULES.md → seção 7):
 *   Executor principal:  Antigravity (agy)
 *   Fallback:             Claude Code (execução direta)
 *   Fallback final:       BLOQUEADO (apenas para bloqueios reais — decisão humana pendente etc.)
 *
 * Contrato de exit code (estável — outros scripts/humanos podem depender dele):
 *   0 = Antigravity executou o processo (exit 0 dele). NÃO significa PROVADO — precisa de auditoria.
 *   1 = Não há tarefa ativa em ACTIVE_TASK.md, ou o arquivo está em formato inesperado. Ação:
 *       promover uma tarefa de TASK_QUEUE.md antes de rodar de novo.
 *   2 = Antigravity indisponível → FALLBACK. Não é uma falha do protocolo: é o sinal de que
 *       Claude deve implementar a tarefa diretamente, usando o mesmo HANDOFF.md como especificação.
 *   3 = Antigravity estava disponível mas a execução dele falhou de verdade. Claude decide entre
 *       tentar de novo, acionar o fallback, ou registrar BLOQUEADO com o motivo real.
 *
 * Este script nunca inventa que um executor está disponível/autenticado quando não está, e nunca
 * declara uma tarefa PROVADO sozinho.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ACTIVE_TASK_PATH = path.join(ROOT, '.ai', 'ACTIVE_TASK.md');
const HANDOFF_PATH = path.join(ROOT, '.ai', 'HANDOFF.md');
const RUNS_DIR = path.join(ROOT, '.ai', 'runs');
const AGENT_CMD = process.env.MEDUSA_AGENT_CMD || 'agy';
const DRY_RUN = process.argv.includes('--dry-run');

const EXIT = {
  ANTIGRAVITY_EXECUTED: 0,
  NO_ACTIVE_TASK: 1,
  FALLBACK_CLAUDE: 2,
  ANTIGRAVITY_FAILED: 3,
};

function readActiveTask() {
  if (!fs.existsSync(ACTIVE_TASK_PATH)) {
    console.error(`[agent-orchestrator] ERRO: arquivo não encontrado: ${ACTIVE_TASK_PATH}`);
    process.exit(EXIT.NO_ACTIVE_TASK);
  }
  const content = fs.readFileSync(ACTIVE_TASK_PATH, 'utf8');

  if (content.includes('Nenhuma tarefa está ativa neste momento.')) {
    console.error(
      '[agent-orchestrator] ERRO: ACTIVE_TASK.md declara explicitamente que nenhuma tarefa ' +
        'está ativa. Promova uma tarefa de TASK_QUEUE.md antes de executar o orquestrador.'
    );
    process.exit(EXIT.NO_ACTIVE_TASK);
  }

  const idMatch = content.match(/TASK ID:\s*(\S+)/);
  if (!idMatch) {
    console.error(
      '[agent-orchestrator] ERRO: não foi possível extrair TASK ID de ACTIVE_TASK.md — formato inesperado.'
    );
    process.exit(EXIT.NO_ACTIVE_TASK);
  }

  // Achado real de review: o TASK ID extraído aqui vira parte de um nome de arquivo em
  // saveRun() (`${timestamp}-${taskId}.json` dentro de RUNS_DIR). `\S+` no regex acima aceita
  // qualquer caractere não-espaço, incluindo `/` e `..` — um ACTIVE_TASK.md malformado (ou editado
  // à mão com um valor inesperado) poderia gravar fora de `.ai/runs`. Trava o formato ao mesmo
  // padrão já usado nos IDs reais deste projeto (ex.: TASK-CI-001).
  const taskId = idMatch[1];
  if (!/^[A-Za-z0-9._-]+$/.test(taskId)) {
    console.error(
      `[agent-orchestrator] ERRO: TASK ID "${taskId}" tem formato inválido (só letras, números, ` +
        `"." "_" "-" são aceitos) — recusado por segurança antes de virar nome de arquivo.`
    );
    process.exit(EXIT.NO_ACTIVE_TASK);
  }

  return { taskId, content };
}

function readHandoff(taskId) {
  if (!fs.existsSync(HANDOFF_PATH)) {
    console.error(
      `[agent-orchestrator] ERRO: .ai/HANDOFF.md não encontrado. O HANDOFF.md é o contrato ` +
        'enviado ao Antigravity (nunca um prompt improvisado) — preencha-o antes de executar.'
    );
    process.exit(EXIT.NO_ACTIVE_TASK);
  }
  const content = fs.readFileSync(HANDOFF_PATH, 'utf8');
  // Achado real de review: `content.includes(taskId)` é um match de SUBSTRING — TASK ID "TASK-1"
  // "casa" dentro de "TASK-10" ou "TASK-1B", então um HANDOFF.md pra uma tarefa diferente passava
  // na checagem de consistência sem erro nenhum. taskId já é validado (regex de formato em
  // readActiveTask) só com [A-Za-z0-9._-], então dá pra usar ele dentro de uma regex com fronteira
  // sem precisar de um escape geral de metacaracteres.
  const boundary = '(?:^|[^A-Za-z0-9._-])';
  const taskIdPattern = new RegExp(`${boundary}${taskId.replace(/[.]/g, '\\.')}(?:$|[^A-Za-z0-9._-])`);
  if (!taskIdPattern.test(content)) {
    console.error(
      `[agent-orchestrator] ERRO: .ai/HANDOFF.md não menciona o TASK ID ativo (${taskId}). ` +
        'ACTIVE_TASK.md e HANDOFF.md precisam ser consistentes antes de delegar ao executor.'
    );
    process.exit(EXIT.NO_ACTIVE_TASK);
  }
  return content;
}

function checkExecutorAvailable() {
  const probe = spawnSync(AGENT_CMD, ['--version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    return {
      available: false,
      detail: probe.error ? probe.error.message : `exit code ${probe.status}`,
    };
  }
  return { available: true, detail: probe.stdout.trim() };
}

function buildFallbackRecord(taskId, startedAt, executorCheck) {
  return {
    taskId,
    startedAt,
    finishedAt: new Date().toISOString(),
    executor: AGENT_CMD,
    executorAvailable: false,
    executorCheckDetail: executorCheck.detail,
    handoffPath: path.relative(ROOT, HANDOFF_PATH),
    status: 'FALLBACK: CLAUDE_DIRECT',
    exitCode: EXIT.FALLBACK_CLAUDE,
    note:
      `Executor "${AGENT_CMD}" indisponível neste ambiente (ver .ai/BLOCKERS.md → BLOCK-001). ` +
      'Por AGENT_RULES.md → seção 7 ("Executor e Fallback"), isto NÃO bloqueia o roadmap: ' +
      'Claude deve implementar a tarefa diretamente, usando .ai/HANDOFF.md (o handoff já ' +
      'preenchido) como especificação exata de escopo — não uma versão resumida ou reinterpretada. ' +
      'Os mesmos gates de QA_GATE.md se aplicam integralmente à execução direta de Claude.',
  };
}

function buildDryRunRecord(taskId, startedAt) {
  return {
    taskId,
    startedAt,
    finishedAt: new Date().toISOString(),
    executor: AGENT_CMD,
    executorAvailable: true,
    handoffPath: path.relative(ROOT, HANDOFF_PATH),
    dryRun: true,
    status: 'NÃO EXECUTADO (dry-run)',
    exitCode: EXIT.ANTIGRAVITY_EXECUTED,
    note: 'Executor disponível, mas --dry-run impediu a execução real.',
  };
}

function buildAntigravityRecord(taskId, startedAt, result) {
  const succeeded = result.status === 0;
  return {
    taskId,
    startedAt,
    finishedAt: new Date().toISOString(),
    executor: AGENT_CMD,
    executorAvailable: true,
    handoffPath: path.relative(ROOT, HANDOFF_PATH),
    exitCode: succeeded ? EXIT.ANTIGRAVITY_EXECUTED : EXIT.ANTIGRAVITY_FAILED,
    processExitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: succeeded ? 'EXECUTADO — AGUARDANDO AUDITORIA DE CLAUDE' : 'ANTIGRAVITY FALHOU',
    note: succeeded
      ? 'Exit code 0 do processo significa apenas que o Antigravity terminou sem erro. Isso NÃO ' +
        'equivale a PROVADO — Claude deve reexecutar/reconferir os gates de Test/Build/Browser QA ' +
        'antes de qualquer alegação de status (ver .ai/AGENT_RULES.md → Honestidade).'
      : 'O processo do Antigravity terminou com erro real (não é indisponibilidade — o executor ' +
        'rodou e falhou). Claude decide: tentar de novo, acionar o fallback (Claude direto), ou ' +
        'registrar BLOQUEADO em .ai/BLOCKERS.md com o motivo real, nunca automaticamente.',
  };
}

function runTask(taskId, handoffContent) {
  const startedAt = new Date().toISOString();

  const executorCheck = checkExecutorAvailable();
  if (!executorCheck.available) {
    return buildFallbackRecord(taskId, startedAt, executorCheck);
  }

  if (DRY_RUN) {
    return buildDryRunRecord(taskId, startedAt);
  }

  // O HANDOFF.md é o único contrato enviado ao executor — nunca um prompt improvisado paralelo.
  const result = spawnSync(AGENT_CMD, ['-p', handoffContent], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  return buildAntigravityRecord(taskId, startedAt, result);
}

function saveRun(record) {
  if (!fs.existsSync(RUNS_DIR)) {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
  }
  const timestamp = record.startedAt.replace(/[:.]/g, '-');
  const outPath = path.join(RUNS_DIR, `${timestamp}-${record.taskId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2) + '\n', 'utf8');
  return outPath;
}

function main() {
  const { taskId } = readActiveTask();
  const handoffContent = readHandoff(taskId);
  const record = runTask(taskId, handoffContent);
  const outPath = saveRun(record);

  console.log(`[agent-orchestrator] tarefa: ${record.taskId}`);
  console.log(`[agent-orchestrator] status: ${record.status}`);
  console.log(`[agent-orchestrator] registro salvo em: ${path.relative(ROOT, outPath)}`);

  process.exit(record.exitCode);
}

main();
