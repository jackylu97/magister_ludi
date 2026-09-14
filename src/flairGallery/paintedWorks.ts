import { Renderer3D } from '../render3d/renderer3d';
import { EXPLORED, VISIBLE } from '../sim/visibility';
import { createUnit, type Unit } from '../sim/state';
import { WORKS_VIEWS, createWorksFixture, type WorksView } from './worksFixture';
import { button, checkbox, controls, element, select } from './sheet';

/** The production renderer and production works layer, with inspection controls. */
export async function drawPaintedWorks(into: HTMLElement): Promise<() => void> {
  const params = new URLSearchParams(location.search);
  const requestedWork = params.get('work') ?? '';
  let focus: WorksView | 'all' | 'special' = ['all', 'special'].includes(requestedWork) || Object.prototype.hasOwnProperty.call(WORKS_VIEWS, requestedWork) ? requestedWork as WorksView | 'all' | 'special' : 'academy';
  let daylight = ['morning', 'day', 'golden', 'dusk'].includes(params.get('light') ?? '') ? params.get('light')! : 'golden';
  let detail = params.get('detail') === 'close';
  const knobs = controls(into), note = element('p', 'sheet-note');
  const stage = element('div', 'painted-works-stage'), canvas = element('canvas', 'painted-works-canvas');
  canvas.setAttribute('aria-label', 'Painted improvement review. Drag to pan; scroll to zoom.');
  const overlay = element('div', 'painted-works-labels');
  stage.append(canvas, overlay); into.append(note, stage);
  const status = element('p', 'sheet-note', 'Loading the painted world…'); status.setAttribute('role', 'status'); into.append(status);
  const state = createWorksFixture(), renderer = new Renderer3D(canvas, { minFrustum: 1.2 });
  const labels = Object.entries(WORKS_VIEWS).map(([id, view]) => {
    const node = element('span', 'painted-works-label', view.label); overlay.append(node);
    return { id, node, view };
  });
  let disposed = false, ready = false;
  const resize = new ResizeObserver(() => renderer.resize()); resize.observe(canvas);
  const listener = new AbortController(), signal = listener.signal;
  const updateURL = (): void => {
    const url = new URL(location.href);
    if (url.searchParams.get('review') !== 'works') return;
    url.searchParams.set('work', focus); url.searchParams.set('light', daylight);
    url.searchParams.set('detail', detail ? 'close' : 'game'); history.replaceState(null, '', url);
  };
  const frame = (): void => {
    if (!ready) return;
    if (focus === 'special') {
      renderer.focusOpening({ col: 7, row: 15 });
      renderer.frameCells([{ col: 3, row: 12 }, { col: 11, row: 18 }], false);
      note.textContent = 'Six special improvements, with extra hillside examples. Choose a work for a closer look.';
    } else if (focus === 'all') {
      renderer.focusOpening({ col: 9, row: 8 });
      renderer.frameCells([{ col: 3, row: 5 }, { col: 15, row: 10 }], false);
      note.textContent = 'All three improvements, beside the approved farm and city. Choose a work for a closer look.';
    } else {
      renderer.focusOpening(WORKS_VIEWS[focus]);
      if (detail) renderer.zoomBy(3.4, canvas.clientWidth / 2, canvas.clientHeight / 2);
      note.textContent = WORKS_VIEWS[focus].note;
    }
    updateURL();
  };
  select(knobs, 'Work', [['special', 'Special improvements'], ['all', 'Everyday improvements'], ...Object.entries(WORKS_VIEWS).map(([id, view]) => [id, view.label] as const)], focus, value => { focus = value as typeof focus; frame(); });
  select(knobs, 'Scale', [['game', 'Game zoom'], ['close', 'Detail']], detail ? 'close' : 'game', value => { detail = value === 'close'; frame(); });
  select(knobs, 'Light', [['morning', 'Morning'], ['day', 'Daylight'], ['golden', 'Golden hour'], ['dusk', 'Dusk']], daylight, value => { daylight = value; renderer.setDaylight(value); updateURL(); });
  checkbox(knobs, 'Labels', true, value => { overlay.hidden = !value; });
  checkbox(knobs, 'Remembered', false, value => {
    state.visibility[0]!.fill(value ? EXPLORED : VISIBLE); renderer.setGameState(state);
  });
  let visitors: Unit[] | null = null;
  checkbox(knobs, 'Units', false, value => {
    if (value) {
      if (visitors) state.units.push(...visitors);
      else visitors = ['academy', 'landmark', 'manufactory', 'customsHouse', 'citadel', 'holySite', 'academyHills', 'holySiteHills']
        .map(id => { const view = WORKS_VIEWS[id as WorksView]; return createUnit(state, 0, 'warrior', view.col, view.row); });
    } else if (visitors) {
      const ids = new Set(visitors.map(unit => unit.id)); state.units = state.units.filter(unit => !ids.has(unit.id));
    }
    renderer.setGameState(state);
  });
  button(knobs, 'Reset view', frame);
  renderer.setFrameListener(() => {
    for (const { id, node, view } of labels) {
      const p = renderer.projectCell(view.col, view.row, -.12);
      node.hidden = !p?.onScreen || (focus === 'all' ? view.row > 10 : focus === 'special' ? view.row < 12 : focus !== id);
      if (p) { node.style.left = `${p.x}px`; node.style.top = `${p.y + 35}px`; }
    }
  });
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
