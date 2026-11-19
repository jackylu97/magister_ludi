/**
 * **The Opus close**: what every seat sees when the Magnum Opus is finished.
 *
 * It has two pages: the ending page, then the Abacus page (batch SS7; the
 * board is "The Magnum Opus closes" on
 * `docs/plans/mockups/scholars-study/Moments.dc.html`). The standings rise
 * after the Abacus page.
 *
 * The ending page
 * ---------------
 * The spec is `docs/plans/ui-critique-2026-10-16.md`, "The ending page is the
 * painting, full screen" (the user, 2026-11-19). The page takes the place of
 * the two colour beats (black, then parchment) that opened the close before.
 *
 * - One painting covers the window, cut from its centre: `win.jpg` if the seat
 *   reading the page closed the work, `loss.jpg` if another seat did
 *   (`endingPaintings.ts`).
 * - A dark fade covers the lower third. On it, at the left: the sun for a win
 *   or the moon for a loss, the line "The Great Work is closed", the winner's
 *   name with "wins", and one sentence. At the right: three doors.
 * - The doors:
 *   - "See the Abacus" is the primary door. Enter or Space takes it. It opens
 *     the Abacus page.
 *   - "Look at the board" closes the whole close, and the game goes on, as
 *     the standings' "Continue playing" lets it. Escape takes it.
 *   - "Back to the title" takes the same path as the standings' door of that
 *     name: `toTitle`, which `main.ts` sets to the landing screen's own path.
 * - The painting fades in slowly, and the words and doors come after it. With
 *   reduced motion, everything shows at once. The lengths are in
 *   `opusClose.css`.
 * - If the painting does not load, the page shows its ground behind the same
 *   words: deep lapis for a win, the dark cloth for a loss.
 * - The page has no clock. It waits for a door. While it waits, the Abacus
 *   stage is built behind it, so a press on "See the Abacus" does not wait for
 *   a WebGL context.
 *
 * The Abacus page
 * ---------------
 * "See the Abacus" starts these beats:
 *
 * 1. **The Abacus page opens** over the painting, on the table's vellum: the
 *    frame fills the window, with a name and a tally at each rod, and sways a
 *    little as it does on the Abacus screen.
 * 2. **The golden bead lights**: the camera moves in on the winner's rod, and a
 *    golden bead lights at the start of the unearned beads, larger than the
 *    rest and with a halo.
 * 3. **It slides home** with the frame's own slide and knock. The tally does
 *    not move: the golden bead is not one of the beads the threshold counts.
 * 4. **The turn**: the frame turns on its turntable and back, so the gilt bead
 *    catches the light, and the labels fade while it is turned. Then the
 *    standings page rises.
 *
 * About three and a half seconds in all (`OPUS_CLOSE_TIMING`, the board's beat
 * lengths). A key or a press during these beats goes straight to the
 * standings.
 *
 * Reduced motion: the board's rule. No camera move and no turn, and no sway.
 * The Abacus page still fades in, and the bead slide stays, because the slide
 * is the event. The golden bead lights at once, and the still frame is held for
 * a moment where the turn would be.
 *
 * The Abacus, mounted, not rebuilt
 * --------------------------------
 * The page builds an `AbacusStage` (`src/render3d/abacus3d.ts`), the renderer
 * the Abacus screen and the look-dev page use, on a canvas of its own, and
 * gives the context back when the close ends. Like the Abacus screen it is not
 * on `modalShell.ts`: it owns a measured stage, the canvas must be laid out
 * before the stage measures it, and it answers its own keys. It is news, not a
 * screen: the game raises it, and nothing on the HUD opens it.
 *
 * The two things the frame did not do before are the stage's own verbs
 * (`lightGolden`, `slideGolden`, `focusRod`, `turn`), and how they look is
 * `data/view3d.json`'s `abacus.close`. The beat lengths are here, because the
 * page schedules them.
 *
 * Words
 * -----
 * Every word is a reading. The winner's name is `seatName`. The sentence is the
 * standings' own line (`victoryHead`, with the verb "closed"), so the two pages
 * cannot disagree about who closed the work or where: the work's name comes off
 * its own row and the town off the stones. The tallies are the Abacus screen's
 * own count over the frame's size. No figure is written inside a sentence.
 */

import { orderFaceMarkUri } from '../art/orderFaceMarks';
import { AbacusStage, Clack, cssHex } from '../render3d/abacus3d';
import { seatName } from '../sim/leaderData';
import type { GameState } from '../sim/state';
import { type AbacusRow, frameBeads } from './abacusScreen';
import { frameGround } from './beadAwardFrame';
import { beadsTowardThreshold } from './beadsScreen';
import { endingPaintingUrl } from './endingPaintings';
import { shownAge } from './topBar';
import { element } from './dom';
import { prefersReducedMotion } from './motion';
import { headText, victoryHead } from './victoryScreen';
import './agePlate.css';
import './opusClose.css';

/**
 * The lengths the page schedules, in milliseconds. The ending page's own
 * arrival (the painting's fade, then the words) is in the stylesheet, because
 * nothing waits on it.
 */
export const OPUS_CLOSE_TIMING = {
  /**
   * The longest the ending page waits for its painting to load. After this it
   * fades in anyway, over its ground, and the painting shows when it arrives.
   */
  paintingWaitMs: 600,
  /**
   * When the Abacus stage is built, from the start of the ending page's
   * arrival. The stylesheet's arrival ends at 1700 ms, so the stage is built
   * while the page stands still and the moment a WebGL context costs is not
   * seen.
   */
  buildMs: 1900,
  /** Beat 1, the Abacus page opening. */
  pageMs: 400,
  /** Beat 2, the camera moving in and the golden bead lighting. */
  lightMs: 600,
  /**
   * Beat 3, the slide home. The frame's slide (`abacus.slide.seconds`) is a
   * little longer: the bead lands inside this beat, and its last short settle
   * runs into the start of the turn.
   */
  slideMs: 500,
  /** Beat 4, the turn there and back. */
  turnMs: 2000,
  /** How long the camera takes to move back out at the start of the turn. */
  outMs: 600,
  /** Reduced motion: how long the still frame holds where the turn would be. */
  stillMs: 900,
  /** How long the close takes to fade as it goes: to the standings, or to the board. */
  leaveMs: 260,
} as const;

/**
 * When each beat of the Abacus page starts, from the press on "See the Abacus".
 * The page starts to open at once.
 */
export function opusCloseSchedule(reduced: boolean): {
  light: number;
  slide: number;
  turn: number;
  finish: number;
} {
  const t = OPUS_CLOSE_TIMING;
  const light = t.pageMs;
  const slide = light + t.lightMs;
  const turn = slide + t.slideMs;
  return { light, slide, turn, finish: turn + (reduced ? t.stillMs : t.turnMs) };
}

/** Everything the close says and draws, as data. */
export interface OpusCloseReading {
  /** True when the seat reading the page closed the work: the win painting and the sun. */
  win: boolean;
  /** The painting's address (`endingPaintings.ts`). */
  painting: string;
  /** The winner's name, before "wins": "Al-Ma’mun". */
  winner: string;
  /** The sentence under the name: "You closed The Magnum Opus in Baghdad. The game is yours." */
  line: string;
  /** The rods, in roster order, as the Abacus screen strings them. */
  rows: readonly AbacusRow[];
  /** Which rod is the winner's, or -1 when the winner has none. */
  winnerRod: number;
  /** The world's age when the work was finished, as the top bar prints it: the plaque's numeral. */
  age: number;
}

/**
 * The close for a decided game, as the seat `localPlayerId` reads it. Pure, so
 * the suite can pin the words and the painting.
 */
export function opusCloseReading(
  state: GameState,
  rows: readonly AbacusRow[],
  localPlayerId: number,
): OpusCloseReading {
  const winnerId = state.winnerId ?? -1;
  const win = winnerId >= 0 && winnerId === localPlayerId;
  return {
    win,
    painting: endingPaintingUrl(win),
    winner: winnerId < 0 ? '' : seatName(state, winnerId),
    line: headText(victoryHead(state, localPlayerId, 'closed')),
    rows,
    winnerRod: rows.findIndex((row) => row.playerId === winnerId),
    age: shownAge(state).age,
  };
}

/** The ending page's fixed words. Plain, and no number in them (hard rule 7). */
export const OPUS_ENDING_WORDS = {
  closed: 'The Great Work is closed',
  wins: 'wins',
} as const;

/** The ending page's three doors. */
export type OpusEndingDoor = 'title' | 'board' | 'abacus';

/** The doors, left to right, as the spec places them. */
export const OPUS_ENDING_DOORS: readonly { readonly door: OpusEndingDoor; readonly label: string }[] = [
  { door: 'title', label: 'Back to the title' },
  { door: 'board', label: 'Look at the board' },
  { door: 'abacus', label: 'See the Abacus' },
];

/** The primary door: drawn in cinnabar, and the one Enter or Space takes. */
export const OPUS_ENDING_PRIMARY: OpusEndingDoor = 'abacus';

/** The door a key takes on the ending page, or `null` for a key that takes none. */
export function opusEndingDoorForKey(key: string): OpusEndingDoor | null {
  if (key === 'Enter' || key === ' ') return OPUS_ENDING_PRIMARY;
  if (key === 'Escape') return 'board';
  return null;
}

// --- the page ----------------------------------------------------------------

export interface OpusClose {
  readonly isOpen: boolean;
  /** Raises the close on its ending page. */
  play(reading: OpusCloseReading): void;
  /** Goes straight to the standings, as a key or a press on the Abacus page does. */
  skip(): void;
  /** Takes it down without opening anything: the title screen's and a load's sweep. */
  clear(): void;
  dispose(): void;
}

interface OpusCloseOptions {
  overlay: HTMLElement;
  /** Raised as the close goes up, so the open cards close under it. */
  onOpen?: () => void;
  /** The Abacus page is over, by its own clock or by a key: the standings rise. */
  onFinished: () => void;
  /** "Back to the title": the landing screen's own path, as the standings' door takes it. */
  toTitle: () => void;
}

/** One rod's two labels on the page, and its swatch's ink. */
interface RodLabels {
  name: HTMLElement;
  tally: HTMLElement;
}

/** Where the close is: on the ending page, on the Abacus page, fading out, or down. */
type OpusClosePhase = 'ending' | 'abacus' | 'leaving' | 'down';

/** The overlay's state classes, all taken off when the close comes down. */
const PHASE_CLASSES = ['is-ending', 'is-page', 'is-leaving'] as const;

export function createOpusClose(options: OpusCloseOptions): OpusClose {
  const { overlay } = options;
  const timers = new Set<number>();
  let reading: OpusCloseReading | null = null;
  let phase: OpusClosePhase = 'down';
  /** True once the ending page has started to fade in. */
  let arrived = false;
  let stage: AbacusStage | null = null;
  let labelLayer: HTMLElement | null = null;
  let labels: RodLabels[] = [];
  const clack = new Clack();

  function isOpen(): boolean {
    return !overlay.hidden;
  }

  function after(ms: number, run: () => void): void {
    const id = window.setTimeout(() => {
      timers.delete(id);
      run();
    }, ms);
    timers.add(id);
  }

  function clearTimers(): void {
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
  }

  // --- building ------------------------------------------------------------

  /**
   * The ending page: the painting over its ground, and the foot with the words
   * at the left and the three doors at the right. The spec's layout B.
   */
  function endingPage(read: OpusCloseReading): HTMLElement {
    const page = element('section', `opus-beat opus-ending ${read.win ? 'is-win' : 'is-loss'}`);
    const painting = element('img', 'opus-ending-painting');
    // The words say what the painting shows, so the picture itself is not read out.
    painting.alt = '';
    painting.decoding = 'async';
    // No painting: the page shows its ground (lapis or the dark cloth) behind the same words.
    painting.addEventListener('error', () => page.classList.add('is-unpainted'), { once: true });
    painting.src = read.painting;

    const words = element('div', 'opus-ending-words');
    const mark = element('i', 'opus-ending-mark');
    mark.setAttribute('aria-hidden', 'true');
    // The wonder plate's sun and moon: the card corners' marks, handed to the
    // stylesheet as a mask under the plate's names, so they take the gilt.
    if (read.win) mark.style.setProperty('--wp-sun', `url("${orderFaceMarkUri('sun')}")`);
    else mark.style.setProperty('--wp-moon', `url("${orderFaceMarkUri('moon')}")`);
    const name = element('h2', 'opus-ending-name', `${read.winner} `);
    name.append(element('i', 'opus-ending-wins', OPUS_ENDING_WORDS.wins));
    words.append(
      mark,
      element('p', 'opus-ending-closed', OPUS_ENDING_WORDS.closed),
      name,
      element('p', 'opus-ending-line', read.line),
    );

    // The Quiet Table kit's two buttons on a dark ground: the plates' gilt
    // outline (`.age-plate-continue`) and the cinnabar primary (`.btn-primary`).
    const doors = element('div', 'opus-ending-doors');
    for (const { door, label } of OPUS_ENDING_DOORS) {
      const kit = door === OPUS_ENDING_PRIMARY ? 'btn btn-primary' : 'age-plate-continue';
      const button = element('button', `${kit} opus-ending-door`, label);
      button.type = 'button';
      button.dataset.door = door;
      button.addEventListener('click', () => takeDoor(door));
      doors.append(button);
    }

    const foot = element('div', 'opus-ending-foot');
    foot.append(words, doors);
    page.append(painting, foot);
    return page;
  }

  function build(read: OpusCloseReading): void {
    const page = element('section', 'opus-beat opus-page');
    // The ground the frame stands on, as the bead page has it, so the canvas
    // has no edge against the page before its first frame.
    page.style.background = frameGround();
    const title = element('h2', 'opus-page-title', 'The Abacus');
    const hint = element('p', 'opus-page-hint', 'Esc closes');
    const stageBox = element('div', 'opus-stage');
    page.append(stageBox, title, hint);

    overlay.replaceChildren(endingPage(read), page);
  }

  /** The stage, on the page's own canvas. Built behind the ending page while it stands still. */
  function buildStage(read: OpusCloseReading): void {
    const box = overlay.querySelector<HTMLElement>('.opus-stage');
    if (!box || stage) return;
    // A fresh canvas for each close: a canvas hands out one WebGL context, and
    // the last close's stage took its context with it.
    const canvas = element('canvas', 'opus-canvas');
    labelLayer = element('div', 'opus-labels');
    labelLayer.setAttribute('aria-hidden', 'true');
    box.replaceChildren(canvas, labelLayer);
    stage = new AbacusStage(
      canvas,
      read.rows.map((row) => ({ name: row.name, color: row.color })),
      { age: read.age },
    );
    // Nothing is drawn until the page opens: a loop running under the painting
    // would be frames nobody sees.
    stage.setRunning(false);
    stage.setSway(!prefersReducedMotion());
    const perRod = stage.beadsPerRod;
    read.rows.forEach((row, index) => stage?.seed(index, frameBeads(row.beads, perRod)));
    stage.onStrike = () => clack.play();
    stage.onFrame = layoutLabels;
    buildLabels(read, perRod);
  }

  function buildLabels(read: OpusCloseReading, perRod: number): void {
    const layer = labelLayer;
    if (!layer) return;
    layer.replaceChildren();
    labels = read.rows.map((row, index) => {
      const name = element('div', 'opus-label is-name');
      if (index === read.winnerRod) name.classList.add('is-winner');
      name.append(element('span', 'opus-label-name', row.name));
      const swatch = element('span', 'opus-swatch');
      swatch.style.background = cssHex(row.color);
      name.append(swatch);
      const tally = element('div', 'opus-label is-tally');
      if (index === read.winnerRod) tally.classList.add('is-winner');
      // The Abacus screen's count, which leaves the golden bead out.
      tally.append(
        element('span', 'opus-count', String(beadsTowardThreshold(row.beads))),
        element('span', 'opus-total', ` / ${perRod}`),
      );
      layer.append(name, tally);
      return { name, tally };
    });
  }

  /**
   * Places the labels every frame, off points projected from the frame itself.
   * As the camera moves in, the winner's two labels move inside the frame,
   * above its rod (where the board draws them once the margins have left the
   * view), and the other rods' labels fade. While the frame is turned, all of
   * them fade.
   */
  function layoutLabels(): void {
    const current = stage;
    const read = reading;
    if (!current || !read) return;
    const focus = current.focusAmount;
    // Gone by a third of the way into the turn, back as the frame comes to rest.
    const turned = Math.max(0, 1 - current.turnAmount * 3);
    labels.forEach((entry, index) => {
      const place = current.labelPlacement(index);
      let left = place.left;
      let right = place.right;
      let opacity = place.opacity * turned;
      if (index === read.winnerRod) {
        const inside = current.insideLabelPlacement(index);
        left = { x: left.x + (inside.left.x - left.x) * focus, y: left.y + (inside.left.y - left.y) * focus };
        right = { x: right.x + (inside.right.x - right.x) * focus, y: right.y + (inside.right.y - right.y) * focus };
      } else {
        // Out of the way early, and back only once the camera is nearly home:
        // projected from a camera still moved in, they would stand off the edge.
        opacity *= Math.max(0, 1 - focus * 2.5);
      }
      for (const [node, at] of [
        [entry.name, left],
        [entry.tally, right],
      ] as const) {
        node.style.left = `${at.x}px`;
        node.style.top = `${at.y}px`;
        node.style.opacity = `${opacity}`;
        node.style.setProperty('--inside', index === read.winnerRod ? `${focus}` : '0');
      }
    });
  }

  // --- the ending page -----------------------------------------------------

  function play(read: OpusCloseReading): void {
    clear();
    reading = read;
    phase = 'ending';
    options.onOpen?.();
    build(read);
    overlay.hidden = false;
    // The keyboard starts on the primary door. Focus also makes the browser
    // style the page at its transparent start, so the arrival fades rather
    // than cuts.
    const primary = overlay.querySelector<HTMLElement>(`[data-door="${OPUS_ENDING_PRIMARY}"]`);
    (primary ?? overlay).focus({ preventScroll: true });
    // The knock is the stage's own voice. The page has had a press by now
    // (End Turn, or the order that finished the work), so the audio device
    // may start.
    clack.arm();
    // The page fades in when its painting has loaded, so the painting itself
    // fades in rather than appearing over its ground. A slow or missing file
    // waits no longer than `paintingWaitMs`.
    const painting = overlay.querySelector<HTMLImageElement>('.opus-ending-painting');
    const arrive = (): void => raise(read);
    painting?.addEventListener('load', arrive, { once: true });
    painting?.addEventListener('error', arrive, { once: true });
    after(OPUS_CLOSE_TIMING.paintingWaitMs, arrive);
  }

  /** The ending page's arrival: the stylesheet fades the painting in, then the words and doors. */
  function raise(read: OpusCloseReading): void {
    if (reading !== read || phase !== 'ending' || arrived) return;
    arrived = true;
    overlay.classList.add('is-ending');
    after(OPUS_CLOSE_TIMING.buildMs, () => {
      if (reading === read && phase === 'ending') buildStage(read);
    });
  }

  /** Where each door leads. A door counts only while the ending page is up. */
  function takeDoor(door: OpusEndingDoor): void {
    if (!isOpen() || phase !== 'ending') return;
    switch (door) {
      case 'abacus':
        openAbacus();
        break;
      case 'board':
        // The close comes down and the game goes on, as after "Continue playing".
        leave(null);
        break;
      case 'title':
        // The standings' own door: this page comes down first, so the title
        // card is not raised over a page still standing.
        clear();
        options.toTitle();
        break;
    }
  }

  /** The door the keyboard is on, or `null` when it is on none of the three. */
  function focusedDoor(): OpusEndingDoor | null {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !overlay.contains(active)) return null;
    return OPUS_ENDING_DOORS.find((entry) => entry.door === active.dataset.door)?.door ?? null;
  }

  /** Tab and Shift+Tab go round the three doors and do not leave the page. */
  function moveAmongDoors(step: number): void {
    const doors = Array.from(overlay.querySelectorAll<HTMLElement>('.opus-ending-door'));
    if (doors.length === 0) return;
    const at = doors.findIndex((door) => door === document.activeElement);
    const next = at < 0 ? doors.length - 1 : (at + step + doors.length) % doors.length;
    doors[next]?.focus({ preventScroll: true });
  }

  // --- the Abacus page -----------------------------------------------------

  function openAbacus(): void {
    const read = reading;
    if (!read || phase !== 'ending') return;
    phase = 'abacus';
    clearTimers();
    const reduced = prefersReducedMotion();
    const at = opusCloseSchedule(reduced);
    const t = OPUS_CLOSE_TIMING;
    // Built behind the painting while it waited, or here if the press came first.
    buildStage(read);
    overlay.classList.add('is-page');
    stage?.setRunning(true);
    stage?.resize();
    layoutLabels();
    // The doors are under the Abacus page now; the keyboard leaves them.
    overlay.focus({ preventScroll: true });

    // Each beat waits from the moment the one before it started, so a slow
    // moment lengthens the beat it falls in and never cuts the next one short.
    const steps: readonly (readonly [number, () => void])[] = [
      [
        at.light,
        () => {
          if (!stage || read.winnerRod < 0) return;
          if (!reduced) stage.focusRod(read.winnerRod, 1, t.lightMs / 1000);
          stage.lightGolden(read.winnerRod, reduced ? 0 : t.lightMs / 1000);
        },
      ],
      [at.slide - at.light, () => stage?.slideGolden()],
      [
        at.turn - at.slide,
        () => {
          if (!stage || reduced) return;
          if (read.winnerRod >= 0) stage.focusRod(read.winnerRod, 0, t.outMs / 1000);
          stage.turn(t.turnMs / 1000);
        },
      ],
      [at.finish - at.turn, finish],
    ];
    const run = (index: number): void => {
      const step = steps[index];
      if (step === undefined) return;
      after(step[0], () => {
        step[1]();
        run(index + 1);
      });
    };
    run(0);
  }

  // --- leaving -------------------------------------------------------------

  /** Takes the stage down and gives its WebGL context back. */
  function dropStage(): void {
    stage?.dispose();
    stage = null;
    labelLayer = null;
    labels = [];
  }

  /**
   * The close fades and comes down. `then` runs first, so what comes next (the
   * standings) is already rising under the page as it fades.
   */
  function leave(then: (() => void) | null): void {
    if (!isOpen() || phase === 'leaving' || phase === 'down') return;
    phase = 'leaving';
    clearTimers();
    then?.();
    overlay.classList.add('is-leaving');
    after(prefersReducedMotion() ? 0 : OPUS_CLOSE_TIMING.leaveMs, clear);
  }

  /** The standings rise, and the page fades off them. */
  function finish(): void {
    leave(options.onFinished);
  }

  function clear(): void {
    clearTimers();
    overlay.hidden = true;
    overlay.classList.remove(...PHASE_CLASSES);
    overlay.replaceChildren();
    dropStage();
    reading = null;
    phase = 'down';
    arrived = false;
  }

  /**
   * The keys. On the ending page: Enter or Space takes the primary door (or
   * the door the keyboard is on), Escape looks at the board, and Tab moves
   * among the doors. On the Abacus page any key, Escape included, goes
   * straight to the standings. No key reaches the board under the close.
   */
  function onKeyDown(event: KeyboardEvent): void {
    if (!isOpen() || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    if (phase === 'ending') {
      if (event.key === 'Tab') {
        moveAmongDoors(event.shiftKey ? -1 : 1);
        return;
      }
      const door = opusEndingDoorForKey(event.key);
      if (door === null) return;
      takeDoor(door === OPUS_ENDING_PRIMARY ? (focusedDoor() ?? door) : door);
      return;
    }
    finish();
  }

  /** A press on the Abacus page goes straight to the standings. The ending page waits for a door. */
  function onPress(event: PointerEvent): void {
    if (!isOpen() || phase !== 'abacus') return;
    event.preventDefault();
    finish();
  }

  function onResize(): void {
    if (!stage || !isOpen()) return;
    stage.resize();
    layoutLabels();
  }

  window.addEventListener('keydown', onKeyDown, true);
  overlay.addEventListener('pointerdown', onPress);
  window.addEventListener('resize', onResize);

  return {
    get isOpen(): boolean {
      return isOpen();
    },
    play,
    skip: finish,
    clear,
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown, true);
      overlay.removeEventListener('pointerdown', onPress);
      window.removeEventListener('resize', onResize);
      clear();
    },
  };
}
