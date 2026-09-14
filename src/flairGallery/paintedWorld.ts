import { Renderer3D } from '../render3d/renderer3d';
import { EXPLORED, HIDDEN, VISIBLE } from '../sim/visibility';
import { discoveryKindTech } from '../sim/discoveryData';
import { createWorldFixture, WORLD_VIEWS, type WorldView } from './worldFixture';
import { button, checkbox, controls, element, select } from './sheet';

/** Real game layers in a small, isolated world for the visual checkpoint. */
export async function drawPaintedWorld(into: HTMLElement): Promise<() => void> {
  const params = new URLSearchParams(location.search);
  let focus: WorldView = Object.prototype.hasOwnProperty.call(WORLD_VIEWS, params.get('view') ?? '') ? params.get('view') as WorldView : 'borders';
  let daylight = params.get('light') ?? 'golden', detail = params.get('detail') === 'close';
  const knobs = controls(into), stage = element('div', 'painted-works-stage'), canvas = element('canvas', 'painted-works-canvas');
  canvas.setAttribute('aria-label', 'Roads, discoveries and borders. Drag to pan; scroll to zoom.');
  stage.append(canvas); into.append(stage);
  const status = element('p', 'sheet-note', 'Loading the painted world…'); status.setAttribute('role', 'status'); into.append(status);
  const state = createWorldFixture(), renderer = new Renderer3D(canvas, { minFrustum: 1.2 });
  let disposed = false, ready = false;
  const resize = new ResizeObserver(() => renderer.resize()); resize.observe(canvas);
  const listener = new AbortController(), signal = listener.signal;
  const updateURL = (): void => {
    const url = new URL(location.href); url.searchParams.set('view', focus); url.searchParams.set('light', daylight);
    url.searchParams.set('detail', detail ? 'close' : 'game'); history.replaceState(null, '', url);
  };
  const frame = (): void => {
    if (!ready) return;
    renderer.focusOpening(WORLD_VIEWS[focus]);
    if (detail) renderer.zoomBy(2.8, canvas.clientWidth / 2, canvas.clientHeight / 2);
    updateURL();
  };
  select(knobs, 'View', Object.entries(WORLD_VIEWS).map(([id, view]) => [id, view.label] as const), focus, value => { focus = value as WorldView; frame(); });
  select(knobs, 'Scale', [['game', 'Game zoom'], ['close', 'Detail']], detail ? 'close' : 'game', value => { detail = value === 'close'; frame(); });
  select(knobs, 'Light', [['morning', 'Morning'], ['day', 'Daylight'], ['golden', 'Golden hour'], ['dusk', 'Dusk']], daylight, value => { daylight = value; renderer.setDaylight(value); updateURL(); });
  select(knobs, 'Visibility', [['visible', 'Visible'], ['explored', 'Remembered'], ['hidden', 'Uncharted']], 'visible', value => {
    state.visibility[0]!.fill(value === 'hidden' ? HIDDEN : value === 'explored' ? EXPLORED : VISIBLE); renderer.setGameState(state);
  });
  checkbox(knobs, 'Antiquities revealed', true, value => {
    const tech = discoveryKindTech('antiquity'); if (!tech) return;
    const player = state.players[0]!; player.techsResearched = player.techsResearched.filter(id => id !== tech);
    if (value) player.techsResearched.push(tech); renderer.setGameState(state);
  });
  // These controls change only this inspection fixture, never a saved game.
  checkbox(knobs, 'Road junction intact', true, value => {
    const tile = state.map.tiles[9 * state.map.width + 9]!;
    if (value) tile.road = 0; else delete tile.road; renderer.setGameState(state);
  });
  checkbox(knobs, 'Ruins unclaimed', true, value => {
    const tile = state.map.tiles[12 * state.map.width + 5]!;
    if (value) tile.discovery = 'ruins'; else delete tile.discovery; renderer.setGameState(state);
  });
  checkbox(knobs, 'Separate empires', true, value => {
    state.cities[1]!.ownerId = value ? 1 : 0; renderer.setGameState(state);
  });
  button(knobs, 'Reset view', frame);
  let drag: { id: number; x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId);
  }, { signal });
  canvas.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    renderer.panByScreen(event.clientX - drag.x, event.clientY - drag.y);
    drag.x = event.clientX; drag.y = event.clientY;
  }, { signal });
  canvas.addEventListener('lostpointercapture', () => { drag = null; }, { signal });
  canvas.addEventListener('pointerup', event => { drag = null; canvas.releasePointerCapture(event.pointerId); }, { signal });
  canvas.addEventListener('wheel', event => {
    event.preventDefault(); const bounds = canvas.getBoundingClientRect();
    renderer.zoomBy(Math.exp(-event.deltaY * .0015), event.clientX - bounds.left, event.clientY - bounds.top);
  }, { passive: false, signal });
  const dispose = (): void => {
    if (disposed) return; disposed = true;
    listener.abort(); resize.disconnect(); renderer.dispose();
  };
  window.addEventListener('pagehide', dispose, { once: true, signal });
  try {
    await renderer.enablePaintedLook(daylight);
    if (disposed) return dispose;
    renderer.setDaylight(daylight); renderer.setFogSeat(0); renderer.setGameState(state); ready = true; frame();
    status.textContent = 'Drag to pan · scroll to zoom. This inspection world uses the main game renderer; your saved game is separate.';
  } catch (error) {
    status.textContent = `The review could not load: ${error instanceof Error ? error.message : String(error)}`;
    dispose();
  }
  return dispose;
}
