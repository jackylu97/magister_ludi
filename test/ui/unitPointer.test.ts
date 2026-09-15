import { afterEach, describe, expect, it, vi } from 'vitest';
import { foundCityAt } from '../../src/sim/cities';
import { createGame, snapshotState } from '../../src/sim/game';
import { createMap, getTileAt, tileHex, tileIndex } from '../../src/sim/map';
import { createUnit } from '../../src/sim/state';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';
import { createGameControls } from '../../src/ui/controls';
import type { HoverInfo, MapView } from '../../src/ui/mapView';
import { resolveUnitPointerTarget } from '../../src/ui/unitPointer';

function fixture() {
  const game = createGame({ seed: 7, sizeName: 'duel', players: [
    { name: 'Ada', color: '#a00', isHuman: true },
    { name: 'Bors', color: '#00a', isHuman: true },
  ] });
  const state = game.state;
  state.map = createMap({ width: 10, height: 8, terrain: 'grassland' });
  state.units = []; state.cities = [];
  state.tileOwner = state.map.tiles.map(() => null);
  resetVisibility(state);
  const first = createUnit(state, 0, 'warrior', 3, 3);
  const enemy = createUnit(state, 1, 'scout', 3, 4);
  const second = createUnit(state, 0, 'worker', 3, 3);
  const elsewhere = createUnit(state, 0, 'scout', 6, 3);
  resetVisibility(state);
  state.visibility.forEach(grid => grid.fill(VISIBLE));
  return { game, state, first, second, enemy, elsewhere };
}

/** Only the event surface: actual controls and simulation decide each gesture. */
class PointerSurface {
  private handlers = new Map<string, ((event: PointerEvent) => void)[]>();
  private captured = new Set<number>();
  classList = { toggle: vi.fn() };
  addEventListener(type: string, handler: (event: PointerEvent) => void) {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler]);
  }
  getBoundingClientRect() { return { left: 0, top: 0 }; }
  setPointerCapture(id: number) { this.captured.add(id); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); }
  emit(type: string, props: Partial<PointerEvent> = {}) {
    const event = { button: 0, pointerId: 1, clientX: 40, clientY: 40,
      preventDefault: vi.fn(), ...props } as PointerEvent;
    this.handlers.get(type)?.forEach(handler => handler(event));
  }
}

function controlsFixture() {
  const f = fixture(), viewport = new PointerSurface();
  let blocked = false;
  let keyListener: ((event: KeyboardEvent) => void) | undefined;
  vi.stubGlobal('window', { addEventListener: (_type: string, listener: typeof keyListener) => { keyListener = listener; }, setTimeout: vi.fn(() => 1),
    clearTimeout: vi.fn(), matchMedia: () => ({ matches: true }) });
  let hover: HoverInfo | null = null;
  let target: HoverInfo | null = null;
  let badgeId: number | null = null, modelId: number | null = null;
  const renderer = {
    pick: vi.fn(() => target), getHover: () => hover, setHover: (next: HoverInfo | null) => { hover = next; },
    pickUnitBadge: vi.fn(() => badgeId), pickUnitModel: vi.fn(() => modelId),
    setHoveredUnitId: vi.fn(), setSelectedUnitId: vi.fn(), setReachable: vi.fn(),
    setPathPreview: vi.fn(), invalidate: vi.fn(), panByScreen: vi.fn(),
    setFogSeat: vi.fn(), skipAnimations: vi.fn(), animateMove: vi.fn(),
  };
  const onUpdate = vi.fn(), onHover = vi.fn();
  const controls = createGameControls({ viewport: viewport as unknown as HTMLElement,
    renderer: renderer as unknown as MapView, getGame: () => f.game, onUpdate, onHover, lensOrder: [],
    inputBlocked: () => blocked, onToggleTechTree: () => { blocked = true; } });
  function point(col: number, row: number, badge: number | null = null, model: number | null = null) {
    const tile = getTileAt(f.state.map, col, row)!;
    target = { tile, worldCol: col, row, axial: tileHex(tile) };
    badgeId = badge; modelId = model;
    viewport.emit('pointermove');
  }
  const click = () => { viewport.emit('pointerdown'); viewport.emit('pointerup'); };
  return { ...f, viewport, renderer, controls, onUpdate, onHover, point, click,
    key: (key: string) => keyListener?.({ key, target: null } as KeyboardEvent) };
}

afterEach(() => vi.unstubAllGlobals());

describe('shared unit pointer resolution', () => {
  it('cycles badges and tile stacks, but picks an exact model before the ground behind it', () => {
    const { state, first, second, elsewhere } = fixture(), before = snapshotState(state);
    const model = vi.fn(() => elsewhere.id);
    expect(resolveUnitPointerTarget(state, 0, first.id, {
      badgeId: second.id, modelId: model, tile: elsewhere,
    })).toEqual({ unit: second, source: 'badge' });
    expect(model).not.toHaveBeenCalled();
    expect(resolveUnitPointerTarget(state, 0, second.id, { badgeId: second.id })?.unit).toBe(first);
    expect(resolveUnitPointerTarget(state, 0, second.id, { modelId: second.id, tile: elsewhere }))
      .toEqual({ unit: second, source: 'model' });
    expect(resolveUnitPointerTarget(state, 0, first.id, { tile: first }))
      .toEqual({ unit: second, source: 'tile' });
    expect(snapshotState(state)).toBe(before);
  });

  it('rechecks ownership, route status and stale picks without losing eligible tile fallback', () => {
    const { state, first, second, enemy, elsewhere } = fixture();
    // Presence of a route, regardless of its route fields, makes it unselectable.
    second.trade = {} as NonNullable<typeof second.trade>;
    expect(resolveUnitPointerTarget(state, 0, null, { badgeId: second.id })?.unit).toBe(first);
    for (const modelId of [second.id, enemy.id, -999]) {
      expect(resolveUnitPointerTarget(state, 0, null, { modelId, tile: elsewhere }))
        .toEqual({ unit: elsewhere, source: 'tile' });
    }
    expect(resolveUnitPointerTarget(state, 0, null, { badgeId: enemy.id, modelId: elsewhere.id })?.unit)
      .toBe(elsewhere);
  });

  it.each([HIDDEN, EXPLORED])('does not advertise a unit on fog level %i through any picking route', level => {
    const { state, first } = fixture();
    state.visibility[0]![tileIndex(state.map, first.col, first.row)] = level;
    expect(resolveUnitPointerTarget(state, 0, null, {
      badgeId: first.id, modelId: first.id, tile: first,
    })).toBeNull();
  });
});

describe('actual controls pointer gestures', () => {
  it.each([0, 2])('keeps a wobbling button-%i move click and leaves the camera still', button => {
    const f = controlsFixture();
    f.controls.selectPiece(f.first.id);
    if (button === 0) f.controls.setMoveMode(true);
    f.point(4, 3);
    f.viewport.emit('pointerdown', { button });
    // Small oscillations can add up to a long path without being a drag.
    for (const clientX of [42, 39, 42, 40, 41]) {
      f.viewport.emit('pointermove', { button, clientX, clientY: 42 });
    }
    f.viewport.emit('pointerup', { button, clientX: 41, clientY: 42 });
    expect(f.first).toMatchObject({ col: 4, row: 3 });
    expect(f.game.log.filter(command => command.type === 'moveUnit')).toHaveLength(1);
    expect(f.renderer.panByScreen).not.toHaveBeenCalled();
  });

  it('accepts an attack with small diagonal pointer motion', () => {
    const f = controlsFixture();
    openWar(f.state, 0, 1);
    f.controls.selectPiece(f.first.id);
    f.point(f.enemy.col, f.enemy.row);
    f.viewport.emit('pointerdown', { button: 2 });
    f.viewport.emit('pointermove', { button: 2, clientX: 43, clientY: 43 });
    f.viewport.emit('pointerup', { button: 2, clientX: 43, clientY: 43 });
    expect(f.game.log.some(command => command.type === 'attack')).toBe(true);
    expect(f.renderer.panByScreen).not.toHaveBeenCalled();
  });

  it('never orders after a real pan, even if the pointer returns to its starting point', () => {
    const f = controlsFixture();
    f.controls.selectPiece(f.first.id); f.point(4, 3);
    f.viewport.emit('pointerdown', { button: 2 });
    f.viewport.emit('pointermove', { clientX: 60 });
    f.viewport.emit('pointermove', { clientX: 40 });
    f.viewport.emit('pointerup', { button: 2 });
    expect(f.renderer.panByScreen).toHaveBeenCalledWith(20, 0);
    expect(f.game.log).toEqual([]);
  });

  it('checks the release position even when no pointermove arrived', () => {
    const f = controlsFixture();
    f.controls.selectPiece(f.first.id); f.point(4, 3);
    f.viewport.emit('pointerdown', { button: 2 });
    f.viewport.emit('pointerup', { button: 2, clientX: 90 });
    expect(f.game.log).toEqual([]);
  });

  it('recovers after pointer capture is lost, without issuing an order', () => {
    const f = controlsFixture();
    f.controls.selectPiece(f.first.id); f.point(4, 3);
    f.viewport.emit('pointerdown', { button: 2 });
    f.viewport.emit('pointermove', { clientX: 70 });
    f.viewport.emit('lostpointercapture');
    expect(f.game.log).toEqual([]);
    f.viewport.emit('pointerdown', { button: 2 });
    f.viewport.emit('pointerup', { button: 2 });
    expect(f.first).toMatchObject({ col: 4, row: 3 });
  });

  it('ignores another pointer during an active press', () => {
    const f = controlsFixture();
    f.point(3, 3);
    f.viewport.emit('pointerdown');
    f.viewport.emit('pointermove', { pointerId: 2, clientX: 100 });
    f.viewport.emit('pointerup', { pointerId: 2 });
    f.viewport.emit('pointercancel', { pointerId: 2 });
    expect(f.controls.selectedUnit()).toBeNull();
    expect(f.renderer.panByScreen).not.toHaveBeenCalled();
    f.viewport.emit('pointerup');
    expect(f.controls.selectedUnit()?.id).toBe(f.first.id);
  });

  it('keeps a city drag from pinning citizens while still accepting a wobbling click', () => {
    const f = controlsFixture(), city = foundCityAt(f.state, 0, getTileAt(f.state.map, 2, 3)!);
    f.state.visibility[0]!.fill(VISIBLE);
    f.controls.setOpenCity(city.id); f.point(3, 3);
    f.viewport.emit('pointerdown');
    f.viewport.emit('pointermove', { clientX: 70 });
    f.viewport.emit('pointerup', { clientX: 70 });
    expect(f.game.log).toEqual([]);
    f.viewport.emit('pointerdown');
    for (const clientX of [42, 38, 42, 40]) f.viewport.emit('pointermove', { clientX });
    f.viewport.emit('pointerup');
    expect(f.game.log[f.game.log.length - 1]?.type).toBe('setLockedTiles');
    expect(f.renderer.panByScreen).not.toHaveBeenCalled();
  });

  it.each([true, false])('does not order through a modal (opened before press: %s)', before => {
    const f = controlsFixture();
    f.controls.selectPiece(f.first.id); f.point(4, 3);
    if (before) f.key('t');
    f.viewport.emit('pointerdown', { button: 2 });
    if (!before) f.key('t');
    f.viewport.emit('pointerup', { button: 2 });
    expect(f.game.log).toEqual([]);
  });

  it('hovers the next badge selection and exact model selection with no panel work on pointer motion', () => {
    const f = controlsFixture();
    f.point(6, 3, f.second.id, f.elsewhere.id);
    expect(f.renderer.setHoveredUnitId).toHaveBeenLastCalledWith(f.first.id);
    expect(f.onUpdate).not.toHaveBeenCalled();
    expect(f.onHover).toHaveBeenCalledTimes(1);
    f.click(); expect(f.controls.selectedUnit()?.id).toBe(f.first.id);
    expect(f.renderer.setHoveredUnitId).toHaveBeenLastCalledWith(f.second.id);
    f.click(); expect(f.controls.selectedUnit()?.id).toBe(f.second.id);
    f.point(6, 3, null, f.first.id);
    expect(f.renderer.setHoveredUnitId).toHaveBeenLastCalledWith(f.first.id);
    f.click(); expect(f.controls.selectedUnit()?.id).toBe(f.first.id);
    f.point(3, 3); f.click(); expect(f.controls.selectedUnit()?.id).toBe(f.second.id);
    expect(f.game.log).toEqual([]);
  });

  it('clears on press, drag, cancel, leave, seat change and game refresh', () => {
    const f = controlsFixture();
    const expectClear = () => expect(f.renderer.setHoveredUnitId).toHaveBeenLastCalledWith(null);
    f.point(3, 3, null, f.first.id);
    f.viewport.emit('pointerdown'); expectClear();
    f.viewport.emit('pointermove', { clientX: 80 }); expectClear();
    f.viewport.emit('pointerup', { clientX: 80 }); expectClear();
    expect(f.controls.selectedUnit()).toBeNull();
    f.point(3, 3); f.viewport.emit('pointerdown'); f.viewport.emit('pointercancel'); expectClear();
    f.point(3, 3); f.viewport.emit('pointerleave'); expectClear();
    f.point(3, 3); f.controls.setLocalPlayer(1); expectClear();
    f.controls.setLocalPlayer(0); f.point(3, 3); f.controls.refresh(); expectClear();
  });

  it('keeps armed move clicks as real orders even when they hit another owned model', () => {
    const f = controlsFixture();
    f.controls.selectPiece(f.first.id); f.controls.setMoveMode(true);
    f.point(4, 3, f.elsewhere.id, f.elsewhere.id);
    expect(f.renderer.setHoveredUnitId).toHaveBeenLastCalledWith(null);
    f.click();
    expect(f.game.log[f.game.log.length - 1]?.type).toBe('moveUnit');
    expect(f.first).toMatchObject({ col: 4, row: 3 });
    expect(f.controls.selectedUnit()?.id).toBe(f.first.id);
  });

  it('keeps city ground for citizen pins while a direct model can select the garrison', () => {
    const f = controlsFixture(), city = foundCityAt(f.state, 0, getTileAt(f.state.map, 2, 3)!);
    f.state.visibility[0]!.fill(VISIBLE);
    f.controls.setOpenCity(city.id);
    f.point(3, 3);
    expect(f.renderer.setHoveredUnitId).toHaveBeenLastCalledWith(null);
    f.click();
    expect(f.controls.selectedUnit()).toBeNull();
    expect(f.controls.openCity()?.id).toBe(city.id);
    expect(f.game.log[f.game.log.length - 1]?.type).toBe('setLockedTiles');
    f.point(3, 3, null, f.second.id);
    expect(f.renderer.setHoveredUnitId).toHaveBeenLastCalledWith(f.second.id);
    f.click();
    expect(f.controls.selectedUnit()?.id).toBe(f.second.id);
    expect(f.controls.openCity()).toBeNull();
  });

  it('gives DOM icons the same exact-unit outline and suppresses models behind city text', () => {
    const f = controlsFixture();
    f.point(3, 3, null, f.first.id);
    f.controls.setHoveredCity(123);
    f.point(3, 3, null, f.first.id);
    expect(f.renderer.setHoveredUnitId).toHaveBeenLastCalledWith(null);
    f.controls.setHoveredPiece(f.second.id);
    f.point(3, 3, null, f.first.id);
    expect(f.renderer.setHoveredUnitId).toHaveBeenLastCalledWith(f.second.id);
    f.controls.setHoveredPiece(f.enemy.id);
    expect(f.renderer.setHoveredUnitId).toHaveBeenLastCalledWith(null);
    f.controls.setHoveredPiece(null);
    expect(f.renderer.setHoveredUnitId).toHaveBeenLastCalledWith(null);
  });

  it('keeps buy-mode ground targeting and disarms it when a badge leaves the city for a unit', () => {
    const f = controlsFixture(), city = foundCityAt(f.state, 0, getTileAt(f.state.map, 2, 3)!);
    f.state.visibility[0]!.fill(VISIBLE);
    f.controls.setOpenCity(city.id); f.controls.setBuyMode(true);
    f.point(3, 3);
    expect(f.renderer.setHoveredUnitId).toHaveBeenLastCalledWith(null);
    f.click();
    expect(f.controls.selectedUnit()).toBeNull();
    // It is already owned: buying refuses, rather than falling through to pin.
    expect(f.game.log).toEqual([]);
    f.point(3, 3, f.second.id); f.click();
    expect(f.controls.selectedUnit()?.id).toBe(f.first.id);
    expect(f.controls.openCity()).toBeNull();
    expect(f.viewport.classList.toggle).toHaveBeenCalledWith('is-buy-mode', false);
  });

  it('clears immediately when a keyboard modal opens and keeps blocked pointer/DOM hover clear', () => {
    const f = controlsFixture();
    f.point(3, 3, null, f.first.id);
    f.key('t');
    expect(f.renderer.setHoveredUnitId).toHaveBeenLastCalledWith(null);
    f.point(3, 3, null, f.first.id);
    f.controls.setHoveredPiece(f.second.id);
    expect(f.renderer.setHoveredUnitId).toHaveBeenLastCalledWith(null);
  });

  it('keeps ground-only stack cycling when the optional 3D APIs are absent', () => {
    const f = controlsFixture();
    const renderer: Partial<typeof f.renderer> = f.renderer;
    delete renderer.pickUnitBadge; delete renderer.pickUnitModel; delete renderer.setHoveredUnitId;
    f.point(3, 3); f.click(); expect(f.controls.selectedUnit()?.id).toBe(f.first.id);
    f.click(); expect(f.controls.selectedUnit()?.id).toBe(f.second.id);
  });
});

/**
 * **The swap, at the pointer** (`docs/flags.md` (ooooo), rule 3). The rule is
 * pinned in `test/sim/pathfind.test.ts`; what is pinned here is the gesture: the
 * hex is offered by the highlight, the card says whose place is being taken, and
 * the right button sends the one order that takes it.
 */
describe('trading places with your own soldier', () => {
  it('offers the hex, names the sitter, and swaps on a right-click', () => {
    const f = controlsFixture();
    const sitter = createUnit(f.state, 0, 'spearman', 4, 3);
    f.controls.selectPiece(f.first.id);
    f.point(4, 3);

    // The board offers it: the last reachable set the renderer was handed
    // carries the sitter's hex, so the tint and the reducer agree.
    const calls = f.renderer.setReachable.mock.calls;
    const offered = calls[calls.length - 1]![0] as readonly { col: number; row: number }[];
    expect(offered.some((cell) => cell.col === 4 && cell.row === 3)).toBe(true);
    // And the card says what the click would do, in plain words.
    expect(f.controls.swapHint()).toBe('Swap with Spearman');

    f.viewport.emit('pointerdown', { button: 2 });
    f.viewport.emit('pointerup', { button: 2, clientX: 41, clientY: 42 });
    expect(f.first).toMatchObject({ col: 4, row: 3 });
    expect(sitter).toMatchObject({ col: 3, row: 3 });
    // One order, and both pieces slid along their own route rather than
    // appearing where they landed.
    expect(f.game.log.filter((command) => command.type === 'moveUnit')).toHaveLength(1);
    expect(f.renderer.animateMove).toHaveBeenCalledTimes(2);
  });

  it('says nothing over a hex that is not a trade', () => {
    const f = controlsFixture();
    createUnit(f.state, 0, 'spearman', 4, 3);
    f.controls.selectPiece(f.first.id);
    // Empty ground, a piece of another seat, and one of its own workers: none
    // of the three is a trade, and the card stays quiet over all of them.
    f.point(5, 3);
    expect(f.controls.swapHint()).toBeNull();
    f.point(3, 4);
    expect(f.controls.swapHint()).toBeNull();
    f.point(3, 3);
    expect(f.controls.swapHint()).toBeNull();
  });
});
