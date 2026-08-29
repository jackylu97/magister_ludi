/**
 * The Religion screen: your faith, your gods, your augurs, your rites.
 *
 * The fourth full-screen overlay and the second parchment one, and it is
 * deliberately the Statecraft sheet's sibling rather than a new language: same
 * bones, same keyboard contract (`hidden` is the whole of the screen state,
 * Escape closes it, the × and a click on the ground do the same, opening it
 * closes whatever else was up), same card face. Two systems that draft
 * permanent things from a pool should not look like two different games.
 *
 * What it graduates from
 * ----------------------
 * The dock's Faith popover (`hudDock.ts`) was a promise about where religion
 * would live, made before religion existed — "the faithful gather, their purpose
 * comes later". This is later. The popover's whole content is the first block
 * of this sheet, in the same figures, because there is no second arithmetic to
 * disagree with the first.
 *
 * The axis, and why it is a glyph
 * -------------------------------
 * A belief's axis is its synergy thread (`BeliefAxis` — "for the screen's
 * grouping and for nothing else"), and it is drawn as an **accent plus a
 * glyph** rather than as a drawn emblem. `cardLine.ts`'s marks are the
 * Statecraft deck's seven threads; borrowing one for the hearth would say a
 * belief is a card of the Wild Hunt, which is not true. A glyph is the
 * interface's other symbol channel (`figures.ts`), it inherits the type ramp
 * and the accent ink, and it costs no drawing — which is what the design pass
 * asked for.
 *
 * Two panes, and the pantheon never leaves
 * ----------------------------------------
 * The user's note (2026-08-27), one screen after the same note about
 * Statecraft: "ideally it would also fit on a single screen; split panes would
 * be good here too". The sheet used to be one column — the pool and the augur,
 * then the wheel and eighteen-hundred pixels of slot cards, then the rites —
 * and a player deciding whether to call an augur had to scroll past their own
 * gods to reach the button that calls one.
 *
 * It is now the same **split** the Statecraft sheet is, down to the classes and
 * the breakpoint: the pantheon is a fixed column on the left — the wheel, the
 * gods under it, the count over it — and everything a player *does* is a pane
 * that scrolls beside it. The division is "what my faith is" against "what I
 * can do with it", which is also why the pool figure moved: how much faith has
 * gathered is not a fact about the sky, it is the first line of the price.
 *
 * A god in the column is a **row**, not the tall card it was. That is the hand's
 * argument from `statecraftScreen.ts` — the tarot proportion is the ceremony and
 * it stays where the ceremony is (`offerCard.ts`, which is where a god is dealt
 * and turned over) — and it costs the same one thing it cost there: the flavour
 * line, which is the only part of a card that says nothing about what the card
 * does, and which the offer still prints.
 *
 * Derived, never stored
 * ---------------------
 * Nothing on this screen is state. The slots are `pantheonSlots(techs)`, the
 * price is `explainPurchaseCost`, the rites are the table filtered by
 * `hasAbility`, and every clause a belief prints is `describeCard` — the same
 * function the offer that dealt it printed. The one thing this file keeps is
 * which city the purchase row is aimed at, which is a fact about a
 * conversation and not about the game (`statecraftScreen.ts`'s held card, one
 * screen over).
 *
 * One rule, one sentence
 * ----------------------
 * The purchase button is enabled by `purchaseError` and disabled with its
 * sentence, which is the sentence the reducer would answer with — so a button a
 * player can press is a command the simulation takes.
 */

import { civYields } from './topBar';
import { poolFigure } from './figures';
import {
  type PressureLine,
  availableRites,
  beliefPool,
  explainPressure,
  foundReligionError,
  holySites,
  maxReligions,
  pantheonSlots,
  poolHeld,
  poolSlots,
  renameReligionError,
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
  RELIGION,
  RELIGION_BELIEF_POOLS,
  beliefDef,
  riteDef,
} from '../sim/religionData';
import { drawPantheonWheel, pantheonWheelLayout } from './pantheonWheel';
import { type CardYieldLine, cardEmpireYields, describeCard, stripRefs } from '../sim/statecraft';
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
import type { UnitTypeId } from '../sim/unitData';
import { YIELD_GLYPH } from './yieldMark';

/**
 * The mark each axis wears, and the accent it is drawn in.
 *
 * The glyphs are `docs/religion.md`'s own — the table was authored with them,
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

/**
 * A rite's **instant** half in words — the bag it pays the moment it is
 * performed, as against the lasting clauses `describeCard` prints.
 *
 * Read off the row that will pay it — the same `RiteGrantSpec` `payRiteGrant`
 * walks — so the sentence and the payout cannot drift. It is not `describeCard`'s
 * job and could not be: a clause is an ordinary `CardEffect` and knows nothing
 * about the rite it hangs on, while a grant is a bag of *destinations* (a rite's
 * culture fills the empire's draft basket, its border culture fills one town's).
 *
 * Exported because the Compendium prints the same sentence on its Rites shelf,
 * and two surfaces describing one rite two ways is precisely what every
 * describer in this codebase exists to prevent. This screen is where it lives
 * because this screen is where a rite is *performed*.
 *
 * Empty for a **redraw** rite, which pays no bucket at all (`RiteDef.redraws`):
 * what that one does is its row's `note`, printed beside these words by both
 * surfaces, and inventing a figure-shaped fragment for it here would be a
 * second description of a rule the data already states.
 */
export function riteGrantWords(id: RiteId): string {
  const grant = riteDef(id).grant ?? {};
  const parts: string[] = [];
  if (grant.population !== undefined) parts.push(`+${grant.population} population`);
  if (grant.science !== undefined) parts.push(`+${grant.science} science`);
  if (grant.gold !== undefined) parts.push(`+${grant.gold} gold`);
  if (grant.faith !== undefined) parts.push(`+${grant.faith} faith`);
  if (grant.culture !== undefined) parts.push(`+${grant.culture} culture`);
  if (grant.borderCulture !== undefined) {
    parts.push(`+${grant.borderCulture} culture toward the city's borders`);
  }
  if (grant.production !== undefined) parts.push(`+${grant.production} production`);
  if (grant.food !== undefined) parts.push(`+${grant.food} food`);
  if (grant.healFully === true) parts.push('heals the unit fully');
  return parts.join(', ');
}

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
 * `enhanceReligionError`'s own refusal sentence — the day the sim moves the
 * gate, the pane's word for it fails rather than quietly lying.
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
   * comes off `cardEmpireYields` and so goes to zero on its own.
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
 * are `poolSlots`/`poolHeld`, the trickle is `cardEmpireYields` filtered to the
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
    trickle = cardEmpireYields(state, seat).filter((line) => line.source.startsWith(word));

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
        ownerName: owner?.name ?? 'somebody',
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

/** A signed whole figure, for a ledger a temple can subtract from. */
function signed(amount: number): string {
  return amount < 0 ? String(amount) : `+${amount}`;
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
export function beliefOfferEyebrow(pool: ReligionBeliefPool | undefined): string {
  if (pool === undefined) return 'a god · permanent, and never converted away';
  if (pool === 'follower') return 'a follower belief · applies in every city that follows';
  return 'an enhancer belief · bends how your faith spreads';
}

export interface ReligionScreen {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
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
   * Sends `renameReligion`. Optional, so a page with no religion verb wired
   * simply shows the name as a heading rather than as a field — the same
   * bargain `onOpenTrade` makes one sheet over.
   */
  rename?: (name: string) => void;
  /** Said in the manicule line — a refusal, in the reducer's own words. */
  onRefuse?: (message: string) => void;
  onOpen?: () => void;
}

function element(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
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
 */
function drawBeliefFace(into: HTMLElement, id: BeliefId): void {
  const def = beliefDef(id);
  into.dataset.axis = def.axis;
  into.title = def.name;
  const head = element('div', 'sc-card-head');
  const mark = axisMarkNode(def.axis);
  mark.classList.add('rel-card-emblem');
  head.append(mark);
  head.append(element('span', 'sc-card-type', 'a god'));
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
}

export function createReligionScreen(options: ReligionScreenOptions): ReligionScreen {
  const { overlay, body, closeButton, trigger } = options;

  function isOpen(): boolean {
    return !overlay.hidden;
  }

  function setExpanded(): void {
    trigger?.setAttribute('aria-expanded', String(isOpen()));
  }

  /** The pool and its rate — the Faith popover's whole content, folded in. */
  function drawPool(state: GameState, seat: number): HTMLElement {
    const block = element('section', 'rel-pool');
    const player = playerById(state, seat);
    const rate = civYields(state, seat).faith;
    block.append(element('p', 'eyebrow sc-eyebrow', 'faith gathered'));
    const figure = element('p', 'rel-pool-figure');
    figure.textContent = player ? poolFigure(player.faithPool, rate) : '—';
    block.append(figure);
    block.append(
      element(
        'p',
        'sc-flavor',
        'Faith buys augurs. An augur can name a belief or perform a rite. Nothing else spends faith.',
      ),
    );
    return block;
  }

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
   * The pantheon: the wheel, and one place per slot **under** it.
   *
   * The slot list is the Statecraft idiom and the same argument for it — a run
   * of slots is a run of *places a thing goes*, and the shape says so before any
   * of the words are read. What differs is that a god never comes back out, so
   * there is nothing to click: these are `article`s, not buttons.
   *
   * The wheel does not replace them, and the two are not the same picture: the
   * wheel is the **pool** — where a god sits in the sky and what it is next to —
   * and a slot is a god's **face**, which is what it actually does. A player
   * wants both, so they are stacked in one column: the sky, then the gods in it.
   * They sat side by side while this was a full-width sheet; in a 320px column a
   * card beside the wheel is two things neither of which can be read.
   */
  function drawPantheon(state: GameState, seat: number): HTMLElement {
    const block = element('section', 'rel-pantheon');
    const player = playerById(state, seat);
    const slots = pantheonSlots(state, seat);
    const held = player?.pantheon.beliefs ?? [];
    block.append(
      element('p', 'eyebrow sc-eyebrow', `pantheon · ${held.length} of ${slots}`),
    );
    const wheelRow = element('div', 'rel-wheel-row');
    wheelRow.append(drawWheel(state, seat, slots));
    block.append(wheelRow);
    if (slots === 0) {
      block.append(
        element(
          'p',
          'sc-none',
          'Your people keep no gods yet. Divination opens the first two places at the fire.',
        ),
      );
      return block;
    }
    const row = element('div', 'rel-slot-row');
    for (let index = 0; index < slots; index++) {
      const id = held[index];
      const card = element('article', id === undefined ? 'rel-slot rel-slot-empty' : 'rel-slot');
      if (id === undefined) {
        card.append(element('span', 'rel-slot-ghost', SLOT_GLYPH));
        card.append(element('span', 'sc-slot-empty', 'unnamed'));
        card.title = 'An augur may consecrate a god here';
      } else {
        drawBeliefFace(card, id);
      }
      row.append(card);
    }
    // Under the wheel, in the same column: the sky and the faces are two
    // readings of one pantheon and the column is the whole of it.
    block.append(row);
    // Gods held beyond the slots the tree currently opens: only reachable from a
    // hand-edited save, and drawn rather than hidden, because a god you hold is
    // a god that pays.
    for (const id of held.slice(slots)) {
      const card = element('article', 'rel-slot');
      drawBeliefFace(card, id);
      row.append(card);
    }
    if (player && held.length < slots) {
      block.append(
        element(
          'p',
          'sc-hand',
          `${beliefPool(state, player).length} gods are still unnamed. Consecrating spends the whole augur, whatever rites are left in it.`,
        ),
      );
    }
    return block;
  }

  /** The price, line by line — rule 5 for a thing you buy. */
  function drawPrice(price: PurchasePrice): HTMLElement {
    const list = element('ul', 'rel-price ledger');
    for (const line of price.lines) {
      const item = element('li', 'rel-price-line');
      item.append(element('span', 'meter-line-source', line.source));
      item.append(element('span', 'meter-line-value', String(line.amount)));
      list.append(item);
    }
    const total = element('li', 'rel-price-line rel-price-total ledger-total');
    total.append(element('span', 'meter-line-source', 'to call one'));
    total.append(element('span', 'meter-line-value', `${price.total} ${price.currency}`));
    list.append(total);
    return list;
  }

  /**
   * The purchase row: what an augur costs here, and the button that calls one.
   *
   * Aimed at the **capital** by default and at whichever city the player names
   * with the select. A city rather than "the empire" because the piece has to
   * stand somewhere, and stacking room is asked of that hex — which is one of
   * the sentences `purchaseError` can answer with.
   */
  function drawPurchase(state: GameState, seat: number): HTMLElement {
    const block = element('section', 'rel-purchase');
    block.append(element('p', 'eyebrow sc-eyebrow', 'the augur'));
    const type: UnitTypeId = 'augur';
    const item: PurchasableItem = { kind: 'unit', id: type };
    const cities = state.cities.filter((city) => city.ownerId === seat);
    // The price is asked **of a city**, since M9 — a purchase always happens
    // somewhere — so the town has to be picked before the figure can be quoted.
    if (aimedCityId === null || !cities.some((city) => city.id === aimedCityId)) {
      aimedCityId = cities[0]?.id ?? null;
    }
    const price =
      aimedCityId === null ? null : explainPurchaseCost(state, seat, aimedCityId, item, 'faith');
    if (!price || cities.length === 0) {
      block.append(element('p', 'sc-none', 'You have no city an augur could be bought in.'));
      return block;
    }
    const gate = gatingTech('unit', type);
    block.append(
      element(
        'p',
        'sc-flavor',
        `An augur carries three rites, or names one belief. ${
          gate === null ? '' : `Called by those who have ${techDef(gate).name}.`
        }`,
      ),
    );
    block.append(drawPrice(price));

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

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-primary rel-buy';
    button.textContent = `Call an augur · ${price.total} ${price.currency}`;
    const problem = purchaseError(state, seat, aimedCityId!, item, price.currency);
    button.disabled = problem !== null;
    button.title = problem ?? `An augur joins ${select.selectedOptions[0]?.textContent ?? 'the city'}`;
    button.addEventListener('click', () => {
      const blocked = purchaseError(state, seat, aimedCityId!, item, price.currency);
      if (blocked !== null) {
        options.onRefuse?.(blocked);
        return;
      }
      options.buy(aimedCityId!, item, price.currency);
      draw();
    });
    row.append(button);
    block.append(row);
    return block;
  }

  /**
   * The religion block: what this seat's faith **is**, and who follows it.
   *
   * Two states and no third, which is the whole of `foundedReligion`'s reading:
   * a seat that has founded nothing is told what a religion is and how one is
   * founded, with the world's count against the cap beside it — because "can I
   * still have one" is the first question, and the answer stops being yes. A
   * seat that has one gets its name, its houses, what its followers pay it, and
   * the list of towns that follow.
   *
   * Every figure comes off `religionReading`, which is pure and pinned; this
   * function is the DOM and the two controls (the name field, and the hover on
   * each town's row).
   */
  function drawReligion(state: GameState, seat: number): HTMLElement {
    const block = element('section', 'rel-faith');
    const reading = religionReading(state, seat);
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
      // is a fact about the *world* rather than about this seat, which is why it
      // is printed whether or not anything is stopping this player today.
      block.append(element('p', 'rel-faith-count', reading.count));
      if (reading.found!.blocker !== null) {
        block.append(element('p', 'sc-none', reading.found!.blocker));
      }
      return block;
    }

    // The name, editable in place. It is generated so a religion has one at all
    // (`generateReligionName`); renaming changes no rule, which is why this is a
    // field rather than a ceremony, and why a refusal is the reducer's own
    // sentence in the manicule line rather than an error on the control.
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

    // The houses. An empty one says what fills it rather than showing a ghost
    // and nothing else — the gods' slot row is a place a player already knows
    // how to fill, and a religion's two houses are not.
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
        drawBeliefFace(card, id);
        box.append(card);
      }
      if (house.empty > 0) {
        const empty = element('article', 'rel-slot rel-slot-empty');
        empty.append(element('span', 'rel-slot-ghost', SLOT_GLYPH));
        empty.append(element('span', 'sc-slot-empty', house.fills));
        empty.title = POOL_WORD[house.pool].says;
        box.append(empty);
      }
      block.append(box);
    }

    // What the faith pays whoever holds its holy city. `cardEmpireYields`' own
    // labelled lines, so the figure here is the figure `collectYields` banks —
    // and it stops arriving the turn somebody takes the holy city off you.
    const trickle = element('div', 'rel-trickle');
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
    block.append(trickle);

    // The congregation. Yours and theirs in one list, because a follower belief
    // lands in both and a player reading two lists would be reading one rule
    // twice — the foreign towns are the ones that pay the trickle, and the ones
    // whose owners are quietly getting your beliefs.
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
      // And whether the town is still moving. A congregation is a standing
      // count; the tide is the derivative, and the two together are the whole
      // of "is this one mine yet". Absent at zero rather than "+0 a turn",
      // which reads as a broken figure — a faith with followers and no pressure
      // is a real state (the tide carried it here and has receded).
      if (town.pressure > 0) {
        row.append(element('span', 'rel-town-press', `+${town.pressure} a turn`));
      }
      // The ledger on hover, and it is `explainPressure`'s own list — the same
      // one the tide folds into the bank.
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
      if (line[key] !== 0) parts.push(`+${line[key]}${YIELD_GLYPH[key]}`);
    }
    return parts.join(' ');
  }

  /**
   * The rites, as a reference: what each does, and what it is waiting on.
   *
   * Every rite in the table, not only the known ones, and the unknown ones say
   * which node teaches them — a reference that hid what you have not learnt yet
   * would be a reference you cannot plan against. Which are known is
   * `hasAbility` through `availableRites`, so this list and the augur's own
   * panel cannot disagree about what is greyed.
   */
  function drawRites(state: GameState, seat: number): HTMLElement {
    const block = element('section', 'rel-rites');
    block.append(element('p', 'eyebrow sc-eyebrow', 'rites · one charge each'));
    const known = new Set<RiteId>(availableRites(state, seat));
    const list = element('div', 'rel-rite-list');
    for (const id of Object.keys(RELIGION.rites) as RiteId[]) {
      const def = riteDef(id);
      const row = element('div', known.has(id) ? 'rel-rite' : 'rel-rite rel-rite-locked');
      const head = element('p', 'rel-rite-head');
      head.append(element('span', 'rel-rite-name', def.name));
      head.append(
        element(
          'span',
          'rel-rite-tech',
          known.has(id) ? 'known' : `needs ${techDef(def.tech).name}`,
        ),
      );
      row.append(head);
      const clauses = describeCard(id);
      const grantWords = riteGrantWords(id);
      // **How long the lasting half lasts.** `describeCard` cannot say it: a
      // clause is an ordinary `CardEffect` and knows nothing about the rite it
      // hangs on, so the duration is the row's own (`RiteDef.duration`) and is
      // printed here, beside the clauses it qualifies. Without it the reference
      // promised Omen Reading's science for ever.
      const lasting = clauses.length > 0 && def.duration !== undefined
        ? `for ${def.duration} turns`
        : '';
      // Composed as one sentence and **drawn as a descriptor**: a rite's row is
      // prose in a `<p>` and nothing on it answers a click, so the things its
      // clauses name are live keywords. The join is inside the call because the
      // marks have to survive it — a plain `textContent` here would print
      // brackets.
      const say = element('p', 'rel-rite-say');
      setDescriptorText(
        say,
        // The row's **note** is the fourth part and the only one a rite with no
        // grant and no clauses has (Recasting the Omens): player prose on the
        // data row, printed rather than restated, which is where hard rule 7
        // puts a rule the effect vocabulary has no shape for.
        [grantWords, clauses.map((clause) => clause.text).join(' · '), def.note ?? '', lasting]
          .filter((part) => part.length > 0)
          .join(' · '),
      );
      row.append(say);
      // Labelled, for the Compendium's reason (copy pass, 2026-08-28): the
      // rite's own payoff line sits directly above it in the same column.
      const flavor = element('p', 'sc-flavor');
      flavor.append(element('span', 'flavor-label', 'Flavour'));
      flavor.append(document.createTextNode(def.flavor));
      row.append(flavor);
      list.append(row);
    }
    block.append(list);
    // Said once, here, because it is the rule that makes the whole system a
    // decision rather than a queue: the agent is the cost.
    block.append(
      element(
        'p',
        'sc-flavor',
        'An augur carries three rites. Naming a belief spends the whole augur, however many rites are left.',
      ),
    );
    return block;
  }

  /** Which city the purchase row is aimed at. A conversation, not the game. */
  let aimedCityId: number | null = null;

  function draw(): void {
    const state = options.getState();
    const seat = options.getPlayerId();
    body.replaceChildren();
    if (!playerById(state, seat)) return;
    // The split, and it is the Statecraft sheet's own — the same four classes,
    // so the two parchment screens cannot drift apart and the width at which
    // they stack is one media query rather than two that agree today.
    const split = element('div', 'sc-split');
    const column = element('aside', 'sc-column');
    const stack = element('div', 'sc-column-body');
    stack.append(drawPantheon(state, seat));
    column.append(stack);
    split.append(column);

    const pane = element('div', 'sc-pane');
    // The pool and the price on one line: how much faith has gathered is the
    // first line of what an augur costs, and reading the two apart was the old
    // sheet asking a player to hold a figure in their head while they scrolled.
    const head = element('div', 'sc-head-row');
    head.append(drawPool(state, seat));
    head.append(drawPurchase(state, seat));
    pane.append(head);
    // The religion above the rites, because it is the larger question: a rite is
    // one charge of one augur, and a faith is the thing the whole screen is
    // about. The pantheon stays in the column — what your empire *is* — and this
    // is what it has been made into, which is a thing you do with it.
    pane.append(drawReligion(state, seat));
    pane.append(drawRites(state, seat));
    split.append(pane);
    body.append(split);
  }

  function open(): void {
    if (isOpen()) return;
    options.onOpen?.();
    overlay.hidden = false;
    setExpanded();
    draw();
    closeButton.focus();
  }

  function close(): void {
    if (!isOpen()) return;
    overlay.hidden = true;
    setExpanded();
    trigger?.focus();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  const onOverlayClick = (event: MouseEvent): void => {
    if (event.target === overlay) close();
  };

  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', onOverlayClick);
  window.addEventListener('keydown', onKeyDown, true);

  return {
    get isOpen(): boolean {
      return isOpen();
    },
    open,
    close,
    toggle(): void {
      if (isOpen()) close();
      else open();
    },
    refresh(): void {
      if (isOpen()) draw();
    },
    dispose(): void {
      closeButton.removeEventListener('click', close);
      overlay.removeEventListener('click', onOverlayClick);
      window.removeEventListener('keydown', onKeyDown, true);
      overlay.hidden = true;
      body.replaceChildren();
    },
  };
}
