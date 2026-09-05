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
 *     What a building would pay is `cityYields` asked hypothetically. This file
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
 *   · **What an augur's rites are worth.** A faith row with no live appetite is
 *     priced at exactly what the faith it costs is worth (`explainLump`) and no
 *     more, which is honest rather than generous: nothing in this bot can price
 *     a rite, and a guess dressed as a price is worse than the silence. It puts
 *     such a row level with holding the faith, which is where it belongs until
 *     the rites are appraised.
 *   · **"Legal but for the price."** The simulation has one gate and it asks
 *     about the bank last, so a want beyond the purse comes back as a refusal
 *     rather than as a price — see `outOfReachFor`.
 */

import { type Appraisal, type ValueTerm, appraise, foldTerms, nest } from './decision';
import {
  type ValueContext,
  delayTerm,
  explainBuildingRow,
  explainLump,
  explainUpkeepCost,
  explainYields,
  yieldDelta,
  yieldWeight,
} from './value';

import { BUILDING_IDS, buildingDef } from '../sim/buildingData';
import { cityQuote, cityYields, empirePercents } from '../sim/cities';
import {
  type PurchasableItem,
  bankOf,
  explainPurchaseCost,
  purchasableName,
  purchaseError,
} from '../sim/purchase';
import type { City, GameState, Player } from '../sim/state';
import { UNIT_TYPE_IDS, type UnitTypeId, unitDef } from '../sim/unitData';
import { buildingUpkeep } from '../sim/upkeep';

/** The two banks batch 1 prices. Constraints (authority, happiness) are batch 4. */
export type WantCurrency = 'gold' | 'faith';

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
}

/** An empire that has not been asked yet — the shape `valueContext` starts from. */
export const NO_WANTS: WantBook = { gold: [], faith: [] };

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
  /** False while the books are bleeding: nothing that costs upkeep is wanted. */
  maintained: boolean;
  /**
   * What a soldier of this type is worth standing in this town, or `null` when
   * the empire does not want one — `bot.ts`' own reading, handed in rather than
   * imported so this module stays the leaf `value.ts` and `bot.ts` both stand
   * on (`roads.ts`' bargain one system over).
   */
  soldierWorth: (city: City, id: UnitTypeId) => Appraisal | null;
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
 * *actually* make with it (`cityYields` asked hypothetically, staged and
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
  // sweep — `cityQuote`'s documented bargain, and the difference between one
  // meter sweep and forty.
  const empire = empirePercents(state, player.id);
  const bases = towns.map((city) => cityYields(state, city, [], null, cityQuote(state, city, [], empire)));

  for (const id of BUILDING_IDS) {
    const upkeep = buildingUpkeep(id);
    // **The hard floor reaches the purse** (design ledger Entry LIX, finding 1):
    // buying a library outright is exactly as ruinous as building one, so an
    // empire whose income has turned does not *want* one at any price. A
    // feasibility sentence rather than a weight, which is why it is a skip.
    if (!inputs.maintained && upkeep > 0) continue;
    for (let index = 0; index < towns.length; index++) {
      const city = towns[index]!;
      const item: PurchasableItem = { kind: 'building', id };
      const reach = reachOf(state, player, city, item, 'gold');
      if (reach === null) continue;
      const after = cityYields(state, city, [id], null, cityQuote(state, city, [id], empire));
      const delta = yieldDelta(after, bases[index]!);
      wants.push(
        want(`${buildingDef(id).name} at ${city.name}`, 'gold', reach, city, item, [
          nest('what this town would actually make with it', explainYields(delta, ctx)),
          nest('what its row gives beyond a yield', explainBuildingRow(id, ctx)),
          nest('its standing maintenance', explainUpkeepCost(upkeep, ctx), 'sub'),
        ]),
      );
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

  const reserve = wageReserveRow(ctx, inputs.wageReserve);
  if (reserve !== null) wants.push(reserve);
  for (const row of savingRows(wants, ctx, bankOf(player, 'gold'), inputs.goldRate)) wants.push(row);
  return wants;
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
 * the arithmetic: an augur that would consecrate this empire's first god is
 * worth `religion.prophetTechValue` for forty faith, a prophet that would found
 * its first religion is worth the same for a hundred and twenty, and the augur
 * therefore wins on worth per coin exactly while there is no god — which is the
 * order the ladder was hand-writing.
 *
 * The restraint the ladder also carried — *stop buying augurs and save for a
 * prophet* — is now the saving row's job and is better for it: an empire whose
 * faith rate can reach the prophet inside the horizon holds for it, and one
 * whose rate cannot is no longer told to bank faith for eighty turns against a
 * price it will never see.
 *
 * A row this empire already has one of is left out of the book entirely: a
 * second augur standing beside an idle first is faith that bought nothing.
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
  const godTurns = noPantheon ? turnsToFirstGod(state, player, towns, inputs.faithRate, ctx) : 0;

  for (const id of UNIT_TYPE_IDS) {
    const def = unitDef(id);
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
          faithRowTerms(ctx, reach.price, {
            firstGod: def.consecrates === true && noPantheon,
            founder: def.prophesies === true && unfounded,
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
    if (!inputs.maintained && upkeep > 0) continue;
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

  for (const row of savingRows(wants, ctx, bankOf(player, 'faith'), inputs.faithRate)) {
    wants.push(row);
  }
  return wants;
}

/**
 * What a faith row is worth, by the markers on it — never by its name, which is
 * the discipline `src/sim/` keeps and a reader of the same tables has no
 * business breaking.
 *
 * Three clauses and one deferral: the first god and the first religion are the
 * empire's stated appetite (`religion.prophetTechValue`); a prophet an empire
 * has no god for is that appetite **discounted by how far off the god is**,
 * because the god comes first and the ladder always said so; and everything else
 * is worth exactly the faith it costs, which puts it level with holding until
 * somebody prices a rite.
 *
 * That middle clause was a flat λ until batch 2 of `docs/bot-priorities.md`. The
 * honest delay is the wait for the *other* row: `turnsToFirstGod`, the cheapest
 * consecration this empire could buy, over its faith rate. An empire two turns
 * from its first god wants the prophet behind it almost at full price; one that
 * cannot see a god inside the horizon wants it at nothing, and prints so.
 */
function faithRowTerms(
  ctx: ValueContext,
  price: number,
  row: { firstGod: boolean; founder: boolean; noPantheon: boolean; godTurns: number },
): ValueTerm[] {
  const appetite = ctx.ai.religion.prophetTechValue;
  if (row.firstGod) {
    return [{ label: 'the first god — this empire holds no belief at all', value: appetite }];
  }
  if (row.founder && !row.noPantheon) {
    return [{ label: 'the first religion — a god is held and no faith founded', value: appetite }];
  }
  if (row.founder) {
    return [
      { label: 'the first religion, once this empire has a god at all', value: appetite },
      delayTerm(row.godTurns, ctx, 'the god comes first'),
    ];
  }
  return [
    nest('worth at least the faith it costs — its rites are unpriced', explainLump({ faith: price }, ctx)),
  ];
}

/**
 * **How long until this empire has a god at all** — the cheapest consecration
 * any of its towns could take delivery of, over what its faith bank fills at.
 *
 * Read off the markers rather than off a name (`UnitDef.consecrates`) and priced
 * by the simulation's own `explainPurchaseCost`, exactly as every other row in
 * the book is. `max(1, rate)` is `savingRows`' bargain said again: an empire
 * banking nothing is treated as banking a point a turn rather than as never
 * arriving.
 *
 * An empire that can buy no consecration anywhere — the tech is not held, no
 * town takes the row — answers the horizon, so the prophet behind the god prices
 * at nothing. That is the honest reading: there is no god in sight.
 */
function turnsToFirstGod(
  state: GameState,
  player: Player,
  towns: readonly City[],
  rate: number,
  ctx: ValueContext,
): number {
  let cheapest: number | null = null;
  for (const id of UNIT_TYPE_IDS) {
    if (unitDef(id).consecrates !== true) continue;
    for (const city of towns) {
      const price = explainPurchaseCost(state, player.id, city.id, { kind: 'unit', id }, 'faith');
      if (price === null) continue;
      if (cheapest === null || price.total < cheapest) cheapest = price.total;
    }
  }
  if (cheapest === null) return ctx.ai.priorities.horizonTurns;
  return Math.max(0, cheapest - bankOf(player, 'faith')) / Math.max(1, rate);
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
  notes: { gold: string; faith: string };
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
  return {
    gold: gold.price,
    faith: faith.price,
    notes: { gold: gold.note, faith: faith.note },
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
  currency: WantCurrency,
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
  currency: WantCurrency,
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

/** Has this empire founded a religion? `GameState.religions` is the register. */
function hasFoundedReligion(state: GameState, playerId: number): boolean {
  for (const religion of state.religions) {
    if (religion.founderId === playerId) return true;
  }
  return false;
}

/** One decimal place, and no trailing `.0` — a label is read, not parsed. */
function round(value: number): string {
  const fixed = Math.round(value * 10) / 10;
  return Number.isInteger(fixed) ? String(fixed) : fixed.toFixed(1);
}
