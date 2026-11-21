/**
 * The words a rite's row offers. A leaf, so the levy menu can read them without
 * importing `controls.ts`, which imports the city panel back (batch DT19).
 */

import { type RiteDurationLine, riteTurnsFor } from '../sim/religion';
import { type RiteId, riteDef } from '../sim/religionData';
import { cardActionRule } from '../sim/statecraft';
import { capitalCityOf, citiesOf } from '../sim/state';
import type { City, GameState } from '../sim/state';

/** The city menu and announcement share the duration and its sources with the game rules. */
export function riteOfferText(state: GameState, playerId: number, id: RiteId, city?: City): string | null {
  const rite = riteDef(id);
  const changes: RiteDurationLine[] = [];
  const turns = riteTurnsFor(state, playerId, id, city, changes);
  const text = rite.text;
  const modifiers = changes.map(line => `${line.percent > 0 ? '+' : ''}${line.percent}% ${line.source}`);
  const length = modifiers.length
    ? `${rite.duration} turns, ${modifiers.join(', ')} = ${turns} turns`
    : `lasts ${turns} turns`;
  const realm = city && capitalCityOf(state, playerId)?.id === city.id && cardActionRule(state, playerId, 'capitalRiteOverRealm');
  const lasts = turns === null ? null : realm ? `${length} in all ${citiesOf(state, playerId).length} towns` : length;
  if (text !== undefined && text !== '' && lasts !== null) return `${text} · ${lasts}`;
  if (text !== undefined && text !== '') return text;
  return lasts;
}
