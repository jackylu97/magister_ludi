/**
 * **The totals line of the Council screen, and the change a held card would make**
 * (the Council screen, stage 1; the board's N4 and CH frames in
 * `docs/plans/mockups/scholars-study/council-and-in-play/`).
 *
 * The totals line is one fine line of eight figures in the screen's head: the
 * six yields, a hairline, then happiness and authority. Each figure is what
 * the cards pay this turn, read from the game's own folds:
 *
 *   - the six yields are `foldDeck`'s figure, the Ledger's deck class, which
 *     is what the head printed before this stage;
 *   - happiness and authority are the deck's share of each meter's own list
 *     (`explainHappiness`, `explainAuthority`): every line a card paid
 *     (`meterCardShares`), for the cards the Ledger files under the deck
 *     (`classifyCard`). The same split the Ledger takes of a yield.
 *
 * Rule 5 holds: no figure here is a sum of the cards' plates. A plate is what
 * one card changes (`explainCardImpact`); the total is the fold of the lists.
 *
 * **The change a held card would make** (frame CH) is the same eight figures
 * read twice, on the board as the player has staged it and on the board with
 * the held card dropped on the chair under it, and the difference between the
 * two. Both boards are the staging layer's read-only shadows
 * (`stagedState`), so the turn's own evaluators answer and nothing is
 * reimplemented. It costs two readings of the empire, so the screen asks it
 * once each time the chair under the card changes, never on a pointer move.
 */

import { classifyCard } from '../sim/ledgerClass';
import { explainDeckLedger } from '../sim/ledgerFold';
import { type MeterContribution, type MeterId, explainAuthority, explainHappiness, meterCardShares } from '../sim/meters';
import { CITY_YIELD_KEYS, type CityYieldKey } from '../sim/resourceData';
import { type GameState, playerById } from '../sim/state';
import type { CardId } from '../sim/statecraftData';
import { roundYield } from '../sim/yieldFormat';
import { type StampReading, stampFigures } from './cardStamp';
import { YIELD_GLYPH } from './figures';
import { foldDeck } from './ledgerScreen';
import type { PlateFigure } from './orderFace';
import { type StagedSlots, stagedState } from './statecraftStaging';

/** One figure of the totals line: a yield or a meter. */
export type CouncilVoice = CityYieldKey | MeterId;

/** The two meters, after the six yields, in the order the top bar stands them. */
const METERS: readonly MeterId[] = ['happiness', 'authority'];

/** The eight figures of the totals line, in their order. */
export const COUNCIL_VOICES: readonly CouncilVoice[] = [...CITY_YIELD_KEYS, ...METERS];

/** A figure for each of the eight voices. */
export type CouncilFigures = Record<CouncilVoice, number>;

/** What the cards paid of one meter's list: the deck's lines and shares. */
function deckShareOf(list: readonly MeterContribution[], counts: (card: CardId) => boolean): number {
  let total = 0;
  for (const entry of list) {
    for (const share of meterCardShares(entry)) if (counts(share.card)) total += share.value;
  }
  return total;
}

/**
 * **What the cards pay into happiness and authority**: the deck's share of
 * each meter's own list. See the module docblock.
 */
export function foldDeckMeters(state: GameState, seat: number): Record<MeterId, number> {
  const deck = (card: CardId): boolean => classifyCard(card) === 'deck';
  return {
    happiness: roundYield(deckShareOf(explainHappiness(state, seat), deck)),
    authority: roundYield(deckShareOf(explainAuthority(state, seat), deck)),
  };
}

/**
 * **The eight figures of the totals line**: `foldDeck`'s reading, read back by
 * its glyphs (a voice it leaves out pays nothing), then the two meters.
 */
export function councilFigures(deck: StampReading, meters: Readonly<Record<MeterId, number>>): CouncilFigures {
  const figures = {} as CouncilFigures;
  for (const key of CITY_YIELD_KEYS) {
    figures[key] = stampFigures(deck).find((figure) => figure.glyph === YIELD_GLYPH[key])?.amount ?? 0;
  }
  for (const meter of METERS) figures[meter] = meters[meter];
  return figures;
}

/** The eight figures of a board, read from its own folds. */
function figuresOfBoard(state: GameState, seat: number): CouncilFigures {
  return councilFigures(foldDeck(state, seat), foldDeckMeters(state, seat));
}

/**
 * **The change an arrangement would make to the totals**: the eight figures
 * on the board as `after` stages it, less the same figures as `before` stages
 * it. Each voice is rounded as the totals line prints it.
 */
export function councilChange(state: GameState, seat: number, before: StagedSlots, after: StagedSlots): CouncilFigures {
  const was = figuresOfBoard(stagedState(state, seat, before), seat);
  const will = figuresOfBoard(stagedState(state, seat, after), seat);
  const change = {} as CouncilFigures;
  for (const voice of COUNCIL_VOICES) change[voice] = roundYield(will[voice] - was[voice]);
  return change;
}

/**
 * **What the government pays this turn**, for its plate on the Council
 * screen: its own line of the Ledger's per-card split (`explainDeckLedger`),
 * and its own shares of the two meters' lists. The card stamp cannot measure
 * the government in force (there is no board without one), so this is the
 * Ledger's reading of it. Empty when it pays nothing each turn.
 */
export function governmentPays(state: GameState, seat: number): PlateFigure[] {
  const government = playerById(state, seat)?.statecraft.government;
  if (government === undefined) return [];
  const own = (card: CardId): boolean => card === government;
  const line = explainDeckLedger(state, seat).find((entry) => entry.card === government);
  const figures: PlateFigure[] = [];
  for (const key of CITY_YIELD_KEYS) {
    const amount = roundYield(line?.paid[key] ?? 0);
    if (amount !== 0) figures.push({ voice: key, amount });
  }
  const meters: Record<MeterId, number> = {
    happiness: roundYield(deckShareOf(explainHappiness(state, seat), own)),
    authority: roundYield(deckShareOf(explainAuthority(state, seat), own)),
  };
  for (const meter of METERS) if (meters[meter] !== 0) figures.push({ voice: meter, amount: meters[meter] });
  return figures;
}
