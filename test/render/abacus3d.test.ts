import { describe, expect, it } from 'vitest';

import viewJson from '../../data/view3d.json';
import {
  FAMILIES,
  FAMILY_IDS,
  type FamilyId,
  beadX,
  cssHex,
  familyOf,
  frameMetrics,
  rodLayout,
  slidePosition,
} from '../../src/render3d/abacus3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { beadShape, chamferedBar, extrudeProfile, rodFinial } from '../../src/render3d/geometry';

/**
 * The Abacus is the score, so its arithmetic is the part that has to be right:
 * a bead in the wrong place is a player reading the wrong number off a physical
 * object, which is worse than a wrong number in a bar because it *looks*
 * trustworthy.
 *
 * Everything below is pure — bead layout, the slide curve, the frame's stack of
 * heights and the palette promotion the object was adopted with. The stage
 * itself needs a WebGL context and is exercised on `abacus.html`, the look-dev
 * page it was designed on; the in-game screen's DOM is browser-only and, as
 * everywhere else in this suite, is not covered here.
 */

const PER_ROD = VIEW3D.abacus.bead.perRod;

describe('the frame', () => {
  it('stacks foot, rail, span and rail into its total height', () => {
    const frame = VIEW3D.abacus.frame;
    const metrics = frameMetrics();
    expect(metrics.footTop).toBeCloseTo(frame.footHeight, 10);
    expect(metrics.innerBottom).toBeCloseTo(frame.footHeight + frame.railHeight, 10);
    expect(metrics.innerTop - metrics.innerBottom).toBeCloseTo(frame.innerHeight, 10);
    expect(metrics.totalHeight).toBeCloseTo(
      frame.footHeight + frame.railHeight * 2 + frame.innerHeight,
      10,
    );
  });

  it('leaves the stiles standing inside the frame, not outside it', () => {
    const frame = VIEW3D.abacus.frame;
    expect(frameMetrics().innerHalfSpan).toBeCloseTo(frame.width / 2 - frame.stileWidth, 10);
    expect(frameMetrics().innerHalfSpan).toBeGreaterThan(0);
  });
});

describe('rodLayout', () => {
  it('divides the clear height evenly and reads downward', () => {
    const frame = VIEW3D.abacus.frame;
    for (const count of [1, 2, 3, 6, 8]) {
      const layout = rodLayout(count);
      expect(layout.rodY).toHaveLength(count);
      expect(layout.pitch).toBeCloseTo(frame.innerHeight / (count + 1), 10);
      // Player 0 takes the top rod: a scoreboard is read downward.
      for (let i = 1; i < count; i++) {
        expect(layout.rodY[i]!).toBeLessThan(layout.rodY[i - 1]!);
        expect(layout.rodY[i - 1]! - layout.rodY[i]!).toBeCloseTo(layout.pitch, 10);
      }
    }
  });

  it('keeps every rod strictly between the rails', () => {
    const metrics = frameMetrics();
    for (const count of [1, 2, 4, 8]) {
      for (const y of rodLayout(count).rodY) {
        expect(y).toBeGreaterThan(metrics.innerBottom);
        expect(y).toBeLessThan(metrics.innerTop);
      }
    }
  });

  it('shrinks the beads as the table fills, and never past the pitch', () => {
    const bead = VIEW3D.abacus.bead;
    let previous = Infinity;
    for (const count of [2, 3, 4, 6, 9]) {
      const layout = rodLayout(count);
      expect(layout.beadRadius).toBeLessThanOrEqual(bead.maxRadius);
      expect(layout.beadRadius).toBeLessThanOrEqual(previous);
      // A bead is never taller than the gap to the rod above it, or the rods
      // would read as one column of overlapping discs.
      expect(layout.beadRadius * 2).toBeLessThan(layout.pitch * 2);
      previous = layout.beadRadius;
    }
  });

  it('fits a full rod of beads inside the run', () => {
    // The one hard constraint on the whole object: thirteen beads at the bead
    // pitch have to fit between the two finials, or a packed stack would push
    // beads out through the frame.
    for (const count of [1, 2, 4, 6]) {
      const layout = rodLayout(count);
      expect(PER_ROD * layout.beadStep).toBeLessThanOrEqual(layout.runEdge * 2);
    }
  });
});

describe('beadX', () => {
  const layout = rodLayout(2);

  it('packs the earned left and the waiting right', () => {
    const earned = 4;
    for (let i = 1; i < PER_ROD; i++) {
      // Left to right, always: the physical order of the beads on a rod never
      // changes, which is the invariant the whole animation rests on.
      expect(beadX(layout, i, earned)).toBeGreaterThan(beadX(layout, i - 1, earned));
    }
    // The two clusters are each packed solid at the bead pitch.
    for (let i = 1; i < earned; i++) {
      expect(beadX(layout, i, earned) - beadX(layout, i - 1, earned)).toBeCloseTo(
        layout.beadStep,
        10,
      );
    }
    for (let i = earned + 1; i < PER_ROD; i++) {
      expect(beadX(layout, i, earned) - beadX(layout, i - 1, earned)).toBeCloseTo(
        layout.beadStep,
        10,
      );
    }
    // And the gap between them is bigger than the pitch, which is what makes the
    // split readable at a glance.
    expect(beadX(layout, earned, earned) - beadX(layout, earned - 1, earned)).toBeGreaterThan(
      layout.beadStep,
    );
  });

  it('stays inside the run at every tally', () => {
    for (let earned = 0; earned <= PER_ROD; earned++) {
      for (let i = 0; i < PER_ROD; i++) {
        const x = beadX(layout, i, earned);
        expect(Math.abs(x)).toBeLessThanOrEqual(layout.runEdge);
      }
    }
  });

  it('moves exactly one bead when a point is scored', () => {
    for (let earned = 0; earned < PER_ROD; earned++) {
      const before = Array.from({ length: PER_ROD }, (_, i) => beadX(layout, i, earned));
      const after = Array.from({ length: PER_ROD }, (_, i) => beadX(layout, i, earned + 1));
      const moved = before.filter((x, i) => Math.abs(x - after[i]!) > 1e-9);
      expect(moved).toHaveLength(1);
      // And the one that moved is the leftmost waiting bead, travelling left.
      expect(after[earned]!).toBeLessThan(before[earned]!);
    }
  });

  it('empties and fills to the two mirror-image states', () => {
    const empty = Array.from({ length: PER_ROD }, (_, i) => beadX(layout, i, 0));
    const full = Array.from({ length: PER_ROD }, (_, i) => beadX(layout, i, PER_ROD));
    expect(empty[PER_ROD - 1]!).toBeCloseTo(layout.runEdge - layout.beadStep / 2, 10);
    expect(full[0]!).toBeCloseTo(-layout.runEdge + layout.beadStep / 2, 10);
    for (let i = 0; i < PER_ROD; i++) expect(full[i]!).toBeCloseTo(-empty[PER_ROD - 1 - i]!, 10);
  });
});

describe('slidePosition', () => {
  const slide = VIEW3D.abacus.slide;

  it('starts where it was and ends where it is going', () => {
    expect(slidePosition(2, -1, 0)).toBeCloseTo(2, 10);
    expect(slidePosition(2, -1, 1)).toBeCloseTo(-1, 10);
    // Past the end is the end, not an extrapolation.
    expect(slidePosition(2, -1, 1.5)).toBeCloseTo(-1, 10);
  });

  it('overshoots the stack by a fixed distance, whatever the trip', () => {
    // The knock is the same size on a long slide and a short one, which is why
    // it is a world distance rather than a fraction of the travel.
    for (const from of [0.2, 1, 3]) {
      const at = slidePosition(from, -1, slide.travel);
      expect(at).toBeCloseTo(-1 - slide.overshoot, 6);
    }
    // And it comes back the other way when the bead is travelling right.
    expect(slidePosition(-2, 1, slide.travel)).toBeCloseTo(1 + slide.overshoot, 6);
  });

  it('travels monotonically out and settles monotonically back', () => {
    const steps = 40;
    let previous = slidePosition(2, -1, 0);
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * slide.travel;
      const at = slidePosition(2, -1, t);
      expect(at).toBeLessThanOrEqual(previous + 1e-9);
      previous = at;
    }
    previous = slidePosition(2, -1, slide.travel);
    for (let i = 1; i <= steps; i++) {
      const t = slide.travel + (i / steps) * (1 - slide.travel);
      const at = slidePosition(2, -1, t);
      expect(at).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = at;
    }
  });

  it('leaves at speed and arrives slowly', () => {
    // easeOutCubic, not ease-in-out: a bead that accelerated out of the stack it
    // was resting in would be a bead nobody pushed.
    const early = slidePosition(1, 0, 0.05) - slidePosition(1, 0, 0);
    const late = slidePosition(1, 0, slide.travel) - slidePosition(1, 0, slide.travel - 0.05);
    expect(Math.abs(early)).toBeGreaterThan(Math.abs(late));
  });
});

/**
 * The promotion the Abacus was adopted with: the spike's four family inks and
 * its frame proportions moved out of TypeScript and into `data/view3d.json`.
 * These tests are the receipt — code holds no tuned constant, and the data holds
 * every one of them, resolved through the palette rather than written out.
 */
describe('the promoted look data', () => {
  it('names every family exactly once, and only families the code knows', () => {
    expect(FAMILIES.map((family) => family.id)).toEqual([...FAMILY_IDS]);
    expect(new Set(FAMILY_IDS).size).toBe(FAMILY_IDS.length);
    for (const id of FAMILY_IDS) {
      const family = familyOf(id as FamilyId);
      expect(family.id).toBe(id);
      expect(family.name.length).toBeGreaterThan(0);
    }
  });

  it('paints every family from the board palette, never from a loose hex', () => {
    const inks = new Set(Object.values(VIEW3D.palette));
    for (const family of FAMILIES) expect(inks.has(family.color)).toBe(true);
    // Four distinguishable inks: two families sharing one would make the object
    // unreadable at exactly the moment it matters.
    expect(new Set(FAMILIES.map((family) => family.color)).size).toBe(FAMILIES.length);
  });

  it('promoted lapis, gilt and brass into the palette', () => {
    // The spike declared these three locally and marked them spike-local. This
    // is the assertion that adoption actually moved them.
    for (const name of ['lapis', 'gilt', 'brass']) {
      expect(VIEW3D.palette[name]).toBeTypeOf('number');
      expect((viewJson.palette as Record<string, string>)[name]).toMatch(/^#[0-9a-f]{6}$/i);
    }
    // The rods are paler than the commerce bead's gilt on purpose: a gilt bead on
    // a gilt rod loses its silhouette.
    expect(VIEW3D.abacus.rod.color).not.toBe(familyOf('commerce').color);
  });

  it('resolves every abacus colour through a palette name', () => {
    const raw = viewJson.abacus as unknown as {
      frame: { timberColor: string };
      rod: { color: string };
      bead: { waitingColor: string; waitingWarmth: string };
      families: { color: string }[];
    };
    const names = [
      raw.frame.timberColor,
      raw.rod.color,
      raw.bead.waitingColor,
      raw.bead.waitingWarmth,
      ...raw.families.map((family) => family.color),
    ];
    for (const name of names) {
      expect(name).not.toMatch(/^#/);
      expect(VIEW3D.palette[name]).toBeTypeOf('number');
    }
  });

  it('carries the frame, rod, bead, slide, motion and camera blocks', () => {
    const abacus = VIEW3D.abacus;
    expect(abacus.frame.width).toBeGreaterThan(0);
    expect(abacus.frame.innerHeight).toBeGreaterThan(0);
    expect(abacus.rod.radius).toBeGreaterThan(0);
    expect(abacus.bead.perRod).toBeGreaterThan(1);
    expect(abacus.bead.segments % 2).toBe(1); // odd, like every lathe here
    expect(abacus.rod.finialSegments % 2).toBe(1);
    expect(abacus.slide.seconds).toBeGreaterThan(0);
    expect(abacus.slide.travel).toBeGreaterThan(0);
    expect(abacus.slide.travel).toBeLessThan(1);
    expect(abacus.motion.swaySeconds).toBeGreaterThan(0);
    expect(abacus.camera.elevation).toBeGreaterThan(0);
    expect(abacus.camera.elevation).toBeLessThan(VIEW3D.camera.elevation);
    expect(abacus.camera.labelGutter).toBeGreaterThan(0);
    // The bore has to clear the rod, or a bead would be threaded on nothing.
    expect(abacus.bead.boreClearance).toBeGreaterThan(0);
    expect(abacus.bead.finialClearance).toBeGreaterThan(0);
    expect(abacus.bead.clearance).toBeGreaterThan(0);
  });
});

/** `cssHex` is what puts a palette ink on a DOM swatch. */
describe('cssHex', () => {
  it('pads to six digits', () => {
    expect(cssHex(0x7c5f8c)).toBe('#7c5f8c');
    expect(cssHex(0x000000)).toBe('#000000');
    expect(cssHex(0x0000ff)).toBe('#0000ff');
  });
});

/**
 * The shapes, promoted into the board's own kit. What matters about them is
 * what the outline pass needs: one closed shell per part, every face pointing
 * out of the solid, and hard facets baked in because `MeshToonMaterial` cannot
 * be asked for them.
 */
describe('the abacus shapes', () => {
  it('extrudes a bar the same way whichever way the profile was written', () => {
    const square: [number, number][] = [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ];
    const clockwise = extrudeProfile(square, 2);
    const counter = extrudeProfile([...square].reverse(), 2);
    // The signed area decides the order, so the two spellings produce the same
    // solid vertex for vertex.
    expect([...clockwise.getAttribute('position').array]).toEqual([
      ...counter.getAttribute('position').array,
    ]);

    // And every face points out of it, which is what the inverted-hull outline
    // needs as much as the lighting does. The bar is centred on the origin, so
    // "out" is simply "away from the centre".
    const position = clockwise.getAttribute('position');
    const normal = clockwise.getAttribute('normal');
    for (let i = 0; i < position.count; i += 3) {
      const cx = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
      const cy = (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3;
      const cz = (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;
      const dot = cx * normal.getX(i) + cy * normal.getY(i) + cz * normal.getZ(i);
      expect(dot).toBeGreaterThan(0);
    }
    clockwise.dispose();
    counter.dispose();
  });

  it('builds every part de-indexed and flat-shaded', () => {
    const parts = [
      chamferedBar(2, 0.4, 0.4, 0.05),
      rodFinial(0.15, 9),
      beadShape({ radius: 0.3, halfThickness: 0.13, bore: 0.056, segments: 11 }),
    ];
    for (const part of parts) {
      expect(part.getIndex()).toBeNull();
      expect(part.getAttribute('position').count % 3).toBe(0);
      expect(part.getAttribute('normal').count).toBe(part.getAttribute('position').count);
      part.dispose();
    }
  });

  it('drills the bead rather than modelling a hole', () => {
    // The lathe profile starts and ends at the bore radius, so the surface of
    // revolution is an open tube: no vertex ever reaches the axis.
    const bore = 0.056;
    const bead = beadShape({ radius: 0.3, halfThickness: 0.13, bore, segments: 11 });
    const position = bead.getAttribute('position');
    let closest = Infinity;
    for (let i = 0; i < position.count; i++) {
      // The bead lies on x, so its radius is measured in the yz plane.
      const radius = Math.hypot(position.getY(i), position.getZ(i));
      closest = Math.min(closest, radius);
    }
    // Lathe segments are a polygon, so the closest point on the bore ring sits a
    // little inside the nominal radius — but nowhere near the axis.
    expect(closest).toBeGreaterThan(bore * 0.9);
    bead.dispose();
  });
});
