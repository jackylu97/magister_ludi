import { createSceneFixture, SCENE_VIEWS } from '../../src/flairGallery/sceneFixture';
import { Renderer3D } from '../../src/render3d/renderer3d';
import { newGame } from '../../src/sim/state';
import { paintedUnitSupport } from '../../src/render3d/paintedUnitPlacement';
import { samplePaintedWorld } from '../../src/render3d/paintedSurface';
import { NO_LENS } from '../../src/render3d/lens3d';
import { closeGroundBaseSheet } from '../../src/render3d/closeGroundPaint';
import { groundPaintPlan } from '../../src/render3d/groundPaint';
import { VIEW3D } from '../../src/render3d/lookData';

const canvas = document.querySelector('canvas');
const status = document.querySelector('output');
const frame = () => new Promise(requestAnimationFrame);
const shots = {};
const results = [];

async function run() {
  const params = new URLSearchParams(location.search);
  const mapSize = params.get('size');
  const size = mapSize === 'standard' || mapSize === 'giant' ? mapSize : null;
  const shippingBase = size !== null && params.get('base') === 'shipping';
  if (params.get('workers') === '1') VIEW3D.painted.build.workers = 1;
  const r = new Renderer3D(canvas, { painted: true, closeGround: !shippingBase });
  r.setClock(100);
  r.setFogSeat(null);
  r.setLens(NO_LENS);
  const state = size ? newGame({
    seed: 42, sizeName: size, players: [
      { name: 'West', color: '#714291', isHuman: true },
      { name: 'East', color: '#b34e37', isHuman: true },
    ],
  }) : createSceneFixture();
  const sheet = closeGroundBaseSheet();
  const planFor = (width, height) => groundPaintPlan(width, height, r.renderer.capabilities.maxTextureSize, sheet);
  await r.enablePaintedLook('soft');
  await r.preparePaintedMap(state.map, (percent, stage) => {
    status.textContent = document.title = stage + ' ' + Math.round(percent) + '%';
  });
  status.textContent = document.title = 'Baking ground';
  r.setGameState(state);
  const g = r.paintedBoard.groundPaint;
  while (g.pending) await frame();
  if (!g.ready) throw Error('Base bake failed');
  const period = g.plan.period;
  const close = r.closeGround;
  const heightBounds = close?.heights;
  const comparisons = {};
  const unit = state.units.find(u => r.paintedUnits?.resolve(u, 'grassland')?.contacts.length);
  const unitModel = unit && r.paintedUnits.resolve(unit, 'grassland');
  function sampleView() {
    const picks = [];
    for (let row = 1;row <= 5;row++) {
      for (let col = 1;col <= 7;col++) {
        const hit = r.pick(canvas.clientWidth * col / 8, canvas.clientHeight * row / 6);
        picks.push(hit ? [hit.worldCol, hit.row] : null);
      }
    }
    const supports = [];
    for (const dx of [-2, -1, 0, 1, 2]) {
      const x = r.view.target.x + dx, z = r.view.target.z;
      if (unitModel) {
        const ground = samplePaintedWorld(state.map, x, z);
        if (ground !== undefined) supports.push(paintedUnitSupport(state.map, unitModel, x, z, ground, true));
      }
    }
    return { picks, supports };
  }
  async function capture(name) {
    r.redraw();
    await frame();
    r.redraw();
    await frame();
    shots[name] = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }
  async function check(name, wantClose = true) {
    r.closeGroundCut = false;
    r.redraw();
    let cut = 0, count = 0, gap = 0;
    const start = performance.now();
    let last = start;
    let mode;
    do {
      const now = await frame();
      if (count) gap = Math.max(gap, now - last);
      last = now;
      mode = close.mode;
      if (mode === 'cut') cut++;
      r.redraw();
      count++;
      if (performance.now() - start > 90000) throw Error('Refill timed out at ' + name);
    } while (wantClose && (close.pending || mode !== 'close'));
    results.push({ name, mode, cut, frames: count, ms: Math.round(performance.now() - start), maxFrameGapMs: Math.round(gap) });
  }
  function compare(name, a, b) {
    comparisons[name] = {
      picks: a.picks.filter(Boolean).length,
      matchingPicks: JSON.stringify(a.picks) === JSON.stringify(b.picks),
      supports: a.supports.length,
      maxHeightDifference: Math.max(0, ...a.supports.map((height, i) => Math.abs(height - b.supports[i]))),
    };
  }
  function focus(col, row) {
    r.focusOpening({ col, row });
    r.view.frustum = r.view.minFrustum;
    r.view.normalize();
    r.view.apply();
  }
  const middle = state.map.tiles.filter(t => t.row > 5 && t.row < state.map.height - 5)
    .sort((a, b) => Math.abs(a.row - state.map.height / 2) - Math.abs(b.row - state.map.height / 2));
  const views = size ? {
    shore: middle.find(t => t.terrain === 'coast'),
    river: middle.find(t => t.riverEdges),
    hill: middle.find(t => t.hills),
  } : { shore: SCENE_VIEWS.shore, river: SCENE_VIEWS.rivers, hill: SCENE_VIEWS.hillsBorder };
  if (size) {
    const tile = middle.find(t => t.hills && t.riverEdges) ?? views.river;
    focus(tile.col, tile.row);
    r.view.frustum *= 4.25;
    r.view.normalize();
    r.view.apply();
    await capture('wide');
    if (shippingBase) {
      const report = { map: [state.map.width, state.map.height], camera: [tile.col, tile.row], plan: g.plan, bake: g.info };
      window.trialReport = report;
      if (window.finishTrial) await window.finishTrial(report, shots);
      else {
        canvas.replaceWith(Object.assign(document.createElement('img'), { src: URL.createObjectURL(shots.wide), alt: 'Shipping ground texture at wide zoom' }));
        status.textContent = 'Shipping ground texture at ' + g.plan.density.toFixed(2) + ' texels per world unit';
      }
      r.dispose();
      return report;
    }
  }
  for (const [name, tile] of Object.entries(views)) {
    status.textContent = name;
    focus(tile.col, tile.row);
    r.closeGroundCut = true;
    await capture(name + '-cut');
    const before = sampleView();
    await check(name);
    await capture(name + '-close');
    compare(name, before, sampleView());
  }
  const pan = async (name, dx) => {
    r.view.target.x += dx;
    r.view.normalize();
    r.view.apply();
    await check(name);
  };
  await pan('small pan', 0.5);
  await pan('two-unit refill', 2);
  await pan('fast drag', 9);
  focus(0, 9);
  await check('jump to seam');
  r.view.target.x = period - .25;
  r.view.normalize();
  r.view.apply();
  await check('cross seam');
  await capture('seam-close');
  const seam = sampleView();
  r.closeGroundCut = true;
  await capture('seam-cut');
  compare('seam', seam, sampleView());
  r.view.frustum *= 2;
  r.view.apply();
  await check('zoom out', false);
  const gpu = r.renderer.getContext();
  const ext = gpu.getExtension('WEBGL_debug_renderer_info');
  const report = {
    gpu: gpu.getParameter(ext?.UNMASKED_RENDERER_WEBGL ?? gpu.RENDERER),
    viewport: [canvas.clientWidth, canvas.clientHeight],
    buffer: [canvas.width, canvas.height],
    map: [state.map.width, state.map.height], plan: g.plan, bake: g.info,
    heightBounds, comparisons, unitModel: unit?.type, results, nearBytes: close.bytes,
    standard: planFor(80, 52), giant: planFor(180, 112),
  };
  window.trialReport = report;
  if (window.finishTrial) await window.finishTrial(report, shots);
  r.dispose();
  const main = document.querySelector('main');
  if (main) {
    if (size) {
      const wide = document.createElement('a');
      wide.href = URL.createObjectURL(shots.wide);
      wide.download = size + '-wide.png';
      wide.textContent = 'Download the wide view at ' + g.plan.density.toFixed(2) + ' texels per world unit';
      main.append(wide);
    }
    for (const name of ['shore', 'river', 'hill', 'seam']) {
      const section = document.createElement('section');
      const heading = document.createElement('h2');
      heading.textContent = name[0].toUpperCase() + name.slice(1);
      section.append(heading);
      for (const variant of ['cut', 'close']) {
        const figure = document.createElement('figure');
        const caption = document.createElement('figcaption');
        caption.textContent = variant === 'cut' ? 'Cut mesh' : 'Local texture at 64 texels per world unit';
        const link = document.createElement('a');
        link.href = URL.createObjectURL(shots[name + '-' + variant]);
        link.download = name + '-' + variant + '.png';
        const image = document.createElement('img');
        image.src = link.href;
        image.alt = name + ' with ' + caption.textContent;
        link.append(image);
        figure.append(caption, link);
        section.append(figure);
      }
      main.append(section);
    }
    canvas.remove();
    status.remove();
    main.hidden = false;
  }
  return report;
}
async function runSelected() {
  if (new URLSearchParams(location.search).get('allocation') === 'giant') {
    const { checkGiantAllocation } = await import('./close-ground-allocation.js');
    const report = await checkGiantAllocation(canvas);
    status.textContent = 'Giant targets passed. Estimated peak ' + (report.peakBytes / 1048576).toFixed(1) + ' MiB.';
    window.trialReport = report;
    if (window.finishTrial) await window.finishTrial(report, {});
    return;
  }
  await run();
}
runSelected().then(() => {
  window.captureDone = true;
  document.title = 'Trial complete';
}).catch(error => {
  status.textContent = String(error);
  document.title = String(error);
  window.captureDone = false;
  console.error(error);
});
