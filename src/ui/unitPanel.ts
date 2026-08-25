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

import { fortifyBonus, isCombatant, isFortified, isRanged } from '../sim/combat';
import type { ImprovementId } from '../sim/improvementData';
import { chargesLeft, isBuilder } from '../sim/improvements';
import { getTileAt } from '../sim/map';
import type { Game } from '../sim/game';
import { explainAuthority, meterStanding } from '../sim/meters';
import { tileMoveCost } from '../sim/pathfind';
import type { Unit } from '../sim/state';
import type { TileYield } from '../sim/terrainData';
import { unitDef } from '../sim/unitData';
import { fullMovement } from '../sim/units';
import type { ImprovementOption } from './controls';

/** "+40%" — a defence fraction as the percentage a player reads it as. */
function formatPercent(fraction: number): string {
  return `+${Math.round(fraction * 100)}%`;
}

/**
 * "+1🌾 +1🪙" — a yield delta in the three voices, zeroes left out.
 *
 * The glyphs are the ones every other yield readout on this interface uses (the
 * context card, the city panel), because a player should not have to learn that
 * a sheaf on one panel is the same thing as a sheaf on another. An empty delta
 * comes back as an empty string, and the caller decides what to do about it —
 * which is nothing, since an improvement worth no yield is still worth building
 * for the resource it opens.
 */
function formatYieldDelta(delta: TileYield): string {
  const parts: string[] = [];
  if (delta.food !== 0) parts.push(`${delta.food > 0 ? '+' : ''}${delta.food}🌾`);
  if (delta.production !== 0) {
    parts.push(`${delta.production > 0 ? '+' : ''}${delta.production}⚙`);
  }
  if (delta.gold !== 0) parts.push(`${delta.gold > 0 ? '+' : ''}${delta.gold}🪙`);
  return parts.join(' ');
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
  /**
   * Overrides the hover text `blocked ?? hint` would otherwise show.
   *
   * Only the greyed-for-tech rows set this: their card leads with the unlock
   * ("Requires Mining") ahead of the reducer's own sentence, which is one
   * fact more than `blocked` alone says. `undefined` everywhere else, which
   * keeps `blocked ?? hint`'s usual meaning intact.
   */
  title?: string;
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
    fortifyBlocker,
    onFortify,
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
    // The mover, not just the ground: a scout ignores terrain cost, and an
    // estimate that priced its route at a warrior's rates would quote a march
    // twice as long as the one the reducer will walk. See `tileMoveCost`.
    const def = unitDef(unit.type);
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
      const cost = tile ? tileMoveCost(tile, def) : null;
      if (cost === null) break;
      budget = Math.max(0, budget - cost);
    }
    // Anything still on the list is at least one more turn of marching, even if
    // the arithmetic above spent nothing (a one-tile order with points left is
    // still resolved at the turn change).
    return Math.max(1, turns);
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
    if (isBuilder(unit)) {
      for (const option of improvementOptions()) {
        const delta = formatYieldDelta(option.delta);
        actions.push({
          label: delta ? `${option.name} ${delta}` : option.name,
          blocked: option.blocked,
          hint: `Spend a charge: ${option.name.toLowerCase()} on this tile`,
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
        label: chop ? `Chop +${chop.production}⚙` : 'Chop',
        blocked: chopBlocked === undefined ? 'No unit selected' : chopBlocked,
        // The completion rides on the end of the hint when there is one, because
        // "this chop finishes the granary" is a different decision from "this
        // chop pays twenty hammers" — it is the argument, and it is why the
        // clause is loud (`!`) rather than parenthetical.
        hint: chop
          ? `Spend a charge: clear this tile · +${chop.production}⚙ → ${chop.cityName}` +
            (chop.completes ? ` · completes ${chop.completes}!` : '')
          : 'Spend a charge: clear the feature on this tile',
        title: techHoverTitle(chopTechName(), chopBlocked ?? null),
        run: onChop,
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
      button.title = action.title ?? action.blocked ?? action.hint;
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
    // Charges, and only for things that have them — the same rule the fighting
    // numbers below follow, and for the same reason: a warrior's sheet must not
    // carry a "0 charges" that reads as a statistic rather than as "this is not
    // a builder". It is the *scarcest* thing about a worker (three of them, and
    // then the piece is gone), so it sits with health and movement rather than
    // being left to be inferred from how many buttons the actions list has.
    if (isBuilder(unit)) {
      const left = chargesLeft(unit);
      stats.append(stat('Charges', `⚒ ${left}/${def.charges ?? left}`, left <= 1));
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

    // The standing states a player has to know before ordering anything.
    // Fortification first: it is the one they chose.
    const notes: string[] = [];
    if (isFortified(unit)) notes.push(`Fortified ${formatPercent(fortifyBonus(unit))}`);
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
