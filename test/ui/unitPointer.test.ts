import { afterEach, describe, expect, it, vi } from 'vitest';
import { foundCityAt } from '../../src/sim/cities';
import { createGame, snapshotState } from '../../src/sim/game';
import { createMap, getTileAt, tileHex, tileIndex } from '../../src/sim/map';
import { createUnit } from '../../src/sim/state';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';
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
