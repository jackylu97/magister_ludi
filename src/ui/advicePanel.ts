/**
 * The advice panel: one line at the bottom centre of the screen, shown only
 * while the pointer rests on a hex the board recommends.
 *
 * The user's ruling of 2026-11-21 (docs/plans/ui-critique-2026-10-16.md): "add
 * a new panel that appears on hover in the middle bottom that reads 'advice:
 * build a camp here *yields*'. We can have advice appear there, applying to
 * the settler recommendations too (mousing over a settler location reads 'we
 * recommend you build a city here: *reasons*')".
 *
 * It has two forms:
 *
 *   - a city site: "We recommend a city here:" and at most three reasons, from
 *     `siteReasons` (`tileReadout.ts`), which writes them from `explainSite`;
 *   - a worker's hex: "Advice: build a camp here" and the change in the hex's
 *     yields as figures, a loss in the alert colour.
 *
 * Both forms have a slot for one warning in the alert colour. Nothing fills it
 * today: the site reading has no line for a danger such as a camp nearby.
 *
 * The panel is in the family of the city screen's bottom bar (`.city-buy-dock`
 * in `style.css`): paper, an ink line on top, a gilt rule above it. It has no
 * close button and takes no pointer events, because the hover on the board
 * drives it.
 *
 * It never cuts a reason (the user, 2026-11-22: "could we just have the panel
 * expand to accomodate a longer reason?"). It stands in a dock that spans the
 * free width between the tile readout on the left and the lens button and End
 * Turn on the right. A short line is centred on the screen. A longer line
 * grows wider, up to the whole of that free width. A line that still does not
 * fit wraps, and the panel grows upward: its foot stays where it is.
 *
 * It listens to nothing itself. The caller tells it what the pointer is on,
 * and `dispose` removes the element. The caller puts `dispose` in
 * `gameDisposers`.
 */

import type { WorkerAdvice } from '../ai/bot';
import { improvementDef } from '../sim/improvementData';
import { aRow } from '../sim/improvements';
import type { TileYield } from '../sim/terrainData';
import { TILE_YIELD_KEYS } from '../sim/terrainData';
import type { GameState } from '../sim/state';
import { isExploredBy } from '../sim/visibility';
import { roundYield } from '../sim/yieldFormat';

import { VIEW3D } from '../render3d/lookData';
import { seatSeesKind } from '../render3d/sites3d';

import { YIELD_NAME } from './figures';
import { yieldFigureNodes } from './yieldMark';

/** What the panel says. `null` hides it. */
export type Advice =
  | { kind: 'site'; reasons: readonly string[]; warning?: string }
  | { kind: 'work'; action: 'build' | 'repair'; phrase: string; change: TileYield; warning?: string };

export interface AdvicePanel {
  show(advice: Advice | null): void;
  dispose(): void;
}

/** The hover panel describes the same job the selected worker's map mark represents. */
export function adviceForWork(job: WorkerAdvice): Advice {
  return { kind: 'work', action: job.action, phrase: aRow(improvementDef(job.improvement)), change: job.delta };
}

/** The most reasons a city site prints. The panel is one line. */
export const SITE_REASON_LIMIT = 3;

/** The words of an advice, without the figures: what the panel prints, and what a screen reader hears. */
export function adviceText(advice: Advice): string {
  if (advice.kind === 'work') return `Advice: ${advice.action} ${advice.phrase} here`;
  const reasons = advice.reasons.slice(0, SITE_REASON_LIMIT);
  return reasons.length > 0 ? `We recommend a city here: ${reasons.join(', ')}` : 'We recommend a city here';
}

/** The voices of a yield change that are not zero, in the game's order, as signed whole figures. */
export function adviceFigures(change: TileYield): { key: keyof TileYield; text: string; loss: boolean }[] {
  return TILE_YIELD_KEYS.map((key) => ({ key, amount: roundYield(change[key]) }))
    .filter((row) => row.amount !== 0)
    .map((row) => ({ key: row.key, text: (row.amount > 0 ? '+' : '−') + Math.abs(row.amount), loss: row.amount < 0 }));
}

export function mountAdvicePanel(host: HTMLElement): AdvicePanel {
  // The dock is the free width at the foot of the screen. The panel is as wide as its words inside it.
  const dock = document.createElement('div');
  dock.className = 'advice-dock';
  const panel = document.createElement('div');
  panel.className = 'advice-panel';
  panel.setAttribute('role', 'status');
  panel.hidden = true;
  dock.append(panel);
  host.append(dock);
  let shown = '';

  return {
    show(advice) {
      // The pointer moves often and the advice changes seldom, so an unchanged advice touches nothing.
      const key = advice === null ? '' : JSON.stringify(advice);
      if (key === shown) return;
      shown = key;
      if (advice === null) { panel.hidden = true; panel.replaceChildren(); return; }
      const lead = document.createElement('strong');
      lead.className = 'advice-lead';
      const parts: Node[] = [lead];
      if (advice.kind === 'site') {
        const reasons = advice.reasons.slice(0, SITE_REASON_LIMIT);
        lead.textContent = reasons.length > 0 ? 'We recommend a city here:' : 'We recommend a city here';
        if (reasons.length > 0) {
          const body = document.createElement('span');
          body.className = 'advice-reasons';
          body.textContent = reasons.join(', ');
          parts.push(body);
        }
      } else {
        lead.textContent = adviceText(advice);
        const figures = document.createElement('span');
        figures.className = 'advice-figures';
        for (const row of adviceFigures(advice.change)) {
          const span = document.createElement('span');
          span.className = `tile-yield is-${row.key}${row.loss ? ' is-loss' : ''}`;
          span.append(yieldFigureNodes(row.text, row.key));
          span.setAttribute('aria-label', `${row.text} ${YIELD_NAME[row.key]}`);
          figures.append(span);
        }
        if (figures.childElementCount > 0) parts.push(figures);
      }
      if (advice.warning) {
        const warning = document.createElement('span');
        warning.className = 'advice-warning';
        warning.textContent = advice.warning;
        parts.push(warning);
      }
      panel.replaceChildren(...parts);
      panel.hidden = false;
    },
    dispose() { dock.remove(); },
  };
}

/** The settler lens's legend: what each tint means, in the order best to worst. */
export const SITE_LEGEND: readonly { key: 'fresh' | 'coast' | 'dry' | 'refused'; label: string }[] = [
  { key: 'fresh', label: 'Fresh water' },
  { key: 'coast', label: 'Coast' },
  { key: 'dry', label: 'No water' },
  { key: 'refused', label: 'Cannot settle' },
];

/** The explorer lens's legend: the two things it marks. */
export const FIND_LEGEND: readonly { key: 'ruin' | 'camp'; label: string }[] = [
  { key: 'ruin', label: 'Ruin' },
  { key: 'camp', label: 'Barbarian camp' },
];

/** What the explorer legend says when the seat knows no ruin and no camp. */
export const NO_FINDS = 'No ruin or camp found yet';

/**
 * True if the explorer lens has something to draw for this seat: a discovery
 * the seat can name on a hex it has charted, or a camp on a charted hex. The
 * same two questions the lens asks (`addDiscoveryWash` in `lens3d.ts`).
 */
export function seatKnowsFinds(state: GameState, seat: number): boolean {
  if (state.camps.some((camp) => isExploredBy(state, seat, camp.col, camp.row))) return true;
  return state.map.tiles.some(
    (tile) => tile.discovery !== undefined && seatSeesKind(state, seat, tile.discovery) && isExploredBy(state, seat, tile.col, tile.row),
  );
}

export interface LensLegend {
  /** Shows the legend of this lens, or none. `empty` is true when the explorer lens has nothing to draw. */
  show(lens: 'settler' | 'explorer' | null, empty?: boolean): void;
  dispose(): void;
}

/**
 * The legend of the settler lens and of the explorer lens: a small card above
 * the lens button, shown while that lens is up. Each row is a swatch and a
 * word. The swatches are the lens's own colours from `data/view3d.json`, so
 * the card cannot drift from the board. The explorer card has one more line,
 * shown in place of its rows when the seat knows no ruin and no camp, so that
 * an empty board does not look like a broken lens. Like the advice panel, the
 * card takes no pointer events.
 */
export function mountLensLegend(host: HTMLElement): LensLegend {
  const css = (color: number): string => '#' + color.toString(16).padStart(6, '0');
  const card = (rows: readonly { key: string; label: string }[], tint: Record<string, number>): HTMLElement => {
    const el = document.createElement('div');
    el.className = 'lens-legend';
    el.hidden = true;
    for (const row of rows) {
      const line = document.createElement('div');
      line.className = 'lens-legend-row';
      const swatch = document.createElement('span');
      swatch.className = `lens-legend-swatch is-${row.key}`;
      swatch.style.setProperty('--tint', css(tint[row.key]!));
      const word = document.createElement('span');
      word.textContent = row.label;
      line.append(swatch, word);
      el.append(line);
    }
    host.append(el);
    return el;
  };
  const lens = VIEW3D.lens;
  const sites = card(SITE_LEGEND, { fresh: lens.siteFreshColor, coast: lens.siteCoastColor, dry: lens.siteDryColor, refused: lens.siteRefusedColor });
  const finds = card(FIND_LEGEND, { ruin: lens.discoveryColor, camp: lens.advice.campTickColor });
  const none = document.createElement('div');
  none.className = 'lens-legend-none';
  none.textContent = NO_FINDS;
  none.hidden = true;
  finds.append(none);
  const set = (el: HTMLElement, hidden: boolean): void => { if (el.hidden !== hidden) el.hidden = hidden; };
  return {
    show(which, empty = false) {
      set(sites, which !== 'settler');
      set(finds, which !== 'explorer');
      set(none, !empty);
      finds.classList.toggle('is-empty', empty);
    },
    dispose() { sites.remove(); finds.remove(); },
  };
}
