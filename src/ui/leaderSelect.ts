/**
 * **The new game's leader half** — the second card on the landing screen, beside
 * the map's (batch L2b, `docs/flags.md` (dddd); the mockup of 2026-09-10 is the
 * spec of record).
 *
 * The map card asks what world to draw; this one asks who you are in it. Six
 * figures and *No leader*, each a button carrying the seat's canton, the line
 * the seat holds from its first turn, and — for the one chosen — the three
 * cards Æra I will put on the table.
 *
 * **The table is walked, never listed** (CLAUDE.md's rule for the arena's panel,
 * read one screen over): every face below comes out of `LEADER_IDS` and
 * `describeCard`, so a seventh figure added to `data/leaders.json` appears here
 * with no edit to this file, to `index.html` or to the stylesheet. Nothing in
 * this module names a leader, a card or a figure.
 *
 * **No number is written in prose.** The clauses are `describeCard`'s — the same
 * describer the Compendium's leader shelf and the Ledger's own lines come out of
 * — so the figures arrive already worded, already marked, and already carrying
 * their `[[kind:id|Name]]` refs for `setDescriptorText` to draw.
 *
 * The pure half is above the DOM, as every sheet in this directory keeps it
 * (`wagerSheet.ts`' discipline): what a face says, and which figure each rival
 * seat sits under, are folds a suite with no jsdom can pin. Drawing them is a
 * page of `append` calls that fail loudly or not at all.
 */

import {
  type LeaderCardId,
  type LeaderCardKind,
  type LeaderId,
  LEADER_IDS,
  leaderCard,
  leaderDef,
} from '../sim/leaderData';
import { type CardClause, describeCard } from '../sim/statecraft';
import type { PlayerSpec } from '../sim/state';
import { heraldryFor, heraldryMarkDataUri } from '../art/heraldryMarks';
import { element } from './dom';
import { setDescriptorText } from './keywords';

/**
 * What the Seats picker means when nobody is chosen.
 *
 * The **empty string**, so the picker's own "no value" and this one are the same
 * value: a leaderless game writes no key onto any spec and its config is
 * byte-identical to one from before leaders existed (`PlayerSpec.leader`).
 */
export const NO_LEADER = '';

/** The column words, in the sheet's own order. The three inks are the CSS's. */
export const LEADER_KIND_WORD: Record<LeaderCardKind, string> = {
  passive: 'Passive',
  boon: 'Boon',
  unique: 'Unique',
};

/** How long each column lasts, said once, in a first-time player's words. */
export const LEADER_KIND_LASTS: Record<LeaderCardKind, string> = {
  passive: 'lasts the game',
  boon: 'once, when you take it',
  unique: 'a row of your own',
};

/**
 * **The one rule the sheet did not name**, in plain words (`docs/leaders.md`).
 *
 * Three of the six opening boons hand a *town* something, so nobody may answer
 * Æra I's row until their realm has one. The landing shows the row anyway — it
 * is what the figure is *for*, and hiding it until the first turn would make the
 * choice on this screen a choice about nothing.
 */
export const LEADER_FIRST_ROW_NOTE =
  'You take one of these three on your first turn with a capital — your leader waits ' +
  'until there is a town for the gift to arrive in. Each later age puts three more on ' +
  'the table, and the two you leave are gone.';

/** The sentence under the whole card, for a table sitting under no figure. */
export const NO_LEADER_NOTE =
  'Every seat plays the plain rules, and the world is drawn without anybody pulling on it.';

/** One card of a row, as this screen prints it. Words and flags, no sim types. */
export interface LeaderCardFace {
  id: LeaderCardId;
  name: string;
  kind: LeaderCardKind;
  /** "Passive" · "Boon" · "Unique". */
  word: string;
  /** `describeCard`'s clauses — descriptor text, drawn through `keywords.ts`. */
  clauses: CardClause[];
}

/** One figure, as the picker prints it. */
export interface LeaderFace {
  id: LeaderId;
  name: string;
  /** The line held from the first turn, in the game's own words. */
  bonus: CardClause[];
  /** The Æra I row: what the first draft will offer. */
  first: LeaderCardFace[];
}

/** One card of a deck, worded. `describeCard` carries the deferred halves. */
function cardFace(id: LeaderCardId): LeaderCardFace {
  const card = leaderCard(id);
  return {
    id,
    name: card.name,
    kind: card.kind,
    word: LEADER_KIND_WORD[card.kind],
    clauses: describeCard(id),
  };
}

/**
 * **Every figure the sheet holds**, in sheet order — the picker's whole reading.
 *
 * A leader's own line is `describeCard(leaderId)`: a bonus is a card in this
 * vocabulary (`anyCardDef`'s twelfth class), which is the whole argument for
 * writing one in the card vocabulary at all.
 */
export function leaderFaces(): LeaderFace[] {
  return LEADER_IDS.map((id) => ({
    id,
    name: leaderDef(id).name,
    bonus: describeCard(id),
    first: leaderDef(id).deck['1'].map((card) => cardFace(card.id)),
  }));
}

/**
 * **Which figure each rival sits under** — the deterministic rule, said once.
 *
 * The remaining figures in **sheet order**: seat 1 takes the first of
 * `LEADER_IDS` that is not yours, seat 2 the next, and so on. No draw — the
 * landing has no `Rng` and a table dealt from `Math.random` would be a table a
 * save could not replay (hard rule 2; a leader rides into `GameConfig`).
 *
 * **Nobody is seated when you are not.** *No leader* means a wholly leaderless
 * table, so the one-click game is the game it always was and its config is
 * byte-identical to one from before figures existed. A player who wants figures
 * takes one, and the rivals take theirs.
 *
 * A table with more seats than the sheet has figures simply runs out, and the
 * seats past the end sit under none — the honest answer rather than a repeat.
 */
export function rivalLeaders(chosen: string, rivals: number): (LeaderId | undefined)[] {
  const seats: (LeaderId | undefined)[] = [];
  if (chosen === NO_LEADER) return seats;
  const rest = LEADER_IDS.filter((id) => id !== chosen);
  for (let at = 0; at < rivals; at += 1) seats.push(rest[at]);
  return seats;
}

/**
 * The roster with its figures written on, and **nothing else changed**.
 *
 * A key is written only where there is one, exactly as `normalizeConfig` writes
 * a charge: a leaderless roster carries no `leader` anywhere and normalises byte
 * for byte as a roster from before leaders existed.
 */
export function seatLeaders(players: readonly PlayerSpec[], chosen: string): PlayerSpec[] {
  if (chosen === NO_LEADER) return players.map((spec) => ({ ...spec }));
  const rivals = rivalLeaders(chosen, Math.max(0, players.length - 1));
  return players.map((spec, seat) => {
    const leader = seat === 0 ? (chosen as LeaderId) : rivals[seat - 1];
    return leader === undefined ? { ...spec } : { ...spec, leader };
  });
}

// --- the card ---------------------------------------------------------------

export interface LeaderSelect {
  /** The chosen figure's id, or `NO_LEADER`. What `currentConfig` reads. */
  readonly chosen: string;
  /** Repaints. Called once at boot; the picker keeps its own state after. */
  render(): void;
}

export interface LeaderSelectOptions {
  /** The card's own element, built once and repainted on every pick. */
  container: HTMLElement;
  /**
   * The seat's own charge, for the canton. `undefined` is by seat order
   * (`heraldryFor`) — which is what the landing's roster always leaves it at.
   */
  charge?: string;
  /** The seat's ink, for the canton's mark. */
  color: string;
  /** Raised on every pick, so the Start button can say who it begins as. */
  onPick?: (chosen: string) => void;
}

/**
 * The picker, built once at module scope and never rebuilt.
 *
 * It holds the one thing on this screen that is neither a form field nor a save:
 * which figure the seat has taken. `NO_LEADER` is the default and stays the
 * default, so Start is one press away from the game it has always been.
 */
export function createLeaderSelect(options: LeaderSelectOptions): LeaderSelect {
  const { container } = options;
  let chosen: string = NO_LEADER;

  /** The seat's banner, as a canton: the charge on parchment, never in seat ink. */
  function canton(): HTMLElement {
    const mark = element('span', 'leader-canton');
    mark.setAttribute('aria-hidden', 'true');
    const uri = heraldryMarkDataUri(heraldryFor(0, options.charge), options.color);
    mark.style.setProperty('--canton-mark', `url("${uri}")`);
    return mark;
  }

  /** A list of clauses, drawn through the descriptor writer (a raw `[[` never). */
  function clauseList(clauses: readonly CardClause[], className: string): HTMLElement {
    const list = element('ul', className);
    for (const clause of clauses) {
      const item = element('li', clause.deferred ? 'leader-clause is-deferred' : 'leader-clause');
      // `linked: false` — the host is inside a `<button>`, where a click already
      // means "take this figure" (`keywordsAllowedIn`'s ruling).
      setDescriptorText(item, clause.text, { linked: false });
      list.append(item);
    }
    return list;
  }

  function drawFace(face: LeaderFace): HTMLElement {
    const button = element('button', 'leader-face') as HTMLButtonElement;
    button.type = 'button';
    button.setAttribute('aria-pressed', String(chosen === face.id));
    if (chosen === face.id) button.classList.add('is-chosen');
    button.append(canton());
    const text = element('span', 'leader-face-text');
    text.append(element('span', 'leader-name', face.name));
    if (face.bonus.length > 0) {
      text.append(element('p', 'eyebrow leader-eyebrow', 'from the first turn'));
      text.append(clauseList(face.bonus, 'leader-bonus'));
    }
    button.append(text);
    button.addEventListener('click', () => {
      chosen = chosen === face.id ? NO_LEADER : face.id;
      options.onPick?.(chosen);
      render();
    });
    return button;
  }

  function drawNone(): HTMLElement {
    const button = element('button', 'leader-face leader-face-none') as HTMLButtonElement;
    button.type = 'button';
    button.setAttribute('aria-pressed', String(chosen === NO_LEADER));
    if (chosen === NO_LEADER) button.classList.add('is-chosen');
    button.append(canton());
    const text = element('span', 'leader-face-text');
    text.append(element('span', 'leader-name', 'No leader'));
    text.append(element('p', 'leader-none-note', NO_LEADER_NOTE));
    button.append(text);
    button.addEventListener('click', () => {
      chosen = NO_LEADER;
      options.onPick?.(chosen);
      render();
    });
    return button;
  }

  /** The chosen figure's Æra I row, and the sentence about when it is answered. */
  function drawFirstRow(face: LeaderFace): HTMLElement {
    const block = element('section', 'leader-first');
    block.append(element('p', 'eyebrow', `${face.name} · what the first age offers`));
    const row = element('div', 'leader-first-row');
    for (const card of face.first) {
      const cell = element('article', `leader-mini leader-ink-${card.kind}`);
      cell.append(element('p', 'eyebrow leader-mini-kind', card.word));
      cell.append(element('h4', 'leader-mini-name', card.name));
      cell.append(clauseList(card.clauses, 'leader-mini-clauses'));
      row.append(cell);
    }
    block.append(row);
    block.append(element('p', 'leader-note', LEADER_FIRST_ROW_NOTE));
    return block;
  }

  function render(): void {
    container.replaceChildren();
    container.append(element('p', 'eyebrow', 'the seat'));
    container.append(element('h2', 'leader-title', 'Choose a leader'));
    const grid = element('div', 'leader-grid');
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Leaders');
    grid.append(drawNone());
    const faces = leaderFaces();
    for (const face of faces) grid.append(drawFace(face));
    container.append(grid);
    const picked = faces.find((face) => face.id === chosen);
    if (picked) container.append(drawFirstRow(picked));
  }

  return {
    get chosen(): string {
      return chosen;
    },
    render,
  };
}
