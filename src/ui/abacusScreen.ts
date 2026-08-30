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
 * else was up. The two screens are deliberately opposite in tone: the chart is
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
  /** Opens the Bead Race's table. A rod is the door to the cards behind it. */
  onOpenBeads?: () => void;
}

/** Two DOM labels per rod: the name at the earned end, the tally at the waiting end. */
interface RodLabels {
  name: HTMLElement;
  tally: HTMLElement;
  count: HTMLElement;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
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

    const caption = document.createElement('p');
    caption.className = 'abacus-caption';
    caption.textContent = `${figure(threshold)} beads win the game — the last is golden`;
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
        open.textContent = 'The table';
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
    // Not applied here: a rebuild is only ever worth paying for on the way in,
    // and a screen nobody has opened has no rods to re-string.
    refresh: () => {
      builtFor = null;
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
