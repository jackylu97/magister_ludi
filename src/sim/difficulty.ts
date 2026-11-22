import tiers from '../../data/difficulty.json';
import type { GameState, Player } from './state';

export const DIFFICULTY_RULES = tiers;
export const MAX_DIFFICULTY_TIER = Math.max(...Object.values(tiers).map(rule => rule.tier));

export function isDifficultyTier(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_DIFFICULTY_TIER;
}

/** A tier includes every earlier rule. A missing tier keeps existing saves at the normal settings. */
function active<K extends keyof typeof tiers>(state: GameState, key: K): (typeof tiers)[K] | undefined {
  if (state.tier === undefined) return undefined;
  const rule = tiers[key];
  return state.tier >= rule.tier ? rule : undefined;
}

/** The configured seats determine the sides even when a spectator watches a computer seat. */
export function difficultyStrength(state: GameState, playerId: number): number {
  const rule = active(state, 'strength');
  const player = state.players[playerId];
  return rule && player && !player.isHuman ? rule.points : 0;
}

export function rivalGrowthAndProduction(state: GameState, playerId: number): number {
  const rule = active(state, 'rivalGrowthAndProduction');
  const player = state.players[playerId];
  return rule && player && !player.isHuman && !player.barbarian ? rule.percent : 0;
}

export function ageCampBandSize(state: GameState): number {
  return active(state, 'campWave')?.unitsPerCamp ?? 0;
}

export function difficultyBuildCost(state: GameState, playerId: number): number {
  return state.players[playerId]?.isHuman ? active(state, 'humanBuildCost')?.percent ?? 0 : 0;
}

export function humanOrderRarity(state: GameState, player: Player) {
  return player.isHuman ? active(state, 'humanOrderRarity')?.weights : undefined;
}
