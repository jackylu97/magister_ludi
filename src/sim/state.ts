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
import type { ProjectId } from './projectData';
import type { DiscoveryId, DiscoveryKind } from './discoveryData';
import type { GameMap } from './map';
import { generateMap, getMapSize } from './mapgen';
import { type MapgenOverrides, resolveMapgenConfig } from './mapgenData';
import { type PlayerPantheon, newPlayerPantheon } from './religionData';
import { type Rng, hashSeed, makeRng } from './rng';
import { RULES } from './rulesData';
import { type PlayerStatecraft, cardExtraCharges, newPlayerStatecraft } from './statecraft';
import type { CardEffect, CardId } from './statecraftData';
import { chooseStartPositions, planStartingUnits } from './startPositions';
import type { TechId } from './techData';
import { type UnitTypeId, unitDef } from './unitData';
import {
  type CitySighting,
  newVisibilityGrid,
  recomputeAllVisibility,
  recomputeVisibility,
  recomputeVisibilityFor,
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
 * 14: Territory and gold (playable.md item 2) — `Player.tilesPurchased`, the
 *    escalation ladder behind the `purchaseTile` command, and the command
 *    itself. A v13 log replayed here is a different game for two reasons beyond
 *    the field: the border-cost curve was retuned to Civ 6's numbers, so every
 *    city claims its ground on a different schedule; and border-culture accrual
 *    now answers to the writ, freezing outright while authority is in deficit.
 * 15: Barbarians and discoveries (playable.md item 3, ledger Entry XX) — four
 *     fields and one command, folded into a single bump because they are one
 *     pass: `Tile.discovery` (the ruin or village a unit consumes by walking
 *     into it), `Player.barbarian` (the appended seat that is the wild),
 *     `Player.pendingDiscovery` (a claim awaiting its 1-of-3 pick, resolved by
 *     the new `chooseDiscovery` command), and `GameState.camps`. A v14 log
 *     replayed here is a different game rather than an older one for a reason
 *     beyond the fields: a scout that walked over a hex on turn six now claims
 *     something there, and every empire fights the wild at +2.
 * 16: Sleep — `Unit.sleeping` and the `sleepUnit` command. A civilian told to
 *     sleep stops blocking End Turn and stops being auto-focused, and is woken
 *     by the `wakeSleepers` phase when a foreign combatant comes inside its own
 *     sight. A v15 log replayed here is the same game: nothing in it can carry
 *     the new command, and a unit with no `sleeping` key is a unit that is
 *     awake. It is a bump rather than a free field because the *phase* is new —
 *     the resolution now has an eleventh step, and a state that ran ten is not
 *     a state this build produced.
 * 17: Statecraft (playable.md item 5, ledger Entry XV and XV.b) —
 *     `Player.statecraft`, and the five commands that write it (`chooseOrder`,
 *     `slotOrder`, `unslotOrder`, `adoptGovernment`, `chooseDoctrine`). One
 *     field and one phase, folded into a single bump because they are one pass.
 *     A v16 log replayed here is a different game rather than an older one for a
 *     reason beyond the field: `Player.culturePool` used to be a bank nothing
 *     spent, and the `statecraft` phase now **spends** it on drafts — so every
 *     culture figure in a v16 save is a figure that was never going to be
 *     deducted, and an empire that reached tier 3 on turn forty in this build
 *     had no tier at all in that one.
 * 18: Religion v1 — augurs and pantheons (playable.md item 6, ledger Entry
 *     XXVIII). Four fields and four commands, one pass: `Player.pantheon` (the
 *     gods held and any belief offer outstanding), `Player.augursPurchased` (the
 *     faith-price ladder), and `City.timed` / `Unit.timed` (the rites that run
 *     out) — written by `purchaseUnit`, `consecrate`, `chooseBelief` and
 *     `performRite`. A v17 log replayed here is a different game rather than an
 *     older one for two reasons beyond the fields: `Player.faithPool` used to be
 *     a bank nothing spent and augurs now **spend** it, and fishing boats pay
 *     +1🪙 they did not pay before, so every coastal yield in a v17 save is a
 *     figure this build would not have banked.
 * 19: Purchases, generalised (playable.md item 2's remainder, ledger Entry
 *     XXIX). **No new field** — this bump is entirely about the log. The
 *     `purchaseUnit` command became `purchaseItem` and carries a
 *     `{ kind, id }` item rather than a `unitType`, so a v18 log's augur
 *     purchase is a command this reducer does not recognise; and gold now buys
 *     units and buildings, which a v18 game had no way to spend it on at all.
 *     `Player.gold` in a v18 save is therefore a bank with a different meaning
 *     rather than the same bank one version older.
 */
export const SCHEMA_VERSION = 19;

/**
 * One effect that runs out — an augur's rite hanging on a city or a unit
 * (ledger Entry XXVIII).
 *
 * **The whole subsystem is this type plus one comparison.** `expiresTurn` is an
 * absolute turn and the reading is `state.turn < expiresTurn`; nothing anywhere
 * decrements anything. That is `SlottedOrder.sealedUntil`'s lesson taken as a
 * rule: a countdown is state that has to be ticked, a phase that ticks it is a
 * phase that can be skipped, run twice or run in the wrong order, and a turn
 * number is *compared* instead of maintained. `pruneTimedEffects` (`turn.ts`)
 * exists only to stop dead paper accumulating in a save — deleting nothing would
 * change no outcome, which is exactly the property that makes it safe.
 *
 * `effect` is an ordinary `CardEffect` and is read by the **same evaluators**
 * that read a slotted Order's: a timed city percentage joins `cityStageSums`, a
 * timed strength line joins `planCombat`'s list, a timed border percentage joins
 * the borders channel, a timed tile line joins `explainTileYield`'s. There is no
 * second interpretation of a card effect anywhere in the game, and a rite is not
 * about to be the first (see `statecraft.ts`, `liveCityEffects`).
 *
 * `card` is the rite it came from, so the line labels itself off the one table
 * — "Rite · Omen Reading (12 turns left)" — and a saved game carries a name
 * rather than a sentence.
 */
export interface TimedEffect {
  /** The rite (a `CardId`, see `statecraftData.ts`) that stamped this. */
  card: CardId;
  effect: CardEffect;
  /** Live while `state.turn < expiresTurn`. Never a countdown. */
  expiresTurn: number;
}

// --- players ----------------------------------------------------------------

/** What the caller asks for; `newGame` turns each spec into a `Player`. */
export interface PlayerSpec {
  name: string;
  /** CSS colour string. The simulation never interprets it; the UI does. */
  color: string;
  /**
   * The seat's heraldic charge — a crescent, a stag, a key — as a plain string.
   * The simulation never interprets it; the renderer and the interface do (see
   * `src/art/heraldryMarks.ts`, which owns the twelve ids and the drawings).
   *
   * `color`'s sibling in every respect, and deliberately so. It is **config**,
   * which is what makes it replay-safe: a save is `{config, log}`, so a game
   * reloaded a year later flies the banners it was started with rather than
   * whatever the fallback order happens to be by then.
   *
   * Optional, and absent means *by seat order* (`heraldryFor`) exactly as an
   * unrecognised colour means by seat order. That is what let heraldry arrive
   * without a line changing in setup, and it is why **no schema bump** was
   * needed: `normalizeConfig` writes the key only when it is there, so a config
   * that never heard of charges normalises byte-identically to one from before
   * they existed — and nothing in `src/sim/` reads the field, so no outcome can
   * turn on it.
   */
  charge?: string;
  /** Defaults to false — the caller decides who sits at the keyboard. */
  isHuman?: boolean;
}

export interface Player {
  /** Stable id, equal to the player's index in `GameState.players`. */
  id: number;
  name: string;
  color: string;
  /**
   * The seat's heraldic charge, copied from its spec. Absent means *by seat
   * order* — see `PlayerSpec.charge`, which carries the whole argument.
   *
   * Uninterpreted here for `color`'s reason, and it must stay that way: the day
   * a rule reads this field it stops being decoration and starts being a schema
   * bump.
   */
  charge?: string;
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
  /**
   * Culture banked toward the next Statecraft draft — and **the basket itself**,
   * not a running total beside one (see `PlayerStatecraft`, which deliberately
   * has no basket field of its own).
   *
   * Spent by the `statecraft` phase, which deducts the draft's cost and leaves
   * the overflow here toward the next one. Border culture is a **separate
   * channel** (`City.culture`) and is not touched: one turn's culture fills a
   * city's border basket and this pool in parallel, exactly as it did before
   * anything spent either.
   */
  culturePool: number;
  /**
   * Faith banked by every temple hill, incense grove and jade seam the empire
   * works — and **spent on augurs** (ledger Entry XXVIII).
   *
   * It shipped as a deliberate half-system: faith is a *tile* yield in the
   * ratified luxury table — incense pays it where it grows, jade pays it out of
   * the rock — so either the algebra carried it or four rows shipped with their
   * signature quietly deleted. The pool filled, the top bar showed it, and the
   * hover said out loud that the faithful were gathering and their purpose came
   * later. That was an honest empty room; a number that silently did nothing
   * would not have been.
   *
   * The room is furnished now. `purchaseUnit` charges this pool through
   * `explainPurchaseCost` (`religion.ts`), which is the only thing that spends
   * it — augurs, and nothing else, because "keep faith legible" is the design
   * (`docs/religion.md`). The hover's note is *gone* rather than reworded,
   * exactly as it promised.
   *
   * A pool rather than a rate, exactly as `sciencePool` and `culturePool` are:
   * what spends it spends a bank, not an income.
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
   * How many tiles this player has ever bought with gold (`purchaseTile`).
   *
   * The escalation ladder in `explainTilePurchase` (`cities.ts`), and per
   * *player* rather than per city because that is what it is meant to price: Civ
   * 6 escalates a habit of buying land, and a habit belongs to an empire. Kept
   * on the player for `settlersBuilt`'s reason — it can never be derived from
   * the board, because a bought tile is indistinguishable from a tile culture
   * claimed the moment the gold has left the treasury.
   *
   * Nothing lowers it. Losing the ground does not refund the habit.
   */
  tilesPurchased: number;
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
  /**
   * True for **the wild** — the one appended seat that owns every camp and every
   * raider, and is nobody's opponent in the sense the rest of this file means.
   *
   * A seat rather than an ownerless unit, and that is the whole design (ledger
   * Entry XX). Every rule in this simulation is written in terms of a `Player`:
   * combat asks whose unit it is, stacking asks whose category is on the hex,
   * visibility keeps a grid per player id, `attackTargetAt` reads `ownerId !==
   * ownerId`. Ownerless barbarians would have meant a second answer to each of
   * those, which is the thing rule 5 forbids one grade up. So the wild is a
   * player, and the *exclusions* are written down once instead.
   *
   * It is **appended last**, after the opening rosters are seated, so player id
   * is still the player's index (the trap in CLAUDE.md) and every real seat keeps
   * the id it would have had in a game with no barbarians at all. Its flag is
   * always present, like `eliminated` and unlike `pendingDiscovery`, because
   * "is this seat the wild" is a fact about every player rather than a state some
   * of them are in.
   *
   * What it is excluded from, and where each exclusion is written:
   *   · the turn — `clearTurnEnded` re-raises its flag every turn, exactly as it
   *     does for an eliminated seat, so nothing ever waits for the wild;
   *   · victory and elimination — `updateElimination` skips it, so a solo game
   *     against barbarians is not won the moment their last camp falls;
   *   · research — `advanceResearch` skips it: the wild does not learn, it
   *     inherits (see `barbarianTier` in `barbarians.ts`);
   *   · the meters, the seat cycle and the End Turn blockers — all interface, all
   *     asked of `realPlayers`.
   * What it is emphatically *not* excluded from is combat, movement, stacking and
   * fog. Those are the rules it exists to be inside.
   */
  barbarian: boolean;
  /**
   * A claimed ruin or village whose boon has not been chosen yet, or the key is
   * **absent** — which it is for every player almost all of the time.
   *
   * Presence *is* "this empire owes the game a decision", which is `Unit.path`'s
   * convention and is here for the same reason: a player who has never found a
   * ruin and one who has just spent its offer must serialise identically.
   *
   * Written by `claimDiscoveryAt` the moment a unit steps onto a site, and
   * cleared by the `chooseDiscovery` command. The offer is stored rather than
   * re-rolled on demand because it is a **draw**: rolling it when the card opens
   * would make the options a function of when somebody looked at a screen, and
   * under simultaneous turns two seats look at different times. Both halves are
   * in the log — the movement that claimed it and the pick that spent it — so a
   * replay deals the same three cards and takes the same one.
   */
  pendingDiscovery?: DiscoveryOffer;
  /**
   * Everything Statecraft knows about this empire: its tier, its government, its
   * Orders and where they are slotted, its Doctrines, and any offer outstanding
   * (ledger Entry XV and XV.b; the shape and every rule are in `statecraft.ts`).
   *
   * **Always present**, like `techsResearched` and unlike `pendingDiscovery`:
   * every seat has a government and a slot spread from turn one, so this is a
   * fact about a player rather than a state some of them are in. The wild gets
   * one too — a `Player` is a `Player`, and giving the seat a chiefdom costs one
   * object and spares every reader an `undefined` check. Nothing ever fills it:
   * the phase skips the wild exactly as `advanceResearch` does.
   *
   * A nested object rather than eight fields, because it is one subject with one
   * lifecycle — created whole, replaced wholesale on adoption, and read all at
   * once by one screen.
   */
  statecraft: PlayerStatecraft;
  /**
   * The empire's native cults: which gods it has consecrated, and any belief
   * offer outstanding (ledger Entry XXVIII; the shape and every rule are in
   * `religionData.ts` and `religion.ts`).
   *
   * **Always present**, like `statecraft` and for its reason: every seat has a
   * pantheon from turn one, empty though it is, so this is a fact about a player
   * rather than a state some of them are in. The wild gets one too and nothing
   * ever fills it — the phases skip it exactly as `advanceResearch` does.
   */
  pantheon: PlayerPantheon;
  /**
   * How many augurs this player has ever **bought with faith**.
   *
   * `settlersBuilt`'s twin one currency over, and the escalation in
   * `explainPurchaseCost` (`religion.ts`): the second augur costs 15🕯 more than
   * the first, so *when* to spend faith on a god rather than on three rites is a
   * tempo decision against a climbing price.
   *
   * On the player because it can never be derived, for `settlersBuilt`'s reason
   * exactly: an augur is *consumed* by consecrating or by its last rite, so
   * counting the ones standing around would price the fourth like the first.
   * Nothing lowers it, and a captured augur does not raise it — it was paid for
   * by somebody else.
   */
  augursPurchased: number;
}

/**
 * Three boons drawn from the pool, and where they were found.
 *
 * The **first** of Entry XV's draft shape to exist in the game: offers generated
 * from `state.rng` and stored, a pick that is an ordinary command, and a refusal
 * that leaves the state byte-identical. Statecraft's card draft inherits this
 * shape rather than inventing a second one — which is why the offer carries an
 * ordered list of ids and an index is what spends it, and not, say, the id itself
 * (an id would let a client name a card it was never dealt).
 *
 * The site is carried because two of the three effect shapes need it: a free unit
 * stands *here*, and the nearest owned city is nearest *to here*. Reading it off
 * the claiming unit instead would have been wrong the moment that unit moved on,
 * or died, before the player chose.
 */
export interface DiscoveryOffer {
  /** Which kind of site this was. Flavour on the card; the draw's weights read it. */
  kind: DiscoveryKind;
  /** Where it stood. See the docblock for why this is on the offer. */
  col: number;
  row: number;
  /** The options, in draw order. `chooseDiscovery` names one by index. */
  options: DiscoveryId[];
}

/**
 * A barbarian camp: a hex the wild musters out of.
 *
 * State, not board. Camps are the one thing in this pass that is *not* a tile
 * field, and the split is deliberate: `Tile.discovery` is generation output that
 * play consumes, so it belongs to the map the seed produced, while a camp is
 * founded mid-game by a turn phase and has a history (when it appeared, which is
 * what its muster cadence counts from). Putting it on the tile would have made
 * the map carry state the seed never produced; putting it here keeps
 * `GameState.camps` an ordinary array that iterates in a fixed order like every
 * other outcome-bearing list in this state.
 */
export interface BarbarianCamp {
  col: number;
  row: number;
  /** The turn it was founded. Its muster cadence counts from this. */
  foundedTurn: number;
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
  /**
   * This unit has been told to sleep, or the key is **absent** when it has not.
   *
   * Presence is the state, which is `path`'s, `fortifiedTurns`' and
   * `chargesLeft`' convention and is here for the fourth time for the same
   * reason: a unit that has never slept and a unit just shaken awake must
   * serialise identically, or two states that are the same game would not
   * compare equal.
   *
   * What it means, and what it deliberately does not. Sleep is a *civilian's*
   * fortify: the cheapest possible standing order, given to a worker with
   * nothing to build or a settler waiting on an escort, and its whole content is
   * "stop asking me about this piece". It costs nothing, spends nothing, and
   * changes no rule — a sleeping unit defends, is captured, is seen and heals
   * exactly as it did awake. The only thing that reads it is
   * `isIdleUnit` (`ui/turnBlockers.ts`), which is the whole point: End Turn
   * stops nagging, and the post-resolution camera stops flying to it.
   *
   * Two things end it, and they are opposite in kind. **An order** — any
   * command at all that names this unit clears the flag, because telling a piece
   * to do something is telling it to wake up, and a second verb for "wake" would
   * be a verb whose only use is undoing a typo. **Enemies** — the `wakeSleepers`
   * phase clears it when a foreign combatant is inside this unit's own sight at
   * the end of a resolution, which is the reason sleep is safe to use at all:
   * a worker left asleep on the frontier is not a worker the player forgot.
   */
  sleeping?: boolean;
  /**
   * Effects that run out — a Blessing of Arms on this piece — or the key is
   * **absent**, which it is for every unit almost all of the time.
   *
   * Presence is the state, which is `path`'s, `fortifiedTurns`', `chargesLeft`'s
   * and `sleeping`'s convention and is here for the fifth time for the same
   * reason: a warrior that was never blessed and one whose blessing has been
   * swept away must serialise identically. See `TimedEffect` for why an expiry
   * is an absolute turn and never a countdown.
   *
   * A captured unit keeps them, exactly as it keeps its charges: capture moves
   * `ownerId` and touches nothing else, and a blessing is on the piece.
   */
  timed?: TimedEffect[];
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
  | { kind: 'building'; id: BuildingId }
  | { kind: 'project'; id: ProjectId };

/**
 * The three kinds of row a queue holds, for the gates that ask one question of
 * all of them (`buildError`, `isUnlocked`, `gatingTech` in `tech.ts`).
 *
 * Deliberately *not* the same type as `ProductionCategory` (`buildingData.ts`),
 * which is what a production bonus may name and stops at unit/building: a
 * barracks putting ten percent behind Tithes would be a barracks minting money,
 * and a project's rate is printed on its row precisely so nothing modifies it.
 */
export type QueueKind = QueueItem['kind'];

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
  /**
   * Effects that run out — an Omen Reading on this town's scribes, a
   * Consecration of its bounds — or the key is **absent**, which it is for every
   * city almost all of the time.
   *
   * `Unit.timed`'s twin, same convention and same reason. A **captured** city
   * keeps them, and that is deliberate rather than an omission: a rite was
   * performed on the *place*, and the conqueror inherits the walls, the granary
   * and the calendar together. Its effects then pay their new owner, because
   * every reader asks the city's owner for the empire half and the city itself
   * for this half.
   */
  timed?: TimedEffect[];
}

// --- state ------------------------------------------------------------------

export interface GameConfig {
  /** Numeric seed; use `hashSeed` to turn a word into one. */
  seed: number;
  /** Size key from `data/mapgen.json`. */
  sizeName: string;
  players: PlayerSpec[];
  /**
   * A sparse edit of `data/mapgen.json` for this game's map, or absent — which
   * it is for every ordinary game.
   *
   * It lives **here**, in the config, and that is the whole design. The
   * generator reads module-level data, so the only other way to try a different
   * `mountainShare` would be to write into `MAPGEN_CONFIG` — and a mutated
   * module table breaks the one promise the save format rests on, that
   * `{config, log}` replays to the same world. With the sheet in the config it
   * still does: the config *is* every number the map was made from.
   *
   * Validated by `resolveMapgenConfig`, which throws on an unknown key rather
   * than ignoring it. Written today only by the mapgen inspection page's tuning
   * panel; the game itself never sets one.
   */
  mapgenOverrides?: MapgenOverrides;
  /**
   * Whether this world has barbarians in it. **Absent means no.**
   *
   * A world option, in the config, for `mapgenOverrides`' exact reason: the
   * config *is* every input the world was made from, and a save is `{config,
   * log}`. A flag anywhere else — a module constant, a runtime toggle — would
   * mean two games with the same config replaying to different states, which is
   * the one promise this whole architecture rests on.
   *
   * Off unless asked, and the game asks (`main.ts` sets it on every new game).
   * The default is the quiet world rather than the loud one because the loud one
   * cannot be opted out of by anything that never heard of it: a fixture, an
   * inspection page, a pacing measurement or a test written before Entry XX
   * would otherwise silently acquire a raider in turn thirty of a run it was
   * counting hammers in. A player who wants the wild gets it from the new-game
   * screen; everything else gets the world it always had.
   */
  barbarians?: boolean;
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
   * Every barbarian camp standing on the board, in founding order.
   *
   * An array on the state rather than a flag on a tile — see `BarbarianCamp` for
   * why — and in founding order rather than map order, because that is the order
   * they *muster* in and an outcome that depends on iteration order must depend
   * on an order the state itself carries. Empty in a world with no barbarians in
   * it, which is every world whose config did not ask for them.
   */
  camps: BarbarianCamp[];
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
  const normalized: GameConfig = {
    seed: config.seed | 0,
    sizeName: config.sizeName,
    players: config.players.map((spec) => {
      const player: PlayerSpec = {
        name: spec.name,
        color: spec.color,
        isHuman: spec.isHuman ?? false,
      };
      // Written only when it is named, exactly as `barbarians` and the mapgen
      // sheet are: a seat that took its charge by seat order normalises to *no*
      // key at all and is byte-identical to a spec from before heraldry existed.
      if (spec.charge !== undefined) player.charge = spec.charge;
      return player;
    }),
  };
  // The override sheet is copied through JSON for the same reason the player
  // specs are copied at all — the config is the save file and a caller that
  // keeps editing the object it handed in must not be able to rewrite a game's
  // map. The round trip also drops any `undefined` a partial was spread from,
  // so an empty sheet normalises to *no* sheet and the game is byte-identical
  // to one that never had the field.
  if (config.mapgenOverrides && Object.keys(config.mapgenOverrides).length > 0) {
    const copied = JSON.parse(JSON.stringify(config.mapgenOverrides)) as MapgenOverrides;
    if (Object.keys(copied).length > 0) normalized.mapgenOverrides = copied;
  }
  // Written only when it is on, exactly as the override sheet is: a quiet world
  // normalises to *no* key at all and is byte-identical to a config from before
  // the wild existed. `false` and absent are the same world and must serialise
  // the same way.
  if (config.barbarians === true) normalized.barbarians = true;
  return normalized;
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
  // Throws on an unknown key or a mistyped value, *before* a tile is drawn — a
  // bad sheet is a bad config, not a map that quietly ignored half of it.
  resolveMapgenConfig(config.mapgenOverrides);
}

/**
 * Builds the initial state. Deterministic in `config` alone: the same config
 * always produces a byte-identical state.
 */
export function newGame(config: GameConfig): GameState {
  const normalized = normalizeConfig(config);
  validateConfig(normalized);

  const map = generateMap(normalized.seed, normalized.sizeName, normalized.mapgenOverrides);
  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    turn: RULES.game.startingTurn,
    rng: deriveGameplayRng(normalized.seed),
    nextEntityId: RULES.game.firstEntityId,
    players: normalized.players.map((spec, index) => ({
      id: index,
      name: spec.name,
      color: spec.color,
      // Spread rather than assigned, so a seat with no charge has no key — the
      // same shape `normalizeConfig` just produced, and the reason a state from
      // a charge-less config serialises identically to one from before the field.
      ...(spec.charge === undefined ? {} : { charge: spec.charge }),
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
      tilesPurchased: 0,
      eliminated: false,
      barbarian: false,
      // Fresh every time rather than a shared literal, for `techsResearched`'s
      // reason exactly: a player who drafts a card must not write it into
      // everybody else's collection.
      statecraft: newPlayerStatecraft(),
      // The same argument one system over: a player who consecrates a god must
      // not write it into everybody else's pantheon.
      pantheon: newPlayerPantheon(),
      augursPurchased: 0,
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
    camps: [],
    winnerId: null,
  };
  placeStartingUnits(state);
  // The wild is seated **after** the opening rosters, and that ordering is the
  // whole of why player id is still the player's index: `placeStartingUnits`
  // asks `chooseStartPositions` for `state.players.length` sites, so a seat
  // appended before it would have claimed a start of its own and shifted
  // nobody's — but seated *nothing*, leaving an ownerIndex the roster never
  // filled. Appended here it costs the real seats nothing at all.
  if (normalized.barbarians === true) seatBarbarians(state);
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

/**
 * Appends the wild, with everything a seat needs and nothing a nation does.
 *
 * Every parallel-array-over-players in the state is extended in the same breath,
 * which is the point of doing it in one function: `turnEnded`, `visibility` and
 * `citySightings` are all indexed by player id (see their docblocks and the trap
 * in CLAUDE.md), so a seat added without all three would be a seat whose fog grid
 * is `undefined` the first time anything asks what it can see.
 *
 * Its flag goes up **already finished**. A seat that never ends its turn would
 * deadlock every resolution, and `clearTurnEnded` re-raises it every turn
 * thereafter — the same one line that keeps an eliminated empire finished, which
 * is exactly the right precedent: both are seats the turn must never wait for.
 *
 * It is named rather than numbered because the name reaches the player: a combat
 * forecast says who is being fought.
 */
function seatBarbarians(state: GameState): void {
  const player: Player = {
    id: state.players.length,
    name: 'Barbarians',
    // The simulation never interprets a colour (see `PlayerSpec`); the diorama
    // maps this one onto the raven ink in `data/view3d.json`.
    color: '#3a3a42',
    isHuman: false,
    gold: 0,
    sciencePool: 0,
    culturePool: 0,
    faithPool: 0,
    researching: null,
    // **Empty**, and not the opening kit. The wild does not research and does not
    // begin holding anything; what it can field is read off the *real* empires
    // every time it musters (`barbarianTier`), so a starting-tech list here would
    // be a second, stale answer to the same question.
    techsResearched: [],
    settlersBuilt: 0,
    tilesPurchased: 0,
    eliminated: false,
    barbarian: true,
    // A chiefdom the wild will never leave. Present so that every reader may
    // index a seat without asking which kind it is; filled by nothing, because
    // `runStatecraft` skips the wild the way `advanceResearch` does.
    statecraft: newPlayerStatecraft(),
    pantheon: newPlayerPantheon(),
    augursPurchased: 0,
  };
  state.players.push(player);
  state.turnEnded.push(true);
  state.visibility.push(newVisibilityGrid(state.map.tiles.length));
  state.citySightings.push([]);
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
  // Tinkers' Guild, and it is applied **at birth** rather than on read, which is
  // what the card's own text asks for: "workers are built with +1 charge". A
  // charge is spent, so a bonus computed on read would hand the extra charge
  // back every time the card was re-slotted and take it away mid-job when it
  // came out. Floored at 1, because a builder with no charges is not a builder.
  if (def.charges !== undefined) {
    unit.chargesLeft = Math.max(1, def.charges + cardExtraCharges(state, ownerId, type));
  }
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
 * Shakes a unit out of its trench. Returns whether it was in one.
 *
 * The key is *deleted* rather than zeroed, because presence is the state (see
 * `Unit.fortifiedTurns`) and a unit that never fortified must serialise
 * identically to one that just stopped.
 *
 * It lives here, beside the other three one-line facts about a unit's existence,
 * rather than in `combat.ts` where it was written, because `captureUnit` below
 * needs it and `captureUnit` has to sit under every module that can transfer a
 * piece — `arrival.ts` among them, which `combat.ts` imports. `combat.ts`
 * re-exports it, so every caller that has always asked combat about its own
 * posture rule goes on asking combat; the rule itself is unchanged and still has
 * exactly the callers it had (`movement.ts` when a unit's position changes,
 * `applyCombat` when it attacks, and now a change of owner).
 */
export function breakFortify(unit: Unit): boolean {
  if (unit.fortifiedTurns === undefined) return false;
  delete unit.fortifiedTurns;
  return true;
}

/**
 * Wakes a sleeping unit. Returns whether it was asleep.
 *
 * `breakFortify`'s sibling in every respect — the key is *deleted* rather than
 * set false, because presence is the state (see `Unit.sleeping`) and a unit that
 * has never slept must serialise identically to one just woken — and it lives
 * here for the same reason: it is a one-line fact about a piece's posture that
 * more than one occasion reaches, and the occasions must not each own a copy.
 *
 * The occasions, and they are the whole rule:
 *
 *   1. **any command that names the unit** (`commands.ts`, `wakeActorUnit`) —
 *      an order is a waking, so there is no separate "wake" verb to forget to
 *      send;
 *   2. **`wakeSleepers`** (`turn.ts`), when a foreign combatant is inside the
 *      sleeper's own sight at the end of a resolution;
 *   3. **`captureUnit`** below, because the sleep was somebody else's decision
 *      about somebody else's piece, exactly as the trench was.
 */
export function wakeUnit(unit: Unit): boolean {
  if (unit.sleeping === undefined) return false;
  delete unit.sleeping;
  return true;
}

/**
 * A unit changes hands: the **one** implementation of capture.
 *
 * The third low-level fact about a piece's existence, beside `createUnit` and
 * `removeUnit`, and here for their reason: there is exactly one way a unit comes
 * into the world, one way it leaves it, and — as of the wild's raiding — more
 * than one *occasion* on which it changes owner, so there had better be one
 * place that knows what changing owner means.
 *
 * The three occasions, all of them this function:
 *
 *   1. a melee attack on a lone civilian (`applyCombat` — the rule players have
 *      always had, and the rule a barbarian thief steals by, unchanged);
 *   2. the ground under a civilian being taken — a melee winner advancing onto
 *      the hex its kill emptied (`arriveOnTile`);
 *   3. that same advance onto a **barbarian camp**, which frees the laborers the
 *      wild had walked back to it (`arriveOnTile` again, and the reason the two
 *      are one call site rather than two rules).
 *
 * What it does, and why each line: the new owner, obviously; **no movement left
 * this turn**, because a piece that has just been dragged across a hex line has
 * not been marching for its new owner; **no orders**, because the waypoints were
 * the *previous* owner's plan and a captured settler walking back to its old
 * capital would be absurd; out of any trench, because the trench was dug by
 * somebody else's army; and **awake**, for the trench's reason exactly — the
 * sleep was the previous owner's decision that this piece could be left alone,
 * and it is the first thing the new owner needs asked about. Everything else it
 * keeps — hit points, and a worker's
 * `chargesLeft` above all (design ledger, M7): capture changes hands and nothing
 * else about what the piece *is*.
 *
 * Both empires' maps are redrawn, which is what makes the two new occasions cost
 * their callers nothing: a piece that changes hands is a pair of eyes closing on
 * one side and opening on the other, and this is the only place that knows both
 * ids at once.
 */
export function captureUnit(state: GameState, unit: Unit, ownerId: number): void {
  const before = unit.ownerId;
  unit.ownerId = ownerId;
  unit.movesLeft = 0;
  delete unit.path;
  breakFortify(unit);
  wakeUnit(unit);
  if (before !== ownerId) recomputeVisibilityFor(state, [before, ownerId]);
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
  // The wild joins the eliminated on the right-hand side of this line, and that
  // is the whole of "barbarians are auto-ended every turn": both are seats that
  // will never send an `endTurn`, so both are re-raised here rather than given a
  // rule of their own somewhere a later phase could forget it.
  for (const player of state.players) {
    state.turnEnded[player.id] = player.eliminated || player.barbarian;
  }
}

/**
 * Every seat that is somebody's empire — the roster with the wild left out.
 *
 * **The** register for "who counts": victory, the meters, the seat cycle, the
 * blockers, the median-tech tier the wild itself musters against, and every
 * report that says how the game is going all ask this rather than filtering
 * `state.players` themselves. One implementation, because the failure mode of a
 * second one is silent — a solo game that declares victory the moment the last
 * camp falls, or a happiness ledger with a line for the raiders.
 *
 * **The interface's rosters ask it too**, and they were the ones that had been
 * missed: the top-bar seat strip, the status line's waiting list, the Abacus's
 * rods and the hot-seat cycle all draw one row per seat, and every one of them
 * drew a row for the wild — a "Barbarians ✓" chip in the top bar of every solo
 * game, and a scoring rod for the weather. Anything with the shape "one thing
 * per player" belongs here whether it is a rule or a chip, which is what makes
 * a future seat kind that should not be listed (a city-state) an edit to this
 * one filter rather than an audit of two directories. The register of them is
 * `renderSeats`' docblock in `main.ts`; `test/ui/seatRoster.test.ts` reads the
 * sources and fails on a hand-rolled roster filter, because the failure mode of
 * a missed surface is a chip nobody notices for a milestone.
 *
 * In `state.players` order, which is the order everything else walks players in,
 * and it is a plain filter rather than a cached list because the roster is tiny
 * and a cache would be one more thing that can disagree with the array.
 */
export function realPlayers(state: GameState): Player[] {
  return state.players.filter((player) => !player.barbarian);
}

/** The wild's seat, or `undefined` in a world that has none. */
export function barbarianPlayer(state: GameState): Player | undefined {
  for (const player of state.players) {
    if (player.barbarian) return player;
  }
  return undefined;
}

/** Is this id the wild's? False for an id that names nobody. */
export function isBarbarian(state: GameState, playerId: number): boolean {
  return playerById(state, playerId)?.barbarian === true;
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
