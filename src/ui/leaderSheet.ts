/**
 * **Your civ** — who is at your table, what their two rules are paying you *this
 * turn*, the two rows nobody else may raise, and the towns your realm founds
 * (batch L2b; re-aimed at the second cut in L6b, `docs/flags.md` (xxxx)).
 *
 * The thirteenth sheet on `modalShell.ts`, behind the fifth door on the HUD dock
 * — the one wearing the seat's own charge. The draft sheet that stood beside it
 * is gone with the deck (L6a): a figure is a **known quantity** from the landing
 * screen onward, so there is no decision left for a sheet to raise and this one
 * is a record and nothing else. The user's ruling is what it exists for:
 * *"we still need to give players a way to see what their civ does"*.
 *
 * Four things, and every one of them a reading
 * -------------------------------------------
 * **The head**: the figure's name, the seat's canton, and the pair of inks said
 * in the row's own words.
 *
 * **The two abilities**: each with its clauses and **what it is paying this
 * turn** — gathered, never computed (rule 5). The yield lines are `readEmpire`'s
 * — the very list the top bar's chip and the Ledger's bars are built out of —
 * filtered by the **card id** on the line, which for an ability is the ability's
 * own id; the meter lines are `explainHappiness`/`explainAuthority`'s, filtered
 * by the label they carry, because `MeterContribution` offers no id
 * (`classifyEmpireGold`'s precedent, one screen over, and its reason).
 *
 * **The two uniques**: the soldier and the building this figure alone may raise,
 * each with the technology or the age that opens it and whether it is open *for
 * this seat* — `isUnlocked`, the simulation's own gate, asked rather than
 * re-derived. A row not yet open says when it comes.
 *
 * **The towns**: the figure's own list in order, with the ones already standing
 * marked — `LeaderDef.cities`, which is what `nextCityName` walks.
 *
 * A line's figure is the line's. This sheet gathers; it does not price.
 */

import { type LeaderId, leaderDef, seatName } from '../sim/leaderData';
import type { CardClause } from '../sim/statecraft';
import { type MeterContribution, explainAuthority, explainHappiness } from '../sim/meters';
import { readEmpire } from '../sim/readings';
import { isUnlocked } from '../sim/tech';
import { improvementOpenTo } from '../sim/improvements';
import type { ImprovementId } from '../sim/improvementData';
import { type GameState, playerById } from '../sim/state';
import { CITY_YIELD_KEYS, type CityYieldKey } from '../sim/resourceData';
import {
  type LeaderAbilityFace,
  type LeaderRowKind,
  type LeaderUniqueFace,
  LEADER_ROW_WORD,
  leaderFaces,
} from './leaderSelect';
import { heraldryFor, heraldryMarkDataUri } from '../art/heraldryMarks';
import { seatInks } from '../art/seatInks';
import { element } from './dom';
import { YIELD_GLYPH, figure, signedFigure } from './figures';
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

/** What the sheet says to a seat sitting under nobody. One sentence, no figure. */
export const LEADER_PLAIN_SEAT =
  'This seat sits under no leader: it plays the plain rules, with no line of its own and ' +
  'no row nobody else may raise. A new game is where a figure is chosen.';

/** What a unique's line says once the seat may raise it. */
export const LEADER_UNIQUE_OPEN = 'Yours to raise, in any city that may build its kind.';

/**
 * The same sentence for a unique that is **ground** rather than a building
 * (batch L8): nobody raises a terrace in a city, a worker cuts one into a
 * hillside, and telling a player to look in a build list would send them to a
 * menu it will never be on.
 */
export const LEADER_UNIQUE_OPEN_GROUND = 'Yours to cut, on any of your hexes its ground will take.';

/** One line of the leader's ledger: what pays, what it reads, what it is worth. */
export interface LeaderLedgerLine {
  /** The evaluator's own label — "Leader · the Qhapaq Ñan". */
  source: string;
  /**
   * **Whose line it is**: the ability's id, or the figure's own — the two ids
   * `liveEffects`' twelfth source pushes under (the second is the unique unit's
   * own row effects, which ride the law of the figure that may field the piece).
   * This is the handle the ability blocks group on.
   */
  card: string;
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
 * **Which id a meter line belongs to**, recovered from its label.
 *
 * `MeterContribution` carries no card id — it is a word and a number — so the
 * one handle a meter line offers is the label the evaluator writes, which is
 * `CLASS_WORD.leader` and then the card's own name. Built off the figure's own
 * sheet rather than off a table here, so a renamed ability moves both halves at
 * once and a line whose name nothing on the sheet answers to is simply not this
 * figure's.
 */
function labelsOf(leader: LeaderId): Map<string, string> {
  const def = leaderDef(leader);
  const map = new Map<string, string>();
  for (const ability of def.abilities) {
    map.set(`${LEADER_SOURCE_WORD} · ${ability.name}`, ability.id);
  }
  map.set(`${LEADER_SOURCE_WORD} · ${def.name}`, leader);
  return map;
}

/**
 * **Every line in this empire's books carrying the leader's name**, in the
 * order the books already print them: the towns first, then the empire's own,
 * then the two meters.
 *
 * A town's lines are summed **per label** across the realm, because a rule that
 * pays a hammer in every town prints one line per town in `readEmpire` and the
 * reader's question is what the rule pays, not what it pays in Uruk.
 */
export function leaderLedgerLines(state: GameState, playerId: number): LeaderLedgerLine[] {
  const player = playerById(state, playerId);
  const leader = player?.leader;
  if (!player || leader === undefined) return [];
  const labels = labelsOf(leader);
  const mine = new Set<string>(labels.values());

  const byLabel = new Map<string, LeaderLedgerLine>();
  const order: string[] = [];
  const take = (
    source: string,
    card: string,
    yields: Partial<Record<CityYieldKey, number>>,
  ): void => {
    const held = byLabel.get(source);
    if (held) {
      addBag(held.yields, yields);
      return;
    }
    byLabel.set(source, { source, card, yields: { ...yields }, meter: null });
    order.push(source);
  };

  const reading = readEmpire(state, playerId);
  for (const town of reading.towns) {
    for (const line of town.reading.lines) {
      if (typeof line.card !== 'string' || !mine.has(line.card)) continue;
      take(line.source, line.card, bagOf(line));
    }
  }
  for (const line of reading.lines) {
    if (typeof line.card !== 'string' || !mine.has(line.card)) continue;
    take(line.source, line.card, bagOf(line));
  }

  const lines = order.map((source) => byLabel.get(source)!);
  const meters: { word: string; list: MeterContribution[] }[] = [
    { word: 'happiness', list: explainHappiness(state, playerId) },
    { word: 'authority', list: explainAuthority(state, playerId) },
  ];
  for (const meter of meters) {
    for (const entry of meter.list) {
      const card = labels.get(entry.source);
      if (card === undefined || entry.value === 0) continue;
      lines.push({
        source: entry.source,
        card,
        yields: {},
        meter: { word: meter.word, value: entry.value },
      });
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

/** One of the two rules, with what it is paying the empire as the board stands. */
export interface LeaderAbilityRow extends LeaderAbilityFace {
  /** The books' own lines carrying this rule's id. Gathered, never priced. */
  lines: LeaderLedgerLine[];
}

/** One of the two rows nobody else may raise, and where this seat stands with it. */
export interface LeaderUniqueRow extends LeaderUniqueFace {
  /** The eyebrow — "Unique unit" · "Unique building". */
  word: string;
  /** `isUnlocked`'s own answer for this seat, this turn. */
  open: boolean;
  /** One plain sentence: what to do with it, or when it comes. */
  note: string;
}

/** One of the figure's towns, and whether the realm has founded it. */
export interface LeaderCityRow {
  name: string;
  founded: boolean;
}

/** The figure this seat plays, as this sheet reads it. `null` for a plain seat. */
function faceOf(state: GameState, playerId: number) {
  const leader = playerById(state, playerId)?.leader;
  if (leader === undefined) return null;
  return leaderFaces().find((face) => face.id === leader) ?? null;
}

/** Both rules, each with its own lines out of the empire's books. */
export function leaderAbilityRows(state: GameState, playerId: number): LeaderAbilityRow[] {
  const face = faceOf(state, playerId);
  if (!face) return [];
  const lines = leaderLedgerLines(state, playerId);
  return face.abilities.map((ability) => ({
    ...ability,
    lines: lines.filter((line) => line.card === ability.id),
  }));
}

/**
 * Both rows, with the gate asked of the simulation.
 *
 * `isUnlocked` and nothing beside it: the rule is two questions — does this
 * seat's figure name the row, and has the row's own learning come — and a
 * second reading of it here would be a second gate that could disagree with the
 * build list a player is looking at.
 */
export function leaderUniqueRows(state: GameState, playerId: number): LeaderUniqueRow[] {
  const face = faceOf(state, playerId);
  if (!face) return [];
  return face.uniques.map((row) => {
    // **The gate each kind owns.** A soldier and a hall are queue rows and
    // `isUnlocked` answers for them; a work of the ground is not a queue row at
    // all, so its two questions — does this seat's figure name it, has its own
    // technology come — are asked of the function that owns them
    // (`improvementOpenTo`, batch L8) rather than of a third reading here.
    const open =
      row.kind === 'improvement'
        ? improvementOpenTo(state, playerId, row.id as ImprovementId)
        : isUnlocked(state, playerId, row.kind, row.id);
    return {
      ...row,
      word: LEADER_ROW_WORD[row.kind as LeaderRowKind],
      open,
      note: open
        ? row.kind === 'improvement'
          ? LEADER_UNIQUE_OPEN_GROUND
          : LEADER_UNIQUE_OPEN
        : `Not yet — it comes ${row.opens}.`,
    };
  });
}

/**
 * The figure's towns in the order it founds them, with the standing ones marked.
 *
 * `nextCityName` walks this same list ahead of the invented one and skips a name
 * a standing town already wears, so "founded" here is exactly what that walk
 * skips — asked of the board rather than counted, because a captured town wears
 * its founder's name wherever it now flies.
 */
export function leaderCityRows(state: GameState, playerId: number): LeaderCityRow[] {
  const leader = playerById(state, playerId)?.leader;
  if (leader === undefined) return [];
  const standing = new Set(state.cities.map((city) => city.name));
  return leaderDef(leader).cities.map((name) => ({ name, founded: standing.has(name) }));
}

/** The figure's two inks said in words — the row's own first cells. */
export function leaderColorWords(state: GameState, playerId: number): [string, string] | null {
  const leader = playerById(state, playerId)?.leader;
  if (leader === undefined) return null;
  return [...leaderDef(leader).colors.names] as [string, string];
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

  /** The head: who is at the table, and the two inks the board flies for them. */
  function drawHead(state: GameState, seat: number): HTMLElement {
    const hold = element('article', 'leader-hold leader-hold-figure');
    hold.append(element('p', 'eyebrow', 'the figure at your table'));
    const head = element('div', 'leader-hold-head');
    head.append(canton(state, seat));
    head.append(element('h3', 'leader-hold-name', seatName(state, seat)));
    hold.append(head);
    const words = leaderColorWords(state, seat);
    if (words) {
      const inks = seatInks(playerById(state, seat));
      const swatch = element('p', 'leader-inks');
      const field = element('span', 'leader-ink-chip');
      field.style.setProperty('--chip-ink', inks.primary);
      const device = element('span', 'leader-ink-chip');
      device.style.setProperty('--chip-ink', inks.secondary);
      swatch.append(field, device, element('span', '', `${words[0]} and ${words[1]}`));
      hold.append(swatch);
    }
    return hold;
  }

  /** One rule, and the books' own lines for it. */
  function drawAbility(row: LeaderAbilityRow, at: number): HTMLElement {
    const hold = element('article', 'leader-hold');
    hold.append(element('p', 'eyebrow', at === 0 ? 'its first rule' : 'its second rule'));
    hold.append(element('h4', 'leader-hold-title', row.name));
    hold.append(clauseList(row.clauses, 'leader-hold-clauses'));
    const now = element('div', 'leader-now');
    if (row.lines.length === 0) {
      now.append(element('p', 'leader-note', 'Nothing in the books this turn.'));
    } else {
      for (const line of row.lines) {
        const item = element('p', 'leader-now-line');
        item.append(element('span', 'leader-now-label', line.source));
        item.append(element('span', 'num leader-now-figure', lineFigure(line)));
        now.append(item);
      }
    }
    hold.append(now);
    return hold;
  }

  /** One row nobody else may raise, with its gate and where the seat stands. */
  function drawUnique(row: LeaderUniqueRow): HTMLElement {
    const hold = element('article', `leader-hold leader-unique${row.open ? '' : ' is-locked'}`);
    hold.append(element('p', 'eyebrow', row.word));
    const line = element('p', 'leader-unique-line');
    setDescriptorText(line, row.text, { linked: true });
    hold.append(line);
    hold.append(element('p', 'leader-note', row.note));
    return hold;
  }

  /** The towns, in the order the figure founds them. */
  function drawCities(rows: readonly LeaderCityRow[]): HTMLElement {
    const hold = element('article', 'leader-hold');
    hold.append(element('p', 'eyebrow', 'the towns it founds, in order'));
    const list = element('ul', 'leader-cities');
    for (const row of rows) {
      const item = element('li', row.founded ? 'leader-city is-founded' : 'leader-city', row.name);
      if (row.founded) item.setAttribute('title', 'standing');
      list.append(item);
    }
    hold.append(list);
    hold.append(
      element('p', 'leader-note', 'A name already standing on the board is marked; the next town ' +
        'your realm founds takes the first that is not.'),
    );
    return hold;
  }

  /** What one line puts in the books — a bag of voices, or a meter's points. */
  function lineFigure(line: LeaderLedgerLine): string {
    if (line.meter !== null) return `${signedFigure(line.meter.value)} ${line.meter.word}`;
    return bagText(line.yields) || '—';
  }

  /** One ledger row: the label, and the figure it puts in the books this turn. */
  function drawLedgerLine(line: LeaderLedgerLine): HTMLElement {
    const item = element('tr', 'leader-ledger-row');
    item.append(element('td', 'leader-ledger-source', line.source));
    item.append(element('td', 'num leader-ledger-figure', lineFigure(line)));
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
      body.append(element('p', 'leader-empty', LEADER_PLAIN_SEAT));
      return;
    }

    const sheet = element('div', 'leader-sheet-grid');

    const held = element('section', 'leader-held');
    held.append(drawHead(state, seat));
    leaderAbilityRows(state, seat).forEach((row, at) => held.append(drawAbility(row, at)));
    for (const row of leaderUniqueRows(state, seat)) held.append(drawUnique(row));
    held.append(drawCities(leaderCityRows(state, seat)));
    sheet.append(held);

    const ledger = element('section', 'leader-ledger');
    ledger.append(element('p', 'eyebrow', 'what your leader is giving you this turn'));
    ledger.append(
      element('h3', 'leader-ledger-title', `${seatName(state, seat)} · turn ${figure(state.turn)}`),
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
