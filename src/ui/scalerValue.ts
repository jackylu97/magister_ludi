/**
 * A Scaler card's value, read off the simulation for the interface (batch
 * DS8). The collection and the draft hand take it from `scalerFace`, the
 * Compendium and the flair gallery from `scalerStartFace`, so every face prints
 * the same composed figure.
 *
 * The numbers are the simulation's (`scalerFigures`, `statecraft/evaluator.ts`):
 * each voice's starting value, plus one gain for each helping of the card's own
 * tally. This module only turns them into glyphs. Private by construction: the
 * tally is asked of the seat that is looking.
 */

import { type GameState, playerById } from '../sim/state';
import { scalerFigures, tallyOf } from '../sim/statecraft';
import { type OrderId, orderKeyword } from '../sim/statecraftData';
import { METER_GLYPH, YIELD_GLYPH, signedFigure } from './figures';
import { SCALER_LABEL, type ScalerFigure } from './scalerFigure';

/** One voice's glyph, or its word for a voice with no glyph. */
function glyphOf(voice: string): string {
  if (voice in YIELD_GLYPH) return YIELD_GLYPH[voice as keyof typeof YIELD_GLYPH];
  if (voice in METER_GLYPH) return METER_GLYPH[voice as keyof typeof METER_GLYPH];
  return ` ${voice}`;
}

/** The figure for a Scaler that has counted `count`, or `null` for any other card. */
function faceAt(id: OrderId, count: number): ScalerFigure | null {
  if (orderKeyword(id) !== 'scaler') return null;
  const parts = scalerFigures(id, count);
  if (parts.length === 0) return null;
  return {
    label: SCALER_LABEL,
    figure: parts.map((part) => `${signedFigure(part.value)}${glyphOf(part.voice)}`).join(' '),
  };
}

/**
 * **What this Scaler gives this seat now**: its starting value plus what it has
 * gained. A card the seat does not hold shows its starting value, and so does
 * a held card that has not gained yet. `null` for a card that is not a Scaler.
 */
export function scalerFace(state: GameState, playerId: number, id: OrderId): ScalerFigure | null {
  const sc = playerById(state, playerId)?.statecraft;
  return faceAt(id, sc === undefined ? 0 : tallyOf(sc, id));
}

/** **A Scaler's starting value**, for a page with no seat: the Compendium, the flair gallery. */
export function scalerStartFace(id: OrderId): ScalerFigure | null {
  return faceAt(id, 0);
}
