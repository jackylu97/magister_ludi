/**
 * The offer card: pick one of N, on parchment.
 *
 * Built for the discoveries (playable.md item 3) and deliberately shaped for the
 * thing after it. Entry XV's Statecraft draft is the same gesture at a different
 * scale — three new cards and an upgrade, chosen once every few turns — and the
 * shape of that gesture is *an offer of N options, each with a name, a line of
 * flavour and a stated payoff, exactly one of which is taken*. So this component
 * knows about options and nothing about ruins: no discovery id, no yield, no
 * city, no simulation type at all crosses its boundary. The caller renders its
 * own payoff line and hands over strings.
 *
 * Generic-ish, and no further
 * ---------------------------
 * It is emphatically not a framework. There is no reroll, no multi-select, no
 * disabled state, no upgrade slot — Statecraft will want at least the first and
 * the last, and they can be added when there is a real second caller with real
 * requirements. What is shared today is the part that would otherwise be
 * rewritten badly: the modal's bones, the keyboard contract, focus handling, and
 * the ink/parchment language of the card itself.
 *
 * Modal, and it means it
 * ----------------------
 * This is the one screen in the interface that is genuinely blocking, and that is
 * a design decision rather than an oversight. Everything else here — the turn
 * splash, the notices, the panels — can be ignored or dismissed, because the
 * player can always come back to it. An offer cannot be come back to by any other
 * route: the boon sits on the empire until it is spent, and Esc would mean
 * "throw it away", which is not a thing the player asked for. So there is no
 * dismiss and no close button; the only way out is to choose, and the End Turn
 * blocker is what stops the player wandering off before they do.
 *
 * Data is data
 * ------------
 * Every string arrives as a text node, never as markup: a city's name, a unit's
 * name and a line of flavour are all data, and data never gets to be HTML. That
 * is `turnSplash.ts`'s rule and it is the same rule here for the same reason.
 */

/** One thing a player may take. Strings only — see the module docblock. */
export interface OfferOption {
  /** The name on the card. "Star tablets". */
  title: string;
  /**
   * The payoff, stated as the exact number the empire will receive: "+20⚙ to
   * Uruk", "+15🔬", "A free Scout". The caller composes it, because glyphs are
   * the interface's table (`figures.ts`) and the amounts are the simulation's.
   */
  payoff: string;
  /** One line of flavour, set in the name face. */
  flavor: string;
  /**
   * What this would finish on the spot — "completes Granary", "grows to 4",
   * "completes Mining" — or absent. The whole point of a windfall settling
   * instantly is worth saying *before* the choice, not after it.
   */
  note?: string;
  /**
   * Why this payoff would be wasted, or absent. An empire with no cities has
   * nowhere to put a lump of food, and a card that quietly paid it nowhere
   * would be the interface keeping a secret.
   */
  warning?: string;
}

/** What the card is asking about. */
export interface Offer {
  /** The small caps line above the title. "an ancient ruin". */
  eyebrow: string;
  /** The heading. "The stones remember". */
  title: string;
  options: OfferOption[];
}

export interface OfferCard {
  /**
   * Shows an offer and calls `onChoose` with the index taken. Replaces whatever
   * was showing, which cannot happen today — a player may hold only one offer at
   * a time (`discoveryClaimError`) — and is the right behaviour if it ever can.
   */
  show(offer: Offer, onChoose: (index: number) => void): void;
  /** True while a card is up. `main.ts` asks, to keep hotkeys off the board. */
  readonly isOpen: boolean;
  /** Takes the card down without choosing. For a new game, not for a player. */
  clear(): void;
  dispose(): void;
}

function element(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createOfferCard(container: HTMLElement): OfferCard {
  let choose: ((index: number) => void) | null = null;
  /** The element focus should return to once the card is answered. */
  let restoreFocus: HTMLElement | null = null;

  function clear(): void {
    container.hidden = true;
    container.replaceChildren();
    choose = null;
    if (restoreFocus && document.contains(restoreFocus)) restoreFocus.focus();
    restoreFocus = null;
  }

  function take(index: number): void {
    const callback = choose;
    // Cleared *before* the callback, so a handler that re-opens a card (a second
    // ruin claimed by the same march) is not immediately torn down by this one.
    clear();
    callback?.(index);
  }

  /**
   * Enter and Space are the buttons' own; the number keys are the shortcut a
   * player learns on the second offer. Esc is deliberately not bound — see the
   * module docblock: there is nothing to escape to.
   */
  function onKeyDown(event: KeyboardEvent): void {
    if (container.hidden) return;
    const digit = Number.parseInt(event.key, 10);
    if (Number.isInteger(digit) && digit >= 1) {
      const buttons = container.querySelectorAll<HTMLButtonElement>('.offer-option');
      const button = buttons[digit - 1];
      if (button) {
        event.preventDefault();
        event.stopPropagation();
        button.click();
      }
      return;
    }
    // Tab is left alone so the options cycle normally; everything else is
    // swallowed so a stray hotkey cannot drive the board behind a modal.
    if (event.key !== 'Tab') event.stopPropagation();
  }

  function show(offer: Offer, onChoose: (index: number) => void): void {
    restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    choose = onChoose;
    container.replaceChildren();

    const sheet = element('div', 'offer-sheet');
    const head = element('header', 'offer-head');
    head.append(
      element('p', 'eyebrow offer-eyebrow', offer.eyebrow),
      element('h2', 'offer-title', offer.title),
    );
    sheet.append(head);

    const list = element('div', 'offer-options');
    offer.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.className = 'offer-option';
      button.type = 'button';
      // The ordinal is the keyboard shortcut made visible, and it is a real part
      // of the card rather than a hint: a player who has seen three offers picks
      // by number without reading.
      button.append(element('span', 'offer-ordinal', String(index + 1)));
      button.append(element('span', 'offer-option-title', option.title));
      button.append(element('span', 'offer-payoff', option.payoff));
      if (option.note !== undefined) {
        button.append(element('span', 'offer-note', option.note));
      }
      if (option.warning !== undefined) {
        button.append(element('span', 'offer-warning', option.warning));
      }
      button.append(element('span', 'offer-flavor', option.flavor));
      button.addEventListener('click', () => take(index));
      list.append(button);
    });
    sheet.append(list);
    container.append(sheet);
    container.hidden = false;

    // The first option takes focus, so the card is answerable from the keyboard
    // the instant it appears and a screen reader is put inside it rather than
    // left on whatever the player last clicked.
    list.querySelector<HTMLButtonElement>('.offer-option')?.focus();
  }

  // Capturing, so the card sees a key before the board's own handlers do. That
  // is what makes it modal in practice: `controls.ts` binds on the window too.
  window.addEventListener('keydown', onKeyDown, true);

  return {
    show,
    get isOpen(): boolean {
      return !container.hidden;
    },
    clear,
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown, true);
      clear();
    },
  };
}
