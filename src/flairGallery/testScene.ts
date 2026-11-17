import { VIEW3D } from '../render3d/lookData';
import { Renderer3D } from '../render3d/renderer3d';
import { setUnitArtVariant } from '../render3d/paintedUnits';
import { VTEST_UNIFORMS } from '../render3d/visualTestLook';
import { NO_LENS } from '../render3d/lens3d';
import { YIELD_LIGHT_SHOWS } from '../render3d/paintedYieldLight';
import {
  BORDER_STYLES, type BorderStyleKey, VISUAL_SWITCHES, formatVisualTest, setVisualTest, visualTest,
} from '../render3d/visualTest';
import type { LensView } from '../ui/mapView';
import { SCENE_RICHNESS, SCENE_VIEWS, type SceneView, createSceneFixture, createWorksFixture } from './sceneFixture';
import { overrideNorthStarUnit } from '../render3d/northStarUnits';
import { createUnit } from '../sim/state';
import type { UnitTypeId } from '../sim/unitData';

/**
 * The visual test scene: `flair.html?review=scene`. The user, 2026-11-12: "for
 * the sake of testing, could we create a test scene that we use to render
 * changes? We don't need to wire it/measure the full game until we finish
 * iteration on these improvements."
 *
 * One fixed world (`sceneFixture.ts`) drawn full-window by the real
 * `Renderer3D`, with no game running. Every control is mirrored in the URL, so
 * a screenshot is one URL:
 * - `view`: one of `SCENE_VIEWS` (overview, coast, rivers, roads, hillsBorder,
 *   city, units, fog);
 * - `light`: morning, day, golden or dusk;
 * - `vtest`: the visual test switches, as in the game (`visualTest.ts`);
 * - `age`: 1, 2 or 3 draws the towns and the works of an earlier age (4 is the
 *   last age); without it both courts know every technology;
 * - `works`: `old` draws every work as it was before the works followed their
 *   owner's age (it turns `visualTest.works.byAge` off for this page);
 * - `yields`: how a rich hex is shown: `a` motes, `b` light on the ground, `c`
 *   shapes by yield, `structures` the sheaves, logs and stalls of before, `off`
 *   nothing (it sets `visualTest.yieldLight.show` for this page);
 * - `world`: `works` draws a second, small world where every work and every
 *   great person's work shows its real yield (`createWorksFixture`);
 * - `force`: `2` or `3` raises every hex that shows a yield light to that step;
 * - `idle`: `0` turns the small idle motion off (switch 8), to see what holds still;
 * - `towns`: `old` draws every town round the one hall of before (it turns
 *   `visualTest.town.byAge` off for this page);
 * - `still`: `1` (the default) holds the clock that moving water and
 *   pieces read, so two screenshots differ only by a switch; `0` lets it run.
 * The panel's last line gives the frame's draw calls and triangles.
 *
 * Three more, for the review of the unit pieces (2026-11-14):
 * - `nsunit`: `type:model` pairs split by commas, which draw a unit type with
 *   another north-star model. `type:old` draws today's piece, and a third
 *   part, `type:model:turn`, turns the piece about the upright (radians);
 * - `pieces`: more pieces to stand in the scene, as `col.row.type.seat` split
 *   by commas. `only` as the first entry removes the scene's own pieces, and a
 *   fifth part, `col.row.greatPerson.seat.person`, names a great person, or on a
 *   scout or a settler an alternate design, `col.row.scout.seat.b`;
 * - `at`: `col_row_zoom` centres the camera on a hex, `zoom` times closer than
 *   the game's closest. It replaces the view's own camera.
 */
export async function drawTestScene(into: HTMLElement): Promise<() => void> {
  const params = new URLSearchParams(location.search);
  let view: SceneView = Object.prototype.hasOwnProperty.call(SCENE_VIEWS, params.get('view') ?? '') ? params.get('view') as SceneView : 'overview';
  let light = params.get('light') ?? 'soft';
  let still = params.get('still') !== '0';
  // `sea=1..5` picks the open water's pattern (`visualTest.coast.open.pattern`), to compare them.
  const pattern = Number(params.get('sea'));
  if (pattern >= 1 && pattern <= 5) VTEST_UNIFORMS.vtestSeaPattern.value = pattern;
  into.style.cssText = 'position:fixed;inset:0;margin:0;padding:0;max-width:none;width:100vw;height:100vh;background:#d7cebc';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  canvas.setAttribute('aria-label', 'The visual test scene. Drag to pan; scroll to zoom.');
  const panel = document.createElement('form');
  panel.id = 'scene-panel';
  panel.style.cssText = 'position:absolute;top:8px;left:8px;z-index:2;background:rgba(244,238,224,.94);padding:8px 10px;'
    + 'font:12px/1.5 system-ui,sans-serif;color:#2a2620;border:1px solid #2a2620;max-width:260px';
  into.append(canvas, panel);
  const renderer = new Renderer3D(canvas, { painted: true, minFrustum: 1.4 });
  // `mirror=0` leaves out, and `mirror=all` reflects the whole scene and not only the pieces. It is the sea's mirror pass (`seaMirror.ts`), to compare its cost and its look.
  renderer.mirrorOn = params.get('mirror') !== '0';
  renderer.mirrorAll = params.get('mirror') === 'all';
  const age = Number(params.get('age'));
  const aged = age >= 1 && age <= 4;
  // Before the renderer is made: the works layer reads the switch when it draws.
  if (params.get('works') === 'old') VIEW3D.visualTest.works.byAge = false;
  if (params.get('towns') === 'old') VIEW3D.visualTest.town.byAge = false;
  // `yields` picks how a rich hex is shown, as `visualTest.yieldLight.show` does.
  if (params.get('idle') === '0') setVisualTest({ idle: false });
  const yieldShow = params.get('yields');
  if (yieldShow && (YIELD_LIGHT_SHOWS as readonly string[]).includes(yieldShow)) VIEW3D.visualTest.yieldLight.show = yieldShow;
  // `world=works` draws the small world of works at their real yields (`createWorksFixture`); use `at` to frame it.
  const worksWorld = params.get('world') === 'works';
  const state = worksWorld ? createWorksFixture(aged ? age : undefined) : createSceneFixture(aged ? age : undefined);
  for (const pair of (params.get('nsunit') ?? '').split(',').filter(Boolean)) {
    const [type, model, turn] = pair.split(':');
    overrideNorthStarUnit(type!, model === 'old' ? null : model!, turn === undefined ? undefined : Number(turn));
  }
  for (const entry of (params.get('pieces') ?? '').split(',').filter(Boolean)) {
    if (entry === 'only') { state.units = []; continue; }
    // A fifth part names a great person, so each family's piece can stand in the scene. On a scout or a settler it
    // names an alternate design (`b`, `c` or `d`).
    const [col, row, type, seat, fifth] = entry.split('.');
    const person = type === 'greatPerson' ? fifth as Parameters<typeof createUnit>[5] : undefined;
    const unit = createUnit(state, Number(seat), type as UnitTypeId, Number(col), Number(row), person);
    if (fifth && type !== 'greatPerson') setUnitArtVariant(unit, fifth);
  }
  const at = (params.get('at') ?? '').split('_').map(Number);
  let disposed = false, ready = false;
  const resize = new ResizeObserver(() => renderer.resize()); resize.observe(canvas);

  const writeUrl = (): void => {
    const url = new URL(location.href);
    url.searchParams.set('review', 'scene'); url.searchParams.set('view', view); url.searchParams.set('light', light);
    if (aged) url.searchParams.set('age', String(age));
    url.searchParams.set('vtest', formatVisualTest(visualTest())); url.searchParams.set('still', still ? '1' : '0');
    history.replaceState(null, '', url);
  };
  const frame = (): void => {
    if (!ready) return;
    const target = SCENE_VIEWS[view];
    if (at.length === 3 && at.every(Number.isFinite)) {
      renderer.focusOpening({ col: at[0]!, row: at[1]! });
      renderer.zoomBy(1e-6, canvas.clientWidth / 2, canvas.clientHeight / 2);
      renderer.zoomBy(VIEW3D.camera.maxFrustum / VIEW3D.camera.minFrustum * at[2]!, canvas.clientWidth / 2, canvas.clientHeight / 2);
    } else if (target.zoom === 1) {
      // The whole board, then a little closer: a small wrapping board framed
      // whole shows its wrap copies on both sides.
      renderer.frameCells(state.map.tiles.map(tile => ({ col: tile.col, row: tile.row })), false);
      renderer.zoomBy(1.75, canvas.clientWidth / 2, canvas.clientHeight / 2);
    } else {
      renderer.focusOpening({ col: target.col, row: target.row });
      // The scene's camera comes closer than the game's, so a view names its
      // own distance: out to the far limit, then in to the game's closest zoom,
      // or closer still for the views of one town.
      const far = VIEW3D.camera.maxFrustum, near = target.zoom >= 9 ? 2.6 : VIEW3D.camera.minFrustum;
      renderer.zoomBy(1e-6, canvas.clientWidth / 2, canvas.clientHeight / 2);
      renderer.zoomBy(far / near, canvas.clientWidth / 2, canvas.clientHeight / 2);
    }
    writeUrl();
  };

  const row = (label: string, control: HTMLElement): void => {
    const wrap = document.createElement('label');
    wrap.style.cssText = 'display:flex;gap:6px;align-items:center;margin:2px 0';
    wrap.append(control, label);
    panel.append(wrap);
  };
  const select = (id: string, options: readonly (readonly [string, string])[], value: string, onChange: (value: string) => void): HTMLSelectElement => {
    const element = document.createElement('select');
    element.id = id;
    for (const [key, text] of options) { const option = document.createElement('option'); option.value = key; option.textContent = text; element.append(option); }
    element.value = value;
    element.onchange = () => { onChange(element.value); writeUrl(); };
    return element;
  };
  const title = document.createElement('strong'); title.textContent = 'Visual test scene'; panel.append(title);
  row('View', select('scene-view', Object.entries(SCENE_VIEWS).map(([key, one]) => [key, one.label] as const), view, value => { view = value as SceneView; frame(); }));
  row('Light', select('scene-light', [['soft', 'Soft afternoon'], ['tinted', 'Soft, violet shade'], ['morning', 'Morning'], ['day', 'Daylight'], ['golden', 'Golden hour'], ['dusk', 'Dusk']], light,
    value => { light = value; renderer.setDaylight(value); }));
  const hold = document.createElement('input'); hold.type = 'checkbox'; hold.id = 'scene-still'; hold.checked = still;
  hold.onchange = () => { still = hold.checked; renderer.setClock(still ? 12 : null); writeUrl(); };
  row('Hold the clock', hold);
  const tested = visualTest();
  for (const def of VISUAL_SWITCHES) {
    const box = document.createElement('input'); box.type = 'checkbox'; box.checked = tested[def.key]; box.dataset.vtest = String(def.id);
    box.onchange = () => { setVisualTest({ [def.key]: box.checked }); writeUrl(); };
    row(`${def.id}. ${def.label}`, box);
    if (def.key === 'borders') row('border style', select('scene-border', BORDER_STYLES.map(style => [style.key, style.label] as const), tested.border,
      value => setVisualTest({ border: value as BorderStyleKey })));
  }
  const cost = document.createElement('p'); cost.id = 'scene-cost'; cost.style.margin = '4px 0 0';
  const measure = document.createElement('button'); measure.type = 'button'; measure.id = 'scene-measure'; measure.textContent = 'Measure';
  measure.onclick = () => {
    renderer.invalidate();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const s = renderer.stats;
      cost.textContent = `${s.drawCalls} draws · ${s.triangles} triangles`;
    }));
  };
  panel.append(measure, cost);

  // Drag to pan, scroll to zoom, as on the board.
  let drag: { id: number; x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', event => { drag = { id: event.pointerId, x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    renderer.panByScreen(event.clientX - drag.x, event.clientY - drag.y); drag.x = event.clientX; drag.y = event.clientY;
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', event => {
    event.preventDefault(); const bounds = canvas.getBoundingClientRect();
    renderer.zoomBy(Math.exp(-event.deltaY * .0015), event.clientX - bounds.left, event.clientY - bounds.top);
  }, { passive: false });

  const dispose = (): void => { if (disposed) return; disposed = true; resize.disconnect(); renderer.dispose(); };
  window.addEventListener('pagehide', dispose, { once: true });
  await renderer.enablePaintedLook(light);
  if (disposed) return dispose;
  renderer.setDaylight(light);
  renderer.setClock(still ? 12 : null);
  // For a capture script: it sets the held clock frame by frame, so a recording has an even frame rate.
  (window as unknown as { sceneClock?: (seconds: number | null) => void }).sceneClock = seconds => renderer.setClock(seconds);
  // And the cost of the last frame: draw calls, triangles and the milliseconds the CPU took to submit it.
  // And what the light of the rich hexes shows, by `col,row`, to check a view against the yield rules.
  (window as unknown as { sceneYields?: () => Record<string, unknown> }).sceneYields = () => Object.fromEntries([...renderer.yieldLightShown].map(([cell, hex]) => [`${cell % state.map.width},${Math.floor(cell / state.map.width)}`, hex]));
  (window as unknown as { sceneCost?: () => { drawCalls: number; triangles: number; ms: number } }).sceneCost = () => ({ drawCalls: renderer.stats.drawCalls, triangles: renderer.stats.triangles, ms: renderer.lastFrameMs });
  renderer.setFogSeat(0);
  // `force=2` or `force=3` raises every hex that shows to that step, to see the look of a step the land alone does not reach.
  const forced = Number(params.get('force'));
  if (forced === 2 || forced === 3) renderer.setYieldLightForcedStep(forced);
  if (!worksWorld) renderer.setRichnessShowcase(new Map(SCENE_RICHNESS.map(([col, row, kind, step, second]) => [row * state.map.width + col,
    { kind, step, ...(second ? { second: { kind: second, step: Math.max(1, step - 1) } } : {}) }])));
  renderer.setGameState(state);
  const resourceCells = state.map.tiles.filter(tile => tile.resource).map(tile => ({ col: tile.col, row: tile.row }));
  renderer.setLens({ ...NO_LENS, resources: true, resourceCells, playerId: 0 } as LensView);
  ready = true;
  frame();
  document.body.dataset.sceneReady = '1';
  return dispose;
}
