import { describe, expect, it } from 'vitest';

import {
  type GameConfig,
  type GameState,
  type Player,
  bumpRevision,
  newGame,
} from '../../src/sim/state';
import { applyCommand } from '../../src/sim/commands';
import { OCCASIONS } from '../../src/sim/occasions';
import {
  MALICE_IDS,
  MALICE_RULES,
  type MaliceId,
  maliceDataProblems,
  maliceDef,
} from '../../src/sim/maliceData';
import {
  describeCard,
  liveEffects,
  maliceAt,
  maliceChairFor,
  reseatMalices,
  shedMalices,
  slotOrderError,
  slotTypesOf,
  takeMalice,
  unslotOrderError,
} from '../../src/sim/statecraft';
import {
  DOCTRINE_IDS,
  GOVERNMENT_IDS,
  ORDER_IDS,
  type OrderId,
  type SlotType,
  cardDef,
  isGovernmentId,
  orderDef,
  slotLayout,
} from '../../src/sim/statecraftData';
import { ALL_BELIEF_IDS, beliefDef } from '../../src/sim/religionData';
import { classifyCard } from '../../src/sim/ledgerClass';
import { readEmpire } from '../../src/sim/readings';
import { unitDef } from '../../src/sim/unitData';
import { judgeWagers, seatPendingMalices } from '../../src/sim/wagers';

/**
 * **The malice deck** — batch G3, `docs/wager.md` §4 (the spec of record).
 *
 * What this file pins, in the order the mechanism runs: the deck is a table of
 * effects the evaluator already reads and no row writes a figure into its prose;
 * the seating takes the **last chair of the malice's flavour**, falls back to a
 * wildcard, and seats a chairless malice rather than refusing one; the chair
 * cannot be emptied and cannot be filled, and the refusal leaves the board
 * byte-identical; the draw never repeats a card a seat already carries; the stack
 * is two and a third replaces the oldest; an adoption re-seats rather than
 * amnesties; the term is a stamp the next judgement compares against — shed on a
 * bar kept, renewed on one missed; and the card in the chair really is paid, as
 * a line credited to itself.
 *
 * The bench is the seating verbs plus one pass through the judgement, for
 * `wagers.test.ts`' reason: the claim is about the rule, and a two-hundred-turn
 * game measures the tree's pace instead.
 */

function config(over: Partial<GameConfig> = {}): GameConfig {
  return {
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Bors', color: '#00a', isHuman: false },
    ],
    ...over,
  };
}

/** The seat, and the government it opens under — one chair of each flavour. */
function seat(state: GameState): Player {
  return state.players[0]!;
}

/** Puts a government's spread on a seat by hand, the way an adoption would. */
function govern(state: GameState, player: Player, id: string): void {
  if (!isGovernmentId(id)) throw new Error(`no government ${id}`);
  player.statecraft.government = id;
  player.statecraft.slots = slotLayout(id).map(() => null);
  bumpRevision(state);
}

/** An Order of this flavour, held and slotted by hand. Returns the card. */
function slotByHand(state: GameState, player: Player, slotIndex: number): OrderId {
  const type = slotTypesOf(player.statecraft)[slotIndex]!;
  const card = ORDER_IDS.find(
    (id) => orderDef(id).slot === type && orderDef(id).retired !== true,
  )!;
  if (!player.statecraft.orders.includes(card)) player.statecraft.orders.push(card);
  player.statecraft.slots[slotIndex] = { card, sealedUntil: state.turn + 5 };
  bumpRevision(state);
  return card;
}

/** One city on the board, founded by the seat's own settler. */
function found(state: GameState, player: Player): void {
  const settler = state.units.find(
    (unit) => unit.ownerId === player.id && unitDef(unit.type).foundsCity === true,
  )!;
  const result = applyCommand(state, {
    type: 'foundCity',
    playerId: player.id,
    settlerUnitId: settler.id,
  });
  expect(result.ok).toBe(true);
}

/** Seats one named malice by hand — the draw is tested on its own, below. */
function seatNamed(state: GameState, player: Player, id: MaliceId, untilAge = 3): void {
  const chair = maliceChairFor(player, maliceDef(id).chair);
  if (chair !== null) player.statecraft.slots[chair] = null;
  player.malices.push(chair === null ? { id, untilAge } : { id, untilAge, chair });
  bumpRevision(state);
}

// --- 1. the deck ------------------------------------------------------------

describe('the deck', () => {
  it('is consistent: one effect a row, a chair, a note, and no figure in the prose', () => {
    expect(maliceDataProblems()).toEqual([]);
  });

  it('holds the twelve of the worksheet, three a chair-flavour and six wild', () => {
    expect(MALICE_IDS).toHaveLength(12);
    const chairs: Record<SlotType, number> = { military: 0, economic: 0, wildcard: 0 };
    for (const id of MALICE_IDS) chairs[maliceDef(id).chair] += 1;
    expect(chairs).toEqual({ military: 3, economic: 3, wildcard: 6 });
  });

  it('reads only effect kinds some live card already pays', () => {
    // The register (§4: *"every malice's effect kind is one the evaluator
    // reads"*), asked of the tables rather than of a list written here: a kind
    // no other card in the game names would be a shape with one reader and no
    // second opinion, which is exactly the drift the cards' own register test
    // exists to catch.
    const live = new Set<string>();
    for (const id of [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS]) {
      for (const effect of cardDef(id).effects) live.add(effect.kind);
    }
    for (const id of ALL_BELIEF_IDS) {
      for (const effect of beliefDef(id).effects) live.add(effect.kind);
    }
    for (const id of MALICE_IDS) {
      for (const effect of maliceDef(id).effects) {
        expect(live.has(effect.kind), `${id}: ${effect.kind}`).toBe(true);
      }
    }
  });

  it('says what every row does in the cards’ own words', () => {
    // One describer for eleven classes: a malice is described by the same
    // function the offer card and the hover use, so the punishment cannot be
    // worded one way on a shelf and another in a chair.
    for (const id of MALICE_IDS) {
      const clauses = describeCard(id);
      expect(clauses.length, id).toBeGreaterThan(0);
      for (const clause of clauses) expect(clause.text.trim().length, id).toBeGreaterThan(0);
    }
  });

  it('classes its lines with the deck, where a player goes looking for them', () => {
    for (const id of MALICE_IDS) expect(classifyCard(id), id).toBe('deck');
  });

  it('announces the seating in the world’s one vocabulary', () => {
    expect(OCCASIONS).toContain('maliceSeated');
  });
});

// --- 2. the chair -----------------------------------------------------------

describe('the seating', () => {
  it('takes the last chair of its own flavour, and turns the Order there out', () => {
    const state = newGame(config());
    const player = seat(state);
    // The Sultanate: five military chairs, so "last of its flavour" is a claim
    // with somewhere else it could have gone.
    govern(state, player, 'theSultanate');
    const layout = slotTypesOf(player.statecraft);
    const lastMilitary = layout.lastIndexOf('military');
    const firstMilitary = layout.indexOf('military');
    const sitting = slotByHand(state, player, lastMilitary);
    const safe = slotByHand(state, player, firstMilitary);

    seatNamed(state, player, 'thinRanks');
    expect(maliceAt(player, lastMilitary)).toBe('thinRanks');
    // The Order is out of the chair, its seal broken — and still held, because
    // nothing was ever spent on it and nothing is taken away.
    expect(player.statecraft.slots[lastMilitary]).toBeNull();
    expect(player.statecraft.orders).toContain(sitting);
    // The rest of the arrangement is untouched.
    expect(player.statecraft.slots[firstMilitary]?.card).toBe(safe);
  });

  it('falls back on the last wildcard where the realm has no chair of that flavour', () => {
    const state = newGame(config());
    const player = seat(state);
    // The Council of Elders keeps no military chair at all.
    govern(state, player, 'councilOfElders');
    const layout = slotTypesOf(player.statecraft);
    expect(layout).not.toContain('military');
    seatNamed(state, player, 'thinRanks');
    expect(maliceAt(player, layout.lastIndexOf('wildcard'))).toBe('thinRanks');
  });

  it('gives a second malice a chair of its own, never the first one’s', () => {
    const state = newGame(config());
    const player = seat(state);
    govern(state, player, 'chiefdom');
    seatNamed(state, player, 'thinRanks');
    seatNamed(state, player, 'deserters');
    const chairs = player.malices.map((held) => held.chair);
    expect(new Set(chairs).size).toBe(2);
    // One military chair in the chiefdom, so the second falls to the wildcard.
    const layout = slotTypesOf(player.statecraft);
    expect(chairs).toEqual([layout.indexOf('military'), layout.lastIndexOf('wildcard')]);
  });

  it('is never refused: with every chair taken it sits in the ninth chair nobody has', () => {
    const state = newGame(config());
    const player = seat(state);
    govern(state, player, 'chiefdom');
    // Three chairs, three malices already in them — the arrangement the live
    // tables cannot reach (the cap is two) and the rule still has to answer for.
    seatNamed(state, player, 'thinRanks');
    seatNamed(state, player, 'deserters');
    seatNamed(state, player, 'leanYears');
    expect(maliceChairFor(player, 'economic')).toBeNull();

    const before = readEmpire(state, player.id).totals.food;
    seatNamed(state, player, 'debasedCoin');
    expect(player.malices[player.malices.length - 1]!.chair).toBeUndefined();
    // The slots array is not grown for it: a government's spread is a fact about
    // the government.
    expect(player.statecraft.slots).toHaveLength(3);
    // And it is paid all the same — this one takes gold, so the food is the
    // control and the line below is the payment.
    expect(readEmpire(state, player.id).totals.food).toBe(before);
    expect(liveEffects(state, player.id).some((line) => line.card === 'debasedCoin')).toBe(true);
  });
});

// --- 3. the chair cannot be moved -------------------------------------------

describe('the chair a malice holds', () => {
  it('refuses to be emptied, in the reducer’s own sentence, changing nothing', () => {
    const state = newGame(config());
    const player = seat(state);
    seatNamed(state, player, 'thinRanks');
    const chair = player.malices[0]!.chair!;

    const refusal = unslotOrderError(state, player.id, chair);
    expect(refusal).toBe('The Thin Ranks holds slot 1 and cannot be moved');

    const before = JSON.stringify(state);
    const result = applyCommand(state, { type: 'unslotOrder', playerId: player.id, slotIndex: chair });
    expect(result.ok).toBe(false);
    // Hard rule 1: a rejected command leaves the state byte-identical.
    expect(JSON.stringify(state)).toBe(before);
  });

  it('refuses to be filled, with the same sentence', () => {
    const state = newGame(config());
    const player = seat(state);
    seatNamed(state, player, 'thinRanks');
    const chair = player.malices[0]!.chair!;
    const card = ORDER_IDS.find(
      (id) => orderDef(id).slot === 'military' && orderDef(id).retired !== true,
    )!;
    player.statecraft.orders.push(card);
    bumpRevision(state);

    expect(slotOrderError(state, player.id, card, chair)).toBe(
      'The Thin Ranks holds slot 1 and cannot be moved',
    );
    const before = JSON.stringify(state);
    const result = applyCommand(state, {
      type: 'slotOrder',
      playerId: player.id,
      cardId: card,
      slotIndex: chair,
    });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });
});

// --- 4. the draw and the stack ----------------------------------------------

describe('the draw', () => {
  it('never deals a seat a card it already carries', () => {
    // Ten draws against a cap of two: every one of them has to come out of the
    // deck minus what is in the chairs, which is the whole of §4's clause.
    const state = newGame(config());
    const player = seat(state);
    for (let round = 0; round < 10; round += 1) {
      const taken = takeMalice(state, player, 3 + round);
      expect(taken, `round ${round}`).not.toBeNull();
      const ids = player.malices.map((held) => held.id);
      expect(new Set(ids).size, `round ${round}`).toBe(ids.length);
    }
  });

  it('stacks to the table’s cap and then replaces the oldest', () => {
    const state = newGame(config());
    const player = seat(state);
    // Counted against `rules.stack` rather than against a number written here:
    // a figure in a test is a second table, and the cap is a dial.
    const cap = MALICE_RULES.stack;
    const filled = [];
    for (let step = 0; step < cap; step += 1) filled.push(takeMalice(state, player, 3 + step)!);
    expect(player.malices.map((held) => held.id)).toEqual(filled.map((one) => one.id));

    const over = takeMalice(state, player, 3 + cap)!;
    expect(over.replaced).toBe(filled[0]!.id);
    expect(player.malices).toHaveLength(cap);
    expect(player.malices.map((held) => held.id)).toEqual([
      ...filled.slice(1).map((one) => one.id),
      over.id,
    ]);
    // The evicted card's chair went with it: two malices, two chairs, never a
    // chair still marked as taken by a card nobody holds.
    const chairs = player.malices.map((held) => held.chair);
    expect(new Set(chairs).size).toBe(chairs.length);
  });

  it('renews what survives rather than letting it lapse quietly', () => {
    const state = newGame(config());
    const player = seat(state);
    takeMalice(state, player, 3);
    takeMalice(state, player, 4);
    for (const held of player.malices) expect(held.untilAge).toBe(4);
  });

  it('is the same deal from the same generator state', () => {
    const one = newGame(config());
    const two = newGame(config());
    expect(takeMalice(one, seat(one), 3)!.id).toBe(takeMalice(two, seat(two), 3)!.id);
  });
});

// --- 5. the term ------------------------------------------------------------

describe('the term', () => {
  it('leaves the chair at the next judgement when that age’s bar is kept', () => {
    const state = newGame(config());
    const player = seat(state);
    seatNamed(state, player, 'leanYears', 3);
    // No mark on the seat: this age's stake was kept, so the debt is worked off.
    seatPendingMalices(state, 3);
    expect(player.malices).toEqual([]);
    expect(maliceAt(player, 0)).toBeNull();
  });

  it('stays, renewed, when the next bar is missed too — and a new one joins it', () => {
    const state = newGame(config());
    const player = seat(state);
    seatNamed(state, player, 'leanYears', 3);
    player.pendingMalices.push({ age: 3, wager: 'academies' });
    seatPendingMalices(state, 3);
    expect(player.malices.map((held) => held.id)).toContain('leanYears');
    expect(player.malices).toHaveLength(2);
    // Both name the age after this judgement: the old one was re-stamped rather
    // than left naming an age already gone.
    expect(player.malices.map((held) => held.untilAge)).toEqual([4, 4]);
    // The mark is spent as it is paid.
    expect(player.pendingMalices).toEqual([]);
  });

  it('is a comparison and never a countdown — an older term sheds too', () => {
    const state = newGame(config());
    const player = seat(state);
    seatNamed(state, player, 'leanYears', 2);
    expect(shedMalices(state, player, 4)).toEqual(['leanYears']);
    expect(player.malices).toEqual([]);
  });
});

// --- 6. adoption ------------------------------------------------------------

describe('an adoption', () => {
  it('amnesties every Order and re-seats the malice into the new spread', () => {
    const state = newGame(config());
    const player = seat(state);
    govern(state, player, 'chiefdom');
    seatNamed(state, player, 'thinRanks');
    expect(player.malices[0]!.chair).toBe(slotTypesOf(player.statecraft).indexOf('military'));

    // What `adoptGovernmentAt` does to the array, and then the re-seating.
    govern(state, player, 'theSultanate');
    reseatMalices(player);
    const layout = slotTypesOf(player.statecraft);
    expect(player.malices[0]!.chair).toBe(layout.lastIndexOf('military'));
    expect(maliceAt(player, layout.lastIndexOf('military'))).toBe('thinRanks');
  });

  it('re-seats two malices into two chairs, never one', () => {
    const state = newGame(config());
    const player = seat(state);
    govern(state, player, 'chiefdom');
    seatNamed(state, player, 'thinRanks');
    seatNamed(state, player, 'deserters');
    govern(state, player, 'councilOfElders');
    reseatMalices(player);
    const chairs = player.malices.map((held) => held.chair);
    expect(new Set(chairs).size).toBe(2);
    // No military chair in the council, so both fall to the wildcards.
    for (const chair of chairs) {
      expect(slotTypesOf(player.statecraft)[chair!]).toBe('wildcard');
    }
  });
});

// --- 7. the effect ----------------------------------------------------------

describe('the card in the chair', () => {
  it('pays its line, credited to itself by name', () => {
    const state = newGame(config());
    const player = seat(state);
    found(state, player);
    const before = readEmpire(state, player.id).totals.food;
    seatNamed(state, player, 'leanYears');
    const after = readEmpire(state, player.id).totals.food;
    expect(after).toBe(before - 1);

    const line = liveEffects(state, player.id).find((one) => one.card === 'leanYears');
    expect(line?.source).toBe('Malice · The Lean Years');
  });

  it('stops paying the turn it leaves the chair', () => {
    const state = newGame(config());
    const player = seat(state);
    found(state, player);
    const before = readEmpire(state, player.id).totals.food;
    seatNamed(state, player, 'leanYears', 3);
    seatPendingMalices(state, 3);
    expect(readEmpire(state, player.id).totals.food).toBe(before);
  });
});

// --- 8. the judgement, end to end -------------------------------------------

describe('the judgement seats the deck', () => {
  it('turns every mark it writes into a card in a chair, and clears the marks', () => {
    const state = newGame(config());
    const player = seat(state);
    // The deal itself is `wagers.test.ts`' business; what this asks is that the
    // second beat spends what the first wrote, even for a mark a save from
    // before this batch left behind.
    player.pendingMalices.push({ age: 2, wager: 'academies' });
    const seated = seatPendingMalices(state, 2);
    expect(seated).toHaveLength(1);
    expect(seated[0]!.playerId).toBe(player.id);
    expect(player.pendingMalices).toEqual([]);
    expect(player.malices).toHaveLength(1);
    expect(player.malices[0]!.untilAge).toBe(3);
  });

  it('judges an age with no table at all without touching anybody', () => {
    const state = newGame(config());
    const before = JSON.stringify(state);
    expect(judgeWagers(state, 2)).toEqual([]);
    expect(JSON.stringify(state)).toBe(before);
  });
});
