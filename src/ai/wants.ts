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
  type YieldBag,
  VOICES,
  delayTerm,
  explainBuildingRow,
  explainEffects,
  explainLump,
  explainUpkeepCost,
  explainYields,
  yieldDelta,
  yieldWeight,
} from './value';

import { BUILDING_IDS, type BuildingId, buildingDef } from '../sim/buildingData';
import { cityQuote, cityYields, empirePercents } from '../sim/cities';
import {
  type PurchasableItem,
  bankOf,
  explainPurchaseCost,
  purchasableName,
  purchaseError,
} from '../sim/purchase';
import { RITE_IDS, type RiteId, riteAbility, riteDef } from '../sim/religionData';
import type { City, GameState, Player } from '../sim/state';
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
      const after = cityYields(state, city, [id], null, cityQuote(state, city, [id], empire));
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

  const reserve = wageReserveRow(ctx, inputs.wageReserve);
  if (reserve !== null) wants.push(reserve);
  for (const row of savingRows(wants, ctx, bankOf(player, 'gold'), inputs.goldRate)) wants.push(row);
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
          faithRowTerms(state, ctx, reach.price, {
            firstGod: def.consecrates === true && noPantheon,
            founder: def.prophesies === true && unfounded,
            performsRites: def.consecrates === true,
            charges: def.charges ?? 0,
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
  state: GameState,
  ctx: ValueContext,
  price: number,
  row: {
    firstGod: boolean;
    founder: boolean;
    performsRites: boolean;
    charges: number;
    noPantheon: boolean;
    godTurns: number;
  },
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
  if (row.performsRites) {
    const rites = explainRites(state, ctx, row.charges);
    if (rites.terms.length > 0) return [nest('what its rites would do', rites)];
  }
  return [
    nest('worth at least the faith it costs — nothing it does is priced', explainLump({ faith: price }, ctx)),
  ];
}

/**
 * **What an augur's charges are worth** — the batch-1 deferral, closed.
 *
 * Batch 1 priced a rite-carrying row at exactly the faith it cost and said so:
 * *"nothing in this bot can price a rite, and a guess dressed as a price is worse
 * than the silence."* What has changed is that a rite's lasting half is an
 * ordinary card effect list (`RiteDef.effects`, stamped as a `TimedEffect` for
 * its `duration`), so the reader the drafts already use answers it —
 * `explainEffects`, the same fold a slotted Order goes through, which is the
 * discipline `explainTechGifts` keeps for a node's own rules.
 *
 * Three clauses and one honest gap:
 *
 *   · **only the rites this empire knows.** `hasAbility` + `riteAbility` is the
 *     simulation's own gate (`riteError` asks it in exactly those words), so a
 *     row whose rites are all behind unread technologies prices at nothing here
 *     and falls back to the faith it costs;
 *   · **the best rite, times the charges.** A piece with three charges will spend
 *     them on the best thing it may do, not on one of each, and the rites are
 *     tried in roster order by an arm with no price axis (`augurCommand`) — so
 *     the *book's* reading is what the empire would get if it spent them well;
 *   · **a blessing is timed, and says so.** The effects run for `duration` turns,
 *     so they are worth their share of `score.lumpTurns` — the same exchange the
 *     great person's calm and aura go through (`explainAct`), applied from the
 *     same end.
 *
 * The gap: a rite's **grant** (`RiteGrantSpec`) is a windfall of a shape this
 * file cannot read as a bag — a citizen, a heal, a proclamation — and it prices
 * at `score.unknownEffect`, printed as unread. The yield-shaped keys are the
 * exception and go through `explainLump`, because those the bot can price
 * exactly.
 */
function explainRites(state: GameState, ctx: ValueContext, charges: number): Appraisal {
  const spent = Math.max(1, charges);
  let best: { id: RiteId; worth: Appraisal } | null = null;
  for (const id of RITE_IDS) {
    if (!hasAbility(state, ctx.playerId, riteAbility(id))) continue;
    const worth = explainRite(id, ctx);
    if (best === null || worth.total > best.worth.total) best = { id, worth };
  }
  if (best === null) return appraise([]);
  return appraise([
    nest(`${riteDef(best.id).name}, the best rite this empire knows`, best.worth),
    { label: `× ${spent} charge${spent === 1 ? '' : 's'}`, value: spent, op: 'mul' },
  ]);
}

/** One rite: what it grants the instant it lands, and what its blessing does. */
function explainRite(id: RiteId, ctx: ValueContext): Appraisal {
  const def = riteDef(id);
  const terms: ValueTerm[] = [];
  const grant = def.grant;
  if (grant !== undefined) {
    const bag: YieldBag = {};
    for (const voice of VOICES) {
      const amount = (grant as Record<string, unknown>)[voice];
      if (typeof amount === 'number') bag[voice] = amount;
    }
    if (Object.keys(bag).length > 0) terms.push(nest('what it grants outright', explainLump(bag, ctx)));
    for (const key of Object.keys(grant)) {
      if ((VOICES as readonly string[]).includes(key)) continue;
      terms.push({
        label: `${key} — a grant this bot cannot read`,
        value: ctx.ai.score.unknownEffect,
      });
    }
  }
  const effects = def.effects ?? [];
  if (effects.length > 0) {
    const lasting = explainEffects(effects, ctx);
    const turns = def.duration ?? 1;
    const lumpTurns = Math.max(1, ctx.ai.score.lumpTurns);
    terms.push({
      label: `its blessing, for ${turns} turn${turns === 1 ? '' : 's'}`,
      value: (lasting.total * turns) / lumpTurns,
      parts: [
        ...lasting.terms,
        { label: `× ${turns} turns of it`, value: turns, op: 'mul' },
        { label: `÷ ${lumpTurns} — a blessing that runs out, not a rate`, value: lumpTurns, op: 'div' },
      ],
    });
  }
  return appraise(terms);
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

/** A card's own printed name, for a row a reader has to recognise. */
function cardNameOf(id: OrderId): string {
  return anyCardDef(id).name;
}

/** One decimal place, and no trailing `.0` — a label is read, not parsed. */
function round(value: number): string {
  const fixed = Math.round(value * 10) / 10;
  return Number.isInteger(fixed) ? String(fixed) : fixed.toFixed(1);
}
