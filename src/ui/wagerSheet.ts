/**
 * **The deal sheet** — the three bars the age has just set, and the one this
 * seat is going to stake (`docs/wager.md` §2; the mock of 2026-09-09 is the spec
 * of record).
 *
 * The eleventh sheet on `modalShell.ts`, and it keeps the whole of that
 * contract: `hidden` is its only state, ×/Escape/a press on the ground all reach
 * one `close`, the keyboard goes back where it came from and `dispose` unbinds
 * and is registered in `gameDisposers`.
 *
 * What is on it, and what is deliberately not
 * -------------------------------------------
 * Three cards. Each carries its **thread** and its **family** as an eyebrow,
 * what it reads in a first-time player's words, the **bar** as one large figure,
 * and a Stake button. That is the mock, and the two absences on it are marked
 * rulings:
 *
 *   · **no standing figure on this sheet.** Every seat is at nought on the deal turn by
 *     construction — a flow's window opens here and a standing is read fresh —
 *     so a figure would be a row of zeroes pretending to be information.
 *   · **no age-mechanics line in the masthead.** The clock's arithmetic is not
 *     shown to the player; the countdown lives on the top bar's age card and
 *     nowhere else.
 *
 * The pure half
 * -------------
 * Everything that can be quietly wrong — which cards are on the table, what a
 * card's bar is at this age, what the reading is called, whether a seat has
 * already staked — is a pure function above the DOM, so the jsdom-less suite can
 * pin it. Drawing is a page of `append` calls that fail loudly or not at all.
 * That is `ledgerScreen.ts`' discipline and `beadsScreen.ts`' before it.
 */

import type { GameState } from '../sim/state';
import { type BeadFamily } from '../sim/beadData';
import {
  type WagerDeal,
} from '../sim/state';
import {
  type WagerId,
  type WagerLine,
  wagerBar,
  wagerDef,
} from '../sim/wagerData';
import {
  type WagerStandingRow,
  dealtWagers,
  openWagerDeal,
  wagerStakeOf,
  wagerStandings,
} from '../sim/wagers';
import { playerById } from '../sim/state';
import { BEAD_FAMILY_MARK } from './beadsScreen';
import { element } from './dom';
import { eraWord, figure } from './figures';
import { createModalShell } from './modalShell';

/**
 * What each thread is called on a card.
 *
 * The Orders' own theme names (`docs/orders-and-doctrines.md` §Themes), plus the
 * Banner — the one line the wager deck names and `CardLine` has not adopted
 * (see `WagerLine`). Written out here rather than read off `CARD_LINE_NAME`
 * because that table is keyed on the union this one deliberately widens.
 */
export const WAGER_LINE_NAME: Record<WagerLine, string> = {
  hunt: 'The Wild Hunt',
  caravan: 'The Long Caravan',
  green: 'The Green Belt',
  forge: 'The Forge Levy',
  star: 'The Star Chart',
  procession: 'The Procession',
  wayfarers: 'The Wayfarers',
  court: 'The Marble Court',
  cloister: 'The Cloister',
  charter: 'The Charter',
  ploughshare: 'The Ploughshare',
  highlands: 'The Highlands',
  tide: 'The Tide',
  banner: 'The Banner',
  none: 'No thread',
};

/** One card as the sheet prints it. Numbers and words, no simulation types. */
export interface WagerFace {
  id: WagerId;
  name: string;
  /** "The Marble Court · culture" — the eyebrow. */
  eyebrow: string;
  family: BeadFamily;
  /** What it asks, in the row's own plain words. */
  note: string;
  /** The bar, as the big figure. */
  bar: number;
  /** "3 of 3 at once" for a compound card, else null. */
  clauses: string | null;
  /** Whether this seat has staked this card. */
  staked: boolean;
}

/**
 * The three cards of one deal, as faces — **the sheet's whole reading**.
 *
 * A card whose row has gone deferred or been cut since the deal was written is
 * skipped rather than thrown over: a save is a save, and half a table is a
 * better answer than a blank screen.
 */
export function wagerFaces(state: GameState, playerId: number, deal: WagerDeal): WagerFace[] {
  const player = playerById(state, playerId);
  const staked = player ? wagerStakeOf(player, deal.age) : null;
  const faces: WagerFace[] = [];
  dealtWagers(deal).forEach((id) => {
    const index = deal.dealt.indexOf(id);
    const def = wagerDef(id);
    const mark = BEAD_FAMILY_MARK[def.family];
    faces.push({
      id,
      name: def.name,
      eyebrow: `${WAGER_LINE_NAME[def.line]} · ${mark.word.toLowerCase()}`,
      family: def.family,
      note: def.note,
      bar: wagerBar(id, deal.age),
      clauses:
        def.reads.shape === 'clauses'
          ? `all ${figure(def.reads.clauses.length)} at once`
          : null,
      staked: staked === index,
    });
  });
  return faces;
}

/** The masthead line. The age and nothing about how the age works (§11). */
export function wagerDealHeadline(deal: WagerDeal): string {
  return `${eraWord(deal.age)} sets its bars`;
}

/**
 * The lead under it, in the deck's own terms and a first-time player's words.
 *
 * Numbers never appear in written prose (hard rule 7) — the figures are beside
 * their labels on the cards, which is where a figure belongs.
 */
export const WAGER_DEAL_LEAD =
  'Three bars, the same three for every empire in the world. Stake one: keep it and it pays ' +
  'double, clear either of the others and it pays once, miss the one you staked and the age ' +
  'leaves a mark on your government. Nobody is told which one you chose.';

/**
 * How far along a track one seat's figure is, as a fraction of the bar.
 *
 * Clamped to the track and floored at nothing: a wager on a signed reading (the
 * exchange of a war, a treasury in the red) can stand below nought, and a bar
 * drawn backwards is not a reading.
 */
export function wagerTrackFraction(at: number, bar: number): number {
  if (!(bar > 0)) return 0;
  return Math.max(0, Math.min(1, at / bar));
}

/**
 * A figure on a standings row — whole where the bar is whole, a tenth where it
 * is not.
 *
 * The one wager reading that is not a whole number is a ratio (learning for each
 * citizen), and `figure` would print its bar as `2` and every seat's standing as
 * `2` beside it. So the precision follows the bar rather than the value, which
 * is the honest reading of "how close am I".
 */
export function wagerFigure(value: number, bar: number): string {
  if (Number.isInteger(bar)) return figure(Math.floor(value));
  const shown = Math.round(value * 10) / 10;
  return shown.toFixed(1);
}

/** One card's whole standings block — the three columns the Abacus draws. */
export interface WagerBoard {
  index: number;
  face: WagerFace;
  rows: WagerStandingRow[];
}

/**
 * **Every dealt card with every seat's standing against it, ranked** — what the
 * Abacus prints mid-age.
 *
 * The stake is marked on the *local* seat's own card and on nothing else, which
 * is the whole of the secrecy rule and the reason it lives on the face rather
 * than on a row: a rival's stake is not in the reading at all, so a screen
 * cannot leak it by accident.
 */
export function wagerBoards(state: GameState, playerId: number): WagerBoard[] {
  const deal = openWagerDeal(state);
  if (!deal) return [];
  const faces = wagerFaces(state, playerId, deal);
  const boards: WagerBoard[] = [];
  faces.forEach((face) => {
    const index = deal.dealt.indexOf(face.id);
    boards.push({ index, face, rows: wagerStandings(state, deal, index) });
  });
  return boards;
}

// --- the sheet --------------------------------------------------------------

export interface WagerSheet {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  refresh(): void;
  dispose(): void;
}

export interface WagerSheetOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  getState: () => GameState;
  getPlayerId: () => number;
  /** Sends `chooseWager`. Returns true when the reducer took it. */
  stake: (index: number) => boolean;
  onOpen?: () => void;
}

/**
 * The deal sheet, on the shell.
 *
 * It is raised by the End Turn blocker for the local seat and by nothing else:
 * the deal is answered in one window (§2), so there is no bar control and no
 * hotkey — a sheet a player could summon at will would be a sheet they could
 * summon after the window had closed.
 */
export function createWagerSheet(options: WagerSheetOptions): WagerSheet {
  const { overlay, body, closeButton, getState, getPlayerId } = options;

  function render(): void {
    const state = getState();
    const seat = getPlayerId();
    body.replaceChildren();
    const deal = openWagerDeal(state);
    if (!deal) {
      body.append(element('p', 'wager-empty', 'No wager is on the table.'));
      return;
    }

    const head = element('section', 'wager-lead');
    head.append(element('p', 'eyebrow', 'the age sets its bars'));
    head.append(element('h3', 'wager-headline', wagerDealHeadline(deal)));
    head.append(element('p', 'wager-lead-text', WAGER_DEAL_LEAD));
    body.append(head);

    const grid = element('div', 'wager-grid');
    wagerFaces(state, seat, deal).forEach((face, at) => {
      grid.append(drawFace(face, at));
    });
    body.append(grid);
  }

  function drawFace(face: WagerFace, at: number): HTMLElement {
    const card = element('article', 'wager-card');
    const mark = BEAD_FAMILY_MARK[face.family];
    card.style.setProperty('--wager-ink', `var(${mark.ink})`);
    if (face.staked) card.classList.add('is-staked');
    card.append(element('p', 'eyebrow wager-eyebrow', face.eyebrow));
    card.append(element('h4', 'wager-name', face.name));
    card.append(element('p', 'wager-note', face.note));

    const bar = element('p', 'wager-bar');
    bar.append(element('span', 'wager-bar-figure', figure(face.bar)));
    bar.append(element('span', 'wager-bar-label', face.clauses ?? 'the bar'));
    card.append(bar);

    const button = element('button', 'wager-stake') as HTMLButtonElement;
    button.type = 'button';
    button.textContent = face.staked ? 'Staked' : 'Stake this';
    button.disabled = face.staked;
    button.addEventListener('click', () => {
      if (!options.stake(at)) return;
      render();
      shell.close();
    });
    card.append(button);
    return card;
  }

  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    onOpen: () => options.onOpen?.(),
    draw: render,
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
