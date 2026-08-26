import { describe, expect, it } from 'vitest';
import { InstancedMesh, MeshBasicMaterial, Quaternion } from 'three';

import {
  HERALDRY_IDS,
  type HeraldryId,
  heraldryFor,
  heraldryMark,
  heraldryMarkDataUri,
  heraldryMarkSvg,
} from '../../src/art/heraldryMarks';
import {
  DRACONES_LINES,
  DRACONES_TEXT,
  MARGINALIA_MARK_IDS,
  marginaliaMark,
  marginaliaMarkDataUri,
} from '../../src/art/marginaliaMarks';
import { MARK_BOX, MARK_STROKE } from '../../src/art/resourceMarks';
import { type TileIcons, type UnitBadges, CHARGE_CELLS } from '../../src/render3d/badges3d';
import { BoardGeometry } from '../../src/render3d/board3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { UnitLayer } from '../../src/render3d/pieces';
import { MaterialLibrary } from '../../src/render3d/toon';
import { createMap } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';

/**
 * Heraldry: the twelve charges a seat can fly, and the chart's two marginalia
 * beside them.
 *
 * The set exists because a player was a *colour* and nothing else, which fails a
 * colourblind player outright and fails everybody at a glance. What is defended
 * here is what makes the set actually work, which is not "twelve pictures
 * exist":
 *
 *   the drawings are one hand   same grid, same weight, same emitter as the
 *                               resources and the sites. A charge in a
 *                               different weight is a charge that reads as a
 *                               different *kind* of thing.
 *   the fallback is total       a seat that named no charge still has one, by
 *                               seat order, exactly as it has a colour. That is
 *                               what let heraldry ship without a line changing
 *                               in setup.
 *   the printers agree          the board's atlas and the DOM's mask come off
 *                               the same paths. One drawing, three printers.
 */

// --- the drawings -----------------------------------------------------------

describe('the charges are one hand with the rest of the marks', () => {
  it('draws twelve of them, and every id has a drawing', () => {
    expect(HERALDRY_IDS).toHaveLength(12);
    expect(new Set(HERALDRY_IDS).size).toBe(HERALDRY_IDS.length);
    for (const id of HERALDRY_IDS) {
      const mark = heraldryMark(id);
      expect(mark.paths.length, id).toBeGreaterThan(0);
      expect(mark.note.length, id).toBeGreaterThan(0);
      for (const path of mark.paths) expect(path.d.length, id).toBeGreaterThan(0);
    }
  });

  /**
   * Every point a stroke passes through, inside the 64 × 64 grid.
   *
   * The failure this catches is invisible in code review and obvious on the
   * board: a path that runs past the box is clipped by its atlas cell, so a stag
   * loses an antler at one zoom and keeps it at another. Checked by walking the
   * path data rather than by rasterising, because a canvas is not available here
   * and the numbers are the thing being got right.
   *
   * `pathPoints` is deliberately a *walker* and not a regex over every number in
   * the string, which is the obvious version and is wrong: an arc's `rx`, its
   * flags and a relative segment's deltas are not coordinates, and a `-4.8`
   * meaning "eight tenths of the way back round this circle" would fail a bounds
   * check it has nothing to do with.
   *
   * It is an approximation in one stated direction — it records the points a
   * path is *pinned* to (its nodes and its Bézier handles) rather than solving
   * for the extremes of the curves between them, so a circle's top and a
   * crescent's belly are bounded only by the handles either side of them. That
   * is enough for what this is for: a mark that overruns the grid does so by a
   * node, because the nodes are what a person types.
   */
  function pathPoints(d: string): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    let x = 0;
    let y = 0;
    // One command letter and the run of numbers after it.
    for (const [, letter, args] of d.matchAll(/([MLCQAHVZmlcqahvz])([^MLCQAHVZmlcqahvz]*)/g)) {
      const n = (args ?? '').match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
      switch (letter) {
        case 'M':
        case 'L':
        case 'C':
        case 'Q':
          // Every pair is an absolute point — the Bézier handles included, which
          // is conservative and is what makes the approximation above safe.
          for (let i = 0; i + 1 < n.length; i += 2) {
            x = n[i]!;
            y = n[i + 1]!;
            points.push({ x, y });
          }
          break;
        case 'H':
          for (const value of n) x = value;
          points.push({ x, y });
          break;
        case 'V':
          for (const value of n) y = value;
          points.push({ x, y });
          break;
        case 'A':
          // rx ry rotation large-arc sweep x y — only the last pair is a point.
          for (let i = 0; i + 6 < n.length; i += 7) {
            x = n[i + 5]!;
            y = n[i + 6]!;
            points.push({ x, y });
          }
          break;
        case 'a':
          for (let i = 0; i + 6 < n.length; i += 7) {
            x += n[i + 5]!;
            y += n[i + 6]!;
            points.push({ x, y });
          }
          break;
        default:
          break;
      }
    }
    return points;
  }

  it('keeps every stroke inside the grid', () => {
    const margin = MARK_STROKE / 2;
    for (const id of HERALDRY_IDS) {
      for (const path of heraldryMark(id).paths) {
        const points = pathPoints(path.d);
        expect(points.length, `${id}: ${path.d} has no points`).toBeGreaterThan(0);
        for (const point of points) {
          for (const value of [point.x, point.y]) {
            expect(value, `${id}: ${path.d}`).toBeGreaterThanOrEqual(-margin);
            expect(value, `${id}: ${path.d}`).toBeLessThanOrEqual(MARK_BOX + margin);
          }
        }
      }
    }
  });

  /** The same walker over the sea serpent, which shares the grid and the hand. */
  it('keeps the marginalia inside the grid too', () => {
    for (const path of marginaliaMark('serpent').paths) {
      for (const point of pathPoints(path.d)) {
        expect(point.x).toBeGreaterThanOrEqual(-MARK_STROKE / 2);
        expect(point.x).toBeLessThanOrEqual(MARK_BOX + MARK_STROKE / 2);
        expect(point.y).toBeGreaterThanOrEqual(-MARK_STROKE / 2);
        expect(point.y).toBeLessThanOrEqual(MARK_BOX + MARK_STROKE / 2);
      }
    }
  });

  it('emits an SVG on the house grid at the house weight', () => {
    const svg = heraldryMarkSvg('key', '#123456');
    expect(svg).toContain(`viewBox="0 0 ${MARK_BOX} ${MARK_BOX}"`);
    expect(svg).toContain(`stroke-width="${MARK_STROKE}"`);
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).toContain('#123456');
  });

  it('hands the DOM a data URI it can mask, memoised', () => {
    const first = heraldryMarkDataUri('wheel');
    expect(first.startsWith('data:image/svg+xml,')).toBe(true);
    expect(heraldryMarkDataUri('wheel')).toBe(first);
    // Colour is part of the key, or the second surface to ask would get the
    // first one's ink — which is the whole reason this is a mask and not a file.
    expect(heraldryMarkDataUri('wheel', '#fff')).not.toBe(first);
  });
});

// --- the fallback -----------------------------------------------------------

describe('a seat always has a charge', () => {
  it('takes one by seat order when none is named', () => {
    expect(heraldryFor(0)).toBe(HERALDRY_IDS[0]);
    expect(heraldryFor(1)).toBe(HERALDRY_IDS[1]);
    // Round the roster, exactly as `playerPieceColor` does with the twelve
    // fallback colours — which is why the two lists are the same length.
    expect(heraldryFor(HERALDRY_IDS.length)).toBe(HERALDRY_IDS[0]);
    expect(VIEW3D.players.fallbackOrder).toHaveLength(HERALDRY_IDS.length);
  });

  it('honours a charge that was named', () => {
    expect(heraldryFor(0, 'hound')).toBe('hound');
  });

  /**
   * A charge string the build does not know falls **through** to the seat's own
   * rather than throwing. A banner is not worth a crash, and the field is a raw
   * string in the simulation (`PlayerSpec.charge`, uninterpreted like `color`)
   * precisely so a save from a build with a thirteenth charge still loads.
   */
  it('falls through an unknown charge to the seat order', () => {
    expect(heraldryFor(2, 'gryphon')).toBe(HERALDRY_IDS[2]);
    expect(heraldryFor(2, '')).toBe(HERALDRY_IDS[2]);
  });
});

// --- the atlas --------------------------------------------------------------

describe('every charge has a cell and a quad', () => {
  it('gives the board a standing quad per charge', () => {
    const geometry = new BoardGeometry();
    expect(CHARGE_CELLS).toEqual([...HERALDRY_IDS]);
    for (const id of HERALDRY_IDS) {
      expect(geometry.chargeMarkers[id], id).toBeDefined();
      expect(geometry.chargeMarkers[id].getAttribute('uv'), id).toBeDefined();
    }
    // One quad per charge and no sharing: the atlas rectangle is baked into the
    // vertices, so two charges on one geometry would be two seats flying one
    // banner.
    const quads = new Set(HERALDRY_IDS.map((id) => geometry.chargeMarkers[id]));
    expect(quads.size).toBe(HERALDRY_IDS.length);
    geometry.dispose();
  });
});

// --- the crest on a unit badge ---------------------------------------------

const fakeIcons = {
  material: new MeshBasicMaterial(),
  standingMaterial: new MeshBasicMaterial(),
} as unknown as TileIcons;
const fakeBadges = { material: new MeshBasicMaterial() } as unknown as UnitBadges;

function unitState(charge?: string): GameState {
  const state = newGame({
    seed: 4,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#d4502e', isHuman: true, ...(charge ? { charge } : {}) },
      { name: 'B', color: '#1f8a85', isHuman: true },
    ],
  });
  state.map = createMap({ width: 12, height: 8, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(12 * 8).fill(null);
  state.cities = [];
  state.units = [0, 1].map((ownerId) => ({
    id: ownerId + 1,
    type: 'warrior' as const,
    ownerId,
    col: 2 + ownerId * 3,
    row: 3,
    hp: unitDef('warrior').maxHp,
    movesLeft: 2,
    hasAttacked: false,
  }));
  return state;
}

/** Instances of one charge's quad on a built unit layer, all wrap copies. */
function crestsOf(layer: UnitLayer, geometry: BoardGeometry, id: HeraldryId): number {
  let total = 0;
  for (const child of layer.group.children) {
    if (!(child instanceof InstancedMesh)) continue;
    if (child.geometry === geometry.chargeMarkers[id]) total += child.count;
  }
  return total;
}

function buildUnits(state: GameState, icons: TileIcons | null): {
  layer: UnitLayer;
  geometry: BoardGeometry;
} {
  const geometry = new BoardGeometry();
  const layer = new UnitLayer();
  layer.build(
    state,
    geometry,
    new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000),
    new Quaternion(),
    false,
    null,
    fakeBadges,
    null,
    null,
    icons,
  );
  return { layer, geometry };
}

describe('a unit badge carries its seat’s crest', () => {
  it('bosses one crest per unit, in that unit owner’s charge', () => {
    const state = unitState();
    const { layer, geometry } = buildUnits(state, fakeIcons);
    // Two seats, one unit each, three wrap copies: one bucket per charge.
    expect(crestsOf(layer, geometry, HERALDRY_IDS[0]!)).toBe(3);
    expect(crestsOf(layer, geometry, HERALDRY_IDS[1]!)).toBe(3);
    expect(crestsOf(layer, geometry, HERALDRY_IDS[2]!)).toBe(0);
    layer.dispose();
    geometry.dispose();
  });

  it('follows the seat that was configured, not the seat index', () => {
    const state = unitState('sun');
    const { layer, geometry } = buildUnits(state, fakeIcons);
    expect(crestsOf(layer, geometry, 'sun')).toBe(3);
    expect(crestsOf(layer, geometry, HERALDRY_IDS[0]!)).toBe(0);
    layer.dispose();
    geometry.dispose();
  });

  it('draws no crest at all while the atlas is still rasterising', () => {
    const state = unitState();
    const { layer, geometry } = buildUnits(state, null);
    for (const id of HERALDRY_IDS) expect(crestsOf(layer, geometry, id)).toBe(0);
    layer.dispose();
    geometry.dispose();
  });

  /**
   * The crest is a fact about the *owner*, so `signUnits` needed nothing added:
   * a unit changing hands moves `ownerId`, which is already in the fingerprint
   * (see the piece-fingerprint trap in `CLAUDE.md`). Asserted as the behaviour
   * that depends on it — a captured warrior flies its captor's charge.
   */
  it('changes with the unit’s owner', () => {
    const state = unitState();
    state.units[0]!.ownerId = 1;
    const { layer, geometry } = buildUnits(state, fakeIcons);
    expect(crestsOf(layer, geometry, HERALDRY_IDS[0]!)).toBe(0);
    expect(crestsOf(layer, geometry, HERALDRY_IDS[1]!)).toBe(6);
    layer.dispose();
    geometry.dispose();
  });
});

// --- the marginalia ---------------------------------------------------------

describe('the chart’s marginalia are marks like any other', () => {
  it('draws the sea serpent from path data, not a file', () => {
    expect(MARGINALIA_MARK_IDS).toEqual(['serpent']);
    const mark = marginaliaMark('serpent');
    // The five subpaths the vendored SVG had, ported to the coordinate — which
    // is how the port was checked. A sixth would mean somebody redrew it.
    expect(mark.paths).toHaveLength(5);
    expect(marginaliaMarkDataUri('serpent').startsWith('data:image/svg+xml,')).toBe(true);
  });

  it('sets the inscription in two lines that read as one sentence', () => {
    expect(DRACONES_LINES).toEqual(['hic svnt', 'dracones']);
    expect(DRACONES_TEXT).toBe('hic svnt dracones');
    // Lower case in the data; the small caps are the printer's decision. A
    // caller that wants the words for a tooltip wants them as words.
    expect(DRACONES_TEXT).toBe(DRACONES_TEXT.toLowerCase());
  });
});
