/**
 * The combat-in-points UI pass (2026-08-28): a fortify readout in strength
 * points rather than a percentage, a city sheet that prints its own hit-point
 * and defence ledgers, an "Under siege" badge, and a toast for the seat that
 * owns the besieged town.
 *
 * `maxHpLedger` and `defenseRows` are pure and module-level for exactly
 * `previewLineText`'s reason (`cityPanel.test.ts`'s docblock): a hover string
 * and a ledger built off the sim's own lists need no jsdom to pin. The badge,
 * the header chip and the toast live inside `createCityPanel`/`commit`'s
 * closures and have no DOM in this suite (`controls.test.ts`), so those three
 * are read from the source exactly as `cityScreen.test.ts` and
 * `seatRoster.test.ts` read theirs.
 */

import { describe, expect, it } from 'vitest';

import { buildingDef } from '../../src/sim/buildingData';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, newGame } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { defenseRows, defenseTotal, maxHpLedger } from '../../src/ui/cityPanel';

const SOURCES = import.meta.glob(
  ['../../src/ui/unitPanel.ts', '../../src/ui/cityPanel.ts', '../../src/ui/controls.ts'],
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

/** A two-player state on a blank grassland rectangle, as `combat.test.ts` uses. */
function flatState(width = 16, height = 12): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  return state;
}

function plant(state: GameState, ownerId: number, col: number, row: number): City {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return foundCityAt(state, ownerId, tile);
}

describe('maxHpLedger', () => {
  // Both figures read off the tables rather than written down here: the user's
  // 2026-08-28 ruling halved `cityBaseHp` and moved the palisade's `cityHp`,
  // and what this file is pinning is the *shape* of the ledger — a base and one
  // signed line per wall — not either number.
  const base = RULES.combat.cityBaseHp;
  const walls = buildingDef('palisade').cityHp!;

  it('reads the base alone for a town with no walls', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    expect(maxHpLedger(city)).toBe(`Walls ${base}`);
  });

  it('adds a signed line per wall — "Walls … · Palisade +…"', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.buildings.push('palisade');
    expect(maxHpLedger(city)).toBe(`Walls ${base} · Palisade +${walls}`);
  });
});

describe('defenseRows', () => {
  it('leads with "Defends with" over the strongest unit the empire could train', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    // No tech at all: the roster's own floor unit, the warrior, is exactly at
    // `combat.cityMinStrength` — deterministic without unlocking anything.
    const rows = defenseRows(state, city);
    expect(rows).toEqual([{ label: 'Defends with · Warrior', figures: '8', amount: 8 }]);
    // The disclosure's summary is the fold of this list and never a second
    // count — the mode collapsed the section behind "Defence · 8" and that
    // figure has to be these rows added up (rule 5, one grade down).
    expect(defenseTotal(rows)).toBe(8);
  });

  it('adds the wall as its own row, in points, beneath the garrison', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.buildings.push('palisade');
    const rows = defenseRows(state, city);
    expect(rows).toEqual([
      { label: 'Defends with · Warrior', figures: '8', amount: 8 },
      { label: 'Palisade', figures: '+5', amount: 5 },
    ]);
    // And the fold moves with the wall, off the same list.
    expect(defenseTotal(rows)).toBe(13);
  });
});

describe('the fortify readout is points, never a percentage', () => {
  it('unitPanel.ts prints the signed figure and never calls it a percentage', () => {
    const text = source('unitPanel.ts');
    expect(text).not.toMatch(/formatPercent/);
    // Both call sites — the button's own label and the standing-state note —
    // read the same fold in the same words.
    const occurrences = text.match(/\$\{signedFigure\(fortifyBonus\(unit\)\)\} fortified/g) ?? [];
    expect(occurrences.length).toBe(2);
  });
});

describe('the city sheet', () => {
  it('reads its hit points as hp / cityMaxHp, with the ledger on hover', () => {
    const text = source('cityPanel.ts');
    expect(text).toMatch(/\$\{city\.hp\}\/\$\{cityMaxHp\(city\)\} hp/);
    expect(text).toMatch(/hp\.title = maxHpLedger\(city\)/);
  });

  it('shows an Under siege badge next to the name, derived every render', () => {
    const text = source('cityPanel.ts');
    expect(text).toMatch(/underSiege\(state, city, siegeField\(state, city\.ownerId\)\)/);
    expect(text).toMatch(/'city-size is-siege', 'Under siege'/);
  });

  it('prints a defence line from explainCityStrength', () => {
    const text = source('cityPanel.ts');
    expect(text).toMatch(/function defenseRows\(/);
    expect(text).toMatch(/explainCityStrength\(state, city\)/);
  });
});

describe('siege news in the commit funnel', () => {
  it('toasts the local seat when one of its cities is cut off', () => {
    const text = source('controls.ts');
    expect(text).toMatch(/function reportSieges\(/);
    expect(text).toMatch(/reportSieges\(result\);/);
    // Filtered by seat, `reportRoutes`' own rule.
    expect(text).toMatch(/report\.ownerId !== localPlayerId/);
    expect(text).toMatch(/is under siege · \$\{siegeTail\(report\)\}/);
    // Both branches the damage figure can take.
    expect(text).toMatch(/report\.damage > 0 \? `−\$\{report\.damage\} this turn` : 'holds at 1'/);
  });
});
