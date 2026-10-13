/**
 * **The standing garrison** — batch X13, `docs/flags.md` (sss).
 *
 * The audit found one root under three symptoms: `garrisonAt` counted *any*
 * combatant standing on a town's hex, a scout passing through included, so the
 * turn a fresh ranger stepped into the capital that town's soldier want vanished
 * from the book, the shadow price of a coin fell to the band's floor, and every
 * gold-paying row — and every technology that unlocks one — was undervalued
 * six-fold on alternate turns. The research goal flipped back and forth with it,
 * and the Warrior candidate dropped out of the table so the Scout won it by
 * default and the seat opened with three of them.
 *
 * The six cases below are the ruling's own pins, in its order:
 *
 *   · (a) the reading — a scout on the hex is not a garrison, and is a defender;
 *   · (c) the price — a coin is worth the same before and after the scout
 *     arrives, because the want no longer vanishes under it;
 *   · (b) the term — the soldier want survives a garrison already met, and the
 *     Warrior row keeps its empty-town premium with a scout in the town;
 *   · (d) the consequences — seed 7's goal does not thrash while its knowledge
 *     is unchanged, and the opening raises a soldier first and never more
 *     rangers than its own cap wants.
 *
 * The last two are played games rather than benches, deliberately: the defect
 * was invisible on any single board and only showed as a *sequence*. Every one
 * of the six was run against the old behaviour first and every one failed there.
 * The two played games are forty turns of bot play on a standard map, so they
 * live in `aiGarrison.slow.test.ts`; the four benches here stay in core.
 */
import { describe, expect, it } from 'vitest';

import { chooseProduction, nextBotDecision, valueContext } from '../../src/ai/bot';
import { defendersAt, garrisonAt } from '../../src/ai/campaign';
import { aiConfigFor } from '../../src/ai/aiConfig';
import type { ValueTerm } from '../../src/ai/decision';
import { applyCommand } from '../../src/sim/commands';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { newGame } from './newGameHelpers';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import {
  type City,
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import { UNIT_TYPE_IDS, isExplorer, unitDef } from '../../src/sim/unitData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';

/** `aiWar.test.ts`' bench: an arranged board, so a claim is about one town. */
function bench(seats = 2): GameState {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: Array.from({ length: seats }, (_unused, index) => ({
      name: ['Ada', 'Bors'][index]!,
      color: ['#a00', '#00a'][index]!,
    })),
  });
  state.map = createMap({ width: 20, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(20 * 12).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function seat(state: GameState, id: number): Player {
  return playerById(state, id)!;
}

/** The first ranging row the roster holds, by its marker and never by a name. */
const RANGER = UNIT_TYPE_IDS.find((id) => isExplorer(unitDef(id)))!;

/**
 * A grown one-town empire past the opening, with a treasury: the board a book is
 * interesting on. Turn 50 puts it past `military.scoutEarlyTurns` so the opening
 * book is not what answers.
 */
function town(gold = 200): { state: GameState; city: City } {
  const state = bench(1);
  state.turn = 50;
  const city = foundCityAt(state, 0, at(state.map, 5, 5));
  city.population = 5;
  refreshCityDerived(state, city);
  seat(state, 0).gold = gold;
  bumpRevision(state);
  recomputeAllVisibility(state);
  return { state, city };
}

/** The first term anywhere in a tree whose label matches. Depth-first, in order. */
function findTerm(terms: readonly ValueTerm[], match: RegExp): ValueTerm | null {
  for (const term of terms) {
    if (match.test(term.label)) return term;
    const inside = term.parts === undefined ? null : findTerm(term.parts, match);
    if (inside !== null) return inside;
  }
  return null;
}

/** The seat's decisions played out until it proposes one of a kind. */
function decisionOfType(state: GameState, playerId: number, type: string, budget = 40) {
  for (let guard = 0; guard < budget; guard++) {
    const decision = nextBotDecision(state, playerId);
    if (decision === null) return null;
    if (decision.command.type === type) return decision;
    if (!applyCommand(state, decision.command).ok) return null;
  }
  return null;
}

describe('the standing garrison (batch X13)', () => {
  it('does not count a ranger as a garrison, and still counts it as a defender', () => {
    // (a). The two readings are split by name because they are two questions:
    // what is *holding* this town, and what would an attacker have to go
    // through. A scout answers the second and not the first.
    const { state, city } = town();
    expect(garrisonAt(state, 0, city)).toBe(0);
    expect(defendersAt(state, 0, city)).toBe(0);
    createUnit(state, 0, RANGER, city.col, city.row);
    bumpRevision(state);
    expect(garrisonAt(state, 0, city)).toBe(0);
    expect(defendersAt(state, 0, city)).toBe(1);
    createUnit(state, 0, 'warrior', city.col, city.row);
    bumpRevision(state);
    expect(garrisonAt(state, 0, city)).toBe(1);
    expect(defendersAt(state, 0, city)).toBe(2);
  });

  it('prices a coin the same before and after a scout steps onto the capital', () => {
    // The symptom the audit measured: gold at 36 one turn and 6 the next, on
    // nothing but a ranger walking home. A scout carries no wage
    // (`isExplorer` is one of `unitUpkeep`'s free clauses) and buys nothing, so
    // there is no honest reading on which it should move the price of a coin at
    // all — and now it moves none of the three.
    const { state, city } = town();
    const before = valueContext(state, seat(state, 0));
    createUnit(state, 0, RANGER, city.col, city.row);
    bumpRevision(state);
    recomputeAllVisibility(state);
    const after = valueContext(state, seat(state, 0));
    expect(after.prices.gold).toBe(before.prices.gold);
    expect(after.prices.faith).toBe(before.prices.faith);
    expect(after.priceNotes.gold).toBe(before.priceNotes.gold);
    // And the want itself is still in the book, which is what holds the price up.
    expect(after.wants.gold.some((row) => row.label.startsWith('Warrior at '))).toBe(true);
  });

  it('keeps a soldier want in the book once the garrison is met, charged at nought', () => {
    // (b). The garrison is a term rather than a door: with the town held the
    // premium reads nothing and the soldier is worth its own field value, so
    // the row stays to be compared against instead of taking the whole book
    // with it when it goes.
    const { state, city } = town();
    createUnit(state, 0, 'warrior', city.col, city.row);
    bumpRevision(state);
    recomputeAllVisibility(state);
    const ctx = valueContext(state, seat(state, 0));
    expect(garrisonAt(state, 0, city)).toBe(aiConfigFor(undefined).military.garrisonPerCity);
    const row = ctx.wants.gold.find((want) => want.label.startsWith('Warrior at '));
    expect(row).toBeDefined();
    expect(row!.worth).toBeGreaterThan(0);
  });

  it('keeps the Warrior row — and its empty-town premium — with a scout in the town', () => {
    // (b) at the queue, and this is the third symptom's exact mechanism. The
    // soldier branch pays `threat.garrisonValue` for a town **standing empty**,
    // and a ranger counted as the garrison took that whole premium off the
    // Warrior — a hundred and forty points, on nothing but a scout walking home
    // — so the Scout, whose own branch has no such comparison to lose, won the
    // table by default and the seat raised another one. The row is still in the
    // table either way; what the defect took was its reason to win.
    const { state, city } = town(0);
    createUnit(state, 0, RANGER, city.col, city.row);
    bumpRevision(state);
    recomputeAllVisibility(state);
    const decision = decisionOfType(state, 0, 'setCityProduction');
    expect(decision).not.toBeNull();
    const warrior = decision!.candidates.find((row) => row.label === 'Warrior');
    expect(warrior).toBeDefined();
    expect(warrior!.rejected).toBeUndefined();
    const premium = findTerm(warrior!.terms, /standing empty/);
    expect(premium).not.toBeNull();
    expect(premium!.value).toBe(aiConfigFor(undefined).threat.garrisonValue);
    // And the town is not told to raise another ranger while one is standing in it.
    const chosen = chooseProduction(state, seat(state, 0), city);
    expect(chosen).not.toBeNull();
    if (chosen!.kind === 'unit') {
      expect(isExplorer(unitDef(chosen!.id as never))).toBe(false);
    }
  });
});
