/**
 * **The age's draft** — the three cards a figure puts on the table when the
 * seat's own age turns, and the one it takes (batch L2b, `docs/flags.md` (dddd);
 * `docs/leaders.md` "The draft" is the rule and the mockup of 2026-09-10 is the
 * spec of record).
 *
 * The thirteenth sheet on `modalShell.ts`, and it keeps the whole of that
 * contract: `hidden` is its only state, ×/Escape/a press on the ground all reach
 * one `close`, the keyboard goes back where it came from and `dispose` unbinds
 * and is registered in `gameDisposers`.
 *
 * It is raised by the End Turn blocker for the local seat and by nothing else —
 * `wagerSheet.ts`' rule, one system over — but for the **opposite** reason, and
 * the difference is worth writing down: a wager's table is answered in one
 * window, so a door onto it would be a door onto a decision already made; a
 * leader's row *never* expires (`leaderBlocker`'s docblock), so the door that
 * would matter is the one that reopens it, and that door is the leader sheet's
 * — press the banner and the row is there, still owed.
 *
 * The three "today" lines
 * -----------------------
 * Each card carries what it would be worth **now**, and each of the three
 * columns answers that differently because the three are different kinds of
 * thing:
 *
 *   · a **passive** is a rate, so its line is the card's own stamp —
 *     `explainCardImpact` with the pick ghosted into `Player.leaderPicks`
 *     (batch L2b's arm), which is the empire's own ledger read twice and
 *     therefore the very figure the turn resolution will bank;
 *   · a **boon** is a lump, so its line is *what the lump is*, in the words the
 *     bead table already prints one for (`describeBeadBoon`) and the words a
 *     wonder's completion already hands a piece over in (`grantWords`, with this
 *     moment's own lead);
 *   · a **unique** is a row, so its line is the row's own figures — strength,
 *     reach, pace and what it costs this empire to raise, off the folds
 *     (`explainUnitCost`, `explainBuildingCost`) rather than off a table here.
 *
 * Nothing on this sheet computes a yield or a cost (rule 5), and nothing writes
 * prose about a number: every clause is `describeCard`'s and every figure is a
 * fold, printed beside its label in the tabular mono every figure wears.
 *
 * The pure half is above the DOM (`wagerSheet.ts`' discipline): what a face
 * says, which figures it carries and whether the rules refuse it are folds the
 * jsdom-less suite can pin, and drawing them is a page of `append` calls.
 */

import { type CardImpactLine, explainCardImpact } from '../sim/cardImpact';
import {
  type LeaderCardId,
  type LeaderCardKind,
  leaderCard,
} from '../sim/leaderData';
import { chooseLeaderCardError } from '../sim/leaders';
import { type CardClause, describeCard, grantWords } from '../sim/statecraft';
import { describeBeadBoon } from '../sim/beads';
import { explainBuildingCost, explainUnitCost, foldUnitCost } from '../sim/cities';
import { isBuildingId, buildingDef } from '../sim/buildingData';
import { isUnitTypeId, unitDef } from '../sim/unitData';
import { type GameState, type LeaderOffer, capitalCityOf, playerById } from '../sim/state';
import { LEADER_KIND_LASTS, LEADER_KIND_WORD } from './leaderSelect';
import { element } from './dom';
import { eraWord, figure } from './figures';
import { setDescriptorText } from './keywords';
import {
  type StampReading,
  cardStampNode,
  landCardStamp,
  stampFigures,
  stampIsEmpty,
  stampReading,
  stampText,
} from './cardStamp';
import { createModalShell } from './modalShell';

/**
 * The moment a leader's boon is paid, as the grant describer's lead.
 *
 * A wonder's grants say "on completion" because that is when the stones go up;
 * a figure's say this, because that is when the card is taken. One describer,
 * one lead swapped — see `grantWords`.
 */
export const LEADER_BOON_MOMENT = 'when you take it';

/** One figure of a row, printed beside its label in tabular mono. */
export interface LeaderRowFigure {
  label: string;
  value: string;
}

/** One of the three, as the sheet prints it. Words and numbers, no sim types. */
export interface LeaderPickFace {
  index: number;
  id: LeaderCardId;
  name: string;
  kind: LeaderCardKind;
  /** "Passive" · "Boon" · "Unique" — the eyebrow. */
  word: string;
  /** "lasts the game" — what the column means, said once. */
  lasts: string;
  /** The card's own effects, in the game's words. Drawn as descriptor text. */
  clauses: CardClause[];
  /** What the lump is, for a card that pays one. Empty for a card that does not. */
  boon: CardClause[];
  /** The row a unique opens, in the row's own figures. Empty for the other two. */
  row: LeaderRowFigure[];
  /** The stamp: what holding this card would pay every turn, as the board stands. */
  today: StampReading;
  /** `stampText(stampFigures(today))`, or `null` when it pays no standing rate. */
  todayText: string | null;
  /** The simulation's own refusal (`chooseLeaderCardError`), when there is one. */
  rejected: string | null;
}

/** The row a unique opens, in its own figures. Nothing here computes a cost. */
function rowFigures(state: GameState, playerId: number, id: LeaderCardId): LeaderRowFigure[] {
  const card = leaderCard(id);
  const out: LeaderRowFigure[] = [];
  const unit = card.unlocks?.unit;
  if (unit !== undefined && isUnitTypeId(unit)) {
    const def = unitDef(unit);
    if (def.combatStrength > 0) {
      out.push({ label: 'strength', value: figure(def.combatStrength) });
    }
    if (def.rangedStrength !== undefined) {
      out.push({ label: 'ranged', value: figure(def.rangedStrength) });
    }
    if (def.range !== undefined) out.push({ label: 'range', value: figure(def.range) });
    out.push({ label: 'moves', value: figure(def.movement) });
    out.push({
      label: 'hammers',
      value: figure(foldUnitCost(explainUnitCost(state, playerId, unit))),
    });
  }
  const building = card.unlocks?.building;
  if (building !== undefined && isBuildingId(building)) {
    const def = buildingDef(building);
    if (def.happiness !== undefined && def.happiness !== 0) {
      out.push({ label: 'happiness', value: figure(def.happiness) });
    }
    out.push({
      label: 'hammers',
      value: figure(foldUnitCost(explainBuildingCost(building, state, playerId))),
    });
  }
  return out;
}

/** What the lump is, in the words the bead table and the wonder already use. */
function boonClauses(id: LeaderCardId): CardClause[] {
  const boon = leaderCard(id).boon;
  if (boon === undefined) return [];
  const clauses: CardClause[] = [];
  if (boon.windfall !== undefined) clauses.push(...describeBeadBoon({ windfall: boon.windfall }));
  for (const grant of boon.grants ?? []) {
    clauses.push({ text: grantWords(grant, LEADER_BOON_MOMENT) });
  }
  return clauses;
}

/**
 * **The three cards of one row, as faces** — the sheet's whole reading.
 *
 * The stamp is asked of every column rather than of the passives alone, and
 * deliberately: a boon card may carry standing effects beside its lump (The
 * Mit'a is written as a boon and pays a permanent step of authority), and a
 * column word is which *ink* a card wears rather than which mechanism it is
 * (`LeaderCardKind`'s own docblock). Asking the ledger is the only way to be
 * right about a card that is two things.
 */
export function leaderDraftFaces(
  state: GameState,
  playerId: number,
  offer: LeaderOffer,
): LeaderPickFace[] {
  const faces: LeaderPickFace[] = [];
  offer.cards.forEach((id, index) => {
    const card = leaderCard(id);
    const lines: CardImpactLine[] = explainCardImpact(state, playerId, { kind: 'leaderCard', id });
    const today = stampReading(lines);
    faces.push({
      index,
      id,
      name: card.name,
      kind: card.kind,
      word: LEADER_KIND_WORD[card.kind],
      lasts: LEADER_KIND_LASTS[card.kind],
      clauses: describeCard(id),
      boon: boonClauses(id),
      row: rowFigures(state, playerId, id),
      today,
      todayText: stampIsEmpty(today) ? null : stampText(stampFigures(today)),
      rejected: chooseLeaderCardError(state, playerId, index),
    });
  });
  return faces;
}

/** The masthead line: whose row, and which age turned. */
export function leaderDraftHeadline(state: GameState, playerId: number, offer: LeaderOffer): string {
  const name = playerById(state, playerId)?.name ?? 'Your leader';
  return `${name} — take one for ${eraWord(offer.age)}`;
}

/**
 * The lead under it, in a first-time player's words.
 *
 * Numbers never appear in written prose (hard rule 7) — the figures are beside
 * their labels on the cards, which is where a figure belongs.
 */
export const LEADER_DRAFT_LEAD =
  'Three cards, and they are your leader’s own: the same three every game you play them. ' +
  'Take one and it is yours for the rest of the game; the two you leave are gone. The next ' +
  'three come when you enter the age after this one.';

/**
 * The sentence a realm with no town reads, in the `.wanting` voice.
 *
 * The one rule the sheet did not name (`docs/leaders.md`): three of the six
 * opening boons hand a *town* something, so the row waits on the founding. It is
 * never lost — which is the half a player has to be told, because a screen that
 * only said "no" would read as a row taken away.
 */
export const LEADER_DRAFT_WAITING =
  'Your leader waits until there is a town for the gift to arrive in. Found your first city ' +
  'and these three are still here.';

// --- the sheet --------------------------------------------------------------

export interface LeaderDraftSheet {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  refresh(): void;
  dispose(): void;
}

export interface LeaderDraftSheetOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  getState: () => GameState;
  getPlayerId: () => number;
  /** Sends `chooseLeaderCard`. Returns true when the reducer took it. */
  take: (index: number) => boolean;
  onOpen?: () => void;
}

export function createLeaderDraftSheet(options: LeaderDraftSheetOptions): LeaderDraftSheet {
  const { overlay, body, closeButton, getState, getPlayerId } = options;
  /**
   * Which of the three is picked up, and **nothing is spent by picking one up.**
   *
   * The mockup's own gesture, and the reason the card is not the button: a
   * leader's card is held for the rest of the game and the two beside it are
   * gone the instant one is taken, so the sheet asks twice — the card says
   * *this one*, and the button at the foot says *take it*. It is the one
   * decision on this sheet and it deserves the second press.
   *
   * Forgotten on every genuine opening (`onShow`), because a card picked up in
   * one age's draft is not a card picked up in the next one's.
   */
  let picked: number | null = null;

  function clauseList(clauses: readonly CardClause[], className: string): HTMLElement {
    const list = element('ul', className);
    for (const clause of clauses) {
      const item = element('li', clause.deferred ? 'leader-clause is-deferred' : 'leader-clause');
      // The host is a `<button>`, where a click already means "take this card"
      // — `keywordsAllowedIn`'s ruling, asked by the builder that owns the host.
      setDescriptorText(item, clause.text, { linked: false });
      list.append(item);
    }
    return list;
  }

  function drawFace(face: LeaderPickFace): HTMLElement {
    const card = element('button', `leader-pick leader-ink-${face.kind}`) as HTMLButtonElement;
    card.type = 'button';
    card.disabled = face.rejected !== null;
    card.setAttribute('aria-pressed', String(picked === face.index));
    if (picked === face.index) card.classList.add('is-picked');

    const kind = element('div', 'leader-pick-kind');
    kind.append(element('b', 'eyebrow', face.word));
    kind.append(element('span', 'leader-pick-lasts', face.lasts));
    card.append(kind);

    card.append(element('h3', 'leader-pick-name', face.name));
    if (face.clauses.length > 0) card.append(clauseList(face.clauses, 'leader-pick-clauses'));
    if (face.boon.length > 0) card.append(clauseList(face.boon, 'leader-pick-boon'));

    const foot = element('div', 'leader-pick-today');
    if (face.row.length > 0) {
      const row = element('p', 'leader-pick-row');
      for (const entry of face.row) {
        row.append(element('span', 'leader-row-label', entry.label));
        row.append(element('span', 'num leader-row-figure', entry.value));
      }
      foot.append(row);
    }
    if (!stampIsEmpty(face.today)) {
      const today = element('p', 'leader-pick-stamp');
      today.append(element('span', 'leader-row-label', 'today it would pay'));
      const stamp = cardStampNode();
      landCardStamp(stamp, face.today);
      today.append(stamp);
      foot.append(today);
    }
    if (foot.childElementCount > 0) card.append(foot);

    if (face.rejected !== null) {
      card.append(element('p', 'wanting leader-pick-wanting', face.rejected));
    }

    card.addEventListener('click', () => {
      if (face.rejected !== null) return;
      picked = face.index;
      render();
    });
    return card;
  }

  function render(): void {
    const state = getState();
    const seat = getPlayerId();
    body.replaceChildren();
    const offer = playerById(state, seat)?.leaderOffer;
    if (!offer) {
      body.append(element('p', 'leader-empty', 'Your leader has nothing on the table.'));
      return;
    }

    const head = element('section', 'leader-lead');
    head.append(element('p', 'eyebrow', 'your leader opens the age'));
    head.append(element('h3', 'leader-headline', leaderDraftHeadline(state, seat, offer)));
    head.append(element('p', 'leader-lead-text', LEADER_DRAFT_LEAD));
    // The one rule the sheet did not name, said only while it bites: a realm
    // with a capital is told nothing, because nothing is in its way.
    if (capitalCityOf(state, seat) === undefined) {
      head.append(element('p', 'wanting leader-waiting', LEADER_DRAFT_WAITING));
    }
    body.append(head);

    const faces = leaderDraftFaces(state, seat, offer);
    const grid = element('div', 'leader-picks');
    for (const face of faces) grid.append(drawFace(face));
    body.append(grid);

    // The foot: what taking one costs you, and the press that does it. The
    // button names the card so the second press is answering the question the
    // first press asked, rather than confirming a highlight.
    const chosen = picked === null ? undefined : faces[picked];
    const foot = element('div', 'leader-draft-foot');
    foot.append(
      element(
        'p',
        'leader-draft-foot-note',
        'The two you leave are gone; the next three come when you enter the age after this one.',
      ),
    );
    const take = element('button', 'leader-take') as HTMLButtonElement;
    take.type = 'button';
    take.disabled = chosen === undefined || chosen.rejected !== null;
    take.textContent = chosen === undefined ? 'Take one' : `Take ${chosen.name}`;
    take.addEventListener('click', () => {
      if (chosen === undefined || chosen.rejected !== null) return;
      if (!options.take(chosen.index)) return;
      shell.close();
    });
    foot.append(take);
    body.append(foot);
  }

  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    onOpen: () => options.onOpen?.(),
    // A fresh sheet of paper forgets what was picked up on the last one.
    onShow: () => {
      picked = null;
    },
    draw: render,
  });

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open: shell.open,
    close: shell.close,
    refresh: shell.refresh,
    dispose: shell.dispose,
  };
}
