/**
 * Great people: the offer a filled renown bucket opens, the piece it puts on the
 * board, and the two verbs that spend it (`docs/great-people.md`).
 *
 * What this module is, and what it deliberately is not
 * ----------------------------------------------------
 * It is the **rules**: how the roster is drawn from, when a pick is legal, what
 * each family's act pays and what each family's work plants. It is emphatically
 * *not* a second evaluator — a legacy is a list of ordinary `CardEffect`s read
 * by `statecraft.ts`, which is still the only module in the game that switches
 * on `effect.kind`. Nothing below reads one. That is the same claim
 * `religion.ts` makes for a belief, made a fourth time, and it is what keeps
 * eighty names a data table.
 *
 * The shapes, and their precedents — every one of them inherited
 * -------------------------------------------------------------
 *   · **The offer** is `drawOrderOffer`'s (`statecraft.ts`): dealt from
 *     `state.rng` at the moment the bucket fills, stored on the player, spent by
 *     a command naming an **index**, blocking End Turn until it is answered.
 *     Entry XV's doctrine for the fifth time.
 *   · **The agent** is the augur's (`religion.ts`): a civilian with charges, two
 *     verbs, consumed by either, removed through `removeUnit` like every other
 *     disappearance. What differs is only that its charge buys an *act* or a
 *     *work* rather than a rite or a god.
 *   · **The act** is Entry XVIII's windfall, four times over: every family pays
 *     through the `settle…Windfall` its bucket already has, so a scholar's
 *     beakers finish a technology by exactly the code an end-of-turn technology
 *     is finished by, and an engineer's hammers finish a granary by exactly the
 *     code a chop finishes one by.
 *   · **The work** is `buildImprovementAt`'s: a tile field written instantly,
 *     validated by `improvementErrorAt` — the *same* ground rules a worker's
 *     farm is held to — and the town that owns the ground refreshed through
 *     `refreshTileDerived`.
 *
 * The one thing here that is genuinely new is the **draw**, and it is new
 * because the roster is shared by the whole world. See `drawGreatPersonOffer`.
 *
 * Contention
 * ----------
 * Under simultaneous turns two seats may hold offers naming the same person.
 * That is not a bug to design away — it is the shape of every shared pool in
 * this game — and it is settled the way every other contention is: **by log
 * order**. The first `chooseGreatPerson` to reach the reducer takes the name;
 * the second is refused with a sentence, and its offer is **re-drawn on the
 * spot** so the seat is not left holding a hand it cannot play. The redraw
 * spends `state.rng`, which is a mutation inside a *refused* command — so it is
 * deliberately performed by the **handler after the refusal is decided**, never
 * inside the error function, and the refusal is a `fail` whose state change is
 * exactly one redraw. See `greatPersonChoiceError` and `redrawGreatPersonOffer`.
 */

import {
  capitalCityOf,
  cityAt,
  nearestOwnedCity,
  refreshCityDerived,
  refreshTileDerived,
  settleProductionWindfall,
  spawnTileFor,
} from './cities';
import {
  FAMILIES,
  type Family,
  type GreatPersonId,
  type LegacyRevocation,
  ROSTER_AGES,
  greatPersonDef,
  isGreatPersonId,
  rosterOfAge,
} from './greatPeopleData';
import {
  type ImprovementId,
  improvementDef,
  workForFamily,
} from './improvementData';
import { improvementErrorAt } from './improvements';
import { type Tile, getTileAt, tileHex, tileIndex, wrappedDistance } from './map';
import { nextFloat } from './rng';
import { RULES } from './rulesData';
import {
  type City,
  type GameState,
  type GreatPersonOffer,
  type Player,
  type TimedEffect,
  type Unit,
  cityById,
  createUnit,
  playerById,
  removeUnit,
  unitById,
} from './state';
import { happinessOf } from './meters';
import { renownThreshold, settleRenownWindfall } from './renown';
import { cardActionRule, cardAmplifier, offerSize, settleCultureWindfall } from './statecraft';
import type { ActionRuleId, CardEffect } from './statecraftData';
import { settleResearchWindfall } from './tech';
import { highestAge, techDef } from './techData';
import { unitDef } from './unitData';
import { recomputeVisibilityFor } from './visibility';

const PEOPLE = RULES.greatPeople;

// --- what a piece is --------------------------------------------------------

/**
 * The roster row a recruited great person stands on the board as.
 *
 * A constant rather than a lookup because there is exactly one such row, and
 * `UnitDef.greatWork` is what every *rule* asks — this is only the answer to
 * "which piece do I mint", which is a question about the one row that exists.
 * A second agent type (a great admiral the day naval units land) makes this a
 * lookup off the family, and `settleGreatPersonChoice` is the one line that
 * changes; nothing else in this file names a unit type at all.
 */
const GREAT_PERSON_UNIT = 'greatPerson' as const;

/** Is this piece a great person — a unit whose charge is an act or a work? */
export function isGreatPerson(unit: Unit): boolean {
  return unitDef(unit.type).greatWork === true;
}

/** Which person this piece is, or `null` when it is not one at all. */
export function personOf(unit: Unit): GreatPersonId | null {
  const id = unit.person;
  return id !== undefined && isGreatPersonId(id) ? id : null;
}

/** Which family this piece serves, or `null`. The switch both verbs turn on. */
export function familyOf(unit: Unit): Family | null {
  const id = personOf(unit);
  return id === null ? null : greatPersonDef(id).family;
}

// --- the draw ---------------------------------------------------------------

/**
 * The roster age an empire of this era draws from.
 *
 * `docs/great-people.md` numbers its roster Æra II (Heroes) through Æra V
 * (Magister); the tech tree today knows three ages (`TechAge`). **One function
 * maps between them**, so the tree pass that adds the fourth and fifth ages
 * moves this line and nothing else — the alternative is a `+ 1` sprinkled
 * through the draw, the spill and every test.
 *
 * Æra I is the Heroes roster: great people first appear there, and an empire
 * that fills its bucket before researching anything should be offered the
 * earliest names rather than nothing at all.
 */
export function rosterAgeFor(techAge: number): number {
  const first = ROSTER_AGES[0] ?? 2;
  const last = ROSTER_AGES[ROSTER_AGES.length - 1] ?? first;
  return Math.min(last, Math.max(first, first + Math.max(0, Math.floor(techAge) - 1)));
}

/** The roster age this empire draws from, read off what it has researched. */
export function rosterAgeOf(player: Player): number {
  return rosterAgeFor(highestAge(player.techsResearched));
}

/**
 * The ages a draw walks, in the order it walks them: **this one, then the
 * previous ones descending, then the next ones ascending**.
 *
 * The spill rule (`docs/great-people.md`), written once as an ordering rather
 * than three times as a special case. A short age reaches backwards first —
 * *the forgotten*, recruited late — and only then forwards — *ahead of their
 * time* — and both readings are flavour the annal can state. Nothing is ever
 * excluded: the walk covers every age the table holds, so an offer is empty only
 * when the **whole roster** is spent.
 */
export function spillOrder(age: number): number[] {
  const before = ROSTER_AGES.filter((a) => a < age).sort((a, b) => b - a);
  const after = ROSTER_AGES.filter((a) => a > age).sort((a, b) => a - b);
  return [age, ...before, ...after];
}

/**
 * The names this empire could be dealt, in draw order, already spilled.
 *
 * Ages are taken whole and in `spillOrder`, and the walk **stops as soon as the
 * list can fill the hand** — which is the precise reading of "if the age's pool
 * has fewer than `offerSize` names, draw from the previous age's unclaimed
 * first". An age with plenty therefore never leaks a name from the age beside
 * it, and an age with two hands back two of its own plus enough of the previous
 * one to make up the difference.
 */
export function greatPersonPool(state: GameState, player: Player, size: number): GreatPersonId[] {
  const spent = new Set<GreatPersonId>(state.recruited);
  const list: GreatPersonId[] = [];
  for (const age of spillOrder(rosterAgeOf(player))) {
    for (const id of rosterOfAge(age)) {
      if (!spent.has(id)) list.push(id);
    }
    if (list.length >= size) break;
  }
  return list;
}

/**
 * The base every candidate's weight starts from. See `greatPersonWeights`.
 *
 * A thousand rather than one because the weights are **integers**: a share is
 * `floor(1000 × fed / total)`, so the arithmetic is exact on every engine and a
 * replay cannot drift on a rounding difference. `drawDiscoveryOffer` gets this
 * for free by weighting with whole numbers off a data row; this one computes its
 * weights, so it has to buy the same guarantee deliberately.
 */
const WEIGHT_BASE = 1000;

/**
 * How likely each candidate is, given what has fed this empire's renown.
 *
 * **The feed biases the draw and never restricts it** — the first of the three
 * rules `docs/great-people.md` gives for a roster smaller than the game needs.
 * A candidate's weight is
 *
 *     WEIGHT_BASE + floor(WEIGHT_BASE × renownByFamily[family] / total)
 *
 * so an empire that has fed nothing sees a flat bag, and an empire whose renown
 * came *entirely* from libraries sees scholars at twice the weight of everybody
 * else and **nobody at zero**. Twice is the whole range on purpose: a bias a
 * player can feel, and never a family they can lock themselves out of by
 * building the wrong things for forty turns.
 *
 * Returned as a parallel array to `candidates`, so the draw below walks one list
 * in one order and the ordering is the candidate list's own — which is file
 * order, which is an order the data carries.
 */
export function greatPersonWeights(
  player: Player,
  candidates: readonly GreatPersonId[],
): number[] {
  let total = 0;
  for (const family of FAMILIES) total += Math.max(0, player.renownByFamily[family] ?? 0);
  return candidates.map((id) => {
    if (total <= 0) return WEIGHT_BASE;
    const fed = Math.max(0, player.renownByFamily[greatPersonDef(id).family] ?? 0);
    return WEIGHT_BASE + Math.floor((WEIGHT_BASE * fed) / total);
  });
}

/**
 * Deals one great-person offer: `offerSize` names from the (spilled) pool,
 * without replacement, weighted by the feed.
 *
 * `drawDiscoveryOffer`'s walk with computed weights instead of tabled ones, and
 * `drawWithoutReplacement`'s guarantee: **every draw spends exactly one roll**
 * whether or not the bag was long enough, because a conditional roll is the one
 * way a replay falls out of step with the game it replays.
 *
 * **How many is asked of `offerSize`** (`statecraft.ts`), the one evaluator all
 * five drafts share, at the moment the offer opens — so John Dee's own legacy
 * widens the next empire's recruitment with nothing written here.
 *
 * An offer with **no options at all** is the honest answer when the whole roster
 * is spent, and its caller (`settleRenownWindfall`) is what turns that into "the
 * renown just banks" rather than into a blocker nobody can answer.
 */
export function drawGreatPersonOffer(state: GameState, player: Player): GreatPersonOffer {
  const size = offerSize(state, player.id, 'greatPerson');
  const remaining = greatPersonPool(state, player, size);
  const weights = greatPersonWeights(player, remaining);
  const wanted = Math.min(Math.max(0, Math.floor(size)), remaining.length);
  const options: GreatPersonId[] = [];

  for (let taken = 0; taken < wanted; taken++) {
    let total = 0;
    for (const weight of weights) total += weight;
    // Unreachable while `WEIGHT_BASE` is positive; the guard is here so a
    // retuned base cannot turn this into a division by zero.
    if (total <= 0) break;
    let roll = nextFloat(state.rng) * total;
    let chosen = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      roll -= weights[i]!;
      if (roll < 0) {
        chosen = i;
        break;
      }
    }
    options.push(remaining[chosen]!);
    remaining.splice(chosen, 1);
    weights.splice(chosen, 1);
  }
  return { options };
}

// --- buying the recruitment -------------------------------------------------

/**
 * Which bank an early recruitment is bought out of. `PurchaseCurrency`'s twin,
 * kept here rather than imported for `purchase.ts`'s reason: what is for sale is
 * not an *item*, so it is not that module's question.
 */
export type OfferCurrency = 'gold' | 'faith';

/** Which action rule each bank is gated by, and what it costs. One table. */
const OFFER_BANKS: Record<OfferCurrency, { rule: ActionRuleId; price: () => number }> = {
  gold: { rule: 'buyGreatPersonWithGold', price: () => PEOPLE.offerPriceGold },
  faith: { rule: 'buyGreatPersonWithFaith', price: () => PEOPLE.offerPriceFaith },
};

/** What buying an early recruitment costs this empire out of this bank. */
export function greatPersonOfferPrice(currency: OfferCurrency): number {
  return Math.max(0, Math.floor(OFFER_BANKS[currency].price()));
}

/**
 * Why this empire cannot buy its next great person out of this bank, or `null`.
 *
 * **A great person is neither built nor bought — it is *called*** (CLAUDE.md),
 * and this does not change that by a word: `UnitDef.greatWork` is still refused
 * by `buildError` and by `purchaseError`, and no coin anywhere puts a piece on
 * the board. What is for sale is the **recruitment** — the moment the ladder
 * would have opened an offer — which is why the settlement below pours renown
 * rather than minting anybody, and why a seat that already holds an offer is
 * refused: it has nothing to buy.
 *
 * The gate is an `actionRule` and therefore a *card's* to grant, which is the
 * whole of The Commonwealth and The Magisterium. Refusals in precedence, each a
 * different sentence: who you are, what your law allows, what you already owe
 * the game, whether the roster has anybody left, and only then the money.
 */
export function greatPersonPurchaseError(
  state: GameState,
  playerId: number,
  currency: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  if (currency !== 'gold' && currency !== 'faith') {
    return `purchaseGreatPersonOffer needs a currency of gold or faith, got ${String(currency)}`;
  }
  const bank = OFFER_BANKS[currency];
  if (!cardActionRule(state, playerId, bank.rule)) {
    return `${player.name}'s law does not let a great person be bought with ${currency}`;
  }
  if (player.greatPersonOffer !== undefined) {
    return `${player.name} already has a great person waiting to be chosen`;
  }
  // The honest refusal rather than a silent purchase of nothing: a spent roster
  // is `settleRenownWindfall`'s "bank rather than block", asked *before* the
  // money changes hands instead of after.
  if (greatPersonPool(state, player, 1).length === 0) {
    return 'every great person in the world has already been called';
  }
  const price = greatPersonOfferPrice(currency);
  const held = currency === 'gold' ? player.gold : player.faithPool;
  if (held < price) {
    return `${player.name} needs ${price} ${currency} and has ${held}`;
  }
  return null;
}

/**
 * Buys the recruitment. Validates nothing — `greatPersonPurchaseError` is the
 * rule and the command asks it first.
 *
 * **One draft path.** The bank is charged and the ladder is then covered through
 * `settleRenownWindfall` — the fifth Entry XVIII seam and the only way renown is
 * ever added — with exactly what the threshold still wants, so the offer opens
 * by the same code an end-of-turn trickle opens one by, blocks End Turn the same
 * way, and is answered by the same `chooseGreatPerson`. Nothing here draws a
 * hand, spends the roster or touches `state.recruited`.
 *
 * The grant names **no family**, which is deliberate: gold buys a hearing, not a
 * reputation, so the feed record — and therefore the weighting of the draw — is
 * left exactly as the empire's own buildings made it.
 */
export function purchaseGreatPersonOfferAt(
  state: GameState,
  player: Player,
  currency: OfferCurrency,
): GreatPersonOffer | null {
  const price = greatPersonOfferPrice(currency);
  if (currency === 'gold') player.gold -= price;
  else player.faithPool -= price;
  const owed = Math.max(0, renownThreshold(player) - player.renownPool);
  return settleRenownWindfall(state, player, [{ family: null, amount: owed }]);
}

// --- taking a name ----------------------------------------------------------

/**
 * Why this player cannot take this option, or `null` when they can.
 *
 * **The** gate: the `chooseGreatPerson` command refuses with this sentence and
 * the offer card is built from exactly the offer it answers `null` about, so a
 * name a player can click is a command the reducer takes. `orderChoiceError`'s
 * shape, refusal for refusal, with **one refusal of its own** — the name may
 * already be somebody else's, because the roster is the world's and two seats
 * looking at the same window may have been dealt the same person.
 */
export function greatPersonChoiceError(
  state: GameState,
  playerId: number,
  optionIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const offer = player.greatPersonOffer;
  if (!offer) return `${player.name} has no great person waiting to be chosen`;
  if (!Number.isInteger(optionIndex)) {
    return `chooseGreatPerson needs an integer optionIndex, got ${String(optionIndex)}`;
  }
  const index = optionIndex as number;
  if (index < 0 || index >= offer.options.length) {
    return `Option ${index} is not one of the ${offer.options.length} offered`;
  }
  const id = offer.options[index];
  // Only reachable from a hand-edited save or a retuned roster under a live game.
  if (!isGreatPersonId(id)) return `Option ${index} names no known great person`;
  // The contention clause, and the only one in this file. See the module
  // docblock: the roster is shared by every seat and resolved by log order.
  if (state.recruited.includes(id)) {
    return `${greatPersonDef(id).name} has already been called by another empire`;
  }
  return null;
}

/**
 * Deals this empire a fresh hand, because the one it held named somebody who is
 * now spent.
 *
 * Called by the reducer **after** a refusal, never inside the gate: a rejected
 * command must leave the state byte-identical, and a redraw is a mutation, so
 * the two cannot be the same step. What makes it defensible anyway is that the
 * alternative is worse — a seat holding a hand of names another empire has taken
 * is a seat that can never end its turn.
 *
 * A redraw that finds the roster empty **clears the offer** rather than leaving
 * an empty one, which is the same thing `settleRenownWindfall` does when the
 * roster is spent: the renown stays banked, and the empire may end its turn.
 */
export function redrawGreatPersonOffer(state: GameState, player: Player): GreatPersonOffer | null {
  if (player.greatPersonOffer === undefined) return null;
  const offer = drawGreatPersonOffer(state, player);
  if (offer.options.length === 0) {
    delete player.greatPersonOffer;
    return null;
  }
  player.greatPersonOffer = offer;
  return offer;
}

/** What a pick did, for the announcement and for the interface's camera. */
export interface GreatPersonRecruit {
  id: GreatPersonId;
  name: string;
  family: Family;
  /** The piece that arrived, or `null` when there was nowhere to stand. */
  unitId: number | null;
  /** The town it arrived in, or `null` for an empire with no cities. */
  cityId: number | null;
}

/**
 * Takes one name and clears the offer. Validates nothing — the rule is
 * `greatPersonChoiceError`'s and the command asks it first.
 *
 * The order is the arithmetic and each step is a rule:
 *
 *   1. **the offer is spent first** (the key *deleted*, not set to
 *      `undefined`), for `settleOrderChoice`'s reason: a reader that saw it
 *      during the recruitment would see a decision that had in fact already been
 *      made, and a player who has answered must serialise identically to one who
 *      never had an offer.
 *   2. **the world's register is written**, which is what makes the name
 *      unavailable to every other seat — one place, this one.
 *   3. **the ladder climbs**, so the next recruitment is dearer. At the *pick*
 *      rather than at the offer, exactly as `settlersBuilt` climbs at completion
 *      rather than when a settler is queued: an empire has recruited somebody
 *      when it has somebody.
 *   4. **the piece arrives**, in the capital or the nearest town to it, through
 *      `createUnit` — full movement, its charge, its owner's fog refreshed — so
 *      it can act on the turn it was called, which is Entry XVIII.2's reading of
 *      a windfall.
 *
 * An empire with **no city** still recruits: the name is spent, the ladder
 * climbs, and no piece stands anywhere. That is the honest reading rather than a
 * refusal, because by the time this runs the offer has already been dealt and a
 * seat with no cities is a seat about to be eliminated.
 */
export function settleGreatPersonChoice(
  state: GameState,
  player: Player,
  optionIndex: number,
): GreatPersonRecruit | null {
  const offer = player.greatPersonOffer;
  if (!offer) return null;
  const id = offer.options[optionIndex];
  if (id === undefined || !isGreatPersonId(id)) return null;

  delete player.greatPersonOffer;
  state.recruited.push(id);
  player.greatPeopleRecruited += 1;

  const def = greatPersonDef(id);
  const recruit: GreatPersonRecruit = {
    id,
    name: def.name,
    family: def.family,
    unitId: null,
    cityId: null,
  };

  const seat = capitalCityOf(state, player.id);
  if (!seat) return recruit;
  recruit.cityId = seat.id;
  const tile = spawnTileFor(state, seat, GREAT_PERSON_UNIT);
  if (!tile) return recruit;
  const born = createUnit(state, player.id, GREAT_PERSON_UNIT, tile.col, tile.row, id);
  // Exempt by type already — a great person is unlocked by no technology, so
  // `unitUpkeep` has no age to charge — and marked anyway, so the rule does not
  // quietly depend on that staying true the day somebody gives the roster row a
  // node. See `Unit.freeUpkeep`, entry 4.
  born.freeUpkeep = true;
  recruit.unitId = born.id;
  return recruit;
}

// --- the act ----------------------------------------------------------------

/**
 * Why this piece cannot spend itself on its family's boon, or `null`.
 *
 * **The** gate: the `greatPersonAct` command refuses with this sentence and the
 * unit panel greys its Act row with it, so an offered button is a command the
 * reducer takes. `riteError`'s shape — the actor's questions, then the family's
 * one requirement — and the requirements are exactly the ones a *wasted* boon
 * would otherwise be: a scholar with nothing under research, and an engineer or
 * an artist with no town in reach, are spending a whole person on nothing.
 */
export function greatPersonActError(
  state: GameState,
  playerId: number,
  unitId: number,
): string | null {
  const problem = actorProblem(state, playerId, unitId);
  if (problem !== null) return problem;
  const unit = unitById(state, unitId)!;
  const player = playerById(state, playerId)!;
  const family = familyOf(unit)!;
  const person = greatPersonDef(personOf(unit)!);

  if (family === 'scholar' && player.researching === null) {
    return `${person.name} has nothing to study — choose a technology first`;
  }
  if ((family === 'engineer' || family === 'artist') && actCityFor(state, unit) === null) {
    return `${person.name} needs one of your cities to work in`;
  }
  return null;
}

/** The actor's half of both gates, written once. */
function actorProblem(state: GameState, playerId: number, unitId: number): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const unit = unitById(state, unitId);
  if (!unit) return `No unit with id ${String(unitId)}`;
  if (unit.ownerId !== playerId) return `Unit ${unit.id} does not belong to player ${playerId}`;
  if (!isGreatPerson(unit)) return `A ${unitDef(unit.type).name} has no legacy to leave`;
  // A `greatWork` piece with no name on it is a hand-edited save; it has no
  // family, so it has neither verb.
  if (personOf(unit) === null) return `Unit ${unit.id} is not a named great person`;
  return null;
}

/**
 * The town an act lands in: the one the piece is standing in, or the nearest
 * this empire holds.
 *
 * `nearestOwnedCity`'s reading, and it is shared by the gate and the mechanism
 * so a greyed button and a paid windfall name the same town — two
 * implementations of "which city gets this" is exactly how a preview starts
 * lying (`chopCity`'s argument, one verb over).
 */
export function actCityFor(state: GameState, unit: Unit): City | null {
  const standing = cityAt(state, unit.col, unit.row);
  if (standing && standing.ownerId === unit.ownerId) return standing;
  return nearestOwnedCity(state, unit.ownerId, { col: unit.col, row: unit.row });
}

/** What spending a great person on its family's boon did, for the announcement. */
export interface GreatPersonAct {
  id: GreatPersonId;
  name: string;
  family: Family;
  /** The town it landed in, or `null` for a boon that lands on the empire. */
  city: City | null;
  /** The technology the beakers completed, or `null`. */
  research: string | null;
  /** Pieces a general's aura reached, in `state.units` order. */
  blessed: number[];
  /** The turn a timed half runs out, or `null` for a pure windfall. */
  expiresTurn: number | null;
  /** The legacy that now hangs on the empire. Always the person's own id. */
  legacy: GreatPersonId;
}

/**
 * Spends a great person on its family's boon. Validates nothing —
 * `greatPersonActError` is the rule and the command asks it first.
 *
 * **Every arm goes through the seam its bucket already has**, which is the whole
 * of why this function is short: a scholar's beakers are
 * `settleResearchWindfall`, an engineer's hammers `settleProductionWindfall`, an
 * artist's culture `settleCultureWindfall`, and a merchant's gold is a bank that
 * needs no settlement at all. Entry XVIII: the moment of the gift is the moment
 * of the payoff, and never a number written into a basket in the hope that a
 * phase notices.
 *
 * Two arms hang something that runs out (`TimedEffect`, an **absolute** expiry —
 * nothing ticks anything). They are stamped **before** the windfall is paid, for
 * `performRiteAt`'s reason exactly: a boon whose windfall settles a queue should
 * settle it under the effects it just granted.
 *
 * The piece is consumed and **the legacy attaches** — either verb leaves it, and
 * that is the design (`docs/great-people.md`): the board decision is burst or
 * ground, and the card is yours whichever you chose.
 */
export function greatPersonActAt(
  state: GameState,
  player: Player,
  unit: Unit,
): GreatPersonAct {
  const id = personOf(unit)!;
  const def = greatPersonDef(id);
  const era = highestAge(player.techsResearched);
  // **Leonardo's notebooks**, read once for the whole act (`greatPersonAct`) and
  // applied to each family's own figure *before* it reaches the seam that banks
  // it — so a doubled engineer pours twice the hammers through the same
  // `settleProductionWindfall` and a doubled scholar twice the beakers through
  // the same `settleResearchWindfall`. Entry XVIII.5's discipline for a windfall
  // that is not a `windfallRider`: the figure is composed once, before anything
  // is banked, so the preview and the payout are one number. It reaches what an
  // act *pays* and never a duration or a radius — a general's aura is not a
  // figure, which is the honest split rather than a silence.
  const boost = cardAmplifier(state, player.id, 'greatPersonAct');
  const paid = (base: number): number => Math.floor((base * (100 + boost)) / 100);
  const done: GreatPersonAct = {
    id,
    name: def.name,
    family: def.family,
    city: null,
    research: null,
    blessed: [],
    expiresTurn: null,
    legacy: id,
  };

  switch (def.family) {
    case 'scholar': {
      const aim = player.researching;
      const cost = aim === null ? 0 : techDef(aim).cost;
      player.sciencePool += paid(Math.floor(cost * PEOPLE.scholarShare));
      done.research = settleResearchWindfall(state, player)?.name ?? null;
      break;
    }
    case 'engineer': {
      const city = actCityFor(state, unit);
      done.city = city;
      if (city) {
        city.hammerBasket += paid(PEOPLE.engineerHammers * era);
        settleProductionWindfall(state, city);
        refreshCityDerived(state, city);
      }
      break;
    }
    case 'merchant': {
      player.gold += paid(PEOPLE.merchantGold * era);
      break;
    }
    case 'artist': {
      const city = actCityFor(state, unit);
      done.city = city;
      if (city) {
        done.expiresTurn = stampTimed(state, city, id, PEOPLE.artistTurns, [
          { kind: 'happiness', amount: PEOPLE.artistHappiness, per: 'city' },
        ]);
      }
      player.culturePool += paid(PEOPLE.artistCulture);
      settleCultureWindfall(state, player);
      if (city) refreshCityDerived(state, city);
      break;
    }
    case 'general': {
      const effects: CardEffect[] = [
        { kind: 'combatLine', amount: PEOPLE.generalCombat, when: { test: 'always' }, side: 'both' },
      ];
      for (const other of unitsWithin(state, unit, PEOPLE.generalRadius)) {
        other.hp = unitDef(other.type).maxHp;
        done.expiresTurn = stampTimed(state, other, id, PEOPLE.generalTurns, effects);
        done.blessed.push(other.id);
      }
      break;
    }
    default: {
      const unhandled: never = def.family;
      void unhandled;
      break;
    }
  }

  spendGreatPerson(state, player, unit, id);
  return done;
}

/**
 * Every friendly piece within `radius` of this one, **including itself**, in
 * `state.units` order.
 *
 * Itself, because a general standing in the line is in the line — a rule that
 * excluded the caster would be a rule nobody could discover, and the piece is
 * consumed a moment later anyway, so the only thing it changes is whether a
 * general standing alone does anything at all.
 */
function unitsWithin(state: GameState, unit: Unit, radius: number): Unit[] {
  const from = getTileAt(state.map, unit.col, unit.row);
  if (!from) return [];
  const eye = tileHex(from);
  const list: Unit[] = [];
  for (const other of state.units) {
    if (other.ownerId !== unit.ownerId) continue;
    const to = getTileAt(state.map, other.col, other.row);
    if (!to) continue;
    if (wrappedDistance(state.map, eye, tileHex(to)) > radius) continue;
    list.push(other);
  }
  return list;
}

/**
 * Hangs effects on a holder until an **absolute** turn, and answers when they
 * run out.
 *
 * `stampRite`'s twin (`religion.ts`), and deliberately the same shape: one
 * `TimedEffect` per effect rather than one carrying a list, because every reader
 * walks a flat list and a nested one would be a second shape to unwrap; the
 * array created lazily so a town that was never blessed serialises exactly as it
 * did before great people existed.
 */
function stampTimed(
  state: GameState,
  holder: { timed?: TimedEffect[] },
  card: GreatPersonId,
  turns: number,
  effects: readonly CardEffect[],
): number {
  const expiresTurn = state.turn + Math.max(1, Math.floor(turns));
  const list = holder.timed ?? [];
  for (const effect of effects) list.push({ card, effect, expiresTurn });
  holder.timed = list;
  return expiresTurn;
}

/**
 * Takes the piece off the board and hangs its legacy on the empire. **The** one
 * place a great person is spent, reached by both verbs.
 *
 * The piece goes through `removeUnit` like every other disappearance, so the
 * owner's fog is refreshed without this function knowing fog exists. The legacy
 * is pushed once — a name is recruited once in a world, so a duplicate is
 * unreachable, and the guard is here because a hand-edited save is not.
 */
function spendGreatPerson(
  state: GameState,
  player: Player,
  unit: Unit,
  id: GreatPersonId,
): void {
  // Stamped with the empire's era, which is the one revocation that is a
  // comparison rather than an occasion: Boudica's revolt belonged to her
  // century, and "which century" is a number written down once. See
  // `LegacyRecord`.
  if (!player.legacies.some((held) => held.id === id)) {
    player.legacies.push({ id, age: highestAge(player.techsResearched) });
  }
  removeUnit(state, unit.id);
}

// --- revocation -------------------------------------------------------------

/**
 * Marks every legacy of this empire that the named occasion silences. **The**
 * one place a legacy is revoked.
 *
 * A *mark*, never a splice: `Player.legacies` stays exactly the roll of who
 * served this empire, in spend order, and `liveEffects` is where a marked record
 * stops being read (one filter, one line). That is the whole of the mechanism —
 * the 2026-08-28 ruling's "hook the occasion, mark the legacy, never delete
 * history" — and it is why the count The Empire pays on (`greatPeopleEarned`)
 * needs no clause: a general who is no longer heeded was still earned.
 *
 * Idempotent, which is what lets the two swept occasions be swept: `ageAdvanced`
 * and `happinessNegative` are read once a turn off the board and re-marking an
 * already-marked record changes nothing, exactly as `pruneTimedEffects` deleting
 * an already-inert effect changes nothing.
 *
 * Answers **what it silenced this call**, so a caller with a toast to write has
 * the names without diffing two lists.
 */
export function revokeLegacies(
  state: GameState,
  playerId: number,
  occasion: LegacyRevocation,
): GreatPersonId[] {
  const player = playerById(state, playerId);
  if (!player) return [];
  const lost: GreatPersonId[] = [];
  for (const held of player.legacies) {
    if (held.revoked === true) continue;
    if (!isGreatPersonId(held.id)) continue;
    if (greatPersonDef(held.id).revokedWhen !== occasion) continue;
    // The age's own clause: a legacy is Boudica's while the era she was spent in
    // is still the era the empire stands in. Compared, never counted down.
    if (occasion === 'ageAdvanced' && highestAge(player.techsResearched) <= held.age) continue;
    held.revoked = true;
    lost.push(held.id);
  }
  return lost;
}

/**
 * The two revocations that are **conditions of a turn** rather than events,
 * read once a turn off the board.
 *
 * `runRenown`'s standing Triumphs, one mechanism over, and for their reason
 * exactly: "the first turn your happiness goes negative" and "the age she was
 * recruited in has closed" are *facts*, not moments somebody has to hook, and a
 * sweep cannot miss one. The third revocation (`enemyEntersCapital`) genuinely
 * is a moment and is hooked at the one "a piece arrived" seam — a sweep would
 * let a column march through the capital between two end-of-turns.
 *
 * It skips nobody: the wild holds no legacies, so the loop over its empty list
 * is the honest way to say that rather than a `realPlayers` filter that would
 * imply there was something to skip.
 */
export function reviewLegacies(state: GameState): void {
  for (const player of state.players) {
    if (player.legacies.length === 0) continue;
    if (happinessOf(state, player.id) < 0) revokeLegacies(state, player.id, 'happinessNegative');
    revokeLegacies(state, player.id, 'ageAdvanced');
  }
}

// --- the work ---------------------------------------------------------------

/**
 * The improvement this piece plants, or `null` when it plants none.
 *
 * Asked of the family and answered by the *improvement table's own inverse*
 * (`workForFamily`), so "what does a scholar build?" has one answer in one place
 * and a sixth work is a JSON row.
 */
export function workOf(unit: Unit): ImprovementId | null {
  const family = familyOf(unit);
  return family === null ? null : workForFamily(family);
}

/**
 * Why this piece cannot plant its family's work where it stands, or `null`.
 *
 * **The** gate: the `greatPersonWork` command refuses with this sentence and the
 * unit panel greys its Work row with it. The actor's questions here and the
 * ground's delegated **whole** to `improvementErrorAt` — the *same* function a
 * worker's farm is held to, so an academy is refused on somebody else's ground,
 * under a city, on a lake and on a wheat seam for exactly the sentences a farm
 * would be refused with, and there is no second copy of the constraint shape.
 *
 * It deliberately does *not* check whose turn it is. That is a question about
 * the actor and belongs to the command.
 */
export function greatPersonWorkError(
  state: GameState,
  playerId: number,
  unitId: number,
): string | null {
  const problem = actorProblem(state, playerId, unitId);
  if (problem !== null) return problem;
  const unit = unitById(state, unitId)!;
  const work = workOf(unit);
  if (work === null) {
    return `${greatPersonDef(personOf(unit)!).name} has no work to leave behind`;
  }
  const tile = getTileAt(state.map, unit.col, unit.row);
  if (!tile) return `Unit ${unit.id} is not on the map`;
  return improvementErrorAt(state, unit.ownerId, tile, work);
}

/** What planting a work did, for the announcement. */
export interface GreatPersonWork {
  id: GreatPersonId;
  name: string;
  family: Family;
  improvement: ImprovementId;
  col: number;
  row: number;
  /** Tiles the work claimed for its owner, in map order. The citadel's. */
  claimed: { col: number; row: number }[];
  legacy: GreatPersonId;
}

/**
 * Plants the family's work and spends the piece. Validates nothing — the rule is
 * `greatPersonWorkError`'s.
 *
 * `buildImprovementAt`'s three mutations minus the one that does not apply: the
 * tile gains the improvement **instantly** (there is no progress to bank and so
 * nothing for two simultaneous seats to contend over), the owning town's derived
 * state is refreshed through `refreshTileDerived` — a manufactory pays this
 * instant, in the *mechanism*, so an AI gets it too — and the piece is consumed
 * whole rather than charged. There is no movement to spend: a great person plants
 * one thing and is gone.
 *
 * The **citadel** claims its hex and the ring around it, which is the one thing
 * an improvement does to the board beyond standing on it. See `claimAround`.
 */
export function greatPersonWorkAt(
  state: GameState,
  player: Player,
  unit: Unit,
  tile: Tile,
): GreatPersonWork {
  const id = personOf(unit)!;
  const def = greatPersonDef(id);
  const work = workOf(unit)!;

  tile.improvement = work;
  const claimed = improvementDef(work).claimsNeighbours === true
    ? claimAround(state, player, tile, PEOPLE.citadelClaimRadius)
    : [];
  refreshTileDerived(state, tile);

  spendGreatPerson(state, player, unit, id);
  return {
    id,
    name: def.name,
    family: def.family,
    improvement: work,
    col: tile.col,
    row: tile.row,
    claimed,
    legacy: id,
  };
}

/**
 * Claims a hex and everything within `radius` of it for this empire's nearest
 * town, and answers what changed hands.
 *
 * Written through `state.tileOwner` — the *same* parallel array a border
 * expansion and a tile purchase write, and the only one there is — so a claimed
 * hex is claimed ground in every reading of the word: it is worked, it is
 * improvable, it pays its owner, and it is what `improvementErrorAt` asks about.
 * The city it is booked to is the nearest one this empire holds, because a tile
 * belongs to a *city* in this state and not to a player (see `state.ts`).
 *
 * Ground another empire already holds is **taken**, which is the citadel's whole
 * point (`docs/great-people.md`: "the tile and its neighbours are claimed") and
 * the reason the work is a general's. Water is left alone: an ocean hex inside a
 * border is a hex no citizen can work and no city ever claimed by culture.
 *
 * Map order, so the report reads the same for whoever is looking at it.
 */
function claimAround(
  state: GameState,
  player: Player,
  centre: Tile,
  radius: number,
): { col: number; row: number }[] {
  const seat = nearestOwnedCity(state, player.id, { col: centre.col, row: centre.row });
  if (!seat) return [];
  const eye = tileHex(centre);
  const claimed: { col: number; row: number }[] = [];
  // Whose panels this changed. Ground taken off a rival is ground its own town
  // must stop counting *now* — the pillage rule read from the other end (see
  // `refreshTileDerived`) — so the losers are collected as the sweep goes and
  // re-seated once, rather than once per hex.
  const dispossessed = new Set<number>();
  for (const tile of state.map.tiles) {
    if (wrappedDistance(state.map, eye, tileHex(tile)) > Math.max(0, Math.floor(radius))) continue;
    const index = tileIndex(state.map, tile.col, tile.row);
    const before = state.tileOwner[index];
    if (before === seat.id) continue;
    if (before !== null && before !== undefined) dispossessed.add(before);
    state.tileOwner[index] = seat.id;
    claimed.push({ col: tile.col, row: tile.row });
  }
  if (claimed.length === 0) return claimed;
  refreshCityDerived(state, seat);
  const seats = new Set<number>([player.id]);
  for (const cityId of dispossessed) {
    const loser = cityById(state, cityId);
    if (!loser) continue;
    refreshCityDerived(state, loser);
    seats.add(loser.ownerId);
  }
  // A border that moved is a pair of eyes that moved with it: a city watches its
  // own territory, so both empires' maps are redrawn — the same refresh
  // `foundCityAt` takes after it claims its opening ring.
  recomputeVisibilityFor(state, [...seats]);
  return claimed;
}

// --- what the interface asks ------------------------------------------------

/**
 * Why this empire cannot end its turn yet, or `null`.
 *
 * `statecraftBlocker`'s and `religionBlocker`'s third sibling, and the same debt
 * in a fifth currency: an offer sits on the empire until it is spent, no other
 * seat can answer it, and the reducer refuses a `chooseGreatPerson` from a seat
 * that has ended its turn — so a player who pressed past it would have to wait a
 * whole resolution to answer a card already on screen.
 *
 * An **empty** offer never blocks, because it is not a decision: it is what a
 * spent roster leaves behind for one instant before `redrawGreatPersonOffer`
 * clears it.
 */
export function greatPersonBlocker(player: Player): string | null {
  const offer = player.greatPersonOffer;
  if (offer === undefined || offer.options.length === 0) return null;
  return 'a great person is waiting to be chosen';
}

/** Is a great person waiting to be called? The dock button's badge. */
export function hasGreatPersonOffer(player: Player): boolean {
  return greatPersonBlocker(player) !== null;
}
