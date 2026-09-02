/**
 * Typed access to `data/discoveries.json` — the pool a ruin or a village offers
 * and the scatter that puts them on the board.
 *
 * The sibling of `terrainData.ts`, `unitData.ts` and `techData.ts`: the JSON is
 * the single source of truth for what a discovery *is*, and this file only types
 * it. No rule below names a row, and adding a ninth boon is a JSON object.
 *
 * Why the scatter lives in this file rather than in `data/mapgen.json`
 * -------------------------------------------------------------------
 * Every other generator tunable is in the mapgen sheet, and this one deliberately
 * is not. "How many ruins are there" and "what does a ruin give you" are one
 * designer's decision made in one sitting — halve the pool's payoffs and you will
 * want more of them on the board — and splitting the pair across two files would
 * mean tuning discoveries by editing two files that never mention each other. The
 * scatter is also not a *geography* of its own: it dresses ground the fields ahead
 * of it have already decided, and it now shares one geography with them — the
 * carved continents (`carveContinents`, `resources.ts`) it deals sites against,
 * the same regions the luxury deal reads. That call costs nothing on the dice
 * stream (`carveContinents` takes no `Rng`), so the ordering guarantee below is
 * unaffected: the *ground* an id is dealt against was decided upstream, the *dice*
 * that deal it are still the scatter's own (see `mapgen.ts`, pass 7).
 *
 * The flavour split
 * -----------------
 * A row does not belong to one kind of site; it has a **weight per kind**, so
 * "ruins lean relics and knowledge, villages lean people and provisions" is a
 * gradient rather than two disjoint tables. A weight of 0 means the row can never
 * be drawn at that kind of site — which is a thing the data may say, and which no
 * row says today, because a village that occasionally yields a mason's hoard is a
 * better village than one that never can.
 *
 * The three effect shapes
 * ----------------------
 * All three are **windfalls** in Entry XVIII's sense: a printed number, paid
 * exactly, settled the instant it lands (`discoveries.ts`). They are a closed set
 * on purpose — a fourth shape is a design decision and a `switch` the compiler
 * will point at, not a string somebody can invent in JSON.
 *
 *   `cityYield`  a lump into one *basket* of the claimant's nearest owned city.
 *   `pool`       a lump into one of the empire's four banks.
 *   `unit`       a free unit, on the tile the discovery stood on.
 */

import discoveriesJson from '../../data/discoveries.json';
import type { CityYieldKey } from './resourceData';
import { type TechId, isTechId } from './techData';
import { type UnitTypeId, isUnitTypeId } from './unitData';

/**
 * The **four** kinds of site, and the layers they belong to.
 *
 * A union rather than a boolean, because no two of them are each other's
 * negation on any surface that matters: they are drawn differently (broken
 * columns against a cluster of huts against a barrow against a wreck), they lean
 * on different halves of the pool, and they are scattered in different numbers
 * and on different ground.
 *
 * The layers (`docs/themes/11-the-cartographers.md`: the map keeps its secrets in
 * layers, each **placed at generation and revealed later**, which is the only
 * shape the "a save is `{config, log}`" promise allows):
 *
 *   `ruins` / `village`  the first wave, on land, claimable from turn one.
 *   `antiquity`          the second wave, on the same ground, **gated**: an
 *                        empire without the surveyor's technology walks over one
 *                        and cannot see it, let alone claim it. The site stays
 *                        for somebody learned.
 *   `wreck`              the deep water, needing no gate at all — the ocean is
 *                        its own lock, and it opens when a hull can cross it.
 */
export type DiscoveryKind = 'ruins' | 'village' | 'antiquity' | 'wreck';

/** Every kind, in the order everything that walks them walks them. */
export const DISCOVERY_KINDS: readonly DiscoveryKind[] = [
  'ruins',
  'village',
  'antiquity',
  'wreck',
];

/**
 * What a *kind* of site is — as opposed to what one *offers*, which is a row.
 *
 * The table that made the second and third layers data rather than branches: a
 * gate is `requiresTech` and a sea site is `water`, so `claimDiscoveryAt` stayed
 * **one function** and the placement pass grew one candidate rule rather than a
 * parallel list. A fifth layer is a JSON object.
 */
export interface DiscoveryKindDef {
  /** What it is called, in plain words. */
  name: string;
  /**
   * The technology an empire needs before it may **claim** one — and, on every
   * surface that draws the board, before it may even be *shown* one. Absent for
   * the layers nothing gates.
   *
   * One field, two consequences, and they must not drift apart: a marker a seat
   * can see but not claim is a promise the reducer refuses, and a site a seat
   * can claim but not see is a boon nobody will ever walk to. `discoveryClaimError`
   * is the rule; `sites3d.ts` draws off the same lookup.
   */
  requiresTech?: TechId;
  /**
   * True when this kind is seeded on **deep water** instead of on land.
   *
   * Presence-shaped rather than a terrain list, because it is not a constraint
   * on a hex — it is which of the generator's two scatters deals the kind at
   * all. See `placeDiscoveries`.
   */
  water?: true;
}

/**
 * A lump into one basket of a city. Which city is not written here: it is
 * *the claimant's nearest owned city*, resolved at settlement time by the one
 * shared rule (`nearestOwnedCity` in `cities.ts`).
 *
 * Only the two banked baskets are addressable — food toward growth, hammers
 * toward the build — because those are the only two a city keeps. Gold, science,
 * culture and faith are the empire's and are `pool` effects.
 */
export interface DiscoveryCityYieldEffect {
  kind: 'cityYield';
  yield: 'food' | 'production';
  amount: number;
}

/** A lump into one of the empire's four banks. */
export interface DiscoveryPoolEffect {
  kind: 'pool';
  pool: 'gold' | 'science' | 'culture' | 'faith';
  amount: number;
}

/** A free unit, standing on the tile the discovery was claimed on. */
export interface DiscoveryUnitEffect {
  kind: 'unit';
  unitType: UnitTypeId;
}

export type DiscoveryEffect =
  | DiscoveryCityYieldEffect
  | DiscoveryPoolEffect
  | DiscoveryUnitEffect;

export interface DiscoveryDef {
  name: string;
  /** One line of flavour for the choice card. Never a rule. */
  flavor: string;
  /**
   * Draw weight per kind of site. Zero — or absent — means "never here".
   *
   * Partial since the layers landed, and deliberately so: a row that has nothing
   * to say about the sea says nothing, rather than writing a zero it would have
   * to keep in step with a fifth kind later.
   */
  weights: Partial<Record<DiscoveryKind, number>>;
  effect: DiscoveryEffect;
}

/** How the two kinds of site are scattered over the land. */
export interface DiscoveryPlacementConfig {
  /**
   * Sites dealt to *one* carved continent (`carveContinents`, the same regions
   * the luxury deal uses — see `discoveryPlacement.ts`), drawn from this range
   * per continent. Density measured per map rather than per continent read as
   * one grey average, which is what left a capital 7-16 hexes from the nearest
   * site under the retired `…PerThousandLand` pair — see `retired` below.
   */
  sitesPerContinent: { min: number; max: number };
  /**
   * Share of a continent's dealt sites that are ruins rather than villages,
   * rounded per continent. Not a per-row weight — that is `DiscoveryDef.weights`
   * one level down, deciding what a *claimed* site offers, not how many of each
   * kind stand on the board.
   */
  ruinShare: number;
  /**
   * How far a site must stand from every start position.
   *
   * A discovery inside a capital's opening rings would be claimed on turn one by
   * the warrior that was standing next to it, which is a gift rather than a
   * decision. Far enough that finding one is worth a scout.
   */
  minDistanceFromStart: number;
  /** How far a site must stand from every site already placed. */
  minDistanceApart: number;
  /**
   * The fairness top-up: tops every start up toward `minWithinRadius` sites
   * within `radius` hexes, planted deterministically (no dice, `resources.ts`'s
   * `ensureStartFood` bargain exactly) when the per-continent deal alone left a
   * start short. Drawn only from ground that already clears
   * `minDistanceFromStart` against *every* possible start — that exclusion
   * never relaxes here — so the floor is a target the top-up reaches for, not
   * an absolute promise: a start whose whole radius sits inside closer starts'
   * exclusion zones keeps whatever the deal already gave it. See
   * `discoveryPlacement.ts`'s `ensureStartDiscoveries` docblock.
   */
  fairness: { radius: number; minWithinRadius: number };
  /**
   * The **second wave**, dealt on the same ground and by the same sweep as the
   * first — its own per-continent budget and nothing else, because everything
   * that made the first wave fair to a start (the exclusion radius, the spacing,
   * the shuffled candidate list) is exactly as true of the second.
   *
   * There is deliberately **no fairness top-up** for it. The first wave's floor
   * exists so a scout has something to find in the opening; the second is a
   * whole age away, by which time an empire's borders decide what it finds far
   * more than the deal does — and a top-up planted near every *possible* start
   * would seed the map's antiquities into twelve capital rings.
   */
  antiquities: { sitesPerContinent: { min: number; max: number } };
  /**
   * The **deep water**, dealt per thousand ocean tiles rather than per
   * continent, because the sea is not carved into regions and a budget per
   * landmass would have no meaning out there.
   *
   * Spaced wider than the land sites are, and for a reason a hull can feel: a
   * crossing is long, so two finds eight hexes apart read as two voyages, while
   * two finds four hexes apart read as one.
   */
  ocean: { sitesPer1000Water: number; minDistanceApart: number };
}

export interface DiscoveryData {
  placement: DiscoveryPlacementConfig;
  /** What each kind of site *is* — the gate and the ground. See `DiscoveryKindDef`. */
  kinds: Record<DiscoveryKind, DiscoveryKindDef>;
  /**
   * Tunables that no longer exist, with what replaced them and why — the same
   * changelog-as-data convention `MapgenConfig.retired` uses, kept here rather
   * than in `data/mapgen.json` because these are the scatter's *own* retired
   * keys, not the generator's.
   */
  retired: Record<string, string>;
  // There is deliberately **no `offerSize`**. How many boons a claim deals is
  // `rules.offers.discovery` folded by `explainOfferSize` (Entry XXXI), so a
  // card that widens every draft widens a ruin's too; the number that sat here
  // was dead the day that landed, and a dead number in a data file is a dial a
  // designer will one day turn expecting something to happen.
  rows: Record<string, DiscoveryDef>;
}

export const DISCOVERY_DATA: DiscoveryData = discoveriesJson as DiscoveryData;

/** Every discovery id, in file order — which is the order a draw considers them. */
export const DISCOVERY_IDS: readonly string[] = Object.keys(DISCOVERY_DATA.rows);

/** A row id, derived from the JSON exactly as `ResourceId` is. */
export type DiscoveryId = string;

export function discoveryDef(id: DiscoveryId): DiscoveryDef {
  const def = DISCOVERY_DATA.rows[id];
  if (!def) throw new Error(`Unknown discovery "${id}"`);
  return def;
}

/**
 * Runtime guard. A discovery id reaches the reducer inside a `chooseDiscovery`
 * command — from a save file or (eventually) a socket — so it may be any string.
 */
export function isDiscoveryId(value: unknown): value is DiscoveryId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(DISCOVERY_DATA.rows, value)
  );
}

/** Runtime guard for the site kind, for the same reason. */
export function isDiscoveryKind(value: unknown): value is DiscoveryKind {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(DISCOVERY_DATA.kinds, value)
  );
}

/**
 * What this kind of site *is* — the gate and the ground.
 *
 * **The** lookup: the claim rule, the placement pass and every surface that
 * draws a marker ask this one function, so a layer's gate cannot be true in the
 * reducer and false on the board. See `DiscoveryKindDef`.
 */
export function discoveryKindDef(kind: DiscoveryKind): DiscoveryKindDef {
  const def = DISCOVERY_DATA.kinds[kind];
  if (!def) throw new Error(`Unknown discovery kind "${kind}"`);
  return def;
}

/**
 * The technology a seat needs before this kind of site exists for it at all, or
 * `null`. One reading for the claim and for the marker — see `requiresTech`.
 */
export function discoveryKindTech(kind: DiscoveryKind): TechId | null {
  return discoveryKindDef(kind).requiresTech ?? null;
}

/** True when this kind is seeded on deep water rather than on land. */
export function discoveryKindIsWater(kind: DiscoveryKind): boolean {
  return discoveryKindDef(kind).water === true;
}

/** This row's draw weight at a site of this kind. Never negative. */
export function discoveryWeight(id: DiscoveryId, kind: DiscoveryKind): number {
  return Math.max(0, discoveryDef(id).weights[kind] ?? 0);
}

/**
 * Every way `data/discoveries.json` can be wrong, as human-readable lines. Empty
 * means consistent.
 *
 * The sibling of `techDataProblems`, and here for the same reason: a pool whose
 * rows can never be drawn, or a row promising a unit this game does not have, is
 * a data mistake that would otherwise surface as an empty choice card forty turns
 * into somebody's game.
 */
export function discoveryDataProblems(): string[] {
  const problems: string[] = [];
  const { placement } = DISCOVERY_DATA;

  if (placement.minDistanceApart < 1) {
    problems.push(`minDistanceApart is ${String(placement.minDistanceApart)}; two sites would stack`);
  }
  if (placement.sitesPerContinent.min < 0 || placement.sitesPerContinent.max < placement.sitesPerContinent.min) {
    problems.push('sitesPerContinent is not a valid non-negative range');
  }
  if (placement.ruinShare < 0 || placement.ruinShare > 1) {
    problems.push(`ruinShare is ${String(placement.ruinShare)}, which is not a share`);
  }
  if (placement.fairness.minWithinRadius < 0) {
    problems.push('fairness.minWithinRadius is negative');
  }
  if (placement.fairness.radius < placement.minDistanceFromStart) {
    problems.push('fairness.radius is inside minDistanceFromStart, so the top-up could never plant anything');
  }

  for (const kind of DISCOVERY_KINDS) {
    const def = DISCOVERY_DATA.kinds[kind];
    if (!def) {
      problems.push(`discovery kind "${kind}" has no row in the kinds table`);
      continue;
    }
    if (def.requiresTech !== undefined && !isTechId(def.requiresTech)) {
      problems.push(`discovery kind "${kind}" names unknown technology "${def.requiresTech}"`);
    }
  }
  if (!(placement.antiquities.sitesPerContinent.max >= placement.antiquities.sitesPerContinent.min)) {
    problems.push('antiquities.sitesPerContinent is not a valid range');
  }
  if (placement.ocean.sitesPer1000Water < 0) {
    problems.push('ocean.sitesPer1000Water is negative');
  }
  if (placement.ocean.minDistanceApart < 1) {
    problems.push('ocean.minDistanceApart would let two sea sites stack');
  }

  for (const id of DISCOVERY_IDS) {
    const def = discoveryDef(id);
    if (typeof def.name !== 'string' || def.name.length === 0) {
      problems.push(`discovery "${id}" has no name`);
    }
    if (typeof def.flavor !== 'string' || def.flavor.length === 0) {
      problems.push(`discovery "${id}" has no flavor line`);
    }

    let total = 0;
    for (const kind of DISCOVERY_KINDS) total += discoveryWeight(id, kind);
    if (total <= 0) problems.push(`discovery "${id}" can never be drawn at either kind of site`);

    const { effect } = def;
    if (effect.kind === 'unit') {
      if (!isUnitTypeId(effect.unitType)) {
        problems.push(`discovery "${id}" grants unit "${String(effect.unitType)}", which does not exist`);
      }
    } else if (!(effect.amount > 0)) {
      problems.push(`discovery "${id}" pays ${String(effect.amount)}, which is not a boon`);
    }
  }

  // A kind whose whole column is zero would place sites nobody can claim
  // anything from — the one failure the per-row check above cannot see.
  for (const kind of DISCOVERY_KINDS) {
    let column = 0;
    for (const id of DISCOVERY_IDS) column += discoveryWeight(id, kind);
    if (column <= 0) problems.push(`no discovery can ever be drawn at a "${kind}" site`);
  }
  return problems;
}

/**
 * The yield a `cityYield` or `pool` effect pays, as a `CityYieldKey` — the key
 * every glyph table in the interface is indexed by.
 *
 * `null` for a unit grant, which pays no yield at all. One function so that the
 * choice card, the announce line and any future ledger name the same voice.
 */
export function discoveryYieldKey(effect: DiscoveryEffect): CityYieldKey | null {
  if (effect.kind === 'cityYield') return effect.yield;
  if (effect.kind === 'pool') return effect.pool;
  return null;
}
