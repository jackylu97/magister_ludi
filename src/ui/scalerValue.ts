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
import { countOf, helpings } from '../sim/statecraft/evaluator';
import { scalerFigures, tallyOf } from '../sim/statecraft';
import { type OrderId, orderDef, orderKeyword } from '../sim/statecraftData';
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
 * A Scaler reads its own tally. Cards that show an empire count read the viewing
 * seat’s current position, including when the card is still in its draft hand.
 */
export function scalerFace(state: GameState, playerId: number, id: OrderId): ScalerFigure | null {
  const def = orderDef(id);
  if (def.showCountValue) {
    const parts: string[] = [];
    for (const effect of def.effects) {
      if (effect.kind !== 'pays' || effect.where !== 'empire' || effect.basis !== 'count' || !effect.to) continue;
      const count = countOf(state, playerId, id, effect);
      const value = (effect.amount ?? 0) * helpings(count, effect.per, effect.max);
      parts.push(`${signedFigure(value)}${glyphOf(effect.to)}`);
    }
    return parts.length ? { label: SCALER_LABEL, figure: parts.join(' ') } : null;
  }
  for (const effect of def.effects) {
    if (effect.kind !== 'pays' || !effect.showCountPercent || effect.percent === undefined) continue;
    const count = countOf(state, playerId, id, effect);
    const percent = effect.percent * helpings(count, effect.per, effect.max);
    return { label: SCALER_LABEL, figure: `${signedFigure(percent)}%` };
  }
  const sc = playerById(state, playerId)?.statecraft;
  return faceAt(id, sc === undefined ? 0 : tallyOf(sc, id));
}

/** **A Scaler's starting value**, for a page with no seat: the Compendium, the flair gallery. */
export function scalerStartFace(id: OrderId): ScalerFigure | null {
  return faceAt(id, 0);
}
