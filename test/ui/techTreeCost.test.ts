/**
 * What the star chart costs to draw (user, 2026-08-29: "the tech tree is quite
 * laggy … it gets laggier as the game goes on").
 *
 * The complaint had a shape and the shape was arithmetic. Every star quoted
 * "~N turns", every quote went through `turnsToTech`, and `turnsToTech` summed
 * `cityYields` over every city the empire held — twenty-seven sweeps of the
 * empire per render. Every star also listed what its technology unlocks, and a
 * building's line is `buildingYieldDelta`, which prices *every city twice*: at a
 * dozen cities that is a thousand `cityYields` calls to draw one screen. And the
 * whole chart was rebuilt — cards, connectors and two layout passes — on every
 * click, twice over, because the click's own render is followed by the host's.
 * All three get worse with each city founded, which is exactly the report.
 *
 * The pass that fixed it is three rules, and this file is the register of them,
 * read out of the source because there is no jsdom in this project (see
 * `techChart.test.ts`, which reads the same file for the same reason):
 *
 *   1. **The rate is read once per render** and handed down — `beginPass`.
 *   2. **A card is built once and repainted after that** — `renderChart` on the
 *      way in, `refreshNodes` for everything after.
 *   3. **The unlock lines are re-priced only when something has happened** —
 *      `unlocksFrom`, keyed on the command log.
 *   4. **A city is priced "as things stand" once per render**, not once per
 *      building — `cityBaselines`, hoisted out of `buildingYieldDelta`.
 *
 * Both hoists carry the same obligation and it is asserted rather than assumed:
 * a rate handed in gives the answer a fetched one gives (`test/sim/tech.test.ts`)
 * and so does a baseline (below). Hard rule 5 does not bend for a parameter.
 */

import { describe, expect, it, vi } from 'vitest';

import * as cities from '../../src/sim/cities';
import type { BuildingId } from '../../src/sim/buildingData';
import { createMap, getTileAt } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { buildingYieldDelta, cityBaselines } from '../../src/sim/tech';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { resetVisibility } from '../../src/sim/visibility';

const CHART_SOURCE = import.meta.glob(['../../src/ui/techTree.ts'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function chartSource(): string {
  const text = Object.values(CHART_SOURCE)[0];
  if (typeof text !== 'string' || text.length === 0) throw new Error('techTree.ts came back empty');
  return text;
}

/** The body of one declaration, brace-matched. `techChart.test.ts`'s reader. */
function chartFunction(declaration: string): string {
  const text = chartSource();
  const at = text.indexOf(declaration);
  expect(at, `no "${declaration}" in techTree.ts`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let index = text.indexOf('{', at); index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    else if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(at, index + 1);
    }
  }
  throw new Error(`"${declaration}" is never closed`);
}

/** How many times a call appears in the whole module. */
function calls(name: string): number {
  return chartSource().split(`${name}(`).length - 1;
}

/**
 * An empire of `count` towns on blank ground — enough of them that the counting
 * below is about a sweep rather than about one city.
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

/** Every building the tree hands over — exactly the set the chart draws lines for. */
function unlockedBuildings(): BuildingId[] {
  const all: BuildingId[] = [];
  for (const id of TECH_IDS) all.push(...(techDef(id).unlocks.buildings ?? []));
  return all;
}

describe('the science rate is summed once a render', () => {
  it('is called in exactly one place, and that place is beginPass', () => {
    // The hard evidence for "one render, one sum". `playerScience` walks every
    // city of the empire, so a second caller is a second sweep — and there used
    // to be four of them (every node, the current node's bar, the strip's
    // schedule, and the HUD's card), which is what made a forty-city chart
    // think before it drew.
    expect(calls('playerScience')).toBe(1);
    expect(chartFunction('function beginPass(')).toContain('rate: playerScience(state, playerId)');
  });

  it('hands the rate to the sim rather than working the estimate out beside it', () => {
    // Hard rule 5 across a parameter: the figure on a star is still
    // `turnsToTech`'s own answer, and the only thing that changed is that the
    // caller had already summed the empire.
    expect(chartFunction('function paintNode(')).toContain(
      'turnsToTech(state, playerId, id, rate)',
    );
    expect(chartFunction('function renderPlanStrip(')).toContain(
      'queueTurns(state, playerId, rate)',
    );
  });

  it('gives every printer the same pass, so no two can quote different rates', () => {
    // The node, the strip, the hover card and the HUD's research card all
    // destructure the one pass. Two of them summing separately would be two
    // answers to "+N a turn" on one screen.
    for (const printer of [
      'function paintNode(',
      'function renderPlanStrip(',
      'function techCard(',
      'function renderStatus(',
    ]) {
      expect(chartFunction(printer), printer).toContain('passNow()');
    }
  });

  it('opens every render with a pass, from the one entry point', () => {
    // A pass opens the render and nothing else opens one: `render` is the only
    // caller, and `passNow` is the fallback for the hover card, which is raised
    // long after the render that drew the star under it.
    expect(chartFunction('function render(')).toContain('beginPass();');
    expect(calls('beginPass')).toBe(3); // the declaration, `render`, `passNow`
  });
});

describe('a click repaints the chart rather than rebuilding it', () => {
  it('lays the sky out on the way in and never again', () => {
    // `renderChart` builds twenty-seven cards, an SVG of connectors and two
    // layout passes with a frame between them. It is called from exactly one
    // place, behind the one condition that means "there is nothing there yet".
    const body = chartFunction('function render(');
    expect(body).toContain('if (field === null) {');
    expect(body).toContain('renderChart();');
    expect(body).toContain('refreshNodes();');
    // The declaration and the one call in `render`.
    expect(calls('renderChart')).toBe(2);
  });

  it('builds no new card on a refresh', () => {
    // The claim in one line: `refreshNodes` never calls `renderNode`. A card
    // that came back new would take the keyboard, the hover and the focus mode
    // with it — which is what the old rebuild did, and why the click handler
    // used to have to hand focus back.
    const body = chartFunction('function refreshNodes(');
    expect(body).not.toContain('renderNode(');
    expect(body).toContain('paintNode(id, face);');
  });

  it('keeps the card the click landed on, so the keyboard is never handed back', () => {
    const handler = chartFunction("card.addEventListener('click'");
    expect(handler).toContain('render();');
    expect(handler).not.toContain('.focus()');
  });

  it('reads a live permission rather than the one the card was built with', () => {
    // A card outlives its render now, so `choosable` had to stop being a
    // closure: the answer captured when the star was drawn is not the answer
    // after the plan has moved twice under it.
    expect(chartFunction("card.addEventListener('click'")).toContain('if (!face.choosable) return');
    expect(chartFunction('function paintNode(')).toContain('face.choosable = choosable;');
  });

  it('re-lights the connectors and re-packs the chart, because a bar moves', () => {
    // The one thing a repaint really does change the *height* of: the progress
    // bar leaves the star that was being researched and joins the one that now
    // is. One pass, not the two-with-a-frame a fresh chart needs — nothing is
    // being waited on. A card whose height moved is a card the pack has to place
    // again, which is why this is the whole layout and not just the lines.
    const body = chartFunction('function refreshNodes(');
    expect(body).toContain('layoutField(field)');
    expect(body).toContain('drawLines(lines)');
    expect(body).not.toContain('requestAnimationFrame');
    expect(body).not.toContain('spaceColumns');
  });
});

describe('the unlock lines are priced against the log', () => {
  it('asks whether anything has happened, not what a delta depends on', () => {
    // Hard rule 1 is what makes this exact: every mutation is a command and an
    // accepted command is a logged command, so a log that has not grown is a
    // state that has not moved. Deliberately the bluntest test there is — a key
    // that named what `buildingYieldDelta` reads would be a second opinion
    // about a number this screen is forbidden to have one about.
    const body = chartFunction('function unlocksAreStale(');
    expect(body).toContain('unlocksFrom.commands !== game.log.length');
    // The seat, because a hot-seat change is not a command; the state's
    // identity, because a loaded save is a different game whose log may be the
    // same length.
    expect(body).toContain('unlocksFrom.playerId !== localPlayerId()');
    expect(body).toContain('unlocksFrom.state !== game.state');
  });

  it('counts this screen’s own commands in, and only on the ones that land', () => {
    // This screen sends two commands and both change what is *planned* — no
    // citizen moves, nothing is built, no technology completes — so re-pricing
    // forty buildings against every city after one would be work for a number
    // that cannot have changed.
    const body = chartFunction('function send(');
    expect(body).toContain('if (result.ok && unlocksFrom) unlocksFrom.commands += 1;');
  });

  it('dispatches from that one seam and nowhere else', () => {
    // What keeps the note above honest: a command sent around `send` would
    // leave the lines claiming to be priced for a state that had moved. One
    // call in the whole module, and it is `send`'s.
    expect(calls('dispatch')).toBe(1);
    expect(chartFunction('function send(')).toContain('dispatch(getGame(), command)');
  });

  it('records the price after a build and after a re-price, never before', () => {
    expect(chartFunction('function renderChart(')).toContain('markUnlocksPriced();');
    const body = chartFunction('function refreshNodes(');
    expect(body).toContain('const reprice = unlocksAreStale();');
    expect(body).toContain('if (reprice) markUnlocksPriced();');
  });
});

describe('a city is priced “as things stand” once a render', () => {
  /**
   * Counts `cityYields`, which is what a delta is made of.
   *
   * The one spy in this suite, and it is restored in a `finally` because the
   * project runs its workers un-isolated (`vite.config.ts`): a spy left standing
   * would follow the module graph into the next file.
   */
  function countingCityYields<T>(run: () => T): { result: T; count: number } {
    const spy = vi.spyOn(cities, 'cityYields');
    try {
      const result = run();
      return { result, count: spy.mock.calls.length };
    } finally {
      spy.mockRestore();
    }
  }

  it('prices each city exactly once for the whole unlock sweep', () => {
    // The chart's open, at the sim level: build the baselines, then ask every
    // building in the tree what it would be worth. The baseline reading is the
    // half that does not depend on the building, and there are forty-odd
    // buildings — before this it was taken once per building per city, which was
    // most of what the star chart cost to draw.
    const state = empire(12);
    const buildings = unlockedBuildings();
    expect(buildings.length).toBeGreaterThan(20);

    const priced = countingCityYields(() => cityBaselines(state, 0));
    expect(priced.count).toBe(state.cities.length);
    expect(priced.result.size).toBe(state.cities.length);

    // What is left is irreducible: one reading per building per city that could
    // still take it — the "with the candidate counted" half of every delta.
    const hoisted = countingCityYields(() => {
      for (const id of buildings) buildingYieldDelta(state, 0, id, priced.result);
    });
    const plain = countingCityYields(() => {
      for (const id of buildings) buildingYieldDelta(state, 0, id);
    });
    expect(hoisted.count * 2).toBe(plain.count);
    // And the whole sweep, baselines included, is under half of what it was.
    expect(priced.count + hoisted.count).toBeLessThan(plain.count / 2 + state.cities.length + 1);
  });

  it('is the same delta either way, for every building the tree unlocks', () => {
    // Hard rule 5 across the parameter: the number under a star is still the
    // subtraction of the same two folds of `cityYields`, and the baseline is the
    // very reading `buildingYieldDelta` would have taken itself.
    const state = empire(6);
    const baselines = cityBaselines(state, 0);
    for (const id of unlockedBuildings()) {
      expect(buildingYieldDelta(state, 0, id, baselines), id).toEqual(
        buildingYieldDelta(state, 0, id),
      );
    }
  });

  it('is built lazily, so a repaint that prices nothing sums nothing', () => {
    // The cheap path stays cheap: a render that carries the unlock lines over
    // never asks for a baseline, and `??=` is what makes the twenty-seven asks
    // of one render into one map.
    expect(chartFunction('function baselines(')).toContain(
      'at.baselines ??= cityBaselines(at.state, at.playerId)',
    );
    expect(chartFunction('function renderUnlocks(')).toContain(
      'buildingYieldDelta(state, playerId, building, baselines())',
    );
    // One filler, one reader: the pass's field is written nowhere else.
    expect(calls('cityBaselines')).toBe(1);
  });
});

