import type { WebGLRenderer } from 'three';
import type { PaintedBoard } from './paintedBoard';
import type { GroundPaint, GroundPaintPlan } from './groundPaint';
import { VIEW3D } from './lookData';

/** These values apply only to the close-view trial. The allocation includes room for two close targets and one bake square. */
export const closeGroundBaseSheet = () => ({ ...VIEW3D.painted.groundTexture, budgetMiB: 180 });
const density = 64;
const depth = 24;
const refillDistance = 2;

interface PaintWindow {
  x: number;
  z: number;
  width: number;
  paint: GroundPaint;
  step(renderer: WebGLRenderer): boolean;
}

type BoardPaint = NonNullable<PaintedBoard['groundPaint']>;
type Trial = NonNullable<BoardPaint['trial']>;
type Mode = 'cut' | 'close' | 'base zoom rule';

export class CloseGroundPaint {
  private ready?: PaintWindow;
  private next?: PaintWindow;
  private continuousX?: number;
  private previousPaint: GroundPaint | null | undefined;
  private failed = false;
  mode: Mode = 'base zoom rule';

  constructor(private readonly base: GroundPaintPlan, private readonly trial: Trial, readonly heights: readonly [number, number]) {}

  get pending(): boolean { return !!this.next; }
  get bytes(): number { return (this.ready?.paint.plan.bytes ?? 0) + (this.next?.paint.plan.bytes ?? 0); }

  /** Returns true when the visible material changed and the board needs a frame. */
  update(renderer: WebGLRenderer, targetX: number, targetZ: number, halfX: number, halfY: number,
    pitchDegrees: number, closest: boolean, forceCut = false): boolean {
    const pitch = pitchDegrees * Math.PI / 180;
    const halfZ = halfY / Math.sin(pitch) + Math.max(-this.heights[0], this.heights[1]) / Math.tan(pitch);
    const width = halfX * 2 <= 20 ? 24 : 32;
    if (!closest || halfX >= width / 2 || halfZ >= depth / 2 || width > this.base.period ||
        width * density > renderer.capabilities.maxTextureSize || this.failed) {
      this.cancelPending();
      return this.show(undefined);
    }
    const period = this.base.period;
    const distanceX = (a: number, b: number) => a - b - Math.round((a - b) / period) * period;
    const x = this.continuousX === undefined ? targetX : this.continuousX + distanceX(targetX, this.continuousX);
    this.continuousX = x;
    const covers = (window: PaintWindow) => Math.abs(distanceX(x, window.x)) + halfX < window.width / 2 &&
      Math.abs(targetZ - window.z) + halfZ < depth / 2;
    if (forceCut) return this.show(null);
    if (this.next && (!covers(this.next) || this.next.width !== width)) this.cancelPending();
    if (!this.next && (!this.ready || !covers(this.ready) || this.ready.width !== width ||
        Math.hypot(distanceX(x, this.ready.x), targetZ - this.ready.z) >= refillDistance)) {
      // Bake near the middle map copy so both sides of a seam fit among its neighbours.
      const cx = Math.round((x - Math.floor(x / period) * period) * density) / density;
      const cz = Math.round(targetZ * density) / density;
      const plan = { ...this.base, closeTrial: false, wrapPeriod: period, x0: cx - width / 2,
        z0: cz - depth / 2, z1: cz + depth / 2, period: width, depth, width: width * density,
        height: depth * density, density, bytes: width * depth * density * density * 16 / 3 };
      this.next = { ...this.trial.bakeClose(plan), x: cx, z: cz, width };
    }
    if (this.next?.step(renderer)) {
      this.ready?.paint.dispose();
      this.ready = this.next;
      this.next = undefined;
    } else if (this.next?.paint.failed) {
      this.failed = true;
      this.cancelPending();
      return this.show(undefined);
    }
    return this.show(this.ready && covers(this.ready) ? this.ready.paint : null);
  }

  private show(paint: GroundPaint | null | undefined): boolean {
    this.mode = paint === undefined ? 'base zoom rule' : paint ? 'close' : 'cut';
    if (paint === this.previousPaint) return false;
    this.previousPaint = paint;
    this.trial.show(paint);
    return true;
  }

  private cancelPending(): void {
    this.next?.paint.dispose();
    this.next = undefined;
  }

  dispose(): void {
    this.show(undefined);
    this.cancelPending();
    this.ready?.paint.dispose();
    this.ready = undefined;
  }
}

/** Use the actual ground heights so a hill near the top of the viewport stays inside the ready texture. */
export function closeGroundFor(board: PaintedBoard): CloseGroundPaint | null {
  const ground = board.groundPaint;
  if (!ground?.trial) return null;
  const heights: [number, number] = [0, 0];
  for (const mesh of board.pickMeshes) {
    if (!mesh.geometry.hasAttribute('paintedRelief')) continue;
    const box = mesh.geometry.boundingBox;
    if (box) {
      heights[0] = Math.min(heights[0], box.min.y);
      heights[1] = Math.max(heights[1], box.max.y);
    }
  }
  return new CloseGroundPaint(ground.plan, ground.trial, heights);
}
