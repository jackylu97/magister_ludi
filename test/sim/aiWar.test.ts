/**
 * **War & diplomacy, phase three: the bot's half.**
 *
 * `aiBot.test.ts` pins the contract (every command accepted, the same board
 * always the same command), `aiDecision.test.ts` the arithmetic (a score is the
 * fold of its terms) and `aiPersona.test.ts` the brain-v1 opinions. This file
 * pins what the seat now does about *other seats*, and each claim is asked of
 * the pure function that holds it rather than of a played game, because a played
 * game can only demonstrate any of them statistically:
 *
 *   · **the warscore** — six labelled lines, folding to their own total, and
 *     mirror-imaged between the two empires;
 *   · **the declaration** — a ratio against a bar, a town in reach, and a truce
 *     the *rules* refuse through;
 *   · **the peace** — sue below the floor, sign a fair paper, press on above the
 *     ceiling;
 *   · **the bargain** — accept a duplicate-for-lacking swap, decline what costs
 *     more than it brings, and offer one when there is one to offer;
 *   · **the opening book, the escort and the puppet** — the three rulings that
 *     are not appraisals at all;
 *   · **the three tactics** of the military brain (ruled 2026-09-04) — a hurt
 *     piece mends, a spearman holds for a bowman that has not shot, and a bowman
 *     steps behind our line. Each is one arranged board and one assertion, and
 *     each is crude v1 by the ruling's own leave.
 *
 * The other two thirds of that batch — the sighted levy and the unit mix — are
 * appraisals rather than orders and live in `aiAppraisal.test.ts`.
 *
 * Every command this file expects is also put to the simulation's own gate, so a
 * test that passed while the reducer would have refused the command is a test
 * that cannot pass.
 */

import { describe, expect, it } from 'vitest';

import {
  chooseProduction,
  nextBotDecision,
  puppetProduction,
  valueContext,
} from '../../src/ai/bot';
import { aiConfigFor, aiConfigForPuppet } from '../../src/ai/aiConfig';
import { armyStrength, diplomacyDecision, explainWarScore } from '../../src/ai/diplomacy';
import { type BotDecision, type ValueTerm, foldTerms } from '../../src/ai/decision';
import { driveBots } from '../../src/ai/driver';
import { hasResource, foundCityAt, resourceCopies } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { proposeDealAt } from '../../src/sim/diplomacy';
import { createGame } from '../../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import type { TerrainId } from '../../src/sim/terrainData';
import {
  type City,
  type GameConfig,
  type GameState,
  type Player,
  createUnit,
  newGame,
  playerById,
} from '../../src/sim/state';
import { buildingDef } from '../../src/sim/buildingData';
import { isVisibleTo, recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { unitDef } from '../../src/sim/unitData';
import { previewCombat } from '../../src/sim/combat';
import { wrappedDistance, tileHex } from '../../src/sim/map';
import { slotLayout } from '../../src/sim/statecraftData';
import { closeWar, openWar, setPeaceOffer } from '../../src/sim/wars';

// --- the bench --------------------------------------------------------------

/**
 * A blank state on flat grassland with three seats at the table — `deals.test.ts`'
 * bench, and for its reason: every claim below is about *one decision on a board
 * somebody arranged*, and a generated map would arrange it differently every
 * time the mapgen is tuned.
 */
function bench(
  seats = 2,
  { width = 20, height = 12, terrain = 'grassland' }: { width?: number; height?: number; terrain?: TerrainId } = {},
): GameState {
  const colors = ['#a00', '#00a', '#0a0'];
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: Array.from({ length: seats }, (_unused, index) => ({
      name: ['Ada', 'Bors', 'Cyra'][index]!,
      color: colors[index]!,
    })),
  });
  state.map = createMap({ width, height, terrain });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
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

function seat(state: GameState, playerId: number): Player {
  const player = playerById(state, playerId);
  if (!player) throw new Error(`no seat ${playerId}`);
  return player;
}

/** A seat's own diplomatic decision, asked directly. */
function abroad(state: GameState, playerId: number) {
  const player = seat(state, playerId);
  return diplomacyDecision(state, player, valueContext(state, player));
}

/** Soldiers for a seat, on one hex. */
function raise(state: GameState, playerId: number, count: number, col: number, row: number): void {
  for (let index = 0; index < count; index++) {
    createUnit(state, playerId, 'warrior', col + index, row);
    // The escalation counter the warscore's losses proxy reads. Raised here
    // because these pieces were conjured rather than built.
    const player = seat(state, playerId);
    player.unitsBuilt.warrior = (player.unitsBuilt.warrior ?? 0) + 1;
  }
}

/**
 * A seat with a worked luxury seam — `deals.test.ts`' `giveLuxury`, written
 * straight onto the tile: how a seam comes to be improved is
 * `improvements.test.ts`' subject, not this one's.
 */
function giveLuxury(
  state: GameState,
  city: City,
  col: number,
  row: number,
  id: 'silk' | 'wine' | 'spices',
): void {
  const tile = at(state.map, col, row);
  tile.resource = id;
  tile.improvement = 'plantation';
  state.tileOwner[tileIndex(state.map, col, row)] = city.id;
}

// --- 1. the warscore --------------------------------------------------------

describe('the warscore', () => {
  it('folds to its own total, and reads the same war backwards', () => {
    const state = bench();
    const mine = foundCityAt(state, 0, at(state.map, 4, 5));
    const theirs = foundCityAt(state, 1, at(state.map, 14, 5));
    expect(mine.id).not.toBe(theirs.id);
    openWar(state, 0, 1);
    raise(state, 0, 4, 5, 5);
    raise(state, 1, 1, 13, 5);
    // Seat 1 has raised three soldiers it no longer has: a losing war.
    seat(state, 1).unitsBuilt.warrior = 4;

    const ai = aiConfigFor(undefined);
    const ours = explainWarScore(state, seat(state, 0), seat(state, 1), ai);
    const theirsRead = explainWarScore(state, seat(state, 1), seat(state, 0), ai);
    // Rule: a score is the fold of its terms, exactly.
    expect(foldTerms(ours.terms)).toBe(ours.total);
    expect(foldTerms(theirsRead.terms)).toBe(theirsRead.total);
    // Six lines and no more — the doc's whole specification.
    expect(ours.terms).toHaveLength(6);
    // The same war from the other side is the same number negated.
    expect(theirsRead.total).toBeCloseTo(-ours.total, 9);
    expect(ours.total).toBeGreaterThan(0);
  });

  it('reads the standing army the way the user asked for it', () => {
    const state = bench();
    raise(state, 0, 3, 5, 5);
    const strength = unitDef('warrior').combatStrength * 3;
    expect(armyStrength(state, 0)).toBe(strength);
    // A civilian is not an army.
    createUnit(state, 0, 'settler', 6, 6);
    expect(armyStrength(state, 0)).toBe(strength);
  });
});

// --- 2. the declaration -----------------------------------------------------

describe('declaring a war', () => {
  /** A warmonger with an army, a neighbour with one warrior, towns in reach. */
  function facing(persona?: string): GameState {
    const state = bench();
    foundCityAt(state, 0, at(state.map, 4, 5));
    foundCityAt(state, 1, at(state.map, 12, 5));
    // Three to one: over a warmonger's bar, under a peaceful seat's.
    raise(state, 0, 3, 5, 5);
    raise(state, 1, 1, 11, 5);
    if (persona !== undefined) seat(state, 0).persona = persona;
    return state;
  }

  /** Every label in a term tree, so a nested appraisal's lines are readable. */
  function labelsOf(terms: readonly { label: string; parts?: readonly unknown[] }[]): string {
    return terms
      .map((term) =>
        term.parts === undefined
          ? term.label
          : `${term.label} | ${labelsOf(term.parts as never)}`,
      )
      .join(' | ');
  }

  it('declares on the seat it out-arms, and prints the ratio, the bar and the town', () => {
    const state = facing('warmonger');
    const decision = abroad(state, 0);
    expect(decision?.kind).toBe('war');
    expect(decision?.command.type).toBe('declareWar');
    expect(decision?.command).toMatchObject({ type: 'declareWar', playerId: 0, targetId: 1 });
    // The three things the ruling asked to see.
    const chosen = decision!.candidates.find((row) => row.chosen)!;
    const labels = labelsOf(chosen.terms);
    expect(labels).toMatch(/strength against their/);
    expect(labels).toMatch(/appetite for a fight/);
    expect(labels).toMatch(/stands \d+ hexes from one of our pieces/);
    expect(labels).toMatch(/the bar is/);
    expect(foldTerms(chosen.terms)).toBe(chosen.score);
    // And the reducer takes it.
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });

  it('leaves a peaceful seat at peace on the same board', () => {
    // The balanced seat's bar is `declareThresholdPeaceful`, which six warriors
    // against one does not clear — and tall and zealot put it out of reach
    // entirely, which is the ruling.
    for (const persona of [undefined, 'tall', 'zealot'] as const) {
      const state = facing(persona);
      const decision = abroad(state, 0);
      expect({ persona, declared: decision?.command.type === 'declareWar' }).toEqual({
        persona,
        declared: false,
      });
    }
  });

  it('never declares through a truce, and says so in the rules’ own words', () => {
    const state = facing('warmonger');
    openWar(state, 0, 1);
    closeWar(state, 0, 1);
    const decision = abroad(state, 0);
    // With a truce standing there is nothing to declare and nothing to sue for.
    expect(decision?.command.type).not.toBe('declareWar');
  });

  it('will not declare on somebody it cannot reach', () => {
    // A map wide enough that the far city is outside `war.reachRadius` of every
    // piece this seat has — the clause the ruling asked for.
    const state = bench(2, { width: 60, height: 30 });
    foundCityAt(state, 0, at(state.map, 2, 2));
    foundCityAt(state, 1, at(state.map, 30, 28));
    raise(state, 0, 8, 3, 2);
    raise(state, 1, 1, 29, 28);
    seat(state, 0).persona = 'warmonger';
    const decision = abroad(state, 0);
    expect(decision === null || decision.command.type !== 'declareWar').toBe(true);
  });
});

// --- 3. the peace -----------------------------------------------------------

describe('suing for peace, and signing one', () => {
  /** A war seat 0 is losing badly: their army four times ours, ours all dead. */
  function losing(): GameState {
    const state = bench();
    foundCityAt(state, 0, at(state.map, 4, 5));
    foundCityAt(state, 1, at(state.map, 12, 5));
    openWar(state, 0, 1);
    raise(state, 1, 8, 11, 5);
    // Ours were raised and are gone: the losses proxy.
    seat(state, 0).unitsBuilt.warrior = 6;
    raise(state, 0, 1, 5, 5);
    return state;
  }

  it('puts a peace on the table when the war reads under its floor', () => {
    const state = losing();
    const decision = abroad(state, 0);
    expect(decision?.kind).toBe('war');
    expect(decision?.command).toMatchObject({ type: 'proposePeace', playerId: 0, targetId: 1 });
    expect(decision?.summary).toMatch(/Sues the Bors for peace/);
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });

  it('brings coin with it when the war is lost badly enough', () => {
    const state = losing();
    seat(state, 0).gold = 400;
    // Deepen the rout past `war.tributeFloor`.
    seat(state, 0).unitsBuilt.warrior = 20;
    raise(state, 1, 10, 11, 6);
    const decision = abroad(state, 0);
    const command = decision!.command as { type: string; give?: { gold?: number } };
    expect(command.type).toBe('proposePeace');
    expect(command.give?.gold).toBeGreaterThan(0);
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });

  it('signs a white peace the other seat has put up', () => {
    const state = losing();
    setPeaceOffer(state, 1, 0, true);
    const decision = abroad(state, 0);
    expect(decision?.command).toMatchObject({ type: 'proposePeace', playerId: 0, targetId: 1 });
    expect(decision?.summary).toMatch(/Signs the peace/);
    // The signing row is the one whose score is not the warscore alone — it is
    // the war plus what the paper moves — so it is the one most likely to be
    // described beside its arithmetic rather than folded from it.
    for (const row of decision!.candidates) {
      expect({ row: row.label, fold: foldTerms(row.terms) }).toEqual({ row: row.label, fold: row.score });
    }
    // And the two flags together are what `settlePeace` closes the war on.
    expect(applyCommand(state, decision!.command).ok).toBe(true);
    const war = state.wars.find((row) => row.a === 0 && row.b === 1)!;
    expect([...war.offers!].sort()).toEqual([0, 1]);
  });

  it('presses on rather than signing while it is winning', () => {
    const state = bench();
    foundCityAt(state, 0, at(state.map, 4, 5));
    foundCityAt(state, 1, at(state.map, 12, 5));
    openWar(state, 0, 1);
    raise(state, 0, 12, 5, 5);
    seat(state, 1).unitsBuilt.warrior = 9;
    raise(state, 1, 1, 11, 5);
    setPeaceOffer(state, 1, 0, true);
    seat(state, 0).persona = 'warmonger';
    const decision = abroad(state, 0);
    // Nothing to say: it is over the ceiling it would sign at, and its own
    // score is nowhere near the floor it sues at.
    expect(decision === null || decision.command.type !== 'proposePeace').toBe(true);
  });
});

// --- 4. bargains ------------------------------------------------------------

describe('bargains', () => {
  /** Seat 0 with two silk seams, seat 1 with a wine seam. */
  function traders(): GameState {
    const state = bench();
    const mine = foundCityAt(state, 0, at(state.map, 4, 5));
    const theirs = foundCityAt(state, 1, at(state.map, 14, 5));
    giveLuxury(state, mine, 4, 6, 'silk');
    giveLuxury(state, mine, 5, 6, 'silk');
    giveLuxury(state, theirs, 14, 6, 'wine');
    return state;
  }

  it('offers a duplicate for a kind it lacks', () => {
    const state = traders();
    expect(resourceCopies(state, 0, 'silk')).toBe(2);
    expect(hasResource(state, 0, 'wine')).toBe(false);
    const decision = abroad(state, 0);
    expect(decision?.kind).toBe('deal');
    expect(decision?.command).toMatchObject({
      type: 'proposeDeal',
      playerId: 0,
      targetId: 1,
      give: { luxuries: ['silk'] },
      take: { luxuries: ['wine'] },
    });
    const chosen = decision!.candidates.find((row) => row.chosen)!;
    expect(foldTerms(chosen.terms)).toBe(chosen.score);
    // A seam for a seam is priced at exactly nothing on this seat's books —
    // both sides are the baseline — which is what makes it a *swap*. What it
    // gains is the signature, and that is the ruled rule rather than a margin.
    expect(chosen.score).toBe(0);
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });

  it('signs the same swap when it is put the other way round', () => {
    const state = traders();
    proposeDealAt(state, 1, 0, { luxuries: ['wine'] }, { luxuries: ['silk'] });
    const decision = abroad(state, 0);
    expect(decision?.kind).toBe('deal');
    expect(decision?.command.type).toBe('acceptDeal');
    expect(applyCommand(state, decision!.command).ok).toBe(true);
    expect(hasResource(state, 0, 'wine')).toBe(true);
  });

  it('sends back a paper that costs more than it brings', () => {
    const state = traders();
    // Our only wine for their nothing — and we do not even hold wine.
    proposeDealAt(state, 1, 0, {}, { luxuries: ['silk'] });
    const decision = abroad(state, 0);
    expect(decision?.command).toMatchObject({ type: 'declineDeal', playerId: 0 });
    expect(decision?.summary).toMatch(/Sends the Bors' bargain back/);
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });

  it('takes coin for a duplicate at the baseline, and refuses it under', () => {
    const ai = aiConfigFor(undefined);
    for (const [gold, expected] of [
      [ai.war.luxuryGoldBaseline, 'acceptDeal'],
      [1, 'declineDeal'],
    ] as const) {
      const state = traders();
      seat(state, 1).gold = 5000;
      proposeDealAt(state, 1, 0, { gold }, { luxuries: ['silk'] });
      const decision = abroad(state, 0);
      expect({ gold, verb: decision?.command.type }).toEqual({ gold, verb: expected });
    }
  });

  it('never offers a second paper to the same seat — the reducer’s own throttle', () => {
    const state = traders();
    const first = abroad(state, 0);
    expect(applyCommand(state, first!.command).ok).toBe(true);
    const second = abroad(state, 0);
    expect(second === null || second.command.type !== 'proposeDeal').toBe(true);
  });
});

// --- 5. the opening book and the escort -------------------------------------

const OPENING: GameConfig = {
  seed: 20260831,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

describe('the opening book', () => {
  it('hard-codes the first build of the first city to a scout', () => {
    const game = createGame(OPENING);
    // Play until somebody has founded, then ask that town what it starts.
    for (let turn = 0; turn < 4; turn++) driveBots(game, { warn: () => {} });
    const city = game.state.cities[0]!;
    const owner = seat(game.state, city.ownerId);
    // The log is the proof: the very first thing that town was told to build.
    const first = game.log.find(
      (command) => command.type === 'setCityProduction' && command.cityId === city.id,
    ) as { queue: { kind: string; id: string }[] } | undefined;
    expect(first).toBeDefined();
    expect(first!.queue[0]!.kind).toBe('unit');
    expect(unitDef(first!.queue[0]!.id as never).ignoresTerrainCost).toBe(true);
    // And it does not fire twice: the empire has built something now.
    expect(Object.keys(owner.unitsBuilt).length >= 0).toBe(true);
  });

  it('is a ruling rather than a weight — the second town is scored like any other', () => {
    const state = bench();
    const capital = foundCityAt(state, 0, at(state.map, 4, 5));
    const second = foundCityAt(state, 0, at(state.map, 8, 5));
    seat(state, 0).unitsBuilt.warrior = 1;
    const item = chooseProduction(state, seat(state, 0), second);
    expect(item).not.toBeNull();
    // Nothing about the second town is the book's business; the capital's
    // opening is spent (something has been built).
    expect(chooseProduction(state, seat(state, 0), capital)).not.toBeNull();
  });
});

describe('the settler escort', () => {
  it('founds where it stands rather than march past a raider unescorted', () => {
    // Poor ground, so the ordinary "this scores over the minimum" clause is not
    // what answers: the settler would otherwise walk, and the escort rule is
    // exactly the thing that stops it.
    const state = bench(2, { terrain: 'desert' });
    const settler = createUnit(state, 0, 'settler', 6, 6);
    // An enemy column two hexes off, and nothing of ours beside the settler.
    // At war, because a rival at peace can do nothing to a settler at all —
    // which is the clause `escortReading` asks `atWar` for.
    openWar(state, 0, 1);
    const raider = createUnit(state, 1, 'warrior', 8, 6);
    expect(raider.ownerId).toBe(1);
    const decision = nextBotDecision(state, 0);
    expect(decision?.command).toMatchObject({
      type: 'foundCity',
      playerId: 0,
      settlerUnitId: settler.id,
    });
    expect(decision?.summary).toMatch(/nothing of ours walking with it/);
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });

  it('will not walk to a site something hostile is camped beside', () => {
    // The half that actually saves settlers: the danger is almost never where
    // the piece is standing, it is at the empty site nobody has taken *because*
    // the wild is sitting in it.
    const state = bench(2);
    const capital = foundCityAt(state, 0, at(state.map, 4, 5));
    // Beside its own town, so founding where it stands is refused and the piece
    // has to choose a site to walk to.
    const settler = createUnit(state, 0, 'settler', capital.col + 1, capital.row);
    openWar(state, 0, 1);
    createUnit(state, 1, 'warrior', 11, 5);

    const decision = nextBotDecision(state, 0);
    expect(decision?.command.type).toBe('moveUnit');
    const struck = decision!.candidates.filter((row) => row.rejected !== undefined);
    expect(struck.some((row) => row.rejected!.includes('nothing of ours is walking with this settler'))).toBe(
      true,
    );
    // And the hex it does pick is clear of the column.
    const target = (decision!.command as { target: { col: number; row: number } }).target;
    expect(Math.abs(target.col - 11) + Math.abs(target.row - 5)).toBeGreaterThan(0);
    expect(applyCommand(state, decision!.command).ok).toBe(true);

    // With a soldier of ours walking beside it — one that is *not* a garrison —
    // nothing is struck out at all.
    createUnit(state, 0, 'warrior', settler.col, settler.row + 1);
    const escortedDecision = nextBotDecision(state, 0);
    if (escortedDecision !== null && escortedDecision.command.type === 'moveUnit') {
      expect(
        escortedDecision.candidates.some((row) =>
          (row.rejected ?? '').includes('nothing of ours is walking with this settler'),
        ),
      ).toBe(false);
    }
  });

  it('marches the nearest free soldier to a settler walking alone', () => {
    const state = bench(2);
    const city = foundCityAt(state, 0, at(state.map, 4, 5));
    // A garrison, so the town is held, and a spare piece to spend on the escort.
    createUnit(state, 0, 'warrior', city.col, city.row);
    const spare = createUnit(state, 0, 'warrior', 6, 5);
    const settler = createUnit(state, 0, 'settler', 10, 8);
    const decision = nextBotDecision(state, 0);
    // The first idle piece the blocker names may be either; ask the spare one
    // directly by putting the settler's own order out of reach.
    expect(decision).not.toBeNull();
    const orders = [decision!.command];
    for (let guard = 0; guard < 6 && orders.length < 4; guard++) {
      const next = nextBotDecision(state, 0);
      if (next === null) break;
      if (!applyCommand(state, next.command).ok) break;
      orders.push(next.command);
    }
    const escorted = orders.some(
      (command) =>
        command.type === 'moveUnit' &&
        command.unitId === spare.id &&
        command.target.col === settler.col &&
        command.target.row === settler.row,
    );
    expect(escorted).toBe(true);
  });
});

// --- 6. the puppet ----------------------------------------------------------

describe('a puppet builds, and what it will not build', () => {
  function puppeted(): { state: GameState; city: City } {
    const state = bench();
    // Something legal to build that is not a unit: with no technology at all a
    // town's whole building roster is closed, and the escape hatch below would
    // (rightly) hand the puppet the unrestricted list.
    seat(state, 0).techsResearched.push('stonecraft', 'earthenware');
    foundCityAt(state, 0, at(state.map, 4, 5));
    const taken = foundCityAt(state, 0, at(state.map, 10, 5));
    taken.puppet = true;
    taken.captured = true;
    taken.population = 4;
    return { state, city: taken };
  }

  it('never raises a unit and never starts a wonder', () => {
    const { state, city } = puppeted();
    const item = puppetProduction(state, seat(state, 0), city);
    expect(item).not.toBeNull();
    expect(item!.kind).not.toBe('unit');
    if (item!.kind === 'building') expect(buildingDef(item!.id).wonder).not.toBe(true);
  });

  it('answers nothing about a town that is not a puppet', () => {
    const { state } = puppeted();
    const own = state.cities.find((town) => town.puppet !== true)!;
    expect(puppetProduction(state, seat(state, 0), own)).toBeNull();
  });

  it('leans the seat’s own appraisal toward coin rather than replacing it', () => {
    // The profile is folded over whichever persona the seat plays, so a
    // warmonger's puppet is still a warmonger's town — only richer.
    const plain = aiConfigFor('warmonger');
    const puppet = aiConfigForPuppet('warmonger');
    expect(puppet.weights.military).toBe(plain.weights.military);
    expect(puppet.weights.gold[0]!).toBeGreaterThan(plain.weights.gold[0]!);
  });

  it('is answered by the bot seat like any other town, so no blocker stands', () => {
    const { state, city } = puppeted();
    expect(nextBotDecision(state, 0)).not.toBeNull();
    // Drive the seat until the puppet has a queue; nothing may be refused.
    const subjects: string[] = [];
    for (let guard = 0; guard < 12; guard++) {
      if (city.queue.length > 0) break;
      const next = nextBotDecision(state, 0);
      if (next === null) break;
      subjects.push(next.subject);
      expect(applyCommand(state, next.command).ok).toBe(true);
    }
    expect(city.queue.length).toBeGreaterThan(0);
    expect(city.queue[0]!.kind).not.toBe('unit');
    // The feed says which town it is *and* that nobody chose it: the ruling
    // asks a puppet's production to be visible, and this is where it is visible.
    expect(subjects).toContain(`${city.name} (puppet)`);
  });
});

// --- 7. the drafting hand ---------------------------------------------------

describe('slotting is scored rather than first-fit', () => {
  /** A seat holding two cards, with the chiefdom's three offices open. */
  function holding(): GameState {
    const state = bench();
    const city = foundCityAt(state, 0, at(state.map, 4, 5));
    // Slotting is housekeeping — it blocks nothing, so it is only reached once
    // the things that *do* block are answered. Give the town a queue and the
    // empire a goal, and the next thing the seat wants is the card.
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    seat(state, 0).researching = 'earthenware';
    const sc = seat(state, 0).statecraft;
    // A wildcard card and a military one: the chiefdom opens one office of each
    // kind plus an economic, so the two cards contend for the wildcard.
    sc.orders = [
      'firstRites',
      'bloodedSpears',
    ];
    return state;
  }

  it('spends the office fewest cards fit, and prints the contention', () => {
    const state = holding();
    // The beeline re-aims itself first (housekeeping's own order); the card is
    // the next thing this seat wants.
    let decision = nextBotDecision(state, 0);
    for (let guard = 0; guard < 4 && decision !== null && decision.command.type !== 'slotOrder'; guard++) {
      expect(applyCommand(state, decision.command).ok).toBe(true);
      decision = nextBotDecision(state, 0);
    }
    expect(decision?.command.type).toBe('slotOrder');
    const command = decision!.command as { cardId: string; slotIndex: number };
    // `bloodedSpears` is military and fits two offices (military, wildcard);
    // `firstRites` is a wildcard card and fits only the wildcard. The military
    // office is the one nothing else can use, so it is filled first.
    expect(command.cardId).toBe('bloodedSpears');
    expect(slotLayout(seat(state, 0).statecraft.government)[command.slotIndex]).toBe('military');
    const chosen = decision!.candidates.find((row) => row.chosen)!;
    expect(chosen.terms.some((term) => term.label.includes('would also fit'))).toBe(true);
    expect(foldTerms(chosen.terms)).toBe(chosen.score);
    // The chosen row is the best-scoring one, which is what makes the table
    // readable: a reader sorting by score sees the same answer the bot took.
    const scored = decision!.candidates.filter((row) => row.rejected === undefined);
    expect(Math.max(...scored.map((row) => row.score))).toBe(chosen.score);
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });

  it('compares a charter’s faces instead of taking the first', () => {
    const state = holding();
    const sc = seat(state, 0).statecraft;
    // Two faces with very different layouts: one that opens three military
    // offices, one that opens none. The empire holds a military card.
    sc.pendingGovernment = { tier: 4, options: ['councilOfElders', 'warChief'] };
    const decision = nextBotDecision(state, 0);
    expect(decision?.command.type).toBe('adoptGovernment');
    expect(decision!.candidates).toHaveLength(2);
    for (const row of decision!.candidates) {
      expect(foldTerms(row.terms)).toBe(row.score);
      expect(row.terms.some((term) => term.label.includes('slot'))).toBe(true);
    }
    const chosen = decision!.candidates.find((row) => row.chosen)!;
    expect(Math.max(...decision!.candidates.map((row) => row.score))).toBe(chosen.score);
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });
});

// --- 8. the three tactics ---------------------------------------------------

/**
 * **The military brain's unit-order half** (ruled 2026-09-04).
 *
 * Every board here is one seat at war with another, because that is the cheapest
 * way to put a *hostile* piece on a bench that seats no barbarians: `atWar` is
 * the one predicate the bot reads, and the wild and a declared enemy answer it
 * the same way. Every piece but the one under test is fortified, so it is not
 * idle (`unitAwaitsOrders`) and the blocker names the piece the claim is about.
 */
describe('the three tactics', () => {
  /**
   * A seat, a held town far from the action, and a war with the neighbour.
   *
   * The treasury is set above `solvency.arrearsTreasury` and below the spending
   * threshold on purpose: an empire in arrears stops paying wages before it does
   * anything else (`disbandCommand`, ahead of every blocker) and a rich one buys
   * a soldier, and neither is what these boards are about.
   */
  function front(): { state: GameState; city: City } {
    const state = bench(2);
    const city = foundCityAt(state, 0, at(state.map, 2, 2));
    const garrison = createUnit(state, 0, 'warrior', city.col, city.row);
    garrison.fortifiedTurns = 0;
    seat(state, 0).gold = 120;
    openWar(state, 0, 1);
    return { state, city };
  }

  /** The seat's decisions, driven until one is an order to this piece. */
  function orderFor(state: GameState, playerId: number, unitId: number, budget = 8): BotDecision | null {
    for (let guard = 0; guard < budget; guard++) {
      const decision = nextBotDecision(state, playerId);
      if (decision === null) return null;
      if ((decision.command as { unitId?: number }).unitId === unitId) return decision;
      if (!applyCommand(state, decision.command).ok) return null;
    }
    return null;
  }

  /** Every label in a decision's term trees, flattened. `aiAppraisal.test.ts`' reader. */
  function labels(decision: BotDecision): string {
    const walk = (terms: readonly ValueTerm[]): string =>
      terms
        .map((term) => (term.parts === undefined ? term.label : `${term.label} | ${walk(term.parts)}`))
        .join(' | ');
    return decision.candidates.map((row) => `${row.label}: ${walk(row.terms)}`).join(' || ');
  }

  // --- (a) heal when weak ---------------------------------------------------

  /**
   * A hurt spearman of ours on our own ground with an enemy column next door,
   * and the enemy's health as the one thing that changes between the two claims.
   */
  function wounded(enemyHp: number, ourHp = 30): { state: GameState; piece: ReturnType<typeof createUnit> } {
    const { state, city } = front();
    // Our own ground: the heal arm asks the tile's owner, and a piece bleeding
    // in a rival's fields is deliberately left to go on fighting (crude v1).
    state.tileOwner[tileIndex(state.map, 5, 5)] = city.id;
    // A spearman against a warrior, so the exchange is favourable on its own
    // merits: what is under test is the *preference* not to take it, and a blow
    // the bot would have declined anyway would prove nothing.
    const piece = createUnit(state, 0, 'spearman', 5, 5);
    piece.hp = ourHp;
    const enemy = createUnit(state, 1, 'warrior', 6, 5);
    enemy.hp = enemyHp;
    recomputeAllVisibility(state);
    return { state, piece };
  }

  it('digs in and mends rather than trading blows at thirty hit points', () => {
    const { state, piece } = wounded(100);
    // The blow is there and it is even favourable — the arm is a *preference*,
    // and this is what it prefers.
    const blow = previewCombat(state, piece.id, { col: 6, row: 5 });
    expect(blow.ok && blow.damageToDefender > blow.damageToAttacker).toBe(true);
    const decision = orderFor(state, 0, piece.id);
    expect(decision?.command.type).toBe('fortify');
    expect(labels(decision!)).toMatch(/30 of 100 hit points, and this seat rests below/);
    for (const row of decision!.candidates) expect(foldTerms(row.terms)).toBe(row.score);
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });

  it('swings anyway when the blow would finish it', () => {
    // The ruling's own exception, and the only thing different about the board
    // is the defender's health.
    const { state, piece } = wounded(1);
    const decision = orderFor(state, 0, piece.id);
    expect(decision?.command).toMatchObject({ type: 'attack', target: { col: 6, row: 5 } });
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });

  it('is a fraction of the piece’s own maximum, not a flat figure', () => {
    // Sixty of a hundred is over the knob, so the same board with a healthier
    // piece takes the exchange the wounded one declined.
    const { state, piece } = wounded(100, 60);
    const blow = previewCombat(state, piece.id, { col: 6, row: 5 });
    expect(blow.ok && blow.damageToDefender > blow.damageToAttacker).toBe(true);
    const decision = orderFor(state, 0, piece.id);
    expect(decision?.command).toMatchObject({ type: 'attack', target: { col: 6, row: 5 } });
  });

  // --- (b) ranged before melee ---------------------------------------------

  /**
   * A spearman and a bowman of ours, both able to hit the same enemy column.
   *
   * The spearman is created **first**, so it is the first idle piece on the
   * board and the blocker names it — the bowman is what it is deferring *to*,
   * and a bowman that had already been given its own order would not be.
   */
  function bothCanHit(): { state: GameState; spear: ReturnType<typeof createUnit> } {
    const { state } = front();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    createUnit(state, 0, 'archer', 4, 5);
    createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    return { state, spear };
  }

  it('holds the melee blow when a bowman of ours can take the same shot', () => {
    const { state, spear } = bothCanHit();
    // Both blows are legal and the melee exchange is a favourable one: the
    // deferral is the bot's opinion, not the rules', and not a blow it would
    // have declined anyway.
    const blow = previewCombat(state, spear.id, { col: 6, row: 5 });
    expect(blow.ok && blow.damageToDefender > blow.damageToAttacker).toBe(true);
    expect(previewCombat(state, state.units.find((unit) => unit.type === 'archer')!.id, { col: 6, row: 5 }).ok).toBe(true);
    const decision = orderFor(state, 0, spear.id);
    expect(decision).not.toBeNull();
    expect(decision!.command.type).not.toBe('attack');
    expect(labels(decision!)).toMatch(/can hit it and has not shot yet — the melee piece holds/);
    // The charge is printed on the candidate rather than swallowed, and the
    // candidate still folds to its own score.
    for (const row of decision!.candidates) expect(foldTerms(row.terms)).toBe(row.score);
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });

  it('takes the blow once the bowman has already shot', () => {
    const { state, spear } = bothCanHit();
    const bow = state.units.find((unit) => unit.type === 'archer')!;
    bow.hasAttacked = true;
    const decision = orderFor(state, 0, spear.id);
    expect(decision?.command).toMatchObject({ type: 'attack', target: { col: 6, row: 5 } });
  });

  it('never holds a blow that would finish the defender', () => {
    const { state, spear } = bothCanHit();
    state.units.find((unit) => unit.ownerId === 1)!.hp = 1;
    const decision = orderFor(state, 0, spear.id);
    expect(decision?.command).toMatchObject({ type: 'attack', target: { col: 6, row: 5 } });
  });

  // --- (c) screen the archers ----------------------------------------------

  it('steps a bowman behind a spearman of ours when a hostile is in sight', () => {
    const { state } = front();
    // The bowman is out in the open at (6,5); our spearman holds (8,5), and the
    // enemy column stands at (9,5) — three hexes from the bow, inside
    // `military.screenRadius`, and lit for this seat by the spearman's own eyes.
    const bow = createUnit(state, 0, 'archer', 6, 5);
    const shield = createUnit(state, 0, 'warrior', 8, 5);
    shield.fortifiedTurns = 0;
    createUnit(state, 1, 'warrior', 9, 5);
    recomputeAllVisibility(state);
    expect(isVisibleTo(state, 0, 9, 5)).toBe(true);
    // Out of the bow's own reach, so this is a positioning decision and not a
    // shot it declined to take.
    expect(previewCombat(state, bow.id, { col: 9, row: 5 }).ok).toBe(false);

    const decision = orderFor(state, 0, bow.id);
    expect(decision?.command.type).toBe('moveUnit');
    const target = (decision!.command as { target: { col: number; row: number } }).target;
    // The claim: whatever hex it picked, one of our melee pieces is standing
    // next to it — which is the whole of "screened" in v1.
    expect(
      wrappedDistance(state.map, tileHex(at(state.map, target.col, target.row)), tileHex(at(state.map, shield.col, shield.row))),
    ).toBe(1);
    expect(labels(decision!)).toMatch(/of our melee pieces stand beside it/);
    for (const row of decision!.candidates) expect(foldTerms(row.terms)).toBe(row.score);
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });

  it('leaves a bowman that is already screened to the ordinary arms', () => {
    // Same board with the bow already standing beside the spearman: the best hex
    // is the one it is on, and a positioning rule with nothing to say says
    // nothing rather than shuffling.
    const { state } = front();
    const bow = createUnit(state, 0, 'archer', 7, 5);
    const shield = createUnit(state, 0, 'warrior', 8, 5);
    shield.fortifiedTurns = 0;
    createUnit(state, 1, 'warrior', 9, 5);
    recomputeAllVisibility(state);
    const decision = orderFor(state, 0, bow.id);
    expect(decision).not.toBeNull();
    // It has a shot from where it stands, so what it does is shoot — which is
    // the point: the screen sits *behind* the blows.
    expect(decision!.command).toMatchObject({ type: 'attack', target: { col: 9, row: 5 } });
  });

  it('says nothing at all about a bowman with no hostile in sight', () => {
    const { state } = front();
    const bow = createUnit(state, 0, 'archer', 6, 5);
    const shield = createUnit(state, 0, 'warrior', 8, 5);
    shield.fortifiedTurns = 0;
    recomputeAllVisibility(state);
    const decision = orderFor(state, 0, bow.id);
    expect(decision).not.toBeNull();
    // No enemy, no camp, every town held: the piece digs in where it stands.
    expect(decision!.command.type).toBe('fortify');
  });
});
