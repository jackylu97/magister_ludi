/**
 * The Faith sheet: rites, the bonuses your religion pays, and the religion
 * itself, on three tabs (`docs/plans/faith-screen-f1.md`; batch UX9 in
 * `docs/plans/hud-ux-decisions.md`, "Build plan").
 *
 * The sheet is called Faith since the ruling of 2026-10-15 (`docs/flags.md`
 * (ssssss) 4.7), because it holds rites and bonuses as well as the religion.
 * Its three tabs:
 *
 *   - **Rites**: every town of yours as a row, the rites you know as a strip of
 *     chips, and rite mode, which ranks the free towns by what a rite would add
 *     and starts it in one click. Built by `ritesTab.ts`.
 *   - **Bonuses**: the gods, the follower and enhancer beliefs, each wearing the
 *     figure it pays, and what the holy city is paid. This is the old sheet's
 *     content, moved here until batch UX10 redraws the tab as cards with the
 *     Orders screen's deal and stamp.
 *   - **Religion & followers**: the religion's name, the pantheon wheel with
 *     the next god's rung under it, every town that follows, and the clergy.
 *     Also the old sheet's content until batch UX11 redraws it.
 *
 * The tab a seat last chose is remembered for that seat (`faithTabFor`), as
 * the city screen remembers its add-list tab: a fact about the person at the
 * keyboard, kept for the page's lifetime and never saved.
 *
 * **No retired piece is named on this sheet**, in a sentence or in a comment.
 * `test/ui/religionScreen.test.ts` checks this file, `ritesTab.ts`,
 * `riteWords.ts` and the sheet's own block in `index.html`, which holds its
 * title and hint line. A screen that explained a mechanism the reducer refuses
 * would teach a player a rule that is not true.
 *
 * The frame is `modalShell.ts`, like every parchment sheet: `hidden` is the
 * whole of the screen state, and the ×, Escape and a press on the ground arrive
 * at one `close`. Escape on the Rites tab first leaves rite mode, then closes an
 * open town menu, and only then closes the sheet (`escapeRites`, through the
 * shell's `onKey`).
 *
 * Nothing on this screen is state. Every figure is a reading of the game
 * (`religionReading`, `ritesTabModel`, the belief stamps), and every change is
 * a command the page sends: a purchase, a rename, a rite in a town
 * (`performRite`, through `controls.performRite`), or a prophet's rite over the
 * realm (`empireRite`). What the sheet keeps is the conversation: the tab, the
 * Rites tab's selected rite and open menu, what this visit started, and which
 * town the clergy row is aimed at.
 */

import { readEmpire } from '../sim/readings';
import { signedPlain as signed, signedYield, yieldShows } from '../sim/yieldFormat';
import { createModalShell } from './modalShell';
import {
  type StampReading,
  cardStampNode,
  landCardStamp,
  stampIsEmpty,
  stampReading,
} from './cardStamp';
import { type CardImpactSheet, cardImpactSheet, explainCardImpact } from '../sim/cardImpact';
import {
  type NextRung,
  type PantheonPlace,
  type PressureLine,
  beliefPool,
  cityRite,
  empireRiteError,
  explainNextRung,
  explainPressure,
  foundReligionError,
  holySites,
  maxReligions,
  nextRungWords,
  pantheonPlaces,
  pantheonSlots,
  poolHeld,
  poolSlots,
  renameReligionError,
  riteError,
  RELIGION_NAME_LIMIT,
} from '../sim/religion';
import {
  type PurchasableItem,
  type PurchasePrice,
  explainPurchaseCost,
  purchaseError,
} from '../sim/purchase';
import {
  type BeliefAxis,
  type BeliefId,
  type ReligionBeliefPool,
  type RiteId,
  BELIEF_IDS,
  RELIGION_BELIEF_POOLS,
  beliefDef,
} from '../sim/religionData';
import { drawPantheonWheel, pantheonWheelLayout } from './pantheonWheel';
import { type CardYieldLine, explainCardEmpireYields, describeCard, stripRefs } from '../sim/statecraft';
import {
  type GameState,
  type Religion,
  cityReligion,
  followerCount,
  foundedReligion,
  playerById,
} from '../sim/state';
import { cityDisplayName } from './cityDisplay';
import { keywordsAllowedIn, setDescriptorText } from './keywords';
import { gatingTech } from '../sim/tech';
import { type TechId, techDef } from '../sim/techData';
import { type UnitTypeId, unitDef } from '../sim/unitData';
import { YIELD_GLYPH } from './yieldMark';
import { element } from './dom';
import { seatName } from '../sim/leaderData';
import { bankLineElement, readBank } from './bankFigure';
import { wantsMotion } from './motion';
import {
  type RitesView,
  createRiteReadingCache,
  drawRitesTab,
  escapeRites,
  freshRitesView,
  noteRealmRite,
  noteRiteStarted,
  ritesCount,
  ritesTabModel,
  ritesViewForTown,
  selectRite,
  toggleTownMenu,
} from './ritesTab';

/**
 * The two rite words other screens print, composed in `riteWords.ts` and handed
 * on from here by name, where the city screen's rite rows (`controls.ts`) have
 * always imported them.
 */
export { riteGrantWords, riteTeacherName } from './riteWords';

/**
 * The mark each axis wears, and the accent it is drawn in.
 *
 * The glyphs are `docs/deprecated/religion.md`'s own — the table was authored with them,
 * and a screen that renamed the hearth would be a screen disagreeing with the
 * design doc it implements. The accent keys resolve through `style.css`'s
 * `--line-ink` block, exactly as a card's line does, so the frame rule, the
 * glyph and the emblem of one belief are three elements and one colour.
 *
 * **The axis has no player-facing name, and that is deliberate** (playtest,
 * 2026-08-26). It used to print one — "the stone", "the hearth" — in the
 * eyebrow of every belief card and in its tooltip, and it read as a *category
 * the player was choosing between* rather than as what it is: a designer's
 * thread through the pool, there so a second god on the same axis is findable.
 * It stays in the data (`BeliefDef.axis`), it still picks the accent, and the
 * founder amplifiers the Age 2–3 pass will draft from it (Syncretism reads the
 * axis directly) — it simply has no word. So this table is a glyph and nothing
 * else, and there is nowhere left for a name to be printed from.
 */
export const AXIS_MARK: Record<BeliefAxis, { glyph: string }> = {
  hearth: { glyph: '🌾' },
  sky: { glyph: '✶' },
  stone: { glyph: '⛰' },
  wild: { glyph: '🌲' },
  water: { glyph: '🌊' },
  war: { glyph: '⚒' },
  road: { glyph: '🧭' },
  sun: { glyph: '☀' },
  frost: { glyph: '❄' },
  none: { glyph: '◈' },
};

/** The empty slot's ghost — the outline of a god nobody has named. */
const SLOT_GLYPH = '◇';

// --- the religion, as the pane reads it -------------------------------------

/**
 * The technology that opens each drawable pool — the gate a player is told
 * about when a house is standing empty.
 *
 * The **follower** gate is read off the roster (`gatingTech('unit', 'prophet')`)
 * rather than named here, because a house is filled by a prophet's charge and
 * "what teaches a prophet" is already a fact the unit table carries. The
 * **enhancer** gate is the one literal in this file, and it is `religion.ts`'s
 * own `ENHANCER_TECH`, which is private to that module. A copy is a second
 * table, so `test/ui/religionScreen.test.ts` reads it back out of
 * `gainBeliefError`'s own refusal sentence — the day the sim moves the gate, the
 * pane's word for it fails rather than quietly lying.
 */
const ENHANCER_TECH: TechId = 'theology';

/** What teaches each pool, as a technology name. */
export function poolTechName(pool: ReligionBeliefPool): string {
  if (pool === 'enhancer') return techDef(ENHANCER_TECH).name;
  const gate = gatingTech('unit', PROPHET);
  return gate === null ? 'the tree' : techDef(gate).name;
}

/** The piece whose charges found and spread a faith. Named once, read twice. */
const PROPHET: UnitTypeId = 'prophet';

/**
 * The pieces faith calls, in the order a player meets them: the prophet who
 * founds, the apostle who carries, the inquisitor who takes back.
 *
 * A list rather than a filter over the roster, and deliberately: "which units
 * does faith buy" is answerable from `UnitDef.purchase.currency`, but *the
 * order they are read in* is an editorial fact and belongs on the sheet that
 * prints them. Every other word on a row — the name, the verb, the price, the
 * refusal — comes off the roster or off the sim.
 *
 * The retired fourth is not here (`docs/religion-v2.md`): its consecration is
 * the faith ladder's and its rites are a town's verbs, so a row for it would be
 * a piece the reducer refuses to sell.
 */
const CLERGY: readonly UnitTypeId[] = ['prophet', 'apostle', 'inquisitor'];

/** What each pool is called on the sheet, and what a house of it is for. */
export const POOL_WORD: Readonly<Record<ReligionBeliefPool, { name: string; says: string }>> = {
  follower: {
    name: 'follower belief',
    says: 'Applies in every city that follows your faith, and pays whoever owns that city.',
  },
  enhancer: {
    name: 'enhancer belief',
    says: 'Bends how far and how hard your faith spreads, for whoever holds its holy city.',
  },
};

/** One house of a religion: what it holds, how many it may, and what fills it. */
export interface ReligionHouse {
  pool: ReligionBeliefPool;
  slots: number;
  held: BeliefId[];
  /** How many places are standing empty. */
  empty: number;
  /** What fills one — the sentence an empty house prints. */
  fills: string;
}

/** One city that follows something, as the pane lists it. */
export interface FollowingCityLine {
  cityId: number;
  /** `cityDisplayName`'s answer — the capital keeps its star. */
  name: string;
  /** True when this seat owns the town. */
  ours: boolean;
  /** The owning empire's name, and the ink its banner is drawn in. */
  ownerName: string;
  ownerColor: string;
  /** Citizens of this town that follow **this** religion, of the whole population. */
  following: number;
  population: number;
  /** True when this religion is the one more than half the town follows. */
  majority: boolean;
  /** `explainPressure`'s lines for this religion, for the hover. */
  ledger: PressureLine[];
  /**
   * What this faith presses on this town per turn — the fold of `ledger`,
   * floored at zero exactly as `pressureTotals` floors it.
   *
   * On the row rather than only in the hover (user, 2026-08-28): "how many
   * follow me here" and "am I still gaining here" are two different questions,
   * and a list that answered only the first left a player with no way to tell a
   * town they are taking from one that has stopped moving without hovering forty
   * rows one at a time. The ledger stays on the hover as the argument.
   */
  pressure: number;
}

/** Everything the right pane prints. Pure, and the whole of what a test can pin. */
export interface ReligionReading {
  /**
   * The faith this seat founded, or `null` — `foundedReligion`'s answer.
   *
   * Deliberately **founding** and not `religionFounder`: this pane is "your
   * religion", which is a fact about history and stays yours after a conquest
   * takes the holy city. What that conquest moves is the trickle below, which
   * comes off `explainCardEmpireYields` and so goes to zero on its own.
   */
  religion: Religion | null;
  /** How many religions the world holds, against the cap it will ever hold. */
  count: string;
  /** How to found one, when this seat has not. `null` once it has. */
  found: { blocker: string | null; how: string } | null;
  houses: ReligionHouse[];
  /** The founder's trickle, in the sim's own labelled lines. */
  trickle: CardYieldLine[];
  /** Every town in the world that follows this faith, ours first, then in city order. */
  following: FollowingCityLine[];
}

/**
 * What the pane says, derived and never stored.
 *
 * Every figure on it is somebody else's: the cap is `maxReligions`, the houses
 * are `poolSlots`/`poolHeld`, the trickle is `explainCardEmpireYields` filtered to the
 * lines `liveEffects`' seventh source pushed, and each town's ledger is
 * `explainPressure` — the same list the tide folds. Nothing here adds up a
 * number the simulation has not already added up, which is hard rule 5 read for
 * a screen.
 *
 * `holySites` is hoisted **once** for the whole sweep and handed to every town's
 * `explainPressure`, which is that function's own bargain (`zocField`'s): asking
 * per town would be one pass over the map per city on the list.
 */
export function religionReading(state: GameState, seat: number): ReligionReading {
  const mine = foundedReligion(state, seat) ?? null;
  const count = `${state.religions.length} of ${maxReligions(state)} religions founded`;
  const houses: ReligionHouse[] = [];
  const following: FollowingCityLine[] = [];
  let trickle: CardYieldLine[] = [];

  if (mine !== null) {
    for (const pool of RELIGION_BELIEF_POOLS) {
      const slots = poolSlots(pool);
      const held = [...(pool === 'follower' ? mine.follower : mine.enhancer)];
      houses.push({
        pool,
        slots,
        held,
        empty: Math.max(0, slots - poolHeld(mine, pool)),
        fills: `a prophet's charge, once you have ${poolTechName(pool)}`,
      });
    }
    // Only the lines this religion pushed. `liveEffects` labels the trickle with
    // the religion's own name (`Religion · the Hearth Cult`) and a follower
    // belief with the belief after it, so a prefix match is exactly "what my
    // faith pays me" and nothing else on the empire's ledger.
    const word = `Religion · ${mine.name}`;
    trickle = explainCardEmpireYields(state, seat).filter((line) => line.source.startsWith(word));

    const sites = holySites(state);
    for (const city of state.cities) {
      const held = followerCount(city, mine.id);
      if (held <= 0) continue;
      const owner = playerById(state, city.ownerId);
      const ledger = explainPressure(state, city, sites).filter(
        (line) => line.religion === mine.id,
      );
      following.push({
        cityId: city.id,
        name: cityDisplayName(state, city),
        ours: city.ownerId === seat,
        ownerName: seatName(state, city.ownerId),
        ownerColor: owner?.color ?? 'var(--ink)',
        following: held,
        population: city.population,
        majority: cityReligion(city) === mine.id,
        ledger,
        // The fold of the list beside it, never a second pass over the board:
        // the figure on the row is the figure the hover's ledger sums to.
        pressure: Math.max(
          0,
          ledger.reduce((total, line) => total + line.amount, 0),
        ),
      });
    }
    // Ours first, then `state.cities` order inside each half — founding order,
    // which is an order the state carries. A list sorted by how many follow
    // would reshuffle itself every turn.
    following.sort((a, b) => Number(b.ours) - Number(a.ours));
  }

  return {
    religion: mine,
    count,
    found:
      mine !== null
        ? null
        : {
            blocker: foundReligionError(state, seat),
            how: `A prophet plants the first holy site, and the faith is founded where the stones go up. Prophets are called with faith once you have ${poolTechName('follower')}.`,
          },
    houses,
    trickle,
    following,
  };
}

/**
 * One town's pressure ledger as a hover sentence — the source, its figure, and
 * the total under them.
 *
 * `explainPressure`'s list verbatim, which is the point: the temple's line is a
 * *difference* carried so the list still sums to the total, so a reader who adds
 * the column up gets the figure the bank actually receives.
 */
export function pressureLedgerText(lines: readonly PressureLine[]): string {
  if (lines.length === 0) return 'Nothing presses here.';
  let total = 0;
  const said: string[] = [];
  for (const line of lines) {
    total += line.amount;
    said.push(`${line.source} ${signed(line.amount)}`);
  }
  return `${said.join(' · ')} — ${Math.max(0, total)} a turn`;
}

/**
 * A price's ordered lines as one hover sentence — rule 5 for a thing you buy,
 * folded into the plain text a `title` can hold.
 *
 * `explainPurchaseCost`'s list verbatim and in its order, so the sum of the
 * clauses is the figure on the button. It is a hover rather than a block for
 * the clergy row's own reason: three stacked breakdowns of an escalation
 * everybody understands is three blocks of arithmetic where the sheet wants
 * three decisions.
 */
export function priceLedgerText(price: PurchasePrice): string {
  const said = price.lines.map((line) => `${line.source} ${line.amount}`);
  return `${said.join(' · ')} — ${price.total} ${price.currency}`;
}

/**
 * The eyebrow the offer card wears when a belief is dealt, which is the one
 * place a player is told **which bag** the three cards came out of.
 *
 * `BeliefOffer.pool` is absent for the pantheon and named for the two religion
 * pools, so the three drafts read as three different decisions on the same card
 * — which they are: a god is your identity, a follower belief is what every town
 * that keeps your faith gets, an enhancer is how far the faith spreads.
 */
/**
 * What one belief **is**, in the two or three words a card's eyebrow carries.
 *
 * The offer card's per-card line and the compact face's, from one table: a god,
 * a follower belief, an enhancer belief. `beliefOfferEyebrow` says the same
 * thing about the *hand* and says what it costs beside it; this is the card's
 * own half, which is the only thing that fits above a name.
 *
 * Three drafts wear one card (`BeliefOffer.pool`), so the word has to come off
 * the pool rather than be written at the call — a face that said "a god" over a
 * follower belief would be the interface naming the wrong shelf.
 */
export function beliefCardType(pool: ReligionBeliefPool | undefined): string {
  if (pool === undefined) return 'a god';
  return pool === 'follower' ? 'a follower belief' : 'an enhancer belief';
}

export function beliefOfferEyebrow(pool: ReligionBeliefPool | undefined): string {
  if (pool === undefined) return 'a god · permanent, and never converted away';
  if (pool === 'follower') return 'a follower belief · applies in every city that follows';
  return 'an enhancer belief · bends how your faith spreads';
}

// --- the three tabs -------------------------------------------------------------

/** The Faith sheet's three tabs. */
export type FaithTab = 'rites' | 'bonuses' | 'religion';

/** The tabs in the order they are drawn, with their labels. */
export const FAITH_TABS: readonly { tab: FaithTab; label: string }[] = [
  { tab: 'rites', label: 'Rites' },
  { tab: 'bonuses', label: 'Bonuses' },
  { tab: 'religion', label: 'Religion & followers' },
];

/**
 * The tab each seat last chose. Module state rather than game state, for the
 * reason the city screen's add-list tab is (`addTab` in `cityPanel.ts`): which
 * tab a player last looked at is a fact about the person at the keyboard, it is
 * not in the save, and it resets when the page does. Kept per seat because a
 * hot-seat game passes the keyboard round. Read and written by seat id only;
 * nothing walks it.
 */
const tabBySeat = new Map<number, FaithTab>();

/** The tab this seat sees when the sheet opens: the one it last chose, or Rites. */
export function faithTabFor(seat: number): FaithTab {
  return tabBySeat.get(seat) ?? 'rites';
}

/** Remembers a seat's choice of tab. */
export function chooseFaithTab(seat: number, tab: FaithTab): void {
  tabBySeat.set(seat, tab);
}

export interface ReligionScreen {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  /**
   * Opens the sheet on the Rites tab with this town's "Start a rite" menu open:
   * the city screen's way in, from its Faith card. A town keeping a rite has no
   * menu, so its row is marked and brought into view instead.
   */
  openRitesFor(cityId: number): void;
  /** The state changed. Redraws if the screen is up; cheap enough to call always. */
  refresh(): void;
  dispose(): void;
}

export interface ReligionScreenOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  trigger?: HTMLElement;
  getState: () => GameState;
  getPlayerId: () => number;
  /** Sends the purchase. The screen never mutates state itself. */
  buy: (cityId: number, item: PurchasableItem, currency: 'faith' | 'gold') => void;
  /**
   * Starts a rite in a town: one `performRite` command, which the page sends
   * through `controls.performRite`. Optional, so a page without it still draws
   * the Rites tab, with its Start buttons unpressable.
   */
  performRite?: (cityId: number, rite: RiteId) => void;
  /**
   * Has a prophet say a rite over the whole realm: one `empireRite` command.
   * Optional for `performRite`'s reason.
   */
  sayRiteOverRealm?: (unitId: number, rite: RiteId) => void;
  /**
   * Opens a town's city screen. A town's name on the Rites tab is a link to it,
   * and following it closes the sheet. Without it the names are plain words.
   */
  openCity?: (cityId: number) => void;
  /**
   * Sends `renameReligion`. Optional, so a page with no religion verb wired
   * simply shows the name as a heading rather than as a field — the same
   * bargain `onOpenTrade` makes one sheet over.
   */
  rename?: (name: string) => void;
  /** Said in the manicule line — a refusal, in the reducer's own words. */
  onRefuse?: (message: string) => void;
  onOpen?: () => void;
}

/** The axis mark as a span that takes the accent ink. `cardLineMarkNode`'s twin. */
function axisMarkNode(axis: BeliefAxis): HTMLElement {
  const span = element('span', 'rel-axis-mark', AXIS_MARK[axis].glyph);
  span.setAttribute('aria-hidden', 'true');
  return span;
}

// --- the wheel --------------------------------------------------------------

/**
 * What the platform's tooltip says about a house.
 *
 * The same sentence the slot card carries (`drawBeliefFace` sets `title` to the
 * name) with the clauses after it, and the clauses come from `describeCard` —
 * the one function that says what a card does, the same one the offer that
 * deals this god will print. A wheel that paraphrased would be a second
 * vocabulary for the same rules, which is the thing this file's docblock is
 * about.
 */
function houseTooltip(id: BeliefId): string {
  const def = beliefDef(id);
  // **Stripped**: this is a `title`, which is text the platform draws. A mark
  // left in it would print its own brackets.
  const clauses = describeCard(id).map((clause) => stripRefs(clause.text));
  return clauses.length === 0 ? def.name : `${def.name} — ${clauses.join(' · ')}`;
}

/**
 * One belief's face: the glyph and what it is in the eyebrow, the name, the
 * clauses.
 *
 * `drawCardFace`'s shape (`statecraftScreen.ts`) with "a god" where the slot
 * type goes, so a god and an Order are the same object at a glance — which is
 * true: both are permanent things drafted three at a time from a pool. The
 * eyebrow used to carry the **axis name** and no longer does (see `AXIS_MARK`):
 * what a player needs to know in that line is what kind of thing this is, and
 * every belief is the same kind of thing.
 *
 * **Compact**, and it followed the hand for the same two reasons: the glyph is
 * a chip in the eyebrow rather than a plate of its own — the drawing is kept and
 * the whitespace around it is what went — and the flavour line is off, because
 * it is the one part of the card that says nothing about what the card does and
 * it is still read on the offer that deals the god (`offerCard.ts`).
 *
 * **The stamp lands here, it never plays** (the ruling of 2026-09-05, the
 * Doctrine shelf's rule one system over): a belief's ceremony was the draft, and
 * the offer card counted the figure up there. A screen that replayed the count
 * every time it opened would be celebrating a decision the player made an age
 * ago. A belief that pays nothing standing keeps the flourish, which is the
 * honest reading rather than an omission.
 */
function drawBeliefFace(
  into: HTMLElement,
  id: BeliefId,
  pool?: ReligionBeliefPool,
  reading?: StampReading | null,
): void {
  const def = beliefDef(id);
  into.dataset.axis = def.axis;
  into.title = def.name;
  const head = element('div', 'sc-card-head');
  const mark = axisMarkNode(def.axis);
  mark.classList.add('rel-card-emblem');
  head.append(mark);
  head.append(element('span', 'sc-card-type', beliefCardType(pool)));
  into.append(head);
  into.append(element('h4', 'sc-card-name', def.name));
  const list = element('ul', 'sc-clauses');
  // The Statecraft screen's rule, one card class over: a belief's face is an
  // `<article>` everywhere it is drawn (there is nothing to do to a god you
  // already hold), so its keywords are live. `keywordsAllowedIn` is asked
  // anyway, so the day a face becomes a control the links go quiet with it.
  const linked = keywordsAllowedIn(into);
  for (const clause of describeCard(id)) {
    const item = element('li', clause.deferred ? 'sc-clause sc-clause-deferred' : 'sc-clause');
    setDescriptorText(item, clause.text, { linked });
    list.append(item);
  }
  into.append(list);
  // The same seat the Statecraft shelf's cards keep, built whichever face it
  // shows, so a column of gods is a column of one card shape rather than two.
  const stamp = cardStampNode();
  into.dataset.card = id;
  into.append(stamp);
  if (reading) landCardStamp(stamp, reading);
}

export function createReligionScreen(options: ReligionScreenOptions): ReligionScreen {
  const { overlay, body, closeButton, trigger } = options;

  /**
   * What a belief this seat **holds** is worth, as the stamp reads it.
   *
   * `statecraftScreen.ts`'s `stampFor` in the votive deck's house, and mirrored
   * rather than shared for that screen's own reason: it is four lines of adapter
   * over `explainCardImpact`, and a helper exported across two screens to save
   * them would be a seam neither of them asked for. What must not be forked is
   * the *evaluator*, and it is not — both ask the sim.
   *
   * Only for a belief in force, which is every belief on this screen: a god is
   * never given back except by the one rite that takes it, and a pooled belief
   * is on the shelf the moment it is drafted. The reading is therefore what
   * giving it up would cost, which is the same figure with the same sign — see
   * `ghostPair`'s pair.
   */
  function beliefStamp(state: GameState, seat: number, id: BeliefId): StampReading | null {
    const reading = stampReading(explainCardImpact(state, seat, { kind: 'belief', id }, sheet ?? undefined));
    return stampIsEmpty(reading) ? null : reading;
  }

  /**
   * The half of this draw's stamps that is a reading of the **real** board,
   * taken once and shared by every belief on the sheet (`cardImpactSheet`,
   * batch H18) — the Statecraft sheet's own bargain, one screen over.
   *
   * Its lifetime is **one draw**: the reducer mutates `GameState` in place, so a
   * sheet kept past the next command would answer with a board the game has
   * moved on from. Set and let go in `draw`, stored nowhere.
   */
  let sheet: CardImpactSheet | null = null;

  /**
   * The pool as a wheel: one house per god, runs of an axis adjacent.
   *
   * The axes have no printed name any more (`AXIS_MARK`, "deliberate"), and
   * this is where they come back as **geometry**: gods of one thread occupy
   * adjacent houses, so a second god on your thread is findable without a word.
   * The arithmetic is `pantheonWheelLayout` — pure, and pinned by
   * `test/ui/pantheonWheel.test.ts`, because "which house, at what angle, in
   * which run" is the half of a drawing no screenshot catches.
   *
   * Every god in the table gets a house, held or not, and the wheel never
   * reorders: consecrating one lights its house and moves nothing. A ring that
   * rearranged as it filled would be a sky a player could never learn.
   *
   * Two states and no third — lit, or outlined. The hub carries the same figure
   * the eyebrow above it does, because there is exactly one answer to "how many
   * places are open" and two places to read it should not be two numbers.
   */
  function drawWheel(state: GameState, seat: number, slots: number): SVGElement {
    const player = playerById(state, seat);
    return drawPantheonWheel({
      layout: pantheonWheelLayout(BELIEF_IDS),
      held: new Set<BeliefId>(player?.pantheon.beliefs ?? []),
      slots,
      glyph: (axis) => AXIS_MARK[axis].glyph,
      tooltip: houseTooltip,
    });
  }

  /**
   * A place at the fire nobody has named — the ghost, and **what it is waiting
   * for**.
   *
   * Three sentences and no fourth, because a place stands empty for exactly
   * three reasons and a placeholder that said "unnamed" to all of them was the
   * old sheet's whole failure: the first open place is waiting for the *bank*
   * and prints the ladder's own sentence with a bar under it; a further open
   * place is waiting for the one in front of it; a shut place is waiting for a
   * *technology*, and says which.
   *
   * The words and the bar are both `explainNextRung`'s — the figure is never
   * composed here, and the bar is the same two numbers the sentence names, so a
   * player who reads the bar and a player who reads the line are told one thing.
   */
  function drawEmptyPlace(
    card: HTMLElement,
    place: PantheonPlace,
    rung: NextRung,
    first: boolean,
  ): void {
    card.append(element('span', 'rel-slot-ghost', SLOT_GLYPH));
    if (place.awaits !== null) {
      card.append(element('span', 'sc-slot-empty', `${techDef(place.awaits).name} opens this place`));
      card.title = 'A technology opens this place at the fire';
      return;
    }
    if (!first || rung.kind !== 'open') {
      card.append(element('span', 'sc-slot-empty', 'unnamed'));
      card.title = 'Your gods arrive on their own, once your faith is deep enough';
      return;
    }
    const said = element('span', 'sc-slot-empty', nextRungWords(rung));
    card.append(said);
    // The bank against the threshold, drawn. A bar rather than a second figure:
    // the sentence beside it already carries both numbers, and what a bar adds
    // is the only thing a number cannot — how close.
    const bar = element('span', 'rel-rung-bar');
    const fill = element('span', 'rel-rung-fill');
    const part = rung.cost <= 0 ? 1 : Math.min(1, rung.banked / rung.cost);
    fill.style.width = `${Math.round(part * 100)}%`;
    bar.append(fill);
    bar.setAttribute('aria-hidden', 'true');
    card.append(bar);
    card.title = 'Your gods arrive on their own, once your faith is deep enough';
  }

  /**
   * The gods: one card per place in the pantheon, each wearing the figure it
   * pays, and an empty place saying what it is waiting for (`drawEmptyPlace`).
   * On the Bonuses tab until batch UX10 redraws it as a shelf of cards.
   *
   * Every place the tree will ever open is drawn, not only the ones open today
   * (ruled 2026-09-06), so the third place can say which technology opens it.
   * `pantheonPlaces` is the whole shape, and it is the simulation's.
   */
  function drawGods(state: GameState, seat: number): HTMLElement {
    const block = element('section', 'rel-pantheon faith-shelf');
    const player = playerById(state, seat);
    const slots = pantheonSlots(state, seat);
    const held = player?.pantheon.beliefs ?? [];
    const rung = explainNextRung(state, seat, readEmpire(state, seat).totals.faith);
    block.append(element('p', 'eyebrow sc-eyebrow', `your gods · ${held.length} of ${slots}`));
    const row = element('div', 'rel-slot-row faith-cards');
    let firstOpen = true;
    for (const place of pantheonPlaces(state, seat)) {
      const empty = place.belief === null;
      const card = element('article', empty ? 'rel-slot rel-slot-empty' : 'rel-slot');
      if (place.belief === null) {
        drawEmptyPlace(card, place, rung, firstOpen && place.awaits === null);
        if (place.awaits === null) firstOpen = false;
      } else {
        drawBeliefFace(card, place.belief, undefined, beliefStamp(state, seat, place.belief));
      }
      row.append(card);
    }
    block.append(row);
    if (player && held.length < slots) {
      block.append(
        element(
          'p',
          'sc-hand',
          `${beliefPool(state, player).length} gods are still unnamed. Your people name one on their own, once enough faith has gathered.`,
        ),
      );
    }
    return block;
  }

  /**
   * The pantheon as a wheel, with the next god's rung under it: the Religion &
   * followers tab's column (F1, Tab 3). The rung sentence is the simulation's
   * (`nextRungWords` over `explainNextRung`), the same one the faith chip's
   * hover card prints, so the two cannot quote different thresholds. The rate
   * is `readEmpire`'s, the top bar's own figure.
   */
  function drawWheelBlock(state: GameState, seat: number): HTMLElement {
    const block = element('section', 'rel-pantheon');
    const player = playerById(state, seat);
    const slots = pantheonSlots(state, seat);
    const held = player?.pantheon.beliefs ?? [];
    const rate = readEmpire(state, seat).totals.faith;
    block.append(element('p', 'eyebrow sc-eyebrow', `pantheon · ${held.length} of ${slots}`));
    const wheelRow = element('div', 'rel-wheel-row');
    wheelRow.append(drawWheel(state, seat, slots));
    block.append(wheelRow);
    block.append(element('p', 'rel-rung-line', nextRungWords(explainNextRung(state, seat, rate))));
    return block;
  }

  /**
   * One clergy row: the piece, what it is for, its price here, and the button
   * that calls it.
   *
   * A **row** rather than the ledger this block used to be (ruled
   * 2026-09-06, the sheet's subject is the cards): three pieces are three
   * decisions of the same shape, and three stacked price breakdowns would push
   * the tide and the gods off the sheet to explain arithmetic that is one line
   * of ordinary escalation. The breakdown is still rule 5's and still the sim's
   * — it moves to the row's hover, where `explainPurchaseCost`'s lines are read
   * by whoever asks for them.
   *
   * The figure is `explainPurchaseCost`'s total and the refusal is
   * `purchaseError`'s sentence, exactly as before: a button a player can press
   * is a command the simulation takes.
   */
  function drawClergyRow(
    state: GameState,
    seat: number,
    cityId: number,
    type: UnitTypeId,
  ): HTMLElement | null {
    const def = unitDef(type);
    const item: PurchasableItem = { kind: 'unit', id: type };
    const currency = def.purchase?.currency ?? 'faith';
    const price = explainPurchaseCost(state, seat, cityId, item, currency);
    // No price is no row: a piece the roster does not sell in this bank is not a
    // decision this sheet can offer, and a row with a blank figure would be one.
    if (price === null) return null;
    const row = element('div', 'rel-clergy');
    const name = element('span', 'rel-clergy-name', def.name);
    row.append(name);
    // What is standing in the way, in the reducer's own words — on the row, so
    // a greyed piece says why without being clicked. A gate the player has not
    // reached is the commonest one and reads as a plan rather than a refusal.
    const problem = purchaseError(state, seat, cityId, item, currency);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn rel-buy';
    button.textContent = `${def.purchase?.verb ?? `Call a ${def.name}`} · ${price.total} ${currency}`;
    button.disabled = problem !== null;
    button.title = problem ?? priceLedgerText(price);
    button.addEventListener('click', () => {
      const blocked = purchaseError(state, seat, cityId, item, currency);
      if (blocked !== null) {
        options.onRefuse?.(blocked);
        return;
      }
      options.buy(cityId, item, currency);
      draw();
    });
    row.append(button);
    return row;
  }

  /**
   * The clergy: who this empire may call, and where.
   *
   * At the **foot** of the sheet (ruled 2026-09-06). A purchase is the smallest
   * decision on this screen — it is reversible in the sense that matters, since
   * the faith comes back next century — and it sat at the head for a year only
   * because the one piece it used to sell was the whole of what faith did. The gods
   * and the beliefs are what the sheet is about, so they lead and this closes.
   *
   * One city select for all three, aimed at the first town by default: a piece
   * has to stand somewhere and stacking room is asked of that hex, which is one
   * of the sentences `purchaseError` answers with. Three rows and one select is
   * one conversation; three selects would be three.
   */
  function drawClergy(state: GameState, seat: number): HTMLElement {
    const block = element('section', 'rel-purchase');
    block.append(element('p', 'eyebrow sc-eyebrow', 'the clergy'));
    const cities = state.cities.filter((city) => city.ownerId === seat);
    // The price is asked **of a city**, since M9 — a purchase always happens
    // somewhere — so the town has to be picked before the figure can be quoted.
    if (aimedCityId === null || !cities.some((city) => city.id === aimedCityId)) {
      aimedCityId = cities[0]?.id ?? null;
    }
    if (aimedCityId === null) {
      block.append(element('p', 'sc-none', 'You have no city the clergy could be called in.'));
      return block;
    }

    const row = element('div', 'rel-buy-row');
    const select = document.createElement('select');
    select.className = 'rel-city-select';
    for (const city of cities) {
      const option = document.createElement('option');
      option.value = String(city.id);
      option.textContent = city.name;
      select.append(option);
    }
    select.value = String(aimedCityId);
    select.addEventListener('change', () => {
      aimedCityId = Number.parseInt(select.value, 10);
      draw();
    });
    row.append(select);
    block.append(row);

    const list = element('div', 'rel-clergy-list');
    for (const type of CLERGY) {
      const clergyRow = drawClergyRow(state, seat, aimedCityId, type);
      if (clergyRow !== null) list.append(clergyRow);
    }
    block.append(list);
    return block;
  }

  /**
   * The religion's name and the world's count of religions, or, for a seat that
   * has founded none, what a religion is and how one is founded. The head of
   * the Religion & followers tab.
   *
   * The name is editable in place. It is generated so a religion has one at all
   * (`generateReligionName`); renaming changes no rule, so it is a field rather
   * than a ceremony, and a refusal is the reducer's own sentence in the
   * manicule line rather than an error on the control.
   */
  function drawFaithName(state: GameState, seat: number, reading: ReligionReading): HTMLElement {
    const block = element('section', 'rel-faith');
    const mine = reading.religion;
    block.append(element('p', 'eyebrow sc-eyebrow', 'your religion'));

    if (mine === null) {
      block.append(
        element(
          'p',
          'sc-flavor',
          'A religion is a faith of your own: it is founded out of the gods you keep, it ' +
            'spreads from your holy sites into every town near enough to hear it, and it pays ' +
            'you for each town in the world that follows it — including your rivals’.',
        ),
      );
      block.append(element('p', 'rel-faith-how', reading.found!.how));
      // The world's count, and the blocker under it when there is one. The cap
      // is a fact about the world rather than about this seat, so it is printed
      // whether or not anything is stopping this player today.
      block.append(element('p', 'rel-faith-count', reading.count));
      if (reading.found!.blocker !== null) {
        block.append(element('p', 'sc-none', reading.found!.blocker));
      }
      return block;
    }

    const nameRow = element('div', 'rel-faith-name');
    if (options.rename) {
      const field = document.createElement('input');
      field.type = 'text';
      field.className = 'rel-name-field';
      field.value = mine.name;
      field.maxLength = RELIGION_NAME_LIMIT;
      field.setAttribute('aria-label', 'The name of your religion');
      const send = (): void => {
        const next = field.value.trim();
        if (next === mine.name) return;
        const problem = renameReligionError(state, seat, next);
        if (problem !== null) {
          options.onRefuse?.(problem);
          field.value = mine.name;
          return;
        }
        options.rename!(next);
        draw();
      };
      field.addEventListener('change', send);
      field.addEventListener('blur', send);
      nameRow.append(field);
    } else {
      nameRow.append(element('h3', 'rel-faith-title', mine.name));
    }
    block.append(nameRow);
    block.append(element('p', 'rel-faith-count', reading.count));
    return block;
  }

  /**
   * The religion's follower and enhancer beliefs, each wearing the figure it
   * pays, and an empty place saying what fills it. On the Bonuses tab until
   * batch UX10 redraws it. Every figure comes off `religionReading` and the
   * belief stamps.
   */
  function drawBeliefs(state: GameState, seat: number, reading: ReligionReading): HTMLElement {
    const block = element('section', 'rel-faith faith-shelf');
    const mine = reading.religion;
    block.append(element('p', 'eyebrow sc-eyebrow', 'your religion’s beliefs'));
    if (mine === null) {
      block.append(
        element('p', 'sc-none', 'You have founded no religion, so no follower or enhancer belief pays yet.'),
      );
      return block;
    }
    const houses = element('div', 'faith-cards');
    for (const house of reading.houses) {
      const box = element('div', 'rel-house');
      box.append(
        element(
          'p',
          'eyebrow sc-eyebrow',
          `${POOL_WORD[house.pool].name} · ${house.held.length} of ${house.slots}`,
        ),
      );
      for (const id of house.held) {
        const card = element('article', 'rel-slot');
        // The pool is the house's, so a follower belief's face says which shelf
        // it sits on rather than borrowing the pantheon's word.
        drawBeliefFace(card, id, house.pool, beliefStamp(state, seat, id));
        box.append(card);
      }
      if (house.empty > 0) {
        const empty = element('article', 'rel-slot rel-slot-empty');
        empty.append(element('span', 'rel-slot-ghost', SLOT_GLYPH));
        empty.append(element('span', 'sc-slot-empty', house.fills));
        empty.title = POOL_WORD[house.pool].says;
        box.append(empty);
      }
      houses.append(box);
    }
    block.append(houses);
    return block;
  }

  /**
   * What the faith pays whoever holds its holy city, in
   * `explainCardEmpireYields`' own labelled lines, so the figure here is the
   * figure `collectYields` banks. It stops arriving the turn somebody takes the
   * holy city. On the Bonuses tab until batch UX10 redraws it as the holy
   * city's plaque. Nothing for a seat that has founded no religion.
   */
  function drawTrickle(reading: ReligionReading): HTMLElement | null {
    if (reading.religion === null) return null;
    const trickle = element('section', 'rel-trickle faith-shelf');
    trickle.append(element('p', 'eyebrow sc-eyebrow', 'what the holy city is paid'));
    if (reading.trickle.length === 0) {
      trickle.append(element('p', 'sc-none', 'Nothing yet — no town abroad follows you.'));
    } else {
      const list = element('ul', 'rel-price ledger');
      for (const line of reading.trickle) {
        const item = element('li', 'rel-price-line');
        item.append(element('span', 'meter-line-source', line.source));
        item.append(element('span', 'meter-line-value', trickleFigures(line)));
        list.append(item);
      }
      trickle.append(list);
    }
    return trickle;
  }

  /**
   * Every town in the world that follows this seat's religion, with how many of
   * its citizens follow and what the faith presses on it a turn: the Religion &
   * followers tab's pane, until batch UX11 splits it into your towns and
   * foreign towns. Yours and theirs in one list, because a follower belief lands
   * in both. Nothing for a seat that has founded no religion; the column above
   * says how to found one.
   */
  function drawFollowing(reading: ReligionReading): HTMLElement | null {
    const mine = reading.religion;
    if (mine === null) return null;
    const block = element('section', 'rel-faith rel-tide');
    const towns = element('div', 'rel-following');
    towns.append(
      element('p', 'eyebrow sc-eyebrow', `following cities · ${reading.following.length}`),
    );
    if (reading.following.length === 0) {
      towns.append(element('p', 'sc-none', 'Nobody follows you yet. Plant a holy site.'));
    }
    for (const town of reading.following) {
      const row = element('p', town.ours ? 'rel-town' : 'rel-town rel-town-foreign');
      const name = element('span', 'rel-town-name', town.name);
      if (!town.ours) name.style.setProperty('--seat-ink', town.ownerColor);
      row.append(name);
      if (!town.ours) row.append(element('span', 'rel-town-owner', town.ownerName));
      if (town.majority) {
        const mark = element('span', 'rel-town-majority', '✶');
        mark.title = `${mine.name} is the faith of ${town.name}`;
        row.append(mark);
      }
      row.append(
        element(
          'span',
          'rel-town-count',
          `${town.following} of ${town.population} citizens`,
        ),
      );
      // Absent at zero rather than "+0 a turn", which reads as a broken figure:
      // a faith with followers and no pressure is a real state.
      if (town.pressure > 0) {
        row.append(element('span', 'rel-town-press', `+${town.pressure} a turn`));
      }
      // The ledger on hover: `explainPressure`'s own list, the one the tide
      // folds into the bank.
      row.title = pressureLedgerText(town.ledger);
      towns.append(row);
    }
    block.append(towns);
    return block;
  }

  /** One trickle line's figures, in the voices it actually pays. */
  function trickleFigures(line: CardYieldLine): string {
    const parts: string[] = [];
    for (const key of ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const) {
      // Rounded at the eye (batch X): a follower belief's trickle may be a
      // fraction, and a line that rounds to nothing is not a line.
      if (yieldShows(line[key])) parts.push(`${signedYield(line[key])}${YIELD_GLYPH[key]}`);
    }
    return parts.join(' ');
  }

  /** Which city the purchase row is aimed at. A conversation, not the game. */
  let aimedCityId: number | null = null;

  // --- the Rites tab ------------------------------------------------------------

  /** The Rites tab's conversation (`RitesView`), and the seat it belongs to. */
  let ritesView: RitesView = freshRitesView(0);
  let ritesSeat: number | null = null;
  /** The town `openRitesFor` asked about, used by the opening it causes. */
  let pendingTown: number | null = null;
  /** True for the paint after `openRitesFor`, so that town's row is scrolled into view once. */
  let scrollToFocus = false;
  /** The previews and chip voices, kept while the board is unchanged. */
  const riteReadings = createRiteReadingCache();

  /** The conversation for this seat; a seat that changed under the sheet starts afresh. */
  function viewFor(state: GameState, seat: number): RitesView {
    if (ritesSeat !== seat) {
      ritesView = freshRitesView(state.turn);
      ritesSeat = seat;
    }
    return ritesView;
  }

  /**
   * A Start button: one `performRite` command, sent by the page. The gate is
   * asked again at the click, as the clergy row does, because the button was
   * drawn against the board as it stood; a refusal now is said in the reducer's
   * own words instead of being sent. Whether the command was taken is read off
   * the board afterwards (the town keeps the rite), and only then is the start
   * recorded for the faith line and the "started now" mark.
   */
  function startRite(cityId: number, rite: RiteId): void {
    const send = options.performRite;
    if (send === undefined) return;
    const state = options.getState();
    const seat = options.getPlayerId();
    const refusal = riteError(state, seat, cityId, rite);
    if (refusal !== null) {
      options.onRefuse?.(refusal);
      draw();
      return;
    }
    const before = playerById(state, seat)?.faithPool ?? 0;
    send(cityId, rite);
    const after = options.getState();
    const city = after.cities.find((one) => one.id === cityId);
    if (city !== undefined && cityRite(after, city) === rite) {
      ritesView = noteRiteStarted(
        viewFor(after, seat),
        after.turn,
        { cityId, rite },
        before,
        playerById(after, seat)?.faithPool ?? 0,
      );
    }
    draw();
  }

  /**
   * The realm's button: one `empireRite` command with the prophet the model
   * picked, asked of `empireRiteError` again at the click. Taken when the bank
   * paid for it; every town now keeping the rite is recorded as started.
   */
  function sayOverRealm(unitId: number, rite: RiteId): void {
    const send = options.sayRiteOverRealm;
    if (send === undefined) return;
    const state = options.getState();
    const seat = options.getPlayerId();
    const refusal = empireRiteError(state, seat, unitId, rite);
    if (refusal !== null) {
      options.onRefuse?.(refusal);
      draw();
      return;
    }
    const before = playerById(state, seat)?.faithPool ?? 0;
    send(unitId, rite);
    const after = options.getState();
    const bank = playerById(after, seat)?.faithPool ?? 0;
    if (bank < before) {
      const towns = after.cities
        .filter((city) => city.ownerId === seat && cityRite(after, city) === rite)
        .map((city) => city.id);
      ritesView = noteRealmRite(viewFor(after, seat), after.turn, rite, towns, before, bank);
    }
    draw();
  }

  /** The Rites tab: its model, read with this paint's shared sheet, and drawn. */
  function drawRites(state: GameState, seat: number): HTMLElement {
    const view = viewFor(state, seat);
    const model = ritesTabModel(state, seat, view, riteReadings.readings(state, seat, sheet ?? undefined));
    const openCity = options.openCity;
    return drawRitesTab(model, {
      selectRite: (rite) => {
        ritesView = selectRite(ritesView, rite);
        draw();
      },
      toggleMenu: (cityId) => {
        ritesView = toggleTownMenu(ritesView, cityId);
        draw();
      },
      start: options.performRite === undefined ? undefined : startRite,
      sayOverRealm: options.sayRiteOverRealm === undefined ? undefined : sayOverRealm,
      // A town's name opens its city screen and closes the sheet, which would
      // otherwise stand in front of it.
      openCity:
        openCity === undefined
          ? undefined
          : (cityId) => {
              shell.close();
              openCity(cityId);
            },
    });
  }

  // --- the other two tabs, as they stand until UX10 and UX11 ----------------------

  /** The Bonuses tab: the gods, the religion's beliefs, and the holy city's share. */
  function drawBonuses(state: GameState, seat: number): HTMLElement {
    const reading = religionReading(state, seat);
    const pane = element('div', 'faith-bonuses');
    pane.append(drawGods(state, seat));
    pane.append(drawBeliefs(state, seat, reading));
    const trickle = drawTrickle(reading);
    if (trickle !== null) pane.append(trickle);
    return pane;
  }

  /**
   * The Religion & followers tab: the Statecraft sheet's split, with the
   * religion's name and the wheel in the fixed column, and who follows and the
   * clergy in the pane that scrolls.
   */
  function drawReligionTab(state: GameState, seat: number): HTMLElement {
    const reading = religionReading(state, seat);
    const split = element('div', 'sc-split');
    const column = element('aside', 'sc-column');
    const stack = element('div', 'sc-column-body');
    stack.append(drawFaithName(state, seat, reading));
    stack.append(drawWheelBlock(state, seat));
    column.append(stack);
    split.append(column);
    const pane = element('div', 'sc-pane');
    const following = drawFollowing(reading);
    if (following !== null) pane.append(following);
    pane.append(drawClergy(state, seat));
    split.append(pane);
    return split;
  }

  // --- the frame: tabs, the bank, and one paint ------------------------------------

  /** The row over every tab: the three tabs, and the faith bank in the bank display's style. */
  function drawHead(state: GameState, seat: number, tab: FaithTab): HTMLElement {
    const head = element('div', 'faith-head');
    const tabs = element('div', 'faith-tabs');
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', 'Faith sheet tabs');
    for (const { tab: which, label } of FAITH_TABS) {
      const on = which === tab;
      const button = element('button', on ? 'faith-tab is-on' : 'faith-tab');
      button.type = 'button';
      button.dataset.key = `tab:${which}`;
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.append(element('span', 'faith-tab-label', label));
      if (which === 'rites') button.append(element('span', 'faith-tab-count', ritesCount(state, seat)));
      button.addEventListener('click', () => {
        chooseFaithTab(seat, which);
        draw();
      });
      tabs.append(button);
    }
    head.append(tabs);
    head.append(bankLineElement([readBank(state, seat, 'faith')]));
    return head;
  }

  /** Where things stood before a repaint, so the repaint can keep them. */
  interface Layout {
    tab: string | null;
    scroll: number;
    /** Each town row's top, by town id. */
    rows: Map<string, number>;
    /** The `data-key` of the control that had the keyboard. */
    focus: string | null;
  }

  /** Set when the sheet opens: the first paint of a visit keeps nothing from the last one. */
  let fresh = true;

  function measure(): Layout {
    const panel = body.querySelector<HTMLElement>('.faith-panel');
    const rows = new Map<string, number>();
    for (const row of body.querySelectorAll<HTMLElement>('.faith-town[data-city]')) {
      rows.set(row.dataset.city!, row.getBoundingClientRect().top);
    }
    const active = document.activeElement;
    const focus =
      active instanceof HTMLElement && body.contains(active)
        ? (active.closest<HTMLElement>('[data-key]')?.dataset.key ?? null)
        : null;
    return { tab: panel?.dataset.tab ?? null, scroll: panel?.scrollTop ?? 0, rows, focus };
  }

  /**
   * The rows slide from where they were to where they are (the user's
   * mockup: "slide into place"), as a transform that ends where the layout
   * already is, so nothing waits on it. Skipped under reduced motion.
   */
  function slide(before: Map<string, number>): void {
    for (const row of body.querySelectorAll<HTMLElement>('.faith-town[data-city]')) {
      const was = before.get(row.dataset.city!);
      if (was === undefined) continue;
      const moved = was - row.getBoundingClientRect().top;
      if (Math.abs(moved) < 1) continue;
      row.animate?.([{ transform: `translateY(${moved}px)` }, { transform: 'translateY(0)' }], {
        duration: 360,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      });
    }
  }

  /**
   * Gives the keyboard back to the control that had it. A Start button whose
   * town has just moved to the kept group is gone, so the keyboard goes to the
   * selected rite's chip, or, from a menu, to that town's name.
   */
  function giveBackFocus(key: string | null): void {
    if (key === null) return;
    let target = body.querySelector<HTMLElement>(`[data-key="${key}"]`);
    if (target === null && ritesView.selected !== null) {
      target = body.querySelector<HTMLElement>(`[data-key="chip:${ritesView.selected}"]`);
    }
    if (target === null) {
      const city = /^(?:start|menu|menu-start):(\d+)/.exec(key)?.[1];
      if (city !== undefined) target = body.querySelector<HTMLElement>(`[data-key="name:${city}"]`);
    }
    target?.focus({ preventScroll: true });
  }

  /** After a paint: the scroll, the slide and the keyboard, kept from before it. */
  function settle(panel: HTMLElement, tab: FaithTab, before: Layout | null): void {
    if (before !== null) {
      if (before.tab === tab) {
        panel.scrollTop = before.scroll;
        if (wantsMotion()) slide(before.rows);
      }
      giveBackFocus(before.focus);
    }
    if (scrollToFocus && tab === 'rites') {
      scrollToFocus = false;
      body.querySelector<HTMLElement>('.faith-town.is-focus')?.scrollIntoView({ block: 'nearest' });
    }
  }

  function draw(): void {
    sheet = cardImpactSheet(options.getState(), options.getPlayerId());
    try {
      paint();
    } finally {
      sheet = null;
    }
  }

  function paint(): void {
    const state = options.getState();
    const seat = options.getPlayerId();
    const before = fresh ? null : measure();
    fresh = false;
    body.replaceChildren();
    if (!playerById(state, seat)) return;
    const tab = faithTabFor(seat);
    body.append(drawHead(state, seat, tab));
    const panel = element('div', `faith-panel is-${tab}`);
    panel.dataset.tab = tab;
    if (tab === 'rites') panel.append(drawRites(state, seat));
    else if (tab === 'bonuses') panel.append(drawBonuses(state, seat));
    else panel.append(drawReligionTab(state, seat));
    body.append(panel);
    settle(panel, tab, before);
  }

  /**
   * The frame (`modalShell.ts`). Opening forgets the last visit's rite mode,
   * menu and starts (`onShow`); Escape on the Rites tab leaves rite mode, then
   * an open menu, before the shell closes the sheet (`onKey`).
   */
  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    trigger,
    onOpen: () => options.onOpen?.(),
    onShow: () => {
      const state = options.getState();
      ritesView = freshRitesView(state.turn);
      ritesSeat = options.getPlayerId();
      if (pendingTown !== null) {
        ritesView = ritesViewForTown(ritesView, pendingTown);
        pendingTown = null;
        scrollToFocus = true;
      }
      fresh = true;
    },
    onKey: (event) => {
      if (event.key !== 'Escape') return false;
      if (faithTabFor(options.getPlayerId()) !== 'rites') return false;
      const next = escapeRites(ritesView);
      if (next === null) return false;
      event.preventDefault();
      event.stopPropagation();
      ritesView = next;
      draw();
      return true;
    },
    draw,
  });

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open: shell.open,
    close: shell.close,
    toggle: shell.toggle,
    openRitesFor(cityId: number): void {
      const seat = options.getPlayerId();
      chooseFaithTab(seat, 'rites');
      if (shell.isOpen) {
        ritesView = ritesViewForTown(viewFor(options.getState(), seat), cityId);
        scrollToFocus = true;
        shell.refresh();
        return;
      }
      pendingTown = cityId;
      shell.open();
    },
    refresh: shell.refresh,
    dispose: shell.dispose,
  };
}
