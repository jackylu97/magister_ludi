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
import { nextFloat } from '../rng';
import { RULES } from '../rulesData';
import { type GameState, type Player, playerById, realPlayers } from '../state';
import {
  type DoctrineId,
  type GovernmentId,
  type OrderId,
  type OrderRarity,
  type OrderSlotGrant,
  type SlotType,
  type TallyOccasion,
  GOVERNMENT_TIERS,
  SLOT_TYPES,
  STARTING_GOVERNMENT,
  STATECRAFT,
  doctrineDef,
  governmentDef,
  governmentsAtTier,
  isDoctrineId,
  isGovernmentId,
  isOrderId,
  orderDef,
  orderFitsSlot,
  poolDoctrines,
  poolOfGovernment,
  poolOrders,
  slotCount,
  slotLayout,
} from '../statecraftData';
import { awardOrderBeads } from '../beads';
import { awardOccasion } from '../triumphs';
import { type TechAge, highestAge } from '../techData';
import { sealTurnsFor } from './evaluator';
import { effectsOfKind } from './evaluator';

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
 */

/** The weight one card carries in a bag drawn by an empire that has skipped `skips` times. */
export function orderDrawWeight(id: OrderId, skips: number): number {
  return rarityDrawWeight(orderDef(id).rarity, skips);
}

/**
 * The same reading, by rung rather than by card — what a screen or a test asks
 * when it wants the shape of the bag rather than the weight of one row.
 *
 * The pity is added, never multiplied, and only to the two rungs `skipPity`
 * names: common is not a key of it (see `StatecraftConfig.skipPity`), so a
 * passed draft can only ever move the deck's top, never its floor. Floored at
 * zero so a retuned knob cannot make a rung impossible to draw by going
 * negative — a weightless bag is a draw that has to fall back on its last item,
 * and an unreachable card is not a balance decision anybody meant to take.
 */
export function rarityDrawWeight(rarity: OrderRarity, skips: number): number {
  const base = STATECRAFT.rarityWeights[rarity] ?? 0;
  const pity = rarity === 'common' ? 0 : (STATECRAFT.skipPity[rarity] ?? 0);
  return Math.max(0, base + pity * Math.max(0, Math.floor(skips)));
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
  /** The new cards, in draw order. */
  options: OrderId[];
}

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

/** Three Doctrines from one adoption's pool, drawn without replacement. */
export interface DoctrineOffer {
  options: DoctrineId[];
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
   * **Order drafts this empire has rerolled for faith**, ever (schema 71).
   *
   * `orderSkips`' twin and its opposite: a pass gives a hand up and banks pity,
   * a reroll pays for another one and banks a *price*. So this is never zeroed —
   * the whole design of the reroll is that it grows dearer every time it is
   * used, and a count that reset would be a discount for taking a card.
   *
   * An **absolute count**, read once by `explainRerollCost` when the button
   * prints the next price, raised in one place (`settleReroll`, `religion.ts`)
   * and ticked by nothing. Distinct from `SlottedOrder.rerollsSeen`, which is
   * the same act counted per chair for the cards that pay to watch it: this one
   * is the empire's bill.
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
  /** A draft awaiting a pick, or the key is absent. Blocks End Turn. */
  pendingOrder?: OrderOffer;
  /** A Doctrine draft awaiting a pick, or absent. Blocks End Turn. */
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
    if (effect.kind !== 'countScaled') continue;
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
  return slotLayout(sc.government);
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
 * The **live pool**: this government's own cards, minus everything already held
 * (the minus-held half is Entry XV's).
 *
 * **The current pool alone** (user, 2026-09-03). It carried the previous
 * government's leftovers until then, and the reason to drop them is that the
 * leftovers were most of the bag: a seat adopting Government I drafted from
 * thirteen chiefdom rows beside thirty-four new ones, so a third of every hand
 * was the age it had just left and the new pool — the reward for adopting —
 * arrived diluted. An unpicked card from the old government is gone for good
 * now; adopting is the moment a whole shelf turns over.
 *
 * Through `poolOrders`, which is the one reader of `retired` — a withdrawn row
 * has to be out of the draw and out of every screen by the same clause. In file
 * order, because a draw that depends on an order must depend on an order the
 * data carries.
 */
export function livePool(sc: PlayerStatecraft): OrderId[] {
  const held = new Set(sc.orders);
  return poolOrders(poolOfGovernment(sc.government)).filter((id) => !held.has(id));
}

/**
 * `livePool` with the rows' own age gates applied — **the bag the draw deals
 * from**.
 *
 * Governments carry no age gate (ruled), so a seat that climbs the tier ladder
 * fast opens pool V in Æra III, and the four bead Orders — whose whole text is
 * the last age — were in its hand (the user, 2026-09-06: "the era 4 victory
 * cards are showing in the game at age 3, that's a bug"). `OrderDef.fromAge` is
 * the row's answer, and this is its one reader: the empire's `highestAge` must
 * reach it. The pool-shape reading above stays ungated on purpose — it is what
 * the bot's margin and the tests ask about a government's whole shelf, and a
 * row already held keeps its chair whatever the age says: the gate is on the
 * deal, never on the holding.
 */
export function drawablePool(sc: PlayerStatecraft, age: TechAge): OrderId[] {
  return livePool(sc).filter((id) => {
    const from = orderDef(id).fromAge;
    return from === undefined || age >= from;
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
 */
export function cardRouteSlots(state: GameState, playerId: number): OfferSizeLine[] {
  const lines: OfferSizeLine[] = [];
  for (const { source, effect } of effectsOfKind(state, playerId, 'routeRider')) {
    // A rider with no figure grants the ordinary one route, so a data row may
    // say only that it widens the fold.
    const extra = (effect.extra ?? 1);
    if (extra === 0) continue;
    lines.push({ source, delta: extra });
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

/**
 * The smallest hand the spread rule applies to.
 *
 * Three slot types need three cards to show one of each, so a hand narrower than
 * that cannot honour the guarantee and does not try — it is dealt plain uniform.
 * A hand is only ever narrower than three when a rider *trims* it, which today
 * nothing does; the clause is here so the rule states its own precondition
 * rather than assuming the table's number.
 */
const SPREAD_MIN_SIZE = SLOT_TYPES.length;

/**
 * The new cards of one draft: `size` from `pool`, and for a hand of three or
 * more, **at least one military, one economic and one wildcard** (user,
 * 2026-09-03).
 *
 * The complaint the rule answers is that a uniform draw over a pool that is half
 * economic deals all-economic hands often enough to be the thing a player
 * remembers about drafting, and a draft whose three faces are one question is
 * not the deckbuilder question. Guaranteeing the spread costs nothing in pool
 * design — every pool stocks all three types — and turns each draft into three
 * comparable offers.
 *
 * **The order of the draws is fixed and stated**: military, then economic, then
 * wildcard (`SLOT_TYPES`, the same order a spread is printed and a screen lays
 * slots out), then the open fill from everything not yet taken. Fixed because a
 * generator read in a different order is a different game from the same seed.
 *
 * **The roll contract.** Each of the four draws goes through `drawWeighted`, so
 * each spends exactly one roll per card it actually takes and none for a card it
 * cannot: a draft spends `(non-empty slot sub-bags) + min(size − guaranteed,
 * rest)` rolls, which is three plus `size − 3` — that is, exactly `size` —
 * whenever the pool can supply all three types and enough cards to fill the
 * hand, and fewer only when the bag itself is short. Emptiness is a fact about
 * the pool and the government, never about the moment, so two runs of the same
 * state spend the same rolls in the same order. A slot whose sub-bag is empty
 * simply deals nothing and falls through to the open fill, which is the same
 * honest answer a short pool has always got.
 *
 * **The rarity weights ride inside the guarantee, never around it** (the ruling
 * of 2026-09-04). Each of the four bags is drawn *by weight* rather than
 * uniformly, so a rare military card is rare among military cards and the
 * spread still deals one of each — which is the only composition of the two
 * rules that keeps both promises. Weighting the hand as a whole and then
 * repairing the spread afterwards would be a guarantee that quietly stops
 * holding whenever the repair has to reach past a weight, and one roll per card
 * is what a replay is owed either way.
 *
 * **The hand comes back in the pool's own file order**, not in draw order. The
 * guaranteed picks would otherwise arrive military-economic-wildcard and the
 * fill after them, and a player would read the seam — the first three faces of
 * every wide draft standing in slot order — as a rule about which card is best.
 * Sorting is display only: the picks are already made, and a choice names an
 * index into what it is shown.
 *
 * Exported for the pins rather than for a second caller: `drawOrderOffer` is the
 * only one, and a rule about *what a generator deals* is testable only by asking
 * it for many hands at a size the table does not currently hand out.
 */
export function drawOrderOptions(
  state: GameState,
  pool: readonly OrderId[],
  size: number,
  weightOf: (id: OrderId) => number = () => 1,
): OrderId[] {
  const taken = new Set<OrderId>();
  if (size >= SPREAD_MIN_SIZE) {
    // The sub-bags partition the pool — `OrderDef.slot` is the card's own single
    // type, and there is no wildcard *card* that fits everywhere — so no draw
    // here can take a card another already has.
    for (const type of SLOT_TYPES) {
      const bag = pool.filter((id) => orderDef(id).slot === type);
      for (const id of drawWeighted(state, bag, 1, weightOf)) taken.add(id);
    }
  }
  const rest = pool.filter((id) => !taken.has(id));
  for (const id of drawWeighted(state, rest, size - taken.size, weightOf)) taken.add(id);
  return pool.filter((id) => taken.has(id));
}

/**
 * Deals one draft: `offerSize` cards from the live pool, weighted by rarity and
 * by the pity this empire's passes have banked.
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
 * **How many cards is asked of `offerSize`** — which is why this takes the whole
 * player rather than its `PlayerStatecraft`: a rider may sit on a wonder
 * standing in one of its cities, and the empire is what knows that.
 */
export function drawOrderOffer(state: GameState, player: Player): OrderOffer {
  const sc = player.statecraft;
  const skips = sc.orderSkips;
  const options = drawOrderOptions(
    state,
    drawablePool(sc, highestAge(player.techsResearched)),
    offerSize(state, player.id, 'order'),
    (id) => orderDrawWeight(id, skips),
  );
  return { options };
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

  player.culturePool = plan.overflow;
  sc.drafts = plan.tier;
  const offer = drawOrderOffer(state, player);
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
  return { id, name: orderDef(id).name };
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
  const type = layout[index]!;
  if (!orderFitsSlot(cardId, type)) {
    return `${orderDef(cardId).name} is ${SLOT_WORDS[orderDef(cardId).slot]} and slot ${
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
  sc.slots = slotLayout(id).map(() => null);

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
    sc.pendingGovernment !== undefined
  );
}

/** The Orders of one pool, for the screen's browser. Re-exported for one import. */
export { poolOrders, slotCount };
