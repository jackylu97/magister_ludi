/**
 * Research: what a player knows, what that lets them build, and what happens the
 * moment a technology lands.
 *
 * Pure logic over `GameState`, exactly like `cities.ts`. The `advanceResearch`
 * phase in `turn.ts` is one call into this module, the `chooseResearch` command
 * validates with `researchError` and then writes one field, and the tech screen
 * reads the same functions the reducer decides by — so a node the interface
 * offers is a node the reducer will accept, and a "~7 turns" the screen promises
 * is the arithmetic the turn pipeline will actually perform.
 *
 * The research model: progress *is* the pool
 * ------------------------------------------
 * `Player.sciencePool` accumulates every turn exactly as it did in Milestone 3.
 * `Player.researching` names the tech that pool is aimed at, and nothing else
 * about research is stored — there are no per-tech buckets. When the pool covers
 * the current tech's cost, `advanceResearch` pays it, banks the tech, keeps the
 * remainder as overflow and clears `researching` so the player chooses again.
 *
 * Two consequences, both deliberate:
 *
 *   · **Switching is free and lossless.** Changing your mind mid-research moves
 *     the aim, not the beakers — the pool is untouched. Civ V charges you for
 *     that (progress sits in the tech you abandoned); Civ IV's "beakers are
 *     yours" is the friendlier reading and it is the one a *simultaneous-turn*
 *     game wants, because the alternative punishes a player for reacting to
 *     something another player did inside the same turn window.
 *   · **Banking is real.** A player with no current research still accumulates,
 *     so forgetting to choose costs a decision, not a turn's science. The
 *     interface nags (see the tech screen); the simulation does not confiscate.
 *
 * One tech per player per turn, like production: a player who banks four hundred
 * beakers does not empty an age in one resolution. The overflow pays for the
 * next one the moment it is chosen.
 *
 * The queue (playtest batch two)
 * ------------------------------
 * `researching` is still the aim and still the whole of the research model;
 * `Player.researchQueue` is only what stands **behind** it. `researchPlan` is
 * the two read as one list, and every function here that means "what this empire
 * is set to learn" asks that rather than the fields.
 *
 * The queue changes no arithmetic at all. Nothing is spent by planning, the pool
 * is still the progress, switching is still free, and the overflow from a
 * completion still pays for whatever comes up next — the difference is only that
 * "whatever comes up next" can now have been decided in advance instead of
 * asked for at the top of a turn. Two writers touch the field, and between them
 * they are the invariant the End Turn blocker leans on (a non-empty queue always
 * has a head): `writeResearchPlan`, for the two commands, and
 * `promoteResearchQueue`, inside the one completion routine.
 *
 * Unlocks and auto-upgrade
 * ------------------------
 * Gating is one question — `isUnlocked` — asked by the reducer's production
 * validation and by the city panel's buildable list, so a button the panel
 * offers is a queue the reducer takes. The auto-upgrade rule (Entry V) runs in
 * the same breath as the unlock: when a tech completes, every existing unit
 * whose `upgradesTo` chain has just become available becomes the better unit in
 * place, keeping its id, its tile and its *fraction* of health — a warrior at
 * half health is a half-health swordsman, not a fresh one, because upgrading
 * must never be a way to heal.
 *
 * Pacing (Quick speed, standard map, the science economy exactly as it stands)
 * ---------------------------------------------------------------------------
 * The ages cost 169 / 1655 / 4420 beakers; the two starting techs are free, so a
 * whole game pays 6229. Those figures are *measured*, not guessed. The science
 * economy is pop-based, so it is really a measurement of how fast the empire
 * gets its cities: a scripted empire — `test/tech.test.ts`'s harness, which
 * founds five cities and always builds what it can — banks roughly 120 beakers
 * by turn 40, 1400 by turn 90 and 3800 by turn 130. Against that curve the three
 * ages close on turns 42, 90 and 132.
 *
 * The three ages are scaled *differently* on purpose: early science is a single
 * city of one or two citizens, so an age-I node priced off the late curve would
 * stall the opening for twenty turns, while age III has to grow more slowly than
 * the beakers a five-city empire is banking or the finale drags — Entry V's "the
 * endgame accelerates", read off the measured curve rather than assumed.
 *
 * Within each age the table is a *scale*: if growth, settler cost or science per
 * pop are retuned, multiply `cost` across `data/techs.json` by the change in
 * beakers-per-game and the shape survives untouched. That is exactly what the
 * escalating-settler pass did (×0.50 / ×0.85 / ×0.95 by age, holding the same
 * three closing turns): settlers went from 12 flat hammers to 20 + 8 per settler
 * already built, the scripted empire's five cities now arrive on turns
 * 1/19/28/40/50 rather than 1/17/20/24/28, and twenty turns of citizens the
 * empire no longer has by turn 40 is twenty turns of beakers it no longer banks.
 * Expansion is the science economy; pricing expansion re-prices the tree.
 *
 * **The later ages were scaled up on 2026-08-28** (user, playtest: "science
 * costs need to scale harder"): Age II ×1.3 and Age III ×1.8, each cost rounded
 * to the nearest five, Age I untouched. That is the paragraph above used
 * deliberately rather than as a repair — the *shape* inside each age is
 * preserved exactly, and only the band each age sits in moved. The three ages
 * now cost 169 / 1655 / 4420 against 169 / 1272 / 2456, and the scripted
 * empire's closes went 32 / 62 / 97 → 30 / 67 / 122 (Age I *earlier*, because
 * the growth curve came down in the same pass and science here is pop-based).
 * The point of the change is the finale: an age III that used to be swept in
 * thirty-five turns is now sixty, so the last age is a stretch of the game
 * rather than a formality.
 */

import { type BuildingId, buildingDef, isBuildingId, isWonder } from './buildingData';
import {
  type CityYields,
  cityYields,
  emptyCityYields,
  hasResource,
  refreshCityDerived,
  turnsToFill,
} from './cities';
import type { Tile } from './map';
import {
  CITY_YIELD_KEYS,
  type ResourceId,
  resourceDef,
  resourceIsVisibleTo,
} from './resourceData';
import { RULES } from './rulesData';
import type { CityScope } from './statecraftData';
import {
  cardUnlocksBuilding,
  cityScopeAdmits,
  payWindfallGrants,
  settleCultureWindfall,
  windfallPayout,
} from './statecraft';
import {
  type City,
  type GameState,
  type Player,
  type QueueKind,
  type Unit,
  cityById,
  playerById,
  wonderClaim,
} from './state';
import {
  type AbilityId,
  BUILDING_UNLOCK_TECH,
  TECH_IDS,
  type TechId,
  PROJECT_UNLOCK_TECH,
  UNIT_UNLOCK_TECH,
  highestAge,
  isTechId,
  techDef,
  techDepth,
  techsGrant,
} from './techData';
import { awardOccasion } from './triumphs';
import { isProjectId, projectDef } from './projectData';
import { type UnitTypeId, isUnitTypeId, unitDef } from './unitData';

const RESEARCH = RULES.research;

// --- what a player knows ----------------------------------------------------

/** Has this player researched this technology? */
export function hasTech(state: GameState, playerId: number, techId: TechId): boolean {
  const player = playerById(state, playerId);
  if (!player) return false;
  return player.techsResearched.includes(techId);
}

/**
 * Does this player hold the verb `ability` names?
 *
 * `hasTech`'s sibling, and the one every surface that is *not* the movement
 * evaluator asks: the unit sheet greying an order, the tech card saying what
 * Sailing hands over. It is `techsGrant` with a player looked up, because the
 * gate itself is a fact about the tree and belongs in `techData.ts` (see that
 * function for why `pathfind.ts` cannot come through here).
 */
export function hasAbility(state: GameState, playerId: number, ability: AbilityId): boolean {
  const player = playerById(state, playerId);
  if (!player) return false;
  return techsGrant(player.techsResearched, ability);
}

/** Are every one of a technology's prerequisites already in hand? */
export function prereqsMet(state: GameState, playerId: number, techId: TechId): boolean {
  return techDef(techId).prereqs.every((prereq) => hasTech(state, playerId, prereq));
}

/** The prerequisites this player is still missing, in the tech's own order. */
export function missingPrereqs(state: GameState, playerId: number, techId: TechId): TechId[] {
  return techDef(techId).prereqs.filter((prereq) => !hasTech(state, playerId, prereq));
}

/**
 * May this player build this unit type / building yet?
 *
 * The single source of truth for availability, in the spirit of
 * `foundingErrorAt`: the `setCityProduction` validation and the city panel's
 * buildable list both ask *this*, so a disabled button and a rejected command
 * cannot drift apart. Content no tech names is available from turn one (see the
 * `techData.ts` docblock), which is what makes the gate additive rather than a
 * second place every new unit has to be registered.
 */
export function isUnlocked(
  state: GameState,
  playerId: number,
  kind: QueueKind,
  id: string,
): boolean {
  // **A row a card opens is asked of the cards**, before the tree, because it
  // has no gate in the tree to be asked about: a building no technology names is
  // otherwise available from turn one, which is the right default for content
  // and exactly wrong for content a doctrine is meant to hand over (the Gilded
  // Hall). One clause of the one availability question rather than a second gate
  // beside it — see `BuildingDef.unlockedByCard`.
  if (kind === 'building' && isBuildingId(id) && buildingDef(id).unlockedByCard === true) {
    return cardUnlocksBuilding(state, playerId, id);
  }
  const gate = gatingTech(kind, id);
  if (gate === null) return true;
  return hasTech(state, playerId, gate);
}

/**
 * The technology that gates a queue item, or `null` when nothing does.
 *
 * One lookup per kind and `isUnlocked` is now this plus `hasTech`, which is
 * what keeps "what gates this" and "may I build this" from being two tables
 * that can disagree about a third kind of row.
 */
export function gatingTech(kind: QueueKind, id: string): TechId | null {
  if (kind === 'unit') return (isUnitTypeId(id) && UNIT_UNLOCK_TECH.get(id)) || null;
  if (kind === 'project') return (isProjectId(id) && PROJECT_UNLOCK_TECH.get(id)) || null;
  return (isBuildingId(id) && BUILDING_UNLOCK_TECH.get(id)) || null;
}

/** The display name of a queue item's id, or the raw id if it is unknown. */
function itemName(kind: QueueKind, id: string): string {
  if (kind === 'unit') return isUnitTypeId(id) ? unitDef(id).name : id;
  if (kind === 'project') return isProjectId(id) ? projectDef(id).name : id;
  return isBuildingId(id) ? buildingDef(id).name : id;
}

/**
 * What a site requirement asks for, **named as a place** — "a harbour", "a
 * mountain within reach" — rather than as the flag that encodes it.
 *
 * `scopeWords` (`statecraft.ts`) is the sibling that reads a scope inside a
 * sentence about *where an effect lands*, and it says "every coastal city",
 * which is the wrong half of the sentence here: this one completes "The Colossus
 * wants …". A player told "requires coastal" has been told the name of a field.
 *
 * A composite names each of its parts, which is the only reading that stays
 * honest when a future row asks for two things at once.
 */
function siteWords(site: CityScope): string {
  switch (site.test) {
    case 'coastal':
      return 'a harbour';
    case 'freshwater':
      return 'fresh water';
    case 'mountainAdjacent':
      return 'a mountain within reach';
    case 'onTerrain':
      return `${site.terrain} to stand on`;
    case 'holding':
      return `${site.resources.map((id) => resourceDef(id).name).join(' or ')}`;
    case 'holdingCategory':
      return `an improved ${site.category} resource`;
    case 'populationAtLeast':
      return `a population of ${site.value}`;
    case 'hasBuilding':
      return `a ${buildingDef(site.building).name}`;
    case 'all':
      return site.of.map((inner) => siteWords(inner)).join(' and ');
    default:
      // Every other scope is a fact about the *empire's* arrangement rather than
      // about the ground — a capital, a conquest, a frontier — and no row asks
      // for one as a site. The honest fallback is the scope's own word.
      return `a ${site.test} site`;
  }
}

/**
 * The strategic resource a queue item needs, or `null` when it needs none.
 *
 * Buildings and projects never do today; the signature takes the kind anyway so
 * the gate below can ask one question about all three, and so the day a stable
 * needs horses this is the only line that changes.
 */
export function requiredResource(kind: QueueKind, id: string): ResourceId | null {
  if (kind !== 'unit' || !isUnitTypeId(id)) return null;
  return unitDef(id).requiresResource ?? null;
}

/**
 * Why this player cannot build this thing, or `null` when they can.
 *
 * **The** production gate: `validateQueue` in `commands.ts` refuses with this
 * sentence and the city panel disables its button with it, so a row the panel
 * offers is a queue the reducer takes and the *reason* the player reads is the
 * reducer's own. It is `isUnlocked` grown a second clause rather than a second
 * function beside it, for exactly the reason `foundingError` swallowed
 * `foundingErrorAt`: two gates asked in two places is two gates that disagree.
 *
 * The order is technology first, then resource, and that is a message-quality
 * decision. A player without Iron Working looking at a swordsman should be told
 * about the technology — the resource is not their problem yet — and a player
 * who *has* the technology should be told about the iron.
 *
 * It is deliberately not folded into `isUnlocked` itself. `isUnlocked` answers
 * "does this exist for me yet", which is a fact about the tree that only ever
 * improves, and `upgradeTargetFor` leans on exactly that when it marches a
 * warrior up its chain. Controlling a resource can be *lost* — a captured city
 * takes its iron with it — so a gate that could go backwards has no business
 * deciding what a unit already on the board is.
 *
 * The wonder clauses, and why they need a city
 * --------------------------------------------
 * A wonder is refused twice over (the wonders framework, 2026-08-27): once
 * because **somebody in the world has already built it**, in a sentence that
 * names the town and the empire holding it, and once because **this empire is
 * already building it somewhere else** — a second copy in one realm is a queue
 * that can never complete, which is exactly the failure this gate exists to
 * refuse before a hundred turns of hammers go into it.
 *
 * `city` is the town being asked *on behalf of*, and it is optional for the
 * oldest reason in this file: without it the second clause would refuse a player
 * re-sending the very queue that legitimately holds the wonder, because
 * `validateQueue` re-validates every row of the new queue against the empire the
 * old one is still standing in. So the caller that has a town hands it over and
 * that town is excluded from the sweep; the caller that has none (a purchase, a
 * report) gets the stricter reading, which is the honest answer to "could this
 * empire start one anywhere".
 */
export function buildError(
  state: GameState,
  playerId: number,
  kind: QueueKind,
  id: string,
  city?: City,
): string | null {
  if (!isUnlocked(state, playerId, kind, id)) {
    const gate = gatingTech(kind, id);
    const needs = gate ? techDef(gate).name : 'a technology you do not have';
    return `${itemName(kind, id)} needs ${needs}`;
  }
  // Some things are **bought or not at all** (ledger Entry XXVIII): the augur is
  // faith-purchased, and a city that could also hammer one out would make the
  // faith price a suggestion. Third in the order for the same message-quality
  // reason the resource is second — a player without Divination should be told
  // about Divination, and one who has it should be told where augurs come from.
  if (kind === 'unit' && isUnitTypeId(id) && unitDef(id).purchase?.exclusive === true) {
    const spec = unitDef(id).purchase!;
    return `${itemName(kind, id)}s are not built — they are bought with ${spec.currency}`;
  }
  // A **building** may be bought-or-not-at-all too, and the sentence is the
  // augur's with the bank left unnamed: the Gilded Hall is sold by the treasury
  // like every other building, so what the refusal is about is the *queue*, not
  // the coin. Beside the unit clause rather than folded into it because the two
  // fields are on two tables (`UnitDef.purchase.exclusive`, `BuildingDef
  // .purchaseOnly`) and a row that named both would be a row of nothing.
  if (kind === 'building' && isBuildingId(id) && buildingDef(id).purchaseOnly === true) {
    return `${itemName(kind, id)} is not built — it is bought`;
  }
  // And some things are **neither built nor bought**: a great person is
  // *recruited*, by a renown bucket that filled and an offer that was answered
  // (`docs/great-people.md`). Refused here — and in `purchaseError`, for the same
  // sentence — because the row has no `purchase` block and would otherwise be
  // sold by the treasury at `goldPerHammer × 0`, which is to say given away.
  // Asked of `UnitDef.greatWork`, so nothing here compares a type against
  // `"greatPerson"`, exactly as nothing compares against `"augur"`.
  if (kind === 'unit' && isUnitTypeId(id) && unitDef(id).greatWork === true) {
    return `${itemName(kind, id)}s are neither built nor bought — they are called`;
  }
  // The two wonder clauses, after the technology and before the resource, in the
  // order a player needs to hear them: a wonder that already stands somewhere is
  // gone for good, and one this empire is already raising is a decision it has
  // made. Neither can ever fire for an ordinary building.
  if (kind === 'building' && isBuildingId(id) && isWonder(id)) {
    const claim = wonderClaim(state, id);
    if (claim) {
      const where = cityById(state, claim.cityId);
      const who = playerById(state, claim.playerId);
      const town = where?.name ?? `city ${claim.cityId}`;
      const empire = who?.name ?? `player ${claim.playerId}`;
      return `${itemName(kind, id)} already stands in ${town} (${empire})`;
    }
    for (const other of state.cities) {
      if (other.ownerId !== playerId || other.id === city?.id) continue;
      if (!other.queue.some((item) => item.kind === 'building' && item.id === id)) continue;
      return `${other.name} is already building ${itemName(kind, id)}`;
    }
  }
  // **The site**, last of the building clauses and only when a town is in hand:
  // the ground under a city is a question about *that* city, and a caller with
  // none is asking the tree's question ("could I ever build this") rather than
  // the queue's. Evaluated by `cityScopeAdmits`, the one scope evaluator, so a
  // wonder cannot be refused a coast it would then have paid.
  if (kind === 'building' && isBuildingId(id) && city !== undefined) {
    const site = buildingDef(id).requiresSite;
    if (site !== undefined && !cityScopeAdmits(state, city, site)) {
      return `${itemName(kind, id)} wants ${siteWords(site)}; ${city.name} has none`;
    }
  }

  const resource = requiredResource(kind, id);
  if (resource !== null && !hasResource(state, playerId, resource)) {
    // "improved", since M7. Owning the seam stopped being enough the day workers
    // landed (`hasResource`, design ledger Entry IX's correction), and a
    // refusal that said only "needs Iron" to a player whose borders already
    // contain an unmined iron hill would be sending them to war over something
    // they have. One word, in the one place the sentence is written.
    return `${itemName(kind, id)} needs improved ${resourceDef(resource).name}`;
  }
  return null;
}

// --- what a player can see --------------------------------------------------

/**
 * May this player be *told* about this resource?
 *
 * True for everything without a `requiresTech`, which is every bonus and every
 * luxury and most strategics; iron waits for Bronze Working.
 *
 * The gate is no longer only about the label. An unrevealed seam is invisible
 * (here), unusable (`openedResource` in `cities.ts`) and **worth nothing** — its
 * line is left out of `explainTileYield` for an owner who cannot name it, which
 * is Civ's own reading and the one the design ratified. So a technology that
 * reveals a resource is a technology that makes ground better, all at once and
 * with no bookkeeping: the label, the prop, the citizen's score and the city
 * panel's total all move on the turn it lands, because all four are derived from
 * this one question.
 */
export function isResourceVisible(
  state: GameState,
  playerId: number,
  resourceId: ResourceId,
): boolean {
  const player = playerById(state, playerId);
  // Delegated rather than reimplemented: `openedResource` in `cities.ts` asks
  // the *same* question — access is gated on the reveal, since the ratified
  // luxury pass — and this module cannot be imported from there without a
  // top-level cycle. So the rule lives beside the table it reads
  // (`resourceIsVisibleTo`) and both callers ask it.
  return player ? resourceIsVisibleTo(resourceId, player.techsResearched) : false;
}

/**
 * The resource this player may see on this tile, or `null`.
 *
 * The single accessor every *information* surface reads: the hover readout, the
 * resource lens, and anything later that wants to name what is on a hex.
 *
 * The board's diorama props read it too, as of the per-seat reveal pass
 * (`reveal3d.ts`) — which closes the v1 tradeoff this docblock used to record.
 * The props are baked into the board's instance buffers, which are built once
 * per game and shared by every seat, so culling them at bake time would have
 * forked the board per seat and re-baked it on a technology. It is instead the
 * same trick fog already plays: the props are baked lit, and a per-instance bit
 * takes the unrevealed ones down for the seat being drawn. Marker, prop and
 * yield therefore appear together, on the turn the tech lands, from this one
 * question.
 */
export function visibleResourceAt(
  state: GameState,
  playerId: number,
  tile: Tile,
): ResourceId | null {
  const id = tile.resource;
  if (id === undefined) return null;
  return isResourceVisible(state, playerId, id) ? id : null;
}

// --- choosing ---------------------------------------------------------------

/**
 * How a `chooseResearch` treats what is already lined up: blow it away, or add
 * to the end of it. `'replace'` is the default and is what every command that
 * predates the queue means (see `ChooseResearchCommand`).
 */
export type ResearchQueueMode = 'replace' | 'append';

/**
 * What this empire is set to learn, current research first: `researching`,
 * then everything in `Player.researchQueue`.
 *
 * **The** reading of the plan, and the one place `researchQueue`'s absence turns
 * into an empty list — so a state from before the field, or a hand-edited one
 * missing the key, is a plan of at most one entry rather than a crash. Every
 * other function in this file asks *this* rather than the two fields.
 */
export function researchPlan(player: Player): TechId[] {
  const queue = player.researchQueue ?? [];
  return player.researching === null ? [...queue] : [player.researching, ...queue];
}

/**
 * Writes a plan back onto a player: the head becomes the current research and
 * everything behind it becomes the queue.
 *
 * One of the two writers of `Player.researchQueue`, and between them they are
 * the whole of the invariant that field's docblock promises — a queue is never
 * non-empty while nothing is being researched, because the head is always taken
 * off the front of the same list the tail comes from. The key is **deleted**
 * rather than emptied, which is `Unit.path`'s convention: an empire that emptied
 * its queue and one that never had one must serialise identically.
 *
 * It spends nothing. The pool is the progress (see the module docblock), so
 * re-planning moves the aim and every banked beaker stays where it was — which
 * is exactly what made switching free before a queue existed.
 */
function writeResearchPlan(player: Player, plan: readonly TechId[]): void {
  player.researching = plan[0] ?? null;
  const rest = plan.slice(1);
  if (rest.length > 0) player.researchQueue = [...rest];
  else delete player.researchQueue;
}

/**
 * Every technology this player must still learn to hold `techId`, ending with
 * `techId` itself, in an order that never puts a node before its prerequisites.
 *
 * This is the whole of "clicking a locked node queues what it needs". The
 * closure is walked over `prereqs`, technologies already held are simply not in
 * it, and the result is sorted by **`techDepth` then `TECH_IDS` order** —
 * prerequisite depth, then the roster.
 *
 * `techDepth` is the chart column: the length of the longest chain of
 * prerequisites behind a node, over the *whole* tree rather than over what this
 * player is missing. That makes it a valid topological key for free (a
 * prerequisite is always in a strictly earlier column — the drawing code leans
 * on the same guarantee), and it makes the order a fact about the **tree**
 * rather than about the moment the offer was made: two empires that queue Iron
 * Working from different starting knowledge queue the shared part of it in the
 * same order. `TECH_IDS` breaks the ties, because a sort that fell back on
 * `Map` iteration order would be a sort a replay could disagree with.
 */
export function researchExpansion(
  state: GameState,
  playerId: number,
  techId: TechId,
): TechId[] {
  const needed = new Set<TechId>();
  const walk = (id: TechId): void => {
    if (needed.has(id) || hasTech(state, playerId, id)) return;
    needed.add(id);
    for (const prereq of techDef(id).prereqs) walk(prereq);
  };
  walk(techId);
  const order = new Map(TECH_IDS.map((id, index) => [id, index]));
  return [...needed].sort(
    (a, b) => techDepth(a) - techDepth(b) || order.get(a)! - order.get(b)!,
  );
}

/**
 * The plan a `chooseResearch` for `techId` would install, given the mode.
 *
 * `'replace'` *is* the expansion: the player pointed at a node, and what it
 * takes to get there is the whole of what they asked for. `'append'` keeps the
 * plan and adds only what is not in it already — the shift-click, which is a
 * second destination rather than a second mind.
 *
 * Pure, so the tech screen can show what a click would do before it is made.
 */
export function plannedResearch(
  state: GameState,
  playerId: number,
  techId: TechId,
  mode: ResearchQueueMode,
): TechId[] {
  const expansion = researchExpansion(state, playerId, techId);
  const player = playerById(state, playerId);
  if (mode === 'replace' || !player) return expansion;
  const plan = researchPlan(player);
  return [...plan, ...expansion.filter((id) => !plan.includes(id))];
}

/** True when two plans are the same list in the same order. */
function samePlan(a: readonly TechId[], b: readonly TechId[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * Why this player cannot aim at this technology, or `null` when they can.
 *
 * The rule the `chooseResearch` command validates with and the tech screen
 * enables its nodes by — one implementation, so a node the screen lets you click
 * is a node the reducer accepts. It asks nothing about the *turn*: whether a
 * seat has already finished is a question about the actor and belongs to the
 * command, exactly as `foundingError` leaves it there.
 *
 * **A missing prerequisite stopped being a refusal** the day the queue landed
 * (playtest batch two). Pointing at a locked node now means "and everything it
 * needs", so the clause that used to name the missing nodes would be refusing
 * exactly the click the feature exists for. What is left is the honest set:
 * a node this build does not have, one already held, and — the oldest of the
 * three — a command that would change nothing.
 *
 * That last clause is now a comparison of *plans* rather than of one field, and
 * it has to be: re-choosing the current research with an empty queue and
 * re-choosing it with a queue behind it are different commands, and only the
 * first changes nothing. An accepted no-op would put a log entry in the save
 * that says nothing, which is the same refusal `fortify` and `cancelOrder` make.
 */
export function researchError(
  state: GameState,
  playerId: number,
  techId: unknown,
  mode: ResearchQueueMode = 'replace',
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  if (!isTechId(techId)) return `Unknown technology "${String(techId)}"`;

  const def = techDef(techId);
  if (player.techsResearched.includes(techId)) {
    return `${player.name} has already researched ${def.name}`;
  }

  const next = plannedResearch(state, playerId, techId, mode);
  if (samePlan(next, researchPlan(player))) {
    // Two sentences for one clause, because the player is in two different
    // situations: the beakers are already pointed at it, or it is simply further
    // down a list they have already drawn up.
    return player.researching === techId
      ? `${def.name} is already being researched`
      : `${def.name} is already in ${player.name}'s research plan`;
  }
  return null;
}

/**
 * Installs the plan a `chooseResearch` asked for. Validate with `researchError`
 * first; this writes.
 */
export function chooseResearchFor(
  state: GameState,
  playerId: number,
  techId: TechId,
  mode: ResearchQueueMode,
): void {
  const player = playerById(state, playerId);
  if (!player) return;
  writeResearchPlan(player, plannedResearch(state, playerId, techId, mode));
}

/**
 * The plan with `techId` — and everything behind it that only made sense
 * *because* of it — taken out.
 *
 * "Depended on it" is transitive and is asked of the tree, not of the list: a
 * later entry goes too when any of its prerequisites has already been dropped.
 * That is the only reading that leaves a plan a player can actually follow — a
 * queue holding Iron Working with Bronzeworking pulled out from under it is a
 * row `promoteResearchQueue` would have to skip anyway, and a queue that
 * silently skips things is a queue that lies about what it will learn.
 *
 * A technology the player already holds is never dropped by the cascade, because
 * it is not in the plan to begin with — this walks the plan, and the plan is
 * only ever unresearched nodes.
 */
export function researchPlanWithout(plan: readonly TechId[], techId: TechId): TechId[] {
  const dropped = new Set<TechId>([techId]);
  const kept: TechId[] = [];
  for (const id of plan) {
    if (dropped.has(id)) continue;
    if (techDef(id).prereqs.some((prereq) => dropped.has(prereq))) {
      dropped.add(id);
      continue;
    }
    kept.push(id);
  }
  return kept;
}

/**
 * Why this player cannot take this technology out of their plan, or `null`.
 *
 * `researchError`'s mirror, and it makes the same refusal for the same reason:
 * dropping something that is not there changes nothing, and an accepted no-op is
 * a log entry that says nothing.
 */
export function dequeueResearchError(
  state: GameState,
  playerId: number,
  techId: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  if (!isTechId(techId)) return `Unknown technology "${String(techId)}"`;
  if (!researchPlan(player).includes(techId)) {
    return `${techDef(techId).name} is not in ${player.name}'s research plan`;
  }
  return null;
}

/**
 * Takes a technology out of a plan. Validate with `dequeueResearchError` first;
 * this writes.
 */
export function dequeueResearchFor(
  state: GameState,
  playerId: number,
  techId: TechId,
): void {
  const player = playerById(state, playerId);
  if (!player) return;
  writeResearchPlan(player, researchPlanWithout(researchPlan(player), techId));
}

/**
 * Moves the front of the queue into `researching`, dropping anything that has
 * stopped making sense on the way.
 *
 * The second of `Player.researchQueue`'s two writers, and the one that runs
 * inside `settleResearch` — so the queue advances by exactly the same code
 * whether a turn's beakers finished the node or a ruin's star tablets did.
 *
 * Two things are dropped rather than researched, and both are states only a
 * *history* can produce: a technology the player has since come by another way
 * (a Great Library grant, a discovery), and one whose prerequisites are no
 * longer met — which today means somebody dequeued the node underneath it in a
 * build where that cascade did not exist, or hand-edited the save. Skipping and
 * keeping would leave a row the queue can never reach; dropping is the reading
 * that keeps "the plan is what will be learnt" true.
 */
function promoteResearchQueue(state: GameState, player: Player): void {
  const queue = player.researchQueue;
  if (!queue) return;
  while (queue.length > 0) {
    const next = queue.shift()!;
    if (player.techsResearched.includes(next)) continue;
    if (!prereqsMet(state, player.id, next)) continue;
    player.researching = next;
    break;
  }
  if (queue.length === 0) delete player.researchQueue;
}

/**
 * Every technology this player could start on right now, in the tree's own
 * order — so the screen's columns and this list can never disagree.
 */
export function availableTechs(state: GameState, playerId: number): TechId[] {
  const player = playerById(state, playerId);
  if (!player) return [];
  return TECH_IDS.filter(
    (id) => !player.techsResearched.includes(id) && prereqsMet(state, playerId, id),
  );
}

// --- the turn phase ---------------------------------------------------------

/**
 * `advanceResearch`: spend each player's pool on the technology it is aimed at.
 *
 * Players are walked in `state.players` order and units in `state.units` order,
 * so two empires completing the same tech in the same resolution always resolve
 * identically — the phase is a pure function of the state, like every other one.
 *
 * A tech that cannot be paid for holds, keeping the pool: research is never
 * lost, only postponed. A completed tech is pushed onto `techsResearched` in
 * completion order (the array is the record of *when*, not just *what*), the
 * remainder stays in the pool as overflow, and `researching` is cleared so the
 * next choice is the player's.
 */
export function advanceResearch(state: GameState): void {
  for (const player of state.players) {
    // The wild does not learn. It has no science, no aim and no tree of its own
    // — what it can field is read off the *real* empires every time it musters
    // (`barbarianTier` in `barbarians.ts`), so a barbarian seat in this sweep
    // would be a no-op that invited somebody to give it a starting kit.
    if (player.barbarian) continue;
    settleResearch(state, player);
    // The retooling sweep runs **every** turn, not only on the turn a technology
    // lands, because since 2026-08-29 an upgrade can also be waiting on a
    // resource (`upgradeTargetFor`): the warriors an empire held at Iron
    // Working become swordsmen the resolution after its first iron is mined,
    // bought, or captured — whichever verb connected it. A sweep with nothing
    // to retool writes nothing, so a game without a gated line is untouched.
    upgradeUnits(state, player);
  }
}

/**
 * What spending this player's pool would complete, given a pool of `science`.
 *
 * The pure half of "would the current technology land", and the first of Entry
 * XVIII's three shapes one bucket over from production (plan · settle · windfall
 * wrapper). `science` defaults to the real pool; a caller weighing a boon that
 * has not landed yet — star tablets in a ruin — passes what the pool *would*
 * hold, which is what lets a choice card promise a completion before it is taken.
 *
 * `null` when there is nothing aimed at, when the aim names a technology this
 * build does not have, or when the beakers do not cover it.
 */
export interface ResearchPlan {
  techId: TechId;
  /** Beakers the pool must give up. What is left is the overflow. */
  cost: number;
}

export function planResearch(
  player: Player,
  science: number = player.sciencePool,
): ResearchPlan | null {
  const id = player.researching;
  if (id === null || !isTechId(id)) return null;
  const { cost } = techDef(id);
  if (science < cost) return null;
  return { techId: id, cost };
}

/** What a research settlement did, for the caller that has to say so out loud. */
export interface ResearchCompletion {
  player: Player;
  techId: TechId;
  /** The display name of what landed — "Bronzeworking". */
  name: string;
  /** Beakers taken out of the pool. What is left is the overflow. */
  cost: number;
}

/**
 * Completes **at most one** technology for this player, if the pool covers it.
 * The one research-completion routine in the game.
 *
 * Entry XVIII's deliberately-unbuilt seam, built (Entry XX) on the day a windfall
 * existed to serve it: a ruin's star tablets pay a flat 15🔬, and a boon that
 * covers the current technology has to finish it *that instant* by exactly the
 * code the phase finishes one with — or the two paths drift about the overflow,
 * about the auto-upgrade sweep, or about whether `researching` is cleared.
 *
 * Everything the phase used to do inline happens here and in this order, and each
 * line is a rule: the pool pays (**keeping the remainder** as overflow, which is
 * what makes a windfall behave like a very good turn's science), the aim is
 * cleared so the *next* choice is the player's — which is what the End Turn
 * research blocker then asks for — the technology is pushed onto
 * `techsResearched` in completion order, and the army marches up its upgrade
 * chains so it is never a turn behind the tree.
 *
 * A hand-edited save can name a technology that no longer exists; the aim is
 * dropped rather than blocking the player's research forever.
 */
export function settleResearch(state: GameState, player: Player): ResearchCompletion | null {
  const id = player.researching;
  if (id === null) return null;
  if (!isTechId(id)) {
    player.researching = null;
    return null;
  }
  const plan = planResearch(player);
  if (!plan) return null;

  // The era **before** the node lands, so "did this technology open a new age"
  // is a comparison rather than a flag anybody has to maintain. It is the whole
  // of First Light of the Æra, and it is asked here — inside the one research
  // completion routine — so a boon that finished the tech earns it exactly as a
  // turn's beakers would.
  const eraBefore = highestAge(player.techsResearched);
  player.sciencePool -= plan.cost;
  player.researching = null;
  player.techsResearched.push(plan.techId);
  // The queue advances **here**, inside the one completion routine, and *after*
  // the push — so the promoted node's prerequisites are read against the tree
  // the player holds now rather than the one they held a line ago. It is the
  // whole reason a windfall and a turn's beakers cannot disagree about what is
  // researched next: `settleResearchWindfall` is this function with a refresh
  // around it. The overflow is untouched and pays for whatever came up, exactly
  // as it paid for whatever the player chose by hand before a queue existed.
  promoteResearchQueue(state, player);
  if (highestAge(player.techsResearched) > eraBefore) {
    awardOccasion(state, player.id, 'ageEntered');
  }
  upgradeUnits(state, player);
  // The Lyceum's fifteen. Inside the one completion routine (Entry XVIII.1), so
  // a technology finished by star tablets pays the same verse as one finished by
  // a turn's beakers — and the culture it pays settles its own bucket at once,
  // which can hand the empire a draft on the turn it learnt something.
  const rider = windfallPayout(state, player.id, 'tech');
  if (rider.grants.length > 0) {
    payWindfallGrants(state, player, rider);
    settleCultureWindfall(state, player);
  }
  return { player, techId: plan.techId, name: techDef(plan.techId).name, cost: plan.cost };
}

/**
 * The mid-turn entry point: settle, then refresh what the open panels read.
 *
 * `settleProductionWindfall`'s twin two buckets over, and the **widest** of the
 * three: a technology is an empire-wide fact about what ground is worth. A
 * completed node can add a renewal to every farm on a river and can reveal a
 * resource that was paying nothing an hour ago (Entry XIX.A — the reveal gate
 * binds the label, the access *and* the yield), and the citizen who should move
 * is in whichever town happens to stand on the seam. So every one of this
 * player's cities is re-seated rather than one, through the one helper the
 * register in `refreshCityDerived` is the docblock of.
 *
 * It is still one call per city with no allocation, and it is still safe for the
 * reason every entry in that register is safe: assignment is idempotent and
 * derived, and `collectYields` reaches the same answer next turn.
 *
 * Every future windfall that pays beakers calls **this**, never `settleResearch`
 * directly.
 */
export function settleResearchWindfall(
  state: GameState,
  player: Player,
): ResearchCompletion | null {
  const done = settleResearch(state, player);
  if (!done) return null;
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    refreshCityDerived(state, city);
  }
  return done;
}

/**
 * A one-time boon of `grant` beakers would complete *this* — or `null`.
 *
 * `productionSettledBy`'s sibling, and the reason a choice card does no
 * arithmetic of its own: "+15🔬 · completes Mining!" asks `planResearch` with the
 * pool the boon would leave, so the promise on the button is made by the function
 * that will keep it.
 */
export function researchSettledBy(player: Player, grant: number): string | null {
  const plan = planResearch(player, player.sciencePool + grant);
  return plan === null ? null : techDef(plan.techId).name;
}

/**
 * Marches every one of this player's units as far up its upgrade chain as their
 * technologies now allow, in place.
 *
 * Called the instant a tech completes, so the army is never a turn behind the
 * tree. Four things are preserved and each is a rule:
 *
 *   · the unit's **id**, so a selection, a standing order and an animation all
 *     survive the upgrade — this is the same piece, better armed.
 *   · its **tile**, because an upgrade is not a movement.
 *   · its **fraction** of health, not its hit points: a warrior at 60% is a
 *     swordsman at 60%. Upgrading is not a way to heal, and a unit whose type
 *     gained maximum hit points does not arrive already wounded either.
 *   · its **movement left**, clamped to the new type's allowance — a chariot
 *     that becomes something slower cannot keep the difference.
 *
 * The chain is walked rather than stepped, so a unit that missed a generation
 * (a hand-built state, a scenario, or a save from before its line existed)
 * catches all the way up rather than one rung per tech.
 *
 * `retoolCost` is charged per unit from the owner's treasury, in `state.units`
 * order; at the v0 setting of 0 nothing is charged. A player who runs out
 * mid-sweep simply stops upgrading — the units that did not upgrade are not
 * lost, and the next completed tech will try again.
 */
export function upgradeUnits(state: GameState, player: Player): void {
  const cost = RESEARCH.retoolCost;
  for (const unit of state.units) {
    if (unit.ownerId !== player.id) continue;
    const target = upgradeTargetFor(state, unit);
    if (target === null) continue;
    if (cost > 0) {
      if (player.gold < cost) continue;
      player.gold -= cost;
    }
    applyUpgrade(unit, target);
  }
}

/**
 * The best type a unit could become right now, or `null` when it is already
 * there. Pure: the tech screen can ask what an upgrade *would* be.
 */
export function upgradeTargetFor(state: GameState, unit: Unit): UnitTypeId | null {
  let current = unit.type;
  for (;;) {
    const next = unitDef(current).upgradesTo;
    if (next === undefined) break;
    if (!isUnlocked(state, unit.ownerId, 'unit', next)) break;
    // The same gate `buildError` keeps: a rung that needs iron is not climbed
    // until the empire controls iron (user, 2026-08-29 — "iron working should
    // only upgrade warriors when iron is available"). The walk stops rather
    // than skips, because a chain is a chain — nobody becomes a longswordsman
    // without having been a swordsman.
    const resource = unitDef(next).requiresResource;
    if (resource !== undefined && !hasResource(state, unit.ownerId, resource)) break;
    current = next;
  }
  return current === unit.type ? null : current;
}

/** Retypes a unit, keeping its health fraction and capping its movement. */
function applyUpgrade(unit: Unit, target: UnitTypeId): void {
  const before = unitDef(unit.type);
  const after = unitDef(target);
  const fraction = before.maxHp > 0 ? unit.hp / before.maxHp : 1;
  unit.type = target;
  // Rounded, floored at one hit point: a unit that survived its upgrade is
  // alive, however unkind the arithmetic.
  unit.hp = Math.max(1, Math.min(after.maxHp, Math.round(after.maxHp * fraction)));
  unit.movesLeft = Math.min(unit.movesLeft, after.movement);
}

// --- glanceable numbers -----------------------------------------------------

/**
 * Beakers this player's cities make in a turn.
 *
 * The same `cityYields` the pipeline banks, summed — so the "~N turns" on the
 * tech screen is the rate the next resolution will actually add.
 */
export function playerScience(state: GameState, playerId: number): number {
  let total = 0;
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    total += cityYields(state, city).science;
  }
  return total;
}

/**
 * Turns until this player could complete a technology at their current rate, or
 * `null` when they never would (no science at all).
 *
 * Every tech is measured against the *pool*, not against a bucket of its own,
 * because that is what the model is: the beakers already banked would pay for
 * whichever node the player pointed them at. So the number a locked node shows
 * is the honest answer to "and if I went for that one instead?".
 */
export function turnsToTech(
  state: GameState,
  playerId: number,
  techId: TechId,
): number | null {
  const player = playerById(state, playerId);
  if (!player) return null;
  return turnsToFill(techDef(techId).cost - player.sciencePool, playerScience(state, playerId));
}

/** One row of a queue schedule: a technology and when it would land. */
export interface ResearchQueueStep {
  techId: TechId;
  /** Turns from now, or `null` when the empire makes no science at all. */
  turns: number | null;
}

/**
 * When each technology in this player's plan would land, at the current rate.
 *
 * `turnsToTech` for a list, and the *same* `turnsToFill` the production panel
 * quotes — so the schedule the queue prints is arithmetic the turn pipeline will
 * actually perform, and there is no second copy of it in the interface.
 *
 * Two things make it more than a map over `turnsToTech`, and both are rules the
 * pipeline really has:
 *
 *   · **the costs accumulate.** The pool is one bank aimed at one node at a
 *     time, so the third entry is paid for by the beakers left after the first
 *     two — a per-node reading would promise the whole queue arriving at once.
 *   · **one technology per player per turn.** `settleResearch` completes at most
 *     one, however full the pool is (see its docblock), so the *n*-th entry can
 *     never land sooner than *n* turns from now however cheap it is. That floor
 *     is what keeps a banked four hundred beakers from printing "3 techs, 1
 *     turn" against a resolution that will hand over exactly one.
 */
export function queueTurns(state: GameState, playerId: number): ResearchQueueStep[] {
  const player = playerById(state, playerId);
  if (!player) return [];
  const rate = playerScience(state, playerId);
  const steps: ResearchQueueStep[] = [];
  let cost = 0;
  for (const techId of researchPlan(player)) {
    cost += techDef(techId).cost;
    const turns = turnsToFill(cost - player.sciencePool, rate);
    steps.push({ techId, turns: turns === null ? null : Math.max(steps.length + 1, turns) });
  }
  return steps;
}

/**
 * What building this thing everywhere it is legal would add to the empire's
 * per-turn yields, right now.
 *
 * Entry VIII's glanceable delta, computed the only honest way: `cityYields` is
 * asked twice per city — once as things stand, once with the candidate counted —
 * and the difference is reported. It is the same function the simulation banks
 * with, so the preview cannot promise a number the turn will not pay.
 *
 * "Right now" is the whole caveat and the screen labels it as such: the figure
 * is present-state (a library is worth more to a bigger city, and this is what
 * it would be worth today), and cities that already have the building
 * contribute nothing.
 */
export function buildingYieldDelta(
  state: GameState,
  playerId: number,
  id: BuildingId,
): CityYields {
  const total: CityYields = emptyCityYields();
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    if (city.buildings.includes(id)) continue;
    // Both readings are taken *toward whatever the city is building now*, so a
    // barracks is priced against the unit at the front of the queue rather than
    // reported as worth nothing. The pair is what makes it a delta: the same
    // question asked twice, with the candidate counted the second time.
    const toward = city.queue[0];
    const now = cityYields(state, city, [], toward);
    const after = cityYields(state, city, [id], toward);
    // Every voice, off the key list rather than by hand: the fifth reading was
    // missing the day faith became a thing a building could pay (the shrine and
    // the temple, 2026-08-26), which is exactly the drift a hand-written fold
    // invites.
    for (const key of CITY_YIELD_KEYS) total[key] += after[key] - now[key];
  }
  return total;
}

// --- what a resolution did --------------------------------------------------

/**
 * A player's research state at one instant: what they knew, and what their army
 * was made of.
 *
 * Captured before a turn resolves so the interface can say what changed — "Iron
 * Working mastered · 3 warriors became swordsmen" — without the simulation
 * having to keep a journal. It is plain data and a pure diff, which means the
 * announcement is reproducible from a replay rather than a side effect of having
 * been at the keyboard.
 */
export interface ResearchSnapshot {
  techs: TechId[];
  units: { id: number; type: UnitTypeId }[];
}

export interface UnitUpgradeTally {
  from: UnitTypeId;
  to: UnitTypeId;
  count: number;
}

export interface ResearchReport {
  /** Techs completed since the snapshot, in completion order. */
  techs: TechId[];
  /** Units that changed type, grouped by (from, to) in `state.units` order. */
  upgrades: UnitUpgradeTally[];
}

export function researchSnapshot(state: GameState, playerId: number): ResearchSnapshot {
  const player = playerById(state, playerId);
  return {
    techs: player ? [...player.techsResearched] : [],
    units: state.units
      .filter((unit) => unit.ownerId === playerId)
      .map((unit) => ({ id: unit.id, type: unit.type })),
  };
}

/** What happened to this player between a snapshot and now. */
export function researchSince(
  state: GameState,
  playerId: number,
  before: ResearchSnapshot,
): ResearchReport {
  const player = playerById(state, playerId);
  const known = new Set(before.techs);
  const techs = (player?.techsResearched ?? []).filter((id) => !known.has(id));

  const wasType = new Map(before.units.map((unit) => [unit.id, unit.type]));
  const upgrades: UnitUpgradeTally[] = [];
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    const from = wasType.get(unit.id);
    if (from === undefined || from === unit.type) continue;
    const tally = upgrades.find((entry) => entry.from === from && entry.to === unit.type);
    if (tally) tally.count += 1;
    else upgrades.push({ from, to: unit.type, count: 1 });
  }
  return { techs, upgrades };
}

/**
 * English plurals for unit names, which in this roster means one rule and a
 * fallback: "-man" goes to "-men" (swordsman, pikeman, composite bowman) and
 * everything else takes an "s". A `plural` field in `units.json` would be the
 * honest fix the day a name breaks both rules; until then a data field nobody
 * could get wrong is a data field nobody should have to fill in.
 */
function pluralUnitName(name: string, count: number): string {
  if (count === 1) return name;
  if (name.endsWith('man')) return `${name.slice(0, -3)}men`;
  return `${name}s`;
}

/** "3 warriors became swordsmen" — one plain sentence per upgrade group. */
export function describeUpgrade(tally: UnitUpgradeTally): string {
  const from = pluralUnitName(unitDef(tally.from).name, tally.count).toLowerCase();
  const to = pluralUnitName(unitDef(tally.to).name, tally.count).toLowerCase();
  return `${tally.count} ${from} became ${to}`;
}
