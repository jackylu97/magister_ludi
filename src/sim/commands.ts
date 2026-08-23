/**
 * The one entry point that changes the game: `applyCommand(state, command)`.
 *
 * Everything a player (or an AI, or a replay, or the network) can do is a plain
 * JSON object. Nothing outside this module may mutate a `GameState`; if a new
 * rule needs to change the world it becomes a command type here, or a turn
 * phase in `turn.ts` that this reducer invokes.
 *
 * Mutation contract
 * -----------------
 * On success the command mutates `state` **in place** and returns `{ ok: true }`.
 * On failure it returns `{ ok: false, error }` and the state is left *exactly*
 * as it was — every handler validates completely before it writes anything, so
 * a rejected command is unobservable. Callers may rely on that: a failed
 * command is never appended to the log (see `dispatch` in `game.ts`).
 *
 * In-place mutation is deliberate, not laziness. A Civ-sized state is a big
 * object graph and copying it every command would cost more than the whole
 * simulation; undo, replay and "what did the last turn change?" are served by
 * re-running the command log from `newGame`, which is cheap because the log is
 * tiny and generation is deterministic. Structural sharing would buy immutable
 * snapshots at the price of making every rule harder to write.
 *
 * Exhaustiveness
 * --------------
 * The switch ends in a `never`-typed default: adding a member to `Command`
 * without handling it here is a compile error, not a silent no-op. The same
 * branch still returns an error at runtime, because a command can arrive from a
 * save file or a socket and be anything at all.
 *
 * Who is acting
 * -------------
 * Turns are simultaneous: everyone plays inside one shared window, so a command
 * cannot be attributed to "whoever's turn it is". Every command therefore names
 * its author in `playerId`, and every handler checks that author before it
 * checks anything else — the player exists, owns what it is about to move, and
 * has not already ended the turn. A remote peer's command is validated by the
 * same code that validates the local player's, because there is only one code.
 *
 * Contention
 * ----------
 * Two players reaching for the same tile in the same window are resolved by the
 * position of their commands in the log: the first one applied gets the tile and
 * the second is rejected, exactly as if they had been sequential. Log order is
 * the whole of the tie-break, which is what keeps a replay identical to the game
 * it replays.
 *
 * Combat is not an exception to any of this
 * -----------------------------------------
 * An `attack` is a command like every other: it resolves immediately, in log
 * order, and it rolls its dice from `state.rng` as a state mutation. There is no
 * combat phase, no batching of a turn's attacks, and no window in which a
 * declared attack waits for anything. That is the whole model, and the case
 * everybody asks about needs no rule of its own: a unit killed by an earlier
 * command in the same window is gone from `state.units`, so a later command *by*
 * it fails at the id lookup and a later command *against* it finds nothing to
 * attack — both refused cleanly, both leaving the state byte-identical. The
 * validate-fully contract above is what buys that for free.
 */

import { isBuildingId } from './buildingData';
import { assignCitizens, assignableTiles, foundCityAt, foundingError } from './cities';
import { applyCombat, fortifyError } from './combat';
import type { ImprovementId } from './improvementData';
import { buildImprovementAt, improvementError, pillageAt, pillageError } from './improvements';
import { getTileAt, tileIndex } from './map';
import { advanceAlongPath } from './movement';
import { type Cell, canStopOn, findPath, isPassable } from './pathfind';
import { RULES } from './rulesData';
import {
  type City,
  type GameState,
  type Player,
  type QueueItem,
  allTurnsEnded,
  cityById,
  clearTurnEnded,
  createUnit,
  hasEndedTurn,
  playerById,
  removeUnit,
  unitById,
} from './state';
import { buildError, researchError } from './tech';
import type { TechId } from './techData';
import { runEndOfTurn } from './turn';
import { type UnitTypeId, isUnitTypeId, unitDef } from './unitData';
import { hasStackingRoom } from './units';
import { recomputeVisibility } from './visibility';

// --- command types ----------------------------------------------------------

/**
 * The part every command shares: who issued it.
 *
 * Not "whose turn it is" — there is no such thing under simultaneous turns —
 * but the authority the command is claiming. In single player the UI stamps its
 * local seat on everything it sends; over a network the server stamps the
 * connection it arrived on. Either way the reducer trusts the field only as far
 * as it validates it.
 */
export interface PlayerCommand {
  /** Id of the player acting. Must name a player in `state.players`. */
  playerId: number;
}

/**
 * Ends this player's turn. Every other player may still be acting; when the
 * last outstanding seat ends, the end-of-turn phases resolve, every seat reopens
 * and the turn counter advances.
 */
export interface EndTurnCommand extends PlayerCommand {
  type: 'endTurn';
}

/**
 * Orders a unit to `target`, however far away it is.
 *
 * One command covers both a single step and a ten-turn march: the reducer finds
 * the route, walks as much of it as this turn's movement pays for, and parks the
 * remainder on the unit as a standing order that `resetMovement` resumes. A
 * second `moveUnit` for the same unit replaces the first — the player changed
 * their mind, and half of an abandoned route is not a plan.
 *
 * `playerId` must own the unit and must not have ended the turn: a seat that has
 * declared itself finished is finished, however much movement its units have
 * left.
 */
export interface MoveUnitCommand extends PlayerCommand {
  type: 'moveUnit';
  unitId: number;
  target: Cell;
}

/**
 * Cancels a unit's standing order, leaving it where it is.
 *
 * The other half of `moveUnit`: an order that spans turns is resumed by
 * `resetMovement` without asking again, so there has to be a way to say "stop".
 * It names the unit rather than carrying the route, because the route is
 * whatever the unit is still holding — a command that restated it could disagree
 * with the state it was meant to clear.
 *
 * It is *not* a movement command: nothing on the board moves, and the unit keeps
 * every movement point it has. It is still turn-gated exactly like `moveUnit`,
 * and that is a deliberate choice rather than an inherited one. A stored order is
 * a decision the player made during their turn, and `resetMovement` will act on
 * it in the resolution that a finished seat has already handed over to. Letting a
 * seat that has declared itself finished reach back in and revoke that decision
 * would make "I have ended my turn" mean less than it says — and under
 * simultaneous turns it would be a second, quieter turn taken after everyone
 * else's window closed.
 *
 * Refusing on a unit with no stored order is deliberate too: "cancel nothing"
 * has no effect to log, and an accepted no-op would put a command in the log
 * that a replay has to apply and that says nothing about what happened.
 */
export interface CancelOrderCommand extends PlayerCommand {
  type: 'cancelOrder';
  unitId: number;
}

/**
 * Puts a new unit on the board. Used by tests and debugging today, and by city
 * production once cities can build; keeping it a command means all three go
 * through the same validation instead of reaching into `state.units`.
 *
 * The two ids are different questions and both are checked. `playerId` is who
 * *asked* — a debug console, a test, or (later) the production system acting for
 * a city's owner; `ownerId` is whose unit the new piece becomes. They usually
 * coincide and are allowed not to, which is why ending the turn does not close
 * this command the way it closes `moveUnit`.
 */
export interface SpawnUnitCommand extends PlayerCommand {
  type: 'spawnUnit';
  /** The player the new unit belongs to, which need not be `playerId`. */
  ownerId: number;
  unitType: UnitTypeId;
  at: Cell;
}

/**
 * Spends a settler to plant a city on the tile it is standing on.
 *
 * The unit is *consumed*, not moved — it is the city now — so this is one of the
 * few commands that removes something from the board. It names the unit rather
 * than the tile because the settler is what authorises it: the tile is wherever
 * that unit happens to be, and asking for a tile would invite a UI that let a
 * player found a city across the map.
 *
 * Turn-gated exactly like `moveUnit`: founding a city is an act, and a seat that
 * has declared itself finished has finished acting.
 */
export interface FoundCityCommand extends PlayerCommand {
  type: 'foundCity';
  settlerUnitId: number;
}

/**
 * Replaces a city's production queue wholesale.
 *
 * Whole-queue replacement rather than push/remove/reorder commands, for three
 * reasons: the queue is short, the resulting command is a complete statement of
 * intent (so a replay never depends on a queue's prior contents), and one
 * validation path covers every edit the UI can make. The panel builds the array
 * it wants and sends it; the reducer either takes all of it or none.
 *
 * Order is the player's intent and is preserved exactly. Turn-gated like
 * `moveUnit` — a finished seat is finished, and letting it keep re-planning
 * production would be a second, quieter turn.
 */
export interface SetCityProductionCommand extends PlayerCommand {
  type: 'setCityProduction';
  cityId: number;
  queue: QueueItem[];
}

/**
 * Pins this city's citizens to a set of tiles, replacing whatever was pinned
 * before.
 *
 * Whole-list replacement for the same three reasons `setCityProduction` is (see
 * above): the list is short, the command is a complete statement of intent, and
 * one validation path covers every edit the panel can make.
 *
 * Every cell must be a tile this city could actually work — its own, workable,
 * inside the work radius — and there may be no more of them than the city has
 * citizens. Refusing at the gate is what keeps the panel honest: a pin that
 * could never be honoured would be a dot the player put on the board and the
 * simulation quietly ignored.
 *
 * Turn-gated like `moveUnit`: re-planning who works what is an act, and a seat
 * that has declared itself finished has finished acting.
 */
export interface SetLockedTilesCommand extends PlayerCommand {
  type: 'setLockedTiles';
  cityId: number;
  cells: Cell[];
}

/**
 * Points this player's science at a technology.
 *
 * The only research command there is, because the model has only one decision in
 * it: progress *is* `Player.sciencePool` (see `tech.ts`), so choosing is aiming
 * rather than spending, and there is nothing to cancel, refund or bank
 * separately. Switching mid-research is therefore legal and lossless — a player
 * who reacts to something another seat did inside the same turn window keeps
 * every beaker they had banked.
 *
 * Re-choosing the tech already being researched is refused: it would change
 * nothing and put a log entry in the save that says nothing. So is a tech
 * already held, and one whose prerequisites are not met.
 *
 * Turn-gated like `setCityProduction`: choosing what to learn is an act, and a
 * seat that has declared itself finished has finished acting.
 */
export interface ChooseResearchCommand extends PlayerCommand {
  type: 'chooseResearch';
  techId: TechId;
}

/**
 * Attacks whatever of somebody else's is standing on `target`.
 *
 * A command of its own rather than an overload of `moveUnit`, and that is the
 * important part of the design. Attacking and moving look similar from a mouse's
 * point of view and are nothing alike underneath: one spends movement and can be
 * half-completed across several turns, the other spends the whole turn, rolls
 * dice, and may end with the actor dead. Folding them together would mean a
 * mis-aimed move order could start a war, a path preview would have to mean two
 * things, and the reducer would have to guess which the player meant. So the UI
 * decides — right-click an enemy is an attack, right-click ground is a move —
 * and the log records which was intended rather than what happened to be there.
 *
 * The tile is named, not the victim. What is actually hit is the targeting rule
 * in `combat.ts` (military unit, then city, then civilian), asked at the moment
 * the command applies — so a defender that died to an earlier command in the
 * same turn window simply is not there, and the attack is refused or lands on
 * whatever remains. The interface asks the same question through `previewCombat`
 * and therefore always aims at the thing that will be hit.
 *
 * Melee or ranged is decided by the *unit*, never by the command: a type with
 * `rangedStrength` shoots and a type without it closes. One command, because
 * from the player's side it is one gesture.
 *
 * Turn-gated like `moveUnit`: fighting is an act, and a seat that has declared
 * itself finished has finished acting.
 */
export interface AttackCommand extends PlayerCommand {
  type: 'attack';
  unitId: number;
  target: Cell;
}

/**
 * Digs a unit in where it stands.
 *
 * The cheapest possible order and the most valuable: it costs nothing, it can be
 * given with no movement left, and it pays `combat.fortifyBonusPerTurn` of
 * defence for every turn the unit then stays put, up to `combat.fortifyMax`. It
 * breaks the moment the unit moves or attacks (see `breakFortify`), so it is a
 * standing decision rather than a toggle to be micromanaged.
 *
 * It does *not* require movement, unlike founding a city. Fortifying is what a
 * unit that has already marched does with the rest of its turn, and requiring
 * movement would make the order useless in exactly the situation it exists for —
 * a unit that just arrived somewhere it means to hold.
 *
 * Re-fortifying an already-fortified unit is refused, for the reason
 * `chooseResearch` refuses re-choosing: it would change nothing and put a log
 * entry in the save that says nothing. There is no "unfortify" command either —
 * moving is how a unit stands up, and a second verb for it would be a second way
 * to say the same thing.
 */
export interface FortifyCommand extends PlayerCommand {
  type: 'fortify';
  unitId: number;
}

/**
 * Spends one of a worker's charges to lay an improvement on the tile it stands
 * on.
 *
 * It names the unit and the improvement, never the tile — the worker is what
 * authorises the work and the tile is wherever that worker happens to be, which
 * is `foundCity`'s argument exactly. A command that carried a target would
 * invite an interface that let a player farm a hex on the other side of the map.
 *
 * **Instant.** There is no progress, no partial state and no "worker is busy"
 * flag: the improvement is on the ground the moment the command is accepted.
 * That is the whole architectural reason the charge model was chosen (design
 * ledger, M7) — under simultaneous turns a half-built farm is a thing two seats
 * can contend over, and this game has no such thing.
 *
 * It spends *all* the unit's remaining movement, unlike `pillage`, which spends
 * one point. Building is the turn's work.
 *
 * Turn-gated like `moveUnit`: building is an act, and a seat that has declared
 * itself finished has finished acting.
 */
export interface BuildImprovementCommand extends PlayerCommand {
  type: 'buildImprovement';
  unitId: number;
  improvement: ImprovementId;
}

/**
 * Tears an improvement out of ground that is not yours, and pockets the salvage.
 *
 * A command of its own rather than a mode of `attack`, for `attack`'s own
 * reason: the two look similar from a mouse's point of view and are nothing
 * alike underneath. An attack rolls dice, may kill the actor and spends the
 * whole turn; a raid is deterministic, costs a single movement point and leaves
 * the column riding on. Folding them together would mean a mis-aimed order
 * burned a farm instead of starting a fight.
 *
 * Like `attack` and `foundCity` it names no tile: the tile is where the unit is.
 * Turn-gated like every other act.
 */
export interface PillageCommand extends PlayerCommand {
  type: 'pillage';
  unitId: number;
}

/** Every legal mutation of the game, as serializable data. */
export type Command =
  | EndTurnCommand
  | MoveUnitCommand
  | CancelOrderCommand
  | SpawnUnitCommand
  | FoundCityCommand
  | SetCityProductionCommand
  | SetLockedTilesCommand
  | ChooseResearchCommand
  | AttackCommand
  | FortifyCommand
  | BuildImprovementCommand
  | PillageCommand;

/** Convenience alias for the discriminant. */
export type CommandType = Command['type'];

export type CommandResult = { ok: true } | { ok: false; error: string };

function ok(): CommandResult {
  return { ok: true };
}

function fail(error: string): CommandResult {
  return { ok: false, error };
}

/**
 * Reads the discriminant defensively: `command` is typed, but at runtime it may
 * have come from a save file or the network, so it may be anything.
 */
function readCommandType(command: Command): string | undefined {
  const value: unknown = command;
  if (typeof value !== 'object' || value === null) return undefined;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' ? type : undefined;
}

/**
 * The `default` branch of the reducer.
 *
 * `kind` is typed `never`, so the moment a member of `Command` has no `case`
 * this call stops compiling. It still produces a runtime error too, because the
 * command may have arrived from a save file or a socket and be anything at all
 * — hence the separately-read `type` string for the message.
 */
function unhandledCommand(_kind: never, type: string): CommandResult {
  return fail(`Unknown command type "${type}"`);
}

// --- handlers ---------------------------------------------------------------

/**
 * The player a command claims to come from, or an error naming what is wrong.
 *
 * Every handler starts here, before it looks at anything the command is *about*.
 * The `turnEnded` length check belongs with it rather than in `endTurn` alone:
 * the flags are the turn, and a state whose flags do not line up with its
 * players is one no handler should be reasoning about.
 */
function resolveActor(state: GameState, playerId: unknown): Player | string {
  if (state.turnEnded.length !== state.players.length) {
    return (
      `Corrupt turnEnded: ${state.turnEnded.length} flag(s) for ` +
      `${state.players.length} player(s)`
    );
  }
  if (typeof playerId !== 'number' || !Number.isInteger(playerId)) {
    return `Command needs an integer playerId, got ${String(playerId)}`;
  }
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  return player;
}

/**
 * Marks one seat finished, and resolves the turn when it was the last one.
 *
 * Under simultaneous turns this is the only thing that moves the world: the
 * end-of-turn phases run *before* the counter advances, so a phase still sees
 * the turn that is ending, and every seat is reopened in the same breath so the
 * next window starts with nobody finished.
 */
function applyEndTurn(state: GameState, command: EndTurnCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has already ended turn ${state.turn}`);
  }

  state.turnEnded[actor.id] = true;
  if (!allTurnsEnded(state)) return ok();

  runEndOfTurn(state);
  clearTurnEnded(state);
  state.turn += 1;
  return ok();
}

/** Reads an offset cell defensively; commands may arrive from a save or a socket. */
function readCell(value: unknown): Cell | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { col, row } = value as { col?: unknown; row?: unknown };
  if (!Number.isInteger(col) || !Number.isInteger(row)) return undefined;
  return { col: col as number, row: row as number };
}

/**
 * Moves a unit as far towards `target` as this turn allows, storing the rest of
 * the route as a standing order.
 *
 * Everything is checked before anything is written: an illegal order leaves the
 * unit — position, movement, standing order — exactly as it was. Note that the
 * *target* is checked with `canStopOn` rather than merely being passable, so an
 * order that could only ever end on top of a friendly unit is refused up front
 * rather than half-walked.
 *
 * The tile checks read the board as it stands *at this point in the log*, which
 * is what makes contention between simultaneous players fall out for free: the
 * loser of a race for a tile finds it occupied and is refused.
 */
function applyMoveUnit(state: GameState, command: MoveUnitCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot move`);
  }

  const target = readCell(command.target);
  if (!target) return fail('moveUnit needs an integer target { col, row }');

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }
  if (unit.movesLeft <= 0) return fail(`Unit ${unit.id} has no movement left`);

  // `getTileAt` wraps the column, so an un-wrapped target from the UI resolves
  // to the tile the player actually clicked.
  const tile = getTileAt(state.map, target.col, target.row);
  if (!tile) return fail(`Target (${target.col}, ${target.row}) is off the map`);
  if (tile.col === unit.col && tile.row === unit.row) {
    return fail(`Unit ${unit.id} is already on (${tile.col}, ${tile.row})`);
  }
  if (!canStopOn(state, unit, tile)) {
    return fail(`Unit ${unit.id} cannot stop on (${tile.col}, ${tile.row})`);
  }

  // The route is found over the *true* map, not over what this seat has charted.
  // That is the Civ rule and it is deliberate (see `visibility.ts`): fog is a
  // mask the interface reads, not a second blinded copy of the world, so a
  // player may order a march into Terra Incognita and find out what is there by
  // walking into it.
  const path = findPath(state, unit, tile);
  if (!path) return fail(`No path from (${unit.col}, ${unit.row}) to (${tile.col}, ${tile.row})`);

  advanceAlongPath(state, unit, path);
  // The unit moved, so what its owner can see moved with it. One recompute per
  // order rather than one per step: `advanceAlongPath` may walk five tiles, and
  // only where it stopped decides what is lit.
  recomputeVisibility(state, actor.id);
  return ok();
}

/**
 * Drops a unit's standing order. Nothing else about the unit changes.
 *
 * Fully validated before the single mutation, like every other handler: a
 * refusal leaves the unit's `path` — and everything else — byte-identical. The
 * key is *deleted* rather than emptied, which is `movement.ts`'s convention for
 * an idle unit (see its docblock): a unit that never had an order and a unit
 * whose order was cancelled must serialise the same way, or two states that are
 * the same game would not compare equal.
 */
function applyCancelOrder(state: GameState, command: CancelOrderCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot cancel orders`);
  }

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }
  // `length === 0` is only reachable from a hand-edited save; either way there
  // is no order to cancel and nothing worth logging.
  if (!unit.path || unit.path.length === 0) {
    return fail(`Unit ${unit.id} has no standing order`);
  }

  delete unit.path;
  return ok();
}

/**
 * Places a new unit, if the terrain allows it and the stack has room.
 *
 * Both ids are validated: `playerId` (who asked) and `ownerId` (whose unit it
 * becomes). See `SpawnUnitCommand` for why they are allowed to differ.
 */
function applySpawnUnit(state: GameState, command: SpawnUnitCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);

  const at = readCell(command.at);
  if (!at) return fail('spawnUnit needs an integer position { col, row }');
  if (!isUnitTypeId(command.unitType)) {
    return fail(`Unknown unit type "${String(command.unitType)}"`);
  }
  if (!playerById(state, command.ownerId)) {
    return fail(`No owner with id ${String(command.ownerId)}`);
  }

  const tile = getTileAt(state.map, at.col, at.row);
  if (!tile) return fail(`Position (${at.col}, ${at.row}) is off the map`);
  if (!isPassable(tile)) return fail(`(${tile.col}, ${tile.row}) is impassable`);

  const { category } = unitDef(command.unitType);
  if (!hasStackingRoom(state, tile.col, tile.row, category)) {
    return fail(
      `(${tile.col}, ${tile.row}) already holds ` +
        `${RULES.stacking.perCategoryPerTile} ${category} unit(s)`,
    );
  }

  createUnit(state, command.ownerId, command.unitType, tile.col, tile.row);
  return ok();
}

/**
 * Spends a settler to found a city where it stands.
 *
 * Everything is checked before anything is written, and the checks run in the
 * order a player would think of them: is this my unit, can it still act, can a
 * city stand *here*, and is here far enough from everybody else's cities.
 *
 * `movesLeft > 0` is required for the same reason a move is: founding is this
 * unit's action for the turn, and a settler that has already marched its full
 * allowance has spent it. The spacing rule counts *every* city, not just the
 * player's own — two empires cannot interleave their capitals.
 */
function applyFoundCity(state: GameState, command: FoundCityCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot found a city`);
  }

  const unit = unitById(state, command.settlerUnitId);
  if (!unit) return fail(`No unit with id ${String(command.settlerUnitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }
  // Everything about the *ground* — the unit's type and health, the terrain,
  // the territory and the spacing — is one shared rule, so that the UI's
  // "Found City" button can be enabled by exactly what this will accept.
  const problem = foundingError(state, unit);
  if (problem) return fail(problem);

  const tile = getTileAt(state.map, unit.col, unit.row)!;
  // Validation is done: the settler becomes the city.
  removeUnit(state, unit.id);
  foundCityAt(state, actor.id, tile);
  return ok();
}

/**
 * Reads one queue item defensively. Commands arrive from saves and sockets, so
 * neither the shape nor the ids can be trusted.
 */
function readQueueItem(value: unknown): QueueItem | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { kind, id } = value as { kind?: unknown; id?: unknown };
  if (kind === 'unit' && isUnitTypeId(id)) return { kind, id };
  if (kind === 'building' && isBuildingId(id)) return { kind, id };
  return undefined;
}

/**
 * Validates a whole queue against a city, returning the sanitised items or an
 * error message.
 *
 * The three rules a queue must satisfy, and why each is checked *here* rather
 * than being tolerated and skipped later:
 *
 *   - every id is real. A typo in a queue silently blocking production for a
 *     hundred turns is the worst possible failure mode.
 *   - a building is built once. Already in `city.buildings`, or twice in this
 *     queue, is a mistake the player cannot see the consequences of.
 *   - a unit's `minCityPop` is met *now*. A settler queued in a size-1 city is
 *     almost always a misclick. (If the city later shrinks below it, production
 *     holds instead — see `advanceProduction`. Refusing at the gate and holding
 *     afterwards are the same rule read at the two moments it can be read.)
 *   - the owner has the technology, and controls the strategic resource. Both
 *     asked through `buildError` (`tech.ts`), which is what the city panel
 *     disables its buttons with — so an offered button and an accepted queue are
 *     one rule, and the sentence the player reads on a refusal is the reducer's
 *     own. Techs are only ever gained, but a resource can be *lost* with the
 *     city that held it, so an item that passed this check can become illegal
 *     while it sits in the queue; `advanceProduction` holds it in that case
 *     rather than dropping it, exactly as it does for `minCityPop`.
 */
function validateQueue(state: GameState, city: City, raw: unknown): QueueItem[] | string {
  if (!Array.isArray(raw)) return 'setCityProduction needs a queue array';

  const items: QueueItem[] = [];
  const seenBuildings = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const item = readQueueItem(raw[i]);
    if (!item) return `Queue item ${i} is not a known unit or building`;

    const blocked = buildError(state, city.ownerId, item.kind, item.id);
    if (blocked !== null) return blocked;

    if (item.kind === 'building') {
      if (city.buildings.includes(item.id)) {
        return `${city.name} has already built ${item.id}`;
      }
      if (seenBuildings.has(item.id)) return `${item.id} appears twice in the queue`;
      seenBuildings.add(item.id);
    } else {
      const def = unitDef(item.id);
      if (city.population < def.minCityPop) {
        return (
          `${city.name} needs population ${def.minCityPop} to build a ` +
          `${def.name} (it has ${city.population})`
        );
      }
    }
    items.push(item);
  }
  return items;
}

/** Replaces a city's production queue. See `SetCityProductionCommand`. */
function applySetCityProduction(
  state: GameState,
  command: SetCityProductionCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot set production`);
  }

  const city = cityById(state, command.cityId);
  if (!city) return fail(`No city with id ${String(command.cityId)}`);
  if (city.ownerId !== actor.id) {
    return fail(`City ${city.id} does not belong to player ${actor.id}`);
  }

  const queue = validateQueue(state, city, command.queue);
  if (typeof queue === 'string') return fail(queue);

  // Copy: the command (and the log entry it becomes) must not be aliased into
  // the state, or a caller reusing its array would rewrite history.
  city.queue = queue.map((item) =>
    item.kind === 'unit'
      ? { kind: 'unit', id: item.id }
      : { kind: 'building', id: item.id },
  );
  return ok();
}

/**
 * Validates a whole pin list against a city, returning the sanitised cells or
 * an error message.
 *
 * Legality is asked of `assignableTiles` — the very function the assignment
 * runs on — rather than re-derived here from ownership, terrain and distance.
 * One rule, one implementation: a tile the panel can pin is exactly a tile a
 * citizen can be sent to, and the two cannot drift apart.
 */
function validateLockedCells(
  state: GameState,
  city: City,
  raw: unknown,
): Cell[] | string {
  if (!Array.isArray(raw)) return 'setLockedTiles needs a cells array';
  if (raw.length > city.population) {
    return (
      `${city.name} has ${city.population} citizen(s) and cannot pin ` +
      `${raw.length} tile(s)`
    );
  }

  const legal = new Set<number>();
  for (const tile of assignableTiles(state, city)) {
    legal.add(tileIndex(state.map, tile.col, tile.row));
  }

  const cells: Cell[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < raw.length; i++) {
    const cell = readCell(raw[i]);
    if (!cell) return `Locked tile ${i} is not an integer { col, row }`;
    // `getTileAt` wraps the column, so a cell that came from the UI un-wrapped
    // is canonicalised here rather than failing a lookup later.
    const tile = getTileAt(state.map, cell.col, cell.row);
    if (!tile) return `Locked tile ${i} (${cell.col}, ${cell.row}) is off the map`;
    const index = tileIndex(state.map, tile.col, tile.row);
    if (!legal.has(index)) {
      return `${city.name} cannot work (${tile.col}, ${tile.row})`;
    }
    if (seen.has(index)) {
      return `(${tile.col}, ${tile.row}) is pinned twice`;
    }
    seen.add(index);
    cells.push({ col: tile.col, row: tile.row });
  }
  return cells;
}

/**
 * Replaces a city's pinned tiles, then re-assigns its citizens on the spot.
 *
 * The immediate re-assignment is the one place `assignCitizens` runs outside
 * `collectYields`, and it is deliberate: pinning a tile is a *direct*
 * manipulation of who works what, and a panel that showed the old dots until
 * the end of the turn would be showing the player that their click did nothing.
 * It is safe because assignment is idempotent and derived — `collectYields`
 * recomputes it from scratch anyway and reaches the same answer.
 */
function applySetLockedTiles(
  state: GameState,
  command: SetLockedTilesCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot assign citizens`);
  }

  const city = cityById(state, command.cityId);
  if (!city) return fail(`No city with id ${String(command.cityId)}`);
  if (city.ownerId !== actor.id) {
    return fail(`City ${city.id} does not belong to player ${actor.id}`);
  }

  const cells = validateLockedCells(state, city, command.cells);
  if (typeof cells === 'string') return fail(cells);

  // Copy, for the same reason the queue is copied: the command becomes a log
  // entry, and a caller that reused its array would be rewriting history.
  city.lockedTiles = cells.map((cell) => ({ col: cell.col, row: cell.row }));
  assignCitizens(state, city);
  return ok();
}

/**
 * Aims this player's science at a technology. See `ChooseResearchCommand`.
 *
 * Two questions, asked in the order a player would think of them: may this seat
 * still act, and is that a technology they could start. The second is delegated
 * whole to `researchError` — the same function the tech screen enables its nodes
 * with — so a node the interface offers is a node this accepts.
 *
 * The mutation is one field. Nothing is spent: the pool is the progress, and it
 * stays exactly where it was even when the aim moves mid-research.
 */
function applyChooseResearch(
  state: GameState,
  command: ChooseResearchCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot choose research`);
  }

  const problem = researchError(state, actor.id, command.techId);
  if (problem) return fail(problem);

  actor.researching = command.techId;
  return ok();
}

/**
 * Resolves one attack. See `AttackCommand`, and `combat.ts` for the rules.
 *
 * Three questions belong to the reducer and are asked here — is this a real
 * seat, may it still act, and is that its unit — and every question about the
 * *fight* is delegated whole to `applyCombat`, which validates completely before
 * it writes a single field. That split is what makes the "one evaluator" promise
 * hold at the command boundary too: the interface's forecast comes from
 * `previewCombat`, which is the same computation this resolves, so a forecast
 * the player was shown is a fight the reducer will accept.
 */
function applyAttack(state: GameState, command: AttackCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot attack`);
  }

  const target = readCell(command.target);
  if (!target) return fail('attack needs an integer target { col, row }');

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }

  const result = applyCombat(state, unit.id, target);
  if (!result.ok) return fail(result.error);
  return ok();
}

/**
 * Digs a unit in. See `FortifyCommand`.
 *
 * The seat's questions here, the unit's delegated to `fortifyError` — the same
 * function the unit sheet enables its Fortify button with, so a live button and
 * an accepted command are one rule. The mutation is a single field.
 */
function applyFortify(state: GameState, command: FortifyCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot fortify`);
  }

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }
  const problem = fortifyError(unit);
  if (problem) return fail(problem);

  // Zero, not one: the bonus is paid for turns *survived* dug in, and
  // `advanceFortify` raises this at the end of every turn the unit stays put.
  unit.fortifiedTurns = 0;
  return ok();
}

/**
 * Lays an improvement. See `BuildImprovementCommand`, and `improvements.ts` for
 * the rules.
 *
 * The same three questions every handler asks first — is this a real seat, may
 * it still act, is that its unit — and every question about the *work* delegated
 * whole to `improvementError`, which is what the unit sheet builds its list of
 * offered improvements from. So a row the panel shows is a command this accepts.
 */
function applyBuildImprovement(
  state: GameState,
  command: BuildImprovementCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot build`);
  }

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }

  const problem = improvementError(state, unit.id, command.improvement);
  if (problem) return fail(problem);

  // Validation is done — `improvementError` has already established that the
  // unit is on the map and that the improvement id is real.
  const tile = getTileAt(state.map, unit.col, unit.row)!;
  buildImprovementAt(state, unit, tile, command.improvement);
  return ok();
}

/**
 * Burns somebody else's works. See `PillageCommand`.
 *
 * The seat's questions here, the raid's delegated to `pillageError` — the same
 * split `applyFortify` makes, and the same guarantee.
 */
function applyPillage(state: GameState, command: PillageCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot pillage`);
  }

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }

  const problem = pillageError(state, unit.id);
  if (problem) return fail(problem);

  const tile = getTileAt(state.map, unit.col, unit.row)!;
  pillageAt(state, unit, tile);
  return ok();
}

// --- reducer ----------------------------------------------------------------

/**
 * Applies one command. The only function in the simulation that mutates state.
 * See the module docblock for the success/failure contract.
 */
export function applyCommand(state: GameState, command: Command): CommandResult {
  const type = readCommandType(command);
  if (type === undefined) return fail('Command is not an object with a string "type"');

  // Switching on an aliased discriminant still narrows `command` inside each
  // case, and — unlike switching on `command.type` — it leaves `kind` (not
  // `command`) as the `never` the exhaustiveness check needs in `default`.
  const kind = command.type;
  switch (kind) {
    case 'endTurn':
      return applyEndTurn(state, command);
    case 'moveUnit':
      return applyMoveUnit(state, command);
    case 'cancelOrder':
      return applyCancelOrder(state, command);
    case 'spawnUnit':
      return applySpawnUnit(state, command);
    case 'foundCity':
      return applyFoundCity(state, command);
    case 'setCityProduction':
      return applySetCityProduction(state, command);
    case 'setLockedTiles':
      return applySetLockedTiles(state, command);
    case 'chooseResearch':
      return applyChooseResearch(state, command);
    case 'attack':
      return applyAttack(state, command);
    case 'fortify':
      return applyFortify(state, command);
    case 'buildImprovement':
      return applyBuildImprovement(state, command);
    case 'pillage':
      return applyPillage(state, command);
    default:
      return unhandledCommand(kind, type);
  }
}
