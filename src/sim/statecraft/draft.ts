/**
 * **The draft** — the ladder, the pools, the offers, the rerolls, the slots and
 * the governments.
 *
 * Culture fills an escalating meter; each fill is a draft, and *tier is the
 * draft count*. A draft offers three new cards and a pass; a government is
 * offered at the tier ladder's rungs; adopting swaps the slot spread, amnesties
 * every seal and opens a Doctrine draft. All of it is `state.rng` at the moment
 * an offer opens, an ordinary command to spend it, and both halves in the log —
 * `discoveries.ts`' shape inherited rather than re-invented.
 *
 * Split out of `statecraft.ts` in batch E3b (`docs/flags.md` item pp,
 * `docs/audit/evaluations.md` §4b step 9). It reads `evaluator.ts` for the
 * offers a card opens and the seals a card lengthens; the evaluator reads it
 * back for what a seat holds — a function-level cycle, the documented kind
 * (CLAUDE.md), and `test/mapgen/moduleCycles.test.ts` loads both first in turn.
 * `../statecraft.ts` re-exports it, so no import path in the tree changed.
 */

import {
} from '../yields/town';
import {
} from '../yields/empire';
import { type MaliceId, MALICE_IDS, MALICE_RULES, isMaliceId, maliceDef } from '../maliceData';
import type { CityYields } from '../cities';
import { nextFloat } from '../rng';
import { RULES } from '../rulesData';
import { type GameState, type HeldMalice, type Player, playerById, realPlayers } from '../state';
import {
  type Band,
  type CardId,
  type DeckId,
  type DoctrineId,
  type GovernmentId,
  type OrderId,
  type OrderRarity,
  type OrderSlotGrant,
  type SlotType,
  type TallyOccasion,
  GOVERNMENT_TIERS,
  REWARD_DRAFTS,
  STARTING_GOVERNMENT,
  STATECRAFT,
  bandTierAt,
  doctrineDef,
  governmentDef,
  governmentsAtTier,
  isCharter,
  isDoctrineId,
  isGovernmentId,
  isOrderId,
  orderDef,
  orderFitsSlot,
  orderSlot,
  ordersForDecks,
  poolDoctrines,
  poolOrders,
  slotCount,
  slotLayout,
} from '../statecraftData';
import { awardOrderBeads } from '../beads';
import { awardOccasion } from '../triumphs';
import { type TechAge, highestAge } from '../techData';
import { sealTurnsFor } from './evaluator';
import {
  cardExtraChairs,
  cityScopeAdmits,
  countOf,
  effectsOfKind,
  forgetTheLaw,
  helpings,
} from './evaluator';
import { bumpEconomy } from '../slate';

const METER = STATECRAFT.meter;

// --- the ladder's arithmetic ------------------------------------------------

/**
 * What the `n`-th draft costs, in culture. `n` is the number already taken, so
 * the opening draft is `draftCost(0)`.
 *
 * Escalates by **draft count only, never by city count** — Entry I's third
 * commitment, restated by Entry XV: authority is the only lawful width tax, and
 * a civic cost that grew with the empire would be a second one wearing a hat.
 * The shape is `base + linear·n + n^exp`, which is `growthThreshold`'s shape one
 * scale out, floored for the same reason: a pool of whole numbers wants a whole
 * threshold, or a fraction banked forever eventually decides a draft turn nobody
 * can account for.
 */
export function draftCost(drafts: number): number {
  const n = Math.max(0, Math.floor(drafts));
  return Math.floor(METER.costBase + METER.costLinear * n + n ** METER.costExponent);
}

/** What this player's next draft costs. The fold of the curve and their tier. */
export function nextDraftCost(player: Player): number {
  return draftCost(player.statecraft.drafts);
}

// --- rarity, and the pity a skip buys -------------------------------------

/**
 * **The draw's weights** (the user's ruling of 2026-09-04: *"no more upgrading
 * altogether, all cards are as is. Players are given an option to skip and
 * increase the rarity of their next draft"*).
 *
 * What the ladder left behind. A draft used to ask *widen or deepen*, and the
 * deepening was the whole of what a second copy of a card meant: an authored
 * increment, a ceiling, a `maxLevel`, an expansion point, a level on every
 * holding. All of it is gone — a card is what its row prints, in every empire,
 * forever — and the question the draft asks instead is **take one, or pass**.
 *
 * A pass has to be worth something or it is a button nobody presses, and what
 * it is worth is the *bag*: every Order row carries an `OrderDef.rarity`, the
 * bag is drawn from by weight rather than uniformly (`rarityWeights`: common 4,
 * uncommon 2, rare 1), and each consecutive skip adds `skipPity` to the
 * uncommon and rare weights of the next draw. Take a card and the count goes
 * back to zero.
 *
 * Three properties this shape has and a "reroll" would not:
 *
 *   · **the offer is still drawn once and spent by a command.** A skip *is* the
 *     spend — the hand is gone, not re-dealt — so a replay deals the same cards
 *     to the same seat whatever anybody clicked.
 *   · **the pity is an absolute count**, never a countdown: `orderSkips` is how
 *     many drafts in a row this empire has passed, compared when the next hand
 *     is dealt, ticked by nothing.
 *   · **culture already paid stays paid.** The draft's cost came out when the
 *     meter filled (`settleDraft`); passing does not hand it back, which is
 *     what makes the choice cost something.
 *
 * **Restated for the rarity-first draw** (the decks rework, D1a): the bag is no
 * longer weighted per card. A rung is drawn first at the table's odds
 * (`rarityOdds`, 60 / 30 / 10 renormalised over the rungs the bag holds) and a
 * card uniformly within it, so what a pass buys is a *shift* of those odds —
 * `skipPity` points moved out of common and into uncommon and rare per skip —
 * and never a growth of them.
 */

/** The three rungs, weakest pull first — the order the odds are read in. */
export const RARITIES: readonly OrderRarity[] = ['common', 'uncommon', 'rare'];

/**
 * **The odds of each rung under `skips` consecutive passes**, in probability
 * points — the table's own numbers with the pity moved (never added): each
 * skip takes `skipPity.uncommon + skipPity.rare` points off common, floored at
 * nought, and hands them to the two rungs the knob names.
 *
 * Points rather than a normalised probability, because a bag rarely holds all
 * three rungs: `drawRarityFirst` renormalises over the rungs actually present,
 * which is the design doc's rule word for word (*"renormalize if a rarity is
 * absent"*), and a table that had already been normalised over three would be
 * normalised twice.
 */
export function rarityOdds(skips: number): Record<OrderRarity, number> {
  const passes = Math.max(0, Math.floor(skips));
  const base = STATECRAFT.rarityOdds;
  const up = Math.max(0, STATECRAFT.skipPity.uncommon ?? 0) * passes;
  const top = Math.max(0, STATECRAFT.skipPity.rare ?? 0) * passes;
  const common = Math.max(0, (base.common ?? 0) - up - top);
  // What common could not give, the two rungs do not receive: the shift is
  // bounded by the floor so that three passes on a thin table cannot mint
  // probability out of nothing.
  const given = Math.min(up + top, Math.max(0, base.common ?? 0));
  const share = up + top <= 0 ? 0 : given / (up + top);
  return {
    common,
    uncommon: Math.max(0, (base.uncommon ?? 0) + up * share),
    rare: Math.max(0, (base.rare ?? 0) + top * share),
  };
}

/**
 * The same reading, by rung — what a screen asks when it wants to say whether
 * a pass buys anything (`passFigure`, `main.ts`: the rare rung's points now
 * against its points after one more pass).
 */
export function rarityDrawWeight(rarity: OrderRarity, skips: number): number {
  return rarityOdds(skips)[rarity];
}

/**
 * **The chance each card in a bag has of being the one dealt**, under the
 * rarity-first draw — the distribution `drawRarityFirst` samples from, written
 * out so the bot's expectation (`expectedBestOrder`, `ai/wants.ts`) and the
 * tests read the same arithmetic the draw performs rather than a second copy.
 *
 * A rung's points are renormalised over the rungs the bag holds, and a rung's
 * share is split evenly over its cards. An empty bag is an empty list. A bag
 * whose every rung weighs nothing (a table retuned to nought) is dealt
 * uniformly, which is `drawRarityFirst`'s own fallback.
 */
export function rarityFirstOdds(
  bag: readonly OrderId[],
  skips: number,
): { id: OrderId; chance: number }[] {
  if (bag.length === 0) return [];
  const odds = rarityOdds(skips);
  const counts: Record<OrderRarity, number> = { common: 0, uncommon: 0, rare: 0 };
  for (const id of bag) counts[orderDef(id).rarity] += 1;
  let total = 0;
  for (const rarity of RARITIES) if (counts[rarity] > 0) total += odds[rarity];
  return bag.map((id) => {
    const rarity = orderDef(id).rarity;
    const chance = total <= 0 ? 1 / bag.length : odds[rarity] / total / counts[rarity];
    return { id, chance };
  });
}

// --- what a player holds ----------------------------------------------------

/**
 * An Order in a slot, and the turn from which it may be taken out again.
 *
 * The seal is stored as an **absolute turn**, not a countdown, and that is
 * deliberate: a countdown is state that has to be ticked, and a phase that ticks
 * it is a phase that can be skipped, run twice, or run in the wrong order. A
 * turn number is compared instead of maintained, so "sealed for 3" is a
 * subtraction the interface does and the simulation never has to remember.
 */
export interface SlottedOrder {
  card: OrderId;
  /** `state.turn >= sealedUntil` means it is free to move. */
  sealedUntil: number;
  /**
   * **When this chair's periodic boon next comes round**, absolute, or absent
   * because the card in it has no clock (which is every card in the table today).
   *
   * `sealedUntil`'s discipline at a different cadence and for its reason exactly:
   * a countdown is state a phase has to tick, and a phase that ticks it is a
   * phase that can be skipped, run twice, or run in the wrong order. See
   * `CardPeriodicEffect` for the stamping rule and `runPeriodicBoons` for the one
   * place either field is written.
   *
   * It lives on the **chair** rather than on the owned card, unlike
   * `PlayerStatecraft.tallies`, and that is the ruled reading: a card taken out
   * of its chair loses its clock, because the bench is never productive.
   */
  nextFiresTurn?: number;
  /**
   * The **period the stamp above was made under**, so a shortener slotted or
   * unslotted since can move the stamp by exactly the difference.
   *
   * Written beside `nextFiresTurn` and never without it. It is the only thing
   * that lets the phase notice a clock that changed between two firings, which is
   * what keeps the re-stamping rule out of the reducer: the one moment anything
   * fires is the one moment anything has to be re-stamped.
   */
  firePeriod?: number;
  /**
   * **Order drafts rerolled while this card has sat in this chair** — the count
   * `rerollsWhileSlotted` reads.
   *
   * Declared here and written by **nobody** until batch C1 builds the reroll
   * verb (`docs/fewer-things-plan.md`): a save from before that batch and a save
   * from after it serialise identically for every empire that has never
   * rerolled, because absence is nought. It belongs to the chair for the count's
   * own reason — the ruled sentence is *"while this Order is slotted"*.
   *
   * **Order drafts, and only Order drafts** — which is what this field has always
   * said and what it still says now that a Doctrine draft and a great-person
   * draft can be rerolled on the same faith ladder (schema 85, ruled 2026-09-07:
   * item q). The Votive Tally sits in the chairs the Order draft fills and is
   * written on that draft; a card that quietly began counting two more kinds of
   * hand would be a different card from the one the player took. Its row says so
   * in words.
   */
  rerollsSeen?: number;
}

/**
 * A draft: the cards dealt, and nothing else.
 *
 * The options are an ordered list and a pick is an **index**, never an id —
 * `DiscoveryOffer`'s rule, and here for its reason: an index can only ever name
 * something the player was actually dealt.
 *
 * There is no fourth face. The upgrade option went with the ladder on
 * 2026-09-04 ("all cards are as is"), and what stands in its place is not an
 * option at all but a second verb: `skipOrderOffer` passes the whole hand and
 * buys a rarer one next time. That is deliberately *not* an index — a pass is
 * not a card, and a client that could name it as one would be a client the
 * reducer has to tell apart from a pick.
 */
export interface OrderOffer {
  /** The new cards, in draw order — position for position with `positions`. */
  options: OrderId[];
  /**
   * **Which category each position of the base hand was dealt from** (the
   * decks rework, D1a): the seat's first deck, its second, and the third
   * position's turn of the cadence — or, on a rainbow seat, the two decks the
   * hand sampled. Written when the hand is dealt and read by two things: the
   * screen's badge, and a **redraw**, which must keep the same categories (the
   * design doc's rule 6: *"redraws keep the same position categories"*) — so
   * `drawOrderOffer` reads the hand it replaces off the state rather than
   * re-sampling a rainbow seat's decks. Absent on a hand from before the
   * rework, which no save this build loads can hold.
   */
  positions?: HandPosition[];
  /**
   * **This hand has already had its free redraw** — the Rihla's stamp (batch
   * L6a, `CardActionRule` `rerollOffers`). Presence is the state and it dies
   * with the offer, which is what makes the waiver one per *draft* rather than
   * one per game; a seat without the rule never writes it.
   */
  rerolled?: true;
}

/**
 * **A reward hand on the table** — three rares (or fewer) dealt when a banked
 * reward was opened (`openRewardHandAt`), and the draft count it was banked
 * at. Spent by `chooseReward` or `passReward`; blocks nothing.
 */
export interface RewardOffer {
  /** The regular draft count this reward was banked at — 4, 18 or 29. */
  drafts: number;
  /** The rares dealt, in draw order — position for position with `positions`. */
  options: OrderId[];
  /** `OrderOffer.positions`' twin: the deck each position came from. */
  positions?: HandPosition[];
}

/**
 * **What category one position of a hand is dealt from** — the vocabulary of
 * the design doc's "Normal three-card hands", rules 1 and 2.
 *
 *   · `deck` — a single-type card of one named deck (the first two positions
 *     of every hand, and the third's every fourth turn);
 *   · `generic` — a row with no membership, everybody's (the third's first and
 *     third turns);
 *   · `cross` — a two-deck row naming either of the seat's decks (the third's
 *     second turn).
 *
 * A position whose category holds nothing falls back to the eligible union
 * (rule 5), and the badge then says what the *card* is rather than what the
 * position asked for — `positions` records the ask, the row records the card.
 */
export type HandPosition =
  | { kind: 'deck'; deck: DeckId }
  | { kind: 'generic' }
  | { kind: 'cross' };

/**
 * One growing card's counter: what it is counting for, and how much.
 *
 * `count` is deliberately **raw** — the occasions themselves, or in The Almoners'
 * Book's case the coin itself — and never the helpings it works out to. The
 * card's own `per` does the dividing when the line is read (`helpings`), so a
 * remainder is kept by the counter rather than rounded away an occasion at a
 * time: four hundred gold spent in four purchases of a hundred pays the same as
 * one purchase of four hundred, which is the only reading a player can check.
 */
export interface OrderTally {
  card: OrderId;
  count: number;
}

/**
 * **What one card has paid this empire, voice by voice, since it first paid
 * anything** — the lifetime tally (`docs/flags.md` (bbbbbb), batch S2).
 *
 * `OrderTally`'s twin and its opposite in what it counts: that row is what a
 * card *watched*, this one is what a card *paid*. The figure is the Ledger's own
 * — `explainDeckLedger`'s per-card line of the statecraft class, which is the
 * very slice `collectYields` banks, added once a turn by `recordDeckTally`
 * (`ledgerFold.ts`), so the six numbers here are what the sheet's first band
 * has said this card made, turn after turn, and nothing else.
 *
 * **Per card and not per voice**, though the ruling's first sentence says "per
 * voice", and for a reason the ruling itself supplies: the Ledger's third band
 * prints *per card*, and a per-voice sum could not be un-summed into one. The
 * per-voice figure the score reads is the fold of these rows (`foldDeckLedger`),
 * which keeps rule 5's shape — the total is the sum of the list, never a second
 * counter kept beside it — and keeps *one add a turn* exactly as ruled: the fold
 * already attributes every turn's slice to the card that paid it, so writing the
 * lines down is the same one pass whether the rows are six or sixty.
 *
 * Keyed by the **card** (any `CardId` the class files under the deck — an Order,
 * a Doctrine, a government, a malice), for `OrderTally`'s reason: the figure
 * lives on the card, survives the bench, survives adoption's rebuild of `slots`
 * and cannot be inherited by a card that happens to fill the same chair. A row
 * is never removed and never zeroed — a card unslotted, or a government left
 * behind, keeps what it paid, because "what has this card paid me" is history.
 */
export interface CardYieldTally {
  card: CardId;
  /** Six voices, whole numbers, signed — a malice's row is what it cost. */
  paid: CityYields;
}

/** Three Doctrines from one adoption's pool, drawn without replacement. */
export interface DoctrineOffer {
  options: DoctrineId[];
  /**
   * **This hand has already had its free redraw** — the Rihla's stamp (batch
   * L6a, `CardActionRule` `rerollOffers`). Presence is the state and it dies
   * with the offer, which is what makes the waiver one per *draft* rather than
   * one per game; a seat without the rule never writes it.
   */
  rerolled?: true;
}

/**
 * A government offer, **banked until claimed** (Entry XV: adoption is bankable).
 *
 * It is a fixed triple rather than a draw — the deterministic spine — so the
 * options are read off the table and the *tier* is what is stored. Storing the
 * list anyway would be a second copy of the table that a retune could put out of
 * step with it.
 */
export interface GovernmentOffer {
  tier: number;
  options: GovernmentId[];
}

/**
 * Everything Statecraft knows about one empire.
 *
 * A nested object rather than eight fields on `Player`, because it is one
 * subject with one lifecycle: it is created whole, it is replaced wholesale on
 * adoption, and a screen reads all of it at once.
 *
 * **There is no basket field.** The culture banked toward the next draft *is*
 * `Player.culturePool` — the pool `state.ts` has always described as "banked
 * toward the next social policy" and nothing has ever spent. A second bank would
 * be a second answer to "how close am I", and the two would disagree the first
 * time a windfall paid one of them. Border culture stays its own channel
 * (`City.culture`) and is not spent here, which is what "do not double-spend"
 * means: one turn's culture fills the city's border basket *and* the empire's
 * pool, exactly as it did before this system existed.
 */
export interface PlayerStatecraft {
  /** Drafts taken. **This is the tier.** */
  drafts: number;
  government: GovernmentId;
  /** Every Order held, in the order they were drafted. Each is held once. */
  orders: OrderId[];
  /**
   * What is in each slot, indexed by the government's `slotLayout`. `null` is
   * an empty slot — a real state, unlike an absent key, because the *number* of
   * slots is a fact about the government and the array's length says so.
   */
  slots: (SlottedOrder | null)[];
  /** Doctrines held, in the order they were taken. Permanent, slotless. */
  doctrines: DoctrineId[];
  /**
   * The Orders whose `onSlot` grant has already been paid, in the order it was
   * paid — the once-per-game flag for The Laureate's great person.
   *
   * A **list of ids** rather than a boolean per card, for `Player.legacies`'
   * reason exactly: it is the register of what has happened, so a second Order
   * with a slot grant needs no second field, and iteration order that is part of
   * the state is iteration order a replay reproduces. Presence is the state, and
   * nothing ever removes an entry — unslotting The Laureate and slotting it
   * again is not a second great person, which is what "once" means.
   */
  grantedOnSlot: OrderId[];
  /**
   * **Consecutive drafts this empire has passed** — the pity the skip verb buys
   * (the user's ruling of 2026-09-04).
   *
   * An **absolute count**, in the register `SlottedOrder.sealedUntil` and every
   * other timed fact in this game keep: it is written by `settleOrderSkip` and
   * zeroed by `settleOrderChoice`, compared once when the next hand is dealt,
   * and ticked by nothing. A phase that ticked it would be a phase that can be
   * skipped, run twice, or run in the wrong order.
   *
   * Always present, never optional, so a seat that has passed nothing and a
   * seat that has passed and then taken a card serialise identically.
   */
  orderSkips: number;
  /**
   * **Order drafts this empire has rerolled for faith under its present
   * government** (schema 71; zeroed on adoption since schema 118).
   *
   * `orderSkips`' twin and its opposite: a pass gives a hand up and banks pity,
   * a reroll pays for another one and banks a *price*. It grows dearer with
   * every use, which is the whole design of the reroll — and it was a lifetime
   * count until B1 (`docs/flags.md` (aaaaaa): *"how expensive re-rolls are"*),
   * when the compounding for life turned out to be the thing that made a
   * specific card a lottery ticket. So it is **zeroed by adopting a
   * government** — an event write in `adoptGovernmentAt`, the one writer of
   * adoption, and never a countdown — and a fresh charter arrives with a cheap
   * reroll. Taking a card still does not reset it: a count that reset on a pick
   * would be a discount for the thing the draft already rewards.
   *
   * An **absolute count**, read once by `explainRerollCost` when the button
   * prints the next price, raised in one place (`settleReroll`, `religion.ts`),
   * zeroed in one (`adoptGovernmentAt`) and ticked by nothing. Distinct from
   * `SlottedOrder.rerollsSeen`, which is the same act counted per chair for the
   * cards that pay to watch it: this one is the empire's bill.
   *
   * Always present, never optional — `orderSkips`' rule.
   */
  rerollsTaken: number;
  /**
   * **What each growing card has watched happen** — the counters the scaling
   * family reads (`docs/history/doctrine-ideas.md`, ruled 2026-09-04).
   *
   * A list of `{card, count}` rather than a map, for `Player.legacies`' reason
   * and `grantedOnSlot`'s: iteration order that is part of the state is
   * iteration order a replay reproduces, and a Map's order is the one thing
   * CLAUDE.md's determinism rule forbids an outcome to depend on. The order is
   * **the order each counter first opened**, which is history, and history is
   * what a replay replays.
   *
   * Keyed by the **card** and never by the occasion, which is the whole of the
   * standing ruling read as a shape: the counter lives on the owned order, so it
   * survives being benched, survives adoption's total rebuild of `slots` (which
   * touches this field not at all) and cannot be inherited by a second card that
   * happens to watch the same moment.
   *
   * It grows in exactly one place (`recordScalingOccasion`) and only for cards
   * that are **in a slot** at the moment the occasion fires. Nothing ever
   * removes an entry: a card counted to seven, benched and re-slotted resumes at
   * seven, because the tally is what the player watched happen and no part of it
   * is retroactive in either direction.
   *
   * Always present, never optional — `orderSkips`' rule — so a seat that has
   * counted nothing and a seat that has counted and been benched serialise
   * identically.
   */
  tallies: OrderTally[];
  /**
   * **What each card has paid, voice by voice, since it first paid** — the
   * lifetime tally beside the occasion counters above (schema 117,
   * `docs/flags.md` (bbbbbb)). See `CardYieldTally` for the shape and why it is
   * per card.
   *
   * A list rather than a map, for `tallies`' reason exactly: the order is the
   * order each card first paid, which is history, and history is what a replay
   * reproduces. It grows in exactly one place — `recordDeckTally` in
   * `ledgerFold.ts`, called once a turn at the head of the `collectYields` phase
   * and nowhere else (`test/sim/ledgerFold.test.ts` reads the source for it) —
   * and nothing removes or zeroes an entry.
   *
   * Always present on a seat this build made — `orderSkips`' rule. A state
   * restored from a print older than 117 has no key here, and every reader
   * takes `?? []` for it: that seat's deck has paid nothing it remembers.
   */
  yieldTallies: CardYieldTally[];
  /**
   * **The reward hands this empire has banked and not yet opened**, as the
   * regular draft counts they were banked at (the decks rework, D1a; the
   * design doc's "Doctrine reward hands": *"the player may bank or pass the
   * reward; a banked reward does not block End Turn"*).
   *
   * **Counts and not hands**, and that is the rule's own shape: the hand is
   * dealt when the reward is *opened* (`openRewardHandAt`, a command), from
   * the shelf as it stands then — so a rare taken in a normal draft between
   * the banking and the opening is simply not in it, which is the doc's
   * *"taking any rare in a normal draft removes that same ID from future
   * doctrine hands"* with nothing to remove. An absolute count in every
   * other timed fact's register: written by `settleDraft`, spent by the open,
   * ticked by nothing. Always present, never optional.
   */
  rewardHands: number[];
  /** A draft awaiting a pick, or the key is absent. Blocks End Turn. */
  pendingOrder?: OrderOffer;
  /** A Doctrine draft awaiting a pick, or absent. Blocks End Turn. */
  pendingDoctrine?: DoctrineOffer;
  /** A banked government offer, or absent. Deliberately does **not** block. */
  pendingGovernment?: GovernmentOffer;
  /**
   * **A reward hand opened and on the table**, or absent. Deliberately does
   * **not** block — a reward is a gift the empire may take or leave, and a
   * hand left on the table across a turn is a hand it has not yet answered.
   */
  pendingReward?: RewardOffer;
}

/** A brand-new empire's Statecraft: the chiefdom, one slot spread, nothing held. */
export function newPlayerStatecraft(): PlayerStatecraft {
  return {
    drafts: 0,
    government: STARTING_GOVERNMENT,
    orders: [],
    slots: slotLayout(STARTING_GOVERNMENT).map(() => null),
    doctrines: [],
    grantedOnSlot: [],
    orderSkips: 0,
    rerollsTaken: 0,
    tallies: [],
    yieldTallies: [],
    rewardHands: [],
  };
}

/** This player's Statecraft, or `undefined` for an id that names nobody. */
export function statecraftOf(state: GameState, playerId: number): PlayerStatecraft | undefined {
  return playerById(state, playerId)?.statecraft;
}

/** Does this player hold this card? The whole of what a collection knows. */
export function holdsOrder(sc: PlayerStatecraft, id: OrderId): boolean {
  return sc.orders.includes(id);
}

/** Which slot index holds this card, or −1. */
export function slotOf(sc: PlayerStatecraft, id: OrderId): number {
  for (let i = 0; i < sc.slots.length; i++) {
    if (sc.slots[i]?.card === id) return i;
  }
  return -1;
}

/** Is this card in a slot right now? */
export function isSlotted(sc: PlayerStatecraft, id: OrderId): boolean {
  return slotOf(sc, id) >= 0;
}

/**
 * What this card has counted for this empire so far. Nought for a card that has
 * never counted anything, which is the same answer as an absent row.
 */
export function tallyOf(sc: PlayerStatecraft, id: OrderId): number {
  for (const held of sc.tallies) {
    if (held.card === id) return held.count;
  }
  return 0;
}

/**
 * Writes down one occasion for every **slotted** growing card that was watching
 * for it. **The** one writer of `PlayerStatecraft.tallies`.
 *
 * One helper and not five inline copies, which is the same bargain the whole
 * evaluator is built on: a sixth growing card is a JSON row naming a
 * `TallyOccasion`, and the only thing a *new* occasion costs is the one line at
 * the seam that already knows the moment happened.
 *
 * Three properties, each of them the standing ruling said in code:
 *
 *   · **only while slotted.** The walk is over `sc.slots`, not over `sc.orders`,
 *     so a benched card sees nothing and the bench is never productive. A card
 *     slotted later resumes counting from where it stopped — the row is left
 *     alone rather than reset — because the tally is what the player watched
 *     happen and the slot is the price of watching.
 *   · **once per card per occasion.** A row that says the same tally twice (two
 *     voices paid off one counter, which is exactly what The Reliquary Rolls is)
 *     is still one card watching one moment, so the card is counted and then
 *     skipped.
 *   · **the raw figure.** `amount` is the occasion's own size — one for a kill,
 *     the coin itself for a purchase — and the dividing is the card's `per`, read
 *     where the line is printed. See `OrderTally.count`.
 *
 * Nothing is written for an amount of nought or less, so a free purchase leaves
 * the books exactly as they were.
 */
export function recordScalingOccasion(
  state: GameState,
  playerId: number,
  occasion: TallyOccasion,
  amount = 1,
): void {
  if (amount <= 0) return;
  const sc = statecraftOf(state, playerId);
  if (!sc) return;
  for (const slot of sc.slots) {
    const card = slot?.card;
    if (card === undefined || !isOrderId(card)) continue;
    if (!orderWatches(card, occasion)) continue;
    const held = sc.tallies.find((row) => row.card === card);
    if (held) held.count += amount;
    else sc.tallies.push({ card, count: amount });
  }
}

/**
 * The **world's** occasions, written into every real empire's books at once —
 * The Bell-Founders' jealousy.
 *
 * `realPlayers` order, which is seat order, because a sweep's outcome must
 * depend on an order the state itself carries; the wild keeps no books and holds
 * no cards, so it is out of this by the same clause that keeps it out of every
 * other meter.
 */
export function recordWorldScalingOccasion(
  state: GameState,
  occasion: TallyOccasion,
  amount = 1,
): void {
  for (const player of realPlayers(state)) {
    recordScalingOccasion(state, player.id, occasion, amount);
  }
}

/**
 * Is this card watching for this moment? Read off the row's own effects, so what
 * a card counts and what it pays for counting are one declaration.
 */
function orderWatches(id: OrderId, occasion: TallyOccasion): boolean {
  for (const effect of orderDef(id).effects) {
    if (effect.kind !== 'pays' || effect.basis !== 'count') continue;
    if (effect.count !== 'tally') continue;
    if (effect.tally === occasion) return true;
  }
  return false;
}

/**
 * The slot types this government opens, military first.
 *
 * **THE slot-order contract**, stated once here because two systems now depend on
 * it (ruled 2026-09-06, `docs/history/fewer-things.md` §1's levers):
 *
 *   · this array and `PlayerStatecraft.slots` are **the same order, index for
 *     index** — `newPlayerStatecraft` and `adoptGovernmentAt` both build the
 *     slots by mapping over this list, so slot *i* has flavour `slotTypesOf()[i]`;
 *   · **the order is the order the screen draws**, top to bottom, and therefore
 *     the order a player counts in. "The first economic slot" is the
 *     lowest-indexed slot whose flavour here is `'economic'` — the *chair's*
 *     flavour and never the card's, so an economic Order placed in a wildcard
 *     chair is not sitting in an economic slot;
 *   · rearranging is a **placement**, so a position is a decision a player made
 *     and a card may be paid for it (`CardSlotPositionEffect`, read through
 *     `orderAtSlotPosition`).
 *
 * A screen that grouped the chairs by flavour would break the second clause and
 * with it every position card; `src/ui/statecraftScreen.ts` draws them in this
 * order for that reason.
 */
export function slotTypesOf(sc: PlayerStatecraft): SlotType[] {
  const layout = slotLayout(sc.government);
  // **The array is the standing fact about how many chairs there are**, and the
  // government is the fact about what *kind* each of the first ones is. A card
  // may open more (`CardSlotRiderEffect`), and those are wildcards by
  // construction and appended at the end — so the contract above survives
  // untouched: chair *i* is still the same chair it was before the card was
  // taken, and no position card renumbers. Padded here rather than asked of the
  // law, because this function holds no state and no seat: `chairCount` is where
  // the card is read, and this is the one reading of what is already written
  // down.
  while (layout.length < sc.slots.length) layout.push('wildcard');
  return layout;
}

/**
 * **How many chairs this empire's council has** — its government's layout plus
 * whatever its law adds (`cardExtraChairs`).
 *
 * The one figure `PlayerStatecraft.slots` is ever built to, and therefore the
 * one place the card is read. Every other reading in the game asks the array:
 * `slotTypesOf` pads to its length, `slotOrderError` bounds on it, the screen
 * draws it. That is what makes a widened council a *fact about the state* rather
 * than a figure four readers have to remember to add.
 */
export function chairCount(state: GameState, playerId: number, government: GovernmentId): number {
  return slotCount(government) + cardExtraChairs(state, playerId);
}

/**
 * **Re-fits a council to the chairs its law now opens**, keeping what is sitting
 * in the chairs that survive.
 *
 * The seam a card that widens a government has to have, and the one thing that
 * separates it from `adoptGovernmentAt`'s rebuild: an adoption is a *chapter
 * break* and amnesties every card by design (the new spread's chair 2 is not the
 * old one's), while a chair opened mid-reign changes nothing about the chairs
 * already occupied — the flavours are the same government's, index for index,
 * and the new one is appended. So this is a resize and not a rebuild, and a
 * player who takes The King's Friends does not lose the council they arranged.
 *
 * **Shrinking returns cards to the collection**, which is what an amnesty does
 * one seam over: a card cannot sit in a chair that no longer exists, and
 * `PlayerStatecraft.orders` is the collection it came from, so the row is still
 * held and still slottable the moment there is somewhere to put it. Nothing is
 * lost and nothing is sealed — a seal is a promise about a chair.
 *
 * Called wherever the law that opens chairs changes mid-reign:
 * `adoptGovernmentAt` builds to `chairCount` directly and needs nobody's help,
 * and the leaders' first cut called this from the card a figure had just
 * drafted. **That second seam is gone** (L6a, `docs/flags.md` (xxxx)): a
 * figure's abilities are ordinary effects live from turn one, so a `slotRider`
 * one of them carries is already in the law when a government is adopted and
 * there is no moment left at which a council's size changes under a standing
 * reign — **except the first one**. `newPlayerStatecraft` builds every seat's
 * council to the chiefdom's bare spread before the state exists to read a
 * figure's law through, so `newGame` calls this once per seat after the rosters
 * are placed (the register's one entry): Ibn Battuta's fourth chair is open on
 * turn one, and the two chairs of the chiefdom keep their flavours. The rule
 * that a chair opened mid-reign is a resize and never a rebuild is the part
 * worth keeping, and the next seam that grants or withdraws a `slotRider` calls
 * this too.
 */
export function refitSlots(state: GameState, player: Player): OrderId[] {
  const sc = player.statecraft;
  const want = chairCount(state, player.id, sc.government);
  if (want === sc.slots.length) return [];
  const returned: OrderId[] = [];
  while (sc.slots.length > want) {
    const dropped = sc.slots.pop();
    if (dropped && isOrderId(dropped.card)) returned.push(dropped.card);
  }
  while (sc.slots.length < want) sc.slots.push(null);
  // **And the malices take their chairs again**, for `adoptGovernmentAt`'s
  // reason exactly: a chair index is read off the seating, and a council that
  // shrank under a malice would leave one pointing at a chair that no longer
  // exists. Cheap and idempotent on a council that only grew.
  reseatMalices(player);
  // A chair opened or closed is a chair the meters read through — an Order's
  // lines come and go with it (batch M3, `slate.ts`).
  bumpEconomy(state);
  return returned;
}

/**
 * The Order sitting in the `position`-th chair of a flavour, counting from one in
 * slot order — or `null` for a chair that does not exist or stands empty.
 *
 * The one reading of a slot's *position*, and the whole of what
 * `CardSlotPositionEffect` needs from the state. An absent `slot` counts every
 * chair, which is what "the first slot" means with no flavour named.
 *
 * See `slotTypesOf` for why the array's index is the position a player sees.
 */
export function orderAtSlotPosition(
  sc: PlayerStatecraft,
  position: number,
  slot?: SlotType,
): OrderId | null {
  if (position < 1) return null;
  const flavours = slotTypesOf(sc);
  let seen = 0;
  for (let index = 0; index < sc.slots.length; index++) {
    if (slot !== undefined && flavours[index] !== slot) continue;
    seen += 1;
    if (seen !== position) continue;
    const held = sc.slots[index];
    return held && isOrderId(held.card) ? held.card : null;
  }
  return null;
}

/**
 * **The seat pool** — every dealt row this seat's decks may draw, in file
 * order: its own decks' single-type rows, the cross-type rows naming either,
 * and the generic rows that belong to everybody (`docs/six-decks-first-cut.md`
 * "The structure"; the decks rework, D1a). A rainbow seat holds all six decks
 * and its pool is the whole dealt table.
 *
 * **The draw's source, replacing `poolOfGovernment`** (kept in
 * `statecraftData.ts` for the retired shelves, read by nothing live). A pool
 * used to turn over whole on adoption; a deck never does — *"no pool rotates
 * away"* — so what an adoption buys now is chairs, and what a draft count buys
 * is a band (`bandOpen`). Held cards are **not** taken out here: this is the
 * shelf's shape, which the bot's margin and the Compendium ask about; the bag
 * a hand is dealt from is `eligibleFor`.
 */
export function deckPoolOf(state: GameState, player: Player): OrderId[] {
  void state;
  return ordersForDecks(player.decks);
}

/**
 * **Is a two-deck seat, or a rainbow one?** Read off the list's length, never
 * off the figure: a seat under nobody holds all six too (`leaderDecks`), and
 * the draw's rainbow rule — two *distinct* decks sampled per hand — is the
 * honest deal for any seat holding more than a pair.
 */
export function isRainbowSeat(player: Player): boolean {
  return player.decks.length > 2;
}

/**
 * **The seat's research age** — the highest age among its technologies,
 * floored at one (`highestAge` answers one for an empty list). The age half of
 * the band gate, and deliberately the *empire's* age rather than the world's
 * mean: the design doc's age check names *"the highest age among that
 * empire's researched technologies"* and rules the calendar out by name.
 */
export function researchAgeOf(player: Player): TechAge {
  return highestAge(player.techsResearched);
}

/**
 * **May this band be dealt to a seat at this ladder tier and this age?** Both
 * gates, per the age check of 2026-09-16: the band's rung reached on the draft
 * ladder **and** its age reached in the tree — band 0 from age one, band 1
 * from age two, and so on — so that *"reaching Government I through culture
 * alone cannot offer an age-2 Market card while the empire is still in age
 * 1"*. Earlier bands stay open: nothing rotates away.
 */
export function bandOpen(band: Band, tier: Band, age: TechAge): boolean {
  return band <= tier && band + 1 <= age;
}

/** The band tier this seat's draft count has reached. See `bandTierAt`. */
export function bandTierOf(sc: PlayerStatecraft): Band {
  return bandTierAt(sc.drafts);
}

/**
 * **The bag a hand is dealt from**: the seat pool with the bands gated on the
 * seat's tier and age, minus everything already held (the minus-held half is
 * Entry XV's), in file order. The old `fromAge` gate rides along for any
 * retired row that still carries one — a row already held keeps its chair
 * whatever the age says; the gate is on the deal, never on the holding.
 *
 * Empty is a real answer and the one the exhausted-pool rule reads
 * (`draftExhausted`): a seat that holds everything its decks and bands can
 * deal it is charged nothing for a draft that would deal nothing.
 */
export function eligibleFor(state: GameState, player: Player): OrderId[] {
  const sc = player.statecraft;
  const tier = bandTierOf(sc);
  const age = researchAgeOf(player);
  const held = new Set(sc.orders);
  return deckPoolOf(state, player).filter((id) => {
    if (held.has(id)) return false;
    const def = orderDef(id);
    if (!bandOpen(def.band, tier, age)) return false;
    return def.fromAge === undefined || age >= def.fromAge;
  });
}

// --- the draw ---------------------------------------------------------------

/**
 * `count` ids drawn **without replacement**, uniformly, in the candidate list's
 * own order.
 *
 * `drawDiscoveryOffer`'s walk without the weights: three cards that can be the
 * same card are two cards and a joke, and a pool shorter than the offer hands
 * back what it has — the honest answer, and the one a late-game retired pool
 * needs. Every draw spends exactly one roll whether or not it is used, because a
 * conditional roll is the one way a replay falls out of step with the game it
 * replays.
 */
export function drawWithoutReplacement<T>(state: GameState, from: readonly T[], count: number): T[] {
  const remaining = [...from];
  const wanted = Math.min(Math.max(0, Math.floor(count)), remaining.length);
  const drawn: T[] = [];
  for (let taken = 0; taken < wanted; taken++) {
    const index = Math.min(remaining.length - 1, Math.floor(nextFloat(state.rng) * remaining.length));
    drawn.push(remaining[index]!);
    remaining.splice(index, 1);
  }
  return drawn;
}

/**
 * `drawWithoutReplacement` with a **weight per candidate** — the rarity draw
 * (the ruling of 2026-09-04).
 *
 * The same walk, the same contract, one roll per card actually taken: the only
 * difference is that the roll lands in a running total of weights rather than
 * in a count of items, so a bag of one rare and three commons deals the rare
 * one time in thirteen rather than one in four. Uniform is this function with
 * every weight at 1, which is why the plain draw above is still the one every
 * *other* deck uses — a weight nobody varies is a weight nobody should have to
 * read.
 *
 * **The weight is asked once per candidate per draw**, not cached: the bag
 * shrinks as cards come out of it, and a total computed before the first pick
 * would be a total that no longer describes what is left. That is O(n) per
 * card over a bag of at most a few dozen, which is nothing, and it is the
 * version that cannot silently drift.
 *
 * A negative weight reads as zero and a bag that weighs nothing at all falls
 * back on its last item rather than dealing `undefined` — the honest answer to
 * a retune that made every candidate weightless, and unreachable while any rung
 * carries a positive weight.
 */
export function drawWeighted<T>(
  state: GameState,
  from: readonly T[],
  count: number,
  weightOf: (item: T) => number,
): T[] {
  const remaining = [...from];
  const wanted = Math.min(Math.max(0, Math.floor(count)), remaining.length);
  const drawn: T[] = [];
  for (let taken = 0; taken < wanted; taken++) {
    let total = 0;
    for (const item of remaining) total += Math.max(0, weightOf(item));
    const roll = nextFloat(state.rng) * total;
    let at = remaining.length - 1;
    let running = 0;
    for (let i = 0; i < remaining.length; i++) {
      running += Math.max(0, weightOf(remaining[i]!));
      if (roll < running) {
        at = i;
        break;
      }
    }
    drawn.push(remaining[at]!);
    remaining.splice(at, 1);
  }
  return drawn;
}

// --- how big an offer is ----------------------------------------------------

/**
 * The kinds of offer this game deals, and the axis `explainOfferSize` is asked
 * about.
 *
 * **Open on purpose, and the great people pass took it up**: `'greatPerson'` is
 * a member here, a key of `rules.offers` and a member of `OfferRiderScope` —
 * three edits, no fourth, and every rider that already said `'all'` widened the
 * new draft the day it existed without anybody revisiting a card. Nothing
 * switches over these names: the base is an index into the rules block and a
 * rider matches by equality or by `'all'`.
 */
export type OfferKind = 'order' | 'doctrine' | 'belief' | 'discovery' | 'greatPerson';

/** One contribution to how many cards an offer deals. Rule 5, for a count. */
export interface OfferSizeLine {
  /**
   * Where the number came from: the table itself, a card's own label ("Wonder ·
   * The Oracle"), or the cap. The interface prints these verbatim — see the
   * offer header — so no consumer composes a second sentence about a card.
   */
  source: string;
  /** The **difference** this line makes to the running count, signed. */
  delta: number;
}

/** What the table deals before any card widens it. One label per kind. */
const OFFER_BASE_WORDS: Record<OfferKind, string> = {
  order: 'a draft',
  doctrine: 'a doctrine draft',
  belief: 'a consecration',
  discovery: 'a discovery',
  greatPerson: 'a great-person offer',
};

/**
 * How many cards an offer of this kind deals *this empire, right now* — as the
 * ordered list it is the fold of (rule 5, at the scale of a decision).
 *
 * **One evaluator for four drafts.** A Statecraft draft, a Doctrine triple, a
 * consecration and a claimed ruin all ask this, so a card that says "every draft
 * shows one more card" is read once and lands on all of them — which is the
 * whole point: The Oracle (+1 Statecraft draft) and the Leaning Tower (+1 in
 * every draft of every kind) are JSON rows, and the great person who does the
 * same is a row on another table read through the same fold.
 *
 * The lines, in order:
 *
 *   1. **the base**, `rules.offers[kind]` — every number data, as ever.
 *   2. **one line per live `offerRider`** whose `offer` is this kind or `'all'`,
 *      from every source `liveEffects` walks. A wonder standing in a city, a
 *      belief, a Doctrine and an Order are all the same sentence here, and none
 *      of them needed code.
 *   3. **the cap**, `rules.offers.max`, as a negative line — so an offer that was
 *      trimmed says it was trimmed rather than quietly ignoring a card the
 *      player paid for.
 *
 * A Statecraft draft's **pass** is not in this count and could not be: it is a
 * verb rather than a card (`skipOrderOffer`), so a rider that widens the hand
 * widens the hand and leaves the second answer exactly where it was. The
 * upgrade face this paragraph used to carve out went with the ladder on
 * 2026-09-04.
 */
export function explainOfferSize(
  state: GameState,
  playerId: number,
  kind: OfferKind,
): OfferSizeLine[] {
  const lines: OfferSizeLine[] = [
    { source: OFFER_BASE_WORDS[kind], delta: Math.max(0, Math.floor(RULES.offers[kind])) },
  ];
  let running = lines[0]!.delta;

  for (const { source, effect } of effectsOfKind(state, playerId, 'offerRider')) {
    if (effect.offer !== kind && effect.offer !== 'all') continue;
    // A rider with no figure deals the ordinary one card, so a data row may say
    // only which draft it widens. The cap below is what stops a stack of them
    // becoming a spread nobody can read.
    const extra = (effect.extra ?? 1);
    if (extra === 0) continue;
    lines.push({ source, delta: extra });
    running += extra;
  }

  const max = Math.max(1, Math.floor(RULES.offers.max));
  if (running > max) lines.push({ source: `the table's limit of ${max}`, delta: max - running });
  return lines;
}

/**
 * Every extra trade route this empire's cards grant, as labelled lines —
 * `explainOfferSize`'s second half at the scale of a caravan.
 *
 * It stops here, in the one module that switches on a `CardEffect.kind`, and
 * hands `trade.ts` a list it folds into `explainRouteSlots` beside the lines the
 * *buildings* supply. A market's slot and the Great Lighthouse's are one number
 * with two sources, exactly as authority capacity is.
 *
 * **A scoped rider lines up once per town that admits it** (Harbourmasters,
 * `docs/flags.md` (xxx) mark 8). One line each rather than one line multiplied,
 * for `explainRouteSlots`' own reason: a market's slot is printed with the town
 * that raised it, and a player watching four routes appear is owed the four
 * harbours. The towns are walked in `state.cities` order, which is what that fold
 * already walks, so the two halves of the list are one ordering.
 */
export function cardRouteSlots(state: GameState, playerId: number): OfferSizeLine[] {
  const lines: OfferSizeLine[] = [];
  for (const { source, card, effect } of effectsOfKind(state, playerId, 'routeRider')) {
    // A rider with no figure grants the ordinary one route, so a data row may
    // say only that it widens the fold.
    const extra = (effect.extra ?? 1);
    if (extra === 0) continue;
    const scope = effect.scope;
    if (scope === undefined) {
      // **A road per helping of something counted** — The Harbour Chain's, and
      // the other way a rider may open more than one. Read after the scope and
      // never beside it: a row carrying both is asking two questions, and the
      // scope is the older field so no row written before this changes its
      // figure. `countOf` and `helpings` are the counts' own reading and their
      // own divisor, so a road counted off the harbours and a coin counted off
      // them round the same way.
      if (effect.count !== undefined) {
        const times = helpings(
          countOf(state, playerId, card, {
            kind: 'pays',
            where: 'empire',
            basis: 'count',
            to: 'authority',
            amount: 0,
            count: effect.count,
            building: effect.building,
          }),
          effect.per,
          effect.max,
        );
        if (times === 0) continue;
        lines.push({ source: `${source} · ×${times}`, delta: extra * times });
        continue;
      }
      lines.push({ source, delta: extra });
      continue;
    }
    for (const city of state.cities) {
      if (city.ownerId !== playerId) continue;
      if (!cityScopeAdmits(state, city, scope, playerId)) continue;
      lines.push({ source: `${source} · ${city.name}`, delta: extra });
    }
  }
  return lines;
}

/** The fold of `explainOfferSize`, and the only sum of one. */
export function foldOfferSize(lines: readonly OfferSizeLine[]): number {
  let total = 0;
  for (const line of lines) total += line.delta;
  return total;
}

/**
 * How many cards this offer deals. The fold, and the **one** number every
 * generator draws to.
 *
 * Asked at the moment the offer opens and never again — the trap the whole
 * Statecraft chapter is built on (an offer is drawn once and spent by a
 * command), which for a *size* matters twice over: an empire that finishes a
 * wonder between the draw and the click would otherwise be shown a hand with a
 * card missing, and under simultaneous turns two seats look at different times.
 * The drawn array is the offer; its length is the size, for good.
 */
export function offerSize(state: GameState, playerId: number, kind: OfferKind): number {
  return foldOfferSize(explainOfferSize(state, playerId, kind));
}

// --- the positions -----------------------------------------------------------

/**
 * **The base hand is three positions** (the design doc's "Normal three-card
 * hands"): two from the seat's decks, one by the cadence. `rules.offers.order`
 * is still the table's size and a rider still widens it (`explainOfferSize`)
 * — the extra cards are dealt after the base hand from the eligible union,
 * rarity-first, *"without extra guaranteed generic or cross positions"* (rule
 * 6). A hand narrower than three (nothing trims one today) deals its first
 * `size` positions and no more.
 */
export const HAND_POSITIONS = 3;

/**
 * **The third position's cadence**, by regular draft number: generic → cross →
 * generic → single, repeating (rule 2). Draft one deals a generic third card,
 * draft two a cross, draft four a single-type card from one of the seat's own
 * decks — and *"the extra single-type position alternates between the two
 * leader decks on successive occurrences"*, which is the second index below.
 */
const THIRD_CADENCE: readonly ('generic' | 'cross' | 'single')[] = [
  'generic',
  'cross',
  'generic',
  'single',
];

/**
 * **What the third position asks for on the `draftNumber`-th regular draft**,
 * and — when it asks for a single-type card — *which* of the seat's decks by
 * the count of single turns so far. Pure arithmetic on the draft count, so a
 * redraw of the same draft asks the same question (rule 6: *"a new paid
 * regular draft advances the cadence; repeatedly passing/redrawing one offer
 * does not"*).
 */
export function thirdPositionOf(draftNumber: number): { turn: 'generic' | 'cross' | 'single'; single: number } {
  const n = Math.max(1, Math.floor(draftNumber));
  const turn = THIRD_CADENCE[(n - 1) % THIRD_CADENCE.length]!;
  return { turn, single: Math.floor((n - 1) / THIRD_CADENCE.length) };
}

/**
 * **The three positions this hand is dealt into** — the seat's two decks and
 * the third by the cadence, or on a rainbow seat two decks sampled distinct
 * and the third's single turn a *different* deck where one exists (rule 4).
 *
 * The rainbow sampling spends `state.rng` — two rolls for the pair and one
 * more on a single turn — and it is the only part of the ask that does: a
 * two-deck seat's positions are a function of its row and the draft count.
 * Rolled here rather than in the draw so that the ask is written onto the
 * offer (`OrderOffer.positions`) and a redraw can keep it without rolling
 * again — the whole reason `positions` exists.
 */
export function drawHandPositions(state: GameState, player: Player, draftNumber: number): HandPosition[] {
  const decks = player.decks;
  const third = thirdPositionOf(draftNumber);
  let first: DeckId | undefined;
  let second: DeckId | undefined;
  if (isRainbowSeat(player)) {
    // Two *different* decks, uniformly: the first off the whole list, the
    // second off the list without it. Deliberately not `drawWithoutReplacement`
    // over a two-count, whose rolls would be the same two — written out so the
    // roll contract reads on the page.
    [first] = drawWithoutReplacement(state, decks, 1);
    [second] = drawWithoutReplacement(state, decks.filter((deck) => deck !== first), 1);
  } else {
    first = decks[0];
    second = decks[1] ?? decks[0];
  }
  const positions: HandPosition[] = [];
  if (first !== undefined) positions.push({ kind: 'deck', deck: first });
  if (second !== undefined) positions.push({ kind: 'deck', deck: second });
  if (third.turn === 'generic') positions.push({ kind: 'generic' });
  else if (third.turn === 'cross') positions.push({ kind: 'cross' });
  else if (isRainbowSeat(player)) {
    // "Choose a different third type if possible": the decks not already in
    // the hand, or the whole list when the seat holds only the two.
    const others = decks.filter((deck) => deck !== first && deck !== second);
    const [deck] = drawWithoutReplacement(state, others.length > 0 ? others : decks, 1);
    if (deck !== undefined) positions.push({ kind: 'deck', deck });
  } else {
    const deck = decks[third.single % Math.max(1, decks.length)];
    if (deck !== undefined) positions.push({ kind: 'deck', deck });
  }
  return positions;
}

/**
 * **The rows of a bag that answer one position's ask.** A `deck` position is
 * the single-type rows of that deck (a cross-type row has two homes and is the
 * cross position's, not either deck's); `cross` is every two-deck row that
 * names any of the seat's decks; `generic` is every row with no home.
 */
export function positionBag(
  bag: readonly OrderId[],
  position: HandPosition,
  decks: readonly DeckId[],
): OrderId[] {
  return bag.filter((id) => {
    const home = orderDef(id).decks;
    switch (position.kind) {
      case 'deck':
        return home.length === 1 && home[0] === position.deck;
      case 'cross':
        return home.length === 2 && home.some((deck) => decks.includes(deck));
      case 'generic':
        return home.length === 0;
      default: {
        const unhandled: never = position;
        void unhandled;
        return false;
      }
    }
  });
}

/**
 * **One card, rarity first** (rule 1): a rung at the odds of `rarityOdds`
 * renormalised over the rungs the bag holds, then a card uniformly within it —
 * in **one roll**. The roll lands in the rungs' points laid end to end; where
 * it lands says the rung, and how far into the rung it landed, rescaled, says
 * the card. One roll per card is the contract `drawWeighted` kept and the one
 * a replay is owed either way; two rolls would say the same thing and spend
 * twice.
 *
 * An empty bag deals nothing and spends nothing (emptiness is a fact about the
 * shelf, never about the moment, so two runs of one state spend the same
 * rolls). A table whose every rung weighs nothing deals uniformly.
 */
export function drawRarityFirst(
  state: GameState,
  bag: readonly OrderId[],
  skips: number,
): OrderId | undefined {
  if (bag.length === 0) return undefined;
  const odds = rarityOdds(skips);
  const rungs = RARITIES.map((rarity) => ({
    rarity,
    cards: bag.filter((id) => orderDef(id).rarity === rarity),
  })).filter((rung) => rung.cards.length > 0);
  let total = 0;
  for (const rung of rungs) total += Math.max(0, odds[rung.rarity]);
  const roll = nextFloat(state.rng);
  if (total <= 0) {
    return bag[Math.min(bag.length - 1, Math.floor(roll * bag.length))];
  }
  let running = 0;
  for (let index = 0; index < rungs.length; index++) {
    const rung = rungs[index]!;
    const width = Math.max(0, odds[rung.rarity]) / total;
    const last = index === rungs.length - 1;
    if (roll < running + width || last) {
      const within = width <= 0 ? 0 : Math.min(0.999999, Math.max(0, (roll - running) / width));
      return rung.cards[Math.min(rung.cards.length - 1, Math.floor(within * rung.cards.length))];
    }
    running += width;
  }
  return bag[bag.length - 1];
}

/**
 * **The new cards of one draft**: one per position, then the extras — the
 * design doc's "Normal three-card hands", rules 1, 2, 5 and 6 (the decks
 * rework, D1a; this replaced the M/E/W spread of 2026-09-03).
 *
 * Position by position, in the order `positions` names them: the bag is the
 * position's own category out of what is eligible and not yet in the hand
 * (`positionBag`), or the whole of it when the category is empty (rule 5), and
 * one card comes out rarity-first (`drawRarityFirst`). Then the extra cards a
 * rider added, from the union, the same way. **Every position excludes the
 * hand** — a card dealt twice is two cards and a joke — and nothing here can
 * reach a deck the seat does not hold, because `eligible` is already the
 * seat's own.
 *
 * **The roll contract**: one roll per card actually dealt and none for a
 * position whose bag is empty. Emptiness is a fact about the shelf and the
 * collection, never about the moment, so two runs of one state spend the same
 * rolls in the same order — the replay's whole claim on a draw.
 *
 * **The hand comes back in position order**, and that is a change from the
 * spread's file-order shuffle, made on purpose: a position *is* a fact about
 * the card (the badge says which deck asked for it), and `positions` is
 * written beside the options index for index. A choice still names an index
 * into what it is shown.
 *
 * Exported for the pins and for the bot's expectation of a hand: a rule about
 * *what a generator deals* is testable only by asking it for many hands.
 */
export function drawOrderOptions(
  state: GameState,
  eligible: readonly OrderId[],
  positions: readonly HandPosition[],
  size: number,
  skips: number,
  decks: readonly DeckId[],
): OrderId[] {
  const hand: OrderId[] = [];
  const open = (): OrderId[] => eligible.filter((id) => !hand.includes(id));
  const wanted = Math.max(0, Math.floor(size));
  for (const position of positions.slice(0, wanted)) {
    const rest = open();
    // Rule 5: the position's own category, or the whole eligible union when
    // that category holds nothing this seat does not already own. Never an
    // inaccessible deck, never a duplicate — both are outside `eligible`.
    const bag = positionBag(rest, position, decks);
    const drawn = drawRarityFirst(state, bag.length > 0 ? bag : rest, skips);
    if (drawn !== undefined) hand.push(drawn);
  }
  // The extra cards a rider adds (rule 6): distinct, eligible, rarity-first,
  // from the union — no guaranteed category.
  for (let extra = hand.length; extra < wanted; extra++) {
    const drawn = drawRarityFirst(state, open(), skips);
    if (drawn === undefined) break;
    hand.push(drawn);
  }
  return hand;
}

/**
 * **The bags the next hand would be dealt from, one per card, with no roll** —
 * the draw's shape read as a plan, for the bot's expectation of a hand
 * (`expectedBestOrder`, `ai/wants.ts`) and for nothing that deals.
 *
 * A two-deck seat's positions are pure arithmetic (`thirdPositionOf`), so its
 * bags are the draw's own, fallback included. A rainbow seat's two decks are
 * rolled at the deal, which a reading may not do, so its deck positions are
 * approximated by **the union of its single-type rows** — an honest widening
 * written down: the estimate reads a rainbow hand as slightly better than any
 * one pair of decks would deal. The count read is the *next* draft's when no
 * hand is on the table (`sc.drafts + 1`), and the standing hand's positions
 * when one is — the same rule the deal keeps.
 */
export function expectedHandBags(state: GameState, player: Player): OrderId[][] {
  const sc = player.statecraft;
  const eligible = eligibleFor(state, player);
  if (eligible.length === 0) return [];
  const size = offerSize(state, player.id, 'order');
  const bags: OrderId[][] = [];
  const standing = sc.pendingOrder?.positions;
  const third = thirdPositionOf(sc.drafts + 1);
  const rainbow = isRainbowSeat(player);
  const anyDeck = eligible.filter((id) => {
    const home = orderDef(id).decks;
    return home.length === 1 && player.decks.includes(home[0]!);
  });
  const positions: (HandPosition | 'anyDeck')[] = standing
    ? [...standing]
    : rainbow
      ? ['anyDeck', 'anyDeck', third.turn === 'generic' ? { kind: 'generic' } : third.turn === 'cross' ? { kind: 'cross' } : 'anyDeck']
      : drawHandPositions(state, player, sc.drafts + 1);
  for (const position of positions.slice(0, size)) {
    const bag = position === 'anyDeck' ? anyDeck : positionBag(eligible, position, player.decks);
    bags.push(bag.length > 0 ? bag : eligible);
  }
  for (let extra = bags.length; extra < size; extra++) bags.push(eligible);
  return bags;
}

/**
 * Deals one draft: `offerSize` cards from the seat's eligible bag, into the
 * positions the seat's decks and the draft count decide, rarity-first under
 * the pity this empire's passes have banked.
 *
 * One draw and no second one. There *was* a second — an owned card rolled as
 * the upgrade target, the other half of Entry XV's "widen or deepen" — and it
 * went with the ladder on 2026-09-04. What the draft asks now is take one or
 * pass, and the pass is a command rather than a card (`OrderOffer`).
 *
 * **The pity is read here, once, at the moment the hand is dealt**, which is
 * the same rule the hand's *size* obeys (`offerSize`): an offer is drawn once
 * and everything about it is decided then. An empire that skips after the cards
 * are on the table has bought itself a better *next* hand, never a better one
 * in front of it.
 *
 * **A redraw keeps the hand's positions** (rule 6). When a hand is already on
 * the table — which is the reroll's case and only the reroll's, since
 * `settleDraft` never deals over an unanswered draft — the ask is read off it
 * rather than rolled again, so a rainbow seat's redraw is dealt into the two
 * decks it was dealt into, and the cadence does not move for a hand that was
 * merely asked twice. The count the cadence reads is `sc.drafts`, which
 * `settleDraft` has already raised to this draft's number.
 *
 * **How many cards is asked of `offerSize`** — which is why this takes the whole
 * player rather than its `PlayerStatecraft`: a rider may sit on a wonder
 * standing in one of its cities, and the empire is what knows that.
 */
export function drawOrderOffer(state: GameState, player: Player): OrderOffer {
  const sc = player.statecraft;
  const positions = sc.pendingOrder?.positions ?? drawHandPositions(state, player, sc.drafts);
  const options = drawOrderOptions(
    state,
    eligibleFor(state, player),
    positions,
    offerSize(state, player.id, 'order'),
    sc.orderSkips,
    player.decks,
  );
  return { options, positions };
}

/**
 * **Is this empire owed a draft it cannot be dealt?** The meter is full and the
 * eligible bag is empty — the exhausted-pool rule (the design doc's rule 7:
 * *"explain that it is exhausted and stop charging for empty normal drafts"*).
 * `settleDraft` reads it to charge nothing; the statecraft screen reads it to
 * say so. Derived, never stored: the culture stays in the pool and the day a
 * band opens or a card is added the draft simply happens.
 */
export function draftExhausted(state: GameState, player: Player): boolean {
  if (player.barbarian) return false;
  const sc = player.statecraft;
  if (sc.pendingOrder !== undefined || sc.pendingDoctrine !== undefined) return false;
  if (planDraft(player) === null) return false;
  return eligibleFor(state, player).length === 0;
}

/**
 * Deals one Doctrine draft from a tier's pool, **without replacement within a
 * game** — a Doctrine already held is not offered again (Entry XV.b).
 *
 * `offerSize`'s second caller, and it takes the player for `drawOrderOffer`'s
 * reason: how wide a triple is dealt is a fact about the empire, not about its
 * collection. A pool shorter than the size deals the pool — a late tier whose
 * Doctrines are all held is a smaller hand, never a blocked adoption.
 */
export function drawDoctrineOffer(
  state: GameState,
  player: Player,
  tier: number,
): DoctrineOffer {
  const held = new Set<DoctrineId>(player.statecraft.doctrines);
  const pool = poolDoctrines(tier).filter((id) => !held.has(id));
  return { options: drawWithoutReplacement(state, pool, offerSize(state, player.id, 'doctrine')) };
}

// --- the ladder -------------------------------------------------------------

/**
 * What spending this empire's culture pool would do. `planProduction`'s sibling
 * a fourth bucket over (Entry XVIII.1's three shapes: plan · settle · windfall
 * wrapper), and the pure half of "would this empire draft".
 *
 * `culture` defaults to the real pool; a caller weighing a grant that has not
 * landed yet — forgotten hymns in a ruin, The Lyceum's fifteen — passes what the
 * pool *would* hold, which is what lets a choice card promise a draft before it
 * is taken.
 *
 * `null` when the pool does not cover the threshold.
 */
export interface DraftPlan {
  /** Culture the pool gives up: the threshold exactly. */
  cost: number;
  /** What the empire's tier becomes. */
  tier: number;
  /** Culture left over, which stays in the pool toward the draft after this. */
  overflow: number;
  /** True when this draft is one the ladder offers a government at. */
  offersGovernment: boolean;
}

export function planDraft(player: Player, culture = player.culturePool): DraftPlan | null {
  const cost = nextDraftCost(player);
  if (culture < cost) return null;
  const tier = player.statecraft.drafts + 1;
  return {
    cost,
    tier,
    overflow: culture - cost,
    offersGovernment: GOVERNMENT_TIERS.includes(tier),
  };
}

/** What a draft did, for the line the interface announces it in. */
export interface DraftCompletion {
  /** The tier the empire reached. */
  tier: number;
  /** The offer it opened. */
  offer: OrderOffer;
  /** The government triple this tier banked, or `null`. */
  government: GovernmentOffer | null;
}

/**
 * Spends one fill of the meter: the tier climbs, the pool keeps the overflow,
 * and an offer is dealt from `state.rng`.
 *
 * **The one completion routine for the culture bucket** (Entry XVIII.1), used by
 * both the end-of-turn phase and the windfall wrapper below — extracted, never
 * duplicated, so the two paths cannot drift on what a draft costs, what it deals
 * or what it banks.
 *
 * A draft is *not* taken while one is already outstanding. That is the same rule
 * `discoveryClaimError` states for ruins and it is here for the same reason: an
 * offer is a decision the player owes the game, and a second one dealt on top of
 * it would silently destroy the first. The culture stays in the pool and the
 * draft happens the moment the outstanding one is answered — which the phase
 * does, on the next resolution, with no state of its own to remember it by.
 *
 * A **government** offer is banked at tiers 4/10/18 and does not block anything:
 * Entry XV makes adoption bankable on purpose, so an empire may climb two tiers
 * holding an unclaimed triple and take it when its slots are worth swapping.
 */
export function settleDraft(state: GameState, player: Player): DraftCompletion | null {
  const sc = player.statecraft;
  if (sc.pendingOrder !== undefined || sc.pendingDoctrine !== undefined) return null;
  const plan = planDraft(player);
  if (!plan) return null;
  // **An exhausted pool charges nothing** (the decks rework, D1a; the design
  // doc's rule 7). Asked before a byte moves: the culture stays banked, the
  // count stays where it is — a draft that dealt nothing was not a regular
  // draft, so it advances neither the cadence nor the ladder — and the screen
  // says why through `draftExhausted`. Nothing is written, so a seat whose
  // decks have run dry serialises exactly as it did the turn before.
  if (eligibleFor(state, player).length === 0) return null;

  player.culturePool = plan.overflow;
  // The banks are a line of the meters too — see `collectYields` (batch M3).
  bumpEconomy(state);
  sc.drafts = plan.tier;
  const offer = drawOrderOffer(state, player);
  sc.pendingOrder = offer;
  // **A reward hand is banked at the ladder's rungs** (the design doc's
  // "Doctrine reward hands": 4, 18 and 29) — a count, never a hand, and never a
  // blocker. See `PlayerStatecraft.rewardHands` for why the deal waits for the
  // open.
  if (REWARD_DRAFTS.includes(plan.tier)) sc.rewardHands.push(plan.tier);

  let government: GovernmentOffer | null = null;
  if (plan.offersGovernment) {
    const options = governmentsAtTier(plan.tier);
    if (options.length > 0) {
      government = { tier: plan.tier, options };
      sc.pendingGovernment = government;
    }
  }
  return { tier: plan.tier, offer, government };
}

/**
 * The mid-turn entry point: culture landed outside a phase, so settle it now.
 *
 * The fourth `settle…Windfall`, and the one `discoveries.ts` has been carrying a
 * stated absence for since Entry XX ("a `settleCultureWindfall` written today
 * would be a completion routine with nothing to complete"). There is something
 * to complete now. It is `settleDraft` plus nothing: a draft mutates no city's
 * derived state, so unlike the growth and production windfalls it owes the
 * mid-turn register no refresh — the empire owes the player a *decision*, and
 * the End Turn blocker is what collects it.
 *
 * It loops, because one lump of culture can cross two thresholds and a windfall
 * that paid only the first would leave the empire owed a draft it had earned.
 * The loop terminates on the first iteration in practice — `settleDraft` refuses
 * while an offer is outstanding, and it has just made one.
 */
export function settleCultureWindfall(state: GameState, player: Player): DraftCompletion | null {
  let first: DraftCompletion | null = null;
  for (;;) {
    const done = settleDraft(state, player);
    if (!done) return first;
    if (first === null) first = done;
  }
}

/** What a lump of culture would complete, in words, or `null`. The card's preview. */
export function draftSettledBy(player: Player, grant: number): string | null {
  const plan = planDraft(player, player.culturePool + grant);
  return plan === null ? null : `tier ${plan.tier}`;
}

/**
 * The Statecraft phase: every empire banks what it earned and drafts what it can
 * afford.
 *
 * Its position in `END_OF_TURN_PHASES` is a rules decision like every other
 * entry: directly after `advanceResearch`, because the two are the same shape —
 * an empire spending a pool `collectYields` filled at the top of the resolution
 * — and because a draft must be dealt from a board that has already grown, built
 * and learnt this turn. It is before `expandBorders` and that is harmless by
 * construction: border culture is a **separate channel** (`City.culture`) that
 * this phase never touches, which is the whole of "do not double-spend".
 *
 * The wild is skipped, exactly as `advanceResearch` skips it: it has no screen
 * to be asked on, so an offer left on that seat would hang forever behind a
 * blocker nobody can answer.
 *
 * There are no seals to tick — a seal is an absolute turn, compared rather than
 * maintained (see `SlottedOrder`).
 */
export function runStatecraft(state: GameState): void {
  for (const player of state.players) {
    if (player.barbarian) continue;
    settleDraft(state, player);
  }
}

// --- picking a card, or passing on the hand ---------------------------------

/**
 * Why this player cannot take this option, or `null` when they can.
 *
 * **The** gate: the `chooseOrder` command refuses with this sentence and the
 * offer card is built from exactly the offer it answers `null` about, so a card
 * a player can click is a command the reducer takes. `discoveryChoiceError`'s
 * shape, and it asks nothing about the turn — that is a question about the actor
 * and belongs to the command.
 */
export function orderChoiceError(
  state: GameState,
  playerId: number,
  optionIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const offer = player.statecraft.pendingOrder;
  if (!offer) return `${player.name} has no Statecraft draft awaiting a pick`;
  if (!Number.isInteger(optionIndex)) {
    return `chooseOrder needs an integer optionIndex, got ${String(optionIndex)}`;
  }
  const index = optionIndex as number;
  const size = offer.options.length;
  if (index < 0 || index >= size) return `Option ${index} is not one of the ${size} offered`;
  const id = offer.options[index];
  // Only reachable from a hand-edited save or a data file retuned under a live
  // game; an offer naming a row this build does not have is unanswerable.
  if (!isOrderId(id)) return `Option ${index} names no known Order`;
  return null;
}

/**
 * Why this player cannot pass on their draft, or `null` when they can.
 *
 * `orderChoiceError`'s twin, refusal for refusal, and one refusal shorter
 * because a pass names nothing: there is no index to be out of range and no row
 * to be unknown. The only question is whether there is a hand on the table.
 *
 * It asks nothing about the turn for `orderChoiceError`'s reason — that is a
 * question about the actor and belongs to the command.
 */
export function orderSkipError(state: GameState, playerId: number): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  if (!player.statecraft.pendingOrder) {
    return `${player.name} has no Statecraft draft to pass on`;
  }
  return null;
}

/** What a pick did, for the announcement. */
export interface OrderChoice {
  id: OrderId;
  name: string;
  /** True when the card was a charter and its grant has just been written. */
  chartered: boolean;
}

/**
 * Takes one option and clears the offer. Validates nothing — the rule is
 * `orderChoiceError`'s and the command asks it first. `settleDiscovery`'s shape
 * exactly, and the mechanism rather than the rule.
 *
 * The offer is cleared **before** the card is added, for `settleDiscovery`'s
 * reason: anything reading `pendingOrder` during the addition would see a
 * decision that has in fact already been made. The key is *deleted* rather than
 * set to `undefined`, so a player who has answered a draft serialises identically
 * to one who has never had one.
 *
 * A new card lands in the **collection**, never in a slot. Slotting is its own
 * command because it is its own decision and it costs a seal — which is the
 * whole of Entry XV's swap friction, and would be given away by a draft that
 * auto-slotted.
 *
 * **Taking a card zeroes the pity** (the ruling of 2026-09-04). `orderSkips`
 * counts *consecutive* passes and this is the thing that breaks the run: an
 * empire that passes twice and then drafts is back at the table's own weights,
 * not carrying two skips into every hand it ever sees again.
 *
 * A card the empire already holds cannot be dealt (`livePool` filters what is
 * held out of the bag), so there is no second-copy case to answer — which is
 * the levelling ruling read from this end: a draft can only ever widen.
 */
export function settleOrderChoice(player: Player, optionIndex: number): OrderChoice | null {
  const sc = player.statecraft;
  const offer = sc.pendingOrder;
  if (!offer) return null;
  const id = offer.options[optionIndex];
  if (id === undefined || !isOrderId(id)) return null;

  delete sc.pendingOrder;
  sc.orderSkips = 0;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  // **A charter acts on the pick** (the decks rework, D1a) — see `applyCharter`.
  const chartered = applyCharter(player, id);
  return { id, name: orderDef(id).name, chartered };
}

/**
 * **Applies a charter's grant to the seat, once** — the one writer of
 * `Player.charteredTechs`, `charteredBuildings` and `charteredRites`
 * (`CharterSpec` carries the whole argument for why a charter is a grant on
 * the pick and never a chair).
 *
 * Called by the two verbs that take a card into the collection
 * (`settleOrderChoice`, `settleRewardChoice`) and by nothing else, so a third
 * way to draft a card would call this or not grant at all. A row that is no
 * charter writes nothing and answers `false`. Every list is grown by presence
 * — an id already there is left there — so a grant is idempotent and a save
 * that replays it lands on the same bytes.
 */
export function applyCharter(player: Player, id: OrderId): boolean {
  const charter = orderDef(id).charter;
  if (charter === undefined) return false;
  const { tech, building, rites } = charter.unlocks;
  if (tech !== undefined && !player.charteredTechs.includes(tech)) player.charteredTechs.push(tech);
  if (building !== undefined && !player.charteredBuildings.includes(building)) {
    player.charteredBuildings.push(building);
  }
  for (const rite of rites ?? []) {
    if (!player.charteredRites.includes(rite)) player.charteredRites.push(rite);
  }
  return true;
}

/** What a pass did, for the announcement. */
export interface OrderSkip {
  /** Consecutive drafts passed, this one included. The pity the next hand reads. */
  skips: number;
}

/**
 * Passes on the whole hand and raises the pity. `settleOrderChoice`'s twin, and
 * the other half of the 2026-09-04 ruling.
 *
 * **The hand is gone, not re-dealt.** An offer is drawn once and spent by a
 * command (CLAUDE.md), and a pass *is* the spend: the same three cards are
 * never on the table again, and the culture the meter spent to deal them stays
 * spent. That is what makes it a choice rather than a reroll — a reroll is
 * something a player pays for, and nobody has priced one.
 *
 * The pity is an **absolute count**, raised here and zeroed by a pick. Nothing
 * ticks it and nothing ages it, so a seat that passes on turn ten and drafts on
 * turn ninety draws that ninetieth hand with one skip's worth of pity, which is
 * the honest reading of "consecutive".
 *
 * It takes the **state** for one reason: The Last Laurels pays a glass bead for
 * a hand turned down, and the pass has exactly one mechanism, so the occasion is
 * announced here rather than in the reducer — the ten Triumph seams' rule, and
 * what makes a bot that passes earn the bead a player would.
 */
export function settleOrderSkip(state: GameState, player: Player): OrderSkip | null {
  const sc = player.statecraft;
  if (!sc.pendingOrder) return null;
  delete sc.pendingOrder;
  sc.orderSkips += 1;
  awardOrderBeads(state, player.id, 'draftPassed');
  return { skips: sc.orderSkips };
}

// --- the reward hand ----------------------------------------------------------

/**
 * **The reward hand** (`docs/six-decks-first-cut.md` "Doctrine reward hands";
 * the decks rework, D1a): at regular draft counts 4, 18 and 29 an empire is
 * owed *"three distinct unowned rare cards from the same currently unlocked,
 * leader-eligible catalogue"* — a bonus draw of rares, and what the Doctrine
 * draft became. The Doctrine rows are retired; the rare-only hand is dealt
 * from the Orders, and a rare taken here is an Order in the collection like
 * any other (a charter grants; an ordinary rare waits for a chair).
 *
 * Three verbs, and the shape follows the draft's with one deliberate
 * difference: the reward is **banked as a count and dealt on the open**.
 *
 *   · `openRewardHand` spends one banked count and deals the hand from the
 *     shelf *as it stands then* — three positions, the seat's two decks and
 *     then the union (rainbow: two decks sampled distinct), rares only, every
 *     position falling back to the union of eligible rares, extras by
 *     `explainOfferSize` after the base three. An empty shelf resolves the
 *     reward as **exhausted at no cost**: the count is spent, nothing is
 *     dealt, and the open reports it.
 *   · `chooseReward` takes one into the collection and applies a charter.
 *   · `passReward` forfeits the hand for nothing — no pity, no refund; there
 *     was no price.
 *
 * None of the three blocks End Turn (`statecraftBlocker` leaves them out), and
 * a hand opened and not answered stays on the table. A rare taken in a normal
 * draft between the banking and the open is simply not dealt (the bag is
 * "what is eligible and unowned" at the open) — the doc's *"vice versa"*
 * clause, kept by construction rather than by a second list.
 */

/** Why this player cannot open a reward hand, or `null` when they can. */
export function rewardOpenError(state: GameState, playerId: number): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const sc = player.statecraft;
  if (sc.rewardHands.length === 0) return `${player.name} has no reward hand banked`;
  if (sc.pendingReward !== undefined) return `${player.name} already has a reward hand on the table`;
  return null;
}

/**
 * **The rares this seat may be dealt in a reward hand**: the eligible bag
 * (bands gated, held excluded) narrowed to the rare rung. The same one bag the
 * normal draft deals from, which is what makes *"the same rare can appear in
 * normal drafts and cannot be owned twice"* true without a second register.
 */
export function eligibleRaresFor(state: GameState, player: Player): OrderId[] {
  return eligibleFor(state, player).filter((id) => orderDef(id).rarity === 'rare');
}

/**
 * **The three positions of a reward hand**: the seat's two decks, then the
 * union — *"prefer a single-type rare from each leader deck, then another
 * eligible rare, including cross-types"*. A rainbow seat samples two distinct
 * decks (two rolls), exactly as its normal hand does; the third position is
 * `cross` here as a name for "anything eligible", and `positionBag` on a rare
 * bag falls back to the union in the draw whenever the ask is not met.
 */
export function drawRewardPositions(state: GameState, player: Player): HandPosition[] {
  const decks = player.decks;
  let first: DeckId | undefined;
  let second: DeckId | undefined;
  if (isRainbowSeat(player)) {
    [first] = drawWithoutReplacement(state, decks, 1);
    [second] = drawWithoutReplacement(state, decks.filter((deck) => deck !== first), 1);
  } else {
    first = decks[0];
    second = decks[1] ?? decks[0];
  }
  const positions: HandPosition[] = [];
  if (first !== undefined) positions.push({ kind: 'deck', deck: first });
  if (second !== undefined) positions.push({ kind: 'deck', deck: second });
  positions.push({ kind: 'cross' });
  return positions;
}

/** What opening a reward did, for the announcement. */
export interface RewardOpening {
  /** The draft count the reward was banked at. */
  drafts: number;
  /** The hand dealt, or `null` when the shelf held no rare — exhausted, at no cost. */
  offer: RewardOffer | null;
}

/**
 * Spends one banked reward and deals its hand. Validates nothing — the rule is
 * `rewardOpenError`'s. The oldest banked count is the one opened, because the
 * list is in banking order and a reward is a reward whichever rung it came
 * from. The rares are dealt with **no pity**: a pass on a reward buys nothing
 * (`settleRewardPass`), so there is no count to read.
 */
export function openRewardHandAt(state: GameState, player: Player): RewardOpening | null {
  const sc = player.statecraft;
  if (sc.rewardHands.length === 0 || sc.pendingReward !== undefined) return null;
  const drafts = sc.rewardHands.shift()!;
  const rares = eligibleRaresFor(state, player);
  if (rares.length === 0) return { drafts, offer: null };
  const positions = drawRewardPositions(state, player);
  const options = drawOrderOptions(
    state,
    rares,
    positions,
    // The base three, and whatever a rider adds to an Order draft — *"extra-
    // offer effects … apply to these hands too"*.
    Math.max(HAND_POSITIONS, offerSize(state, player.id, 'order')),
    0,
    player.decks,
  );
  if (options.length === 0) return { drafts, offer: null };
  const offer: RewardOffer = { drafts, options, positions };
  sc.pendingReward = offer;
  return { drafts, offer };
}

/** Why this player cannot take this reward option, or `null`. `orderChoiceError`'s twin. */
export function rewardChoiceError(
  state: GameState,
  playerId: number,
  optionIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const offer = player.statecraft.pendingReward;
  if (!offer) return `${player.name} has no reward hand on the table`;
  if (!Number.isInteger(optionIndex)) {
    return `chooseReward needs an integer optionIndex, got ${String(optionIndex)}`;
  }
  const index = optionIndex as number;
  const size = offer.options.length;
  if (index < 0 || index >= size) return `Option ${index} is not one of the ${size} offered`;
  const id = offer.options[index];
  if (!isOrderId(id)) return `Option ${index} names no known Order`;
  // Reachable only across turns: a hand left open while a normal draft took
  // the same rare. The card is the seat's already; the answer is to pass.
  if (player.statecraft.orders.includes(id)) {
    return `${player.name} already holds ${orderDef(id).name}`;
  }
  return null;
}

/** Takes one rare from the reward hand. `settleOrderChoice`'s shape; no pity to zero. */
export function settleRewardChoice(player: Player, optionIndex: number): OrderChoice | null {
  const sc = player.statecraft;
  const offer = sc.pendingReward;
  if (!offer) return null;
  const id = offer.options[optionIndex];
  if (id === undefined || !isOrderId(id)) return null;
  delete sc.pendingReward;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  const chartered = applyCharter(player, id);
  return { id, name: orderDef(id).name, chartered };
}

/** Why this player cannot pass on their reward hand, or `null`. */
export function rewardPassError(state: GameState, playerId: number): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  if (!player.statecraft.pendingReward) return `${player.name} has no reward hand to pass on`;
  return null;
}

/**
 * Forfeits the reward hand. **For nothing**: no pity, because no pity was
 * read to deal it, and no bead — a reward was a gift, and passing a gift is
 * not the pass the Last Laurels pays for.
 */
export function settleRewardPass(player: Player): boolean {
  const sc = player.statecraft;
  if (!sc.pendingReward) return false;
  delete sc.pendingReward;
  return true;
}

// --- the slots --------------------------------------------------------------

/**
 * Why this card cannot go in this slot, or `null` when it can.
 *
 * Five refusals, and each is a rule rather than a guard: the player must hold
 * the card, the slot must exist, the card must not already be slotted, the slot
 * must be free, and the **type must match** — a wildcard slot takes anything and
 * a typed slot takes only its own (`orderFitsSlot`).
 *
 * There is deliberately no "swap" that empties an occupied slot: an occupied
 * slot is a sealed slot most of the time, and a verb that silently broke a seal
 * would be the one thing entry-locking exists to prevent. Unslot, then slot.
 */
export function slotOrderError(
  state: GameState,
  playerId: number,
  cardId: unknown,
  slotIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const sc = player.statecraft;
  if (!isOrderId(cardId)) return `"${String(cardId)}" is not a known Order`;
  if (!holdsOrder(sc, cardId)) return `${player.name} does not hold ${orderDef(cardId).name}`;
  // **A charter is never seated** (D1a, `CharterSpec`): its grant was written
  // on the pick, and a chair spent on it would be a chair spent on nothing.
  if (isCharter(cardId)) return `${orderDef(cardId).name} is a charter and never sits in a chair`;
  if (!Number.isInteger(slotIndex)) {
    return `slotOrder needs an integer slotIndex, got ${String(slotIndex)}`;
  }
  const index = slotIndex as number;
  const layout = slotTypesOf(sc);
  if (index < 0 || index >= layout.length) {
    return `${governmentDef(sc.government).name} has ${layout.length} slot(s), not ${index + 1}`;
  }
  if (isSlotted(sc, cardId)) return `${orderDef(cardId).name} is already slotted`;
  const held = sc.slots[index];
  if (held) return `Slot ${index + 1} already holds ${orderDef(held.card).name}`;
  // **The chair a malice sits in is not empty**, whatever the slots array says
  // (batch G3). It is asked here rather than left to the `held` line above
  // because a malice is not a `SlottedOrder` — it holds the chair from
  // `Player.malices` — and a refusal that said "slot 3 is empty" would be the
  // reducer contradicting the screen.
  const malice = maliceAt(player, index);
  if (malice !== null) return maliceChairRefusal(index, malice);
  const type = layout[index]!;
  if (!orderFitsSlot(cardId, type)) {
    return `${orderDef(cardId).name} is ${SLOT_WORDS[orderSlot(cardId)]} and slot ${
      index + 1
    } is ${SLOT_WORDS[type]}`;
  }
  return null;
}

/** How a slot type reads in a refusal and on the screen. One table, one voice. */
export const SLOT_WORDS: Record<SlotType, string> = {
  military: 'military',
  economic: 'economic',
  wildcard: 'wildcard',
};

/**
 * Puts a card in a slot and **seals it**. Validates nothing — the rule is
 * `slotOrderError`'s.
 *
 * The seal is an *entry* lock (Entry XV): it starts the moment the card goes in,
 * so a posture change is anticipated rather than reactive — which is what
 * simultaneous turns need, since a swap made in response to what somebody else
 * did this window would be a decision taken after seeing their move. Length is
 * `sealTurnsFor`, which is the empire's, so The Loose Rein is felt at the moment
 * it matters.
 */
export function slotOrderAt(
  state: GameState,
  player: Player,
  cardId: OrderId,
  slotIndex: number,
): SlotOutcome {
  const slot: SlottedOrder = {
    card: cardId,
    sealedUntil: state.turn + sealTurnsFor(state, player.id),
  };
  player.statecraft.slots[slotIndex] = slot;
  // **A slotted Order is the third source of `liveEffects`** (batch M3,
  // `slate.ts`), and the meters fold that walk — so the empire's contentment and
  // its writ are not what they were on the line above. The law's own memo is
  // dropped by the reducer beside this call (`forgetTheLaw`); this is the same
  // sentence said to the slate.
  bumpEconomy(state);
  // **The once-per-game grant, claimed here and settled by the caller.** Here,
  // because this is the one place a card goes into a slot and a flag written
  // anywhere else is a flag some future slotting path forgets; settled by the
  // caller, because "gain a great person" is a renown windfall and `renown.ts`
  // reads *this* module — the arrow only points one way, so the reducer above
  // both is what turns the claim into an offer.
  const granted: OrderSlotGrant[] = [];
  const onSlot = orderDef(cardId).onSlot ?? [];
  if (onSlot.length > 0 && !player.statecraft.grantedOnSlot.includes(cardId)) {
    player.statecraft.grantedOnSlot.push(cardId);
    granted.push(...onSlot);
  }
  return { slot, granted };
}

/**
 * What slotting a card did: the sealed slot, and whatever it handed over once.
 *
 * A shape rather than a second out-parameter, `RealisedItem`'s argument at a
 * smaller scale — two kinds of news exist and a third joins the shape.
 */
export interface SlotOutcome {
  slot: SlottedOrder;
  /** The `onSlot` grants that fired *this time*. Empty on every later slotting. */
  granted: OrderSlotGrant[];
}

/** Turns left on a slot's seal, or 0 when it is free to move. */
export function sealRemaining(state: GameState, slot: SlottedOrder | null): number {
  if (!slot) return 0;
  return Math.max(0, slot.sealedUntil - state.turn);
}

/**
 * Why this slot cannot be emptied, or `null` when it can.
 *
 * Unslotting after the seal expires is **free** (Entry XV) — there is no cost,
 * no cooldown and no second seal on the way out, because the friction the design
 * wants is on *committing*, not on retreating.
 */
export function unslotOrderError(
  state: GameState,
  playerId: number,
  slotIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const sc = player.statecraft;
  if (!Number.isInteger(slotIndex)) {
    return `unslotOrder needs an integer slotIndex, got ${String(slotIndex)}`;
  }
  const index = slotIndex as number;
  if (index < 0 || index >= sc.slots.length) {
    return `${governmentDef(sc.government).name} has ${sc.slots.length} slot(s), not ${index + 1}`;
  }
  // **A malice is never taken out** (§4) — the whole of the punishment is that
  // it holds the chair. Asked before the emptiness check for `slotOrderError`'s
  // reason: the slots array says the chair is empty and it is not.
  const malice = maliceAt(player, index);
  if (malice !== null) return maliceChairRefusal(index, malice);
  const slot = sc.slots[index];
  if (!slot) return `Slot ${index + 1} is empty`;
  const left = sealRemaining(state, slot);
  if (left > 0) {
    return `${orderDef(slot.card).name} is sealed for ${left} more turn${left === 1 ? '' : 's'}`;
  }
  return null;
}

/** Empties a slot. The card stays in the collection — it is never lost. */
export function unslotOrderAt(player: Player, slotIndex: number): OrderId | null {
  const slot = player.statecraft.slots[slotIndex];
  if (!slot) return null;
  player.statecraft.slots[slotIndex] = null;
  return slot.card;
}

// --- the malice's chair -----------------------------------------------------

/**
 * **The seating rule** (`docs/wager.md` §4, batch G3), and it lives here rather
 * than in `wagers.ts` for one reason: it is a rule about *chairs*, and the chairs
 * are this file's. The wager decides who is punished; this decides where the
 * punishment sits.
 *
 * A malice is an Order with a bad face — it holds a chair, it pays its effect
 * through `liveEffects` like the Order beside it, and it cannot be moved. What
 * differs is every verb: nobody drafts one, nobody slots one, nobody takes one
 * out. So the state it lives in is `Player.malices` rather than
 * `PlayerStatecraft.slots`, and the chair it occupies is an index recorded on
 * the held row (`HeldMalice.chair`). Two readings follow from that and they are
 * the whole interface: `maliceAt` says which chair is taken, and the two slot
 * evaluators refuse it in one sentence.
 *
 * Why not a `SlottedOrder` with a malice id in it? Because `SlottedOrder.card`
 * is an `OrderId` in a dozen readings — the bot's appraisal, the position cards,
 * the staging layer, the screen's collection — and every one of them would have
 * had to learn that a chair might hold something that is not an Order. A chair
 * that is *taken* by something outside the array is one new question asked in
 * three places, which is the smaller change and the honest one.
 */

/** The malice sitting in this chair, or `null`. The one occupancy reading. */
export function maliceAt(player: Player, slotIndex: number): MaliceId | null {
  for (const held of player.malices) {
    if (held.chair !== slotIndex) continue;
    if (!isMaliceId(held.id)) continue;
    return held.id;
  }
  return null;
}

/** Every malice this realm carries, in seating order, ids only. */
export function malicesHeld(player: Player): MaliceId[] {
  return player.malices.map((held) => held.id).filter(isMaliceId);
}

/** The refusal both slot verbs answer with. One sentence, one voice. */
export function maliceChairRefusal(slotIndex: number, malice: MaliceId): string {
  return `${maliceDef(malice).name} holds slot ${slotIndex + 1} and cannot be moved`;
}

/**
 * **Which chair a malice of this flavour takes** — the last one of its own
 * flavour, else the last wildcard, else nothing (§4).
 *
 * *Last* rather than first, and that is the rule the worksheet states: a player
 * arranges the chairs top-down and the position cards read the first of a
 * flavour, so taking the last does the least damage to an arrangement somebody
 * built on purpose. It still displaces whatever Order is sitting there — the
 * chair is what the punishment costs.
 *
 * A chair another malice already holds is not free: two malices are two chairs.
 * `null` is the ninth chair nobody has — see `HeldMalice.chair`.
 */
export function maliceChairFor(player: Player, chair: SlotType): number | null {
  const layout = slotTypesOf(player.statecraft);
  for (let index = layout.length - 1; index >= 0; index--) {
    if (layout[index] !== chair) continue;
    if (maliceAt(player, index) !== null) continue;
    return index;
  }
  // No chair of that flavour, or every one of them already carries a malice: a
  // wildcard takes anything, which is the same clause that makes a wildcard
  // chair worth what it is worth to an Order.
  for (let index = layout.length - 1; index >= 0; index--) {
    if (layout[index] !== 'wildcard') continue;
    if (maliceAt(player, index) !== null) continue;
    return index;
  }
  return null;
}

/** What seating one did, for the announcement and the screens it re-opens. */
export interface MaliceSeating {
  id: MaliceId;
  /** The chair it took, or `null` for the ninth chair nobody has. */
  chair: number | null;
  /** The Order it turned out into the hand, or `null`. Its seal is broken. */
  displaced: OrderId | null;
  /** The older malice this one replaced at the stacking cap, or `null`. */
  replaced: MaliceId | null;
}

/**
 * Seats one malice, displacing whatever sits in the chair it takes. Validates
 * nothing — the *whether* is the judgement's.
 *
 * The displaced Order goes back to the collection unsealed and **nothing is
 * refunded**, which is the ruling word for word: nothing was spent to slot it,
 * so there is nothing to give back. The seal is simply gone, which means the
 * player may put the card somewhere else this turn — the only mercy in the rule
 * and a deliberate one, since a spread wrecked by a card that cannot move is a
 * spread the player cannot answer.
 */
function seatMalice(state: GameState, player: Player, id: MaliceId, untilAge: number): MaliceSeating {
  const chair = maliceChairFor(player, maliceDef(id).chair);
  let displaced: OrderId | null = null;
  if (chair !== null) {
    const sitting = player.statecraft.slots[chair];
    if (sitting) {
      displaced = sitting.card;
      player.statecraft.slots[chair] = null;
    }
  }
  const held: HeldMalice = { id, untilAge };
  if (chair !== null) held.chair = chair;
  player.malices.push(held);
  // The eleventh source of `liveEffects` just changed, and so did the chairs the
  // third source is read out of — the same sentence `slotOrderAt` says to the
  // slate, said for a card nobody chose.
  bumpEconomy(state);
  return { id, chair, displaced, replaced: null };
}

/**
 * **Deals this realm one malice and seats it** — the judgement's whole payment
 * (§4, called from `seatPendingMalices` in `wagers.ts`).
 *
 * Four rules in one call, in the order they are:
 *
 *   1. **the draw**, from `state.rng` over the deck minus everything this seat
 *      already carries — *"a seat never holds two copies of the same malice"*.
 *      Asked before the eviction below, deliberately: a card just worked off is
 *      not a card the same judgement may deal straight back;
 *   2. **the cap** (`rules.stack`, two): a third failure **replaces the oldest**
 *      rather than adding, so the punishment has a ceiling a player can see and
 *      the comeback is never arithmetically out of reach;
 *   3. **the renewal**: whatever survives is re-stamped to the age this new one
 *      names, because a seat that missed again has not worked anything off;
 *   4. **the seating**, `seatMalice` above.
 *
 * `null` only when the deck is exhausted — twelve rows against a cap of two, so
 * unreachable while the table has more rows than the cap, and an honest answer
 * rather than a throw if a designer ever cuts it to one.
 */
export function takeMalice(state: GameState, player: Player, untilAge: number): MaliceSeating | null {
  const candidates = MALICE_IDS.filter((id) => !player.malices.some((held) => held.id === id));
  const [drawn] = drawWithoutReplacement(state, candidates, 1);
  if (drawn === undefined) return null;

  let replaced: MaliceId | null = null;
  const cap = Math.max(1, Math.floor(MALICE_RULES.stack));
  while (player.malices.length >= cap) {
    const oldest = player.malices.shift();
    if (oldest !== undefined && isMaliceId(oldest.id)) replaced = oldest.id;
  }
  for (const held of player.malices) held.untilAge = untilAge;

  return { ...seatMalice(state, player, drawn, untilAge), replaced };
}

/**
 * **Sheds every malice whose term is up** — the other half of §4's clause, and
 * the reason the term is a stamp rather than a counter.
 *
 * Called at a judgement for a seat that **kept** what it staked: every malice
 * naming this age or an earlier one leaves the chair. A seat that missed keeps
 * its own through `takeMalice`'s renewal instead, so the two paths never both
 * touch one row.
 */
export function shedMalices(state: GameState, player: Player, age: number): MaliceId[] {
  const gone: MaliceId[] = [];
  player.malices = player.malices.filter((held) => {
    if (held.untilAge > age) return true;
    if (isMaliceId(held.id)) gone.push(held.id);
    return false;
  });
  if (gone.length > 0) bumpEconomy(state);
  return gone;
}

/**
 * **A malice survives an adoption and re-seats itself** (§4, ruled).
 *
 * The amnesty is total for *Orders* — a new spread with the old cards pinned in
 * it would be a spread the player cannot use — and it is deliberately not for
 * this: the debt is owed to the next wager, not to the government that owed it,
 * and a realm that could shed a malice by adopting would have found the cheapest
 * comeback in the game.
 *
 * Every chair is forgotten first and then re-taken in seating order, because
 * `maliceChairFor` reads the chairs already taken and a stale index from the old
 * spread would either point at a chair that no longer exists or let two malices
 * claim one. Called by `adoptGovernmentAt` after the array is rebuilt, and by
 * nothing else.
 */
export function reseatMalices(player: Player): void {
  for (const held of player.malices) delete held.chair;
  for (const held of player.malices) {
    if (!isMaliceId(held.id)) continue;
    const chair = maliceChairFor(player, maliceDef(held.id).chair);
    if (chair !== null) held.chair = chair;
  }
}

// --- adoption ---------------------------------------------------------------

/**
 * Why this player cannot adopt this government, or `null` when they can.
 *
 * The offer is **banked**, so the only questions are whether one is banked at
 * all and whether the index names one of its three. There is no tier check
 * beyond that: an empire that climbed to tier 9 holding an unclaimed tier-7
 * triple may still take it, which is exactly what "bankable" means.
 */
export function governmentChoiceError(
  state: GameState,
  playerId: number,
  choiceIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const offer = player.statecraft.pendingGovernment;
  if (!offer) return `${player.name} has no government offer to claim`;
  if (!Number.isInteger(choiceIndex)) {
    return `adoptGovernment needs an integer choiceIndex, got ${String(choiceIndex)}`;
  }
  const index = choiceIndex as number;
  if (index < 0 || index >= offer.options.length) {
    return `Choice ${index} is not one of the ${offer.options.length} offered`;
  }
  if (!isGovernmentId(offer.options[index])) return `Choice ${index} names no known government`;
  return null;
}

/** What an adoption did, for the announcement and the screens it re-opens. */
export interface GovernmentAdoption {
  id: GovernmentId;
  name: string;
  /** Cards that came out of their slots. Every one of them, always. */
  amnestied: OrderId[];
  /** The Doctrine draft the adoption opened, or `null` when the pool is empty. */
  doctrines: DoctrineOffer | null;
}

/**
 * Adopts a government: **the chapter break** (Entry XV.b).
 *
 * Three things happen in one breath, and they are one decision rather than
 * three. The **slot spread** changes, so the array is rebuilt to the new
 * government's layout. Every slotted card **returns to the collection
 * unsealed** — the amnesty, which is Civ VI's free-swap window derived rather
 * than ruled: a new spread with the old cards still pinned in it would be a
 * spread the player cannot use. And a **Doctrine draft opens**, drawn here
 * rather than at the next resolution because it belongs to *this* moment and a
 * draw taken later would be a draw taken from a moved generator.
 *
 * The banked offer is spent (the key deleted), so a tier's triple is claimed
 * once. Entry XV settles the open question: a government pick cannot be
 * revisited within a tier.
 *
 * Validates nothing — the rule is `governmentChoiceError`'s.
 */
export function adoptGovernmentAt(
  state: GameState,
  player: Player,
  choiceIndex: number,
): GovernmentAdoption | null {
  const sc = player.statecraft;
  const offer = sc.pendingGovernment;
  if (!offer) return null;
  const id = offer.options[choiceIndex];
  if (id === undefined || !isGovernmentId(id)) return null;

  // Spent before anything else, for `settleDiscovery`'s reason: the draw below
  // advances `state.rng`, and anything reading the banked offer during the
  // adoption would see a decision that has already been made.
  delete sc.pendingGovernment;

  const amnestied: OrderId[] = [];
  for (const slot of sc.slots) {
    if (slot) amnestied.push(slot.card);
  }
  sc.government = id;
  // Rebuilt rather than resized: the new layout's slot 2 is not the old one's,
  // so carrying anything across by index would seal the wrong card in the wrong
  // kind of slot. The amnesty is total by construction.
  //
  // **To `chairCount` and not to `slotLayout`**, so a law that opens chairs of
  // its own (The King's Friends) opens them under every government this realm
  // ever adopts — which is the whole sentence that card makes. `chairCount`
  // reads the live law, which the memo below answers — so the announcement
  // comes **after** the rebuild, not before it: a bump in front of this line
  // would have the memo record the old slots as this government's first
  // reading, and a benched card would go on paying (found 2026-09-10, the
  // growing-orders pin).
  sc.slots = new Array<SlottedOrder | null>(chairCount(state, player.id, id)).fill(null);
  // **The reroll's ladder starts again** (B1 rule 3, `docs/flags.md` (aaaaaa)):
  // a fresh charter arrives with a cheap reroll. An event write here, in the
  // one place a government changes hands, and never a countdown — see the
  // field's own docblock for why a *pick* still does not reset it.
  sc.rerollsTaken = 0;
  // **The amnesty is for Orders and never for a malice** (§4): the debt is owed
  // to the next wager rather than to the government that owed it, so every one
  // this realm carries takes a chair in the new spread. See `reseatMalices`.
  reseatMalices(player);
  // A government is the first source of `liveEffects` and the amnesty above
  // emptied every slot — two writes the meters fold, announced together (batch
  // M3, `slate.ts`). **And the slate dropped** (`forgetTheLaw`'s register): the
  // chair count above read the law with the new government and the *old*
  // chairs, and a memo warmed mid-rebuild answered for a benched Order as if
  // it still sat — the growing-orders pin caught it, 2026-09-10.
  forgetTheLaw(state);
  bumpEconomy(state);

  // The Writ Extends. **Before** the Doctrine draw, so a triumph that fills the
  // renown ladder opens its great-person offer before this empire is handed a
  // second card to answer — and so the two draws spend `state.rng` in an order
  // a replay reproduces.
  awardOccasion(state, player.id, 'governmentAdopted');

  const doctrines = drawDoctrineOffer(state, player, offer.tier);
  let opened: DoctrineOffer | null = null;
  if (doctrines.options.length > 0) {
    sc.pendingDoctrine = doctrines;
    opened = doctrines;
  }
  return { id, name: governmentDef(id).name, amnestied, doctrines: opened };
}

/** Why this player cannot take this Doctrine, or `null`. `orderChoiceError`'s twin. */
export function doctrineChoiceError(
  state: GameState,
  playerId: number,
  optionIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const offer = player.statecraft.pendingDoctrine;
  if (!offer) return `${player.name} has no Doctrine draft awaiting a pick`;
  if (!Number.isInteger(optionIndex)) {
    return `chooseDoctrine needs an integer optionIndex, got ${String(optionIndex)}`;
  }
  const index = optionIndex as number;
  if (index < 0 || index >= offer.options.length) {
    return `Option ${index} is not one of the ${offer.options.length} offered`;
  }
  if (!isDoctrineId(offer.options[index])) return `Option ${index} names no known Doctrine`;
  return null;
}

/** Takes a Doctrine. Permanent and slotless — it joins a list and never leaves it. */
export function settleDoctrineChoice(
  player: Player,
  optionIndex: number,
): { id: DoctrineId; name: string } | null {
  const sc = player.statecraft;
  const offer = sc.pendingDoctrine;
  if (!offer) return null;
  const id = offer.options[optionIndex];
  if (id === undefined || !isDoctrineId(id)) return null;
  delete sc.pendingDoctrine;
  sc.doctrines.push(id);
  return { id, name: doctrineDef(id).name };
}

// --- what the interface asks ------------------------------------------------

/**
 * Is this empire owed a decision that must be made before the turn can end?
 *
 * Two of the three offers block and one deliberately does not: a draft and a
 * Doctrine draw are decisions the empire *owes the game*, exactly as a claimed
 * ruin is, while a banked government is a decision the empire is **allowed to
 * defer** — Entry XV makes adoption bankable on purpose, and a blocker on it
 * would delete the only reason banking exists.
 */
export function statecraftBlocker(player: Player): string | null {
  const sc = player.statecraft;
  if (sc.pendingOrder !== undefined) return 'an Order draft is waiting';
  if (sc.pendingDoctrine !== undefined) return 'a Doctrine draft is waiting';
  return null;
}

/** Is any Statecraft card waiting to be answered or claimed? The top bar's badge. */
export function hasStatecraftOffer(player: Player): boolean {
  const sc = player.statecraft;
  return (
    sc.pendingOrder !== undefined ||
    sc.pendingDoctrine !== undefined ||
    sc.pendingGovernment !== undefined ||
    // A banked or opened reward hand is a card waiting too (D1a) — it blocks
    // nothing, and the badge is how a player finds out it is there.
    sc.pendingReward !== undefined ||
    sc.rewardHands.length > 0
  );
}

/** The Orders of one pool, for the screen's browser. Re-exported for one import. */
export { poolOrders, slotCount };
