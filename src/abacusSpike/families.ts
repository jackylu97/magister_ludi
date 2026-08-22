/**
 * The four scoring families a victory bead can belong to, and the inks they are
 * painted in.
 *
 * Two of them already exist in the board palette and are taken from it by name,
 * because a conquest bead has to be the same red the crimson player's pieces
 * are and a culture bead the same violet the grape clutter is — the abacus sits
 * on the same table as the board and must not open a second colour vocabulary.
 *
 * The other two are declared here, and deliberately marked as spike-local: this
 * page is not allowed to write to `data/view3d.json`. If the abacus is adopted
 * they become `palette.lapis` and `palette.gilt` in that file and this block
 * turns into two more `named()` lookups.
 *
 * Both are muted a step from the interface's own accents (`--cobalt` and
 * `--gilt` in `src/style.css`). The HUD's blue is a screen blue and would tear a
 * hole in a painted-wood palette exactly the way the sim's player colours do —
 * see `playerPieceColor` for the same problem solved the same way.
 */

import { VIEW3D } from '../render3d/lookData';

export type FamilyId = 'conquest' | 'culture' | 'philosophy' | 'commerce';

/** Spike-local: the two inks the board palette has no entry for yet. */
const LAPIS = 0x3f639f;
const GILT = 0xc08a2b;

export interface Family {
  id: FamilyId;
  /** What the tally button calls it. */
  name: string;
  color: number;
}

export const FAMILIES: readonly Family[] = [
  { id: 'conquest', name: 'Conquest', color: VIEW3D.palette.crimson! },
  { id: 'culture', name: 'Culture', color: VIEW3D.palette.grape! },
  { id: 'philosophy', name: 'Philosophy', color: LAPIS },
  { id: 'commerce', name: 'Commerce', color: GILT },
];

export function familyOf(id: FamilyId): Family {
  const family = FAMILIES.find((entry) => entry.id === id);
  if (!family) throw new Error(`Unknown scoring family: ${id}`);
  return family;
}

/** `0x7c5f8c` → `#7c5f8c`, for the DOM swatches. */
export function cssHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
