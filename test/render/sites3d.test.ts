import { describe, expect, it } from 'vitest';
import { InstancedMesh, MeshBasicMaterial, Quaternion } from 'three';

import type { TileIcons } from '../../src/render3d/badges3d';
import { BoardGeometry, SITE_KINDS, SITE_PROPS } from '../../src/render3d/board3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { SiteLayer, signSites } from '../../src/render3d/sites3d';
import { MaterialLibrary } from '../../src/render3d/toon';
import { type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { DISCOVERY_KINDS } from '../../src/sim/discoveryData';
import { computeFreshwater } from '../../src/sim/water';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';

/**
 * The board's half of the sites: the ruin, the village, the camp.
 *
 * Three things are being defended, and the third is the one that is specific to
 * this layer rather than inherited from the improvements layer it is patterned
 * on:
 *
 *   1. **The registry closes in both directions.** `Record<SiteKind, …>` makes a
 *      missing sculpt a compile error; nothing but a test makes a sculpt nobody
 *      asks for visible, or catches two kinds sharing one shape — which would be
 *      the worst outcome here, because the whole design of the three sculpts is
 *      that they are *tellable apart* (see their docblocks in `geometry.ts`).
 *   2. **Fog applies on rebuild.** `FogView` patches the board's buffers and
 *      knows nothing about this group, so a layer rebuilt on remembered ground
 *      would come up lit and stay lit.
 *   3. **One fog rule, and all three tenants take it.** A ruin, a village and —
 *      since the 2026-08-27 ruling — a barbarian camp are all *ground*: drawn on
 *      any hex the seat has charted, washed on the ones it merely remembers, and
 *      absent only where nobody has been. The camp used to follow the unit rule
 *      instead and the pin below moved with the ruling rather than around it, so
 *      the suite states the new reading rather than describing the old one.
 */

function materials(): MaterialLibrary {
  return new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
}

/**
 * A stand-in for the icon atlas.
 *
 * `TileIcons.load` needs a 2D canvas and this suite has no jsdom, so what is
 * passed in is the two materials the layer actually touches. That is enough for
 * every claim made about the markers here — how many there are, which bucket
 * they land in, and whether they come and go with their props — because none of
 * those is a claim about the *picture*. What the marks look like is
 * `resources3d.ts`'s subject.
 */
const fakeIcons = {
  material: new MeshBasicMaterial(),
  standingMaterial: new MeshBasicMaterial(),
} as unknown as TileIcons;

function flatState(width = 10, height = 8): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [{ name: 'A', color: '#a00', isHuman: true }],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  for (const tile of state.map.tiles) delete tile.discovery;
  computeFreshwater(state.map);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function meshesOf(group: { children: unknown[] }): InstancedMesh[] {
  return group.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh);
}

/**
 * Every instance colour the layer wrote, as printable strings.
 *
 * The observable half of `setWash`: a washed instance and a lit one differ in
 * this attribute and in nothing else a test can reach, so "more than one colour
 * on the board" is what "the fog pass ran on some of them" looks like from
 * outside. Shared by the ruin and camp wash tests rather than written twice —
 * they are the same claim about two tenants of one rule.
 */
function instanceColours(layer: SiteLayer): string[] {
  return meshesOf(layer.group).flatMap((mesh) => {
    const attribute = mesh.instanceColor;
    if (!attribute) return [] as string[];
    const out: string[] = [];
    for (let i = 0; i < attribute.count; i++) {
      out.push(
        `${attribute.getX(i).toFixed(4)},${attribute.getY(i).toFixed(4)},${attribute
          .getZ(i)
          .toFixed(4)}`,
      );
    }
    return out;
  });
}

/** A grid at one level everywhere, with named exceptions. */
function levels(state: GameState, base: number, except: Record<string, number> = {}): number[] {
  const grid = new Array<number>(state.map.tiles.length).fill(base);
  for (const [key, level] of Object.entries(except)) {
    const [col, row] = key.split(',').map(Number);
    grid[tileIndex(state.map, col!, row!)] = level;
  }
  return grid;
}

describe('the site prop registry', () => {
  const geometry = new BoardGeometry();

  it('has a sculpt for every kind, and a kind for every sculpt', () => {
    // The forward direction is a compile error (`Record<SiteKind, …>`); this is
    // the one the type system cannot see.
    expect(Object.keys(SITE_PROPS).sort()).toEqual([...SITE_KINDS].sort());
    for (const kind of SITE_KINDS) {
      expect(geometry.siteProps[kind]).toBeDefined();
      expect(VIEW3D.sites.props[kind]).toBeDefined();
    }
  });

  it('draws three shapes that are not each other', () => {
    // The design of the set is that a player can tell a ruin from a village
    // from a camp at the ortho camera, under the fog wash. Two kinds sharing a
    // sculpt would compile, draw, and be indistinguishable — so the vertex
    // counts are asserted to differ, which is the cheapest true proxy for
    // "these are three drawings".
    const counts = SITE_KINDS.map(
      (kind) => geometry.siteProps[kind].getAttribute('position').count,
    );
    expect(new Set(counts).size).toBe(SITE_KINDS.length);
  });
});

describe('drawing sites', () => {
  it('puts one instance on each site and each camp', () => {
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    at(state, 5, 3).discovery = 'village';
    state.camps.push({ col: 7, row: 5, foundedTurn: 1 });

    const layer = new SiteLayer();
    layer.build(state, new BoardGeometry(), materials(), false, levels(state, VISIBLE));
    expect(layer.instances).toBe(3);
    expect(meshesOf(layer.group).length).toBeGreaterThan(0);
    layer.dispose();
  });

  it('draws nothing at all on an empty board', () => {
    const state = flatState();
    const layer = new SiteLayer();
    layer.build(state, new BoardGeometry(), materials(), false, levels(state, VISIBLE));
    expect(layer.instances).toBe(0);
    layer.dispose();
  });

  it('keeps a ruin on remembered ground and hides it on unexplored ground', () => {
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    const layer = new SiteLayer();
    const geometry = new BoardGeometry();

    layer.build(state, geometry, materials(), false, levels(state, EXPLORED));
    expect(layer.instances).toBe(1);

    layer.build(state, geometry, materials(), false, levels(state, HIDDEN));
    expect(layer.instances).toBe(0);
    layer.dispose();
  });

  it('keeps a camp on remembered ground, like a ruin', () => {
    // The ruling (playtest 2026-08-27): a camp is a thing a player plans a march
    // against, and a mark that erased itself when the scout who found it walked
    // home could not be planned against. Same three levels as the ruin above,
    // and deliberately the same three answers.
    const state = flatState();
    state.camps.push({ col: 7, row: 5, foundedTurn: 1 });
    const layer = new SiteLayer();
    const geometry = new BoardGeometry();

    layer.build(state, geometry, materials(), false, levels(state, VISIBLE));
    expect(layer.instances).toBe(1);

    layer.build(state, geometry, materials(), false, levels(state, EXPLORED));
    expect(layer.instances).toBe(1);

    layer.build(state, geometry, materials(), false, levels(state, HIDDEN));
    expect(layer.instances).toBe(0);
    layer.dispose();
  });

  it('takes a cleared camp off the board on remembered ground too', () => {
    // The other end of the ruling, and the thing that keeps "persistent" from
    // meaning "permanent": the layer draws `state.camps`, so a palisade that has
    // been burnt out is gone from the chart at the next rebuild whether or not
    // the seat is looking at the hex. That is exactly a ruin's reading — a site
    // claimed by a rival goes dark on every board — and it is the honest one for
    // a renderer whose only per-seat memory is a fog level per hex.
    const state = flatState();
    state.camps.push({ col: 7, row: 5, foundedTurn: 1 });
    const layer = new SiteLayer();
    const geometry = new BoardGeometry();

    layer.build(state, geometry, materials(), false, levels(state, EXPLORED));
    expect(layer.instances).toBe(1);

    state.camps.length = 0;
    layer.build(state, geometry, materials(), false, levels(state, EXPLORED));
    expect(layer.instances).toBe(0);
    layer.dispose();
  });

  it('washes a remembered camp rather than leaving it lit', () => {
    // The consequence the old rule made unreachable: a camp could never be drawn
    // on `EXPLORED` ground, so the fog pass had nothing to do to one. It does
    // now, and it needed no edit to do it — the pass was always written over the
    // whole map rather than over the ruins alone.
    const state = flatState();
    state.camps.push({ col: 2, row: 2, foundedTurn: 1 });
    state.camps.push({ col: 6, row: 2, foundedTurn: 1 });
    const layer = new SiteLayer();
    layer.build(
      state,
      new BoardGeometry(),
      materials(),
      false,
      levels(state, VISIBLE, { '2,2': EXPLORED }),
    );
    expect(new Set(instanceColours(layer)).size).toBeGreaterThan(1);
    layer.dispose();
  });

  it('draws everything when there is no fog at all', () => {
    // The look-dev pages have no seat to hide anything from, and `levels` is
    // null there. Everything is drawn, which is the honest reading.
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    state.camps.push({ col: 7, row: 5, foundedTurn: 1 });
    const layer = new SiteLayer();
    layer.build(state, new BoardGeometry(), materials(), false, null);
    expect(layer.instances).toBe(2);
    layer.dispose();
  });

  it('washes a remembered ruin rather than leaving it lit', () => {
    // The failure mode that looks like a feature until somebody notices the
    // frontier glowing: a rebuilt layer comes up at full brightness unless it
    // paints its own fog.
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    at(state, 6, 2).discovery = 'ruins';
    const layer = new SiteLayer();
    layer.build(
      state,
      new BoardGeometry(),
      materials(),
      false,
      levels(state, VISIBLE, { '2,2': EXPLORED }),
    );

    // The washed instance's colour differs from the lit one's, which is the
    // observable consequence of `setWash` having run on exactly one of them.
    expect(new Set(instanceColours(layer)).size).toBeGreaterThan(1);
    layer.dispose();
  });
});

/**
 * The standing markers, and the one rule that is specific to them: a marker is
 * part of its site rather than a lens the player switches on, so it appears,
 * fades and *disappears* with the prop it labels. See the module docblock in
 * `sites3d.ts` for why they are drawn by this layer at all.
 */
describe('the standing site markers', () => {
  it('plants one over every ruin and village, and none over a camp', () => {
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    at(state, 5, 3).discovery = 'village';
    state.camps.push({ col: 7, row: 5, foundedTurn: 1 });

    const layer = new SiteLayer();
    layer.build(
      state,
      new BoardGeometry(),
      materials(),
      false,
      levels(state, VISIBLE),
      fakeIcons,
      new Quaternion(),
    );
    // Three props, two markers: a camp wears no paper. The prop is a palisade
    // and reads as one; the pin exists because a broken column at game zoom is
    // three grey shapes among the boulders it was carved to look like.
    expect(layer.instances).toBe(3);
    expect(layer.markers).toBe(2);
    layer.dispose();
  });

  it('draws no marker at all until the icon atlas is ready', () => {
    // The props still stand; only the labels wait. Matching the resource lens,
    // which draws nothing under the same condition rather than a blank disc.
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    const layer = new SiteLayer();
    layer.build(state, new BoardGeometry(), materials(), false, levels(state, VISIBLE));
    expect(layer.instances).toBe(1);
    expect(layer.markers).toBe(0);
    layer.dispose();
  });

  it('carries its prop\'s fog rule onto remembered ground', () => {
    // Remembered ground keeps its marker — a chart records a ruin the way it
    // records a coastline — and unexplored ground has none.
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    const layer = new SiteLayer();
    const geometry = new BoardGeometry();

    layer.build(state, geometry, materials(), false, levels(state, EXPLORED), fakeIcons);
    expect(layer.markers).toBe(1);

    layer.build(state, geometry, materials(), false, levels(state, HIDDEN), fakeIcons);
    expect(layer.markers).toBe(0);
    layer.dispose();
  });

  /**
   * The claim, which is the whole reason the markers live in this layer.
   *
   * `claimDiscoveryAt` deletes `tile.discovery`, and prop and marker are both
   * built from that one field in one pass, so there is no arrangement of
   * rebuilds in which a pin outlives the ruin it was planted over.
   */
  it('takes the marker away with the prop when the site is claimed', () => {
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    const layer = new SiteLayer();
    const geometry = new BoardGeometry();

    layer.build(state, geometry, materials(), false, levels(state, VISIBLE), fakeIcons);
    expect(layer.instances).toBe(1);
    expect(layer.markers).toBe(1);

    delete at(state, 2, 2).discovery;
    layer.build(state, geometry, materials(), false, levels(state, VISIBLE), fakeIcons);
    expect(layer.instances).toBe(0);
    expect(layer.markers).toBe(0);
    layer.dispose();
  });

  it('prints each kind from its own atlas cell, on the shared printed material', () => {
    // Two kinds must not share a quad: they would compile, draw, and label a
    // village as a ruin. The geometries come from `tileIconRect`, so distinct
    // cells are distinct buffers.
    const geometry = new BoardGeometry();
    const quads = DISCOVERY_KINDS.map((kind) => geometry.siteMarkers[kind]);
    expect(new Set(quads).size).toBe(DISCOVERY_KINDS.length);

    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    at(state, 5, 3).discovery = 'village';
    const layer = new SiteLayer();
    layer.build(state, geometry, materials(), false, levels(state, VISIBLE), fakeIcons);

    const printed = meshesOf(layer.group).filter(
      (mesh) => mesh.material === fakeIcons.standingMaterial,
    );
    expect(printed).toHaveLength(DISCOVERY_KINDS.length);
    for (const mesh of printed) expect(quads).toContain(mesh.geometry);
    layer.dispose();
  });

  /**
   * The wash contract, from both ends: the pin is ink and fades with the ground,
   * the paper is a printed bucket and `setWash` declines it outright. A greyed
   * roundel would be the fog knocking back a *picture*, which is the failure
   * `Bucket.material` exists to prevent.
   */
  it('fades a remembered marker\'s pin and leaves its paper legible', () => {
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    const layer = new SiteLayer();
    layer.build(
      state,
      new BoardGeometry(),
      materials(),
      false,
      levels(state, EXPLORED),
      fakeIcons,
    );

    const printed = meshesOf(layer.group).filter(
      (mesh) => mesh.material === fakeIcons.standingMaterial,
    );
    expect(printed).toHaveLength(1);
    // A printed bucket never even gets a colour attribute to knock back.
    expect(printed[0]!.instanceColor).toBeNull();

    // Something in the layer *was* washed, which is the other half of the claim:
    // the pass ran, and skipped only the print.
    const washed = meshesOf(layer.group).some((mesh) => {
      const colors = mesh.instanceColor;
      if (!colors) return false;
      for (let i = 0; i < colors.count; i++) {
        if (colors.getX(i) !== 1 || colors.getY(i) !== 1 || colors.getZ(i) !== 1) return true;
      }
      return false;
    });
    expect(washed).toBe(true);
    layer.dispose();
  });
});

describe('the fingerprint', () => {
  it('moves when a site is claimed, and when a camp appears or is cleared', () => {
    const state = flatState();
    const bare = signSites(state);

    at(state, 2, 2).discovery = 'ruins';
    const withRuin = signSites(state);
    expect(withRuin).not.toBe(bare);

    // A claim consumes the site, so the board has to be told.
    delete at(state, 2, 2).discovery;
    expect(signSites(state)).toBe(bare);

    state.camps.push({ col: 7, row: 5, foundedTurn: 1 });
    const withCamp = signSites(state);
    expect(withCamp).not.toBe(bare);
    state.camps.length = 0;
    expect(signSites(state)).toBe(bare);
  });

  it('tells a ruin from a village on the same hex', () => {
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    const ruins = signSites(state);
    at(state, 2, 2).discovery = 'village';
    expect(signSites(state)).not.toBe(ruins);
  });

  it('tells two camps apart by where they are', () => {
    const a = flatState();
    a.camps.push({ col: 7, row: 5, foundedTurn: 1 });
    const b = flatState();
    b.camps.push({ col: 7, row: 6, foundedTurn: 1 });
    expect(signSites(a)).not.toBe(signSites(b));
  });
});
