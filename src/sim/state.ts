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
import {
  type BeadCardId,
  type BeadFamily,
  type BeadKind,
  BEAD_DECK_AGES,
  beadDeckFor,
  drawAgeReckonings,
  BEAD_RULES,
} from './beadData';
import type { ProjectId } from './projectData';
import type { DiscoveryId, DiscoveryKind } from './discoveryData';
import {
  FAMILIES,
  SPECIALIST_FAMILIES,
  type Family,
  type GreatPersonId,
  type SpecialistFamily,
} from './greatPeopleData';
import type { TriumphId } from './triumphData';
import type { GameMap } from './map';
import { generateMap, getMapSize } from './mapgen';
import { type MapgenOverrides, resolveMapgenConfig } from './mapgenData';
import {
  type BeliefId,
  type ConsecrationId,
  type PlayerPantheon,
  newPlayerPantheon,
} from './religionData';
import { type Rng, hashSeed, makeRng, shuffle } from './rng';
import { RULES } from './rulesData';
// Type-only, and deliberately: `wars.ts` imports *values* from this module, so
// an ordinary import here would be a runtime cycle. Nothing runs across this
// arrow — the two shapes are declarations — which is the documented exception
// (`statecraft.ts`/`religionData.ts` keep the same bargain).
import type { Truce, WarState } from './wars';
import {
  type PlayerStatecraft,
  cardExtraCharges,
  cardUnitStamp,
  newPlayerStatecraft,
} from './statecraft';
import type { CardEffect, CardId } from './statecraftData';
import { chooseStartPositions, planStartingUnits } from './startPositions';
import type { TechId } from './techData';
import { type UnitStamp, type UnitTypeId, unitDef, unitMaxHp } from './unitData';
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
 * 20: Wonders — `GameState.wonders`, the claim register that makes a wonder one
 *     per world (2026-08-27). One field, no new command: a wonder is queued by
 *     the `setCityProduction` a v19 log already carries. It is a bump rather
 *     than a free field because a v19 log replayed here is a *different game*:
 *     the roster has a row in it that Divination now unlocks, so an empire that
 *     researched Divination on turn twelve has a hundred-and-twenty-hammer
 *     building available it did not have, and — the load-bearing half — a city
 *     beaten to a wonder has its queue rewritten and its basket converted to
 *     gold by a rule that did not exist, which no earlier log can have expected.
 * 21: Great people, renown and Triumphs (`docs/great-people.md`) — the fifth
 *     Entry XVIII bucket and everything that spends it, folded into one bump
 *     because they are one pass. Five fields on the player
 *     (`renownPool`, `renownByFamily`, `legacies`, `triumphs`,
 *     `greatPeopleRecruited`, and the transient `greatPersonOffer`), two on the
 *     state (`recruited`, the world's consumed roster, and `contested`, the
 *     register of the triumphs only one seat may hold), one on a unit
 *     (`person`) and one new command (`chooseGreatPerson`, plus the two verbs
 *     `greatPersonAct` and `greatPersonWork`). A v20 log replayed here is a
 *     *different game* rather than an older one for a reason beyond the fields:
 *     a library now pays a renown a turn, so every empire in it reaches a
 *     recruitment it never had, and `state.rng` is advanced by every offer that
 *     opens — which moves every roll after it.
 * 22: The research queue and the leftover march (playtest batch two) — one
 *     optional field, `Player.researchQueue`, and two commands (`chooseResearch`
 *     grew a `queue` mode, and `dequeueResearch` is new). A v21 log replayed here
 *     is a *different game* rather than an older one for a reason beyond the
 *     field: a `moveUnit` given to a unit with no movement left used to be
 *     **refused**, and is now accepted as a standing order — so a command a v21
 *     log could never contain is one this build writes — and the resolution has
 *     grown a phase (`spendLeftoverMovement`) that marches a jammed column with
 *     the movement its turn left it, which no v21 state can have been through.
 * 23: Trade (`docs/trade.md`) — the caravan, the road and the city connection.
 *     One field on a tile (`Tile.road`, the **fourth** thing on a hex that
 *     changes during play), one on a unit (`Unit.trade`), one on a city
 *     (`City.tradingPost`), three commands (`startRoute`, `setAutoResend`,
 *     `cancelRoute`) and one phase (`marchTraders`). A v22 log replayed here is
 *     a *different game* rather than an older one for a reason beyond the
 *     fields: a step between two road hexes now costs a third of a movement
 *     point, so every march over ground a caravan has crossed arrives somewhere
 *     a v22 walk would not have reached — and connected cities pay gold their
 *     empire never had.
 * 24: The caravan stopped being a piece you position (the user, 2026-08-28: "I
 *     want to remove all micromanagement of units"). No field moved and no rule
 *     about the board changed — `sendTrader { unitId, cityId }` was **replaced**
 *     by `startRoute { unitId, fromCityId, toCityId }`, which names its own
 *     origin and teleports the caravan into it. A v23 log is refused rather than
 *     misread for the plainest possible reason: it contains a command name this
 *     build's reducer does not have, so a replay of one would stop dead partway
 *     through and leave a state no game ever reached.
 * 25: One unit bought per city per turn (user, 2026-08-28: "cities can only
 *     purchase a single unit per turn"). One optional field on a city
 *     (`City.purchasedUnitTurn`, an absolute turn) and one clause in
 *     `purchaseError`. A v24 log is a *different game* rather than an older one
 *     for the usual reason: it may contain a second `purchaseItem` on a town
 *     inside one turn, which this reducer refuses — so the replay would leave
 *     the piece unbought, the treasury unspent, and every seeded thing after it
 *     shifted.
 * 26: Religion v2 (`docs/religion-v2.md`) — the prophet, the religion, and the
 *     tide of belief. One register (`GameState.religions`), two optional fields
 *     on a city (`followers`, `pressureBank`), one on a player
 *     (`prophetsPurchased`), four commands (`plantHolySite`, `enhanceReligion`,
 *     `proclaim`, `redraftBeliefs`, plus `renameReligion` — `enhanceReligion`
 *     is gone as of v42, folded into `gainBelief`) and one phase
 *     (`spreadReligion`). A v25 log replayed here is a *different game* rather
 *     than an older one for a reason beyond the fields: the temple moved off
 *     Philosophy onto **The High Temple**, a technology that did not exist, so
 *     every research plan after the second age reaches a different tree — and
 *     the belief draft now spends `state.rng` on a generated name.
 * 27: Maintenance (the user's ruling, 2026-08-28) — units and buildings cost
 *     gold per turn by the age of the technology that unlocks them, the palace
 *     pays 2💰, the treasury may go negative, and the opening kit is a settler
 *     and a **scout** rather than a settler and a warrior.
 *
 *     One optional field on a unit (`freeUpkeep`) and four new rules
 *     (`rules.upkeep`, `rules.cities.palaceGold`). **A v26 log replayed here is
 *     a different game** for two reasons beyond the fields: every seeded start
 *     places a different second piece, and every empire's treasury curve moves
 *     from turn one.
 *
 *     The migration note, said plainly because it cannot be fixed: *absent
 *     means "pays"*, which is right for every unit in an old save **except a
 *     captured one** — v26 recorded no reason to mark it, and a replay of the
 *     log would re-derive it correctly while a loaded snapshot would not. The
 *     schema bump refuses both, so nothing silently starts charging rent on a
 *     stolen worker; it is called out here so that a future migration writer
 *     knows the one field it could not have inferred.
 * 28: The trader's own slot, and The Founders' Road as a survey (two user
 *     rulings, 2026-08-28). `UnitCategory` gains `'trader'` and the caravan's
 *     row moves onto it, so a hex holds one soldier, one civilian and any
 *     number of caravans; The Founders' Road pathfinds instead of drawing a
 *     line, lays nothing at all when no land route exists, and marks what it
 *     lays maintenance-free.
 *
 *     One optional field on a tile (`Tile.roadFree`, presence-is-the-state).
 *     **A v27 log replayed here is a different game**, and the stacking half is
 *     the reason rather than the field: a move a v27 reducer refused because a
 *     settler was standing on the hex is a move this one accepts, so the first
 *     caravan to pass a parked civilian puts every piece on the board somewhere
 *     else. The gold curve moves too — a decreed road stops being billed, and a
 *     doctrine that used to lay a broken line across a strait now lays nothing.
 *
 *     The migration note, said plainly because it cannot be fixed: *absent
 *     means "billed"*, which is right for every road in an old save **except
 *     the ones The Founders' Road decreed** — v27 recorded no reason to mark
 *     them, and a replay of the log would re-derive them correctly while a
 *     loaded snapshot would keep charging rent on a free highway. The schema
 *     bump refuses both.
 * 29: The correction of who a belief pays (user, 2026-08-28), which is Civ V's
 *     split said plainly: **founder beliefs pay the owner of the holy city**
 *     and **follower beliefs apply city-locally**, in every town that follows,
 *     whoever owns it. Two fields move on `Religion`: `holySite` records the
 *     hex the first stones went up on (the holy city is whoever's territory
 *     holds it, so a conquest moves the payoff), and `enhancer` becomes a
 *     **list** because `pools.enhancerSlots` is two and a scalar silently
 *     overwrote the first pick.
 *
 *     The migration note: a v28 `enhancer: BeliefId` becomes a one-element
 *     list, and a v28 religion has no `holySite` at all — `religionFounder`
 *     falls back to `founderId` for exactly that case, which is the same
 *     fallback a pillaged site takes. Neither could be inferred from a
 *     snapshot's board (the stones a religion was founded on are not marked on
 *     the map), and a replay of the log re-derives both, so the bump refuses
 *     the snapshot and keeps the log honest.
 * 30: **The proclamation stops lingering** (user, 2026-08-28). A faith bomb was
 *     a `ReligionPulse` — a decaying source parked on a hex for ten turns, read
 *     by `explainPressure` every turn until it expired. It is now an **instant
 *     lump of pressure**: `rules.religion.bombLump` is banked into
 *     `City.pressureBank` of every town in range at the moment the prophet
 *     speaks, the temple's own resistance applied, and the phase's own converter
 *     is run on the spot. The Preaching is the same act out of a smaller purse.
 *
 *     `Religion.pulses` and the `ReligionPulse` shape are **deleted** rather
 *     than deprecated: proclamations were their only source, so a field that
 *     could only ever be empty would be a shape a future reader had to be told
 *     to ignore.
 *
 *     The migration note: a v29 save's standing pulses simply have no home
 *     here, and the pressure they had not yet paid cannot be reconstructed —
 *     the bank records what arrived, never what was still coming. A replay of
 *     the log re-derives everything (the bomb is a command), so the bump
 *     refuses the snapshot and keeps the log honest. It is a different game
 *     either way: a v29 bomb pressed 12 a turn for ten turns and this one
 *     presses 60 once.
 * 31: **The settler ladder generalises** (user ruling, 2026-08-28). `UnitDef.
 *     costIncrement` becomes `escalation` and the worker now carries one too
 *     (3 hammers, vs. the settler's 8, moved onto its row from the old
 *     `rules.production.settlerIncrement` in an earlier pass and unchanged in
 *     value). `Player.settlersBuilt` — one counter, implicitly the settler's —
 *     is replaced by `Player.unitsBuilt: Partial<Record<UnitTypeId, number>>`,
 *     one counter *per escalating type*, so a worker habit and a settler habit
 *     price separately. `realiseItem` is still the only place either climbs,
 *     and still skips a free grant (`options.free`) — a captured or gifted
 *     unit was never *built*.
 *
 *     The migration note: a v30 `settlersBuilt: n` becomes
 *     `unitsBuilt: { settler: n }` (or `{}` for `n === 0`, presence being the
 *     state exactly as it is for `researchQueue`). A replay of the log
 *     re-derives the count from scratch regardless, so the bump refuses the
 *     snapshot and keeps the log honest rather than attempting the rewrite.
 * 32: **The Statecraft retune** (user's pass over `docs/orders-and-doctrines.md`,
 *     2026-08-28). **No new field on any save** — this bump is entirely about
 *     the balance table, and it is here for v19's and v20's reason: a log
 *     replayed against different numbers is a different game, not an older one.
 *     Every government's slot triple was rewritten, so an empire that adopted
 *     the Republic on turn forty holds a spread it never held; three cards were
 *     reworked outright (Bread and Circuses now pays happiness under a gate
 *     instead of culture, The Standing Levy musters a spear every ten turns
 *     instead of letting units jump a queue, Cuius Regio charges augurs only in
 *     the towns that keep its faith); a captured city's authority price became
 *     a *delta* rather than a set, so Hegemony and Client Kings now stack; and
 *     a new Order (The Legion) joined the Government I pool, which moves every
 *     draw from that bag. The `muster` phase is new in the pipeline and fires
 *     for nobody who holds no such card, so a v31 log's turn order is otherwise
 *     untouched — but the drafts alone move every roll after the first tier.
 * 33: **What a prophet costs** (user ruling, 2026-08-29): "prophets should be
 *     entirely consumed by starting a religion or enhancing. proclamations and
 *     redrafting should still only consume 1 charge as usual." **No new field on
 *     any save** — this bump is entirely about the price, and it is here for
 *     v32's reason: a log replayed against a different price is a different
 *     game, not an older one. A v32 prophet founded a religion and walked away
 *     with a charge in hand; this one does not exist by the time the stones are
 *     up, so every piece that prophet went on to spend — a second holy site, a
 *     proclamation, an enhancement — never happens, and the board diverges from
 *     the founding turn. Nothing about a later holy site moved: it is one charge
 *     as before, and it still never moves `Religion.holySite`.
 * 34: **A god belongs to one world** (user ruling, 2026-08-29, alongside
 *     Recasting the Omens). `beliefPool` now excludes every pantheon belief a
 *     *rival* seat keeps, so the bag a Consecrate draws from is smaller than it
 *     was and the hand dealt on any turn after the first god in the world is a
 *     different hand. That alone moves every seeded draw, which is v19's reason
 *     for a bump; the new rite adds the other half — a seventh row in the rite
 *     table, an ability on Divination, and `BeliefOffer.givenBack`, a field a
 *     v33 save never wrote. A v33 log replayed here would deal gods the log's
 *     indices no longer name, which is a different game rather than an older
 *     one. The same day's other replay-moving ruling rides the same number:
 *     **the sword line waits for iron** (`upgradeTargetFor` stops at a rung
 *     whose resource the empire does not control, and `advanceResearch` runs
 *     the retooling sweep every turn), so a v33 log's warriors become
 *     swordsmen on a different turn than the log remembers.
 * 35: **A unit can be stamped** (the Chiefdom/Gov I/Gov II Orders pass,
 *     2026-08-29). `Unit.stamp` is the ninth "presence is the state" field —
 *     `{ hp?, strength? }`, written once by `createUnit` from the owner's live
 *     `unitStamp` effects and never revisited, because what a card was worth on
 *     the day a levy mustered is a fact about that moment (The Muster Roll's ten
 *     hit points, Drums of War's point of strength). It moves the game twice
 *     over: a *unit's* maximum health is now `unitMaxHp` rather than the
 *     roster's figure, so every heal cap, both forecast bars and the upgrade's
 *     fraction read it; and a stamped piece carries a labelled "Veteran" line
 *     into `planCombat`'s fold, which changes what a die is thrown against.
 *
 *     The same pass adds fourteen Orders to the three pools drafted most, which
 *     is v32's reason on its own: a bag that grew moves every draw from it, so
 *     an empire replaying a v34 log is dealt hands the log's indices no longer
 *     name. Hill Forts also prices a city on hills a point cheaper in authority
 *     (`hillCityCost`, a new meter rule), and Cistern Works declares every town
 *     of its holder to be on fresh water — both of which change what the meters
 *     read on a turn the cards are held.
 *
 *     The migration note: a v34 save's units simply have no stamp, which is
 *     exactly what this version writes for a game whose council has stamped
 *     nothing — but the log replays against a different pool and a different
 *     maximum, so the bump refuses the snapshot and keeps the log honest.
 * 36: **Guilds** (ledger Entry XLVIII, user ruling 2026-08-29). Two fields on
 *     every city — `specialists`, four counts by family, and `guildBasket`, the
 *     bar they are earned on — and a `guilds` phase between `growCities` and
 *     `advanceProduction` that turns a citizen into a specialist whenever the
 *     bar covers its threshold. Neither field is optional: a specialist count is
 *     arithmetic in the innermost loop this simulation has, not an event (see
 *     `City.specialists`).
 *
 *     **A v35 log replayed here is a different game**, and the fields are the
 *     smaller half of why. From the first town that finishes a library, one of
 *     its citizens eventually stops working a hex — so the tile assignment
 *     diverges, and with it the food, the hammers, the growth turn, what the
 *     borders reach for and every seeded roll that comes after a differently
 *     timed draft. The empire's renown moves too: a standing specialist pays a
 *     point a turn into its own family's feed, which is the weighting a great
 *     person is drawn against.
 *
 *     The migration note, said plainly because it cannot be fixed: *absent means
 *     zeros*, which is right for every town in an old save — nothing before this
 *     version could have had a guild. It is still refused, because the board a
 *     v35 log produces here is not the board it produced there, and a snapshot
 *     restored into this version would be a game the log can no longer explain.
 * 37: **The Bead Race** (design ledger Entry VI, `docs/beads.md`) — the game's
 *     one victory condition, and the largest single addition since Statecraft.
 *     One field on the state (`GameState.beads`: the two shuffled decks, the two
 *     hands, the world's register of claims, the streak book and the world's
 *     age), eight on the player (`beads`, `dice`, and the six counters a deed
 *     asks about that the board cannot answer — `citiesFounded`,
 *     `citiesCaptured`, `faithOnHolyOrders`, `tithesGold`,
 *     `scholarshipScience`, `routeYieldsThisAge`, `greatPeopleThisAge`), one
 *     phase (`beads`, after `renown`) and three building rows nothing unlocks
 *     yet (`BuildingDef.awaitsTech`).
 *
 *     **A v36 log replayed here is a different game**, and the decks are the
 *     smaller half of why. `newGame` now draws two shuffles off `state.rng`
 *     before a single unit is placed, which moves **every seeded roll in the
 *     game** — the first barbarian camp, the first ruin's hand, every draft.
 *     Beyond that: a race project is a queue row a v36 city could not hold, a
 *     bead's boon settles through five of the Entry XVIII seams, and the first
 *     empire to twenty beads simply wins, which is a way a v36 game could not
 *     end.
 *
 *     The migration note: absent means a game that has raced nobody, which is
 *     right for every v36 save — nothing before this version could hold a bead.
 *     It is still refused, because the board a v36 log produces here is not the
 *     board it produced there.
 * 38: **The tree** (`docs/tech-tree.md` Part 3, the tree pass of 2026-08-30) —
 *     four ages where there were three, and fifty-three nodes where there were
 *     twenty-six. Nothing on the *state* changed shape, and the version still
 *     has to move, because a save is `{config, log}` and this pass changed what
 *     a log **means**:
 *
 *       · **`drama` is deleted.** A v37 log containing `chooseResearch drama`
 *         names a technology that no longer exists, and there is no honest
 *         reading of it — its buildings are Epic Poetry's now and Theology's
 *         prerequisites are Rhetoric and Epic Poetry.
 *       · Every surviving node keeps its **id** (Philosophy is displayed as
 *         *Rhetoric* and is still `philosophy`), and almost none keeps its cost,
 *         its prerequisites or its age. A v37 log's research plan therefore
 *         completes at different turns, in a different order, and hands over a
 *         different roster.
 *       · Ages renumber, so everything keyed by one moves with them: the unit
 *         cost band gains a fourth rung, the glass-bead decks re-key 2|3 → 3|4,
 *         and a barbarian's tier is read off a different median tree.
 *       · The great-person offer is gated on Ancestor Rites, so the turn a name
 *         is first dealt — and therefore every `state.rng` draw after it — moves.
 *
 *     The migration note: nothing to migrate. Every field a v37 save carries is
 *     still a field this version reads; what is gone is the tree the log was
 *     played against.
 * 39: Auto-explore — `Unit.autoExplore` and the `setAutoExplore` command
 *     (2026-08-30). A soldier or a scout told to range ahead aims itself at the
 *     nearest hex whose own sight would still show it something new
 *     (`explore.ts`), and the `marchExplorers` phase re-aims it every
 *     resolution until nothing within reach is left to see. A v38 log replayed
 *     here is the same game: nothing in it can carry the new command, and a
 *     unit with no `autoExplore` key is a unit under its own orders. It is a
 *     bump rather than a free field for sleep's reason exactly (entry 16): the
 *     *phase* is new — the resolution has grown a step, and a state that ran
 *     without it is not a state this build produced.
 * 41: **The tree re-cut** (2026-09-02, ledger Entry LVIII, `docs/tree-worksheet.md`
 *     revision 3). Entry 38's bump, for the same reason and at the same scale —
 *     a log played against a different tree is a different game:
 *       · fifty-three nodes become **forty-nine**, and twelve of the old ones
 *         are gone entirely (Calendar, Construction, The Legion, The Steppe Bow,
 *         The Halberd Wall, Standing Stones, Caravans, The Knotted Cord, The
 *         Orrery of Bronze, The Deluge Remembered, The Floating Fields, The
 *         First Distillation). A v40 log that researched one of them names a
 *         technology this build has never heard of.
 *       · Every surviving node keeps its **id** — The Imperial Post is displayed
 *         as *Empire-Building* and Feudalism as *Castellany* — and almost none
 *         keeps its prerequisites; nine nodes are new (Siegecraft, Artisanry,
 *         Prospecting, Horology, Banking, Fortification, The Holy Office,
 *         Alchemy, and the Bowman's line with them).
 *       · **Iron is named by Iron Working**, not by Bronzeworking, so the reveal
 *         moment — the label, the access and the tile's own hammer — lands an
 *         age later, and the Swordsman that used to need it does not.
 *       · **Niter** is a new strategic seam, so `placeResources` draws a
 *         different map from the same seed.
 *       · The roster retunes across the melee, pike and bow lines, and the
 *         upgrade chains re-link (Warrior → Swordsman → Legionary →
 *         Longswordsman; Archer → Bowman → Composite Bowman → Crossbowman;
 *         Spearman → Phalanx → Halberd → Pikeman), so the retooling sweep moves
 *         different pieces on different turns.
 *
 *     The migration note: nothing to migrate, and nothing that *could* be. Every
 *     field a v40 save carries is still a field this version reads; what is gone
 *     is the tree and the map the log was played against.
 * 42: **The faith rework** (2026-09-02, ledger Entry LVIII, phase 2 — the
 *     one-charge agents and The Holy Office's tenants). Two commands change what
 *     they mean, one is deleted, two are new, and a religious agent is worth a
 *     third of what it was:
 *       · **A prophet has one charge** and does exactly one deed — found,
 *         proclaim, gain a belief, or give a pool back. A v41 log's prophet
 *         planted a site and then went on to proclaim; here the same log's
 *         second command names a piece that is no longer on the board.
 *       · **An augur has one charge**: consecrate a god, or perform one rite.
 *         Three rites out of one augur was the v41 reading and is now three
 *         augurs' worth of faith.
 *       · **`enhanceReligion` is gone.** Enhancing is the far end of one belief
 *         ladder now (`gainBelief`, `nextBeliefPool`), so a v41 log carrying that
 *         command names a verb this build has never heard of.
 *       · **`plantHolySite` founds and only founds.** A prophet may no longer
 *         raise a second site, so a v41 log's later plantings are refusals here.
 *       · **Founding drafts twice** — one belief, then a second dealt the moment
 *         the first is answered (`PlayerPantheon.owed`) — and the follower house
 *         holds three where it held two, so the draws off `state.rng` differ in
 *         number and in order from the first founding onward.
 *       · **`purge` is new**, and with it the Inquisitor, the Reliquary and the
 *         faith bank a town holding one opens for ordinary units.
 *
 *     The migration note: `PlayerPantheon.owed` absent means an empire owed
 *     nothing, which is right for every v41 save. It is refused anyway, because
 *     the board a v41 log produces here is not the board it produced there — the
 *     agents it spent are worth less and the drafts it opened are dealt
 *     differently.
 * 43: **The map's layers** (2026-09-02, ledger Entry LVIII, phase 3 — veins, the
 *     second discovery wave, the deep sea). The **map a seed produces is
 *     different**, which is the whole of why a v42 log cannot be replayed here:
 *       · **Veins** are seeded under the hills by a new generation pass
 *         (`placeVeins`), and `placeDiscoveries` now deals two further layers —
 *         the barrows and the sea finds — after its own. Every one of those
 *         draws comes off the same generator, so a v42 seed's board and this
 *         one's agree on the terrain and the ruins and part company on
 *         everything the new passes touched.
 *       · **Rich ore is a new resource row**, the first that is never scattered
 *         on the surface (`ResourceDef.buried`) — so the surface scatter is
 *         bit-identical, and the tile a survey turns over is not.
 *       · **`prospect` is a new command** and the two new tile fields it writes
 *         (`Tile.vein`, `Tile.surveyed`) did not exist; a v42 log naming it is
 *         a verb this build has never heard of, and a v42 log that does not is
 *         a game played on a map without hills worth asking.
 *       · **A city founded on a gated site drops it**, so a settler's arrival on
 *         a hex that carried a barrow resolves differently.
 *
 *     The migration note: nothing to migrate. Both new tile fields are absent on
 *     every v42 tile, which reads correctly as "nothing buried, nobody asked" —
 *     what a v42 save cannot carry across is the map itself.
 * 44: **The age-1 restoration and the deepened chains** (2026-09-02, the user's
 *     pass over revision 3). Entry 41's bump again, for exactly its reason: the
 *     tree a log was played against is not this tree.
 *       · **Æra I is restored wholesale to what it was before the re-cut** —
 *         twelve nodes, **Calendar** among them, back at its old cost with the
 *         Hanging Gardens, the tithes conversion and the Rite of Plenty on it,
 *         and with the old prerequisites (Bronzeworking wants Mining *and*
 *         Earthenware again, Letters wants Divination, The Wheel wants
 *         Bronzeworking). A v43 log cannot name Calendar and a v43 log that
 *         researched Letters researched a cheaper, differently-gated node.
 *       · **Currency 195 → 160 and Irrigation 170 → 190**, so every seat's
 *         beaker schedule from the middle of Æra II onward parts company with a
 *         v43 replay's.
 *       · **Æra III and Æra IV are re-chained** so each lays out in three
 *         dependency columns rather than one — Empire-Building wants Colonial
 *         Charters, Paper Money and The Qadi's Court want Empire-Building,
 *         Machinery and Physics want Prospecting, Movable Type wants Paper
 *         Money, Steel wants Machinery, Banking hangs off The Silk Road, The
 *         Holy Office off Movable Type and Alchemy off Steel. A v43 log's
 *         `chooseResearch` is a refusal here wherever a prerequisite moved.
 *       · **Forgotten hymns pay 7 culture, not 13**, so the ruin a scout walked
 *         into no longer settles the opening draft and the draws that follow it
 *         come off `state.rng` in a different order.
 *
 *     The migration note: nothing to migrate — no field changed shape. What a
 *     v43 save cannot carry across is the tree its log was aimed at.
 * 45: **The endgame of Entry LVIII** — the Magnum Opus, the bead-paying great
 *     works, the Long Count's die and Alchemy's closing bead. A v44 log is
 *     refused because the *game can now end a way it could not*, and because
 *     four rows and two payouts move what a replay produces:
 *       · **The Magnum Opus** is a row the world opens — buildable by every
 *         empire the moment any seat completes Alchemy — and finishing it closes
 *         the age: the final reckonings are taken across every seat at once and
 *         the empire holding the most beads wins, ties going to whoever raised
 *         it. A v44 log played out here reaches a `winnerId` on a turn it never
 *         reached one before.
 *       · **Three great works** (Chart the Stars, The Turning Heavens, The
 *         Alchemical Codex) join the build lists off The Long Count, Education
 *         and Alchemy, so the rows a city may queue at those nodes differ; each
 *         pays a bead, and The Turning Heavens deals a scholars-only
 *         great-person offer, which spends `state.rng` where a v44 game spent
 *         nothing.
 *       · **Alchemy pays a glass bead** to every empire that completes it, and
 *         **The Long Count pays a die** for every age its holder enters
 *         afterwards — two new payouts inside `settleResearch`, so a v44 log's
 *         rods and dice do not match.
 *       · **A fifth class of bead row** (`grants`) is in the catalogue. It is
 *         never dealt and never shuffled, so no deck or hand moves; what changes
 *         is that `Player.beads` may now hold an id a v44 build has never heard
 *         of.
 *
 *     The migration note: nothing to migrate — no field changed shape, and a
 *     game with none of the four rows built serialises exactly as a v44 one
 *     did. What a v44 save cannot carry across is a finish line its log was
 *     never played against.
 * 46: **The card pools of Entry LVIII** — the Themes Build's fourth phase, the
 *     ratified cards. A v45 log is refused because *the tables it was dealt
 *     from are not these tables*:
 *       · **Nineteen new Orders and a Doctrine** join four pools that a draft
 *         draws from without replacement, so every `chooseOrder` and
 *         `chooseDoctrine` in a v45 log names a different index of a different
 *         hand. Two beliefs, a pantheon row and a sixth **consecration** join
 *         their own bags, and the consecration is rolled from `state.rng` when a
 *         cathedral is topped out — so a v45 game that raised one spent its
 *         rolls against a five-card table.
 *       · **The Laureate is reworked** (sheet 09, the user): its once-per-game
 *         great person is gone and a renown trickle stands in its place, so an
 *         empire that slotted it in a v45 game was handed a name this build
 *         never offers and climbs the ladder at a different rate thereafter.
 *       · **`Player.campsCleared` is a new field** — the tally The Last Hunt
 *         reads, written at `arriveOnTile`. Every v45 player is missing it,
 *         which reads as a realm that has cleared nothing rather than as a realm
 *         whose hunts were never counted.
 *
 *     The migration note: a v45 `Player` gains `campsCleared: 0`. Nothing else
 *     changed shape — what a v45 save cannot carry across is the deck.
 * 47: **The column-formula costs and the timeline reshape** (the user, twice, on
 *     2026-09-02: make the chart read like Civ V's, then price a node off the
 *     column it lands in). A v46 log is refused because *the tree it was aimed
 *     at is not this tree, and nothing in it costs what it cost*:
 *       · **Seventeen prerequisite edges moved**, so that every column of every
 *         age holds three nodes or more and almost every connector is a step
 *         rather than a reach. Sailing hangs off Earthenware and the Calendar
 *         off Divination; Epic Poetry off Kingship; The High Temple off The
 *         Long Count; Rhetoric off the temple as well as the epic; Colonial
 *         Charters, Empire-Building, Theology, The Qadi's Court and Education
 *         are re-chained through Æra III; Machinery, Physics, Movable Type,
 *         Banking and The Holy Office through Æra IV. A v46 `chooseResearch` is
 *         a refusal here wherever a prerequisite moved, and a plan the reducer
 *         expanded for it names different nodes.
 *       · **Every cost in the tree is rewritten** from the node's own
 *         `techColumn` by one tapered table (the pricing note in `tech.ts`), so
 *         the beaker schedule parts company with a v46 replay's on the very
 *         first technology: 30 where the table said 8. The tree costs 26089
 *         against 20354, and the ages close on turns 74 / 128 / 252 / 334
 *         against 34 / 71 / 177 / 265.
 *       · **Every lane is re-annealed** against the reshaped graph. That is
 *         presentation only — `row` is never read by a rule — and is named here
 *         because it moved in the same pass, not because it moves a replay.
 *
 *     The migration note: nothing to migrate — no field changed shape. What a
 *     v46 save cannot carry across is the tree its log was aimed at, and the
 *     prices it was paying.
 * 48: **The user's balance pass** (2026-09-02) — the Order deepening ladder, the
 *     Order and Doctrine retunes, and the luxury signature rework that landed
 *     beside it. A v47 log is refused because *the deck it was drafting from is
 *     not this deck, and what it drafted does not deepen the way it did*:
 *       · **Deepening is authored now.** `scaleByLevel`'s blanket ×1.5 on every
 *         printed figure is gone; a level-N Order is its printed effects plus
 *         N−1 copies of the increment written on its row (`OrderDef.upgrade`),
 *         capped at `maxOrderLevel` (3) or the row's own `maxLevel`. Every
 *         deepened holding in a v47 save therefore pays different numbers, and
 *         sixty-two rows are no longer offered as an upgrade at all.
 *       · **The rows are retuned** — Border Wardens and Vanguard from +3 to +2,
 *         Siege Doctrine 5 to 4, Public Granaries 25% to 15%, Weights & Measures
 *         2 gold to 1, The Tax Farm and Statute Labour from every third citizen
 *         to every fourth, Master Masons and Rites of Passage doubled, and a
 *         dozen more. A v47 replay banks different yields from the first turn a
 *         card is slotted.
 *       · **Four cards were reworked and two changed pool.** The Salt Road pays
 *         on strategic seams rather than improved bonus ones, Quarrymen's Guild
 *         asks for a quarry rather than for stone, River Wardens asks for a
 *         garrison, The Old Ways is un-retired and doubles what unimproved
 *         ground pays; Foreign Quarters is withdrawn and The Great Warring
 *         Tribes moved from the first Doctrine pool to the second, which changes
 *         what every draft after it deals.
 *       · **Three Doctrines were rewritten** — The Gentle Yoke, Manifest of the
 *         Steppe, The Gilded Court — and two replaced outright: Cuius Regio now
 *         converts a following city's faith into science, and The Academy of
 *         Deeds is The Academy and no longer doubles a Triumph's renown.
 *
 *     The migration note: nothing to migrate — no field changed shape. What a
 *     v47 save cannot carry across is the deck, the numbers on it, and the
 *     ladder its holdings were climbing.
 * 49: **The cost ladder re-anchored at the first paid tier — the root is not a
 *     tier** (the user, 2026-09-02: "the first tier should be 13 science …
 *     I think the agent skipped a tier"). v47's table anchored cost(0) = 13 at
 *     the *root*, but column 0 holds Agriculture alone and Agriculture is
 *     pre-granted (`RULES.research.startingTechs`), so the first tier anybody
 *     ever buys was priced at 30. The whole ladder shifts one column right:
 *     every column now takes the price the column to its left used to carry,
 *     the root gets a nominal 5 that is never paid, and the old top figure of
 *     950 falls off the end. A v48 log is refused because *every node in the
 *     tree costs something else*: Fletching is 13 where it was 30, Alchemy 920
 *     where it was 950, the tree 22544 against 26089, and the ages close on
 *     turns 46 / 91 / 200 / 273 against 74 / 128 / 252 / 334.
 *
 *     The migration note: nothing to migrate — no field changed shape, and no
 *     prerequisite moved. What a v48 save cannot carry across is the beaker
 *     schedule, which parts company with the replay on the first technology
 *     anybody researches.
 * 50: **Tree revision 4 — the user's own redraw**, and the per-class purchase
 *     stamps beside it. Four changes, any one of which would be a bump:
 *
 *       · **Fourteen nodes were renamed** (Pottery, Writing, Chronology, Code
 *         of Laws, The Saddle, Guildhalls, Satrapies, Daughter Cities,
 *         Geomancy, Divine Right, Scholarship, Natural Philosophy, The Golden
 *         Roads, The Counting Houses). Ids are forever, so a v49 log naming one
 *         still names the same node — this half migrates perfectly and is the
 *         reason none of them was given a new id.
 *       · **Three ids were deleted** — `ancestorRites`, `chivalry`,
 *         `fortification` — and three added: `stateWorkforce` (Æra II),
 *         `raisedFields` (Æra III), `militantOrders` (Æra IV). A v49 log that
 *         researched one of the three is dead, exactly as the Wave-1 cuts were.
 *       · **Almost every prerequisite moved**, so the chart is twelve columns
 *         where it was fourteen and every cost is re-read off the shortened
 *         ladder (5 · 13 · 30 · 69 · 135 · 225 · 335 · 450 · 565 · 665 · 750 ·
 *         820). The tree costs 17920 against 22544 and the ages close later or
 *         earlier accordingly; a v49 replay parts company on the first node.
 *       · **The one-unit-a-turn rule is now one per class.**
 *         `City.purchasedUnitTurn` — a single stamp — is replaced by
 *         `City.purchasedUnitTurns`, a stamp per `UnitPurchaseBucket`
 *         (military-with-gold, civilian-with-gold, anything out of the faith
 *         bank). A v49 log is a *different game* rather than an older one for
 *         v25's reason in reverse: it was written against a reducer that
 *         refused a second purchase this one accepts, so a seat that gave up
 *         and did something else would, replayed here, have been allowed to buy.
 *
 *     The migration note: one field changed shape and it is deliberately not
 *     migrated. `purchasedUnitTurn` is stale by itself — it is meaningless the
 *     moment the turn rolls over — so there is nothing in it worth carrying, and
 *     a save is `{config, log}` regardless: what replays is the log, against
 *     this tree and this rule.
 * 51: **The flag rulings — parameter deepening, the scholar draft, the lapis
 *     trickle, retunes** (`docs/flags.md` section A, answered 2026-09-03). Five
 *     changes, any one of which would be a bump:
 *
 *       · **An Order's deepening may move a printed number.** `OrderDef.upgrade`
 *         takes a second kind of entry (`OrderDeepening`), so The Standing Levy
 *         musters every 12 / 10 / 8 turns and Pilgrim Roads' happiness cap reads
 *         5 / 7 / 9 — both were `upgradable: false` in v50 and are drafted as
 *         upgrades now, which changes what every Statecraft offer holding one
 *         deals. The fifty-three additive rows are byte-identical, and a test
 *         pins that.
 *       · **The Academy sells a draft of scholars for 1000🕯.** A third entry in
 *         the great-person purchase register, gated by a new
 *         `buyScholarDraftWithFaith` action rule, and the command's field is
 *         `buys` where it was `currency` — a v50 log naming `currency` no longer
 *         resolves to a purchase, so it is refused.
 *       · **`noSettlerEscalation` is retired**, the id and its clause: no card
 *         has carried it since the balance pass, and the settler ladder now
 *         always climbs.
 *       · **Three retunes.** The Gentle Yoke asks 2 authority a city where it
 *         asked 3, Militia Levies gives 4 defense (deepening by 2) where it gave
 *         5, and River Wardens moved from the first Order pool to the second —
 *         which changes what every draft after it deals.
 *       · **Lapis lazuli pays renown.** A new resource-effect shape
 *         (`renownPerCity`, +1 a city a turn from Æra III) joins
 *         `explainRenown`'s list, so a realm holding the stone recruits sooner.
 *
 *     The migration note: nothing to migrate — no field changed shape. What a
 *     v50 save cannot carry across is one command's spelling and four cards'
 *     arithmetic. The Gentle Yoke's ratified reading — the extra authority asked
 *     only of cities founded *after* it is taken — is still deferred on its row
 *     and still wants the same field the King List wants: a founding turn on
 *     `City`, which nothing in this state keeps. Add that field and both are one
 *     comparison each.
 *
 * v52: Curious Elders and Triumphs retired by the user's word — both leave the
 * draft pools (rows kept so a save that holds them replays), which moves every
 * draw after the first affected draft.
 *
 * v53: tree revision 4.1 — the user's arrows verbatim (edges, columns and the
 * fourteen-figure ladder all moved), so a v52 log replays into a different
 * world and is refused.
 *
 * v54: revision 4.2 — the drawn columns are data: authored columnShift on
 * four nodes, columns 9-12 constitute Æra IV (Scholarship, Geomancy,
 * Machinery, Divine Right and Paper Money re-aged; State Workforce joins
 * Æra III), and Alchemy takes all five closing lines as parents. Costs and
 * ages both moved, so a v53 log replays into a different world and is
 * refused.
 *
 * v55: the playtest notes (2026-09-03) — plantations move to the Calendar,
 * the Standing Stones improvement is deleted, Raised Fields drops the
 * Terraces for a mountain-side farm renewal and the floating gardens, the
 * workshop and the Stele of Laws are retuned. Two of those are *table*
 * deletions (an improvement id and a building id), so a v54 log that laid a
 * ring of stones or raised the Terraces has no row to replay into and is
 * refused rather than quietly dropping the thing it built.
 *
 * v56: **war and diplomacy, phase one** (`docs/war-diplomacy.md`, ruled
 * 2026-09-03) — and it is the one bump in this list that refuses an old log for
 * a *legality reversal* rather than for a table that moved. Everything else
 * here changed what a command produced; this changes which commands are
 * commands at all.
 *
 *   · **Violence against another empire is illegal at peace.** Combat, pillage
 *     and the plunder that rides an advance all gained one `atWar` clause, so a
 *     v55 log — written against a reducer in which any blow between any two
 *     seats was simply legal — may contain an attack this one refuses. Replayed
 *     here it would leave the defender alive, the raider unpaid and every
 *     seeded thing after it shifted, which is precisely the case a bump exists
 *     for. The wild is untouched on both sides: it has no row in the register
 *     and `atWar` answers *true* for it without looking.
 *   · **Borders close at peace.** A military piece may not enter another
 *     empire's territory unless the two are at war; civilians and caravans pass
 *     as they always did. One clause in `canTransit`, so the four readers of
 *     `stepCost` inherit it — which means a v55 march that crossed a neighbour's
 *     fields is refused here, and every standing order behind it arrives
 *     somewhere else.
 *   · **Two registers and five verbs.** `GameState.wars` and `GameState.truces`
 *     (`wars.ts`), and `declareWar`, `proposePeace`, `withdrawPeace`,
 *     `annexCity` and `razeCity`. A v55 log naming none of them replays
 *     byte-identically *as a log*; what it cannot replay is the world, for the
 *     two reasons above.
 *   · **A captured town is a puppet.** `City.puppet` and `City.wasCapital`,
 *     both presence-is-the-state, so a game with neither serialises exactly as
 *     a v55 one did — but a v55 capture priced its authority and its
 *     contentment at the full rate from the turn it happened, and this one does
 *     not.
 *
 *     The migration note, said plainly because it cannot be fixed: *absent
 *     means "annexed"*, which is right for every town in an old save except the
 *     ones that had just been taken — v55 recorded no reason to mark them — and
 *     `wasCapital` could not be inferred from a board at all, since
 *     `capitalCityOf` is derived and a seized palace stops reading as one the
 *     instant it changes hands. A replay of the log re-derives both; the bump
 *     refuses the snapshot and keeps the log honest.
 */
export const SCHEMA_VERSION = 56;

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
  /**
   * Which way a seat *nobody is sitting in* plays — `'wide'`, `'tall'`,
   * `'zealot'`, `'warmonger'`, or absent for the balanced default.
   *
   * `charge`'s sibling in every respect, and for `charge`'s reasons. It is
   * **config**, so a game saved today replays a year from now with the same
   * seats playing the same way rather than whatever the default has become; it
   * is an **uninterpreted string** here, because the simulation must never read
   * it — the roster of personas lives in `data/ai.json` and is `src/ai/`'s
   * business alone (`aiConfigFor`).
   *
   * **No schema bump**, and the argument is exact: a persona drives the *bot*,
   * not the reducer, and an old save replays its command log without ever
   * running one. `normalizeConfig` writes the key only when it is there, so a
   * config that never heard of personas normalises byte-identically to one from
   * before they existed.
   */
  persona?: string;
  /** Defaults to false — the caller decides who sits at the keyboard. */
  isHuman?: boolean;
}

/**
 * One great person this empire has spent, and whether their legacy still speaks.
 *
 * **A legacy is history, and history is never deleted** (the 2026-08-28 ruling
 * that revoked the "nothing revokes a legacy" trap). Three ratified rows lose
 * their ability on an occasion — Archimedes when an enemy walks into his city,
 * Hypatia the first turn the realm turns ugly, Boudica when her age closes — and
 * the mechanism is a *mark*, not a splice: the record stays in spend order, the
 * roll of who served this empire stays exactly what it was, and only
 * `liveEffects` stops reading a revoked row.
 *
 * `age` is the empire's era at the moment the person was spent, and it is here
 * for exactly one revocation: "only during the age she was recruited in" is a
 * comparison against a stamp, in the `TimedEffect` tradition — an absolute
 * number, compared, never a counter anything has to tick.
 */
export interface LegacyRecord {
  id: GreatPersonId;
  /** The empire's era (`highestAge`) when this person was spent. */
  age: number;
  /**
   * Present once the occasion on the row has happened. **Never removed** — the
   * key is the whole of the mechanism, and a legacy that came back would be a
   * fourth state nothing in the design asks for.
   */
  revoked?: true;
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
  /**
   * The seat's bot persona, copied from its spec. Absent means balanced — see
   * `PlayerSpec.persona`, which carries the whole argument.
   *
   * Uninterpreted here for `charge`'s reason, and it must stay that way: the day
   * a *rule* reads this field the bot stops being a reader of the state and
   * starts being part of it, and that is a schema bump.
   */
  persona?: string;
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
   * (`docs/deprecated/religion.md`). The hover's note is *gone* rather than reworded,
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
   * What this player has lined up **after** `researching`, in the order it will
   * be learnt. Absent means nothing is queued.
   *
   * Presence is the state, which is `Unit.path`'s convention and is here for the
   * same two reasons: an empire that never queued anything serialises exactly as
   * it did before this field existed, and a state that reaches this build with
   * no key at all reads as an empty queue rather than as a crash. Every read goes
   * through `researchPlan` (`tech.ts`), which is where the `?? []` lives.
   *
   * The head is deliberately **not** in here. `researching` is still the whole of
   * "what the beakers are aimed at" — switching is still free and lossless, the
   * pool is still the progress — and this is only what follows, so nothing that
   * asked `researching` before has to learn a second question. The invariant that
   * makes the End Turn blocker still correct is the other half of that split: a
   * non-empty queue always has a head, because the only two writers
   * (`writeResearchPlan` and `promoteResearchQueue`) fill `researching` from the
   * front of the plan and delete this key the moment nothing is left behind it.
   */
  researchQueue?: TechId[];
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
   * How many of each escalating unit type — settler and worker, today — this
   * player has *completed from production or bought*, keyed by `UnitTypeId`.
   * The multiplier in `explainUnitCost` (`cities.ts`), one ladder per type
   * rather than one shared ladder (schema 31; the settler-only reading was
   * `Player.settlersBuilt`, a single counter).
   *
   * Presence is the state, exactly as `Unit.path` and `researchQueue` are: a
   * type never built has no key rather than a zero, so an empire that has
   * founded no city and trained no worker serialises as it did before either
   * type could escalate.
   *
   * "Built" is meant strictly, and the two exclusions are the rule rather than
   * an oversight. The settler a player opens the game holding was never paid
   * for, so it does not make the next one dearer; a unit taken off a rival on
   * the battlefield was paid for by *them*, and capturing one is already its
   * own kind of expensive — captured units never reach this counter because
   * `captureUnit` never calls `realiseItem`. `realiseItem` is the *only* place
   * any key here climbs, for both a completion and a purchase, and it skips a
   * free grant (`options.free`) for the same reason a capture is skipped: a
   * gift was not *built*.
   *
   * On the player rather than derived from the board because it can never be
   * derived: a settler is *consumed* when it founds, so counting the ones
   * standing around would price the fourth city like the first.
   */
  unitsBuilt: Partial<Record<UnitTypeId, number>>;
  /**
   * How many tiles this player has ever bought with gold (`purchaseTile`).
   *
   * The escalation ladder in `explainTilePurchase` (`cities.ts`), and per
   * *player* rather than per city because that is what it is meant to price: Civ
   * 6 escalates a habit of buying land, and a habit belongs to an empire. Kept
   * on the player for `unitsBuilt`'s reason — it can never be derived from
   * the board, because a bought tile is indistinguishable from a tile culture
   * claimed the moment the gold has left the treasury.
   *
   * Nothing lowers it. Losing the ground does not refund the habit.
   */
  tilesPurchased: number;
  /**
   * How many barbarian camps this player has ever **burnt out**
   * (`arriveOnTile`, the one seam that clears one).
   *
   * `tilesPurchased`' twin one verb over, and it is on the player for that
   * counter's reason exactly: it can never be derived from the board, because a
   * cleared camp leaves *nothing behind* — that is what clearing one means. The
   * board can answer "how many camps still stand" (`visibleCamps`) and "how many
   * have I found" (`discoveredCamps`, off the monotone fog); only a record can
   * answer "how many did I ride down".
   *
   * Nothing lowers it. The Last Hunt is a tally of a life's work, and a hunt
   * that stopped counting when the steppe emptied would be a card that punishes
   * finishing the job.
   */
  campsCleared: number;
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
   * `unitsBuilt`'s twin one currency over, and the escalation in
   * `explainPurchaseCost` (`religion.ts`): the second augur costs 15🕯 more than
   * the first, so *when* to spend faith on a god rather than on three rites is a
   * tempo decision against a climbing price.
   *
   * On the player because it can never be derived, for `unitsBuilt`'s reason
   * exactly: an augur is *consumed* by consecrating or by its last rite, so
   * counting the ones standing around would price the fourth like the first.
   * Nothing lowers it, and a captured augur does not raise it — it was paid for
   * by somebody else.
   */
  augursPurchased: number;
  /**
   * How many prophets this player has ever **bought with faith**.
   *
   * `augursPurchased`' twin, and a field of its own rather than one counter for
   * both agents: the two climb separate ladders (40 +15 against 120 +60), so a
   * shared counter would make the first prophet cost whatever the augurs had
   * already run the price up to. Read in exactly one place (`purchasesMade`,
   * `purchase.ts`), which is where the augur's is read.
   */
  prophetsPurchased: number;
  /**
   * Renown banked toward the next great person — **the fifth Entry XVIII
   * bucket**, and the basket itself (`docs/great-people.md`).
   *
   * `culturePool`'s twin one currency over, and deliberately the same shape: a
   * *pool*, not a rate, filled by buildings and wonders a turn at a time and by
   * Triumphs in lumps, and spent by `settleRenownWindfall` (`renown.ts`) the
   * instant it covers the ladder. There is no second bank anywhere and there
   * must never be — a second answer to "how close am I to a recruitment" is two
   * answers that disagree the first time a windfall pays one of them.
   *
   * The overflow stays here toward the next name, exactly as the culture pool's
   * does.
   */
  renownPool: number;
  /**
   * How much renown each family has *fed this empire*, ever — the record the
   * offer is weighted by.
   *
   * Not a second pool: nothing is ever spent out of it and nothing is ever
   * subtracted. It is a **history**, and it exists because the draw has to be
   * able to say "an empire of libraries is offered scholars" without any rule
   * saying so. Ever, rather than this-turn, so a library torn down by a
   * conqueror does not un-teach the empire what it was.
   *
   * Always present with all five keys, like `techsResearched` and unlike
   * `greatPersonOffer`: every seat has a feed record from turn one, empty though
   * it is, so this is a fact about a player rather than a state some of them are
   * in. A record rather than five fields because it is read all at once by one
   * weighting and by one hover.
   */
  renownByFamily: Record<Family, number>;
  /**
   * The great people this empire has **spent**, in the order they were spent —
   * and therefore the legacies reaching it (*they served you; their legacy
   * remains*).
   *
   * `liveEffects`' **sixth source** (`statecraft.ts`): each record is looked up
   * through `anyCardDef` and its `legacy` walked exactly as a belief's effects
   * are — **unless it has been revoked**, which is one filter in that walk and
   * the only reading of `LegacyRecord.revoked` anywhere. Nothing else in the
   * game reads this list for its effects; `greatPeopleEarned` reads it for a
   * *count*, and a revoked legacy still counts, because The Empire's line says
   * "earned this game" and a general who is no longer heeded was still earned.
   *
   * An array in spend order, for `techsResearched`' reason: iteration order that
   * is part of the state is iteration order a replay reproduces, and a ledger
   * that reshuffled itself would look wrong for no reason.
   */
  legacies: LegacyRecord[];
  /**
   * Blessings and **bills** hanging on the empire itself, each until an absolute
   * turn. `City.timed` and `Unit.timed`'s third holder.
   *
   * Crassus' is the first and says why the holder had to exist: "−1 happiness
   * for 10 turns after every purchase" is a fact about the *realm's* mood, and
   * hanging it on the town that happened to buy the granary would have been a
   * quieter, wrong rule. Everything else about it is the other two holders'
   * exactly — absolute expiry, ordinary `CardEffect`s, the same evaluator, the
   * same broom (`pruneTimedEffects`), the key deleted when the list empties so
   * an empire that has paid its debts serialises like one that never bought
   * anything.
   */
  timed?: TimedEffect[];
  /**
   * The Triumphs this empire has earned, in the order it earned them.
   *
   * Append-only and stamped with the turn, which is what makes the *news* a
   * diff rather than a sink threaded through nine mechanisms: what a command
   * awarded is the slice past the length it started at (`triumphsAwarded` in
   * `triumphs.ts`), and what a resolution awarded is the same slice taken across
   * every seat. `arriveOnTile` reports rather than announces; this is the same
   * idea for a thing that happens in ten places instead of two.
   *
   * It is also the **register of what has been earned**, which is how `once` and
   * `perAge` are enforced — see `awardTriumph`.
   */
  triumphs: EarnedTriumph[];
  /**
   * How many great people this empire has ever **recruited** — the ladder in
   * `renownThreshold` (`renown.ts`).
   *
   * `unitsBuilt`'s and `augursPurchased`' third sibling, and on the player
   * for their reason exactly: a recruited person is *consumed* by its act or its
   * work, so counting the ones standing around would price the fourth like the
   * first. `legacies.length` is deliberately not the counter either — a person
   * is recruited when it is picked and leaves its legacy only when it is spent,
   * and an empire holding an unspent great person has already paid for it.
   *
   * Nothing lowers it.
   */
  greatPeopleRecruited: number;
  /**
   * The names a filled renown bucket is offering, or the key is **absent** —
   * which it is for every player almost all of the time.
   *
   * Presence *is* "this empire owes the game a decision", which is
   * `pendingDiscovery`'s convention and is here for its reason: a player who has
   * never filled the bucket and one who has just spent an offer must serialise
   * identically. Blocks End Turn (`greatPersonBlocker`).
   *
   * Drawn once, at the moment the bucket filled, and spent by an ordinary
   * command naming an **index** — Entry XV's doctrine for the fifth time. An
   * offer rolled on sight would make the deal a function of when somebody looked
   * at a screen, and under simultaneous turns two seats look at different times.
   */
  greatPersonOffer?: GreatPersonOffer;
  /**
   * Every bead this empire has clacked onto the Abacus, **in the order they
   * were earned** (design ledger Entry VI, `docs/beads.md`).
   *
   * `Player.triumphs`' discipline one system up and for its reasons exactly:
   * append-only and turn-stamped, so what a command earned is the slice past
   * the length it started at and no seam had to grow a parameter to say so; and
   * it is the register of what this seat holds, which is what the threshold
   * counts. Nothing ever removes an entry — a bead once clacked is clacked.
   *
   * Contention between *seats* is settled elsewhere: `GameState.beads.claimed`
   * is the world's register, because almost every bead is a first-in-the-world.
   */
  beads: EarnedBead[];
  /**
   * Magister's Dice, held. **Uncapped** (user ruling, 2026-08-30), which
   * supersedes Entry XV's "cap 3 held": a fourth die is kept like the first
   * three, and a boon that pays one is `dice += n` with nothing to clamp.
   *
   * Nothing spends them yet — the seal they were designed for is Æra V's — so
   * this is a bank the game fills and never draws on, said out loud here rather
   * than left as a surprise.
   */
  dice: number;
  /**
   * Cities this empire **founded itself**, ever. The Founder's count.
   *
   * On the player rather than derived from the board, and that is the whole
   * point of the counter: `state.cities` cannot say who founded a town (a
   * capture rewrites `ownerId`, and `City.captured` is sticky the other way), so
   * "eight cities of your own" is a fact only a counter can keep. Nothing lowers
   * it — a city lost was still a city founded.
   */
  citiesFounded: number;
  /** Cities taken by force, ever. `citiesFounded`' twin. Nothing lowers it. */
  citiesCaptured: number;
  /**
   * Faith spent on augurs and prophets, ever — The Hierophant's count.
   *
   * A *spend* is not a thing on the board and `faithPool` is a bank that moves
   * both ways, so the only honest reading is a counter raised where the coin
   * leaves (`purchaseItemAt`).
   */
  faithOnHolyOrders: number;
  /** Gold banked from the Tithes project, ever. Raised in `payProject`. */
  tithesGold: number;
  /** Science banked from the Scholarship project, ever. `tithesGold`' twin. */
  scholarshipScience: number;
  /**
   * Yields this empire's caravans carried **during the current age** — the
   * Richest Roads' reckoning.
   *
   * The one counter that is **reset**, and it is reset in exactly one place
   * (`openBeadAge` in `beads.ts`) at the moment the world's age turns over,
   * because a reckoning of the age is a question about the age. A total that
   * never reset would hand every later reckoning to whoever led the first one.
   */
  routeYieldsThisAge: number;
  /** Great people called during the current age. `routeYieldsThisAge`' twin. */
  greatPeopleThisAge: number;
}

/**
 * One bead, earned. See `Player.beads`.
 *
 * `EarnedTriumph`'s shape one system up: **what**, **which class of card**,
 * **which family's rod it lands on**, and **when**. The name, the text and the
 * boon are the catalogue's business and history does not restate a table — but
 * the family is on the record rather than looked up, because the Abacus counts
 * rods and a card retuned from culture to science must not silently move a bead
 * an empire already owns.
 */
export interface EarnedBead {
  id: BeadCardId;
  kind: BeadKind;
  family: BeadFamily;
  /** `state.turn` it was earned on. What makes the news a diff. */
  turn: number;
}

/**
 * One bead claimed **by the world**, and who took it. See `GameState.beads`.
 *
 * `ContestedTriumph`'s twin, and keyed the same way for its reason: nearly every
 * bead is a first-in-the-world, and the pair `(id, age)` is the key because a
 * feat may be once per game (`age: 0`) or once per age of the world's clock.
 */
export interface BeadClaim {
  id: BeadCardId;
  age: number;
  playerId: number;
  turn: number;
}

/**
 * One card on the table. See `BeadTable.hands`.
 *
 * `faceUp` is the whole of Entry VI's drafting model: a card dealt before its
 * age opens is face down — it is *there*, it is in the seeded order, and nobody
 * may claim it — and the turn the first seat in the world reaches that age every
 * card in the hand turns over at once. A card dealt after the age has opened
 * arrives face up.
 */
export interface BeadCard {
  id: BeadCardId;
  faceUp: boolean;
}

/**
 * The Bead Race's whole world state (design ledger Entry VI).
 *
 * Five fields, and each of them is one sentence:
 *
 *   · `decks` — the shuffled order of each age's cards, drawn from `state.rng`
 *     **once, in `newGame`**, so a seed *is* a deal (Entry II's fairness: every
 *     seat sees the same cards in the same order). Cards are taken off the
 *     front; an empty deck is an age that has dealt everything it holds.
 *   · `hands` — what is on the table for each age, in deal order.
 *   · `claimed` — the world's register. **The** place contention is settled, so
 *     "the first seat by log and sweep order" is a property of the order things
 *     were applied in rather than of a check somebody could forget.
 *   · `streaks` — how many consecutive turns each seat has held each streak
 *     deed's count at or above its value. Reset to zero the turn it falls short.
 *   · `worldAge` — the world's clock, one clock for everybody: the highest age
 *     any real seat has reached. An age *opens* the turn this rises.
 *
 * Plain objects and arrays throughout, never a `Map` or a `Set`: every one of
 * them is iterated for an outcome, and an outcome that depends on iteration
 * order must depend on an order the state itself carries.
 */
export interface BeadTable {
  decks: Record<string, BeadCardId[]>;
  hands: Record<string, BeadCard[]>;
  claimed: BeadClaim[];
  streaks: Record<string, Record<string, number>>;
  worldAge: number;
}

/**
 * One Triumph, earned. See `Player.triumphs`.
 *
 * Three facts and no more: **what**, **when**, and — for the scopes that are
 * counted per era — **which age it was earned in**. Everything else a surface
 * could want is on the row (`triumphData.ts`), because a triumph's name and what
 * it paid are the table's business and history does not restate a table.
 */
export interface EarnedTriumph {
  id: TriumphId;
  /** `state.turn` it was earned on. What makes the news a diff. */
  turn: number;
  /**
   * The empire's age at the moment it was earned, on a `perAge` or `contested`
   * row and absent on the others.
   *
   * Absent rather than zero on a `once` row, so a save from a game with no
   * per-age triumphs in it serialises as small as it reads.
   */
  age?: number;
}

/**
 * The names a renown bucket dealt, in draw order.
 *
 * `DiscoveryOffer`'s shape minus the site — a great person arrives in the
 * capital, so there is no hex to carry — and `OrderOffer`'s rule: a pick is an
 * **index**, never an id, because an index can only ever name something the
 * player was actually dealt.
 */
export interface GreatPersonOffer {
  options: GreatPersonId[];
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
   * `unitAwaitsOrders` (`sim/units.ts`), which is the whole point: End Turn
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
  /**
   * **Which** great person this piece is, or the key is **absent** on every
   * ordinary unit — which is all of them but a handful in a whole game.
   *
   * Presence is the state, which is `path`'s, `fortifiedTurns`', `chargesLeft`'s,
   * `sleeping`'s and `timed`'s convention and is here for the sixth time for the
   * same reason: a warrior and Archimedes must serialise differently in kind.
   *
   * It is deliberately *not* how the rules ask "is this a great person" — that
   * is `UnitDef.greatWork`, a fact about the **type**, exactly as `consecrates`
   * is for the augur and `foundsCity` for the settler. This says *who*, which is
   * what the family verb and the legacy need: `greatPersonAct` reads the family
   * off it, and spending the piece pushes this id onto `Player.legacies`.
   *
   * A captured great person keeps it, exactly as a captured worker keeps its
   * charges — capture moves `ownerId` and touches nothing else about what the
   * piece *is*, so a stolen Imhotep leaves his legacy to his captor.
   *
   * **The renderer's fingerprint must learn it.** Piece visuals rebuild off a
   * hash of `(id, col, row, hp, ownerId)` (the trap in CLAUDE.md); a great
   * person that ought to look like Archimedes rather than like a settler is a
   * visual-affecting unit property, and the render pass adds it there.
   */
  person?: GreatPersonId;
  /**
   * The trade route this piece is **carrying**, or the key is **absent** on
   * every unit that is not on the road — which is all of them but a handful.
   *
   * Presence is the state, which is `path`'s, `fortifiedTurns`', `chargesLeft`'s,
   * `sleeping`'s, `timed`'s and `person`'s convention and is here for the
   * seventh time for the same reason: a trader idling at home and one that has
   * never been sent must serialise identically, or two states that are the same
   * game would not compare equal.
   *
   * **The route is the piece.** There is deliberately no `GameState.routes`
   * register: the caravan *is* the route, so a route ends when the trader dies
   * with no bookkeeping anywhere, a plundered route is a dead unit, and "how
   * many routes do I run" is a count of units rather than a list that could
   * disagree with the board. That is the one structural decision the design doc
   * left open, and it is settled this way because every other shape needs a rule
   * for what happens to the register when the piece is killed.
   *
   * It is a fact about the **piece** and not about the type: whether a unit *may*
   * carry one is `UnitDef.trades`, which is the same two-fields-two-questions
   * split `greatWork` and `person` make.
   */
  trade?: TradeRoute;
  /**
   * This empire never paid for this piece, so it pays no maintenance on it —
   * or the key is **absent**, which it is for every unit that was built, bought
   * or seated at the start.
   *
   * Presence is the state, which is `path`'s, `fortifiedTurns`', `chargesLeft`'s,
   * `sleeping`'s, `timed`'s, `person`'s and `trade`'s convention and is here for
   * the eighth time for the same reason: a warrior a city built and a warrior a
   * wonder handed over must serialise differently in kind rather than by a
   * `false`, or a game with no gifts in it would not compare equal to itself
   * before this field existed.
   *
   * **The register of who writes it**, and it is deliberately short — every
   * entry is "the game issued this, nobody bought it":
   *
   *   1. `captureUnit` — a piece taken in war, and a barbarian talked round by
   *      the Wolf-Mother's Pact (which goes through the same function). You did
   *      not raise it, so you do not keep it on your payroll;
   *   2. `realiseItem(…, { free: true })` — the windfall path, which is every
   *      Statecraft grant that hands over a piece (Levies, Camp Followers'
   *      stray) and reaches the roster through `payWindfallGrants`;
   *   3. `payCompletionGrants` — a **building's** gift: the Statue of Zeus'
   *      swordsman, Hagia Sophia's, and every `onComplete` unit after them;
   *   4. `settleGreatPersonChoice` — a great person, which is exempt by type
   *      anyway (no unlock tech) and is marked so the rule does not depend on
   *      that staying true;
   *   5. `claimDiscoveryAt` — a ruin's escort.
   *
   * A **completion** of a queued unit and a **purchase** deliberately do not
   * write it: those are pieces an empire paid for, and they go on the payroll
   * like everything else. That split is the whole reason `realiseItem` takes the
   * flag rather than deriving it — the one routine serves both.
   *
   * A captured piece keeps it, exactly as it keeps its charges and its
   * blessings: `captureUnit` sets it *because* changing hands is one of the
   * occasions, not as an exception to "capture touches nothing else".
   */
  freeUpkeep?: true;
  /**
   * What this empire's **law** was worth to this piece on the day it was made —
   * or the key is **absent**, which it is for every unit born under a council
   * that had stamped nothing.
   *
   * Presence is the state, which is `path`'s, `fortifiedTurns`', `chargesLeft`'s,
   * `sleeping`'s, `timed`'s, `person`'s, `trade`'s and `freeUpkeep`'s convention
   * and is here for the ninth time for the same reason: a warrior raised before
   * The Muster Roll and one raised after it must serialise differently in kind,
   * and a game with no such card in it must serialise exactly as it did before
   * this field existed.
   *
   * **Written in one place**, `createUnit`, from `cardUnitStamp` — so a
   * completion, a purchase, a wonder's grant, a ruin's escort and a great
   * person's arrival are all stamped by one line, exactly as they are all
   * charged by one line. Nothing ever rewrites it: the stamp is a fact about a
   * *moment*, so a card unslotted next year does not un-blood the levy it
   * raised, and a captured piece keeps its old empire's stamp the way it keeps
   * its charges.
   *
   * The two readings are `unitMaxHp` and `unitStampStrength` (`unitData.ts`),
   * which is where the field's docblock lives. It is deliberately **not** in the
   * piece fingerprint: nothing it changes is drawn.
   */
  stamp?: UnitStamp;
  /**
   * This piece has been told to seek out unexplored land on its own, or the
   * key is **absent** when it is under its own orders.
   *
   * Presence is the state — `path`'s convention, here for the tenth time and
   * for the same reason: a warrior that never ranged ahead and one called back
   * to the colours must serialise identically.
   *
   * What it means: the `marchExplorers` phase (`turn.ts`) aims the piece at
   * `exploreTarget` (`explore.ts`) whenever it stands without a path, and
   * deletes the key — reporting it (`TurnReport.exploreEnded`) — the turn
   * nothing within reach would show it anything new. Three things end it, and
   * they are the sleep flag's endings one field over: **any other accepted
   * order naming the unit** clears it in `applyCommand`'s one seam (never per
   * handler), `cancelOrder` is the plain "never mind", and the search running
   * dry ends it from inside the resolution. Only `setAutoExplore` writes it.
   *
   * **The renderer's fingerprint hashes it** (`signUnits`): an exploring piece
   * takes the routed caravan's wash — busy, not orderable — so presence
   * changes what is drawn on a piece that has not moved, which is
   * `Unit.trade`'s case exactly.
   */
  autoExplore?: true;
}

/**
 * A live trade route, as it sits on the caravan carrying it (`Unit.trade`).
 *
 * Four facts and no more: the two ends, when it lapses, and which way the piece
 * is walking. What the route *pays* is nowhere here — it is derived every turn
 * from the two cities as they stand (`explainRouteYield` in `routeYields.ts`), so a
 * destination that finishes a library raises the route the next turn and a
 * destination that is captured stops paying its old owner. A snapshot of the
 * buildings at send time would be a second ledger.
 */
export interface TradeRoute {
  /** The city the caravan set out from. **The city the route pays.** */
  from: number;
  /** The partner. Its buildings and people are what the route is worth. */
  to: number;
  /**
   * The turn this route stops paying — an **absolute** turn, read as
   * `state.turn < expiresTurn`, exactly as `TimedEffect.expiresTurn` is.
   * Nothing decrements it; the shuttle phase compares it, and only when the
   * caravan is standing at home.
   */
  expiresTurn: number;
  /**
   * True while the caravan is walking *toward* `to`, false while it is walking
   * home. Flipped by `marchTraders` the turn it arrives, which is what makes the
   * piece shuttle rather than teleport — and what makes a road get walked in
   * both directions.
   */
  outbound: boolean;
  /**
   * True when the caravan should start a fresh leg instead of idling the turn
   * its route lapses (the user's ruling: "add a button for auto-resend").
   *
   * Always present rather than optional, unlike the flags on `Unit` — it is
   * `hasAttacked`'s case one level in: every route either renews or does not,
   * which is a real state and not an absent one, and there is exactly one place
   * a route comes into existence (`startRouteAt`) so no creation path can leave
   * it out.
   */
  autoResend: boolean;
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

/**
 * Which "one a turn" a bought unit spends (`City.purchasedUnitTurns`).
 *
 * The user's widening of the one-unit-a-turn rule (2026-09-02): *faith buying,
 * buying a civilian unit, and buying a military unit all counted separately*. So
 * the bucket is a pair of questions asked in order — **which bank paid**, and
 * then **is the piece a combatant** — because the faith bank is the one a town
 * calls an augur or a prophet out of and that call has never competed with a
 * garrison for the same afternoon.
 *
 * Read off `UnitDef` through `isCivilian` rather than off a name, exactly as
 * every other class question in this codebase is: nothing here compares a type
 * against `"settler"`, so a caravan is bought out of the civilian bucket for
 * being a non-combatant and not for being called a trader.
 *
 * Declared here beside `City` rather than in `purchase.ts` because the field is
 * the city's; `purchase.ts` imports this module and an import the other way
 * would be the runtime cycle `moduleCycles.test.ts` exists to catch.
 */
export type UnitPurchaseBucket = 'militaryGold' | 'civilianGold' | 'faith';

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
   * maximum under its new owner. So `hp` is always in `[1, cityMaxHp(city)]`.
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
  /**
   * True while this town is a **puppet** — taken by force and not yet annexed
   * (`docs/war-diplomacy.md`, 9b; Civ V's rule).
   *
   * The key is **absent** for every town that is not one, which is every town
   * anybody founded and every conquest its captor has annexed: presence is the
   * state, so a game with no puppets in it serialises exactly as one from
   * before the field existed. `captureCity` writes it and `annexCity` deletes
   * it, and those are the only two.
   *
   * It is a second field beside `captured` rather than a reading of it because
   * they say different things and both are needed: `captured` is *sticky and
   * forever* — a town that has changed hands is a seized town for the rest of
   * the game, including for the empire that founded it and won it back — while
   * this is a **standing arrangement** the captor may end at any time and never
   * resume. What a puppet is worth is two readings and no more: it asks its
   * captor less writ (`cityAuthorityCost`) and its citizens ask for less
   * contentment (`explainHappiness`), both off `rules.war`.
   *
   * A puppet's production queue is deliberately **not** refused by the reducer.
   * The town is uncontrollable from the *interface* (the city panel locks it),
   * because under the ruling a puppet builds what the seat's own appraisal
   * picks — issued as ordinary logged commands by whichever client drives the
   * seat — and a reducer that refused them would be refusing the mechanism.
   */
  puppet?: true;
  /**
   * True once this town has been somebody's **seat of government** — written at
   * the moment it is taken from an empire whose capital it was.
   *
   * The one thing about a captured capital that cannot be recomputed
   * afterwards, and it is here for `captured`'s exact reason: `capitalCityOf`
   * is derived and prefers a town its owner actually *founded*, so the instant
   * a palace changes hands nothing on the board says it was ever one. Razing
   * reads it — a capital is never razeable (the orchestrator's default, ruled
   * 2026-09-03) — and nothing else does.
   *
   * Absent on every ordinary town, presence-is-the-state, and never cleared: a
   * palace pulled down is still a palace that stood.
   */
  wasCapital?: true;
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
  /**
   * True once a caravan has ever set out from this town or arrived at it, or the
   * key is **absent** on a town no route has touched.
   *
   * **History, and it is never cleared** — the same kind of fact `captured` is,
   * and stored for the same reason: a post is a thing that *happened* to a
   * place, and by the turn after the route lapses there is nothing on the board
   * left to derive it from. A captured town keeps its post, exactly as it keeps
   * its granary.
   *
   * What it buys is **range**: each post among a proposed route's two endpoints
   * is worth `rules.trade.postRangeTurns` more turns of march
   * (`routeStartable`), which is the user's ruling — the first caravan to a
   * town is the expensive one and every one after it reaches further. Nothing
   * else reads it.
   */
  tradingPost?: boolean;
  /**
   * The turn this town last bought a unit **of each class**, or the key is
   * **absent** on a town that never has (user, 2026-08-28 playtest: "cities can
   * only purchase a single unit per turn"; widened 2026-09-02: "cities should be
   * able to only buy one unit of each *type* — faith buying, buying a civilian
   * unit, and buying a military unit all counted separately").
   *
   * One record with one stamp per `UnitPurchaseBucket` rather than three fields,
   * because the rule is one rule asked of three buckets: `purchaseError` looks up
   * the bucket the thing being bought falls in and `purchaseItemAt` writes the
   * same one, so a fourth class is a member of that union and nothing else.
   *
   * Each entry is an **absolute** turn compared against `state.turn`, never a
   * countdown — `TimedEffect`'s rule and `SlottedOrder.sealedUntil`'s, applied to
   * the shortest-lived fact in the game. The whole reading is
   * `city.purchasedUnitTurns?.[bucket] === state.turn`, so nothing decrements it,
   * no phase clears it and the entry is *already* meaningless the moment the turn
   * rolls over. That is what makes the rule safe under simultaneous turns: there
   * is no moment in the pipeline where it has to have been reset.
   *
   * **Units only.** A treasury that can turn coin into a garrison as fast as it
   * can click is the thing the note is about; a town that buys a granary and a
   * library on the same afternoon has bought two things it then has to feed.
   * Written by `purchaseItemAt` and read by `purchaseError`, and by nothing
   * else.
   */
  purchasedUnitTurns?: Partial<Record<UnitPurchaseBucket, number>>;
  /**
   * How many of this town's citizens follow each religion, or the key is
   * **absent** on a town nobody has preached to — which is every town for most
   * of a game.
   *
   * **Civ V's citizen model, and the whole of "a city follows a religion"**
   * (user, 2026-08-27): a religion does not take a town, it takes people in it
   * one at a time, and the town follows the one more than half its citizens
   * do (`cityReligion`). Everything else — the banner, the founder's trickle,
   * what a follower belief pays — is derived from that one count.
   *
   * The rest of the population follows nothing, and that is a *derivation*
   * rather than a stored figure: `population` minus the sum here. A second
   * count of the unconverted would be a second answer, and the first thing it
   * would do is disagree the turn a citizen was born.
   *
   * Keyed by `ReligionId`, which is a number, so a serialised town reads
   * `{"0": 3}`; nothing iterates this object for an outcome — every sweep walks
   * `GameState.religions` (founding order) and looks a count up by id, which is
   * the determinism rule read for an object.
   *
   * A **captured** town keeps its followers, exactly as it keeps its granary and
   * its blessings: a conquest changes whose town it is, not what the people in
   * it believe.
   */
  followers?: Partial<Record<ReligionId, number>>;
  /**
   * Faith banked toward the *next* convert, per religion, or the key is
   * **absent** — which it is for every town nothing is pressing on.
   *
   * The one thing about the tide that has to be stored: pressure is recomputed
   * from the board every turn (`explainPressure`), but *how close the next
   * citizen is to turning* is history, and a game that recomputed it would
   * convert a town the instant a holy site went up or never at all. Every
   * `rules.religion.pressurePerConvert` in here buys one citizen and is spent;
   * the remainder carries, exactly as a food basket's does.
   *
   * **Two things fill it and they share one converter** (`bankPressure`,
   * `religion.ts`): the `spreadReligion` phase, and a proclamation's lump paid
   * the instant a prophet or an augur speaks (`pressLump`).
   */
  pressureBank?: Partial<Record<ReligionId, number>>;
  /**
   * How many of this town's citizens have left the fields for each trade
   * (ledger Entry XLVIII), zero for every family in a town with no guild — which
   * is every town for the first stretch of a game.
   *
   * **Written in full rather than by presence**, which is the one place this
   * town breaks with `followers` and `pressureBank` beside it, and the reason is
   * that a specialist count is *arithmetic* and not an event: `population −
   * specialists` is the number of citizens `assignCitizens` seats on hexes, and
   * it is asked of every city on every pass over the map. Four zeros in a
   * serialised town are cheaper than an optional lookup in the innermost loop
   * the simulation has, and a field that is always there can never be the reason
   * a sweep forgot to ask.
   *
   * A **captured** town keeps its guilds, exactly as it keeps its granary and
   * its followers: a conquest changes whose town it is, not what its people do
   * for a living.
   */
  specialists: Record<SpecialistFamily, number>;
  /**
   * Renown banked toward this town's **next** specialist — the guild bar.
   *
   * `foodBasket`'s shape one currency over, and it carries for the same reason:
   * the threshold is spent and the remainder stays, so a town does not lose the
   * overflow it earned on the turn a guild formed. It is filled by the `guilds`
   * phase alone (`guilds.ts`) and emptied to zero by exactly one other thing —
   * `dismissSpecialist`, where the restart *is* the price of the verb.
   *
   * The empire's renown pool is untouched by all of this: the bar is a second
   * reading of the same trickle, never a diversion of it. A library pays its
   * owner one renown toward a great person **and** one into the bar of the town
   * it stands in.
   */
  guildBasket: number;
  /**
   * The patron this town's cathedral was dedicated to, or the key is **absent**
   * — which it is for every town that has not finished one, which is most of
   * them for most of a game (design ledger Entry LV).
   *
   * **Presence is the state**, `tradingPost`'s rule and `Unit.trade`'s: there is
   * no "unconsecrated" value and nothing to clear. It is written in exactly one
   * place (`realiseItem`, when a completed row carries `BuildingDef.consecrated`)
   * and read in exactly one (`liveCityEffects`' consecration source), so the
   * dedication and what it pays cannot drift.
   *
   * It is **rolled, not chosen** — one draw off `state.rng` at the moment the
   * stones are topped out — and it therefore replays: a save is `{config, log}`,
   * the same commands reach the same completion in the same order, and the
   * generator is at the same point when they do.
   *
   * A **captured** town keeps its dedication, exactly as it keeps its granary,
   * its followers and its blessings: a conquest changes whose town it is, not
   * which saint the masons carved over the door. What the patron pays therefore
   * follows the stones, which is the wonders framework's rule one scale down.
   */
  consecration?: ConsecrationId;
}

/**
 * A religion's id: its **index in `GameState.religions`**, which is founding
 * order.
 *
 * A number rather than a string for the reason `City.id` is one — it is handed
 * out by the register that holds the thing — and founding order rather than a
 * counter because the register is an array and the array *is* the order. Every
 * tie in the whole subsystem ("the religion with the fewest followers, ties by
 * religion id order") is broken by it, so it has to be an order the state
 * carries and not one an object's keys happen to produce.
 */
export type ReligionId = number;

/**
 * One religion, founded by one empire's prophet, followed by whoever the tide
 * reaches.
 *
 * **Identity is the pantheon**: the beliefs the founder had consecrated at the
 * moment of founding are copied here, and their axes are what the generated
 * name is made of. They are a *snapshot* rather than a live reading of
 * `Player.pantheon`, because a religion outlives the moment — an empire that
 * consecrates a fourth god afterwards has not renamed its faith.
 *
 * `follower` and `enhancer` are drafted beliefs from two pools of their own
 * (`data/religion.json`), written in the ordinary card vocabulary and read by
 * the ordinary evaluator. Who they pay is the whole design (user, 2026-08-28,
 * correcting the 08-27 reading): a **follower** belief applies *city-locally*,
 * in every town that follows this faith and to whoever owns that town, and an
 * **enhancer** bends the tide for the empire that holds the **holy city**.
 *
 * `founderId` is **history and a fallback, not the payee.** Who a religion pays
 * is `religionFounder` (`statecraft.ts`) — the owner of the city whose
 * territory holds `holySite`, so a captured holy city moves the trickle and the
 * enhancers with it. The founding empire's *pantheon* is untouched by any of
 * that: a pantheon is native to the empire that consecrated it (the 2026-08-26
 * ruling) and is read off `Player.pantheon`, never off this row.
 */
export interface Religion {
  id: ReligionId;
  /**
   * The empire whose prophet founded it. Never changes; nothing may found
   * twice — and it is what `religionFounder` falls back to when the stones are
   * gone (pillaged, or standing on ground nobody owns).
   */
  founderId: number;
  /** Generated at founding from the pantheon's axes; renamable, pure prose. */
  name: string;
  /** The founder's gods at the moment of founding. Identity, never redrafted. */
  pantheon: BeliefId[];
  /** Drafted from the follower pool. Applies in every city that follows. */
  follower: BeliefId[];
  /**
   * Drafted from the enhancer pool at Theology. Bends the tide, and pays the
   * holy city's owner.
   *
   * A **list**, because `pools.enhancerSlots` is two: the scalar this field
   * used to be silently overwrote the first pick the moment a prophet spent a
   * second charge on the pool. `follower`'s shape, for `follower`'s reason.
   */
  enhancer: BeliefId[];
  foundedTurn: number;
  /**
   * The hex the **first** holy site went up on, or absent for a religion
   * founded before schema 29.
   *
   * The anchor of "who does this faith pay": the holy city is the town whose
   * territory holds this hex, and `religionFounder` reads it off the board
   * every time rather than storing an owner that a conquest would make stale.
   * A later site is an ordinary improvement and never moves this.
   */
  holySite?: { col: number; row: number };
}

/**
 * One religion by id — which is its index, so this is a bounds check with a
 * name. `playerById`'s twin one register over.
 */
export function religionById(state: GameState, id: ReligionId): Religion | undefined {
  return state.religions[id];
}

/**
 * The religion this empire **founded**, or `undefined`.
 *
 * **The** reading of "my religion", and the whole of "one religion per empire,
 * ever" (user, 2026-08-27): the register is swept for a row naming this seat,
 * so there is no flag on the player that could disagree with it and no way to
 * hold two. A walk of a list that never exceeds a handful of rows.
 */
export function foundedReligion(state: GameState, playerId: number): Religion | undefined {
  for (const religion of state.religions) {
    if (religion.founderId === playerId) return religion;
  }
  return undefined;
}

/**
 * Which religion more than half of this town's citizens follow, or `null`.
 *
 * **The** reading, and it is derived rather than stored (`cityReligion` is asked
 * of a town, never written to it) — the `barbarianRoles` discipline applied to a
 * banner. A town split three ways follows nothing, which is what "the old gods"
 * means: below a majority the place has a mosque, a shrine and an argument.
 *
 * `state.religions` order is not needed here because a strict majority can only
 * ever be one religion, so there is no tie to break.
 */
export function cityReligion(city: City): ReligionId | null {
  const followers = city.followers;
  if (!followers) return null;
  const half = city.population / 2;
  for (const [key, count] of Object.entries(followers)) {
    if ((count ?? 0) > half) return Number(key);
  }
  return null;
}

/** How many of this town's citizens follow one religion. Zero when none do. */
export function followerCount(city: City, religion: ReligionId): number {
  return city.followers?.[religion] ?? 0;
}

/** Citizens of this town who follow nothing at all. Never negative. */
export function unconvertedCitizens(city: City): number {
  let followed = 0;
  for (const count of Object.values(city.followers ?? {})) followed += count ?? 0;
  return Math.max(0, city.population - followed);
}

/**
 * Moves **one** citizen onto a religion, taking them from the unconverted first
 * and otherwise from the religion with the fewest followers.
 *
 * The order is the ruling (user, 2026-08-27) and it is what makes a young faith
 * spread through a town before it starts prising people off an older one. The
 * tie among equally small religions is broken by **id order**, which is founding
 * order — an order the state carries (see `ReligionId`).
 *
 * `order` is the world's religions in founding order; the caller hands it in
 * because it is the state's array and this function may not reach for the state.
 * Answers whether anybody actually moved: a town every one of whose citizens
 * already follows this religion has nobody left to give.
 */
export function convertCitizen(
  city: City,
  to: ReligionId,
  order: readonly ReligionId[],
): boolean {
  const followers = city.followers ?? {};
  if (unconvertedCitizens(city) <= 0) {
    let from: ReligionId | null = null;
    let fewest = 0;
    for (const id of order) {
      if (id === to) continue;
      const held = followers[id] ?? 0;
      if (held <= 0) continue;
      if (from === null || held < fewest) {
        from = id;
        fewest = held;
      }
    }
    if (from === null) return false;
    const left = (followers[from] ?? 0) - 1;
    if (left <= 0) delete followers[from];
    else followers[from] = left;
  }
  followers[to] = (followers[to] ?? 0) + 1;
  city.followers = followers;
  return true;
}

/**
 * Takes one citizen **off one named religion** and leaves them following
 * nothing. Answers whether anybody actually stopped.
 *
 * `convertCitizen`'s inverse, and the Purge's half of it (`purgePressure`,
 * `religion.ts`, ledger Entry LVIII): an inquisitor unmakes belief rather than
 * preaching, so the citizen goes to *nobody* and no second faith is chosen here.
 * That is what keeps the Purge and the Preaching two verbs instead of one verb
 * with a sign.
 *
 * It is here rather than in `religion.ts` because `City.followers` has exactly
 * three writers and they live together — this, `convertCitizen` and
 * `shrinkFollowers` — which is the same discipline `captureUnit` keeps for
 * `Unit.ownerId`. The key is deleted when a congregation empties and the map
 * itself when the last key goes, so a town nobody follows serialises exactly
 * like one nobody ever preached to.
 */
export function unconvertCitizen(city: City, from: ReligionId): boolean {
  const followers = city.followers;
  if (!followers) return false;
  const held = followers[from] ?? 0;
  if (held <= 0) return false;
  const left = held - 1;
  if (left <= 0) delete followers[from];
  else followers[from] = left;
  if (Object.keys(followers).length === 0) delete city.followers;
  return true;
}

/**
 * Takes one citizen away from the religion with the **most** followers — what a
 * town losing a mouth does to its congregations.
 *
 * The mirror of `convertCitizen`'s rule and deliberately not its inverse: a
 * famine takes from the largest congregation because that is where most of the
 * town is, and taking from the smallest would let a starving city quietly purge
 * a rival faith. Ties by id order, which is founding order.
 *
 * The key is **deleted** when a congregation empties, so a town nobody follows
 * any more serialises exactly like one nobody ever preached to.
 */
export function shrinkFollowers(city: City, order: readonly ReligionId[]): void {
  if (unconvertedCitizens(city) > 0) return;
  const followers = city.followers;
  if (!followers) return;
  let largest: ReligionId | null = null;
  let most = 0;
  for (const id of order) {
    const held = followers[id] ?? 0;
    if (held <= 0) continue;
    if (largest === null || held > most) {
      largest = id;
      most = held;
    }
  }
  if (largest === null) return;
  const left = most - 1;
  if (left <= 0) delete followers[largest];
  else followers[largest] = left;
  if (Object.keys(followers).length === 0) delete city.followers;
}

/**
 * One wonder, claimed. See `GameState.wonders`.
 *
 * Four facts and no more: **what** was built, **where** it stands, **who** built
 * it and **when**. Everything else a surface could want — the wonder's name, its
 * yields, its effects — is on the building row, and everything about who holds
 * it *now* is on the city. This is the history, and history does not change.
 *
 * `{ cityId, playerId, building }` is deliberately the shape a future `triumphs`
 * evaluator reads to pay renown on a completion (`docs/great-people.md`): the
 * seam is the report `realiseItem` already returns, so great people join by
 * reading it rather than by growing a hook inside the completion routine.
 */
export interface WonderClaim {
  building: BuildingId;
  /** The city it stands in, at the moment it was finished. */
  cityId: number;
  /** The empire that finished it. Not necessarily the one that holds it now. */
  playerId: number;
  /** `state.turn` when it completed. */
  turn: number;
}

/**
 * One contested Triumph, claimed. See `GameState.contested`.
 *
 * `WonderClaim`'s shape one register over, and for its reason: **what** was
 * claimed, **who** claimed it, and **when** — plus the `age` it was claimed in,
 * because a contested row is contested once per era and the pair `(id, age)` is
 * the key. This is history, and history does not change.
 */
export interface ContestedTriumph {
  id: TriumphId;
  /** The empire that got there first. */
  playerId: number;
  /** The age it was claimed in. The other half of the uniqueness key. */
  age: number;
  /** `state.turn` when it was claimed. */
  turn: number;
}

/**
 * A feed record with every family at nothing — the shape `Player.renownByFamily`
 * is created with, in **one place**, so that every seat's record serialises with
 * the same five keys in the same order.
 */
export function emptyRenownFeed(): Record<Family, number> {
  const feed = {} as Record<Family, number>;
  for (const family of FAMILIES) feed[family] = 0;
  return feed;
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
   * Every wonder that has been built, **in the order they were claimed**.
   *
   * The whole of "one per world": there is no flag on a building, no counter on
   * a player and no second register anywhere — a wonder is claimed iff there is
   * a row here naming it, and `buildError` (`tech.ts`) refuses the second empire
   * to reach for it in a sentence read off this row. Written in exactly one
   * place, `claimWonder`, called from exactly one place, `realiseItem`
   * (`cities.ts`) — the same discipline `captureUnit` keeps for a change of
   * ownership.
   *
   * An **array in claim order** rather than a `Record<BuildingId, …>`, and for
   * `GameState.camps`' stated reason: an outcome that depends on iteration
   * order must depend on an order the state itself carries, and "the order they
   * were finished" is a fact a chronicle wants anyway. It is short — twenty-odd
   * rows in a whole game — so the linear lookup below costs nothing.
   *
   * It is deliberately a record of the *claim* and not of where the wonder
   * stands today. A captured wonder pays its captor (the effects are read off
   * the holding city's `buildings`, like every other building), while this row
   * keeps saying who first raised it and when — which is the shape the future
   * `triumphs` evaluator reads to pay renown (`docs/great-people.md`).
   */
  wonders: WonderClaim[];
  /**
   * Every great person any empire has recruited, **in the order they were
   * picked** — the world's consumed roster.
   *
   * `GameState.wonders`' twin one table over, and the whole of "only one empire
   * ever has Archimedes": a name is spent iff there is an entry here, the draw
   * subtracts this list from the age's roster, and `greatPersonChoiceError`
   * refuses the *second* pick of a name a faster seat took in the same window.
   * Written in exactly one place, `settleGreatPersonChoice` (`greatPeople.ts`).
   *
   * An **array in pick order** rather than a set, for `camps`' stated reason: an
   * outcome that depends on iteration order must depend on an order the state
   * itself carries. It is short — a dozen rows in a whole game — so the linear
   * lookup costs nothing.
   *
   * It deliberately does **not** record who took each name. Who holds a legacy
   * is `Player.legacies`, and who is holding an unspent piece is the board; a
   * third answer here would be a third thing to keep in step.
   */
  recruited: GreatPersonId[];
  /**
   * The contested Triumphs, and who took each — **in claim order**.
   *
   * A contested triumph is the world's, not a seat's (Entry V's feats): the
   * first empire into an era earns First Light and nobody else ever can, in that
   * era. This is that register, and it is the *only* place contention is
   * settled — `awardTriumph` refuses a row whose `(id, age)` is already here, so
   * "first by log and sweep order" is a property of the order commands were
   * applied in rather than of a check somebody could forget to run.
   *
   * An array rather than a `Record<TriumphId, playerId>` because the key is a
   * *pair* (a contested row is claimed once per age) and because claim order is
   * a fact a chronicle wants anyway — `GameState.wonders`' argument exactly.
   */
  contested: ContestedTriumph[];
  /**
   * Every religion that has been founded, **in founding order** — which is also
   * what a `ReligionId` is.
   *
   * `GameState.wonders`' twin one system over, and the register in the same
   * sense: a religion exists iff there is a row here, an empire has founded one
   * iff a row names it, and how many the world may hold at all
   * (`rules.religion.maxReligions`, two thirds of the real seats rounded up) is
   * a count of this array. Written in exactly one place, `foundReligion`
   * (`religion.ts`), from exactly one verb.
   *
   * An **array in founding order** rather than a record, for `camps`' stated
   * reason: every tie in the spread ("the religion with the fewest followers,
   * ties by id") is broken by an order, and it has to be an order the state
   * itself carries.
   */
  religions: Religion[];
  /**
   * Every live war, one row per pair, in declaration order
   * (`docs/war-diplomacy.md`, section 1).
   *
   * `GameState.wonders`' twin one system over and the register in the same
   * sense: two empires are at war iff there is a row here naming them, and
   * every gate in the simulation — the combat planner, the raid, the border —
   * asks one reader (`atWar`, `wars.ts`) rather than keeping an opinion. The
   * wild is **never** in it; see that module's docblock for why a barbarian
   * needs no row to fight.
   *
   * An **array in declaration order** rather than a record keyed by pair, for
   * `camps`' stated reason: an outcome that depends on iteration order must
   * depend on an order the state itself carries. It is short — a handful of
   * rows in a whole game — so the linear lookup costs nothing.
   */
  wars: WarState[];
  /**
   * Every truce still standing: this pair may not go to war again until the
   * turn named on the row.
   *
   * `wars`' opposite number and a separate array for the plainest reason — a
   * truce exists exactly when a war does not, so one row could never carry
   * both. The expiry is **absolute** and nothing ticks it (the timed-effect
   * rule); `pruneTruces` is a broom.
   */
  truces: Truce[];
  /**
   * The Bead Race — the decks, the hands, the world's register and its clock.
   * See `BeadTable`, and design ledger Entry VI for why there is one victory
   * condition rather than four.
   */
  beads: BeadTable;
  /**
   * The winner, once there is one; `null` while the game is live.
   *
   * **One field, two ways to reach it** (Entry VI.3): the last empire standing
   * (`updateElimination`, `combat.ts`) and the first empire to
   * `BEAD_RULES.threshold` beads (the `beads` phase). Whichever comes first
   * writes it, and neither ever clears a winner the other named — a game that
   * has been won stays won.
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
      // The persona, on exactly the same terms: written only when it is named,
      // so a roster from before personas existed normalises byte-identically.
      if (spec.persona !== undefined) player.persona = spec.persona;
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
 * A fresh Bead Race: both decks drawn and shuffled, both hands empty, nothing
 * claimed.
 *
 * **The one place a deck is ordered.** It is drawn here, in `newGame`, rather
 * than when an age opens, for the doctrine `discoveries.ts` states and every
 * offer generator obeys: an order rolled later would make the deal a function
 * of *when* somebody reached an age, and under simultaneous turns two seats
 * reach it in the same window. Rolled once from the config's own generator, a
 * seed **is** a deal — which is also Entry II's fairness rule, since every seat
 * looks at the same table.
 *
 * A deck is **two halves shuffled together**: the age's endeavours and quests,
 * which are the same in every game (`beadDeckFor`), and **four reckonings, one
 * per family, drawn from the pool of eight** (`drawAgeReckonings`). A reckoning
 * is an ordinary card in every respect that matters here — shuffled in, dealt
 * one a turn, turned face up when its age opens — and differs only in when it
 * resolves: at the *next* age's opening, across every seat at once.
 *
 * The order of the two calls per age is the rule, not a habit: the reckonings
 * are drawn first and the combined list is shuffled second, so the generator is
 * consumed in one fixed sequence and a replay deals the same table. Ages are
 * walked in `BEAD_DECK_AGES` order for the same reason. `beadDeckFor` has
 * already dropped every dormant card, so nothing unreachable is ever dealt into
 * a hand somebody has to read.
 */
function newBeadTable(rng: Rng): BeadTable {
  const decks: Record<string, BeadCardId[]> = {};
  const hands: Record<string, BeadCard[]> = {};
  for (const age of BEAD_DECK_AGES) {
    const reckonings = drawAgeReckonings(rng);
    decks[String(age)] = shuffle(rng, [...beadDeckFor(age), ...reckonings]);
    hands[String(age)] = [];
  }
  // The world begins in its first age, whatever the tree's opening technologies
  // are: `worldAge` is the *clock*, and a clock that started at the highest age
  // anybody happened to hold would open an age before anybody had entered it.
  return { decks, hands, claimed: [], streaks: {}, worldAge: 1 };
}

/**
 * Builds the initial state. Deterministic in `config` alone: the same config
 * always produces a byte-identical state.
 */
export function newGame(config: GameConfig): GameState {
  const normalized = normalizeConfig(config);
  validateConfig(normalized);

  const map = generateMap(normalized.seed, normalized.sizeName, normalized.mapgenOverrides);
  // Named before the state is built, because the two decks are shuffled off it
  // (see `newBeadTable`) and the state literal below cannot refer to itself.
  const rng = deriveGameplayRng(normalized.seed);
  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    turn: RULES.game.startingTurn,
    rng,
    nextEntityId: RULES.game.firstEntityId,
    players: normalized.players.map((spec, index) => ({
      id: index,
      name: spec.name,
      color: spec.color,
      // Spread rather than assigned, so a seat with no charge has no key — the
      // same shape `normalizeConfig` just produced, and the reason a state from
      // a charge-less config serialises identically to one from before the field.
      ...(spec.charge === undefined ? {} : { charge: spec.charge }),
      ...(spec.persona === undefined ? {} : { persona: spec.persona }),
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
      // Presence is the state (see the field's docblock): nobody has built a
      // settler or a worker yet, so the empty object is the opening kit, same
      // as a fresh `researchQueue`-less player.
      unitsBuilt: {},
      tilesPurchased: 0,
      campsCleared: 0,
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
      prophetsPurchased: 0,
      renownPool: 0,
      // Fresh every time rather than a shared literal, for `techsResearched`'s
      // reason exactly: a player whose libraries feed the scholars must not
      // write that into everybody else's history.
      renownByFamily: emptyRenownFeed(),
      legacies: [],
      triumphs: [],
      greatPeopleRecruited: 0,
      // Fresh every time rather than a shared literal, for `techsResearched`'s
      // reason: an empire that clacks a bead must not write it onto every rod
      // in the world.
      beads: [],
      // Every real seat opens the game with the rules' starting dice (user,
      // 2026-08-30); the wild's stays zero below — it rolls nothing.
      dice: BEAD_RULES.startingDice,
      citiesFounded: 0,
      citiesCaptured: 0,
      faithOnHolyOrders: 0,
      tithesGold: 0,
      scholarshipScience: 0,
      routeYieldsThisAge: 0,
      greatPeopleThisAge: 0,
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
    // Nothing has been built yet, which is what an empty claim register means.
    wonders: [],
    // Nobody has been recruited and nothing has been claimed, which is what two
    // empty registers mean.
    recruited: [],
    contested: [],
    // Nobody has founded anything, which is what an empty register means.
    religions: [],
    // Nobody is at war and nobody owes anybody peace. Two empty registers, and
    // a world that never fights serialises with both of them empty forever.
    wars: [],
    truces: [],
    // **The deal is the seed.** Both decks are shuffled here, before a single
    // piece is placed, so that a config alone determines every card and the
    // order it comes off — Entry II's fairness, and the reason no generator ever
    // draws a bead card on sight (see `beads.ts`).
    beads: newBeadTable(rng),
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
    unitsBuilt: {},
    tilesPurchased: 0,
    campsCleared: 0,
    eliminated: false,
    barbarian: true,
    // A chiefdom the wild will never leave. Present so that every reader may
    // index a seat without asking which kind it is; filled by nothing, because
    // `runStatecraft` skips the wild the way `advanceResearch` does.
    statecraft: newPlayerStatecraft(),
    pantheon: newPlayerPantheon(),
    augursPurchased: 0,
    prophetsPurchased: 0,
    // Present so every reader may index a seat without asking which kind it is,
    // and filled by nothing: the renown phase skips the wild the way
    // `advanceResearch` does. The wild has no screen to be offered a name on.
    renownPool: 0,
    renownByFamily: emptyRenownFeed(),
    legacies: [],
    triumphs: [],
    greatPeopleRecruited: 0,
    // Present so every reader may index a seat without asking which kind it is,
    // and filled by nothing: the `beads` phase skips the wild the way the renown
    // phase does. The wild has no Abacus and nothing to win.
    beads: [],
    dice: 0,
    citiesFounded: 0,
    citiesCaptured: 0,
    faithOnHolyOrders: 0,
    tithesGold: 0,
    scholarshipScience: 0,
    routeYieldsThisAge: 0,
    greatPeopleThisAge: 0,
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
  person?: GreatPersonId,
): Unit {
  const def = unitDef(type);
  // **The stamp is decided before the piece exists**, because the maximum it is
  // born at is the roster's plus its own (`unitMaxHp`) — a warrior minted at the
  // sheet's 100 and stamped to 110 a line later would be a veteran who starts
  // wounded. The Muster Roll, Drums of War; see `cardUnitStamp`, the one reader
  // of the shape, and `Unit.stamp`, where presence is the state.
  const stamp = cardUnitStamp(state, ownerId);
  const stamped = Object.keys(stamp).length > 0;
  const unit: Unit = {
    id: allocateEntityId(state),
    ownerId,
    type,
    col,
    row,
    hp: stamped ? unitMaxHp({ type, stamp }) : def.maxHp,
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
  // The birth hex travels with the question, because a card may ask *which town
  // raised this piece* — Cuius Regio's augurs are charged by the faith of the
  // city they were trained in. It is the hex and not a city id: `createUnit` has
  // never known about towns, and the one reader resolves the town from the hex
  // (`cardExtraCharges`), so a piece born in the wild simply admits no scoped
  // line.
  if (def.charges !== undefined) {
    unit.chargesLeft = Math.max(
      1,
      def.charges + cardExtraCharges(state, ownerId, type, { col, row }),
    );
  }
  // Written **here**, after the literal and only when a caller named one, for
  // `chargesLeft`'s reason exactly: every field of a `Unit` is written in one
  // place, which is what keeps the serialised key order stable, and an ordinary
  // warrior's shape is byte-for-byte what it was before great people existed.
  // Exactly one caller passes it — `settleGreatPersonChoice` (`greatPeople.ts`).
  if (person !== undefined) unit.person = person;
  // Written after the literal and only when the council had stamped something,
  // for `chargesLeft`' reason exactly: a game with no such card in it serialises
  // byte-for-byte as it did before this field existed.
  if (stamped) unit.stamp = stamp;
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
 *   1. a melee blow that takes a hex holding only civilians — resolved as an advance, so the hand-over is `arriveOnTile`'s (`applyCombat` — the rule players have
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
 *
 * **A trader never reaches here** (the trade pass). A laden caravan caught by a
 * soldier is *plundered* — destroyed, and its cargo paid to the killer's nearest
 * city — rather than taken, so both call sites above ask `trades` first and
 * neither this function nor its rules learnt a thing about routes. That is the
 * shape a fourth occasion should copy: the exception belongs to the occasion,
 * never to the change of hands.
 */
export function captureUnit(state: GameState, unit: Unit, ownerId: number): void {
  const before = unit.ownerId;
  unit.ownerId = ownerId;
  unit.movesLeft = 0;
  delete unit.path;
  breakFortify(unit);
  wakeUnit(unit);
  // **Off the payroll, for ever** (the maintenance ruling, 2026-08-28). A piece
  // that changed hands was never paid for by the empire holding it, so it costs
  // that empire nothing to keep — and the mark stays if it changes hands again,
  // because it was never bought by anybody who has it now. Written here for the
  // reason everything else in this function is written here: there is exactly
  // one place that knows a unit has changed owner, and a maintenance rule that
  // asked each *occasion* to remember would be a rule the fourth occasion forgets.
  unit.freeUpkeep = true;
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
    // Written in full — see `City.specialists`. A fresh object every time, for
    // the reason every table accessor in this game builds one: a shared record
    // summed into by one town would give every other town its guilds.
    specialists: newCitySpecialists(),
    guildBasket: 0,
  };
  state.cities.push(city);
  return city;
}

/** A town with nobody in the trades yet. The one place the zeros are written. */
export function newCitySpecialists(): Record<SpecialistFamily, number> {
  const counts = {} as Record<SpecialistFamily, number>;
  for (const family of SPECIALIST_FAMILIES) counts[family] = 0;
  return counts;
}

/**
 * The claim on a wonder, or `undefined` while it is still unbuilt.
 *
 * **The** question, asked by everything that has an opinion about wonders: the
 * build gate, the purchase gate, the panel's greyed row and the sculpt. A linear
 * scan of a list that holds at most one row per wonder in the game — see
 * `GameState.wonders` for why an array is the right shape here.
 */
export function wonderClaim(state: GameState, building: BuildingId): WonderClaim | undefined {
  for (const claim of state.wonders) {
    if (claim.building === building) return claim;
  }
  return undefined;
}

/**
 * Records a wonder as built. **The one place `state.wonders` is written**, and
 * it is `createCity`'s neighbour for that reason.
 *
 * Deliberately not idempotent and deliberately not a validator: it appends. The
 * rule that there is only ever one row per wonder lives at the gate
 * (`buildError`) and in the sweep that empties every other queue of it the
 * instant this is called (`refundBeatenWonders`), which is what makes "the first
 * city in the sweep wins" a property of the completion routine rather than of a
 * check somebody could forget to run.
 */
export function claimWonder(
  state: GameState,
  building: BuildingId,
  city: City,
): WonderClaim {
  const claim: WonderClaim = {
    building,
    cityId: city.id,
    playerId: city.ownerId,
    turn: state.turn,
  };
  state.wonders.push(claim);
  return claim;
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

// --- the roster, read the two ways a sweep asks for it -----------------------

/**
 * Two readings of `state.cities` that live **here** rather than in `cities.ts`,
 * beside `cityById` and for its reason (2026-08-28).
 *
 * Both are pure functions of the roster and the parallel arrays this module
 * declares — no yields, no citizens, no queue — so neither ever needed the city
 * rules, and having them in `cities.ts` was what forced `empireGold.ts`' flood
 * fill to import the largest module in the simulation to find a capital. Moving
 * them made that file a leaf. `cities.ts` re-exports both, so every caller that
 * already asks it keeps asking it: this is a change of *home*, not of address.
 */

/**
 * Which of a player's cities is the capital: the oldest one they *founded*, or —
 * for an empire that owns nothing but conquest — the oldest one they hold.
 *
 * There was no capital in this game before Milestone 10, so this is the rule
 * being written rather than one being read, and it is written in one place so
 * that everything that ever asks (the palace's happiness, the palace's
 * authority capacity, the one city that costs no authority, the root of the
 * road connection fill) asks the same function.
 *
 * Oldest is `state.cities` order, which is founding order, which is id order:
 * ids are minted by a counter (see `state.ts`), so "the first city in the array"
 * is a fact about the state and not about the wall clock. Nothing is stored,
 * because nothing has to be — the answer is a pure function of the board, and a
 * stored `isCapital` would be a second thing to keep in step the day a city
 * changes hands.
 *
 * The founded-first rule is what makes a conquered palace mean something: take
 * an empire's first city and its capital moves to the oldest town it built for
 * itself, which is Civ's rule and the intuitive one. `captured` is sticky (see
 * its docblock), so a capital lost and won back does not resume the palace — the
 * empire has a new seat of government, and the old one is a prize.
 *
 * `undefined` for a player with no cities at all, which is every player on turn
 * one: a palace nobody has built supplies nothing, and the meters say so.
 */
export function capitalCityOf(state: GameState, playerId: number): City | undefined {
  let fallback: City | undefined;
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    if (!city.captured) return city;
    fallback ??= city;
  }
  return fallback;
}

/**
 * Who owns each hex, read by **tile index** — the sweep's shape of the question
 * `tileOwnerPlayerId` answers by coordinate.
 *
 * `state.tileOwner` is a parallel array over `state.map.tiles` (`row * width +
 * col`, see the state's own docblock), so a loop that already holds an index
 * holds the answer's address too. `tileOwnerPlayerId` cannot know that: given a
 * col and a row it must wrap the column, find the tile, index the array, and
 * then scan `state.cities` for the city's owner — the right answer for a caller
 * that has coordinates and nothing else, and the wrong one four thousand times
 * in a row. That per-hex cost was 85% of end-of-turn resolution on a forty-city
 * empire, because the resource sweeps in `cities.ts` run about a thousand times
 * a turn.
 *
 * So the work is turned round: one pass over the *cities* — forty of them, not
 * four thousand hexes — into an id→owner lookup, and the sweep reads ownership
 * positionally. Unclaimed is the common answer and costs one array read.
 *
 * The `Map` is a **lookup, never an iteration**: nothing walks it, so no outcome
 * can depend on its order, and every list these sweeps produce still comes out
 * in `state.map.tiles` order exactly as before. A stale city id resolves to
 * `null`, which is what `cityById(...)?.ownerId ?? null` already said. See
 * `zocField` (`pathfind.ts`) for the same bargain one system over: a fact about
 * the whole sweep, resolved once, instead of re-derived per step.
 */
export interface TileOwnerField {
  /** The player owning the hex at this tile index, or `null` for unclaimed. */
  at(index: number): number | null;
}

/**
 * Hoists the owner reading for **one sweep**. See `TileOwnerField`.
 *
 * "One sweep" is the whole of its lifetime and it is not a soft rule: the
 * id→owner half is resolved here and now, so a field that outlived the loop that
 * built it would keep answering with a city list the state has moved past — a
 * town founded or captured since would read as unowned or as its old seat.
 * Nothing in the simulation holds one past its loop, and nothing should start
 * to: hoisting is cheap (one pass over `state.cities`) precisely so that the
 * answer to "is this still current" can always be "it was built this instant".
 */
export function tileOwnerField(state: GameState): TileOwnerField {
  const owners = new Map<number, number>();
  for (const city of state.cities) owners.set(city.id, city.ownerId);
  return {
    at(index: number): number | null {
      const cityId = state.tileOwner[index];
      if (cityId === null || cityId === undefined) return null;
      return owners.get(cityId) ?? null;
    },
  };
}
