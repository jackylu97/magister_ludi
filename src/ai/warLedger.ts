/**
 * Recent losses to one opponent, used when deciding whether to make peace.
 *
 * Lifetime counters mix opponents and include some barbarian losses. The
 * simulation's war-loss records name who caused each loss, and survive saves
 * and worker copies. Read those records without keeping a second history.
 *
 * The simulation retains only the loss window. Start at the later of
 * that window and this war's declaration. Town counts describe capture events,
 * not current ownership; taking a third empire's city does not count here.
 */
import type { GameState, Player, WarLoss } from '../sim/state';
import { warBetween } from '../sim/wars';
import { lossTurnsCounted } from '../sim/warLosses';

interface WarExchange {
  /** Enemy units lost to this player, including captured civilians. */
  killed: number;
  /** This player's units lost to this enemy. */
  lost: number;
  /** Enemy towns captured by this player inside the window. */
  won: number;
  /** This player's towns captured by this enemy inside the window. */
  given: number;
  /** First turn included in the reading. */
  since: number;
}

/** Filter again before pruning, so the end-of-turn cleanup cannot change this reading. */
function recentLosses(player: Player, enemyId: number, since: number, turn: number): WarLoss[] {
  return (player.warLosses ?? []).filter(loss => loss.by === enemyId && loss.turn >= since && loss.turn <= turn);
}

export function readWarExchange(state: GameState, player: Player, enemy: Player): WarExchange | null {
  const war = warBetween(state, player.id, enemy.id);
  if (war === undefined) return null;
  const since = Math.max(war.declaredTurn, state.turn - lossTurnsCounted() + 1);
  const ours = recentLosses(player, enemy.id, since, state.turn);
  const theirs = recentLosses(enemy, player.id, since, state.turn);
  return {
    killed: theirs.filter(loss => loss.kind === 'unit').length,
    lost: ours.filter(loss => loss.kind === 'unit').length,
    won: theirs.filter(loss => loss.kind === 'town').length,
    given: ours.filter(loss => loss.kind === 'town').length,
    since,
  };
}
