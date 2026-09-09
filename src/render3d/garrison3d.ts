/**
 * **The garrison badge**: the roundel of whatever is standing in a town, hung
 * over that town's banner.
 *
 * The user's ruling of 2026-09-09 (`docs/flags.md`, (hhh) 6: *"units stationed
 * in a city should have their unit icon display on top of the banner"*), which
 * is Civ 5 and 6's pattern and is asked for the reason it exists there: the one
 * thing a player wants to know about a town across the table is **whether
 * anything is holding it**, and today the answer is a forty-pixel sculpt
 * standing in the middle of a ring of houses under a flag. A tag on the flagpole
 * is where the eye already is.
 *
 * Why a layer of its own
 * ----------------------
 * It is a *unit* fact drawn at a *city*, and the two layers are fingerprinted
 * separately on purpose (`signUnits` moves whenever anything walks; `signCities`
 * moves when a town grows or converts). Folding this into `CityLayer` would have
 * made every town in the world rebuild its houses, its walls and its banner
 * every time a scout took a step; folding it into `UnitLayer` would have put a
 * city walk inside the hot loop of the layer that rebuilds most often. So it is
 * its own group with its own fingerprint (`signGarrisons`), which is exactly the
 * arrangement the roads, the sites and the borders already have.
 *
 * One badge, and a count
 * ----------------------
 * A town holds a stack, and a stack of roundels over a flag is a wall of paper.
 * So the badge is the **strongest** thing standing there — highest
 * `combatStrength`, ties by the order `state.units` is iterated, which is the
 * determinism rule read at the surface — and a second numeral bosses its corner
 * when more than one piece is in. The numeral is the tile atlas's own, which is
 * the same borrowing the worker's charge count makes (`addChargeBadge` in
 * `pieces.ts`): a count of pieces is a number in the same voice a count of
 * charges is, and neither is a reason to grow the badge atlas.
 *
 * Strongest rather than "the defender `planCombat` would pick", deliberately.
 * The real defender is a whole ledger — terrain, fortification, walls, auras —
 * and a tag that quietly disagreed with the combat forecast would be worse than
 * one that plainly answers a simpler question. This one answers *what is in
 * there*, and the forecast answers what happens if you hit it.
 *
 * Fog, and the seat
 * -----------------
 * Seat-filtered twice, and both filters are the ones the layers beside it use.
 * A badge is drawn only where the seat is **currently watching** (`seesCell`,
 * never merely explored) — a garrison is an army and an army is not something a
 * chart remembers, which is `UnitLayer`'s own rule and has to be this layer's or
 * a player would read a stale count off a remembered town. And because the layer
 * is rebuilt rather than patched, it re-applies nothing: there is no wash to
 * re-apply, because nothing it draws survives onto explored ground at all. That
 * is the `ImprovementLayer.paintFog` contract met by the other arm — a layer
 * either fades on remembered hexes or is absent from them, and this one is
 * absent.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import { type BoardGeometry, badgeClassFor } from './board3d';
import { type FogLevels, seesCell } from './fog3d';
import { type TileIcons, type UnitBadges, BADGE_CELLS } from './badges3d';
import { InstanceCollector, RENDER_ORDER, disposeInstancedGroup } from './instances';
import { type MaterialLibrary } from './toon';
import { VIEW3D } from './lookData';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { getTileAt, tileIndex } from '../sim/map';
import { type GameState, type Unit, isBarbarian } from '../sim/state';
import { playerColor } from './cities3d';
import { unitDef } from '../sim/unitData';

const CITY = VIEW3D.city;
const BADGE = VIEW3D.badges;

/**
 * Every unit standing on a town's own hex, by the tile that town stands on.
 *
 * One walk over the pieces rather than one walk per city, for `tileOwnerField`'s
 * reason a layer up: a map-wide question asked once per town is quadratic on the
 * boards this renderer is meant to survive.
 */
function garrisonsByCell(state: GameState): Map<number, Unit[]> {
  const towns = new Set<number>();
  for (const city of state.cities) towns.add(tileIndex(state.map, city.col, city.row));
  const out = new Map<number, Unit[]>();
  for (const unit of state.units) {
    const cell = tileIndex(state.map, unit.col, unit.row);
    if (!towns.has(cell)) continue;
    const list = out.get(cell);
    if (list) list.push(unit);
    else out.set(cell, [unit]);
  }
  return out;
}

/**
 * Which piece the badge names: the strongest thing standing there.
 *
 * `state.units` order is the tie-break, which is the determinism rule read at
 * the surface — an array, never a map, and never a sort that could reorder two
 * equal rows differently on two clients. Exported so the rule can be pinned
 * without building a scene.
 */
export function strongestGarrison(garrison: readonly Unit[]): Unit | null {
  let best: Unit | null = null;
  let bestStrength = -1;
  for (const unit of garrison) {
    const strength = unitDef(unit.type).combatStrength;
    if (strength <= bestStrength) continue;
    bestStrength = strength;
    best = unit;
  }
  return best;
}

/**
 * The layer's fingerprint: which towns hold what, and whose.
 *
 * Deliberately **not** `signUnits`. That one moves whenever any piece anywhere
 * takes a step, and this layer changes only when a stack on a town's own hex
 * changes — so hashing it would rebuild the badges on every move on the map,
 * which is exactly the per-frame recomputation the fingerprint discipline
 * exists to prevent. It folds what the picture is a function of and nothing
 * else: where the town is, who owns it (the rim's ink), which badge the
 * strongest piece wears, and how many are in.
 *
 * A fog move is the other trigger, and it is the renderer's, not this hash's —
 * `FogStats.tiles`, exactly as it is for the units, the towns and the borders.
 */
export function signGarrisons(state: GameState): number {
  let h = 2166136261 ^ state.cities.length;
  const garrisons = garrisonsByCell(state);
  for (const city of state.cities) {
    const cell = tileIndex(state.map, city.col, city.row);
    const garrison = garrisons.get(cell) ?? [];
    const held = strongestGarrison(garrison);
    h = Math.imul(h ^ city.col, 16777619);
    h = Math.imul(h ^ city.row, 16777619);
    h = Math.imul(h ^ city.ownerId, 16777619);
    h = Math.imul(h ^ garrison.length, 16777619);
    h = Math.imul(
      h ^ (held === null ? -1 : BADGE_CELLS.indexOf(badgeClassFor(held.type))),
      16777619,
    );
    // Whose the *piece* is, which is not always whose the town is: a captured
    // town garrisoned by its captor and one still holding out are two pictures.
    h = Math.imul(h ^ (held === null ? -1 : held.ownerId), 16777619);
  }
  return h >>> 0;
}

export class GarrisonLayer {
  readonly group = new Group();
  private drawCallCount = 0;

  /**
   * Rebuilds every garrison tag from scratch.
   *
   * `badges` is the roundel atlas, or null while it is still loading — a null
   * one means no tags at all, exactly as it means untagged pieces one layer
   * over. `icons` is the *tile* atlas, asked for the one numeral that bosses a
   * stack's badge; a null one means the badge without its count rather than no
   * badge, because "something is holding this town" is the fact worth drawing
   * and "three things are" is the refinement.
   */
  build(
    state: GameState,
    geometry: BoardGeometry,
    materials: MaterialLibrary,
    faceCamera: Quaternion,
    shadows: boolean,
    badges: UnitBadges | null = null,
    levels: FogLevels = null,
    icons: TileIcons | null = null,
  ): void {
    disposeInstancedGroup(this.group);
    if (!badges) {
      this.drawCallCount = 0;
      return;
    }

    const map = state.map;
    const period = wrapWidth(map);
    const collector = new InstanceCollector({ copyOffsets: [-period, 0, period] });
    const garrisons = garrisonsByCell(state);
    const right = new Vector3(1, 0, 0).applyQuaternion(faceCamera);
    const up = new Vector3(0, 1, 0).applyQuaternion(faceCamera);
    const forward = new Vector3(0, 0, 1).applyQuaternion(faceCamera);

    for (const city of state.cities) {
      // An army is not something a chart remembers — see the module docblock.
      if (!seesCell(levels, map, city.col, city.row)) continue;
      const tile = getTileAt(map, city.col, city.row);
      if (!tile) continue;
      const garrison = garrisons.get(tileIndex(map, city.col, city.row)) ?? [];
      const held = strongestGarrison(garrison);
      if (!held) continue;

      const centre = cellCenter(city.col, city.row);
      // Over the flag: the pole's own top, plus the tag's rise. The banner hangs
      // below that (`flagDrop`), so the two never overlap however the flag is
      // dialled.
      const anchor = new Vector3(
        centre.x,
        tileTopY(tile) + CITY.poleHeight + CITY.garrisonRise,
        centre.z,
      );
      const size = new Vector3(CITY.garrisonSize, CITY.garrisonSize, 1);
      const wild = isBarbarian(state, held.ownerId);

      collector.add(
        geometry.badgeIcons[badgeClassFor(held.type)],
        // The paper it was printed on, never an ink of its own — `addBadge`'s
        // own note: the disc *is* the texture, and the colour list is what keeps
        // a nation's roundel and the wild's out of one bucket.
        [wild ? BADGE.wildPaperColor : BADGE.paperColor],
        new Matrix4().compose(anchor, faceCamera, size),
        { material: badges.materialFor(wild), order: RENDER_ORDER.badge },
      );
      // **Seat-tinted**, and it is the *piece's* seat rather than the town's: a
      // town whose captor has not walked in yet is a town with somebody else's
      // colour on its tag, which is the whole reason to draw one.
      collector.add(
        geometry.badgeRim,
        [wild ? BADGE.wildRimColor : playerColor(state, held.ownerId)],
        new Matrix4().compose(
          anchor.clone().addScaledVector(forward, CITY.garrisonNudge),
          faceCamera,
          size,
        ),
        { overlay: true, opacity: 1, order: RENDER_ORDER.badge },
      );

      // The count, when there is more than one thing in. Clamped to a digit for
      // `addChargeBadge`'s reason — nothing on this board stacks past nine, and
      // a tag is not the place to find out otherwise.
      if (icons && garrison.length > 1) {
        const digit = Math.max(0, Math.min(9, garrison.length));
        collector.add(
          geometry.numeralMarkers[digit]!,
          [],
          new Matrix4().compose(
            anchor
              .clone()
              .addScaledVector(right, CITY.garrisonSize * BADGE.chargeOffsetX)
              .addScaledVector(up, CITY.garrisonSize * BADGE.chargeOffsetY)
              .addScaledVector(forward, CITY.garrisonNudge * 2),
            faceCamera,
            new Vector3(CITY.garrisonCountSize, CITY.garrisonCountSize, 1),
          ),
          { material: icons.standingMaterial, order: RENDER_ORDER.badge },
        );
      }
    }

    this.drawCallCount = collector.flush(this.group, materials, shadows);
  }

  get drawCalls(): number {
    return this.drawCallCount;
  }

  dispose(): void {
    disposeInstancedGroup(this.group);
  }
}
