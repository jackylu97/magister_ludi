/**
 * What a tile *is*, in words and marks — the vocabulary the hover card speaks.
 *
 * Four describers, lifted out of `src/main.ts` when the mapgen inspection page
 * grew a hover card of its own. They were always the right shape for sharing —
 * each one is a pure function of `(state, seat, tile)` that returns text or
 * nodes and touches no element — and the only reason they lived in the entry
 * point was that nothing else had asked yet.
 *
 * Now two surfaces ask, which is exactly the situation this codebase answers the
 * same way every time: **one place turns the vocabulary into words**. The game's
 * info panel and the mapgen page's card must not be able to describe the same
 * hex two ways, any more than the hover card, the lens roundel and the city
 * panel may describe the same luxury three ways (`describeResourceEffect`).
 *
 * What stays with the caller is the *placement* — which element each row is
 * written into, and how the card is shown and hidden. That is page business and
 * the two pages genuinely differ: the game has a fog to respect and a seat whose
 * eyes it looks through, the inspection page is a spectator with neither.
 */

import {
  type TileYieldContribution,
  cityAt,
  explainCentreYield,
  explainTileYield,
  foldTileYield,
  foundingErrorAt,
  yieldContextFor,
} from '../sim/cities';
import { campAt } from '../sim/camps';
import { improvementDef, improvementForResource } from '../sim/improvementData';
import type { Tile } from '../sim/map';
import { resourceDef } from '../sim/resourceData';
import { describeResourceEffect } from '../sim/resourceEffects';
import {
  type FoundingCost,
  explainFoundingCost,
  foldMeter,
  foundingCostLines,
} from '../sim/meters';
import { type GameState, playerById } from '../sim/state';
import { visibleResourceAt } from '../sim/tech';
import { techDef } from '../sim/techData';
import { TILE_YIELD_KEYS, featureDef, terrainDef } from '../sim/terrainData';
import { hasFreshWater, isCoastal } from '../sim/water';
import { citySightingOf, isExploredBy, isVisibleTo } from '../sim/visibility';
import { cityDisplayName } from './cityDisplay';
import { YIELD_GLYPH, YIELD_NAME, type YieldKey, signedFigure } from './figures';
import { yieldFigureNodes } from './yieldMark';
import { resourceMarkNode } from './resourceMark';

/**
 * Terrain and feature by name, plus whether the hex is hilly.
 *
 * A hex wearing no feature answers `null` rather than the table's `None`: bare
 * ground has no feature, and a row reading "Feature: None" is a label spending a
 * line of a small card to say nothing. `none` is a real row in `terrain.json`
 * (it has a move cost and a defense bonus like any other) — it is only its
 * *name* that is not a thing to tell anybody.
 */
export function describeTile(tile: Tile): {
  terrain: string;
  feature: string | null;
  hills: boolean;
} {
  return {
    terrain: terrainDef(tile.terrain).name,
    feature: tile.feature === 'none' ? null : featureDef(tile.feature).name,
    hills: tile.hills,
  };
}

/**
 * The breakdown the card itemizes for a hex: the ground's own contributions, or
 * the **city centre's** when a town this seat knows about stands on it.
 *
 * Which of the two is not a formatting choice — it is what the hex is worth. A
 * tile under a town is never worked by a citizen; what it pays is
 * `explainCentreYield`'s two lines, floor and inheritance, and a card that went
 * on quoting the grass under the walls would be quoting a number no city
 * collects. Asked of the **city owner's** context inside `explainCentreYield`,
 * which is the standing rule for owned ground (`yieldContextFor`).
 *
 * Fog decides whether the town is there at all, by the same rule the banners
 * keep: a city currently in sight, or one this seat has a sighting of on ground
 * it has explored. A town nobody has seen leaves the ground reading as ground,
 * which is the honest report and not a leak.
 */
export function tileYieldContributions(
  state: GameState,
  playerId: number,
  tile: Tile,
): TileYieldContribution[] {
  const city = cityAt(state, tile.col, tile.row);
  if (city && knowsCity(state, playerId, city.id, tile)) return explainCentreYield(state, city);
  return explainTileYield(tile, yieldContextFor(state, playerId));
}

/**
 * The tile's yields as one span per voice, each figure in the colour that yield
 * is always drawn in — food green, production orange, gold gilt, and so on
 * through all six — and in the mono face, because they are numbers. A tile that
 * produces nothing hands back an empty list, so the caller can print its own
 * "nothing here" rather than six zeroes.
 *
 * The **fold of the itemized lines below** and nothing else, so the total on the
 * card is arithmetic a player can check against the lines under it with their
 * eyes. That is rule 5 read at the surface it was written for: a breakdown whose
 * lines do not add up to the headline is worse than no breakdown at all.
 */
export function tileYieldNodes(
  state: GameState,
  playerId: number,
  tile: Tile,
  // The list, when the caller already has it (2026-08-29). `tileYieldContributions`
  // builds a `yieldContextFor` — the empire's law and its holdings, folded — and
  // the readout draws the headline and the itemization from the *same* hex in
  // the same breath, so asking twice was two folds of one answer on every mouse
  // move. Handed down rather than recomputed beside it: the figure is still the
  // fold of this very list (rule 5), and a caller with nothing in hand gets the
  // call it always made.
  contributions: readonly TileYieldContribution[] = tileYieldContributions(state, playerId, tile),
): HTMLElement[] {
  const value = foldTileYield(contributions);
  // The drawn mark, from the one registry a yield's picture is written down in
  // (`src/art/yieldMarks.ts`, printed here by `src/ui/yieldMark.ts`). The row
  // gets an `aria-label` of its own because this is one of the few surfaces
  // where the figure has *no* word beside it: "2 food" spoken, "2🌾" seen.
  return TILE_YIELD_KEYS.filter((key) => value[key] > 0).map((key) => {
    const span = document.createElement('span');
    span.className = `tile-yield is-${key}`;
    span.append(yieldFigureNodes(String(value[key]), key));
    span.setAttribute('aria-label', `${value[key]} ${YIELD_NAME[key]}`);
    return span;
  });
}

// --- the itemized breakdown -------------------------------------------------

/**
 * One figure of one line: the voice and the number as it is *written*, sign and
 * all. The atom both halves of the printer are built from, so the pure text and
 * the drawn marks cannot come to disagree about what a line says.
 */
export interface TileYieldPart {
  key: YieldKey;
  /** `+1` for a line that adds, `2` for one that replaces. Never empty. */
  text: string;
}

/** One printed line of the breakdown. */
export interface TileYieldLine {
  /** `2🌾 1⚙`, `+1⚙` — composed in glyphs, printed as marks. */
  figures: string;
  /** Its parts, for a printer that draws each voice in its own colour. */
  parts: TileYieldPart[];
  /** What earned them: `Grassland`, `Wheat`, `Mine`, `City centre`. */
  source: string;
  /**
   * A ground line a later `override` has taken over — `Grassland`, under a
   * forest. It is written here because this list is the faithful print of
   * `explainTileYield`'s derivation, and it is what `displayYieldLines` drops:
   * a hex is what it *is*, and a forest's yield is the forest's, not the grass
   * struck through with the trees' figures beside it.
   */
  replaced: boolean;
}

/**
 * The sign a line's figures are written with, which is the fold's two algebras
 * made visible.
 *
 * An `add` — a resource, an improvement, a renewal, the centre's inheritance —
 * is a thing sitting *on* what came before, so it is signed: `+1⚙` is a
 * hammer more than the line above. A `base` or an `override` **replaces**, so
 * it is written plain: `0🌾 2⚙` on a hill is what the hex is worth, not two
 * hammers on top of the grass. Signing a replacement would be the card
 * promising an addition the fold never performs.
 */
function partsOf(entry: TileYieldContribution): TileYieldPart[] {
  const signed = entry.kind === 'add';
  const parts: TileYieldPart[] = [];
  for (const key of TILE_YIELD_KEYS) {
    const value = entry[key];
    if (value === 0) continue;
    parts.push({ key, text: signed && value > 0 ? `+${value}` : String(value) });
  }
  return parts;
}

/**
 * The breakdown as text: one line per contribution, in the order the rules
 * resolve in.
 *
 * The pure half of the printer, split out for the reason `splitYieldText` is —
 * this suite has no jsdom, and *what the card says* is the half that can be
 * quietly wrong. `tileYieldLineNodes` is this plus `document`.
 *
 * A line that pays nothing at all still gets a `0`: `Desert` paying nothing is
 * a fact about the hex a player came to the card for, and a blank figure column
 * beside a name reads as a bug. `replaced` is derived here rather than in the
 * simulation because it is a *typographic* fact — the last `base`/`override` is
 * the one that stands, every earlier one is history. What a surface *does* with
 * that history is `displayYieldLines`'s business, and today it drops it.
 */
export function tileYieldLines(
  state: GameState,
  playerId: number,
  tile: Tile,
  /** The list, when the caller already has it — see `tileYieldNodes`. */
  contributions: readonly TileYieldContribution[] = tileYieldContributions(state, playerId, tile),
): TileYieldLine[] {
  const list = contributions;
  let standing = -1;
  list.forEach((entry, index) => {
    if (entry.kind !== 'add') standing = index;
  });
  return list.map((entry, index) => {
    const parts = partsOf(entry);
    return {
      // A line that pays nothing at all is written `0`, with no mark: `0🌾`
      // would name a voice the line says nothing about, and bare desert paying
      // nothing is a fact somebody came to the card for.
      figures:
        parts.length === 0
          ? '0'
          : parts.map((part) => `${part.text}${YIELD_GLYPH[part.key]}`).join(' '),
      parts,
      source: entry.source,
      replaced: entry.kind !== 'add' && index !== standing,
    };
  });
}

/**
 * The **presentation fold**: the lines a player is actually shown.
 *
 * The simulation's list is a *derivation* — grassland, then forest taking it
 * over, then hills taking that over — and printing a derivation is what the
 * struck-through "Grassland" row was. But nobody hovering a wood asks what the
 * ground would have been worth if the trees were not there; a forest on
 * grassland simply *is* a forest, and its yield is the tile's base yield. So
 * every superseded ground line is dropped and the one that stands is the base
 * line, named for what the hex is now — `Forest`, or `Hills` on a forested
 * hill, which is the entry whose figures the fold keeps.
 *
 * Pure, and pure *presentation*: `explainTileYield` still writes every step and
 * `foldTileYield` still folds all of them. Dropping a replaced line cannot
 * change the arithmetic, because a replaced line is by definition one a later
 * `base`/`override` overwrote — which is exactly what `replaced` records.
 */
export function displayYieldLines(lines: readonly TileYieldLine[]): TileYieldLine[] {
  return lines.filter((line) => !line.replaced);
}

/**
 * The same list, or nothing at all when there is no sum to show.
 *
 * A breakdown earns its space by explaining a number that would otherwise be
 * mysterious. After the fold above, a hex with no modifier on it has exactly
 * one line — its ground — and that line's figures *are* the total printed above
 * it. Printing it anyway is a ledger whose single entry restates its own sum,
 * which reads as a calculation where none happened.
 *
 * So: two or more lines is an account and gets itemized; one line is a plain
 * figure. "Modifier" here is precisely *anything the fold left beside the
 * ground* — a resource, an improvement, a renewal, a card's or a building's or
 * a rite's tile line, the city centre's inheritance — because they are all the
 * same `add` entry to the list, and the card has no business asking which kind
 * of thing earned a line when the simulation deliberately does not.
 */
export function itemisedYieldLines(lines: readonly TileYieldLine[]): TileYieldLine[] {
  const shown = displayYieldLines(lines);
  return shown.length > 1 ? shown : [];
}

/**
 * The breakdown as elements: one row per line, its figures drawn in their own
 * voices beside the name of what earned them — or **no rows at all** for a hex
 * whose yield is just its ground (`itemisedYieldLines`).
 *
 * Each row carries its own `aria-label` in words — "2 food, 1 production from
 * Grassland" — because the marks are `aria-hidden` decoration (see
 * `yieldMarkNode`) and a reader that met this list without one would be handed
 * a column of bare numbers with no units.
 */
export function tileYieldLineNodes(
  state: GameState,
  playerId: number,
  tile: Tile,
  /** The list, when the caller already has it — see `tileYieldNodes`. */
  contributions: readonly TileYieldContribution[] = tileYieldContributions(state, playerId, tile),
): HTMLElement[] {
  return itemisedYieldLines(tileYieldLines(state, playerId, tile, contributions)).map((line) => {
    const row = document.createElement('li');
    row.className = 'yield-line';
    const figures = document.createElement('span');
    figures.className = 'yield-line-figures';
    if (line.parts.length === 0) figures.textContent = line.figures;
    for (const part of line.parts) {
      const span = document.createElement('span');
      span.className = `tile-yield is-${part.key}`;
      span.append(yieldFigureNodes(part.text, part.key));
      figures.append(span);
    }
    const source = document.createElement('span');
    source.className = 'yield-line-source';
    source.textContent = line.source;
    row.append(figures, source);
    const spoken = line.parts
      .map((part) => `${part.text} ${YIELD_NAME[part.key]}`)
      .join(', ');
    row.setAttribute('aria-label', `${spoken} from ${line.source}`);
    return row;
  });
}

// --- what stands on the hex -------------------------------------------------

/**
 * Does this seat know there is a town here?
 *
 * The banners' rule, asked in one place so the card and the label over the
 * board cannot disagree: a city **in sight**, or one this seat holds a sighting
 * of on ground it has explored. The explored check is what keeps a hand-edited
 * save from floating a remembered town over Terra Incognita — the same guard
 * `cityBanners.ts` makes, and for the same reason.
 *
 * Exported since the unit sheet started *naming* a march's destination
 * (`marchDestination`, `unitPanel.ts`): "marching to Uruk" about a town this
 * seat has never laid eyes on would be a leak dressed as a convenience, and a
 * second copy of this rule is how the two surfaces would come to disagree about
 * a remembered city.
 */
export function knowsCity(state: GameState, playerId: number, cityId: number, tile: Tile): boolean {
  if (isVisibleTo(state, playerId, tile.col, tile.row)) return true;
  return (
    citySightingOf(state, playerId, cityId) !== null &&
    isExploredBy(state, playerId, tile.col, tile.row)
  );
}

/** What a site of each kind is called, once, for every surface that names one. */
const SITE_NAME: Readonly<Record<'ruins' | 'village', string>> = {
  ruins: 'Ancient ruins',
  village: 'Tribal village',
};

/**
 * Who or what is standing on the hex, in the seat's own words — the card's
 * "occupant" row.
 *
 * Three things can be here and they are asked in the order they outrank each
 * other: a **city** (the walls are the answer, whatever else the tile once
 * was), a **camp**, then a **discovery site**. A unit is deliberately not in
 * this list — pieces have their own row and their own panel; this row is about
 * what is *planted* here.
 *
 * Each obeys the fog rule its own kind obeys everywhere else, which is the
 * whole reason this is one function rather than three lines in a page:
 *
 *   city       in sight, or remembered from a sighting on explored ground —
 *              the banners' rule (`knowsCity`), so a town read from memory is
 *              named and marked `remembered` rather than silently quoted as
 *              current.
 *   camp       **currently visible only.** A camp is an *occupation*, not
 *              ground: a remembered one would be a banner a player sends a
 *              warrior at ten turns after it burnt out (the split in
 *              `sites3d.ts`).
 *   site       ground, and so it survives on remembered hexes — exactly what
 *              the board draws there. A site is unclaimed by construction
 *              (`Tile.discovery` can only ever be *removed*), and the row says
 *              so out loud: "still there to be taken" is the question somebody
 *              hovering a ruin two hexes from a scout is actually asking.
 *
 * `omniscient` is the inspection page's reading, the same liberty its resource
 * lens already takes: a spectator with no seat of its own would otherwise be
 * told nothing about the ground it exists to inspect.
 *
 * **`null` when nothing is planted here**, which is the shape every describer
 * on this card now speaks: a row with nothing to say is a row the game does not
 * draw, and "Occupant: —" is a label the player has to read to learn that there
 * was nothing to read. The em dash, where a surface still wants one, is that
 * surface's own fallback (the inspection page keeps it).
 */
export function describeOccupant(
  state: GameState,
  playerId: number,
  tile: Tile,
  omniscient = false,
): string | null {
  const city = cityAt(state, tile.col, tile.row);
  if (city && (omniscient || knowsCity(state, playerId, city.id, tile))) {
    const owner = state.players[city.ownerId]?.name ?? '—';
    const seen = omniscient || isVisibleTo(state, playerId, tile.col, tile.row);
    // The star and the name come from `cityDisplayName`, the one formatter a
    // city's name reaches a player through — capital-ness is a live fact, so a
    // remembered town still gets a true star (see that module).
    return `${cityDisplayName(state, city)} — ${owner}${seen ? '' : ' · remembered'}`;
  }

  if (
    campAt(state, tile.col, tile.row) !== null &&
    (omniscient || isVisibleTo(state, playerId, tile.col, tile.row))
  ) {
    return 'Barbarian camp';
  }

  const site = tile.discovery;
  if (site && (omniscient || isExploredBy(state, playerId, tile.col, tile.row))) {
    return `${SITE_NAME[site]} — unclaimed`;
  }

  return null;
}

/**
 * What has been *built* on the tile, or `null` on ground nobody has worked.
 *
 * No technology gate and no seat: an improvement is a thing somebody put on the
 * ground, and unlike a strategic resource there is nothing about it to
 * recognise.
 */
export function describeImprovement(tile: Tile): string | null {
  const id = tile.improvement;
  if (id === undefined) return null;
  const def = improvementDef(id);
  return `${def.emoji} ${def.name}`;
}

/**
 * What kind of water this hex has, or `null` when it has none.
 *
 * Two independent facts, and they are two because the game treats them as two.
 * **Coastal** is `isCoastal` — a neighbouring `coast` hex, the sea specifically,
 * which is what a harbour needs and what the settler lens washes blue.
 * **Fresh water** is `hasFreshWater` — a lake, a river edge or an oasis next
 * door, which is what a farm drinks and what a city site is scored for. A hex
 * can have both, one, or neither, so they are joined rather than ranked.
 *
 * Asked of the simulation's own two accessors, never re-derived: `water.ts` says
 * in so many words that nothing outside it should read `Tile.freshwater`
 * directly, and the day the coast test changes the card follows for free. The
 * settler lens paints from exactly these two, which is the point — a player who
 * has seen the blue wash and then hovers the hex should be told the same thing
 * in words.
 *
 * `null` rather than a dash for the reason every describer on this card answers
 * `null`: a row saying "Water: none" is a line the player has to read in order
 * to learn there was nothing to read. Dry inland ground simply has no water row.
 */
export function describeWater(state: GameState, tile: Tile): string | null {
  const parts: string[] = [];
  if (isCoastal(state.map, tile)) parts.push('Coastal');
  if (hasFreshWater(tile)) parts.push('Fresh water');
  return parts.length === 0 ? null : parts.join(' · ');
}

/**
 * What founding a city on this hex would cost the two empire meters, in one
 * line: `−2 authority · −1 happiness`.
 *
 * The **fold** of `explainFoundingCost`, per meter, and nothing else (CLAUDE.md
 * rule 5): the sim priced the lines with the same readers the meters themselves
 * use, and this only sums each half and writes it in the house voice. So a
 * harbour reads `−1 authority` because the rule discounts a coastal town, an
 * empire holding Thalassocracy reads whatever that card made it, and the very
 * first city reads `0 authority` — the capital's free ride, said out loud rather
 * than left off, because "this one is free" is the most useful thing the line
 * has to say the one time it is true.
 *
 * Both meters always, in the order the top bar carries them, and never a row of
 * one: a founding costs on both sides and a player choosing a hex is weighing
 * them against each other. `signedFigure` is the same printer the meter chips
 * and their hover cards use, so the figures on this card and the figures on the
 * bar are set in one voice.
 *
 * The caller decides *when* to ask — the settler lens, on ground a city may
 * actually stand on. This function has no opinion about legality; a hex that
 * refuses a city has no founding row at all, which is this card's word for
 * "there is nothing to say here".
 */
export function foundingCostText(lines: readonly FoundingCost[]): string {
  const authority = foldMeter(foundingCostLines(lines, 'authority'));
  const happiness = foldMeter(foundingCostLines(lines, 'happiness'));
  return `${signedFigure(authority)} authority · ${signedFigure(happiness)} happiness`;
}

/**
 * The founding row itself: that line on a hex a city may stand on, `null` on one
 * it may not.
 *
 * The refusal is `foundingErrorAt` — **the reducer's own**, and the very call
 * the settler lens washes a hex crimson with — so the row and the wash cannot
 * come to disagree about where a town may go, and the spacing rule has no second
 * reading anywhere in the interface. That is the same bargain `describeOccupant`
 * makes with the fog rules and `resourceRequirementOf` makes with
 * `openedResource`: this module decides the *words*, never the rule behind them.
 *
 * `null` for "draw no row", this card's word throughout: a hex that refuses a
 * city has nothing to say about what a city there would cost, and a line quoting
 * a price for ground the game will not sell is worse than silence.
 *
 * *When* to ask is the caller's — the settler lens is up, the seat has explored
 * the hex — because that is placement rather than rule (see `updateContext` in
 * `src/main.ts`).
 */
export function foundingCostRow(
  state: GameState,
  playerId: number,
  tile: Tile,
): string | null {
  if (foundingErrorAt(state, playerId, tile) !== null) return null;
  return foundingCostText(explainFoundingCost(state, playerId, tile));
}

/**
 * What a seam still wants before it pays: the improvement that opens it, the
 * technology that teaches the improvement, and whether this seat holds it.
 *
 * The playtest's note (user, 2026-08-27) and the honest answer to a question the
 * card was leaving on the board: a player hovers Gems, reads "Gems (luxury)",
 * and has no way to learn from that card that the seam is worth nothing until
 * somebody researches Mining and walks a worker over. `openedResource`
 * (`cities.ts`) is the register of what "opens" means and its middle clause is
 * this one — the improvement on the tile — so this reads the same table from the
 * same end: `improvementForResource` inverts `improvesResource`, and the tech is
 * the improvement row's own `requiresTech`.
 *
 * Deliberately silent in the two cases where there is nothing to want:
 *
 *   · **the improvement is already standing here** — the seam is open, and a
 *     line telling a player to build the mine they built is furniture.
 *   · **nothing improves this resource** and **no technology gates the
 *     improvement** — the first is a data row that opens itself, the second an
 *     improvement anybody can lay from turn one; neither is news.
 *
 * The seat's holding rides out as a flag rather than as a second sentence, so
 * the *caller* decides what a want looks like — vermilion for a technology this
 * empire lacks, plain ink for one it holds. That split is `TileYieldPart`'s: the
 * words are decided here, the ink where the ink is.
 *
 * The **first** clause of `openedResource` is not repeated here on purpose. A
 * resource this empire cannot yet *name* has no row on this card at all
 * (`visibleResourceAt` answers `null`), so by the time anything asks this
 * question the reveal tech has already landed — and a hex that said "requires
 * Mine (Mining)" under a resource it refuses to name would be the card leaking
 * the thing the gate exists to hide.
 */
export interface ResourceRequirement {
  /** "requires Mine (Mining)" — the whole line, ready to print. */
  text: string;
  /** True when this seat holds the technology. Plain ink; false is the alarm. */
  held: boolean;
}

export function resourceRequirementOf(
  state: GameState,
  playerId: number,
  tile: Tile,
): ResourceRequirement | null {
  const id = visibleResourceAt(state, playerId, tile);
  if (id === null) return null;
  const needed = improvementForResource(id);
  if (needed === null) return null;
  if (tile.improvement === needed) return null;
  const def = improvementDef(needed);
  const gate = def.requiresTech;
  if (gate === undefined) return null;
  const player = playerById(state, playerId);
  return {
    text: `requires ${def.name} (${techDef(gate).name})`,
    held: player !== undefined && player.techsResearched.includes(gate),
  };
}

/**
 * The resource row: the drawn mark, the name, and the kind.
 *
 * Nodes rather than a string, which is what the drawn mark costs and all it
 * costs: the mark is an element carrying a CSS mask (see
 * `src/ui/resourceMark.ts`), so this row is the one line of the card that
 * cannot be a `textContent` assignment.
 *
 * Asked of `visibleResourceAt`, which is the simulation's own answer and the
 * same one the resource lens draws from, so the card and the board cannot
 * disagree about whether this empire has heard of iron yet. A tile whose
 * resource is hidden answers `null` exactly like a tile with nothing on it —
 * the honest report of "you do not know of anything here", and the same "no row
 * at all" the other describers now speak.
 */
export function resourceRowNode(state: GameState, playerId: number, tile: Tile): Node | null {
  const id = visibleResourceAt(state, playerId, tile);
  if (id === null) return null;
  const def = resourceDef(id);
  // A luxury's *signature* is the reason to want this seam rather than the next
  // one, so the readout names it — through `describeResourceEffect`, the one
  // place the vocabulary is turned into words.
  const signature = describeResourceEffect(id);
  const kind = signature === null ? def.kind : `${def.kind} · ${signature}`;
  const row = document.createDocumentFragment();
  row.append(resourceMarkNode(id));
  row.append(document.createTextNode(` ${def.name} (${kind})`));
  return row;
}

/**
 * The requirement line as an element, or `null` when there is nothing to want.
 *
 * The DOM half of `resourceRequirementOf`, three lines of it, exactly as
 * `tileYieldLineNodes` is the DOM half of `tileYieldLines` — the words and the
 * decision are pure and testable, and this turns them into a span with the ink
 * on it. `is-wanting` is the class the stylesheet paints vermilion; a technology
 * the empire already holds gets no modifier and reads in the card's own ink,
 * because at that point the line is an instruction rather than a warning.
 *
 * A `title` too, since the class is the only thing carrying "you cannot do this
 * yet" and a colour is not a thing a screen reader can read out.
 */
export function resourceRequirementNode(
  state: GameState,
  playerId: number,
  tile: Tile,
): HTMLElement | null {
  const want = resourceRequirementOf(state, playerId, tile);
  if (want === null) return null;
  const span = document.createElement('span');
  span.className = want.held ? 'tile-requires' : 'tile-requires is-wanting';
  span.textContent = want.text;
  span.title = want.held
    ? 'Your workers can open this seam.'
    : 'This seam pays nothing until the technology lands.';
  return span;
}
