/**
 * The growing cards, and the war order (schema 65, `docs/flags.md` queue item 6).
 *
 * Its own file rather than a wing of `statecraft.test.ts` because the subject is
 * one thing that file's three concerns do not cover: **a card whose figure is
 * not a reading of the board**. Every other card in the game answers the same
 * question every time it is asked; these five answer with what the empire has
 * watched happen while they sat in a slot, which makes the interesting failures
 * failures of the *hook* — an occasion counted from the bench, an occasion
 * counted twice, a counter reset by an adoption — rather than of the ledger.
 *
 * The Casus Belli rides here for the same reason: it is the other half of the
 * same pass, and it is the one card that pays on a declaration.
 */

import { describe, expect, it } from 'vitest';

import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import type { Command } from '../../src/sim/commands';
import { getTileAt, tileNeighbors } from '../../src/sim/map';
import { isWaterTerrain } from '../../src/sim/terrainData';
import { type GameState, createUnit, playerById } from '../../src/sim/state';
import { realiseItem } from '../../src/sim/cities';
import { greatPersonWorkAt } from '../../src/sim/greatPeople';
import { purchaseError, purchaseItemAt } from '../../src/sim/purchase';
import {
  type PlayerStatecraft,
  adoptGovernmentAt,
  cardCombatLines,
  cardEmpireYields,
  cardPercentYields,
  describeCard,
  foldCardYields,
  recordScalingOccasion,
  stripRefs,
  tallyOf,
} from '../../src/sim/statecraft';
import {
  type OrderId,
  type TallyOccasion,
  ORDER_IDS,
  TALLY_OCCASIONS,
  governmentsAtTier,
  orderDef,
} from '../../src/sim/statecraftData';
import { game, found } from './statecraftHelpers';

// --- harness ----------------------------------------------------------------

/** Puts a card in a slot, the way the draft and the slot verb would have. */
function slot(state: GameState, playerId: number, id: OrderId): PlayerStatecraft {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  return sc;
}

/** Takes the card out of every slot and leaves it on the shelf. */
function bench(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  sc.slots = sc.slots.filter((held) => held?.card !== id);
}

/** What this empire's cards pay the realm, in one voice. */
function empirePays(state: GameState, playerId: number, voice: 'gold' | 'science' | 'culture' | 'faith'): number {
  return foldCardYields(cardEmpireYields(state, playerId))[voice];
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

/**
 * A soldier of this seat's, standing somewhere a fight can happen: the piece it
 * already has, or one minted where its first piece stands.
 *
 * The bench's own pattern (`statecraft.test.ts`'s Wolf-Mother test) — a starting
 * roster is a mapgen decision and this file is about what a card counts.
 */
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

// --- the register -----------------------------------------------------------

describe('the growing-card vocabulary', () => {
  it('has a live row for every tally occasion, and an occasion on every tally row', () => {
    // The member register (`statecraft.test.ts`'s pattern): an occasion declared
    // and hooked at a seam but named by no card is an occasion nobody tests, and
    // a `tally` row that forgot to say what it watches counts nothing forever.
    const watched = new Set<TallyOccasion>();
    for (const id of ORDER_IDS) {
      for (const effect of orderDef(id).effects) {
        if (effect.kind !== 'countScaled' || effect.count !== 'tally') continue;
        expect(effect.tally, `${id} names no tally occasion`).toBeDefined();
        watched.add(effect.tally!);
      }
    }
    for (const occasion of TALLY_OCCASIONS) {
      expect(watched.has(occasion), occasion).toBe(true);
    }
  });

  it('pays every growing card out of the empire fold and nowhere else', () => {
    // The whole reason the counter is a `CountKind` rather than a shape of its
    // own: a growing card's line is an ordinary empire `countScaled` payout, so
    // the ledger, the `×N` label and the stamp are the ones every counting card
    // already had.
    for (const id of ORDER_IDS) {
      for (const effect of orderDef(id).effects) {
        if (effect.kind !== 'countScaled' || effect.count !== 'tally') continue;
        expect(effect.pays.to, id).toBe('yield');
        expect(effect.pays.to === 'yield' && effect.pays.where, id).toBe('empire');
      }
    }
  });

  it('says in words that the counting stops at the bench', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('theBalladWeavers')).toEqual([
      '+1 culture per barbarian you have killed, counted while this Order stands in a slot',
    ]);
    expect(said('theBellFounders')).toEqual([
      '+1 culture per wonder finished anywhere in the world, counted while this Order stands in a slot',
    ]);
    // One counter, two voices — two clauses off one tally, which is what makes
    // "counted once per card" a rule worth testing below.
    expect(said('theReliquaryRolls')).toEqual([
      '+2 faith per great person you have spent, counted while this Order stands in a slot',
      '+2 culture per great person you have spent, counted while this Order stands in a slot',
    ]);
    expect(said('theChroniclersOfTheFallen')).toEqual([
      '+1 gold per unit you have lost in battle, counted while this Order stands in a slot',
    ]);
    expect(said('theAlmonersBook')).toEqual([
      '+1 science per 400 gold you have spent buying, counted while this Order stands in a slot',
    ]);
  });
});

// --- the counter ------------------------------------------------------------

describe('the counter', () => {
  it('grows while slotted, pauses on the bench, and never forgets', () => {
    const g = game();
    const sc = slot(g.state, 0, 'theBalladWeavers');
    expect(tallyOf(sc, 'theBalladWeavers')).toBe(0);

    recordScalingOccasion(g.state, 0, 'barbarianKill');
    recordScalingOccasion(g.state, 0, 'barbarianKill');
    expect(tallyOf(sc, 'theBalladWeavers')).toBe(2);
    expect(empirePays(g.state, 0, 'culture')).toBe(2);

    // **The bench is never productive.** Three raiders fall while the card is on
    // the shelf and none of them is written down.
    bench(g.state, 0, 'theBalladWeavers');
    for (let i = 0; i < 3; i++) recordScalingOccasion(g.state, 0, 'barbarianKill');
    expect(tallyOf(sc, 'theBalladWeavers')).toBe(2);
    // And a benched card pays nothing at all, counter or no counter.
    expect(empirePays(g.state, 0, 'culture')).toBe(0);

    // Re-slotted, it resumes from where it stopped rather than from nought:
    // nothing is retroactive in either direction.
    slot(g.state, 0, 'theBalladWeavers');
    expect(empirePays(g.state, 0, 'culture')).toBe(2);
    recordScalingOccasion(g.state, 0, 'barbarianKill');
    expect(tallyOf(sc, 'theBalladWeavers')).toBe(3);
    expect(empirePays(g.state, 0, 'culture')).toBe(3);
  });

  it('survives an adoption rebuilding every slot', () => {
    const g = game();
    const player = playerById(g.state, 0)!;
    const sc = slot(g.state, 0, 'theBalladWeavers');
    for (let i = 0; i < 4; i++) recordScalingOccasion(g.state, 0, 'barbarianKill');
    expect(tallyOf(sc, 'theBalladWeavers')).toBe(4);

    // Adoption is a total amnesty: `slots` is rebuilt from scratch. The tally
    // lives on the *owned order*, so it is not in that array and cannot be
    // swept with it.
    const tier = 4;
    sc.pendingGovernment = { tier, options: [...governmentsAtTier(tier)] };
    expect(adoptGovernmentAt(g.state, player, 0)).not.toBeNull();
    expect(sc.slots.every((held) => held === null)).toBe(true);
    expect(tallyOf(sc, 'theBalladWeavers')).toBe(4);
    // Benched by the rebuild, so it pays nothing until it is placed again — and
    // then it pays the four it remembers.
    expect(empirePays(g.state, 0, 'culture')).toBe(0);
    slot(g.state, 0, 'theBalladWeavers');
    expect(empirePays(g.state, 0, 'culture')).toBe(4);
  });

  it('counts once per card however many voices the card pays in', () => {
    const g = game();
    const sc = slot(g.state, 0, 'theReliquaryRolls');
    recordScalingOccasion(g.state, 0, 'greatPersonSpent');
    // Two `countScaled` effects, one counter: a card is one watcher.
    expect(tallyOf(sc, 'theReliquaryRolls')).toBe(1);
    expect(empirePays(g.state, 0, 'faith')).toBe(2);
    expect(empirePays(g.state, 0, 'culture')).toBe(2);
  });

  it('keeps one counter per card when two cards watch one moment', () => {
    // Two growing cards on different occasions, slotted at different times: the
    // tally is keyed by the card, so neither inherits the other's history.
    const g = game();
    const sc = slot(g.state, 0, 'theBalladWeavers');
    recordScalingOccasion(g.state, 0, 'barbarianKill');
    recordScalingOccasion(g.state, 0, 'barbarianKill');
    slot(g.state, 0, 'theChroniclersOfTheFallen');
    recordScalingOccasion(g.state, 0, 'unitLost');
    expect(tallyOf(sc, 'theBalladWeavers')).toBe(2);
    expect(tallyOf(sc, 'theChroniclersOfTheFallen')).toBe(1);
    expect(sc.tallies.map((row) => row.card)).toEqual([
      'theBalladWeavers',
      'theChroniclersOfTheFallen',
    ]);
  });

  it("divides by the card's own step and keeps the remainder", () => {
    // The Almoners' Book banks the **coin**, not the purchase, which is the
    // whole reason the counter stores the raw figure: four purchases of a
    // hundred pay exactly what one of four hundred pays.
    const g = game();
    const sc = slot(g.state, 0, 'theAlmonersBook');
    recordScalingOccasion(g.state, 0, 'goldSpent', 399);
    expect(tallyOf(sc, 'theAlmonersBook')).toBe(399);
    expect(empirePays(g.state, 0, 'science')).toBe(0);
    recordScalingOccasion(g.state, 0, 'goldSpent', 1);
    expect(empirePays(g.state, 0, 'science')).toBe(1);
    recordScalingOccasion(g.state, 0, 'goldSpent', 400);
    expect(empirePays(g.state, 0, 'science')).toBe(2);
    recordScalingOccasion(g.state, 0, 'goldSpent', 399);
    expect(empirePays(g.state, 0, 'science')).toBe(2);
  });

  it('writes nothing down for a moment worth nothing', () => {
    const g = game();
    const sc = slot(g.state, 0, 'theAlmonersBook');
    recordScalingOccasion(g.state, 0, 'goldSpent', 0);
    // No row at all rather than a row of nought: a seat that has counted nothing
    // serialises like one that never will.
    expect(sc.tallies).toEqual([]);
  });
});

// --- the hooks --------------------------------------------------------------

describe('the occasions, at the seams that already knew', () => {
  it('barbarianKill — a raider cut down is a verse', () => {
    const g = wildGame();
    const wild = g.state.players.find((p) => p.barbarian)!;
    const sc = slot(g.state, 0, 'theBalladWeavers');
    const mine = soldier(g.state, 0);
    const target = openGround(g.state, mine.col, mine.row)!;
    expect(target).not.toBeNull();
    const raider = createUnit(g.state, wild.id, 'warrior', target.col, target.row);
    raider.hp = 1;
    const result = dispatch(g, {
      type: 'attack', playerId: 0, unitId: mine.id, target: { col: target.col, row: target.row },
    } as unknown as Command);
    expect(result.ok).toBe(true);
    expect(g.state.units.some((u) => u.id === raider.id)).toBe(false);
    expect(tallyOf(sc, 'theBalladWeavers')).toBe(1);
  });

  it('unitLost — a soldier of yours that falls in battle is written down', () => {
    const g = wildGame();
    const wild = g.state.players.find((p) => p.barbarian)!;
    const sc = slot(g.state, 0, 'theChroniclersOfTheFallen');
    const mine = soldier(g.state, 0);
    // One hit point, against a whole raider: the counter-blow finishes it, which
    // is the only way to reach the `death` seam from the attacking side.
    mine.hp = 1;
    const target = openGround(g.state, mine.col, mine.row)!;
    expect(target).not.toBeNull();
    createUnit(g.state, wild.id, 'warrior', target.col, target.row);
    const result = dispatch(g, {
      type: 'attack', playerId: 0, unitId: mine.id, target: { col: target.col, row: target.row },
    } as unknown as Command);
    expect(result.ok).toBe(true);
    // The counter fires on the death, whichever side of the blow it happened on.
    expect(g.state.units.some((u) => u.id === mine.id)).toBe(false);
    expect(tallyOf(sc, 'theChroniclersOfTheFallen')).toBe(1);
    expect(empirePays(g.state, 0, 'gold')).toBe(1);
  });

  it('wonderAnywhere — the bell answers a rival, not only your own masons', () => {
    const g = game();
    const mine = slot(g.state, 0, 'theBellFounders');
    const theirs = slot(g.state, 1, 'theBellFounders');
    const town = found(g.state, 1);
    // A wonder raised by seat 1, in seat 1's town: both books are written.
    // Straight through `realiseItem`, the one routine that means "the city now
    // has the thing" and therefore the one that claims a wonder.
    const wonder = 'pyramids' as const;
    realiseItem(g.state, town, { kind: 'building', id: wonder });
    expect(g.state.wonders.some((claim) => claim.building === wonder)).toBe(true);
    expect(tallyOf(theirs, 'theBellFounders')).toBe(1);
    expect(tallyOf(mine, 'theBellFounders')).toBe(1);
    // The jealous neighbour is paid without ever seeing the thing.
    expect(empirePays(g.state, 0, 'culture')).toBe(1);
  });

  it('greatPersonSpent — the reliquary counts a work as it counts a boon', () => {
    const g = game();
    const sc = slot(g.state, 0, 'theReliquaryRolls');
    const player = playerById(g.state, 0)!;
    found(g.state, 0);
    const seat = g.state.units.find((u) => u.ownerId === 0)!;
    const tile = getTileAt(g.state.map, seat.col, seat.row)!;
    const person = createUnit(g.state, 0, 'greatPerson', tile.col, tile.row, 'imhotep');
    greatPersonWorkAt(g.state, player, person, tile);
    expect(g.state.units.some((u) => u.id === person.id)).toBe(false);
    expect(tallyOf(sc, 'theReliquaryRolls')).toBe(1);
  });

  it('goldSpent — the almoners count the coin, not the purchase', () => {
    const g = game();
    const sc = slot(g.state, 0, 'theAlmonersBook');
    const player = playerById(g.state, 0)!;
    const city = found(g.state, 0);
    player.gold = 100000;
    const before = player.gold;
    const bought = purchaseItemAt(g.state, player, city, { kind: 'unit', id: 'warrior' }, 'gold');
    expect(bought).toBeDefined();
    const paid = before - player.gold;
    expect(paid).toBeGreaterThan(0);
    expect(tallyOf(sc, 'theAlmonersBook')).toBe(paid);
  });

  it('goldSpent — a faith purchase is not a coin the almoners can count', () => {
    const g = game();
    const sc = slot(g.state, 0, 'theAlmonersBook');
    const player = playerById(g.state, 0)!;
    const city = found(g.state, 0);
    player.faithPool = 100000;
    player.gold = 0;
    // The one unit sold out of its own bank. If the gate refuses it for a reason
    // that is not this test's subject, the claim still holds: no coin left the
    // treasury, so the almoners have nothing to write.
    const faithSale = { kind: 'unit', id: 'augur' } as const;
    if (purchaseError(g.state, 0, city.id, faithSale, 'faith') === null) {
      purchaseItemAt(g.state, player, city, faithSale, 'faith');
      expect(player.faithPool).toBeLessThan(100000);
    }
    expect(tallyOf(sc, 'theAlmonersBook')).toBe(0);
  });
});

// --- the war order ----------------------------------------------------------

describe('The Casus Belli', () => {
  /** Two seats at peace, so the declaration below is the first one. */
  function peaceGame(seed = 11) {
    return createGame({
      seed,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e', isHuman: true },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    });
  }

  it('hangs its two lines on the empire when the herald rides out', () => {
    const g = peaceGame();
    slot(g.state, 0, 'theCasusBelli');
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    expect(player.timed ?? []).toHaveLength(0);

    const declared = dispatch(g, { type: 'declareWar', playerId: 0, targetId: 1 } as Command);
    expect(declared.ok).toBe(true);

    // **Absolute turns, nothing ticking.** Two effects, one expiry, ten turns on.
    const hung = player.timed ?? [];
    expect(hung).toHaveLength(2);
    for (const held of hung) {
      expect(held.card).toBe('theCasusBelli');
      expect(held.expiresTurn).toBe(g.state.turn + 10);
    }

    // The strength half is a **labelled line** on the combat ledger, never a
    // multiplier — the discipline every card strength line keeps.
    const mine = g.state.units.find((u) => u.ownerId === 0)!;
    const lines = cardCombatLines(g.state, {
      unit: mine,
      side: 'attack',
      tile: getTileAt(g.state.map, mine.col, mine.row)!,
      vsBarbarians: false,
      vsCity: false,
      targetHp: 100,
      targetMaxHp: 100,
    });
    const strength = lines.find((line) => line.card === 'theCasusBelli');
    expect(strength).toBeDefined();
    expect(strength!.amount).toBe(2);
    expect(strength!.source).toContain('Casus Belli');

    // The production half is a **staged** percentage (Entry XVII), on the city
    // stage — a per-town percentage that sums with the other per-town ones.
    const percent = cardPercentYields(g.state, city).find((line) => line.card === 'theCasusBelli');
    expect(percent).toBeDefined();
    expect(percent!.yield).toBe('production');
    expect(percent!.percent).toBe(10);
    expect(percent!.stage).toBe('city');
  });

  it('sees nothing from the bench', () => {
    const g = peaceGame();
    const sc = playerById(g.state, 0)!.statecraft;
    // Held, and not placed: the card's occasion is read off the slots.
    sc.orders.push('theCasusBelli');
    dispatch(g, { type: 'declareWar', playerId: 0, targetId: 1 } as Command);
    expect(playerById(g.state, 0)!.timed ?? []).toHaveLength(0);
  });

  it('pays only the seat that declared', () => {
    const g = peaceGame();
    slot(g.state, 0, 'theCasusBelli');
    slot(g.state, 1, 'theCasusBelli');
    dispatch(g, { type: 'declareWar', playerId: 0, targetId: 1 } as Command);
    expect(playerById(g.state, 0)!.timed ?? []).toHaveLength(2);
    // The defender is paid nothing: the card is about *starting* a war.
    expect(playerById(g.state, 1)!.timed ?? []).toHaveLength(0);
  });

  it('runs out by comparison, and the card unslotted meanwhile keeps what it bought', () => {
    const g = peaceGame();
    slot(g.state, 0, 'theCasusBelli');
    const city = found(g.state, 0);
    dispatch(g, { type: 'declareWar', playerId: 0, targetId: 1 } as Command);
    const opened = g.state.turn;

    // Benched the instant after: the fury was bought at the declaration and is
    // an ordinary timed effect on the realm from then on.
    bench(g.state, 0, 'theCasusBelli');
    expect(
      cardPercentYields(g.state, city).some((line) => line.card === 'theCasusBelli'),
    ).toBe(true);

    // One turn short of the expiry it still runs; on it, it does not — and
    // nothing was decremented to make that true.
    g.state.turn = opened + 9;
    expect(
      cardPercentYields(g.state, city).some((line) => line.card === 'theCasusBelli'),
    ).toBe(true);
    g.state.turn = opened + 10;
    expect(
      cardPercentYields(g.state, city).some((line) => line.card === 'theCasusBelli'),
    ).toBe(false);
  });
});

// --- determinism ------------------------------------------------------------

describe('a game mid-count', () => {
  /** The bench both halves below are built on. */
  const config = {
    seed: 17,
    sizeName: 'duel' as const,
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  };

  /**
   * One scripted history: two cards placed, a war declared, four raiders cut
   * down, one of them after the card has been benched and put back.
   *
   * The slotting is written straight onto the seat because reaching a card
   * honestly is a forty-turn climb (that replay is the slow tier's); everything
   * the *counter* does is driven by the same calls the simulation makes.
   */
  function play(): { state: GameState; log: Command[] } {
    const g = createGame(config);
    const log: Command[] = [];
    const send = (command: Command): void => {
      const result = dispatch(g, command);
      expect(result.ok, JSON.stringify(command)).toBe(true);
      log.push(command);
    };
    slot(g.state, 0, 'theCasusBelli');
    slot(g.state, 0, 'theBalladWeavers');
    send({ type: 'declareWar', playerId: 0, targetId: 1 } as Command);
    recordScalingOccasion(g.state, 0, 'barbarianKill');
    recordScalingOccasion(g.state, 0, 'barbarianKill');
    bench(g.state, 0, 'theBalladWeavers');
    recordScalingOccasion(g.state, 0, 'barbarianKill');
    slot(g.state, 0, 'theBalladWeavers');
    recordScalingOccasion(g.state, 0, 'barbarianKill');
    send({ type: 'endTurn', playerId: 0 } as Command);
    send({ type: 'endTurn', playerId: 1 } as Command);
    return { state: g.state, log };
  }

  it('reaches the same bytes twice, counters and all', () => {
    // The counter is a **list**, in the order each row opened, precisely so that
    // this comparison is possible: a map keyed by card would serialise in
    // whatever order the runtime felt like, which is the one thing CLAUDE.md's
    // determinism rule forbids an outcome to depend on.
    const first = play();
    const second = play();
    expect(snapshotState(first.state)).toBe(snapshotState(second.state));
    // Three of the four kills were watched; the benched one was not.
    expect(tallyOf(playerById(first.state, 0)!.statecraft, 'theBalladWeavers')).toBe(3);
    // And it is genuinely *in* the save rather than derived on the way out.
    expect(snapshotState(first.state)).toContain('theBalladWeavers');
  });

  it('replays its command log byte-identical', () => {
    // The scaffolding above is deliberately not in the log, so this is the
    // ordinary claim about the commands themselves: a declaration that now
    // fires an occasion and hangs a timed effect has not moved a single die.
    const { log } = play();
    const rerun = replay(config, log);
    const bare = createGame(config);
    for (const command of log) dispatch(bare, command);
    expect(snapshotState(rerun)).toBe(snapshotState(bare.state));
  });
});
