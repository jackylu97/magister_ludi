/**
 * The top bar's left end: what the whole empire earns per turn.
 *
 * Five figures — food, production, gold, science, culture — summed across every
 * city the local seat owns, in the colours those yields are always drawn in.
 * It is the one place on the screen that answers "how am I doing" without
 * opening anything, which is why it sits before the turn counter in reading
 * order rather than after it.
 *
 * A pure read, and deliberately a UI-layer one. `cityYields` is the same
 * function the city panel, the banners and the turn pipeline use, so the bar can
 * never promise a number the city screen disagrees with; the *sum* of those
 * numbers is a presentation concern (no rule in the game acts on an empire-wide
 * total yet), so it lives here and `src/sim/` gains nothing.
 *
 * Like every other derived readout it is recomputed wherever the rest of the HUD
 * is — after any dispatch and after every turn. The elements are built once and
 * only their text is rewritten: `updatePanel` runs on pointer movement too, and
 * rebuilding five nodes per mouse-move is work nobody asked for.
 */

import { type CityYields, cityYields } from '../sim/cities';
import type { Game } from '../sim/game';
import type { GameState } from '../sim/state';

/**
 * Everything the player's cities make this turn, added up.
 *
 * A player with no cities makes nothing, which is the honest answer for the
 * first few turns of a game rather than a row of em dashes.
 */
export function civYields(state: GameState, playerId: number): CityYields {
  const total: CityYields = { food: 0, production: 0, gold: 0, science: 0, culture: 0 };
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const yields = cityYields(state, city);
    total.food += yields.food;
    total.production += yields.production;
    total.gold += yields.gold;
    total.science += yields.science;
    total.culture += yields.culture;
  }
  return total;
}

/**
 * The glyph and the accessible name for each yield, in the order the city panel
 * lists them. The glyphs are the specimen's (see `docs/design-specimen.html`)
 * and the same three the context card uses for a tile.
 */
const YIELDS: readonly [keyof CityYields, string, string][] = [
  ['food', '🌾', 'food'],
  ['production', '⚙', 'production'],
  ['gold', '🪙', 'gold'],
  ['science', '🔬', 'science'],
  ['culture', '🎭', 'culture'],
];

export interface CivYieldStrip {
  /** Re-reads the cities and rewrites whichever figures changed. */
  render(): void;
}

export interface CivYieldStripOptions {
  /** The element the figures live in. Filled once, then only rewritten. */
  container: HTMLElement;
  getGame: () => Game;
  localPlayerId: () => number;
}

export function createCivYieldStrip(options: CivYieldStripOptions): CivYieldStrip {
  const { container, getGame, localPlayerId } = options;
  const values = new Map<keyof CityYields, HTMLElement>();

  container.replaceChildren();
  for (const [key, glyph, label] of YIELDS) {
    const item = document.createElement('span');
    item.className = `civ-yield is-${key}`;
    const icon = document.createElement('span');
    icon.className = 'civ-yield-icon';
    icon.textContent = glyph;
    // The glyph is decoration with a word behind it: a screen reader gets
    // "food 14", not "sheaf of rice 14".
    icon.setAttribute('aria-hidden', 'true');
    const value = document.createElement('span');
    value.className = 'civ-yield-value';
    value.textContent = '0';
    item.append(icon, value);
    item.title = `${label} per turn`;
    item.setAttribute('aria-label', label);
    values.set(key, value);
    container.append(item);
  }

  return {
    render(): void {
      const totals = civYields(getGame().state, localPlayerId());
      for (const [key] of YIELDS) {
        const el = values.get(key)!;
        const text = String(totals[key]);
        if (el.textContent !== text) el.textContent = text;
      }
    },
  };
}
