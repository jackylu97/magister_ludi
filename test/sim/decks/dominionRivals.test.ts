/**
 * **Dominion batch D15, The Upstarts** (`docs/plans/dominion-themes-
 * triage.md`, the D15 section, and reading 25). `dominion.test.ts` checks the
 * row against the sheet, and `test/fixtures/cardText.json` pins its words.
 * This file checks the `vsMoreTechs` combat condition, the mirror of
 * Scientific's `vsFewerTechs`, read through `knowsMoreTechs` (`rivals.ts`):
 *
 *   · +3 strength for the holder's military units in a fight with an empire
 *     that knows more technologies, in attack and in defence, and against
 *     that empire's towns;
 *   · nothing against an empire level with the holder or behind it;
 *   · nothing against the barbarians, who are not an empire;
 *   · nothing for a ship, which is not a land military unit.
 */

import { describe, expect, it } from 'vitest';

import { previewCombat } from '../../../src/sim/combat';
import { foundCityAt } from '../../../src/sim/cities';
import { type Tile, createMap, getTileAt } from '../../../src/sim/map';
import { makeRng } from '../../../src/sim/rng';
import {
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import { type CombatSituation, cardCombatLines, describeCard, stripRefs } from '../../../src/sim/statecraft';
import { type OrderId, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import { TECH_IDS, type TechId } from '../../../src/sim/techData';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { newGame } from '../newGameHelpers';

const UPSTARTS = 'theUpstarts' as OrderId;
const NAME = 'The Upstarts';

/** Two seats, and the wild, on a flat grassland rectangle, at war. */
function flat(): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    barbarians: true,
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
  const real = realPlayers(state);
  openWar(state, real[0]!.id, real[1]!.id);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  return getTileAt(state.map, col, row)!;
}

/** Everything visible to everybody, so the fog is not the subject. */
function seeAll(state: GameState): void {
  for (const player of state.players) state.visibility[player.id]!.fill(2);
}

function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Teaches a seat technologies, the way a finished research leaves them. */
function learn(state: GameState, playerId: number, ...techs: TechId[]): void {
  const player = playerById(state, playerId)!;
  for (const tech of techs) if (!player.techsResearched.includes(tech)) player.techsResearched.push(tech);
  bumpRevision(state);
}

/** Ordinary technologies no seat starts with, in tree order. */
function spareTechs(state: GameState, count: number): TechId[] {
  const known = new Set<TechId>();
  for (const player of state.players) for (const id of player.techsResearched) known.add(id);
  const spare = TECH_IDS.filter((id) => !known.has(id)).slice(0, count);
  expect(spare).toHaveLength(count);
  return spare;
}

/** The strength lines on one side of a forecast whose label holds the card's name. */
function strength(state: GameState, attacker: Unit, col: number, row: number, side: 'attacker' | 'defender'): number {
  seeAll(state);
  const view = previewCombat(state, attacker.id, { col, row });
  if (!view.ok) throw new Error(view.error);
  const list = side === 'attacker' ? view.attackerLines : view.defenderLines;
  return list.filter((line) => line.source.includes(NAME)).reduce((sum, line) => sum + line.amount, 0);
}

const wildId = (state: GameState): number => state.players.find((player) => player.barbarian === true)!.id;

describe('Dominion D15 — The Upstarts', () => {
  it('is a live uncommon Military Order of Tier I with one strength line', () => {
    const def = orderDef(UPSTARTS);
    expect(def.name).toBe(NAME);
    expect(def.decks).toEqual(['dominion']);
    expect(def.band).toBe(1);
    expect(def.rarity).toBe('uncommon');
    expect(def.type).toBe('military');
    expect(orderIsDealt(UPSTARTS)).toBe(true);
    expect(def.effects).toEqual([
      {
        kind: 'combatLine',
        amount: 3,
        side: 'both',
        when: { test: 'vsMoreTechs' },
        class: { category: 'military' },
      },
    ]);
    const words = describeCard(UPSTARTS)
      .map((clause) => stripRefs(clause.text))
      .join(' | ');
    expect(words).toBe('+3 combat strength for military units against an empire that knows more technologies than you');
  });

  it('adds +3 in a fight with an empire that knows more technologies, attacking and defending', () => {
    const state = flat();
    slot(state, 0, UPSTARTS);
    const mine = createUnit(state, 0, 'warrior', 4, 4);
    const theirs = createUnit(state, 1, 'warrior', 5, 4);
    // Level: no line.
    expect(strength(state, mine, 5, 4, 'attacker')).toBe(0);
    // The rival ahead by one: the line, on both sides of the fight.
    learn(state, 1, ...spareTechs(state, 1));
    expect(strength(state, mine, 5, 4, 'attacker')).toBe(3);
    expect(strength(state, theirs, 4, 4, 'defender')).toBe(3);
    // The rival's own lines carry no such thing.
    expect(strength(state, theirs, 4, 4, 'attacker')).toBe(0);
    // The holder ahead again: no line.
    learn(state, 0, ...spareTechs(state, 2));
    expect(strength(state, mine, 5, 4, 'attacker')).toBe(0);
  });

  it('adds +3 against the towns of an empire that knows more technologies', () => {
    const state = flat();
    slot(state, 0, UPSTARTS);
    foundCityAt(state, 1, at(state, 5, 4));
    const mine = createUnit(state, 0, 'warrior', 4, 4);
    learn(state, 1, ...spareTechs(state, 1));
    expect(strength(state, mine, 5, 4, 'attacker')).toBe(3);
  });

  it('never pays against the barbarians, who are not an empire', () => {
    const state = flat();
    slot(state, 0, UPSTARTS);
    const mine = createUnit(state, 0, 'warrior', 4, 4);
    const wild = createUnit(state, wildId(state), 'warrior', 5, 4);
    // Whatever the wild is said to know, it is never counted.
    learn(state, wild.ownerId, ...spareTechs(state, 3));
    expect(strength(state, mine, 5, 4, 'attacker')).toBe(0);
    expect(strength(state, wild, 4, 4, 'defender')).toBe(0);
  });

  it('pays only land military units, and nothing without the card', () => {
    const state = flat();
    learn(state, 1, ...spareTechs(state, 1));
    const ship = createUnit(state, 0, 'trireme', 4, 4);
    const lines = (unit: Unit): number =>
      cardCombatLines(state, {
        unit,
        side: 'attack',
        tile: at(state, 5, 4),
        vsBarbarians: false,
        vsCity: false,
        targetHp: 100,
        targetMaxHp: 100,
        vsOwnerId: 1,
      } as CombatSituation)
        .filter((line) => line.source.includes(NAME))
        .reduce((sum, line) => sum + line.amount, 0);
    const soldier = createUnit(state, 0, 'warrior', 3, 4);
    expect(lines(soldier)).toBe(0);
    slot(state, 0, UPSTARTS);
    expect(lines(soldier)).toBe(3);
    expect(lines(ship)).toBe(0);
  });
});
