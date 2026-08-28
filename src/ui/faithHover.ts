/**
 * The faith lens's city card: what a town believes, and what is pressing on it.
 *
 * The lens paints the tide in the founder's ink and its legend says the tide
 * acts on towns rather than on ground — which leaves the obvious question
 * unanswered on the one surface a player is looking at. *Which* faith, how many
 * follow it, and where the pressure is coming from are three readings the city
 * panel already prints (`cityFaithRows`, `renderFollowers`), and they are the
 * whole content of this card: hover a town with the lens up and the panel's
 * block comes to the hex (user, 2026-08-28).
 *
 * It is a hover card, not a second panel
 * --------------------------------------
 * The card is the shared `infoCard`, non-sticky — a note laid beside the hex,
 * pointer-transparent, gone the moment the pointer leaves. It does **not** fight
 * the ordinary tile readout, and the decision is that they *stack* rather than
 * replace: the readout is pinned to the bottom-left corner of the viewport and
 * this card is anchored to the hex the pointer is on, so they never occupy the
 * same ink. Terrain, yields and what is standing there are still worth reading
 * with a faith lens up — a proclamation is planted on ground.
 *
 * What the seat may know
 * ----------------------
 * `explainPressure` is omniscient; a hover card is not. Two readings, and the
 * split is the one the city banners already make (`cityBanners.ts`):
 *
 *   **watched** — the seat can see the hex right now. Everything: the town's
 *   size, the banner it flies, every faith with a claim on it and each one's
 *   ledger. The player is looking at the place.
 *
 *   **remembered** — explored, sighted, not currently seen. `CitySighting`
 *   records a name, an owner and a position and *nothing about belief*, so
 *   there is no last-known congregation to print and the card does not invent
 *   one. What it prints instead is the half the seat genuinely owns: the
 *   pressure **their own** faith exerts on that town, which is composed of their
 *   sites, their following cities, their roads, their caravans and their
 *   proclamations — every one of them a fact about the seat's own board, and
 *   every one already listed to the founder on the Religion sheet. Nothing about
 *   any other faith, and no follower counts at all.
 *
 *   The **temple line is dropped** from a remembered reading, and it is the one
 *   line that needed a decision: it is a percentage taken because *that town*
 *   built a temple, and whether it did — and which way the multiplier falls,
 *   which turns on the banner the town currently flies — is exactly what a seat
 *   who cannot see the place does not know. Dropping the line rather than the
 *   ledger keeps rule 5 intact, because the total this card prints is the fold
 *   of the lines this card shows (`pressureLedgerText` folds what it is given).
 *
 * Unexplored ground has no card at all — the readout's own Terra Incognita rule,
 * and a card floating over a hex nobody has walked would be the fog leaking
 * through a surface written to respect it.
 *
 * Pure reading, dressed separately
 * --------------------------------
 * `faithHoverReading` is the whole rule and holds no DOM, so the leak above is
 * pinnable by a test with no jsdom behind it (this suite has none);
 * `faithHoverText` is its plain-text fold, which is what a test quotes and what
 * a platform `title` can carry; `faithHoverCard` is the dressing. The
 * `pressureLedgerText` in every one of them is the Religion sheet's own, so the
 * card and the sheet cannot come to disagree about a tide.
 */

import {
  type City,
  type GameState,
  type ReligionId,
  cityReligion,
  foundedReligion,
  playerById,
  unconvertedCitizens,
} from '../sim/state';
import { type PressureLine, explainPressure } from '../sim/religion';
import { citySightingOf, isExploredBy, isVisibleTo } from '../sim/visibility';
import { cityFaithRows } from './cityPanel';
import { cityDisplayName } from './cityDisplay';
import { figure } from './figures';
import { pressureLedgerText } from './religionScreen';

/** How well the seat knows this town right now. See the module docblock. */
export type FaithKnowledge = 'watched' | 'remembered';

/** One faith's claim on one town, as this seat is allowed to read it. */
export interface FaithHoverFaith {
  religion: ReligionId;
  /** The faith's own name, as its founder last set it. */
  name: string;
  /** True when the seat reading the card founded it. */
  ours: boolean;
  founderName: string;
  /** The founder's banner ink — a foreign faith is named in its founder's colour. */
  founderColor: string;
  /** Citizens here who follow it — `null` from memory, where nobody could know. */
  following: number | null;
  /** True when more than half the town follows it. Never set from memory. */
  majority: boolean;
  /** `explainPressure`'s lines, filtered to what this seat may read. */
  ledger: readonly PressureLine[];
}

export interface FaithHoverReading {
  cityId: number;
  /** With the capital star, exactly as every other surface prints a town. */
  cityName: string;
  ownerName: string;
  ownerColor: string;
  ours: boolean;
  knowledge: FaithKnowledge;
  /** Citizens — `null` from memory. */
  population: number | null;
  /** The faith the town flies, or `null` for none. Never read from memory. */
  majority: string | null;
  /** Citizens following nothing — `null` from memory, `0` when everyone follows. */
  unconverted: number | null;
  /** In founding order, the order `state.religions` carries. */
  faiths: FaithHoverFaith[];
}

/**
 * What this seat may read about this town's faith, or `null` when it may read
 * nothing at all — unexplored ground, or a town it has never once sighted.
 *
 * The argument order is the ruling's: state, the town, then who is looking.
 */
export function faithHoverReading(
  state: GameState,
  city: City,
  seat: number,
): FaithHoverReading | null {
  if (!isExploredBy(state, seat, city.col, city.row)) return null;
  const owner = playerById(state, city.ownerId);
  if (isVisibleTo(state, seat, city.col, city.row)) {
    const banner = cityReligion(city);
    return {
      cityId: city.id,
      cityName: cityDisplayName(state, city),
      ownerName: owner?.name ?? 'somebody',
      ownerColor: owner?.color ?? 'var(--ink)',
      ours: city.ownerId === seat,
      knowledge: 'watched',
      population: city.population,
      majority: banner === null ? null : (state.religions[banner]?.name ?? null),
      unconverted: unconvertedCitizens(city),
      // The city panel's own fold, so the card and the sheet print one reading
      // of a town's congregation rather than two that agree today.
      faiths: cityFaithRows(state, city, seat).map((row) => ({
        religion: row.religion,
        name: row.name,
        ours: row.ours,
        founderName: row.founderName,
        founderColor: row.founderColor,
        following: row.following,
        majority: row.majority,
        ledger: row.ledger,
      })),
    };
  }

  // Remembered. The name and the flag are what was *seen*, never what is true —
  // a town that has since changed hands or been renamed says what the player
  // actually knows, exactly as its banner does.
  const seen = citySightingOf(state, seat, city.id);
  if (seen === null) return null;
  const sighted = playerById(state, seen.ownerId);
  const mine = foundedReligion(state, seat);
  const faiths: FaithHoverFaith[] = [];
  if (mine !== undefined) {
    const ledger = ownPressureLines(state, city, mine.id);
    if (ledger.length > 0) {
      const founder = playerById(state, mine.founderId);
      faiths.push({
        religion: mine.id,
        name: mine.name,
        ours: true,
        founderName: founder?.name ?? 'somebody',
        founderColor: founder?.color ?? 'var(--ink)',
        following: null,
        majority: false,
        ledger,
      });
    }
  }
  return {
    cityId: city.id,
    cityName: seen.name,
    ownerName: sighted?.name ?? 'somebody',
    ownerColor: sighted?.color ?? 'var(--ink)',
    ours: seen.ownerId === seat,
    knowledge: 'remembered',
    population: null,
    majority: null,
    unconverted: null,
    faiths,
  };
}

/** The label of the one line a seat who cannot see a town may not read. */
const TEMPLE_LINE = 'Temple';

/**
 * The seat's own faith's lines on a town it cannot currently see, minus the
 * temple's. See the module docblock — the temple is a fact about the *town*,
 * and every other source on the list is a fact about the seat's own board.
 *
 * `cityFaithRows` is deliberately not reused here: it reads `followerCount` and
 * `cityReligion` off the live town, which is precisely what memory does not
 * hold.
 */
function ownPressureLines(
  state: GameState,
  city: City,
  religion: ReligionId,
): PressureLine[] {
  return explainPressure(state, city).filter(
    (line) => line.religion === religion && line.source !== TEMPLE_LINE,
  );
}

// --- words ------------------------------------------------------------------

/**
 * The card as plain text: the head line, then one line per faith, then the old
 * gods. What a test quotes, and what a `title` attribute can hold.
 *
 * Every figure on it is somebody else's — the counts are `cityFaithRows`', the
 * ledgers are `pressureLedgerText`'s — so this composes and never computes.
 */
export function faithHoverText(state: GameState, city: City, seat: number): string {
  const reading = faithHoverReading(state, city, seat);
  if (reading === null) return '';
  return faithHoverLines(reading).join('\n');
}

/** `faithHoverText`'s lines, unjoined — what the card lays out as elements. */
export function faithHoverLines(reading: FaithHoverReading): string[] {
  const lines: string[] = [headLine(reading)];
  for (const faith of reading.faiths) lines.push(faithLine(faith, reading.population));
  if (reading.faiths.length === 0) {
    lines.push(
      reading.knowledge === 'watched'
        ? 'Nothing presses here.'
        : 'Nothing of yours presses here.',
    );
  }
  if (reading.unconverted !== null && reading.unconverted > 0 && reading.population !== null) {
    lines.push(
      `${figure(reading.unconverted)} of ${figure(reading.population)} follow the old gods.`,
    );
  }
  return lines;
}

function headLine(reading: FaithHoverReading): string {
  const parts = [reading.cityName, reading.ownerName];
  if (reading.knowledge === 'remembered') {
    parts.push('last seen');
    return parts.join(' · ');
  }
  if (reading.population !== null) parts.push(`${figure(reading.population)} citizens`);
  parts.push(reading.majority === null ? 'follows no religion' : `follows ${reading.majority}`);
  return parts.join(' · ');
}

function faithLine(faith: FaithHoverFaith, population: number | null): string {
  const ledger = faithLedgerText(faith);
  if (faith.following === null || population === null) return `${faith.name} — ${ledger}`;
  return `${faith.name} · ${figure(faith.following)} of ${figure(population)} — ${ledger}`;
}

/**
 * One faith's ledger, or the two words that stand for an empty one.
 *
 * `pressureLedgerText`'s own sentence for an empty list is "Nothing presses
 * here." — which is right as the *card's* answer for a town nothing has reached
 * and wrong as the tail of a line that has just named a faith and counted its
 * congregation ("the Way of the Hearth · 1 of 5 — Nothing presses here."). A
 * faith with followers and no pressure is a real and common state: the tide
 * carried it here and has since receded.
 */
function faithLedgerText(faith: FaithHoverFaith): string {
  return faith.ledger.length === 0 ? 'nothing presses' : pressureLedgerText(faith.ledger);
}

// --- the card ---------------------------------------------------------------

function element(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * The reading, dressed — the city panel's Faith block in the hover card's
 * frame.
 *
 * The printed language is `renderFollowers`' verbatim, down to the ✶ beside the
 * faith a town flies and a foreign faith named in `--seat-ink`, because a player
 * who has read one should not have to learn the other. The ledger is spelled out
 * as its own faint line rather than hidden behind a second hover: there is no
 * hovering a hover card (`infoCard` is pointer-transparent), and the ledger is
 * the thing this card was asked for.
 */
export function faithHoverCard(reading: FaithHoverReading): HTMLElement {
  const box = element('div', 'faith-card');
  const head = element('p', 'faith-card-head');
  head.append(element('span', 'faith-card-city', reading.cityName));
  const owner = element('span', 'faith-card-owner', reading.ownerName);
  if (!reading.ours) owner.style.setProperty('--seat-ink', reading.ownerColor);
  head.append(owner);
  if (reading.knowledge === 'remembered') {
    head.append(element('span', 'faith-card-stale', 'last seen'));
  } else if (reading.population !== null) {
    head.append(element('span', 'faith-card-size', `${figure(reading.population)} citizens`));
  }
  box.append(head);

  if (reading.knowledge === 'watched') {
    box.append(
      element(
        'p',
        'faith-card-banner',
        reading.majority === null ? 'Follows no religion' : `Follows ${reading.majority}`,
      ),
    );
  }

  for (const faith of reading.faiths) {
    const row = element('div', faith.ours ? 'faith-card-faith' : 'faith-card-faith is-foreign');
    const line = element('p', 'faith-card-name-line');
    const name = element('span', 'faith-card-name', faith.name);
    if (!faith.ours) {
      name.style.setProperty('--seat-ink', faith.founderColor);
      name.title = `Founded by ${faith.founderName}`;
    }
    line.append(name);
    if (faith.majority) {
      const mark = element('span', 'faith-card-majority', '✶');
      mark.title = `More than half of ${reading.cityName} follows ${faith.name}`;
      line.append(mark);
    }
    if (faith.following !== null && reading.population !== null) {
      line.append(
        element(
          'span',
          'faith-card-count',
          `${figure(faith.following)} of ${figure(reading.population)}`,
        ),
      );
    }
    row.append(line);
    row.append(element('p', 'faith-card-ledger', faithLedgerText(faith)));
    box.append(row);
  }

  if (reading.faiths.length === 0) {
    box.append(
      element(
        'p',
        'faith-card-none',
        reading.knowledge === 'watched'
          ? 'Nothing presses here.'
          : 'Nothing of yours presses here.',
      ),
    );
  }

  if (reading.unconverted !== null && reading.unconverted > 0 && reading.population !== null) {
    box.append(
      element(
        'p',
        'faith-card-none',
        `${figure(reading.unconverted)} of ${figure(reading.population)} follow the old gods.`,
      ),
    );
  }
  return box;
}
