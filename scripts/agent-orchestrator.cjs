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
const LOCK_PATH = path.join(RUNS_DIR, '.orchestrator.lock');
const AGENT_CMD = process.env.MEDUSA_AGENT_CMD || 'agy';
const DRY_RUN = process.argv.includes('--dry-run');

// Achado real de review: nenhum dos dois `spawnSync` deste arquivo tinha `timeout` — um
// executor travado (probe de `--version` ou a execução real) bloqueava o processo pra sempre,
// SEM NENHUM registro de auditoria (`saveRun()` só é alcançado depois que `spawnSync` retorna).
// A probe de disponibilidade só roda `--version`, então um timeout curto já é generoso; a
// execução real da tarefa pode legitimamente levar bem mais tempo (é uma implementação de
// feature, não uma checagem), por isso o teto é configurável via env var em vez de fixo.
const PROBE_TIMEOUT_MS = 10_000;
const TASK_TIMEOUT_MS = Number(process.env.MEDUSA_AGENT_TIMEOUT_MS) || 20 * 60 * 1000;

const EXIT = {
  ANTIGRAVITY_EXECUTED: 0,
  NO_ACTIVE_TASK: 1,
  FALLBACK_CLAUDE: 2,
  ANTIGRAVITY_FAILED: 3,
  CONCURRENT_RUN_BLOCKED: 4,
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
  const probe = spawnSync(AGENT_CMD, ['--version'], { encoding: 'utf8', timeout: PROBE_TIMEOUT_MS });
  if (probe.error || probe.status !== 0) {
    // Achado real de review (graphify-labs): quando `spawnSync` mata o processo por timeout, o
    // Node SEMPRE preenche `result.error` (código `ETIMEDOUT`) além de `result.signal` — não é
    // "signal sem error", como a checagem original assumia (`!probe.error`). Confirmado rodando de
    // verdade (`spawnSync('sleep', ['5'], {timeout: 300})` → `error.code === 'ETIMEDOUT'`), não só
    // lendo a documentação. A checagem original nunca detectava timeout de verdade aqui.
    const timedOut = probe.error && probe.error.code === 'ETIMEDOUT';
    return {
      available: false,
      detail: timedOut
        ? `probe travou e foi encerrada após ${PROBE_TIMEOUT_MS}ms sem responder`
        : probe.error
        ? probe.error.message
        : `exit code ${probe.status}`,
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
  // Achado real de review: sem `timeout` no spawnSync, um Antigravity travado bloqueava o
  // processo pra sempre e `saveRun()` nunca era alcançado — zero registro de auditoria pra essa
  // tentativa. Agora que o timeout existe (ver TASK_TIMEOUT_MS), esse caminho precisa de uma
  // mensagem própria, porque "ANTIGRAVITY FALHOU" genérico esconderia que foi um hang, não um erro
  // de execução real.
  //
  // Achado real de SEGUNDA review (graphify-labs) sobre a PRIMEIRA versão desta checagem: ela
  // testava `!result.error`, mas o Node SEMPRE preenche `result.error` (código `ETIMEDOUT`) quando
  // `spawnSync` mata o processo por timeout — confirmado rodando de verdade, não só lendo doc. Isso
  // tornava o ramo "timedOut" morto: todo timeout real caía no `else` genérico ("ANTIGRAVITY
  // FALHOU"), escondendo justamente a informação que essa distinção existe pra preservar.
  const timedOut = !succeeded && result.error && result.error.code === 'ETIMEDOUT';
  return {
    taskId,
    startedAt,
    finishedAt: new Date().toISOString(),
    executor: AGENT_CMD,
    executorAvailable: true,
    handoffPath: path.relative(ROOT, HANDOFF_PATH),
    exitCode: succeeded ? EXIT.ANTIGRAVITY_EXECUTED : EXIT.ANTIGRAVITY_FAILED,
    processExitCode: result.status,
    timedOut,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: succeeded ? 'EXECUTADO — AGUARDANDO AUDITORIA DE CLAUDE' : timedOut ? 'ANTIGRAVITY TRAVOU (timeout)' : 'ANTIGRAVITY FALHOU',
    note: succeeded
      ? 'Exit code 0 do processo significa apenas que o Antigravity terminou sem erro. Isso NÃO ' +
        'equivale a PROVADO — Claude deve reexecutar/reconferir os gates de Test/Build/Browser QA ' +
        'antes de qualquer alegação de status (ver .ai/AGENT_RULES.md → Honestidade).'
      : timedOut
      ? `O processo do Antigravity não terminou dentro de ${TASK_TIMEOUT_MS}ms e foi encerrado à ` +
        'força — isso é diferente de um erro de execução real (o executor pode ter travado ' +
        'esperando input, ou a tarefa genuinamente precisa de mais tempo). Ajustar ' +
        'MEDUSA_AGENT_TIMEOUT_MS se a tarefa for legitimamente longa, ou investigar o hang.'
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
    timeout: TASK_TIMEOUT_MS,
  });

  return buildAntigravityRecord(taskId, startedAt, result);
}

function saveRun(record) {
  if (!fs.existsSync(RUNS_DIR)) {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
  }
  const timestamp = record.startedAt.replace(/[:.]/g, '-');
  const body = JSON.stringify(record, null, 2) + '\n';

  // Achado real de review: duas execuções concorrentes deste script pra o MESMO taskId (ele
  // mesmo se descreve como single-shot, "não orquestra múltiplos agentes" — mas nada aqui
  // impede alguém de disparar duas instâncias por engano) podiam gerar o mesmo nome de arquivo
  // se `startedAt` (precisão de milissegundo) colidisse, e `writeFileSync` sobrescreve em
  // silêncio — perder um registro de auditoria sem nenhum aviso é pior do que qualquer outro
  // resultado possível aqui. `wx` falha em vez de sobrescrever; em colisão, tenta de novo com um
  // sufixo aleatório até achar um nome livre.
  let outPath = path.join(RUNS_DIR, `${timestamp}-${record.taskId}.json`);
  for (let attempt = 0; ; attempt++) {
    try {
      fs.writeFileSync(outPath, body, { encoding: 'utf8', flag: 'wx' });
      return outPath;
    } catch (err) {
      if (err.code !== 'EEXIST' || attempt >= 9) throw err;
      const suffix = Math.random().toString(36).slice(2, 8);
      outPath = path.join(RUNS_DIR, `${timestamp}-${record.taskId}-${suffix}.json`);
    }
  }
}

// Achado real de review: nada impedia duas invocações concorrentes deste script (por engano —
// o próprio docblock já diz "não orquestra múltiplos agentes") de disparar a MESMA tarefa duas
// vezes em paralelo, cada uma chamando o executor externo de verdade. Um lock exclusivo simples
// (arquivo criado com `wx`, que falha se já existir) resolve isso sem precisar de nenhuma
// infraestrutura nova. Um lock "preso" (processo anterior morto por SIGKILL, que pula qualquer
// cleanup) é tratado como abandonado se for mais velho que o maior timeout possível desta
// execução (`TASK_TIMEOUT_MS` + margem) — nunca mais velho que isso, porque aí seria confundir um
// lock antigo de verdade com uma execução real ainda em andamento.
const STALE_LOCK_MS = TASK_TIMEOUT_MS + 60_000;
const MAX_ACQUIRE_ATTEMPTS = 20;

// Achado real de SEGUNDA review (graphify-labs, sobre a PRIMEIRA versão deste lock — 3 bugs reais
// que a primeira versão introduziu tentando corrigir concorrência):
//
// 1. `fs.rmSync(LOCK_PATH)` sozinho, sem nada ligando "o lock que EU inspecionei como velho" ao
//    "o arquivo que EU estou removendo", não é atômico: dois processos podem CONCORDAR que o
//    mesmo lock morto está velho, e o segundo a chamar `rmSync` removeria o lock FRESCO que o
//    primeiro acabou de criar (não o lock morto original) — os dois achariam que adquiriram e
//    os dois rodariam a tarefa, exatamente o bug que este lock existe pra evitar.
// 2. `releaseLock()` removia o arquivo sem checar se ele ainda pertencia a ESTE processo — se o
//    lock deste processo foi reclamado como "morto" por outro (falso positivo, ou processo só
//    lento) enquanto ele ainda rodava, ele acabaria apagando o lock LEGÍTIMO do processo que
//    reclamou, na hora de sair.
// 3. `fs.statSync(LOCK_PATH)` no catch assumia que o arquivo ainda existia — se ele desaparecesse
//    entre o `EEXIST` e o `statSync` (dono original terminando e chamando `releaseLock()` nesse
//    exato intervalo), a exceção `ENOENT` não era tratada e derrubava o script inteiro.
//
// Correção: cada lock carrega um TOKEN único (pid + timestamp + aleatório). Reclamar um lock
// morto usa `fs.renameSync` (atômico no POSIX) pra "arrancar" o arquivo original antes de
// descartá-lo — se outro processo já reclamou/removeu no meio do caminho, o rename falha com
// ENOENT e este processo desiste da reclamação e tenta a aquisição inteira de novo, em vez de
// assumir que passou. `releaseLock()` só remove o arquivo se o conteúdo ainda for o TOKEN que
// este processo escreveu — nunca um lock alheio.
let ownedLockToken = null;

function acquireLock(attempt = 0) {
  if (attempt >= MAX_ACQUIRE_ATTEMPTS) {
    throw new Error(
      `[agent-orchestrator] Não foi possível adquirir o lock após ${MAX_ACQUIRE_ATTEMPTS} tentativas ` +
        '— contenção anormal ou bug na lógica de reclamação. Abortando em vez de tentar pra sempre.'
    );
  }
  if (!fs.existsSync(RUNS_DIR)) {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
  }

  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    fs.writeFileSync(LOCK_PATH, token, { encoding: 'utf8', flag: 'wx' });
    ownedLockToken = token;
    return true;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }

  // Lock já existe — abrimos por DESCRITOR (não por caminho) pra fixar exatamente qual inode
  // físico estamos inspecionando. Isso importa porque o CAMINHO pode ser substituído por um lock
  // novo de outro processo um instante depois — um `fs.statSync(LOCK_PATH)` normal, feito de novo
  // mais tarde, enxergaria o arquivo NOVO sem perceber a troca. `openSync` pode falhar com ENOENT
  // se o arquivo sumiu bem entre o EEXIST acima e agora (dono real terminando nesse meio-tempo) —
  // tratado como "nada pra reclamar", tenta a aquisição de novo.
  let fd;
  try {
    fd = fs.openSync(LOCK_PATH, 'r');
  } catch (openErr) {
    if (openErr.code === 'ENOENT') return acquireLock(attempt + 1);
    throw openErr;
  }

  try {
    const stat = fs.fstatSync(fd);
    const age = Date.now() - stat.mtimeMs;
    if (age <= STALE_LOCK_MS) {
      return false; // lock genuinamente em uso, não é um caso de abandono
    }

    console.error(
      `[agent-orchestrator] AVISO: lock encontrado com ${Math.round(age / 1000)}s — mais velho ` +
        `que o teto possível de uma execução real (${Math.round(STALE_LOCK_MS / 1000)}s). ` +
        'Tratado como abandonado (processo anterior provavelmente morto sem cleanup); reclamando.'
    );

    // Achado real de teste (não só de review): uma primeira versão desta reclamação usava
    // `renameSync` sozinho como "atômico" — mas `rename` opera sobre o CAMINHO, cego ao
    // conteúdo. Rodando 8 processos de verdade contra o mesmo lock morto, ~40% das execuções
    // produziam 2 "vencedores": o processo B renomeava o lock morto e recriava o seu (novo,
    // fresco) — mas o processo C, que tinha inspecionado o MESMO lock morto um instante antes,
    // ainda executava seu próprio `renameSync(LOCK_PATH, ...)` DEPOIS que B já tinha o lock fresco
    // ali — renomeando e descartando o lock LEGÍTIMO de B por engano, e criando o seu próprio no
    // lugar. B nunca percebia (já tinha retornado `true` e seguido em frente).
    //
    // Correção: depois do rename, comparamos o INODE do arquivo renomeado com o inode do `fd` que
    // abrimos ANTES de decidir reclamar. Se baterem, é garantido que renomeamos o MESMO arquivo
    // morto que inspecionamos — seguro descartar. Se não baterem, renomeamos por engano o lock de
    // outro processo (criado bem no meio da nossa checagem) — devolvemos pro lugar certo
    // imediatamente e desistimos desta tentativa de reclamação.
    const staleClaimPath = `${LOCK_PATH}.stale-${process.pid}-${Date.now()}`;
    try {
      fs.renameSync(LOCK_PATH, staleClaimPath);
    } catch (renameErr) {
      if (renameErr.code === 'ENOENT') return acquireLock(attempt + 1);
      throw renameErr;
    }

    const renamedStat = fs.statSync(staleClaimPath);
    if (renamedStat.ino !== stat.ino) {
      console.error(
        '[agent-orchestrator] AVISO: o lock renomeado não é o mesmo que inspecionamos (outro ' +
          'processo criou um lock novo bem nesse intervalo) — devolvendo ao lugar certo e desistindo desta reclamação.'
      );
      // Achado real de TERCEIRA review (graphify-labs): um `renameSync` de volta, sem condição,
      // pode SOBRESCREVER um lock legítimo criado por um TERCEIRO processo bem no intervalo entre
      // o nosso rename-pra-fora (que esvaziou LOCK_PATH por um instante) e este rename-de-volta —
      // um `acquireLock()` alheio via `writeFileSync(..., {flag:'wx'})` teria sucesso nesse vão
      // vazio, e devolver o arquivo antigo aqui destruiria o lock fresco desse terceiro sem
      // nenhum aviso (o dono dele acharia que ainda está válido). `fs.linkSync` cria o nome novo
      // sem apagar o de origem e falha com EEXIST se o destino já existe — nunca sobrescreve.
      try {
        fs.linkSync(staleClaimPath, LOCK_PATH);
        fs.rmSync(staleClaimPath, { force: true });
      } catch (linkErr) {
        if (linkErr.code === 'EEXIST') {
          // LOCK_PATH já tem um lock de verdade (do terceiro processo) — descarta nossa cópia
          // velha sem tocar no que está lá agora.
          fs.rmSync(staleClaimPath, { force: true });
        } else {
          throw linkErr;
        }
      }
      return acquireLock(attempt + 1);
    }

    fs.rmSync(staleClaimPath, { force: true });
    return acquireLock(attempt + 1);
  } finally {
    fs.closeSync(fd);
  }
}

function releaseLock() {
  if (!ownedLockToken) return;
  // Achado real de TERCEIRA review (graphify-labs): a versão anterior fazia `readFileSync` pra
  // conferir o token e só DEPOIS `rmSync` por CAMINHO — um TOCTOU. Entre as duas chamadas, outro
  // processo pode legitimamente reclamar nosso lock como stale (rename pra fora) E recriar um
  // fresco no mesmo caminho (ex.: este processo travou por I/O síncrono demorado — `saveRun()`
  // pode segurar até 20MB de stdout/stderr — e por isso pareceu abandonado); nosso `rmSync(LOCK_PATH)`
  // apagaria o lock NOVO e legítimo desse outro processo, não o nosso.
  //
  // Correção: reclamamos o CAMINHO primeiro via `renameSync` (atômico — arranca o que quer que
  // esteja lá agora, de uma vez), só então inspecionamos o conteúdo do que capturamos. Se for
  // nosso token, descartamos. Se não for (alguém reclamou o nosso E recriou um novo bem nesse
  // instante — janela minúscula, mas real), devolvemos exatamente o arquivo que tiramos, sem tocar
  // em nenhum outro que possa ter aparecido enquanto isso.
  const claimPath = `${LOCK_PATH}.release-${process.pid}-${Date.now()}`;
  try {
    fs.renameSync(LOCK_PATH, claimPath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      ownedLockToken = null; // já sumiu — nada a liberar, sem erro
      return;
    }
    throw err;
  }

  try {
    const current = fs.readFileSync(claimPath, 'utf8');
    if (current === ownedLockToken) {
      fs.rmSync(claimPath, { force: true });
    } else {
      // Não é mais o nosso — outro processo reclamou nosso lock como abandonado E recriou um novo
      // bem no meio deste release. Devolve o arquivo capturado ao lugar, sem sobrescrever nada.
      try {
        fs.linkSync(claimPath, LOCK_PATH);
        fs.rmSync(claimPath, { force: true });
      } catch (linkErr) {
        if (linkErr.code === 'EEXIST') {
          // LOCK_PATH já tem outro arquivo (situação ainda mais rara) — descarta nossa cópia
          // capturada sem tocar no que está lá agora.
          fs.rmSync(claimPath, { force: true });
        } else {
          throw linkErr;
        }
      }
    }
  } finally {
    ownedLockToken = null;
  }
}

function main() {
  if (!acquireLock()) {
    console.error(
      '[agent-orchestrator] ERRO: já existe uma execução em andamento (lock em ' +
        `${path.relative(ROOT, LOCK_PATH)}). Duas instâncias concorrentes deste script poderiam ` +
        'disparar a mesma tarefa duas vezes no executor externo — aguarde a execução atual terminar.'
    );
    process.exit(EXIT.CONCURRENT_RUN_BLOCKED);
  }
  // `readActiveTask()`/`readHandoff()` chamam `process.exit()` diretamente nos caminhos de erro —
  // um `try/finally` normal NÃO cobriria esses caminhos (`process.exit()` não desenrola a pilha
  // via exceção). O evento `'exit'` do processo roda de qualquer forma, mesmo depois de
  // `process.exit()` ser chamado em qualquer lugar — é o único jeito de garantir que o lock
  // sempre é liberado, não importa qual caminho de saída for tomado.
  process.on('exit', releaseLock);

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
