/**
 * **The bot prices a card by its stamp** (bot batch BP3, `docs/flags.md`
 * (ooooooo), the B8 ruling; the faults are B3, B4 and B8 of
 * `docs/audit/bot-pass-3-card-values.md`).
 *
 * The ruling: where the sim can stamp a card on a copy of the seat's state
 * (`explainCardImpact`), the bot takes that figure as the card's pay now, and
 * keeps its own readings only for what a stamp cannot see. These are the core
 * claims, on one small played board:
 *
 *   · the bot's stamp of a card is the sim's own stamp, to the last digit;
 *   · a stamped card is priced as its stamp and what the books cannot show, and
 *     nothing else;
 *   · an engine in a full council takes a chair of its own and benches nothing
 *     (fault B4);
 *   · a card that can never sit, a government and a follower belief are not
 *     stamped;
 *   · the stamp is remembered only while the board stands still.
 *
 * The same claims over many recorded positions, and the check that each effect
 * the bot reads as unseen leaves the books where they were, are the slow tier's
 * (`aiCardStamp.slow.test.ts`).
 */

import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { explainCard } from '../../src/ai/council';
import { foldTerms } from '../../src/ai/decision';
import { driveBots } from '../../src/ai/driver';
import {
  cardStampChair,
  explainBeyondStamp,
  explainCardEffects,
  explainCardStamp,
} from '../../src/ai/value';
import type { Game } from '../../src/sim/game';
import { FOLLOWER_BELIEF_IDS } from '../../src/sim/religionData';
import { type GameState, type Player, bumpRevision, realPlayers } from '../../src/sim/state';
import { slotTypesOf } from '../../src/sim/statecraft';
import { chairFitFor } from '../../src/sim/statecraft/council';
import {
  type CardId,
  type OrderId,
  GOVERNMENT_IDS,
  ORDER_IDS,
  isBoon,
  isCharter,
  orderDef,
} from '../../src/sim/statecraftData';
import { cardsToPrice, effectsOf, stampOfTheSim } from './aiCardStampHelpers';
import { createGame } from './newGameHelpers';

/** Six seats on the duel board, to the turn the decks have dealt a few hands. */
const TURNS = 30;

function played(): Game {
  const game = createGame({
    seed: 20260831,
    sizeName: 'duel',
    players: ['A', 'B', 'C', 'D', 'E', 'F'].map((name, index) => ({
      name,
      color: ['#d4502e', '#1f8a85', '#6a4c93', '#c9a227', '#3c6e47', '#8a5a44'][index]!,
    })),
    barbarians: true,
  });
  while (game.state.turn <= TURNS) driveBots(game, { warn: () => {} });
  return game;
}

let kept: Game | null = null;
/** One game for the file, played once. Each case reads it and changes nothing it keeps. */
function board(): GameState {
  kept ??= played();
  return kept.state;
}

function seats(state: GameState): Player[] {
  return realPlayers(state).filter((player) => !player.eliminated);
}

describe('the bot prices a card by its stamp', () => {
  it('reads every card it stamps as the sim’s own stamp, card by card', () => {
    const state = board();
    let checked = 0;
    for (const player of seats(state)) {
      const ctx = valueContext(state, player);
      for (const id of cardsToPrice(state, player)) {
        const stamp = explainCardStamp(ctx, id);
        const sim = stampOfTheSim(state, player.id, id, ctx);
        if (stamp === null || sim === null) {
          expect({ id, bot: stamp === null, sim: sim === null }).toEqual({ id, bot: true, sim: true });
          continue;
        }
        checked += 1;
        expect(sim.meterLinesOff, id).toEqual([]);
        expect(Math.abs(stamp.total - sim.worth), id).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(sim.worth)));
        // Rule 5: the figure is the fold of the terms it prints.
        expect(foldTerms(stamp.terms), id).toBe(stamp.total);
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('prices a stamped card as its stamp and what the books cannot show, and nothing else', () => {
    const state = board();
    let checked = 0;
    for (const player of seats(state)) {
      const ctx = valueContext(state, player);
      for (const id of cardsToPrice(state, player)) {
        const stamp = explainCardStamp(ctx, id);
        if (stamp === null) continue;
        // A commission's reward and a charter's technology ride on top, as lumps.
        if (orderDefOrNull(id)?.commission !== undefined) continue;
        const priced = explainCardEffects(id, effectsOf(id), ctx, 'stamp');
        const beyond = explainBeyondStamp(effectsOf(id), ctx, id);
        expect(priced.total, id).toBe(foldTerms(priced.terms));
        expect(priced.terms[0]!.value, id).toBe(stamp.total);
        expect(priced.total, id).toBeCloseTo(stamp.total + beyond.total, 9);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('seats an engine in a chair of its own when every chair is full, and benches nothing', () => {
    const state = structuredClone(board());
    const player = seats(state)[0]!;
    const sc = player.statecraft;
    const layout = slotTypesOf(sc);
    const fit = chairFitFor(state, player.id);
    // Every chair full of a card that may sit there.
    const fillers = ORDER_IDS.filter(
      (id) => orderDef(id).retired !== true && !isBoon(id) && !isCharter(id) && orderDef(id).commission === undefined,
    );
    for (let index = 0; index < sc.slots.length; index++) {
      if (sc.slots[index] !== null) continue;
      const card = fillers.find((id) => fit(id, layout[index] ?? 'wildcard') && !sc.orders.includes(id))!;
      sc.orders.push(card);
      sc.slots[index] = { card, sealedUntil: state.turn };
    }
    bumpRevision(state);
    expect(sc.slots.every((slot) => slot !== null)).toBe(true);
    const engine = 'theBourse' as OrderId;
    expect(sc.orders.includes(engine)).toBe(false);
    const ctx = valueContext(state, player);
    // The card's chair is a new one at the end of the council (the stamp's rule),
    // not the chair of a card it would push out.
    expect(cardStampChair(ctx, engine)).toBe(sc.slots.length);
    const sim = stampOfTheSim(state, player.id, engine, ctx)!;
    expect(explainCardStamp(ctx, engine)!.total).toBeCloseTo(sim.worth, 9);
    // So a gold engine on a board with no gold building is worth nothing, never
    // less: no seated card is taken off the books to make room for it.
    expect(explainCardStamp(ctx, engine)!.total).toBeGreaterThanOrEqual(0);
  });

  it('walks a card that can never sit, a government and a follower belief', () => {
    const state = board();
    const player = seats(state)[0]!;
    const ctx = valueContext(state, player);
    const boon = ORDER_IDS.find((id) => orderDef(id).retired !== true && isBoon(id))!;
    const charter = ORDER_IDS.find((id) => orderDef(id).retired !== true && isCharter(id))!;
    expect(explainCardStamp(ctx, boon)).toBeNull();
    expect(explainCardStamp(ctx, charter)).toBeNull();
    expect(explainCardStamp(ctx, GOVERNMENT_IDS[1]! as CardId)).toBeNull();
    expect(explainCardStamp(ctx, FOLLOWER_BELIEF_IDS[0]! as CardId)).toBeNull();
    // The walk still prices them, as it did before the batch.
    expect(Number.isFinite(explainCard(player, boon, ctx).total)).toBe(true);
  });

  it('remembers a stamp only while the board stands still', () => {
    const state = structuredClone(board());
    const player = seats(state)[0]!;
    const ctx = valueContext(state, player);
    const id = cardsToPrice(state, player).find((card) => (explainCardStamp(ctx, card)?.total ?? 0) > 0)!;
    expect(id).toBeDefined();
    const first = explainCardStamp(ctx, id)!.total;
    // The same board: the same answer, and the same object behind it.
    expect(explainCardStamp(ctx, id)!.total).toBe(first);
    // A town is lost to the empire, announced as a writer announces it, and the
    // next ask reads the board as it now stands.
    const town = state.cities.find((city) => city.ownerId === player.id)!;
    town.population = 1;
    bumpRevision(state);
    const after = valueContext(state, player);
    const sim = stampOfTheSim(state, player.id, id, after)!;
    expect(explainCardStamp(after, id)!.total).toBeCloseTo(sim.worth, 9);
  });
});

function orderDefOrNull(id: CardId): ReturnType<typeof orderDef> | null {
  return (ORDER_IDS as readonly string[]).includes(id) ? orderDef(id as OrderId) : null;
}
