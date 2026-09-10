/**
 * The leaders' start biases, measured — the verification the three stages ship
 * with (`docs/flags.md` (cccc), `docs/leaders.md`).
 *
 * A bias is a *preference*, not a promise: it is a handful of score lines under
 * a cap, and the honest way to say whether it works is not "this seat has a
 * river" but **how much more often** a seat has one than the same seat would
 * have had with nobody sitting in it. So every criterion is measured twice over
 * the same seeds — an unbiased world seated unbiased, and a world with the six
 * figures seated — and the table below is the difference.
 *
 * The second half of the measurement is the price. A bias that bought a river by
 * seating an empire on tundra would show a perfect river column and a ruined
 * game, so the seats' **unbiased** site scores are averaged before and after: a
 * figure may trade at most `starts.biasCap` of a site's quality for the ground
 * it wants, and the assertion is that it did not trade more.
 *
 * Since M1b the sheet may **back** a claim with a hard want (`startBias.wants`,
 * a filter over the sites the chooser already accepts) or with a furnishing. A
 * backed claim is asserted at a floor rather than merely "no worse than an empty
 * chair": a need the map can answer is answered.
 *
 * Slow by kind: twenty-four seeds, each generated twice.
 */

import { describe, expect, it } from 'vitest';

import { mapRange, tileHex, wrappedDistance } from '../../src/sim/map';
import { MAPGEN_CONFIG } from '../../src/sim/mapgenData';
import type { GameMap, Tile } from '../../src/sim/map';
import { generateMap } from '../../src/sim/mapgen';
import { LEADER_IDS, type LeaderId, leaderDef } from '../../src/sim/leaderData';
import { improvementForResource } from '../../src/sim/improvementData';
import { resourceDef, tileSuitsResource } from '../../src/sim/resourceData';
import {
  type StartSeat,
  chooseStartPositions,
  chooseStartPositionsFor,
  landmassFacts,
  scoreStartSite,
  startBiasCap,
  strategicGround,
} from '../../src/sim/startPositions';

const SEEDS = 24;
const SIZE = 'standard';

/** Hexes within `radius` of a start, the start itself included. */
function near(map: GameMap, start: Tile, radius: number): Tile[] {
  return mapRange(map, tileHex(start), radius);
}

function hasRiver(map: GameMap, start: Tile, radius: number): boolean {
  return near(map, start, radius).some((tile) => tile.riverEdges !== 0);
}

function countTerrain(map: GameMap, start: Tile, radius: number, what: (tile: Tile) => boolean): number {
  return near(map, start, radius).filter(what).length;
}

/** A hex a pasture could ever stand on — the ground Modu's herds need. */
function pastureGround(tile: Tile): boolean {
  return ['horses', 'cattle', 'bison'].some((id) =>
    tileSuitsResource(tile, resourceDef(id as never)),
  );
}

/** Is a resource opened by this improvement kind standing in reach? */
function hasKind(map: GameMap, start: Tile, radius: number, kind: string): boolean {
  return near(map, start, radius).some(
    (tile) => tile.resource !== undefined && improvementForResource(tile.resource) === kind,
  );
}

/** One measurable claim about a seat's ground. */
interface Criterion {
  leader: LeaderId;
  label: string;
  /**
   * True when the row's own sheet **backs** this claim with a hard want
   * (`startBias.wants`) or a furnishing — the two halves of M1b. A backed claim
   * is held on all but a seed or two and is asserted at `BACKED`; an unbacked
   * one rides the soft score alone and is only asked to improve.
   */
  backed?: true;
  holds(map: GameMap, start: Tile): boolean;
}

const CRITERIA: Criterion[] = [
  {
    leader: 'pachacuti',
    label: 'a mountain within 2',
    backed: true,
    holds: (map, start) => countTerrain(map, start, 2, (tile) => tile.terrain === 'mountain') > 0,
  },
  {
    leader: 'pachacuti',
    label: 'three hills within 2',
    holds: (map, start) => countTerrain(map, start, 2, (tile) => tile.hills) >= 3,
  },
  {
    leader: 'pachacuti',
    label: 'a river within 1',
    backed: true,
    holds: (map, start) => hasRiver(map, start, 1),
  },
  {
    leader: 'taizong',
    label: 'grassland within 2',
    backed: true,
    holds: (map, start) => countTerrain(map, start, 2, (tile) => tile.terrain === 'grassland') > 0,
  },
  {
    leader: 'modu',
    label: 'horses within 4',
    backed: true,
    holds: (map, start) => near(map, start, 4).some((tile) => tile.resource === 'horses'),
  },
  {
    leader: 'modu',
    label: 'two pasture hexes within 3',
    holds: (map, start) => countTerrain(map, start, 3, pastureGround) >= 2,
  },
  {
    leader: 'akhenaten',
    label: 'river or floodplain within 1',
    backed: true,
    holds: (map, start) =>
      hasRiver(map, start, 1) ||
      countTerrain(map, start, 1, (tile) => tile.feature === 'floodplain') > 0,
  },
  {
    leader: 'almamun',
    label: 'a river within 2',
    backed: true,
    holds: (map, start) => hasRiver(map, start, 2),
  },
  {
    leader: 'mithridates',
    label: 'a river within 2',
    backed: true,
    holds: (map, start) => hasRiver(map, start, 2),
  },
  {
    leader: 'mithridates',
    label: 'a camp kind within 3',
    backed: true,
    holds: (map, start) => hasKind(map, start, 3, 'camp'),
  },
  {
    leader: 'mithridates',
    label: 'a plantation kind within 3',
    backed: true,
    holds: (map, start) => hasKind(map, start, 3, 'plantation'),
  },
];

/** The six figures, one a seat, in sheet order. */
const SEATS: StartSeat[] = LEADER_IDS.map((leader) => ({ leader }));

describe('the leaders" start biases', () => {
  it('gives every figure more of the ground it asks for, and pays under the cap', () => {
    const held = new Map<string, { plain: number; biased: number }>();
    for (const criterion of CRITERIA) held.set(criterion.label + '|' + criterion.leader, { plain: 0, biased: 0 });
    const score = SEATS.map(() => ({ plain: 0, biased: 0 }));
    let caps = 0;

    for (let seed = 1; seed <= SEEDS; seed++) {
      // Two worlds of one seed: nobody seated, and the six seated.
      const plainMap = generateMap(seed, SIZE);
      const plainStarts = chooseStartPositions(plainMap, SEATS.length);
      const biasedMap = generateMap(seed, SIZE, undefined, SEATS);
      const biasedStarts = chooseStartPositionsFor(biasedMap, SEATS);
      expect(biasedStarts).toHaveLength(SEATS.length);

      // The cap this map holds every figure under: a share of its best
      // *unbiased* site, asked of the chooser's own arithmetic.
      caps += startBiasCap(plainMap);

      // One walk of the land per map for the seat readings below: the scorer
      // would otherwise redo the landmass components and the strategic dilation
      // once per seat.
      const plainFacts = { land: landmassFacts(plainMap), arms: strategicGround(plainMap) };
      const biasedFacts = { land: landmassFacts(biasedMap), arms: strategicGround(biasedMap) };

      // **The roster still seats legally**, which is the claim a bias must not
      // cost — the existing seed sweeps make it of an unbiased roster and this
      // is the same claim with the figures on: every seat on a site the chooser
      // stands behind, and no two closer than the map's own floor.
      for (let a = 0; a < biasedStarts.length; a++) {
        for (let b = a + 1; b < biasedStarts.length; b++) {
          const apart = wrappedDistance(
            biasedMap,
            tileHex(biasedStarts[a]!),
            tileHex(biasedStarts[b]!),
          );
          expect(`seed ${seed}: seats ${a} and ${b} are ${apart} apart`).toBe(
            `seed ${seed}: seats ${a} and ${b} are ${Math.max(apart, MAPGEN_CONFIG.starts.minDistance)} apart`,
          );
        }
      }

      for (let seat = 0; seat < SEATS.length; seat++) {
        const leader = SEATS[seat]!.leader!;
        for (const criterion of CRITERIA) {
          if (criterion.leader !== leader) continue;
          const row = held.get(criterion.label + '|' + criterion.leader)!;
          if (criterion.holds(plainMap, plainStarts[seat]!)) row.plain += 1;
          if (criterion.holds(biasedMap, biasedStarts[seat]!)) row.biased += 1;
        }
        // The price, read in the *unbiased* scorer's own terms on both sides —
        // what the site is worth to anybody, not what it is worth to its figure.
        score[seat]!.plain += scoreStartSite(
          plainMap,
          plainStarts[seat]!,
          undefined,
          plainFacts.land,
          plainFacts.arms,
        ).total;
        const biasedReading = scoreStartSite(
          biasedMap,
          biasedStarts[seat]!,
          undefined,
          biasedFacts.land,
          biasedFacts.arms,
        );
        expect(`seed ${seed}: seat ${seat} is on ${biasedReading.reject ?? 'a site the chooser accepts'}`).toBe(
          `seed ${seed}: seat ${seat} is on a site the chooser accepts`,
        );
        score[seat]!.biased += biasedReading.total;
      }
    }

    const share = (n: number): string => `${((100 * n) / SEEDS).toFixed(0)}%`;
    const lines = [`leader start biases · ${SEEDS} seeds · ${SIZE} · ${SEATS.length} seats`];
    for (const criterion of CRITERIA) {
      const row = held.get(criterion.label + '|' + criterion.leader)!;
      lines.push(
        `  ${leaderDef(criterion.leader).name.padEnd(16)} ${criterion.label.padEnd(28)} ` +
          `unbiased ${share(row.plain).padStart(4)} → biased ${share(row.biased).padStart(4)}`,
      );
    }
    const meanCap = caps / SEEDS;
    lines.push(`  mean site score (the unbiased reading), cap ${meanCap.toFixed(1)}`);
    for (let seat = 0; seat < SEATS.length; seat++) {
      lines.push(
        `  ${leaderDef(SEATS[seat]!.leader!).name.padEnd(16)} ` +
          `before ${(score[seat]!.plain / SEEDS).toFixed(1).padStart(6)} → ` +
          `after ${(score[seat]!.biased / SEEDS).toFixed(1).padStart(6)}`,
      );
    }
    console.log(lines.join('\n'));

    // **The whole board of criteria improves**, and that is the assertion that
    // matters: the six figures between them find the ground they ask for far
    // more often than six empty chairs would have.
    let plainHeld = 0;
    let biasedHeld = 0;
    for (const row of held.values()) {
      plainHeld += row.plain;
      biasedHeld += row.biased;
    }
    expect(`held ${biasedHeld} of ${CRITERIA.length * SEEDS}`).toBe(
      `held ${Math.max(biasedHeld, plainHeld)} of ${CRITERIA.length * SEEDS}`,
    );

    // A criterion the sheet **backs** — with a hard want, or with a furnishing —
    // is a need, and a need is held on nearly every seed: the seat takes the
    // best accepted site that answers it, and only a map with no such site going
    // anywhere it may sit falls through to the soft score. `BACKED` is where
    // that floor sits.
    //
    // A criterion nothing backs rides the capped score alone, and the capped
    // score was measured to move the odds by a handful of points, not to
    // deliver. Those are asked only to hold up — **loosely**, because the
    // seating is a queue: a chair with fewer wants picks later, and a criterion
    // an unseated seat happened to hold on every seed has nowhere to go but
    // sideways. `SLACK` is the width of that, in seeds.
    const BACKED = 0.95;
    const SLACK = 3;
    for (const criterion of CRITERIA) {
      const row = held.get(criterion.label + '|' + criterion.leader)!;
      const floor = criterion.backed
        ? Math.ceil(BACKED * SEEDS)
        : Math.max(row.biased, row.plain - SLACK);
      expect(`${criterion.leader} · ${criterion.label} · ${row.biased} of ${SEEDS}`).toBe(
        `${criterion.leader} · ${criterion.label} · ${Math.max(row.biased, floor)} of ${SEEDS}`,
      );
    }

    // And the price stays inside the cap: a figure may trade a share of a site's
    // quality for the ground it wants, and no more than that share.
    for (let seat = 0; seat < SEATS.length; seat++) {
      const before = score[seat]!.plain / SEEDS;
      const after = score[seat]!.biased / SEEDS;
      expect(`${LEADER_IDS[seat]} paid ${(before - after).toFixed(1)}`).toBe(
        `${LEADER_IDS[seat]} paid ${Math.min(before - after, meanCap).toFixed(1)}`,
      );
    }
  }, 240_000);
});
