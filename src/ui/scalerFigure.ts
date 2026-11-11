/**
 * The figure a Scaler card carries on its face (batch DS8,
 * `docs/plans/deck-simplification-2026-11-10.md`, "Keywords": *"The card face
 * shows its current value"*).
 *
 * A Scaler gains a little each time a thing happens while it is seated. Its
 * sentence says what it gains and when; this figure says what it gives now.
 * Before the first gain the figure is the card's starting value, so the
 * starting value needs no sentence of its own.
 *
 * Plain data in, DOM out, and no simulation import, so the offer card can draw
 * it without crossing its own boundary rule (`offerCard.ts` takes strings and
 * numbers only). `scalerValue.ts` reads the simulation and composes the
 * figure; the card face, the draft hand and the Compendium all print it
 * through here. `goalCounter.ts` is the same arrangement for a commission's
 * counter.
 */

import { element } from './dom';
import { setYieldText } from './yieldMark';

/** A Scaler's value, ready to print. */
export interface ScalerFigure {
  /** The word before the figure: "Value". */
  label: string;
  /** The value, composed in `YIELD_GLYPH`: "+3🔬 +3🎭". Tabular mono on the face. */
  figure: string;
}

/** The word the face prints before a Scaler's figure. */
export const SCALER_LABEL = 'Value';

/** The figure block: the label, then the value through the one yield printer. */
export function scalerFigureNode(reading: ScalerFigure): HTMLElement {
  const block = element('p', 'scaler-figure');
  block.append(element('span', 'scaler-label', reading.label));
  const value = element('span', 'scaler-value');
  setYieldText(value, reading.figure);
  block.append(value);
  return block;
}
