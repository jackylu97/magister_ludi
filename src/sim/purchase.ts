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
 *   · **Faith** buys exactly what the table prices in faith — the augur, the
 *     prophet, the inquisitor. That price is the roster's own figure plus its
 *     escalation ladder, and it has nothing to do with hammers.
 *   · **Faith, again, where a town has earned it** (Entry LVIII): a city holding
 *     a building marked `faithPurchases` — the Reliquary — sells *ordinary*
 *     units out of the faith bank too, at `faithPerHammer` per hammer of the
 *     same production cost gold converts. It is the treasury's branch with one
 *     number swapped, not a third kind of transaction, and it widens which bank
 *     may pay rather than what may be bought.
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
  type QueueItem,
  type UnitPurchaseBucket,
  cityById,
  playerById,
} from './state';
import {
  type ProductionCompletion,
  type RealisedItem,
  type UnitCostLine,
  explainUnitCost,
  foldUnitCost,
  productionSettledBy,
  queueItemCost,
  queueItemName,
  realiseItem,
  refreshCityDerived,
  settleProductionWindfall,
  spawnTileFor,
} from './cities';
import { type BuildingId, buildingDef, isBuildingId, isWonder } from './buildingData';
import { RULES } from './rulesData';
import {
  cardPurchaseRiders,
  payWindfallGrants,
  settleCultureWindfall,
  windfallPayout,
} from './statecraft';
import { buildError, gatingTech, hasTech, isUnlocked, settleResearchWindfall } from './tech';
import { techDef } from './techData';
import { type UnitTypeId, isCivilian, isUnitTypeId, unitDef } from './unitData';

/** The banks a thing may be priced in. */
export type PurchaseCurrency = 'faith' | 'gold';

/**
 * Which "one a turn" this purchase spends — **the** rule, asked in exactly two
 * places (`purchaseError` reads the bucket, `purchaseItemAt` writes it).
 *
 * Two questions in order, which is the user's own sentence read literally
 * (2026-09-02: "faith buying, buying a civilian unit, and buying a military
 * unit all counted separately"):
 *
 *   1. **which bank paid** — everything out of faith is one bucket, because a
 *      town calling an augur or a prophet has not spent the afternoon it would
 *      otherwise have given a garrison, and the two banks never compete; then
 *   2. **is the piece a combatant** — `isCivilian`, the roster's own reading,
 *      so a caravan is bought out of the civilian bucket for being a
 *      non-combatant and not for being called a trader. Nothing here compares a
 *      type against a name.
 *
 * A fourth class is a member of `UnitPurchaseBucket` and one more clause here;
 * there is deliberately nowhere else the question is asked.
 */
export function unitPurchaseBucket(
  type: UnitTypeId,
  currency: PurchaseCurrency,
): UnitPurchaseBucket {
  if (currency === 'faith') return 'faith';
  return isCivilian(unitDef(type)) ? 'civilianGold' : 'militaryGold';
}

/**
 * What a spent bucket is called in the refusal. Plain words (hard rule 7): a
 * player is told what they have already done, not which field holds it.
 */
function bucketWords(bucket: UnitPurchaseBucket): string {
  if (bucket === 'faith') return 'a unit with faith';
  return bucket === 'civilianGold' ? 'a civilian unit' : 'a military unit';
}

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
  return item.kind === 'unit'
    ? unitDef(item.id).purchase?.exclusive === true
    : buildingDef(item.id).purchaseOnly === true;
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
  const def = unitDef(type);
  if (def.consecrates === true) return player.augursPurchased;
  // The prophet's own ladder, and a **second** counter rather than a share of
  // the augur's: the two climb at different rates from different bases (40 +15
  // against 120 +60), so one counter would have made the first prophet cost
  // whatever six augurs had already run the price up to.
  if (def.prophesies === true) return player.prophetsPurchased;
  return 0;
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
 *      lines, no era band and no card rule — see `docs/deprecated/religion.md`'s open
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
 * **And it is asked of a building too** (2026-08-28): Crassus and Jakob Fugger
 * both discount "units and buildings", so a rider names the *kind* it rides on
 * (`CardPurchaseRiderEffect.on`) beside the unit filter it always had. The one
 * building nobody may buy is still the one a card would most want to discount —
 * `purchaseError` refuses a wonder before a price is ever asked for.
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
    applyRiders(state, playerId, item, lines);
    return { currency: bank, lines, total: foldUnitCost(lines) };
  }

  // The treasury's bank, **or the faith bank a Reliquary opens in this town**
  // (Entry LVIII). Both convert the same production cost at their own rate, so
  // the two are one branch with one number swapped rather than two prices.
  if (currency !== 'gold' && !faithBankOpen(state, cityId, item, currency)) return null;
  const hammers: UnitCostLine[] =
    item.kind === 'unit'
      ? explainUnitCost(state, playerId, item.id)
      : [{ source: buildingDef(item.id).name, amount: buildingDef(item.id).cost }];
  const cost = foldUnitCost(hammers);
  const rate = hammerRate(currency);
  const lines = [...hammers];
  // The conversion carries the **difference** it makes to the running figure,
  // exactly as `explainUnitCost`'s own lines do, so the list sums to the price
  // however the rounding falls. `Math.floor` once, at the end, for the same
  // reason Entry XVII floors once.
  lines.push({ source: `×${rate} in ${currency}`, amount: Math.floor(cost * rate) - cost });
  // **After** the conversion, so the discount is off the price and not off the
  // hammers: a quarter off a warrior is a quarter off the coin, whatever the
  // rate happens to be. Asked for a **building** too since 2026-08-28 — Crassus
  // and Jakob Fugger both discount "units and buildings", and the building half
  // of that was the deferred sentence on both rows.
  applyRiders(state, playerId, item, lines);
  return { currency, lines, total: foldUnitCost(lines) };
}

/**
 * Does **this town** sell ordinary units out of the faith bank? The Reliquary's
 * third clause, and the one question it asks (Entry LVIII).
 *
 * **Presence of the marker on a building this city holds is the answer**
 * (`BuildingDef.faithPurchases`) — nothing here compares a building id against
 * `"reliquary"`, exactly as `acceptsContributions` compares nothing against
 * `"cathedral"`. So a second such row is one flag on one JSON row.
 *
 * Three narrowings, each a decision:
 *
 *   · **Units only.** The ruled text is "units may be purchased with faith in
 *     this city". A building bought with faith would make the Reliquary a
 *     second, quieter treasury, and the town that had one would build nothing
 *     with hammers again.
 *   · **Never a row that names its own bank.** This branch is only reached when
 *     `rosterBank` said nothing, so the augur is still sold out of faith and out
 *     of nothing else, everywhere. The marker widens the ordinary bank; it does
 *     not overrule a roster row.
 *   · **The rate is `faithPerHammer`**, which is the rate a contribution already
 *     buys a hammer at, so the two ways faith reaches a city's production agree
 *     by construction and neither is the cheap one.
 */
function faithBankOpen(
  state: GameState,
  cityId: number,
  item: PurchasableItem,
  currency: PurchaseCurrency,
): boolean {
  if (currency !== 'faith' || item.kind !== 'unit') return false;
  const city = cityById(state, cityId);
  if (!city) return false;
  return city.buildings.some((id) => buildingDef(id).faithPurchases === true);
}

/**
 * Folds every purchase rider that admits this **item** into **one** line on the
 * price, carrying the difference it makes to the running figure.
 *
 * Summed then applied once (Entry XVII's discipline at the scale of a price
 * tag), floored once, and named after the cards that did it so the screen can
 * print the reason. Nothing is appended when no card speaks, which is every
 * purchase in most games — the list is then byte-identical to the one this
 * returned before `purchaseRider` existed.
 *
 * It takes the whole item rather than a unit type because a rider may now ride
 * on a building (`CardPurchaseRiderEffect.on`), and *which kind of thing is
 * being bought* is the one question a `UnitFilter` cannot answer.
 */
function applyRiders(
  state: GameState,
  playerId: number,
  item: PurchasableItem,
  lines: UnitCostLine[],
): void {
  const riders = cardPurchaseRiders(
    state,
    playerId,
    item.kind,
    item.kind === 'unit' ? item.id : undefined,
  );
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
  // **A puppet spends nothing** (ruled 2026-09-03, Civ V's rule; schema 58).
  // Asked before the item is even read, because it is not about what is for
  // sale: a town taken by force and not yet taken *in* has no purse of its own
  // at all, and annexation is the verb that opens one. The matching clause is
  // `tilePurchaseError`'s, so units, buildings and ground are refused in one
  // voice, and the city panel's lock is the same sentence said in the interface.
  if (city.puppet === true) {
    return `${city.name} is a puppet — a puppet spends nothing; annex it to invest`;
  }

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
  // **And some rows are in the data ahead of the age that opens them.** The
  // cathedral, the mint and the armoury shipped with the Æra IV endeavours that
  // race toward them; no technology names them yet, so `isUnlocked` would read
  // them as available from turn one and this bank would sell one. The matching
  // refusal is in `buildError`, and this is `UnitDef.awaitsTech`'s sentence one
  // table over. See `BuildingDef.awaitsTech`, which is temporary by construction.
  if (bought.kind === 'building' && buildingDef(bought.id).awaitsTech === true) {
    return `${name} waits on a technology this age has not reached`;
  }

  const bank = rosterBank(bought);
  if (bank !== undefined && bank !== currency) {
    // Said out loud rather than left as a silent refusal: a client asking to buy
    // an augur with gold is asking for something the table does not sell, and is
    // told which bank the thing is priced in.
    return `A ${name} is bought with ${bank}, not ${currency}`;
  }
  if (bank === undefined && currency !== 'gold' && !faithBankOpen(state, cityId, bought, currency)) {
    // A town holding a Reliquary sells its units for faith too, which is the one
    // way this sentence can be wrong — so it is asked before the sentence is
    // said, in the same function the price asks it in.
    return `A ${name} is bought with gold, not ${currency}`;
  }

  if (bank === undefined) {
    // The ordinary bank, whichever coin it is paid in: a Reliquary opens faith
    // for the rows the treasury already sells, and it changes *which bank*
    // rather than *what may be bought*, so every gate below is asked unchanged.
    //
    // Gold buys what the city could build, by production's own rules — **except
    // the one thing production refuses for being for sale**. `buildError` is
    // still the gate for everything else it asks (the tree, the resource, the
    // wonder clauses); a purchase-only building is refused by it *on purpose*,
    // so it is asked the tree's own question directly, which is exactly what the
    // augur's branch below does one bank over.
    if (isPurchaseOnly(bought)) {
      if (!isUnlocked(state, playerId, bought.kind, bought.id)) {
        return `${name} is not open to ${player.name} yet`;
      }
    } else {
      // **With the town in hand**, which is the register's own rule (CLAUDE.md:
      // a caller that has a city passes it). It buys the clauses that are about
      // *this* town rather than about the empire — a wonder's site, and since
      // the naval line a hull's coastline — so a landlocked city cannot buy the
      // trireme it cannot build, and the sentence names the town either way.
      const blocked = buildError(state, playerId, bought.kind, bought.id, city);
      if (blocked !== null) return blocked;
    }
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

  // **One unit *of each class* per city per turn** (user, 2026-08-28: "cities
  // can only purchase a single unit per turn"; widened 2026-09-02: "faith
  // buying, buying a civilian unit, and buying a military unit all counted
  // separately"). Asked here rather than of the price, because it is not about
  // affordability at all: an empire with the coin for four warriors may still
  // only take delivery of one in this town today, and the other three are a
  // decision about *where*. The reading is a comparison against an absolute
  // turn (`City.purchasedUnitTurns`) — nothing counts down, so there is no phase
  // that has to clear it before the next resolution.
  //
  // Three buckets rather than one, and the widening is the whole of the change:
  // a town calling an augur has not spent the afternoon it would have given a
  // spearman, and a worker is not a garrison. `unitPurchaseBucket` is the one
  // place that decision is made, and `purchaseItemAt` writes the bucket this
  // clause read.
  //
  // Buildings are deliberately untouched: a granary and a library bought on one
  // afternoon are two things the town then has to justify, where two bought
  // soldiers are an army that skipped the queue.
  if (bought.kind === 'unit') {
    const bucket = unitPurchaseBucket(bought.id, currency);
    if (city.purchasedUnitTurns?.[bucket] === state.turn) {
      return `${city.name} has already bought ${bucketWords(bucket)} this turn`;
    }
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
 *     fact about the empire, exactly as `unitsBuilt` is;
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
): RealisedItem {
  const price = explainPurchaseCost(state, player.id, city.id, item, currency)!;
  if (price.currency === 'faith') player.faithPool -= price.total;
  else player.gold -= price.total;
  if (item.kind === 'unit' && unitDef(item.id).consecrates === true) {
    player.augursPurchased += 1;
  }
  if (item.kind === 'unit' && unitDef(item.id).prophesies === true) {
    player.prophetsPurchased += 1;
  }
  // **The Hierophant's counter** (design ledger Entry VI). Faith spent on the
  // two holy orders, counted where the coin leaves — a *spend* is not a thing on
  // the board and `faithPool` is a bank that moves both ways, so a counter is
  // the only honest reading. Asked of the row's own markers (`consecrates`,
  // `prophesies`), so nothing here compares a type against a string.
  if (
    price.currency === 'faith' &&
    item.kind === 'unit' &&
    (unitDef(item.id).consecrates === true || unitDef(item.id).prophesies === true)
  ) {
    player.faithOnHolyOrders += price.total;
  }
  // The town's day is spent on units, and stamped as an absolute turn so nothing
  // has to unstamp it. Written for every unit including the augur — a faith
  // purchase is still a purchase — but into the **bucket** the purchase falls
  // in, which is the one `purchaseError` compared against. The record is created
  // on first use so a town that has never bought anything serialises like one
  // that never will.
  if (item.kind === 'unit') {
    const bucket = unitPurchaseBucket(item.id, price.currency);
    (city.purchasedUnitTurns ??= {})[bucket] = state.turn;
  }

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

  // **The purchase occasion** (Crassus, 2026-08-28), fired here and nowhere
  // else. `WindfallOccasion` had deliberately refused one until a card wanted to
  // pay on a purchase and *not* on a completion — which is exactly what a
  // penalty for buying your way out of a queue is. `unitCompletion` still fires
  // for a bought unit through `realiseItem` above, so Rites of Passage is still
  // one row paying once; this is a second, different occasion on the same act.
  //
  // Last, after the thing is realised and the queue is spliced, because a rider
  // may hang a timed effect on the empire and the purchase it is a bill for
  // should be complete before the bill arrives.
  const bill = windfallPayout(state, player.id, 'purchase');
  if (bill.grants.length > 0 || bill.units.length > 0 || bill.timed.length > 0 || bill.healAll) {
    for (const touched of payWindfallGrants(state, player, bill, { col: city.col, row: city.row })) {
      settleProductionWindfall(state, touched);
    }
    settleCultureWindfall(state, player);
    settleResearchWindfall(state, player);
  }

  refreshCityDerived(state, city);
  // **The whole report, not just the piece's id** — the day an ordinary building
  // had something to say arrived with the Cathedral (Entry LV). A purchase can
  // never claim a wonder (`purchaseError` refuses one outright) and no
  // purchasable row carries `onComplete` today, so `wonder` and `grants` are
  // still always absent on this path; `consecration` is not, because a cathedral
  // bought with gold is dedicated by the same line that dedicates a built one.
  // Widening the return rather than adding a second out-parameter is
  // `RealisedItem`'s own discipline, read from the caller's end.
  return born;
}

// --- contributions ----------------------------------------------------------

/**
 * Does this queue row take gold and faith poured into its basket?
 *
 * **Presence of the marker on the row is the answer** (`BuildingDef.acceptsContributions`),
 * exactly as `UnitDef.purchase` is the answer to which bank sells a unit —
 * nothing in `src/sim/` compares a building id against `"cathedral"`. A unit row
 * and a project row can never say yes, and that is a fact about the tables
 * rather than a clause here: only `BuildingDef` carries the field.
 */
export function acceptsContributions(item: QueueItem): boolean {
  return item.kind === 'building' && isBuildingId(item.id)
    ? buildingDef(item.id).acceptsContributions === true
    : false;
}

/** What one bank buys a hammer for. `goldPerHammer`'s sibling. */
function hammerRate(currency: PurchaseCurrency): number {
  return currency === 'faith'
    ? RULES.production.faithPerHammer
    : RULES.production.goldPerHammer;
}

/**
 * What one press of a contribute button would do — or `null` when this city has
 * nothing to pour a bank into.
 *
 * The preview the button prints and the arithmetic the reducer performs, in one
 * function, so the figure on the tag is the figure the bank loses: `hammers` go
 * into the basket, `spend` comes out of the bank, and `completes` is the name of
 * the thing this press would finish (asked of `productionSettledBy`, which asks
 * `planProduction` — so the promise on the button is made by the routine that
 * will keep it).
 *
 * **It never overshoots.** The hammers bought are capped at what the row still
 * needs, so a treasury of nine hundred pressed against a cathedral eleven
 * hammers short spends twenty-two gold and not a coin more. That cap is the
 * whole of why this is a narrow, declared exception to Entry XXIX's "the full
 * cost, never the remainder" rather than a second way to buy things: a
 * contribution can only ever bring the front row *level*, and the row it is
 * poured into had to declare that it takes contributions at all.
 */
export interface ContributionOffer {
  currency: PurchaseCurrency;
  /** The bank's price for one hammer — `goldPerHammer` / `faithPerHammer`. */
  rate: number;
  /** The row this would pay for, and its display name. */
  item: QueueItem;
  name: string;
  /** Hammers the row still wants after the basket. Always positive. */
  remaining: number;
  /** Hammers this press would bank. `min(remaining, floor(bank / rate))`. */
  hammers: number;
  /** What leaves the bank — `hammers × rate`, so the two can never disagree. */
  spend: number;
  /** The name of what this press finishes outright, or `null`. */
  completes: string | null;
}

export function explainContribution(
  state: GameState,
  playerId: number,
  cityId: number,
  currency: PurchaseCurrency,
): ContributionOffer | null {
  const player = playerById(state, playerId);
  const city = cityById(state, cityId);
  if (!player || !city || city.ownerId !== playerId) return null;
  const item = city.queue[0];
  if (item === undefined || !acceptsContributions(item)) return null;
  const cost = queueItemCost(state, playerId, item);
  if (cost === null) return null;
  // **Ceiled**, so the cap is the whole hammers the row still needs: a basket
  // is integral today, and a rate that could one day leave it fractional must
  // not leave a completion one tenth of a hammer short.
  const remaining = Math.ceil(cost - city.hammerBasket);
  if (remaining <= 0) return null;
  const rate = hammerRate(currency);
  if (!(rate > 0)) return null;
  const affordable = Math.floor(Math.max(0, bankOf(player, currency)) / rate);
  const hammers = Math.min(remaining, affordable);
  if (hammers <= 0) return null;
  return {
    currency,
    rate,
    item,
    name: queueItemName(item),
    remaining,
    hammers,
    spend: hammers * rate,
    completes: productionSettledBy(state, city, hammers),
  };
}

/**
 * Why this player cannot pour this bank into this city's basket, or `null` when
 * they can.
 *
 * **The** gate, `purchaseError`'s twin: the `contribute` command refuses with
 * this sentence and the city panel greys its two buttons with exactly it, so a
 * button a player can press is a command the reducer takes.
 *
 * The refusals in the order a player would think of them: is this my city, is
 * there a bank by that name, is the row at the front of the queue one that takes
 * contributions, does it still want hammers, and does the bank hold enough to
 * buy one.
 *
 * **The front of the queue and nothing else.** A city has one basket and it pays
 * for `queue[0]` (the wonders framework's rule, read here for its reason
 * exactly): hammers poured in behind a row that is not being built would be
 * hammers spent on whatever happens to reach the front, which is not what
 * anybody pressed the button for.
 *
 * The **authority freeze is deliberately absent**, for the module docblock's
 * reason: a torn writ stops borders, not banks.
 *
 * **A puppet is refused** (ruled 2026-09-04; schema 64), in `purchaseError`'s
 * own sentence and for its reason exactly: a town taken by force and not yet
 * taken *in* has no purse of its own, and a contribution is a purse being
 * opened — a narrower one than a purchase, but the same coin leaving the same
 * treasury for the same town's basket. Refusing the buy and allowing the pour
 * would have been the rule with a hole in it.
 */
export function contributeError(
  state: GameState,
  playerId: number,
  cityId: number,
  currency: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const city = cityById(state, cityId);
  if (!city) return `No city with id ${String(cityId)}`;
  if (city.ownerId !== playerId) return `${city.name} does not belong to ${player.name}`;
  // **A puppet spends nothing**, asked before the bank is even named — the
  // clause is not about what is being poured, it is about the town.
  if (city.puppet === true) {
    return `${city.name} is a puppet — a puppet spends nothing; annex it to invest`;
  }
  if (currency !== 'faith' && currency !== 'gold') {
    return `There is no bank called "${String(currency)}"`;
  }
  const item = city.queue[0];
  if (item === undefined) return `${city.name} is building nothing`;
  if (!acceptsContributions(item)) {
    return `${queueItemName(item)} takes no contributions`;
  }
  const cost = queueItemCost(state, playerId, item);
  if (cost === null) return `${queueItemName(item)} has no price`;
  const remaining = cost - city.hammerBasket;
  if (remaining <= 0) return `${city.name} has already paid for ${queueItemName(item)}`;
  const rate = hammerRate(currency);
  const held = Math.max(0, bankOf(player, currency));
  if (rate <= 0 || held < rate) {
    return `${player.name} has too little ${currency} to give`;
  }
  return null;
}

/**
 * Pours one bank into one basket, and charges the bank.
 *
 * Validates nothing — the rule is `contributeError`'s and the command asks it
 * first. Three mutations and each is a rule:
 *
 *   · the bank loses the **printed** `spend`, so the figure on the button is the
 *     figure it costs;
 *   · the basket gains the **printed** `hammers`, capped at what the row still
 *     wants, so nothing is ever banked past a completion;
 *   · the basket is then settled through `settleProductionWindfall` — Entry
 *     XVIII's register, entry 3 — which is `advanceProduction`'s own completion
 *     routine and brings the panel refresh with it. There is no completion
 *     routine here and there must never be one.
 *
 * It is deliberately **not** a `windfallPayout` occasion. A chop's hammers are a
 * grant, and a grant may be doubled by a card; these hammers are a *conversion*
 * at a printed rate, exactly as a purchase is, and a rider on them would make
 * the number on the button a lie. A card that wants to make contributions go
 * further changes the rate, which is a `CardRule` if the design ever asks for
 * one.
 */
export function contributeAt(
  state: GameState,
  player: Player,
  city: City,
  currency: PurchaseCurrency,
): ProductionCompletion | null {
  const offer = explainContribution(state, player.id, city.id, currency)!;
  if (currency === 'faith') player.faithPool -= offer.spend;
  else player.gold -= offer.spend;
  city.hammerBasket += offer.hammers;
  return settleProductionWindfall(state, city);
}
