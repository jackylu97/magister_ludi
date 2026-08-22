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
 * Honest state
 * ------------
 * There is no bead system yet. Scoring lands at M11 (Entry VI, the Bead Race),
 * and until it does **every bead on this screen is unearned** — the object shows
 * a full waiting stack on every rod and says so, once, in the register:
 *
 *     Beads are earned as the Æras close. The first reckoning awaits.
 *
 * That is the whole of the copy, and there are no demo controls: a button that
 * slid a bead over would be the interface lying about the simulation. The
 * look-dev page keeps those, because faking things is what a bench is for.
 *
 * The roster is handed in as `AbacusRow[]`, `beads` included and empty. When M11
 * has real scores it fills that field and nothing else on this screen changes
 * shape — which is the only reason to carry a field nothing writes yet.
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

/**
 * One player's rod.
 *
 * `beads` is the list of families they have earned, in the order they earned
 * them — the shape M11's scoring will hand over, and empty until it does.
 */
export interface AbacusRow {
  playerId: number;
  name: string;
  /** The player's diorama ink, for the label swatch. Never painted on a bead. */
  color: number;
  beads: FamilyId[];
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
  /** Called as this opens, so whatever else was up can get out of the way. */
  onOpen?: () => void;
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
  const { overlay, stage: host, closeButton, trigger, rows, onOpen } = options;

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

  /** Slides each rod straight to the state it is in. No animation: this is a load. */
  function seedRods(table: readonly AbacusRow[]): void {
    table.forEach((row, index) => abacus?.seed(index, row.beads));
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
