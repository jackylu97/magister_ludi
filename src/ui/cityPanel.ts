/**
 * The city screen: what a city makes, how fast it is growing, and what it is
 * building next.
 *
 * A DOM panel, built and torn down from the simulation on every render. It reads
 * the city through the same functions the turn pipeline uses — `cityYields`,
 * `growthThreshold`, `turnsToFill` — so a number shown here is the number the
 * end of turn will act on, not a second implementation of the same arithmetic
 * that drifts a patch later.
 *
 * Editing production
 * ------------------
 * Every edit — add, remove, move up — is expressed as a *whole new queue* and
 * sent as one `setCityProduction` command (see `commands.ts` for why the command
 * is a replacement rather than a diff). So the panel's job is only ever "build
 * the array the player now wants and dispatch it", and a rejected command leaves
 * both the city and the panel exactly as they were.
 *
 * Gating
 * ------
 * The panel is only ever shown for one of the local seat's own cities —
 * `controls.openCity()` returns null for anybody else's — and its buttons switch
 * off once that seat has ended its turn, because the reducer would refuse them.
 * The readout stays live either way: looking is not commanding.
 */

import {
  cityYields,
  foodUpkeep,
  growthThreshold,
  hasResource,
  queueItemCost,
  queueItemName,
  turnsToFill,
} from '../sim/cities';
import { BUILDING_IDS, buildingDef } from '../sim/buildingData';
import type { Command } from '../sim/commands';
import { type Game, dispatch } from '../sim/game';
import { resourceDef } from '../sim/resourceData';
import { type City, type QueueItem, hasEndedTurn } from '../sim/state';
import { isUnlocked, requiredResource } from '../sim/tech';
import { UNIT_TYPE_IDS, unitDef } from '../sim/unitData';

export interface CityPanelOptions {
  /** The element the panel lives in. Emptied and rebuilt on every render. */
  container: HTMLElement;
  getGame: () => Game;
  localPlayerId: () => number;
  /** The city to show, or null to show nothing. */
  getCity: () => City | null;
  onClose: () => void;
  /** Called after a command lands, so the rest of the page can catch up. */
  onChanged: () => void;
}

export interface CityPanel {
  render(): void;
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

export function createCityPanel(options: CityPanelOptions): CityPanel {
  const { container, getGame, localPlayerId, getCity, onClose, onChanged } = options;

  /** Sends a queue and repaints. A refused command changes nothing at all. */
  function commit(city: City, queue: QueueItem[]): void {
    const command: Command = {
      type: 'setCityProduction',
      playerId: localPlayerId(),
      cityId: city.id,
      queue,
    };
    if (!dispatch(getGame(), command).ok) return;
    onChanged();
  }

  /** A copy of the city's queue: the panel edits a draft, never the state. */
  function draft(city: City): QueueItem[] {
    return city.queue.map((item) =>
      item.kind === 'unit'
        ? { kind: 'unit', id: item.id }
        : { kind: 'building', id: item.id },
    );
  }

  // --- sections ------------------------------------------------------------

  function renderYields(city: City): HTMLElement {
    const yields = cityYields(getGame().state, city);
    const row = element('div', 'city-yields');
    const entries: [string, string, number][] = [
      ['food', 'Food', yields.food],
      ['production', 'Prod', yields.production],
      ['gold', 'Gold', yields.gold],
      ['science', 'Sci', yields.science],
      ['culture', 'Cult', yields.culture],
    ];
    for (const [key, label, value] of entries) {
      const chip = element('div', `city-yield is-${key}`);
      chip.append(element('span', 'city-yield-value', String(value)));
      chip.append(element('span', 'city-yield-label', label));
      row.append(chip);
    }
    return row;
  }

  /**
   * Growth: how full the basket is, and when it will tip over.
   *
   * The surplus shown is the net figure the city banks — what it grows on — not
   * the gross food it harvests, because the gross number is the one that makes
   * a starving city look healthy.
   */
  function renderGrowth(city: City): HTMLElement {
    const yields = cityYields(getGame().state, city);
    const surplus = yields.food - foodUpkeep(city);
    const threshold = growthThreshold(city.population);
    const turns = turnsToFill(threshold - city.foodBasket, surplus);

    const box = element('div', 'city-progress');
    const label = element('div', 'city-progress-label');
    label.append(element('span', undefined, 'Growth'));
    const sign = surplus > 0 ? '+' : '';
    // The rate is a figure, so it carries the mono class; a shrinking city is
    // the one state in this panel that gets the alarm colour.
    label.append(
      element(
        'span',
        surplus < 0 ? 'city-progress-rate is-bad' : 'city-progress-rate',
        turns === null
          ? `${sign}${surplus} food · stalled`
          : `${sign}${surplus} food · ${turns}t`,
      ),
    );
    box.append(label);
    box.append(bar(city.foodBasket, threshold, 'is-food'));
    box.append(
      element('div', 'city-progress-note', `${Math.floor(city.foodBasket)} / ${threshold}`),
    );
    return box;
  }

  /**
   * The citizen line: how many are placed, and how many of those the player
   * placed by hand.
   *
   * The pinned count is the number of pins currently *honoured*, not the length
   * of `city.lockedTiles` — a pin on a tile the city has lost is kept in the
   * state (see `assignCitizens`) but there is no citizen standing on it, and a
   * panel that counted it would be counting a citizen that does not exist.
   */
  function renderCitizens(city: City): HTMLElement {
    const pinned = city.lockedTiles.filter((cell) =>
      city.workedTiles.some((tile) => tile.col === cell.col && tile.row === cell.row),
    ).length;
    const line = element('p', 'city-citizens');
    line.append(element('span', undefined, 'Citizens'));
    line.append(
      element(
        'span',
        'city-citizens-count',
        `${city.workedTiles.length}/${city.population} assigned · ${pinned} pinned`,
      ),
    );
    return line;
  }

  function bar(value: number, total: number, className: string): HTMLElement {
    const track = element('div', 'city-bar');
    const fill = element('div', `city-bar-fill ${className}`);
    const fraction = total <= 0 ? 0 : Math.max(0, Math.min(1, value / total));
    fill.style.width = `${(fraction * 100).toFixed(1)}%`;
    track.append(fill);
    return track;
  }

  function renderProduction(city: City): HTMLElement {
    const box = element('div', 'city-progress');
    const item = city.queue[0];
    const perTurn = cityYields(getGame().state, city).production;

    const label = element('div', 'city-progress-label');
    label.append(element('span', undefined, 'Production'));
    if (!item) {
      label.append(element('span', 'city-progress-rate is-bad', 'nothing queued'));
      box.append(label);
      return box;
    }

    const cost = queueItemCost(item) ?? 0;
    const turns = turnsToFill(cost - city.hammerBasket, perTurn);
    label.append(
      element(
        'span',
        'city-progress-rate',
        turns === null ? `+${perTurn} · stalled` : `+${perTurn} · ${turns}t`,
      ),
    );
    box.append(label);
    box.append(bar(city.hammerBasket, cost, 'is-production'));
    // What is being built is a name and what is banked is a number, so the note
    // is two elements rather than one string: the faces differ.
    const note = element('div', 'city-progress-note');
    note.append(element('span', 'city-progress-item', queueItemName(item)));
    note.append(
      element('span', undefined, `${Math.floor(city.hammerBasket)} / ${cost}`),
    );
    box.append(note);
    return box;
  }

  /**
   * The queue, with the two edits that cover every reordering a short queue
   * needs: remove, and move up. "Move up" repeated is "move to the front", and
   * a drag-and-drop list for three items would be more code than the panel.
   */
  function renderQueue(city: City, locked: boolean): HTMLElement {
    const box = element('div', 'city-queue');
    box.append(element('h3', undefined, 'Queue'));
    if (city.queue.length === 0) {
      box.append(element('p', 'hint', 'Nothing queued. Add something below.'));
      return box;
    }

    const list = element('ol', 'city-queue-list');
    city.queue.forEach((item, index) => {
      const row = element('li');
      row.append(element('span', 'city-queue-name', queueItemName(item)));
      row.append(element('span', 'city-queue-cost', `${queueItemCost(item) ?? '?'}h`));

      const up = element('button', 'city-icon-button', '↑');
      up.type = 'button';
      up.title = 'Move up';
      up.disabled = locked || index === 0;
      up.addEventListener('click', () => {
        const next = draft(city);
        const moved = next[index]!;
        next[index] = next[index - 1]!;
        next[index - 1] = moved;
        commit(city, next);
      });

      const remove = element('button', 'city-icon-button', '×');
      remove.type = 'button';
      remove.title = 'Remove';
      remove.disabled = locked;
      remove.addEventListener('click', () => {
        const next = draft(city);
        next.splice(index, 1);
        commit(city, next);
      });

      row.append(up, remove);
      list.append(row);
    });
    box.append(list);
    return box;
  }

  /**
   * Everything the city could add: every *unlocked* unit type, and every
   * unlocked building it has not built and has not already queued.
   *
   * A unit the city is too small for is shown *disabled with its reason* rather
   * than hidden — "why can I not build a settler" is a question the interface
   * should answer, and an option that silently does not exist answers nothing.
   *
   * A unit the player has not researched is a different case and *is* hidden:
   * it is not a thing this city cannot do yet, it is a thing that does not exist
   * yet, and fifteen greyed-out rows would bury the four the player can press.
   * The tech screen is where the rest of the roster is, with what it costs to
   * get there. Availability is asked of `isUnlocked` — the same function the
   * reducer validates the queue with — so this list can never offer a button
   * `setCityProduction` would refuse.
   */
  function renderBuildables(city: City, locked: boolean): HTMLElement {
    const { state } = getGame();
    const box = element('div', 'city-buildables');
    box.append(element('h3', undefined, 'Add to queue'));
    const grid = element('div', 'city-buildable-grid');

    const add = (item: QueueItem): void => {
      const next = draft(city);
      next.push(item);
      commit(city, next);
    };

    for (const id of UNIT_TYPE_IDS) {
      if (!isUnlocked(state, city.ownerId, 'unit', id)) continue;
      const def = unitDef(id);
      const tooSmall = city.population < def.minCityPop;
      // A strategic resource the player does not control is the same *kind* of
      // refusal as a city that is too small — the unit exists, this empire just
      // cannot field it yet — so it is shown greyed with its reason rather than
      // hidden, unlike an unresearched type. `buildError` is the reducer's own
      // sentence; the technology half of it can never fire here, because a type
      // that failed it was skipped by `isUnlocked` above.
      const missing = requiredResource('unit', id);
      const needsResource =
        missing !== null && !hasResource(state, city.ownerId, missing);
      const button = element('button', 'city-buildable');
      button.type = 'button';
      button.disabled = locked || tooSmall || needsResource;
      button.title = needsResource
        ? `Needs ${resourceDef(missing).name}`
        : tooSmall
          ? `Needs population ${def.minCityPop}`
          : `${def.name} — ${def.cost} hammers`;
      button.append(element('span', 'city-buildable-name', def.name));
      button.append(
        element(
          'span',
          'city-buildable-cost',
          needsResource ? `needs ${resourceDef(missing).name}` : `${def.cost}h`,
        ),
      );
      button.addEventListener('click', () => add({ kind: 'unit', id }));
      grid.append(button);
    }

    const queued = new Set(
      city.queue.filter((item) => item.kind === 'building').map((item) => item.id),
    );
    for (const id of BUILDING_IDS) {
      if (city.buildings.includes(id) || queued.has(id)) continue;
      if (!isUnlocked(state, city.ownerId, 'building', id)) continue;
      const def = buildingDef(id);
      const button = element('button', 'city-buildable is-building');
      button.type = 'button';
      button.disabled = locked;
      button.title = `${def.name} — ${def.cost} hammers`;
      button.append(element('span', 'city-buildable-name', def.name));
      button.append(element('span', 'city-buildable-cost', `${def.cost}h`));
      button.addEventListener('click', () => add({ kind: 'building', id }));
      grid.append(button);
    }

    box.append(grid);
    return box;
  }

  function renderBuilt(city: City): HTMLElement | null {
    if (city.buildings.length === 0) return null;
    const box = element('div', 'city-built');
    box.append(element('h3', undefined, 'Built'));
    box.append(
      element(
        'p',
        'hint',
        city.buildings.map((id) => buildingDef(id).name).join(' · '),
      ),
    );
    return box;
  }

  // --- the whole panel -----------------------------------------------------

  function render(): void {
    const city = getCity();
    container.replaceChildren();
    container.hidden = city === null;
    if (!city) return;

    const { state } = getGame();
    // A finished seat may read its cities but not re-plan them; the reducer
    // would refuse, so the buttons say so first.
    const locked = hasEndedTurn(state, localPlayerId());

    const header = element('div', 'city-header');
    const title = element('div', 'city-title');
    title.append(element('h2', undefined, city.name));
    title.append(element('span', 'city-size', `Size ${city.population}`));
    header.append(title);

    const close = element('button', 'city-close', '×');
    close.type = 'button';
    close.title = 'Close (Esc)';
    close.addEventListener('click', onClose);
    header.append(close);
    container.append(header);

    container.append(renderYields(city));
    container.append(renderCitizens(city));
    container.append(renderGrowth(city));
    container.append(renderProduction(city));
    container.append(renderQueue(city, locked));
    const built = renderBuilt(city);
    if (built) container.append(built);
    container.append(renderBuildables(city, locked));

    if (locked) {
      container.append(
        element('p', 'hint', `You have ended turn ${state.turn}; production is locked.`),
      );
    }
    container.append(
      element(
        'p',
        'hint',
        'Dots on the map are the tiles this city works. Click one to pin a ' +
          'citizen there, or an empty tile in the ring to move one to it.',
      ),
    );
  }

  return { render };
}
