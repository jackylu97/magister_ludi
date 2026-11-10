/**
 * **The draft** — the ladder, the pools, the offers, the rerolls and the
 * governments. The chairs and the slots are in `council.ts`.
 *
 * Culture fills an escalating meter; each fill is a draft, and *tier is the
 * draft count*. A draft offers three new cards and a pass; a government is
 * offered at the tier ladder's rungs; adopting swaps the chairs, re-seats the
 * cards that fit the new ones, lifts every seal and opens a Doctrine offer of
 * the government's tier from the seat's decks. All of it is `state.rng` at the
 * moment an offer opens, an ordinary command to spend it, and both halves in
 * the log — `discoveries.ts`' shape inherited rather than re-invented.
 *
 * Split out of `statecraft.ts` in batch E3b (`docs/flags.md` item pp,
 * `docs/audit/evaluations.md` §4b step 9). It reads `evaluator.ts` for the
 * offers a card opens; the evaluator reads it
 * back for what a seat holds — a function-level cycle, the documented kind
 * (CLAUDE.md), and `test/mapgen/moduleCycles.test.ts` loads both first in turn.
 * `../statecraft.ts` re-exports it, so no import path in the tree changed.
 */

import {
} from '../yields/town';
import {
} from '../yields/empire';
import type { CityYields } from '../cities';
import { nextFloat } from '../rng';
import { RULES } from '../rulesData';
import {
  type GameState,
  type Player,
  capitalCityOf,
  playerById,
  realPlayers,
} from '../state';
// Dominion batch D5: the draft passed occasion's payment, and since
// Magisterial batch MG7 the adoption's. Called inside a function only, so the
// import cycle through `cities.ts` stays a function-level one
// (`test/mapgen/moduleCycles.test.ts`).
import { payOccasionRiders } from '../cities';
import {
  type Band,
  type CardId,
  type DeckId,
  type DoctrineId,
  type GovernmentId,
  type OrderId,
  type OrderRarity,
  type CommissionGoal,
  type TallyFacts,
  type TallyOccasion,
  GOVERNMENT_TIERS,
  ORDER_IDS,
  STARTING_GOVERNMENT,
  STATECRAFT,
  bandTierAt,
  doctrineDef,
  governmentDef,
  governmentsAtTier,
  isDoctrineId,
  isGovernmentId,
  isOrderId,
  orderDef,
  orderIsDealt,
  ordersForDecks,
  poolDoctrines,
  poolOrders,
  slotCount,
  slotLayout,
} from '../statecraftData';
import { awardOrderBeads } from '../beads';
import { awardOccasion } from '../triumphs';
import { type TechAge, highestAge } from '../techData';
import {
  cardActionRule,
  cardRareWeight,
  cardRulePercent,
  cityScopeAdmits,
  countOf,
  effectsOfKind,
  forgetTheLaw,
  heldReligions,
  helpings,
  holdsLevyGrant,
  holdsTendedUnlock,
} from './evaluator';
// The council (`council.ts`), which an adoption seats again. That file imports
// this one back, and these names are used only inside `adoptGovernmentAt`.
import { chairCount, chairFitFor, reseatCouncil, settleCouncilFit } from './council';
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

/**
 * **What a draft costs this empire, in culture** (Magisterial batch MG5, The
 * Open Door; the triage's reading 12). `drafts` is the number already taken,
 * as for `draftCost`, and defaults to the seat's own count, so the default is
 * the price of the next hand.
 *
 * The ladder's figure (`draftCost`) with the empire's discounts on it: every
 * `draftCost` rule its cards carry. The percentages add together first, and
 * the price is taken once and rounded down, so two discounts of 15% take 30%
 * off. A price never goes below nothing.
 *
 * This is the one reader of the rule. Every place that charges, prints or
 * plans the price of a hand asks it here: `planDraft` (and through it
 * `settleDraft`, `draftExhausted` and `draftSettledBy`), the top bar, the
 * empire drawer, the statecraft screen and the bots. Only the price changes:
 * the draft count, the tiers at which governments are offered and the pity
 * a pass buys do not move.
 */
export function draftCostFor(
  state: GameState,
  player: Player,
  drafts: number = player.statecraft.drafts,
): number {
  const base = draftCost(drafts);
  let percent = 0;
  for (const line of cardRulePercent(state, player.id, 'draftCost')) percent += line.percent;
  if (percent === 0) return base;
  return Math.max(0, Math.floor((base * (100 + percent)) / 100));
}

/** What this player's next draft costs, discounts included. See `draftCostFor`. */
export function nextDraftCost(state: GameState, player: Player): number {
  return draftCostFor(state, player);
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
 *
 * `rarePercent` (batch DT10, The Jinshi; `cardRareWeight`) raises the rare rung
 * after the pity has moved points into it, so the seat's passes and the card both
 * count, and 100 doubles the rung. It adds points rather than moving them, so the
 * three rungs may sum to more than the table's hundred. That is safe, because every
 * reader spreads the rungs over their sum.
 */
export function rarityOdds(skips: number, rarePercent = 0): Record<OrderRarity, number> {
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
    rare: Math.max(0, (base.rare ?? 0) + top * share) * Math.max(0, 1 + rarePercent / 100),
  };
}

/**
 * The same reading, by rung — what a screen asks when it wants to say whether
 * a pass buys anything (`passFigure`, `main.ts`: the rare rung's points now
 * against its points after one more pass).
 */
export function rarityDrawWeight(rarity: OrderRarity, skips: number, rarePercent = 0): number {
  return rarityOdds(skips, rarePercent)[rarity];
}

/**
 * **The chance each card in a bag has of being the one dealt**, under the
 * rarity-first draw — the distribution `drawRarityFirst` samples from, written
 * out so the bot's expectation (`expectedBestOrder`, `ai/value.ts`) and the
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
  rarePercent = 0,
): { id: OrderId; chance: number }[] {
  if (bag.length === 0) return [];
  const odds = rarityOdds(skips, rarePercent);
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
  /**
   * **The culture this seat paid for the hand** (Magisterial batch MG5; the
   * triage's reading 11): the price `settleDraft` took from the pool, after
   * any discount (`draftCostFor`). Written when a bought hand is dealt, and
   * kept by a reroll (`settleReroll`), so a redrawn hand keeps the price of
   * the hand it replaced. Absent on a free hand (`openFreeDraft`), which cost
   * nothing. A pick hands it to `payCardDrafted` and a pass to its riders
   * (`settleOrderSkip`), as the moment's `handPrice` fact, so The Accessions
   * Register and The Unwritten Chapter pay from it.
   */
  price?: number;
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
 *     second turn);
 *   · `foreign`: a row of decks the seat does not hold (`foreignCardBag`). The
 *     third position of every hand while the seat holds The Hospitium (batch DT10),
 *     whatever the cadence says.
 *
 * A position whose category holds nothing falls back to the eligible union
 * (rule 5), and the badge then says what the *card* is rather than what the
 * position asked for — `positions` records the ask, the row records the card.
 */
export type HandPosition =
  | { kind: 'deck'; deck: DeckId }
  | { kind: 'generic' }
  | { kind: 'cross' }
  | { kind: 'foreign' };

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
  /**
   * **What a commission's counted goal counted** (Dominion batch D6), kept so
   * the reward can read it (`CommissionReward.fromGoal`, `building`). Only the
   * moments up to the goal's count are kept, so the figures are those of the
   * moments that met the goal:
   *
   *   · `people`: the citizens of the towns counted, as each stood before it
   *     changed hands (Take the City, The Grand Campaign);
   *   · `wonders`: the world wonders in them (The Captured Marvel);
   *   · `town`: the last town counted, which is the one that met the goal
   *     (Take the City's Barracks).
   *
   * Absent on every tally a commission does not keep, and on a commission
   * whose moments carry no town.
   */
  people?: number;
  wonders?: number;
  town?: number;
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
/**
 * **The Doctrines an adoption offers** (batch C3): Doctrines of the adopted
 * government's tier from the seat's own decks, dealt by `drawDoctrineOffer`.
 * Spent by `chooseDoctrine` or passed by `skipDoctrineOffer`, and it blocks
 * End Turn until it is answered, as a draft does.
 */
export interface DoctrineOffer {
  /** The Doctrines dealt, in draw order. A pick names an index into this list. */
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
  /**
   * Doctrines held, in the order they were taken. Permanent and slotless: a
   * Doctrine is held for the whole game, takes no chair, and is the second
   * source of `liveEffects`, after the government.
   */
  doctrines: DoctrineId[];
  /**
   * **The turn each Doctrine was taken** (batch DT1), for a rule that says "from
   * now on", read through `doctrineTakenTurn`. Absolute turns, compared and never
   * ticked. Written once, in `settleDoctrineChoice`. Presence is the state: a
   * seat that has taken no Doctrine has no field.
   */
  doctrineTurns?: Partial<Record<DoctrineId, number>>;
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
   * **The turn each once-a-turn rider last rode** — Field Academies' first kill
   * of the day (batch D2c, `CardWindfallRiderEffect.oncePerTurn`).
   *
   * An **absolute stamp and never a counter that resets**, the discipline this
   * codebase keeps everywhere it keeps time (`TimedEffect.expiresTurn`,
   * `SlottedOrder.sealedUntil`, `City.purchasedUnitTurns`): the entry says
   * *when*, the rider compares it against `state.turn`, and a turn arriving is
   * the whole of the reset. Nothing ticks it, nothing sweeps it, and a phase
   * that zeroed it would be a phase that can be run twice.
   *
   * A list of `{card, turn}` rather than a map, for `tallies`' reason exactly —
   * a Map's order is the one thing the determinism rule forbids an outcome to
   * depend on — and keyed by the **card**, because "once a turn" is a promise a
   * card makes and not a property of the occasion: two cards riding one kill
   * each spend their own day.
   *
   * Written in exactly one place (`payWindfallGrants`, where a payout stops
   * being a preview) and read in exactly one (`windfallPayout`). Optional, so a
   * seat that has never held such a card serialises as one that never will.
   */
  riderTurns?: { card: CardId; turn: number }[];
  /**
   * **The turn each card holding the `faithfulKillsConvert` rule last turned
   * an enemy soldier to this empire's side** (Devotion batch DV8, The Turning
   * of Swords; the triage's reading 30).
   *
   * `riderTurns`' shape and its reasons: an absolute stamp compared against
   * `state.turn`, so nothing ticks it and a new turn is the whole of the
   * reset; a list rather than a map, so no outcome depends on a Map's order;
   * and keyed by the card, because "at most once a turn" is the card's
   * promise. A list of its own, because `riderTurns` belongs to the windfall
   * riders and has one writer and one reader of its own.
   *
   * Written in one place (`stampSidesTurned`, called from `applyCombat`) and
   * read in one (`cardTurningSides`). Optional, so a seat that has never
   * turned a soldier serialises as it did before the field existed.
   */
  sidesTurned?: { card: CardId; turn: number }[];
  /**
   * **The commissions this empire has fulfilled**, in the order they were
   * fulfilled, with the turn each goal was met on (batch C,
   * `docs/plans/deck-implementation.md`). Written in exactly one place,
   * `runCommissions` (`commissions.ts`), and never removed: a fulfilled
   * commission stays in the collection and can never be seated or paid again.
   * A list rather than a map for `tallies`' reason. Absent until the first
   * commission is fulfilled, so a seat that has fulfilled none serialises as
   * it did before the field existed.
   */
  commissionsFulfilled?: { card: OrderId; turn: number }[];
  /**
   * **Wildcard chairs a commission's reward gave for the rest of the game**
   * (Dominion batch D6, Commission: A Victor's Peace). Written only by the
   * reward (`payCommission`, `commissions.ts`), read only by `chairCount`, so
   * every adoption builds the council with them. Absent until the first is
   * won.
   */
  chairsWon?: number;
  /** A draft awaiting a pick, or the key is absent. Blocks End Turn. */
  pendingOrder?: OrderOffer;
  /**
   * The Doctrine offer an adoption opened, awaiting a pick or a pass, or
   * absent. Blocks End Turn.
   */
  pendingDoctrine?: DoctrineOffer;
  /** A banked government offer, or absent. Deliberately does **not** block. */
  pendingGovernment?: GovernmentOffer;
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
  /**
   * What the moment carries for a commission's goal (Dominion batch D6): the
   * town, its citizens and its wonders for a capture, the towns taken for the
   * end of a war. A goal's floor reads them, and the goal's record keeps them.
   * See `TallyFacts`.
   */
  facts?: TallyFacts,
): void {
  if (amount <= 0) return;
  const sc = statecraftOf(state, playerId);
  if (!sc) return;
  for (const slot of sc.slots) {
    const card = slot?.card;
    if (card === undefined || !isOrderId(card)) continue;
    if (!orderWatches(card, occasion, facts)) continue;
    // A commission counts only a moment that meets its goal's floor.
    const goal = countedGoalFor(card, occasion);
    if (goal !== null && !goalFloorMet(goal, facts)) continue;
    let held = sc.tallies.find((row) => row.card === card);
    const before = held?.count ?? 0;
    if (held) held.count += amount;
    else {
      held = { card, count: amount };
      sc.tallies.push(held);
    }
    if (goal !== null && facts !== undefined && before < goal.count) keepGoalFacts(held, facts);
  }
}

/** The commission goal part that counts this occasion on this card, or `null`. */
function countedGoalFor(
  id: OrderId,
  occasion: TallyOccasion,
): Extract<CommissionGoal, { kind: 'counted' }> | null {
  for (const goal of orderDef(id).commission?.goals ?? []) {
    if (goal.kind === 'counted' && goal.occasion === occasion) return goal;
  }
  return null;
}

/**
 * Does this moment meet the goal's floor (Dominion batch D6)? A goal with no
 * floor counts every moment. A floor reads a fact the moment must carry, so a
 * moment without it never counts. Dominion batch D11 added the rank reached
 * (The Chosen Men) and the work a great person laid (The Border Fortress).
 * Scientific batch S6 added the technology completed.
 */
function goalFloorMet(goal: Extract<CommissionGoal, { kind: 'counted' }>, facts: TallyFacts | undefined): boolean {
  if (goal.minPopulation !== undefined && (facts?.population ?? 0) < goal.minPopulation) return false;
  if (goal.minTownsTaken !== undefined && (facts?.townsTaken ?? 0) < goal.minTownsTaken) return false;
  // The rank reached must be at least the floor's rank. The two are compared
  // by the experience each rank needs, which is the rule book's order of the
  // ranks (`holdsRank` reads the same thresholds).
  if (goal.rank !== undefined) {
    const reached = facts?.rank;
    if (reached === undefined) return false;
    const ladder = RULES.combat.ranks.ladder;
    if (ladder[reached].experience < ladder[goal.rank].experience) return false;
  }
  // The great person must have laid this work.
  if (goal.work !== undefined && facts?.improvement !== goal.work) return false;
  // The technology completed must be this one (Scientific batch S6, for S9's
  // The Great Instrument).
  if (goal.tech !== undefined && facts?.tech !== goal.tech) return false;
  return true;
}

/**
 * Adds one counted moment's figures to its goal's record (Dominion batch D6):
 * the citizens and wonders are summed, and the town is the latest one.
 */
function keepGoalFacts(held: OrderTally, facts: TallyFacts): void {
  if (facts.population !== undefined) held.people = (held.people ?? 0) + facts.population;
  if (facts.wonders !== undefined) held.wonders = (held.wonders ?? 0) + facts.wonders;
  if (facts.cityId !== undefined) held.town = facts.cityId;
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
 * **The end of a turn, with each empire's treasury** (Commerce batch T6, The
 * Strongbox; the triage's reading 26). Raises `treasuryHeld` once for every
 * real empire, in seat order, carrying its treasury as the moment's fact. A
 * card counts it only when the treasury meets the floor on its own row
 * (`CardPaysEffect.minTreasury`), and only while seated, as every tally does.
 *
 * Called by the `collectYields` phase (`turn.ts`) after the yields bank, so
 * the treasury includes the turn's income, interest and upkeep. A seat with
 * no card watching the moment writes nothing, so a game without The Strongbox
 * is unchanged.
 */
export function recordTreasuryHeld(state: GameState): void {
  for (const player of realPlayers(state)) {
    recordScalingOccasion(state, player.id, 'treasuryHeld', 1, { treasury: player.gold });
  }
}

/**
 * Is this card watching for this moment? Read off the row's own effects, so what
 * a card counts and what it pays for counting are one declaration.
 *
 * A row with a treasury floor (`minTreasury`, The Strongbox) watches only a
 * moment whose treasury meets it. A moment that carries no treasury does not.
 */
function orderWatches(id: OrderId, occasion: TallyOccasion, facts?: TallyFacts): boolean {
  for (const effect of orderDef(id).effects) {
    if (effect.kind !== 'pays' || effect.basis !== 'count') continue;
    if (effect.count !== 'tally') continue;
    if (effect.tally !== occasion) continue;
    if (effect.minTreasury !== undefined) {
      const treasury = facts?.treasury;
      if (treasury === undefined || treasury < effect.minTreasury) continue;
    }
    return true;
  }
  // A commission's counted goal uses the same per-card tally, so its progress
  // follows the same rules: it grows only while the card is seated and it is
  // kept when the card is unseated (ruling (qqqqqq) 5). A fulfilled commission
  // cannot be seated again, so it never counts again.
  for (const goal of orderDef(id).commission?.goals ?? []) {
    if (goal.kind === 'counted' && goal.occasion === occasion) return true;
  }
  return false;
}

/**
 * The turn this commission was fulfilled on, or `undefined` while it has not
 * been. Read off `PlayerStatecraft.commissionsFulfilled`.
 */
export function commissionFulfilledTurn(sc: PlayerStatecraft, id: OrderId): number | undefined {
  for (const row of sc.commissionsFulfilled ?? []) {
    if (row.card === id) return row.turn;
  }
  return undefined;
}

/**
 * **The seat pool** — every dealt row this seat's decks may draw, in file
 * order: its own decks' single-type rows, the cross-type rows naming either,
 * and the generic rows that belong to everybody (`docs/six-decks-first-cut.md`
 * "The structure"; the decks rework, D1a). A rainbow seat holds all six decks
 * and its pool is the whole dealt table.
 *
 * **The draw's source, replacing `poolOfGovernment`** (kept in
 * `statecraftData.ts` for the retired shelves, read by nothing live). A
 * government's pool used to be replaced whole on adoption. A seat's decks never
 * change, so an adoption now buys chairs, and the draft count chooses which
 * band of these decks is dealt (`currentBandOf`). This
 * list is every band at once and does **not** take out held cards: it is the
 * shape of the seat's shelf, which the bot's margin and the Compendium ask
 * about. The bag a hand is actually dealt from is `eligibleFor`.
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
 * **The seat's research age**: the highest age among its technologies,
 * floored at one (`highestAge` answers one for an empty list). Since the
 * user's ruling of 2026-10-17 the age plays no part in which band is dealt
 * (`currentBandOf`). One deal rule still reads it: a row's own `fromAge`
 * (`eligibleFor`), which only retired rows carry today.
 */
export function researchAgeOf(player: Player): TechAge {
  return highestAge(player.techsResearched);
}

/**
 * **The band this seat's hands are dealt from**: the band whose rung of the
 * draft ladder its draft count has reached (`bandTierAt`). The draft count is
 * the only input. The research age plays no part (the user's ruling of
 * 2026-10-17, `docs/flags.md` (eeeeeee): *"lets remove the research age
 * altogether"*). This replaces the rule of 2026-09-16, under which a band also
 * needed the research age one above it, so that Tier I waited for age 2.
 *
 * Only this band is dealt (the user's ruling of 2026-10-13,
 * `docs/decks/deck-design.md`, "Only the current band is dealt"). When a new
 * band opens, the earlier bands leave the draw for good. Band 0 is the band at
 * zero drafts, so there is always an answer. The answer is never widened when
 * the band has nothing left to deal: an empty current band is a real state,
 * and `draftExhausted` reads it.
 *
 * `drafts` defaults to the seat's own count. A caller asking about the *next*
 * draft passes that draft's number, because the count is raised before the
 * next hand is dealt (`settleDraft`) and the draft that reaches a new rung is
 * already dealt from the new band.
 */
export function currentBandOf(player: Player, drafts: number = player.statecraft.drafts): Band {
  return bandTierAt(drafts);
}

/**
 * **The bag a hand is dealt from**: the seat pool narrowed to the seat's
 * current band (`currentBandOf`), minus everything already held (the
 * minus-held half is Entry XV's), in file order. Cards of earlier bands are
 * not dealt once a later band has opened (the user's ruling of 2026-10-13),
 * unless the row names a later last band (`OrderDef.lastBand`, Double Time),
 * but a card already held keeps its chair: every gate here is on the deal,
 * never on holding. A row's own `fromAge` gate is a separate rule from the band
 * (the ruling of 2026-09-06, for the bead Orders of the last age). Only
 * retired rows carry it today, so it holds no live card back.
 *
 * `drafts` defaults to the seat's own count. The exhaustion check and the
 * bot's reading of the next hand pass the next draft's number, so that they
 * ask about the same band that draft will be dealt from.
 *
 * Empty is a real answer and the one the exhausted-pool rule reads
 * (`draftExhausted`): a seat that holds everything its current band can deal
 * it is charged nothing for a draft that would deal nothing. The bag is never
 * refilled from an earlier band.
 */
export function eligibleFor(
  state: GameState,
  player: Player,
  drafts: number = player.statecraft.drafts,
): OrderId[] {
  return deckPoolOf(state, player).filter(dealGateFor(state, player, drafts));
}

/**
 * **Whether a row may be dealt to this seat now**, every gate but the deck:
 * not held, in the band the draft count has reached, and past the row's own
 * gates. `eligibleFor` asks it of the seat pool, and the foreign-card grant
 * asks it of the decks the seat does not hold (`foreignCardBag`, Magisterial
 * batch MG14), so both deal by one rule.
 *
 * It returns a test rather than a list, so that the facts it reads once (the
 * band, the age, the tended-work and levy unlocks) are read once per bag, not
 * once per row.
 */
function dealGateFor(state: GameState, player: Player, drafts: number): (id: OrderId) => boolean {
  const sc = player.statecraft;
  const age = researchAgeOf(player);
  const band = currentBandOf(player, drafts);
  const held = new Set(sc.orders);
  // Asked once: whether the seat holds a tended-work unlock decides every card
  // marked "Needs tended land" (`OrderDef.needsTendedWork`) at once, and
  // whether it holds a card granting a levy decides every card marked "Needs a
  // levy" (`OrderDef.needsLevy`, Expansionist batch E1).
  const tends = holdsTendedUnlock(state, player.id);
  const levies = holdsLevyGrant(state, player.id);
  return (id) => {
    if (held.has(id)) return false;
    const def = orderDef(id);
    // Dealt from its band through its last band (`OrderDef.lastBand`). Double
    // Time was dealt in Tiers II and III (the user, 2026-10-16) until batch DS1
    // retired it, so no dealt row has a last band now. Most rows have one band.
    if (band < def.band || band > (def.lastBand ?? def.band)) return false;
    if (def.needsTendedWork === true && !tends) return false;
    if (def.needsLevy === true && !levies) return false;
    // The Great Instrument (Scientific batch S9): not dealt to a seat that
    // already knows the technology its goal asks for.
    if (def.notDealtKnowing !== undefined && player.techsResearched.includes(def.notDealtKnowing)) return false;
    return def.fromAge === undefined || age >= def.fromAge;
  };
}

/**
 * **The bag of the decks the seat does not hold**: what The Cabinet of Curiosities
 * draws from (Magisterial batch MG14; the triage's reading 37), and what The
 * Hospitium's third card is dealt from (batch DT10). Every live row of a deck the
 * seat does not hold, in file order, that the seat could be dealt now if it held
 * that deck. A card that two decks share is in the bag only when the seat holds
 * neither deck. A card that belongs to no deck is left out, because every seat is
 * dealt those already. The gates are the deal's own (`dealGateFor`): the seat's
 * current band, not held, and the row's own gates.
 *
 * A seat that holds every deck has an empty bag.
 *
 * `drafts` defaults to the seat's own count. The bots' reading of the next hand
 * passes the next draft's number, as `eligibleFor` takes it, because that draft may
 * reach a new band.
 */
export function foreignCardBag(
  state: GameState,
  player: Player,
  drafts: number = player.statecraft.drafts,
): OrderId[] {
  const dealt = dealGateFor(state, player, drafts);
  const live = ORDER_IDS.filter((id) => orderIsDealt(id));
  return positionBag(live, { kind: 'foreign' }, player.decks).filter(dealt);
}

/**
 * **One card from `foreignCardBag`**, drawn from `state.rng` rarity first at
 * the table's own odds, with no pity (the triage's reading 37): the same
 * draw a hand's card is dealt by (`drawRarityFirst`), asked with no passes.
 * An empty bag gives `undefined` and uses no randomness, as an empty
 * position of a hand does.
 *
 * Called by `raiseOnDraft` (`cities.ts`) for The Cabinet of Curiosities. The
 * caller adds the card to the collection (`addToCollection`) and settles it
 * as a pick (`settleCardTaken`).
 */
export function drawForeignCard(state: GameState, player: Player): OrderId | undefined {
  return drawRarityFirst(state, foreignCardBag(state, player), 0);
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
 *      of them needed code. A counted rider (`count`, `per`, `max`; Magisterial
 *      batch MG6, The Hall of Wonders) adds its figure once for each helping
 *      the count buys, on one line labelled with the helpings.
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

  for (const { source, card, effect } of effectsOfKind(state, playerId, 'offerRider')) {
    if (effect.offer !== kind && effect.offer !== 'all') continue;
    // **A narrowing is not a widening** (batch C3): a row that names a family
    // says which names a draft is dealt from and deals no extra card, so it is
    // skipped before the figure below — which would otherwise read its absent
    // `extra` as the ordinary one.
    if (effect.family !== undefined) continue;
    // A rider with no figure deals the ordinary one card, so a data row may say
    // only which draft it widens. The cap below is what stops a stack of them
    // becoming a spread nobody can read.
    const extra = (effect.extra ?? 1);
    if (extra === 0) continue;
    // **One helping for every `per` of something counted** (Magisterial batch
    // MG6, The Hall of Wonders; the triage's reading 13). Read as
    // `cardRouteSlots` reads a counted road: `countOf` for the count, then
    // `helpings` for the row's divisor and ceiling. The line is labelled with
    // the helpings, and a count that buys none adds no line.
    if (effect.count !== undefined) {
      const times = helpings(
        countOf(state, playerId, card, {
          kind: 'pays',
          where: 'empire',
          basis: 'count',
          to: 'authority',
          amount: 0,
          count: effect.count,
        }),
        effect.per,
        effect.max,
      );
      if (times === 0) continue;
      lines.push({ source: `${source} · ×${times}`, delta: extra * times });
      running += extra * times;
      continue;
    }
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
            // The Merchant Guilds' merchants (Commerce batch T6): the trade
            // `guildsmen` counts, read as a counted line reads it.
            family: effect.family,
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
 *
 * **The Hospitium** (batch DT10, reading 27): while the rule holds, a two-deck seat's
 * third position is `foreign`, whatever the cadence says. A rainbow seat holds every
 * deck, so no deck is foreign to it, and its third position and its rolls stay as
 * they are. `foreignThird` lets the bots ask about a hand with or without the rule
 * (`expectedHandBags`); only they pass it.
 */
export function drawHandPositions(
  state: GameState,
  player: Player,
  draftNumber: number,
  foreignThird: boolean = cardActionRule(state, player.id, 'thirdCardForeign'),
): HandPosition[] {
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
  if (foreignThird && !isRainbowSeat(player)) positions.push({ kind: 'foreign' });
  else if (third.turn === 'generic') positions.push({ kind: 'generic' });
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
 * names any of the seat's decks; `generic` is every row with no home; `foreign`
 * is every row whose decks the seat holds none of (`foreignCardBag`).
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
      case 'foreign':
        return home.length > 0 && !home.some((deck) => decks.includes(deck));
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
 * the card. One roll per card is the contract a replay needs; two rolls would
 * say the same thing and spend twice.
 *
 * An empty bag deals nothing and spends nothing (emptiness is a fact about the
 * shelf, never about the moment, so two runs of one state spend the same
 * rolls). A table whose every rung weighs nothing deals uniformly.
 */
export function drawRarityFirst(
  state: GameState,
  bag: readonly OrderId[],
  skips: number,
  rarePercent = 0,
): OrderId | undefined {
  if (bag.length === 0) return undefined;
  const odds = rarityOdds(skips, rarePercent);
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
 * The one exception is a `foreign` position (batch DT10, The Hospitium). It draws
 * from `foreign`, the bag the caller hands in (`foreignCardBag`), and if that bag
 * has nothing left it falls back to the union as any position does (rule 5).
 * `rarePercent` is the rare rung's rise (`cardRareWeight`), and it applies to every
 * card of the hand.
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
  foreign: readonly OrderId[] = [],
  rarePercent = 0,
): OrderId[] {
  const hand: OrderId[] = [];
  const open = (): OrderId[] => eligible.filter((id) => !hand.includes(id));
  const wanted = Math.max(0, Math.floor(size));
  for (const position of positions.slice(0, wanted)) {
    const rest = open();
    // Rule 5: the position's own category, or the whole eligible union when
    // that category holds nothing this seat does not already own. Never an
    // inaccessible deck, never a duplicate — both are outside `eligible`.
    const pool = position.kind === 'foreign' ? foreign.filter((id) => !hand.includes(id)) : rest;
    const bag = positionBag(pool, position, decks);
    const drawn = drawRarityFirst(state, bag.length > 0 ? bag : rest, skips, rarePercent);
    if (drawn !== undefined) hand.push(drawn);
  }
  // The extra cards a rider adds (rule 6): distinct, eligible, rarity-first,
  // from the union — no guaranteed category.
  for (let extra = hand.length; extra < wanted; extra++) {
    const drawn = drawRarityFirst(state, open(), skips, rarePercent);
    if (drawn === undefined) break;
    hand.push(drawn);
  }
  return hand;
}

/**
 * **The bags the next hand would be dealt from, one per card, with no roll** —
 * the draw's shape read as a plan, for the bot's expectation of a hand
 * (`expectedBestOrder`, `ai/value.ts`) and for nothing that deals.
 *
 * A two-deck seat's positions are pure arithmetic (`thirdPositionOf`), so its
 * bags are the draw's own, fallback included. A rainbow seat's two decks are
 * rolled at the deal, which a reading may not do, so its deck positions are
 * approximated by **the union of its single-type rows** — an honest widening
 * written down: the estimate reads a rainbow hand as slightly better than any
 * one pair of decks would deal. The count read is the *next* draft's when no
 * hand is on the table (`sc.drafts + 1`), and the standing hand's positions
 * when one is — the same rule the deal keeps. The count chooses the band as
 * well as the positions, since only the current band is dealt.
 *
 * A `foreign` position's bag is `foreignCardBag` at the same count (batch DT10). When
 * `foreignThird` is given, the answer is about the next hand with or without The
 * Hospitium, whatever the seat holds and whatever hand is on the table. That is how
 * the bots price the card.
 */
export function expectedHandBags(state: GameState, player: Player, foreignThird?: boolean): OrderId[][] {
  const sc = player.statecraft;
  const standing = foreignThird === undefined ? sc.pendingOrder?.positions : undefined;
  const drafts = standing ? sc.drafts : sc.drafts + 1;
  const eligible = eligibleFor(state, player, drafts);
  if (eligible.length === 0) return [];
  const size = offerSize(state, player.id, 'order');
  const bags: OrderId[][] = [];
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
      : drawHandPositions(state, player, sc.drafts + 1, foreignThird);
  for (const position of positions.slice(0, size)) {
    let bag = anyDeck;
    if (position !== 'anyDeck') {
      const pool = position.kind === 'foreign' ? foreignCardBag(state, player, drafts) : eligible;
      bag = positionBag(pool, position, player.decks);
    }
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
 *
 * **The two hand rules of batch DT10** are read here too. A `foreign` position
 * (The Hospitium) is dealt from `foreignCardBag`, and a hand with none never builds
 * that bag. The rare rung's rise (The Jinshi) is read once, with the pity.
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
    positions.some((position) => position.kind === 'foreign') ? foreignCardBag(state, player) : [],
    cardRareWeight(state, player.id),
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
 *
 * The bag asked about is the one the waiting draft would be dealt from, at
 * that draft's own count (`plan.tier`). The count is raised before the hand is
 * dealt, so a draft that reaches a new rung of the ladder is dealt from the new
 * band. Asking at the old count would read the old band, and since only the
 * current band is dealt, a seat that had emptied the old band just below a rung
 * would never reach the rung at all.
 */
export function draftExhausted(state: GameState, player: Player): boolean {
  if (player.barbarian) return false;
  const sc = player.statecraft;
  if (sc.pendingOrder !== undefined || sc.pendingDoctrine !== undefined) return false;
  const plan = planDraft(state, player);
  if (plan === null) return false;
  return eligibleFor(state, player, plan.tier).length === 0;
}

/**
 * **The Doctrines this seat may be offered at an adoption of this tier** (batch
 * C3): the tier's live Doctrines (`poolDoctrines`, which pairs the tier with a
 * Doctrine tier) that belong to one of the seat's decks, less the ones it
 * already holds — a Doctrine is offered at most once a game (Entry XV.b). In
 * file order.
 *
 * **The gates** (batch DT5): a row marked `needsTendedWork` or `needsReligion`
 * leaves the bag while the seat cannot use it. Every reader asks the bag, so the
 * offer, the "can one open" check and the bots' price of an offer stay in step.
 * Each fact is read once per bag, as `dealGateFor` reads its own, and the gate is
 * on the offer only: a Doctrine already held stays held.
 */
export function doctrineBagFor(state: GameState, player: Player, tier: number): DoctrineId[] {
  const held = new Set<DoctrineId>(player.statecraft.doctrines);
  const tends = holdsTendedUnlock(state, player.id);
  const keepsFaith = heldReligions(state, player.id).length > 0;
  return poolDoctrines(tier).filter((id) => {
    if (held.has(id)) return false;
    const def = doctrineDef(id);
    if (!def.decks.some((deck) => player.decks.includes(deck))) return false;
    if (def.needsTendedWork === true && !tends) return false;
    return def.needsReligion !== true || keepsFaith;
  });
}

/**
 * **The Doctrine offer an adoption opens** (batch C3; the user, 2026-10-15:
 * *"doctrines offered with the government, as before. Show a combination of
 * the two deck's doctrines"*). The offer holds Doctrines of the adopted
 * government's tier from both of the seat's decks.
 *
 * **One from each deck, then a third from either** — the reward hands' old
 * rule, used until the user rules the mix (`docs/plans/chairs-build.md`, C3).
 * The positions are `drawDoctrinePositions`'; each is dealt evenly from the
 * Doctrines of its deck, and a position whose deck has none left falls back
 * to the whole bag. A rider that widens a Doctrine offer (`offerSize`) adds
 * cards from the whole bag after the base three. A bag smaller than the offer
 * deals the bag, and an empty bag deals nothing and spends no randomness, so
 * the caller can skip the offer.
 *
 * `tier` is the government tier the offer is for. The adoption passes its own
 * offer's tier; a wonder's Doctrine grant and the faith reroll pass the
 * current government's.
 */
export function drawDoctrineOffer(
  state: GameState,
  player: Player,
  tier: number,
): DoctrineOffer {
  const bag = doctrineBagFor(state, player, tier);
  if (bag.length === 0) return { options: [] };
  const size = Math.max(HAND_POSITIONS, offerSize(state, player.id, 'doctrine'));
  const options: DoctrineId[] = [];
  const take = (from: readonly DoctrineId[]): void => {
    const [pick] = drawWithoutReplacement(state, from, 1);
    if (pick !== undefined) options.push(pick);
  };
  const left = (): DoctrineId[] => bag.filter((id) => !options.includes(id));
  for (const position of drawDoctrinePositions(state, player)) {
    if (options.length >= size) break;
    const remaining = left();
    if (remaining.length === 0) break;
    const ofDeck =
      position.kind === 'deck' ? remaining.filter((id) => doctrineDef(id).decks.includes(position.deck)) : [];
    take(ofDeck.length > 0 ? ofDeck : remaining);
  }
  while (options.length < size) {
    const remaining = left();
    if (remaining.length === 0) break;
    take(remaining);
  }
  return { options };
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
 * It takes the state because the price is the seat's own, discounts included
 * (`nextDraftCost`, Magisterial batch MG5).
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

export function planDraft(
  state: GameState,
  player: Player,
  culture = player.culturePool,
): DraftPlan | null {
  const cost = nextDraftCost(state, player);
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
  const plan = planDraft(state, player);
  if (!plan) return null;
  // **An exhausted pool charges nothing** (the decks rework, D1a; the design
  // doc's rule 7). Asked before a byte moves: the culture stays banked, the
  // count stays where it is — a draft that dealt nothing was not a regular
  // draft, so it advances neither the cadence nor the ladder — and the screen
  // says why through `draftExhausted`. Nothing is written, so a seat whose
  // decks have run dry serialises exactly as it did the turn before. The bag is
  // read at this draft's own count, the one the hand below is dealt at; see
  // `draftExhausted` for why the old count would be the wrong question.
  if (eligibleFor(state, player, plan.tier).length === 0) return null;

  player.culturePool = plan.overflow;
  // The banks are a line of the meters too — see `collectYields` (batch M3).
  bumpEconomy(state);
  sc.drafts = plan.tier;
  const offer = drawOrderOffer(state, player);
  // **The hand keeps its price** (Magisterial batch MG5; the triage's reading
  // 11): the culture just taken from the pool, for the cards that pay from it
  // when the hand is picked from or passed.
  offer.price = plan.cost;
  sc.pendingOrder = offer;

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
export function draftSettledBy(state: GameState, player: Player, grant: number): string | null {
  const plan = planDraft(state, player, player.culturePool + grant);
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
  return addToCollection(player, id);
}

/**
 * **Adds a card to the collection, as a pick does** (Magisterial batch MG14):
 * the card joins `PlayerStatecraft.orders`, never a chair, and a charter
 * applies its grant at once (`applyCharter`, the decks rework D1a). It
 * touches no hand and no pity, which are the pick's own business
 * (`settleOrderChoice`).
 *
 * Two callers: `settleOrderChoice`, the pick of an Order hand, and
 * `raiseOnDraft` (`cities.ts`), for the card The Cabinet of Curiosities draws
 * (`drawForeignCard`; the triage's reading 37). Each then settles the card
 * through `settleCardTaken` (`cities.ts`), which takes the state this does
 * not.
 */
export function addToCollection(player: Player, id: OrderId): OrderChoice {
  const sc = player.statecraft;
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
 * Called by the verb that takes a card into the collection
 * (`addToCollection`, which the pick and The Cabinet of Curiosities' grant
 * share since Magisterial batch MG14) and by nothing else, so a second way to
 * draft a card would call this or not grant at all. (The reward hand's pick
 * was the other caller until batch C3 removed the reward hands.) A row that is no
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

/**
 * **Pays the cards that pay when a card enters the collection** (Commerce
 * batch T7): the `cardDrafted` moment, paid at the capital through
 * `payOccasionRiders`. Without a capital, food and production land where that
 * function puts them. The Art Dealers rode the moment until batch R1. The
 * Court Painter (Magisterial batch MG2) and The Accessions Register (batch
 * MG5) ride it now.
 *
 * It is a function of its own, beside `applyCharter`, so that every way a card
 * enters the collection pays the same riders. It has one caller,
 * `settleCardTaken` (`cities.ts`), which every way a card enters the
 * collection goes through (Magisterial batch MG14):
 *
 *   · the pick of an Order hand (`applyChooseOrder`, `commands.ts`);
 *   · the card The Cabinet of Curiosities draws (`raiseOnDraft`, `cities.ts`;
 *     the triage's reading 37), with no price.
 *
 * `settleCardTaken` calls it last: after the card has been added and its
 * charter applied, after the law has been dropped for a charter, and after
 * the card's on-draft grants are paid. So the riders read the law the card
 * left.
 *
 * `price` is the culture the seat paid for the hand the card came from
 * (`OrderOffer.price`, Magisterial batch MG5). The pick reads it before
 * `settleOrderChoice` removes the hand, and it travels as the moment's
 * `handPrice` fact. A free hand has no price, and neither has a card a grant
 * hands over, so a rider that pays a share of the price pays nothing for
 * them.
 */
export function payCardDrafted(state: GameState, player: Player, price?: number): void {
  const capital = capitalCityOf(state, player.id);
  payOccasionRiders(
    state,
    player,
    'cardDrafted',
    capital ? { col: capital.col, row: capital.row } : undefined,
    price === undefined ? {} : { handPrice: price },
  );
}

/**
 * **Can a free Order draft open for this seat now?** (Dominion batch D5, The
 * New Code.) Not while a draft or a Doctrine offer is waiting, and not when
 * the seat's decks have nothing left to deal at its current draft count (the
 * triage's reading 16). The rider asks this before it rides, so its ten-turn
 * stamp is written only for a draft that opens.
 */
export function freeDraftCanOpen(state: GameState, playerId: number): boolean {
  const player = playerById(state, playerId);
  if (!player || player.barbarian === true) return false;
  const sc = player.statecraft;
  if (sc.pendingOrder !== undefined || sc.pendingDoctrine !== undefined) return false;
  return eligibleFor(state, player, sc.drafts).length > 0;
}

/**
 * **Opens an Order draft at once, free of culture** (Dominion batch D5, The New
 * Code). The draft count and the next draft's cost do not move (the triage's
 * reading 16): only the offer is dealt, from `state.rng`, as `settleDraft`
 * deals one. Returns false and changes nothing when no free draft can open.
 *
 * The hand carries no `price`, because it cost no culture (Magisterial batch
 * MG5; the Magisterial triage's reading 11).
 */
export function openFreeDraft(state: GameState, player: Player): boolean {
  if (!freeDraftCanOpen(state, player.id)) return false;
  player.statecraft.pendingOrder = drawOrderOffer(state, player);
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
  // **The hand's price, read before the hand goes** (Magisterial batch MG5,
  // The Unwritten Chapter; the triage's reading 11). Absent on a free hand.
  const price = sc.pendingOrder.price;
  delete sc.pendingOrder;
  sc.orderSkips += 1;
  awardOrderBeads(state, player.id, 'draftPassed');
  // **And the cards pay on it** (Dominion batch D5): The Open Muster's and The
  // Landsturm's units, at the capital. One call, so the pass keeps one
  // mechanism. The price travels as the moment's `handPrice` fact.
  const capital = capitalCityOf(state, player.id);
  payOccasionRiders(
    state,
    player,
    'draftPassed',
    capital ? { col: capital.col, row: capital.row } : undefined,
    price === undefined ? {} : { handPrice: price },
  );
  return { skips: sc.orderSkips };
}

// --- the Doctrine offer's positions --------------------------------------------

/**
 * **The three positions of a Doctrine offer** (batch C3): one of the seat's
 * decks, its other deck, then either — *"one Doctrine from each deck, then a
 * third from either"*, the rule the reward hands dealt by until they were
 * removed. A rainbow seat, which holds every deck, samples two distinct decks
 * for the first two positions, exactly as its normal hand does. The third
 * position names no deck (`cross`, as the reward hands named it) and is dealt
 * from the whole bag.
 */
export function drawDoctrinePositions(state: GameState, player: Player): HandPosition[] {
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

// --- adoption ---------------------------------------------------------------

/**
 * Why this player cannot adopt this government, or `null` when they can.
 *
 * The offer is **banked**, so the only questions are whether one is banked at
 * all and whether the index names one of its three. There is no tier check
 * beyond that: an empire that climbed to tier 9 holding an unclaimed tier-7
 * triple may still take it, which is exactly what "bankable" means.
 *
 * **A Doctrine offer that is waiting is answered first** (batch C3). An
 * adoption opens a Doctrine offer, and one written over a waiting offer (a
 * wonder's grant, or an earlier offer still unanswered) would throw that offer
 * away. `settleDraft` holds a draft back for the same reason.
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
  if (player.statecraft.pendingDoctrine !== undefined) {
    return `${player.name} must answer the waiting Doctrine offer before adopting a government`;
  }
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
  /** Cards that kept a chair in the new council, in their old seat order. */
  reseated: OrderId[];
  /** Cards that fitted no chair left and went back to the collection. */
  returned: OrderId[];
  /** The Doctrine offer the adoption opened, or `null` when no Doctrine was left to offer. */
  doctrines: DoctrineOffer | null;
}

/**
 * Adopts a government: **the chapter break** (Entry XV.b).
 *
 * Three things happen in one breath, and they are one decision rather than
 * three. The **chairs** change, so the array is rebuilt to the new
 * government's layout. The seated cards are **re-seated** in it as far as they
 * fit (`reseatCouncil`, batch C2): a card whose chair still exists and still
 * fits it keeps that chair, the rest move to free chairs that fit them, and
 * every seal is lifted so the player can re-lay the council at once; a card
 * that fits no chair left goes back to the collection with its progress. And a
 * **Doctrine offer opens** (batch C3: Doctrines of this government's tier from
 * the seat's decks, `drawDoctrineOffer`), drawn here rather than at the next
 * resolution because it belongs to *this* moment and a draw taken later would
 * be a draw taken from a moved generator. With no Doctrine left to offer, none
 * opens.
 *
 * Since Magisterial batch MG7 the adoption is also a moment the cards are paid
 * at (`governmentAdopted`, feature G), after the re-seating and the Triumph and
 * before the Doctrine draw.
 *
 * Since Magisterial batch MG12 the re-seating uses the fit the old council
 * granted (`chairFitFor`): while The Mixed Constitution sits in it, every card
 * fits every chair. If that card finds no chair in the new council, the fit
 * narrows and the council is re-seated again by the plain rule
 * (`settleCouncilFit`), before the moment pays.
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

  // The old council, kept to re-seat from once the new chairs are laid out.
  const previous = sc.slots;
  // **And the fit the old council grants** (Magisterial batch MG12, The Mixed
  // Constitution; the triage's reading 24). Read before the government and
  // the chairs change, so while that card sits in the old council every card
  // is re-seated while chairs remain.
  const fit = chairFitFor(state, player.id);
  sc.government = id;
  // **The charter has changed hands, and the chair count below reads it**
  // (batch R1). A government is the first source of `liveEffects`, and the walk
  // is remembered — so without this line `chairCount` answered off whatever was
  // remembered under the stamps this command came in on: the **old** charter's
  // law in a played game, where a reader had warmed the memo a moment before,
  // and the **new** one in a replay of that game's own log, where nothing had
  // asked. Two boards, one log. The law shadow found it on turn 23 of a bot
  // game; it is latent on today's seeds only because no seat there holds a card
  // that opens a chair, and `cardExtraChairs` answers the same either way.
  //
  // Dropping it here also makes the count the one the comment below has always
  // claimed it was — *the new government with the old chairs* — rather than the
  // whole of the old charter.
  forgetTheLaw(state);
  // Rebuilt rather than resized: the new layout's slot 2 is not the old one's,
  // so carrying anything across by index would seat a card in the wrong kind
  // of chair. The cards are re-seated by type below instead.
  //
  // **To `chairCount` and not to `slotLayout`**, so a law that opens chairs of
  // its own (The King's Friends) opens them under every government this realm
  // ever adopts — which is the whole sentence that card makes. `chairCount`
  // reads the live law, which the memo below answers — so the announcement
  // comes **after** the rebuild, not before it: a bump in front of this line
  // would have the memo record the old slots as this government's first
  // reading, and a benched card would go on paying (found 2026-09-10, the
  // growing-orders pin). That is still true, and the drop above does not undo
  // it: the walk this count takes records the **old chairs**, and the drop after
  // the rebuild is what throws that reading away again. One drop each side, and
  // each for its own half of the sentence.
  sc.slots = new Array<SlottedOrder | null>(chairCount(state, player.id, id)).fill(null);
  // **The reroll's ladder starts again** (B1 rule 3, `docs/flags.md` (aaaaaa)):
  // a fresh charter arrives with a cheap reroll. An event write here, in the
  // one place a government changes hands, and never a countdown — see the
  // field's own docblock for why a *pick* still does not reset it.
  sc.rerollsTaken = 0;
  // **The malices take their chairs first, then the Orders are re-seated**
  // (§4 and batch C2): the debt is owed to the next wager rather than to the
  // government that owed it, so every malice this realm carries takes a chair
  // in the new layout, and the cards fill the chairs left. See `reseatCouncil`.
  reseatCouncil(player, previous, state.turn, fit);
  // A government is the first source of `liveEffects` and the re-seating above
  // rewrote every chair — two writes the meters fold, announced together (batch
  // M3, `slate.ts`). **And the slate dropped** (`forgetTheLaw`'s register): the
  // chair count above read the law with the new government and the *old*
  // chairs, and a memo warmed mid-rebuild answered for a benched Order as if
  // it still sat — the growing-orders pin caught it, 2026-09-10.
  forgetTheLaw(state);
  bumpEconomy(state);
  // **If the card that widened the fit found no chair in the new council**,
  // the fit is the plain one again, and the council is re-seated by it at
  // once (Magisterial batch MG12; reading 24). It does nothing otherwise.
  settleCouncilFit(state, player);
  // What the adoption did, read off the old council and the final one, in
  // the old seat order: so the second re-seating above is counted too.
  const seating = councilOutcome(previous, sc.slots);

  // The Writ Extends. **Before** the Doctrine draw, so a triumph that fills the
  // renown ladder opens its great-person offer before this empire is handed a
  // second card to answer — and so the two draws spend `state.rng` in an order
  // a replay reproduces.
  awardOccasion(state, player.id, 'governmentAdopted');

  // **And the cards pay on it** (Magisterial batch MG7, feature G; the
  // triage's reading 17): The Sed Festival's great person. After the
  // re-seating, so only a card in a chair of the new council pays, and after
  // the Triumph, so the Triumph keeps its place. Before the Doctrine draw, for
  // the Triumph's reason: a great-person offer opens before the seat is
  // handed a second hand, and the draws spend `state.rng` in an order a
  // replay reproduces. At the capital, so food and production a rider pays
  // land there.
  const capital = capitalCityOf(state, player.id);
  payOccasionRiders(
    state,
    player,
    'governmentAdopted',
    capital ? { col: capital.col, row: capital.row } : undefined,
  );

  const doctrines = drawDoctrineOffer(state, player, offer.tier);
  let opened: DoctrineOffer | null = null;
  if (doctrines.options.length > 0) {
    sc.pendingDoctrine = doctrines;
    opened = doctrines;
  }
  return {
    id,
    name: governmentDef(id).name,
    reseated: seating.reseated,
    returned: seating.returned,
    doctrines: opened,
  };
}

/**
 * Which cards of an old council are still seated in a new one, and which went
 * back to the collection, each in the old seat order.
 */
function councilOutcome(
  previous: readonly (SlottedOrder | null)[],
  now: readonly (SlottedOrder | null)[],
): { reseated: OrderId[]; returned: OrderId[] } {
  const reseated: OrderId[] = [];
  const returned: OrderId[] = [];
  for (const slot of previous) {
    if (slot === null || !isOrderId(slot.card)) continue;
    const card = slot.card;
    (now.some((one) => one?.card === card) ? reseated : returned).push(card);
  }
  return { reseated, returned };
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
  if (!offer) return `${player.name} has no Doctrine offer awaiting a pick`;
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
  turn: number,
): { id: DoctrineId; name: string } | null {
  const sc = player.statecraft;
  const offer = sc.pendingDoctrine;
  if (!offer) return null;
  const id = offer.options[optionIndex];
  if (id === undefined || !isDoctrineId(id)) return null;
  delete sc.pendingDoctrine;
  sc.doctrines.push(id);
  (sc.doctrineTurns ??= {})[id] = turn;
  return { id, name: doctrineDef(id).name };
}

/** Why this player cannot pass on their Doctrine offer, or `null`. `orderSkipError`'s twin. */
export function doctrineSkipError(state: GameState, playerId: number): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  if (!player.statecraft.pendingDoctrine) return `${player.name} has no Doctrine offer to pass on`;
  return null;
}

/**
 * **Passes on the Doctrine offer** (batch C3: *"the player takes one or
 * passes"*). The offer is spent and nothing is given back: there is no pity
 * and no bead, because a Doctrine offer is not a draft and nothing was paid to
 * deal it. A Doctrine passed over is not held, so a later offer of the same
 * tier (a wonder's Doctrine grant) may deal it again.
 */
export function settleDoctrineSkip(player: Player): boolean {
  const sc = player.statecraft;
  if (!sc.pendingDoctrine) return false;
  delete sc.pendingDoctrine;
  return true;
}

// --- what the interface asks ------------------------------------------------

/**
 * Is this empire owed a decision that must be made before the turn can end?
 *
 * Two of the three offers block and one deliberately does not: a draft and a
 * Doctrine offer are decisions the empire *owes the game*, exactly as a claimed
 * ruin is, while a banked government is a decision the empire is **allowed to
 * defer** — Entry XV makes adoption bankable on purpose, and a blocker on it
 * would delete the only reason banking exists.
 */
export function statecraftBlocker(player: Player): string | null {
  const sc = player.statecraft;
  if (sc.pendingOrder !== undefined) return 'an Order draft is waiting';
  if (sc.pendingDoctrine !== undefined) return 'a Doctrine offer is waiting';
  return null;
}

/** Is any Statecraft card waiting to be answered or claimed? The top bar's badge. */
export function hasStatecraftOffer(player: Player): boolean {
  const sc = player.statecraft;
  return (
    sc.pendingOrder !== undefined ||
    sc.pendingDoctrine !== undefined ||
    sc.pendingGovernment !== undefined
  );
}

/** The Orders of one pool, for the screen's browser. Re-exported for one import. */
export { poolOrders, slotCount };
