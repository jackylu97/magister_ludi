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
import { availableRites, beliefPool, pantheonSlots } from '../sim/religion';
import {
  type PurchasableItem,
  type PurchasePrice,
  explainPurchaseCost,
  purchaseError,
} from '../sim/purchase';
import {
  type BeliefAxis,
  type BeliefId,
  type RiteId,
  BELIEF_IDS,
  RELIGION,
  beliefDef,
  riteDef,
} from '../sim/religionData';
import { drawPantheonWheel, pantheonWheelLayout } from './pantheonWheel';
import { describeCard } from '../sim/statecraft';
import { type GameState, playerById } from '../sim/state';
import { gatingTech } from '../sim/tech';
import { techDef } from '../sim/techData';
import type { UnitTypeId } from '../sim/unitData';

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
  const clauses = describeCard(id).map((clause) => clause.text);
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
  for (const clause of describeCard(id)) {
    const item = element('li', clause.deferred ? 'sc-clause sc-clause-deferred' : 'sc-clause');
    item.textContent = clause.text;
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
        'Faith buys augurs, and augurs buy gods. Nothing else spends it.',
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
          `${beliefPool(player).length} gods are still unnamed. Consecrating spends the whole augur, whatever rites are left in it.`,
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
      block.append(element('p', 'sc-none', 'You have no city an augur could be called to.'));
      return block;
    }
    const gate = gatingTech('unit', type);
    block.append(
      element(
        'p',
        'sc-flavor',
        `Three rites, or one god. ${
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
      const said = clauses.map((clause) => clause.text).join(' · ');
      const grantWords = describeGrant(id);
      // **How long the lasting half lasts.** `describeCard` cannot say it: a
      // clause is an ordinary `CardEffect` and knows nothing about the rite it
      // hangs on, so the duration is the row's own (`RiteDef.duration`) and is
      // printed here, beside the clauses it qualifies. Without it the reference
      // promised Omen Reading's science for ever.
      const lasting = clauses.length > 0 && def.duration !== undefined
        ? `for ${def.duration} turns`
        : '';
      row.append(
        element(
          'p',
          'rel-rite-say',
          [grantWords, said, lasting].filter((part) => part.length > 0).join(' · '),
        ),
      );
      row.append(element('p', 'sc-flavor', def.flavor));
      list.append(row);
    }
    block.append(list);
    // Said once, here, because it is the rule that makes the whole system a
    // decision rather than a queue: the agent is the cost.
    block.append(
      element(
        'p',
        'sc-flavor',
        'An augur carries three rites. Consecrating a god spends the whole augur, however many are left.',
      ),
    );
    return block;
  }

  /**
   * A rite's instant half in words.
   *
   * Read off the row that will pay it — the same bag `payRiteGrant` walks — so
   * the reference and the payout cannot drift.
   */
  function describeGrant(id: RiteId): string {
    const grant = riteDef(id).grant;
    const parts: string[] = [];
    if (grant.population !== undefined) parts.push(`+${grant.population} population`);
    if (grant.science !== undefined) parts.push(`+${grant.science} science`);
    if (grant.gold !== undefined) parts.push(`+${grant.gold} gold`);
    if (grant.faith !== undefined) parts.push(`+${grant.faith} faith`);
    if (grant.culture !== undefined) parts.push(`+${grant.culture} culture`);
    if (grant.borderCulture !== undefined) {
      parts.push(`+${grant.borderCulture} culture toward the city's bounds`);
    }
    if (grant.production !== undefined) parts.push(`+${grant.production} production`);
    if (grant.food !== undefined) parts.push(`+${grant.food} food`);
    if (grant.healFully === true) parts.push('heals the unit whole');
    return parts.join(', ');
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
