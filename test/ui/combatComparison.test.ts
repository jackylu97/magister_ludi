/**
 * **Combat odds at a distance** — the ruling of 2026-09-15 ("the unit overview
 * should show the combat odds regardless of movement/adjacency, players need a
 * way to compare strength without marching their units into combat").
 *
 * What is pinned here is the *bargain*: the card shows a comparison, and the
 * comparison is the very forecast the fight will use — so the pin that matters
 * most is the equality one. A forecast for an enemy three hexes off must equal,
 * field for field, the forecast that same pair gets with the attacker standing
 * beside it. Everything else is the fence around that: the order is still
 * refused in the reducer's own sentence, the comparison says it is one only when
 * it is one, a town names its siege beat from afar, and the waterline's refusal
 * is printed rather than swallowed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { foundCityAt } from '../../src/sim/cities';
import { createGame, dispatch } from '../../src/sim/game';
import { createMap, getTileAt, mapRange, tileHex } from '../../src/sim/map';
import { createUnit } from '../../src/sim/state';
import { VISIBLE, resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';
import { COMPARISON_LINE, createGameControls } from '../../src/ui/controls';
import type { HoverInfo, MapView } from '../../src/ui/mapView';

/** A flat, fully charted duel board with the two seats already at war. */
function fixture() {
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    setTimeout: vi.fn(() => 1),
    clearTimeout: vi.fn(),
    matchMedia: () => ({ matches: true }),
  });
  const game = createGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Bors', color: '#00a', isHuman: true },
    ],
  });
  const state = game.state;
  state.map = createMap({ width: 14, height: 10, terrain: 'grassland' });
  state.units = [];
  state.cities = [];
  state.tileOwner = state.map.tiles.map(() => null);
  resetVisibility(state);
  openWar(state, 0, 1);

  let hover: HoverInfo | null = null;
  const renderer = {
    pick: vi.fn(() => null),
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
  const viewport = {
    addEventListener: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    classList: { toggle: vi.fn() },
    setPointerCapture: vi.fn(),
    hasPointerCapture: () => false,
    releasePointerCapture: vi.fn(),
  };
  const controls = createGameControls({
    viewport: viewport as unknown as HTMLElement,
    renderer: renderer as unknown as MapView,
    getGame: () => game,
    onUpdate: vi.fn(),
    onHover: vi.fn(),
    lensOrder: [],
    inputBlocked: () => false,
  });

  /** Everything charted, re-asked after anything that founds or moves. */
  const seeAll = (): void => {
    resetVisibility(state);
    state.visibility.forEach(grid => grid.fill(VISIBLE));
  };
  const hoverAt = (col: number, row: number): void => {
    const tile = getTileAt(state.map, col, row)!;
    hover = { tile, worldCol: col, row, axial: tileHex(tile) };
  };
  return { game, state, controls, hoverAt, seeAll };
}

afterEach(() => vi.unstubAllGlobals());

describe('the forecast at a distance', () => {
  it('reads the same three hexes off as it does standing beside the enemy', () => {
    const f = fixture();
    const mine = createUnit(f.state, 0, 'warrior', 3, 3);
    createUnit(f.state, 1, 'warrior', 6, 3);
    f.seeAll();
    f.controls.selectPiece(mine.id);

    f.hoverAt(6, 3);
    const afar = f.controls.combatForecast()!;
    expect(afar.comparison).toBe(true);
    expect(afar.preview.ok).toBe(true);
    // The hex it would have to stand on is one of the target's neighbours, and
    // it is not the hex the piece is on now.
    expect(afar.from).not.toEqual({ col: 3, row: 3 });

    // The order is still refused, and in the reducer's own sentence.
    const refused = dispatch(f.game, {
      type: 'attack',
      playerId: 0,
      unitId: mine.id,
      target: { col: 6, row: 3 },
    });
    expect(refused.ok).toBe(false);
    expect(refused.ok === false && refused.error).toContain('must be adjacent to attack');
    expect(f.game.log).toHaveLength(0);

    // Now put it where the comparison imagined it, and ask again: the same card.
    mine.col = afar.from.col;
    mine.row = afar.from.row;
    f.seeAll();
    f.hoverAt(6, 3);
    const beside = f.controls.combatForecast()!;
    expect(beside.comparison).toBe(false);
    expect(beside.preview).toEqual(afar.preview);
  });

  it('says it is a comparison only while the blow is out of reach', () => {
    const f = fixture();
    const mine = createUnit(f.state, 0, 'warrior', 3, 3);
    createUnit(f.state, 1, 'warrior', 4, 3);
    f.seeAll();
    f.controls.selectPiece(mine.id);

    f.hoverAt(4, 3);
    expect(f.controls.combatForecast()).toMatchObject({
      comparison: false,
      from: { col: 3, row: 3 },
    });

    // A spent piece is still worth what it is worth: the odds stay on screen,
    // marked as a comparison, because nobody has ordered anything.
    mine.movesLeft = 0;
    const spent = f.controls.combatForecast()!;
    expect(spent.comparison).toBe(true);
    expect(spent.preview.ok).toBe(true);
    expect(spent.from).toEqual({ col: 3, row: 3 });
    expect(COMPARISON_LINE).toBe('Out of reach — a comparison');
  });

  it('names the siege beat of a town hovered from across the map', () => {
    const f = fixture();
    const mine = createUnit(f.state, 0, 'warrior', 3, 3);
    foundCityAt(f.state, 1, getTileAt(f.state.map, 8, 3)!);
    f.seeAll();
    f.controls.selectPiece(mine.id);

    f.hoverAt(8, 3);
    const reading = f.controls.combatForecast()!;
    expect(reading.comparison).toBe(true);
    expect(reading.preview.ok && reading.preview.cityPhase).toBe('walls');
    expect(reading.preview.ok && reading.preview.defenderStrength).toBeGreaterThan(0);
  });

  it('compares a bow from the nearest hex it could shoot from', () => {
    const f = fixture();
    const mine = createUnit(f.state, 0, 'archer', 3, 3);
    createUnit(f.state, 1, 'warrior', 8, 3);
    f.seeAll();
    f.controls.selectPiece(mine.id);

    f.hoverAt(8, 3);
    const reading = f.controls.combatForecast()!;
    expect(reading.comparison).toBe(true);
    expect(reading.preview.ok && reading.preview.kind).toBe('ranged');
    // Range 2, so the nearest hex in range along the row — never right beside it.
    expect(reading.from).toEqual({ col: 6, row: 3 });
  });

  it('prints the waterline refusal rather than hiding it', () => {
    const f = fixture();
    const sea = getTileAt(f.state.map, 6, 3)!;
    sea.terrain = 'coast';
    const mine = createUnit(f.state, 0, 'warrior', 3, 3);
    createUnit(f.state, 1, 'galley', 6, 3);
    f.seeAll();
    f.controls.selectPiece(mine.id);

    f.hoverAt(6, 3);
    const reading = f.controls.combatForecast()!;
    expect(reading.comparison).toBe(true);
    expect(reading.preview.ok).toBe(false);
    expect(reading.preview.ok === false && reading.preview.error).toContain(
      'cannot strike at the water',
    );
  });

  it('says so when there is nowhere beside the target to stand', () => {
    const f = fixture();
    // Open water, the hull in the middle of it: no landsman has a hex to swing
    // from, which is a different sentence from the waterline's.
    for (const tile of mapRange(f.state.map, tileHex(getTileAt(f.state.map, 6, 3)!), 1)) {
      tile.terrain = 'ocean';
    }
    const mine = createUnit(f.state, 0, 'warrior', 3, 3);
    createUnit(f.state, 1, 'galley', 6, 3);
    f.seeAll();
    f.controls.selectPiece(mine.id);

    f.hoverAt(6, 3);
    const reading = f.controls.combatForecast()!;
    expect(reading.comparison).toBe(true);
    expect(reading.preview.ok === false && reading.preview.error).toBe(
      'Warrior has nowhere to stand beside it',
    );
  });
});
