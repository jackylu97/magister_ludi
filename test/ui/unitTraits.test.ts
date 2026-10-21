/**
 * **A piece's line traits, on the unit card and the hover row** (Scientific
 * batch S10, the approved prototype `docs/plans/mockups/charter-ux.html` steps
 * 5 and 6; the rulings are `docs/plans/scientific-themes.md` sections 3, 13
 * and 14).
 *
 * A trait keeps the piece's type and its name, so the card says it after the
 * name ("Catapult · Onager") and prints its bonus as labelled lines in the
 * strength and range lists. Every figure is the simulation's own: the strength
 * line is `combatLineAmount`, and the range is the row's range plus
 * `cardUnitStat`, which is how a ranged attack measures its reach.
 *
 * The same rule, asked piece by piece, says which pieces gained a trait in a
 * resolution, for the glow and the toast (`traitGainers`); it must agree with
 * the simulation's tally (`researchSince`).
 */

import { describe, expect, it } from 'vitest';

import { createMap } from '../../src/sim/map';
import { makeRng } from '../../src/sim/rng';
import { type GameState, bumpRevision, createUnit, playerById } from '../../src/sim/state';
import { cardUnitStat } from '../../src/sim/statecraft';
import { researchSince, researchSnapshot } from '../../src/sim/tech';
import type { TechId } from '../../src/sim/techData';
import { unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';
import {
  OTHER_RANGE_LABEL,
  foldUnitLedger,
  traitGainers,
  unitTitle,
  unitTraitLedger,
} from '../../src/ui/unitTraits';
import { newGame } from '../sim/newGameHelpers';
import { braceBody, uiSource } from './sourceHelpers';

/** Two seats on a flat grassland rectangle with no towns and no pieces. */
function flat(): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 10).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  return state;
}

function learn(state: GameState, playerId: number, ...techs: TechId[]): void {
  playerById(state, playerId)!.techsResearched.push(...techs);
  bumpRevision(state);
}

describe('the name with its trait after it', () => {
  it('is the type alone for a piece with no trait', () => {
    const state = flat();
    const catapult = createUnit(state, 0, 'catapult', 4, 4);
    expect(unitTitle(state, catapult)).toBe('Catapult');
    expect(unitTraitLedger(state, catapult)).toBeNull();
  });

  it('reads "Catapult · Onager" once its owner knows Mechanics, and only its owner', () => {
    const state = flat();
    const mine = createUnit(state, 0, 'catapult', 4, 4);
    const theirs = createUnit(state, 1, 'catapult', 8, 4);
    learn(state, 0, 'mechanics');
    expect(unitTitle(state, mine)).toBe('Catapult · Onager');
    expect(unitTitle(state, theirs)).toBe('Catapult');
  });

  it('keeps the trait through an upgrade, because it belongs to the line', () => {
    const state = flat();
    const trebuchet = createUnit(state, 0, 'trebuchet', 4, 4);
    learn(state, 0, 'mechanics');
    expect(unitTitle(state, trebuchet)).toBe('Trebuchet · Onager');
  });
});

describe('the labelled lines', () => {
  it('lists the Onager’s range as its own line, and folds to the reach an attack measures', () => {
    const state = flat();
    const catapult = createUnit(state, 0, 'catapult', 4, 4);
    learn(state, 0, 'mechanics');
    const ledger = unitTraitLedger(state, catapult)!;
    const row = unitDef('catapult');
    expect(ledger.range).toEqual([
      { label: 'Catapult', amount: row.range },
      { label: 'Mechanics · Onager', amount: 1 },
    ]);
    // The fold is exactly `combat.ts`'s reach.
    expect(foldUnitLedger(ledger.range!)).toBe(row.range! + cardUnitStat(state, catapult, 'range'));
    // The Onager gives no strength since section 14, so the strength list is
    // the row alone and the card prints no strength list.
    expect(ledger.strength).toEqual([{ label: 'Catapult', amount: row.combatStrength }]);
    expect(ledger.words.map((words) => words.name)).toEqual(['Onager']);
    expect(ledger.words[0]!.clauses.length).toBeGreaterThan(0);
  });

  it('lists the Hoplite’s strength line on a spearman, from the combat evaluator', () => {
    const state = flat();
    const spearman = createUnit(state, 0, 'spearman', 4, 4);
    learn(state, 0, 'casting');
    const ledger = unitTraitLedger(state, spearman)!;
    // Out in the field: the flat +1 of the Hoplite, and no citizens to count.
    expect(ledger.strength).toEqual([
      { label: 'Spearman', amount: unitDef('spearman').combatStrength },
      { label: 'Casting · Hoplite', amount: 1 },
    ]);
    expect(ledger.range).toBeNull();
  });

  it('names the rest of what the empire’s cards add to a range, so the list still folds', () => {
    expect(OTHER_RANGE_LABEL).toBe('Your other cards');
    const body = braceBody(uiSource('unitTraits.ts'), 'export function unitTraitLedger(');
    expect(body).toContain("cardUnitStat(state, unit, 'range') - traitRange");
  });

  it('prints the trait after the name, and the lists, on the unit card', () => {
    const panel = uiSource('unitPanel.ts');
    expect(panel).toContain("heading.append(element('span', 'unit-trait', ` · ${words.name}`))");
    expect(panel).toContain('foldUnitLedger(traits.strength)');
    expect(panel).toContain("list('Strength', ledger.strength);");
    expect(panel).toContain("if (ledger.range !== null) list('Range', ledger.range);");
    // And on the hover row a rival's piece is read from.
    expect(uiSource('main.ts')).toContain('${unitTitle(state, first)} · ${unitHp(first, bonus)}');
  });
});

describe('which pieces gained a trait', () => {
  it('agrees with the simulation’s tally, piece by piece', () => {
    const state = flat();
    const a = createUnit(state, 0, 'catapult', 4, 4);
    const b = createUnit(state, 0, 'catapult', 5, 4);
    const archer = createUnit(state, 0, 'compositeBowman', 4, 5);
    createUnit(state, 0, 'warrior', 4, 6);
    createUnit(state, 1, 'catapult', 8, 4);
    const before = researchSnapshot(state, 0);
    learn(state, 0, 'mechanics');
    const gains = traitGainers(state, 0, before);
    expect(gains.map((gain) => [gain.unitId, gain.trait])).toEqual([
      [a.id, 'Onager'],
      [b.id, 'Onager'],
      [archer.id, 'Repeating Crossbow'],
    ]);
    const tally = researchSince(state, 0, before).traits;
    const counted = tally.reduce((sum, entry) => sum + entry.count, 0);
    expect(gains).toHaveLength(counted);
    // Each gain carries the hex its toast pans to.
    expect(gains[0]).toMatchObject({ col: 4, row: 4, tech: 'mechanics', type: 'catapult' });
  });

  it('counts nothing for a piece made since the snapshot, or a piece that already had the trait', () => {
    const state = flat();
    createUnit(state, 0, 'catapult', 4, 4);
    learn(state, 0, 'mechanics');
    const before = researchSnapshot(state, 0);
    createUnit(state, 0, 'catapult', 5, 4);
    expect(traitGainers(state, 0, before)).toEqual([]);
  });
});
