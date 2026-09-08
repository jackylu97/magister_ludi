/**
 * **The want book, and what a coin is worth because of it.**
 *
 * Batch 1 of the priority system (`docs/bot-priorities.md`), and the answer to
 * the audit's finding 2: *"the knob IS the behavior. Nothing prices 'is this
 * purchase worth more than holding the coin'."* Six thresholds used to stand
 * where that price belonged — `spending.goldSpendAbove`, `goldReserve`,
 * `faithSpendAbove`, `faithReserve`, `religion.pantheonSpendAbove`,
 * `prophetSpendAbove` — and each of them was a policy wearing a constant: an
 * empire with nine hundred coins and three unbuilt towns sat on them because a
 * number in a file said 150, not because holding was worth more than buying.
 *
 * This module writes the price down instead. A **want** is one thing this empire
 * would spend a bank on, carrying what it costs, what it is worth, how long
 * until it pays, and the arithmetic that made the worth. A **book** is every
 * want in both banks. And a **shadow price** is the one number the book yields
 * back to the rest of the bot: what a coin, or a point of faith, is worth to
 * this empire *today*.
 *
 * Three rules hold it together, and they are `value.ts`' three said again:
 *
 *   · **Every worth is the fold of its printed terms.** Nothing here computes a
 *     number and describes it afterwards; a want's `worth` is `appraise`'s
 *     total over the very list the spectate feed prints. A description written
 *     beside arithmetic drifts from it.
 *   · **It never restates a rule.** What is for sale, at what price, in which
 *     bank, in which town is `purchaseError` and `explainPurchaseCost` — the
 *     simulation's own single gate, exactly as `goldPurchase` always asked it.
 *     What a building would pay is `foldCity` asked hypothetically. This file
 *     only ever *weights* an answer somebody else computed.
 *   · **It stores nothing.** The book is built from `GameState` every time it is
 *     asked; there is no plan, no incumbent and no memory, which is principle 3
 *     of the spec and the reason replays are untouched.
 *
 * **The price formula, as implemented.**
 *
 *     perCoin(want) = want.worth ÷ max(1, want.price)
 *     best(c)       = max over c's wants of perCoin × score.lumpTurns
 *     prior(c)      = weights[c] at this age × (c is gold ? goldPressure : 1)
 *     price(c)      = clamp(best(c), prior × priceBandLow, prior × priceBandHigh)
 *
 * The `lumpTurns` multiplication is the one step the spec's line does not spell,
 * and it is the exchange rate `explainLump` already uses in the other direction:
 * a want's worth is a *stock* and a weight is a *rate*, so "points per coin"
 * becomes "points per coin a turn" by the same twenty turns that turn a great
 * person's purse into an income. Without it the two sides of the comparison
 * would be an order of magnitude apart and the band would swallow the book.
 *
 * The band is the damping. The weight table stops being the live value of gold
 * and faith and becomes the **prior**: the board may argue with the designer by
 * a factor of `priceBandHigh`, and no further. Two ends of it are pinned as
 * tests — a live founder want over a thin faith rate rides the ceiling, and an
 * empire with nothing left to buy sits on the floor.
 *
 * **What the personas do with it.** The zealot used to buy its gods with two
 * lowered thresholds (`spending.faithSpendAbove: 20`, `religion.prophetSpendAbove:
 * 5`). Both are gone, and its intent is carried by the two numbers it already
 * had: `weights.faith` at roughly double the balanced sheet, which doubles the
 * whole band its faith price moves in, and `religion.prophetTechValue` at 950,
 * which is what the first god and the first religion are worth in its book. A
 * zealot's faith is dear because its wants are dear, which is the sentence the
 * thresholds were approximating.
 *
 * **Deferred, deliberately** (batch 2/3, per the brief):
 *
 *   · **Gold's bridge role.** A university bought today compresses the tech
 *     chain's delay, and that is a want the purchasing plan should carry. It
 *     needs the chain — the goal's remaining beakers over the science rate plus
 *     the realisation build-times — which is batch 3's template, and wiring half
 *     of it here would mean writing `explainTechGifts` twice. Batch 1 ships the
 *     purchasing plan and the faith plan alone.
 *   · ~~**What an augur's rites are worth.**~~ **Closed by batch H12.** A rite is
 *     a town's verb now, not a piece's charge, and it is priced as one: the
 *     blessing's effects over the turns it runs, through the same evaluator a
 *     card goes through, for one town (`ritePlan`). The whole faith side went
 *     with it — a prophet is the best act it has in it, an apostle is the relic
 *     it would leave, and a rite the bank cannot pay yet stays in the book so
 *     that faith has something to be held for.
 *   · **"Legal but for the price."** The simulation has one gate and it asks
 *     about the bank last, so a want beyond the purse comes back as a refusal
 *     rather than as a price — see `outOfReachFor`, and `riteOutOfReach` beside
 *     it for the same sentence one verb over.
 *
 * **Batch 4 adds the constraints** (`meterPrices`, at the foot of the file), and
 * they are priced by the same formula around a different reading: what is short
 * of authority or of happiness is not a row in a book but a *chain*, and the
 * quotient that stands in for "worth per coin" is the expansion chain's payoff
 * over the points founding would over-spend. Everything else — the band, the
 * prior, the clamp, the printed note — is the shape above, said once more.
 */

import { type Appraisal, type ValueTerm, appraise, foldTerms, nest } from './decision';
import { type ExpansionChain, chainCompression, chainStepFor, raceTerm } from './chain';
import {
  type PricedMeter,
  type ValueContext,
  VOICES,
  delayTerm,
  explainBuildingRow,
  explainEffects,
  explainForecastCount,
  explainLump,
  explainUpkeepCost,
  explainYields,
  bagOfTileYield,
  newResourceTerms,
  yieldDelta,
  yieldWeight,
} from './value';

import { BUILDING_IDS, type BuildingId, buildingDef } from '../sim/buildingData';
import {
  bestExpansionTile,
  borderGrowth,
  purchasableTiles,
  yieldScore,
} from '../sim/cities';
import {
  cityContext,
  explainTileYield,
  foldTileLines,
} from '../sim/yields/hex';
import {
  explainCity,
  foldCity,
} from '../sim/yields/town';
// The town's and the empire's published readings, remembered on
// `state.revision` — the bot subscribes to the same source of truth the panel,
// the top bar and the Ledger do (batch E2). See `readings.ts`.
import { readCity, readEmpirePercents } from '../sim/readings';
import { type ImprovementId, improvementYield, workForFamily } from '../sim/improvementData';
import { getTileAt, tileHex, wrappedDistance } from '../sim/map';
import type { TileYield } from '../sim/terrainData';
import {
  type PurchasableItem,
  bankOf,
  explainPurchaseCost,
  purchasableName,
  purchaseError,
} from '../sim/purchase';
import {
  LIVE_RITE_IDS,
  RELIGION,
  type RiteId,
  beliefDef,
  poolBeliefs,
  riteAbility,
  riteDef,
} from '../sim/religionData';
import {
  beliefPool,
  hasOpenBeliefSlot,
  nextBeliefPool,
  nextFaithRungCost,
  religionBeliefPool,
  riteCostFor,
  riteError,
} from '../sim/religion';
import { RULES } from '../sim/rulesData';
import type { City, GameState, Player } from '../sim/state';
import { isExploredBy } from '../sim/visibility';
import {
  anyCardDef,
  livePool,
  nextDraftCost,
  offerSize,
  orderDrawWeight,
} from '../sim/statecraft';
import { SLOT_TYPES, type OrderId, orderDef } from '../sim/statecraftData';
import { hasAbility } from '../sim/tech';
import { techDef } from '../sim/techData';
import { UNIT_TYPE_IDS, type UnitTypeId, unitDef } from '../sim/unitData';
import { buildingUpkeep } from '../sim/upkeep';
import { round } from './decision';
import { foundedReligionOf, hasFoundedReligion } from './ground';

/**
 * The two **banks** the book prices. The two *constraints* — authority and
 * happiness — are priced by `meterPrices` at the foot of this file rather than
 * by a want book, and the difference is not an omission: a bank is a stock that
 * arrives at a rate and is spent on rows the simulation will sell you, so it has
 * a book; a meter is a capacity nothing accrues, so what prices it is the one
 * thing in the bot that is short of it. See `meterPrices`.
 */
export type WantCurrency = 'gold' | 'faith' | 'culture';

/**
 * The two banks a **spend arm** can actually spend (`bankSpend`, `bot.ts`).
 *
 * Culture is a priced currency and not a bank: nothing in the game sells
 * anything for it. It fills a meter, the meter deals a hand, and the only
 * decision it ever reaches is *which card*. So its book is one row long, it
 * carries no `buy`, and the arms that dispatch a purchase take this narrower
 * type rather than testing for it.
 */
export type BankCurrency = 'gold' | 'faith';

/**
 * One thing this empire would spend a bank on, priced.
 *
 * `worth` is the fold of `terms` and never anything else; `price` is the
 * simulation's own (`explainPurchaseCost`), or the coins a hold row is holding.
 * The ranking everything downstream does is `worth ÷ price` — worth per coin —
 * which is why the price is not folded into the worth: a cheap small thing and
 * a dear large one have to stay comparable.
 */
export interface Want {
  /** Plain words: "Granary at Uruk", "hold toward Prophet at Lagash". */
  label: string;
  currency: WantCurrency;
  /** What the bank would pay for it, today, in that bank's own coin. */
  price: number;
  /** The fold of `terms`. */
  worth: number;
  /** Turns until it starts paying. Zero for a purchase — delivery is instant. */
  delay: number;
  terms: ValueTerm[];
  /**
   * The purchase the spend arm can execute *this turn*, when the rules allow
   * one. Absent on a want the purse cannot reach and on every hold row — those
   * are opinions about coins, not commands.
   */
  buy?: { cityId: number; item: PurchasableItem };
  /**
   * **The hex the spend arm could buy this turn** — the tile want's `buy`
   * (batch 8). A second field rather than a union on the one above, because a
   * tile is bought by a different verb (`purchaseTile`) held to a different gate
   * (`tilePurchaseError`), and a shape that hid two commands behind one key
   * would be the spend arm branching on the absence of a field.
   */
  ground?: { cityId: number; col: number; row: number };
  /**
   * **The rite this town could perform this turn** — the rites' want since they
   * became city verbs (2026-09-06, `docs/history/fewer-things.md` §3).
   *
   * A third field beside `buy` and `ground` for `ground`'s stated reason: a rite
   * is a different verb (`performRite`) held to a different gate (`riteError`),
   * and a shape that hid three commands behind one key would be the spend arm
   * branching on the absence of a field. It is priced in faith like a purchase
   * and ranked against every other faith row by worth per coin, which is exactly
   * what the ruling asks — a rite is now a thing the bank buys.
   */
  rite?: { cityId: number; rite: RiteId };
  /** True when the bank cannot pay the price today. Saving rows come of these. */
  outOfReach: boolean;
  /**
   * What a **hold row** is keeping coins back for: the standing wage bill, or a
   * want the purse has still to reach. Absent on a purchase.
   *
   * A hold row is how "spend nothing below 150" stopped being a knob: the spend
   * arm buys the best want whose worth per coin beats the best hold row's, and
   * an empire whose wages are dear or whose next want is close simply holds.
   */
  holding?: 'wages' | 'saving';
}

/** Every want this empire has, by bank. Iterated as arrays, in build order. */
export interface WantBook {
  gold: Want[];
  faith: Want[];
  /**
   * **The draft plan** (batch 6) — one row, the next hand this empire's culture
   * would deal it, or none at all when there is nothing left in its pool to
   * deal. It is the whole of what culture buys, which is why it is a plan of
   * one and not a book.
   */
  culture: Want[];
}

/** An empire that has not been asked yet — the shape `valueContext` starts from. */
export const NO_WANTS: WantBook = { gold: [], faith: [], culture: [] };

/**
 * The readings the book needs that are facts about the *empire* rather than
 * about a row — hoisted by the caller, `valueContext`'s own bargain, because
 * every one of them prices the whole realm through the simulation's books and
 * asking per want would be forty empire sweeps to choose one purchase.
 */
export interface WantInputs {
  /** `solvency.reserveTurnsOfUpkeep × the standing bill` — the wage cover. */
  wageReserve: number;
  /** Net gold a turn, as the simulation's own books read it. */
  goldRate: number;
  /** Faith a turn, likewise. */
  faithRate: number;
  /**
   * What a soldier of this type is worth standing in this town, or `null` when
   * the empire does not want one — `bot.ts`' own reading, handed in rather than
   * imported so this module stays the leaf `value.ts` and `bot.ts` both stand
   * on (`roads.ts`' bargain one system over).
   */
  soldierWorth: (city: City, id: UnitTypeId) => Appraisal | null;
  /** Culture a turn, as the simulation's own books read it. The draft's clock. */
  cultureRate: number;
  /**
   * What one Order card is worth to this empire — `explainCard`'s appraisal,
   * handed in for `soldierWorth`'s reason exactly: the reading belongs to the
   * policy, and this module is the leaf `value.ts` and `bot.ts` both stand on.
   */
  cardWorth: (id: OrderId) => Appraisal;
}

/** Worth per coin — the one ranking. A price of nought cannot divide. */
export function worthPerCoin(want: Want): number {
  return want.worth / Math.max(1, want.price);
}

/** Both plans, in one book. */
export function wantBook(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  inputs: WantInputs,
): WantBook {
  return {
    gold: purchasingPlan(state, player, ctx, inputs),
    faith: faithPlan(state, player, ctx, inputs),
    culture: draftPlan(state, player, ctx, inputs),
  };
}

// --- the purchasing plan ----------------------------------------------------

/**
 * **What this empire would do with a coin** — every purchasable row in every
 * town, the standing wage reserve, and a hold row for every want the purse has
 * still to reach.
 *
 * The walk is `goldPurchase`'s own, row-outer and town-inner, so ties break
 * where they always broke: `BUILDING_IDS` order, then founding order. What it
 * no longer does is stop at the first town that can take delivery — a book has
 * to hold all of them, because a granary is worth a different number in a town
 * of six than in a town of two and the ranking is over the numbers.
 *
 * A row's worth is exactly the queue's (`buildCandidates`): what the town would
 * *actually* make with it (`foldCity` asked hypothetically, staged and
 * percentaged by the real arithmetic), plus what the row gives beyond a yield,
 * less its standing maintenance. What a purchase does not carry is the queue's
 * `÷ turns of build effort`: delivery is instant, which is the whole of what a
 * purse is for, and `delay` says so by being zero.
 */
export function purchasingPlan(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  inputs: WantInputs,
): Want[] {
  const wants: Want[] = [];
  const towns = ownedCities(state, player.id);
  // The empire's half of every town's percentages, taken **once** for the whole
  // sweep — `readEmpirePercents` since batch E2, which is that bargain kept for
  // every reader at once rather than re-hoisted here; the standing readings come
  // through `readCity` and only the what-ifs still quote by hand.
  const empire = readEmpirePercents(state, player.id);
  const bases = towns.map((city) => foldCity(state, city, [], null, readCity(state, city)));

  for (const id of BUILDING_IDS) {
    const upkeep = buildingUpkeep(id);
    // **No income floor here either** (batch 7). The row below subtracts
    // `explainUpkeepCost` at gold's shadow price, and a want whose wage outweighs
    // what it makes simply ranks under the hold row the book already carries —
    // which is the whole shape of batch 1 (a threshold became a comparison) said
    // one last time about `solvency.stopMaintainedBelow`.
    for (let index = 0; index < towns.length; index++) {
      const city = towns[index]!;
      const item: PurchasableItem = { kind: 'building', id };
      const reach = reachOf(state, player, city, item, 'gold');
      if (reach === null) continue;
      const after = foldCity(state, city, [id], null, explainCity(state, city, [id], empire));
      const delta = yieldDelta(after, bases[index]!);
      const terms: ValueTerm[] = [
        nest('what this town would actually make with it', explainYields(delta, ctx)),
        nest('what its row gives beyond a yield', explainBuildingRow(id, ctx)),
        nest('its standing maintenance', explainUpkeepCost(upkeep, ctx), 'sub'),
      ];
      const bridge = bridgeTerm(ctx, city, id);
      if (bridge !== null) terms.push(bridge);
      // **The purse in the bead race** (batch 5): a row that pays a bead bought
      // is a bead earned this turn rather than in a dozen, and it carries the
      // race's own share through the same door the queue and the beeline use.
      const race = raceTerm(ctx, { kind: 'building', id });
      if (race !== null) terms.push(race);
      wants.push(want(`${buildingDef(id).name} at ${city.name}`, 'gold', reach, city, item, terms));
    }
  }

  // **A town with nobody standing in it**, which is the one thing the old arm
  // broke its building order for and is now simply a want with a large number
  // on it. `soldierWorth` answers `null` everywhere else, so a quiet empire
  // enumerates no soldiers at all and the walk stays cheap.
  for (const id of UNIT_TYPE_IDS) {
    for (const city of towns) {
      const worth = inputs.soldierWorth(city, id);
      if (worth === null) continue;
      const item: PurchasableItem = { kind: 'unit', id };
      const reach = reachOf(state, player, city, item, 'gold');
      if (reach === null) continue;
      wants.push(
        want(`${unitDef(id).name} at ${city.name}`, 'gold', reach, city, item, [
          nest('what this piece is worth to this town', worth),
        ]),
      );
    }
  }

  // **The ground at the frontier** (batch 8): every hex a town of this empire
  // could buy today, priced by the sim's own ladder and appraised by what it
  // would pay the town that bought it. See `tileWants`.
  for (const city of towns) wants.push(...tileWants(state, ctx, city));

  const reserve = wageReserveRow(ctx, inputs.wageReserve);
  if (reserve !== null) wants.push(reserve);
  for (const row of savingRows(wants, ctx, bankOf(player, 'gold'), inputs.goldRate)) wants.push(row);
  return wants;
}

/**
 * **The hexes a town could buy, as wants** — batch 8 of
 * `docs/bot-priorities.md`, and the game's first gold sink joins the book.
 *
 * `purchasableTiles` (`cities.ts`) is the one enumeration: every unowned hex in
 * a town's work radius that touches this empire, priced by the ladder and
 * carrying the reason it cannot be had when it cannot. Only the offers with no
 * reason at all become wants — a hex the writ has frozen, a hex the purse cannot
 * reach and a **puppet's** whole ring are refusals of the simulation's own, and
 * a want the rules would strike is a want the spend arm must not carry.
 *
 * What a hex is worth has two halves and they are different kinds of thing:
 *
 *   · **the ground it would work.** A citizen only moves to a bought hex if the
 *     hex beats the poorest one the town works today, so that is what is
 *     charged: the *delta* over that hex, at the town's own prices, through the
 *     simulation's own citizen scorer (`yieldScore`, the very ordering
 *     `assignCitizens` will use). A hex nobody would move to pays nothing today
 *     and says so — which is the honest reading of a fourth-ring tundra beside a
 *     town of three;
 *   · **the seam it owns.** A luxury or a strategic kind this empire has no copy
 *     of anywhere on its ground is worth `site.newLuxuryBonus` /
 *     `newStrategicBonus` — the site scorer's own numbers, through the site
 *     scorer's own door (`newResourceTerms`), off the **one** uniqueness reading
 *     (`ValueContext.realm`). That is the ruling's whole point: the two arms
 *     cannot disagree about which silk is the first silk, and neither of them
 *     asks whether the seam is *worked* — a copy owned and unimproved is a copy.
 *
 * The stated crudeness: the delta is not re-asked of the whole town
 * (`assignCitizens` may shuffle three citizens rather than one), and the seam's
 * *signature* is not priced at all — a luxury's effect list is
 * `resourceEffects.ts`' to read and cannot be asked hypothetically, which is the
 * same note the great person's work carries.
 */
function tileWants(state: GameState, ctx: ValueContext, city: City): Want[] {
  if (city.puppet === true) return [];
  const wants: Want[] = [];
  // **The town's own reading, hoisted** (batch 9): a context is a fact about the
  // town — its shelves, its rites, its scoped cards, the faith it follows — and
  // it was being rebuilt for every worked hex and again for every hex on offer.
  // One reading, spent by both loops below.
  const here = cityContext(state, city);
  // The poorest hex the town works today, hoisted per town: what a citizen
  // moving to bought ground would give up.
  let poorest: { score: number; yields: TileYield } | null = null;
  for (const at of city.workedTiles) {
    const tile = getTileAt(state.map, at.col, at.row);
    if (!tile) continue;
    const yields = foldTileLines(explainTileYield(tile, here));
    const score = yieldScore(yields);
    if (poorest === null || score < poorest.score) poorest = { score, yields };
  }
  // **The one hex a coin buys nothing but time on** — the hex this town's own
  // culture is about to claim for nothing (`bestExpansionTile`, the simulation's
  // own chooser). Buying *that* one gains its yield for the turns until the
  // claim and not a turn more, so it is charged the share of the horizon those
  // turns are; buying any other hex leaves the town permanently one hex ahead of
  // where its borders would have put it, and is charged nothing.
  //
  // The distinction is the whole of the honest reading: culture claims hexes in
  // its own preference order, so a coin spent on the hex at the head of that
  // order is a coin spent on *sooner*, and a coin spent anywhere else is a coin
  // spent on *more*.
  const horizon = Math.max(1, ctx.ai.priorities.horizonTurns);
  const wait = borderGrowth(state, city).turns;
  const next = bestExpansionTile(state, city);
  const soonShare = wait === null ? 1 : Math.min(1, wait / horizon);
  for (const offer of purchasableTiles(state, city)) {
    if (offer.error !== null) continue;
    const tile = getTileAt(state.map, offer.col, offer.row);
    if (!tile) continue;
    const yields = foldTileLines(explainTileYield(tile, here));
    const terms: ValueTerm[] = [];
    const beats = poorest === null || yieldScore(yields) > poorest.score;
    if (beats) {
      const bag = bagOfTileYield(yields);
      if (poorest !== null) {
        const worst = bagOfTileYield(poorest.yields);
        for (const voice of VOICES) {
          const had = worst[voice];
          if (had !== undefined) bag[voice] = (bag[voice] ?? 0) - had;
        }
      }
      terms.push(
        nest(
          poorest === null
            ? `what (${offer.col},${offer.row}) would pay ${city.name}`
            : `what (${offer.col},${offer.row}) pays over the poorest hex ${city.name} works today`,
          explainYields(bag, ctx),
        ),
      );
    } else {
      terms.push({
        label: `no citizen of ${city.name} would move to (${offer.col},${offer.row}) today`,
        value: 0,
      });
    }
    terms.push(...newResourceTerms(ctx.realm, ctx.ai, tile.resource, 'on the hex'));
    const owed = next !== null && next.col === offer.col && next.row === offer.row;
    const share = owed ? soonShare : 1;
    const claim: ValueTerm = {
      label: owed
        ? `× ${Math.round(share * 100) / 100} — ${city.name}'s borders would claim this very hex in ` +
          `${String(wait)} turns anyway, against a ${horizon}-turn horizon`
        : `× 1 — its borders are pointed elsewhere, so this hex is one more rather than one sooner`,
      value: share,
      op: 'mul',
    };
    const folded = appraise([nest(`the hex at (${offer.col},${offer.row})`, appraise(terms)), claim]);
    if (folded.total <= 0) continue;
    wants.push({
      label: `the hex at (${offer.col},${offer.row}) for ${city.name}`,
      currency: 'gold',
      price: offer.price,
      worth: folded.total,
      delay: 0,
      terms: folded.terms,
      outOfReach: false,
      ground: { cityId: city.id, col: offer.col, row: offer.row },
    });
  }
  return wants;
}

/**
 * **Gold's bridge role, as a term on the row it bridges** — the batch-1 deferral,
 * closed in batch 3 (`docs/bot-priorities.md`).
 *
 * A university delivered by the purse is a university nobody has to spend a
 * dozen turns raising, so every step of the chain from that one onward starts
 * paying that much sooner. `chainCompression` is that difference, read off the
 * chain object the context already carries rather than recomputed, and it prints
 * the turns it bought.
 *
 * **A term rather than a second row**, which is the one place this departs from
 * the spec's wording and does so deliberately: the purchasing plan already walks
 * every building in every town, so a chain step for sale is *already* a row here.
 * A second row naming the same coins in the same town would be the same purchase
 * ranked twice, and `shadowPrices` takes a **maximum over the rows** — a
 * duplicate would quietly raise the price of gold on the strength of a want the
 * empire has only one of.
 *
 * A town that already holds the row is skipped: it is not a town the step is owed
 * by, and buying it there is not a thing the rules allow anyway.
 */
function bridgeTerm(ctx: ValueContext, city: City, id: BuildingId): ValueTerm | null {
  if (city.buildings.includes(id)) return null;
  const found = chainStepFor(ctx.chains, 'building', id);
  if (found === null) return null;
  const compression = chainCompression(found.chain, found.step, ctx);
  if (compression.terms.length === 0) return null;
  return nest(
    `it buys the ${techDef(found.chain.goal).name} engine the turns this town would have spent raising it`,
    compression,
  );
}

/**
 * **The wages, as a want** — the one survivor of the old spending knobs
 * (`solvency.reserveTurnsOfUpkeep`), and it is a want rather than a floor
 * because that is what it always was.
 *
 * Its worth is what the coins it covers are worth *as a lump*, which puts its
 * worth per coin at exactly the prior: holding a coin is worth what the table
 * says a coin is worth, no more and no less. Everything the book can buy is
 * measured against that line, so an empire buys when a purchase beats holding
 * and holds when it does not — which is the sentence `goldSpendAbove` was
 * spelling with a constant.
 *
 * It also anchors the **floor of gold's price** in any empire that owes
 * anything at all, which is why an empire with nothing to buy still does not
 * price a coin at nothing.
 */
function wageReserveRow(ctx: ValueContext, reserve: number): Want | null {
  if (reserve <= 0) return null;
  const terms: ValueTerm[] = [
    nest('what the wages these coins cover are worth', explainLump({ gold: reserve }, ctx)),
  ];
  return {
    label: `${Math.round(reserve)} gold held against the standing bill`,
    currency: 'gold',
    price: reserve,
    worth: foldTerms(terms),
    delay: 0,
    terms,
    outOfReach: false,
    holding: 'wages',
  };
}

// --- the faith plan ---------------------------------------------------------

/**
 * **What this empire would do with a point of faith** — the god it has not
 * consecrated, the religion it has not founded, and whatever else the faith
 * bank is priced in, town by town.
 *
 * The appetite that used to be an *order* (`faithAppetiteOrder`, ranks 0/1/2
 * over two lowered thresholds) is now a *worth*, and the ranking falls out of
 * the arithmetic: the ladder's first rung carries `religion.prophetTechValue`
 * for forty faith and a prophet that would found a religion carries what the
 * founding would pay — floored at that same appetite — for a hundred and twenty,
 * so the god sorts above the faith exactly while there is no god, which is the
 * order the ladder used to hand-write.
 *
 * The restraint the ladder also carried — *take the god first and save for the
 * prophet* — is the saving row's job and is better for it: an empire whose faith
 * rate can reach the prophet inside the horizon holds for it, and one whose rate
 * cannot is no longer told to bank faith for eighty turns against a price it
 * will never see. **What the ladder is about to spend is taken off that saving**
 * (batch H12, ruling i): a rung is charged at the deal, by the phase, with no
 * decision asked of anybody.
 *
 * A row this empire already has one of is left out of the book entirely: a
 * second prophet standing beside an idle first is faith that bought nothing.
 */
export function faithPlan(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  inputs: WantInputs,
): Want[] {
  const wants: Want[] = [];
  const towns = ownedCities(state, player.id);
  const noPantheon = player.pantheon.beliefs.length === 0;
  const unfounded = !hasFoundedReligion(state, player.id);
  // **How far off the god is**, for the one row whose wait is another row (see
  // `faithRowTerms`). Asked once for the whole plan rather than per town.
  const godTurns = noPantheon ? turnsToFirstGod(state, player, inputs.faithRate, ctx) : 0;

  for (const id of UNIT_TYPE_IDS) {
    const def = unitDef(id);
    // A **withdrawn** row is out of the book entirely: the augur's own bank
    // refuses it (`purchaseError`), and a want the purse can never reach would
    // be a saving row banking faith for ever against a price nobody sells.
    if (def.retired === true) continue;
    if (ownsAny(state, player.id, id)) continue;
    for (const city of towns) {
      const item: PurchasableItem = { kind: 'unit', id };
      // A row the faith bank does not price at all answers `null` here before
      // any gate is asked, which is what keeps this loop cheap: the treasury's
      // rows fall out on the first question.
      if (explainPurchaseCost(state, player.id, city.id, item, 'faith') === null) continue;
      const reach = reachOf(state, player, city, item, 'faith');
      if (reach === null) continue;
      wants.push(
        want(
          `${def.name} at ${city.name}`,
          'faith',
          reach,
          city,
          item,
          faithRowTerms(state, player, ctx, reach.price, {
            prophet: def.prophesies === true,
            apostle: def.proclaims === true,
            founder: def.prophesies === true && unfounded,
            towns: towns.length,
            noPantheon,
            godTurns,
          }),
        ),
      );
    }
  }

  // **The faith bank a building opens** (the Almshouse's civilians, the
  // Reliquary's rows). `explainPurchaseCost` answers `null` unless the town's
  // stones open the bank, so the whole clause is the sim's own and this loop
  // costs one question per row in an empire that has neither.
  for (const id of BUILDING_IDS) {
    const upkeep = buildingUpkeep(id);
    for (const city of towns) {
      const item: PurchasableItem = { kind: 'building', id };
      if (explainPurchaseCost(state, player.id, city.id, item, 'faith') === null) continue;
      const reach = reachOf(state, player, city, item, 'faith');
      if (reach === null) continue;
      wants.push(
        want(`${buildingDef(id).name} at ${city.name}`, 'faith', reach, city, item, [
          nest('what its row gives beyond a yield', explainBuildingRow(id, ctx)),
          nest('its standing maintenance', explainUpkeepCost(upkeep, ctx), 'sub'),
        ]),
      );
    }
  }

  // **The faith ladder** (schema 71): the consecration nobody has to walk to.
  const ladder = ladderPlan(state, player, ctx, inputs);
  for (const row of ladder) wants.push(row);
  // **The rites** (schema 72): a town's verb, bought out of this same bank and
  // ranked against everything else in it by worth per coin.
  for (const row of ritePlan(state, player, ctx)) wants.push(row);

  // **The ladder spends at the deal** (ruling i, schema 80), so the faith it is
  // about to take is not faith anything else may save — batch H12. An empire one
  // rung short of a consecration will have the rung taken out of its bank by the
  // `religion` phase the instant it covers it, with no decision asked of anybody;
  // a saving row that counted that faith toward a prophet would be forecasting a
  // bank the simulation has already spoken for, and the empire would then hold
  // for a price it never reaches. Nought while a hand is pending: the rung it
  // carries was paid when it was dealt, and the pool this reads is already the
  // charged one.
  const claim = ladderClaim(player, ladder);
  const spare = Math.max(0, bankOf(player, 'faith') - claim);
  for (const row of savingRows(wants, ctx, spare, inputs.faithRate)) {
    wants.push(row);
  }
  return wants;
}

/**
 * **What the ladder is about to take out of this bank** — the next rung's price
 * while a rung is open, nought otherwise.
 *
 * Read off the ladder plan's own row rather than re-asked, so the number the
 * saving rows discount by and the number the book prices the rung at cannot
 * disagree; a plan with no row is an empire the ladder cannot deal to at all
 * (`ladderPlan`'s own three refusals), and nothing is owed.
 */
function ladderClaim(player: Player, ladder: readonly Want[]): number {
  if (player.pantheon.pending !== undefined) return 0;
  let owed = 0;
  for (const row of ladder) owed = Math.max(owed, row.price);
  return owed;
}

/**
 * **What the next rung of the faith ladder is worth** — `draftPlan`'s shape one
 * currency over (schema 71, `docs/history/fewer-things.md` §3).
 *
 * A rung is not a purchase: nothing is bought, the offer opens on its own when
 * the bank crosses the threshold and the pick takes the faith. But that is
 * exactly what a *draft* is on the other ladder, and `draftPlan` already prices
 * one — so this is the same three lines: what the hand would deal, over the
 * pool it is dealt from, discounted by how long the bank still has to fill.
 *
 * Two crudenesses, both written down rather than hidden:
 *
 *   · **the best god in the pool, not the best of the hand.** `expectedBestOrder`
 *     does the distribution properly for Orders and is typed to them; the belief
 *     bag is small and every god in it is permanent, so the ceiling is a fair
 *     stand-in and it errs high by exactly the width of a three-card hand.
 *   · **the first god's appetite is now here** (schema 74). It was the augur's
 *     row until the augur was withdrawn, and the ladder is the only way to a
 *     first god; counting it in both places would have the bot value faith twice for
 *     one god.
 *
 * Empty for an empire the ladder cannot deal to at all — no open slot, an offer
 * already outstanding, an empty bag — which is `planFaithRung`'s own answer,
 * asked with the bank set aside so a rung that is merely unaffordable still
 * prints (that is the whole point of a want: it is what the faith is *for*).
 */
function ladderPlan(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  inputs: WantInputs,
): Want[] {
  if (player.pantheon.pending !== undefined) return [];
  if (!hasOpenBeliefSlot(state, player.id)) return [];
  const pool = beliefPool(state, player);
  if (pool.length === 0) return [];

  const cost = nextFaithRungCost(player);
  let best: Appraisal | null = null;
  for (const id of pool) {
    const folded = explainEffects(beliefDef(id).effects ?? [], ctx);
    if (best === null || folded.total > best.total) best = folded;
  }
  if (best === null) return [];

  const bank = bankOf(player, 'faith');
  const delay = Math.max(0, cost - bank) / Math.max(1, inputs.faithRate);
  const terms: ValueTerm[] = [
    nest(
      `the best of the ${pool.length} god${pool.length === 1 ? '' : 's'} still unconsecrated`,
      best,
    ),
  ];
  // **The first god's appetite, moved here** (schema 74, the C1 debt closed).
  // The augur's row carried `religion.prophetTechValue` for "this empire holds
  // no belief at all" and the augur is withdrawn; the ladder is the only way to
  // a first god now, so the appetite is the ladder's. Counted once, on the first
  // rung only, exactly as it was counted once on the augur.
  if (player.pantheon.beliefs.length === 0) {
    terms.push({
      label: 'the first god — this empire holds no belief at all',
      value: ctx.ai.religion.prophetTechValue,
    });
  }
  terms.push(delayTerm(delay, ctx, 'the faith has still to fill'));
  const folded = appraise(terms);
  return [
    {
      label: `the next consecration (rung ${player.pantheon.rungs + 1})`,
      currency: 'faith',
      price: cost,
      worth: folded.total,
      delay,
      terms: folded.terms,
      outOfReach: bank < cost,
    },
  ];
}

/**
 * What a faith row is worth, by the markers on it — never by its name, which is
 * the discipline `src/sim/` keeps and a reader of the same tables has no
 * business breaking.
 *
 * **Batch H12 gave the two clergy rows a reading of their own.** They used to
 * meet one constant apiece: a prophet was `religion.prophetTechValue` and an
 * apostle was worth the faith it cost, which is the same sentence as *"this bot
 * cannot see what either of them does"*. What they do is now priced through the
 * evaluators everything else in the book goes through:
 *
 *   · **a prophet is the best of the acts it could perform** (`prophetTerms`) —
 *     founding a faith, drawing another rung of one already founded, or saying a
 *     rite over the whole realm. A prophet is spent *whole* on one act
 *     (`spendProphet`), so its worth is the best of them and not their sum;
 *   · **an apostle is the relic it would leave** (`explainRelic`), which is a
 *     shelf paying a stated trickle in a town that has topped out a cathedral.
 *     Its other two charges stay stand-ins and say so;
 *   · **everything else** is worth exactly the faith it costs, which puts it
 *     level with holding — the inquisitor's purge is the one row left there, and
 *     a purge is a negative lump on somebody else's tide, which this bot has no
 *     reading of in this currency.
 *
 * The **appetite is a floor now, not the price** (see `prophetTerms`). And the
 * `firstGod` clause is gone with the augur: no row consecrates any more, the
 * ladder is the only way to a first god, and its appetite is `ladderPlan`'s.
 */
function faithRowTerms(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  price: number,
  row: {
    prophet: boolean;
    apostle: boolean;
    founder: boolean;
    towns: number;
    noPantheon: boolean;
    godTurns: number;
  },
): ValueTerm[] {
  if (row.prophet) return prophetTerms(state, player, ctx, row);
  if (row.apostle) {
    const relic = explainRelic(state, player, ctx);
    if (relic !== null) {
      return [
        nest(`the relic it would leave at ${relic.town}`, relic.worth),
        {
          label: 'its other two charges — a proclamation and a healing — are unpriced stand-ins',
          value: ctx.ai.score.unknownEffect,
        },
      ];
    }
  }
  return [
    nest('worth at least the faith it costs — nothing it does is priced', explainLump({ faith: price }, ctx)),
  ];
}

/**
 * **What a prophet is worth: the best single thing it could do** — batch H12.
 *
 * A prophet carries two charges and every act worth having spends the whole
 * piece (`spendProphet`, `docs/religion-v2.md`), so the honest price of one is
 * the best of its acts rather than the sum of them:
 *
 *   · **found the faith** (`explainFounding`) — the stones, the rungs the
 *     founding deals, the founder's trickle over the towns the tide would reach;
 *   · **deepen it** (`explainNextRung`) — one more follower or enhancer belief,
 *     priced by the evaluator a belief is always priced by;
 *   · **say a rite over every town** (`explainEmpireRite`) — the fourth act, and
 *     the one that was already priced before this batch.
 *
 * **The appetite is the floor, not the price.** `religion.prophetTechValue` is
 * what this empire *says* a first faith is worth — it is the same number the
 * beeline leans on to open the door at all (`chain.ts`, `ValueContext.faithAppetite`)
 * — and the board's own reading of a founding is a rate of a dozen or two points
 * a turn against it. Adding the two would pay twice for one religion; replacing
 * the appetite with the reading would quietly withdraw the design addendum the
 * knob *is*, and the zealot's sheet with it. So the reading stands where it
 * beats the appetite and the appetite stands where it does not, printed as the
 * difference so a reader of the feed can see which one is talking.
 */
function prophetTerms(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  row: { founder: boolean; towns: number; noPantheon: boolean; godTurns: number },
): ValueTerm[] {
  const acts: { label: string; worth: Appraisal }[] = [];
  if (row.founder) {
    acts.push({ label: 'the faith it would found', worth: explainFounding(state, player, ctx) });
  } else {
    const rung = explainNextRung(state, player, ctx);
    if (rung !== null) acts.push({ label: `another rung of ${rung.faith}`, worth: rung.worth });
  }
  const rites = explainEmpireRite(state, ctx, row.towns);
  if (rites.terms.length > 0) acts.push({ label: 'a rite said over every town', worth: rites });

  let best: { label: string; worth: Appraisal } | null = null;
  for (const act of acts) {
    if (best === null || act.worth.total > best.worth.total) best = act;
  }

  const terms: ValueTerm[] =
    best === null
      ? []
      : [nest(`the best act this prophet has in it — ${best.label}`, best.worth)];
  if (!row.founder) return terms;

  // **The appetite, as the floor under a founding.** Printed as what it adds
  // rather than folded away, so the feed says whether the board or the sheet is
  // deciding — and nothing is added at all once the board reads higher.
  const appetite = ctx.ai.religion.prophetTechValue;
  const read = best === null ? 0 : best.worth.total;
  if (read < appetite) {
    terms.push({
      label:
        'the empire’s stated appetite for a first faith stands above the board’s own reading of it',
      value: appetite - read,
    });
  }
  // A prophet bought before any god is a prophet that cannot found: the ladder
  // has to deal a pantheon first, and how long that takes is `turnsToFirstGod`.
  if (row.noPantheon) terms.push(delayTerm(row.godTurns, ctx, 'the god comes first'));
  return terms;
}

/**
 * **What founding a religion is worth** — the ruling of 2026-09-07 (item bb),
 * priced in four lines and no constants of this file's own.
 *
 *   · **the stones themselves.** A holy site is an improvement like any other and
 *     pays what its row pays (`improvementYield`), read off the improvement
 *     table's own inverse (`workForFamily('prophet')`) rather than by name;
 *   · **the rungs the founding deals.** `plantHolySiteAt` deals a belief hand and
 *     owes a second, both out of the follower bag, and a belief is priced by
 *     `explainEffects` — the evaluator every card in this bot goes through. The
 *     best two of the bag, because two hands cannot deal one belief twice;
 *   · **the founder's trickle.** `RELIGION.founderTrickle` is a pair of ordinary
 *     `pays` count rows and they are read as ordinary rows
 *     (`explainForecastCount`) — the board's own count is nought for an empire
 *     with no faith, so the count handed in is the tide's reach;
 *   · **the tide's reach** is what supplies that count: the foreign towns a holy
 *     site raised here could press on, times `religion.tideShare` — the share of
 *     them this bot expects actually to convert.
 *
 * Two things it deliberately does **not** count, both to avoid paying twice:
 * the empire's own towns converting (a follower belief's city clauses are
 * already priced in every town by `explainEffects`' standing bargain), and the
 * later rungs of the ladder the founding opens (each of those wants a prophet of
 * its own, and that prophet is the row this function is pricing, one purchase
 * later).
 */
function explainFounding(state: GameState, player: Player, ctx: ValueContext): Appraisal {
  const terms: ValueTerm[] = [];
  if (HOLY_SITE !== null) {
    terms.push(
      nest('the stones it raises', explainYields(bagOfTileYield(improvementYield(HOLY_SITE)), ctx)),
    );
  }
  const rungs = foundingRungs(ctx);
  if (rungs.terms.length > 0) terms.push(nest('the rungs the founding deals', rungs));
  const reach = tideReach(state, player, ctx);
  if (reach > 0) {
    terms.push(
      nest(
        'the founder’s trickle',
        explainForecastCount(
          RELIGION.founderTrickle,
          reach,
          'foreign towns inside a holy site’s reach, at this sheet’s share of them',
          ctx,
        ),
      ),
    );
  }
  return appraise(terms);
}

/**
 * The two beliefs the founding's own hands would take — the best two of the
 * follower bag, priced by `explainEffects`.
 *
 * The best *two* rather than twice the best, because the second hand is dealt
 * from a bag the first has been taken out of (`payBeliefDebt`), so a bag whose
 * single best row is enormous does not pay this empire twice for it. The same
 * ceiling `ladderPlan` writes down rides here — the best of a bag rather than
 * the expected best of a hand — and it errs high by the width of a hand.
 */
function foundingRungs(ctx: ValueContext): Appraisal {
  const scored: number[] = [];
  for (const id of poolBeliefs('follower')) {
    scored.push(explainEffects(beliefDef(id).effects ?? [], ctx).total);
  }
  scored.sort((a, b) => b - a);
  const taken = scored.slice(0, FOUNDING_HANDS);
  if (taken.length === 0) return appraise([]);
  return appraise(
    taken.map((value, index) => ({
      label:
        index === 0
          ? 'the best follower belief the founding could take'
          : 'the next best, for the hand the founding owes',
      value,
    })),
  );
}

/**
 * How many belief hands a founding is worth: the one `plantHolySiteAt` deals and
 * the one it owes (`PlayerPantheon.owed`). Two, and it is the simulation's own
 * shape rather than a number this file chose — a third hand would want a third
 * prophet.
 */
const FOUNDING_HANDS = 2;

/**
 * **What one more rung of a faith already founded is worth** — a prophet's other
 * whole-piece act (`gainBelief`), `null` when the ladder has nothing left to
 * deal this empire.
 *
 * The pool is the simulation's own answer (`nextBeliefPool` — followers to three,
 * then enhancers to two, enhancers behind Theology), the bag is the one it would
 * actually draw from, and a belief is priced by `explainEffects`. The stated
 * ceiling is `ladderPlan`'s, said once more: the best of the bag rather than the
 * expected best of a hand.
 */
function explainNextRung(
  state: GameState,
  player: Player,
  ctx: ValueContext,
): { faith: string; worth: Appraisal } | null {
  const religion = foundedReligionOf(state, player.id);
  if (religion === null) return null;
  const pool = nextBeliefPool(religion);
  if (pool === null) return null;
  const bag = religionBeliefPool(religion, pool);
  let best: Appraisal | null = null;
  for (const id of bag) {
    const folded = explainEffects(beliefDef(id).effects ?? [], ctx);
    if (best === null || folded.total > best.total) best = folded;
  }
  if (best === null) return null;
  return {
    faith: religion.name,
    worth: appraise([nest(`the best of the ${bag.length} ${pool} beliefs it could still take`, best)]),
  };
}

/**
 * **The foreign towns a holy site raised in this realm could press on**, times
 * the share of them this sheet expects to convert (`religion.tideShare`).
 *
 * The count is the tide's own geometry asked of the board: `rules.religion`'s
 * `siteRange` around each of this empire's towns — a prophet plants beside one of
 * them — read through **this seat's own fog** (`isExploredBy`), which is batch
 * H2's rule for every reading of the world the bot has not necessarily seen. A
 * neighbour nobody has met presses nobody, as far as this empire can honestly
 * say.
 *
 * Crude in one stated way: a town inside the range is counted whether or not it
 * already follows somebody else's faith, and a rival temple halves what reaches
 * it. That is what `religion.tideShare` is for — the sheet's opinion of how much
 * of the reach becomes a congregation, in one number a tuner can move.
 */
function tideReach(state: GameState, player: Player, ctx: ValueContext): number {
  const range = RULES.religion.siteRange;
  const towns = ownedCities(state, player.id);
  if (towns.length === 0) return 0;
  const seats = towns
    .map((city) => getTileAt(state.map, city.col, city.row))
    .filter((tile): tile is NonNullable<typeof tile> => tile !== undefined)
    .map((tile) => tileHex(tile));
  let reached = 0;
  for (const city of state.cities) {
    if (city.ownerId === player.id) continue;
    if (!isExploredBy(state, player.id, city.col, city.row)) continue;
    const tile = getTileAt(state.map, city.col, city.row);
    if (!tile) continue;
    const where = tileHex(tile);
    for (const seat of seats) {
      if (wrappedDistance(state.map, seat, where) <= range) {
        reached += 1;
        break;
      }
    }
  }
  return reached * Math.max(0, ctx.ai.religion.tideShare);
}

/**
 * **What an apostle's relic would pay, and where** — `null` when no town of this
 * empire could keep one.
 *
 * A relic is a *building* (`BuildingDef.placed`): never built, never bought, left
 * by an act in a town that has topped out a cathedral, one per town. So it is
 * priced exactly as the purchasing plan prices a shelf — the town's own yields
 * asked hypothetically, staged and percentaged by the simulation's arithmetic —
 * and not as a number read off the row, which would miss every percentage the
 * town carries.
 *
 * The gate is `placeRelicError`'s, restated in the only way this file may: the
 * row is `placed`, the town must not already hold one, and there must be a
 * cathedral to keep it in. That last clause is asked of the simulation by asking
 * for the *yield delta* — a town with no cathedral simply is not offered as the
 * seat. The first town that would take one is the one priced, in founding order,
 * because an apostle walks and any of them will do.
 */
function explainRelic(
  state: GameState,
  player: Player,
  ctx: ValueContext,
): { town: string; worth: Appraisal } | null {
  if (RELIC === null) return null;
  const empire = readEmpirePercents(state, player.id);
  for (const city of ownedCities(state, player.id)) {
    if (city.buildings.includes(RELIC)) continue;
    if (!cityKeepsRelics(city)) continue;
    const before = foldCity(state, city, [], null, readCity(state, city));
    const after = foldCity(state, city, [RELIC], null, explainCity(state, city, [RELIC], empire));
    const worth = explainYields(yieldDelta(after, before), ctx);
    if (worth.terms.length === 0) continue;
    return { town: city.name, worth };
  }
  return null;
}

/**
 * Would this town keep a relic — has it a **consecrated** shelf standing?
 *
 * `placeRelicError` asks `cityKeepsRelics` (`religion.ts`), which is not
 * exported; what it means is the cathedral's own marker, and the marker is what
 * is read here rather than a building's name. A town with a consecrated shelf is
 * a town an apostle may leave a relic in, which is the clause this file needs and
 * the only one it restates — written down as the coupling it is, and pinned by a
 * test that asks the simulation's own refusal of the same board.
 */
function cityKeepsRelics(city: City): boolean {
  for (const id of city.buildings) {
    if (buildingDef(id).consecrated === true) return true;
  }
  return false;
}

/** The stones a prophet plants, off the improvement table's own inverse. */
const HOLY_SITE: ImprovementId | null = workForFamily('prophet');

/** The shelf an apostle leaves, off the building table's own `placed` marker. */
const RELIC: BuildingId | null = BUILDING_IDS.find((id) => buildingDef(id).placed === true) ?? null;

/**
 * **What a rite is worth to this town, for the faith it asks** — the rites'
 * want since they became city verbs (2026-09-06).
 *
 * One row per town per rite the empire knows, priced exactly as a purchase is:
 * `price` is the simulation's own figure (`riteCostFor`) and `worth` is what
 * the blessing pays over the turns it runs. The ranking downstream is worth per
 * coin, so a rite competes with a prophet and a faith-bought building in one
 * list — which is the whole point of pricing it at all.
 *
 * Three clauses and one honest gap:
 *
 *   · **only the rites this empire knows and this town may say.** `riteError` is
 *     the simulation's own gate and it is asked here, so a town with no chapel,
 *     a town already keeping one, and a rite behind an unread technology all
 *     fall out for the sim's own reasons rather than for a guess of this file's;
 *   · **a blessing is timed, and says so.** The effects run for `duration`
 *     turns, so they are worth their share of `score.lumpTurns` — the same
 *     exchange the great person's calm and aura go through;
 *   · **the effects are read by the fold the drafts use** (`explainEffects`), so
 *     a rite is priced by exactly the reader a slotted Order is.
 *
 * **The scope, corrected** (batch H12). `explainEffects` prices a city clause in
 * *every* town — the standing bargain of `value.ts`, and right for a card, which
 * is held by an empire. A rite is said over **one** town, so it is priced through
 * a context that says the empire has one (`townScoped`), and every city-scoped
 * arm in the evaluator then pays it once. Left alone, the arithmetic ran away
 * with the board: Omen Reading (a science line per shelf, `where: 'city'`) was
 * read at the realm's shelves times the realm's towns, which is 861 points of
 * blessing on an eight-town board and a rite outranking a prophet by two to one.
 *
 * The gap that is left, stated: a **count** is still the realm's rather than this
 * town's (`realizedCount` sums a city-scoped count over the empire's towns), so a
 * row that counts shelves reads the realm's shelves and not the ones standing
 * here. Closing it means a town-scoped count in `value.ts`, which is a change to
 * that file's contract rather than a reading this one may take.
 */
function ritePlan(state: GameState, player: Player, ctx: ValueContext): Want[] {
  const wants: Want[] = [];
  const price = riteCostFor(state, player.id);
  const here = townScoped(ctx);
  for (const city of ownedCities(state, player.id)) {
    for (const id of LIVE_RITE_IDS) {
      const refusal = riteError(state, player.id, city.id, id);
      // **A rite the bank cannot yet pay is still a want** (batch H12) — the
      // whole of `reachOf`'s bargain, one verb over, and the reason it had to be
      // fixed: `riteError` asks about the bank *last*, exactly as `purchaseError`
      // does, so a rite this town could say the moment the faith arrived was
      // falling out of the book entirely. An empire whose every rite was two
      // turns' faith away therefore had no faith wants at all, priced its bank at
      // the band's floor, and banked a currency it had told itself was worthless.
      const short = refusal !== null && riteOutOfReach(player, id, price, refusal);
      if (refusal !== null && !short) continue;
      const worth = explainRite(id, here);
      const row: Want = {
        label: `${riteDef(id).name} at ${city.name}`,
        currency: 'faith',
        price,
        worth: worth.total,
        delay: 0,
        terms: worth.terms,
        outOfReach: short,
      };
      if (!short) row.rite = { cityId: city.id, rite: id };
      wants.push(row);
    }
  }
  return wants;
}

/** `riteError`'s money clause, said back to it. `outOfReachFor`'s twin. */
function riteOutOfReach(player: Player, id: RiteId, price: number, refusal: string): boolean {
  const held = bankOf(player, 'faith');
  return (
    refusal === `${riteDef(id).name} asks ${price} faith and ${player.name} has ${Math.floor(held)}`
  );
}

/**
 * One rite: what its blessing is worth over the turns it runs.
 *
 * There is no grant arm any more, and the deletion is the news: a rite pays
 * nothing the instant it lands (`RiteDef`), so the whole appraisal is the
 * lasting half — which is the half this file could always read exactly.
 *
 * The context handed in is the **town-scoped** one (`townScoped`): a rite is one
 * town's blessing and every city-scoped arm of the evaluator has to pay it once.
 * See `ritePlan`.
 */
function explainRite(id: RiteId, ctx: ValueContext): Appraisal {
  const def = riteDef(id);
  const effects = def.effects ?? [];
  if (effects.length === 0) return appraise([]);
  const lasting = explainEffects(effects, ctx);
  const turns = def.duration ?? 1;
  const lumpTurns = Math.max(1, ctx.ai.score.lumpTurns);
  return appraise([
    {
      label: `its blessing, for ${turns} turn${turns === 1 ? '' : 's'}`,
      value: (lasting.total * turns) / lumpTurns,
      parts: [
        ...lasting.terms,
        { label: `× ${turns} turns of it`, value: turns, op: 'mul' },
        { label: `÷ ${lumpTurns} — a blessing that runs out, not a rate`, value: lumpTurns, op: 'div' },
      ],
    },
  ]);
}

/**
 * **What the best rite this empire knows would be worth said over every town** —
 * the prophet's fourth act, priced the way its old ones were.
 *
 * The prophet's other three acts price as an *appetite* (`faithRowTerms`), which
 * is the honest shape for "found a religion" and a poor one for a rite: this act
 * pays a blessing in every town at once and that is a figure the book can read.
 * So it is the rite plan's own arithmetic, times the towns it would land on,
 * charged the single price — which is what makes a prophet worth keeping in a
 * realm with forty towns and no chapels.
 */
function explainEmpireRite(state: GameState, ctx: ValueContext, towns: number): Appraisal {
  let best: { id: RiteId; worth: Appraisal } | null = null;
  // **One town's blessing, times the towns** — `ritePlan`'s own correction, and
  // it matters twice as much here: reading each town's share at the empire's
  // scale and then multiplying by the towns again would price a prophet's rite at
  // the square of the realm.
  const here = townScoped(ctx);
  for (const id of LIVE_RITE_IDS) {
    if (!hasAbility(state, ctx.playerId, riteAbility(id))) continue;
    const worth = explainRite(id, here);
    if (best === null || worth.total > best.worth.total) best = { id, worth };
  }
  if (best === null || towns <= 0) return appraise([]);
  return appraise([
    nest(`${riteDef(best.id).name}, the best rite this empire knows`, best.worth),
    { label: `× ${towns} town${towns === 1 ? '' : 's'} it would reach`, value: towns, op: 'mul' },
  ]);
}

/**
 * **How long until this empire has a god at all** — the ladder's next rung over
 * what its faith bank fills at.
 *
 * **The augur's last reading, re-aimed** (batch H12). It used to hunt the roster
 * for the cheapest row marked `consecrates` and price it through
 * `explainPurchaseCost`; the augur is retired, no row consecrates any more, and
 * the search therefore answered "no god in sight" on every board in the game —
 * a dead branch quietly pricing every godless empire's prophet at nothing. The
 * ladder is the only way to a first god now (schema 71), it deals itself, and
 * what it asks is `nextFaithRungCost`.
 *
 * `max(1, rate)` is `savingRows`' bargain said again: an empire banking nothing
 * is treated as banking a point a turn rather than as never arriving. An empire
 * the ladder cannot deal to at all — no slot open, an empty bag — answers the
 * horizon, which is the honest reading of *there is no god in sight*.
 */
function turnsToFirstGod(
  state: GameState,
  player: Player,
  rate: number,
  ctx: ValueContext,
): number {
  if (!hasOpenBeliefSlot(state, player.id)) return ctx.ai.priorities.horizonTurns;
  if (beliefPool(state, player).length === 0) return ctx.ai.priorities.horizonTurns;
  const cost = nextFaithRungCost(player);
  return Math.max(0, cost - bankOf(player, 'faith')) / Math.max(1, rate);
}

// --- the draft plan ----------------------------------------------------------

/**
 * **What this empire's culture is filling toward** — the next draft, priced
 * (batch 6 of `docs/bot-priorities.md`).
 *
 * Culture is the third priced currency and the odd one of the three: nothing
 * sells anything for it. It fills a meter, the meter deals a hand of Orders, and
 * the only decision it ever reaches is *which card* (`orderDecision`). So its
 * book is one row long and that row is the hand:
 *
 *     worth = E[best of the hand the real draw would deal]
 *             − what a new card displaces, when every slot is full
 *             × the discount on the turns the meter has still to fill
 *     price = the draft's own culture cost (`nextDraftCost`)
 *     delay = (cost − pool) ÷ culture a turn
 *
 * Three things are worth saying beside the arithmetic:
 *
 *   · **the expectation is over the *real* draw** — this government's live pool,
 *     the hand's real width, the M/E/W guarantee, the rarity weights and the
 *     pity this empire's own passes have banked (`expectedBestOrder`). It is
 *     arithmetic, never a simulation: nothing here touches `state.rng`, which it
 *     could not do anyway without changing every seeded outcome in the game.
 *   · **the replacement is what a card displaces, not what it adds.** An empire
 *     with an empty slot gets the whole of the card; an empire whose slots are
 *     all full has to bench something to play it, so the worst card it has
 *     benched is what the new one is really worth more than. Crude — the new
 *     card may not fit the slot the worst one is in — and written down as crude.
 *   · **the delay is the meter's, and it is discounted like every other
 *     promise.** A draft eighty turns out is worth nothing today and prints as
 *     nothing, which is the whole reason a young empire's culture is cheap and a
 *     cultured one's is dear.
 *
 * `null`-shaped (an empty list) for an empire whose pool is empty — every card
 * of its government already held — because there is then nothing a draft could
 * deal and culture really is worth its floor.
 */
export function draftPlan(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  inputs: WantInputs,
): Want[] {
  const sc = player.statecraft;
  const pool = livePool(sc);
  if (pool.length === 0) return [];
  const cost = nextDraftCost(player);
  const size = offerSize(state, player.id, 'order');
  const score = (id: OrderId): number => inputs.cardWorth(id).total;
  const hand = expectedBestOrder(pool, size, sc.orderSkips, score);
  const delay = Math.max(0, cost - player.culturePool) / Math.max(1, inputs.cultureRate);

  const terms: ValueTerm[] = [
    {
      label:
        `the best of the ${size}-card hand a draft would deal, ` +
        `over ${pool.length} card${pool.length === 1 ? '' : 's'} still in this government's pool` +
        (sc.orderSkips > 0 ? ` (${sc.orderSkips} pass${sc.orderSkips === 1 ? '' : 'es'} of pity)` : ''),
      value: hand,
    },
  ];
  const displaced = replacementCost(sc, score);
  if (displaced !== null) {
    terms.push({
      label: `less ${cardNameOf(displaced.card)}, the worst card it would have to bench`,
      value: displaced.score,
      op: 'sub',
    });
  }
  terms.push(delayTerm(delay, ctx, 'the culture has still to fill'));

  const folded = appraise(terms);
  return [
    {
      label: `the next draft (tier ${sc.drafts + 1})`,
      currency: 'culture',
      price: cost,
      worth: folded.total,
      delay,
      terms: folded.terms,
      outOfReach: player.culturePool < cost,
    },
  ];
}

/**
 * **What a new card would have to displace** — the worst card sitting in a slot,
 * or `null` while any slot is empty.
 *
 * A card taken into an empty slot costs nothing to play. A card taken into a
 * full government has to bench one, and the one it benches is the worst of them,
 * so what the draft is really worth is the difference. Held-but-unslotted cards
 * are not counted as a cost: they are the ordinary state of an empire that has
 * drafted more than its government seats, and the slots may widen.
 */
function replacementCost(
  sc: Player['statecraft'],
  score: (id: OrderId) => number,
): { card: OrderId; score: number } | null {
  if (sc.slots.length === 0) return null;
  let worst: { card: OrderId; score: number } | null = null;
  for (const slot of sc.slots) {
    if (slot === null) return null;
    const value = score(slot.card);
    if (worst === null || value < worst.score) worst = { card: slot.card, score: value };
  }
  return worst;
}

/**
 * **The expected best card of a dealt hand**, over the draw the simulation
 * actually performs — deterministic arithmetic, no roll and no sample.
 *
 * `drawOrderOffer`'s shape, read as a distribution (`drawOrderOptions`):
 *
 *   · a hand of three or more is dealt **one card from each of the three
 *     sub-bags** — military, economic, wildcard — each drawn *by weight*
 *     (`orderDrawWeight`: the rarity table plus `skipPity` per banked pass);
 *   · the remaining faces are filled from whatever is left, by the same weights;
 *   · a hand narrower than three is dealt plain weighted, with no guarantee.
 *
 * The expectation of the maximum is taken through the **CDF**, which is what
 * makes it exact rather than a mean of means: for a threshold `t`,
 * `P(best ≤ t) = Π over the draws of P(that draw ≤ t)`, and
 * `E[best] = Σ over the distinct scores of v × (F(v) − F(v⁻))`. The three
 * guaranteed sub-draws are **exact** — the sub-bags partition the pool, so the
 * three are independent and each has a known finite distribution.
 *
 * **The one stated approximation is the fill.** The filling draws are taken
 * without replacement from what the guarantee left behind, and this treats them
 * as independent draws from the whole pool. That over-counts the chance of
 * seeing the same excellent card twice and therefore reads a wide hand as very
 * slightly better than it is; the alternative is an inclusion-exclusion over
 * every subset of the pool, which is a sum with two to the thirty-fourth terms
 * to answer a question about one want. An honest approximation, written down.
 *
 * `skips` is the pity the *next* hand would be dealt under, which is what makes
 * this the same function the skip candidate asks with `skips + 1`
 * (`orderDecision`, `bot.ts`).
 *
 * Exported for the tests and for `bot.ts`' skip candidate: the arithmetic is a
 * claim about a distribution, and a played board can only demonstrate it
 * statistically.
 */
export function expectedBestOrder(
  pool: readonly OrderId[],
  size: number,
  skips: number,
  score: (id: OrderId) => number,
): number {
  if (pool.length === 0 || size <= 0) return 0;
  const scores = new Map<OrderId, number>();
  for (const id of pool) scores.set(id, score(id));

  // One factor per draw the deal makes: the guaranteed sub-bag draws, then the
  // fill. A bag with no card in it makes no draw, which is the sim's own
  // behaviour — `drawWeighted` of an empty bag deals nothing.
  const bags: (readonly OrderId[])[] = [];
  if (size >= 3) {
    for (const type of SLOT_TYPES) {
      const bag = pool.filter((id) => orderDef(id).slot === type);
      if (bag.length > 0) bags.push(bag);
    }
  }
  const fills = Math.max(0, size - bags.length);
  for (let i = 0; i < fills; i++) bags.push(pool);
  if (bags.length === 0) return 0;

  const weight = (id: OrderId): number => Math.max(0, orderDrawWeight(id, skips));
  // The distinct scores, ascending — the points the step function of the maximum
  // can jump at, and nowhere else.
  const values = [...new Set([...scores.values()])].sort((a, b) => a - b);

  let expectation = 0;
  let below = 0;
  for (const value of values) {
    let cdf = 1;
    for (const bag of bags) {
      let total = 0;
      let under = 0;
      for (const id of bag) {
        const w = weight(id);
        total += w;
        if (scores.get(id)! <= value) under += w;
      }
      // A bag whose every row weighs nothing is a bag the draw falls back on
      // whole; treat it as certain to be at or under the threshold only when it
      // actually is, which `under / total` cannot answer at zero.
      cdf *= total <= 0 ? (under >= 0 && bag.every((id) => scores.get(id)! <= value) ? 1 : 0) : under / total;
    }
    expectation += value * (cdf - below);
    below = cdf;
  }
  return expectation;
}

// --- saving ------------------------------------------------------------------

/**
 * **Saving is a row**, one per want the bank cannot reach — the spec's line, and
 * the reason a bot with sixty coins does not buy a trinket while a four-hundred
 * coin want is three turns away.
 *
 *     worth = want.worth × (H − turnsToAfford) ÷ H
 *     turnsToAfford = (price − held) ÷ max(1, rate)
 *
 * `H` is `priorities.horizonTurns`. A want a whole horizon out discounts to
 * nothing and drops out of the book rather than folding to a negative, which is
 * the spec's own `max(0, H − delay)` said as a filter. The `max(1, rate)` is
 * the brief's: an empire whose books are flat is treated as making a coin a
 * turn rather than as never affording anything, which keeps a stalled treasury
 * from pricing every want at infinity.
 *
 * A saving row never carries a `buy`. It is an opinion about coins.
 *
 * Exported for the tests and for nothing else: the arithmetic above is a
 * *decision* the board can only demonstrate statistically, and the three-turn
 * case the spec pins ("a four-hundred-coin want three turns out beats a
 * sixty-coin trinket now") is a claim about this function.
 */
export function savingRows(wants: readonly Want[], ctx: ValueContext, held: number, rate: number): Want[] {
  const horizon = Math.max(1, ctx.ai.priorities.horizonTurns);
  const rows: Want[] = [];
  for (const wanted of wants) {
    if (!wanted.outOfReach || wanted.holding !== undefined) continue;
    const short = wanted.price - held;
    if (short <= 0) continue;
    const turns = short / Math.max(1, rate);
    if (turns >= horizon) continue;
    const discount = (horizon - turns) / horizon;
    const terms: ValueTerm[] = [
      nest(`what ${wanted.label} is worth`, { total: wanted.worth, terms: wanted.terms }),
      {
        label: `× ${round(discount)} — ${round(turns)} turns of saving against a ${horizon}-turn horizon`,
        value: discount,
        op: 'mul',
      },
    ];
    rows.push({
      label: `hold toward ${wanted.label}`,
      currency: wanted.currency,
      price: wanted.price,
      worth: foldTerms(terms),
      delay: turns,
      terms,
      outOfReach: true,
      holding: 'saving',
    });
  }
  return rows;
}

// --- the shadow prices -------------------------------------------------------

/** A price, and the sentence that says why it reads what it does. */
export interface ShadowPrices {
  gold: number;
  faith: number;
  /** The draft plan's own reading, banded like the other two (batch 6). */
  culture: number;
  notes: { gold: string; faith: string; culture: string };
}

/** The two constraints' prices, and their sentences. See `meterPrices`. */
export interface MeterPrices {
  authority: number;
  happiness: number;
  notes: { authority: string; happiness: string };
}

/**
 * **What a point of writ and a point of contentment are worth to this empire** —
 * the constraint half of the price vocabulary (batch 4 of
 * `docs/bot-priorities.md`), read off exactly the same formula the two banks are:
 *
 *     price(m) = clamp( max(prior, worth-per-point of the hungriest blocked chain),
 *                       prior × priceBandLow, prior × priceBandHigh )
 *
 * with `prior(m) = weights[m]`, the table's own statement about the meter.
 *
 * **The `max(prior, …)` is the one deliberate difference from a bank**, and it is
 * the difference between a stock and a capacity. An empire with nothing left to
 * buy prices a coin at the band's *floor*, and rightly: a coin nobody has a use
 * for is worth little. Headroom on a meter is not like that — it is a standing
 * tier bonus (`tierPercent`, ±10/20% of every town's production, science and
 * culture) that no empty want book can revoke, and halving what the designer said
 * a point of writ was worth because nothing happens to be blocked on it this turn
 * would be a price arguing with a fact. So a constraint's band only ever ratchets
 * *up*, and `priceBandLow` is unreachable for the two meters by construction.
 *
 * **The hungriest blocked chain** is, today, the expansion chain and only it: the
 * one thing in this bot that names a number of meter points it is short of
 * (`ExpansionChain.short`) and a worth those points would unlock
 * (`ExpansionChain.payoff`, the town before its invests). Worth per point is that
 * quotient, which is the marginal reading the spec's formula asks for — *one more
 * point of writ buys me a third of a town* — and it is why the audit's example
 * pins as a test: a town blocked on two points of writ against a payoff of a
 * hundred prices writ at fifty, the ceiling clamps it to three times the table,
 * and an authority-capacity building outbids its flat-weight self.
 *
 * The payoff is read **before** the chain's own constraint charge, which is not a
 * nicety: the charge is the price times the shortfall, so reading the price off
 * the charged worth would be a fixed point nobody asked for — batch 1's one
 * honest pass, said again one currency over.
 */
export function meterPrices(chain: ExpansionChain | null, ctx: ValueContext): MeterPrices {
  const authority = meterPrice('authority', chain, ctx);
  const happiness = meterPrice('happiness', chain, ctx);
  return {
    authority: authority.price,
    happiness: happiness.price,
    notes: { authority: authority.note, happiness: happiness.note },
  };
}

function meterPrice(
  meter: PricedMeter,
  chain: ExpansionChain | null,
  ctx: ValueContext,
): { price: number; note: string } {
  const prior = ctx.ai.weights[meter];
  const low = prior * ctx.ai.priorities.priceBandLow;
  const high = prior * ctx.ai.priorities.priceBandHigh;
  const short = chain === null ? 0 : chain.short[meter];
  if (short <= 0) {
    return {
      price: Math.min(high, Math.max(low, prior)),
      note: `nothing this empire wants is over-spending its ${meter}`,
    };
  }
  const marginal = chain!.payoff / short;
  const price = Math.min(high, Math.max(low, Math.max(prior, marginal)));
  const capped = marginal > high ? ', capped by the band' : marginal < prior ? ', under the table' : '';
  return {
    price,
    note:
      `the next town is worth ${round(chain!.payoff)} and over-spends ${round(short)} ${meter}` +
      capped,
  };
}

/**
 * **What a coin and a point of faith are worth to this empire** — the book's
 * one answer to the rest of the bot (`ValueContext.prices`).
 *
 * See the module docblock for the formula. Two properties are worth saying
 * beside it, because both are pinned as tests:
 *
 *   · **the ceiling** — a live founder want (six hundred points of appetite for
 *     a hundred and twenty faith) prices faith far above anything the table
 *     would say, and the band is what stops it running away with the empire;
 *   · **the floor** — an empire with nothing left to buy and nothing to pay
 *     prices its bank at `priceBandLow` of the table, so the arms stop chasing
 *     a currency that has no use.
 *
 * The maximum is taken over **every** want including the hold rows, which is
 * the definition rather than a nicety: holding coins against the wages is one
 * of the things a coin can do, and it is often the best one.
 */
export function shadowPrices(book: WantBook, ctx: ValueContext): ShadowPrices {
  const gold = priceOf(book.gold, ctx, 'gold');
  const faith = priceOf(book.faith, ctx, 'faith');
  // **Culture's price is the draft plan's** (batch 6), through the same clamp
  // around the same kind of prior. Its book is one row long, so the maximum is
  // that row — which is the honest reading, because a draft is the one thing
  // culture buys.
  const culture = priceOf(book.culture, ctx, 'culture');
  return {
    gold: gold.price,
    faith: faith.price,
    culture: culture.price,
    notes: { gold: gold.note, faith: faith.note, culture: culture.note },
  };
}

function priceOf(
  wants: readonly Want[],
  ctx: ValueContext,
  currency: WantCurrency,
): { price: number; note: string } {
  const prior = priorPrice(ctx, currency);
  const lump = Math.max(1, ctx.ai.score.lumpTurns);
  const low = prior * ctx.ai.priorities.priceBandLow;
  const high = prior * ctx.ai.priorities.priceBandHigh;
  let best = 0;
  let chosen: Want | null = null;
  for (const wanted of wants) {
    const marginal = worthPerCoin(wanted) * lump;
    if (marginal > best) {
      best = marginal;
      chosen = wanted;
    }
  }
  const price = Math.min(high, Math.max(low, best));
  if (chosen === null) {
    return { price, note: `nothing this empire could buy — ${currency} at the band's floor` };
  }
  const capped = best > high ? ', capped by the band' : best < low ? ', lifted to the band' : '';
  return {
    price,
    note:
      `${chosen.label} is worth ${round(chosen.worth)} for ${Math.round(chosen.price)} ${currency}` +
      capped,
  };
}

/**
 * The table's own statement about a voice — the anchor the band is drawn
 * around, and what the price falls back to when there is nothing in the book.
 *
 * **Gold's prior carries the pressure**, which is what keeps the collapse lever
 * (Entry LIX) whole: a bleeding empire's coins start dear, the band moves with
 * them, and no fold multiplies by the pressure twice because nothing downstream
 * multiplies by it at all any more.
 */
export function priorPrice(ctx: ValueContext, currency: WantCurrency): number {
  const table = yieldWeight(ctx.ai, currency, ctx.age);
  return currency === 'gold' ? table * ctx.goldPressure : table;
}

// --- asking the simulation ---------------------------------------------------

/**
 * Is this row a want at all, and can the bank reach it — or is the answer no?
 *
 * `purchaseError` is the **single gate**, exactly as it is in the spend arm and
 * as `buildError` is for the queue: the wonder clause, the augur's bank, the
 * one-unit-per-city stamp, the spawn tile and the tree are all its and none of
 * them is restated here.
 *
 * The one thing it cannot answer on its own is *"would this be legal if I could
 * pay"* — the bank is the last clause it asks, so a want beyond the purse comes
 * back as a refusal like any other. `outOfReachFor` is that question, asked by
 * rebuilding the sentence the money clause makes and comparing it to the one
 * that came back. It is coupling to the simulation's words, and it is pinned by
 * a test that constructs a poor empire and asserts the book still holds the
 * want — so the day the sentence changes, the suite says so rather than the
 * book quietly emptying.
 */
function reachOf(
  state: GameState,
  player: Player,
  city: City,
  item: PurchasableItem,
  currency: BankCurrency,
): { price: number; outOfReach: boolean } | null {
  const price = explainPurchaseCost(state, player.id, city.id, item, currency);
  if (price === null) return null;
  const refusal = purchaseError(state, player.id, city.id, item, currency);
  if (refusal === null) return { price: price.total, outOfReach: false };
  if (!outOfReachFor(player, item, currency, price.total, refusal)) return null;
  return { price: price.total, outOfReach: true };
}

/** `purchaseError`'s money clause, said back to it. See `reachOf`. */
function outOfReachFor(
  player: Player,
  item: PurchasableItem,
  currency: BankCurrency,
  price: number,
  refusal: string,
): boolean {
  const held = bankOf(player, currency);
  const name = purchasableName(item);
  return refusal === `${name} costs ${price} ${currency}; ${player.name} has ${Math.floor(held)}`;
}

// --- small shared shapes ------------------------------------------------------

/** One purchase want, folded. `buy` is set only where the rules allow one today. */
function want(
  label: string,
  currency: WantCurrency,
  reach: { price: number; outOfReach: boolean },
  city: City,
  item: PurchasableItem,
  terms: ValueTerm[],
): Want {
  const folded = appraise(terms);
  return {
    label,
    currency,
    price: reach.price,
    worth: folded.total,
    delay: 0,
    terms: folded.terms,
    outOfReach: reach.outOfReach,
    ...(reach.outOfReach ? {} : { buy: { cityId: city.id, item } }),
  };
}

/**
 * **The same opinion, read as though this empire held one town** — the context a
 * rite is priced through (batch H12).
 *
 * `ValueContext.cities` is the number every city-scoped arm of the evaluator
 * multiplies a clause by, because a *card* is held by an empire and pays in every
 * town of it. A rite is not held by an empire: it is said over one town, for ten
 * turns, and paid for once. So the honest reading is the same evaluator asked of
 * the same board with that one number set to one.
 *
 * A copy rather than a mutation, for the context's own stated lifetime rule — and
 * taken **once per plan** rather than per row, because the memos in `value.ts`
 * are keyed on the context object and a fresh one per rite would price the whole
 * empire's books five times a town.
 */
function townScoped(ctx: ValueContext): ValueContext {
  return { ...ctx, cities: 1 };
}

/** This empire's towns, in founding order — an array, so the walk is the log's. */
function ownedCities(state: GameState, playerId: number): City[] {
  const towns: City[] = [];
  for (const city of state.cities) {
    if (city.ownerId === playerId) towns.push(city);
  }
  return towns;
}

/** Does this empire hold any piece of this type at all? */
function ownsAny(state: GameState, playerId: number, type: UnitTypeId): boolean {
  for (const unit of state.units) {
    if (unit.ownerId === playerId && unit.type === type) return true;
  }
  return false;
}

/** A card's own printed name, for a row a reader has to recognise. */
function cardNameOf(id: OrderId): string {
  return anyCardDef(id).name;
}

