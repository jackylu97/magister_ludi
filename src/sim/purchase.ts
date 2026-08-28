/**
 * Buying a thing outright — the M9 gold sink, and the augur's faith price it
 * grew out of (design ledger Entry XXIX; Entry XXVIII is the religion half).
 *
 * One transaction, two banks
 * --------------------------
 * A purchase is *a city, a thing, and a bank*. Everything else follows from
 * which bank is named:
 *
 *   · **Gold** buys anything the city could otherwise build — any unlocked unit
 *     or unbuilt building — at `goldPerHammer` coin per hammer of its **full**
 *     production cost. Not a project (a conversion is not a thing), and not
 *     anything whose roster row names a different bank.
 *   · **Faith** buys exactly what the table prices in faith, which today is the
 *     augur and tomorrow the prophet. That price is the roster's own figure plus
 *     its escalation ladder, and it has nothing to do with hammers.
 *
 * The shape is `explainUnitCost`'s, in a bank instead of a basket: an ordered
 * list of labelled lines whose **fold is the price** (hard rule 5), so the
 * number on the button is the number the bank is charged and a player can see
 * why a settler costs what it costs. The conversion is one line of that list
 * rather than a multiplication afterwards, which is what makes the settler
 * ladder and the age band flow into a price tag for free: they are already lines
 * of the cost being converted.
 *
 * The full cost, never the remainder
 * ----------------------------------
 * Buying does **not** consume the banked basket and is not discounted by it. A
 * town three turns into a granary pays the same coin as one that has banked
 * nothing, and keeps its hammers. The alternative — charging for what is left —
 * makes the best moment to buy anything the moment before it would have
 * finished, which is the moment buying is worth least, and it turns every
 * purchase into a arithmetic problem about a bar.
 *
 * One completion routine
 * ----------------------
 * A bought thing arrives exactly as a built one does: `realiseItem`
 * (`cities.ts`) is the single routine, so the spawn convention, the settler
 * ladder and the completion riders cannot drift between the two ways of paying.
 * What a purchase does *not* touch is the basket — no cost subtraction, no
 * overflow, no doubling — which is the line the split in `cities.ts` is drawn
 * along.
 *
 * What does not gate a purchase
 * -----------------------------
 * **The authority freeze does not.** A torn writ stops *borders* — the accrual,
 * the expansion and `purchaseTile` — because land follows the writ, and that is
 * the whole of what the freeze is about (`bordersFrozen`, `meters.ts`). An
 * overdrawn empire may still buy a spearman: it is short of legitimacy, not of
 * coin, and a freeze on the treasury would be a second, unratified meter
 * effect wearing the first one's name.
 */

import {
  type City,
  type GameState,
  type Player,
  cityById,
  playerById,
} from './state';
import {
  type UnitCostLine,
  explainUnitCost,
  foldUnitCost,
  realiseItem,
  refreshCityDerived,
  spawnTileFor,
} from './cities';
import { type BuildingId, buildingDef, isBuildingId, isWonder } from './buildingData';
import { RULES } from './rulesData';
import { cardPurchaseRiders } from './statecraft';
import { buildError, gatingTech, hasTech } from './tech';
import { techDef } from './techData';
import { type UnitTypeId, isUnitTypeId, unitDef } from './unitData';

/** The banks a thing may be priced in. */
export type PurchaseCurrency = 'faith' | 'gold';

/**
 * A thing that can be bought: `QueueItem` minus the project.
 *
 * A project is deliberately not purchasable and it is not an omission — a
 * project never completes (Entry XXVI), so "buy it" has no referent: there is
 * nothing to be delivered, only a rate to be paid again. The type says so.
 */
export type PurchasableItem =
  | { kind: 'unit'; id: UnitTypeId }
  | { kind: 'building'; id: BuildingId };

/** What a purchase costs, and out of which bank. */
export interface PurchasePrice {
  currency: PurchaseCurrency;
  /** The ordered lines the price is the fold of. Rule 5, for a price. */
  lines: UnitCostLine[];
  /** The fold. */
  total: number;
}

/** The display name of a thing for sale. */
export function purchasableName(item: PurchasableItem): string {
  return item.kind === 'unit' ? unitDef(item.id).name : buildingDef(item.id).name;
}

/**
 * Is this a thing that can only ever be **bought**, never queued?
 *
 * The augur's `purchase.exclusive`, read as a rule rather than as a field, and
 * the one question the city panel asks before it draws a build row — a row for
 * something `setCityProduction` would refuse is a row that answers "why is this
 * greyed" with "because it does not belong in this list at all". `buildError`
 * refuses the same thing at the reducer, in the row's own words; this is the
 * interface's half, so that the two agree by construction.
 */
export function isPurchaseOnly(item: PurchasableItem): boolean {
  return item.kind === 'unit' && unitDef(item.id).purchase?.exclusive === true;
}

/**
 * How the interface offers this purchase — "Call an augur".
 *
 * On the roster row (`purchase.verb`) rather than in the panel, for the reason
 * nothing in `src/sim/` compares a type against `"augur"`: a prophet is called
 * and a mercenary is hired, and neither should teach a DOM file its name. Falls
 * back to the plain offer for a row that names no verb.
 */
export function purchaseVerb(item: PurchasableItem): string {
  const verb = item.kind === 'unit' ? unitDef(item.id).purchase?.verb : undefined;
  return verb ?? `Buy a ${purchasableName(item)}`;
}

/**
 * How many of this type this empire has already bought — the counter the faith
 * ladder climbs.
 *
 * A switch with one arm today, and it is a *register* rather than a stub: a
 * purchased unit can be spent (an augur consecrates, a settler founds), so the
 * board can never be counted and each ladder needs a field on the player. The
 * gold purchases climb no ladder of their own — a bought warrior does not make
 * the next warrior dearer, because the *production* cost it converts is already
 * whatever the empire's ladders and bands say it is.
 */
function purchasesMade(player: Player, type: UnitTypeId): number {
  return unitDef(type).consecrates === true ? player.augursPurchased : 0;
}

/**
 * The bank a thing is sold out of, or `undefined` when it is sold out of the
 * treasury like everything else.
 *
 * **Presence of `purchase` on the roster row is the marker** — nothing in
 * `src/sim/` compares a type against `"augur"` — and the rule it carries is:
 * *a row that names its own bank is sold out of that bank and no other*. That
 * one sentence is what keeps gold away from the augur without gold having to
 * know what an augur is.
 */
function rosterBank(item: PurchasableItem): PurchaseCurrency | undefined {
  return item.kind === 'unit' ? unitDef(item.id).purchase?.currency : undefined;
}

/**
 * What buying this costs *this player, in this city, right now*, as the ordered
 * list the price is the fold of — or `null` when this bank does not sell it.
 *
 * **The** price. The reducer charges it, the Religion screen prints it line by
 * line, and the city panel's tag quotes its total, so the figure on the button
 * is the figure the bank loses.
 *
 * Two shapes, chosen by which bank the roster names:
 *
 *   1. **The roster's own bank** (the augur's faith): `purchase.cost` plus
 *      `purchase.increment` for every one this empire has already called. Two
 *      lines, no era band and no card rule — see `docs/religion.md`'s open
 *      numbers for why the first augur's price is the pacing decision.
 *   2. **The treasury**: every line of the thing's production cost, then the
 *      conversion as a line of its own carrying the *difference* it makes. So a
 *      settler's price tag inherits the settler ladder and the age band because
 *      they are lines 2 and 3 of what is being converted.
 *
 * **A discount is a line of the list, never a multiplication afterwards.** The
 * vocabulary grew a `purchaseRider` with the wonders (the Great Ziggurat's
 * cheaper augurs), and it lands as `cardPurchaseRiders` gives it: the riders that
 * admit this unit are **summed**, applied **once** to the price the lines above
 * have reached, and carried as one labelled line holding the *difference* — so
 * the fold is still the price, the screen still prints why, and two riders on one
 * purchase are additive exactly as everything else in this game that stacks is.
 * It is asked in both banks, because "religious units cost less" is about the
 * augur's faith and would be a strange rule that stopped at the treasury's door.
 * Nothing speaks about a *building* being cheaper: a filter is about units, and
 * the one building nobody may buy is the one a card would most want to discount.
 *
 * `cityId` is taken because a purchase is always *somewhere* — the price is
 * asked of a real town of this empire's or it is not asked at all — and because
 * a per-city discount, if the design ever ratifies one, changes this function
 * and nothing that calls it.
 */
export function explainPurchaseCost(
  state: GameState,
  playerId: number,
  cityId: number,
  item: PurchasableItem,
  currency: PurchaseCurrency,
): PurchasePrice | null {
  if (!cityById(state, cityId)) return null;
  const bank = rosterBank(item);
  if (bank !== undefined) {
    if (bank !== currency || item.kind !== 'unit') return null;
    const spec = unitDef(item.id).purchase!;
    const lines: UnitCostLine[] = [{ source: unitDef(item.id).name, amount: spec.cost }];
    const player = playerById(state, playerId);
    const increment = spec.increment;
    if (increment !== undefined && player) {
      const bought = purchasesMade(player, item.id);
      if (bought > 0) {
        lines.push({ source: `${bought} already called`, amount: increment * bought });
      }
    }
    applyRiders(state, playerId, item.id, lines);
    return { currency: bank, lines, total: foldUnitCost(lines) };
  }

  if (currency !== 'gold') return null;
  const hammers: UnitCostLine[] =
    item.kind === 'unit'
      ? explainUnitCost(state, playerId, item.id)
      : [{ source: buildingDef(item.id).name, amount: buildingDef(item.id).cost }];
  const cost = foldUnitCost(hammers);
  const rate = RULES.production.goldPerHammer;
  const lines = [...hammers];
  // The conversion carries the **difference** it makes to the running figure,
  // exactly as `explainUnitCost`'s own lines do, so the list sums to the price
  // however the rounding falls. `Math.floor` once, at the end, for the same
  // reason Entry XVII floors once.
  lines.push({ source: `×${rate} in gold`, amount: Math.floor(cost * rate) - cost });
  // **After** the conversion, so the discount is off the price and not off the
  // hammers: a quarter off a warrior is a quarter off the coin, whatever the
  // rate happens to be.
  if (item.kind === 'unit') applyRiders(state, playerId, item.id, lines);
  return { currency: 'gold', lines, total: foldUnitCost(lines) };
}

/**
 * Folds every purchase rider that admits this unit into **one** line on the
 * price, carrying the difference it makes to the running figure.
 *
 * Summed then applied once (Entry XVII's discipline at the scale of a price
 * tag), floored once, and named after the cards that did it so the screen can
 * print the reason. Nothing is appended when no card speaks, which is every
 * purchase in most games — the list is then byte-identical to the one this
 * returned before `purchaseRider` existed.
 */
function applyRiders(
  state: GameState,
  playerId: number,
  type: UnitTypeId,
  lines: UnitCostLine[],
): void {
  const riders = cardPurchaseRiders(state, playerId, type);
  if (riders.length === 0) return;
  let percent = 0;
  for (const rider of riders) percent += rider.percent;
  if (percent === 0) return;
  const running = foldUnitCost(lines);
  const priced = Math.max(0, Math.floor((running * (100 + percent)) / 100));
  if (priced === running) return;
  lines.push({
    source: `${riders.map((rider) => rider.source).join(' + ')} (${percent > 0 ? '+' : ''}${percent}%)`,
    amount: priced - running,
  });
}

/** What this player currently holds of one bank. The one such reading. */
export function bankOf(player: Player, currency: PurchaseCurrency): number {
  return currency === 'faith' ? player.faithPool : player.gold;
}

/**
 * Reads a purchasable item off whatever a client sent, or `null`.
 *
 * `readQueueItem`'s sibling minus the project, and the one place the command's
 * JSON becomes a type. A project sent here is refused by *shape*, which is the
 * honest refusal: it is not a thing that is temporarily unaffordable, it is not
 * a thing that can be bought at all.
 */
export function readPurchasableItem(raw: unknown): PurchasableItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { kind, id } = raw as { kind?: unknown; id?: unknown };
  if (typeof id !== 'string') return null;
  if (kind === 'unit' && isUnitTypeId(id)) return { kind: 'unit', id };
  if (kind === 'building' && isBuildingId(id)) return { kind: 'building', id };
  return null;
}

/**
 * Why this player cannot buy this thing in this city, or `null` when they can.
 *
 * **The** gate: the `purchaseItem` command refuses with this sentence, the
 * Religion screen's Call an augur row is enabled by exactly it, and the city
 * panel greys every price tag with it — so a button a player can press is a
 * command the reducer takes, and a greyed one carries the reducer's own words.
 *
 * The refusals in the order a player would think of them: is this my city, is
 * this a thing at all, which bank is it sold out of, may I build it, has this
 * town already taken delivery of a soldier today, is there room for it, and can
 * I afford it.
 *
 * The middle question is the load-bearing one. **Gold's gates are production's
 * gates**, asked through `buildError` itself rather than re-derived: the
 * technology, the improved strategic resource, and the roster's own "this is
 * bought, not built" — which is what refuses gold the augur, in the augur's own
 * sentence, with no clause here that knows what an augur is. Then the two gates
 * a queue asks that `buildError` does not: a building already standing, and a
 * city too small for the unit.
 *
 * **Stacking is asked**, since M9, and that is the completion routine's doing
 * rather than a new rule: a bought piece stands where a built one would
 * (`spawnTileFor` — the city tile, else a neighbour with room), so the only
 * refusal is the one production already gives, a town boxed in on all sides.
 * The religion pass did not ask it because it put the piece on the city tile
 * regardless; sharing one routine is worth more than that one difference.
 *
 * The **authority freeze is deliberately absent** — see the module docblock.
 */
export function purchaseError(
  state: GameState,
  playerId: number,
  cityId: number,
  item: unknown,
  currency: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const city = cityById(state, cityId);
  if (!city) return `No city with id ${String(cityId)}`;
  if (city.ownerId !== playerId) return `${city.name} does not belong to ${player.name}`;

  const bought = readPurchasableItem(item);
  if (!bought) {
    const named = typeof item === 'object' && item !== null ? (item as { id?: unknown }).id : item;
    return `Nothing called "${String(named)}" is for sale`;
  }
  if (currency !== 'faith' && currency !== 'gold') {
    return `There is no bank called "${String(currency)}"`;
  }
  const name = purchasableName(bought);

  // **A wonder is never for sale**, in any bank, at any price. Civ's rule, and
  // the one refusal here that is about *what the thing is* rather than about
  // this city or this treasury — so it is asked before the currency, before the
  // gates and before the price. It is structural rather than a flag on the row:
  // a wonder carries no `purchase` spec, and the category check below would fall
  // through to gold's ordinary gates, which would happily sell one. A wonder
  // that could be bought would make "one per world" a question of who is
  // richest on the turn it unlocks.
  if (bought.kind === 'building' && isWonder(bought.id)) {
    return `${name} is a wonder — it must be built, not bought`;
  }
  // **A great person is never for sale either**, and for the wonder's reason
  // exactly: the row carries no `purchase` spec, so gold's ordinary gates below
  // would sell one at `goldPerHammer × 0` — which is to say give it away. It is
  // *called*, by a renown bucket that filled (`docs/great-people.md`), and the
  // matching refusal is in `buildError`. Asked of `UnitDef.greatWork`, so
  // nothing here compares a type against a string.
  if (bought.kind === 'unit' && unitDef(bought.id).greatWork === true) {
    return `A ${name} is called, not bought`;
  }

  const bank = rosterBank(bought);
  if (bank !== undefined && bank !== currency) {
    // Said out loud rather than left as a silent refusal: a client asking to buy
    // an augur with gold is asking for something the table does not sell, and is
    // told which bank the thing is priced in.
    return `A ${name} is bought with ${bank}, not ${currency}`;
  }
  if (bank === undefined && currency !== 'gold') {
    return `A ${name} is bought with gold, not ${currency}`;
  }

  if (bank === undefined) {
    // Gold buys what the city could build, by production's own rules.
    const blocked = buildError(state, playerId, bought.kind, bought.id);
    if (blocked !== null) return blocked;
    if (bought.kind === 'building' && city.buildings.includes(bought.id)) {
      return `${city.name} has already built ${name}`;
    }
    if (bought.kind === 'unit') {
      const def = unitDef(bought.id);
      if (city.population < def.minCityPop) {
        return (
          `${city.name} needs population ${def.minCityPop} to raise a ` +
          `${def.name} (it has ${city.population})`
        );
      }
    }
  } else {
    // The tree's own gate, asked through the tree: `gatingTech` is the inversion
    // of `unlocks`, so "which node hands over an augur" has one answer and this
    // module grows no second opinion about it. `buildError` cannot be used here
    // — it refuses this row on purpose, for being purchase-only.
    const gate = gatingTech(bought.kind, bought.id);
    if (gate !== null && !hasTech(state, playerId, gate)) {
      return `${name}s need ${techDef(gate).name}`;
    }
  }

  // **One unit per city per turn** (user, 2026-08-28: "cities can only purchase
  // a single unit per turn"). Asked here rather than of the price, because it is
  // not about affordability at all: an empire with the coin for four warriors
  // may still only take delivery of one in this town today, and the other three
  // are a decision about *where*. The reading is a comparison against an
  // absolute turn (`City.purchasedUnitTurn`) — nothing counts down, so there is
  // no phase that has to clear it before the next resolution.
  //
  // Buildings are deliberately untouched: a granary and a library bought on one
  // afternoon are two things the town then has to justify, where two bought
  // soldiers are an army that skipped the queue.
  if (bought.kind === 'unit' && city.purchasedUnitTurn === state.turn) {
    return `${city.name} has already bought a unit this turn`;
  }
  if (bought.kind === 'unit' && spawnTileFor(state, city, bought.id) === null) {
    return `${city.name} has nowhere to put a ${name}`;
  }

  const price = explainPurchaseCost(state, playerId, cityId, bought, currency);
  if (!price) return `${name} is not for sale in ${currency}`;
  const held = bankOf(player, currency);
  if (held < price.total) {
    return `${name} costs ${price.total} ${currency}; ${player.name} has ${Math.floor(held)}`;
  }
  return null;
}

/**
 * Buys one thing, and charges the bank.
 *
 * Validates nothing — the rule is `purchaseError`'s and the command asks it
 * first. Five mutations and each is a rule:
 *
 *   · the bank is charged the **fold of the printed lines**, so the price the
 *     screen showed is the price paid;
 *   · a faith ladder climbs, so the next augur is dearer from this instant — a
 *     fact about the empire, exactly as `settlersBuilt` is;
 *   · the thing is realised through `realiseItem`, the **one** completion
 *     routine, so a bought piece is born exactly as a built one is and **can act
 *     this turn**;
 *   · a queued copy is struck off, because the town now has the thing and a row
 *     asking for it again is a row the queue would either drop or duplicate. The
 *     hammers banked behind it stay in the basket and pay for whatever is next;
 *   · **a bought unit spends the town's day**, stamped as the absolute turn the
 *     matching clause in `purchaseError` compares against.
 *
 * Then the panel is refreshed, because this is a mid-turn mutation of a city's
 * derived state — see `refreshCityDerived`'s register in CLAUDE.md, of which
 * this is the twelfth entry.
 */
export function purchaseItemAt(
  state: GameState,
  player: Player,
  city: City,
  item: PurchasableItem,
  currency: PurchaseCurrency,
): number | undefined {
  const price = explainPurchaseCost(state, player.id, city.id, item, currency)!;
  if (price.currency === 'faith') player.faithPool -= price.total;
  else player.gold -= price.total;
  if (item.kind === 'unit' && unitDef(item.id).consecrates === true) {
    player.augursPurchased += 1;
  }
  // The town's day is spent on units, and stamped as an absolute turn so nothing
  // has to unstamp it. Written for every unit including the augur — a faith
  // purchase is still a purchase, and the rule is about how fast a town can be
  // reinforced rather than about which bank paid.
  if (item.kind === 'unit') city.purchasedUnitTurn = state.turn;

  const born =
    item.kind === 'building'
      ? realiseItem(state, city, { kind: 'building', id: item.id })
      : realiseItem(state, city, {
          kind: 'unit',
          id: item.id,
          tile: spawnTileFor(state, city, item.id)!,
        });

  // A bought thing leaves the queue. Only the **first** copy: a queue may not
  // hold two of a building anyway, and a player who queued two warriors and
  // bought one still wants the other.
  const queued = city.queue.findIndex(
    (row) => row.kind === item.kind && row.id === item.id,
  );
  if (queued >= 0) city.queue.splice(queued, 1);

  refreshCityDerived(state, city);
  // The unit's id, or `undefined` for a building. A purchase can never claim a
  // wonder — `purchaseError` refuses one outright — so neither `RealisedItem`'s
  // wonder nor its completion grants are ever populated on this path (only
  // wonders carry `onComplete` today), and there is nothing here to report
  // onward. The day an ordinary building grants something, this signature grows
  // the way `RealisedItem` already has.
  return born.unitId;
}
