/**
 * War & diplomacy, phase two: **deals** (`docs/war-diplomacy.md`, section 7).
 *
 * `test/sim/war.test.ts` owns the war itself; this owns the bargains — the four
 * verbs, the five terms, and the three registers a term reaches into.
 *
 * What a deal can be quietly wrong about
 * --------------------------------------
 * Every term executes through a seam that already existed, which is the whole
 * design, and so every term has two halves that can drift: the *register* says
 * a thing is true, and some evaluator far away has to read it. So each term is
 * asserted at both ends —
 *
 *   · a **lump** at the two treasuries;
 *   · a **tribute** in both empires' `explainEmpireGold` folds;
 *   · a **lent seam** at `openedResource`'s three empire-scale readers *and* at
 *     the happiness meter, on both sides, because the point of lending is that
 *     the contentment moves;
 *   · a **right of way** at `canTransit`, which is what an army actually asks;
 *   · a **ceded town** at the flag, the puppet mark and both seats' eyes.
 *
 * And each is asserted both ways round — before and after — because a register
 * that never says yes passes half of these on its own.
 */

import { describe, expect, it } from 'vitest';

import { type Command, applyCommand } from '../../src/sim/commands';
import {
  cityResources,
  controlledHoldings,
  foundCityAt,
  hasResource,
  resourceCopies,
} from '../../src/sim/cities';
import { proposeDealError, openBordersError } from '../../src/sim/diplomacy';
import { explainEmpireGold } from '../../src/sim/empireGold';
import { createGame, dispatch, snapshotState } from '../../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { explainHappiness } from '../../src/sim/meters';
import { withExtraResources } from '../../src/sim/resourceData';
import { canTransit, moveProfile } from '../../src/sim/pathfind';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  createUnit,
  newGame,
  playerById,
  bumpRevision,
} from '../../src/sim/state';
import { dealsBetween, lentCopiesAwayBy, lentCopiesToPlayer } from '../../src/sim/deals';
import { explainTileYield, yieldContextFor } from '../../src/sim/yields/hex';
import { runEndOfTurn } from '../../src/sim/turn';
import { openWar, setPeaceOffer, truceTurnsLeft, warBetween } from '../../src/sim/wars';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';

const WAR = RULES.war;

/** A blank state on flat grassland, at peace and with two seats at the table. */
function bench(seats = 2): GameState {
  const colors = ['#a00', '#00a', '#0a0'];
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: Array.from({ length: seats }, (_unused, index) => ({
      name: ['Ada', 'Bors', 'Cyra'][index]!,
      color: colors[index]!,
      isHuman: true,
    })),
  });
  state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 10).fill(null);
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

/** Hands every hex in a rectangle to this city, so a border is a real border. */
function claimBlock(state: GameState, city: City, cols: number[], rows: number[]): void {
  for (const col of cols) {
    for (const row of rows) {
      state.tileOwner[tileIndex(state.map, col, row)] = city.id;
    }
  }
}

/**
 * Gives a seat a worked luxury seam: the resource on a tile it owns, and the
 * plantation that opens it. Written straight onto the tile, `warHelpers`'
 * bargain — how a seam comes to be improved is `improvements.test.ts`' subject.
 */
function giveLuxury(
  state: GameState,
  city: City,
  col: number,
  row: number,
  id: 'silk' | 'wine' | 'spices',
): Tile {
  const tile = at(state.map, col, row);
  tile.resource = id;
  tile.improvement = 'plantation';
  state.tileOwner[tileIndex(state.map, col, row)] = city.id;
  return tile;
}

/** Both empires learn to write — the mutual gate on a right of way. */
function teachWriting(state: GameState, ...seats: number[]): void {
  for (const seat of seats) {
    const player = playerById(state, seat);
    if (player && !player.techsResearched.includes('letters')) {
      player.techsResearched.push('letters');
      bumpRevision(state);
    }
  }
}

function propose(
  playerId: number,
  targetId: number,
  give: Record<string, unknown>,
  take: Record<string, unknown>,
): Command {
  return { type: 'proposeDeal', playerId, targetId, give, take } as unknown as Command;
}

/** The id of the one standing paper. Fails loudly rather than returning zero. */
function onlyProposal(state: GameState): number {
  expect(state.dealProposals).toHaveLength(1);
  return state.dealProposals[0]!.id;
}

// --- 1. the registers -------------------------------------------------------

describe('the deal registers', () => {
  it('leaves a world nobody has bargained in with two empty arrays', () => {
    const state = bench();
    expect(state.deals).toEqual([]);
    expect(state.dealProposals).toEqual([]);
    const round = JSON.parse(JSON.stringify(state)) as GameState;
    expect(round.deals).toEqual([]);
    expect(round.dealProposals).toEqual([]);
  });

  it('keeps a signed bargain and a standing paper in different arrays', () => {
    const state = bench();
    playerById(state, 0)!.gold = 100;
    bumpRevision(state);
    teachWriting(state, 0, 1);
    expect(applyCommand(state, propose(0, 1, { gold: 40 }, { openBorders: true })).ok).toBe(true);
    // A proposal is not a deal, and nothing reads it as one: the right of way
    // it asks for is not open until somebody signs.
    expect(state.deals).toEqual([]);
    expect(state.dealProposals).toHaveLength(1);

    const id = onlyProposal(state);
    expect(applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: id }).ok).toBe(true);
    expect(state.dealProposals).toEqual([]);
    expect(state.deals).toHaveLength(1);
    expect(state.deals[0]!.a).toBe(0);
    expect(state.deals[0]!.b).toBe(1);
    expect(state.deals[0]!.untilTurn).toBe(state.turn + WAR.dealTurns);
  });

  it('writes the pair low id first, whichever seat proposed', () => {
    const state = bench();
    playerById(state, 1)!.gold = 30;
    bumpRevision(state);
    expect(applyCommand(state, propose(1, 0, { goldPerTurn: 3 }, {})).ok).toBe(true);
    const id = onlyProposal(state);
    applyCommand(state, { type: 'acceptDeal', playerId: 0, dealId: id });
    const deal = state.deals[0]!;
    expect(deal.a).toBe(0);
    expect(deal.b).toBe(1);
    // And the terms follow the key, not the proposer: seat 1 is the one paying.
    expect(deal.terms.a.goldPerTurn).toBeUndefined();
    expect(deal.terms.b.goldPerTurn).toBe(3);
  });
});

// --- 2. the four verbs ------------------------------------------------------

describe('proposing, accepting, declining, withdrawing', () => {
  it('leaves the state byte-identical on every refusal', () => {
    const state = bench();
    const before = snapshotState(state);
    const refusals: Command[] = [
      // Nothing on the table.
      propose(0, 1, {}, {}),
      // Coin nobody has.
      propose(0, 1, { gold: 5 }, {}),
      // A seam nobody holds.
      propose(0, 1, { luxuries: ['silk'] }, {}),
      // A town, in an ordinary bargain.
      propose(0, 1, { cities: [1] }, {}),
      // Yourself, and the wild's own refusal one seat over.
      propose(0, 0, { goldPerTurn: 1 }, {}),
      // A right of way neither empire can write.
      propose(0, 1, { openBorders: true }, {}),
      // A term whose list is not a list — a shape a save or a socket can send,
      // and a refusal rather than a throw.
      propose(0, 1, { luxuries: 3 }, {}),
      propose(0, 1, {}, { cities: 'Uruk' }),
      // Papers that are not there.
      { type: 'acceptDeal', playerId: 1, dealId: 99 },
      { type: 'declineDeal', playerId: 1, dealId: 99 },
      { type: 'withdrawDeal', playerId: 0, dealId: 99 },
    ];
    for (const command of refusals) {
      const result = applyCommand(state, command);
      expect(result.ok).toBe(false);
      expect(snapshotState(state)).toBe(before);
    }
  });

  it('refuses a second paper to the same empire, naming the one that stands', () => {
    const state = bench();
    playerById(state, 0)!.gold = 100;
    bumpRevision(state);
    expect(applyCommand(state, propose(0, 1, { gold: 10 }, {})).ok).toBe(true);
    const second = applyCommand(state, propose(0, 1, { gold: 20 }, {}));
    expect(second.ok).toBe(false);
    expect(second.ok === false && second.error).toContain('already have an offer standing');
  });

  it('refuses an answer from anybody but the empire that was asked', () => {
    const state = bench(3);
    playerById(state, 0)!.gold = 50;
    bumpRevision(state);
    applyCommand(state, propose(0, 1, { gold: 10 }, {}));
    const id = onlyProposal(state);
    expect(applyCommand(state, { type: 'acceptDeal', playerId: 2, dealId: id }).ok).toBe(false);
    // And the proposer cannot sign their own paper.
    expect(applyCommand(state, { type: 'acceptDeal', playerId: 0, dealId: id }).ok).toBe(false);
    // But they may take it back, and nobody else may.
    expect(applyCommand(state, { type: 'withdrawDeal', playerId: 1, dealId: id }).ok).toBe(false);
    expect(applyCommand(state, { type: 'withdrawDeal', playerId: 0, dealId: id }).ok).toBe(true);
    expect(state.dealProposals).toEqual([]);
  });

  it('takes the paper off the table on a decline, and moves nothing', () => {
    const state = bench();
    playerById(state, 0)!.gold = 50;
    bumpRevision(state);
    applyCommand(state, propose(0, 1, { gold: 10 }, {}));
    const id = onlyProposal(state);
    expect(applyCommand(state, { type: 'declineDeal', playerId: 1, dealId: id }).ok).toBe(true);
    expect(state.dealProposals).toEqual([]);
    expect(state.deals).toEqual([]);
    expect(playerById(state, 0)!.gold).toBe(50);
  });

  it('re-asks both halves at acceptance, and refuses coin that has been spent', () => {
    const state = bench();
    playerById(state, 0)!.gold = 50;
    bumpRevision(state);
    applyCommand(state, propose(0, 1, { gold: 40 }, {}));
    const id = onlyProposal(state);
    // The treasury moves under the paper.
    playerById(state, 0)!.gold = 5;
    bumpRevision(state);
    const before = snapshotState(state);
    const result = applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: id });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain('not have that much coin');
    // Refused means byte-identical, paper and all.
    expect(snapshotState(state)).toBe(before);
  });

  it('refuses a bargain with an empire it is at war with, in plain words', () => {
    const state = bench();
    playerById(state, 0)!.gold = 50;
    bumpRevision(state);
    openWar(state, 0, 1);
    const refusal = proposeDealError(state, 0, 1, { gold: 10 }, {});
    expect(refusal).toContain('terms belong in a peace');
    expect(applyCommand(state, propose(0, 1, { gold: 10 }, {})).ok).toBe(false);
  });

  it('refuses towns in an ordinary bargain and offers them in a peace', () => {
    const state = bench();
    const town = foundCityAt(state, 0, at(state.map, 3, 4));
    foundCityAt(state, 0, at(state.map, 6, 7));
    expect(proposeDealError(state, 0, 1, { cities: [town.id] }, {})).toContain(
      'Towns change hands only in a peace',
    );
  });
});

// --- 3. what a lump does ----------------------------------------------------

describe('a lump of gold', () => {
  it('moves once, through the two treasuries, and leaves no row behind', () => {
    const state = bench();
    playerById(state, 0)!.gold = 100;
    bumpRevision(state);
    playerById(state, 1)!.gold = 7;
    bumpRevision(state);
    applyCommand(state, propose(0, 1, { gold: 40 }, {}));
    const id = onlyProposal(state);
    const result = applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: id });
    expect(result.ok).toBe(true);
    expect(playerById(state, 0)!.gold).toBe(60);
    expect(playerById(state, 1)!.gold).toBe(47);
    // Nothing is left standing, so there is nothing to expire.
    expect(state.deals).toEqual([]);
    expect(result.ok && result.dealSigned?.payments).toEqual([{ fromId: 0, toId: 1, gold: 40 }]);
  });

  it('moves both ways when both sides pay', () => {
    const state = bench();
    playerById(state, 0)!.gold = 100;
    bumpRevision(state);
    playerById(state, 1)!.gold = 100;
    bumpRevision(state);
    applyCommand(state, propose(0, 1, { gold: 10 }, { gold: 30 }));
    const id = onlyProposal(state);
    applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: id });
    expect(playerById(state, 0)!.gold).toBe(120);
    expect(playerById(state, 1)!.gold).toBe(80);
  });
});

// --- 4. what a tribute does -------------------------------------------------

describe('a tribute', () => {
  it('is one line in each empire’s ledger, and they are opposite', () => {
    const state = bench();
    applyCommand(state, propose(0, 1, { goldPerTurn: 4 }, {}));
    const id = onlyProposal(state);
    applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: id });

    // **Both directions are bills** since batch H19 (`TradeGoldKind`): a
    // tribute is a figure two empires agreed on, so the empire stage reaches
    // neither side — a stage on the receiving one would hand that treasury
    // more coin than the payer was charged.
    const payer = explainEmpireGold(state, 0).filter((line) => line.source.startsWith('Tribute'));
    expect(payer).toEqual([{ source: 'Tribute to the Bors', gold: -4, kind: 'bill' }]);
    const paid = explainEmpireGold(state, 1).filter((line) => line.source.startsWith('Tribute'));
    expect(paid).toEqual([{ source: 'Tribute from the Ada', gold: 4, kind: 'bill' }]);
  });

  it('stops the moment the bargain does', () => {
    const state = bench();
    applyCommand(state, propose(0, 1, { goldPerTurn: 4 }, {}));
    applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: onlyProposal(state) });
    state.turn += WAR.dealTurns;
    // Spent, and inert before the broom has been anywhere near it.
    expect(explainEmpireGold(state, 0).some((line) => line.source.startsWith('Tribute'))).toBe(
      false,
    );
  });
});

// --- 5. a lent seam ---------------------------------------------------------

describe('a lent luxury', () => {
  /** One seat with silk, the other with nothing, both at peace. */
  function silkBench(): { state: GameState; mine: City; theirs: City } {
    const state = bench();
    const mine = foundCityAt(state, 0, at(state.map, 3, 4));
    const theirs = foundCityAt(state, 1, at(state.map, 11, 4));
    claimBlock(state, mine, [2, 3, 4], [3, 4, 5]);
    claimBlock(state, theirs, [10, 11, 12], [3, 4, 5]);
    giveLuxury(state, mine, 2, 3, 'silk');
    return { state, mine, theirs };
  }

  function lend(state: GameState): void {
    applyCommand(state, propose(0, 1, { luxuries: ['silk'] }, {}));
    const id = onlyProposal(state);
    expect(applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: id }).ok).toBe(true);
  }

  it('leaves the giver’s hands and arrives in the receiver’s', () => {
    const { state } = silkBench();
    expect(hasResource(state, 0, 'silk')).toBe(true);
    expect(hasResource(state, 1, 'silk')).toBe(false);

    lend(state);

    expect(lentCopiesAwayBy(state, 0)).toEqual({ silk: 1 });
    expect(lentCopiesToPlayer(state, 1)).toEqual({ silk: 1 });
    expect(hasResource(state, 0, 'silk')).toBe(false);
    expect(hasResource(state, 1, 'silk')).toBe(true);
    // And the ledger says *why* it is in the receiver's hands.
    expect(controlledHoldings(state, 1, 'luxury').map((h) => h.via)).toEqual(['lent']);
    expect(controlledHoldings(state, 0, 'luxury')).toEqual([]);
  });

  it('moves the contentment with it, and names the reason on the line', () => {
    const { state } = silkBench();
    const before = explainHappiness(state, 0).filter((line) => line.source.startsWith('Silk'));
    expect(before).toHaveLength(1);
    expect(before[0]!.source).toBe('Silk · plantation');
    expect(explainHappiness(state, 1).some((line) => line.source.startsWith('Silk'))).toBe(false);

    lend(state);

    expect(explainHappiness(state, 0).some((line) => line.source.startsWith('Silk'))).toBe(false);
    const after = explainHappiness(state, 1).filter((line) => line.source.startsWith('Silk'));
    expect(after).toHaveLength(1);
    expect(after[0]!.source).toBe('Silk · lent');
    expect(after[0]!.value).toBe(before[0]!.value);
  });

  /**
   * **A row lends one copy, not the kind** (the user, 2026-09-08 — flags (tt):
   * *"i have two copies of amber. I traded one amber to the bot for marble. I
   * should be getting the +4 happiness from having a unique amber and a unique
   * marble"*). Every claim of that ruling is asserted here, because each one was
   * wrong before it: the count, the ground, the contentment and the gate.
   */
  it('lends one copy, so a spare seam keeps the kind at home', () => {
    const { state, mine } = silkBench();
    giveLuxury(state, mine, 4, 5, 'silk');
    expect(resourceCopies(state, 0, 'silk')).toBe(2);

    lend(state);

    // One copy went, one stayed — and the receiver holds exactly one, so two
    // empires can never hold three copies where there were two.
    expect(resourceCopies(state, 0, 'silk')).toBe(1);
    expect(resourceCopies(state, 1, 'silk')).toBe(1);
    expect(hasResource(state, 0, 'silk')).toBe(true);
    expect(hasResource(state, 1, 'silk')).toBe(true);
    // The kind is still in the giver's ledger, and by its own seam rather than
    // by anybody's caravan.
    expect(controlledHoldings(state, 0, 'luxury').map((h) => h.via)).toEqual(['improvement']);
  });

  it('never stops the ground paying — only the signature crosses the table', () => {
    const { state } = silkBench();
    const tile = at(state.map, 2, 3);
    const silkLine = (): number => {
      const ctx = yieldContextFor(state, 0);
      return explainTileYield(tile, ctx)
        .filter((line) => line.source === 'Silk')
        .reduce((sum, line) => sum + line.culture, 0);
    };
    const before = silkLine();
    expect(before).toBeGreaterThan(0);

    lend(state);

    // The plantation was not dug up. A lent seam is a caravan leaving, and the
    // hex goes on paying its owner exactly what its row prints — which is what
    // the clause that used to sit in `openedResource` got wrong.
    expect(silkLine()).toBe(before);
  });

  it('keeps the contentment for a spare copy, and adds the one it took', () => {
    const { state, mine, theirs } = silkBench();
    giveLuxury(state, mine, 4, 5, 'silk');
    // The other seat brings something the first has never had, and brings its
    // own spare of it — the user's swap exactly: a duplicate out, a new kind in,
    // on both sides of the table.
    giveLuxury(state, theirs, 10, 3, 'wine');
    giveLuxury(state, theirs, 12, 5, 'wine');
    const uniques = (seat: number): string[] =>
      controlledHoldings(state, seat, 'luxury').map((holding) => holding.id);
    expect(uniques(0)).toEqual(['silk']);

    applyCommand(state, propose(0, 1, { luxuries: ['silk'] }, { luxuries: ['wine'] }));
    expect(
      applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: onlyProposal(state) }).ok,
    ).toBe(true);

    // **Two unique luxuries where there was one.** The silk line does not fall —
    // a spare was promised, not the seam — and the wine line arrives beside it.
    const lines = explainHappiness(state, 0).map((line) => line.source);
    expect(lines).toContain('Silk · plantation');
    expect(lines).toContain('Wine · lent');
    expect(uniques(0)).toEqual(['silk', 'wine']);
    // And the other seat reads the mirror of it.
    expect(uniques(1)).toEqual(['silk', 'wine']);
  });

  it('lets an empire lend its only copy — the signature simply moves', () => {
    const { state, mine } = silkBench();
    expect(resourceCopies(state, 0, 'silk')).toBe(1);
    // The town's own list, which is the walk the city-local signatures read
    // (`cityResources`, `resourceEffects.ts`).
    expect(cityResources(state, mine, 'luxury')).toEqual(['silk']);

    lend(state);

    expect(hasResource(state, 0, 'silk')).toBe(false);
    expect(hasResource(state, 1, 'silk')).toBe(true);
    // Both halves go together: an empire that lent its only silk keeps neither
    // the contentment nor the line the town that digs it would pay.
    expect(explainHappiness(state, 0).some((line) => line.source.startsWith('Silk'))).toBe(false);
    expect(cityResources(state, mine, 'luxury')).toEqual([]);
  });

  it('lends a second copy under a second bargain, and refuses a third', () => {
    const state = bench(3);
    const mine = foundCityAt(state, 0, at(state.map, 3, 4));
    foundCityAt(state, 1, at(state.map, 11, 4));
    foundCityAt(state, 2, at(state.map, 7, 8));
    claimBlock(state, mine, [2, 3, 4], [3, 4, 5]);
    giveLuxury(state, mine, 2, 3, 'silk');
    giveLuxury(state, mine, 4, 5, 'silk');
    expect(resourceCopies(state, 0, 'silk')).toBe(2);

    // **A row names a kind once**, so a second copy is a second bargain.
    applyCommand(state, propose(0, 1, { luxuries: ['silk'] }, {}));
    applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: onlyProposal(state) });
    expect(resourceCopies(state, 0, 'silk')).toBe(1);
    applyCommand(state, propose(0, 2, { luxuries: ['silk'] }, {}));
    applyCommand(state, { type: 'acceptDeal', playerId: 2, dealId: onlyProposal(state) });

    expect(lentCopiesAwayBy(state, 0)).toEqual({ silk: 2 });
    expect(resourceCopies(state, 0, 'silk')).toBe(0);
    expect(resourceCopies(state, 1, 'silk')).toBe(1);
    expect(resourceCopies(state, 2, 'silk')).toBe(1);
    // Two seams, two promises, and nothing left to promise a third time.
    expect(proposeDealError(state, 0, 1, { luxuries: ['silk'] }, {})).toContain('no silk to lend');
  });

  it('refuses to lend the same seam twice, because it is no longer held', () => {
    const state = bench(3);
    const mine = foundCityAt(state, 0, at(state.map, 3, 4));
    foundCityAt(state, 1, at(state.map, 11, 4));
    foundCityAt(state, 2, at(state.map, 7, 8));
    claimBlock(state, mine, [2, 3, 4], [3, 4, 5]);
    giveLuxury(state, mine, 2, 3, 'silk');
    applyCommand(state, propose(0, 1, { luxuries: ['silk'] }, {}));
    applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: onlyProposal(state) });
    expect(proposeDealError(state, 0, 2, { luxuries: ['silk'] }, {})).toContain('no silk to lend');
  });

  /**
   * The reveal gate on the receiving side, proved against a luxury invented at
   * runtime.
   *
   * No luxury in the shipped table carries a `requiresTech` — the three gated
   * rows are all strategic, and the strategic table is not tradeable — so the
   * honest way to hold the claim is `withExtraResources`, which is what it is
   * for. The seam is opened by a **work**, because an invented resource is in
   * no improvement's `improvesResource` list and a work opens whatever it
   * stands on.
   */
  it('still binds the receiver’s reveal gate', () => {
    withExtraResources(
      {
        cinnabar: {
          name: 'Cinnabar',
          kind: 'luxury',
          yields: { food: 0, production: 0, gold: 1 },
          validTerrain: ['grassland'],
          frequency: 1,
          clusterSize: [1, 1],
          requiresTech: 'mining',
          effects: [],
          emoji: '🔴',
        } as unknown as Parameters<typeof withExtraResources>[0][string],
      },
      () => {
        const state = bench();
        const mine = foundCityAt(state, 0, at(state.map, 3, 4));
        foundCityAt(state, 1, at(state.map, 11, 4));
        claimBlock(state, mine, [2, 3, 4], [3, 4, 5]);
        const tile = at(state.map, 2, 3);
        tile.resource = 'cinnabar' as never;
        tile.improvement = 'academy';
        state.tileOwner[tileIndex(state.map, 2, 3)] = mine.id;
        const gate = playerById(state, 0)!.techsResearched;
        if (!gate.includes('mining')) gate.push('mining');
        expect(hasResource(state, 0, 'cinnabar' as never)).toBe(true);

        applyCommand(state, propose(0, 1, { luxuries: ['cinnabar'] }, {}));
        applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: onlyProposal(state) });
        // The giver has lent it away regardless — the promise is the promise —
        // but a people with no word for the stuff draws nothing from it.
        expect(hasResource(state, 0, 'cinnabar' as never)).toBe(false);
        expect(hasResource(state, 1, 'cinnabar' as never)).toBe(false);
        playerById(state, 1)!.techsResearched.push('mining');
        bumpRevision(state);
        expect(hasResource(state, 1, 'cinnabar' as never)).toBe(true);
      },
    );
  });

  it('comes home when the bargain lapses', () => {
    const { state } = silkBench();
    lend(state);
    state.turn = state.deals[0]!.untilTurn - 1;
    runEndOfTurn(state);
    // The broom ran on the turn it was still live, so it is still lent.
    expect(hasResource(state, 1, 'silk')).toBe(true);
    state.turn = state.deals[0]!.untilTurn;
    const report = runEndOfTurn(state);
    expect(report.dealsEnded.map((row) => row.reason)).toEqual(['expired']);
    expect(state.deals).toEqual([]);
    expect(hasResource(state, 0, 'silk')).toBe(true);
    expect(hasResource(state, 1, 'silk')).toBe(false);
  });
});

// --- 6. a right of way ------------------------------------------------------

describe('open borders', () => {
  /** Two empires with a shared border and a soldier standing at it. */
  function borderBench(): { state: GameState; soldier: number; theirGround: Tile } {
    const state = bench();
    const mine = foundCityAt(state, 0, at(state.map, 3, 4));
    const theirs = foundCityAt(state, 1, at(state.map, 9, 4));
    claimBlock(state, mine, [2, 3, 4], [3, 4, 5]);
    claimBlock(state, theirs, [6, 7, 8, 9], [3, 4, 5]);
    const soldier = createUnit(state, 0, 'warrior', 5, 4);
    return { state, soldier: soldier.id, theirGround: at(state.map, 6, 4) };
  }

  it('is refused until both empires have learned to write, and names the tech', () => {
    const { state } = borderBench();
    expect(openBordersError(state, 0, 1)).toContain('Writing');
    teachWriting(state, 0);
    // One side is not enough: a treaty needs scribes at both ends.
    expect(openBordersError(state, 0, 1)).toContain('Bors');
    teachWriting(state, 1);
    expect(openBordersError(state, 0, 1)).toBeNull();
  });

  it('opens a border an army could not cross, and closes it again on expiry', () => {
    const { state, soldier, theirGround } = borderBench();
    teachWriting(state, 0, 1);
    const unit = state.units.find((row) => row.id === soldier)!;
    expect(canTransit(state, unit, theirGround, moveProfile(state, unit))).toBe(false);

    // They open theirs; we open nothing. A right of way runs one way unless
    // both sides write one.
    applyCommand(state, propose(1, 0, { openBorders: true }, {}));
    applyCommand(state, { type: 'acceptDeal', playerId: 0, dealId: onlyProposal(state) });
    expect(canTransit(state, unit, theirGround, moveProfile(state, unit))).toBe(true);

    state.turn = state.deals[0]!.untilTurn;
    expect(canTransit(state, unit, theirGround, moveProfile(state, unit))).toBe(false);
  });

  it('does not open the other direction on its own', () => {
    const { state } = borderBench();
    teachWriting(state, 0, 1);
    applyCommand(state, propose(1, 0, { openBorders: true }, {}));
    applyCommand(state, { type: 'acceptDeal', playerId: 0, dealId: onlyProposal(state) });
    const theirs = createUnit(state, 1, 'warrior', 5, 4);
    expect(canTransit(state, theirs, at(state.map, 3, 3), moveProfile(state, theirs))).toBe(false);
  });
});

// --- 7. a ceded town --------------------------------------------------------

describe('a town ceded in a peace', () => {
  /** A war, and a town of seat 1's the peace paper can name. */
  function warBench(): { state: GameState; town: City } {
    const state = bench();
    const mine = foundCityAt(state, 0, at(state.map, 3, 4));
    foundCityAt(state, 1, at(state.map, 12, 4));
    const town = foundCityAt(state, 1, at(state.map, 9, 4));
    claimBlock(state, mine, [2, 3, 4], [3, 4, 5]);
    claimBlock(state, town, [8, 9, 10], [3, 4, 5]);
    openWar(state, 0, 1);
    return { state, town };
  }

  it('changes hands, arrives a puppet, and brings its ground with it', () => {
    const { state, town } = warBench();
    const ground = tileIndex(state.map, 8, 3);
    expect(state.tileOwner[ground]).toBe(town.id);

    applyCommand(state, {
      type: 'proposePeace',
      playerId: 1,
      targetId: 0,
      give: { cities: [town.id] },
      take: {},
    } as unknown as Command);
    const signed = applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });

    expect(town.ownerId).toBe(0);
    // The default a conquest sets, set for the same reason: annexing is the
    // decision, and holding is what a town that changed hands does first.
    expect(town.puppet).toBe(true);
    expect(town.captured).toBe(true);
    // The territory follows the flag with no write at all — `tileOwner` holds
    // *city* ids.
    expect(state.tileOwner[ground]).toBe(town.id);
    expect(signed.ok && signed.peaces?.[0]!.execution?.cededCities).toEqual([
      { cityId: town.id, name: town.name, fromId: 1, toId: 0 },
    ]);
    // And the peace still bought its truce.
    expect(warBetween(state, 0, 1)).toBeUndefined();
    expect(truceTurnsLeft(state, 0, 1)).toBe(WAR.truceTurns);
  });

  it('moves both empires’ eyes', () => {
    const { state, town } = warBench();
    const ground = tileIndex(state.map, 9, 4);
    expect(state.visibility[0]![ground]).toBe(HIDDEN);

    applyCommand(state, {
      type: 'proposePeace',
      playerId: 1,
      targetId: 0,
      give: { cities: [town.id] },
      take: {},
    } as unknown as Command);
    applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });
    runEndOfTurn(state);

    expect(state.visibility[0]![ground]).toBe(VISIBLE);
    // The old owner keeps the *memory* and loses the sight, which is what fog
    // does everywhere: a town it no longer holds is a place it has been.
    expect(state.visibility[1]![ground]).toBe(EXPLORED);
  });

  it('never lets an empire sign away its own seat of government', () => {
    const { state } = warBench();
    const capital = state.cities.find((city) => city.ownerId === 1 && city.col === 12)!;
    const refusal = applyCommand(state, {
      type: 'proposePeace',
      playerId: 1,
      targetId: 0,
      give: { cities: [capital.id] },
      take: {},
    } as unknown as Command);
    expect(refusal.ok).toBe(false);
    expect(refusal.ok === false && refusal.error).toContain('seat of government');
  });
});

// --- 8. peace with terms ----------------------------------------------------

describe('peace with terms', () => {
  it('executes the paper, closes the war and starts the bargain’s own clock', () => {
    const state = bench();
    playerById(state, 1)!.gold = 200;
    bumpRevision(state);
    teachWriting(state, 0, 1);
    openWar(state, 0, 1);

    applyCommand(state, {
      type: 'proposePeace',
      playerId: 0,
      targetId: 1,
      give: { openBorders: true },
      take: { gold: 80, goldPerTurn: 3 },
    } as unknown as Command);
    // The other seat signs the paper that is on the table — a bare offer, and
    // the signature that closes the war inside its own command (§12).
    const signed = applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 });

    expect(playerById(state, 0)!.gold).toBeGreaterThanOrEqual(80);
    expect(playerById(state, 1)!.gold).toBeLessThanOrEqual(120);
    expect(warBetween(state, 0, 1)).toBeUndefined();
    expect(truceTurnsLeft(state, 0, 1)).toBe(WAR.truceTurns);
    // The ongoing halves opened one row, twenty turns from the peace.
    expect(dealsBetween(state, 0, 1)).toHaveLength(1);
    expect(signed.ok && signed.peaces?.[0]!.execution?.dealId).toBe(state.deals[0]!.id);
  });

  it('leaves a white peace exactly as it was', () => {
    const state = bench();
    openWar(state, 0, 1);
    applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });
    const signed = applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 });
    expect(signed.ok && signed.peaces).toHaveLength(1);
    expect(signed.ok && signed.peaces?.[0]!.execution).toBeUndefined();
    expect(state.deals).toEqual([]);
    expect(runEndOfTurn(state).peaces).toEqual([]);
  });

  it('voids the signature on the old paper when somebody writes a new one', () => {
    const state = bench();
    playerById(state, 1)!.gold = 100;
    bumpRevision(state);
    openWar(state, 0, 1);
    applyCommand(state, {
      type: 'proposePeace',
      playerId: 0,
      targetId: 1,
      give: {},
      take: { gold: 50 },
    } as unknown as Command);
    // The other seat answers with a paper of its own rather than signing —
    // which is what a counter-offer is, and it voids the signature that was on
    // the table. (Signing instead would end the war in that command, §12, so a
    // counter is the only way anything is left to void.)
    expect(warBetween(state, 0, 1)!.offers).toEqual([0]);
    applyCommand(state, {
      type: 'proposePeace',
      playerId: 1,
      targetId: 0,
      give: { gold: 10 },
      take: {},
    } as unknown as Command);
    expect(warBetween(state, 0, 1)!.offers).toEqual([1]);
    expect(warBetween(state, 0, 1)!.terms?.by).toBe(1);
    runEndOfTurn(state);
    expect(warBetween(state, 0, 1)).toBeDefined();
  });

  it('lets a withdrawal take every signature off the paper it wrote', () => {
    const state = bench();
    playerById(state, 1)!.gold = 100;
    bumpRevision(state);
    openWar(state, 0, 1);
    // Two flags on one paper, written through the register's own writer: since
    // §12 a second *command* would close the war on the spot, so the state this
    // clause is about is reached the way an older save reaches it.
    setPeaceOffer(state, 0, 1, true, { give: {}, take: { gold: 50 } });
    setPeaceOffer(state, 1, 0, true);
    expect(warBetween(state, 0, 1)!.offers).toEqual([0, 1]);
    applyCommand(state, { type: 'withdrawPeace', playerId: 0, targetId: 1 });
    // Seat 1 signed a bargain, not a white peace, so nothing stands.
    expect(warBetween(state, 0, 1)!.offers).toBeUndefined();
    expect(warBetween(state, 0, 1)!.terms).toBeUndefined();
  });
});

// --- 9. the brooms ----------------------------------------------------------

describe('what ends a bargain', () => {
  it('is cancelled outright by a declaration, with the papers', () => {
    const state = bench();
    playerById(state, 0)!.gold = 100;
    bumpRevision(state);
    applyCommand(state, propose(0, 1, { goldPerTurn: 5 }, {}));
    applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: onlyProposal(state) });
    applyCommand(state, propose(0, 1, { gold: 10 }, {}));
    expect(state.deals).toHaveLength(1);
    expect(state.dealProposals).toHaveLength(1);

    const result = applyCommand(state, { type: 'declareWar', playerId: 0, targetId: 1 });
    expect(result.ok).toBe(true);
    expect(result.ok && result.dealsEnded?.map((row) => row.reason)).toEqual(['war']);
    expect(state.deals).toEqual([]);
    // The paper goes too: a bargain nobody may sign is not a bargain.
    expect(state.dealProposals).toEqual([]);
  });

  it('leaves a third empire’s bargain alone', () => {
    const state = bench(3);
    applyCommand(state, propose(0, 2, { goldPerTurn: 2 }, {}));
    applyCommand(state, { type: 'acceptDeal', playerId: 2, dealId: onlyProposal(state) });
    applyCommand(state, { type: 'declareWar', playerId: 0, targetId: 1 });
    expect(dealsBetween(state, 0, 2)).toHaveLength(1);
  });

  it('sweeps a spent row without changing an outcome', () => {
    const state = bench();
    applyCommand(state, propose(0, 1, { goldPerTurn: 2 }, {}));
    applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: onlyProposal(state) });
    state.turn = state.deals[0]!.untilTurn;
    // Inert before the broom: every reading compares the absolute turn.
    expect(dealsBetween(state, 0, 1)).toEqual([]);
    expect(explainEmpireGold(state, 0).some((line) => line.source.startsWith('Tribute'))).toBe(
      false,
    );
    runEndOfTurn(state);
    expect(state.deals).toEqual([]);
  });
});

// --- 10. the log ------------------------------------------------------------

describe('a bargain is made of ordinary commands', () => {
  it('proposes, signs and withdraws through the real game loop', () => {
    const config = {
      seed: 404,
      sizeName: 'duel' as const,
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    };
    const game = createGame(config);
    // The treasury is not in the log, so the bargain has to be one the opening
    // treasuries can afford: a tribute, which promises rather than pays.
    expect(
      dispatch(game, {
        type: 'proposeDeal',
        playerId: 0,
        targetId: 1,
        give: { goldPerTurn: 2 },
        take: {},
      } as unknown as Command).ok,
    ).toBe(true);
    const id = game.state.dealProposals[0]!.id;
    expect(dispatch(game, { type: 'acceptDeal', playerId: 1, dealId: id }).ok).toBe(true);
    expect(game.state.deals).toHaveLength(1);
    expect(
      dispatch(game, {
        type: 'proposeDeal',
        playerId: 1,
        targetId: 0,
        give: { goldPerTurn: 1 },
        take: {},
      } as unknown as Command).ok,
    ).toBe(true);
    const second = game.state.dealProposals[0]!.id;
    expect(dispatch(game, { type: 'withdrawDeal', playerId: 1, dealId: second }).ok).toBe(true);
    expect(game.state.dealProposals).toEqual([]);
  });
});
