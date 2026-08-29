/**
 * What the HUD strip and its neighbours cost to draw (user, 2026-08-29: "a
 * performance pass over the existing menus … any low hanging fruit or repeat
 * offenses of this issue").
 *
 * The issue is Entry XLVII's, and the shape it had on the star chart and the
 * city panel it had here too: **an empire-wide fold asked once per row**. The
 * top bar redraws on every accepted command, and every redraw summed
 * `civYields`, which asked `cityYields` per town, which took `empirePercents` —
 * the two meter ledgers folded over every city and every unit the seat holds —
 * afresh for each of them. A dozen towns was two dozen sweeps of the empire to
 * print six numbers, and it got worse with every city founded, which is exactly
 * the complaint the star chart's pass answered.
 *
 * Three hoists, and this file is the register of them:
 *
 *   1. **`civYields` takes the empire's percentages once** and hands them to
 *      every town through `cityQuote`, the parameter the simulation already
 *      offers.
 *   2. **`empireRates`** (`cities.ts`, behind `explainEmpireCardYields`) does the
 *      same for its own sweep — which is the phase that *banks* the turn as well
 *      as the headline that quotes it.
 *   3. **`tradeLedger` asks `explainEmpireGold` once**, where it used to ask
 *      twice: once for the lines and again through `empireGold`, which is
 *      nothing but the fold of them.
 *
 * Every hoist carries the same obligation and it is asserted rather than
 * assumed: the figure handed in is the figure the default would have fetched
 * (hard rule 5 does not bend for a parameter).
 */

import { describe, expect, it, vi } from 'vitest';

import * as cities from '../../src/sim/cities';
import * as meters from '../../src/sim/meters';
import * as empireGold from '../../src/sim/empireGold';
import { createMap, getTileAt } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { civYields } from '../../src/ui/topBar';
import { tradeLedger } from '../../src/ui/tradeScreen';

const UI_SOURCE = import.meta.glob(
  ['../../src/ui/topBar.ts', '../../src/ui/tradeScreen.ts', '../../src/main.ts'],
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

function source(name: string): string {
  const entry = Object.entries(UI_SOURCE).find(([path]) => path.endsWith(name));
  if (!entry || typeof entry[1] !== 'string' || entry[1].length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return entry[1];
}

/** The body of one declaration, brace-matched. `techTreeCost.test.ts`'s reader. */
function declaration(name: string, inFile: string): string {
  const text = source(inFile);
  const at = text.indexOf(name);
  expect(at, `no "${name}" in ${inFile}`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let index = text.indexOf('{', at); index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    else if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(at, index + 1);
    }
  }
  throw new Error(`"${name}" is never closed`);
}

/**
 * An empire of `count` towns on blank ground — enough of them that the counting
 * below is about a sweep rather than about one city. `techTreeCost.test.ts`'s
 * fixture, copied because the two passes are measuring the same shape.
 */
function empire(count: number): GameState {
  const width = 30;
  const height = 20;
  const state = newGame({
    seed: 3,
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
  let placed = 0;
  for (let row = 2; row < height - 2 && placed < count; row += 5) {
    for (let col = 2; col < width - 2 && placed < count; col += 5) {
      const tile = getTileAt(state.map, col, row);
      if (!tile) continue;
      cities.foundCityAt(state, 0, tile).population = 6;
      placed += 1;
    }
  }
  expect(state.cities.length).toBe(count);
  return state;
}

/**
 * Counts one sim fold across a run.
 *
 * Restored in a `finally` for `techTreeCost.test.ts`'s reason: this project runs
 * its workers un-isolated (`vite.config.ts`), and a spy left standing would
 * follow the module graph into the next file.
 */
function counting<T>(
  module: object,
  name: never | string,
  run: () => T,
): { result: T; count: number } {
  const spy = vi.spyOn(module as never, name as never);
  try {
    const result = run();
    return { result, count: spy.mock.calls.length };
  } finally {
    spy.mockRestore();
  }
}

describe('the empire’s percentages are taken once a render', () => {
  it('sweeps the meters twice for a twelve-town empire, not two dozen times', () => {
    // Two, and both are hoists: `civYields`' own, and the one inside
    // `empireRates` behind `explainEmpireCardYields`. Before this pass it was
    // one per town per sweep — twenty-four — and the strip is redrawn on every
    // accepted command.
    const state = empire(12);
    const swept = counting(meters, 'meterEffects', () => civYields(state, 0));
    expect(swept.count).toBe(2);
    expect(swept.count).toBeLessThan(state.cities.length);
  });

  it('is the same headline the unhoisted fold gives, in every voice', () => {
    // Hard rule 5 across the parameter. `empirePercents` is a pure function of
    // `(state, playerId)`, so the hoisted quote is the very quote each town's
    // default would have built — asserted city by city rather than trusted.
    const state = empire(6);
    const percents = cities.empirePercents(state, 0);
    for (const city of state.cities) {
      if (city.ownerId !== 0) continue;
      const hoisted = cities.cityYields(
        state,
        city,
        [],
        city.queue[0],
        cities.cityQuote(state, city, [], percents),
      );
      expect(hoisted).toEqual(cities.cityYields(state, city, [], city.queue[0]));
    }
  });

  it('hands the empire’s half down rather than working it out beside it', () => {
    // The hoist is the sim's own parameter, not a second derivation: `cityQuote`
    // is handed `empirePercents`, and the figure stays `cityYields`' fold.
    const body = declaration('export function civYields(', 'topBar.ts');
    expect(body).toContain('empirePercents(state, playerId)');
    expect(body).toContain('cityQuote(state, city, [], empirePercent)');
  });
});

describe('the two meter ledgers are folded once a render', () => {
  it('takes the sweep and both ledgers at the top of the render', () => {
    // The chip, its tier list and an open click-through card are three readings
    // of one ledger. They used to be five sweeps: `meterEffects` twice through
    // `effectsOf`, and `explainHappiness`/`explainAuthority` again for a card
    // that happened to be open.
    const body = declaration('    render(): void {', 'topBar.ts');
    expect(body).toContain('const effects = meterEffects(state, playerId);');
    expect(body).toContain('const happinessLedger = happinessEntries(state, playerId);');
    expect(body).toContain('const authorityLedger = explainAuthority(state, playerId);');
    // And every reader inside the render takes the pass rather than re-asking.
    expect(body).toContain("effectsOf('happiness', effects)");
    expect(body).toContain("effectsOf('authority', effects)");
    expect(body).toContain('renderLedger(happiness.body, happinessLedger, happinessStanding)');
    expect(body).toContain('renderLedger(authority.body, authorityLedger, authorityStanding)');
    // Nothing in the render asks for a second sweep of its own.
    expect(body).not.toContain("effectsOf('happiness')");
    expect(body).not.toContain("effectsOf('authority')");
  });

  it('leaves the hover cards their own default, since they are raised one at a time', () => {
    // The filter is the difference between the two meters, never a second
    // sweep — and a caller with nothing in hand still gets the call it made
    // before the parameter existed.
    const body = declaration('  function effectsOf(', 'topBar.ts');
    expect(body).toContain('all: readonly MeterEffect[] = meterEffects(');
    expect(body).toContain('all.filter((effect) => effect.meter === meter)');
  });
});

describe('the four empire gold lines are asked once', () => {
  it('folds the lines it already has instead of asking for them again', () => {
    // `explainEmpireGold` floods the empire's connected territory and sweeps
    // every hex, unit and building it holds. `empireGold` is its fold, so the
    // old pair was that flood twice to print one ledger.
    const state = empire(12);
    const asked = counting(empireGold, 'explainEmpireGold', () => tradeLedger(state, 0));
    expect(asked.count).toBe(1);
  });

  it('gives the same ledger whether the lines are handed in or fetched', () => {
    // Hard rule 5 across the parameter again: the total is the fold of the lines
    // on the ledger, and handing them in cannot change either.
    const state = empire(6);
    const lines = empireGold.explainEmpireGold(state, 0);
    expect(tradeLedger(state, 0, lines)).toEqual(tradeLedger(state, 0));
    const ledger = tradeLedger(state, 0);
    let fold = 0;
    for (const line of ledger.lines) fold += line.gold;
    expect(ledger.total).toBe(fold);
  });

  it('asks once for the Trade screen’s column, which prints them under its own fold', () => {
    const body = declaration('  function drawRunning(', 'tradeScreen.ts');
    expect(body).toContain('const empire = explainEmpireGold(state, seat)');
    expect(body).toContain('tradeLedger(state, seat, empire)');
    expect(body).toContain('for (const line of empire) {');
    // One ask in the whole function.
    expect(body.split('explainEmpireGold(').length - 1).toBe(1);
  });
});

describe('the tile readout builds one contribution list per hover', () => {
  it('folds the headline out of the very lines it prints under it', () => {
    // The readout is redrawn on every mouse move over the board (`onHover`,
    // Entry XLVII), and it used to ask `tileYieldContributions` twice — once for
    // the figures and once for the itemization — each time building the
    // empire's yield context afresh.
    const body = declaration('function showTileYields(', 'main.ts');
    expect(body).toContain('const contributions = tileYieldContributions(state, playerId, tile);');
    expect(body).toContain('tileYieldNodes(state, playerId, tile, contributions)');
    expect(body).toContain('tileYieldLineNodes(state, playerId, tile, contributions)');
  });
});
