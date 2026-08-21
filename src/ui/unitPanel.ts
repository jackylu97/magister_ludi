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

import type { Game } from '../sim/game';
import type { Unit } from '../sim/state';
import { unitDef } from '../sim/unitData';

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
  const { container, getGame, getUnit, foundCityBlocker, onFoundCity, onClose } = options;

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

    // A unit with stored orders is going somewhere by itself; say so, because
    // the tiles it will walk are not drawn while it is not the unit being
    // routed under the cursor.
    const remaining = unit.path?.length ?? 0;
    if (remaining > 0) {
      container.append(
        element('p', 'unit-note', `Marching · ${remaining} tile(s) to go`),
      );
    }

    container.append(renderActions(unit));
  }

  return { render };
}
