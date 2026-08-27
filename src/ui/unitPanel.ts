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
 * one hard-coded button — sleep, disband and the rest are the same shape and
 * will slot in beside it. Milestone 5 filled the first of those slots: Fortify
 * arrived as one more entry in the list and the list learned nothing about it.
 *
 * Fortify differs from Found City in one deliberate way. Founding is only
 * *listed* for units that could ever found, because a warrior will never grow
 * the ability; fortifying is listed for everything that can fight and merely
 * *disabled* when it cannot be done right now, because "already fortified" and
 * "your turn is over" are temporary and the button will work again next turn.
 * A permanently useless button and a momentarily unavailable one should not
 * look the same.
 *
 * Every action is enabled by exactly the rule the reducer applies, and titled
 * with the reason when it is not: the caller hands over a blocker string (for
 * founding, `foundingError` by way of `controls.foundCityBlocker`), so a
 * disabled button and a rejected command can never disagree.
 *
 * Built and torn down from the simulation on every render, like the city panel:
 * the state is the truth and a selection is at most a few dozen elements.
 */

import { fortifyBonus, isCivilian, isCombatant, isFortified, isRanged } from '../sim/combat';
import type { ImprovementId } from '../sim/improvementData';
import { chargesLeft, isBuilder } from '../sim/improvements';
import { isAugur } from '../sim/religion';
import { type RiteId, riteDef } from '../sim/religionData';
import { describeCard } from '../sim/statecraft';
import type { GreatPersonView, RiteOption } from './controls';
import { getTileAt } from '../sim/map';
import type { Game } from '../sim/game';
import { explainAuthority, meterStanding } from '../sim/meters';
import { inZoneOfControl, pathTurns } from '../sim/pathfind';
import { cityAt } from '../sim/cities';
import type { GameState, Unit } from '../sim/state';
import type { TileYield } from '../sim/terrainData';
import { unitDef } from '../sim/unitData';
import type { ImprovementOption } from './controls';
import { cityDisplayName } from './cityDisplay';
import { describeTile, knowsCity } from './tileReadout';
import { HAMMER, YIELD_GLYPH, signedFigure } from './figures';
import { createInfoCard } from './infoCard';
import { yieldFigureNodes } from './yieldMark';

/** "+40%" — a defence fraction as the percentage a player reads it as. */
function formatPercent(fraction: number): string {
  return `+${Math.round(fraction * 100)}%`;
}

/** The three voices an improvement can move, in the order the panel reads them. */
const DELTA_KEYS = ['food', 'production', 'gold'] as const;

/** "Chop +20⚙" with the cogwheel drawn — the axe's one-row payout. */
function chopLabel(production: number): DocumentFragment {
  const fragment = document.createDocumentFragment();
  fragment.append(document.createTextNode('Chop '));
  fragment.append(yieldFigureNodes(signedFigure(production), 'production'));
  return fragment;
}

/**
 * "+1🌾 +1💰" — a yield delta in the three voices, zeroes left out, with each
 * mark **drawn**.
 *
 * The marks come from `src/ui/yieldMark.ts`, the one printer every yield glyph
 * on this interface goes through (the context card, the city panel, the top
 * bar), because a player should not have to learn that a sheaf on one panel is
 * the same thing as a sheaf on another. `null` for an empty delta, and the
 * caller decides what to do about it — which is nothing, since an improvement
 * worth no yield is still worth building for the resource it opens.
 */
function yieldDeltaNodes(delta: TileYield): DocumentFragment | null {
  const keys = DELTA_KEYS.filter((key) => delta[key] !== 0);
  if (keys.length === 0) return null;
  const fragment = document.createDocumentFragment();
  keys.forEach((key, index) => {
    if (index > 0) fragment.append(document.createTextNode(' '));
    fragment.append(yieldFigureNodes(signedFigure(delta[key]), key));
  });
  return fragment;
}

/**
 * The same delta as plain text, for the `title` attribute beside it.
 *
 * The deliberate half of the emoji retirement: a hover card built by the
 * platform out of an attribute string cannot hold an element, so the row that
 * *shows* a drawn cogwheel still *says* `⚙` when a pointer rests on it. Every
 * such surface in this interface keeps `YIELD_GLYPH` for that reason and no
 * other — see the register in `figures.ts`.
 */
function formatYieldDelta(delta: TileYield): string {
  return DELTA_KEYS.filter((key) => delta[key] !== 0)
    .map((key) => `${signedFigure(delta[key])}${YIELD_GLYPH[key]}`)
    .join(' ');
}

/**
 * "Requires Mining\nA mine needs Mining" — a greyed-for-tech row's hover card,
 * unlock first.
 *
 * `techName` is `null` for every row that is not tech-blocked at all (a
 * pressable row, or one the ground itself is refusing), in which case this
 * hands back `undefined` and the button falls through to its usual
 * `blocked ?? hint`. The two lines are never a substitute for one another:
 * the headline is what a player scanning the sheet wants first, and the
 * reducer's own sentence stays underneath it for the player who wants the
 * exact reason — the same one the command would refuse with.
 */
function techHoverTitle(techName: string | null, blocked: string | null): string | undefined {
  if (techName === null) return undefined;
  return `Requires ${techName}\n${blocked}`;
}

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
  /**
   * Why the selected unit cannot dig in — the same three-valued shape again,
   * answered by `controls.fortifyBlocker()`.
   */
  fortifyBlocker: () => string | null | undefined;
  onFortify: () => void;
  /**
   * Why the selected unit cannot be told to sleep — the same three-valued shape
   * again, answered by `controls.sleepBlocker()`.
   */
  sleepBlocker: () => string | null | undefined;
  onSleep: () => void;
  /**
   * Why the selected unit cannot be waved off this turn — the same
   * three-valued shape again, answered by `controls.skipBlocker()`.
   */
  skipBlocker: () => string | null | undefined;
  onSkip: () => void;
  /** Whether the selected unit has already been skipped this turn. */
  isUnitSkipped: () => boolean;
  /**
   * The improvements the selected unit could build where it stands, already
   * filtered to the legal ones and carrying their yield deltas —
   * `controls.improvementOptions()`.
   *
   * A list rather than a blocker, because this verb is six verbs. See
   * `GameControls.improvementOptions` for why the illegal ones are absent
   * instead of greyed out.
   */
  improvementOptions: () => ImprovementOption[];
  onBuildImprovement: (id: ImprovementId) => void;
  /**
   * Why the selected worker cannot clear the feature it is standing in — the
   * same three-valued shape as `foundCityBlocker`, answered by
   * `controls.chopBlocker()`.
   *
   * A blocker rather than a list, unlike the improvements, because there is only
   * ever one feature on a hex: nothing to choose between, everything to explain.
   */
  chopBlocker: () => string | null | undefined;
  /**
   * What clearing would pay, where it lands, and what it would *finish* —
   * `controls.chopPreview()`. `completes` is the name of the item the timber
   * would settle on the spot (Entry XVIII), or `null` when the queue is empty,
   * unaffordable or held; it is the settlement check's own answer, never a
   * comparison this panel makes.
   */
  chopPreview: () => { production: number; cityName: string; completes: string | null } | null;
  /**
   * The technology a greyed Chop row is waiting on, or `null` —
   * `controls.chopTechName()`. See `ImprovementOption.requiredTechName` for
   * why this is a name read off the same data the reducer's refusal reads,
   * never parsed out of `chopBlocker`'s sentence.
   */
  chopTechName: () => string | null;
  onChop: () => void;
  /**
   * Why the selected unit cannot pillage — the same three-valued shape as
   * `foundCityBlocker`, answered by `controls.pillageBlocker()`.
   */
  pillageBlocker: () => string | null | undefined;
  onPillage: () => void;
  /**
   * Why the selected augur cannot consecrate a god — the same three-valued
   * shape as `foundCityBlocker`, answered by `controls.consecrateBlocker()`.
   *
   * A blocker rather than a list, because it is one verb: a pantheon with no
   * room says so in one sentence, and the sentence is the reducer's own.
   */
  consecrateBlocker: () => string | null | undefined;
  onConsecrate: () => void;
  /**
   * The rites this augur could perform where it stands —
   * `controls.riteOptions()`, already carrying each row's blocker and payoff.
   *
   * A list rather than a blocker, because this verb is five verbs. Unlike the
   * improvements, the rows the *tree* refuses stay on the list and are greyed
   * with the node named: a rite is a permanent gift of a technology, and hiding
   * one would make it something a player discovers by accident.
   */
  riteOptions: () => RiteOption[];
  onPerformRite: (id: RiteId) => void;
  /**
   * Who the selected piece is, if it is a great person, and what its two verbs
   * would do — `controls.greatPersonView()`, or `null` for every other piece.
   *
   * **One object rather than the six accessors** every other verb on this sheet
   * takes, and the exception is the sheet's own doing: a great person changes
   * the *header* as well as the actions list — the name, the family, the
   * epigram — so this panel is answering one question about who is selected
   * rather than six about what the ground allows.
   */
  greatPerson: () => GreatPersonView | null;
  onGreatPersonAct: () => void;
  onGreatPersonWork: () => void;
  /** Drops the selection — the × button and, through `controls`, Escape. */
  onClose: () => void;
}

export interface UnitPanel {
  render(): void;
}

/** One row of the actions list. Everything a future verb will need. */
interface UnitAction {
  /**
   * The row's name. A `DocumentFragment` for the two rows that quote a yield —
   * the improvement deltas and the chop's payout — because a yield's mark is a
   * masked element now rather than a character (`src/ui/yieldMark.ts`), and a
   * string cannot carry one. Everything else is still a plain label.
   */
  label: string | DocumentFragment;
  /** The keyboard shortcut that does the same job, worn on the button. */
  key?: string;
  /** Why it cannot be taken, or `null` when it can. */
  blocked: string | null;
  /** What it is for, shown when nothing is blocking it. */
  hint: string;
  /**
   * Overrides the hover text `blocked ?? hint` would otherwise show.
   *
   * Only the greyed-for-tech rows set this: their card leads with the unlock
   * ("Requires Mining") ahead of the reducer's own sentence, which is one
   * fact more than `blocked` alone says. `undefined` everywhere else, which
   * keeps `blocked ?? hint`'s usual meaning intact.
   */
  title?: string;
  /**
   * A **hover card** for a row whose sentence is longer than a `title` should
   * be, or absent for the rows whose whole meaning is their label.
   *
   * The rites' (user, 2026-08-27): "Rite of Plenty" says nothing at all about
   * what a rite of plenty *does*, and the augur has three charges and five
   * names to spend them on. A `title` was the wrong instrument — a native
   * tooltip arrives a second late, on top of whatever else is up, and cannot
   * rule a clause list — so the rows that need paragraphs get the same
   * `.info-card` the build list and the star chart raise, and the rest keep the
   * one-line `title` they have always had.
   */
  card?: () => Node;
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

/**
 * What the far end of a standing order is *called* — "Uruk", "Forest (14, 9)",
 * "(14, 9)".
 *
 * A route is a list of coordinates, and a sheet that printed the last pair of
 * them would be asking the player to hold a map in their head. So the hex is
 * named the way every other surface in this interface names one: a town if this
 * seat knows there is a town there, otherwise the ground, with the coordinates
 * kept beside it because two forests look identical in a sentence.
 *
 * Two rules are borrowed rather than restated, which is the whole reason this is
 * a function and not three lines inside `render`:
 *
 *   · **`knowsCity`** (`tileReadout.ts`) decides whether the town may be named
 *     at all. "Marching to Uruk" about a city this seat has never seen would be
 *     the unit sheet leaking the map, and the banners' rule is the one already
 *     written down for exactly this question.
 *   · **`describeTile`** names the ground, so a hex reads the same here as it
 *     does in the context card under the pointer.
 *
 * Pure, and exported for the test that pins those two borrowings: the failure
 * this guards against is a sentence that is merely wrong, which no thrown error
 * would ever catch.
 */
export function marchDestination(
  state: GameState,
  playerId: number,
  cell: { col: number; row: number },
): string {
  const where = `(${cell.col}, ${cell.row})`;
  const tile = getTileAt(state.map, cell.col, cell.row);
  // An order aimed off the map is not a thing the reducer will take, so this is
  // a hand-edited save or a stale path; the coordinates are still the truth.
  if (!tile) return where;

  const city = cityAt(state, tile.col, tile.row);
  if (city && knowsCity(state, playerId, city.id, tile)) {
    return cityDisplayName(state, city);
  }

  const { terrain, feature, hills } = describeTile(tile);
  // The feature is what the eye sees first — a march into a forest is a march
  // into a forest whatever the soil under it is — and the hills are the one
  // fact about bare ground worth a word, being what the route will cost.
  const ground = feature ?? (hills ? `${terrain} hills` : terrain);
  return `${ground} ${where}`;
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
    fortifyBlocker,
    onFortify,
    sleepBlocker,
    onSleep,
    skipBlocker,
    onSkip,
    isUnitSkipped,
    improvementOptions,
    onBuildImprovement,
    chopBlocker,
    chopPreview,
    chopTechName,
    onChop,
    pillageBlocker,
    onPillage,
    consecrateBlocker,
    onConsecrate,
    riteOptions,
    onPerformRite,
    greatPerson,
    onGreatPersonAct,
    onGreatPersonWork,
    onClose,
  } = options;

  /**
   * The hover card this sheet's longer rows raise — the same component and the
   * same `info-card` dress the build list and the star chart use, so a clause
   * reads identically wherever a player meets one. One per panel, appended to
   * the body once at construction; `render` puts it away before it rebuilds.
   */
  const info = createInfoCard({ className: 'info-card' });

  /**
   * How many more turns the unit's standing order will take, as an estimate the
   * panel is honest about calling one (hence the `~`).
   *
   * One line, because the arithmetic belongs to the movement evaluator and not
   * to the panel that prints it: `pathTurns` re-walks the stored waypoints
   * through the very `stepCost` the turn change will spend the points with, so
   * the terrain, the mover's abilities and any enemy picket the route slides
   * along are all priced once. The panel used to keep its own copy of that loop,
   * which is exactly the sort of second implementation a new movement rule
   * silently leaves behind. Deriving it rather than storing it on the unit is
   * deliberate; a cached number would be one more thing that can be wrong.
   */
  function turnsRemaining(unit: Unit): number {
    return pathTurns(getGame().state, unit, unit.path ?? []);
  }

  /**
   * "Authority 8/10 → 10/10" — what founding *here* would cost, before it is
   * spent.
   *
   * Entry VIII's pre-decision delta, and the one-evaluator rule doing the work:
   * both halves are `explainAuthority`, once as things stand and once with this
   * very tile handed to it as a prospect, so the projection cannot promise a
   * price the reducer will not charge. The coastal discount comes along for
   * free — it is the same `isCoastal` the settler lens has already painted this
   * hex blue for.
   *
   * Only shown when founding here is actually legal, which is exactly when the
   * Found City button is enabled: a projection for a site the reducer would
   * refuse is a number about a city that will never exist.
   */
  function authorityDelta(unit: Unit): string | null {
    if (!unitDef(unit.type).foundsCity) return null;
    if (foundCityBlocker() !== null) return null;
    const { state } = getGame();
    const tile = getTileAt(state.map, unit.col, unit.row);
    if (!tile) return null;
    const now = meterStanding(explainAuthority(state, unit.ownerId));
    const after = meterStanding(explainAuthority(state, unit.ownerId, { site: tile }));
    return `Authority ${now.cost}/${now.gain} → ${after.cost}/${after.gain}`;
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
   * A great person's verb, as the hover card says it: what it does, why it
   * cannot be done, and the legacy that attaches whichever way you choose.
   *
   * The legacy is on **both** cards on purpose. It is the half of a recruit that
   * does not depend on the decision — *they served you; their legacy remains* —
   * so a player weighing burst against ground should see it twice and stop
   * weighing it. A `deferred` clause is marked in the words, because a `title`
   * attribute is text the platform draws and cannot be struck through the way
   * the card that dealt this name struck it.
   */
  function verbTitle(
    view: GreatPersonView,
    verb: { blocked: string | null; preview: string },
    when: 'now' | 'forever',
  ): string {
    const lines = [
      verb.blocked ?? `${view.name} · ${when} — ${verb.preview}`,
    ];
    for (const clause of view.legacy) {
      lines.push(`Legacy: ${clause.text}${clause.deferred ? ' (not built yet)' : ''}`);
    }
    return lines.join('\n');
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
    // Read once, at the top, because it decides two things: whether the two
    // verbs are offered at all, and whether the *builder's* rows are.
    const person = greatPerson();
    if (unitDef(unit.type).foundsCity) {
      // `undefined` means "no unit selected", which cannot happen while a unit
      // is being rendered — but it is a different value from `null` ("no
      // blocker"), and collapsing the two would disable the button for exactly
      // the case it should be enabled in.
      const blocker = foundCityBlocker();
      // The price rides on the button as well as on the sheet: the found-city
      // flow is where the authority is actually spent.
      const price = authorityDelta(unit);
      actions.push({
        label: 'Found City',
        key: 'B',
        blocked: blocker === undefined ? 'No unit selected' : blocker,
        hint: price ? `Found a city here · ${price}` : 'Found a city here',
        run: onFoundCity,
      });
    }
    // Offered to anything that can fight, whether or not it can fortify *now*:
    // unlike Found City, this is a verb the unit will have again next turn, so a
    // button that is merely disabled (and says why) is the honest version.
    if (isCombatant(unitDef(unit.type))) {
      const blocker = fortifyBlocker();
      const dug = isFortified(unit);
      actions.push({
        label: dug ? `Fortified ${formatPercent(fortifyBonus(unit))}` : 'Fortify',
        key: 'F',
        blocked: blocker === undefined ? 'No unit selected' : blocker,
        hint: 'Dig in: defence grows each turn the unit stays put',
        run: onFortify,
      });
    }
    // Fortify's civilian half, and it sits in Fortify's slot for that reason:
    // the two are the same gesture ("stay here, stop asking") worn by the two
    // halves of the roster, they are mutually exclusive by `sleepError` and
    // `fortifyError`, and a sheet that offered both to anybody would be a sheet
    // asking the player to know which one their piece is allowed. Listed for
    // every civilian whether or not it can sleep *now*, which is Fortify's
    // reading exactly: "already asleep" is a state worth showing, not a row
    // worth hiding.
    if (isCivilian(unitDef(unit.type))) {
      const blocker = sleepBlocker();
      actions.push({
        label: unit.sleeping === true ? 'Sleeping 💤' : 'Sleep',
        key: 'Z',
        blocked: blocker === undefined ? 'No unit selected' : blocker,
        hint: 'Sleep here — stops blocking End Turn until enemies come near',
        run: onSleep,
      });
    }
    // Offered to every unit, not only combatants or builders: any piece with
    // moves left can be told to sit this turn out. Not Fortify's cousin —
    // fortifying is a standing order the reducer grants a bonus for, skipping
    // is silence the interface keeps to itself (`controls.ts`'s `skipUnit`
    // docblock) — so both are always separate rows rather than one verb
    // wearing two labels.
    {
      const blocker = skipBlocker();
      const skipped = isUnitSkipped();
      actions.push({
        label: skipped ? 'Waiting This Turn' : 'Skip Turn',
        key: 'Space',
        blocked: blocker === undefined ? 'No unit selected' : blocker,
        hint: 'Do nothing this turn — stops asking to be ordered',
        run: onSkip,
      });
    }
    // The builder's verbs, one per improvement this hex could take.
    //
    // Which rows are here and which are greyed is `improvementOptions`'s rule,
    // not this panel's: a hex the ground refuses is absent, and a hex the *tree*
    // refuses is present and greyed with the technology named. So the list is
    // the shape of the ground the worker is standing on, plus the things a
    // research choice away from being possible on it.
    //
    // The label carries the delta, from the same evaluator the city banks with,
    // so a charge is spent against a number rather than against a hope — and a
    // greyed row carries it too, because "the mine here would be worth 2⚙" is
    // precisely the argument for going and researching Mining.
    // `isBuilder` is "this piece has charges", and a great person is the first
    // piece in the game that has them without being a worker. Its charge buys an
    // act or a work, not spadework, so the six improvement rows and the axe are
    // not its verbs — an "Act · Work · Chop" sheet would be offering a third
    // thing the roster has never heard of. The augur is excused the same way by
    // *not* being a builder at all; this one has to say so.
    if (isBuilder(unit) && !person) {
      for (const option of improvementOptions()) {
        const delta = yieldDeltaNodes(option.delta);
        let label: string | DocumentFragment = option.name;
        if (delta) {
          const row = document.createDocumentFragment();
          row.append(document.createTextNode(`${option.name} `), delta);
          label = row;
        }
        actions.push({
          label,
          blocked: option.blocked,
          hint:
            `Spend a charge: ${option.name.toLowerCase()} on this tile` +
            // The hover card is a `title` attribute and therefore text, so the
            // delta it quotes wears the plain glyph. Deliberate, and the reason
            // `formatYieldDelta` survived the drawn marks.
            (delta ? ` · ${formatYieldDelta(option.delta)}` : ''),
          title: techHoverTitle(option.requiredTechName, option.blocked),
          run: () => onBuildImprovement(option.id),
        });
      }
      // The axe sits beside the improvements because it is the same worker
      // spending the same charge — but it is one row rather than six, and it is
      // *greyed* rather than hidden when the ground refuses. That is Fortify's
      // reading and it is deliberate: "there is no forest here" is a fact about
      // this hex this turn, and the worker will be standing somewhere else
      // tomorrow. Hiding it would make the verb something a player has to
      // discover by wandering into a wood.
      //
      // The payout rides on the label whenever there is one to quote, greyed row
      // included, for the reason a greyed Mine still quotes its 2⚙: the number
      // is the argument.
      const chop = chopPreview();
      const chopBlocked = chopBlocker();
      actions.push({
        label: chop ? chopLabel(chop.production) : 'Chop',
        blocked: chopBlocked === undefined ? 'No unit selected' : chopBlocked,
        // The completion rides on the end of the hint when there is one, because
        // "this chop finishes the granary" is a different decision from "this
        // chop pays twenty hammers" — it is the argument, and it is why the
        // clause is loud (`!`) rather than parenthetical.
        hint: chop
          ? `Spend a charge: clear this tile · +${chop.production}${HAMMER} → ${chop.cityName}` +
            (chop.completes ? ` · completes ${chop.completes}!` : '')
          : 'Spend a charge: clear the feature on this tile',
        title: techHoverTitle(chopTechName(), chopBlocked ?? null),
        run: onChop,
      });
    }
    // The augur's two verbs, and the order is the decision: **Consecrate first**,
    // because it is the one that spends the whole piece and the one a player is
    // choosing *against* when they perform a rite instead. Its blocker sentence
    // is the reducer's own — "Your pantheon has no room for another god" — so a
    // greyed row explains itself rather than merely refusing.
    if (isAugur(unit)) {
      const blocker = consecrateBlocker();
      actions.push({
        label: 'Consecrate',
        blocked: blocker === undefined ? 'No unit selected' : blocker,
        hint: 'Spend this augur — the whole of it — to name a god of your pantheon',
        run: onConsecrate,
      });
      for (const rite of riteOptions()) {
        actions.push({
          label: rite.name,
          blocked: rite.blocked,
          hint:
            `Spend a rite: ${rite.name.toLowerCase()}` +
            (rite.preview ? ` · ${rite.preview}` : ''),
          title: techHoverTitle(rite.requiredTechName, rite.blocked),
          card: () => riteCard(rite),
          run: () => onPerformRite(rite.id),
        });
      }
    }
    // The great person's two verbs, and they are **two** rather than a list for
    // the reason the augur's Consecrate is one: the family decides *which* act
    // and *which* work (`greatPersonActAt`, `workOf`), so the player is choosing
    // between the burst and the ground rather than between five gifts. That
    // choice is the whole of what a recruit puts to you (`docs/great-people.md`)
    // — which is why both rows carry the number they would pay and the town or
    // the hex it would land on, and why neither is ever hidden: "your nearest
    // city is three hexes away" is a fact about where the piece is standing this
    // turn, not a verb it will never have.
    //
    // The labels are the two words and nothing else. The simulation names no
    // verb per family, and inventing five ("Discourse", "Compose", "Survey"…)
    // would be the interface teaching a vocabulary the rules do not have.
    if (person) {
      actions.push({
        label: 'Act',
        blocked: person.act.blocked,
        hint: `Spend ${person.name} now — ${person.act.preview}`,
        title: verbTitle(person, person.act, 'now'),
        run: onGreatPersonAct,
      });
      actions.push({
        label: 'Work',
        blocked: person.work.blocked,
        hint: `Spend ${person.name} here, forever — ${person.work.preview}`,
        title: verbTitle(person, person.work, 'forever'),
        run: onGreatPersonWork,
      });
    }
    // Pillage is offered to anything that can fight, and merely *disabled* when
    // there is nothing here to burn — Fortify's reading rather than the
    // improvements' one, because "there is nothing to pillage" is a fact about
    // this hex this turn, and a soldier will meet the verb again tomorrow.
    // No hotkey in v1: the actions panel is the whole of it.
    if (unitDef(unit.type).category === 'military') {
      const blocker = pillageBlocker();
      actions.push({
        label: 'Pillage',
        blocked: blocker === undefined ? 'No unit selected' : blocker,
        hint: 'Burn the improvement here and take the salvage',
        run: onPillage,
      });
    }
    // Only offered while there is something to cancel: a permanently disabled
    // "Cancel Orders" on every unit that has never been given one would be a
    // button that means nothing, exactly as Found City is on a warrior. The
    // label is the plural the Orders line above uses, so the button reads as the
    // answer to that line rather than as a verb about something else.
    if (unit.path && unit.path.length > 0) {
      const blocker = cancelOrderBlocker();
      actions.push({
        label: 'Cancel Orders',
        blocked: blocker === undefined ? 'No unit selected' : blocker,
        hint: 'Stop here and forget the rest of the route',
        run: onCancelOrder,
      });
    }
    return actions;
  }

  /**
   * What a rite *is*, on the card that rises beside the row.
   *
   * Five names on an augur's sheet with nothing but their titles was the
   * playtest's complaint (user, 2026-08-27), and it is the same complaint the
   * build list answered with a hover card: a player deciding how to spend three
   * charges is comparing five things they cannot read.
   *
   * Every word comes from the simulation and none is written here:
   *
   *   · **what it does now** — `RiteOption.preview`, the reducer's own targeted
   *     sentence ("+1 pop to Uruk"), so the card promises exactly the number the
   *     command will pay and names the town it will land in.
   *   · **what it leaves behind** — `describeCard`, the one function that turns
   *     a `CardEffect` into words, which is why a rite and a belief and an Order
   *     read identically. A UI copy of the effect text would be the second
   *     description this codebase spends whole modules avoiding.
   *   · **the flavour**, last and in the flavour's own voice.
   *
   * **No duration line**, and that is the one place this card differs from the
   * Religion screen's reference. A clause is an ordinary `CardEffect` and knows
   * nothing about the rite it hangs on, so that screen has to print
   * `RiteDef.duration` beside the clauses or it promises Omen Reading's science
   * for ever — but `ritePreview` already ends with "20 turns of blessing", and a
   * card that said the number twice on six lines would be the city panel's
   * doubled Empire row in miniature.
   *
   * A rite has **no price** to print. It is not bought — the augur is, once, out
   * of the faith bank (`purchase.exclusive`), and a rite spends one of the three
   * charges that came with the piece. So the card says what the charge buys and
   * the sheet's own Charges line says how many are left; a coin figure here
   * would be inventing a bank.
   */
  function riteCard(rite: RiteOption): Node {
    const def = riteDef(rite.id);
    const card = element('div', 'unit-card');
    card.append(element('h4', 'unit-card-title', rite.name));
    if (rite.preview) card.append(element('p', 'unit-card-payoff', rite.preview));
    const clauses = describeCard(rite.id);
    for (const clause of clauses) {
      card.append(
        element(
          'p',
          clause.deferred ? 'unit-card-clause is-deferred' : 'unit-card-clause',
          clause.text,
        ),
      );
    }
    // The one thing on the card that is not about the rite: what it *costs*,
    // which is the piece rather than a purse. Said here because this is the
    // screen where the decision is made.
    card.append(element('p', 'unit-card-clause', 'Spends one of the augur’s charges'));
    if (rite.blocked !== null) card.append(element('p', 'unit-card-blocked', rite.blocked));
    card.append(element('p', 'unit-card-flavor', def.flavor));
    return card;
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
      button.title = action.title ?? action.blocked ?? action.hint;
      const label = element('span', 'unit-action-label');
      if (typeof action.label === 'string') label.textContent = action.label;
      else label.append(action.label);
      button.append(label);
      if (action.key) button.append(element('kbd', 'unit-action-key', action.key));
      // The rows that carry a paragraph raise the card; the rest keep their
      // one-line `title`. Bound after the label so the anchor is the whole
      // button, which is what `placeCard` measures against.
      if (action.card) info.bind(button, action.card);
      button.addEventListener('click', action.run);
      box.append(button);
    }
    return box;
  }

  function render(): void {
    const unit = getUnit();
    // The panel tears its DOM down and builds it again, which takes the anchor
    // out from under an open card with no `pointerleave` to follow — the city
    // panel's reason exactly (`infoCard.ts`).
    info.hide();
    container.replaceChildren();
    container.hidden = unit === null;
    if (!unit) return;

    const def = unitDef(unit.type);
    const owner = getGame().state.players[unit.ownerId];
    // The accent is the owner's colour, the same hex the seat chip and the city
    // banner wear. Only ever your own unit is selectable, so in practice this is
    // "your colour" — but it is read from the unit, not assumed.
    container.style.setProperty('--unit-color', owner?.color ?? 'var(--ink)');

    // A great person is the one piece on the board whose *name* is the thing
    // worth printing: every other sheet is headed by a type ("Warrior",
    // "Settler") because one warrior is every warrior, and there is exactly one
    // Archimedes in the world (`state.recruited`). So the roster's name takes
    // the heading and the family takes the line under it, where the owner's name
    // sits for everybody else — the family being what decides both verbs, and
    // therefore the one fact about the piece a player has to read before
    // pressing anything.
    const person = greatPerson();
    const header = element('div', 'unit-header');
    const title = element('div', 'unit-title');
    title.append(element('h2', undefined, person ? person.name : def.name));
    title.append(
      element(
        'span',
        'unit-owner',
        person ? `${person.family} · ${owner?.name ?? 'Unowned'}` : owner?.name ?? 'Unowned',
      ),
    );
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
    // Charges, and only for things that have them — the same rule the fighting
    // numbers below follow, and for the same reason: a warrior's sheet must not
    // carry a "0 charges" that reads as a statistic rather than as "this is not
    // a builder". It is the *scarcest* thing about a worker (three of them, and
    // then the piece is gone), so it sits with health and movement rather than
    // being left to be inferred from how many buttons the actions list has.
    if (isBuilder(unit)) {
      const left = chargesLeft(unit);
      // The same field, two vocabularies: a worker's charges are spadework and
      // an augur's are **rites** (`UnitDef.consecrates` is the marker, not the
      // type's name). One line rather than two blocks, because it is one number
      // — the scarcest thing about either piece.
      const rites = isAugur(unit);
      // The same field, three vocabularies now: a worker's charges are
      // spadework, an augur's are rites, and a great person's is the *one* thing
      // they are — spent on the act or on the work, and then the piece is gone.
      const label = person ? 'Service' : rites ? 'Rites' : 'Charges';
      const mark = person ? '✦' : rites ? '✧' : '⚒';
      stats.append(stat(label, `${mark} ${left}/${def.charges ?? left}`, left <= 1));
    }
    // The fighting numbers, and only for things that fight: a settler's sheet
    // does not carry a strength of zero, which would read as a statistic rather
    // than as "this is not a soldier".
    if (isCombatant(def)) {
      stats.append(stat('Strength', String(def.combatStrength), false));
      if (isRanged(def)) {
        stats.append(stat('Ranged', `${def.rangedStrength} · ${def.range}⌖`, false));
      }
    }
    container.append(stats);

    // The epigram: one line, the roster's own, in the display italic the offer
    // card set it in. It is *flavour* and it is here anyway, because it is the
    // only thing on this sheet that says who the piece was — and a player who
    // took Archimedes over Hypatia three turns ago has forgotten which is which.
    if (person) {
      container.append(element('p', 'unit-epigram', person.epigram));
    }

    // The standing states a player has to know before ordering anything.
    // Fortification first: it is the one they chose.
    const notes: string[] = [];
    if (isFortified(unit)) notes.push(`Fortified ${formatPercent(fortifyBonus(unit))}`);
    // Beside fortification and for its reason: a standing state the player chose
    // and would otherwise have to infer from the button's label. The mark is the
    // same one the button wears, so the sheet says one thing twice rather than
    // two things once.
    if (unit.sleeping === true) notes.push('Sleeping 💤');
    // A board fact the player cannot see by looking, and the one rule that
    // turns a neighbouring enemy into a *cost*: stepping to another hex that
    // same piece also touches ends the turn on arrival (Entry XXV). Said here
    // rather than left to be discovered by losing a march to it — walking away
    // is still free, and that is the half the sentence is warning about.
    if (inZoneOfControl(getGame().state, unit)) {
      notes.push("Held by an enemy's zone of control");
    }
    // A view-only note for a view-only state: the sim has no idea this unit
    // was skipped (see `controls.ts`), so this is the one place it is said.
    if (isUnitSkipped()) notes.push('Waiting this turn');
    if (unit.hasAttacked) notes.push('Has attacked');
    // What this settler's city would cost the empire's writ, quoted before the
    // spade goes in. Nothing at all for anything that cannot found, or standing
    // anywhere the reducer would refuse.
    const price = authorityDelta(unit);
    if (price) notes.push(price);
    if (notes.length > 0) {
      container.append(element('p', 'unit-note', notes.join(' · ')));
    }

    // **What this piece has been told to do**, which is the question a player
    // clicking a unit is asking (user, playtest batch two: "clicking a unit
    // should show its current orders"). It used to say only "En route", which
    // is the one fact the board already draws for itself — `setCommittedPath`
    // paints the whole route under the selected piece — and left the two facts
    // a route cannot carry unsaid: *where* it ends and *how long* it will be.
    //
    // Both come from somewhere that already knows: `marchDestination` names the
    // hex by the banners' own rule, and `turnsRemaining` is `pathTurns`, the
    // movement evaluator's arithmetic rather than a copy of it. It is the line
    // the Cancel Orders button below answers, and it is the only readout a unit
    // ordered at zero movement gets — such a piece walks nothing this turn, so
    // nothing on the board moves and this sentence is the whole confirmation
    // that the order was taken.
    const orders = unit.path;
    if (orders && orders.length > 0) {
      const target = marchDestination(getGame().state, unit.ownerId, orders[orders.length - 1]!);
      container.append(
        element(
          'p',
          'unit-orders',
          `Orders: marching to ${target} · ~${turnsRemaining(unit)} turns`,
        ),
      );
    }

    container.append(renderActions(unit));
  }

  return { render };
}
