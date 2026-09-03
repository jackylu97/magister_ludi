/**
 * The loop that plays every seat nobody is sitting in.
 *
 * `bot.ts` answers *what would this seat like to do next?* one command at a
 * time and has no memory; this file is the other half — ask, dispatch, ask
 * again, and finally end the turn. Two things live here and nowhere else: the
 * **funnel** (a bot's command must reach the same listeners a human's does) and
 * the **guards** (a bot must never spin forever, and must never quietly swallow
 * a refusal).
 *
 * Why the commands go through the interface's funnel
 * ---------------------------------------------------
 * The star chart and the city panel already dispatch for themselves and then
 * call `GameControls.reportCommand`, so that the tutorial, the notice log and
 * everything else hanging off `onCommand` hears an order however it was given
 * (see `reportCommand`'s docblock in `controls.ts`). A bot is a third such
 * caller and takes the same road. It deliberately does **not** go through
 * `commit`: that funnel is a *seat's* after-effects — the sighting poll, the
 * raid report, the toast stack — and running them for a rival's order would
 * announce another empire's business to the player.
 *
 * Why a refusal is a bug
 * ----------------------
 * `bot.ts` puts every candidate to the simulation's own validator before it
 * proposes it, so the reducer should never say no. A refusal therefore means
 * the bot and the rules have drifted, and the honest response is a loud console
 * warning plus a *stop asking for that command this turn* — retrying an
 * identical refused command is the one way this loop could run forever.
 *
 * The single documented exception is `chooseGreatPerson`: the roster is shared
 * by every seat, and a hand naming somebody another empire has already called is
 * refused **and redrawn** by the reducer (the one refusal in the game that
 * mutates). That one is retried, because the retry is answering a *different*
 * hand — bounded by `ai.driver.greatPersonRedraws` so a data fault cannot spin.
 *
 * Determinism
 * -----------
 * Nothing here rolls a die, reads a clock or asks a renderer anything. The seats
 * are walked in `realPlayers` order, each seat's commands come out of a pure
 * function of the state, and every one of them is appended to the log by
 * `dispatch` — so a save of a game against bots replays to the same board, and
 * a bot's whole game is in the file exactly as a human's is.
 */

import { aiConfigFor } from './aiConfig';
import { nextBotCommand } from './bot';
import type { Command, CommandResult } from '../sim/commands';
import { type Game, dispatch } from '../sim/game';
import { hasEndedTurn, playerById, realPlayers } from '../sim/state';

/**
 * What a bot's accepted command is reported to, and it is one function on
 * purpose.
 *
 * `controls.reportCommand` fits this signature exactly, which is the point: the
 * driver has no idea an interface exists, and a headless test drives the same
 * loop by passing nothing at all.
 */
export type BotReporter = (command: Command, result: CommandResult) => void;

export interface DriveOptions {
  /** Called after every accepted bot command. `controls.reportCommand`. */
  report?: BotReporter;
  /** Where a refusal is said out loud. Defaults to `console.warn`. */
  warn?: (message: string, detail?: unknown) => void;
}

/** What one seat's turn cost, for tests and for a future profiler. */
export interface SeatDriveReport {
  playerId: number;
  /** Commands accepted, the seat's own `endTurn` included. */
  accepted: number;
  /** Commands the reducer refused. Any number above zero is a bug. */
  refused: number;
  /** True when the seat ended its turn. False is a stall the caller must see. */
  ended: boolean;
}

/**
 * Plays every seat that is not a person and has not ended its turn.
 *
 * `realPlayers` is the register for "who counts" (CLAUDE.md), so the wild is
 * excluded by construction rather than by a hand-rolled `!barbarian` — the wild
 * has no screen, sends no `endTurn`, and is driven by `barbarians.ts` inside the
 * resolution. Eliminated seats are skipped for the reason `firstBlocker` skips
 * them: they have nothing to act with, and the reducer already re-raises their
 * turn flag every resolution.
 *
 * Returns one report per seat it touched, in the order it touched them.
 */
export function driveBots(game: Game, options: DriveOptions = {}): SeatDriveReport[] {
  const reports: SeatDriveReport[] = [];
  for (const player of realPlayers(game.state)) {
    if (player.isHuman) continue;
    if (player.eliminated) continue;
    if (hasEndedTurn(game.state, player.id)) continue;
    reports.push(driveSeat(game, player.id, options));
  }
  return reports;
}

/**
 * One seat, from its first decision to its `endTurn`.
 *
 * Three guards, and each one closes a different way this could hang:
 *
 *   · **A command budget** (`ai.driver.commandsPerSeat`). A bot whose valuation
 *     oscillates — march here, march back — is bounded by the movement it
 *     spends, but a rule change could break that reasoning and a budget is what
 *     turns "the browser froze" into "the console said so".
 *   · **A refused-command memo.** A refusal means the bot proposed something the
 *     rules do not allow; re-proposing it would loop, so the identical command
 *     is banned for the rest of this seat's turn and the next decision is asked
 *     for instead.
 *   · **Bounded End Turn attempts.** `endTurn` is refused while the seat still
 *     owes the turn something, so a refusal is answered by running the bot again
 *     to clear whatever it names — a few times, and then the seat is left open
 *     with a warning rather than spun on.
 */
export function driveSeat(game: Game, playerId: number, options: DriveOptions = {}): SeatDriveReport {
  const warn = options.warn ?? ((message: string, detail?: unknown) => console.warn(message, detail));
  const report: SeatDriveReport = { playerId, accepted: 0, refused: 0, ended: false };
  // **The seat's own sheet**, not a module global: a persona is a sparse
  // override of the whole configuration, the `driver` block included, so two
  // seats may be allowed different budgets in the same pass.
  const ai = aiConfigFor(playerById(game.state, playerId)?.persona);

  // Keyed by the command's own JSON, which is exactly "the identical command":
  // two `moveUnit`s to different hexes are two commands, and the same one twice
  // is the loop this closes. Membership only — nothing iterates it.
  const refusedCommands = new Set<string>();
  let redraws = 0;

  for (let attempt = 0; attempt < Math.max(1, ai.driver.endTurnAttempts); attempt++) {
    while (report.accepted + report.refused < ai.driver.commandsPerSeat) {
      const command = nextBotCommand(game.state, playerId);
      if (command === null) break;
      const key = JSON.stringify(command);
      if (refusedCommands.has(key)) {
        // The bot is still asking for something the rules refused. Nothing this
        // loop can do about it; the End Turn attempt below will say whether the
        // seat is stuck.
        break;
      }
      const result = dispatch(game, command);
      if (result.ok) {
        report.accepted += 1;
        options.report?.(command, result);
        continue;
      }
      // The one refusal that is not a bug: a great-person hand another seat has
      // emptied is refused *and redrawn*, so asking again asks about a new hand.
      if (command.type === 'chooseGreatPerson' && redraws < ai.driver.greatPersonRedraws) {
        redraws += 1;
        continue;
      }
      report.refused += 1;
      refusedCommands.add(key);
      warn(`[ai] seat ${playerId}: the reducer refused ${command.type} — ${result.error}`, command);
    }

    const ended = dispatch(game, { type: 'endTurn', playerId });
    if (ended.ok) {
      report.accepted += 1;
      report.ended = true;
      options.report?.({ type: 'endTurn', playerId }, ended);
      return report;
    }
    // Refused: something is still owed. One more pass of the loop above is the
    // answer, because `nextBotCommand` reads the very blocker that refused this.
    if (attempt + 1 >= Math.max(1, ai.driver.endTurnAttempts)) {
      warn(`[ai] seat ${playerId}: could not end its turn — ${ended.error}`);
    }
  }
  return report;
}
