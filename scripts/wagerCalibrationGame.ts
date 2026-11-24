import { aiConfigFor, clearSeatTuning, setAiTuning, type PersonaOverride } from '../src/ai/aiConfig';
import { nextBotCommand } from '../src/ai/bot';
import { driveBots } from '../src/ai/driver';
import { appraiseMilestoneWagers } from '../src/ai/wager';
import { BEAD_RULES } from '../src/sim/beadData';
import { createGame } from '../src/sim/game';
import { leaderDef, type LeaderId } from '../src/sim/leaderData';
import { foldScore, explainScore } from '../src/sim/score';
import { realPlayers } from '../src/sim/state';
import { milestoneOffer } from '../src/sim/wagerMilestones';
import { currentWagerSeat, type WagerSetup } from '../src/sim/wagerMilestoneData';
import type { Sample } from './wagerCalibrationAnalysis';

export interface Manifest {
  policy: { name: string; settings?: PersonaOverride };
  trainingSeeds: number[];
  heldOutSeeds: number[];
  boards: { sizeName: string; seatCount: number }[];
  leaders: LeaderId[];
  turnLimit: number;
}
export type Strategy = 'measure' | 'natural' | 'low' | 'middle';
export function play(manifest: Manifest, seed: number, board: Manifest['boards'][number], strategy: Strategy, setup: WagerSetup) {
  const offset = ((seed % manifest.leaders.length) + manifest.leaders.length) % manifest.leaders.length;
  const players = Array.from({ length: board.seatCount }, (_, n) => {
    const id = manifest.leaders[(n + offset) % manifest.leaders.length]!;
    const leader = leaderDef(id);
    return { leader: id, name: leader.name, persona: leader.persona, color: leader.colors.primary, isHuman: false };
  });
  const game = createGame({ seed, sizeName: board.sizeName, players, barbarians: true, wagerSetup: setup });
  const state = game.state;
  const immediate = new Set<string>();
  const warnings: string[] = [];
  let victoryClosedAge: number | undefined;
  const fixed = strategy === 'low' ? 0 : strategy === 'middle' ? 1 : null;
  try {
    if (manifest.policy.settings) {
      for (const player of realPlayers(state)) setAiTuning(manifest.policy.settings, { playerId: player.id, afterPersona: true });
    }
    while (state.winnerId === null && state.turn <= manifest.turnLimit) {
      const before = state.turn;
      const agesBeforeTurn = state.wagerBook!.ages;
      const previousAge = agesBeforeTurn[agesBeforeTurn.length - 1]!;
      const alreadyClosed = previousAge.closed !== undefined;
      driveBots(game, {
        ...(fixed === null ? {} : { decide: ((board, id, sitting) => {
          const cmd = nextBotCommand(board, id, sitting);
          if (cmd?.type !== 'chooseWager') return cmd;
          const offer = milestoneOffer(board, id)!;
          const ranked = appraiseMilestoneWagers(board, id, aiConfigFor(board.players[id]?.persona, id).wager, offer);
          const pick = ranked.find((choice) => choice.mark === fixed)!;
          return { ...cmd, age: offer.age, index: pick.index, mark: fixed };
        }) satisfies typeof nextBotCommand }),
        warn: (message) => warnings.push(message),
        report: (cmd) => {
          if (cmd.type === 'chooseWager' && currentWagerSeat(state, cmd.playerId)?.reached.length) {
            immediate.add(String(cmd.age) + '/' + cmd.playerId);
          }
        },
      });
      if (state.winnerId !== null) {
        const ages = state.wagerBook!.ages;
        const finalAge = ages[ages.length - 1]!;
        if (finalAge.closed !== undefined && (finalAge.age !== previousAge.age || !alreadyClosed)) victoryClosedAge = finalAge.age;
      }
      if (state.turn === before && state.winnerId === null) throw Error('The bot game stalled on turn ' + before);
    }
  } finally { clearSeatTuning(); }
  if (warnings.length) throw Error('Bot warnings in seed ' + seed + ': ' + warnings.join('; '));
  const ages = state.wagerBook!.ages;
  const samples: Sample[] = ages.flatMap((age) => age.seats.map((seat) => ({
    seed, ...board, age: age.age, opened: age.opened, closed: age.closed ?? null, seat: seat.playerId,
    ending: age.closed === undefined ? 'turn limit' : age.age === victoryClosedAge ? 'victory' : 'age',
    opening: seat.opening, closing: seat.closing ?? null,
  })));
  const ageIV = ages.find((age) => age.age === 4);
  const seats = realPlayers(state).map((player) => {
    const picks = ages.map((age) => {
      const seat = age.seats.find((s) => s.playerId === player.id)!;
      return { age: age.age, dealt: age.dealt, pick: seat.pick ?? null, reached: seat.reached,
        paidAtPick: immediate.has(age.age + '/' + player.id) };
    });
    const doorTurn = player.beads[BEAD_RULES.threshold - 1]?.turn ?? null;
    const ageIVEnd = ageIV?.closed ?? state.turn;
    return { playerId: player.id, leader: players[player.id]!.leader, eliminated: player.eliminated,
      score: foldScore(explainScore(state, player.id)), won: player.id === state.winnerId,
      beads: player.beads.length, doorTurn,
      enteredAgeIV: !!ageIV, finishedAgeIV: ageIV?.closed !== undefined,
      atDoorDuringAgeIV: !!ageIV && doorTurn !== null && doorTurn <= ageIVEnd, picks };
  });
  return { strategy, seed, ...board, winner: state.winnerId, finalTurn: state.turn, samples, seats };
}

