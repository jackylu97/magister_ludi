/**
 * The Diplomacy screen: every empire in the world, where you stand with each,
 * and the two things you may do about it.
 *
 * The sixth full-screen overlay and the fourth parchment one, and it is
 * deliberately the Trade sheet's sibling rather than a new language: same bones
 * (`.sc-*`), same keyboard contract (`hidden` is the whole of the screen state,
 * Escape closes it, the × and a click on the ground do the same, opening it
 * closes whatever else was up), same rule that every write is a **command**.
 *
 * The user's ruling of 2026-09-03 put it here rather than in a seat-strip
 * popover: *"lets have it be a new menu, it can sit alongside the statecraft/
 * religion icons"* — so the third door on the HUD dock opens this.
 *
 * One row per empire, and the row is the relation
 * -----------------------------------------------
 * A seat's row says exactly one of three things — at peace, at war since a
 * named turn, or bound by a truce with a countdown — and carries the verb that
 * is legal from where you stand. There is no relation *meter* and no opinion:
 * v1 has none (`docs/war-diplomacy.md`, section 6), and a screen that implied
 * one would be promising a system nobody has built.
 *
 * Nothing here is a new rule
 * --------------------------
 * Every sentence comes out of the simulation. `declareWarError` greys the
 * Declare button and is the same string the reducer refuses with;
 * `truceTurnsLeft` gives the countdown; `warBetween` gives the turn a war
 * opened and who has offered peace. A greyed button is therefore a command the
 * reducer would refuse, and an offered one is a command it takes — the bargain
 * every screen in this interface keeps.
 *
 * Declaring carries a confirm
 * ---------------------------
 * The one irreversible thing on the sheet (a truce means you cannot take it
 * back for ten turns), and the ruling asks for the step by name. It goes
 * through `confirmCard.ts` — this interface's own card, never `window.confirm`
 * — handed in as `askConfirm` so this module needs no opinion about where the
 * card lives.
 *
 * The pure half of this file is everything above `createDiplomacyScreen`, for
 * `figures.ts`' reason: this suite has no jsdom, and the half of a panel that
 * can be *quietly wrong* — which relation a row claims, which verb it offers,
 * what the sentence says — has to be a function somebody can call.
 */

import type { GameState } from '../sim/state';
import { playerById } from '../sim/state';
import {
  declareWarError,
  diplomaticSeats,
  proposePeaceError,
  withdrawPeaceError,
} from '../sim/diplomacy';
import { hasPeaceOffer, truceTurnsLeft, warBetween } from '../sim/wars';
import { figure } from './figures';
import type { ConfirmRequest } from './confirmCard';

// --- the row model ----------------------------------------------------------

/** Where two empires stand. Exactly one of three, and they are exclusive. */
export type RelationKind = 'peace' | 'war' | 'truce';

/**
 * One empire's row, as the sheet reads it.
 *
 * Everything a row draws is here and nothing is recomputed in the DOM half —
 * the split this file's docblock states. `declareError` and `peaceError` are
 * the reducer's own sentences, `null` when the verb is legal, which is what
 * makes "greyed with a reason" and "offered" one decision rather than two.
 */
export interface DiplomacyRow {
  playerId: number;
  name: string;
  /** The seat's ink, for the swatch. Never interpreted — see `heraldryFor`. */
  color: string;
  relation: RelationKind;
  /** "At peace" · "At war since turn 41" · "Truce — 7 turns". */
  status: string;
  /** Turn the war opened, for a war row; `null` otherwise. */
  since: number | null;
  /** Turns of truce left, for a truce row; zero otherwise. */
  truceLeft: number;
  /** This seat has a standing white-peace offer out to them. */
  weOffered: boolean;
  /** They have one standing to us — the half a player most needs to see. */
  theyOffered: boolean;
  /** Why Declare War is refused, or `null` when it is offered. */
  declareError: string | null;
  /** Why the peace offer (or its withdrawal) is refused, or `null`. */
  peaceError: string | null;
}

/**
 * Every empire this seat may have a relation with, in seat order.
 *
 * `diplomaticSeats` is the register of who is at the table (`diplomacy.ts`) —
 * the wild and the fallen are not — so this file has no roster filter of its
 * own, which is `realPlayers`' rule read from the interface's side.
 *
 * The status sentence is built here and only here, so the row, the toast and
 * any future chronicle line cannot drift about what "at war since" means.
 */
export function diplomacyRows(state: GameState, seat: number): DiplomacyRow[] {
  const rows: DiplomacyRow[] = [];
  for (const id of diplomaticSeats(state, seat)) {
    const player = playerById(state, id);
    if (!player) continue;
    const war = warBetween(state, seat, id);
    const truceLeft = truceTurnsLeft(state, seat, id);
    const relation: RelationKind = war ? 'war' : truceLeft > 0 ? 'truce' : 'peace';
    rows.push({
      playerId: id,
      name: player.name,
      color: player.color,
      relation,
      status: relationSentence(relation, war?.declaredTurn ?? null, truceLeft),
      since: war?.declaredTurn ?? null,
      truceLeft,
      weOffered: hasPeaceOffer(state, seat, id),
      theyOffered: hasPeaceOffer(state, id, seat),
      declareError: declareWarError(state, seat, id),
      peaceError: hasPeaceOffer(state, seat, id)
        ? withdrawPeaceError(state, seat, id)
        : proposePeaceError(state, seat, id),
    });
  }
  return rows;
}

/**
 * "At peace" · "At war since turn 41" · "Truce — 7 turns".
 *
 * One function so the row and the button's tooltip say the same thing, and the
 * turn is printed as a *figure* (tabular mono) because every number on every
 * surface in this game is (the specimen's rule).
 */
export function relationSentence(
  relation: RelationKind,
  since: number | null,
  truceLeft: number,
): string {
  if (relation === 'war') {
    return since === null ? 'At war' : `At war since turn ${figure(since)}`;
  }
  if (relation === 'truce') {
    return truceLeft === 1 ? 'Truce — one turn left' : `Truce — ${figure(truceLeft)} turns left`;
  }
  return 'At peace';
}

/**
 * What the peace button says on a row.
 *
 * Four faces, and the fourth is the one that matters: when *they* have offered
 * and you have not, the button is the thing that ends the war. It says so.
 */
export function peaceButtonLabel(row: DiplomacyRow): string {
  if (row.relation !== 'war') return 'Offer peace';
  if (row.weOffered) return 'Withdraw offer';
  return row.theyOffered ? 'Accept peace' : 'Offer peace';
}

/**
 * The line under a war row that says what the offers on it add up to.
 *
 * The whole of the peace mechanism said in a player's own terms: an offer is a
 * standing flag, nothing happens until both stand, and the moment they do the
 * turn's resolution ends the war. It is the one place the screen has to explain
 * a rule rather than report a fact, so it is written once, here, and tested.
 */
export function offerSentence(row: DiplomacyRow): string | null {
  if (row.relation !== 'war') return null;
  if (row.weOffered && row.theyOffered) return 'Both sides have offered — the war ends this turn.';
  if (row.theyOffered) return 'They have offered peace.';
  if (row.weOffered) return 'Your offer stands. The war ends when they answer it.';
  return null;
}

/** The confirm card a declaration raises. See the module docblock. */
export function declareConfirm(name: string): ConfirmRequest {
  return {
    title: `Declare war on the ${name}?`,
    body:
      'Your armies may enter their land and strike their people, and theirs may do the same. ' +
      'Every caravan running between you comes home. Peace can only be made if they agree to it.',
    confirmLabel: 'Declare war',
    cancelLabel: 'Keep the peace',
  };
}

// --- the sheet --------------------------------------------------------------

export interface DiplomacyScreenOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  trigger?: HTMLElement;
  getState: () => GameState;
  getPlayerId: () => number;
  /** Sends `declareWar`. The screen never mutates state itself. */
  declareWar: (targetId: number) => void;
  /** Sends `proposePeace` or `withdrawPeace` — `standing` says which. */
  offerPeace: (targetId: number, standing: boolean) => void;
  /** Raises the interface's own confirm card. See `confirmCard.ts`. */
  askConfirm: (request: ConfirmRequest, run: () => void) => void;
  onOpen?: () => void;
}

export interface DiplomacyScreen {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  refresh(): void;
  dispose(): void;
}

function element(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className: string, label: string): HTMLButtonElement {
  const node = element('button', className, label) as HTMLButtonElement;
  node.type = 'button';
  return node;
}

export function createDiplomacyScreen(options: DiplomacyScreenOptions): DiplomacyScreen {
  const { overlay, body, closeButton, trigger } = options;

  function isOpen(): boolean {
    return !overlay.hidden;
  }

  function setExpanded(): void {
    trigger?.setAttribute('aria-expanded', String(isOpen()));
  }

  /**
   * One empire's card: the swatch and the name, the relation, and the verbs.
   *
   * A refused verb is **drawn and disabled with its reason on the hover**
   * rather than hidden, which is this interface's rule everywhere a gate exists
   * (the Trade sheet's greyed rows, the city panel's greyed buys): a button
   * that vanishes is a rule a player cannot learn.
   */
  function drawRow(row: DiplomacyRow): HTMLElement {
    const card = element('article', `diplo-row is-${row.relation}`);

    const head = element('div', 'diplo-row-head');
    const swatch = element('span', 'diplo-swatch');
    swatch.style.background = row.color;
    swatch.setAttribute('aria-hidden', 'true');
    head.append(swatch);
    head.append(element('span', 'diplo-name', row.name));
    head.append(element('span', 'diplo-status', row.status));
    card.append(head);

    const note = offerSentence(row);
    if (note !== null) card.append(element('p', 'hint diplo-note', note));

    const verbs = element('div', 'diplo-row-verbs');

    const declare = button('btn btn-quiet btn-tiny', 'Declare war');
    if (row.declareError !== null) {
      declare.disabled = true;
      declare.title = row.declareError;
    } else {
      declare.title = `Open a war with the ${row.name}`;
      declare.addEventListener('click', () => {
        options.askConfirm(declareConfirm(row.name), () => {
          options.declareWar(row.playerId);
          draw();
        });
      });
    }
    verbs.append(declare);

    const peace = button(
      row.theyOffered && !row.weOffered ? 'btn btn-primary btn-tiny' : 'btn btn-quiet btn-tiny',
      peaceButtonLabel(row),
    );
    if (row.peaceError !== null) {
      peace.disabled = true;
      peace.title = row.peaceError;
    } else {
      const standing = !row.weOffered;
      peace.title = standing
        ? 'Put a standing offer of peace on the table'
        : 'Take your offer back off the table';
      peace.addEventListener('click', () => {
        options.offerPeace(row.playerId, standing);
        draw();
      });
    }
    verbs.append(peace);

    card.append(verbs);
    return card;
  }

  function draw(): void {
    if (!isOpen()) return;
    const state = options.getState();
    const seat = options.getPlayerId();
    body.replaceChildren();

    const column = element('section', 'sc-column diplo-column');
    column.append(element('p', 'eyebrow sc-eyebrow', 'the world'));
    const scroller = element('div', 'sc-column-body');
    column.append(scroller);

    const rows = diplomacyRows(state, seat);
    if (rows.length === 0) {
      scroller.append(element('p', 'sc-none', 'There is no other empire left in the world.'));
    }
    for (const row of rows) scroller.append(drawRow(row));

    // The sheet's one standing sentence: what a war costs and what a peace
    // takes. Said once at the foot rather than on every row, for the Trade
    // sheet's reason — a rule repeated per row is a rule the eye skips.
    const foot = element('div', 'diplo-foot');
    foot.append(
      element(
        'p',
        'hint',
        'At peace your soldiers may not enter another empire’s land, and may not strike ' +
          'its people or burn its works. A war opens both. A peace closes them again and walks ' +
          'every army home.',
      ),
    );
    column.append(foot);
    body.append(column);
  }

  function open(): void {
    options.onOpen?.();
    overlay.hidden = false;
    setExpanded();
    draw();
  }

  function close(): void {
    overlay.hidden = true;
    setExpanded();
  }

  function onKey(event: KeyboardEvent): void {
    if (!isOpen()) return;
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
  }

  function onGround(event: MouseEvent): void {
    if (event.target === overlay) close();
  }

  closeButton.addEventListener('click', close);
  overlay.addEventListener('mousedown', onGround);
  window.addEventListener('keydown', onKey, true);
  setExpanded();

  return {
    get isOpen(): boolean {
      return isOpen();
    },
    open,
    close,
    toggle: () => {
      if (isOpen()) close();
      else open();
    },
    refresh: draw,
    dispose: () => {
      closeButton.removeEventListener('click', close);
      overlay.removeEventListener('mousedown', onGround);
      window.removeEventListener('keydown', onKey, true);
    },
  };
}
