/**
 * The levy control (batch L; the interface the user picked is option A of the
 * levies sketch). Since 2026-11-20 the city screen draws one button a levy line
 * near the top of the town panel, and a press opens a small confirm
 * (`renderLevyConfirm`) with what the levy gives and what it costs.
 *
 * One line per thing the player's held cards let a levy buy, each with its
 * exact figure and the granting card's name, and a cost line: the population
 * change and how long the town waits before it may levy again. While no line
 * can be chosen — most often because the town is still waiting — the panel
 * says why on a line. A town whose owner holds no levy card gets nothing.
 *
 * The `rite` line (Human Sacrifice, batch DT19) has no one thing to buy. Its
 * confirm lists the rites the empire knows, each with what it does, or the rite
 * gate's own refusal. Pressing a rite spends the citizen.
 *
 * Split in two: `levyMenuModel` is pure and says what the control holds;
 * `renderLevyConfirm` draws a line's confirm and hands the choice back through a
 * callback. This module never dispatches — the city panel does, through its own
 * reporter.
 */

import { buildingDef, isBuildingId } from '../sim/buildingData';
import { type LevyOption, levyOptions, levyStandingWait } from '../sim/levies';
import { riteCostAhead, riteCostFor } from '../sim/religion';
import type { RiteId } from '../sim/religionData';
import { type City, type GameState, cityById, citiesOf } from '../sim/state';
import type { LevyUse } from '../sim/statecraftData';
import { unitDef } from '../sim/unitData';
import { YIELD_GLYPH, figure } from './figures';
import { riteOfferText } from './riteOffer';
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
  /** The rites the line opens. Present only on the `rite` line. */
  rites?: LevyMenuRite[];
}

/** One rite under the `rite` line. */
interface LevyMenuRite {
  rite: RiteId;
  name: string;
  /** What it does and how long it lasts (`riteOfferText`), or the refusal. */
  words: string;
  /** Why this rite cannot be chosen, or `null`. */
  blocked: string | null;
}

/** What the control shows for one town. `null` means no button at all. */
interface LevyMenuModel {
  lines: LevyMenuLine[];
  /** True while no line can be chosen. */
  disabled: boolean;
  /**
   * The reason the button is greyed, or what it does. The panel prints the
   * reason on a line under a greyed button; the button carries either as its
   * spoken description.
   */
  title: string;
  /** "Costs 1 citizen (pop 9 → 8). Next levy here in 5 turns." */
  cost: string;
}

/** The plain words under a line: the card's name and what it pays for. */
function sourceWords(state: GameState, playerId: number, option: LevyOption): string {
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
    case 'faith': return `${card} pays for each citizen before the levy`;
    case 'muster':
      return `${card}: a melee unit, counted as trained`;
    case 'conscript':
      return `${card}: a melee unit, not counted as trained`;
    // Expansionist batch E1.
    case 'worker':
      return `${card}: a worker, not counted as trained`;
    case 'settler':
      return `${card}: a settler, not counted as trained`;
    case 'wonder': {
      const target = option.targetCityId === null ? undefined : cityById(state, option.targetCityId);
      const front = target?.queue[0];
      const wonder =
        front && front.kind === 'building' && isBuildingId(front.id) ? buildingDef(front.id).name : undefined;
      return target === undefined || wonder === undefined
        ? `${card}: to your nearest other town building a world wonder`
        : `${card}: to ${target.name}, which is building ${wonder}`;
    }
    case 'rite': {
      // The figure is the price's own, so The Capitulary of Herstal's half shows.
      const towns = citiesOf(state, playerId).length;
      const rise = riteCostAhead(state, playerId, towns) - riteCostFor(state, playerId);
      return `${card}: no faith and no prophet; your next rite costs ${rise} more faith`;
    }
    default: {
      const unhandled: never = option.use;
      void unhandled;
      return card;
    }
  }
}

/** The figure on the right of a line. */
function figureWords(state: GameState, playerId: number, option: LevyOption): string {
  if (option.faith !== undefined) return `+${figure(option.faith)}${YIELD_GLYPH.faith}`;
  if (option.hammers !== null) return `+${figure(option.hammers)}${YIELD_GLYPH.production}`;
  if (option.unit !== null) return unitDef(option.unit).name;
  if (option.use === 'rite') {
    const towns = citiesOf(state, playerId).length;
    return `${figure(towns)} ${towns === 1 ? 'town' : 'towns'}`;
  }
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
  // The empire's own wait, so the cost line stays true under Human Sacrifice.
  const every = levyStandingWait(state, playerId);
  const lines = options.map((option): LevyMenuLine => {
    let source = sourceWords(state, playerId, option);
    // A line whose wait differs from the shared one says so (The General Levy
    // at war).
    if (option.every !== every) {
      source += option.every === 1 ? '; again next turn' : `; again in ${option.every} turns`;
    }
    const line: LevyMenuLine = {
      use: option.use,
      label: option.label,
      figure: figureWords(state, playerId, option),
      source,
      blocked: option.blocked,
    };
    if (option.rites !== undefined) {
      line.rites = option.rites.map((choice) => ({
        rite: choice.rite,
        name: choice.name,
        words: choice.blocked ?? riteOfferText(state, playerId, choice.rite) ?? choice.name,
        blocked: choice.blocked,
      }));
    }
    return line;
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
 * The confirm under the city screen's levy buttons (the user, 2026-11-20:
 * "lets move the levies to the top, and give it a different UX than a dropdown
 * so it doesn't disappear with the rest of the menus"). A press on a levy's
 * button opens it; it says what the levy gives (the figure, and the granting
 * card with what it pays) and what it costs in citizens (`LevyMenuModel.cost`),
 * and the levy is sent only from here: "Levy" sends it, "Cancel" shuts it.
 *
 * The `rite` line has no one thing to buy, so its confirm lists the rites the
 * empire knows instead of a "Levy" button: pressing a rite spends the citizen,
 * and a rite that cannot be chosen is greyed with the rite gate's own words.
 * `onConfirm` is handed the rite for that line and nothing for any other.
 */
export function renderLevyConfirm(
  model: LevyMenuModel,
  line: LevyMenuLine,
  onConfirm: (rite?: RiteId) => void,
  onCancel: () => void,
): HTMLElement {
  const box = element('div', 'city-levy-confirm');
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', line.label);
  const head = element('div', 'city-levy-row');
  head.append(element('span', 'city-levy-label', line.label));
  head.append(element('span', 'city-levy-figure num', line.figure));
  head.append(element('p', 'city-levy-source', line.source));
  box.append(head);
  if (line.rites !== undefined) box.append(renderRiteList(line.rites, (rite) => onConfirm(rite)));
  box.append(element('p', 'city-levy-cost', model.cost));
  const actions = element('div', 'city-levy-actions');
  if (line.rites === undefined) {
    const levy = element('button', 'btn btn-primary btn-tiny city-levy-send', 'Levy');
    levy.type = 'button';
    levy.addEventListener('click', () => onConfirm());
    actions.append(levy);
  }
  const cancel = element('button', 'btn btn-quiet btn-tiny city-levy-cancel', 'Cancel');
  cancel.type = 'button';
  cancel.addEventListener('click', () => onCancel());
  actions.append(cancel);
  box.append(actions);
  return box;
}

/** The rites under the `rite` line: a name to press, and what it does or the refusal. */
function renderRiteList(rites: readonly LevyMenuRite[], onChoose: (rite: RiteId) => void): HTMLElement {
  const list = element('div', 'city-levy-rites');
  for (const entry of rites) {
    const row = element('div', 'city-levy-row');
    const choose = element('button', 'city-levy-choice', entry.name);
    choose.type = 'button';
    choose.disabled = entry.blocked !== null;
    choose.addEventListener('click', () => onChoose(entry.rite));
    row.append(choose);
    row.append(element('p', 'city-levy-source', entry.words));
    list.append(row);
  }
  return list;
}
