/**
 * **The reward sheet** — the second sheet the decks rework adds (D1a,
 * `docs/plans/decks-rework.md`: *"a reward hand opens as a second sheet with
 * the same controls"*), for the rare-only hands banked at regular draft counts
 * 4, 18 and 29 (`docs/six-decks-first-cut.md` "Doctrine reward hands").
 *
 * It builds on `modalShell.ts` (CLAUDE.md: a full-screen sheet builds on the
 * shell — `hidden` is the whole of its state, ×/Escape/a press on the ground
 * arrive at one `close`, `dispose` unbinds and the caller registers it in
 * `gameDisposers`) and wears `.statecraft-overlay` for the one cap rule. Its
 * frame is made here rather than in `index.html`, because a sheet that is one
 * banner's door and nothing else does not earn a slot in the page's markup;
 * the classes are the statecraft sheet's own, so the styling is D1c's to
 * finish and nothing here is styled twice.
 *
 * Three states, all read off the seat's own record and never kept here:
 *
 *   · **banked** — `PlayerStatecraft.rewardHands` holds counts and nothing is
 *     on the table: one *Open* button per banked count, the oldest first,
 *     which sends `openRewardHand` and redraws;
 *   · **on the table** — `pendingReward` holds a hand: one face per rare
 *     (the deck badge and the charter mark under the name, the clauses under
 *     that), a press sends `chooseReward`, and *Pass* sends `passReward`;
 *   · **nothing** — a sentence saying so.
 *
 * The **same pick/pass** as the draft: every press is a command through the
 * one dispatcher, the result is checked, and a refusal is said in the
 * reducer's own words on the manicule line. Nothing here mutates state and
 * nothing here decides what a hand holds.
 */

import type { Command } from '../sim/commands';
import { type GameState, playerById } from '../sim/state';
import { type PlayerStatecraft, describeCard } from '../sim/statecraft';
import { orderDef } from '../sim/statecraftData';
import { element } from './dom';
import { setDescriptorText } from './keywords';
import { createModalShell } from './modalShell';
import { orderBadges, orderPayoff } from './deckBadges';

export interface RewardSheet {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  /** The state changed. Redraws if the sheet is up; cheap enough to call always. */
  refresh(): void;
  dispose(): void;
}

export interface RewardSheetOptions {
  /** The live game and the seat being looked at. Read on every draw. */
  getState: () => GameState;
  getPlayerId: () => number;
  /**
   * Sends one command through the game's dispatcher and answers the refusal,
   * or `null` when it was taken. The sheet never touches the state itself.
   */
  send: (command: Command) => string | null;
  /** Said in the manicule line — a refusal, in the reducer's own words. */
  onRefuse?: (message: string) => void;
  /** Called when this sheet opens, so the others can close. */
  onOpen?: () => void;
  /** The bar control that opens it, for the `aria-expanded` mirror and the focus return. */
  trigger?: HTMLElement | null;
}

/** The sheet's title, said once so the test and the page agree. */
export const REWARD_SHEET_TITLE = 'A reward hand';

/** What the sheet says when the seat has nothing banked and nothing dealt. */
export const REWARD_NOTHING = 'No reward hand is banked. One is dealt at the fourth, eighteenth and twenty-ninth draft.';

/** What the sheet says when an open found no rare left to deal. */
export const REWARD_EXHAUSTED = 'The reward came to nothing: every rare your decks can deal, you already hold. It cost you nothing.';

/**
 * **The mark over the hand**: this is the rare-only one.
 *
 * Said in full words rather than as "rares only" at the end of a mono line,
 * because a player meeting their first reward hand has no way to tell it from
 * the draft that opened ten turns ago — the cards are the same cards, dealt on
 * a sheet with the same bones. The distinction is worth a line of its own.
 */
export const REWARD_ONLY_RARES = 'the rare-only hand';

/** The sentence under it: what makes this hand unlike the ordinary draft. */
export const REWARD_HAND_NOTE =
  'Every card here is one your decks hold back. It was not bought with culture and it spends none: take one, or pass, and the ordinary draft is untouched either way.';

export function createRewardSheet(options: RewardSheetOptions): RewardSheet {
  // The frame, built once: the statecraft sheet's own classes, so the cap rule
  // and the styling read this as the ninth sheet on the shell and not as a
  // new kind of surface.
  const overlay = element('div', 'statecraft-overlay reward-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', REWARD_SHEET_TITLE);
  overlay.hidden = true;
  const sheet = element('div', 'statecraft-sheet');
  const head = element('header', 'statecraft-head');
  const titles = element('div', 'statecraft-head-titles');
  titles.append(element('p', 'eyebrow statecraft-eyebrow', 'the magister’s statecraft'));
  titles.append(element('h2', 'statecraft-title', REWARD_SHEET_TITLE));
  head.append(titles);
  head.append(element('p', 'statecraft-hint', 'take one rare, or pass — Esc to close'));
  const closeButton = element('button', 'statecraft-close', '×');
  (closeButton as HTMLButtonElement).type = 'button';
  closeButton.setAttribute('aria-label', 'Close');
  head.append(closeButton);
  sheet.append(head);
  const body = element('div', 'statecraft-body reward-body');
  sheet.append(body);
  overlay.append(sheet);
  document.body.append(overlay);

  /** The last open's word, if it came to nothing; cleared by the next draw that finds a hand. */
  let exhausted = false;

  /** One press, one command, one checked result. */
  function press(command: Command): void {
    const refusal = options.send(command);
    if (refusal !== null) options.onRefuse?.(`☞ ${refusal}`);
    shell.refresh();
  }

  function drawBanked(sc: PlayerStatecraft, seat: number): HTMLElement {
    const block = element('section', 'sc-banner reward-banked');
    // **The count is a figure beside the sentence, never inside it** — the
    // statecraft screen's own banner says it this way, and the standing rule is
    // that a number never appears in written prose. One hand is the ordinary
    // case and wants no figure at all.
    block.append(
      element(
        'p',
        'sc-banner-title',
        sc.rewardHands.length === 1
          ? 'A reward hand is banked.'
          : `Reward hands are banked (${sc.rewardHands.length}).`,
      ),
    );
    block.append(
      element(
        'p',
        'sc-banner-body reward-lede',
        'Each deals three rares your decks can still deal — one from each of your decks, then one more. Opening one costs nothing; so does passing it.',
      ),
    );
    for (const drafts of sc.rewardHands) {
      const button = element('button', 'btn btn-primary sc-banner-button', `Open the hand from draft ${drafts}`);
      (button as HTMLButtonElement).type = 'button';
      // Only the oldest opens — the reducer opens them in banking order — so
      // the later buttons say what they are waiting on.
      if (drafts !== sc.rewardHands[0]) {
        (button as HTMLButtonElement).disabled = true;
        button.title = 'Open the earlier hand first';
      }
      button.addEventListener('click', () => {
        exhausted = false;
        const before = sc.rewardHands.length;
        press({ type: 'openRewardHand', playerId: seat });
        const after = playerById(options.getState(), seat)?.statecraft;
        if (after !== undefined && after.rewardHands.length < before && after.pendingReward === undefined) {
          exhausted = true;
          shell.refresh();
        }
      });
      block.append(button);
    }
    return block;
  }

  function drawHand(sc: PlayerStatecraft, seat: number): HTMLElement {
    const offer = sc.pendingReward!;
    const block = element('section', 'sc-collection reward-hand');
    // **What kind of hand this is, said before the cards** (D1c). A reward hand
    // and an ordinary draft deal the same faces out of the same decks, and the
    // one difference between them — this one is rare-only, costs nothing and
    // blocks nothing — is invisible on a card. So it is a banner rather than an
    // eyebrow: the sentence a player needs in order to know that passing here
    // forfeits nothing they were owed.
    block.append(element('p', 'eyebrow sc-eyebrow reward-mark', REWARD_ONLY_RARES));
    block.append(element('p', 'sc-banner-body reward-lede', REWARD_HAND_NOTE));
    const grid = element('div', 'sc-card-grid reward-grid');
    offer.options.forEach((id, index) => {
      const def = orderDef(id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sc-card sc-card-order reward-card';
      button.dataset.index = String(index);
      const headRow = element('div', 'sc-card-head');
      headRow.append(element('span', 'sc-card-type', orderPayoff(id)));
      button.append(headRow);
      button.append(element('h4', 'sc-card-name', def.name));
      // The deck badges and the charter mark, inked by their tone — the same
      // chips the draft sheet deals, out of the same table, so a rare read on
      // this sheet and the same rare read on the ordinary one are one face.
      const badges = orderBadges(id);
      if (badges.length > 0) {
        const chips = element('p', 'offer-badges');
        for (const badge of badges) {
          const chip = element('span', 'offer-badge', badge.label);
          if (badge.tone !== undefined) chip.dataset.tone = badge.tone;
          chips.append(chip);
        }
        button.append(chips);
      }
      const list = element('ul', 'sc-card-clauses');
      for (const clause of describeCard(id)) {
        const item = element('li', clause.deferred ? 'sc-clause is-deferred' : 'sc-clause');
        setDescriptorText(item, clause.text);
        list.append(item);
      }
      button.append(list);
      // **Labelled, not merely italic** — the standing rule wherever a flavour
      // field is printed. Without it the line at the foot of a card reads as
      // one more rule, which is the one thing a card's foot may never do.
      if (def.flavor.length > 0) {
        const flavor = element('p', 'sc-card-flavor');
        flavor.append(element('span', 'flavor-label', 'Flavour'));
        flavor.append(document.createTextNode(def.flavor));
        button.append(flavor);
      }
      // A rare the seat took in a normal draft while this hand lay open: the
      // reducer refuses it, and the face says so before the press.
      if (sc.orders.includes(id)) {
        button.disabled = true;
        button.title = 'Already in your collection';
      }
      button.addEventListener('click', () => press({ type: 'chooseReward', playerId: seat, optionIndex: index }));
      grid.append(button);
    });
    block.append(grid);
    const pass = element('button', 'btn sc-banner-button reward-pass', 'Pass — take none');
    (pass as HTMLButtonElement).type = 'button';
    pass.addEventListener('click', () => press({ type: 'passReward', playerId: seat }));
    block.append(pass);
    return block;
  }

  function draw(): void {
    body.replaceChildren();
    const state = options.getState();
    const seat = options.getPlayerId();
    const player = playerById(state, seat);
    if (!player) return;
    const sc = player.statecraft;
    if (sc.pendingReward !== undefined) {
      exhausted = false;
      body.append(drawHand(sc, seat));
      return;
    }
    if (exhausted) body.append(element('p', 'sc-note reward-exhausted', REWARD_EXHAUSTED));
    if (sc.rewardHands.length > 0) body.append(drawBanked(sc, seat));
    else if (!exhausted) body.append(element('p', 'sc-note reward-nothing', REWARD_NOTHING));
  }

  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    trigger: options.trigger ?? null,
    onOpen: () => options.onOpen?.(),
    draw,
    onDispose: () => {
      overlay.remove();
    },
  });

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open: shell.open,
    close: shell.close,
    toggle: shell.toggle,
    refresh: shell.refresh,
    dispose: shell.dispose,
  };
}
