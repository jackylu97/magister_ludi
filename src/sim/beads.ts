/**
 * The Bead Race — the game's one victory condition (design ledger Entry VI,
 * `docs/beads.md`).
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
 * Four kinds of question, four ways of asking
 * -------------------------------------------
 *   · an **occasion** is announced. `awardOccasion` (`triumphs.ts`) already
 *     stands at ten of the eleven seams a bead cares about, so the bead
 *     listener is hung off that one call rather than added to ten call sites;
 *     the three occasions the Triumph table has no word for — a religion
 *     founded, a palace taken, a great person called — are hooked at their own
 *     seams, in the *mechanism*, so an AI earns them too.
 *   · a **count** is swept, once a turn, in the `beads` phase. "Twelve cities
 *     of six citizens" is a fact about the board, not an event, and a sweep
 *     cannot miss a threshold crossed and uncrossed inside one turn.
 *   · a **streak** is the same count with a memory: `GameState.beads.streaks`
 *     holds a per-seat run per card, raised on a turn the count holds and reset
 *     to zero on a turn it does not, so "for ten turns together" means
 *     together.
 *   · a **grant** is asked no question at all (Entry LVIII, the endgame). It is
 *     the fifth class of row and the one thing here that is not a claim on the
 *     world: a building or a node hands it over, through `awardBeadGrant`, and
 *     because it is a *reward* rather than a first it is **once per empire** —
 *     the register is asked by seat (`beadGrantedTo`) instead of by age. The
 *     Opus's golden bead, the closing technology's, and one for each of the
 *     three great works of the Observatory.
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
 * `state.beads.worldAge` is the highest age any real seat has reached, and an
 * age **opens** the turn it rises: that age's hand turns face up, the closing
 * age's reckonings are taken across every seat at once, and the per-age
 * counters reset. One clock for everybody (the user's rule), which is what
 * makes rushing the tree *call* a reckoning rather than forfeit one.
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
  type BeadGrantId,
  type BeadPrerequisite,
  type BeadWindfall,
  BEAD_DECK_AGES,
  BEAD_FEAT_IDS,
  BEAD_QUEST_IDS,
  BEAD_RULES,
  anyBeadDef,
  isBeadAge,
  beadEndeavourDef,
  beadFeatDef,
  beadHandSize,
  beadIsDormant,
  beadQuestDef,
  beadReckoningDef,
  isBeadEndeavourId,
  isBeadReckoningId,
} from './beadData';
import { type BuildingId, isWonder, buildingDef } from './buildingData';
import type { CardEffect } from './statecraftData';
import {
  capitalCityOf,
  cityYields,
  nearestOwnedCity,
  realiseItem,
  refreshCityDerived,
  settlePopulationWindfall,
  settleProductionWindfall,
  spawnTileFor,
  settleGrowthWindfall,
} from './cities';
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
  playerById,
  realPlayers,
} from './state';
import {
  type CardClause,
  describeEffects,
  ref,
  religionFounder,
  settleCultureWindfall,
  stripRefs,
} from './statecraft';
import { settleResearchWindfall } from './tech';
import { BUILDING_UNLOCK_TECH, highestAge, isTechId, techDef, techsGrant } from './techData';
import { type UnitTypeId, isCombatant, isUnitTypeId, unitDef } from './unitData';

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
  const held = kind === 'grant' ? beadGrantedTo(state, id, playerId) : beadClaimed(state, id, age);
  if (held) return null;
  state.beads.claimed.push({ id, age, playerId: player.id, turn: state.turn });
  const earned: EarnedBead = { id, kind, family: def.family, turn: state.turn };
  player.beads.push(earned);

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
 * Awards every live feat and occasion quest whose trigger is this occasion.
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
  for (const id of BEAD_QUEST_IDS) {
    const def = beadQuestDef(id);
    if (!deedMatches(def.deed, occasion, family)) continue;
    if (!questIsOnTheTable(state, id)) continue;
    const award = awardBead(state, playerId, id, 0);
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

/**
 * Is this age's hand **shown to this seat**, whether or not the world has turned
 * it face up?
 *
 * **The Long Count** (the tree pass of 2026-08-30): an empire that keeps the long
 * count sees the *next* age's hand before that age opens. It is a per-seat
 * reading rather than a write, and that is the whole of why it is here and not a
 * second `faceUp` rule: `card.faceUp` is the **world's** fact and it is what
 * makes a quest claimable (`questIsOnTheTable`), so turning one over early for
 * one seat would hand that seat a bead nobody else could race for. What the
 * technology buys is *sight* — knowing what the age will ask before it asks —
 * and sight is a question a screen asks, never a field.
 *
 * Exactly one age ahead, so a realm that reaches it in Æra II is not handed the
 * whole book.
 */
export function beadHandIsShownTo(state: GameState, playerId: number, age: number): boolean {
  if (age <= state.beads.worldAge) return true;
  if (age !== state.beads.worldAge + 1) return false;
  const player = playerById(state, playerId);
  return player !== undefined && techsGrant(player.techsResearched, 'theLongCount');
}

/** Is this quest's card face up in its age's hand? A quest is claimable only there. */
function questIsOnTheTable(state: GameState, id: BeadCardId): boolean {
  for (const age of BEAD_DECK_AGES) {
    for (const card of state.beads.hands[String(age)] ?? []) {
      if (card.id === id) return card.faceUp;
    }
  }
  return false;
}

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
      return wondersHeld(state, playerId, state.beads.worldAge);
    case 'techsOfWorldAgeCompleted': {
      let held = 0;
      for (const id of player.techsResearched) {
        if (isTechId(id) && techDef(id).age === state.beads.worldAge) held += 1;
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
    case 'slottedOrders': {
      // The **slotted** ones, never the whole collection: a card in the hand is
      // not a law of the realm, which is the whole of what a slot means. It
      // counted the levels of those cards until the levelling ruling of
      // 2026-09-04; a card is held once now, so this is a count of chairs.
      let filled = 0;
      for (const slot of player.statecraft.slots) {
        if (slot) filled += 1;
      }
      return filled;
    }
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

/** This empire's cities, in `state.cities` order — founding order. */
function citiesOf(state: GameState, playerId: number): City[] {
  return state.cities.filter((city) => city.ownerId === playerId);
}

/** Wonders standing in this empire's cities, optionally only those of one age. */
function wondersHeld(state: GameState, playerId: number, age: number | null): number {
  let held = 0;
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    for (const id of city.buildings) {
      if (!isWonder(id)) continue;
      if (age !== null && wonderAge(id) !== age) continue;
      held += 1;
    }
  }
  return held;
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
    const yields = cityYields(state, city);
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
 * The order is the settlement's order: dice, windfall, grant, caps.
 */
export function describeBeadBoon(boon: BeadBoon): CardClause[] {
  const clauses: CardClause[] = [];
  const dice = Math.max(0, Math.floor(boon.dice ?? 0));
  if (dice > 0) clauses.push({ text: diceWords(dice) });
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

/** "a die of the Magister", "two dice of the Magister". */
function diceWords(count: number): string {
  return count === 1 ? 'a die of the Magister' : `${count} dice of the Magister`;
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
 * true })` for a piece nobody paid for, `drawGreatPersonOffer` for a name, and
 * `Player.dice` for a die. Nothing here writes a pool with a bare `+=` except
 * the three banks that accumulate and are read where they lie (gold, faith and
 * the two that have their own settlement immediately after).
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

  const dice = Math.max(0, Math.floor(boon.dice ?? 0));
  if (dice > 0) {
    // **Uncapped** (user ruling, 2026-08-30), which supersedes Entry XV's held
    // cap of three: a fourth die is kept like the first three.
    player.dice += dice;
    lines.push(stripRefs(diceWords(dice)));
  }

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
      return true;
    case 'faith':
      player.faithPool += amount;
      return true;
    case 'science':
      player.sciencePool += amount;
      settleResearchWindfall(state, player);
      return true;
    case 'culture':
      player.culturePool += amount;
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
 * Why this empire may not queue this race project, or `null` when it may.
 *
 * **The** gate, asked twice by design: `isUnlocked` (`tech.ts`) turns it into a
 * yes-or-no so the panel's build list offers exactly what the reducer will
 * accept, and `buildError` prints the sentence. A row an empire cannot see and
 * a row it is refused are one rule.
 *
 * Three clauses, in the order a player needs to hear them: the card is not on
 * the table, somebody has already finished it, or the empire does not yet have
 * what the race asks for.
 */
export function endeavourError(
  state: GameState,
  playerId: number,
  id: BeadEndeavourId,
): string | null {
  const def = beadEndeavourDef(id);
  if (beadIsDormant(id)) return `${def.name} waits on something this age has not reached`;
  // **Asked before the table**, and the order is the message: a race somebody
  // has won leaves every hand in the world the moment they win it
  // (`clearSpentCards`), so a claimed row is also an absent row — and "it is not
  // on the table" is a true sentence that tells the player nothing about why
  // their hammers stopped mattering.
  if (beadClaimed(state, id, def.age)) {
    const claim = state.beads.claimed.find((one) => one.id === id);
    const who = claim ? playerById(state, claim.playerId) : undefined;
    return who ? `${def.name} was finished first by ${who.name}` : `${def.name} is already won`;
  }
  if (!questIsOnTheTable(state, id)) return `${def.name} is not on the table`;
  const missing = prerequisiteMissing(state, playerId, def.prerequisite);
  if (missing !== null) return `${def.name} wants ${missing}`;
  return null;
}

/**
 * Does this empire already have what the race asks for?
 *
 * `prerequisiteMissing` inverted, and exported as its own question because the
 * screen asks a *different* one from `endeavourError`: a row may be met and
 * still refused (somebody else finished it), or unmet and perfectly reachable,
 * and a tick beside "ten cities" is not the same fact as a greyed button. One
 * evaluator, two readings — the `isUnlocked`/`buildError` split one scale in.
 */
export function endeavourPrerequisiteMet(
  state: GameState,
  playerId: number,
  id: BeadEndeavourId,
): boolean {
  return prerequisiteMissing(state, playerId, beadEndeavourDef(id).prerequisite) === null;
}

/**
 * What an endeavour's prerequisite is still missing, in a player's words, or
 * `null` when the empire meets it.
 *
 * The one `switch` on a `BeadPrerequisite`. Every arm is a plain read, and an
 * empire with no cities at all fails `buildingInEveryCity` rather than passing
 * it by vacuum — "in every city" is a claim about a realm, and a realm with no
 * towns has not made it.
 */
function prerequisiteMissing(
  state: GameState,
  playerId: number,
  prerequisite: BeadPrerequisite,
): string | null {
  const cities = citiesOf(state, playerId);
  const test = prerequisite.test;
  switch (test) {
    case 'citySize': {
      for (const city of cities) {
        if (city.population >= prerequisite.value) return null;
      }
      return `a city of ${prerequisite.value} citizens`;
    }
    case 'buildingInEveryCity': {
      const name = buildingDef(prerequisite.building).name.toLowerCase();
      if (cities.length === 0) return `a ${name} in every city`;
      for (const city of cities) {
        if (!city.buildings.includes(prerequisite.building)) return `a ${name} in every city`;
      }
      return null;
    }
    case 'buildingsInCities': {
      const name = buildingDef(prerequisite.building).name.toLowerCase();
      let held = 0;
      for (const city of cities) {
        if (city.buildings.includes(prerequisite.building)) held += 1;
      }
      return held >= prerequisite.cities ? null : `a ${name} in ${prerequisite.cities} cities`;
    }
    case 'activeRoutes': {
      let running = 0;
      for (const unit of state.units) {
        if (unit.ownerId === playerId && unit.trade !== undefined) running += 1;
      }
      return running >= prerequisite.value ? null : `${prerequisite.value} caravans on the road`;
    }
    case 'cities':
      return cities.length >= prerequisite.value ? null : `${prerequisite.value} cities`;
    case 'wondersHeld': {
      const held = wondersHeld(state, playerId, null);
      return held >= prerequisite.value ? null : `${prerequisite.value} wonders`;
    }
    default: {
      const unhandled: never = test;
      void unhandled;
      return null;
    }
  }
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
 * **The finish line** — the Magnum Opus is finished, so the age closes and the
 * race is settled (design ledger Entry LVIII).
 *
 * Called from `realiseItem` for a row carrying `BuildingDef.endsTheGame`, which
 * is a *marker* like every other on that table: nothing in `src/sim/` compares a
 * building id against the Opus by name, exactly as nothing compares one against
 * the cathedral. It runs **after** the row's own completion grants, and that
 * order is the whole of why the golden bead is on the builder's rod before
 * anybody counts: the bead is `{ grant: 'bead' }` on the row, and a close that
 * ran first would decide the race on a tally one short.
 *
 * Three beats, and each reaches machinery that already exists:
 *
 *   1. **the age closes** — `takeReckonings` for the world's current age, the
 *      same call `advanceWorldClock` makes when a seat enters a new one. So the
 *      final measures are taken by the one routine that takes every other
 *      measure, ties pay nobody here exactly as they pay nobody there, and the
 *      awards ride out on the ordinary bead diff (`beadsAwarded` /
 *      `beadsSince`) with no new report field anywhere.
 *   2. **the count** — most beads wins, across `realPlayers` in seat order.
 *   3. **the tie** — broken for the Opus's builder, which is the whole reason
 *      building it is worth a thousand hammers: a realm that draws level with
 *      you cannot take the game off you at the last moment. A tie between two
 *      seats that are *both* not the builder falls to seat order, which is this
 *      game's contention rule everywhere else.
 *
 * `state.winnerId` is written only into a `null`, the third way to reach that
 * field and the same discipline the other two keep: a game that has been won
 * stays won.
 */
export function closeTheGreatWork(state: GameState, city: City): GreatWorkClose {
  const age = state.beads.worldAge;
  const awards = takeReckonings(state, age);

  let winner: number | null = null;
  if (state.winnerId === null) {
    let best = -1;
    for (const player of realPlayers(state)) {
      const held = player.beads.length;
      if (held > best) {
        best = held;
        winner = player.id;
        continue;
      }
      // The builder's tie-break, and it is asked only on an exact tie: a seat
      // level with the leader takes the game only if it is the seat that raised
      // the Opus.
      if (held === best && player.id === city.ownerId) winner = player.id;
    }
    if (winner !== null) state.winnerId = winner;
  }

  return { playerId: city.ownerId, cityId: city.id, age, awards, winnerId: winner };
}

// --- the phase --------------------------------------------------------------

/**
 * The `beads` phase, in four beats. Its position in `END_OF_TURN_PHASES` is a
 * rules decision like every other entry: **directly after `renown`**, so the
 * turn's standing Triumphs are already on the register and a bead swept here
 * reads a board that has finished settling.
 *
 *   1. **the clock** — `worldAge` is the highest age any real seat holds. On the
 *      turn it rises the new age *opens*: the closing age's reckonings are taken
 *      across every seat at once, the new age's hand turns face up, and the
 *      per-age counters reset.
 *   2. **the deal** — one card a turn off the first deck that still has one, into
 *      a hand that is not yet full. Face down until its age opens.
 *   3. **the sweep** — every face-up count and streak deed, and every feat whose
 *      trigger is a count, in seat order.
 *
 * There is **no fourth beat**. Until 2026-09-04 there was one — the first seat
 * to `BEAD_RULES.threshold` beads simply won — and it never once decided a game
 * (`docs/beads.md` flagged it). The ruling moved that number one step earlier:
 * the threshold now *opens the Magnum Opus* (`buildError`, `tech.ts`), and the
 * game is still closed by the work being finished (`closeTheGreatWork`), which
 * is where the beads are counted. One number, one reading, and the finish line
 * is a thing somebody built rather than a tally quietly crossed in a phase.
 *
 * Seats are walked in `realPlayers` order throughout, so two seats that cross a
 * threshold on the same turn always resolve the same way, and the wild is
 * skipped for `runStatecraft`'s reason: it has no Abacus and nothing to win.
 */
export function runBeads(state: GameState, report?: BeadReport): void {
  const awards: BeadAward[] = [];

  const opened = advanceWorldClock(state, awards);
  clearSpentCards(state);
  dealOneCard(state);
  sweepStandingBeads(state, awards);

  if (report) {
    report.beads.push(...awards);
    // **The opening is news, not a diff.** An age opens once, on one turn, and
    // by the time the resolution returns `worldAge` simply *is* the new number
    // — nothing on the board says it moved this turn rather than eight turns
    // ago. `TurnReport.beads`' argument for a fact that is not an award.
    if (opened !== null) report.beadAgeOpened = opened;
  }
}

/** What the phase writes into. `TurnReport`'s two bead fields and nothing else. */
export interface BeadReport {
  beads: BeadAward[];
  beadAgeOpened?: BeadAge;
}

/**
 * The world's clock, and the age it opens when it rises. See `runBeads`.
 *
 * Answers the age that opened, or `null` on the overwhelmingly common turn
 * where nothing did — which is what the report rides out on. A rise **past** a
 * deck age (two ages in one turn, which nothing today can do) still answers the
 * age reached, because that is the number a player is told.
 */
function advanceWorldClock(state: GameState, awards: BeadAward[]): BeadAge | null {
  let reached = state.beads.worldAge;
  for (const player of realPlayers(state)) {
    reached = Math.max(reached, highestAge(player.techsResearched));
  }
  if (reached <= state.beads.worldAge) return null;
  const closing = state.beads.worldAge;
  state.beads.worldAge = reached;
  openBeadAge(state, closing, awards);
  return isBeadAge(reached) ? reached : null;
}

/**
 * Opens an age: the closing age's reckonings, then the new hand face up, then
 * the per-age counters reset.
 *
 * The order is the rule. A reckoning is a snapshot of *the age that just ended*
 * and must be taken before anything else moves — which is also the user's
 * ruling in full: "calculated once one player advances to the next age,
 * snapshot all players and assign a victor". Every seat is measured at once,
 * one victor per card by the highest count, and **ties pay nobody** — two
 * empires with nine cities each have not settled the question.
 *
 * The counters reset *after* the reckonings have read them, which is the whole
 * reason the reset lives here and not in the phase above it.
 */
function openBeadAge(state: GameState, closing: number, awards: BeadAward[]): void {
  awards.push(...takeReckonings(state, closing));

  for (const age of BEAD_DECK_AGES) {
    if (age > state.beads.worldAge) continue;
    for (const card of state.beads.hands[String(age)] ?? []) card.faceUp = true;
  }

  for (const player of state.players) {
    player.routeYieldsThisAge = 0;
    player.greatPeopleThisAge = 0;
  }
}

/**
 * Takes the closing age's reckonings: **only the ones on the table**.
 *
 * A reckoning is an ordinary card of its age's deck (`drawAgeReckonings` picks
 * four of the eight, one per family, at `newGame`), so which of them the world
 * ever answers is a fact about what was *dealt* — the doc's "one per family per
 * age is dealt, so the eight are a pool, not a fixed set". A card still face
 * down, or still in the deck, measures nobody: nobody was ever shown it.
 *
 * Every seat is measured at once on one count, the highest takes it, and **ties
 * pay nobody** — two empires with nine cities each have not settled the
 * question. Walked in the hand's own order so two reckonings resolved in one
 * opening always resolve the same way, and `realPlayers` order inside, so a tie
 * broken by seat order is a fact about the roster rather than about which sweep
 * ran first.
 *
 * Exported because it is the one seam a test can reach without an age-four
 * technology: `advanceWorldClock` is the only caller in the game.
 */
export function takeReckonings(state: GameState, closing: number): BeadAward[] {
  const awards: BeadAward[] = [];
  for (const card of state.beads.hands[String(closing)] ?? []) {
    if (!card.faceUp) continue;
    if (!isBeadReckoningId(card.id)) continue;
    const id = card.id;
    if (beadIsDormant(id)) continue;
    if (beadClaimed(state, id, closing)) continue;
    const count = beadReckoningDef(id).count;
    let bestScore = 0;
    let bestSeat: number | null = null;
    let tied = false;
    for (const player of realPlayers(state)) {
      const score = beadCount(state, player.id, count);
      if (score <= 0) continue;
      if (bestSeat === null || score > bestScore) {
        bestScore = score;
        bestSeat = player.id;
        tied = false;
      } else if (score === bestScore) {
        tied = true;
      }
    }
    if (bestSeat === null || tied) continue;
    const award = awardBead(state, bestSeat, id, closing);
    if (award) awards.push(award);
  }
  return awards;
}

/**
 * Is this card spent — has the world already given away what it offered?
 *
 * The key is the pair the claim was written under, never the bare id, and that
 * precision is load-bearing: the same reckoning may be drawn into **both**
 * decks, and one taken when age 2 closed must not sweep its twin off age 3's
 * table before anybody has answered it. So a quest is asked at `0`, an
 * endeavour at its own age, and a reckoning at the age whose hand it is sitting
 * in.
 */
function cardIsSpent(state: GameState, age: BeadAge, id: BeadCardId): boolean {
  if (isBeadEndeavourId(id)) return beadClaimed(state, id, beadEndeavourDef(id).age);
  if (isBeadReckoningId(id)) return beadClaimed(state, id, age);
  return beadClaimed(state, id, 0);
}

/**
 * Takes every spent card off the table, freeing its slot.
 *
 * **A hand is a set of open slots, not a one-time deal** (the ruling of
 * 2026-08-30). Without this the table was a window four cards wide that never
 * moved: a twenty-five card deck would show four of its rows in a whole game
 * and the other twenty-one would never be seen by anybody. With it the deck
 * *flows* through the hand — a card claimed frees its slot, `dealOneCard` fills
 * it on the next tick, and what bounds the age is the deck rather than the hand.
 *
 * A **reckoning holds its slot** until its age closes, and needs no clause of
 * its own to do it: a reckoning is claimed *at* the closing, which is the
 * moment it stops being worth a slot.
 *
 * Run before the deal and after the previous turn's sweep, so a card claimed
 * last turn is gone before this turn's card is dealt. It is a **broom**, exactly
 * like `pruneTimedEffects`: a spent card is already inert (`awardBead` refuses
 * it, `endeavourError` refuses it), so removing it changes no outcome — which is
 * what makes it safe to run anywhere, twice, or not at all.
 */
function clearSpentCards(state: GameState): void {
  for (const age of BEAD_DECK_AGES) {
    const key = String(age);
    const hand = state.beads.hands[key];
    if (!hand) continue;
    state.beads.hands[key] = hand.filter((card) => !cardIsSpent(state, age, card.id));
  }
}

/**
 * Deals one card, once a turn, off the first deck that still has one into a hand
 * with a slot open.
 *
 * The hand fills **over** the age rather than all at once, which is Entry VI's
 * drafting model: a card dealt before its age opens lies face down — it is
 * there, it is in the seeded order, and nobody may claim it — and it turns over
 * with the rest the moment the first seat in the world reaches that age. So the
 * deck for an age nobody has entered still deals, and the deal is a fact about
 * the *turn* rather than about who looked at a screen.
 *
 * "Not full" is asked *after* `clearSpentCards` has swept the table, which is
 * the whole of the open-slot rule: a hand of four with one card claimed is a
 * hand of three, and the deck fills it back up.
 *
 * `BEAD_DECK_AGES` order, so the earlier age's hand always fills first and the
 * order of the world's table is a property of the data.
 */
function dealOneCard(state: GameState): void {
  if (state.turn % Math.max(1, Math.floor(BEAD_RULES.dealEveryTurns)) !== 0) return;
  for (const age of BEAD_DECK_AGES) {
    const key = String(age);
    const deck = state.beads.decks[key];
    const hand = state.beads.hands[key];
    if (!deck || !hand) continue;
    if (hand.length >= beadHandSize(age)) continue;
    const id = deck.shift();
    if (id === undefined) continue;
    hand.push({ id, faceUp: age <= state.beads.worldAge });
    return;
  }
}

/**
 * Sweeps every count and streak deed for every real seat.
 *
 * Feats first, then the quests on the table, both in file order and both inside
 * a walk of `realPlayers` — so a threshold two seats crossed on the same turn is
 * always taken by the same one, and that one is a fact about seat order rather
 * than about which sweep happened to run first.
 *
 * A **streak** is the only thing here that writes state of its own: the run is
 * raised on a turn the count holds and set to zero on a turn it does not, which
 * is what makes "ten turns together" mean together. The book is per seat per
 * card and is never pruned — a finished card's entry is a handful of bytes and
 * deleting it would be a second rule about a thing that is already claimed.
 */
function sweepStandingBeads(state: GameState, awards: BeadAward[]): void {
  for (const player of realPlayers(state)) {
    for (const id of BEAD_FEAT_IDS) {
      const def = beadFeatDef(id);
      const age = def.once === 'age' ? highestAge(player.techsResearched) : 0;
      if (!standingDeedHolds(state, player, id, def.trigger)) continue;
      const award = awardBead(state, player.id, id, age);
      if (award) awards.push(award);
    }
    for (const id of BEAD_QUEST_IDS) {
      const def = beadQuestDef(id);
      if (!questIsOnTheTable(state, id)) continue;
      if (!standingDeedHolds(state, player, id, def.deed)) continue;
      const award = awardBead(state, player.id, id, 0);
      if (award) awards.push(award);
    }
  }
}

/**
 * Does this count or streak deed hold for this seat right now?
 *
 * An occasion deed answers `false` — it is announced, never swept, which is
 * `standingHolds`' own split one system over.
 */
function standingDeedHolds(
  state: GameState,
  player: Player,
  id: BeadCardId,
  deed: BeadDeed,
): boolean {
  if (deed.shape === 'occasion') return false;
  const held = beadCount(state, player.id, deed.count) >= deed.value;
  if (deed.shape === 'count') return held;

  const book = (state.beads.streaks[String(player.id)] ??= {});
  const run = held ? (book[id] ?? 0) + 1 : 0;
  book[id] = run;
  return run >= deed.turns;
}

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
