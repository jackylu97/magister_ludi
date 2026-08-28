/**
 * Section 6: cities that age, and the shapes they are made of.
 *
 * `W1` of the art pass is the largest "the world tells you what happened" lever
 * the board has, and it is the hardest thing in the game to *see*: a town takes
 * its second roof line when its owner enters Æra II, its palisade when it
 * builds one, its palace only if it is the seat of government — so putting the
 * six readings side by side takes six games, six technologies and a couple of
 * hours. This stall builds all six in a millisecond each and stands them in a
 * row.
 *
 * A fixture, not a mock
 * ---------------------
 * Every panel is a **real `GameState`**: `newGame`, then a flat 8×6 grassland
 * map dropped in place of the generated one, then `foundCityAt` — the sim's own
 * founding, so the town has a real name, real borders and real derived state.
 * The sculpt is then `CityLayer.build` with `BoardGeometry`, `MaterialLibrary`
 * and `TileIcons`, which is byte-for-byte the layer the board draws. Nothing on
 * this page knows what a gable roof looks like; it knows how to found a city in
 * the second age and let the renderer answer.
 *
 * The one liberty taken is the *reason* a town is in an age: a fixture pushes
 * `ironWorking` onto the seat's researched list rather than playing forty turns
 * to it. `cityTier` asks `highestAge(owner.techsResearched)` and nothing else,
 * so the tier that comes out is the tier a played game would produce.
 *
 * One canvas, six viewports
 * -------------------------
 * Six scissored viewports over one renderer and **one camera**, rather than six
 * canvases: identical framing is the whole point of a comparison strip, and two
 * cameras that had drifted a degree apart would be the one difference a reader
 * could not attribute. The six towns all stand at the world origin (each layer
 * is offset by `-cellCenter`), and a panel is drawn by making its own group
 * visible and the other five not — which is cheaper than six scenes and cannot
 * fall out of step with them.
 */

import {
  AmbientLight,
  Box3,
  type BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PCFSoftShadowMap,
  PlaneGeometry,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

import { type HeraldryId } from '../art/heraldryMarks';
import { TileIcons } from '../render3d/badges3d';
import { BoardGeometry } from '../render3d/board3d';
import { CityLayer } from '../render3d/cities3d';
import { VIEW3D, shade } from '../render3d/lookData';
import { cellCenter, directionYaw } from '../render3d/layout';
import { MaterialLibrary, computeHullNormals } from '../render3d/toon';
import { type BuildingId } from '../sim/buildingData';
import { type ImprovementId } from '../sim/improvementData';
import { foundCityAt } from '../sim/cities';
import { createMap, getTileAt } from '../sim/map';
import { type GameState, newGame } from '../sim/state';
import { type TechId } from '../sim/techData';
import { VISIBLE, resetVisibility } from '../sim/visibility';
import { seatTinctures } from './marks';

/** The twelve seats, hoisted: the fixture reads them by index. */
const SEATS = seatTinctures();

const LOOK = VIEW3D.look;
const LIGHTS = VIEW3D.lights;
const CITY = VIEW3D.city;
const IMPROVEMENTS = VIEW3D.improvements;
const ROADS = VIEW3D.roads;

/** How the six panels are laid out, and how close the camera stands. */
const PANELS = 6;
/**
 * Half the world extent one panel frames, vertically.
 *
 * A town is about 1.5 units from the ground to the top of its banner and about
 * 1.3 across once its wall is up, and a panel is *narrower* than it is tall —
 * six cells over one strip. So the framing is set by the **width**: this is the
 * tightest half-height at which an Æra III wall still clears the scissor on both
 * sides, which leaves air over the flag rather than cropping it. The flag is
 * where the seat's charge is printed, so cropping it is the one failure that
 * would cost this strip a section of the page.
 */
const SPAN = 1.4;
/** Radians per second. A full turn every twenty-odd seconds, as the Armory. */
const SPIN_RATE = 0.3;

/** One panel's fixture: what the town is, and what to call it underneath. */
export interface CityPanel {
  /** "Æra II · capital". */
  caption: string;
  /** The second line: what the state actually says. */
  detail: string;
  state: GameState;
  cityId: number;
}

/** The six readings, in the order they are drawn. */
const RECIPES: readonly {
  age: 1 | 2 | 3;
  capital: boolean;
  population: number;
  buildings: BuildingId[];
}[] = [
  { age: 1, capital: true, population: 3, buildings: [] },
  { age: 2, capital: true, population: 5, buildings: ['palisade', 'shrine'] },
  { age: 3, capital: true, population: 7, buildings: ['palisade', 'temple'] },
  { age: 1, capital: false, population: 3, buildings: [] },
  { age: 2, capital: false, population: 5, buildings: ['palisade', 'shrine'] },
  { age: 3, capital: false, population: 7, buildings: ['palisade', 'temple'] },
];

/**
 * The technology that puts a seat in an age.
 *
 * Read as "the cheapest tech whose `age` is this", written down rather than
 * derived because the fixture only needs three and naming them is what makes
 * the recipe legible. A town's era is its *owner's* era — there is no such
 * thing as a city's age — so this is a fact about the empire.
 */
const AGE_TECH: Record<1 | 2 | 3, TechId[]> = {
  1: [],
  2: ['ironWorking'],
  3: ['ironWorking', 'feudalism'],
};

/**
 * One panel's state: a flat board, one town, and nothing else on it.
 *
 * The decoy is the whole of "non-capital". `capitalCityOf` is the sim's own
 * rule — founded first, unless every earlier town has been captured — so the
 * only honest way to draw a town that is *not* the seat of government is to
 * found one before it. Faking the flag would be a second implementation of the
 * rule the board is supposed to be reporting.
 *
 * The seat is a **seat number**, not a colour, and that is not a detail. A
 * town's tincture is `playerPieceColor(player.color, playerIndex)`, whose first
 * clause is a lookup of the *CSS* colour in `players.byColor` — three entries —
 * and whose second is the fallback by seat order. Handing the fixture a palette
 * hex therefore missed the lookup and every seat came out crimson, which is
 * exactly the failure this page exists to catch and would have been invisible
 * on a page that painted its own flags. So the fixture seats `index + 1`
 * players and founds for the last of them: seat 7 here is seat 7 in a game.
 */
function fixture(recipe: (typeof RECIPES)[number], seat: number): CityPanel {
  const roster = SEATS.slice(0, seat + 1).map((entry, index) => ({
    name: `Seat ${index + 1}`,
    color: entry.color,
    charge: entry.charge,
  }));
  const state = newGame({ seed: 7, sizeName: 'duel', players: roster });

  // The generated world, replaced by a table: a comparison strip is about the
  // sculpts, and a hill or a forest under one of the six would be the first
  // thing a reader's eye went to.
  state.map = createMap({ width: 8, height: 6, terrain: 'grassland' });
  state.units.length = 0;
  state.cities.length = 0;
  state.camps.length = 0;
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);

  if (!recipe.capital) {
    const decoy = getTileAt(state.map, 1, 1);
    if (decoy) foundCityAt(state, seat, decoy);
  }
  const ground = getTileAt(state.map, 4, 3);
  if (!ground) throw new Error('flair: the fixture map has no (4, 3)');
  const city = foundCityAt(state, seat, ground);
  city.population = recipe.population;
  city.buildings = [...recipe.buildings];
  state.players[seat]!.techsResearched.push(...AGE_TECH[recipe.age]);
  // Everything lit: `CityLayer` draws a town only where the seat is watching,
  // and a fixture whose fog had not been opened would be six empty tables.
  state.visibility[seat]!.fill(VISIBLE);

  const roman = recipe.age === 1 ? 'I' : recipe.age === 2 ? 'II' : 'III';
  return {
    caption: `Æra ${roman} · ${recipe.capital ? 'capital' : 'town'}`,
    detail:
      recipe.buildings.length > 0
        ? `pop ${recipe.population} · ${recipe.buildings.join(' · ')}`
        : `pop ${recipe.population} · no works`,
    state,
    cityId: city.id,
  };
}

/**
 * The strip: six towns on one canvas, turning.
 *
 * Rebuilt wholesale when the seat colour or the shadow toggle changes, for
 * `CityLayer`'s own reason — a city layer is a couple of dozen instances and is
 * incapable of drifting out of step with the state that produced it, so there
 * is nothing a diff would buy.
 */
export class CityStrip {
  readonly panels: CityPanel[];

  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: OrthographicCamera;
  private readonly materials: MaterialLibrary;
  private readonly geometry = new BoardGeometry();
  private readonly key: DirectionalLight;
  private readonly turntables: Group[] = [];
  private readonly layers: CityLayer[] = [];
  private readonly table: Mesh;

  private icons: TileIcons | null = null;
  private shadows = LOOK.shadows;
  private seat: number;
  private spin = true;
  private yaw = 0;
  private lastFrame = 0;
  private running = true;

  constructor(canvas: HTMLCanvasElement, seat: number) {
    this.seat = seat;
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = this.shadows;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    // `autoClear` off, because six scissored passes over one buffer means the
    // second pass must not wipe the first. The clear is done once, by hand.
    this.renderer.autoClear = false;
    this.scene.background = new Color(VIEW3D.table.color);

    this.materials = new MaterialLibrary(LOOK.rampSteps, VIEW3D.palette.ink!);
    this.materials.outlineWidth.value = LOOK.outline;

    // The recipe's own eye: high, one azimuth, orthographic. Every panel is
    // drawn with this one camera, which is what makes the six comparable.
    this.camera = new OrthographicCamera(-SPAN, SPAN, SPAN, -SPAN, 0.1, 60);
    this.camera.position.set(6, 7.5, 6);
    this.camera.lookAt(0, 0.62, 0);
    this.camera.updateMatrixWorld();

    this.key = new DirectionalLight(LIGHTS.keyColor, 2.1);
    this.key.position.set(4, 8, 3);
    this.key.castShadow = this.shadows;
    this.key.shadow.mapSize.set(LOOK.shadowMapSize, LOOK.shadowMapSize);
    this.key.shadow.bias = LOOK.shadowBias;
    this.key.shadow.normalBias = LOOK.shadowNormalBias;
    const shadow = this.key.shadow.camera;
    shadow.left = -SPAN * 1.6;
    shadow.right = SPAN * 1.6;
    shadow.top = SPAN * 1.6;
    shadow.bottom = -SPAN * 1.6;
    shadow.near = 1;
    shadow.far = 30;
    shadow.updateProjectionMatrix();
    this.scene.add(this.key, this.key.target);
    this.scene.add(new AmbientLight(LIGHTS.ambientColor, 0.9));

    // A table under the towns, so the key light's shadows land on something.
    this.table = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ color: VIEW3D.palette.vellum! }));
    this.table.rotation.x = -Math.PI / 2;
    this.table.position.y = -0.004;
    this.table.scale.set(60, 60, 1);
    this.scene.add(this.table);

    this.panels = RECIPES.map((recipe) => fixture(recipe, seat));
    for (let i = 0; i < PANELS; i++) {
      const turntable = new Group();
      this.scene.add(turntable);
      this.turntables.push(turntable);
      const layer = new CityLayer();
      turntable.add(layer.group);
      this.layers.push(layer);
    }
    this.rebuild();

    this.resize();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  /** Hands the strip the rasterised atlas: the charge on every flag. */
  setIcons(icons: TileIcons | null): void {
    this.icons = icons;
    this.rebuild();
  }

  setSpinning(on: boolean): void {
    this.spin = on;
  }

  setShadows(on: boolean): void {
    if (this.shadows === on) return;
    this.shadows = on;
    this.renderer.shadowMap.enabled = on;
    this.key.castShadow = on;
    this.rebuild();
  }

  /** A new seat: the fixtures are rebuilt, because the seat *is* in the state. */
  setSeat(seat: number): void {
    if (this.seat === seat) return;
    this.seat = seat;
    this.panels.length = 0;
    this.panels.push(...RECIPES.map((recipe) => fixture(recipe, seat)));
    this.rebuild();
  }

  private rebuild(): void {
    const faceCamera = this.camera.quaternion.clone();
    this.panels.forEach((panel, index) => {
      const layer = this.layers[index]!;
      layer.build(
        panel.state,
        this.geometry,
        this.materials,
        faceCamera,
        this.shadows,
        null,
        this.icons,
      );
      // The town stands at the origin of its own panel: the layer draws it at
      // its hex's world position, so the group is slid back by exactly that.
      const city = panel.state.cities.find((entry) => entry.id === panel.cityId);
      if (!city) return;
      const centre = cellCenter(city.col, city.row);
      layer.group.position.set(-centre.x, 0, -centre.z);
    });
  }

  resize(): void {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || 900;
    const height = canvas.clientHeight || 300;
    this.renderer.setSize(width, height, false);
    // One panel is a square-ish cell of the strip, so the frustum's width is the
    // *cell's* aspect and not the canvas's — six panels across one wide canvas.
    const aspect = width / PANELS / Math.max(1, height);
    this.camera.left = -SPAN * aspect;
    this.camera.right = SPAN * aspect;
    this.camera.top = SPAN;
    this.camera.bottom = -SPAN;
    this.camera.updateProjectionMatrix();
  }

  private loop(now: number): void {
    if (!this.running) return;
    const dt = this.lastFrame === 0 ? 0 : Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (this.spin) this.yaw += dt * SPIN_RATE;
    const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), this.yaw);
    for (const turntable of this.turntables) turntable.quaternion.copy(turn);

    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || 900;
    const height = canvas.clientHeight || 300;
    const cell = width / PANELS;
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.setScissorTest(true);
    for (let i = 0; i < PANELS; i++) {
      // Only this panel's town is in the frame; the other five are switched off
      // rather than moved, because all six stand at the same origin.
      this.turntables.forEach((group, index) => {
        group.visible = index === i;
      });
      this.renderer.setViewport(i * cell, 0, cell, height);
      this.renderer.setScissor(i * cell, 0, cell, height);
      this.renderer.render(this.scene, this.camera);
    }
    this.renderer.setScissorTest(false);
    requestAnimationFrame(this.loop);
  }

  dispose(): void {
    this.running = false;
    for (const layer of this.layers) layer.dispose();
    this.geometry.dispose();
    this.materials.dispose();
    this.renderer.dispose();
  }
}

// --- the parts shelf --------------------------------------------------------

/**
 * The shapes the ageing pass added, each alone on a plinth.
 *
 * `BoardGeometry` already owns every one of them (it builds them once from
 * `data/view3d.json`'s `city` block), so the shelf reads them off the same
 * object the board does rather than calling the constructors with numbers of
 * its own — the difference matters the first time somebody tunes `palace.skirt`
 * and wants to see what moved.
 *
 * The flag is the odd member and is two instances rather than one: the cloth is
 * an unlit quad in the seat's tincture, and the charge is a *cell of the tile
 * atlas* on its own field of parchment, standing a hair in front of it. That is
 * exactly how `CityLayer.addFlag` builds it, and it is why the charge needs the
 * atlas to have finished rasterising before it appears.
 */
export class PartsShelf {
  readonly parts: string[] = [];

  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: OrthographicCamera;
  private readonly materials: MaterialLibrary;
  private readonly geometry = new BoardGeometry();
  private readonly turntables: Group[] = [];
  private readonly key: DirectionalLight;

  private icons: TileIcons | null = null;
  private seatColor: number;
  private charge: HeraldryId;
  private spin = true;
  private yaw = 0;
  private lastFrame = 0;
  private running = true;

  constructor(canvas: HTMLCanvasElement, seatColor: number, charge: HeraldryId) {
    this.seatColor = seatColor;
    this.charge = charge;
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.autoClear = false;
    this.scene.background = new Color(VIEW3D.table.color);

    this.materials = new MaterialLibrary(LOOK.rampSteps, VIEW3D.palette.ink!);
    this.materials.outlineWidth.value = LOOK.outline;

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
    this.camera.position.set(6, 7.5, 6);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();

    this.key = new DirectionalLight(LIGHTS.keyColor, 2.1);
    this.key.position.set(4, 8, 3);
    this.scene.add(this.key, this.key.target);
    this.scene.add(new AmbientLight(LIGHTS.ambientColor, 0.9));

    for (const id of PART_IDS) {
      this.parts.push(id);
      const turntable = new Group();
      this.scene.add(turntable);
      this.turntables.push(turntable);
    }
    this.rebuild();
    this.resize();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  setIcons(icons: TileIcons | null): void {
    this.icons = icons;
    this.rebuild();
  }

  setSpinning(on: boolean): void {
    this.spin = on;
  }

  setSeat(color: number, charge: HeraldryId): void {
    if (this.seatColor === color && this.charge === charge) return;
    this.seatColor = color;
    this.charge = charge;
    this.rebuild();
  }

  private rebuild(): void {
    this.turntables.forEach((turntable, index) => {
      turntable.clear();
      turntable.add(fitToCell(this.buildPart(PART_IDS[index]!)));
    });
  }

  /** A lit, outlined mesh — the two-mesh sandwich the board draws with. */
  private solid(geometry: BufferGeometry, colorName: string): Group {
    return this.inked(geometry, VIEW3D.palette[colorName] ?? 0xffffff);
  }

  /**
   * The same, given a colour rather than a palette *name*.
   *
   * The city block quotes palette names; the improvement props quote a name and
   * a `shade` off it, so their ink is already a number by the time it gets here.
   * One sandwich, two ways in — the alternative was a second copy of the mesh
   * plus shell, which is the one thing on this page that must match the board.
   */
  private inked(geometry: BufferGeometry, color: number): Group {
    const group = new Group();
    computeHullNormals(geometry);
    const mesh = new Mesh(geometry, this.materials.get(color));
    const shell = new Mesh(geometry, this.materials.outline);
    mesh.add(shell);
    group.add(mesh);
    return group;
  }

  private buildPart(id: (typeof PART_IDS)[number]): Group {
    const parts = this.geometry;
    switch (id) {
      case 'cityGableRoof': {
        // The body *and* the roof, because the roof alone is a wedge in mid-air:
        // what the Æra II sculpt actually changes is one edge of a building the
        // town already had, and that is only visible on the building.
        const group = this.solid(parts.houseBody, CITY.wallColor);
        group.add(this.solid(parts.houseGableRoof, CITY.roofColor));
        return group;
      }
      case 'palisadeStake':
        return this.solid(parts.palisadeStake, CITY.palisade.color);
      case 'cityWallSegment':
        return this.solid(parts.wallSegment, CITY.wall.color);
      case 'cityShrine': {
        const group = this.solid(parts.shrine, CITY.shrine.color);
        group.add(this.solid(parts.shrineFinial, CITY.shrine.finialColor));
        return group;
      }
      case 'cityTemple':
        return this.solid(parts.temple, CITY.temple.color);
      case 'cityWonder': {
        const group = this.solid(parts.wonder, CITY.wonder.color);
        group.add(this.solid(parts.wonderTip, CITY.wonder.tipColor));
        return group;
      }
      case 'cityPalace': {
        const group = this.solid(parts.palaceBody, CITY.palace.color);
        group.add(this.solid(parts.palaceRoof, CITY.palace.roofColor));
        group.add(this.solid(parts.palaceFinial, CITY.palace.finialColor));
        return group;
      }
      case 'bannerPole':
        return this.solid(parts.pole, CITY.poleColor);
      case 'roadJunction':
        return this.buildRoad();
      case 'flag':
        return this.buildFlag();
      default:
        return this.buildGreatWork(id);
    }
  }

  /**
   * One great work: the body in its own ink, and its single gilt element.
   *
   * Both read off `BoardGeometry` at the size `improvements.props` asks for, so
   * this shelf moves when somebody retunes a work — the same bargain the city
   * parts make. Two meshes rather than one, because that is how the board draws
   * them: a great work's gilt is a second instance over the same matrix (see
   * `improvements3d.ts`), never a second material group.
   */
  private buildGreatWork(id: ImprovementId): Group {
    const spec = IMPROVEMENTS.props[id];
    const group = new Group();
    group.add(this.inked(this.geometry.improvementProps[id], shade(spec.color, spec.shade)));
    const gilt = this.geometry.improvementGilt[id];
    if (gilt && spec.gilt !== undefined) group.add(this.inked(gilt, spec.gilt));
    return group;
  }

  /**
   * A hex of road: the hub, and two half-links running off it.
   *
   * The board draws *halves* — every paved hex reaches out toward each paved
   * neighbour and the neighbour draws the other half (see `roads3d.ts`) — so a
   * single strip on its own would be a picture of half of nothing. What answers
   * "what does a road look like on a hex" is a corner: one tile's own two
   * reaches, at the angles `directionYaw` gives them, on the hub they cross at.
   *
   * Read off `BoardGeometry` and `VIEW3D.roads` at the size and ink the board
   * uses, like every other cell on this shelf: retune `roads.width` and this
   * moves with it. `fitToCell` scales the whole thing up, which is exactly the
   * trade this shelf makes everywhere — it answers "what shape is this", never
   * "how big is it against a town".
   */
  private buildRoad(): Group {
    const group = new Group();
    const ink = shade(ROADS.color, ROADS.shade);
    const half = (Math.sqrt(3) / 2) * VIEW3D.board.hexRadius * ROADS.overhang;
    const width = VIEW3D.board.hexRadius * ROADS.width;
    group.add(this.inked(this.geometry.roadHub, ink));
    // East and south-west: a corner rather than a straight run, because a
    // straight run is the one arrangement a single quad could have faked.
    for (const direction of [0, 2]) {
      const yaw = directionYaw(direction);
      const strip = new Mesh(this.geometry.roadStrip, this.materials.get(ink));
      strip.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
      strip.scale.set(half, 1, width);
      strip.position.set(Math.cos(yaw) * (half / 2), 0, -Math.sin(yaw) * (half / 2));
      group.add(strip);
    }
    return group;
  }

  /**
   * The flag: the cloth, and the charge on its hoist.
   *
   * `CityLayer.addFlag`'s two instances, built by hand here because the layer
   * only draws one as part of a whole town. Both are unlit — a single-sided quad
   * that took the toon ramp would be a different colour depending on which way
   * it faced — and the charge sits a hair in front of the cloth rather than in
   * front of it by a depth trick.
   */
  private buildFlag(): Group {
    const group = new Group();
    const faceCamera = this.camera.quaternion.clone();
    const cloth = new Mesh(this.geometry.bar, new MeshBasicMaterial({ color: this.seatColor }));
    cloth.quaternion.copy(faceCamera);
    cloth.scale.set(CITY.flagWidth, CITY.flagHeight, 1);
    cloth.position.y = 0.2;
    group.add(cloth);

    if (this.icons) {
      const marker = this.geometry.chargeMarkers[this.charge];
      if (marker) {
        const badge = new Mesh(marker, this.icons.standingMaterial);
        badge.quaternion.copy(faceCamera);
        badge.scale.set(CITY.chargeSize, CITY.chargeSize, 1);
        badge.position
          .set(0, 0.2, 0)
          .addScaledVector(new Vector3(1, 0, 0).applyQuaternion(faceCamera), CITY.chargeInset * CITY.flagWidth)
          .addScaledVector(new Vector3(0, 0, 1).applyQuaternion(faceCamera), CITY.chargeNudge);
        group.add(badge);
      }
    }
    return group;
  }

  resize(): void {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || 900;
    const height = canvas.clientHeight || 200;
    this.renderer.setSize(width, height, false);
    // Every part has been normalised into the same unit box (`fitToCell`), so
    // the frustum is a constant and not a per-shape decision — which is what
    // makes a stake and a palace comparable rather than merely both present.
    const aspect = width / PART_IDS.length / Math.max(1, height);
    // Whichever half-extent is the binding one. Taking the max rather than the
    // height is the whole of why a stake and a pole are both wholly on screen at
    // any window width — a fixed span would crop the shelf the moment the sheet
    // narrowed.
    const span = Math.max(PART_FIT / 2, PART_FIT / 2 / Math.max(aspect, 1e-3));
    this.camera.left = -span * aspect;
    this.camera.right = span * aspect;
    this.camera.top = span;
    this.camera.bottom = -span;
    this.camera.updateProjectionMatrix();
  }

  private loop(now: number): void {
    if (!this.running) return;
    const dt = this.lastFrame === 0 ? 0 : Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (this.spin) this.yaw += dt * SPIN_RATE;
    const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), this.yaw);
    // The flag holds still: it faces the camera on the board and turning it
    // would be showing the back of a billboard, which is not a thing the game
    // can ever draw.
    this.turntables.forEach((group, index) => {
      if (PART_IDS[index] === 'flag') group.quaternion.identity();
      else group.quaternion.copy(turn);
    });

    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || 900;
    const height = canvas.clientHeight || 200;
    const cell = width / PART_IDS.length;
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.setScissorTest(true);
    for (let i = 0; i < PART_IDS.length; i++) {
      this.turntables.forEach((group, index) => {
        group.visible = index === i;
      });
      this.renderer.setViewport(i * cell, 0, cell, height);
      this.renderer.setScissor(i * cell, 0, cell, height);
      this.renderer.render(this.scene, this.camera);
    }
    this.renderer.setScissorTest(false);
    requestAnimationFrame(this.loop);
  }

  dispose(): void {
    this.running = false;
    this.geometry.dispose();
    this.materials.dispose();
    this.renderer.dispose();
  }
}

/**
 * The world size a normalised part is scaled to, plus the air around it.
 *
 * The parts are all cut to **exactly one unit** across their longest axis
 * (`fitToCell`), so the shelf's frustum is arithmetic rather than a taste: it is
 * whichever of the cell's two dimensions is the tighter, which is the width,
 * because eight cells over one strip are much narrower than they are tall.
 */
const PART_FIT = 1.3;

/**
 * One part, scaled and centred so it fills its cell.
 *
 * The shapes are wildly different sizes — a palisade stake is 0.19 units tall
 * and a banner pole is 1.15 — and a shelf drawn at board scale would be one
 * legible palace beside seven specks. This is the one place on the page where a
 * specimen is *not* shown at the size it prints, and the trade is deliberate: a
 * parts shelf answers "what shape is this", which the strip above it cannot,
 * while the strip answers "how big is it against a town", which this cannot.
 *
 * Measured with `Box3.setFromObject` after the group is built, so it needs no
 * table of sizes to keep in step with `view3d.json` — a part re-tuned to twice
 * its height still arrives in the middle of its cell.
 */
function fitToCell(part: Group): Group {
  const wrapper = new Group();
  const bounds = new Box3().setFromObject(part);
  const size = bounds.getSize(new Vector3());
  const centre = bounds.getCenter(new Vector3());
  const extent = Math.max(size.x, size.y, size.z, 1e-4);
  const scale = 1 / extent;
  part.position.set(-centre.x, -centre.y, -centre.z);
  wrapper.scale.setScalar(scale);
  wrapper.add(part);
  return wrapper;
}

/** The shelf's order, and the caption under each cell. */
export const PART_IDS = [
  'cityGableRoof',
  'palisadeStake',
  'cityWallSegment',
  'cityShrine',
  'cityTemple',
  'cityPalace',
  'cityWonder',
  'bannerPole',
  'flag',
  'roadJunction',
  // The improvement props, which are `ImprovementId`s and reach `buildPart`'s
  // default arm. The five works a great person plants were named in this
  // shelf's own caption from the day they landed and never actually added to
  // this list, which left `buildGreatWork` unreachable; the lumbermill arriving
  // is what found it. A prop that is not on this page is a prop that gets
  // iterated in the game.
  'academy',
  'landmark',
  'manufactory',
  'customsHouse',
  'citadel',
  'lumbermill',
] as const;

export const PART_CAPTIONS: Record<(typeof PART_IDS)[number], string> = {
  cityGableRoof: 'the ridged roof a town takes in Æra II, on the body it always had',
  palisadeStake: 'one sharpened stake; eighteen of them ring the hex',
  cityWallSegment: 'a crenellated stone run, one per hex edge from Æra III',
  cityShrine: 'the shrine, and its gilt needle — two colours, one matrix',
  cityTemple: 'the stepped temple, from Æra III when one stands',
  cityPalace: 'body, ridged roof and gilt finial: the capital’s ✶, in the world',
  cityWonder: 'the marvel: four terraces past the palace’s ridge, under a gilt tip',
  bannerPole: 'the pole, dead centre where the ring of buildings leaves a gap',
  flag: 'the cloth in the seat’s tincture, the charge on a parchment canton',
  roadJunction:
    'a paved hex turning a corner: the hub, and this tile’s own half of two links',
  academy: 'the hall a Scholar plants, its ridge in gold',
  landmark: 'the stele an Artist raises, gilt-capped',
  manufactory: 'the Engineer’s works, and the gold on its door',
  customsHouse: 'the Merchant’s warehouse under a gilt vane',
  citadel: 'the General’s ring of stone, its banner in gold',
  lumbermill:
    'the sawing trestle and its stack of cut timber — low and squared, because it stands among pines that are neither',
};
