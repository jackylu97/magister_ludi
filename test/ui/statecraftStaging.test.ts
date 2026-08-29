/**
 * The Statecraft screen's staging layer, which is the one part of that screen
 * that can be quietly wrong on every arrangement at once.
 *
 * There is no jsdom in this suite (see `test/ui/yieldMark.test.ts`), which is
 * exactly why `statecraftStaging.ts` is a module rather than a handful of
 * closures inside the screen: the interesting claims here are arithmetic, not
 * markup. Three of them, and each has a failure that looks fine on screen:
 *
 *   · **The diff's order.** Every `unslotOrder` before every `slotOrder`. A
 *     batch that slots first is a batch whose second half the reducer refuses,
 *     and the screen would have looked right the whole time it was building it.
 *   · **The refusals are the reducer's.** `placeError`/`removeError` *are*
 *     `slotOrderError`/`unslotOrderError` asked of the arrangement, so a staged
 *     office answers what the real one would answer if it were already true.
 *   · **The round trip.** Applying the diff to a real `GameState` produces
 *     exactly the arrangement the player was looking at — which is the whole
 *     promise Confirm makes.
 */

import { describe, expect, it } from 'vitest';

import type { Command } from '../../src/sim/commands';
import { dispatch } from '../../src/sim/game';
import type { GameState } from '../../src/sim/state';
import type { OrderId } from '../../src/sim/statecraftData';
import { slotLayout } from '../../src/sim/statecraftData';
import { sealRemaining } from '../../src/sim/statecraft';
import {
  type StagedSlots,
  changedOffices,
  diff,
  place,
  placeError,
  remove,
  removeError,
  stage,
  validate,
} from '../../src/ui/statecraftStaging';
import { game } from '../sim/statecraftHelpers';

/** Puts a card in the collection, as a draft would have. `statecraft.test.ts`'s. */
function grant(state: GameState, playerId: number, id: OrderId, level = 1): void {
  state.players[playerId]!.statecraft.orders.push({ id, level });
}

/**
 * Seats the empire under a government carrying **two wildcard offices**.
 *
 * The chiefdom has typed offices and one wildcard, so nothing a player holds can
 * move between two of them, and "a move produces unslot then slot" is not a
 * sentence that can be said about it. Set directly rather than adopted, because
 * adoption also draws a Doctrine offer out of the rng and this is a fixture, not
 * a chapter break.
 */
function seatPriestKing(state: GameState, playerId: number): void {
  const sc = state.players[playerId]!.statecraft;
  sc.government = 'priestKing';
  sc.slots = slotLayout('priestKing').map(() => null);
}

/**
 * The **wildcard** offices of the fixture's government, by index — derived
 * rather than written down.
 *
 * These were the literals 2 and 3 until the master-list cut of 2026-08-28 gave
 * every government a new triple and the Priest-King's spread moved under them
 * (1/1/2 → 1/2/2), which shifted both wildcards by one and broke four tests that
 * were about staging rather than about the table. What these tests need is "two
 * offices that take either card", so they ask the layout for them.
 */
const WILD: number[] = slotLayout('priestKing')
  .map((type, index) => (type === 'wildcard' ? index : -1))
  .filter((index) => index >= 0);

/** An empty arrangement of the fixture's shape — what `occupants` compares to. */
function emptySlots(): (OrderId | null)[] {
  return slotLayout('priestKing').map(() => null);
}

/** The live slots of one seat. What every function here is a diff against. */
function live(state: GameState, playerId = 0) {
  return state.players[playerId]!.statecraft.slots;
}

/** The cards in an arrangement, by office. The shape every assertion compares. */
function occupants(slots: StagedSlots | ReturnType<typeof live>): (OrderId | null)[] {
  return slots.map((slot) => slot?.card ?? null);
}

describe('staging an arrangement', () => {
  it('starts as a copy of the law, and a copy of the law is no change at all', () => {
    const g = game();
    seatPriestKing(g.state, 0);
    grant(g.state, 0, 'bloodedSpears');
    dispatch(g, { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: 0 } as Command);

    const staged = stage(live(g.state));
    expect(occupants(staged)).toEqual(occupants(live(g.state)));
    // The property Revert and "closing a screen you only read" both rely on.
    expect(diff(live(g.state), staged, 0)).toEqual([]);
    expect(changedOffices(live(g.state), staged)).toBe(0);
    expect(validate(g.state, 0, staged)).toBeNull();
    // Nothing this session put there — a staged card is the only thing that is
    // "unconfirmed", and a freshly taken copy contains none.
    expect(staged.every((slot) => slot === null || !slot.staged)).toBe(true);
  });

  it('empties and fills offices without touching the game', () => {
    const g = game();
    seatPriestKing(g.state, 0);
    grant(g.state, 0, 'bloodedSpears');
    const before = occupants(live(g.state));

    let staged = stage(live(g.state));
    staged = place(staged, WILD[0]!, 'bloodedSpears', g.state.turn);
    const filled = emptySlots();
    filled[WILD[0]!] = 'bloodedSpears';
    expect(occupants(staged)).toEqual(filled);
    expect(staged[WILD[0]!]!.staged).toBe(true);
    // The law has not heard about any of it.
    expect(occupants(live(g.state))).toEqual(before);

    staged = remove(staged, WILD[0]!);
    expect(occupants(staged)).toEqual(before);
    expect(diff(live(g.state), staged, 0)).toEqual([]);
  });
});

describe('the diff', () => {
  it('moves a card between offices as unslot then slot, in that order', () => {
    const g = game();
    seatPriestKing(g.state, 0);
    grant(g.state, 0, 'bloodedSpears');
    dispatch(g, { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: 0 } as Command);
    // The seal has to be off before a card may leave — that is the sim's rule
    // and staging does not get a second opinion about it.
    g.state.turn = live(g.state)[0]!.sealedUntil;

    let staged = stage(live(g.state));
    staged = remove(staged, 0);
    staged = place(staged, WILD[0]!, 'bloodedSpears', g.state.turn);

    expect(diff(live(g.state), staged, 0)).toEqual([
      { type: 'unslotOrder', playerId: 0, slotIndex: 0 },
      { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: WILD[0]! },
    ]);
    // Two offices changed, which is what the screen prints beside Confirm.
    expect(changedOffices(live(g.state), staged)).toBe(2);
  });

  it('puts every unslot before every slot, even when they interleave by office', () => {
    const g = game();
    seatPriestKing(g.state, 0);
    grant(g.state, 0, 'bloodedSpears');
    grant(g.state, 0, 'firstRites');
    // Both in wildcard offices, which is what makes a swap sayable: a wildcard
    // office takes either card, so the only thing that can refuse the batch is
    // the order it is sent in.
    dispatch(g, { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: WILD[0]! } as Command);
    dispatch(g, { type: 'slotOrder', playerId: 0, cardId: 'firstRites', slotIndex: WILD[1]! } as Command);
    g.state.turn = live(g.state)[WILD[0]!]!.sealedUntil;

    // The swap: each card into the other's office. Emitted office-first this
    // would be slot-into-an-occupied-office on the very first command.
    let staged = stage(live(g.state));
    staged = remove(staged, WILD[0]!);
    staged = remove(staged, WILD[1]!);
    staged = place(staged, WILD[1]!, 'bloodedSpears', g.state.turn);
    staged = place(staged, WILD[0]!, 'firstRites', g.state.turn);

    const commands = diff(live(g.state), staged, 0);
    expect(commands.map((command) => command.type)).toEqual([
      'unslotOrder',
      'unslotOrder',
      'slotOrder',
      'slotOrder',
    ]);
    // …and it is a batch the simulation actually takes, in that order.
    expect(validate(g.state, 0, staged)).toBeNull();
  });

  it('is empty for an arrangement nobody touched', () => {
    const g = game();
    seatPriestKing(g.state, 0);
    grant(g.state, 0, 'bloodedSpears');
    dispatch(g, { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: 0 } as Command);
    expect(diff(live(g.state), stage(live(g.state)), 0)).toEqual([]);
  });
});

describe('the refusals are the reducer’s own', () => {
  it('refuses to empty a sealed office, with the sentence and the count', () => {
    const g = game();
    seatPriestKing(g.state, 0);
    grant(g.state, 0, 'bloodedSpears');
    dispatch(g, { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: 0 } as Command);
    expect(sealRemaining(g.state, live(g.state)[0])).toBeGreaterThan(0);

    const staged = stage(live(g.state));
    const problem = removeError(g.state, 0, staged, 0);
    expect(problem).toContain('Blooded Spears is sealed for');
    // And an arrangement that emptied it anyway — a stale screen, a seal that
    // was free a moment ago — is refused with that same sentence rather than
    // being sent and bounced.
    expect(validate(g.state, 0, remove(staged, 0))).toBe(problem);
  });

  it('refuses a card in the wrong kind of office, in the reducer’s words', () => {
    const g = game();
    grant(g.state, 0, 'firstRites');
    // The chiefdom is [military, economic] and First Rites is a wildcard card.
    const staged = stage(live(g.state));
    expect(placeError(g.state, 0, staged, 'firstRites', 0)).toBe(
      'First Rites is wildcard and slot 1 is military',
    );
    // Staged past the guard anyway, `validate` is the same sentence again.
    expect(validate(g.state, 0, place(staged, 0, 'firstRites', g.state.turn))).toBe(
      'First Rites is wildcard and slot 1 is military',
    );
  });

  it('refuses the same Order twice, and an office that is already occupied', () => {
    const g = game();
    seatPriestKing(g.state, 0);
    grant(g.state, 0, 'bloodedSpears');
    grant(g.state, 0, 'firstRites');
    const staged = place(stage(live(g.state)), WILD[0]!, 'bloodedSpears', g.state.turn);
    // A card staged into one office cannot be staged into a second — the
    // reducer's rule, read off the arrangement rather than off the law.
    expect(placeError(g.state, 0, staged, 'bloodedSpears', WILD[1]!)).toContain('already slotted');
    // And a staged office is occupied, exactly as a slotted one is.
    expect(placeError(g.state, 0, staged, 'firstRites', WILD[0]!)).toContain('already holds');
  });

  it('asks about the arrangement, not the law: an office emptied in staging takes a card', () => {
    const g = game();
    seatPriestKing(g.state, 0);
    grant(g.state, 0, 'bloodedSpears');
    grant(g.state, 0, 'firstRites');
    dispatch(g, { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: WILD[0]! } as Command);
    g.state.turn = live(g.state)[WILD[0]!]!.sealedUntil;

    const staged = stage(live(g.state));
    // The live office holds Blooded Spears, so the live rule refuses…
    expect(placeError(g.state, 0, staged, 'firstRites', WILD[0]!)).toContain('already holds');
    // …and the staged one, emptied a click ago, does not.
    expect(placeError(g.state, 0, remove(staged, WILD[0]!), 'firstRites', WILD[0]!)).toBeNull();
  });
});

describe('confirming', () => {
  it('applies to exactly the arrangement the player was looking at', () => {
    const g = game();
    seatPriestKing(g.state, 0);
    grant(g.state, 0, 'bloodedSpears');
    grant(g.state, 0, 'firstRites');
    grant(g.state, 0, 'campFollowers');
    dispatch(g, { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: 0 } as Command);
    g.state.turn = live(g.state)[0]!.sealedUntil;

    // One card moved, one taken out of the collection into a wildcard office.
    let staged = stage(live(g.state));
    staged = remove(staged, 0);
    staged = place(staged, WILD[1]!, 'bloodedSpears', g.state.turn);
    staged = place(staged, WILD[0]!, 'firstRites', g.state.turn);
    const wanted = occupants(staged);

    expect(validate(g.state, 0, staged)).toBeNull();
    for (const command of diff(live(g.state), staged, 0)) {
      expect(dispatch(g, command as Command).ok).toBe(true);
    }
    expect(occupants(live(g.state))).toEqual(wanted);
    // And the seals are the reducer's, stamped on the way in — staging never
    // decided how long one lasts.
    expect(sealRemaining(g.state, live(g.state)[WILD[1]!])).toBeGreaterThan(0);
    // The arrangement is now the law, so re-staging it is a no-op.
    expect(diff(live(g.state), stage(live(g.state)), 0)).toEqual([]);
  });

  it('leaves the game untouched when nothing was staged', () => {
    const g = game();
    seatPriestKing(g.state, 0);
    grant(g.state, 0, 'bloodedSpears');
    const before = occupants(live(g.state));
    const staged = stage(live(g.state));
    expect(diff(live(g.state), staged, 0)).toEqual([]);
    expect(occupants(live(g.state))).toEqual(before);
  });
});
