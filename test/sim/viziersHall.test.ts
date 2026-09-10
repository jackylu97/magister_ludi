/**
 * **The Vizier's Hall**, and the charter that opens it — batch S2,
 * `docs/flags.md` item (www).
 *
 * The user's ruling, verbatim: *"the queue can never hold fewer than two items,
 * purchases are allowed, but production is already sunk into the current queue
 * per turn, and the queue cannot go below two items"*; and, on the name,
 * *"lets do the viziers hall"*.
 *
 * The office keeps the town's works list. Three claims, and each is a different
 * ledger, which is why they are one file rather than three paragraphs elsewhere:
 *
 *   · **The bonus is a scope, not a special case.** Half again as many hammers
 *     while the town has two or more rows lined up, expressed as an ordinary
 *     `percentYields` under an ordinary `CityScope` — so it lands in
 *     `cityYieldPercents` at the city stage like every other percentage, on and
 *     off with the queue's own depth, and in the town that holds the Hall alone.
 *   · **The floor is a marker, not a name.** `BuildingDef.queueFloor` is read in
 *     one place (`cityQueueFloor`) and the reducer, the purchase gate and the
 *     city panel all say the same sentence — nothing in `src/sim/` compares a
 *     building id against a string.
 *   · **The bot obeys the law it cannot see.** A town holding the Hall is
 *     answered with a works list rather than a single row, so the driver never
 *     sends a command the reducer would refuse.
 */

import { describe, expect, it } from 'vitest';

import { nextBotCommand } from '../../src/ai/bot';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { cityQueueFloor, queueFloorRefusal } from '../../src/sim/buildingEffects';
import { foundCityAt } from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { dispatch, snapshotState } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import { purchaseError } from '../../src/sim/purchase';
import { type City, type GameState, bumpRevision, playerById } from '../../src/sim/state';
import { type OrderId, orderDef } from '../../src/sim/statecraftData';
import { isUnlocked } from '../../src/sim/tech';
import { cityYieldPercents } from '../../src/sim/yields/town';
import { game } from './purchaseHelpers';

// --- the bench --------------------------------------------------------------

/**
 * The row and the card, found by their **marker** rather than by name wherever
 * the test can — the floor is a `queueFloor` row, and the charter is whichever
 * Order unlocks it.
 */
const HALL = BUILDING_IDS.find((id) => (buildingDef(id).queueFloor ?? 0) > 0)!;

const SIM_SOURCE = import.meta.glob(['../../src/sim/*.ts', '../../src/sim/*/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function found(state: GameState, playerId = 0): City {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}

/** Raises the office the way a completed queue row would leave it. */
function raise(state: GameState, city: City): void {
  city.buildings.push(HALL);
  bumpRevision(state);
}

function setProduction(cityId: number, queue: unknown[], playerId = 0): Command {
  return { type: 'setCityProduction', playerId, cityId, queue } as Command;
}

const TWO: unknown[] = [
  { kind: 'unit', id: 'warrior' },
  { kind: 'unit', id: 'worker' },
];

// --- the row and its charter ------------------------------------------------

describe('the office and the charter that opens it', () => {
  it('ships one row carrying the works-list marker, opened by one card', () => {
    expect(HALL).toBe('viziersHall');
    const def = buildingDef(HALL);
    expect(def.name).toBe("The Vizier's Hall");
    expect(def.queueFloor).toBe(2);
    expect(def.unlockedByCard).toBe(true);

    // The charter kept its id so a save naming it still loads, and wears the
    // ruled name over it.
    const charter = orderDef('toolmakersCharter' as OrderId);
    expect(charter.name).toBe('The Vizierate');
    expect(charter.retired).not.toBe(true);
    expect(
      charter.effects.some(
        (effect) => effect.kind === 'unlocksBuilding' && effect.building === HALL,
      ),
    ).toBe(true);
  });

  it('opens the row only while the charter stands in a slot', () => {
    const { state } = game();
    expect(isUnlocked(state, 0, 'building', HALL)).toBe(false);
    const sc = playerById(state, 0)!.statecraft;
    sc.orders.push('toolmakersCharter' as OrderId);
    sc.slots.push({ card: 'toolmakersCharter' as OrderId, sealedUntil: state.turn });
    bumpRevision(state);
    expect(isUnlocked(state, 0, 'building', HALL)).toBe(true);
  });

  it('reads the floor through one marker, and names no building in the sim', () => {
    // The reducer, the purchase gate and the panel all ask `cityQueueFloor`, and
    // nothing under `src/sim/` compares a building id against the row's name.
    for (const [path, source] of Object.entries(SIM_SOURCE)) {
      if (path.endsWith('/buildingData.ts')) continue;
      expect(source.includes("'viziersHall'"), path).toBe(false);
      expect(source.includes('"viziersHall"'), path).toBe(false);
    }
  });
});

// --- the bonus --------------------------------------------------------------

describe('half again as many hammers, while there is a works list', () => {
  function productionPercent(state: GameState, city: City): number {
    let total = 0;
    for (const line of cityYieldPercents(state, city)) {
      if (line.yield === 'production') total += line.percent;
    }
    return total;
  }

  it('pays while the queue holds two rows and nothing while it holds one', () => {
    const { state } = game();
    const city = found(state);
    const bare = productionPercent(state, city);
    raise(state, city);

    city.queue = [{ kind: 'unit', id: 'warrior' }];
    bumpRevision(state);
    expect(productionPercent(state, city)).toBe(bare);

    city.queue = [
      { kind: 'unit', id: 'warrior' },
      { kind: 'unit', id: 'worker' },
    ];
    bumpRevision(state);
    expect(productionPercent(state, city)).toBe(bare + 30);
  });

  it('pays the town that holds the office and no other town of the realm', () => {
    const { state } = game();
    const city = found(state);
    const other = foundCityAt(state, 0, getTileAt(state.map, city.col + 4, city.row)!);
    raise(state, city);
    for (const town of [city, other]) {
      town.queue = [
        { kind: 'unit', id: 'warrior' },
        { kind: 'unit', id: 'worker' },
      ];
    }
    bumpRevision(state);
    expect(productionPercent(state, city) - productionPercent(state, other)).toBe(30);
  });
});

// --- the floor --------------------------------------------------------------

describe('the works list may not be cut short', () => {
  it('refuses a queue that would leave a Vizier’s town with one row', () => {
    const g = game();
    const city = found(g.state);
    raise(g.state, city);
    dispatch(g, setProduction(city.id, TWO));
    expect(city.queue.length).toBe(2);

    const before = snapshotState(g.state);
    const result = dispatch(g, setProduction(city.id, [{ kind: 'unit', id: 'warrior' }]));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(queueFloorRefusal(city, 2));
    // A refused command leaves the state byte-identical.
    expect(snapshotState(g.state)).toBe(before);
  });

  it('takes the same queue in a town that keeps no works list', () => {
    const g = game();
    const city = found(g.state);
    dispatch(g, setProduction(city.id, TWO));
    expect(dispatch(g, setProduction(city.id, [{ kind: 'unit', id: 'warrior' }])).ok).toBe(true);
    expect(cityQueueFloor(city)).toBe(0);
  });

  it('takes a queue that does not shorten one already under the floor', () => {
    // The office can be come by with a short queue — the row finishes while one
    // thing stands behind it — and a law about what a town may be *left* with
    // must not be a trap that stops its work.
    const g = game();
    const city = found(g.state);
    raise(g.state, city);
    city.queue = [];
    bumpRevision(g.state);
    expect(dispatch(g, setProduction(city.id, [{ kind: 'unit', id: 'warrior' }])).ok).toBe(true);
  });

  it('is a rule about decisions, not about production', () => {
    // Nothing in the completion path asks the floor: a town whose queue fell to
    // one row still builds what it holds.
    const { state } = game();
    const city = found(state);
    raise(state, city);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    bumpRevision(state);
    expect(cityQueueFloor(city)).toBe(2);
    expect(city.queue.length).toBe(1);
  });
});

// --- purchases --------------------------------------------------------------

describe('a purchase is allowed, and the floor still holds', () => {
  it('refuses a buy that would take the queue under the floor', () => {
    const { state } = game();
    const city = found(state);
    raise(state, city);
    city.queue = [
      { kind: 'unit', id: 'warrior' },
      { kind: 'unit', id: 'worker' },
    ];
    playerById(state, 0)!.gold = 100_000;
    bumpRevision(state);
    // The row is in the queue and buying it would strike it off, leaving one.
    expect(purchaseError(state, 0, city.id, { kind: 'unit', id: 'warrior' }, 'gold')).toBe(
      queueFloorRefusal(city, 2),
    );
  });

  it('allows a buy of something the queue does not hold', () => {
    const { state } = game();
    const city = found(state);
    raise(state, city);
    city.queue = [
      { kind: 'unit', id: 'warrior' },
      { kind: 'unit', id: 'worker' },
    ];
    playerById(state, 0)!.gold = 100_000;
    bumpRevision(state);
    // Nothing leaves the queue, so the works list is untouched.
    expect(purchaseError(state, 0, city.id, { kind: 'unit', id: 'scout' }, 'gold')).toBeNull();
  });

  it('allows a buy out of a longer queue, because one still stands behind', () => {
    const { state } = game();
    const city = found(state);
    raise(state, city);
    city.queue = [
      { kind: 'unit', id: 'warrior' },
      { kind: 'unit', id: 'worker' },
      { kind: 'unit', id: 'scout' },
    ];
    playerById(state, 0)!.gold = 100_000;
    bumpRevision(state);
    expect(purchaseError(state, 0, city.id, { kind: 'unit', id: 'warrior' }, 'gold')).toBeNull();
  });
});

// --- the bot ----------------------------------------------------------------

describe('the driver keeps the works list', () => {
  it('answers a Vizier’s town with two rows, and the reducer takes them', () => {
    const { state } = game();
    const city = found(state, 1);
    raise(state, city);
    city.queue = [];
    bumpRevision(state);

    let sent: Command | null = null;
    for (let guard = 0; guard < 60; guard++) {
      const next = nextBotCommand(state, 1);
      if (!next) break;
      if (next.type === 'setCityProduction' && next.cityId === city.id) {
        sent = next;
        break;
      }
      if (!applyCommand(state, next).ok) break;
    }
    expect(sent).not.toBeNull();
    expect((sent as { queue: unknown[] }).queue.length).toBe(2);
    expect(applyCommand(state, sent!).ok).toBe(true);
  });

  it('answers an ordinary town with one row, exactly as it always has', () => {
    const { state } = game();
    const city = found(state, 1);
    city.queue = [];
    bumpRevision(state);

    let sent: Command | null = null;
    for (let guard = 0; guard < 60; guard++) {
      const next = nextBotCommand(state, 1);
      if (!next) break;
      if (next.type === 'setCityProduction' && next.cityId === city.id) {
        sent = next;
        break;
      }
      if (!applyCommand(state, next).ok) break;
    }
    expect(sent).not.toBeNull();
    expect((sent as { queue: unknown[] }).queue.length).toBe(1);
  });
});
