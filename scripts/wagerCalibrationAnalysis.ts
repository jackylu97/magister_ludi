import { militaryScoreLines } from '../src/sim/score';
import { WAGER_METRICS, type WagerAge, type WagerAgeSeat, type WagerCalibration, type WagerMarks, type WagerMetric } from '../src/sim/wagerMilestoneData';

export type Closing = NonNullable<WagerAgeSeat['closing']>;
export interface Sample {
  seed: number;
  seat: number;
  seatCount: number;
  sizeName: string;
  age: WagerAge;
  opened: number;
  closed: number | null;
  ending: 'age' | 'victory' | 'turn limit';
  opening: WagerAgeSeat['opening'];
  closing: Closing | null;
}

const ages = [1, 2, 3, 4] as const;
const targets = [3 / 4, 1 / 2, 1 / 6] as const;
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

function byAge(samples: Sample[], age: WagerAge): Closing[] {
  return samples.flatMap((s) => s.age === age && s.closing ? [s.closing] : []);
}

/** Show the actual fraction meeting a mark, including everyone tied at its value. */
export function reachAt(values: number[], mark: number) {
  const reached = values.filter((v) => v >= mark).length;
  return { mark, reached, seats: values.length, fraction: values.length ? reached / values.length : null };
}

export function empiricalMarks(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => b - a);
  return targets.map((target) => ({ target, ...reachAt(values, sorted[Math.ceil(target * sorted.length) - 1]!) }));
}

function scoreMeans(rows: Closing[], weights?: WagerCalibration['weights']) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const lines = weights ? [...row.scoreLines, ...militaryScoreLines(row.defeats, row.army, weights)] : row.scoreLines;
    for (const line of lines) totals.set(line.label, (totals.get(line.label) ?? 0) + line.value);
  }
  const total = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals].map(([label, points]) => ({ label, meanPoints: points / rows.length, share: total ? points / total : null }));
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[Math.floor((sorted.length - 1) / 2)]! + sorted[Math.floor(sorted.length / 2)]!) / 2;
}

export function fitCalibration(samples: Sample[]) {
  const issues: string[] = [];
  const stats = ages.map((age) => {
    const rows = byAge(samples, age);
    if (!rows.length) issues.push('Missing age ' + age);
    const positive = scoreMeans(rows).map((line) => line.meanPoints).filter((v) => v > 0);
    if (!positive.length) issues.push('No positive score line in age ' + age);
    return { age, rows, anchor: positive.length ? median(positive) : 0 };
  });
  // Give each age equal weight. Price each new line at the typical positive
  // existing line, then show the shares after the score sheet rounds it.
  const reference = mean(stats.map((s) => s.anchor));
  const count = (key: 'army' | 'defeats') => mean(stats.map((s) => s.rows.length ? mean(s.rows.map((r) => r[key])) : 0));
  const defeats = count('defeats'), army = count('army');
  if (!defeats || !army) issues.push('Both military readings need nonzero observations');
  const weights = issues.length ? null : { perDefeat: reference / defeats, perArmyStrength: reference / army };
  const marks = {} as WagerCalibration['marks'];
  const report = stats.map(({ age, rows, anchor }) => {
    const ageMarks = {} as Record<WagerMetric, WagerMarks>;
    const metrics = (age === 1 ? ['score'] as const : WAGER_METRICS).map((metric) => {
      const values = metric === 'score' && !weights ? [] : rows.map((row) =>
        row.readings[metric] + (metric === 'score' && weights
          ? militaryScoreLines(row.defeats, row.army, weights).reduce((sum, line) => sum + line.value, 0) : 0));
      const reach = empiricalMarks(values);
      if (reach) {
        const [low, middle, high] = reach.map((r) => r.mark) as WagerMarks;
        ageMarks[metric] = [low, middle, high];
        if (low <= 0 || low >= middle || middle >= high) issues.push('Zero, negative or coincident marks: age ' + age + ', ' + metric);
      }
      return { metric, reach };
    });
    marks[age] = ageMarks;
    return { age, seats: rows.length, anchor, scoreLines: scoreMeans(rows, weights ?? undefined), metrics };
  });
  return { weights, ages: report, issues, calibration: weights && !issues.length ? { weights, marks } : null };
}

export function heldOutReach(samples: Sample[], calibration: WagerCalibration) {
  return ages.map((age) => {
    const rows = byAge(samples, age);
    const metrics = (age === 1 ? ['score'] as const : WAGER_METRICS).map((metric) => {
      const marks = age === 1 ? calibration.marks[1].score : calibration.marks[age][metric];
      const values = rows.map((row) => row.readings[metric]);
      return { metric, reach: marks.map((mark) => reachAt(values, mark)) };
    });
    return { age, seats: rows.length, metrics, scoreLines: scoreMeans(rows) };
  });
}
