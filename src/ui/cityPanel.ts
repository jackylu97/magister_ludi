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
  type BuildingPreviewLine,
  type BuildingYieldContribution,
  type CityYields,
  borderGrowth,
  cityStageSums,
  cityYields,
  citizenFocus,
  explainBuildingPreview,
  explainCityBuildings,
  foldBuildingPreview,
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
import { type BuildingId, BUILDING_IDS, buildingDef, isWonder } from '../sim/buildingData';
import { cardCityStat, describeCard } from '../sim/statecraft';
import { RULES } from '../sim/rulesData';
import {
  type ProjectId,
  PROJECT_IDS,
  projectDef,
  projectRate,
} from '../sim/projectData';
import {
  cityMaxHp,
  explainCityMaxHp,
  explainCityStrength,
  isCombatant,
  isRanged,
  siegeField,
  underSiege,
} from '../sim/combat';
import { buildingCityStat } from '../sim/buildingEffects';
import {
  type PurchasableItem,
  type PurchaseCurrency,
  explainPurchaseCost,
  isPurchaseOnly,
  purchasableName,
  purchaseError,
  purchaseVerb,
} from '../sim/purchase';
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
import { type RouteYieldLine, cityRouteYields } from '../sim/trade';
import { cityRouteRows, routeSlotsLine as routeSlotsLineOf } from './tradeLines';
import { resourceLabelNodes } from './resourceMark';
import { setYieldText, yieldMarkNode } from './yieldMark';
import {
  type City,
  type GameState,
  type QueueItem,
  type ReligionId,
  cityReligion,
  followerCount,
  hasEndedTurn,
  playerById,
  unconvertedCitizens,
} from '../sim/state';
import { type PressureLine, explainPressure } from '../sim/religion';
import { pressureLedgerText } from './religionScreen';
import { techDef } from '../sim/techData';
import { buildError, isUnlocked, requiredResource } from '../sim/tech';
import { type UnitTypeId, UNIT_TYPE_IDS, unitDef } from '../sim/unitData';
import { cityDisplayName } from './cityDisplay';
import {
  type YieldKey,
  HAMMER,
  PROJECT_GLYPHS,
  PROJECT_SPOKEN,
  YIELD_GLYPH,
  effectFigure,
  figure,
  percentFigure,
  signedFigure,
  turnsLabel,
} from './figures';
import { createInfoCard } from './infoCard';


/**
 * One faith with a claim on this town, as the city sheet lists it.
 *
 * A claim is any of three things and the list is the union of them, because all
 * three are the same question asked at different distances: people who already
 * follow, faith banked toward the next of them turning, and pressure arriving
 * this turn. A row that appeared only once somebody had converted would be a
 * player watching their capital flip with no warning at all.
 */
export interface CityFaithRow {
  religion: ReligionId;
  /** The faith's own name, as its founder last set it. */
  name: string;
  /** True when the seat reading the sheet founded it. */
  ours: boolean;
  founderName: string;
  /** The founder's banner ink — a foreign faith is named in the colour of who owns it. */
  founderColor: string;
  /** Citizens of this town who follow it, of the whole population. */
  following: number;
  population: number;
  /** True when more than half the town follows it — `cityReligion`'s answer. */
  majority: boolean;
  /** Faith banked toward the next citizen turning, and what one costs. */
  banked: number;
  perConvert: number;
  /** `explainPressure`'s lines for this faith, for the hover. */
  ledger: PressureLine[];
}

/**
 * Every faith with a claim on this town, in **founding order**, plus the
 * citizens who follow nothing.
 *
 * Pure, exported, and the whole of what the followers block prints — the
 * `religionReading` bargain one screen over. Every figure is somebody else's:
 * the counts are `followerCount`, the banner is `cityReligion`, the remainder is
 * `unconvertedCitizens` (derived, never stored — a second count of the
 * unconverted would disagree the turn a citizen was born) and each ledger is
 * `explainPressure`, which is the same list the tide folds into the bank.
 *
 * `state.religions` order rather than "most followers first", because founding
 * order is an order the state carries and a list that re-sorted itself as
 * congregations changed would be one a player could never learn.
 */
export function cityFaithRows(state: GameState, city: City, seat: number): CityFaithRow[] {
  if (state.religions.length === 0) return [];
  const perConvert = Math.max(1, Math.floor(RULES.religion.pressurePerConvert));
  const lines = explainPressure(state, city);
  const majority = cityReligion(city);
  const rows: CityFaithRow[] = [];
  for (const religion of state.religions) {
    const following = followerCount(city, religion.id);
    const banked = city.pressureBank?.[religion.id] ?? 0;
    const ledger = lines.filter((line) => line.religion === religion.id);
    if (following === 0 && banked === 0 && ledger.length === 0) continue;
    const founder = playerById(state, religion.founderId);
    rows.push({
      religion: religion.id,
      name: religion.name,
      ours: religion.founderId === seat,
      founderName: founder?.name ?? 'somebody',
      founderColor: founder?.color ?? 'var(--ink)',
      following,
      population: city.population,
      majority: majority === religion.id,
      banked,
      perConvert,
      ledger,
    });
  }
  return rows;
}

/**
 * Where a newly-pressed build row lands: at the back, but **in front of any
 * standing project**.
 *
 * A project never leaves the queue (Entry XXVI), so a plain append would be
 * putting every future warrior behind a row that is never reached — the queue
 * would silently stop the moment a player queued Tithes. Reading a project as
 * *the standing order a city falls back to* puts new work ahead of it, which is
 * what the player meant by both presses and needs no second control to say so.
 *
 * The trailing *run*, not the last item, because two projects may stand
 * together: a player who queued Tithes and then Scholarship has said "mint coin
 * when there is nothing else", and a warrior belongs in front of both.
 *
 * Pure and module-level for `stageRows`' reason — this is the panel's placement
 * decision rather than its DOM, and the suite that holds it still has no jsdom.
 */
export function insertionIndex(queue: readonly QueueItem[]): number {
  let at = queue.length;
  while (at > 0 && queue[at - 1]?.kind === 'project') at -= 1;
  return at;
}

/**
 * May this unit type ever appear as a **build** row at all?
 *
 * Not "can this city build one today" — that is `buildError`'s question and its
 * answer is a greyed row with a reason on it. This is the prior question, and
 * the two things it turns away are the two the roster marks as belonging to
 * another verb entirely:
 *
 *   · **bought or not at all** (`UnitDef.purchase.exclusive`, through
 *     `isPurchaseOnly`) — the augur, which has a row of its own at the foot of
 *     the list, in the bank it is actually sold in.
 *   · **neither built nor bought** (`UnitDef.greatWork`) — a great person is
 *     *called*, by a renown bucket that filled and an offer that was answered,
 *     and the roster's row is a template rather than a thing a town makes.
 *
 * The second is the playtest's (user, 2026-08-27), and the row it removes was
 * worse than a greyed one: a great person's row carries no cost, so the list
 * printed "Great Person · 0⚙ · 0t" — an offer to have the best piece in the
 * game this turn for nothing. `buildError` would of course have refused the
 * press ("Great Persons are neither built nor bought — they are called"), so
 * nothing was ever wrong; the panel was simply advertising a door that opens
 * onto a wall.
 *
 * Asked of the two **markers** and never of a type id, exactly as the reducer
 * asks (`buildError`, `purchaseError`): a second great-person family or a second
 * faith-bought piece is a JSON row and this list learns about it for free.
 *
 * Pure and module-level for `stageRows`' reason: the suite has no jsdom, and
 * "which rows exist" is the half of the build list that can be quietly wrong.
 */
export function offeredInBuildList(id: UnitTypeId): boolean {
  if (isPurchaseOnly({ kind: 'unit', id })) return false;
  if (unitDef(id).greatWork === true) return false;
  return true;
}

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
  /**
   * Opens the Trade screen, from the Routes row. Optional for `setBuyMode`'s
   * reason exactly: a panel built without one is still a panel, and the row
   * simply carries no button.
   */
  onOpenTrade?: () => void;
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
 * One stage of the modifier list, as the rows it prints: **its sources, and
 * nothing above them**.
 *
 * The heading is gone, and this is the second and last pass at the same
 * complaint. Every percentage `cityStageSums` folds has a line here — the
 * meters, the luxuries, the hammers behind the current build, and nothing else
 * joins that fold — so the heading was, by construction, its own lines said
 * again in different glyphs. The first pass collapsed the *one-source* case,
 * which left the two-source case printing
 *
 *     Empire            🔬 +10%  🎭 +10%
 *     Happiness +6      🔬🎭 +10%
 *     Silk              🔬 +10%
 *
 * and the player's reading of that (user, 2026-08-27) is the right one: the
 * first row is arithmetic they can do by eye off the two under it, and the
 * lines are clear enough on their own. So the fold is not printed and its parts
 * are. Nothing is lost that the panel did not already say twice, and the yield
 * chips at the top of the screen are where the *multiplied* figure belongs.
 *
 * The label survives in exactly one place, and it is a **canary rather than a
 * heading**: a stage that folds to a figure with no source to explain it. That
 * cannot happen today and the register test in `test/ui/cityModifiers.test.ts`
 * is what keeps it so — but if a future modifier ever joins `cityStageSums`
 * without joining this list, the panel says "Empire 🔬 +10%" with nothing under
 * it rather than swallowing a percentage the player cannot account for. A
 * silent stage would be the one failure this list exists to prevent.
 *
 * A stage nothing joined at all prints nothing, exactly as before.
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
  if (sources.length === 0) {
    // Nothing folded and nothing to say, or the canary above.
    if (figures === null) return [];
    return [{ label, figures, bad: false, stage: true }];
  }
  return sources.map(([source, effect, bad]) => ({
    label: source,
    figures: effect,
    bad,
    stage: false,
  }));
}

/**
 * The same six voices, for a preview fold or one of its lines —
 * `foldBuildingPreview`'s `CityYields` and `BuildingPreviewLine` share every
 * numeric field, so one formatter reads both. Empty when nothing in it pays,
 * which is the house dash's cue at both call sites below.
 *
 * Pure and exported for the reason `stageRows` is: a suite with no jsdom can
 * still call a formatter directly (`test/ui/cityPanel.test.ts`).
 */
export function previewFigures(entry: CityYields): string {
  const parts: string[] = [];
  for (const key of CITY_YIELD_KEYS) {
    const value = entry[key];
    if (value === 0) continue;
    parts.push(`${value > 0 ? '+' : ''}${value}${YIELD_GLYPH[key]}`);
  }
  return parts.join(' ');
}

/**
 * One line of `explainBuildingPreview`'s breakdown, read exactly as the sim
 * labelled it: the building's own row, a card that woke, the ground that
 * changed, or the reconciliation line last. Never re-derived — the source and
 * the figures are both the sim's own.
 */
export function previewLineText(line: BuildingPreviewLine): string {
  const figures = previewFigures(line);
  return figures ? `${line.source} ${figures}` : line.source;
}

/**
 * "Walls 200 · Palisade +25" — the hover ledger behind the hit-point chip,
 * rule 5 for a town's toughness. `explainCityMaxHp`'s own fold (`cityMaxHp`)
 * is the number the chip shows; this is the breakdown that says why, first
 * line bare (the base, unsigned) and every wall after it in the signed voice.
 *
 * Pure and module-level, `previewLineText`'s reason exactly: a hover string
 * built off the sim's own list needs no jsdom to pin.
 */
export function maxHpLedger(city: City): string {
  return explainCityMaxHp(city)
    .map((line, index) =>
      index === 0 ? `${line.source} ${line.amount}` : `${line.source} ${signedFigure(line.amount)}`,
    )
    .join(' · ');
}

/** One row of the defence ledger: what it is, what it is worth. */
export interface DefenseRow {
  label: string;
  figures: string;
}

/**
 * What this town defends with, line by line: the garrison first — "Defends
 * with · Swordsman" over the strongest unit its owner could train right now,
 * `explainCityStrength`'s own words with "Garrison strength" reread as
 * "Defends with" — then every wall and every card that adds to the same
 * fight, each in its own row so a palisade is never folded into a number with
 * no reason beside it (rule 5). The garrison figure is the fold of
 * `explainCityStrength` alone; the walls and cards below it are what
 * `planCombat` adds on top when somebody actually attacks, so the two halves
 * read the same total the forecast card would.
 */
export function defenseRows(state: GameState, city: City): DefenseRow[] {
  const rows: DefenseRow[] = [];
  const strengthLines = explainCityStrength(state, city);
  strengthLines.forEach((entry, index) => {
    const label =
      index === 0 ? entry.source.replace('Garrison strength', 'Defends with') : entry.source;
    rows.push({ label, figures: String(entry.amount) });
  });
  for (const entry of buildingCityStat(city, 'defense')) {
    rows.push({ label: entry.source, figures: signedFigure(entry.amount) });
  }
  for (const entry of cardCityStat(state, city, 'defense')) {
    rows.push({ label: entry.source, figures: signedFigure(entry.amount) });
  }
  return rows;
}

export function createCityPanel(options: CityPanelOptions): CityPanel {
  const { container, getGame, localPlayerId, getCity, onClose, onChanged, onOpenTrade } =
    options;
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

  /**
   * Sends a purchase and repaints. `commit`'s twin one bank over, and the same
   * contract: a refused command changes nothing at all, and the button that
   * sent it was only enabled because `purchaseError` said the reducer would
   * take it.
   */
  function buy(city: City, item: PurchasableItem, currency: PurchaseCurrency): void {
    const command: Command = {
      type: 'purchaseItem',
      playerId: localPlayerId(),
      cityId: city.id,
      item,
      currency,
    };
    if (!dispatch(getGame(), command).ok) return;
    onChanged();
  }

  /** A copy of the city's queue: the panel edits a draft, never the state. */
  function draft(city: City): QueueItem[] {
    return city.queue.map((item): QueueItem => {
      if (item.kind === 'unit') return { kind: 'unit', id: item.id };
      if (item.kind === 'project') return { kind: 'project', id: item.id };
      return { kind: 'building', id: item.id };
    });
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
    // "wonder", not "building", because the one thing a player needs to know
    // before spending a hundred hammers is that somebody else may get there
    // first. Read off the row's own flag (`isWonder`) — there is no Oracle case.
    head.append(element('span', 'info-card-kind', isWonder(id) ? 'wonder' : 'building'));
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
      [YIELD_GLYPH.faith, def.faith ?? 0],
    ];
    for (const [glyph, value] of flat) {
      if (value !== 0) notes.append(note(`${value > 0 ? '+' : ''}${value}${glyph} every turn`));
    }
    // Fractional and floored per building when it is applied (`cityYields`), so
    // it is quoted per citizen rather than as a total this card cannot know.
    if (def.sciencePerPop !== 0) {
      notes.append(note(`+${def.sciencePerPop}${YIELD_GLYPH.science} per citizen`));
    }
    // The fields that name a behaviour rather than a yield. Written off the
    // presence of the field, exactly as the unit card is: the second building
    // that raises the writ describes itself here without being taught.
    //
    // **`authorityCapacity` and `happiness` are no longer among them**: both are
    // now clauses of `describeCard` below, because a wonder is a card and the
    // card was printing four of Circus Maximus's five points of cheer and none
    // of The Forbidden City's writ at all. Two lines said one way each is the
    // whole of the bargain — a copy here would be the same fact in two voices,
    // and the one that drifts is always the copy.
    if (def.productionBonus !== undefined && def.productionBonus.percent !== 0) {
      const { category, percent } = def.productionBonus;
        const toward =
        category === 'unit' ? 'units' : category === 'wonder' ? 'wonders' : 'buildings';
      notes.append(note(`${percentFigure(percent)}${HAMMER} toward ${toward} here`));
    }
    if (def.cityStat !== undefined && def.cityStat.amount !== 0) {
      const { stat, amount } = def.cityStat;
      notes.append(note(`${amount > 0 ? '+' : ''}${amount} city ${stat}`));
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
        faith: upgrade.add.faith ?? 0,
        sciencePerPop: upgrade.add.sciencePerPop ?? 0,
      });
      notes.append(note(`${figures} with ${techDef(upgrade.tech).name}`));
    }
    // What a **wonder** does beyond its yields, in the vocabulary's own words —
    // `describeCard`, the same function the offer, the collection and the slot
    // hover call, so a wonder's clause reads exactly as a Doctrine's does. A
    // building with no `effects` (which is every other row) adds nothing here.
    for (const clause of describeCard(id)) {
      const line = note(clause.text);
      if (clause.deferred) line.classList.add('is-deferred');
      notes.append(line);
    }
    // The standing caveat, italic rather than struck: `deferred` is "this half
    // is missing" and `note` is "this half is here and there is something to
    // know about it" (Hagia Sophia hands over an augur where the ratified text
    // says a prophet). Two different things a row can say about itself, and a
    // card that painted them alike would be telling the player a promise was
    // broken when it was only bent.
    if (def.note !== undefined && def.note !== '') {
      const caveat = note(def.note);
      caveat.classList.add('is-caveat');
      notes.append(caveat);
    }
    if (isWonder(id)) {
      notes.append(note('A wonder: one of these stands in the whole world'));
    }
    if (notes.childElementCount === 0) notes.append(note('No yields of its own'));
    box.append(notes);
    // What this **town**, right now, would gain by finishing it — Orders,
    // beliefs, wonders, whatever in this empire's law wakes on a barracks
    // (user, 2026-08-28: "+1 prod for barracks belief" should show in the build
    // screen). Under the description above rather than inside it: the notes
    // just printed are the row out of `data/buildings.json` and nothing else,
    // this is the ground truth for the city actually open. Sim-derived and
    // printed exactly as given — `explainBuildingPreview`'s reconciliation line,
    // when it emits one, lands last because that is where the sim put it.
    const preview = explainBuildingPreview(getGame().state, city, id);
    if (preview.length > 0) {
      const previewList = element('ul', 'info-card-notes info-card-preview');
      for (const line of preview) previewList.append(note(previewLineText(line)));
      box.append(previewList);
    }
    // Why this town cannot start it, in the reducer's own sentence — "The
    // Colossus wants a harbour; Uruk has none", "The Oracle already stands in Ur
    // (Crimson)". The star chart's node card has said this at the foot since it
    // was written (`info-card-state is-blocked`); the queue's card had no room
    // for the *site* clause at all, which is the one refusal a player cannot
    // work out by looking at the row. Asked with the town in hand, which is what
    // lets `buildError` answer the ground's question at all.
    const problem = buildError(getGame().state, city.ownerId, 'building', id, city);
    if (problem !== null) box.append(element('p', 'info-card-state is-blocked', problem));
    return box;
  }

  /**
   * What a project is: a rate, and the fact that it never stops.
   *
   * Nothing here computes either. The rate is `projectRate`'s answer — one
   * function, so a retuned cost cannot leave a stale label behind it — and the
   * estimate is `turnsToBuild`'s, which for a repeatable item is the interval
   * between payouts rather than a date.
   */
  function projectCard(city: City, id: ProjectId, index: number): Node {
    const def = projectDef(id);
    const box = element('div');

    const head = element('div', 'info-card-head');
    head.append(element('span', 'info-card-name', def.name));
    head.append(element('span', 'info-card-kind', 'project · repeats'));
    box.append(head);

    const figures = element('div', 'info-card-figures');
    figures.append(element('span', 'info-card-cost', `${def.cost}${HAMMER}`));
    figures.append(
      element(
        'span',
        'info-card-turns',
        turnsLabel(turnsToBuild(getGame().state, city, { kind: 'project', id }, index)),
      ),
    );
    box.append(figures);

    const notes = element('ul', 'info-card-notes');
    const rate = element('li');
    setYieldText(rate, `Pays ${projectRate(id, PROJECT_GLYPHS)} for every ${def.cost}${HAMMER}`);
    notes.append(rate);
    // The two things a player has to know to plan around one, and both are
    // consequences of "it never leaves the queue" rather than extra rules.
    notes.append(note('Never completes — the city pays it again and again'));
    notes.append(note('Anything else you queue goes in front of it'));
    notes.append(note(def.note));
    box.append(notes);
    return box;
  }

  /**
   * The card for whatever a row stands for, at the queue position it occupies —
   * or, for a row in the "add to queue" grid, the position it would land in.
   */
  function itemCard(city: City, item: QueueItem, index: number): Node {
    if (item.kind === 'unit') return unitCard(city, item.id, index);
    if (item.kind === 'project') return projectCard(city, item.id, index);
    return buildingCard(city, item.id, index);
  }

  // --- sections ------------------------------------------------------------

  /**
   * What one line of a building's breakdown pays, in the yields' own glyphs:
   * `+3🌾`, `+1🔬/pop`. Empty for a line that pays nothing at all — a barracks
   * has no yields of its own and is listed below as the modifier it is, not
   * here as a row of six zeroes.
   */
  function buildingFigures(entry: BuildingYieldContribution): string {
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
    if (entry.sciencePerPop !== 0) {
      const sign = entry.sciencePerPop > 0 ? '+' : '';
      parts.push(`${sign}${entry.sciencePerPop}${YIELD_GLYPH.science}/pop`);
    }
    return parts.join(' ');
  }

  /**
   * A route's three, for a caravan's line.
   *
   * Three rather than six because a route pays three: the ruling names food,
   * production and gold, and a fourth voice would be a design decision rather
   * than a formatter (`RouteYieldLine`).
   */
  function routeFigures(entry: RouteYieldLine): string {
    const voices: [number, string][] = [
      [entry.food, YIELD_GLYPH.food],
      [entry.production, YIELD_GLYPH.production],
      [entry.gold, YIELD_GLYPH.gold],
    ];
    return voices
      .filter(([value]) => value !== 0)
      .map(([value, glyph]) => `${value > 0 ? '+' : ''}${value}${glyph}`)
      .join(' ');
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

    const list = element('ul', 'city-modifiers ledger');
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
    // What the caravans sent *to* this town are bringing, after the buildings
    // because that is what they are read off — `explainRouteYield` counts the
    // *partner's* (the origin's) buildings and the two towns' people.
    // `cityRouteYields` is already one of `cityYields`' flats, so leaving these
    // out was a chip multiplied without its reason beside it (rule 5), and it is
    // why a route's food seemed to come from nowhere. `RouteYieldLine.source` is
    // the simulation's own label ("Caravan from Uruk · 3 buildings").
    for (const entry of cityRouteYields(state, city)) {
      const figures = routeFigures(entry);
      if (figures) line(entry.source, figures);
    }
    // Then the two multiplications, in the order they happen (Entry XVII): what
    // the town did for itself, then what the empire does to the result. Each
    // prints the *lines* it is the sum of and not the sum — see `stageRows`,
    // whose whole subject is that the fold and its parts were the same sentence
    // twice. A player reading downward sees the flats, then every percentage
    // with its source beside it, and the chip at the top of the screen is where
    // the multiplied figure lives.
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
      // A stage nothing joined is not printed at all; one whose lines cancel to
      // nothing prints both lines, which is the whole point of summing rather
      // than compounding — a player who can see two modifiers can find where
      // they went.
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

  /**
   * "Working for production — a settler is at the front."
   *
   * The one line that explains why a town's citizens have quietly moved off the
   * wheat. `assignCitizens` swaps to `citizenWeightsWhileHalted` whenever growth
   * is halted (playtest batch two), and without a word for it the panel simply
   * shows a different assignment than it did last turn with nothing to account
   * for the change — which reads as the game shuffling citizens at random.
   *
   * The question is asked of `citizenFocus`, the simulation's own readout, so
   * this cannot say "production" about a town placing citizens the balanced way.
   * It is deliberately the *decision* rather than the outcome — see that
   * function's docblock for why the starvation guard putting the balanced sheet
   * back does not change the sentence — and it says nothing at all while the
   * town is growing normally, because a line that is always there is a line
   * nobody reads.
   *
   * "a settler is at the front" is the shape of every halt there is today; the
   * marker is the queue row's `haltsGrowth` and nothing here compares a type
   * against `"settler"`, so the day something else halts a town this sentence is
   * the one place that needs a word.
   */
  function renderCitizenFocus(city: City): HTMLElement | null {
    if (citizenFocus(city) !== 'production') return null;
    return element(
      'p',
      'city-focus',
      'Working for production — a settler is at the front.',
    );
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
   * Everything the city could add: every *unlocked* unit type, every unlocked
   * building it has not built and has not already queued, and — last, because
   * they are the floor rather than a choice — the unlocked projects.
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
   *
   * A type that belongs to **another verb** is the third case and is hidden from
   * this list altogether (`offeredInBuildList`, two playtest notes): the augur is
   * not a thing this city cannot build yet, it is a thing no city ever builds,
   * and a great person is not built by anybody at all. A greyed row for either
   * answered "why can I not build this" with "because it is not built". The
   * augur has a row of its own at the foot of the units instead, in the bank it
   * is actually sold in; a great person has no row here at all, because there is
   * no counter it is sold over.
   *
   * Every buildable row also carries its **price in coin** (M9, Entry XXIX), so
   * "or 60💰" is beside the thing it would buy rather than on a screen of its
   * own. The tag is greyed with `purchaseError`'s sentence, exactly as the build
   * button is greyed with `buildError`'s.
   */
  function renderBuildables(city: City, locked: boolean): HTMLElement {
    const { state } = getGame();
    const box = element('div', 'city-buildables');
    box.append(element('h3', undefined, 'Add to queue'));
    const grid = element('div', 'city-buildable-grid');

    const add = (item: QueueItem): void => {
      const next = draft(city);
      // In front of any standing project, never behind it — see `insertionIndex`.
      next.splice(insertionIndex(city.queue), 0, item);
      commit(city, next);
    };

    /**
     * One buildable row: the button that queues it, and — for a unit or a
     * building — the small tag that buys it outright.
     *
     * The tag is a **sibling** of the build button rather than a control inside
     * it, because a button inside a button is not a thing the platform will
     * draw, and because the two are genuinely different verbs: one spends the
     * next few turns, the other spends the treasury.
     */
    const row = (build: HTMLElement, item?: PurchasableItem): void => {
      const line = element('div', 'city-buildable-row');
      line.append(build);
      if (item) {
        const tag = priceTag(city, item, 'gold', locked);
        if (tag) line.append(tag);
      }
      grid.append(line);
    };

    for (const id of UNIT_TYPE_IDS) {
      if (!isUnlocked(state, city.ownerId, 'unit', id)) continue;
      // Bought or not at all, or called and never made: neither belongs on a
      // build row. See `offeredInBuildList`.
      if (!offeredInBuildList(id)) continue;
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
      row(button, { kind: 'unit', id });
    }

    // The things that are **bought or not at all**, at the foot of the units and
    // priced in their own bank. Shown whether or not the technology has landed,
    // unlike a buildable row: the Religion screen has said "an augur costs 40🕯"
    // since before Divination, and a player who opens a city ought to find the
    // same offer in the place they are already deciding what a town does next.
    for (const id of UNIT_TYPE_IDS) {
      const item: PurchasableItem = { kind: 'unit', id };
      if (!isPurchaseOnly(item)) continue;
      const currency = unitDef(id).purchase!.currency;
      const tag = priceTag(city, item, currency, locked, purchaseVerb(item));
      if (tag) {
        const line = element('div', 'city-buildable-row is-purchase');
        line.append(tag);
        grid.append(line);
      }
    }

    const queued = new Set(
      city.queue.filter((item) => item.kind === 'building').map((item) => item.id),
    );
    for (const id of BUILDING_IDS) {
      if (city.buildings.includes(id) || queued.has(id)) continue;
      if (!isUnlocked(state, city.ownerId, 'building', id)) continue;
      const def = buildingDef(id);
      const wonder = isWonder(id);
      // The reducer's own sentence, and the only thing that can grey a building
      // row: "The Oracle already stands in Uruk (Crimson)", or "Ur is already
      // building The Oracle". The city is handed over so the second clause does
      // not fire on the town that is legitimately building it — see
      // `buildError`, whose sentence this is.
      const blocked = buildError(state, city.ownerId, 'building', id, city);
      const button = element('button', 'city-buildable is-building');
      if (wonder) button.classList.add('is-wonder');
      button.type = 'button';
      button.disabled = locked || blocked !== null;
      button.setAttribute('aria-label', blocked ?? `${def.name} — ${def.cost} production`);
      const name = element('span', 'city-buildable-name', def.name);
      // The eyebrow: a wonder is a different *kind* of thing to spend a hundred
      // hammers on, and a player deciding needs to know that before they read
      // the price rather than after they lose the race.
      if (wonder) name.append(element('span', 'city-buildable-eyebrow', 'wonder'));
      button.append(name);
      // A row nobody can build keeps its reason where the price goes, exactly as
      // an unbuildable unit row does: quoting a schedule for something that is
      // never going to start is the one thing worse than saying nothing.
      const costSpan = element('span', 'city-buildable-cost');
      if (blocked !== null) {
        setYieldText(costSpan, blocked);
      } else {
        setYieldText(
          costSpan,
          `${def.cost}${HAMMER} · ${turnsLabel(turnsToBuild(state, city, { kind: 'building', id }, city.queue.length))}`,
        );
        // What this town would gain today — Orders, beliefs, wonders, whatever
        // in this empire's law wakes on this row (user, 2026-08-28: a barracks
        // should read "+1⚙" with God of the Forge held). The fold of exactly
        // the lines the hover card lists below, never re-derived — a building
        // that pays nothing of its own and wakes no card prints the house dash,
        // exactly as `turnsLabel` prints one for an unanswerable estimate.
        const foldedPreview = foldBuildingPreview(explainBuildingPreview(state, city, id));
        costSpan.append(
          element('span', 'city-buildable-preview', previewFigures(foldedPreview) || '—'),
        );
      }
      button.append(costSpan);
      info.bind(button, () => itemCard(city, { kind: 'building', id }, city.queue.length));
      button.addEventListener('click', () => add({ kind: 'building', id }));
      // **No Buy tag on a wonder.** `purchaseError` refuses one outright (a
      // wonder is built, not bought), so a price tag here would be an offer the
      // reducer will not honour — `isPurchaseOnly`'s sibling question, asked of
      // the other end of the same rule.
      row(button, wonder ? undefined : { kind: 'building', id });
    }

    // The projects, at the bottom of the list because that is what they are for:
    // the thing a city falls back on when the rows above it are spent (Entry
    // XXVI). Already-queued ones are hidden for a building's reason one scale
    // further — a project never leaves the queue, so a second copy could never
    // be reached — and the price is the *rate* rather than a total, because a
    // repeatable item has no total.
    const standing = new Set(
      city.queue.filter((item) => item.kind === 'project').map((item) => item.id),
    );
    for (const id of PROJECT_IDS) {
      if (standing.has(id)) continue;
      if (!isUnlocked(state, city.ownerId, 'project', id)) continue;
      const def = projectDef(id);
      const button = element('button', 'city-buildable is-building');
      button.type = 'button';
      button.disabled = locked;
      button.setAttribute(
        'aria-label',
        `${def.name} — repeating project, ${def.cost} production for ${projectRate(id, PROJECT_SPOKEN)}`,
      );
      button.append(element('span', 'city-buildable-name', `${def.name} ↻`));
      button.append(
        element(
          'span',
          'city-buildable-cost',
          `${def.cost}${HAMMER} → ${projectRate(id, PROJECT_GLYPHS)}`,
        ),
      );
      info.bind(button, () => itemCard(city, { kind: 'project', id }, city.queue.length));
      button.addEventListener('click', () => add({ kind: 'project', id }));
      // No price tag: a project is a conversion that never completes, so there
      // is nothing to buy. See `PurchasableItem`.
      row(button);
    }

    box.append(grid);
    // What a price tag *is*, and nothing about how much money you have.
    //
    // The treasury figure used to lead this line, on the Buy Tiles caption's
    // precedent. It is off (user, 2026-08-27) because the precedent stopped
    // holding the day the top bar grew a gold chip: the number is on screen
    // already, a hand's width above this, and a second copy that only some
    // screens carry is a number a player has to check against itself. What is
    // left is the rule a tag cannot state on its own — the conversion, and that
    // the banked hammers are neither spent nor discounted — which is the part
    // somebody reading a price actually needs.
    box.append(
      element(
        'p',
        'hint',
        `A price tag buys the row outright at ${RULES.production.goldPerHammer}` +
          `${YIELD_GLYPH.gold} per ${HAMMER} of its full cost — the hammers this ` +
          'city has banked stay banked.',
      ),
    );
    return box;
  }

  /**
   * The small button beside a build row that buys the thing outright — "or
   * 60💰" — or `null` when this bank does not sell it at all.
   *
   * `label` overrides the terse form for a row that *is* the offer rather than
   * an alternative to one: the augur's row has no build button beside it, so it
   * reads "Call an augur · 40🕯" and fills the line.
   *
   * Every question it asks is the reducer's. The price is
   * `explainPurchaseCost`'s total, so the number on the tag is the number the
   * bank loses; the blocker is `purchaseError`'s sentence, so a greyed tag says
   * why in the words the command would have answered with. A `title` rather
   * than the hover card, because this is a *control* with a refusal on it and
   * the card beside it is describing the thing itself.
   */
  function priceTag(
    city: City,
    item: PurchasableItem,
    currency: PurchaseCurrency,
    locked: boolean,
    label?: string,
  ): HTMLElement | null {
    const { state } = getGame();
    const seat = localPlayerId();
    const price = explainPurchaseCost(state, seat, city.id, item, currency);
    if (!price) return null;
    const glyph = currency === 'faith' ? YIELD_GLYPH.faith : YIELD_GLYPH.gold;
    const button = element(
      'button',
      label === undefined ? 'city-buildable-buy' : 'city-buildable-buy is-offer',
    );
    button.type = 'button';
    setYieldText(
      button,
      label === undefined
        ? `or ${price.total}${glyph}`
        : `${label} · ${price.total}${glyph}`,
    );
    const blocker = locked
      ? `You have ended turn ${state.turn}`
      : purchaseError(state, seat, city.id, item, currency);
    button.disabled = blocker !== null;
    // Words only in the spoken form: a screen reader announcing a currency glyph
    // reads its Unicode name before the number it decorates.
    button.setAttribute(
      'aria-label',
      blocker ?? `Buy ${purchasableName(item)} for ${price.total} ${currency}`,
    );
    button.title = blocker ?? `Buy ${purchasableName(item)} outright`;
    button.addEventListener('click', () => buy(city, item, currency));
    return button;
  }

  /** DOM wrapper over `defenseRows` — see it for the rule this ledger keeps. */
  function renderDefense(city: City): HTMLElement {
    const { state } = getGame();
    const box = element('div', 'city-defense');
    box.append(element('h3', undefined, 'Defence'));
    const list = element('ul', 'city-modifiers ledger');
    for (const row of defenseRows(state, city)) {
      const item = element('li', 'city-modifier');
      item.append(element('span', undefined, row.label));
      item.append(element('span', 'city-modifier-effect', row.figures));
      list.append(item);
    }
    box.append(list);
    return box;
  }

  /**
   * What this town believes — one line per faith with a claim on it, and the
   * citizens who follow nothing.
   *
   * Under the citizens' row rather than beside the buildings, because it is a
   * fact about the *people*: a religion does not take a town, it takes people in
   * it one at a time, and the town flies the banner more than half of them
   * follow (`City.followers`). So this reads as a second reading of the row
   * above it.
   *
   * Absent entirely until something presses, which is most of a game — the
   * `renderBuilt` reading rather than `renderRoutes`': a town nobody has preached
   * to has nothing to say about faith, and a permanent "no religion" line would
   * be the sheet answering a question nobody asked.
   *
   * Foreign faiths are named in **their founder's ink**, because whose faith it
   * is is the whole of what makes a rival's banner in your town news.
   */
  function renderFollowers(city: City): HTMLElement | null {
    const { state } = getGame();
    const rows = cityFaithRows(state, city, localPlayerId());
    if (rows.length === 0) return null;
    const box = element('div', 'city-built city-faith');
    box.append(element('h3', undefined, 'Faith'));
    for (const row of rows) {
      const line = element('p', row.ours ? 'city-faith-row' : 'city-faith-row is-foreign');
      const name = element('span', 'city-faith-name', row.name);
      if (!row.ours) {
        name.style.setProperty('--seat-ink', row.founderColor);
        name.title = `Founded by ${row.founderName}`;
      }
      line.append(document.createTextNode('Following '));
      line.append(name);
      if (row.majority) {
        // The banner. A mark rather than a word, beside the name it is about,
        // exactly as the capital's star sits beside a city's.
        const mark = element('span', 'city-faith-majority', '✶');
        mark.title = `More than half of ${city.name} follows ${row.name}`;
        line.append(mark);
      }
      line.append(
        element(
          'span',
          'city-faith-count',
          ` · ${figure(row.following)} of ${figure(row.population)} citizens`,
        ),
      );
      // The ledger on hover, and the bank's distance to the next citizen after
      // it: how hard a faith is pressing and how close the next one is to
      // turning are two different questions, and this is the one place either is
      // answerable.
      const ledger = pressureLedgerText(row.ledger);
      line.title =
        row.banked > 0
          ? `${ledger} · ${row.banked} of ${row.perConvert} toward the next citizen`
          : ledger;
      box.append(line);
    }
    const left = unconvertedCitizens(city);
    if (left > 0) {
      box.append(
        element(
          'p',
          'hint',
          `${figure(left)} of ${figure(city.population)} follow the old gods.`,
        ),
      );
    }
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

  /**
   * The routes this town is an end of, and what the empire has left to spend.
   *
   * Under the buildings because that is what a route is made of: `routeSlots`
   * is a fold over the markets and harbours in the list above it, and what a
   * caravan brings home is counted off its partner's buildings. A player
   * reading downward meets "Market · Uruk" and then the caravan it paid for.
   *
   * The **trading post** is a mark rather than a row. It is not a building — it
   * is the *history* of having been an end of a route, written permanently by
   * `startRouteAt` and never cleared — and all it does is let later caravans
   * reach further, which is a fact about this town rather than a thing it makes.
   * So it sits beside the heading like the capital's star and says so on hover.
   *
   * Drawn even when the town is an end of nothing, because the slot figure is
   * the answer to "why can I not start another route" and a section that
   * vanished would take that answer with it — the greyed-row reading, one
   * screen over.
   */
  function renderRoutes(city: City): HTMLElement | null {
    const { state } = getGame();
    if (city.ownerId !== localPlayerId()) return null;
    const rows = cityRouteRows(state, city);
    const box = element('div', 'city-built');
    const head = element('h3', undefined, 'Routes');
    if (city.tradingPost === true) {
      const post = element('span', 'city-size', '⌂ trading post');
      post.title =
        'This town has been an end of a trade route. A post extends how far ' +
        'later caravans may be sent from or to it.';
      head.append(document.createTextNode(' '), post);
    }
    box.append(head);
    box.append(element('p', 'hint', routeSlotsLineOf(state, localPlayerId())));
    // A door to the Trade screen, and the one a player reaches from a *town*
    // rather than from a piece: this row already answers "why can I not start
    // another route", and the screen is where that is acted on. Offered
    // whether or not this town is an end of anything — an empire's trade is
    // exactly what a town with no routes wants to look at.
    if (onOpenTrade) {
      const all = element('button', 'btn btn-quiet btn-tiny', 'All routes');
      (all as HTMLButtonElement).type = 'button';
      all.title = 'Every caravan and every partner';
      all.addEventListener('click', () => onOpenTrade());
      box.append(all);
    }
    if (rows.length === 0) {
      box.append(element('p', 'hint', 'No caravan runs to or from this town.'));
      return box;
    }
    // Inbound first — those are the routes that pay *here* now (2026-08-27: the
    // origin's buildings set the figure, the destination banks it), and
    // `row.text` already carries the direction arrow and, for a paying route,
    // its figures — see `cityRouteRows`.
    for (const row of [...rows].sort((a, b) => Number(a.outbound) - Number(b.outbound))) {
      box.append(element('p', 'hint', row.text));
    }
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
    // Hit points beside population, in the same small voice — `cityMaxHp` is
    // the fold `explainCityMaxHp` breaks down, so the tooltip and the figure
    // can never disagree.
    const hp = element('span', 'city-size', `${city.hp}/${cityMaxHp(city)} hp`);
    hp.title = maxHpLedger(city);
    title.append(hp);
    // Derived every render and never stored — see `underSiege`. A besieged
    // town neither heals nor holds, and this is the only place a player who
    // has not opened the compendium learns that Uruk is starving rather than
    // merely wounded.
    if (underSiege(state, city, siegeField(state, city.ownerId))) {
      const badge = element('span', 'city-size is-siege', 'Under siege');
      badge.title =
        'Every neighbouring hex is denied to this town — it cannot heal and ' +
        'loses a little health each turn, but only an attack can take it.';
      title.append(badge);
    }
    header.append(title);

    const close = element('button', 'city-close', '×');
    close.type = 'button';
    close.title = 'Close (Esc)';
    close.addEventListener('click', onClose);
    header.append(close);
    container.append(header);

    container.append(renderYields(city));
    container.append(renderCitizens(city));
    // Directly under the citizens' row, because it is a note about *that* row:
    // why those hexes and not the ones the town worked last turn.
    const focus = renderCitizenFocus(city);
    if (focus) container.append(focus);
    // And what those citizens believe — a second reading of the row above, and
    // absent until something presses. See `renderFollowers`.
    const faith = renderFollowers(city);
    if (faith) container.append(faith);
    container.append(renderGrowth(city));
    container.append(renderProduction(city));
    // After production, because the two food/hammer baskets are what a player
    // reads first and territory is the slower clock underneath them.
    container.append(renderBorders(city, locked));
    // Beside borders and ahead of the queue: what the town is worth in a fight
    // is a standing fact about it, not a plan a player is editing.
    container.append(renderDefense(city));
    container.append(renderQueue(city, locked));
    const built = renderBuilt(city);
    if (built) container.append(built);
    // Under the buildings, because a route's slots are a fold over them — see
    // `renderRoutes`.
    const routes = renderRoutes(city);
    if (routes) container.append(routes);
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
          : // The board draws a *ring* on every worked hex and has since the
            // overlay pass — bone white where the assignment chose the tile,
            // the seat's own ink where the player pinned it (`overlays.ts`).
            // This line still said "dots" (user, 2026-08-27), which is the one
            // thing on the board it is not.
            'A ringed hex is a tile this city works. Click one to pin a ' +
            'citizen there, or any other hex in the work radius to move one ' +
            'to it. A unit standing in the radius is selected by clicking its ' +
            'badge.',
      ),
    );
  }

  return { render };
}
