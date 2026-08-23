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
  growthSurplus,
  growthThreshold,
  hasResource,
  queueItemCost,
  queueItemName,
  turnsToBuild,
  turnsToFill,
  unitProductionCost,
} from '../sim/cities';
import { type BuildingId, BUILDING_IDS, buildingDef } from '../sim/buildingData';
import { isCombatant, isRanged } from '../sim/combat';
import type { Command } from '../sim/commands';
import { type Game, dispatch } from '../sim/game';
import { meterEffects } from '../sim/meters';
import { resourceDef } from '../sim/resourceData';
import { type City, type QueueItem, hasEndedTurn } from '../sim/state';
import { isUnlocked, requiredResource } from '../sim/tech';
import { type UnitTypeId, UNIT_TYPE_IDS, unitDef } from '../sim/unitData';
import { HAMMER, YIELD_GLYPH, effectFigure, signedFigure, turnsLabel } from './figures';
import { createInfoCard } from './infoCard';

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

  // --- the hover card ------------------------------------------------------

  /**
   * The note that comes up beside a build row. One card for the whole panel —
   * see `infoCard.ts` for why it is a note and not a control.
   *
   * The panel rebuilds its whole DOM on every render, which takes the anchor out
   * from under an open card without a `pointerleave` ever firing, so `render`
   * puts it away first thing.
   */
  const info = createInfoCard({ className: 'info-card' });

  /** A figure chip: the number large, its name small and quiet beneath it. */
  function stat(label: string, value: string): HTMLElement {
    const box = element('div', 'info-card-stat');
    box.append(element('span', 'info-card-stat-value', value));
    box.append(element('span', 'info-card-stat-label', label));
    return box;
  }

  function note(text: string): HTMLElement {
    return element('li', undefined, text);
  }

  /**
   * What a unit *is*, entirely out of `data/units.json`.
   *
   * Every line here is the presence of a field rather than a comparison against
   * an id — `foundsCity`, `charges`, `requiresResource`, the `rangedStrength`
   * pair — which is the discipline `unitData.ts` asks for in so many words: a
   * designer who adds a second settler-like unit adds one data row and this card
   * describes it correctly without being touched. Nothing here computes: the
   * price is `unitProductionCost`'s answer and the estimate is `turnsToBuild`'s.
   *
   * `modelClass` is doing double duty as the unit's *role*, and that is honest
   * rather than a shortcut. It is the roster's silhouette class (see the field's
   * docblock) — melee, ranged, siege, mounted, scout — which is exactly the
   * shorthand a player uses for what a unit is for, and it is the only such
   * grouping the data declares.
   */
  function unitCard(city: City, id: UnitTypeId, index: number): Node {
    const { state } = getGame();
    const def = unitDef(id);
    const box = element('div');

    const head = element('div', 'info-card-head');
    head.append(element('span', 'info-card-name', def.name));
    head.append(element('span', 'info-card-kind', `${def.category} · ${def.modelClass}`));
    box.append(head);

    const figures = element('div', 'info-card-figures');
    figures.append(
      element(
        'span',
        'info-card-cost',
        `${unitProductionCost(state, city.ownerId, id)}${HAMMER}`,
      ),
    );
    figures.append(
      element(
        'span',
        'info-card-turns',
        turnsLabel(turnsToBuild(state, city, { kind: 'unit', id }, index)),
      ),
    );
    box.append(figures);

    const stats = element('div', 'info-card-stats');
    // Fighting numbers only for things that fight, exactly as the unit panel's
    // sheet does it: a settler carrying a strength of 0 reads as a statistic
    // rather than as "this is not a soldier".
    if (isCombatant(def)) stats.append(stat('Strength', String(def.combatStrength)));
    if (isRanged(def)) stats.append(stat('Ranged', `${def.rangedStrength} · ${def.range}⌖`));
    stats.append(stat('Moves', String(def.movement)));
    stats.append(stat('Sight', String(def.sight)));
    box.append(stats);

    const notes = element('ul', 'info-card-notes');
    if (def.foundsCity) notes.append(note('Founds a city, and is spent doing it'));
    if (def.charges !== undefined) {
      notes.append(note(`Builds ${def.charges} improvements, then is spent`));
    }
    if (def.haltsGrowth) notes.append(note('The city banks no food while this is at the front'));
    if (def.minCityPop > 0) notes.append(note(`Needs a city of ${def.minCityPop}`));
    if (def.requiresResource !== undefined) {
      const resource = resourceDef(def.requiresResource);
      notes.append(note(`Needs improved ${resource.emoji} ${resource.name}`));
    }
    if (def.upgradesTo !== undefined) {
      notes.append(note(`Becomes a ${unitDef(def.upgradesTo).name} in time`));
    }
    if (notes.childElementCount > 0) box.append(notes);
    return box;
  }

  /**
   * What a building does, out of `data/buildings.json` and nothing else.
   *
   * A building's effect is a handful of flat numbers by design (see
   * `buildingData.ts`), so the card is those numbers with their voices on. The
   * *empire-wide* worth of one — what it would add to the cities this player has
   * today — is `buildingYieldDelta`'s answer and the star chart's to show; this
   * card is the smaller, plainer statement of what the building itself is.
   */
  function buildingCard(city: City, id: BuildingId, index: number): Node {
    const def = buildingDef(id);
    const box = element('div');

    const head = element('div', 'info-card-head');
    head.append(element('span', 'info-card-name', def.name));
    head.append(element('span', 'info-card-kind', 'building'));
    box.append(head);

    const figures = element('div', 'info-card-figures');
    figures.append(element('span', 'info-card-cost', `${def.cost}${HAMMER}`));
    figures.append(
      element(
        'span',
        'info-card-turns',
        turnsLabel(turnsToBuild(getGame().state, city, { kind: 'building', id }, index)),
      ),
    );
    box.append(figures);

    const notes = element('ul', 'info-card-notes');
    // Only what it actually pays: a row of four zeroes would say a monument does
    // three things badly rather than one thing well.
    const flat: [string, number][] = [
      [YIELD_GLYPH.food, def.food],
      [YIELD_GLYPH.production, def.production],
      [YIELD_GLYPH.gold, def.gold],
      [YIELD_GLYPH.culture, def.culture],
    ];
    for (const [glyph, value] of flat) {
      if (value !== 0) notes.append(note(`${value > 0 ? '+' : ''}${value}${glyph} every turn`));
    }
    // Fractional and floored per building when it is applied (`cityYields`), so
    // it is quoted per citizen rather than as a total this card cannot know.
    if (def.sciencePerPop !== 0) {
      notes.append(note(`+${def.sciencePerPop}${YIELD_GLYPH.science} per citizen`));
    }
    if (notes.childElementCount === 0) notes.append(note('No yields of its own'));
    box.append(notes);
    return box;
  }

  /**
   * The card for whatever a row stands for, at the queue position it occupies —
   * or, for a row in the "add to queue" grid, the position it would land in.
   */
  function itemCard(city: City, item: QueueItem, index: number): Node {
    return item.kind === 'unit'
      ? unitCard(city, item.id, index)
      : buildingCard(city, item.id, index);
  }

  // --- sections ------------------------------------------------------------

  /**
   * The five figures, and — under them — every empire modifier that is currently
   * inside them.
   *
   * The chips are `cityYields`, which since Milestone 10 has the happiness and
   * authority multipliers already folded in. A multiplied number shown without
   * the reason beside it is a total computed beside its list, which is exactly
   * what CLAUDE.md's rule 5 forbids, so each active effect gets a line naming
   * the meter, its value and what it is doing. Nothing is listed when nothing is
   * biting, which is most of a game.
   */
  function renderYields(city: City): HTMLElement {
    const { state } = getGame();
    const yields = cityYields(state, city);
    const box = element('div', 'city-yields-box');
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
    box.append(row);

    const effects = meterEffects(state, city.ownerId);
    if (effects.length > 0) {
      const list = element('ul', 'city-modifiers');
      for (const effect of effects) {
        const line = element('li', effect.percent < 0 ? 'city-modifier is-bad' : 'city-modifier');
        const meter = effect.meter === 'happiness' ? 'Happiness' : 'Authority';
        line.append(element('span', undefined, `${meter} ${signedFigure(effect.value)}`));
        line.append(element('span', 'city-modifier-effect', effectFigure(effect)));
        list.append(line);
      }
      box.append(list);
    }
    return box;
  }

  /**
   * Growth: how full the basket is, and when it will tip over.
   *
   * The surplus shown is the net figure the city banks — what it grows on — not
   * the gross food it harvests, because the gross number is the one that makes
   * a starving city look healthy.
   */
  function renderGrowth(city: City): HTMLElement {
    // `growthSurplus`, not the subtraction: since M10 what a city banks is the
    // harvest less upkeep, less a settler at the front of the queue, less
    // whatever a happiness deficit takes — and the panel must quote the number
    // the basket will actually receive.
    const surplus = growthSurplus(getGame().state, city);
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

    const cost = queueItemCost(getGame().state, city.ownerId, item) ?? 0;
    // The front of the queue is index 0, which is the one position the banked
    // hammers belong to — the same call every other estimate in this panel
    // makes, so the bar and the rows can never round differently.
    const turns = turnsToBuild(getGame().state, city, item, 0);
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
      const name = element('span', 'city-queue-name', queueItemName(item));
      row.append(name);
      row.append(
        element(
          'span',
          'city-queue-cost',
          `${queueItemCost(getGame().state, city.ownerId, item) ?? '?'}${HAMMER}`,
        ),
      );
      // The estimate is for *this* item at the position it is standing in, so
      // only the front row counts the basket — see `turnsToBuild`. Row two is
      // therefore "and then this long", not "and by then it will be turn nine".
      row.append(
        element(
          'span',
          'city-queue-turns',
          turnsLabel(turnsToBuild(getGame().state, city, item, index)),
        ),
      );
      // The name is the anchor rather than the whole row: the row's last two
      // children are buttons, and a card raised by hovering "remove" would be
      // describing the thing you are about to delete.
      info.bind(name, () => itemCard(city, item, index));

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
      // The live price, not the base one: a settler gets dearer with every
      // settler this player has built, and the button quotes exactly what
      // `advanceProduction` will charge (`unitProductionCost`).
      const cost = unitProductionCost(state, city.ownerId, id);
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
      // "needs improved ⛏️ Iron", not "needs ⛏️ Iron". Since M7 owning the seam
      // is not enough — a worker has to mine it (`hasResource`, design ledger
      // Entry IX's correction) — and a button that said only "needs Iron" to a
      // player who is *standing on* their own iron hill would be a button
      // telling them to go to war over something they already have.
      const needs =
        missing === null ? '' : `improved ${resourceDef(missing).emoji} ${resourceDef(missing).name}`;
      // A label rather than a `title`, and that is the hover card's doing: a
      // native tooltip would arrive a second *after* the card, on top of it,
      // saying less. The sentence is kept — it is the only place a screen
      // reader is told why a greyed row is greyed — it has simply stopped
      // being a second thing that draws.
      button.setAttribute(
        'aria-label',
        needsResource
          ? `${def.name} — needs ${needs}`
          : tooSmall
            ? `${def.name} — needs population ${def.minCityPop}`
            : `${def.name} — ${cost} production`,
      );
      button.append(element('span', 'city-buildable-name', def.name));
      // An unbuildable row keeps its reason where the price goes: a "needs
      // improved Iron" that had to share the line with "9⚙ · 4t" would be
      // quoting a schedule for something that is not going to start.
      button.append(
        element(
          'span',
          'city-buildable-cost',
          needsResource
            ? `needs ${needs}`
            : `${cost}${HAMMER} · ${turnsLabel(turnsToBuild(state, city, { kind: 'unit', id }, city.queue.length))}`,
        ),
      );
      // Priced at the back of the queue, because that is where pressing this
      // would put it — `city.queue.length` is 0 exactly when the queue is
      // empty, which is the one case the banked hammers are already its own.
      info.bind(button, () => itemCard(city, { kind: 'unit', id }, city.queue.length));
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
      button.setAttribute('aria-label', `${def.name} — ${def.cost} production`);
      button.append(element('span', 'city-buildable-name', def.name));
      button.append(
        element(
          'span',
          'city-buildable-cost',
          `${def.cost}${HAMMER} · ${turnsLabel(turnsToBuild(state, city, { kind: 'building', id }, city.queue.length))}`,
        ),
      );
      info.bind(button, () => itemCard(city, { kind: 'building', id }, city.queue.length));
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
    // Every anchor in this panel is about to stop existing, and an open card
    // would be left pointing at a row that has gone. See `infoCard.ts`.
    info.hide();
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
          'citizen there, or any other tile in the ring to move one to it. ' +
          'A unit standing in the ring is selected by clicking its badge.',
      ),
    );
  }

  return { render };
}
