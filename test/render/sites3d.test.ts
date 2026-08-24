import { describe, expect, it } from 'vitest';
import { InstancedMesh } from 'three';

import { BoardGeometry, SITE_KINDS, SITE_PROPS } from '../../src/render3d/board3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { SiteLayer, signSites } from '../../src/render3d/sites3d';
import { MaterialLibrary } from '../../src/render3d/toon';
import { type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
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
 *   3. **The two fog rules are different, and both hold.** A ruin is ground and
 *      survives on remembered hexes; a camp is an occupation and is drawn only
 *      where the seat can see *now*. A camp that persisted on remembered ground
 *      would be a banner a player sends a warrior at.
 */

function materials(): MaterialLibrary {
  return new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
}

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

  it('draws a camp only where the seat can see right now', () => {
    // The rule that parts company with the improvements layer, and the whole
    // reason the two tenants are documented apart: a remembered camp is a
    // banner over ground that may be empty.
    const state = flatState();
    state.camps.push({ col: 7, row: 5, foundedTurn: 1 });
    const layer = new SiteLayer();
    const geometry = new BoardGeometry();

    layer.build(state, geometry, materials(), false, levels(state, VISIBLE));
    expect(layer.instances).toBe(1);

    layer.build(state, geometry, materials(), false, levels(state, EXPLORED));
    expect(layer.instances).toBe(0);

    layer.build(state, geometry, materials(), false, levels(state, HIDDEN));
    expect(layer.instances).toBe(0);
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
    const meshes = meshesOf(layer.group);
    const colours = meshes.flatMap((mesh) => {
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
    expect(new Set(colours).size).toBeGreaterThan(1);
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
