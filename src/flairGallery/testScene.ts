import { Renderer3D } from '../render3d/renderer3d';
import { NO_LENS } from '../render3d/lens3d';
import {
  BORDER_STYLES, type BorderStyleKey, VISUAL_SWITCHES, formatVisualTest, setVisualTest, visualTest,
} from '../render3d/visualTest';
import type { LensView } from '../ui/mapView';
import { SCENE_VIEWS, type SceneView, createSceneFixture } from './sceneFixture';

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
 * - `still`: `1` (the default) holds the clock that moving water, clouds and
 *   pieces read, so two screenshots differ only by a switch; `0` lets it run.
 * The panel's last line gives the frame's draw calls and triangles.
 */
export async function drawTestScene(into: HTMLElement): Promise<() => void> {
  const params = new URLSearchParams(location.search);
  let view: SceneView = Object.prototype.hasOwnProperty.call(SCENE_VIEWS, params.get('view') ?? '') ? params.get('view') as SceneView : 'overview';
  let light = params.get('light') ?? 'soft';
  let still = params.get('still') !== '0';
  into.style.cssText = 'position:fixed;inset:0;margin:0;padding:0;max-width:none;width:100vw;height:100vh;background:#d7cebc';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  canvas.setAttribute('aria-label', 'The visual test scene. Drag to pan; scroll to zoom.');
  const panel = document.createElement('form');
  panel.id = 'scene-panel';
  panel.style.cssText = 'position:absolute;top:8px;left:8px;z-index:2;background:rgba(244,238,224,.94);padding:8px 10px;'
    + 'font:12px/1.5 system-ui,sans-serif;color:#2a2620;border:1px solid #2a2620;max-width:260px';
  into.append(canvas, panel);
  const renderer = new Renderer3D(canvas, { painted: true });
  const state = createSceneFixture();
  let disposed = false, ready = false;
  const resize = new ResizeObserver(() => renderer.resize()); resize.observe(canvas);

  const writeUrl = (): void => {
    const url = new URL(location.href);
    url.searchParams.set('review', 'scene'); url.searchParams.set('view', view); url.searchParams.set('light', light);
    url.searchParams.set('vtest', formatVisualTest(visualTest())); url.searchParams.set('still', still ? '1' : '0');
    history.replaceState(null, '', url);
  };
  const frame = (): void => {
    if (!ready) return;
    const target = SCENE_VIEWS[view];
    if (target.zoom === 1) {
      // The whole board, then a little closer: a small wrapping board framed
      // whole shows its wrap copies on both sides.
      renderer.frameCells(state.map.tiles.map(tile => ({ col: tile.col, row: tile.row })), false);
      renderer.zoomBy(1.75, canvas.clientWidth / 2, canvas.clientHeight / 2);
    } else {
      renderer.focusOpening({ col: target.col, row: target.row });
      renderer.zoomBy(target.zoom, canvas.clientWidth / 2, canvas.clientHeight / 2);
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
  row('Light', select('scene-light', [['soft', 'Soft afternoon'], ['morning', 'Morning'], ['day', 'Daylight'], ['golden', 'Golden hour'], ['dusk', 'Dusk']], light,
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
  renderer.setFogSeat(0);
  renderer.setGameState(state);
  const resourceCells = state.map.tiles.filter(tile => tile.resource).map(tile => ({ col: tile.col, row: tile.row }));
  renderer.setLens({ ...NO_LENS, resources: true, resourceCells, playerId: 0 } as LensView);
  ready = true;
  frame();
  document.body.dataset.sceneReady = '1';
  return dispose;
}
