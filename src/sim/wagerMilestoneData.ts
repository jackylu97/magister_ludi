import table from '../../data/wagerMilestones.json';
import type { GameState } from './state';

export const WAGER_GROUPS = table.groups;
export const MILESTONE_RULES = table;
export type WagerMetric = 'score' | 'sixYields' | 'scienceCulture' | 'faithGold' | 'purchases' |
  'population' | 'cityProduction' | 'buildings' | 'improvements' | 'luxuries' | 'routeYields' |
  'peopleYields' | 'armyStrength';
export function wagerMetricText(metric: WagerMetric): Readonly<{ name: string; description: string }> {
  return table.metrics[metric];
}

export type WagerMark = 0 | 1 | 2;
export type WagerMarks = [number, number, number];
export type WagerAge = 1 | 2 | 3 | 4;
export interface WagerCalibration {
  weights: { perDefeat: number; perArmyStrength: number };
  marks: { 1: { score: WagerMarks } } & Record<2 | 3 | 4, Record<WagerMetric, WagerMarks>>;
}
export type WagerSetup = { mode: 'measure' } | { mode: 'calibrated'; calibration: WagerCalibration; humanMarksPercent?: number };
export const WAGER_METRICS = ['score', ...Object.values(table.groups).flat()] as WagerMetric[];

export interface WagerAgeSeat {
  playerId: number;
  scienceCulture: number;
  faithGold: number;
  purchases: number;
  buildings: number;
  opening?: Record<WagerMetric, number>;
  closing?: { readings: Record<WagerMetric, number>; army: number; defeats: number; scoreLines: { label: string; count: number; value: number }[] };
  reached: { mark: WagerMark; turn: number }[];
  pick?: { metric: WagerMetric; mark: WagerMark };
}
export interface WagerAgeRecord {
  age: WagerAge;
  opened: number;
  dealt: WagerMetric[];
  seats: WagerAgeSeat[];
  closed?: number;
}
export interface WagerBook {
  setup: WagerSetup;
  ages: WagerAgeRecord[];
}
export function wagerSetupCopy(setup: WagerSetup): WagerSetup {
  if (setup?.mode === 'measure') return { mode: 'measure' };
  if (setup?.mode !== 'calibrated' || !setup.calibration) throw new Error('Wager calibration is required.');
  if (setup.humanMarksPercent !== undefined && (!Number.isFinite(setup.humanMarksPercent) || setup.humanMarksPercent < 0)) {
    throw new Error('The candidate difficulty percentage must be finite and nonnegative.');
  }
  const { weights, marks } = setup.calibration;
  if (!weights || ![weights.perDefeat, weights.perArmyStrength].every((n) => Number.isFinite(n) && n >= 0)) {
    throw new Error('Both wager score weights must be finite and nonnegative.');
  }
  const copy = {} as WagerCalibration['marks'];
  for (const age of [1, 2, 3, 4] as const) {
    const clean = {} as Record<WagerMetric, WagerMarks>;
    const rows = marks?.[age] as Partial<Record<WagerMetric, WagerMarks>> | undefined;
    for (const metric of age === 1 ? ['score'] as const : WAGER_METRICS) {
      const m = rows?.[metric];
      if (!Array.isArray(m) || m.length !== 3 || ![m[0], m[1], m[2]].every((n) => Number.isFinite(n) && n > 0) || m[0] >= m[1] || m[1] >= m[2]) {
        throw new Error(`Invalid wager marks for age ${age}, ${metric}.`);
      }
      clean[metric] = [m[0], m[1], m[2]];
    }
    copy[age] = clean;
  }
  return {
    mode: 'calibrated',
    calibration: { marks: copy, weights: { perDefeat: weights.perDefeat, perArmyStrength: weights.perArmyStrength } },
    ...(setup.humanMarksPercent === undefined ? {} : { humanMarksPercent: setup.humanMarksPercent }),
  };
}
/** A save uses the same field checks as a new game. */
export function isWagerSetup(value: unknown): value is WagerSetup {
  try {
    wagerSetupCopy(value as WagerSetup);
    return true;
  } catch {
    return false;
  }
}

export function currentWagerAge(state: GameState): WagerAgeRecord | undefined {
  const ages = state.wagerBook?.ages;
  return ages?.[ages.length - 1];
}
export function currentWagerSeat(state: GameState, playerId: number): WagerAgeSeat | undefined {
  return currentWagerAge(state)?.seats.find((seat) => seat.playerId === playerId);
}
/** Writers call this at the point of payment so switching production or spending income cannot erase it. */
export function addWagerCount(state: GameState, playerId: number, field: 'scienceCulture' | 'faithGold' | 'purchases' | 'buildings', amount: number): void {
  if (!state.wagerBook || amount === 0) return;
  const seat = currentWagerSeat(state, playerId);
  if (seat && currentWagerAge(state)?.closed === undefined) seat[field] += amount;
}
/** Record an income payment once, even when the caller settles the bank immediately. */
export function wagerIncome(state: GameState, playerId: number, field: 'scienceCulture' | 'faithGold', amount: number): number {
  if (amount > 0) addWagerCount(state, playerId, field, amount);
  return amount;
}
