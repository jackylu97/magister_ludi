/**
 * **The wonder plate**: the page the player sees when one of their own towns
 * finishes a wonder (frame A1 of the Council and In play board,
 * `docs/plans/mockups/scholars-study/council-and-in-play/council-and-in-play.html`,
 * "D1, A1 to A3"; the user, 2026-11-18: "yes to all decisions"). Before this a
 * finished wonder was a toast and a chronicle line. The plate replaces the
 * toast for the seat's own wonders; the chronicle keeps the line, and another
 * seat's wonder keeps its toast.
 *
 * It is the age plate's page (`agePlate.ts`): the lapis ground and the gilt
 * double frame of the big moments, Continue, and Escape or Enter to close. On
 * it, the wonder's picture in a window of exactly 16:9, the shape of its
 * painting (`docs/splash-art.md`, row 3), taken from `wonderPicture` by
 * `wonderWindowNode`; under it the wonder's name, the plain line with its
 * town, the turn and what it pays each turn. Its text is In play's (the
 * piece's hover and its tray), so the picture keeps the height.
 *
 * **One page for a wonder** (the user, 2026-11-19: "put the renown line on the
 * plate, no second page"). The Triumph a finished wonder earns is drawn on the
 * plate as one line, its name and its renown, and its own Triumph page does not
 * open. `wonderTriumphPairs` says which award belongs to which wonder; only
 * those awards skip the Triumph page, and every other Triumph is unchanged.
 * The record, the chronicle line and the renown itself are not touched.
 *
 * It is news, queued in `main.ts`'s `pumpBeadNews` behind the bead, age, wager
 * and census pages, so the player reads one thing at a time. When it closes,
 * the wonder flies to the In play door in the corner panel (frame A2) and the
 * door's count and dot land with it; with less motion there is no flight.
 */

import './agePlate.css';
import './wonderPlate.css';

import type { BuildingId } from '../sim/buildingData';
import type { WonderCompletion } from '../sim/cities';
import { type GameState, cityById } from '../sim/state';
import { triumphDef } from '../sim/triumphData';
import type { TriumphAward } from '../sim/triumphs';
import { roundYield } from '../sim/yieldFormat';
import { COUNCIL_VOICES } from './councilTotals';
import { element } from './dom';
import { signedFigure } from './figures';
import { wonderWindowNode } from './inPlayForms';
import { type InPlayEntry, inPlayLayout, piecesFigures } from './inPlayPieces';
import { renownMarkNode } from './meterMark';
import { type PlateFigure, plateFigureNode } from './orderFace';

/** The plate's words. Plain, and no number inside a sentence (hard rule 7). */
export const WONDER_PLATE_WORDS = {
  eyebrow: 'A wonder is finished',
  finished: (town: string) => `Finished in ${town}.`,
  turn: 'turn',
  /** The Triumph's line: the Triumph sheet's and the census sheet's words. */
  triumph: (name: string) => `Triumph · ${name}`,
  renown: 'renown',
  go: 'Continue',
} as const;

/** The whole plate, as data. */
export interface WonderPlateReading {
  building: BuildingId;
  /** The wonder as In play lists it: the plate draws its form. */
  entry: InPlayEntry;
  /** What it pays each turn, rounded as a plate prints it. */
  plate: PlateFigure[];
  town: string;
  turn: number;
  /** The Triumph the wonder earned, drawn on the plate as one line; `null` for none. */
  triumph: { name: string; pays: number } | null;
}

/**
 * **Which Triumph goes on which plate.** The seat's own wonders in one result,
 * paired in order with the seat's own awards from a row whose trigger is a
 * finished wonder (the trigger kind is the marker, never a name, as
 * `censusTriumphIds` finds the census's row). Both come from the same result,
 * because the occasion that finishes a wonder is the one that awards it. An
 * award with no wonder to pair keeps its Triumph page.
 */
export function wonderTriumphPairs(
  result: { wonders?: readonly WonderCompletion[]; triumphs?: readonly TriumphAward[] },
  seat: number,
): [WonderCompletion, TriumphAward][] {
  const wonders = (result.wonders ?? []).filter((done) => done.playerId === seat);
  const awards = (result.triumphs ?? []).filter(
    (award) => award.playerId === seat && triumphDef(award.id).when.kind === 'wonderCompleted',
  );
  const pairs: [WonderCompletion, TriumphAward][] = [];
  for (let index = 0; index < Math.min(wonders.length, awards.length); index += 1) pairs.push([wonders[index]!, awards[index]!]);
  return pairs;
}

/**
 * The plate for a wonder the seat holds, or `null` when In play does not list
 * it (the town has changed hands since). `triumph` is the award
 * `wonderTriumphPairs` gave this wonder. Pure, so the suite can pin it.
 */
export function wonderPlateReading(
  state: GameState,
  seat: number,
  building: BuildingId,
  cityId: number,
  turn: number,
  triumph: TriumphAward | null = null,
): WonderPlateReading | null {
  const entry = inPlayLayout(state, seat)
    .stacks.flatMap((stack) => stack.entries)
    .find((piece) => piece.key === `wonder:${building}`);
  if (entry === undefined || entry.subject === null) return null;
  const own = piecesFigures(state, seat, entry.subject);
  const plate: PlateFigure[] = [];
  for (const voice of COUNCIL_VOICES) {
    const amount = roundYield(own[voice]);
    if (amount !== 0) plate.push({ voice, amount });
  }
  return {
    building,
    entry,
    plate,
    town: cityById(state, cityId)?.name ?? '',
    turn,
    triumph: triumph === null ? null : { name: triumph.name, pays: triumph.pays },
  };
}

/**
 * **The plate's page**, built whole: the frame, the 16:9 picture, the name,
 * the line, the turn, the figures, the Triumph's line and Continue. `go` is what
 * Continue does. The Flair Cabinet draws the same page.
 */
export function wonderPlatePage(reading: WonderPlateReading, go: () => void): HTMLElement {
  const plate = element('div', 'age-plate wonder-plate');
  plate.append(element('div', 'age-plate-frame'));
  const inner = element('div', 'age-plate-inner wonder-plate-inner');
  // No deeds on this plate: Continue comes up after the wonder settles.
  inner.style.setProperty('--deed-count', '0');
  inner.append(element('p', 'wonder-plate-eyebrow', WONDER_PLATE_WORDS.eyebrow));
  // The picture, full-bleed in a window of exactly 16:9 (the CSS ratio).
  inner.append(wonderWindowNode(reading.building, 'wonder-plate-window'));
  const name = element('h2', 'wonder-plate-name', reading.entry.name);
  name.id = 'wonder-plate-name';
  inner.append(name);
  const where = element('p', 'age-plate-line wonder-plate-line', WONDER_PLATE_WORDS.finished(reading.town));
  const turn = element('span', 'wonder-plate-turn');
  turn.append(element('small', undefined, WONDER_PLATE_WORDS.turn), element('b', undefined, String(reading.turn)));
  inner.append(where, turn);
  // What it pays each turn, in the plate's lit inks.
  const pays = element('div', 'wonder-plate-pays');
  for (const figure of reading.plate) pays.append(plateFigureNode(figure));
  if (reading.plate.length > 0) inner.append(pays);
  // The Triumph it earned, as one line: the laurel, the Triumph's name, and
  // its renown as a figure with the word apart, as the Triumph sheet sets it.
  if (reading.triumph !== null) {
    const line = element('p', 'wonder-plate-triumph');
    line.append(renownMarkNode());
    line.append(element('span', 'wonder-plate-triumph-name', WONDER_PLATE_WORDS.triumph(reading.triumph.name)));
    line.append(element('span', 'wonder-plate-triumph-figure', signedFigure(reading.triumph.pays)));
    line.append(element('span', 'wonder-plate-triumph-word', WONDER_PLATE_WORDS.renown));
    inner.append(line);
  }
  const button = element('button', 'age-plate-continue', WONDER_PLATE_WORDS.go);
  button.type = 'button';
  button.addEventListener('click', go);
  inner.append(button);
  plate.append(inner);
  return plate;
}

export interface WonderPlate {
  readonly isOpen: boolean;
  /** Raises the plate over whatever is up. */
  show(reading: WonderPlateReading): void;
  /** Takes it down, as Continue does. Safe when it is already down. */
  close(): void;
  /** Takes it down without telling anyone: the title screen's and a load's sweep. */
  clear(): void;
  dispose(): void;
}

interface WonderPlateOptions {
  overlay: HTMLElement;
  /** Raised as the plate goes up, so the open cards close under it. */
  onOpen?: () => void;
  /**
   * Called when the player closes it, with where the wonder was drawn, so it
   * can fly to the In play door; then the news behind it may be shown.
   */
  onClosed?: (reading: WonderPlateReading, from: DOMRect | null) => void;
}

export function createWonderPlate(options: WonderPlateOptions): WonderPlate {
  const { overlay } = options;
  /** The element that had the keyboard before the plate took it. */
  let returnTo: HTMLElement | null = null;
  /** The plate on show. */
  let shown: WonderPlateReading | null = null;

  function isOpen(): boolean {
    return !overlay.hidden;
  }

  function show(reading: WonderPlateReading): void {
    options.onOpen?.();
    if (!isOpen()) {
      const active = document.activeElement;
      returnTo = active instanceof HTMLElement && active !== document.body ? active : null;
    }
    shown = reading;
    overlay.replaceChildren(wonderPlatePage(reading, close));
    overlay.hidden = false;
    overlay.querySelector<HTMLButtonElement>('.age-plate-continue')?.focus({ preventScroll: true });
  }

  function clear(): void {
    overlay.hidden = true;
    overlay.replaceChildren();
    returnTo = null;
    shown = null;
  }

  function close(): void {
    if (!isOpen()) return;
    const reading = shown;
    const from = overlay.querySelector<HTMLElement>('.wonder-plate-window')?.getBoundingClientRect() ?? null;
    const back = returnTo;
    clear();
    back?.focus({ preventScroll: true });
    if (reading !== null) options.onClosed?.(reading, from);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!isOpen() || event.defaultPrevented) return;
    if (event.key !== 'Escape' && event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    close();
  }

  window.addEventListener('keydown', onKeyDown, true);

  return {
    get isOpen(): boolean {
      return isOpen();
    },
    show,
    close,
    clear,
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown, true);
      clear();
    },
  };
}
