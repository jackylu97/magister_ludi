import { createHash } from 'node:crypto';
import { createServer as createHttpServer } from 'node:http';
import { access, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createServer } from 'vite';
import { instrument, summarizeInteraction, timings } from './instrument.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const probe = fileURLToPath(new URL('./probe.js', import.meta.url));
const { values } = parseArgs({ options: { save:{type:'string'}, snapshot:{type:'string'}, actions:{type:'string'},
  out:{type:'string'}, modes:{type:'string',default:'on,off'}, help:{type:'boolean'} } });
if (values.help) {
  console.log('node scripts/input-latency/run.mjs (--save FILE | --snapshot FILE) --out NEW_FILE [--modes on,off] [--actions FILE]\nUses an isolated Chrome profile and a private loopback server. See scripts/input-latency/README.md.');
  process.exit(0);
}
if (!values.out || Boolean(values.save) === Boolean(values.snapshot)) throw Error('Supply --out and either --save or --snapshot.');
const modes = values.modes.split(',');
if (!modes.length || modes.some(mode => !['on','off'].includes(mode))) throw Error('Use on, off, or a comma-separated sequence of those modes.');
const fixture = await readFile(values.save ?? values.snapshot, 'utf8');
try { await access(values.out); throw Error('Choose a new output filename.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright').catch(() => {
  throw Error('Set PLAYWRIGHT_MODULE to the absolute path to playwright/index.mjs, or install Playwright.');
});
let actions = values.actions ? JSON.parse(await readFile(values.actions,'utf8')) : null;
function validateActions(list) {
  if (!Array.isArray(list) || !list.length || list.some(a => !['select','move'].includes(a.kind) || !Number.isInteger(a.unit) ||
    !Number.isFinite(a.x) || !Number.isFinite(a.y) || (a.kind === 'move' && (!Number.isInteger(a.target?.col) || !Number.isInteger(a.target?.row))))) throw Error('Invalid action list. See the example next to this script.');
}
if (actions) validateActions(actions);
const run = { fixtureSha256:createHash('sha256').update(fixture).digest('hex'), fixtureKind:values.save ? 'save' : 'snapshot',
  measuredFunctions:Object.values(timings).flatMap(Object.keys),
  viewport:{width:1470,height:835}, usedFixedActions:!!actions, modes, runs:[] };
const temporary = await mkdtemp(join(tmpdir(), 'magister-unit-latency-'));
let server, http, browser;
try {
  http = createHttpServer((request, response) => server.middlewares(request, response));
  server = await createServer({ root, cacheDir:join(temporary,'vite'), logLevel:'error',
    plugins:[{name:'unit-input-diagnostic',enforce:'pre',transform(code,id){ return instrument(code, relative(root, id.split('?')[0]).split('\\').join('/')); }}],
    server:{middlewareMode:{server:http},hmr:false} });
  await new Promise((resolve, reject) => http.once('error', reject).listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${http.address().port}`;
  for (const mode of modes) {
    browser = await chromium.launch({ ...(process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE} : {channel:'chrome'}),
      headless:true, args:['--enable-gpu', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : [])] });
    const context = await browser.newContext({viewport:run.viewport,deviceScaleFactor:2,reducedMotion:'no-preference'});
    try {
      await context.addInitScript({path:probe});
      await context.route(/^https?:\/\//, route => new URL(route.request().url()).origin === url ? route.continue() : route.abort());
      const page = await context.newPage();
      page.on('pageerror', error => console.error('Browser error:', error.message));
      await page.goto(`${url}/?light=day&botPrep=${mode}`);
      await page.waitForFunction(() => typeof window.__openLatencyGame === 'function');
      await page.evaluate(async ({text,snapshot}) => {
        let game;
        if (snapshot) game = JSON.parse(text);
        else {
          const { loadSave } = await import('/src/ui/saves.ts');
          const result = loadSave(text);
          if (!result.ok) throw Error(result.detail ?? result.error);
          game = result.game;
        }
        if (!game?.config || !game?.state?.map?.tiles || !Array.isArray(game?.log)) throw Error('Expected a game with config, state and log.');
        await window.__openLatencyGame(game);
        if (!window.__latencyGame) throw Error('The game could not open this fixture.');
      }, {text:fixture,snapshot:!!values.snapshot});
      const environment = await page.evaluate(() => window.__inputLatency.setup());
      if (environment.pixelRatio !== 1.5 || environment.visibility !== 'visible') throw Error('The run needs a visible page at the default 1.5× board resolution.');
      if (!values.actions) {
        const chosen = await page.evaluate(() => window.__inputLatency.chooseActions());
        validateActions(chosen);
        if (actions && JSON.stringify(actions) !== JSON.stringify(chosen)) throw Error('The same save produced different input targets. Use fixed actions.');
        actions = chosen;
      }
      run.actions = actions;
      const cdp = await context.newCDPSession(page);
      await cdp.send('Tracing.start',{transferMode:'ReturnAsStream',traceConfig:{includedCategories:['disabled-by-default-display.framedisplayed','blink.user_timing']}});
      const mark = await page.evaluate(() => performance.mark('unit-latency-clock').startTime);
      const result = { mode, environment, interactions:[], dismissedTipsBeforeActions:[] };
      for (const step of actions) {
        const {x,y} = step, button = step.kind === 'select' ? 'left' : 'right';
        if (await page.evaluate(({x,y}) => !!document.elementFromPoint(x,y)?.closest('.tutorial-card.is-tip'), step)) {
          await page.keyboard.press('Escape');
          result.dismissedTipsBeforeActions.push(result.interactions.length + 1);
        }
        await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
        await page.evaluate(() => new Promise(requestAnimationFrame));
        await page.evaluate(step => window.__inputLatency.start(step),step);
        for (const [type,buttons] of [['mousePressed',button==='left'?1:2],['mouseReleased',0]]) {
          await cdp.send('Input.dispatchMouseEvent',{type,x,y,button,buttons,clickCount:1,timestamp:Date.now()/1000});
        }
        try { await page.waitForFunction(() => window.__inputLatency.feedback(),undefined,{timeout:3500}); }
        catch {
          const detail = await page.evaluate(() => window.__inputLatency.failure());
          throw Error(`No visible feedback for action ${result.interactions.length + 1}, ${step.kind} of unit ${step.unit} at ${x},${y}. ${JSON.stringify(detail)}`);
        }
        result.interactions.push(await page.evaluate(() => window.__inputLatency.take()));
        // Each command can schedule bot preparation. Let later clicks sample that real schedule.
        await page.waitForTimeout(300);
      }
      const complete = new Promise(resolve => cdp.once('Tracing.tracingComplete',resolve));
      await cdp.send('Tracing.end');
      const {stream} = await complete;
      let raw='';
      for (;;) {
        const chunk=await cdp.send('IO.read',{handle:stream,size:1048576});
        raw += chunk.base64Encoded ? Buffer.from(chunk.data,'base64').toString('utf8') : chunk.data;
        if (chunk.eof) break;
      }
      await cdp.send('IO.close',{handle:stream});
      const trace=JSON.parse(raw).traceEvents, clock = trace.find(e => e.name === 'unit-latency-clock');
      if (!clock) throw Error('Chrome did not return the clock mark for this capture.');
      const displayed=trace.filter(e => e.name === 'Display::FrameDisplayed').map(e => (e.ts-clock.ts)/1000 + mark).sort((a,b)=>a-b);
      // A late reply can still identify whether the worker was computing during an earlier click.
      await page.waitForFunction(() => window.__inputLatency.jobs.every(job => job.reply || job.status),undefined,{timeout:5000}).catch(()=>{});
      result.botJobs=await page.evaluate(() => window.__inputLatency.jobs);
      if (mode === 'off' && result.botJobs.length) throw Error('Background planning started while disabled.');
      if (run.runs.length && JSON.stringify(run.runs[0].dismissedTipsBeforeActions) !== JSON.stringify(result.dismissedTipsBeforeActions)) {
        throw Error('Different tutorial tips covered the targets between runs. Choose fixed inputs that avoid the tip.');
      }
      for (const event of result.interactions) {
        Object.assign(event, summarizeInteraction(event, result.botJobs, displayed));
        const costs = event.ms.exclusive;
        const tracked = event.ms.handlerToDraw - event.ms.unattributed;
        const phases=Object.entries(costs).filter(([,ms]) => ms >= .1).sort((a,b) => b[1]-a[1]).map(([name,ms]) => `${name} ${ms.toFixed(1)}`).join(', ');
        console.log(`${mode}  ${event.expected.kind} ${event.expected.unit}  release to draw ${event.ms.releaseToDraw.toFixed(1)} ms  `+
          `queue ${event.ms.releaseQueue.toFixed(1)} ms  observed ${tracked.toFixed(1)} ms  `+
          `bot requests in flight ${event.botOverlap.length}  (${phases})`);
      }
      run.runs.push(result);
    } finally { await context.close(); await browser.close(); browser = undefined; }
  }
  await writeFile(values.out,JSON.stringify(run,null,2)+'\n',{flag:'wx'});
  console.log(`Wrote ${values.out}`);
} finally {
  try { await browser?.close(); } finally {
    if (http?.listening) await new Promise(resolve => http.close(resolve));
    try { await server?.close(); } finally { await rm(temporary,{recursive:true,force:true}); }
  }
}
