/**
 * One game played twice: once with the bots thinking on the page (the
 * synchronous `driveBots` and `answerAudience`), once with them thinking in the
 * bot worker (`answerBotWorker` behind a `structuredClone`, which is the
 * `postMessage` seam) and their commands applied on the page by
 * `applyTwinReply`. Shared by the core and slow tiers of `botWorker`; a
 * non-test module so neither re-registers the other's tests.
 *
 * Seat 0 is the person. Its orders come from the bot policy too, so both runs
 * give it the same turn, and whenever it puts a paper to a bot seat the
 * audience is asked at once, as the diplomacy sheet does.
 */

import { botSitting, nextBotCommand } from '../../src/ai/bot';
import { answerAudience, driveBots, noteSentOrder, repeatsAnOrder } from '../../src/ai/driver';
import { pendingDealRefusal, rememberDealRefusal } from '../../src/ai/dealMemory';
import { readHarnessMemory } from '../../src/ai/harnessMemory';
import type { Command } from '../../src/sim/commands';
import { type Game, createGame, dispatch } from '../../src/sim/game';
import { type GameConfig, playerById } from '../../src/sim/state';
import { type BotWorkerRequest, answerBotWorker } from '../../src/ui/bot.worker';
import { type TwinOutcome, applyTwinReply } from '../../src/ui/botTwin';
import { digestOfState } from '../sim/aiDigestHelpers';

export type Thinker = 'page' | 'worker';

export interface PlayedTwice {
  game: Game;
  /** One digest per turn played, taken after the turn resolved. */
  digests: string[];
  /** How many audiences seat 0 asked for, and how many the bot answered. */
  audiences: number;
  answered: number;
  /** Outcomes of the worker drives; every one should be `applied`. */
  outcomes: TwinOutcome[];
}

/** Sends one request through the seam the browser uses: a structured clone each way. */
function throughTheSeam(request: BotWorkerRequest) {
  return structuredClone(answerBotWorker(structuredClone(request)));
}

function askAudience(game: Game, thinker: Thinker, seatId: number, dealId?: number) {
  const options = { seatId, askerId: 0, ...(dealId === undefined ? {} : { dealId }), warn: () => {} };
  if (thinker === 'page') return answerAudience(game, options);
  const reply = throughTheSeam({
    kind: 'audience',
    id: 1,
    config: game.config,
    state: game.state,
    logLength: game.log.length,
    memory: readHarnessMemory(game.state),
    seatId,
    askerId: 0,
    ...(dealId === undefined ? {} : { dealId }),
  });
  if (reply.kind !== 'answered') throw new Error(`the worker did not answer: ${JSON.stringify(reply)}`);
  const outcome = applyTwinReply(game, reply);
  if (outcome !== 'applied') throw new Error(`the answer was not applied: ${outcome}`);
  return reply.decision;
}

/** Seat 0's turn, without its `endTurn`: the policy's commands, with the driver's guards. */
function playThePerson(game: Game, thinker: Thinker, tally: { audiences: number; answered: number }): void {
  const sitting = botSitting(0);
  const sent = new Map<string, string>();
  for (let step = 0; step < 400; step++) {
    const command = nextBotCommand(game.state, 0, sitting);
    if (command === null || command.type === 'endTurn') return;
    const key = JSON.stringify(command);
    if (repeatsAnOrder(sent, game.state, command, key)) return;
    const refusal = pendingDealRefusal(game.state, command);
    const result = dispatch(game, command);
    if (!result.ok) return;
    if (refusal !== null) rememberDealRefusal(game.state, refusal);
    noteSentOrder(sent, game.state, command, key);
    const target = paperTarget(command);
    if (target === null || playerById(game.state, target)?.isHuman !== false) continue;
    tally.audiences += 1;
    const dealId =
      command.type === 'proposeDeal'
        ? game.state.dealProposals.filter((paper) => paper.by === 0 && paper.to === target).pop()?.id
        : undefined;
    if (command.type === 'proposeDeal' && dealId === undefined) continue;
    if (askAudience(game, thinker, target, dealId) !== null) tally.answered += 1;
  }
}

function paperTarget(command: Command): number | null {
  if (command.type === 'proposeDeal' || command.type === 'proposePeace') return command.targetId;
  return null;
}

/** Plays `turns` turns with the bots thinking where `thinker` says. */
export function playWithBotsThinking(config: GameConfig, turns: number, thinker: Thinker): PlayedTwice {
  const game = createGame(config);
  const tally = { audiences: 0, answered: 0 };
  const digests: string[] = [];
  const outcomes: TwinOutcome[] = [];
  const quiet = { warn: () => {} };
  for (let turn = 0; turn < turns && game.state.winnerId === null; turn++) {
    const before = game.state.turn;
    playThePerson(game, thinker, tally);
    if (thinker === 'page') {
      driveBots(game, quiet);
    } else {
      const reply = throughTheSeam({
        kind: 'drive',
        id: 1,
        config: game.config,
        state: game.state,
        logLength: game.log.length,
        memory: readHarnessMemory(game.state),
      });
      if (reply.kind !== 'driven') throw new Error(`the worker did not drive: ${JSON.stringify(reply)}`);
      outcomes.push(applyTwinReply(game, reply));
    }
    let ended = dispatch(game, { type: 'endTurn', playerId: 0 });
    if (!ended.ok) {
      playThePerson(game, thinker, tally);
      ended = dispatch(game, { type: 'endTurn', playerId: 0 });
    }
    if (game.state.turn === before) throw new Error(`turn ${before} did not resolve: ${ended.ok ? '' : ended.error}`);
    digests.push(digestOfState(game.state));
  }
  return { game, digests, audiences: tally.audiences, answered: tally.answered, outcomes };
}
