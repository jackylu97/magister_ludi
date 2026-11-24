import { expect, it } from 'vitest';
import rules from '../../data/wagerMilestones.json';
import spec from '../../docs/plans/wager-spec-2026-11-22.md?raw';
import { WAGER_METRICS, wagerMetricText, type WagerMetric } from '../../src/sim/wagerMilestoneData';

const names: Record<Exclude<WagerMetric, 'score'>, string> = {
  sixYields: 'The sum of your six yields',
  scienceCulture: 'Science and culture gained',
  faithGold: 'Faith and gold gained (gross, not net of spending)',
  purchases: 'Gold and faith spent',
  population: 'Total population',
  cityProduction: 'The highest production of one city',
  buildings: 'Buildings finished',
  improvements: 'Improved hexes',
  luxuries: 'Different luxuries held',
  routeYields: 'The yields of your trade routes',
  peopleYields: 'The yields from your great people (their hexes and legacies)',
  armyStrength: 'The total combat strength of your army (the same reading as the score line)',
};
const groups: Record<keyof typeof rules.groups, string> = {
  engine: 'Engine', cities: 'Cities', land: 'Land', peopleAndArms: 'People and arms',
};

it('lists each dealt wager in the same group in the spec and the data', () => {
  const section = spec.split('## 4. The dealt wagers')[1]?.split('\n## ')[0] ?? '';
  const rows = section.split('\n')
    .filter((line) => line.startsWith('|') && !line.startsWith('|---') && !line.startsWith('| Group |'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
  const expected = Object.entries(rules.groups).flatMap(([group, metrics]) =>
    metrics.map((metric) => [
      groups[group as keyof typeof groups],
      names[metric as keyof typeof names],
      ['scienceCulture', 'faithGold', 'purchases', 'buildings'].includes(metric) ? 'Over the age' : 'Now',
    ]));
  expect(rows).toHaveLength(12);
  expect(rows.sort()).toEqual(expected.sort());
});

it('gives score and every dealt wager a player-facing name and description', () => {
  expect(Object.keys(rules.metrics).sort()).toEqual([...WAGER_METRICS].sort());
  const labels = WAGER_METRICS.map((metric) => {
    const { name, description } = wagerMetricText(metric);
    expect(name.trim().length, metric).toBeGreaterThan(0);
    expect(description.trim().length, metric).toBeGreaterThan(0);
    expect(name, metric).not.toBe(metric);
    return name;
  });
  expect(new Set(labels).size).toBe(WAGER_METRICS.length);
});
