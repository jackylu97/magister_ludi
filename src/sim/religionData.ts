/**
 * Typed access to `data/religion.json` — the pantheon's beliefs, the augur's
 * rites, and how many gods an empire may hold at once.
 *
 * The sibling of `statecraftData.ts`, and deliberately **not** a second
 * vocabulary. A belief is a `CardDefBase` exactly as an Order is: a name, a line
 * of flavour and a list of `CardEffect`s, read by the one evaluator in
 * `statecraft.ts`. That is the whole architectural claim of this file — religion
 * adds *sources*, not shapes. Where the ratified table asked for something the
 * vocabulary could not say, the vocabulary grew a generic member (a
 * `hasBuilding` city scope, a `terrain` tile condition, an `all` composite of
 * either, `perAge` on a windfall rider, a `periodicOffer`), and every one of
 * those is available to an Order and a Doctrine on the same terms. Nothing in
 * `data/religion.json` is a one-off.
 *
 * Why beliefs are cards and rites are cards too
 * ---------------------------------------------
 * `CardId` is one id space across every class (see `statecraftData.ts`), so a
 * breakdown line can carry one string and `cardDef` can be one lookup. Beliefs
 * join it for that reason, and **rites join it for a stranger one**: a rite's
 * lasting half is a bag of ordinary effects that hangs on a city or a unit for a
 * stated number of turns (`TimedEffect` in `state.ts`), and the thing those
 * effects are labelled with has to be a card. So a rite is a row with `effects`,
 * exactly like a belief, plus the two things a belief has no use for — the
 * technology that teaches it and the one-time `grant` it pays on the spot.
 *
 * The type-only cycle with `statecraftData.ts`
 * --------------------------------------------
 * This file imports `CardEffect` from there; that file imports `BeliefId` and
 * `RiteId` from here. **Both directions are `import type`**, so neither survives
 * compilation and there is no runtime cycle at all — which is why `cardDef` in
 * `statecraftData.ts` still knows only its own three classes, and the lookup
 * that spans all five lives in `statecraft.ts` beside the evaluator that needs
 * it.
 */

import religionJson from '../../data/religion.json';

import type { CardDefBase } from './statecraftData';
import type { AbilityId, TechId } from './techData';

// --- ids --------------------------------------------------------------------

export type BeliefId = keyof typeof religionJson.beliefs & string;
export type RiteId = keyof typeof religionJson.rites & string;

/**
 * The synergy thread a belief belongs to, for the screen's grouping and for
 * nothing else — `CardLine`'s twin one system over.
 *
 * It is presentation, and it is also the design: the axes are what make a second
 * belief on your axis read as the obvious pick, which is the whole reason a
 * pantheon of seven accreted gods is a *character* rather than a shopping list.
 * `'none'` is the neutral pick, which is most of the good ones.
 */
export type BeliefAxis =
  | 'hearth'
  | 'sky'
  | 'stone'
  | 'wild'
  | 'water'
  | 'war'
  | 'road'
  | 'sun'
  | 'frost'
  | 'none';

/** The axes in the order a screen lays them out. File order of the table. */
export const BELIEF_AXES: readonly BeliefAxis[] = [
  'hearth',
  'sky',
  'stone',
  'wild',
  'water',
  'war',
  'road',
  'sun',
  'frost',
  'none',
];

// --- rows -------------------------------------------------------------------

/**
 * One god of the pantheon: permanent, empire-wide, unconvertible.
 *
 * `CardDefBase` plus an axis and nothing else. There is deliberately no cost, no
 * tier and no prerequisite on a belief — what a belief costs is *an augur*, and
 * that price is the escalating one on the agent rather than a second ladder here
 * (`docs/religion.md`, "the anti-spam structure").
 */
export interface BeliefDef extends CardDefBase {
  axis: BeliefAxis;
}

/**
 * What one rite pays the instant it is performed.
 *
 * A bag of *destinations*, not of voices, and the difference is the point: a
 * rite's culture fills a **city's border basket** while its science fills the
 * **empire's** research pool, and a single `CityYieldKey` bag could not say
 * which. Each field has exactly one arm in `payRiteGrant` (`religion.ts`), which
 * is the only place a rite pays anything.
 *
 * Every figure here is an Entry XVIII windfall: printed, modifier-immune, and
 * settled into its bucket the instant it lands.
 */
export interface RiteGrantSpec {
  /** Citizens granted outright. Settled through the growth machinery. */
  population?: number;
  /** Beakers, settled through `settleResearchWindfall`. */
  science?: number;
  /** Coin, straight into the treasury. */
  gold?: number;
  /** Faith, straight into the pool that bought the augur. */
  faith?: number;
  /** Culture into the **empire's** draft pool (`settleCultureWindfall`). */
  culture?: number;
  /** Culture into **this city's** border basket. A separate channel — Entry XVII. */
  borderCulture?: number;
  /** Food into the city's basket, settled through the growth windfall. */
  food?: number;
  /** Hammers into the city's basket, settled through the production windfall. */
  production?: number;
  /** Restores the target unit to full. Blessing of Arms', today. */
  healFully?: boolean;
}

/** What a rite is aimed at. Decides which target the command will accept. */
export type RiteTarget = 'city' | 'unit';

/**
 * One rite: a charge of an augur spent on a moment.
 *
 * `effects` is the **lasting** half and is an ordinary card's effect list; it is
 * stamped onto the target as a `TimedEffect` for `duration` turns and read by
 * the same evaluators that read a slotted Order. A rite with no `duration` (the
 * Harvest) is pure windfall and stamps nothing.
 */
export interface RiteDef extends CardDefBase {
  /** The technology that teaches it, whose `unlocks.abilities` names it. */
  tech: TechId;
  target: RiteTarget;
  grant: RiteGrantSpec;
  /** Turns the `effects` last. Absent for a rite whose whole payout is instant. */
  duration?: number;
}

// --- what a player holds ----------------------------------------------------

/**
 * Three gods dealt by one Consecrate, drawn without replacement.
 *
 * `OrderOffer`'s shape and `DiscoveryOffer`'s before it: an ordered list, and a
 * pick is an **index** rather than an id, because an index can only ever name
 * something the player was actually dealt.
 */
export interface BeliefOffer {
  options: BeliefId[];
}

/**
 * Everything the pantheon knows about one empire.
 *
 * A nested object rather than three fields on `Player`, for `PlayerStatecraft`'s
 * reason exactly: it is one subject with one lifecycle, read all at once by one
 * screen.
 *
 * **There is no slot count here.** How many gods an empire may hold is derived
 * from the technologies it holds (`slotsFromTechs`), never stored — a second
 * copy is a second answer, and the first thing a second answer does is disagree
 * with the tree the turn the High Temple lands. What *is* stored is only what
 * cannot be derived: which gods were taken, in the order they were taken, and
 * whether an offer is outstanding.
 *
 * Beliefs are **permanent and unconvertible** (`docs/religion.md`, the Civ VI
 * split): a pantheon is your civilization's native cults, it applies in every
 * city you own always, and nothing in this game or the religion pass after it
 * can take one away. So there is no slot *layout*, no seal and no swap — the
 * list is the holding.
 */
export interface PlayerPantheon {
  /** Gods held, in the order they were consecrated. Permanent. */
  beliefs: BeliefId[];
  /** A Consecrate awaiting a pick, or the key is absent. Blocks End Turn. */
  pending?: BeliefOffer;
}

/** A brand-new empire's pantheon: no gods, no offer. */
export function newPlayerPantheon(): PlayerPantheon {
  return { beliefs: [] };
}

export interface PantheonConfig {
  /** Belief slots each technology opens. Summed over what the empire holds. */
  slotsFromTech: Partial<Record<TechId, number>>;
  /**
   * How many beliefs a Consecrate deals. Three, like every other draft.
   *
   * **No longer read** (the offer-size pass, 2026-08-27): the size of every
   * offer in the game is `rules.offers` folded by `explainOfferSize`, so that a
   * card which widens "every draft" widens this one too. `rules.offers.belief`
   * is the dial; this row is kept for the shape of the file.
   */
  offerOptions: number;
}

export interface ReligionConfig {
  pantheon: PantheonConfig;
  beliefs: Record<BeliefId, BeliefDef>;
  rites: Record<RiteId, RiteDef>;
}

export const RELIGION = religionJson as unknown as ReligionConfig;

// --- ordered id lists -------------------------------------------------------

/**
 * Every id in **file order**, which is the order every draw and every screen
 * walks them in — `ORDER_IDS`' rule, and here for its reason exactly: an outcome
 * that depends on an order must depend on an order the data itself carries.
 */
export const BELIEF_IDS = Object.keys(RELIGION.beliefs) as BeliefId[];
export const RITE_IDS = Object.keys(RELIGION.rites) as RiteId[];

// --- lookups ----------------------------------------------------------------

export function isBeliefId(value: unknown): value is BeliefId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(RELIGION.beliefs, value);
}

export function isRiteId(value: unknown): value is RiteId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(RELIGION.rites, value);
}

export function beliefDef(id: BeliefId): BeliefDef {
  const def = RELIGION.beliefs[id];
  if (!def) throw new Error(`Unknown belief "${String(id)}"`);
  return def;
}

export function riteDef(id: RiteId): RiteDef {
  const def = RELIGION.rites[id];
  if (!def) throw new Error(`Unknown rite "${String(id)}"`);
  return def;
}

/**
 * The ability id a rite is gated on — **the rite's own id**.
 *
 * A rite is unlocked as a technology's `abilities` entry (the key the water pass
 * built for embarkation), so the tree names the verb and `hasAbility` answers
 * whether an empire has been taught it. One string does both jobs, which is why
 * there is no `ability` field on the row: a second copy of the name is a second
 * copy to get wrong.
 */
export function riteAbility(id: RiteId): AbilityId {
  return id as AbilityId;
}

/**
 * How many belief slots these technologies open, in all.
 *
 * A table keyed by tech rather than a constant, so the High Temple's +1 is a
 * JSON row and not a code change (`docs/religion.md`, the slot table). Summed
 * over what the empire actually holds, in `slotsFromTech`'s own key order, which
 * matters for nothing today and would matter the moment a row went negative.
 */
export function slotsFromTechs(techs: readonly TechId[]): number {
  let total = 0;
  for (const [tech, slots] of Object.entries(RELIGION.pantheon.slotsFromTech)) {
    if (!techs.includes(tech as TechId)) continue;
    total += Math.max(0, Math.floor(slots ?? 0));
  }
  return total;
}

/**
 * Everything wrong with `data/religion.json`, as sentences — the sibling of
 * `discoveryDataProblems` and `techDataProblems`.
 *
 * A data table that names a technology nobody has heard of fails as *silence*: a
 * rite that can never be unlocked and a slot that never opens both look exactly
 * like a design decision. So the test suite asks this instead.
 */
export function religionDataProblems(knownTechs: readonly string[]): string[] {
  const problems: string[] = [];
  for (const tech of Object.keys(RELIGION.pantheon.slotsFromTech)) {
    if (!knownTechs.includes(tech)) {
      problems.push(`pantheon slots are granted by "${tech}", which is not a technology`);
    }
  }
  for (const id of RITE_IDS) {
    const def = riteDef(id);
    if (!knownTechs.includes(def.tech)) {
      problems.push(`rite "${id}" is taught by "${def.tech}", which is not a technology`);
    }
    if (def.duration !== undefined && def.effects.length === 0) {
      problems.push(`rite "${id}" lasts ${def.duration} turns and has nothing to last`);
    }
    if (def.duration === undefined && def.effects.length > 0) {
      problems.push(`rite "${id}" has lasting effects and no duration to hang them on`);
    }
  }
  for (const id of BELIEF_IDS) {
    if (beliefDef(id).effects.length === 0) problems.push(`belief "${id}" does nothing`);
  }
  return problems;
}
