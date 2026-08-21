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
 * Why the lines are drawn after layout
 * ------------------------------------
 * The sight-lines are one SVG behind the cards, and they are measured from the
 * cards themselves rather than from a hand-maintained coordinate table: the
 * chart is a flex layout that reflows with the window, and a diagram that had
 * its own idea of where the nodes were would drift the first time somebody
 * resized. Measurement needs a laid-out DOM, so it happens on the frame after
 * the overlay is shown, and again on resize while it is open.
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
import { TECH_IDS, type TechAge, type TechId, techDef } from '../sim/techData';
import { unitDef } from '../sim/unitData';

/** ÆRA I / II / III — the ages, in the numerals the specimen sets them in. */
const AGE_NUMERALS: Record<TechAge, string> = { 1: 'I', 2: 'II', 3: 'III' };
const AGE_NAMES: Record<TechAge, string> = {
  1: 'Ancient',
  2: 'Classical',
  3: 'Medieval',
};

/** The yield voices, in the order the city panel lists them. */
const YIELD_GLYPHS: [keyof ReturnType<typeof buildingYieldDelta>, string][] = [
  ['food', '🌾'],
  ['production', '⚙'],
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
  /** The element the columns are built into. Emptied and rebuilt per render. */
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
      row.append(element('span', 'tech-unlock-note', `${def.cost}h`));
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
          parts.length > 0 ? `${parts.join(' ')} now` : `${def.cost}h`,
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

  function renderChart(): void {
    cards.clear();
    chart.replaceChildren();

    const lines = document.createElementNS(SVG_NS, 'svg');
    lines.setAttribute('class', 'tech-lines');
    lines.setAttribute('aria-hidden', 'true');
    chart.append(lines);

    for (const age of [1, 2, 3] as TechAge[]) {
      const column = element('section', 'tech-column');
      const head = element('header', 'tech-column-head');
      head.append(element('span', 'tech-era', `ÆRA ${AGE_NUMERALS[age]}`));
      head.append(element('span', 'tech-era-name', AGE_NAMES[age]));
      column.append(head);
      for (const id of TECH_IDS) {
        if (techDef(id).age !== age) continue;
        column.append(renderNode(id));
      }
      chart.append(column);
    }

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
   * One hairline per prerequisite, from the middle of the earlier node to the
   * middle of the later one. The SVG sits *behind* the cards, so each line
   * disappears under the two it joins and reads as a sight-line between stars
   * rather than as an arrow.
   */
  function drawLines(svg: SVGSVGElement): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const width = chart.scrollWidth;
    const height = chart.scrollHeight;
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const centre = (el: HTMLElement): { x: number; y: number } => ({
      x: el.offsetLeft + el.offsetWidth / 2,
      y: el.offsetTop + el.offsetHeight / 2,
    });

    const { state } = getGame();
    const player = state.players[localPlayerId()];
    for (const id of TECH_IDS) {
      const to = cards.get(id);
      if (!to) continue;
      for (const prereq of techDef(id).prereqs) {
        const from = cards.get(prereq);
        if (!from) continue;
        const a = centre(from);
        const b = centre(to);
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', String(a.x));
        line.setAttribute('y1', String(a.y));
        line.setAttribute('x2', String(b.x));
        line.setAttribute('y2', String(b.y));
        // A line into ground the player has already covered is lit; the rest is
        // the faint chart under it.
        const held = player?.techsResearched.includes(prereq) ?? false;
        line.setAttribute('class', held ? 'tech-line is-held' : 'tech-line');
        svg.append(line);
      }
    }
  }

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
      renderChart();
      // The current research if there is one, otherwise the first node the
      // player could actually choose: a screen that opens with the cursor on
      // "close" is a screen that opens with nothing to read.
      const focusable = [...cards.values()].find((card) => !card.disabled);
      (focusable ?? closeButton).focus();
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
    if (event.key === 't' || event.key === 'T') {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.isContentEditable) return;
      setOpen(false);
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
