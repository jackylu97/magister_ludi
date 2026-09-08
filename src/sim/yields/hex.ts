/**
 * **The hex** — what one tile pays, and why (`docs/yields.md` step 2, and the
 * seven-step order stated inside it).
 *
 * The first layer of the sequence and the only self-contained one: a town bonus
 * cannot reach in here, which is what makes the order structural rather than
 * incidental. `explainTileYield` is the list, `foldTileLines` is its sum, and
 * `foldTile` is the pair asked together — the three verbs at the scale of one
 * hex (`readings.ts` states the vocabulary).
 *
 * Split out of `cities.ts` in batch E3b (`docs/flags.md` item pp,
 * `docs/audit/evaluations.md` §4b step 9: *files by layer, not by topic*). Not
 * one line of arithmetic moved — the parity fixtures are the gate — and the file
 * it came out of re-exports every name, so no import path anywhere had to
 * change.
 *
 * **The graph.** It imports `cities.ts` back for the ownership readings a
 * context is built from (`tileOwnerCityId`, `cityAt`, `ownedTiles`, the
 * resource clauses). That is a *function-level* cycle, the documented kind
 * (CLAUDE.md): nothing here runs at load, so whichever module is pulled in
 * first finishes fine, and `test/mapgen/moduleCycles.test.ts` loads every file
 * under `src/sim/**` as an entry to prove it. Nothing under `yields/` imports
 * `readings.ts` — the memos sit above this layer, never inside it.
 */

import { type BuildingId } from '../buildingData';
import { type Tile } from '../map';
import { improvementDef, improvementYield } from '../improvementData';
import { resourceDef, resourceIsVisibleTo, resourceYield } from '../resourceData';
import { type CardId } from '../statecraftData';
import {
  type TileLine,
  cardTileLines,
  consecrationCardTileLines,
  followerCardTileLines,
  scopedCardTileLines,
  timedCityTileLines,
  tileConditionHolds,
  tileConditionReadsFold,
} from '../statecraft';
import { type City, type GameState, playerById } from '../state';
import {
  TERRAIN_DATA,
  TILE_YIELD_KEYS,
  type TileYield,
  emptyTileYield,
  featureDef,
  readTileYield,
  terrainDef,
} from '../terrainData';
import { type TechId, techDef } from '../techData';
import { resourceTileLines } from '../resourceEffects';
import { buildingTileLines, buildingsIrrigate } from '../buildingEffects';

// --- tiles ------------------------------------------------------------------

/**
 * What a tile pays, and *why* — CLAUDE.md's hard rule 5 made a function.
 *
 * `explainTileYield` returns an ordered list of contributions and `foldTile`
 * is the fold of that list. There is deliberately no second implementation: a
 * total computed beside the breakdown is a total that can disagree with the
 * explanation the interface prints, and the whole of Entry VIII is that a
 * preview cannot be allowed to lie.
 *
 * The order is the order the rules resolve in, and it is the one order this
 * chain is ever read in:
 *
 *     terrain base  →  feature override  →  hills override
 *                   →  resource add  →  improvement add  →  renewal adds
 *
 * Two kinds of entry and the fold treats them differently, which is what lets
 * one list carry two different algebras (see `terrainData.ts`, which has three):
 *
 *   `base` / `override`  **replace** the running total. That is Civ's rule for
 *                        the ground itself — a hill is a hill whatever grows on
 *                        it — and writing the feature down *even when a hill
 *                        overrides it* is the point: "Forest 1🌾1⚙, replaced by
 *                        Hills 0🌾2⚙" is the sentence a player needs, and the
 *                        fold reaches the same number either way.
 *   `add`                **sums**. A resource, an improvement and a renewal are
 *                        all things sitting *on* the ground rather than a
 *                        different kind of ground, which is what makes wheat
 *                        worth the same point of food wherever it lands.
 *
 * Workability is a separate question and is not touched here: a mountain with a
 * resource on it would still be unworkable, which is why `isWorkableTile` asks
 * the terrain and not the yield.
 *
 * The context, and who passes one
 * -------------------------------
 * Everything above the resource is a fact about the *tile*. The resource line
 * and the renewals are facts about the tile **and its owner** — Feudalism gives
 * freshwater farms a second food, and only to the empire that researched it —
 * so they need a player, and a function that took a whole `GameState` would drag
 * this module into an import cycle with `tech.ts` (which already depends on it).
 * `TileYieldContext` is therefore the minimum the evaluation actually needs: the
 * technologies held.
 *
 * `explainTileYield(tile)` with no context is the **omniscient** answer: every
 * line the ground could ever pay, to nobody in particular. That is the right
 * call for anything asking about *ground* rather than about an empire — the
 * mapgen page's start scorer, a report over a board with no players on it — and
 * it is emphatically the wrong call for a tile somebody owns. Who passes what is
 * written down in the `yieldContextFor` docblock, because a call site that
 * quietly stopped passing one would over-report a hidden seam and under-report a
 * renewal, and nothing would fail.
 *
 * The reveal gate
 * ---------------
 * A resource pays **only an empire that can be told it is there**
 * (`resourceIsVisibleTo`, the same rule `isResourceVisible` and `openedResource`
 * ask). Iron in the ground is worth nothing to a people with no word for iron;
 * the turn Bronze Working lands, the hammer appears — in the breakdown, in the
 * citizen's score, in the city panel and on the tile's own props, all together,
 * because all four derive from this one line rather than from a flag anybody has
 * to remember to set.
 *
 * This reverses the v1 reading, which paid the yield and hid only the *label* on
 * the grounds that a hidden number would be a lie the panel has to keep telling.
 * The ratified reading is that the number was the lie: a player who cannot see
 * why a hill is worth three hammers cannot plan around it, and "the tile got
 * better the moment you learnt what was on it" is the sentence a discovery is
 * supposed to earn. Nothing is stored and no flag is set — the reveal is derived
 * every time the yield is asked, exactly as `openedResource`'s first clause is.
 */
export type TileYieldKind = 'base' | 'override' | 'add';

export interface TileYieldContribution extends TileYield {
  /** Display label: the terrain, the feature, the resource, the tech. */
  source: string;
  kind: TileYieldKind;
  /**
   * The card that put this line on the hex, when one did (`TileLine.card`) —
   * absent for the ground, the seam, the works, a renewal and a resource's own
   * line, which is to say for most of the list most of the time.
   *
   * Nothing in the simulation reads it: the fold does not care who wrote a line
   * and no rule branches on it. It is here for the **Ledger**, which has to say
   * whose slice a figure belongs in, and which was crediting every card that
   * pays on ground — the later Order pools' whole idiom — to *the land*
   * (`docs/flags.md`, ruling jj). A breakdown line that knows its card is the
   * only way a hex's yield can be split by who earned it, and it is the same
   * answer `CityYieldPercent.card` gives one fold up.
   */
  card?: CardId;
}

/**
 * What an evaluation needs to know about the player whose tile this is.
 *
 * Deliberately not a `Player` and not a `GameState`: the only player-dependent
 * term in the whole chain is "does this empire hold the technology", so that is
 * the only thing the context carries. Anything richer would be a second reason
 * for this module to know about research.
 */
export interface TileYieldContext {
  /** Technologies the owning player holds. `Player.techsResearched`. */
  techs: readonly TechId[];
  /**
   * What this empire's **law, holdings and works** pay on a hex, already
   * resolved into `{ source, condition, bag }` lines (`TileLine` in
   * `statecraft.ts`).
   *
   * The *answer* rather than the question, and that is what keeps this chain
   * what it is: `explainTileYield` knows about a tile and a context and nothing
   * else — no `GameState`, no player id, no card table — so a line has to arrive
   * pre-resolved or the whole module would have to grow a second reason to know
   * about empires. Absent for a context-less (omniscient) evaluation and for an
   * empire whose law, holdings and works say nothing about ground, which is most
   * of them.
   *
   * **One list, five producers**, and the chain cannot tell them apart:
   *
   *   · a Statecraft card's **unscoped** hex `pays` (`cardTileLines`) — the
   *     empire's law, worth the same on every hex it owns;
   *   · a luxury's `improvementYields` (`resourceTileLines`) — what a held seam
   *     is worth to every hex of a kind, tyrian's boats and whales';
   *   · a building's `tileYields` (`buildingTileLines`) — the granary's food on
   *     water, and the first of them that is a fact about *one city*, which is
   *     why `cityContext` adds it and `yieldContextFor` cannot;
   *   · a card's **scoped** hex `pays` (`scopedCardTileLines`) — Petra's desert
   *     and the Hanging Gardens' irrigated farms, which are the same fact about
   *     one city said by a card instead of by a building;
   *   · a **follower belief's** hex `pays` (`followerCardTileLines`) — Harvest
   *     Blessing's food on the farms of a city that follows, and the only
   *     producer whose card may belong to another empire entirely;
   *   · a **consecration's** hex `pays` (`consecrationCardTileLines`) — the
   *     Green Cathedral's faith on the wild ground of the town whose cathedral
   *     was dedicated to the old gods.
   *
   * A seventh producer joins by appending to this list. It was `cards` alone
   * until Entry XXVII; folding the other two into the same channel rather than
   * giving each its own field is what keeps `explainTileYield`'s last clause one
   * loop instead of three.
   */
  lines?: readonly TileLine[];
  /**
   * The **working city vouches for this hex's water** — a Cistern in the town
   * square, standing in for the river a farm out in the fields does not have
   * (`BuildingDef.irrigates`).
   *
   * A fact about *one town* and therefore added only by `cityContext`, exactly
   * as its buildings' tile lines are: an empire-wide context has no town to ask,
   * and a hex nobody works is dry. Read in **one place** — the renewal clause
   * below that asks a farm whether it stands on fresh water — and nowhere else:
   * `Tile.freshwater` is untouched, so the improvement gate, the card scopes and
   * the fight's own `freshwater` condition all go on reading the ground.
   */
  irrigates?: boolean;
}

/**
 * The context for a player, or `undefined` when there is no such player.
 *
 * **The call-site register**, kept here because a list of who passes a context
 * is only useful where somebody will read it. Two technologies now ride on it —
 * the renewals and the reveal gate (see `explainTileYield`) — so the rule for
 * new call sites is one line: **an owned tile is always evaluated with its
 * owner's context.** A tile nobody owns, and no seat is asking on behalf of, is
 * the only thing that may go without.
 *
 *   · `assignCitizens`, `foldCentre`, `foldCity`, `bestExpansionTile` — all
 *     pass the *city owner's* context, through `cityContext`. Those four are the
 *     simulation banking and spending real yields: a citizen that ignored a
 *     renewal would be sent to the wrong tile the turn Feudalism landed, and one
 *     that counted an unrevealed seam would be sent to a hill that pays nothing.
 *   · the hover readout (`tileReadout.ts`) prices through `tileContextAt`:
 *     inside a city's territory, that CITY's own context (so a lighthouse's
 *     food on water prints where the citizen is paid — 2026-09-03); on wild
 *     ground, the **local seat's** context, because the question is "what
 *     would a city of mine collect here" — and a hover card that priced ore
 *     the seat cannot name would give away what the reveal gate hides.
 *   · the yield glyphs (`lens3d.ts`) pass `LensView.playerId`, the seat the lens
 *     is drawn for, so the board and the hover card agree.
 *   · the improvement preview (`improvementYieldDelta`) takes an optional one
 *     and the unit sheet (`controls.ts`) passes the **builder's owner**, so the
 *     "+1⚙" on a Mine row is what that empire would actually get. It is the
 *     same evaluator twice with and without the candidate, so the gate cancels
 *     out of the *delta* — which is the honest answer either way, and the reason
 *     the argument is still optional.
 *   · the citizen *score* used by the border chooser and the assigner is the
 *     fold of the same contextual list, so "grow toward land you would work"
 *     survives a renewal and does not chase a seam nobody has heard of.
 *   · **Deliberately context-less**, and the whole of that list: the start-site
 *     scorer (`startPositions.ts`), which runs during generation before any
 *     player has a technology or a tile, and tests asking about bare ground.
 *     Both are the omniscient reading, which is what "no context" means.
 */
export function yieldContextFor(
  state: GameState,
  playerId: number,
): TileYieldContext | undefined {
  const player = playerById(state, playerId);
  if (!player) return undefined;
  const ctx: TileYieldContext = { techs: player.techsResearched };
  // Written only when there is something in it, so an empire whose law and
  // holdings say nothing about ground builds a context byte-identical to the one
  // this returned before Statecraft existed — and a sweep of twenty hexes asks
  // both tables once, here, rather than once per tile.
  const lines = [...cardTileLines(state, playerId), ...resourceTileLines(state, playerId)];
  if (lines.length > 0) ctx.lines = lines;
  return ctx;
}

/**
 * The context of the player who owns a city, **plus what that city's own
 * buildings pay on its ground**. Never undefined in practice.
 *
 * The one place the two scales meet. Everything `yieldContextFor` resolves is a
 * fact about the *empire* and is the same in every town; a granary is a fact
 * about *this* town, so it can only be added by whoever has a city in hand — and
 * that is exactly the four callers in the register that pass a city's context
 * (`assignCitizens`, `foldCentre`, `foldCity`, `bestExpansionTile`). A hex
 * outside anybody's borders has no granary to ask about, which is why the empire
 * context is the honest answer for the hover card and the lens.
 *
 * Exported for the **ghost** that reads it twice (`cardImpact.ts`): a card's
 * stamp diffs what the worked hexes pay under this empire's law and under a
 * shallow copy of it, and there is no honest way to ask that question without
 * the very context the town's own yields are read through.
 *
 * `hypothetical` is `foldCity`' preview hook, carried this far in for one
 * reason: a building's worth may be entirely a line on the ground. The what-if
 * used to hand its candidate to `explainCityBuildings` and stop there, so a
 * lighthouse — which pays *nothing* flat and +1🌾 on every coastal hex the town
 * works — appraised at zero and the bot never built one (2026-09-04). It reaches
 * only `buildingTileLines`, the one producer that is a fact about *this* town's
 * shelves; the empire's law, its holdings and its faith are unmoved by a
 * building that does not exist yet, and an empty list is byte-for-byte the
 * reading every real caller had before.
 */
export function cityContext(
  state: GameState,
  city: City,
  hypothetical: readonly BuildingId[] = [],
): TileYieldContext | undefined {
  const ctx = yieldContextFor(state, city.ownerId);
  if (!ctx) return undefined;
  // Five producers are facts about *this town* rather than about the empire,
  // and none can be added by anybody without a city in hand: its buildings' tile
  // lines (the granary's food on water, Entry XXVII), its **live rites** (Rite
  // of Plenty's gold on its own worked seams, Entry XXVIII), the **scoped**
  // card lines (Petra's desert, the Hanging Gardens' irrigated farms — a
  // hex `pays` whose `scope` names which towns it lands in), and the **faith
  // this town follows** (Harvest Blessing's food on the farms of a following
  // city — the 2026-08-28 ruling, and the one producer whose card belongs to
  // somebody else's empire), and its **consecration** (the Green Cathedral's
  // faith and culture on wild ground — a fact about one cathedral in one town).
  // Appended in that order, and the tile chain still cannot tell any producer
  // from another.
  const own = [
    ...buildingTileLines(city, ctx.techs, hypothetical),
    ...timedCityTileLines(state, city),
    ...scopedCardTileLines(state, city),
    ...followerCardTileLines(state, city),
    ...consecrationCardTileLines(state, city),
  ];
  // The Cistern, and the sixth fact about *this town* the chain needs: whether a
  // building of its own irrigates the fields it works. The candidate is included,
  // so a build list pricing a Cistern sees the farms it would water — which is
  // `hypothetical`'s whole reason to be carried this far in.
  const irrigates = buildingsIrrigate([...city.buildings, ...hypothetical]);
  if (own.length === 0 && !irrigates) return ctx;
  const next: TileYieldContext = { ...ctx };
  if (own.length > 0) next.lines = [...(ctx.lines ?? []), ...own];
  if (irrigates) next.irrigates = true;
  return next;
}

/**
 * The ordered breakdown of one tile's yield. See the docblock above for the
 * order and for what each `kind` means to the fold.
 */
export function explainTileYield(
  tile: Tile,
  ctx?: TileYieldContext,
): TileYieldContribution[] {
  const list: TileYieldContribution[] = [];

  const terrain = terrainDef(tile.terrain);
  list.push({ source: terrain.name, kind: 'base', ...readTileYield(terrain.yield) });

  // **The hill first, the canopy over it** (user, 2026-08-27: "if jungle or
  // forest is on a hills tile, the jungle/forest yield should take precedence").
  //
  // Two overrides can land on one hex and only the *last* one written survives
  // the fold, so their order is the rule and not a detail of this loop. The
  // canopy wins because it is the more specific fact about what a citizen
  // actually does there: a forested hill is worked by foresters, and the hill's
  // own 0🌾/2⚙ was quietly turning every jungle hill into a mine. The hills line
  // is still written down — it is about to be overridden, the fold reaches the
  // same number either way, and the *list* is the explanation of why.
  if (tile.hills) {
    const hills = TERRAIN_DATA.hills;
    list.push({ source: hills.name, kind: 'override', ...readTileYield(hills.yieldOverride) });
  }

  const feature = featureDef(tile.feature);
  const override = feature.yieldOverride;
  if (override !== null) {
    list.push({ source: feature.name, kind: 'override', ...readTileYield(override) });
  }

  // The resource, and only for an empire that has a word for it. A seam this
  // player cannot be *told* about pays nothing — see "The reveal gate" above —
  // and a context-less evaluation is the omniscient one, which is why the test
  // is on `ctx` rather than on a player id that might be missing.
  if (tile.resource !== undefined && (!ctx || resourceIsVisibleTo(tile.resource, ctx.techs))) {
    list.push({
      source: resourceDef(tile.resource).name,
      kind: 'add',
      ...resourceYield(tile.resource),
    });
  }

  const improvement = tile.improvement;
  // Where the works' own entries begin, so a card that raises *them* by a
  // percentage can be paid off exactly what they pay and nothing else. See the
  // percentage pass at the foot of this function.
  const worksFrom = list.length;
  if (improvement !== undefined) {
    const def = improvementDef(improvement);
    list.push({ source: def.name, kind: 'add', ...improvementYield(improvement) });
    // The renewals, each its own entry, and only for an empire that has earned
    // them. Walked in the table's own order so two renewals on one improvement
    // always read in the same order (design ledger, Entry I).
    for (const upgrade of def.upgrades ?? []) {
      if (!ctx || !ctx.techs.includes(upgrade.tech)) continue;
      // **Or the town that works this hex waters it** — the Cistern
      // (`TileYieldContext.irrigates`). The one place a building answers for the
      // ground, and it is a *clause on this condition* rather than a second kind
      // of water: `Tile.freshwater` is what the map says, and this is a town
      // saying it will carry the water out to the fields. A hex evaluated with
      // no context at all is the omniscient reading and has no town to ask.
      if (upgrade.requiresFreshwater && !tile.freshwater && ctx?.irrigates !== true) continue;
      list.push({
        source: techDef(upgrade.tech).name,
        kind: 'add',
        ...readTileYield(upgrade.add),
      });
    }
  }
  const worksTo = list.length;

  // **What the hex has been reckoned to pay so far**, for the one condition that
  // asks about worth rather than about substance (`TileCondition`'s `yields`,
  // The Gilded Court's hexes that yield gold). It is the fold of the entries
  // above — the ground, the seam, the works — through the *one* fold there is,
  // so "yields gold" means here exactly what the hover card says the hex pays
  // and no second reading of the ground comes into existence (rule 5).
  //
  // Computed **lazily and once**: this function is asked millions of times a
  // turn and the overwhelming majority of games hold no card that asks, so the
  // reading is taken on the first condition that wants it and never otherwise.
  let paid: TileYield | undefined;
  const paidSoFar = (): TileYield => (paid ??= foldTileLines(list));

  // The empire's law, holdings and works, last, and as ordinary `add` entries:
  // Common Granary's food on a resource hex, a granary's food on water, tyrian's
  // culture on a fishing boat — each a line in this breakdown exactly as the
  // improvement's is, so the hover card, the citizen's score, the city panel and
  // the banked total all learn about them from one place (rule 5). Nothing here
  // asks *which* of the three a line came from — the context already resolved
  // that, and that is the whole reason there is one list rather than three.
  //
  // One card can speak twice about one hex — Winter Mother pays +1 food on any
  // tundra tile *and* +1 faith on a wooded one, so a tundra forest satisfies
  // both of her hex `pays` lines. The player reads one name and expects one
  // line under it, so lines that share a `source` are merged into a single
  // entry, summed, at the position of that source's **first** appearance —
  // order of first appearance in `ctx.lines`, the same determinism rule as
  // everywhere else in this fold. `sourceIndex` is only an index back into
  // `list`; nothing ever iterates it for output, so a `Map`'s own iteration
  // order never governs an outcome. `TileYieldContribution` carries no `on` /
  // condition field for display — only `source` names the line — so a merge of
  // lines with different conditions loses nothing: there was never a condition
  // to pick between in the first place.
  // **Ea-nāṣir's rule** (the user, 2026-09-03: "it should never go below zero
  // or subtract yields from the tile"): a card line's NEGATIVE voice reaches
  // only what the hex's works pay — the mine's own hammer may be taken back,
  // the hill's and the seam's never, and no voice of the hex drops below its
  // wild reading. Clamped per incoming line against what the works still have
  // (several taking-back lines share one bag), so the breakdown stays the fold
  // of what it prints.
  let worksLeft: TileYield | undefined;
  const worksRemaining = (): TileYield =>
    (worksLeft ??= foldTileLines(list.slice(worksFrom, worksTo)));
  const clampTakeBack = (voice: (typeof TILE_YIELD_KEYS)[number], amount: number): number => {
    if (amount >= 0) return amount;
    const bag = worksRemaining();
    const allowed = Math.max(0, bag[voice]);
    const taken = Math.min(-amount, allowed);
    bag[voice] -= taken;
    // `0`, never `-0` — a ledger entry is compared byte-for-byte in replays.
    return taken === 0 ? 0 : -taken;
  };

  const sourceIndex = new Map<string, number>();
  const pushLine = (line: TileLine): void => {
    if (!tileConditionHolds(tile, line.on, paidSoFar)) return;
    // A line that is **only** a percentage carries no bag at all (The
    // Commonwealth's works). It is paid by the pass at the foot of this
    // function, and a zero-in-every-voice entry pushed here would be a row in
    // the hover that explains nothing — the same reading `paysSomething` takes
    // of a card's city yields one ledger over.
    if (!TILE_YIELD_KEYS.some((voice) => line[voice] !== 0)) return;
    const clamped = {
      food: clampTakeBack('food', line.food),
      production: clampTakeBack('production', line.production),
      gold: clampTakeBack('gold', line.gold),
      science: clampTakeBack('science', line.science),
      culture: clampTakeBack('culture', line.culture),
      faith: clampTakeBack('faith', line.faith),
    };
    // A taking-back line whose whole bag was already empty says nothing.
    if (!TILE_YIELD_KEYS.some((voice) => clamped[voice] !== 0)) return;
    const existingAt = sourceIndex.get(line.source);
    if (existingAt !== undefined) {
      const merged = list[existingAt];
      merged.food += clamped.food;
      merged.production += clamped.production;
      merged.gold += clamped.gold;
      merged.science += clamped.science;
      merged.culture += clamped.culture;
      merged.faith += clamped.faith;
      return;
    }
    sourceIndex.set(line.source, list.length);
    list.push({
      source: line.source,
      // Whoever wrote the line, carried through for the Ledger's crediting. The
      // merge above keeps the first appearance's card, which is the same card:
      // lines merge on `source`, and a source is a card's own name.
      card: line.card,
      kind: 'add',
      food: clamped.food,
      production: clamped.production,
      gold: clamped.gold,
      science: clamped.science,
      culture: clamped.culture,
      faith: clamped.faith,
    });
  };
  // **Two passes, and the reading between them** (the user, 2026-09-07: "the
  // Sacred Ground isn't working properly — +1 faith on every hex that gives
  // faith isn't applying to my desert tiles that have +1 faith from my
  // religion"). A line that pays on what the hex *already* pays (`yields`,
  // `CardRulePercentEffect.scope`'s bargain) used to read the ground alone —
  // `paidSoFar` was taken once, before any law had spoken — so the Desert
  // Fathers' faith on a desert hex was invisible to The Sacred Ground standing
  // beside it. Now every line that asks nothing of the fold lands first, the
  // memo is taken again over the ground *and* those lines, and the asking lines
  // land second. Order inside each pass is `ctx.lines`' own, so the outcome
  // depends on an order the data carries; and an asking line never sees
  // another asking line's bag, so two of them cannot pay each other interest.
  for (const line of ctx?.lines ?? []) {
    if (!tileConditionReadsFold(line.on)) pushLine(line);
  }
  paid = undefined;
  for (const line of ctx?.lines ?? []) {
    if (tileConditionReadsFold(line.on)) pushLine(line);
  }

  // **A percentage on the works, and on nothing else** — The Commonwealth's half
  // again on a great person's academy. Last, so the figure it is a share of is
  // whole, and taken off the *improvement's own* entries (`worksFrom` …
  // `worksTo`: the improvement and its renewals) rather than off the hex's
  // total: a card that said "this hex pays half again" would be silently
  // multiplying the terrain, the river, the resource and whatever a second card
  // had already added. It joins as one more labelled `add`, so the breakdown
  // still sums to the total and a player can see which half was raised.
  //
  // Riders **sum before one multiplication**, which is Entry XVII's discipline
  // read at the scale of a hex: two cards that each say +50% are worth +100%
  // rather than ×2.25. Since batch X the share is not rounded per voice either —
  // half a point of food on a hex is half a point of food in the town's fold.
  //
  // **And a percentage on the ground, which is its opposite number** — The Old
  // Ways' doubling of what an unimproved hex pays (`TileLine.basePercent`). It
  // is taken off the entries *before* the works (`0` … `worksFrom`: the terrain,
  // the hill or canopy over it, and the seam in it) through `foldTileLines`,
  // which is the one place a `base`/`override` list becomes a number — so the
  // hill under a jungle is counted the way the hover card counts it and not by
  // a second sum that could disagree. The two shares never overlap and neither
  // reaches a card's own line, so two cards cannot pay each other interest.
  let worksPercent = 0;
  const worksSources: string[] = [];
  const worksCards: CardId[] = [];
  let groundPercent = 0;
  const groundSources: string[] = [];
  const groundCards: CardId[] = [];
  for (const line of ctx?.lines ?? []) {
    const works = line.percent ?? 0;
    const ground = line.basePercent ?? 0;
    if (works === 0 && ground === 0) continue;
    if (!tileConditionHolds(tile, line.on, paidSoFar)) continue;
    if (works !== 0) {
      worksPercent += works;
      if (!worksSources.includes(line.source)) worksSources.push(line.source);
      if (line.card !== undefined && !worksCards.includes(line.card)) worksCards.push(line.card);
    }
    if (ground !== 0) {
      groundPercent += ground;
      if (!groundSources.includes(line.source)) groundSources.push(line.source);
      if (line.card !== undefined && !groundCards.includes(line.card)) groundCards.push(line.card);
    }
  }
  // **Whose share it is**, when it is anybody's. Two cards that each say +50%
  // sum into ONE line (the discipline above), and a line naming two cards can be
  // credited to neither — so the card is carried only when the share has exactly
  // one author, which is every case the data holds today. A share with two
  // authors is the land's, which is where an unattributable figure has always
  // gone.
  const soleCard = (cards: readonly CardId[]): CardId | undefined =>
    cards.length === 1 ? cards[0] : undefined;
  if (worksPercent !== 0 && worksTo > worksFrom) {
    const share: TileYieldContribution = {
      source: worksSources.join(' + '),
      card: soleCard(worksCards),
      kind: 'add',
      food: 0,
      production: 0,
      gold: 0,
      science: 0,
      culture: 0,
      faith: 0,
    };
    for (let i = worksFrom; i < worksTo; i++) {
      const entry = list[i]!;
      for (const voice of TILE_YIELD_KEYS) share[voice] += entry[voice];
    }
    let pays = false;
    for (const voice of TILE_YIELD_KEYS) {
      share[voice] = (share[voice] * worksPercent) / 100;
      if (share[voice] !== 0) pays = true;
    }
    if (pays) list.push(share);
  }
  if (groundPercent !== 0 && worksFrom > 0) {
    const ground = foldTileLines(list.slice(0, worksFrom));
    const share: TileYieldContribution = {
      source: groundSources.join(' + '),
      card: soleCard(groundCards),
      kind: 'add',
      food: 0,
      production: 0,
      gold: 0,
      science: 0,
      culture: 0,
      faith: 0,
    };
    let pays = false;
    for (const voice of TILE_YIELD_KEYS) {
      share[voice] = (ground[voice] * groundPercent) / 100;
      if (share[voice] !== 0) pays = true;
    }
    if (pays) list.push(share);
  }

  return list;
}

/**
 * The fold: `base` and `override` replace, `add` sums. The only place a tile's
 * total is ever computed.
 */
export function foldTileLines(list: readonly TileYieldContribution[]): TileYield {
  const total = emptyTileYield();
  for (const entry of list) {
    for (const key of TILE_YIELD_KEYS) {
      if (entry.kind === 'add') total[key] += entry[key];
      else total[key] = entry[key];
    }
  }
  return total;
}

/**
 * Food/production/gold of a tile — resource, improvement and renewals included.
 *
 * One line, and that is the point: it is the fold of `explainTileYield` and
 * nothing else, so the number and the explanation cannot drift apart. See the
 * docblock above `TileYieldKind` for the chain and for who passes a context.
 */
export function foldTile(
  tile: Tile,
  ctx?: TileYieldContext,
  // **The list, when the caller already has it** (batch E2). `explainCity` now
  // splits a worked hex by the card each of its lines names, so it holds the
  // breakdown before it wants the fold; asking for the breakdown twice would
  // double the hottest function in the simulation. The default keeps every other
  // caller's sentence exactly as it was — the fold *is* of `explainTileYield`'s
  // list, and handing that very list in changes nothing but who allocated it.
  lines: readonly TileYieldContribution[] = explainTileYield(tile, ctx),
): TileYield {
  return foldTileLines(lines);
}
