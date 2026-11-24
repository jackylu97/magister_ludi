import { describe, expect, it } from 'vitest';
import { empiricalMarks, fitCalibration, heldOutReach, type Sample } from '../../scripts/wagerCalibrationAnalysis';
import { play } from '../../scripts/wagerCalibrationGame';
import { WAGER_METRICS, wagerSetupCopy, type WagerMetric } from '../../src/sim/wagerMilestoneData';

function samples(options: { noAgeTwoBuildings?: boolean } = {}): Sample[] {
  return ([1, 2, 3, 4] as const).flatMap((age) => Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const readings = Object.fromEntries(WAGER_METRICS.map((metric) => [metric, n])) as Record<WagerMetric, number>;
    return { seed: n, seat: 0, sizeName: 'duel', seatCount: 2, age, opened: 1, closed: 20, ending: 'age' as const,
      opening: undefined, closing: { readings: options.noAgeTwoBuildings && age === 2 ? { ...readings, buildings: 0 } : readings, army: n * 4, defeats: n * 2, scoreLines: [{ label: 'Citizens', count: n, value: n }] } };
  }));
}

describe('wager calibration', () => {
  it('reports an unfinished age for every seat at a one-turn measurement cap', () => {
    const board = { sizeName: 'duel', seatCount: 2 };
    const result = play({
      policy: { name: 'unit test' }, boards: [board], leaders: ['alexanderTheGreat', 'mansaMusa'],
      trainingSeeds: [5], heldOutSeeds: [13], turnLimit: 1,
    }, 5, board, 'measure', { mode: 'measure' });
    expect(result.finalTurn).toBe(2);
    expect(result.samples.map((s) => [s.seat, s.age, s.ending])).toEqual([[0, 1, 'turn limit'], [1, 1, 'turn limit']]);
    expect(result.samples.every((s) => s.closing === null && s.opening !== undefined)).toBe(true);
    expect(result.seats.every((s) => !s.enteredAgeIV)).toBe(true);
  });

  it('selects the highest observed mark reached by the target share, including ties', () => {
    const reach = empiricalMarks([1, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9])!;
    expect(reach.map((r) => r.mark)).toEqual([2, 4, 8]);
    expect(reach.map((r) => r.reached)).toEqual([9, 6, 2]);
    expect(empiricalMarks([3, 3, 3, 3])![2]?.fraction).toBe(1);
  });

  it('prices the two lines from the measured counts and reprices the score before setting marks', () => {
    const data = samples();
    const proposal = fitCalibration(data);
    expect(proposal.issues).toEqual([]);
    const calibration = proposal.calibration!;
    expect(calibration.weights).toEqual({ perDefeat: 0.5, perArmyStrength: 0.25 });
    expect(calibration.marks[1].score).toEqual([12, 21, 33]);
    expect(calibration.marks[2].population).toEqual([4, 7, 11]);
    expect(proposal.ages[0]!.scoreLines.map((line) => line.share)).toEqual([1 / 3, 1 / 3, 1 / 3]);
    expect(() => wagerSetupCopy({ mode: 'calibrated', calibration })).not.toThrow();
    // Held-out games use the score their calibrated rules already computed.
    const holdout = heldOutReach(data, calibration);
    expect(holdout[0]!.metrics[0]!.reach.map((r) => r.reached)).toEqual([1, 0, 0]);
  });

  it('keeps raw tied and zero marks for review and excludes ages cut short by the turn limit', () => {
    const data = samples({ noAgeTwoBuildings: true });
    const proposal = fitCalibration([...data, { ...data[0]!, ending: 'turn limit', closing: null, closed: null }]);
    expect(proposal.calibration).toBeNull();
    expect(proposal.issues).toContain('Zero, negative or coincident marks: age 2, buildings');
    expect(proposal.ages[1]?.metrics.find((m) => m.metric === 'buildings')?.reach?.map((r) => r.mark)).toEqual([0, 0, 0]);
    expect(proposal.ages[0]?.seats).toBe(12);
    expect(fitCalibration(data.filter((s) => s.age < 4)).issues).toContain('Missing age 4');
  });
});
