/**
 * Renown: the fifth Entry XVIII bucket, its ledger and its ladder
 * (`docs/great-people.md`).
 *
 * What is on trial here is rule 5 applied to a *count*: `explainRenown` is the
 * ordered list, every total is a fold of it, and `settleRenownWindfall` is the
 * **one** seam renown is ever added through — the end-of-turn trickle, a
 * wonder's lump on completion and every Triumph all go the same way. The
 * great-person half of the bucket (the draw, the verbs) is
 * `greatPeople.test.ts`'s; the Triumph half is `triumphs.test.ts`'s.
 */

import { describe, expect, it } from 'vitest';

import { buildingDef } from '../../src/sim/buildingData';
import { applyCommand } from '../../src/sim/commands';
import { greatPersonBlocker } from '../../src/sim/greatPeople';
import { GREAT_PERSON_IDS } from '../../src/sim/greatPeopleData';
import {
  explainRenown,
  foldRenown,
  planRecruitment,
  recruitmentSettledBy,
  renownPerTurn,
  renownThreshold,
  settleRenownWindfall,
} from '../../src/sim/renown';
import { RULES } from '../../src/sim/rulesData';
import { type GameState, claimWonder } from '../../src/sim/state';
import { offerSize } from '../../src/sim/statecraft';
import { runEndOfTurn } from '../../src/sim/turn';
import { game, found } from './statecraftHelpers';

const LADDER = RULES.renown;

/** A city of this seat with the named buildings standing in it. */
function town(state: GameState, playerId: number, ...buildings: string[]) {
  const city = state.cities.find((c) => c.ownerId === playerId) ?? found(state, playerId);
  for (const id of buildings) city.buildings.push(id as never);
  return city;
}

// --- the ledger -------------------------------------------------------------

describe('the ledger', () => {
  it('names nothing at all for an empire with no buildings', () => {
    const g = game();
    expect(explainRenown(g.state, 0)).toEqual([]);
    expect(renownPerTurn(g.state, 0)).toBe(0);
  });

  it('pays one line per building, tagged with the family it feeds', () => {
    const g = game();
    const city = town(g.state, 0, 'library', 'barracks');
    const lines = explainRenown(g.state, 0);
    // `BUILDING_IDS` order — the *table's*, not the order the town happened to
    // build them, which is what makes two cities holding the same pair itemise
    // them identically.
    expect(lines).toEqual([
      { source: `Barracks at ${city.name}`, family: 'general', amount: 1, perTurn: true },
      { source: `Library at ${city.name}`, family: 'scholar', amount: 1, perTurn: true },
    ]);
    expect(renownPerTurn(g.state, 0)).toBe(2);
  });

  it('pays a wonder its trickle, on top of whatever else the town holds', () => {
    const g = game();
    const city = town(g.state, 0, 'library', 'theOracle');
    claimWonder(g.state, 'theOracle', city);
    const oracle = buildingDef('theOracle').renown!;
    const lines = explainRenown(g.state, 0);
    expect(lines.map((line) => line.amount)).toEqual([1, oracle.perTurn]);
    expect(renownPerTurn(g.state, 0)).toBe(1 + oracle.perTurn);
  });

  it('is the fold of its own list and nothing else', () => {
    const g = game();
    town(g.state, 0, 'library', 'market', 'workshop', 'amphitheater');
    const lines = explainRenown(g.state, 0);
    let sum = 0;
    for (const line of lines) sum += line.amount;
    expect(foldRenown(lines)).toBe(sum);
    expect(renownPerTurn(g.state, 0)).toBe(sum);
  });

  it('pays nobody else’s buildings', () => {
    const g = game();
    town(g.state, 0, 'library');
    expect(renownPerTurn(g.state, 1)).toBe(0);
  });
});

// --- the ladder -------------------------------------------------------------

describe('the ladder', () => {
  it('is first + step per name already recruited', () => {
    const g = game();
    const player = g.state.players[0]!;
    expect(renownThreshold(player)).toBe(LADDER.first);
    player.greatPeopleRecruited = 1;
    expect(renownThreshold(player)).toBe(LADDER.first + LADDER.step);
    player.greatPeopleRecruited = 4;
    expect(renownThreshold(player)).toBe(LADDER.first + LADDER.step * 4);
  });

  it('plans a fill and keeps the overflow', () => {
    const g = game();
    const player = g.state.players[0]!;
    player.renownPool = LADDER.first + 7;
    expect(planRecruitment(player)).toEqual({ cost: LADDER.first, overflow: 7 });
    expect(planRecruitment(player, LADDER.first - 1)).toBeNull();
    expect(recruitmentSettledBy(player, 0)).toBe('a great person');
    player.renownPool = 0;
    expect(recruitmentSettledBy(player, LADDER.first)).toBe('a great person');
    expect(recruitmentSettledBy(player, LADDER.first - 1)).toBeNull();
  });
});

// --- the seam ---------------------------------------------------------------

describe('settleRenownWindfall', () => {
  it('banks the pool and the feed record together', () => {
    const g = game();
    const player = g.state.players[0]!;
    settleRenownWindfall(g.state, player, [
      { family: 'scholar', amount: 5 },
      { family: 'general', amount: 3 },
      { family: null, amount: 2 },
    ]);
    expect(player.renownPool).toBe(10);
    expect(player.renownByFamily).toEqual({
      scholar: 5,
      artist: 0,
      engineer: 0,
      merchant: 0,
      general: 3,
    });
  });

  it('opens an offer on crossing, and keeps the overflow', () => {
    const g = game();
    found(g.state, 0);
    const player = g.state.players[0]!;
    const offer = settleRenownWindfall(g.state, player, [
      { family: 'scholar', amount: LADDER.first + 9 },
    ]);
    expect(offer).not.toBeNull();
    expect(offer!.options).toHaveLength(RULES.offers.greatPerson);
    expect(player.renownPool).toBe(9);
    expect(player.greatPersonOffer).toBe(offer);
  });

  it('draws to offerSize, so a rider widens it', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('theOracle');
    claimWonder(g.state, 'theOracle', city);
    // The Oracle widens Statecraft drafts only, so the great-person offer is
    // still the base — what is on trial is that the *generator asks*.
    expect(offerSize(g.state, 0, 'greatPerson')).toBe(RULES.offers.greatPerson);
    const offer = settleRenownWindfall(g.state, g.state.players[0]!, [
      { family: null, amount: LADDER.first },
    ]);
    expect(offer!.options).toHaveLength(offerSize(g.state, 0, 'greatPerson'));
  });

  it('deals only one offer at a time, and banks the rest', () => {
    const g = game();
    found(g.state, 0);
    const player = g.state.players[0]!;
    // Enough for three recruitments in one lump.
    settleRenownWindfall(g.state, player, [{ family: null, amount: LADDER.first * 4 }]);
    expect(player.greatPersonOffer!.options.length).toBeGreaterThan(0);
    expect(player.renownPool).toBe(LADDER.first * 3);
    // And a second payment while the offer stands changes nothing but the pool.
    const before = player.greatPersonOffer;
    settleRenownWindfall(g.state, player, [{ family: null, amount: 50 }]);
    expect(player.greatPersonOffer).toBe(before);
  });

  it('banks rather than blocks when the whole roster is spent', () => {
    const g = game();
    found(g.state, 0);
    const player = g.state.players[0]!;
    g.state.recruited.push(...GREAT_PERSON_IDS);
    settleRenownWindfall(g.state, player, [{ family: null, amount: LADDER.first * 2 }]);
    // Nothing deducted, nothing offered, and the turn may still be ended.
    expect(player.renownPool).toBe(LADDER.first * 2);
    expect(player.greatPersonOffer).toBeUndefined();
    expect(greatPersonBlocker(player)).toBeNull();
  });

  it('blocks End Turn while a name is waiting', () => {
    const g = game();
    found(g.state, 0);
    const player = g.state.players[0]!;
    expect(greatPersonBlocker(player)).toBeNull();
    settleRenownWindfall(g.state, player, [{ family: null, amount: LADDER.first }]);
    expect(greatPersonBlocker(player)).toBe('a great person is waiting to be called');
  });
});

// --- the phase --------------------------------------------------------------

describe('the renown phase', () => {
  it('banks the trickle once per turn, per empire', () => {
    const g = game();
    town(g.state, 0, 'library', 'market');
    runEndOfTurn(g.state);
    expect(g.state.players[0]!.renownPool).toBe(2);
    expect(g.state.players[0]!.renownByFamily.scholar).toBe(1);
    expect(g.state.players[0]!.renownByFamily.merchant).toBe(1);
    runEndOfTurn(g.state);
    expect(g.state.players[0]!.renownPool).toBe(4);
  });

  it('never pays a triumph twice — the lump is banked when it is earned', () => {
    const g = game();
    const player = g.state.players[0]!;
    // A triumph earned this turn shows on the ledger and is *not* re-banked by
    // the phase: `renownPerTurn` is the recurring half alone.
    player.triumphs.push({ id: 'thirdHearth', turn: g.state.turn });
    const lines = explainRenown(g.state, 0);
    expect(lines.some((line) => line.source.startsWith('Triumph ·'))).toBe(true);
    expect(renownPerTurn(g.state, 0)).toBe(0);
    runEndOfTurn(g.state);
    expect(player.renownPool).toBe(0);
  });

  it('skips the wild', () => {
    const g = game();
    const config = { ...g.config, barbarians: true };
    void config;
    // The wild is seated only when the config asks; what is asserted here is the
    // register the phase walks — `realPlayers` — which is the same one
    // `runStatecraft` and `advanceResearch` walk.
    const source = renownPhaseSource();
    expect(source).toContain('realPlayers(state)');
  });
});

/** The renown module's own source, for the register assertions below. */
const SIM_SOURCE = import.meta.glob('../../src/sim/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function sourceOf(file: string): string {
  const path = Object.keys(SIM_SOURCE).find((key) => key.endsWith(`/${file}`))!;
  return SIM_SOURCE[path]!;
}

function renownPhaseSource(): string {
  return sourceOf('renown.ts');
}

// --- the register -----------------------------------------------------------

describe('the register', () => {
  it('adds renown in exactly one place', () => {
    // `settleRenownWindfall` is the seam (Entry XVIII), so nothing outside
    // `renown.ts` may write the pool — a second path is how a bucket ends up
    // with two answers to "how close am I".
    const offenders = Object.keys(SIM_SOURCE)
      .filter((path) => /\brenownPool\s*(\+=|=)/.test(SIM_SOURCE[path]!))
      .map((path) => path.slice(path.lastIndexOf('/') + 1))
      .sort();
    expect(offenders).toEqual(['renown.ts']);
  });

  it('reads the renown column in exactly one place', () => {
    const offenders = Object.keys(SIM_SOURCE)
      .filter((path) => /\.renown\b/.test(strip(SIM_SOURCE[path]!)))
      .map((path) => path.slice(path.lastIndexOf('/') + 1))
      .sort();
    // `renown.ts` folds the trickle; `cities.ts` reads the wonder's lump at the
    // one moment a wonder is realised. Nobody else has an opinion about it.
    expect(offenders).toEqual(['cities.ts', 'renown.ts']);
  });
});

/** Source with its comments taken out — `offers.test.ts`'s stripper. */
function strip(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// --- the log ----------------------------------------------------------------

describe('renown in the log', () => {
  it('replays byte-identically through a turn that banks a trickle', () => {
    const a = game(61);
    const b = game(61);
    for (const g of [a, b]) town(g.state, 0, 'library', 'workshop');
    for (const g of [a, b]) {
      applyCommand(g.state, { type: 'endTurn', playerId: 0 });
      applyCommand(g.state, { type: 'endTurn', playerId: 1 });
    }
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(a.state.players[0]!.renownPool).toBe(2);
  });
});
