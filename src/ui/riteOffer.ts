/**
 * The words a rite's row offers. A leaf, so the levy menu can read them without
 * importing `controls.ts`, which imports the city panel back (batch DT19).
 */

import { riteDurationLines, riteTurnsFor } from '../sim/religion';
import { type RiteId, riteDef } from '../sim/religionData';
import { cardActionRule } from '../sim/statecraft';
import { capitalCityOf, citiesOf } from '../sim/state';
import type { City, GameState } from '../sim/state';

/**
 * What a rite does and how long it would run if this empire started it now:
 * "+1 science for each building in this town. · lasts 15 turns". The rite row on the city screen prints it (`riteOptions`) and so does
 * the announcement after a rite (`riteSentence`), so the offer and the report
 * are one string.
 *
 * The turns are `riteTurnsFor`'s (batch UX6), the figure the town is stamped
 * with, so The Octave and Chichen Itza are counted. `ritePreview`, which the two
 * printed before, quotes the row's base duration and said 10 where the town
 * would get 15. The words around the figure are `ritePreview`'s own, so the two
 * read alike; when the simulation offers a preview that takes the empire into
 * account (batch UX8b's `explainRitePreview`), this should read that instead.
 *
 * `null` for a row with neither text nor a duration.
 */
export function riteOfferText(state: GameState, playerId: number, id: RiteId, city?: City): string | null {
  const text = riteDef(id).text;
  const turns = riteTurnsFor(state, playerId, id, city);
  const changes = turns === null ? [] : riteDurationLines(state, playerId, city);
  const length = changes.length ? `${riteDef(id).duration} turns, ${changes.map(line => `${line.percent > 0 ? '+' : ''}${line.percent}% ${line.source}`).join(', ')} = ${turns} turns` : `lasts ${turns} turns`;
  const realm = city && capitalCityOf(state, playerId)?.id === city.id && cardActionRule(state, playerId, 'capitalRiteOverRealm');
  const lasts = turns === null ? null : realm ? `${length} in all ${citiesOf(state, playerId).length} towns` : length;
  if (text !== undefined && text !== '' && lasts !== null) return `${text} · ${lasts}`;
  if (text !== undefined && text !== '') return text;
  return lasts;
}
