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
 *     defender = base · (1 + terrain defence + fortify bonus)
 *     attacker = base · (1 − riverAttackPenalty, when melee across a river)
 *
 * Terrain defence is summed from terrain, feature and hills (see
 * `terrainData.ts`); the fortify bonus is `turns × perTurn`, capped. A city
 * defends with `cityBaseStrength + cityStrengthPerPop × population` and takes
 * **no** terrain bonus — the walls are the terrain, and stacking a hill on top
 * of them made the early game unattackable in play.
 *
 * Melee and ranged
 * ----------------
 * One command, two resolutions, and the unit's data decides which: a type with
 * `rangedStrength` shoots, a type without it closes. Melee trades damage — the
 * defender hits back with its own strength, unless it is a civilian or a city —
 * and the survivor advances into a tile it emptied. Ranged is one-way: no
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
 * Deliberately deferred (v1 has none of these, on purpose)
 * -------------------------------------------------------
 *   · **Zone of control.** Units do not slow or lock their neighbours; movement
 *     is exactly what Milestone 2 made it.
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

import { assignCitizens, cityAt } from './cities';
import { blocksLineOfSight, hasLineOfSight } from './los';
import {
  type GameMap,
  type Tile,
  getTileAt,
  tileHex,
  wrappedDistance,
} from './map';
import { type Cell, canStopOn } from './pathfind';
import { nextRange } from './rng';
import { RULES } from './rulesData';
import {
  type City,
  type GameState,
  type Unit,
  removeUnit,
  unitById,
} from './state';
import { defenseBonus } from './terrainData';
import { isVisibleTo, recomputeVisibilityFor } from './visibility';
import { type UnitDef, unitDef } from './unitData';
import { unitsOnTile } from './units';
import { DIRECTION_COUNT, hasRiverEdge, neighborInDirection } from './water';

const COMBAT = RULES.combat;

// --- unit questions ---------------------------------------------------------

/**
 * Does this type shoot?
 *
 * THE test, asked of the data rather than of a name: `rangedStrength` and
 * `range` are declared as an optional pair (see `unitData.ts`), so a unit is
 * ranged exactly when a designer gave it a bow. Nothing here compares a type
 * against the string `"archer"`, for the same reason nothing compares against
 * `"settler"` to decide who may found a city.
 */
export function isRanged(def: UnitDef): boolean {
  return def.rangedStrength !== undefined && def.range !== undefined;
}

/** True when the unit can attack at all: a soldier or a shooter, not a settler. */
export function isCombatant(def: UnitDef): boolean {
  return def.combatStrength > 0 || isRanged(def);
}

/** True when the unit is a civilian in combat terms — capturable, never a threat. */
export function isCivilian(def: UnitDef): boolean {
  return !isCombatant(def);
}

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

/** The defence fraction this unit's entrenchment is worth right now. */
export function fortifyBonus(unit: Unit): number {
  const turns = unit.fortifiedTurns;
  if (turns === undefined) return 0;
  return Math.min(turns * COMBAT.fortifyBonusPerTurn, COMBAT.fortifyMax);
}

/**
 * Shakes a unit out of its trench. Returns whether it was in one.
 *
 * The key is *deleted* rather than zeroed, because presence is the state (see
 * `Unit.fortifiedTurns`) and a unit that never fortified must serialise
 * identically to one that just stopped. Called from exactly two places, which
 * between them are the definition of the rule: `movement.ts`, when a unit's
 * position changes, and `applyCombat`, when it attacks.
 */
export function breakFortify(unit: Unit): boolean {
  if (unit.fortifiedTurns === undefined) return false;
  delete unit.fortifiedTurns;
  return true;
}

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

// --- the evaluator ----------------------------------------------------------

export type CombatKind = 'melee' | 'ranged';

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
  /** Effective strengths, every modifier already in them. */
  attackerStrength: number;
  defenderStrength: number;
  /** The defender's terrain share of its multiplier, for the card to itemise. */
  terrainBonus: number;
  /** Its fortification share. Always 0 for a city. */
  fortifyBonus: number;
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
    const range = def.range!;
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

  const terrainBonus = defenseBonus(tile.terrain, tile.feature, tile.hills);
  const acrossRiver = kind === 'melee' && crossesRiver(state.map, from, tile);

  const attackerBase = kind === 'ranged' ? def.rangedStrength! : def.combatStrength;
  const attackerStrength = attackerBase * (acrossRiver ? 1 - COMBAT.riverAttackPenalty : 1);

  let defenderStrength: number;
  let defenderFortify = 0;
  let defenderName: string;
  let defenderHp: number;
  let defenderMaxHp: number;

  if (target.city) {
    // A city's walls *are* its terrain: no ground bonus on top of them.
    defenderStrength = COMBAT.cityBaseStrength + COMBAT.cityStrengthPerPop * target.city.population;
    defenderName = target.city.name;
    defenderHp = target.city.hp;
    defenderMaxHp = COMBAT.cityBaseHp;
  } else {
    const defenderUnit = target.unit!;
    const defenderDef = unitDef(defenderUnit.type);
    defenderFortify = fortifyBonus(defenderUnit);
    defenderStrength = defenderDef.combatStrength * (1 + terrainBonus + defenderFortify);
    defenderName = defenderDef.name;
    defenderHp = defenderUnit.hp;
    defenderMaxHp = defenderDef.maxHp;
  }

  // --- damage ------------------------------------------------------------

  const capturesUnit =
    kind === 'melee' &&
    target.unit !== null &&
    isCivilian(unitDef(target.unit.type)) &&
    COMBAT.captureCivilians;

  // A city under bombardment is softened, never taken: the Civ rule that keeps
  // archers out of the capital-capturing business.
  const defenderFloor = target.city !== null && kind === 'ranged' ? 1 : 0;

  const baseToDefender = capturesUnit ? 0 : curve(attackerStrength - defenderStrength);
  // The defender hits back only in a melee, and only when it is something that
  // can hit back: a city has no counter-attack in v1, and neither has a settler.
  const counters =
    kind === 'melee' &&
    target.unit !== null &&
    isCombatant(unitDef(target.unit.type)) &&
    !capturesUnit;
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
    terrainBonus: target.city ? 0 : terrainBonus,
    fortifyBonus: defenderFortify,
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
  damageToDefender: number;
  damageToAttacker: number;
  /** Units taken off the board, in removal order: defender first if both died. */
  killed: { id: number; type: Unit['type']; ownerId: number; col: number; row: number }[];
  /** A civilian that changed hands instead of dying, or `null`. */
  capturedUnitId: number | null;
  /** A city that changed hands, or `null`. */
  capturedCityId: number | null;
  /** True when the melee attacker moved into the tile it emptied. */
  advanced: boolean;
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
    damageToDefender: 0,
    damageToAttacker: 0,
    killed: [],
    capturedUnitId: null,
    capturedCityId: null,
    advanced: false,
    attackerSurvived: true,
  };

  // 1 & 2 — the dice, and the damage they decide.
  let defenderDied = false;
  if (forecast.capturesUnit) {
    capture(target.unit!, attacker.ownerId);
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
      }
    } else {
      const defender = target.unit!;
      defender.hp -= dealt;
      if (defender.hp <= 0) {
        outcome.killed.push(snapshotFallen(defender));
        removeUnit(state, defender.id);
        defenderDied = true;
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
    removeUnit(state, attacker.id);
    outcome.attackerSurvived = false;
  } else {
    attacker.movesLeft = 0;
    attacker.hasAttacked = true;
    breakFortify(attacker);
    // The route the player approved ended in a fight. Resuming it next turn
    // would be the unit deciding to walk into whatever is still standing there.
    delete attacker.path;

    // 5 — the advance. Only melee, only into a tile this attack emptied, and
    // only when the unit could legally have stopped there anyway: a surviving
    // enemy civilian, or a friendly unit already filling the stack, keeps the
    // attacker where it is rather than teleporting anybody.
    if (forecast.kind === 'melee' && defenderDied && canStopOn(state, attacker, tile)) {
      attacker.col = tile.col;
      attacker.row = tile.row;
      outcome.advanced = true;
    }
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
 * A civilian changes hands: new owner, no movement left this turn, no orders.
 *
 * The orders are cleared because they were the *previous* owner's plan and a
 * captured settler marching back to its old capital would be absurd. It does not
 * move, and neither does its captor — advancing is tied to a tile being emptied,
 * and a captured civilian is still standing on this one.
 */
function capture(unit: Unit, ownerId: number): void {
  unit.ownerId = ownerId;
  unit.movesLeft = 0;
  delete unit.path;
  breakFortify(unit);
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
 */
function captureCity(state: GameState, city: City, ownerId: number): void {
  city.ownerId = ownerId;
  city.hp = Math.max(1, Math.round(COMBAT.cityBaseHp * COMBAT.cityCaptureHpFraction));
  city.queue = [];
  city.hammerBasket = 0;
  city.lockedTiles = [];
  assignCitizens(state, city);
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
  for (const player of state.players) {
    if (player.eliminated) continue;
    if (state.units.some((unit) => unit.ownerId === player.id)) continue;
    if (state.cities.some((city) => city.ownerId === player.id)) continue;
    player.eliminated = true;
    state.turnEnded[player.id] = true;
  }

  const alive = state.players.filter((player) => !player.eliminated);
  state.winnerId = state.players.length > 1 && alive.length === 1 ? alive[0]!.id : null;
}

// --- turn phases ------------------------------------------------------------

/**
 * `healCities`: every city recovers `combat.cityHealPerTurn`, up to full.
 *
 * A city heals unconditionally, unlike a unit — there is no "did it act this
 * turn" question to ask of a town, and a city that could be kept at 1 hit point
 * by one archer indefinitely would make a siege a formality rather than a race.
 *
 * It lives here rather than in `cities.ts` because hit points are a combat
 * concept: the rules that spend them are in this file, and the rule that
 * restores them belongs beside them.
 */
export function healCities(state: GameState): void {
  const amount = COMBAT.cityHealPerTurn;
  for (const city of state.cities) {
    if (city.hp >= COMBAT.cityBaseHp) continue;
    city.hp = Math.min(COMBAT.cityBaseHp, city.hp + amount);
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
