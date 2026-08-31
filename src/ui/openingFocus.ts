/**
 * Where a brand-new game's boot camera looks (2026-08-30, the boot-camera
 * ruling): the local seat's founder — the settler `unitDef(type).foundsCity`
 * marks — falling back to the seat's first unit, and to the map's own centre
 * for a seat with no units at all (the wild, or a config nobody should ship).
 *
 * Pure and renderer-free on purpose: `main.ts`'s `boot`/`adoptGame` call it
 * once, for a fresh game only, and hand the cell to
 * `MapView.focusOpening?.()`. A loaded save never calls this — it keeps
 * whatever camera a fresh `refresh()` already gave it (see the docblock on
 * `GameControls.refresh` in `controls.ts`).
 */

import type { GameState } from '../sim/state';
import { unitDef } from '../sim/unitData';
import type { CellRef } from './mapView';

export function openingFocus(state: GameState, seat: number): CellRef {
  let first: CellRef | null = null;
  for (const unit of state.units) {
    if (unit.ownerId !== seat) continue;
    if (unitDef(unit.type).foundsCity) return { col: unit.col, row: unit.row };
    if (first === null) first = { col: unit.col, row: unit.row };
  }
  if (first !== null) return first;
  return { col: Math.floor(state.map.width / 2), row: Math.floor(state.map.height / 2) };
}
