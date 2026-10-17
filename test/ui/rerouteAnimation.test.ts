/**
 * **A march that went round a blocked hex slides along the cells it walked**
 * (`docs/flags.md` (xxxxxx) part 3).
 *
 * The board animates a march along the route the player was shown, cut at
 * wherever the piece stopped (`walkedPrefix`). A detour walks cells that route
 * never showed, so the cut found nothing and the piece jumped to where it
 * stopped. The simulation now names the cells a detour walked
 * (`CommandResult.reroutes`), and the controls slide the piece along those.
 *
 * Two halves. The fresh order is driven through the real controls with a stub
 * renderer (`unitPointer.test.ts`' harness, cut down to what a move needs).
 * The end of turn is read from the source, as `civilianCapture.test.ts` reads
 * its gesture, because driving End Turn needs the whole page.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Tile, createMap, getTile, getTileAt, tileHex } from '../../src/sim/map';
import { createUnit } from '../../src/sim/state';
import { VISIBLE, resetVisibility } from '../../src/sim/visibility';
import { createGameControls } from '../../src/ui/controls';
import type { HoverInfo, MapView } from '../../src/ui/mapView';
import { createGame } from '../sim/newGameHelpers';
import { braceBody, uiSource } from './sourceHelpers';

afterEach(() => vi.unstubAllGlobals());

/** Only the event surface the pointer reads. */
class Surface {
  private handlers = new Map<string, ((event: PointerEvent) => void)[]>();
  private captured = new Set<number>();
  classList = { toggle: vi.fn() };
  addEventListener(type: string, handler: (event: PointerEvent) => void) {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler]);
  }
  getBoundingClientRect() {
    return { left: 0, top: 0 };
  }
  setPointerCapture(id: number) {
    this.captured.add(id);
  }
  hasPointerCapture(id: number) {
    return this.captured.has(id);
  }
  releasePointerCapture(id: number) {
    this.captured.delete(id);
  }
  emit(type: string, props: Partial<PointerEvent> = {}) {
    const event = { button: 0, pointerId: 1, clientX: 40, clientY: 40, preventDefault: vi.fn(), ...props } as PointerEvent;
    this.handlers.get(type)?.forEach((handler) => handler(event));
  }
}

/**
 * A warrior on `P` sent to `G`, three hexes east. The straight route's first
 * hex `X` is a forest, which costs both of the warrior's points, and another
 * warrior of the same seat stands on it. Hills everywhere off the line make
 * the straight route the cheapest, so it is the route the player is shown,
 * and the walk has to go round `X`.
 */
function board() {
  const game = createGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Bors', color: '#00a', isHuman: true },
    ],
  });
  const state = game.state;
  state.map = createMap({ width: 12, height: 9, terrain: 'grassland' });
  state.units = [];
  state.cities = [];
  state.tileOwner = state.map.tiles.map(() => null);
  resetVisibility(state);
  const along = (tile: Tile, steps: number): Tile =>
    getTile(state.map, { q: tileHex(tile).q + steps, r: tileHex(tile).r })!;
  const p = getTileAt(state.map, 3, 4)!;
  const x = along(p, 1);
  const goal = along(p, 3);
  const line = [p, x, along(p, 2), goal];
  for (const tile of state.map.tiles) {
    if (!line.some((one) => one.col === tile.col && one.row === tile.row)) tile.hills = true;
  }
  x.feature = 'forest';
  const warrior = createUnit(state, 0, 'warrior', p.col, p.row);
  createUnit(state, 0, 'warrior', x.col, x.row);
  resetVisibility(state);
  state.visibility.forEach((grid) => grid.fill(VISIBLE));
  return { game, state, warrior, x, goal };
}

function controlsOn(f: ReturnType<typeof board>) {
  const viewport = new Surface();
  vi.stubGlobal('window', {
    addEventListener: () => {},
    setTimeout: vi.fn(() => 1),
    clearTimeout: vi.fn(),
    matchMedia: () => ({ matches: false }),
  });
  let hover: HoverInfo | null = null;
  let target: HoverInfo | null = null;
  const renderer = {
    pick: vi.fn(() => target),
    getHover: () => hover,
    setHover: (next: HoverInfo | null) => {
      hover = next;
    },
    pickUnitBadge: vi.fn(() => null),
    pickUnitModel: vi.fn(() => null),
    setHoveredUnitId: vi.fn(),
    setSelectedUnitId: vi.fn(),
    setReachable: vi.fn(),
    setPathPreview: vi.fn(),
    invalidate: vi.fn(),
    panByScreen: vi.fn(),
    setFogSeat: vi.fn(),
    skipAnimations: vi.fn(),
    animateMove: vi.fn(),
  };
  const controls = createGameControls({
    viewport: viewport as unknown as HTMLElement,
    renderer: renderer as unknown as MapView,
    getGame: () => f.game,
    onUpdate: vi.fn(),
    onHover: vi.fn(),
    lensOrder: [],
    inputBlocked: () => false,
    onToggleTechTree: () => {},
  });
  const point = (tile: Tile) => {
    target = { tile, worldCol: tile.col, row: tile.row, axial: tileHex(tile) };
    viewport.emit('pointermove');
  };
  return { viewport, renderer, controls, point };
}

describe('a march that went round a blocked hex', () => {
  it('slides along the cells the detour walked, not the route the player was shown', () => {
    const f = board();
    const ui = controlsOn(f);
    const from = { col: f.warrior.col, row: f.warrior.row };
    ui.controls.selectPiece(f.warrior.id);
    ui.controls.setMoveMode(true);
    ui.point(f.goal);
    ui.viewport.emit('pointerdown');
    ui.viewport.emit('pointerup');
    // The order was accepted and the warrior went round `X`.
    expect(f.game.log.filter((command) => command.type === 'moveUnit')).toHaveLength(1);
    expect({ col: f.warrior.col, row: f.warrior.row }).not.toEqual(from);
    expect({ col: f.warrior.col, row: f.warrior.row }).not.toEqual({ col: f.x.col, row: f.x.row });
    // And the board was told to slide it, ending where it stands. Before, the
    // cut of the shown route found nothing and the piece jumped there.
    expect(ui.renderer.animateMove).toHaveBeenCalledTimes(1);
    const [unitId, start, walked] = ui.renderer.animateMove.mock.calls[0]! as [
      number,
      { col: number; row: number },
      { col: number; row: number }[],
    ];
    expect(unitId).toBe(f.warrior.id);
    expect(start).toEqual(from);
    expect(walked.length).toBeGreaterThan(0);
    expect(walked[walked.length - 1]).toEqual({ col: f.warrior.col, row: f.warrior.row });
    expect(walked.some((cell) => cell.col === f.x.col && cell.row === f.x.row)).toBe(false);
  });

  it('hands the resolution’s detours to the end-of-turn slide', () => {
    const controls = uiSource('controls.ts');
    const slide = braceBody(controls, 'function animateResolvedMarches(');
    expect(slide).toContain('reroutes.find((report) => report.unitId === order.id)');
    expect(slide).toContain('rerouted?.walked ?? walkedPrefix(order.route');
    expect(controls).toContain('animateResolvedMarches(orders, result.reroutes);');
  });
});
