/**
 * A city's name exactly as any UI surface should show it to a player: with a
 * ✶ (six-pointed black star) appended when the city is its owner's capital.
 * The specimen's star family (`docs/design-specimen.html`) is otherwise
 * four-pointed — `techTree.ts` already spends ✦/✧ on a tech's own completed/
 * prompting status — so the capital mark uses the six-pointed member of the
 * same family rather than a glyph that would read as a second tech state.
 *
 * `capitalCityOf` (`src/sim/cities.ts`) is the single place the capital rule
 * lives; this only asks it and formats the answer, so a future change to who
 * counts as the capital never needs a second update site. Every place a city
 * name reaches the DOM — the banner over the board, the city panel title, the
 * end-turn blocker's announce lines, the HUD's per-city hover lines — goes
 * through this one formatter rather than reading `city.name` for itself.
 *
 * Capital-ness is a fact about the city, not the viewer: a seat sees the star
 * on every capital it knows about, its own or an enemy's, once it has seen or
 * explored the town — the same visibility rule that lets a banner or sighting
 * name the city at all decides whether the star is on it, not a second check
 * here. The parameter takes the minimal shape rather than a full `City` so a
 * fog-of-war `CitySighting` — which does not keep the palace fact as it stood
 * when last seen — can be named through the same formatter, checked against
 * the *current* capital: the palace is live state, and a remembered name still
 * deserves a true star rather than a stale one.
 */
import { capitalCityOf } from '../sim/cities';
import type { GameState } from '../sim/state';

export function cityDisplayName(
  state: GameState,
  city: { id: number; ownerId: number; name: string },
): string {
  const capital = capitalCityOf(state, city.ownerId);
  return capital?.id === city.id ? `${city.name} ✶` : city.name;
}

/**
 * The capital star, applied to an already-composed line rather than a bare
 * city name.
 *
 * `explainHappiness` / `explainAuthority` (`src/sim/meters.ts`) build each
 * ledger line's `source` as the city's name with a sim-owned suffix bolted on
 * (" · N citizens", " crowding", " · capital", " · coastal", " · captured") —
 * text this UI layer decorates, never re-derives. A prefix match against the
 * capital's own name, guarded to a following space or an exact match so a
 * name that happens to prefix another (`Ur` inside `Uruk`) can never
 * mismatch, finds the one line — or two, for a crowded capital — built from
 * that name and stars it in place; every other line is returned untouched.
 */
export function starCapitalSource(state: GameState, playerId: number, source: string): string {
  const capital = capitalCityOf(state, playerId);
  if (!capital) return source;
  const { name } = capital;
  if (source === name) return `${name} ✶`;
  if (source.startsWith(`${name} `)) return `${name} ✶${source.slice(name.length)}`;
  return source;
}
