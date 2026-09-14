import type { GameState, Unit } from '../sim/state';
import { isVisibleTo } from '../sim/visibility';

export interface UnitPointerHits {
  badgeId?: number | null;
  /** Lazy so a badge which already resolves a stack avoids a model raycast. */
  modelId?: number | null | (() => number | null);
  tile?: { col: number; row: number } | null;
}

export interface UnitPointerTarget {
  unit: Unit;
  source: 'badge' | 'model' | 'tile';
}

/** State order is the board's stack order; a named model does not cycle it. */
export function nextUnitInStack(units: readonly Unit[], selectedId: number | null): Unit | null {
  if (units.length === 0) return null;
  return units[(units.findIndex((unit) => unit.id === selectedId) + 1) % units.length]!;
}

/**
 * The selection a pointer advertises, shared by hover and click. Badges retain
 * their tile's stack cycle; the model surface names one exact piece. A routed
 * trader cannot be commanded, and a remembered tile contains no visible units.
 * Action modes and city ground targeting decide whether to call this at all,
 * or omit `tile`, before reaching this purely read-only resolver.
 */
export function resolveUnitPointerTarget(
  state: GameState,
  playerId: number,
  selectedId: number | null,
  hits: UnitPointerHits,
): UnitPointerTarget | null {
  const eligible = (unit: Unit): boolean => unit.ownerId === playerId && unit.trade === undefined;
  const stackAt = (cell: { col: number; row: number }): Unit | null => {
    if (!isVisibleTo(state, playerId, cell.col, cell.row)) return null;
    return nextUnitInStack(state.units.filter((unit) =>
      unit.col === cell.col && unit.row === cell.row && eligible(unit)), selectedId);
  };
  const badge = hits.badgeId == null ? undefined : state.units.find((unit) => unit.id === hits.badgeId);
  // A routed caravan's tag can still lead to another commandable piece on its
  // tile, matching the existing badge contract rather than hiding that stack.
  if (badge?.ownerId === playerId) {
    const unit = stackAt(badge);
    if (unit) return { unit, source: 'badge' };
  }
  const modelId = typeof hits.modelId === 'function' ? hits.modelId() : hits.modelId;
  const model = modelId == null ? undefined : state.units.find((unit) => unit.id === modelId);
  if (model && eligible(model) && isVisibleTo(state, playerId, model.col, model.row)) {
    return { unit: model, source: 'model' };
  }
  const unit = hits.tile ? stackAt(hits.tile) : null;
  return unit ? { unit, source: 'tile' } : null;
}
