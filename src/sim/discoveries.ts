/**
 * Ancient ruins and tribal villages: what walking into one does.
 *
 * The *scatter* is generation and lives next door (`discoveryPlacement.ts`); this
 * is the half that plays. Pure logic over `GameState`, exactly like `cities.ts`
 * and `combat.ts`: `advanceAlongPath` calls the claim as a unit's foot lands, the
 * `chooseDiscovery` command validates with `discoveryChoiceError` and then calls
 * the settlement here, and the choice card reads the same preview functions the
 * settlement will keep — so the number on the card is the number the empire gets.
 *
 * The draft doctrine, for the first time
 * --------------------------------------
 * This is the **first consumer of Entry XV's shape**, and Statecraft inherits it
 * rather than inventing a second one. The shape is three claims:
 *
 *   1. **The offer is a draw, and it is drawn once.** Three rows come out of
 *      `state.rng` at the instant of the claim and are stored on the player. They
 *      are emphatically not rolled when a card opens: under simultaneous turns
 *      two seats open screens at different moments, and an offer generated on
 *      sight would make the deal a function of when somebody looked at a monitor.
 *   2. **The pick is a command.** `chooseDiscovery { playerId, optionIndex }` —
 *      an *index*, never an id, because an index can only ever name something the
 *      player was actually dealt. It validates fully before it writes, so a
 *      refused pick leaves the state byte-identical like every other command.
 *   3. **Both halves are in the log.** The movement that claimed the site and the
 *      pick that spent it, so a replay deals the same three cards and takes the
 *      same one. Nothing here is derived from the wall clock or from which screen
 *      was open.
 *
 * Every boon is a windfall
 * ------------------------
 * Entry XVIII, without exception: a printed number, **modifier-immune** — no city
 * percentages, no meter tiers, no Entry XVII staging — settled through the
 * bucket's own `settle…Windfall` the instant it lands. A grain cache that fills
 * the basket grows the town *now*; star tablets that cover the current technology
 * finish it *now*, and the End Turn research blocker then asks what to learn
 * next. Nothing here reimplements a completion; the three settlement routines are
 * the three the end-of-turn phases use.
 *
 * The two buckets with no settlement routine, and why that is honest
 * -----------------------------------------------------------------
 * Culture and faith are banked and nothing else. That is not an omission: nothing
 * in the game *spends* either pool yet (see `Player.faithPool`, and Entry XV's
 * draft threshold, which is M12). A `settleCultureWindfall` written today would
 * be a completion routine with nothing to complete — exactly the guess Entry
 * XVIII refused to make about research until a windfall existed to serve it. When
 * the Statecraft meter lands, the forgotten hymns become its first windfall and
 * this paragraph goes away.
 */

import {
  growthSettledBy,
  nearestOwnedCity,
  productionSettledBy,
  settleGrowthWindfall,
  settleProductionWindfall,
} from './cities';
import {
  DISCOVERY_IDS,
  type DiscoveryEffect,
  type DiscoveryId,
  type DiscoveryKind,
  discoveryDef,
  discoveryWeight,
  discoveryYieldKey,
  isDiscoveryId,
} from './discoveryData';
import { type Tile, getTileAt, neighborTiles, tileHex } from './map';
import { isPassable } from './pathfind';
import type { CityYieldKey } from './resourceData';
import { nextFloat } from './rng';
import {
  cardOfferRule,
  draftSettledBy,
  offerSize,
  payWindfallGrants,
  settleCultureWindfall,
  windfallPayout,
} from './statecraft';
import {
  type City,
  type DiscoveryOffer,
  type GameState,
  type Player,
  type Unit,
  createUnit,
  playerById,
} from './state';
import { researchSettledBy, settleResearchWindfall } from './tech';
import { awardOccasion } from './triumphs';
import { type UnitTypeId, unitDef } from './unitData';
import { hasStackingRoom } from './units';

// --- the draw ---------------------------------------------------------------

/**
 * `size` rows drawn **without replacement**, weighted by the site's kind.
 *
 * **How many is the caller's, and the caller asks `offerSize`** (`statecraft.ts`,
 * the one evaluator all four drafts share) at the moment the offer opens. It
 * used to read `DISCOVERY_DATA.offerSize` straight off the table, which was the
 * base and nothing else; the base is `rules.offers.discovery` now, and a card, a
 * wonder or a great person may widen it. A number rather than a player, because
 * this function's whole business is the *bag* — who is drawing and why they draw
 * four is settled before it is called.
 *
 * Without replacement because three cards that can be the same card are two
 * cards and a joke; weighted because the flavour split is a gradient rather than
 * two tables (see `discoveryData.ts`). A pool with fewer eligible rows than the
 * offer wants hands back what it has, which is the honest answer and the one a
 * half-written data file needs.
 *
 * Deterministic in `(state.rng, kind)` and in nothing else. The candidate list is
 * `DISCOVERY_IDS` — file order — and the walk that spends the roll is in that
 * order too, so the same generator state always deals the same hand. Draws are
 * taken even when the pool is short, because a conditional draw is the one way a
 * replay can fall out of step with the game it replays.
 */
export function drawDiscoveryOffer(
  state: GameState,
  kind: DiscoveryKind,
  size: number,
): DiscoveryId[] {
  const remaining = DISCOVERY_IDS.filter((id) => discoveryWeight(id, kind) > 0);
  const wanted = Math.min(Math.max(0, Math.round(size)), remaining.length);
  const drawn: DiscoveryId[] = [];

  for (let taken = 0; taken < wanted; taken++) {
    let total = 0;
    for (const id of remaining) total += discoveryWeight(id, kind);
    // A pool whose remaining weights sum to nothing cannot be drawn from; the
    // filter above makes that unreachable, and the guard is here so a retuned
    // data file cannot turn it into a division by zero.
    if (total <= 0) break;
    let roll = nextFloat(state.rng) * total;
    let chosen = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      roll -= discoveryWeight(remaining[i]!, kind);
      if (roll < 0) {
        chosen = i;
        break;
      }
    }
    drawn.push(remaining[chosen]!);
    remaining.splice(chosen, 1);
  }
  return drawn;
}

// --- claiming ---------------------------------------------------------------

/**
 * Why this unit does not claim the site it is standing on, or `null` when it
 * does. A pure read, so the interface could paint it and a test can name it.
 *
 * Three refusals and each is a rule rather than a guard:
 *
 *   · **there is nothing here.** The common case.
 *   · **the wild does not claim.** A barbarian has no pools, no cities and no
 *     screen to be asked on, so an offer left on that seat would hang forever
 *     behind a blocker nobody can answer. It walks past instead, and the site
 *     stays for whoever finds it — the ruins were never lost to *them*.
 *   · **one at a time.** A player already holding an unanswered offer does not
 *     claim a second, and the site is **left standing** rather than consumed.
 *     Overwriting would silently destroy a boon the player had already been
 *     promised; refusing turns the blocker into what it is for — answer the ruin
 *     you found before you go looking for another.
 */
export function discoveryClaimError(state: GameState, unit: Unit, tile: Tile): string | null {
  if (tile.discovery === undefined) return `There is nothing to find on (${tile.col}, ${tile.row})`;
  const player = playerById(state, unit.ownerId);
  if (!player) return `No player with id ${String(unit.ownerId)}`;
  if (player.barbarian) return 'The wild has no use for what it never lost';
  if (player.pendingDiscovery !== undefined) {
    return `${player.name} has a discovery still awaiting judgment`;
  }
  return null;
}

/**
 * Consumes the site this unit is standing on and deals its owner three cards.
 * Returns the offer, or `null` when there was nothing to claim.
 *
 * **Any unit claims**, deliberately: a warrior that stumbles into a ruin has
 * found it as surely as a scout sent to look. Gating on the scout would have made
 * the rule a thing to remember rather than a thing to discover, and would have
 * meant a settler walking over a village and leaving it there.
 *
 * The mechanism, not the rule: `discoveryClaimError` is the rule and this asks it
 * first, so a caller may call it on every step of a march without checking
 * anything. That is exactly how it is called — from inside `advanceAlongPath`,
 * beside `breakFortify`, because "the unit entered a tile" is one question with
 * one place to answer it, whether the step came from a fresh order or from a
 * standing one resumed at the turn change.
 */
export function claimDiscoveryAt(state: GameState, unit: Unit, tile: Tile): DiscoveryOffer | null {
  if (discoveryClaimError(state, unit, tile) !== null) return null;
  const player = playerById(state, unit.ownerId)!;
  const kind = tile.discovery!;

  // The site goes first: the draw below advances `state.rng`, and a mid-draw
  // throw that left the ruin standing would be a ruin that deals a *second* hand
  // from a moved generator. Consume, then deal.
  delete tile.discovery;
  const offer: DiscoveryOffer = {
    kind,
    col: tile.col,
    row: tile.row,
    // The size is settled here, once, with the rest of the offer — see the
    // trap: an offer generated on sight would be a deal that depended on when
    // somebody looked at a screen.
    options: drawDiscoveryOffer(state, kind, offerSize(state, player.id, 'discovery')),
  };
  player.pendingDiscovery = offer;
  // A Ruin Read. **After** the offer is stored, and the ordering matters: a
  // triumph pays renown, renown can fill the ladder, and the great-person offer
  // that opens is a *second* decision this empire now owes the game — one that
  // must not be dealt into a half-written claim.
  awardOccasion(state, player.id, 'discoveryClaimed');
  return offer;
}

// --- what an option is worth ------------------------------------------------

/**
 * One option as the choice card needs to read it: what it is, what it pays, where
 * it lands, and what it would finish.
 *
 * Rule 5 for a decision rather than for a yield. Every figure here comes from the
 * function that will *keep* it — `planGrowth`, `planProduction`, `planResearch`
 * through their `…SettledBy` previews — so "completes Granary!" on a button is a
 * promise the settlement below makes good on. A card that computed its own
 * arithmetic is a card that lies the first time a carryover rebate is retuned.
 *
 * Glyphs are deliberately absent: `yield` is a `CityYieldKey`, and the interface
 * owns the table that turns one into `⚙` (`ui/figures.ts`). The simulation says
 * *which voice and how much*; saying it in emoji is presentation.
 */
export interface DiscoveryPayoff {
  id: DiscoveryId;
  name: string;
  flavor: string;
  /** The voice this pays, or `null` for a unit grant. */
  yield: CityYieldKey | null;
  /** How much of it. Zero for a unit grant. */
  amount: number;
  /** The city the lump would land in, or `null` when none would. */
  cityName: string | null;
  /** The unit it would hand over, or `null`. */
  unitName: string | null;
  /**
   * What this would finish on the spot — "Granary", "Mining", "size 4" — or
   * `null`. The whole reason a windfall settles instantly is worth saying before
   * the player picks, not after.
   */
  completes: string | null;
  /**
   * Why the payoff would be wasted, or `null`. An empire with no cities has
   * nowhere to put a lump of food, and a card that quietly paid it nowhere would
   * be the interface keeping a secret.
   */
  warning: string | null;
}

/** The city a `cityYield` effect would land in: the claimant's nearest. */
function receivingCity(state: GameState, playerId: number, offer: DiscoveryOffer): City | null {
  return nearestOwnedCity(state, playerId, { col: offer.col, row: offer.row });
}

/**
 * What one option would do for this player, right now. Pure: nothing is rolled
 * and nothing is written.
 */
export function explainDiscoveryOption(
  state: GameState,
  playerId: number,
  offer: DiscoveryOffer,
  id: DiscoveryId,
): DiscoveryPayoff {
  const def = discoveryDef(id);
  const { effect } = def;
  const payoff: DiscoveryPayoff = {
    id,
    name: def.name,
    flavor: def.flavor,
    yield: discoveryYieldKey(effect),
    amount: effect.kind === 'unit' ? 0 : effect.amount,
    cityName: null,
    unitName: null,
    completes: null,
    warning: null,
  };

  if (effect.kind === 'unit') {
    payoff.unitName = unitDef(effect.unitType).name;
    return payoff;
  }

  if (effect.kind === 'cityYield') {
    const city = receivingCity(state, playerId, offer);
    if (!city) {
      payoff.warning = 'no city near enough to receive it';
      return payoff;
    }
    payoff.cityName = city.name;
    if (effect.yield === 'food') {
      const grown = growthSettledBy(state, city, effect.amount);
      if (grown !== null) payoff.completes = `size ${grown}`;
    } else {
      payoff.completes = productionSettledBy(state, city, effect.amount);
    }
    return payoff;
  }

  if (effect.pool === 'science') {
    const player = playerById(state, playerId);
    if (player) payoff.completes = researchSettledBy(player, effect.amount);
  }
  if (effect.pool === 'culture') {
    const player = playerById(state, playerId);
    // The same `planDraft` the settlement will run, so "→ tier 4" on a button is
    // a promise the meter keeps.
    if (player) payoff.completes = draftSettledBy(player, effect.amount);
  }
  return payoff;
}

/** Every option on an offer, in the order it was dealt. */
export function explainDiscoveryOffer(
  state: GameState,
  playerId: number,
  offer: DiscoveryOffer,
): DiscoveryPayoff[] {
  return offer.options.map((id) => explainDiscoveryOption(state, playerId, offer, id));
}

// --- settlement -------------------------------------------------------------

/** What a claimed boon actually did, for the line the interface announces it in. */
export interface DiscoverySettlement {
  id: DiscoveryId;
  name: string;
  yield: CityYieldKey | null;
  amount: number;
  cityName: string | null;
  unitName: string | null;
  /** What settled on the spot — "Granary", "Mining", "size 4" — or `null`. */
  completed: string | null;
  /** Why nothing landed, when nothing did. */
  warning: string | null;
}

/**
 * Where a granted unit stands: the site itself when its category has room,
 * otherwise the first neighbour in `HEX_DIRECTIONS` order that is passable and
 * has room. `null` when there is nowhere at all.
 *
 * `spawnTileFor`'s rule in `cities.ts`, read at a hex instead of at a city, and
 * the fallback is not a nicety: the unit that *claimed* the ruin is standing on
 * it, so a granted scout is asking a tile that already holds a military unit.
 */
function grantTileFor(state: GameState, tile: Tile, type: UnitTypeId): Tile | null {
  const { category } = unitDef(type);
  if (hasStackingRoom(state, tile.col, tile.row, category)) return tile;
  for (const neighbour of neighborTiles(state.map, tileHex(tile))) {
    if (!isPassable(neighbour)) continue;
    if (hasStackingRoom(state, neighbour.col, neighbour.row, category)) return neighbour;
  }
  return null;
}

/**
 * Pays one boon, through the settlement routine its bucket owns.
 *
 * The whole of Entry XVIII in one function, and there is deliberately no
 * arithmetic in it beyond `+=`: the lump is banked at its printed size — no
 * percentages, no stages, no meters (XVIII.5) — and then the bucket's own
 * `settle…Windfall` decides whether that lump finished something. Nothing here
 * knows how a granary completes or how a citizen is re-seated; three routines
 * that the end-of-turn phases also call know, and they are the only ones that do.
 */
function payDiscovery(
  state: GameState,
  player: Player,
  offer: DiscoveryOffer,
  effect: DiscoveryEffect,
): Pick<DiscoverySettlement, 'cityName' | 'unitName' | 'completed' | 'warning'> {
  if (effect.kind === 'unit') {
    const tile = getTileAt(state.map, offer.col, offer.row);
    const seat = tile ? grantTileFor(state, tile, effect.unitType) : null;
    if (!seat) {
      return {
        cityName: null,
        unitName: unitDef(effect.unitType).name,
        completed: null,
        warning: 'nowhere for them to stand',
      };
    }
    // Through `createUnit` like every other birth, so the newcomer has full
    // movement and can act on the turn it joined — the same reading Entry
    // XVIII.2 settled for a chopped-for unit, and the same one place a pair of
    // eyes opens.
    // A ruin's escort is a thing the world handed over, so it costs its finder
    // nothing to keep. See `Unit.freeUpkeep`, entry 5.
    createUnit(state, player.id, effect.unitType, seat.col, seat.row).freeUpkeep = true;
    return { cityName: null, unitName: unitDef(effect.unitType).name, completed: null, warning: null };
  }

  if (effect.kind === 'cityYield') {
    const city = receivingCity(state, player.id, offer);
    if (!city) {
      return {
        cityName: null,
        unitName: null,
        completed: null,
        warning: 'no city to receive it',
      };
    }
    if (effect.yield === 'food') {
      city.foodBasket += effect.amount;
      const grown = settleGrowthWindfall(state, city);
      return {
        cityName: city.name,
        unitName: null,
        completed: grown ? `size ${grown.population}` : null,
        warning: null,
      };
    }
    city.hammerBasket += effect.amount;
    const built = settleProductionWindfall(state, city);
    return {
      cityName: city.name,
      unitName: null,
      completed: built ? built.name : null,
      warning: null,
    };
  }

  if (effect.pool === 'gold') {
    player.gold += effect.amount;
    return { cityName: null, unitName: null, completed: null, warning: null };
  }
  if (effect.pool === 'science') {
    player.sciencePool += effect.amount;
    const learnt = settleResearchWindfall(state, player);
    return {
      cityName: null,
      unitName: null,
      completed: learnt ? learnt.name : null,
      warning: null,
    };
  }
  // Culture settles now. This is the paragraph the module docblock promised
  // would go away: the Statecraft meter spends `culturePool`, so forgotten hymns
  // are the culture bucket's first windfall and `settleCultureWindfall` is its
  // completion routine (Entry XVIII's fourth bucket, same three shapes).
  if (effect.pool === 'culture') {
    player.culturePool += effect.amount;
    const drafted = settleCultureWindfall(state, player);
    return {
      cityName: null,
      unitName: null,
      completed: drafted ? `tier ${drafted.tier}` : null,
      warning: null,
    };
  }
  // Straight into the bank an augur is priced against (see `Player.faithPool`).
  player.faithPool += effect.amount;
  return { cityName: null, unitName: null, completed: null, warning: null };
}

/**
 * Why this player cannot take this option, or `null` when they can.
 *
 * **The** gate: the `chooseDiscovery` command refuses with this sentence and the
 * choice card is built from exactly the offer it answers `null` about, so a card
 * a player can click is a command the reducer takes. It asks nothing about the
 * turn — that is a question about the actor and belongs to the command.
 */
export function discoveryChoiceError(
  state: GameState,
  playerId: number,
  optionIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const offer = player.pendingDiscovery;
  if (!offer) return `${player.name} has no discovery awaiting judgment`;
  if (!Number.isInteger(optionIndex)) {
    return `chooseDiscovery needs an integer optionIndex, got ${String(optionIndex)}`;
  }
  const index = optionIndex as number;
  if (index < 0 || index >= offer.options.length) {
    return `Option ${index} is not one of the ${offer.options.length} offered`;
  }
  // Only reachable from a hand-edited save or a data file retuned under a live
  // game; an offer naming a row this build does not have is unanswerable, and
  // saying so beats throwing inside the settlement.
  if (!isDiscoveryId(offer.options[index])) {
    return `Option ${index} names no known discovery`;
  }
  return null;
}

/**
 * Takes one option, pays it, and clears the offer. Validates nothing — the rule
 * is `discoveryChoiceError`'s and the command asks it first. This is the
 * mechanism, exactly as `foundCityAt` is.
 *
 * The offer is cleared **before** the boon is paid, and that ordering is not
 * cosmetic: a granted scout opens a pair of eyes, and a completed technology
 * re-seats every citizen in the empire, so anything reading `pendingDiscovery`
 * during the payment would see a decision that has in fact already been made. The
 * key is *deleted* rather than set to `undefined`, so a player who has answered
 * a ruin serialises identically to one who never found it.
 */
export function settleDiscovery(
  state: GameState,
  player: Player,
  optionIndex: number,
): DiscoverySettlement | null {
  const offer = player.pendingDiscovery;
  if (!offer) return null;
  const id = offer.options[optionIndex];
  if (id === undefined || !isDiscoveryId(id)) return null;

  delete player.pendingDiscovery;
  // Curious Elders' five beakers: a rider on the *claim*, paid whichever option
  // was taken, because the card is about finding something rather than about
  // what was found.
  const rider = windfallPayout(state, player.id, 'discovery');
  if (rider.grants.length > 0) {
    payWindfallGrants(state, player, rider, { col: offer.col, row: offer.row });
    settleCultureWindfall(state, player);
  }
  const def = discoveryDef(id);
  const paid = payDiscovery(state, player, offer, def.effect);
  // The Athenaeum of the Road: the other two options are paid as well. Taken
  // after the chosen one so the announced settlement is still the card the
  // player clicked, and so a growth or a completion resolves in the order the
  // options were dealt — which is the order a replay reproduces.
  if (cardOfferRule(state, player.id, 'discoveryClaimAll')) {
    for (let i = 0; i < offer.options.length; i++) {
      if (i === optionIndex) continue;
      const other = offer.options[i];
      if (other === undefined || !isDiscoveryId(other)) continue;
      payDiscovery(state, player, offer, discoveryDef(other).effect);
    }
  }
  return {
    id,
    name: def.name,
    yield: discoveryYieldKey(def.effect),
    amount: def.effect.kind === 'unit' ? 0 : def.effect.amount,
    ...paid,
  };
}
