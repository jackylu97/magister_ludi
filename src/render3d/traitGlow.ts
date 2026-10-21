/**
 * The trait glow: a one-time gilt glow on the pieces that gained a line trait
 * (Scientific batch S10).
 *
 * A line trait changes no unit type. When Mechanics lands, every Catapult on
 * the board gains the Onager trait and nothing about its sculpt, its badge or
 * its name on the board changes. So the board marks the moment once: each
 * piece that gained the trait glows in gilt for a little over a second and
 * then settles back to exactly how it looked before. A lasting badge on the
 * piece is a later art decision, so nothing stays.
 *
 * What glows is the piece's own outline shell. It is washed toward gilt and
 * drawn at the hover width while the glow is strong, then returned to its
 * resting wash. The shell can already carry a resting wash (the seat's trim,
 * the hostile glow, a routed caravan's fade), so the glow is mixed over that
 * wash rather than written instead of it, and the end of the glow writes the
 * resting wash back (`glowShellWash`).
 *
 * This module is the arithmetic and the clock. It reads nothing from the game
 * state, so it cannot change the piece fingerprint (`signUnits`), and a
 * dropped frame loses part of an effect, never a unit. `UnitLayer` writes the
 * wash and `Renderer3D` steps the clock in its frame loop.
 */

/** The interface's gilt (`--gilt` in `style.css`), the ink of "yours". */
export const TRAIT_GLOW_COLOR = 0xc8901f;

/**
 * The glow's three tunables.
 *
 * Here in code for this batch only: they move to `data/view3d.json`
 * (`units.traitGlowMs`, `units.traitGlowPeak`, `units.traitGlowRise`) when
 * that file is open to the batch that owns it.
 *
 * Mutable through `setTraitGlowTuning` so the Flair Cabinet can turn them live.
 */
export interface TraitGlowTuning {
  /** How long the whole glow lasts, in milliseconds. Zero or less is no glow. */
  durationMs: number;
  /** How far toward gilt the outline goes at the top of the glow, 0 to 1. */
  peak: number;
  /** The share of the duration spent rising. The rest is spent settling. */
  rise: number;
}

const TUNING: TraitGlowTuning = { durationMs: 1400, peak: 0.85, rise: 0.3 };

/** The glow's live tunables. Read at call time, so a gallery knob takes effect at once. */
export function traitGlowTuning(): Readonly<TraitGlowTuning> {
  return TUNING;
}

/** Sets some of the tunables. For the Flair Cabinet's sliders. */
export function setTraitGlowTuning(next: Partial<TraitGlowTuning>): void {
  if (next.durationMs !== undefined) TUNING.durationMs = next.durationMs;
  if (next.peak !== undefined) TUNING.peak = Math.max(0, Math.min(1, next.peak));
  if (next.rise !== undefined) TUNING.rise = Math.max(0.01, Math.min(0.99, next.rise));
}

/**
 * How strong the glow is `elapsed` milliseconds after it started: 0 to `peak`,
 * or `null` once it is over.
 *
 * It rises with an ease-out over the first `rise` share of the duration, so the
 * piece lights quickly, then settles with an ease-in-out to exactly nothing at
 * the end, so the last frame of the glow already looks like the resting piece.
 * A duration of zero or less is no glow at all.
 */
export function traitGlowStrength(
  elapsed: number,
  tuning: Readonly<TraitGlowTuning> = TUNING,
): number | null {
  const { durationMs, peak, rise } = tuning;
  if (!(durationMs > 0) || elapsed >= durationMs) return null;
  const t = Math.max(0, elapsed) / durationMs;
  if (t < rise) return peak * Math.sin((Math.PI / 2) * (t / rise));
  const settle = (t - rise) / (1 - rise);
  return peak * 0.5 * (1 + Math.cos(Math.PI * settle));
}

/**
 * The strength above which the outline is drawn at the hover width.
 *
 * Two widths and no tween between them, because the width is one attribute the
 * layer can only set to the rest or the hover value (`setUnitOutline`). The
 * colour carries the smooth part; the width marks the strong middle of it.
 */
export const TRAIT_GLOW_WIDEN_AT = 0.25;

/** A shell wash: mix the outline's own ink `mix` of the way toward `target`. */
export interface ShellWash {
  target: number;
  mix: number;
}

/** `0xRRGGBB` mixed `mix` of the way toward `target`, channel by channel. */
function mixColor(color: number, target: number, mix: number): number {
  const r = Math.round(((color >> 16) & 255) + ((((target >> 16) & 255) - ((color >> 16) & 255)) * mix));
  const g = Math.round(((color >> 8) & 255) + ((((target >> 8) & 255) - ((color >> 8) & 255)) * mix));
  const b = Math.round((color & 255) + (((target & 255) - (color & 255)) * mix));
  return (r << 16) | (g << 8) | b;
}

/**
 * The one shell wash that draws the glow at `strength` over a resting wash.
 *
 * The shell's colour is its outline ink mixed toward a target
 * (`InstanceCollector.setShellWash`). The resting look is
 * `mix(ink, rest.target, rest.mix)`, and the glow mixes that `strength` of the
 * way toward gilt. Two mixes in a row are one mix: toward a target that is
 * itself a mix of the resting target and gilt, by
 * `1 − (1 − rest.mix)(1 − strength)`. So the glow needs no knowledge of the
 * outline's own ink, and at `strength` 0 it is exactly the resting wash.
 *
 * `rest` is `null` for a shell with no resting wash (a seat that wears the
 * board's own ink as its trim).
 */
export function glowShellWash(
  rest: ShellWash | null,
  strength: number,
  glow: number = TRAIT_GLOW_COLOR,
): ShellWash {
  const s = Math.max(0, Math.min(1, strength));
  const restMix = rest === null ? 0 : Math.max(0, Math.min(1, rest.mix));
  if (s <= 0) return rest === null ? { target: glow, mix: 0 } : { target: rest.target, mix: restMix };
  const mix = 1 - (1 - restMix) * (1 - s);
  if (rest === null || restMix <= 0) return { target: glow, mix };
  return { target: mixColor(rest.target, glow, s / mix), mix };
}

/**
 * The glows in flight, by unit id: when each one started.
 *
 * `DeathAnimations3D`'s shape. It only says how far through its glow a piece
 * is, and forgets a glow once it is over. A second glow on a piece that is
 * still glowing starts it again from the top.
 */
export class TraitGlows {
  private readonly startedAt = new Map<number, number>();

  /** Starts a glow on each piece. Does nothing when the duration is zero or less. */
  start(unitIds: readonly number[], now: number): void {
    if (!(traitGlowTuning().durationMs > 0)) return;
    for (const unitId of unitIds) this.startedAt.set(unitId, now);
  }

  /** True while at least one glow is in flight. Keeps the render loop awake. */
  get pending(): boolean {
    return this.startedAt.size > 0;
  }

  /** The pieces glowing now, in the order their glows were started. */
  activeUnits(): number[] {
    return [...this.startedAt.keys()];
  }

  /**
   * How strong this piece's glow is now, or `null` when it has none. A glow
   * that has run its course answers `null` and is forgotten, so the caller's
   * `null` branch is where it writes the resting wash back.
   */
  strength(unitId: number, now: number): number | null {
    const started = this.startedAt.get(unitId);
    if (started === undefined) return null;
    const strength = traitGlowStrength(now - started);
    if (strength === null) this.startedAt.delete(unitId);
    return strength;
  }

  /** Forgets one glow, without waiting for it to end. */
  forget(unitId: number): void {
    this.startedAt.delete(unitId);
  }

  /** Forgets every glow. */
  clear(): void {
    this.startedAt.clear();
  }
}
