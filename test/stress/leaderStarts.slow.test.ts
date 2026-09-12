/**
 * The leaders' start biases, measured — the verification the three stages ship
 * with (`docs/flags.md` (cccc), `docs/leaders.md`).
 *
 * A bias is a *preference*, not a promise: it is a handful of score lines under
 * a cap, and the honest way to say whether it works is not "this seat has a
 * river" but **how much more often** a seat has one than the same seat would
 * have had with nobody sitting in it. So every criterion is measured twice over
 * the same seeds — an unbiased world seated unbiased, and a world with six
 * figures seated — and the table below is the difference.
 *
 * **Six chairs, a rotating cast** (L6a): the sheet carries thirteen figures and
 * a standard board seats six at the floor, so the sweep keeps the product's
 * table and rotates who is at it (`castFor`, `test/mapgen/leaderCriteria.ts`).
 * Every rate below is therefore a **share of the boards that figure sat at**,
 * never a count of seeds — a denominator of ten for most of them and of
 * twenty-four for the anchor.
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

import { tileHex, wrappedDistance } from '../../src/sim/map';
import { MAPGEN_CONFIG } from '../../src/sim/mapgenData';
import { generateMap } from '../../src/sim/mapgen';
import { LEADER_IDS, type LeaderId, leaderDef } from '../../src/sim/leaderData';
import {
  CAST_SIZE,
  CRITERIA,
  RATES,
  SWEEP_SEEDS,
  appearances,
  castFor,
  shareOf,
} from '../mapgen/leaderCriteria';
import {
  chooseStartPositions,
  chooseStartPositionsFor,
  landmassFacts,
  scoreStartSite,
  startBiasCap,
  strategicGround,
} from '../../src/sim/startPositions';

const SEEDS = SWEEP_SEEDS;
const SIZE = 'standard';

/**
 * The claims themselves — and the cast — live in
 * `test/mapgen/leaderCriteria.ts`, beside the M2 sweep that measures the same
 * list after the seating ladder changed (`docs/flags.md` (rrrr)). One list, two
 * questions: a criterion edited in one sweep and not the other would be two
 * measurements that look comparable and are not.
 */

/** A criterion's name in `RATES` — the key both sweeps print and pin against. */
function rowKey(leader: LeaderId, label: string): string {
  return `${leader} · ${label}`;
}

describe('the leaders" start biases', () => {
  it('gives every figure more of the ground it asks for, and pays under the cap', () => {
    const held = new Map<string, { plain: number; biased: number }>();
    for (const criterion of CRITERIA) held.set(rowKey(criterion.leader, criterion.label), { plain: 0, biased: 0 });
    // Per figure, not per chair: a figure sits in a different seat on every
    // board it is at, so a per-seat total would be the average of whoever
    // happened to sit there.
    const score = new Map<LeaderId, { plain: number; biased: number }>(
      LEADER_IDS.map((id) => [id, { plain: 0, biased: 0 }]),
    );
    const seated = appearances(SEEDS);
    let caps = 0;

    for (let seed = 1; seed <= SEEDS; seed++) {
      // Two worlds of one seed: nobody seated, and this seed's cast seated.
      const cast = castFor(seed);
      const plainMap = generateMap(seed, SIZE);
      const plainStarts = chooseStartPositions(plainMap, cast.length);
      const biasedMap = generateMap(seed, SIZE, undefined, cast);
      const biasedStarts = chooseStartPositionsFor(biasedMap, cast);
      expect(biasedStarts).toHaveLength(cast.length);

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

      for (let seat = 0; seat < cast.length; seat++) {
        const leader = cast[seat]!.leader!;
        for (const criterion of CRITERIA) {
          if (criterion.leader !== leader) continue;
          const row = held.get(rowKey(criterion.leader, criterion.label))!;
          if (criterion.holds(plainMap, plainStarts[seat]!)) row.plain += 1;
          if (criterion.holds(biasedMap, biasedStarts[seat]!)) row.biased += 1;
        }
        // The price, read in the *unbiased* scorer's own terms on both sides —
        // what the site is worth to anybody, not what it is worth to its figure.
        score.get(leader)!.plain += scoreStartSite(
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
        score.get(leader)!.biased += biasedReading.total;
      }
    }

    const lines = [
      `leader start biases · ${SEEDS} seeds · ${SIZE} · casts of ${CAST_SIZE} from ${LEADER_IDS.length} figures`,
    ];
    for (const criterion of CRITERIA) {
      const row = held.get(rowKey(criterion.leader, criterion.label))!;
      const at = seated.get(criterion.leader)!;
      lines.push(
        `  ${leaderDef(criterion.leader).name.padEnd(20)} ${criterion.label.padEnd(28)} ` +
          `unbiased ${`${shareOf(row.plain, at)}%`.padStart(4)} →` +
          ` biased ${`${shareOf(row.biased, at)}%`.padStart(4)} (of ${at} boards)`,
      );
    }
    const meanCap = caps / SEEDS;
    lines.push(`  mean site score (the unbiased reading), cap ${meanCap.toFixed(1)}`);
    for (const id of LEADER_IDS) {
      const at = seated.get(id)!;
      const row = score.get(id)!;
      lines.push(
        `  ${leaderDef(id).name.padEnd(20)} ` +
          `before ${(row.plain / at).toFixed(1).padStart(6)} → ` +
          `after ${(row.biased / at).toFixed(1).padStart(6)}`,
      );
    }
    console.log(lines.join('\n'));

    // **The whole board of criteria improves**, and that is the assertion that
    // matters: the figures between them find the ground they ask for far more
    // often than the same number of empty chairs would have. A sum of counts
    // rather than of shares, because both sides share a denominator here —
    // every row is the same set of boards measured twice.
    let plainHeld = 0;
    let biasedHeld = 0;
    for (const row of held.values()) {
      plainHeld += row.plain;
      biasedHeld += row.biased;
    }
    let seatings = 0;
    for (const criterion of CRITERIA) seatings += seated.get(criterion.leader)!;
    expect(`held ${biasedHeld} of ${seatings}`).toBe(`held ${Math.max(biasedHeld, plainHeld)} of ${seatings}`);

    // Every criterion is held at the rate the sheet **measures today**, and that
    // rate lives beside the criteria (`RATES`, `test/mapgen/leaderCriteria.ts`)
    // with the rate it had before M2 next to it.
    //
    // It used to be a flat share for the backed rows — a need is a need, held on
    // all but a seed or two — and M2 retired that shape rather than loosened it
    // (`docs/flags.md` (rrrr)). The seating ladder now drops a want before it
    // drops a hex of distance, so a chair served late genuinely goes without,
    // and "nearly always" stopped being true of two of these rows. A floor that
    // was still nearly-always would have had to be lowered to the worst row and
    // would then have measured nothing about the rest; a table of the real
    // numbers holds every row to what it actually delivers and shows what M2
    // cost in the same glance. The rate is a share of the boards the figure sat
    // at, since L6a made that a different number per figure.
    for (const criterion of CRITERIA) {
      const key = rowKey(criterion.leader, criterion.label);
      const row = held.get(key)!;
      const rate = RATES[key];
      expect(`${key} · rated`).toBe(rate === undefined ? `${key} · unrated` : `${key} · rated`);
      const at = seated.get(criterion.leader)!;
      expect(`${criterion.leader} sat at ${at} boards`).toBe(
        `${criterion.leader} sat at ${Math.max(at, 1)} boards`,
      );
      const share = shareOf(row.biased, at);
      expect(`${key} · ${share}%`).toBe(`${key} · ${Math.max(share, rate!.m2)}%`);
    }

    // And the price stays inside the cap: a figure may trade a share of a site's
    // quality for the ground it wants, and no more than that share. Averaged
    // over the boards that figure actually sat at, which is what makes the two
    // columns the same seeds read twice.
    for (const id of LEADER_IDS) {
      const at = seated.get(id)!;
      const before = score.get(id)!.plain / at;
      const after = score.get(id)!.biased / at;
      expect(`${id} paid ${(before - after).toFixed(1)}`).toBe(
        `${id} paid ${Math.min(before - after, meanCap).toFixed(1)}`,
      );
    }
  }, 240_000);
});
