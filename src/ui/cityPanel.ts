/**
 * The city screen: what a city makes, how fast it is growing, and what it is
 * building next.
 *
 * A DOM panel, built and torn down from the simulation on every render. It reads
 * the city through the same functions the turn pipeline uses — `foldCity`,
 * `growthThreshold`, `turnsToFill` — so a number shown here is the number the
 * end of turn will act on, not a second implementation of the same arithmetic
 * that drifts a patch later.
 *
 * Editing production
 * ------------------
 * Every edit — add, remove, move up — is expressed as a *whole new queue* and
 * sent as one `setCityProduction` command (see `commands.ts` for why the command
 * is a replacement rather than a diff). So the panel's job is only ever "build
 * the array the player now wants and dispatch it". A rejected command leaves the
 * city exactly as it was, and since batch UX5 the work rail says why in one line
 * (`refused`).
 *
 * Buying
 * ------
 * Every row of the add list has a price in one right-hand column (the user's A1
 * ruling, 2026-10-12): `buildListModel` decides the rows, their prices and where
 * each refusal is said, and `priceCell.ts`, `refusalLine.ts` and
 * `bankFigure.ts` draw the price, the refusals and the treasury. A purchase
 * always costs the full price, so no price sits beside a progress bar.
 *
 * Gating
 * ------
 * The panel is only ever shown for one of the local seat's own cities —
 * `controls.openCity()` returns null for anybody else's — and its buttons switch
 * off once that seat has ended its turn, because the reducer would refuse them.
 * The readout stays live either way: looking is not commanding.
 */

import {
  borderGrowth,
  buildingProductionCost,
  citizenFocus,
  citizenFocusError,
  cityFocus,
  explainGrowthPercent,
  growthSurplus,
  growthThreshold,
  canSpareAnyOf,
  isCoastalCity,
  purchasableTiles,
  tileBuyingError,
  productionAwaitingRoom,
  queueItemCost,
  queueItemName,
  turnsToBuild,
  turnsToFill,
  type CityYields,
  unitProductionCost,
} from '../sim/cities';
import {
  explainBuildingPreview,
  explainOpusGate,
  explainSurplusMoved,
  explainUnrestGate,
  foldBuildingPreview,
  foldCity,
  foldCityStages,
  productionModifiers,
  queueCategory,
  UNREST_SOURCE,
  type BuildingPreviewLine,
  type CityReading,
  type CityYieldPercent,
} from '../sim/yields/town';
import {
  explainPacification,
  foldPacification,
  inUnrest,
  pacificationTurnsLeft,
  rebelTurnsLeft,
  unrestGarrison,
} from '../sim/unrest';
import {
  type BuildingId,
  type ProductionCategory,
  BUILDING_IDS,
  buildingDef,
  isWonder,
} from '../sim/buildingData';
import { bankedTowardItem, wonderClaim } from '../sim/state';
import {
  cardBuildsEverywhere,
  cardCityStat,
  cityScopeAdmits,
  describeCard,
  ref,
} from '../sim/statecraft';
import type { CityScope } from '../sim/statecraftData';
import { consecrationDef } from '../sim/religionData';
import { type CitizenFocus, CITIZEN_FOCUSES, RULES } from '../sim/rulesData';
import {
  type ProjectId,
  PROJECT_IDS,
  projectDef,
  projectRate,
} from '../sim/projectData';
import {
  cityMaxHp,
  explainCityMaxHp,
  explainCityStrength,
  isCombatant,
  isRanged,
  siegeField,
  underSiege,
} from '../sim/combat';
import { buildingCityStat, cityQueueFloor, queueFloorRefusal } from '../sim/buildingEffects';
import {
  type PurchasableItem,
  type PurchaseCurrency,
  bankOf,
  contributeError,
  explainContribution,
  isPurchaseOnly,
  purchaseVerb,
} from '../sim/purchase';
import { BANKS, BANK_UNIT, bankHeldText, bankLineElement, readBanks } from './bankFigure';
import {
  type PriceHeadBank,
  type PriceLook,
  emptyPriceCellElement,
  priceCellElement,
  priceFigureText,
  priceHeadElement,
  priceLook,
  priceNeedText,
  purchaseLook,
} from './priceCell';
import {
  type RefusalEntry,
  type RefusalHeadLine,
  type RefusalPlace,
  planRefusals,
  refusalLineElement,
} from './refusalLine';
import type { Command, CommandResult } from '../sim/commands';
import type { ConfirmRequest } from './confirmCard';
import { annexCityError, razeCityError } from '../sim/diplomacy';
import { type Game, dispatch } from '../sim/game';
import { happinessOf, meterEffects } from '../sim/meters';
import { type ModifierStage, applyStages } from '../sim/yields/stages';
import { CITY_YIELD_KEYS, type CityYieldKey, type ResourceId } from '../sim/resourceData';
import {
  type SpecialistYieldLine,
  citySpecialistYields,
  guildThreshold,
  totalSpecialists,
} from '../sim/specialists';
import { cityGuildInflow, dismissSpecialistError, guildIdleLine } from '../sim/guilds';
import type { SpecialistFamily } from '../sim/greatPeopleData';
// The town's one reading — see `renderCity`, and `readings.ts` for the model.
import { readCity } from '../sim/readings';
import { cityRouteRows, routeSlotsLine as routeSlotsLineOf } from './tradeLines';
import { copiesFigureNode, requirementNodes, strategicHoldings } from './resourceCopies';
import { resourceMarkNode } from './resourceMark';
import { setYieldText, yieldMarkNode } from './yieldMark';
import { roundYield } from '../sim/yieldFormat';
import {
  type City,
  type GameState,
  type QueueItem,
  type ReligionId,
  barbarianPlayer,
  cityReligion,
  followerCount,
  hasEndedTurn,
  playerById,
  unconvertedCitizens,
} from '../sim/state';
import { type PressureLine, explainPressure } from '../sim/religion';
import { pressureLedgerText } from './religionScreen';
import {
  buildError,
  gatingTech,
  hasTech,
  isUnlocked,
  requiredResource,
  upgradeTargetForType,
} from '../sim/tech';
import { BEAD_FAMILY_MARK } from './beadsScreen';
import { describeBeadBoon } from '../sim/beads';
import {
  type UnitDef,
  type UnitTypeId,
  UNIT_TYPE_IDS,
  isNaval,
  requiredResourcesOf,
  unitDef,
} from '../sim/unitData';
import { buildingUpkeep, unitUpkeep } from '../sim/upkeep';
import { cityDisplayName } from './cityDisplay';
import { levyMenuModel, renderLevyMenuBody, renderLevyTrigger } from './levyMenu';
import {
  type YieldKey,
  HAMMER,
  PROJECT_GLYPHS,
  PROJECT_SPOKEN,
  YIELD_GLYPH,
  YIELD_NAME,
  copiesFigure,
  copiesWords,
  figure,
  netFigure,
  percentFigure,
  signedFigure,
  turnsLabel,
} from './figures';
import { prefersReducedMotion } from './motion';
import type { RiteOption } from './controls';
import { cityRite, cityRiteTurnsLeft, riteGate } from '../sim/religion';
import { type RiteId, riteDef } from '../sim/religionData';
import { chargeCostWords } from '../sim/religion';
import { createInfoCard } from './infoCard';
import { setDescriptorText } from './keywords';
import { yieldElement as element } from './yieldMark';
import { seatName } from '../sim/leaderData';


/**
 * One faith with a claim on this town, as the city sheet lists it.
 *
 * A claim is any of three things and the list is the union of them, because all
 * three are the same question asked at different distances: people who already
 * follow, faith banked toward the next of them turning, and pressure arriving
 * this turn. A row that appeared only once somebody had converted would be a
 * player watching their capital flip with no warning at all.
 */
export interface CityFaithRow {
  religion: ReligionId;
  /** The faith's own name, as its founder last set it. */
  name: string;
  /** True when the seat reading the sheet founded it. */
  ours: boolean;
  founderName: string;
  /** The founder's banner ink — a foreign faith is named in the colour of who owns it. */
  founderColor: string;
  /** Citizens of this town who follow it, of the whole population. */
  following: number;
  population: number;
  /** True when more than half the town follows it — `cityReligion`'s answer. */
  majority: boolean;
  /** Faith banked toward the next citizen turning, and what one costs. */
  banked: number;
  perConvert: number;
  /** `explainPressure`'s lines for this faith, for the hover. */
  ledger: PressureLine[];
}

/**
 * Every faith with a claim on this town, in **founding order**, plus the
 * citizens who follow nothing.
 *
 * Pure, exported, and the whole of what the followers block prints — the
 * `religionReading` bargain one screen over. Every figure is somebody else's:
 * the counts are `followerCount`, the banner is `cityReligion`, the remainder is
 * `unconvertedCitizens` (derived, never stored — a second count of the
 * unconverted would disagree the turn a citizen was born) and each ledger is
 * `explainPressure`, which is the same list the tide folds into the bank.
 *
 * `state.religions` order rather than "most followers first", because founding
 * order is an order the state carries and a list that re-sorted itself as
 * congregations changed would be one a player could never learn.
 */
export function cityFaithRows(state: GameState, city: City, seat: number): CityFaithRow[] {
  if (state.religions.length === 0) return [];
  const perConvert = Math.max(1, Math.floor(RULES.religion.pressurePerConvert));
  const lines = explainPressure(state, city);
  const majority = cityReligion(city);
  const rows: CityFaithRow[] = [];
  for (const religion of state.religions) {
    const following = followerCount(city, religion.id);
    const banked = city.pressureBank?.[religion.id] ?? 0;
    const ledger = lines.filter((line) => line.religion === religion.id);
    if (following === 0 && banked === 0 && ledger.length === 0) continue;
    const founder = playerById(state, religion.founderId);
    rows.push({
      religion: religion.id,
      name: religion.name,
      ours: religion.founderId === seat,
      founderName: seatName(state, religion.founderId),
      founderColor: founder?.color ?? 'var(--ink)',
      following,
      population: city.population,
      majority: majority === religion.id,
      banked,
      perConvert,
      ledger,
    });
  }
  return rows;
}

/**
 * The one line about belief that belongs beside a town's **name**.
 *
 * The user's ruling of 2026-08-28: the Faith block halfway down the sheet
 * answered "what is pressing here" perfectly and never answered "what does this
 * town *believe*", because a player reading a city screen reads the header and
 * then the baskets. So the banner is promoted to the header, in the header's own
 * voice — a short badge beside Size and hp — and the full `cityFaithRows` list
 * stays exactly where it is, as the argument under the answer.
 *
 * Three states, and they are the three a town can actually be in:
 *
 *   · **it follows one** — "Following the Hearth Cult ✶ · 3 of 5 citizens ·
 *     +10 a turn". The tide on the end is that faith's own, because "who has
 *     this town" and "who is winning it" are the same question when the answer
 *     is the same faith.
 *   · **it follows none and something is pulling** — "Follows no religion · the
 *     Hearth Cult presses +4 a turn". The seat's own faith is named first when
 *     it has a claim, because the reader is the one deciding whether to press
 *     harder; otherwise the strongest presser is, because that is who is about
 *     to take the town.
 *   · **it follows none and nothing is pulling** — "Follows no religion", and
 *     nothing else. No figure, because there is none.
 *
 * Every number is `cityFaithRows`' — the one fold — so the badge and the block
 * under it cannot come to disagree, and a world with no religions in it yet gets
 * `null` rather than a line saying a town follows nothing it could have
 * followed.
 *
 * Pure and exported for `insertionIndex`'s reason: the *words* are the whole of
 * what can be quietly wrong here, and this suite has no jsdom.
 */
export interface CityFaithHeadline {
  /** The whole line, which is what a test quotes and a `title` can carry. */
  text: string;
  /** The faith the line names, or `null` when it names none. */
  religion: ReligionId | null;
  name: string | null;
  /** The founder's ink, so the header names a foreign faith in its own colour. */
  founderColor: string | null;
  /** True when the town flies it — the ✶. */
  majority: boolean;
  /** That faith's congregation, or `null` on a line that names no faith. */
  following: number | null;
  population: number;
  /** That faith's pressure this turn, folded from its ledger. Zero is honest. */
  pressure: number;
}

export function cityFaithHeadline(
  state: GameState,
  city: City,
  seat: number,
): CityFaithHeadline | null {
  const rows = cityFaithRows(state, city, seat);
  if (state.religions.length === 0) return null;
  const tideOf = (row: CityFaithRow): number => {
    let total = 0;
    for (const line of row.ledger) total += line.amount;
    return Math.max(0, total);
  };
  const bare: CityFaithHeadline = {
    text: 'Follows no religion',
    religion: null,
    name: null,
    founderColor: null,
    majority: false,
    following: null,
    population: city.population,
    pressure: 0,
  };

  const banner = rows.find((row) => row.majority);
  if (banner !== undefined) {
    const tide = tideOf(banner);
    return {
      text:
        `Following ${banner.name} ✶ · ${figure(banner.following)} of ` +
        `${figure(banner.population)} citizens` +
        (tide > 0 ? ` · +${figure(tide)} a turn` : ''),
      religion: banner.religion,
      name: banner.name,
      founderColor: banner.founderColor,
      majority: true,
      following: banner.following,
      population: banner.population,
      pressure: tide,
    };
  }

  // Nobody flies a banner. Who is pulling — ours first, then the hardest pull,
  // then founding order, which is the only tiebreak the state carries.
  const pressing = rows.filter((row) => tideOf(row) > 0);
  const pull =
    pressing.find((row) => row.ours) ??
    pressing.reduce<CityFaithRow | null>(
      (best, row) => (best === null || tideOf(row) > tideOf(best) ? row : best),
      null,
    );
  if (pull === null) return bare;
  const tide = tideOf(pull);
  return {
    ...bare,
    text: `Follows no religion · ${pull.name} presses +${figure(tide)} a turn`,
    religion: pull.religion,
    name: pull.name,
    founderColor: pull.founderColor,
    following: pull.following,
    pressure: tide,
  };
}

/**
 * Where a newly-pressed build row lands: at the back, but **in front of any
 * standing project**.
 *
 * A project never leaves the queue (Entry XXVI), so a plain append would be
 * putting every future warrior behind a row that is never reached — the queue
 * would silently stop the moment a player queued Tithes. Reading a project as
 * *the standing order a city falls back to* puts new work ahead of it, which is
 * what the player meant by both presses and needs no second control to say so.
 *
 * The trailing *run*, not the last item, because two projects may stand
 * together: a player who queued Tithes and then Scholarship has said "mint coin
 * when there is nothing else", and a warrior belongs in front of both.
 *
 * Pure and module-level because this is the panel's placement decision rather
 * than its DOM, and the suite that holds it has no jsdom.
 */
export function insertionIndex(queue: readonly QueueItem[]): number {
  let at = queue.length;
  while (at > 0 && queue[at - 1]?.kind === 'project') at -= 1;
  return at;
}

/**
 * A plain copy of a queue: the panel edits a copy and sends it, never the
 * state's own array.
 */
export function queueDraft(queue: readonly QueueItem[]): QueueItem[] {
  return queue.map((item): QueueItem => {
    if (item.kind === 'unit') return { kind: 'unit', id: item.id };
    if (item.kind === 'project') return { kind: 'project', id: item.id };
    return { kind: 'building', id: item.id };
  });
}

/**
 * The queue a press on a build row sends: the town's queue with `item` placed
 * where `insertionIndex` puts it.
 *
 * Exported so the tests can send exactly the command a press would send, and
 * check the reducer takes it for every row the build list leaves pressable.
 */
export function queueWithAdded(queue: readonly QueueItem[], item: QueueItem): QueueItem[] {
  const next = queueDraft(queue);
  next.splice(insertionIndex(queue), 0, item);
  return next;
}

/** "1st", "2nd", "3rd", "11th": an English ordinal, the teens included. */
export function ordinalWord(position: number): string {
  const teens = position % 100;
  if (teens >= 11 && teens <= 13) return `${position}th`;
  return `${position}${['th', 'st', 'nd', 'rd'][position % 10] ?? 'th'}`;
}

/**
 * "in queue · 1st": the mark on a building row that is already in the queue.
 * The current build is 1st, which is how the current build can be bought from
 * the add list in one press (the user's A1 ruling, 2026-10-12).
 */
export function queuedMark(position: number): string {
  return `in queue · ${ordinalWord(position)}`;
}

/**
 * May this unit type ever appear as a **build** row at all?
 *
 * Not "can this city build one today" — that is `buildError`'s question and its
 * answer is a greyed row with a reason on it. This is the prior question, and
 * the two things it turns away are the two the roster marks as belonging to
 * another verb entirely:
 *
 *   · **bought or not at all** (`UnitDef.purchase.exclusive`, through
 *     `isPurchaseOnly`) — the augur, which has a row of its own at the foot of
 *     the list, in the bank it is actually sold in.
 *   · **neither built nor bought** (`UnitDef.greatWork`) — a great person is
 *     *called*, by a renown bucket that filled and an offer that was answered,
 *     and the roster's row is a template rather than a thing a town makes.
 *
 * The second is the playtest's (user, 2026-08-27), and the row it removes was
 * worse than a greyed one: a great person's row carries no cost, so the list
 * printed "Great Person · 0⚙ · 0t" — an offer to have the best piece in the
 * game this turn for nothing. `buildError` would of course have refused the
 * press ("Great Persons are neither built nor bought — they are called"), so
 * nothing was ever wrong; the panel was simply advertising a door that opens
 * onto a wall.
 *
 * Asked of the two **markers** and never of a type id, exactly as the reducer
 * asks (`buildError`, `purchaseError`): a second great-person family or a second
 * faith-bought piece is a JSON row and this list learns about it for free.
 *
 * Pure and module-level because the suite has no jsdom, and "which rows exist"
 * is the half of the build list that can be quietly wrong.
 *
 * A third marker joined in batch UX5: **hired with a route** (`UnitDef.routeOnly`,
 * the trader). Its row looked pressable and did nothing, because `buildError`
 * refuses it and the unit loop never asked (the city audit's Trader bug). The
 * build list now prints one line in its place that opens the trade sheet,
 * where caravans are hired (`buildListModel`'s `caravans`).
 */
export function offeredInBuildList(id: UnitTypeId): boolean {
  if (isPurchaseOnly({ kind: 'unit', id })) return false;
  if (unitDef(id).greatWork === true) return false;
  if (unitDef(id).routeOnly === true) return false;
  return true;
}

/**
 * One shelf of the add-list — the tabs across the top of "Add to queue".
 *
 * `ProductionCategory` for the three a percentage may name, and `null` for the
 * projects, which are deliberately not a category at all (`queueCategory`
 * answers `null` for one, and its docblock says why). So the shelves are not a
 * fifth vocabulary invented here: they are exactly the answers the simulation's
 * own sorter gives, asked of every row the list was already printing. A fourth
 * category added to the table joins this list and nothing else.
 */
export type AddShelf = ProductionCategory | null;

/**
 * The shelves, in the order the one long list used to print them — and the order
 * the All tab prints them in, one group after another.
 *
 * `word` is the shelf's name for **one** row of it, which is what an eyebrow
 * over a group says ("units", not "Units"): the tab is a control and shouts in
 * sentence case, the eyebrow is a label and is set in the specimen's mono
 * uppercase, so the two want different words rather than the same word twice.
 */
export const ADD_SHELVES: readonly { shelf: AddShelf; label: string; word: string }[] = [
  { shelf: 'unit', label: 'Units', word: 'units' },
  { shelf: 'building', label: 'Buildings', word: 'buildings' },
  { shelf: 'wonder', label: 'Wonders', word: 'wonders' },
  { shelf: null, label: 'Projects', word: 'projects' },
];

/**
 * The Faith shelf (batch UX5): the things a town buys with faith and never
 * builds, "Call a prophet" and the rest, priced in the same column as every
 * other row.
 *
 * Not an `AddShelf`, for the reason `'all'` is not one: an `AddShelf` is an
 * answer `queueCategory` gives about a row a queue can hold, and nothing on
 * this shelf can ever be queued. The purchase-only rows priced in gold (the
 * Company Guard) stay at the foot of the units, beside the bank they draw on.
 */
export const FAITH_SHELF = { label: 'Faith', word: 'faith' } as const;

/** A shelf the build list prints: one of the four production shelves, or the Faith shelf. */
export type ListShelf = AddShelf | 'faith';

/**
 * A tab of the add-list: one shelf, or **all of them at once**.
 *
 * `'all'` is deliberately *not* a fifth `AddShelf`. A shelf is an answer
 * `queueCategory` gives about a row (see `AddShelf`), and no row is ever sorted
 * into "all" — it is a filter the player holds, not a kind of thing a town
 * builds. Keeping the two types apart is what stops a future reader from asking
 * the simulation whether something is an "all", which it cannot answer.
 * `'faith'` is the Faith shelf's tab (`FAITH_SHELF`).
 */
export type AddTab = AddShelf | 'faith' | 'all';

/**
 * The tabs across the top of the add-list. **All comes first and is the
 * default** (user, from a playthrough): the split into four shelves is a fact
 * about the rules, and a player who has not learnt yet that a wonder is not a
 * building was being asked to know it before they could find one. So the list
 * opens whole, and the shelves stay for the player who has learnt the
 * distinction and wants only the soldiers.
 */
export const ADD_TABS: readonly { tab: AddTab; label: string }[] = [
  { tab: 'all', label: 'All' },
  ...ADD_SHELVES.map(({ shelf, label }) => ({ tab: shelf, label })),
  { tab: 'faith', label: FAITH_SHELF.label },
];

/**
 * Which tab is showing, **for each seat** — module state, and deliberately not
 * game state.
 *
 * Which tab a player last looked at is a fact about this sitting at the
 * keyboard: it is not in the save (a save is `{config, log}` and replays), it is
 * not in a command, and no other seat can see it. It survives leaving one town
 * and entering the next, which is the whole of what remembering a tab means, and
 * it resets to All when the page does — a fresh sitting is where a fresh player
 * is, and nothing is hidden from them until they hide it themselves.
 *
 * Kept per seat since batch UX7 (the user's ruling of 2026-10-12: "the chosen
 * tab is remembered per player"): at a shared keyboard, one player choosing
 * Units does not choose it for the next.
 */
const addTabs = new Map<number, AddTab>();

/** The tab this seat last chose, or All. */
export function addTabFor(seat: number): AddTab {
  return addTabs.get(seat) ?? 'all';
}

/**
 * Does this shelf print under this tab? The All tab shows every shelf; every
 * other tab shows itself and nothing else. Takes the tab rather than reading
 * `addTabFor`, so `buildListModel` stays a pure function of what it is handed.
 */
export function shelfShows(tab: AddTab, shelf: ListShelf): boolean {
  return tab === 'all' || tab === shelf;
}

// --- the build list, as data -------------------------------------------------

/**
 * Whether a unit type gets a line in this town's build list at all: a row, or
 * the caravans' line to the trade sheet.
 *
 * Hidden outright, never greyed: a hull no technology can reach yet (user,
 * 2026-08-30), a type the empire has not unlocked, and a type a better one has
 * replaced (user, 2026-09-03: "once a unit is obsolete, please remove it from
 * the build queue", asked of the reducer's own walk). Shared by the build list
 * and the band's "none spare" chips, so the two cannot disagree about which
 * rows exist.
 *
 * Since batch UX7 two more rows are hidden, because this town can never build
 * them (the user's ruling of 2026-10-12, "rows this town can never build are
 * hidden"): a withdrawn type, and a ship in a town that is not on the coast.
 * Both are asked of the row's markers and of `isCoastalCity`, the test the
 * queue's own coast clause asks, never of the refusal's words.
 */
export function unitRowShown(state: GameState, city: City, id: UnitTypeId): boolean {
  const def = unitDef(id);
  if (def.awaitsTech === true) return false;
  if (def.retired === true) return false;
  if (!isUnlocked(state, city.ownerId, 'unit', id)) return false;
  if (upgradeTargetForType(state, city.ownerId, id) !== null) return false;
  if (isNaval(def) && !isCoastalCity(state, city)) return false;
  return true;
}

/**
 * The tests a building's site may ask that nothing a player does can change:
 * where the town stands and what has happened to it. A town that fails one of
 * these will never build the row, so the row is hidden. Every other test (a
 * building standing, a pasture worked, a size reached, a faith kept) can be
 * met, so a row that fails one of those folds into "Not yet" instead.
 */
const FIXED_SITE_TESTS: ReadonlySet<string> = new Set([
  'coastal',
  'riverside',
  'notFreshwater',
  'mountainAdjacent',
  'terrainBeside',
  'onTerrain',
  'onHills',
  'onResourceKind',
  'captured',
  'capital',
  'notCapital',
]);

/**
 * True when this town fails a site and can never meet it: a leaf test from
 * `FIXED_SITE_TESTS`, every branch of an `any`, or one branch of an `all`.
 * Each branch is asked of `cityScopeAdmits`, the evaluator the queue's own site
 * clause asks, so a site this says is never met is one the queue refuses.
 */
function siteNeverMet(state: GameState, city: City, scope: CityScope): boolean {
  if (cityScopeAdmits(state, city, scope)) return false;
  if (scope.test === 'all') return scope.of.some((part) => siteNeverMet(state, city, part));
  if (scope.test === 'any') return scope.of.every((part) => siteNeverMet(state, city, part));
  return FIXED_SITE_TESTS.has(scope.test);
}

/**
 * Whether this town can never build this building (batch UX7), so its row is
 * hidden rather than greyed: a row that is only ever placed, a once-per-realm
 * building that already stands in another of the empire's towns (unless a card
 * lets every town raise one), or a site this town will never have (a harbour
 * inland, Machu Picchu with no mountain beside it). Each clause is the marker
 * or the predicate the queue's own clause asks (`buildError`), never its words.
 */
export function buildingNeverHere(state: GameState, city: City, id: BuildingId): boolean {
  const def = buildingDef(id);
  if (def.placed === true) return true;
  if (
    def.oncePerEmpire === true &&
    !cardBuildsEverywhere(state, city.ownerId, id) &&
    state.cities.some(
      (other) => other.ownerId === city.ownerId && other.id !== city.id && other.buildings.includes(id),
    )
  ) {
    return true;
  }
  const site = def.requiresSite;
  return site !== undefined && siteNeverMet(state, city, site);
}

/** How a unit's build row reads in this town. See `unitRowGate`. */
export interface UnitRowGate {
  /** Why the queue would refuse it here, in `buildError`'s words, or `null`. */
  blocked: string | null;
  /** True when the only refusal is the strategic resource. */
  wantsResource: boolean;
  /** Fewer citizens than the row asks for. */
  tooSmall: boolean;
  /** The resources the row accepts, any one of which would do. */
  missing: readonly ResourceId[];
}

/**
 * The reducer's answers for one unit row in one town.
 *
 * The resource is asked as "can the empire spare one", the reducer's own
 * question since batch R1, so the greyed row and the refusal agree about a copy
 * an army already stands on. It is drawn with its marks and counts only when it
 * is the whole refusal: asked again with the resource waived, the gate says yes.
 */
export function unitRowGate(state: GameState, city: City, id: UnitTypeId): UnitRowGate {
  const missing = requiredResource('unit', id);
  const needsResource = missing.length > 0 && !canSpareAnyOf(state, city.ownerId, missing);
  const blocked = buildError(state, city.ownerId, 'unit', id, city);
  const wantsResource =
    blocked !== null &&
    needsResource &&
    buildError(state, city.ownerId, 'unit', id, city, { ignoreResourceRequirement: true }) ===
      null;
  return { blocked, wantsResource, tooSmall: city.population < unitDef(id).minCityPop, missing };
}

/**
 * One cell of a row's price column: a bank that sells the row, how buying it
 * reads today (`priceCell.ts`), and, for a dash, where its reason is said.
 */
export interface BuildListCell {
  look: PriceLook;
  /**
   * Where a dash's reason is said (`refusalLine.ts`): once at the head of the
   * shelf, or on a line under the row. `null` for a cell that is not a dash,
   * and for a dash whose reason the row already prints as its own refusal.
   */
  place: RefusalPlace | null;
}

/** A unit the town could queue. */
export interface UnitListRow {
  kind: 'unit';
  id: UnitTypeId;
  name: string;
  /** Why the queue would refuse it here, in `buildError`'s words, or `null`. */
  blocked: string | null;
  /**
   * True when the only refusal is the strategic resource. The row then draws
   * the requirement with its marks and counts instead of the sentence.
   */
  wantsResource: boolean;
  /** Fewer citizens than the row asks for. The queue refuses it as well. */
  tooSmall: boolean;
  /** The build button may be pressed. */
  enabled: boolean;
  cells: BuildListCell[];
}

/** A building or wonder this town has not built. */
export interface BuildingListRow {
  kind: 'building';
  id: BuildingId;
  name: string;
  wonder: boolean;
  blocked: string | null;
  /** Where it stands in the queue, counted from 1 for the current build, or `null`. */
  queued: number | null;
  /**
   * Bought and never built (`BuildingDef.purchaseOnly`, the Gilded Hall). The
   * queue refuses it on purpose, so its row is a label and its price is the
   * control, like the things on the Faith shelf.
   */
  boughtOnly: boolean;
  enabled: boolean;
  cells: BuildListCell[];
}

/** A project. It is a conversion rather than a thing, so it has no price cells. */
export interface ProjectListRow {
  kind: 'project';
  id: ProjectId;
  name: string;
  enabled: boolean;
  cells: BuildListCell[];
}

/** Something a town buys and never builds: "Call a prophet", "Hire a Company Guard". */
export interface OfferListRow {
  kind: 'offer';
  id: UnitTypeId;
  /** The roster's name, which the purchase gate's sentences use. */
  name: string;
  /** How the row offers itself (`purchaseVerb`). */
  verb: string;
  cells: BuildListCell[];
}

export type BuildListRow = UnitListRow | BuildingListRow | ProjectListRow | OfferListRow;

/**
 * Why a row sits in its shelf's "Not yet" fold (batch UX7): a strategic
 * resource, drawn with the empire's counts, or a sentence. Every sentence is a
 * gate's own (`buildError`, `purchaseError`), except a town too small for a
 * unit, which the queue does not refuse and the row says in its own words.
 */
export type NotYetReason =
  | { kind: 'resource'; resources: readonly ResourceId[] }
  | { kind: 'text'; text: string };

/** One row folded under "Not yet", and why. */
export interface NotYetRow {
  row: BuildListRow;
  reason: NotYetReason;
}

/** One shelf of the build list, as the panel prints it. */
export interface BuildListShelf {
  shelf: ListShelf;
  /** The eyebrow over the shelf on the All tab ("units", "faith"). */
  word: string;
  /** The rows the town can use: build, buy, or read as queued. */
  rows: BuildListRow[];
  /**
   * The rows blocked for a reason the player can fix (batch UX7, the user's
   * ruling of 2026-10-12): a strategic resource with none spare, too few
   * citizens, a building that must stand first, a technology not yet
   * researched. They fold into "Not yet · N" under the shelf, each with its
   * reason, so the player learns what to fix without the list growing by
   * every one of them.
   */
  notYet: NotYetRow[];
  /** The reasons said once at the head of this shelf (`planRefusals`). */
  refusals: RefusalHeadLine[];
  /**
   * A caravan is open to this empire. The shelf ends with the line that opens
   * the trade sheet, where caravans are hired, instead of a build row the
   * reducer would refuse.
   */
  caravans: boolean;
}

/**
 * Why a unit row cannot be used here, or `null` when it can. The strategic
 * resource is drawn with the empire's counts when it is the whole refusal
 * (`unitRowGate`); any other refusal is the queue's own sentence; a town too
 * small for the unit, which the queue does not refuse, is said in plain words.
 */
function unitNotYet(
  city: City,
  row: Pick<UnitListRow, 'id' | 'blocked' | 'wantsResource' | 'tooSmall'>,
): NotYetReason | null {
  if (row.wantsResource) return { kind: 'resource', resources: requiredResource('unit', row.id) };
  if (row.blocked !== null) return { kind: 'text', text: row.blocked };
  if (row.tooSmall) {
    const def = unitDef(row.id);
    return {
      kind: 'text',
      text: `${def.name} needs a city of ${def.minCityPop}; ${city.name} has ${city.population}`,
    };
  }
  return null;
}

/**
 * **Everything the add list prints, as data**: which rows exist, which build
 * buttons may be pressed, how each price reads, where each refusal is said,
 * and which rows fold away under "Not yet".
 *
 * Pure, for the reason `levyMenuModel` is: the suite has no document, and this
 * is the half of the screen that can be quietly wrong. Every answer is the
 * simulation's: `buildError` greys a build row, the purchase gate decides a
 * price's look (`purchaseLook`), and the refusals are the gates' own sentences.
 * The batch UX5 test sends the reducer the very command each pressable row and
 * each pressable price would send, and checks it is taken.
 *
 * Which rows exist, since batch UX5:
 *   - **Every unit row asks `buildError`** with the town in hand, so a row the
 *     reducer would refuse is greyed with the reducer's sentence.
 *   - **Caravans are not build rows.** A route-only unit open to this empire
 *     sets `caravans`, and the renderer prints the line to the trade sheet.
 *   - **A queued building keeps its row** (the user's A1 ruling, 2026-10-12),
 *     the current build included, marked with its place in the queue and
 *     priced in full. Its build button is not pressable, because a second copy
 *     in one queue is refused; its price is, so the current build can be bought
 *     in one press.
 *   - **No retired row prints anywhere.**
 *
 * And since batch UX7, the user's rulings of 2026-10-12 on shortening the list:
 *   - **A row this town can never build or buy is hidden**: a ship inland, a
 *     withdrawn unit (`unitRowShown`), a building whose site this town will
 *     never have or that already stands elsewhere in the realm
 *     (`buildingNeverHere`), and a piece only a card or another realm's leader
 *     opens, while it is not open to this empire.
 *   - **A row blocked for a reason the player can fix folds into "Not yet"**
 *     with that reason (`BuildListShelf.notYet`). A row that can still be
 *     bought (a price that is not a dash) stays in the list whatever its build
 *     says, because the price is a way to have it now.
 *
 * `locked` is the panel's own lock (an ended turn, or a puppet). It greys the
 * build buttons only. A price's look is the reducer's answer either way; when
 * the turn has ended, the renderer greys a pressable price itself.
 */
export function buildListModel(
  state: GameState,
  city: City,
  seat: number,
  tab: AddTab,
  locked: boolean,
): BuildListShelf[] {
  const shelves: BuildListShelf[] = [];

  /** A row and, when it cannot be used, why. `file` decides where it goes. */
  interface Entry {
    row: BuildListRow;
    reason: NotYetReason | null;
  }

  /** The cells a row gets: one per bank that sells it, gold first. */
  const priced = (item: PurchasableItem): BuildListCell[] => {
    const cells: BuildListCell[] = [];
    for (const bank of BANKS) {
      const look = purchaseLook(state, seat, city.id, item, bank);
      if (look !== null) cells.push({ look, place: null });
    }
    return cells;
  };

  /** The first dash's sentence, for a row whose price is the only thing it offers. */
  const dashReason = (cells: readonly BuildListCell[]): NotYetReason | null => {
    for (const cell of cells) {
      if (cell.look.look === 'none') return { kind: 'text', text: cell.look.refusal };
    }
    return null;
  };

  /**
   * A thing bought and never built, priced in `bank`, or `null` when there is
   * no such row to print. Never once the game has withdrawn it, never while no
   * technology can reach it, and (batch UX7) never while it is a piece only a
   * card or a leader opens and nothing has opened it for this empire: that is
   * a row this town cannot fix from here, as a technology-locked build row is.
   * One a technology or a building in this town would open folds into "Not
   * yet", with the purchase gate's sentence.
   */
  const offerRow = (id: UnitTypeId, bank: PurchaseCurrency): Entry | null => {
    const def = unitDef(id);
    if (def.awaitsTech === true) return null;
    if (def.retired === true) return null;
    const item: PurchasableItem = { kind: 'unit', id };
    if (!isPurchaseOnly(item)) return null;
    if (def.purchase?.currency !== bank) return null;
    // A piece a card opens early that a technology also opens (the Apostle,
    // which Scholasticism opens before Theology) is not "only a card's": it
    // stays in the list and folds into "Not yet" until either one opens it.
    const onlyByCard = def.unlockedByCard === true && gatingTech('unit', id) === null;
    if ((onlyByCard || def.unlockedByLeader === true) && !isUnlocked(state, seat, 'unit', id)) {
      return null;
    }
    const cells = priced(item);
    if (cells.length === 0) return null;
    const row: OfferListRow = { kind: 'offer', id, name: def.name, verb: purchaseVerb(item), cells };
    const tech = gatingTech('unit', id);
    const building = def.purchase?.building;
    const waits =
      (tech !== null && !hasTech(state, seat, tech)) ||
      (building !== undefined && !city.buildings.includes(building));
    return { row, reason: waits ? dashReason(cells) : null };
  };

  /**
   * Files a shelf: the rows the town can use, the rows that fold away, and
   * where each refused price's reason is said. A row with a reason folds unless
   * one of its prices can be pressed or is only short of the bank. A dash whose
   * reason the row already prints (its own build refusal, which the purchase
   * gate shares) adds nothing: the reason is on screen once.
   */
  const file = (shelf: ListShelf, word: string, entries: readonly Entry[], caravans: boolean): void => {
    const rows: BuildListRow[] = [];
    const notYet: NotYetRow[] = [];
    for (const { row, reason } of entries) {
      const buyable = row.cells.some((cell) => cell.look.look !== 'none');
      if (reason !== null && !buyable) notYet.push({ row, reason });
      else rows.push(row);
    }
    if (rows.length === 0 && notYet.length === 0 && !caravans) return;
    const refusals: RefusalEntry<BuildListCell>[] = [];
    for (const row of rows) {
      const printed =
        row.kind === 'unit' || (row.kind === 'building' && !row.boughtOnly) ? row.blocked : null;
      for (const cell of row.cells) {
        if (cell.look.look !== 'none') continue;
        if (cell.look.refusal === printed) continue;
        refusals.push({ key: cell, name: row.name, refusal: cell.look.refusal });
      }
    }
    const plan = planRefusals(refusals);
    for (const entry of refusals) entry.key.place = plan.places.get(entry.key) ?? null;
    shelves.push({ shelf, word, rows, notYet, refusals: plan.head, caravans });
  };

  const shelfWord = (shelf: AddShelf): string =>
    ADD_SHELVES.find((entry) => entry.shelf === shelf)?.word ?? '';

  if (shelfShows(tab, 'unit')) {
    const entries: Entry[] = [];
    let caravans = false;
    for (const id of UNIT_TYPE_IDS) {
      if (!unitRowShown(state, city, id)) continue;
      // A caravan is hired on the trade sheet, never queued: one line stands
      // for every caravan type open to the empire.
      if (unitDef(id).routeOnly === true) {
        caravans = true;
        continue;
      }
      if (!offeredInBuildList(id)) continue;
      const gate = unitRowGate(state, city, id);
      const row: UnitListRow = {
        kind: 'unit',
        id,
        name: unitDef(id).name,
        blocked: gate.blocked,
        wantsResource: gate.wantsResource,
        tooSmall: gate.tooSmall,
        enabled: !locked && !gate.tooSmall && gate.blocked === null,
        cells: priced({ kind: 'unit', id }),
      };
      entries.push({ row, reason: unitNotYet(city, row) });
    }
    // The things bought with gold and never built, at the foot of the units.
    for (const id of UNIT_TYPE_IDS) {
      const entry = offerRow(id, 'gold');
      if (entry !== null) entries.push(entry);
    }
    file('unit', shelfWord('unit'), entries, caravans);
  }

  // One pass per shelf rather than one pass with a sort inside it, because the
  // All tab prints buildings and wonders as two groups.
  for (const shelf of ['building', 'wonder'] as const) {
    if (!shelfShows(tab, shelf)) continue;
    const entries: Entry[] = [];
    for (const id of BUILDING_IDS) {
      // Which shelf the row belongs on is the simulation's own sorter.
      if (queueCategory({ kind: 'building', id }) !== shelf) continue;
      // Hidden outright, not greyed (user, 2026-08-30): a building no
      // technology can reach yet, one the fewer-things cut withdrew, one that
      // only arrives as a gift, and a wonder somebody already raised.
      if (buildingDef(id).awaitsTech === true) continue;
      if (buildingDef(id).retired === true) continue;
      if (buildingDef(id).grantedOnly === true) continue;
      if (isWonder(id) && wonderClaim(state, id) !== undefined) continue;
      if (city.buildings.includes(id)) continue;
      if (!isUnlocked(state, city.ownerId, 'building', id)) continue;
      // And, since batch UX7, a building this town can never raise.
      if (buildingNeverHere(state, city, id)) continue;
      const at = city.queue.findIndex((item) => item.kind === 'building' && item.id === id);
      // The reducer's own sentence, and the only refusal a building row prints.
      // The town is handed over so the wonder clause does not fire on the town
      // legitimately building it.
      const blocked = buildError(state, city.ownerId, 'building', id, city);
      const boughtOnly = isPurchaseOnly({ kind: 'building', id });
      const cells = priced({ kind: 'building', id });
      entries.push({
        row: {
          kind: 'building',
          id,
          name: buildingDef(id).name,
          wonder: isWonder(id),
          blocked,
          queued: at < 0 ? null : at + 1,
          boughtOnly,
          enabled: !locked && blocked === null && at < 0,
          cells,
        },
        // A thing only ever bought folds on its price, which is the only thing
        // it offers; anything else folds on the queue's refusal.
        reason: boughtOnly
          ? dashReason(cells)
          : blocked !== null && at < 0
            ? { kind: 'text', text: blocked }
            : null,
      });
    }
    file(shelf, shelfWord(shelf), entries, false);
  }

  // The projects, last, because they are what a town falls back on (Entry
  // XXVI). One already standing in the queue is hidden: a project never leaves
  // the queue, so a second copy could never be reached.
  if (shelfShows(tab, null)) {
    const standing = new Set(
      city.queue.filter((item) => item.kind === 'project').map((item) => item.id),
    );
    const entries: Entry[] = [];
    for (const id of PROJECT_IDS) {
      if (standing.has(id)) continue;
      if (!isUnlocked(state, city.ownerId, 'project', id)) continue;
      entries.push({
        row: {
          kind: 'project',
          id,
          name: projectDef(id).name,
          enabled: !locked && buildError(state, city.ownerId, 'project', id, city) === null,
          cells: [],
        },
        reason: null,
      });
    }
    file(null, shelfWord(null), entries, false);
  }

  if (shelfShows(tab, 'faith')) {
    const entries: Entry[] = [];
    for (const id of UNIT_TYPE_IDS) {
      const entry = offerRow(id, 'faith');
      if (entry !== null) entries.push(entry);
    }
    file('faith', FAITH_SHELF.word, entries, false);
  }

  return shelves;
}

/**
 * The queue a "Now" press sends (batch UX7): `item` at the front of the queue,
 * ahead of whatever is being built. A building already further back is moved
 * to the front rather than queued twice, which the queue would refuse. The
 * hammers banked toward the item it displaces stay with that item (schema 111),
 * so nothing is lost by changing one's mind.
 */
export function queueWithFront(queue: readonly QueueItem[], item: QueueItem): QueueItem[] {
  const next = queueDraft(queue);
  if (item.kind === 'building') {
    const at = next.findIndex((entry) => entry.kind === 'building' && entry.id === item.id);
    if (at >= 0) next.splice(at, 1);
  }
  next.unshift(queueDraft([item])[0]!);
  return next;
}

/**
 * The one yield a building row shows (batch UX7; the user's hover rule of
 * 2026-10-12: "Build rows keep one inline mark for the item's main yield"),
 * so buildings can be compared at a glance. The largest of the six voices of
 * `foldBuildingPreview` (what this town would gain today), rounded for the eye
 * as every yield on screen is; the first in the yields' own order on a tie.
 * `null` when it adds nothing, and the row then shows no mark. The full
 * preview is in the row's hover card.
 */
export function mainYieldOf(fold: CityYields): { key: CityYieldKey; amount: number } | null {
  let best: { key: CityYieldKey; amount: number } | null = null;
  for (const key of CITY_YIELD_KEYS) {
    const amount = roundYield(fold[key]);
    if (amount <= 0) continue;
    if (best === null || amount > best.amount) best = { key, amount };
  }
  return best;
}

/**
 * The banks whose prices are in view on these shelves, in `BANKS` order: what
 * the price column's heading names ("you have 437 gold").
 */
export function banksInView(shelves: readonly BuildListShelf[]): PurchaseCurrency[] {
  const seen = new Set<PurchaseCurrency>();
  for (const shelf of shelves) {
    for (const row of shelf.rows) {
      for (const cell of row.cells) seen.add(cell.look.bank);
    }
  }
  return BANKS.filter((bank) => seen.has(bank));
}

/**
 * What a **religious agent's** charges buy, at the simulation's own prices — or
 * nothing at all for the pieces whose charges are spadework.
 *
 * The card told a player that a prophet "builds 2 improvements, then is spent",
 * which was the *builder's* sentence read off a field the two pieces happen to
 * share. A prophet lays no farms: it founds a faith, deepens one, proclaims or
 * says a rite over the realm, and since the ruling of 2026-09-10
 * (`docs/flags.md` (bbbb)) those acts are not worth the same — which is exactly
 * the fact somebody deciding whether to spend a hundred faith on the piece is
 * deciding against.
 *
 * Every figure is `chargeCostWords`', so a retuned `rules.religion.prophetCosts`
 * moves this card without being touched; the *pairing* of the acts is pinned in
 * the tests, so the day the table stops agreeing with the sentence the pin says
 * so rather than the card.
 *
 * Asked of the roster's markers and never of a name, the discipline the whole
 * card keeps (see `unitCard`).
 */
function agentChargeNotes(def: UnitDef): string[] {
  if (def.prophesies === true) {
    return [
      `Founding a faith, or drawing a belief · ${chargeCostWords('foundReligion')}`,
      `A proclamation, or a rite said over the realm · ${chargeCostWords('proclaim')}`,
    ];
  }
  if (def.proclaims === true || def.purges === true) {
    return [`Each of its acts · ${chargeCostWords('proclaim')}`];
  }
  return [];
}

/**
 * Which standing-fact disclosures a player has opened, by label.
 *
 * `addTab`'s neighbour and its twin in every way: module state, out of the
 * save, per sitting. It exists because the panel rebuilds its whole DOM on every
 * accepted command, and a `<details>` a player opened to read the defence ledger
 * would slam shut the moment they queued a warrior — which reads as the screen
 * fighting them rather than as a repaint.
 */
const openDisclosures = new Set<string>();
/**
 * The other half of the memory: which disclosures a player has **closed**.
 *
 * A shelf may ask to open by itself — the Rites do, the turn a rite becomes
 * sayable, because a closed shelf reading "Rites —" was how the user missed the
 * verb for a whole game (2026-09-06: "looks like there's no option to purchase
 * rites in cities"). A shelf that opens itself must also stay shut once the
 * player shuts it, or every repaint fights them; this set is that promise.
 */
const closedDisclosures = new Set<string>();

export interface CityPanelOptions {
  /** The element the panel lives in. Emptied and rebuilt on every render. */
  container: HTMLElement;
  getGame: () => Game;
  localPlayerId: () => number;
  /** The city to show, or null to show nothing. */
  getCity: () => City | null;
  onClose: () => void;
  /**
   * Opens another of the seat's towns in place of this one: the ‹ and › beside
   * the town's name (batch UX6). The page hands in `controls.setOpenCity`, the
   * one way a town is opened, so the camera frames the new town and buy mode is
   * put away exactly as when its banner is clicked. Optional for `setBuyMode`'s
   * reason: a panel built without it is still a panel, and simply draws no
   * arrows. The comma and period keys step towns from `controls.ts` either way.
   */
  onOpenCity?: (cityId: number) => void;
  /** Called after a command lands, so the rest of the page can catch up. */
  onChanged: () => void;
  /**
   * A command this panel sent, and what the reducer said.
   *
   * `main.ts` hands it `controls.reportCommand`, so a listener watching what the
   * player does hears the queue this screen sets — see `report`.
   */
  onCommitted?: (command: Command, result: CommandResult) => void;
  /**
   * Whether the board's Buy Tiles mode is up, and how to flip it.
   *
   * The mode itself lives in `controls.ts`, beside the click precedence it
   * changes; this panel only owns the button that arms it, exactly as the lens
   * menu owns rows for a lens the board draws. Optional so that a panel built
   * without a board — the tests do this — is still a panel.
   */
  isBuyMode?: () => boolean;
  setBuyMode?: (on: boolean) => void;
  /**
   * Opens the Trade screen, from the Routes row. Optional for `setBuyMode`'s
   * reason exactly: a panel built without one is still a panel, and the row
   * simply carries no button.
   *
   * The build list's caravan line opens it too (batch UX5): caravans are hired
   * on the trade sheet, so that line is a link there. Without this option the
   * line is plain words.
   */
  onOpenTrade?: () => void;
  /**
   * Whether the guide is switched on.
   *
   * Read for one sentence: the board caption ("a ringed hex is a tile this city
   * works") is an instruction, and an instruction that is on screen forever is
   * one nobody reads. It prints while the guide is up — a player being taught —
   * or while Buy Tiles is armed, which is the one mode whose whole point is
   * clicking hexes. Optional for `setBuyMode`'s reason exactly: a panel built
   * without a guide is still a panel, and it simply never has one to ask.
   */
  isTutorialActive?: () => boolean;
  /**
   * Asks the player before something that cannot be taken back, then runs it.
   *
   * The panel owns the *verb* and the page owns the *card* — `unitPanel.ts`'s
   * split with the halves the other way round, and for the same argument: the
   * confirm card is a surface `main.ts` mounts, and a panel built without one
   * (this suite does exactly that) must still be a panel whose buttons work. So
   * the default simply runs, and the page hands in the card.
   */
  askConfirm?: (request: ConfirmRequest, run: () => void) => void;
  /**
   * The rites this town could keep — `controls.riteOptions(cityId)`, already
   * carrying each row's blocker, its payoff and its price.
   *
   * Optional for `setBuyMode`'s reason exactly: a panel built without a board
   * (this suite does that) is still a panel, and simply carries no rites.
   */
  riteOptions?: (cityId: number) => RiteOption[];
  /** Performs one rite in this town — `controls.performRite`. */
  performRite?: (cityId: number, rite: RiteId) => void;
  /**
   * Opens the faith sheet's rites for every town, with this town's menu open
   * (batch UX9 builds that tab). The Faith card's link there (batch UX7).
   * Optional for `setBuyMode`'s reason: without it the card simply has no link.
   */
  onOpenRites?: (cityId: number) => void;
}

export interface CityPanel {
  render(): void;
}

/**
 * The same six voices, for a preview fold or one of its lines —
 * `foldBuildingPreview`'s `CityYields` and `BuildingPreviewLine` share every
 * numeric field, so one formatter reads both. Empty when nothing in it pays,
 * which is the house dash's cue at both call sites below.
 *
 * Pure and exported because a suite with no jsdom can still call a formatter
 * directly (`test/ui/cityPanel.test.ts`).
 */
export function previewFigures(entry: CityYields): string {
  const parts: string[] = [];
  for (const key of CITY_YIELD_KEYS) {
    // Rounded at the eye and never in the fold (batch X): a preview whose true
    // worth is four tenths of a beaker prints nothing rather than `+0.4🔬`.
    const value = roundYield(entry[key]);
    if (value === 0) continue;
    parts.push(`${value > 0 ? '+' : ''}${value}${YIELD_GLYPH[key]}`);
  }
  return parts.join(' ');
}

/**
 * "+6🔬", "+8🪙" — what one family's guildsmen pay, in the six voices.
 *
 * `previewFigures`' shape over a `SpecialistYieldLine`, which carries the same
 * numeric fields under the same names; a shared formatter would need a type
 * neither of them has, and the two are three lines each.
 */
export function specialistFigures(entry: SpecialistYieldLine): string {
  const parts: string[] = [];
  for (const key of CITY_YIELD_KEYS) {
    const value = roundYield(entry[key]);
    if (value === 0) continue;
    parts.push(`${value > 0 ? '+' : ''}${value}${YIELD_GLYPH[key]}`);
  }
  return parts.join(' ');
}

/** One family's reading on the Specialists row: "3 scholars +6🔬". */
export interface SpecialistRowEntry {
  family: SpecialistFamily;
  text: string;
}

/** The Specialists row, as parts. See `specialistRow`. */
export interface SpecialistRowParts {
  label: string;
  total: string;
  families: SpecialistRowEntry[];
}

/**
 * The Specialists row's parts, or `null` for a town with nobody in the trades —
 * which is the ruling's "ignorable" made a return value: the row is **absent**
 * until a guild exists, rather than present and saying zero.
 *
 * Parts rather than one string because the row lays each family out with a
 * control beside it, and parts rather than elements because this suite has no
 * jsdom (`previewLineText`'s reason exactly). Every figure is the simulation's:
 * `citySpecialistYields` is the same list `foldCity` folds and the panel's
 * ledger prints, so the row cannot name a number the chips above it do not.
 */
export function specialistRow(city: City): SpecialistRowParts | null {
  const lines = citySpecialistYields(city);
  if (lines.length === 0) return null;
  const families = lines.map((line): SpecialistRowEntry => {
    const figures = specialistFigures(line);
    return { family: line.family, text: figures ? `${line.source} ${figures}` : line.source };
  });
  return { label: 'Specialists', total: String(totalSpecialists(city)), families };
}

/** The whole row as one reading: "Specialists 6 · 3 scholars +6🔬 · 2 merchants +8🪙". */
export function specialistRowText(parts: SpecialistRowParts): string {
  return [`${parts.label} ${parts.total}`, ...parts.families.map((entry) => entry.text)].join(' · ');
}

/**
 * The hover behind the row: "Guild 12 / 60 · +6.8 renown a turn", and — only in
 * a town with people it cannot seat — a second line for the idle.
 *
 * Every figure is the `guilds` phase's own. `guildThreshold` is what it compares
 * the bar against, `cityGuildInflow` is the fold of what it banks, and the idle
 * figure is that fold's own line rather than a second multiplication — so the
 * bar a player watches is the bar the resolution fills.
 */
export function guildBarText(state: GameState, city: City): string {
  const idle = guildIdleLine(state, city);
  return (
    `Guild ${Math.floor(city.guildBasket)} / ${guildThreshold(city)} · ` +
    `+${figure(cityGuildInflow(state, city))} renown a turn` +
    (idle ? `\n${idle.source} · +${figure(idle.amount)} a turn` : '')
  );
}

/**
 * Why this Dismiss is greyed, or `null`.
 *
 * The simulation's own sentence (`dismissSpecialistError`) with the panel's one
 * addition in front of it — a finished seat, which is a fact about the *screen*
 * and not about the town, and is the same clause every other control on this
 * panel is greyed by. Everything else is the reducer's, so a disabled button
 * says exactly what the command would have said.
 */
export function dismissBlocker(
  state: GameState,
  playerId: number,
  city: City,
  family: SpecialistFamily,
  locked: boolean,
): string | null {
  if (locked) return `You have ended turn ${state.turn}`;
  return dismissSpecialistError(state, playerId, city, family);
}

/**
 * Why the focus pane is greyed, or `null` while it may be used.
 *
 * `dismissBlocker`'s shape with the two halves the other way round, and that is
 * deliberate: the sim's own sentence is asked **first**, because the panel's
 * `locked` is one flag covering two very different states (a finished seat and a
 * puppet) and a puppet told "you have ended turn 40" would be told the wrong
 * thing entirely. `citizenFocusError` names the puppet, so the hover says what
 * the reducer would have said.
 */
export function focusBlocker(
  state: GameState,
  playerId: number,
  city: City,
  locked: boolean,
): string | null {
  const refusal = citizenFocusError(state, playerId, city);
  if (refusal !== null) return refusal;
  return locked ? `You have ended turn ${state.turn}` : null;
}

/** The word on a focus segment — plain, sentence case, the player's own terms. */
export function focusLabel(focus: CitizenFocus): string {
  if (focus === 'default') return 'Default';
  if (focus === 'food') return 'Food';
  if (focus === 'production') return 'Production';
  return 'Gold';
}

/** What a focus segment's hover says: what pressing it would do to the town. */
export function focusHint(focus: CitizenFocus): string {
  if (focus === 'default') return 'Place citizens on the best hexes overall';
  if (focus === 'food') return 'Favour hexes that feed the town';
  if (focus === 'production') return 'Favour hexes that pay hammers';
  return 'Favour hexes that pay coin';
}

/**
 * One line of `explainBuildingPreview`'s breakdown, read exactly as the sim
 * labelled it: the building's own row, a card that woke, the ground that
 * changed, or the reconciliation line last. Never re-derived — the source and
 * the figures are both the sim's own.
 */
export function previewLineText(line: BuildingPreviewLine): string {
  const figures = previewFigures(line);
  return figures ? `${line.source} ${figures}` : line.source;
}

/**
 * "Walls 200 · Palisade +25" — the hover ledger behind the hit-point chip,
 * rule 5 for a town's toughness. `explainCityMaxHp`'s own fold (`cityMaxHp`)
 * is the number the chip shows; this is the breakdown that says why, first
 * line bare (the base, unsigned) and every wall after it in the signed voice.
 *
 * Pure and module-level, `previewLineText`'s reason exactly: a hover string
 * built off the sim's own list needs no jsdom to pin.
 */
export function maxHpLedger(city: City): string {
  return explainCityMaxHp(city)
    .map((line, index) =>
      index === 0 ? `${line.source} ${line.amount}` : `${line.source} ${signedFigure(line.amount)}`,
    )
    .join(' · ');
}

/**
 * Everything the town panel's unrest card says, read off the simulation, or
 * `null` for a town that is not in unrest (batch WC1, `docs/flags.md`
 * (rrrrrr) part 1: *"the town panel shows the bar, the reasons and the turns
 * left"*).
 *
 * Every figure is the simulation's own: the bar is the record's basket against
 * its target, the reasons are `explainPacification`'s lines and the rate is
 * their fold (rule 5), the turns are `pacificationTurnsLeft`, and the rebel
 * warning is `rebelTurnsLeft` set against those turns. A rebel is only warned
 * of when it would rise before the town settles, because the `unrest` phase
 * fills the basket first and a town pacified on the turn a rebel was due
 * raises none. A world with no wild seat raises no rebels, so it warns of none.
 *
 * Pure and module-level for `defenseRows`' reason: a suite with no jsdom can
 * read what the card says.
 */
export interface UnrestCardParts {
  /** Pacification banked, and what it must reach. */
  progress: number;
  target: number;
  /** What the town gains each turn — the fold of `reasons`. */
  rate: number;
  /** Turns until it settles at that rate, or `null` when it is not settling. */
  turns: number | null;
  /** One row per reason, in the simulation's order: "Garrison · Warrior", "+1". */
  reasons: { label: string; figure: string }[];
  /** A soldier of the owner stands in the town. */
  guarded: boolean;
  /**
   * Turns until the next rebel rises, when one will rise before the town
   * settles — or `null` when none will (a garrison, a town that settles
   * first, or a world with no wild).
   */
  rebelIn: number | null;
}

export function unrestCardParts(state: GameState, city: City): UnrestCardParts | null {
  const unrest = city.unrest;
  if (unrest === undefined) return null;
  const lines = explainPacification(state, city);
  const rate = foldPacification(lines);
  const turns = pacificationTurnsLeft(state, city);
  const guarded = unrestGarrison(state, city) !== null;
  const nextRebel = rebelTurnsLeft(city);
  const wild = barbarianPlayer(state) !== undefined;
  const rebelIn =
    guarded || !wild || nextRebel === null || (turns !== null && nextRebel >= turns)
      ? null
      : nextRebel;
  return {
    progress: unrest.progress,
    target: unrest.target,
    rate,
    turns,
    reasons: lines.map((line) => ({ label: line.source, figure: signedFigure(line.amount) })),
    guarded,
    rebelIn,
  };
}

/**
 * One row of the defence ledger: what it is, what it is worth.
 *
 * `amount` is the same number `figures` prints, kept as a number so the
 * disclosure's summary ("Defence · 21") can be the **fold of this list** rather
 * than a total computed beside it — rule 5's shape, one grade down from a yield.
 * Nothing parses the string back into a number.
 */
export interface DefenseRow {
  label: string;
  figures: string;
  amount: number;
}

/**
 * What this town defends with, line by line: the garrison first — "Defends
 * with · Swordsman" over the strongest unit its owner could train right now,
 * `explainCityStrength`'s own words with "Garrison strength" reread as
 * "Defends with" — then every wall and every card that adds to the same
 * fight, each in its own row so a palisade is never folded into a number with
 * no reason beside it (rule 5). The garrison figure is the fold of
 * `explainCityStrength` alone; the walls and cards below it are what
 * `planCombat` adds on top when somebody actually attacks, so the two halves
 * read the same total the forecast card would.
 */
export function defenseRows(state: GameState, city: City): DefenseRow[] {
  const rows: DefenseRow[] = [];
  const strengthLines = explainCityStrength(state, city);
  strengthLines.forEach((entry, index) => {
    const label =
      index === 0 ? entry.source.replace('Garrison strength', 'Defends with') : entry.source;
    rows.push({ label, figures: String(entry.amount), amount: entry.amount });
  });
  for (const entry of buildingCityStat(city, 'defense')) {
    rows.push({ label: entry.source, figures: signedFigure(entry.amount), amount: entry.amount });
  }
  for (const entry of cardCityStat(state, city, 'defense')) {
    rows.push({ label: entry.source, figures: signedFigure(entry.amount), amount: entry.amount });
  }
  return rows;
}

/** The defence ledger's fold — the figure the disclosure's summary carries. */
export function defenseTotal(rows: readonly DefenseRow[]): number {
  let total = 0;
  for (const row of rows) total += row.amount;
  return total;
}

// --- the town at a glance (batch UX6) ----------------------------------------

/** One row of a yield chip's list. See `chipLedgerRows`. */
export interface ChipLedgerRow {
  /** The simulation's own label, or "Worked land (8 hexes)" for the hexes the town works. */
  label: string;
  /** What the row adds to the chip, exactly. The chip is the fold of the rows. */
  amount: number;
  /** A percentage row's own percentage, printed beside its label; `null` for every other row. */
  percent: number | null;
  /**
   * Which part of `docs/yields.md` the row comes from: `flat` for steps 1 to 10,
   * `percent` for one percentage of the two stages (step 12), `gate` for the
   * unrest gate (step 13), `moved` for the food surplus a card moves into
   * production (step 14), and `unaccounted` for the canary
   * (`UNACCOUNTED_SOURCE`).
   */
  kind: 'flat' | 'percent' | 'gate' | 'moved' | 'unaccounted';
}

/** One chip's whole list: the rows, and the chip they add up to. */
export interface ChipLedger {
  key: CityYieldKey;
  /** The chip itself: `foldCity` toward what the town is building. */
  total: number;
  rows: ChipLedgerRow[];
}

/** The id of the chips' card, which each chip names as the thing it controls. */
const CHIP_CARD_ID = 'city-chip-card';

/** The label of the one row the worked hexes are folded into. */
export function workedLandLabel(hexes: number): string {
  return `Worked land (${hexes} ${hexes === 1 ? 'hex' : 'hexes'})`;
}

/**
 * The canary's label. A chip whose rows do not add up to it gets one more row
 * carrying the difference, so the list still sums to the chip and the screen
 * admits the gap instead of hiding it. The core test asserts it never appears.
 */
export const UNACCOUNTED_SOURCE = 'Not accounted for';

/**
 * **One yield chip's complete list** (batch UX6): everything the chip adds up
 * from, in the order the simulation adds it (`docs/yields.md`), so the rows sum
 * to the chip (rule 5).
 *
 * - **The town centre** first: step 1's two lines under the simulation's own
 *   labels ("City centre" is the town's hex, "The town itself" is what a
 *   settlement makes by being one).
 * - **The worked land**: step 2 folded into one row, "Worked land (8 hexes)".
 *   Each hex's own breakdown is the hover card over that hex. A card's line
 *   lifted out of a hex keeps a row of its own, summed over the hexes it pays on.
 * - **This yield's other lines**, steps 3 to 10, one row each, in order.
 * - **The percentages**, step 12: one row per percentage, the city stage's
 *   first, then the empire's, each with what it adds. Within a stage the
 *   percentages add (Entry XVII), so each one's share is exact: the stage's base
 *   times its own percentage. The city stage's base is the flats; the empire
 *   stage's base is the flats after the city stage, worked out with
 *   `applyStages`, the simulation's one implementation of that arithmetic. A
 *   stage prints its parts and never its sum (the user, 2026-08-27).
 * - **The unrest gate**, step 13: a town in unrest makes none of some voices,
 *   so the row takes away everything above it.
 * - **The surplus moved**, step 14, last, on production alone: the food surplus
 *   a card moves into production (The Laws of Lord Shang), one row.
 *
 * Every figure comes from the simulation: the lines are `readCity`'s, the
 * percentages are `quote.percents` and `productionModifiers` toward the front
 * of the queue, the stage sums are `foldCityStages`, and the chip is
 * `foldCity`. If the rows ever fail to add up to the chip, a last row says so
 * (`UNACCOUNTED_SOURCE`) rather than letting the list quietly disagree with it.
 *
 * Pure, so the suite can check without a document that every chip's list adds
 * up to the chip (`test/ui/cityModifiers.test.ts`).
 */
export function chipLedgerRows(
  state: GameState,
  city: City,
  quote: CityReading,
  key: CityYieldKey,
): ChipLedger {
  const front = city.queue[0];
  const folded = foldCity(state, city, [], front, quote);
  const total = folded[key];
  const rows: ChipLedgerRow[] = [];
  const flat = (label: string, amount: number): void => {
    if (amount !== 0) rows.push({ label, amount, percent: null, kind: 'flat' });
  };

  // 1 — the centre.
  for (const line of quote.lines) if (line.step === 1) flat(line.source, line[key]);

  // 2 — the worked hexes, and the cards' lines lifted out of them.
  let land = 0;
  let hexes = 0;
  const lifted: { source: string; amount: number; hexes: number }[] = [];
  for (const line of quote.lines) {
    if (line.step !== 2) continue;
    if (line.card === undefined) {
      land += line[key];
      hexes += 1;
      continue;
    }
    const seen = lifted.find((entry) => entry.source === line.source);
    if (seen === undefined) {
      lifted.push({ source: line.source, amount: line[key], hexes: 1 });
    } else {
      seen.amount += line[key];
      seen.hexes += 1;
    }
  }
  flat(workedLandLabel(hexes), land);
  for (const entry of lifted) {
    flat(entry.hexes > 1 ? `${entry.source} (${entry.hexes} hexes)` : entry.source, entry.amount);
  }

  // 3 to 10 — everything else that adds.
  for (const line of quote.lines) if (line.step > 2) flat(line.source, line[key]);

  // 12 — the two stages, one row per percentage.
  const flats = quote.flats[key];
  const sums = foldCityStages(state, city, front, [], quote.percents)[key];
  const empireBase = applyStages(flats, { city: sums.city, empire: 0 });
  for (const source of chargedSources(state, city, quote, key, 'city', sums)) {
    pushShare(rows, source, flats);
  }
  for (const source of chargedSources(state, city, quote, key, 'empire', sums)) {
    pushShare(rows, source, empireBase);
  }

  // 13 — the unrest gate.
  if (explainUnrestGate(city).some((gate) => gate.yield === key)) {
    const running = sumOfRows(rows);
    if (running !== 0) {
      rows.push({ label: UNREST_SOURCE, amount: -running, percent: null, kind: 'gate' });
    }
  }
  // 13, second half — a rival's siege stops the town's work on the Opus
  // (Circumvallation, Dominion batch D14). The row names the besieger's card.
  for (const gate of explainOpusGate(state, city, front)) {
    if (gate.yield !== key) continue;
    const running = sumOfRows(rows);
    if (running !== 0) rows.push({ label: gate.source, amount: -running, percent: null, kind: 'gate' });
  }

  // 14 — the food surplus a card moves into production. Its amount reads the
  // town's food, which this step does not change, so the folded total serves.
  if (key === 'production') {
    for (const moved of explainSurplusMoved(state, city, folded, front)) {
      rows.push({ label: moved.source, amount: moved.amount, percent: null, kind: 'moved' });
    }
  }

  const residue = total - sumOfRows(rows);
  if (Math.abs(residue) > 1e-9) {
    rows.push({ label: UNACCOUNTED_SOURCE, amount: residue, percent: null, kind: 'unaccounted' });
  }
  return { key, total, rows };
}

/** One percentage on one voice of a town, named as a chip's list names it. */
interface StagePercent {
  label: string;
  percent: number;
  /** The town's percentage line it stands for; absent for the hammers behind a build. */
  line?: CityYieldPercent;
}

/**
 * The percentages one stage actually charged on one voice of a town.
 *
 * Nearly always every line `stageSources` lists. But `foldCityStages` may leave
 * a line out for a pair (town, item): The Great Warring Tribes lifts
 * authority's malus from production toward units. When the listed lines do not
 * add up to the stage's sum, `foldCityStages` itself is asked which line it
 * left out: a line whose removal leaves the sum where it was was never in it.
 * So the rule stays the simulation's, and the list prints only what was charged.
 */
function chargedSources(
  state: GameState,
  city: City,
  quote: CityReading,
  key: CityYieldKey,
  stage: ModifierStage,
  sums: { city: number; empire: number },
): StagePercent[] {
  const sources = stageSources(state, city, quote, key, stage);
  let listed = 0;
  for (const source of sources) listed += source.percent;
  if (listed === sums[stage]) return sources;
  const front = city.queue[0];
  return sources.filter((source) => {
    const line = source.line;
    if (line === undefined) return true;
    const without = quote.percents.filter((other) => other !== line);
    return foldCityStages(state, city, front, [], without)[key][stage] !== sums[stage];
  });
}

/**
 * The percentages one stage applies to one voice of a town: on production, the
 * hammers behind the front of the queue that join this stage first (as
 * `foldCityStages` adds them), then `quote.percents`' lines for that stage, in
 * their own order.
 */
function stageSources(
  state: GameState,
  city: City,
  quote: CityReading,
  key: CityYieldKey,
  stage: ModifierStage,
): StagePercent[] {
  const list: StagePercent[] = [];
  if (key === 'production') {
    // Each modifier in the stage it joins: the city stage for nearly all of
    // them, the empire stage for a card row that names it (Dominion batch D7,
    // The Marian Reforms).
    for (const modifier of productionModifiers(state, city, city.queue[0])) {
      if (modifier.stage !== stage || modifier.percent === 0) continue;
      list.push({ label: modifier.source, percent: modifier.percent });
    }
  }
  for (const line of quote.percents) {
    if (line.yield !== key || line.stage !== stage || line.percent === 0) continue;
    list.push({ label: percentLabel(state, city, line), percent: line.percent, line });
  }
  return list;
}

/**
 * A percentage line's label. A meter's line also names the meter's standing
 * ("Happiness +6"), because the tier is earned by that figure and a player
 * looking at the percentage wants to know how far the meter is from the next
 * rung.
 */
function percentLabel(state: GameState, city: City, line: CityYieldPercent): string {
  if (line.meter === undefined) return line.source;
  const effect = meterEffects(state, city.ownerId).find(
    (entry) => entry.meter === line.meter && !entry.growth && entry.yields.length > 0,
  );
  return effect === undefined ? line.source : `${line.source} ${signedFigure(effect.value)}`;
}

/** One percentage's row: its share of the stage's base. Nothing is pushed for a share of nothing. */
function pushShare(rows: ChipLedgerRow[], source: StagePercent, base: number): void {
  const amount = (base * source.percent) / 100;
  if (amount !== 0) {
    rows.push({ label: source.label, amount, percent: source.percent, kind: 'percent' });
  }
}

/** The fold of a chip's rows, in their own order. */
function sumOfRows(rows: readonly ChipLedgerRow[]): number {
  let total = 0;
  for (const row of rows) total += row.amount;
  return total;
}

/** Where on the city screen a short-of chip's fix is. The chip is a link there. */
export type ShortOfTarget = 'buildList' | 'focus' | 'growth' | 'defence' | 'unrest' | 'supply';

/** One thing a town is short of, as a chip in the band (batch UX6). */
export interface ShortOfChip {
  id: 'unrest' | 'siege' | 'starving' | 'idle' | 'unhappy' | 'resource';
  /** The chip's words: "Starving", "No Iron spare". */
  label: string;
  /** A figure beside the words, set in the tabular mono, or `null`. */
  figure: string | null;
  /** What the chip means, as a sentence: its spoken label and its hover. */
  why: string;
  /** Where on this screen the town's problem is fixed. */
  target: ShortOfTarget;
}

/**
 * **What this town is short of** (batch UX6; `docs/plans/city-screen-audit.md`,
 * problem 4): one chip per problem that is true, and nothing at all for a town
 * that is fine. Each chip is a link to the part of the screen where the problem
 * is fixed.
 *
 * In order of how badly they stop the town:
 * - **In unrest** (with the turns left): taken by force and not yet pacified,
 *   so it makes no production, science or culture (`inUnrest`). The unrest card.
 * - **Under siege**: every neighbouring hex is denied (`underSiege`). The
 *   Defence ledger.
 * - **Starving**: the food surplus is below nothing (`growthSurplus`, the same
 *   figure the Growth row prints). The Focus pane.
 * - **Idle**: nothing in the queue. The build list. A puppet chooses for
 *   itself, so it is never told it is idle.
 * - **Unhappy**: the empire's happiness is below nothing, which slows every
 *   town's growth (`meterEffects`). The Growth row, where the slowing shows.
 * - **No Iron spare** (one chip a resource): the empire holds copies and every
 *   one is spoken for, and a build row in this town needs one. The Supply strip
 *   at the head of the build list (batch UX7), where the count is in
 *   vermilion.
 *
 * Every condition is the simulation's own reading. Pure, so the suite can check
 * each chip without a document.
 */
export function shortOfChips(state: GameState, city: City, quote: CityReading): ShortOfChip[] {
  const chips: ShortOfChip[] = [];
  if (inUnrest(city)) {
    const turns = pacificationTurnsLeft(state, city);
    chips.push({
      id: 'unrest',
      label: 'In unrest',
      figure: turns === null ? null : turnsLabel(turns),
      why:
        'Taken by force and not yet pacified: it makes no production, science or culture, ' +
        'and its borders hold still.',
      target: 'unrest',
    });
  }
  if (underSiege(state, city, siegeField(state, city.ownerId))) {
    chips.push({
      id: 'siege',
      label: 'Under siege',
      figure: null,
      why:
        'Every neighbouring hex is denied to this town: it cannot heal and loses a little ' +
        'health each turn, but only an attack can take it.',
      target: 'defence',
    });
  }
  if (growthSurplus(state, city, foldCity(state, city, [], undefined, quote)) < 0) {
    chips.push({
      id: 'starving',
      label: 'Starving',
      figure: null,
      why: 'The town eats more food than it makes, and will shrink. Point its citizens at food.',
      target: 'focus',
    });
  }
  if (city.queue.length === 0 && city.puppet !== true) {
    chips.push({
      id: 'idle',
      label: 'Idle',
      figure: null,
      why: 'Nothing is being built here.',
      target: 'buildList',
    });
  }
  if (happinessOf(state, city.ownerId) < 0) {
    chips.push({
      id: 'unhappy',
      label: 'Unhappy',
      figure: null,
      why:
        'Your empire is unhappy, so every town grows more slowly. Luxuries and buildings ' +
        'that make people happy fix it.',
      target: 'growth',
    });
  }
  for (const count of strategicHoldings(state, city.ownerId)) {
    if (count.spare > 0) continue;
    const wanting = UNIT_TYPE_IDS.find((id) => {
      if (!unitRowShown(state, city, id) || !offeredInBuildList(id)) return false;
      const gate = unitRowGate(state, city, id);
      return gate.wantsResource && gate.missing.includes(count.id);
    });
    if (wanting === undefined) continue;
    chips.push({
      id: 'resource',
      label: `No ${count.name} spare`,
      figure: copiesFigure(count.spare, count.held),
      why:
        `${count.name}: ${copiesWords(count.spare, count.held)}. ` +
        `The ${unitDef(wanting).name} needs one.`,
      target: 'supply',
    });
  }
  return chips;
}

/** Where a town's people are: on land, in a trade, or idle. See `citizenLineText`. */
export interface CitizenParts {
  population: number;
  /** Citizens working a hex. */
  land: number;
  /** Citizens in a trade (the guilds' specialists). */
  specialists: number;
  /** The rest: citizens with nowhere to stand. */
  idle: number;
}

/**
 * Where this town's people are. The idle are the rest of the population once
 * the worked hexes and the specialists are counted, so the three parts always
 * add up to the town's size.
 */
export function citizenParts(city: City): CitizenParts {
  const land = city.workedTiles.length;
  const specialists = totalSpecialists(city);
  return {
    population: city.population,
    land,
    specialists,
    idle: Math.max(0, city.population - land - specialists),
  };
}

/**
 * "Citizens 11: 8 on land · 2 specialists · 1 idle" (batch UX6), which replaced
 * "8/11 working": the old line did not say where the other three were. A part
 * with nobody in it is left out, except the land.
 */
export function citizenLineText(parts: CitizenParts): string {
  const pieces = [`${parts.land} on land`];
  if (parts.specialists > 0) {
    pieces.push(`${parts.specialists} ${parts.specialists === 1 ? 'specialist' : 'specialists'}`);
  }
  if (parts.idle > 0) pieces.push(`${parts.idle} idle`);
  return `Citizens ${parts.population}: ${pieces.join(' · ')}`;
}

/**
 * Every town this seat holds, in founding order (`state.cities` order), puppets
 * included (the user's ruling, `docs/flags.md` (ssssss) 3: a puppet's screen is
 * where it is annexed or razed). The order ‹ › and the comma and period keys
 * step through.
 */
export function townsInOrder(state: GameState, seat: number): City[] {
  return state.cities.filter((city) => city.ownerId === seat);
}

/**
 * The town one step before (`-1`) or after (`1`) this one, or `null` when the
 * seat holds no other town.
 *
 * **The ends wrap**: after the last town comes the first again. Stepping is a
 * way to visit every town, and a step that stopped at the end would make the
 * player turn round and walk all the way back.
 */
export function steppedTownId(
  state: GameState,
  seat: number,
  fromId: number,
  step: -1 | 1,
): number | null {
  const towns = townsInOrder(state, seat);
  if (towns.length < 2) return null;
  const at = towns.findIndex((city) => city.id === fromId);
  if (at < 0) return towns[0]!.id;
  return towns[(at + step + towns.length) % towns.length]!.id;
}

export function createCityPanel(options: CityPanelOptions): CityPanel {
  const { container, getGame, localPlayerId, getCity, onClose, onChanged, onOpenTrade } =
    options;
  const isBuyMode = options.isBuyMode ?? ((): boolean => false);
  const isTutorialActive = options.isTutorialActive ?? ((): boolean => false);
  // No card handed in: the act happens on the click. See `askConfirm`.
  const askConfirm =
    options.askConfirm ?? ((_request: ConfirmRequest, run: () => void): void => run());
  const setBuyMode = options.setBuyMode ?? ((): void => {});
  // The town whose levy menu is open, if any. See `renderLevy`.
  let levyMenuOpenFor: number | null = null;

  /**
   * The last command this panel sent that the reducer refused, and when.
   *
   * The work rail prints its sentence as one line (`renderWorkRail`) until the
   * next accepted command or the next town. Before batch UX5 every refused
   * command here returned without a word, so a press that did nothing looked
   * exactly like a press that was never made.
   *
   * It is shown only while the world is at the revision it was refused at and
   * the same town is open. So an accepted command from anywhere, this panel or
   * the board, hides it by moving the revision, and opening another town hides
   * it by changing the town. `report` also forgets it on this panel's own
   * accepted commands, and `render` forgets it once another town is open, so
   * coming back to the town does not raise it again.
   */
  let refused: { cityId: number; revision: number; text: string } | null = null;

  /**
   * Every dispatch this panel makes leaves through here.
   *
   * The panel sends its own commands rather than going through the board's
   * funnel, so it reports its own — `controls.reportCommand`, the same seam
   * that funnel ends on (see its docblock for why reporting beats routing).
   * Answers the result so a call site stays one line.
   *
   * A refusal is kept for the work rail's line (`refused`), and the panel is
   * repainted to show it. Nothing in the state moved, so nothing else on the
   * page needs to repaint.
   */
  function report(command: Command, result: CommandResult): CommandResult {
    if (result.ok) {
      options.onCommitted?.(command, result);
      refused = null;
      return result;
    }
    refused = {
      cityId: 'cityId' in command ? command.cityId : -1,
      revision: getGame().state.revision,
      text: result.error,
    };
    render();
    return result;
  }

  /** Sends a queue and repaints. A refused command changes nothing at all. */
  function commit(city: City, queue: QueueItem[]): void {
    const command: Command = {
      type: 'setCityProduction',
      playerId: localPlayerId(),
      cityId: city.id,
      queue,
    };
    if (!report(command, dispatch(getGame(), command)).ok) return;
    onChanged();
  }

  /**
   * Sends a purchase and repaints. `commit`'s twin one bank over, and the same
   * contract: a refused command changes nothing at all, and the price that sent
   * it was only pressable because `purchaseError` said the reducer would take
   * it (`purchaseLook`).
   */
  function buy(city: City, item: PurchasableItem, currency: PurchaseCurrency): void {
    const command: Command = {
      type: 'purchaseItem',
      playerId: localPlayerId(),
      cityId: city.id,
      item,
      currency,
    };
    if (!report(command, dispatch(getGame(), command)).ok) return;
    onChanged();
  }

  /**
   * Sends a contribution and repaints. `buy`'s twin one verb over, and the same
   * contract: a refused command changes nothing at all, and the button that sent
   * it was only enabled because `contributeError` said the reducer would take
   * it.
   */
  function give(city: City, currency: PurchaseCurrency): void {
    const command: Command = {
      type: 'contribute',
      playerId: localPlayerId(),
      cityId: city.id,
      currency,
    };
    if (!report(command, dispatch(getGame(), command)).ok) return;
    onChanged();
  }

  /**
   * Sends `annexCity` or `razeCity` and repaints. `give`'s twin, and the same
   * contract: the button was only enabled because the gate said the reducer
   * would take it, and a refused command changes nothing at all.
   *
   * Both are the war ruling's (`docs/war-diplomacy.md`, 9b) and both are about
   * a town somebody *took*: a conquest arrives as a puppet, and these are the
   * only two things its captor may decide about it. Razing goes through the
   * confirm card — it cannot be taken back, and there is not even a piece left
   * to regret it over.
   */
  function decide(city: City, type: 'annexCity' | 'razeCity'): void {
    const command: Command = { type, playerId: localPlayerId(), cityId: city.id };
    if (!report(command, dispatch(getGame(), command)).ok) return;
    onChanged();
  }

  /**
   * The puppet block: what a seized town is, and the two decisions about it.
   *
   * Absent for every town that is not one, which is every town anybody founded
   * and every conquest already annexed — so the panel a player sees for their
   * own cities is byte-identical to the one before this shipped.
   *
   * The words are the ruling's said plainly and with no numbers in them (hard
   * rule 7): a puppet asks its captor for less, and it decides for itself what
   * to build. The *figures* are on the authority and happiness ledgers, where
   * every other figure of theirs is.
   */
  function renderPuppet(city: City): HTMLElement | null {
    if (city.puppet !== true) return null;
    if (city.ownerId !== localPlayerId()) return null;
    // A card in the work rail, wearing `city-built`'s prose voice — which is
    // what every named block on this screen has worn since before the mode.
    const box = element('div', 'city-card city-built city-puppet');
    box.append(element('h3', undefined, 'A conquered town'));
    box.append(
      element(
        'p',
        'hint',
        'This town is held rather than governed. It asks less of your authority and ' +
          'less of your people\u2019s patience, and it chooses for itself what to ' +
          'build. Annex it to govern it as your own \u2014 and to pay for it in full.',
      ),
    );
    const verbs = element('div', 'city-puppet-verbs');
    const annex = element('button', 'btn btn-second btn-tiny', 'Annex');
    (annex as HTMLButtonElement).type = 'button';
    const annexRefusal = annexCityError(getGame().state, localPlayerId(), city.id);
    if (annexRefusal !== null) {
      (annex as HTMLButtonElement).disabled = true;
    } else {
      noteOn(annex, 'Govern this town as one of your own. This cannot be undone.');
      annex.addEventListener('click', () => {
        askConfirm(
          {
            title: `Annex ${cityDisplayName(getGame().state, city)}?`,
            body:
              'It becomes an ordinary town of your empire: you set what it builds, ' +
              'and it costs your authority and your people what any of your cities does. ' +
              'This cannot be undone.',
            confirmLabel: 'Annex',
            cancelLabel: 'Leave it held',
          },
          () => decide(city, 'annexCity'),
        );
      });
    }
    verbs.append(annex);

    const raze = element('button', 'btn btn-quiet btn-tiny', 'Raze');
    (raze as HTMLButtonElement).type = 'button';
    const razeRefusal = razeCityError(getGame().state, localPlayerId(), city.id);
    if (razeRefusal !== null) {
      (raze as HTMLButtonElement).disabled = true;
    } else {
      noteOn(raze, 'Pull the town down. Its land goes back to nobody\u2019s.');
      raze.addEventListener('click', () => {
        askConfirm(
          {
            title: `Pull down ${cityDisplayName(getGame().state, city)}?`,
            body:
              'The town is gone at once and its people with it. The land around it ' +
              'goes back to nobody\u2019s, and what was built on the fields stays ' +
              'where it is. This cannot be undone.',
            confirmLabel: 'Raze',
            cancelLabel: 'Spare it',
          },
          () => decide(city, 'razeCity'),
        );
      });
    }
    verbs.append(raze);
    box.append(verbs);
    // A refused verb says why on a line, never only in a tooltip (batch UX7).
    for (const refusal of new Set([annexRefusal, razeRefusal])) {
      if (refusal !== null) box.append(refusalLineElement(refusal, 'row'));
    }
    return box;
  }

  /** A copy of the city's queue: the panel edits a draft, never the state. */
  function draft(city: City): QueueItem[] {
    return queueDraft(city.queue);
  }

  // --- the hover card ------------------------------------------------------

  /**
   * The note that comes up beside a build row. One card for the whole panel —
   * see `infoCard.ts` for why it is a note and not a control.
   *
   * The panel rebuilds its whole DOM on every render, which takes the anchor out
   * from under an open card without a `pointerleave` ever firing, so `render`
   * puts it away first thing.
   */
  const info = createInfoCard({ className: 'info-card' });

  /**
   * **The yield chips' card** (batch UX6): one card for the band's six chips. It
   * holds the list of the chip under the pointer or the keyboard's focus, or of
   * the chip a click pinned, and it stands over the work rail and never over the
   * board (`docs/plans/city-screen-iterations.md`, "Settled"): the board between
   * the rails is where citizens are moved, and a card over it would cover the
   * hexes the list is about.
   *
   * The panel's own element rather than an `infoCard`, because an info card is
   * a note that can never be pinned. It is rebuilt with the panel on every
   * render. `chipCard`, `chipLedgers` and `chipButtons` are the drawn card, the
   * lists the drawn chips were printed from, and the chips themselves; the
   * chips' handlers read them when they fire, so a handler left on a panel that
   * has since been rebuilt finds the new ones.
   */
  let chipCard: HTMLElement | null = null;
  let chipLedgers = new Map<CityYieldKey, ChipLedger>();
  let chipButtons = new Map<CityYieldKey, HTMLButtonElement>();
  /**
   * The chip a click pinned open, and the town it belongs to. View state, kept
   * out of the save. It is not in the render key, for the reason an open
   * disclosure is not: a click updates the drawn card in place, and every later
   * render draws the pin from here. Opening another town forgets it.
   */
  let pinnedChip: { cityId: number; key: CityYieldKey } | null = null;
  /**
   * Where each short-of chip points, collected while the panel draws: the build
   * list, the Focus pane, the Growth row, the Defence ledger, the unrest card,
   * and the build row of each unit a chip names. Emptied at the start of every
   * render, so a chip never points at an element that has been taken down.
   */
  let anchors = new Map<ShortOfTarget, HTMLElement>();

  /**
   * **The work rail's hover card** (batch UX7): what a row of the build list, a
   * queue row or the thing being built is, what it would add, and what it costs
   * to buy outright. The user's hover rule (2026-10-12): the "would add" figures
   * and the buy line are on hover, in a card over the right column, and never
   * inline or over the board.
   *
   * It stands over the work rail at the rail's width, in the half of the rail
   * the hovered row is not in, so it never covers the row it is about. A note
   * the pointer passes through, like the chips' card before it is pinned. The
   * panel's own element, rebuilt with the panel, rather than an `infoCard`,
   * which places itself beside its anchor and so over the board.
   */
  let rowCard: HTMLElement | null = null;
  /** The element whose card is showing, so a late `pointerleave` from another one is ignored. */
  let rowCardAnchor: HTMLElement | null = null;

  /**
   * Shows the work rail's card for `anchor` on pointer rest or focus, and hides
   * it after. `near` is for a short note on one of the rail's buttons (batch
   * UX7b): the card then stands just under the button, or just over it when
   * there is no room under, rather than in the other half of the rail.
   */
  function bindRowCard(anchor: HTMLElement, build: () => Node, near = false): void {
    // A tap is not a hover (`infoCard.ts`'s rule): touch is left alone.
    anchor.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'touch') showRowCard(anchor, build, near);
    });
    anchor.addEventListener('pointerleave', () => hideRowCard(anchor));
    anchor.addEventListener('focus', () => showRowCard(anchor, build, near));
    anchor.addEventListener('blur', () => hideRowCard(anchor));
  }

  function showRowCard(anchor: HTMLElement, build: () => Node, near = false): void {
    const card = rowCard;
    if (card === null) return;
    rowCardAnchor = anchor;
    card.replaceChildren(build());
    card.classList.toggle('is-note', near);
    const row = anchor.getBoundingClientRect();
    if (!near) {
      // The half of the rail the row is not in: a row in the upper half gets the
      // card in the lower half, and the other way round.
      const rail = anchor.closest('.city-rail') ?? anchor;
      const frame = rail.getBoundingClientRect();
      card.style.top = '';
      card.style.bottom = '';
      card.classList.toggle('is-low', row.top + row.height / 2 < frame.top + frame.height / 2);
      card.hidden = false;
      return;
    }
    // A note: measured before it is seen, then placed against its button inside
    // the frame the card is positioned in (`.city-body`), under the button when
    // it fits there and over it when it does not.
    card.classList.remove('is-low');
    card.style.visibility = 'hidden';
    card.hidden = false;
    const frame = (card.offsetParent ?? card.parentElement ?? card).getBoundingClientRect();
    const size = card.getBoundingClientRect();
    const under = row.bottom - frame.top + 4;
    const over = row.top - frame.top - 4 - size.height;
    card.style.top = `${under + size.height <= frame.height || over < 0 ? under : over}px`;
    card.style.bottom = 'auto';
    card.style.visibility = '';
  }

  /**
   * A short note on one of the work rail's own buttons (×, ↑, ↓, "Now", the
   * contribute buttons), raised in the rail's card just beside the button
   * rather than in the hover card beside the rail, which opened over the board
   * (batch UX7b). `noteOn`'s twin otherwise.
   */
  function railNoteOn(anchor: HTMLElement, text: string, describe = true): void {
    if (describe) anchor.setAttribute('aria-description', text.split('\n').join('. '));
    bindRowCard(anchor, () => noteNode(text), true);
  }

  /** A note's lines, as the hover cards print them. */
  function noteNode(text: string): HTMLElement {
    const box = element('div', 'info-card-note');
    for (const part of text.split('\n')) box.append(element('p', undefined, part));
    return box;
  }

  /** Hides the card, or, given an anchor, hides it only if it is that anchor's. */
  function hideRowCard(anchor?: HTMLElement): void {
    if (anchor !== undefined && anchor !== rowCardAnchor) return;
    rowCardAnchor = null;
    if (rowCard === null) return;
    rowCard.hidden = true;
    rowCard.replaceChildren();
  }

  /** A figure chip: the number large, its name small and quiet beneath it. */
  function stat(label: string, value: string): HTMLElement {
    const box = element('div', 'info-card-stat');
    box.append(element('span', 'info-card-stat-value', value));
    box.append(element('span', 'info-card-stat-label', label));
    return box;
  }

  /**
   * One line of a hover card's note list.
   *
   * `wanting` is the caller's answer to "is this line a *lack*" — the vermilion
   * italic of `.wanting`, one class for every surface that tells a player they
   * are missing a prerequisite (the user, 2026-09-08). A note is a fact about
   * the row by default and a warning only where this town falls short of it,
   * which is the tile cell's rule and not a property of the data.
   */
  function note(text: string, wanting = false): HTMLElement {
    return element('li', wanting ? 'wanting' : undefined, text);
  }

  /**
   * The bill beside the price: what this row will cost the treasury every turn
   * once it is standing (Entry XLI).
   *
   * A **third figure** in the same row as the hammers and the estimate, because
   * it is the same kind of fact — a price — and the whole point of showing it
   * before the build rather than after is that "what does this cost" has had two
   * answers since maintenance landed and a queue that only quoted the first was
   * the interface hiding half the decision.
   *
   * Signed negative, because it is a bill. `null` for everything that pays
   * nothing — a settler, a worker, a caravan, a scout, a granary, a wonder — for
   * the reason the fighting numbers are omitted from a settler's card: a row of
   * zeroes reads as a statistic rather than as "this one is free to keep".
   */
  function upkeepFigure(gold: number): HTMLElement | null {
    if (gold <= 0) return null;
    return element(
      'span',
      'info-card-upkeep',
      `${signedFigure(-gold)}${YIELD_GLYPH.gold} a turn`,
    );
  }

  /**
   * What a unit *is*, entirely out of `data/units.json`.
   *
   * Every line here is the presence of a field rather than a comparison against
   * an id — `foundsCity`, `charges`, `requiresResource`, the `rangedStrength`
   * pair — which is the discipline `unitData.ts` asks for in so many words: a
   * designer who adds a second settler-like unit adds one data row and this card
   * describes it correctly without being touched. Nothing here computes: the
   * price is `unitProductionCost`'s answer and the estimate is `turnsToBuild`'s.
   *
   * `modelClass` does double duty as the unit's *role* **for a soldier and
   * nowhere else**. It is the roster's silhouette class (see the field's
   * docblock) — melee, ranged, siege, mounted, scout — which for a fighting row
   * is exactly the shorthand a player uses for what a unit is for. Off the
   * military rows it is only a sculpt: the augur, the prophet and the caravan
   * all stand on the worker's body, and printing it there said a caravan was a
   * worker. So the head prints it for `military` and prints the category alone
   * otherwise — see the line itself.
   */
  function unitCard(city: City, id: UnitTypeId, index: number, built = true): HTMLElement {
    const { state } = getGame();
    const def = unitDef(id);
    const box = element('div');

    const head = element('div', 'info-card-head');
    head.append(element('span', 'info-card-name', def.name));
    // "military · melee", "civilian", "trader". The silhouette class is printed
    // **only for a soldier**, and that is a correction rather than a trim:
    // `modelClass` is the roster's *sculpt* grouping, and it says the unit's role
    // truthfully for the fighting rows (melee, ranged, siege, mounted, scout) and
    // untruthfully for every other one — an augur, a prophet and a caravan all
    // stand on the worker's body, and "trader · worker" told a player their
    // caravan was a worker. For those the category is the whole honest answer.
    head.append(
      element(
        'span',
        'info-card-kind',
        def.category === 'military' ? `${def.category} · ${def.modelClass}` : def.category,
      ),
    );
    box.append(head);

    const figures = element('div', 'info-card-figures');
    // A thing only ever bought has no hammers or turns to quote (batch UX7):
    // its price is the buy line under the card.
    if (built) {
      figures.append(
        element(
          'span',
          'info-card-cost',
          `${unitProductionCost(state, city.ownerId, id)}${HAMMER}`,
        ),
      );
      figures.append(
        element(
          'span',
          'info-card-turns',
          turnsLabel(turnsToBuild(state, city, { kind: 'unit', id }, index)),
        ),
      );
    }
    // What keeping it will cost, off the roster's own reader — the *type's*
    // figure, because there is no piece yet to ask about.
    const unitBill = upkeepFigure(unitUpkeep(id));
    if (unitBill) figures.append(unitBill);
    box.append(figures);

    const stats = element('div', 'info-card-stats');
    // Fighting numbers only for things that fight, exactly as the unit panel's
    // sheet does it: a settler carrying a strength of 0 reads as a statistic
    // rather than as "this is not a soldier".
    if (isCombatant(def)) stats.append(stat('Strength', String(def.combatStrength)));
    if (isRanged(def)) stats.append(stat('Ranged', `${def.rangedStrength} · ${def.range}⌖`));
    stats.append(stat('Moves', String(def.movement)));
    stats.append(stat('Sight', String(def.sight)));
    box.append(stats);

    const notes = element('ul', 'info-card-notes');
    if (def.foundsCity) notes.append(note('Founds a city, and is spent doing it'));
    if (def.charges !== undefined) {
      const clergy = agentChargeNotes(def);
      if (clergy.length === 0) {
        notes.append(note(`Builds ${def.charges} improvements, then is spent`));
      } else {
        notes.append(note(`Carries ${def.charges} charges`));
        for (const line of clergy) notes.append(note(line));
      }
    }
    // The one note that is about *moving* rather than about building or
    // fighting, and it earns its line because the Moves figure above cannot say
    // it: 3 moves through a wood is one hex for a warrior and three for a scout.
    if (def.ignoresTerrainCost) {
      notes.append(note(`Ignores terrain · every hex costs 1 of its ${def.movement} moves`));
    }
    if (def.haltsGrowth) notes.append(note('The city banks no food while this is at the front'));
    // **The two notes that are prerequisites wear the wanting voice — but only
    // when this town is actually short of them.** The card is a description of
    // the row, so "Needs a city of 3" is a fact to a capital of six and a lack
    // to a hamlet of two; the tile cell's rule exactly (`.tile-requires` soft,
    // `.is-wanting` vermilion), asked of the town the card is open over rather
    // than declared on the row. `hasResource` is the reducer's own reading, the
    // same one the greyed buildable row two functions down asks.
    if (def.minCityPop > 0) {
      notes.append(
        note(`Needs a city of ${def.minCityPop}`, city.population < def.minCityPop),
      );
    }
    const wants = requiredResourcesOf(def);
    if (wants.length > 0) {
      // The one note that is built rather than written: the resource's mark is
      // an element carrying a CSS mask, so it cannot ride inside a template
      // string. See `src/ui/resourceMark.ts`.
      const item = element('li');
      // Wanting when the empire cannot **spare** a copy, which is the reducer's
      // own question since batch R1 — an army that has spoken for the last iron
      // is as much a reason this card cannot be built as an unmined hill is.
      if (!canSpareAnyOf(state, city.ownerId, wants)) {
        item.classList.add('wanting');
      }
      item.append('Needs improved ');
      // **With the empire's own count on it** (batch R4). "Needs improved Iron"
      // is the rule; "Iron 2/3" is the decision, and this is the card a player
      // is reading while they decide. A pair keeps a figure per resource, so
      // horses-or-camels reads as a choice rather than as a bill for both.
      item.append(requirementNodes(state, city.ownerId, wants));
      notes.append(item);
    }
    if (def.upgradesTo !== undefined) {
      notes.append(note(`Becomes a ${unitDef(def.upgradesTo).name} in time`));
    }
    if (notes.childElementCount > 0) box.append(notes);
    return box;
  }

  /**
   * What a building does, out of `data/buildings.json` and nothing else.
   *
   * A building's effect is a handful of flat numbers by design (see
   * `buildingData.ts`), so the card is those numbers with their voices on. The
   * *empire-wide* worth of one — what it would add to the cities this player
   * has today — is `buildingYieldDelta`'s answer, and it is not shown anywhere
   * today: the star chart printed it until the ruling of 2026-09-09
   * (`docs/flags.md` (mmm), "the buildings don't need yield previews, as they
   * need to be built in your empire"), and the panel a building is actually
   * built from is the place a preview would belong if one comes back. This card
   * is the smaller, plainer statement of what the building itself is.
   */
  function buildingCard(city: City, id: BuildingId, index: number, built = true): HTMLElement {
    const def = buildingDef(id);
    const box = element('div');

    const head = element('div', 'info-card-head');
    head.append(element('span', 'info-card-name', def.name));
    // "wonder", not "building", because the one thing a player needs to know
    // before spending a hundred hammers is that somebody else may get there
    // first. Read off the row's own flag (`isWonder`) — there is no Oracle case.
    head.append(element('span', 'info-card-kind', isWonder(id) ? 'wonder' : 'building'));
    box.append(head);

    const figures = element('div', 'info-card-figures');
    // A building only ever bought has no hammers or turns to quote (batch UX7).
    if (built) {
      figures.append(
        element('span', 'info-card-cost', `${buildingProductionCost(id, getGame().state, city.ownerId)}${HAMMER}`),
      );
      figures.append(
        element(
          'span',
          'info-card-turns',
          turnsLabel(turnsToBuild(getGame().state, city, { kind: 'building', id }, index)),
        ),
      );
    }
    // The same bill one grade over: an institution costs its age to run and a
    // granary, a palisade, a monument or any wonder costs nothing.
    const buildingBill = upkeepFigure(buildingUpkeep(id));
    if (buildingBill) figures.append(buildingBill);
    box.append(figures);

    const notes = element('ul', 'info-card-notes');
    // Only what it actually pays: a row of four zeroes would say a monument does
    // three things badly rather than one thing well.
    const flat: [string, number][] = [
      [YIELD_GLYPH.food, def.food],
      [YIELD_GLYPH.production, def.production],
      [YIELD_GLYPH.gold, def.gold],
      [YIELD_GLYPH.science, def.science],
      [YIELD_GLYPH.culture, def.culture],
      [YIELD_GLYPH.faith, def.faith ?? 0],
    ];
    for (const [glyph, value] of flat) {
      if (value !== 0) notes.append(note(`${value > 0 ? '+' : ''}${value}${glyph} every turn`));
    }
    // Fractional and floored per building when it is applied (`foldCity`), so
    // it is quoted per citizen rather than as a total this card cannot know.
    if (def.sciencePerPop !== 0) {
      notes.append(note(`+${def.sciencePerPop}${YIELD_GLYPH.science} per citizen`));
    }
    // The fields that name a behaviour rather than a yield. Written off the
    // presence of the field, exactly as the unit card is: the second building
    // that raises the writ describes itself here without being taught.
    //
    // **`authorityCapacity` and `happiness` are no longer among them**: both are
    // now clauses of `describeCard` below, because a wonder is a card and the
    // card was printing four of Circus Maximus's five points of cheer and none
    // of The Forbidden City's writ at all. Two lines said one way each is the
    // whole of the bargain — a copy here would be the same fact in two voices,
    // and the one that drifts is always the copy.
    if (def.productionBonus !== undefined && def.productionBonus.percent !== 0) {
      const { category, percent } = def.productionBonus;
        const toward =
        category === 'unit' ? 'units' : category === 'wonder' ? 'wonders' : 'buildings';
      notes.append(note(`${percentFigure(percent)}${HAMMER} toward ${toward} here`));
    }
    if (def.cityStat !== undefined && def.cityStat.amount !== 0) {
      const { stat, amount } = def.cityStat;
      notes.append(note(`${amount > 0 ? '+' : ''}${amount} city ${stat}`));
    }
    // The unrest marker (batch WC1), off the row's own field like the rest.
    if (def.easesUnrest === true) notes.append(note('A town in unrest settles faster with this'));
    // **No renewal line** (the renewals axe, 2026-09-04). A card used to promise
    // every technology that would one day make this building pay more; the rows
    // that promised it are gone, and a building is worth what the figures above
    // say in every empire that raises it.
    //
    // What a **wonder** does beyond its yields, in the vocabulary's own words —
    // `describeCard`, the same function the offer, the collection and the slot
    // hover call, so a wonder's clause reads exactly as a Doctrine's does. A
    // building with no `effects` (which is every other row) adds nothing here.
    for (const clause of describeCard(id)) {
      // A clause names things (`ref`/`stripRefs`), so it is drawn as a
      // descriptor rather than written as text. **Bold, never a link**: this is
      // a hover card, and a hover card takes no pointer at all
      // (`infoCard.ts` — `pointer-events: none`), so a keyword that offered
      // itself as clickable here would be an affordance for a click that can
      // never land. The star chart's card is the one that is sticky, and it is
      // the one that links.
      const line = note('');
      setDescriptorText(line, clause.text, { linked: false });
      if (clause.deferred) line.classList.add('is-deferred');
      notes.append(line);
    }
    // The standing caveat, italic rather than struck: `deferred` is "this half
    // is missing" and `note` is "this half is here and there is something to
    // know about it" (Hagia Sophia hands over an augur where the ratified text
    // says a prophet). Two different things a row can say about itself, and a
    // card that painted them alike would be telling the player a promise was
    // broken when it was only bent.
    if (def.note !== undefined && def.note !== '') {
      const caveat = note(def.note);
      caveat.classList.add('is-caveat');
      notes.append(caveat);
    }
    if (isWonder(id)) {
      notes.append(note('A wonder: one of these stands in the whole world'));
    }
    if (notes.childElementCount === 0) notes.append(note('No yields of its own'));
    box.append(notes);
    // What this **town**, right now, would gain by finishing it — Orders,
    // beliefs, wonders, whatever in this empire's law wakes on a barracks
    // (user, 2026-08-28: "+1 prod for barracks belief" should show in the build
    // screen). Under the description above rather than inside it: the notes
    // just printed are the row out of `data/buildings.json` and nothing else,
    // this is the ground truth for the city actually open. Sim-derived and
    // printed exactly as given — `explainBuildingPreview`'s reconciliation line,
    // when it emits one, lands last because that is where the sim put it.
    const preview = explainBuildingPreview(getGame().state, city, id);
    if (preview.length > 0) {
      // "Would add" and the fold first (batch UX7): the row carries one mark of
      // it, and this is the whole of it, with each line's source under it.
      const fold = previewFigures(foldBuildingPreview(preview));
      if (fold !== '') {
        const adds = element('p', 'info-card-adds');
        adds.append(element('span', 'info-card-adds-label', 'Would add'));
        const figures = element('span', 'info-card-adds-figures');
        setYieldText(figures, fold);
        adds.append(figures);
        box.append(adds);
      }
      const previewList = element('ul', 'info-card-notes info-card-preview');
      for (const line of preview) previewList.append(note(previewLineText(line)));
      box.append(previewList);
    }
    // Why this town cannot start it, in the reducer's own sentence — "The
    // Colossus wants a harbour; Uruk has none", "The Oracle already stands in Ur
    // (Crimson)". The star chart's node card has said this at the foot since it
    // was written (`info-card-state`); the queue's card had no room for the
    // *site* clause at all, which is the one refusal a player cannot work out by
    // looking at the row. Asked with the town in hand, which is what lets
    // `buildError` answer the ground's question at all.
    //
    // `wanting` rather than the old `is-blocked`: a refusal names something this
    // seat has not got, so it wears the one vermilion italic every such line
    // wears (the user, 2026-09-08). The class carried its own colour until the
    // sweep folded it — see the `.wanting` block in `style.css`.
    const problem = buildError(getGame().state, city.ownerId, 'building', id, city);
    if (problem !== null) box.append(element('p', 'info-card-state wanting', problem));
    return box;
  }

  /**
   * What a project is: a rate, and the fact that it never stops.
   *
   * Nothing here computes either. The rate is `projectRate`'s answer — one
   * function, so a retuned cost cannot leave a stale label behind it — and the
   * estimate is `turnsToBuild`'s, which for a repeatable item is the interval
   * between payouts rather than a date.
   */
  function projectCard(city: City, id: ProjectId, index: number): HTMLElement {
    const def = projectDef(id);
    const bead = def.bead;
    const box = element('div');

    const head = element('div', 'info-card-head');
    head.append(element('span', 'info-card-name', def.name));
    head.append(
      element(
        'span',
        'info-card-kind',
        // A race project is the *opposite* of the repeating kind and must not
        // wear its word: one finishes and leaves the queue, the other never
        // does. `finishes` is the one field that separates them.
        bead === undefined
          ? 'project · repeats'
          : `race project · ${BEAD_FAMILY_MARK[bead.family].word.toLowerCase()}`,
      ),
    );
    box.append(head);

    const figures = element('div', 'info-card-figures');
    figures.append(element('span', 'info-card-cost', `${def.cost}${HAMMER}`));
    figures.append(
      element(
        'span',
        'info-card-turns',
        turnsLabel(turnsToBuild(getGame().state, city, { kind: 'project', id }, index)),
      ),
    );
    box.append(figures);

    const notes = element('ul', 'info-card-notes');
    if (bead === undefined) {
      const rate = element('li');
      setYieldText(rate, `Pays ${projectRate(id, PROJECT_GLYPHS)} for every ${def.cost}${HAMMER}`);
      notes.append(rate);
      // The two things a player has to know to plan around one, and both are
      // consequences of "it never leaves the queue" rather than extra rules.
      notes.append(note('Never completes — the city pays it again and again'));
      notes.append(note('Anything else you queue goes in front of it'));
    } else {
      // The one rule that makes a race a race, and it is the whole of what
      // separates this row from a wonder: everybody may build it, and every
      // hammer spent by a seat that does not finish first is spent.
      notes.append(note('First to finish takes the bead — nobody else gets it'));
      // The simulation's own sentences, and they may name the thing they hand
      // over — so they go through the one renderer rather than through `note`,
      // which takes a plain string. Unlinked, like every hover card's clause.
      for (const clause of describeBeadBoon(def.boon ?? {})) {
        const paid = element('li');
        setDescriptorText(paid, clause.text, { linked: false });
        notes.append(paid);
      }
    }
    notes.append(note(def.note));
    box.append(notes);
    // Why this town cannot start it, in the reducer's own sentence — the race is
    // already won, the card is off the table, or the empire has not got what the
    // race asks for. `buildingCard`'s clause, one queue kind over — and its
    // `wanting`, for its reason.
    const problem = buildError(getGame().state, city.ownerId, 'project', id, city);
    if (problem !== null) box.append(element('p', 'info-card-state wanting', problem));
    return box;
  }

  /**
   * The card for whatever a row stands for, at the queue position it occupies —
   * or, for a row in the "add to queue" grid, the position it would land in.
   */
  function itemCard(city: City, item: QueueItem, index: number, built = true): HTMLElement {
    if (item.kind === 'unit') return unitCard(city, item.id, index, built);
    if (item.kind === 'project') return projectCard(city, item.id, index);
    return buildingCard(city, item.id, index, built);
  }

  /**
   * One line of the work rail's card per bank that sells the row (batch UX7):
   * "Buy outright · 356💰 · you have 437 gold", or what the bank is short of,
   * or why it is not sold here, in the purchase gate's own words. The figures
   * are the price column's (`purchaseLook`), so the card and the cell agree.
   */
  function buyLine(look: PriceLook): HTMLElement {
    const line = element('p', 'city-row-card-buy');
    if (look.look === 'none') {
      line.classList.add('wanting');
      setYieldText(line, `Not bought here: ${look.refusal}`);
      return line;
    }
    const player = playerById(getGame().state, localPlayerId());
    const held = player === undefined ? 0 : bankOf(player, look.bank);
    const tail =
      look.look === 'short'
        ? priceNeedText(look.need)
        : `you have ${bankHeldText(held)} ${BANK_UNIT[look.bank]}`;
    setYieldText(line, `Buy outright · ${priceFigureText(look.bank, look.price)} · ${tail}`);
    return line;
  }

  /** A build row's card: the item's own card, then a buy line per bank that sells it. */
  function rowCardContent(
    city: City,
    item: QueueItem,
    index: number,
    cells: readonly BuildListCell[],
    built = true,
  ): HTMLElement {
    const box = itemCard(city, item, index, built);
    for (const cell of cells) box.append(buyLine(cell.look));
    return box;
  }

  /**
   * A short note on an element, shown in the panel's hover card on pointer rest
   * or keyboard focus (batch UX7) and given to a screen reader as the element's
   * description. It replaced the native `title`s, which take a second to
   * appear, cannot be styled, and never show on keyboard focus or on touch (the
   * city audit, problem 6). A refusal is never only a note: the panel prints it
   * on a line as well (`refusalLine.ts`).
   *
   * `describe` is false where the element's spoken name already says the same
   * words (an icon button's `aria-label`), so a screen reader does not read
   * them twice.
   */
  function noteOn(anchor: HTMLElement, text: string, describe = true): void {
    if (describe) anchor.setAttribute('aria-description', text.split('\n').join('. '));
    info.bind(anchor, () => noteNode(text));
  }

  // --- sections ------------------------------------------------------------

  /** The build list's previews, kept while the world stands still. See `createBuildingPreviewMemo`. */
  const buildingPreview = createBuildingPreviewMemo();
  /** The state object and `panelRenderKey` of the last full render. */
  let drawnState: GameState | null = null;
  let drawnKey: string | null = null;
  /** The town the last full render drew, so a rebuild of the same town keeps its scroll. */
  let drawnCityId: number | null = null;


  /**
   * The six yield chips. Each is a button that raises its own complete list
   * (`chipLedgerRows`) on hover or focus, and pins it open on a click
   * (batch UX6; the user's hover rule, 2026-10-12: hovering a yield chip shows
   * the breakdown of that yield's sources).
   *
   * Each chip prints its list's own total, which is `foldCity` toward the front
   * of the queue, the figure the end of turn banks. So a chip and its list cannot
   * disagree. The figure is rounded for the eye like every yield the player
   * reads (`netFigure`, batch X): before UX6 the chips printed the exact
   * fraction, and a town making 8.855 beakers said so.
   */
  function renderYieldChips(city: City, quote: CityReading): HTMLElement {
    const { state } = getGame();
    const row = element('div', 'city-yields');
    chipLedgers = new Map();
    chipButtons = new Map();
    /** One chip's list, kept for its handlers, and its total for the chip. */
    const ledgerOf = (key: YieldKey): number => {
      const ledger = chipLedgerRows(state, city, quote, key);
      chipLedgers.set(key, ledger);
      return ledger.total;
    };
    const entries: [YieldKey, string, number][] = [
      ['food', 'Food', ledgerOf('food')],
      ['production', 'Prod', ledgerOf('production')],
      ['gold', 'Gold', ledgerOf('gold')],
      ['science', 'Sci', ledgerOf('science')],
      ['culture', 'Cult', ledgerOf('culture')],
      ['faith', 'Faith', ledgerOf('faith')],
    ];
    for (const [key, label, value] of entries) {
      const chip = element('button', `city-yield is-${key}`);
      chip.type = 'button';
      chip.append(element('span', 'city-yield-value', netFigure(value)));
      const name = element('span', 'city-yield-label');
      // The drawn mark ahead of the abbreviation, so this row and the top bar's
      // strip name a voice the same way. The mark is `aria-hidden`; the chip's
      // spoken label says the yield in words.
      name.append(yieldMarkNode(key, true), document.createTextNode(label));
      chip.append(name);
      chip.setAttribute('aria-label', `${YIELD_NAME[key]}, ${netFigure(value)} a turn`);
      chip.setAttribute('aria-controls', CHIP_CARD_ID);
      chip.setAttribute('aria-expanded', 'false');
      chip.setAttribute('aria-pressed', pinnedChip?.key === key ? 'true' : 'false');
      // A tap is not a hover (`infoCard.ts`'s rule): on touch the click pins
      // the list instead.
      chip.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'touch') showChipCard(key);
      });
      chip.addEventListener('pointerleave', () => settleChipCard());
      chip.addEventListener('focus', () => showChipCard(key));
      chip.addEventListener('blur', () => settleChipCard());
      chip.addEventListener('click', () => togglePinnedChip(city, key));
      chipButtons.set(key, chip);
      row.append(chip);
    }
    return row;
  }

  /** Fills the chips' card with one chip's list and shows it. */
  function showChipCard(key: CityYieldKey): void {
    const card = chipCard;
    const ledger = chipLedgers.get(key);
    if (card === null || ledger === undefined) return;
    const pinned = pinnedChip?.key === key;
    card.replaceChildren(chipCardContent(ledger, pinned));
    card.classList.toggle('is-pinned', pinned);
    card.hidden = false;
    for (const [other, chip] of chipButtons) {
      chip.setAttribute('aria-expanded', other === key ? 'true' : 'false');
    }
  }

  /** The card once the pointer or focus has left a chip: the pinned list, or nothing. */
  function settleChipCard(): void {
    if (pinnedChip !== null) showChipCard(pinnedChip.key);
    else hideChipCard();
  }

  function hideChipCard(): void {
    if (chipCard !== null) {
      chipCard.hidden = true;
      chipCard.classList.remove('is-pinned');
      chipCard.replaceChildren();
    }
    for (const chip of chipButtons.values()) chip.setAttribute('aria-expanded', 'false');
  }

  /**
   * A click on a chip pins its list, or unpins it when it was the pinned one.
   * The chip is still under the pointer or the focus either way, so its list
   * stays up until that leaves.
   */
  function togglePinnedChip(city: City, key: CityYieldKey): void {
    pinnedChip = pinnedChip?.key === key ? null : { cityId: city.id, key };
    holdEscape(pinnedChip !== null);
    for (const [other, chip] of chipButtons) {
      chip.setAttribute('aria-pressed', pinnedChip?.key === other ? 'true' : 'false');
    }
    showChipCard(key);
  }

  function unpinChip(): void {
    pinnedChip = null;
    holdEscape(false);
    for (const chip of chipButtons.values()) chip.setAttribute('aria-pressed', 'false');
    hideChipCard();
  }

  /**
   * **Escape takes a pinned list down before it leaves the town** (batch UX7;
   * in UX6 it did so only with the keyboard on the chip or the card). While a
   * chip is pinned, this listener stands on the document in the capture phase,
   * so it hears Escape before the board's own handler in `controls.ts` (on the
   * window, in the bubbling phase) would leave the town, and stops it there. A
   * sheet open over the town hears it first, on the window in the capture
   * phase, so a confirm card still closes before the pin comes down. The
   * listener is added when a chip is pinned and removed when the pin comes
   * down or the town closes, so nothing listens while there is no pin.
   */
  function onPinnedEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || pinnedChip === null) return;
    event.preventDefault();
    event.stopPropagation();
    unpinChip();
  }

  function holdEscape(on: boolean): void {
    if (on) document.addEventListener('keydown', onPinnedEscape, true);
    else document.removeEventListener('keydown', onPinnedEscape, true);
  }

  /**
   * One chip's list as the card prints it: the yield and its total, a row per
   * line, then the total again under a rule. Every row is rounded for the eye
   * and the total is rounded from the exact total (`yieldFormat.ts`), so the
   * printed rows may differ from it by a rounding; the exact rows add up to it
   * exactly.
   */
  function chipCardContent(ledger: ChipLedger, pinned: boolean): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const head = element('div', 'city-chip-card-head');
    const name = element('span', 'city-chip-card-name');
    const word = YIELD_NAME[ledger.key];
    name.append(
      yieldMarkNode(ledger.key, true),
      document.createTextNode(word.charAt(0).toUpperCase() + word.slice(1)),
    );
    head.append(name);
    head.append(element('span', 'city-chip-card-total', `${netFigure(ledger.total)} a turn`));
    if (pinned) {
      const close = element('button', 'city-icon-button city-chip-card-close', '×');
      close.type = 'button';
      close.setAttribute('aria-label', 'Unpin this list');
      close.addEventListener('click', () => unpinChip());
      head.append(close);
    }
    fragment.append(head);
    if (ledger.rows.length === 0) {
      fragment.append(element('p', 'hint', 'Nothing in this town makes any of it.'));
      return fragment;
    }
    const list = element('ul', 'city-chip-rows');
    for (const row of ledger.rows) {
      const item = element('li', `city-chip-row is-${row.kind}`);
      if (row.amount < 0) item.classList.add('is-bad');
      const label = element('span', 'city-chip-row-label', row.label);
      if (row.percent !== null) {
        label.append(element('span', 'city-chip-row-percent', percentFigure(row.percent)));
      }
      item.append(label);
      item.append(element('span', 'city-chip-row-amount', signedFigure(row.amount)));
      list.append(item);
    }
    fragment.append(list);
    const total = element('div', 'city-chip-card-foot');
    total.append(element('span', undefined, 'Total'));
    total.append(element('span', 'city-chip-row-amount', netFigure(ledger.total)));
    fragment.append(total);
    return fragment;
  }

  /**
   * **The unrest card** — the bar, the reasons and the turns left (batch WC1,
   * `docs/flags.md` (rrrrrr) part 1), or `null` for a town that is not in
   * unrest, which is almost every town almost all of the time.
   *
   * The Growth and Borders rows' shape, because it is the same kind of thing: a
   * basket filling toward a mark at a rate. Under the bar, the reasons it fills
   * at, one row each with its figure — shown rather than tucked into a hover,
   * because they are what the player can change (a soldier in the gate, a
   * general beside it, a Courthouse). Then the one line about rebels. Every
   * figure is `unrestCardParts`', and no figure is in the prose.
   */
  function renderUnrest(city: City): HTMLElement | null {
    const parts = unrestCardParts(getGame().state, city);
    if (parts === null) return null;
    const card = element('div', 'city-card city-unrest');
    anchors.set('unrest', card);
    const box = element('div', 'city-meter');
    const head = element('div', 'city-meter-head');
    head.append(element('span', 'city-meter-name', 'Unrest'));
    head.append(
      element(
        'span',
        'city-meter-rate is-bad',
        parts.turns === null
          ? `+${figure(parts.rate)} a turn · stalled`
          : `+${figure(parts.rate)} a turn · ${parts.turns}t`,
      ),
    );
    box.append(head);
    box.append(bar(parts.progress, parts.target, 'is-unrest'));
    const foot = element('div', 'city-meter-foot');
    foot.append(element('span', 'city-meter-sub', 'Pacified at'));
    foot.append(
      element('span', 'city-meter-fig', `${figure(parts.progress)} / ${figure(parts.target)}`),
    );
    box.append(foot);
    noteOn(box, 'Pacification fills each turn; the town is pacified when the bar is full.');
    card.append(box);

    const reasons = element('ul', 'city-modifiers city-unrest-reasons');
    for (const reason of parts.reasons) {
      const item = element('li', 'city-modifier');
      item.append(element('span', undefined, reason.label));
      item.append(element('span', 'city-modifier-effect', reason.figure));
      reasons.append(item);
    }
    if (reasons.childElementCount > 0) card.append(reasons);

    card.append(
      element(
        'p',
        'hint',
        'Taken by force: no production, science or culture until it is pacified, ' +
          'and its borders hold still. Food, gold and faith are untouched.',
      ),
    );
    if (parts.guarded) {
      card.append(element('p', 'hint', 'A soldier of yours holds the town, so no rebels rise.'));
    } else if (parts.rebelIn !== null) {
      // The wanting voice, because this is the one line on the card that is a
      // lack the player can fix: a soldier in the gate.
      const warn = element('p', 'hint wanting city-unrest-rebels');
      warn.append(document.createTextNode('No soldier of yours stands in the town. Rebels rise in '));
      warn.append(element('span', 'city-meter-fig', turnsLabel(parts.rebelIn)));
      card.append(warn);
    }
    return card;
  }

  /**
   * Growth: how full the basket is, and when it will tip over.
   *
   * The surplus shown is the net figure the city banks — what it grows on — not
   * the gross food it harvests, because the gross number is the one that makes
   * a starving city look healthy.
   */
  function renderGrowth(city: City, quote: CityReading): HTMLElement {
    // `growthSurplus`, not the subtraction: since M10 what a city banks is the
    // harvest less upkeep, less a settler at the front of the queue, less
    // whatever a happiness deficit takes — and the panel must quote the number
    // the basket will actually receive.
    const surplus = growthSurplus(
      getGame().state,
      city,
      foldCity(getGame().state, city, [], undefined, quote),
    );
    const threshold = growthThreshold(city.population);
    const turns = turnsToFill(threshold - city.foodBasket, surplus);

    const box = element('div', 'city-meter');
    const label = element('div', 'city-meter-head');
    label.append(element('span', 'city-meter-name', 'Growth'));
    const sign = surplus > 0 ? '+' : '';
    // Rounded at the eye (batch X): the basket carries the exact surplus, the
    // rail prints the whole number. The *sign* is read off the exact figure, so
    // a town losing a tenth of a bushel still says "starving".
    const shownSurplus = roundYield(surplus);
    // The rate is a figure, so it carries the mono class; a shrinking city is
    // the one state in this panel that gets the alarm colour — and the word
    // (user, 2026-08-29): a deficit says "starving", not "stalled", because a
    // settler at the front of the queue holds the surplus at zero but never
    // shields the town from a deficit (`growthSurplus`, rule 2), and a city
    // that starves to size 1 that way holds the settler forever. The one word
    // is the whole warning; nothing else nags.
    label.append(
      element(
        'span',
        surplus < 0 ? 'city-meter-rate is-bad' : 'city-meter-rate',
        surplus < 0
          ? `${shownSurplus} food · starving`
          : turns === null
            ? `${sign}${shownSurplus} food · stalled`
            : `${sign}${shownSurplus} food · ${turns}t`,
      ),
    );
    box.append(label);
    box.append(bar(city.foodBasket, threshold, 'is-food'));

    // The basket against the next citizen, the Borders row's "Next tile" one
    // row up the rail in the same voice.
    const foot = element('div', 'city-meter-foot');
    foot.append(element('span', 'city-meter-sub', 'Next citizen'));
    foot.append(
      element('span', 'city-meter-fig', `${Math.floor(city.foodBasket)} / ${threshold}`),
    );
    box.append(foot);
    // And where the town's people are (batch UX6): a fact about how fast it
    // grows, on the row that says so. Its own line under the bar, because it
    // names three groups and a foot shared with a figure has room for one.
    // The levy stands on the same line since batch UX7 (A1: "the levy sits on
    // the town's population line ... because it spends a citizen"), and its
    // menu, or the reason it is greyed, opens under it.
    const levy = renderLevy(city);
    box.append(renderCitizens(city, levy?.trigger ?? null));
    if (levy?.below) box.append(levy.below);
    anchors.set('growth', box);

    // Every percentage on the channel, named on the line it throttles rather
    // than up among the yield percentages — this is its own channel (Entry
    // XIV.D.4: it multiplies the *surplus*, never the harvest), and since Entry
    // XVII the modifier list says only what the two yield stages did. The
    // Borders line has said the same thing about the writ since M10; this is its
    // twin, and since the dry-settle ruling it is the fold's own list rather
    // than the one line the panel happened to know about: a town that cannot
    // drink, an aqueduct, a wonder and the happiness stifle all print here
    // because `growthSurplus` is the sum of exactly these (rule 5).
    //
    // **On the row's hover rather than under it** since the mode landed, which
    // is the same move the yield chips made and the same promise: the list is
    // one hover deeper, never dropped. A rail two hundred pixels wide cannot
    // carry four modifier lines under every bar and still be a rail.
    const modifiers: string[] = [];
    if (surplus > 0) {
      for (const line of explainGrowthPercent(getGame().state, city)) {
        modifiers.push(`${line.source} ${percentFigure(line.percent)}`);
      }
    }
    noteOn(box, [`${Math.floor(city.foodBasket)} of ${threshold} banked`, ...modifiers].join('\n'));
    return box;
  }

  /**
   * Borders: what the next tile costs, how fast the culture is arriving, and
   * whether the writ has stopped it arriving at all.
   *
   * The growth line's sibling one field over, and built from the one evaluator
   * for the same reason: `borderGrowth` is what `collectYields` banks and what
   * `expandBorders` spends, so the rate quoted here is the rate the turn will
   * act on. Three states, and the third is why the evaluator carries `frozen`
   * as a flag rather than leaving the panel to infer it from a zero:
   *
   *   growing   "+3 culture · 5t", a bar, and the basket against the cost.
   *   stalled   a city with nowhere left to expand, or no culture at all.
   *   frozen    the writ is overdrawn. The rate is struck out and the reason is
   *             named, because a border that has stopped for a *policy* reason
   *             must not look like one that has merely run out of poets.
   *
   * The Buy Tiles button sits under it rather than in the header, because it is
   * the other half of the same sentence: this is how ground is acquired, and
   * gold is the way to hurry it. It is greyed with the simulation's own answer
   * (`tileBuyingError`, batch UX7b): a puppet's purse, or the writ's freeze
   * unless a card lifts it for tiles. It used to be greyed whenever the borders
   * were frozen, so Purchased Prosperity, which lifts the freeze for tiles,
   * could not be used from here.
   */
  function renderBorders(city: City, quote: CityReading): HTMLElement {
    const growth = borderGrowth(
      getGame().state,
      city,
      foldCity(getGame().state, city, [], undefined, quote),
    );

    const box = element('div', 'city-meter');
    const label = element('div', 'city-meter-head');
    label.append(element('span', 'city-meter-name', 'Borders'));
    // A town in unrest grows no border (batch WC1): said in its own words,
    // ahead of the writ's freeze, because it is this town's condition and the
    // one its owner can end.
    const halted = growth.unrest || growth.frozen;
    const rate = element(
      'span',
      halted ? 'city-meter-rate is-bad' : 'city-meter-rate',
      growth.unrest
        ? 'in unrest'
        : growth.frozen
          ? `${roundYield(growth.base)} culture · frozen`
          : growth.turns === null
            ? `+${roundYield(growth.perTurn)} culture · stalled`
            : `+${roundYield(growth.perTurn)} culture · ${growth.turns}t`,
    );
    label.append(rate);
    box.append(label);
    box.append(bar(growth.banked, growth.cost, 'is-culture'));

    const note = element('div', 'city-meter-foot');
    note.append(
      element(
        'span',
        'city-meter-sub',
        growth.unrest ? 'In unrest' : growth.frozen ? 'Authority overdrawn' : 'Next tile',
      ),
    );
    note.append(
      element('span', 'city-meter-fig', `${roundYield(growth.banked)} / ${growth.cost}`),
    );
    box.append(note);

    // The writ's own percentage on the accrual, named rather than folded into
    // the rate — rule 5 one grade smaller: a player whose borders sped up is
    // entitled to find the reason on the line that sped up. On the row's hover
    // since the mode landed, for the Growth line's reason exactly.
    noteOn(
      box,
      growth.unrest
        ? 'The borders hold still until the town is pacified'
        : !growth.frozen && growth.percent !== 0
          ? `Authority ${percentFigure(growth.percent)}`
          : growth.frozen
            ? 'Borders frozen — authority is overdrawn'
            : `${roundYield(growth.banked)} of ${growth.cost} toward the next tile`,
    );

    const buy = element('button', 'city-buy-tiles');
    buy.type = 'button';
    const active = isBuyMode();
    buy.textContent = active ? 'Stop buying' : 'Buy tiles';
    buy.classList.toggle('is-active', active);
    const { state } = getGame();
    // The ended turn is the panel's own lock and is said at the foot of the work
    // rail; everything else is the tile gate's town-wide answer.
    const ended = hasEndedTurn(state, localPlayerId());
    const refusal = ended ? null : tileBuyingError(state, localPlayerId(), city.id);
    const blocker = ended ? `You have ended turn ${state.turn}` : refusal;
    buy.disabled = blocker !== null;
    noteOn(buy, blocker ?? 'Show what the ground around this city costs in gold');
    buy.addEventListener('click', () => {
      setBuyMode(!isBuyMode());
      onChanged();
    });
    box.append(buy);
    // Why it is greyed, on a line (never only a note).
    if (refusal !== null) box.append(refusalLineElement(refusal, 'row'));

    return box;
  }

  /**
   * The focus pane: four words and a checkbox, directly under the two clocks it
   * is about.
   *
   * Civ's citizen-management control in this game's language. It sits under
   * Growth and Borders because that is what it moves — pressing Food is a
   * statement about the first bar, and Avoid growth is a statement about
   * stopping it — and because the pins it outranks are clicked on the board
   * beside it.
   *
   * Every segment sends the same command with the whole arrangement stated
   * (`setCitizenFocus`), so a click is one log entry and nothing here has to
   * know which half changed. The active segment is marked with ink rather than
   * with capitals — the panel's one register of controls, which is the rule the
   * Buy Tiles note is the other instance of.
   *
   * Greyed by `focusBlocker`, which asks the simulation first: the sentence on a
   * disabled segment is the sentence the reducer would have returned, so a
   * puppet says it chooses for itself rather than something about the turn.
   */
  function renderFocusPane(city: City, locked: boolean): HTMLElement {
    const { state } = getGame();
    const blocker = focusBlocker(state, localPlayerId(), city, locked);
    const current = cityFocus(city);

    const box = element('div', 'city-focus-pane');
    anchors.set('focus', box);
    const head = element('div', 'city-meter-head');
    head.append(element('span', 'city-meter-name', 'Focus'));
    box.append(head);

    const choices = element('div', 'city-focus-choices');
    for (const focus of CITIZEN_FOCUSES) {
      const button = element('button', 'city-focus-choice', focusLabel(focus));
      button.type = 'button';
      button.classList.toggle('is-active', focus === current);
      button.disabled = blocker !== null;
      noteOn(button, blocker ?? focusHint(focus));
      button.addEventListener('click', () => {
        sendFocus(city, focus, city.avoidGrowth === true);
      });
      choices.append(button);
    }
    box.append(choices);

    // The checkbox is the pane's second half and its own sentence: a town may
    // chase hammers and still be allowed to grow, so it is never folded into
    // the segments above.
    const avoid = element('label', 'city-focus-avoid');
    const tick = element('input');
    tick.type = 'checkbox';
    tick.checked = city.avoidGrowth === true;
    tick.disabled = blocker !== null;
    tick.addEventListener('change', () => {
      sendFocus(city, current, tick.checked);
    });
    avoid.append(tick);
    avoid.append(element('span', undefined, 'Avoid growth'));
    noteOn(avoid, blocker ?? 'Work hexes that keep the basket empty, without starving the town');
    box.append(avoid);
    return box;
  }

  /** Sends the whole arrangement and repaints. A refused command changes nothing. */
  function sendFocus(city: City, focus: CitizenFocus, avoidGrowth: boolean): void {
    const command: Command = {
      type: 'setCitizenFocus',
      playerId: localPlayerId(),
      cityId: city.id,
      focus,
      avoidGrowth,
    };
    if (!report(command, dispatch(getGame(), command)).ok) return;
    onChanged();
  }

  /**
   * The citizen line (batch UX6): "Citizens 11: 8 on land · 2 specialists · 1
   * idle" (`citizenLineText`). It replaced "8/11 working", which did not say
   * where the other three were.
   *
   * The number pinned by hand rides the line's hover. It counts the pins
   * currently *honoured*, not the length of `city.lockedTiles`: a pin on a tile
   * the city has lost is kept in the state (see `assignCitizens`) but there is
   * no citizen standing on it, and a panel that counted it would be counting a
   * citizen that does not exist.
   */
  function renderCitizens(city: City, levy: HTMLElement | null = null): HTMLElement {
    const pinned = city.lockedTiles.filter((cell) =>
      city.workedTiles.some((tile) => tile.col === cell.col && tile.row === cell.row),
    ).length;
    const line = element('p', 'city-citizens');
    const words = element('span', 'city-citizens-text', citizenLineText(citizenParts(city)));
    noteOn(words, `${figure(pinned)} pinned by hand`);
    line.append(words);
    if (levy !== null) line.append(levy);
    return line;
  }

  /**
   * "Specialists 6 · 3 scholars +6🔬 · 2 merchants +8🪙 · 1 artist +2🎵", with a
   * quiet Dismiss beside each trade.
   *
   * **Absent until a town has one**, which is the ruling's "ignorable": a player
   * who never reads this row is playing the game correctly, and a row that says
   * "Specialists 0" on every town from turn one would be the interface insisting
   * on a system that has not started yet.
   *
   * Every figure is the simulation's own. The names and the yields are
   * `citySpecialistYields`, the same list `foldCity` folds into the chips
   * above and prints again in the ledger; the hover card is `guildThreshold` and
   * `cityGuildInflow`, the two numbers the `guilds` phase itself compares. There
   * is no arithmetic in this function, which is the only way the bar a player
   * watches and the bar the phase fills can be promised to be the same bar.
   *
   * Dismiss is greyed by `dismissSpecialistError` and carries its sentence, so a
   * disabled control says exactly what the reducer would have said — and asks
   * before it acts, through the page's confirm card, because a guildsman sent
   * back to the fields cannot be recalled and the bar restarts with them.
   */
  function renderSpecialists(city: City, locked: boolean): HTMLElement | null {
    const parts = specialistRow(city);
    if (!parts) return null;
    const row = element('p', 'city-specialists');
    row.append(element('span', undefined, parts.label));
    row.append(element('span', 'city-specialists-count', parts.total));

    for (const entry of parts.families) {
      const group = element('span', 'city-specialist');
      group.append(element('span', 'city-specialist-name', entry.text));
      group.append(dismissControl(city, entry.family, locked));
      row.append(group);
    }

    // The bar, on the row rather than under it: it is the one number a curious
    // player wants and the one a beginner never has to see.
    noteOn(row, guildBarText(getGame().state, city));
    return row;
  }

  /**
   * The levy button and what goes under it (batch L, `levyMenu.ts`): the
   * button for the population line, and under the line its menu when open, or
   * the reason it is greyed. Absent when the player's cards grant no levy.
   * Which town's menu is open is kept here, so a repaint keeps it open;
   * choosing a line sends `levyCitizen` and closes it.
   *
   * On the Growth card's population line since batch UX7 (A1: spending sits
   * beside the bank it draws on, and a levy spends a citizen). It had a card of
   * its own in the town rail before.
   */
  function renderLevy(city: City): { trigger: HTMLElement; below: HTMLElement | null } | null {
    const { state } = getGame();
    const model = levyMenuModel(state, localPlayerId(), city);
    if (model === null) return null;
    const open = levyMenuOpenFor === city.id;
    const trigger = renderLevyTrigger(model, open, () => {
      levyMenuOpenFor = levyMenuOpenFor === city.id ? null : city.id;
      // Nothing in the state moved, so the render key would skip the rebuild.
      drawnKey = null;
      render();
    });
    // A greyed button says why on a line (batch UX7: never only in a tooltip).
    if (model.disabled) return { trigger, below: refusalLineElement(model.title, 'row') };
    if (!open) return { trigger, below: null };
    const menu = renderLevyMenuBody(model, (use) => {
      levyMenuOpenFor = null;
      const command: Command = {
        type: 'levyCitizen',
        playerId: localPlayerId(),
        cityId: city.id,
        use,
      };
      if (!report(command, dispatch(getGame(), command)).ok) {
        drawnKey = null;
        render();
        return;
      }
      onChanged();
    });
    return { trigger, below: menu };
  }

  /** The quiet Dismiss beside one trade. See `renderSpecialists`. */
  function dismissControl(
    city: City,
    family: SpecialistFamily,
    locked: boolean,
  ): HTMLButtonElement {
    const { state } = getGame();
    const button = element('button', 'btn btn-quiet btn-tiny city-specialist-dismiss', 'Dismiss');
    button.type = 'button';
    const blocker = dismissBlocker(state, localPlayerId(), city, family, locked);
    button.disabled = blocker !== null;
    noteOn(button, blocker ?? `Send a ${family} back to the fields`);
    button.addEventListener('click', () => {
      askConfirm(
        {
          title: `Dismiss a ${family}?`,
          body: 'They return to the fields and the guild bar restarts.',
          confirmLabel: 'Dismiss',
          cancelLabel: 'Keep',
        },
        () => {
          const command: Command = {
            type: 'dismissSpecialist',
            playerId: localPlayerId(),
            cityId: city.id,
            family,
          };
          if (!report(command, dispatch(getGame(), command)).ok) return;
          onChanged();
        },
      );
    });
    return button;
  }

  /**
   * "Working for production — a settler is at the front."
   *
   * The one line that explains why a town's citizens have quietly moved off the
   * wheat. `assignCitizens` leans on `citizenFocusWeights.production` whenever growth
   * is halted (playtest batch two), and without a word for it the panel simply
   * shows a different assignment than it did last turn with nothing to account
   * for the change — which reads as the game shuffling citizens at random.
   *
   * The question is asked of `citizenFocus`, the simulation's own readout, so
   * this cannot say "production" about a town placing citizens the balanced way.
   * It is deliberately the *decision* rather than the outcome — see that
   * function's docblock for why the starvation guard putting the balanced sheet
   * back does not change the sentence — and it says nothing at all while the
   * town is growing normally, because a line that is always there is a line
   * nobody reads.
   *
   * "a settler is at the front" is the shape of every halt there is today; the
   * marker is the queue row's `haltsGrowth` and nothing here compares a type
   * against `"settler"`, so the day something else halts a town this sentence is
   * the one place that needs a word.
   *
   * **Nothing at all once the player has said something** (the focus pane): the
   * lean is then their own instruction, printed on the segment they pressed, and
   * a line explaining it as a settler's doing would be explaining the wrong
   * cause — see `citizenLean`, where the player's word outranks the game's guess.
   */
  function renderCitizenFocus(city: City): HTMLElement | null {
    if (cityFocus(city) !== 'default') return null;
    if (citizenFocus(city) !== 'production') return null;
    return element(
      'p',
      'city-focus',
      'Working for production — a settler is at the front.',
    );
  }

  function bar(value: number, total: number, className: string): HTMLElement {
    const track = element('div', 'city-bar');
    const fill = element('div', `city-bar-fill ${className}`);
    const fraction = total <= 0 ? 0 : Math.max(0, Math.min(1, value / total));
    fill.style.width = `${(fraction * 100).toFixed(1)}%`;
    track.append(fill);
    return track;
  }

  function renderProduction(city: City, locked: boolean, quote: CityReading): HTMLElement {
    const box = element('div', 'city-prod');
    const item = city.queue[0];
    const perTurn = foldCity(getGame().state, city, [], undefined, quote).production;

    box.append(element('h3', undefined, 'Building now'));
    if (!item) {
      // The card that says the town is idle, which is a decision the player has
      // to make and therefore belongs at the head of the work rail rather than
      // as a missing block.
      box.append(element('p', 'city-prod-idle', 'Nothing queued'));
      return box;
    }

    const cost = queueItemCost(getGame().state, city.ownerId, item) ?? 0;
    // The front of the queue is index 0, which is the one position the banked
    // hammers belong to — the same call every other estimate in this panel
    // makes, so the bar and the rows can never round differently.
    const turns = turnsToBuild(getGame().state, city, item, 0, quote);
    // What is being built is a *name* and takes the display face — the one thing
    // in the work rail a player looks at first — with the schedule beside it in
    // the counting face. The two faces are the whole of the hierarchy here.
    const what = element('div', 'city-prod-what');
    const name = element('span', 'city-prod-name', queueItemName(item));
    // The card is the front row, so it is also where that row is *described* —
    // the same hover card the queue rows and the build list raise, over the
    // work rail since batch UX7, at the one position the banked hammers belong
    // to. Focusable so the keyboard reaches it too.
    name.tabIndex = 0;
    bindRowCard(name, () => itemCard(city, item, 0));
    what.append(name);
    const schedule = element(
      'span',
      'city-prod-turns',
      `${roundYield(city.hammerBasket)}/${cost} · ${turns === null ? 'stalled' : `${turns}t`}`,
    );
    what.append(schedule);
    // **And where it is taken off.** The front row left the queue list when the
    // list became "what comes after this", and its × had to come with it or the
    // one row a player most often changes their mind about would be the one row
    // they could not remove. Same draft, same command, same refusal.
    const drop = element('button', 'city-icon-button', '×');
    drop.type = 'button';
    drop.setAttribute('aria-label', 'Stop building this');
    railNoteOn(drop, 'Stop building this', false);
    // The works-list floor greys this one too — the last two rows of a Vizier's
    // town are the two the reducer will not let it be left without, and the
    // front row is one of them. Same sentence as the queue list's ×, said on a
    // line under the card rather than in a tooltip (batch UX7).
    const floor = cityQueueFloor(city);
    const floored = floor > 0 && city.queue.length <= floor;
    drop.disabled = floored || locked;
    drop.addEventListener('click', () => {
      const next = draft(city);
      next.splice(0, 1);
      commit(city, next);
    });
    what.append(drop);
    box.append(what);
    box.append(bar(city.hammerBasket, cost, 'is-production'));
    // **"Waiting for room"** (item (llll)): a full bar with nothing coming off
    // it is the one reading on this card a player cannot get from the figures.
    // The town has finished the piece and has nowhere to put it — every hex
    // around it is taken, or an army has closed the ring and a completion may
    // not spill into a siege — so the hammers stay banked and the piece lands
    // the turn a hex clears.
    //
    // The **quiet voice**, and that is the whole ruling in one class name: this
    // is a *state* the board is in, not a lack the player is short of, and the
    // vermilion italic `.wanting` would be the panel telling them off for a
    // besieger's decision. Nothing is owed here and nothing is being refused.
    //
    // The sentence is `productionAwaitingRoom`'s answer and not a condition
    // composed here: the panel reads, the simulation decides.
    const waiting = productionAwaitingRoom(getGame().state, city);
    if (waiting !== null) {
      const held = element('p', 'city-prod-waiting', `${queueItemName(item)} is waiting for room`);
      railNoteOn(
        held,
        'Finished, with nowhere to stand — the work is kept until a hex beside the town clears.',
      );
      box.append(held);
    }
    // The works-list floor's sentence, when it is what greys the ×.
    if (floored) box.append(refusalLineElement(queueFloorRefusal(city, floor), 'row'));
    // The rate the bar fills at, on the figures' hover rather than on a line of
    // its own — the rails' rule, and the figure is the ⚙ chip in the band. On
    // the figures rather than the whole row, so the name keeps the item's card.
    railNoteOn(
      schedule,
      `+${roundYield(perTurn)} a turn · ${roundYield(city.hammerBasket)} of ${cost} banked`,
    );
    // And the two banks, on the rows that declare they take them (Entry LV).
    // Under the bar rather than beside the queue row because a contribution pays
    // for `queue[0]` and this box *is* the front row — a button anywhere else
    // would be offering to hurry a thing that is not being built.
    const banks = contributeRow(city, locked);
    if (banks) box.append(banks);
    return box;
  }

  /**
   * The two contribute buttons — "💰 68 → +34⚙" — or `null` when the front of
   * this queue does not take contributions.
   *
   * Shown only when the row declares it (`BuildingDef.acceptsContributions`,
   * asked through `explainContribution`) *and* the bank holds enough to buy a
   * hammer, which is the spec's "shown only when the front row accepts
   * contributions and the bank is non-empty": an offer of nothing is not an
   * offer, and a permanently greyed pair of buttons on every city panel in the
   * game would be two controls that only ever mean "not here".
   *
   * Every figure is `explainContribution`'s, so the number on the button is the
   * number the bank loses and the hammers it promises are the hammers the basket
   * receives; the blocker is `contributeError`'s sentence.
   *
   * A refused button also says why on a line under the pair, once per reason
   * (batch UX5: no refusal lives only in a native tooltip). A finished turn is
   * not a refusal of this verb, and the foot of the work rail already says the
   * turn is over, so it adds no line.
   *
   * These buttons are the one thing allowed under the bar, because a
   * contribution does fill the bar ("→ +34⚙"). A purchase never does, which is
   * why no price sits on this card (`renderBuildables`).
   */
  function contributeRow(city: City, locked: boolean): HTMLElement | null {
    const { state } = getGame();
    const seat = localPlayerId();
    const row = element('div', 'city-contribute');
    const refusals: string[] = [];
    let any = false;
    for (const currency of ['gold', 'faith'] as const) {
      const offer = explainContribution(state, seat, city.id, currency);
      if (!offer) continue;
      any = true;
      const glyph = currency === 'faith' ? YIELD_GLYPH.faith : YIELD_GLYPH.gold;
      const button = element('button', 'city-contribute-button');
      button.type = 'button';
      setYieldText(button, `${offer.spend}${glyph} → +${offer.hammers}${HAMMER}`);
      const refusal = locked ? null : contributeError(state, seat, city.id, currency);
      const blocker = locked ? `You have ended turn ${state.turn}` : refusal;
      if (refusal !== null && !refusals.includes(refusal)) refusals.push(refusal);
      button.disabled = blocker !== null;
      // The completion is said out loud where there is one, because "this press
      // finishes it" is the whole reason to press the bigger of the two.
      const promise =
        offer.completes === null
          ? `Give ${offer.spend} ${currency} toward ${offer.name}`
          : `Give ${offer.spend} ${currency} — completes ${offer.completes}`;
      // Words only in the spoken form: a screen reader announcing a currency
      // glyph reads its Unicode name before the number it decorates.
      button.setAttribute('aria-label', blocker ?? promise);
      // The promise on hover (batch UX7: no native tooltips). A refusal is said
      // on a line under the pair as well, below.
      railNoteOn(button, blocker ?? promise, false);
      button.addEventListener('click', () => give(city, currency));
      row.append(button);
    }
    for (const refusal of refusals) row.append(refusalLineElement(refusal, 'row'));
    return any ? row : null;
  }

  /**
   * The queue, with the two edits that cover every reordering a short queue
   * needs: remove, and move up. "Move up" repeated is "move to the front", and
   * a drag-and-drop list for three items would be more code than the panel.
   */
  function renderQueue(city: City, locked: boolean, quote: CityReading): HTMLElement | null {
    // The front row is the card above this one ("Building now"), so the list is
    // what comes *after* it — "then — Worker". A queue of one is a town with
    // nothing after the thing it is building, and prints no list at all.
    if (city.queue.length <= 1) return null;
    const box = element('div', 'city-queue');
    const floor = cityQueueFloor(city);
    const floored = floor > 0 && city.queue.length <= floor;

    const list = element('ol', 'city-queue-list');
    city.queue.forEach((item, index) => {
      if (index === 0) return;
      const row = element('li');
      const name = element('span', 'city-queue-name', queueItemName(item));
      row.append(name);
      row.append(
        element(
          'span',
          'city-queue-cost',
          `${queueItemCost(getGame().state, city.ownerId, item) ?? '?'}${HAMMER}`,
        ),
      );
      // **What this row has already been paid** (schema 111). Hammers stay with
      // the thing they were spent on, so a row the town started and put down
      // carries its own figure — printed only when there is one, because a row
      // nobody has spent a hammer on has nothing to say and every other queue
      // row would grow a "0" it does not mean.
      const banked = bankedTowardItem(city, item);
      if (banked > 0) {
        row.append(
          element('span', 'city-queue-banked', `${roundYield(banked)}${HAMMER} set aside`),
        );
      }
      // The estimate is for *this* item at the position it is standing in, and
      // the front row counts the basket while a row behind it counts its own
      // parked bucket — see `turnsToBuild`. Row two is therefore "and then this
      // long", not "and by then it will be turn nine".
      row.append(
        element(
          'span',
          'city-queue-turns',
          turnsLabel(turnsToBuild(getGame().state, city, item, index, quote)),
        ),
      );
      // The name is the anchor rather than the whole row: the row's last three
      // children are buttons, and a card raised by hovering "remove" would be
      // describing the thing you are about to delete. The card stands over the
      // work rail since batch UX7.
      name.tabIndex = 0;
      bindRowCard(name, () => itemCard(city, item, index));

      const up = element('button', 'city-icon-button', '↑');
      up.type = 'button';
      up.setAttribute('aria-label', `Move ${queueItemName(item)} up`);
      railNoteOn(up, 'Move up', false);
      up.disabled = locked || index === 0;
      up.addEventListener('click', () => {
        const next = draft(city);
        const moved = next[index]!;
        next[index] = next[index - 1]!;
        next[index - 1] = moved;
        commit(city, next);
      });

      // **And down** (batch UX7): with ↑ alone, sending a row to the back cost
      // one press of ↑ on every row behind it.
      const down = element('button', 'city-icon-button', '↓');
      down.type = 'button';
      down.setAttribute('aria-label', `Move ${queueItemName(item)} down`);
      railNoteOn(down, 'Move down', false);
      down.disabled = locked || index === city.queue.length - 1;
      down.addEventListener('click', () => {
        const next = draft(city);
        const moved = next[index]!;
        next[index] = next[index + 1]!;
        next[index + 1] = moved;
        commit(city, next);
      });

      const remove = element('button', 'city-icon-button', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${queueItemName(item)}`);
      railNoteOn(remove, 'Remove', false);
      // **The works list a town may not be left short of** — The Vizier's Hall
      // (batch S2). The greyed button is explained by the reducer's own
      // sentence, said once under the "Building now" card, whose × it greys as
      // well (batch UX7: never in a tooltip).
      remove.disabled = floored || locked;
      remove.addEventListener('click', () => {
        const next = draft(city);
        next.splice(index, 1);
        commit(city, next);
      });

      row.append(up, down, remove);
      list.append(row);
    });
    box.append(list);
    return box;
  }

  /**
   * **The Supply strip** (batch UX7; "Strategic resources" under Settled in
   * `docs/plans/hud-ux-decisions.md`: the counts head the city build list,
   * where building decisions are made). Every strategic resource the empire
   * holds or has spent, as spare/held, in vermilion when none is spare. Every
   * figure is `strategicHoldings`' (`resourceCopies.ts`), which reads the
   * simulation's own counts. The band's "No Iron spare" chip points here.
   */
  function renderSupply(): HTMLElement | null {
    const counts = strategicHoldings(getGame().state, localPlayerId());
    if (counts.length === 0) return null;
    const strip = element('p', 'city-supply');
    strip.append(element('span', 'city-supply-label', 'Supply'));
    for (const count of counts) {
      const item = element('span', 'city-supply-item');
      item.append(
        resourceMarkNode(count.id),
        document.createTextNode(` ${count.name} `),
        copiesFigureNode(count),
      );
      strip.append(item);
    }
    anchors.set('supply', strip);
    return strip;
  }

  /**
   * The add list: every row `buildListModel` decides on, drawn, with the price
   * column on the right (the user's A1 ruling, 2026-10-12).
   *
   * What a row is, whether it may be pressed and how its price reads are the
   * model's answers; this function only lays them out. Top to bottom:
   *   - the Supply strip (`renderSupply`);
   *   - the tabs: All first, then the four shelves, then Faith, remembered per
   *     seat (`addTabFor`);
   *   - the price column's heading, "Buy outright · full price · you have 437
   *     gold", once over every shelf priced in gold;
   *   - for each shelf: its eyebrow on the All tab, the Faith shelf's own
   *     heading, the reasons several of its rows share, the rows, each followed
   *     by any reason only it has, and then the shelf's "Not yet · N" fold;
   *   - the caption, which says what a gold price is.
   *
   * Since batch UX7 (the user's rulings of 2026-10-12 on shortening the list):
   *   - **every row is one line**: the name, one mark for a building's main
   *     yield (`mainYieldOf`), the hammers and turns, and the price. What the
   *     row would add in full, and its buy line, are in its hover card over the
   *     work rail (`bindRowCard`), never inline;
   *   - **rows blocked for a reason the player can fix fold** under "Not yet",
   *     each with its reason, and the fold remembers being opened as the
   *     disclosures do;
   *   - **the Faith shelf is folded on the All tab** unless something on it can
   *     be bought now;
   *   - **"Now"**, shown on a row's hover or focus, and Shift-click on the row,
   *     put it at the front of the queue (`queueWithFront`). A plain click adds
   *     it at the back, as before.
   *
   * A price is the full price and never falls as the town builds
   * (`purchase.ts`), so no price sits on "Building now" or on the queue rows.
   * The current build is bought from its own row here, marked "in queue · 1st",
   * at the price a fresh copy would show.
   */
  function renderBuildables(city: City, locked: boolean, quote: CityReading): HTMLElement {
    const { state } = getGame();
    const seat = localPlayerId();
    const tab = addTabFor(seat);
    const box = element('div', 'city-buildables');
    const supply = renderSupply();
    if (supply) box.append(supply);
    box.append(element('h3', undefined, 'Add to queue'));
    // The tabs. One long list of everything a town can start was the list this
    // screen was born with and the thing the 2026-09-03 audit named: a player
    // deciding "what unit next" reads past thirty buildings to find four
    // soldiers. The shelf is `queueCategory`'s answer for the row — the
    // simulation's own sorter, never a comparison against a name — so a fourth
    // category in the table gets a tab by joining `ADD_SHELVES`.
    //
    // **All is first and lit by default** and gives that one long list back —
    // grouped now, under an eyebrow apiece, so a player who does not yet know a
    // wonder from a building is never asked to guess which tab hides the thing
    // they want. The shelves are the *filter* rather than the way in.
    const tabs = element('div', 'city-tabs');
    for (const { tab: which, label } of ADD_TABS) {
      const button = element('button', 'city-tab', label);
      button.type = 'button';
      const on = which === tab;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.addEventListener('click', () => {
        addTabs.set(seat, which);
        onChanged();
      });
      tabs.append(button);
    }
    box.append(tabs);

    const shelves = buildListModel(state, city, seat, tab, locked);
    const grid = element('div', 'city-buildable-grid');
    // Where the band's "Idle" chip points (batch UX6).
    anchors.set('buildList', grid);
    const player = playerById(state, seat);
    const held = (bank: PurchaseCurrency): PriceHeadBank => ({
      bank,
      held: player === undefined ? 0 : bankOf(player, bank),
    });
    // A seat that has ended its turn may read its prices and not press them.
    // That is a state rather than a lack, so the plate goes quiet rather than
    // vermilion, and the work rail's foot already says the turn is over.
    const paused = hasEndedTurn(state, seat) ? `You have ended turn ${state.turn}` : null;

    /** In front of any standing project, never behind it — see `insertionIndex`. */
    const add = (item: QueueItem): void => {
      commit(city, queueWithAdded(city.queue, item));
    };
    /** At the front of the queue — see `queueWithFront`. */
    const addNow = (item: QueueItem): void => {
      commit(city, queueWithFront(city.queue, item));
    };
    /** A row's click: to the back, or with Shift held, to the front. */
    const press =
      (item: QueueItem) =>
      (event: MouseEvent): void => {
        if (event.shiftKey) addNow(item);
        else add(item);
      };

    /** "89⚙ · 3t": the hammers, and the turns at the place in the queue the row takes. */
    const schedule = (item: QueueItem, cost: number, at: number): string =>
      `${cost}${HAMMER} · ${turnsLabel(turnsToBuild(state, city, item, at, quote))}`;

    /** A unit's build button: its name, then its hammers and turns. */
    const unitButton = (row: UnitListRow): HTMLElement => {
      const { id } = row;
      const def = unitDef(id);
      // The live price, not the base one: a settler gets dearer with every
      // settler this player has built, and the button quotes exactly what
      // `advanceProduction` will charge (`unitProductionCost`).
      const cost = unitProductionCost(state, city.ownerId, id);
      const item: QueueItem = { kind: 'unit', id };
      const button = element('button', 'city-buildable');
      button.type = 'button';
      button.disabled = !row.enabled;
      button.setAttribute(
        'aria-label',
        row.blocked !== null ? `${def.name} — ${row.blocked}` : `${def.name} — ${cost} production`,
      );
      button.append(element('span', 'city-buildable-name', def.name));
      const figures = element('span', 'city-buildable-cost');
      setYieldText(figures, schedule(item, cost, city.queue.length));
      button.append(figures);
      // Priced at the back of the queue, because that is where a click puts it.
      bindRowCard(button, () => rowCardContent(city, item, city.queue.length, row.cells));
      button.addEventListener('click', press(item));
      return button;
    };

    /** A building's build button, which also stands for a building already in the queue. */
    const buildingButton = (row: BuildingListRow): HTMLElement => {
      const { id } = row;
      const def = buildingDef(id);
      const item: QueueItem = { kind: 'building', id };
      // Where pressing it would put it, or where it already stands: the
      // estimate and the hover card are for that place in the queue.
      const at = row.queued === null ? city.queue.length : row.queued - 1;
      // The one mark for what it would add here (the user's hover rule,
      // 2026-10-12), off the same preview the hover card lists in full.
      const main = mainYieldOf(foldBuildingPreview(buildingPreview(state, city, id, quote)));
      const adds = main === null ? '' : `, adds ${main.amount} ${YIELD_NAME[main.key]}`;
      const name = element('span', 'city-buildable-name', def.name);
      // The eyebrow: a wonder is a different *kind* of thing to spend a hundred
      // hammers on, and a player needs to know that before reading the price.
      if (row.wonder) name.append(element('span', 'city-buildable-eyebrow', 'wonder'));
      // And where it already stands in the queue. A fact, not a refusal, so it
      // is the quiet eyebrow and the row is drawn as a label rather than a
      // greyed button (`.city-buildable.is-queued`).
      if (row.queued !== null) {
        name.append(element('span', 'city-buildable-eyebrow is-queued', queuedMark(row.queued)));
      }
      const mark = element('span', 'city-buildable-yield');
      if (main !== null) setYieldText(mark, `+${main.amount}${YIELD_GLYPH[main.key]}`);
      // A building that is only ever bought is a label, like the Faith shelf's
      // offers: there is nothing to queue, and its price is the control.
      if (row.boughtOnly) {
        const label = element('span', 'city-offer-name is-building');
        name.append(element('span', 'city-buildable-eyebrow', 'bought, not built'));
        label.append(name, mark);
        label.setAttribute('aria-label', `${def.name} — bought, not built${adds}`);
        bindRowCard(label, () => rowCardContent(city, item, at, row.cells, false));
        return label;
      }
      const cost = buildingProductionCost(id, state, city.ownerId);
      const button = element('button', 'city-buildable is-building');
      if (row.wonder) button.classList.add('is-wonder');
      if (row.queued !== null) button.classList.add('is-queued');
      button.type = 'button';
      button.disabled = !row.enabled;
      button.setAttribute(
        'aria-label',
        row.blocked ??
          (row.queued !== null
            ? `${def.name} — ${queuedMark(row.queued)}${adds}`
            : `${def.name} — ${cost} production${adds}`),
      );
      button.append(name, mark);
      const figures = element('span', 'city-buildable-cost');
      setYieldText(figures, schedule(item, cost, at));
      button.append(figures);
      bindRowCard(button, () => rowCardContent(city, item, at, row.cells));
      button.addEventListener('click', press(item));
      return button;
    };

    /** A project's build button. A project is a conversion, so it is never priced. */
    const projectButton = (row: ProjectListRow): HTMLElement => {
      const { id } = row;
      const def = projectDef(id);
      const bead = def.bead;
      const button = element('button', 'city-buildable is-building');
      button.type = 'button';
      button.disabled = !row.enabled;
      button.setAttribute(
        'aria-label',
        bead === undefined
          ? `${def.name} — repeating project, ${def.cost} production for ${projectRate(id, PROJECT_SPOKEN)}`
          : `${def.name} — race project, ${def.cost} production, first to finish takes a ` +
            `${BEAD_FAMILY_MARK[bead.family].word.toLowerCase()} bead`,
      );
      // The ↻ is "this never leaves the queue" and belongs only to the two
      // conversions; a race wears the bead's own mark in the bead's own ink.
      const name = element('span', 'city-buildable-name');
      if (bead === undefined) {
        name.textContent = `${def.name} ↻`;
      } else {
        const beadMark = element('span', 'bead-family-mark', '◉');
        beadMark.style.setProperty('--bead-ink', `var(${BEAD_FAMILY_MARK[bead.family].ink})`);
        beadMark.setAttribute('aria-hidden', 'true');
        name.append(beadMark, document.createTextNode(def.name));
      }
      button.append(name);
      const figures = element('span', 'city-buildable-cost');
      setYieldText(figures, `${def.cost}${HAMMER} → ${projectRate(id, PROJECT_GLYPHS)}`);
      button.append(figures);
      bindRowCard(button, () => itemCard(city, { kind: 'project', id }, city.queue.length));
      button.addEventListener('click', () => add({ kind: 'project', id }));
      return button;
    };

    /**
     * The left of a row: the build button, or for a thing that is only ever
     * bought, its offer as a plain label. The label is not a control, so
     * nothing about it looks pressable; the price beside it is the control.
     */
    const lead = (row: BuildListRow): HTMLElement => {
      if (row.kind === 'unit') return unitButton(row);
      if (row.kind === 'building') return buildingButton(row);
      if (row.kind === 'project') return projectButton(row);
      const label = element('span', 'city-offer-name', row.verb);
      bindRowCard(label, () =>
        rowCardContent(city, { kind: 'unit', id: row.id }, city.queue.length, row.cells, false),
      );
      return label;
    };

    /**
     * "Now", for a row that may go to the front of the queue (batch UX7): a unit
     * or building the town may queue, or a building queued behind the current
     * build. Not a project, which never leaves the queue and would hold every
     * row behind it. Shown on the row's hover or focus, in room the build button
     * gives up for it then (`.has-now`, batch UX7b): it covered the button's
     * figures in UX7, so a click there queued the row at the front when the
     * player meant the back.
     */
    const nowButton = (row: BuildListRow): HTMLElement | null => {
      if (locked) return null;
      let item: QueueItem;
      if (row.kind === 'unit' && row.enabled) item = { kind: 'unit', id: row.id };
      else if (row.kind === 'building' && !row.boughtOnly && (row.enabled || (row.queued ?? 0) > 1)) {
        item = { kind: 'building', id: row.id };
      } else return null;
      const now = element('button', 'city-now', 'Now');
      now.type = 'button';
      now.setAttribute('aria-label', `Build ${row.name} now, ahead of the queue`);
      railNoteOn(now, 'Put it at the front of the queue. Shift-click on a row does the same.');
      now.addEventListener('click', () => addNow(item));
      return now;
    };

    /** One price cell, wired to the purchase it stands for. */
    const priceCell = (row: BuildListRow, cell: BuildListCell): HTMLElement => {
      const item: PurchasableItem | null =
        row.kind === 'building'
          ? { kind: 'building', id: row.id }
          : row.kind === 'project'
            ? null
            : { kind: 'unit', id: row.id };
      return priceCellElement(cell.look, {
        name: row.name,
        ...(item === null ? {} : { onBuy: () => buy(city, item, cell.look.bank) }),
        paused,
        mark: cell.place?.at === 'head' ? cell.place.mark : null,
      });
    };

    /**
     * Why a row's build button is greyed, on a line under it: the strategic
     * resource with the empire's counts, or the queue's own sentence. Only for a
     * row the list keeps although it cannot be queued, which is a row that can
     * still be bought; the turn lock is said at the foot of the rail instead.
     */
    const buildReason = (row: BuildListRow): HTMLElement | null => {
      if (locked) return null;
      if (row.kind === 'unit') {
        const reason = unitNotYet(city, row);
        return reason === null ? null : reasonLine(reason, 'refusal-line is-row wanting');
      }
      if (row.kind === 'building' && !row.boughtOnly && row.queued === null && row.blocked !== null) {
        return refusalLineElement(row.blocked, 'row');
      }
      return null;
    };

    /** A reason drawn: a resource with its marks and counts, or a sentence. */
    const reasonLine = (reason: NotYetReason, className: string): HTMLElement => {
      const line = element('p', className);
      if (reason.kind === 'resource') {
        line.append('needs improved ');
        // The count goes on the refusal itself (batch R4): "Copper 0/8" says you
        // have eight and every one is already carrying something.
        line.append(requirementNodes(state, city.ownerId, reason.resources));
      } else {
        setYieldText(line, reason.text);
      }
      return line;
    };

    /** One row of the list, and the lines that belong under it. */
    const drawRow = (row: BuildListRow, into: HTMLElement): void => {
      const offer = row.kind === 'offer' || (row.kind === 'building' && row.boughtOnly);
      const line = element('div', offer ? 'city-buildable-row is-offer' : 'city-buildable-row');
      const left = element('div', 'city-buildable-lead');
      left.append(lead(row));
      const now = nowButton(row);
      if (now !== null) {
        // The row makes room for "Now" beside the build button while it is
        // hovered or focused (batch UX7b), so "Now" never covers any part of
        // the button that adds the row at the back (`.has-now`).
        left.classList.add('has-now');
        left.append(now);
      }
      line.append(left);
      // A project keeps the column's width with an empty cell, so its button
      // lines up with the rows priced around it.
      if (row.kind === 'project') line.append(emptyPriceCellElement());
      for (const cell of row.cells) line.append(priceCell(row, cell));
      into.append(line);
      const why = buildReason(row);
      if (why !== null) into.append(why);
      // The reasons only this row has, on lines under it.
      for (const cell of row.cells) {
        if (cell.place?.at === 'row') into.append(refusalLineElement(cell.place.text, 'row'));
      }
    };

    /**
     * The shelf's "Not yet · N" fold (batch UX7): the rows blocked for a reason
     * the player can fix, each with its reason in the wanting voice, closed
     * until opened and remembered open after (`rememberOpen`).
     */
    const drawNotYet = (shelf: BuildListShelf, into: HTMLElement): void => {
      if (shelf.notYet.length === 0) return;
      const fold = element('details', 'city-not-yet');
      const summary = element('summary');
      summary.append(element('span', 'city-not-yet-name', 'Not yet'));
      summary.append(element('span', 'city-not-yet-count', figure(shelf.notYet.length)));
      fold.append(summary);
      for (const { row, reason } of shelf.notYet) {
        const line = element('div', `city-not-yet-row is-${row.kind}`);
        line.append(element('span', 'city-not-yet-name', row.name));
        line.append(reasonLine(reason, 'city-not-yet-why wanting'));
        const item: QueueItem | null =
          row.kind === 'project' ? null : row.kind === 'building' ? { kind: 'building', id: row.id } : { kind: 'unit', id: row.id };
        if (item !== null) {
          const built = row.kind === 'unit' || (row.kind === 'building' && !row.boughtOnly);
          bindRowCard(line, () => rowCardContent(city, item, city.queue.length, row.cells, built));
        }
        fold.append(line);
      }
      rememberOpen(fold, `Not yet · ${shelf.word}`, false);
      into.append(fold);
    };

    /**
     * The line that stands in for every caravan row: caravans are hired with a
     * route on the trade sheet and never queued (`UnitDef.routeOnly`). A link
     * when the page handed in the way there, plain words when it did not.
     */
    const tradeSheetLine = (): HTMLElement => {
      if (onOpenTrade === undefined) {
        return element('p', 'city-trade-link', 'Caravans are hired on the trade sheet.');
      }
      const link = element('button', 'city-trade-link', 'Caravans are hired on the trade sheet →');
      link.type = 'button';
      link.addEventListener('click', () => onOpenTrade());
      return link;
    };

    // The heading over the price column, once, naming the banks the ordinary
    // shelves are priced in. The Faith shelf carries its own heading.
    const ordinary = banksInView(shelves.filter((shelf) => shelf.shelf !== 'faith'));
    if (ordinary.length > 0) grid.append(priceHeadElement(ordinary.map(held)));

    for (const shelf of shelves) {
      let into: HTMLElement = grid;
      if (shelf.shelf === 'faith' && tab === 'all') {
        // **The Faith shelf folds on the All tab unless something on it can be
        // bought now** (the user's ruling of 2026-10-12): a shelf of prices a
        // town cannot pay was most of a new capital's list. Opened or closed by
        // the player, it stays that way (`rememberOpen`).
        const affordable = shelf.rows.some((row) =>
          row.cells.some((cell) => cell.look.look === 'buy'),
        );
        const fold = element('details', 'city-shelf-fold');
        const summary = element('summary');
        summary.append(element('span', 'city-shelf-head', shelf.word));
        summary.append(
          element('span', 'city-not-yet-count', figure(shelf.rows.length + shelf.notYet.length)),
        );
        fold.append(summary);
        rememberOpen(fold, 'Faith shelf', affordable);
        grid.append(fold);
        into = fold;
      } else if (tab === 'all') {
        // The eyebrow over a group, on the All tab only: a single-shelf tab is
        // already named by the tab that is lit.
        grid.append(element('h4', 'city-shelf-head', shelf.word));
      }
      if (shelf.shelf === 'faith') into.append(priceHeadElement([held('faith')]));
      // The reasons several rows share, said once, before the rows they cover.
      for (const line of shelf.refusals) {
        into.append(refusalLineElement(line.text, 'head', line.mark));
      }
      for (const row of shelf.rows) drawRow(row, into);
      drawNotYet(shelf, into);
      if (shelf.caravans) into.append(tradeSheetLine());
    }

    // A shelf with nothing on it is a real answer — every wonder in the age
    // already stands, or no technology has opened a project yet — and it is the
    // greyed-row reading one scale up: a tab that vanished would take the
    // question with it. On the All tab the same emptiness means something wider,
    // so it says so in wider words.
    if (shelves.length === 0) {
      box.append(
        element(
          'p',
          'hint',
          tab === 'all' ? 'Nothing to build here yet.' : 'Nothing on this shelf yet.',
        ),
      );
    }
    box.append(grid);
    // What a gold price is, said once under the list: the conversion, and that
    // it is the full cost however far the town has got. The treasury itself is
    // in the column's heading and in the band since batch UX5 (the user's
    // ruling of 2026-10-12, "The treasury shows on the city screen", which
    // replaces the 2026-08-27 ruling that kept it off this screen).
    box.append(
      element(
        'p',
        'hint',
        `Gold prices are the full cost, at ${RULES.production.goldPerHammer}` +
          `${YIELD_GLYPH.gold} per ${HAMMER}, however much has been built. Buying what ` +
          'is being built now passes its banked hammers to the next item.',
      ),
    );
    return box;
  }

  /**
   * DOM wrapper over `defenseRows` — see it for the rule this ledger keeps.
   *
   * The heading is the disclosure's summary now, so this is the ledger alone:
   * every line the section printed before the rails, unchanged, one click deep.
   */
  function renderDefense(city: City): HTMLElement {
    const { state } = getGame();
    const box = element('div', 'city-defense');
    const list = element('ul', 'city-modifiers ledger');
    for (const row of defenseRows(state, city)) {
      const item = element('li', 'city-modifier');
      item.append(element('span', undefined, row.label));
      item.append(element('span', 'city-modifier-effect', row.figures));
      list.append(item);
    }
    box.append(list);
    return box;
  }

  /**
   * The header's belief badge: `cityFaithHeadline`, dressed.
   *
   * A badge in the `city-size` voice, beside Size and hp, because that row is
   * where a town's standing facts live and what it believes is one. The faith's
   * name takes its founder's ink — the same `--seat-ink` the block below and the
   * hover card use, so a rival's banner in your capital is the same colour
   * wherever a player meets it — and the whole line repeats on hover, which is
   * the one place a narrow panel can put a clause that has been elided.
   */
  function renderFaithHeadline(city: City): HTMLElement | null {
    const { state } = getGame();
    const head = cityFaithHeadline(state, city, localPlayerId());
    if (head === null) return null;
    const badge = element('span', 'city-size city-faith-head');
    noteOn(badge, head.text);
    return faithHeadlineNode(head, badge);
  }

  /**
   * Writes a faith headline into `into`, the faith's name — and only the name —
   * in its founder's ink. The band's badge and the Faith card's first line
   * (batch UX7) are the same sentence drawn the same way.
   */
  function faithHeadlineNode(head: CityFaithHeadline, into: HTMLElement): HTMLElement {
    if (head.name === null || head.founderColor === null) {
      into.textContent = head.text;
      return into;
    }
    // Split on the name so the name — and only the name — carries the ink.
    const at = head.text.indexOf(head.name);
    into.append(document.createTextNode(head.text.slice(0, at)));
    const name = element('span', 'city-faith-head-name', head.name);
    name.style.setProperty('--seat-ink', head.founderColor);
    into.append(name);
    into.append(document.createTextNode(head.text.slice(at + head.name.length)));
    return into;
  }

  /**
   * **The Faith card** (batch UX7; `docs/plans/city-screen-iterations.md`, A1:
   * "a Faith card in the town rail, replacing the Faith and Rites
   * disclosures"): what this town believes, and the rites it may keep, priced
   * in the price column with a shared refusal said once.
   *
   * Top to bottom:
   *   - the headline (`cityFaithHeadline`), the band badge's sentence in full,
   *     and one click deeper every faith with a claim on the town
   *     (`renderFollowers`, the old Faith disclosure's whole contents, kept);
   *   - the rite the town is keeping, and the turns left on it;
   *   - one row per rite this empire knows: its name and its price in faith
   *     (`priceCell.ts`). The price is the control, because a rite is one verb,
   *     spending faith, so the name is a label. What it does and for how long
   *     (`riteOfferText`) is the row's hover note;
   *   - a rite the bank is only short of shows its price with "need 21" under
   *     it (`riteGate`, batch UX7b), and the refusals of anything else are said
   *     once (`planRefusals`), "Uruk is already keeping Rite of Plenty"
   *     rather than once a row, or a reason only one rite has under its row;
   *   - the rites the empire has not learnt, folded under "Not yet", each with
   *     what teaches it, because a rite not yet learnt is an argument for going
   *     and learning it;
   *   - a link to the faith sheet's rites for every town, when the page hands
   *     in the way there (`onOpenRites`).
   *
   * Absent when there is nothing to say: no faith in the world and no rite.
   * The rows come from `riteOptions` (`controls.ts`), every refusal the
   * reducer's own, so a price a player can press is a command it takes.
   */
  function renderFaithCard(city: City): HTMLElement | null {
    const { state } = getGame();
    const head = cityFaithHeadline(state, city, localPlayerId());
    const rows = options.riteOptions?.(city.id) ?? [];
    if (head === null && rows.length === 0) return null;
    const performRite = options.performRite;
    const card = element('div', 'city-card city-faith-card');
    const title = element('div', 'city-meter-head');
    title.append(element('span', 'city-meter-name', 'Faith'));
    card.append(title);

    if (head !== null) {
      card.append(faithHeadlineNode(head, element('p', 'city-faith-headline')));
      // Every faith with a claim on the town, one click deeper: the old Faith
      // disclosure's whole contents (no-deletion rule).
      const claims = cityFaithRows(state, city, localPlayerId());
      const every = disclosure('Every faith here', figure(claims.length), renderFollowers(city));
      if (every) card.append(every);
    }

    const held = cityRite(state, city);
    if (held !== null) {
      const left = cityRiteTurnsLeft(state, city);
      card.append(
        element(
          'p',
          'city-rite-kept',
          `Keeping ${riteDef(held).name} · ${left} ${left === 1 ? 'turn' : 'turns'} left`,
        ),
      );
    }

    const known = rows.filter((row) => row.requiredTechName === null);
    const unknown = rows.filter((row) => row.requiredTechName !== null);
    if (known.length > 0) {
      // Each look is the rite gate's own answer (`riteGate`, batch UX7b): a rite
      // the bank is only short of says "need N", as a price in the build list
      // does. A seat that has ended its turn may read its rites and not start
      // them; its pressable prices go quiet (`paused`) rather than becoming a
      // refusal.
      const seat = localPlayerId();
      const paused = hasEndedTurn(state, seat) ? `You have ended turn ${state.turn}` : null;
      const looks = known.map((row) => {
        const gate = riteGate(state, seat, city.id, row.id);
        return priceLook({
          bank: 'faith',
          price: row.cost,
          refusal: gate.refusal,
          shortfall: gate.shortfall,
        });
      });
      // The refusals, once per reason (`planRefusals`), keyed by each row's id.
      const refused: RefusalEntry<RiteId>[] = [];
      known.forEach((row, index) => {
        const look = looks[index]!;
        if (look.look === 'none') refused.push({ key: row.id, name: row.name, refusal: look.refusal });
      });
      const plan = planRefusals(refused);
      for (const line of plan.head) card.append(refusalLineElement(line.text, 'head', line.mark));
      const list = element('div', 'city-rites');
      known.forEach((row, index) => {
        const look = looks[index]!;
        const place = plan.places.get(row.id) ?? null;
        const line = element('div', 'city-rite-row');
        const name = element('span', 'city-rite-name', row.name);
        line.append(name);
        const cell = priceCellElement(look, {
          name: `${row.name} in ${city.name}`,
          // Said as the act it is: a rite is started, not bought.
          spokenLabel: 'Start',
          ...(performRite === undefined
            ? {}
            : {
                onBuy: () => {
                  performRite(city.id, row.id);
                  onChanged();
                },
              }),
          paused,
          mark: place?.at === 'head' ? place.mark : null,
        });
        line.append(cell);
        if (row.preview !== null) {
          noteOn(name, row.preview);
          noteOn(cell, row.preview);
        }
        list.append(line);
        if (place?.at === 'row') list.append(refusalLineElement(place.text, 'row'));
      });
      card.append(list);
    }

    // The rites this empire has not learnt, folded, each with what teaches it.
    if (unknown.length > 0) {
      const fold = element('details', 'city-not-yet');
      const summary = element('summary');
      summary.append(element('span', 'city-not-yet-name', 'Not yet'));
      summary.append(element('span', 'city-not-yet-count', figure(unknown.length)));
      fold.append(summary);
      for (const row of unknown) {
        const line = element('div', 'city-not-yet-row');
        line.append(element('span', 'city-not-yet-name', row.name));
        // **A prerequisite the seat has not met wears the wanting voice** (the
        // user, 2026-09-08: "keep the same styling").
        line.append(element('p', 'city-rite-says wanting', `Taught by ${row.requiredTechName}`));
        if (row.preview !== null) noteOn(line, row.preview);
        fold.append(line);
      }
      rememberOpen(fold, 'Not yet · rites', false);
      card.append(fold);
    }

    // The faith sheet keeps the rites of every town at once (batch UX9). A
    // link there when the page hands in the way; without it, nothing.
    const openRites = options.onOpenRites;
    if (openRites !== undefined && rows.length > 0) {
      const link = element('button', 'city-trade-link', 'Rites in every town →');
      link.type = 'button';
      link.addEventListener('click', () => openRites(city.id));
      card.append(link);
    }
    return card;
  }

  /**
   * What this town believes — one line per faith with a claim on it, and the
   * citizens who follow nothing.
   *
   * Under the citizens' row rather than beside the buildings, because it is a
   * fact about the *people*: a religion does not take a town, it takes people in
   * it one at a time, and the town flies the banner more than half of them
   * follow (`City.followers`). So this reads as a second reading of the row
   * above it.
   *
   * Absent entirely until something presses, which is most of a game — the
   * `renderBuilt` reading rather than `renderRoutes`': a town nobody has preached
   * to has nothing to say about faith, and a permanent "no religion" line would
   * be the sheet answering a question nobody asked.
   *
   * Foreign faiths are named in **their founder's ink**, because whose faith it
   * is is the whole of what makes a rival's banner in your town news.
   */
  function renderFollowers(city: City): HTMLElement | null {
    const { state } = getGame();
    const rows = cityFaithRows(state, city, localPlayerId());
    if (rows.length === 0) return null;
    const box = element('div', 'city-built city-faith');
    for (const row of rows) {
      const line = element('p', row.ours ? 'city-faith-row' : 'city-faith-row is-foreign');
      const name = element('span', 'city-faith-name', row.name);
      if (!row.ours) {
        name.style.setProperty('--seat-ink', row.founderColor);
        noteOn(name, `Founded by ${row.founderName}`);
      }
      line.append(document.createTextNode('Following '));
      line.append(name);
      if (row.majority) {
        // The banner. A mark rather than a word, beside the name it is about,
        // exactly as the capital's star sits beside a city's.
        const mark = element('span', 'city-faith-majority', '✶');
        noteOn(mark, `More than half of ${city.name} follows ${row.name}`);
        line.append(mark);
      }
      line.append(
        element(
          'span',
          'city-faith-count',
          ` · ${figure(row.following)} of ${figure(row.population)} citizens`,
        ),
      );
      // The ledger on hover, and the bank's distance to the next citizen after
      // it: how hard a faith is pressing and how close the next one is to
      // turning are two different questions, and this is the one place either is
      // answerable.
      const ledger = pressureLedgerText(row.ledger);
      noteOn(
        line,
        row.banked > 0
          ? `${ledger} · ${row.banked} of ${row.perConvert} toward the next citizen`
          : ledger,
      );
      box.append(line);
    }
    const left = unconvertedCitizens(city);
    if (left > 0) {
      box.append(
        element(
          'p',
          'hint',
          `${figure(left)} of ${figure(city.population)} follow the old gods.`,
        ),
      );
    }
    return box;
  }

  /**
   * The stones this town has, and the one thing standing among them that no
   * other surface says twice.
   *
   * The **consecration** is the second line (playthrough note 21): a cathedral's
   * patron is rolled once, announced once in a toast that scrolls away, and
   * until now was printed nowhere afterwards — a player who looked up a turn
   * later had no way at all to ask what their cathedral had been dedicated to.
   * It belongs here because it is a standing fact about the town in the same
   * sense the buildings are, and it reads under them because it is a fact
   * *about* one of them.
   *
   * Printed off the town rather than off the cathedral, and drawn even when no
   * cathedral is in the list: `City.consecration` is written once and never
   * cleared, so a captured town that lost its stones still kept its patron, and
   * a line that vanished with the building would be the sheet forgetting
   * something the simulation still pays for (`liveCityEffects`' consecration
   * source).
   *
   * Every word after the name is the row's own (`describeCard`, the same
   * describer the Compendium's entry prints), and the name is a keyword ref into
   * that entry — so "what does it actually do" is one click from the sheet
   * rather than a number written out here that would drift the day it is
   * retuned. The Built figure stays the count of buildings: a patron is not a
   * building and would make the fold lie.
   */
  function renderBuilt(city: City): HTMLElement | null {
    const patron = city.consecration;
    if (city.buildings.length === 0 && patron === undefined) return null;
    const box = element('div', 'city-built');
    if (city.buildings.length > 0) {
      box.append(
        element(
          'p',
          'hint',
          city.buildings.map((id) => buildingDef(id).name).join(' · '),
        ),
      );
    }
    if (patron !== undefined) {
      const def = consecrationDef(patron);
      // `belief` is the Compendium's own address for a consecration
      // (`consecrationEntry` shelves it there), so the mark resolves to the page
      // that already explains the whole class.
      const named = ref('belief', patron, def.name);
      const clauses = describeCard(patron)
        .map((clause) => clause.text)
        .join(' · ');
      const line = element('p', 'hint');
      setDescriptorText(
        line,
        clauses === '' ? `Consecrated to ${named}` : `Consecrated to ${named} — ${clauses}`,
      );
      box.append(line);
    }
    return box;
  }

  /**
   * The routes this town is an end of, and what the empire has left to spend.
   *
   * Under the buildings because that is what a route is made of: `routeSlots`
   * is a fold over the markets and harbours in the list above it, and what a
   * caravan brings home is counted off its partner's buildings. A player
   * reading downward meets "Market · Uruk" and then the caravan it paid for.
   *
   * The **trading post** is a mark rather than a row. It is not a building — it
   * is the *history* of having been an end of a route, written permanently by
   * `startRouteAt` and never cleared — and all it does is let later caravans
   * reach further, which is a fact about this town rather than a thing it makes.
   * So it sits beside the heading like the capital's star and says so on hover.
   *
   * Drawn even when the town is an end of nothing, because the slot figure is
   * the answer to "why can I not start another route" and a section that
   * vanished would take that answer with it — the greyed-row reading, one
   * screen over.
   */
  function renderRoutes(city: City): HTMLElement | null {
    const { state } = getGame();
    if (city.ownerId !== localPlayerId()) return null;
    const rows = cityRouteRows(state, city);
    const box = element('div', 'city-built');
    // The post rides the first line of the body now that the heading is the
    // disclosure's summary. Still a mark rather than a row, and still says what
    // it is on hover — see the docblock.
    if (city.tradingPost === true) {
      const post = element('p', undefined);
      const mark = element('span', 'city-size', '⌂ trading post');
      noteOn(
        mark,
        'This town has been an end of a trade route. A post extends how far ' +
          'later caravans may be sent from or to it.',
      );
      post.append(mark);
      box.append(post);
    }
    box.append(element('p', 'hint', routeSlotsLineOf(state, localPlayerId())));
    // A door to the Trade screen, and the one a player reaches from a *town*
    // rather than from a piece: this row already answers "why can I not start
    // another route", and the screen is where that is acted on. Offered
    // whether or not this town is an end of anything — an empire's trade is
    // exactly what a town with no routes wants to look at.
    if (onOpenTrade) {
      const all = element('button', 'btn btn-quiet btn-tiny', 'All routes');
      (all as HTMLButtonElement).type = 'button';
      noteOn(all, 'Every caravan and every partner');
      all.addEventListener('click', () => onOpenTrade());
      box.append(all);
    }
    if (rows.length === 0) {
      box.append(element('p', 'hint', 'No caravan runs to or from this town.'));
      return box;
    }
    // Inbound first — those are the routes that pay *here* now (2026-08-27: the
    // origin's buildings set the figure, the destination banks it), and
    // `row.text` already carries the direction arrow and, for a paying route,
    // its figures — see `cityRouteRows`.
    for (const row of [...rows].sort((a, b) => Number(a.outbound) - Number(b.outbound))) {
      box.append(element('p', 'hint', row.text));
    }
    return box;
  }

  // --- the mode -------------------------------------------------------------

  /**
   * One collapsed standing fact: a summary carrying the fold, the section's own
   * contents inside it, closed until asked.
   *
   * The screen's oldest complaint and the audit's second (2026-09-03): Defence,
   * Built, Routes and Faith are read-mostly, they were interleaved with the
   * things a player edits, and each cost a column-foot every render whether or
   * not anybody was reading it. A `<details>` is the whole fix and it is the
   * platform's: it opens on a click, it opens on Enter, a screen reader
   * announces it as expandable, and **nothing inside it is deleted** — the
   * contents are the very elements the sections built before.
   *
   * The figure in the summary is what makes a closed row worth having: "Built ·
   * 7" answers the question most reads of that section were asking.
   */
  function disclosure(
    label: string,
    figures: string,
    body: HTMLElement | null,
    defaultOpen = false,
  ): HTMLElement | null {
    if (body === null) return null;
    const box = element('details', 'city-disc');
    const summary = element('summary');
    summary.append(element('span', 'city-disc-name', label));
    summary.append(element('span', 'city-disc-fig', figures));
    box.append(summary);
    box.append(body);
    rememberOpen(box, label, defaultOpen);
    return box;
  }

  /**
   * Opens a `<details>` as the player last left it, and remembers what they do
   * with it. Closed by default and open again after a repaint if the player had
   * opened it — see `openDisclosures` for why that is not a nicety. One that
   * asks to open (`defaultOpen`) does so until the player closes it
   * (`closedDisclosures`), and never again after. The disclosures, the "Not
   * yet" folds and the folded Faith shelf all keep their state this way.
   */
  function rememberOpen(box: HTMLDetailsElement, key: string, defaultOpen: boolean): void {
    box.open = openDisclosures.has(key) || (defaultOpen && !closedDisclosures.has(key));
    box.addEventListener('toggle', () => {
      if (box.open) {
        openDisclosures.add(key);
        closedDisclosures.delete(key);
      } else {
        openDisclosures.delete(key);
        closedDisclosures.add(key);
      }
    });
  }

  /**
   * The ‹ and › either side of the town's name (batch UX6): the previous and
   * the next town the seat holds, in founding order with puppets included,
   * wrapping at the ends (`steppedTownId`). The comma and period keys do the
   * same from `controls.ts`.
   *
   * Absent when the page handed in no way to open a town (`onOpenCity`), as
   * the trade button is absent without `onOpenTrade`: a panel built without
   * one is still a panel, and an arrow that did nothing would be the Trader
   * row's bug again. With only one town held, both arrows are there but
   * greyed, so the control does not appear and vanish as towns are founded.
   */
  function stepButtons(city: City): { previous: HTMLElement; next: HTMLElement } | null {
    const open = options.onOpenCity;
    if (open === undefined) return null;
    const { state } = getGame();
    const make = (step: -1 | 1): HTMLElement => {
      const button = element('button', step < 0 ? 'city-step is-previous' : 'city-step is-next');
      button.type = 'button';
      button.textContent = step < 0 ? '‹' : '›';
      const key = step < 0 ? ',' : '.';
      button.setAttribute('aria-keyshortcuts', key);
      const target = steppedTownId(state, localPlayerId(), city.id, step);
      const town = target === null ? undefined : state.cities.find((one) => one.id === target);
      if (target === null || town === undefined) {
        button.disabled = true;
        button.setAttribute('aria-label', 'No other town');
        return button;
      }
      const words = `${step < 0 ? 'Previous' : 'Next'} town: ${cityDisplayName(state, town)}`;
      button.setAttribute('aria-label', words);
      noteOn(button, `${words} (${key})`, false);
      button.addEventListener('click', () => open(target));
      return button;
    };
    return { previous: make(-1), next: make(1) };
  }

  /**
   * The short-of chips in the middle of the band (batch UX6): one per problem
   * `shortOfChips` finds, each a link to where it is fixed on this screen. The
   * group is drawn empty for a town that is fine, so the band keeps its shape.
   */
  function renderShortOf(city: City, quote: CityReading): HTMLElement {
    const box = element('div', 'city-short-of');
    for (const chip of shortOfChips(getGame().state, city, quote)) {
      const button = element('button', `city-short is-${chip.id}`);
      button.type = 'button';
      button.append(element('span', 'city-short-label', chip.label));
      if (chip.figure !== null) button.append(element('span', 'city-short-figure', chip.figure));
      button.setAttribute('aria-label', `${chip.label}: ${chip.why}`);
      noteOn(button, chip.why, false);
      button.addEventListener('click', () => pointTo(chip.target));
      box.append(button);
    }
    return box;
  }

  /**
   * Takes the player to where a short-of chip's problem is fixed: scrolls it
   * into view, opens it when it is a closed disclosure, marks it for a moment
   * and moves the keyboard's focus into it. Every place a chip names is drawn
   * on every tab, the Supply strip included, so nothing has to be switched to
   * first.
   */
  function pointTo(target: ShortOfTarget): void {
    const at = anchors.get(target);
    if (at === undefined) return;
    if (at instanceof HTMLDetailsElement) at.open = true;
    at.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    // Taken off and put back so a second press marks the place again.
    at.classList.remove('is-pointed');
    void at.offsetWidth;
    at.classList.add('is-pointed');
    const focusable = at.matches('button, summary, input')
      ? at
      : at.querySelector<HTMLElement>('button:not(:disabled), summary, input:not(:disabled)');
    focusable?.focus({ preventScroll: true });
  }

  /**
   * The name band: the town's own bar across the top edge, and the one loudest
   * "you are somewhere else now" the mode has without moving the camera.
   *
   * Everything the old header carried, in the same order and the same voices:
   * the name between its ‹ and › (batch UX6), Size, hit points with
   * `maxHpLedger` on hover, and the belief badge. Then what the town is short
   * of (`renderShortOf`; the siege and unrest badges that sat beside the name
   * are two of those chips since UX6), the banks, and the six yield chips at
   * the far end where the empire's own chips sit one bar up. The empire's
   * chips give way while the mode holds (`style.css`, and it is derived from
   * the panel's own `hidden` rather than stored anywhere), so the only yields
   * on screen are this town's.
   *
   * No close cross: the way out is one button at the bottom of the screen, and
   * two exits in two corners is the thing the exit was meant to fix.
   */
  function renderBand(city: City, quote: CityReading): HTMLElement {
    const { state } = getGame();
    const band = element('div', 'city-band');
    const title = element('div', 'city-title');
    // ‹ and › either side of the name step through the seat's towns (batch UX6).
    const step = stepButtons(city);
    if (step !== null) title.append(step.previous);
    title.append(element('h2', undefined, cityDisplayName(state, city)));
    if (step !== null) title.append(step.next);
    title.append(element('span', 'city-size', `Size ${city.population}`));
    // Hit points beside population, in the same small voice — `cityMaxHp` is
    // the fold `explainCityMaxHp` breaks down, so the tooltip and the figure
    // can never disagree.
    const hp = element('span', 'city-size', `${city.hp}/${cityMaxHp(city)} hp`);
    noteOn(hp, maxHpLedger(city));
    title.append(hp);
    // What this town believes, beside its name — the 2026-08-28 ruling. The
    // full list of claims is a disclosure in the rail below; this is its answer
    // promoted to where a player actually looks. See `cityFaithHeadline`.
    const belief = renderFaithHeadline(city);
    if (belief) title.append(belief);
    band.append(title);
    // What the town is short of, in the middle of the band (batch UX6). The
    // siege and unrest badges that sat beside the name are two of these chips
    // now, so each problem is said in one place.
    band.append(renderShortOf(city, quote));
    // The banks, just left of the six chips (the user, 2026-10-12: "The
    // treasury shows on the city screen"). The top bar stands down while a town
    // is open, and a price column with no bank in sight is a column the player
    // has to leave the town to check. Written exactly as the top bar writes it,
    // the bank and then the rate in brackets (`bankFigure.ts`).
    band.append(bankLineElement(readBanks(state, localPlayerId())));
    band.append(renderYieldChips(city, quote));
    return band;
  }

  /**
   * The left rail — **the town**: what it is, read-mostly.
   *
   * Translucent parchment over a live board, ~230px, and everything in it is a
   * standing fact rather than a decision: the two clocks (growth, borders) with
   * their breakdowns on the row's own hover, the one specialists line, the note
   * about where the citizens went when there is one, the Faith card (batch
   * UX7), and the three standing sections collapsed behind their folds. The two
   * things a town spends that sit here sit beside what they spend: the levy on
   * the population line, the rites on the Faith card.
   */
  function renderTownRail(city: City, locked: boolean, quote: CityReading): HTMLElement {
    const { state } = getGame();
    const rail = element('div', 'city-rail is-left');

    // **Unrest first**, while it lasts (batch WC1): it is the reason every other
    // figure on this screen reads nought, and the one clock its owner can hurry.
    const unrest = renderUnrest(city);
    if (unrest) rail.append(unrest);

    const clocks = element('div', 'city-card');
    clocks.append(renderGrowth(city, quote));
    // Under growth, because the two are the town's two clocks and the slower
    // one reads as the ground under the faster.
    clocks.append(renderBorders(city, quote));
    // And under both of them the one control that moves them: where this town's
    // people are pointed, and whether it may grow at all.
    clocks.append(renderFocusPane(city, locked));
    rail.append(clocks);

    // Why the citizens moved, when they have — one short line, and nothing at
    // all while the town is simply growing. Directly under the working count it
    // is a note about.
    const focus = renderCitizenFocus(city);
    if (focus) {
      const card = element('div', 'city-card');
      card.append(focus);
      rail.append(card);
    }

    // And which of those citizens are not standing on a hex at all (Entry
    // XLVIII) — one row, absent until a town has a guild.
    const guilds = renderSpecialists(city, locked);
    if (guilds) {
      const card = element('div', 'city-card');
      card.append(guilds);
      rail.append(card);
    }

    // What the town believes and the rites it may keep (batch UX7). The levy
    // that had a card here stands on the Growth card's population line now.
    const faith = renderFaithCard(city);
    if (faith) rail.append(faith);

    // The standing facts, collapsed. Every one of them keeps its whole contents
    // — this is the no-deletion rule's load-bearing case.
    const standing = element('div', 'city-card city-discs');
    const rows = defenseRows(state, city);
    const defence = disclosure('Defence', figure(defenseTotal(rows)), renderDefense(city));
    if (defence) {
      standing.append(defence);
      anchors.set('defence', defence);
    }
    const built = disclosure('Built', figure(city.buildings.length), renderBuilt(city));
    if (built) standing.append(built);
    // The routes summary counts the caravans this town is an end of; the empire
    // figure that answers "why can I not start another" (`routeSlotsLine`) rides
    // the summary's hover and is printed again in full inside.
    const routes = renderRoutes(city);
    if (routes) {
      const runs = cityRouteRows(state, city).length;
      const shelf = disclosure('Routes', runs === 0 ? '—' : figure(runs), routes);
      if (shelf) {
        const summary = shelf.querySelector('summary');
        if (summary !== null) noteOn(summary, routeSlotsLineOf(state, localPlayerId()));
        standing.append(shelf);
      }
    }
    if (standing.childElementCount > 0) rail.append(standing);
    return rail;
  }

  /**
   * The right rail — **the work**: the one decision this screen exists for.
   *
   * The audit's first failure was that this decision was cut in half — the
   * queue mid-column, the choose-list at the very bottom with three read-mostly
   * sections between them. Here they are one rail, in the order the decision is
   * made: what is being built, what is behind it, and what may be added.
   */
  function renderWorkRail(
    city: City,
    locked: boolean,
    puppet: boolean,
    quote: CityReading,
    notice: string | null,
  ): HTMLElement {
    const { state } = getGame();
    const rail = element('div', 'city-rail is-right');

    // A command this panel sent that the reducer refused, in the reducer's own
    // words (`refused`). First in the rail and held at its top while the rail
    // scrolls, so it is in view wherever the press was made.
    if (notice !== null) rail.append(refusalLineElement(notice, 'command'));

    const now = element('div', 'city-card');
    now.append(renderProduction(city, locked, quote));
    const queue = renderQueue(city, locked, quote);
    if (queue) now.append(queue);
    rail.append(now);

    const add = element('div', 'city-card');
    add.append(renderBuildables(city, locked, quote));
    rail.append(add);

    // What a seized town is, and the two decisions about it — with the rail it
    // explains being locked.
    const held = renderPuppet(city);
    if (held) rail.append(held);

    // A town in unrest builds nothing until it is pacified (batch WC1), whatever
    // its queue says, so the rail says so before anything else.
    if (city.unrest !== undefined) {
      rail.append(element('p', 'hint', 'In unrest: nothing is built here until the town is pacified.'));
    }
    if (puppet) {
      rail.append(
        element('p', 'hint', 'A conquered town chooses for itself what to build.'),
      );
    } else if (locked) {
      rail.append(element('p', 'hint', `Turn ${state.turn} ended · production locked`));
    }
    return rail;
  }

  /**
   * The one instruction on the screen, and only while somebody wants it.
   *
   * It used to print under every city panel forever, which is the surest way to
   * make an instruction invisible. Two readers are left and both are asking the
   * question it answers: a player being taught (the guide is up), and a player
   * who has armed Buy Tiles, whose whole mode is clicking hexes.
   */
  function renderBoardCaption(city: City): HTMLElement | null {
    const { state } = getGame();
    if (isBuyMode()) {
      const caption = element(
        'p',
        'city-board-caption',
        // Leads with the treasury a tag's price is checked against, because in
        // this one mode the prices are on the board rather than beside a bank.
        `${figure(playerById(state, localPlayerId())?.gold ?? 0)}${YIELD_GLYPH.gold} on hand · ` +
          'every price on the board is what that hex costs now · Esc stops buying',
      );
      // **Why a plate shows a dash** (batch UX7b). A plate the treasury is short
      // for says "need N" on the board itself; one refused for anything else is
      // a dash, and its reason is said here, once. The reasons are the tile
      // gate's own sentences, read off the same offers the plates are drawn from.
      const barred = new Set<string>();
      for (const offer of purchasableTiles(state, city)) {
        if (offer.error !== null && offer.shortfall === null) barred.add(offer.error);
      }
      for (const reason of barred) {
        caption.append(element('span', 'city-board-caption-why wanting', reason));
      }
      return caption;
    }
    if (!isTutorialActive()) return null;
    return element(
      'p',
      'city-board-caption',
      // The board draws a *ring* on every worked hex and has since the overlay
      // pass — bone white where the assignment chose the tile, the seat's own
      // ink where the player pinned it (`overlays.ts`).
      'A ringed hex is a tile this city works. Click one to pin a citizen ' +
        'there, or any other hex in the radius to move one to it. A unit ' +
        'standing in the radius is selected by clicking its badge.',
    );
  }

  /**
   * The way out: one wide button at the bottom centre, and the mode's whole
   * answer to "how do I get back to the world".
   *
   * The panel's little × is gone with the panel. A cross in a corner is right
   * for a card sitting on a board; it is wrong for a mode that has taken the
   * whole screen, which is the reading the 2026-09-03 ruling made. Escape does
   * the same thing and says so on the button (`controls.ts` owns the key — one
   * Escape listener for the whole board, and this is the same verb it calls).
   */
  function renderLeave(): HTMLElement {
    const leave = element('button', 'city-leave');
    leave.type = 'button';
    leave.append(document.createTextNode('Leave the town '));
    leave.append(element('kbd', 'btn-key', 'Esc'));
    noteOn(leave, 'Back to the world (Esc)');
    leave.addEventListener('click', onClose);
    return leave;
  }

  // --- the whole panel -----------------------------------------------------

  function render(): void {
    const city = getCity();
    // Nothing the panel prints has changed since the last render: skip the
    // rebuild. `updatePanel` in `main.ts` runs after every selection, hover-free
    // refresh and dispatch, often two or three times in a row, and a large
    // town's panel took tens of milliseconds to rebuild each time. See
    // `panelRenderKey` for what counts as a change.
    const { state: drawing } = getGame();
    // A refusal belongs to the town it was refused in: another town open means
    // it is forgotten, so coming back does not raise it again. While the same
    // town stays open it shows only at the revision it was refused at, so any
    // accepted command hides it. See `refused`.
    if (refused !== null && (city === null || refused.cityId !== city.id)) refused = null;
    // A pinned chip belongs to its town too, and goes the same way.
    if (pinnedChip !== null && (city === null || pinnedChip.cityId !== city.id)) {
      pinnedChip = null;
      holdEscape(false);
    }
    const notice =
      refused !== null && refused.revision === drawing.revision ? refused.text : null;
    const key =
      city === null
        ? null
        : panelRenderKey(drawing, city, localPlayerId(), isBuyMode(), isTutorialActive(), notice);
    if (key !== null && drawing === drawnState && key === drawnKey) return;
    drawnState = drawing;
    drawnKey = key;
    // How far each rail was scrolled, kept across the rebuild while the same
    // town stays open (batch UX7: the work rail jumped back to the top after
    // every press, which on a long list lost the row just pressed).
    const scrolled = railScroll(city);
    // Every anchor in this panel is about to stop existing, and an open card
    // would be left pointing at a row that has gone. See `infoCard.ts`.
    info.hide();
    container.replaceChildren();
    // The cards over the work rail and the short-of chips' places are drawn
    // afresh below.
    chipCard = null;
    rowCard = null;
    rowCardAnchor = null;
    anchors = new Map();
    container.className = 'city-mode';
    container.hidden = city === null;
    if (!city) return;

    const { state } = getGame();
    // A finished seat may read its cities but not re-plan them; the reducer
    // would refuse, so the buttons say so first.
    //
    // **A puppet is locked the same way, and for a different reason** (the war
    // ruling, 9b: production visible but uncontrollable). It is a lock of the
    // *interface's* alone — the reducer deliberately accepts a queue for a
    // puppet, because under the ruling a puppet builds what the seat's own
    // appraisal picks and that arrives as an ordinary logged command. So the
    // one flag covers both, and the hint in the work rail says which it is.
    const puppet = city.puppet === true && city.ownerId === localPlayerId();
    const locked = hasEndedTurn(state, localPlayerId()) || puppet;

    // One photograph of the town, spent inside this render and never kept —
    // see `CityReading`. Everything below reads the sim fresh through it; nothing
    // survives to the next render, which is what keeps a slotted Order, a rite
    // or a religion arriving in the town from leaving a stale panel behind.
    // **The town's own published list**, remembered on `state.revision` and
    // shared with the top bar, the Ledger, the ghost-diff and the bot (batch
    // E2) — so the panel's figures and the strip's chip are the same fold and
    // not two folds that agree. A render is one revision, which is precisely
    // this quote's stated lifetime.
    const quote = readCity(state, city);

    // The band owns the top edge, the town is on the left, the work is on the
    // right, and the way out is at the bottom. The container itself takes no
    // pointer events at all — the board underneath stays live, which is the
    // whole point of a mode rather than a sheet: citizens are still pinned by
    // clicking hexes and tiles are still bought off the board.
    //
    // **The band and the rails are one column in flow** rather than three boxes
    // hung off the viewport's corners, and that is a fix rather than a
    // preference (playtest, 2026-09-03: "the build queue overlaps with the top
    // bar"). The rails' top used to be `topbar + a stylesheet's guess at the
    // band's height`, which was right at one window width and put the work rail
    // through the chips at every other. In flow the band takes what it needs and
    // the row below starts where it actually ends, at every width there is.
    // The chips' card first, so the chips the band draws have it to fill.
    chipCard = element('div', 'city-chip-card');
    chipCard.id = CHIP_CARD_ID;
    chipCard.hidden = true;
    // And the build rows' card (batch UX7), drawn over the chips' card so a
    // row hovered under a pinned list still shows its own.
    rowCard = element('div', 'city-row-card');
    rowCard.hidden = true;
    container.append(renderBand(city, quote));
    const body = element('div', 'city-body');
    const townRail = renderTownRail(city, locked, quote);
    const workRail = renderWorkRail(city, locked, puppet, quote, notice);
    body.append(townRail, workRail);
    // Over the work rail and never over the board: the cards are placed
    // against the rail's own edge (`.city-chip-card`, `.city-row-card`).
    body.append(chipCard, rowCard);
    container.append(body);
    // Back where the player left them, now the rails are laid out.
    if (scrolled !== null) {
      townRail.scrollTop = scrolled.town;
      workRail.scrollTop = scrolled.work;
    }
    // A row's card belongs to where the row was; a scroll moves the row.
    workRail.addEventListener('scroll', () => hideRowCard());
    if (pinnedChip !== null) showChipCard(pinnedChip.key);
    // Out of the flow, both of them: they sit against the bottom of the screen
    // rather than after the rails, and the row above must not shorten to make
    // room for something that is over the board anyway.
    const caption = renderBoardCaption(city);
    if (caption) container.append(caption);
    container.append(renderLeave());
  }

  /**
   * How far the two rails of the drawn panel are scrolled, when the town drawn
   * is `city`; `null` for another town, which opens at the top.
   */
  function railScroll(city: City | null): { town: number; work: number } | null {
    if (city === null || drawnCityId !== city.id) {
      drawnCityId = city?.id ?? null;
      return null;
    }
    const town = container.querySelector<HTMLElement>('.city-rail.is-left');
    const work = container.querySelector<HTMLElement>('.city-rail.is-right');
    return { town: town?.scrollTop ?? 0, work: work?.scrollTop ?? 0 };
  }

  return { render };
}

/**
 * The build list's "what if" previews, kept for as long as the world has not
 * moved: same state object, same `state.revision`, same town.
 *
 * Each preview folds the town twice (with and without the building), and the
 * list asks for one per building row, so a render of a large town spent about a
 * third of its time here. The panel renders again on tab and buy-mode clicks,
 * none of which change the state. `explainBuildingPreview` is a pure function
 * of the state, and the revision moves on every accepted command and every
 * end-of-turn phase, so a kept list is the list the sim would return. The
 * figures printed are still the fold of that list (rule 5).
 *
 * Exported so the core tests can check, without a document, that a kept list
 * equals a fresh one and that a new revision drops it.
 */
export function createBuildingPreviewMemo(): (
  state: GameState,
  city: City,
  id: BuildingId,
  quote: CityReading,
) => BuildingPreviewLine[] {
  let stamp: { state: GameState; revision: number; cityId: number } | null = null;
  const kept = new Map<BuildingId, BuildingPreviewLine[]>();
  return (state, city, id, quote) => {
    if (stamp === null || stamp.state !== state || stamp.revision !== state.revision ||
        stamp.cityId !== city.id) {
      kept.clear();
      stamp = { state, revision: state.revision, cityId: city.id };
    }
    let lines = kept.get(id);
    if (lines === undefined) {
      lines = explainBuildingPreview(state, city, id, quote);
      kept.set(id, lines);
    }
    return lines;
  };
}

/**
 * Everything the city panel's render reads besides the state object, as one
 * string. Two renders with the same key on the same state draw the same panel,
 * so the second is skipped.
 *
 * - `state.revision`: moves on every accepted command and every end-of-turn
 *   phase, so it covers the town, the empire, the treasury and the turn
 *   (including whether the seat has ended it, which locks the panel);
 * - the town, the seat looking at it, the seat's build-list tab (`addTabFor`), buy mode
 *   and whether the guide is up (the board caption reads the last two);
 * - the line for a command the reducer just refused (batch UX5). A refusal
 *   leaves the revision where it was, so without this term the line would not
 *   appear until something else changed.
 *
 * Open disclosures are not in the key: the browser toggles a `<details>` in
 * place, so the drawn panel already shows them. A new input to the panel must
 * be added here, or the panel stays stale until the next command.
 * `test/ui/cityPanelRefresh.test.ts` pins the terms.
 */
export function panelRenderKey(
  state: GameState,
  city: City,
  seat: number,
  buyMode: boolean,
  tutorialActive: boolean,
  notice: string | null = null,
): string {
  return [
    state.revision,
    city.id,
    seat,
    addTabFor(seat),
    buyMode ? 'buy' : '',
    tutorialActive ? 'guide' : '',
    notice ?? '',
  ].join('|');
}
