/**
 * The hover work is skipped when the pointer stays in one hex and nothing it
 * reads has changed (browser performance audit 2026-10-06, finding 4).
 *
 * `refreshHover` in `controls.ts` runs on every pointer move, at 60 to 120 a
 * second. The path search, the combat forecast and the tile readout (the
 * `onHover` listener) only depend on the hovered hex and the facts in
 * `hoverWorkKey`, so a move that changes neither is skipped. These tests count
 * the two observable kinds of work, `renderer.setPathPreview` and `onHover`,
 * and pin each fact that must make the work run again: if one is dropped from
 * the key, the readout goes stale until the pointer crosses into another hex.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatch } from '../../src/sim/game';
import { createMap, getTileAt, tileHex } from '../../src/sim/map';
import { bumpRevision, createUnit } from '../../src/sim/state';
import { foundCityAt } from '../../src/sim/cities';
import { VISIBLE, resetVisibility } from '../../src/sim/visibility';
import { createGameControls } from '../../src/ui/controls';
import type { HoverInfo, MapView } from '../../src/ui/mapView';
import { braceBody, uiSource } from './sourceHelpers';
import { createGame } from '../sim/newGameHelpers';

/** A two-seat game on a blank grassland board, everything in sight. */
function makeGame() {
  const game = createGame({ seed: 7, sizeName: 'duel', players: [
    { name: 'Ada', color: '#a00', isHuman: true },
    { name: 'Bors', color: '#00a', isHuman: true },
  ] });
  const state = game.state;
  state.map = createMap({ width: 12, height: 10, terrain: 'grassland' });
  state.units = []; state.cities = [];
  state.tileOwner = state.map.tiles.map(() => null);
  resetVisibility(state);
  const soldier = createUnit(state, 0, 'warrior', 3, 3);
  const other = createUnit(state, 0, 'scout', 6, 6);
  resetVisibility(state);
  state.visibility.forEach((grid) => grid.fill(VISIBLE));
  bumpRevision(state);
  return { game, state, soldier, other };
}

/** Only the event surface, as in `unitPointer.test.ts`: the real controls decide everything. */
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
  let current = makeGame();
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
  const onHover = vi.fn();
  const controls = createGameControls({ viewport: viewport as unknown as HTMLElement,
    renderer: renderer as unknown as MapView, getGame: () => current.game, onUpdate: vi.fn(), onHover,
    lensOrder: [] });
  /** Points at a hex and sends one pointer move; `x` wobbles inside the hex. */
  function point(col: number, row: number, x = 40) {
    const tile = getTileAt(current.game.state.map, col, row)!;
    target = { tile, worldCol: col, row, axial: tileHex(tile) };
    viewport.emit('pointermove', { clientX: x });
  }
  /** How much hover work ran since the last call. */
  function work() {
    const done = { paths: renderer.setPathPreview.mock.calls.length, readouts: onHover.mock.calls.length };
    renderer.setPathPreview.mockClear();
    onHover.mockClear();
    return done;
  }
  return {
    get state() { return current.state; },
    get game() { return current.game; },
    get soldier() { return current.soldier; },
    get other() { return current.other; },
    replaceGame() { current = makeGame(); },
    viewport, renderer, controls, onHover, point, work,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('hover work over one hex', () => {
  it('runs once for a hex and not again while the pointer wobbles inside it', () => {
    const f = fixture();
    f.controls.selectPiece(f.soldier.id);
    f.work();
    f.point(6, 3);
    expect(f.work()).toEqual({ paths: 1, readouts: 1 });
    for (const x of [41, 42, 43, 44, 45]) f.point(6, 3, x);
    expect(f.work()).toEqual({ paths: 0, readouts: 0 });
  });

  it('runs again for a new hex', () => {
    const f = fixture();
    f.controls.selectPiece(f.soldier.id);
    f.point(6, 3);
    f.work();
    f.point(7, 3);
    expect(f.work()).toEqual({ paths: 1, readouts: 1 });
  });

  it('still asks which piece is under the pointer on every move, since that is picked by pixel', () => {
    const f = fixture();
    f.point(6, 3);
    const before = f.renderer.pickUnitModel.mock.calls.length + f.renderer.pickUnitBadge.mock.calls.length;
    f.point(6, 3, 41);
    const after = f.renderer.pickUnitModel.mock.calls.length + f.renderer.pickUnitBadge.mock.calls.length;
    expect(after).toBeGreaterThan(before);
  });
});

describe('what makes the hover work run again over the same hex', () => {
  /** Hover a hex, settle, apply `change`, and move inside the same hex again. */
  function rerunsAfter(change: (f: ReturnType<typeof fixture>) => void, select = true) {
    const f = fixture();
    if (select) f.controls.selectPiece(f.soldier.id);
    f.point(6, 3);
    f.point(6, 3, 41);
    f.work();
    change(f);
    f.work();
    f.point(6, 3, 42);
    return f.work();
  }

  it('an accepted command (the revision moves)', () => {
    expect(rerunsAfter((f) => {
      const result = dispatch(f.game, { type: 'moveUnit', playerId: 0, unitId: f.other.id, target: { col: 6, row: 7 } });
      expect(result.ok).toBe(true);
    })).toEqual({ paths: 1, readouts: 1 });
  });

  it('the selected piece moving', () => {
    expect(rerunsAfter((f) => {
      const result = dispatch(f.game, { type: 'moveUnit', playerId: 0, unitId: f.soldier.id, target: { col: 4, row: 3 } });
      expect(result.ok).toBe(true);
    })).toEqual({ paths: 1, readouts: 1 });
  });

  it('the turn ending', () => {
    expect(rerunsAfter((f) => {
      expect(dispatch(f.game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    })).toEqual({ paths: 1, readouts: 1 });
  });

  it('a different selection', () => {
    expect(rerunsAfter((f) => { f.controls.selectPiece(f.other.id); }).readouts).toBe(1);
  });

  it('the selection being dropped', () => {
    expect(rerunsAfter((f) => { f.controls.clearSelection(); }).readouts).toBe(1);
  });

  it('the seat changing', () => {
    expect(rerunsAfter((f) => { f.controls.setLocalPlayer(1); }).readouts).toBe(1);
  });

  it('the lens changing', () => {
    expect(rerunsAfter((f) => { f.controls.setLens('faith'); }, false).readouts).toBe(1);
  });

  it('move mode being armed', () => {
    expect(rerunsAfter((f) => { f.controls.setMoveMode(true); }).readouts).toBe(1);
  });

  it('a city being opened, and buy mode', () => {
    expect(rerunsAfter((f) => {
      const city = foundCityAt(f.state, 0, getTileAt(f.state.map, 8, 8)!);
      bumpRevision(f.state);
      f.point(6, 3, 41);
      f.work();
      f.controls.setOpenCity(city.id);
    }, false).readouts).toBe(1);
    expect(rerunsAfter((f) => {
      const city = foundCityAt(f.state, 0, getTileAt(f.state.map, 8, 8)!);
      bumpRevision(f.state);
      f.controls.setOpenCity(city.id);
      f.point(6, 3, 41);
      f.work();
      f.controls.setBuyMode(true);
    }, false).readouts).toBe(1);
  });

  it('a new game (a different state object, even at the same revision)', () => {
    expect(rerunsAfter((f) => { f.replaceGame(); }, false).readouts).toBe(1);
  });

  it('the pointer leaving the board and coming back to the same hex', () => {
    expect(rerunsAfter((f) => { f.viewport.emit('pointerleave'); }).readouts).toBe(1);
  });
});

describe('the key is checked before the expensive half', () => {
  it('returns before the path preview and the listener, and after the per-move pixel pick', () => {
    const body = braceBody(uiSource('controls.ts'), 'function refreshHover(');
    const unitHover = body.indexOf('refreshUnitHover(hover)');
    const check = body.indexOf('key === hoverWorkKeyText');
    const path = body.indexOf('refreshPathPreview()');
    const listener = body.indexOf('onHover?.()');
    expect(unitHover).toBeGreaterThan(-1);
    expect(check).toBeGreaterThan(unitHover);
    expect(path).toBeGreaterThan(check);
    expect(listener).toBeGreaterThan(check);
  });

  it('names every fact the readout and the path preview read', () => {
    const body = braceBody(uiSource('controls.ts'), 'function hoverWorkKey(');
    for (const term of ['hover.tile.col', 'state.revision', 'localPlayerId', 'unit.col', 'unit.movesLeft',
      'effectiveLens().mode', 'moveMode', 'buyMode', 'openCityId']) {
      expect(body).toContain(term);
    }
  });
});
