/**
 * **What this war has cost, and what it has taken** — the per-war exchange a
 * peace decision needs (the user, 2026-09-15: *"the ai should have some idea of
 * how many units it's lost to you vs how many it's killed, and factor that into
 * it's decision for peace"*; `docs/flags.md` (nnnnn), the addendum).
 *
 * Why this file exists
 * --------------------
 * The state carries the two counts already — `Player.unitsKilled` and
 * `Player.unitsLost`, written at the two seams in `applyCombat` where a piece
 * leaves the board — and it carries them as **lifetime** totals. `explainWarScore`
 * reads them that way and says so; a seat deciding whether to stop *this* war
 * wants the window since it started, and nothing on the board carries a
 * per-war count. The honest fix is a register in the simulation, which is a
 * schema decision nobody has taken (the same sentence `diplomacy.ts`' module
 * docblock has made since the warscore shipped).
 *
 * So the window is opened from this side instead, exactly the way the refusal
 * memory is (`dealMemory.ts`, ruling (ggg)):
 *
 *   · **the harness's memory, never the state's.** A baseline is not a fact
 *     about the world — nothing in a save can see it, no rule reads it, and a
 *     peer replaying the command log reaches the same board without it. It hangs
 *     off the live state object in a `WeakMap`, which is the identity of *a game
 *     in play* rather than of a game, so there is no schema and no migration;
 *   · **written by the reading.** The first time a seat looks at a war, the
 *     career counts of that moment become the war's zero. A seat looks at every
 *     war it is in on every one of its own turns (`peaceDecision` walks them
 *     all), so in a played game the zero is the declaration turn's — and the
 *     reading says which turn it actually is, because an honest window is one
 *     that names its own edge;
 *   · **a save loaded mid-war forgets**, and that is accepted for the reason the
 *     deal memory accepts it: the seat reads the exchange as even and decides
 *     from there, which is one turn's worth of amnesia rather than a wrong
 *     answer for ever.
 *
 * What it cannot see
 * ------------------
 * `unitsKilled`/`unitsLost` are counts against **all** empires, not against this
 * enemy, so a seat fighting two wars at once charges both of them for every
 * piece it loses. That is the warscore's own limitation ("in a two-empire war
 * they say very nearly the right thing; in a three-way they can credit a seat
 * for a town it took from somebody else") narrowed to a window, which is
 * strictly better than the career totals it replaces and still not a casualty
 * list. The wild is already excluded by the simulation's own counters — a seat
 * that loses a spearman to a raider is not thereby suing to anybody.
 *
 * The towns are derived and need no baseline at all: `City.capturedOn` is the
 * absolute turn a town last changed hands by force, so a town stamped on or
 * after the declaration and standing in one of the two empires' hands is a town
 * this war moved. A town taken from a third empire in the same window counts
 * too, which is the same three-way blur said once more.
 */

import type { City, GameState, Player } from '../sim/state';
import { warBetween } from '../sim/wars';

/** The career counts at the moment a seat first looked at a war. */
interface Baseline {
  killed: number;
  lost: number;
  /** `state.turn` when the window opened. Absolute; nothing ticks. */
  since: number;
}

/** What one war has cost and taken, since the window opened. */
export interface WarExchange {
  /** Pieces of theirs this empire has killed since then. */
  killed: number;
  /** Pieces of its own that have fallen since then. */
  lost: number;
  /** Towns this war has moved that stand in this empire's hands. */
  won: number;
  /** Towns this war has moved that stand in theirs. */
  given: number;
  /** The turn the window opened — the declaration's, in a game played through. */
  since: number;
}

const LEDGERS = new WeakMap<GameState, Map<string, Baseline>>();

/** One war, from one seat's side: the pair and the declaration it belongs to. */
function key(playerId: number, enemyId: number, declaredTurn: number): string {
  return `${playerId}v${enemyId}@${declaredTurn}`;
}

/**
 * The exchange of the war between these two, or `null` when there is no war.
 *
 * **The read opens the window.** A war nobody has looked at yet has its zero
 * taken now; every later reading measures from that same zero, because the row
 * is keyed by the declaration's own turn — so a second war between the same two
 * empires is a new row and a new window rather than a continuation of the first.
 */
export function readWarExchange(state: GameState, player: Player, enemy: Player): WarExchange | null {
  const war = warBetween(state, player.id, enemy.id);
  if (war === undefined) return null;
  const held = LEDGERS.get(state);
  const ledger = held ?? new Map<string, Baseline>();
  if (held === undefined) LEDGERS.set(state, ledger);
  const at = key(player.id, enemy.id, war.declaredTurn);
  let baseline = ledger.get(at);
  if (baseline === undefined) {
    baseline = { killed: player.unitsKilled, lost: player.unitsLost, since: state.turn };
    ledger.set(at, baseline);
  }
  let won = 0;
  let given = 0;
  for (const city of state.cities) {
    if (!movedByThisWar(city, war.declaredTurn)) continue;
    if (city.ownerId === player.id) won += 1;
    else if (city.ownerId === enemy.id) given += 1;
  }
  return {
    killed: Math.max(0, player.unitsKilled - baseline.killed),
    lost: Math.max(0, player.unitsLost - baseline.lost),
    won,
    given,
    since: baseline.since,
  };
}

/** A town this war moved: taken by force on or after the declaration. */
function movedByThisWar(city: City, declaredTurn: number): boolean {
  if (!city.captured) return false;
  const on = city.capturedOn;
  return on !== undefined && on >= declaredTurn;
}

/** How many war windows this game is holding. For tests and a future profiler. */
export function warLedgerSize(state: GameState): number {
  return LEDGERS.get(state)?.size ?? 0;
}
