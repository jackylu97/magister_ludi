/**
 * The whole game in one plain, serializable object.
 *
 * `GameState` is data only — no classes, no methods, no references to anything
 * outside itself. Everything it holds survives `JSON.stringify` unchanged
 * (see `snapshotState` in `game.ts`), which is what makes save files, replays,
 * network sync and debugging dumps all the same problem.
 *
 * Determinism
 * -----------
 * The generator is stored *in* the state (`state.rng`), so a roll is a state
 * mutation like any other and two runs of the same command log stay in lockstep.
 * Nothing in the simulation may call `Math.random()` or read the clock.
 *
 * The map is generated from `config.seed` directly, but gameplay must not roll
 * the same numbers the terrain did: `state.rng` is a *separate stream* derived
 * from the same seed through `hashSeed` (see `deriveGameplayRng`). Same seed,
 * same map, uncorrelated gameplay rolls.
 *
 * Entity ids
 * ----------
 * Units and cities are allocated ids from `nextEntityId`, a plain counter, so
 * ids depend only on the order commands were applied — never on insertion order
 * of a Map or the address of an object. Ids are unique across *all* entity
 * kinds, which keeps "selected thing" references unambiguous later.
 *
 * Ordering
 * --------
 * Anything that affects the outcome iterates an array. `players`, `units` and
 * `cities` are arrays and their order is part of the state.
 *
 * Simultaneous turns
 * ------------------
 * There is no "current player". Every player acts inside one shared turn window
 * and the turn resolves when the last of them has ended it, so the only turn
 * state is *who is finished*: `turnEnded`, a boolean per player. That is a set
 * in spirit, but it is an array because a `Set` does not survive
 * `JSON.stringify` and this state has to.
 *
 * Why tile ownership lives here and not on the map
 * ------------------------------------------------
 * `tileOwner` is a parallel array over `map.tiles`, not a field on `Tile`, and
 * that is the point: `GameMap` is *generation output*. It is a pure function of
 * the seed and the size, `newGame` rebuilds it rather than storing it, and
 * `replay` relies on that — a save file carries a seed, not four thousand tiles.
 * The moment a border expansion wrote into a tile, the map would stop being
 * reproducible from its seed and would have to be serialised in full.
 *
 * Keeping it parallel also keeps the fast path fast: ownership changes once or
 * twice per turn per city and is read constantly, so it wants to be a flat array
 * indexed exactly like `map.tiles` (`row * width + col`, via `tileIndex`). It
 * holds *city* ids rather than player ids because a tile belongs to a city — the
 * player is one lookup away and would otherwise be duplicated state that could
 * disagree with itself.
 */

import type { BuildingId } from './buildingData';
import type { GameMap } from './map';
import { generateMap, getMapSize } from './mapgen';
import { type Rng, hashSeed, makeRng } from './rng';
import { RULES } from './rulesData';
import { chooseStartPositions, planStartingUnits } from './startPositions';
import type { TechId } from './techData';
import { type UnitTypeId, unitDef } from './unitData';
import {
  type CitySighting,
  newVisibilityGrid,
  recomputeAllVisibility,
  recomputeVisibility,
} from './visibility';

/**
 * Bumped whenever the shape of `GameState`, `GameConfig` or the command log
 * changes incompatibly. Save files carry it so `loadGame` can refuse a file it
 * would silently misread.
 *
 * 3: Milestone 3 — real cities, tile ownership, and the per-player yield pools.
 * 4: Citizen management — `City.lockedTiles` and the `setLockedTiles` command.
 * 5: Fresh water — the `lake` terrain, `Tile.riverEdges` and `Tile.freshwater`.
 * 6: Milestone 4 — the tech tree: `Player.researching` and
 *    `Player.techsResearched`, and the `chooseResearch` command.
 * 7: Milestone 5 — combat: `Unit.hasAttacked` and `Unit.fortifiedTurns`,
 *    `City.hp`, `Player.eliminated`, `GameState.winnerId`, and the `attack` and
 *    `fortify` commands.
 * 8: Milestone 6 — resources: `Tile.resource`, the yields it adds, and the
 *    `requiresResource` production gate. The map is generated from the seed, so
 *    a save file carries no tiles — but a v7 save replayed against this build
 *    would grow resources its log never knew about, which is exactly the silent
 *    misreading the version exists to refuse.
 * 9: Escalating settlers — `Player.settlersBuilt`, the counter the settler's
 *    `costIncrement` multiplies. A v8 log replayed against this build would
 *    price every settler after the first at the old flat cost, which is a
 *    different game rather than an older one.
 * 10: Milestone 8 — fog of war: `GameState.visibility` and
 *    `GameState.citySightings`, plus the one rule that follows from them (an
 *    attack requires the target tile be visible to the attacker). A v9 log
 *    replayed here can find an attack refused that the older build allowed, so
 *    the log is not merely older, it is a different game.
 * 11: Milestone 7 — workers and tile improvements: `Unit.chargesLeft`,
 *    `Tile.improvement`, and the two commands that write them
 *    (`buildImprovement`, `pillage`). A v10 log replayed here would also find
 *    `hasResource` grown its improvement clause (design ledger, Entry IX's
 *    correction), so a swordsman that empire used to be able to build is now
 *    refused until somebody mines the iron — a different game rather than an
 *    older one, which is exactly what this number exists to refuse.
 * 12: Milestone 10 — happiness and authority: `City.captured`, the one fact the
 *    two derived meters cannot recompute from the board (see the field's own
 *    docblock). A v11 log replayed here is not merely older either: every yield
 *    in it was banked before the meters multiplied production, science and
 *    culture, and before a happiness deficit throttled growth.
 * 13: The ratified luxury table — `Player.faithPool`, the fourth per-player
 *    bank, filled by the faith a tile or a signature pays and spent by nothing
 *    yet (see the field). A v12 log replayed here is a different game rather
 *    than an older one for three further reasons that carry no state of their
 *    own: tile yields gained three voices, a city standing on a seam now draws
 *    supply from it once its owner holds the improving technology, and *access*
 *    is gated on the resource's reveal — so a v12 empire that mined iron before
 *    Bronze Working held iron and a v13 one does not.
 */
export const SCHEMA_VERSION = 13;

// --- players ----------------------------------------------------------------

/** What the caller asks for; `newGame` turns each spec into a `Player`. */
export interface PlayerSpec {
  name: string;
  /** CSS colour string. The simulation never interprets it; the UI does. */
  color: string;
  /** Defaults to false — the caller decides who sits at the keyboard. */
  isHuman?: boolean;
}

export interface Player {
  /** Stable id, equal to the player's index in `GameState.players`. */
  id: number;
  name: string;
  color: string;
  isHuman: boolean;
  /** Treasury. Every city's gold lands here; nothing spends it yet. */
  gold: number;
  /**
   * Science banked toward the current technology. A pool rather than a per-turn
   * rate because research is bought, not rented — and, since Milestone 4, the
   * pool *is* the progress: there are no per-tech buckets, so switching research
   * moves the aim and loses nothing. See the model note in `tech.ts`.
   */
  sciencePool: number;
  /** Culture banked toward the next social policy. A later milestone spends it. */
  culturePool: number;
  /**
   * Faith banked by every temple hill, incense grove and jade seam the empire
   * works. **Nothing spends it yet.**
   *
   * A deliberate half-system, and the reason it is shipped rather than waited
   * for: faith is a *tile* yield in the ratified luxury table — incense pays it
   * where it grows, jade pays it out of the rock — so either the algebra carries
   * it now or four rows ship with their signature quietly deleted. Carrying it
   * costs one field and one line in `collectYields`; deleting the rows would
   * cost the design.
   *
   * So the pool fills, the top bar shows it, and the hover says out loud that
   * the faithful are gathering and their purpose comes later. That is an honest
   * empty room; a number that silently did nothing would not be.
   *
   * A pool rather than a rate, exactly as `sciencePool` and `culturePool` are:
   * whatever eventually spends it will spend a bank, not an income.
   */
  faithPool: number;
  /**
   * The technology `sciencePool` is currently aimed at, or `null` when the
   * player has not chosen one. Set by the `chooseResearch` command and cleared
   * by `advanceResearch` the moment the tech completes.
   */
  researching: TechId | null;
  /**
   * Technologies this player holds, in the order they completed.
   *
   * On the player rather than in a parallel array on the state, unlike
   * `turnEnded`: this is a fact *about a player* that outlives every turn, and
   * an array indexed by id would be a second length invariant to keep in step
   * (see the `turnEnded` trap in CLAUDE.md). An array rather than a `Set`
   * because the state has to survive `JSON.stringify`, and because iteration
   * order that is part of the state is iteration order a replay reproduces.
   *
   * Seeded from `rules.research.startingTechs`, so a new city can build
   * something on turn one.
   */
  techsResearched: TechId[];
  /**
   * How many escalating units — settlers, today — this player has *completed
   * from production*. The multiplier in `unitProductionCost` (`cities.ts`).
   *
   * "Built" is meant strictly, and the two exclusions are the rule rather than
   * an oversight. The settler a player opens the game holding was never paid
   * for, so it does not make the next one dearer; a settler taken off a rival
   * on the battlefield was paid for by *them*, and capturing one is already its
   * own kind of expensive. Only `advanceProduction` ever raises this, which is
   * also the only place a player spends hammers on a unit.
   *
   * On the player rather than derived from the board because it can never be
   * derived: settlers are *consumed* when they found, so counting the ones
   * standing around would price the fourth city like the first.
   */
  settlersBuilt: number;
  /**
   * True once this player holds no units and no cities. They are out.
   *
   * A flag rather than a removal from `players`, and that is load-bearing: the
   * `turnEnded` array is indexed by player id and player id *is* the index (see
   * the trap in CLAUDE.md), so splicing a player out would renumber everybody
   * after them and silently reattribute every command in the log. An eliminated
   * seat therefore stays in the array, keeps its id, and is simply finished
   * forever — `clearTurnEnded` re-raises its flag every turn, so it never blocks
   * a resolution and never gets another window to act in.
   *
   * Set by `updateElimination` (`combat.ts`), which runs both inside the attack
   * that caused it — so a turn cannot deadlock waiting for a player who was
   * wiped out mid-window — and as a turn phase.
   */
  eliminated: boolean;
}

// --- entities ---------------------------------------------------------------

/**
 * A unit on the board.
 *
 * Position is offset `(col, row)` to match `Tile`, not axial: it is what the map
 * is indexed by, so no conversion sits between a unit and the tile it stands on.
 * `col` is always canonical (wrapped into `[0, width)`).
 *
 * `path` is the *remaining* waypoints of a multi-turn move order, first step
 * first, and is absent — the key deleted, not an empty array — whenever the unit
 * is idle. Keeping the shape of an idle unit identical however it became idle is
 * what lets `snapshotState` be compared byte for byte.
 */
export interface Unit {
  id: number;
  ownerId: number;
  type: UnitTypeId;
  col: number;
  row: number;
  hp: number;
  /** Movement points left this turn. Refilled by the `resetMovement` phase. */
  movesLeft: number;
  /**
   * True once this unit has attacked this turn. Cleared by `resetMovement`
   * alongside the movement allowance, because they are the same allowance: one
   * attack per unit per turn, exactly as Civ V has it.
   *
   * Always present rather than optional, unlike `path` and `fortifiedTurns`. It
   * is a fact about every unit on every turn — a warrior that has not attacked
   * has *not attacked*, which is a real state and not an absent one — and the
   * healing rule reads it on every unit in the game every turn.
   */
  hasAttacked: boolean;
  path?: { col: number; row: number }[];
  /**
   * How many turns this unit has been fortified, or the key is absent when it is
   * not fortified at all.
   *
   * Presence *is* the fortified state, which is `path`'s convention (see its
   * docblock) and it is here for the same reason: a unit that has never dug in
   * and a unit that has just been shaken out of a trench must serialise
   * identically, or two states that are the same game would not compare equal.
   * Zero is a real value and means "fortified this turn, no bonus yet" — the
   * `advanceFortify` phase raises it, capped by `combat.fortifyMax`.
   */
  fortifiedTurns?: number;
  /**
   * Improvement charges this unit has left, or the key is **absent** on
   * everything that never had any.
   *
   * Presence *is* "this is a builder", which is `path`'s and `fortifiedTurns`'
   * convention and is here for the third time for the same reason: a warrior
   * and a worker must serialise differently in kind rather than by a zero, or a
   * state that gave every soldier `chargesLeft: 0` would be a state claiming
   * fifteen unit types are builders whose tools happen to be worn out.
   *
   * Initialised from `UnitDef.charges` by `createUnit`, so there is exactly one
   * place a charge count comes into existence and no creation path can forget.
   * Spent by the `buildImprovement` command, one improvement's `chargeCost` at a
   * time; a unit that reaches zero is *removed* rather than left standing empty,
   * so the value is always at least one while the unit is on the board.
   *
   * A captured worker keeps whatever is left of it (design ledger, M7): capture
   * changes `ownerId` and touches nothing else, so this needs no rule of its own.
   */
  chargesLeft?: number;
}

/**
 * One entry in a city's production queue. Plain data, so it survives a save.
 *
 * A discriminated union rather than `{ kind, id: string }`: `kind` and `id` are
 * not independent — a `'unit'` item's id is a `UnitTypeId` and nothing else —
 * and writing that down means every consumer narrows for free instead of
 * casting. It stays two flat fields so it serialises as an ordinary object.
 */
export type QueueItem =
  | { kind: 'unit'; id: UnitTypeId }
  | { kind: 'building'; id: BuildingId };

/**
 * A city.
 *
 * Position is offset `(col, row)` exactly as a unit's is, so the tile a city
 * stands on needs no conversion. `name` is stored rather than derived because a
 * player will eventually rename one, and because deriving it from an index into
 * the rules list would silently rename every city when that list is retuned.
 *
 * The three baskets are all "progress toward the next thing", all in the units
 * of the thing that fills them, and all kept rather than reset when the thing
 * completes — the remainder is overflow and belongs to the next item:
 *
 *   foodBasket    food toward the next population point (`growCities`)
 *   hammerBasket  production toward the front of the queue (`advanceProduction`)
 *   culture       culture toward the next border tile (`expandBorders`)
 *
 * `culture` is the city's *unspent* culture, not its lifetime total; the running
 * total the player accumulates is `Player.culturePool`, which the same yield
 * feeds in parallel. `tilesClaimed` counts expansions rather than owned tiles,
 * because it is the input to the cost curve and the free ring a city is founded
 * with must not make the second tile expensive.
 *
 * `workedTiles` is derived state — `assignCitizens` recomputes it from scratch
 * every `collectYields` — but it is stored anyway: the UI draws it, and a value
 * the player can see is a value that has to survive a save.
 *
 * `lockedTiles` is the opposite: pure player intent, never derived, and the one
 * input `assignCitizens` cannot recompute. See `setLockedTiles` in `commands.ts`
 * and the assignment rules in `cities.ts`.
 */
export interface City {
  id: number;
  ownerId: number;
  name: string;
  col: number;
  row: number;
  population: number;
  /**
   * Hit points, out of `combat.cityBaseHp`. A city is a defender like any other
   * piece: it is shot at, it is stormed, and it heals `combat.cityHealPerTurn`
   * every turn in the `healCities` phase.
   *
   * A city is never destroyed by damage — ranged fire floors it at 1 (the Civ
   * rule: bombardment softens, infantry takes) and a melee blow that would empty
   * it captures it instead, restoring `combat.cityCaptureHpFraction` of the
   * maximum under its new owner. So `hp` is always in `[1, cityBaseHp]`.
   */
  hp: number;
  /** Food banked toward the next population point. May go negative: starvation. */
  foodBasket: number;
  /** Culture banked toward the next border tile. See the docblock. */
  culture: number;
  /** How many tiles this city has claimed by expansion. Drives the cost curve. */
  tilesClaimed: number;
  /** Completed buildings, in the order they finished. At most one of each. */
  buildings: BuildingId[];
  /**
   * True once this city has been taken by force, ever.
   *
   * The one thing about a city that cannot be recomputed from the board, which
   * is why it is stored rather than derived: a captured town keeps its
   * buildings, its people and its ground, and by the turn after the fight there
   * is nothing left to distinguish it from one somebody built. The authority
   * meter needs exactly that distinction — a seized city costs 3 where a founded
   * one costs 2 (design ledger, Entry XIV.D.2) — so `captureCity` in `combat.ts`
   * raises this and nothing ever lowers it.
   *
   * *Ever*, and that is the design: a city that has changed hands is a seized
   * city thereafter, including for the empire that founded it and won it back.
   * Conquest is meant to self-throttle, and a war of reconquest is still a war.
   * It also means a captured capital is no longer anybody's capital — see
   * `capitalCityOf` in `cities.ts`, which seats the palace in the oldest city
   * its owner actually founded.
   */
  captured: boolean;
  /** Production queue, front first. Replaced wholesale by `setCityProduction`. */
  queue: QueueItem[];
  /** Production banked toward the front of the queue. */
  hammerBasket: number;
  /** Tiles the citizens work, excluding the free centre. Sorted by tile index. */
  workedTiles: { col: number; row: number }[];
  /**
   * Tiles the player has pinned a citizen to, in the order they pinned them.
   * `assignCitizens` works these first and fills the rest by score. Player
   * intent, not derived state: order is preserved exactly as sent, and an entry
   * that is not currently workable is ignored rather than dropped.
   */
  lockedTiles: { col: number; row: number }[];
}

// --- state ------------------------------------------------------------------

export interface GameConfig {
  /** Numeric seed; use `hashSeed` to turn a word into one. */
  seed: number;
  /** Size key from `data/mapgen.json`. */
  sizeName: string;
  players: PlayerSpec[];
}

export interface GameState {
  schemaVersion: number;
  /** 1-based; `data/rules.json` sets the starting value. */
  turn: number;
  /** The one and only gameplay generator. Advanced by mutation. */
  rng: Rng;
  /** Next id handed to a unit or city. See the module docblock. */
  nextEntityId: number;
  players: Player[];
  /**
   * Who has ended the current turn, indexed by player id — which is the player's
   * index in `players`, so this array is exactly as long as that one.
   *
   * All false at the start of every turn. The `endTurn` command sets one flag;
   * setting the last outstanding flag resolves the turn and clears them all.
   * Read it through `hasEndedTurn` / `allTurnsEnded` rather than indexing it.
   */
  turnEnded: boolean[];
  map: GameMap;
  units: Unit[];
  cities: City[];
  /**
   * Who owns each tile, as a *city* id, indexed exactly like `map.tiles`
   * (`tileIndex(map, col, row)`). `null` is unclaimed. See the module docblock
   * for why this is here and not on the tile.
   */
  tileOwner: (number | null)[];
  /**
   * What each player can see, as one grid per player id — so
   * `visibility[playerId][tileIndex(map, col, row)]` is 0 hidden, 1 explored,
   * 2 visible. See `visibility.ts` for the model and `newVisibilityGrid` for
   * the shape.
   *
   * Parallel arrays over `map.tiles`, exactly like `tileOwner`, and here for the
   * same three reasons: the map is generation output that a save does not carry,
   * this is read constantly and written rarely, and a flat array indexed the way
   * every other tile lookup is indexed cannot fall out of step with the board.
   *
   * Indexed by player *id*, which is the player's index in `players` (see the
   * `turnEnded` trap in CLAUDE.md) — the same assumption that array already
   * makes, and it will be revisited in the same breath if players ever become
   * removable.
   *
   * Plain integer arrays rather than a packed string or a bitfield. A standard
   * map is 4,160 tiles, so four seats cost about 33 kB of JSON — measured, not
   * guessed — and a packed representation would buy back a rounding error at the
   * price of making every state dump unreadable by eye.
   */
  visibility: number[][];
  /**
   * What each player *remembers* of the cities they have seen, one list per
   * player id, sorted by city id.
   *
   * The other half of `explored`: terrain is static, so a remembered tile can
   * simply be drawn, but a city is a thing that was there — it has a name and a
   * flag and both can change while nobody is watching. This is the minimum that
   * lets an unwatched site keep a (dimmed) banner instead of a blank hex. See
   * `CitySighting` in `visibility.ts` for why it is deliberately not richer.
   */
  citySightings: CitySighting[][];
  /**
   * The last player standing, once there is one; `null` while the game is live.
   *
   * Conquest is the only victory v1 has, and it is decided by
   * `updateElimination` (`combat.ts`) rather than by a phase of its own, because
   * the moment it becomes true is the moment somebody's last unit died — which
   * is inside a command, not at the end of a turn.
   *
   * It is a *record*, not a gate: the reducer keeps accepting commands after it
   * is set, because refusing them would mean a replay of a finished game
   * diverges from the game it replays. The interface is what stops.
   */
  winnerId: number | null;
}

// --- construction -----------------------------------------------------------

/**
 * Canonicalises a config so that two configs that mean the same game *are* the
 * same object: the seed is coerced to a 32-bit integer (the generators do this
 * anyway) and player specs are copied with defaults filled in.
 *
 * `createGame` stores the normalised form, so a save file never round-trips a
 * value the simulation would have reinterpreted.
 */
export function normalizeConfig(config: GameConfig): GameConfig {
  return {
    seed: config.seed | 0,
    sizeName: config.sizeName,
    players: config.players.map((spec) => ({
      name: spec.name,
      color: spec.color,
      isHuman: spec.isHuman ?? false,
    })),
  };
}

/**
 * The gameplay generator for a seed: a stream deliberately unrelated to the one
 * `generateMap` runs. Hashing a labelled string is the same trick used for word
 * seeds, and it is stable across platforms because it is pure integer math.
 */
export function deriveGameplayRng(seed: number): Rng {
  return makeRng(hashSeed(`webciv:gameplay:${seed | 0}`));
}

function validateConfig(config: GameConfig): void {
  const { minPlayers, maxPlayers } = RULES.game;
  if (config.players.length < minPlayers) {
    throw new Error(`A game needs at least ${minPlayers} player(s)`);
  }
  if (config.players.length > maxPlayers) {
    throw new Error(`A game supports at most ${maxPlayers} players`);
  }
  // Throws with the list of known sizes if the key is bad.
  getMapSize(config.sizeName);
}

/**
 * Builds the initial state. Deterministic in `config` alone: the same config
 * always produces a byte-identical state.
 */
export function newGame(config: GameConfig): GameState {
  const normalized = normalizeConfig(config);
  validateConfig(normalized);

  const map = generateMap(normalized.seed, normalized.sizeName);
  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    turn: RULES.game.startingTurn,
    rng: deriveGameplayRng(normalized.seed),
    nextEntityId: RULES.game.firstEntityId,
    players: normalized.players.map((spec, index) => ({
      id: index,
      name: spec.name,
      color: spec.color,
      isHuman: spec.isHuman ?? false,
      gold: 0,
      sciencePool: 0,
      culturePool: 0,
      faithPool: 0,
      researching: null,
      // Copied, never aliased: the rules are shared by every player and by every
      // game in the process, and a player who researched something must not
      // write it into the rule book.
      techsResearched: [...RULES.research.startingTechs],
      settlersBuilt: 0,
      eliminated: false,
    })),
    turnEnded: normalized.players.map(() => false),
    map,
    units: [],
    cities: [],
    // One slot per tile, all unclaimed. Sized once, here, so every later access
    // is a plain indexed read that cannot be out of range.
    tileOwner: new Array<number | null>(map.tiles.length).fill(null),
    // One grid per seat, all blank. Sized here for the reason `tileOwner` is:
    // every later access is a plain indexed read that cannot be out of range.
    visibility: normalized.players.map(() => newVisibilityGrid(map.tiles.length)),
    citySightings: normalized.players.map(() => []),
    winnerId: null,
  };
  placeStartingUnits(state);
  // The opening scouting report. `createUnit` has already refreshed each seat as
  // its pieces landed, but a seat whose roster is empty — a scenario, a future
  // spectator — would otherwise start with no grid computed at all, and a state
  // that is only correct when somebody owns something is a state waiting to be
  // wrong.
  recomputeAllVisibility(state);
  return state;
}

/**
 * Seats every player's opening roster. Deterministic in the map and the rules
 * alone (see `startPositions.ts`), so it rolls no dice and needs no log entry —
 * a replay reproduces the same starts from the config.
 */
function placeStartingUnits(state: GameState): void {
  const starts = chooseStartPositions(state.map, state.players.length);
  for (const placement of planStartingUnits(state.map, starts, RULES.startingUnits)) {
    const player = state.players[placement.ownerIndex];
    if (!player) continue;
    createUnit(state, player.id, placement.unitType, placement.col, placement.row);
  }
}

// --- accessors --------------------------------------------------------------

/** Hands out the next entity id. The only place ids are minted. */
export function allocateEntityId(state: GameState): number {
  const id = state.nextEntityId;
  state.nextEntityId = id + 1;
  return id;
}

/**
 * Mints a unit at full health and full movement and appends it to `state.units`.
 *
 * The low-level constructor: it validates nothing. Callers own the rules —
 * `spawnUnit` in `commands.ts` checks terrain and stacking first, and
 * `placeStartingUnits` gets legal positions from `startPositions.ts`. Keeping it
 * here rather than in `units.ts` avoids an import cycle with the id allocator
 * and keeps every field of a `Unit` written in exactly one place, which is what
 * makes the serialised key order stable.
 */
export function createUnit(
  state: GameState,
  ownerId: number,
  type: UnitTypeId,
  col: number,
  row: number,
): Unit {
  const def = unitDef(type);
  const unit: Unit = {
    id: allocateEntityId(state),
    ownerId,
    type,
    col,
    row,
    hp: def.maxHp,
    movesLeft: def.movement,
    hasAttacked: false,
  };
  // Written after the literal and only when the type declares charges, so a
  // soldier's serialised shape is byte-for-byte what it was before builders
  // existed. See `Unit.chargesLeft` for why presence is the marker.
  if (def.charges !== undefined) unit.chargesLeft = def.charges;
  state.units.push(unit);
  // A new pair of eyes opens here, whoever asked for them: the `spawnUnit`
  // command, a city finishing production, a scenario seating an opening roster.
  // Refreshing in the constructor rather than at each of those call sites is the
  // same argument `breakFortify` makes from inside `advanceAlongPath` — there is
  // exactly one place a unit comes into existence, so there is exactly one place
  // that can forget.
  recomputeVisibility(state, ownerId);
  return unit;
}

/**
 * Takes a unit off the board. Returns false when there was no such unit.
 *
 * The counterpart of `createUnit` and, like it, a low-level operation that
 * validates nothing: the only caller today is `foundCity`, which spends a
 * settler. Ids are never reused, so nothing that remembered this one can be
 * fooled into finding a different unit later — it simply stops resolving.
 */
export function removeUnit(state: GameState, unitId: number): boolean {
  const index = state.units.findIndex((unit) => unit.id === unitId);
  if (index < 0) return false;
  const ownerId = state.units[index]!.ownerId;
  state.units.splice(index, 1);
  // The counterpart of the refresh in `createUnit`, and it has to be read off
  // the unit *before* the splice: a piece that dies is a piece whose owner stops
  // seeing the ground around it, and by the time this returns there is nothing
  // left to ask whose it was.
  recomputeVisibility(state, ownerId);
  return true;
}

/**
 * Mints an empty city and appends it to `state.cities`.
 *
 * The sibling of `createUnit`, here for the same three reasons: it needs the id
 * allocator, every field of a `City` is written in exactly one place (which is
 * what keeps the serialised key order stable), and keeping it out of `cities.ts`
 * avoids an import cycle.
 *
 * Like `createUnit` it validates nothing and claims nothing — the rules live in
 * the `foundCity` command, and the opening territory is claimed by `foundCityAt`
 * in `cities.ts`. A city minted here owns no tiles and works none.
 */
export function createCity(
  state: GameState,
  ownerId: number,
  name: string,
  col: number,
  row: number,
): City {
  const city: City = {
    id: allocateEntityId(state),
    ownerId,
    name,
    col,
    row,
    population: 1,
    hp: RULES.combat.cityBaseHp,
    foodBasket: 0,
    culture: 0,
    tilesClaimed: 0,
    buildings: [],
    // Founded, by definition: this is the only way a city comes into existence,
    // and the only thing that raises the flag is a fight (see `captureCity`).
    captured: false,
    queue: [],
    hammerBasket: 0,
    workedTiles: [],
    lockedTiles: [],
  };
  state.cities.push(city);
  return city;
}

// --- turn status ------------------------------------------------------------

/**
 * Has this player finished the current turn?
 *
 * Answers false for an id that is not a player's, which is deliberate: callers
 * that care whether the player exists at all ask `playerById`, and this stays a
 * question about the turn rather than a second, weaker existence check.
 */
export function hasEndedTurn(state: GameState, playerId: number): boolean {
  return state.turnEnded[playerId] === true;
}

/**
 * Is every seat finished? The condition the `endTurn` handler resolves the turn
 * on.
 *
 * It iterates `players`, not `turnEnded`, so a hand-edited save with a short or
 * over-long flag array cannot make an unfinished turn look finished. A game with
 * no players is never "all ended" — there is nothing to end.
 */
export function allTurnsEnded(state: GameState): boolean {
  if (state.players.length === 0) return false;
  for (const player of state.players) {
    if (!hasEndedTurn(state, player.id)) return false;
  }
  return true;
}

/**
 * Reopens every seat. Called once per turn, as the turn rolls over.
 *
 * Every seat *that is still in the game*: an eliminated player's flag is raised
 * again rather than cleared, so a wiped-out empire is permanently finished and
 * `allTurnsEnded` never waits for it. That is the whole of the "their turnEnded
 * is auto-true each turn" rule, written in the one place turn flags are reset —
 * so there is nothing for a later phase to forget.
 */
export function clearTurnEnded(state: GameState): void {
  for (const player of state.players) state.turnEnded[player.id] = player.eliminated;
}

/** Linear scan by id; player counts are tiny and arrays keep order honest. */
export function playerById(state: GameState, id: number): Player | undefined {
  for (const player of state.players) {
    if (player.id === id) return player;
  }
  return undefined;
}

export function unitById(state: GameState, id: number): Unit | undefined {
  for (const unit of state.units) {
    if (unit.id === id) return unit;
  }
  return undefined;
}

export function cityById(state: GameState, id: number): City | undefined {
  for (const city of state.cities) {
    if (city.id === id) return city;
  }
  return undefined;
}
