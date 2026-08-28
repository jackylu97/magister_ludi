/**
 * Turns a `GameMap` into a pile of `InstancedMesh`es: the terrain, its
 * decorations, and the substrate slab underneath.
 *
 * Adapted from the prototype's `src/proto3d/board.ts`. Two things changed on the
 * way in. The map is now baked three times side by side so the east–west wrap
 * works (see `instances.ts`), and units left: they change on every command and
 * belong to a layer that can be rebuilt on its own, not to a board that is built
 * once per map. Everything about the *look* is unchanged.
 *
 * Placement is a pure function of `(col, row)`
 * -------------------------------------------
 * Every jitter — yaw, height, tree position, tree size, which hills get rocks —
 * comes from `hashUnit(col, row, stream)`. Nothing rolls a die and nothing
 * remembers a previous frame, so rebuilding the board reproduces it exactly,
 * the three wrap copies are identical, and two tiles with the same terrain still
 * look different. Each kind of decoration draws from its own `stream`, so adding
 * rocks does not reshuffle forests.
 *
 * Uniform scale only
 * ------------------
 * Height jitter is applied as a *uniform* scale about each prism's base rather
 * than a y-only squash. It costs a matching ±3.5% of hex radius, which is
 * invisible under the tile gap and frankly helps — the tiles look hand-cut — and
 * it buys two things: the inverted-hull outline keeps a constant thickness (the
 * shell offset is multiplied by the instance matrix), and the base stays planted
 * on the floor plane instead of floating.
 */

import {
  BoxGeometry,
  BufferAttribute,
  type BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';

import type { HeraldryId } from '../art/heraldryMarks';
import type { DiscoveryKind } from '../sim/discoveryData';
import { IMPROVEMENT_IDS, type ImprovementId } from '../sim/improvementData';
import { type GameMap, type Tile, tileIndex } from '../sim/map';
import type { Unit } from '../sim/state';
import type { BeliefAxis } from '../sim/religionData';
import { RESOURCE_IDS, type ResourceId } from '../sim/resourceData';
import { type TerrainId, isEmbarkableTerrain } from '../sim/terrainData';
import { type ModelClass, UNIT_TYPE_IDS, type UnitTypeId, unitDef } from '../sim/unitData';
import { hasRiverEdge, neighborInDirection } from '../sim/water';

import {
  type BadgeClass,
  AXIS_CELLS,
  BADGE_CELLS,
  CHARGE_CELLS,
  NUMERAL_CELLS,
  SITE_MARK_CELLS,
  YIELD_KEYS,
  type YieldKey,
  badgeCellRect,
  rimInnerFraction,
  tileIconRect,
} from './badges3d';
import { hashDisc, hashSigned, hashUnit } from './hash';
import {
  type MiniClass,
  type MiniFactory,
  type UnitPiece,
  academyHall,
  academyRidge,
  archerMini,
  atlasDecal,
  atlasQuad,
  bannerPole,
  barQuad,
  boatMini,
  borderCorner,
  cactus,
  cairnStack,
  citadelBanner,
  citadelRing,
  brokenColumns,
  campTent,
  caravanLadenMini,
  caravanMini,
  catapultMini,
  chariotMini,
  cityGableRoof,
  cityHouseBody,
  cityHouseRoof,
  cityPalaceBody,
  cityPalaceFinial,
  cityPalaceRoof,
  cityShrine,
  cityShrineFinial,
  cityTemple,
  cityWallSegment,
  cityWonder,
  cityWonderTip,
  crystalCluster,
  customsVane,
  customsWarehouse,
  discRing,
  dyeVats,
  fenceRing,
  fishFin,
  fishingBoat,
  flowerSpray,
  furRack,
  furrowRows,
  grassTuft,
  hexDecal,
  hexPrism,
  hexRing,
  horsemanMini,
  incenseBurner,
  jadeSlab,
  landmarkCap,
  landmarkStele,
  manufactoryDoor,
  manufactoryHall,
  marbleColumn,
  markerPin,
  mineHead,
  mountainPeak,
  mountainSnow,
  oreBoulder,
  palisadeStake,
  palmTree,
  pathDot,
  pineTree,
  poolDisc,
  hutCluster,
  quarrySteps,
  raiderCamp,
  reedClump,
  riverSegment,
  rock,
  roundTree,
  saltCrust,
  sawPit,
  scoutMini,
  prophetMini,
  settlerMini,
  silkFrame,
  spiceBush,
  spriteQuad,
  standeeBase,
  standingStoneTip,
  standingStones,
  stoneBlock,
  swordsmanMini,
  toyCow,
  toyDeer,
  toyHorse,
  trellisRows,
  vineTrellis,
  wheatStand,
  workerMini,
} from './geometry';
import {
  type InstanceHandle,
  type SuppressScope,
  type Tint,
  InstanceCollector,
  SUPPRESS,
  disposeInstancedGroup,
} from './instances';
import { type SiteKind, VIEW3D, resourcePropSpec, shade } from './lookData';
import {
  type HeightClass,
  boardBounds,
  cellCenter,
  directionDelta,
  edgeYaw,
  heightClassOf,
  tileScale,
  tileTopY,
  tileYaw,
  wrapWidth,
} from './layout';
import type { MaterialLibrary } from './toon';

const BOARD = VIEW3D.board;
const DECOR = VIEW3D.decor;
const OVERLAY = VIEW3D.overlay;
const CITY = VIEW3D.city;
const RESOURCES = VIEW3D.resources;
const IMPROVEMENTS = VIEW3D.improvements;
const SITES = VIEW3D.sites;
const TABLE = VIEW3D.table;
const RIVERS = VIEW3D.rivers;
const PIECES = VIEW3D.pieces;
const SPRITE = VIEW3D.units.sprite;

/**
 * The model class a unit type is drawn as, read from `data/units.json`.
 *
 * One lookup rather than a switch on unit ids, for the same reason nothing in
 * `src/sim/` compares a type against the string `"settler"`: a new unit type is
 * a data edit, and a renderer that had to be taught each one would silently draw
 * the wrong thing (or nothing) the day one arrived.
 *
 * This used to answer with a per-type sculpt. It answers with a *class* now —
 * see `ModelClass` for why fifteen silhouettes became eight — and which unit is
 * which is carried by the badge floating over the piece (`badges3d.ts`).
 */
export function modelClassFor(type: UnitTypeId): ModelClass {
  return unitDef(type).modelClass;
}

/**
 * The badge a unit type wears, which is its model class except for the two
 * kinds of roster row that are not what they are shaped like.
 *
 * A great person stands on the settler's sculpt — a civilian with a handcart —
 * because it is a civilian with a handcart, and sculpting five more silhouettes
 * for five families would be five more things to learn about pieces that are
 * spent within a few turns of arriving. What it must not do is wear the
 * settler's *name*: the badge is the board's only sentence about what a piece
 * is, and "settler" over Archimedes is a wrong sentence rather than a missing
 * one.
 *
 * An augur is the same problem one row down. It is sculpted as a `worker` and
 * should be — a figure on foot with a bundle — but "worker" over the only piece
 * in the game that spends faith is the same wrong sentence, and the mistake it
 * invites is worse than the great person's, because a worker badge is an
 * invitation to send it at a hill and build a mine.
 *
 * The **prophet** is the third of these and it is the reason there are three.
 * `religious` was written to cover the whole called family — "the prophet the
 * High Temple brings will wear this one" — and religion v2 made that the wrong
 * bet: a prophet founds a faith, plants a holy site, drafts its beliefs and
 * proclaims, out of a purse an order of magnitude past an augur's, and the two
 * pieces stand next to each other. So it reads `UnitDef.prophesies`, which is
 * the row that says what it is, and it sits **ahead of `consecrates`** for the
 * ordering reason `greatWork` sits ahead of both: a prophet that also
 * consecrated would still be a prophet. Its mark is the candle *ringed* — the
 * same drawing plus the one thing that separates it — because the augur's
 * silhouette is the right one and only the rank is different.
 *
 * Asked of `UnitDef.greatWork`, `UnitDef.prophesies` and `UnitDef.consecrates`,
 * never of the type id,
 * for `modelClassFor`'s reason exactly and the sim's: nothing compares a unit
 * against the string `"settler"`, nothing compares one against `"augur"`, and
 * nothing here compares one against `"greatPerson"`. The row that says a piece
 * plants a great work, or performs a rite, is the row that earns the badge — so
 * the prophet the High Temple brings is a data row and this function does not
 * move. `greatWork` is asked **first** and the order is not arbitrary: a great
 * person that also consecrated would still be a great person, because the laurel
 * is about who the piece is and the candle is about what it does.
 *
 * The **third** clause is the art table (`badges.byUnitType` in
 * `data/view3d.json`, resolved once by `BADGE_OVERRIDES`), and it sits here and
 * not first for the same reason: the two above are facts the *rules* carry about
 * a row, and a look-and-feel file must not be able to hang a candle on
 * Archimedes. What it may do is split a model class the sculpt cannot — the
 * spear line off the sword line — which is a decision about drawings and
 * therefore a decision the renderer's own data file gets to make.
 *
 * Since the one-mark-per-row ruling (user, 2026-08-28: "for the sake of making
 * unit icons clearer, could we get unique badges for each unit type") that third
 * clause is what answers for nearly the whole roster — the table names every row
 * whose badge art decides, which is every row but the two the rules take first —
 * and the **fourth** line, `def.modelClass`, has become what it always read like
 * and never quite was: the answer for a row nobody has drawn yet. It is kept for
 * exactly that, and it is a good answer rather than a placeholder, because the
 * class members of `BadgeClass` are each a line's first rank (`melee` is the
 * sword, `ranged` the bow) and the archetype of a line is the right thing for an
 * unnamed row to wear. A roster row added in `data/units.json` and nowhere else
 * still gets a legible badge; it just does not get a *distinct* one, which is the
 * cue to draw it one.
 */
export function badgeClassFor(type: UnitTypeId): BadgeClass {
  const def = unitDef(type);
  if (def.greatWork) return 'greatPerson';
  if (def.prophesies) return 'prophet';
  if (def.consecrates) return 'religious';
  return BADGE_OVERRIDES.get(type) ?? def.modelClass;
}

/**
 * `badges.byUnitType`, resolved once and checked against the atlas.
 *
 * Checked rather than trusted: the table is plain JSON keyed by two open string
 * spaces — a unit id and a badge class — and both halves of a typo fail
 * invisibly. A misspelt unit id would simply never match, and a misspelt class
 * would index a cell that does not exist and draw whatever happens to be at the
 * origin of the atlas. Both are the shape of bug that ships, so both throw at
 * load, where a bad data edit belongs (the same discipline `parseColor` and the
 * `named` palette lookup keep one file over).
 */
const BADGE_OVERRIDES: ReadonlyMap<UnitTypeId, BadgeClass> = (() => {
  const out = new Map<UnitTypeId, BadgeClass>();
  for (const [type, cls] of Object.entries(VIEW3D.badges.byUnitType)) {
    if (!UNIT_TYPE_IDS.includes(type as UnitTypeId)) {
      throw new Error(`view3d.json: badges.byUnitType names an unknown unit type: ${type}`);
    }
    if (!BADGE_CELLS.includes(cls as BadgeClass)) {
      throw new Error(`view3d.json: badges.byUnitType.${type} is not a badge class: ${cls}`);
    }
    out.set(type as UnitTypeId, cls as BadgeClass);
  }
  return out;
})();

/**
 * Every sculpt on the board, and the size class it is cut to.
 *
 * Typed `Record<SculptId, …>` on purpose: this is the one place the art and
 * the data are joined, and because `SculptId` *contains* `ModelClass`, keeping
 * it exhaustive still means a `modelClass` name added to `units.json` that
 * nobody sculpted is a *compile* error rather than a hole in the board.
 * `test/pieces3d.test.ts` closes the other direction — a sculpt no unit stands
 * on — and as of M7 there is no exemption left: `worker` was sculpted and iconed
 * a milestone ahead of its unit, and the unit has landed.
 *
 * The eight class builds are the best silhouette from the old per-type roster
 * rather than eight new sculpts: the swordsman was always the clearest foot
 * soldier, the archer the clearest bow, the horseman the clearest rider. The
 * factories that lost their seat stay in `geometry.ts` — see the docblock there.
 *
 * The two beyond them are the caravan and the caravan with something on its
 * back; see `EXTRA_SCULPT_IDS` for why a sculpt may now be finer than a model
 * class, and `MiniSculpt.laden` for why one of them is never named by data.
 */
export const MINI_SCULPTS: Record<SculptId, MiniSculpt> = {
  settler: { cls: 'foot', build: settlerMini },
  worker: { cls: 'foot', build: workerMini },
  melee: { cls: 'foot', build: swordsmanMini },
  ranged: { cls: 'foot', build: archerMini },
  scout: { cls: 'foot', build: scoutMini },
  mounted: { cls: 'mounted', build: horsemanMini },
  mountedRanged: { cls: 'mounted', build: chariotMini },
  siege: { cls: 'siege', build: catapultMini },
  trader: { cls: 'foot', build: caravanMini, laden: 'traderLaden' },
  traderLaden: { cls: 'foot', build: caravanLadenMini },
  prophet: { cls: 'foot', build: prophetMini },
  boat: { cls: 'foot', build: boatMini },
};

/**
 * The body every piece takes at sea.
 *
 * One hull for the whole roster rather than a nautical twin per class, and the
 * badge is why that works — see `boatMini`. Named here rather than inlined in
 * `unitSculpt` so "which sculpt means afloat" is a fact with a home, the way
 * `MiniSculpt.laden` is.
 */
const AFLOAT: SculptId = 'boat';

/**
 * One registered sculpt: the size class it is cut to, how to cut it, and — for
 * the handful that have one — the twin a piece takes when it is *carrying*
 * something.
 *
 * `laden` is a fact about the drawings and lives with them. It is read by
 * `unitSculpt` off the presence of `Unit.trade`, which is deliberately the only
 * runtime property in the game that changes which body a piece stands in: a
 * caravan with a route is doing the thing the unit exists to do, and the board
 * has no other way to say so. A sculpt with no `laden` twin never varies, which
 * is every other row here and the reason this is optional rather than a second
 * table.
 */
export interface MiniSculpt {
  cls: MiniClass;
  build: MiniFactory;
  laden?: SculptId;
}

/**
 * The sculpts that are **not** model classes, in the order they were appended.
 *
 * `BadgeClass`'s trick one file over and for the same reason: the sculpt roster
 * has always been keyed by `ModelClass`, which is a fact about a unit row in
 * `data/units.json`, and a caravan is `modelClass: 'worker'` there and rightly
 * so — it is a civilian on foot. What the *board* needs is one grade finer, and
 * a `sculpt:` column in the rules' own file would be the art reaching across
 * into it (see `badgeClassFor`, which makes exactly this argument about the
 * spear). So the split lives here and which rows take it is `pieces.byUnitType`
 * in `data/view3d.json`.
 *
 * `traderLaden` and `boat` are in the list without ever being named by that
 * table: they are reached only through `MiniSculpt.laden` and through `AFLOAT`,
 * because "which drawing does this row wear" and "what is this particular piece
 * doing right now" are two questions and only the first one is a fact about a
 * type. A `boat` named by `pieces.byUnitType` would be a unit that was a boat
 * standing in a wheat field.
 *
 * `prophet` is the third *named* one, beside `trader`. The roster row is
 * `modelClass: 'worker'` and rightly so — a prophet is a civilian on foot, the
 * augur's own class — and the split is exactly the caravan's argument: which
 * drawing a row wears is a decision about drawings, so it is made here and in
 * `data/view3d.json`, never by a `sculpt:` column reaching across into the
 * rules' own file.
 */
const EXTRA_SCULPT_IDS = ['trader', 'traderLaden', 'prophet', 'boat'] as const;

/** A body a piece can stand in: a model class, or one of the extras above. */
export type SculptId = ModelClass | (typeof EXTRA_SCULPT_IDS)[number];

/** Every sculpt, in the order the registry lists them. */
export const SCULPT_IDS = Object.keys(MINI_SCULPTS) as SculptId[];

/**
 * Every model class, in the order the registry lists them.
 *
 * Filtered rather than cast, so the eight stay eight: the Armory draws this list
 * as "the sculpt roster" and the badge tests read it as "every model class", and
 * both would quietly start counting a caravan if this were still every key.
 */
export const MODEL_CLASS_IDS = SCULPT_IDS.filter(
  (id): id is ModelClass => !(EXTRA_SCULPT_IDS as readonly string[]).includes(id),
);

/**
 * The sculpt a unit *type* is drawn as: its model class, unless the art table
 * says finer — or unless it is standing on water, in which case it is a boat and
 * the roster has nothing to say about it.
 *
 * `badgeClassFor`'s third clause, one grade down and with only that clause —
 * there is nothing here to read off the unit row, because a sculpt is entirely a
 * question about drawings. Checked at load like the badge table is, and for the
 * same two invisible typos.
 *
 * `terrain` is the hex the piece is *on*, and it is optional because two of the
 * three callers do not have one and do not need one: `pieceHeightFor` asks about
 * a type in the abstract (see its docblock — a tag that moved when a piece
 * embarked would be the laden caravan's bug in a bigger hat), and the gallery
 * draws the roster on a table rather than on a map. Omitting it means "on land",
 * which is the honest default for a question with no hex in it.
 */
export function sculptFor(type: UnitTypeId, terrain?: TerrainId): SculptId {
  if (terrain !== undefined && isEmbarkableTerrain(terrain)) return AFLOAT;
  return SCULPT_OVERRIDES.get(type) ?? modelClassFor(type);
}

/**
 * The sculpt a *piece* stands in: a boat if it is at sea, else its type's
 * sculpt, laden if it is carrying a route and its sculpt has a laden twin.
 *
 * The one place in the renderer where a unit's own situation chooses its body,
 * and there are now two things that do it. Neither is asked of the *type*,
 * because an idle caravan waiting in a city and one three hexes into a run are
 * the same roster row and must not be the same picture — and a settler on a
 * beach and the same settler a hex out to sea are the same row twice over.
 *
 * **At sea wins**, and it is the one ordering decision here. A laden caravan
 * crossing a strait loses its bale for the crossing, which is a real loss of
 * information and is still the right answer: "this piece is somewhere it cannot
 * walk" is the more urgent of the two sentences, and there is no gilt bale to
 * hang on a hull that has no pack to rope it to. Everything else the piece is
 * still says itself — the badge over it never changed.
 *
 * Everything that puts a piece on the board goes through this: the resting
 * instance (`UnitLayer.build`) and the walking copy, or a caravan would shed its
 * bale for exactly the length of its march and a boat would walk ashore for it.
 * The *falling* copy asks `sculptFor` with the tile instead, because a corpse is
 * a description rather than a unit and has no `trade` to read.
 */
export function unitSculpt(unit: Unit, terrain?: TerrainId): SculptId {
  const id = sculptFor(unit.type, terrain);
  if (id === AFLOAT) return id;
  return unit.trade === undefined ? id : (MINI_SCULPTS[id].laden ?? id);
}

/**
 * `pieces.byUnitType`, resolved once and checked against the registry.
 *
 * `BADGE_OVERRIDES`'s twin, word for word including the reason it throws: two
 * open string spaces, and both halves of a typo fail invisibly — a misspelt unit
 * id simply never matches, and a misspelt sculpt id would index nothing and put
 * an undefined geometry into an instanced draw.
 */
const SCULPT_OVERRIDES: ReadonlyMap<UnitTypeId, SculptId> = (() => {
  const out = new Map<UnitTypeId, SculptId>();
  for (const [type, id] of Object.entries(VIEW3D.pieces.byUnitType)) {
    if (!UNIT_TYPE_IDS.includes(type as UnitTypeId)) {
      throw new Error(`view3d.json: pieces.byUnitType names an unknown unit type: ${type}`);
    }
    if (!(id in MINI_SCULPTS)) {
      throw new Error(`view3d.json: pieces.byUnitType.${type} is not a sculpt: ${id}`);
    }
    out.set(type as UnitTypeId, id as SculptId);
  }
  return out;
})();

/**
 * How tall a unit's miniature stands, in world units.
 *
 * What the HP bar and the badge both ask about the art style, and the reason the
 * class heights are data: a tag that rode at a fixed height would float over a
 * catapult and sit inside a knight.
 *
 * Asked of the *type* and never of the piece, which is what keeps a laden
 * caravan's tag from jumping the moment a route is assigned: a laden twin is the
 * same size class as the sculpt it varies, and this is where that is relied on.
 */
export function pieceHeightFor(type: UnitTypeId): number {
  return PIECES.heights[MINI_SCULPTS[sculptFor(type)].cls];
}

/** Builds one of every sculpt, at the height its class asks for. */
function buildUnitPieces(): Record<SculptId, UnitPiece> {
  const out: Partial<Record<SculptId, UnitPiece>> = {};
  for (const id of SCULPT_IDS) {
    const sculpt = MINI_SCULPTS[id];
    out[id] = sculpt.build({
      height: PIECES.heights[sculpt.cls],
      baseRadius: BOARD.hexRadius * PIECES.base.radius,
      baseThickness: PIECES.base.thickness,
      tokenRadius: PIECES.tokenRadius,
    });
  }
  return out as Record<SculptId, UnitPiece>;
}

/**
 * One quad per badge class, each carrying its own cell of the badge atlas.
 *
 * Baking the atlas rectangle into the geometry is what makes badges instanceable
 * without a per-instance attribute: every badge of one class is the same quad
 * with the same UVs, so the whole class is one `InstancedMesh`, and all twenty
 * classes share a single material and a single texture.
 *
 * Walked over `BADGE_CELLS` rather than `MODEL_CLASS_IDS`, and that is the whole
 * of what `BadgeClass` changed here: the badges are twelve cells longer than the
 * sculpts are, because the great person borrows a silhouette and does not borrow
 * a name, and because every line's second and third rank now has a drawing the
 * sculpt could never have carried (see `badgeClassFor`).
 */
function buildBadgeQuads(): Record<BadgeClass, BufferGeometry> {
  const out: Partial<Record<BadgeClass, BufferGeometry>> = {};
  for (const id of BADGE_CELLS) {
    const rect = badgeCellRect(id);
    out[id] = atlasQuad(rect.u0, rect.v0, rect.u1, rect.v1);
  }
  return out as Record<BadgeClass, BufferGeometry>;
}

/**
 * Every resource's diorama prop, by resource id.
 *
 * A **partial** map with a documented fallback, which is a change of policy from
 * the exhaustive `Record<ResourceId, …>` this used to be, and worth the sentence
 * it costs. Exhaustiveness bought a compile error for an unsculpted resource;
 * what it cost was that adding a row to `data/resources.json` — the thing the
 * table exists to make cheap — was not a data edit at all, because it broke this
 * file and `badges3d.ts` until somebody drew art. A find nobody has sculpted now
 * shows `cairnStack`, a marker cairn, and its roundel still names it: legible,
 * honest and obviously provisional. `test/resources3d.test.ts` closes the other
 * direction — a prop no resource asks for — and asserts the fallback.
 *
 * The shapes are in `geometry.ts`; what is here is only which shape belongs to
 * which id. Their size, ink and count per tile are data (`resources.props` in
 * `view3d.json`), which falls back the same way (`resourcePropSpec`).
 */
export const RESOURCE_PROPS: Partial<Record<ResourceId, (size: number) => BufferGeometry>> = {
  wheat: wheatStand,
  cattle: toyCow,
  deer: toyDeer,
  fish: fishFin,
  stone: stoneBlock,
  horses: toyHorse,
  iron: oreBoulder,
  gems: crystalCluster,
  silk: silkFrame,
  wine: vineTrellis,
  spices: spiceBush,
  salt: saltCrust,
  incense: incenseBurner,
  jade: jadeSlab,
  marble: marbleColumn,
  furs: furRack,
  dyes: dyeVats,
};

/** The sculpt a resource is drawn with, or the cairn when nobody drew one. */
export function resourcePropFactory(id: ResourceId): (size: number) => BufferGeometry {
  return RESOURCE_PROPS[id] ?? cairnStack;
}

/** One prop per resource, each built at the size its data row asks for. */
function buildResourceProps(): Record<ResourceId, BufferGeometry> {
  const out: Partial<Record<ResourceId, BufferGeometry>> = {};
  for (const id of RESOURCE_IDS) {
    out[id] = resourcePropFactory(id)(BOARD.hexRadius * resourcePropSpec(id).size);
  }
  return out as Record<ResourceId, BufferGeometry>;
}

/**
 * Every improvement's diorama prop, by improvement id.
 *
 * Typed `Record<ImprovementId, …>` for exactly the reason `RESOURCE_PROPS` is:
 * this is the one place the art and the data are joined, so an improvement added
 * to `data/improvements.json` that nobody drew a prop for is a *compile* error
 * rather than a hex with an invisible farm on it. `test/improvements3d.test.ts`
 * closes the other direction — a prop no improvement asks for.
 *
 * They are built here, with the board's other shared shapes, and *drawn* by
 * `improvements3d.ts`, which is a layer of its own because improvements change
 * during play and the board does not. One geometry per shape, built once, reused
 * by every board ever built — the same rule as everything else in this file.
 */
export const IMPROVEMENT_PROPS: Record<ImprovementId, (size: number) => BufferGeometry> = {
  farm: furrowRows,
  mine: mineHead,
  pasture: fenceRing,
  camp: campTent,
  quarry: quarrySteps,
  fishingBoats: fishingBoat,
  lumbermill: sawPit,
  plantation: trellisRows,
  academy: academyHall,
  landmark: landmarkStele,
  manufactory: manufactoryHall,
  customsHouse: customsWarehouse,
  citadel: citadelRing,
  // The sixth work, and the first a *prophet* plants rather than a great person.
  // It shipped as the landmark's stele — an honest placeholder the religion
  // pass said so out loud — and has its own sculpt now: a ring of six leaning
  // monoliths about an altar. See `standingStones`.
  holySite: standingStones,
};

/**
 * The one gilt element on each of the five great works, by improvement id.
 *
 * **Partial on purpose**, and it is the one improvement table that is: gold is
 * what says "a great person did this once" (see the great-works docblock in
 * `geometry.ts`), so a worker's improvement has no row here and must not grow
 * one. That asymmetry is why this is a second registry rather than a second
 * field on the first — an exhaustive record would make "no gilt" a shape
 * somebody had to write down seven times.
 *
 * It is a second *geometry*, drawn by `improvements3d.ts` as a second instance
 * over the same matrix, exactly as `CityLayer.addWork` draws a shrine's needle.
 * Its ink comes from the data row (`improvements.props.<id>.gilt`), and the two
 * halves are checked against each other in `test/render/improvements3d.test.ts`:
 * a shape with no ink would print in the body's colour, and an ink with no
 * shape would be a number nothing reads.
 */
export const IMPROVEMENT_GILT: Partial<
  Record<ImprovementId, (size: number) => BufferGeometry>
> = {
  academy: academyRidge,
  landmark: landmarkCap,
  manufactory: manufactoryDoor,
  customsHouse: customsVane,
  citadel: citadelBanner,
  // The tip standing on the altar inside the stone ring. A work is gilt or it
  // is not a work, and the two registries have to agree.
  holySite: standingStoneTip,
};

/** One prop per improvement, each built at the size its data row asks for. */
function buildImprovementProps(): Record<ImprovementId, BufferGeometry> {
  const out: Partial<Record<ImprovementId, BufferGeometry>> = {};
  for (const id of IMPROVEMENT_IDS) {
    out[id] = IMPROVEMENT_PROPS[id](BOARD.hexRadius * IMPROVEMENTS.props[id].size);
  }
  return out as Record<ImprovementId, BufferGeometry>;
}

/** The gilt element of every improvement that has one, at that prop's size. */
function buildImprovementGilt(): Partial<Record<ImprovementId, BufferGeometry>> {
  const out: Partial<Record<ImprovementId, BufferGeometry>> = {};
  for (const id of IMPROVEMENT_IDS) {
    const build = IMPROVEMENT_GILT[id];
    if (build) out[id] = build(BOARD.hexRadius * IMPROVEMENTS.props[id].size);
  }
  return out;
}

/**
 * The three site sculpts, by kind.
 *
 * Typed `Record<SiteKind, …>` for `IMPROVEMENT_PROPS`' reason: this is the one
 * place the art and the data are joined, so a fourth kind of site is a compile
 * error here rather than an invisible thing standing on a hex. They are designed
 * as a *set* — one broken vertical, one cluster of small solids, one palisade —
 * because the only question that matters is whether a player can tell them apart
 * at the ortho camera under the fog wash. See their docblocks in `geometry.ts`.
 */
export const SITE_PROPS: Record<SiteKind, (size: number) => BufferGeometry> = {
  ruins: brokenColumns,
  village: hutCluster,
  camp: raiderCamp,
};

/** The site kinds, in the order everything that walks them walks them. */
export const SITE_KINDS: readonly SiteKind[] = ['ruins', 'village', 'camp'];

/** One prop per site kind, each built at the size its data row asks for. */
function buildSiteProps(): Record<SiteKind, BufferGeometry> {
  const out: Partial<Record<SiteKind, BufferGeometry>> = {};
  for (const kind of SITE_KINDS) {
    out[kind] = SITE_PROPS[kind](BOARD.hexRadius * SITES.props[kind].size);
  }
  return out as Record<SiteKind, BufferGeometry>;
}

/**
 * One flat quad per tile-atlas cell: the twelve resource roundels, the six
 * yield glyphs and the ten numerals.
 *
 * The same bargain `buildBadgeQuads` makes, one plane down: the atlas rectangle
 * is baked into the geometry, so every mark of one kind on the whole board is a
 * single `InstancedMesh` and all thirteen kinds share one texture and one
 * material. See `atlasDecal` for why these lie in xz where a badge stands in xy.
 *
 * The resource cells are *not* here. They used to be — a flat roundel printed on
 * the face beside the yield stacks — and they stood up (`buildResourceMarkers`),
 * which left the decal form with no reader at all. A plane is baked into a
 * geometry's vertices, so a mark that changed plane changed builder.
 */
function buildIconDecals(): {
  yields: Record<YieldKey, BufferGeometry>;
  numerals: BufferGeometry[];
} {
  const decal = (cell: Parameters<typeof tileIconRect>[0]): BufferGeometry => {
    const rect = tileIconRect(cell);
    return atlasDecal(rect.u0, rect.v0, rect.u1, rect.v1);
  };
  const yields: Partial<Record<YieldKey, BufferGeometry>> = {};
  for (const key of YIELD_KEYS) yields[key] = decal({ set: 'yield', id: key });
  return {
    yields: yields as Record<YieldKey, BufferGeometry>,
    numerals: NUMERAL_CELLS.map((digit) => decal({ set: 'numeral', id: digit })),
  };
}

/**
 * The same twelve resource cells again, *standing up*.
 *
 * A resource marker is a class badge one plane down: an upright quad turned to
 * the fixed camera and floated over the hex on a pin, rather than a decal lying
 * on the face. So it is built with `atlasQuad` — the badge's own builder —
 * against the *tile* atlas's rectangles, which is the whole of the sharing: one
 * texture, one atlas layout, two planes.
 *
 * The flat builder keeps the yield glyphs and the numerals, which still lie on
 * the ground; only the roundels stood up, and they took their twelve geometries
 * with them rather than growing twelve more. Reusing the decals was never
 * available: a plane's orientation is baked into its vertices.
 */
/**
 * The twelve charges, standing up: `buildResourceMarkers` with a different set
 * of atlas rectangles, and nothing else different at all.
 *
 * Written as its own function rather than folded into that one because the two
 * are keyed by different id spaces and a `Record<ResourceId | HeraldryId, …>`
 * would be a table with no total reader. `CHARGE_CELLS` is asked rather than
 * `HERALDRY_IDS` for `buildSiteMarkers`' reason: the atlas's own cell list is
 * the authority on what has a rectangle.
 */
function buildChargeMarkers(): Record<HeraldryId, BufferGeometry> {
  const out: Partial<Record<HeraldryId, BufferGeometry>> = {};
  for (const id of CHARGE_CELLS) {
    const rect = tileIconRect({ set: 'charge', id });
    out[id] = atlasQuad(rect.u0, rect.v0, rect.u1, rect.v1);
  }
  return out as Record<HeraldryId, BufferGeometry>;
}

/**
 * The ten axis signs, standing up: `buildChargeMarkers` against a third set of
 * atlas rectangles and nothing else different.
 *
 * `AXIS_CELLS` is asked rather than `BELIEF_AXES` for `buildSiteMarkers`' reason:
 * the atlas's own cell list is the authority on what has a rectangle.
 */
function buildAxisMarkers(): Record<BeliefAxis, BufferGeometry> {
  const out: Partial<Record<BeliefAxis, BufferGeometry>> = {};
  for (const id of AXIS_CELLS) {
    const rect = tileIconRect({ set: 'axis', id });
    out[id] = atlasQuad(rect.u0, rect.v0, rect.u1, rect.v1);
  }
  return out as Record<BeliefAxis, BufferGeometry>;
}

function buildResourceMarkers(): Record<ResourceId, BufferGeometry> {
  const out: Partial<Record<ResourceId, BufferGeometry>> = {};
  for (const id of RESOURCE_IDS) {
    const rect = tileIconRect({ set: 'resource', id });
    out[id] = atlasQuad(rect.u0, rect.v0, rect.u1, rect.v1);
  }
  return out as Record<ResourceId, BufferGeometry>;
}

/**
 * The two site cells, standing up: the same builder, the same atlas, one more
 * set of rectangles. See `buildResourceMarkers` — nothing here is different
 * except which cells are asked for, which is the whole benefit of the sets
 * sharing one texture.
 */
function buildSiteMarkers(): Record<DiscoveryKind, BufferGeometry> {
  const out: Partial<Record<DiscoveryKind, BufferGeometry>> = {};
  for (const id of SITE_MARK_CELLS) {
    const rect = tileIconRect({ set: 'site', id });
    out[id] = atlasQuad(rect.u0, rect.v0, rect.u1, rect.v1);
  }
  return out as Record<DiscoveryKind, BufferGeometry>;
}

/**
 * The ten numeral cells again, *standing up* — the same trick
 * `buildResourceMarkers` plays, one set over. This is what the worker's charge
 * badge (`pieces.ts`) is built from: a small camera-facing digit at a badge's
 * corner is a token standing in the diorama, not a mark lying on the ground, so
 * the flat decals `buildIconDecals` keeps for the lens cannot be reused any more
 * than the resource decals could — see that function's own docblock.
 */
function buildNumeralMarkers(): BufferGeometry[] {
  return NUMERAL_CELLS.map((digit) => {
    const rect = tileIconRect({ set: 'numeral', id: digit });
    return atlasQuad(rect.u0, rect.v0, rect.u1, rect.v1);
  });
}

/**
 * One geometry per shape, built once and shared by every board ever built.
 *
 * Prisms are pre-built per height class rather than being one unit prism scaled
 * in y, precisely so instance scaling can stay uniform (see the module
 * docblock). There are five classes, so this costs five geometries.
 */
export class BoardGeometry {
  readonly prisms: Record<HeightClass, BufferGeometry>;
  readonly peak: BufferGeometry;
  /** The snow on a peak, drawn with the peak's own instance matrix. */
  readonly snow: BufferGeometry;
  /**
   * Two silhouettes per forest kind. Which one a tree takes is hashed, so a
   * stand of pines is a mix rather than one shape stamped three times — the
   * cheapest possible variation, and one extra draw call per kind.
   */
  readonly pine: BufferGeometry;
  readonly pineAlt: BufferGeometry;
  readonly broadleaf: BufferGeometry;
  readonly broadleafAlt: BufferGeometry;
  readonly boulder: BufferGeometry;
  /** Ground clutter: the small stuff that turns terrain into a set. */
  readonly tuft: BufferGeometry;
  readonly flower: BufferGeometry;
  readonly cactus: BufferGeometry;
  readonly reeds: BufferGeometry;
  /**
   * The oasis: a round disc of water lying on the tile face and the palms that
   * stand round it. The pool is built at unit radius and scaled by its instance,
   * like every other flat mark here.
   */
  readonly palm: BufferGeometry;
  readonly pool: BufferGeometry;
  /** The green wash on a floodplain's face. A filled hexagon, not a band. */
  readonly floodWash: BufferGeometry;
  /**
   * The sculpted miniatures, keyed by *sculpt* rather than by unit type: which
   * type is drawn as which class is a fact about the art direction that lives in
   * `data/units.json` (`modelClass`), and the handful of rows the board draws
   * one grade finer than that is `pieces.byUnitType` in `data/view3d.json`. Ask
   * for one through `unitSculpt` (or `sculptFor` when all you have is a type),
   * never by unit id.
   */
  readonly pieces: Record<SculptId, UnitPiece>;
  /**
   * The floating unit badges: one atlas-carrying quad per class, and the flat
   * ring of player colour that goes round every one of them. See `badges3d.ts`.
   */
  readonly badgeIcons: Record<BadgeClass, BufferGeometry>;
  readonly badgeRim: BufferGeometry;
  /** City shapes: the houses of the town and the pole its banner flies from. */
  readonly houseBody: BufferGeometry;
  readonly houseRoof: BufferGeometry;
  /**
   * The **aged** town's shapes, added when cities learned to show their era
   * (design ledger Entry VII's W1). One geometry per part, built once here with
   * every other shared shape, and *placed* by `cities3d.ts` — which decides
   * which of them a given town is entitled to. See `cityTier`.
   *
   * The gable roof replaces `houseRoof` from Æra II on and shares `houseBody`
   * with it, because a town that ages re-roofs; it does not rebuild its walls.
   */
  readonly houseGableRoof: BufferGeometry;
  readonly palisadeStake: BufferGeometry;
  readonly wallSegment: BufferGeometry;
  readonly shrine: BufferGeometry;
  readonly shrineFinial: BufferGeometry;
  readonly temple: BufferGeometry;
  readonly palaceBody: BufferGeometry;
  readonly palaceRoof: BufferGeometry;
  readonly palaceFinial: BufferGeometry;
  /** The wonder's plinth and its gilt tip. One generic sculpt — see `cityWonder`. */
  readonly wonder: BufferGeometry;
  readonly wonderTip: BufferGeometry;
  readonly pole: BufferGeometry;
  /** Overlay shapes: reachable tint, highlight ring, path chip, HP bar. */
  readonly decal: BufferGeometry;
  readonly ring: BufferGeometry;
  /**
   * The reachable set's own rim — a thinner hex band, drawn inside the selection
   * ring so a hovered reachable hex wears both without either z-fighting.
   *
   * A second buffer rather than `ring` at a smaller instance scale, because a
   * scaled ring scales its *band* too: shrinking the selection ring to fit
   * inside itself would thin the line at exactly the moment the design wants it
   * kept. See `OverlaySpec.reachableRimColor`.
   */
  readonly reachRing: BufferGeometry;
  readonly dot: BufferGeometry;
  readonly bar: BufferGeometry;
  /**
   * The road: half a link, and the hub a paved hex with nowhere to go draws.
   *
   * `roadStrip` is `riverSegment`'s unit quad again — a flat one-by-one in the
   * xz plane, stretched and turned by the instance matrix — because a road is
   * exactly the same *kind* of mark a river is: one shape, one draw for every
   * road on the board, and a different rotation per instance. Its own buffer
   * rather than the river's, for `borderBand`'s reason: two things that happen
   * to be the same shape today must not become one thing somebody re-cuts for
   * one of them.
   *
   * Half a link, and only ever half, because the two hexes a road runs between
   * each draw their own: that is what lets a road be a fact about a *tile*
   * (`Tile.road`), which is what lets one instance carry one `tile:` and fade
   * with it. See `roads3d.ts`.
   */
  readonly roadStrip: BufferGeometry;
  readonly roadHub: BufferGeometry;
  /** A fuller hexagon than `decal`, for the territory tint and the lens wash. */
  readonly territory: BufferGeometry;
  /**
   * One tile's half of a border line: a unit quad lying flat, scaled by the
   * instance matrix into a band along one hex edge (`TerritoryLayer`).
   *
   * The *same shape* a river ribbon is — an edge band is an edge band, and both
   * are built by `riverSegment`, whose counter-clockwise winding is the thing
   * neither of them may lose. A second buffer rather than the river's own,
   * because the two are collected by different layers with different lifetimes
   * and sharing one would make a border's draw call depend on whether the map
   * happens to have rivers on it.
   */
  readonly borderBand: BufferGeometry;
  /**
   * The mitre where two of one tile's border bands meet at a hex corner: a kite
   * sized in units of the band's width, scaled and turned onto the corner by
   * `borderCornerMatrix` (`cities3d.ts`).
   *
   * Its own buffer rather than a second use of `borderBand` because it is a
   * different *shape* — the band is a rectangle and this is the four-sided
   * piece that fills the 120° turn between two of them. One geometry serves
   * every corner on the board: the angle is a hexagon's, so it never varies.
   */
  readonly borderCorner: BufferGeometry;
  /**
   * The diorama props, keyed by resource id: the wheat, the cattle, the ore.
   * Baked lit for every seat, exactly as everything else on the board is, and
   * then taken down per seat by the reveal pass where the resource has a
   * `requiresTech` — see `BuiltBoard.resourceCells` and `reveal3d.ts`. The
   * roundels reach the same answer from the other side (`visibleResourceAt`),
   * which is why marker and prop can never disagree.
   */
  readonly resourceProps: Record<ResourceId, BufferGeometry>;
  /**
   * The improvement props, keyed by improvement id: the furrows, the mine head,
   * the fence. Built here with every other shared shape and *placed* by
   * `improvements3d.ts`, which is a layer of its own because a farm can appear
   * mid-game and the board's buffers may not be rebuilt for that.
   */
  readonly improvementProps: Record<ImprovementId, BufferGeometry>;
  /**
   * The gilt element of the five great works, keyed by improvement id and
   * **absent** for every improvement a worker can build.
   *
   * A second geometry rather than a second group on the first, for the reason
   * written over `IMPROVEMENT_GILT`: the layer draws it as a second instance
   * over the same matrix so each bucket keeps one ink, which is what the fog
   * wash is computed from.
   */
  readonly improvementGilt: Partial<Record<ImprovementId, BufferGeometry>>;
  /**
   * The three *site* props — the ruin, the village, the barbarian camp — keyed
   * by site kind. Built here with every other shared shape and placed by
   * `sites3d.ts`, a layer of its own for `improvements3d.ts`'s exact reason: all
   * three appear and disappear during play, and the board's buffers may not be
   * rebuilt for a gameplay event.
   */
  readonly siteProps: Record<SiteKind, BufferGeometry>;
  /**
   * The flat tile marks, one quad per cell of the tile atlas that still lies on
   * the ground: a yield glyph and a numeral. Both are drawn by `lens3d.ts` with
   * the atlas's own depth-test-free material.
   */
  readonly yieldGlyphs: Record<YieldKey, BufferGeometry>;
  readonly numerals: BufferGeometry[];
  /**
   * The standing form of the same twelve roundels — an upright quad turned to
   * the camera — and the one pin every marker is planted on. See
   * `buildResourceMarkers` and `addResourceMarkers` in `lens3d.ts`.
   */
  readonly resourceMarkers: Record<ResourceId, BufferGeometry>;
  readonly resourceStem: BufferGeometry;
  /**
   * The same standing quad again, for the two **discovery site** marks — a ruin
   * and a village — so a site says what it is at a glance the way a resource
   * does. Planted on `resourceStem`, the one pin on the board, and drawn by
   * `sites3d.ts` rather than by the lens: a site marker is not a switch the
   * player turns on, it is part of the site, and prop and pin have to leave the
   * board together the turn somebody claims it.
   */
  readonly siteMarkers: Record<DiscoveryKind, BufferGeometry>;
  /**
   * The standing form of the ten numeral cells, for the worker's charge badge
   * — see `buildNumeralMarkers`. Indexed by digit, exactly as `numerals` is.
   */
  readonly numeralMarkers: BufferGeometry[];
  /** An upright unit quad standing on its base, for the sprite units. */
  readonly billboard: BufferGeometry;
  /** The blob shadow under a billboard, and the foot it stands in. */
  readonly blob: BufferGeometry;
  readonly standee: BufferGeometry;
  /**
   * The blank chart under an unexplored hex: a patch of vellum, the faint hex
   * ruled on it, and the serpent that occasionally swims across the empty
   * quarters. Drawn by `fog3d.ts`, which switches them on exactly where the
   * board's own instances have been switched off.
   *
   * They live in `BoardGeometry` rather than in the fog layer because every
   * shared shape on this board does — one geometry per shape, built once,
   * reused by every board ever built.
   */
  readonly chartPatch: BufferGeometry;
  readonly ghostRing: BufferGeometry;
  readonly serpentDecal: BufferGeometry;
  /**
   * The chart's inscription — *hic svnt dracones* — as a flat decal, exactly
   * like the serpent beside it and out of the same atlas cell list. Two
   * geometries rather than one shared quad because the atlas rectangle is baked
   * into the vertices; see `atlasDecal`.
   */
  readonly draconesDecal: BufferGeometry;
  /**
   * The twelve heraldic charges, standing up: one upright camera-facing quad per
   * charge, out of the tile atlas.
   *
   * One set serves **both** places a charge is printed in the world — the canton
   * on a city flag and the boss on a unit badge — because both are quads turned
   * to the same fixed camera, and a charge is the same drawing at two sizes. The
   * size is the instance matrix's business; the plane is the geometry's, which
   * is why the flat `numerals` and the standing `numeralMarkers` had to be two
   * sets and these do not.
   */
  readonly chargeMarkers: Record<HeraldryId, BufferGeometry>;
  /**
   * The ten pantheon signs, standing up — the same builder against the axis
   * cells of the same atlas (`AXIS_CELLS`).
   *
   * They are what a **religion's device** is assembled from at draw time: a
   * faith is founded mid-game out of whatever gods its founder took, so there is
   * nothing fixed to bake a per-religion quad of, and there does not need to be
   * (`religionDevice`).
   */
  readonly axisMarkers: Record<BeliefAxis, BufferGeometry>;
  /** The pale band on a land tile that touches the sea. */
  readonly shoreRing: BufferGeometry;
  /** One river's worth of water, lying across one grout gap. */
  readonly river: BufferGeometry;

  constructor() {
    const radius = BOARD.hexRadius * (1 - BOARD.tileGap);
    // Every prism carries the contact shading in its vertex colours; see
    // `bakeContactShading`. It costs one attribute and no draw calls at all.
    const prismFor = (topY: number): BufferGeometry =>
      hexPrism(radius, topY - BOARD.floorY, {
        band: DECOR.ground.aoBand,
        strength: DECOR.ground.aoStrength,
      });
    this.prisms = {
      ocean: prismFor(BOARD.height.ocean),
      coast: prismFor(BOARD.height.coast),
      land: prismFor(BOARD.height.land),
      hills: prismFor(BOARD.height.hills),
      mountain: prismFor(BOARD.height.mountain),
    };
    this.peak = mountainPeak(BOARD.peak.radius, BOARD.peak.height);
    this.snow = mountainSnow(BOARD.peak.radius, BOARD.peak.height, DECOR.snowCap.fraction);
    this.pine = pineTree(DECOR.pine);
    this.pineAlt = pineTree(DECOR.pineAlt);
    this.broadleaf = roundTree(DECOR.jungle);
    this.broadleafAlt = roundTree(DECOR.jungleAlt);
    this.boulder = rock(DECOR.rock.radius);
    this.tuft = grassTuft(DECOR.clutter.tuft);
    this.flower = flowerSpray(DECOR.clutter.flower);
    this.cactus = cactus(DECOR.clutter.cactus);
    this.reeds = reedClump(DECOR.reeds);
    this.palm = palmTree(DECOR.oasis.palm);
    this.pool = poolDisc();
    this.floodWash = hexDecal(BOARD.hexRadius * DECOR.floodplain.scale);
    this.pieces = buildUnitPieces();
    this.badgeIcons = buildBadgeQuads();
    this.badgeRim = discRing(rimInnerFraction(), VIEW3D.badges.rimSegments);
    this.houseBody = cityHouseBody(CITY.house);
    this.houseRoof = cityHouseRoof(CITY.house);
    this.houseGableRoof = cityGableRoof({ ...CITY.house, ...CITY.gable });
    this.palisadeStake = palisadeStake(CITY.palisade);
    this.wallSegment = cityWallSegment({
      ...CITY.wall,
      length: BOARD.hexRadius * CITY.wall.length,
    });
    this.shrine = cityShrine(CITY.shrine);
    this.shrineFinial = cityShrineFinial(CITY.shrine);
    this.temple = cityTemple(CITY.temple);
    this.palaceBody = cityPalaceBody(CITY.palace);
    this.palaceRoof = cityPalaceRoof(CITY.palace);
    this.palaceFinial = cityPalaceFinial({ ...CITY.palace, size: CITY.palace.finial });
    this.wonder = cityWonder(CITY.wonder);
    this.wonderTip = cityWonderTip(CITY.wonder);
    this.pole = bannerPole(CITY.poleRadius, CITY.poleHeight);
    this.decal = hexDecal(BOARD.hexRadius * OVERLAY.reachableScale);
    this.territory = hexDecal(BOARD.hexRadius * VIEW3D.territory.tintScale);
    this.ring = hexRing(
      BOARD.hexRadius * OVERLAY.ringOuter,
      BOARD.hexRadius * OVERLAY.ringWidth,
    );
    this.reachRing = hexRing(
      BOARD.hexRadius * OVERLAY.reachableRimOuter,
      BOARD.hexRadius * OVERLAY.reachableRimWidth,
    );
    this.dot = pathDot(OVERLAY.pathDotRadius, OVERLAY.pathDotHeight);
    this.resourceProps = buildResourceProps();
    this.improvementProps = buildImprovementProps();
    this.improvementGilt = buildImprovementGilt();
    this.siteProps = buildSiteProps();
    const icons = buildIconDecals();
    this.yieldGlyphs = icons.yields;
    this.numerals = icons.numerals;
    this.resourceMarkers = buildResourceMarkers();
    this.siteMarkers = buildSiteMarkers();
    this.resourceStem = markerPin(VIEW3D.lens.resourceStemTaper);
    this.numeralMarkers = buildNumeralMarkers();
    this.river = riverSegment();
    this.borderBand = riverSegment();
    this.roadStrip = riverSegment();
    this.roadHub = hexDecal(BOARD.hexRadius * VIEW3D.roads.hubScale);
    this.borderCorner = borderCorner();
    this.bar = barQuad();
    // Sprite units. Built unconditionally rather than behind the style switch:
    // three small shared geometries cost nothing, and a board that had to be
    // rebuilt to flip an art-direction switch would not be trivially flippable.
    this.billboard = spriteQuad();
    this.blob = hexDecal(BOARD.hexRadius * SPRITE.shadowRadius);
    const base = SPRITE.standee.base;
    this.standee = standeeBase({
      radius: BOARD.hexRadius * base.radius,
      thickness: base.thickness,
      squash: base.squash,
      collarScale: base.collarScale,
      collarThickness: base.collarThickness,
      tabWidth: BOARD.hexRadius * base.tabWidth,
      tabHeight: base.tabHeight,
      tabThickness: base.tabThickness,
    });
    this.shoreRing = hexRing(
      BOARD.hexRadius * DECOR.shore.outer,
      BOARD.hexRadius * DECOR.shore.width,
    );
    const FOG = VIEW3D.fog;
    this.chartPatch = hexDecal(BOARD.hexRadius * FOG.chartScale);
    this.ghostRing = hexRing(
      BOARD.hexRadius * FOG.ghostOuter,
      BOARD.hexRadius * FOG.ghostWidth,
    );
    const serpent = tileIconRect({ set: 'marginalia', id: 'serpent' });
    this.serpentDecal = atlasDecal(serpent.u0, serpent.v0, serpent.u1, serpent.v1);
    const dracones = tileIconRect({ set: 'marginalia', id: 'dracones' });
    this.draconesDecal = atlasDecal(dracones.u0, dracones.v0, dracones.u1, dracones.v1);
    this.chargeMarkers = buildChargeMarkers();
    this.axisMarkers = buildAxisMarkers();
  }

  dispose(): void {
    for (const prism of Object.values(this.prisms)) prism.dispose();
    this.peak.dispose();
    this.snow.dispose();
    this.pine.dispose();
    this.pineAlt.dispose();
    this.broadleaf.dispose();
    this.broadleafAlt.dispose();
    this.boulder.dispose();
    this.tuft.dispose();
    this.flower.dispose();
    this.cactus.dispose();
    this.reeds.dispose();
    this.palm.dispose();
    this.pool.dispose();
    this.floodWash.dispose();
    for (const piece of Object.values(this.pieces)) piece.geometry.dispose();
    for (const quad of Object.values(this.badgeIcons)) quad.dispose();
    this.badgeRim.dispose();
    this.houseBody.dispose();
    this.houseRoof.dispose();
    this.houseGableRoof.dispose();
    this.palisadeStake.dispose();
    this.wallSegment.dispose();
    this.shrine.dispose();
    this.shrineFinial.dispose();
    this.temple.dispose();
    this.palaceBody.dispose();
    this.palaceRoof.dispose();
    this.palaceFinial.dispose();
    this.wonder.dispose();
    this.wonderTip.dispose();
    this.pole.dispose();
    this.decal.dispose();
    this.ring.dispose();
    this.reachRing.dispose();
    this.dot.dispose();
    for (const prop of Object.values(this.resourceProps)) prop.dispose();
    for (const prop of Object.values(this.improvementProps)) prop.dispose();
    for (const prop of Object.values(this.improvementGilt)) prop?.dispose();
    for (const prop of Object.values(this.siteProps)) prop.dispose();
    for (const quad of Object.values(this.resourceMarkers)) quad.dispose();
    for (const quad of Object.values(this.siteMarkers)) quad.dispose();
    this.resourceStem.dispose();
    for (const quad of this.numeralMarkers) quad.dispose();
    for (const quad of Object.values(this.yieldGlyphs)) quad.dispose();
    for (const quad of this.numerals) quad.dispose();
    this.river.dispose();
    this.borderBand.dispose();
    this.borderCorner.dispose();
    this.bar.dispose();
    this.territory.dispose();
    this.billboard.dispose();
    this.blob.dispose();
    this.standee.dispose();
    this.shoreRing.dispose();
    this.chartPatch.dispose();
    this.ghostRing.dispose();
    this.serpentDecal.dispose();
    this.draconesDecal.dispose();
    for (const quad of Object.values(this.chargeMarkers)) quad.dispose();
    for (const quad of Object.values(this.axisMarkers)) quad.dispose();
  }
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * One instance that two tiles have a say in: a river ribbon, which lies in the
 * grout *between* `a` and `b` rather than on either of them.
 *
 * The one case the tile→instance map cannot express, and it needs its own shape
 * rather than being filed under one of the two hexes, because the fog rule for
 * an edge is a rule about the pair: a river is drawn while *either* bank is
 * charted. Filed under one tile it would vanish the moment that bank went dark
 * and leave a river running out of nowhere on the other side.
 */
export interface SharedEdge {
  handle: InstanceHandle;
  a: number;
  b: number;
}

/**
 * Which instances belong to which tile — the whole of the incremental-fog
 * mechanism, handed out by the board build.
 *
 * `own` is keyed by `tileIndex` and holds every instance that lives *on* one
 * hex: its prism, its peak and snow, its trees and boulders and clutter, its
 * resource props, its sand band. `shared` is the rivers. Between them they
 * account for every instance in the board's buffers, which is what lets a
 * visibility change be a handful of attribute writes instead of a rebuild —
 * `test/fog3d.test.ts` asserts the accounting, because a tile whose scatter went
 * unregistered would be a hidden hex with three trees still growing on it.
 */
export interface TileInstances {
  own: Map<number, InstanceHandle[]>;
  shared: SharedEdge[];
}

/**
 * One tile's resource props, and which resource they are drawing.
 *
 * The board's memory of what it baked, in the same spirit as `treedCells` and
 * for a related reason: the *reveal* pass has to be able to take the ore off a
 * hex for one seat without touching the boulders beside it, and "which of this
 * tile's instances are the wheat" is a question only the bake can answer. Sifted
 * out here rather than re-derived from geometry identity later, because two
 * resources can share a sculpt (the cairn fallback) and identity would then hide
 * the wrong hex's props.
 *
 * Every resource tile is recorded, not only the tech-gated ones: the bake should
 * report what it did, and it is the reveal pass's business — not the board's —
 * that most rows have no gate to check. See `RevealView` in `reveal3d.ts`.
 */
export interface ResourcePropCell {
  /** `tileIndex` of the hex these props stand on. */
  cell: number;
  resource: ResourceId;
  handles: InstanceHandle[];
}

export interface BuiltBoard {
  group: Group;
  /** Which instance slots each tile owns. See `TileInstances`. */
  tiles: TileInstances;
  /**
   * Every hex this bake planted a canopy on, in map order.
   *
   * The board's memory of its own trees, and the third source of the suppression
   * sweep. A forest can be cleared mid-game (`chopFeature`) and the board is
   * never re-baked for a gameplay event, so "there are trees drawn on that hex"
   * stops being derivable from `Tile.feature` the moment the axe lands: the state
   * says `none` and the buffers still say pine. Only the bake knows, so the bake
   * writes it down.
   *
   * In map order rather than in any order the game produced, for
   * `improvedCells`' reason: it is a fact about the board, and an order that
   * depended on history would make two identical boards behave differently.
   */
  treedCells: readonly number[];
  /**
   * Every resource prop this bake planted, by tile, in map order. The reveal
   * pass's input; see `ResourcePropCell`.
   */
  resourceCells: readonly ResourcePropCell[];
  /** World-space extent of one copy of the board, for framing and clamping. */
  bounds: Bounds;
  /** Horizontal wrap period in world units. */
  wrapWidth: number;
  tileCount: number;
  /** Instances actually uploaded, wrap copies included. For the stats readout. */
  instanceCount: number;
  drawCalls: number;
  /**
   * Switches off the dressing one tile yields to what has been built on it: the
   * meadow a farm ploughs under (`SUPPRESS.clutter`), or everything a town
   * clears the ground of (`SUPPRESS.decor`).
   *
   * The whole reason the board is built once per game. It writes matrices on the
   * named tile's own instances and nothing else — a dozen or so — and it
   * composes with fog rather than racing it: see the two-bit state machine in
   * `instances.ts`. Idempotent, and free on a tile the seat cannot see.
   */
  suppressTile(cell: number, scope: SuppressScope): void;
  /**
   * The inverse. Nothing in the game calls it — a town is never un-founded, and
   * pillaging a farm destroys the *improvement* while the ground it cleared
   * stays cleared, which is the Civ rule and also what happens to a meadow.
   */
  unsuppressTile(cell: number): void;
  dispose(): void;
}

/**
 * The substrate: one slab under the whole board, in the darkest earth tone.
 *
 * It exists because the tiles are drawn under-sized. Without it you would look
 * straight down the gap between two same-height tiles and see sky, and the board
 * would read as a lattice rather than a solid object. With it, the gaps become
 * grout lines — which is most of what sells "pieces on a table".
 *
 * One slab spans all three wrap copies rather than three slabs meeting edge to
 * edge, because two abutting boxes leave a visible hairline exactly where the
 * seam must be invisible.
 */
function buildSubstrate(bounds: Bounds, period: number): Mesh {
  const pad = BOARD.hexRadius * BOARD.substratePad;
  const width = bounds.maxX - bounds.minX + pad * 2 + period * 2;
  const depth = bounds.maxZ - bounds.minZ + pad * 2;
  const top = BOARD.height.ocean - BOARD.substrateDrop;
  const height = top - (BOARD.floorY - 0.4);

  const geometry = new BoxGeometry(width, height, depth);
  geometry.translate(
    (bounds.minX + bounds.maxX) / 2,
    top - height / 2,
    (bounds.minZ + bounds.maxZ) / 2,
  );
  const material = new MeshBasicMaterial({
    color: new Color(shade(VIEW3D.palette.earth!, BOARD.substrateShade)),
    // The slab is seen from above through cracks and from the side at the map
    // edge; DoubleSide costs nothing here and avoids a hollow-looking rim.
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * The chart-table: the surface the whole board is lying on.
 *
 * One unlit plane under the substrate, wider than the three wrap copies and
 * running far past the poles, shaded by *vertex colour* from the lit vellum in
 * the middle to a deeper tone at the far edges. That is the whole vignette: no
 * texture, no image, no shader, no second render pass — a strip of quads whose
 * corners carry a colour, built once with the board and never touched again.
 *
 * Why a plane and not just a darker clear colour: a flat backdrop is a void, and
 * the board floats in it. A surface that is *lighter under the board than at the
 * edges of the room* reads as a lit table, and the diorama sits on it.
 *
 * The fall-off is measured in z only. Rows do not wrap but columns do — the
 * board is a cylinder and the camera wraps with it — so darkening by distance
 * in x would put a shadow on one side of a seam that has no sides. z is also
 * where the void actually is: past the poles, which is the only direction you
 * can look off the edge of the world.
 *
 * See `TableSpec` for what this surface becomes when fog of war arrives.
 */
function buildTable(bounds: Bounds, period: number): Mesh {
  const pad = BOARD.hexRadius * BOARD.substratePad;
  const width = bounds.maxX - bounds.minX + pad * 2 + period * 2;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const halfDepth = (bounds.maxZ - bounds.minZ) / 2 + BOARD.hexRadius * TABLE.edgePad;
  const depth = (halfDepth + TABLE.reach) * 2;

  // One segment per two world units of depth: enough that the gradient is
  // smooth under an orthographic camera, cheap enough to be a rounding error
  // (a few hundred vertices against the board's tens of thousands).
  const segments = Math.max(8, Math.round(depth / 2));
  const geometry = new PlaneGeometry(width, depth, 1, segments);
  // `PlaneGeometry` stands up in xy; lay it down, then move it under the board.
  geometry.rotateX(-Math.PI / 2);
  // Just below the substrate's own underside, so the slab keeps a visible edge
  // sitting on the table rather than being coplanar with it.
  geometry.translate(centerX, BOARD.floorY - 0.45, centerZ);

  const lit = new Color(TABLE.color);
  const dim = new Color(TABLE.edgeColor);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const mixed = new Color();
  for (let i = 0; i < position.count; i++) {
    const over = Math.abs(position.getZ(i) - centerZ) - halfDepth;
    const t = Math.max(0, Math.min(1, over / TABLE.edgeFalloff));
    // Smoothstep: a linear ramp on a surface this large shows its own start and
    // end as two faint bands, and the eye finds both.
    mixed.copy(lit).lerp(dim, t * t * (3 - 2 * t));
    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));

  // Unlit, like the substrate: the gradient *is* its shading, and running it
  // through the toon ramp would band it into three flat steps.
  const material = new MeshBasicMaterial({ vertexColors: true });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  // Under everything: it must never take a pixel from the board it carries.
  mesh.renderOrder = -1;
  return mesh;
}

/**
 * Every river on the map, as one flat ribbon per flagged edge.
 *
 * Each edge is flagged on *both* the tiles that share it (see the `map.ts`
 * docblock), so a naive sweep would draw every segment twice. Only directions
 * 0–2 — east, south-east, south-west — are emitted; the other three are the same
 * edges seen from the far side and are covered by their own tile's first half.
 * That is exact rather than approximate, because `HEX_DIRECTIONS[d + 3]` is
 * `-HEX_DIRECTIONS[d]`.
 *
 * The ribbon lies `rivers.drop` below the *lower* of the two tiles' top faces,
 * which is what puts it in the grout instead of on it: everything outside the
 * gap is inside one prism or the other and the depth buffer hides it. Taking the
 * lower of the two matters where a river runs along the foot of a hill — anchored
 * to the higher tile it would hang in mid-air over the lower one.
 *
 * Nothing is animated and nothing is hashed: the geometry is a pure function of
 * the map, baked once with the board and replicated across the wrap like
 * everything else.
 */
function addRivers(
  map: GameMap,
  geometry: BoardGeometry,
  collector: InstanceCollector,
): SharedEdge[] {
  const edges: SharedEdge[] = [];
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const axis = new Vector3(0, 1, 0);

  // A hexagon's side equals its circumradius, so the shared edge is exactly one
  // hex radius long before the overhang that closes the corners.
  const length = BOARD.hexRadius * RIVERS.overhang;
  const width = BOARD.hexRadius * RIVERS.width;

  for (const tile of map.tiles) {
    for (let direction = 0; direction < 3; direction++) {
      if (!hasRiverEdge(tile, direction)) continue;
      const neighbor = neighborInDirection(map, tile, direction);
      if (!neighbor) continue;

      const center = cellCenter(tile.col, tile.row);
      const delta = directionDelta(direction);
      const y = Math.min(tileTopY(tile), tileTopY(neighbor)) - RIVERS.drop;
      position.set(center.x + delta.x / 2, y, center.z + delta.z / 2);
      quaternion.setFromAxisAngle(axis, edgeYaw(direction));
      scale.set(length, 1, width);
      const handle = collector.add(
        geometry.river,
        [RIVERS.color],
        new Matrix4().compose(position, quaternion, scale),
        // No inverted hull: a dark rim around a line this thin would swallow it,
        // and the grout it sits in is already the outline.
        // No `tile` either: a river belongs to *two* hexes, which is a thing the
        // one-tile map cannot say. It is reported separately, below.
        { outlined: false },
      );
      edges.push({
        handle,
        a: tileIndex(map, tile.col, tile.row),
        b: tileIndex(map, neighbor.col, neighbor.row),
      });
    }
  }
  return edges;
}

/**
 * The per-instance colour wobble.
 *
 * Value first — an even spread of light and dark is what makes a hundred trees
 * look like a hundred trees rather than one tree instanced a hundred times — and
 * then a *hue* drift on top of it, applied as opposed tilts on red and blue so
 * the total value is unchanged and only the temperature moves. Warmer and
 * cooler greens in one canopy is the thing that reads as painted; uniformly
 * lighter and darker greens still reads as a gradient.
 *
 * Costs one float3 per instance and no draw calls. See `Tint` in `instances.ts`.
 */
function decorTint(
  col: number,
  row: number,
  slot: number,
  value: number,
  hue: number,
): Tint {
  const v = 1 + hashSigned(col, row, slot) * value;
  const drift = hashSigned(col, row, slot + 1) * hue;
  return [v * (1 + drift), v, v * (1 - drift)];
}

/** The wobble a terrain prism gets: the same idea, dialled well down. */
function terrainTint(tile: Tile): Tint {
  return decorTint(
    tile.col,
    tile.row,
    STREAM.terrainTint,
    DECOR.variation.terrainValue,
    DECOR.variation.terrainHue,
  );
}

/**
 * Hash streams, named.
 *
 * Every scatter draws from its own stream so that adding a kind of clutter can
 * never reshuffle a kind that was already placed — the property the module
 * docblock promises. Placement streams are multiplied by 64 and stepped by 8 per
 * instance (position, size, yaw and tint together want six numbers), so they
 * cannot collide with each other; the roll streams are single numbers and live
 * in their own range above them.
 */
const STREAM = {
  peakYaw: 13,
  peakScale: 14,
  forestCount: 20,
  jungleCount: 21,
  rockRoll: 30,
  rockCount: 31,
  terrainTint: 41,
  tuftRoll: 50,
  tuftCount: 51,
  flowerRoll: 52,
  flowerCount: 53,
  cactusRoll: 54,
  cactusCount: 55,
  pebbleRoll: 56,
  pebbleCount: 57,
  reedRoll: 58,
  reedCount: 59,
  palmCount: 64,
  bankRoll: 60,
  bankCount: 61,
  flowerInk: 62,
  treeVariant: 63,
  resourceCount: 70,
  // Placement streams (× 64). Kept above 1 so slot 0 is never a valid slot.
  pinePlace: 2,
  junglePlace: 3,
  rockPlace: 4,
  tuftPlace: 5,
  flowerPlace: 6,
  cactusPlace: 7,
  pebblePlace: 8,
  reedPlace: 9,
  bankPlace: 10,
  resourcePlace: 11,
  palmPlace: 12,
} as const;

/** `1 + floor(h · max)` capped at `max` — a count of 1..max, hashed. */
function hashedCount(col: number, row: number, stream: number, max: number): number {
  return 1 + Math.min(max - 1, Math.floor(hashUnit(col, row, stream) * max));
}

/**
 * The unit-length world direction from a tile's centre toward its neighbour.
 * Used to aim the water-edge dressing at the water rather than scattering it.
 */
function towardNeighbor(direction: number): { x: number; z: number } {
  const delta = directionDelta(direction);
  const length = Math.hypot(delta.x, delta.z) || 1;
  return { x: delta.x / length, z: delta.z / length };
}

/**
 * The direction this tile's fresh water lies in, or −1 if it has none.
 *
 * A river edge wins over a lake, and the first flagged edge wins over the rest:
 * reeds are a hint, not a survey, and a tile with two rivers on it gets one reed
 * bed on one of them rather than a bed on every bank, which would be a marsh.
 */
function freshwaterDirection(map: GameMap, tile: Tile): number {
  for (let d = 0; d < 6; d++) if (hasRiverEdge(tile, d)) return d;
  for (let d = 0; d < 6; d++) {
    const neighbor = neighborInDirection(map, tile, d);
    if (neighbor?.terrain === 'lake') return d;
  }
  return -1;
}

/** True when this land tile touches open sea, and so wants a sand band. */
function touchesSea(map: GameMap, tile: Tile): boolean {
  for (let d = 0; d < 6; d++) {
    const neighbor = neighborInDirection(map, tile, d);
    if (neighbor && (neighbor.terrain === 'ocean' || neighbor.terrain === 'coast')) return true;
  }
  return false;
}

/**
 * Dresses one hex, and reports what it planted there: whether it laid a
 * **canopy**, and which instances are the tile's **resource props**.
 *
 * Both halves are the board's memory of what it baked, and both exist because
 * the board is built once per game and may never be re-baked for a gameplay
 * event. The canopy: a forest can be *chopped* mid-game (`chopFeature`), so the
 * renderer's sweep has to be able to ask "did I draw trees there?" of a tile
 * whose feature now says `none` — a question the *state* can no longer answer,
 * because the state is the board after the axe and the buffers are the board
 * before it. The props: a seat that has not researched Bronze Working must not
 * be shown the ore, and hiding it means writing on exactly those instances and
 * not on the rest of the hex. See `BuiltBoard.treedCells`,
 * `BuiltBoard.resourceCells`, `Renderer3D.clearGround` and `reveal3d.ts`.
 */
function addDecorations(
  map: GameMap,
  tile: Tile,
  top: number,
  center: { x: number; z: number },
  geometry: BoardGeometry,
  collector: InstanceCollector,
  /** `tileIndex` of `tile`, so every scrap of scatter is fog-addressable. */
  cell: number,
): { treed: boolean; props: InstanceHandle[] } {
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const axis = new Vector3(0, 1, 0);
  const CLUTTER = DECOR.clutter;

  /**
   * Scatters one thing on the tile. `origin` displaces the whole scatter disc,
   * which is how the water-edge dressing is aimed at a bank instead of being
   * sprinkled over the whole hex.
   *
   * `suppress` is the grade at which this scrap yields to what gets built on the
   * hex (see `SUPPRESS` in `instances.ts`). It defaults to `decor`, because a
   * town clears *everything* this function emits and forgetting to say so on a
   * new kind of dressing would leave a pine growing through a market square.
   * The ground scatter says `clutter` explicitly, which is the narrower claim: a
   * farm takes the meadow and leaves the deer in the trees.
   *
   * Hands back the handle it collected. Only the resource props keep theirs —
   * they are the one kind of dressing a *seat* can be refused (see
   * `BuiltBoard.resourceCells`) — and every other caller ignores it.
   */
  const place = (
    shape: BufferGeometry,
    color: number,
    stream: number,
    index: number,
    baseScale: number,
    options: {
      origin?: { x: number; z: number };
      spread?: number;
      suppress?: SuppressScope;
    } = {},
  ): InstanceHandle => {
    const slot = stream * 64 + index * 8;
    const spread = (options.spread ?? DECOR.spread) * BOARD.hexRadius;
    const offset = hashDisc(tile.col, tile.row, slot, spread);
    const jitter = 1 + hashSigned(tile.col, tile.row, slot + 2) * DECOR.sizeJitter;
    const yaw = hashUnit(tile.col, tile.row, slot + 3) * Math.PI * 2;
    const origin = options.origin ?? { x: 0, z: 0 };
    position.set(center.x + origin.x + offset.x, top, center.z + origin.z + offset.z);
    quaternion.setFromAxisAngle(axis, yaw);
    const s = baseScale * jitter;
    scale.set(s, s, s);
    return collector.add(shape, [color], new Matrix4().compose(position, quaternion, scale), {
      tint: decorTint(
        tile.col,
        tile.row,
        slot + 4,
        DECOR.variation.value,
        DECOR.variation.hue,
      ),
      tile: cell,
      suppressible: options.suppress ?? SUPPRESS.decor,
    });
  };

  /** Which of the two silhouettes this tree takes. Hashed per tree, not per tile. */
  const variant = (index: number): boolean =>
    hashUnit(tile.col, tile.row, STREAM.treeVariant * 64 + index) < DECOR.altChance;

  let treed = false;
  /** The tile's resource props, for the reveal pass. See the docblock above. */
  const props: InstanceHandle[] = [];
  if (tile.feature === 'forest') {
    // Two or three, hashed — an even count everywhere looks planted by a
    // machine, and the sim has no per-tile density to read.
    const count = 2 + Math.floor(hashUnit(tile.col, tile.row, STREAM.forestCount) * 2);
    for (let i = 0; i < count; i++) {
      const shape = variant(i) ? geometry.pineAlt : geometry.pine;
      place(shape, VIEW3D.featureColor.forest, STREAM.pinePlace, i, 1);
    }
    treed = true;
  } else if (tile.feature === 'jungle') {
    const count = 2 + Math.floor(hashUnit(tile.col, tile.row, STREAM.jungleCount) * 2);
    for (let i = 0; i < count; i++) {
      const shape = variant(i) ? geometry.broadleafAlt : geometry.broadleaf;
      place(shape, VIEW3D.featureColor.jungle, STREAM.junglePlace, i, 1.1);
    }
    treed = true;
  } else if (tile.feature === 'oasis') {
    /**
     * The pool first, then the palms standing round it.
     *
     * The pool is placed by hand rather than through `place`, because `place`
     * scatters and a pool is not scatter: it sits on the tile centre, flat on
     * the face, and is the one thing here that must not wander. It takes the
     * tile's own yaw and the same `overlay` treatment the sand band does, so it
     * lies *on* the prism instead of z-fighting with it.
     *
     * Both halves are `decor` grade — the default of `place`, and stated
     * explicitly on the pool because it does not go through `place`. A town
     * founded on an oasis is a town built around the well, and it clears the
     * palms and paves the pool exactly as it clears a wood.
     */
    const OASIS = DECOR.oasis;
    const poolPosition = new Vector3(center.x, top + OASIS.poolLift, center.z);
    const poolQuaternion = new Quaternion().setFromAxisAngle(axis, tileYaw(tile));
    const poolRadius = BOARD.hexRadius * OASIS.poolRadius;
    const poolScale = new Vector3(poolRadius, 1, poolRadius);
    collector.add(
      geometry.pool,
      [OASIS.poolColor],
      new Matrix4().compose(poolPosition, poolQuaternion, poolScale),
      {
        overlay: true,
        opacity: OASIS.poolOpacity,
        tile: cell,
        suppressible: SUPPRESS.decor,
      },
    );
    const count = hashedCount(tile.col, tile.row, STREAM.palmCount, Math.max(1, OASIS.palms));
    for (let i = 0; i < count; i++) {
      place(geometry.palm, shade(OASIS.palmColor, OASIS.palmShade), STREAM.palmPlace, i, 1, {
        spread: OASIS.palmSpread,
      });
    }
    // Deliberately **not** `treed`. `treedCells` is the board's memory of what
    // the chop will have to clear (see `BuiltBoard.treedCells`), and neither
    // arid feature has a row in the chop table — nothing can ever take an oasis
    // away, so recording one would be a promise the sweep never has to keep.
  }

  /**
   * The resource prop, and the clutter it displaces.
   *
   * A resource tile gets its own scatter *instead of* the generic grass,
   * flowers, cacti, pebbles and hill boulders, not on top of them. Two reasons,
   * and the second is the real one: a wheat field with tufts of grass growing
   * through it is overlap soup at this zoom, and the prop is the tile's *news* —
   * whatever else is on the hex is competing with the one thing the player is
   * meant to notice. Trees are the exception and stay: the deer, the silk and
   * the spices all live in a canopy, and a forest with the trees removed to make
   * room for the deer would be a forest that stopped being one.
   */
  const resource = tile.resource;
  const prop = resource === undefined ? null : resourcePropSpec(resource);

  /**
   * A farm or a mine displaces the same clutter a resource prop does, through
   * the same mechanism and for the same reason: worked ground is not grassy
   * ground, and furrows drawn through a meadow are overlap soup at this zoom.
   * It is `clearsClutter` in `data/improvements.json`, so which improvements do
   * it is a data question — and it is deliberately *false* for the four
   * resource-improvements, which are built round something the tile already
   * shows and compose with it (the fence goes around the cattle).
   *
   * It used to be a *bake-time* decision, read off `Tile.improvement` here, and
   * that made building one farm re-bake ninety thousand instances. It is now a
   * per-instance bit instead: the board always emits the full dressing, marks it
   * with the grade at which it yields (`SUPPRESS`), and the renderer switches the
   * grade off when the improvement lands (`BuiltBoard.suppressTile`). Same
   * picture, no rebuild, and it composes with fog rather than fighting it — see
   * the two-bit state machine in `instances.ts`.
   */

  // Rocks scatter on bare hills only: a forested hill already has silhouette,
  // and piling boulders under the trees just made mud.
  if (!prop && tile.hills && tile.feature === 'none' && tile.terrain !== 'mountain') {
    if (hashUnit(tile.col, tile.row, STREAM.rockRoll) < 0.55) {
      const count = hashedCount(tile.col, tile.row, STREAM.rockCount, 2);
      for (let i = 0; i < count; i++) {
        place(geometry.boulder, VIEW3D.palette.slate!, STREAM.rockPlace, i, 1, {
          suppress: SUPPRESS.clutter,
        });
      }
    }
  }

  if (prop && resource !== undefined) {
    const count = hashedCount(tile.col, tile.row, STREAM.resourceCount, Math.max(1, prop.count));
    for (let i = 0; i < count; i++) {
      props.push(
        place(
          geometry.resourceProps[resource],
          shade(prop.color, prop.shade),
          STREAM.resourcePlace,
          i,
          1,
          { spread: RESOURCES.spread },
        ),
      );
    }
  } else {
    addGroundClutter(tile, geometry, place);
  }
  // The bank dressing stays either way: reeds are a fact about where the water
  // is, not about what is growing on the field beside it.
  addWaterEdge(map, tile, geometry, place);

  return { treed, props };

  /**
   * Ground clutter and reeds share the scatter above; both are below.
   *
   * Everything here is `clutter` grade — the meadow a farm ploughs under. The
   * reeds below are not: a bank is a fact about where the water is, and a town
   * on the shore still has a shore.
   */
  function addGroundClutter(
    t: Tile,
    g: BoardGeometry,
    put: typeof place,
  ): void {
    // Never under a canopy or in a pool: grass drawn inside a forest is
    // invisible from 57° and costs an instance per tile of it, and clutter on an
    // oasis fights the one prop the hex exists to show. A **floodplain** is the
    // exception among the features — it is ground rather than a thing standing
    // on the ground, so it keeps its dressing, and gets the meadow's rather than
    // the desert's below.
    if (t.feature !== 'none' && t.feature !== 'floodplain') return;
    const grade = { suppress: SUPPRESS.clutter };

    // Silt, not sand: a floodplain is the fertile strip, so it wears the tufts
    // the meadow terrains wear even though the terrain under it is still desert.
    if (t.terrain === 'grassland' || t.terrain === 'plains' || t.feature === 'floodplain') {
      if (hashUnit(t.col, t.row, STREAM.tuftRoll) < CLUTTER.tuft.chance) {
        const count = hashedCount(t.col, t.row, STREAM.tuftCount, CLUTTER.tuft.max);
        const ink = shade(CLUTTER.tuft.color, CLUTTER.tuft.shade);
        for (let i = 0; i < count; i++) put(g.tuft, ink, STREAM.tuftPlace, i, 1, grade);
      }
    }
    if (t.terrain === 'grassland') {
      if (hashUnit(t.col, t.row, STREAM.flowerRoll) < CLUTTER.flower.chance) {
        const count = hashedCount(t.col, t.row, STREAM.flowerCount, CLUTTER.flower.max);
        // One ink per tile, not per flower: a single patch of one colour reads
        // as a species, and three colours on one hex reads as confetti.
        const inks = CLUTTER.flower.colors;
        const ink =
          inks[Math.floor(hashUnit(t.col, t.row, STREAM.flowerInk) * inks.length) % inks.length]!;
        for (let i = 0; i < count; i++) put(g.flower, ink, STREAM.flowerPlace, i, 1, grade);
      }
    }
    // Bare desert only. The terrain under a floodplain is still `desert`, and a
    // cactus growing out of a green river strip is the one place this rule can
    // read the wrong tile — so it asks about the feature as well.
    if (t.terrain === 'desert' && t.feature === 'none') {
      if (hashUnit(t.col, t.row, STREAM.cactusRoll) < CLUTTER.cactus.chance) {
        const count = hashedCount(t.col, t.row, STREAM.cactusCount, CLUTTER.cactus.max);
        const ink = shade(CLUTTER.cactus.color, CLUTTER.cactus.shade);
        for (let i = 0; i < count; i++) put(g.cactus, ink, STREAM.cactusPlace, i, 1, grade);
      }
    }
    if (t.terrain === 'tundra' || t.terrain === 'snow') {
      if (hashUnit(t.col, t.row, STREAM.pebbleRoll) < CLUTTER.pebble.chance) {
        const count = hashedCount(t.col, t.row, STREAM.pebbleCount, CLUTTER.pebble.max);
        const ink = shade(CLUTTER.pebble.color, CLUTTER.pebble.shade);
        for (let i = 0; i < count; i++) {
          put(g.boulder, ink, STREAM.pebblePlace, i, CLUTTER.pebble.scale, grade);
        }
      }
    }
  }

  /**
   * Reeds and shingle where the land meets fresh water.
   *
   * Aimed at the water: the clump sits `edgeOffset` hex radii from the centre
   * along the direction of the river edge or the lake next door, with only a
   * small disc of jitter around that. Scattered over the whole tile instead,
   * this would read as "this hex is marshy" rather than "this is a bank", and
   * the rivers would go on looking painted on.
   */
  function addWaterEdge(m: GameMap, t: Tile, g: BoardGeometry, put: typeof place): void {
    if (t.terrain === 'mountain' || isWater(t)) return;
    const direction = freshwaterDirection(m, t);
    if (direction < 0) return;

    const REEDS = DECOR.reeds;
    const unit = towardNeighbor(direction);
    const origin = {
      x: unit.x * REEDS.edgeOffset * BOARD.hexRadius,
      z: unit.z * REEDS.edgeOffset * BOARD.hexRadius,
    };

    if (hashUnit(t.col, t.row, STREAM.reedRoll) < REEDS.chance) {
      const count = hashedCount(t.col, t.row, STREAM.reedCount, REEDS.max);
      const ink = shade(REEDS.color, REEDS.shade);
      for (let i = 0; i < count; i++) {
        put(g.reeds, ink, STREAM.reedPlace, i, 1, { origin, spread: REEDS.jitter });
      }
    }
    if (hashUnit(t.col, t.row, STREAM.bankRoll) < REEDS.bankPebbleChance) {
      const count = hashedCount(t.col, t.row, STREAM.bankCount, REEDS.bankPebbleMax);
      const ink = shade(CLUTTER.pebble.color, CLUTTER.pebble.shade);
      for (let i = 0; i < count; i++) {
        put(g.boulder, ink, STREAM.bankPlace, i, REEDS.bankPebbleScale, {
          origin,
          spread: REEDS.jitter * 1.4,
        });
      }
    }
  }
}

/**
 * A cheap fingerprint of where the features still stand.
 *
 * `signImprovedCells`' sibling, and it answers the same *kind* of question for
 * the third source of the suppression sweep: when this number moves, something
 * has been cleared and a hex the bake put trees on now has to read as bare
 * ground. FNV-1a over the indices of the tiles that still carry a feature,
 * allocating nothing, walked in map order for the reason every other sign is.
 *
 * Which *kind* of feature is deliberately not in the hash. Nothing in the game
 * turns a forest into a jungle, so the only motion this can see is a feature
 * going away — and if a transmutation is ever added, the honest fix is a board
 * rebuild, not a finer hash, because the bake would owe the tile trees of the
 * other species.
 *
 * It takes the **map** and not the state, unlike its siblings, because that is
 * all it is about: features are a fact about the ground, and a signature that
 * asked for a `GameState` would be claiming to depend on cities and units it
 * never reads.
 */
export function signFeatureCells(map: GameMap): number {
  let h = 2166136261 ^ map.tiles.length;
  for (let i = 0; i < map.tiles.length; i++) {
    if (map.tiles[i]!.feature === 'none') continue;
    h = Math.imul(h ^ i, 16777619);
  }
  return h >>> 0;
}

/** Water terrains, which grow nothing and are never dressed. */
function isWater(tile: Tile): boolean {
  return tile.terrain === 'ocean' || tile.terrain === 'coast' || tile.terrain === 'lake';
}

/**
 * Bakes a map into instance buffers.
 *
 * It takes the **map** and nothing else about the game, and that is now literal:
 * it used to take the set of tiles holding a city so it could skip their
 * dressing, which meant founding a town re-baked the whole board. Every tile
 * gets its full dressing here, graded by how readily it yields (see `SUPPRESS`),
 * and who has built what on it is applied afterwards through `suppressTile` — a
 * handful of matrix writes on the tile that changed. The board is built once per
 * map, for the whole game.
 */
export function buildBoard(
  map: GameMap,
  geometry: BoardGeometry,
  materials: MaterialLibrary,
  shadows: boolean,
): BuiltBoard {
  const group = new Group();
  const period = wrapWidth(map);
  // `snapshot` and `forceTint` are what make the board *patchable*: fog of war
  // hides a tile by zero-scaling its instances and knocks a remembered one back
  // by multiplying its tints, and both operations have to be undoable on a
  // buffer that is built once per map and never rebuilt (design-notes, the M8
  // hard perf constraint). See `CollectorOptions`.
  const collector = new InstanceCollector({
    copyOffsets: [-period, 0, period],
    snapshot: true,
    forceTint: true,
  });

  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const axis = new Vector3(0, 1, 0);
  /** Every hex this bake put a canopy on. See `BuiltBoard.treedCells`. */
  const treedCells: number[] = [];
  /** Every prop it stood on a seam. See `BuiltBoard.resourceCells`. */
  const resourceCells: ResourcePropCell[] = [];

  for (const tile of map.tiles) {
    const center = cellCenter(tile.col, tile.row);
    // Every instance this tile produces names it, so fog can find all of them
    // again without a search. See `InstanceCollector.tileHandles`.
    const cell = tileIndex(map, tile.col, tile.row);

    const kind = heightClassOf(tile);
    const s = tileScale(tile);
    position.set(center.x, BOARD.floorY, center.z);
    quaternion.setFromAxisAngle(axis, tileYaw(tile));
    scale.set(s, s, s);
    // Water is not outlined. An inverted hull on a low prism in a field of
    // identical low prisms draws a dark ring around every single one, and the
    // ocean turns into graph paper; the two blues carry the read instead.
    const water = kind === 'ocean' || kind === 'coast';
    const topColor = VIEW3D.terrainColor[tile.terrain];
    // side / top cap / bottom cap. The bottom is never seen, but the group
    // exists and must be given something.
    const side = shade(topColor, VIEW3D.sideDarken);
    collector.add(
      geometry.prisms[kind],
      [side, topColor, side],
      new Matrix4().compose(position, quaternion, scale),
      // `vertexColors` is what turns on the contact shading baked into the
      // prism; the tint is the per-tile wobble on top of it. The two multiply
      // in the shader and neither knows about the other.
      { outlined: !water, vertexColors: true, tint: terrainTint(tile), tile: cell },
    );

    const top = tileTopY(tile);
    if (tile.terrain === 'mountain') {
      const peakYaw = hashUnit(tile.col, tile.row, STREAM.peakYaw) * Math.PI * 2;
      const peakScale = 0.86 + hashUnit(tile.col, tile.row, STREAM.peakScale) * 0.4;
      position.set(center.x, top - 0.05, center.z);
      quaternion.setFromAxisAngle(axis, peakYaw);
      scale.set(peakScale, peakScale, peakScale);
      const peakMatrix = new Matrix4().compose(position, quaternion, scale);
      const peakTint = decorTint(
        tile.col,
        tile.row,
        STREAM.peakYaw * 64,
        DECOR.variation.value,
        DECOR.variation.hue,
      );
      collector.add(geometry.peak, [shade(VIEW3D.palette.slate!, 0.08)], peakMatrix, {
        tint: peakTint,
        tile: cell,
      });
      // The snow rides the peak's own matrix, so it cannot slide off a summit
      // whose scale and yaw are hashed. Not outlined: an inverted hull around a
      // cap this small closes over the white and leaves a dark pip.
      collector.add(geometry.snow, [DECOR.snowCap.color], peakMatrix, {
        outlined: false,
        tile: cell,
      });
    } else {
      const dressing = addDecorations(map, tile, top, center, geometry, collector, cell);
      if (dressing.treed) treedCells.push(cell);
      // A mountain is the one hex that never gets here, and it never carries a
      // resource either (no `validTerrain` names one) — so the props recorded
      // below really are every prop on the board.
      if (dressing.props.length > 0 && tile.resource !== undefined) {
        resourceCells.push({ cell, resource: tile.resource, handles: dressing.props });
      }
    }

    // The floodplain wash: the green ribbon a river cuts through a desert.
    //
    // Placed here beside the sand band rather than in `addDecorations` because
    // it is the same *kind* of thing — a mark on the tile's own face, taking the
    // tile's own yaw and scale so it cannot drift off the hex it belongs to —
    // and emphatically not scatter. It is left at the default `never`
    // suppression grade, which is the whole claim the feature makes: a farm
    // ploughs the meadow and a town clears the trees, but neither of them stops
    // the ground being flood plain. (`place` in `addDecorations` defaults to
    // `decor` instead, which is why this could not go through it.)
    if (tile.feature === 'floodplain') {
      const FLOOD = DECOR.floodplain;
      position.set(center.x, top + FLOOD.lift, center.z);
      quaternion.setFromAxisAngle(axis, tileYaw(tile));
      scale.set(s, s, s);
      collector.add(
        geometry.floodWash,
        [FLOOD.color],
        new Matrix4().compose(position, quaternion, scale),
        { overlay: true, opacity: FLOOD.opacity, tile: cell },
      );
    }

    // The sand band. A decal on the tile's own face rather than a wider prism
    // top, because it has to follow the hex exactly and only exists where the
    // land actually meets the sea.
    if (!water && tile.terrain !== 'mountain' && touchesSea(map, tile)) {
      position.set(center.x, top + DECOR.shore.lift, center.z);
      // The tile's own yaw *and* scale, or the band drifts off the hex it
      // belongs to: every prism is turned and scaled a few percent by its hash,
      // and a decal that ignored either would hang over the grout on one side.
      quaternion.setFromAxisAngle(axis, tileYaw(tile));
      scale.set(s, s, s);
      collector.add(
        geometry.shoreRing,
        [DECOR.shore.color],
        new Matrix4().compose(position, quaternion, scale),
        { overlay: true, opacity: DECOR.shore.opacity, tile: cell },
      );
    }
  }

  const rivers = addRivers(map, geometry, collector);

  const bounds = boardBounds(map);
  let drawCalls = collector.flush(group, materials, shadows);
  let instanceCount = 0;
  for (const child of group.children) {
    const count = (child as { count?: number }).count;
    if (typeof count === 'number') instanceCount += count;
  }

  const substrate = buildSubstrate(bounds, period);
  group.add(substrate);
  drawCalls++;

  const table = buildTable(bounds, period);
  group.add(table);
  drawCalls++;

  return {
    group,
    tiles: { own: collector.tileHandles(), shared: rivers },
    treedCells,
    resourceCells,
    bounds,
    wrapWidth: period,
    tileCount: map.tiles.length,
    instanceCount,
    drawCalls,
    suppressTile(cell: number, scope: SuppressScope): void {
      collector.suppressTile(cell, scope);
    },
    unsuppressTile(cell: number): void {
      collector.unsuppressTile(cell);
    },
    dispose(): void {
      // Geometry and toon materials are shared and owned elsewhere; only the
      // one-off pairs (the substrate and the table) and the instanced meshes
      // themselves are ours.
      substrate.geometry.dispose();
      (substrate.material as MeshBasicMaterial).dispose();
      table.geometry.dispose();
      (table.material as MeshBasicMaterial).dispose();
      disposeInstancedGroup(group);
    },
  };
}
