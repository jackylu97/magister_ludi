/**
 * The levy control: a "Levy a citizen" button and the short menu it opens
 * (batch L; the interface the user picked is option A of the levies sketch).
 *
 * One menu line per thing the player's held cards let a levy buy, each with its
 * exact figure on the right and the granting card's name underneath, and a cost
 * line under the lines: the population change and how long the town waits
 * before it may levy again. The button is greyed while no line can be chosen —
 * most often because the town is still waiting — with the reason in its hover.
 * A town whose owner holds no levy card gets no button at all.
 *
 * Split in two so the menu can later open from a citizen token (the user's
 * preferred version): `levyMenuModel` is pure and says what the menu holds;
 * `renderLevyMenu` draws it and hands the choice back through a callback. This
 * module never dispatches — the city panel does, through its own reporter.
 */

import { type LevyOption, levyOptions } from '../sim/levies';
import { RULES } from '../sim/rulesData';
import { type City, type GameState, cityById } from '../sim/state';
import type { LevyUse } from '../sim/statecraftData';
import { unitDef } from '../sim/unitData';
import { YIELD_GLYPH, figure } from './figures';
import { yieldElement as element } from './yieldMark';

/** One line of the menu, already in the player's words. */
export interface LevyMenuLine {
  use: LevyUse;
  /** What the citizen buys: "Production here", "Raise a unit". */
  label: string;
  /** The exact figure, set in mono on the right: "+76⚙", "Spearman". */
  figure: string;
  /** The card that grants the line, and what it pays: under the label. */
  source: string;
  /** Why the line cannot be chosen now, or `null`. */
  blocked: string | null;
}

/** What the control shows for one town. `null` means no button at all. */
export interface LevyMenuModel {
  lines: LevyMenuLine[];
  /** True while no line can be chosen. */
  disabled: boolean;
  /** The button's hover: the reason it is greyed, or what it does. */
  title: string;
  /** "Costs 1 citizen (pop 9 → 8). Next levy here in 5 turns." */
  cost: string;
}

/** The plain words under a line: the card's name and what it pays for. */
function sourceWords(state: GameState, option: LevyOption): string {
  const card = option.cardName;
  switch (option.use) {
    case 'production':
      return `${card}: the food it took to grow this citizen`;
    case 'opus': {
      const target = option.targetCityId === null ? undefined : cityById(state, option.targetCityId);
      return target === undefined
        ? `${card}: to the town building the Magnum Opus`
        : `${card}: to ${target.name}, which is building the Magnum Opus`;
    }
    case 'muster':
      return `${card}: your best melee unit, counted as trained`;
    case 'conscript':
      return `${card}: your best melee unit, not counted as trained`;
    default: {
      const unhandled: never = option.use;
      void unhandled;
      return card;
    }
  }
}

/** The figure on the right of a line. */
function figureWords(option: LevyOption): string {
  if (option.hammers !== null) return `+${figure(option.hammers)}${YIELD_GLYPH.production}`;
  if (option.unit !== null) return unitDef(option.unit).name;
  return '—';
}

/**
 * What the levy control shows for this town, or `null` when the player's cards
 * grant no levy (the button does not appear). Every figure and every refusal is
 * the simulation's own (`levyOptions`, `levyError`).
 */
export function levyMenuModel(
  state: GameState,
  playerId: number,
  city: City,
): LevyMenuModel | null {
  const options = levyOptions(state, playerId, city);
  if (options.length === 0) return null;
  const every = RULES.cities.levy.everyTurns;
  const lines = options.map((option): LevyMenuLine => {
    let source = sourceWords(state, option);
    // A line whose wait differs from the shared one says so (The General Levy
    // at war).
    if (option.every !== every) {
      source += option.every === 1 ? '; again next turn' : `; again in ${option.every} turns`;
    }
    return {
      use: option.use,
      label: option.label,
      figure: figureWords(option),
      source,
      blocked: option.blocked,
    };
  });
  const open = lines.find((line) => line.blocked === null);
  const disabled = open === undefined;
  const title = disabled
    ? (lines[0]?.blocked ?? 'This town cannot levy now')
    : 'Spend one of this town’s citizens';
  const cost =
    `Costs 1 citizen (pop ${city.population} → ${Math.max(1, city.population - 1)}). ` +
    `Next levy here in ${every} ${every === 1 ? 'turn' : 'turns'}.`;
  return { lines, disabled, title, cost };
}

/**
 * Draws the button and, when `open`, the menu under it. `onToggle` flips the
 * menu; `onChoose` is handed the use a line was pressed for. A greyed line
 * carries its refusal as its hover, so it says what the reducer would say.
 */
export function renderLevyMenu(
  model: LevyMenuModel,
  open: boolean,
  onToggle: () => void,
  onChoose: (use: LevyUse) => void,
): HTMLElement {
  const box = element('div', 'city-levy');
  const button = element('button', 'btn btn-quiet btn-tiny city-levy-button', 'Levy a citizen ▾');
  button.type = 'button';
  button.disabled = model.disabled;
  button.title = model.title;
  button.setAttribute('aria-expanded', open && !model.disabled ? 'true' : 'false');
  button.addEventListener('click', onToggle);
  box.append(button);
  if (!open || model.disabled) return box;

  const menu = element('div', 'city-levy-menu');
  for (const line of model.lines) {
    const row = element('div', 'city-levy-row');
    const choose = element('button', 'city-levy-choice', line.label);
    choose.type = 'button';
    choose.disabled = line.blocked !== null;
    choose.title = line.blocked ?? line.source;
    choose.addEventListener('click', () => onChoose(line.use));
    row.append(choose);
    row.append(element('span', 'city-levy-figure num', line.figure));
    row.append(element('p', 'city-levy-source', line.blocked ?? line.source));
    menu.append(row);
  }
  menu.append(element('p', 'city-levy-cost', model.cost));
  box.append(menu);
  return box;
}
