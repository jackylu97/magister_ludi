/**
 * The leaders' three stages, as rules rather than as measurements.
 *
 * The sweep that says whether a bias *works* is `test/stress/leaderStarts.slow.test.ts`
 * — a share of seeds is a slow question. What is core is the pair of promises
 * underneath it: the world a roster makes is a pure function of that roster
 * (rule 2), and **a roster with no figures in it makes the world it always
 * made** — the one claim that lets a bias ship without every seed of every
 * fixture moving.
 */

import { describe, expect, it } from 'vitest';

import { improvementForResource } from '../../src/sim/improvementData';
import { furnishMatches } from '../../src/sim/leaderData';
import {
  LEADER_IDS,
  type LeaderId,
  leaderDef,
  startBiasOf,
  wantCount,
} from '../../src/sim/leaderData';
import { mapRange, tileHex, tileIndex } from '../../src/sim/map';
import { generateMap } from '../../src/sim/mapgen';
import { MAPGEN_CONFIG } from '../../src/sim/mapgenData';
import { type GameConfig, type PlayerSpec, newGame, normalizeConfig } from '../../src/sim/state';
import {
  type StartSeat,
  chooseStartPositions,
  chooseStartPositionsFor,
  scoreStartSite,
  siteMeetsWants,
  startBiasCap,
} from '../../src/sim/startPositions';

const SEATS: StartSeat[] = LEADER_IDS.map((leader) => ({ leader }));

/** Every field of every tile, as one string. The whole map, compared. */
function fingerprint(map: { tiles: readonly unknown[] }): string {
  return JSON.stringify(map.tiles);
}

function seatSpecs(leaders: readonly (string | undefined)[]): PlayerSpec[] {
  return leaders.map((leader, index) => ({
    name: `Seat ${index + 1}`,
    color: '#888888',
    ...(leader === undefined ? {} : { leader: leader as LeaderId }),
  }));
}

function configOf(leaders: readonly (string | undefined)[]): GameConfig {
  return { seed: 11, sizeName: 'standard', players: seatSpecs(leaders) };
}

describe('the leaders', () => {
  it('carries a bias the sheet can state', () => {
    expect(LEADER_IDS.length).toBeGreaterThan(0);
    for (const id of LEADER_IDS) {
      const def = leaderDef(id);
      expect(def.name.length).toBeGreaterThan(0);
      // A row with no bias at all would be a figure the generator cannot honour
      // — the one half of a leader that is built.
      expect(`${id} biases something`).toBe(
        startBiasOf(id) !== undefined ? `${id} biases something` : `${id} biases nothing`,
      );
    }
  });
});

describe('a roster with no figures in it', () => {
  it('generates the map it always generated, tile for tile', () => {
    for (const seed of [7, 31]) {
      const before = generateMap(seed, 'standard');
      const after = generateMap(seed, 'standard', undefined, [{}, {}, {}, {}, {}, {}]);
      expect(fingerprint(after)).toBe(fingerprint(before));
    }
  });

  it('seats every chair exactly where the unbiased chooser does', () => {
    const map = generateMap(7, 'standard');
    const plain = chooseStartPositions(map, 6).map((tile) => tileIndex(map, tile.col, tile.row));
    const seated = chooseStartPositionsFor(map, [{}, {}, {}, {}, {}, {}]).map((tile) =>
      tileIndex(map, tile.col, tile.row),
    );
    expect(seated).toEqual(plain);
  });
});

describe('a roster with figures in it', () => {
  it('is a pure function of the roster: the same seats twice, the same world', () => {
    const first = generateMap(11, 'standard', undefined, SEATS);
    const second = generateMap(11, 'standard', undefined, SEATS);
    expect(fingerprint(second)).toBe(fingerprint(first));
    const a = chooseStartPositionsFor(first, SEATS).map((tile) => tileIndex(first, tile.col, tile.row));
    const b = chooseStartPositionsFor(second, SEATS).map((tile) => tileIndex(second, tile.col, tile.row));
    expect(b).toEqual(a);
  });

  it('moves the world, so the figures are doing something at all', () => {
    const plain = generateMap(11, 'standard');
    const biased = generateMap(11, 'standard', undefined, SEATS);
    expect(fingerprint(biased)).not.toBe(fingerprint(plain));
  });

  it('seats every chair, and no two on one hex', () => {
    const map = generateMap(11, 'standard', undefined, SEATS);
    const seated = chooseStartPositionsFor(map, SEATS);
    expect(seated).toHaveLength(SEATS.length);
    const at = seated.map((tile) => tileIndex(map, tile.col, tile.row));
    expect(new Set(at).size).toBe(at.length);
  });

  it('scores a seat with labelled bias lines whose fold is the total (rule 5)', () => {
    const map = generateMap(11, 'standard', undefined, SEATS);
    const seated = chooseStartPositionsFor(map, SEATS);
    const cap = startBiasCap(map);
    const bias = startBiasOf(SEATS[0]!.leader)!;
    const scored = scoreStartSite(map, seated[0]!, undefined, undefined, undefined, { bias, cap });
    const lines = scored.entries.filter((entry) => entry.bias === true);
    expect(lines.length).toBeGreaterThan(0);
    let fold = 0;
    for (const entry of scored.entries) fold += entry.value;
    expect(fold).toBeCloseTo(scored.total, 9);
    // And the figure's whole pull stays under the map's ceiling.
    let biased = 0;
    for (const entry of lines) biased += entry.value;
    expect(Math.abs(biased)).toBeLessThanOrEqual(cap);
  });

  it('gives every figure that carries wants a site that answers them', () => {
    const map = generateMap(11, 'standard', undefined, SEATS);
    const seated = chooseStartPositionsFor(map, SEATS);
    for (let seat = 0; seat < SEATS.length; seat++) {
      const wants = startBiasOf(SEATS[seat]!.leader)?.wants;
      if (wants === undefined) continue;
      // The fallback is lawful — a map with none of this going seats the figure
      // anyway — so this is a claim about *this* map, which has plenty.
      expect(`${SEATS[seat]!.leader}: ${siteMeetsWants(map, seated[seat]!, wants)}`).toBe(
        `${SEATS[seat]!.leader}: true`,
      );
    }
  });

  it('serves the seats with the most wants first, whatever the roster order', () => {
    // Pachacuti carries two wants and everybody else one, so he picks first —
    // even from the last chair. Without the ordering he would be choosing among
    // what five seats had left, and a mountain within two hexes is the rarest
    // thing any figure asks for.
    const last = [...LEADER_IDS.filter((id) => id !== 'pachacuti'), 'pachacuti' as LeaderId];
    const seats: StartSeat[] = last.map((leader) => ({ leader }));
    expect(wantCount(startBiasOf('pachacuti'))).toBeGreaterThan(
      wantCount(startBiasOf(last[0]!)),
    );
    const map = generateMap(11, 'standard', undefined, seats);
    const seated = chooseStartPositionsFor(map, seats);
    const wants = startBiasOf('pachacuti')!.wants!;
    expect(siteMeetsWants(map, seated[seats.length - 1]!, wants)).toBe(true);
  });

  it('treats a want as a filter and never as a refusal', () => {
    // Every chair still seated, none on top of another, with the wants on.
    const map = generateMap(3, 'standard', undefined, SEATS);
    const seated = chooseStartPositionsFor(map, SEATS);
    expect(seated).toHaveLength(SEATS.length);
    const at = seated.map((tile) => tileIndex(map, tile.col, tile.row));
    expect(new Set(at).size).toBe(at.length);
  });

  it('furnishes the figure that asks for kinds', () => {
    // Mithridates' first age pays on plantations and camps, so his start is
    // furnished with one of each inside `startFurnishRadius`.
    const seat = LEADER_IDS.indexOf('mithridates');
    const wanted = startBiasOf('mithridates')!.furnish!;
    const radius = MAPGEN_CONFIG.resources.startFurnishRadius;
    const map = generateMap(11, 'standard', undefined, SEATS);
    const start = chooseStartPositionsFor(map, SEATS)[seat]!;
    const near = mapRange(map, tileHex(start), radius);
    for (const kind of wanted) {
      const found = near.some(
        (tile) => tile.resource !== undefined && improvementForResource(tile.resource) === kind,
      );
      expect(`${kind} within ${radius}: ${found}`).toBe(`${kind} within ${radius}: true`);
    }

    // And the entry that names a **row** rather than a kind: Modu's horses,
    // which `pasture` would have answered with cattle.
    const steppe = LEADER_IDS.indexOf('modu');
    const herd = chooseStartPositionsFor(map, SEATS)[steppe]!;
    for (const entry of startBiasOf('modu')!.furnish ?? []) {
      const found = mapRange(map, tileHex(herd), radius).some(
        (tile) => tile.resource !== undefined && furnishMatches(entry, tile.resource),
      );
      expect(`${entry} within ${radius}: ${found}`).toBe(`${entry} within ${radius}: true`);
    }
  });
});

describe('a leader in the game config', () => {
  it('seats the roster on the sites its own biases chose', () => {
    const state = newGame(configOf(LEADER_IDS.slice(0, 4)));
    const seats = LEADER_IDS.slice(0, 4).map((leader) => ({ leader }));
    const expected = chooseStartPositionsFor(state.map, seats).map((tile) =>
      tileIndex(state.map, tile.col, tile.row),
    );
    // One settler a seat, standing on its own start.
    for (let seat = 0; seat < 4; seat++) {
      const own = state.units.filter((unit) => unit.ownerId === seat);
      expect(own.length).toBeGreaterThan(0);
      expect(own.some((unit) => tileIndex(state.map, unit.col, unit.row) === expected[seat])).toBe(
        true,
      );
    }
  });

  it('refuses a figure the sheet does not carry', () => {
    expect(() => newGame(configOf(['nobody', undefined]))).toThrow(/leader/i);
  });

  it('normalises to no key at all when nobody is seated, and to the id when one is', () => {
    // `charge`'s and `persona`'s rule: written only when it is named, so a
    // roster from before figures existed normalises byte-identically.
    const bare = normalizeConfig(configOf([undefined, undefined]));
    expect(Object.keys(bare.players[0]!)).not.toContain('leader');
    const seated = normalizeConfig(configOf([LEADER_IDS[0], undefined]));
    expect(seated.players[0]!.leader).toBe(LEADER_IDS[0]);
    expect(Object.keys(seated.players[1]!)).not.toContain('leader');
  });
});
