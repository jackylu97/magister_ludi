/**
 * **A town nobody controls, deciding for itself** — batch PP1, `docs/flags.md`
 * (qqq).
 *
 * A puppet's production is visible but uncontrollable: the seat's own appraisal
 * chooses it under the puppet profile, and whichever client drives the seat
 * issues it as an ordinary logged command. What this file pins is the *outcome*
 * of that appraisal on hand-built towns, because the two things the ruling asks
 * for are behaviours and not shapes: a puppet raises what is worth raising, and
 * it falls back to the conversion only when nothing is.
 *
 * Every fixture is built by hand — `bareState`'s blank grassland, cities founded
 * through the simulation's own verb, buildings written straight onto the town —
 * so each claim is one board and one reading rather than a hundred turns of
 * arena that could drift for any reason at all. `bumpRevision` after every hand
 * mutation, which is the bench's own rule (`test/sim/benches.test.ts` audits it):
 * the what-if grid the appraisal folds through is memoised on the board's
 * revision, so a town edited behind its back would be priced as it was.
 */

import { describe, expect, it } from 'vitest';

import { puppetProduction, puppetRedecision, queueAhead, nextBotDecision } from '../../src/ai/bot';
import { withAiTuning } from '../../src/ai/aiConfig';
import { type City, type GameState, bumpRevision } from '../../src/sim/state';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import type { QueueItem } from '../../src/sim/state';
import { type BuildingId, buildingDef } from '../../src/sim/buildingData';
import { TECH_IDS } from '../../src/sim/techData';
import { at, bareState } from './improvementHelpers';
import aiJson from '../../data/ai.json';

/**
 * A seat with a home town and a puppet, and `extraTowns` more beside them.
 *
 * The home town is given a queue so that it is never the `cityProduction`
 * blocker the driver answers first — every claim below is about the puppet, and
 * a fixture where some other town is the subject would pass for the wrong
 * reason. The treasury is deliberately full: gold pressure is an *empire* fact
 * and a bankrupt one would price every maintained row out of the table, which is
 * a claim about solvency rather than about puppets (the last case below is
 * exactly that claim, and asks for it on purpose).
 */
function bench(options: {
  buildings?: BuildingId[];
  population?: number;
  extraTowns?: number;
  broke?: boolean;
  gold?: number;
  /** Stamp every town as having bought its one unit already, so the purse is quiet. */
  boughtToday?: boolean;
  queue?: QueueItem[];
}): { state: GameState; puppet: City } {
  const state = bareState(20, 16);
  const home = foundCityAt(state, 0, at(state, 3, 3));
  home.queue = [{ kind: 'building', id: 'granary' }];
  const puppet = foundCityAt(state, 0, at(state, 12, 9));
  puppet.puppet = true;
  puppet.population = options.population ?? 6;
  if (options.buildings !== undefined) puppet.buildings = [...options.buildings];
  if (options.queue !== undefined) puppet.queue = [...options.queue];
  state.players[0]!.gold = options.gold ?? (options.broke === true ? 0 : 500);
  for (let i = 0; i < (options.extraTowns ?? 0); i++) {
    const extra = foundCityAt(state, 0, at(state, 4 + i * 2, 13));
    extra.queue = [{ kind: 'building', id: 'granary' }];
    extra.population = 4;
    refreshCityDerived(state, extra);
  }
  // A seat with no beeline is a `research` blocker, and a blocker outranks the
  // housekeeping arm this file is watching. The unresearched nodes `bareState`
  // leaves are the rule-granting ones; aiming at one of them is the cheapest
  // way to say "this seat owes the game nothing else".
  const open = TECH_IDS.find((id) => !state.players[0]!.techsResearched.includes(id));
  if (open !== undefined) state.players[0]!.researching = open;
  if (options.boughtToday === true) {
    for (const city of state.cities) {
      city.purchasedUnitTurns = {
        militaryGold: state.turn,
        civilianGold: state.turn,
        faith: state.turn,
      };
    }
  }
  refreshCityDerived(state, home);
  refreshCityDerived(state, puppet);
  bumpRevision(state);
  return { state, puppet };
}

/** The four rows every fixture here has already raised before it asks anything. */
const CHEAP_ROWS: BuildingId[] = ['monument', 'granary', 'shrine', 'palisade'];

/** Everything a town of this age could hold, so that nothing is left to raise. */
const EVERYTHING: BuildingId[] = [
  ...CHEAP_ROWS,
  'barracks',
  'library',
  'market',
  'aqueduct',
  'watermill',
  'cathedral',
  'forum',
  'caravanserai',
  'bourse',
  'highTemple',
  'temple',
  'stoneWalls',
  'university',
  'bazaar',
  'bank',
];

function pick(state: GameState, city: City): QueueItem | null {
  return puppetProduction(state, state.players[0]!, city);
}

describe('what a puppet raises', () => {
  it('raises the row that supplies authority when the empire is over its cap', () => {
    // Seven towns and no Monument: the writ is short, and `explainBuildingRow`
    // prices `authorityCapacity` at the meter's *live* price — which is what a
    // blocked want would pay for one more point, not a constant. So this is an
    // emergent reading rather than a rule anybody wrote, and that is why it is
    // worth pinning: the day the meter's price stops moving, this fails.
    const { state, puppet } = bench({
      buildings: ['granary', 'shrine'] as BuildingId[],
      extraTowns: 5,
    });
    const chosen = pick(state, puppet);
    expect(chosen).not.toBeNull();
    expect(chosen!.kind).toBe('building');
    expect(buildingDef(chosen!.id as BuildingId).authorityCapacity ?? 0).toBeGreaterThan(0);
  });

  it('raises the yield row over the tithe when there is one worth raising', () => {
    // The cheap rows are up, so what is left is the maintained ones — a Library
    // against the conversion. The conversion is a coin a turn for ever and the
    // Library is beakers minus a wage, so this is exactly the comparison the
    // puppet profile's thumb decides, and the thumb was re-cut on this bench.
    const { state, puppet } = bench({ buildings: CHEAP_ROWS });
    const chosen = pick(state, puppet);
    expect(chosen).toEqual({ kind: 'building', id: 'library' });
  });

  it('falls back to the tithe when there is nothing left to raise', () => {
    // Not a preference: the table has no building left in it that this town can
    // legally start, so the conversion is what the argmax finds. A puppet that
    // picked a conversion *here* is a puppet doing the only useful thing left.
    const { state, puppet } = bench({ buildings: EVERYTHING, broke: true });
    const chosen = pick(state, puppet);
    expect(chosen).not.toBeNull();
    expect(chosen!.kind).toBe('project');
  });
});

describe('a puppet re-decides', () => {
  it('turns off a conversion the moment a better row is standing', () => {
    // The bug the batch closes: a project never leaves the queue, so this town's
    // queue is non-empty for the rest of the game and the two doors that give a
    // puppet something to build both only ever fired on an empty one.
    const { state, puppet } = bench({
      buildings: CHEAP_ROWS,
      queue: [{ kind: 'project', id: 'tithes' }],
    });
    expect(puppetRedecision(state, state.players[0]!, puppet)).toEqual({
      kind: 'building',
      id: 'library',
    });
  });

  it('leaves the conversion alone when nothing beats it', () => {
    const { state, puppet } = bench({
      buildings: EVERYTHING,
      broke: true,
      queue: [{ kind: 'project', id: 'tithes' }],
    });
    expect(puppetRedecision(state, state.players[0]!, puppet)).toBeNull();
  });

  it('never abandons a building already in progress', () => {
    // Hammers banked are hammers kept. The town is holding a Barracks it would
    // not choose today — `puppetProduction` on the same board names something
    // else — and the re-decision says nothing about it at all.
    const { state, puppet } = bench({
      buildings: CHEAP_ROWS,
      queue: [{ kind: 'building', id: 'barracks' }, { kind: 'project', id: 'tithes' }],
    });
    expect(pick(state, puppet)).not.toEqual({ kind: 'building', id: 'barracks' });
    expect(puppetRedecision(state, state.players[0]!, puppet)).toBeNull();
  });

  it('says nothing about a town that is not this seat’s puppet', () => {
    const { state, puppet } = bench({
      buildings: CHEAP_ROWS,
      queue: [{ kind: 'project', id: 'tithes' }],
    });
    delete (puppet as { puppet?: true }).puppet;
    bumpRevision(state);
    expect(puppetRedecision(state, state.players[0]!, puppet)).toBeNull();
  });

  it('defends the conversion by puppet.switchMargin, and the knob turns', () => {
    // A knob that turns nothing is a dial wearing a number. Same board, same
    // scorer: at the shipped margin the Library wins, and at a margin wide
    // enough to swallow it the town keeps minting.
    const { state, puppet } = bench({
      buildings: CHEAP_ROWS,
      queue: [{ kind: 'project', id: 'tithes' }],
    });
    const player = state.players[0]!;
    expect(aiJson.puppet.switchMargin).toBeGreaterThan(0);
    expect(
      withAiTuning({ puppet: { switchMargin: 0 } }, () =>
        puppetRedecision(state, player, puppet),
      ),
    ).not.toBeNull();
    expect(
      withAiTuning({ puppet: { switchMargin: 100 } }, () =>
        puppetRedecision(state, player, puppet),
      ),
    ).toBeNull();
  });
});

describe('the switch as a command', () => {
  it('promotes the row in front of the conversion, which is never cancelled', () => {
    const { state, puppet } = bench({
      buildings: CHEAP_ROWS,
      queue: [{ kind: 'project', id: 'tithes' }],
    });
    const player = state.players[0]!;
    const wanted = puppetRedecision(state, player, puppet)!;
    expect(queueAhead(state, player, puppet, wanted)).toEqual([
      wanted,
      { kind: 'project', id: 'tithes' },
    ]);
  });

  it('reads out in the feed as the town turning', () => {
    // Clause 4 of the ruling: the switch is its own decision line, and the
    // subject already says whose choice it was not.
    const { state, puppet } = bench({
      buildings: CHEAP_ROWS,
      gold: 45,
      boughtToday: true,
      queue: [{ kind: 'project', id: 'tithes' }],
    });
    const decision = nextBotDecision(state, 0);
    expect(decision).not.toBeNull();
    expect(decision!.subject).toBe(`${puppet.name} (puppet)`);
    expect(decision!.summary).toBe(`${puppet.name} turns from Tithes to Library.`);
    expect(decision!.command).toEqual({
      type: 'setCityProduction',
      playerId: 0,
      cityId: puppet.id,
      queue: [
        { kind: 'building', id: 'library' },
        { kind: 'project', id: 'tithes' },
      ],
    });
  });
});
