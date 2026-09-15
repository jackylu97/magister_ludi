/**
 * **What a town founded here would be worth — the one reading, shared.**
 *
 * The bot has appraised sites since the first settler walked; the board has
 * shown the player a blue wash and nothing else. Two readings of the same
 * question drift, and the day the marker and the settler disagree about a hex
 * is the day the marker is a lie. So the question is asked **once**, here, and
 * both read the answer: `explainSite` returns the labelled list (rule 5),
 * `foldSite` is its one sum, and `readSites` in `readings.ts` is the memo that
 * ranks the seat's own ground on the revision.
 *
 * ---
 *
 * **What the two readers share, and what they do not.**
 *
 * They share everything that is a fact about the board: the ring's hexes and
 * what each pays *through the seat's own eyes* (rule 5's `ctx` — a seam this
 * empire cannot yet name pays nobody, and the marker must not point at iron the
 * player has never heard of), the weighted worth of a hex, the water, the seams
 * in reach, the coast, the hills, and how close the empire's own nearest town
 * stands. `site.ringRadius` and `site.yieldWeights` moved out of `data/ai.json`
 * into `rules.sites` for exactly this reason — a second weight table beside this
 * one is the fault the settle audit named (`settlerCommand`'s docblock), and two
 * of them would put the icon on one hex and the settler on another.
 *
 * What the bot keeps to itself is **time**: which citizen works which hex and
 * how many turns out, what a spade would add once a node lands, how far the
 * settler still has to walk. None of that is a fact about the site — it is a
 * fact about the empire's clock — and none of it can be drawn on a hex. So the
 * bot folds this reading's ring through its own growth curve and its own
 * discounts (`explainSiteValue`, `bot.ts`), and the fold here is the plain one:
 * what the ground is, weighed once, for a marker that has no clock.
 *
 * ---
 *
 * **The ring is two, and the work radius is three.** A town works out to
 * `cities.workRadius`, but it does not work out to three on the turn it is
 * founded, or for a long time after: its borders have to grow there and a
 * citizen has to be born to stand on it. `sites.ringRadius` is what a young town
 * actually reaches, and it is the figure the bot's settle table already used.
 *
 * **Foundability and fog are not asked here.** `explainSite` answers about the
 * ground, the way `foundingErrorAt` answers about the tile — a caller with a
 * reason to ask about a hex nobody could found on gets an honest appraisal of
 * it. The gates belong to the sweep (`rankSites`), which is where "would the
 * rules take a city" and "has this seat charted it" are one clause each.
 */

import { citiesOf, playerById, type GameState } from './state';
import {
  getTileAt,
  mapRange,
  tileHex,
  tileIndex,
  wrappedDistance,
  type Tile,
} from './map';
import { foundingErrorAt } from './cities';
import { resourceDef, resourceIsVisibleTo, type ResourceId } from './resourceData';
import { RULES } from './rulesData';
import { slateMemo } from './slate';
import type { TileYield } from './terrainData';
import { unitDef } from './unitData';
import { isExploredBy } from './visibility';
import { hasFreshWater, isCoastal } from './water';
import {
  explainTileYield,
  foldTileLines,
  yieldContextFor,
  type TileYieldContext,
} from './yields/hex';

/** One line of a site's appraisal: what it is, and what it is worth. */
export interface SiteLine {
  /** Plain enough to print, though the words the player reads are composed
   * from the reading's *facts* rather than from these labels — a label carries
   * a figure and rule 7 keeps figures out of prose. */
  label: string;
  value: number;
}

/** One hex of the ring, as the seat sees it. */
export interface SiteRingHex {
  col: number;
  row: number;
  /** Steps from the centre. Zero is the centre itself. */
  steps: number;
  /** Tile index — the tie-break, a fact about the board rather than the walk. */
  at: number;
  /** What it pays this seat, folded. */
  yields: TileYield;
  /** `siteWorth(yields)` — the one weighing, taken once. */
  worth: number;
}

/** A seam in the ring, and the hex it was first seen on. */
export interface SiteSeam {
  id: ResourceId;
  col: number;
  row: number;
}

/**
 * A site's whole reading: the labelled list, its fold, and the **facts** the
 * words are written from.
 *
 * `explainCity`'s shape — a record around its list — for `explainCity`'s reason:
 * the walk produces more than one artefact and every reader wants a different
 * one. The lens ranks on `total`, the hover card names `luxuries` and reads
 * `freshWater`, and the bot re-folds `ring` through its own clock.
 */
export interface SiteReading {
  col: number;
  row: number;
  /** The labelled list. `total` is its fold and nothing else. */
  lines: SiteLine[];
  total: number;
  /** The centre and its ring, in map-range order — the expensive walk, once. */
  ring: readonly SiteRingHex[];
  /** The centre hex's own reading, lifted out of `ring` for the callers that
   * price the free hex a town works from the turn it stands. */
  centre: SiteRingHex | null;
  /**
   * **Every seam in the ring, once per kind**, in map-range order, with the hex
   * it was first seen on — and deliberately *ungated*.
   *
   * The reveal gate is a rule about what an empire may be **told**, and the two
   * readers want opposite halves of it. What the board shows must be gated or
   * the marker would advertise iron the player has never heard of; what a
   * settler *walks to* is not, because a seam is worth holding whether or not
   * the empire can name it yet and the kind bonus was never a claim about
   * knowledge (`explainSiteValue`'s docblock, `bot.ts`). So the whole list is
   * here, the nameable half is below, and each reader takes the one it means.
   */
  seams: readonly SiteSeam[];
  /** Of those, the luxuries this seat may be told about — what the words name. */
  luxuries: readonly ResourceId[];
  /** Of those, the strategic seams it may be told about. */
  strategics: readonly ResourceId[];
  freshWater: boolean;
  coast: boolean;
  /** How many hexes of the ring are hills — the ground a town works for stone. */
  hills: number;
  /** Steps to this empire's nearest town, or `null` when it holds none. */
  nearestTown: number | null;
  /** The food the counted hexes pay — the "strong food" the words read. */
  food: number;
  /** Their production, likewise. */
  production: number;
}

/** A ranked candidate: the hex, and why. */
export interface SiteCandidate {
  col: number;
  row: number;
  reading: SiteReading;
}

/**
 * **The one weighing of a hex**, in the site's own currency.
 *
 * Exported because the bot values a *spade's* promise in the same units — what
 * a farm would add to this hex is a delta in yields, and a delta has to be
 * weighed by the table that weighed the hex or the two cannot be added.
 *
 * The key order of `sites.yieldWeights` is load-bearing in the sense that
 * nothing may depend on it: this walks the weights, not the yields, so a voice
 * the table does not name is worth nothing rather than worth a guess.
 */
export function siteWorth(yields: TileYield): number {
  let worth = 0;
  for (const [voice, weight] of Object.entries(RULES.sites.yieldWeights) as [
    string,
    number,
  ][]) {
    const value = (yields as unknown as Record<string, number>)[voice];
    if (typeof value === 'number') worth += value * weight;
  }
  return worth;
}

/** The one sum of a site's list. Rule 5: the total is the fold, never beside it. */
export function foldSite(lines: readonly SiteLine[]): number {
  let total = 0;
  for (const line of lines) total += line.value;
  return total;
}

/**
 * **The seat's reading of unowned ground, once per seat per economy clock.**
 *
 * `yieldContextFor` walks two card tables, and a settler prices two hundred
 * candidate hexes in one decision. The bot used to hoist this by hand and hand
 * it down through four signatures; the hoist moved in here when the reading did,
 * so every caller — the lens, the hover card, the bot — pays for it once.
 *
 * On the **economy** clock (`slate.ts`, "the two clocks"): what this resolves is
 * the empire's law and its holdings, and neither can see where a piece is
 * standing. A seat that spends its turn marching keeps the answer it had.
 */
function groundContext(state: GameState, playerId: number): TileYieldContext | undefined {
  return slateMemo(state, 'economy', 'siteGround', String(playerId), () =>
    yieldContextFor(state, playerId),
  );
}

/** Steps to the nearest town this empire holds, or `null` when it holds none. */
function stepsToOwnTown(state: GameState, playerId: number, tile: Tile): number | null {
  const here = tileHex(tile);
  let nearest: number | null = null;
  for (const city of citiesOf(state, playerId)) {
    const town = getTileAt(state.map, city.col, city.row);
    if (town === undefined) continue;
    const steps = wrappedDistance(state.map, here, tileHex(town));
    if (nearest === null || steps < nearest) nearest = steps;
  }
  return nearest;
}

/**
 * **What a town founded on this hex would be worth to this seat** — the
 * labelled list, and the facts it was written from.
 *
 * The order of the list is the order a player would say it in: the ground
 * first, then the water, then the seams, then the shape of the place, then how
 * crowded it is. Nothing here is a multiplication — every clause is a flat line
 * on one ledger, which is what lets the fold be an addition and the marker's
 * ranking be explicable a line at a time.
 */
export function explainSite(state: GameState, playerId: number, tile: Tile): SiteReading {
  const knobs = RULES.sites;
  const ground = groundContext(state, playerId);
  const player = playerById(state, playerId);
  const techs = player?.techsResearched ?? [];
  const here = tileHex(tile);

  const ring: SiteRingHex[] = [];
  const seams: SiteSeam[] = [];
  const seen = new Set<ResourceId>();
  let centre: SiteRingHex | null = null;
  let hills = 0;
  for (const near of mapRange(state.map, here, Math.max(0, knobs.ringRadius))) {
    const yields = foldTileLines(explainTileYield(near, ground));
    const steps = wrappedDistance(state.map, here, tileHex(near));
    const row: SiteRingHex = {
      col: near.col,
      row: near.row,
      steps,
      at: tileIndex(state.map, near.col, near.row),
      yields,
      worth: siteWorth(yields),
    };
    ring.push(row);
    if (steps === 0) centre = row;
    if (near.hills) hills += 1;
    // The seam itself, once per kind: a site with two silk hexes is still a
    // site that opens silk, which is exactly what the signature pays for. The
    // reveal gate is applied below rather than here — see `SiteReading.seams`
    // for the two halves and which reader wants which.
    const resource = near.resource;
    if (resource === undefined || seen.has(resource)) continue;
    seen.add(resource);
    seams.push({ id: resource, col: near.col, row: near.row });
  }

  // **The hexes a young town would actually have hands for.** The centre is
  // worked for nothing from the turn the town stands; after that a citizen has
  // to be born for every hex, and a ring of nineteen counted whole would rank a
  // site by ground its first ten citizens will never touch.
  const worked = [...ring].sort((a, b) => b.worth - a.worth || a.at - b.at);
  const counted = worked.slice(0, Math.max(1, knobs.workedHexes));
  let food = 0;
  let production = 0;
  let groundWorth = 0;
  for (const row of counted) {
    food += row.yields.food;
    production += row.yields.production;
    groundWorth += row.worth;
  }

  const lines: SiteLine[] = [
    { label: `the ground a young town would work (${counted.length} hexes)`, value: groundWorth },
  ];
  if (hasFreshWater(tile)) lines.push({ label: 'fresh water', value: knobs.freshWater });
  const luxuries: ResourceId[] = [];
  const strategics: ResourceId[] = [];
  for (const seam of seams) {
    // **A seam pays this ledger only where the empire could be told about it**
    // (rule 5's ctx, read at the label rather than at the yield). The ledger is
    // what the board draws, and a marker that pointed at iron nobody has heard
    // of would be the map answering a question the player cannot ask.
    if (!resourceIsVisibleTo(seam.id, techs)) continue;
    const def = resourceDef(seam.id);
    if (def.kind === 'luxury') {
      luxuries.push(seam.id);
      lines.push({ label: `${def.name} in reach`, value: knobs.luxury });
    } else if (def.kind === 'strategic') {
      strategics.push(seam.id);
      lines.push({ label: `${def.name} in reach`, value: knobs.strategic });
    }
  }
  if (isCoastal(state.map, tile)) lines.push({ label: 'on the coast', value: knobs.coast });
  if (hills > 0) lines.push({ label: `hills in reach (${hills})`, value: hills * knobs.hills });
  const nearestTown = stepsToOwnTown(state, playerId, tile);
  // **Crowding is a subtraction, never a bonus for distance.** A site far from
  // every town of ours is not thereby good — it is merely far — but a site that
  // would take half of a standing town's fields is worth less than its own
  // ground says, and the ledger has to say so in a line the hover card can read.
  if (nearestTown !== null && nearestTown < knobs.comfortableSpacing) {
    lines.push({
      label: `close to one of our towns (${nearestTown} hexes)`,
      value: -(knobs.comfortableSpacing - nearestTown) * knobs.crowding,
    });
  }

  return {
    col: tile.col,
    row: tile.row,
    lines,
    total: foldSite(lines),
    ring,
    centre,
    seams,
    luxuries,
    strategics,
    freshWater: hasFreshWater(tile),
    coast: isCoastal(state.map, tile),
    hills,
    nearestTown,
    food,
    production,
  };
}

/**
 * **The seat's own ground, ranked** — every hex it has charted, inside reach of
 * something of its own, that the rules would take a city on.
 *
 * Three gates and no fourth: **charted** (a marker on a hex nobody has walked to
 * would be the board telling the player what is under the fog), **foundable**
 * (`foundingErrorAt`, the one rule, asked the one way), and **worth saying**
 * (`sites.scoreFloor` — a recommendation of the least bad hex on a bad continent
 * is worse than no recommendation). The seams a seat cannot yet name are gated a
 * layer down, inside the reading itself.
 *
 * The anchors are the empire's towns **and its settlers**: a settler walking
 * into new country is exactly when the question is asked, and a sweep tied to
 * the towns alone would go dark the moment the piece left home.
 *
 * Cut to `ui.recommendedSites` here rather than at each reader, so the lens and
 * the hover card cannot disagree about which hexes carry a marker.
 */
export function rankSites(state: GameState, playerId: number): SiteCandidate[] {
  const knobs = RULES.sites;
  const anchors: Tile[] = [];
  for (const city of citiesOf(state, playerId)) {
    const tile = getTileAt(state.map, city.col, city.row);
    if (tile !== undefined) anchors.push(tile);
  }
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    if (!unitDef(unit.type).foundsCity) continue;
    const tile = getTileAt(state.map, unit.col, unit.row);
    if (tile !== undefined) anchors.push(tile);
  }
  const looked = new Set<number>();
  const candidates: SiteCandidate[] = [];
  for (const anchor of anchors) {
    for (const tile of mapRange(state.map, tileHex(anchor), Math.max(0, knobs.searchRadius))) {
      const at = tileIndex(state.map, tile.col, tile.row);
      if (looked.has(at)) continue;
      looked.add(at);
      if (!isExploredBy(state, playerId, tile.col, tile.row)) continue;
      if (foundingErrorAt(state, playerId, tile) !== null) continue;
      const reading = explainSite(state, playerId, tile);
      if (reading.total < knobs.scoreFloor) continue;
      candidates.push({ col: tile.col, row: tile.row, reading });
    }
  }
  // Best first, then by tile index — both facts about the board rather than
  // about the order the anchors happened to be walked in (rule 2).
  candidates.sort(
    (a, b) =>
      b.reading.total - a.reading.total ||
      tileIndex(state.map, a.col, a.row) - tileIndex(state.map, b.col, b.row),
  );
  return candidates.slice(0, Math.max(0, RULES.ui.recommendedSites));
}
