/**
 * The lenses: a second decal layer that answers questions about every tile at
 * once.
 *
 * Three things live here, and they are deliberately not the same kind of thing:
 *
 *   · the **yield glyphs** — what does this ground *make*? A sheaf, a hammer and
 *                   a coin in the interface's yield voices, stacked per point
 *                   like fanned coins, sat on the tile's own face. They are a
 *                   *switch*, not a lens:
 *                   they sit on the face and compete with nothing, so they can
 *                   be up under any lens (see `LensView.yields`, and the
 *                   reasoning in `mapView.ts`). They replaced coloured pips,
 *                   which could say how many and never which — see `LensSpec`.
 *   · the **resource markers** — what is *on* this ground? A parchment roundel
 *                   with the resource's mark, **standing up** on a short pin over
 *                   every tile carrying one the viewing player may be told about.
 *                   The diorama already grows wheat and stands cattle on the
 *                   board; the roundel is what makes it nameable, which props
 *                   alone never are. A switch for the same reason the glyphs are
 *                   one, and the switch starts on (`LENS_DEFAULTS`): naming the
 *                   ground is not a question the player should have to go and ask.
 *   · the **settler lens** — where may a city go, and what kind of site is it?
 *                   Every tile the reducer would refuse is darkened. Every tile
 *                   it would accept is read for the two things that actually
 *                   decide where a capital goes: **blue** for a tile touching
 *                   the coast, **green** for a tile with fresh water, and a
 *                   ringed blend of the two for a tile with both. An estuary —
 *                   harbour and drinking water on one hex — is the premium site
 *                   in this game, and it is the one the eye should find first,
 *                   so it is the only grade that carries a ring as well as a
 *                   wash.
 *
 * Site semantics, not a desirability score
 * ----------------------------------------
 * This used to be a pale-to-green wash graded by `startScore`, the map
 * generator's own idea of a good start. It looked informative and told the
 * player almost nothing they could act on: a single number, relative to whatever
 * happened to be on screen, that answered "is this ground nice" rather than
 * "what would a city here *be*". Coast and fresh water are the two facts a
 * settler is actually deciding between, they are both binary, and a tile that
 * has both is worth a mark of its own.
 *
 * Shared rules, not a second opinion
 * ----------------------------------
 * Validity comes from `foundingErrorAt` — the *reducer's* own rule, extracted so
 * that the lens and the `foundCity` command cannot disagree — the yields come
 * from `tileYieldOf`, the function the citizens are assigned with, and fresh
 * water is asked of `hasFreshWater`, the one accessor for it. A lens that
 * painted its own idea of the rules would be worse than no lens: it would be a
 * promise the game breaks.
 *
 * Why a layer of its own
 * ----------------------
 * It is not in `overlays.ts` because the two rebuild on completely different
 * events. Overlays are torn down and rebuilt on every hover — many times a
 * second while the mouse moves — and a lens covering a whole map is a few
 * thousand instances. Rebuilding *that* per hover would be the one thing this
 * renderer refuses to do. A lens is rebuilt only when the lens itself changes,
 * or when the state under it changes in a way it is showing (borders, cities),
 * and never per frame.
 *
 * Two planes, so the two readouts stop colliding
 * ----------------------------------------------
 * The roundels used to lie flat on the face at the same height and the same
 * centre as the yield stacks, which meant a wheat hill printed a sheaf, two
 * hammers and a roundel on top of each other and the player could read none of
 * them. They are Civ 5 markers now: upright, camera-facing, floated
 * `resourceMarkerLift` over the tile on an ink-coloured pin, and anchored
 * `resourceMarkerOffset` toward the hex's upper edge so the pin is not planted in
 * the middle of a stack of coins. The yield glyphs did not move and did not
 * change; the collision was resolved by taking one of the two off the ground
 * rather than by shuffling both around on it.
 *
 * A marker is also depth-tested where a flat readout is not, and that follows
 * from the same decision: something standing in the diorama has to be hidden by
 * the mountain in front of it, exactly as a unit badge is (see `badges3d.ts`),
 * or the board grows a field of floating dots with nothing under them.
 *
 * Instancing keeps the cost flat: every glyph of one atlas cell is one draw call
 * whether there are ten of them or ten thousand, every pin on the whole board is
 * one more, and the site wash has exactly four grades — refused, coastal, fresh,
 * both — so it stays four buckets however large the map is.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import { foundingErrorAt, tileYieldOf } from '../sim/cities';
import { type GameMap, type Tile, getTileAt, tileNeighbors } from '../sim/map';
import type { GameState } from '../sim/state';
import { visibleResourceAt } from '../sim/tech';
import { hasFreshWater } from '../sim/water';
import type { CellRef, LensView } from '../ui/mapView';

import { type TileIcons, YIELD_KEYS } from './badges3d';
import type { BoardGeometry } from './board3d';
import { InstanceCollector, disposeInstancedGroup } from './instances';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { VIEW3D, mixColor } from './lookData';
import type { MaterialLibrary } from './toon';

const LENS = VIEW3D.lens;
const OVERLAY = VIEW3D.overlay;

/** The plain board: what the renderer starts with and falls back to. */
export const NO_LENS: LensView = {
  mode: 'none',
  cells: null,
  resources: false,
  resourceCells: null,
  yields: false,
  yieldCells: null,
  playerId: 0,
};

/** Are two cell restrictions the same? Identity first, then value. */
function sameCells(
  a: readonly CellRef[] | null,
  b: readonly CellRef[] | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.col !== b[i]!.col || a[i]!.row !== b[i]!.row) return false;
  }
  return true;
}

/** Are two lens views asking for the same picture? */
export function sameLens(a: LensView, b: LensView): boolean {
  if (a.mode !== b.mode || a.playerId !== b.playerId) return false;
  if (a.yields !== b.yields || a.resources !== b.resources) return false;
  // A restriction only means anything while the half it scopes is up; comparing
  // it when that half is down would rebuild the layer for a change nobody can
  // see.
  if (a.yields && !sameCells(a.yieldCells, b.yieldCells)) return false;
  if (a.resources && !sameCells(a.resourceCells, b.resourceCells)) return false;
  return sameCells(a.cells, b.cells);
}

export class LensLayer {
  readonly group = new Group();
  private drawCallCount = 0;

  /**
   * Rebuilds the whole layer. Cheap to call and never called per frame — see the
   * module docblock for what does call it.
   *
   * `icons` is the tile atlas (`badges3d.ts`), or null while it is still
   * rasterising — or forever, in a browser with no 2D context. Both halves that
   * need it simply draw nothing in that case, exactly as the units stand without
   * badges until theirs arrives.
   *
   * `faceCamera` is the camera's own rotation, resolved once by the caller and
   * baked into every marker's instance matrix. The camera angle never changes in
   * this renderer, so "face the camera" is a constant rather than a per-frame
   * job — the same bargain the unit badges and the HP bars make.
   */
  build(
    state: GameState | null,
    lens: LensView,
    geometry: BoardGeometry,
    materials: MaterialLibrary,
    icons: TileIcons | null,
    faceCamera: Quaternion,
  ): void {
    disposeInstancedGroup(this.group);
    this.drawCallCount = 0;
    if (!state) return;
    // Every half is independent and any of them may be off; with all of them off
    // there is nothing to build and no collector worth allocating.
    if (lens.mode === 'none' && !lens.yields && !lens.resources) return;

    const { map } = state;
    const collector = new InstanceCollector({
      copyOffsets: [-wrapWidth(map), 0, wrapWidth(map)],
    });

    // The wash first, so the flat marks are collected — and therefore drawn —
    // after the ground tint they sit on: both are `onTop` decals with the depth
    // test off, so the order they are added in is the order they layer in. The
    // resource markers are not in that argument at all any more; they stand up
    // and are sorted by the depth buffer like everything else in the diorama.
    if (lens.mode === 'settler') {
      this.addSiteWash(state, lens.playerId, resolveTiles(map, lens.cells), collector, geometry);
    }
    if (lens.resources && icons) {
      this.addResourceMarkers(
        state,
        lens.playerId,
        resolveTiles(map, lens.resourceCells),
        collector,
        geometry,
        icons,
        faceCamera,
      );
    }
    if (lens.yields && icons) {
      this.addYieldGlyphs(resolveTiles(map, lens.yieldCells), collector, geometry, icons);
    }

    this.drawCallCount = collector.flush(this.group, materials, false);
  }

  /**
   * A tile's yields as rows of glyphs, one row per yield that is not zero and
   * the rows centred as a group — so a 2/0/0 tile shows one row in the middle of
   * the hex rather than one row above an empty gap.
   *
   * Up to `yieldStackMax` marks are stacked, and past it the row collapses to
   * **one glyph and a numeral**. That is the whole of the pip rework's
   * arithmetic and it is a deliberate break with what the pips did: they drew
   * four dots and fattened the last one, which said "four or more" and nothing
   * else. A city centre on a wheat hill makes six hammers, and six is a number
   * the player is entitled to read.
   *
   * Stacked, not spaced
   * -------------------
   * The marks used to stand apart, one disc-and-a-gap per point, and four of
   * them ate the width of the hex they were printed on — on a board that also
   * has terrain, props, borders and a unit to show. They now overlap like a
   * fanned stack of coins: each steps `yieldStackStep` of a disc's *diameter*
   * along the row, so four points cost about half the width three gaps did, and
   * a stack still reads as "four of these" rather than as a bar. What keeps them
   * countable at that overlap is the drop shadow baked into each disc, offset
   * against the direction of the stack, so every coin lands on a dark edge of
   * the one before it (see `drawYieldCell` in `badges3d.ts`).
   *
   * Each mark is one cell of the shared tile atlas, so a whole board of yields
   * is *one* instanced draw per distinct cell — twelve at the very most (three
   * voices plus the digits actually on screen) however large the map is, and the
   * shadows cost none of their own because they travel inside the same stamp.
   */
  private addYieldGlyphs(
    tiles: readonly Tile[],
    collector: InstanceCollector,
    geometry: BoardGeometry,
    icons: TileIcons,
  ): void {
    const identity = new Quaternion();
    const glyph = new Vector3(LENS.glyphSize, 1, LENS.glyphSize);
    const numeral = new Vector3(LENS.numeralSize, 1, LENS.numeralSize);

    for (const tile of tiles) {
      const value = tileYieldOf(tile);
      const rows = YIELD_KEYS.filter((key) => value[key] > 0);
      if (rows.length === 0) continue;

      const centre = cellCenter(tile.col, tile.row);
      const y = tileTopY(tile) + OVERLAY.lift + LENS.glyphLift;
      rows.forEach((key, rowIndex) => {
        const z = centre.z + (rowIndex - (rows.length - 1) / 2) * LENS.rowSpacing;
        const row = yieldRowLayout(value[key]);
        const shape = geometry.yieldGlyphs[key];

        // The glyphs first and in order, left to right: the instances of one
        // mesh draw in the order they are collected, so each coin of a stack is
        // laid over the one to its left along with the shadow that separates
        // them.
        for (const offset of row.glyphs) {
          collector.add(
            shape,
            [],
            new Matrix4().compose(new Vector3(centre.x + offset, y, z), identity, glyph),
            { onTop: true, material: icons.material },
          );
        }
        for (const mark of row.numerals) {
          collector.add(
            geometry.numerals[mark.digit]!,
            [],
            new Matrix4().compose(new Vector3(centre.x + mark.x, y, z), identity, numeral),
            { onTop: true, material: icons.material },
          );
        }
      });
    }
  }

  /**
   * The resource switch: a standing marker over every tile carrying a resource
   * this player may be told about.
   *
   * Two instances per marker and they are deliberately different kinds of thing:
   *
   *   the roundel  the same atlas cell the flat version printed, on an upright
   *                quad turned to the fixed camera — the class-badge pattern
   *                exactly (`badges3d.ts`), down to the constant orientation and
   *                the depth test. It floats `resourceMarkerLift` over the tile
   *                face, measured to its centre, which is enough to clear the
   *                diorama props growing under it.
   *   the pin      one tapered spike in board ink, from the face up to the
   *                roundel's centre, where the roundel's own opaque paper hides
   *                its top. It is what makes the roundel read as *planted in
   *                this hex* rather than as an interface dot that happens to be
   *                floating nearby, and it is one instanced draw for the whole
   *                board however many resources are on it.
   *
   * The anchor is nudged `resourceMarkerOffset` toward the hex's upper edge
   * rather than sitting on its centre. That is not decoration: the yield stacks
   * are still printed flat across the middle of the face, and a pin planted there
   * would come up through them — which is the collision this whole shape change
   * exists to end.
   *
   * Visibility is asked of `visibleResourceAt` — the *simulation's* own answer,
   * the one the hover readout reads — so the lens and the card can never
   * disagree about whether a player has heard of iron yet. The diorama props
   * under the marker are another matter entirely and are drawn for everybody;
   * see that function's docblock for the tradeoff and why it is the honest one
   * for a game with no fog of war.
   */
  private addResourceMarkers(
    state: GameState,
    playerId: number,
    tiles: readonly Tile[],
    collector: InstanceCollector,
    geometry: BoardGeometry,
    icons: TileIcons,
    faceCamera: Quaternion,
  ): void {
    const upright = new Quaternion();
    const disc = new Vector3(LENS.resourceIconSize, LENS.resourceIconSize, 1);
    const lift = LENS.resourceMarkerLift;

    for (const tile of tiles) {
      const id = visibleResourceAt(state, playerId, tile);
      if (id === null) continue;
      const centre = cellCenter(tile.col, tile.row);
      // −z is up-screen under this camera (see `atlasDecal`), so subtracting is
      // "toward the tile's upper edge".
      const x = centre.x;
      const z = centre.z - LENS.resourceMarkerOffset;
      const ground = tileTopY(tile);

      // The pin first, so a marker's own paper is drawn over the top of it in
      // the one bucket where draw order still decides anything.
      collector.add(
        geometry.resourceStem,
        [LENS.resourceStemColor],
        new Matrix4().compose(
          new Vector3(x, ground + LENS.glyphLift, z),
          upright,
          new Vector3(LENS.resourceStemRadius, lift, LENS.resourceStemRadius),
        ),
        { outlined: false },
      );
      collector.add(
        geometry.resourceMarkers[id],
        // No ink of its own: the disc *is* the texture. The colour list still has
        // to be something — see the same note on the unit badges.
        [],
        new Matrix4().compose(new Vector3(x, ground + lift, z), faceCamera, disc),
        { material: icons.standingMaterial },
      );
    }
  }

  /**
   * The settler wash: refused tiles darkened, allowed tiles coloured by what
   * kind of site they are.
   *
   * Four states and no ramp (see the module docblock for why the old
   * desirability grade went):
   *
   *   · refused   — darkened, by the reducer's own rule.
   *   · coastal   — blue. A neighbouring `coast` tile: this city can reach the sea.
   *   · fresh     — green. `hasFreshWater`, so it can drink and grow.
   *   · both      — the two blended, plus a ring in the same ink at full
   *                 strength. A wash alone cannot say "this one is special" in a
   *                 field of washes; the ring can, and it costs one more bucket.
   *
   * A tile that is neither gets no mark at all. Silence is the honest answer for
   * ground that is merely legal, and it also keeps an inland map from being
   * painted edge to edge in a colour that means nothing.
   */
  private addSiteWash(
    state: GameState,
    playerId: number,
    tiles: readonly Tile[],
    collector: InstanceCollector,
    geometry: BoardGeometry,
  ): void {
    const identity = new Quaternion();
    const unit = new Vector3(1, 1, 1);

    const anchor = (tile: Tile): Vector3 => {
      const centre = cellCenter(tile.col, tile.row);
      return new Vector3(centre.x, tileTopY(tile) + OVERLAY.lift, centre.z);
    };

    const estuary = mixColor(LENS.siteCoastColor, LENS.siteFreshColor, LENS.siteEstuaryMix);

    for (const tile of tiles) {
      if (foundingErrorAt(state, playerId, tile) !== null) {
        collector.add(
          geometry.territory,
          [LENS.siteInvalidColor],
          new Matrix4().compose(anchor(tile), identity, unit),
          { onTop: true, opacity: LENS.siteInvalidOpacity },
        );
        continue;
      }

      const coastal = isCoastal(state.map, tile);
      const fresh = hasFreshWater(tile);
      if (!coastal && !fresh) continue;

      const both = coastal && fresh;
      const color = both ? estuary : coastal ? LENS.siteCoastColor : LENS.siteFreshColor;
      const at = anchor(tile);
      collector.add(
        geometry.territory,
        [color],
        new Matrix4().compose(at, identity, unit),
        { onTop: true, opacity: both ? LENS.siteEstuaryOpacity : LENS.siteOpacity },
      );
      if (!both) continue;
      collector.add(
        geometry.ring,
        [color],
        new Matrix4().compose(at, identity, unit),
        { onTop: true, opacity: LENS.siteEstuaryRingOpacity },
      );
    }
  }

  get drawCalls(): number {
    return this.drawCallCount;
  }

  dispose(): void {
    disposeInstancedGroup(this.group);
  }
}

/**
 * Does this tile touch the sea?
 *
 * `coast` specifically, not "any water": a lake is water a city cannot sail out
 * of, and it already speaks through fresh water. The test is on the neighbours
 * rather than on the tile itself because a city stands on land — the question is
 * whether it can put a harbour on the hex next door.
 */
function isCoastal(map: GameMap, tile: Tile): boolean {
  return tileNeighbors(map, tile).some((neighbor) => neighbor.terrain === 'coast');
}

/** Where one row's marks sit along x, as offsets from the tile's centre. */
export interface YieldRowLayout {
  /** One centre per disc of the stack, left to right. A single entry when the
   * row has collapsed to a glyph and a count. */
  glyphs: number[];
  /** The digits of the count, most significant first. Empty for a stack. */
  numerals: { digit: number; x: number }[];
}

/** The printed diameter of one voice disc, in world units. See `yieldRowLayout`. */
export function yieldDiscWidth(): number {
  return LENS.glyphSize * LENS.yieldDiscRadius * 2;
}

/**
 * One row of a tile's yield readout, laid out about x = 0.
 *
 * Pure arithmetic, and separated from the collecting for two reasons. It is the
 * half that decides whether the readout is legible — how far four coins overlap,
 * where the count sits beside its glyph — and it is the half a test can hold
 * still and read off, where instance matrices for an amount no real tile reaches
 * cannot be produced at all (nothing on this board makes five of one yield yet;
 * the day something does, this is already the code that will draw it).
 *
 * Two shapes, and the threshold between them is `yieldStackMax`:
 *
 *   1…max   a stack. Each disc steps `yieldStackStep` of its own *printed*
 *           diameter, so they overlap like fanned coins, and the run is centred
 *           as a whole.
 *   max+1…  one disc and the number, as a pair centred the same way. `digitsOf`
 *           returns a list, so a two-figure count is two numerals and a wider
 *           pair rather than a figure that will not fit in one.
 */
export function yieldRowLayout(amount: number): YieldRowLayout {
  const disc = yieldDiscWidth();
  const count = Math.max(0, Math.round(amount));
  if (count === 0) return { glyphs: [], numerals: [] };

  if (count <= LENS.yieldStackMax) {
    const step = disc * LENS.yieldStackStep;
    const glyphs: number[] = [];
    for (let i = 0; i < count; i++) glyphs.push((i - (count - 1) / 2) * step);
    return { glyphs, numerals: [] };
  }

  const digits = digitsOf(count);
  const width = disc + LENS.numeralGap + digits.length * LENS.numeralSize;
  const glyphX = -width / 2 + disc / 2;
  let x = glyphX + disc / 2 + LENS.numeralGap + LENS.numeralSize / 2;
  const numerals = digits.map((digit) => {
    const mark = { digit, x };
    x += LENS.numeralSize;
    return mark;
  });
  return { glyphs: [glyphX], numerals };
}

/** A positive integer's decimal digits, most significant first. */
function digitsOf(value: number): number[] {
  const digits = String(Math.max(0, Math.round(value))).split('').map(Number);
  return digits.length > 0 ? digits : [0];
}

/** The tiles a lens covers: the named cells, or the whole map. */
function resolveTiles(map: GameMap, cells: readonly CellRef[] | null): Tile[] {
  if (!cells) return map.tiles;
  const tiles: Tile[] = [];
  for (const cell of cells) {
    const tile = getTileAt(map, cell.col, cell.row);
    if (tile) tiles.push(tile);
  }
  return tiles;
}
