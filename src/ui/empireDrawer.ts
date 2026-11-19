/**
 * The corner panel (batch SS2b): "Option A, revised" of
 * `docs/plans/mockups/scholars-study/corner-panel-options.html`, with the
 * user's choices from `docs/plans/ui-critique-2026-10-16.md` ("The corner
 * panel: option A revised is approved"). The file keeps its old name, because
 * the screen registry, the tutorial and the tests know it.
 *
 * The panel is one card in the top-left corner, 248 px wide, in three parts:
 *
 * - **The top part** (`#empire-top`): the seat's banner with the arrow under it,
 *   and two lines. Each line is a button, drawn as an underlined name with an
 *   arrow (the user chose this over the raised keys of the main drawing): the
 *   technology being learnt opens the star chart (T), and "Next draft" opens
 *   Statecraft (C). Each line has its turns and a bar. The banner
 *   (`#empire-panel`, the card's one toggle for the keyboard) and every other
 *   part of the top grow the card **downward, in place**, as Q does.
 * - **Four marks** (`#empire-quick`) with no words at rest: Diplomacy (W),
 *   Routes (E) with the routes running against the cap, Faith (H) with the
 *   faith banked, and Standings (S). Each opens its sheet. The name and the key
 *   are in each mark's title and accessible name. Open, the same four buttons
 *   become four rows of the card's one shape: mark, name, figure, key.
 * - **The open part** (`#empire-drawer`): Leader (L) and the age wager in the
 *   same shape, then the Supply counts. It covers the commission chips until it
 *   closes.
 *
 * Each screen has one door here, and the top bar has none for them (the user:
 * "we probably don't need these menu items in multiple places").
 *
 * What is pure and what is not
 * ----------------------------
 * What the panel prints (`empireGlance` and the word helpers) and the rule for
 * opening and closing (`panelStep`) are pure functions above
 * `createEmpireDrawer`, because the test suite has no DOM. `createEmpireDrawer`
 * fills the static markup in `index.html` and wires the gestures.
 *
 * Who writes what
 * ---------------
 * The star chart (`techTree.ts`, `renderStatus`) writes the technology's name
 * (`#tech-current`), the research line's figures (`#research-figures`), its
 * title, its accessible name and its prompting state, and it owns the line's
 * click. This module writes everything else: the banner, both bars and their
 * turns, the research rate and "next", the draft line's detail, the marks'
 * figures and names, and the rows. The research bar and the star chart agree
 * because both go through `researchProgress` at the star chart's own rate.
 *
 * The figures are the game's own readings. Routes is `routeFigures` (which
 * reads `tradeLedger`, the trade sheet's ledger), asked once a refresh. Faith
 * is the faith banked, with `explainNextRung`'s price beside it while the next
 * god has one, and its sentence is `nextRungWords`. The faith dot is the purchase
 * gate's own answer for a prophet (`purchaseError`), and the prophet's price is
 * `explainPurchaseCost`'s fold. Nothing here composes a total of its own.
 *
 * The screen registry
 * -------------------
 * The open card is registered as a card in the screen registry
 * (`screenRegistry.ts`). Opening it calls `onOpen`, which `main.ts` wires to
 * `screens.opening('drawer')`, so the open card closes the other cards and
 * screens, and any card or screen opening closes it. A line, a mark or a row
 * opens a screen, so a press on one also folds the card back up.
 *
 * Keyboard
 * --------
 * Opening the card moves the keyboard to the research line, Tab and Shift-Tab
 * wrap inside the whole card, and closing it while the keyboard is in the open
 * part puts the keyboard back on the banner. Every listener is bound with one
 * `AbortController` and removed by `dispose`, which `main.ts` puts in
 * `gameDisposers`.
 *
 * Supply: why the counts are not always on the board
 * --------------------------------------------------
 * Until batch UX3 the strategic resource counts sat in a card that was always
 * on screen (the holdings rail), under a rule its docblock recorded: a player
 * should be able to answer "can I build another horseman?" without clicking
 * anything (`docs/strategic-resources-proposal.md` §7). The user reversed that
 * rule on 2026-10-15 (`docs/flags.md` (ssssss) 1): the counts moved into this
 * panel's Supply section and to the head of each town's build list, where
 * building decisions are made. The case that needs attention without a click is
 * a resource with no spare copy, and that lights the red dot on the banner.
 */

import { diplomacyMarkDataUri, standingsMarkDataUri, tradeMarkDataUri } from '../art/dockMarks';
import { heraldryFor, heraldryMarkDataUri } from '../art/heraldryMarks';
import { inPlayMarkDataUri } from '../art/inPlayMarks';
import { seatInks } from '../art/seatInks';
import { yieldMarkDataUri } from '../art/yieldMarks';
import { turnsToFill } from '../sim/cities';
import type { Game } from '../sim/game';
import { seatName } from '../sim/leaderData';
import { type PurchasableItem, explainPurchaseCost, purchaseError } from '../sim/purchase';
import { readEmpire } from '../sim/readings';
import {
  type NextRung,
  availableRites,
  explainNextRung,
  hasReligionOffer,
  nextBeliefPool,
  nextRungWords,
  pantheonSlots,
} from '../sim/religion';
import {
  type GameState,
  type Player,
  capitalCityOf,
  citiesOf,
  foundedReligion,
  playerById,
} from '../sim/state';
import { hasStatecraftOffer, nextDraftCost, ref, stripRefs } from '../sim/statecraft';
import { GOVERNMENT_TIERS } from '../sim/statecraftData';
import { availableTechs, playerScience, researchPlan } from '../sim/tech';
import { type TechId, UNIT_UNLOCK_TECH, techDef } from '../sim/techData';
import { routeSlots, usedRouteSlots } from '../sim/trade';
import { UNIT_TYPE_IDS, type UnitTypeId, caravanTypeId, unitDef } from '../sim/unitData';
import { dealtWagers, openWagerDeal, wagerClaimedBy } from '../sim/wagers';
import { element, requireElement } from './dom';
import { figure, signedFigure, turnsLabel } from './figures';
import { openKeyword, setDescriptorText } from './keywords';
import { researchProgress } from './researchProgress';
import { techCostFor } from './techPrice';
import { routeFigures } from './topBar';
import { type CopyCount, copiesFigureNode, strategicHoldings } from './resourceCopies';

// --- opening and closing -----------------------------------------------------

/**
 * What can happen to the card.
 *
 * - `toggle`: a click or tap on the banner or on any part of the top that is
 *   not one of the two lines, Enter on the banner, or Q.
 * - `close`: Escape, a press outside the card, or another card or screen
 *   opening (a line, a mark or a row opens one).
 */
export type PanelEvent = 'toggle' | 'close';

/** Whether the card is open after an event. */
export function panelStep(open: boolean, event: PanelEvent): boolean {
  return event === 'toggle' ? !open : false;
}

// --- what is owed ------------------------------------------------------------

/**
 * Is Statecraft waiting on this seat? A draft, a Doctrine offer or a charter to
 * swear.
 *
 * Delegates to `hasStatecraftOffer`, the simulation's own definition of
 * "something is waiting". This function only adds what a missing seat means:
 * nothing is waiting for a seat that is not there. It feeds the banner's dot
 * and the draft line's owed line.
 */
export function statecraftOwed(player: Player | undefined): boolean {
  return player !== undefined && hasStatecraftOffer(player);
}

/**
 * Is a god waiting to be named? One of the banner's causes.
 *
 * It no longer lights the Faith mark (the user, 2026-11-17: "pantheons are
 * drafted regardless of player input"). The End Turn blocker and the banner
 * still say it. Delegates to `hasReligionOffer` for `statecraftOwed`'s reason.
 */
export function beliefOwed(player: Player | undefined): boolean {
  return player !== undefined && hasReligionOffer(player);
}

/**
 * The four things that light the banner's red dot: a card to pick (a draft or a
 * Doctrine offer), a charter to swear, a belief to choose, and a strategic
 * resource with no spare copy.
 */
type OwedDecision = 'card' | 'charter' | 'belief' | 'supply';

/** Each cause, in the words the banner's accessible name uses. */
export const OWED_WORDS: Readonly<Record<OwedDecision, string>> = {
  card: 'a card to pick',
  charter: 'a charter to swear',
  belief: 'a belief to choose',
  supply: 'a strategic resource with none spare',
};

// --- the readings ------------------------------------------------------------

/** Where the seat's research stands. */
type ResearchStage = 'learning' | 'choosing' | 'finished';

interface ResearchGlance {
  stage: ResearchStage;
  /** The technology being learnt, or `null` unless `stage` is `learning`. */
  name: string | null;
  /** Progress toward it, 0 to 1. */
  fraction: number;
  /** Turns to finish it, `0` when it is already paid, `null` with no science. */
  turns: number | null;
  /** Science a turn, the star chart's own figure (`playerScience`). */
  rate: number;
  /** The next technology in the research plan, or `null` with no queue. */
  next: string | null;
}

interface DraftGlance {
  /** Culture banked toward the next draft, as a whole number. */
  banked: number;
  /** What the next draft costs, discounts included (`nextDraftCost`). */
  cost: number;
  /** `banked` against `cost`, 0 to 1. */
  fraction: number;
  /** Turns until the meter fills at the current rate; `null` with no culture. */
  turns: number | null;
  /** Drafts taken so far, which Statecraft calls the tier. */
  tier: number;
  /** The tier at which the next government is offered, or `null` past the last. */
  nextGovernment: number | null;
  /** What Statecraft is waiting on: a charter first, else any card. */
  owed: 'card' | 'charter' | null;
}

interface WagerGlance {
  /** Bars on the table this age; nought when this age dealt none. */
  dealt: number;
  /** How many of them this seat has met. */
  met: number;
}

/**
 * What the Faith mark needs to know about a prophet, out of the purchase
 * gate's own readings.
 */
export interface ProphetGlance {
  /**
   * True when a town of this seat could call a prophet now: `purchaseError`
   * takes the purchase in the faith bank in at least one town. This is the
   * Faith mark's dot (the user, 2026-11-17: "enough faith to buy a prophet is
   * the right interpretation").
   */
  callable: boolean;
  /** The price in the seat's capital (`explainPurchaseCost`'s fold), or `null` with no town or no prophet row. */
  price: number | null;
  /** True once every belief the seat's religion can hold is chosen. Then the dot never shows. */
  complete: boolean;
}

/** The figure on the Faith mark, and what it says aloud. */
interface FaithFigure {
  /** "41/72" while the next god has a price, else the faith banked alone: "141". */
  text: string;
  /** How full the thin line under the mark is, 0 to 1, or `null` when the next god has no price. */
  fraction: number | null;
  /** True when the faith banked meets the next god's price: the figure takes the rose ink. */
  met: boolean;
  /** The whole reading as sentences, for the title and the accessible name. */
  words: string;
  /** The open card's Faith row note: "next god", "pantheon full". */
  note: string;
  /** The red dot: a prophet can be called now, and the religion has room for another belief. */
  dot: boolean;
}

/** The figure on the Routes mark: the routes running against the cap. */
interface RoutesFigure {
  /** "1/3": routes running, against the routes the empire's markets allow. */
  text: string;
  /** "Trade: 1 of 3 routes running". */
  words: string;
  /** True while a route slot is free: the figure takes the verdigris ink. No dot. */
  free: boolean;
}

/** Everything the corner panel prints for one seat. */
interface EmpireGlance {
  playerId: number;
  seatName: string;
  research: ResearchGlance;
  draft: DraftGlance;
  faith: FaithFigure;
  routes: RoutesFigure;
  wager: WagerGlance;
  /** Every strategic resource held or spent (`strategicHoldings`). */
  supply: CopyCount[];
  /** What lights the banner's dot, in `OwedDecision` order. */
  owed: OwedDecision[];
  /** The two doors that can be greyed, and why; `null` while a door is open. */
  gates: Readonly<Record<GatedDoor, DoorGate | null>>;
}

/** Research, read the way the star chart's `renderStatus` reads it. */
export function researchGlance(state: GameState, player: Player): ResearchGlance {
  const rate = playerScience(state, player.id);
  const current = player.researching;
  if (current === null) {
    const choosing = availableTechs(state, player.id).length > 0;
    return {
      stage: choosing ? 'choosing' : 'finished',
      name: null,
      fraction: choosing ? 0 : 1,
      turns: null,
      rate,
      next: null,
    };
  }
  const def = techDef(current);
  // The folded price (Scientific batch S0), the figure the star chart quotes
  // for the same node: a charter technology costs more than its column, and a
  // seated card can move any price. `techCostFor` is the one reader.
  const progress = researchProgress(player.sciencePool, techCostFor(state, player, current), rate);
  const following = researchPlan(player)[1];
  return {
    stage: 'learning',
    name: def.name,
    fraction: progress.fraction,
    turns: progress.turns,
    rate,
    next: following === undefined ? null : techDef(following).name,
  };
}

/**
 * The draft meter: the culture pool against the next draft's cost, at the
 * empire's culture rate (the top bar's own figure, `readEmpire`).
 */
export function draftGlance(state: GameState, player: Player): DraftGlance {
  const cost = nextDraftCost(state, player);
  const pool = Math.max(0, player.culturePool);
  const tier = player.statecraft.drafts;
  const nextGovernment = GOVERNMENT_TIERS.find((at) => at > tier);
  const charter = player.statecraft.pendingGovernment !== undefined;
  return {
    banked: Math.floor(pool),
    cost,
    fraction: cost <= 0 ? 1 : Math.min(1, pool / cost),
    turns: turnsToFill(cost - pool, readEmpire(state, player.id).totals.culture),
    tier,
    nextGovernment: nextGovernment ?? null,
    owed: charter ? 'charter' : statecraftOwed(player) ? 'card' : null,
  };
}

/** The age wager: how many of this age's bars the seat has met. */
export function wagerGlance(state: GameState, playerId: number): WagerGlance {
  const deal = openWagerDeal(state);
  if (deal === null) return { dealt: 0, met: 0 };
  const dealt = dealtWagers(deal);
  const met = dealt.filter((id) => wagerClaimedBy(deal, playerId, deal.dealt.indexOf(id))).length;
  return { dealt: dealt.length, met };
}

/**
 * The roster's prophet rows: the units that carry the `prophesies` marker and
 * sell in the faith bank. Read by the marker, never by a name.
 */
function prophetTypes(): UnitTypeId[] {
  return UNIT_TYPE_IDS.filter((id) => {
    const def = unitDef(id);
    return def.prophesies === true && def.purchase?.currency === 'faith';
  });
}

/**
 * Can this seat call a prophet now, what does one cost, and is its religion
 * already full?
 *
 * "Now" is the purchase gate's whole answer (`purchaseError`), asked in each of
 * the seat's towns until one takes it: the bank, the one-a-turn rule and the
 * room on the town's hex are all its clauses, so a town that could not take the
 * piece does not light the dot. The price is `explainPurchaseCost`'s fold in
 * the capital, for the words only. Nothing here compares a price with a bank.
 */
export function prophetGlance(state: GameState, playerId: number): ProphetGlance {
  const religion = foundedReligion(state, playerId);
  const complete = religion !== undefined && nextBeliefPool(state, religion) === null;
  const types = prophetTypes();
  const towns = citiesOf(state, playerId);
  const capital = capitalCityOf(state, playerId) ?? towns[0];
  let price: number | null = null;
  let callable = false;
  for (const type of types) {
    const item: PurchasableItem = { kind: 'unit', id: type };
    if (price === null && capital !== undefined) {
      price = explainPurchaseCost(state, playerId, capital.id, item, 'faith')?.total ?? null;
    }
    if (!callable) {
      callable = towns.some((town) => purchaseError(state, playerId, town.id, item, 'faith') === null);
    }
  }
  return { callable, price, complete };
}

/**
 * The Faith mark's figure, out of the next-rung reading, the faith banked and
 * the prophet reading.
 *
 * The rule the board states: **the number is always the faith banked**. A
 * second number, "banked/price", shows only while the next god has a price,
 * with a thin line under the mark that fills toward it, and the figure takes
 * the rose ink once the price is met. Every other state (a god waiting to be
 * named, a full pantheon, a place a technology has still to open) prints the
 * one number, and the title says what the next thing is.
 *
 * The dot is the prophet's alone: it shows when a prophet can be called now and
 * the religion still has room for a belief. Once every belief is chosen it
 * never shows. A god waiting for a name lights no dot here.
 */
export function faithFigure(reading: NextRung, banked: number, prophet: ProphetGlance): FaithFigure {
  const dot = prophet.callable && !prophet.complete;
  const sentences = [nextRungWords(reading)];
  if (dot) sentences.push('You have the faith to call a prophet');
  else if (!prophet.complete && reading.kind !== 'open' && prophet.price !== null) {
    sentences.push(`A prophet costs ${figure(prophet.price)} faith`);
  }
  const words = sentences.join('. ');
  if (reading.kind === 'open') {
    return {
      text: `${figure(reading.banked)}/${figure(reading.cost)}`,
      fraction: reading.cost <= 0 ? 1 : Math.min(1, reading.banked / reading.cost),
      met: reading.banked >= reading.cost,
      words,
      note: dot ? 'call a prophet' : 'next god',
      dot,
    };
  }
  const note = dot
    ? 'call a prophet'
    : reading.kind === 'waiting'
      ? 'god waiting'
      : reading.kind === 'closed'
        ? 'place closed'
        : 'pantheon full';
  return { text: figure(banked), fraction: null, met: false, words, note, dot };
}

// --- the greyed doors ----------------------------------------------------------

/**
 * Why the Faith or the Routes door is greyed: the technology that normally
 * opens it, in the words the mark's title, the click and the open row print.
 * Each carries the describers' keyword ref for the technology; a plain-text
 * sink takes `stripRefs`.
 */
export interface DoorGate {
  door: GatedDoor;
  tech: TechId;
  /** "Opens when you research [[tech:divination|Divination]]": after the mark's name in its title. */
  words: string;
  /** "Faith opens when you research …": the line a click or the key prints. */
  line: string;
  /** "opens with …": the open card's row note. */
  note: string;
}

/** The two doors that can be greyed. */
export type GatedDoor = 'faith' | 'routes';

function gateFor(door: GatedDoor, tech: TechId): DoorGate {
  const name = ref('tech', tech, techDef(tech).name);
  return {
    door,
    tech,
    words: `Opens when you research ${name}`,
    line: `${QUICK_NAMES[door].name} opens when you research ${name}`,
    note: `opens with ${name}`,
  };
}

/**
 * The Faith door is greyed while the Faith sheet has nothing to show (batch
 * SS9a; the user, 2026-11-17: "i dont want to confuse new players. Let's have
 * the religion pane stay grayed out until divination is researched").
 *
 * The rule, exactly: the door opens as soon as any of these is true, and is
 * greyed while none is:
 *
 * - the pantheon has a place for a god (`pantheonSlots`), or a god held or
 *   waiting for a name;
 * - the seat knows a rite (`availableRites`);
 * - the seat founded a religion;
 * - the seat has faith banked, or faith coming in a turn.
 *
 * Divination is the normal way the first two come true: it opens the
 * pantheon's first places and teaches the first rites. The technology the
 * words name is the next-rung reading's own (`explainNextRung`, kind
 * `closed`), so the door and the Faith sheet's empty place name the same one,
 * and nothing here compares a technology's id. A ruin, a leader or a card that
 * brings faith early opens the door early.
 */
export function faithDoorGate(state: GameState, playerId: number, reading?: NextRung): DoorGate | null {
  const player = playerById(state, playerId);
  if (player === undefined) return null;
  if (pantheonSlots(state, playerId) > 0) return null;
  if (player.pantheon.beliefs.length > 0 || player.pantheon.pending !== undefined) return null;
  if (availableRites(state, playerId).length > 0) return null;
  if (foundedReligion(state, playerId) !== undefined) return null;
  if (player.faithPool > 0 || readEmpire(state, playerId).totals.faith > 0) return null;
  const next = reading ?? explainNextRung(state, playerId, 0);
  return next.kind === 'closed' ? gateFor('faith', next.tech) : null;
}

/**
 * The Routes door is greyed while the trade sheet has nothing to show (batch
 * SS9a; the user: "lets have the trade route screen be greyed out until
 * currency is researched").
 *
 * The rule, exactly: the door opens as soon as the seat can field a caravan
 * (it has researched the technology that unlocks the roster's caravan row,
 * found by its `trades` marker: Currency), or it has a route slot, or a route
 * running. A wonder or a card that gives a slot before Currency opens it
 * early. The technology is the caravan row's own unlock (`UNIT_UNLOCK_TECH`),
 * so nothing here names Currency.
 */
export function routesDoorGate(state: GameState, playerId: number): DoorGate | null {
  const player = playerById(state, playerId);
  if (player === undefined) return null;
  if (routeSlots(state, playerId) > 0 || usedRouteSlots(state, playerId) > 0) return null;
  const caravan = caravanTypeId();
  const tech = caravan === null ? undefined : UNIT_UNLOCK_TECH.get(caravan);
  if (tech === undefined || player.techsResearched.includes(tech)) return null;
  return gateFor('routes', tech);
}

/** Either door's gate, by name: what the H and E keys ask before they open a sheet. */
export function doorGate(state: GameState, playerId: number, door: GatedDoor): DoorGate | null {
  return door === 'faith' ? faithDoorGate(state, playerId) : routesDoorGate(state, playerId);
}

/**
 * Everything the corner panel prints for this seat, or `null` for a seat that
 * is not there.
 */
export function empireGlance(state: GameState, playerId: number): EmpireGlance | null {
  const player = playerById(state, playerId);
  if (player === undefined) return null;
  const draft = draftGlance(state, player);
  const supply = strategicHoldings(state, playerId);
  const belief = beliefOwed(player);
  const owed: OwedDecision[] = [];
  if (draft.owed !== null) owed.push(draft.owed);
  if (belief) owed.push('belief');
  if (supply.some((row) => row.spare === 0)) owed.push('supply');
  const bar = routeFigures(state, playerId);
  // The bank as the next-rung reading floors it, so "41" and "41/72" agree.
  const banked = Math.max(0, Math.floor(player.faithPool));
  const rung = explainNextRung(state, playerId, readEmpire(state, playerId).totals.faith);
  return {
    playerId,
    seatName: seatName(state, playerId),
    research: researchGlance(state, player),
    draft,
    faith: faithFigure(rung, banked, prophetGlance(state, playerId)),
    routes: { text: bar.routes, words: bar.routesSpoken, free: bar.routeSpare },
    wager: wagerGlance(state, playerId),
    supply,
    owed,
    gates: { faith: faithDoorGate(state, playerId, rung), routes: routesDoorGate(state, playerId) },
  };
}

// --- the words ---------------------------------------------------------------

/** The Supply section's caption: what the two figures are. */
export const SUPPLY_CAPTION = 'spare of what you hold';

/** The Supply section with nothing in it. */
export const SUPPLY_EMPTY = 'No strategic resources yet';

/** The line at the foot of the open card: the way out. */
export const CLOSE_HINT = 'Q or Esc closes';

/** "1 turn", "3 turns", "this turn", or what a missing rate means. */
function turnsPhrase(turns: number | null, never: string): string {
  if (turns === null) return never;
  if (turns === 0) return 'this turn';
  return turns === 1 ? '1 turn' : `${turns} turns`;
}

/** The research half of the banner's accessible name. */
function researchWords(research: ResearchGlance): string {
  if (research.stage === 'choosing') return 'nothing being researched';
  if (research.stage === 'finished') return 'every technology researched';
  return `researching ${research.name}, ${turnsPhrase(research.turns, 'no science being made')}`;
}

/** The draft half of the banner's accessible name. */
function draftWords(draft: DraftGlance): string {
  if (draft.turns === null) return 'no culture being made';
  if (draft.turns === 0) return 'next draft this turn';
  return `next draft in ${turnsPhrase(draft.turns, '')}`;
}

/**
 * The banner's accessible name: "Your empire: researching Code of Laws, 1
 * turn; next draft in 2 turns", and what is waiting, when anything is.
 */
export function panelLabel(glance: EmpireGlance): string {
  const head = `Your empire: ${researchWords(glance.research)}; ${draftWords(glance.draft)}`;
  if (glance.owed.length === 0) return head;
  return `${head}. Waiting on you: ${glance.owed.map((cause) => OWED_WORDS[cause]).join(', ')}`;
}

/** "Tier 14 · next government at 18", or the tier alone past the last government. */
export function tierWords(draft: DraftGlance): string {
  const tier = `Tier ${draft.tier}`;
  return draft.nextGovernment === null ? tier : `${tier} · next government at ${draft.nextGovernment}`;
}

/** The draft line's red line, or `null` when nothing is owed. */
export function cultureOwedWords(draft: DraftGlance): string | null {
  if (draft.owed === 'charter') return 'a charter is ready to be sworn';
  if (draft.owed === 'card') return 'a card awaits';
  return null;
}

/**
 * The draft line's figures: "120/450", the culture banked against the next
 * draft's price. The board prints "120/450 · Tier 14" on the first detail
 * line, with the figures in mono and the tier in words (`draftTierWords`).
 * The draft's turns are on the line already, beside its bar, and the next
 * government has a line of its own (`governmentWords`).
 */
export function draftFigures(draft: DraftGlance): string {
  return `${figure(draft.banked)}/${figure(draft.cost)}`;
}

/** "Tier 14": the drafts taken so far, after the draft line's figures. */
export function draftTierWords(draft: DraftGlance): string {
  return `Tier ${draft.tier}`;
}

/** "next government at 18", or nothing past the last government. */
export function governmentWords(draft: DraftGlance): string {
  return draft.nextGovernment === null ? '' : `next government at ${draft.nextGovernment}`;
}

/** The draft line's title, the board's tooltip: "Statecraft: next draft in 7 turns (C)". */
export function draftTitle(draft: DraftGlance): string {
  return `Statecraft: ${draftWords(draft)} (C)`;
}

/** The research rate after the star chart's figures: "+91 a turn", or nothing. */
export function researchRateWords(research: ResearchGlance): string {
  return research.stage === 'learning' ? `${signedFigure(research.rate)} a turn` : '';
}

/** "next: Mathematics", or nothing when nothing is queued. */
export function researchNextWords(research: ResearchGlance): string {
  return research.next === null ? '' : `next: ${research.next}`;
}

/** The age wager row's note: "2 of 3 bars met". */
export function wagerWords(wager: WagerGlance): string {
  if (wager.dealt === 0) return 'no wager this age';
  return `${wager.met} of ${wager.dealt} bars met`;
}

/**
 * The Leader row's note: the seat's name. The open card has no heading, so the
 * row says whose civ it is; "your civ" is in the row's accessible name.
 */
export function leaderWords(name: string): string {
  return name;
}

/** The turns after the research line's name: "1t", or a mark for the two other states. */
export function researchTurnsMark(research: ResearchGlance): string {
  if (research.stage === 'choosing') return '—';
  if (research.stage === 'finished') return '✦';
  return turnsLabel(research.turns);
}

/**
 * The Supply list as one string: a row is its resource and its two figures, so
 * two readings that would draw the same list compare equal. The seat is in it
 * because taking another chair changes the holdings with no change of state.
 * The list is rebuilt only when this moves (the old holdings rail's rule): the
 * revision moves on every accepted command and almost none of them touch a copy.
 */
export function supplyFingerprint(rows: readonly CopyCount[], playerId: number): string {
  return `${playerId}|${rows.map((row) => `${row.id}:${row.spare}/${row.held}`).join(',')}`;
}

/**
 * The five marks, in the board's order, and the screen each opens. In play is
 * the fifth (stage 3 of the Council and In play board, frame D1): its figure
 * is how many pieces are in force, and a dot shows when a wonder or a belief
 * has arrived since the seat last looked.
 */
export const QUICK_BUTTONS = ['diplomacy', 'routes', 'faith', 'inPlay', 'standings'] as const;
export type QuickButton = (typeof QUICK_BUTTONS)[number];

/** Each mark's name and key, as its title, its accessible name and its open row print them. */
export const QUICK_NAMES: Readonly<Record<QuickButton, { name: string; key: string; sheet: string }>> = {
  diplomacy: { name: 'Diplomacy', key: 'W', sheet: 'the Diplomacy sheet' },
  routes: { name: 'Routes', key: 'E', sheet: 'the trade routes' },
  faith: { name: 'Faith', key: 'H', sheet: 'the Faith sheet' },
  inPlay: { name: 'In play', key: 'I', sheet: 'everything in force' },
  standings: { name: 'Standings', key: 'S', sheet: 'the standings sheet' },
};

/** The In play mark's figure and dot, read by `main.ts` (the screen's own count). */
export interface InPlayDoorGlance {
  /** How many pieces are in force. */
  count: number;
  /** A wonder or a belief arrived since the seat last looked. */
  fresh: boolean;
}

/** The In play mark's words: "9 pieces in force", and the arrival when there is one. */
export function inPlayDoorWords(glance: InPlayDoorGlance): string {
  const pieces = `${glance.count} piece${glance.count === 1 ? '' : 's'} in force`;
  return glance.fresh ? `${pieces}, something new has arrived` : pieces;
}

/**
 * A mark's title: its name and key, then what its figure means. "Routes (E):
 * Trade: 1 of 3 routes running". The board's hover shows the name and the key.
 */
export function quickTitle(name: QuickButton, words = ''): string {
  const { name: label, key } = QUICK_NAMES[name];
  return words === '' ? `${label} (${key})` : `${label} (${key}): ${words}`;
}

/** A mark's accessible name: "Faith: Next god: 72 faith · 41 banked. Opens the Faith sheet (H)". */
export function quickLabel(name: QuickButton, words = ''): string {
  const { name: label, key, sheet } = QUICK_NAMES[name];
  return `${label}${words === '' ? '' : `: ${words}`}. Opens ${sheet} (${key})`;
}

/** A greyed mark's accessible name: "Faith, not open yet. Faith opens when you research Divination". */
export function greyedLabel(gate: DoorGate): string {
  return `${QUICK_NAMES[gate.door].name}, not open yet. ${stripRefs(gate.line)}`;
}

// --- the surface -------------------------------------------------------------

interface EmpireDrawerOptions {
  /** The whole card, `#empire-corner`. */
  corner: HTMLElement;
  /** The banner, `#empire-panel`: the card's toggle for the keyboard. */
  panel: HTMLButtonElement;
  /** The open part, `#empire-drawer`. Hidden with `hidden` while closed. */
  drawer: HTMLElement;
  getGame: () => Game;
  localPlayerId: () => number;
  /** The card is opening. `main.ts` tells the screen registry. */
  onOpen: () => void;
  /** The card opened or closed, so the tutorial's ring can move with it. */
  onChange?: () => void;
  /** The draft line's door (C). */
  openStatecraft: () => void;
  /** The Leader row's door (L). */
  openLeader: () => void;
  /** The age wager row's door: the wager's one standing way in. */
  openWager: () => void;
  /** The five marks' doors: Diplomacy (W), Routes (E), Faith (H), In play (I), Standings (S). */
  openQuick: Readonly<Record<QuickButton, () => void>>;
  /** The In play mark's figure and dot. Absent, the mark shows no figure. */
  inPlay?: () => InPlayDoorGlance;
  /**
   * A greyed door was pressed: says, in plain words, what opens it. `main.ts`
   * prints it on the guidance line, where the H and E keys print the same.
   */
  onGreyed?: (line: string) => void;
}

export interface EmpireDrawer {
  /** True while the card is open. What the screen registry and Escape ask. */
  readonly isOpen: boolean;
  /** Opens the card, or closes it when it is open. Q, and a press on the card's ground. */
  toggle(): void;
  /** Closes it. Safe on a closed card. */
  close(): void;
  /** Re-reads the seat, and rewrites what changed. Called with the rest of the HUD. */
  render(): void;
  /** Repaints the In play mark alone: its dot went, or a flight landed on it. */
  refreshInPlay(): void;
  /** Removes every listener. Registered in `gameDisposers`. */
  dispose(): void;
}

/** Controls that can hold the keyboard inside the card. */
const FOCUSABLE = 'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

/** Each mark's drawing: the screens' own marks, and the faith yield's candle. */
const QUICK_MARKS: Readonly<Record<QuickButton, () => string>> = {
  diplomacy: () => diplomacyMarkDataUri(),
  routes: () => tradeMarkDataUri(),
  faith: () => yieldMarkDataUri('faith'),
  inPlay: () => inPlayMarkDataUri('door'),
  standings: () => standingsMarkDataUri(),
};

export function createEmpireDrawer(options: EmpireDrawerOptions): EmpireDrawer {
  const { corner, panel, drawer, getGame, localPlayerId } = options;

  // The top part. The research line's name and figures are the star chart's.
  const top = requireElement('empire-top');
  const banner = requireElement('empire-banner');
  const researchBar = requireElement('empire-research-bar');
  const researchFill = requireElement('empire-research-fill');
  const researchTurns = requireElement('empire-research-turns');
  const researchRate = requireElement('research-rate');
  const researchNext = requireElement('research-next');
  const draftLine = requireElement<HTMLButtonElement>('drawer-culture');
  const draftFill = requireElement('empire-draft-fill');
  const draftTurns = requireElement('empire-draft-turns');
  const cultureFigures = requireElement('culture-figures');
  const cultureTier = requireElement('culture-tier');
  const cultureGovernment = requireElement('culture-government');
  const cultureOwed = requireElement('culture-owed');
  // The four marks.
  const quick: Record<QuickButton, HTMLButtonElement> = {
    diplomacy: requireElement<HTMLButtonElement>('quick-diplomacy'),
    routes: requireElement<HTMLButtonElement>('quick-routes'),
    faith: requireElement<HTMLButtonElement>('quick-faith'),
    inPlay: requireElement<HTMLButtonElement>('quick-inPlay'),
    standings: requireElement<HTMLButtonElement>('quick-standings'),
  };
  const inPlayFigure = requireElement('quick-inPlay-figure');
  const routesFigure = requireElement('quick-routes-figure');
  const routesNote = requireElement('quick-routes-note');
  const faithFigureEl = requireElement('quick-faith-figure');
  const faithNote = requireElement('quick-faith-note');
  const faithLine = requireElement('quick-faith-line');
  // The open part.
  const leaderRow = requireElement<HTMLButtonElement>('drawer-leader');
  const leaderNote = requireElement('drawer-leader-note');
  const wagerRow = requireElement<HTMLButtonElement>('drawer-wager');
  const wagerNote = requireElement('drawer-wager-note');
  const supplyList = requireElement('drawer-supply');
  const supplyCaption = requireElement('drawer-supply-caption');

  supplyCaption.textContent = SUPPLY_CAPTION;
  requireElement('drawer-close-hint').textContent = CLOSE_HINT;
  for (const name of QUICK_BUTTONS) {
    const mark = quick[name].querySelector<HTMLElement>('.quick-mark');
    mark?.style.setProperty('--quick-mark', `url("${QUICK_MARKS[name]()}")`);
  }

  let open = false;
  // The two doors' gates as the last render read them. A press on a greyed
  // door says what opens it instead of opening an empty sheet.
  let gates: Readonly<Record<GatedDoor, DoorGate | null>> = { faith: null, routes: null };

  // What the last render drew for. `-1` is "nothing drawn yet".
  let drawnState: GameState | null = null;
  let drawnRevision = -1;
  let drawnSeat = -1;
  let drawnSupply = '';

  const listening = new AbortController();
  const { signal } = listening;

  /** False while the card is not drawn at all, as on the city screen. */
  function shown(): boolean {
    return panel.getClientRects().length > 0;
  }

  /** Every control in the card the keyboard can stand on, in order. */
  function focusables(): HTMLElement[] {
    return Array.from(corner.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (node) => node.getClientRects().length > 0,
    );
  }

  function setOpen(next: boolean): void {
    if (next === open) return;
    // Asked before the rows are hidden: once they are, the browser has already
    // moved the keyboard off whatever was inside them.
    const heldKeyboard = drawer.contains(document.activeElement);
    open = next;
    drawer.hidden = !next;
    corner.classList.toggle('is-open', next);
    panel.classList.toggle('is-open', next);
    panel.setAttribute('aria-expanded', String(next));
    if (next) {
      options.onOpen();
      // The research line rather than the banner: a card that opens with the
      // keyboard on its own toggle opens with nothing to read, and the line
      // has just grown its figures.
      top.querySelector<HTMLElement>('.empire-line')?.focus({ preventScroll: true });
    } else if (heldKeyboard) {
      // Closing with the keyboard on a row of the open part puts it back on
      // the banner. A row that opened a screen has its keyboard taken by that
      // screen next.
      panel.focus({ preventScroll: true });
    }
    options.onChange?.();
  }

  function toggle(): void {
    // A stood-down card (the city screen) opens nothing: rows nobody can see
    // would still swallow the next Escape.
    if (!open && !shown()) return;
    setOpen(panelStep(open, 'toggle'));
  }

  function close(): void {
    setOpen(panelStep(open, 'close'));
  }

  // The top's ground grows the card: the banner, the arrow, and every gap
  // between and around the two lines. A press on a line is the line's own (it
  // opens a screen). The banner is a button, so Enter and Space on it arrive
  // here as its click.
  top.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element | null;
      if (target?.closest('.empire-line')) return;
      toggle();
    },
    { signal },
  );

  // A press outside the card closes it. Captured, so the card has folded before
  // the board starts a drag under it, and so a handler that stops the press
  // cannot keep it open.
  window.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target as Node | null;
      if (target !== null && corner.contains(target)) return;
      if (open) close();
    },
    { capture: true, signal },
  );

  // Open, Tab and Shift-Tab wrap inside the card, as on every HUD card.
  corner.addEventListener(
    'keydown',
    (event) => {
      if (!open || event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    { signal },
  );

  // --- the doors -----------------------------------------------------------

  // The research line's click is the star chart's own (`techTree.ts`). Each of
  // these opens a screen, and the screen's opening closes the card.
  draftLine.addEventListener('click', () => options.openStatecraft(), { signal });
  leaderRow.addEventListener('click', () => options.openLeader(), { signal });
  wagerRow.addEventListener('click', () => options.openWager(), { signal });
  for (const name of QUICK_BUTTONS) {
    quick[name].addEventListener(
      'click',
      () => {
        const gate = name === 'faith' || name === 'routes' ? gates[name] : null;
        if (gate !== null) options.onGreyed?.(stripRefs(gate.line));
        else options.openQuick[name]();
      },
      { signal },
    );
  }
  // One listener for the whole list, because the rows are rebuilt when the
  // counts change. A resource opens its Compendium entry.
  supplyList.addEventListener(
    'click',
    (event) => {
      const row = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-resource]');
      const id = row?.dataset.resource;
      if (id !== undefined) openKeyword(`resource:${id}`);
    },
    { signal },
  );

  // --- drawing -------------------------------------------------------------

  function supplyRow(count: CopyCount): HTMLElement {
    const item = element('li', 'drawer-supply-item');
    const button = element('button', count.spare === 0 ? 'drawer-supply-row is-short' : 'drawer-supply-row');
    button.type = 'button';
    button.dataset.resource = count.id;
    button.append(element('span', 'drawer-supply-name', count.name), copiesFigureNode(count));
    button.title = `${count.name} in the Compendium`;
    item.append(button);
    return item;
  }

  function paintBanner(glance: EmpireGlance): void {
    const player = playerById(getGame().state, glance.playerId);
    // The seat's pennant (batch SS2c): its own colour fills the field, and its
    // charge sits in ink on the parchment canton (the heraldry rule: a charge
    // never sits straight on seat ink). The canton is framed in the seat's
    // second colour, which with the pennant's thin ink edge keeps a light seat
    // such as Hypatia's papyrus visible on the parchment card.
    const uri = heraldryMarkDataUri(heraldryFor(glance.playerId, player?.charge, player?.leader));
    banner.style.setProperty('--banner-mark', `url("${uri}")`);
    const inks = seatInks(player);
    if (inks.primary.length > 0) banner.style.setProperty('--seat-ink', inks.primary);
    else banner.style.removeProperty('--seat-ink');
    banner.style.setProperty('--seat-second', inks.secondary);
  }

  function paintTop(glance: EmpireGlance): void {
    const { research, draft } = glance;
    paintBanner(glance);
    banner.classList.toggle('is-owed', glance.owed.length > 0);
    researchBar.classList.toggle('is-prompting', research.stage === 'choosing');
    researchBar.classList.toggle('is-finished', research.stage === 'finished');
    researchFill.style.width = `${(research.fraction * 100).toFixed(1)}%`;
    researchTurns.textContent = researchTurnsMark(research);
    researchRate.textContent = researchRateWords(research);
    researchNext.textContent = researchNextWords(research);
    draftFill.style.width = `${(draft.fraction * 100).toFixed(1)}%`;
    draftTurns.textContent = turnsLabel(draft.turns);
    panel.setAttribute('aria-label', panelLabel(glance));

    // The draft line's detail, shown while the card is open.
    const owedLine = cultureOwedWords(draft);
    cultureFigures.textContent = draftFigures(draft);
    cultureTier.textContent = draftTierWords(draft);
    cultureGovernment.textContent = governmentWords(draft);
    cultureOwed.hidden = owedLine === null;
    cultureOwed.textContent = owedLine ?? '';
    draftLine.classList.toggle('is-owed', owedLine !== null);
    draftLine.title = draftTitle(draft);
    draftLine.setAttribute(
      'aria-label',
      `Statecraft: next draft ${draft.banked} of ${draft.cost}, ${turnsPhrase(draft.turns, 'no culture being made')}; ` +
        `${tierWords(draft)}${owedLine === null ? '' : `; ${owedLine}`}. Opens Statecraft (C).`,
    );
  }

  /**
   * A door greyed or open. Greyed: the mark dims, the figure, the line and the
   * dot go, the title and the accessible name say what opens it, and the open
   * card's row note says it with the technology in bold. The button stays in
   * the keyboard's path with `aria-disabled`, so a press is never silent: it
   * prints the same words (`onGreyed`).
   */
  function paintGate(door: GatedDoor, gate: DoorGate | null, note: HTMLElement): boolean {
    const button = quick[door];
    button.classList.toggle('is-greyed', gate !== null);
    if (gate === null) {
      button.removeAttribute('aria-disabled');
      return false;
    }
    button.setAttribute('aria-disabled', 'true');
    button.title = quickTitle(door, stripRefs(gate.words));
    button.setAttribute('aria-label', greyedLabel(gate));
    setDescriptorText(note, gate.note, { linked: false });
    return true;
  }

  /**
   * The In play mark: its count and its dot. Painted with the rest of the row,
   * and again on its own when the dot goes (`refreshInPlay`), which changes
   * nothing in the state and so moves no revision.
   */
  function paintInPlay(): void {
    const inPlay = options.inPlay?.() ?? null;
    inPlayFigure.textContent = inPlay === null ? '' : String(inPlay.count);
    quick.inPlay.classList.toggle('is-owed', inPlay?.fresh === true);
    const inPlayWords = inPlay === null ? '' : inPlayDoorWords(inPlay);
    quick.inPlay.title = quickTitle('inPlay', inPlayWords);
    quick.inPlay.setAttribute('aria-label', quickLabel('inPlay', inPlayWords));
  }

  function paintQuick(glance: EmpireGlance): void {
    const { faith, routes } = glance;
    gates = glance.gates;
    if (paintGate('routes', glance.gates.routes, routesNote)) {
      routesFigure.textContent = '';
      routesFigure.classList.remove('is-free');
    } else {
      routesNote.textContent = '';
      routesFigure.textContent = routes.text;
      routesFigure.classList.toggle('is-free', routes.free);
      quick.routes.title = quickTitle('routes', routes.words);
      quick.routes.setAttribute('aria-label', quickLabel('routes', routes.words));
    }

    if (paintGate('faith', glance.gates.faith, faithNote)) {
      faithFigureEl.textContent = '';
      faithFigureEl.classList.remove('is-met');
      faithLine.hidden = true;
      quick.faith.classList.remove('is-owed');
    } else {
      faithFigureEl.textContent = faith.text;
      faithFigureEl.classList.toggle('is-met', faith.met);
      faithNote.textContent = faith.note;
      faithLine.hidden = faith.fraction === null;
      faithLine.style.width = `${((faith.fraction ?? 0) * 100).toFixed(1)}%`;
      quick.faith.classList.toggle('is-owed', faith.dot);
      quick.faith.title = quickTitle('faith', faith.words);
      quick.faith.setAttribute('aria-label', quickLabel('faith', faith.words));
    }

    paintInPlay();

    quick.diplomacy.title = quickTitle('diplomacy');
    quick.diplomacy.setAttribute('aria-label', quickLabel('diplomacy'));
    quick.standings.title = quickTitle('standings');
    quick.standings.setAttribute('aria-label', quickLabel('standings'));
  }

  function paintRows(glance: EmpireGlance): void {
    leaderNote.textContent = leaderWords(glance.seatName);
    leaderRow.setAttribute('aria-label', `Leader: ${glance.seatName}, your civ. Opens your civ's sheet (L)`);
    wagerNote.textContent = wagerWords(glance.wager);

    // Supply, rebuilt only when a count moved.
    const printed = supplyFingerprint(glance.supply, glance.playerId);
    if (printed !== drawnSupply) {
      drawnSupply = printed;
      supplyList.replaceChildren(
        ...(glance.supply.length === 0
          ? [element('li', 'hint drawer-supply-empty', SUPPLY_EMPTY)]
          : glance.supply.map(supplyRow)),
      );
      supplyCaption.hidden = glance.supply.length === 0;
    }
  }

  function render(): void {
    const { state } = getGame();
    const seatId = localPlayerId();
    // The state object as well as the revision: a loaded game is a new object
    // whose revision can equal the old one's by chance.
    if (state === drawnState && state.revision === drawnRevision && seatId === drawnSeat) return;
    drawnState = state;
    drawnRevision = state.revision;
    drawnSeat = seatId;
    const glance = empireGlance(state, seatId);
    if (glance === null) return;
    paintTop(glance);
    paintQuick(glance);
    paintRows(glance);
  }

  // The closed state, written once, so the markup's defaults do not matter.
  drawer.hidden = true;
  panel.setAttribute('aria-expanded', 'false');

  return {
    get isOpen(): boolean {
      return open;
    },
    toggle,
    close,
    render,
    refreshInPlay: paintInPlay,
    dispose(): void {
      listening.abort();
      close();
      drawnState = null;
      drawnSupply = '';
    },
  };
}
