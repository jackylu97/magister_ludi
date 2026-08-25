/**
 * The lenses: a second decal layer that answers questions about every tile at
 * once.
 *
 * Three things live here, and they are deliberately not the same kind of thing:
 *
 *   · the **yield glyphs** — what does this ground *make*? A sheaf, a hammer, a
 *                   coin, a flask, a mask and a flame — the interface's six
 *                   yield voices — stacked per point like fanned coins, sat on
 *                   the tile's own face. They are a *switch*, not a lens:
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
 *                   Every tile the reducer would refuse is washed **crimson** —
 *                   the ink this interface says no in, and never a darkening,
 *                   which on a fogged board reads as "unexplored" rather than as
 *                   "forbidden". Every tile
 *                   it would accept is read for the two things that actually
 *                   decide where a capital goes: **blue** for a tile touching
 *                   the coast, **green** for a tile with fresh water, and a
 *                   ringed blend of the two for a tile with both. An estuary —
 *                   harbour and drinking water on one hex — is the premium site
 *                   in this game, and it is the one the eye should find first,
 *                   so it is the only grade that carries a ring as well as a
 *                   wash. Over any of those, a **grape** ring marks a hex
 *                   carrying a luxury: not a grade of site at all but a thing
 *                   to aim at, which is why it is also drawn on the ground the
 *                   crimson is refusing. The prospective city's own work radius
 *                   is *not* here — it follows the pointer, so it belongs to the
 *                   overlay layer (see `OverlayState.siteRadius`).
 *   · the **explorer lens** — where is there still something to find? Every
 *                   unclaimed ruin and village the seat has charted is ringed in
 *                   gold, every camp it can see right now in crimson. The
 *                   settler lens's opposite number in shape as well as in
 *                   subject: that one grades a whole map because every hex is a
 *                   candidate, this one marks a handful because the failure it
 *                   fixes is walking past one. See `addDiscoveryWash`.
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

import {
  type TileYieldContext,
  cityAt,
  foundingErrorAt,
  tileYieldOf,
  yieldContextFor,
} from '../sim/cities';
import { type GameMap, type Tile, getTileAt } from '../sim/map';
import { resourceDef } from '../sim/resourceData';
import type { GameState } from '../sim/state';
import { visibleResourceAt } from '../sim/tech';
import { hasFreshWater, isCoastal } from '../sim/water';
import type { CellRef, LensView } from '../ui/mapView';

import { type TileIcons, YIELD_KEYS } from './badges3d';
import type { BoardGeometry } from './board3d';
import { type FogLevels, knowsCell, seesCell } from './fog3d';
import { InstanceCollector, RENDER_ORDER, disposeInstancedGroup } from './instances';
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
  revealResources: false,
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
  if (a.resources) {
    // Same reason the cell restrictions are only compared while their half is
    // up: flipping the reveal with the roundels down changes nothing drawn.
    if ((a.revealResources ?? false) !== (b.revealResources ?? false)) return false;
    if (!sameCells(a.resourceCells, b.resourceCells)) return false;
  }
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
    levels: FogLevels = null,
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

    // The wash first, and the marks after it — though the *order* no longer
    // rests on that. A wash is an `onTop` decal and a flat mark is a
    // `RENDER_ORDER.tileIcon` one, so the glyphs are drawn over the tint they
    // are printed on by a number rather than by a collection order, which is
    // what makes them survive an oasis pool or a floodplain wash as well (see
    // `tileIconFlags` in `badges3d.ts` — the bug was a *pass*, not an order).
    // The resource markers are not in that argument at all; they stand up and
    // are sorted by the depth buffer like everything else in the diorama.
    if (lens.mode === 'settler') {
      this.addSiteWash(
        state,
        lens.playerId,
        resolveTiles(map, lens.cells, levels),
        collector,
        geometry,
      );
    }
    if (lens.mode === 'explorer') {
      this.addDiscoveryWash(
        state,
        resolveTiles(map, lens.cells, levels),
        collector,
        geometry,
        levels,
      );
    }
    if (lens.resources && icons) {
      this.addResourceMarkers(
        state,
        lens.playerId,
        resolveTiles(map, lens.resourceCells, levels),
        collector,
        geometry,
        icons,
        faceCamera,
        lens.revealResources ?? false,
      );
    }
    if (lens.yields && icons) {
      this.addYieldGlyphs(
        resolveTiles(map, lens.yieldCells, levels),
        collector,
        geometry,
        icons,
        // The seat the lens is drawn for. Its technologies decide whether a
        // renewal is counted (see `explainTileYield`), so the glyphs on the
        // board and the figures on the hover card are the same arithmetic.
        yieldContextFor(state, lens.playerId),
      );
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
   * is *one* instanced draw per distinct cell — sixteen at the very most (six
   * voices plus the digits actually on screen) however large the map is, and the
   * shadows cost none of their own because they travel inside the same stamp.
   */
  private addYieldGlyphs(
    tiles: readonly Tile[],
    collector: InstanceCollector,
    geometry: BoardGeometry,
    icons: TileIcons,
    ctx: TileYieldContext | undefined,
  ): void {
    const identity = new Quaternion();
    const glyph = new Vector3(LENS.glyphSize, 1, LENS.glyphSize);
    const numeral = new Vector3(LENS.numeralSize, 1, LENS.numeralSize);

    for (const tile of tiles) {
      const value = tileYieldOf(tile, ctx);
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
            { material: icons.material, order: RENDER_ORDER.tileIcon },
          );
        }
        for (const mark of row.numerals) {
          collector.add(
            geometry.numerals[mark.digit]!,
            [],
            new Matrix4().compose(new Vector3(centre.x + mark.x, y, z), identity, numeral),
            { material: icons.material, order: RENDER_ORDER.tileIcon },
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
   * The anchor is nudged toward the hex's upper-*left* corner rather than sitting
   * on its centre — `resourceMarkerOffset` up-screen and `resourceMarkerOffsetX`
   * across. That is not decoration, and it is now answering two collisions with
   * one move. The yield stacks are printed flat across the middle of the face, so
   * a pin planted there would come up through them; and a unit standing on the
   * tile floats its class badge centre-top over its own head (`badgeCenterY`),
   * which is exactly where a marker lifted straight up the middle would be. The
   * lateral half is what separates those two, because the camera's tilt squashes
   * z on screen and leaves x untouched: a nudge across the hex buys far more
   * clearance per world unit than a nudge up it.
   *
   * A tile with a city on it draws no marker at all. The roundel says "this
   * ground carries wheat", and a town standing on that ground is already the
   * louder thing to look at — a pin through a city's own roofs reads as litter,
   * and the wheat is not lost: the panel that grew out of that tile is made of
   * it. The suppression is a *drawing* decision and lives here for exactly that
   * reason; hovering the city still names the wheat, because that question is
   * asked of the simulation (below) and not of this layer.
   *
   * Visibility is asked of `visibleResourceAt` — the *simulation's* own answer,
   * the one the hover readout reads — so the lens and the card can never
   * disagree about whether a player has heard of iron yet. The diorama prop
   * under the marker asks the same question from the board's side
   * (`reveal3d.ts`), so marker, prop and yield arrive on one turn.
   *
   * `reveal` is the one way past that gate and it is a *view* switch, not a rule
   * change: it makes the layer read `tile.resource` directly instead of asking
   * the simulation, for a viewer who is nobody's seat (`mapgen.html`). Nothing a
   * player looks through ever sets it — see `LensView.revealResources`.
   */
  private addResourceMarkers(
    state: GameState,
    playerId: number,
    tiles: readonly Tile[],
    collector: InstanceCollector,
    geometry: BoardGeometry,
    icons: TileIcons,
    faceCamera: Quaternion,
    reveal: boolean,
  ): void {
    const upright = new Quaternion();
    const disc = new Vector3(LENS.resourceIconSize, LENS.resourceIconSize, 1);
    const lift = LENS.resourceMarkerLift;

    for (const tile of tiles) {
      // `reveal` does not answer the question differently — it declines to ask
      // it. See `LensView.revealResources`: the tech gate is still the game's
      // rule, and the only viewer allowed past it is one that is not a seat.
      const id = reveal ? (tile.resource ?? null) : visibleResourceAt(state, playerId, tile);
      if (id === null) continue;
      // A town on the tile wears no pin. See the docblock: the *readout* still
      // answers, because that question is asked of the simulation and not of
      // this layer.
      if (cityAt(state, tile.col, tile.row)) continue;
      const centre = cellCenter(tile.col, tile.row);
      // −z is up-screen and −x is left under this camera (see `atlasDecal`), so
      // subtracting both is "toward the tile's upper-left corner".
      const x = centre.x - LENS.resourceMarkerOffsetX;
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
   * The settler wash: refused tiles in the refusal ink, allowed tiles coloured
   * by what kind of site they are — and, over either, a ring on any hex whose
   * luxury a settler ought to be walking toward.
   *
   * Four states and no ramp (see the module docblock for why the old
   * desirability grade went):
   *
   *   · refused   — **crimson**, by the reducer's own rule. It used to be a
   *                 darkening, and a darkening is the one thing this board must
   *                 not use to mean "no": the fog already darkens, so a refused
   *                 hex read as unexplored ground rather than as a rule. Crimson
   *                 is the ink this interface says no in everywhere else (the
   *                 attack tint, a camp under the explorer lens), and it stays
   *                 legible on remembered ground, where a shade of ink does not.
   *   · coastal   — blue. A neighbouring `coast` tile: this city can reach the sea.
   *   · fresh     — green. `hasFreshWater`, so it can drink and grow.
   *   · both      — the two blended, plus a ring in the same ink at full
   *                 strength. A wash alone cannot say "this one is special" in a
   *                 field of washes; the ring can, and it costs one more bucket.
   *
   * A tile that is none of those gets no wash at all. Silence is the honest
   * answer for ground that is merely legal, and it also keeps an inland map from
   * being painted edge to edge in a colour that means nothing.
   *
   * The luxury ring is the exception to the "one grade per tile" shape above,
   * and deliberately so: it does not answer *may a city go here* — it answers
   * *what is on this ground* — so it is drawn on refused hexes too. A settler
   * aims at a luxury from a legal hex nearby, which means the ring has to be
   * visible on the very tiles the crimson is refusing. Asked of
   * `visibleResourceAt`, the simulation's own gate, so the lens can never ring a
   * dye the seat has no word for yet — the same rule the roundels obey.
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
    const luxuryRing = new Vector3(
      LENS.siteLuxuryRingScale,
      1,
      LENS.siteLuxuryRingScale,
    );

    const anchor = (tile: Tile): Vector3 => {
      const centre = cellCenter(tile.col, tile.row);
      return new Vector3(centre.x, tileTopY(tile) + OVERLAY.lift, centre.z);
    };

    const estuary = mixColor(LENS.siteCoastColor, LENS.siteFreshColor, LENS.siteEstuaryMix);

    /** The grape ring, for a luxury this seat may be told about. */
    const markLuxury = (tile: Tile): void => {
      const id = visibleResourceAt(state, playerId, tile);
      if (id === null || resourceDef(id).kind !== 'luxury') return;
      collector.add(
        geometry.ring,
        [LENS.siteLuxuryColor],
        new Matrix4().compose(anchor(tile), identity, luxuryRing),
        { onTop: true, opacity: LENS.siteLuxuryRingOpacity },
      );
    };

    // The grade first and the luxury ring after it, on every path through the
    // loop: a ring collected before the wash it sits on would be dulled by it.
    for (const tile of tiles) {
      if (foundingErrorAt(state, playerId, tile) !== null) {
        collector.add(
          geometry.territory,
          [LENS.siteRefusedColor],
          new Matrix4().compose(anchor(tile), identity, unit),
          { onTop: true, opacity: LENS.siteRefusedOpacity },
        );
      } else {
        const coastal = isCoastal(state.map, tile);
        const fresh = hasFreshWater(tile);
        const both = coastal && fresh;
        if (coastal || fresh) {
          const color = both ? estuary : coastal ? LENS.siteCoastColor : LENS.siteFreshColor;
          const at = anchor(tile);
          collector.add(
            geometry.territory,
            [color],
            new Matrix4().compose(at, identity, unit),
            { onTop: true, opacity: both ? LENS.siteEstuaryOpacity : LENS.siteOpacity },
          );
          if (both) {
            collector.add(
              geometry.ring,
              [color],
              new Matrix4().compose(at, identity, unit),
              { onTop: true, opacity: LENS.siteEstuaryRingOpacity },
            );
          }
        }
      }
      markLuxury(tile);
    }
  }

  /**
   * The explorer wash: every unclaimed discovery site the seat has charted, and
   * — in a hostile ink — every barbarian camp it can see right now.
   *
   * The settler lens's opposite number, and it is deliberately the *thin* one.
   * That lens grades a whole map, because every legal hex is a candidate and the
   * question is which is best. This one marks a handful of hexes on a board of
   * thousands, because the question is not "which of these" but "where are
   * they" — a discovery is three or four sites on a duel map, and the failure it
   * exists to fix is a player walking past one. So there is no grade and no
   * ramp: a ring at full strength over a wash, twice, in two inks.
   *
   * Two answers, and they are not two grades of one thing:
   *
   *   discovery  gold. Go here. A ruin or a village still standing — which is
   *              exactly `tile.discovery`, because the field is *deleted* on the
   *              claim (`claimDiscoveryAt`), so "unclaimed" needs no second
   *              test and a site claimed by a rival goes dark on this seat's
   *              board the moment the seat can see that it has.
   *   camp       crimson. Do not walk into that. A barbarian camp is the other
   *              thing an explorer meets alone in the dark, and marking it is
   *              nearly free — the plumbing for the ring is already here.
   *
   * The fog rules are the *site layer's* two rules, not one of them applied
   * twice, and they have to be: this lens must never ring a hex the board is not
   * drawing the thing on. So the discoveries come through `resolveTiles`, which
   * cuts at `hidden` and keeps remembered ground (a ruin is ground), while the
   * camps are asked `seesCell` directly and are marked only where the seat is
   * looking *now* (a camp is an occupation). A remembered camp ringed in red
   * would be a warning about an army that may have moved on ten turns ago.
   */
  private addDiscoveryWash(
    state: GameState,
    tiles: readonly Tile[],
    collector: InstanceCollector,
    geometry: BoardGeometry,
    levels: FogLevels,
  ): void {
    const identity = new Quaternion();
    const unit = new Vector3(1, 1, 1);

    const mark = (tile: Tile, color: number, wash: number, ring: number): void => {
      const centre = cellCenter(tile.col, tile.row);
      const at = new Vector3(centre.x, tileTopY(tile) + OVERLAY.lift, centre.z);
      collector.add(
        geometry.territory,
        [color],
        new Matrix4().compose(at, identity, unit),
        { onTop: true, opacity: wash },
      );
      collector.add(
        geometry.ring,
        [color],
        new Matrix4().compose(at, identity, unit),
        { onTop: true, opacity: ring },
      );
    };

    for (const tile of tiles) {
      if (tile.discovery === undefined) continue;
      mark(tile, LENS.discoveryColor, LENS.discoveryOpacity, LENS.discoveryRingOpacity);
    }

    // Walked over `state.camps` rather than over the tiles, because a camp is
    // not on the map — it lives in the state, with a history (see
    // `GameState.camps`) — and because that is the list the site layer draws
    // from, so the two cannot disagree about which camps exist.
    for (const camp of state.camps) {
      if (!seesCell(levels, state.map, camp.col, camp.row)) continue;
      const tile = getTileAt(state.map, camp.col, camp.row);
      if (!tile) continue;
      mark(tile, LENS.campColor, LENS.campOpacity, LENS.campRingOpacity);
    }
  }

  get drawCalls(): number {
    return this.drawCallCount;
  }

  dispose(): void {
    disposeInstancedGroup(this.group);
  }
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

/**
 * The tiles a lens covers: the named cells, or the whole map — minus anything
 * the local seat has never seen.
 *
 * Fog cuts every half of this layer at `hidden`, and none of them at `explored`.
 * That split is a decision per readout and it comes out the same way three
 * times, because all three of these answer questions about the *ground*:
 *
 *   yield glyphs      what does this hex make. Terrain is static, so a
 *                     remembered hex makes exactly what it made when it was
 *                     last looked at. Nothing is leaked by saying so.
 *   resource roundels the same argument: wheat does not walk away. (What a
 *                     player may be *told* about a resource is still the
 *                     technology question `visibleResourceAt` answers — two
 *                     independent gates, and a tile has to pass both.)
 *   the settler wash  where may a city go. This is the one with a leak in it,
 *                     and it is deliberate: validity is computed from live
 *                     truth, so a remembered hex that a rival has since claimed
 *                     or built next to reads as refused before this player could
 *                     know why. Civ does the same, the alternative is a lens
 *                     that recommends sites the reducer will refuse, and a lens
 *                     that disagrees with the command it advertises would be
 *                     worse than no lens (see the module docblock).
 *
 * Terra Incognita gets nothing at all, which needs no argument: there is no
 * ground there yet.
 */
function resolveTiles(
  map: GameMap,
  cells: readonly CellRef[] | null,
  levels: FogLevels,
): Tile[] {
  const tiles: Tile[] = [];
  if (!cells) {
    for (const tile of map.tiles) {
      if (knowsCell(levels, map, tile.col, tile.row)) tiles.push(tile);
    }
    return tiles;
  }
  for (const cell of cells) {
    const tile = getTileAt(map, cell.col, cell.row);
    if (tile && knowsCell(levels, map, tile.col, tile.row)) tiles.push(tile);
  }
  return tiles;
}
