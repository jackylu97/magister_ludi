/**
 * **The Expansionist land: marks, ages and tended fields** (batch E9 of
 * `docs/plans/expansionist-themes-triage.md`). `expansionist.test.ts` checks
 * the rows against the sheet; this file checks what the five cards now do:
 *
 *   · the three new hex marks (`burned`, `marl`, `marlSecond`) and the chain
 *     that lets one hex take marl twice;
 *   · The Burning Season: a burn on an improved grassland or plains hex keeps
 *     the work and writes the `burned` mark; bare ground takes burned country
 *     as before; a hex already burned is refused (readings 1 and 9 to 11);
 *   · The Marl Pits: a mine or quarry marks the farms and pastures beside it,
 *     inside the builder's borders, at most twice (reading 12);
 *   · Commission: Break the Sod: its institution counts every work ten turns
 *     older for the seat's cards, and a building's age does not move (reading
 *     13). The callers that hand no ground facts to the tile test are pinned;
 *   · The Two Harvests: farms, mines and lumber mills count as tended for the
 *     seat's cards and for the Six Gardens goal, never as wild (reading 14);
 *   · The Mountain Schools: two mountains in a town's borders (reading 15);
 *   · the words of all five.
 */

import { describe, expect, it } from 'vitest';

import { applyCommand } from '../../../src/sim/commands';
import { foundCityAt, ownedTiles, refreshCityDerived } from '../../../src/sim/cities';
import { commissionFigure, runCommissions } from '../../../src/sim/commissions';
import {
  chargesLeft,
  improvementError,
  improvementErrorAt,
  improvementYieldDelta,
  payWorkLaidRiders,
} from '../../../src/sim/improvements';
import { type Tile, raiseImprovement, razeImprovement, tileIndex, tileNeighbors } from '../../../src/sim/map';
import { HEX_MARK_IDS, type HexMarkId, RULES } from '../../../src/sim/rulesData';
import { type City, type GameState, addBuilding, bumpRevision, createUnit, playerById } from '../../../src/sim/state';
import {
  cityScopeAdmits,
  describeCard,
  explainCardPercentYields,
  groundFactsFor,
  stripRefs,
  tileConditionHolds,
} from '../../../src/sim/statecraft';
import {
  type CommissionGoal,
  type OrderId,
  type TileCondition,
  orderDef,
  orderIsDealt,
} from '../../../src/sim/statecraftData';
import { explainTileYield, yieldContextFor } from '../../../src/sim/yields/hex';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Puts a charter in this seat's collection: a charter takes no chair. */
function hold(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  bumpRevision(state);
}

/** One town of the given size for this seat, with an empty queue. */
function town(state: GameState, col: number, row: number, population: number, playerId = 0): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** Hands a hex to a town, as its borders growing there would. */
function own(state: GameState, city: City, tile: Tile): void {
  state.tileOwner[tileIndex(state.map, tile.col, tile.row)] = city.id;
  bumpRevision(state);
}

/** The hexes a town owns, its own centre left out. */
function ring(state: GameState, city: City): Tile[] {
  return ownedTiles(state, city).filter((tile) => !(tile.col === city.col && tile.row === city.row));
}

/** What the lines with this source pay on a hex, for seat 0, in one voice. */
function hexPays(state: GameState, tile: Tile, source: string, voice: 'food' | 'production' | 'science' | 'culture'): number {
  return explainTileYield(tile, yieldContextFor(state, 0))
    .filter((line) => line.source.includes(source))
    .reduce((sum, line) => sum + (line[voice] ?? 0), 0);
}

/** Lays a work down with an age, without a worker. */
function work(state: GameState, tile: Tile, improvement: string, age = 0): void {
  raiseImprovement(tile, improvement as never, state.turn - age);
  bumpRevision(state);
}

/** Runs a commission with a smaller goal, so a small board can meet it. */
function withGoals(id: string, goals: CommissionGoal[], run: () => void): void {
  const spec = orderDef(id as OrderId).commission!;
  const before = spec.goals;
  spec.goals = goals;
  try {
    run();
  } finally {
    spec.goals = before;
  }
}

/** Builds with a worker through the command, and says whether it was taken. */
function build(state: GameState, col: number, row: number, improvement: string): { ok: boolean; error?: string } {
  const worker = createUnit(state, 0, 'worker', col, row);
  bumpRevision(state);
  const result = applyCommand(state, {
    type: 'buildImprovement',
    playerId: 0,
    unitId: worker.id,
    improvement: improvement as never,
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

/** Every test a tile condition asks, nested ones included. */
function testsIn(on: TileCondition): string[] {
  const found: string[] = [on.test];
  const inner = on as { of?: TileCondition | TileCondition[] };
  if (Array.isArray(inner.of)) for (const part of inner.of) found.push(...testsIn(part));
  else if (inner.of !== undefined) found.push(...testsIn(inner.of));
  return found;
}

const said = (id: string): string[] => describeCard(id as never).map((clause) => stripRefs(clause.text));

describe('the Expansionist batch E9: the three new hex marks', () => {
  it('adds burned, marl and the second marl to the table, in the table’s order', () => {
    expect(HEX_MARK_IDS).toEqual(['raised', 'aqueductWater', 'burned', 'marl', 'marlSecond']);
    for (const id of HEX_MARK_IDS) expect(RULES.improvements.hexMarks[id], id).toBeDefined();
    const marks = RULES.improvements.hexMarks;
    expect(marks.burned.while).toEqual({ test: 'improved' });
    expect(marks.marl.while).toEqual({ test: 'anyImprovement', improvements: ['farm', 'pasture'] });
    expect(marks.marlSecond.while).toEqual(marks.marl.while);
    for (const id of ['burned', 'marl', 'marlSecond'] as HexMarkId[]) {
      expect(marks[id].yields, id).toEqual({ food: 1, production: 0, gold: 0 });
    }
  });

  it('chains marl to the second marl, and every chain names a real mark and ends', () => {
    const marks = RULES.improvements.hexMarks;
    expect(marks.marl.then).toBe('marlSecond');
    for (const id of HEX_MARK_IDS) {
      const seen: HexMarkId[] = [];
      for (let next: HexMarkId | undefined = id; next !== undefined; next = marks[next].then) {
        expect(HEX_MARK_IDS, `${id} chains to an unknown mark`).toContain(next);
        expect(seen, `${id}'s chain loops at ${next}`).not.toContain(next);
        seen.push(next);
      }
    }
  });

  it('asks no work’s age in any mark’s condition, and admits improved land wherever it asks tended', () => {
    // A mark's condition is asked with no ground facts (see the pin below), so
    // it may not ask a work's age, and a `tended` in it must sit beside
    // `improved`, which every field The Two Harvests names already is.
    for (const id of HEX_MARK_IDS) {
      const tests = testsIn(RULES.improvements.hexMarks[id].while);
      expect(tests, id).not.toContain('standingSince');
      if (tests.includes('tended')) expect(tests, id).toContain('improved');
    }
  });
});

describe('the Expansionist batch E9: The Burning Season', () => {
  function board(): { state: GameState; city: City; field: Tile; bare: Tile } {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    const [field, bare] = ring(state, city);
    work(state, field!, 'farm', 7);
    hold(state, 0, 'theBurningSeason');
    return { state, city, field: field!, bare: bare! };
  }

  it('burns a farm: the farm and its age stay, and the hex gains +1 food while it is improved', () => {
    const { state, field } = board();
    const stamp = field.improvedOn;
    const before = hexPays(state, field, 'Burned land', 'food');
    expect(before).toBe(0);
    const worker = createUnit(state, 0, 'worker', field.col, field.row);
    const charges = chargesLeft(worker);
    expect(charges).toBeGreaterThan(1);
    bumpRevision(state);
    const result = applyCommand(state, {
      type: 'buildImprovement',
      playerId: 0,
      unitId: worker.id,
      improvement: 'burnedCountry',
    });
    expect(result.ok).toBe(true);
    expect(field.improvement).toBe('farm');
    expect(field.improvedOn).toBe(stamp);
    expect(field.marks).toEqual(['burned']);
    expect(hexPays(state, field, 'Burned land', 'food')).toBe(1);
    // The worker spends a charge and its movement, as for any build.
    expect(chargesLeft(worker)).toBe(charges - 1);
    expect(worker.movesLeft).toBe(0);
    // A burned farm is improved, not tended (reading 10).
    expect(tileConditionHolds(field, { test: 'improved' })).toBe(true);
    expect(tileConditionHolds(field, { test: 'tended' })).toBe(false);
  });

  it('lays burned country on bare ground, as before', () => {
    const { state, bare } = board();
    expect(build(state, bare.col, bare.row, 'burnedCountry').ok).toBe(true);
    expect(bare.improvement).toBe('burnedCountry');
    expect(bare.marks).toBeUndefined();
  });

  it('refuses a hex already burned, with a sentence, whatever stands there now', () => {
    const { state, field } = board();
    expect(build(state, field.col, field.row, 'burnedCountry').ok).toBe(true);
    const again = build(state, field.col, field.row, 'burnedCountry');
    expect(again.ok).toBe(false);
    expect(again.error).toBe(`(${field.col}, ${field.row}) is already burned land`);
    // The farm taken up: the mark stays on the ground and pays nothing, and
    // the ground is still refused.
    razeImprovement(field);
    bumpRevision(state);
    expect(field.marks).toEqual(['burned']);
    expect(hexPays(state, field, 'Burned land', 'food')).toBe(0);
    expect(improvementErrorAt(state, 0, field, 'burnedCountry')).toBe(
      `(${field.col}, ${field.row}) is already burned land`,
    );
  });

  it('keeps the row’s ground: grassland or plains with no feature (reading 9)', () => {
    const { state, city } = board();
    const [, , flood, desert, plains] = ring(state, city);
    flood!.feature = 'floodplain';
    work(state, flood!, 'farm');
    desert!.terrain = 'desert';
    work(state, desert!, 'farm');
    plains!.terrain = 'plains';
    work(state, plains!, 'farm');
    expect(improvementErrorAt(state, 0, flood!, 'burnedCountry')).not.toBeNull();
    expect(improvementErrorAt(state, 0, desert!, 'burnedCountry')).not.toBeNull();
    expect(improvementErrorAt(state, 0, plains!, 'burnedCountry')).toBeNull();
  });

  it('burns a farm on a seam, because the farm that opens the seam stays', () => {
    const { state, field } = board();
    field.resource = 'wheat';
    bumpRevision(state);
    expect(improvementErrorAt(state, 0, field, 'burnedCountry')).toBeNull();
    // Bare wheat still wants its farm.
    const { state: other, bare } = board();
    bare.resource = 'wheat';
    bumpRevision(other);
    expect(improvementErrorAt(other, 0, bare, 'burnedCountry')).not.toBeNull();
  });

  it('pays The Flood Festival for a burn on a farm too (reading 11)', () => {
    const { state, field } = board();
    slot(state, 0, 'theFloodFestival');
    const player = playerById(state, 0)!;
    const before = player.faithPool;
    expect(build(state, field.col, field.row, 'burnedCountry').ok).toBe(true);
    expect(player.faithPool - before).toBe(8);
  });

  it('previews the burn on a farm as the mark, not as a new work', () => {
    const { state, field, bare } = board();
    const ctx = yieldContextFor(state, 0);
    const delta = improvementYieldDelta(field, 'burnedCountry', ctx);
    expect(delta.food).toBe(1);
    expect(delta.production).toBe(0);
    expect(improvementYieldDelta(bare, 'burnedCountry', ctx).food).toBe(1);
    // The worker's sheet offers it, and the reducer takes what the sheet offers.
    const worker = createUnit(state, 0, 'worker', field.col, field.row);
    bumpRevision(state);
    expect(improvementError(state, worker.id, 'burnedCountry')).toBeNull();
  });
});

describe('the Expansionist batch E9: The Marl Pits', () => {
  /**
   * A town at (5, 5), and a hill at (5, 2) with its six neighbours: two farms
   * and a pasture inside the borders, a camp inside them, a farm outside them,
   * and one bare hex inside them.
   */
  function board(): { state: GameState; hill: Tile; inFarm: Tile; pasture: Tile; camp: Tile; outFarm: Tile; later: Tile } {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    const hill = at(state, 5, 2);
    hill.hills = true;
    own(state, city, hill);
    const around = tileNeighbors(state.map, hill);
    expect(around).toHaveLength(6);
    const [inFarm, pasture, camp, outFarm, later] = around;
    for (const tile of [inFarm!, pasture!, camp!, later!]) own(state, city, tile);
    work(state, inFarm!, 'farm');
    work(state, pasture!, 'pasture');
    work(state, camp!, 'camp');
    work(state, outFarm!, 'farm');
    return { state, hill, inFarm: inFarm!, pasture: pasture!, camp: camp!, outFarm: outFarm!, later: later! };
  }

  it('is a new Tier I row, dealt, with a rider on each of the two works', () => {
    const def = orderDef('theMarlPits' as OrderId);
    expect(def.band).toBe(1);
    expect(def.type).toBe('economic');
    expect(orderIsDealt('theMarlPits' as OrderId)).toBe(true);
    expect(def.effects).toEqual([
      { kind: 'windfallRider', occasion: 'improvementBuilt', improvement: 'mine', grant: { markBeside: 'marl' } },
      { kind: 'windfallRider', occasion: 'improvementBuilt', improvement: 'quarry', grant: { markBeside: 'marl' } },
    ]);
  });

  it('marks the farms and pastures beside a new mine, inside your borders, and nothing else', () => {
    const { state, hill, inFarm, pasture, camp, outFarm, later } = board();
    // Not seated: a mine marks nothing.
    payWorkLaidRiders(state, 0, hill, 'mine');
    expect(inFarm.marks).toBeUndefined();
    slot(state, 0, 'theMarlPits');
    expect(build(state, hill.col, hill.row, 'mine').ok).toBe(true);
    expect(hill.improvement).toBe('mine');
    expect(inFarm.marks).toEqual(['marl']);
    expect(pasture.marks).toEqual(['marl']);
    expect(camp.marks).toBeUndefined();
    expect(outFarm.marks).toBeUndefined();
    expect(later.marks).toBeUndefined();
    expect(hexPays(state, inFarm, 'Marl', 'food')).toBe(1);
    // A farm built later beside the old mine gains nothing (reading 12).
    work(state, later, 'farm');
    expect(later.marks).toBeUndefined();
  });

  it('marks a farm twice at most: marl, then the second marl, then nothing', () => {
    const { state, hill, inFarm } = board();
    slot(state, 0, 'theMarlPits');
    payWorkLaidRiders(state, 0, hill, 'mine');
    payWorkLaidRiders(state, 0, hill, 'quarry');
    expect(inFarm.marks).toEqual(['marl', 'marlSecond']);
    payWorkLaidRiders(state, 0, hill, 'mine');
    expect(inFarm.marks).toEqual(['marl', 'marlSecond']);
    bumpRevision(state);
    expect(hexPays(state, inFarm, 'Marl', 'food')).toBe(1);
    expect(hexPays(state, inFarm, 'Second marl', 'food')).toBe(1);
    // The marks pay while a farm or pasture stands, whoever works it.
    razeImprovement(inFarm);
    bumpRevision(state);
    expect(hexPays(state, inFarm, 'arl', 'food')).toBe(0);
    work(state, inFarm, 'pasture');
    expect(hexPays(state, inFarm, 'arl', 'food')).toBe(2);
  });

  it('joins the register of mid-turn yield changes beside the town-wide mark', () => {
    const sources = import.meta.glob('../../../src/sim/cities.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>;
    const text = Object.values(sources)[0]!;
    expect(text).toContain('**A lasting mark on the hexes beside a work** (`markHexesBeside`');
    const body = text.slice(text.indexOf('export function markHexesBeside('));
    expect(body.slice(0, body.indexOf('\n}\n'))).toContain('refreshCityDerived(state, town)');
  });
});

describe('the Expansionist batch E9: Commission: Break the Sod', () => {
  const OLD: TileCondition = { test: 'standingSince', turns: 20 };

  function board(): { state: GameState; city: City; farm: Tile; young: Tile; garden: Tile; academy: Tile } {
    const state = bareState();
    state.turn = 40;
    const city = town(state, 5, 5, 4);
    const [farm, young, garden, academy] = ring(state, city);
    work(state, farm!, 'farm', 12);
    work(state, young!, 'farm', 5);
    work(state, garden!, 'burnedCountry', 12);
    work(state, academy!, 'academy', 12);
    return { state, city, farm: farm!, young: young!, garden: garden!, academy: academy! };
  }

  /** Meets the commission on a goal the small board can reach. */
  function meet(state: GameState): void {
    slot(state, 0, 'commissionBreakTheSod');
    withGoals('commissionBreakTheSod', [{ kind: 'reached', figure: 'hexesOwned', count: 1 }], () => {
      expect(runCommissions(state)).toHaveLength(1);
    });
    bumpRevision(state);
  }

  it('leaves your works ten turns older for your cards, and nothing else', () => {
    const { state, farm, young, garden, academy } = board();
    expect(orderDef('commissionBreakTheSod' as OrderId).commission!.reward).toEqual([
      { lasting: [{ kind: 'workAge', turns: 10 }] },
    ]);
    const before = groundFactsFor(state, 0);
    expect(before.workAgeBonus).toBeUndefined();
    for (const tile of [farm, garden, academy]) {
      expect(tileConditionHolds(tile, OLD, undefined, undefined, state.turn, before)).toBe(false);
    }
    meet(state);
    const after = groundFactsFor(state, 0);
    expect(after.workAgeBonus).toBe(10);
    // Improvements, tended works and great people's works alike (reading 13).
    for (const tile of [farm, garden, academy]) {
      expect(tileConditionHolds(tile, OLD, undefined, undefined, state.turn, after)).toBe(true);
    }
    expect(tileConditionHolds(young, OLD, undefined, undefined, state.turn, after)).toBe(false);
    // The stamp on the hex does not move, and another seat's law is its own.
    expect(farm.improvedOn).toBe(state.turn - 12);
    expect(groundFactsFor(state, 1).workAgeBonus).toBeUndefined();
    // No timed food and no worker any more.
    expect(playerById(state, 0)!.timed ?? []).toHaveLength(0);
    expect(state.units.filter((unit) => unit.ownerId === 0)).toHaveLength(0);
  });

  it('reaches a hex line: Dark Earth pays a farm of twelve turns', () => {
    const { state, farm, young } = board();
    slot(state, 0, 'darkEarth');
    expect(hexPays(state, farm, 'Dark Earth', 'food')).toBe(0);
    meet(state);
    expect(hexPays(state, farm, 'Dark Earth', 'food')).toBe(2);
    expect(hexPays(state, young, 'Dark Earth', 'food')).toBe(0);
  });

  it('leaves a building’s age alone', () => {
    const { state, city } = board();
    state.turn = 28;
    addBuilding(state, city, 'library');
    state.turn = 40;
    bumpRevision(state);
    meet(state);
    const scope = { test: 'hasBuilding', building: 'library', standingTurns: 20 } as const;
    expect(cityScopeAdmits(state, city, scope)).toBe(false);
  });

  it('pins the callers that hand the tile test no ground facts', () => {
    // `GroundFacts.workAgeBonus` lists them: each asks a hex mark's own
    // condition or one fixed test, and none asks a work's age (the mark
    // conditions are checked above). A new caller with no ground facts joins
    // this list on purpose, or hands the facts in.
    const sources = import.meta.glob(['../../../src/sim/**/*.ts', '../../../src/ai/**/*.ts'], {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>;
    const name = 'tileConditionHolds(';
    const without: string[] = [];
    for (const [path, text] of Object.entries(sources)) {
      for (let from = text.indexOf(name); from >= 0; from = text.indexOf(name, from + 1)) {
        const before = text.slice(Math.max(0, from - 9), from);
        if (before === 'function ' || /[\w$.]/.test(text[from - 1] ?? '')) continue;
        const args: string[] = [];
        let depth = 1;
        let start = from + name.length;
        let index = start;
        for (; index < text.length; index++) {
          const char = text[index]!;
          if ('([{'.includes(char)) depth += 1;
          else if (')]}'.includes(char)) {
            depth -= 1;
            if (depth === 0) break;
          } else if (char === ',' && depth === 1) {
            args.push(text.slice(start, index).trim());
            start = index + 1;
          }
        }
        const last = text.slice(start, index).trim();
        if (last !== '') args.push(last);
        if (args.length < 6) without.push(`${path.replace('../../../', '')}: ${args[1]}`);
      }
    }
    expect(without.sort()).toEqual([
      'src/ai/value.ts: rule.while',
      'src/sim/cities.ts: rule.while',
      "src/sim/statecraft/evaluator.ts: { test: 'greatWork' }",
      "src/sim/statecraft/evaluator.ts: { test: 'unimproved' }",
      'src/sim/yields/hex.ts: rule.while',
    ]);
  });
});

describe('the Expansionist batch E9: The Two Harvests', () => {
  const TENDED: TileCondition = { test: 'tended' };

  function board(): { state: GameState; city: City; works: Record<string, Tile> } {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const hexes = ring(state, city);
    const rows = ['farm', 'terraces', 'mine', 'lumbermill', 'quarry', 'pasture'];
    const works: Record<string, Tile> = {};
    rows.forEach((row, index) => {
      works[row] = hexes[index]!;
      work(state, hexes[index]!, row);
    });
    return { state, city, works };
  }

  it('is built and dealt, with no deferred half left', () => {
    const def = orderDef('theTwoHarvests' as OrderId);
    expect(orderIsDealt('theTwoHarvests' as OrderId)).toBe(true);
    expect(def.deferred).toBeUndefined();
    expect(def.note).toBeUndefined();
    expect(def.effects).toEqual([
      { kind: 'rule', rule: 'fieldsTended', improvements: ['farm', 'mine', 'lumbermill'] },
    ]);
  });

  it('counts farms, mines and lumber mills as tended for the seat, and never as wild', () => {
    const { state, works } = board();
    const holds = (row: string, on: TileCondition, seat = 0): boolean =>
      tileConditionHolds(works[row]!, on, undefined, undefined, state.turn, groundFactsFor(state, seat));
    expect(holds('farm', TENDED)).toBe(false);
    slot(state, 0, 'theTwoHarvests');
    expect(groundFactsFor(state, 0).tendedFields).toEqual(['farm', 'mine', 'lumbermill']);
    // A terrace counts as a farm (`improvementCountsAs`).
    for (const row of ['farm', 'terraces', 'mine', 'lumbermill']) expect(holds(row, TENDED), row).toBe(true);
    for (const row of ['quarry', 'pasture']) expect(holds(row, TENDED), row).toBe(false);
    // Improved still, and not wild (reading 14).
    expect(holds('farm', { test: 'improved' })).toBe(true);
    expect(holds('farm', { test: 'unimproved' })).toBe(false);
    // The other seat's law is its own.
    expect(holds('farm', TENDED, 1)).toBe(false);
  });

  it('pays a tended hex line on a farm, once where a card asks improved or tended', () => {
    const { state, works } = board();
    slot(state, 0, 'theTendedCountry');
    expect(hexPays(state, works.farm!, 'The Tended Country', 'production')).toBe(0);
    slot(state, 0, 'theTwoHarvests');
    expect(hexPays(state, works.farm!, 'The Tended Country', 'production')).toBe(2);
    expect(hexPays(state, works.quarry!, 'The Tended Country', 'production')).toBe(0);
    // "Improved or tended" is one condition, so a farm that is both counts once.
    const either: TileCondition = { test: 'any', of: [{ test: 'improved' }, TENDED] };
    const ground = groundFactsFor(state, 0);
    expect(tileConditionHolds(works.farm!, either, undefined, undefined, state.turn, ground)).toBe(true);
  });

  it('counts the fields toward the Six Gardens goal, once, and leaves the worked-tile figure alone', () => {
    const { state, city, works } = board();
    const garden = at(state, 5, 2);
    own(state, city, garden);
    work(state, garden, 'burnedCountry');
    const worked = commissionFigure(state, 0, 'improvedTilesWorked');
    expect(commissionFigure(state, 0, 'tendedTiles')).toBe(1);
    slot(state, 0, 'theTwoHarvests');
    // The garden, the farm, the terrace, the mine and the lumber mill.
    expect(commissionFigure(state, 0, 'tendedTiles')).toBe(5);
    expect(commissionFigure(state, 0, 'improvedTilesWorked')).toBe(worked);
    expect(works.quarry!.improvement).toBe('quarry');
  });
});

describe('the Expansionist batch E9: The Mountain Schools', () => {
  function science(state: GameState, city: City): number {
    return explainCardPercentYields(state, city)
      .filter((line) => line.card === 'theMountainSchools' && line.yield === 'science')
      .reduce((sum, line) => sum + line.percent, 0);
  }

  it('asks for at least two mountains inside the town’s borders, worked or not (reading 15)', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    const [first, second] = ring(state, city);
    slot(state, 0, 'theMountainSchools');
    expect(science(state, city)).toBe(0);
    first!.terrain = 'mountain';
    bumpRevision(state);
    // Beside one mountain, which the old text paid, and one is not enough.
    expect(science(state, city)).toBe(0);
    // A mountain beyond the borders does not count.
    at(state, 5, 1).terrain = 'mountain';
    bumpRevision(state);
    expect(science(state, city)).toBe(0);
    second!.terrain = 'mountain';
    bumpRevision(state);
    expect(science(state, city)).toBe(15);
  });

  it('reads a scope with no count as one hex, as before', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    ring(state, city)[0]!.terrain = 'mountain';
    bumpRevision(state);
    expect(cityScopeAdmits(state, city, { test: 'terrainInBorders', terrain: 'mountain' })).toBe(true);
    expect(cityScopeAdmits(state, city, { test: 'terrainInBorders', terrain: 'mountain', atLeast: 2 })).toBe(false);
  });
});

describe('the Expansionist batch E9: the words', () => {
  it('prints all five cards in plain words', () => {
    expect(said('theBurningSeason')).toEqual([
      'once drafted, opens the Burned Country for your workers to build; this card takes no chair',
      'on an improved hex, the work stays, and the hex gains +1 food for the rest of the game while it stays improved; a hex takes this only once',
    ]);
    expect(said('theMarlPits')).toEqual([
      'building a Mine gives every hex with a Farm or Pasture beside it, inside your borders, +1 food for the rest of the game, at most +2 food on one hex',
      'building a Quarry gives every hex with a Farm or Pasture beside it, inside your borders, +1 food for the rest of the game, at most +2 food on one hex',
    ]);
    expect(said('commissionBreakTheSod')).toContain(
      "Reward: for the rest of the game, your improvements, tended works and great people's works count as having stood 10 turns longer for your cards",
    );
    expect(said('theTwoHarvests')).toEqual([
      'a Farm, Mine or Lumbermill of yours also counts as tended land for your cards, but not as wild land',
    ]);
    expect(said('theMountainSchools')[0]).toBe(
      '+15% science in every city with at least 2 mountain hexes inside its borders',
    );
  });
});
