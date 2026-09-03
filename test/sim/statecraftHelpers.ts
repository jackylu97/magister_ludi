/**
 * The two lines `statecraft.test.ts` and `statecraft.slow.test.ts` both open
 * with.
 *
 * The concern's two long replays — sixty turns of slotting and unslotting, and
 * forty turns of reaching a draft the honest way — are slow-tier by shape and
 * live in the sibling file. They start from the same duel game and found a city
 * the same way as every other test here, so the fixture lives in a plain module:
 * importing a `.test.ts` from a `.test.ts` re-registers its tests and the suite
 * would count them twice.
 */
import { foundCityAt } from '../../src/sim/cities';
import { createGame, dispatch } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import type { GameState } from '../../src/sim/state';
import { ABILITY_TECH } from '../../src/sim/techData';

export function game(seed = 7) {
  const made = createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  // The two seats are at war from the first turn (schema 56). Several files
  // sharing this bench ask what a card, a legacy or a Triumph is worth *in a
  // fight*, and since the war ruling a blow between two empires at peace is
  // refused before a strength is folded.
  //
  // **Dispatched, not written.** This bench is handed to tests that replay
  // `{config, log}` and compare snapshots (`guilds.test.ts`), so a war written
  // straight into the register would be a fact the log does not carry and the
  // replay would part company with the game on the first byte. A declaration
  // rolls no dice, so it costs the seeded world nothing.
  dispatch(made, { type: 'declareWar', playerId: 0, targetId: 1 });
  return made;
}

/**
 * Puts the **ancestor rites** in every seat's hand — the gate a great-person
 * offer opens behind since the tree pass of 2026-08-30.
 *
 * Renown gathers from turn one and nobody answers it until an empire has
 * researched Ancestor Rites, so any test that is about what renown is *worth*,
 * what a legacy pays or what a Triumph mints has to get past the gate first.
 * The gate itself has its own test in `renown.test.ts`.
 *
 * Written directly onto the seat rather than through a command, exactly as the
 * other fixtures here reach for `foundCityAt`: it is scenery, not the subject.
 * It is therefore **not** for a test that replays a log — grant the technology
 * inside the log for those.
 *
 * Read through `ABILITY_TECH` so that moving the gate to another node moves this
 * with it, and never leaves it naming a technology that opens nothing.
 */
export function keepTheRites(state: GameState): void {
  const gate = ABILITY_TECH.get('ancestorRites');
  if (gate === undefined) return;
  for (const player of state.players) {
    if (!player.techsResearched.includes(gate)) player.techsResearched.push(gate);
  }
}

export function found(state: GameState, playerId: number) {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}
