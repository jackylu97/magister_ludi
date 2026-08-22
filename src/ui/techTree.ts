/**
 * The star chart: the technology tree as the magister's sky.
 *
 * A full-screen overlay opened from the top bar (or `T`), and the one
 * deliberately dark surface in a light interface — ink ground, gilt stars,
 * hairline sight-lines between a node and the nodes it depends on (see the
 * flourish set in Entry VII of `docs/design-notes.md`). Everything else on the
 * screen is parchment on a table; this is the table at night.
 *
 * It reads the simulation and sends exactly one command
 * -----------------------------------------------------
 * Every state a node can be in — researched, being researched, available,
 * locked — is derived from `src/sim/tech.ts`, and whether a node can be clicked
 * is `researchError(...) === null`, which is the *same* function the reducer
 * validates `chooseResearch` with. A node this screen lets you press is a node
 * the reducer accepts; a node it dims explains itself with the reducer's own
 * words. There is no second opinion about the rules anywhere in this file.
 *
 * Glanceable numbers (Entry VIII)
 * ------------------------------
 * Each node carries its cost and "~N turns" at the player's *current* science
 * rate, and each building it unlocks carries what that building would add to
 * this empire's yields today — computed by `buildingYieldDelta`, which asks
 * `cityYields` twice rather than reimplementing it. Both are present-state
 * figures and the screen says so ("now"), because a delta that quietly assumed
 * future growth would be a promise the game never made.
 *
 * A chart that travels sideways
 * -----------------------------
 * The screen is a dependency chart on a horizontally scrolling stage, not a
 * list of ages: a node's column is `techDepth` — the longest chain of
 * prerequisites behind it — and its row is the lane hand-authored in
 * `data/techs.json`. So a chain reads as a chain, left to right, and the ages
 * are demoted to what they always were: an annotation, painted as dim gilt
 * numerals behind the columns they happen to own (`techAgeBands`).
 *
 * Travel is by drag, by wheel (a vertical wheel scrolls the chart sideways,
 * because sideways is the only direction it goes), and by the arrow keys. On
 * opening, the stage jumps — no tween; the player asked to see the chart, not
 * to watch it arrive — to whatever they are researching, or to the leftmost
 * thing they *could* research if they are researching nothing.
 *
 * Why the lines are drawn after layout
 * ------------------------------------
 * The connectors are one SVG behind the cards, and they are measured from the
 * cards themselves rather than from a hand-maintained coordinate table: the
 * chart is a grid that reflows with the window and with the length of a
 * building's name, and a diagram that had its own idea of where the nodes were
 * would drift the first time somebody resized. Measurement needs a laid-out
 * DOM, so it happens on the frame after the overlay is shown, and again on
 * resize while it is open. The SVG lives *inside* the scrolling field and is
 * measured in field coordinates, so scrolling moves the lines with the cards
 * for free — a diagram drawn in viewport coordinates would need repainting on
 * every scroll event and would still lag by a frame.
 */

import { buildingDef } from '../sim/buildingData';
import type { Command } from '../sim/commands';
import { type Game, dispatch } from '../sim/game';
import { hasEndedTurn } from '../sim/state';
import {
  buildingYieldDelta,
  playerScience,
  researchError,
  turnsToTech,
} from '../sim/tech';
import {
  TECH_IDS,
  type TechAge,
  type TechId,
  techAgeBands,
  techColumnCount,
  techDef,
  techDepth,
  techRowCount,
} from '../sim/techData';
import { unitDef } from '../sim/unitData';

/** ÆRA I / II / III — the ages, in the numerals the specimen sets them in. */
const AGE_NUMERALS: Record<TechAge, string> = { 1: 'I', 2: 'II', 3: 'III' };
const AGE_NAMES: Record<TechAge, string> = {
  1: 'Ancient',
  2: 'Classical',
  3: 'Medieval',
};

/**
 * The production voice, named once because it is also what a cost is quoted in:
 * an unlock line reads `15⚙`, exactly as the city panel's buttons do.
 */
const HAMMER = '⚙';

/** The yield voices, in the order the city panel lists them. */
const YIELD_GLYPHS: [keyof ReturnType<typeof buildingYieldDelta>, string][] = [
  ['food', '🌾'],
  ['production', HAMMER],
  ['gold', '🪙'],
  ['science', '🔬'],
  ['culture', '🎭'],
];

export interface TechTree {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  /** Rebuilds the chart if it is open, and always refreshes the bar line. */
  render(): void;
}

export interface TechTreeOptions {
  /** The full-screen overlay. Hidden with the `hidden` attribute while closed. */
  overlay: HTMLElement;
  /**
   * The scrolling stage. Emptied and rebuilt per render; the chart's field is
   * built inside it, and this element is what pans.
   */
  chart: HTMLElement;
  /** The overlay's own × button. */
  closeButton: HTMLElement;
  /** The top bar's research button: opens this, and shows what is being learnt. */
  barButton: HTMLButtonElement;
  /** The line inside that button. */
  barValue: HTMLElement;
  getGame: () => Game;
  localPlayerId: () => number;
  /** Called after a command lands, so the rest of the page catches up. */
  onChanged: () => void;
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

const SVG_NS = 'http://www.w3.org/2000/svg';

export function createTechTree(options: TechTreeOptions): TechTree {
  const { overlay, chart, closeButton, barButton, barValue, getGame, localPlayerId, onChanged } =
    options;

  let open = false;
  let restoreTo: HTMLElement | null = null;
  /** Where each node card ended up, so the sight-lines can be measured. */
  const cards = new Map<TechId, HTMLButtonElement>();

  // --- one node ------------------------------------------------------------

  /**
   * The small marks under a node's name: what it hands over.
   *
   * A unit wears its own glyph — the same letter the board draws on its disc —
   * and a building wears the voice it speaks in, followed by what it would be
   * worth to this empire right now.
   */
  function renderUnlocks(id: TechId): HTMLElement {
    const { state } = getGame();
    const playerId = localPlayerId();
    const list = element('ul', 'tech-unlocks');
    const { units = [], buildings = [] } = techDef(id).unlocks;

    for (const unit of units) {
      const def = unitDef(unit);
      const row = element('li');
      row.append(element('span', 'tech-mark is-unit', def.glyph));
      row.append(element('span', 'tech-unlock-name', def.name));
      row.append(element('span', 'tech-unlock-note', `${def.cost}${HAMMER}`));
      list.append(row);
    }

    for (const building of buildings) {
      const def = buildingDef(building);
      const row = element('li');
      row.append(element('span', 'tech-mark is-building', '▣'));
      row.append(element('span', 'tech-unlock-name', def.name));

      // Entry VIII: the actual computed delta, for the cities this player has
      // today. An empire with nowhere to build it says only what it costs.
      const delta = buildingYieldDelta(state, playerId, building);
      const parts = YIELD_GLYPHS.filter(([key]) => delta[key] !== 0).map(
        ([key, glyph]) => `${delta[key] > 0 ? '+' : ''}${delta[key]}${glyph}`,
      );
      row.append(
        element(
          'span',
          parts.length > 0 ? 'tech-unlock-note is-delta' : 'tech-unlock-note',
          parts.length > 0 ? `${parts.join(' ')} now` : `${def.cost}${HAMMER}`,
        ),
      );
      list.append(row);
    }
    return list;
  }

  function renderNode(id: TechId): HTMLElement {
    const { state } = getGame();
    const playerId = localPlayerId();
    const player = state.players[playerId];
    const def = techDef(id);

    const researched = player?.techsResearched.includes(id) ?? false;
    const current = player?.researching === id;
    const problem = researchError(state, playerId, id);
    // Locked means "not yet, and not next either": the prerequisites are the
    // difference, and they are what the sight-lines are drawn for.
    const choosable = problem === null && !hasEndedTurn(state, playerId);

    const card = element('button', 'tech-node');
    card.type = 'button';
    card.classList.toggle('is-researched', researched);
    card.classList.toggle('is-current', current);
    card.classList.toggle('is-locked', !researched && !current && problem !== null);
    card.disabled = !choosable;
    // Every disabled node says why, in the reducer's own words where there are
    // any: a star you cannot press and cannot ask about is a dead end.
    if (problem) card.title = problem;
    else if (!choosable) card.title = `You have ended turn ${state.turn}`;
    else card.title = `Research ${def.name}`;

    const head = element('div', 'tech-node-head');
    head.append(element('span', 'tech-node-name', def.name));
    if (researched) {
      const star = element('span', 'tech-node-star', '✦');
      star.setAttribute('aria-hidden', 'true');
      head.append(star);
    }
    card.append(head);

    // Cost, and what it would take from here. The pool pays for whichever node
    // it is aimed at, so "~N turns" is honest for a node that is not current.
    const turns = turnsToTech(state, playerId, id);
    const figures = element('div', 'tech-node-figures');
    figures.append(element('span', 'tech-node-cost', `${def.cost}🔬`));
    if (!researched) {
      figures.append(
        element('span', 'tech-node-turns', turns === null ? '—' : `~${turns}t`),
      );
    }
    card.append(figures);

    if (current && player) {
      const track = element('div', 'tech-bar');
      const fill = element('div', 'tech-bar-fill');
      const fraction = Math.max(0, Math.min(1, player.sciencePool / def.cost));
      fill.style.width = `${(fraction * 100).toFixed(1)}%`;
      track.append(fill);
      card.append(track);
      card.append(
        element('div', 'tech-node-progress', `${Math.floor(player.sciencePool)} / ${def.cost}`),
      );
    }

    card.append(renderUnlocks(id));
    if (def.flavor) card.append(element('p', 'tech-node-flavor', def.flavor));

    card.addEventListener('click', () => {
      if (!choosable) return;
      const command: Command = { type: 'chooseResearch', playerId, techId: id };
      if (!dispatch(getGame(), command).ok) return;
      render();
      // The card that was clicked no longer exists — the chart is rebuilt from
      // the new state — so the keyboard is handed to the node that replaced it
      // rather than being dropped on the document.
      cards.get(id)?.focus();
      onChanged();
    });

    cards.set(id, card);
    return card;
  }

  // --- the chart -----------------------------------------------------------

  /** The field the cards are placed on, kept so measurement has an origin. */
  let field: HTMLElement | null = null;

  function renderChart(): void {
    // A rebuild is not a journey: choosing a research redraws every card, and
    // a chart that snapped back to column zero each time would make the player
    // find their place again for nothing.
    const wasAt = { left: chart.scrollLeft, top: chart.scrollTop };

    cards.clear();
    const columns = techColumnCount();
    const rows = techRowCount();

    const built = element('div', 'tech-field');
    // The tracks are written from the data rather than from CSS: the chart is
    // exactly as wide as the deepest chain and as deep as the lanes in use, and
    // both are facts `techData` owns.
    built.style.gridTemplateColumns = `repeat(${columns}, var(--tech-col-w))`;
    // The first track is the age strip; the lanes follow it.
    built.style.gridTemplateRows = `min-content repeat(${rows}, min-content)`;

    // ÆRA I/II/III, painted behind whichever columns their techs settled in.
    // Each age is two pieces: a region spanning every lane, which carries the
    // watermark numeral and the hairline seam where the age changes, and a
    // label in the strip along the top. The age no longer says where a tech
    // goes — it says what to call the ground the tech ended up on.
    for (const [index, band] of techAgeBands().entries()) {
      const span = `${band.from + 1} / ${band.to + 2}`;

      const region = element('div', 'tech-age');
      region.classList.toggle('is-seam', index > 0);
      region.style.gridColumn = span;
      region.style.gridRow = '1 / -1';
      region.setAttribute('aria-hidden', 'true');
      region.append(element('span', 'tech-age-numeral', AGE_NUMERALS[band.age]));
      built.append(region);

      const label = element('div', 'tech-age-label');
      label.style.gridColumn = span;
      label.style.gridRow = '1';
      label.append(element('span', 'tech-era', `ÆRA ${AGE_NUMERALS[band.age]}`));
      label.append(element('span', 'tech-era-name', AGE_NAMES[band.age]));
      built.append(label);
    }

    const lines = document.createElementNS(SVG_NS, 'svg');
    lines.setAttribute('class', 'tech-lines');
    lines.setAttribute('aria-hidden', 'true');
    built.append(lines);

    for (const id of TECH_IDS) {
      const card = renderNode(id);
      card.style.gridColumn = String(techDepth(id) + 1);
      card.style.gridRow = String(techDef(id).row + 2); // past the age strip
      built.append(card);
    }

    field = built;
    chart.replaceChildren(built);
    chart.scrollLeft = wasAt.left;
    chart.scrollTop = wasAt.top;

    // Measured twice, and both are deliberate. Reading `offsetLeft` flushes
    // layout, so the first pass draws lines that are already correct for this
    // paint; the second catches the reflow when a web font finishes loading and
    // every card changes height under them. (A background tab never runs the
    // second, which is exactly right — and why the first is not an animation
    // frame: `requestAnimationFrame` does not fire in a hidden tab at all.)
    drawLines(lines);
    requestAnimationFrame(() => drawLines(lines));
  }

  /**
   * One dotted connector per prerequisite, from the right edge of the earlier
   * node to the left edge of the later one.
   *
   * The curve is a cubic with horizontal handles, so it leaves and arrives flat
   * and a node on the same lane as its prerequisite gets a straight sight-line;
   * the handles are capped, so a connector that spans four columns bends near
   * its ends rather than sagging through the middle of the chart. Because
   * `techDepth` puts every prerequisite in a strictly earlier column, `x2` is
   * always to the right of `x1` and no connector ever doubles back.
   *
   * The SVG sits *behind* the cards, so a line disappears under the two nodes
   * it joins and reads as a sight-line between stars rather than as an arrow.
   */
  function drawLines(svg: SVGSVGElement): void {
    const origin = field;
    if (!origin) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const width = origin.scrollWidth;
    const height = origin.scrollHeight;
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const { state } = getGame();
    const player = state.players[localPlayerId()];
    for (const id of TECH_IDS) {
      const to = cards.get(id);
      if (!to) continue;
      const x2 = to.offsetLeft;
      const y2 = to.offsetTop + to.offsetHeight / 2;
      for (const prereq of techDef(id).prereqs) {
        const from = cards.get(prereq);
        if (!from) continue;
        const x1 = from.offsetLeft + from.offsetWidth;
        const y1 = from.offsetTop + from.offsetHeight / 2;
        const reach = Math.max(24, Math.min(90, (x2 - x1) * 0.45));
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute(
          'd',
          `M ${x1.toFixed(1)} ${y1.toFixed(1)} ` +
            `C ${(x1 + reach).toFixed(1)} ${y1.toFixed(1)}, ` +
            `${(x2 - reach).toFixed(1)} ${y2.toFixed(1)}, ` +
            `${x2.toFixed(1)} ${y2.toFixed(1)}`,
        );
        // A line out of ground the player has already covered is lit; the rest
        // is the faint chart under it.
        const held = player?.techsResearched.includes(prereq) ?? false;
        path.setAttribute('class', held ? 'tech-line is-held' : 'tech-line');
        svg.append(path);
      }
    }
  }

  // --- travelling along it -------------------------------------------------

  /**
   * The node the chart should open on: what is being researched, or failing
   * that the leftmost thing that could be. A chart that opened on column zero
   * would open on ground the player covered an hour ago.
   */
  function anchorCard(): HTMLElement | null {
    const player = getGame().state.players[localPlayerId()];
    const current = player?.researching ?? null;
    if (current !== null) {
      const card = cards.get(current);
      if (card) return card;
    }
    let best: HTMLElement | null = null;
    let bestColumn = Number.POSITIVE_INFINITY;
    for (const id of TECH_IDS) {
      const card = cards.get(id);
      if (!card || card.disabled) continue;
      if (techDepth(id) >= bestColumn) continue;
      best = card;
      bestColumn = techDepth(id);
    }
    return best;
  }

  /**
   * The choosable node nearest the anchor, which is where the keyboard starts.
   *
   * The anchor is often the current research, and the current research is not
   * itself choosable — so the cursor goes to the nearest node that *is*, rather
   * than to the first one in file order, which would be a focus ring parked
   * three columns off the left edge of what the player is looking at.
   */
  function nearestChoosable(anchor: HTMLElement | null): HTMLButtonElement | null {
    const wanted = anchor?.style.gridColumn ? Number(anchor.style.gridColumn) - 1 : 0;
    let best: HTMLButtonElement | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const id of TECH_IDS) {
      const card = cards.get(id);
      if (!card || card.disabled) continue;
      const distance = Math.abs(techDepth(id) - wanted);
      if (distance >= bestDistance) continue;
      best = card;
      bestDistance = distance;
    }
    return best;
  }

  /** Puts an element in the middle of the stage, at once and without a tween. */
  function centreOn(card: HTMLElement): void {
    const seen = card.getBoundingClientRect();
    const window_ = chart.getBoundingClientRect();
    const drift = seen.left - window_.left - (chart.clientWidth - seen.width) / 2;
    chart.scrollLeft += drift;
  }

  /** One column-ish, for the arrow keys and for a wheel notch. */
  const NUDGE = 260;

  function nudge(by: number): void {
    chart.scrollLeft += by;
  }

  /**
   * Drag to pan, as one would push a paper chart across a table.
   *
   * The click that ends a drag is swallowed: a player who dragged the chart by
   * grabbing a node did not ask to research it. The threshold is what separates
   * the two gestures, and pointer capture only starts once it is crossed, so a
   * plain click on a card still reaches the card.
   */
  let panFrom: { id: number; x: number; y: number; left: number; top: number } | null = null;
  let panned = false;
  let swallowClick = false;

  chart.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    swallowClick = false;
    panned = false;
    panFrom = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: chart.scrollLeft,
      top: chart.scrollTop,
    };
  });

  chart.addEventListener('pointermove', (event) => {
    if (!panFrom || event.pointerId !== panFrom.id) return;
    const dx = event.clientX - panFrom.x;
    const dy = event.clientY - panFrom.y;
    if (!panned) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      panned = true;
      // Capture keeps a drag that wanders off the stage — or off the window —
      // attached to it. A pointer that has already gone (a synthetic event, a
      // device unplugged mid-drag) refuses to be captured, and that is not a
      // reason to stop panning.
      try {
        chart.setPointerCapture(event.pointerId);
      } catch {
        /* the drag simply loses the pointer if it leaves the stage */
      }
      chart.classList.add('is-panning');
    }
    chart.scrollLeft = panFrom.left - dx;
    chart.scrollTop = panFrom.top - dy;
  });

  function endPan(event: PointerEvent): void {
    if (!panFrom || event.pointerId !== panFrom.id) return;
    if (panned) {
      if (chart.hasPointerCapture(event.pointerId)) chart.releasePointerCapture(event.pointerId);
      chart.classList.remove('is-panning');
      swallowClick = true;
    }
    panFrom = null;
    panned = false;
  }

  chart.addEventListener('pointerup', endPan);
  chart.addEventListener('pointercancel', endPan);

  chart.addEventListener(
    'click',
    (event) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.stopPropagation();
      event.preventDefault();
    },
    true,
  );

  /**
   * The wheel travels sideways, because sideways is the only way this chart
   * goes. A trackpad's horizontal gesture (and the shift-wheel most browsers
   * turn into one) arrives as `deltaX` and is left to the browser; a plain
   * vertical wheel is turned across. Zoom gestures — ctrl or meta held — are
   * never ours to take.
   */
  chart.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey || event.metaKey) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (chart.scrollWidth <= chart.clientWidth) return;
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? chart.clientWidth : 1;
      event.preventDefault();
      chart.scrollLeft += event.deltaY * unit;
    },
    { passive: false },
  );

  // --- the top bar's line --------------------------------------------------

  /**
   * "Research · Bronze Working 4t", or a prompt to choose one.
   *
   * The nag is a pulse on the button rather than a modal: research is a decision
   * the player should make, and a screen that demanded it before the game would
   * continue would be a screen that interrupted the game to ask.
   */
  function renderBar(): void {
    const { state } = getGame();
    const playerId = localPlayerId();
    const player = state.players[playerId];
    if (!player) return;

    const current = player.researching;
    if (current === null) {
      barValue.textContent = 'Choose…';
      barButton.classList.add('is-prompting');
      barButton.title = 'Choose what to research (T)';
      return;
    }
    barButton.classList.remove('is-prompting');
    const def = techDef(current);
    const turns = turnsToTech(state, playerId, current);
    barValue.textContent = `${def.name} ${turns === null ? '—' : `${turns}t`}`;
    const rate = playerScience(state, playerId);
    barButton.title =
      `${def.name}: ${Math.floor(player.sciencePool)} / ${def.cost} beakers ` +
      `(+${rate} per turn) — the tech tree is T`;
  }

  function render(): void {
    renderBar();
    if (open) renderChart();
  }

  // --- opening and closing -------------------------------------------------

  function setOpen(next: boolean): void {
    if (open === next) return;
    open = next;
    overlay.hidden = !next;
    barButton.setAttribute('aria-expanded', String(next));

    if (next) {
      const active = document.activeElement as HTMLElement | null;
      restoreTo = active && active !== document.body ? active : barButton;
      // A fresh opening starts at the front of the player's own work rather
      // than wherever the last visit was left, so the chart always opens on
      // the decision that is actually in front of them.
      chart.scrollLeft = 0;
      chart.scrollTop = 0;
      renderChart();
      // The current research if there is one, otherwise the first node the
      // player could actually choose: a screen that opens with the cursor on
      // "close" is a screen that opens with nothing to read. The stage travels
      // to the same node, so what has the keyboard is also what is on screen.
      const anchor = anchorCard();
      if (anchor) centreOn(anchor);
      (nearestChoosable(anchor) ?? closeButton).focus({ preventScroll: true });
      return;
    }
    restoreTo?.focus();
    restoreTo = null;
    renderBar();
  }

  closeButton.addEventListener('click', () => setOpen(false));
  barButton.addEventListener('click', () => setOpen(!open));

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
    if (event.key === 't' || event.key === 'T') {
      setOpen(false);
      return;
    }
    // The chart only goes sideways, so the sideways keys drive it. Tab still
    // walks the nodes; these are for reading, not for choosing.
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      nudge(event.key === 'ArrowLeft' ? -NUDGE : NUDGE);
    }
  });

  // Clicking the ink around the chart closes it, like the popovers do.
  overlay.addEventListener('pointerdown', (event) => {
    if (event.target === overlay) setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (!open) return;
    const svg = chart.querySelector<SVGSVGElement>('svg.tech-lines');
    if (svg) drawLines(svg);
  });

  renderBar();

  return {
    get isOpen() {
      return open;
    },
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
    render,
  };
}
