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

import type { CardDefBase, CardEffect } from './statecraftData';
import type { AbilityId, TechId } from './techData';

// --- ids --------------------------------------------------------------------

/**
 * Every belief in the game, across **three pools** in one id space.
 *
 * The pantheon's gods, the follower beliefs a religion drafts at founding, and
 * the enhancer beliefs it draws at Theology are three *pools*, never three id
 * spaces — `CardId`'s rule one table down, and it buys the same thing: a
 * breakdown line carries one string, `beliefDef` is one lookup, and
 * `describeCard` answers for all three without asking which bag a card came out
 * of. Which pool a belief belongs to is a question about where it may be
 * *drawn*, and only the drafts ask it (`BELIEF_IDS` / `FOLLOWER_BELIEF_IDS` /
 * `ENHANCER_BELIEF_IDS`).
 */
export type BeliefId =
  | (keyof typeof religionJson.beliefs & string)
  | (keyof typeof religionJson.followerBeliefs & string)
  | (keyof typeof religionJson.enhancerBeliefs & string);
export type RiteId = keyof typeof religionJson.rites & string;

/**
 * One of the five patrons a cathedral is dedicated to when it is finished
 * (design ledger Entry LV).
 *
 * `CardId`'s eleventh class, and the shallowest: a consecration is never
 * drafted, never slotted, never upgradable and never chosen — it is **rolled**
 * off `state.rng` at the moment the stones are topped out, and it is then a fact
 * about that town for as long as the town stands. So its level is always one and
 * `scaleByLevel` has nothing to say about it.
 *
 * It is a `CardDefBase` with nothing added, which is the whole architectural
 * claim: five rows of the ordinary effect vocabulary, read by the one evaluator
 * in `statecraft.ts` through `liveCityEffects`, so a sixth patron is a JSON row.
 */
export type ConsecrationId = keyof typeof religionJson.consecrations & string;

/**
 * Which bag a belief is drawn from. The pantheon is not one of them: it is
 * `consecrate`'s bag and it is never redrafted, because it is the religion's
 * identity (`docs/religion-v2.md`).
 */
export type ReligionBeliefPool = 'follower' | 'enhancer';

/** The two drawable pools in the order a screen lays them out. */
export const RELIGION_BELIEF_POOLS: readonly ReligionBeliefPool[] = ['follower', 'enhancer'];

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
 * (`docs/deprecated/religion.md`, "the anti-spam structure").
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
  /**
   * A **proclamation** made on the hex the rite was performed on — The
   * Preaching's whole payout, and the prophet's faith bomb out of a smaller
   * purse.
   *
   * It is a **lump**, not a pulse (user, 2026-08-28): `amount` is banked into
   * `City.pressureBank` of every town within `range` at the moment the augur
   * speaks, the temple's own resistance applied, and the phase's own converter
   * is run on the spot. Nothing is left standing on the board afterwards.
   *
   * The numbers are on the row rather than in `rules.religion` because the
   * *bomb's* numbers are the rules' and a rite's are the rite's: they are two
   * different acts that happen to make the same kind of noise, and a rite that
   * read the bomb's figures would preach three times as hard the day somebody
   * retuned a prophet. It pays nothing at all to an empire that has founded no
   * religion — there is no faith to preach — which is a fact about the board
   * rather than a refusal (`riteError` says so before it comes to this).
   */
  lump?: { range: number; amount: number };
}

/** What a rite is aimed at. Decides which target the command will accept. */
/**
 * What a rite is aimed at. Decides which target the command will accept.
 *
 * `'here'` is the third and the odd one: a rite aimed at **the ground the augur
 * stands on** and at nothing standing there. The Preaching is one — a
 * proclamation is made in a place, not to a town or to a soldier — and a rite
 * that had to name an owned city to preach in would be a rite that can only
 * convert people who already agree.
 */
export type RiteTarget = 'city' | 'unit' | 'here';

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
  /**
   * What it pays the instant it lands. Absent on a **redraw** rite, which pays
   * nothing at all — see `redraws`.
   */
  grant?: RiteGrantSpec;
  /**
   * The bag this rite hands one card back to and deals a fresh offer out of —
   * `'pantheon'`, and nothing else today (Recasting the Omens).
   *
   * A rite is **either** a grant/blessing **or** a redraw, never both, and
   * `religionDataProblems` refuses a row that is neither or that is both. They
   * are two different kinds of act: a grant is an Entry XVIII windfall settled
   * into a bucket, a redraw is a *decision* put back on the empire and answered
   * by `chooseBelief` — the same seam a Consecrate's offer is answered through.
   * A row carrying both would be a windfall that also opens a blocker, which is
   * two announcements for one charge and no place to say either.
   *
   * Presence is the state, exactly as `RiteGrantSpec.lump`'s is: `riteError`
   * asks the shape rather than the id, so the second redraw rite inherits every
   * refusal without that function learning its name.
   */
  redraws?: 'pantheon';
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
  /**
   * Which bag these were drawn from, or the key is **absent** for a Consecrate's
   * three gods.
   *
   * One offer field on the player answers for all three drafts, and a pick is
   * still an index into `options` — which is the whole reason there is one
   * `chooseBelief` command rather than three. Absent means the pantheon, so a
   * v1 save's outstanding offer reads exactly as it did and `settleBeliefChoice`
   * routes it where it always went.
   */
  pool?: ReligionBeliefPool;
  /**
   * The god this offer was dealt **in place of** — Recasting the Omens' whole
   * difference from a Consecrate — or the key is absent on every other draw.
   *
   * A record of what was handed back rather than a rule: the belief is already
   * out of `beliefs` by the time this is written and the bag was filtered by
   * `recastPantheonAt` before the draw, so nothing reads it to *decide*
   * anything. It exists because the card that answers the offer has one line to
   * say what happened, and "you gave back Keeper of the Hearth" is the only
   * thing distinguishing a recast's hand from a fresh god's. Beside `pool` for
   * that field's reason: the offer knows which decision it is, so no surface
   * has to re-derive it.
   */
  givenBack?: BeliefId;
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
 * Beliefs are **permanent and unconvertible** (`docs/deprecated/religion.md`, the Civ VI
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
  /**
   * How many further belief drafts this empire is **owed**, or the key is
   * absent — the founding's second offer, and nothing else today (Entry LVIII).
   *
   * A debt rather than a queue of dealt hands, and the distinction is the whole
   * of why this field is a number. A founding opens *two* drafts off one
   * prophet, and both are drawn from the same follower bag: two hands dealt at
   * the same instant could offer the same belief twice, and the second would
   * still be on the table after the first was taken. So the second hand is
   * **drawn at the moment it opens**, which is the moment the first is answered
   * (`settleBeliefChoice`), and the drawn-once doctrine is kept exactly — an
   * offer is still a function of the log and never of when somebody looked at a
   * screen.
   *
   * Presence is the state, like `path` and `chargesLeft`: the key is deleted the
   * moment the debt is paid, so an empire that has answered everything
   * serialises exactly like one that was never asked.
   */
  owed?: number;
}

/** A brand-new empire's pantheon: no gods, no offer. */
export function newPlayerPantheon(): PlayerPantheon {
  return { beliefs: [] };
}

export interface PantheonConfig {
  /** Belief slots each technology opens. Summed over what the empire holds. */
  slotsFromTech: Partial<Record<TechId, number>>;
  // There is deliberately **no `offerOptions`**. How many gods a Consecrate
  // deals is `rules.offers.belief` folded by `explainOfferSize` (Entry XXXI),
  // so a card that widens "every draft" widens this one too; the number that
  // sat here was dead the day that landed, and a dead number in a data file is
  // a dial a designer will one day turn expecting something to happen.
}

/**
 * How many beliefs of each drawable pool a religion may hold at once.
 *
 * A data dial rather than a constant, and the two figures the ruled faith rework
 * of Entry LVIII settled: **three follower beliefs, two enhancer beliefs, in
 * total, across the whole game**.
 *
 * They are a *ladder* rather than two independent allowances, and the ladder is
 * `nextBeliefPool` in `religion.ts`: a prophet spent on a belief fills the
 * follower house first and moves to the enhancer house when it is full. So
 * raising `followerSlots` costs another prophet before an enhancer is ever
 * offered, which is exactly the pacing decision these two numbers are for.
 * Nothing in `religion.ts` counts them by hand — the drafts ask whether a rung
 * is open, never how many there are.
 */
export interface ReligionPoolsConfig {
  followerSlots: number;
  enhancerSlots: number;
}

/**
 * How a religion is **named**: an epithet per belief axis, and the patterns the
 * epithets are dropped into.
 *
 * Generated rather than drawn from a list of faiths, which is the user's ruling
 * of 2026-08-27 — "keep religions fluid / not tied to historical world
 * religions" — and generated *from the pantheon's axes* so that a religion looks
 * like what it is made of: an empire that consecrated the Hearth Mother and the
 * Standing Stones gets a name with hearth and stone in it.
 *
 * `patterns` are printf-shaped with `{0}` and `{1}`. A pattern naming `{1}` is
 * only reachable by a pantheon spanning two axes; the draw falls back to the
 * one-axis patterns otherwise, so a single-god religion never reads "the
 * Children of Hearth and Hearth".
 */
export interface ReligionNamesConfig {
  epithets: Partial<Record<BeliefAxis, string[]>>;
  patterns: string[];
}

export interface ReligionConfig {
  pantheon: PantheonConfig;
  pools: ReligionPoolsConfig;
  names: ReligionNamesConfig;
  /**
   * What founding a religion pays its founder, every turn, for the followers it
   * has in the world — written in the ordinary card vocabulary and read by the
   * ordinary evaluator (`liveEffects`' seventh source).
   *
   * It is **data rather than a rule** for the reason a belief is data: the
   * trickle is a number somebody tunes, and a doubling of it is a card
   * (`effectAmplifier founderTrickle`, Apostles') rather than a second arm in a
   * function.
   */
  founderTrickle: CardEffect[];
  beliefs: Record<BeliefId, BeliefDef>;
  followerBeliefs: Record<BeliefId, BeliefDef>;
  enhancerBeliefs: Record<BeliefId, BeliefDef>;
  rites: Record<RiteId, RiteDef>;
  /**
   * The five patrons a finished cathedral may be dedicated to. See
   * `ConsecrationId`.
   *
   * Here rather than in `buildings.json` because a consecration is a *card*, and
   * this file is where the card tables that are not Statecraft's live. The
   * building row carries only the **marker** that says a completion rolls
   * (`BuildingDef.consecrated`), so a second building that consecrates joins by
   * setting one flag and nothing here learns its name.
   */
  consecrations: Record<ConsecrationId, ConsecrationDef>;
}

/**
 * One patron. `CardDefBase` and nothing else — see `ConsecrationId` for why
 * there is no cost, no tier and no prerequisite.
 */
export type ConsecrationDef = CardDefBase;

export const RELIGION = religionJson as unknown as ReligionConfig;

// --- ordered id lists -------------------------------------------------------

/**
 * Every id in **file order**, which is the order every draw and every screen
 * walks them in — `ORDER_IDS`' rule, and here for its reason exactly: an outcome
 * that depends on an order must depend on an order the data itself carries.
 */
export const BELIEF_IDS = Object.keys(RELIGION.beliefs) as BeliefId[];
/** The follower pool, in file order. Drafted at founding; applies in every following city. */
export const FOLLOWER_BELIEF_IDS = Object.keys(RELIGION.followerBeliefs) as BeliefId[];
/** The enhancer pool, in file order. Drafted at Theology; bends the tide and pays the holy city's owner. */
export const ENHANCER_BELIEF_IDS = Object.keys(RELIGION.enhancerBeliefs) as BeliefId[];
/** Every belief in the game, pantheon first, then follower, then enhancer. */
export const ALL_BELIEF_IDS: readonly BeliefId[] = [
  ...BELIEF_IDS,
  ...FOLLOWER_BELIEF_IDS,
  ...ENHANCER_BELIEF_IDS,
];
export const RITE_IDS = Object.keys(RELIGION.rites) as RiteId[];
/**
 * The patrons in **file order**, which is the order the roll walks them in and
 * the order the Compendium lists them — `BELIEF_IDS`' rule, and here for its
 * reason exactly: an outcome that depends on an order must depend on an order
 * the data itself carries.
 */
export const CONSECRATION_IDS = Object.keys(RELIGION.consecrations) as ConsecrationId[];

/** The rows of one drawable pool, in file order. `poolOrders`' twin. */
export function poolBeliefs(pool: ReligionBeliefPool): BeliefId[] {
  return pool === 'follower' ? [...FOLLOWER_BELIEF_IDS] : [...ENHANCER_BELIEF_IDS];
}

// --- lookups ----------------------------------------------------------------

/** Is this any belief at all, in any of the three pools? */
export function isBeliefId(value: unknown): value is BeliefId {
  if (typeof value !== 'string') return false;
  return (
    Object.prototype.hasOwnProperty.call(RELIGION.beliefs, value) ||
    Object.prototype.hasOwnProperty.call(RELIGION.followerBeliefs, value) ||
    Object.prototype.hasOwnProperty.call(RELIGION.enhancerBeliefs, value)
  );
}

/** Is this a **pantheon** god — the only pool a Consecrate draws from? */
export function isPantheonBeliefId(value: unknown): value is BeliefId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(RELIGION.beliefs, value);
}

/** Which pool a belief was written for, or `null` for a pantheon god. */
export function beliefPoolOf(id: BeliefId): ReligionBeliefPool | null {
  if (Object.prototype.hasOwnProperty.call(RELIGION.followerBeliefs, id)) return 'follower';
  if (Object.prototype.hasOwnProperty.call(RELIGION.enhancerBeliefs, id)) return 'enhancer';
  return null;
}

export function isRiteId(value: unknown): value is RiteId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(RELIGION.rites, value);
}

export function isConsecrationId(value: unknown): value is ConsecrationId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(RELIGION.consecrations, value)
  );
}

export function consecrationDef(id: ConsecrationId): ConsecrationDef {
  const def = RELIGION.consecrations[id];
  if (!def) throw new Error(`Unknown consecration "${String(id)}"`);
  return def;
}

/** One belief by id, whichever of the three pools it was written for. */
export function beliefDef(id: BeliefId): BeliefDef {
  const def =
    RELIGION.beliefs[id] ?? RELIGION.followerBeliefs[id] ?? RELIGION.enhancerBeliefs[id];
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
 * JSON row and not a code change (`docs/deprecated/religion.md`, the slot table). Summed
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
/**
 * The counts that are questions about **a religion's founder** rather than about
 * a town — the tide, counted across the world.
 *
 * Spelled here rather than imported, because the import between this file and
 * `statecraftData.ts` is type-only in both directions and must stay that way
 * (see the module docblock). Five strings, checked by
 * `test/sim/religion.test.ts` against `CountKind`'s own `following…` family so
 * that a sixth cannot be added there and forgotten here.
 */
export const WORLD_SCALE_COUNTS: readonly string[] = [
  'followingCities',
  'followingForeign',
  'followingPop',
  'followingEmpires',
  'followingWithBuilding',
];

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
    // **Exactly one of the two.** A rite pays a bucket or it reopens a bag, and
    // the union is enforced here rather than in the type because the table is
    // JSON: `RELIGION` is cast, so a row carrying both would typecheck and then
    // pay a windfall *and* raise a blocker on one charge, with nothing able to
    // announce both. A row carrying neither is the sibling failure and reads as
    // a rite that silently does nothing.
    const redraws = def.redraws !== undefined;
    if (redraws && def.grant !== undefined) {
      problems.push(`rite "${id}" both pays a grant and redraws a bag`);
    }
    if (!redraws && def.grant === undefined) {
      problems.push(`rite "${id}" pays nothing and redraws nothing`);
    }
  }
  for (const id of ALL_BELIEF_IDS) {
    const def = beliefDef(id);
    // **A row with nothing to say is a bug; a row that says why is a decision.**
    // `deferred` is the vocabulary's own convention (Entry XV.b): a belief whose
    // ratified text needs a shape that does not exist ships with no effects and
    // the missing half printed on the card, and bending it into a shape that
    // nearly fits is the thing that rule exists to prevent.
    if (def.effects.length === 0 && (def.deferred ?? []).length === 0) {
      problems.push(`belief "${id}" does nothing`);
    }
  }
  // **A follower belief must be a fact about a town.** The guard the 2026-08-28
  // ruling inverted: the old one refused a *scoped* row, because the fold that
  // summed follower beliefs to the founder could read only three shapes. That
  // fold is gone — a follower belief is now pushed into the live list of every
  // city that follows, whoever owns it — so scoping is the *ordinary* case and
  // the thing that cannot work is the opposite: a clause that pays an **empire**.
  //
  // Two ways a row says that, and each is silent rather than wrong, which is
  // exactly why it fails here:
  //
  //   · `empireYields`, and any `countScaled` paying `where: 'empire'` — read
  //     only by `cardEmpireYields`, which walks the *empire's* list and would
  //     never see a card that reached one town;
  //   · a **world-scale count** (the `following…` family) — answered off
  //     "the religions whose holy city this empire holds", which is a question
  //     about a founder. Asked in a foreign town it answers zero, so the card
  //     would pay nothing and say nothing.
  //
  // Such a row belongs in the enhancer pool, which is the one that pays the holy
  // city's owner. Congregation, Pilgrims' Coin, World Church and The Long Prayer
  // moved there for this reason rather than being bent into a shape that nearly
  // fits (Entry XV.b's rule).
  for (const id of FOLLOWER_BELIEF_IDS) {
    for (const effect of beliefDef(id).effects) {
      if (effect.kind === 'empireYields') {
        problems.push(`follower belief "${id}" pays the empire, which no one city can`);
        continue;
      }
      if (effect.kind !== 'countScaled') continue;
      if (effect.pays.to === 'yield' && effect.pays.where === 'empire') {
        problems.push(`follower belief "${id}" pays the empire, which no one city can`);
      }
      if (WORLD_SCALE_COUNTS.includes(effect.count)) {
        problems.push(
          `follower belief "${id}" counts "${effect.count}", which is a question about a founder`,
        );
      }
    }
  }
  // A patron that pays nothing is a pack-opening that opens onto nothing — the
  // belief guard one table over, and it fails for that guard's reason exactly:
  // a cathedral finished and dedicated to a silent row reads as a game that
  // forgot to write the card.
  for (const id of CONSECRATION_IDS) {
    const def = consecrationDef(id);
    if (def.effects.length === 0 && (def.deferred ?? []).length === 0) {
      problems.push(`consecration "${id}" does nothing`);
    }
  }
  // A pattern naming an epithet no axis supplies would name a religion after an
  // empty string, which reads as a game that forgot to finish a sentence.
  for (const axis of BELIEF_AXES) {
    const epithets = RELIGION.names.epithets[axis];
    if (epithets === undefined || epithets.length === 0) {
      problems.push(`no epithet is written for the "${axis}" axis`);
    }
  }
  if (RELIGION.names.patterns.length === 0) problems.push('no religion name patterns are written');
  if (RELIGION.founderTrickle.length === 0) {
    problems.push('founding a religion pays its founder nothing');
  }
  return problems;
}
