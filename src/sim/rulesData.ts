/**
 * Typed access to `data/rules.json`.
 *
 * The counterpart of `terrainData.ts` for gameplay rules: every balance or
 * "starting value" number lives in the JSON, this file only types it. Modules
 * import `RULES` rather than hard-coding numbers, so a designer can retune the
 * game without touching the simulation code.
 *
 * Milestone 2 adds movement, stacking, healing and start placement; Milestone 3
 * adds the whole `cities` block; Milestone 4 adds `research` — the opening kit
 * of technologies and the auto-upgrade retooling lever. The tree itself is a
 * data file of its own (`data/techs.json`), because it is a graph rather than a
 * table of knobs. Milestone 5 adds `combat`, which is every number the fight is
 * made of; the per-unit half of it (`combatStrength`, `rangedStrength`, `range`)
 * lives in `data/units.json`, and the terrain half (`defenseBonus`) in
 * `data/terrain.json`, because both describe a *thing* rather than the system.
 * Milestone 10 adds `meters`, the whole tuning surface of happiness and
 * authority — supply, demand, and the two percentage ladders they act through.
 */

import rulesJson from '../../data/rules.json';
import type { SpecialistFamily } from './greatPeopleData';
import type { ResourceYieldBag } from './resourceData';
import type { TechId } from './techData';
import type { TileYieldSpec } from './terrainData';
import type { UnitTypeId } from './unitData';

export interface GameRules {
  /** Turn number a new game starts on. */
  startingTurn: number;
  /** First id handed out by the entity allocator; ids below it are reserved. */
  firstEntityId: number;
  minPlayers: number;
  maxPlayers: number;
}

export interface MovementRules {
  /**
   * Floor applied to every computed step cost, so no terrain combination can
   * ever be free (and therefore no zero-cost cycle can exist for the pathfinder).
   */
  minStepCost: number;
  /**
   * What one step of **embarkable water** costs a mover that may cross it
   * (`MoveProfile.embarks` in `pathfind.ts`).
   *
   * A number of its own rather than `minStepCost` reused, because the two say
   * different things: the floor is a guarantee about the *search* — no edge is
   * free, so a node settles the first time it is popped — while this is the
   * price of a design decision, and the day a coastal crossing should cost a
   * whole turn it is this line that moves. They happen to be equal in v1.
   */
  embarkCost: number;
  /**
   * What one step **along a road** costs, in thirds of a movement point — so
   * `1` is Civ's ⅓ and a two-movement column covers six hexes of highway.
   *
   * Stored as a numerator rather than as `0.3333…` because movement points are
   * exact thirds and a decimal in a data file is a decimal that drifts: three
   * road steps have to come to exactly one point or a unit finishes its turn
   * holding a billionth of a move. `pathfind.ts` is the one place the fraction is
   * formed (`roadStepCost`), and `snapMovement` is what keeps every running
   * total on a whole third.
   *
   * A road step **replaces** the ground's own price rather than discounting it —
   * a wooded hill on a highway is a road, not a cheaper hill — which is the rule
   * `stepCost` states and the reason the price needs both tiles.
   */
  roadCostThirds: number;
  /**
   * What a step **along an enemy's zone of control** costs *on top of* the
   * ground's own price (`stepCost` in `pathfind.ts`).
   *
   * A whole movement point, and the whole of the 2026-08-28 ruling: a slide
   * from one hex a picket touches to another hex the same picket touches used
   * to complete and then take everything the mover had left. It is a toll now
   * rather than a wall, so a three-point column may still slide and march on
   * with what is left, and a one-point column pays what it has — the ordinary
   * overspend forgiveness, which is the same clause a warrior walking into a
   * forest already relies on.
   *
   * Whole, because movement points are exact thirds and a toll of a third would
   * be a rule a player cannot feel. It is added to the price rather than
   * replacing it, so a road step alongside a picket is still a cheap step with
   * a toll on it.
   */
  zocExtraCost: number;
  /**
   * What **crossing the shore** costs — a step whose two ends are one wet and
   * one dry (`stepCost` in `pathfind.ts`, the Themes Build's ruling).
   *
   * `'all'` is the classic rule and the shipped setting: the step costs the
   * mover's **whole allowance**, so wading out and wading ashore each end the
   * turn's marching. It is expressed as "the mover's full movement" rather than
   * as a large number because the price has to empty a purse of any size — a
   * two-point warrior and a four-point column both stop at the water's edge —
   * and the ordinary overspend forgiveness (`advanceAlongPath`) is what lets a
   * piece with one point left still make the crossing and arrive empty.
   *
   * A **number** is the tuning lever: a flat price in movement points, which is
   * what to reach for the day a shore crossing should be dear rather than
   * final. `cheapestStepCost` folds it in, so even a number below the floor
   * leaves the A* heuristic admissible.
   *
   * It is a fact about the *pair* of hexes, like a road's third, which is why it
   * lives in `stepCost` and not in `tileMoveCost` — and why all four readers of
   * a step's price inherit it by construction. Ships are exempt: a hull entering
   * a coastal city is coming into port, not learning to swim.
   */
  shoreCrossing: 'all' | number;
}

export interface ExploreRules {
  /**
   * How many tiles an auto-exploring unit's search may examine before giving
   * up (`exploreSearch` in `explore.ts`).
   *
   * A bound on the *search*, not on the map: the BFS walks outward from the
   * piece and stops the moment it has judged this many candidates, so an idle
   * explorer on a charted continent costs a bounded sweep rather than a
   * full-map Dijkstra per unit per turn. ~400 is a disc of radius eleven —
   * far past anything a piece could march to soon, and cheap enough to ask
   * every resolution.
   */
  searchLimit: number;
}

export interface StackingRules {
  /**
   * How many units of each `UnitCategory` may occupy one tile. At 1 this is the
   * Civ V rule: one military *and* one civilian share a tile happily, two
   * soldiers do not.
   */
  perCategoryPerTile: number;
}

/**
 * How far an empire can see. The whole tuning surface of fog of war; the
 * per-unit half of it (`sight`) lives in `data/units.json`, because how far a
 * scout can see is a fact about scouts.
 *
 * See `src/sim/visibility.ts` for the model these two numbers feed.
 */
export interface VisibilityRules {
  /** Extra hexes of sight a unit gains for standing on high ground. */
  hillsBonus: number;
  /**
   * How far a city sees from its own centre. Its *owned* tiles are visible
   * regardless — a border is a thing you patrol — so this is only the reach past
   * them, and it is deliberately a unit's worth rather than the claim radius: a
   * town is not a watchtower.
   */
  citySight: number;
}

export interface HealingRules {
  /** Hit points restored to a unit that spent none of its movement. */
  perTurnIfRested: number;
}

/**
 * Every number the fight is made of. See `src/sim/combat.ts` for the algebra;
 * this block is the whole of the tuning surface.
 *
 * The damage curve is Civ V's: one exponential in the *difference* of two
 * strengths, which is what makes strength a ratio-free scale — a 4-point edge is
 * worth the same at strength 8 as at strength 30, so the roster can grow into
 * later eras without the early game becoming a rounding error.
 */
export interface CombatRules {
  /** Damage an evenly-matched attack deals at the midpoint roll. */
  baseDamage: number;
  /** Exponent on the strength difference: `e ^ (k · (strA − strB))`. */
  strengthExponent: number;
  /** Half-width of the random band: the roll is uniform in `[1 − b, 1 + b]`. */
  rollBand: number;
  /**
   * **Strength points** added per turn spent fortified, and points is the whole
   * of the 2026-08-28 ruling: terrain, the trench, a card and a wall are one
   * kind of number on one ledger (Civ VI's form), so nothing here is a fraction
   * of a unit's own strength any more.
   */
  fortifyBonusPerTurn: number;
  /** Cap on the fortify bonus in points, however long a unit sits still. */
  fortifyMax: number;
  /** Fraction of strength a melee attacker loses attacking across a river. */
  riverAttackPenalty: number;
  /** Reserved for the flanking rule; 0 in v1, and nothing reads it yet. */
  flankingBonus: number;
  /**
   * Hit points a city has **before its buildings**; see `cityMaxHp`.
   *
   * **100 since 2026-08-28** (user ruling), halved from 200. Every other figure
   * that acts on a town's health is expressed against it — the capture fraction
   * is a fraction, the heal and the siege chip are flat — so halving the base
   * doubles what each of those is worth as a share, which is the intent: a
   * siege bites, a wall matters, and an army that has surrounded a town is not
   * spending twenty turns proving it.
   */
  cityBaseHp: number;
  /**
   * The floor under a city's garrison strength — what a town defends with when
   * its empire can build no soldier at all (the warrior's, today).
   *
   * `cityBaseStrength`'s replacement, and the field name records the change:
   * a city's strength is no longer a constant plus its size, it is **the best
   * unit its owner could train right now** (`explainCityStrength`), and this is
   * only the bottom of that.
   */
  cityMinStrength: number;
  /**
   * Defence each population point adds to a city. **0 since 2026-08-28**: the
   * ruling is that a city defends *equal to* its strongest trainable unit, and a
   * per-citizen term on top of that made a big town unattackable by anything its
   * own era could field. The line survives at zero rather than being deleted, so
   * dialling it back is a data decision.
   */
  cityStrengthPerPop: number;
  /** Hit points a city recovers every turn, up to `cityMaxHp`. */
  cityHealPerTurn: number;
  /** Fraction of a city's **maximum** hit points it holds the turn it is captured. */
  cityCaptureHpFraction: number;
  /**
   * Hit points a **besieged** city loses every turn, floored at 1 — see
   * `underSiege`. A siege never takes a town on its own; somebody has to attack.
   *
   * Unchanged at 5 across the 2026-08-28 halving of `cityBaseHp`, and that is
   * the decision rather than an oversight: it was 2.5% of a bare town's health
   * and it is **5%** of one now, so the same encirclement is worth twice what it
   * was. The figure a designer is really setting is that share, and it moves by
   * leaving this line still.
   */
  siegeDamagePerTurn: number;
  /**
   * Civilians attacked in melee change hands instead of dying. False would kill
   * them, which is a different game and a one-line change.
   */
  captureCivilians: boolean;
}

/**
 * The four numbers the naval line spends, and there are deliberately only four.
 *
 * Every *other* fact about a ship is on its roster row — the strengths, the
 * movement, the range, the labelled lines the triangle is made of — because they
 * describe *a hull* rather than the system, which is the same split `combat`
 * makes with `data/units.json` and the reason a thirteenth ship is a JSON row.
 * What is left here is what the **rules** say about being at sea at all: what an
 * attack costs a hull that keeps going, what a line of battle is worth, and what
 * a soldier caught on the water loses.
 */
export interface NavalRules {
  /**
   * Movement points a **hit-and-run** attack spends, in place of emptying the
   * purse. See `UnitDef.hitAndRun`, which is the marker; nothing else in the
   * game charges an attacker for the blow, because nothing else survives it with
   * anywhere to go.
   */
  hitAndRunCost: number;
  /** Strength points a heavy hull gains per adjacent friendly heavy hull. */
  lineBonusPerHull: number;
  /** The most **the line** is ever worth, in strength points. */
  lineBonusMax: number;
  /**
   * Strength points an **embarked** piece loses defending itself on the water,
   * unless a friendly light hull is sharing its hex. One labelled line, "At
   * sea", in the defender's fold.
   */
  atSeaPenalty: number;
}

/**
 * The system half of tile improvements. The per-improvement half (yields,
 * constraints, charge cost, tech renewals) lives in `data/improvements.json`,
 * because those describe *an improvement* rather than the system — the same
 * split `combat` makes with `data/units.json`.
 */
export interface ImprovementRules {
  /**
   * Gold the pillaging player's treasury gains for tearing one improvement out
   * of somebody else's ground.
   *
   * A flat figure rather than a fraction of what the improvement was worth: the
   * raid is priced by the *act*, and a scale that paid more for a plantation
   * than for a farm would quietly make luxuries the thing armies go for.
   */
  pillageGold: number;
  /**
   * Hit points the raid restores to the unit that struck the works, capped at
   * its type's maximum (2026-08-28, the user's ruling).
   *
   * The *second* half of what a raid pays, and it is here beside the gold rather
   * than on a card because it is what pillaging **is** now: a column burns a
   * farm and patches itself up on what it takes. Every raider gets it — an
   * empire's swordsman, and the wild, which gets nothing else (see `pillageAt`).
   *
   * It composes with the heal *riders* the way the gold composes with the gold
   * riders: this is the base `windfallPayout` is handed, and Scorched Earth's
   * own heal is added to it inside that one function rather than beside it.
   */
  pillageHeal: number;
  /**
   * Fraction a chop's printed base grows by, per technology the chopping
   * empire holds (the user's ruling, 2026-08-28) — `0.05` reads "5% a tech".
   *
   * Composed as `floor(chopYield × (1 + techsResearched.length × chopPerTech))`
   * in `chopBaseFor` (`improvements.ts`), which is *the* chop base every
   * caller reads — the sim's own settlement and the sheet's preview alike —
   * so the number on the button is the number the basket receives. Smaller
   * than a unit's own age band (`unitCostAgeMultiplier`) on purpose: a chop
   * should never become the *better* buy purely for having waited, so
   * clearing early stays the efficient choice even as the ladder climbs.
   */
  chopPerTech: number;
  /**
   * The **assay**: gold banked to the surveying empire's nearest owned city
   * every time a hill is prospected, strike or barren (the ratified vein spec,
   * `docs/themes/11-the-cartographers.md`).
   *
   * Paid on the *asking* rather than on the finding, which is the whole thesis
   * of the layer: what a survey buys is **certainty**, and a hill proved barren
   * has been made worth exactly as much to know about as a hill proved rich. A
   * bounty that paid only on a strike would have made the act a lottery ticket
   * and the barren mark a wasted turn.
   *
   * An Entry XVIII windfall like every other figure in this block — a printed
   * number, composed with its riders by `windfallPayout` before a coin is
   * banked, and modifier-immune afterwards.
   */
  assayGold: number;
}

/**
 * What an **international** route pays — the sender's four voices and the
 * host's one (`docs/trade.md`, "International routes").
 *
 * The whole table is flat figures, and that is the ruling rather than a
 * simplification: the domestic route reads the origin's buildings because the
 * goods are the origin's own, and a caravan sent abroad carries *trade* rather
 * than a granary's surplus — so what it is worth is a fact about two empires
 * meeting, not about what either of them has built. The one figure that scales
 * is the coin, and it scales on the same combined population the domestic route
 * counts, because that is how big the two markets are.
 *
 * Both sides are named here because both are paid: the empire that **sent** the
 * caravan takes `science`/`culture`/`gold` plus the population coin, and the
 * empire that **hosts** it takes `hostGold`. A route nobody wanted to host would
 * be a gift with no way to refuse it, which is precisely what the deferral of
 * 2026-08-28 was waiting on diplomacy to fix.
 */
export interface InternationalRouteRules {
  /** 🔬 the sender's empire banks per turn, flat. */
  science: number;
  /** 🎭 the sender's empire banks per turn, flat. */
  culture: number;
  /** 💰 the sender's empire banks per turn before the population coin. */
  gold: number;
  /**
   * Combined population of the two ends per further 💰 to the **sender**:
   * `floor((pop(from) + pop(to)) / goldPerCombinedPop)`.
   *
   * Its own knob rather than a reference to `TradeRules.goldPerCombinedPop`,
   * because the two answer different questions — how rich is a route between my
   * own towns, and how rich is a route between two empires — and a designer
   * retuning one must not silently move the other.
   */
  goldPerCombinedPop: number;
  /**
   * 💰 the **destination's** owner banks per turn, as a labelled line in that
   * city's own fold.
   *
   * The whole of what hosting is worth. It is a city line rather than an empire
   * line because a host's coin is paid by the town the caravan actually reaches
   * — the same seam the domestic route's food and hammers land in — and because
   * a player wondering why a rival's caravan is welcome should find the answer
   * on the sheet of the town that welcomes it.
   */
  hostGold: number;
}

/**
 * The system half of trade: how long a route runs, how far a caravan may be
 * sent, what a road costs its builder to keep and what killing a trader is
 * worth (`docs/trade.md`).
 *
 * The per-thing half is in the content tables where it belongs — the trader's
 * own price and speed on its `units.json` row, a building's `routeSlots` on its
 * row — because those describe *a thing* rather than the system. What is here is
 * every number a designer would reach for to answer "are caravans worth it".
 *
 * Nothing here is a probability either. A route is a fixed number of turns and a
 * fixed reach, and what varies is the board: a trading post at each end buys
 * three more turns of march, and roads buy the rest by making the march cheaper.
 */
export interface TradeRules {
  /**
   * How many turns a route pays before it lapses, counted from the turn the
   * caravan was sent (`Unit.trade.expiresTurn`, an **absolute** turn — the
   * timed-effect rule; nothing counts down).
   */
  routeTurns: number;
  /**
   * How far a partner may be, in **turns of the trader's own march**
   * (`pathTurns`) rather than in hexes.
   *
   * Turns rather than hexes so that roads extend a caravan's reach for free and
   * a mountain range shortens it, which is the honest reading of "how far can a
   * caravan walk" — and it is priced by the very function the panel prints
   * beside a standing order, so a route that is offered is a route that arrives.
   */
  rangeTurns: number;
  /**
   * Extra turns of range each **trading post** among the two endpoints is worth
   * (`City.tradingPost` — a city that has ever been an end of a route).
   *
   * The user's ruling, and the whole of what a post is for: the first route to a
   * town is the expensive one, and every route after it reaches further.
   */
  postRangeTurns: number;
  /**
   * Combined population of the two ends per 💰 a route pays:
   * `floor((pop(from) + pop(to)) / goldPerCombinedPop)`. The user's table —
   * the 2026-09-03 nerf halved the building rates and deliberately left this
   * coin at ten (the same day's follow-up ruling).
   */
  goldPerCombinedPop: number;
  /**
   * What a route ending in a **foreign** city pays, and to whom (ruled
   * 2026-09-03, `docs/trade.md`).
   *
   * A block of its own rather than five keys beside the domestic ones, because
   * it is a different table read by a different clause: an international route
   * pays **no building lines at all** — a foreign library is not yours to
   * harvest — so none of the knobs above is consulted for one, and the coin
   * here is deliberately its own number even though it happens to start at the
   * same ten.
   */
  international: InternationalRouteRules;
  /**
   * Origin buildings of the food-paying categories per 🌾 a route carries:
   * `floor(count / buildingsPerFood)`. The 2026-09-03 nerf's knob — at 1 this
   * is the old rule (a food per building), at 2 the ruled half.
   */
  buildingsPerFood: number;
  /**
   * `buildingsPerFood`'s twin for the hammer-paying categories:
   * `floor(count / buildingsPerProduction)` ⚒ per route.
   */
  buildingsPerProduction: number;
  /**
   * Population per 💰 a **connected** non-capital city pays its empire every
   * turn: `floor(pop / connectionPerPop)`.
   *
   * Civ V's city connection with the capital term dropped — see
   * `connectedCities` (`empireGold.ts`), which is where the flood fill lives.
   */
  connectionPerPop: number;
  /**
   * Road hexes per 💰 of upkeep an empire pays every turn:
   * `floor(roadsBuilt / roadsPerMaintenance)`, charged only for the roads that
   * empire's own caravans laid (`Tile.road` carries the builder's seat).
   *
   * The user's ruling — the first maintenance cost in the game, and deliberately
   * a cheap one: it exists so that sprawling a highway network is a decision
   * rather than a freebie.
   */
  roadsPerMaintenance: number;
  /**
   * How near a town a road has to be for **The Imperial Post** to keep it for
   * nothing (`behaviorRule: 'freeCityRoads'`), in hexes.
   *
   * On the trade block rather than on a card, for `roadsPerMaintenance`'s
   * reason: how far a post road reaches is a constant of the world, and the
   * technology only turns it on. Read in one place, `postedHexes`
   * (`empireGold.ts`).
   */
  postRange: number;
  /**
   * What killing somebody's laden caravan pays the killer's nearest owned city
   * (`settleTraderPlunder` in `trade.ts`).
   *
   * Three voices rather than one because a caravan carries goods, not coin: the
   * gold is the occasion's own figure that riders scale, and the food and the
   * hammers ride the same scaling so that "+50% on plundered caravans" means the
   * caravan and not a third of it — the camp bounty's rule exactly.
   */
  pillageBounty: {
    gold: number;
    food: number;
    production: number;
  };
}

/**
 * War: the peace that follows one, and what a town taken in one costs its
 * captor (`docs/war-diplomacy.md`, ruled 2026-09-03).
 *
 * Three numbers, and every one of them is a *duration or a share* rather than a
 * threshold — there is nothing here for a bot to clear or a player to reach,
 * because declaring is free in v1 and the only price of a war is the war. The
 * two puppet figures are Civ V's, said in this game's own currencies: a seized
 * town that has not been annexed asks its captor a little less writ and a
 * little less contentment, and it is a *relief* and a *share* rather than two
 * flat costs so that a designer retuning what a captured city costs at all
 * (`meters.authority.capturedCity`) moves both readings at once.
 */
export interface WarRules {
  /**
   * Turns of truce a peace deal buys, counted from the turn the peace resolved
   * — an **absolute** expiry once it is written down (`Truce.untilTurn`, the
   * timed-effect rule: nothing counts down).
   *
   * The whole of "you may not re-declare on the empire you just made peace
   * with", and the whole of what a finished war leaves behind: there is no
   * grudge, no memory and no reputation in v1 (the worksheet, section 1).
   */
  truceTurns: number;
  /**
   * Turns a signed bargain runs for, counted from the turn it was signed — an
   * **absolute** expiry once written (`DealState.untilTurn`, the timed-effect
   * rule: nothing counts down).
   *
   * One duration for every kind of term, and that is the design rather than a
   * simplification: a tribute, a lent seam and a right of way all lapse at the
   * same age, so "what have we agreed" is one countdown a player can hold in
   * their head, and a deal is re-struck rather than renegotiated. Twenty turns
   * (the ruling, 9b).
   */
  dealTurns: number;
  /**
   * Authority a **puppet** is spared against what a kept conquest costs
   * (`meters.authority.capturedCity`).
   *
   * A relief rather than a price of its own, so that the ladder of returns
   * stays one ladder: a designer who makes conquest dearer makes puppetry
   * dearer in the same breath, and the *difference* between the two — which is
   * the whole of the decision a captor is being offered — stays exactly this
   * number. Floored at nothing where the two meet, like every other authority
   * reading.
   */
  puppetAuthorityRelief: number;
  /**
   * What a puppet's citizens ask for, as a percentage of what the same citizens
   * would ask for in an annexed town.
   *
   * A share rather than a second demand curve, for `puppetAuthorityRelief`'s
   * reason: the curve is `meters.happiness`' and a puppet simply pays less of
   * it. It reaches the meter as a **gain line** ("Uruk · puppet") rather than
   * as a quieter cost line, because hard rule 5 says a player who is charged
   * less is entitled to see the discount.
   */
  puppetHappinessPercent: number;
}

/**
 * The wild: how often camps appear, where they may stand, what comes out of
 * them, and what clearing one is worth (design ledger, Entry XX).
 *
 * Every number the barbarian system is made of. The *algebra* is
 * `src/sim/barbarians.ts`; the per-unit half of it is `data/units.json` as it is
 * for every other army, because the wild fields the same roster everybody else
 * does — it simply does not have to pay for it.
 *
 * Nothing here is a probability. Camps and their bands arrive on **cadences**
 * (`campEveryTurns`, `unitEveryTurns`) with hard caps beside them, so a run of
 * bad luck cannot bury an empire and a run of good luck cannot make the wild a
 * decoration. The one die the system rolls is *which* legal tile a camp lands on,
 * and it is drawn from `state.rng` like every other roll in the game.
 */
export interface BarbarianRules {
  /** First turn a camp may appear at all. The opening is meant to be quiet. */
  firstCampTurn: number;
  /**
   * A camp-founding sweep runs every this many turns, from `firstCampTurn`.
   *
   * **The faucet is the pair, not this number** (2026-08-28). What a designer is
   * actually setting is `campsPerSpawn / campEveryTurns` camps per turn, and
   * these two integers are how that fraction is written down — which is why the
   * ruling that asked for "half again as many camps" moved *both*: one every two
   * turns is 0.5, and three every four turns is 0.75. Reaching for the cadence
   * alone cannot express it, because ⌈2 × ⅔⌉ is still 2.
   */
  campEveryTurns: number;
  /**
   * How many camps one sweep may found.
   *
   * The numerator of the faucet above. `foundCamps` rebuilds its candidate list
   * between camps within one sweep, so a sweep that founds several still obeys
   * `minCampDistanceApart` — raising this scatters camps, it does not stack them.
   */
  campsPerSpawn: number;
  /**
   * Hard ceiling on live camps, however long the game runs.
   *
   * The other half of "how much wild is there", and it moves *with* the faucet:
   * a ceiling left where it was turns a faster faucet into nothing but reaching
   * the same board sooner. The board is self-limiting under it either way —
   * `canFoundCampAt` refuses ground anybody can see or owns, so a well-patrolled
   * world never reaches this number.
   */
  maxCamps: number;
  /** How far a new camp must stand from every city, anyone's. */
  minCampDistanceFromCity: number;
  /**
   * How far a new camp must stand from every start position.
   *
   * Distinct from the city rule and not redundant with it: a player who has not
   * founded yet still owns the ground they opened on, and a camp planted on a
   * capital's doorstep before the settler stops walking is a coin flip rather
   * than a difficulty.
   */
  minCampDistanceFromStart: number;
  /** How far a new camp must stand from every camp already standing. */
  minCampDistanceApart: number;
  /** A camp musters a unit every this many turns after it was founded. */
  unitEveryTurns: number;
  /** How many live units one camp may have in the field at once. */
  maxUnitsPerCamp: number;
  /**
   * How far from its camp a unit still counts against `maxUnitsPerCamp`.
   *
   * A band that has marched off to besiege a town is no longer the camp's
   * garrison, so the camp may muster again — which is what makes a camp left
   * standing a *faucet* rather than a one-off.
   */
  campUnitRadius: number;
  /** How far a barbarian unit will look for something to attack. */
  aggressionRadius: number;
  /**
   * How far a raider will look for an **unguarded civilian to steal**.
   *
   * Its own number rather than a share of `aggressionRadius`, and deliberately
   * the shorter of the two: a band goes out of its way for a worker it can
   * nearly touch, not across a province. Raise it above `aggressionRadius` and
   * the wild becomes a kidnapping engine that walks past armies; drop it to 0
   * and thieving is switched off entirely, leaving v1's raiding behind.
   */
  theftRadius: number;
  /**
   * How far from its cargo a raider still counts as that cargo's escort.
   *
   * One hex looser than the station it actually keeps (adjacent, or the cargo's
   * own hex), because a worker walks two hexes a turn and a guard that fell a
   * step behind must not be *reassigned* — the role is derived fresh every turn
   * from where everybody is standing (see `barbarianRoles`), so the leash is the
   * only thing keeping an escort escorting.
   */
  escortRadius: number;
  /** How far from its camp a unit with nothing to attack will drift. */
  wanderRadius: number;
  /** How far from a horses tile a camp counts as horse country. */
  horsesRadius: number;
  /**
   * First turn horse country musters horsemen rather than footmen.
   *
   * The turn gate **is** the horseman's tier check, deliberately: the wild does
   * not research Husbandry, so a date on the calendar stands in for it. Without
   * it a camp beside a herd would be fielding cavalry against warriors on turn
   * ten, which is not difficulty, it is a coin flip about where a camp landed.
   */
  horsemanFromTurn: number;
  /**
   * Flat combat strength every *real* empire adds when it fights the wild,
   * attacking or defending.
   *
   * Flat rather than a percentage because the damage curve is exponential in the
   * *difference* of two strengths (see `combat.ts`): a flat +2 is worth the same
   * multiplier against a warrior as against a longswordsman, which is exactly the
   * property "barbarians are a nuisance, not a scaling threat" wants.
   */
  combatBonus: number;
  /** Gold the clearing empire's treasury gains for taking a camp. */
  campClearGold: number;
  /** Food the clearing empire's nearest owned city banks for taking a camp. */
  campClearFood: number;
}

/** Relative desirability of each yield when a citizen picks a tile to work. */
export interface CitizenWeights {
  food: number;
  production: number;
  gold: number;
}

/**
 * The tile-purchase price, which is Civ 6's shape with this game's numbers in
 * it: a base that depends only on how far out the tile is, a premium that rises
 * with how far the *world* has come, and a flat escalation per tile this player
 * has already bought.
 *
 * Three terms rather than one curve because each answers a different question a
 * player asks — "how far away is it", "how late is it", "how greedy have I
 * been" — and rule 5 means the price is *shown* as those three lines
 * (`explainTilePrice` in `cities.ts`). A single opaque formula could not be
 * printed honestly.
 */
export interface TilePurchaseRules {
  /**
   * Base price by ring, indexed by hex distance from the city centre; anything
   * beyond the last entry pays the last entry. Ring 0 is the centre, which is
   * never for sale, so its entry never gets read — it is in the table to keep
   * the index and the ring the same number.
   */
  ringBase: number[];
  /**
   * How much the base grows across a whole game: the multiplier is
   * `1 + progressFactor · gameProgress`, where progress is the fraction of the
   * tech tree this player has researched. At 2 a tile at the end of the tree
   * costs three times its opening price, which is what stops a late empire
   * buying a province out of pocket change.
   */
  progressFactor: number;
  /** The scaled base is rounded to a multiple of this. Civ's tidy price tags. */
  roundTo: number;
  /**
   * Added per tile this player has *ever* bought, anywhere. Per player and not
   * per city, exactly as Civ 6 has it: the escalation is meant to price a
   * strategy of buying land, and a strategy is an empire's, not a town's.
   */
  perPriorPurchase: number;
}

/**
 * A fraction written as two integers, so a comparison against it is **exact**.
 *
 * `0.3334` and `1/3` are two different numbers and a share cap written in
 * floating point is a cap that lets a ninth specialist into a size-27 city on
 * one machine and not on another. Every reading multiplies out instead —
 * `den × (n + 1) <= num × population` — which is integer arithmetic end to end
 * and is what keeps hard rule 2 true of a rule expressed as a proportion.
 */
export interface Fraction {
  num: number;
  den: number;
}

/**
 * Guilds: how a town's own renown turns citizens into specialists (ledger Entry
 * XLVIII).
 *
 * The shape is the design read straight off the page. Each city banks an inflow
 * every turn — what its **buildings** earn in renown for the four specialist
 * families, plus a trickle back from the specialists it already has, plus a
 * weight on its sheer size — into `City.guildBasket`. When the bar covers the
 * threshold, one citizen leaves the fields.
 *
 * The three terms of the inflow are three different statements and that is why
 * they are three numbers rather than one curve:
 *
 *   · **renown** is the engine and the *gate* — a city with no renown building
 *     in any specialist family never forms a guild, whatever the other two
 *     terms say. A trade needs a building to name it;
 *   · **`trickle`** is the loop: a guild is a place apprentices are trained, so
 *     it accelerates the next one. It only ever accelerates — see the gate;
 *   · **`popWeight`** is the crowd (the user's amendment, 2026-08-29). A big
 *     town has more people than good hexes, which is the problem this whole
 *     system exists to answer, so size itself hurries the trades along.
 *
 * The threshold is the **growth curve's own three terms** — `base + linear × n +
 * n ^ exponent` over the specialists a town already holds, 60 · 67 · 75 · 84 ·
 * 93 — and it is that shape on the user's ruling of 2026-08-29 rather than by
 * coincidence: a player who has learnt one escalating basket in this game has
 * learnt all of them, and a guild is a growth curve wearing a different hat. See
 * `guildThreshold` (`specialists.ts`), which mirrors `growthThreshold` term for
 * term.
 *
 * **The cap is what sets the late count, and the base is what sets the first
 * turn.** Two earlier tunings tried to do both with the threshold and could not:
 * a curve steep enough to stop a tall capital going entirely specialist was a
 * curve an ordinary town never climbed at all. Splitting the job is what fixed
 * it — a quarter share pins a size-22 capital at five guilds, a size-12 town at
 * three and a village of six at one, whatever the curve does, and the base is
 * then free to be a *pace* rather than a brake.
 */
export interface GuildRules {
  /** What the *first* specialist in a city costs the bar. Sets the first turn. */
  base: number;
  /** The linear term, per specialist already held. `growthLinear`'s twin. */
  linear: number;
  /** The superlinear term's exponent. `growthExponent`'s twin, and equal to it. */
  exponent: number;
  /** Renown a standing specialist puts back into the bar every turn. */
  trickle: number;
  /** Bar filled per point of population every turn, whatever the town holds. */
  popWeight: number;
  /**
   * Bar filled per **idle** citizen every turn — a citizen the town has no hex
   * left to seat (the user's backstop, 2026-08-29).
   *
   * Twenty times `popWeight`, and deliberately so: an idle citizen is the exact
   * problem this whole system exists to answer, standing in the open with
   * nothing to do, and a town in that state should not have to wait out an
   * ordinary curve. See `guildIdleLine` for the other half of the backstop — an
   * idle citizen also converts *past* the share cap, because the cap is about
   * pulling people off the land and an idle citizen is not on any.
   */
  idleWeight: number;
  /**
   * The most of a town's people who may be specialists, as an exact fraction.
   *
   * A **gate on conversion only**: a city that shrinks under its own cap keeps
   * every specialist it has. Nothing in this game dismisses a citizen on the
   * player's behalf, and a famine that turned three guildsmen back into farmers
   * would be the growth system quietly reaching into a system it does not own.
   *
   * At a quarter this is the number that answers "how many guilds does a big
   * city end up with": five in a capital of 22, three in a town of 12, one in a
   * village of six.
   */
  maxShare: Fraction;
  /** What one specialist of each family pays its city every turn. */
  pays: Record<SpecialistFamily, ResourceYieldBag>;
  /** Renown a standing specialist pays **its own family's** feed every turn. */
  renownPerSpecialist: number;
}

export interface CityRules {
  /** How far from its centre a city may assign citizens, in hexes. */
  workRadius: number;
  /** How far from its centre a city's borders may ever reach, in hexes. */
  claimRadius: number;
  /**
   * Minimum hex distance between two city centres, anyone's — so the ground
   * *within* `minCitySpacing − 1` hexes of an existing city is refused to a
   * settler (see `foundingErrorAt`).
   *
   * At 4 that exclusion is exactly `workRadius`: no town may be planted inside
   * the ring another town already works, which is the rule this game states in
   * the one sentence a player can hold — "not within three hexes of a city".
   * The two numbers are still independent knobs; they merely agree today.
   */
  minCitySpacing: number;
  /** Food one population point eats every turn. */
  foodPerCitizen: number;
  /**
   * Growth curve. The food a city of population `n` must bank to reach `n + 1`
   * is `growthBase + growthLinear · (n − 1) + (n − 1) ^ growthExponent`,
   * floored — linear early, superlinear later, so a size-2 city grows in a
   * handful of turns and a size-12 one takes an age.
   *
   * **The first citizens cost a third less since 2026-08-28** (user, playtest:
   * "the first few population feel a bit slow considering how fast other things
   * seem to ramp up"), which is 10 · 6 · 1.65 rather than 15 · 8 · 1.65. Both
   * *height* terms come down and the exponent is untouched, for the border
   * curve's reason inverted: the discount is meant to be felt at the bottom and
   * to fade on its own, and the superlinear term is what makes it fade. The
   * schedule is now 10 · 17 · 25 · 34 · 43 · 54 · 65 (was 15 · 24 · 34 · 45 ·
   * 56 · 69 · 82) — a third off the second citizen and a fifth off the eighth.
   */
  growthBase: number;
  growthLinear: number;
  growthExponent: number;
  /**
   * What a town **that cannot drink** banks of its food surplus, as a signed
   * percentage, until an aqueduct is raised in it (user ruling, 2026-09-03:
   * "off-fresh settles grow at −30% speed until an aqueduct is built").
   *
   * A rule of the game and therefore a number here rather than a card: every
   * empire lives under it from turn one, and there is no row to hang it on. It
   * is one more line of `explainGrowthPercent` (`cities.ts`) and folds with the
   * meters' stifle and the Hanging Gardens exactly as they fold with each other
   * — summed once, multiplied once (Entry XIV.D.4's channel).
   *
   * "Cannot drink" is `cityHasFreshwater` and nothing else, so a card that
   * declares the fact lifts the penalty for the same reason a river does; and
   * the aqueduct lifts it off the building's own marker (`BuildingDef.waters`),
   * which is a *town's* water and deliberately not the ground's — an aqueduct
   * feeds people, not fields, so it never satisfies the freshwater predicate a
   * cistern or a `freshwater`-scoped card asks.
   *
   * Signed like `growthStifle`'s rows, so the fold adds it and the panel prints
   * it without anybody negating a number first.
   */
  drySettlePercent: number;
  /**
   * Food basket at or below which the city loses a population point. At −1 that
   * is "any deficit at all starves somebody", which is the Civ V feel; the
   * basket is emptied either way and population never falls below 1.
   */
  starvationShrinksAt: number;
  /**
   * What a city centre is worth before the ground under it is consulted. The
   * centre is worked for free and is never a citizen slot, and a city on a snow
   * tile still feeds itself, so it pays the *larger* of this and the tile's own
   * yield **per voice** — a town on a 3🌾/2🪙 seam keeps the food and the gold
   * and takes the production from here (`explainCentreYield`, `cities.ts`).
   *
   * 2🌾/2⚙ is the ratified opening (user decision, 2026-08-25): the old floor of
   * 3🌾 fed a capital a point of food no ground had earned, which made every
   * flat start the same start and hid the difference between planting on grass
   * and planting on a river. Two is the citizen's own upkeep
   * (`foodPerCitizen`), so a size-1 town on bare ground now feeds itself and
   * grows on what it *works* rather than on a subsidy. The pacing that follows
   * is measured, not assumed — see the opening and age-close tests in
   * `test/sim/tech.test.ts`.
   */
  baseCityYields: TileYieldSpec;
  /** Science each population point produces, before buildings. */
  sciencePerPop: number;
  /** Culture every city produces just by existing, before buildings. */
  baseCulturePerCity: number;
  /**
   * Gold the **palace** pays, in the capital and nowhere else (the user's
   * ruling, 2026-08-28).
   *
   * The palace is not a building — there is no row for it and nothing is ever
   * built — so this joins the other two things it supplies, `meters.palace`
   * (happiness) and `meters.palaceCapacity` (authority), rather than
   * `data/buildings.json`. It is paid as one labelled "Palace" line in the
   * capital's yields (`explainPalaceYield` in `cities.ts`), which is what keeps
   * it inside Entry XVII's staging: a seat of government is a fact about a town
   * and its coin is multiplied like a market's.
   *
   * It follows the capital rather than the city, which `capitalCityOf` already
   * settles: a capital lost and won back does not resume the palace.
   */
  palaceGold: number;
  /**
   * Border cost curve. The `t`-th tile a city claims beyond its initial ring
   * costs `borderCostBase + borderCostLinear · (t − 1) ^ borderCostExponent`
   * culture, floored. The initial claim at founding is free and is not counted.
   *
   * Civ 6's own numbers (10 · 6 · 1.3) rather than invented ones, because they
   * are the numbers a decade of play has already sanded down and because the
   * pacing they give here is the pacing the design asked for: a capital with a
   * monument takes its third tile around turn 20 and its fourth around turn 32
   * (`test/cities.test.ts`, "a monument buys three or four tiles by the early
   * game"). Only the *pacing* is Civ 6's; which tile is taken is still this
   * game's best-yield chooser.
   *
   * **Cheap early and steeper after, since 2026-08-28** (user, playtest: "make
   * early tiles easier to get with culture, we can ramp more over time"), which
   * is 6 · 4 · 1.45. The previous pass took a flat tenth off the two height
   * terms and kept the shape; this one deliberately does *not* keep the shape.
   * The height comes down again **and** the exponent goes up, so the discount is
   * spent entirely on the opening tiles and has paid itself back by the eighth:
   * the schedule is 6 · 10 · 16 · 25 · 35 · 47 · 59 · 73 against the old 9 · 14
   * · 22 · 31 · 41 · 52 · 64 · 76. A third off the first tile, a quarter off the
   * second, and level by the last — which is the ramp the note asked for, rather
   * than a discount that grows with the empires already expanding fastest.
   */
  borderCostBase: number;
  borderCostLinear: number;
  borderCostExponent: number;
  /** What gold asks for a tile culture has not reached yet. */
  tilePurchase: TilePurchaseRules;
  /** How a town's people leave the fields for the trades. See `GuildRules`. */
  guilds: GuildRules;
  /** Weights the citizen assigner and the border chooser both score tiles with. */
  citizenWeights: CitizenWeights;
  /**
   * The same weights for a city whose growth is **halted** — a settler at the
   * front of the queue (`growthIsHalted`).
   *
   * A second sheet rather than a modifier, because the edit a designer wants to
   * make here is "what does a town care about while it is building a settler",
   * and that is a set of weights, not a multiplier on one of them. The shipped
   * pair is the same three numbers with food and production **swapped**: a town
   * that banks no food toward growth is a town whose surplus grain goes nowhere,
   * so the hammers that finish the settler are worth more than the bushels that
   * do not. Food is not zeroed, and that is deliberate — the citizens still eat,
   * and a sheet that ignored them would be a sheet that starves the town to
   * build the settler faster. See `assignCitizens`, which also refuses the
   * swapped sheet outright when it would put the town into deficit.
   */
  citizenWeightsWhileHalted: CitizenWeights;
  /**
   * How a city's borders pick their next tile (`expansionScore`, `cities.ts`).
   *
   * Split from `citizenWeights` deliberately — Ruling 2 (user, 2026-08-29:
   * "coastal cities expanding to useless coastal tiles with no resources")
   * wanted the *border chooser* retuned without moving what a citizen sits on,
   * and a shared sheet could not do both. `yieldWeights` defaults to the same
   * 3/2/1 as `citizenWeights` but is its own table so the two can diverge
   * later without one edit silently touching the other.
   */
  expansion: ExpansionRules;
  /**
   * City names, handed out in order per player. A player who founds more cities
   * than there are names falls back to `"<player name> <n>"`.
   */
  cityNames: string[];
}

/**
 * The border chooser's scoring terms, each a labelled addend so
 * `expansionScore` reads as the sum a designer would draw on paper: what the
 * ground yields, plus a resource this empire can actually see, minus a bare
 * stretch of water, minus a penalty for reaching further out.
 */
export interface ExpansionRules {
  /** Weights `yieldScore` folds a candidate tile's yield with. */
  yieldWeights: CitizenWeights;
  /**
   * Added when the tile carries a resource this empire's technologies reveal
   * (`resourceIsVisibleTo`) — never an unrevealed one, which would leak the
   * map through the AI's own expansion choices.
   */
  resourceBonus: number;
  /**
   * Subtracted from a water tile that carries no *visible* resource — the
   * "useless coastal tile" the ruling names. A revealed fish or whale still
   * earns `resourceBonus` on top of its yield and is never penalised.
   */
  bareWaterPenalty: number;
  /**
   * Subtracted by ring (hex distance from the city centre), index matching
   * `ringOf`'s reading — the same table shape as `tilePurchase.ringBase`.
   * Anything beyond the last entry pays the last entry. Ring 3 alone carries a
   * penalty today ("slightly more unfavoured"), rings 0–2 untouched.
   */
  ringPenalty: number[];
}

/**
 * The two empire meters (design ledger, Entries I and XIV). Every number the
 * happiness/authority system is made of; the algebra is `src/sim/meters.ts`.
 *
 * Supply and demand are split into their own sub-blocks rather than being one
 * flat list, because a designer retunes one side of a meter at a time: "the
 * palace is too generous" and "cities are too cheap" are different edits.
 */
export interface HappinessRules {
  /** Happiness the capital supplies just by being the capital. */
  palace: number;
  /**
   * Happiness each *unique* improved luxury the empire has access to supplies.
   * Unique, so two improved silk seams are one silk (design ledger XIV.D.3).
   */
  perUniqueLuxury: number;
  /** Demand each population point makes. */
  demandPerPop: number;
  /**
   * Crowding: a city of population `n` demands
   * `demandPerPop · n + crowdingWeight · max(0, n − crowdingFrom) ^ crowdingExponent`.
   * Superlinear *within* a city and never in empire-total pop — Entry I's second
   * commitment, which is what keeps happiness a vertical limiter.
   */
  crowdingWeight: number;
  crowdingFrom: number;
  crowdingExponent: number;
}

export interface AuthorityRules {
  /** Capacity the capital supplies. */
  palaceCapacity: number;
  /** Capacity each age *advance* supplies. See `agesAdvanced` in `meters.ts`. */
  perAge: number;
  /** What the capital costs. Free in v1, and a number so it can stop being. */
  capital: number;
  /** What an ordinary city the player founded costs. */
  foundedCity: number;
  /** What a coastal city costs instead — a discount, never an exemption. */
  coastalCity: number;
  /**
   * What a city taken by force costs. Dearer than either, and it outranks the
   * coastal discount: a seized harbour is a thing you seized (Entry XIV.D.2).
   */
  capturedCity: number;
}

/**
 * One rung of a percentage ladder, and the comparison that admits it.
 *
 * Three optional comparators rather than one, because the two ladders this game
 * has do not agree on their boundaries: the bonus/malus tiers are inclusive
 * (`≥ +5`, `≤ −5`) while the growth stifle's first rung is "any deficit at all",
 * which is `< 0` and is *not* `≤ 0` — a happiness of exactly zero is a balanced
 * empire, not a starving one. A rung applies when any comparator it declares is
 * satisfied; `stepPercent` takes the deepest rung that applies.
 */
export interface MeterStep {
  whenAtOrAbove?: number;
  whenAtOrBelow?: number;
  whenBelow?: number;
  /** Signed whole percent this rung is worth. */
  percent: number;
}

export interface MeterRules {
  happiness: HappinessRules;
  authority: AuthorityRules;
  /**
   * The bonus/malus ladder both meters read: `≥ +5 → +10%`, `≥ +10 → +20%`, and
   * the mirror image below zero. *Which* yields each side of each meter moves is
   * a design rule and lives in `meters.ts`; this is only how far.
   */
  tiers: MeterStep[];
  /** Magnitude cap on a tier, however deep the table grows. */
  tierClamp: number;
  /**
   * The growth stifle's own, steeper ladder (design ledger XIV.D.4, user
   * 2026-08-23: "actually impactful"). It deliberately does not share `tiers` —
   * a happiness deficit is meant to stop a wide empire growing rather than to
   * shave a percent off it. Multiplies food *surplus* only, never base food, so
   * the worst rung stalls growth and still cannot starve a citizen.
   */
  growthStifle: MeterStep[];
  /**
   * The border freeze: what authority does to a city's border-culture accrual
   * when the writ is in deficit (design ledger XIV, playable.md item 2 — "borders
   * FREEZE at negative authority").
   *
   * A ladder of its own for `growthStifle`'s reason, and with `growthStifle`'s
   * boundary: `< 0`, so an empire in exact balance still claims ground. One rung
   * today, at −100%, because a freeze is not a slowdown — an empire that has
   * over-reached stops taking land at all, and buying it is barred with it
   * (`bordersFrozen`). It is a table rather than a constant so that a softer
   * first rung ("−50% below zero, frozen below −5") is a data edit.
   */
  borderFreeze: MeterStep[];
}

export interface ResearchRules {
  /**
   * Technologies every player begins the game already holding.
   *
   * The opening kit: without it a new city could build nothing at all, because
   * every unit and building in `data/techs.json` is gated by some node. Kept
   * here rather than as a flag in the tree so that "what you start with" is one
   * short list a designer can read, and so that a scenario can hand out a
   * different one without editing the tree.
   */
  startingTechs: TechId[];
  /**
   * Gold one unit pays, once, when it auto-upgrades (Entry V's "retooling"
   * lever). At 0 upgrading is free, which is the v0 setting: the decision is
   * meant to live in army composition and tech timing, not in an upkeep bill.
   * A unit whose owner cannot afford it simply does not upgrade this turn.
   */
  retoolCost: number;
}

/**
 * The system half of what a city builds. The per-thing half — a unit's `cost`,
 * a building's, a project's — lives in the content tables, because those
 * describe *a thing* rather than the system.
 *
 * One knob today, and it exists because the two halves of the game move at
 * different rates. Beaker costs climb roughly nine-fold between Age I and Age
 * III (16🔬 → 380🔬) while the roster's hammer prices climb about twice, so a
 * late empire's science pace buys it units that are, relative to everything
 * else it can spend hammers on, nearly free. The multiplier reprices the roster
 * by the age of the technology that unlocks it rather than by hand, so a
 * designer retuning "how much dearer is a later army" edits one array instead
 * of fourteen rows — and the Age I numbers, which the opening is balanced
 * against, are untouched at ×1.
 */
export interface ProductionRules {
  /**
   * Multiplier on a unit's printed cost, indexed by `age − 1` of the technology
   * that unlocks it. An ungated unit, and any age past the end of the array,
   * takes the first entry. Applied inside `unitProductionCost` as its own
   * labelled line (`explainUnitCost`), never at the point of sale.
   */
  unitCostAgeMultiplier: number[];
  /**
   * Gold one hammer of an item's **full** production cost costs to buy outright
   * (M9's purchases, ledger Entry XXIX). The whole of the conversion, in one
   * number, applied as its own labelled line by `explainPurchaseCost`
   * (`purchase.ts`) — so the settler ladder and the age band flow into a price
   * tag because they are already lines of the cost being converted.
   *
   * It reads off the **full** cost and never the remainder: a city half way to a
   * settler pays the same coin as one that has banked nothing, and the hammers
   * it had banked are still in the basket afterwards. Charging the remainder
   * would make the best moment to buy anything "one turn before it finishes",
   * which is the moment buying is worth least.
   */
  goldPerHammer: number;
  /**
   * Faith one hammer of a **contribution** costs (design ledger Entry LV).
   *
   * `goldPerHammer`'s sibling one bank over, read by the one function that
   * prices a contribution (`explainContribution`, `purchase.ts`) and by nothing
   * else. There is no faith *purchase* rate — the roster's own bank sells the
   * augur and the prophet at their own prices — so this number does exactly one
   * job: it says what a candle is worth against a coin when a congregation is
   * hurrying its cathedral.
   *
   * **1 against gold's 2**, and the halving is the point: faith is the scarcer
   * bank by a wide margin (nothing but a shrine, a temple and a signature pays
   * it, and an augur is forty of it), so a rate equal to gold's would make the
   * faith button the one nobody ever presses. At 1 a devout empire converts its
   * whole pool into a cathedral roughly twice as efficiently as a rich one
   * converts its treasury, which is what "funded every posture's own way" means.
   */
  faithPerHammer: number;
  /**
   * Gold each hammer banked toward a wonder is worth when somebody else
   * finishes it first (the wonders framework, 2026-08-27).
   *
   * **1, and the 1 is the penalty.** `goldPerHammer` above is 2 — what a hammer
   * costs to buy outright — so a lost wonder hands back exactly *half* of what
   * the work would have cost in coin, and losing a race is a real loss rather
   * than a lossless detour through the treasury. A rate of 2 would make queuing
   * a wonder you expect to lose a way of laundering hammers into gold at par;
   * 0 would make it a trap nobody races twice.
   *
   * It is a rate here rather than a constant in code for the reason every other
   * number in this file is: it is a tuning decision about how sharply the game
   * punishes second place, and a designer should be able to try 1.5 without
   * opening TypeScript. Applied in one place — `refundBeatenWonders`
   * (`cities.ts`) — and floored there, because a treasury is whole numbers.
   */
  wonderRefundGoldPerHammer: number;
}

/**
 * Maintenance, and what happens to an empire that cannot pay it (the user's
 * ruling, 2026-08-28). The algebra is `src/sim/upkeep.ts`.
 *
 * Four numbers and they are four different decisions: what an army costs, what
 * an institution costs, how badly a bankrupt empire thinks, and how deep the
 * hole has to be before the creditors take a piece.
 */
export interface UpkeepRules {
  /**
   * Gold per turn a combat unit costs, **per age of the technology that unlocks
   * it** — so a warrior is 1, a swordsman 2, a knight 3. A rate rather than a
   * table, because "an old unit is cheap to keep" is the rule and the ages are
   * already written down in `data/techs.json`.
   */
  goldPerUnitAge: number;
  /**
   * The same, for a building that carries `renown` — a barracks 1, a market 2,
   * a university 3. Wonders are exempt (see `buildingUpkeep`), which is a
   * design decision and not a consequence of this number.
   */
  goldPerBuildingAge: number;
  /**
   * What being in debt does to science and culture, in whole percent, as an
   * **empire-stage** line in `cityYieldPercents` (Entry XVII) — so it sums with
   * the meter tiers before one multiplication rather than compounding after
   * them.
   *
   * Signed, and negative: it is written as the percentage it *is* rather than
   * as a magnitude to be subtracted somewhere, which is the same shape every
   * other percentage in this game carries. Gold and food and hammers are
   * deliberately untouched — an empire in arrears must still be able to dig
   * itself out, and taxing the treasury of a negative treasury is a spiral with
   * no floor.
   */
  debtPercent: number;
  /**
   * The treasury below which the creditors take a unit — **one per turn**, the
   * dearest first (`disbandCandidate`).
   *
   * Strictly below, and negative: a treasury may go under water and stay there,
   * which is the whole of the ruling; what it may not do is go under water
   * *arbitrarily far*. One piece per turn rather than "as many as it takes",
   * because disbanding banks no gold — it only lowers next turn's bill — so a
   * loop that ran until the treasury recovered would run until the army was
   * gone.
   */
  disbandBelow: number;
}

/**
 * The renown ladder — the fifth Entry XVIII bucket (`docs/great-people.md`).
 *
 * Two numbers, and they are the settler ladder's shape one currency over: the
 * first great person costs `first`, and every one an empire has already
 * recruited puts `step` on the price. Escalating by *recruits* rather than by
 * turns is what keeps a wide empire's faster trickle from becoming a faster
 * *rate* of great people — it buys the same names sooner and then pays more for
 * each, exactly as it does for settlers and for augurs.
 */
export interface RenownRules {
  /** What the first great person costs. */
  first: number;
  /** What each one already recruited adds to the next one's price. */
  step: number;
}

/**
 * What a great person's **act** pays, per family.
 *
 * Every figure is an Entry XVIII.5 printed number: it is paid through the seam
 * its bucket already has (`settle…Windfall`), unmodified by city percentages,
 * meter tiers or Entry XVII staging. Two of them are quoted in the money of the
 * era they are paid in (`highestAge`), which is `windfallRider.perAge`'s rule
 * applied to a payout with no card behind it — a hurry that was worth a granary
 * in Æra I should still be worth something in Æra III.
 */
export interface GreatPeopleRules {
  /**
   * The act's age, per technology (user, 2026-08-30): every **flat** act figure
   * — the engineer's hammers, the merchant's gold — pays ×(1 + actPerTech ×
   * technologies researched), the chop's shape one system over. The two arms
   * quoted in *turns of a rate* (`actGainTurns`) are deliberately outside it:
   * a figure read off what the empire is already banking grows with the tree by
   * construction, and scaling it twice would compound.
   */
  actPerTech: number;
  /**
   * How many turns of the empire's **own rate** a rate-quoted act pays (user,
   * 2026-09-03, the great-people nerf pass): the scholar's beakers and the
   * artist's culture are both "this many turns of what you are already making",
   * read through the one seam that answers that question
   * (`empireRateReading`, `cities.ts`).
   *
   * One knob for the two families rather than one each, because it is one
   * sentence: *an act is worth a few turns of your empire*. A designer who wants
   * the scholar and the artist to diverge splits it then, which is a design
   * decision rather than a tuning pass.
   */
  actGainTurns: number;
  /** Hammers an engineer's act pays, **multiplied by the empire's era**. */
  engineerHammers: number;
  /** Gold a merchant's act pays, **multiplied by the empire's era**. */
  merchantGold: number;
  /** Happiness an artist's act hangs on the town. */
  artistHappiness: number;
  /** How many turns that happiness lasts. */
  artistTurns: number;
  /** How far a general's act reaches, in hexes. */
  generalRadius: number;
  /** Strength a general's act hangs on every piece in reach. */
  generalCombat: number;
  /** How many turns that strength lasts. */
  generalTurns: number;
  /**
   * How far a great general's **standing aura** reaches, in hexes (user,
   * 2026-08-28).
   *
   * Its own pair of numbers rather than `generalRadius`/`generalCombat` reused,
   * because the act and the aura are two different offers a player weighs
   * against each other: the act is a burst that heals a column and expires, the
   * aura is what the piece is worth for as long as it is left standing. A
   * designer sharpening one must be able to leave the other alone.
   */
  generalAuraRange: number;
  /** Strength every friendly soldier in that reach fights with. */
  generalAuraStrength: number;
  /** How far a citadel claims ground around itself, in hexes. */
  citadelClaimRadius: number;
  /**
   * What buying an early recruitment costs in gold — The Commonwealth's price.
   *
   * A **flat** figure rather than a share of the ladder, and that is the design:
   * the ladder already escalates (`renownThreshold`), so a price that escalated
   * with it would be a card that gets weaker exactly as an empire gets richer.
   * What is bought is the *recruitment*, not the piece — see
   * `purchaseGreatPersonOfferAt` (`greatPeople.ts`), which pours the remaining
   * renown through `settleRenownWindfall` so there is still one draft path.
   */
  offerPriceGold: number;
  /** The same out of the faith bank — The Magisterium's. */
  offerPriceFaith: number;
  /**
   * What a **draft of great scholars** costs in faith — The Academy's, and the
   * user's ruling of 2026-09-03.
   *
   * Far dearer than either price above, and it buys something else: those two
   * cover the *ladder's* threshold, so the pool is spent and the next
   * recruitment is dearer, while this one deals a narrowed hand and leaves the
   * ladder exactly where it stood. A realm that can raise this much faith is
   * buying its scholars beside its ordinary recruitments rather than instead of
   * them, which is what the figure is priced against.
   */
  scholarDraftFaith: number;
}

/**
 * How many cards each kind of offer deals, before any card widens it.
 *
 * **One block for four drafts**, and it is here rather than three cards deep in
 * `data/statecraft.json`, `data/religion.json` and `data/discoveries.json`
 * because "how big is an offer" turned out to be one question the moment
 * anything could answer it differently — a wonder that adds a card to every
 * Statecraft draft and a great person who adds one to *every* draft are the same
 * sentence about all four. The evaluator that folds those riders in is
 * `explainOfferSize` (`statecraft.ts`); these are the **base** lines it starts
 * from, and nothing else reads them.
 *
 * The keys are `OfferKind`'s members (`statecraft.ts`) so the evaluator can
 * index this by the kind it was asked about rather than switch over four names.
 * A fifth kind — the great people this block was widened for — is a key here and
 * a member there, and no third place.
 */
export interface OfferRules {
  /** A Statecraft draft's **new** cards. The upgrade face is one, always. */
  order: number;
  /** The Doctrine triple dealt on adoption. */
  doctrine: number;
  /** The gods a Consecrate deals. */
  belief: number;
  /** The boons a claimed ruin or village deals. */
  discovery: number;
  /**
   * The names a filled renown bucket deals (`docs/great-people.md`).
   *
   * The fifth kind, and the one this block was widened for: it is a key here, a
   * member of `OfferKind` (`statecraft.ts`) and a member of `OfferRiderScope`
   * (`statecraftData.ts`), and there is no third place — every rider that says
   * `'all'` widened it the day it existed without anybody revisiting a card.
   */
  greatPerson: number;
  /**
   * The most cards any one offer may hold, however many riders are live.
   *
   * A cap rather than a balance decision left to the card table: five tarot
   * cards is what the spread lays out at 1280×720 without scrolling
   * (`offerSpread` in `src/ui/offerCard.ts`), and an offer nobody can see all of
   * is a decision made by whichever card happened to be on screen. It is a line
   * of the fold like any other, so a capped offer *says* it was capped.
   */
  max: number;
}

/**
 * Every number the **tide of belief** is made of (`docs/religion-v2.md`).
 *
 * The pressure sources are quoted in *faith a turn*, and one convert costs
 * `pressurePerConvert` of it — so the whole model is two figures a designer can
 * reason about together: a holy site pressing 6 turns a size-4 town inside five
 * turns at 10 a convert, and a road pressing 4 does it in eight. The user's
 * ruling of 2026-08-27 was "make religion spread more aggressive than in Civ",
 * and those two sentences are what that means in numbers.
 *
 * Every one of these may be shifted by an enhancer belief through one shape
 * (`pressureRule`) read in one place (`explainPressure`).
 */
export interface ReligionRules {
  /** Faith banked in one town that buys one citizen's conversion. */
  pressurePerConvert: number;
  /** How far a holy site reaches, in hexes, and what it presses. */
  siteRange: number;
  siteStrength: number;
  /** How far a following city reaches, and what it presses. */
  cityRange: number;
  cityStrength: number;
  /** What a following city joined to this one by road presses, at any distance. */
  roadStrength: number;
  /** What a caravan from a following city presses on its destination. */
  routeStrength: number;
  /** What a founder's own capital presses for its own faith. A seat does not drift. */
  capitalStrength: number;
  /**
   * What a Temple does to the pressure on the town it stands in, in whole
   * percent: `templeOwnPercent` to the faith the town already keeps and
   * `templeForeignPercent` to everybody else's. Twice for its own, and a
   * quarter off everybody else's — the defensive building, with no combat
   * anywhere near it.
   *
   * The foreign figure was *half* until the tree re-cut of 2026-09-02, whose
   * worksheet rules the Temple at "foreign religious pressure −25%". It is
   * quoted as **what gets through** rather than as what is turned away, which
   * is why the ruling reads here as 75 and not as 25: a smaller number is a
   * stronger temple, and this is the one number in the file that runs backwards.
   */
  templeOwnPercent: number;
  templeForeignPercent: number;
  /**
   * A prophet's proclamation: how far it reaches, and what it presses **once**.
   *
   * The bomb is a *lump*, not a source (user, 2026-08-28): the whole figure is
   * banked into every town in range at the moment the prophet speaks, the
   * temple's own resistance applied, and the phase's converter is run on the
   * spot. So it is quoted in the same currency as `pressurePerConvert` rather
   * than in faith-a-turn like every source above it — 60 against 10 a convert is
   * six citizens, which is a majority in a town of eleven and half of one in a
   * town of twelve. A temple takes a quarter off it (`templeForeignPercent`),
   * which is the one number that decides whether a bomb lands.
   */
  bombRange: number;
  bombLump: number;
  /**
   * An inquisitor's Purge: how far it reaches, and what it strips **once**
   * (design ledger Entry LVIII, The Holy Office).
   *
   * The proclamation's two numbers read backwards, and deliberately quoted in
   * the same currency: a bomb banks `bombLump` *for* one faith on every town in
   * range, a purge takes `purgeLump` *away from* every other faith on every town
   * in range. Same bank (`City.pressureBank`), same convert price
   * (`pressurePerConvert`), opposite sign — which is what lets the two share one
   * converter (`purgePressure` beside `bankPressure`) rather than growing a
   * second theory of what banked faith is worth.
   *
   * The reach is deliberately **half** the bomb's. A proclamation is a thing you
   * do to a region from outside it; a purge is a thing you do to your own realm,
   * and an inquisitor that could sterilise ten hexes from the capital would
   * never have to march.
   */
  purgeRange: number;
  purgeLump: number;
  /**
   * What a standing inquisitor is worth to a friendly soldier beside it, and how
   * far "beside" reaches.
   *
   * `greatPeople.generalAuraStrength`'s twin one agent over, and two numbers for
   * that pair's reason: the aura and the act are the two halves of the decision a
   * player makes about the piece, and a designer sharpening one must be able to
   * leave the other alone. Radius one, so it is a bodyguard rather than a
   * general.
   */
  inquisitorAuraStrength: number;
  inquisitorAuraRange: number;
  /**
   * The most religions this world will hold, as a **share of the real seats**,
   * rounded up — two integers rather than a fraction so the ceiling is exact
   * arithmetic on whole numbers. Two thirds (user, 2026-08-27).
   */
  maxReligions: { numerator: number; denominator: number };
}

export interface RulesConfig {
  game: GameRules;
  movement: MovementRules;
  explore: ExploreRules;
  stacking: StackingRules;
  visibility: VisibilityRules;
  healing: HealingRules;
  combat: CombatRules;
  naval: NavalRules;
  improvements: ImprovementRules;
  trade: TradeRules;
  war: WarRules;
  barbarians: BarbarianRules;
  cities: CityRules;
  meters: MeterRules;
  research: ResearchRules;
  religion: ReligionRules;
  offers: OfferRules;
  renown: RenownRules;
  greatPeople: GreatPeopleRules;
  production: ProductionRules;
  upkeep: UpkeepRules;
  /** Unit types every player receives at their start position, in order. */
  startingUnits: UnitTypeId[];
}

export const RULES: RulesConfig = rulesJson as RulesConfig;
