/**
 * The Faith sheet's Rites tab (batch UX9, `src/ui/ritesTab.ts`), asked on real
 * boards: the order of its rows, rite mode, the start flow and the short look,
 * Escape, the city screen's way in, the faith line, and the prophet's rite over
 * the realm.
 *
 * The tab is three layers (its docblock): the conversation (`RitesView` and the
 * pure functions that change it), the model (`ritesTabModel`), and the drawing.
 * This suite has no document (`vite.config.ts`), so the first two are run here
 * against real game states, a start is a real `performRite` command through
 * `applyCommand`, and the drawing and the sheet's wiring are read as source.
 *
 * The spec is `docs/plans/faith-screen-f1.md`, Tab 1, and the user's rulings
 * there: one click starts a rite and the button carries the price; a rite that
 * pays two things ranks by its main yield; selecting the rite again, or
 * Escape, leaves rite mode; towns keeping a rite are listed soonest free first.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type CardImpactLine, explainRitePreview, foldCardImpact } from '../../src/sim/cardImpact';
import { foundCityAt } from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { getTileAt } from '../../src/sim/map';
import { isPassable } from '../../src/sim/pathfind';
import { explainPurchaseCost } from '../../src/sim/purchase';
import { religionLinesOfCity } from '../../src/sim/ledgerFold';
import { readCity } from '../../src/sim/readings';
import { cityRite, explainNextRung, riteCostFor, riteGate, riteShortfall } from '../../src/sim/religion';
import { LIVE_RITE_IDS, type RiteId, riteDef } from '../../src/sim/religionData';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import {
  type City,
  type GameState,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import type { OrderId } from '../../src/sim/statecraftData';
import { isWaterTerrain } from '../../src/sim/terrainData';
import {
  type RitesReadings,
  type RitesTabHandlers,
  type RitesView,
  FORECAST_TURNS,
  createRiteReadingCache,
  drawRitesTab,
  escapeRites,
  faithAhead,
  freshRitesView,
  noteRealmRite,
  noteRiteStarted,
  riteChipVoice,
  ritePaysNow,
  ritesCount,
  ritesTabModel,
  ritesViewForTown,
  selectRite,
  toggleTownMenu,
  visitOn,
} from '../../src/ui/ritesTab';
import { bonusesTabModel } from '../../src/ui/bonusesTab';
import { braceBody, uiSource } from './sourceHelpers';
import { createGame } from '../sim/newGameHelpers';

// --- the board -------------------------------------------------------------------

/** Land tiles at least `apart` columns or rows from each other, in reading order. */
function landSites(state: GameState, count: number, apart: number): { col: number; row: number }[] {
  const sites: { col: number; row: number }[] = [];
  for (let row = 3; row < state.map.height - 3 && sites.length < count; row += 1) {
    for (let col = 3; col < state.map.width - 3 && sites.length < count; col += 1) {
      const tile = getTileAt(state.map, col, row);
      if (!tile || isWaterTerrain(tile.terrain) || !isPassable(tile)) continue;
      if (state.tileOwner[row * state.map.width + col] !== null) continue;
      if (sites.some((site) => Math.max(Math.abs(site.col - col), Math.abs(site.row - row)) < apart)) continue;
      sites.push({ col, row });
    }
  }
  return sites;
}

/**
 * Four towns of seat 0's on a duel board, in founding order, each with a
 * different shelf of buildings so Omen Reading (a beaker per building) adds a
 * different amount in each: the second most, the fourth next, then the first
 * and the third alike, which is a tie the ranking must keep in founding order.
 */
function world(): { state: GameState; towns: City[] } {
  const g = createGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  const state = g.state;
  const player = playerById(state, 0)!;
  for (const tech of ['divination', 'stonecraft', 'mining', 'bronzeWorking', 'currency']) {
    player.techsResearched.push(tech as never);
  }
  const sites = landSites(state, 4, 5);
  expect(sites).toHaveLength(4);
  const towns = sites.map((site) => foundCityAt(state, 0, getTileAt(state.map, site.col, site.row)!));
  towns[0]!.buildings.push('granary');
  towns[1]!.buildings.push('granary', 'monument', 'shrine', 'palisade');
  towns[2]!.buildings.push('monument');
  towns[3]!.buildings.push('granary', 'monument');
  player.faithPool = 1000;
  bumpRevision(state);
  return { state, towns };
}

/** The readings straight from the simulation, with no cache in front. */
function plainReadings(state: GameState): RitesReadings {
  const preview = (cityId: number, rite: RiteId): readonly CardImpactLine[] =>
    explainRitePreview(state, 0, cityId, rite);
  return { preview, voice: (rite) => riteChipVoice(state, 0, rite, preview) };
}

function model(state: GameState, view: RitesView) {
  return ritesTabModel(state, 0, view, plainReadings(state));
}

/** Starts a rite through the reducer, as `controls.performRite` does, and records it. */
function start(state: GameState, view: RitesView, cityId: number, rite: RiteId): RitesView {
  const before = playerById(state, 0)!.faithPool;
  const result = applyCommand(state, { type: 'performRite', playerId: 0, cityId, rite } as Command);
  expect(result.ok, JSON.stringify(result)).toBe(true);
  return noteRiteStarted(view, state.turn, { cityId, rite }, before, playerById(state, 0)!.faithPool);
}

const OMEN: RiteId = 'omenReading';

// --- the order of the rows ---------------------------------------------------------

describe('the rows', () => {
  it('list the free towns first, in founding order', () => {
    const { state, towns } = world();
    const shown = model(state, freshRitesView(state.turn));
    expect(shown.free.map((town) => town.cityId)).toEqual(towns.map((town) => town.id));
    expect(shown.kept).toEqual([]);
    expect(shown.count).toBe('0 kept · 4 free');
    expect(ritesCount(state, 0)).toBe('0 kept · 4 free');
    // Nothing is ranked or priced on a row until a rite is selected.
    for (const town of shown.free) {
      expect(town.rank).toBeNull();
      expect(town.look).toBeNull();
      expect(town.menu).toBeNull();
    }
  });

  it('list the towns keeping a rite after them, soonest free first', () => {
    const { state, towns } = world();
    const player = playerById(state, 0)!;
    // The fourth town's rite is three turns older than the second's.
    applyCommand(state, { type: 'performRite', playerId: 0, cityId: towns[3]!.id, rite: OMEN } as Command);
    state.turn += 3;
    bumpRevision(state);
    applyCommand(state, {
      type: 'performRite',
      playerId: 0,
      cityId: towns[1]!.id,
      rite: 'riteOfTheHarvest',
    } as Command);
    player.faithPool = 1000;
    bumpRevision(state);
    const shown = model(state, freshRitesView(state.turn));
    expect(shown.free.map((town) => town.cityId)).toEqual([towns[0]!.id, towns[2]!.id]);
    expect(shown.kept.map((town) => town.cityId)).toEqual([towns[3]!.id, towns[1]!.id]);
    const [older, newer] = shown.kept;
    expect(older!.turnsLeft).toBeLessThan(newer!.turnsLeft);
    // "free on turn N" is this turn plus what is left.
    expect(older!.freeOnTurn).toBe(state.turn + older!.turnsLeft);
    expect(older!.riteName).toBe('Omen Reading');
    expect(older!.turnsTotal).toBeGreaterThanOrEqual(older!.turnsLeft);
    expect(shown.count).toBe('2 kept · 2 free');
  });

  it('say what a kept rite pays now from the Ledger’s line for the town, the Bonuses tab’s figure', () => {
    const { state, towns } = world();
    applyCommand(state, { type: 'performRite', playerId: 0, cityId: towns[1]!.id, rite: OMEN } as Command);
    const kept = model(state, freshRitesView(state.turn)).kept[0]!;
    // The rite's line in the town's Religion slice (batch UX10).
    const line = religionLinesOfCity(state, towns[1]!).find((one) => one.card === OMEN)!;
    expect(line.paid.science).toBeGreaterThan(0);
    expect(kept.pays).toEqual([{ voice: 'science', amount: line.paid.science }]);
    expect(ritePaysNow(state, towns[1]!, OMEN)).toEqual(line.paid);
    // Omen Reading pays a flat beaker per building, so the Ledger's figure is
    // the town's own lines carrying the rite.
    const flat = readCity(state, towns[1]!).lines.filter((one) => one.card === OMEN);
    expect(line.paid.science).toBe(flat.reduce((sum, one) => sum + one.science, 0));
    // And the Bonuses tab's rite card lists the same figure for the town.
    const rite = bonusesTabModel(state, 0)
      .shelves.flatMap((shelf) => shelf.cards)
      .find((card) => card.key === `card:${OMEN}`)!;
    expect(rite.parts.find((part) => part.label === kept.name)?.paid).toEqual(line.paid);
  });
});

// --- the strip ------------------------------------------------------------------------

describe('the strip of rites', () => {
  it('has one chip per live rite: the known ones first, the rest greyed with what teaches them', () => {
    const { state } = world();
    const chips = model(state, freshRitesView(state.turn)).chips;
    expect(chips.map((chip) => chip.rite).sort()).toEqual([...LIVE_RITE_IDS].sort());
    const known = chips.filter((chip) => chip.known);
    const lacking = chips.filter((chip) => !chip.known);
    expect(chips.slice(0, known.length)).toEqual(known);
    expect(known.map((chip) => chip.rite)).toEqual([
      'riteOfTheHarvest',
      'omenReading',
      'consecrationOfTheBounds',
      'blessingOfArms',
      'riteOfPlenty',
    ]);
    // A card-taught rite names its card, and is not a control.
    const fasting = lacking.find((chip) => chip.rite === 'riteOfFasting')!;
    expect(fasting.teacher).toBe('The Fast');
    expect(fasting.teacherPhrase).toBe('the Order The Fast');
    expect(fasting.voice).toBeNull();
  });

  it('marks each chip with its yield and how many towns keep it', () => {
    const { state, towns } = world();
    applyCommand(state, { type: 'performRite', playerId: 0, cityId: towns[1]!.id, rite: OMEN } as Command);
    const chips = model(state, freshRitesView(state.turn)).chips;
    const chip = (rite: RiteId) => chips.find((one) => one.rite === rite)!;
    expect(chip(OMEN).voice).toBe('science');
    expect(chip(OMEN).keptIn).toBe(1);
    expect(chip('riteOfTheHarvest').voice).toBe('food');
    expect(chip('riteOfTheHarvest').keptIn).toBe(0);
    // Blessing of Arms adds no yield, so it wears no mark.
    expect(chip('blessingOfArms').voice).toBeNull();
  });
});

// --- rite mode --------------------------------------------------------------------------

describe('rite mode', () => {
  it('ranks the free towns by what the rite would add, best first, ties in founding order', () => {
    const { state, towns } = world();
    const view = selectRite(freshRitesView(state.turn), OMEN);
    const shown = model(state, view);
    const gain = (cityId: number): number => foldCardImpact(explainRitePreview(state, 0, cityId, OMEN)).science;
    const order = shown.free.map((town) => town.cityId);
    // Best first.
    for (let at = 1; at < order.length; at += 1) {
      expect(gain(order[at - 1]!)).toBeGreaterThanOrEqual(gain(order[at]!));
    }
    // The four-building town leads, and the two one-building towns tie and keep
    // founding order.
    expect(order[0]).toBe(towns[1]!.id);
    expect(gain(towns[0]!.id)).toBe(gain(towns[2]!.id));
    expect(order.indexOf(towns[0]!.id)).toBeLessThan(order.indexOf(towns[2]!.id));
    // Numbered from 1, each with its one-click button and the figure it ranks by.
    expect(shown.free.map((town) => town.rank)).toEqual([1, 2, 3, 4]);
    for (const town of shown.free) {
      expect(town.look).toEqual({ look: 'buy', bank: 'faith', price: riteCostFor(state, 0) });
      expect(town.adds!.figures[0]).toEqual({ voice: 'science', amount: gain(town.cityId) });
    }
    expect(shown.freeNote).toBe('best first');
    expect(shown.selected).toEqual({ rite: OMEN, name: 'Omen Reading' });
    expect(shown.say).toMatchObject({
      kind: 'mode',
      name: 'Omen Reading',
      ranking: 'Free towns ranked by the science it would add, best first.',
    });
    // The chip is lit, and the kept group's heading says why the rest cannot take it.
    expect(shown.chips.find((chip) => chip.rite === OMEN)!.selected).toBe(true);
  });

  it('keeps founding order for a rite that adds the same in every town, and says so', () => {
    const { state, towns } = world();
    const shown = model(state, selectRite(freshRitesView(state.turn), 'blessingOfArms'));
    expect(shown.free.map((town) => town.cityId)).toEqual(towns.map((town) => town.id));
    expect(shown.free.map((town) => town.rank)).toEqual([null, null, null, null]);
    expect(shown.freeNote).toBe('founding order');
    expect(shown.say).toMatchObject({
      ranking: 'It adds the same in every town, so the free towns keep founding order.',
    });
    // Each row still says what it would add, in the rite's own words.
    expect(shown.free[0]!.adds!.figures).toEqual([]);
    expect(shown.free[0]!.adds!.words).toContain('city defence');
  });

  it('keeps founding order when a card makes every town gain the same', () => {
    // The Priest-Astronomers pays the capital for every town keeping a rite, so
    // Blessing of Arms gains a yield, but the same one in every free town.
    const { state, towns } = world();
    const card = 'thePriestAstronomers' as OrderId;
    const player = playerById(state, 0)!;
    player.statecraft.orders = [card];
    player.statecraft.slots = [{ card, sealedUntil: 0 }];
    bumpRevision(state);
    const shown = model(state, selectRite(freshRitesView(state.turn), 'blessingOfArms'));
    expect(shown.free[0]!.adds!.figures.length).toBeGreaterThan(0);
    expect(shown.free.map((town) => town.cityId)).toEqual(towns.map((town) => town.id));
    expect(shown.free.map((town) => town.rank)).toEqual([null, null, null, null]);
    expect(shown.say).toMatchObject({
      ranking: 'It adds the same in every town, so the free towns keep founding order.',
    });
  });

  it('says the rite and its turns in the banner, and how to leave', () => {
    const { state } = world();
    const shown = model(state, selectRite(freshRitesView(state.turn), OMEN));
    expect(shown.say.kind).toBe('mode');
    if (shown.say.kind !== 'mode') return;
    expect(shown.say.says).toContain('Kept for 10 turns');
    expect(shown.say.leave).toBe('Press the rite again, or Esc, to leave.');
  });

  it('is left by selecting the same rite again, and a different rite switches it', () => {
    const view = freshRitesView(1);
    const on = selectRite(view, OMEN);
    expect(on.selected).toBe(OMEN);
    expect(selectRite(on, OMEN).selected).toBeNull();
    expect(selectRite(on, 'riteOfTheHarvest').selected).toBe('riteOfTheHarvest');
  });

  it('closes an open menu, since rite mode has none', () => {
    const view = toggleTownMenu(freshRitesView(1), 12);
    expect(view.menuCityId).toBe(12);
    expect(selectRite(view, OMEN).menuCityId).toBeNull();
  });
});

// --- the start flow and the short look -------------------------------------------------

describe('starting a rite', () => {
  it('moves the town to the head of the kept group, marked started now, and updates the bank', () => {
    const { state, towns } = world();
    const cost = riteCostFor(state, 0);
    playerById(state, 0)!.faithPool = cost + cost / 2;
    bumpRevision(state);
    let view = selectRite(freshRitesView(state.turn), OMEN);
    const first = model(state, view).free[0]!;
    view = start(state, view, first.cityId, OMEN);
    const shown = model(state, view);
    // Rite mode stays on, so the next town down the list is one more click.
    expect(shown.selected?.rite).toBe(OMEN);
    expect(shown.kept[0]).toMatchObject({ cityId: first.cityId, startedNow: true, riteName: 'Omen Reading' });
    expect(shown.free.map((town) => town.cityId)).not.toContain(first.cityId);
    expect(shown.bank).toBe(cost / 2);
    expect(shown.free.map((town) => town.rank)).toEqual([1, 2, 3]);
    expect(towns.some((town) => town.id === first.cityId)).toBe(true);
  });

  it('greys every remaining button with "short N" once the bank cannot pay for another', () => {
    const { state } = world();
    const cost = riteCostFor(state, 0);
    playerById(state, 0)!.faithPool = cost + 13;
    bumpRevision(state);
    let view = selectRite(freshRitesView(state.turn), OMEN);
    view = start(state, view, model(state, view).free[0]!.cityId, OMEN);
    const shown = model(state, view);
    expect(shown.free.length).toBe(3);
    for (const town of shown.free) {
      // The gate's own reading, never its words: the bank is all that is short.
      expect(riteShortfall(state, 0, town.cityId, OMEN)).toBe(cost - 13);
      expect(town.look).toEqual({ look: 'short', bank: 'faith', price: cost, need: cost - 13 });
      expect(town.refusal).toBeNull();
    }
  });

  it('says what the visit did on the faith line, and what is short', () => {
    const { state } = world();
    const cost = riteCostFor(state, 0);
    const bank = cost + 13;
    playerById(state, 0)!.faithPool = bank;
    bumpRevision(state);
    let view = selectRite(freshRitesView(state.turn), OMEN);
    const town = model(state, view).free[0]!;
    view = start(state, view, town.cityId, OMEN);
    const name = state.cities.find((city) => city.id === town.cityId)!.name;
    const line = model(state, view).faith;
    expect(line.bank).toBe(13);
    expect(line.history).toBe(`was ${bank}; Omen Reading started in ${name}.`);
    expect(line.now).toBe(`Short ${cost - 13} for another rite.`);
    expect(line.short).toBe(true);
    expect(line.ahead).toMatch(/^Next turn you will have /);
  });

  it('counts the bank it can pay for, and next turn’s', () => {
    const { state } = world();
    const cost = riteCostFor(state, 0);
    playerById(state, 0)!.faithPool = cost * 2 + 1;
    bumpRevision(state);
    const line = model(state, freshRitesView(state.turn)).faith;
    expect(line.history).toBeNull();
    expect(line.now).toBe('Enough for 2 rites now.');
    expect(line.short).toBe(false);
  });

  it('forgets the "was" figure when the bank moved some other way between starts', () => {
    const { state, towns } = world();
    let view = selectRite(freshRitesView(state.turn), OMEN);
    view = start(state, view, towns[0]!.id, OMEN);
    // Something else spends faith (a purchase on another tab), then a second start.
    playerById(state, 0)!.faithPool -= 100;
    bumpRevision(state);
    const before = playerById(state, 0)!.faithPool;
    view = start(state, view, towns[1]!.id, OMEN);
    expect(view.visit.run!.before).toBe(before);
    expect(view.visit.run!.starts.map((one) => one.cityId)).toEqual([towns[1]!.id]);
    // Both towns are still marked started now.
    const kept = model(state, view).kept;
    expect(kept.filter((town) => town.startedNow).map((town) => town.cityId)).toEqual([
      towns[1]!.id,
      towns[0]!.id,
    ]);
  });

  it('forgets a visit from an earlier turn', () => {
    const { state, towns } = world();
    let view = selectRite(freshRitesView(state.turn), OMEN);
    view = start(state, view, towns[0]!.id, OMEN);
    expect(visitOn(view, state.turn).started).toHaveLength(1);
    state.turn += 1;
    expect(visitOn(view, state.turn).started).toEqual([]);
    expect(model(state, view).kept.every((town) => !town.startedNow)).toBe(true);
    expect(model(state, view).faith.history).toBeNull();
  });

  it('says a refusal other than the bank once, at the head of the free towns', () => {
    // Votive Offering needs something at the front of the town's queue; towns
    // building nothing are refused for that, and the refusal is said once.
    const { state, towns } = world();
    const gifts = 'theVotiveGifts' as OrderId;
    const player = playerById(state, 0)!;
    player.statecraft.orders = [gifts];
    player.statecraft.slots = [{ card: gifts, sealedUntil: 0 }];
    for (const town of towns) town.queue = [];
    towns[0]!.queue = [{ kind: 'unit', id: 'warrior' }];
    bumpRevision(state);
    const shown = model(state, selectRite(freshRitesView(state.turn), 'votiveOffering'));
    expect(shown.refusalHead).toEqual([{ text: 'Each of these is building nothing', mark: null }]);
    const row = (city: City) => shown.free.find((town) => town.cityId === city.id)!;
    expect(row(towns[0]!).look?.look).toBe('buy');
    for (const town of towns.slice(1)) {
      expect(row(town).look).toMatchObject({ look: 'none', refusal: `${town.name} is building nothing` });
      expect(row(town).refusal).toEqual({ at: 'head', mark: null });
    }
    // The offering adds production once, the same in every town.
    expect(row(towns[0]!).adds!.once[0]?.voice).toBe('production');
  });

  it('pauses every button once the seat has ended its turn', () => {
    const { state } = world();
    state.turnEnded[0] = true;
    const shown = model(state, selectRite(freshRitesView(state.turn), OMEN));
    expect(shown.paused).toBe(`You have ended turn ${state.turn}`);
    // The gate would still take it; the button is drawn quiet, not short.
    expect(shown.free[0]!.look?.look).toBe('buy');
  });
});

// --- Escape -------------------------------------------------------------------------------

describe('Escape', () => {
  it('leaves rite mode first, then closes an open menu, then lets the sheet close', () => {
    const inMode = selectRite(freshRitesView(1), OMEN);
    const left = escapeRites(inMode);
    expect(left?.selected).toBeNull();
    expect(escapeRites(left!)).toBeNull();
    const menu = toggleTownMenu(freshRitesView(1), 7);
    expect(escapeRites(menu)?.menuCityId).toBeNull();
    expect(escapeRites(freshRitesView(1))).toBeNull();
  });

  it('is claimed by the sheet only while there is something to leave', () => {
    const screen = uiSource('religionScreen.ts');
    const shell = braceBody(screen, 'const shell = createModalShell(');
    expect(shell).toContain("if (event.key !== 'Escape') return false;");
    expect(shell).toContain("if (faithTabFor(options.getPlayerId()) !== 'rites') return false;");
    expect(shell).toContain('const next = escapeRites(ritesView);');
    expect(shell).toContain('if (next === null) return false;');
    // Claimed, so the board does not hear it and the shell does not close.
    expect(shell).toContain('event.stopPropagation();');
  });
});

// --- the city screen's way in ----------------------------------------------------------------

describe('the city screen’s way in', () => {
  it('opens a free town’s menu, with every rite, its price and what it would add there', () => {
    const { state, towns } = world();
    const view = ritesViewForTown(selectRite(freshRitesView(state.turn), OMEN), towns[2]!.id);
    expect(view.selected).toBeNull();
    const shown = model(state, view);
    const row = shown.free.find((town) => town.cityId === towns[2]!.id)!;
    expect(row.focus).toBe(true);
    const menu = row.menu!;
    expect(menu.items.map((item) => item.rite).sort()).toEqual([...LIVE_RITE_IDS].sort());
    const omen = menu.items.find((item) => item.rite === OMEN)!;
    expect(omen.known).toBe(true);
    expect(omen.look).toEqual({ look: 'buy', bank: 'faith', price: riteCostFor(state, 0) });
    expect(omen.adds!.figures[0]?.voice).toBe('science');
    expect(omen.says).toContain('Kept for 10 turns');
    // A rite the empire lacks is greyed with what teaches it.
    const fasting = menu.items.find((item) => item.rite === 'riteOfFasting')!;
    expect(fasting).toMatchObject({ known: false, look: null, says: 'needs the Order The Fast' });
    // The other towns' menus stay shut.
    expect(shown.free.filter((town) => town.menu !== null)).toHaveLength(1);
  });

  it('says at the menu’s foot what is left after this one', () => {
    const { state, towns } = world();
    const cost = riteCostFor(state, 0);
    playerById(state, 0)!.faithPool = cost * 3;
    bumpRevision(state);
    const foot = model(state, ritesViewForTown(freshRitesView(state.turn), towns[0]!.id)).free[0]!.menu!.foot;
    expect(foot).toBe(`After this, ${cost * 2} faith is left. Enough for another.`);
    playerById(state, 0)!.faithPool = cost - 5;
    bumpRevision(state);
    const short = model(state, ritesViewForTown(freshRitesView(state.turn), towns[0]!.id)).free[0]!.menu!.foot;
    expect(short.startsWith(`You have ${cost - 5}; a rite costs ${cost}. Affordable `)).toBe(true);
  });

  it('marks a town keeping a rite, which has no menu', () => {
    const { state, towns } = world();
    applyCommand(state, { type: 'performRite', playerId: 0, cityId: towns[1]!.id, rite: OMEN } as Command);
    const shown = model(state, ritesViewForTown(freshRitesView(state.turn), towns[1]!.id));
    expect(shown.kept[0]).toMatchObject({ cityId: towns[1]!.id, focus: true });
    expect(shown.free.every((town) => town.menu === null)).toBe(true);
  });

  it('is on the sheet’s interface, and lands on the Rites tab', () => {
    const screen = uiSource('religionScreen.ts');
    expect(screen).toContain('openRitesFor(cityId: number): void;');
    const entry = braceBody(screen, '    openRitesFor(cityId: number): void {');
    expect(entry).toContain("chooseFaithTab(seat, 'rites');");
    expect(entry).toContain('ritesViewForTown(');
    expect(entry).toContain('pendingTown = cityId;');
    // The opening it causes applies the town after `onShow` forgets the last visit.
    const shell = braceBody(screen, 'const shell = createModalShell(');
    expect(shell).toContain('ritesView = ritesViewForTown(ritesView, pendingTown);');
  });
});

// --- the sheet's wiring ------------------------------------------------------------------------

describe('the sheet’s wiring', () => {
  const screen = (): string => uiSource('religionScreen.ts');

  it('sends each start as one performRite, through the page', () => {
    const send = braceBody(screen(), '  function startRite(cityId: number, rite: RiteId): void {');
    // The gate is asked again at the click, and a refusal is said, not sent.
    expect(send).toContain('const refusal = riteError(state, seat, cityId, rite);');
    expect(send).toContain('options.onRefuse?.(refusal);');
    expect(send).toContain('send(cityId, rite);');
    // Recorded only when the board shows the town keeping the rite.
    expect(send).toContain('cityRite(after, city) === rite');
    expect(send).toContain('noteRiteStarted(');
    // The page sends it the way the city screen does.
    expect(uiSource('main.ts')).toContain('performRite: (cityId, rite) => controls.performRite(cityId, rite),');
  });

  it('opens a town’s city screen from its name, closing the sheet first', () => {
    const rites = braceBody(screen(), '  function drawRites(state: GameState, seat: number): HTMLElement {');
    expect(rites).toContain('shell.close();');
    expect(rites).toContain('openCity(cityId);');
    expect(uiSource('main.ts')).toContain('openCity: (cityId) => controls.setOpenCity(cityId),');
  });

  it('slides the rows into place, and not under reduced motion', () => {
    const settle = braceBody(screen(), '  function settle(');
    expect(settle).toContain('if (wantsMotion()) slide(before.rows);');
    // The scroll is kept across the repaint a start causes.
    expect(settle).toContain('panel.scrollTop = before.scroll;');
  });

  it('draws each Start button with the shared price cell, labelled, carrying the price', () => {
    const tab = uiSource('ritesTab.ts');
    expect(tab).toContain("label: 'Start',");
    expect(tab).toContain('priceCellElement(town.look, {');
    expect(tab).toContain('priceCellElement(item.look, {');
    // The look is the rite gate's two answers, never its words.
    expect(braceBody(tab, 'function startLook(')).toContain(
      "priceLook({ bank: 'faith', price: cost, refusal: gate.refusal, shortfall: gate.shortfall })",
    );
    expect(tab.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/refusal\s*===(?!\s*null\b)/);
  });

  it('prints every rite clause through the descriptor writer', () => {
    // A describer's clause may carry `[[kind:id|Name]]` marks; printed with
    // `textContent` it would show the brackets.
    const tab = uiSource('ritesTab.ts');
    expect(tab).toContain('setDescriptorText(clauses, say.says);');
    expect(tab).toContain('setDescriptorText(says, item.says);');
    expect(tab).toContain('setDescriptorText(span, words, { linked: false });');
  });
});

// --- the prophet's rite over the realm ------------------------------------------------------------

describe('the prophet’s rite over the whole realm', () => {
  it('says there is no prophet, and what one costs', () => {
    const { state, towns } = world();
    const realm = model(state, freshRitesView(state.turn)).realm;
    const price = explainPurchaseCost(state, 0, towns[0]!.id, { kind: 'unit', id: 'prophet' }, 'faith');
    expect(price).not.toBeNull();
    expect(realm.why).toBe(`You have no prophet (${price!.total} faith).`);
    expect(realm.wanting).toBe(true);
    expect(realm.offer).toBeNull();
    expect(realm.says).toContain('A prophet says one rite in every town at once');
  });

  it('offers the selected rite with the first prophet that may say it, and which rites it replaces', () => {
    const { state, towns } = world();
    applyCommand(state, { type: 'performRite', playerId: 0, cityId: towns[1]!.id, rite: OMEN } as Command);
    const prophet = createUnit(state, 0, 'prophet', towns[0]!.col, towns[0]!.row);
    bumpRevision(state);
    const idle = model(state, freshRitesView(state.turn)).realm;
    expect(idle.offer).toBeNull();
    expect(idle.why).toBe('Pick a rite above to say it over the realm with your prophet.');
    expect(idle.says).toContain('It replaces the rites your towns are keeping: Omen Reading in 1 town.');
    const offered = model(state, selectRite(freshRitesView(state.turn), 'riteOfTheHarvest')).realm;
    expect(offered.offer).toEqual({
      unitId: prophet.id,
      rite: 'riteOfTheHarvest',
      name: 'Rite of the Harvest',
      look: { look: 'buy', bank: 'faith', price: riteCostFor(state, 0) },
    });
  });

  it('greys its button with "short N" when the bank is all that stops it', () => {
    const { state, towns } = world();
    createUnit(state, 0, 'prophet', towns[0]!.col, towns[0]!.row);
    const cost = riteCostFor(state, 0);
    playerById(state, 0)!.faithPool = cost - 9;
    bumpRevision(state);
    const realm = model(state, selectRite(freshRitesView(state.turn), OMEN)).realm;
    expect(realm.offer?.look).toEqual({ look: 'short', bank: 'faith', price: cost, need: 9 });
  });

  it('records every town it landed on as started now', () => {
    const { state, towns } = world();
    const prophet = createUnit(state, 0, 'prophet', towns[0]!.col, towns[0]!.row);
    playerById(state, 0)!.faithPool = 300;
    bumpRevision(state);
    let view = selectRite(freshRitesView(state.turn), OMEN);
    const before = playerById(state, 0)!.faithPool;
    const result = applyCommand(state, {
      type: 'empireRite',
      playerId: 0,
      unitId: prophet.id,
      rite: OMEN,
    } as Command);
    expect(result.ok).toBe(true);
    const landed = towns.filter((town) => cityRite(state, town) === OMEN).map((town) => town.id);
    view = noteRealmRite(view, state.turn, OMEN, landed, before, playerById(state, 0)!.faithPool);
    const shown = model(state, view);
    expect(shown.kept.every((town) => town.startedNow)).toBe(true);
    expect(shown.faith.history).toBe(`was ${before}; Omen Reading said over the whole realm.`);
  });
});

// --- the forecast -------------------------------------------------------------------------------

describe('the faith forecast', () => {
  it('adds the rate each turn', () => {
    expect(faithAhead(10, 5, { kind: 'full' }, 3)).toEqual([10, 15, 20, 25]);
  });

  it('takes the next god’s rung on the turn the bank first covers it, and only that one', () => {
    const rung = { kind: 'open', rung: 2, cost: 56, banked: 40, perTurn: 10, turns: 2 } as const;
    expect(faithAhead(40, 10, rung, 4)).toEqual([40, 50, 4, 14, 24]);
  });

  it('is what the faith line quotes for next turn', () => {
    const { state } = world();
    const player = playerById(state, 0)!;
    player.faithPool = 30;
    bumpRevision(state);
    const shown = model(state, freshRitesView(state.turn));
    const rung = explainNextRung(state, 0, shown.perTurn);
    const next = faithAhead(30, shown.perTurn, rung, FORECAST_TURNS)[1]!;
    expect(shown.faith.ahead).toContain(`Next turn you will have ${Math.round(next)}`);
  });
});

// --- the cache ------------------------------------------------------------------------------------

describe('the readings the sheet keeps', () => {
  it('keeps a preview while the board is unchanged, and reads it again once it moves', () => {
    const { state, towns } = world();
    const cache = createRiteReadingCache();
    const first = cache.readings(state, 0).preview(towns[0]!.id, OMEN);
    expect(cache.readings(state, 0).preview(towns[0]!.id, OMEN)).toBe(first);
    bumpRevision(state);
    const again = cache.readings(state, 0).preview(towns[0]!.id, OMEN);
    expect(again).not.toBe(first);
    expect(again).toEqual(first);
  });

  it('gives the same model as the plain readings', () => {
    const { state } = world();
    const view = selectRite(freshRitesView(state.turn), OMEN);
    const cached = ritesTabModel(state, 0, view, createRiteReadingCache().readings(state, 0));
    expect(cached).toEqual(model(state, view));
  });

  it('agrees with the gate for every free row in rite mode', () => {
    const { state } = world();
    for (const rite of LIVE_RITE_IDS) {
      const shown = model(state, selectRite(freshRitesView(state.turn), rite));
      for (const town of shown.free) {
        if (town.look === null) continue;
        const gate = riteGate(state, 0, town.cityId, rite);
        expect(town.look.look === 'buy', `${riteDef(rite).name} ${town.name}`).toBe(gate.refusal === null);
      }
    }
    // Every figure is in one of the six voices.
    for (const town of model(state, selectRite(freshRitesView(state.turn), OMEN)).free) {
      for (const figure of town.adds!.figures) expect(CITY_YIELD_KEYS).toContain(figure.voice);
    }
  });
});

// --- the drawing, in a stand-in document -------------------------------------------------------

/**
 * Just enough of a document to build the tab and press its controls: elements
 * with classes, attributes, data, text, children and listeners. Not a layout
 * engine; the slide and the scroll are the sheet's and are read as source above.
 */
interface FakeNode {
  tagName: string;
  className: string;
  dataset: Record<string, string>;
  attributes: Record<string, string>;
  children: FakeNode[];
  listeners: Record<string, ((event: unknown) => void)[]>;
  ownText: string;
  disabled?: boolean;
  title?: string;
  type?: string;
  id?: string;
  tabIndex?: number;
}

function fakeNode(tag: string): FakeNode {
  const node: FakeNode = {
    tagName: tag.toUpperCase(),
    className: '',
    dataset: {},
    attributes: {},
    children: [],
    listeners: {},
    ownText: '',
  };
  const api = node as unknown as Record<string, unknown>;
  const adopt = (items: FakeNode[]): FakeNode[] =>
    items.flatMap((item) => (item.tagName === '#FRAGMENT' ? item.children : [item]));
  api.append = (...items: FakeNode[]): void => {
    node.children.push(...adopt(items));
  };
  api.replaceChildren = (...items: FakeNode[]): void => {
    node.ownText = '';
    node.children = adopt(items);
  };
  api.setAttribute = (name: string, value: string): void => {
    node.attributes[name] = value;
  };
  api.addEventListener = (name: string, handler: (event: unknown) => void): void => {
    (node.listeners[name] ??= []).push(handler);
  };
  api.classList = {
    add: (...names: string[]): void => {
      node.className = [...node.className.split(' ').filter(Boolean), ...names].join(' ');
    },
  };
  api.style = { setProperty: (): void => {}, width: '' };
  Object.defineProperty(api, 'textContent', {
    get: (): string => node.ownText + node.children.map((child) => (child as unknown as { textContent: string }).textContent).join(''),
    set: (text: string): void => {
      node.ownText = text;
      node.children = [];
    },
  });
  return node;
}

function textOf(node: FakeNode): string {
  return (node as unknown as { textContent: string }).textContent;
}

function all(node: FakeNode): FakeNode[] {
  return [node, ...node.children.flatMap(all)];
}

function byClass(root: FakeNode, name: string): FakeNode[] {
  return all(root).filter((node) => node.className.split(' ').includes(name));
}

function byKey(root: FakeNode, key: string): FakeNode | undefined {
  return all(root).find((node) => node.dataset.key === key);
}

function press(node: FakeNode): void {
  for (const handler of node.listeners.click ?? []) handler({ preventDefault() {}, stopPropagation() {} });
}

const realDocument = (globalThis as { document?: unknown }).document;

describe('the drawing', () => {
  beforeEach(() => {
    (globalThis as { document?: unknown }).document = {
      createElement: (tag: string) => fakeNode(tag),
      createTextNode: (text: string) => {
        const node = fakeNode('#text');
        node.ownText = text;
        return node;
      },
      createDocumentFragment: () => fakeNode('#fragment'),
    };
  });

  afterEach(() => {
    (globalThis as { document?: unknown }).document = realDocument;
  });

  /** The handlers, recording what each was asked to do. */
  function recorder(): { handlers: Required<RitesTabHandlers>; calls: string[] } {
    const calls: string[] = [];
    return {
      calls,
      handlers: {
        selectRite: (rite) => calls.push(`select ${rite}`),
        toggleMenu: (cityId) => calls.push(`menu ${cityId}`),
        start: (cityId, rite) => calls.push(`start ${cityId} ${rite}`),
        sayOverRealm: (unitId, rite) => calls.push(`realm ${unitId} ${rite}`),
        openCity: (cityId) => calls.push(`open ${cityId}`),
      },
    };
  }

  function draw(state: GameState, view: RitesView, handlers: RitesTabHandlers): FakeNode {
    return drawRitesTab(model(state, view), handlers) as unknown as FakeNode;
  }

  it('starts a rite in one press of a button carrying the price', () => {
    const { state } = world();
    const view = selectRite(freshRitesView(state.turn), OMEN);
    const first = model(state, view).free[0]!;
    const { handlers, calls } = recorder();
    const tab = draw(state, view, handlers);
    const button = byKey(tab, `start:${first.cityId}`)!;
    expect(button.tagName).toBe('BUTTON');
    expect(button.disabled).toBe(false);
    expect(textOf(button).startsWith(`Start · ${riteCostFor(state, 0)}`)).toBe(true);
    expect(button.attributes['aria-label']).toBe(
      `Start Omen Reading in ${first.name} for ${riteCostFor(state, 0)} faith`,
    );
    press(button);
    expect(calls).toEqual([`start ${first.cityId} ${OMEN}`]);
    // One button a free town, numbered best first.
    expect(byClass(tab, 'faith-town-rank').map(textOf).filter(Boolean)).toEqual(['1', '2', '3', '4']);
  });

  it('marks the started town and shows "short N" on every remaining row', () => {
    const { state } = world();
    const cost = riteCostFor(state, 0);
    playerById(state, 0)!.faithPool = cost + 13;
    bumpRevision(state);
    let view = selectRite(freshRitesView(state.turn), OMEN);
    view = start(state, view, model(state, view).free[0]!.cityId, OMEN);
    const tab = draw(state, view, recorder().handlers);
    const started = byClass(tab, 'is-started');
    expect(started).toHaveLength(1);
    expect(textOf(started[0]!)).toContain('started now');
    const short = byClass(tab, 'is-short');
    expect(short).toHaveLength(3);
    for (const cell of short) {
      expect(cell.tagName).toBe('SPAN');
      expect(textOf(cell)).toContain(`short ${cost - 13}`);
    }
    expect(textOf(byClass(tab, 'faith-line')[0]!)).toContain(`Short ${cost - 13} for another rite.`);
  });

  it('presses a chip to select its rite, and draws a rite it lacks as no control at all', () => {
    const { state } = world();
    const { handlers, calls } = recorder();
    const tab = draw(state, freshRitesView(state.turn), handlers);
    const chip = byKey(tab, `chip:${OMEN}`)!;
    expect(chip.tagName).toBe('BUTTON');
    expect(chip.attributes['aria-pressed']).toBe('false');
    press(chip);
    expect(calls).toEqual([`select ${OMEN}`]);
    const locked = byClass(tab, 'is-locked').filter((node) => node.className.includes('faith-rite-chip'));
    expect(locked.length).toBe(3);
    for (const node of locked) {
      expect(node.tagName).toBe('SPAN');
      expect(textOf(node)).toContain('needs ');
    }
  });

  it('opens a town’s menu from its toggle, and its city screen from its name', () => {
    const { state, towns } = world();
    const { handlers, calls } = recorder();
    const tab = draw(state, freshRitesView(state.turn), handlers);
    const toggle = byKey(tab, `menu:${towns[0]!.id}`)!;
    expect(toggle.attributes['aria-expanded']).toBe('false');
    press(toggle);
    press(byKey(tab, `name:${towns[0]!.id}`)!);
    expect(calls).toEqual([`menu ${towns[0]!.id}`, `open ${towns[0]!.id}`]);
  });

  it('draws an open menu with a Start button for each rite this empire knows', () => {
    const { state, towns } = world();
    const { handlers, calls } = recorder();
    const tab = draw(state, ritesViewForTown(freshRitesView(state.turn), towns[0]!.id), handlers);
    const menu = byClass(tab, 'faith-town-menu');
    expect(menu).toHaveLength(1);
    const button = byKey(tab, `menu-start:${towns[0]!.id}:${OMEN}`)!;
    press(button);
    expect(calls).toEqual([`start ${towns[0]!.id} ${OMEN}`]);
    expect(textOf(menu[0]!)).toContain('needs the Order The Fast');
  });

  it('prints no raw keyword mark anywhere on the tab', () => {
    const { state, towns } = world();
    for (const view of [
      freshRitesView(state.turn),
      selectRite(freshRitesView(state.turn), 'blessingOfArms'),
      ritesViewForTown(freshRitesView(state.turn), towns[1]!.id),
    ]) {
      expect(textOf(draw(state, view, recorder().handlers))).not.toContain('[[');
    }
  });
});
