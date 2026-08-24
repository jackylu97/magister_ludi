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
 * The ages cost 167 / 1272 / 2456 beakers; the two starting techs are free, so a
 * whole game pays 3865. Those figures are *measured*, not guessed. The science
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
 */

import { type BuildingId, buildingDef, isBuildingId } from './buildingData';
import { type CityYields, cityYields, emptyCityYields, hasResource, turnsToFill } from './cities';
import type { Tile } from './map';
import { type ResourceId, resourceDef, resourceIsVisibleTo } from './resourceData';
import { RULES } from './rulesData';
import {
  type GameState,
  type Player,
  type Unit,
  playerById,
} from './state';
import {
  BUILDING_UNLOCK_TECH,
  TECH_IDS,
  type TechId,
  UNIT_UNLOCK_TECH,
  isTechId,
  techDef,
} from './techData';
import { type UnitTypeId, isUnitTypeId, unitDef } from './unitData';

const RESEARCH = RULES.research;

// --- what a player knows ----------------------------------------------------

/** Has this player researched this technology? */
export function hasTech(state: GameState, playerId: number, techId: TechId): boolean {
  const player = playerById(state, playerId);
  if (!player) return false;
  return player.techsResearched.includes(techId);
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
  kind: 'unit' | 'building',
  id: string,
): boolean {
  const gate =
    kind === 'unit'
      ? isUnitTypeId(id)
        ? UNIT_UNLOCK_TECH.get(id)
        : undefined
      : isBuildingId(id)
        ? BUILDING_UNLOCK_TECH.get(id)
        : undefined;
  if (gate === undefined) return true;
  return hasTech(state, playerId, gate);
}

/** The technology that gates a queue item, or `null` when nothing does. */
export function gatingTech(kind: 'unit' | 'building', id: string): TechId | null {
  if (kind === 'unit') return (isUnitTypeId(id) && UNIT_UNLOCK_TECH.get(id)) || null;
  return (isBuildingId(id) && BUILDING_UNLOCK_TECH.get(id)) || null;
}

/** The display name of a unit or building id, or the raw id if it is unknown. */
function itemName(kind: 'unit' | 'building', id: string): string {
  if (kind === 'unit') return isUnitTypeId(id) ? unitDef(id).name : id;
  return isBuildingId(id) ? buildingDef(id).name : id;
}

/**
 * The strategic resource a queue item needs, or `null` when it needs none.
 *
 * Buildings never do today; the signature takes the kind anyway so the gate
 * below can ask one question about either, and so the day a stable needs horses
 * this is the only line that changes.
 */
export function requiredResource(kind: 'unit' | 'building', id: string): ResourceId | null {
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
 */
export function buildError(
  state: GameState,
  playerId: number,
  kind: 'unit' | 'building',
  id: string,
): string | null {
  if (!isUnlocked(state, playerId, kind, id)) {
    const gate = gatingTech(kind, id);
    const needs = gate ? techDef(gate).name : 'a technology you do not have';
    return `${itemName(kind, id)} needs ${needs}`;
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
 * Why this player cannot start researching this technology, or `null` when they
 * can.
 *
 * The rule the `chooseResearch` command validates with and the tech screen
 * enables its nodes by — one implementation, so a node the screen lets you click
 * is a node the reducer accepts. It asks nothing about the *turn*: whether a
 * seat has already finished is a question about the actor and belongs to the
 * command, exactly as `foundingError` leaves it there.
 *
 * Switching mid-research is deliberately not an error (see the module docblock);
 * re-choosing what is *already* being researched is, because it would be a
 * command that changes nothing and a log entry that says nothing.
 */
export function researchError(
  state: GameState,
  playerId: number,
  techId: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  if (!isTechId(techId)) return `Unknown technology "${String(techId)}"`;

  const def = techDef(techId);
  if (player.techsResearched.includes(techId)) {
    return `${player.name} has already researched ${def.name}`;
  }
  if (player.researching === techId) return `${def.name} is already being researched`;

  const missing = missingPrereqs(state, playerId, techId);
  if (missing.length > 0) {
    return `${def.name} needs ${missing.map((id) => techDef(id).name).join(', ')}`;
  }
  return null;
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
    const id = player.researching;
    // A hand-edited save can name a tech that no longer exists; drop the aim
    // rather than blocking the player's research forever.
    if (id === null) continue;
    if (!isTechId(id)) {
      player.researching = null;
      continue;
    }
    const def = techDef(id);
    if (player.sciencePool < def.cost) continue;

    player.sciencePool -= def.cost;
    player.researching = null;
    player.techsResearched.push(id);
    upgradeUnits(state, player);
  }
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
    total.food += after.food - now.food;
    total.production += after.production - now.production;
    total.gold += after.gold - now.gold;
    total.science += after.science - now.science;
    total.culture += after.culture - now.culture;
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
