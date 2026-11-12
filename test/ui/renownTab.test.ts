/**
 * **The Renown tab's readings** (batch GP1 of 2026-11-12, `docs/flags.md` item
 * (mmmmmmm)): the odds of the next great-person offer as whole percentages,
 * and the renown ledger with one line for each town.
 *
 * The suite mounts no DOM, so these test the pure composers in
 * `src/ui/renownTab.ts`, and read the two screens' sources for the calls that
 * draw them.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { greatPersonOdds } from '../../src/sim/greatPeople';
import { GREAT_PERSON_IDS, greatPersonDef, rosterOfAge } from '../../src/sim/greatPeopleData';
import { getTileAt } from '../../src/sim/map';
import { explainRenown, explainRenownByTown, foldRenown } from '../../src/sim/renown';
import { bumpRevision } from '../../src/sim/state';
import { TRIUMPH_IDS, triumphDef } from '../../src/sim/triumphData';
import { eraWord } from '../../src/ui/figures';
import {
  foldRenownLedger,
  renownBagWords,
  renownLedgerRows,
  renownOddsReading,
  renownOddsRows,
  renownWordsText,
  wholePercents,
} from '../../src/ui/renownTab';
import { found, game } from '../sim/statecraftHelpers';

const SOURCE = import.meta.glob(['../../src/ui/topBar.ts', '../../src/ui/reliquaryScreen.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function raw(file: string): string {
  const key = Object.keys(SOURCE).find((path) => path.endsWith(`/${file}`))!;
  return SOURCE[key]!;
}

describe('whole percentages', () => {
  it('add up to exactly 100', () => {
    for (const chances of [
      [1 / 3, 1 / 3, 1 / 3],
      [0.2, 0.2, 0.2, 0.2, 0.2],
      [0.3333, 0.2222, 0.1111, 0.2222, 0.1112],
      [0.501, 0.499, 0, 0, 0],
    ]) {
      const whole = wholePercents(chances);
      expect(whole.reduce((sum, n) => sum + n, 0), String(chances)).toBe(100);
      for (const n of whole) expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('keep a share of nought at 0, and print nothing when nothing can be dealt', () => {
    expect(wholePercents([0.5, 0.5, 0, 0, 0])).toEqual([50, 50, 0, 0, 0]);
    expect(wholePercents([0.999, 0, 0, 0, 0.001])).toEqual([100, 0, 0, 0, 0]);
    expect(wholePercents([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe('the odds rows', () => {
  it('print the sim’s odds for each family, in whole percent, summing to 100', () => {
    const g = game(61);
    const player = g.state.players[0]!;
    player.renownByFamily.scholar = 50;
    bumpRevision(g.state);
    const odds = greatPersonOdds(g.state, player);
    const rows = renownOddsRows(odds);
    expect(rows.map((row) => row.family)).toEqual(odds.families.map((entry) => entry.family));
    expect(rows.reduce((sum, row) => sum + row.percent, 0)).toBe(100);
    for (const [at, row] of rows.entries()) {
      // Each whole percent is within a point of the sim's own chance.
      expect(Math.abs(row.percent - odds.families[at]!.chance * 100)).toBeLessThan(1);
      expect(row.label).not.toMatch(/\d/);
    }
  });

  it('show a spent family at 0', () => {
    const g = game(61);
    g.state.recruited.push(...GREAT_PERSON_IDS.filter((id) => greatPersonDef(id).family === 'general'));
    bumpRevision(g.state);
    const reading = renownOddsReading(g.state, 0)!;
    const general = reading.rows.find((row) => row.family === 'general')!;
    expect(general.percent).toBe(0);
    expect(general.names).toBe(0);
    expect(reading.rows.reduce((sum, row) => sum + row.percent, 0)).toBe(100);
  });

  it('say which ages are in the bag and how many names the empire’s age has left', () => {
    const g = game(61);
    const player = g.state.players[0]!;
    const own = rosterOfAge(2);
    let text = renownWordsText(renownBagWords(greatPersonOdds(g.state, player)));
    expect(text).toBe(`${eraWord(2)} has ${own.length} names left.`);
    g.state.recruited.push(...own.slice(1));
    bumpRevision(g.state);
    const words = renownBagWords(greatPersonOdds(g.state, player));
    text = renownWordsText(words);
    expect(text).toBe(`${eraWord(2)} has 1 name left, so the offer also takes names from ${eraWord(3)}.`);
    // The figure is its own piece, so the screen sets it in the mono.
    expect(words.filter((piece) => piece.figure).map((piece) => piece.text)).toEqual(['1']);
    g.state.recruited.push(own[0]!);
    bumpRevision(g.state);
    text = renownWordsText(renownBagWords(greatPersonOdds(g.state, player)));
    expect(text).toBe(`${eraWord(2)} has no names left, so the offer comes from ${eraWord(3)}.`);
  });

  it('say so when the roster is spent, and print no rows', () => {
    const g = game(61);
    g.state.recruited.push(...GREAT_PERSON_IDS);
    bumpRevision(g.state);
    const reading = renownOddsReading(g.state, 0)!;
    expect(reading.wanted).toBe(0);
    expect(reading.rows.every((row) => row.percent === 0)).toBe(true);
    expect(renownWordsText(reading.bag)).toBe('Every great person has been called. Renown banks from now on.');
  });

  it('answer nothing for a seat that is not there', () => {
    expect(renownOddsReading(game(61).state, 99)).toBeNull();
  });
});

describe('the renown ledger, one line for each town', () => {
  /** Two towns of seat 0, each with a building that pays renown. */
  function twoTowns() {
    const g = game(67);
    const capital = found(g.state, 0);
    const colony = foundCityAt(g.state, 0, getTileAt(g.state.map, capital.col + 4, capital.row)!)!;
    capital.buildings.push('library', 'monument');
    colony.buildings.push('library');
    bumpRevision(g.state);
    return { state: g.state, capital, colony };
  }

  it('folds to the same total as the full list', () => {
    const { state } = twoTowns();
    const rows = renownLedgerRows(state, 0);
    const lines = explainRenown(state, 0);
    expect(lines.length).toBeGreaterThan(0);
    expect(foldRenownLedger(rows)).toBe(foldRenown(lines));
    expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBeCloseTo(foldRenown(lines), 9);
    // Every line is in exactly one row, in the list's order.
    expect(rows.flatMap((row) => row.lines)).toEqual(lines);
  });

  it('gives each town one row, named for the town, that folds its own lines', () => {
    const { state, capital, colony } = twoTowns();
    const rows = renownLedgerRows(state, 0);
    const towns = rows.filter((row) => row.cityId !== undefined);
    expect(towns.map((row) => row.cityId)).toEqual([capital.id, colony.id]);
    for (const row of towns) {
      expect(row.amount).toBe(foldRenown(row.lines));
      const marked = explainRenownByTown(state, 0)
        .filter((entry) => entry.cityId === row.cityId)
        .map((entry) => entry.line);
      expect(row.lines).toEqual(marked);
    }
    expect(towns[0]!.source).toContain(capital.name);
    expect(towns[1]!.source).toBe(colony.name);
  });

  it('keeps a line that belongs to no town on its own row', () => {
    const { state } = twoTowns();
    // This turn's Triumph is a lump the realm earned, not a town.
    const id = TRIUMPH_IDS.find((one) => triumphDef(one).pays > 0)!;
    state.players[0]!.triumphs.push({ id, turn: state.turn });
    bumpRevision(state);
    expect(explainRenownByTown(state, 0).some((entry) => entry.cityId === null)).toBe(true);
    const realm = explainRenownByTown(state, 0).filter((entry) => entry.cityId === null);
    const rows = renownLedgerRows(state, 0).filter((row) => row.cityId === undefined);
    expect(rows.map((row) => row.lines)).toEqual(realm.map((entry) => [entry.line]));
    for (const row of rows) expect(row.amount).toBe(row.lines[0]!.amount);
  });

  it('is the list explainRenown prints, with the town marks taken off', () => {
    const { state } = twoTowns();
    expect(explainRenownByTown(state, 0).map((entry) => entry.line)).toEqual(explainRenown(state, 0));
  });
});

describe('the two screens', () => {
  it('print the collapsed ledger and the odds on the hover card', () => {
    const bar = raw('topBar.ts');
    expect(bar).toContain('const rows = renownLedgerRows(state, playerId);');
    expect(bar).toContain('signedMeterFigure(foldRenownLedger(rows))');
    expect(bar).toContain('box.append(renownOddsNode(odds));');
    expect(bar).not.toContain('explainRenown(state, playerId)');
  });

  it('open a town’s line to its sources on the Reliquary', () => {
    const screen = raw('reliquaryScreen.ts');
    expect(screen).toContain("const fold = element('details', 'rel-ledger-town');");
    expect(screen).toContain('for (const line of row.lines) {');
    expect(screen).toContain('signedMeterFigure(foldRenownLedger(rows))');
    expect(screen).toContain('section.append(renownOddsNode(odds));');
    // Drawn on the empty screen too, before anybody has been called.
    const empty = screen.slice(screen.indexOf('if (roll.length === 0) {'));
    expect(empty.slice(0, empty.indexOf('return;'))).toContain('drawRenown();');
  });
});
