// The painted renderer's measurement harness — audit tasks #23 and #24.
//
//   node scripts/terrain-study/check-painted.mjs --fixture standard-t120-s1
//   node scripts/terrain-study/check-painted.mjs --fixture large-t120-s1 --frames 48
//   node scripts/terrain-study/check-painted.mjs --new            # no save, seeded start
//
// It starts its own dev server on port 5321 (never 5199 or 5241, and it kills
// only the process it started), pushes a fixture save into the headless
// browser's own localStorage, resumes it the way Continue does, reads the
// startup stage marks back as spans, then runs the renderer's own benchmark —
// the view sweep plus the workload suite — and writes one JSON under
// docs/plans/benchmarks/.
//
// **Software GL is not the user's GPU.** Chromium here runs on SwiftShader, so
// every frame figure is a CPU rasteriser's and the GPU timer extension is
// usually absent; the payload records the renderer string, the DPR, the
// viewport, the commit, the fixture and the warm-up policy so that no figure can
// be quoted without them. Run the same script against a headed browser on the
// reference machine for numbers that describe a real GPU.
import {spawn} from 'node:child_process';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PW = '/private/tmp/claude-501/-Users-jacky-code-webciv/c4da3ce5-796a-4aa7-8603-c5fc07da6b1d/scratchpad/pw/node_modules/playwright/index.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined && !args[at + 1].startsWith('--') ? args[at + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const fixtureId = flag('fixture', 'standard-t120-s1');
const fresh = has('new');
const port = Number(flag('port', '5321'));
const frames = Number(flag('frames', '48'));
const warmUp = Number(flag('warmUp', '12'));
const [width, height] = (flag('viewport', '1440x900')).split('x').map(Number);
const label = flag('label', fresh ? 'new-game' : fixtureId);
const outName = flag('out', `painted-${label}-${new Date().toISOString().slice(0, 10)}.json`);
const timeoutMs = Number(flag('timeout', '1800')) * 1000;

const commit = (() => {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root}).toString().trim(); }
  catch { return null; }
})();
const dirty = (() => {
  try { return execFileSync('git', ['status', '--porcelain'], {cwd: root}).toString().trim().length > 0; }
  catch { return null; }
})();

const fixturePath = path.join(root, 'docs/plans/benchmarks/fixtures', `${fixtureId}.json`);
const fixture = fresh ? null : JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const fixtureIndex = fresh ? null : (() => {
  const file = path.join(root, 'docs/plans/benchmarks/fixtures/index.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')).fixtures.find(row => row.id === fixtureId) ?? null;
})();

// --- the dev server, ours alone ---------------------------------------------
const server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {cwd: root, stdio: ['ignore', 'pipe', 'pipe']});
let serverLog = '';
server.stdout.on('data', chunk => { serverLog += chunk; });
server.stderr.on('data', chunk => { serverLog += chunk; });
const stopServer = () => { try { process.kill(server.pid); } catch { /* already gone */ } };
process.on('exit', stopServer);

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/`);
      if (response.ok) return;
    } catch { /* not up yet */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`the dev server never came up on ${port}:\n${serverLog}`);
}

const {chromium} = await import(PW);
await waitForServer();

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc'],
});
const page = await browser.newPage({viewport: {width, height}});
page.setDefaultTimeout(timeoutMs);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(`[console] ${message.text()}`); });

// The long-task observer goes in before anything runs, and the fixture goes into
// this browser's own localStorage — the user's shelf is a different origin and a
// different profile, and this process never touches it.
await page.addInitScript(({save, slot}) => {
  window.__longTasks = [];
  try {
    new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__longTasks.push({start: entry.startTime, duration: entry.duration, name: entry.name}); })
      .observe({type: 'longtask', buffered: true});
  } catch { window.__longTasks = null; }
  if (save) try { localStorage.setItem(`magisterludi:save:${slot}`, save); } catch { /* private window */ }
}, {save: fixture ? JSON.stringify({...fixture, savedAt: Date.now()}) : null, slot: 'benchmark-fixture'});

const url = `http://localhost:${port}/?art=painted&light=golden&profile=1&benchWorkloads=1`
  + `&benchFrames=${frames}&benchWarmUp=${warmUp}&benchLabel=${encodeURIComponent(label)}`;
console.error(`[painted] ${url}`);
await page.goto(url, {waitUntil: 'load', timeout: 120000});
await page.waitForTimeout(1500);

if (fresh) {
  // The seeded new-game flow, tutorial off, exactly as gameshot.mjs drives it.
  if (await page.locator('#landing-new').count()) { await page.click('#landing-new'); await page.waitForTimeout(400); }
  await page.evaluate(() => { const t = document.getElementById('tutorial-toggle'); if (t && t.checked) { t.checked = false; t.dispatchEvent(new Event('change', {bubbles: true})); } });
  if (await page.locator('#landing-to-civ').count()) { await page.click('#landing-to-civ'); await page.waitForTimeout(400); }
  await page.waitForSelector('#start-game:not([disabled])', {timeout: 60000});
  await page.click('#start-game');
} else {
  await page.waitForSelector('#continue-game:not([hidden])', {timeout: 60000});
  await page.click('#continue-game');
}
await page.waitForFunction(() => document.getElementById('landing')?.hidden === true, null, {timeout: timeoutMs});
// A pamphlet should not show on a resumed save, but Escape costs nothing.
const begin = page.locator('.pamphlet-begin');
if (await begin.count() && await begin.first().isVisible()) { await begin.first().click(); await page.waitForTimeout(500); }
await page.keyboard.press('Escape');
await page.waitForTimeout(4000);

// --- startup evidence (#23) --------------------------------------------------
const startup = await page.evaluate(() => {
  const order = [
    'magisterludi:load-start', 'magisterludi:replay-done', 'magisterludi:begin',
    'magisterludi:assets-loaded', 'magisterludi:terrain-ready',
    'magisterludi:state-layers-built', 'magisterludi:playable', 'magisterludi:first-board-frame',
  ];
  const marks = {};
  for (const name of order) {
    const entry = performance.getEntriesByName(name, 'mark')[0];
    marks[name.replace('magisterludi:', '')] = entry ? Math.round(entry.startTime * 100) / 100 : null;
  }
  const present = order.filter(name => performance.getEntriesByName(name, 'mark').length > 0);
  const spans = [];
  for (let i = 0; i < present.length - 1; i++) {
    const measure = performance.measure(`${present[i]}→${present[i + 1]}`, present[i], present[i + 1]);
    spans.push({from: present[i].replace('magisterludi:', ''), to: present[i + 1].replace('magisterludi:', ''), ms: Math.round(measure.duration * 100) / 100});
  }
  // The pin: the stages that fired, fired in the stated order.
  const times = present.map(name => performance.getEntriesByName(name, 'mark')[0].startTime);
  const inOrder = times.every((time, index) => index === 0 || time >= times[index - 1]);
  const tasks = window.__longTasks ?? [];
  const longest = tasks.length ? tasks.reduce((worst, task) => task.duration > worst.duration ? task : worst) : null;
  const navigation = performance.getEntriesByType('navigation')[0];
  return {
    marksInOrder: present.map(name => name.replace('magisterludi:', '')),
    marksAreOrdered: inOrder,
    missingMarks: order.filter(name => !present.includes(name)).map(name => name.replace('magisterludi:', '')),
    marks, spans,
    totalMs: present.length >= 2 ? Math.round((marks[present[present.length - 1].replace('magisterludi:', '')] - marks[present[0].replace('magisterludi:', '')]) * 100) / 100 : null,
    // The two numbers #23 asks for: the press that started it, to the interface
    // opening, and the same press to the first frame of the board on screen.
    clickToPlayableMs: marks['load-start'] !== null && marks.playable !== null ? Math.round((marks.playable - marks['load-start']) * 100) / 100 : null,
    clickToFirstBoardFrameMs: marks['load-start'] !== null && marks['first-board-frame'] !== null ? Math.round((marks['first-board-frame'] - marks['load-start']) * 100) / 100 : null,
    navigationToPlayableMs: marks.playable,
    navigationToFirstBoardFrameMs: marks['first-board-frame'],
    longTasks: {
      supported: window.__longTasks !== null,
      count: tasks.length,
      longestMs: longest ? Math.round(longest.duration * 100) / 100 : null,
      longestAtMs: longest ? Math.round(longest.start * 100) / 100 : null,
      over50msTotalMs: Math.round(tasks.reduce((sum, task) => sum + task.duration, 0) * 100) / 100,
      note: 'the long-task API reports a 50 ms floor and attributes a whole task, so a multi-second board build lands as one entry',
    },
    domContentLoadedMs: navigation ? Math.round(navigation.domContentLoadedEventEnd * 100) / 100 : null,
  };
});

// --- the renderer's own benchmark (#24) --------------------------------------
// `--startupOnly` stops here: the stage split is #23's deliverable and costs two
// minutes, where the sweep costs twenty under software GL.
const measured = has('startupOnly') ? null : await runBenchmark();
async function runBenchmark() {
console.error('[painted] running the view sweep and the workloads…');
await page.evaluate(() => {
  const button = [...document.querySelectorAll('button')].find(element => element.textContent === 'Benchmark full map');
  if (!button) throw new Error('the painted benchmark button is not on this page');
  button.click();
});
const raw = await page.waitForFunction(() => {
  const element = document.getElementById('terrain-benchmark-results');
  if (!element || !element.textContent.startsWith('{')) return null;
  return element.textContent;
}, null, {timeout: timeoutMs, polling: 2000});
return JSON.parse(await raw.jsonValue());
}

const output = {
  label,
  measuredAt: new Date().toISOString(),
  commit, workingTreeDirty: dirty,
  fixture: fresh ? {kind: 'new game', seed: 'landing default', note: 'no save loaded'} : {
    kind: 'save', id: fixtureId, ...(fixtureIndex ?? {}),
  },
  harness: {
    script: 'scripts/terrain-study/check-painted.mjs',
    port, viewport: {width, height}, frames, warmUp,
    browser: 'headless Chromium (Playwright) on ANGLE/SwiftShader',
    caveat: 'software rasterisation: frame and GPU figures describe a CPU rasteriser, not the reference GPU. Draw calls, triangles, bake counts, memory, populations and startup stages are hardware-independent; frame times are not.',
  },
  startup,
  benchmark: measured,   // null under --startupOnly: no sweep was run
  pageErrors: errors,
};

fs.mkdirSync(path.join(root, 'docs/plans/benchmarks'), {recursive: true});
const outPath = path.join(root, 'docs/plans/benchmarks', outName);
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(JSON.stringify({wrote: path.relative(root, outPath), startup: startup.spans, views: ((measured?.results) ?? []).map(row => ({view: row.view, frameMs: row.frameMs?.p50, cpuRenderMs: row.cpuRenderMs?.p50, gpuMs: row.gpuMs?.p50 ?? null, draws: row.drawCalls?.p50})), errors: errors.slice(0, 5)}, null, 2));

await browser.close();
stopServer();
