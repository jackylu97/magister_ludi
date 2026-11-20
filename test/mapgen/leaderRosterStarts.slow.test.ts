import { expect, it } from 'vitest';
import mapgenDoc from '../../docs/mapgen.md?raw';
import { LEADER_IDS, leaderDef } from '../../src/sim/leaderData';
import { generateMap } from '../../src/sim/mapgen';
import { planStartPositionsFor, siteMeetsWants } from '../../src/sim/startPositions';
import { CAST_SIZE, SWEEP_SEEDS, castFor } from './leaderCriteria';

it('seats the current roster and records how often each leader gets their preferred ground', () => {
  const seen = new Map(LEADER_IDS.map((id) => [id, { games: 0, preferred: 0 }]));
  for (let seed = 1; seed <= SWEEP_SEEDS; seed++) {
    const cast = castFor(seed);
    const map = generateMap(seed, 'standard', undefined, cast);
    const plan = planStartPositionsFor(map, cast);
    expect(cast).toHaveLength(CAST_SIZE);
    expect(plan.shortfall).toHaveLength(0);
    expect(plan.starts).toHaveLength(cast.length);
    cast.forEach((seat, i) => {
      const id = seat.leader!;
      const counts = seen.get(id)!;
      counts.games += 1;
      const wants = leaderDef(id).startBias.wants;
      if (!wants || siteMeetsWants(map, plan.starts[i]!, wants)) counts.preferred += 1;
    });
  }
  const table = mapgenDoc.split('## Starting ground for the current leaders')[1]!.split('## ')[0]!;
  const expectedRows = [];
  for (const [id, counts] of seen) {
    const leader = leaderDef(id);
    expect(counts.games, id).toBe(SWEEP_SEEDS * CAST_SIZE / LEADER_IDS.length);
    if (leader.startBias.wants) expectedRows.push(`| ${leader.name} | ${counts.preferred} of ${counts.games} |`);
  }
  expect(table.split('\n').filter((line) => /^\|.* of \d+ \|$/.test(line))).toEqual(expectedRows);
}, 120_000);
