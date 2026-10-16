/**
 * The hover cards' rules, driven on the pure stack (`src/ui/keywordCardStack.ts`,
 * batch T2): when a card shows, how it locks, how cards nest, what back, Escape
 * and a click outside close, and the safety rule for a keyword inside a control.
 *
 * Keywords are plain strings here. The stack never looks inside its anchors, so
 * a string is as good a keyword as an element, and the suite needs no DOM.
 */

import { describe, expect, it } from 'vitest';

import {
  KEYWORD_GRACE_MS,
  KEYWORD_HOLD_MS,
  KEYWORD_SHOW_MS,
  type KeywordAt,
  type KeywordCardEvent,
  type KeywordCardState,
  closedKeywordCards,
  graceTimerFor,
  holdTimerFor,
  keywordCardStep,
  keywordCardsOpen,
  placeKeywordCard,
  showTimerFor,
  shownCards,
} from '../../src/ui/keywordCardStack';

type State = KeywordCardState<string>;
type Event = KeywordCardEvent<string>;

/** A keyword on the page. */
function page(anchor: string, linked = true): KeywordAt<string> {
  return { anchor, ref: `building:${anchor}`, origin: null, linked };
}

/** A keyword on card `card`. */
function onCard(card: number, anchor: string, ref = `building:${anchor}`): KeywordAt<string> {
  return { anchor, ref, origin: card, linked: true };
}

/** The pointer arriving on a keyword; it is on the keyword's card too. */
function hover(keyword: KeywordAt<string>): Event {
  return { type: 'pointer', card: keyword.origin, keyword };
}

/** The pointer on a card, on no keyword. */
function onto(card: number): Event {
  return { type: 'pointer', card, keyword: null };
}

const AWAY: Event = { type: 'pointer', card: null, keyword: null };
const SHOW: Event = { type: 'showDue' };
const HOLD: Event = { type: 'holdDue' };
const GRACE: Event = { type: 'graceDue' };
const ESCAPE: Event = { type: 'escape' };

function click(keyword: KeywordAt<string>): Event {
  return { type: 'activate', keyword };
}

function run(state: State, ...events: Event[]): State {
  return events.reduce(keywordCardStep, state);
}

const start = (): State => closedKeywordCards<string>();

/** The chain as refs, and the preview's ref on the end in brackets. */
function chain(state: State): string[] {
  return [
    ...state.locked.map((card) => `${card.ref}${card.pinned ? '' : ' (held)'}`),
    ...(state.preview === null ? [] : [`[${state.preview.ref}]`]),
  ];
}

/** A card pinned from the page, and the state it leaves. */
function pinned(anchor: string): State {
  return run(start(), hover(page(anchor)), click(page(anchor)));
}

describe('a preview', () => {
  it('waits a moment before it shows, so a sweep across a paragraph shows nothing', () => {
    let state = run(start(), hover(page('granary')));
    expect(state.preview).toBeNull();
    expect(showTimerFor(state)).toBe(state.pending!.id);
    state = run(state, AWAY);
    expect(showTimerFor(state)).toBeNull();
    // The timer arriving late shows nothing: the pointer has gone.
    expect(keywordCardsOpen(run(state, SHOW))).toBe(false);
  });

  it('shows once the pointer has rested on the keyword', () => {
    const state = run(start(), hover(page('granary')), SHOW);
    expect(chain(state)).toEqual(['[building:granary]']);
    expect(state.preview!.source).toBe('pointer');
    expect(keywordCardsOpen(state)).toBe(true);
  });

  it('goes a moment after the pointer leaves the keyword', () => {
    let state = run(start(), hover(page('granary')), SHOW, AWAY);
    expect(keywordCardsOpen(state)).toBe(true);
    expect(graceTimerFor(state)).not.toBeNull();
    state = run(state, GRACE);
    expect(keywordCardsOpen(state)).toBe(false);
  });

  it('stays when the pointer slips off the word and straight back', () => {
    const state = run(start(), hover(page('granary')), SHOW, AWAY, hover(page('granary')));
    expect(graceTimerFor(state)).toBeNull();
    // A grace timer that fires late finds the pointer back and closes nothing.
    expect(chain(run(state, GRACE))).toEqual(['[building:granary]']);
  });

  it('moves straight to the next keyword once one is showing', () => {
    const state = run(start(), hover(page('granary')), SHOW, hover(page('library')));
    expect(chain(state)).toEqual(['[building:library]']);
    expect(state.pending).toBeNull();
  });

  it('shows at once for keyboard focus, and goes when focus moves on', () => {
    let state = run(start(), { type: 'focus', card: null, keyword: page('granary') });
    expect(chain(state)).toEqual(['[building:granary]']);
    expect(state.preview!.source).toBe('focus');
    state = run(state, { type: 'focus', card: null, keyword: null });
    expect(graceTimerFor(state)).not.toBeNull();
    expect(keywordCardsOpen(run(state, GRACE))).toBe(false);
  });

  it('never locks from focus alone: a player tabbing through a paragraph leaves nothing behind', () => {
    const state = run(start(), { type: 'focus', card: null, keyword: page('granary') });
    expect(holdTimerFor(state)).toBeNull();
    expect(run(state, HOLD)).toBe(state);
  });

  it('waits on a pointer, so the waiting card shows at once when focus arrives on it', () => {
    const state = run(start(), hover(page('granary')), { type: 'focus', card: null, keyword: page('granary') });
    expect(chain(state)).toEqual(['[building:granary]']);
    expect(state.pending).toBeNull();
  });

  it('times the show, the hold and the grace so a crossing is quicker than a lock', () => {
    expect(KEYWORD_SHOW_MS).toBeGreaterThan(0);
    expect(KEYWORD_GRACE_MS).toBeGreaterThan(0);
    // Crossing from a keyword to its card has to beat the grace, and a hold
    // has to be a deliberate wait rather than a pause.
    expect(KEYWORD_HOLD_MS).toBeGreaterThan(KEYWORD_SHOW_MS + KEYWORD_GRACE_MS);
  });
});

describe('locking', () => {
  it('locks the card when the pointer holds on the keyword', () => {
    let state = run(start(), hover(page('granary')), SHOW);
    expect(holdTimerFor(state)).toBe(state.preview!.id);
    state = run(state, HOLD);
    expect(chain(state)).toEqual(['building:granary (held)']);
  });

  it('does not lock when the pointer left before the hold ran out', () => {
    const state = run(start(), hover(page('granary')), SHOW, AWAY);
    expect(holdTimerFor(state)).toBeNull();
    expect(run(state, HOLD)).toBe(state);
  });

  it('keeps a held card while the pointer is on it or on its keyword', () => {
    let state = run(start(), hover(page('granary')), SHOW, HOLD);
    const id = state.locked[0]!.id;
    expect(graceTimerFor(state)).toBeNull();
    state = run(state, onto(id));
    expect(graceTimerFor(state)).toBeNull();
    expect(chain(run(state, GRACE))).toEqual(['building:granary (held)']);
  });

  it('lets a held card go once the pointer has left it and its keyword', () => {
    let state = run(start(), hover(page('granary')), SHOW, HOLD);
    state = run(state, onto(state.locked[0]!.id), AWAY);
    expect(graceTimerFor(state)).not.toBeNull();
    expect(keywordCardsOpen(run(state, GRACE))).toBe(false);
  });

  it('pins the card on a click, and a pinned card outlasts the pointer', () => {
    let state = pinned('granary');
    expect(chain(state)).toEqual(['building:granary']);
    state = run(state, AWAY);
    expect(graceTimerFor(state)).toBeNull();
    expect(chain(run(state, GRACE))).toEqual(['building:granary']);
  });

  it('pins on a click that comes before the card has shown', () => {
    const state = run(start(), hover(page('granary')), click(page('granary')));
    expect(chain(state)).toEqual(['building:granary']);
    expect(state.pending).toBeNull();
  });

  it('pins a held card on a click, and a second click is not a toggle', () => {
    let state = run(start(), hover(page('granary')), SHOW, HOLD, click(page('granary')));
    expect(chain(state)).toEqual(['building:granary']);
    // A player who held and then clicked meant "keep it". Clicking again keeps it.
    expect(run(state, click(page('granary')))).toBe(state);
    state = run(state, AWAY, GRACE);
    expect(chain(state)).toEqual(['building:granary']);
  });

  it('keeps the card\'s id when a preview locks, so its element is kept too', () => {
    const preview = run(start(), hover(page('granary')), SHOW);
    expect(run(preview, HOLD).locked[0]!.id).toBe(preview.preview!.id);
    expect(run(preview, click(page('granary'))).locked[0]!.id).toBe(preview.preview!.id);
  });
});

describe('nesting', () => {
  it('opens a child card from a keyword on a locked card', () => {
    const root = pinned('library');
    const id = root.locked[0]!.id;
    let state = run(root, hover(onCard(id, 'writing', 'tech:writing')), SHOW);
    expect(chain(state)).toEqual(['building:library', '[tech:writing]']);
    expect(state.preview!.parent).toBe(id);
    state = run(state, HOLD);
    expect(chain(state)).toEqual(['building:library', 'tech:writing (held)']);
    expect(state.locked[1]!.parent).toBe(id);
  });

  it('holds the chain while the pointer is anywhere along it, and only that far', () => {
    let state = run(start(), hover(page('library')), SHOW, HOLD);
    const first = state.locked[0]!.id;
    state = run(state, onto(first), hover(onCard(first, 'writing', 'tech:writing')), SHOW, HOLD);
    const second = state.locked[1]!.id;
    state = run(state, onto(second));
    expect(graceTimerFor(state)).toBeNull();
    // Back on the first card: the child it opened lets go, the first stays.
    state = run(state, onto(first));
    expect(graceTimerFor(state)).toBe(`h${second}`);
    expect(chain(run(state, GRACE))).toEqual(['building:library (held)']);
  });

  it('a pinned child keeps the held cards under it', () => {
    let state = run(start(), hover(page('library')), SHOW, HOLD);
    const first = state.locked[0]!.id;
    const writing = onCard(first, 'writing', 'tech:writing');
    state = run(state, onto(first), hover(writing), click(writing), AWAY, GRACE);
    expect(chain(state)).toEqual(['building:library (held)', 'tech:writing']);
  });

  it('replaces the child when another keyword on the same card is locked', () => {
    let state = pinned('library');
    const first = state.locked[0]!.id;
    const writing = onCard(first, 'writing', 'tech:writing');
    const scroll = onCard(first, 'scroll', 'unit:scroll');
    state = run(state, hover(writing), click(writing), hover(scroll), click(scroll));
    expect(chain(state)).toEqual(['building:library', 'unit:scroll']);
  });

  it('replaces the whole chain when a keyword on the page is locked', () => {
    let state = pinned('library');
    const first = state.locked[0]!.id;
    const writing = onCard(first, 'writing', 'tech:writing');
    state = run(state, hover(writing), click(writing), hover(page('granary')), click(page('granary')));
    expect(chain(state)).toEqual(['building:granary']);
  });

  it('never closes a pinned card by holding: the preview stays a preview until it is clicked', () => {
    let state = pinned('library');
    const first = state.locked[0]!.id;
    const writing = onCard(first, 'writing', 'tech:writing');
    const scroll = onCard(first, 'scroll', 'unit:scroll');
    state = run(state, hover(writing), click(writing), hover(scroll), SHOW);
    expect(chain(state)).toEqual(['building:library', 'tech:writing', '[unit:scroll]']);
    expect(holdTimerFor(state)).toBeNull();
    expect(run(state, HOLD)).toBe(state);
    expect(chain(run(state, click(scroll)))).toEqual(['building:library', 'unit:scroll']);
  });

  it('leaves a pinned chain alone while a keyword on the page is only previewed', () => {
    let state = run(pinned('library'), hover(page('granary')), SHOW);
    expect(chain(state)).toEqual(['building:library', '[building:granary]']);
    state = run(state, AWAY, GRACE);
    expect(chain(state)).toEqual(['building:library']);
  });

  it('does nothing for a keyword on a preview, which the pointer cannot enter', () => {
    const state = run(start(), hover(page('library')), SHOW);
    const preview = state.preview!.id;
    const inside = onCard(preview, 'writing', 'tech:writing');
    expect(run(state, hover(inside)).pending).toBeNull();
    expect(chain(run(state, click(inside)))).toEqual(chain(state));
  });

  it('does nothing for a keyword that names the card it sits on', () => {
    const state = pinned('oracle');
    const self = onCard(state.locked[0]!.id, 'oracle-again', 'building:oracle');
    expect(run(state, hover(self), SHOW).preview).toBeNull();
    expect(run(state, click(self))).toBe(state);
  });
});

describe('back, Escape and a click outside', () => {
  /** Three pinned cards, each opened from the one before. */
  function three(): State {
    let state = pinned('library');
    const writing = onCard(state.locked[0]!.id, 'writing', 'tech:writing');
    state = run(state, hover(writing), click(writing));
    const scroll = onCard(state.locked[1]!.id, 'scroll', 'unit:scroll');
    return run(state, hover(scroll), click(scroll));
  }

  it('goes back one card at a time, closing whatever was above', () => {
    let state = three();
    expect(chain(state)).toEqual(['building:library', 'tech:writing', 'unit:scroll']);
    state = run(state, { type: 'back', card: state.locked[2]!.id });
    expect(chain(state)).toEqual(['building:library', 'tech:writing']);
    state = run(three(), { type: 'back', card: three().locked[1]!.id });
    expect(chain(state)).toEqual(['building:library']);
  });

  it('closes a preview that hung off a card it went back past', () => {
    let state = three();
    const top = state.locked[2]!;
    state = run(state, hover(onCard(top.id, 'granary', 'building:granary')), SHOW);
    expect(state.preview!.parent).toBe(top.id);
    state = run(state, { type: 'back', card: top.id });
    expect(state.preview).toBeNull();
  });

  it('closes the top card on Escape, the preview first', () => {
    let state = run(three(), hover(page('granary')), SHOW);
    expect(chain(state)).toHaveLength(4);
    state = run(state, ESCAPE);
    expect(chain(state)).toEqual(['building:library', 'tech:writing', 'unit:scroll']);
    state = run(state, ESCAPE, ESCAPE);
    expect(chain(state)).toEqual(['building:library']);
    state = run(state, ESCAPE);
    expect(keywordCardsOpen(state)).toBe(false);
    // With nothing open Escape is not the cards' to take.
    expect(run(state, ESCAPE)).toBe(state);
  });

  it('closes everything on a click outside', () => {
    const state = run(three(), hover(page('granary')), SHOW, { type: 'closeAll' });
    expect(keywordCardsOpen(state)).toBe(false);
    expect(shownCards(state)).toEqual([]);
  });

  it('drops a card that cannot be drawn, and everything above it', () => {
    const before = three();
    const state = run(before, { type: 'drop', card: before.locked[1]!.id });
    expect(chain(state)).toEqual(['building:library']);
  });
});

describe('a keyword inside a control', () => {
  // The ruling of 2026-08-28 (`keywords.ts`): inside a button a keyword is bold
  // and never a link, because a click there picks the card it is on.
  it('is never activated, so a click on it never locks a card', () => {
    const word = page('library', false);
    const shown = run(start(), hover(word), SHOW);
    expect(run(shown, click(word))).toBe(shown);
    expect(run(start(), click(word))).toEqual(start());
  });

  it('still shows its card on hover, and holding locks it', () => {
    let state = run(start(), hover(page('library', false)), SHOW);
    expect(chain(state)).toEqual(['[building:library]']);
    expect(state.preview!.linked).toBe(false);
    state = run(state, HOLD);
    expect(chain(state)).toEqual(['building:library (held)']);
  });

  it('opens a card whose own keywords are links, since the card is not inside the control', () => {
    let state = run(start(), hover(page('library', false)), SHOW, HOLD);
    const writing = onCard(state.locked[0]!.id, 'writing', 'tech:writing');
    state = run(state, onto(state.locked[0]!.id), hover(writing), click(writing));
    expect(chain(state)).toEqual(['building:library (held)', 'tech:writing']);
  });
});

describe('the stack is pure', () => {
  /** Freezes a state all the way down, so a step that wrote into it throws. */
  function frozen(state: State): State {
    const freeze = (value: unknown): void => {
      if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return;
      Object.freeze(value);
      for (const inner of Object.values(value as Record<string, unknown>)) freeze(inner);
    };
    freeze(state);
    return state;
  }

  it('never writes into the state it is given', () => {
    const events: Event[] = [
      hover(page('library')),
      SHOW,
      HOLD,
      onto(1),
      hover(onCard(1, 'writing', 'tech:writing')),
      SHOW,
      click(onCard(1, 'writing', 'tech:writing')),
      AWAY,
      GRACE,
      { type: 'back', card: 2 },
      ESCAPE,
      { type: 'closeAll' },
    ];
    let state = frozen(start());
    for (const event of events) state = frozen(keywordCardStep(state, event));
    expect(keywordCardsOpen(state)).toBe(false);
  });

  it('hands back the same state when nothing changed', () => {
    const state = pinned('library');
    expect(run(state, SHOW)).toBe(state);
    expect(run(state, HOLD)).toBe(state);
    expect(run(state, { type: 'back', card: 999 })).toBe(state);
    expect(run(state, { type: 'drop', card: 999 })).toBe(state);
    expect(run(start(), { type: 'closeAll' })).toEqual(start());
  });
});

// --- placement ------------------------------------------------------------------

const VIEW = { width: 1280, height: 800 };
const CARD = { width: 288, height: 220 };
const GAP = 8;

function box(left: number, top: number, width = 60, height = 16) {
  return { left, top, right: left + width, bottom: top + height };
}

/** Do two rectangles share any area? */
function overlaps(a: ReturnType<typeof box>, b: ReturnType<typeof box>): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

describe('placeKeywordCard', () => {
  it('puts a page keyword\'s card under it, left edges lined up', () => {
    const anchor = box(300, 200);
    const spot = placeKeywordCard(anchor, CARD, VIEW, GAP);
    expect(spot).toEqual({ side: 'below', left: 300, top: anchor.bottom + GAP, maxHeight: null });
  });

  it('puts it above when there is no room below', () => {
    const anchor = box(300, 700);
    const spot = placeKeywordCard(anchor, CARD, VIEW, GAP);
    expect(spot.side).toBe('above');
    expect(spot.top + CARD.height).toBe(anchor.top - GAP);
  });

  it('keeps the card inside the window\'s left and right edges', () => {
    const spot = placeKeywordCard(box(1250, 200, 25), CARD, VIEW, GAP);
    expect(spot.left + CARD.width).toBeLessThanOrEqual(VIEW.width - GAP);
    expect(placeKeywordCard(box(-20, 200), CARD, VIEW, GAP).left).toBe(GAP);
  });

  it('goes beside the keyword when the card is too tall for above or below', () => {
    const tall = { width: 288, height: 500 };
    const spot = placeKeywordCard(box(300, 380), tall, VIEW, GAP);
    expect(spot.side).toBe('right');
    expect(spot.left).toBe(300 + 60 + GAP);
  });

  it('puts a child card beside its parent card, not over it', () => {
    const parent = box(300, 200, 288, 260);
    const keyword = box(330, 300);
    const spot = placeKeywordCard(keyword, CARD, VIEW, GAP, parent);
    expect(spot.side).toBe('right');
    expect(spot.left).toBe(parent.right + GAP);
    expect(spot.top).toBe(keyword.top);
  });

  it('puts a child card on the parent\'s left when the right is full', () => {
    const parent = box(900, 200, 288, 260);
    const spot = placeKeywordCard(box(930, 300), CARD, VIEW, GAP, parent);
    expect(spot.side).toBe('left');
    expect(spot.left + CARD.width).toBe(parent.left - GAP);
  });

  it('cuts a card that fits nowhere to the taller band, rather than cover the keyword', () => {
    const small = { width: 320, height: 300 };
    const huge = { width: 300, height: 900 };
    const anchor = box(20, 100, 60, 16);
    const spot = placeKeywordCard(anchor, huge, small, GAP);
    expect(spot.side).toBe('below');
    expect(spot.maxHeight).toBe(small.height - anchor.bottom - 2 * GAP);
    const high = box(20, 250, 60, 16);
    const up = placeKeywordCard(high, huge, small, GAP);
    expect(up.side).toBe('above');
    expect(up.top).toBe(GAP);
    expect(up.top + up.maxHeight!).toBe(high.top - GAP);
  });

  it('never covers the keyword and never leaves the window, wherever the keyword is', () => {
    const views = [VIEW, { width: 800, height: 500 }, { width: 420, height: 360 }];
    const cards = [CARD, { width: 288, height: 120 }, { width: 288, height: 420 }];
    const wrong: string[] = [];
    let asked = 0;
    for (const view of views) {
      for (const card of cards) {
        for (let left = 0; left <= view.width - 60; left += 37) {
          for (let top = 0; top <= view.height - 16; top += 29) {
            const anchor = box(left, top);
            for (const beside of [null, box(Math.max(0, left - 40), Math.max(0, top - 30), 288, 200)]) {
              asked += 1;
              const spot = placeKeywordCard(anchor, card, view, GAP, beside);
              const height = spot.maxHeight === null ? card.height : Math.min(card.height, spot.maxHeight);
              const placed = { left: spot.left, top: spot.top, right: spot.left + card.width, bottom: spot.top + height };
              const inside =
                placed.left >= GAP &&
                placed.top >= GAP &&
                placed.right <= view.width - GAP &&
                placed.bottom <= view.height - GAP;
              if (overlaps(placed, anchor) || !inside) {
                wrong.push(`${view.width}x${view.height}, card ${card.height} tall, keyword at ${left},${top}`);
              }
            }
          }
        }
      }
    }
    expect(asked).toBeGreaterThan(5000);
    expect(wrong).toEqual([]);
  });
});
