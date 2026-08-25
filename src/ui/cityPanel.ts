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
  type BuildingYieldContribution,
  borderGrowth,
  cityStageSums,
  cityYields,
  explainCityBuildings,
  growthSurplus,
  growthThreshold,
  hasResource,
  cityYieldPercents,
  productionModifiers,
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
import { growthPercent, meterEffects } from '../sim/meters';
import {
  type ModifierStage,
  type StageSums,
  MODIFIER_STAGES,
  STAGE_LABEL,
} from '../sim/modifiers';
import { CITY_YIELD_KEYS, type CityYieldKey, resourceDef } from '../sim/resourceData';
import { type ResourceYieldLine, cityResourceYields } from '../sim/resourceEffects';
import { resourceLabelNodes } from './resourceMark';
import { setYieldText, yieldMarkNode } from './yieldMark';
import { type City, type QueueItem, hasEndedTurn, playerById } from '../sim/state';
import { techDef } from '../sim/techData';
import { isUnlocked, requiredResource } from '../sim/tech';
import { type UnitTypeId, UNIT_TYPE_IDS, unitDef } from '../sim/unitData';
import { cityDisplayName } from './cityDisplay';
import {
  type YieldKey,
  HAMMER,
  YIELD_GLYPH,
  effectFigure,
  figure,
  percentFigure,
  signedFigure,
  turnsLabel,
} from './figures';
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
  /**
   * Whether the board's Buy Tiles mode is up, and how to flip it.
   *
   * The mode itself lives in `controls.ts`, beside the click precedence it
   * changes; this panel only owns the button that arms it, exactly as the lens
   * menu owns rows for a lens the board draws. Optional so that a panel built
   * without a board — the tests do this — is still a panel.
   */
  isBuyMode?: () => boolean;
  setBuyMode?: (on: boolean) => void;
}

export interface CityPanel {
  render(): void;
}

/**
 * The panel's element builder, and — since the yield glyphs became drawn marks —
 * its yield printer.
 *
 * `setYieldText` rather than `textContent`, which is the one edit that retired
 * the emoji from this whole file. Every figure in this panel is composed as text
 * in `YIELD_GLYPH` (`figures.ts`) and lands here: a build button's `40⚙`, a
 * building card's `+3🌾 every turn`, the modifier ledger's `⚙ +25%`. Routing the
 * *builder* means the composition code above is untouched and cannot be got
 * wrong, and it costs a substring check on strings that carry no glyph — which
 * is nearly all of them.
 */
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) setYieldText(el, text);
  return el;
}

/** One row of the modifier list: what it is, what it is worth, how it reads. */
export interface ModifierRow {
  label: string;
  figures: string;
  /** A malus, set in the alarm ink. */
  bad: boolean;
  /** A stage's own line — the fold, in the panel's louder ink. */
  stage: boolean;
}

/**
 * One stage of the modifier list, as the rows it prints: a heading carrying that
 * stage's summed percentages, and under it the lines it is the sum of.
 *
 * Except when it is the sum of exactly one line, which is the rework this
 * function exists for. Every percentage `cityStageSums` folds has a line here —
 * the meters, the luxuries, the hammers behind the current build, and nothing
 * else joins that fold — so a stage with one source is a heading that restates
 * its only line in different glyphs. From the two-stage rework (Entry XVII) until
 * this pass, a contented empire's panel therefore printed
 *
 *     Empire            🔬 +10%  🎭 +10%
 *     Happiness +8      🔬🎭 +10%
 *
 * which is the doubled science/culture bonus players reported: two rows, one
 * fact, differing only in whether the yields were listed apart or together. The
 * fold of one thing is that thing, so the stage and its reason share a row —
 * "Empire · Happiness +8   🔬🎭 +10%" — and the moment a second source joins,
 * the heading comes back to carry the net, which is the whole argument for
 * summing rather than compounding.
 *
 * A stage nothing joined prints nothing. One whose lines cancel to nothing still
 * prints: "Empire · no net change" over a +10% and a −10% is exactly the case a
 * player needs to find, and it has two sources, so it is never collapsed.
 *
 * Pure, and separated from the DOM for the reason `yieldRowLayout` is: it is the
 * half of the panel that decides what a player *sees twice*, and a suite with no
 * jsdom can still read a list of rows.
 */
export function stageRows(
  label: string,
  figures: string | null,
  sources: readonly (readonly [string, string, boolean])[],
): ModifierRow[] {
  if (figures === null && sources.length === 0) return [];
  const only = sources.length === 1 ? sources[0]! : null;
  if (only) {
    return [{ label: `${label} · ${only[0]}`, figures: only[1], bad: only[2], stage: true }];
  }
  const rows: ModifierRow[] = [
    { label, figures: figures ?? 'no net change', bad: false, stage: true },
  ];
  for (const [source, effect, bad] of sources) {
    rows.push({ label: source, figures: effect, bad, stage: false });
  }
  return rows;
}

export function createCityPanel(options: CityPanelOptions): CityPanel {
  const { container, getGame, localPlayerId, getCity, onClose, onChanged } = options;
  const isBuyMode = options.isBuyMode ?? ((): boolean => false);
  const setBuyMode = options.setBuyMode ?? ((): void => {});

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
    // The one note that is about *moving* rather than about building or
    // fighting, and it earns its line because the Moves figure above cannot say
    // it: 3 moves through a wood is one hex for a warrior and three for a scout.
    if (def.ignoresTerrainCost) {
      notes.append(note(`Ignores terrain · every hex costs 1 of its ${def.movement} moves`));
    }
    if (def.haltsGrowth) notes.append(note('The city banks no food while this is at the front'));
    if (def.minCityPop > 0) notes.append(note(`Needs a city of ${def.minCityPop}`));
    if (def.requiresResource !== undefined) {
      // The one note that is built rather than written: the resource's mark is
      // an element carrying a CSS mask, so it cannot ride inside a template
      // string. See `src/ui/resourceMark.ts`.
      const item = element('li');
      item.append('Needs improved ');
      item.append(resourceLabelNodes(def.requiresResource));
      notes.append(item);
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
      [YIELD_GLYPH.science, def.science],
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
    // The three fields that name a behaviour rather than a yield. Written off
    // the presence of the field, exactly as the unit card is: the second
    // building that raises the writ describes itself here without being taught.
    if (def.authorityCapacity !== undefined && def.authorityCapacity !== 0) {
      notes.append(note(`+${def.authorityCapacity} authority capacity`));
    }
    if (def.productionBonus !== undefined && def.productionBonus.percent !== 0) {
      const { category, percent } = def.productionBonus;
      const toward = category === 'unit' ? 'units' : 'buildings';
      notes.append(note(`${percentFigure(percent)}${HAMMER} toward ${toward} here`));
    }
    // Every renewal this building will ever get, whether or not its owner has
    // earned it yet. One already held is folded into what the building pays and
    // gets its own line in the panel's breakdown; one still ahead is a promise,
    // and naming the technology is the whole of what makes it worth reading.
    for (const upgrade of def.upgrades ?? []) {
      const figures = buildingFigures({
        source: def.name,
        building: id,
        food: upgrade.add.food ?? 0,
        production: upgrade.add.production ?? 0,
        gold: upgrade.add.gold ?? 0,
        science: upgrade.add.science ?? 0,
        culture: upgrade.add.culture ?? 0,
        sciencePerPop: upgrade.add.sciencePerPop ?? 0,
      });
      notes.append(note(`${figures} with ${techDef(upgrade.tech).name}`));
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
   * What one line of a building's breakdown pays, in the yields' own glyphs:
   * `+3🌾`, `+1🔬/pop`. Empty for a line that pays nothing at all — a barracks
   * has no yields of its own and is listed below as the modifier it is, not
   * here as a row of five zeroes.
   */
  function buildingFigures(entry: BuildingYieldContribution): string {
    const parts: string[] = [];
    const voices: [number, string][] = [
      [entry.food, YIELD_GLYPH.food],
      [entry.production, YIELD_GLYPH.production],
      [entry.gold, YIELD_GLYPH.gold],
      [entry.science, YIELD_GLYPH.science],
      [entry.culture, YIELD_GLYPH.culture],
    ];
    for (const [value, glyph] of voices) {
      if (value === 0) continue;
      parts.push(`${value > 0 ? '+' : ''}${value}${glyph}`);
    }
    if (entry.sciencePerPop !== 0) {
      const sign = entry.sciencePerPop > 0 ? '+' : '';
      parts.push(`${sign}${entry.sciencePerPop}${YIELD_GLYPH.science}/pop`);
    }
    return parts.join(' ');
  }

  /** The same six voices, for a luxury's signature line. */
  function resourceFigures(entry: ResourceYieldLine): string {
    const parts: string[] = [];
    const voices: [number, string][] = [
      [entry.food, YIELD_GLYPH.food],
      [entry.production, YIELD_GLYPH.production],
      [entry.gold, YIELD_GLYPH.gold],
      [entry.science, YIELD_GLYPH.science],
      [entry.culture, YIELD_GLYPH.culture],
      [entry.faith, YIELD_GLYPH.faith],
    ];
    for (const [value, glyph] of voices) {
      if (value === 0) continue;
      parts.push(`${value > 0 ? '+' : ''}${value}${glyph}`);
    }
    return parts.join(' ');
  }

  /**
   * The five figures, and — under them — the list they are the fold of.
   *
   * The chips are `cityYields`, which has the happiness and authority
   * multipliers already folded in and, since the Age I rework, the share of the
   * hammers a barracks puts behind whatever is at the front of the queue. A
   * multiplied number shown without the reason beside it is a total computed
   * beside its list, which is exactly what CLAUDE.md's rule 5 forbids, so the
   * whole of what is inside the chips gets said underneath them, in the order it
   * is applied:
   *
   *   · every line the city's buildings pay (`explainCityBuildings`) — one per
   *     building, and one more per *renewal* a technology has switched on, so
   *     "Granary +3🌾" and "The Wheel +1🌾" are two facts a player can find.
   *   · every building putting extra hammers behind the current build.
   *   · every empire modifier that is currently biting.
   *
   * A line worth nothing is never printed, at any of the three levels: a
   * modifier that does nothing is not a modifier, and a granary in a city whose
   * queue is empty is not a hammer bonus.
   */
  function renderYields(city: City): HTMLElement {
    const { state } = getGame();
    // The rate for what is actually being built — the same call `collectYields`
    // banks with, so the ⚙ chip is the number the basket will receive.
    const front = city.queue[0];
    const yields = cityYields(state, city, [], front);
    const box = element('div', 'city-yields-box');
    const row = element('div', 'city-yields');
    const entries: [YieldKey, string, number][] = [
      ['food', 'Food', yields.food],
      ['production', 'Prod', yields.production],
      ['gold', 'Gold', yields.gold],
      ['science', 'Sci', yields.science],
      ['culture', 'Cult', yields.culture],
      ['faith', 'Faith', yields.faith],
    ];
    for (const [key, label, value] of entries) {
      const chip = element('div', `city-yield is-${key}`);
      chip.append(element('span', 'city-yield-value', String(value)));
      const name = element('span', 'city-yield-label');
      // The drawn mark ahead of the abbreviation, so this row and the top bar's
      // strip name a voice the same way. The word stays: these are the six
      // headline figures of the panel and "Prod" is what makes them scannable
      // before a player has learnt six pictures. The mark is `aria-hidden`, so
      // the chip still reads as its word alone.
      name.append(yieldMarkNode(key, true), document.createTextNode(label));
      chip.append(name);
      row.append(chip);
    }
    box.append(row);

    const list = element('ul', 'city-modifiers');
    const line = (label: string, figures: string, bad = false): void => {
      const item = element('li', bad ? 'city-modifier is-bad' : 'city-modifier');
      item.append(element('span', undefined, label));
      item.append(element('span', 'city-modifier-effect', figures));
      list.append(item);
    };
    // A stage's own line: the same shape, set in the panel's louder ink, because
    // it is the figure the chips were actually multiplied by and the lines under
    // it are its parts.
    const stageLine = (label: string, figures: string, bad = false): void => {
      const item = element('li', bad ? 'city-modifier is-stage is-bad' : 'city-modifier is-stage');
      item.append(element('span', undefined, label));
      item.append(element('span', 'city-modifier-effect', figures));
      list.append(item);
    };

    // What the city's own improved luxuries pay it, before the buildings — the
    // list `cityYields` folds, printed line by line, which is rule 5's whole
    // bargain: the multiplied number is never shown without its reason beside
    // it. An empire-scale signature is not here on purpose; it belongs to no
    // town, and the top bar's totals carry it.
    for (const entry of cityResourceYields(state, city)) {
      const figures = resourceFigures(entry);
      if (figures) line(entry.source, figures);
    }
    for (const entry of explainCityBuildings(state, city)) {
      const figures = buildingFigures(entry);
      if (figures) line(entry.source, figures);
    }
    // Then the two multiplications, in the order they happen (Entry XVII): what
    // the town did for itself, then what the empire does to the result. Each is
    // a heading carrying that stage's summed percentages and, under it, the lines
    // it is the sum of — so a player reading downward sees flats, "City bonuses
    // ⚙ +25%", its sources, "Empire 🔬 +10%", its sources, and can reach the
    // number on the chip by hand. A stage the fold of exactly one line is
    // written as that line (see below): a sum of one thing is that thing, and
    // printing both was the same sentence twice.
    const sums = cityStageSums(state, city, front);
    const percents = cityYieldPercents(state, city);
    const hammers = productionModifiers(state, city, front);
    for (const stage of MODIFIER_STAGES) {
      const sources: [string, string, boolean][] = [];
      if (stage === 'city') {
        // The hammers are city-stage and are named first, because they are the
        // modifier a player is most often looking for: what is behind *this*
        // build.
        for (const modifier of hammers) {
          sources.push([modifier.source, `${HAMMER} ${percentFigure(modifier.percent)}`, false]);
        }
      } else {
        for (const effect of meterEffects(state, city.ownerId)) {
          // The growth stifle and the writ's border tier are *other channels*
          // (Entry XIV.D.4): they multiply the food surplus and the culture
          // accrual, not a yield, so they belong to the Growth and Borders lines
          // that quote them, and they would not add up under this heading.
          if (effect.growth || effect.yields.length === 0) continue;
          const meter = effect.meter === 'happiness' ? 'Happiness' : 'Authority';
          sources.push([
            `${meter} ${signedFigure(effect.value)}`,
            effectFigure(effect),
            effect.percent < 0,
          ]);
        }
      }
      // A luxury's percentage is printed in the same voice as the meters', under
      // the stage its signature put it in — which is the city stage for every row
      // in today's table: "+20% science in each coastal city" is a fact about the
      // coastal city, and multiplies with what that city built.
      for (const percent of percents) {
        if (percent.resource === undefined || percent.stage !== stage) continue;
        sources.push([
          percent.source,
          `${YIELD_GLYPH[percent.yield]} ${percentFigure(percent.percent)}`,
          percent.percent < 0,
        ]);
      }
      // A stage nothing joined is not printed at all. One whose lines cancel to
      // nothing *is*: "Empire · nothing net" over a +10% and a −10% is the whole
      // point of summing rather than compounding, and hiding it would leave a
      // player who can see two modifiers unable to find where they went.
      for (const row of stageRows(STAGE_LABEL[stage], stageFigures(sums, stage), sources)) {
        if (row.stage) stageLine(row.label, row.figures, row.bad);
        else line(row.label, row.figures, row.bad);
      }
    }
    if (list.childElementCount > 0) box.append(list);
    return box;
  }

  /**
   * One stage's summed percentages as figures — `🔬 +20% ⚙ +25%` — or `null`
   * when that stage is doing nothing to any yield.
   *
   * See `stageRows` for what is done with it when the stage has exactly one
   * source: the fold of one line is that line, and printing both was the
   * doubled science/culture reading players saw after the two-stage rework.
   *
   * The fold of `cityStageSums`, which is the same fold `cityYields` multiplies
   * by, so the heading and the chip cannot disagree. Production carries the
   * hammers behind the current build, which is why the ⚙ figure here can be
   * larger than the percentages listed under it: those are yields, the hammers
   * are named on their own lines below.
   */
  function stageFigures(
    sums: Record<CityYieldKey, StageSums>,
    stage: ModifierStage,
  ): string | null {
    const parts: string[] = [];
    for (const key of CITY_YIELD_KEYS) {
      const percent = sums[key][stage];
      if (percent === 0) continue;
      parts.push(`${YIELD_GLYPH[key]} ${percentFigure(percent)}`);
    }
    return parts.length === 0 ? null : parts.join('  ');
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

    // The stifle, named on the line it throttles rather than up among the yield
    // percentages — it is its own channel (Entry XIV.D.4: it multiplies the
    // *surplus*, never the harvest), and since Entry XVII the modifier list
    // above says only what the two yield stages did. The Borders line has said
    // the same thing about the writ since M10; this is its twin.
    const stifle = growthPercent(meterEffects(getGame().state, city.ownerId));
    if (stifle !== 0 && surplus > 0) {
      const modifier = element('div', 'city-progress-note');
      modifier.append(element('span', 'city-progress-item', 'Happiness'));
      modifier.append(element('span', undefined, percentFigure(stifle)));
      box.append(modifier);
    }
    return box;
  }

  /**
   * Borders: what the next tile costs, how fast the culture is arriving, and
   * whether the writ has stopped it arriving at all.
   *
   * The growth line's sibling one field over, and built from the one evaluator
   * for the same reason: `borderGrowth` is what `collectYields` banks and what
   * `expandBorders` spends, so the rate quoted here is the rate the turn will
   * act on. Three states, and the third is why the evaluator carries `frozen`
   * as a flag rather than leaving the panel to infer it from a zero:
   *
   *   growing   "+3 culture · 5t", a bar, and the basket against the cost.
   *   stalled   a city with nowhere left to expand, or no culture at all.
   *   frozen    the writ is overdrawn. The rate is struck out and the reason is
   *             named, because a border that has stopped for a *policy* reason
   *             must not look like one that has merely run out of poets.
   *
   * The Buy Tiles button sits under it rather than in the header, because it is
   * the other half of the same sentence: this is how ground is acquired, and
   * gold is the way to hurry it. It is disabled with the reason on it while the
   * writ bars purchases, which is the same freeze the line above just reported.
   */
  function renderBorders(city: City, locked: boolean): HTMLElement {
    const growth = borderGrowth(getGame().state, city);

    const box = element('div', 'city-progress');
    const label = element('div', 'city-progress-label');
    label.append(element('span', undefined, 'Borders'));
    const rate = element(
      'span',
      growth.frozen ? 'city-progress-rate is-bad' : 'city-progress-rate',
      growth.frozen
        ? `${growth.base} culture · frozen`
        : growth.turns === null
          ? `+${growth.perTurn} culture · stalled`
          : `+${growth.perTurn} culture · ${growth.turns}t`,
    );
    label.append(rate);
    box.append(label);
    box.append(bar(growth.banked, growth.cost, 'is-culture'));

    const note = element('div', 'city-progress-note');
    note.append(
      element('span', 'city-progress-item', growth.frozen ? 'Authority overdrawn' : 'Next tile'),
    );
    note.append(element('span', undefined, `${Math.floor(growth.banked)} / ${growth.cost}`));
    box.append(note);

    // The writ's own percentage on the accrual, named rather than folded into
    // the rate — rule 5 one grade smaller: a player whose borders sped up is
    // entitled to find the reason on the line that sped up.
    if (!growth.frozen && growth.percent !== 0) {
      const modifier = element('div', 'city-progress-note');
      modifier.append(element('span', 'city-progress-item', 'Authority'));
      modifier.append(element('span', undefined, percentFigure(growth.percent)));
      box.append(modifier);
    }

    const buy = element('button', 'city-buy-tiles');
    buy.type = 'button';
    const active = isBuyMode();
    buy.textContent = active ? 'Stop buying' : 'Buy tiles';
    buy.classList.toggle('is-active', active);
    const blocker = locked
      ? `You have ended turn ${getGame().state.turn}`
      : growth.frozen
        ? 'Borders frozen — authority is overdrawn'
        : null;
    buy.disabled = blocker !== null;
    buy.title = blocker ?? 'Show what the ground around this city costs in gold';
    buy.addEventListener('click', () => {
      setBuyMode(!isBuyMode());
      onChanged();
    });
    box.append(buy);

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
      // Two forms of the same sentence, and the split is the mark's doing. The
      // spoken one is words only: a screen reader reading a resource's glyph
      // announces its Unicode name before the word it decorates, which is the
      // one surface an icon makes *worse*.
      const needsSpoken = missing === null ? '' : `improved ${resourceDef(missing).name}`;
      // A label rather than a `title`, and that is the hover card's doing: a
      // native tooltip would arrive a second *after* the card, on top of it,
      // saying less. The sentence is kept — it is the only place a screen
      // reader is told why a greyed row is greyed — it has simply stopped
      // being a second thing that draws.
      button.setAttribute(
        'aria-label',
        needsResource
          ? `${def.name} — needs ${needsSpoken}`
          : tooSmall
            ? `${def.name} — needs population ${def.minCityPop}`
            : `${def.name} — ${cost} production`,
      );
      button.append(element('span', 'city-buildable-name', def.name));
      // An unbuildable row keeps its reason where the price goes: a "needs
      // improved Iron" that had to share the line with "9⚙ · 4t" would be
      // quoting a schedule for something that is not going to start.
      const price = element('span', 'city-buildable-cost');
      if (needsResource && missing !== null) {
        price.append('needs improved ');
        price.append(resourceLabelNodes(missing));
      } else {
        setYieldText(
          price,
          `${cost}${HAMMER} · ${turnsLabel(turnsToBuild(state, city, { kind: 'unit', id }, city.queue.length))}`,
        );
      }
      button.append(price);
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
    title.append(element('h2', undefined, cityDisplayName(state, city)));
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
    // After production, because the two food/hammer baskets are what a player
    // reads first and territory is the slower clock underneath them.
    container.append(renderBorders(city, locked));
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
        isBuyMode()
          ? // Leads with the treasury a tag's price is checked against — the
            // same `Player.gold` the top bar's chip now shows — so affordability
            // reads here without a hover.
            `${figure(playerById(state, localPlayerId())?.gold ?? 0)}${YIELD_GLYPH.gold} on ` +
            'hand. Every price on the board is what that hex costs right now. ' +
            'Click one to buy it; a greyed tag says why it cannot be had. ' +
            'Escape stops buying and leaves the city open.'
          : 'Dots on the map are the tiles this city works. Click one to pin a ' +
            'citizen there, or any other tile in the ring to move one to it. ' +
            'A unit standing in the ring is selected by clicking its badge.',
      ),
    );
  }

  return { render };
}
