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
 * worth `workers.veinValue` a turn as a stand-in for a resource nobody has named
 * yet. It sits in the same table as a farm, so a worker compares digging to
 * asking rather than only reaching the survey when it has nothing else to do.
 *
 * Why it is its own module: `value.ts` is the appraisal, `bot.ts` is the policy,
 * and this is a *reading of the board* that both the policy and the great-person
 * arm consult. It ends in a table, not in a number and not in a command, which
 * is the seam.
 */

import type { AiConfig } from './aiConfig';
import { type Appraisal, type ValueTerm, appraise, foldTerms, nest } from './decision';
import { type ValueContext, type YieldBag, explainLump, explainYields } from './value';

import { hasResource, tileContextAt, tileOwnerPlayerId } from '../sim/cities';
import { type ImprovementId, improvementDef, isImprovementId } from '../sim/improvementData';
import { improvementErrorAt, improvementYieldDelta, seatSeesSleepingVein } from '../sim/improvements';
import { type Tile, getTileAt, mapRange, tileHex, tileIndex, wrappedDistance } from '../sim/map';
import { type ResourceId, resourceDef, resourceIsVisibleTo, resourceYield } from '../sim/resourceData';
import { RULES } from '../sim/rulesData';
import type { City, GameState, Player, Unit } from '../sim/state';
import { TILE_YIELD_KEYS, type TileYield } from '../sim/terrainData';

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

  for (const tile of groundInReach(state, player)) {
    const at = tileIndex(state.map, tile.col, tile.row);
    if (byTile.has(at)) continue;
    const best = bestEntryOn(state, player, ctx, tile, roster);
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
): PlanEntry | null {
  let best: PlanEntry | null = null;
  for (const improvement of roster) {
    const entry = improvementEntry(state, player, ctx, tile, improvement);
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
): PlanEntry | null {
  if (improvementErrorAt(state, player.id, tile, improvement) !== null) return null;
  const delta = improvementYieldDelta(tile, improvement, tileContextAt(state, player.id, tile));
  const yields = explainYields(bagOfTileYield(delta), ctx);
  const name = improvementDef(improvement).name;
  const terms: ValueTerm[] = [nest(`${name} on (${tile.col},${tile.row})`, yields)];
  return {
    col: tile.col,
    row: tile.row,
    improvement,
    label: `${name} at (${tile.col},${tile.row})`,
    value: yields.total,
    terms,
    unclaimed: true,
  };
}

/**
 * Asking a marked hill, as a plan entry.
 *
 * Two halves and they are two different kinds of number: the **assay** is a
 * one-time purse the rules print (`RULES.improvements.assayGold`), converted to
 * a per-turn figure by `explainLump` so it can sit beside a farm; the **seam**
 * is `workers.veinValue` a turn, which is a stand-in — the whole point of the
 * Geomancy reveal is that the empire is shown *that* something sleeps there and
 * never *what*, so a bot that priced the actual resource would be reading a
 * card face-down.
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
      label: `a seam nobody has named yet, worth ${ctx.ai.workers.veinValue} a turn`,
      value: ctx.ai.workers.veinValue,
    },
  ];
  return {
    col: tile.col,
    row: tile.row,
    improvement: null,
    label: `survey the hill at (${tile.col},${tile.row})`,
    value: assay.total + ctx.ai.workers.veinValue,
    terms,
    unclaimed: true,
  };
}

/** A tile yield delta as a bag the appraisal weights. The keys are the voices. */
function bagOfTileYield(delta: TileYield): YieldBag {
  const bag: YieldBag = {};
  for (const key of TILE_YIELD_KEYS) bag[key] = delta[key];
  return bag;
}

// --- what the three decisions ask of it -------------------------------------

/**
 * **What a town's unimproved ground is worth to it** — and therefore how badly
 * it wants another worker.
 *
 * The fold of the best `workers.planTopN` unclaimed entries inside
 * `workers.planRadius` of the town, each worth `workers.planFalloff` of the one
 * before it. The falloff is the honest half: one worker cannot lay four farms
 * this decade, so the fourth-best hex is worth a fraction of the first.
 *
 * This replaces the flat `weights.worker`, and the whole point is that it moves:
 * a capital ringed by unploughed wheat craves workers, a hamlet whose every hex
 * is finished does not, and neither of those sentences could be said before.
 * The hard `workers.cap` stays, as a safety rather than as the policy.
 */
export function explainWorkerCraving(
  plan: ImprovementPlan,
  state: GameState,
  city: City,
  ctx: ValueContext,
): Appraisal {
  const centre = getTileAt(state.map, city.col, city.row);
  if (!centre) return appraise([]);
  const here = tileHex(centre);
  const near: PlanEntry[] = [];
  for (const entry of plan.entries) {
    if (!entry.unclaimed) continue;
    const tile = getTileAt(state.map, entry.col, entry.row);
    if (!tile) continue;
    if (wrappedDistance(state.map, here, tileHex(tile)) > ctx.ai.workers.planRadius) continue;
    near.push(entry);
    if (near.length >= Math.max(1, ctx.ai.workers.planTopN)) break;
  }
  const terms: ValueTerm[] = [];
  let share = 1;
  for (const entry of near) {
    terms.push({
      label:
        `${entry.label} — ${round(entry.value)} a turn` +
        (share === 1 ? '' : ` × ${round(share)} (one spade, one hex at a time)`),
      value: entry.value * share,
    });
    share *= ctx.ai.workers.planFalloff;
  }
  return appraise(terms);
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
  const ranked: { entry: PlanEntry; score: number; distance: number; terms: ValueTerm[] }[] = [];
  for (const tile of mapRange(state.map, here, radius)) {
    const entry = improvementEntry(state, player, ctx, tile, improvement);
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
 *     twice; it is a stand-in for holding a copy at all, the way
 *     `workers.veinValue` stands in for an unnamed seam. A luxury's *signature*
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

/** One decimal place, and no trailing `.0` — a label is read, not parsed. */
function round(value: number): string {
  const fixed = Math.round(value * 10) / 10;
  return Number.isInteger(fixed) ? String(fixed) : fixed.toFixed(1);
}
