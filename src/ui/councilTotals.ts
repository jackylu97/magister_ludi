/**
 * **The totals line of the Council screen, a card's plate, and the change a
 * held card would make: one reading** (stage 2 of the Council and In play
 * board; `docs/plans/ui-critique-2026-10-16.md`, "After the Council screen
 * landed: figures and drag").
 *
 * The reading is the card stamp's method at the scale of the whole council:
 * `explainCardImpact` with the `council` subject, which is the empire's books
 * on the real board less the books on the same board with every chair empty,
 * no Doctrine and the government's law set aside. It is a labelled list and
 * the totals are its fold (rule 5), for the six yields, for happiness and
 * authority (its two meter lines), and for renown each turn (its renown line,
 * stage 7: the user, 2026-11-19, "lets add renown to the in-play and orders
 * yield screen").
 *
 * Every other figure on the screen is the same reading on another board:
 *
 *   - **the change a held card would make** (frame CH) is the totals on the
 *     board with the card dropped there, less the totals now (`councilChange`).
 *     Putting a card back shows no change, because the board is the same;
 *   - **a card's plate** is what the totals would lose if the card left
 *     (`councilPlate`): the totals now, less the totals without it. The board
 *     without it differs from this one by that card only, so its totals are the
 *     totals now less the card's own stamp, exactly, and no second reading is
 *     taken.
 *
 * Each figure is rounded once, where it is shown, and a plate and a chip are
 * differences of the rounded totals. So the plate of a card is the chip that
 * took it out, and the chip that put it in. A card's figure is what it adds by
 * itself; when cards multiply each other the figures need not add up to the
 * total, and the screen says so in its hint.
 */

import { type CardImpactLine, type CardImpactSheet, type CardImpactSubject, explainCardImpact, foldCardImpact } from '../sim/cardImpact';
import type { MeterId } from '../sim/meters';
import { CITY_YIELD_KEYS } from '../sim/resourceData';
import { slateMemo } from '../sim/slate';
import type { GameState } from '../sim/state';
import { roundYield, roundYieldDifference } from '../sim/yieldFormat';
import type { PlateFigure, PlateVoice } from './orderFace';
import { type StagedSlots, stagedState } from './statecraftStaging';

/** One figure of the totals line: a yield, a meter, or renown each turn. */
export type CouncilVoice = PlateVoice;

/** The two meters, after the six yields, in the order the top bar stands them. */
const METERS: readonly MeterId[] = ['happiness', 'authority'];

/**
 * The nine figures of the totals line, in their order: the six yields, the
 * two meters, then renown each turn, summed over every family (stage 7).
 */
export const COUNCIL_VOICES: readonly CouncilVoice[] = [...CITY_YIELD_KEYS, ...METERS, 'renown'];

/** A figure for each of the nine voices. */
export type CouncilFigures = Record<CouncilVoice, number>;

/**
 * **An impact list's figures, exact**: the fold of its standing lines for the
 * six yields (`foldCardImpact`, knock-ons included, occasions left out), its
 * meter lines for happiness and authority, and its renown line. Not rounded: a plate is a
 * difference of two rounded totals, and rounding first would lose that.
 */
export function foldImpactVoices(lines: readonly CardImpactLine[]): CouncilFigures {
  const yields = foldCardImpact(lines);
  const figures = {} as CouncilFigures;
  for (const key of CITY_YIELD_KEYS) figures[key] = yields[key];
  for (const meter of METERS) figures[meter] = 0;
  figures.renown = 0;
  for (const line of lines) {
    if (line.kind === 'meter' && line.meter !== undefined) figures[line.meter] += line.amount ?? 0;
    if (line.kind === 'renown') figures.renown += line.amount ?? 0;
  }
  return figures;
}

/** One confirmed comparison can appear on several draws while the player rearranges cards. */
export function councilImpact(
  state: GameState,
  seat: number,
  subject: Extract<CardImpactSubject, { kind: 'order' | 'government' | 'doctrine' | 'council' }>,
  sheet?: CardImpactSheet,
): CardImpactLine[] {
  if (sheet?.state !== state || sheet.revision !== state.revision || sheet.playerId !== seat) {
    return explainCardImpact(state, seat, subject);
  }
  const key = `${seat}/${subject.kind}/${'id' in subject ? subject.id : ''}`;
  return slateMemo(state, 'revision', 'uiCouncilImpact', key, () => explainCardImpact(state, seat, subject, sheet));
}

/** **What the whole council pays each turn**, as the labelled list the totals are the fold of. */
export function explainCouncil(state: GameState, seat: number, sheet?: CardImpactSheet): CardImpactLine[] {
  return councilImpact(state, seat, { kind: 'council' }, sheet);
}

/** The totals line's nine figures, rounded once, as the line prints them. */
export function councilFigures(exact: Readonly<CouncilFigures>): CouncilFigures {
  const figures = {} as CouncilFigures;
  for (const voice of COUNCIL_VOICES) figures[voice] = roundYield(exact[voice]);
  return figures;
}

/**
 * **A card's plate on the Council screen**: what the totals would lose if the
 * card left, for each voice where that is not nothing. `council` is the
 * council's exact figures on this board, and `card` the card's own stamp
 * list, which is the difference between this board and the board without it.
 */
export function councilPlate(council: Readonly<CouncilFigures>, card: readonly CardImpactLine[]): PlateFigure[] {
  const own = foldImpactVoices(card);
  const figures: PlateFigure[] = [];
  for (const voice of COUNCIL_VOICES) {
    const amount = roundYield(council[voice]) - roundYieldDifference(council[voice], own[voice]);
    if (amount !== 0) figures.push({ voice, amount });
  }
  return figures;
}

/**
 * **The change an arrangement would make to the totals** (frame CH): the
 * rounded totals on the board as `after` stages it, less the rounded totals as
 * `before` stages it. The same arrangement on both sides is no change. `now`
 * is the totals line's own exact figures, when `before` is the board as it
 * stands, so the chip starts from the very figure the line prints.
 */
export function councilChange(
  state: GameState,
  seat: number,
  before: StagedSlots,
  after: StagedSlots,
  now?: Readonly<CouncilFigures>,
): CouncilFigures {
  const was = councilFigures(now ?? foldImpactVoices(explainCouncil(stagedState(state, seat, before), seat)));
  const will = councilFigures(foldImpactVoices(explainCouncil(stagedState(state, seat, after), seat)));
  const change = {} as CouncilFigures;
  for (const voice of COUNCIL_VOICES) change[voice] = will[voice] - was[voice];
  return change;
}
