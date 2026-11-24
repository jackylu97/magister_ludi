/**
 * **The bot's card price against the card's stamp, over recorded positions**
 * (bot batch BP3, `docs/flags.md` (ooooooo), the B8 ruling: *"A slow-tier check
 * compares the bot's price with the stamp over recorded positions, so a new card
 * shape that the bot misreads fails a test."*).
 *
 * The positions are recorded from one played game: the digest's six seats on the
 * duel board, every seat holding all six decks, at turns 40, 80 and 120. At each
 * position every seat prices every card it could be asked about (the Orders its
 * decks could deal next and the ones it holds, the live Doctrines, the pantheon
 * gods, and for a seat with a religion the follower and enhancer beliefs:
 * `cardsToPrice`). Four checks:
 *
 *   1. **The stamp is the sim's stamp.** The bot's reading of a card on the
 *      stamp's two boards (`explainCardStamp`) equals `explainCardImpact`'s own
 *      fold, weighed at the seat's prices, to the last digit. A shape that pays
 *      into a line of the books the bot's reading does not read fails here.
 *   2. **A card the books show is priced at its stamp.** A card whose every
 *      effect the bot reads as on the books, with no promise, is priced at its
 *      stamp exactly. A shape that the bot reads twice fails here. A follower or
 *      enhancer belief has one more promise (bot batch BP5): the towns its faith
 *      can expect to hold that do not follow it yet (`faithTowns`), so it is
 *      checked only where every such town follows already.
 *   3. **What the bot reads as unseen leaves the books where they were.** Each
 *      effect the bot prices by its own reading (`stampSight` answers `'none'`)
 *      is lent alone to its card's row, and the card's stamp must not move. A
 *      shape the bot reads as a rider or a rule of play but which pays the books
 *      would be priced twice, once by the stamp and once by the walk, and fails
 *      here.
 *   4. **What the bot reads as on the books is there.** For each shape the bot
 *      reads as on the books (`'books'`) and which the bot's own walk prices on
 *      the board as it is today, at least one card of that shape in some position
 *      moves the books. A shape the stamp cannot see but the bot reads as seen
 *      would be priced at nothing, and fails here.
 *
 * Slow by kind: a hundred and twenty turns of six seats, then some thousands of
 * stamps.
 *
 * Additional controlled positions cover recent losses, spare happiness and
 * shared Orders with yields for an amplifier to raise.
 * These conditions must stay covered when bot changes alter the played game.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import {
  explainCardEffects,
  explainCardStamp,
  explainEffects,
  faithTowns,
  stampSight,
  type ValueContext,
} from '../../src/ai/value';
import { restoreState, snapshotState } from '../../src/sim/game';
import { beliefPoolOf, isBeliefId } from '../../src/sim/religionData';
import { type GameState, realPlayers } from '../../src/sim/state';
import { isOrderId, orderDef } from '../../src/sim/statecraftData';
import {
  amplifierAuditPosition,
  cardsToPrice,
  effectsOf,
  footprintOf,
  meterAuditPosition,
  shapeOf,
  stampOfTheSim,
} from './aiCardStampHelpers';
import { playSeatedGame, sixSeatSpec, type Played } from './aiDigestHelpers';
import { expectSixSeatDigest } from './aiDigestPins';

/** The turns the positions are recorded at. */
const RECORDED = [40, 80, 120];

/** Long enough for a loaded machine; the game alone is about a minute on one core. */
const PATIENCE = 1_200_000;

/** A footprint this small is the floating-point noise of two folds of the same books. */
const NOTHING = 1e-6;

interface Findings {
  stamped: number;
  stampOff: string[];
  meterLinesOff: string[];
  seenOff: string[];
  seenChecked: number;
  unseenChecked: number;
  unseenOff: string[];
  /** Per shape read as on the books: instances, instances that moved the books, and instances the walk prices today. */
  booksShapes: Map<string, { instances: number; moved: number; walked: number }>;
}

/** Give the audit private states so it can change them independently of the digest. */
function auditPositions(snapshots: readonly string[]): GameState[] {
  const positions = snapshots.map((snapshot) => restoreState(snapshot));
  // **The last position again, with every seat's recent losses** (bot batch
  // BP12). It was added for the unit-loss rule of The Funeral Oration and The
  // Glorious Dead, which the bot read as a line on the books. That rule left
  // with war weariness on 2026-11-23, so no shape on the books needs this
  // position now. It is kept as one more position for the cases below: the
  // last position recorded once more, with two units of each seat lost to the
  // next seat this turn.
  const last = positions[positions.length - 1];
  if (last !== undefined) {
    const worn = restoreState(snapshotState(last));
    const seats = realPlayers(worn).filter((player) => !player.eliminated);
    seats.forEach((player, index) => {
      const by = seats[(index + 1) % seats.length]!.id;
      player.warLosses = [
        ...(player.warLosses ?? []),
        { turn: worn.turn, by, kind: 'unit' },
        { turn: worn.turn, by, kind: 'unit' },
      ];
    });
    positions.push(worn);
  }
  // Keep conditional meter coverage even when the played seats have no spare
  // happiness or no recent town losses. This private fixture is not a replay.
  positions.push(meterAuditPosition());
  positions.push(amplifierAuditPosition());
  return positions;
}

/** Every check over every recorded position, taken once for the four cases below. */
function check(positions: readonly GameState[]): Findings {
  const findings: Findings = {
    stamped: 0,
    stampOff: [],
    meterLinesOff: [],
    seenOff: [],
    seenChecked: 0,
    unseenChecked: 0,
    unseenOff: [],
    booksShapes: new Map(),
  };
  for (const state of positions) {
    for (const player of realPlayers(state)) {
      if (player.eliminated) continue;
      const ctx = valueContext(state, player);
      const today = { ...ctx, chains: [], today: true } as ValueContext;
      const faith = faithTowns(ctx);
      for (const id of cardsToPrice(state, player)) {
        const stamp = explainCardStamp(ctx, id);
        if (stamp === null) continue;
        const where = `${id} at turn ${state.turn}, seat ${player.id}`;
        // 1. The stamp is the sim's stamp.
        findings.stamped += 1;
        const sim = stampOfTheSim(state, player.id, id, ctx)!;
        if (Math.abs(stamp.total - sim.worth) > 1e-9 * Math.max(1, Math.abs(sim.worth))) {
          findings.stampOff.push(`${where}: the bot reads ${stamp.total}, the stamp ${sim.worth}`);
        }
        for (const off of sim.meterLinesOff) findings.meterLinesOff.push(`${where}: ${off}`);
        const effects = effectsOf(id);
        // 2. A card the books show, with no promise, is priced at its stamp.
        if (isOrderId(id) && (orderDef(id).commission !== undefined || orderDef(id).charter !== undefined)) continue;
        const sights = effects.map((effect) => stampSight(effect));
        if (effects.length > 0 && sights.every((sight) => sight === 'books')) {
          const faithPromise = isBeliefId(id) && beliefPoolOf(id) !== null && faith.expected > faith.following;
          const promised =
            faithPromise ||
            effects.some(
              (effect) => explainEffects([effect], ctx, id).total !== explainEffects([effect], today, id).total,
            );
          // **A belief's own promise, read as the bot reads it** (bot batch BP9).
          // `explainBeliefBeyond` prices a follower line opened to every town the
          // faith can expect to hold, on the seat's context against today's, so
          // the chains' promise of towns still to come shows there even when every
          // expected town follows already. The raw line's walk above cannot see
          // it, because the faith scope keeps the promised towns out. The first
          // position to show it was seat 5 of the duel at turn 121 (Feast Days),
          // in the game the BP9 bots play. Such a belief is not a card with no
          // promise, so it is not checked here.
          const pricedReading = promised ? null : explainCardEffects(id, effects, ctx, 'stamp');
          const beliefPromise =
            pricedReading !== null &&
            isBeliefId(id) &&
            pricedReading.terms.some((term) => term.label === 'what the books cannot show' && term.value !== 0);
          if (!promised && !beliefPromise) {
            findings.seenChecked += 1;
            const priced = pricedReading!.total;
            if (Math.abs(priced - stamp.total) > NOTHING) {
              findings.seenOff.push(`${where}: priced ${priced}, stamped ${stamp.total}`);
            }
          }
        }
        // 3 and 4. One effect at a time, lent alone to the card's row.
        for (const effect of effects) {
          const sight = stampSight(effect);
          if (sight === 'own') continue;
          const footprint = footprintOf(ctx, id, effect);
          if (sight === 'none') {
            findings.unseenChecked += 1;
            if (Math.abs(footprint) > NOTHING) {
              findings.unseenOff.push(`${where}: ${shapeOf(effect)} moves the books by ${footprint}`);
            }
            continue;
          }
          const shape = shapeOf(effect);
          const row = findings.booksShapes.get(shape) ?? { instances: 0, moved: 0, walked: 0 };
          row.instances += 1;
          if (Math.abs(footprint) > NOTHING) row.moved += 1;
          if (Math.abs(explainEffects([effect], today, id).total) > NOTHING) row.walked += 1;
          findings.booksShapes.set(shape, row);
        }
      }
    }
  }
  return findings;
}

describe('the six-seat duel', () => {
  let played: Played;
  const snapshots: string[] = [];
  beforeAll(() => {
    played = playSeatedGame(sixSeatSpec('duel'), (turn, state) => {
      if (RECORDED.includes(turn)) snapshots.push(snapshotState(state));
    });
  }, PATIENCE);

  describe('the six-seat digest', () => {
    it('plays a hundred and twenty turns on the duel board to the state it always reaches', () => {
      expectSixSeatDigest('duel', played);
    });
  });

  describe('the bot’s card price against the card’s stamp, over recorded positions (bot batch BP3)', () => {
    let findings: Findings;
    beforeAll(() => {
      if (played.stalled) throw new Error(`the game stalled at turn ${played.game.state.turn}`);
      findings = check(auditPositions(snapshots));
    }, PATIENCE);

    it('reads the stamp of every card it stamps as the sim’s own stamp', () => {
      expect(findings.stamped).toBeGreaterThan(1000);
      expect(findings.stampOff).toEqual([]);
      expect(findings.meterLinesOff).toEqual([]);
    });

    it('prices a card of lines the books show at its stamp, and nothing more', () => {
      expect(findings.seenChecked).toBeGreaterThan(200);
      expect(findings.seenOff).toEqual([]);
    });

    it('finds no footprint on the books for an effect it prices by its own reading', () => {
      expect(findings.unseenChecked).toBeGreaterThan(200);
      expect(findings.unseenOff).toEqual([]);
    });

    it('finds a footprint on the books for each shape it reads as on them', () => {
      const missing: string[] = [];
      for (const [shape, row] of findings.booksShapes) {
        if (row.walked > 0 && row.moved === 0) {
          missing.push(`${shape}: ${row.instances} cards, the walk prices ${row.walked} today, none moves the books`);
        }
      }
      expect(findings.booksShapes.size).toBeGreaterThan(15);
      expect(missing).toEqual([]);
    });
  });
});
