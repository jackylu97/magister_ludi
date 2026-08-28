/**
 * The health-bar audit, and the twenty lines of `Renderer3D` that sequence it.
 *
 * Shared by `unitBars.test.ts` (the named sequences) and `unitBars.slow.test.ts`
 * (the randomised sweep), which is why it is a module rather than a block in one
 * of them — importing a `.test.ts` file re-registers its tests.
 *
 * Two things live here. `barComplaints` is the audit: **every drawn bar belongs
 * to exactly one unit and is drawn at that unit's own `hp / maxHp`**, and every
 * unit that should be on the board has one iff it is hurt. "Drawn at" is
 * `hpBarFillWidth` rather than the bare product, because the fill has a pip
 * floor under it — see that function, and the note at the comparison itself.
 * `RendererBeat` is the
 * orchestration the audit is run through — `Renderer3D`'s `rebuildUnits`,
 * `skipAnimations`, `animateMove`, `stepAnimations` and the `loop`'s fingerprint
 * compare, with the parts that need a canvas removed. A node test cannot build a
 * WebGL renderer, and those twenty lines are the ones a one-shot `UnitLayer.build`
 * never exercises; `unitBars.test.ts` reads `renderer3d.ts` back to keep the copy
 * honest.
 */

import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';

import { MoveAnimations3D } from '../../src/render3d/animation3d';
import { hpBarY } from '../../src/render3d/badges3d';
import { type BoardGeometry, pieceHeightFor } from '../../src/render3d/board3d';
import { wrapWidth } from '../../src/render3d/layout';
import { VIEW3D } from '../../src/render3d/lookData';
import {
  UnitLayer,
  hpBarFillWidth,
  placePiece,
  signUnits,
  unitStackIndices,
} from '../../src/render3d/pieces';
import type { MaterialLibrary } from '../../src/render3d/toon';
import { createMap } from '../../src/sim/map';
import { makeRng } from '../../src/sim/rng';
import { type GameState, newGame } from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';

const HP = VIEW3D.hpBar;

/**
 * How close is "the same place".
 *
 * An instance matrix is a `Float32Array`, so a position read back out of one has
 * about seven significant figures — and the wrap copies are a whole board period
 * (~24 world units) from the middle one, which puts the error near 1e-6. The
 * tolerance is therefore a thousandth of a hex radius: four orders coarser than
 * the noise and two orders finer than the smallest real displacement on the
 * board, which is the stack fan (`pieces.stackSpread`, 0.34).
 */
const NEAR = 1e-3;

/**
 * How close is "the same place" *in depth*, which is looser and has to be.
 *
 * The fill quad stands a hundredth of a unit in front of its backing so the two
 * never z-fight (`addHpBar`), so a tolerance tight enough to separate two units
 * would separate a bar from its own fill. A twentieth is above the nudge and far
 * below the stack fan, which is the closest two units ever stand.
 */
const NEAR_Z = 0.05;

/**
 * A blank two-player state on flat grassland, quiet and seeded.
 *
 * The wild is seated (`barbarians: true`) even though nothing here musters one
 * by itself: a real game always has that third seat, and the fourth bar report
 * (user, 2026-08-28) was about a blow struck by it. A seat with no units on the
 * board costs the audit nothing and lets a test raid with `barbarianPlayer`.
 */
export function flatState(seed = 1, width = 16, height = 8): GameState {
  const state = newGame({
    seed,
    sizeName: 'duel',
    barbarians: true,
    players: [
      { name: 'A', color: '#d4502e', isHuman: true },
      { name: 'B', color: '#2e6fd4', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  // The board was replaced under this state; the fog grids were sized for the
  // old one. See `resetVisibility`.
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  state.rng = makeRng(seed * 7919 + 3);
  return state;
}

export interface Cell {
  col: number;
  row: number;
}

export class RendererBeat {
  readonly units = new UnitLayer();
  readonly animations = new MoveAnimations3D();
  /** Stands in for `Renderer3D.walkers`, whose values are meshes. */
  readonly walkers = new Set<number>();
  private unitsSignature = 0;
  private fogSignature = -1;

  constructor(
    private readonly state: GameState,
    private readonly geometry: BoardGeometry,
    private readonly materials: MaterialLibrary,
    /** The seat whose eyes the board is drawn through, or null for no fog. */
    private seat: number | null = null,
  ) {
    this.rebuildUnits();
  }

  /** `Renderer3D.rebuildUnits`. */
  rebuildUnits(): void {
    this.units.build(
      this.state,
      this.geometry,
      this.materials,
      new Quaternion(),
      false,
      null,
      null,
      null,
      this.levels(),
      null,
    );
    for (const unitId of this.animations.activeUnits()) this.units.hide(unitId);
    this.unitsSignature = signUnits(this.state);
    this.fogSignature = this.signFog();
  }

  /** The hot-seat swap: a new pair of eyes over the same board. */
  setSeat(seat: number | null): void {
    this.seat = seat;
    this.rebuildUnits();
  }

  /** `Renderer3D.skipAnimations`. */
  skipAnimations(): void {
    this.animations.clear();
    this.walkers.clear();
    this.units.clearHidden();
    this.rebuildUnits();
  }

  /** `Renderer3D.animateMove`, minus the fog refusal and the walker meshes. */
  animateMove(unitId: number, from: Cell, walked: readonly Cell[], now: number): void {
    this.animations.start(unitId, from, walked, now);
    if (this.animations.activeUnits().includes(unitId)) {
      this.units.hide(unitId);
      this.walkers.add(unitId);
    }
  }

  /**
   * One drawn frame of `Renderer3D.loop`: the walks are stepped first, then the
   * fog is re-applied, then the layer is rebuilt if either the fog or the piece
   * fingerprint moved. Same order, same two triggers.
   */
  frame(now: number): void {
    if (this.animations.pending || this.walkers.size > 0) this.stepAnimations(now);
    if (this.signFog() !== this.fogSignature || signUnits(this.state) !== this.unitsSignature) {
      this.rebuildUnits();
    }
  }

  /** `Renderer3D.stepAnimations`, over the union of the walks and the meshes. */
  private stepAnimations(now: number): void {
    const walks = new Set<number>(this.animations.activeUnits());
    for (const unitId of this.walkers) walks.add(unitId);
    for (const unitId of walks) {
      const sample = this.animations.sample(unitId, now, this.state.map);
      if (sample) continue;
      this.walkers.delete(unitId);
      this.units.restore(unitId);
    }
  }

  /**
   * Which units should have a resting visual right now: everything this seat can
   * watch that is not being carried by the animation layer instead.
   */
  drawn(): Set<number> {
    const out = new Set<number>();
    const levels = this.levels();
    for (const unit of this.state.units) {
      if (this.walkers.has(unit.id)) continue;
      if (levels && levels[unit.row * this.state.map.width + unit.col] !== 2) continue;
      out.add(unit.id);
    }
    return out;
  }

  private levels(): readonly number[] | null {
    return this.seat === null ? null : (this.state.visibility[this.seat] ?? null);
  }

  private signFog(): number {
    const levels = this.levels();
    if (!levels) return 0;
    let h = 2166136261;
    for (let i = 0; i < levels.length; i++) h = Math.imul(h ^ levels[i]!, 16777619);
    return h >>> 0;
  }

  dispose(): void {
    this.units.dispose();
  }
}

export interface BarInstance {
  x: number;
  y: number;
  z: number;
  width: number;
}

/**
 * The `InstancedMesh`es the bars are batched into — the *buckets*, not the
 * instances.
 *
 * There should be very few of them and their identity is the point: a backing
 * bucket and one fill bucket per fill colour, shared by every seat on the board.
 * A bar that ended up in a bucket of its own per seat, or a fill bucket that
 * could be culled while its backing was not, would read on screen as exactly the
 * same complaint — a bar with nothing in it.
 */
export function barMeshes(layer: UnitLayer, board: BoardGeometry): InstancedMesh[] {
  return layer.group.children.filter(
    (child): child is InstancedMesh =>
      child instanceof InstancedMesh && child.geometry === board.bar,
  );
}

/** Every bar instance still drawn — zero-scaled (hidden) ones excluded. */
export function barInstances(layer: UnitLayer, board: BoardGeometry): BarInstance[] {
  const out: BarInstance[] = [];
  const matrix = new Matrix4();
  const scale = new Vector3();
  const position = new Vector3();
  for (const child of layer.group.children) {
    if (!(child instanceof InstancedMesh) || child.geometry !== board.bar) continue;
    for (let i = 0; i < child.count; i++) {
      child.getMatrixAt(i, matrix);
      position.setFromMatrixPosition(matrix);
      scale.setFromMatrixScale(matrix);
      if (scale.x < 1e-9) continue;
      out.push({ x: position.x, y: position.y, z: position.z, width: scale.x });
    }
  }
  return out;
}

/** The wrap copies every instanced visual is emitted in. See `copyOffsets`. */
export const WRAP_COPIES = 3;

/**
 * Every complaint the board can make about its bars.
 *
 * `drawn` is which unit ids should have a resting visual: a piece mid-walk is
 * being carried by the animation layer and one outside the seat's sight is not
 * drawn at all, so neither owes a bar. Everything else does — and every bar
 * instance on the board must belong to somebody.
 *
 * A unit's bars are found at the anchor `addHpBar` *must* have placed them at —
 * `placePiece` (with the stack fan) plus `hpBarY` over the unit's own visual
 * height — matched **modulo the wrap period**, because a piece near the eastern
 * edge has its middle copy east of the seam and a fixed window would hand its
 * bars to nobody. All three copies are audited rather than one: they are the
 * same instance three times, and a wrong answer in one of them is a wrong answer
 * on whichever side of the seam the camera is looking at.
 */
export function barComplaints(
  state: GameState,
  layer: UnitLayer,
  board: BoardGeometry,
  drawn: ReadonlySet<number>,
): string[] {
  const period = wrapWidth(state.map);
  const bars = barInstances(layer, board);
  const problems: string[] = [];
  const claimed = new Set<BarInstance>();
  const stack = unitStackIndices(state);
  /** The same x, allowing for a whole number of wrap periods between them. */
  const sameColumn = (a: number, b: number): boolean =>
    Math.abs(a - b - Math.round((a - b) / period) * period) < NEAR;

  for (const unit of state.units) {
    const placement = placePiece(state.map, unit, stack.get(unit.id) ?? 0);
    const x = placement.position.x - HP.width / 2;
    const y = placement.position.y + hpBarY(pieceHeightFor(unit.type));
    const mine = bars.filter(
      (bar) =>
        sameColumn(bar.x, x) &&
        Math.abs(bar.y - y) < NEAR &&
        Math.abs(bar.z - placement.position.z) < NEAR_Z,
    );
    for (const bar of mine) claimed.add(bar);

    const maxHp = unitDef(unit.type).maxHp;
    if (!drawn.has(unit.id)) {
      if (mine.length > 0) {
        problems.push(`unit ${unit.id} is off the board but drew ${mine.length} bars`);
      }
      continue;
    }
    if (unit.hp >= maxHp) {
      if (mine.length > 0) problems.push(`unit ${unit.id} is unhurt and drew ${mine.length} bars`);
      continue;
    }
    if (mine.length !== 2 * WRAP_COPIES) {
      problems.push(`unit ${unit.id} (${unit.hp}/${maxHp}) drew ${mine.length} bar instances`);
      continue;
    }
    const widths = [...new Set(mine.map((bar) => Math.round(bar.width / NEAR)))]
      .map((w) => w * NEAR)
      .sort((a, b) => b - a);
    if (widths.length !== 2) {
      problems.push(`unit ${unit.id} drew ${widths.length} distinct bar widths: ${widths}`);
      continue;
    }
    const [backing, fill] = widths as [number, number];
    if (Math.abs(backing - HP.width) > NEAR) {
      problems.push(`unit ${unit.id} backing is ${backing}, not ${HP.width}`);
    }
    // `hpBarFillWidth`, not `HP.width × fraction`: a fill under the pip floor is
    // drawn *at* the floor on purpose (see that function — an exactly drawn fill
    // for a piece at a few points of a hundred is a sub-pixel quad the
    // rasteriser drops, which is a living unit with an empty bar). The audit
    // asks the drawing rule the same way it asks `hpBarFill` for the fraction:
    // two readings of "how wide is this" would be two answers.
    const want = hpBarFillWidth(unit.hp / maxHp);
    if (Math.abs(fill - want) > NEAR) {
      problems.push(`unit ${unit.id} (${unit.hp}/${maxHp}) fill is ${fill}, want ${want}`);
    }
  }
  for (const bar of bars) {
    if (!claimed.has(bar)) problems.push(`a bar at x=${bar.x.toFixed(3)} belongs to nobody`);
  }
  return problems;
}

/** Every unit on the board, which is the usual expectation. */
export function allUnits(state: GameState): Set<number> {
  return new Set(state.units.map((unit) => unit.id));
}
