/**
 * **The occasions batch** (the decks rework, D2c — `docs/plans/decks-rework.md`'s
 * queue row 3; the shapes are `docs/plans/decks-shape-audit.md`'s wave-1 rows
 * 10, 11 and 15, and wave 2's first-of-a-kind records).
 *
 * Its own file rather than a wing of `growingOrders.test.ts` or of
 * `statecraft.test.ts`, because the subject is one thing neither of those
 * covers: **a card paid for what the moment itself was**. The four shapes it
 * pins are all readings of an occasion rather than of the board —
 *
 *   · three more moments a growing card may count (`TallyOccasion`), each hooked
 *     at the seam that already knew the moment happened;
 *   · a windfall grant that is a *share of the occasion's own facts* — how
 *     strong the piece was, how many people lived in the town, what the coin
 *     came to, what the felling already paid (`OccasionMeasure`);
 *   · the world's ledger of **what was done first** (`GameState.firsts`, written
 *     only by `markFirst`), which is new state and therefore a contention;
 *   · a **once-a-turn** limiter on a rider, kept as an absolute stamp.
 *
 * The interesting failures here are failures of the *seam* — a fact the caller
 * was the only thing still holding and did not pass, a first written by the card
 * instead of by the world, a limiter that charged for the asking — rather than
 * of the ledger, which `statecraft.test.ts` already pins.
 */

import { describe, expect, it } from 'vitest';

import { dispatch, replay, snapshotState } from '../../src/sim/game';
import type { Command } from '../../src/sim/commands';
import { getTileAt, tileNeighbors } from '../../src/sim/map';
import { isWaterTerrain } from '../../src/sim/terrainData';
import {
  type GameState,
  bumpRevision,
  countFirsts,
  createUnit,
  firstKey,
  markFirst,
  playerById,
} from '../../src/sim/state';
import { realiseItem } from '../../src/sim/cities';
import { unitDef } from '../../src/sim/unitData';
import { purchaseItemAt } from '../../src/sim/purchase';
import { settleCampBounty } from '../../src/sim/camps';
import {
  type PlayerStatecraft,
  explainCardEmpireYields,
  foldCardYields,
  describeCard,
  stripRefs,
  tallyOf,
  windfallPayout,
} from '../../src/sim/statecraft';
import {
  type FirstKind,
  type OccasionMeasure,
  type OrderId,
  FIRST_KINDS,
  ORDER_IDS,
  orderDef,
} from '../../src/sim/statecraftData';
import { game, found, marchOut } from './statecraftHelpers';
import { createGame } from './newGameHelpers';

/**
 * Every `src/sim/*.ts` as text, for the seam register at the foot of this file.
 * The bench's own idiom (`religion.test.ts`' `simSource`), a glob rather than a
 * list so a seam moved into a new file is still read the day it moves.
 */
const SIM_SOURCE = {
  ...(import.meta.glob('../../src/sim/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  // **And the card system's own three**, since batch C1 asks this register a
  // question about the evaluator: `moduleCycles.test.ts` globs both depths for
  // the same reason, and a seam that moved into `statecraft/` is still a seam.
  ...(import.meta.glob('../../src/sim/statecraft/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

function simSource(file: string): string {
  const key = Object.keys(SIM_SOURCE).find((path) => path.endsWith(`/${file}`));
  expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
  return SIM_SOURCE[key!]!;
}

// --- harness ----------------------------------------------------------------

/** Puts a card in a slot, the way the draft and the slot verb would have. */
function slot(state: GameState, playerId: number, id: OrderId): PlayerStatecraft {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
  return sc;
}

/** What this empire's cards pay the realm, in one voice. */
function empirePays(
  state: GameState,
  playerId: number,
  voice: 'gold' | 'science' | 'culture' | 'faith',
): number {
  return foldCardYields(explainCardEmpireYields(state, playerId))[voice];
}

/** A world with the wild in it, and one seat. */
function wildGame(seed = 5) {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    barbarians: true,
  });
}

/** A soldier of this seat's, standing somewhere a fight can happen. */
function soldier(state: GameState, playerId: number) {
  const held = state.units.find((u) => u.ownerId === playerId && u.type === 'warrior');
  if (held) return held;
  const any = state.units.find((u) => u.ownerId === playerId)!;
  return createUnit(state, playerId, 'warrior', any.col, any.row);
}

/** A land hex beside this piece with nobody on it — somewhere to put a raider. */
function openGround(state: GameState, col: number, row: number) {
  const here = getTileAt(state.map, col, row)!;
  for (const tile of tileNeighbors(state.map, here)) {
    if (isWaterTerrain(tile.terrain) || tile.terrain === 'mountain') continue;
    if (state.units.some((u) => u.col === tile.col && u.row === tile.row)) continue;
    return tile;
  }
  return null;
}

/** Stages a kill: a raider on one hit point beside a soldier of this seat's. */
function killARaider(g: ReturnType<typeof wildGame>): boolean {
  const wild = g.state.players.find((p) => p.barbarian)!;
  const mine = soldier(g.state, 0);
  mine.movesLeft = 60;
  const target = openGround(g.state, mine.col, mine.row);
  if (!target) return false;
  const raider = createUnit(g.state, wild.id, 'warrior', target.col, target.row);
  raider.hp = 1;
  const result = dispatch(g, {
    type: 'attack',
    playerId: 0,
    unitId: mine.id,
    target: { col: target.col, row: target.row },
  } as unknown as Command);
  return result.ok && !g.state.units.some((u) => u.id === raider.id);
}

// --- the three new counters -------------------------------------------------

describe('the moments a growing card may now count', () => {
  it('unitKilled — the chronicle counts every enemy, and the ballads still count only the wild', () => {
    const g = wildGame();
    const chronicle = slot(g.state, 0, 'theWarChronicle');
    slot(g.state, 0, 'theBalladWeavers');
    // The card's own base line, before anything has been killed at all.
    expect(empirePays(g.state, 0, 'science')).toBe(3);

    expect(killARaider(g)).toBe(true);
    // **One moment, two counters.** A raider is an enemy unit and a barbarian,
    // so both books are written — which is exactly what the pair of members is
    // for, and what a single narrowed member could not have said.
    expect(tallyOf(chronicle, 'theWarChronicle')).toBe(1);
    expect(tallyOf(chronicle, 'theBalladWeavers')).toBe(1);
    expect(empirePays(g.state, 0, 'science')).toBe(3 + 3);
  });

  it('unitTrained — the muster roll counts a hammered sword and never a bought one', () => {
    const g = game();
    const sc = slot(g.state, 0, 'dominionTheMusterRolls');
    const player = playerById(g.state, 0)!;
    const city = found(g.state, 0);
    marchOut(g.state, city);
    const tile = getTileAt(g.state.map, city.col, city.row)!;

    realiseItem(g.state, city, { kind: 'unit', id: 'warrior', tile });
    expect(tallyOf(sc, 'dominionTheMusterRolls')).toBe(1);
    expect(empirePays(g.state, 0, 'science')).toBe(1);

    // **"Purchases do not count"**, the card's own sentence. The till is the
    // only thing that knows, which is why `RealiseOptions.bought` is the clause
    // and not a reading of the board a moment later.
    marchOut(g.state, city);
    player.gold = 100000;
    purchaseItemAt(g.state, player, city, { kind: 'unit', id: 'warrior' }, 'gold');
    expect(tallyOf(sc, 'dominionTheMusterRolls')).toBe(1);

    // And a gift is not a training either — a piece nobody paid for was raised
    // by nobody's drill yard.
    marchOut(g.state, city);
    realiseItem(g.state, city, { kind: 'unit', id: 'warrior', tile }, { free: true });
    expect(tallyOf(sc, 'dominionTheMusterRolls')).toBe(1);
  });

  it('campCleared — a seated commission counts a burnt camp', () => {
    // Through `settleCampBounty`, the one routine that pays for a camp burnt
    // out, which is the seam the counter rides, as the kill counter rides
    // `payBattleRiders`. The lifetime record beside it (`Player.campsCleared`,
    // raised in `arriveOnTile`) counts the same act for the whole game, and The
    // Pacified Marches reads that record since batch D0. What this file owns is
    // the chair's own book, which Commission: Clear the Frontier keeps.
    const g = wildGame(9);
    const sc = slot(g.state, 0, 'dominionClearTheFrontier');
    const city = found(g.state, 0);
    settleCampBounty(g.state, 0, { col: city.col, row: city.row });
    expect(tallyOf(sc, 'dominionClearTheFrontier')).toBe(1);
  });

  it('says what each of them counts, in a first-time player’s words', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('theWarChronicle')).toEqual([
      '+3 science, +3 culture to the empire',
      '+3 science per enemy unit you have killed, counted while this Order stands in a slot',
      '+3 culture per enemy unit you have killed, counted while this Order stands in a slot',
    ]);
    expect(said('dominionTheMusterRolls')).toEqual([
      '+1 science per unit you have trained, counted while this Order stands in a slot',
      '+1 culture per unit you have trained, counted while this Order stands in a slot',
    ]);
  });
});

// --- a grant that is a share of the moment ----------------------------------

describe('a windfall grant scaled by the occasion’s own facts', () => {
  it('strength — the sword teaches the smith three quarters of what it is worth', () => {
    const g = game();
    slot(g.state, 0, 'theArtOfWar');
    const player = playerById(g.state, 0)!;
    const city = found(g.state, 0);
    marchOut(g.state, city);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    // Three quarters of the roster's own figure, composed once before anything
    // is banked — read off `unitDef` rather than typed here, so a retune of the
    // warrior moves the claim with it.
    const share = unitDef('warrior').combatStrength * 0.75;
    expect(share).toBeGreaterThan(0);
    const before = player.sciencePool;
    realiseItem(g.state, city, { kind: 'unit', id: 'warrior', tile });
    expect(player.sciencePool - before).toBeCloseTo(share, 10);
  });

  it('strength — a kill and a death are each paid for the piece that fell', () => {
    // Read off the composition rather than off the banks, because the banks are
    // downstream of it: a kill settles its research bucket on the spot, so a
    // beaker that finished a technology is no longer in the pool a line later.
    // What the shape promises is the *printed figure*, and this is it.
    const g = game();
    slot(g.state, 0, 'songsOfTheFallen');
    // Every loss pays, the attacker killed by the counter-blow as well as the
    // piece that was defending (the user's ruling of 2026-10-13: feeding units
    // to die is a way to play), so the death is asked both ways.
    for (const [occasion, defending] of [
      ['kill', false],
      ['death', true],
      ['death', false],
    ] as const) {
      const payout = windfallPayout(g.state, 0, occasion, 0, 0, { strength: 11, defending });
      expect(payout.grants.map((line) => [line.yield, line.amount])).toEqual([
        ['science', 22],
        ['culture', 22],
      ]);
    }
    // A strength of nought is a real nought and pays nothing — the zero line
    // every fold in this file drops rather than printing.
    expect(windfallPayout(g.state, 0, 'kill', 0, 0, { strength: 0 }).grants).toEqual([]);
  });

  it('a measure the occasion does not carry pays nothing at all', () => {
    // The silence every filter on this shape keeps, said about a *figure*: a
    // card written on a town's people, asked of a chop, is simply not on that
    // payout — a zero line would have been a promise the fold then dropped.
    const g = game();
    slot(g.state, 0, 'dominionTriumphs');
    const payout = windfallPayout(g.state, 0, 'chop', 20);
    expect(payout.grants).toEqual([]);
    expect(payout.amount).toBe(20);
  });

  it('payout — the tithe reads what the felling paid, percentages folded in', () => {
    // **The design doc's own ruling** on The Woodwrights and Charcoal Burners:
    // *"chop percentages add together before Charcoal Burners reads the
    // payout"*. So the two passes are load-bearing — a tithe taken off the raw
    // base would have paid the same under a doubled chop.
    const g = game();
    slot(g.state, 0, 'charcoalBurners');
    const bare = windfallPayout(g.state, 0, 'chop', 20);
    expect(bare.amount).toBe(20);
    const faith = bare.grants.find((line) => line.yield === 'faith')!;
    expect(faith.amount).toBeCloseTo(4, 10);

    slot(g.state, 0, 'theWoodwrights');
    const raised = windfallPayout(g.state, 0, 'chop', 20);
    expect(raised.amount).toBe(50);
    expect(raised.grants.find((line) => line.yield === 'faith')!.amount).toBeCloseTo(10, 10);
  });

  it('gold and the ceiling — the receipts take a tenth, and never more than thirty', () => {
    const g = game();
    slot(g.state, 0, 'civicReceipts');
    const player = playerById(g.state, 0)!;
    const city = found(g.state, 0);
    player.gold = 100000;
    const before = player.culturePool;
    purchaseItemAt(g.state, player, city, { kind: 'building', id: 'monument' }, 'gold');
    const paid = player.culturePool - before;
    expect(paid).toBeGreaterThan(0);
    // **The ceiling is the card's own sentence** and lands before any era
    // multiplier, so "at most 30 culture per purchase" means thirty in every
    // age. A monument costs well over three hundred gold at this scale, so this
    // purchase is the capped case.
    expect(paid).toBeLessThanOrEqual(30);
  });
});

// --- the world's ledger of what was done first ------------------------------

describe('first-of-a-kind records', () => {
  it('marks a town’s first of a building, once, per type', () => {
    const g = game();
    const city = found(g.state, 0);
    expect(markFirst(g.state, 0, 'buildingInCity', firstKey(city.id, 'monument'))).toBe(true);
    // The same town, the same row: written once and never again, whatever else
    // happens to the town.
    expect(markFirst(g.state, 0, 'buildingInCity', firstKey(city.id, 'monument'))).toBe(false);
    // A different row in the same town is a different record — the design doc's
    // *"counts each culture building type once per city"*.
    expect(markFirst(g.state, 0, 'buildingInCity', firstKey(city.id, 'amphitheater'))).toBe(true);
    expect(countFirsts(g.state, 0, 'buildingInCity')).toBe(2);
    // And the record carries a turn, never a countdown.
    for (const record of g.state.firsts) expect(record.turn).toBe(g.state.turn);
  });

  it('pays the masons for a wall built, and never for a wall bought', () => {
    const g = game();
    slot(g.state, 0, 'magisterialMasterMasons');
    const player = playerById(g.state, 0)!;
    const built = found(g.state, 0);
    const bought = found(g.state, 0);
    const basket = built.hammerBasket;
    realiseItem(g.state, built, { kind: 'building', id: 'monument' });
    // Twenty hammers into the town that raised it.
    expect(built.hammerBasket).toBeGreaterThan(basket);

    // **A bought roof closes the ledger's door and pays nobody**, which is the
    // design doc verbatim: *"purchases, gifts, replacement/rebuilding and
    // capture do not count. Record previous acquisition even while inactive."*
    // So the record exists and the reward does not — which is what stops an
    // empire buying a monument and then building one for a second first.
    player.gold = 100000;
    const before = bought.hammerBasket;
    purchaseItemAt(g.state, player, bought, { kind: 'building', id: 'monument' }, 'gold');
    expect(bought.hammerBasket).toBe(before);
    expect(countFirsts(g.state, 0, 'buildingInCity')).toBe(2);
  });

  it('counts the chronicle off the ledger, narrowed to one shelf', () => {
    const g = game();
    slot(g.state, 0, 'theChronicleOfWorks');
    const city = found(g.state, 0);
    expect(empirePays(g.state, 0, 'science')).toBe(0);
    realiseItem(g.state, city, { kind: 'building', id: 'monument' });
    expect(empirePays(g.state, 0, 'science')).toBe(1);
    expect(empirePays(g.state, 0, 'gold')).toBe(1);
    // A granary is not a culture building, so the chronicle does not move.
    realiseItem(g.state, city, { kind: 'building', id: 'granary' });
    expect(empirePays(g.state, 0, 'science')).toBe(1);
  });

  it('techWorld — the patent is the world’s, so only one empire is ever paid', () => {
    const g = game();
    // Marked against the world, not against an empire: the first seat writes
    // the row and the second is told there is nothing to write.
    expect(markFirst(g.state, 0, 'techWorld', 'bronzeWorking')).toBe(true);
    expect(markFirst(g.state, 1, 'techWorld', 'bronzeWorking')).toBe(false);
    expect(countFirsts(g.state, 0, 'techWorld')).toBe(1);
    expect(countFirsts(g.state, 1, 'techWorld')).toBe(0);
    // An empire ledger is the other reading — the same key, one row per seat.
    expect(markFirst(g.state, 0, 'conversion', firstKey(7))).toBe(true);
    expect(markFirst(g.state, 1, 'conversion', firstKey(7))).toBe(true);
  });

  it('is the world’s answer, never the card’s', () => {
    // A rider naming a ledger this occasion did not open does not ride — so a
    // card cannot pay itself a first by being held at the right moment.
    const g = game();
    slot(g.state, 0, 'thePatentRolls');
    expect(windfallPayout(g.state, 0, 'tech').grants).toEqual([]);
    const paid = windfallPayout(g.state, 0, 'tech', 0, 0, { firsts: ['techWorld'] });
    expect(paid.grants.map((line) => line.yield)).toEqual(['culture']);
    expect(paid.renown.map((line) => line.amount)).toEqual([10]);
  });
});

// --- the limiter ------------------------------------------------------------

describe('a once-a-turn rider', () => {
  it('rides the first kill of the turn and no other, and the next turn is new', () => {
    const g = wildGame(23);
    slot(g.state, 0, 'fieldAcademies');
    const player = playerById(g.state, 0)!;
    const before = player.sciencePool;
    expect(killARaider(g)).toBe(true);
    expect(player.sciencePool - before).toBe(23);

    // The second kill of the same turn pays nothing at all.
    const after = player.sciencePool;
    if (killARaider(g)) expect(player.sciencePool).toBe(after);

    // **Nothing ticks.** The turn moving on is the whole of the reset, so the
    // stamp is simply no longer this turn.
    const sc = player.statecraft;
    expect(sc.riderTurns).toEqual([{ card: 'fieldAcademies', turn: g.state.turn }]);
    g.state.turn += 1;
    const third = player.sciencePool;
    if (killARaider(g)) expect(player.sciencePool - third).toBe(23);
  });

  it('charges nothing for the asking — composing a payout is not spending one', () => {
    // The split `WindfallPayout.claims` exists for: a seam that builds a payout
    // and never delivers it has cost the card nothing. A limiter that stamped
    // inside the composition would have eaten the day on every guard.
    const g = game();
    slot(g.state, 0, 'fieldAcademies');
    const payout = windfallPayout(g.state, 0, 'kill');
    expect(payout.claims).toEqual(['fieldAcademies']);
    expect(playerById(g.state, 0)!.statecraft.riderTurns).toBeUndefined();
    // And asked twice without delivery, it still rides — nothing was spent.
    expect(windfallPayout(g.state, 0, 'kill').claims).toEqual(['fieldAcademies']);
  });
});

// --- determinism ------------------------------------------------------------

describe('determinism', () => {
  it('keeps the ledger in write order, and settles a tie by the order the seams ran', () => {
    // **"First" is exactly a contention question**, and this is the answer: the
    // row is appended iff no row matches, so whoever reaches `markFirst` first
    // owns it — a property of the order commands were applied in rather than of
    // a check somebody could forget. Nothing here reads a Map, and the array is
    // in write order, which is the order a replay reproduces.
    const g = game();
    expect(markFirst(g.state, 0, 'techWorld', 'pottery')).toBe(true);
    expect(markFirst(g.state, 1, 'techWorld', 'pottery')).toBe(false);
    expect(markFirst(g.state, 1, 'buildingKind', 'granary')).toBe(true);
    expect(markFirst(g.state, 0, 'buildingKind', 'granary')).toBe(true);
    expect(g.state.firsts.map((row) => [row.kind, row.key, row.playerId])).toEqual([
      ['techWorld', 'pottery', 0],
      ['buildingKind', 'granary', 1],
      ['buildingKind', 'granary', 0],
    ]);
    // And it survives the snapshot the replay comparison is made of.
    const carried = JSON.parse(snapshotState(g.state)) as { firsts?: unknown };
    expect(carried.firsts).toEqual(g.state.firsts);
  });

  it('replays a log to the same world twice over', () => {
    const g = wildGame(41);
    const mine = soldier(g.state, 0);
    mine.movesLeft = 60;
    const step = openGround(g.state, mine.col, mine.row);
    if (step) {
      dispatch(g, {
        type: 'move',
        playerId: 0,
        unitId: mine.id,
        path: [{ col: step.col, row: step.row }],
      } as unknown as Command);
    }
    const once = snapshotState(replay(g.config, g.log));
    const twice = snapshotState(replay(g.config, g.log));
    expect(twice).toEqual(once);
  });
});

// --- the register -----------------------------------------------------------

describe('the member register', () => {
  it('writes every first-of-a-kind ledger at a seam, and reads every one it declares', () => {
    // **A shape declared but never read fails here**, the discipline D2a and D2b
    // both kept. The seams are read out of the sources, so a ledger whose hook
    // is deleted fails in this file rather than silently answering nought for
    // the rest of the game.
    const sources = ['cities.ts', 'purchase.ts', 'tech.ts', 'religion.ts']
      .map(simSource)
      .join('\n');
    for (const kind of FIRST_KINDS) {
      expect(sources.includes(`'${kind}'`), `${kind} is written at no seam`).toBe(true);
    }
    // `markFirst` is the **one** writer, in `state.ts` and nowhere else.
    expect(simSource('state.ts')).toContain('export function markFirst');
    const written = (sources.match(/markFirst\(/g) ?? []).length;
    expect(written).toBe(FIRST_KINDS.length);
  });

  it('names every new member from at least one live row', () => {
    const ledgers = new Set<FirstKind>();
    const measures = new Set<OccasionMeasure>();
    let limiter = false;
    let shelf = false;
    let greatHouse = false;
    let anyOf = false;
    let ceiling = false;
    for (const id of ORDER_IDS) {
      for (const effect of orderDef(id).effects) {
        if (effect.kind !== 'windfallRider') continue;
        if (effect.first !== undefined) ledgers.add(effect.first);
        if (effect.oncePerTurn === true) limiter = true;
        if (effect.buildingCategory !== undefined) shelf = true;
        if (effect.empireBuilding !== undefined) greatHouse = true;
        if (effect.anyOf !== undefined && effect.anyOf.length > 0) anyOf = true;
        if (effect.grant?.fromOccasion !== undefined) measures.add(effect.grant.fromOccasion);
        if (effect.grant?.max !== undefined) ceiling = true;
      }
    }
    // `opusProgress` is Spolia's (the Dominion batch): the hammers a captured
    // town had put into the Magnum Opus. Dominion batch D6 added three: what a
    // peace carries (War Reparations, Danegeld) and the works and wonders in a
    // captured town (Looted Art). Dominion batch D7 added `unitCost`, what a
    // disbanded unit costs to build (The Legions' Labour). Scientific batch S6
    // added `techCost`, what a technology cost the seat (The Scholars' Fame).
    expect([...measures].sort()).toEqual([
      'gold',
      'hexesPillaged',
      'opusProgress',
      'payout',
      'population',
      'strength',
      'takenPopulation',
      'techCost',
      'unitCost',
      'worksAndWonders',
    ]);
    expect(limiter, 'oncePerTurn').toBe(true);
    expect(shelf, 'buildingCategory').toBe(true);
    // **The great-house narrowing is named again since Scientific batch S8.**
    // Learned Commissions carried the only two riders that named it until S7
    // cut them; The Invitations names it now (a great scholar for each empire
    // building completed). The Dedications names the class inside its any-of
    // filter, which pays once for a building that is a science building and
    // an empire building at the same time (the triage's reading 36).
    expect(greatHouse, 'empireBuilding').toBe(true);
    expect(anyOf, 'anyOf').toBe(true);
    expect(simSource('statecraft/evaluator.ts')).toContain('isEmpireBuilding(facts.building) !== effect.empireBuilding');
    // **A grant's ceiling is read and named by nobody**, and that is stated here
    // rather than forgotten — `conversion`'s bargain two claims down.
    //
    // Civic Receipts carried the only one (*"at most 30 culture per purchase"*)
    // until batch C1 read the user's own sheet for the Commerce deck, which
    // revises the row to *"with no cap"*. It is not an oversight and not a
    // one-off: the same sheet takes the ceiling off The Money Lenders' interest,
    // off The Merchant Ledger's beakers and off Travellers' Letters, so the
    // design is moving away from capped grants rather than forgetting one.
    //
    // The shape stays, and stays **read** — the arm in `windfallPayout` is
    // asserted below — because a ceiling is a thing a card may want again and
    // deleting it would make the next row that asks for one a new shape rather
    // than a field. What is pinned is the honest state: no Order names it today,
    // and a row that starts to must come back and say so here.
    expect(ceiling, "a grant's ceiling is named by no live row").toBe(false);
    expect(simSource('statecraft/evaluator.ts')).toContain('grant.max !== undefined');
    // **Two of the five ledgers are named by a row; three are named by none,
    // and that is stated rather than forgotten.** `conversion` is written
    // at its seam and *counted* by The Living Hymnal — the count is the whole of
    // what that card asks — but no rider narrows a moment by it, because the one
    // card that would (Missionary Hospitality) carries a second half about the
    // price of clergy that the roster has no word for. The ledger is read; it is
    // only the rider's narrowing that waits.
    //
    // **`purchaseInCity` joined it in batch C3**, and for the ceiling's reason
    // above: the user's ruling reworked Civic Receipts — the one row that named
    // it — from *"the first building a city buys"* to *"any building"*, so the
    // card came off the ledger of firsts entirely. The seam still marks it
    // (`purchaseItemAt`) and the member stays, because a card that wants a
    // town's first purchase again is then a JSON row rather than a new ledger,
    // and because deleting the mark would change what a save carries. What is
    // pinned is the honest state: nothing narrows by it today, and a row that
    // starts to must come back and say so here.
    //
    // **`buildingKind` joined them in Scientific batch S7**, for the same
    // reason as the great-house narrowing above: Learned Commissions' two
    // riders were the only rows that asked for the realm's first building of
    // each kind, and S7 cut them. The seam still marks it (`realiseItem`).
    expect([...ledgers].sort()).toEqual(['buildingInCity', 'techWorld']);
    expect(ledgers.has('conversion')).toBe(false);
    expect(ledgers.has('purchaseInCity')).toBe(false);
    expect(ledgers.has('buildingKind')).toBe(false);
    // The mark is still made, which is what keeps the member restorable.
    expect(simSource('purchase.ts')).toContain("'purchaseInCity'");
    expect(simSource('cities.ts')).toContain("markFirst(state, city.ownerId, 'buildingKind'");
  });
});
