import { describe, expect, it } from 'vitest';

import {
  DEVICE_MARKS,
  pantheonMark,
  pantheonMarkSvg,
  religionAxes,
  religionDevice,
} from '../../src/art/pantheonMarks';
import { deviceLayout } from '../../src/render3d/cities3d';
import { MARK_BOX, MARK_STROKE } from '../../src/art/resourceMarks';
import {
  BELIEF_AXES,
  BELIEF_IDS,
  type BeliefId,
  beliefDef,
  isPantheonBeliefId,
} from '../../src/sim/religionData';

/**
 * The ten pantheon signs, and the devices they compose into.
 *
 * The set is *the* reason a religion can print anything at all on a banner: the
 * atlas is rasterised once, before any game state exists, so there is nothing
 * fixed to bake a cell per faith of. Everything below is about the two
 * properties that makes possible — the set is total over the axes, and the
 * composition is a pure function of the pantheon.
 */
describe('the pantheon marks', () => {
  it('draws every axis, and nothing empty', () => {
    // Total by type, like `siteMark` and unlike the resource table: `BeliefAxis`
    // is a closed union, so there is no fallback arm to reach and an axis with
    // no drawing would rasterise a blank cell on a banner.
    for (const axis of BELIEF_AXES) {
      const mark = pantheonMark(axis);
      expect(mark.paths.length, axis).toBeGreaterThan(0);
      expect(mark.note.length, axis).toBeGreaterThan(0);
      for (const path of mark.paths) expect(path.d.length, axis).toBeGreaterThan(0);
    }
  });

  it('keeps every sign inside the house grid it is drawn on', () => {
    // The grid is shared with the heraldry and the sites (`MARK_BOX`), and a
    // sign that ran outside it would be clipped by its atlas cell rather than
    // shrunk — a mark with a flat side is the shape of that bug.
    //
    // Absolute commands only. A `dot` is `M` plus two *relative* arcs whose
    // deltas are legitimately negative, and a scan that read those as
    // coordinates would be measuring a diameter against the box. Every axis has
    // absolute ink in it, so nothing here goes unmeasured.
    const absolute = /[MLCVHQS]((?:\s*-?\d+(?:\.\d+)?)+)/g;
    for (const axis of BELIEF_AXES) {
      let measured = 0;
      for (const path of pantheonMark(axis).paths) {
        for (const [, run] of path.d.matchAll(absolute)) {
          for (const raw of run!.trim().split(/[\s,]+/)) {
            const value = Number(raw);
            expect(value, `${axis} ${path.d}`).toBeGreaterThanOrEqual(-1);
            expect(value, `${axis} ${path.d}`).toBeLessThanOrEqual(MARK_BOX + 1);
            measured++;
          }
        }
      }
      expect(measured, `${axis} has no absolute ink to measure`).toBeGreaterThan(0);
    }
  });

  it('emits an SVG at the house weight, like every other mark in the hand', () => {
    const svg = pantheonMarkSvg('stone', '#123456');
    expect(svg).toContain(`viewBox="0 0 ${MARK_BOX} ${MARK_BOX}"`);
    expect(svg).toContain(`stroke-width="${MARK_STROKE}"`);
    expect(svg).toContain('#123456');
  });
});

/**
 * The composition, which is the half a banner actually reads.
 *
 * A religion is founded mid-game out of whatever its founder consecrated, so the
 * device has to be a pure function of that pantheon — the same on both seats'
 * boards, in a replay, and on the gallery page — and it has to be the *same*
 * derivation the faith's generated name is made of, or a religion would be named
 * after one thing and drawn as another.
 */
describe('a religion’s device', () => {
  it('is the pantheon’s axes, first appearance winning', () => {
    // `generateReligionName`'s own reading (`src/sim/religion.ts`), which does
    // not return its list — this is the second reader of the same rule and the
    // reason it is pinned here rather than trusted.
    const hearth = BELIEF_IDS.filter((id) => beliefDef(id).axis === 'hearth');
    expect(hearth.length).toBeGreaterThan(1);
    // Two gods of one thread are one sign, not two.
    expect(religionAxes(hearth)).toEqual(['hearth']);

    const stone = BELIEF_IDS.find((id) => beliefDef(id).axis === 'stone')!;
    expect(religionAxes([hearth[0]!, stone, hearth[1]!])).toEqual(['hearth', 'stone']);
    // Consecration order, not table order: the device says what an empire took
    // first.
    expect(religionAxes([stone, hearth[0]!])).toEqual(['stone', 'hearth']);
  });

  it('answers the neutral thread for a pantheon with nothing in it', () => {
    // Unreachable from the verb — a religion is founded on at least one god —
    // and the name generator falls back the same way, so a hand-edited save
    // draws a lozenge rather than throwing inside a rebuild.
    expect(religionAxes([])).toEqual(['none']);
    expect(religionDevice([])).toEqual(['none']);
  });

  it('caps a device at three signs however many gods a faith holds', () => {
    const wide: BeliefId[] = [];
    const seen = new Set<string>();
    for (const id of BELIEF_IDS) {
      if (!isPantheonBeliefId(id)) continue;
      const axis = beliefDef(id).axis;
      if (seen.has(axis)) continue;
      seen.add(axis);
      wide.push(id);
    }
    expect(wide.length).toBeGreaterThan(DEVICE_MARKS);
    expect(religionDevice(wide)).toHaveLength(DEVICE_MARKS);
    // And it is the *first* three, which is the identity a faith has held
    // longest rather than a hash of the whole hand.
    expect(religionDevice(wide)).toEqual(religionAxes(wide).slice(0, DEVICE_MARKS));
  });

  it('is deterministic: the same pantheon draws the same device, always', () => {
    // The whole reason there is no rng and no hashing in this derivation. Two
    // seats' boards, a replay and the gallery all draw one device for one faith.
    const pantheon = BELIEF_IDS.filter(isPantheonBeliefId).slice(0, 5);
    const once = religionDevice(pantheon);
    for (let i = 0; i < 5; i++) expect(religionDevice([...pantheon])).toEqual(once);
    // And it depends on nothing but the list: a copy is the same device.
    expect(religionDevice(pantheon.slice())).toEqual(once);
  });
});

/**
 * Where the signs sit on the canton — `yieldRowLayout`'s bargain one device
 * over: the arithmetic that decides whether a device is legible, held still
 * where an instance matrix cannot be.
 */
describe('deviceLayout', () => {
  it('puts a lone sign dead centre', () => {
    expect(deviceLayout(1)).toEqual([{ x: 0, y: 0 }]);
    // Zero is not a device the banner ever asks for, and it answers rather than
    // throwing: a device drawn for a hand-edited save is not worth a crash.
    expect(deviceLayout(0)).toEqual([{ x: 0, y: 0 }]);
  });

  it('marshals two side by side and three point-up', () => {
    const pair = deviceLayout(2);
    expect(pair).toHaveLength(2);
    expect(pair[0]!.y).toBe(0);
    expect(pair[1]!.y).toBe(0);
    expect(pair[0]!.x).toBe(-pair[1]!.x);

    const three = deviceLayout(3);
    expect(three).toHaveLength(3);
    // Point up: one sign above the centre, two below it, mirrored across x.
    expect(three[0]!.x).toBe(0);
    expect(three[0]!.y).toBeGreaterThan(0);
    expect(three[1]!.y).toBeLessThan(0);
    expect(three[2]!.y).toBe(three[1]!.y);
    expect(three[1]!.x).toBe(-three[2]!.x);
  });

  it('keeps every seat on the unit circle, so the spread is one number', () => {
    // The seats are in units of `deviceMarkSpread`, so a triangle whose legs
    // were longer than its apex would make one tunable mean two distances.
    for (const count of [2, 3]) {
      for (const seat of deviceLayout(count)) {
        expect(Math.hypot(seat.x, seat.y)).toBeCloseTo(1, 6);
      }
    }
  });

  it('clamps past three rather than throwing', () => {
    expect(deviceLayout(9)).toEqual(deviceLayout(3));
  });
});
