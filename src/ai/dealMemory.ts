/**
 * **The paper remembers** — what a rival refused, and until when (batch X4).
 *
 * `bot.ts`' creed is that a seat is a pure function of the board, and that creed
 * is what wrote the deal loop: `swapDecision` is a pure reading, a `declineDeal`
 * changes no tile and no purse, so a swap the rival sent back on turn 41 is
 * written again on turn 42, and on turn 43, for the rest of the game. The audit
 * measured **92 proposals, 91 declines, four distinct papers, one sent 37 times,
 * zero deals** — fifteen per cent of a seat's whole command budget spent
 * re-sending a sentence that had already been answered
 * (`docs/audit/bot-pass-2.md`, finding 2).
 *
 * The ruling (`docs/flags.md` (ggg), 2026-09-08) says where the memory goes and
 * what it may key on:
 *
 *   · **the harness's, never the state's.** A refusal is not a fact about the
 *     world — nothing in a save can see it, no rule reads it, and a networked
 *     peer replaying the log must reach the same board without it. So there is
 *     **no schema**: the memory hangs off the live state object in a `WeakMap`,
 *     which is the identity of *a game in play* rather than of a game;
 *   · **keyed on the paper's own JSON and a fingerprint of the rival's
 *     holdings** — what they hold that the paper actually asks after: the copies
 *     of every seam named on either side (net copies, so a lent one counts as
 *     `resourceCopies` counts it), and whether their books could pay the coin
 *     the paper asks *of them*. When that fingerprint moves, the board that
 *     priced the paper has moved and the refusal says nothing about the new one;
 *   · **and forgotten after `ai.war.refusalMemoryTurns`**, an absolute turn
 *     stamp compared against `state.turn` in the reading — nothing ticks, the
 *     same discipline `TimedEffect` keeps one system over.
 *
 * **A save loaded mid-game forgets, and that is accepted.** `loadGame` replays
 * the log into a *new* state object, so the `WeakMap` finds nothing and the
 * seat writes its paper once more; the rival sends it back once more, and the
 * memory is closed again from there. One re-send is the price of keeping this
 * out of the save file, and it was the ruling's own trade.
 *
 * **Why a `WeakMap` on the state and not a field on the harness.** The two
 * harnesses that drive seats are `driveSeat` (`driver.ts`) and the stepper's
 * per-game closure (`stepper.ts`), and `test/sim/aiDecision.slow.test.ts` pins
 * that they play the same game byte for byte. A memory held privately by either
 * would be a fifth piece of per-seat state to carry across that seam and a fifth
 * way for the two to drift; a memory that lives on the object *both* of them
 * hold — and that `swapDecision` is already handed — cannot drift, and needs no
 * plumbing through the policy's signatures. The state is never written to.
 */

import { hasResource, resourceCopies } from '../sim/cities';
import type { Command } from '../sim/commands';
import { type DealTerms, proposalById } from '../sim/deals';
import type { GameState } from '../sim/state';
import { playerById } from '../sim/state';
import { foldEmpireRates } from '../sim/yields/empire';

/** One paper, refused, on a board the fingerprint describes. */
interface RefusalRecord {
  /** Who wrote the paper. */
  by: number;
  /** Who sent it back. */
  to: number;
  /** The paper's own JSON, both sides, normalised (`termsKey`). */
  paper: string;
  /** The same paper with the coin lines taken out — see `sweetened`. */
  substance: string;
  /** True when the writer's side carried coin: this was already a sweetened paper. */
  sweetened: boolean;
  /** What the refuser held that the paper asks after (`holdingsKey`). */
  holdings: string;
  /** `state.turn` when the refusal landed. Absolute; nothing ticks. */
  turn: number;
}

/** A pending refusal, read off the register **before** the decline is dispatched. */
export interface PendingRefusal {
  record: RefusalRecord;
}

/**
 * What the memory says about one paper, from the writer's side.
 *
 * Two readings rather than one because the seat does two different things with
 * them: a refused *straight* paper is answered by sweetening it once, and a
 * refused *sweetened* one closes the pair — the seat has now written both the
 * papers it knows how to write, and the board has to move before a third is
 * worth the ink.
 */
export interface RefusalReading {
  /** The turn this exact paper was sent back, or `null`. */
  refusedTurn: number | null;
  /** The turn a paper of the same substance **carrying coin** was sent back, or `null`. */
  sweetenedTurn: number | null;
}

const MEMORIES = new WeakMap<GameState, RefusalRecord[]>();

/**
 * A half of a paper as a key: presence-is-state flattened to a total shape, and
 * the two lists sorted.
 *
 * Sorted because "amber and silk" and "silk and amber" are the same paper, and
 * a memory that told them apart would be a memory the seat could walk around by
 * writing its luxuries in the other order.
 */
function termsKey(terms: DealTerms): string {
  return JSON.stringify({
    gold: terms.gold ?? 0,
    goldPerTurn: terms.goldPerTurn ?? 0,
    luxuries: [...(terms.luxuries ?? [])].sort(),
    openBorders: terms.openBorders === true,
    cities: [...(terms.cities ?? [])].sort((a, b) => a - b),
  });
}

/** The paper, both sides, in the writer's own orientation: what they give, what they ask. */
function paperKey(give: DealTerms, take: DealTerms): string {
  return `${termsKey(give)}»${termsKey(take)}`;
}

/**
 * The same paper with **both** coin lines struck out.
 *
 * This is what makes "sweetened once" a promise rather than a hope. A counter's
 * coin is `counterTerms`' arithmetic over two empires' books, and those books
 * move every turn — so keyed on its exact JSON, a sweetened paper worth 12 coin
 * this turn and 13 the next would be two different papers and the seat would
 * sweeten for ever, which is the loop again wearing a hat. The *substance* is
 * the swap itself, and the seat writes at most one coined version of it.
 */
function substanceKey(give: DealTerms, take: DealTerms): string {
  const bare = (terms: DealTerms): DealTerms => ({ ...terms, gold: 0, goldPerTurn: 0 });
  return paperKey(bare(give), bare(take));
}

/** Did the writer's side carry coin? Then the paper was already a sweetened one. */
function carriesCoin(give: DealTerms): boolean {
  return (give.gold ?? 0) > 0 || (give.goldPerTurn ?? 0) > 0;
}

/**
 * **What the refuser held that the paper asks after** — the ruling's fingerprint.
 *
 * Only what the paper names, and only from the refuser's side, because that is
 * the whole of what "the board that priced this paper" means. Three readings:
 *
 *   · every seam named on either side, at the refuser's **net** copies
 *     (`resourceCopies` — tiles, less what is promised elsewhere, plus what
 *     somebody lent them) and whether they can name it at all. A rival who
 *     strikes a second vein of the kind we asked for is a rival worth asking
 *     again;
 *   · the coin the paper asks **of them**, as *can they pay it* rather than as
 *     a figure — a treasury that moves by three coin a turn would expire the
 *     memory every turn, and the only thing about their purse that can change
 *     the answer is whether the sum is in it;
 *   · a town the paper asks for, at whoever holds it now.
 *
 * The writer's own holdings are deliberately absent: when *those* move the paper
 * itself changes, and a different paper is a different key.
 */
function holdingsKey(state: GameState, refuserId: number, give: DealTerms, take: DealTerms): string {
  const parts: string[] = [];
  const named = [...new Set([...(give.luxuries ?? []), ...(take.luxuries ?? [])])].sort();
  for (const id of named) {
    parts.push(`${id}=${resourceCopies(state, refuserId, id)}${hasResource(state, refuserId, id) ? '+' : '-'}`);
  }
  const coin = take.gold ?? 0;
  if (coin > 0) {
    parts.push(`coin:${(playerById(state, refuserId)?.gold ?? 0) >= coin ? 'enough' : 'short'}`);
  }
  const tribute = take.goldPerTurn ?? 0;
  if (tribute > 0) {
    const rate = foldEmpireRates(state, refuserId).goldPerTurn ?? 0;
    parts.push(`tribute:${rate >= tribute ? 'enough' : 'short'}`);
  }
  for (const cityId of [...(take.cities ?? [])].sort((a, b) => a - b)) {
    const owner = state.cities.find((city) => city.id === cityId)?.ownerId ?? -1;
    parts.push(`town${cityId}@${owner}`);
  }
  return parts.join('·');
}

/**
 * The refusal a `declineDeal` is about to make, read while the paper is still on
 * the table — or `null` when the command is not one.
 *
 * Read before the dispatch and banked after it, because `acceptDealAt` takes the
 * row off the register: after the command lands there is no paper left to
 * remember. The two halves are two calls at each harness's one dispatch seam
 * rather than a hook inside `dispatch`, which would put a bot's memory in the
 * road of every command a human sends.
 */
export function pendingDealRefusal(state: GameState, command: Command): PendingRefusal | null {
  if (command.type !== 'declineDeal') return null;
  const row = proposalById(state, command.dealId);
  if (row === undefined) return null;
  if (row.to !== command.playerId) return null;
  return {
    record: {
      by: row.by,
      to: row.to,
      paper: paperKey(row.give, row.take),
      substance: substanceKey(row.give, row.take),
      sweetened: carriesCoin(row.give),
      holdings: holdingsKey(state, row.to, row.give, row.take),
      turn: state.turn,
    },
  };
}

/**
 * Banks a refusal `pendingDealRefusal` read, once the decline was actually
 * accepted by the reducer.
 *
 * A paper already remembered is **replaced** rather than appended to: the seat
 * only ever wants the freshest turn a given paper was sent back on, and a list
 * that grew a row per re-send would be a list that outlived the game it is a
 * memory of.
 */
export function rememberDealRefusal(state: GameState, pending: PendingRefusal): void {
  const held = MEMORIES.get(state);
  const memory = held ?? [];
  if (held === undefined) MEMORIES.set(state, memory);
  const { record } = pending;
  const at = memory.findIndex(
    (row) => row.by === record.by && row.to === record.to && row.paper === record.paper,
  );
  if (at >= 0) memory[at] = record;
  else memory.push(record);
}

/**
 * What this seat remembers about writing this paper to this rival.
 *
 * A record answers only while all three of its keys still hold: the paper, the
 * fingerprint of what the rival holds, and the turns. `memoryTurns` is the
 * seat's own `ai.war.refusalMemoryTurns` — read from the sheet by the caller, so
 * a persona may remember longer than another and neither has to ask this module
 * about personas.
 */
export function readDealRefusal(
  state: GameState,
  by: number,
  to: number,
  give: DealTerms,
  take: DealTerms,
  memoryTurns: number,
): RefusalReading {
  const reading: RefusalReading = { refusedTurn: null, sweetenedTurn: null };
  const memory = MEMORIES.get(state);
  if (memory === undefined || memory.length === 0) return reading;
  const paper = paperKey(give, take);
  const substance = substanceKey(give, take);
  const holdings = holdingsKey(state, to, give, take);
  const lapse = Math.max(0, memoryTurns);
  for (const record of memory) {
    if (record.by !== by || record.to !== to) continue;
    if (record.holdings !== holdings) continue;
    if (state.turn - record.turn >= lapse) continue;
    if (record.paper === paper && record.turn > (reading.refusedTurn ?? -1)) {
      reading.refusedTurn = record.turn;
    }
    if (record.sweetened && record.substance === substance && record.turn > (reading.sweetenedTurn ?? -1)) {
      reading.sweetenedTurn = record.turn;
    }
  }
  return reading;
}

/** How many refusals this game is holding. For tests and a future profiler. */
export function dealMemorySize(state: GameState): number {
  return MEMORIES.get(state)?.length ?? 0;
}
