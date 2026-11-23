/**
 * **The bot's sitting in phases** (bot batch BP16, stage B; `docs/flags.md`,
 * the bullet "The bot's turn in phases"; `src/ai/sittingPhases.ts`).
 *
 * A sitting asks five phases in order (research, diplomacy, the council,
 * spending, housekeeping), each until it has nothing more to do, then the loop
 * over the turn's blockers and the arms that move pieces, and then it ends.
 * A closed phase opens again only after one of a short list of events. These
 * tests pin that shape on a short game of four bot seats:
 *
 *   - a phase is asked until it says nothing and then not again, unless its
 *     event comes;
 *   - an event opens its phase again;
 *   - a town's focus waits for the town's build;
 *   - the end check (`setSittingEndCheck`) changes no command, and what the old
 *     pass would still have done at the end of a sitting is only of the kinds
 *     the plan file accepts.
 */

import { describe, expect, it } from 'vitest';

import { botSitting, nextBotDecision, resumedSitting, sittingMarks } from '../../src/ai/bot';
import type { BotDecision } from '../../src/ai/decision';
import { driveBots } from '../../src/ai/driver';
import { SITTING_PHASES, phaseTally, setSittingEndCheck } from '../../src/ai/sittingPhases';
import { applyCommand } from '../../src/sim/commands';
import { type GameState, bumpRevision, playerById } from '../../src/sim/state';
import { digestOfState } from './aiDigestHelpers';
import { playedGameFixture } from './grownGameHelpers';
import { createGame } from './newGameHelpers';

const SEATS = [
  { name: 'Ada', color: '#a00' },
  { name: 'Bors', color: '#00a' },
  { name: 'Cato', color: '#0a0', persona: 'warmonger' },
  { name: 'Dido', color: '#aa0', persona: 'tall' },
];

function game(seed = 7) {
  return createGame({ seed, sizeName: 'duel', players: SEATS as never, barbarians: true });
}

const openingAtTurn24 = playedGameFixture(() => {
  const played = game();
  while (played.state.turn < 24 && played.state.winnerId === null) driveBots(played, { warn: () => {} });
  return played;
});

/** A copy of one tally table, so a test can read what one sitting added. */
function snapshot(table: Record<string, number>): Record<string, number> {
  return { ...table };
}

function added(before: Record<string, number>, after: Record<string, number>, key: string): number {
  return (after[key] ?? 0) - (before[key] ?? 0);
}

/** One seat's whole sitting, every decision applied. */
function sit(state: GameState, playerId: number, sitting = botSitting(playerId)): BotDecision[] {
  const sent: BotDecision[] = [];
  for (let step = 0; step < 300; step++) {
    const decision = nextBotDecision(state, playerId, sitting);
    if (decision === null) break;
    sent.push(decision);
    expect(applyCommand(state, decision.command).ok).toBe(true);
  }
  return sent;
}

describe('a phase is asked until it has nothing more to do', () => {
  it('closes every phase by the end of the sitting, and asks each only once more than it answers', () => {
    const { state } = openingAtTurn24();
    for (const playerId of [0, 1, 2, 3]) {
      const asked = snapshot(phaseTally.asked);
      const answered = snapshot(phaseTally.answered);
      const reopened = snapshot(phaseTally.reopened);
      const sitting = botSitting(playerId);
      sit(state, playerId, sitting);
      for (const phase of SITTING_PHASES) expect(sitting.closed.has(phase)).toBe(true);
      // The beeline has no event: one ask more than its answers, at most.
      expect(added(asked, phaseTally.asked, 'reaimBeeline')).toBeLessThanOrEqual(
        added(answered, phaseTally.answered, 'reaimBeeline') + 1,
      );
      // The arrears arm is asked while its phase is open: once, once more for
      // each answer of the phase, and once more each time the purse opened the
      // phase again.
      expect(added(asked, phaseTally.asked, 'disband')).toBeLessThanOrEqual(
        1 +
          added(answered, phaseTally.answered, 'disband') +
          added(answered, phaseTally.answered, 'spend') +
          added(reopened, phaseTally.reopened, 'purse>spending'),
      );
    }
  }, 120_000);
});

describe('an event opens its phase again', () => {
  it('rechecks spending once after a cut plan resumes with new purchase priorities', () => {
    const frozen = botSitting(2);
    SITTING_PHASES.forEach((phase) => frozen.closed.add(phase));
    const live = resumedSitting(2, sittingMarks(frozen), (id) => id);
    expect([...live.closed]).toEqual(SITTING_PHASES.filter((phase) => phase !== 'spending'));
    expect(frozen.closed.has('spending')).toBe(true);
  });

  it('asks the spending phase again after the purse moved, and not before', () => {
    const { state } = openingAtTurn24();
    const sitting = botSitting(0);
    for (let step = 0; step < 300 && !sitting.closed.has('spending'); step++) {
      const decision = nextBotDecision(state, 0, sitting);
      if (decision === null) break;
      expect(applyCommand(state, decision.command).ok).toBe(true);
    }
    expect(sitting.closed.has('spending')).toBe(true);
    // One decision with nothing changed since the last: the phase stays shut.
    nextBotDecision(state, 0, sitting);
    const asked = phaseTally.asked.spend ?? 0;
    const reopened = phaseTally.reopened['purse>spending'] ?? 0;
    nextBotDecision(state, 0, sitting);
    expect(phaseTally.asked.spend ?? 0).toBe(asked);
    // A coin more in the purse is the `purse` event.
    playerById(state, 0)!.gold += 50;
    bumpRevision(state);
    nextBotDecision(state, 0, sitting);
    expect(phaseTally.reopened['purse>spending'] ?? 0).toBe(reopened + 1);
    expect(phaseTally.asked.spend ?? 0).toBeGreaterThan(asked);
  }, 120_000);
});

describe('a town is pointed after it chooses its build', () => {
  it('asks the focus of no town while a town of the seat has an empty queue', () => {
    const { state } = openingAtTurn24();
    const town = state.cities.find((city) => city.ownerId === 0 && city.unrest === undefined)!;
    town.queue = [];
    bumpRevision(state);
    const sent = sit(state, 0);
    const built = sent.findIndex((decision) => decision.command.type === 'setCityProduction' && 'cityId' in decision.command && decision.command.cityId === town.id);
    expect(built).toBeGreaterThanOrEqual(0);
    const pointed = sent.findIndex((decision) => decision.command.type === 'setCitizenFocus');
    expect(pointed === -1 || pointed > built).toBe(true);
  }, 120_000);
});

describe('the end check', () => {
  it('changes no command, and the old pass finds only what the plan file accepts', () => {
    const plain = game();
    const checked = game();
    const found = snapshot(phaseTally.endFound);
    const checks = phaseTally.endChecks;
    setSittingEndCheck(true);
    try {
      while (checked.state.turn < 30 && checked.state.winnerId === null) driveBots(checked, { warn: () => {} });
    } finally {
      setSittingEndCheck(false);
    }
    while (plain.state.turn < 30 && plain.state.winnerId === null) driveBots(plain, { warn: () => {} });
    expect(JSON.stringify(checked.log)).toBe(JSON.stringify(plain.log));
    expect(digestOfState(checked.state)).toBe(digestOfState(plain.state));
    expect(phaseTally.endChecks - checks).toBeGreaterThan(100);
    // Research changes and a newly available resource swap can wait for the
    // next sitting. The check must not reveal an unfinished unit or city order.
    const kinds = Object.keys(phaseTally.endFound).filter((key) => added(found, phaseTally.endFound, key) > 0);
    for (const kind of kinds) expect(kind).toMatch(/^(chooseResearch|proposeDeal): /);
  }, 240_000);
});
