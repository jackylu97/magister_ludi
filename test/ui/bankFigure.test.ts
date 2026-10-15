/**
 * The banks as every screen writes them (`src/ui/bankFigure.ts`, batch UX5):
 * "Treasury 437 (+21) · Faith 51 (+2)".
 *
 * The claim worth holding is that this is the top bar's figure and not a second
 * one: the bank is `bankOf` and the rate is `readEmpire`'s total, written by the
 * top bar's own `poolFigure`. The top bar stands down while a town is open, so
 * the band is where a player reads their treasury, and it must say what the bar
 * would have said.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { getTileAt } from '../../src/sim/map';
import { readEmpire } from '../../src/sim/readings';
import { bumpRevision, playerById } from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';
import {
  BANKS,
  bankHeldText,
  bankLineText,
  bankText,
  bankValueText,
  readBank,
  readBanks,
} from '../../src/ui/bankFigure';
import { netFigure, poolFigure } from '../../src/ui/figures';
import { braceBody, uiSource } from './sourceHelpers';
import { createGame } from '../sim/newGameHelpers';

function town() {
  const { state } = createGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  const settler = state.units.find((u) => u.ownerId === 0 && unitDef(u.type).foundsCity)!;
  foundCityAt(state, 0, getTileAt(state.map, settler.col, settler.row)!);
  const player = playerById(state, 0)!;
  player.gold = 437;
  player.faithPool = 51;
  bumpRevision(state);
  return state;
}

describe('the banks of a seat', () => {
  it('are the purse and the top bar’s rate, treasury first', () => {
    const state = town();
    const player = playerById(state, 0)!;
    const totals = readEmpire(state, 0).totals;
    expect(BANKS).toEqual(['gold', 'faith']);
    expect(readBanks(state, 0)).toEqual([
      { bank: 'gold', held: player.gold, perTurn: totals.gold },
      { bank: 'faith', held: player.faithPool, perTurn: totals.faith },
    ]);
  });

  it('write each figure exactly as the top bar writes its chip', () => {
    // The top bar's chip is `poolFigure(pool, readEmpire(...).totals[key])`
    // (`topBar.ts`, `BANKED`); the band must be the same string.
    const state = town();
    const player = playerById(state, 0)!;
    const totals = readEmpire(state, 0).totals;
    expect(bankValueText(readBank(state, 0, 'gold'))).toBe(poolFigure(player.gold, totals.gold));
    expect(bankValueText(readBank(state, 0, 'faith'))).toBe(
      poolFigure(player.faithPool, totals.faith),
    );
    expect(bankLineText(readBanks(state, 0))).toBe(
      `Treasury ${poolFigure(player.gold, totals.gold)} · Faith ${poolFigure(player.faithPool, totals.faith)}`,
    );
  });

  it('read an empty bank for a seat that does not exist', () => {
    const state = town();
    expect(readBank(state, 99, 'gold').held).toBe(0);
  });
});

describe('the words', () => {
  it('label each bank, then the bank, then the rate in brackets', () => {
    expect(bankText({ bank: 'gold', held: 437, perTurn: 21 })).toBe('Treasury 437 (+21)');
    expect(bankText({ bank: 'faith', held: 51, perTurn: 2 })).toBe('Faith 51 (+2)');
    expect(
      bankLineText([
        { bank: 'gold', held: 437, perTurn: 21 },
        { bank: 'faith', held: 51, perTurn: 2 },
      ]),
    ).toBe('Treasury 437 (+21) · Faith 51 (+2)');
  });

  it('keep a treasury in debt negative, and shorten what the top bar shortens', () => {
    expect(bankText({ bank: 'gold', held: -22, perTurn: -3 })).toBe('Treasury −22 (−3)');
    expect(bankHeldText(1234)).toBe(netFigure(1234));
    expect(bankHeldText(-22)).toBe('−22');
  });
});

describe('the line as drawn', () => {
  it('inks each figure by its bank, and keeps the label beside it', () => {
    const body = braceBody(uiSource('bankFigure.ts'), 'export function bankLineElement(');
    expect(body).toContain("element('span', `bank-figure is-${figure.bank}`)");
    expect(body).toContain("element('span', 'bank-figure-value', bankValueText(figure))");
    const css = uiSource('style.css');
    expect(css).toContain('.bank-figure.is-gold .bank-figure-value,');
    expect(css).toContain('.bank-figure.is-faith .bank-figure-value,');
  });
});
