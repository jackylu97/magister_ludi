/**
 * Typed access to `data/units.json`.
 *
 * The sibling of `terrainData.ts` and `rulesData.ts`: the JSON is the single
 * source of truth for what a unit type *is*, this file only types it. Nothing in
 * the simulation hard-codes a movement allowance, a hit-point total or a combat
 * strength — a designer retunes the roster by editing the JSON.
 *
 * `glyph` is a visual field, read exclusively by `src/render/tileVisuals.ts`.
 * It lives here rather than in a separate art file for the same reason terrain
 * colours live next to terrain rules: two lists of the same things drift apart.
 *
 * Combat fields
 * -------------
 * `combatStrength` was carried from the first milestone and spent in the fifth;
 * `rangedStrength` and `range` arrived with it and are *optional as a pair*,
 * which is how a type declares itself ranged. Nothing in `src/sim/` compares a
 * unit type against a string to decide whether it can shoot, exactly as nothing
 * compares against `"settler"` to decide whether it can found — see `isRanged`
 * in `combat.ts`.
 *
 * City-related fields
 * -------------------
 * `cost`, `escalation`, `foundsCity`, `haltsGrowth` and `minCityPop` are all
 * here rather than in `rules.json` because they describe *this unit type*, not
 * the city system:
 * a designer who adds a second settler-like unit adds one entry here and every
 * rule that mentions settlers follows it. In particular nothing in `src/sim/`
 * ever compares a unit type against the string `"settler"` — `foundsCity` is
 * what the `foundCity` command checks, so "which units can found cities" is a
 * data question with a data answer.
 */

import unitsJson from '../../data/units.json';

import type { ResourceId } from './resourceData';

export type UnitTypeId =
  | 'warrior'
  | 'scout'
  | 'settler'
  | 'worker'
  | 'trader'
  | 'archer'
  // The bow line's second rung (the tree re-cut of 2026-09-02, Entry LVIII):
  // Siegecraft's Bowman stands between the Archer and the Composite Bowman.
  | 'bowman'
  | 'spearman'
  | 'horseman'
  | 'chariot'
  | 'chariotArcher'
  | 'swordsman'
  | 'catapult'
  | 'compositeBowman'
  | 'pikeman'
  | 'crossbowman'
  | 'knight'
  | 'longswordsman'
  | 'trebuchet'
  // The Æra II–IV roster (the tree pass of 2026-08-30): the spear line's two
  // successors, the melee premier that paves the ground it rests on, the two
  // mounted premiers, and the beast that comes with the ivory.
  | 'phalanx'
  | 'spearWall'
  | 'legionary'
  | 'horseArcher'
  | 'cataphract'
  | 'warElephant'
  | 'trireme'
  | 'bireme'
  | 'galley'
  | 'caravel'
  | 'corvette'
  | 'warGalley'
  | 'towerShip'
  | 'carrack'
  | 'shipOfTheLine'
  | 'fireShip'
  | 'gunGalley'
  | 'frigate'
  // Alchemy's closer (Entry LVIII): the first soldier who carries fire, and the
  // only row on the roster that asks for niter.
  | 'fireLance'
  | 'augur'
  | 'prophet'
  // The Holy Office's agent (Entry LVIII): the faith rework's third religious
  // piece, bought out of the faith bank and spent on one Purge.
  | 'inquisitor'
  | 'greatPerson';

/**
 * Stacking is per category (see `rules.stacking.perCategoryPerTile`), which is
 * the whole reason the category exists as data rather than as "combatStrength
 * is zero": a future non-combat military unit must still stack like a soldier.
 *
 * **Three slots since the user's ruling of 2026-08-28** — *"make traders their
 * own separate unit type; it can stand on the same tile as civilian and
 * military units"*. A hex holds one military piece, one civilian piece, and
 * **any number of traders**: caravans cross on the road rather than queueing on
 * it, and a settler standing in the gates is no longer a wall the empire's
 * commerce has to walk around. The uncapped half is `stacksFreely`
 * (`units.ts`), which is the one place that reading lives.
 *
 * `'trader'` is a **stacking** category and nothing else. It is emphatically not
 * a second answer to "can this thing fight" — that is `isCivilian`, which is
 * `!isCombatant` and is therefore still true of a caravan, so combat capture,
 * plunder, fortify, sleep, upkeep and embarkation all read a trader exactly as
 * they read a worker. Two questions, two predicates; a category comparison that
 * meant "civilian in combat terms" would be the drift this note exists to stop.
 *
 * **`'naval'` is the fourth slot** (the naval line, 2026-08-29), and it is a
 * stacking category for the trader's reason exactly: a hull and the piece it
 * escorts stand on one hex, and two hulls never do. So the cap does the whole of
 * "one warship per hex" with no clause anywhere, and the *escort* — at most one
 * embarked piece beside a hull, **on water only** — is the one clause
 * `hasStackingRoom` grew (`units.ts`). On a coastal city hex a ship garrisons
 * under the ordinary caps, which is why the escort clause asks the ground.
 *
 * Like `'trader'` it says nothing about fighting: a hull is `isCombatant`
 * because its row carries a strength, and `isCivilian` is false of it. "Is this
 * a ship" is `isNaval`, and it is a question about *where the piece may be*,
 * never about what it may do.
 */
export type UnitCategory = 'military' | 'civilian' | 'trader' | 'naval';

/**
 * Which *class* of model the 3D board stands this unit on.
 *
 * A visual field, like `glyph`, and here for the same reason: two lists of the
 * same units drift apart. It replaced the old per-type `piece` field, and the
 * replacement is the whole point rather than a tidy-up. Fifteen sculpts, one per
 * unit type, read as fifteen slightly different tokens at game zoom and as one
 * indistinguishable smudge at any zoom further out — the differences were real
 * but they were spent on details the camera never resolves. So the roster now
 * collapses onto eight silhouettes a player can name from across the table, and
 * the *specific* unit is carried by the floating badge above it (see
 * `src/render3d/badges3d.ts`), which is the Civ convention and works for the
 * same reason: a shape says what kind of thing this is, a tag says which one.
 *
 * Two types sharing a class is therefore expected, not a shortcut. A catapult
 * and a trebuchet are one machine with two badges.
 *
 * `worker` has no unit type yet. It is declared, sculpted and iconed anyway, so
 * that the day the improvement system lands the renderer already knows what a
 * worker looks like; `test/pieces3d.test.ts` allows exactly this one unmapped
 * class and no other. `src/render3d/board3d.ts` holds the registry that turns
 * one of these into geometry and will not compile if a name here has no sculpt.
 *
 * The three naval classes are the same bargain at sea: three hulls, twelve rows,
 * and the *rig* (`UnitDef.masts`) is what separates a trireme from a corvette in
 * the diorama, exactly as the badge separates a catapult from a trebuchet. They
 * are a **model** class and nothing else — the rules ask `UnitDef.category`
 * whether a piece may be on the water, never this field — with one deliberate
 * exception, `UnitCombatLine.vsModelClass`, which is how the Trireme's row says
 * "against ranged ships" without naming the Fire Ship.
 */
export type ModelClass =
  | 'settler'
  | 'worker'
  | 'melee'
  | 'ranged'
  | 'mountedRanged'
  | 'mounted'
  | 'siege'
  | 'scout'
  | 'navalLight'
  | 'navalHeavy'
  | 'navalRanged';

/**
 * What one of these costs to **buy outright**, or the field is absent for a type
 * nothing sells (ledger Entry XXVIII).
 *
 * Currency-agnostic on purpose. Faith is the only bank that spends today and the
 * augur was the only thing it bought, but the M9 gold purchases are the same
 * transaction with a different pool — so the *shape* carries the currency and
 * the one price evaluator (`explainPurchaseCost` in `purchase.ts`) reads it.
 *
 * The rule this row carries, as of M9: **a type that names its own bank is sold
 * out of that bank and no other.** Gold buys everything the roster leaves
 * silent, at the treasury's flat conversion from hammers, so a warrior needs no
 * row here at all — and the augur's row is what keeps gold away from it without
 * gold having to know what an augur is.
 */
export interface UnitPurchaseSpec {
  currency: 'faith' | 'gold';
  /** The base price, before escalation. `UnitDef.cost`'s twin in a bank. */
  cost: number;
  /**
   * What the price climbs by for every one of these this empire has already
   * bought, or absent for a flat price. `escalation`'s twin, and read against
   * a counter on the player for that field's reason exactly — a purchased unit
   * may be spent, so the board cannot be counted.
   */
  increment?: number;
  /**
   * True when **production may never build this type**: it is bought or it does
   * not exist. The augur's, and the whole of "keep faith legible" — an agent you
   * could also hammer out would make the faith price a suggestion.
   *
   * Refused by `buildError` (`tech.ts`), which is also what the reducer refuses
   * a queue with — and the city panel now leaves such a row **out** of the build
   * list entirely (`isPurchaseOnly`), because a greyed row for something that
   * belongs to a different list answers nothing.
   */
  exclusive?: boolean;
  /**
   * How the interface offers this purchase — "Call an augur".
   *
   * Here rather than in the panel because a prophet is *called*, a mercenary is
   * *hired* and a relic is *acquired*, and none of those should teach a DOM file
   * a type's name. Absent falls back to "Buy a ⟨name⟩".
   */
  verb?: string;
}

/**
 * One labelled flat strength line a **roster row** carries into every fight the
 * piece is in — the Trireme's "+5 against ranged ships", the Fire Ship's "−5
 * Fragile hull", the Frigate's "+10 Bombardment".
 *
 * `CardCombatLineEffect`'s shape minus the empire (`statecraftData.ts`): a card's
 * line is a fact about the *law* and is asked of `liveEffects`, this one is a
 * fact about the *type* and is read straight off the row — so the two lists
 * concatenate in `planCombat`'s fold with no translation, exactly as
 * `buildingEffects.ts`'s `cityStat` concatenates with a card's. Both answers are
 * labelled lists and neither is ever a number: hard rule 5 at the scale of one
 * soldier, and the reason the naval triangle is three data rows rather than
 * three branches in the combat evaluator.
 *
 * The narrowing fields are declared here rather than reused from
 * `statecraftData.ts` on purpose. That module imports this one, and a
 * `UnitFilter` in a roster row would put an import back the other way — the
 * runtime cycle `test/mapgen/moduleCycles.test.ts` exists to catch. There is
 * nothing a hull's line needs to say that a model class cannot.
 */
export interface UnitCombatLine {
  /** Plain words, printed on the forecast card as written. */
  label: string;
  /** Strength points. Signed: the fragile hull takes points away. */
  amount: number;
  /** Which posture it pays in. Absent means both. */
  side?: 'attack' | 'defend' | 'both';
  /**
   * Only against a piece of this model class. Absent means anything.
   *
   * A **city has no silhouette**, so a line carrying this never pays against
   * walls — `CardCombatLineEffect.vsClass`' rule, and the honest reading rather
   * than an omission. A row that wants the walls says `vsCity`.
   */
  vsModelClass?: ModelClass;
  /** True: only against a city. False: only against a piece. Absent: either. */
  vsCity?: boolean;
  /** Only in a blow of this kind. Absent: either. */
  vsKind?: 'melee' | 'ranged';
}

export interface UnitDef {
  name: string;
  category: UnitCategory;
  /** Movement points refilled at the start of every turn. */
  movement: number;
  /**
   * How many hexes this unit reveals around itself, before the high-ground
   * bonus (`rules.visibility.hillsBonus`) is added.
   *
   * A field of its own rather than a multiple of `movement`, and that is the
   * whole of the scout's identity: a horseman moves four and sees two, a scout
   * moves three and sees three. Tying sight to speed would have made the mounted
   * line the explorers by accident and left the scout with nothing that is only
   * its own. Read by `sightOf` in `visibility.ts`, which is the only place it is
   * interpreted.
   */
  sight: number;
  maxHp: number;
  /**
   * What the unit is worth in a stand-up fight, attacking or defending. 0 for
   * civilians, and `combat.ts` reads that zero as "this is not a combatant"
   * rather than as "very weak": a civilian never attacks, never counter-attacks,
   * and is captured rather than killed.
   */
  combatStrength: number;
  /**
   * What the unit is worth shooting, and how far. Both present or both absent:
   * a type with these fields is a ranged unit and the `attack` command resolves
   * as a shot; a type without them can only close and fight.
   *
   * They are optional rather than zero-valued so that "is this thing ranged?" is
   * a question about the *shape* of the data — `rangedStrength === undefined` —
   * and cannot be confused with a designer tuning a bow down to nothing. See
   * `isRanged` in `combat.ts`, which is the only place the pair is interpreted.
   */
  rangedStrength?: number;
  /** Hexes a shot may cross, defender included. Absent on melee-only types. */
  range?: number;
  /**
   * Hammers a city pays to build one — the *base* price, before escalation.
   * See `escalation`, and `unitProductionCost` in `cities.ts`, which is the
   * only function allowed to answer "what does this cost right now".
   */
  cost: number;
  /**
   * Hammers this type gets dearer by for every one of *this same type* its
   * owner has already built or bought (`Player.unitsBuilt`), or absent when the
   * price is flat.
   *
   * The Civ VI expansion brake, as data, generalised (user ruling, 2026-08-28)
   * beyond the settler it started on: this type is `cost + escalation × built`,
   * so the fourth of it costs three increments more than the first and an
   * empire that leans on one type pays for the habit. Presence of the field
   * *is* the marker — nothing in `src/sim/` asks whether a type is `"settler"`
   * or `"worker"`, exactly as with `foundsCity` — but unlike the shared ladder
   * this field once described, **the counter is per type**: a settler and a
   * worker each climb their own ladder, keyed by `unitDef` id in
   * `Player.unitsBuilt`, so pricing one out of a city never dents the other's
   * count. The one card rule that predates the generalisation (`settlerCost`)
   * still names the settler by id and is not asked of a second escalating type
   * — see `explainUnitCost` in `cities.ts`. Its sibling `noSettlerEscalation`,
   * which could stop the ladder outright, was retired on 2026-09-03 once no card
   * carried it: the ladder always climbs now.
   */
  escalation?: number;
  /**
   * How many improvements one of these can build before it is used up, or the
   * field is **absent** for a type that builds none.
   *
   * The whole of the Civ VI-style charge model (design ledger, M7): a worker is
   * three instant builds in a box rather than a permanent servant with a
   * multi-turn task queue. Presence of the field *is* the marker — nothing in
   * `src/sim/` asks whether a type is `"worker"`, exactly as with `foundsCity`
   * and `escalation` — so a future engineer with five charges is one data row
   * and every rule that mentions charges follows it.
   *
   * Absent rather than zero-valued for the reason `rangedStrength` is: "does
   * this thing build" is a question about the *shape* of the data and must not
   * be confusable with a designer tuning a builder's charges down to nothing.
   * `Unit.chargesLeft` (`state.ts`) is initialised from here and is likewise
   * absent on everything else.
   */
  charges?: number;
  /**
   * True when this unit's charges are **rites** rather than spadework — it may
   * consecrate a god and it may perform an augur's rite — or the field is
   * **absent** for everything that digs.
   *
   * Presence is the marker, exactly as with `foundsCity`, `charges` and
   * `escalation`: nothing in `src/sim/` asks whether a type is `"augur"`, so
   * the prophet that arrives with the High Temple is one data row and every rule
   * about rites follows it. It shares `chargesLeft` with the worker rather than
   * opening a second counter, which is the whole reason the charge model was
   * built generic — three instant acts in a box, and *which* acts is this flag.
   */
  consecrates?: boolean;
  /**
   * True when this unit's charges are a **great person's** — the act it is spent
   * on and the work it plants — or the field is **absent** for everything that
   * digs or prays.
   *
   * Presence is the marker, exactly as with `foundsCity`, `charges` and
   * `consecrates`: nothing in `src/sim/` asks whether a type is
   * `"greatPerson"`, so the great admiral that arrives with naval units is one
   * data row. It is the third reading of one charge counter — three instant
   * acts in a box, and *which* acts is this flag — and the rule it carries is
   * symmetric: a `greatWork` piece may plant only a work, and a worker may
   * plant nothing but ordinary improvements (`improvementErrorAt`).
   *
   * It is a fact about the **type**; *which* person a given piece is is
   * `Unit.person`, a fact about the piece. Two fields because they answer two
   * questions, and the family verb needs the second one.
   */
  greatWork?: boolean;
  /**
   * True when this unit's charges are a **prophet's** — founding a religion,
   * planting a holy site, proclaiming, redrafting what the faith believes — or
   * the field is **absent** for everything that digs, prays or leaves a work.
   *
   * Presence is the marker, exactly as with `foundsCity`, `charges`,
   * `consecrates` and `greatWork`: nothing in `src/sim/` asks whether a type is
   * `"prophet"`, so the second religious agent is one data row. It is the fourth
   * reading of one charge counter — two acts in a box, and *which* acts is this
   * flag — and the rule it carries is the symmetric one every marker carries: a
   * prophet plants the holy site and nothing else, and nothing else plants the
   * holy site (`improvementError`).
   */
  prophesies?: boolean;
  /**
   * True when this unit's charge is an **inquisitor's** — the Purge, which
   * strips every rival faith's banked pressure off the towns around it — or the
   * field is **absent** for everything that digs, prays, prophesies or leaves a
   * work.
   *
   * Presence is the marker, exactly as with `foundsCity`, `charges`,
   * `consecrates`, `greatWork` and `prophesies`: nothing in `src/sim/` asks
   * whether a type is `"inquisitor"`, so the Holy Office's third agent is one
   * data row. It is the fifth reading of one charge counter — one act in a box,
   * and *which* act is this flag.
   *
   * The **aura is bound to it too** (`inquisitorAuraLines`, `combat.ts`): a
   * standing inquisitor stiffens the soldiers beside it, which is a fact about
   * the type rather than about the charge, and it is read off this marker for
   * the reason every other rule here is — a second such piece is a data row.
   */
  purges?: boolean;
  /**
   * True when this unit may be **sent** — it carries a trade route between two
   * cities and lays road under its feet — or the field is **absent** for
   * everything that does not.
   *
   * Presence is the marker, exactly as with `foundsCity`, `charges`,
   * `consecrates` and `greatWork`: nothing in `src/sim/` asks whether a type is
   * `"trader"`, so the cargo ship that sails a coastal route one day is one data
   * row and every rule about caravans follows it. Four rules read it — the
   * `startRoute` gate (`trade.ts`), the road a step lays (`arriveOnTile`), the
   * shuttle phase (`marchTraders`), and the one clause that says a laden caravan
   * is **plundered rather than captured** when a soldier reaches it.
   *
   * It is a fact about the **type**; whether a given piece is currently carrying
   * a route is `Unit.trade`, a fact about the piece. Two fields because they
   * answer two questions — the same split `greatWork` and `Unit.person` make.
   */
  trades?: boolean;
  /** What one costs to buy outright, or absent. See `UnitPurchaseSpec`. */
  purchase?: UnitPurchaseSpec;
  /**
   * True when every passable hex costs this unit exactly `minStepCost` to
   * enter, whatever grows on it or however steep it is — or the field is
   * **absent** for everything that pays the terrain what the terrain asks.
   *
   * The scout's identity, and the second half of it: `sight` already says it
   * sees further than it moves, and this says the ground does not slow it. A
   * forest is 2 and a wooded hill 3 to an army dragging a baggage train; to one
   * rider following a deer track they are a day's walk like any other, which is
   * exactly the Civ "ignores terrain cost" promise.
   *
   * It buys **movement and nothing else**. Passability is untouched — the flag
   * is read *after* `moveCost` has already returned `null`, so a mountain and an
   * ocean refuse a scout exactly as they refuse a warrior — and so is defence:
   * a scout caught in a wood still gets the wood's cover. See `tileMoveCost` in
   * `pathfind.ts`, which is the one place this is interpreted, and therefore the
   * one place pathing, reachability and the walk itself can agree about it.
   *
   * Absent rather than `false` for the reason `charges` and `requiresResource`
   * are: presence of the field *is* the marker, so nothing in `src/sim/` has to
   * compare a unit type against the string `"scout"`.
   */
  ignoresTerrainCost?: boolean;
  /** True when the unit can be spent to found a city. See the docblock. */
  foundsCity: boolean;
  /**
   * True when a city banks no food toward growth while this unit is at the
   * front of its queue. Starvation still applies — halting is not immunity.
   */
  haltsGrowth: boolean;
  /**
   * Population a city needs before it may queue or finish this unit. 0 for
   * everything that has no such rule.
   */
  minCityPop: number;
  /**
   * The strategic resource a player must control to build this, or absent when
   * the type needs none.
   *
   * The whole of the strategic-resource rule (design ledger, Entry IX), and it
   * lives here rather than in `resources.json` for the reason `foundsCity` and
   * `minCityPop` do: it is a fact about *this unit type*, so a designer who adds
   * a second mounted line adds one field and every rule that mentions horses
   * follows it. Nothing in `src/sim/` compares a unit type against `"horseman"`.
   *
   * "Controls" is `hasResource` in `cities.ts` — owning a tile that carries it.
   * The gate itself is `buildError` in `tech.ts`, beside the technology gate, so
   * the reducer's validation and the city panel's buildable list ask one
   * question and cannot drift apart.
   */
  requiresResource?: ResourceId;
  /**
   * The type this one becomes when its successor's technology lands, or absent
   * when the line ends here.
   *
   * The whole of the AoE2-style auto-upgrade rule (Entry V): no upgrade command,
   * no gold-per-unit micro, no obsolete pieces to shepherd home. `upgradeUnits`
   * in `tech.ts` walks this chain at the moment a tech completes, and the
   * *enabling* technology is not named here — it is whichever tech's `unlocks`
   * list contains the successor, so the tree stays the single source of gating.
   */
  upgradesTo?: UnitTypeId;
  /**
   * Strength lines this **type** carries into every fight, or absent for a row
   * that fights on its printed number alone. See `UnitCombatLine`.
   */
  combatLines?: readonly UnitCombatLine[];
  /**
   * True when an attack does **not** end this piece's turn: it pays
   * `rules.naval.hitAndRunCost` out of its allowance and keeps the rest — or the
   * field is absent for everything that commits to its blow.
   *
   * The light hull's identity and the reason it is still worth building once
   * ranged hulls appear (`docs/tech-tree.md`, the naval line): a nimble ship
   * closes, strikes and is gone, which is what makes speed a *strategic* stat at
   * sea rather than a nicer version of the same fight.
   *
   * Presence is the marker, exactly as with `foundsCity`, `charges` and
   * `trades`: nothing in `src/sim/` compares a type against `"trireme"`, so the
   * raider a later age adds inherits it from one data field. It is read in one
   * place — `applyCombat`'s bookkeeping step, where every other attacker's
   * allowance is zeroed — and it does **not** touch `hasAttacked`, so a hull
   * still strikes once a turn and then merely has somewhere to be.
   */
  hitAndRun?: boolean;
  /**
   * True when this piece **paves the hex it comes to rest on** — the
   * Legionary's, and the whole of "the road is the army, laid down behind it".
   *
   * Presence is the marker, exactly as with `hitAndRun`, `blockades` and
   * `trades`: nothing in `src/sim/` compares a type against `"legionary"`, so a
   * later engineer inherits the rule from one data field. It is read in exactly
   * one place — `arriveOnTile` (`arrival.ts`), the one "a unit came to rest
   * here" seam — beside the trader's own paving, and it goes through `layRoad`
   * (`roads.ts`), which is still the **only** writer of `Tile.road`.
   */
  laysRoad?: boolean;
  /**
   * True when this row's ranged blow is a **bombardment** — it is built to
   * batter walls — or the field is absent.
   *
   * The bonus itself is an ordinary `combatLines` entry with `vsCity: true`, so
   * nothing switches on this flag to *price* anything. What it is for is the
   * word: the Compendium and the unit sheet say "bombards", and the roster is
   * where "what kind of gun is this" belongs rather than in a describer reading
   * a strength line's label.
   */
  bombard?: boolean;
  /**
   * True when this hull **blockades** — parked off a port it denies the sea lane
   * and stops the town's trade — or the field is absent for everything that only
   * fights.
   *
   * The heavy line's identity, and the reason it is slow: a ship that cannot
   * outrun anything is a ship that is *there*, and being there is what a
   * blockade is. Presence is the marker, so nothing compares a type against
   * `"warGalley"` and nothing in the simulation switches on a naval model class
   * to decide it.
   *
   * Two rules read it, and they are two readings of one idea rather than two
   * rules: `siegeField` marks the water around such a hull as denied — which is
   * what lets a single hull cut a small port's supply, since `underSiege` denies
   * a water hex only when somebody is standing on it — and `explainRouteYield`
   * pays a blockaded town's routes nothing. `blockade.ts` is the one place both
   * ask, and it is a leaf so the two can.
   */
  blockades?: boolean;
  /**
   * How the hull is rigged, 1–5 — oars and a pennant, one square sail, sail and
   * a fighting tower, two masts, three masts and a full rig.
   *
   * A **visual** field like `glyph` and here for `glyph`'s reason: two lists of
   * the same ships drift apart. It is read twice and both readings must agree —
   * the sculpt (`board3d.ts` picks the rig's body) and the badge (`badges3d.ts`
   * composes the hull mark of this age with the class's canton) — which is the
   * whole point of the number living on the row rather than in either art file.
   *
   * Absent on everything that is not a ship.
   */
  masts?: 1 | 2 | 3 | 4 | 5;
  /**
   * The mark printed on the badge's parchment corner, which is what separates
   * two hulls of the same age: chevrons for the light line, the rook for the
   * heavy, the crosshair for the ranged.
   *
   * `masts`' sibling and visual for the same reason. It is a *word* rather than
   * a derivation from `modelClass` because the drawing is a decision about
   * drawings — a fourth naval class would want its own mark and might well share
   * a silhouette with one of these three.
   */
  canton?: 'chevrons' | 'rook' | 'crosshair';
  /**
   * True when this row is **in the game's data but not yet in the game**: no
   * technology names it, and until one does it may be neither built nor bought.
   *
   * The naval line shipped its Æra V hulls (Corvette, Ship of the Line, Frigate)
   * ahead of the age that unlocks them, because the triangle is only a triangle
   * once every class has every rank and the balance pass wants all twelve rows
   * to read against each other. Without this marker such a row is *worse* than
   * unbuildable — it is buildable **from turn one**, since `isUnlocked` treats
   * "no tech names it" as "available from the start" (`techData.ts`), which is
   * the right default for content nobody gated and exactly wrong here.
   *
   * Deliberately a marker on the roster and not a second gate beside it, so it
   * is refused in the two places a thing is acquired (`buildError`,
   * `purchaseError`) and nowhere else — the augur's `purchase.exclusive` and the
   * great person's `greatWork` are its two neighbours in that switch. **It is
   * temporary by construction**: the Æra V tech pass deletes the field from
   * three rows and adds them to a node's `unlocks`, and nothing else changes.
   */
  awaitsTech?: boolean;
  /** Which carved model the 3D board draws this unit as. See `ModelClass`. */
  modelClass: ModelClass;
  /** Single letter drawn on the unit disc. Visual only. */
  glyph: string;
}

export interface UnitData {
  units: Record<UnitTypeId, UnitDef>;
}

export const UNIT_DATA: UnitData = unitsJson as UnitData;

export const UNIT_TYPE_IDS = Object.keys(UNIT_DATA.units) as UnitTypeId[];

export function unitDef(id: UnitTypeId): UnitDef {
  return UNIT_DATA.units[id];
}

/**
 * Does this type shoot?
 *
 * THE test, asked of the data rather than of a name: `rangedStrength` and
 * `range` are declared as an optional pair (above), so a unit is ranged exactly
 * when a designer gave it a bow. Nothing here compares a type against the string
 * `"archer"`, for the same reason nothing compares against `"settler"` to decide
 * who may found a city.
 *
 * These four read the unit *table* and nothing else — no state, no board, no
 * fight — so they live here, at the bottom, where every layer can ask them.
 * `combat.ts` wrote the first three and re-exports them, because "can it attack"
 * is a question callers have always asked combat; `arrival.ts` needs the third
 * one to know what may be taken with a hex, and cannot import combat (which
 * imports it).
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

/**
 * Is this the piece an empire sends out to *look*?
 *
 * Asked of `ignoresTerrainCost`, and the coupling is the claim rather than a
 * shortcut: a unit that crosses a wooded hill for the price of open grass is a
 * unit built to cover unknown ground, and there is no other thing that would be
 * for. So "walks anywhere at one point a hex" and "is an explorer" are one fact
 * about the data with two readers — the movement evaluator (`tileMoveCost`) and
 * the interface, which raises the explorer lens the moment such a piece is
 * picked up (`effectiveLens` in `src/ui/controls.ts`).
 *
 * A predicate rather than the raw field at the call site, unlike `foundsCity`
 * next door, precisely *because* it is a reading and not a restatement: the day
 * a designer wants a commando that ignores terrain without being a scout, this
 * function is the one line that splits, and every lens follows it.
 *
 * Nothing in `src/sim/` calls it — the rule it stands for is the movement flag,
 * which the evaluator reads directly. It lives here because it is a question
 * about the unit *table*, and a copy of it in the UI would be a second opinion
 * about what a scout is.
 */
export function isExplorer(def: UnitDef): boolean {
  return def.ignoresTerrainCost === true;
}

/**
 * What an empire's **law** stamped on a piece at the moment it was created —
 * The Muster Roll's ten hit points, Drums of War's point of strength.
 *
 * A stamp is written once, by `createUnit`, and never revisited: the card that
 * ordered it may be unslotted the turn after and the veteran is still a veteran,
 * which is exactly what "newly created units gain …" says and what a bonus
 * computed on read could not say. `Unit.chargesLeft`'s bargain (a charge is
 * spent, so it is written at the birth) one field over, for the same reason.
 *
 * It lives here rather than in `state.ts` so that the two readings of it — the
 * maximum below and the strength line `planCombat` folds — are facts about the
 * unit *table* answerable without the state, which is what lets the renderer's
 * hp bar ask the same question the simulation does.
 */
export interface UnitStamp {
  /** Hit points added to the roster's maximum, for this piece and forever. */
  hp?: number;
  /** Strength points added on both sides, as one labelled line in the fold. */
  strength?: number;
}

/** The shape either reading needs: a type, and whatever was stamped on it. */
export interface StampedUnit {
  type: UnitTypeId;
  stamp?: UnitStamp;
}

/**
 * **THE** maximum health of one piece — the roster's figure plus its stamp.
 *
 * One helper, and every reader of a *unit's* maximum goes through it: the heal
 * cap (`healUnits`, a rite, a pillage, a great person's act), the forecast's two
 * bars, the upgrade's fraction (`tech.ts`) and the hp bar the renderer draws.
 * `unitDef(...).maxHp` on its own is now only ever the **roster's** answer — what
 * the Compendium prints about a type, and what a pathfinding probe carries — and
 * the split matters: a stamped legion whose bar read against the roster would
 * have shown a full unit at 90%.
 *
 * Floored at 1, because a stamp is signed and a card that took a piece's last
 * point of health would be a card that deletes an army on the turn it is
 * slotted.
 */
export function unitMaxHp(unit: StampedUnit): number {
  return Math.max(1, unitDef(unit.type).maxHp + (unit.stamp?.hp ?? 0));
}

/**
 * What a piece's stamp is worth in a fight — `unitMaxHp`'s sibling, and the one
 * reading of `UnitStamp.strength`.
 *
 * It is deliberately **not** folded into `UnitDef.combatStrength` anywhere: hard
 * rule 5 says a strength is the fold of a labelled list, so the veteran's point
 * joins `planCombat`'s breakdown as a line a player can read ("Veteran +1")
 * rather than as a bigger number beside the roster's name.
 */
export function unitStampStrength(unit: StampedUnit): number {
  return unit.stamp?.strength ?? 0;
}

/**
 * Is this the piece an empire sends out to *trade*?
 *
 * The one reading of `UnitDef.trades`, so that nothing anywhere compares a unit
 * type against `"trader"` — exactly as nothing compares against `"settler"`,
 * `"augur"` or `"greatPerson"`. It lives beside `isCivilian` because
 * `arrival.ts` asks it on every step of every march and cannot import the trade
 * rules (which import the city rules, which is the way the arrows already run).
 */
export function trades(def: UnitDef): boolean {
  return def.trades === true;
}

/**
 * Is this a **ship** — a piece whose home is the water?
 *
 * THE reading of the naval category, so that nothing anywhere compares a
 * category against the string `'naval'` to answer a movement, stacking or
 * combat question — `stacksFreely`'s discipline one category over, and
 * `isExplorer`'s one field over.
 *
 * It is asked of `category` rather than of `modelClass` because it is a rule
 * about *where a piece may be*, and the category is what the board's stacking
 * caps are keyed by. The model class is art (`ModelClass`); a hull drawn with a
 * different silhouette would still be a ship.
 *
 * Three things read it: `moveProfile` (which water and which land a hull may
 * enter), `hasStackingRoom` (the escort clause), and `spawnTileFor` (a ship is
 * launched from its city's own hex). Everything else about a hull — that it
 * fights, that it may be captured, that it pays upkeep — is answered by the
 * predicates above, unchanged, which is the whole reason the category is a
 * fourth slot rather than a fourth kind of unit.
 */
export function isNaval(def: UnitDef): boolean {
  return def.category === 'naval';
}

/**
 * The **temporary** homes the twelve naval rows sit on until the tech-tree pass
 * (the naval line, 2026-08-29; `docs/tech-tree.md`).
 *
 * A register in a comment rather than a field, because a note on a data row is
 * player prose (CLAUDE.md hard rule 7) and "this ship is parked on Currency
 * until Æra II exists" is a fact about the *project*. The user's ruling was
 * "leave the tech tree alone until we finalize", so the rows were hung on nodes
 * that already exist and nothing was renamed, re-costed or re-parented:
 *
 *     Trireme                              → Sailing      (the user's placement)
 *     Bireme · War Galley                  → Currency
 *     Galley · Tower Ship · Fire Ship      → Engineering
 *     Caravel · Carrack · Gun Galley       → Physics
 *     Corvette · Ship of the Line · Frigate → nothing yet — `awaitsTech`
 *
 * The tree's ratified homes are Sailing (I), Wayfinding (II), Shipwrights (III),
 * The Astrolabe (IV) and Square Rigging (V). When those nodes land, the four
 * lists above move and the three `awaitsTech` markers are deleted; **nothing
 * else in the naval line depends on where a hull is unlocked**, with one honest
 * exception worth naming here: `explainUnitCost`'s age band is read off the
 * unlocking tech, so a row with no tech at all prices at its printed base and a
 * row parked on an early node prices in that node's band. Both move on their own
 * the moment the tree does.
 */

/**
 * Runtime guard. Commands arrive from save files and (eventually) sockets, so a
 * `unitType` that is typed `UnitTypeId` may be any string at all.
 */
export function isUnitTypeId(value: unknown): value is UnitTypeId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(UNIT_DATA.units, value);
}

/**
 * The roster's caravan — the first row that `trades`.
 *
 * A reading over this file's own two exports (`UNIT_TYPE_IDS` and `trades`), so
 * it belongs here rather than in `trade.ts`: it was the last thing `cities.ts`
 * had to reach across a cycle for (The Founders' Road surveys with a
 * caravan-shaped probe, because the road a doctrine decrees is the road a
 * caravan would have worn), and a fact about the roster has no business living
 * on the far side of the module that spends it.
 *
 * Derived off the flag rather than named, which is the discipline every marker
 * in this game keeps (`settler`, `augur`, `greatPerson`): nothing in `src/sim/`
 * compares a unit type against a string, and `test/sim/trade.test.ts` reads the
 * sources to make sure of it. `null` on a roster with no caravan at all — a
 * world where no route can be started, and the gate says so rather than
 * pretending.
 */
export function caravanTypeId(): UnitTypeId | null {
  for (const id of UNIT_TYPE_IDS) {
    if (trades(unitDef(id))) return id;
  }
  return null;
}
