/**
 * **The take in the city screen** (`docs/flags.md` (aaaaaaa)): with a town's
 * screen open, a hex another town of the same empire owns inside the open
 * town's reach is pinnable, and the hover readout's hint names the town it
 * comes from ("Take from Sinope"). The real controls decide; the renderer and
 * the window are stand-ins, as in `hoverCache.test.ts`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt, tileHex, tileIndex } from '../../src/sim/map';
import { bumpRevision } from '../../src/sim/state';
import { VISIBLE, resetVisibility } from '../../src/sim/visibility';
import { cityDisplayName } from '../../src/ui/cityDisplay';
import { createGameControls } from '../../src/ui/controls';
import type { HoverInfo, MapView } from '../../src/ui/mapView';
import { createGame } from '../sim/newGameHelpers';

/** Seat 0's capital at (3, 4) and a second town three hexes east, at (6, 4). */
function makeGame() {
  const game = createGame({ seed: 7, sizeName: 'duel', players: [
    { name: 'Ada', color: '#a00', isHuman: true },
    { name: 'Bors', color: '#00a', isHuman: true },
  ] });
  const state = game.state;
  state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
  state.units = []; state.cities = [];
  state.tileOwner = state.map.tiles.map(() => null);
  resetVisibility(state);
  const home = foundCityAt(state, 0, getTileAt(state.map, 3, 4)!);
  const next = foundCityAt(state, 0, getTileAt(state.map, 6, 4)!);
  home.population = 3;
  next.population = 3;
  resetVisibility(state);
  state.visibility.forEach((grid) => grid.fill(VISIBLE));
  bumpRevision(state);
  return { game, state, home, next };
}

/** Only the event surface, as in `hoverCache.test.ts`. */
class PointerSurface {
  private handlers = new Map<string, ((event: PointerEvent) => void)[]>();
  classList = { toggle: vi.fn() };
  addEventListener(type: string, handler: (event: PointerEvent) => void) {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler]);
  }
  getBoundingClientRect() { return { left: 0, top: 0 }; }
  setPointerCapture() {}
  hasPointerCapture() { return false; }
  releasePointerCapture() {}
  emit(type: string, props: Partial<PointerEvent> = {}) {
    const event = { button: 0, pointerId: 1, clientX: 40, clientY: 40,
      preventDefault: vi.fn(), ...props } as PointerEvent;
    this.handlers.get(type)?.forEach((handler) => handler(event));
  }
}

function fixture() {
  const current = makeGame();
  const viewport = new PointerSurface();
  vi.stubGlobal('window', { addEventListener: () => {}, setTimeout: vi.fn(() => 1),
    clearTimeout: vi.fn(), matchMedia: () => ({ matches: true }) });
  let hover: HoverInfo | null = null;
  let target: HoverInfo | null = null;
  const renderer = {
    pick: vi.fn(() => target), getHover: () => hover, setHover: (next: HoverInfo | null) => { hover = next; },
    pickUnitBadge: vi.fn(() => null), pickUnitModel: vi.fn(() => null),
    setHoveredUnitId: vi.fn(), setSelectedUnitId: vi.fn(), setReachable: vi.fn(),
    setPathPreview: vi.fn(), invalidate: vi.fn(), panByScreen: vi.fn(), zoomBy: vi.fn(),
    setFogSeat: vi.fn(), skipAnimations: vi.fn(), animateMove: vi.fn(),
  };
  const controls = createGameControls({ viewport: viewport as unknown as HTMLElement,
    renderer: renderer as unknown as MapView, getGame: () => current.game, onUpdate: vi.fn(), onHover: vi.fn(),
    lensOrder: [] });
  function point(col: number, row: number) {
    const tile = getTileAt(current.state.map, col, row)!;
    target = { tile, worldCol: col, row, axial: tileHex(tile) };
    viewport.emit('pointermove');
  }
  const click = () => { viewport.emit('pointerdown'); viewport.emit('pointerup'); };
  return { ...current, controls, point, click };
}

afterEach(() => vi.unstubAllGlobals());

describe('the take in the city screen', () => {
  it('names the town a hex comes from, and only over a hex the open town may take', () => {
    const f = fixture();
    const hex = getTileAt(f.state.map, 5, 4)!;
    expect(f.state.tileOwner[tileIndex(f.state.map, 5, 4)]).toBe(f.next.id);
    // No town open: no hint.
    f.point(5, 4);
    expect(f.controls.takeHint()).toBeNull();
    f.controls.setOpenCity(f.home.id);
    f.point(hex.col, hex.row);
    expect(f.controls.takeHint()).toBe(`Take from ${cityDisplayName(f.state, f.next)}`);
    // The open town's own hex, and the other town's centre, say nothing.
    f.point(2, 4);
    expect(f.controls.takeHint()).toBeNull();
    f.point(6, 4);
    expect(f.controls.takeHint()).toBeNull();
  });

  it('pins the hex on a click, and the pin takes it', () => {
    const f = fixture();
    f.controls.setOpenCity(f.home.id);
    f.point(5, 4);
    f.click();
    expect(f.game.log.some((command) => command.type === 'setLockedTiles')).toBe(true);
    expect(f.state.tileOwner[tileIndex(f.state.map, 5, 4)]).toBe(f.home.id);
    expect(f.home.lockedTiles).toEqual([{ col: 5, row: 4 }]);
    // Taken, it is the open town's own hex: the hint has nothing left to say.
    expect(f.controls.takeHint()).toBeNull();
  });
});
