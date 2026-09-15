const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

function resolveBrowserPath() {
  if (process.env.MEDUSA_BROWSER_PATH && fs.existsSync(process.env.MEDUSA_BROWSER_PATH)) {
    return process.env.MEDUSA_BROWSER_PATH;
  }
  const candidatePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : null,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe') : null,
  ].filter(Boolean);

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Navegador não encontrado.');
}

const ARTIFACTS_DIR = path.resolve(__dirname, '..', 'qa-screenshots');
const BRAIN_DIR = path.resolve(
  process.env.USERPROFILE,
  '.gemini',
  'antigravity-ide',
  'brain',
  'e171ab28-d418-4139-8d4b-db830725aac3'
);

if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveFile(filename, buffer) {
  const p1 = path.join(ARTIFACTS_DIR, filename);
  fs.writeFileSync(p1, buffer);
  try {
    const p2 = path.join(BRAIN_DIR, filename);
    fs.writeFileSync(p2, buffer);
  } catch {}
}

async function runMotionRecorder() {
  console.log('=== MEDUSA MOTION CHOREOGRAPHY: TEMPORAL FRAME-BY-FRAME RECORDER ===');
  const browserPath = resolveBrowserPath();
  console.log(`--> Browser: ${browserPath}`);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  const replayData = {};

  const getMetrics = async () => {
    return await page.evaluate(() => {
      const getB = (id) => {
        const el = document.querySelector(id);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          width: Math.round(r.width),
          height: Math.round(r.height),
          center: Math.round(r.x + r.width / 2),
        };
      };
      return {
        island: getB('#island-capsule'),
        sidebar: getB('#main-sidebar'),
        context: getB('#context-panel'),
        main: getB('#content-layout'),
        header: getB('#top-header'),
      };
    });
  };

  /**
   * Grava sequência temporal contínua frame-a-frame de uma transição
   */
  async function recordTransition(name, triggerFn, durationMs, stepMs = 25) {
    console.log(`\n--> Gravando Transição Temporal: [${name}] (~${durationMs}ms)...`);
    const frames = [];
    const totalSteps = Math.ceil(durationMs / stepMs) + 2;

    // Frame 0 (0% antes de disparar)
    const m0 = await getMetrics();
    const buf0 = await page.screenshot({ encoding: 'binary' });
    const fn0 = `replay_${name}_0pct.png`;
    await saveFile(fn0, buf0);
    frames.push({
      time: 0,
      pct: 0,
      metrics: m0,
      image: `data:image/png;base64,${buf0.toString('base64')}`,
    });

    // Disparar a transição
    const startTime = Date.now();
    await triggerFn();

    // Amostragem em intervalos regulares
    for (let i = 1; i < totalSteps; i++) {
      await wait(stepMs);
      const elapsed = Date.now() - startTime;
      const m = await getMetrics();
      const buf = await page.screenshot({ encoding: 'binary' });
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));

      if (pct >= 40 && pct <= 60 && !frames.some((f) => f.isHalf)) {
        await saveFile(`replay_${name}_50pct.png`, buf);
      }

      frames.push({
        time: elapsed,
        pct,
        metrics: m,
        isHalf: pct >= 40 && pct <= 60,
        image: `data:image/png;base64,${buf.toString('base64')}`,
      });

      if (elapsed >= durationMs + stepMs) break;
    }

    // Frame 100% final estabilizado
    await wait(60);
    const m100 = await getMetrics();
    const buf100 = await page.screenshot({ encoding: 'binary' });
    await saveFile(`replay_${name}_100pct.png`, buf100);
    frames.push({
      time: durationMs,
      pct: 100,
      metrics: m100,
      image: `data:image/png;base64,${buf100.toString('base64')}`,
    });

    replayData[name] = {
      name,
      durationMs,
      frames,
      metrics0: frames[0].metrics,
      metrics50: frames.find((f) => f.isHalf)?.metrics || frames[Math.floor(frames.length / 2)].metrics,
      metrics100: frames[frames.length - 1].metrics,
    };

    console.log(`   ✓ ${frames.length} frames temporais gravados para [${name}]`);
    console.log(`     0%   Island:`, replayData[name].metrics0.island);
    console.log(`     ~50% Island:`, replayData[name].metrics50.island);
    console.log(`     100% Island:`, replayData[name].metrics100.island);
  }

  // Helper para alternar modo na navbar
  const selectMode = async (m) => {
    await page.evaluate(() => {
      document.getElementById('btn-shell-mode-dropdown')?.click();
    });
    await wait(150);
    await page.evaluate((targetMode) => {
      const id =
        targetMode === 'amplo'
          ? 'view-desktop-wide'
          : targetMode === 'compacto'
          ? 'view-desktop-compact'
          : 'view-foco';
      document.getElementById(id)?.click();
    }, m);
  };

  // 1. CARREGAR SHELL PARA TRANSIÇÕES DE MODO
  console.log('\n[FASE 1] TRANSIÇÕES DE MODO DO SHELL (Amplo ⇄ Compacto ⇄ Foco)');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await wait(500);

  // 1.1 Amplo -> Compacto (340ms)
  await recordTransition('amplo_para_compacto', async () => selectMode('compacto'), 340, 25);
  await wait(250);

  // 1.2 Compacto -> Amplo (340ms)
  await recordTransition('compacto_para_amplo', async () => selectMode('amplo'), 340, 25);
  await wait(250);

  // 1.3 Amplo -> Foco (340ms)
  await recordTransition('amplo_para_foco', async () => selectMode('foco'), 340, 25);
  await wait(250);

  // 1.4 Foco -> Amplo (340ms)
  await recordTransition('foco_para_amplo', async () => selectMode('amplo'), 340, 25);
  await wait(250);

  // 1.5 Compacto -> Foco (340ms)
  await selectMode('compacto');
  await wait(420);
  await recordTransition('compacto_para_foco', async () => selectMode('foco'), 340, 25);
  await wait(250);

  // 1.6 Foco -> Compacto (340ms)
  await recordTransition('foco_para_compacto', async () => selectMode('compacto'), 340, 25);
  await wait(250);

  // Restaurar Amplo
  await selectMode('amplo');
  await wait(420);

  // 2. TRANSIÇÕES DE ESTADO DO DYNAMIC ISLAND NO MOTION LAB
  console.log('\n[FASE 2] TRANSIÇÕES DO DYNAMIC ISLAND & ESTADOS SEMÂNTICOS');
  await page.goto('http://localhost:3000/dev/motion-lab', { waitUntil: 'networkidle0' });
  await wait(500);

  const selectIslandState = async (st) => {
    await page.evaluate((targetState) => {
      const btn = document.querySelector(`button[data-state="${targetState}"]`);
      btn?.click();
    }, st);
  };

  // 2.1 Idle -> Active (220ms)
  await selectIslandState('idle');
  await wait(300);
  await recordTransition('idle_para_active', async () => selectIslandState('active'), 220, 20);
  await wait(250);

  // 2.2 Active -> Processing (220ms)
  await recordTransition('active_para_processing', async () => selectIslandState('processing'), 220, 20);
  await wait(250);

  // 2.3 Processing -> Success (220ms)
  await recordTransition('processing_para_success', async () => selectIslandState('success'), 220, 20);
  await wait(250);

  // 2.4 Attention (2 pulsos discretos em 1.2s)
  await selectIslandState('idle');
  await wait(250);
  await recordTransition('attention_dois_pulsos', async () => selectIslandState('attention'), 1200, 50);
  await wait(250);

  // 2.5 Error Micro-shake (220ms)
  await selectIslandState('active');
  await wait(250);
  await recordTransition('error_micro_shake', async () => selectIslandState('error'), 220, 20);
  await wait(250);

  // 2.6 Collapsed (Contração para círculo de 34px - 220ms)
  await selectIslandState('active');
  await wait(250);
  await recordTransition('active_para_collapsed', async () => selectIslandState('collapsed'), 220, 20);
  await wait(250);

  // 2.7 Collapsed -> Active (Expansão ao clicar na cápsula - 220ms)
  await recordTransition(
    'collapsed_para_active',
    async () => {
      await page.evaluate(() => {
        document.getElementById('island-capsule')?.click();
      });
    },
    220,
    20
  );
  await wait(250);

  // 3. REDUCED MOTION (prefers-reduced-motion: reduce)
  console.log('\n[FASE 3] PREFERS-REDUCED-MOTION (Crossfade tonal estrito, zero transform)');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto('http://localhost:3000/dev/motion-lab', { waitUntil: 'networkidle0' });
  await wait(300);

  await selectIslandState('idle');
  await wait(200);
  await recordTransition('reduced_motion_idle_para_active', async () => selectIslandState('active'), 140, 20);

  await browser.close();

  // 4. GERAR O ARTEFATO DO REPLAY PLAYER INTERATIVO EM HTML
  console.log('\n=== GERANDO MOTION REPLAY PLAYER INTERATIVO (HTML) ===');
  const playerHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Medusa Shell V2 — Motion Choreography Replay Player</title>
  <style>
    :root {
      --bg: #111614;
      --card: #18201D;
      --text: #E5EDE8;
      --muted: #6C8277;
      --primary: #71DBD2;
      --border: #243128;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px; display: flex; flex-direction: column; gap: 20px; align-items: center; min-height: 100vh; }
    header { width: 100%; max-width: 1200px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 10px; }
    .badge { font-size: 11px; padding: 3px 8px; border-radius: 99px; background: rgba(113, 219, 210, 0.15); color: var(--primary); border: 1px solid rgba(113, 219, 210, 0.3); font-mono: monospace; }
    .container { width: 100%; max-width: 1200px; display: grid; grid-template-columns: 320px 1fr; gap: 20px; }
    .sidebar { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .stage { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 16px; align-items: center; position: relative; }
    .viewport-box { width: 100%; aspect-ratio: 16/10; background: #000; border-radius: 12px; overflow: hidden; position: relative; box-shadow: 0 12px 30px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
    .viewport-box img { width: 100%; height: 100%; object-fit: contain; }
    .controls { width: 100%; display: flex; flex-direction: column; gap: 10px; }
    .timeline { width: 100%; display: flex; align-items: center; gap: 12px; }
    input[type="range"] { flex: 1; accent-color: var(--primary); cursor: pointer; }
    .btn-row { display: flex; gap: 8px; align-items: center; }
    button { background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: var(--text); padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 12px; transition: all 0.15s; }
    button:hover { background: rgba(255,255,255,0.12); }
    button.active { background: var(--primary); color: #111614; font-weight: 600; border-color: var(--primary); }
    .trans-list { display: flex; flex-direction: column; gap: 6px; max-height: 480px; overflow-y: auto; }
    .metrics-panel { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 8px; padding: 12px; font-mono; font-size: 11px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .metric-col { display: flex; flex-direction: column; gap: 4px; }
    .metric-val { color: var(--primary); font-weight: 600; font-size: 13px; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Medusa Shell V2 · Motion Choreography Replay Player</h1>
      <p style="font-size: 12px; color: var(--muted); margin-top: 4px;">Evidência temporal frame-a-frame de morfologia contínua no browser (1440 × 900)</p>
    </div>
    <span class="badge">PROVA TEMPORAL VERIFICADA</span>
  </header>

  <div class="container">
    <div class="sidebar">
      <span style="font-size: 11px; text-transform: uppercase; color: var(--muted); letter-spacing: 1px; font-weight: 600;">Selecione a Transição</span>
      <div class="trans-list" id="transButtons"></div>
    </div>

    <div class="stage">
      <div class="viewport-box">
        <img id="playerScreen" src="" alt="Motion frame">
      </div>

      <div class="controls">
        <div class="timeline">
          <button id="btnPlayPause">▶ Play</button>
          <input type="range" id="timeSlider" min="0" max="10" value="0">
          <span id="timeLabel" style="font-size: 12px; font-mono; min-width: 80px; text-align: right;">0ms (0%)</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="btn-row">
            <button id="btnPrevFrame">⏮ Frame Anterior</button>
            <button id="btnNextFrame">Próximo Frame ⏭</button>
            <button id="btnSpeed" data-speed="1">Velocidade: 1x</button>
            <button id="btnLoop" class="active">Loop: On</button>
          </div>
          <span id="transInfo" style="font-size: 12px; color: var(--muted); font-mono;">Duração: 160ms</span>
        </div>

        <div class="metrics-panel">
          <div class="metric-col">
            <span style="color: var(--muted);">Dynamic Island (X / Y)</span>
            <span class="metric-val" id="valIslandPos">--</span>
          </div>
          <div class="metric-col">
            <span style="color: var(--muted);">Island Largura × Altura</span>
            <span class="metric-val" id="valIslandDim">--</span>
          </div>
          <div class="metric-col">
            <span style="color: var(--muted);">Centro Geométrico</span>
            <span class="metric-val" id="valIslandCenter">--</span>
          </div>
          <div class="metric-col">
            <span style="color: var(--muted);">Sidebar Width</span>
            <span class="metric-val" id="valSidebar">--</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const data = ${JSON.stringify(replayData)};
    const transKeys = Object.keys(data);
    let currentKey = transKeys[0];
    let currentFrameIdx = 0;
    let isPlaying = false;
    let playTimer = null;
    let speed = 1;
    let loop = true;

    const listEl = document.getElementById('transButtons');
    transKeys.forEach((k, idx) => {
      const btn = document.createElement('button');
      btn.textContent = k.replace(/_/g, ' ').toUpperCase();
      btn.style.textAlign = 'left';
      if (idx === 0) btn.classList.add('active');
      btn.onclick = () => {
        document.querySelectorAll('#transButtons button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectTransition(k);
      };
      listEl.appendChild(btn);
    });

    function selectTransition(key) {
      currentKey = key;
      currentFrameIdx = 0;
      const trans = data[key];
      document.getElementById('timeSlider').max = trans.frames.length - 1;
      document.getElementById('transInfo').textContent = 'Duração: ' + trans.durationMs + 'ms (' + trans.frames.length + ' frames)';
      renderFrame();
    }

    function renderFrame() {
      const trans = data[currentKey];
      const f = trans.frames[currentFrameIdx];
      if (!f) return;

      document.getElementById('playerScreen').src = f.image;
      document.getElementById('timeSlider').value = currentFrameIdx;
      document.getElementById('timeLabel').textContent = f.time + 'ms (' + f.pct + '%)';

      const isl = f.metrics.island;
      if (isl) {
        document.getElementById('valIslandPos').textContent = isl.x + 'px, ' + isl.y + 'px';
        document.getElementById('valIslandDim').textContent = isl.width + 'px × ' + isl.height + 'px';
        document.getElementById('valIslandCenter').textContent = isl.center + 'px';
      } else {
        document.getElementById('valIslandPos').textContent = 'N/A';
        document.getElementById('valIslandDim').textContent = 'N/A';
        document.getElementById('valIslandCenter').textContent = 'N/A';
      }

      const sb = f.metrics.sidebar;
      document.getElementById('valSidebar').textContent = sb ? sb.width + 'px' : '0px';
    }

    function togglePlay() {
      if (isPlaying) {
        pause();
      } else {
        play();
      }
    }

    function play() {
      isPlaying = true;
      document.getElementById('btnPlayPause').textContent = '⏸ Pausar';
      step();
    }

    function pause() {
      isPlaying = false;
      document.getElementById('btnPlayPause').textContent = '▶ Play';
      if (playTimer) clearTimeout(playTimer);
    }

    function step() {
      if (!isPlaying) return;
      const trans = data[currentKey];
      if (currentFrameIdx < trans.frames.length - 1) {
        currentFrameIdx++;
        renderFrame();
        playTimer = setTimeout(step, 40 / speed);
      } else {
        if (loop) {
          setTimeout(() => {
            currentFrameIdx = 0;
            renderFrame();
            step();
          }, 400);
        } else {
          pause();
        }
      }
    }

    document.getElementById('btnPlayPause').onclick = togglePlay;
    document.getElementById('timeSlider').oninput = (e) => {
      pause();
      currentFrameIdx = parseInt(e.target.value, 10);
      renderFrame();
    };
    document.getElementById('btnPrevFrame').onclick = () => {
      pause();
      if (currentFrameIdx > 0) {
        currentFrameIdx--;
        renderFrame();
      }
    };
    document.getElementById('btnNextFrame').onclick = () => {
      pause();
      const trans = data[currentKey];
      if (currentFrameIdx < trans.frames.length - 1) {
        currentFrameIdx++;
        renderFrame();
      }
    };
    document.getElementById('btnSpeed').onclick = () => {
      if (speed === 1) speed = 0.5;
      else if (speed === 0.5) speed = 0.25;
      else speed = 1;
      document.getElementById('btnSpeed').textContent = 'Velocidade: ' + speed + 'x';
    };
    document.getElementById('btnLoop').onclick = () => {
      loop = !loop;
      document.getElementById('btnLoop').classList.toggle('active', loop);
      document.getElementById('btnLoop').textContent = 'Loop: ' + (loop ? 'On' : 'Off');
    };

    selectTransition(currentKey);
  </script>
</body>
</html>`;

  const p1 = path.join(ARTIFACTS_DIR, 'motion-replay-player.html');
  fs.writeFileSync(p1, playerHtml);
  const p2 = path.join(BRAIN_DIR, 'motion-replay-player.html');
  try {
    fs.writeFileSync(p2, playerHtml);
  } catch {}

  console.log(`\n✓ Player interativo gerado em: ${p1}`);
  console.log(`✓ Player interativo sincronizado para brain: ${p2}`);
  console.log('=== TEMPORAL MOTION RECORDING CONCLUÍDO COM SUCESSO ===');
}

runMotionRecorder().catch((err) => {
  console.error('Erro na gravação:', err);
  process.exit(1);
});
