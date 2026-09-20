#!/usr/bin/env node
/**
 * agent-orchestrator.cjs — invólucro mínimo entre Claude e um executor externo (ex.: Antigravity/agy).
 *
 * Deliberadamente simples (ver .ai/AGENT_RULES.md): não tenta orquestrar múltiplos agentes, não
 * faz retry automático, não decide se uma tarefa avança — apenas executa, captura e registra.
 *
 * Uso:
 *   node scripts/agent-orchestrator.cjs [--dry-run]
 *
 * Passos:
 *   1. Lê .ai/ACTIVE_TASK.md (precisa conter um bloco preenchido, não o estado "nenhuma tarefa ativa").
 *   2. Extrai o TASK ID.
 *   3. Executa o executor configurado via variável de ambiente MEDUSA_AGENT_CMD (default: "agy").
 *   4. Captura stdout, stderr e exit code.
 *   5. Salva tudo em .ai/runs/<timestamp>-<task-id>.json.
 *   6. Sai com o mesmo exit code do executor (0 = sucesso do processo; NÃO significa "PROVADO" —
 *      Claude ainda precisa auditar o resultado contra QA_GATE.md, ver .ai/HANDOFF.md).
 *
 * Este script NUNCA decide sozinho que uma tarefa está PROVADO. Ele só produz o registro que
 * Claude usa para decidir.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ACTIVE_TASK_PATH = path.join(ROOT, '.ai', 'ACTIVE_TASK.md');
const RUNS_DIR = path.join(ROOT, '.ai', 'runs');
const AGENT_CMD = process.env.MEDUSA_AGENT_CMD || 'agy';
const DRY_RUN = process.argv.includes('--dry-run');

function fail(message) {
  console.error(`[agent-orchestrator] ERRO: ${message}`);
  process.exit(1);
}

function readActiveTask() {
  if (!fs.existsSync(ACTIVE_TASK_PATH)) {
    fail(`arquivo não encontrado: ${ACTIVE_TASK_PATH}`);
  }
  const content = fs.readFileSync(ACTIVE_TASK_PATH, 'utf8');

  if (content.includes('Nenhuma tarefa está ativa neste momento.')) {
    fail(
      'ACTIVE_TASK.md declara explicitamente que nenhuma tarefa está ativa. ' +
        'Promova uma tarefa de TASK_QUEUE.md antes de executar o orquestrador.'
    );
  }

  const idMatch = content.match(/TASK ID:\s*(\S+)/);
  if (!idMatch) {
    fail('não foi possível extrair TASK ID de ACTIVE_TASK.md — formato inesperado.');
  }

  return { taskId: idMatch[1], content };
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

function runTask(taskId, activeTaskContent) {
  const startedAt = new Date().toISOString();

  const executorCheck = checkExecutorAvailable();
  if (!executorCheck.available) {
    return {
      taskId,
      startedAt,
      finishedAt: new Date().toISOString(),
      executor: AGENT_CMD,
      executorAvailable: false,
      executorCheckDetail: executorCheck.detail,
      status: 'BLOQUEADO',
      note:
        `Executor "${AGENT_CMD}" não está disponível neste ambiente (ver .ai/BLOCKERS.md → ` +
        'BLOCK-001). Nenhum processo foi executado. Handoff permanece pronto em .ai/HANDOFF.md.',
    };
  }

  if (DRY_RUN) {
    return {
      taskId,
      startedAt,
      finishedAt: new Date().toISOString(),
      executor: AGENT_CMD,
      executorAvailable: true,
      dryRun: true,
      status: 'NÃO EXECUTADO (dry-run)',
      note: 'Executor disponível, mas --dry-run impediu a execução real.',
    };
  }

  const result = spawnSync(AGENT_CMD, ['-p', activeTaskContent], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  return {
    taskId,
    startedAt,
    finishedAt: new Date().toISOString(),
    executor: AGENT_CMD,
    executorAvailable: true,
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status === 0 ? 'EXECUTADO — AGUARDANDO AUDITORIA DE CLAUDE' : 'FALHOU',
    note:
      'Exit code 0 significa apenas que o processo do executor terminou sem erro. ' +
      'Isso NÃO equivale a PROVADO — Claude deve reexecutar/reconferir os gates de ' +
      'Test/Build/Browser QA antes de qualquer alegação de status (ver .ai/AGENT_RULES.md).',
  };
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
  const { taskId, content } = readActiveTask();
  const record = runTask(taskId, content);
  const outPath = saveRun(record);

  console.log(`[agent-orchestrator] tarefa: ${record.taskId}`);
  console.log(`[agent-orchestrator] status: ${record.status}`);
  console.log(`[agent-orchestrator] registro salvo em: ${path.relative(ROOT, outPath)}`);

  if (record.status === 'BLOQUEADO' || record.status === 'FALHOU') {
    process.exit(1);
  }
  process.exit(0);
}

main();
