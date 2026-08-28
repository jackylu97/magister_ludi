/**
 * The fight: who may attack what, how much it hurts, and what is left standing.
 *
 * Pure logic over `GameState`, exactly like `cities.ts` and `tech.ts`. The
 * `attack` and `fortify` commands validate in `commands.ts` and then call in
 * here; three turn phases are one call each; and the interface's damage forecast
 * is `previewCombat`, which is the *same* function the reducer resolves with.
 * So the rules of a fight live in one file and the reducer stays a reducer.
 *
 * Combat under simultaneous turns
 * -------------------------------
 * There is no combat *phase*. An attack is a command and it resolves the instant
 * it is applied, in log order, exactly like a move — no batching, no timing
 * window, no "declare now, resolve later". Two players attacking each other
 * inside one turn window are ordered by the log, which is the same tie-break
 * every other contention in this game uses (see `commands.ts`), and it is what
 * makes a replay reproduce a war blow for blow.
 *
 * The awkward case falls out for free rather than needing a rule. A unit that
 * died to an earlier command in the same window is simply not in `state.units`
 * any more, so a later command *by* it fails at `unitById` and a later command
 * *against* it finds an empty tile — both refused cleanly, both leaving the
 * state byte-identical, because every handler validates fully before it writes.
 * "What if the target is already dead?" is not a combat question here; it is the
 * ordinary command contract.
 *
 * One evaluator, one answer
 * -------------------------
 * `previewCombat` and `applyCombat` are the same computation (`planCombat`)
 * read twice. The plan holds the *unrolled* damage — the exact real number the
 * formula produces at a roll of 1 — and the two callers differ in one line:
 * the preview reports it at the midpoint and at both ends of the roll band, and
 * the reducer multiplies it by a roll drawn from `state.rng`. A forecast can
 * therefore be wrong about the die and about nothing else. That is Entry VIII's
 * rule applied to violence: a preview computed by a second implementation is a
 * preview that lies.
 *
 * The damage curve
 * ----------------
 *     damage = combat.baseDamage · e ^ (combat.strengthExponent · (strA − strB)) · roll
 *
 * An exponential in the *difference* of two strengths, which is Civ V's model
 * and is chosen for one property: it has no scale. A four-point edge is worth
 * the same multiplier at strength 8 as at strength 30, so the roster can grow
 * into later eras without the early game collapsing into rounding error. `roll`
 * is uniform in `[1 − rollBand, 1 + rollBand]`, drawn from `state.rng`, so the
 * spread is ±20% of an already-decided answer rather than a coin flip.
 *
 * Strength is *effective* strength on both sides:
 *
 *     defender = base + terrain defence + fortify bonus + every flat line
 *     attacker = base · (1 − riverAttackPenalty, when melee across a river)
 *
 * **Everything on the defender's side is flat strength points** (user,
 * 2026-08-28: "terrain bonuses should be additive, not percentage"), which is
 * Civ VI's form and is ruled so that terrain, the trench, a citadel, a card and
 * a wall are one kind of number on one ledger — a single column a player can add
 * up. A percentage of the defender's own strength made a hill worth twice as
 * much to a longswordsman as to a warrior, which is a hill improved by Iron
 * Working. Terrain defence is summed from terrain, feature and hills (see
 * `terrainData.ts`, which itemises it); the fortify bonus is `turns × perTurn`
 * points, capped at `fortifyMax`.
 *
 * "Every flat line" is a list and not a fixed set: the wild's tax, the empire's
 * law, a citadel under the defender's feet, and — since 2026-08-28 — a **great
 * general standing within a couple of hexes**, which is worth the same points to
 * a charge as to a shield wall and names the general on the card
 * (`generalAuraLines`).
 *
 * The two percentages that survive are on the *attacker's* side and are both
 * facts about that army rather than about the ground: the river penalty, and
 * `cardCombatPercent`'s "−10% combat strength". Both multiply a unit's own base
 * before a single flat line joins.
 *
 * A city's strength
 * -----------------
 * A town defends with **the strongest unit its owner could train right now**
 * (user, 2026-08-28: "city's base defensive strength is equal to strongest
 * trainable unit; strategic resource rules apply"), floored at
 * `combat.cityMinStrength` for a seat that can build no soldier at all, plus its
 * walls, its cards and its buildings. `cityBaseStrength` is the helper and
 * `explainCityStrength` is the list it folds; "could train" is asked of
 * `buildError`, so a swordsman needs Iron Working *and* improved iron to be
 * standing on the parapet, and the answer moves the turn a mine finishes.
 *
 * It takes **no** terrain bonus — the walls are the terrain, and stacking a hill
 * on top of them made the early game unattackable in play. Its hit points are
 * `cityMaxHp`: `combat.cityBaseHp` plus what its walls add (`BuildingDef.cityHp`).
 *
 * Melee and ranged
 * ----------------
 * One command, two resolutions, and the unit's data decides which: a type with
 * `rangedStrength` shoots, a type without it closes. Melee trades damage — the
 * defender hits back with its own strength, unless it is a civilian or a city —
 * and the survivor advances into a tile it emptied, **taking any civilians still
 * standing on it** (`canAdvanceOnto`, and `arriveOnTile` for the transfer): the
 * ground and the people on it change hands together, which is Civ V's rule and
 * is what makes "kill the escort, take the worker" one act. Ranged is one-way: no
 * counter-damage, no advance, and a city floors at 1 hit point, which is the Civ
 * rule that stops archers taking capitals on their own.
 *
 * No mutual death
 * ---------------
 * A melee exchange that would empty *both* hit-point bars kills the **defender**
 * and leaves the **attacker on exactly 1**. Civ V's rule, and it is a rule rather
 * than a tuned number, so it lives here and not in `rules.json`: there is nothing
 * to dial. The reasoning is that the blows are only *modelled* as simultaneous —
 * the attacker is the one who chose the fight and landed the killing stroke, and
 * a trade where the aggressor also dies makes every attack on a wounded equal a
 * coin flip nobody would ever call. Mechanically it is the same clamp the
 * defender already gets from `clampDamage`: a floor on the hit points a blow may
 * take away, 1 instead of 0, applied to the counter-attack exactly when the
 * attacker's own blow proved fatal.
 *
 * It changes nothing else. The counter still *lands* — a defender that dies still
 * swings, and a full-strength attacker walks away scarred — and the advance rule
 * then applies as normal, so an attacker clamped to 1 hit point may still step
 * onto the tile it emptied. Attacker-only death is untouched: a counter that
 * outlives its target kills as freely as it ever did.
 *
 * Attacking ends the unit's turn (`movesLeft` to zero, `hasAttacked` set). Civ V
 * is subtler — some units may move after shooting — and v1 deliberately is not:
 * one attack per unit per turn, and the attack is the turn.
 *
 * Targeting
 * ---------
 * A tile is attacked, not a piece, and the tile decides what is hit, in this
 * order: an enemy **military unit**, then an enemy **city**, then an enemy
 * **civilian**. The garrison is the target until it is dead, which is what makes
 * a defended city a siege rather than a race, and a lone civilian is reachable
 * exactly when nothing is standing over it.
 *
 * Siege
 * -----
 * A city every one of whose neighbouring hexes is denied to it — held or
 * overlooked by somebody hostile, and for a water hex actually *stood on* —
 * neither heals nor holds still: it loses `combat.siegeDamagePerTurn` in the
 * heal phase, floored at 1 hit point — **a twentieth of a bare town's health**
 * since the 2026-08-28 halving of `cityBaseHp`, which is what that ruling was
 * for: the chip is the same figure and it is worth twice what it was. A siege
 * never takes a town on its own; somebody still has to attack. Derived every
 * turn and never stored, exactly as a barbarian's role is — see `underSiege`.
 *
 * Deliberately deferred (v1 has none of these, on purpose)
 * -------------------------------------------------------
 *   · **Experience and promotions.** No XP, no promotion tree, no veterancy —
 *     every warrior fights like every other warrior.
 *   · **City ranged strikes.** A city defends and is defended; it never shoots.
 *   · **Diplomacy and war declaration.** Every player is hostile to every other
 *     from turn one. There is nothing to declare and no peace to break.
 *   · **Embarkation.** Land units cannot cross water, so no naval combat.
 *   · **War weariness**, and every other happiness consequence of fighting.
 *   · **Damage scaling with health.** A unit at 10 hit points hits exactly as
 *     hard as one at full, so a fight is a grind rather than an avalanche.
 *
 * Each of them is a rule that would change what an attack *means*, and each is
 * cheap to add on top of one evaluator and impossible to add coherently on top
 * of five.
 */

import { type ArrivalReport, arriveOnTile, isEmptyArrival } from './arrival';
import { buildingCityHp, buildingCityStat } from './buildingEffects';
import { assignCitizens, cityAt, settleProductionWindfall } from './cities';
import { blocksLineOfSight, hasLineOfSight } from './los';
import {
  type GameMap,
  type Tile,
  getTileAt,
  neighborTiles,
  tileHex,
  tileIndex,
  wrappedDistance,
} from './map';
import { type Cell, isPassable } from './pathfind';
import { nextRange } from './rng';
import { RULES } from './rulesData';
import {
  type CombatSituation,
  type WindfallOccasionFacts,
  cardBehaviorRule,
  cardCityStat,
  cardCombatLines,
  cardCombatPercent,
  cardUnitStat,
  payWindfallGrants,
  settleCultureWindfall,
  windfallPayout,
} from './statecraft';
import {
  type City,
  type GameState,
  type Unit,
  breakFortify,
  captureUnit,
  isBarbarian,
  playerById,
  realPlayers,
  removeUnit,
  unitById,
} from './state';
import { buildError, settleResearchWindfall } from './tech';
import { type TraderPlunder, settleTraderPlunder } from './trade';
import { explainTerrainDefense, isWaterTerrain } from './terrainData';
import { isVisibleTo, recomputeVisibilityFor } from './visibility';
import {
  type UnitTypeId,
  UNIT_TYPE_IDS,
  isCivilian,
  isCombatant,
  isRanged,
  trades,
  unitDef,
} from './unitData';
import { greatPersonDef, isGreatPersonId } from './greatPeopleData';
import { improvementDef } from './improvementData';
import { awardOccasion } from './triumphs';
import { hasStackingRoom, unitsOnTile } from './units';
import { DIRECTION_COUNT, hasRiverEdge, neighborInDirection } from './water';

const COMBAT = RULES.combat;

// --- unit questions ---------------------------------------------------------

/**
 * The three "what kind of piece is this" questions, re-exported from the unit
 * table where they now live.
 *
 * They were written here and they are still *asked* here — every rule in this
 * file turns on one of them — but they read `UnitDef` and nothing else, and
 * `arrival.ts` came to need `isCivilian` to know what a unit takes with a hex.
 * `arrival.ts` cannot import this module (this module imports it), so the three
 * moved down to `unitData.ts`, which every layer may ask. Same rule, same
 * answers, one implementation; see the docblock there.
 */
export { isCivilian, isCombatant, isRanged };

// --- fortifying -------------------------------------------------------------

/** Is this unit dug in? Presence of the counter *is* the state; see `Unit`. */
export function isFortified(unit: Unit): boolean {
  return unit.fortifiedTurns !== undefined;
}

/**
 * How many turns of fortification are worth counting: the point at which
 * `fortifyMax` is reached, and never more, so the stored counter cannot drift
 * upward for a hundred turns behind a bonus that stopped growing on turn two.
 */
export function maxFortifyTurns(): number {
  const perTurn = COMBAT.fortifyBonusPerTurn;
  if (perTurn <= 0) return 0;
  return Math.ceil(COMBAT.fortifyMax / perTurn);
}

/**
 * The **strength points** this unit's entrenchment is worth right now.
 *
 * Points rather than the fraction this returned until 2026-08-28: a trench and a
 * hill are the same kind of advantage and belong on the same ledger (module
 * docblock). `maxFortifyTurns` is unchanged by the switch — `fortifyMax /
 * perTurn` is still 2 — so a save written before it deserialises identically.
 */
export function fortifyBonus(unit: Unit): number {
  const turns = unit.fortifiedTurns;
  if (turns === undefined) return 0;
  return Math.min(turns * COMBAT.fortifyBonusPerTurn, COMBAT.fortifyMax);
}

/**
 * Shakes a unit out of its trench. Returns whether it was in one.
 *
 * Re-exported rather than defined here, for `isCivilian`'s reason: `captureUnit`
 * needs it and has to sit below `arrival.ts`, so the one line moved down to
 * `state.ts` beside the other facts about a piece's existence. The rule is
 * unchanged and its callers are what they always were — `movement.ts` when a
 * unit's position changes, `applyCombat` when it attacks — plus the third moment
 * a trench stops being yours, which is the unit no longer being yours.
 */
export { breakFortify };

/**
 * Why this unit cannot fortify, or `null` when it can.
 *
 * Split out of the command for the reason every blocker in this codebase is:
 * the unit sheet's Fortify button is enabled by exactly the rule the reducer
 * accepts, so a live button and a rejected command cannot disagree. It asks
 * nothing about the turn or the actor — those belong to the command.
 */
export function fortifyError(unit: Unit): string | null {
  const def = unitDef(unit.type);
  if (isCivilian(def)) return `A ${def.name} cannot fortify`;
  if (isFortified(unit)) return `${def.name} is already fortified`;
  return null;
}

// --- geometry ---------------------------------------------------------------

/**
 * Line of sight moved to `los.ts` when fog of war arrived, and the move is the
 * point rather than a tidy-up: the fog system asks the *same* question about the
 * same ridge, and two implementations of "what does a mountain hide" would drift
 * into a board where a player can shoot something they cannot see. Re-exported
 * here because this is where the rule has always been read from — callers that
 * ask combat about combat's own geometry keep asking combat.
 *
 * The rule is unchanged: the straight hex line, endpoints excluded, blocked by
 * land nothing can walk over. A forest does not block, a hill does not block,
 * and standing on a hill buys an *archer* nothing (it buys a lookout a hex of
 * sight — that is a fog rule, and it lives with the fog).
 */
export { blocksLineOfSight, hasLineOfSight };

/**
 * Is there a river along the edge `from` and `to` share?
 *
 * Asked of `from`'s own mask, which is always enough: an edge is flagged on both
 * of the tiles that share it (the mirror invariant in `map.ts`). Returns false
 * for tiles that are not neighbours at all, which is the honest answer — a
 * ranged shot crosses no edge in particular.
 */
export function crossesRiver(map: GameMap, from: Tile, to: Tile): boolean {
  for (let direction = 0; direction < DIRECTION_COUNT; direction++) {
    const neighbor = neighborInDirection(map, from, direction);
    if (!neighbor) continue;
    if (neighbor.col === to.col && neighbor.row === to.row) {
      return hasRiverEdge(from, direction);
    }
  }
  return false;
}

// --- targeting --------------------------------------------------------------

/** What an attack on a tile would actually hit. Exactly one of the two is set. */
export interface AttackTarget {
  unit: Unit | null;
  city: City | null;
}

/**
 * What `ownerId` would be fighting if they attacked this cell, or `null` when
 * there is nothing of anybody else's on it.
 *
 * The priority is the targeting rule from the module docblock — military unit,
 * then city, then civilian — and it is a *pure read*, so the interface can paint
 * the attackable tiles with the same answer the reducer will act on.
 */
export function attackTargetAt(
  state: GameState,
  col: number,
  row: number,
  ownerId: number,
): AttackTarget | null {
  const foreign = unitsOnTile(state, col, row).filter((unit) => unit.ownerId !== ownerId);
  const military = foreign.find((unit) => isCombatant(unitDef(unit.type)));
  if (military) return { unit: military, city: null };

  const city = cityAt(state, col, row);
  if (city && city.ownerId !== ownerId) return { unit: null, city };

  const civilian = foreign[0];
  if (civilian) return { unit: civilian, city: null };
  return null;
}

/**
 * May a melee winner step onto the hex it just emptied?
 *
 * `canStopOn` with exactly one clause changed, and the change is the rule: an
 * ordinary march may not end on a tile holding *any* foreign unit, while an
 * attack that has killed the last thing able to swing back may end on a tile
 * still holding the enemy's **civilians**. Taking the ground takes the people
 * standing on it (`arriveOnTile`, which is where the transfer itself happens).
 *
 * This is Civ V's rule and it is here for two reasons beyond fidelity. It makes
 * "kill the escort, take the worker" one act rather than two turns of hitting an
 * empty hex — a stack of settler-plus-guard was otherwise a thing you could
 * defeat repeatedly without ever getting anything. And it is what makes a
 * barbarian camp with a stolen laborer parked on it *stormable at all*: under
 * the old clause the prisoner blocked the advance, so the hex that had to be
 * arrived on to clear the camp could not be arrived on. See ledger Entry XX.H.
 *
 * The foreign-combatant clause is kept rather than assumed away. With
 * `stacking.perCategoryPerTile` at 1 no second soldier can be standing there
 * once the defender is dead, but the *rule* is "nothing that can fight is left",
 * not "the cap is one", and a designer raising the cap must not silently gain a
 * unit that walks through armies.
 */
function canAdvanceOnto(state: GameState, attacker: Unit, tile: Tile): boolean {
  if (!isPassable(tile)) return false;
  const { category } = unitDef(attacker.type);
  if (!hasStackingRoom(state, tile.col, tile.row, category, attacker.id)) return false;
  for (const unit of unitsOnTile(state, tile.col, tile.row)) {
    if (unit.ownerId === attacker.ownerId) continue;
    if (isCombatant(unitDef(unit.type))) return false;
  }
  return true;
}

// --- what a town is worth ---------------------------------------------------

export type CombatKind = 'melee' | 'ranged';

/**
 * One line of what a city defends with, or of how many hit points it has.
 *
 * `CombatStrengthLine`'s shape, declared once and used for both breakdowns:
 * "Garrison strength · Swordsman 14", "Palisade +5", "Palisade +25". Hard rule 5
 * for a town, and the two folds below are the only sums of one.
 */
export interface CityStrengthLine {
  source: string;
  amount: number;
}

/**
 * The strongest unit this empire could put in a city **right now**, or `null`
 * when it could put none there at all.
 *
 * "Could" is `buildError`'s word and nothing else's — the technology, the
 * improved strategic resource, the roster's own "this is bought, not built" and
 * "this is called, not built" — asked without a city, because the question is
 * about the *empire* and not about which town happens to be under attack. So the
 * strategic-resource rule the user asked for comes for free and stays exactly
 * one implementation: an empire that loses its iron to a pillage defends its
 * towns with spearmen again the same turn.
 *
 * `combatStrength` rather than `rangedStrength`, because a city is being stormed
 * and what is on the parapet is whatever would meet a swordsman at the gate.
 * Ties go to roster order, which is the order every other sweep in this game
 * uses.
 */
function strongestTrainable(state: GameState, playerId: number): UnitTypeId | null {
  let best: UnitTypeId | null = null;
  let bestStrength = 0;
  for (const type of UNIT_TYPE_IDS) {
    const def = unitDef(type);
    if (!isCombatant(def) || def.combatStrength <= bestStrength) continue;
    if (buildError(state, playerId, 'unit', type) !== null) continue;
    best = type;
    bestStrength = def.combatStrength;
  }
  return best;
}

/**
 * How a city reached the strength it defends with, in the order a forecast
 * should print it. `cityBaseStrength` is the fold and never a second sum.
 *
 * The garrison line first — the strongest unit the owner could train, floored at
 * `combat.cityMinStrength` — then the citizens (zero today; see the rules
 * field), then everything a card or a building raises. The walls and the card
 * lines are *not* in here: they are already `CombatBonusLine`s on the defender's
 * side and `planCombat` folds them there, so putting them in this list too would
 * count a palisade twice. This is the town's own half.
 */
export function explainCityStrength(state: GameState, city: City): CityStrengthLine[] {
  const lines: CityStrengthLine[] = [];
  const best = strongestTrainable(state, city.ownerId);
  const bestStrength = best === null ? 0 : unitDef(best).combatStrength;
  if (best !== null && bestStrength >= COMBAT.cityMinStrength) {
    lines.push({ source: `Garrison strength · ${unitDef(best).name}`, amount: bestStrength });
  } else {
    // A seat with no military technology at all — the wild, and turn one of a
    // game whose starting techs unlock nothing that fights. It still defends
    // with something, and the floor says with what.
    lines.push({ source: 'Garrison strength', amount: COMBAT.cityMinStrength });
  }
  const citizens = COMBAT.cityStrengthPerPop * city.population;
  if (citizens !== 0) {
    lines.push({
      source: `${city.population} citizen${city.population === 1 ? '' : 's'}`,
      amount: citizens,
    });
  }
  return lines;
}

/** The fold of a city breakdown. The only sum of one. */
export function foldCityLines(lines: readonly CityStrengthLine[]): number {
  let total = 0;
  for (const line of lines) total += line.amount;
  return total;
}

/** What this city defends with before its walls and its law. The fold. */
export function cityBaseStrength(state: GameState, city: City): number {
  return foldCityLines(explainCityStrength(state, city));
}

/**
 * How many hit points this city has at full health, line by line.
 *
 * `combat.cityBaseHp` and then every wall the town has built
 * (`BuildingDef.cityHp`, read through the one place a building's non-yield facts
 * are read). A wonder's stones pay whichever town holds them, so a captured
 * capital keeps the Walls of Uruk's hit points under its new flag with no
 * bookkeeping at all — Entry XXX's rule, unchanged.
 */
export function explainCityMaxHp(city: City): CityStrengthLine[] {
  const lines: CityStrengthLine[] = [{ source: 'Walls', amount: COMBAT.cityBaseHp }];
  for (const line of buildingCityHp(city)) lines.push(line);
  return lines;
}

/**
 * A city's maximum hit points. The fold, and **the** answer — every place hit
 * points move asks it rather than `COMBAT.cityBaseHp`, so a town that builds a
 * palisade is deeper the same turn and one that is captured is capped by what it
 * actually holds.
 */
export function cityMaxHp(city: City): number {
  return foldCityLines(explainCityMaxHp(city));
}

/**
 * Puts a city's hit points back inside `[1, cityMaxHp]`.
 *
 * Called wherever hit points move (`healCities`, `captureCity`) rather than
 * trusted to arithmetic, because the *maximum* can move too: nothing removes a
 * building today, but a future pillage that did would otherwise leave a town
 * standing above a bar that had shrunk under it.
 */
function clampCityHp(city: City): void {
  const max = cityMaxHp(city);
  if (city.hp > max) city.hp = max;
  if (city.hp < 1) city.hp = 1;
}

// --- the evaluator ----------------------------------------------------------

/**
 * One flat strength bonus standing on one side of a fight, with the reason.
 *
 * Rule 5 applied to violence, and the shape the *next* such bonus joins rather
 * than a barbarian special case: a promotion, a great general, a war-weariness
 * malus all say "so many points, to this side, because of that" and all belong in
 * this list. There is exactly one entry in it today.
 *
 * Flat points rather than a fraction, and added **after** the multipliers, which
 * is a rules decision and not a rounding one. Terrain and fortification multiply
 * a unit's own strength because they are facts about the ground it is standing on
 * and the trench it dug; fighting the wild is a fact about *who is opposite*, and
 * a percentage of the defender's own strength would have made a longswordsman's
 * advantage over barbarians bigger than a warrior's. It is also why the damage
 * curve makes this scale-free — the curve is exponential in the difference of two
 * strengths, so +2 is worth the same multiplier in every era (see the module
 * docblock, and `BarbarianRules.combatBonus`).
 */
export interface CombatBonusLine {
  /** Display label — "vs barbarians". */
  source: string;
  side: 'attacker' | 'defender';
  /** Strength points added. Always positive today; the shape allows a malus. */
  amount: number;
}

/**
 * One line of how one side reached the **effective strength** it fights with.
 *
 * Hard rule 5 applied to violence's headline number, which is the one number the
 * card had been printing without its reasons (user, 2026-08-26: "combat info
 * should show attack strength of each unit"). `attackerStrength` and
 * `defenderStrength` are the *fold* of these lists and are never computed beside
 * them — `foldCombatStrength` is the only sum, and `combat.test.ts` asserts the
 * two identities.
 *
 * A percentage is written **in the label and paid in points**: "terrain +25%"
 * carries the 2 strength it was worth on this unit, not the 25. That is the only
 * reading under which the list folds at all, and it is also the more useful one
 * — a player comparing two hexes wants to know what the ground is worth *here*.
 *
 * `CombatBonusLine`'s sibling and deliberately not the same type: a bonus line
 * is a flat point total that has to be added **after** the multipliers and
 * carries a `side`; a strength line is a *presentation* of one side's whole
 * arithmetic, multipliers folded in, and every line in the list is that side's.
 */
export interface CombatStrengthLine {
  /** Display label — "Warrior", "terrain +25%", "fortified +20%", "vs barbarians". */
  source: string;
  /** Strength points this line contributes. Signed: a river takes points away. */
  amount: number;
}

/**
 * A signed whole percentage, for a strength line's label. `+25%`, `-10%`.
 *
 * Rounded to whole points because every percentage in the combat rules is one,
 * and a label is not the place a rounding difference should first appear.
 */
function signedPercent(percent: number): string {
  const whole = Math.round(percent);
  return `${whole > 0 ? '+' : ''}${whole}%`;
}

/** The fold of a strength breakdown. The only sum of one. */
export function foldCombatStrength(lines: readonly CombatStrengthLine[]): number {
  let total = 0;
  for (const line of lines) total += line.amount;
  return total;
}

// --- a general in the field -------------------------------------------------

/**
 * What a **standing great general** is worth to this piece, as the one labelled
 * line it adds — or nothing (user, 2026-08-28: "units within two hexes gain +3
 * combat strength").
 *
 * A *passive* aura, and that is the whole shape of it: the general's own act
 * (`greatPersonActAt`, the timed strength it hangs on a column for a few turns)
 * spends the piece, while this is what the piece is worth for as long as it is
 * left standing on the board. The two are separate numbers in `rules.greatPeople`
 * for exactly that reason — they are the two halves of the decision a player
 * makes about a general, and a designer sharpening one must be able to leave the
 * other alone.
 *
 * Four rules, and each is a sentence:
 *
 *   · **Soldiers only.** `isCombatant`, which is also why a general never
 *     stiffens *itself*: it is a civilian, it cannot hold a hex, and an aura
 *     that made the aura-bearer harder to kill would be a rule about hiding
 *     rather than about leading.
 *   · **One's own side.** Friendly by owner, the same reading everything else in
 *     this file gives the word.
 *   · **Auras do not stack.** The sweep returns at the *first* general in reach,
 *     so a second one beside the same column is worth nothing — which is what
 *     stops a stack of generals being the strongest army in the game.
 *   · **`state.units` in array order**, never a `Map`, because "the first
 *     general in reach" is an outcome and outcomes are settled by sweep order
 *     (hard rule 2). Two generals equidistant give the same line on every
 *     machine and on every replay.
 *
 * Read on **both sides** by `planCombat`, like every other flat line: a general
 * is worth the same to a charge and to a shield wall.
 */
export function generalAuraLines(state: GameState, unit: Unit): CombatStrengthLine[] {
  const amount = RULES.greatPeople.generalAuraStrength;
  if (amount === 0) return [];
  if (!isCombatant(unitDef(unit.type))) return [];
  const here = getTileAt(state.map, unit.col, unit.row);
  if (!here) return [];
  const range = RULES.greatPeople.generalAuraRange;
  const eye = tileHex(here);
  for (const other of state.units) {
    if (other.ownerId !== unit.ownerId) continue;
    if (unitDef(other.type).greatWork !== true) continue;
    const person = other.person;
    if (person === undefined || !isGreatPersonId(person)) continue;
    const def = greatPersonDef(person);
    if (def.family !== 'general') continue;
    const stands = getTileAt(state.map, other.col, other.row);
    if (!stands) continue;
    if (wrappedDistance(state.map, eye, tileHex(stands)) > range) continue;
    return [{ source: `Great general · ${def.name}`, amount }];
  }
  return [];
}

/** Everything a forecast says, and everything the notice line needs. */
export interface CombatForecast {
  kind: CombatKind;
  attackerId: number;
  /** The defending unit's id, or `null` when a city is the target. */
  defenderUnitId: number | null;
  /** The defending city's id, or `null` when a unit is the target. */
  defenderCityId: number | null;
  attackerName: string;
  defenderName: string;
  /**
   * Effective strengths, every modifier already in them — and the **fold** of
   * the two breakdowns below, never a second computation. See
   * `CombatStrengthLine`.
   */
  attackerStrength: number;
  defenderStrength: number;
  /** How each strength above was reached, in the order a card should print it. */
  attackerLines: CombatStrengthLine[];
  defenderLines: CombatStrengthLine[];
  /**
   * The defender's terrain share, in **strength points** — the fold of
   * `explainTerrainDefense`. Always 0 for a city: the walls are the terrain.
   */
  terrainBonus: number;
  /** Its fortification share, in strength points. Always 0 for a city. */
  fortifyBonus: number;
  /**
   * Every flat bonus already counted into the two strengths above, in the order
   * a card should print them. Empty for an ordinary fight between two empires.
   */
  bonuses: CombatBonusLine[];
  /** True when a melee attack would cross a river and pay for it. */
  acrossRiver: boolean;
  /** Damage at the midpoint roll — what the reducer deals on an average die. */
  damageToDefender: number;
  damageToAttacker: number;
  /** The same two numbers at the ends of the roll band. */
  damageToDefenderMin: number;
  damageToDefenderMax: number;
  damageToAttackerMin: number;
  damageToAttackerMax: number;
  attackerHp: number;
  attackerMaxHp: number;
  defenderHp: number;
  defenderMaxHp: number;
  /** Melee on a civilian: it changes hands and nobody is hurt. */
  capturesUnit: boolean;
  /**
   * Melee on a **laden caravan**: it is destroyed and its cargo paid to the
   * attacker's nearest city, rather than changing hands (the trade pass).
   *
   * A forecast flag beside `capturesUnit` rather than a branch inside the
   * resolution, so the *preview* tells the truth too: a player about to ride
   * down a trader is shown a kill and not a capture, and the two cannot disagree
   * because they read the same plan.
   */
  plundersUnit: boolean;
  /** Melee on a city the midpoint roll would empty: it changes hands. */
  capturesCity: boolean;
}

export type CombatPreview = ({ ok: true } & CombatForecast) | { ok: false; error: string };

/**
 * The whole computation, before anybody decides what to do with it.
 *
 * The plan carries the *unrolled* damage on each side — the real number the
 * curve produces at a roll of exactly 1 — plus the forecast built from it. That
 * split is the one-evaluator rule made structural: `previewCombat` throws the
 * bases away and reports the forecast, `applyCombat` keeps them and multiplies
 * by the die. Neither of them recomputes anything.
 */
interface CombatPlan {
  forecast: CombatForecast;
  attacker: Unit;
  target: AttackTarget;
  tile: Tile;
  /** Unrolled damage the attacker deals. Already clamped where a rule clamps it. */
  baseToDefender: number;
  /** Unrolled counter-damage. Zero whenever there is no counter-attack. */
  baseToAttacker: number;
  /** Hit points the defender cannot be taken below. 1 for a bombarded city. */
  defenderFloor: number;
}

/** The curve. One line, and the only place it is written down. */
function curve(strongerBy: number): number {
  return COMBAT.baseDamage * Math.exp(COMBAT.strengthExponent * strongerBy);
}

/**
 * One unrolled damage figure turned into hit points at a given roll.
 *
 * Floored at 1 whenever there is any damage at all: a fight that connected did
 * *something*, and a rounding rule that let an even match deal zero would make a
 * hopeless attack free. A base of zero — no counter-attack, a captured civilian —
 * stays zero, because that is the absence of a blow rather than a small one.
 */
export function damageAtRoll(base: number, roll: number): number {
  if (base <= 0) return 0;
  return Math.max(1, Math.round(base * roll));
}

function clampDamage(value: number, hp: number, floor: number): number {
  return Math.max(0, Math.min(value, hp - floor));
}

/**
 * Builds the plan, or explains why there is no attack to plan.
 *
 * Everything is checked here and nothing is written, which is what lets the
 * command handler be four lines and still honour the validate-fully contract:
 * a refused attack cannot have touched the state, because the only function
 * that looked at it was this one.
 */
function planCombat(
  state: GameState,
  attackerId: number,
  cell: Cell,
): { ok: true; plan: CombatPlan } | { ok: false; error: string } {
  const attacker = unitById(state, attackerId);
  if (!attacker) return { ok: false, error: `No unit with id ${String(attackerId)}` };

  const def = unitDef(attacker.type);
  if (!isCombatant(def)) return { ok: false, error: `A ${def.name} cannot attack` };
  if (attacker.movesLeft <= 0) {
    return { ok: false, error: `Unit ${attacker.id} has no movement left` };
  }
  if (attacker.hasAttacked) {
    return { ok: false, error: `Unit ${attacker.id} has already attacked this turn` };
  }

  const from = getTileAt(state.map, attacker.col, attacker.row);
  if (!from) return { ok: false, error: `Unit ${attacker.id} is not on the map` };
  // `getTileAt` wraps the column, so an un-wrapped target from the UI resolves
  // to the tile the player actually clicked.
  const tile = getTileAt(state.map, cell.col, cell.row);
  if (!tile) return { ok: false, error: `Target (${cell.col}, ${cell.row}) is off the map` };
  if (tile.col === from.col && tile.row === from.row) {
    return { ok: false, error: `Unit ${attacker.id} cannot attack its own tile` };
  }

  const target = attackTargetAt(state, tile.col, tile.row, attacker.ownerId);
  if (!target) {
    return { ok: false, error: `Nothing to attack on (${tile.col}, ${tile.row})` };
  }

  const kind: CombatKind = isRanged(def) ? 'ranged' : 'melee';
  const distance = wrappedDistance(state.map, tileHex(from), tileHex(tile));
  if (kind === 'melee') {
    if (distance !== 1) {
      return {
        ok: false,
        error: `${def.name} must be adjacent to attack (${distance} tiles away)`,
      };
    }
  } else {
    // Skirmishers' Creed. Through `cardUnitStat`, which is the single evaluator
    // for the stat — so the reducer, the forecast and the attackable-tile tint
    // all agree about how far an archer reaches.
    const range = def.range! + cardUnitStat(state, attacker, 'range');
    if (distance > range) {
      return {
        ok: false,
        error: `${def.name} has range ${range} and the target is ${distance} tiles away`,
      };
    }
    if (!hasLineOfSight(state.map, from, tile)) {
      return { ok: false, error: `${def.name} has no line of sight to (${tile.col}, ${tile.row})` };
    }
  }

  /**
   * The one place fog of war is a *rule* rather than a mask.
   *
   * Everything else about visibility is presentation — the reducer is omniscient
   * and a unit may be marched into ground nobody has charted (see
   * `visibility.ts`). Shooting is different, because an attack names a tile and
   * the player has to have had a reason to name it: an archer that could loose
   * at a hex its empire cannot see would be a player reading the game's own
   * memory rather than the board.
   *
   * Asked *after* range and line of sight so the sentence a player reads is the
   * most specific true one — "out of range" and "no line of sight" are both
   * sharper answers than "you cannot see there", and a melee unit adjacent to
   * something invisible is a case that cannot arise anyway (a unit lights its own
   * neighbours). It is asked inside `planCombat`, so the attackable-tile tint,
   * the forecast card and the reducer refuse it as one.
   */
  if (!isVisibleTo(state, attacker.ownerId, tile.col, tile.row)) {
    return {
      ok: false,
      error: `${def.name} cannot see (${tile.col}, ${tile.row})`,
    };
  }

  // --- strengths ---------------------------------------------------------

  // Flat strength points now, itemised by the table itself so the forecast can
  // print "Hills +3" beside "Forest +2" — see `explainTerrainDefense`.
  const terrainLines = explainTerrainDefense(tile.terrain, tile.feature, tile.hills);
  let terrainBonus = 0;
  for (const line of terrainLines) terrainBonus += line.amount;
  const acrossRiver = kind === 'melee' && crossesRiver(state.map, from, tile);

  /**
   * The wild's tax, from whichever side is paying it.
   *
   * One rule read twice: an empire fighting barbarians is `combatBonus` stronger
   * **attacking or defending**, so the question is only ever "is the other side
   * the wild, and am I not". The barbarian never gets it — against another
   * empire's raider there is nothing to be steadier than.
   */
  const defenderOwnerId = target.city ? target.city.ownerId : target.unit!.ownerId;
  const bonuses: CombatBonusLine[] = [];
  const wildBonus = RULES.barbarians.combatBonus;
  if (wildBonus !== 0) {
    if (!isBarbarian(state, attacker.ownerId) && isBarbarian(state, defenderOwnerId)) {
      bonuses.push({ source: 'Against barbarians', side: 'attacker', amount: wildBonus });
    } else if (isBarbarian(state, attacker.ownerId) && !isBarbarian(state, defenderOwnerId)) {
      bonuses.push({ source: 'Against barbarians', side: 'defender', amount: wildBonus });
    }
  }
  /**
   * The empire's law, both sides, generalised from the wild's tax above.
   *
   * Every Statecraft strength line is a `CombatBonusLine` with a label — which
   * is the whole reason `combatCardLine` is one hook rather than seven cards'
   * worth of special cases — so it is counted into the strengths *and* itemised
   * on the forecast card. A card that only mattered inside the reducer would be
   * a card the player could not plan around.
   *
   * The situation is the same triple `planCombat` already has, asked once per
   * side. The defender's side is asked of the *defending unit's* owner, so a
   * card is always read for the empire that holds it.
   */
  const situationFor = (unit: Unit, side: 'attacker' | 'defender'): CombatSituation => ({
    unit,
    side: side === 'attacker' ? 'attack' : 'defend',
    tile,
    vsBarbarians:
      side === 'attacker'
        ? isBarbarian(state, defenderOwnerId)
        : !isBarbarian(state, defenderOwnerId) && isBarbarian(state, attacker.ownerId),
    vsCity: target.city !== null,
    targetHp: target.city ? target.city.hp : target.unit!.hp,
    targetMaxHp: target.city ? cityMaxHp(target.city) : unitDef(target.unit!.type).maxHp,
    // **The piece on the other side**, whichever side is asking — Lautaro's "+3
    // vs mounted". Absent when the thing opposite is a city, which has no
    // silhouette, so a `vsClass` line simply does not pay against walls.
    vsType: side === 'attacker' ? target.unit?.type : attacker.type,
  });
  for (const line of cardCombatLines(state, situationFor(attacker, 'attacker'))) {
    bonuses.push({ source: line.source, side: 'attacker', amount: line.amount });
  }
  if (target.unit) {
    for (const line of cardCombatLines(state, situationFor(target.unit, 'defender'))) {
      bonuses.push({ source: line.source, side: 'defender', amount: line.amount });
    }
  }
  /**
   * **The ground's own works.** A citadel is the one improvement that is worth
   * something to whoever stands on it (`ImprovementDef.defense`), and it joins
   * as one more labelled line on the defender's side rather than as a term in
   * the multiplier — for `CombatBonusLine`'s stated reason: a fact about the
   * *hex* that is not the terrain must not scale with the terrain, and a
   * forecast that said "+8" with no reason beside it is what a breakdown exists
   * to prevent.
   *
   * It pays whoever is defending the hex, not whoever built it. That is the
   * Civ rule and the honest one — a captured citadel is a captured fort.
   */
  if (tile.improvement !== undefined) {
    const fortification = improvementDef(tile.improvement).defense ?? 0;
    if (fortification !== 0) {
      bonuses.push({
        source: improvementDef(tile.improvement).name,
        side: 'defender',
        amount: fortification,
      });
    }
  }
  /**
   * **A general in the field**, on whichever side has one standing near enough.
   *
   * Beside the citadel's line for the citadel's reason: it is a fact about
   * *where the piece is standing* rather than about the ground it is standing
   * on, so it is a flat labelled point total and never a term in a multiplier —
   * and it is named, so a forecast says which general is doing it. See
   * `generalAuraLines`, which is the whole rule.
   *
   * A city gets none: a town is not a unit, it defends with a garrison it
   * derives, and a general standing in the streets is already stiffening
   * whatever soldier is on the parapet with it.
   */
  for (const line of generalAuraLines(state, attacker)) {
    bonuses.push({ source: line.source, side: 'attacker', amount: line.amount });
  }
  if (target.unit) {
    for (const line of generalAuraLines(state, target.unit)) {
      bonuses.push({ source: line.source, side: 'defender', amount: line.amount });
    }
  }

  const bonusFor = (side: 'attacker' | 'defender'): number => {
    let total = 0;
    for (const line of bonuses) {
      if (line.side === side) total += line.amount;
    }
    return total;
  };

  // Master of Maps' drawback, applied to the unit's **own base** before the
  // river and before any flat line joins: "−10% combat strength" is a fact about
  // this army, not a discount on the terrain somebody else is standing on. See
  // `cardCombatPercent`.
  const attackerPercent = cardCombatPercent(state, attacker);
  const attackerStat = kind === 'ranged' ? def.rangedStrength! : def.combatStrength;
  const attackerBase = Math.floor((attackerStat * (100 + attackerPercent)) / 100);
  // Flat, and **after** the river multiplier — see `CombatBonusLine` for why a
  // fact about the opponent must not scale with the ground.
  const riverFactor = acrossRiver ? 1 - COMBAT.riverAttackPenalty : 1;
  const attackerStrength = attackerBase * riverFactor + bonusFor('attacker');

  /**
   * The attacker's arithmetic, written down in the order it happened — hard rule
   * 5's breakdown for `attackerStrength`, which is its fold and nothing else.
   * The roster's printed strength, then the empire's law, then the ford, then
   * every flat line; each percentage names itself in the label and pays in
   * points (see `CombatStrengthLine`).
   */
  const attackerLines: CombatStrengthLine[] = [{ source: def.name, amount: attackerStat }];
  if (attackerBase !== attackerStat) {
    attackerLines.push({
      source: `Cards ${signedPercent(attackerPercent)}`,
      amount: attackerBase - attackerStat,
    });
  }
  if (acrossRiver) {
    attackerLines.push({
      source: `Across a river ${signedPercent(-COMBAT.riverAttackPenalty * 100)}`,
      amount: attackerBase * riverFactor - attackerBase,
    });
  }
  for (const line of bonuses) {
    if (line.side === 'attacker') attackerLines.push({ source: line.source, amount: line.amount });
  }

  let defenderStrength: number;
  let defenderFortify = 0;
  let defenderName: string;
  let defenderHp: number;
  let defenderMaxHp: number;
  /** The defender's half of the same breakdown. Folds to `defenderStrength`. */
  const defenderLines: CombatStrengthLine[] = [];

  if (target.city) {
    // A city's walls *are* its terrain: no ground bonus on top of them.
    // Militia Levies, Mountain Hold, Frontier Forts. A list rather than a number
    // so the forecast can itemise it (rule 5): a "+11" beside the walls with no
    // reason beside it is exactly what a breakdown exists to prevent.
    const walls = cardCityStat(state, target.city, 'defense');
    for (const line of walls) {
      bonuses.push({ source: line.source, side: 'defender', amount: line.amount });
    }
    // And the walls the town actually *built*, beside the ones its law raised.
    // Two tables, one list: the forecast itemises a palisade exactly as it
    // itemises Frontier Forts, and `bonusFor` folds both without knowing which
    // is which.
    for (const line of buildingCityStat(target.city, 'defense')) {
      bonuses.push({ source: line.source, side: 'defender', amount: line.amount });
    }
    // **The town's own half**, and it is a fold like everything else: the
    // strongest unit this empire could train, floored, plus the citizens — see
    // `explainCityStrength`, which is the one derivation of it. The walls and
    // the law are already `bonuses` and are folded through `bonusFor` like every
    // other line, so nothing here adds a palisade a second time.
    const own = explainCityStrength(state, target.city);
    defenderStrength = foldCityLines(own) + bonusFor('defender');
    for (const line of own) defenderLines.push({ source: line.source, amount: line.amount });
    defenderName = target.city.name;
    defenderHp = target.city.hp;
    defenderMaxHp = cityMaxHp(target.city);
  } else {
    const defenderUnit = target.unit!;
    const defenderDef = unitDef(defenderUnit.type);
    defenderFortify = fortifyBonus(defenderUnit);
    const defenderPercent = cardCombatPercent(state, defenderUnit);
    const defenderBase = Math.floor(
      (defenderDef.combatStrength * (100 + defenderPercent)) / 100,
    );
    defenderStrength = defenderBase + terrainBonus + defenderFortify + bonusFor('defender');
    defenderLines.push({ source: defenderDef.name, amount: defenderDef.combatStrength });
    if (defenderBase !== defenderDef.combatStrength) {
      defenderLines.push({
        source: `Cards ${signedPercent(defenderPercent)}`,
        amount: defenderBase - defenderDef.combatStrength,
      });
    }
    // The ground, one line per reason it is hard — "Hills +3", "Forest +2" —
    // rather than a summed "terrain" a player cannot check. Cover and height are
    // two different advantages and the table already knows which is which.
    for (const line of terrainLines) {
      defenderLines.push({ source: line.source, amount: line.amount });
    }
    // The trench, separate from the ground, because a player choosing where to
    // attack from needs to know which of the two will still be there next turn.
    if (defenderFortify !== 0) {
      defenderLines.push({ source: 'Fortified', amount: defenderFortify });
    }
    defenderName = defenderDef.name;
    defenderHp = defenderUnit.hp;
    defenderMaxHp = defenderDef.maxHp;
  }

  // The flat lines join **last** on the defender's side, and after the branch so
  // that a city's walls-cards and a unit's cards are appended by one statement:
  // a city pushes its own onto `bonuses` inside the branch above, and this is
  // the only place either kind reaches the breakdown.
  for (const line of bonuses) {
    if (line.side === 'defender') defenderLines.push({ source: line.source, amount: line.amount });
  }

  // --- damage ------------------------------------------------------------

  // A caravan carrying a route is **plundered rather than taken**: a trade route
  // is a thing between two of somebody else's cities, so there is nothing to
  // inherit and what a soldier gets is the cargo. Asked of the piece's own
  // `trade` as well as of its type, because an unladen trader is an ordinary
  // civilian and is captured like one.
  const plundersUnit =
    kind === 'melee' &&
    target.unit !== null &&
    trades(unitDef(target.unit.type)) &&
    target.unit.trade !== undefined;

  const capturesUnit =
    kind === 'melee' &&
    target.unit !== null &&
    isCivilian(unitDef(target.unit.type)) &&
    COMBAT.captureCivilians &&
    !plundersUnit;

  // A city under bombardment is softened, never taken: the Civ rule that keeps
  // archers out of the capital-capturing business.
  const defenderFloor = target.city !== null && kind === 'ranged' ? 1 : 0;

  // No dice on either kind of one-sided blow: a civilian taken and a caravan
  // ridden down are both decided by arriving, not by a roll.
  const baseToDefender = capturesUnit || plundersUnit ? 0 : curve(attackerStrength - defenderStrength);
  // The defender hits back only in a melee, and only when it is something that
  // can hit back: a city has no counter-attack in v1, and neither has a settler.
  const counters =
    kind === 'melee' &&
    target.unit !== null &&
    isCombatant(unitDef(target.unit.type)) &&
    !capturesUnit &&
    !plundersUnit;
  const baseToAttacker = counters ? curve(defenderStrength - attackerStrength) : 0;

  const band = COMBAT.rollBand;
  const dealt = (roll: number): number =>
    clampDamage(damageAtRoll(baseToDefender, roll), defenderHp, defenderFloor);

  /**
   * The no-mutual-death rule as a forecast (see the module docblock, and
   * `previewCombat` for why the preview reads it at the *band* rather than at
   * the midpoint): the moment the attacker's best roll can empty the defender,
   * the counter-attack is previewed as leaving the attacker on at least 1.
   *
   * `dealt` is already clamped to the hit points there are to take, so "the
   * defender's projected remaining can reach zero" is exactly "the top of the
   * band takes all of them".
   */
  const defenderCanDie = dealt(1 + band) >= defenderHp - defenderFloor;
  const attackerFloor = defenderCanDie ? 1 : 0;
  const taken = (roll: number): number =>
    clampDamage(damageAtRoll(baseToAttacker, roll), attacker.hp, attackerFloor);

  const damageToDefender = dealt(1);

  const forecast: CombatForecast = {
    kind,
    attackerId: attacker.id,
    defenderUnitId: target.unit ? target.unit.id : null,
    defenderCityId: target.city ? target.city.id : null,
    attackerName: def.name,
    defenderName,
    attackerStrength,
    defenderStrength,
    attackerLines,
    defenderLines,
    terrainBonus: target.city ? 0 : terrainBonus,
    fortifyBonus: defenderFortify,
    bonuses,
    acrossRiver,
    damageToDefender,
    damageToAttacker: taken(1),
    damageToDefenderMin: dealt(1 - band),
    damageToDefenderMax: dealt(1 + band),
    damageToAttackerMin: taken(1 - band),
    damageToAttackerMax: taken(1 + band),
    attackerHp: attacker.hp,
    attackerMaxHp: def.maxHp,
    defenderHp,
    defenderMaxHp,
    capturesUnit,
    plundersUnit,
    capturesCity: target.city !== null && kind === 'melee' && damageToDefender >= defenderHp,
  };

  return {
    ok: true,
    plan: { forecast, attacker, target, tile, baseToDefender, baseToAttacker, defenderFloor },
  };
}

/**
 * What would happen if this unit attacked this cell — the interface's forecast,
 * and the reducer's validation, in one function.
 *
 * Rolls nothing and touches nothing. The damage figures are the midpoint of the
 * band with `…Min` / `…Max` beside them, so the card can show "34 ± 7" honestly:
 * the reducer will produce a number in exactly that closed interval, because it
 * is the same arithmetic with a die in it.
 *
 * The one place it deliberately rounds *toward* the player
 * ---------------------------------------------------------
 * The no-mutual-death rule (see the module docblock) is conditional on an
 * outcome, and a forecast has no outcome yet — it has a band. So the preview
 * takes the simplest honest presentation available: **whenever the defender's
 * projected remaining hit points can reach zero, the attacker's projected
 * remaining floors at 1**, which it does by clamping all three counter-damage
 * figures to `attackerHp − 1`. `main.ts` prints "hp after" as
 * `attackerHp − damageToAttacker`, so flooring the damage is flooring the bar.
 *
 * That is a real approximation and it is chosen with its direction open: on a
 * roll where the attacker's blow does *not* in fact kill, the counter may take
 * the attacker below what was shown, and it may kill it. What the preview will
 * never do is the opposite — promise the death of an attacker whose own attack
 * is landing the kill, which is the reading a player would act on and the rule
 * would then refuse. A forecast that showed both bars emptying would be
 * describing a state of the world this game does not have.
 */
export function previewCombat(state: GameState, attackerId: number, cell: Cell): CombatPreview {
  const planned = planCombat(state, attackerId, cell);
  if (!planned.ok) return { ok: false, error: planned.error };
  return { ok: true, ...planned.plan.forecast };
}

// --- resolution -------------------------------------------------------------

/** What an attack actually did. The notice line and the animations read this. */
export interface CombatOutcome {
  kind: CombatKind;
  attackerId: number;
  attackerName: string;
  defenderName: string;
  /**
   * Who swung and who was swung at, **as the board stood before the blow**.
   *
   * Both are here for one reason: a notice is per *seat*, and the only two
   * questions a seat asks of a fight it did not order are "was that mine?" and
   * "who did it?" (user, 2026-08-26). `defenderOwnerId` is read before anything
   * can change hands, so a captured worker still reports the empire that lost
   * it rather than the one that took it — which is the empire the news is for.
   * `null` only when the target was neither a unit nor a city, which cannot
   * happen today and is typed honestly anyway.
   */
  attackerOwnerId: number;
  defenderOwnerId: number | null;
  /** The tile that was struck. What a notice's pan action aims at. */
  at: { col: number; row: number };
  /** The defending unit's id, or `null` when a city was the target. */
  defenderUnitId: number | null;
  /** The defending city's id, or `null` when a unit was the target. */
  defenderCityId: number | null;
  damageToDefender: number;
  damageToAttacker: number;
  /** Units taken off the board, in removal order: defender first if both died. */
  killed: { id: number; type: Unit['type']; ownerId: number; col: number; row: number }[];
  /** A civilian that changed hands instead of dying, or `null`. */
  capturedUnitId: number | null;
  /**
   * What plundering a laden caravan paid, or `null` — which it is on every blow
   * that was not one (the trade pass).
   *
   * `capturedUnitId`'s opposite number: the piece is in `killed` like anything
   * else that died, and this is the *difference* the board cannot be asked about
   * afterwards — the gold is in the treasury, the grain is in a basket, and
   * re-deriving which town received it would be a second implementation of
   * `nearestOwnedCity`. The same argument `ArrivalReport` makes.
   */
  plundered: TraderPlunder | null;
  /** A city that changed hands, or `null`. */
  capturedCityId: number | null;
  /** True when the melee attacker moved into the tile it emptied. */
  advanced: boolean;
  /**
   * What the attacker found on the tile it advanced into, or `null` when it did
   * not advance or the hex held nothing. A camp stormed and a ruin ridden into
   * are both arrivals; see `arrival.ts`.
   */
  arrival: ArrivalReport | null;
  /** False when the counter-attack killed the attacker. */
  attackerSurvived: boolean;
}

export type CombatResult = { ok: true; outcome: CombatOutcome } | { ok: false; error: string };

/**
 * Resolves one attack, all the way: rolls, damage, deaths, capture, advance.
 *
 * Everything is validated by `planCombat` before a single field is written, so a
 * refused attack leaves the state byte-identical exactly as every other command
 * does. After that the writes happen in a fixed order, and the order is the
 * design:
 *
 *   1. the dice, always in the same sequence — the attacker's blow first, then
 *      the counter, and *only* when there is one to roll. Conditional draws are
 *      fine and deliberate: what matters for a replay is that the condition is a
 *      pure function of the state, and it is.
 *   2. both sides take their damage, computed from the board *before* either
 *      blow landed. A melee is simultaneous; a defender that dies still swings.
 *      The one asymmetry is the no-mutual-death clamp: the counter is charged
 *      *after* the defender's fate is known, floored at leaving the attacker on
 *      1 when the attacker's own blow was the fatal one.
 *   3. the dead are removed, defender first.
 *   4. the attacker's turn ends and its trench is abandoned.
 *   5. the advance, last, because it is the only step that needs the tile to be
 *      empty already.
 */
export function applyCombat(state: GameState, attackerId: number, cell: Cell): CombatResult {
  const planned = planCombat(state, attackerId, cell);
  if (!planned.ok) return { ok: false, error: planned.error };

  const { forecast, attacker, target, tile, baseToDefender, baseToAttacker, defenderFloor } =
    planned.plan;
  const band = COMBAT.rollBand;
  // Read before anything can change hands: a captured civilian and a captured
  // city both end this function owned by the attacker, and the empire that just
  // *lost* them is the one whose map most needs redrawing.
  const defenderOwnerBefore = target.unit?.ownerId ?? target.city?.ownerId ?? null;

  const outcome: CombatOutcome = {
    kind: forecast.kind,
    attackerId: attacker.id,
    attackerName: forecast.attackerName,
    defenderName: forecast.defenderName,
    attackerOwnerId: attacker.ownerId,
    defenderOwnerId: defenderOwnerBefore,
    at: { col: tile.col, row: tile.row },
    defenderUnitId: forecast.defenderUnitId,
    defenderCityId: forecast.defenderCityId,
    damageToDefender: 0,
    damageToAttacker: 0,
    killed: [],
    capturedUnitId: null,
    plundered: null,
    capturedCityId: null,
    advanced: false,
    arrival: null,
    attackerSurvived: true,
  };

  // 1 & 2 — the dice, and the damage they decide.
  let defenderDied = false;
  if (forecast.plundersUnit) {
    // A laden caravan: destroyed where it stands, its cargo paid to the nearest
    // town the attacker holds. No roll, no counter — see `plundersUnit` on the
    // forecast, which is where the rule is decided, and `settleTraderPlunder`,
    // which is the one place the bounty is composed. The kill and death riders
    // are paid exactly as they are for any other death, because a death is what
    // this is.
    const caravan = target.unit!;
    const fromOwnerId = caravan.ownerId;
    outcome.killed.push(snapshotFallen(caravan));
    removeUnit(state, caravan.id);
    defenderDied = true;
    outcome.plundered = settleTraderPlunder(state, attacker.ownerId, fromOwnerId, {
      col: tile.col,
      row: tile.row,
    });
    payBattleRiders(state, attacker.ownerId, 'kill', tile, {
      vsBarbarians: playerById(state, fromOwnerId)?.barbarian === true,
    });
    payBattleRiders(state, fromOwnerId, 'death', tile);
  } else if (forecast.capturesUnit) {
    // The one implementation of a change of hands (`state.ts`), which the wild's
    // thieves steal by and a rescuing empire takes back by — the same three
    // lines, whoever is holding the spear. See `captureUnit`.
    captureUnit(state, target.unit!, attacker.ownerId);
    outcome.capturedUnitId = target.unit!.id;
  } else {
    const dealt = clampDamage(
      damageAtRoll(baseToDefender, nextRange(state.rng, 1 - band, 1 + band)),
      forecast.defenderHp,
      defenderFloor,
    );
    outcome.damageToDefender = dealt;
    // Rolled here, applied below: the counter's *size* is decided by the board
    // before either blow lands, but how much of it the attacker may actually be
    // charged depends on whether the defender is still standing afterwards.
    // Drawing it in place keeps the die sequence — blow, then counter — exactly
    // what it has always been, which is what a replay reproduces.
    const counter =
      baseToAttacker > 0 ? damageAtRoll(baseToAttacker, nextRange(state.rng, 1 - band, 1 + band)) : 0;

    if (target.city) {
      target.city.hp -= dealt;
      if (target.city.hp <= 0) {
        captureCity(state, target.city, attacker.ownerId);
        outcome.capturedCityId = target.city.id;
        defenderDied = true;
        payBattleRiders(state, attacker.ownerId, 'capture', tile);
      }
    } else {
      const defender = target.unit!;
      defender.hp -= dealt;
      if (defender.hp <= 0) {
        const fallenOwner = defender.ownerId;
        const fromWild = playerById(state, fallenOwner)?.barbarian === true;
        // **Wolf-Mother's Pact: a barbarian you kill joins you instead of
        // dying.** The blow lands exactly as it always did — the roll, the
        // damage, the counter — and only the *disposal* changes, which is why
        // this is one clause here rather than a second combat path: the piece
        // goes through `captureUnit`, the one implementation of a change of
        // hands, on its feet at a single hit point because a convert is a
        // survivor and not a fresh recruit.
        //
        // It is a **capture and not a kill**, so no `killed` entry and no kill
        // or death riders: nothing died, and a card paying culture per corpse
        // must not pay for a man who is now standing in your line. `defenderDied`
        // is still true because it means "the hex stopped being defended", which
        // is what the counter's floor and the advance both ask — and the advance
        // then refuses itself on stacking, since the hex now holds a combatant of
        // the attacker's own.
        if (fromWild && cardBehaviorRule(state, attacker.ownerId, 'barbarianKillsConvert')) {
          defender.hp = 1;
          captureUnit(state, defender, attacker.ownerId);
          outcome.capturedUnitId = defender.id;
          defenderDied = true;
        } else {
          outcome.killed.push(snapshotFallen(defender));
          removeUnit(state, defender.id);
          defenderDied = true;
          // Two riders on one death, and they belong to two empires: the killer's
          // `kill` and the fallen's `death`. Both are paid, in that order, because
          // a battle is one event that two laws have something to say about.
          payBattleRiders(state, attacker.ownerId, 'kill', tile, { vsBarbarians: fromWild });
          payBattleRiders(state, fallenOwner, 'death', tile);
        }
      }
    }

    // No mutual death (module docblock). The attacker's floor is 1 exactly when
    // its own blow killed the unit that swung back — the same `clampDamage` the
    // defender is charged through, with 1 in place of 0. A defender that lived
    // keeps every point of its counter, so an attacker can still die here.
    const attackerFloor = defenderDied && target.unit !== null ? 1 : 0;
    outcome.damageToAttacker = clampDamage(counter, attacker.hp, attackerFloor);
    attacker.hp -= outcome.damageToAttacker;
  }

  // 3 & 4 — the attacker's own fate and bookkeeping. A dead attacker needs
  // neither, and must not be left holding a standing order it can never walk.
  if (attacker.hp <= 0) {
    outcome.killed.push(snapshotFallen(attacker));
    const fallenOwner = attacker.ownerId;
    const defenderOwner = target.city ? target.city.ownerId : target.unit?.ownerId;
    removeUnit(state, attacker.id);
    outcome.attackerSurvived = false;
    payBattleRiders(state, fallenOwner, 'death', tile);
    // The counter-attack killed somebody, so the defending empire got a kill —
    // which is the only reading under which The Iron Price is a card about
    // *combat* rather than a card about attacking.
    if (defenderOwner !== undefined) {
      payBattleRiders(state, defenderOwner, 'kill', tile, {
        vsBarbarians: playerById(state, fallenOwner)?.barbarian === true,
      });
    }
  } else {
    attacker.movesLeft = 0;
    attacker.hasAttacked = true;
    breakFortify(attacker);
    // The route the player approved ended in a fight. Resuming it next turn
    // would be the unit deciding to walk into whatever is still standing there.
    delete attacker.path;

    // 5 — the advance. Only melee, only into a tile this attack emptied, and
    // only when the ground is actually takeable — see `canAdvanceOnto`, which is
    // `canStopOn` with the one clause a victory changes.
    if (forecast.kind === 'melee' && defenderDied && canAdvanceOnto(state, attacker, tile)) {
      attacker.col = tile.col;
      attacker.row = tile.row;
      outcome.advanced = true;
      // The second of the two ways a unit's position changes, and therefore the
      // second caller of the one "it arrived somewhere" rule: storming a camp
      // clears it, and riding into a ruin claims it, whether the last hex was
      // walked or won. See `arrival.ts`.
      //
      // Kept `null` when the hex held nothing, which is almost every advance:
      // an outcome carrying an empty report would make every ordinary attack
      // serialise differently from one taken before sites existed, and the
      // reducer would hand a `CommandResult` an arrivals array to say so.
      const found = arriveOnTile(state, attacker, tile);
      if (!isEmptyArrival(found)) outcome.arrival = found;
    }
  }

  // Against the Odds: the attacker is still standing, the thing it went at is
  // not, and the forecast said the other side was the stronger. Asked of
  // `forecast` — the *same* two numbers the card showed the player before they
  // committed — rather than of a second arithmetic, which is the whole reason
  // `planCombat` is a plan: what the triumph rewards is beating the odds the
  // player was shown.
  if (
    outcome.attackerSurvived &&
    defenderDied &&
    forecast.defenderStrength > forecast.attackerStrength
  ) {
    awardOccasion(state, attacker.ownerId, 'battleWonAgainstStronger');
  }

  updateElimination(state);
  // 6 — everybody's map. A fight moves eyes in more ways than a march does: a
  // piece died (its owner sees less), a civilian or a town changed hands (two
  // owners at once), the attacker advanced. `removeUnit` and `createUnit` cover
  // the deaths on their own; the changes of ownership do not go through either,
  // so the seats involved are named here rather than left to the turn phase —
  // the board must not show a captured town still watched by the empire that
  // lost it for the rest of the window.
  recomputeVisibilityFor(state, [
    attacker.ownerId,
    ...(target.unit ? [target.unit.ownerId] : []),
    ...(target.city ? [target.city.ownerId] : []),
    ...(defenderOwnerBefore === null ? [] : [defenderOwnerBefore]),
  ]);
  return { ok: true, outcome };
}

/** What a piece looked like the instant before it left the board. */
function snapshotFallen(unit: Unit): CombatOutcome['killed'][number] {
  return { id: unit.id, type: unit.type, ownerId: unit.ownerId, col: unit.col, row: unit.row };
}

/**
 * A city changes hands.
 *
 * Its territory follows it for free: `state.tileOwner` holds *city* ids (see the
 * `state.ts` docblock), so every tile this city owned is now the conqueror's
 * without a single write.
 *
 * Three things are cleared and each is the old owner's intent rather than the
 * city's property — the production queue (which may name units the new owner has
 * no technology for), the hammers banked toward it, and the pinned citizens.
 * Buildings, population, food and culture all stay: they are the city, and the
 * city survived. Citizens are re-assigned on the spot for the same reason
 * `setLockedTiles` re-assigns — the panel must not show the old owner's dots.
 *
 * Population loss on capture is deliberately not modelled in v1; there is no
 * data knob for it, and halving a city is a balance decision rather than a
 * mechanic the rest of the system needs.
 *
 * `captured` is raised here and nowhere else, because this is the only path by
 * which a city changes hands. It is what makes the authority meter charge 3 for
 * a town somebody else grew (design ledger, Entry XIV.D.2), and it is
 * deliberately *not* paired with a bump to `Player.settlersBuilt`: taking a city
 * is not building a settler, so a conqueror's next settler is priced exactly as
 * it was before the walls fell.
 */
/**
 * Pays one empire's riders on a battle occasion — a kill, a death, a capture.
 *
 * The three occasions with **no figure of their own**: nothing about a death is
 * a number until a card says so, which is why the base is zero and only the
 * grants are read. `at` is the contested hex, so "its nearest city" resolves the
 * way a discovery's does — The Widow's Levy raises its ten hammers in the town
 * nearest the field, not in the capital.
 *
 * Culture is settled through the windfall wrapper, because Entry XVIII says a
 * one-time grant settles its bucket the instant it lands and The Iron Price pays
 * culture: a kill that fills the meter deals a draft on the spot.
 *
 * **Beakers are settled the same way**, for the same reason and by the same
 * rule: `settleResearchWindfall` is what every windfall that pays science calls
 * (`tech.ts`), and War Chief's five-a-kill is the first battle rider to pay any.
 * A kill that covers the last of a technology therefore finishes it here, and
 * re-seats every one of that empire's citizens with it — the register's entry 9,
 * which is exactly what a rider paying into a pool the phase would otherwise
 * have spent an hour later owes.
 */
function payBattleRiders(
  state: GameState,
  playerId: number,
  occasion: 'kill' | 'death' | 'capture',
  at: Tile,
  facts: WindfallOccasionFacts = {},
): void {
  const player = playerById(state, playerId);
  if (!player) return;
  const payout = windfallPayout(state, playerId, occasion, 0, 0, facts);
  if (payout.grants.length === 0 && payout.units.length === 0) return;
  const touched = payWindfallGrants(state, player, payout, { col: at.col, row: at.row });
  for (const city of touched) settleProductionWindfall(state, city);
  settleCultureWindfall(state, player);
  settleResearchWindfall(state, player);
}

function captureCity(state: GameState, city: City, ownerId: number): void {
  city.ownerId = ownerId;
  city.captured = true;
  // A fraction of the **new** maximum, which is the same maximum as the old one
  // — buildings survive a capture, so the walls a conqueror inherits are the
  // walls the town was defended with. Clamped afterwards anyway, because the
  // fraction is data and a designer may set it above 1.
  city.hp = Math.max(1, Math.round(cityMaxHp(city) * COMBAT.cityCaptureHpFraction));
  clampCityHp(city);
  city.queue = [];
  city.hammerBasket = 0;
  city.lockedTiles = [];
  assignCitizens(state, city);
  // The Taken. In the mechanism beside the change of hands, for
  // `awardFoundingTriumphs`' reason: capturing a town is one thing that happens
  // in one place, and an AI that storms a city earns what a player would.
  awardOccasion(state, ownerId, 'cityCaptured');
}

/** "Warrior attacks Archer: 34 − 12" — one line, for the notice and the log. */
export function describeCombat(outcome: CombatOutcome): string {
  const verb = outcome.kind === 'ranged' ? 'shoots' : 'attacks';
  if (outcome.capturedUnitId !== null) {
    return `${outcome.attackerName} captures ${outcome.defenderName}`;
  }
  const trade =
    outcome.damageToAttacker > 0
      ? `${outcome.damageToDefender} − ${outcome.damageToAttacker}`
      : `${outcome.damageToDefender}`;
  const tail = outcome.capturedCityId !== null ? ' · captured!' : '';
  return `${outcome.attackerName} ${verb} ${outcome.defenderName}: ${trade}${tail}`;
}

// --- elimination and victory ------------------------------------------------

/**
 * Marks every player who has nothing left, and names the winner when one seat is
 * all that remains.
 *
 * Called from inside `applyCombat` and from nowhere else, which is both where
 * the loss happens and the only place it *can* happen in v1 — see the note in
 * `turn.ts` for why there is no elimination phase. Under simultaneous turns the
 * timing is load-bearing: a player whose last unit dies in the middle of a turn
 * window has not ended their turn, so a verdict that waited for the end of the
 * turn would leave the window waiting for a seat with nothing left to do.
 * Raising their `turnEnded` flag here closes the seat immediately, and
 * `clearTurnEnded` raises it again every turn thereafter (see `state.ts`).
 *
 * Victory is the last seat standing, and only in a game that had somebody to
 * stand against: a solo game never declares a winner, because winning by
 * default is not a result.
 */
export function updateElimination(state: GameState): void {
  // **The wild is not in this at all**, on either side of it, and both halves of
  // that matter. It is never *eliminated*: it holds nothing between camps and a
  // sweep that marked it out would be marking out a seat that is about to muster
  // again next resolution. And it is never *counted*: a solo game against
  // barbarians has two seats in `state.players`, so a rule that read the array
  // directly would declare the human victorious the moment the last raider fell —
  // and, worse, would refuse to declare anything in a two-empire game while a
  // single barbarian warrior was still standing somewhere in the fog. Both
  // questions are asked of `realPlayers`, the one register for "who counts".
  const roster = realPlayers(state);
  for (const player of roster) {
    if (player.eliminated) continue;
    if (state.units.some((unit) => unit.ownerId === player.id)) continue;
    if (state.cities.some((city) => city.ownerId === player.id)) continue;
    player.eliminated = true;
    state.turnEnded[player.id] = true;
  }

  const alive = roster.filter((player) => !player.eliminated);
  state.winnerId = roster.length > 1 && alive.length === 1 ? alive[0]!.id : null;
}

// --- siege ------------------------------------------------------------------

/**
 * What a besieged city lost this turn. `CombatOutcome`'s sibling one scale down.
 *
 * A *difference* rather than a fact about the world, exactly as every other
 * field of `TurnReport` is: by the time the resolution returns the town's hit
 * points have already moved and the board cannot say whether they moved because
 * of a siege or because somebody shot at it. `ownerId` is on the line because a
 * notice is per seat and the seat that needs to hear "Uruk is under siege" is the
 * one that owns Uruk.
 */
export interface SiegeReport {
  cityId: number;
  ownerId: number;
  /** Hit points taken. Never enough to empty the bar — see `underSiege`. */
  damage: number;
}

/**
 * Which hexes are denied to one empire, for the siege question and nothing else.
 *
 * `zocField`'s sibling and deliberately **not** `zocField` itself, for one
 * reason: the movement field has a `zocRule: 'borders'` clause (the Great Wall),
 * under which every hex a rival *owns* projects control. That is right for a
 * march — the wall slows an army crossing it — and catastrophic for a siege,
 * because a town standing inside a Great Wall empire's borders would be starving
 * with not one soldier in sight. A siege is an army parked outside the gates, so
 * the sources here are armies and towns and nothing else.
 *
 * The other difference is `held`. `zocField.adjacent` marks the *neighbours* of
 * each source and not the source's own hex, which is exactly right for "does
 * this step end my turn" and wrong for "is that hex mine to walk out through":
 * a warrior standing on a hex most certainly denies it. So two grids, one sweep.
 *
 * Hoisted once per **owner** per sweep (`healCities` caches one per seat), which
 * is `zocField`'s own bargain: a field built per city would walk every unit in
 * the world forty times a turn.
 */
export interface SiegeField {
  /** 1 where a hostile combat unit or a hostile city actually stands. */
  held: Uint8Array;
  /** 1 on `held` and on every hex one of those touches. */
  denied: Uint8Array;
}

export function siegeField(state: GameState, ownerId: number): SiegeField {
  const { map } = state;
  const held = new Uint8Array(map.tiles.length);
  const denied = new Uint8Array(map.tiles.length);
  // Arrays, never a `Set` — the sweep order is what makes two runs agree.
  const sources: Tile[] = [];
  const mark = (col: number, row: number): void => {
    const tile = getTileAt(map, col, row);
    if (!tile) return;
    const index = tileIndex(map, tile.col, tile.row);
    if (held[index] === 1) return;
    held[index] = 1;
    sources.push(tile);
  };
  for (const unit of state.units) {
    if (unit.ownerId === ownerId) continue;
    if (!isCombatant(unitDef(unit.type))) continue;
    mark(unit.col, unit.row);
  }
  for (const city of state.cities) {
    if (city.ownerId === ownerId) continue;
    mark(city.col, city.row);
  }
  for (const source of sources) {
    denied[tileIndex(map, source.col, source.row)] = 1;
    for (const neighbour of neighborTiles(map, tileHex(source))) {
      denied[tileIndex(map, neighbour.col, neighbour.row)] = 1;
    }
  }
  return { held, denied };
}

/**
 * Is this city cut off — every hex around it denied to whoever holds it?
 *
 * Derived every turn and **never stored**, which is the barbarian role's rule
 * applied to a town: a siege is a fact about where the armies are standing this
 * instant, and a flag on `City` would be a second answer that a save could
 * disagree with.
 *
 * Three kinds of neighbour and each is a different question:
 *
 *   · **Water** is denied only when an enemy is *standing on it*. This is the
 *     rule that makes a coastal city hard to starve and it is the intended one:
 *     an open sea lane is a supply line, so a port with one clear hex of water
 *     is not besieged however many soldiers are drawn up on the landward side.
 *     Nothing can blockade the sea by standing beside it.
 *   · **Impassable land** — a mountain — is denied by nature. Nothing marches
 *     through it in either direction, so it neither relieves the town nor needs
 *     an army parked on it.
 *   · **Everything else** is denied when it is inside the hostile field: an
 *     enemy stands there, or an enemy stands next to it.
 *
 * And one guard: at least one neighbour must be denied *by the field* rather
 * than by geography, so a town ringed by mountains is not permanently besieged
 * by nobody.
 */
export function underSiege(state: GameState, city: City, field: SiegeField): boolean {
  const centre = getTileAt(state.map, city.col, city.row);
  if (!centre) return false;
  let besiegers = 0;
  for (const neighbour of neighborTiles(state.map, tileHex(centre))) {
    const index = tileIndex(state.map, neighbour.col, neighbour.row);
    if (isWaterTerrain(neighbour.terrain)) {
      if (field.held[index] !== 1) return false;
      besiegers += 1;
      continue;
    }
    if (!isPassable(neighbour)) continue;
    if (field.denied[index] !== 1) return false;
    besiegers += 1;
  }
  return besiegers > 0;
}

// --- turn phases ------------------------------------------------------------

/**
 * `healCities`: every city recovers `combat.cityHealPerTurn`, up to full —
 * unless it is besieged, in which case it loses ground instead.
 *
 * A city heals unconditionally, unlike a unit — there is no "did it act this
 * turn" question to ask of a town, and a city that could be kept at 1 hit point
 * by one archer indefinitely would make a siege a formality rather than a race.
 * The one condition is the siege, and it is the whole of what a siege *is*: the
 * town neither heals nor holds, and the chip is `combat.siegeDamagePerTurn`
 * floored at 1 hit point, so an army camped outside the walls forever still
 * never takes the place. Somebody has to attack.
 *
 * It lives here rather than in `cities.ts` because hit points are a combat
 * concept: the rules that spend them are in this file, and the rule that
 * restores them belongs beside them.
 *
 * The report is the second parameter every phase takes (`TurnReport`), typed
 * structurally so this module need not import the pipeline it is run by. Cities
 * are walked in `state.cities` order — founding order — and the fields are
 * hoisted one per *seat*, `zocField`'s bargain: a `Map` keyed by owner, read
 * only by lookup, so nothing about an outcome depends on its iteration order.
 */
export function healCities(state: GameState, report?: { sieges: SiegeReport[] }): void {
  const amount = COMBAT.cityHealPerTurn;
  const fields = new Map<number, SiegeField>();
  for (const city of state.cities) {
    let field = fields.get(city.ownerId);
    if (!field) {
      field = siegeField(state, city.ownerId);
      fields.set(city.ownerId, field);
    }
    if (underSiege(state, city, field)) {
      const damage = Math.min(COMBAT.siegeDamagePerTurn, Math.max(0, city.hp - 1));
      if (damage > 0) city.hp -= damage;
      report?.sieges.push({ cityId: city.id, ownerId: city.ownerId, damage });
      continue;
    }
    const max = cityMaxHp(city);
    if (city.hp >= max) {
      clampCityHp(city);
      continue;
    }
    city.hp = Math.min(max, city.hp + amount);
  }
}

/**
 * `advanceFortify`: everybody still dug in digs a little deeper.
 *
 * The counter is capped at `maxFortifyTurns()` rather than left to climb, so
 * that a unit sitting on a hill for a hundred turns serialises the same as one
 * that has been there for three — the bonus stopped growing at two, and a number
 * that only differs where nothing differs is a number that breaks snapshot
 * comparison for no reason.
 */
export function advanceFortify(state: GameState): void {
  const cap = maxFortifyTurns();
  for (const unit of state.units) {
    const turns = unit.fortifiedTurns;
    if (turns === undefined) continue;
    unit.fortifiedTurns = Math.min(cap, turns + 1);
  }
}
