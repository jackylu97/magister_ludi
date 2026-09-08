/**
 * **The empire** — the seat's own list (`docs/yields.md` steps 13–17), the
 * stage over its fold, and the phase that banks it (step 18).
 *
 * `explainEmpireLines` is the list — the luxuries' signatures, the caravans
 * abroad, the treasury's ledger, the cards' empire payouts, then one
 * reconciliation line a voice for the empire stage — and `foldEmpireLines` is
 * its sum. `collectYields` is the phase that prices every town and then banks
 * both halves.
 *
 * **`collectYields` lives here rather than in `turn.ts`**, and that is a
 * decision of batch E3b rather than an accident of the cut: step 18 of the
 * sequence *is* the banks, the phase is the only reader that must see the two
 * halves in the right order (every town priced against a pre-banking treasury,
 * the empire's lines taken after), and `turn.ts` stays what it is — the fixed
 * order of phases, four one-line calls. Its own docblock says why it takes its
 * own readings rather than subscribing to `readings.ts`.
 *
 * Split out of `cities.ts` in batch E3b (`docs/flags.md` item pp,
 * `docs/audit/evaluations.md` §4b step 9). No arithmetic moved; the parity
 * fixtures are the gate, and `cities.ts` re-exports every name so no import path
 * had to change.
 */

import { applyStages, stageFactor } from './stages';
import { CITY_YIELD_KEYS, type ResourceId } from '../resourceData';
import { type CardId } from '../statecraftData';
import { type CardYieldLine, explainCardEmpireYields, heldReligions } from '../statecraft';
import {
  type City,
  type GameState,
  capitalCityOf,
  cityReligion,
  playerById,
  removeUnit,
} from '../state';
import type { TurnReport } from '../turn';
import { empireResourceYields } from '../resourceEffects';
import { cityRouteYields, senderRouteYields } from '../routeYields';
import { explainEmpireGold } from '../empireGold';
import { disbandCandidate } from '../upkeep';
import { type CityYields, assignCitizens, borderGrowth, emptyCityYields, growthSurplus } from '../cities';
import { foldStageSums } from './stages';
import { type EmpirePercents, empirePercents, explainCity, foldCity } from './town';

// --- turn phases ------------------------------------------------------------

/**
 * `collectYields`: re-assign every city's citizens, then bank what they made.
 *
 * Cities are walked in `state.cities` order — the order they were founded — and
 * so is every other phase. That is the documented design: each phase sweeps all
 * cities before the next phase begins, so no city can grow off yields a later
 * city has not collected yet, and the whole turn is one pass per rule rather
 * than one pass per city.
 *
 * The hammers are banked at the rate for whatever is at the **front** of the
 * queue, which is where a per-category modifier lands: a barracks pays its ten
 * percent into the basket on the turns the city is actually building a unit, and
 * nothing on the turns it is building a granary. That is the Civ reading, it is
 * the only one a single basket can express, and it is the rate `turnsToBuild`
 * quoted — one call to one evaluator, so the estimate and the bank agree by
 * construction rather than by inspection.
 *
 * **Why the phase takes its own readings** (batch E2). Every *reader* now
 * subscribes to `readCity`/`readEmpire`, remembered on `state.revision`
 * (`readings.ts`), and this phase deliberately does not. Two reasons, and both
 * are rules rather than reluctance:
 *
 *   · `readings.ts` imports this file, so this file importing it would be a
 *     runtime cycle — `test/mapgen/moduleCycles.test.ts` is the gate and the
 *     symptom is "X is not a function" everywhere (CLAUDE.md's leaf rule);
 *   · the two loops below price **every** town against a treasury nothing has
 *     banked into yet, and `explainEmpireLines` is asked afterwards, against the
 *     treasury the towns just filled. A reading taken once for both would price
 *     the arrears twice from one side of that line, which is the very thing the
 *     two-loop split exists to prevent. A revision is one number for the whole
 *     board; the *inside* of a phase is where the board is halfway moved, and
 *     nothing there may read a memo of it.
 */
export function collectYields(state: GameState, report?: TurnReport): void {
  // **Every city is priced before any city banks**, and that is a rule rather
  // than a tidy-up (the maintenance ruling, 2026-08-28). `cityYieldPercents` now
  // reads the treasury — a seat in arrears loses a quarter of its science and
  // culture — so a single interleaved loop would price the first town against a
  // treasury of −20 and the fourth against the +9 the first three had just paid
  // in. The debt penalty would then depend on founding order, and the panel,
  // which cannot know how far through the sweep it is, would be wrong about
  // every town but one. Two loops make the whole turn agree on one answer to
  // "was this empire in debt", which is the only honest reading of an empire
  // -wide fact.
  //
  // The order of both loops is `state.cities`, which is founding order, which is
  // what every other phase sweeps in; nothing in the first loop reads anything
  // the first loop writes.
  const priced: { city: City; yields: CityYields }[] = [];
  for (const city of state.cities) {
    assignCitizens(state, city);
    priced.push({ city, yields: foldCity(state, city, [], city.queue[0]) });
  }

  for (const { city, yields } of priced) {
    // Upkeep, the settler halt and the happiness stifle, all in one function so
    // that what the panel promised is what the basket receives.
    const surplus = growthSurplus(state, city, yields);
    city.foodBasket += surplus;
    // **Reported here, whether or not the basket runs dry** — a deficit is a
    // deficit, and a settler-halted queue shields nothing (`growthIsHalted`
    // only ever clamps a *positive* surplus, so a city already underwater
    // reports exactly the same loss with or without one at the front of its
    // queue). `growCities`, later in this resolution, corrects `shrank` and
    // `population` on this same entry if the deficit actually starves the
    // town — see `StarvationReport`.
    if (surplus < 0) {
      report?.starved.push({
        cityId: city.id,
        ownerId: city.ownerId,
        lost: -surplus,
        shrank: false,
        population: city.population,
        ejected: [],
      });
    }
    city.hammerBasket += yields.production;
    // Only the border basket answers to the writ — see `borderGrowth`. The
    // empire's culture pool below is banked at the full rate, because authority
    // owns land and has no opinion about civics.
    city.culture += borderGrowth(state, city, yields).perTurn;

    const player = playerById(state, city.ownerId);
    if (!player) continue;
    player.gold += yields.gold;
    player.sciencePool += yields.science;
    player.culturePool += yields.culture;
    // The faithful gather, and augurs are what they gather for — see
    // `Player.faithPool` and `explainPurchaseCost`.
    player.faithPool += yields.faith;
    // **What the caravans carried**, counted once a turn for the Richest Roads
    // reckoning (design ledger Entry VI). Counted *here* and nowhere else,
    // because this is the one place a route's yields are banked rather than
    // previewed: `cityRouteYields` is folded into `explainCity` on every estimate
    // the panel draws, and a counter raised there would count a hover. Reset at
    // the age's turn-over — see `Player.routeYieldsThisAge`.
    for (const line of cityRouteYields(state, city)) {
      player.routeYieldsThisAge += line.food + line.production + line.gold;
    }
  }

  // **The empire's own lines, banked once per player** after every city has
  // collected — the whole difference between an `empireYields` signature and a
  // `foldCity` one, and since the empire stage ruling (batch H19) one list
  // rather than four loops.
  //
  // `explainEmpireLines` is that list, in the order this phase has always banked
  // in: the luxuries' empire signatures, the caravans abroad, the treasury's
  // ledger, then the cards' empire-scale payouts — last, for the reason that is
  // the whole of `rateConversion`: a card that pays "per faith gained per turn"
  // has to be asked *after* everything that pays faith this turn has paid it, or
  // The Tithe would be converting last turn's rate. And at the foot, the empire
  // stage: the additive lines fold first and the meters multiply that fold once,
  // exactly as Entry XVII multiplies a town's basket. What banks is the fold of
  // the list, so the top bar, the Ledger, the ghost-diff and the bot's margin
  // read the very figure this line moves.
  //
  // Walked in `state.players` order. A domestic route pays its *destination*, so
  // every voice it carries landed in a town's fold above; a route ending abroad
  // pays the empire that **sent** it and has no town to be banked in, which is
  // why one side of it is here and the other is not.
  for (const player of state.players) {
    const lines = explainEmpireLines(state, player.id);
    const empire = foldEmpireLines(lines);
    player.gold += empire.gold;
    player.sciencePool += empire.science;
    player.culturePool += empire.culture;
    player.faithPool += empire.faith;
    // **What the caravans carried**, counted here for the reason the city loop
    // counts its own: this is the one place these figures are *banked* rather
    // than previewed. The route lines' own figures, before the stage — a
    // reckoning of what the caravans brought in is a fact about the caravans,
    // and the city loop above counts its half the same way (`cityRouteYields`,
    // before that town's two multiplications).
    for (const line of lines) {
      if (line.origin !== 'route') continue;
      player.routeYieldsThisAge += line.gold + line.science + line.culture;
    }
  }

  // And **last of all**, the creditors. Placed at the very end of the phase for
  // one reason: "is this empire deep enough in arrears to lose a piece" has to
  // be asked of the treasury this turn actually left it with, after every coin
  // it earned and every coin it owed. A sweep placed earlier would take a
  // warrior off an empire whose caravans were about to come home.
  collectArrears(state, report);
}

/**
 * One unit per empire per turn, taken by the creditors — the other half of "the
 * treasury may go negative" (the user's ruling, 2026-08-28).
 *
 * Below `rules.upkeep.disbandBelow` a seat loses the piece it is paying most for
 * (`disbandCandidate`, which owns the ordering and the exemptions). **One per
 * turn and never a loop**: disbanding banks no gold, it only lowers next turn's
 * bill, so "until the treasury recovers" would mean "until the army is gone".
 * An empire that keeps overspending keeps losing one a turn, which is a spiral a
 * player can see coming and can stop.
 *
 * It reports rather than announces, which is `arriveOnTile`'s discipline: by the
 * time anybody reads the list the pieces are off the board, and `removeUnit` has
 * already closed their owners' eyes. The sink is optional so that a caller with
 * nothing to tell — a test, a preview — passes nothing.
 *
 * The wild is skipped, in `disbandCandidate`, which is where every other
 * "the wild does not do that" refusal for this system lives.
 */
function collectArrears(state: GameState, report?: TurnReport): void {
  for (const player of state.players) {
    const taken = disbandCandidate(state, player.id);
    if (!taken) continue;
    removeUnit(state, taken.unitId);
    report?.disbanded.push({
      unitId: taken.unitId,
      ownerId: player.id,
      type: taken.type,
      upkeep: taken.gold,
    });
  }
}

/**
 * What one empire banked this turn, per voice — the input every `rateConversion`
 * reads (`statecraft.ts`).
 *
 * The fold of the same `foldCity` the phase above banked, asked once more
 * rather than threaded through: threading would mean `collectYields` carrying an
 * accumulator through two loops for the benefit of one card family, and this is
 * six additions per city. It is the *base* rate deliberately — before any
 * conversion pays anything — which is what stops two cards feeding each other.
 *
 * **Two readers now** (the master-list cut of 2026-08-31), and the second is a
 * windfall whose figure is quoted in *turns* (The Lyceum's extra turn of
 * culture): it has to ask the same books a `rateConversion` asks, or "a turn of
 * culture" would mean two different numbers depending on which surface said it.
 *
 * **The one fold, exported** (batch E3b). It was two functions until the three
 * verbs — a private `empireRates` and a one-line `empireRateReading` around it,
 * the pair dating from a time when the reading was meant to stay inside this
 * module. Nothing about the answer moves; what goes is the second spelling. The
 * name says the verb: this is a **fold**, the sum of the empire's own books,
 * taken rather than memoised (`readings.ts` holds the memos, and this is asked
 * from inside `windfallPayout` where a leaf may not reach).
 *
 * It is asked **lazily** — only when a rider actually names a rate — because it
 * prices every town, and an occasion nobody wrote such a rider for must not pay
 * for it. One function for every asker, so a card that says "a turn of culture"
 * and a card that says "per culture gained per turn" read one set of books.
 *
 * **A third reader since the great-people nerf pass** (2026-09-03): a great
 * scholar's and a great artist's act are quoted in *turns of the empire's own
 * rate* (`actGainOf`, `greatPeople.ts`), which is the same sentence The Lyceum
 * says about a technology — so they ask the same books rather than summing the
 * cities a third time, and "a turn of science" means one thing in the game.
 */
export function foldEmpireRates(state: GameState, playerId: number): {
  faithPerTurn: number;
  culturePerTurn: number;
  goldPerTurn: number;
  sciencePerTurn: number;
  capitalFaithPerTurn: number;
  followingFaithPerTurn: number;
  productionPerTurn: number;
  foodPerTurn: number;
} {
  const rates = {
    faithPerTurn: 0,
    culturePerTurn: 0,
    goldPerTurn: 0,
    // The fourth voice, and the one no `rateConversion` asks for: a great
    // scholar's act is quoted in *turns of your own science* (the nerf pass of
    // 2026-09-03), and it reads this fold rather than summing the cities a
    // second time. See `EmpireRates.sciencePerTurn`.
    sciencePerTurn: 0,
    capitalFaithPerTurn: 0,
    followingFaithPerTurn: 0,
    // The two voices with no empire bank at all — `collectYields` has nowhere to
    // put a realm's food or hammers, so they are summed here for the readers that
    // ask what the books *say* rather than what they hold (`CountKind`'s
    // `empireYield`, Horology's "science equal to your empire-wide production").
    // Nothing is banked off them; see `EmpireRates`.
    productionPerTurn: 0,
    foodPerTurn: 0,
  };
  // Theocracy's tithe reads **one town's** faith, and it is read off the same
  // sweep rather than by a second pass: the capital's yields are already in
  // hand on the turn the loop reaches it, so "what did the capital bank" costs
  // one comparison. It is deliberately the *city's* faith and not the empire's
  // share of it — a signature about the temple city is about the temple city.
  const capital = capitalCityOf(state, playerId);
  // The empire's half of every town's percentages, taken once (2026-08-29).
  // `explainCity`'s default is `empirePercents(state, ownerId)` and every city in
  // this loop has the same owner, so the default was the same two meter sweeps
  // repeated once per town — for the phase that banks the turn *and* for the
  // top bar's headline, which reads this list on every accepted command. The
  // figure is unchanged by construction: `empirePercents` is a pure function of
  // `(state, playerId)` and this is the very call the default would have made.
  const percents = empirePercents(state, playerId);
  // Which faiths this empire is *paid by* — the holy cities it holds — hoisted
  // once for the loop below, `zocField`'s bargain at the scale of a sweep.
  const held = heldReligions(state, playerId).map((religion) => religion.id);
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const yields = foldCity(state, city, [], city.queue[0], explainCity(state, city, [], percents));
    rates.faithPerTurn += yields.faith;
    rates.culturePerTurn += yields.culture;
    rates.goldPerTurn += yields.gold;
    rates.sciencePerTurn += yields.science;
    rates.productionPerTurn += yields.production;
    rates.foodPerTurn += yields.food;
    if (capital && city.id === capital.id) rates.capitalFaithPerTurn += yields.faith;
    // Cuius Regio's congregation, off the same sweep for the capital's reason:
    // the town's yields are already in hand, so "what did my faithful towns
    // bank" costs one comparison. The banner is the town's own derived reading
    // (`cityReligion`) against the faiths this empire is *paid by*
    // (`heldReligions` — the holy city's), so a conquered shrine moves the
    // sentence with it and nothing here can disagree with what the town flies.
    const kept = cityReligion(city);
    if (kept !== null && held.includes(kept)) rates.followingFaithPerTurn += yields.faith;
  }
  // **The empire's standing lines, staged** (batch H19). The luxuries' empire
  // signatures, the caravans abroad and the treasury's whole ledger join the
  // *base* rate for the reason every other line here does: a card that pays "per
  // gold gained per turn" has to read the gold this turn actually produced, and
  // a connected empire's roads — and since the maintenance ruling its army and
  // its institutions — are part of it. All of them, maintenance included: a
  // conversion reads what the treasury *made*, and an empire whose upkeep eats
  // its connections made less.
  //
  // They are staged here for the same reason they are staged in the bank: since
  // the empire stage ruling the figure this empire actually banks off these
  // lines is `(Σ income) × (1 + Σ empire%)`, and a rate reading that quoted the
  // unmultiplied fold would be a conversion pricing against money nobody
  // received. `stageEmpireFold` is the one multiplication and the bills are
  // outside it, so this is `explainEmpireLines` without its cards — which is
  // exactly what a base rate is.
  const standing = empireStandingLines(state, playerId);
  const additive = emptyCityYields();
  let bills = 0;
  for (const line of standing) {
    if (line.bill === true) {
      bills += line.gold;
      continue;
    }
    for (const key of CITY_YIELD_KEYS) additive[key] += line[key];
  }
  const empire = stageEmpireFold(additive, percents);
  rates.faithPerTurn += empire.faith;
  rates.culturePerTurn += empire.culture;
  rates.goldPerTurn += empire.gold + bills;
  rates.sciencePerTurn += empire.science;
  return rates;
}

/**
 * The empire-scale card lines `collectYields` banks this turn — `empireYields`,
 * the empire-scoped `countScaled` payouts, and every `rateConversion`, read off
 * this turn's own rates.
 *
 * Exported so the top bar's headline and the phase that actually banks the
 * gold/science/culture/faith read the **same list**: a hand-rolled empire sum
 * on the UI side that left this out would print a rate the resolution
 * disagrees with, which is exactly the Great Litany bug this function exists
 * to close. `foldEmpireRates` stays private — it is an input this function alone
 * needs, not a fact anything else asks for.
 *
 * **The reading is handed in as the taking of it** (batch H18), which is what
 * `foldEmpireRates`'s docblock has always said it was: `foldEmpireRates` prices
 * every town in the empire, only a `rateConversion` card reads it, and this
 * list is asked twice per card stamp, once per Ledger open and once per top-bar
 * refresh. An empire holding no such card was paying a whole extra sweep of its
 * own cities for a figure nothing looked at. Nothing about the answer moves:
 * `explainCardEmpireYields` resolves the thunk on the first conversion it meets and
 * once only, so a realm that holds one reads exactly the books it read before.
 */
export function explainEmpireCardYields(state: GameState, playerId: number): CardYieldLine[] {
  return explainCardEmpireYields(state, playerId, () => foldEmpireRates(state, playerId));
}

// --- the empire's own list (batch H19) --------------------------------------

/**
 * Which fold an empire-scale line came out of — the only handle a reader needs
 * to file it under the class it belongs to, and the reason no surface has to
 * parse a label to find out.
 *
 * `'stage'` is the reconciliation line itself: what the empire stage added over
 * the additive lines above it, one per voice.
 */
export type EmpireLineOrigin = 'resource' | 'route' | 'gold' | 'card' | 'stage';

/**
 * One labelled line of what an empire banks **beyond its towns** — the shape
 * `explainEmpireLines` is a list of.
 *
 * Six voices on every line, so a reader asks the same question of a luxury's
 * signature, a caravan abroad, a road's coin and a card's payout; the sources
 * that cannot pay in a voice simply carry nought there.
 */
export interface EmpireYieldLine extends CityYields {
  /** The evaluator's own label — "Silk · empire", "City connections · 4 cities". */
  source: string;
  origin: EmpireLineOrigin;
  /**
   * A **bill**: a cost the empire stage does not reach (`TradeGoldKind`). Absent
   * on every income line, which is what the stage multiplies.
   */
  bill?: boolean;
  /** The seam this line came from, for a surface filing it under the land. */
  resource?: ResourceId;
  /** The card that pays it, for a surface filing it under the deck. */
  card?: CardId;
  /**
   * The stage line's own multiplier on this voice — 1.1 for a realm ten points
   * up — so a surface prints the reason rather than inventing one. Absent on
   * every additive line.
   */
  factor?: number;
}

/**
 * The empire's **standing** additive lines: the luxuries' empire signatures, the
 * caravans abroad, and the treasury's own ledger — everything but the cards.
 *
 * Private, and the cards are out of it for `foldEmpireRates`' reason: an empire card
 * line is computed *from* the rate this list feeds, so a list that carried them
 * would be a conversion reading its own output. `explainEmpireLines` puts them
 * back on the end, which is the order `collectYields` has always banked in.
 */
function empireStandingLines(state: GameState, playerId: number): EmpireYieldLine[] {
  const lines: EmpireYieldLine[] = [];
  for (const line of empireResourceYields(state, playerId)) {
    lines.push({
      ...emptyCityYields(),
      ...voicesOf(line),
      source: line.source,
      origin: 'resource',
      resource: line.resource,
    });
  }
  for (const line of senderRouteYields(state, playerId)) {
    lines.push({ ...emptyCityYields(), ...voicesOf(line), source: line.source, origin: 'route' });
  }
  for (const line of explainEmpireGold(state, playerId)) {
    lines.push({
      ...emptyCityYields(),
      gold: line.gold,
      source: line.source,
      origin: 'gold',
      // The one classification that is not "everything here is a yield": a
      // maintenance line, a levy's surcharge, a charter's rebate and a treaty
      // are costs, and the stage does not reach them (ruling oo).
      ...(line.kind === 'bill' ? { bill: true as const } : {}),
    });
  }
  return lines;
}

/**
 * The voices a line actually carries, as a bag to spread over the six.
 *
 * The three additive sources speak in different numbers of voices — a luxury's
 * signature in six, a caravan in five (a route never pays faith), a treasury
 * line in one — and `EmpireYieldLine` speaks in six so that every reader asks
 * one question of all of them. Copying only the keys a line declares is what
 * keeps a missing voice a nought rather than an `undefined` in a fold.
 */
function voicesOf(line: Partial<CityYields>): Partial<CityYields> {
  const bag: Partial<CityYields> = {};
  for (const key of CITY_YIELD_KEYS) if (line[key] !== undefined) bag[key] = line[key];
  return bag;
}

/**
 * **The empire stage applied to an empire-scale fold** — Entry XVII's second
 * multiplication at the empire's own scale, and the one implementation of it.
 *
 * The city stage is nought by construction: `empirePercents` returns meter tiers
 * and arrears, every one of them `stage: 'empire'`, and there is no town here to
 * carry a city percentage. So this is `applyStages` with an idle first stage —
 * the very function every town's basket goes through, never a second reading of
 * the same doctrine.
 *
 * Exported because a reader may hold a **subset** of the additive lines and want
 * the same multiplication over it (the bot's margin, which adds the cards' half
 * to a base reading that already carries the standing half). Staging is linear,
 * so the parts staged separately sum to the whole staged once — which is the
 * property that lets `explainEmpireLines` print one reconciliation line rather
 * than one per source.
 */
export function stageEmpireFold(fold: CityYields, empire: EmpirePercents): CityYields {
  const list = [...empire.meters, ...empire.arrears];
  const staged = emptyCityYields();
  for (const key of CITY_YIELD_KEYS) staged[key] = applyStages(fold[key], foldStageSums(list, key));
  return staged;
}

/**
 * **What one empire banks beyond its towns, as the ordered list the bank is the
 * fold of** — rule 5 at the empire's scale, and the whole of the empire stage
 * ruling (`docs/flags.md` oo, the user, 2026-09-07: *"empire additive bonuses
 * should apply before empire multiplicative bonuses"*).
 *
 * The additive lines first, in the order `collectYields` has always banked them:
 * the luxuries' empire signatures, the caravans abroad, the treasury's ledger,
 * then the cards' empire-scale payouts (last, because a `rateConversion` reads
 * the rates the three above it produced). Then **one reconciliation line per
 * voice** for the empire stage — the meter tiers and the arrears, the same two
 * lists every town carries as its second stage — whose figure is what the
 * multiplication added over the additive fold. The fold of the whole list is
 * what banks, exactly as `applyRiders` and the building preview do it.
 *
 * Until this batch the empire's lines were banked flat while every town's basket
 * was multiplied twice, which made a happiness tier's "+10% science" a rule about
 * where a beaker happened to be earned. Now `(Σ empire lines) × (1 + Σ empire%)`
 * is one multiplication over one fold, floored nowhere (batch X).
 *
 * **Which lines the stage reaches**: the yields — a luxury's signature, a
 * caravan's foreign coin, a card's empire payout, and the *income* half of the
 * treasury (city connections and a luxury's share of them). Not the **bills**:
 * maintenance, a levy's surcharge, a charter's rebate and the treaties are costs
 * rather than yields (`TradeGoldKind`, whose docblock has each one's reason), and
 * a contented empire earns more from its roads without paying its soldiers less.
 *
 * `empire` may be handed in by a caller that already took the reading —
 * `explainCity`'s parameter one scale out, and the seam a ghost-diff lends its own
 * meters across (`cardImpact.ts`).
 */
export function explainEmpireLines(
  state: GameState,
  playerId: number,
  empire: EmpirePercents = empirePercents(state, playerId),
): EmpireYieldLine[] {
  const lines = empireStandingLines(state, playerId);
  for (const line of explainEmpireCardYields(state, playerId)) {
    lines.push({
      ...emptyCityYields(),
      ...voicesOf(line),
      source: line.source,
      origin: 'card',
      card: line.card,
    });
  }
  // The additive fold the stage multiplies — every line but the bills.
  const additive = emptyCityYields();
  for (const line of lines) {
    if (line.bill === true) continue;
    for (const key of CITY_YIELD_KEYS) additive[key] += line[key];
  }
  const staged = stageEmpireFold(additive, empire);
  const list = [...empire.meters, ...empire.arrears];
  for (const key of CITY_YIELD_KEYS) {
    const gain = staged[key] - additive[key];
    if (gain === 0) continue;
    const factor = stageFactor(foldStageSums(list, key));
    const line: EmpireYieldLine = {
      ...emptyCityYields(),
      // The multiplier on its face, because a line whose figure is a difference
      // is a line a player cannot check without it. `×1.10`, the panel's own
      // reading of a stage said in one number.
      source: `Empire stage · ×${factor.toFixed(2)}`,
      origin: 'stage',
      factor,
    };
    line[key] = gain;
    lines.push(line);
  }
  return lines;
}

/** The fold of `explainEmpireLines`, and the only sum of one. */
export function foldEmpireLines(lines: readonly EmpireYieldLine[]): CityYields {
  const total = emptyCityYields();
  for (const line of lines) for (const key of CITY_YIELD_KEYS) total[key] += line[key];
  return total;
}
