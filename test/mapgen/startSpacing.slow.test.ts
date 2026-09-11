/**
 * **Slow tier** — how far apart the game actually seats people, measured.
 *
 * The M2 verification (`docs/flags.md` (rrrr), the user: *"another leader
 * spawned 8 tiles from me — ideally we should have some distance between
 * players"*). The complaint was about a number nobody had ever printed, so the
 * first thing this does is print it: the **minimum pairwise distance** between
 * the six starts of a standard board, over twenty-four seeds, with the six
 * figures seated — which is the game the product is.
 *
 * Three claims come off that sweep, and they are the three halves of the ruling:
 *
 *   1. **the floor holds** — no seed seats two capitals closer than
 *      `starts.minDistance`, on every board that can seat six at the floor at
 *      all. That last clause is not a hedge and is not judged by eye: the
 *      chooser itself says so, by returning an empty `shortfall`. A board it
 *      could not seat comes back with a row per let-down seat, and the sweep
 *      asserts on the rows rather than on a guess about which boards are
 *      crowded;
 *   2. **the wants still work** — the M1 criteria, the same list
 *      (`./leaderCriteria`), at the rates M1 measured or the sweep says by how
 *      much they fell. They *are* expected to fall a little: M1's ladder pulled
 *      the spacing down to keep a want and M2's drops the want to keep the
 *      spacing, which is the trade the ruling asked for;
 *   3. **Akhenaten stands in the sand** — the (uuuu) add-on. His arid-neighbour
 *      count is printed per seed and pinned wherever the board has such a site
 *      going at all.
 *
 * Slow by kind: twenty-four standard boards, generated once each.
 */

import { describe, expect, it } from 'vitest';

import { LEADER_IDS, leaderDef, startBiasOf } from '../../src/sim/leaderData';
import { tileHex, wrappedDistance } from '../../src/sim/map';
import type { GameMap, Tile } from '../../src/sim/map';
import { generateMap } from '../../src/sim/mapgen';
import { MAPGEN_CONFIG } from '../../src/sim/mapgenData';
import {
  type StartSeat,
  landmassFacts,
  planStartPositionsFor,
  scoreStartSite,
  siteMeetsWants,
  startSpacing,
  strategicGround,
} from '../../src/sim/startPositions';
import { CRITERIA, RATES, aridNeighbours } from './leaderCriteria';

const SEEDS = 24;
const SIZE = 'standard';
const STARTS = MAPGEN_CONFIG.starts;


/** The six figures, one a seat, in sheet order — the product's own roster. */
const SEATS: StartSeat[] = LEADER_IDS.map((leader) => ({ leader }));

/** The closest two starts on this board. The one figure the ruling is about. */
function minPairwise(map: GameMap, starts: readonly Tile[]): number {
  let min = Infinity;
  for (let a = 0; a < starts.length; a++) {
    for (let b = a + 1; b < starts.length; b++) {
      min = Math.min(min, wrappedDistance(map, tileHex(starts[a]!), tileHex(starts[b]!)));
    }
  }
  return min;
}

describe('how far apart the game seats people', () => {
  it('holds the floor on every board that can seat six at it, and says so when it cannot', () => {
    const mins: number[] = [];
    const shortfalls: string[] = [];
    const held = CRITERIA.map(() => 0);
    const arid: number[] = [];
    const aridGoing: boolean[] = [];
    const aridReachable: boolean[] = [];

    for (let seed = 1; seed <= SEEDS; seed++) {
      const map = generateMap(seed, SIZE, undefined, SEATS);
      const plan = planStartPositionsFor(map, SEATS);
      expect(plan.starts).toHaveLength(SEATS.length);
      mins.push(minPairwise(map, plan.starts));
      for (const row of plan.shortfall) {
        shortfalls.push(`seed ${seed} seat ${row.seat}: ${row.distance} of ${row.wanted}`);
      }

      for (let seat = 0; seat < SEATS.length; seat++) {
        const leader = SEATS[seat]!.leader!;
        for (let index = 0; index < CRITERIA.length; index++) {
          const criterion = CRITERIA[index]!;
          if (criterion.leader !== leader) continue;
          if (criterion.holds(map, plan.starts[seat]!)) held[index]! += 1;
        }
      }

      // The (uuuu) figure: how much sand Akhenaten is actually standing in, and
      // whether the board had anywhere better going. "Going" is the whole of
      // what he asked for — three arid neighbours *and* the water beside them —
      // asked of the sites the chooser stands behind, because a want is a filter
      // over exactly those and a hex the scorer refuses was never on offer.
      const seat = LEADER_IDS.indexOf('akhenaten');
      arid.push(aridNeighbours(map, plan.starts[seat]!));
      const landmass = landmassFacts(map);
      const arms = strategicGround(map);
      const asks = startBiasOf('akhenaten')!.wants!;
      const spacing = startSpacing(map);
      const answering = map.tiles.filter(
        (tile) =>
          siteMeetsWants(map, tile, asks) &&
          scoreStartSite(map, tile, undefined, landmass, arms).reject === null,
      );
      aridGoing.push(answering.length > 0);
      // …and of those, the ones the board could still have given him: free, and
      // the spacing away from every other chair. A site the ground grew and the
      // spacing spent is not a site he went without.
      aridReachable.push(
        answering.some((tile) =>
          plan.starts.every(
            (other, index) =>
              index === seat || wrappedDistance(map, tileHex(tile), tileHex(other)) >= spacing,
          ),
        ),
      );
    }

    const sorted = [...mins].sort((a, b) => a - b);
    const lines = [
      `minimum pairwise start distance · ${SEEDS} seeds · ${SIZE} · ${SEATS.length} figures`,
      `  spacing ${startSpacing(generateMap(1, SIZE))} · floor ${STARTS.minDistance} · ceiling ${STARTS.maxDistance}`,
      `  min ${sorted[0]} · median ${sorted[Math.floor(SEEDS / 2)]} · mean ${(
        mins.reduce((sum, m) => sum + m, 0) / SEEDS
      ).toFixed(1)}`,
      `  under ${STARTS.minDistance}: ${mins.filter((m) => m < STARTS.minDistance).length}` +
        ` · under 12: ${mins.filter((m) => m < 12).length}` +
        ` · under 15: ${mins.filter((m) => m < 15).length}`,
      `  per seed: ${mins.join(' ')}`,
      `  seats the board let down: ${shortfalls.length === 0 ? 'none' : shortfalls.join('; ')}`,
      `  Akhenaten's arid neighbours: ${arid.join(' ')}` +
        ` (a site answering him on ${aridGoing.filter(Boolean).length} of ${SEEDS} boards,` +
        ` still free at the spacing on ${aridReachable.filter(Boolean).length})`,
      `  the wants, held out of ${SEEDS}:`,
    ];
    for (let index = 0; index < CRITERIA.length; index++) {
      const criterion = CRITERIA[index]!;
      const rate = RATES[`${criterion.leader} · ${criterion.label}`];
      lines.push(
        `    ${leaderDef(criterion.leader).name.padEnd(14)} ${criterion.label.padEnd(30)}` +
          ` M1 ${String(rate?.m1 ?? '—').padStart(2)} → M2 ${String(held[index]).padStart(2)} of ${SEEDS}`,
      );
    }
    console.log(lines.join('\n'));

    // 1 · the floor. A board the chooser could seat reports no shortfall, and
    // one it could not reports a row per seat — so the claim is written against
    // the rows rather than against a guess at which boards are crowded. Both
    // halves are asserted: the rows are empty, *and* the distances agree with
    // them, which is what makes the shortfall list a reading of the board rather
    // than a hopeful flag.
    expect(`let down: ${shortfalls.join('; ')}`).toBe('let down: ');
    expect(`under the floor: ${mins.filter((m) => m < STARTS.minDistance).length}`).toBe(
      'under the floor: 0',
    );

    // 2 · the wants, **at the rate M2 delivers and against the rate M1 did**.
    // Two of them fell, and the fall is the ruling working rather than the
    // ruling breaking: M1 pulled the spacing down a hex at a time to keep a
    // want, so a river was always found and a rival was sometimes eight hexes
    // off; M2 keeps the twenty and lets the sixth chair go without. `RATES`
    // carries both columns so the cost is in the file and not only in a report.
    for (let index = 0; index < CRITERIA.length; index++) {
      const criterion = CRITERIA[index]!;
      const rate = RATES[`${criterion.leader} · ${criterion.label}`];
      expect(`${criterion.leader} · ${criterion.label} · rated`).toBe(
        rate === undefined
          ? `${criterion.leader} · ${criterion.label} · unrated`
          : `${criterion.leader} · ${criterion.label} · rated`,
      );
      expect(`${criterion.leader} · ${criterion.label} · ${held[index]} of ${SEEDS}`).toBe(
        `${criterion.leader} · ${criterion.label} · ${Math.max(held[index]!, rate!.m2)} of ${SEEDS}`,
      );
    }

    // 3 · the sand (uuuu). Where the board still had a site answering what
    // Akhenaten asked for — the three arid neighbours *and* the water, free and
    // far enough from every other chair — he is standing on one. Where it did
    // not, he is not, and that is the fallback doing what the ruling says it
    // should. The count of boards that had one is printed above: on this sheet a
    // standard board grows the ground on most of them and the spacing then
    // spends it, which is the trade and is worth seeing.
    for (let seed = 1; seed <= SEEDS; seed++) {
      if (!aridReachable[seed - 1]) continue;
      expect(`seed ${seed}: Akhenaten has ${arid[seed - 1]} arid neighbours`).toBe(
        `seed ${seed}: Akhenaten has ${Math.max(arid[seed - 1]!, 3)} arid neighbours`,
      );
    }
  }, 600_000);

  it('drops a want rather than a hex: every seated want was one the board still had', () => {
    // The ladder's own claim, swept (`docs/flags.md` (rrrr)). A figure that went
    // without what it asked for went without because nothing free, accepted and
    // far enough away answered — never because the sweep preferred a closer hex
    // that did.
    for (let seed = 1; seed <= 8; seed++) {
      const map = generateMap(seed, SIZE, undefined, SEATS);
      const plan = planStartPositionsFor(map, SEATS);
      const spacing = startSpacing(map);
      const landmass = landmassFacts(map);
      const arms = strategicGround(map);
      for (let seat = 0; seat < SEATS.length; seat++) {
        const wants = startBiasOf(SEATS[seat]!.leader)?.wants;
        if (wants === undefined) continue;
        if (siteMeetsWants(map, plan.starts[seat]!, wants)) continue;
        const going = map.tiles.filter(
          (tile) =>
            siteMeetsWants(map, tile, wants) &&
            scoreStartSite(map, tile, undefined, landmass, arms).reject === null &&
            plan.starts.every(
              (other, index) =>
                index === seat || wrappedDistance(map, tileHex(tile), tileHex(other)) >= spacing,
            ),
        );
        expect(`seed ${seed} · ${SEATS[seat]!.leader} · ${going.length} it could have had`).toBe(
          `seed ${seed} · ${SEATS[seat]!.leader} · 0 it could have had`,
        );
      }
    }
  }, 600_000);
});
