/**
 * **Your leader** — what the figure at your table has given you, what it is
 * giving you *this turn*, and what the next age will put on the table (batch
 * L2b, `docs/flags.md` (dddd); the mockup of 2026-09-10 is the spec of record).
 *
 * The fourteenth sheet on `modalShell.ts`, behind the fifth door on the HUD dock
 * — the one wearing the seat's own charge. It is the sheet a player opens, where
 * the draft is the sheet the game raises at them, and that is the whole division
 * between the two: a row is a debt and this is a record.
 *
 * Two columns, and both are readings
 * ----------------------------------
 * **Left, what you hold**: the leader bonus first — it is live from the turn the
 * seat sits down, whatever is drafted — then one block per age, in age order.
 * A row already answered shows the card taken; the row on the table shows the
 * three still owed; a row not yet reached shows its three cards greyed with one
 * plain sentence saying how to reach them. The untaken siblings of an answered
 * row are shown greyed beside the card that was taken, because *what you left*
 * is a thing a player wants to see and a figure's sheet is the same three cards
 * every game — there is nothing to hide.
 *
 * **Right, the ledger**: every line in the empire's own books that carries the
 * leader's name, and its fold. **Nothing here is computed** (rule 5): the yield
 * lines are `readEmpire`'s — the very list the top bar's chip and the Ledger's
 * bars are built out of — filtered by the **card id** on the line, and the meter
 * lines are `explainHappiness`/`explainAuthority`'s, filtered by the one handle
 * a meter line offers, which is the class word the evaluator writes at the head
 * of its label (`classifyEmpireGold`'s precedent, one screen over, and its
 * reason: `MeterContribution` carries no id).
 *
 * A line's figure is the line's. This sheet gathers; it does not price.
 */

import {
  type LeaderCardId,
  type LeaderCardKind,
  type LeaderId,
  leaderCard,
  leaderDef,
} from '../sim/leaderData';
import { heldLeaderCards, leaderBlocker, leaderRowFor } from '../sim/leaders';
import { type CardClause, describeCard } from '../sim/statecraft';
import { type MeterContribution, explainAuthority, explainHappiness } from '../sim/meters';
import { readEmpire } from '../sim/readings';
import { TECH_AGES, TECH_IDS, type TechAge, highestAge, techDef } from '../sim/techData';
import { type GameState, playerById } from '../sim/state';
import { CITY_YIELD_KEYS, type CityYieldKey } from '../sim/resourceData';
import { isLeaderCardId, isLeaderId } from '../sim/leaderData';
import { LEADER_KIND_WORD } from './leaderSelect';
import { heraldryFor, heraldryMarkDataUri } from '../art/heraldryMarks';
import { seatInks } from '../art/seatInks';
import { element } from './dom';
import { YIELD_GLYPH, eraWord, figure, signedFigure } from './figures';
import { setDescriptorText } from './keywords';
import { createModalShell } from './modalShell';

/**
 * The word the evaluator writes at the head of every line a figure pays
 * (`CLASS_WORD.leader`, `statecraft/evaluator.ts`).
 *
 * Written here rather than imported because that table is private to the
 * evaluator, and pinned against its source by `test/ui/leaderScreens.test.ts` —
 * the same bargain `empireGoldDetail` already keeps with the treasury's labels.
 * It is read for the **meters** alone: a yield line carries the card's own id and
 * is filtered by that, because an id knows its class where a label only knows
 * its spelling.
 */
export const LEADER_SOURCE_WORD = 'Leader';

/** Does this line's card belong to this seat's figure? Asked of the id. */
function isLeaderCard(card: unknown): boolean {
  return isLeaderCardId(card) || isLeaderId(card);
}

/** One line of the leader's ledger: what pays, what it reads, what it is worth. */
export interface LeaderLedgerLine {
  /** The evaluator's own label — "Leader · The Corvée". */
  source: string;
  /** The six voices, as the line carries them. All zero on a meter line. */
  yields: Partial<Record<CityYieldKey, number>>;
  /** A meter's own points, when the line is a meter's. */
  meter: { word: string; value: number } | null;
}

/** A voice-bag with only the voices that moved in it. Never a row of noughts. */
function bagOf(line: Partial<Record<CityYieldKey, number>>): Partial<Record<CityYieldKey, number>> {
  const bag: Partial<Record<CityYieldKey, number>> = {};
  for (const key of CITY_YIELD_KEYS) {
    const value = line[key] ?? 0;
    if (value !== 0) bag[key] = value;
  }
  return bag;
}

/** Two bags added. The fold of a list, and the only sum of one on this sheet. */
function addBag(
  into: Partial<Record<CityYieldKey, number>>,
  from: Partial<Record<CityYieldKey, number>>,
): void {
  for (const key of CITY_YIELD_KEYS) {
    const value = from[key] ?? 0;
    if (value !== 0) into[key] = (into[key] ?? 0) + value;
  }
}

/**
 * **Every line in this empire's books carrying the leader's name**, in the
 * order the books already print them: the towns first, then the empire's own,
 * then the two meters.
 *
 * The towns and the empire are `readEmpire`'s lists, taken whole and filtered by
 * the id on the line. The meters are the two `explain…` lists, filtered by the
 * class word — see this module's docblock, and `LEADER_SOURCE_WORD`.
 *
 * A town's lines are summed **per label** across the realm, because a card that
 * pays a hammer in every town prints one line per town in `readEmpire` and the
 * reader's question is what the card pays, not what it pays in Uruk.
 */
export function leaderLedgerLines(state: GameState, playerId: number): LeaderLedgerLine[] {
  const byLabel = new Map<string, LeaderLedgerLine>();
  const order: string[] = [];
  const take = (source: string, yields: Partial<Record<CityYieldKey, number>>): void => {
    const held = byLabel.get(source);
    if (held) {
      addBag(held.yields, yields);
      return;
    }
    byLabel.set(source, { source, yields: { ...yields }, meter: null });
    order.push(source);
  };

  const reading = readEmpire(state, playerId);
  for (const town of reading.towns) {
    for (const line of town.reading.lines) {
      if (!isLeaderCard(line.card)) continue;
      take(line.source, bagOf(line));
    }
  }
  for (const line of reading.lines) {
    if (!isLeaderCard(line.card)) continue;
    take(line.source, bagOf(line));
  }

  const lines = order.map((source) => byLabel.get(source)!);
  const meters: { word: string; list: MeterContribution[] }[] = [
    { word: 'happiness', list: explainHappiness(state, playerId) },
    { word: 'authority', list: explainAuthority(state, playerId) },
  ];
  for (const meter of meters) {
    for (const entry of meter.list) {
      if (!entry.source.startsWith(`${LEADER_SOURCE_WORD} · `)) continue;
      if (entry.value === 0) continue;
      lines.push({ source: entry.source, yields: {}, meter: { word: meter.word, value: entry.value } });
    }
  }
  return lines;
}

/** The ledger's one fold: every voice every line pays, summed. */
export function foldLeaderLedger(
  lines: readonly LeaderLedgerLine[],
): Partial<Record<CityYieldKey, number>> {
  const total: Partial<Record<CityYieldKey, number>> = {};
  for (const line of lines) addBag(total, line.yields);
  return total;
}

/** One card of a deck, as the sheet prints it. */
export interface LeaderHoldCard {
  id: LeaderCardId;
  name: string;
  kind: LeaderCardKind;
  word: string;
  clauses: CardClause[];
  /** True for the card this seat took out of its row. */
  taken: boolean;
}

/** How a row of the sheet stands for this seat. */
export type LeaderRowState = 'taken' | 'offered' | 'locked';

/** One age's row: its three cards and where the seat stands with them. */
export interface LeaderHoldRow {
  age: TechAge;
  /** "Æra II" — the row's own name. */
  era: string;
  state: LeaderRowState;
  cards: LeaderHoldCard[];
  /** How to reach a locked row, in plain words. `null` for the other two. */
  reach: string | null;
}

/**
 * **How a locked row is reached**, in a first-time player's words and with no
 * figure in it.
 *
 * The technologies that *enter* the age, read off the tree rather than listed
 * here: a node whose own age is this row's and whose parents' are not is a door
 * into it, which is the same reading the star chart's banding makes. Named
 * rather than counted, and at most three, because a sentence listing eleven
 * technologies is a sentence nobody reads.
 */
export function leaderRowReach(age: TechAge): string {
  const era = eraWord(age);
  const doors = ageDoors(age);
  if (doors.length === 0) return `Reach ${era} and these three are offered.`;
  return `Learn ${listWords(doors)} — any of them opens ${era} — and these three are offered.`;
}

/**
 * The technologies that **step into** an age: banded into it, with every
 * prerequisite banded earlier — the doors, and the same reading the star chart's
 * banding makes.
 *
 * Read off the tree rather than tabulated here, so a technology moved between
 * ages moves this sentence with it and no second list can disagree. At most
 * three names, in the table's own order: a sentence listing eleven technologies
 * is a sentence nobody reads.
 */
function ageDoors(age: TechAge): string[] {
  const names: string[] = [];
  for (const id of TECH_IDS) {
    const def = techDef(id);
    if (def.age !== age) continue;
    if (def.prereqs.length === 0) continue;
    if (!def.prereqs.every((parent) => techDef(parent).age < age)) continue;
    names.push(def.name);
    if (names.length === 3) break;
  }
  return names;
}

/** "a, b or c" — a short list read aloud. */
function listWords(parts: readonly string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(', ')} or ${parts[parts.length - 1]}`;
}

/** What this seat holds and what it is still owed, row by row. */
export function leaderHoldRows(state: GameState, playerId: number): LeaderHoldRow[] {
  const player = playerById(state, playerId);
  const leader = player?.leader;
  if (!player || leader === undefined) return [];
  const held = new Set(heldLeaderCards(player));
  const offer = player.leaderOffer;
  const reached = highestAge(player.techsResearched);
  const rows: LeaderHoldRow[] = [];
  // `TECH_AGES` and not `LEADER_DECK_AGES`, and the two are the same four by
  // construction (`deckAgeOf`): a row is keyed by the age it is dealt in, and
  // walking the *ages* is what keeps this list in the order the seat will meet
  // them — object key order is not an order this game may depend on.
  for (const age of TECH_AGES) {
    const ids = leaderRowFor(leader, age);
    const taken = ids.find((id) => held.has(id));
    // **Three states, in precedence.** A row already answered is `taken`
    // whatever the seat's era; a row the seat has *reached* is `offered`,
    // whether the phase has dealt it yet or not (Æra I's is dealt with the
    // board and the rest at the end of the turn the age turned, so "reached and
    // unanswered" is the honest reading either side of that sweep); everything
    // above the seat's own era is out of reach and says how to get there.
    const standing: LeaderRowState =
      taken !== undefined ? 'taken' : offer?.age === age || age <= reached ? 'offered' : 'locked';
    rows.push({
      age,
      era: eraWord(age),
      state: standing,
      cards: ids.map((id) => {
        const card = leaderCard(id);
        return {
          id,
          name: card.name,
          kind: card.kind,
          word: LEADER_KIND_WORD[card.kind],
          clauses: describeCard(id),
          taken: held.has(id),
        };
      }),
      reach: standing === 'locked' ? leaderRowReach(age) : null,
    });
  }
  return rows;
}

/** The figure's own line, held from the first turn. */
export function leaderBonusClauses(leader: LeaderId): CardClause[] {
  return describeCard(leader);
}

// --- the sheet --------------------------------------------------------------

export interface LeaderSheet {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  refresh(): void;
  dispose(): void;
}

export interface LeaderSheetOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  trigger?: HTMLElement | null;
  getState: () => GameState;
  getPlayerId: () => number;
  onOpen?: () => void;
  /**
   * Raises the draft sheet — `main.ts`'s `leaderDraft.open()`.
   *
   * **The door that reopens a decision.** A figure's row never expires
   * (`leaderBlocker`'s docblock), so a seat that walked past the End Turn
   * blocker still owes it — and this is where the row is found again, because
   * this is the sheet that says what the row is *for*. Absent is a sheet with no
   * way back to the draft, which is what a hot-seat harness or a test builds.
   */
  onOpenDraft?: () => void;
}

export function createLeaderSheet(options: LeaderSheetOptions): LeaderSheet {
  const { overlay, body, closeButton, trigger, getState, getPlayerId } = options;

  function clauseList(clauses: readonly CardClause[], className: string): HTMLElement {
    const list = element('ul', className);
    for (const clause of clauses) {
      const item = element('li', clause.deferred ? 'leader-clause is-deferred' : 'leader-clause');
      setDescriptorText(item, clause.text, { linked: true });
      list.append(item);
    }
    return list;
  }

  /**
   * **The seat's canton**, on the block that names the figure (batch H7,
   * `docs/flags.md` (oooo)).
   *
   * The landing's canton exactly — the same drawing, the same class, the same
   * two custom properties — so the card a player chose a figure on and the sheet
   * they read it on afterwards wear one banner. The pair comes off the *seat*
   * rather than off the figure's row: a seat is what carries colours into a
   * game, and asking the row here would be the second source `seatInks` exists
   * to prevent.
   */
  function canton(state: GameState, seat: number): HTMLElement {
    const player = playerById(state, seat);
    const inks = seatInks(player);
    const mark = element('span', 'leader-canton');
    mark.setAttribute('aria-hidden', 'true');
    const uri = heraldryMarkDataUri(heraldryFor(seat, player?.charge), inks.secondary);
    mark.style.setProperty('--canton-mark', `url("${uri}")`);
    mark.style.setProperty('--canton-field', inks.primary);
    mark.style.setProperty('--canton-device', inks.secondary);
    return mark;
  }

  function drawBonus(state: GameState, seat: number, leader: LeaderId): HTMLElement {
    const hold = element('article', 'leader-hold');
    hold.append(element('p', 'eyebrow', 'from the first turn'));
    const head = element('div', 'leader-hold-head');
    head.append(canton(state, seat));
    head.append(element('h3', 'leader-hold-name', leaderDef(leader).name));
    hold.append(head);
    hold.append(clauseList(leaderBonusClauses(leader), 'leader-hold-clauses'));
    return hold;
  }

  function drawRow(row: LeaderHoldRow, owed: boolean): HTMLElement {
    const hold = element('article', `leader-hold is-${row.state}`);
    const word =
      row.state === 'taken' ? 'taken' : row.state === 'offered' ? 'on the table' : 'not yet reached';
    hold.append(element('p', 'eyebrow', `${row.era} · ${word}`));
    const cards = element('div', 'leader-hold-cards');
    for (const card of row.cards) {
      const cell = element(
        'div',
        `leader-hold-card leader-ink-${card.kind}${card.taken ? ' is-taken' : ' is-left'}`,
      );
      cell.append(element('p', 'eyebrow leader-mini-kind', card.word));
      cell.append(element('h4', 'leader-mini-name', card.name));
      cell.append(clauseList(card.clauses, 'leader-mini-clauses'));
      cards.append(cell);
    }
    hold.append(cards);
    if (row.reach !== null) hold.append(element('p', 'leader-note', row.reach));
    // **The way back to the decision.** Only on the row this seat actually
    // owes an answer for — `leaderBlocker`'s own reading, which is also the one
    // that holds its tongue until there is a capital, so the button never
    // offers a pick the reducer would refuse.
    if (owed && options.onOpenDraft !== undefined) {
      const take = element('button', 'leader-hold-take') as HTMLButtonElement;
      take.type = 'button';
      take.textContent = `Take one for ${row.era}`;
      take.addEventListener('click', () => options.onOpenDraft?.());
      hold.append(take);
    }
    return hold;
  }

  /** One ledger row: the label, and the figure it puts in the books this turn. */
  function drawLedgerLine(line: LeaderLedgerLine): HTMLElement {
    const item = element('tr', 'leader-ledger-row');
    item.append(element('td', 'leader-ledger-source', line.source));
    const cell = element('td', 'num leader-ledger-figure');
    if (line.meter !== null) {
      cell.textContent = `${signedFigure(line.meter.value)} ${line.meter.word}`;
    } else {
      cell.textContent = bagText(line.yields);
    }
    item.append(cell);
    return item;
  }

  /** "+3⚒ +1🔬" — the voices that moved, in the top bar's own order. */
  function bagText(bag: Partial<Record<CityYieldKey, number>>): string {
    const parts: string[] = [];
    for (const key of CITY_YIELD_KEYS) {
      const value = bag[key] ?? 0;
      if (value === 0) continue;
      parts.push(`${signedFigure(value)}${YIELD_GLYPH[key]}`);
    }
    return parts.join(' ');
  }

  function render(): void {
    const state = getState();
    const seat = getPlayerId();
    body.replaceChildren();
    const player = playerById(state, seat);
    const leader = player?.leader;
    if (!player || leader === undefined) {
      body.append(
        element(
          'p',
          'leader-empty',
          'This seat sits under no leader. A new game is where one is chosen.',
        ),
      );
      return;
    }

    const sheet = element('div', 'leader-sheet-grid');

    const held = element('section', 'leader-held');
    held.append(drawBonus(state, seat, leader));
    // Which row is actually owed, asked once of the simulation rather than
    // guessed from the row's own standing: `offered` says the seat has reached
    // the age, and `leaderBlocker` says whether the game is waiting on it.
    const owed = leaderBlocker(state, seat)?.age ?? null;
    for (const row of leaderHoldRows(state, seat)) held.append(drawRow(row, row.age === owed));
    sheet.append(held);

    const ledger = element('section', 'leader-ledger');
    ledger.append(element('p', 'eyebrow', 'what your leader is giving you this turn'));
    ledger.append(
      element('h3', 'leader-ledger-title', `${leaderDef(leader).name} · turn ${figure(state.turn)}`),
    );
    const lines = leaderLedgerLines(state, seat);
    if (lines.length === 0) {
      ledger.append(
        element(
          'p',
          'leader-note',
          'Nothing your leader holds is paying into the books this turn.',
        ),
      );
    } else {
      const table = element('table', 'leader-ledger-table');
      const head = element('tr');
      head.append(element('th', '', 'Source'));
      head.append(element('th', 'num', 'This turn'));
      table.append(head);
      for (const line of lines) table.append(drawLedgerLine(line));
      const total = element('tr', 'leader-ledger-total');
      total.append(element('td', '', 'Yields from the seat'));
      total.append(element('td', 'num', bagText(foldLeaderLedger(lines)) || '—'));
      table.append(total);
      ledger.append(table);
    }
    ledger.append(
      element(
        'p',
        'leader-note',
        'Every line here is a fold the books already print elsewhere; this sheet gathers the ' +
          'ones that carry your leader’s name. Open the city or the meter to see the same line ' +
          'in its own breakdown.',
      ),
    );
    sheet.append(ledger);
    body.append(sheet);
  }

  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    trigger,
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
