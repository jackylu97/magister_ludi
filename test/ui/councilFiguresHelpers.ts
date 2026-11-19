/**
 * **One reading for a card's figures** — the board and the check both tiers of
 * `councilFigures` share (stage 2 of the Council and In play board,
 * `docs/plans/ui-critique-2026-10-16.md`, "After the Council screen landed").
 *
 * The rule: on the Council screen a card's plate, the chip shown when it is
 * held, and its share of the totals are one reading, for the six yields and
 * for happiness and authority. So for a card seated on a board, its plate is
 * exactly the totals on that board less the totals on the board without it,
 * each rounded as the line prints it; and the council's figure on the board
 * without it is the council's figure less the card's own stamp.
 *
 * A helper module and not a test file, so importing it registers no test
 * (CLAUDE.md, "Commands & test discipline").
 */

import { driveBots } from '../../src/ai/driver';
import { cardImpactWorlds, explainCardImpact } from '../../src/sim/cardImpact';
import type { GameState } from '../../src/sim/state';
import { type OrderId, ORDER_IDS, orderIsDealt } from '../../src/sim/statecraftData';
import {
  type CouncilFigures,
  COUNCIL_VOICES,
  councilFigures,
  councilPlate,
  explainCouncil,
  foldImpactVoices,
} from '../../src/ui/councilTotals';
import { createGame } from '../sim/newGameHelpers';

/** The turn the staged game is played to: a council of five or six chairs. */
const TURNS = 30;

let kept: GameState | null = null;

/** A two-seat duel played by the bots to a mid game, once per worker. Read only. */
export function midGame(): GameState {
  if (kept !== null) return kept;
  const game = createGame({
    seed: 20261118,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e' },
      { name: 'Bors', color: '#3a7fe8' },
    ],
    barbarians: true,
  });
  while (game.state.turn <= TURNS) driveBots(game, { warn: () => {} });
  kept = game.state;
  return kept;
}

/** Every live Order the seat could be asked to seat, in the data's order. */
export function liveOrders(): OrderId[] {
  return ORDER_IDS.filter((id) => orderIsDealt(id));
}

/** What one card's check found: the voices where the plate and the totals parted, and by how much the identity missed. */
export interface FigureCheck {
  id: OrderId;
  plate: CouncilFigures;
  totalsMoved: CouncilFigures;
  identityMiss: number;
}

/**
 * **Seats a card on the stamp's own ghost and checks the one reading.** Null
 * for a card the stamp cannot seat. `before` is the council's exact figures on
 * `state`, read once by the caller.
 */
export function checkCard(state: GameState, seat: number, id: OrderId, onState: Readonly<CouncilFigures>): FigureCheck | null {
  const worlds = cardImpactWorlds(state, seat, { kind: 'order', id });
  if (worlds === null) return null;
  // A card the seat already seats is read backward: the board without it is the ghost.
  const before = worlds.without === state ? onState : foldImpactVoices(explainCouncil(worlds.without, seat));
  const board = worlds.with;
  const card = explainCardImpact(board, seat, { kind: 'order', id });
  const after = foldImpactVoices(explainCouncil(board, seat));
  const own = foldImpactVoices(card);
  const plate = {} as CouncilFigures;
  for (const voice of COUNCIL_VOICES) plate[voice] = 0;
  for (const figure of councilPlate(after, card)) plate[figure.voice] = figure.amount;
  const shown = councilFigures(after);
  const was = councilFigures(before);
  const totalsMoved = {} as CouncilFigures;
  let identityMiss = 0;
  for (const voice of COUNCIL_VOICES) {
    totalsMoved[voice] = shown[voice] - was[voice];
    identityMiss = Math.max(identityMiss, Math.abs(after[voice] - before[voice] - own[voice]));
  }
  return { id, plate, totalsMoved, identityMiss };
}
