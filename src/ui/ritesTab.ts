/**
 * The faith sheet's Rites tab (batch UX9): your towns as rows, the rites you
 * know as a strip of chips above them, and rite mode.
 *
 * The spec is `docs/plans/faith-screen-f1.md`, Tab 1, with the user's rulings
 * of 2026-10-12 recorded there and in `docs/flags.md` (ssssss) point 4. The
 * drawing is `docs/plans/mockups/faith-f1.html`; its Rites tab is a working
 * prototype, and this module behaves as it does.
 *
 * What a player sees
 * ------------------
 *   - A strip of chips, one per live rite. A rite this empire knows is a chip
 *     that can be pressed, with its yield mark and "kept in N". A rite it does
 *     not know is greyed, names what teaches it, and cannot be pressed.
 *   - The towns as rows about 30px tall: towns keeping no rite first, in
 *     founding order, then towns keeping one, soonest free first.
 *   - With no rite selected, each free town has a "Start a rite" menu: every
 *     rite with what it would add in that town and its price, a rite the
 *     empire lacks greyed with what teaches it, and at the foot what is left
 *     after this one and when the next is affordable.
 *   - Pressing a chip turns on rite mode. The free towns are ranked by what that
 *     rite would add in each, best first, and each row gets a one-click
 *     "Start · 72" button: the button carries the price and there is no confirm
 *     (the user's ruling). Once the bank cannot pay for another, every button
 *     shows "short N". Pressing the chip again, or Escape, leaves rite mode.
 *   - At the foot, the faith line (the bank, what this visit started, and what
 *     the bank affords now and next turn) and the prophet's rite over the whole
 *     realm.
 *
 * How it is split
 * ---------------
 * Three layers, so the parts that can be quietly wrong are tested without a
 * document (the suite has none, `vite.config.ts`):
 *
 *   1. the conversation, `RitesView`: which rite is selected, which town's menu
 *      is open, and what this visit started. Plain data, changed only by the
 *      pure functions below it (`selectRite`, `toggleTownMenu`, `escapeRites`,
 *      `ritesViewForTown`, `noteRiteStarted`, `noteRealmRite`);
 *   2. the model, `ritesTabModel`: everything the tab shows, read from the game
 *      state and the conversation. Pure;
 *   3. the drawing, `drawRitesTab`: elements built from the model. It decides
 *      nothing; every click calls one of the handlers the sheet hands in.
 *
 * Every figure and refusal is the simulation's: the price is `riteCostFor`, the
 * gate is `riteGate` (its sentence, and its shortfall when the bank is all that
 * is short), "would add" is `explainRitePreview`, the ranking voice is
 * `riteVoicesByGain`, the turns are `riteTurnsFor` and `cityRiteTurnsLeft`, what
 * a kept rite pays now is the town's own lines carrying the rite (`readCity`),
 * and the prophet's rite is `empireRiteGate`. A start is one `performRite`
 * command, sent by the page through `controls.performRite`; the tab never
 * changes the state itself.
 */

import {
  type CardImpactLine,
  type CardImpactSheet,
  explainRitePreview,
  foldCardImpact,
  foldCardOccasions,
  riteVoicesByGain,
} from '../sim/cardImpact';
import { capitalCityOf } from '../sim/cities';
import { explainPurchaseCost } from '../sim/purchase';
import { readCity, readEmpire } from '../sim/readings';
import {
  type NextRung,
  availableRites,
  chargeCostWords,
  cityRite,
  cityRiteTurnsLeft,
  empireRiteGate,
  explainNextRung,
  isProphet,
  type RiteGateAnswer,
  riteCostFor,
  riteGate,
  riteTurnsFor,
} from '../sim/religion';
import { LIVE_RITE_IDS, type RiteId, riteDef } from '../sim/religionData';
import { CITY_YIELD_KEYS, type CityYieldKey } from '../sim/resourceData';
import {
  type City,
  type GameState,
  cityReligion,
  foundedReligion,
  hasEndedTurn,
  playerById,
} from '../sim/state';
import { UNIT_TYPE_IDS, type UnitTypeId, unitDef } from '../sim/unitData';
import { cityDisplayName } from './cityDisplay';
import { element } from './dom';
import { YIELD_GLYPH, YIELD_NAME, netFigure, signedFigure } from './figures';
import { setDescriptorText } from './keywords';
import { type PriceLook, priceCellElement, priceLook } from './priceCell';
import { type RefusalHeadLine, type RefusalPlace, planRefusals, refusalLineElement } from './refusalLine';
import { setYieldText } from './yieldMark';
import {
  riteClauseWords,
  riteSays,
  riteTeacherName,
  riteTeacherShortName,
} from './riteWords';

// --- the conversation ---------------------------------------------------------

/** One rite started from this sheet. */
export interface RiteStart {
  cityId: number;
  rite: RiteId;
}

/**
 * The starts the faith line can account for: the bank before the first of
 * them, the bank after the latest, and what was started in between. A start
 * made after the bank moved some other way (a purchase on another tab) begins
 * a new run, so "was 137" is never a figure the line cannot explain.
 */
export interface RitesRun {
  before: number;
  after: number;
  starts: RiteStart[];
  /** A rite the prophet said over the whole realm in this run, if any. */
  realm: RiteId | null;
}

/**
 * What one visit to the sheet has done. A visit is one opening of the sheet on
 * one turn: `freshRitesView` starts it, and a visit from an earlier turn is
 * over the moment it is read on a later one (`visitOn`).
 */
export interface RitesVisit {
  turn: number;
  /**
   * Every rite started from this sheet on this visit, oldest first, including
   * each town a prophet's rite landed on. These towns are marked "started now"
   * and lead the kept group.
   */
  started: RiteStart[];
  run: RitesRun | null;
}

/**
 * The Rites tab's conversation: which rite is selected, which town's menu is
 * open, and what this visit has started.
 *
 * It is a fact about the person at the keyboard rather than about the game, so
 * the sheet keeps it and nothing saves it, the same bargain as the city
 * screen's add-list tab (`cityPanel.ts`). A fresh one is made each time the
 * sheet opens.
 */
export interface RitesView {
  /** The rite whose chip is lit (rite mode), or `null`. */
  selected: RiteId | null;
  /** The free town whose "Start a rite" menu is open, or `null`. Never set in rite mode. */
  menuCityId: number | null;
  /**
   * The town the city screen asked about (`ritesViewForTown`). Its row is
   * marked and scrolled into view; it is cleared by the next thing the player
   * does on the tab.
   */
  focusCityId: number | null;
  visit: RitesVisit;
}

function emptyVisit(turn: number): RitesVisit {
  return { turn, started: [], run: null };
}

/** The conversation as the sheet opens: no rite selected, no menu open, nothing started. */
export function freshRitesView(turn: number): RitesView {
  return { selected: null, menuCityId: null, focusCityId: null, visit: emptyVisit(turn) };
}

/** The visit as it stands on `turn`. A visit from an earlier turn is over. */
export function visitOn(view: RitesView, turn: number): RitesVisit {
  return view.visit.turn === turn ? view.visit : emptyVisit(turn);
}

/**
 * A press on a rite's chip: rite mode on for that rite, or off when that rite
 * is already selected (the user's ruling of 2026-10-12, "selecting the same
 * rite again leaves rite mode"). Rite mode has no menus, so an open one closes.
 */
export function selectRite(view: RitesView, rite: RiteId): RitesView {
  return {
    ...view,
    selected: view.selected === rite ? null : rite,
    menuCityId: null,
    focusCityId: null,
  };
}

/** A press on a free town's "Start a rite": its menu opens, or closes if it was open. One at a time. */
export function toggleTownMenu(view: RitesView, cityId: number): RitesView {
  return {
    ...view,
    selected: null,
    menuCityId: view.menuCityId === cityId ? null : cityId,
    focusCityId: null,
  };
}

/**
 * Escape on the Rites tab. It leaves rite mode first, then closes an open menu,
 * and only then lets the sheet close (the user's ruling: "Escape leaves rite
 * mode"). Returns the new conversation, or `null` when there is nothing left to
 * leave and the key belongs to the sheet.
 */
export function escapeRites(view: RitesView): RitesView | null {
  if (view.selected !== null) return { ...view, selected: null, focusCityId: null };
  if (view.menuCityId !== null) return { ...view, menuCityId: null, focusCityId: null };
  return null;
}

/**
 * The city screen's way in (`ReligionScreen.openRitesFor`): no rite selected,
 * and that town's menu open. A town keeping a rite has no menu, so its row is
 * only marked and brought into view.
 */
export function ritesViewForTown(view: RitesView, cityId: number): RitesView {
  return { ...view, selected: null, menuCityId: cityId, focusCityId: cityId };
}

/** The run a new start joins: the current one if the bank has not moved since, otherwise a new one. */
function runFrom(visit: RitesVisit, before: number): RitesRun {
  const run = visit.run;
  if (run !== null && run.after === before) return run;
  return { before, after: before, starts: [], realm: null };
}

/**
 * A rite this sheet started, recorded after the command was taken. Rite mode
 * stays on, so the next town down the list is one more click. An open menu
 * closes, because its town is no longer free.
 */
export function noteRiteStarted(
  view: RitesView,
  turn: number,
  start: RiteStart,
  bankBefore: number,
  bankAfter: number,
): RitesView {
  const visit = visitOn(view, turn);
  const run = runFrom(visit, bankBefore);
  return {
    ...view,
    menuCityId: null,
    focusCityId: null,
    visit: {
      turn,
      started: [...visit.started, start],
      run: { ...run, after: bankAfter, starts: [...run.starts, start] },
    },
  };
}

/**
 * A rite the prophet said over the whole realm from this sheet, recorded after
 * the command was taken, with every town it landed on.
 */
export function noteRealmRite(
  view: RitesView,
  turn: number,
  rite: RiteId,
  cityIds: readonly number[],
  bankBefore: number,
  bankAfter: number,
): RitesView {
  const visit = visitOn(view, turn);
  const run = runFrom(visit, bankBefore);
  return {
    ...view,
    menuCityId: null,
    focusCityId: null,
    visit: {
      turn,
      started: [...visit.started, ...cityIds.map((cityId) => ({ cityId, rite }))],
      run: { ...run, after: bankAfter, realm: rite },
    },
  };
}

// --- the readings the tab pays for --------------------------------------------

/**
 * The two readings that cost a ghost of the whole empire each.
 *
 * `explainRitePreview` reads the whole realm with one town wearing the rite and
 * diffs it, which is what lets it count pay that lands outside the town. That
 * costs about 25ms on a nine-town empire at turn 130 (measured on the audit's
 * seed 4242 game), so the sheet keeps the answers for as long as the board is
 * unchanged (`createRiteReadingCache`) and asks only what it shows: one rite in
 * every free town in rite mode, every rite in one town for an open menu.
 */
export interface RitesReadings {
  /** `explainRitePreview` for one town and one rite. Asked only of free towns. */
  preview(cityId: number, rite: RiteId): readonly CardImpactLine[];
  /** The voice a rite's chip wears its mark in, or `null` for a rite that adds no yield. */
  voice(rite: RiteId): CityYieldKey | null;
}

/** The largest voice in a set of figures that is above zero, ties in the six voices' order. */
function largestVoice(figures: Readonly<Record<CityYieldKey, number>>): CityYieldKey | null {
  let best: CityYieldKey | null = null;
  for (const key of CITY_YIELD_KEYS) {
    if (figures[key] <= 0) continue;
    if (best === null || figures[key] > figures[best]) best = key;
  }
  return best;
}

/** What one town's own lines carrying this rite pay now: `readCity`'s lines, summed. */
export function ritePaysNow(state: GameState, city: City, rite: RiteId): Record<CityYieldKey, number> {
  const pays = { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
  for (const line of readCity(state, city).lines) {
    if (line.card !== rite) continue;
    for (const key of CITY_YIELD_KEYS) pays[key] += line[key];
  }
  return pays;
}

/** How many towns a chip's voice probes with a preview before it gives up. */
const VOICE_PROBES = 2;

/**
 * The voice a rite's chip is marked with.
 *
 *   1. If a town of this seat keeps the rite, the voice its own lines pay most
 *      in (`ritePaysNow`). This is free: the town's reading is already taken.
 *   2. Otherwise the rite is previewed in up to two towns, free towns first,
 *      and the voice it adds most to a turn (`riteVoicesByGain`) is the mark.
 *      A rite that adds nothing a turn but gives something once (the
 *      offering's production) is marked by what it gives.
 *   3. `null` when neither finds a yield: Blessing of Arms, for one.
 */
export function riteChipVoice(
  state: GameState,
  seat: number,
  rite: RiteId,
  preview: (cityId: number, rite: RiteId) => readonly CardImpactLine[],
): CityYieldKey | null {
  const towns = state.cities.filter((city) => city.ownerId === seat);
  const kept = { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
  for (const city of towns) {
    if (cityRite(state, city) !== rite) continue;
    const pays = ritePaysNow(state, city, rite);
    for (const key of CITY_YIELD_KEYS) kept[key] += pays[key];
  }
  const fromKept = largestVoice(kept);
  if (fromKept !== null) return fromKept;
  const order = [
    ...towns.filter((city) => cityRite(state, city) === null),
    ...towns.filter((city) => cityRite(state, city) !== null),
  ];
  for (const city of order.slice(0, VOICE_PROBES)) {
    const lines = preview(city.id, rite);
    const gain = riteVoicesByGain([lines])[0];
    if (gain !== undefined) return gain;
    const once = largestVoice(foldCardOccasions(lines));
    if (once !== null) return once;
  }
  return null;
}

/**
 * The readings for one board, kept while it is unchanged: the same state
 * object, the same revision and the same seat. A start moves the revision, so
 * the previews are read again after every start: the next town's figure may
 * depend on the one before (a card that pays the capital for every town keeping
 * a rite, a happiness tier crossed).
 *
 * A chip's voice is kept for the whole game once found (a rite's kind of yield
 * does not change). A `null` is kept for the rest of the turn, so a rite that
 * found nothing in the towns it probed (Blessing of Arms finds nothing
 * anywhere) costs its two previews once a turn rather than after every start.
 */
export function createRiteReadingCache(): {
  readings(state: GameState, seat: number, sheet?: CardImpactSheet): RitesReadings;
} {
  let board: { state: GameState; revision: number; seat: number } | null = null;
  const previews = new Map<string, readonly CardImpactLine[]>();
  /** Per game: each `seat:rite` voice found, and the turn a probe last found none. */
  const voices = new WeakMap<GameState, Map<string, CityYieldKey>>();
  const noVoice = new WeakMap<GameState, Map<string, number>>();
  return {
    readings(state, seat, sheet) {
      if (board === null || board.state !== state || board.revision !== state.revision || board.seat !== seat) {
        board = { state, revision: state.revision, seat };
        previews.clear();
      }
      const preview = (cityId: number, rite: RiteId): readonly CardImpactLine[] => {
        const key = `${cityId}:${rite}`;
        let held = previews.get(key);
        if (held === undefined) {
          held = explainRitePreview(state, seat, cityId, rite, sheet);
          previews.set(key, held);
        }
        return held;
      };
      let found = voices.get(state);
      if (found === undefined) {
        found = new Map();
        voices.set(state, found);
      }
      let none = noVoice.get(state);
      if (none === undefined) {
        none = new Map();
        noVoice.set(state, none);
      }
      const known = found;
      const missing = none;
      return {
        preview,
        voice(rite) {
          const key = `${seat}:${rite}`;
          const held = known.get(key);
          if (held !== undefined) return held;
          if (missing.get(key) === state.turn) return null;
          const voice = riteChipVoice(state, seat, rite, preview);
          if (voice === null) missing.set(key, state.turn);
          else known.set(key, voice);
          return voice;
        },
      };
    },
  };
}

// --- the model ----------------------------------------------------------------

/** One voice and how much of it. */
export interface VoiceFigure {
  voice: CityYieldKey;
  amount: number;
}

/** What starting a rite in one town would add. */
export interface RiteAdds {
  /** A turn, the ranking voice first (rite mode), or every voice it adds (a menu). */
  figures: VoiceFigure[];
  /** What it gives once, the offering's production into the build. */
  once: VoiceFigure[];
  /**
   * For a rite-mode row whose rite adds no yield: the rite's clauses, so the
   * row still says what it would add (Blessing of Arms' defence).
   */
  words: string | null;
}

/** One chip of the strip. */
export interface RiteChip {
  rite: RiteId;
  name: string;
  /** True when this empire knows the rite and the chip can be pressed. */
  known: boolean;
  selected: boolean;
  /** The voice its mark is drawn in, for a known rite. */
  voice: CityYieldKey | null;
  /** How many of this seat's towns keep it now. */
  keptIn: number;
  /** For a rite the empire does not know: what teaches it, short ("The Fast") and whole. */
  teacher: string | null;
  teacherPhrase: string | null;
}

/** The line under the strip: what to do, or, in rite mode, the banner. */
export type RitesSay =
  | { kind: 'idle'; text: string }
  | {
      kind: 'mode';
      rite: RiteId;
      name: string;
      /** The rite's clauses and its turns (`riteSays`), with keyword marks. */
      says: string;
      /** How the free towns are ranked. */
      ranking: string;
      leave: string;
    };

/** One item of a free town's "Start a rite" menu. */
export interface MenuItem {
  rite: RiteId;
  name: string;
  /** `riteSays` for a rite the empire knows; for one it lacks, what teaches it. */
  says: string;
  known: boolean;
  adds: RiteAdds | null;
  /** The Start button's look, for a known rite. */
  look: PriceLook | null;
}

export interface TownMenu {
  items: MenuItem[];
  /** "After this, 65 faith is left. The next is affordable next turn." */
  foot: string;
}

/** A town keeping no rite. */
export interface FreeTown {
  cityId: number;
  name: string;
  /** "follows your faith", "follows no faith". */
  faith: string;
  /** Its place in the ranking, from 1, in rite mode. */
  rank: number | null;
  /** Rite mode: what the selected rite would add here. */
  adds: RiteAdds | null;
  /** Rite mode: the Start button's look. */
  look: PriceLook | null;
  /** Rite mode: where a refusal other than the bank's is said (`planRefusals`). */
  refusal: RefusalPlace | null;
  /** The town's menu, when it is the one open. */
  menu: TownMenu | null;
  focus: boolean;
}

/** A town keeping a rite. */
export interface KeptTown {
  cityId: number;
  name: string;
  faith: string;
  rite: RiteId;
  riteName: string;
  turnsLeft: number;
  /** The turns the bar is drawn against: what the rite would run if started now, never less than what is left. */
  turnsTotal: number;
  /** The turn it may take another rite. */
  freeOnTurn: number;
  /** What the rite pays here now, from the town's own lines. */
  pays: VoiceFigure[];
  /** For a rite that pays no yield: its clauses. */
  words: string | null;
  /** Started from this sheet on this visit. */
  startedNow: boolean;
  focus: boolean;
}

/** The faith line at the foot. */
export interface FaithLine {
  bank: number;
  /** "was 137; Rite of the Harvest started in Vaelport." when this visit started something. */
  history: string | null;
  /** "Enough for 2 rites now." or "Short 7 for another rite." */
  now: string;
  /** True when `now` says what is short, which is said in the wanting voice. */
  short: boolean;
  /** "Next turn you will have 152, enough for 2." */
  ahead: string | null;
}

/** The prophet's rite over the whole realm. */
export interface RealmLine {
  says: string;
  /** Rite mode, with a prophet who may say it: the button. */
  offer: { unitId: number; rite: RiteId; name: string; look: PriceLook } | null;
  /** Otherwise, why not, or what to do. */
  why: string | null;
  /** True when `why` is something the player lacks (no prophet, a refusal). */
  wanting: boolean;
}

/** Everything the Rites tab shows. Pure, and the whole of what a test can pin. */
export interface RitesTabModel {
  seat: number;
  turn: number;
  bank: number;
  perTurn: number;
  cost: number;
  /** The rite whose mode is on, with its name, or `null`. */
  selected: { rite: RiteId; name: string } | null;
  /** "You have ended turn 131": the Start buttons are drawn but may not be pressed. */
  paused: string | null;
  chips: RiteChip[];
  say: RitesSay;
  free: FreeTown[];
  /** The free group's right-hand note: "founding order", "best first". */
  freeNote: string;
  /** Refusals shared by several free rows in rite mode, said once at the head. */
  refusalHead: RefusalHeadLine[];
  kept: KeptTown[];
  /** The kept group's right-hand note: "soonest free first · cannot take Omen Reading until then". */
  keptNote: string;
  faith: FaithLine;
  realm: RealmLine;
  /** The tab's own count: "6 kept · 8 free". */
  count: string;
}

/**
 * The Rites tab's own count, printed on the tab itself: "6 kept · 8 free". Cheap,
 * so the sheet prints it on every tab without reading the rest of the model.
 */
export function ritesCount(state: GameState, seat: number): string {
  let kept = 0;
  let free = 0;
  for (const city of state.cities) {
    if (city.ownerId !== seat) continue;
    if (cityRite(state, city) === null) free += 1;
    else kept += 1;
  }
  return `${kept} kept · ${free} free`;
}

/** "follows your faith", "follows the Children of Sky and Wild", "follows no faith". */
export function townFaithWords(state: GameState, seat: number, city: City): string {
  const held = cityReligion(city);
  if (held === null) return 'follows no faith';
  if (foundedReligion(state, seat)?.id === held) return 'follows your faith';
  const religion = state.religions.find((one) => one.id === held);
  return religion === undefined ? 'follows another faith' : `follows ${religion.name}`;
}

/** The voices a preview adds above zero, largest first, at most `limit` of them. */
function gainFigures(lines: readonly CardImpactLine[], limit: number): VoiceFigure[] {
  const turn = foldCardImpact(lines);
  return riteVoicesByGain([lines])
    .slice(0, limit)
    .map((voice) => ({ voice, amount: turn[voice] }));
}

/** What a preview gives once, every voice above zero. */
function onceFigures(lines: readonly CardImpactLine[]): VoiceFigure[] {
  const once = foldCardOccasions(lines);
  return CITY_YIELD_KEYS.filter((key) => once[key] > 0).map((voice) => ({ voice, amount: once[voice] }));
}

/** The Start button's look for one rite in one town: the rite gate's two answers. */
function startLook(state: GameState, seat: number, cityId: number, rite: RiteId, cost: number): PriceLook {
  const gate = riteGate(state, seat, cityId, rite);
  return priceLook({ bank: 'faith', price: cost, refusal: gate.refusal, shortfall: gate.shortfall });
}

/** How many turns ahead the faith forecast looks. Beyond this the answer is "more than N turns". */
export const FORECAST_TURNS = 20;

/**
 * The faith bank at the start of each of the next `turns` turns, `[0]` being
 * now: this turn's rate added each turn, and the next god taking its rung on the
 * turn the bank first covers it. The faith ladder deals a god at the end of the
 * turn the bank reaches the rung, and spends the rung then (`openFaithLadder`),
 * so a forecast that ignored it would promise faith the ladder is about to take.
 * Only that one god is counted: the rung after it is further off than the
 * forecast needs to look.
 */
export function faithAhead(bank: number, perTurn: number, rung: NextRung, turns: number): number[] {
  const ahead = [bank];
  let held = bank;
  let god = rung.kind === 'open' ? rung.cost : null;
  for (let turn = 1; turn <= turns; turn += 1) {
    held += perTurn;
    if (god !== null && held >= god) {
      held -= god;
      god = null;
    }
    ahead.push(held);
  }
  return ahead;
}

/** The first turn ahead (from 1) on which the bank covers `cost`, or `null` within the forecast. */
function turnsUntil(ahead: readonly number[], cost: number): number | null {
  for (let turn = 1; turn < ahead.length; turn += 1) if (ahead[turn]! >= cost) return turn;
  return null;
}

/** "next turn", "in 3 turns", or what stands in for never. */
function whenWords(turns: number | null, perTurn: number): string {
  if (turns === 1) return 'next turn';
  if (turns !== null) return `in ${turns} turns`;
  return perTurn > 0 ? `in more than ${FORECAST_TURNS} turns` : 'once faith comes in';
}

/** "Vaelport", "Vaelport and Kestrel", "Vaelport, Kestrel and Larkspur". */
function listWords(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** "Rite of the Harvest started in Vaelport and Kestrel; Omen Reading started in Larkspur". */
function runWords(state: GameState, run: RitesRun): string {
  const parts: string[] = [];
  const rites: RiteId[] = [];
  for (const start of run.starts) if (!rites.includes(start.rite)) rites.push(start.rite);
  for (const rite of rites) {
    const towns = run.starts
      .filter((start) => start.rite === rite)
      .map((start) => state.cities.find((city) => city.id === start.cityId)?.name ?? 'a town');
    parts.push(`${riteDef(rite).name} started in ${listWords(towns)}`);
  }
  if (run.realm !== null) parts.push(`${riteDef(run.realm).name} said over the whole realm`);
  return parts.join('; ');
}

/** The faith line at the foot. See `FaithLine`. */
export function faithLineFor(
  state: GameState,
  seat: number,
  visit: RitesVisit,
  bank: number,
  perTurn: number,
  cost: number,
): FaithLine {
  const run = visit.run;
  const history =
    run !== null && run.after === bank && (run.starts.length > 0 || run.realm !== null)
      ? `was ${netFigure(run.before)}; ${runWords(state, run)}.`
      : null;
  const can = cost > 0 ? Math.floor(bank / cost) : 0;
  const started = visit.started.length > 0;
  const short = can < 1;
  const now = short
    ? `Short ${Math.max(1, Math.ceil(cost - bank))} for ${started ? 'another' : 'a'} rite.`
    : `Enough for ${can} ${can === 1 ? 'rite' : 'rites'} now.`;
  const rung = explainNextRung(state, seat, perTurn);
  const ahead = faithAhead(bank, perTurn, rung, FORECAST_TURNS);
  const next = ahead[1]!;
  const god = rung.kind === 'open' && bank + perTurn >= rung.cost ? rung.cost : null;
  const godWords = god === null ? '' : ` after the next god takes ${god}`;
  let aheadWords: string | null;
  if (perTurn <= 0 && god === null) {
    aheadWords = 'No faith is coming in a turn.';
  } else {
    const then = cost > 0 ? Math.floor(next / cost) : 0;
    if (then >= 1) {
      aheadWords = `Next turn you will have ${netFigure(next)}${godWords}, enough for ${then}.`;
    } else {
      const when = whenWords(turnsUntil(ahead, cost), perTurn);
      aheadWords = `Next turn you will have ${netFigure(next)}${godWords}; the next rite is affordable ${when}.`;
    }
  }
  return { bank, history, now, short, ahead: aheadWords };
}

/** A town's menu foot: what is left after one more rite, and when the next is affordable. */
function menuFoot(state: GameState, seat: number, bank: number, perTurn: number, cost: number): string {
  const rung = explainNextRung(state, seat, perTurn);
  if (bank >= cost) {
    const left = bank - cost;
    const after = `After this, ${netFigure(left)} faith is left.`;
    if (left >= cost) return `${after} Enough for another.`;
    const when = whenWords(turnsUntil(faithAhead(left, perTurn, rung, FORECAST_TURNS), cost), perTurn);
    return `${after} The next is affordable ${when}.`;
  }
  const when = whenWords(turnsUntil(faithAhead(bank, perTurn, rung, FORECAST_TURNS), cost), perTurn);
  return `You have ${netFigure(bank)}; a rite costs ${cost}. Affordable ${when}.`;
}

/** The unit type the roster marks as the prophet (`UnitDef.prophesies`), never a name. */
function prophetType(): UnitTypeId | null {
  return UNIT_TYPE_IDS.find((id) => unitDef(id).prophesies === true) ?? null;
}

/** The prophet's rite over the whole realm. See `RealmLine`. */
function realmLineFor(
  state: GameState,
  seat: number,
  selected: RiteId | null,
  cost: number,
  keptRites: readonly RiteId[],
): RealmLine {
  // Which kept rites it would replace, each with how many towns keep it, in the
  // order the towns were founded.
  const counts: { rite: RiteId; towns: number }[] = [];
  for (const rite of keptRites) {
    const held = counts.find((entry) => entry.rite === rite);
    if (held === undefined) counts.push({ rite, towns: 1 });
    else held.towns += 1;
  }
  const replaces =
    counts.length === 0
      ? ''
      : ` It replaces the rites your towns are keeping: ${counts
          .map((entry) => `${riteDef(entry.rite).name} in ${entry.towns} ${entry.towns === 1 ? 'town' : 'towns'}`)
          .join(', ')}.`;
  const says = `A prophet says one rite in every town at once, for ${chargeCostWords('empireRite')} and ${cost} faith paid once.${replaces}`;
  const prophets = state.units.filter((unit) => unit.ownerId === seat && isProphet(unit));
  if (prophets.length === 0) {
    const type = prophetType();
    const town = capitalCityOf(state, seat) ?? state.cities.find((city) => city.ownerId === seat);
    const price =
      type === null || town === undefined
        ? null
        : explainPurchaseCost(state, seat, town.id, { kind: 'unit', id: type }, 'faith');
    return {
      says,
      offer: null,
      why: price === null ? 'You have no prophet.' : `You have no prophet (${price.total} faith).`,
      wanting: true,
    };
  }
  if (selected === null) {
    const who = prophets.length === 1 ? 'your prophet' : `one of your ${prophets.length} prophets`;
    return { says, offer: null, why: `Pick a rite above to say it over the realm with ${who}.`, wanting: false };
  }
  // The prophet the button uses: the first the gate takes, else the first only
  // the bank stops (its button shows "short N"), else no button and the first
  // prophet's refusal in the gate's own words.
  let shortOf: { unitId: number; gate: RiteGateAnswer } | null = null;
  for (const prophet of prophets) {
    const gate = empireRiteGate(state, seat, prophet.id, selected);
    const offer = (look: PriceLook): RealmLine => ({
      says,
      offer: { unitId: prophet.id, rite: selected, name: riteDef(selected).name, look },
      why: null,
      wanting: false,
    });
    if (gate.refusal === null) return offer(priceLook({ bank: 'faith', price: cost, ...gate }));
    if (gate.shortfall !== null && shortOf === null) shortOf = { unitId: prophet.id, gate };
  }
  if (shortOf !== null) {
    return {
      says,
      offer: {
        unitId: shortOf.unitId,
        rite: selected,
        name: riteDef(selected).name,
        look: priceLook({ bank: 'faith', price: cost, ...shortOf.gate }),
      },
      why: null,
      wanting: false,
    };
  }
  return {
    says,
    offer: null,
    why: empireRiteGate(state, seat, prophets[0]!.id, selected).refusal,
    wanting: true,
  };
}

/**
 * Everything the Rites tab shows, for one seat and one conversation.
 *
 * The order of the rows is the user's: free towns first, in founding order
 * (`state.cities` order, which is the order every phase walks), then towns
 * keeping a rite, soonest free first, with this visit's starts at the head of
 * that group marked "started now". In rite mode the free towns are ranked by
 * the selected rite's main voice (`riteVoicesByGain`, the ruled ranking), best
 * first, ties in founding order; a rite that adds the same in every free town
 * (no yield at all, or the same figure everywhere) keeps founding order, and the
 * banner says so.
 */
export function ritesTabModel(
  state: GameState,
  seat: number,
  view: RitesView,
  readings: RitesReadings,
): RitesTabModel {
  const player = playerById(state, seat);
  const bank = player?.faithPool ?? 0;
  const perTurn = readEmpire(state, seat).totals.faith;
  const cost = riteCostFor(state, seat);
  const paused = hasEndedTurn(state, seat) ? `You have ended turn ${state.turn}` : null;
  const known = new Set<RiteId>(availableRites(state, seat));
  const visit = visitOn(view, state.turn);
  const towns = state.cities.filter((city) => city.ownerId === seat);
  const keeping = new Map<number, RiteId>();
  for (const city of towns) {
    const rite = cityRite(state, city);
    if (rite !== null) keeping.set(city.id, rite);
  }
  const selected = view.selected !== null && known.has(view.selected) ? view.selected : null;

  // The strip: the rites this empire knows, in table order, then the ones it
  // lacks, greyed.
  const chips: RiteChip[] = [];
  for (const rite of [...LIVE_RITE_IDS.filter((id) => known.has(id)), ...LIVE_RITE_IDS.filter((id) => !known.has(id))]) {
    const isKnown = known.has(rite);
    let keptIn = 0;
    for (const held of keeping.values()) if (held === rite) keptIn += 1;
    chips.push({
      rite,
      name: riteDef(rite).name,
      known: isKnown,
      selected: rite === selected,
      voice: isKnown ? readings.voice(rite) : null,
      keptIn,
      teacher: isKnown ? null : riteTeacherShortName(rite),
      teacherPhrase: isKnown ? null : riteTeacherName(rite),
    });
  }

  // The free towns, in founding order, then ranked in rite mode.
  const freeTowns = towns.filter((city) => !keeping.has(city.id));
  let ranked = freeTowns;
  /** True when the free towns are ranked (and numbered) by the selected rite. */
  let ranks = false;
  let main: CityYieldKey | null = null;
  let second: CityYieldKey | null = null;
  const previews = new Map<number, readonly CardImpactLine[]>();
  if (selected !== null) {
    for (const city of freeTowns) previews.set(city.id, readings.preview(city.id, selected));
    const voices = riteVoicesByGain([...previews.values()]);
    main = voices[0] ?? null;
    second = voices[1] ?? null;
    if (main !== null) {
      const voice = main;
      const gain = (city: City): number => foldCardImpact(previews.get(city.id)!)[voice];
      // `Array.prototype.sort` is stable, so equal gains keep founding order.
      ranked = [...freeTowns].sort((a, b) => gain(b) - gain(a));
      // A rite that adds the same in every free town ranks nothing. A card that
      // pays for every town keeping a rite can give Blessing of Arms a yield,
      // but the same yield in every town, and the mockup keeps Blessing of Arms
      // in founding order. A single free town is still ranked first.
      const gains = freeTowns.map(gain);
      ranks = freeTowns.length < 2 || Math.max(...gains) - Math.min(...gains) > 1e-9;
    }
  }
  const looks = new Map<number, PriceLook>();
  if (selected !== null) {
    for (const city of ranked) looks.set(city.id, startLook(state, seat, city.id, selected, cost));
  }
  const plan = planRefusals(
    ranked.flatMap((city) => {
      const look = looks.get(city.id);
      return look?.look === 'none' ? [{ key: city.id, name: city.name, refusal: look.refusal }] : [];
    }),
  );
  const free: FreeTown[] = ranked.map((city, index) => {
    const lines = previews.get(city.id);
    let adds: RiteAdds | null = null;
    if (selected !== null && lines !== undefined) {
      const turn = foldCardImpact(lines);
      const figures = [main, second]
        .filter((voice): voice is CityYieldKey => voice !== null)
        .map((voice) => ({ voice, amount: turn[voice] }));
      const once = onceFigures(lines);
      adds = {
        figures,
        once,
        words: figures.length === 0 && once.length === 0 ? riteClauseWords(selected) : null,
      };
    }
    let menu: TownMenu | null = null;
    if (selected === null && view.menuCityId === city.id) {
      const items: MenuItem[] = [];
      for (const rite of LIVE_RITE_IDS.filter((id) => known.has(id))) {
        const preview = readings.preview(city.id, rite);
        items.push({
          rite,
          name: riteDef(rite).name,
          says: riteSays(state, seat, rite),
          known: true,
          adds: { figures: gainFigures(preview, 2), once: onceFigures(preview), words: null },
          look: startLook(state, seat, city.id, rite, cost),
        });
      }
      for (const rite of LIVE_RITE_IDS.filter((id) => !known.has(id))) {
        items.push({
          rite,
          name: riteDef(rite).name,
          says: `needs ${riteTeacherName(rite)}`,
          known: false,
          adds: null,
          look: null,
        });
      }
      menu = { items, foot: menuFoot(state, seat, bank, perTurn, cost) };
    }
    return {
      cityId: city.id,
      name: cityDisplayName(state, city),
      faith: townFaithWords(state, seat, city),
      rank: ranks ? index + 1 : null,
      adds,
      look: looks.get(city.id) ?? null,
      refusal: plan.places.get(city.id) ?? null,
      menu,
      focus: view.focusCityId === city.id,
    };
  });

  // The kept towns: this visit's starts first, newest first, then soonest free.
  const startedNow = new Map<number, number>();
  visit.started.forEach((start, at) => {
    if (keeping.get(start.cityId) === start.rite) startedNow.set(start.cityId, at);
  });
  const keptTowns = towns.filter((city) => keeping.has(city.id));
  const left = new Map<number, number>(keptTowns.map((city) => [city.id, cityRiteTurnsLeft(state, city)]));
  const keptOrder = [...keptTowns].sort((a, b) => {
    const nowA = startedNow.get(a.id);
    const nowB = startedNow.get(b.id);
    if (nowA !== undefined || nowB !== undefined) {
      if (nowA === undefined) return 1;
      if (nowB === undefined) return -1;
      return nowB - nowA;
    }
    return left.get(a.id)! - left.get(b.id)!;
  });
  const kept: KeptTown[] = keptOrder.map((city) => {
    const rite = keeping.get(city.id)!;
    const turnsLeft = left.get(city.id)!;
    const pays = ritePaysNow(state, city, rite);
    const figures = CITY_YIELD_KEYS.filter((key) => pays[key] !== 0).map((voice) => ({
      voice,
      amount: pays[voice],
    }));
    return {
      cityId: city.id,
      name: cityDisplayName(state, city),
      faith: townFaithWords(state, seat, city),
      rite,
      riteName: riteDef(rite).name,
      turnsLeft,
      turnsTotal: Math.max(turnsLeft, riteTurnsFor(state, seat, rite) ?? turnsLeft, 1),
      freeOnTurn: state.turn + turnsLeft,
      pays: figures,
      words: figures.length === 0 ? riteClauseWords(rite) : null,
      startedNow: startedNow.has(city.id),
      focus: view.focusCityId === city.id,
    };
  });

  // The line under the strip.
  let say: RitesSay;
  if (selected !== null) {
    const name = riteDef(selected).name;
    let ranking: string;
    if (freeTowns.length === 0) ranking = 'Every town is keeping a rite, so none can take it now.';
    else if (main === null || !ranks) {
      ranking = 'It adds the same in every town, so the free towns keep founding order.';
    } else {
      ranking = `Free towns ranked by the ${YIELD_NAME[main]} it would add, best first.`;
      if (second !== null) ranking += ` The ${YIELD_NAME[second]} it would add is shown beside it.`;
    }
    say = {
      kind: 'mode',
      rite: selected,
      name,
      says: riteSays(state, seat, selected),
      ranking,
      leave: 'Press the rite again, or Esc, to leave.',
    };
  } else if (known.size === 0) {
    say = { kind: 'idle', text: 'You know no rite yet. Each greyed rite above names what teaches it.' };
  } else {
    say = {
      kind: 'idle',
      text: 'Pick a rite above to rank your free towns by what it would add and start it in one click, or open a town’s menu.',
    };
  }

  const keptNoteParts = ['soonest free first'];
  if (selected !== null && kept.length > 0) keptNoteParts.push(`cannot take ${riteDef(selected).name} until then`);

  return {
    seat,
    turn: state.turn,
    bank,
    perTurn,
    cost,
    selected: selected === null ? null : { rite: selected, name: riteDef(selected).name },
    paused,
    chips,
    say,
    free,
    freeNote: ranks ? 'best first' : 'founding order',
    refusalHead: plan.head,
    kept,
    keptNote: keptNoteParts.join(' · '),
    faith: faithLineFor(state, seat, visit, bank, perTurn, cost),
    realm: realmLineFor(
      state,
      seat,
      selected,
      cost,
      keptTowns.map((city) => keeping.get(city.id)!),
    ),
    count: ritesCount(state, seat),
  };
}

// --- the drawing ----------------------------------------------------------------

/** What the drawing calls. The sheet owns every one of them; the drawing decides nothing. */
export interface RitesTabHandlers {
  selectRite(rite: RiteId): void;
  toggleMenu(cityId: number): void;
  /** Starts a rite in a town. Without it the Start buttons are drawn but cannot be pressed. */
  start?: (cityId: number, rite: RiteId) => void;
  /** Says a rite over the whole realm with a prophet. Without it the realm's button cannot be pressed. */
  sayOverRealm?: (unitId: number, rite: RiteId) => void;
  /** Opens a town's city screen. Without it a town's name is plain text. */
  openCity?: (cityId: number) => void;
}

/** "+7🌾", composed in `YIELD_GLYPH` for `setYieldText` to draw. */
export function voiceFigureText(figure: VoiceFigure): string {
  return `${signedFigure(figure.amount)}${YIELD_GLYPH[figure.voice]}`;
}

/** What a row's would-add or pays-now cell says: the figures, "once" figures, or the rite's words. */
function drawFigures(into: HTMLElement, figures: readonly VoiceFigure[], once: readonly VoiceFigure[], words: string | null): void {
  figures.forEach((figure, index) => {
    const span = element('span', index === 0 ? 'faith-figure is-main' : 'faith-figure');
    setYieldText(span, voiceFigureText(figure));
    into.append(span);
  });
  for (const figure of once) {
    const span = element('span', 'faith-figure is-once');
    setYieldText(span, `${voiceFigureText(figure)} once`);
    into.append(span);
  }
  if (figures.length === 0 && once.length === 0) {
    if (words !== null && words.length > 0) {
      const span = element('span', 'faith-figure-words');
      setDescriptorText(span, words, { linked: false });
      into.append(span);
    } else {
      into.append(element('span', 'faith-figure-none', '—'));
    }
  }
}

/** A town's name: a button that opens its city screen, or plain words without one. */
function townName(cityId: number, name: string, faith: string, handlers: RitesTabHandlers): HTMLElement {
  const cell = element('span', 'faith-town-name');
  const open = handlers.openCity;
  if (open !== undefined) {
    const button = element('button', 'faith-town-link', name);
    button.type = 'button';
    button.dataset.key = `name:${cityId}`;
    button.title = `Open ${name}`;
    button.addEventListener('click', () => open(cityId));
    cell.append(button);
  } else {
    cell.append(element('b', 'faith-town-label', name));
  }
  cell.append(element('small', 'faith-town-faith', faith));
  return cell;
}

/** The strip of chips. */
function drawChips(model: RitesTabModel, handlers: RitesTabHandlers): HTMLElement {
  const strip = element('div', 'faith-rite-chips');
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', 'Rites');
  for (const chip of model.chips) {
    if (!chip.known) {
      const locked = element('span', 'faith-rite-chip is-locked');
      locked.append(element('span', 'faith-rite-chip-name', chip.name));
      locked.append(element('span', 'faith-rite-chip-teacher', `needs ${chip.teacher ?? ''}`));
      locked.title = `${chip.name} is taught by ${chip.teacherPhrase ?? 'something you do not have'}`;
      strip.append(locked);
      continue;
    }
    const button = element('button', chip.selected ? 'faith-rite-chip is-on' : 'faith-rite-chip');
    button.type = 'button';
    button.dataset.key = `chip:${chip.rite}`;
    button.setAttribute('aria-pressed', chip.selected ? 'true' : 'false');
    button.append(element('span', 'faith-rite-chip-name', chip.name));
    if (chip.voice !== null) {
      const mark = element('span', 'faith-rite-chip-mark');
      setYieldText(mark, YIELD_GLYPH[chip.voice]);
      button.append(mark);
    }
    if (chip.keptIn > 0) button.append(element('span', 'faith-rite-chip-kept', `kept in ${chip.keptIn}`));
    button.addEventListener('click', () => handlers.selectRite(chip.rite));
    strip.append(button);
  }
  return strip;
}

/** The line under the strip, or the rite-mode banner. */
function drawSay(model: RitesTabModel): HTMLElement {
  const say = model.say;
  if (say.kind === 'idle') return element('p', 'faith-rite-say', say.text);
  const banner = element('div', 'faith-rite-say is-mode');
  banner.setAttribute('role', 'status');
  banner.append(element('b', 'faith-rite-say-name', say.name));
  const clauses = element('span', 'faith-rite-say-clauses');
  setDescriptorText(clauses, say.says);
  banner.append(clauses);
  banner.append(element('span', 'faith-rite-say-ranking', say.ranking));
  banner.append(element('span', 'faith-rite-say-leave', say.leave));
  return banner;
}

/** A group heading in the town list: "Free · 8 … founding order". */
function groupHead(label: string, note: string): HTMLElement {
  const head = element('div', 'faith-town-group');
  head.append(element('span', 'faith-town-group-label', label));
  head.append(element('span', 'faith-town-group-note', note));
  return head;
}

/** One free town's menu. */
function drawMenu(cityId: number, townLabel: string, menu: TownMenu, model: RitesTabModel, handlers: RitesTabHandlers): HTMLElement {
  const box = element('div', 'faith-town-menu');
  box.id = `faith-town-menu-${cityId}`;
  for (const item of menu.items) {
    const row = element('div', item.known ? 'faith-menu-item' : 'faith-menu-item is-locked');
    const words = element('span', 'faith-menu-words');
    words.append(element('b', 'faith-menu-name', item.name));
    const says = element('span', item.known ? 'faith-menu-says' : 'faith-menu-says wanting');
    if (item.known) setDescriptorText(says, item.says);
    else says.textContent = item.says;
    words.append(says);
    row.append(words);
    const adds = element('span', 'faith-menu-adds');
    if (item.adds !== null) drawFigures(adds, item.adds.figures, item.adds.once, null);
    row.append(adds);
    if (item.look !== null) {
      const start = handlers.start;
      const cell = priceCellElement(item.look, {
        name: `${item.name} in ${townLabel}`,
        label: 'Start',
        onBuy: start === undefined ? undefined : () => start(cityId, item.rite),
        paused: model.paused,
      });
      cell.dataset.key = `menu-start:${cityId}:${item.rite}`;
      row.append(cell);
      if (item.look.look === 'none') {
        box.append(row);
        box.append(refusalLineElement(item.look.refusal, 'row'));
        continue;
      }
    } else {
      row.append(element('span', 'faith-menu-price'));
    }
    box.append(row);
  }
  box.append(element('p', 'faith-menu-foot', menu.foot));
  return box;
}

/** One free town's row. */
function drawFreeRow(town: FreeTown, model: RitesTabModel, handlers: RitesTabHandlers): HTMLElement[] {
  const row = element('div', `faith-town is-free${town.focus ? ' is-focus' : ''}${town.menu !== null ? ' is-open' : ''}`);
  row.dataset.city = String(town.cityId);
  row.append(element('span', 'faith-town-rank', town.rank === null ? '' : String(town.rank)));
  row.append(townName(town.cityId, town.name, town.faith, handlers));
  row.append(element('span', 'faith-town-mid', 'keeps no rite'));
  const pays = element('span', 'faith-town-pays');
  if (town.adds !== null) drawFigures(pays, town.adds.figures, town.adds.once, town.adds.words);
  row.append(pays);
  const act = element('span', 'faith-town-act');
  const selected = model.selected;
  if (selected !== null && town.look !== null) {
    const start = handlers.start;
    const cell = priceCellElement(town.look, {
      name: `${selected.name} in ${town.name}`,
      label: 'Start',
      onBuy: start === undefined ? undefined : () => start(town.cityId, selected.rite),
      paused: model.paused,
      mark: town.refusal?.at === 'head' ? town.refusal.mark : null,
    });
    cell.dataset.key = `start:${town.cityId}`;
    act.append(cell);
  } else if (selected === null) {
    const open = town.menu !== null;
    const toggle = element('button', open ? 'faith-town-menu-toggle is-open' : 'faith-town-menu-toggle');
    toggle.type = 'button';
    toggle.dataset.key = `menu:${town.cityId}`;
    toggle.textContent = open ? 'Start a rite ▴' : 'Start a rite ▾';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-controls', `faith-town-menu-${town.cityId}`);
    toggle.addEventListener('click', () => handlers.toggleMenu(town.cityId));
    act.append(toggle);
  }
  row.append(act);
  if (town.menu !== null) row.append(drawMenu(town.cityId, town.name, town.menu, model, handlers));
  const out: HTMLElement[] = [row];
  if (town.refusal?.at === 'row') out.push(refusalLineElement(town.refusal.text, 'row'));
  return out;
}

/** One kept town's row. */
function drawKeptRow(town: KeptTown, handlers: RitesTabHandlers): HTMLElement {
  const row = element(
    'div',
    `faith-town is-kept${town.startedNow ? ' is-started' : ''}${town.focus ? ' is-focus' : ''}`,
  );
  row.dataset.city = String(town.cityId);
  row.append(element('span', 'faith-town-rank'));
  row.append(townName(town.cityId, town.name, town.faith, handlers));
  const mid = element('span', 'faith-town-mid');
  const rite = element('span', 'faith-town-rite', town.riteName);
  if (town.startedNow) rite.append(element('span', 'faith-town-new', 'started now'));
  mid.append(rite);
  const bar = element('span', 'faith-town-bar');
  bar.setAttribute('aria-hidden', 'true');
  const fill = element('i', 'faith-town-bar-fill');
  fill.style.width = `${Math.round((Math.min(town.turnsLeft, town.turnsTotal) / town.turnsTotal) * 100)}%`;
  bar.append(fill);
  mid.append(bar);
  mid.append(
    element('span', 'faith-town-left', `${town.turnsLeft} ${town.turnsLeft === 1 ? 'turn' : 'turns'} left`),
  );
  row.append(mid);
  const pays = element('span', 'faith-town-pays');
  drawFigures(pays, town.pays, [], town.words);
  row.append(pays);
  row.append(element('span', 'faith-town-act', `free on turn ${town.freeOnTurn}`));
  return row;
}

/** The faith line at the foot. */
function drawFaithLine(model: RitesTabModel): HTMLElement {
  const line = element('div', 'faith-line');
  line.setAttribute('role', 'status');
  const bank = element('span', 'faith-line-bank');
  setYieldText(bank, `${YIELD_GLYPH.faith} ${netFigure(model.faith.bank)}`);
  line.append(bank);
  if (model.faith.history !== null) line.append(element('span', 'faith-line-history', model.faith.history));
  line.append(element('span', model.faith.short ? 'faith-line-now wanting' : 'faith-line-now', model.faith.now));
  if (model.faith.ahead !== null) line.append(element('span', 'faith-line-ahead', model.faith.ahead));
  return line;
}

/** The prophet's rite over the whole realm. */
function drawRealm(model: RitesTabModel, handlers: RitesTabHandlers): HTMLElement {
  const box = element('div', 'faith-realm');
  box.append(element('b', 'faith-realm-title', 'Over the whole realm'));
  box.append(element('span', 'faith-realm-says', model.realm.says));
  const offer = model.realm.offer;
  if (offer !== null) {
    const say = handlers.sayOverRealm;
    const cell = priceCellElement(offer.look, {
      name: `${offer.name} over the whole realm`,
      label: 'Say',
      onBuy: say === undefined ? undefined : () => say(offer.unitId, offer.rite),
      paused: model.paused,
    });
    cell.dataset.key = 'realm';
    box.append(cell);
  } else if (model.realm.why !== null) {
    box.append(element('span', model.realm.wanting ? 'faith-realm-why wanting' : 'faith-realm-why', model.realm.why));
  }
  return box;
}

/**
 * The Rites tab, drawn from its model. Every row carries `data-city` and every
 * control a `data-key`, which is what the sheet reads to slide the rows into
 * their new places and to give the keyboard back after a repaint.
 */
export function drawRitesTab(model: RitesTabModel, handlers: RitesTabHandlers): HTMLElement {
  const tab = element('section', 'faith-rites');
  const head = element('div', 'faith-rites-head');
  head.append(element('p', 'eyebrow sc-eyebrow', 'rites you know'));
  head.append(
    element('span', 'faith-rites-note', `press one to rank your free towns by it · each costs ${model.cost} faith`),
  );
  tab.append(head);
  tab.append(drawChips(model, handlers));
  tab.append(drawSay(model));
  if (model.paused !== null) {
    tab.append(element('p', 'faith-rite-paused', `${model.paused}: rites can be started again next turn.`));
  }

  const list = element('div', 'faith-towns');
  if (model.free.length === 0 && model.kept.length === 0) {
    list.append(element('p', 'sc-none', 'You have no towns yet.'));
  }
  if (model.free.length > 0 || model.kept.length > 0) {
    list.append(groupHead(`Free · ${model.free.length}`, model.freeNote));
    for (const line of model.refusalHead) list.append(refusalLineElement(line.text, 'head', line.mark));
    if (model.free.length === 0) list.append(element('p', 'faith-town-empty', 'Every town is keeping a rite.'));
    for (const town of model.free) list.append(...drawFreeRow(town, model, handlers));
  }
  if (model.kept.length > 0) {
    list.append(groupHead(`Keeping a rite · ${model.kept.length}`, model.keptNote));
    for (const town of model.kept) list.append(drawKeptRow(town, handlers));
  }
  tab.append(list);
  tab.append(drawFaithLine(model));
  tab.append(drawRealm(model, handlers));
  return tab;
}
