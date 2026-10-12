/**
 * Levies (batch L, `src/sim/levies.ts`): a town spends one citizen on what the
 * player's cards allow.
 *
 * Covered here: the refusals and that a refused levy leaves the state
 * byte-identical; the shared waiting period, read off an absolute stamp; each
 * use's payment (production here, a trained melee unit, hammers sent to the
 * town building the Magnum Opus, an untrained melee unit that may be raised
 * every turn at war); Seasonal Levies' aftermath and its twenty-turn limit; and
 * that the same setup and the same commands always reach the same state.
 */

import { describe, expect, it } from 'vitest';

import { applyCommand, type Command } from '../../src/sim/commands';
import { bestMeleeFor, foundCityAt, growthThreshold, refreshCityDerived } from '../../src/sim/cities';
import { createGame, dispatch, type Game } from '../../src/sim/game';
import { levyError, levyOptions } from '../../src/sim/levies';
import { getTileAt } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { type City, bumpRevision, playerById, unitById } from '../../src/sim/state';
import { describeCard, stripRefs } from '../../src/sim/statecraft';
import { type OrderId, orderIsDealt } from '../../src/sim/statecraftData';

const EVERY = RULES.cities.levy.everyTurns;

/** A duel with one town for the first seat, of the given size. */
function bench(population = 6, seed = 31): { g: Game; city: City } {
  const g = createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, leader: 'pachacuti' },
      { name: 'Bors', color: '#3a7fe8', leader: 'taizong' },
    ],
  });
  const unit = g.state.units.find((u) => u.ownerId === 0)!;
  const city = foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col, unit.row)!)!;
  city.population = population;
  city.queue = [];
  refreshCityDerived(g.state, city);
  bumpRevision(g.state);
  return { g, city };
}

/** Seats an Order for the first player, the way a slot command would leave it. */
function seat(g: Game, card: string): void {
  const sc = playerById(g.state, 0)!.statecraft;
  sc.orders.push(card as OrderId);
  sc.slots.push({ card: card as OrderId, sealedUntil: g.state.turn });
  bumpRevision(g.state);
}

function levy(g: Game, city: City, use: string): ReturnType<typeof applyCommand> {
  return dispatch(g, { type: 'levyCitizen', playerId: 0, cityId: city.id, use } as Command);
}

describe('the levy cards', () => {
  it('are dealt, and describe themselves in plain words', () => {
    for (const id of [
      'levyOfTheLand',
      'theMusterOfTheFields',
      'seasonalLevies',
      'theCorvee',
      'theGeneralLevy',
    ] as OrderId[]) {
      expect(orderIsDealt(id), id).toBe(true);
      const clauses = describeCard(id).map((clause) => stripRefs(clause.text));
      expect(clauses.join(' '), id).toMatch(/citizen/);
    }
  });
});

describe('refusals', () => {
  it('refuses a town whose owner holds no levy card, and lists nothing', () => {
    const { g, city } = bench();
    expect(levyOptions(g.state, 0, city)).toEqual([]);
    expect(levyError(g.state, 0, city, 'production')).toMatch(/None of your cards/);
  });

  it('leaves the state byte-identical when a levy is refused', () => {
    const { g, city } = bench(1);
    seat(g, 'levyOfTheLand');
    const refusals: Command[] = [
      // Too small: one citizen.
      { type: 'levyCitizen', playerId: 0, cityId: city.id, use: 'production' },
      // A use no held card grants.
      { type: 'levyCitizen', playerId: 0, cityId: city.id, use: 'muster' },
      // A word the game does not know.
      { type: 'levyCitizen', playerId: 0, cityId: city.id, use: 'gold' } as unknown as Command,
      // Not this player's town.
      { type: 'levyCitizen', playerId: 1, cityId: city.id, use: 'production' },
      // No such town.
      { type: 'levyCitizen', playerId: 0, cityId: 9999, use: 'production' },
    ];
    for (const command of refusals) {
      const before = JSON.stringify(g.state);
      const result = applyCommand(g.state, command);
      expect(result.ok, JSON.stringify(command)).toBe(false);
      expect(JSON.stringify(g.state)).toBe(before);
    }
  });

  it('refuses a town whose every citizen works in a guild', () => {
    const { g, city } = bench(2);
    seat(g, 'levyOfTheLand');
    city.specialists.scholar = 2;
    expect(levyError(g.state, 0, city, 'production')).toMatch(/guild/);
  });

  it('refuses after the seat has ended its turn', () => {
    const { g, city } = bench();
    seat(g, 'levyOfTheLand');
    g.state.turnEnded[0] = true;
    expect(levyError(g.state, 0, city, 'production')).toMatch(/ended turn/);
  });
});

describe('Levy of the Land — production here', () => {
  it('takes one citizen and pays the food it took to grow that citizen', () => {
    const { g, city } = bench(6);
    seat(g, 'levyOfTheLand');
    const hammers = growthThreshold(5);
    const [line] = levyOptions(g.state, 0, city);
    expect(line!.use).toBe('production');
    expect(line!.hammers).toBe(hammers);
    expect(line!.cardName).toBe('Levy of the Land');
    expect(line!.blocked).toBeNull();

    const basket = city.hammerBasket;
    expect(levy(g, city, 'production').ok).toBe(true);
    expect(city.population).toBe(5);
    expect(city.hammerBasket).toBe(basket + hammers);
    expect(city.levy?.turn).toBe(g.state.turn);
    // The town is re-seated at once: no more citizens working than it has.
    expect(city.workedTiles.length).toBeLessThanOrEqual(city.population);
  });

  it('waits five turns between levies, read off the stamp', () => {
    const { g, city } = bench(8);
    seat(g, 'levyOfTheLand');
    expect(levy(g, city, 'production').ok).toBe(true);
    const start = g.state.turn;
    expect(levyError(g.state, 0, city, 'production')).toBe(
      `${city.name} can levy again in ${EVERY} turns`,
    );
    g.state.turn = start + EVERY - 1;
    expect(levyError(g.state, 0, city, 'production')).toBe(`${city.name} can levy again in 1 turn`);
    g.state.turn = start + EVERY;
    expect(levyError(g.state, 0, city, 'production')).toBeNull();
  });
});

describe('The Muster of the Fields — a trained melee unit', () => {
  it('raises the best melee unit, on the payroll, and the training cards pay for it', () => {
    const { g, city } = bench(6);
    seat(g, 'theMusterOfTheFields');
    seat(g, 'musterRites');
    const type = bestMeleeFor(g.state, 0)!;
    expect(type).not.toBeNull();
    const faith = playerById(g.state, 0)!.faithPool;
    const before = g.state.units.length;
    expect(levy(g, city, 'muster').ok).toBe(true);
    expect(g.state.units.length).toBe(before + 1);
    const raised = g.state.units[g.state.units.length - 1]!;
    expect(raised.type).toBe(type);
    expect(raised.ownerId).toBe(0);
    expect(raised.freeUpkeep).toBeUndefined();
    // Muster Rites: "training a unit grants 6 faith" (the Dominion sheet raised it from 5).
    expect(playerById(g.state, 0)!.faithPool).toBe(faith + 6);
    expect(city.population).toBe(5);
  });

  it('shares the waiting period with every other levy', () => {
    const { g, city } = bench(8);
    seat(g, 'levyOfTheLand');
    seat(g, 'theMusterOfTheFields');
    expect(levy(g, city, 'production').ok).toBe(true);
    expect(levyError(g.state, 0, city, 'muster')).toMatch(/can levy again/);
  });
});

describe('The General Levy — an untrained melee unit', () => {
  it('raises a unit the training cards do not pay for', () => {
    const { g, city } = bench(6);
    seat(g, 'theGeneralLevy');
    seat(g, 'musterRites');
    const faith = playerById(g.state, 0)!.faithPool;
    expect(levy(g, city, 'conscript').ok).toBe(true);
    const raised = g.state.units[g.state.units.length - 1]!;
    expect(raised.type).toBe(bestMeleeFor(g.state, 0));
    expect(raised.freeUpkeep).toBeUndefined();
    expect(playerById(g.state, 0)!.faithPool).toBe(faith);
  });

  it('waits five turns at peace and one at war', () => {
    const { g, city } = bench(9);
    seat(g, 'theGeneralLevy');
    expect(levy(g, city, 'conscript').ok).toBe(true);
    const start = g.state.turn;
    g.state.turn = start + 1;
    expect(levyError(g.state, 0, city, 'conscript')).toMatch(/can levy again in 4 turns/);
    g.state.wars.push({ a: 0, b: 1, declaredTurn: start });
    expect(levyError(g.state, 0, city, 'conscript')).toBeNull();
    // A levy taken at war still starts the shared wait for the other uses.
    expect(levy(g, city, 'conscript').ok).toBe(true);
    expect(levyError(g.state, 0, city, 'conscript')).toMatch(/can levy again in 1 turn/);
  });
});

describe('The Corvée — hammers sent to the Magnum Opus', () => {
  it('pays the town with the Opus at the front of its queue', () => {
    const { g, city } = bench(10);
    seat(g, 'theCorvee');
    expect(levyError(g.state, 0, city, 'opus')).toMatch(/building the Magnum Opus/);

    const far = getTileAt(g.state.map, city.col + 5, city.row)!;
    const opus = foundCityAt(g.state, 0, far)!;
    opus.queue = [{ kind: 'building', id: 'theMagnumOpus' }];
    bumpRevision(g.state);

    const [line] = levyOptions(g.state, 0, city);
    expect(line!.use).toBe('opus');
    expect(line!.targetCityId).toBe(opus.id);
    const hammers = growthThreshold(9);
    expect(line!.hammers).toBe(hammers);

    const own = city.hammerBasket;
    const sent = opus.hammerBasket;
    expect(levy(g, city, 'opus').ok).toBe(true);
    expect(opus.hammerBasket).toBe(sent + hammers);
    expect(city.hammerBasket).toBe(own);
    expect(city.population).toBe(9);
    // The Opus town cannot send to itself.
    opus.population = 12;
    expect(levyError(g.state, 0, opus, 'opus')).toMatch(/building the Magnum Opus/);
  });

  it('needs a town of at least ten citizens', () => {
    const { g, city } = bench(9);
    seat(g, 'theCorvee');
    expect(levyError(g.state, 0, city, 'opus')).toMatch(/at least 10 citizens/);
  });
});

describe('Seasonal Levies — what a levy leaves behind', () => {
  it('hangs +40% food for ten turns, at most once every twenty turns', () => {
    const { g, city } = bench(12);
    seat(g, 'levyOfTheLand');
    seat(g, 'seasonalLevies');
    const start = g.state.turn;
    expect(levy(g, city, 'production').ok).toBe(true);
    const hung = (city.timed ?? []).filter((entry) => entry.card === 'seasonalLevies');
    expect(hung).toHaveLength(1);
    expect(hung[0]!.expiresTurn).toBe(start + 10);
    expect(hung[0]!.effect).toEqual({ kind: 'percentYields', yield: 'food', percent: 40 });
    expect(city.levy?.after?.seasonalLevies).toBe(start);

    // A second levy inside twenty turns hangs nothing new.
    g.state.turn = start + EVERY;
    expect(levy(g, city, 'production').ok).toBe(true);
    expect((city.timed ?? []).filter((entry) => entry.card === 'seasonalLevies')).toHaveLength(1);

    // Twenty turns on, it hangs again.
    g.state.turn = start + 20;
    expect(levy(g, city, 'production').ok).toBe(true);
    expect((city.timed ?? []).filter((entry) => entry.card === 'seasonalLevies')).toHaveLength(2);
  });
});

describe('determinism', () => {
  it('reaches the same state from the same setup and the same commands', () => {
    const run = (): string => {
      const { g, city } = bench(10, 47);
      seat(g, 'levyOfTheLand');
      seat(g, 'theMusterOfTheFields');
      seat(g, 'seasonalLevies');
      const commands: Command[] = [
        { type: 'levyCitizen', playerId: 0, cityId: city.id, use: 'muster' },
        { type: 'endTurn', playerId: 0 },
        { type: 'endTurn', playerId: 1 },
        { type: 'levyCitizen', playerId: 0, cityId: city.id, use: 'production' },
      ];
      for (const command of commands) dispatch(g, command);
      return JSON.stringify(g.state);
    };
    expect(run()).toBe(run());
  });

  it('a unit raised by a levy is a real piece on the board', () => {
    const { g, city } = bench(6);
    seat(g, 'theMusterOfTheFields');
    expect(levy(g, city, 'muster').ok).toBe(true);
    const raised = g.state.units[g.state.units.length - 1]!;
    expect(unitById(g.state, raised.id)).toBe(raised);
  });
});
