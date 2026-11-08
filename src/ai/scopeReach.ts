/**
 * **The scope's reach.** How many of a seat's towns, capitals and worked hexes
 * a card's scope reaches, and what share of a hex's yield a hex line changes.
 *
 * The price arms in `value.ts` ask these readings for every scoped clause. Each
 * answer comes from the simulation's own tests (`cityScopeAdmits`,
 * `tileConditionHolds`) and folds (`foldTile`), so the bot prices a clause in
 * the towns and on the hexes where the rules pay it.
 *
 * This file is a leaf over `prices.ts`. It imports only the `ValueContext` type
 * from `value.ts`. The build erases a type import, so `value.ts` can import
 * this file with no cycle. Its top-level values are functions and five
 * `new WeakMap()` memos only, so it loads in any order. Each memo is keyed on
 * the `ValueContext`, so it lives as long as that context does.
 */

import { round } from './decision';
import { type Voice, type YieldBag, VOICES, delayDiscount, voiceWeight } from './prices';
import type { ValueContext } from './value';

import { type BuildingId, buildingDef } from '../sim/buildingData';
import { type Tile, getTileAt, tileNeighbors } from '../sim/map';
import { type City, citiesOf, cityById } from '../sim/state';
// Straight from the evaluator, not through the `statecraft.ts` index. Through
// the index, the build warns of a circular import between chunks.
import {
  type TileLine,
  buildingMatchesYieldPercent,
  cardCapitalIds,
  cityScopeAdmits,
  explainBuildingPackage,
  foldBuildingPackage,
  groundFactsFor,
  tileConditionHolds,
  tileConditionReadsFold,
  townHoldsBuilding,
} from '../sim/statecraft/evaluator';
import type { CardEffect, CardPaysEffect, CityScope, TileCondition } from '../sim/statecraftData';
import { explainEmpireLines, foldEmpireIncome } from '../sim/yields/empire';
import { type TileYieldContext, cityContext, foldTile } from '../sim/yields/hex';

/**
 * **This town, as it would be holding the row** — the hypothetical the wall line
 * asks `cityMaxHp` about, and nothing more than that: the same town with one
 * building added, so a town that already holds the row is handed back unchanged
 * rather than counted twice.
 */
export function townHolding(city: City, id: BuildingId): City {
  if (city.buildings.includes(id)) return city;
  return { ...city, buildings: [...city.buildings, id] };
}

/** `townHolding` for one walk, on a copy of the town that the walk reuses. */
function townHoldingOn(copies: Map<number, City>, city: City, id: BuildingId): City {
  if (city.buildings.includes(id)) return city;
  let copy = copies.get(city.id);
  if (copy === undefined) {
    copy = { ...city };
    copies.set(city.id, copy);
  }
  copy.buildings = [...city.buildings, id];
  return copy;
}

// --- the scope, evaluated (batch X2) ----------------------------------------

/**
 * **What one sitting has already worked out about a scope.**
 *
 * `MARGIN_MEMO`'s bargain exactly (see it): keyed weakly on the `ValueContext`,
 * which is one seat's book for one decision, and inside that on **the scope
 * object itself** — a `CityScope` in a data row is parsed once at load and every
 * appraisal of that row hands the same object back, so identity is the row's own
 * name for the question and nothing has to be hashed.
 *
 * It has to be a memo rather than a plain walk because the questions are not
 * cheap: `frontier` sweeps the map, `holding` asks `openedResource` — the walk
 * that is 17% of the bot's runtime one system over — and a draft plan appraises
 * the same pool of rows a dozen times in one sitting.
 *
 * The `where: 'hex'` half keys on **the effect** rather than on its `on`, because
 * that count is a function of the pair (`on`, `scope`) and the row carrying them
 * is the one object that names both. The two keyspaces cannot collide: a
 * `CardEffect` is never a `CityScope`.
 */
const SCOPE_MEMO = new WeakMap<ValueContext, Map<object, number>>();

function scopeMemo(ctx: ValueContext): Map<object, number> {
  let held = SCOPE_MEMO.get(ctx);
  if (held === undefined) {
    held = new Map<object, number>();
    SCOPE_MEMO.set(ctx, held);
  }
  return held;
}

/**
 * **Does this scope name a shelf this empire could go and raise?**
 *
 * The one scope in the union that is a *plan* rather than a fact about the
 * board. Every other test — the coast, a river, a mountain, a capture — is
 * something the map or the history decided and no amount of hammers changes it;
 * `hasBuilding` is something a town does on purpose, and it is also the idiom
 * **every wonder in the data uses to say "in the town that raises me"** (21 of
 * the 26 `hasBuilding` scopes on building rows name their own row). Read
 * literally, a wonder's own clause would admit no town on the turn the bot is
 * deciding whether to build it, and the appraisal would price Petra's desert at
 * nothing for ever.
 *
 * So a `hasBuilding` scope no town admits reads **one town** — the town that
 * would raise it — and never `× cities`, which is the under-read this batch is
 * for. Recursive, because a composite may hold one.
 */
function scopePromisesABuilding(scope?: CityScope): boolean {
  if (scope === undefined) return false;
  if (scope.test === 'hasBuilding' || scope.test === 'hasBuildingYielding') return true;
  if (scope.test === 'all' || scope.test === 'any') return scope.of.some(scopePromisesABuilding);
  return false;
}

/**
 * **One shelf this empire is about to raise**, and how much of it is real today.
 *
 * Batch X1e, the user's ruling of 2026-09-09 (`docs/flags.md` item (ggg)):
 * *"does the bot ever price the potential of a card? +1 science on libraries is
 * good even if you don't have libraries built yet"*. Every building-scoped arm
 * in this file walked `city.buildings`, so a card that boosts libraries was
 * worth nothing at all to an empire two turns from raising three of them, and
 * the bot passed the card that its own research plan was making good.
 *
 * The promise is read off the **register of intent** and never off a search:
 * `ValueContext.chains` is `liveChains`, the goals this empire is actually
 * executing, and a building step's `copies` are the towns that would raise the
 * row with the turn each copy lands (batch X1d-chain). So the potential this
 * file prices is exactly the potential the chain book has already committed to
 * — nothing here decides that a library *might* be built, it reads that one is
 * owed — and the discount is that copy's own delay, which is the same figure
 * the chain discounted its payoff by.
 *
 * `discount` is therefore between nought and one: a copy landing next turn is
 * very nearly a shelf standing, and a copy past `priorities.horizonTurns` is
 * dropped rather than kept at nothing.
 */
interface PromisedBuilding {
  /** The town that would raise it — the same town the scope is asked of. */
  city: City;
  id: BuildingId;
  /** `delayDiscount` at the copy's own landing. Greater than nought. */
  discount: number;
}

const PROMISE_MEMO = new WeakMap<ValueContext, PromisedBuilding[]>();

/**
 * **The shelves the live chains still owe**, one row per (town, building), best
 * discount first come — memoised for the sitting, `SCOPE_MEMO`'s bargain.
 *
 * A town already holding the row is not promised anything: it is *held*, which
 * is the reading the arms take first, and counting it here as well would pay the
 * empire twice for one library. A row promised by two chains keeps the earlier
 * landing, which is when it will actually stand. "Held" is what the town holds
 * for the row's effects, a card's grant included (`townHoldsBuilding`,
 * Expansionist batch E13), because the arms read the held rows that way.
 *
 * The list is built by walking arrays in the order the chain book holds them, so
 * two identical boards build identical lists (rule 2).
 */
function promisedBuildings(ctx: ValueContext): readonly PromisedBuilding[] {
  const memoised = PROMISE_MEMO.get(ctx);
  if (memoised !== undefined) return memoised;
  const towns = new Map<number, City>();
  for (const city of citiesOf(ctx.state, ctx.playerId)) towns.set(city.id, city);
  const rows: PromisedBuilding[] = [];
  const seen = new Map<string, PromisedBuilding>();
  for (const chain of ctx.chains) {
    for (const step of chain.steps) {
      if (step.kind !== 'building') continue;
      const id = step.id as BuildingId;
      for (const copy of step.copies) {
        const city = towns.get(copy.cityId);
        if (city === undefined || townHoldsBuilding(ctx.state, city, id)) continue;
        const discount = delayDiscount(copy.delay, ctx);
        if (discount <= 0) continue;
        const key = `${copy.cityId}:${id}`;
        const held = seen.get(key);
        if (held === undefined) {
          const row: PromisedBuilding = { city, id, discount };
          seen.set(key, row);
          rows.push(row);
        } else if (discount > held.discount) {
          held.discount = discount;
        }
      }
    }
  }
  PROMISE_MEMO.set(ctx, rows);
  return rows;
}

/**
 * The promised shelves a scope would admit — the same question `townsAdmitting`
 * asks of the towns, asked of the copies.
 *
 * The scope is tested against the town **holding the promised row**
 * (`townHolding`, the hypothetical the build arm already uses), because that is
 * the town the clause would land in: a card scoped to *"towns with a library"*
 * lands in the town the chain is about to give one to, and asking the scope of
 * the town as it stands would answer no for ever.
 */
function promisedRowsFor(ctx: ValueContext, scope?: CityScope): PromisedBuilding[] {
  const rows: PromisedBuilding[] = [];
  for (const row of promisedBuildings(ctx)) {
    if (
      scope !== undefined &&
      !cityScopeAdmits(ctx.state, townHolding(row.city, row.id), scope, ctx.playerId)
    ) {
      continue;
    }
    rows.push(row);
  }
  return rows;
}

/**
 * **What the shelves a chain still owes would add to a `buildingYieldPercent`
 * clause** — the sweep above said about the copies, each at its own discount.
 *
 * Written as its own fold rather than as a second pass inside that sweep because
 * the two questions are different: one is *what does this empire hold*, which is
 * a fact, and this is *what has it committed to raising*, which is a promise
 * with a delay on it. The arithmetic is deliberately the same, voice for voice,
 * so a library standing and a library owed are priced by one reading.
 *
 * **That reading is the building's package** (batch R2d): the row, its own
 * lines and every line a card or a luxury would put on it. A building is not in
 * its package's town until it is raised, so the copy is asked of the town as
 * it would be holding it (`townHolding`), the hypothetical the scope above is
 * already asked of. A temple owed to a realm whose belief puts science on
 * temples is priced with that science, and the selector asks the same town.
 */
export function promisedYieldPercent(
  effect: Extract<CardEffect, { kind: 'buildingYieldPercent' }>,
  ctx: ValueContext,
): number {
  let sum = 0;
  for (const row of promisedRowsFor(ctx, effect.scope)) {
    const town = townHolding(row.city, row.id);
    if (!buildingMatchesYieldPercent(ctx.state, town, row.id, effect)) continue;
    const paid = foldBuildingPackage(explainBuildingPackage(ctx.state, town, row.id));
    for (const voice of VOICES) {
      if (effect.yield !== undefined && effect.yield !== 'all' && effect.yield !== voice) continue;
      const base = paid[voice];
      if (base === 0) continue;
      sum += voiceWeight(ctx, voice) * base * (effect.percent / 100) * row.discount;
    }
  }
  return sum;
}

/**
 * The same promise for a `basis: 'mirror'` clause — what the shelves this empire
 * is about to raise would pay in `from`, paid again as `to`, discounted.
 */
export function promisedMirror(effect: CardPaysEffect, ctx: ValueContext): number {
  if (effect.from === undefined) return 0;
  let sum = 0;
  for (const row of promisedRowsFor(ctx, effect.scope)) {
    const def = buildingDef(row.id);
    if (def.category !== effect.category) continue;
    const base = def[effect.from as Voice] ?? 0;
    if (base === 0) continue;
    sum += voiceWeight(ctx, effect.to as Voice) * base * row.discount;
  }
  return sum;
}

/**
 * **How many of this empire's towns a scope actually admits** — batch X2's one
 * function, and the replacement for every bare `× ctx.cities` on a scoped clause.
 *
 * The answer is the simulation's own: `cityScopeAdmits` over `citiesOf`, which
 * is the very predicate the evaluator pays the clause by, so the bot cannot
 * disagree with the rules about which towns a line lands in. Nothing here
 * reimplements a test, and a scope added to `CityScope` tomorrow is answered
 * here the day it is answered there.
 *
 * `viewerId` is this seat, which is what the religion scopes (`follows`) want:
 * *"a town that keeps my faith"*, asked from my chair.
 *
 * A `capital` scope reads one (or nought in a realm with no capital) because
 * the evaluator says so, not because this function knows what a capital is.
 *
 * An absent scope is every town, which is what absence means.
 */
export function townsAdmitting(ctx: ValueContext, scope?: CityScope): number {
  if (scope === undefined) return ctx.cities;
  const towns = realmTownsAdmitting(ctx, scope);
  const share = oneTownShare(ctx);
  // A context priced for one town (`oneTownContext`) reads the share of the realm
  // the scope admits. The promise's floor below stays: a row some town would raise
  // is a whole town's worth to the town raising it.
  if (share === 1) return towns;
  return towns > 0 && scopePromisesABuilding(scope) ? Math.max(towns * share, Math.min(1, ctx.cities)) : towns * share;
}

/**
 * The share of the realm a context is priced for. One for a seat's whole book, and
 * one town's share for a context that says the seat has one town (`oneTownContext`,
 * `townScoped` in `wants.ts`), because a rite or an ordinary building lands in one.
 */
const ONE_TOWN_SHARE_MEMO = new WeakMap<ValueContext, number>();
export function oneTownShare(ctx: ValueContext): number {
  let share = ONE_TOWN_SHARE_MEMO.get(ctx);
  if (share === undefined) {
    const real = citiesOf(ctx.state, ctx.playerId).length;
    share = real <= ctx.cities || real === 0 ? 1 : ctx.cities / real;
    ONE_TOWN_SHARE_MEMO.set(ctx, share);
  }
  return share;
}

/** `townsAdmitting`'s count over the whole realm, whatever the context is priced for. */
export function realmTownsAdmitting(ctx: ValueContext, scope?: CityScope): number {
  if (scope === undefined) return citiesOf(ctx.state, ctx.playerId).length;
  const memo = scopeMemo(ctx);
  const held = memo.get(scope);
  if (held !== undefined) return held;
  let towns = 0;
  for (const city of citiesOf(ctx.state, ctx.playerId)) {
    if (cityScopeAdmits(ctx.state, city, scope, ctx.playerId)) towns += 1;
  }
  // **The shelves the chains still owe** (batch X1e). A town that does not admit
  // the scope today but *would* once the copy its chain owes is standing counts
  // at that copy's own discount, so a clause about libraries is worth something
  // to an empire about to raise three and still worth nothing to one that will
  // never raise any. A town counts once however many copies would admit it, at
  // the best (earliest) of them: the clause lands in the town, not in the shelf.
  if (scopePromisesABuilding(scope)) {
    const gains: number[] = [];
    const counted = new Map<number, number>();
    // One copy of each town for this walk, with its shelf rewritten for each row,
    // because copying a whole town for each of a hundred rows was the dear part.
    // Nothing below keeps the copy past the one question it is asked.
    const copies = new Map<number, City>();
    for (const row of promisedBuildings(ctx)) {
      if (cityScopeAdmits(ctx.state, row.city, scope, ctx.playerId)) continue;
      if (!cityScopeAdmits(ctx.state, townHoldingOn(copies, row.city, row.id), scope, ctx.playerId)) continue;
      const at = counted.get(row.city.id);
      if (at === undefined) {
        counted.set(row.city.id, gains.length);
        gains.push(row.discount);
      } else if (row.discount > gains[at]!) {
        gains[at] = row.discount;
      }
    }
    for (const gain of gains) towns += gain;
  }
  // The wonder idiom, and the one promise a realm can keep — see above. A realm
  // whose chains promise less than a whole town still reads the one town that
  // would raise the row, so the idiom is a floor rather than a fallback.
  if (towns < 1 && scopePromisesABuilding(scope)) towns = Math.min(1, citiesOf(ctx.state, ctx.playerId).length);
  memo.set(scope, towns);
  return towns;
}

/**
 * The capitals, admitted or not. A `where: 'capital'` line pays **one town** for
 * each town that counts as the capital (two under The Two Capitals, batch DT17),
 * and a scope on it can still shut one.
 *
 * Unmemoised on purpose: it is a short walk and one predicate, and a memo keyed on
 * a scope that may be absent would need a key this function does not have.
 */
export function capitalAdmits(ctx: ValueContext, scope?: CityScope): number {
  let towns = 0;
  for (const id of cardCapitalIds(ctx.state, ctx.playerId)) {
    const seat = cityById(ctx.state, id);
    if (seat === undefined) continue;
    if (scope === undefined || cityScopeAdmits(ctx.state, seat, scope, ctx.playerId)) towns += 1;
  }
  return towns;
}

/**
 * **How many hexes a `where: 'hex'` line actually pays on** — the harder half,
 * and `score.nominalTiles`' replacement.
 *
 * Counted over the empire's **worked** hexes and deliberately not over its owned
 * ones. That is the honest reading rather than the convenient one: a hex clause
 * lands in a town's books through `foldCity`, which folds `explainTileYield` for
 * the tiles a citizen is *sitting on*, and ground inside the borders that nobody
 * works pays nobody anything. An owned-hex count would tell this bot that a
 * one-citizen town on a desert of thirty tiles is being paid thirty times over.
 * It under-reads a town that is about to grow — which is the right direction for
 * a rate the bot is deciding to *buy*, and the growth is priced by the growth
 * channel rather than twice here.
 *
 * The condition is `tileConditionHolds`, the evaluator's own. **The one
 * condition that reads the fold gets the fold** (`yields` — the Rite of the
 * Harvest's *"every hex that feeds it"*): asked without a `paid` thunk it
 * answers no, so counting it that way would price four live rows at nought,
 * which is a worse lie than the flat three they were priced at before. So the
 * thunk is handed in, and it is the town's own reading — `cityContext` plus
 * `foldTile`, the very pair `explainCity` folds a worked hex through. The
 * context is built once per town and only for the rows that ask, which is what
 * keeps the walk cheap: `tileConditionReadsFold` is the evaluator's own answer
 * to whether anybody is asking.
 *
 * `scope` at `where: 'hex'` is whose **ground** it is (the shape's own docblock),
 * so it filters the towns and the condition filters their hexes. When the scope
 * is the wonder idiom and no town holds the row yet, the reading is one middling
 * town's worth of that ground — the row is a promise about the town that raises
 * it, and this empire's own average is the only town it can be asked about.
 */
export function workedHexesAdmitting(ctx: ValueContext, effect: CardPaysEffect): number {
  const memo = scopeMemo(ctx);
  const held = memo.get(effect);
  if (held !== undefined) return held;
  const ground = groundOfHexLine(ctx, effect);
  const count = ground.hexes.length / ground.over;
  memo.set(effect, count);
  return count;
}

/** One worked hex a hex line lands on, and the town working it. */
interface HexLineCell {
  city: City;
  tile: Tile;
}

/**
 * **The worked hexes a `where: 'hex'` line lands on**, the walk behind
 * `workedHexesAdmitting` and `wholeShareOf`. Both ask the same question, so they
 * cannot disagree about which hexes a row reaches.
 *
 * `over` is what the walk's figures are divided by. It is one, except for the
 * promise that docblock describes: a scope no town admits yet reads the whole
 * empire's hexes shared over its towns, one middling town's worth.
 */
export function groundOfHexLine(
  ctx: ValueContext,
  effect: CardPaysEffect,
): { hexes: HexLineCell[]; over: number } {
  const towns = citiesOf(ctx.state, ctx.playerId);
  const reads = tileConditionReadsFold(effect.on);
  // **The garrisons** (Dominion batch D7, The Farming Garrisons and The
  // Castra): the hexes where this empire has a fortified military unit now.
  // A line that asks about them is also asked of each town's centre hex,
  // because a fortified garrison in a town counts for the centre (the triage's
  // reading 25), and that is where most garrisons stand.
  const ground = groundFactsFor(ctx.state, ctx.playerId);
  const garrisoned = asksAboutGarrisons(effect.on);
  let admitted = 0;
  const onAdmitted: HexLineCell[] = [];
  const everywhere: HexLineCell[] = [];
  for (const city of towns) {
    const context = reads ? cityContext(ctx.state, city) : undefined;
    const mine: HexLineCell[] = [];
    const cells = garrisoned ? [...city.workedTiles, { col: city.col, row: city.row }] : city.workedTiles;
    for (const cell of cells) {
      const tile = getTileAt(ctx.state.map, cell.col, cell.row);
      if (tile === undefined) continue;
      const holds =
        effect.on === undefined ||
        tileConditionHolds(
          tile,
          effect.on,
          reads ? () => foldTile(tile, context) : undefined,
          // The ring, so a line that asks `beside` is read as the hex fold reads
          // it. Without it every such line priced at nothing (found by batch DT6,
          // The Highland Clans).
          () => tileNeighbors(ctx.state.map, tile),
          // The clock, for the same reason (batch DT19b): a line asking a work's
          // age read false on every hex, so The Georgics' +1 production priced at
          // nothing however old the seat's works were.
          ctx.state.turn,
          ground,
        );
      if (holds) mine.push({ city, tile });
    }
    everywhere.push(...mine);
    // The ground is this function's reading; *whose* ground it is is the scope's,
    // and it is asked of each town in the same sweep.
    if (
      effect.scope === undefined ||
      cityScopeAdmits(ctx.state, city, effect.scope, ctx.playerId)
    ) {
      admitted += 1;
      onAdmitted.push(...mine);
    }
  }
  if (admitted > 0) return { hexes: onAdmitted, over: 1 };
  return towns.length === 0 || !scopePromisesABuilding(effect.scope)
    ? { hexes: [], over: 1 }
    : { hexes: everywhere, over: towns.length };
}

/**
 * **What a row marked `empireIncome` takes of the empire's own income** (batch DT19c,
 * The Contented City), at the voice's price. The figure is the one the fold takes, so
 * it reads the seat's roads, caravans abroad and cards' empire payouts as they are
 * today. Nothing for every other row.
 */
export function empireIncomeShareWorth(
  effect: Extract<CardEffect, { kind: 'percentYields' }>,
  ctx: ValueContext,
): number {
  if (effect.empireIncome !== true) return 0;
  const income = foldEmpireIncome(explainEmpireLines(ctx.state, ctx.playerId));
  const voices: readonly Voice[] = effect.yield === 'all' ? VOICES : [effect.yield as Voice];
  let worth = 0;
  for (const voice of voices) worth += voiceWeight(ctx, voice) * (effect.percent / 100) * income[voice];
  return worth;
}

/** The share a row takes of a hex (`wholeShareOf`), remembered for the sitting. */
const WHOLE_SHARE_MEMO = new WeakMap<ValueContext, Map<CardPaysEffect, YieldBag>>();

/**
 * **What a hex line's `wholePercent` pays this seat a turn, voice by voice**
 * (batch DT3). The Strategoi's citadels, The Nizamiyya, The Cathedral Lodges and
 * The Pandidakterion take a positive share, and Crop Rotation's wild ground a
 * negative one. A share has no figure of its own on the row, so reading only the
 * row's bag priced The Cathedral Lodges' doubling at nothing, and Crop Rotation's
 * drawback at nothing too.
 *
 * The share is taken over what each worked hex pays this seat today: `foldTile`
 * with the town's own context, which is how `explainCity` folds the hex. So a
 * seat that has improved the hex, or holds cards that pay on it, gets a larger
 * figure, for a gain and for a loss alike.
 *
 * **The base leaves out every whole share of the row's own pass**, the row's own
 * included. Step 8 of the hex fold (`docs/yields.md`) sums the shares of one pass
 * before one multiplication, so each is a share of what the hex pays without them.
 * Reading the plain fold would price a seated doubler at twice what it adds. The
 * other pass stays in the base (batch DT19c): The Pandidakterion is taken after The
 * Nizamiyya, so with both held it adds half as much again, and The Nizamiyya's half
 * is doubled too.
 *
 * The town's own hex is not priced. It is not in `workedTiles`, and it keeps its
 * floor under a card that takes everything away (`explainCentreYield`).
 */
export function wholeShareOf(ctx: ValueContext, effect: CardPaysEffect): YieldBag {
  const percent = effect.wholePercent ?? 0;
  if (percent === 0) return {};
  let memo = WHOLE_SHARE_MEMO.get(ctx);
  if (memo === undefined) {
    memo = new Map();
    WHOLE_SHARE_MEMO.set(ctx, memo);
  }
  const held = memo.get(effect);
  if (held !== undefined) return held;
  const ground = groundOfHexLine(ctx, effect);
  const share: YieldBag = {};
  let context: TileYieldContext | undefined;
  let contextOf: City | undefined;
  for (const { city, tile } of ground.hexes) {
    // The walk visits a town's hexes together, so one context serves them all.
    if (contextOf !== city) {
      context = withoutWholeShares(cityContext(ctx.state, city), effect.appliedLast === true);
      contextOf = city;
    }
    const paid = foldTile(tile, context);
    for (const voice of VOICES) share[voice] = (share[voice] ?? 0) + paid[voice];
  }
  for (const voice of VOICES) {
    share[voice] = (((share[voice] ?? 0) / ground.over) * percent) / 100;
  }
  memo.set(effect, share);
  return share;
}

/** The share a row takes of the works (`hexPercentShareOf`), remembered for the sitting. */
const HEX_PERCENT_MEMO = new WeakMap<ValueContext, Map<CardPaysEffect, YieldBag>>();

/**
 * **What a hex line's `percent` and `basePercent` pay this seat a turn, voice by
 * voice** (batch DT19b). The share is taken of what the works on the hex pay, or of
 * what its ground pays. The arm read a nominal yield instead, 33.6 points on every
 * improved hex, so Crop Rotation's gain on a farm paying one food read as much as on
 * a mine paying three production.
 *
 * The figure is the fold itself: each hex folded with one more line carrying the
 * row's shares, less the hex folded without it. The fold sums these shares before one
 * multiplication, so the difference is the same whether the seat holds the row or
 * not. Whole shares come off both readings, for `wholeShareOf`'s reason.
 */
export function hexPercentShareOf(ctx: ValueContext, effect: CardPaysEffect): YieldBag {
  const works = effect.percent ?? 0;
  const base = effect.basePercent ?? 0;
  if ((works === 0 && base === 0) || effect.on === undefined) return {};
  let memo = HEX_PERCENT_MEMO.get(ctx);
  if (memo === undefined) {
    memo = new Map();
    HEX_PERCENT_MEMO.set(ctx, memo);
  }
  const held = memo.get(effect);
  if (held !== undefined) return held;
  const ground = groundOfHexLine(ctx, effect);
  const line: TileLine = {
    source: '',
    on: effect.on,
    percent: works,
    basePercent: base,
    food: 0,
    production: 0,
    gold: 0,
    science: 0,
    culture: 0,
    faith: 0,
  };
  const share: YieldBag = {};
  let plain: TileYieldContext | undefined;
  let raised: TileYieldContext | undefined;
  let contextOf: City | undefined;
  for (const { city, tile } of ground.hexes) {
    // The walk visits a town's hexes together, so one context serves them all.
    if (contextOf !== city) {
      plain = withoutWholeShares(cityContext(ctx.state, city));
      raised = plain === undefined ? undefined : { ...plain, lines: [...(plain.lines ?? []), line] };
      contextOf = city;
    }
    const before = foldTile(tile, plain);
    const after = foldTile(tile, raised);
    for (const voice of VOICES) share[voice] = (share[voice] ?? 0) + after[voice] - before[voice];
  }
  for (const voice of VOICES) share[voice] = (share[voice] ?? 0) / ground.over;
  memo.set(effect, share);
  return share;
}

/**
 * A town's hex context with the whole shares taken off: every line's, or only one
 * pass's when `appliedLast` names it. See `wholeShareOf`.
 */
function withoutWholeShares(
  context: TileYieldContext | undefined,
  appliedLast?: boolean,
): TileYieldContext | undefined {
  const lines = context?.lines;
  if (context === undefined || lines === undefined) return context;
  if (!lines.some((line) => line.wholePercent !== undefined)) return context;
  return {
    ...context,
    lines: lines.map((line) => {
      if (line.wholePercent === undefined) return line;
      if (appliedLast !== undefined && (line.appliedLast === true) !== appliedLast) return line;
      const bare = { ...line };
      delete bare.wholePercent;
      return bare;
    }),
  };
}

/** Does a hex condition ask whether a fortified unit stands on the hex? */
function asksAboutGarrisons(on: TileCondition | undefined): boolean {
  if (on === undefined) return false;
  if (on.test === 'fortifiedUnit') return true;
  if (on.test === 'all' || on.test === 'any') return on.of.some(asksAboutGarrisons);
  return false;
}

/**
 * **The share of this empire a scope reaches**, between nought and one — for the
 * two arms whose figure is an empire-wide rate rather than a per-town line.
 *
 * A `basis: 'share'` conversion is floored per town by the evaluator and this
 * appraisal reads it off the empire's books; a scope narrowing it to two towns
 * of five therefore takes two fifths of that rate, which is the honest middle
 * between walking every town's fold again and ignoring the scope altogether.
 */
export function scopeShare(ctx: ValueContext, scope?: CityScope): number {
  if (scope === undefined || ctx.cities <= 0) return 1;
  return townsAdmitting(ctx, scope) / ctx.cities;
}

/**
 * **What a term's label says about the ground it landed on** — "in 2 of 5 towns".
 *
 * Every changed line in this batch is still a `ValueTerm`, and a reader of the
 * spectator's feed has to be able to see *why* a coastal line read nothing. The
 * note is the count and never the test's name: the scope's own words are the
 * describers' business (`statecraft/describers.ts`) and a number is what this
 * file deals in.
 */
export function scopeNote(effect: CardEffect, ctx: ValueContext): string {
  const scope = (effect as { scope?: CityScope }).scope;
  const hexes =
    effect.kind === 'pays' && effect.where === 'hex' ? workedHexesAdmitting(ctx, effect) : null;
  const parts: string[] = [];
  if (scope !== undefined) parts.push(`in ${townsAdmitting(ctx, scope)} of ${ctx.cities} towns`);
  if (hexes !== null) parts.push(`on ${round(hexes)} worked hexes`);
  return parts.length === 0 ? '' : ` — ${parts.join(', ')}`;
}
