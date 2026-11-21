import type { GameMap } from '../sim/map';

export const APPROVED_WORKS = {
  nazcaLines: { file: 'nazca-lines', scale: .99, yaw: -.21, radius: .90, fallback: 'farm' },
  inuksuk: { file: 'inuksuk', scale: .90, yaw: .20, radius: .64, fallback: 'landmark' },
  totemPole: { file: 'totem-pole', scale: .93, yaw: .30, radius: .67, fallback: 'landmark' },
  stepwell: { file: 'stepwell', scale: .94, yaw: -.26, radius: .90, fallback: 'qanat' },
  hillfort: { file: 'hillfort', scale: .91, yaw: .13, radius: .90, fallback: 'townKeep' },
  baray: { file: 'baray', scale: .86, yaw: 0, radius: .90, fallback: 'polder' },
  fishTraps: { file: 'fish-traps', scale: 1, yaw: -.42, radius: .70, fallback: 'fishTraps' },
  wildOrchard: { file: 'wild-orchard', scale: 1, yaw: .18, radius: .84, fallback: 'wildOrchard' },
  paradiseGarden: { file: 'paradise-garden', scale: .92, yaw: -.27, radius: .90, fallback: 'paradiseGarden' },
} as const;
export type ApprovedWorkId = keyof typeof APPROVED_WORKS;
export const APPROVED_WORK_IDS = Object.keys(APPROVED_WORKS) as ApprovedWorkId[];
export function isApprovedWork(id?: string): id is ApprovedWorkId {
  return id !== undefined && Object.prototype.hasOwnProperty.call(APPROVED_WORKS, id);
}

/** A gallery can display a sculpt before its gameplay row exists. Saved maps contain only real improvements. */
export const workGalleryPreviews = new WeakMap<GameMap, ReadonlyMap<number, ApprovedWorkId>>();
