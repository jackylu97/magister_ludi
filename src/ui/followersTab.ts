/**
 * The Faith sheet's Religion & followers tab (batch UX11): what your religion
 * is, who follows it, which rival faiths press your towns, and the clergy you
 * may call.
 *
 * The spec is `docs/plans/faith-screen-f1.md`, Tab 3. Nothing is chosen here
 * and no bonus figure is printed: the gods, the beliefs and what they pay are
 * the Bonuses tab's (`bonusesTab.ts`), and the link at the foot of the left
 * column goes there.
 *
 *   - **Left column:** the religion's name (renamed in place), its facts as
 *     pills, the pantheon wheel with the next god's line under it, a panel of
 *     four counts, and the link to Bonuses. A seat with no religion is told how
 *     one is founded instead.
 *   - **Right pane:** who follows, as two lists (your towns, then foreign
 *     towns); the rival faiths pressing your towns; the clergy as three cards,
 *     each with its price and, when it cannot be called, why, on the card.
 *
 * Rival faiths and the fog. The user ruled (`docs/flags.md` (ssssss) 4.5) that
 * these rows follow the faith lens's fog rule (`faithHover.ts`): a town in
 * sight shows every faith pressing it, and a town only remembered shows your
 * own. Every town on this list is yours, and your own towns are always in
 * sight, so every rival faith pressing one of them is listed with its ledger.
 *
 * Every figure is the simulation's: `religionReading` (`faithReading.ts`) for
 * who follows abroad, `explainPressure` for each town's ledger, `purchaseLook`
 * for a clergy card's price and refusal, `explainNextRung` for the next god.
 */

import { readEmpire } from '../sim/readings';
import {
  type PressureLine,
  RELIGION_NAME_LIMIT,
  explainNextRung,
  explainPressure,
  holySites,
  nextRungWords,
  pantheonSlots,
  renameReligionError,
} from '../sim/religion';
import { type PurchasableItem, explainPurchaseCost, purchaseError } from '../sim/purchase';
import { BELIEF_IDS, type BeliefId, beliefDef } from '../sim/religionData';
import { RULES } from '../sim/rulesData';
import { tileOwnerCityId } from '../sim/cities';
import {
  type GameState,
  type Religion,
  capitalCityOf,
  cityReligion,
  followerCount,
  hasEndedTurn,
  playerById,
} from '../sim/state';
import { cardPressureRule, describeCard, religionFounder, stripRefs } from '../sim/statecraft';
import { seatName } from '../sim/leaderData';
import { type UnitTypeId, unitDef } from '../sim/unitData';
import { cityDisplayName } from './cityDisplay';
import { element } from './dom';
import { AXIS_MARK, type ReligionReading, listWords, pressureLedgerText, priceLedgerText } from './faithReading';
import { figure, signedFigure } from './figures';
import { drawPantheonWheel, pantheonWheelLayout } from './pantheonWheel';
import { type PriceLook, priceCellElement, priceLabelText, purchaseLook } from './priceCell';
import { refusalLineElement } from './refusalLine';
import { setYieldText } from './yieldMark';

/**
 * The pieces faith calls, in the order a player meets them: the prophet who
 * founds, the apostle who carries, the inquisitor who takes back.
 *
 * A list rather than a filter over the roster, and deliberately: "which units
 * does faith buy" is answerable from `UnitDef.purchase.currency`, but the order
 * they are read in is the sheet's choice. Every other word on a card (the name,
 * the verb, the price, the refusal) comes off the roster or the simulation.
 */
export const CLERGY: readonly UnitTypeId[] = ['prophet', 'apostle', 'inquisitor'];

/**
 * What each piece of the clergy does, in a line, keyed by the roster's own
 * marker rather than by a name: `prophesies`, `proclaims`, `purges`. The acts
 * are the ones `docs/religion-v2.md` lists for each piece.
 */
export function clergyWords(type: UnitTypeId): string {
  const def = unitDef(type);
  if (def.prophesies === true) {
    return 'Founds your religion, draws it another belief, proclaims it over the towns around it, or says a rite over the whole realm.';
  }
  if (def.proclaims === true) {
    return 'Proclaims your faith over the towns around it, lays on hands to mend the pieces beside it, or leaves a relic in a town with a cathedral.';
  }
  if (def.purges === true) return 'Pushes rival faiths back in the towns around it, and steadies the soldiers beside it.';
  return '';
}

// --- the model -----------------------------------------------------------------------

/** One town on a "who follows" list. */
export interface FollowerRow {
  cityId: number;
  name: string;
  following: number;
  population: number;
  /** Your faith's pressure here a turn: the fold of its ledger, floored at zero. */
  pressure: number;
  /** True when more than half the town follows your faith. */
  majority: boolean;
  /** Your faith's ledger here, as the hover sentence. */
  ledger: string;
  /** Whose town it is (its empire's name as `seatName` says it, and its banner ink), for a foreign town; absent for yours. */
  empire?: { name: string; color: string };
}

/** One town of yours your faith does not reach, and why. */
export interface UnreachedRow {
  cityId: number;
  name: string;
  population: number;
  reason: string;
}

/** One rival faith pressing one of your towns. */
export interface RivalRow {
  cityId: number;
  town: string;
  religion: string;
  founderName: string;
  founderColor: string;
  /** What it presses there a turn. */
  pressure: number;
  /** Citizens there who follow it, of the whole town. */
  following: number;
  population: number;
  ledger: string;
}

/** One card of the clergy. */
export interface ClergyCard {
  type: UnitTypeId;
  name: string;
  /** The roster's own verb: "Call a prophet". */
  verb: string;
  says: string;
  /** The price and the gate's answer in the town the clergy is called in. */
  look: PriceLook;
  /** The price's lines as one hover sentence. */
  priceWords: string;
}

/** Everything the Religion & followers tab shows. Pure, and the whole of what a test can pin. */
export interface FollowersModel {
  /** The religion's name and its facts as pills, or `null` before one is founded. */
  religion: { name: string; facts: string[] } | null;
  /** How a religion is founded, before one is. */
  found: { how: string; count: string; blocker: string | null } | null;
  wheel: { held: BeliefId[]; slots: number; eyebrow: string; rung: string };
  /** The four counts under the wheel, or `null` before a religion is founded. */
  counts: { value: string; label: string }[] | null;
  yours: FollowerRow[];
  unreached: UnreachedRow[];
  foreign: FollowerRow[];
  rivals: RivalRow[];
  /** What the rival section says when no rival faith presses a town of yours. */
  rivalsEmpty: string;
  clergy: { cityId: number | null; towns: { id: number; name: string }[]; cards: ClergyCard[] };
  /** Why nothing may be called now although the gate would take it: the seat has ended its turn. */
  paused: string | null;
}

/** The pressure one faith's lines fold to, floored at zero as the tide floors it. */
function folded(lines: readonly PressureLine[]): number {
  return Math.max(0, lines.reduce((total, line) => total + line.amount, 0));
}

/** The pressure a religion's holy site sends out a turn, as `explainPressure` asks it. */
function siteStrength(state: GameState, religion: Religion): number {
  const holder = religionFounder(state, religion);
  return RULES.religion.siteStrength + cardPressureRule(state, holder, 'siteStrength');
}

/**
 * Everything the Religion & followers tab shows, for one seat. `reading` is
 * `religionReading`'s answer for the same seat, and `aimedCityId` is the town
 * the clergy is called in (the sheet keeps it; `null`, or a town no longer
 * yours, picks the capital).
 */
export function followersTabModel(
  state: GameState,
  seat: number,
  reading: ReligionReading,
  aimedCityId: number | null,
): FollowersModel {
  const player = playerById(state, seat);
  const mine = reading.religion;
  const ours = state.cities.filter((city) => city.ownerId === seat);
  const sites = holySites(state);

  // The religion's facts, or how one is founded.
  let religion: FollowersModel['religion'] = null;
  if (mine !== null) {
    const facts = ['founded by you'];
    const site = mine.holySite;
    const cityId = site === undefined ? null : tileOwnerCityId(state, site.col, site.row);
    const holyCity = cityId === null ? undefined : state.cities.find((city) => city.id === cityId);
    if (holyCity !== undefined) {
      facts.push(
        holyCity.ownerId === seat
          ? `holy city ${cityDisplayName(state, holyCity)}`
          : `holy city ${holyCity.name}, held by ${seatName(state, holyCity.ownerId)}`,
      );
    }
    facts.push(reading.count);
    religion = { name: mine.name, facts };
  }

  // The wheel and the next god. The rate is the top bar's own figure.
  const held = [...(player?.pantheon.beliefs ?? [])];
  const slots = pantheonSlots(state, seat);
  const wheel = {
    held,
    slots,
    eyebrow: `pantheon · ${held.length} of ${slots}`,
    rung: nextRungWords(explainNextRung(state, seat, readEmpire(state, seat).totals.faith)),
  };

  // Who follows at home: the towns your faith holds or presses, then the rest.
  const yours: FollowerRow[] = [];
  const unreached: UnreachedRow[] = [];
  const ledgers = new Map<number, PressureLine[]>();
  for (const city of ours) ledgers.set(city.id, explainPressure(state, city, sites));
  if (mine !== null) {
    for (const city of ours) {
      const lines = (ledgers.get(city.id) ?? []).filter((line) => line.religion === mine.id);
      const following = followerCount(city, mine.id);
      const pressure = folded(lines);
      if (following > 0 || pressure > 0) {
        yours.push({
          cityId: city.id,
          name: cityDisplayName(state, city),
          following,
          population: city.population,
          pressure,
          majority: cityReligion(city) === mine.id,
          ledger: pressureLedgerText(lines),
        });
        continue;
      }
      const other = cityReligion(city);
      const rival = other === null ? undefined : state.religions.find((one) => one.id === other);
      unreached.push({
        cityId: city.id,
        name: cityDisplayName(state, city),
        population: city.population,
        reason: rival === undefined ? 'your faith does not reach it' : `follows ${rival.name}; your faith does not reach it`,
      });
    }
  }
  // Abroad: `religionReading`'s list, which is every town in the world that
  // holds a follower, ours first.
  const foreign: FollowerRow[] = reading.following
    .filter((line) => !line.ours)
    .map((line) => ({
      cityId: line.cityId,
      name: line.name,
      following: line.following,
      population: line.population,
      pressure: line.pressure,
      majority: line.majority,
      ledger: pressureLedgerText(line.ledger),
      empire: { name: line.ownerName, color: line.ownerColor },
    }));

  // Rival faiths pressing your towns: every faith but yours, town by town, in
  // founding order inside a town.
  const rivals: RivalRow[] = [];
  for (const city of ours) {
    const lines = ledgers.get(city.id) ?? [];
    for (const other of state.religions) {
      if (mine !== null && other.id === mine.id) continue;
      const theirs = lines.filter((line) => line.religion === other.id);
      const pressure = folded(theirs);
      if (pressure <= 0) continue;
      rivals.push({
        cityId: city.id,
        town: cityDisplayName(state, city),
        religion: other.name,
        founderName: seatName(state, other.founderId),
        founderColor: playerById(state, other.founderId)?.color ?? 'var(--ink)',
        pressure,
        following: followerCount(city, other.id),
        population: city.population,
        ledger: pressureLedgerText(theirs),
      });
    }
  }
  const otherNames = state.religions.filter((one) => mine === null || one.id !== mine.id).map((one) => one.name);
  const rivalsEmpty =
    otherNames.length === 0
      ? 'No other religion has been founded yet.'
      : `No rival faith presses any of your towns this turn: ${listWords(otherNames)} ${otherNames.length === 1 ? 'reaches' : 'reach'} none of them.`;

  // The four counts under the wheel.
  let counts: FollowersModel['counts'] = null;
  if (mine !== null) {
    const home = reading.following.filter((line) => line.ours).length;
    const standing = sites.some((site) => site.religion === mine.id);
    counts = [
      { value: figure(reading.following.length), label: reading.following.length === 1 ? 'town follows' : 'towns follow' },
      { value: `${home} / ${ours.length}`, label: 'of yours' },
      { value: figure(foreign.length), label: 'foreign' },
      standing
        ? { value: signedFigure(siteStrength(state, mine)), label: 'from the holy site a turn' }
        : { value: '—', label: 'no holy site stands' },
    ];
  }

  // The clergy, called in one town: the one the player picked, or the capital.
  const capital = capitalCityOf(state, seat);
  const aimed = ours.some((city) => city.id === aimedCityId)
    ? aimedCityId
    : (capital?.id ?? ours[0]?.id ?? null);
  const cards: ClergyCard[] = [];
  if (aimed !== null) {
    for (const type of CLERGY) {
      const def = unitDef(type);
      const currency = def.purchase?.currency ?? 'faith';
      const item: PurchasableItem = { kind: 'unit', id: type };
      const look = purchaseLook(state, seat, aimed, item, currency);
      const price = explainPurchaseCost(state, seat, aimed, item, currency);
      // No price is no card: a piece this bank does not sell is not a decision
      // this sheet can offer.
      if (look === null || price === null) continue;
      cards.push({
        type,
        name: def.name,
        verb: def.purchase?.verb ?? `Call a ${def.name}`,
        says: clergyWords(type),
        look,
        priceWords: priceLedgerText(price),
      });
    }
  }

  return {
    religion,
    found:
      reading.found === null
        ? null
        : { how: reading.found.how, count: reading.count, blocker: reading.found.blocker },
    wheel,
    counts,
    yours,
    unreached,
    foreign,
    rivals,
    rivalsEmpty,
    clergy: { cityId: aimed, towns: ours.map((city) => ({ id: city.id, name: city.name })), cards },
    paused: hasEndedTurn(state, seat) ? `You have ended turn ${state.turn}` : null,
  };
}

// --- the drawing ---------------------------------------------------------------------

/** What the drawing calls out to. The sheet owns every one; the drawing decides nothing. */
export interface FollowersHandlers {
  /** Sends `renameReligion`. Without it the name is a heading, not a field. */
  rename?: (name: string) => void;
  /** Says a refusal in the manicule line. */
  refuse?: (message: string) => void;
  /** Buys a piece of the clergy in a town. */
  buy: (cityId: number, item: PurchasableItem, currency: 'faith' | 'gold') => void;
  /** Calls the clergy in another town. */
  aim: (cityId: number) => void;
  /** Opens the Bonuses tab. */
  toBonuses: () => void;
}

/**
 * What the platform's tooltip says about a house of the wheel: the god's name
 * and its clauses, through `describeCard`, stripped of keyword marks because a
 * `title` is text the platform draws.
 */
function houseTooltip(id: BeliefId): string {
  const def = beliefDef(id);
  const clauses = describeCard(id).map((clause) => stripRefs(clause.text));
  return clauses.length === 0 ? def.name : `${def.name}: ${clauses.join(' · ')}`;
}

/**
 * The religion's name, editable in place. Renaming changes no rule, so it is a
 * field rather than a ceremony; a refusal is the reducer's own sentence in the
 * manicule line, and the field goes back to the name it had.
 */
function drawName(state: GameState, seat: number, name: string, handlers: FollowersHandlers): HTMLElement {
  const rename = handlers.rename;
  if (rename === undefined) return element('h3', 'rel-faith-title', name);
  const field = document.createElement('input');
  field.type = 'text';
  field.className = 'rel-name-field';
  field.value = name;
  field.maxLength = RELIGION_NAME_LIMIT;
  field.setAttribute('aria-label', 'The name of your religion');
  const send = (): void => {
    const next = field.value.trim();
    if (next === name) return;
    const problem = renameReligionError(state, seat, next);
    if (problem !== null) {
      handlers.refuse?.(problem);
      field.value = name;
      return;
    }
    rename(next);
  };
  field.addEventListener('change', send);
  field.addEventListener('blur', send);
  return field;
}

/** The left column: the name, the facts, the wheel, the counts, and the way to Bonuses. */
function drawColumn(state: GameState, seat: number, model: FollowersModel, handlers: FollowersHandlers): HTMLElement {
  const column = element('div', 'faith-religion-column');
  const head = element('section', 'faith-religion-name');
  head.append(element('p', 'eyebrow sc-eyebrow', 'your religion'));
  if (model.religion === null) {
    head.append(
      element(
        'p',
        'sc-flavor',
        'A religion is a faith of your own: it is founded out of the gods you keep, it ' +
          'spreads from your holy sites into every town near enough to hear it, and it pays ' +
          'you for each town in the world that follows it, including your rivals’.',
      ),
    );
    if (model.found !== null) {
      head.append(element('p', 'rel-faith-how', model.found.how));
      head.append(element('p', 'rel-faith-count', model.found.count));
      if (model.found.blocker !== null) head.append(element('p', 'sc-none', model.found.blocker));
    }
  } else {
    head.append(drawName(state, seat, model.religion.name, handlers));
    const facts = element('div', 'faith-facts');
    for (const fact of model.religion.facts) facts.append(element('span', 'faith-fact', fact));
    head.append(facts);
  }
  column.append(head);

  const pantheon = element('section', 'faith-religion-wheel');
  pantheon.append(element('p', 'eyebrow sc-eyebrow', model.wheel.eyebrow));
  const row = element('div', 'rel-wheel-row');
  row.append(
    drawPantheonWheel({
      layout: pantheonWheelLayout(BELIEF_IDS),
      held: new Set<BeliefId>(model.wheel.held),
      slots: model.wheel.slots,
      glyph: (axis) => AXIS_MARK[axis].glyph,
      tooltip: houseTooltip,
    }),
  );
  pantheon.append(row);
  pantheon.append(element('p', 'rel-rung-line', model.wheel.rung));
  column.append(pantheon);

  if (model.counts !== null) {
    const panel = element('div', 'faith-counts');
    for (const count of model.counts) {
      const box = element('div', 'faith-count');
      box.append(element('b', 'faith-count-value', count.value));
      box.append(element('span', 'faith-count-label', count.label));
      panel.append(box);
    }
    column.append(panel);
  }

  const link = element('button', 'faith-to-bonuses', 'What your gods and beliefs pay: Bonuses ›');
  link.type = 'button';
  link.dataset.key = 'to-bonuses';
  link.addEventListener('click', () => handlers.toBonuses());
  column.append(link);
  return column;
}

/** One town on a "who follows" list: its name, how many follow, and what presses a turn. */
function drawFollower(row: FollowerRow): HTMLElement {
  const line = element('div', row.empire === undefined ? 'faith-follower' : 'faith-follower is-foreign');
  line.dataset.city = String(row.cityId);
  const name = element('span', 'faith-follower-name');
  if (row.empire !== undefined) {
    const dot = element('span', 'faith-seat-dot');
    dot.style.setProperty('--seat-ink', row.empire.color);
    dot.setAttribute('aria-hidden', 'true');
    name.append(dot);
  }
  name.append(element('b', 'faith-follower-town', row.name));
  if (row.majority) {
    const mark = element('span', 'faith-follower-majority', '✶');
    mark.title = `Most of ${row.name} follows your faith`;
    name.append(mark);
  }
  if (row.empire !== undefined) name.append(element('small', 'faith-follower-owner', row.empire.name));
  line.append(name);
  const count = element('span', 'faith-follower-count');
  count.append(element('span', 'faith-follower-of', `${row.following} of ${row.population}`));
  const bar = element('i', 'faith-follower-bar');
  bar.setAttribute('aria-hidden', 'true');
  const fill = element('b', 'faith-follower-fill');
  const share = row.population <= 0 ? 0 : Math.min(row.following, row.population) / row.population;
  fill.style.width = `${Math.round(share * 100)}%`;
  bar.append(fill);
  count.append(bar);
  line.append(count);
  const press = element('span', 'faith-follower-press');
  // Never "+0 a turn": a town nothing presses says nothing here.
  if (row.pressure > 0) press.textContent = `${signedFigure(row.pressure)} a turn`;
  line.append(press);
  line.title = row.ledger;
  return line;
}

/** Who follows: your towns, then foreign towns, as two lists side by side. */
function drawFollows(model: FollowersModel): HTMLElement {
  const block = element('section', 'faith-follows');
  const head = element('div', 'faith-section-head');
  head.append(element('p', 'eyebrow sc-eyebrow', 'who follows'));
  head.append(element('span', 'faith-section-note', 'citizens following · what your faith presses a turn'));
  block.append(head);
  if (model.religion === null) {
    block.append(element('p', 'sc-none', 'You have founded no religion yet, so nobody follows it.'));
    return block;
  }
  const lists = element('div', 'faith-follow-lists');

  const home = element('div', 'faith-follow-list');
  const reached = model.yours.length;
  home.append(element('p', 'faith-follow-title', `Your towns · ${reached} of ${reached + model.unreached.length} reached`));
  const homeRows = element('div', 'faith-follow-rows');
  for (const row of model.yours) homeRows.append(drawFollower(row));
  for (const row of model.unreached) {
    const line = element('div', 'faith-follower is-unreached');
    line.dataset.city = String(row.cityId);
    const name = element('span', 'faith-follower-name');
    name.append(element('b', 'faith-follower-town', row.name));
    name.append(element('small', 'faith-follower-reason', row.reason));
    line.append(name);
    line.append(element('span', 'faith-follower-count', `0 of ${row.population}`));
    line.append(element('span', 'faith-follower-press'));
    homeRows.append(line);
  }
  if (reached + model.unreached.length === 0) homeRows.append(element('p', 'sc-none', 'You hold no town.'));
  home.append(homeRows);
  lists.append(home);

  const abroad = element('div', 'faith-follow-list');
  const majority = model.foreign.filter((row) => row.majority).length;
  abroad.append(
    element(
      'p',
      'faith-follow-title',
      `Foreign towns · ${model.foreign.length} follow, ${majority} by majority · their owners get your follower beliefs`,
    ),
  );
  const abroadRows = element('div', 'faith-follow-rows');
  for (const row of model.foreign) abroadRows.append(drawFollower(row));
  if (model.foreign.length === 0) abroadRows.append(element('p', 'sc-none', 'No foreign town follows yet.'));
  abroad.append(abroadRows);
  lists.append(abroad);

  block.append(lists);
  return block;
}

/** The rival faiths pressing your towns, or the sentence that says none does. */
function drawRivals(model: FollowersModel): HTMLElement {
  const block = element('section', 'faith-rivals');
  block.append(element('p', 'eyebrow sc-eyebrow', 'rival faiths pressing your towns'));
  if (model.rivals.length === 0) {
    block.append(element('p', 'faith-rivals-empty', model.rivalsEmpty));
    return block;
  }
  const rows = element('div', 'faith-follow-rows');
  for (const row of model.rivals) {
    const line = element('div', 'faith-follower is-rival');
    line.dataset.city = String(row.cityId);
    const name = element('span', 'faith-follower-name');
    name.append(element('b', 'faith-follower-town', row.town));
    const dot = element('span', 'faith-seat-dot');
    dot.style.setProperty('--seat-ink', row.founderColor);
    dot.setAttribute('aria-hidden', 'true');
    name.append(dot);
    name.append(element('small', 'faith-follower-owner', `${row.religion} · ${row.founderName}`));
    line.append(name);
    line.append(element('span', 'faith-follower-count', `${row.following} of ${row.population}`));
    line.append(element('span', 'faith-follower-press', `${signedFigure(row.pressure)} a turn`));
    line.title = row.ledger;
    rows.append(line);
  }
  block.append(rows);
  return block;
}

/**
 * The clergy: one card a piece, each with its price and, when it cannot be
 * called, the reducer's reason on the card. One town select for all three,
 * because a piece has to stand somewhere and the price and the stacking room
 * are asked of that town.
 */
function drawClergy(state: GameState, seat: number, model: FollowersModel, handlers: FollowersHandlers): HTMLElement {
  const block = element('section', 'faith-clergy');
  const head = element('div', 'faith-section-head');
  head.append(element('p', 'eyebrow sc-eyebrow', 'the clergy'));
  block.append(head);
  const aimed = model.clergy.cityId;
  if (aimed === null) {
    block.append(element('p', 'sc-none', 'You have no town the clergy could be called in.'));
    return block;
  }
  const label = element('label', 'faith-clergy-where');
  label.append(document.createTextNode('called in '));
  const select = document.createElement('select');
  select.className = 'rel-city-select';
  for (const town of model.clergy.towns) {
    const option = document.createElement('option');
    option.value = String(town.id);
    option.textContent = town.name;
    select.append(option);
  }
  select.value = String(aimed);
  select.addEventListener('change', () => handlers.aim(Number.parseInt(select.value, 10)));
  label.append(select);
  head.append(label);

  const town = model.clergy.towns.find((one) => one.id === aimed)?.name ?? 'this town';
  const cards = element('div', 'faith-clergy-cards');
  for (const card of model.clergy.cards) {
    const face = element('article', 'faith-clergy-card');
    face.dataset.unit = card.type;
    face.append(element('h4', 'faith-clergy-name', card.name));
    if (card.says.length > 0) face.append(element('p', 'faith-clergy-says', card.says));
    face.title = card.priceWords;
    const look = card.look;
    if (look.look === 'none') {
      // The price is still worth knowing, so it is printed quietly with the
      // reason under it rather than replaced by a dash.
      const price = element('span', 'faith-clergy-price');
      setYieldText(price, priceLabelText(card.verb, look.bank, look.price));
      face.append(price);
      face.append(refusalLineElement(look.refusal, 'row'));
    } else {
      const item: PurchasableItem = { kind: 'unit', id: card.type };
      const cell = priceCellElement(look, {
        name: `in ${town}`,
        label: card.verb,
        paused: model.paused,
        onBuy: () => {
          // The gate is asked again at the press: the card was drawn against the
          // board as it stood, and a refusal now is said rather than sent.
          const blocked = purchaseError(state, seat, aimed, item, look.bank);
          if (blocked !== null) {
            handlers.refuse?.(blocked);
            return;
          }
          handlers.buy(aimed, item, look.bank);
        },
      });
      cell.dataset.key = `clergy:${card.type}`;
      face.append(cell);
    }
    cards.append(face);
  }
  block.append(cards);
  return block;
}

/** The Religion & followers tab, drawn from its model, in the Statecraft sheet's split. */
export function drawFollowersTab(
  state: GameState,
  seat: number,
  model: FollowersModel,
  handlers: FollowersHandlers,
): HTMLElement {
  const split = element('div', 'sc-split faith-religion-tab');
  const column = element('aside', 'sc-column');
  const stack = element('div', 'sc-column-body');
  stack.append(drawColumn(state, seat, model, handlers));
  column.append(stack);
  split.append(column);
  const pane = element('div', 'sc-pane');
  pane.append(drawFollows(model));
  pane.append(drawRivals(model));
  pane.append(drawClergy(state, seat, model, handlers));
  split.append(pane);
  return split;
}
