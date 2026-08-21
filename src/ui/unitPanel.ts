/**
 * The unit sheet: who is selected, what shape they are in, and what they can do
 * about it.
 *
 * It shares the right-hand slot with the city screen and the two are mutually
 * exclusive — selecting a unit closes an open city and opening a city drops the
 * selection (see `src/ui/controls.ts`), so this panel simply renders whatever
 * `getUnit` returns and hides itself when that is nothing. Escape reaches it the
 * same way it always did: the last layer Escape backs out of is the selection,
 * and losing the selection is what closes this.
 *
 * Where the verbs live
 * --------------------
 * Found City used to sit in the bottom-left context card, beside a readout of
 * the ground under the pointer. That card describes; it does not act. A unit's
 * orders belong to the unit, so they are here, as an *actions list* rather than
 * one hard-coded button — fortify, sleep, disband and the rest are the same
 * shape and will slot in beside it.
 *
 * Every action is enabled by exactly the rule the reducer applies, and titled
 * with the reason when it is not: the caller hands over a blocker string (for
 * founding, `foundingError` by way of `controls.foundCityBlocker`), so a
 * disabled button and a rejected command can never disagree.
 *
 * Built and torn down from the simulation on every render, like the city panel:
 * the state is the truth and a selection is at most a few dozen elements.
 */

import { getTileAt } from '../sim/map';
import type { Game } from '../sim/game';
import { tileMoveCost } from '../sim/pathfind';
import type { Unit } from '../sim/state';
import { unitDef } from '../sim/unitData';
import { fullMovement } from '../sim/units';

export interface UnitPanelOptions {
  /** The element the panel lives in. Emptied and rebuilt on every render. */
  container: HTMLElement;
  getGame: () => Game;
  /** The selected unit, re-read every render, or null for none. */
  getUnit: () => Unit | null;
  /**
   * Why the selected unit cannot found a city where it stands: `null` when it
   * can, a sentence when it cannot, `undefined` when there is no unit at all.
   * The shape `controls.foundCityBlocker()` already answers in.
   */
  foundCityBlocker: () => string | null | undefined;
  onFoundCity: () => void;
  /**
   * Why the selected unit's standing order cannot be cancelled — the same
   * three-valued shape as `foundCityBlocker`, answered by
   * `controls.cancelOrderBlocker()`.
   */
  cancelOrderBlocker: () => string | null | undefined;
  onCancelOrder: () => void;
  /** Drops the selection — the × button and, through `controls`, Escape. */
  onClose: () => void;
}

export interface UnitPanel {
  render(): void;
}

/** One row of the actions list. Everything a future verb will need. */
interface UnitAction {
  label: string;
  /** The keyboard shortcut that does the same job, worn on the button. */
  key?: string;
  /** Why it cannot be taken, or `null` when it can. */
  blocked: string | null;
  /** What it is for, shown when nothing is blocking it. */
  hint: string;
  run: () => void;
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

export function createUnitPanel(options: UnitPanelOptions): UnitPanel {
  const {
    container,
    getGame,
    getUnit,
    foundCityBlocker,
    onFoundCity,
    cancelOrderBlocker,
    onCancelOrder,
    onClose,
  } = options;

  /**
   * How many more turns the unit's standing order will take, as an estimate the
   * panel is honest about calling one (hence the `~`).
   *
   * It re-walks the stored waypoints against the movement rules — this turn's
   * remaining points first, then a full allowance per turn, with the "entering
   * always costs at least what you have left" floor that `movement.ts` applies —
   * and counts the refills. It is an estimate rather than a promise because the
   * board can change under the order: a unit may block a tile, terrain may stop
   * the march, and the reducer will re-decide all of that at the time. Deriving
   * it here rather than storing it on the unit is deliberate; a cached number
   * would be one more thing that can be wrong.
   */
  function turnsRemaining(unit: Unit): number {
    const { map } = getGame().state;
    const allowance = fullMovement(unit);
    let turns = 0;
    let budget = Math.max(0, unit.movesLeft);
    for (const cell of unit.path ?? []) {
      if (budget <= 0) {
        turns += 1;
        budget = allowance;
      }
      const tile = getTileAt(map, cell.col, cell.row);
      // An impassable waypoint means the order is going to be abandoned, not
      // that it takes forever; stop counting rather than inventing a number.
      const cost = tile ? tileMoveCost(tile) : null;
      if (cost === null) break;
      budget = Math.max(0, budget - cost);
    }
    // Anything still on the list is at least one more turn of marching, even if
    // the arithmetic above spent nothing (a one-tile order with points left is
    // still resolved at the turn change).
    return Math.max(1, turns);
  }

  /**
   * A statistic and its label: the value in the mono face because it is a
   * number, the label in the specimen's mono eyebrow. Hit points go vermilion
   * once the unit is hurt, because a wounded unit is the one fact on this panel
   * that changes what the player should do next.
   */
  function stat(label: string, value: string, alarm: boolean): HTMLElement {
    const box = element('div', alarm ? 'unit-stat is-alarm' : 'unit-stat');
    box.append(element('span', 'unit-stat-value', value));
    box.append(element('span', 'unit-stat-label', label));
    return box;
  }

  /**
   * What this unit can do. One entry per verb, in the order they are offered.
   *
   * Founding is only listed for units that could ever found — `foundsCity` in
   * `data/`, never a comparison against the string "settler" — so a warrior's
   * sheet does not carry a button that will refuse it for the rest of the game.
   */
  function actionsFor(unit: Unit): UnitAction[] {
    const actions: UnitAction[] = [];
    if (unitDef(unit.type).foundsCity) {
      // `undefined` means "no unit selected", which cannot happen while a unit
      // is being rendered — but it is a different value from `null` ("no
      // blocker"), and collapsing the two would disable the button for exactly
      // the case it should be enabled in.
      const blocker = foundCityBlocker();
      actions.push({
        label: 'Found City',
        key: 'B',
        blocked: blocker === undefined ? 'No unit selected' : blocker,
        hint: 'Found a city here',
        run: onFoundCity,
      });
    }
    // Only offered while there is something to cancel: a permanently disabled
    // "Cancel Order" on every unit that has never been given one would be a
    // button that means nothing, exactly as Found City is on a warrior.
    if (unit.path && unit.path.length > 0) {
      const blocker = cancelOrderBlocker();
      actions.push({
        label: 'Cancel Order',
        blocked: blocker === undefined ? 'No unit selected' : blocker,
        hint: 'Stop here and forget the rest of the route',
        run: onCancelOrder,
      });
    }
    return actions;
  }

  function renderActions(unit: Unit): HTMLElement {
    const box = element('div', 'unit-actions');
    box.append(element('h3', undefined, 'Actions'));
    const actions = actionsFor(unit);
    if (actions.length === 0) {
      box.append(element('p', 'hint', 'Nothing to do but move, for now.'));
      return box;
    }

    for (const action of actions) {
      const button = element('button', 'btn btn-second unit-action');
      button.type = 'button';
      button.disabled = action.blocked !== null;
      button.title = action.blocked ?? action.hint;
      button.append(element('span', 'unit-action-label', action.label));
      if (action.key) button.append(element('kbd', 'unit-action-key', action.key));
      button.addEventListener('click', action.run);
      box.append(button);
    }
    return box;
  }

  function render(): void {
    const unit = getUnit();
    container.replaceChildren();
    container.hidden = unit === null;
    if (!unit) return;

    const def = unitDef(unit.type);
    const owner = getGame().state.players[unit.ownerId];
    // The accent is the owner's colour, the same hex the seat chip and the city
    // banner wear. Only ever your own unit is selectable, so in practice this is
    // "your colour" — but it is read from the unit, not assumed.
    container.style.setProperty('--unit-color', owner?.color ?? 'var(--ink)');

    const header = element('div', 'unit-header');
    const title = element('div', 'unit-title');
    title.append(element('h2', undefined, def.name));
    title.append(element('span', 'unit-owner', owner?.name ?? 'Unowned'));
    header.append(title);

    const close = element('button', 'city-close', '×');
    close.type = 'button';
    close.title = 'Deselect (Esc)';
    close.addEventListener('click', onClose);
    header.append(close);
    container.append(header);

    const stats = element('div', 'unit-stats');
    stats.append(stat('Health', `${unit.hp}/${def.maxHp}`, unit.hp < def.maxHp));
    stats.append(
      stat('Moves', `${unit.movesLeft}/${def.movement}`, unit.movesLeft <= 0),
    );
    container.append(stats);

    // A unit with stored orders is going somewhere by itself. The board draws
    // the route it will walk (dimmer than a hovered preview — see
    // `MapView.setCommittedPath`); this says how long it will be busy, which the
    // route cannot, and it is the line the Cancel Order button below answers.
    if (unit.path && unit.path.length > 0) {
      container.append(
        element('p', 'unit-note', `En route · ~${turnsRemaining(unit)} turns`),
      );
    }

    container.append(renderActions(unit));
  }

  return { render };
}
