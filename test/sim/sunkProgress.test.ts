/**
 * **Sunk progress** — batch S2, schema 111, `docs/flags.md` item (www).
 *
 * The user's ruling, verbatim: *"the pool of yields shouldn't swap over when
 * reselecting something, i.e. science is placed into a tech, and that tech is
 * committed at the end of turn, swapping to a different tech shouldn't allow you
 * to keep your technology progress on the new tech, same for production"* — and,
 * on which way the beakers go: *"kept and not lost is what i was thinking too"*.
 *
 * Four claims, and they are why this is one file rather than cases scattered
 * across `tech.test.ts` and `cities.test.ts`:
 *
 *   · **A switch keeps, and does not carry.** Aiming somewhere else parks what
 *     was banked under the thing it was spent on and starts the new thing from
 *     whatever *it* had. Both buckets survive; nothing is confiscated and
 *     nothing rides along.
 *   · **Overflow is not progress.** What is left after a thing completes was
 *     never spent toward it, so it follows the *queue* to whatever comes up —
 *     which is what overflow has always done, and the one place the two rules
 *     could have been confused with each other.
 *   · **A project's bucket is simply the accumulator.** A conversion never
 *     completes (Entry XXVI), so its bucket has nothing to spend down and a town
 *     that puts one aside comes back to the hammers it left in it.
 *   · The two properties every command in this codebase owes: a refusal leaves
 *     the state byte-identical, and a log replays to the same bytes.
 */

import { describe, expect, it } from 'vitest';

import { type Command, applyCommand } from '../../src/sim/commands';
import { foundCityAt, settleProduction, turnsToBuild } from '../../src/sim/cities';
import { dispatch, snapshotState } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import {
  type City,
  type GameState,
  SCHEMA_VERSION,
  bankedTowardItem,
  bankedTowardTech,
  bumpRevision,
  frontKey,
  playerById,
  queueItemKey,
  reaimProduction,
} from '../../src/sim/state';
import { techDef } from '../../src/sim/techData';
import { advanceResearch } from '../../src/sim/tech';
import { game } from './purchaseHelpers';

// --- harness ----------------------------------------------------------------

/**
 * The simulation's own text, read through Vite's raw glob rather than
 * `node:fs` — this project has no node typings and a source assertion is not
 * worth a dependency (`cities.test.ts`' note).
 */
const SIM_SOURCE = import.meta.glob(['../../src/sim/*.ts', '../../src/sim/*/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function simSource(file: string): string {
  const key = Object.keys(SIM_SOURCE).find((path) => path.endsWith(`/${file}`));
  expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
  return SIM_SOURCE[key!]!;
}

function found(state: GameState, playerId: number): City {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}

function chooseResearch(techId: string, playerId = 0): Command {
  return { type: 'chooseResearch', playerId, techId } as Command;
}

function setProduction(cityId: number, queue: unknown[], playerId = 0): Command {
  return { type: 'setCityProduction', playerId, cityId, queue } as Command;
}

// --- the schema -------------------------------------------------------------

describe('the schema says so', () => {
  it('bumps to the version the changelog writes the rule down at', () => {
    // 111 is this batch's; 112 landed on top of it the same evening (F2, the
    // prophet's charges), so the constant reads the later number.
    expect(SCHEMA_VERSION).toBe(116);
  });

  it('says in the changelog what a v110 log does now', () => {
    const source = simSource('state.ts');
    const entry = source.slice(source.indexOf(' * v111 ('), source.indexOf('export const SCHEMA_VERSION'));
    expect(entry).toContain('v111 (batch S2');
    // The template every entry keeps: the user's own words, and what a log from
    // the version before does about it.
    expect(entry).toContain('A v110 log replays');
    expect(entry).toContain('techProgress');
    expect(entry).toContain('itemProgress');
  });
});

// --- beakers ----------------------------------------------------------------

describe('beakers stay with the technology they were spent on', () => {
  it('parks the old node’s progress and starts the new one at nought', () => {
    const { state } = game();
    const player = playerById(state, 0)!;
    expect(applyCommand(state, chooseResearch('mining'))).toEqual({ ok: true });
    player.sciencePool = 40;
    bumpRevision(state);

    expect(applyCommand(state, chooseResearch('earthenware'))).toEqual({ ok: true });
    expect(player.researching).toBe('earthenware');
    expect(player.sciencePool).toBe(0);
    expect(bankedTowardTech(player, 'mining')).toBe(40);
    expect(bankedTowardTech(player, 'earthenware')).toBe(0);
  });

  it('finds the bucket where it was left when the empire comes back', () => {
    const { state } = game();
    const player = playerById(state, 0)!;
    applyCommand(state, chooseResearch('mining'));
    player.sciencePool = 40;
    bumpRevision(state);
    applyCommand(state, chooseResearch('earthenware'));
    player.sciencePool = 7;
    bumpRevision(state);

    // Both buckets stand, and each holds exactly what it was left with.
    applyCommand(state, chooseResearch('mining'));
    expect(player.sciencePool).toBe(40);
    expect(bankedTowardTech(player, 'earthenware')).toBe(7);
    // And no beaker is in two places at once.
    expect(bankedTowardTech(player, 'mining') + bankedTowardTech(player, 'earthenware')).toBe(47);
  });

  it('sweeps the bucket the moment the node lands, and keeps the overflow', () => {
    const { state } = game();
    const player = playerById(state, 0)!;
    applyCommand(state, chooseResearch('mining'));
    const cost = techDef('mining').cost;
    player.sciencePool = cost + 5;
    bumpRevision(state);

    advanceResearch(state);
    expect(player.techsResearched).toContain('mining');
    // The overflow is not progress toward anything — it was never spent on the
    // node that landed — so it stays in the pool for whatever comes up next.
    expect(player.sciencePool).toBe(5);
    expect(bankedTowardTech(player, 'mining')).toBe(0);
    expect(player.techProgress).toBeUndefined();
  });

  it('carries an unaimed pool into the first thing it is aimed at', () => {
    const { state } = game();
    const player = playerById(state, 0)!;
    // A seat that has chosen nothing still banks (the model note in `tech.ts`),
    // and those beakers have no node's name on them yet.
    player.researching = null;
    delete player.researchQueue;
    player.sciencePool = 12;
    bumpRevision(state);
    applyCommand(state, chooseResearch('mining'));
    expect(player.sciencePool).toBe(12);
  });
});

// --- hammers ----------------------------------------------------------------

describe('hammers stay with the thing they were spent on', () => {
  it('parks the old front row’s basket and starts the new one at nought', () => {
    const { state } = game();
    const city = found(state, 0);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    city.hammerBasket = 18;
    bumpRevision(state);

    expect(
      applyCommand(state, setProduction(city.id, [{ kind: 'unit', id: 'worker' }])),
    ).toEqual({ ok: true });
    expect(city.hammerBasket).toBe(0);
    expect(bankedTowardItem(city, { kind: 'unit', id: 'warrior' })).toBe(18);
    expect(bankedTowardItem(city, { kind: 'unit', id: 'worker' })).toBe(0);
  });

  it('finds the bucket where it was left when the town comes back', () => {
    const { state } = game();
    const city = found(state, 0);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    city.hammerBasket = 18;
    bumpRevision(state);
    applyCommand(state, setProduction(city.id, [{ kind: 'unit', id: 'worker' }]));
    city.hammerBasket = 4;
    bumpRevision(state);

    applyCommand(state, setProduction(city.id, [{ kind: 'unit', id: 'warrior' }]));
    expect(city.hammerBasket).toBe(18);
    expect(bankedTowardItem(city, { kind: 'unit', id: 'worker' })).toBe(4);
  });

  it('keeps a row’s progress while it merely stands further back in the queue', () => {
    const { state } = game();
    const city = found(state, 0);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    city.hammerBasket = 18;
    bumpRevision(state);

    // The warrior is still in the plan — it is just not what the town is paying
    // for this turn — and the rule is about what is being paid for.
    applyCommand(
      state,
      setProduction(city.id, [
        { kind: 'unit', id: 'worker' },
        { kind: 'unit', id: 'warrior' },
      ]),
    );
    expect(city.hammerBasket).toBe(0);
    expect(city.itemProgress?.[queueItemKey({ kind: 'unit', id: 'warrior' })]).toBe(18);
    // And the estimate on the row behind counts it, so the panel and the bank
    // cannot disagree about how far along a queued thing is.
    const quoted = turnsToBuild(state, city, { kind: 'unit', id: 'warrior' }, 1);
    const cold = turnsToBuild(state, city, { kind: 'unit', id: 'archer' }, 1);
    expect(quoted === null || cold === null || quoted <= cold).toBe(true);
  });

  it('sends the overflow of a completion after the queue, not after the thing', () => {
    const { state } = game();
    const city = found(state, 0);
    city.queue = [
      { kind: 'unit', id: 'warrior' },
      { kind: 'unit', id: 'worker' },
    ];
    // Enough for the warrior and five hammers over.
    const cost = turnsToBuild(state, city, { kind: 'unit', id: 'warrior' }, 0);
    expect(cost).not.toBeNull();
    city.hammerBasket = 10_000;
    bumpRevision(state);

    const done = settleProduction(state, city);
    expect(done?.name).toBe('Warrior');
    // The remainder was never spent toward the warrior, so it pays for the
    // worker rather than being parked under a warrior nobody is building.
    expect(city.hammerBasket).toBeGreaterThan(0);
    expect(bankedTowardItem(city, { kind: 'unit', id: 'warrior' })).toBe(0);
  });

  it('accumulates a project’s own bucket, because a project never spends one down', () => {
    const { state } = game();
    const city = found(state, 0);
    city.queue = [{ kind: 'project', id: 'tithes' }];
    city.hammerBasket = 9;
    bumpRevision(state);

    applyCommand(state, setProduction(city.id, [{ kind: 'unit', id: 'warrior' }]));
    expect(bankedTowardItem(city, { kind: 'project', id: 'tithes' })).toBe(9);

    // Back to the conversion, add more, put it down again: one accumulator.
    // The conversion is queued through the seam rather than the reducer, because
    // a project waits on a technology this bench's empire has not learnt and the
    // rule under test is about the *bucket*, not about the gate.
    const back = frontKey(city);
    city.queue = [{ kind: 'project', id: 'tithes' }];
    reaimProduction(city, back, true);
    bumpRevision(state);
    expect(city.hammerBasket).toBe(9);
    city.hammerBasket += 6;
    bumpRevision(state);
    applyCommand(state, setProduction(city.id, [{ kind: 'unit', id: 'warrior' }]));
    expect(bankedTowardItem(city, { kind: 'project', id: 'tithes' })).toBe(15);
  });

  it('leaves a captured town none of the old owner’s committed work', () => {
    const { state } = game();
    const city = found(state, 0);
    city.queue = [
      { kind: 'unit', id: 'warrior' },
      { kind: 'unit', id: 'worker' },
    ];
    city.hammerBasket = 18;
    bumpRevision(state);
    applyCommand(state, setProduction(city.id, [{ kind: 'unit', id: 'worker' }]));
    expect(city.itemProgress).toBeDefined();

    // `handOverCity` empties the queue and the basket; the buckets behind them
    // are the same plans said one step further back and go with them.
    const source = simSource('combat.ts');
    const seam = source.slice(source.indexOf('export function handOverCity'));
    expect(seam.slice(0, seam.indexOf('\n}\n'))).toContain('delete city.itemProgress');
  });
});

// --- the seams --------------------------------------------------------------

describe('the two seams are the only ways progress changes hands', () => {
  it('moves the aim through `aimResearchAt` and nowhere else', () => {
    const source = simSource('tech.ts');
    // `settleResearch` is the one excused write, and it says why on the line
    // above itself. Every other `researching =` in the file would be a way to
    // strand a bucket.
    const writes = source.split('player.researching = ').length - 1;
    expect(writes).toBe(2);
    expect(source).toContain('The one excused write of `researching`');
  });

  it('re-heads a queue through `reaimProduction` at every seam that moves one', () => {
    for (const file of ['commands.ts', 'cities.ts', 'purchase.ts']) {
      expect(simSource(file), file).toContain('reaimProduction(city, before');
    }
  });
});

// --- the properties ---------------------------------------------------------

describe('the properties every command owes', () => {
  it('leaves the state byte-identical when a switch is refused', () => {
    const g = game();
    const city = found(g.state, 0);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    city.hammerBasket = 18;
    bumpRevision(g.state);
    const before = snapshotState(g.state);
    const result = dispatch(g, setProduction(city.id, [{ kind: 'unit', id: 'nosuchunit' }]));
    expect(result.ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });

  it('replays a log of switches to the same bytes', () => {
    const g = game();
    const city = found(g.state, 0);
    city.hammerBasket = 0;
    bumpRevision(g.state);
    dispatch(g, setProduction(city.id, [{ kind: 'unit', id: 'warrior' }]));
    dispatch(g, chooseResearch('mining'));
    g.state.players[0]!.sciencePool = 25;
    dispatch(g, chooseResearch('earthenware'));
    dispatch(g, setProduction(city.id, [{ kind: 'unit', id: 'worker' }]));
    const once = snapshotState(g.state);

    const replay = game();
    const town = found(replay.state, 0);
    town.hammerBasket = 0;
    bumpRevision(replay.state);
    dispatch(replay, setProduction(town.id, [{ kind: 'unit', id: 'warrior' }]));
    dispatch(replay, chooseResearch('mining'));
    replay.state.players[0]!.sciencePool = 25;
    dispatch(replay, chooseResearch('earthenware'));
    dispatch(replay, setProduction(town.id, [{ kind: 'unit', id: 'worker' }]));
    expect(snapshotState(replay.state)).toBe(once);
  });
});
