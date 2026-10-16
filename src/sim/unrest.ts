/**
 * **Unrest in a town taken by force** (batch WC1, `docs/flags.md` (rrrrrr)
 * part 1).
 *
 * A town taken by force enters unrest, whether its captor keeps it as a puppet
 * or annexes it, and so does a town its founder takes back. While it is in
 * unrest it makes no production, science or culture and its borders do not
 * grow; food, gold and faith are untouched, and so is buying things in it.
 * Unrest ends when the town's pacification reaches its target.
 *
 * Where each part of the rule lives:
 *
 *   · **the record** is `City.unrest` (`state.ts`), written by `startUnrest`
 *     from `captureCity` (`combat.ts`) and deleted by the `unrest` phase when
 *     the town is pacified. Presence is the state.
 *   · **the lost yields** are the unrest gate, the last step of a town's yields
 *     (`explainUnrestGate` in `yields/town.ts`, `docs/yields.md` step 13). It
 *     runs after both percentage stages, because percentages sum inside a stage
 *     and a −100% line could not hold a voice at nothing.
 *   · **the frozen borders** are three clauses in `cities.ts`: `borderGrowth`
 *     banks nothing toward the next tile, and `expandBorders` and
 *     `settleBorderWindfall` claim nothing.
 *   · **pacification** is this file: a labelled rate (`explainPacification`,
 *     rule 5) folded into a basket each turn by `runUnrest`.
 *   · **rebels** are this file too: an unguarded town in unrest raises a
 *     barbarian beside itself on every third unguarded turn (`runUnrest`).
 *
 * Every figure is in `rules.war.unrest`. Nothing here counts down: the target
 * and the basket are compared, and the rebel cadence counts the turns that
 * qualified (see `CityUnrest`).
 *
 * **Who counts as a garrison** is `isFieldSoldier`, the rules' own reading of
 * "a military unit standing in a town" (the card evaluator's `garrison` count
 * and the bot's `garrisonAt` read it too): a scout and a ship in the harbour do
 * not hold a town.
 */

import { buildingDef } from './buildingData';
import { buildingsEasingUnrest } from './buildingEffects';
import { turnsToFill } from './cities';
import { greatPersonDef, isGreatPersonId } from './greatPeopleData';
import { type Tile, getTileAt, tileHex, tileIndex, tileNeighbors, wrappedDistance } from './map';
import { isPassable } from './pathfind';
import { nextInt } from './rng';
import { RULES } from './rulesData';
import { type City, type GameState, type Unit, barbarianPlayer, createUnit } from './state';
import { type UnitTypeId, isFieldSoldier, unitDef } from './unitData';

/** Every figure of the rule. See `UnrestRules`. */
const UNREST = RULES.war.unrest;

/** Is this town in unrest? Presence of the record is the whole answer. */
export function inUnrest(city: City): boolean {
  return city.unrest !== undefined;
}

/**
 * The pacification a town of this many citizens needs.
 *
 * Exported because the bot reads it before a town is taken: it weighs how long
 * a target would sit in unrest when deciding whether to go after it.
 */
export function unrestTarget(population: number): number {
  return Math.max(0, UNREST.targetPerCitizen * population);
}

/**
 * Puts a town into unrest: a fresh record, with the target read off the
 * population it has now.
 *
 * Two callers:
 *
 *   · `captureCity`, after the town has changed hands. A town already in
 *     unrest is given a new record rather than keeping the old one, which is
 *     the ruling for a town taken again while still in unrest: the new owner
 *     starts from nothing, and the cadence of rebels starts over with it.
 *   · The pillage verb (`pillageAt`, through its helper `payPillage` in
 *     `improvements.ts`), since Dominion batch D3, when The Harrying burns a
 *     hex beside an ungarrisoned enemy town. It never calls this on a town
 *     already in unrest, so that town keeps the record it has.
 */
export function startUnrest(city: City): void {
  city.unrest = { target: unrestTarget(city.population), progress: 0, unguarded: 0 };
}

/**
 * The first military unit of the town's owner standing in the town, or `null`.
 *
 * `state.units` order, which is the log's, so the unit named on the panel's
 * garrison line is the same unit on every machine.
 */
export function unrestGarrison(state: GameState, city: City): Unit | null {
  for (const unit of state.units) {
    if (unit.ownerId !== city.ownerId) continue;
    if (unit.col !== city.col || unit.row !== city.row) continue;
    if (isFieldSoldier(unitDef(unit.type))) return unit;
  }
  return null;
}

/**
 * The first great general of the town's owner standing in the town or within
 * `rules.war.unrest.generalReach` of it, or `null`.
 *
 * Read the way the general's combat aura reads one (`generalAuraLines` in
 * `combat.ts`): the piece's own `greatWork` marker and the person's family,
 * never a type name, and the first in `state.units` order.
 */
export function unrestGeneral(state: GameState, city: City): Unit | null {
  const here = getTileAt(state.map, city.col, city.row);
  if (!here) return null;
  const centre = tileHex(here);
  for (const unit of state.units) {
    if (unit.ownerId !== city.ownerId) continue;
    if (unitDef(unit.type).greatWork !== true) continue;
    const person = unit.person;
    if (person === undefined || !isGreatPersonId(person)) continue;
    if (greatPersonDef(person).family !== 'general') continue;
    const stands = getTileAt(state.map, unit.col, unit.row);
    if (!stands) continue;
    if (wrappedDistance(state.map, centre, tileHex(stands)) > UNREST.generalReach) continue;
    return unit;
  }
  return null;
}

/** One reason a town's pacification fills, and how much it adds each turn. */
export interface PacificationLine {
  /** What the city panel prints: "Every turn", "Garrison · Spearman", "Courthouse". */
  source: string;
  /** Pacification this reason adds each turn. */
  amount: number;
}

/**
 * **How fast this town's unrest settles**, one line per reason (rule 5).
 *
 * Four reasons, in the order the panel prints them: every turn adds the base
 * rate; a military unit of the owner standing in the town adds the garrison
 * rate; a great general of the owner in or beside the town adds the general's
 * rate; and each building carrying the `easesUnrest` marker adds the building
 * rate. One garrison line however many soldiers stand there, and one general
 * line however many generals do. A reason worth nothing prints no line.
 *
 * It reads the board as it stands and does not ask whether the town is in
 * unrest; `runUnrest` and the panel only ask it of a town that is.
 */
export function explainPacification(state: GameState, city: City): PacificationLine[] {
  const lines: PacificationLine[] = [];
  if (UNREST.baseRate !== 0) lines.push({ source: 'Every turn', amount: UNREST.baseRate });
  const garrison = unrestGarrison(state, city);
  if (garrison !== null && UNREST.garrisonRate !== 0) {
    lines.push({ source: `Garrison · ${unitDef(garrison.type).name}`, amount: UNREST.garrisonRate });
  }
  const general = unrestGeneral(state, city);
  if (general !== null && general.person !== undefined && UNREST.generalRate !== 0) {
    const name = isGreatPersonId(general.person) ? greatPersonDef(general.person).name : 'A general';
    lines.push({ source: `Great general · ${name}`, amount: UNREST.generalRate });
  }
  if (UNREST.buildingRate !== 0) {
    for (const id of buildingsEasingUnrest(city)) {
      lines.push({ source: buildingDef(id).name, amount: UNREST.buildingRate });
    }
  }
  return lines;
}

/** The pacification a list of reasons adds each turn. The only sum of one. */
export function foldPacification(lines: readonly PacificationLine[]): number {
  let total = 0;
  for (const line of lines) total += line.amount;
  return total;
}

/**
 * Turns until this town's unrest ends at the rate it settles now, or `null`
 * for a town not in unrest or one that is not settling at all.
 *
 * Counted in resolutions, and it includes the one the player is about to end:
 * the `unrest` phase fills the basket after the town's yields are collected, so
 * a town reading "2 turns" makes nothing on the next two End Turns and works
 * normally from the third. `turnsToFill` is the same arithmetic the growth and
 * border clocks use, so the three bars on the town panel count alike.
 */
export function pacificationTurnsLeft(state: GameState, city: City): number | null {
  const unrest = city.unrest;
  if (unrest === undefined) return null;
  const rate = foldPacification(explainPacification(state, city));
  return turnsToFill(unrest.target - unrest.progress, rate);
}

/**
 * How many more unguarded turns until this town raises its next rebel, or
 * `null` for a town not in unrest, or when rebels are switched off.
 *
 * Unguarded turns only: a turn the town ends with a soldier of its owner inside
 * does not move this count. Whether the rebel actually rises also depends on
 * the town still being in unrest on that turn, because the `unrest` phase
 * fills the basket before it counts the turn (see `runUnrest`).
 */
export function rebelTurnsLeft(city: City): number | null {
  const unrest = city.unrest;
  if (unrest === undefined) return null;
  const every = UNREST.rebelEveryTurns;
  if (every <= 0) return null;
  return every - (unrest.unguarded % every);
}

/**
 * The hexes beside this town a rebel may rise on, in tile-index order.
 *
 * A free hex is dry ground that can be walked (`isPassable`) with nobody on
 * it: no piece of anyone's, no town and no camp. The six neighbours only, and
 * never the town's own hex. Empty when every neighbour is taken, which is the
 * ruling's "none if no hex is free".
 */
export function rebelGround(state: GameState, city: City): Tile[] {
  const here = getTileAt(state.map, city.col, city.row);
  if (!here) return [];
  const free: Tile[] = [];
  for (const tile of tileNeighbors(state.map, here)) {
    if (!isPassable(tile)) continue;
    if (state.units.some((unit) => unit.col === tile.col && unit.row === tile.row)) continue;
    if (state.cities.some((town) => town.col === tile.col && town.row === tile.row)) continue;
    if (state.camps.some((camp) => camp.col === tile.col && camp.row === tile.row)) continue;
    free.push(tile);
  }
  free.sort(
    (a, b) => tileIndex(state.map, a.col, a.row) - tileIndex(state.map, b.col, b.row),
  );
  return free;
}

/** What the `unrest` phase did to one town, for the toast and the log. */
export interface UnrestReport {
  /** `pacified`: the town's unrest ended. `rebel`: a rebel rose beside it. */
  kind: 'pacified' | 'rebel';
  cityId: number;
  /** The town's owner, which is who hears about it. */
  ownerId: number;
  /** The rebel's piece, on a `rebel` report. */
  unitId?: number;
  /** Where to point the camera: the rebel's hex, or the town's. */
  col: number;
  row: number;
}

/**
 * Raises one rebel beside this town, or nothing when the wild has no seat, the
 * world can field no barbarian, or no hex beside the town is free.
 *
 * The hex is drawn from `rebelGround` with `state.rng`, uniformly and in
 * tile-index order, which is how the wild places a camp (`foundCamps`): the
 * one die is which legal hex. The kind is handed in by the phase, because it is
 * the kind a camp standing on the town's hex would raise this turn
 * (`barbarianUnitType`) and that function lives in a module this one does not
 * import. From the moment it stands, the rebel is an ordinary barbarian: its
 * role is derived each turn like every other piece of the wild's.
 */
function raiseRebel(
  state: GameState,
  city: City,
  rebelKind: (at: { col: number; row: number }) => UnitTypeId | null,
): Unit | null {
  const wild = barbarianPlayer(state);
  if (!wild) return null;
  const type = rebelKind({ col: city.col, row: city.row });
  if (type === null) return null;
  const ground = rebelGround(state, city);
  if (ground.length === 0) return null;
  const tile = ground[nextInt(state.rng, 0, ground.length)]!;
  return createUnit(state, wild.id, type, tile.col, tile.row);
}

/**
 * **The `unrest` phase**: every town in unrest is settled a turn's worth, and
 * an unguarded one may raise a rebel.
 *
 * Towns are walked in `state.cities` order, which is founding order and the
 * order every other phase sweeps in. For each town in unrest, two steps, in
 * this order:
 *
 *   1. **Pacification.** The basket gains the fold of `explainPacification`.
 *      When it reaches the target the record is deleted, the town is reported
 *      pacified, and nothing else happens to it this turn.
 *   2. **Rebels.** A town still in unrest with no military unit of its owner
 *      inside counts the turn as unguarded. When that count reaches a multiple
 *      of `rules.war.unrest.rebelEveryTurns`, a rebel rises beside the town.
 *
 * Pacification goes first so that a town settled this turn raises no rebel on
 * the same turn: the turn it is pacified is the turn its unrest is over.
 *
 * Its place in `END_OF_TURN_PHASES` is the phase entry's docblock (`turn.ts`).
 * It writes nothing the yields memo or the meters fold except through
 * `createUnit`, which announces itself, so it owes the seating register
 * nothing: a town's citizens are placed by their tiles' own yields, which the
 * gate does not touch.
 */
export function runUnrest(
  state: GameState,
  reports: UnrestReport[],
  rebelKind: (at: { col: number; row: number }) => UnitTypeId | null,
): void {
  for (const city of state.cities) {
    const unrest = city.unrest;
    if (unrest === undefined) continue;
    unrest.progress += foldPacification(explainPacification(state, city));
    if (unrest.progress >= unrest.target) {
      delete city.unrest;
      reports.push({
        kind: 'pacified',
        cityId: city.id,
        ownerId: city.ownerId,
        col: city.col,
        row: city.row,
      });
      continue;
    }
    if (unrestGarrison(state, city) !== null) continue;
    unrest.unguarded += 1;
    const every = UNREST.rebelEveryTurns;
    if (every <= 0 || unrest.unguarded % every !== 0) continue;
    const rebel = raiseRebel(state, city, rebelKind);
    if (rebel === null) continue;
    reports.push({
      kind: 'rebel',
      cityId: city.id,
      ownerId: city.ownerId,
      unitId: rebel.id,
      col: rebel.col,
      row: rebel.row,
    });
  }
}
