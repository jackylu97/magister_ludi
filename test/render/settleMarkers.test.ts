/**
 * **The settler lens's recommendation marker** — `docs/flags.md` item (ttttt).
 *
 * The user: *"It should only appear in the settler lens."* That sentence is the
 * whole of this file's first claim, and it is the kind of claim that quietly
 * stops being true: a layer that draws off a reading rather than off a lens mode
 * would keep drawing the day somebody moved the call, and nothing else on the
 * board would complain.
 *
 * Four claims:
 *
 *   1. **Only with a settler in hand.** The marker is drawn in the `settler`
 *      lens and in no other, and not on the plain board.
 *   2. **Never on ground the rules refuse.** The mark stands only on hexes
 *      `foundingErrorAt` passes — asked of the simulation here rather than of
 *      the layer, so the two cannot drift.
 *   3. **Never on a hex the fog view has not charted.** Two gates, and this is
 *      the second one: the reading asks the seat's own chart, the layer asks the
 *      *fog view being painted* — which is a different question the moment the
 *      board is painted for a spectator.
 *   4. **Every instance carries its `tile:`**, which is what
 *      `test/render/fog3d.test.ts` audits dressing for.
 */

import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';

import type { TileIcons } from '../../src/render3d/badges3d';
import { BoardGeometry } from '../../src/render3d/board3d';
import { cellCenter } from '../../src/render3d/layout';
import { LensLayer, NO_LENS } from '../../src/render3d/lens3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { MaterialLibrary } from '../../src/render3d/toon';
import { foundCityAt, foundingErrorAt } from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { readSites } from '../../src/sim/readings';
import { bumpRevision, type GameState, newGame } from '../../src/sim/state';
import { EXPLORED, HIDDEN, resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import type { LensMode, LensView } from '../../src/ui/mapView';

/** The layer's own source, for the register assertion at the foot of this file. */
const LENS_SOURCE = (await import('../../src/render3d/lens3d.ts?raw')).default as string;

const geometry = new BoardGeometry();
const mats = (): MaterialLibrary => new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
const fakeIcons = {
  material: new MeshBasicMaterial(),
  standingMaterial: new MeshBasicMaterial(),
} as unknown as TileIcons;
const scratch = new Matrix4();

function lens(overrides: Partial<LensView> = {}): LensView {
  return { ...NO_LENS, ...overrides };
}

/**
 * Open ground, one seat, one settler in the middle with three luxuries in its
 * ring, one town of its own in the corner, and the whole map on its chart.
 *
 * The luxuries are there because a flat grassland board recommends **nothing** —
 * the reading's floor is what stops the marker pointing at the least bad hex of
 * a bad continent — and the town is there so the spacing rule has something to
 * refuse, which is the claim the third test makes.
 */
function board(): GameState {
  const state = newGame({
    seed: 4,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 12, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.cities = [];
  state.camps = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  for (const tile of state.map.tiles) delete tile.discovery;
  computeFreshwater(state.map);
  // Three seams no technology gates, so the ring reads them from turn one.
  const seams = [
    ['silk', 5, 4],
    ['wine', 7, 4],
    ['gems', 6, 6],
  ] as const;
  for (const [id, col, row] of seams) getTileAt(state.map, col, row)!.resource = id;
  // One settler of seat 0, standing in the middle: the anchor the sweep looks
  // out from, and the piece whose selection raises this lens in the first place.
  const settler = state.units.find((unit) => unit.ownerId === 0);
  if (settler) {
    settler.col = 6;
    settler.row = 5;
    state.units = [settler];
  }
  // A town of its own in the far corner: the spacing rule's own refusal, and the
  // second anchor the sweep looks out from.
  foundCityAt(state, 0, getTileAt(state.map, 1, 1)!);
  state.visibility[0]!.fill(EXPLORED);
  bumpRevision(state);
  return state;
}

function build(state: GameState, mode: LensMode, levels: number[] | null = null): LensLayer {
  const layer = new LensLayer();
  layer.build(state, lens({ mode }), geometry, mats(), fakeIcons, new Quaternion(), levels);
  return layer;
}

/** Where every settle mark stands, as `col,row`, read off the baked matrices. */
function markedCells(state: GameState, layer: LensLayer): string[] {
  const quad = geometry.settleMarkers.goodSite;
  const at = new Vector3();
  const out: string[] = [];
  for (const child of layer.group.children) {
    if (!(child instanceof InstancedMesh) || child.geometry !== quad) continue;
    for (let index = 0; index < child.count; index++) {
      child.getMatrixAt(index, scratch);
      at.setFromMatrixPosition(scratch);
      for (const tile of state.map.tiles) {
        const centre = cellCenter(tile.col, tile.row);
        if (
          Math.abs(at.x - (centre.x + VIEW3D.lens.settleMarkOffsetX)) < 1e-6 &&
          Math.abs(at.z - (centre.z - VIEW3D.lens.settleMarkOffset)) < 1e-6
        ) {
          out.push(`${tile.col},${tile.row}`);
        }
      }
    }
  }
  return out;
}

describe('the recommendation marker', () => {
  it('stands only in the settler lens', () => {
    const state = board();
    // The reading has something to say about this board, or the rest of this
    // file is green for the wrong reason.
    expect(readSites(state, 0).length).toBeGreaterThan(0);
    expect(markedCells(state, build(state, 'settler')).length).toBeGreaterThan(0);
    for (const mode of ['none', 'explorer', 'faith'] as const) {
      expect(markedCells(state, build(state, mode)), mode).toEqual([]);
    }
  });

  it('stands on the hexes the simulation recommended, and on no others', () => {
    const state = board();
    const recommended = new Set(readSites(state, 0).map((row) => `${row.col},${row.row}`));
    const drawn = new Set(markedCells(state, build(state, 'settler')));
    expect([...drawn].sort()).toEqual([...recommended].sort());
  });

  it('never stands on ground the rules would refuse a city on', () => {
    const state = board();
    for (const cell of new Set(markedCells(state, build(state, 'settler')))) {
      const [col, row] = cell.split(',').map(Number);
      const tile = getTileAt(state.map, col!, row!)!;
      expect(foundingErrorAt(state, 0, tile), cell).toBeNull();
    }
  });

  it('never stands on a hex the fog view being painted has not charted', () => {
    const state = board();
    // The seat's own chart is full — the *view* is the one that is black, which
    // is the spectator's case and the one the layer's own gate is for.
    const levels = new Array<number>(state.map.tiles.length).fill(HIDDEN);
    expect(markedCells(state, build(state, 'settler', levels))).toEqual([]);
    // Open one recommended hex in the view and exactly that one comes back.
    const first = readSites(state, 0)[0]!;
    levels[tileIndex(state.map, first.col, first.row)] = EXPLORED;
    expect(new Set(markedCells(state, build(state, 'settler', levels)))).toEqual(
      new Set([`${first.col},${first.row}`]),
    );
  });

  it('carries a tile on every instance it adds', () => {
    // CLAUDE.md's rule for new dressing: an instance with no `tile:` is an
    // instance the fog sweep cannot find. Read off the **source**, because the
    // collector hands its `byTile` index to the flush and the layer keeps
    // neither — a name is a fact about the file, which is the same argument
    // `test/sim/verbs.test.ts` is written on.
    const source = LENS_SOURCE;
    const at = source.indexOf('private addSettleMarkers');
    expect(at, 'addSettleMarkers is gone from lens3d.ts').toBeGreaterThan(0);
    const body = source.slice(at, source.indexOf('\n  private ', at + 10));
    const adds = body.match(/collector\.add\(/g) ?? [];
    expect(adds.length, 'the marker adds a pin and a mark').toBe(2);
    expect(body.match(/tile: cell/g) ?? [], 'every add carries a tile').toHaveLength(2);
  });
});
