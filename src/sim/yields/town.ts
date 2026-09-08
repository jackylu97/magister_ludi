/**
 * **The town** — the twelve steps of `docs/yields.md`, from the centre to the
 * two stages.
 *
 * `explainCity` is the list (steps 1–11: the labelled lines, their fold, and the
 * percent list that is deliberately *not* applied to them) and `foldCity` is the
 * total (step 12, the only place in the simulation a yield meets a percentage).
 * Between them sit the palace, the building shares, the conversions, the percent
 * list and the town's half of Entry XVII's staging.
 *
 * Split out of `cities.ts` in batch E3b (`docs/flags.md` item pp,
 * `docs/audit/evaluations.md` §4b step 9: *files by layer, not by topic*). No
 * arithmetic moved; the parity fixtures are the gate, and `cities.ts` re-exports
 * every name so no import path anywhere had to change.
 *
 * **The graph.** `hex.ts` is below it, `empire.ts` above; `stages.ts` holds the
 * two multiplications themselves. `empirePercents` lives **here** rather than in
 * `empire.ts` though it sweeps the whole realm, because it is the empire's half
 * of *a town's* percentages — `cityYieldPercents`' own input — and keeping it
 * here leaves `yields/` a one-way chain, hex → town → empire, with no back edge
 * to reason about. `cities.ts` is imported back for the town's territory and
 * citizens: a function-level cycle, the documented kind (CLAUDE.md), and
 * `test/mapgen/moduleCycles.test.ts` is the gate. Nothing under `yields/`
 * imports `readings.ts` — the memos sit above this layer, never inside it.
 */

import {
  BUILDING_IDS,
  type BuildingId,
  type ProductionCategory,
  buildingDef,
  isBuildingId,
  isWonder,
} from '../buildingData';
import { type LedgerClass, classifyCard } from '../ledgerClass';
import { getTileAt } from '../map';
import { type ModifierStage, type StageSums, applyStages, withStage } from './stages';
import { CITY_YIELD_KEYS, type CityYieldKey, type ResourceId } from '../resourceData';
import { type CardId } from '../statecraftData';
import { RULES } from '../rulesData';
import {
  type CardYieldLine,
  type CardBuildingPercentLine,
  cardBuildingPercents,
  cardLinesOnBuilding,
  cardMeterFlag,
  explainCardCityYields,
  explainCardPercentYields,
  cardProduction,
  cardYieldConversions,
  unitMatches,
} from '../statecraft';
import { type City, type GameState, type QueueItem, capitalCityOf, playerById } from '../state';
import { TILE_YIELD_KEYS, type TileYield, emptyTileYield, readTileYield } from '../terrainData';
import { isUnitTypeId } from '../unitData';
import { type MeterId, meterEffects } from '../meters';
import { cityResourceYields, resourcePercentYields, resourceProduction } from '../resourceEffects';
import { citySpecialistYields } from '../specialists';
import { cityRouteYields } from '../routeYields';
import { treasuryInDebt } from '../upkeep';
import { type CityYields, cityTile, emptyCityYields } from '../cities';
import { type TileYieldContribution, cityContext, explainTileYield, foldTile, foldTileLines } from './hex';
import { foldStageSums } from './stages';

const CITIES = RULES.cities;

/** One labelled line the seat of government pays its town. See below. */
export interface PalaceYieldLine {
  /** Display label. `"Palace"`, and only ever that today. */
  source: string;
  gold: number;
}

/**
 * What the **palace** pays the town it stands in, as the ordered list the
 * figure is the fold of (rule 5) — one line in the capital, none anywhere else.
 *
 * The user's ruling of 2026-08-28: `rules.cities.palaceGold` is 2💰, and it is
 * a *line* rather than a term because that is what rule 5 asks of any new source
 * of a yield. A player looking at a capital that makes more gold than its tiles
 * explain must be able to read why.
 *
 * It is the palace's third gift and it is shaped like the other two — the
 * happiness in `explainHappiness` and the capacity in `explainAuthority` both
 * print a "Palace" line off `capitalCityOf`, and this is the same fact said to
 * a third meter. There is deliberately no palace *building*: nothing is built,
 * nothing is captured with the stones, and an empire whose first city falls has
 * its palace wherever `capitalCityOf` now points.
 *
 * A list of at most one, rather than a `number | null`, so that a second thing
 * the seat of government supplies joins by appending — and so the caller folds
 * it exactly as it folds the luxuries, the cards and the routes beside it.
 */
export function explainPalaceYield(state: GameState, city: City): PalaceYieldLine[] {
  if (CITIES.palaceGold === 0) return [];
  const capital = capitalCityOf(state, city.ownerId);
  if (!capital || capital.id !== city.id) return [];
  return [{ source: 'Palace', gold: CITIES.palaceGold }];
}

// --- yields -----------------------------------------------------------------

/**
 * The label the centre's own line carries in a breakdown. One string, because
 * the hover card, the city panel and a test all have to name the same line.
 */
export const CENTRE_SOURCE = 'City centre';

/**
 * What a settlement makes **by being one** — a citizen's beaker and the culture
 * every town produces — as its own line of `explainCity`'s list.
 *
 * Its own line rather than folded into the centre's, because they are two
 * sentences: the centre is a *hex*, and this belongs to no tile, no building and
 * no card. It is why the class `other` exists.
 */
export const TOWN_ITSELF_SOURCE = 'The town itself';

/**
 * The label a worked hex's own line falls back to when nothing on it named the
 * ground — a hex whose whole reading is card lines, which today cannot happen
 * and tomorrow might.
 */
export const HEX_SOURCE = 'Worked hex';

/** The prefix on the line that says the ground under the town was better. */
const INHERITED_PREFIX = 'Inherited';

/**
 * What the city centre pays, and *why* — rule 5 applied to the one tile no
 * citizen works.
 *
 * The rule, as ratified: **a centre pays `baseCityYields`, and inherits the
 * ground's own yield in any voice where the ground pays more.** A city is a
 * city wherever it stands — one planted on snow still feeds itself — but a town
 * on a wheat field keeps the wheat and a town on a hill keeps the hammers. Per
 * *voice* and not per tile, so a 3🌾/2🪙 seam under a town reads 3🌾/2⚙/2🪙:
 * the food and the gold are the ground's, the production is the town's own.
 *
 * The list, and why it is shaped this way
 * ---------------------------------------
 * Two lines, and the fold of them is the maximum, exactly:
 *
 *   `City centre`        the flat base, as a `base` entry — what standing here
 *                        is worth before the ground is consulted at all.
 *   `Inherited · …`      an `add` entry carrying, per voice, however much the
 *                        ground beats the base by. Zero in every voice the base
 *                        already covers, and omitted entirely when the ground
 *                        beats it nowhere.
 *
 * `base + max(ground − base, 0)` is `max(base, ground)` per voice, so the fold
 * is the rule and there is no total computed beside the list (rule 5). The
 * alternative — printing the ground's own breakdown and then a top-up line —
 * folds to the same number but reads backwards: the centre's floor is the
 * headline of what a town is worth, not a footnote under the grass.
 *
 * The inherited line **names the ground that earned it**, because "inherited"
 * with no subject is the one thing a player cannot act on: `Inherited · Wheat`
 * says move the town one hex and you lose the wheat. The names are read off the
 * ground's own `explainTileYield` list and the test is *what the base does not
 * already cover*: every `add` line paying into an inherited voice, plus the
 * effective terrain line (the last `base`/`override`, which is what the tile
 * actually is) only when the terrain **by itself** beats the base somewhere —
 * an oasis does, plain grassland under a wheat field does not, and listing the
 * grass there would name the half of the sum the town was getting anyway. No
 * arithmetic is attributed to any one name: the line carries the whole excess
 * and the label says what is responsible for it.
 *
 * Evaluated through the **city owner's** context, like everything else a city
 * banks (see `yieldContextFor`): the centre of a town on iron is worth the iron
 * only to an empire that has heard of it.
 */
export function explainCentreYield(
  state: GameState,
  city: City,
  hypothetical: readonly BuildingId[] = [],
): TileYieldContribution[] {
  const ground = explainTileYield(cityTile(state.map, city), cityContext(state, city, hypothetical));
  const under = foldTileLines(ground);
  const base = readTileYield(CITIES.baseCityYields);

  const list: TileYieldContribution[] = [
    { source: CENTRE_SOURCE, kind: 'base', ...base },
  ];

  const inherited = emptyTileYield();
  let inheritsAnything = false;
  for (const key of TILE_YIELD_KEYS) {
    const excess = under[key] - base[key];
    if (excess <= 0) continue;
    inherited[key] = excess;
    inheritsAnything = true;
  }
  if (!inheritsAnything) return list;

  list.push({
    source: `${INHERITED_PREFIX} · ${inheritedSources(ground, inherited, base).join(' · ')}`,
    kind: 'add',
    ...inherited,
  });
  return list;
}

/**
 * Which of the ground's lines are the reason the centre inherits anything.
 *
 * The terrain line is the *effective* one — the last `base`/`override`, since a
 * hill replaces the forest that replaced the grass — and it is named only when
 * the ground it describes beats the base on its own. Every `add` line paying
 * into an inherited voice is named. Deduped and kept in the ground list's own
 * order, so the label reads in the order the rules resolved.
 */
function inheritedSources(
  ground: readonly TileYieldContribution[],
  inherited: TileYield,
  base: TileYield,
): string[] {
  const voices = TILE_YIELD_KEYS.filter((key) => inherited[key] > 0);

  let terrain: TileYieldContribution | undefined;
  for (const entry of ground) if (entry.kind !== 'add') terrain = entry;
  const terrainEarnsIt =
    terrain !== undefined && TILE_YIELD_KEYS.some((key) => terrain![key] > base[key]);

  const names: string[] = [];
  for (const entry of ground) {
    const earns =
      entry.kind === 'add'
        ? voices.some((key) => entry[key] > 0)
        : entry === terrain && terrainEarnsIt;
    if (!earns || names.includes(entry.source)) continue;
    names.push(entry.source);
  }
  // Unreachable while some line pays every voice the fold counted, and a label
  // reading "Inherited · " would be the visible half of that being wrong.
  return names.length > 0 ? names : ['the ground'];
}

/**
 * What the city centre pays. The fold of `explainCentreYield`, and nothing
 * else — the number and the explanation cannot drift apart.
 */
export function foldCentre(
  state: GameState,
  city: City,
  hypothetical: readonly BuildingId[] = [],
): TileYield {
  return foldTileLines(explainCentreYield(state, city, hypothetical));
}

// --- what a building pays ---------------------------------------------------

/**
 * One line of what a city's buildings pay it, and *why* — `explainTileYield`'s
 * shape one grade up the ladder, and rule 5 applied to a city's own totals.
 *
 * There is only one algebra here, unlike the tile chain: every entry **sums**. A
 * building is a thing standing in a town alongside the other things standing in
 * it.
 *
 * **One line per building, since the renewals axe** (2026-09-04). A building
 * used to grow a second line the turn a technology renewed it, which is why the
 * shape is a list rather than a figure; the list stays, because a town's
 * buildings are read as a group and a caller that had to fold a mixture of
 * lists and figures would be the place the two came apart.
 */
export interface BuildingYieldContribution {
  /** Display label: the building's name. */
  source: string;
  /** The building the line belongs to, so a caller may group by it. */
  building: BuildingId;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  /** Flat faith. Absent on the row means zero — see `BuildingDef.faith`. */
  faith: number;
  sciencePerPop: number;
}

/**
 * The breakdown of one building's yield: what the table says it pays, and
 * nothing else.
 *
 * **No owner, no context** (the renewals axe, 2026-09-04). This used to take a
 * `TileYieldContext` and add a line per renewal the owner had earned, so that a
 * granary was worth a different number in two empires standing on the same
 * ground. The user ruled the free growth dead: a building is worth what its row
 * says in every empire that raises it, which is why this asks for an id and
 * nothing more. What a *technology* is worth to a town is now only ever
 * something the town went and built.
 */
export function explainBuildingYield(id: BuildingId): BuildingYieldContribution[] {
  const def = buildingDef(id);
  return [
    {
      source: def.name,
      building: id,
      food: def.food,
      production: def.production,
      gold: def.gold,
      science: def.science,
      culture: def.culture,
      faith: def.faith ?? 0,
      sciencePerPop: def.sciencePerPop,
    },
  ];
}

/**
 * Every line every building in this city pays, in `city.buildings` order —
 * which is the order they were *built*, so the list a player reads this turn is
 * the list they read last turn with one more group on it.
 *
 * `hypothetical` is `foldCity`'s preview hook, carried through so that "what
 * would a library be worth here" is explained by the same list it is totalled
 * from. A candidate the city already has is skipped, exactly as it is there.
 *
 * **No `state`, since the renewals axe** (2026-09-04): the only thing the empire
 * was ever asked for here was the technologies that renewed a building, and
 * nothing renews one any more. See `explainBuildingYield`.
 */
export function explainCityBuildings(
  city: City,
  hypothetical: readonly BuildingId[] = [],
): BuildingYieldContribution[] {
  const list: BuildingYieldContribution[] = [];
  for (const id of city.buildings) list.push(...explainBuildingYield(id));
  for (const id of hypothetical) {
    if (city.buildings.includes(id)) continue;
    list.push(...explainBuildingYield(id));
  }
  return list;
}

/**
 * **What the deck adds to this town's shelves** — the "your faith buildings give
 * half again" engine and the doublers, as the ordered list its total is the fold
 * of (`CardBuildingYieldPercentEffect`, `docs/history/fewer-things.md` §4).
 *
 * A **flat** line, and that is the whole of its stage: a percentage on a
 * *building's own figure* is not a percentage on the town, so it lands beside
 * `explainCityBuildings`' fold and is then staged by Entry XVII exactly as the
 * library's own beaker is. A card that joined `cityYieldPercents` instead would
 * have raised the tiles, the caravans and the other cards with it, which is a
 * different sentence and already has a shape (`percentYields`).
 *
 * The arithmetic is two stages and never one, which is the user's ruling that a
 * doubler *"applies to total yields, including from other effects"*:
 *
 *   · the **ordinary** shares are each taken of the building's own base;
 *   · the **`appliedLast`** shares are each taken of that base *plus* what the
 *     ordinary shares just added — so a doubler doubles what the Vestry raised
 *     rather than racing it.
 *
 * Exact per share, per building and per voice (batch X): two half-point shares
 * buy two halves and the halves are *kept*, and each share's own line is exactly
 * what it contributed (rule 5 — nothing is apportioned after the fact).
 *
 * `cardBuildingPercents` (`statecraft.ts`) hands over the shares and the
 * selector; this file supplies what a building pays, so neither module learns the
 * other's business and there is still one reading of `BuildingDef.yields`.
 */
export function explainCardBuildingYields(
  state: GameState,
  city: City,
  hypothetical: readonly BuildingId[] = [],
): BuildingPreviewLine[] {
  const shares = cardBuildingPercents(state, city);
  if (shares.length === 0) return [];
  const byCard = new Map<CardBuildingPercentLine, BuildingPreviewLine>();
  for (const entry of explainCityBuildings(city, hypothetical)) {
    // The building's own figure, per voice — the row's flats plus the per-citizen
    // beaker, exact exactly as `explainCity` is exact, so the share is taken of the
    // number the town actually banks — **plus what the law put on this building
    // by name** (`cardLinesOnBuilding`: a follower belief's science on a temple,
    // The Choir's culture, a legacy's faith). The user, 2026-09-07: the Synod
    // "should count my religion bonuses on my temples, and great people
    // improvements to temples". Those lines are banked once as the cards' own;
    // here they only widen what the share is over.
    const onIt = cardLinesOnBuilding(state, city, entry.building);
    const base: Record<CityYieldKey, number> = {
      food: entry.food + onIt.food,
      production: entry.production + onIt.production,
      gold: entry.gold + onIt.gold,
      science: entry.science + city.population * entry.sciencePerPop + onIt.science,
      culture: entry.culture + onIt.culture,
      faith: entry.faith + onIt.faith,
    };
    const raised: Record<CityYieldKey, number> = { ...base };
    for (const pass of [false, true]) {
      for (const share of shares) {
        if (share.appliedLast !== pass) continue;
        if (!share.matches(entry.building)) continue;
        for (const key of CITY_YIELD_KEYS) {
          if (share.yield !== undefined && share.yield !== 'all' && share.yield !== key) continue;
          const over = pass ? raised[key] : base[key];
          if (over === 0) continue;
          const paid = (over * share.percent) / 100;
          if (paid === 0) continue;
          let line = byCard.get(share);
          if (line === undefined) {
            line = { ...emptyPreviewLine(share.source), card: share.card };
            byCard.set(share, line);
          }
          line[key] += paid;
          if (!pass) raised[key] += paid;
        }
      }
    }
  }
  // In `cardBuildingPercents`' order — ordinary shares first, then the ones taken
  // last — so the sheet reads in the order the arithmetic ran.
  const list: BuildingPreviewLine[] = [];
  for (const share of shares) {
    const line = byCard.get(share);
    if (line !== undefined && previewPays(line)) list.push(line);
  }
  return list;
}

/**
 * One thing a town would gain by finishing a building, as a player reads it.
 *
 * `BuildingYieldContribution`'s shape one question wider: that one is what a
 * building's *row* pays, this one is what the **city's yields** change by, which
 * is not the same list at all the moment a card is in play. `card` names the
 * Order, Doctrine, belief, legacy or wonder that spoke; `building` names the row
 * that did. Exactly one of the two is set on a line the game produces today, and
 * neither is set on the reconciliation line below.
 */
export interface BuildingPreviewLine {
  /** Display label: "Barracks", "God of the Forge", "Ore Tithes". */
  source: string;
  /** The building whose own row paid this, or absent. */
  building?: BuildingId;
  /** The card that paid this, or absent. */
  card?: CardId;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

function emptyPreviewLine(source: string): BuildingPreviewLine {
  return { source, food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
}

/** True when a preview line changes nothing. Such lines are never in a list. */
function previewPays(line: BuildingPreviewLine): boolean {
  return CITY_YIELD_KEYS.some((key) => line[key] !== 0);
}

/** The fold: every line **sums**. The only place a preview's total is computed. */
export function foldBuildingPreview(lines: readonly BuildingPreviewLine[]): CityYields {
  const total = emptyCityYields();
  for (const line of lines) for (const key of CITY_YIELD_KEYS) total[key] += line[key];
  return total;
}

/**
 * What this town's yields would gain if this building stood in it — the ordered,
 * **labelled** list the build screen prints beside a row a player is choosing
 * (user, 2026-08-28: "orders + religion benefits should show in city build
 * screen … preview for barracks in the city build list should show +1 prod").
 *
 * The question is not "what does a barracks pay" — `explainBuildingYield`
 * answers that off the table and would answer *nothing* for a barracks, which is
 * exactly the number the playtest complained about. It is "what would change
 * here", and since Statecraft and the pantheon that is a question about the
 * empire's whole law: a belief that pays a forge town a hammer, an Order that
 * counts barracks, a wonder whose tile line wants a granary. Every one of those
 * is a `hasBuilding` scope or a `pays` count count, and every one of them is
 * invisible to a preview that reads the building's own row.
 *
 * **A ghost town, never a mutation.** The honest way to ask a conditional
 * question of an evaluator this large is to ask it twice: once of the city, once
 * of a *shallow copy* whose `buildings` array is the city's with the candidate
 * appended, and to take the difference. Nothing in `state` is touched, nothing
 * is cloned deeply, and — this is the point — no rule is reimplemented. A card
 * shape that does not exist yet is previewed correctly the day it is added,
 * because the thing being diffed is `foldCity` itself.
 *
 * The list, in the order a player reads it:
 *
 *   1. **the row's own lines** — the building and each renewal its owner has
 *      earned, `explainBuildingYield`'s list with the science-per-pop term
 *      resolved against this town's population, exactly as `foldCity` resolves
 *      it;
 *   2. **the flat card lines that woke up**, one per `(card, source)` whose
 *      figure differs between the two readings — which is a belief scoped to
 *      `hasBuilding`, a `pays` count that counts the thing, and nothing else;
 *   3. **the tile lines that woke up**, summed over the tiles this town actually
 *      works: a granary's food on water, a wonder's desert line gated on a
 *      building. Grouped by source, because that is the name a player reads;
 *   4. **one reconciliation line, when the arithmetic needs it**, carrying the
 *      difference between the labelled lines above and the true change — which
 *      is Entry XVII's two multiplications doing their work on the new flats and
 *      any percentage the building itself unlocked. `applyRiders`' idiom in
 *      `purchase.ts`: a line of the list that holds *the difference it makes to
 *      the running figure*, never a multiplication performed afterwards.
 *
 * So `foldBuildingPreview(explainBuildingPreview(state, city, id))` is exactly
 * `foldCity(ghost) − foldCity(city)`, floors and stages included, which is
 * rule 5 read at the scale of a preview: the number on the row is the fold of
 * the reasons printed under it.
 *
 * A building the town already has previews as the empty list — there is nothing
 * to gain — and no caller has to special-case it.
 *
 * **No `toward`.** The reading is "what does this town make", not "how fast does
 * it build the next thing", so the production-category bonuses are deliberately
 * out: a barracks previewed with `toward` pointed at itself would report the
 * share of hammers it puts behind *units* as zero, which is true and useless.
 * `turnsToBuild` is where that question already lives.
 *
 * `quote` is `turnsToBuild`'s, for the same caller and the same reason: the
 * build list previews every unbuilt building in one town, and the *left* half of
 * every one of those diffs — what the town makes today — is one answer asked
 * thirty times. The ghost's half cannot be hoisted (a candidate is exactly what
 * changes it) and is not. See `CityReading`.
 */
export function explainBuildingPreview(
  state: GameState,
  city: City,
  id: BuildingId,
  quote?: CityReading,
): BuildingPreviewLine[] {
  if (city.buildings.includes(id)) return [];
  // The ghost. Shallow on purpose: every other field is shared with the real
  // town, and `buildings` is the one array that is replaced rather than pushed
  // to, so nothing downstream can write through it into `state`.
  const ghost: City = { ...city, buildings: [...city.buildings, id] };
  // The one thing the two readings below **cannot** disagree about, hoisted so
  // they are not asked for it twice: the meters sweep `state.cities`, the ghost
  // is not in that list, and a building the town has not built yet has changed
  // nothing about the empire's mood. Exact, not an approximation — see
  // `empirePercents`.
  const empire = quote?.empire ?? empirePercents(state, city.ownerId);

  const lines: BuildingPreviewLine[] = [];

  // 1. The row itself, which is the whole of what a building's own table pays
  //    since the renewals axe (2026-09-04) — no empire is asked.
  for (const entry of explainBuildingYield(id)) {
    const line = emptyPreviewLine(entry.source);
    line.building = id;
    line.food = entry.food;
    line.production = entry.production;
    line.gold = entry.gold;
    line.science = entry.science + city.population * entry.sciencePerPop;
    line.culture = entry.culture;
    line.faith = entry.faith;
    if (previewPays(line)) lines.push(line);
  }

  // 2. The cards that woke up. Keyed by card **and** source, because one card
  //    may pay a town twice under two labels, and walked in the ghost's order
  //    so the list reads in the evaluator's order.
  //
  //    The `×N` suffix is stripped from the key, never from the label: a
  //    `pays` count line's printed source carries its count ("The Mausoleum
  //    · ×19"), and a candidate building that feeds the count re-labels the
  //    very line it changes ("· ×20"). Keyed raw, the two halves of that diff never
  //    meet — `was` comes back empty and the preview prints the wonder's whole
  //    standing line on every row of the build list (the 2026-09-03 playtest
  //    report). Keyed stripped, the line previews as the +1 it is, and it is
  //    printed under the *bare* source when the counts disagree — "+1 gold ·
  //    The Mausoleum" is the change; the ×20 belongs to the city screen's own
  //    breakdown, not to a diff.
  const sourceKey = (source: string): string => source.replace(/ · ×\d+$/, '');
  const before = new Map<string, CardYieldLine>();
  for (const line of explainCardCityYields(state, city)) {
    before.set(`${line.card}\x00${sourceKey(line.source)}`, line);
  }
  for (const after of explainCardCityYields(state, ghost)) {
    const was = before.get(`${after.card}\x00${sourceKey(after.source)}`);
    const line = emptyPreviewLine(
      was !== undefined && was.source !== after.source ? sourceKey(after.source) : after.source,
    );
    line.card = after.card;
    for (const key of CITY_YIELD_KEYS) line[key] = after[key] - (was?.[key] ?? 0);
    if (previewPays(line)) lines.push(line);
  }

  // 3. The ground. A building may change what a *tile* pays — the granary's
  //    food on water, a scoped card line — and that arrives through the
  //    context rather than through any list above, so it is diffed where it
  //    lands: per worked tile, per source, summed. Only `add` entries can
  //    differ (terrain and features do not care what has been built), which is
  //    what makes a diff by source exact rather than approximate.
  const groundBefore = cityContext(state, city);
  const groundAfter = cityContext(state, ghost);
  const ground = new Map<string, BuildingPreviewLine>();
  const order: string[] = [];
  for (const cell of city.workedTiles) {
    const tile = getTileAt(state.map, cell.col, cell.row);
    if (!tile) continue;
    const was = addsBySource(explainTileYield(tile, groundBefore));
    for (const entry of explainTileYield(tile, groundAfter)) {
      if (entry.kind !== 'add') continue;
      let line = ground.get(entry.source);
      if (!line) {
        line = emptyPreviewLine(entry.source);
        ground.set(entry.source, line);
        order.push(entry.source);
      }
      const old = was.get(entry.source);
      for (const key of CITY_YIELD_KEYS) line[key] += entry[key] - (old?.[key] ?? 0);
    }
  }
  for (const source of order) {
    const line = ground.get(source)!;
    if (previewPays(line)) lines.push(line);
  }

  // 4. The reconciliation. Everything the labelled lines above cannot name: the
  //    two stages multiplying the new flats, a percentage the building itself
  //    unlocked, the city centre's inherit rule, and every floor on the way.
  //    Appended only when it is not zero, so a town with no percentages at all
  //    reads a list of nothing but named reasons.
  const gain = emptyCityYields();
  const after = foldCity(state, ghost, [], undefined, explainCity(state, ghost, [], empire));
  const now = foldCity(state, city, [], undefined, quote);
  for (const key of CITY_YIELD_KEYS) gain[key] = after[key] - now[key];
  const named = foldBuildingPreview(lines);
  const rest = emptyPreviewLine('Multipliers and rounding');
  for (const key of CITY_YIELD_KEYS) rest[key] = gain[key] - named[key];
  if (previewPays(rest)) lines.push(rest);

  return lines;
}

/**
 * One tile's `add` contributions, summed by source — the shape the preview's
 * ground diff subtracts. Merged by source for `explainTileYield`'s own reason:
 * one card can speak twice about one hex and a player reads one name.
 */
function addsBySource(list: readonly TileYieldContribution[]): Map<string, TileYield> {
  const map = new Map<string, TileYield>();
  for (const entry of list) {
    if (entry.kind !== 'add') continue;
    let sum = map.get(entry.source);
    if (!sum) {
      sum = emptyTileYield();
      map.set(entry.source, sum);
    }
    for (const key of TILE_YIELD_KEYS) sum[key] += entry[key];
  }
  return map;
}

// --- what the empire multiplies ---------------------------------------------

/**
 * One percentage a building puts behind a *particular* thing a city is building.
 *
 * The building-scale sibling of `MeterEffect` (`meters.ts`) and the same shape
 * for the same reason: rule 5 applies to modifiers too, so the city panel prints
 * one line per entry and the multiplier below is the fold of the same list. An
 * effect worth zero percent is never in it.
 */
export interface ProductionModifier {
  /** Display label: the building's or the resource's name. */
  source: string;
  /** The building this line belongs to, or absent for a resource's line. */
  building?: BuildingId;
  /** The resource this line belongs to, or absent for a building's line. */
  resource?: ResourceId;
  /**
   * The card that put these hammers behind the build, for the card half of the
   * list — `CityYieldPercent.card`'s sibling, and carried for its reason: a
   * percentage that cannot name its source can only be credited to whoever
   * happened to have flats in the town (the Ledger's ruling of 2026-09-07).
   */
  card?: CardId;
  /** Signed percent, as a figure a surface prints rather than a fraction. */
  percent: number;
  /**
   * Always `'city'` — Entry XVII's city stage. Carried rather than assumed so
   * that the panel folds one shape for every percentage it prints, and so the
   * classification is written down where a reader will look for it: a category
   * bonus is a share of the hammers **this town** puts behind **this build**, so
   * it multiplies with the town's other bonuses even when the row that grants it
   * is empire-scoped. Marble is the case that makes the point — "+15% toward
   * buildings in every city" is still a fact about each city's build, exactly as
   * a barracks is, and Entry XVII.4 stages an effect by where it applies.
   */
  stage: ModifierStage;
}

/**
 * Everything currently putting extra hammers behind `toward` — the buildings in
 * `BUILDING_IDS` order, then the city's own improved luxuries in resource-table
 * order.
 *
 * Empty for an empty queue, and otherwise a *list over two tables* rather than a
 * lookup of the barracks: both declare the same `{ category, percent }` shape,
 * so the second such building and the first such luxury are data rows and not
 * second branches. There is no barracks case and no marble case anywhere in the
 * simulation. That generalisation is the whole reason the old unit-only
 * `unitProductionBonus` was widened rather than given a sibling — see
 * `buildingData.ts`.
 *
 * `hypothetical` mirrors `foldCity`'s: a barracks the city does not have yet
 * has to be priced by the same function, or the tech screen's "what would this
 * be worth" would quietly answer zero. There is no hypothetical resource,
 * because nothing previews owning one.
 */
/**
 * Which bonus category a queue row belongs to, or `null` for a row no
 * percentage may name.
 *
 * **The one place a queue item's kind is read as a bonus category**, and the one
 * place the two vocabularies are allowed to differ (`QueueKind` in `state.ts` is
 * what a city may build; `ProductionCategory` in `buildingData.ts` is what a
 * bonus may name). Two rows map to something other than their kind:
 *
 *   · a **project** maps to `null`. Its rate is a printed conversion (Entry
 *     XXVI) — a barracks putting ten percent behind Tithes would be a barracks
 *     minting money — so a city building one carries no category bonus at all,
 *     which is exactly what an empty list means to `foldCity`.
 *   · a **wonder** is a `'building'` row that maps to `'wonder'`. A wonder is
 *     built out of the same basket by the same routine, but it is its own
 *     category so that a percentage can name it (the ratified great-person
 *     legacies say "+30%⚙ toward wonders") — and, symmetrically, so that a
 *     barracks-shaped "+15% toward buildings" does *not* quietly ride on one.
 */
export function queueCategory(item: QueueItem): ProductionCategory | null {
  if (item.kind === 'project') return null;
  if (item.kind === 'building') return isWonder(item.id) ? 'wonder' : 'building';
  return 'unit';
}

export function productionModifiers(
  state: GameState,
  city: City,
  toward?: QueueItem | null,
  hypothetical: readonly BuildingId[] = [],
): ProductionModifier[] {
  if (!toward) return [];
  const category = queueCategory(toward);
  if (category === null) return [];
  const list: ProductionModifier[] = [];
  // What the city is actually building, where the row narrows to one silhouette
  // — the Shipyard's ships. Hoisted above both walks because the buildings' own
  // filter and the cards' ask the same question of the same item, through the
  // same predicate: two answers to "is this a ship" is how a slipway and a card
  // start disagreeing about a trireme.
  const unitType = toward.kind === 'unit' && isUnitTypeId(toward.id) ? toward.id : undefined;
  for (const id of BUILDING_IDS) {
    if (!city.buildings.includes(id) && !hypothetical.includes(id)) continue;
    const bonus = buildingDef(id).productionBonus;
    if (bonus === undefined || bonus.percent === 0 || bonus.category !== category) continue;
    if (bonus.class !== undefined) {
      if (unitType === undefined) continue;
      if (!unitMatches(unitType, bonus.class)) continue;
    }
    list.push({
      source: buildingDef(id).name,
      building: id,
      percent: bonus.percent,
      stage: 'city',
    });
  }
  for (const line of resourceProduction(state, city, category)) {
    if (line.percent === 0) continue;
    list.push({
      source: line.source,
      resource: line.resource,
      percent: line.percent,
      stage: 'city',
    });
  }
  // A card's hammers behind this category — and behind *this unit*, when the row
  // narrows to one silhouette (The Great Warring Tribes' mounted line). The item
  // is passed through so the narrowing is asked of what the city is actually
  // building; there is no Conscription case anywhere in this file. `unitType` is
  // hoisted above the buildings' walk, which asks the same question of the same
  // filter.
  // And behind *this building*, when the row names one (Mimar Sinan's mosques).
  // `unitType`'s sibling and passed for its reason exactly: the narrowing is
  // asked of what the city is actually building.
  const buildingId =
    toward.kind === 'building' && isBuildingId(toward.id) ? toward.id : undefined;
  for (const line of cardProduction(state, city, category, unitType, buildingId)) {
    if (line.percent === 0) continue;
    list.push({ source: line.source, card: line.card, percent: line.percent, stage: 'city' });
  }
  return list;
}

/**
 * The percentage points these modifiers add to the city stage: summed, never
 * multiplied. The fold of the list above, handed to `withStage` so that the
 * hammers behind a build and the percentages on the yield meet in one place.
 */
export function modifierPercent(list: readonly ProductionModifier[]): number {
  let percent = 0;
  for (const entry of list) percent += entry.percent;
  return percent;
}

/**
 * One percentage standing on one of a city's yields, whatever put it there.
 *
 * `ProductionModifier` is the same idea for the *thing being built*; this is the
 * idea for the yield itself, and it exists because since the luxuries pass there
 * are two families of source — the two empire meters and a luxury's
 * `percentYields` — which must land in **two sums, each applied once** (Entry
 * XVII, the modifier doctrine). A gems empire at +10% gold and a contented one
 * at +10% science are lines of one list rather than two multiplications; the
 * stage they carry decides which of the two sums each joins.
 */
export interface CityYieldPercent {
  /** Display label: "Happiness +7", "Gems", "Coral · coastal city". */
  source: string;
  yield: CityYieldKey;
  /** Signed whole percent. */
  percent: number;
  /**
   * Which multiplication this line joins. A meter tier is always `'empire'` —
   * it is the empire's mood, not the town's — and a luxury's is whatever its
   * scope says (`scopeStage` in `resourceEffects.ts`).
   */
  stage: ModifierStage;
  /** The meter this line came from, or absent for a resource's line. */
  meter?: MeterId;
  /** The resource this line came from, or absent for a meter's line. */
  resource?: ResourceId;
  /**
   * The card this line came from — an Order, a Doctrine, a government, a
   * belief, a legacy, a technology, or **a building** whose own row carries a
   * `percentYields` clause (a Forum's tenth, Machu Picchu's quarter): every
   * such percentage reaches this list through `explainCardPercentYields`, so the id is
   * the only handle that can say which of them it was.
   *
   * Written down for the Ledger, and it is not decoration. Entry XVII multiplies
   * a town's whole basket at once, so the *gain* over the flats has to be
   * credited to somebody, and until 2026-09-07 the Ledger credited it to whoever
   * had put the base flats there — which meant a card paying nothing but a
   * percentage printed a figure on its own face and added nothing at all to
   * "your cards" (`docs/flags.md`, ruling jj). The gain is shared by who
   * supplied the percentages; a percentage that cannot name its source cannot be
   * shared to it.
   */
  card?: CardId;
}

/**
 * The percentage lines a city inherits from its **empire** rather than earns for
 * itself: the two meter tiers, and the arrears penalty on a treasury under
 * water.
 *
 * A pure function of `(state, playerId)` — nothing about the town is consulted,
 * which is exactly what makes it hoistable and, more usefully, what makes it
 * *shareable between a town and a ghost of it* (`explainBuildingPreview`): the
 * meters sweep `state.cities`, and a shallow copy with one more building in its
 * `buildings` array is not in that list, so the empire's half of a ghost's
 * percentages is the empire's half of the real town's by construction.
 *
 * Two lists rather than one because they are not adjacent: the meters lead
 * `cityYieldPercents` and arrears closes it, with the town's own luxuries and
 * cards between. Order there is presentation and the panel prints it, so the
 * split keeps the seam invisible.
 */
export interface EmpirePercents {
  /** The two meter tiers, in `meterEffects` order — the head of the list. */
  meters: CityYieldPercent[];
  /** Arrears, or empty on a solvent treasury — the foot of the list. */
  arrears: CityYieldPercent[];
}

export function empirePercents(state: GameState, playerId: number): EmpirePercents {
  const meters: CityYieldPercent[] = [];
  for (const effect of meterEffects(state, playerId)) {
    if (effect.growth) continue;
    for (const id of effect.yields) {
      meters.push({
        source: effect.meter === 'happiness' ? 'Happiness' : 'Authority',
        yield: id,
        percent: effect.percent,
        // A tier is the empire leaning on every city at once: the global stage,
        // whichever meter it came from (Entry XVII.4, and XVII.5's whole point —
        // the meters are what the global stage is *for*).
        stage: 'empire',
        meter: effect.meter,
      });
    }
  }
  // **Arrears** (the maintenance ruling, 2026-08-28). A treasury under water
  // costs the empire a quarter of its science and its culture, and it joins
  // `cityYieldPercents` at the **empire** stage rather than being a
  // multiplication somewhere downstream — which is the whole of Entry XVII and
  // the whole reason the ruling asked for it there: −25% arrears on top of a
  // −15% authority tier is −40% of base, once, and never ×0.75 × 0.85.
  //
  // Science and culture and nothing else. Gold is untouched on purpose — an
  // empire in debt must be able to earn its way out — and so are food and
  // hammers, because starving a bankrupt empire's cities is a spiral rather than
  // a penalty. What it taxes is the two things an empire in trouble was
  // *saving* for.
  const arrears: CityYieldPercent[] = [];
  const owner = playerById(state, playerId);
  if (owner && treasuryInDebt(owner) && RULES.upkeep.debtPercent !== 0) {
    for (const key of ['science', 'culture'] as const) {
      arrears.push({
        source: 'Treasury in debt',
        yield: key,
        percent: RULES.upkeep.debtPercent,
        stage: 'empire',
      });
    }
  }
  return { meters, arrears };
}

/**
 * Everything currently multiplying this city's yields: the two meters first, in
 * `meterEffects` order, then the empire's luxuries in resource-table order.
 *
 * Order is presentation, not arithmetic — a line's `stage` decides when it
 * applies, and `foldStageSums` is what folds the list into the two figures
 * `foldCity` uses. The meters are first because they are the loudest, not
 * because they are first to bite; they are in fact last.
 *
 * The growth stifle is deliberately **not** here. It multiplies food *surplus*
 * toward growth rather than a yield (design ledger, Entry XIV.D.4), which is a
 * different rule with a different consumer — `growthSurplus`, which reads it
 * from `meterEffects` directly.
 */
export function cityYieldPercents(
  state: GameState,
  city: City,
  empire: EmpirePercents = empirePercents(state, city.ownerId),
): CityYieldPercent[] {
  const list: CityYieldPercent[] = [...empire.meters];
  for (const line of resourcePercentYields(state, city)) {
    if (line.percent === 0) continue;
    list.push({
      source: line.source,
      yield: line.yield,
      percent: line.percent,
      stage: line.stage,
      resource: line.resource,
    });
  }
  // And the empire's law. A card joins this list with a stage exactly as a
  // luxury does — never a multiplication of its own afterwards (Entry XVII) —
  // so a Doctrine that is the third source of a percentage on food is a third
  // line in one of two sums.
  for (const line of explainCardPercentYields(state, city)) {
    if (line.percent === 0) continue;
    list.push({
      source: line.source,
      yield: line.yield,
      percent: line.percent,
      stage: line.stage,
      card: line.card,
    });
  }
  // And the arrears, at the foot — see `empirePercents`, which is where the two
  // empire-scale lines live now that a screen may want them hoisted.
  list.push(...empire.arrears);
  return list;
}

/**
 * Every multiplication standing on this city right now, folded per yield into
 * Entry XVII's two stages — the figures `foldCity` multiplies by and the
 * figures the panel prints as its two stage lines.
 *
 * One evaluator for both, which is the doctrine's rule 6 taken seriously: a
 * panel that summed the stages itself would be a second implementation of the
 * staging, and the first thing a second implementation does is disagree about
 * the hammers. `toward` is why it could: the city stage on **production**
 * carries whatever the buildings and seams put behind *this particular build*
 * (`productionModifiers`), so the stage sums are a fact about the pair (city,
 * item) exactly as `foldCity` is.
 *
 * `percents` may be handed in by a caller that already has the list — a screen
 * pricing forty rows against one town (`CityReading`). It is the same call this
 * would make and it is *not* a fact about the item, which is the whole reason it
 * can be hoisted out of a loop over items; see `explainCity` for its lifetime.
 */
export function foldCityStages(
  state: GameState,
  city: City,
  toward?: QueueItem | null,
  hypothetical: readonly BuildingId[] = [],
  percents: readonly CityYieldPercent[] = cityYieldPercents(state, city),
): Record<CityYieldKey, StageSums> {
  const hammers = modifierPercent(productionModifiers(state, city, toward, hypothetical));
  // The Great Warring Tribes' first clause, and the only place a card takes a
  // *meter line* off the table rather than adding one. It is asked here because
  // here is the one evaluator that knows both the empire's percentages and what
  // the town is building — "a torn writ no longer slows production toward units"
  // is a fact about the pair (city, item), which is exactly what `foldCityStages`
  // is a fact about. The line is dropped, not zeroed, so the panel stops
  // printing a malus that is not being charged.
  const exemptUnits =
    toward?.kind === 'unit' && cardMeterFlag(state, city.ownerId, 'authorityUnitProductionExempt');
  const live = exemptUnits
    ? percents.filter(
        (line) => !(line.meter === 'authority' && line.yield === 'production' && line.percent < 0),
      )
    : percents;
  const sums = {} as Record<CityYieldKey, StageSums>;
  for (const key of CITY_YIELD_KEYS) {
    const staged = foldStageSums(live, key);
    // The hammers join the city stage rather than standing beside it: a barracks
    // is a fact about the town in exactly the way marble and a market are.
    sums[key] = key === 'production' ? withStage(staged, 'city', hammers) : staged;
  }
  return sums;
}

/**
 * Everything a city produces this turn: the centre, plus every worked tile, plus
 * the flat effects of its buildings.
 *
 * Science and culture are not tile yields at all — they come from population and
 * from buildings — which is why they appear here and nowhere in the terrain
 * tables. Each building's `sciencePerPop` is floored *on its own* so that two
 * half-science buildings pay for two halves rather than rounding into a free
 * point, and the population term is floored the same way for the same reason.
 *
 * Reads `city.workedTiles` rather than re-assigning, so a caller can ask what a
 * city *currently* makes without changing it. The turn pipeline assigns first.
 *
 * `hypothetical` is the one-evaluator hook (Entry VIII): buildings the city does
 * *not* have, counted as if it did. It exists so that "what would a library be
 * worth here?" is answered by the function the turn pipeline banks — a preview
 * computed by a second implementation is a preview that can lie. Callers hand it
 * a candidate list and diff the two results; nothing is cloned and nothing is
 * mutated. See `buildingYieldDelta` in `tech.ts`.
 *
 * `toward` is what the city is putting its hammers behind, and the *only* thing
 * it changes is production. A barracks pays a share of the city's hammers toward
 * a unit and nothing toward a monument (`productionBonus`), so the honest
 * production rate is a fact about the pair rather than about the city — and it
 * is answered here, inside the one evaluator, rather than by a second
 * multiplication somewhere downstream. `collectYields` banks at the rate for
 * whatever is at the *front* of the queue, `turnsToBuild` divides by the rate for
 * the item it is asked about, and the panel prints that same number with the
 * modifier named beside it (`productionModifiers`). Omitting it is the reading
 * for anything asking about the city rather than about a build — science, gold,
 * the top bar's totals — and costs nothing, because a city with no such building
 * has one rate either way.
 *
 * Which is why the *body* of this function is one multiplication and the flats
 * live next door in `explainCity`: everything above the staging is a fact about
 * the town and nothing above it is a fact about the item. A caller with one
 * town and many rows takes the quote once and hands it back; the fold — this
 * function — is unmoved, and the printed number is still its answer.
 *
 * The empire's thumb on the scale
 * ------------------------------
 * Happiness and authority land *here*, at the very end, and that is the whole of
 * how they touch the economy (design ledger, Entry XIV). Since Entry XVII they
 * land in the *second* of two multiplications: everything the town did for
 * itself — its buildings' category bonuses, a seam it holds, a coastal
 * signature — is summed and applied first, and then the empire's mood multiplies
 * the result, `(base + flats) × (1 + Σ city%) × (1 + Σ global%)`, with **no
 * rounding anywhere** (`applyStages` in `modifiers.ts`).
 *
 * Additive within a stage and multiplicative across the pair, which is the whole
 * doctrine: two city bonuses of +10% and +15% are +25% and never ×1.10 × 1.15,
 * while a +10% writ on top of that +25% is worth 37.5 points of base rather than
 * 35 — a global modifier scales with how well-built the cities under it are.
 * Exactness is the same rule the science-per-pop terms above keep since batch X,
 * so a +10% on 7 hammers is 7.7 and the seven tenths reach the basket.
 *
 * Applying it inside this function rather than in the turn phase is the point:
 * `turnsToBuild`, the city panel, the top bar's totals, the tech screen's rate
 * and the pipeline that banks the numbers all read one evaluator, so an empire
 * whose writ is overstretched sees the slower build estimate *before* it ends
 * the turn. The city panel prints the active modifiers as their own lines, which
 * is rule 5 read at empire scale: the multiplied number is never shown without
 * the reason beside it.
 */
export function foldCity(
  state: GameState,
  city: City,
  hypothetical: readonly BuildingId[] = [],
  toward?: QueueItem | null,
  quote: CityReading = explainCity(state, city, hypothetical),
): CityYields {
  // Entry XVII, and the only place in the simulation a yield meets a percentage.
  // The hammers behind *this build* join the city stage rather than standing
  // beside it, because a barracks is a fact about the town in exactly the way
  // marble and a market are; the meters wait for the second multiplication.
  const sums = foldCityStages(state, city, toward, hypothetical, quote.percents);
  const total: CityYields = { ...quote.flats };
  for (const key of CITY_YIELD_KEYS) total[key] = applyStages(total[key], sums[key]);
  return total;
}

/**
 * Everything about a city's yields that is **not** about what it is building:
 * the flats before any percentage has touched them, and the percentages
 * themselves.
 *
 * `foldCity` is this plus one multiplication. The split exists because the
 * two halves are asked at wildly different rates: a screen pricing a build list
 * asks "how long would *this* take" of forty rows against one town, and the
 * only thing that differs between the forty is `productionModifiers` — the
 * centre, the worked tiles, the luxuries, the routes, the palace, the buildings
 * and, above all, `cityYieldPercents` (which walks the whole empire twice for
 * the two meters) are the same answer forty times over. Hoisting them is
 * `tileOwnerField`'s bargain read one system across: the loop pays for the
 * empire once instead of once per row.
 *
 * **It is an input, never an answer.** Nothing prints a reading; the printed
 * number is still `foldCity`'s, computed by the one arithmetic, off a reading
 * handed in rather than one taken. That is rule 5's "a hoisted figure must be
 * the same function's answer handed in" kept honestly: what is hoisted here is
 * the *ingredients*, and the fold stays where it was.
 *
 * **Its lifetime is one sweep** — `zocField`'s and `tileOwnerField`'s rule, and
 * for their reason. A reading is a photograph of one city under one
 * `hypothetical` at one instant; hand it back after anything has been banked,
 * claimed, chopped or slotted and it will answer with the town the state has
 * moved past. Take one at the top of a loop, spend it inside, and let it go.
 * (`readCity` is the memoised form of exactly this call — see `readings.ts`,
 * which is where the third verb lives.)
 */
/**
 * **One labelled line of a town's flats** — the artefact of batch E2, and the
 * thing four surfaces used to rebuild for themselves
 * (`docs/audit/evaluations.md` §3a).
 *
 * Rule 5 says a total is the fold of a labelled list and never computed beside
 * it. That held inside every `explain…` and stopped at `explainCity`, which folded
 * eleven lists into one bag of six numbers and threw the labels away — so the
 * city panel, the Ledger, the ghost-diff and the bot each walked the same eleven
 * sources again to get them back, and every attribution bug of the last two days
 * was one of those four copies disagreeing with the fold. The list is now what
 * `explainCity` *returns*, `flats` is `foldCityFlats` of it, and a reader reads.
 *
 * Six voices on every line, because a reader asks one question of all of them;
 * the sources that cannot pay in a voice carry nought there.
 */
export interface CityYieldLine extends CityYields {
  /**
   * Which of `docs/yields.md`'s numbered town steps this line came out of, 1–10
   * — the sequence of record, carried on the line rather than inferred from a
   * label. A reader wanting "what do the buildings pay" filters on 8 and does
   * not have to know which function that was.
   */
  step: number;
  /** The evaluator's own label — "Granary", "Silk · improved", "3 scholars". */
  source: string;
  /** The card that pays it, when one does (`CardYieldLine.card`). */
  card?: CardId;
  /** The building whose own row pays it, when one does. */
  building?: BuildingId;
  /** The seam that pays it, when one does. */
  resource?: ResourceId;
  /**
   * Which slice of a breakdown this line belongs in, decided **here** and once,
   * by the id and never by the label (`classifyCard`, `ledgerClass.ts`). It is a
   * pure function of the line's own source, which is what lets the Ledger class
   * a town's basket without walking the town again.
   */
  class: LedgerClass;
}

/**
 * The six voices a list of lines adds up to — **the** sum of one, and what
 * `CityReading.flats` is.
 *
 * Walked in the list's own order (CLAUDE.md rule 2), which is `explainCity`'s
 * order, which is `docs/yields.md`'s.
 */
export function foldCityFlats(lines: readonly CityYieldLine[]): CityYields {
  const total = emptyCityYields();
  for (const line of lines) for (const key of CITY_YIELD_KEYS) total[key] += line[key];
  return total;
}

export interface CityReading {
  /**
   * **The labelled list the flats are the fold of** — steps 1–10 of
   * `docs/yields.md`, in that order. See `CityYieldLine`.
   */
  lines: readonly CityYieldLine[];
  /**
   * The six yields as they stand before Entry XVII's two multiplications — the
   * fold of every flat source, in `explainCity`'s order.
   *
   * `foldCityFlats(lines)` and nothing else: rule 5's "never computed beside
   * the list" said of the town, which is what batch E2 was for.
   */
  flats: CityYields;
  /** `cityYieldPercents`' list for this town, which is a fact about the town. */
  percents: readonly CityYieldPercent[];
  /**
   * The empire's half of that list, kept apart so it can be lent to a *ghost*
   * of this town — see `empirePercents` for why that is exact rather than
   * approximate.
   */
  empire: EmpirePercents;
}

export function explainCity(
  state: GameState,
  city: City,
  hypothetical: readonly BuildingId[] = [],
  empire: EmpirePercents = empirePercents(state, city.ownerId),
): CityReading {
  const lines: CityYieldLine[] = [];
  /** One line, pushed. The six voices default to nought; a source fills its own. */
  const say = (
    step: number,
    source: string,
    cls: LedgerClass,
    bag: Partial<CityYields>,
    handles: { card?: CardId; building?: BuildingId; resource?: ResourceId } = {},
  ): void => {
    lines.push({
      step,
      source,
      class: cls,
      ...handles,
      food: bag.food ?? 0,
      production: bag.production ?? 0,
      gold: bag.gold ?? 0,
      science: bag.science ?? 0,
      culture: bag.culture ?? 0,
      faith: bag.faith ?? 0,
    });
  };

  // **1 — the centre**, as two lines rather than one, because they are two
  // different sentences and a breakdown that merged them would credit the land
  // with a citizen's beaker. The town's hex pays what it beats the base city
  // yield by (an excess — `explainCentreYield`), and that is the ground's; what
  // a settlement makes *by being one* belongs to no tile, no building and no
  // card, which is exactly what `other` means.
  const centre = foldCentre(state, city, hypothetical);
  say(1, CENTRE_SOURCE, 'tiles', centre);
  // Exact since batch X: at `sciencePerPop` 0.5 a size-1 town banks half a
  // beaker, where the old floor banked nothing at all.
  say(1, TOWN_ITSELF_SOURCE, 'other', {
    science: city.population * CITIES.sciencePerPop,
    culture: CITIES.baseCulturePerCity,
  });

  // The candidate reaches the *ground* as well as the shelves: a building whose
  // whole worth is a tile line (a lighthouse's coastal food) is invisible to a
  // what-if that only ghosts `explainCityBuildings`. Empty for every real
  // reading, which is every caller but the two hypothetical ones.
  const ctx = cityContext(state, city, hypothetical);
  for (const cell of city.workedTiles) {
    const tile = getTileAt(state.map, cell.col, cell.row);
    if (!tile) continue;
    // **2 — the hex, split by who dressed it.** The later Order pools pay
    // through hex `pays`, so an Order paying a hammer on every hill is the
    // whole of what a late deck does, and a hex filed whole under the land would
    // show that deck paying nothing (`docs/flags.md`, ruling jj). Each `add`
    // line that names a card is lifted out under that card's class and the
    // ground keeps **the fold minus exactly those lines** — never a second sum
    // of the remainder, because `foldTile` is the one place a `base`/
    // `override` list becomes a number and a hill replaces the grass under it.
    const hexLines = explainTileYield(tile, ctx);
    const ground = foldTile(tile, ctx, hexLines);
    let label = HEX_SOURCE;
    for (const entry of hexLines) {
      if (entry.kind !== 'add') label = entry.source;
      if (entry.card === undefined || entry.kind !== 'add') continue;
      const into = classifyCard(entry.card);
      if (into === 'tiles') continue;
      say(2, entry.source, into, entry, { card: entry.card });
      for (const key of TILE_YIELD_KEYS) ground[key] -= entry[key];
    }
    say(2, label, 'tiles', ground);
  }

  // **3 — the cards' city lines.** What this empire's Statecraft cards pay this
  // town (`explainCardCityYields`), each under the card that spoke, which is what lets a
  // reader put an Order's coin in the deck's slice without walking the deck.
  for (const line of explainCardCityYields(state, city)) {
    say(3, line.source, classifyCard(line.card), line, { card: line.card });
  }

  // **4 — the luxuries' city lines.** What the city's own improved seams pay it
  // (`resourceEffects.ts`). After the cards and before the buildings only because
  // a seam in the ground is older than a market built over it; the sum is the
  // same in any order. A seam's coin is the land's.
  for (const line of cityResourceYields(state, city)) {
    say(4, line.source, 'tiles', line, { resource: line.resource });
  }

  // **5 — the specialists.** What the town's guilds pay it (Entry XLVIII), one
  // line per family that has anybody — folded here rather than added downstream
  // so a scholar's beakers are staged by Entry XVII exactly as a library's are,
  // reach the pool through the same `collectYields`, and appear in the panel's
  // ledger with their reason beside them. A specialist is a citizen who stopped
  // working a hex: the tile he left is already missing from `workedTiles` above,
  // so this is a substitution and never a bonus — and he is filed beside the
  // stones that seated him, which is the city panel's own reading.
  for (const line of citySpecialistYields(city)) say(5, line.source, 'buildings', line);

  // **6 — the routes arriving.** What the caravans sent *to* this town are
  // bringing (`explainRouteYield` in `routeYields.ts`) — off each caravan's
  // *origin* buildings, since 2026-08-27's reversal pays the destination and
  // reads the origin. *Inside* this function rather than beside it, so a route's
  // food is staged like every other flat (Entry XVII) and its gold reaches the
  // treasury through the same `collectYields` as the market's.
  //
  // **All five voices a `RouteYieldLine` carries**, and that is the whole of the
  // fix of 2026-09-06: the line grew science and culture with the international
  // ruling and this loop still folded the three it was born with, so
  // Ledger-Keepers' beaker and note were computed, printed by the trade panel,
  // and then dropped on the way into the town's basket. A fold that reads some of
  // a list is rule 5 broken quietly. Faith is the one voice absent, because no
  // route pays it and the line has no field for it.
  for (const line of cityRouteYields(state, city)) say(6, line.source, 'trade', line);

  // **7 — the palace.** The seat of government, a line like every other rather
  // than a term added on the side, so the palace's coin is staged like a
  // market's (Entry XVII) and reaches the treasury through the same
  // `collectYields`. Empty in every city but one.
  for (const line of explainPalaceYield(state, city)) say(7, line.source, 'buildings', line);

  // **8 — the buildings.** `explainCityBuildings` is the only place a building's
  // worth is read — a candidate the city already has is skipped in there, because
  // a preview that promised a second library would be a preview that lies. A
  // wonder is told from an ordinary building by `isWonder` and not by a name.
  for (const entry of explainCityBuildings(city, hypothetical)) {
    say(
      8,
      entry.source,
      isWonder(entry.building) ? 'wonders' : 'buildings',
      {
        food: entry.food,
        production: entry.production,
        gold: entry.gold,
        // Per *entry* rather than per building, and exact since batch X: two
        // half-science sources pay for two halves and both halves are kept. It
        // rides on the line's own science because the town banks one figure —
        // the split between the row's beaker and the citizens' is a fact about
        // the row, which `BuildingYieldContribution` still carries.
        science: entry.science + city.population * entry.sciencePerPop,
        culture: entry.culture,
        // The shrine and the temple are why this voice is here: a building may
        // pay faith since 2026-08-26, and faith is banked into
        // `Player.faithPool` by `collectYields` like every other source of it.
        faith: entry.faith,
      },
      { building: entry.building },
    );
  }

  // **9 — the cards' building shares.** What the deck adds to those same shelves
  // — "your faith buildings give half again", and the doublers. Directly after
  // the buildings because it is a share of exactly the block above it, and
  // *before* the conversions because a conversion takes a share of the town's
  // whole fold and this is part of it. A line with no card is the fallback shape
  // and files under the stones.
  for (const line of explainCardBuildingYields(state, city, hypothetical)) {
    say(
      9,
      line.source,
      line.card === undefined ? 'buildings' : classifyCard(line.card),
      line,
      { ...(line.card === undefined ? {} : { card: line.card }) },
    );
  }

  // **10 — the conversions.** A share of what the town makes, paid again as
  // another voice — Thalassocracy's tenth of the harvest, minted. **Last**, and
  // that is the whole of its stage (`CardYieldConversionEffect`): it is the one
  // card line whose subject is this very fold, so every flat above it is already
  // in hand and the share it pays is itself an ordinary flat, staged by Entry
  // XVII like a market's coin. The fold it reads is the list so far, which is
  // what `foldCityFlats` is for.
  for (const line of cardYieldConversions(state, city, foldCityFlats(lines))) {
    say(10, line.source, classifyCard(line.card), line, { card: line.card });
  }

  // The percentages are gathered, never applied: the multiplication is `foldCity`'
  // one line, and it is the only place in the simulation a yield meets a percentage.
  return {
    lines,
    // Rule 5, at the town's scale: the fold of the list and never a total kept
    // beside it (batch E2). Same additions, same order, one sum.
    flats: foldCityFlats(lines),
    percents: cityYieldPercents(state, city, empire),
    empire,
  };
}
