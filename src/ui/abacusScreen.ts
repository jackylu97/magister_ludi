/**
 * The Abacus: the score, as a counting frame standing on the table.
 *
 * A full-screen overlay opened from the bar or `A`, built on the same stage the
 * look-dev page is judged on (`src/render3d/abacus3d.ts`). One rod per seat at
 * the current table, thirteen beads on each, and the player's name and tally
 * hung off the ends of their own rod.
 *
 * It follows the star chart's shape exactly — `hidden` is the whole of the
 * screen state, Escape closes it and hands the keyboard back, the × and a click
 * on the ground around the sheet do the same, and opening it closes whatever
 * else was up.
 *
 * **Not on `modalShell.ts`, and it is the chart's reasons.** This screen and the
 * chart are the two full-screen overlays batch H5 deliberately left off the
 * parchment sheets' shared frame: both own a *measured stage* rather than a
 * document, so the opening is a sequence with the sizing in the middle of it
 * (a canvas measures zero while `display: none`) rather than a paint at the end;
 * both put the keyboard back where they found it rather than on a bar control;
 * and both claim Escape on the **overlay** instead of the window precisely so
 * the same handler can swallow the hotkey — `A` reaches `controls.ts` through a
 * window listener, and a screen that closed on `A` without stopping the press
 * would be reopened by it on the way out.
 * The two screens are deliberately opposite in tone: the chart is
 * the table at night, this is the table in daylight, vellum ground and a real
 * object sitting on it.
 *
 * The object, and the register under it
 * -------------------------------------
 * Two readings of one fact, and they are not redundant. The **frame** is the
 * score as a thing on a table — glass beads in the four families' colours, slid
 * left as they are earned, and it is what makes a lead legible across the room.
 * The **register** beneath it is the same rods in DOM, and it carries the three
 * things a WebGL object cannot: it is as long as the *threshold* rather than as
 * long as the frame was cut for, every bead answers a pointer with the card it
 * came off, and the **golden slot** sits at the far end of every rod, drawn
 * empty with a gilt rim all game as the standing question (Entry VI.3's climax
 * amendment: only the Magnum Opus mints that bead).
 *
 * `AbacusRow.beads` is `Player.beads` itself — the earned record, in the order
 * it was earned — and the rods read it and nothing else. The 3D stage wants a
 * scoring-family id per bead (`data/view3d.json`'s four), so the one translation
 * between the simulation's family names and the look file's lives here, in
 * `STAGE_FAMILY`, and nowhere else.
 *
 * **A third of the sheet, not the sheet** (the user, 2026-09-09: *"the abacus is
 * a bit too large compared to the other wagers"*). The counting frame is the
 * object; the wager band under it is what the age is actually *asking*, and it
 * had been given whatever the frame left over. The cap is one rule in
 * `src/style.css` (`.abacus-stage`, a third of the window) rather than a
 * measurement taken here, and that is load-bearing rather than tidy: the stage
 * sizes itself off its host box on the first open, so the cap has to be in place
 * **before** the measure — a stylesheet rule always is, and a height written from
 * script after `ensureStage` would have sized the canvas twice. The floating
 * labels project into the same capped box, so they follow it without being told.
 *
 * Lifecycle
 * ---------
 * The stage is built on the *first open*, never at boot: five thousand
 * triangles and a WebGL context are not something a player who never presses `A`
 * should pay for. While the screen is closed its animation loop is stopped
 * outright rather than throttled, so a closed Abacus costs exactly nothing. A
 * new game re-strings the rods in place (the roster can change size and names);
 * a trip back to the landing disposes the stage and takes its canvas out of the
 * document, so the context goes with the game it belonged to.
 */

import {
  AbacusStage,
  type AbacusPlayer,
  type FamilyId,
  cssHex,
} from '../render3d/abacus3d';
import { BEAD_RULES } from '../sim/beadData';
import type { BeadFamily } from '../sim/beadData';
import type { EarnedBead } from '../sim/state';
import { BEAD_FAMILY_MARK, abacusRodSlots, beadHoverText } from './beadsScreen';
import { figure } from './figures';
import { element } from './dom';
import { type WagerBoard, wagerFigure, wagerTrackFraction } from './wagerSheet';
import type { CensusPage } from './censusSheet';

/**
 * The simulation's four bead families, in the look file's four scoring-family
 * ids — **the one translation between the two vocabularies**.
 *
 * They are the same four things named twice: `data/view3d.json` was written
 * before the rules were and calls them conquest, culture, philosophy and
 * commerce; `data/beads.json` calls them domination, culture, science and
 * economic. Rather than rename a look file (and every colour keyed off it) or
 * bend the rules' words, the map lives here, at the one seam that needs both.
 */
const STAGE_FAMILY: Record<BeadFamily, FamilyId> = {
  domination: 'conquest',
  culture: 'culture',
  science: 'philosophy',
  economic: 'commerce',
};

/**
 * One player's rod.
 *
 * `beads` is `Player.beads` — every bead this empire has clacked, in the order
 * it was earned. The rods read it and nothing else.
 */
export interface AbacusRow {
  playerId: number;
  name: string;
  /** The player's diorama ink, for the label swatch. Never painted on a bead. */
  color: number;
  beads: readonly EarnedBead[];
}

export interface AbacusScreen {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  /** The table changed. Re-strings the rods the next time the screen is opened. */
  refresh(): void;
  /** Gives the WebGL context back. The landing flow, and nothing else. */
  dispose(): void;
}

export interface AbacusScreenOptions {
  /** The full-screen overlay. Hidden with the `hidden` attribute while closed. */
  overlay: HTMLElement;
  /** The element the canvas and the floating labels are built into. */
  stage: HTMLElement;
  /** The overlay's own × button. */
  closeButton: HTMLElement;
  /** The top bar's button, which opens this and reflects whether it is open. */
  trigger: HTMLElement;
  /** The current table, local seat first is not required — rod order is roster order. */
  rows: () => readonly AbacusRow[];
  /**
   * The element under the stage that the DOM rods are written into.
   *
   * Separate from `stage` because the two are different in kind: the stage holds
   * a WebGL canvas built once and left alone, and this is rewritten on every
   * open off the live roster.
   */
  register: HTMLElement;
  /** Called as this opens, so whatever else was up can get out of the way. */
  onOpen?: () => void;
  /** Opens the Bead Race's ledger. A rod is the door to the rows behind it. */
  onOpenBeads?: () => void;
  /**
   * **The age's three bars, with every seat's standing against each** — the
   * wager band this screen grew in batch G2 (`docs/wager.md` §11; the mock of
   * 2026-09-09 is the spec).
   *
   * A closure rather than a state handle, for `rows`' reason exactly: this
   * screen knows about names, figures and inks and has never known about the
   * simulation, and the reading it wants (`wagerBoards`) is a pure fold
   * somebody else already publishes.
   *
   * Answering an empty list is a world with no wager on the table — the whole of
   * Æra I — and the band simply is not drawn.
   */
  wagers?: () => readonly WagerBoard[];
  /**
   * **The last census, still readable** — the band this screen grew in batch C1
   * (`docs/wager.md` §10: *"the last census stays readable on the Abacus… so a
   * player who dismissed it can look again"*).
   *
   * A closure over the same fold the sheet itself draws (`censusPage`), for
   * `wagers`' reason exactly: this screen knows about names, figures and inks
   * and has never known about the simulation. It is **the record**, not a fresh
   * reading — the ranking as the clerks found it, which is the whole point of
   * storing one.
   *
   * Answering `null` is a world nobody has counted yet, and the band is simply
   * not drawn.
   */
  census?: () => CensusPage | null;
}

/** Two DOM labels per rod: the name at the earned end, the tally at the waiting end. */
interface RodLabels {
  name: HTMLElement;
  tally: HTMLElement;
  count: HTMLElement;
}

/** What the rods are cut from, so a change of table can be recognised. */
function rosterKey(rows: readonly AbacusRow[]): string {
  return rows.map((row) => `${row.playerId}:${row.name}:${row.color}`).join('|');
}

export function createAbacusScreen(options: AbacusScreenOptions): AbacusScreen {
  const { overlay, stage: host, register, closeButton, trigger, rows, onOpen, onOpenBeads } =
    options;

  let open = false;
  let restoreTo: HTMLElement | null = null;

  let canvas: HTMLCanvasElement | null = null;
  let abacus: AbacusStage | null = null;
  let labelLayer: HTMLElement | null = null;
  let labels: RodLabels[] = [];
  /** The roster the rods were cut for, or null when there are no rods. */
  let builtFor: string | null = null;

  /**
   * Reduced motion stops the idle sway outright rather than slowing it.
   *
   * The object is entirely readable still — it is framed at the angle it is
   * meant to be judged from. The bead slide would stay for the same reason it
   * does on the look-dev page (it answers something the player did), but nothing
   * on this screen slides yet.
   */
  function swayWanted(): boolean {
    return !(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }

  // --- the labels ----------------------------------------------------------

  /**
   * The name and the tally, in DOM rather than in the scene.
   *
   * The Armory's reasons: crisp at any device pixel ratio, selectable, and
   * typeset in the interface's own faces. The name is Fraunces because that is
   * the face this product names things in; the tally is mono and tabular because
   * it is a count, and a count that reflows as it climbs is a count nobody
   * trusts. Both are placed every frame from a point projected off the frame
   * itself, so they sway with the object instead of floating in front of it.
   */
  function buildLabels(table: readonly AbacusRow[], perRod: number): void {
    const layer = labelLayer;
    if (!layer) return;
    layer.replaceChildren();
    labels = table.map((row) => {
      const name = element('div', 'abacus-label is-name');
      const swatch = element('span', 'abacus-swatch');
      swatch.style.background = cssHex(row.color);
      name.append(swatch, element('span', undefined, row.name));

      const tally = element('div', 'abacus-label is-tally');
      const count = element('span', 'abacus-count', String(row.beads.length));
      const total = element('span', 'abacus-total', ` / ${perRod}`);
      tally.append(count, total);

      layer.append(name, tally);
      return { name, tally, count };
    });
  }

  function layoutLabels(): void {
    if (!abacus) return;
    labels.forEach((entry, index) => {
      const place = abacus!.labelPlacement(index);
      entry.name.style.left = `${place.left.x}px`;
      entry.name.style.top = `${place.left.y}px`;
      entry.tally.style.left = `${place.right.x}px`;
      entry.tally.style.top = `${place.right.y}px`;
      entry.name.style.opacity = `${place.opacity}`;
      entry.tally.style.opacity = `${place.opacity}`;
    });
  }

  // --- the stage -----------------------------------------------------------

  /** The roster as the stage wants it: a name and an ink per rod. */
  function seats(table: readonly AbacusRow[]): AbacusPlayer[] {
    return table.map((row) => ({ name: row.name, color: row.color }));
  }

  /**
   * Slides each rod straight to the state it is in. No animation: this is a load.
   *
   * The frame is cut for a fixed number of beads (`beadsPerRod`), which is a
   * fact about the *object* and not about the rules — so a run longer than the
   * frame is truncated here rather than overflowing it. The register below is
   * the reading that is as long as the threshold.
   */
  function seedRods(table: readonly AbacusRow[]): void {
    const perRod = abacus?.beadsPerRod ?? 0;
    table.forEach((row, index) =>
      abacus?.seed(
        index,
        row.beads.slice(0, perRod).map((earned) => STAGE_FAMILY[earned.family]),
      ),
    );
  }

  // --- the register --------------------------------------------------------

  /**
   * **The three bars of the age, and every seat's standing against each** — the
   * wager band (`docs/wager.md` §3b's ruling of 2026-09-09: *progress is public,
   * the pick is private*).
   *
   * One column per dealt card. Under each, every real seat ranked highest first,
   * with a track scaled to the bar, the figure it has reached, and a **mark on
   * the row of any seat that has cleared it** — a wager is a bar rather than a
   * race, so any number of rows may wear it and **no line names a first
   * claimant** (§11).
   *
   * The **stake is marked on the local seat's own card and nowhere else**, which
   * is the secrecy rule kept by construction rather than by discipline: a
   * rival's stake is not in `WagerBoard` at all, so this drawing could not leak
   * one if it tried.
   *
   * There is no countdown here and no line about how an age turns over: the
   * clock's mechanics are not shown to the player, and the age card on the top
   * bar is the one place the deadline is written (§11's mark on the mock).
   */
  function drawWagerBand(): HTMLElement | null {
    const boards = options.wagers?.() ?? [];
    if (boards.length === 0) return null;
    const band = element('section', 'abacus-wagers');
    band.append(element('p', 'eyebrow', 'the age asks'));
    const grid = element('div', 'abacus-wager-grid');
    for (const board of boards) {
      const column = element('article', 'abacus-wager');
      const mark = BEAD_FAMILY_MARK[board.face.family];
      column.style.setProperty('--wager-ink', `var(${mark.ink})`);
      if (board.face.staked) column.classList.add('is-staked');
      column.append(element('p', 'eyebrow abacus-wager-eyebrow', board.face.eyebrow));
      const name = element('h4', 'abacus-wager-name');
      name.append(element('span', undefined, board.face.name));
      // The one thing on this band that is about *you*: your own chair at the
      // table, on your own card. Nothing marks anybody else's.
      if (board.face.staked) name.append(element('span', 'abacus-wager-stake', 'your stake'));
      column.append(name);
      column.append(element('p', 'abacus-wager-note', board.face.note));

      const bar = element('p', 'abacus-wager-bar');
      bar.append(element('span', 'abacus-wager-figure', figure(board.face.bar)));
      bar.append(element('span', 'abacus-wager-label', board.face.clauses ?? 'the bar'));
      column.append(bar);

      const list = element('ul', 'abacus-wager-rows');
      for (const row of board.rows) {
        const line = element('li', 'abacus-wager-row');
        if (row.met) line.classList.add('is-met');
        line.append(element('span', 'abacus-wager-seat', row.name));
        const track = element('span', 'abacus-wager-track');
        const fill = element('span', 'abacus-wager-fill');
        fill.style.width = `${Math.round(wagerTrackFraction(row.at, board.face.bar) * 100)}%`;
        track.append(fill);
        line.append(track);
        line.append(
          element('span', 'abacus-wager-at', wagerFigure(row.at, board.face.bar)),
        );
        // A kept bar wears its mark on the seat's own row, which is the whole of
        // what "who has met it" means when everybody may.
        line.append(element('span', 'abacus-wager-mark', row.met ? '✓' : ''));
        list.append(line);
      }
      column.append(list);
      grid.append(column);
    }
    band.append(grid);
    return band;
  }

  /**
   * **The last census, kept where it can be read again** (batch C1,
   * `docs/wager.md` §10).
   *
   * The sheet is raised once and dismissed; this is the copy that stays. It is
   * the record's own ranking rather than a fresh reading of the board, which is
   * what makes it a *census* and not a leaderboard: the figures are the ones the
   * clerks wrote down, on the turn they wrote them.
   *
   * The **Triumph mark** rides the leader's row rather than a block of its own —
   * the sheet is where the Triumph is announced, and this is a memory of the
   * page, so it names what happened in one mark and does not re-award anything.
   */
  function drawCensusBand(): HTMLElement | null {
    const page = options.census?.() ?? null;
    if (!page) return null;
    const band = element('section', 'abacus-census');
    band.append(element('p', 'eyebrow', 'the last census'));

    const head = element('p', 'abacus-census-head');
    head.append(element('span', 'abacus-census-taker', page.takerLine));
    head.append(
      element(
        'span',
        'abacus-census-stat',
        `${page.statGlyph} ${page.statWord}${page.statRate}`.trim(),
      ),
    );
    band.append(head);

    const list = element('ol', 'abacus-census-rows');
    for (const row of page.rows) {
      const line = element('li', 'abacus-census-row');
      if (row.you) line.classList.add('is-you');
      line.style.setProperty('--census-ink', row.color);
      line.append(element('span', 'abacus-census-rank', row.rank));
      const seat = element('span', 'abacus-census-seat');
      const swatch = element('span', 'abacus-swatch');
      swatch.style.background = row.color;
      seat.append(swatch, element('span', undefined, row.name));
      line.append(seat);
      const track = element('span', 'abacus-census-track');
      const fill = element('span', 'abacus-census-fill');
      fill.style.width = `${Math.round(row.fraction * 100)}%`;
      track.append(fill);
      line.append(track);
      line.append(element('span', 'abacus-census-at', row.figure));
      // The Triumph, as a mark on the row that took it. One laurel, no figure:
      // what it paid was said on the sheet, and this is the memory of a page.
      line.append(element('span', 'abacus-census-mark', row.leader ? '❧' : ''));
      list.append(line);
    }
    band.append(list);
    return band;
  }

  /**
   * The rods in DOM: one row per seat, `threshold` slots long, the golden one
   * last.
   *
   * `abacusRodSlots` is the arithmetic and it is pure and pinned by a test —
   * "which slot, and is it the gilt one" is exactly the half of a drawing no
   * screenshot catches. Everything here is `append` calls over its answer.
   */
  function drawRegister(table: readonly AbacusRow[]): void {
    register.replaceChildren();
    const threshold = BEAD_RULES.threshold;

    // **The wager band, above the rods** (batch G2). The order on the sheet is
    // the order of the question: what the age is asking, then where everybody
    // stands on it, then the score it all adds up to. The bead rods stay exactly
    // as they were beneath it — this screen gained a band, it did not become a
    // different screen.
    const band = drawWagerBand();
    if (band) register.append(band);

    // **The last census, under the age's bars and above the rods** (batch C1).
    // The order on the sheet is the order of the questions: what the age is
    // asking, then how the world was last measured, then the score it all adds
    // up to.
    const census = drawCensusBand();
    if (census) register.append(census);

    const caption = document.createElement('p');
    caption.className = 'abacus-caption';
    caption.textContent = `${figure(threshold)} beads open the Magnum Opus — the last is golden`;
    register.append(caption);

    for (const row of table) {
      const rod = element('div', 'abacus-rod');
      const name = element('span', 'abacus-rod-name');
      const swatch = element('span', 'abacus-swatch');
      swatch.style.background = cssHex(row.color);
      name.append(swatch, element('span', undefined, row.name));
      rod.append(name);

      const wire = element('div', 'abacus-rod-wire');
      abacusRodSlots(row.beads, threshold).forEach((slot, index) => {
        if (slot.kind === 'golden') {
          const golden = element('span', 'bead-slot is-golden');
          golden.title = 'The golden bead — only the Magnum Opus mints it';
          wire.append(golden);
          return;
        }
        if (slot.kind === 'empty') {
          wire.append(element('span', 'bead-slot is-empty'));
          return;
        }
        const earned = row.beads[index]!;
        const chip = element('span', 'bead-chip');
        chip.style.setProperty('--bead-ink', `var(${BEAD_FAMILY_MARK[earned.family].ink})`);
        chip.title = beadHoverText(earned);
        wire.append(chip);
      });
      rod.append(wire);
      rod.append(element('span', 'abacus-rod-tally', figure(row.beads.length)));

      if (onOpenBeads) {
        const open = document.createElement('button');
        open.type = 'button';
        open.className = 'abacus-rod-open';
        open.textContent = 'The ledger';
        open.setAttribute('aria-label', `Open the Bead Race — ${row.name}`);
        open.addEventListener('click', () => onOpenBeads());
        rod.append(open);
      }
      register.append(rod);
    }
  }

  /**
   * Builds the stage if it is not there, and re-strings it if the table changed.
   *
   * Called from `open` and from nowhere else, which is what makes "lazy" true
   * rather than aspirational.
   */
  function ensureStage(): void {
    const table = rows();
    const key = rosterKey(table);

    if (!abacus) {
      // A fresh canvas each time rather than a reused one: a canvas only ever
      // hands out the one WebGL context, so a disposed stage's element has to
      // leave with it or the next stage would be handed a dead context.
      canvas = document.createElement('canvas');
      canvas.className = 'abacus-canvas';
      labelLayer = element('div', 'abacus-labels');
      labelLayer.setAttribute('aria-hidden', 'true');
      host.replaceChildren(canvas, labelLayer);

      abacus = new AbacusStage(canvas, seats(table));
      abacus.setSway(swayWanted());
      abacus.onFrame = layoutLabels;
      builtFor = key;
      buildLabels(table, abacus.beadsPerRod);
      seedRods(table);
      return;
    }

    if (key !== builtFor) {
      abacus.setPlayers(seats(table));
      builtFor = key;
      buildLabels(table, abacus.beadsPerRod);
    }
    seedRods(table);
  }

  // --- opening and closing -------------------------------------------------

  function setOpen(next: boolean): void {
    if (open === next) return;
    open = next;
    overlay.hidden = !next;
    trigger.setAttribute('aria-expanded', String(next));

    if (!next) {
      // The loop stops before anything else, so a closed screen is not drawing
      // a frame into a hidden element on the way out.
      abacus?.setRunning(false);
      restoreTo?.focus();
      restoreTo = null;
      return;
    }

    onOpen?.();
    const active = document.activeElement as HTMLElement | null;
    restoreTo = active && active !== document.body ? active : trigger;
    // After `hidden` is cleared, never before: the stage measures the element it
    // is being built into, and an element with `display: none` measures zero.
    ensureStage();
    drawRegister(rows());
    abacus?.setRunning(true);
    abacus?.resize();
    layoutLabels();
    // There is nothing on this screen to press but the way out, so that is what
    // holds the keyboard — and it is what Escape would do anyway.
    closeButton.focus({ preventScroll: true });
  }

  closeButton.addEventListener('click', () => setOpen(false));
  trigger.addEventListener('click', () => setOpen(!open));

  // Escape belongs to whatever is in front, and while this is up that is this.
  // `main.ts` reports the overlay as blocking, so `controls.ts` never sees the
  // key — two listeners racing for one Escape is how a key starts doing two
  // things at once.
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.tagName === 'INPUT' || target?.isContentEditable) return;
    if (event.key === 'a' || event.key === 'A') {
      // Like the Escape branch: stop here, or the window listener in
      // controls.ts sees the same press with the overlay now closed and
      // immediately reopens the screen it just shut.
      event.stopPropagation();
      setOpen(false);
    }
  });

  // Clicking the ground around the sheet closes it, like the popovers do.
  overlay.addEventListener('pointerdown', (event) => {
    if (event.target === overlay) setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (!open || !abacus) return;
    abacus.resize();
    layoutLabels();
  });

  return {
    get isOpen() {
      return open;
    },
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
    // **Two halves, and only one of them is lazy.** The 3D frame is marked
    // stale and re-strung on the way in — a rebuild is only ever worth paying
    // for then, and a screen nobody has opened has no rods to re-string. The
    // register underneath is *repainted now* when the screen is up, which is how
    // the sheet flips on a wager kept: a claim is announced the turn its bar is
    // first met (`docs/wager.md` §3b), and a standings board that waited for the
    // next open would be showing the age before the one it is in.
    refresh: () => {
      builtFor = null;
      if (open) drawRegister(rows());
    },
    dispose: () => {
      setOpen(false);
      abacus?.dispose();
      abacus = null;
      canvas = null;
      labelLayer = null;
      labels = [];
      builtFor = null;
      host.replaceChildren();
    },
  };
}
