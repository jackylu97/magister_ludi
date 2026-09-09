/**
 * **The improvement plan: what this empire's ground is actually worth.**
 *
 * Before this module a worker was answered by two fixed lists. *What to lay* was
 * the first row of `ai.workers.improvements` the rules would accept, so a hex
 * that wanted a mine got a farm whenever a farm was legal on it; *where to walk*
 * was `nearestWorkableTile`, so a worker crossed an empire to reach the nearest
 * hex that would take anything at all. And *how much a town wanted a worker* was
 * the flat `weights.worker` — the same eighty points for a capital ringed by
 * unploughed wheat and for a hamlet whose every hex was already improved.
 *
 * All three are the same missing thing: **nobody ever asked what the ground
 * would pay.** This module asks, once per seat per turn, and answers with a
 * scored table that the three decisions then read.
 *
 * How an entry is priced, and every step of it is somebody else's arithmetic
 * ------------------------------------------------------------------------
 * For each workable hex this empire owns or stands beside, and each improvement
 * on the seat's roster the *ground* will take (`improvementErrorAt` — the same
 * gate a worker's spade is held to), the yield delta is
 * `improvementYieldDelta(tile, id, ctx)`: the simulation's own evaluator asked
 * twice, once as the hex stands and once with the candidate on it. The context
 * is `tileContextAt`, which is the **owning town's** — so a lighthouse's food, a
 * rite's gold on a worked seam and a reveal-gated resource are all priced
 * exactly as the citizen will actually be paid, rather than through the
 * empire-wide reading that made the Lighthouse invisible to the bot (the
 * 2026-09-03 blind spot). The delta is then weighted by `explainYields`, which
 * is the same currency every other decision is priced in.
 *
 * **One entry per hex**, carrying the best improvement for it. That is not a
 * presentation choice: a worker spends its turn on *a hex*, so a table with
 * three rows for one hex would let a town's craving for workers count the same
 * ground three times.
 *
 * The survey is an entry too
 * --------------------------
 * A hill this seat can see a sleeping seam under (`seatSeesSleepingVein`, the
 * Geomancy reveal) is worth asking: the assay is a one-time purse the rules
 * print themselves (`RULES.improvements.assayGold`), and the seam under it is
 * worth **nothing at all** — the reveal shows *that* something sleeps there and
 * never *what*, so there is no reading to take (batch H2 retired the
 * `workers.veinValue` stand-in that used to guess one). It sits in the same
 * table as a farm, so a worker compares digging to asking rather than only
 * reaching the survey when it has nothing else to do.
 *
 * The second reading of the same ground (2026-09-04, re-ruled 2026-09-09)
 * -----------------------------------------------------------------------
 * A **renewal** is priced exactly as a building is: the town's own fold with the
 * technology held, against its standing fold (`renewalFoldFor`). The seat's
 * technologies plus the candidate are a `TileYieldContext`, and the simulation's
 * own evaluator is asked twice over the hexes a citizen is actually standing on
 * — so Irrigation is worth what the ploughed river banks this town *works* would
 * collect, and nothing at all to a town with none. It prices the seam a node
 * **reveals** on those same hexes by the same arithmetic and without a second
 * clause, because the reveal gate is a clause of the same context.
 *
 * That replaces a count of every farm standing or buildable in reach
 * (`surveyUpgradeSites`, which counted ground nobody works — the user's ruling of
 * 2026-09-09), and it is the same fold `plannedRiderTerms` takes per hex: a hex
 * is priced at what it pays today **plus what a technology already on this seat's
 * research plan would add to it once the spade's own improvement is standing
 * there, discounted by how far off that node is**, so the spade goes to the river
 * bank while the beeline is still walking towards Irrigation rather than after it
 * lands.
 *
 * Why it is its own module: `value.ts` is the appraisal, `bot.ts` is the policy,
 * and this is a *reading of the board* that both the policy and the great-person
 * arm consult. It ends in a table, not in a number and not in a command, which
 * is the seam.
 */

import type { AiConfig } from './aiConfig';
import { type Appraisal, type ValueTerm, appraise, foldTerms, nest } from './decision';
import { type TileContextField, tileContextField } from './ground';
import {
  type ValueContext,
  type YieldBag,
  delayTerm,
  explainLump,
  explainYields,
  hammerTerm,
} from './value';

import { assignableTiles, hasResource, tileOwnerPlayerId, yieldScore } from '../sim/cities';
import {
  IMPROVEMENT_IDS,
  type ImprovementId,
  improvementDef,
  isImprovementId,
} from '../sim/improvementData';
import {
  chargesLeft,
  improvementErrorAt,
  improvementYieldDelta,
  seatSeesSleepingVein,
} from '../sim/improvements';
import { type Tile, getTileAt, mapRange, tileHex, tileIndex, wrappedDistance } from '../sim/map';
import { type ResourceId, resourceDef, resourceIsVisibleTo, resourceYield } from '../sim/resourceData';
import { RULES } from '../sim/rulesData';
import { type City, type GameState, type Player, type Unit, playerById } from '../sim/state';
import { researchPlan } from '../sim/tech';
import { type TechId, techDef } from '../sim/techData';
import { TILE_YIELD_KEYS, type TileYield, emptyTileYield } from '../sim/terrainData';
import { type UnitDef, type UnitTypeId, unitDef } from '../sim/unitData';
import { hasFreshWater } from '../sim/water';
import { type TileYieldContext, cityContext, foldTile } from '../sim/yields/hex';
import { round } from './decision';

/**
 * One thing a spade could do, and what it would be worth per turn.
 *
 * `improvement` is `null` for the survey arm — asking a hill is not laying
 * anything, and the two verbs are different commands.
 */
export interface PlanEntry {
  col: number;
  row: number;
  /** The improvement to lay, or `null` when the entry is a survey. */
  improvement: ImprovementId | null;
  /** What a candidate row calls it. */
  label: string;
  /** Weighted value per turn, in the one currency. Folds from `terms`. */
  value: number;
  terms: ValueTerm[];
  /** True while no worker of this empire is already standing on the hex. */
  unclaimed: boolean;
}

/** The whole table, best first, with a by-hex index for the two lookups. */
export interface ImprovementPlan {
  entries: PlanEntry[];
  /** By `tileIndex`. The entry standing on a hex, when there is one. */
  byTile: Map<number, PlanEntry>;
}

/**
 * The plan for one seat, this turn.
 *
 * **Hoisted once per decision**, `valueContext`'s bargain exactly: it walks
 * every owned hex against every improvement on the roster, which is a few
 * hundred `improvementErrorAt` calls — nothing beside one end of turn, and far
 * too much to pay per candidate of a build list.
 */
export function buildImprovementPlan(
  state: GameState,
  player: Player,
  ctx: ValueContext,
): ImprovementPlan {
  const roster = workRoster(ctx.ai);
  const occupied = workerHexes(state, player.id);
  const byTile = new Map<number, PlanEntry>();
  // **The ground's context, hoisted for the whole walk** (batch 9). Every hex of
  // one town prices through that town's own reading, and this walk asks a few
  // hundred hexes against every row of the roster; `tileContextField` is the
  // same answer `tileContextAt` gives, computed once per town. Its lifetime is
  // this call, which is a sweep, which is the rule.
  const ground = tileContextField(state, player.id);

  for (const tile of groundInReach(state, player)) {
    const at = tileIndex(state.map, tile.col, tile.row);
    if (byTile.has(at)) continue;
    const best = bestEntryOn(state, player, ctx, tile, roster, ground);
    if (best === null) continue;
    best.unclaimed = !occupied.has(at);
    byTile.set(at, best);
  }
  // Best first, then by tile index — both facts about the board rather than
  // about the order a loop happened to visit hexes in, which is what keeps two
  // identical boards producing identical worker orders.
  const entries = [...byTile.entries()]
    .sort((a, b) => b[1].value - a[1].value || a[0] - b[0])
    .map(([, entry]) => entry);
  return { entries, byTile };
}

/**
 * The seat's roster of improvements, read off its own configuration.
 *
 * A persona may name a different list; the list's *order* now decides nothing
 * but a tie, because the plan scores every row on every hex.
 */
function workRoster(ai: AiConfig): ImprovementId[] {
  return ai.workers.improvements.filter((id): id is ImprovementId => isImprovementId(id));
}

/**
 * Every hex this empire owns, plus the ring beside it — "owned or adjacent",
 * which is the ground a town's borders will reach next and the ground a worker
 * may legally stand on.
 *
 * Walked off the *towns* rather than over the whole map: a map sweep would be
 * the whole board per seat per turn to find the two dozen hexes that matter.
 */
function groundInReach(state: GameState, player: Player): Tile[] {
  const seen = new Set<number>();
  const found: Tile[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    const centre = getTileAt(state.map, city.col, city.row);
    if (!centre) continue;
    for (const tile of mapRange(state.map, tileHex(centre), REACH)) {
      const at = tileIndex(state.map, tile.col, tile.row);
      if (seen.has(at)) continue;
      seen.add(at);
      found.push(tile);
    }
  }
  return found;
}

/**
 * How far from a town centre the plan looks.
 *
 * Not a tuning knob: it is "the hexes a town could ever work, plus the ring its
 * borders might take next", which is a fact about the city radius rather than an
 * opinion about how ambitious a worker should be. The opinions are
 * `workers.planRadius` (how near a town an entry has to be to raise its craving)
 * and `workers.walkDiscount` (how far a worker will walk for one).
 */
const REACH = 3;

/** Which hexes already have one of this empire's workers standing on them. */
function workerHexes(state: GameState, playerId: number): Set<number> {
  const held = new Set<number>();
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    if (unit.chargesLeft === undefined) continue;
    held.add(tileIndex(state.map, unit.col, unit.row));
  }
  return held;
}

/** The best thing a spade could do on one hex, or `null` for nothing at all. */
function bestEntryOn(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  tile: Tile,
  roster: readonly ImprovementId[],
  ground: TileContextField,
): PlanEntry | null {
  let best: PlanEntry | null = null;
  for (const improvement of roster) {
    const entry = improvementEntry(state, player, ctx, tile, improvement, ground);
    if (entry === null) continue;
    if (best === null || entry.value > best.value) best = entry;
  }
  const survey = surveyEntry(state, player, ctx, tile);
  if (survey !== null && (best === null || survey.value > best.value)) best = survey;
  // A hex whose best idea is worth nothing is not an idea. Zero-value entries
  // are dropped rather than kept at zero, so a town ringed by finished ground
  // stops craving workers instead of craving them for free.
  return best !== null && best.value > 0 ? best : null;
}

/** One improvement on one hex, priced through the owning town's own context. */
function improvementEntry(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  tile: Tile,
  improvement: ImprovementId,
  ground: TileContextField,
): PlanEntry | null {
  if (improvementErrorAt(state, player.id, tile, improvement) !== null) return null;
  const delta = improvementYieldDelta(tile, improvement, ground(tile));
  const yields = explainYields(bagOfTileYield(delta), ctx);
  const name = improvementDef(improvement).name;
  const terms: ValueTerm[] = [nest(`${name} on (${tile.col},${tile.row})`, yields)];
  // **The hammer premium** (batch 6): a mine's hammers shorten every engine this
  // empire is still raising. The empire reading rather than a town's — a hex in
  // the ring between two towns belongs to whichever one works it, and the plan
  // does not know which — which is the fallback `hammerPrice` states.
  const hammers = hammerTerm(delta.production ?? 0, ctx);
  if (hammers !== null) terms.push(hammers);
  for (const term of plannedRiderTerms(player, ctx, tile, improvement, ground(tile))) {
    terms.push(term);
  }
  return {
    col: tile.col,
    row: tile.row,
    improvement,
    label: `${name} at (${tile.col},${tile.row})`,
    value: foldTerms(terms),
    terms,
    unclaimed: true,
  };
}

/**
 * **What this hex would collect once the plan the seat has already declared
 * comes in** — the anticipation term (ruled 2026-09-04).
 *
 * A farm on a river bank is worth two food today and three the turn Irrigation
 * lands, and a seat that is *already researching Irrigation* knows that. Pricing
 * the hex at today's yield alone sent the spade to the dry ground and left the
 * bank unploughed the whole time the beeline was walking towards the node that
 * would have paid for it.
 *
 * Three bounds, and each is the difference between an anticipation and a
 * fantasy:
 *
 *   · **the seat's own plan and nothing further** — `researchPlan` is
 *     `researching` plus the queue behind it (presence-is-state, `tech.ts`), so
 *     this reads intentions the empire has actually declared. No walk of the
 *     tree, no "a node two rungs on would also pay": a bot that priced ground by
 *     what the whole tree might one day grant would price every hex the same;
 *   · **this improvement, on this hex, asked of the evaluator** — the rider is
 *     the hex's own fold with the node held less its fold without it, taken with
 *     the candidate improvement already standing on it (2026-09-09's ruling:
 *     *"why isn't that using the already existing logic for pricing bonuses?"*).
 *     Nothing here restates a renewal's conditions: `explainTileYield` refuses a
 *     dry hex its irrigation and a nameless seam its yield, and a condition the
 *     rules grow tomorrow is answered by the same call. The register that used to
 *     have to be kept in two places is one evaluator now;
 *   · **the delay** — the node has not landed, and how far off it is is a thing
 *     this seat can actually read: the beakers still owed for it (its own cost
 *     plus everything ahead of it on the plan, less what the pool already holds)
 *     over `ValueContext.scienceRate`. That was a flat λ until batch 2 of
 *     `docs/bot-priorities.md`; now a node two turns out barely discounts the
 *     rider and one a whole horizon away prices it at nothing, which is what the
 *     flat weight could not say. The term prints the multiplication and the
 *     turns, so a reader of the feed sees a discounted promise rather than a
 *     yield the hex does not pay.
 */
function plannedRiderTerms(
  player: Player,
  ctx: ValueContext,
  tile: Tile,
  improvement: ImprovementId,
  ground: TileYieldContext | undefined,
): ValueTerm[] {
  const upgrades = improvementDef(improvement).upgrades ?? [];
  if (upgrades.length === 0) return [];
  const plan = researchPlan(player);
  if (plan.length === 0) return [];
  const terms: ValueTerm[] = [];
  for (const upgrade of upgrades) {
    if (!plan.includes(upgrade.tech)) continue;
    const each = explainYields(bagOfTileYield(techYieldDelta(tile, improvement, ground, upgrade.tech)), ctx);
    if (each.total === 0) continue;
    const discount = delayTerm(
      turnsUntilPlanned(player, ctx, upgrade.tech),
      ctx,
      'the node has still to land',
    );
    terms.push({
      label: `${techDef(upgrade.tech).name} is on the plan — what it would add here, discounted`,
      value: each.total * discount.value,
      parts: [...each.terms, discount],
    });
  }
  return terms;
}

/**
 * **What one technology would add to one hex** — the same two-askings-of-one-
 * evaluator `improvementYieldDelta` is, with the *context* as the what-if rather
 * than the tile.
 *
 * `TileYieldContext.techs` is the whole of what a renewal and a reveal are gated
 * on (`explainTileYield`), so the seat's list plus the candidate is the honest
 * hypothetical: ask the hex once as this empire reads it and once as it would
 * read it holding the node, and the difference is what the node pays here. A
 * renewal whose condition the hex fails, a seam this empire could not name and a
 * node that renews nothing all come back as nought without a clause of their own.
 *
 * `improvement` is what the spade would leave standing when the reading is a
 * plan entry's — a renewal pays a farm, so a bare bank has to be asked *with the
 * farm on it* or the promise reads zero — and `null` where the ground is being
 * read as it stands (the town's own worked hexes).
 */
function techYieldDelta(
  tile: Tile,
  improvement: ImprovementId | null,
  ground: TileYieldContext | undefined,
  tech: TechId,
): TileYield {
  // No context at all is the omniscient reading (mapgen and tests), which gates
  // nothing on technology and so cannot be asked this question honestly.
  if (ground === undefined) return emptyTileYield();
  const held = ground.techs;
  if (held.includes(tech)) return emptyTileYield();
  const after: TileYieldContext = { ...ground, techs: [...held, tech] };
  const subject = improvement === null ? tile : { ...tile, improvement };
  const now = foldTile(subject, ground);
  const then = foldTile(subject, after);
  const delta = emptyTileYield();
  for (const key of TILE_YIELD_KEYS) delta[key] = then[key] - now[key];
  return delta;
}

/**
 * **How many turns until a node the seat has declared for actually lands** — the
 * beakers still owed for it over the beakers this empire banks a turn.
 *
 * Owed is the plan's own arithmetic and not a walk of the tree: `researchPlan`
 * is `researching` plus the queue behind it, in the order they will be paid, so
 * everything ahead of the node is owed before the node is. The pool already
 * banked (`sciencePool`) comes off the front of that, floored at nothing — a
 * pool that already covers the whole plan is a plan that lands next turn.
 *
 * A seat banking no beakers at all is treated as banking one, `savingRows`'
 * bargain over in the want book: an empire whose books read flat should price a
 * node as very far off, not as never arriving at all.
 */
function turnsUntilPlanned(player: Player, ctx: ValueContext, goal: TechId): number {
  let owed = 0;
  for (const step of researchPlan(player)) {
    owed += techDef(step).cost;
    if (step === goal) break;
  }
  const remaining = Math.max(0, owed - player.sciencePool);
  return remaining / Math.max(1, ctx.scienceRate);
}

/**
 * Asking a marked hill, as a plan entry.
 *
 * Two halves and only one of them is a number: the **assay** is a one-time purse
 * the rules print (`RULES.improvements.assayGold`), converted to a per-turn
 * figure by `explainLump` so it can sit beside a farm; the **seam** is worth
 * nothing, and prints as a zero-valued label saying why. The whole point of the
 * Geomancy reveal is that the empire is shown *that* something sleeps there and
 * never *what*, so a bot that priced the actual resource would be reading a card
 * face-down — and a bot that priced an *average* resource (`workers.veinValue`,
 * retired in batch H2) would be doing the same thing with the number rounded
 * off. The layer is shelved besides (`veins.share` is 0 on every board).
 *
 * The territory clause is this bot's own, not the rule's (`prospectError` lets
 * anybody survey anywhere): a seat that walked off to read hills in the wild
 * would be an exploration policy wearing a worker.
 */
function surveyEntry(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  tile: Tile,
): PlanEntry | null {
  if (!seatSeesSleepingVein(state, player.id, tile)) return null;
  if (tileOwnerPlayerId(state, tile.col, tile.row) !== player.id) return null;
  const assay = explainLump({ gold: RULES.improvements.assayGold }, ctx);
  const terms: ValueTerm[] = [
    nest('the assay it pays out', assay),
    {
      label: 'the seam itself, unpriced — the reveal shows that something sleeps there, never what',
      value: 0,
    },
  ];
  return {
    col: tile.col,
    row: tile.row,
    improvement: null,
    label: `survey the hill at (${tile.col},${tile.row})`,
    value: assay.total,
    terms,
    unclaimed: true,
  };
}

// --- what a renewal would pay -----------------------------------------------

/**
 * **What one town's ground would collect the day a node lands** — the town's own
 * fold with the technology held, against its standing fold.
 *
 * The ruling of 2026-09-09: *"why isn't that using the already existing logic for
 * pricing bonuses? All the other bonuses are priced as if they took effect
 * immediately"*. A building is priced by a hypothetical fold of the town that
 * would raise it; a renewal is priced by a hypothetical fold of the town that
 * would collect it, and the hypothetical is a **context** rather than a shelf —
 * `TileYieldContext.techs` is the seat's list plus the candidate, which is the
 * whole of what a renewal and a reveal are gated on.
 *
 * **Over the hexes a citizen is standing on**, which is the reading's entire
 * point. What it replaces (`surveyUpgradeSites`) counted every farm standing or
 * buildable within reach of a town centre, so Irrigation was worth every hex a
 * size-3 town could one day farm; this is worth what its three citizens would
 * actually collect. The centre is deliberately outside it: nothing lays an
 * improvement on a town hex, and the centre's inheritance rule would have to be
 * re-derived here to ask it — which is the one thing this module does not do.
 *
 * Ground **nobody works yet** is not silent, it is simply somebody else's
 * question: a bare river bank is the *worker plan's* entry, priced with the farm
 * on it by `plannedRiderTerms`, and counting it here as well would pay for the
 * same bank twice.
 */
export interface RenewalTownFold {
  cityId: number;
  name: string;
  /** Weighted worth per turn, in the one currency. Folds from `terms`. */
  value: number;
  terms: ValueTerm[];
}

export interface RenewalFold {
  /** One entry per town of this empire whose fold the node moves. */
  towns: RenewalTownFold[];
  /** The empire's total. The fold of `terms`. */
  total: number;
  terms: ValueTerm[];
}

export function renewalFoldFor(ctx: ValueContext, tech: TechId): RenewalFold {
  const memo = memoOf(ctx).renewals;
  const held = memo.get(tech);
  if (held !== undefined) return held;
  const fold = readRenewalFold(ctx, tech);
  memo.set(tech, fold);
  return fold;
}

function readRenewalFold(ctx: ValueContext, tech: TechId): RenewalFold {
  const { state } = ctx;
  const player = playerById(state, ctx.playerId);
  const towns: RenewalTownFold[] = [];
  const terms: ValueTerm[] = [];
  if (player && !player.techsResearched.includes(tech)) {
    for (const city of state.cities) {
      if (city.ownerId !== ctx.playerId) continue;
      const ground = cityContext(state, city);
      const bag = emptyTileYield();
      for (const cell of city.workedTiles) {
        const tile = getTileAt(state.map, cell.col, cell.row);
        if (!tile) continue;
        const delta = techYieldDelta(tile, null, ground, tech);
        for (const key of TILE_YIELD_KEYS) bag[key] += delta[key];
      }
      const worth = explainYields(bagOfTileYield(bag), ctx);
      if (worth.total === 0) continue;
      const term = nest(`${city.name}'s worked hexes, with the node held`, worth);
      towns.push({ cityId: city.id, name: city.name, value: worth.total, terms: worth.terms });
      terms.push(term);
    }
  }
  return { towns, total: foldTerms(terms), terms };
}

/**
 * **The memo the sitting hangs off**, keyed by the appraisal context itself.
 *
 * Its lifetime is exactly the context's, which is one decision — `zocField`'s
 * and `tileContextField`'s rule said with a weak key rather than with a
 * parameter. The context is a photograph of the empire at an instant, so a
 * reading taken against it cannot outlive it and cannot be handed to a board that
 * has moved: when the context is dropped the memo goes with it.
 *
 * Nothing iterates either table — both are read by lookup — so no outcome can
 * depend on the order the questions were asked in (CLAUDE.md's rule 2).
 */
interface PlanMemo {
  /** Per town, the hexes a citizen works or the next few it would. */
  seats: Map<number, Set<number>>;
  /** Per node, what its renewals and reveals would pay this empire's towns. */
  renewals: Map<TechId, RenewalFold>;
  /** Per town, the charges the spades already on the board will spend near it. */
  spades: Map<number, number> | null;
}

const MEMOS = new WeakMap<ValueContext, PlanMemo>();

function memoOf(ctx: ValueContext): PlanMemo {
  const held = MEMOS.get(ctx);
  if (held !== undefined) return held;
  const fresh: PlanMemo = { seats: new Map(), renewals: new Map(), spades: null };
  MEMOS.set(ctx, fresh);
  return fresh;
}

// --- what a renewal would land on -------------------------------------------

/**
 * **Superseded by `renewalFoldFor`** and kept only until the beeline's own
 * reader (`renewalSteps` in `chain.ts`) is pointed at it. It counts ground
 * nobody works, which is the ruling of 2026-09-09 against it; nothing in this
 * module reads it any more.
 *
 * **How much ground a tech's renewal would actually pay on**, per improvement
 * row: hexes already carrying the improvement, plus hexes this empire could lay
 * it on today. Both halves, because both will collect the day the node lands —
 * a farm standing on a river bank and a river bank that will have a farm on it
 * are the same promise a few worker-turns apart.
 *
 * The tally is **four numbers, not one**: standing and buildable, each with the
 * part of it that can drink — which is the one condition an `ImprovementUpgrade`
 * may carry besides its tech (`requiresFreshwater`). Standing and buildable are
 * apart because they are a fact and a promise and the bot prices those
 * differently (`delayDiscount`, batch 2); the freshwater halves are
 * apart for the older reason. **A third condition on that record must be counted
 * here too** — this survey is the register of what the rider appraisal knows how
 * to bound, and a condition it cannot see would be priced as if it were not
 * there.
 *
 * The **bound** is `groundInReach`, the same ground the improvement plan reads:
 * every hex within `REACH` of one of this empire's town centres, deduped. That
 * is not a sample — `improvementErrorAt` refuses unowned ground outright, so
 * every hex a spade could legally reach today is inside it — but it does mean a
 * border that grows past the ring tomorrow is not counted today, which is the
 * honest reading of "could build on" for an empire that has not claimed it yet.
 *
 * **One sweep, read by every candidate node.** `explainTechGifts` is asked of
 * fifty nodes a turn and its docblock warns about exactly this: a sweep per row
 * would be fifty empire walks. This is one walk of the same ground the plan
 * already walks, hoisted by `techGoalTable` and handed down.
 */
export interface UpgradeTally {
  /**
   * Hexes of this empire's **already carrying** the improvement. The realized
   * half: they collect the renewal the turn the node lands, with no spade.
   */
  standing: number;
  /**
   * Hexes this empire's spade could lay the improvement on today. The
   * **potential** half, discounted by the reader for the walk that has still to
   * happen (`delayDiscount`) — a river bank that will have a farm on it is the
   * same promise a few worker-turns away, and those worker-turns are exactly
   * what the discount is.
   */
  buildable: number;
  /** The part of `standing` that can drink. See `requiresFreshwater`. */
  standingFresh: number;
  /** The part of `buildable` that can drink. */
  buildableFresh: number;
}

export interface UpgradeSites {
  /** By improvement, the hexes a renewal on that row would pay. */
  byImprovement: Map<ImprovementId, UpgradeTally>;
}

/** The empty tally, for a row nothing was counted for. */
export function noUpgradeSites(): UpgradeTally {
  return { standing: 0, buildable: 0, standingFresh: 0, buildableFresh: 0 };
}

export function surveyUpgradeSites(state: GameState, player: Player): UpgradeSites {
  const byImprovement = new Map<ImprovementId, UpgradeTally>();
  const rows = IMPROVEMENT_IDS.filter(
    (id): id is ImprovementId => (improvementDef(id).upgrades ?? []).length > 0,
  );
  if (rows.length === 0) return { byImprovement };
  for (const row of rows) byImprovement.set(row, noUpgradeSites());
  for (const tile of groundInReach(state, player)) {
    for (const row of rows) {
      // Already standing here (and ours — a neighbour's farm collects for the
      // neighbour), or ground this empire's spade would be allowed to lay it on.
      // `improvementErrorAt` is the same gate the plan and the worker are held
      // to, technology included: a renewal on a row this empire cannot build yet
      // is a promise it cannot keep, and is counted at nothing until it can.
      const standing =
        tile.improvement === row && tileOwnerPlayerId(state, tile.col, tile.row) === player.id;
      if (!standing && improvementErrorAt(state, player.id, tile, row) !== null) continue;
      const tally = byImprovement.get(row)!;
      const fresh = hasFreshWater(tile);
      // **The two halves are counted apart** (the potential weight, 2026-09-04):
      // a farm standing on a river bank is a fact and a river bank that could
      // take one is a promise, and the reader is the one that decides what a
      // promise is worth. Counting them together — which is what `hexes` did —
      // priced every promise at par.
      if (standing) {
        tally.standing += 1;
        if (fresh) tally.standingFresh += 1;
      } else {
        tally.buildable += 1;
        if (fresh) tally.buildableFresh += 1;
      }
    }
  }
  return { byImprovement };
}

/** A tile yield delta as a bag the appraisal weights. The keys are the voices. */
function bagOfTileYield(delta: TileYield): YieldBag {
  const bag: YieldBag = {};
  for (const key of TILE_YIELD_KEYS) bag[key] = delta[key];
  return bag;
}

// --- what the three decisions ask of it -------------------------------------

/**
 * **What one more spade would actually lay for this town** — and therefore how
 * badly it wants one.
 *
 * The ruling of 2026-09-09, in the user's own words: *"the value of a worker
 * should be the yields of the top improvable tiles based on the number of workers
 * it has"*, and *"workers early is fine, as long as those tiles will be worked"*.
 * Four clauses, and each of them is a thing this fold used to get wrong:
 *
 *   · **the entries it would lay, not a ranked window.** A worker is `charges`
 *     spades in a box (`UnitDef.charges`, three for a Worker) and each row costs
 *     `ImprovementDef.chargeCost`, so what one more of them is worth is the best
 *     entries its charges actually buy. `workers.planTopN` × `planFalloff` was a
 *     decay over rank standing in for that count; **`planFalloff` is retired**,
 *     because a decay over rank is not a real thing and the count is;
 *   · **on ground somebody will stand on.** An entry counts only on a hex a
 *     citizen of this town works, or one of the next few it would work — the
 *     town's own ranking of its assignable hexes, `population + 2` deep (see
 *     `citizenSeats`). Before this, a size-2 town with eight farmable hexes read
 *     eight entries and craved spades for ground nobody would stand on for
 *     twenty turns (the one-game read of 2026-09-09);
 *   · **at the turn it lands.** The tile pays once the farm is on it, and getting
 *     there is a walk and a turn with a spade in the ground — sequential, because
 *     one worker digs one hex at a time. Each entry is discounted by `delayTerm`
 *     at its own landing turn, and an entry past the horizon is worth nothing and
 *     ends the fold;
 *   · **less what the spades already out will reach.** Each existing worker of
 *     this empire is attributed to the town nearest it and its **remaining**
 *     charges (`Unit.chargesLeft`) come off the front of that town's list, so the
 *     second worker is priced against the ground the first has not got to.
 *
 * The whole point is still that it moves: a capital ringed by unploughed wheat
 * its citizens will work craves spades, and a hamlet whose two worked hexes are
 * finished does not.
 */
export function explainWorkerCraving(
  plan: ImprovementPlan,
  state: GameState,
  city: City,
  ctx: ValueContext,
  spade: UnitTypeId,
): Appraisal {
  const centre = getTileAt(state.map, city.col, city.row);
  if (!centre) return appraise([]);
  const def = unitDef(spade);
  const here = tileHex(centre);
  const seats = citizenSeats(state, city, ctx);
  const stride = Math.max(1, def.movement);
  const terms: ValueTerm[] = [];

  let charges = Math.max(1, def.charges ?? 1);
  // What the spades already on the board will have taken by the time this one is
  // standing. Counted off the front of the same ranked list, because that is the
  // order they will take them in.
  let spoken = spokenFor(state, city, ctx);
  let clock = 0;
  let from = here;

  for (const entry of plan.entries) {
    if (charges <= 0) break;
    if (!entry.unclaimed) continue;
    const tile = getTileAt(state.map, entry.col, entry.row);
    if (!tile) continue;
    const at = tileIndex(state.map, entry.col, entry.row);
    if (!seats.has(at)) continue;
    if (wrappedDistance(state.map, here, tileHex(tile)) > ctx.ai.workers.planRadius) continue;
    // A survey spends no charge at all (`prospectAt` takes the turn and nothing
    // else), which is why the cost is read off the row rather than assumed.
    const cost = entry.improvement === null ? 0 : improvementDef(entry.improvement).chargeCost;
    if (cost > 0 && spoken >= cost) {
      spoken -= cost;
      continue;
    }
    if (cost > charges) continue;
    const step = wrappedDistance(state.map, from, tileHex(tile));
    // The walk, then the turn the spade spends with its hands in the ground: a
    // build takes the whole of a worker's movement (`buildImprovementAt`).
    clock += Math.ceil(step / stride) + 1;
    const discount = delayTerm(clock, ctx, 'the spade has to walk out and dig');
    // The clock only ever runs forward, so the first entry past the horizon is
    // the last entry there is.
    if (discount.value <= 0) break;
    charges -= cost;
    from = tileHex(tile);
    terms.push({
      label: `${entry.label} — ${round(entry.value)} a turn, ${round(clock)} turns out`,
      value: entry.value * discount.value,
      parts: [{ label: entry.label, value: entry.value }, discount],
    });
  }
  return appraise(terms);
}

/**
 * **The hexes this town's people are standing on, plus the next few they would**
 * — the bound the ruling of 2026-09-09 put on the craving.
 *
 * The ranking is the town's own and never a second opinion: `assignableTiles`
 * for what may be worked at all, `yieldScore` of the simulation's own `foldTile`
 * through the town's context for the order, ties by tile index — which is
 * `chooseCitizens`' greedy, read rather than re-implemented. Its worked list goes
 * in whole beside it, because a pinned hex is worked whatever the ranking says.
 *
 * `AHEAD` is the ruling's own "the next few": two citizens past the town's
 * present size. It is a constant rather than a knob because it is the ruling's
 * sentence, not an opinion about it — and because the *real* bound on how far a
 * craving reaches is the horizon, which the delay already applies.
 */
const AHEAD = 2;

function citizenSeats(state: GameState, city: City, ctx: ValueContext): Set<number> {
  const memo = memoOf(ctx).seats;
  const held = memo.get(city.id);
  if (held !== undefined) return held;
  const seats = new Set<number>();
  for (const cell of city.workedTiles) seats.add(tileIndex(state.map, cell.col, cell.row));
  const ground = cityContext(state, city);
  const ranked = assignableTiles(state, city)
    .map((tile) => ({ at: tileIndex(state.map, tile.col, tile.row), score: yieldScore(foldTile(tile, ground)) }))
    .sort((a, b) => b.score - a.score || a.at - b.at);
  for (const row of ranked.slice(0, Math.max(1, city.population + AHEAD))) seats.add(row.at);
  memo.set(city.id, seats);
  return seats;
}

/**
 * **How much of this town's list the spades already out will have taken**, in
 * charges — `Unit.chargesLeft`, which is what a worker has left to give and not
 * what it was built with.
 *
 * Each spade is attributed to the town **nearest it**, ties by city id, which is
 * the crude half and is written down as crude: a worker standing in the capital's
 * ring is going to plough the capital's ring. Charging every town for every spade
 * would have one worker talk three towns out of wanting one, and charging none of
 * them is how an empire comes to hold six.
 *
 * Taken once per sitting and read per town, `tileContextField`'s bargain: the
 * attribution is a fact about the board that every town's craving shares.
 */
function spokenFor(state: GameState, city: City, ctx: ValueContext): number {
  const memo = memoOf(ctx);
  if (memo.spades === null) {
    const spades = new Map<number, number>();
    for (const unit of state.units) {
      if (unit.ownerId !== ctx.playerId) continue;
      if (!laysGround(unitDef(unit.type))) continue;
      const standing = getTileAt(state.map, unit.col, unit.row);
      if (!standing) continue;
      const on = tileHex(standing);
      let nearest: { id: number; distance: number } | null = null;
      for (const town of state.cities) {
        if (town.ownerId !== ctx.playerId) continue;
        const centre = getTileAt(state.map, town.col, town.row);
        if (!centre) continue;
        const distance = wrappedDistance(state.map, tileHex(centre), on);
        if (nearest === null || distance < nearest.distance) nearest = { id: town.id, distance };
      }
      if (nearest === null) continue;
      spades.set(nearest.id, (spades.get(nearest.id) ?? 0) + chargesLeft(unit));
    }
    memo.spades = spades;
  }
  return memo.spades.get(city.id) ?? 0;
}

/**
 * Is this row the piece that lays farms and mines — as opposed to the other
 * things in the roster that also carry charges?
 *
 * `isPlainBuilder`'s sentence (`bot.ts`), read off the row's own markers and
 * never off a type name. Written here rather than imported because that one is
 * private to the policy and this is a reading of the board — the same split
 * `src/arenaPage/run.ts` makes for the same reason.
 */
function laysGround(def: UnitDef): boolean {
  if (def.charges === undefined) return false;
  if (def.foundsCity === true) return false;
  if (def.greatWork === true) return false;
  if (def.consecrates === true) return false;
  if (def.prophesies === true) return false;
  if (def.proclaims === true) return false;
  return true;
}

/**
 * The entry a worker standing here should walk to (or act on where it stands),
 * **distance-discounted**, or `null` when the plan has nothing for it.
 *
 * `value / (1 + hexes × workers.walkDiscount)`: a hex under the piece's feet is
 * worth its whole value, and one six hexes away is worth what is left of it
 * after the walk. That is what replaces `nearestWorkableTile`, which sorted by
 * distance alone and so sent a worker past a wheat field to reach a tundra hex
 * that happened to be nearer.
 *
 * Only `unclaimed` entries, so two workers standing in one town do not both walk
 * to the same wheat.
 */
export function rankPlanFor(
  plan: ImprovementPlan,
  state: GameState,
  unit: Unit,
  ctx: ValueContext,
): { entry: PlanEntry; score: number; distance: number; terms: ValueTerm[] }[] {
  const from = getTileAt(state.map, unit.col, unit.row);
  if (!from) return [];
  const here = tileHex(from);
  const at = tileIndex(state.map, unit.col, unit.row);
  const ranked: { entry: PlanEntry; score: number; distance: number; terms: ValueTerm[] }[] = [];
  for (const entry of plan.entries) {
    const tile = getTileAt(state.map, entry.col, entry.row);
    if (!tile) continue;
    const on = tileIndex(state.map, entry.col, entry.row);
    // The hex the piece is standing on is never "claimed by somebody else" — it
    // is claimed by *this* piece, which is the one worker allowed to want it.
    if (!entry.unclaimed && on !== at) continue;
    const distance = wrappedDistance(state.map, here, tileHex(tile));
    const discount = 1 + distance * ctx.ai.workers.walkDiscount;
    const terms: ValueTerm[] = [
      ...entry.terms,
      {
        label:
          distance === 0
            ? 'under its feet — no walk to discount'
            : `÷ ${round(discount)} — ${distance} hexes of walking at ${round(ctx.ai.workers.walkDiscount)} a hex`,
        value: discount,
        op: 'div',
      },
    ];
    ranked.push({ entry, score: entry.value / discount, distance, terms });
  }
  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      a.distance - b.distance ||
      tileIndex(state.map, a.entry.col, a.entry.row) - tileIndex(state.map, b.entry.col, b.entry.row),
  );
  return ranked;
}

/**
 * The hexes one **named** improvement would be worth most on, best first — the
 * great person's half of the plan.
 *
 * A work is not on the worker's roster (an academy is not something a spade
 * lays), so it cannot come out of the shared table; but it is priced by exactly
 * the same arithmetic, which is what lets "plant the work here" be compared
 * against "spend the person now" in one currency. The search is a ring around
 * the piece, because a great person walks like anything else and a work twenty
 * hexes away is a work in somebody else's empire.
 *
 * **Plus the two gifts a work makes that a spade does not** (`workGifts`), which
 * the great person's arm used to price at nothing at all.
 */
export function rankWorkSites(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  improvement: ImprovementId,
  unit: Unit,
  radius: number,
): { entry: PlanEntry; score: number; distance: number; terms: ValueTerm[] }[] {
  const from = getTileAt(state.map, unit.col, unit.row);
  if (!from) return [];
  const here = tileHex(from);
  // One reading of "is this seam already in our hands" per *kind*, not per hex:
  // `hasResource` sweeps the whole map, and the answer is a fact about the
  // empire that cannot change while this ring is being walked. A cache, never an
  // iteration — nothing downstream reads its order.
  const held = new Map<ResourceId, boolean>();
  // The ring's contexts, hoisted for this walk exactly as the plan hoists them
  // for its own (batch 9) — one reading per town rather than one per hex.
  const ground = tileContextField(state, player.id);
  const ranked: { entry: PlanEntry; score: number; distance: number; terms: ValueTerm[] }[] = [];
  for (const tile of mapRange(state.map, here, radius)) {
    const entry = improvementEntry(state, player, ctx, tile, improvement, ground);
    if (entry === null) continue;
    const distance = wrappedDistance(state.map, here, tileHex(tile));
    const discount = 1 + distance * ctx.ai.workers.walkDiscount;
    const terms: ValueTerm[] = [
      ...entry.terms,
      ...workGifts(state, player, ctx, tile, improvement, held),
      {
        label:
          distance === 0
            ? 'under its feet — no walk to discount'
            : `÷ ${round(discount)} — ${distance} hexes of walking`,
        value: discount,
        op: 'div',
      },
    ];
    // The fold **is** the score (`decision.ts`' first rule): the gifts are adds
    // ahead of the walk's divide, so the discount reaches them exactly as it
    // reaches the ground's own value.
    ranked.push({ entry, score: foldTerms(terms), distance, terms });
  }
  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      a.distance - b.distance ||
      tileIndex(state.map, a.entry.col, a.entry.row) - tileIndex(state.map, b.entry.col, b.entry.row),
  );
  return ranked;
}

/**
 * **What a work is worth over and above the ground it improves** — the two
 * second-order gifts the great-person arm used to write down as zero.
 *
 * Both are read off *markers* rather than off a name, so a sixth work inherits
 * whichever of them its row carries and nothing here has to learn about it:
 *
 *   · **the seam it opens.** A work opens whatever it stands on, whether or not
 *     any improvement in the table would have (`openedResource`'s work clause in
 *     `cities.ts` — the compendium's "Iron · academy"), so a citadel on an iron
 *     hill hands its empire the iron. It is priced only where the empire would
 *     actually gain something: past the reveal gate (`resourceIsVisibleTo` — an
 *     empire with no word for the seam is handed nothing), for a kind
 *     `hasResource` says is in nobody's hands today (a second copy of held silk
 *     is a second copy of a signature that is already paying), and never for a
 *     **bonus** seam at all — wheat's whole worth is the yield on its own hex,
 *     which the delta above has already counted and which is paid to whoever
 *     works the tile whether or not anybody "holds" it.
 *
 *     What it is priced *at* is the seam's own yield row, weighted like any
 *     other bag — and that is **crude and written down as crude**: the tile's
 *     own reading of the resource already stands in `improvementYieldDelta` on
 *     both sides of the diff and cancels out of it, so this is not that number
 *     twice; it is a stand-in for holding a copy at all. A luxury's *signature*
 *     — its contentment, its per-city coin, its Æra III rider — is a list read
 *     by one evaluator that cannot be asked hypothetically, and nothing here
 *     switches on it (`CLAUDE.md`). It is therefore still unpriced, and a
 *     luxury is worth strictly more to this bot than it says.
 *   · **the defender line it plants** (`ImprovementDef.defense`, the citadel's
 *     eight), at `workers.workDefenseValue` a point — a number in the data file
 *     rather than an opinion in the code.
 *
 * Leonardo's amplifier stays out of scope, as it is for the act
 * (`explainAct` in `bot.ts`): it is a card evaluated hypothetically and
 * `statecraft.ts` does not answer that.
 */
function workGifts(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  tile: Tile,
  improvement: ImprovementId,
  held: Map<ResourceId, boolean>,
): ValueTerm[] {
  const def = improvementDef(improvement);
  const terms: ValueTerm[] = [];

  const seam = tile.resource;
  if (
    seam !== undefined &&
    def.greatPerson !== undefined &&
    resourceDef(seam).kind !== 'bonus' &&
    resourceIsVisibleTo(seam, player.techsResearched)
  ) {
    let mine = held.get(seam);
    if (mine === undefined) {
      mine = hasResource(state, player.id, seam);
      held.set(seam, mine);
    }
    if (!mine) {
      terms.push(
        nest(
          `it opens the ${resourceDef(seam).name} under it — a seam this empire holds nowhere else`,
          explainYields(bagOfTileYield(resourceYield(seam)), ctx),
        ),
      );
    }
  }

  const defense = def.defense ?? 0;
  if (defense !== 0) {
    terms.push({
      label: `${defense} strength for whoever holds the hex × ${round(ctx.ai.workers.workDefenseValue)}`,
      value: defense * ctx.ai.workers.workDefenseValue,
    });
  }
  return terms;
}

