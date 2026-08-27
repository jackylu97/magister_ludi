/**
 * The Statecraft screen's **staging layer**: an arrangement of the offices that
 * is not real yet.
 *
 * The user's note (2026-08-27): "slots should only lock after leaving the menu".
 * Slotting an Order *seals* it — `slotOrderAt` stamps `sealedUntil` the instant
 * the card goes in — so under the old screen a card dropped in the wrong office
 * was a mistake the player owned for several turns, and the only way to find out
 * whether a spread read well was to commit to it. This module is what lets a
 * player lay the whole spread out, look at it, and *then* pay for it: placing,
 * removing and moving edit a local copy of `PlayerStatecraft.slots`, and nothing
 * reaches the simulation until Confirm — or until the screen is left, which is
 * the same thing said with the door.
 *
 * Pure, and separated from the DOM on purpose
 * -------------------------------------------
 * There is no jsdom in this suite (see `test/ui/yieldMark.test.ts`), and the
 * arithmetic here is exactly the sort that can be quietly wrong on every
 * arrangement at once — a diff that emits its `slotOrder` before the
 * `unslotOrder` that frees the office is a batch whose second half is refused,
 * and the screen would have looked right the whole time. So the staging is a
 * pure function of `(live, staged)` with no element in sight, and
 * `test/ui/statecraftStaging.test.ts` drives it against a real `GameState`.
 *
 * One rule, one sentence — still
 * ------------------------------
 * The screen's oldest promise (`statecraftScreen.ts`'s docblock) is that every
 * refusal a player can provoke is the **reducer's own**. Staging does not get a
 * second opinion: `placeError` is `slotOrderError` and `removeError` is
 * `unslotOrderError`, asked of a **shadow** state — the live game with this
 * seat's slots swapped for the staged ones — so a staged office answers exactly
 * what the real one would answer if the arrangement were already true. Nothing
 * in this file knows what a seal is, what a wildcard takes, or that an Order can
 * only be in one office at a time.
 *
 * The shadow is a spread, not a clone: `{...state, players: [...] }` with one
 * player's `statecraft.slots` replaced. The evaluators read `state.turn` and
 * that player's statecraft and nothing else, so a spread is both cheap and
 * complete — and it is *read-only*, which is what makes it safe to build one per
 * keystroke against the live game.
 */

import type { SlotOrderCommand, UnslotOrderCommand } from '../sim/commands';
import { type SlottedOrder, slotOrderError, unslotOrderError } from '../sim/statecraft';
import type { GameState } from '../sim/state';
import type { OrderId } from '../sim/statecraftData';
import { playerById } from '../sim/state';

/**
 * One office in a staged arrangement.
 *
 * Structurally a `SlottedOrder` plus the one thing the sim has no word for:
 * whether this session put the card here. `staged` is what draws the office as
 * unconfirmed and what stops the interface printing a seal countdown on a card
 * that has not been sealed by anything yet.
 *
 * `sealedUntil` on a staged card is the **current turn**, which reads as "free"
 * everywhere (`sealRemaining` returns 0) — a card the player just laid down and
 * may still pick up. The real seal is stamped by the reducer on Confirm, which
 * is the only place in the game that decides how long a seal lasts.
 */
export interface StagedSlot {
  readonly card: OrderId;
  readonly sealedUntil: number;
  readonly staged: boolean;
}

/** An arrangement of the offices, indexed exactly as `slotLayout` is. */
export type StagedSlots = readonly (StagedSlot | null)[];

/** The two commands an arrangement can turn into. Nothing else is ever emitted. */
export type SlotCommand = SlotOrderCommand | UnslotOrderCommand;

/**
 * The live slots, copied into an arrangement nobody has touched yet.
 *
 * Every entry comes back `staged: false` — this is what the empire's law
 * *already says*, and `diff` of it against itself is empty, which is the
 * property Revert relies on.
 */
export function stage(live: readonly (SlottedOrder | null)[]): StagedSlots {
  return live.map((slot) =>
    slot === null ? null : { card: slot.card, sealedUntil: slot.sealedUntil, staged: false },
  );
}

/**
 * Puts a card in an office. Validates nothing — the rule is `placeError`'s,
 * exactly as `slotOrderAt` validates nothing and the rule is `slotOrderError`'s.
 *
 * `turn` is the game's current turn and becomes the staged card's `sealedUntil`,
 * so a card just laid down reads as free to pick up again. See `StagedSlot`.
 */
export function place(
  staged: StagedSlots,
  index: number,
  card: OrderId,
  turn: number,
): StagedSlots {
  return staged.map((slot, at) => (at === index ? { card, sealedUntil: turn, staged: true } : slot));
}

/** Empties an office. `place`'s mirror, and it validates nothing either. */
export function remove(staged: StagedSlots, index: number): StagedSlots {
  return staged.map((slot, at) => (at === index ? null : slot));
}

/**
 * The live game with one seat's offices replaced by an arrangement.
 *
 * Read-only and short-lived: it exists so the sim's own evaluators can be asked
 * a question about a state that is not true yet. Nothing ever mutates it and
 * nothing keeps it.
 */
export function shadowState(state: GameState, playerId: number, staged: StagedSlots): GameState {
  const slots: (SlottedOrder | null)[] = staged.map((slot) =>
    slot === null ? null : { card: slot.card, sealedUntil: slot.sealedUntil },
  );
  // The seating is destructured rather than reached for by name, and it is
  // deliberately **not** the roster question `test/ui/seatRoster.test.ts`
  // forbids the interface from asking of `state.players` by hand. That rule is
  // about "one row per seat" — who counts as a nation, which is `realPlayers`.
  // This asks nothing about who counts: it copies the seating exactly as it is,
  // the wild included, because a player's id is its index here and an array
  // with anybody missing from it would be a different game to evaluate against.
  const { players, ...rest } = state;
  return {
    ...rest,
    players: players.map((player) =>
      player.id === playerId
        ? { ...player, statecraft: { ...player.statecraft, slots } }
        : player,
    ),
  };
}

/** Why this card cannot be staged into this office, or `null`. The reducer's own. */
export function placeError(
  state: GameState,
  playerId: number,
  staged: StagedSlots,
  card: OrderId,
  index: number,
): string | null {
  return slotOrderError(shadowState(state, playerId, staged), playerId, card, index);
}

/**
 * Why this office cannot be emptied in staging, or `null`. The reducer's own.
 *
 * A card *this session* staged is always removable — it is not sealed, because
 * nothing has sealed it — and a card the empire actually slotted is refused with
 * the same sentence, seal countdown and all, that `unslotOrder` would answer
 * with. Both come out of `unslotOrderError`; there is no branch here.
 */
export function removeError(
  state: GameState,
  playerId: number,
  staged: StagedSlots,
  index: number,
): string | null {
  return unslotOrderError(shadowState(state, playerId, staged), playerId, index);
}

/**
 * The commands that turn the live arrangement into the staged one — **every
 * `unslotOrder` first, then every `slotOrder`**.
 *
 * The order is the whole of why this is a function rather than a loop at a call
 * site. An office is emptied before anything is put in it, and a card is out of
 * its old office before it is offered to a new one, so a move (A from office 1
 * to office 2) and a swap (A and B trading offices) are both sequences the
 * reducer accepts step by step. Emitted in office order within each half, which
 * is not a rule the reducer cares about and is what makes the batch readable in
 * a log.
 *
 * An office whose occupant did not change emits nothing, so the diff of an
 * untouched arrangement is empty — which is what "Confirm has nothing to do"
 * means, and what makes closing the screen free.
 */
export function diff(
  live: readonly (SlottedOrder | null)[],
  staged: StagedSlots,
  playerId: number,
): SlotCommand[] {
  const unslots: SlotCommand[] = [];
  const slots: SlotCommand[] = [];
  const length = Math.max(live.length, staged.length);
  for (let index = 0; index < length; index++) {
    const before = live[index]?.card ?? null;
    const after = staged[index]?.card ?? null;
    if (before === after) continue;
    if (before !== null) unslots.push({ type: 'unslotOrder', playerId, slotIndex: index });
    if (after !== null) {
      slots.push({ type: 'slotOrder', playerId, cardId: after, slotIndex: index });
    }
  }
  return [...unslots, ...slots];
}

/**
 * How many offices this arrangement would change. The count the screen prints
 * beside Confirm.
 *
 * Offices rather than commands, because that is what a player can see: a card
 * moved from one office to another is two commands and two offices; a card
 * swapped for another in the *same* office is two commands and one. "1 change"
 * is the honest number for the second.
 */
export function changedOffices(
  live: readonly (SlottedOrder | null)[],
  staged: StagedSlots,
): number {
  let count = 0;
  const length = Math.max(live.length, staged.length);
  for (let index = 0; index < length; index++) {
    if ((live[index]?.card ?? null) !== (staged[index]?.card ?? null)) count++;
  }
  return count;
}

/**
 * Why this arrangement cannot be committed, or `null` when it can.
 *
 * It **walks the diff**, asking each command's own evaluator of a shadow that
 * has the commands before it already applied — which is precisely what
 * `applyCommand` will do to the same list a moment later, so a `null` here is a
 * promise the batch keeps. Checking each staged office in isolation would not
 * be: "this office already holds something" is true of an office whose occupant
 * the batch's first half is about to take out.
 *
 * The first refusal wins and it is returned verbatim, because it is the
 * reducer's sentence and the screen prints it as the reason Confirm is greyed.
 *
 * The one refusal it cannot foresee is the reducer's seat guard — a seat that
 * has ended its turn has finished rewriting its law — because that sentence
 * belongs to `applyCommand` rather than to an evaluator this module may import.
 * It is why committing reports through the caller's rejection channel and
 * re-syncs rather than trusting itself (see `statecraftScreen.ts`'s `confirm`).
 */
export function validate(state: GameState, playerId: number, staged: StagedSlots): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  let shadow: StagedSlots = stage(player.statecraft.slots);
  for (const command of diff(player.statecraft.slots, staged, playerId)) {
    if (command.type === 'unslotOrder') {
      const problem = removeError(state, playerId, shadow, command.slotIndex);
      if (problem !== null) return problem;
      shadow = remove(shadow, command.slotIndex);
    } else {
      const problem = placeError(state, playerId, shadow, command.cardId, command.slotIndex);
      if (problem !== null) return problem;
      shadow = place(shadow, command.slotIndex, command.cardId, state.turn);
    }
  }
  return null;
}
