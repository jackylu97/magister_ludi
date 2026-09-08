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
 * drafted, never slotted and never chosen — it is **rolled** off `state.rng` at
 * the moment the stones are topped out, and it is then a fact about that town
 * for as long as the town stands.
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
 * One rite: **a city's verb**, paid for in faith and standing for ten turns
 * (`docs/history/fewer-things.md` §3, ruled 2026-09-06).
 *
 * It was a charge of an augur spent on a moment, and the errand was the whole
 * complaint: call the piece, walk it, aim it, spend it — four to six clicks for
 * under one percent of a voice. So the agent is gone and the **city** is the
 * bearer of the ability. What is left is the half that was always worth having:
 * `effects` is an ordinary card's effect list, stamped onto the town as a
 * `TimedEffect` for `duration` turns and read by the same evaluators that read a
 * slotted Order. There is no instant half at all any more — a rite is a season,
 * not a purse.
 */
export interface RiteDef extends CardDefBase {
  /** The technology that teaches it, whose `unlocks.abilities` names it. */
  tech: TechId;
  /** Turns the `effects` last. Ten for every live row. */
  duration?: number;
  /**
   * **Withdrawn from the table**: never taught, never performed, still readable.
   *
   * `OrderDef.retired`'s discipline one table over and for its reason exactly. A
   * rite the design has taken out (Recasting the Omens, whose redraw is the
   * faith reroll's job now; The Preaching, whose lump is the prophet's) is not a
   * rite that never existed — a `TimedEffect` still standing on a city inside a
   * game that has already begun names it, and `anyCardDef` would throw on an id
   * the table had forgotten. So the row stays, `availableRites` stops offering
   * it, and the load validator stops asking it for a duration and an ability it
   * no longer has. What the row is *not* keeping is an older save readable:
   * `loadGame` tests the schema for exact equality, and retiring a row is
   * itself a bump — so the row a save could name is a row this build still
   * deals.
   */
  retired?: boolean;
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
   * How many times **this hand** has been dealt again (the user, 2026-09-06,
   * evening): every belief hand — the ladder's and a prophet's alike — may be
   * asked again once for nothing, and every asking after that costs faith,
   * rising with each one *on this hand*. The count lives on the offer because
   * it is the hand's own fact: it starts at nothing with every fresh deal and
   * has nothing to do with the Order draft's lifetime count
   * (`PlayerStatecraft.rerollsTaken`), which never resets. Absent reads as none.
   */
  rerolls?: number;
  // `givenBack` — the god this offer was dealt in place of — was removed on
  // 2026-09-06 with the last of Recasting the Omens: no seam writes it any more,
  // so the offer card's two "what your people keep instead" sentences could not
  // be reached and the field described a hand the game cannot deal. An offer
  // that is dealt in place of something again gets the field back with a writer
  // beside it. An old save carrying the key reads exactly as a fresh hand, which
  // is what it now is.
  /**
   * **What answering this offer takes out of the faith bank**, or the key is
   * absent on every offer that is paid for some other way — an augur spent, a
   * prophet's charge, a founding's second hand (schema 71).
   *
   * Presence is what makes an offer the *ladder's*, and the figure rides on the
   * offer rather than being re-derived at the pick for the culture draft's
   * reason turned inside out: a draft spends its meter at the deal, and this
   * one cannot, because the rung is a *threshold reached* and the pick is a
   * separate command. So the price the ladder quoted when it opened is the
   * price the pick pays, and a threshold that moved under a retune between the
   * two cannot charge a player something they were never shown.
   */
  rungCost?: number;
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
  /**
   * **Rungs of the faith ladder this empire has climbed** — consecrations the
   * bank has paid for (schema 71).
   *
   * `PlayerStatecraft.drafts` one currency over, and it is a count of *rungs*
   * rather than of gods for the reason that field is a count of drafts rather
   * than of cards: an augur's consecration, a wonder's, a recast — none of them
   * is a rung, and a ladder that priced itself off `beliefs.length` would charge
   * an empire for a god it was given.
   *
   * Always present, never optional (`orderSkips`' rule), so a seat that has
   * climbed nothing serialises exactly like one that has.
   */
  rungs: number;
}

/** A brand-new empire's pantheon: no gods, no offer, at the ladder's foot. */
export function newPlayerPantheon(): PlayerPantheon {
  return { beliefs: [], rungs: 0 };
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
 * **The faith ladder** — what banked faith the next pantheon consecration asks
 * (the fewer-things pass, `docs/history/fewer-things.md` §3, ruled 2026-09-06).
 *
 * `StatecraftConfig.meter`'s shape one currency over, and deliberately the same
 * three numbers: `base + linear·n + n^exp`, floored, with `n` the rungs this
 * empire has already climbed. A consecration used to be an augur bought for 40
 * faith with 15 more for each one already called, and the ruling is that the
 * ladder wears that old price — so the errand goes and the pacing does not.
 *
 * The exponent is what the old ladder did not have. At 1.5 the three rungs come
 * to 40 · 56 · 72 (168 faith all told, against the three augurs' 165), so the
 * third god lands where the third augur used to and every rung after would rise
 * faster than a flat increment — which is the culture meter's argument, and the
 * reason a threshold is a curve rather than a step.
 */
export interface FaithLadderConfig {
  costBase: number;
  costLinear: number;
  costExponent: number;
}

/**
 * **What rerolling an Order draft costs**, in faith (ruled 2026-09-06: *"35 to
 * start, rising per use at a slight exponent"*).
 *
 * Three dials and they multiply in one order — `base × ageMultiplier[age] ×
 * exponent^taken`, floored — printed as an ordered list of differences by
 * `explainRerollCost`, which is `explainPurchaseCost`'s discipline: every line
 * carries the difference it makes to the running figure, so the fold *is* the
 * price and no surface computes a total beside it.
 *
 * The **exponent** is the design: a reroll is meant to be used sparingly, and
 * what makes it sparing is that the button prints the *next* price before the
 * click. The **age multiplier** is what keeps 35 faith meaning in Æra IV what
 * it meant in Æra II, and it is a list by age rather than a curve because four
 * ages is a table a designer can read.
 */
export interface RerollConfig {
  base: number;
  /** Multiplied in once per reroll this empire has already taken. */
  exponent: number;
  /** By `TechAge`, one entry per age, indexed from Æra I. */
  ageMultiplier: number[];
  /**
   * What a **heavy** hand costs, as a multiple of the Order draft's price at the
   * same point on the same ladder (ruled 2026-09-07, `docs/flags.md` item q:
   * *"rerolls for Doctrines and great people at twice the Order price, on the
   * same ladder"*).
   *
   * Heavy is what the two of them have in common and what the Order draft does
   * not: a Doctrine is permanent and slotless, and a name is drawn from a roster
   * the whole world shares — neither hand comes round again, so seeing another
   * one is worth more than seeing another Order.
   *
   * A **multiple** rather than a second base, because the ruling is a relation:
   * retune the Order price, or the age table, or the exponent, and these two
   * follow without a second set of dials to keep in step. It is a line of its own
   * in `explainRerollCost`'s fold, so the doubling prints rather than hiding
   * inside a figure.
   */
  heavyMultiple: number;
  /**
   * The ability that opens the reroll at all — Chronology's Long Count, which
   * lost its die of the Magister in the same pass (`docs/history/tech-gifts.md` §2).
   *
   * A data field rather than a constant for `riteAbility`'s reason: which node
   * carries a door is a design decision that lives in the tables, and nothing in
   * `src/sim/` compares a technology against a name.
   */
  ability: AbilityId;
}

/**
 * **What a rite costs a city**, in faith, by the age its empire stands in
 * (ruled 2026-09-06, `docs/history/fewer-things.md` §6's "Still open": *a rite costs the
 * faith ladder's first rung, rising a rung per age*).
 *
 * So the numbers are not a second curve: they are `faithRungCost` read off by
 * age instead of by consecration — 40 · 56 · 72 · 90, the augur's old price
 * ladder exactly. An empire in Æra I pays for a rite what it pays for its first
 * god; one in Æra IV pays what a fourth god would ask. Written out as a list
 * rather than derived from `FaithLadderConfig` in code, because the two are
 * *design* decisions that happen to agree today and a designer must be able to
 * part them without touching a function.
 *
 * By `TechAge`, indexed from Æra I; a shorter list clamps to its last entry, so
 * a fifth age costs what the fourth does until somebody says otherwise.
 */
export interface RiteCostConfig {
  costByAge: number[];
}

/**
 * **What an apostle's three acts are worth** (ruled 2026-09-06,
 * `docs/history/fewer-things.md` §3 and `docs/history/tech-gifts.md` §7).
 *
 * Here rather than in `rules.religion` for `RiteGrantSpec.lump`'s old reason,
 * which outlived the field: the *bomb's* numbers are the rules' and belong to
 * the prophet, and a piece that read them would preach a different distance the
 * day somebody retuned a prophet. What the apostle borrows it borrows as a
 * **share** — `proclaimPercent` of whatever a prophet's lump is worth today — so
 * the ruled sentence ("half a prophet's strength") stays true through a retune,
 * while the reach is its own figure because six hexes is not half of ten.
 */
export interface ApostleConfig {
  /** How far its proclamation carries, in hexes. */
  proclaimRange: number;
  /** What share of a prophet's lump it presses, in whole percent. */
  proclaimPercent: number;
  /** Hit points its laying-on of hands mends on each piece beside it. */
  heal: number;
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
  /** What each pantheon consecration asks of the faith bank. See `FaithLadderConfig`. */
  ladder: FaithLadderConfig;
  /** What rerolling an Order draft costs. See `RerollConfig`. */
  reroll: RerollConfig;
  /** What a city's rite asks of the faith bank. See `RiteCostConfig`. */
  rite: RiteCostConfig;
  /**
   * What one relic pays its town, every turn, in faith.
   *
   * A bare number rather than a card list because it is the whole of the row: an
   * apostle's relic is a **building** (`data/buildings.json`'s `relic`, placed
   * and never built), and what a building pays is its own row's yields. The
   * figure lives here so that the apostle's act and the shelf it leaves behind
   * are tuned in one place; `test/sim/religion.test.ts` pins the two together,
   * because this module holds no building table and must not learn one.
   */
  relicFaith: number;
  /** What an apostle's three acts are worth. See `ApostleConfig`. */
  apostle: ApostleConfig;
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
 * The rites the table still **teaches**, in file order — `RITE_IDS` minus the
 * withdrawn rows (`RiteDef.retired`).
 *
 * The list every pool, every panel and every register walks. `RITE_IDS` stays
 * the whole table because a save may name a withdrawn row and `anyCardDef` has
 * to find it; this is the one that answers "which rites are there".
 */
export const LIVE_RITE_IDS: readonly RiteId[] = RITE_IDS.filter(
  (id) => riteDef(id).retired !== true,
);
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
 * **What a rite asks of the faith bank**, for an empire standing in this age.
 *
 * One reading, so the button, the refusal and the charge are the same figure —
 * `explainUnitCost`'s discipline at the scale of one number. The list is
 * clamped rather than indexed blindly: an age past the table's end pays what the
 * last age pays, which is the honest answer for a fifth era nobody has priced.
 *
 * It does **not** vary by how many rites an empire has performed. A rite is a
 * season a town buys and the season runs out; a ladder on top of that would be
 * two escalations on one act, and the one that matters is already there — every
 * town may keep only one at a time.
 */
export function riteCost(age: number): number {
  const table = RELIGION.rite.costByAge;
  if (table.length === 0) return 0;
  const index = Math.min(table.length, Math.max(1, Math.floor(age))) - 1;
  return Math.max(0, Math.floor(table[index] ?? 0));
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
    // **A withdrawn row is asked nothing.** It is kept so a save naming it still
    // resolves to a name (`anyCardDef`), and it is out of every pool, so asking
    // it for a duration or an ability would be asking a row to finish a job the
    // design took away from it.
    if (def.retired === true) continue;
    if (!knownTechs.includes(def.tech)) {
      problems.push(`rite "${id}" is taught by "${def.tech}", which is not a technology`);
    }
    if (def.duration !== undefined && def.effects.length === 0) {
      problems.push(`rite "${id}" lasts ${def.duration} turns and has nothing to last`);
    }
    if (def.duration === undefined && def.effects.length > 0) {
      problems.push(`rite "${id}" has lasting effects and no duration to hang them on`);
    }
    // **A rite is its season and nothing else** (the fewer-things pass): the
    // instant half is gone, so a live row that stamps nothing on its town is a
    // city verb that costs faith and does nothing at all. The belief guard's
    // sentence one table over, and it fails for that guard's reason.
    if (def.duration === undefined || def.effects.length === 0) {
      problems.push(`rite "${id}" hangs nothing on the town that performs it`);
    }
  }
  // **The relic's faith is one number.** The apostle's act and the shelf it
  // leaves are tuned together or not at all, so a row that paid a different
  // figure from the one this table names would be two answers to one question.
  if (RELIGION.relicFaith < 0) problems.push('a relic pays a negative amount of faith');
  if (RELIGION.rite.costByAge.length === 0) problems.push('no rite price is written for any age');
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
  //     only by `explainCardEmpireYields`, which walks the *empire's* list and would
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
