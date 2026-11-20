/**
 * **The age plate**: the page the player sees when the world's age turns over
 * (batch SS7; the board is `docs/plans/mockups/scholars-study/Moments.dc.html`,
 * "The age plate", approved in the user's first review of the Scholar's Study).
 *
 * Before this batch a new age arrived as an ordinary toast, "Æra III opens",
 * at the same volume as the news of a caravan. The plate replaces that toast.
 * It shows the age's numeral, its name, one plain line, and the deeds of the
 * seat that reads it. The chronicle still keeps the line the toast said.
 *
 * On the ribbon (2026-11-19)
 * --------------------------
 * The user: "i like the ribbon better, so it doesn't take you out of the game"
 * (frame A7 of the Quiet Table boards; `docs/plans/ui-critique-2026-10-16.md`,
 * "The UI buildout is the priority; the age plate build"). The plate is now
 * the painted wonder's form (`plateRibbon.ts`, shared with `wonderPlate.ts`):
 * the age's painting stands over the dimmed board on the lapis ribbon. On the
 * painting's foot, the numeral, the name and the line are at the left, and the
 * deeds and Continue at the right.
 *
 * The painting is one of three sets (`agePaintings.ts`), the same set for the
 * whole game, picked from a hash of the game's seed. If there is no painting,
 * or it does not load, the plate falls back to the full-screen lapis page it
 * had before (2026-11-18), with the deeds drawn under a deck's emblem each.
 *
 * Which moments raise it
 * ----------------------
 * - The world's age opening (`CommandResult.beadAgeOpened`), which is the
 *   moment the board's "Before" toast fires and the moment the age's wager is
 *   dealt. The top bar's age card shows the same clock (`shownAge` in
 *   `topBar.ts`). On the close turn it still prints the closing age, so the bar
 *   does not show the new age before this plate announces it. An empire that
 *   reaches a new age on its own research is not this moment: the world has
 *   not turned over, and no wager is dealt.
 * - **The opening plate**: age I, once, when a new game starts
 *   (`openNewGame` in `main.ts`). A loaded game never shows it. Age I closes
 *   nothing, so it has no deeds, and `agePlateLine` says no "closes" clause and
 *   no wager clause for it.
 *
 * The plate is news. It is queued in `main.ts`'s `pumpBeadNews` behind any bead
 * sheet and in front of the wager sheet it announces, so the player reads one
 * thing at a time.
 *
 * Words and figures
 * -----------------
 * Every figure is a reading of the state, and every deed has its own label, so
 * no number appears inside a sentence (hard rule 7). The deeds are the reading
 * seat's run so far:
 *
 * - **towns**: the towns it holds now (`citiesOf`);
 * - **first tech**: the first technology it learned of the age that closes,
 *   in the order `techsResearched` keeps; a starting technology and a charter
 *   technology are not deeds;
 * - **won · lost**: the pieces it has killed (`enemiesKilled`) and the pieces
 *   it has lost (`unitsLost`), both lifetime counts kept by `combat.ts`;
 * - **god named**: the newest god of its pantheon;
 * - **orders**: the Orders in its collection.
 *
 * A deed with nothing to show (no technology of that age, no god yet) is left
 * out rather than printed as a blank. On the painting's foot the deeds take at
 * most two rows at the right, so the foot stays inside the painting's lower
 * third; a deed that does not fit is not drawn, so the first deeds that fit are
 * the ones shown (`agePlate.css`).
 *
 * Motion
 * ------
 * On the ribbon, the ribbon plate's slow arrival (`plateRibbon.css`). On the
 * lapis page, the board's: the plate settles on `cubic-bezier(0.16, 1, 0.3, 1)`,
 * the numeral is pressed in like a seal, then the deeds come up from left to
 * right. The timings are CSS; this module only sets each deed's place in the
 * order. Reduced motion shows the ribbon plate at once, and keeps a fade in the
 * same order on the lapis page.
 *
 * Doors
 * -----
 * Continue, Escape and Enter close it, and Space presses Continue. The keyboard
 * starts on Continue. Escape is claimed on the window while the plate is up, as
 * the sheets claim it, so the board never sees it. Both pages fill the window,
 * so there is no ground around them to press. The ground handler below is kept
 * but is not reached.
 */

import { type DeckFace, deckMarkDataUri } from '../art/lineMarks';
import { beliefDef } from '../sim/religionData';
import { RULES } from '../sim/rulesData';
import { type GameState, citiesOf, playerById } from '../sim/state';
import { isCharterTech, isTechId, techDef } from '../sim/techData';
import { agePaintingSet, agePaintingUrl } from './agePaintings';
import { element } from './dom';
import { ageTitle, eraNumeralWord, figure } from './figures';
import { placeOnRibbon } from './plateRibbon';
import './agePlate.css';

/** One deed on the plate: a deck's emblem, a figure or a name, and its label. */
export interface AgeDeed {
  /** Which deck's emblem draws it on the lapis page (`DECK_MARKS`). */
  mark: DeckFace;
  /** The figure or the name, as printed. */
  value: string;
  /** The small word under it. */
  label: string;
}

/** The whole plate, as data. */
export interface AgePlateReading {
  /** "III". */
  numeral: string;
  /** "The Age of Empire". */
  name: string;
  /** The one plain line under the name. */
  line: string;
  deeds: AgeDeed[];
  /** The address of the age's painting (`agePaintings.ts`), or `null` for the lapis page. */
  painting: string | null;
}

/** The plate's own words. Plain, and no number inside a sentence (hard rule 7). */
export const AGE_PLATE_WORDS = {
  go: 'Continue',
} as const;

/**
 * The first technology this seat learned of `age`, or `null`.
 *
 * `techsResearched` keeps the order the empire learned its technologies in, so
 * the first one of an age is a scan. A starting technology was given, not
 * learned, and a charter technology does not belong to an age's race
 * (`highestAge` skips it for the same reason).
 */
export function firstTechOfAge(techs: readonly string[], age: number): string | null {
  const given = new Set<string>(RULES.research.startingTechs);
  for (const id of techs) {
    if (given.has(id) || !isTechId(id)) continue;
    const def = techDef(id);
    if (def.age !== age || isCharterTech(id)) continue;
    return def.name;
  }
  return null;
}

/**
 * The line under the age's name, from the age and whether its wager is dealt.
 *
 * "The Age of Heroes closes. The Age of Empire opens, and its wager is dealt."
 * The first age closes nothing, so its line is only "The Age of Omens opens."
 */
export function ageLineWords(age: number, dealt: boolean): string {
  const opens = `${ageTitle(age)} opens`;
  const second = dealt ? `${opens}, and its wager is dealt.` : `${opens}.`;
  if (age <= 1) return second;
  return `${ageTitle(age - 1)} closes. ${second}`;
}

/**
 * The line under the age's name, as the state reads it. The wager clause is
 * said only when the state holds a deal for this age: the first age has no
 * wager, and the line must not promise one.
 */
export function agePlateLine(state: GameState, age: number): string {
  return ageLineWords(
    age,
    state.wagers.some((deal) => deal.age === age),
  );
}

/**
 * The plate for `age`, as `playerId` reads it. Pure, so the suite can pin it.
 *
 * `seed` is the game's seed (`Game.config.seed`), which picks the set of
 * paintings; with no seed the plate is the lapis page. Age I closes nothing,
 * so the opening plate has no deeds.
 */
export function agePlateReading(state: GameState, playerId: number, age: number, seed: number | null = null): AgePlateReading {
  const player = playerById(state, playerId);
  const deeds: AgeDeed[] = [];
  if (age > 1) {
    deeds.push({ mark: 'expansionist', value: figure(citiesOf(state, playerId).length), label: 'towns' });
    const first = player ? firstTechOfAge(player.techsResearched, age - 1) : null;
    if (first !== null) deeds.push({ mark: 'scientific', value: first, label: 'first tech' });
    deeds.push({
      mark: 'dominion',
      value: `${figure(player?.enemiesKilled ?? 0)} · ${figure(player?.unitsLost ?? 0)}`,
      label: 'won · lost',
    });
    const gods = player?.pantheon.beliefs ?? [];
    const newest = gods[gods.length - 1];
    if (newest !== undefined) deeds.push({ mark: 'devotion', value: beliefDef(newest).name, label: 'god named' });
    deeds.push({ mark: 'generic', value: figure(player?.statecraft.orders.length ?? 0), label: 'orders' });
  }
  return {
    numeral: eraNumeralWord(age),
    name: ageTitle(age),
    line: agePlateLine(state, age),
    deeds,
    painting: seed === null ? null : agePaintingUrl(agePaintingSet(seed), age),
  };
}

// --- the pages -----------------------------------------------------------------

/** The Continue button both pages end on. */
function continueButton(go: () => void): HTMLButtonElement {
  const button = element('button', 'age-plate-continue', AGE_PLATE_WORDS.go);
  button.type = 'button';
  button.addEventListener('click', go);
  return button;
}

/**
 * The lapis page (2026-11-18): the gilt double frame, the numeral pressed in
 * like a seal, the name and the line, and the deeds under a deck's emblem
 * each. A plate without a painting shows this page.
 */
function lapisPage(reading: AgePlateReading, go: () => void): HTMLElement {
  const plate = element('div', 'age-plate');
  // The gilt double frame, drawn by the stylesheet on this one empty box.
  plate.append(element('div', 'age-plate-frame'));
  const inner = element('div', 'age-plate-inner');
  const numeral = element('div', 'age-plate-numeral', reading.numeral);
  numeral.setAttribute('aria-hidden', 'true');
  const name = element('h2', 'age-plate-name', reading.name);
  name.id = 'age-plate-name';
  inner.append(numeral, name, element('p', 'age-plate-line', reading.line));

  const deeds = element('ul', 'age-plate-deeds');
  reading.deeds.forEach((deed, at) => {
    const item = element('li', 'age-plate-deed');
    // Its place in the left-to-right order, which the stylesheet turns into a delay.
    item.style.setProperty('--deed-at', String(at));
    const mark = element('span', 'age-plate-mark');
    mark.setAttribute('aria-hidden', 'true');
    const drawn = element('span', 'line-mark');
    drawn.style.setProperty('--line-mark', `url("${deckMarkDataUri(deed.mark)}")`);
    mark.append(drawn);
    item.append(mark, element('span', 'age-plate-value', deed.value), element('span', 'age-plate-label', deed.label));
    deeds.append(item);
  });
  // On the parent, so Continue beside the list can wait for the last deed.
  inner.style.setProperty('--deed-count', String(reading.deeds.length));
  if (reading.deeds.length > 0) inner.append(deeds);
  inner.append(continueButton(go));
  plate.append(inner);
  return plate;
}

/**
 * The plate on the ribbon (frame A7): the painting over the dimmed board, and
 * on its foot the numeral, the name and the line at the left, the deeds in at
 * most two rows over Continue at the right. `unpainted` is called if the
 * painting does not load.
 */
function ribbonPage(reading: AgePlateReading, painting: string, go: () => void, unpainted: () => void): HTMLElement {
  const plate = element('div', 'age-plate age-plate--painted');
  const inner = element('div', 'age-plate-inner');

  const picture = element('div', 'age-plate-painting');
  const image = element('img', 'plate-painting-image');
  // The words say what the painting is for, so the picture is not read out.
  image.alt = '';
  image.decoding = 'async';
  image.addEventListener('error', unpainted, { once: true });
  image.src = painting;
  picture.append(image);

  const words = element('div', 'age-plate-words');
  const numeral = element('span', 'age-plate-numeral', reading.numeral);
  numeral.setAttribute('aria-hidden', 'true');
  const title = element('div', 'age-plate-title');
  const name = element('h2', 'age-plate-name', reading.name);
  name.id = 'age-plate-name';
  title.append(name, element('p', 'age-plate-line', reading.line));
  words.append(numeral, title);

  const close = element('div', 'age-plate-close');
  if (reading.deeds.length > 0) {
    const tally = element('ul', 'age-plate-tally');
    for (const deed of reading.deeds) {
      const item = element('li', 'age-plate-tally-deed');
      item.append(element('span', 'age-plate-value', deed.value), element('span', 'age-plate-label', deed.label));
      tally.append(item);
    }
    close.append(tally);
  }
  close.append(continueButton(go));

  placeOnRibbon(plate, inner, picture, words, close);
  plate.append(inner);
  return plate;
}

/**
 * **The plate's page**, built whole. On the ribbon when the reading names a
 * painting, and the lapis page otherwise. `go` is what Continue does.
 * `unpainted` is called if the painting does not load, so the caller can show
 * the lapis page in its place. The Flair Cabinet draws the same page.
 */
export function agePlatePage(reading: AgePlateReading, go: () => void, unpainted?: () => void): HTMLElement {
  if (reading.painting === null) return lapisPage(reading, go);
  return ribbonPage(reading, reading.painting, go, unpainted ?? (() => undefined));
}

// --- the plate ---------------------------------------------------------------

export interface AgePlate {
  readonly isOpen: boolean;
  /** Raises the plate over whatever is up. */
  show(reading: AgePlateReading): void;
  /** Takes it down, as Continue does. Safe when it is already down. */
  close(): void;
  /** Takes it down without telling anyone: the title screen's and a load's sweep. */
  clear(): void;
  dispose(): void;
}

interface AgePlateOptions {
  overlay: HTMLElement;
  /** Raised as the plate goes up, so the open cards close under it. */
  onOpen?: () => void;
  /** Called when the player closes it: the news behind it may now be shown. */
  onClosed?: () => void;
}

export function createAgePlate(options: AgePlateOptions): AgePlate {
  const { overlay } = options;
  /** The element that had the keyboard before the plate took it. */
  let returnTo: HTMLElement | null = null;
  /** The plate on show, or `null`. */
  let shown: AgePlateReading | null = null;

  function isOpen(): boolean {
    return !overlay.hidden;
  }

  /** Draws `reading` into the overlay, and gives Continue the keyboard. */
  function render(reading: AgePlateReading): void {
    shown = reading;
    overlay.replaceChildren(
      agePlatePage(reading, close, () => {
        // The painting did not load: the same plate on the lapis page.
        if (shown === reading && isOpen()) render({ ...reading, painting: null });
      }),
    );
    overlay.querySelector<HTMLButtonElement>('.age-plate-continue')?.focus({ preventScroll: true });
  }

  function show(reading: AgePlateReading): void {
    options.onOpen?.();
    if (!isOpen()) {
      const active = document.activeElement;
      returnTo = active instanceof HTMLElement && active !== document.body ? active : null;
    }
    overlay.hidden = false;
    render(reading);
  }

  function clear(): void {
    overlay.hidden = true;
    overlay.replaceChildren();
    returnTo = null;
    shown = null;
  }

  function close(): void {
    if (!isOpen()) return;
    const back = returnTo;
    clear();
    back?.focus({ preventScroll: true });
    options.onClosed?.();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!isOpen() || event.defaultPrevented) return;
    if (event.key !== 'Escape' && event.key !== 'Enter') return;
    // Enter on the focused button is the button's own click; this catches it
    // anywhere else on the plate too, and Escape everywhere.
    event.preventDefault();
    event.stopPropagation();
    close();
  }

  function onGround(event: MouseEvent): void {
    if (event.target === overlay) close();
  }

  window.addEventListener('keydown', onKeyDown, true);
  overlay.addEventListener('mousedown', onGround);

  return {
    get isOpen(): boolean {
      return isOpen();
    },
    show,
    close,
    clear,
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown, true);
      overlay.removeEventListener('mousedown', onGround);
      clear();
    },
  };
}
