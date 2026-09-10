/**
 * The Bead Race — the game's one victory condition (design ledger Entry VI,
 * `docs/beads.md`).
 *
 * **Two sources, since batch Q1** (`docs/wager.md` §5)
 * -----------------------------------------------------
 * A bead is minted by a **wager kept** (`wagers.ts`, which claims the four
 * repeatable rows through `awardBead` itself) or by a **grant** — a thing that
 * hands one over, through `awardBeadGrant`. That is the whole list, and it is a
 * shorter one than this file was written for: the feats, the endeavours and the
 * quests are retired, and the machinery that dealt them — the decks, the hands,
 * the slots, the once-a-turn deal, the count sweep, the streak book, the
 * reckonings' taking — is deleted rather than left turning over nothing. The
 * `beads` phase went with it; only `runWorldClock` is left below.
 *
 * What is kept and inert is the **announcement seam** (`awardBeadOccasion`) and
 * the **endeavour gate** (`endeavourError`): the first is how six seams say a
 * word without knowing anything about beads, and ripping it out would leave the
 * shared `Occasion` union (`occasions.ts`) with one listener; the second is the
 * rule that keeps a retired race project out of a queue, and a rule is not
 * deleted with the piece it refused (`consecrateAt`'s own excuse, one system
 * over). Both refuse everything, because every row they could reach is retired.
 *
 * One `switch` per question, in one file
 * -------------------------------------
 * A bead row names a **deed shape**, a **count** and a **boon shape**
 * (`beadData.ts`), and the only place in the game that switches on any of the
 * three is this module. That is the claim `triumphs.ts` makes for a trigger
 * kind, `statecraft.ts` for a `CardEffect.kind` and `resourceEffects.ts` for a
 * luxury's signature, made a fourth time, and it buys the same thing: **a new
 * bead is a JSON row**. Every seam below calls `awardBeadOccasion` with a word
 * and knows nothing else about the system.
 *
 * Two kinds of question, and one of them is retired
 * -------------------------------------------------
 *   · an **occasion** is announced. `awardOccasion` (`triumphs.ts`) already
 *     stands at ten of the eleven seams a bead cares about, so the bead
 *     listener is hung off that one call rather than added to ten call sites;
 *     the three occasions the Triumph table has no word for — a religion
 *     founded, a palace taken, a great person called — are hooked at their own
 *     seams, in the *mechanism*, so an AI earns them too. Every row that named
 *     one is retired, so the listener announces to nobody; see above for why it
 *     is kept. The **count** and the **streak** went with the sweep that read
 *     them (batch Q1): a deed swept once a turn was the feats' and the quests'
 *     half of this file, and `beadCount` is left below as the reading those
 *     retired rows are written against, the way their bodies are left in
 *     `data/beads.json`.
 *   · a **grant** is asked no question at all (Entry LVIII, the endgame). It is
 *     the fifth class of row and the one thing here that is not a claim on the
 *     world: a building or a node hands it over, through `awardBeadGrant`, and
 *     because it is a *reward* rather than a first it is **once per empire** —
 *     the register is asked by seat (`beadGrantedTo`) instead of by age. The
 *     Opus's golden bead, the closing technology's, and one for each of the
 *     three great works of the Observatory. The four **repeatable** rows a
 *     wager pays are grants too, and they are the other live source.
 *
 * The news is a **diff**, never a sink
 * ------------------------------------
 * `Player.beads` is append-only and turn-stamped, exactly like
 * `Player.triumphs` and for its reasons: what a command earned is the slice
 * past the length it started at (`beadsAwarded`), and what a resolution earned
 * is the same slice across every seat (`beadsSince`). That is why not one seam
 * below grew a parameter.
 *
 * The world's clock
 * -----------------
 * One clock for everybody (the user's rule), and since batch G1 it is the
 * **mean** of the board rather than the first seat's tree — the readings live
 * in `worldClock.ts` and the phase that turns it lives here (`runWorldClock`),
 * because opening an age is this file's own business: the per-age counters
 * reset there, and an age closing is the moment the wager is judged on. What
 * changed is *when* — an age is given `rules.wager.countdown` turns' notice —
 * and what it is read off.
 */

import {
  type BeadAge,
  type BeadBoon,
  type BeadCardId,
  type BeadCount,
  type BeadDeed,
  type BeadEndeavourId,
  type BeadFamily,
  type BeadKind,
  type BeadOccasion,
  type BeadGrant,
  type BeadGrantDef,
  type BeadGrantId,
  type BeadWindfall,
  BEAD_FEAT_IDS,
  anyBeadDef,
  isBeadAge,
  beadEndeavourDef,
  beadFeatDef,
  beadIsDormant,
  isBeadEndeavourId,
} from './beadData';
import type { BuildingId } from './buildingData';
import type { CardEffect, OrderBeadOccasion } from './statecraftData';
import {
  capitalCityOf,
  nearestOwnedCity,
  realiseItem,
  refreshCityDerived,
  settleGrowthWindfall,
  settlePopulationWindfall,
  settleProductionWindfall,
  spawnTileFor,
} from './cities';
import {
  foldCity,
} from './yields/town';
import { connectedCities } from './empireGold';
import type { Family } from './greatPeopleData';
import { drawGreatPersonOffer } from './greatPeople';
import { improvementDef } from './improvementData';
import { getTileAt, tileHex, wrappedDistance } from './map';
import { settleRenownWindfall } from './renown';
import { followerCount, cityReligion } from './state';
import {
  type City,
  type EarnedBead,
  type GameState,
  type Player,
  citiesOf,
  playerById,
  realPlayers,
  slottedOrderCount,
  wondersHeldBy,
} from './state';
import {
  type CardClause,
  cardBeadOccasions,
  describeEffects,
  ref,
  religionFounder,
  settleCultureWindfall,
  stripRefs,
} from './statecraft';
import { settleResearchWindfall } from './tech';
import {
  BUILDING_UNLOCK_TECH,
  LAST_TECH_AGE,
  highestAge,
  isTechId,
  techDef,
} from './techData';
import { type UnitTypeId, isCombatant, isUnitTypeId, unitDef } from './unitData';
import { bumpEconomy } from './slate';
// The world's clock is a **leaf** (batch G1): every reading of it is derived,
// and the module imports nothing but the state, the tree's ages and the rules
// sheet — so this file may ask it without the phase below becoming a cycle.
import {
  ageCountdownTurns,
  ageClosesThisTurn,
  currentWorldAge,
  lastAgeTurns,
  worldAge,
} from './worldClock';

/**
 * What one bead award did, for the line the interface announces it in.
 *
 * `TriumphAward`'s twin, and a **report**: by the time anybody reads this the
 * bead is on the record, the boon is banked and the register has been written.
 * `boon` is the ordered list of plain sentences the settlement produced, so a
 * toast never has to re-derive what a windfall paid.
 */
export interface BeadAward {
  playerId: number;
  id: BeadCardId;
  name: string;
  kind: BeadKind;
  family: BeadFamily;
  turn: number;
  /** The age it was claimed in — 0 for a row claimed once per game. */
  age: number;
  /** One plain line per thing the boon did. Empty for a bead that pays nothing. */
  boon: string[];
}

// --- the register -----------------------------------------------------------

/**
 * Has the world already given this row away, at this age?
 *
 * **The** contention rule, and it is asked of `GameState.beads.claimed` rather
 * than of any seat's own list — nearly every bead is a first-in-the-world, so
 * "the first seat by log and sweep order" is a property of the order things
 * were applied in rather than of a check somebody could forget to run.
 *
 * The key is the pair `(id, age)`, `ContestedTriumph`'s key exactly: a feat may
 * be once per game (`age` 0) or once per age of the world's clock, and a
 * reckoning is taken once for each age it closes.
 */
export function beadClaimed(state: GameState, id: BeadCardId, age: number): boolean {
  return state.beads.claimed.some((claim) => claim.id === id && claim.age === age);
}

/**
 * Has **this empire** already been given this row?
 *
 * `beadClaimed`'s sibling for the fifth class, and the one place the difference
 * between them is written down. A feat, a quest, an endeavour and a reckoning
 * are all *firsts in the world* — the world's register settles them and the key
 * is `(id, age)`. A **grant** is not a first at all (`BeadGrantDef`): the
 * closing technology pays every empire that reaches it and every realm that
 * raises Chart the Stars is paid for it, so the key is `(id, seat)` and the age
 * is not in it — a reward is not something an empire can win twice by living
 * long enough.
 */
export function beadGrantedTo(state: GameState, id: BeadCardId, playerId: number): boolean {
  return state.beads.claimed.some((claim) => claim.id === id && claim.playerId === playerId);
}

/**
 * Awards one bead to one empire, if the world has not already given it away.
 * **The** one place a bead is earned, and the only writer of `Player.beads` and
 * `GameState.beads.claimed`.
 *
 * Everything it does is in one order and each line is a rule: the dormancy is
 * refused, the register is checked, the register is written (which is what makes
 * the *next* check refuse), the seat's own append-only list is stamped, and the
 * boon is settled through the seams that already exist. A **dormant** row is
 * refused outright — awarding one would be the game paying for a rule it has
 * not written.
 *
 * The wild earns nothing: it has no Abacus, no pools and nothing to win.
 */
export function awardBead(
  state: GameState,
  playerId: number,
  id: BeadCardId,
  age: number,
): BeadAward | null {
  const player = playerById(state, playerId);
  if (!player || player.barbarian) return null;
  if (beadIsDormant(id)) return null;
  const { kind, def } = anyBeadDef(id);
  // **Which register answers depends on the class**, and it is the one branch
  // in this function: a grant is once per empire (`beadGrantedTo`), everything
  // else is once in the world at its age (`beadClaimed`). Both write the same
  // record, so the next check refuses by exactly the line this one wrote.
  // A **repeatable** grant is the one row the register does not refuse a second
  // time (`BeadGrantDef.repeatable`, the four Æra V bead Orders): the deed that
  // names it is a deed an empire chooses to repeat, so the claim is still
  // written and still announced and only the once-per-empire key is given up.
  const repeats = kind === 'grant' && (def as BeadGrantDef).repeatable === true;
  const held = kind === 'grant' ? beadGrantedTo(state, id, playerId) : beadClaimed(state, id, age);
  if (held && !repeats) return null;
  state.beads.claimed.push({ id, age, playerId: player.id, turn: state.turn });
  const earned: EarnedBead = { id, kind, family: def.family, turn: state.turn };
  player.beads.push(earned);
  // **A bead's cap is `liveEffects`' ninth source** (batch M3, `slate.ts`) —
  // a permanent step in contentment or in authority capacity, read off
  // `Player.beads` every time rather than settled when it was earned. So the
  // roll is a write the meters fold, announced where the row lands.
  bumpEconomy(state);

  const boon = 'boon' in def && def.boon !== undefined ? payBoon(state, player, def.boon) : [];
  return {
    playerId: player.id,
    id,
    name: def.name,
    kind,
    family: def.family,
    turn: state.turn,
    age,
    boon,
  };
}

// --- the occasions ----------------------------------------------------------

/**
 * Awards every live feat whose trigger is this occasion — **and since batch Q1
 * every feat is retired, so it awards nothing.**
 *
 * Kept, and kept whole, for the reason the module docblock gives: this is the
 * call six seams make to say a word without knowing anything about beads, and it
 * is the second listener on the shared `Occasion` union (`occasions.ts`). A deed
 * that names a moment is a shape the game still has; what it has no rows of is
 * deeds. The quest half of the loop *is* gone — a quest was claimable only off
 * the table, and there is no table.
 *
 * **The call every seam makes**, and the reason a seam knows nothing about
 * beads beyond a word. `awardOccasion` (`triumphs.ts`) makes it for the ten
 * occasions the Triumph table already names, so those seams were not touched at
 * all; the other three call it directly.
 *
 * `family` is the one thing an occasion may carry beyond its name: "the first
 * artist called" is four data rows rather than a fifth scope, so a recruitment
 * hands in the family it produced and a row that names one is skipped when they
 * differ. An occasion with no family matches any row that asks for none.
 *
 * Rows are walked in file order — an order the data carries — so two rows on one
 * occasion always resolve the same way. Feats first, then quests, because a feat
 * is always in play and a quest has to be on the table.
 */
export function awardBeadOccasion(
  state: GameState,
  playerId: number,
  occasion: BeadOccasion,
  family?: Family,
): BeadAward[] {
  const awards: BeadAward[] = [];
  const player = playerById(state, playerId);
  if (!player || player.barbarian) return awards;

  for (const id of BEAD_FEAT_IDS) {
    const def = beadFeatDef(id);
    if (!deedMatches(def.trigger, occasion, family)) continue;
    // A feat scoped `age` is keyed on **the earning seat's own age**, which is
    // exactly the age just entered for `ageEntered` and the age the builder
    // stands in for a wonder. The world's clock is deliberately not used here:
    // it has not been advanced yet at the moment `ageEntered` fires, and a key
    // that lagged a phase behind would hand the same feat out twice.
    const age = def.once === 'age' ? highestAge(player.techsResearched) : 0;
    const award = awardBead(state, playerId, id, age);
    if (award) awards.push(award);
  }
  return awards;
}

/** Does this deed fire on this occasion, for this family? See `awardBeadOccasion`. */
function deedMatches(deed: BeadDeed, occasion: BeadOccasion, family?: Family): boolean {
  if (deed.shape !== 'occasion') return false;
  if (deed.occasion !== occasion) return false;
  if (deed.family !== undefined && deed.family !== family) return false;
  return true;
}

/*
 * `beadHandIsShownTo` and `questIsOnTheTable` stood here and are **gone** (batch
 * Q1). The first was The Long Count's sight — an empire that kept the long count
 * saw the next age's hand before that age opened — and the second was the rule
 * that a quest is claimable only off a face-up card. Both were questions about a
 * table, and there is no table: `The Long Count` keeps its other gifts and buys
 * no early look at anything.
 */

// --- the counts -------------------------------------------------------------

/**
 * What one standing count reads for one empire, right now.
 *
 * **The one `switch` on a `BeadCount` in the game.** Every arm is a plain read
 * of the board or of a turn-stamped counter, and the aliased-discriminant idiom
 * is deliberate: the day a count is added this stops compiling until somebody
 * has written what it means.
 *
 * Nothing here mutates and nothing here rolls a die, so a count may be asked
 * from a preview, a sweep or a test with no consequences at all.
 *
 * **Nothing in the game asks it since batch Q1**, and it is kept for the reason
 * the rows it reads are kept: a retired feat, quest or reckoning still says on
 * its face what it counted, and the Compendium prints that face. Deleting the
 * reading would leave three decks of rows making a claim the code could no
 * longer answer. It is the switch a deed-shaped bead would be written against
 * the day one is wanted again.
 */
export function beadCount(state: GameState, playerId: number, count: BeadCount): number {
  const player = playerById(state, playerId);
  if (!player) return 0;
  const kind = count;
  switch (kind) {
    case 'cities':
      return citiesOf(state, playerId).length;
    case 'citiesOfSixOrMore': {
      let held = 0;
      for (const city of citiesOf(state, playerId)) {
        if (city.population >= 6) held += 1;
      }
      return held;
    }
    case 'citiesFounded':
      return player.citiesFounded;
    case 'citiesCaptured':
      return player.citiesCaptured;
    case 'citiesConnectedToCapital':
      return connectedCities(state, playerId).length;
    case 'largestCity': {
      let largest = 0;
      for (const city of citiesOf(state, playerId)) {
        if (city.population > largest) largest = city.population;
      }
      return largest;
    }
    case 'wondersHeld':
      return wondersHeld(state, playerId, null);
    case 'wondersOfWorldAgeHeld':
      return wondersHeld(state, playerId, currentWorldAge(state));
    case 'techsOfWorldAgeCompleted': {
      // **The world's clock, not this empire's** — and since batch G1 that
      // clock is the mean rather than the first seat's tree (`worldClock.ts`),
      // so a runaway leader's own Æra III nodes no longer count toward a card
      // the world has not opened.
      const age = currentWorldAge(state);
      let held = 0;
      for (const id of player.techsResearched) {
        if (isTechId(id) && techDef(id).age === age) held += 1;
      }
      return held;
    }
    case 'agesAheadOfLowestSeat': {
      // The *world's* most backward seat, which is what makes this a claim on
      // the world rather than a bank statement (Entry VI.5): a solo empire is
      // ahead of nobody and the count is zero.
      const roster = realPlayers(state);
      if (roster.length < 2) return 0;
      let lowest = Number.POSITIVE_INFINITY;
      for (const other of roster) {
        if (other.id === playerId) continue;
        lowest = Math.min(lowest, highestAge(other.techsResearched));
      }
      if (!Number.isFinite(lowest)) return 0;
      return Math.max(0, highestAge(player.techsResearched) - lowest);
    }
    case 'libraryAndUniversityCities': {
      let held = 0;
      for (const city of citiesOf(state, playerId)) {
        if (city.buildings.includes('library') && city.buildings.includes('university')) held += 1;
      }
      return held;
    }
    case 'aqueductCitiesOfTen': {
      let held = 0;
      for (const city of citiesOf(state, playerId)) {
        if (city.population >= 10 && city.buildings.includes('aqueduct')) held += 1;
      }
      return held;
    }
    case 'tilesPurchased':
      return player.tilesPurchased;
    case 'foreignFollowers': {
      let abroad = 0;
      for (const religion of state.religions) {
        // **Whoever holds the stones**, not whoever founded it — the same
        // reading `liveEffects`' seventh source takes, so a faith whose holy
        // city changed hands counts for its new keeper.
        if (religionFounder(state, religion) !== playerId) continue;
        for (const city of state.cities) {
          if (city.ownerId === playerId) continue;
          abroad += followerCount(city, religion.id);
        }
      }
      return abroad;
    }
    case 'enhancedFaithInForeignCapital': {
      for (const religion of state.religions) {
        if (religionFounder(state, religion) !== playerId) continue;
        if (religion.enhancer.length === 0) continue;
        for (const other of realPlayers(state)) {
          if (other.id === playerId) continue;
          const seat = capitalCityOf(state, other.id);
          if (seat && cityReligion(seat) === religion.id) return 1;
        }
      }
      return 0;
    }
    case 'faithOnHolyOrders':
      return player.faithOnHolyOrders;
    case 'tithesGold':
      return player.tithesGold;
    case 'scholarshipScience':
      return player.scholarshipScience;
    case 'routeYieldsThisAge':
      return player.routeYieldsThisAge;
    case 'greatPeopleThisAge':
      return player.greatPeopleThisAge;
    case 'unrevokedLegacies': {
      let held = 0;
      for (const legacy of player.legacies) {
        if (legacy.revoked !== true) held += 1;
      }
      return held;
    }
    case 'adjacentGreatWorks':
      return largestAdjacentWorkCluster(state, playerId);
    case 'greatWorkFamiliesInOneCity':
      return bestWorkFamilyCount(state, playerId);
    case 'combatUnits': {
      let under = 0;
      for (const unit of state.units) {
        if (unit.ownerId !== playerId) continue;
        if (isCombatant(unitDef(unit.type))) under += 1;
      }
      return under;
    }
    case 'unitStrength': {
      let worth = 0;
      for (const unit of state.units) {
        if (unit.ownerId !== playerId) continue;
        worth += unitDef(unit.type).combatStrength;
      }
      return worth;
    }
    case 'slottedOrders':
      // The **slotted** ones, never the whole collection: a card in the hand is
      // not a law of the realm, which is the whole of what a slot means. It
      // counted the levels of those cards until the levelling ruling of
      // 2026-09-04; a card is held once now, so this is a count of chairs — and
      // it is `slottedOrderCount` (`state.ts`) since batch H6, the same reading
      // `countOf`'s own `slottedOrders` arm makes.
      return slottedOrderCount(state, playerId);
    case 'bestCityFood':
      return bestCityYield(state, playerId, 'food');
    case 'bestCityProduction':
      return bestCityYield(state, playerId, 'production');
    case 'engineCompleted':
      // Dormant, and refused a rung higher in `awardBead`. Zero here so the
      // switch stays exhaustive and the feat that names it is inert rather than
      // wrong. See `docs/beads.md` for what it waits on.
      return 0;
    default: {
      const unhandled: never = kind;
      void unhandled;
      return 0;
    }
  }
}

/**
 * Wonders standing in this empire's cities, optionally only those of one age.
 *
 * The count is `wondersHeldBy` (`state.ts`) since batch H6 — the same three
 * loops stood in `statecraft.ts`'s `countOf` and a wonder counted one way for a
 * feat and another for a card would be drift no test asks about. What stays here
 * is the *era*, because an era is the tree's answer and the shared reading is a
 * leaf that may not read the tree: it takes the reading, it does not fetch it.
 */
function wondersHeld(state: GameState, playerId: number, age: number | null): number {
  return age === null
    ? wondersHeldBy(state, playerId)
    : wondersHeldBy(state, playerId, wonderAge, age);
}

/**
 * Which age a wonder belongs to — the age of the technology that unlocks it.
 *
 * Read off the tree rather than stored on the row, `explainUnitCost`'s age band
 * one table over: a wonder's era is *when it becomes available*, and a designer
 * who re-parents it in `techs.json` has moved it with one edit. A wonder no
 * technology names belongs to the world's first age, which is the same reading
 * `isUnlocked` takes of it.
 *
 * `BUILDING_UNLOCK_TECH` is read **inside the function** rather than hoisted
 * into a table beside it: this module and `techData.ts` are on the same import
 * graph, and a top-level read is exactly the hoisted value the module-cycle
 * test exists to catch.
 */
function wonderAge(id: BuildingId): number {
  const tech = BUILDING_UNLOCK_TECH.get(id);
  if (tech === undefined || !isTechId(tech)) return 1;
  return techDef(tech).age;
}

/** The most great-work families planted inside one of this empire's cities. */
function bestWorkFamilyCount(state: GameState, playerId: number): number {
  let best = 0;
  for (const city of citiesOf(state, playerId)) {
    const families = new Set<string>();
    for (const tile of state.map.tiles) {
      if (tile.improvement === undefined) continue;
      const family = improvementDef(tile.improvement).greatPerson;
      if (family === undefined) continue;
      if (state.tileOwner[tileIndexOf(state, tile.col, tile.row)] !== city.id) continue;
      families.add(family);
    }
    if (families.size > best) best = families.size;
  }
  return best;
}

/** A tile's index in the parallel arrays. Local so this module needs no `map` maths. */
function tileIndexOf(state: GameState, col: number, row: number): number {
  return row * state.map.width + col;
}

/**
 * The largest set of this empire's great works that all touch one another.
 *
 * "Three planted adjacent to one another" is The Patron's deed, and the honest
 * reading of it is a **clique**: three works each within one hex of the other
 * two. Answered by brute force over the works themselves — an empire holds a
 * handful, never a hundred — rather than over the map.
 */
function largestAdjacentWorkCluster(state: GameState, playerId: number): number {
  const works: { col: number; row: number }[] = [];
  for (const tile of state.map.tiles) {
    if (tile.improvement === undefined) continue;
    if (improvementDef(tile.improvement).greatPerson === undefined) continue;
    const cityId = state.tileOwner[tileIndexOf(state, tile.col, tile.row)];
    if (cityId === null || cityId === undefined) continue;
    const city = state.cities.find((one) => one.id === cityId);
    if (!city || city.ownerId !== playerId) continue;
    works.push({ col: tile.col, row: tile.row });
  }
  if (works.length === 0) return 0;

  // Adjacency asked of the *hex grid* rather than of a neighbour walk, because
  // the map wraps east to west and `wrappedDistance` is the one reading of that.
  const touches = (a: { col: number; row: number }, b: { col: number; row: number }): boolean => {
    const from = getTileAt(state.map, a.col, a.row);
    const to = getTileAt(state.map, b.col, b.row);
    if (!from || !to) return false;
    return wrappedDistance(state.map, tileHex(from), tileHex(to)) === 1;
  };

  let best = 1;
  for (let i = 0; i < works.length; i++) {
    for (let j = i + 1; j < works.length; j++) {
      if (!touches(works[i]!, works[j]!)) continue;
      if (best < 2) best = 2;
      for (let k = j + 1; k < works.length; k++) {
        if (touches(works[i]!, works[k]!) && touches(works[j]!, works[k]!) && best < 3) best = 3;
      }
    }
  }
  return best;
}

/** The best one turn's yield of one voice across this empire's cities. */
function bestCityYield(state: GameState, playerId: number, key: 'food' | 'production'): number {
  let best = 0;
  for (const city of citiesOf(state, playerId)) {
    const yields = foldCity(state, city);
    const value = Math.floor(yields[key]);
    if (value > best) best = value;
  }
  return best;
}

// --- the boons --------------------------------------------------------------

// --- what a boon says -------------------------------------------------------

/**
 * A bead's boon, in words — **the one description of what a bead pays**.
 *
 * A pure describer beside the settlement, and the two are held together by
 * construction rather than by discipline: `payBoon` prints *these* strings for
 * every arm that actually paid, so the sentence on the offer card, the sentence
 * in the Compendium and the sentence in the award toast are the same sentence.
 * A second phrasing anywhere is how a card comes to promise what a settlement
 * does not deliver.
 *
 * `CardClause`, not a bare string, so a boon prints beside a card's own clauses
 * with no translation — and so a deferred half of a cap comes through struck
 * through like everything else the vocabulary cannot do yet.
 *
 * The order is the settlement's order: windfall, grant, caps.
 */
export function describeBeadBoon(boon: BeadBoon): CardClause[] {
  const clauses: CardClause[] = [];
  if (boon.windfall !== undefined) clauses.push({ text: windfallWords(boon.windfall) });
  if (boon.grant !== undefined) clauses.push({ text: grantWords(boon.grant) });
  // The **caps**, said in the vocabulary's own words: a step of contentment a
  // bead grants and a step an Order grants are the same effect, so they are
  // described by the same function. Prefixed rather than reworded, because what
  // makes a bead's version different is only that it is permanent and unslotted.
  for (const clause of describeEffects(boon.effects ?? [])) {
    const lasting: CardClause = { text: `a lasting step: ${clause.text}` };
    if (clause.deferred === true) lasting.deferred = true;
    clauses.push(lasting);
  }
  return clauses;
}

/**
 * "a one-time windfall of 200 science", "a citizen in every city".
 *
 * **`where` is printed only where it is read**, which is the honest half: a
 * windfall of gold, faith, beakers, culture or renown lands in an *empire's*
 * bank and the field is ignored by `payWindfall`, so a sentence that said "in
 * the capital" would be describing a rule the settlement does not have. Food,
 * hammers and citizens land in a town, and those say where.
 */
function windfallWords(windfall: BeadWindfall): string {
  const amount = Math.max(0, Math.floor(windfall.amount));
  const where = WHERE_WORDS[windfall.where] ?? WHERE_WORDS.capital;
  if (windfall.yield === 'population') {
    const who = amount === 1 ? 'a citizen' : `${amount} citizens`;
    return `${who} ${where}`;
  }
  if (windfall.yield === 'food' || windfall.yield === 'production') {
    return `a one-time windfall of ${amount} ${windfall.yield} ${where}`;
  }
  return `a one-time windfall of ${amount} ${windfall.yield}`;
}

const WHERE_WORDS: Record<string, string> = {
  capital: 'in the capital',
  nearest: 'in the nearest city',
  every: 'in every city',
};

/**
 * "a free settler at the capital", "a great person of your choosing".
 *
 * The unit arms carry a **keyword ref** (CLAUDE.md's rule: a describer that
 * names a thing marks it), so the word is a link wherever a click can land and
 * plain bold everywhere else. `payBoon` strips them, because a toast is not a
 * surface a player can click.
 */
function grantWords(grant: BeadGrant): string {
  if ('greatPerson' in grant) {
    return grant.greatPerson === 'choice'
      ? 'a great person of your choosing'
      : `a great person of the ${grant.greatPerson}s`;
  }
  const type: string = 'prophet' in grant ? 'prophet' : 'settler' in grant ? 'settler' : grant.unit;
  if (!isUnitTypeId(type)) return 'a free unit at the capital';
  return `a free ${ref('unit', type, unitDef(type).name.toLowerCase())} at the capital`;
}

/**
 * Settles what a bead pays, and says what it did.
 *
 * **The one `switch` on a boon shape**, and every arm reaches a seam that
 * already exists: Entry XVIII's five windfall wrappers, `realiseItem(…, { free:
 * true })` for a piece nobody paid for, and `drawGreatPersonOffer` for a name.
 * Nothing here writes a pool with a bare `+=` except the three banks that
 * accumulate and are read where they lie (gold, faith and the two that have
 * their own settlement immediately after).
 *
 * A **cap** — a permanent step in happiness, authority or route capacity — is
 * not settled at all: it is `boon.effects`, and it is read by `liveEffects`'
 * eighth source off the seat's own bead record, so a cap a bead granted is an
 * ordinary card effect in every ledger it reaches.
 *
 * Returns one plain line per thing it did, in the order it did them. Prose, so
 * hard rule 7 applies: no identifiers, and a figure is a figure.
 */
function payBoon(state: GameState, player: Player, boon: BeadBoon): string[] {
  const lines: string[] = [];

  const windfall = boon.windfall;
  if (windfall !== undefined && payWindfall(state, player, windfall)) {
    lines.push(stripRefs(windfallWords(windfall)));
  }

  const grant = boon.grant;
  if (grant !== undefined) lines.push(...payGrant(state, player, grant));

  // The caps are read, never settled — so there is nothing to succeed or fail
  // and the describer's own words go straight out. See the docblock.
  for (const clause of describeBeadBoon({ effects: boon.effects ?? [] })) {
    lines.push(stripRefs(clause.text));
  }
  return lines;
}

/** Which towns a windfall lands in. See `BeadWindfallWhere`. */
function windfallCities(state: GameState, player: Player, where: string): City[] {
  if (where === 'every') return citiesOf(state, player.id);
  if (where === 'nearest') {
    const seat = capitalCityOf(state, player.id);
    const near = seat ? nearestOwnedCity(state, player.id, { col: seat.col, row: seat.row }) : null;
    return near ? [near] : [];
  }
  const seat = capitalCityOf(state, player.id);
  return seat ? [seat] : [];
}

/**
 * Banks a windfall through the bucket's own Entry XVIII seam.
 *
 * Never a bare `+=` into a bank that owes a settlement: food goes into the
 * basket and `settleGrowthWindfall` decides whether the town grew, hammers go
 * into the basket and `settleProductionWindfall` decides whether anything
 * finished, beakers reach `settleResearchWindfall`, culture reaches
 * `settleCultureWindfall`, renown reaches `settleRenownWindfall`, and a citizen
 * granted outright is `settlePopulationWindfall` — the one windfall that fills
 * no basket at all.
 *
 * Gold and faith are the two that accumulate and are read where they lie, which
 * is `payProject`'s own reading, so they are added and nothing else is owed.
 */
function payWindfall(state: GameState, player: Player, windfall: BeadWindfall): boolean {
  const amount = Math.max(0, Math.floor(windfall.amount));
  if (amount === 0) return false;
  const cities = windfallCities(state, player, windfall.where);

  switch (windfall.yield) {
    case 'gold':
      player.gold += amount;
      // **The banks are a line of the meters too** (batch M3, `slate.ts`): a
      // card may pay contentment for each 50 banked faith or each 100 gold, so
      // a treasury that moved is an empire whose happiness may have moved.
      bumpEconomy(state);
      return true;
    case 'faith':
      player.faithPool += amount;
      bumpEconomy(state);
      return true;
    case 'science':
      player.sciencePool += amount;
      bumpEconomy(state);
      settleResearchWindfall(state, player);
      return true;
    case 'culture':
      player.culturePool += amount;
      bumpEconomy(state);
      settleCultureWindfall(state, player);
      return true;
    case 'renown':
      settleRenownWindfall(state, player, [{ family: null, amount }]);
      return true;
    case 'food':
      for (const city of cities) {
        city.foodBasket += amount;
        settleGrowthWindfall(state, city);
        refreshCityDerived(state, city);
      }
      return cities.length > 0;
    case 'production':
      for (const city of cities) {
        city.hammerBasket += amount;
        settleProductionWindfall(state, city);
        refreshCityDerived(state, city);
      }
      return cities.length > 0;
    case 'population':
      for (const city of cities) settlePopulationWindfall(state, city, amount);
      return cities.length > 0;
    default:
      return false;
  }
}

/**
 * Hands over a piece, through the path that already puts one on the board.
 *
 * `realiseItem(…, { free: true })` for every unit arm, which is what marks it
 * `freeUpkeep` — a gift is a gift, and the register of who passes that flag is
 * on `Unit.freeUpkeep`. A great person is neither built nor bought but
 * **called**, so its arm opens an offer rather than minting a piece; an empire
 * that already owes the game a decision keeps the one it has, exactly as
 * `settleRenownWindfall` refuses to deal a second.
 */
function payGrant(
  state: GameState,
  player: Player,
  grant: { unit?: string; greatPerson?: string; prophet?: boolean; settler?: boolean },
): string[] {
  if (grant.greatPerson !== undefined) {
    if (player.greatPersonOffer !== undefined) return ['A name is already waiting on you.'];
    const offer = drawGreatPersonOffer(state, player);
    if (offer.options.length === 0) return [];
    player.greatPersonOffer = offer;
    return ['A great person is offered.'];
  }
  let type: UnitTypeId | null = null;
  if (grant.prophet === true) type = 'prophet';
  else if (grant.settler === true) type = 'settler';
  else if (grant.unit !== undefined && isUnitTypeId(grant.unit)) type = grant.unit;
  if (type === null) return [];

  const seat = capitalCityOf(state, player.id);
  if (!seat) return [];
  const tile = spawnTileFor(state, seat, type);
  if (!tile) return [];
  realiseItem(state, seat, { kind: 'unit', id: type, tile }, { free: true });
  // The describer's own words, stripped: a toast is not a surface a player can
  // click, so the keyword mark comes out and the name stays.
  return [stripRefs(grantWords(grant as BeadGrant))];
}

// --- endeavours -------------------------------------------------------------

/**
 * Why this empire may not queue this race project — **and since batch Q1 the
 * answer is always the same one**: the races are retired.
 *
 * **The** gate, asked twice by design: `isUnlocked` (`tech.ts`) turns it into a
 * yes-or-no so the panel's build list offers exactly what the reducer will
 * accept, and `buildError` prints the sentence. A row an empire cannot see and
 * a row it is refused are one rule, and that rule is what keeps a withdrawn row
 * out of a queue — so it stays, refusing, rather than being deleted with the
 * piece it refused. It had three clauses (not on the table, already won by
 * somebody, the realm does not have what the race asks); the table and the race
 * are both gone, so one plain sentence is the whole of it.
 *
 * `prerequisiteMissing` and `endeavourPrerequisiteMet` went with the clauses —
 * the one `switch` on a `BeadPrerequisite`, and the tick beside "ten cities" the
 * deed sheet drew. The prerequisite itself is still read, by `beadIsDormant`,
 * which is the one thing left that asks an endeavour anything.
 */
export function endeavourError(
  state: GameState,
  playerId: number,
  id: BeadEndeavourId,
): string | null {
  void state;
  void playerId;
  const def = beadEndeavourDef(id);
  if (beadIsDormant(id)) return `${def.name} is no longer raced`;
  return null;
}

/**
 * The first empire across the line takes the bead and the boon; nobody else gets
 * either (the user's rule, 2026-08-29).
 *
 * Called by `settleProduction` the instant a finishing project completes, which
 * is why a later finisher needs no clause of its own: the register refuses the
 * claim, `awardBead` answers `null`, and that seat's hammers are simply spent —
 * a race with one winner, which is what makes it a race.
 */
export function claimEndeavour(state: GameState, city: City, id: BeadEndeavourId): BeadAward | null {
  return awardBead(state, city.ownerId, id, beadEndeavourDef(id).age);
}

/**
 * Hands one empire a bead a *thing* pays — the fifth class's one entry point.
 *
 * Two seams call it and neither knows anything else about the system, which is
 * `awardBeadOccasion`'s bargain read one class over: `payCompletionGrants`
 * (`cities.ts`) for a building that carries `{ grant: 'bead' }`, and
 * `settleResearch` (`tech.ts`) for a node that carries `paysBead`. The age is
 * `0` because a grant is not keyed by one — see `beadGrantedTo`.
 */
export function awardBeadGrant(
  state: GameState,
  playerId: number,
  id: BeadGrantId,
): BeadAward | null {
  return awardBead(state, playerId, id, 0);
}

/**
 * Hands one empire whatever **its own standing cards** mint on this occasion —
 * the four Æra V bead Orders, and the fourth seam into the grant class.
 *
 * The division of labour is the one the audit asked for: `statecraft.ts` is
 * still the only module that switches on a `CardEffect.kind`, so it answers
 * *which rows are minted* (`cardBeadOccasions`) and this answers *how a bead is
 * earned*, which is `awardBead` and nothing else. Neither seam below knows
 * about cards and neither knows about beads — each says the name of the thing
 * that just happened, exactly as the ten Triumph seams do.
 *
 * `count` is the running total of this occasion for this empire, and it is
 * passed only where the game already keeps one: The Great Enquiry pays on every
 * second node of the last age, and "how many have I finished" is a read of
 * `techsResearched` rather than a counter anybody has to maintain. An effect
 * asking for a rhythm the seam cannot count mints nothing, which is the honest
 * refusal — see `cardBeadOccasions`.
 *
 * **Nothing is reported out**: `applyCommand` diffs `beadMarks` around every
 * command and `endTurn` diffs them around a resolution, so a bead minted here
 * reaches the toast, the chronicle and the Abacus by the machinery that already
 * carries every other bead. That is the whole reason this returns its awards
 * for a caller that wants them and threads nothing.
 */
export function awardOrderBeads(
  state: GameState,
  playerId: number,
  occasion: OrderBeadOccasion,
  count?: number,
): BeadAward[] {
  const awards: BeadAward[] = [];
  const player = playerById(state, playerId);
  if (!player || player.barbarian) return awards;
  for (const bead of cardBeadOccasions(state, playerId, occasion, count)) {
    const award = awardBeadGrant(state, playerId, bead);
    if (award) awards.push(award);
  }
  return awards;
}

// --- the endgame ------------------------------------------------------------

/**
 * What closing the age settled, for the caller that has to say so out loud.
 *
 * A **report**, like everything else in this file: by the time anybody reads it
 * the reckonings are on the register and `state.winnerId` is written.
 */
export interface GreatWorkClose {
  /** The empire that raised the Opus. */
  playerId: number;
  /** The town it stands in. */
  cityId: number;
  /** The age whose reckonings were taken. */
  age: number;
  /** Those reckonings' awards, in the hand's own order. */
  awards: BeadAward[];
  /** Who won, or `null` when somebody had already won before this. */
  winnerId: number | null;
}

/**
 * **The finish line** — the Magnum Opus is finished, so the empire that finished
 * it has won (design ledger Entry LVIII; the victory ruling of 2026-09-05,
 * schema 69).
 *
 * Called from `realiseItem` for a row carrying `BuildingDef.endsTheGame`, which
 * is a *marker* like every other on that table: nothing in `src/sim/` compares a
 * building id against the Opus by name, exactly as nothing compares one against
 * the cathedral. It runs **after** the row's own completion grants, so the
 * golden bead is already on the builder's rod when the curtain comes down.
 *
 * Two beats, and each reaches machinery that already exists:
 *
 *   1. **the age closes** — the stamp is pulled forward to this turn, so the
 *      clock phase at the end of it announces the close. Beat one used to be
 *      `takeReckonings` as well, and both the reckonings (batch G2) and the
 *      table they were taken off (batch Q1) are retired: the age's measures are
 *      the wager's now, and they were judged as they were met rather than at the
 *      curtain.
 *   2. **the winner is the builder** — full stop. The beads are the *door*
 *      (`buildError` refuses the row to a rod short of `BEAD_RULES.threshold`)
 *      and no longer the *close*: an empire that filled its rod, reached the
 *      closing technology and raised a thousand hammers of great work has won,
 *      and a rival with a longer rod cannot take it off them at the last
 *      moment. The most-beads count and its builder tie-break are **retired**.
 *
 * `state.winnerId` is written only into a `null`, one of the two ways to reach
 * that field and the same discipline the other keeps: a game that has been won
 * stays won.
 */
export function closeTheGreatWork(state: GameState, city: City): GreatWorkClose {
  const age = currentWorldAge(state);
  // **Nothing is measured at the curtain since batch Q1.** Beat one used to be
  // `takeReckonings` for the world's current age — history rather than
  // arithmetic, taken because an age that ended unmeasured would be a hole in
  // the record. The reckonings retired in G2 and their table in Q1, so the hole
  // is filled by the wager instead: the age's three bars were judged as they
  // were met, all game, for everybody. `awards` stays on the report because a
  // caller that says what closing did should not change shape for this.
  const awards: BeadAward[] = [];

  // **The Opus closes the age it was raised in** (`docs/wager.md` §1: the last
  // age "closes only by the Opus … or at `lastAgeTurns` after it opened,
  // whichever is first"). Said as one comparison rather than as two rules: the
  // standing stamp is pulled forward to *this* turn, and the `worldClock` phase
  // at the end of it announces the close exactly as it would have announced the
  // backstop. Absolute, and never pushed *out* — a work raised after the
  // backstop has already fired leaves the stamp where it is.
  if (state.ageClose === undefined || state.turn < state.ageClose.turn) {
    state.ageClose = { age, turn: state.turn };
  }

  let winner: number | null = null;
  if (state.winnerId === null) {
    winner = city.ownerId;
    state.winnerId = winner;
  }

  return { playerId: city.ownerId, cityId: city.id, age, awards, winnerId: winner };
}

// --- the phase --------------------------------------------------------------

/*
 * The `beads` phase stood here and is **gone** (batch Q1, `docs/wager.md` §5).
 *
 * It had three beats and every one of them served a deed: the broom that took a
 * spent card off the table, the deal that turned one card a turn off the first
 * deck with a slot open, and the sweep that read every face-up count and streak
 * deed for every seat. The feats, endeavours and quests are retired, so the
 * phase was a walk over three empty tables — and a phase that does nothing is a
 * place somebody will one day put something.
 *
 * It had lost a fourth beat already, on 2026-09-04: the first seat to
 * `BEAD_RULES.threshold` beads simply won, and that reading never once decided a
 * game. The threshold *opens the Magnum Opus* now (`buildError`, `tech.ts`) and
 * the game is closed by the work being finished (`closeTheGreatWork`), which
 * names its builder the winner outright. The beads have been a door rather than
 * a tally since, and this phase decided nothing before it was deleted.
 *
 * `runWorldClock` is untouched and keeps its seat in `END_OF_TURN_PHASES`:
 * directly after `renown`, and now directly before `wagers`, which is the phase
 * that mints a bead these days.
 */

/** What the clock phase writes into. `TurnReport`'s two bead fields, no more. */
export interface BeadReport {
  beads: BeadAward[];
  beadAgeOpened?: BeadAge;
}

// --- the world clock --------------------------------------------------------

/**
 * **The `worldClock` phase** (batch G1, `docs/wager.md` §1): the world's age,
 * and the countdown that closes one.
 *
 * Three sentences, and each of them is a ruling:
 *
 *   1. **an age closes on the turn its stamp names.** `GameState.ageClose` is
 *      one absolute `{age, turn}` and this is the one place it is compared:
 *      when the turn arrives the age's occasion is announced to every seat
 *      (`ageClosed` — the moment G2's wagers are judged on), the closing age's
 *      reckonings are taken across the board at once, the new age's hand turns
 *      face up and the per-age counters reset.
 *   2. **a countdown opens when the world's progress crosses.** `worldAge` is
 *      the *mean* of every living empire's highest technology, floored, and the
 *      turn it first exceeds the age the world is in, that age is given
 *      `rules.wager.countdown` turns to close. Never sooner and never twice: a
 *      stamp already standing for this age is left exactly where it is.
 *   3. **the last age closes on its own.** Nothing is above it for the mean to
 *      cross into, so its stamp is written the moment it opens — the turn it
 *      opened plus `rules.wager.lastAgeTurns` — and the Great Work being raised
 *      pulls that stamp forward to *now* (`closeTheGreatWork`), which is §1's
 *      "the Opus or the backstop, whichever is first" said as one comparison
 *      rather than as two rules.
 *
 * **Where it sits.** Directly after `renown` and directly before `beads`, which
 * is exactly the seat the clock held when it was beat one of `runBeads`. The
 * position is the usual rules decision and it is one sentence: *every phase
 * that reads the world's age must run after this one*. The deed tables are the
 * loudest of them — a hand turns face up here and is swept for a bead in the
 * very next phase — and the wager's judgement and deal (G2) and the Horde's
 * surge (H1) join them behind it for the same reason. `renown` before it, so
 * the turn's standing Triumphs and its recruitments are on the register before
 * an age is snapshotted by a reckoning.
 *
 * **Why it lives in this file.** The readings are a leaf (`worldClock.ts`) that
 * every surface may ask; the *phase* is here because opening an age is the
 * bead table's own business — the reckonings, the face-up rule and the per-age
 * counters are all in this module — and `awardBeadOccasion` is the announcement
 * seam. Moving the body out would be a runtime cycle for nothing.
 */
export function runWorldClock(state: GameState, report?: BeadReport): void {
  const awards: BeadAward[] = [];

  // Read **before** anything is written, so every branch below is deciding
  // about the same board. The close is fired first: the age it opens is the age
  // the countdown clause one paragraph down is then measured against.
  if (ageClosesThisTurn(state)) {
    const closing = state.ageClose!.age;
    // Announced to every real seat at once. An age closing is a fact about the
    // *world* rather than about one empire, which is what makes it the one
    // occasion in the union announced in a sweep instead of at a verb — and why
    // it goes through `awardBeadOccasion` rather than `awardOccasion`: no
    // Triumph row names it yet, and the day one does, this line becomes
    // `awardOccasion` (which calls this one itself) and nothing else moves.
    for (const player of realPlayers(state)) {
      awards.push(...awardBeadOccasion(state, player.id, 'ageClosed'));
    }
    openBeadAge(state, closing);
    if (report) {
      const opened = currentWorldAge(state);
      // **The opening is news, not a diff.** An age opens once, on one turn, and
      // by the time the resolution returns the clock simply *is* the new number
      // — nothing on the board says it moved this turn rather than eight turns
      // ago. `TurnReport.beads`' argument for a fact that is not an award.
      if (isBeadAge(opened) && opened > closing) report.beadAgeOpened = opened;
    }
  }

  const now = currentWorldAge(state);
  const standing = state.ageClose;
  if (standing === undefined || standing.age < now) {
    // Nothing is counting down for the age the world is in. Two ways one starts:
    if (now >= LAST_TECH_AGE) {
      // **The last age**, which has no age above it and therefore no crossing to
      // wait for. It is given its length the moment it opens, so the card can
      // print a deadline from the first turn of it — and `state.turn` *is* that
      // moment: the only way into this arm is the resolution that just fired
      // the previous age's close, and once the stamp below is written the arm's
      // own condition is false for the rest of the game.
      state.ageClose = { age: now, turn: state.turn + lastAgeTurns() };
    } else if (worldAge(state) > now) {
      // **The crossing.** The middle of the board has entered the next age, so
      // the age the world is in is given its notice.
      state.ageClose = { age: now, turn: state.turn + ageCountdownTurns() };
    }
  }

  if (report) report.beads.push(...awards);
}

/**
 * Opens an age: the per-age counters reset.
 *
 * It had two beats before it since batch Q1 took them. **The closing age's
 * reckonings** were taken first — every seat measured at once on one count, one
 * victor, ties paying nobody — and then the **new age's hand turned face up**.
 * The reckonings retired in G2 and the hand in Q1, so what is left is the reset,
 * and the order that mattered (the counters were reset *after* the reckonings
 * had read them) no longer has two things to order.
 *
 * The counters are still reset here rather than in the clock phase above,
 * because "the age turned over" is the fact that zeroes them and this is the one
 * place that fact is written down. `Player.routeYieldsThisAge` and
 * `Player.greatPeopleThisAge` are read by the wager's own countings.
 */
function openBeadAge(state: GameState, closing: number): void {
  void closing;
  for (const player of state.players) {
    player.routeYieldsThisAge = 0;
    player.greatPeopleThisAge = 0;
  }
}

/*
 * Five routines stood here and are **gone** (batch Q1, `docs/wager.md` §5):
 *
 *   · `takeReckonings` — the closing age's snapshot, taken off the cards that
 *     were face up in that age's hand. The rows retired in G2 and it has
 *     answered `[]` ever since; with the hands deleted it has nothing to read.
 *   · `cardIsSpent` and `clearSpentCards` — the broom that took a claimed card
 *     off the table so the deck could deal into the freed slot.
 *   · `dealOneCard` — one card a turn, off the first deck with a slot open,
 *     face down until its age opened.
 *   · `sweepStandingBeads` and `standingDeedHolds` — the once-a-turn read of
 *     every count and streak deed, and the streak book that made "ten turns
 *     together" mean together.
 *
 * All five were the deal and the sweep, and the deeds they served are retired.
 * What replaced them is `wagers.ts`: an age deals three bars, a seat stakes one,
 * and a bead is minted the turn a bar is met.
 */
/*
 * `namePossibleWinner` stood here until 2026-09-04 and is **retired**: crossing
 * the threshold no longer wins the game, it opens the Magnum Opus (see
 * `runBeads`, and `buildError` in `tech.ts`). `GameState.winnerId` therefore has
 * two writers rather than three — `updateElimination` and `closeTheGreatWork` —
 * and neither clears a winner the other named.
 */

// --- the news ---------------------------------------------------------------

/**
 * The beads past a remembered length of one empire's list — **the diff a command
 * reports**.
 *
 * `triumphsAwarded`' twin, and here for its reason: `Player.beads` is
 * append-only and stamped, so a caller that remembered the length before a
 * mechanism ran can slice exactly what that mechanism earned, whatever depth it
 * earned it at. The boon lines are not on the record and are not re-derived —
 * a diff says *what* was earned, and the settlement's own report says what it
 * paid.
 */
export function beadsAwarded(player: Player, from: number): BeadAward[] {
  const awards: BeadAward[] = [];
  for (let i = Math.max(0, from); i < player.beads.length; i++) {
    const earned = player.beads[i]!;
    const { def } = anyBeadDef(earned.id);
    awards.push({
      playerId: player.id,
      id: earned.id,
      name: def.name,
      kind: earned.kind,
      family: earned.family,
      turn: earned.turn,
      age: 0,
      boon: [],
    });
  }
  return awards;
}

/** One remembered length per player id. The other half of `beadsSince`. */
export function beadMarks(state: GameState): number[] {
  return state.players.map((player) => player.beads.length);
}

/** The same diff across **every** seat — what a whole resolution earned. */
export function beadsSince(state: GameState, lengths: readonly number[]): BeadAward[] {
  const awards: BeadAward[] = [];
  for (const player of state.players) {
    awards.push(...beadsAwarded(player, lengths[player.id] ?? 0));
  }
  return awards;
}

/** One bead that pays a cap, and what it pays. See `beadCapEffects`. */
export interface BeadCapLine {
  id: BeadCardId;
  name: string;
  effects: readonly CardEffect[];
}

/**
 * The permanent effects this seat's beads have granted — **`liveEffects`' eighth
 * source**.
 *
 * The cap form of a boon (`BeadBoon.effects`) is not settled when it is earned:
 * it is read off the seat's own bead record every time anybody asks, so a step
 * of contentment a bead granted is an ordinary card effect in every ledger it
 * reaches and `statecraft.ts` stays the one module that switches on a
 * `CardEffect.kind`.
 *
 * Walked in earn order, which is the order the record carries, so no ledger
 * reshuffles itself. Answers `[]` for the overwhelmingly common seat that has
 * earned nothing paying a cap.
 */
export function beadCapEffects(player: Player): BeadCapLine[] {
  const lines: BeadCapLine[] = [];
  for (const earned of player.beads) {
    const { def } = anyBeadDef(earned.id);
    const boon = 'boon' in def ? def.boon : undefined;
    const effects = boon?.effects;
    if (!effects || effects.length === 0) continue;
    lines.push({ id: earned.id, name: def.name, effects });
  }
  return lines;
}

/**
 * May this empire put this project in a queue at all?
 *
 * The yes-or-no half of `endeavourError`, so `isUnlocked` and `buildError` are
 * one rule asked twice — a row the panel offers is a queue the reducer takes,
 * and the *reason* the player reads is the reducer's own. Anything that is not
 * an endeavour is not this module's business and answers `true`.
 */
export function endeavourIsOffered(state: GameState, playerId: number, id: string): boolean {
  if (!isBeadEndeavourId(id)) return true;
  return endeavourError(state, playerId, id) === null;
}
