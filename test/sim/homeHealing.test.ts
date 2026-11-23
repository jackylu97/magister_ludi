import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { siegeField, underSiege } from '../../src/sim/combat';
import { explainUnitHeal, foldUnitHeal } from '../../src/sim/healing';
import { tileNeighbors } from '../../src/sim/map';
import { riteDef } from '../../src/sim/religionData';
import { bumpRevision, createUnit } from '../../src/sim/state';
import { techDef } from '../../src/sim/techData';
import { runEndOfTurn } from '../../src/sim/turn';
import { healFigure } from '../../src/ui/unitPanel';
import { at, bareState } from './improvementHelpers';

function home() {
  const state = bareState(24, 12);
  const city = foundCityAt(state, 0, at(state, 5, 5));
  const unit = createUnit(state, 0, 'warrior', 5, 5);
  unit.hp = 20;
  return { state, city, unit };
}

describe('rested healing at home', () => {
  it.each([
    ['unowned ground', 15, 8, 10],
    ['own territory', 5, 4, 20],
    ['own city', 5, 5, 30],
  ] as const)('heals the full expected amount on %s', (_name, col, row, expected) => {
    const { state, unit } = home();
    unit.col = col;
    unit.row = row;
    bumpRevision(state);
    const lines = explainUnitHeal(state, unit);
    expect(foldUnitHeal(lines)).toBe(expected);
    expect(healFigure(state, unit)?.text).toBe(`+${expected} HP`);
    const before = unit.hp;
    runEndOfTurn(state);
    expect(unit.hp - before).toBe(expected);
  });

  it('gives no home bonus on another owner\'s city or land', () => {
    const { state, unit } = home();
    foundCityAt(state, 1, at(state, 15, 5));
    unit.col = 15;
    bumpRevision(state);
    expect(explainUnitHeal(state, unit)).toEqual([{ label: 'Resting', amount: 10 }]);
    unit.row = 4;
    bumpRevision(state);
    expect(explainUnitHeal(state, unit)).toEqual([{ label: 'Resting', amount: 10 }]);
  });

  it('removes only the city bonus while besieged and restores it when the siege opens', () => {
    const { state, city, unit } = home();
    const ring = tileNeighbors(state.map, at(state, city.col, city.row));
    for (const tile of ring) createUnit(state, 1, 'warrior', tile.col, tile.row);
    bumpRevision(state);
    expect(underSiege(state, city, siegeField(state, 0))).toBe(true);
    expect(explainUnitHeal(state, unit)).toEqual([
      { label: 'Resting', amount: 10 },
      { label: 'Own territory', amount: 10 },
    ]);
    state.units = [unit];
    bumpRevision(state);
    expect(underSiege(state, city, siegeField(state, 0))).toBe(false);
    expect(explainUnitHeal(state, unit)).toEqual([
      { label: 'Resting', amount: 10 },
      { label: 'Own territory', amount: 10 },
      { label: 'Own city', amount: 10 },
    ]);
  });

  it.each(['moved', 'attacked'] as const)('gives no resting or location lines after the unit %s', action => {
    const { state, unit } = home();
    if (action === 'moved') unit.movesLeft = 0;
    else unit.hasAttacked = true;
    expect(explainUnitHeal(state, unit)).toEqual([]);
  });

  it('keeps card and Keep lines additive and caps their total at full health', () => {
    const { state, city, unit } = home();
    city.buildings.push('keep');
    state.players[0]!.statecraft.orders.push('restingCamps');
    state.players[0]!.statecraft.slots[0] = { card: 'restingCamps', sealedUntil: 0 };
    bumpRevision(state);
    const lines = explainUnitHeal(state, unit);
    expect(lines.find(line => line.label.includes('Resting Camps'))?.amount).toBe(5);
    expect(lines.find(line => line.label.startsWith('Keep'))?.amount).toBe(5);
    expect(foldUnitHeal(lines)).toBe(40);
    unit.hp = 97;
    const capped = explainUnitHeal(state, unit);
    expect(foldUnitHeal(capped)).toBe(3);
    expect(capped[capped.length - 1]).toEqual({ label: 'Capped at full health', amount: -37 });
  });

  it('keeps The Healer-Priests as an extra ten health on owned territory', () => {
    const { state, unit } = home();
    state.players[0]!.statecraft.orders.push('theHealerPriests');
    state.players[0]!.statecraft.slots[0] = { card: 'theHealerPriests', sealedUntil: 0 };
    bumpRevision(state);
    expect(foldUnitHeal(explainUnitHeal(state, unit))).toBe(40);
    unit.row = 4;
    bumpRevision(state);
    expect(foldUnitHeal(explainUnitHeal(state, unit))).toBe(30);
  });

  it('keeps the no-healing-abroad rule while allowing all home bonuses', () => {
    const { state, unit } = home();
    const effects = techDef('kingship').effects!;
    const length = effects.length;
    effects.push({ kind: 'rule', rule: 'noHealAbroad' });
    state.players[0]!.techsResearched.push('kingship');
    try {
      bumpRevision(state);
      expect(foldUnitHeal(explainUnitHeal(state, unit))).toBe(30);
      unit.col = 15;
      unit.row = 8;
      bumpRevision(state);
      expect(explainUnitHeal(state, unit)).toEqual([]);
    } finally {
      effects.splice(length);
      bumpRevision(state);
    }
  });

  it('keeps a healing rite independent of resting and location bonuses', () => {
    const { state, city, unit } = home();
    city.timed = [{
      card: 'restoringOfTheHost', expiresTurn: state.turn + 5,
      effect: { kind: 'pays', where: 'city', faith: 0 },
    }];
    unit.hasAttacked = true;
    bumpRevision(state);
    expect(explainUnitHeal(state, unit)).toEqual([
      { label: riteDef('restoringOfTheHost').name, amount: 25 },
    ]);
    unit.hasAttacked = false;
    expect(foldUnitHeal(explainUnitHeal(state, unit))).toBe(55);
  });
});
