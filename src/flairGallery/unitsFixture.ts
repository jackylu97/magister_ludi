import { walkedPrefix, type Cell } from '../render/animation';
import { foundCityAt } from '../sim/cities';
import { applyCommand } from '../sim/commands';
import { FAMILIES, LIVE_GREAT_PERSON_IDS, greatPersonDef, type Family } from '../sim/greatPeopleData';
import { improvementErrorAt } from '../sim/improvements';
import { leaderDef, type LeaderId } from '../sim/leaderData';
import { createMap, getTileAt, type Tile } from '../sim/map';
import { findPath } from '../sim/pathfind';
import { createUnit, newGame, type GameState } from '../sim/state';
import type { UnitTypeId } from '../sim/unitData';
import { EXPLORED, VISIBLE, resetVisibility } from '../sim/visibility';

export const UNIT_REVIEW_TYPES = [
  'warrior', 'spearman', 'archer', 'horseman', 'horseArcher', 'warElephant',
  'scout', 'settler', 'worker', 'trader', 'prophet', 'greatPerson',
] as const satisfies readonly UnitTypeId[];
export type UnitReviewType = typeof UNIT_REVIEW_TYPES[number];

export const INFANTRY_VARIANT_TYPES = [
  'swordsman', 'legionary', 'longswordsman', 'fireLance', 'khopesh', 'eagleWarrior',
] as const satisfies readonly UnitTypeId[];
export const INFANTRY_REVIEW_TYPES = ['warrior', ...INFANTRY_VARIANT_TYPES] as const;
export type InfantryReviewType = typeof INFANTRY_REVIEW_TYPES[number];
export type UnitReviewGroup = 'representatives' | 'infantry' | 'polearm' | 'ranged' | 'cavalry' | 'mountedRanged' | 'siege' | 'navalLight' | 'navalHeavy' | 'navalRanged' | 'faith' | 'caravans' | 'embarked';

export const INFANTRY_VIEWS = {
  warrior: { col: 3, row: 3, label: 'Warrior', note: 'The accepted warrior anchors the infantry comparison.' },
  swordsman: { col: 5, row: 3, label: 'Swordsman', note: 'A sword and small guard distinguish this infantry counter.' },
  legionary: { col: 7, row: 3, label: 'Legionary', note: 'A broad shield and restrained helmet crest distinguish the legionary.' },
  longswordsman: { col: 9, row: 3, label: 'Longswordsman', note: 'A longer blade and enclosed helmet extend the accepted infantry family.' },
  fireLance: { col: 4, row: 5, label: 'Fire lance', note: 'An upright lance with a tube tip reads beside the other infantry weapons.' },
  khopesh: { col: 6, row: 5, label: 'Khopesh', note: 'A curved blade identifies the khopesh without relying on owner colour.' },
  eagleWarrior: { col: 8, row: 5, label: 'Eagle warrior', note: 'A compact eagle headpiece distinguishes this infantry variant.' },
} as const satisfies Record<InfantryReviewType, { col: number; row: number; label: string; note: string }>;

export const POLEARM_VIEWS = {
  spearman: { col: 3, row: 3, label: 'Spearman', note: 'The accepted spearman anchors the anti-cavalry line.' },
  phalanx: { col: 6, row: 3, label: 'Phalanx', note: 'A broad round shield and longer spear.' },
  spearWall: { col: 9, row: 3, label: 'Spear wall', note: 'A tall shield with an ivory spine.' },
  pikeman: { col: 3, row: 5, label: 'Pikeman', note: 'The longest pike, a small heater shield and a nasal guard.' },
  fubing: { col: 6, row: 5, label: 'Fubing', note: 'A broad spearhead, small buckler and short enamel pennant.' },
  ponticPeltast: { col: 9, row: 5, label: 'Pontic peltast', note: 'A light javelin and crescent shield.' },
} as const;
export const RANGED_VIEWS = {
  archer: { col: 3, row: 3, label: 'Archer', note: 'The accepted archer anchors the ranged line.' },
  bowman: { col: 6, row: 3, label: 'Bowman', note: 'A long bow and a compact arrow quiver.' },
  compositeBowman: { col: 9, row: 3, label: 'Composite bowman', note: 'A recurved bow with ivory horn tips.' },
  crossbowman: { col: 4, row: 5, label: 'Crossbowman', note: 'Transverse bow limbs, ivory stock and a seated bolt.' },
  slinger: { col: 8, row: 5, label: 'Slinger', note: 'A hanging sling and stone pouch replace the bow and quiver.' },
} as const;
export const CAVALRY_VIEWS = {
  horseman: { col: 3, row: 2, label: 'Horseman', note: 'The approved ivory chess knight and upright sword.' },
  cataphract: { col: 6, row: 2, label: 'Cataphract', note: 'Layered enamel neck armour and a long lance.' },
  knight: { col: 9, row: 2, label: 'Knight', note: 'A heater shield and upright lance on the shared knight bust.' },
  knightsTemplar: { col: 3, row: 4, label: 'Knights Templar', note: 'An ivory cross on the enamel shield.' },
  tangCavalry: { col: 6, row: 4, label: 'Tang cavalry', note: 'Banded armour and a short forked pennant.' },
  chanyuGuard: { col: 9, row: 4, label: 'Chanyu guard', note: 'A shield, long bannered lance and enamel armour.' },
  gendarme: { col: 3, row: 6, label: 'Gendarme', note: 'The longest lance, a crest and fitted neck armour.' },
  mandekalu: { col: 6, row: 6, label: 'Mandekalu', note: 'Ivory quilting across the enamel barding.' },
  chariot: { col: 9, row: 6, label: 'Chariot', note: 'An open carriage with spoked wheels and a spear.' },
  scythedChariot: { col: 6, row: 8, label: 'Scythed chariot', note: 'Ivory scythes extend from the carriage axle.' },
} as const;
export const MOUNTED_RANGED_VIEWS = {
  horseArcher: { col: 3, row: 3, label: 'Horse archer', note: 'The approved ivory horse bust, bow and quiver.' },
  whistlingArrow: { col: 6, row: 3, label: 'Whistling arrow', note: 'A tall display arrow with an ivory whistle bulb.' },
  xiongnuHorseArcher: { col: 9, row: 3, label: 'Xiongnu horse archer', note: 'A fringed enamel saddlecloth beneath the shared bow and horse.' },
  camelArcher: { col: 4, row: 5, label: 'Camel archer', note: 'A curved camel neck and blunt muzzle above a low saddlecloth.' },
  chariotArcher: { col: 8, row: 5, label: 'Chariot archer', note: 'An open wheeled carriage with an upright bow and arrows.' },
} as const;
export const SIEGE_VIEWS = {
  catapult: { col: 4, row: 4, label: 'Catapult', note: 'A low wheeled torsion engine, padded stop and loaded throwing cup.' },
  trebuchet: { col: 8, row: 4, label: 'Trebuchet', note: 'A tall A-frame, pivoting beam, hanging counterweight and sling.' },
} as const;
export const NAVAL_LIGHT_VIEWS = {
  trireme: { col: 3, row: 3, label: 'Trireme', note: 'One mast, a slender hull and an ivory bow ram.' },
  bireme: { col: 6, row: 3, label: 'Bireme', note: 'Two masts above the oared hull.' },
  galley: { col: 9, row: 3, label: 'Galley', note: 'Three masts and a low open deck.' },
  caravel: { col: 3, row: 5, label: 'Caravel', note: 'Four masts and a raised sterncastle.' },
  corvette: { col: 6, row: 5, label: 'Corvette', note: 'Five masts and a compact cannon battery.' },
  alexandrianGalley: { col: 9, row: 5, label: 'Alexandrian galley', note: 'Three masts with an elevated lookout.' },
} as const;
export const NAVAL_HEAVY_VIEWS = {
  warGalley: { col: 3, row: 3, label: 'War galley', note: 'A broad two-masted hull with oars and a ram.' },
  towerShip: { col: 6, row: 3, label: 'Tower ship', note: 'Three masts and a forward fighting tower.' },
  carrack: { col: 9, row: 3, label: 'Carrack', note: 'Four masts and a broad raised sterncastle.' },
  shipOfTheLine: { col: 3, row: 5, label: 'Ship of the line', note: 'Five masts and two rows of broadside guns.' },
  treasureShip: { col: 6, row: 5, label: 'Treasure ship', note: 'Four masts and paired gilt deckhouses.' },
} as const;
export const NAVAL_RANGED_VIEWS = {
  fireShip: { col: 3, row: 3, label: 'Fire ship', note: 'Three masts, a brazier and bronze fire nozzles.' },
  gunGalley: { col: 6, row: 3, label: 'Gun galley', note: 'Four masts with a broadside cannon battery.' },
  frigate: { col: 9, row: 3, label: 'Frigate', note: 'Five masts above a long gunned hull.' },
} as const;
export const FAITH_VIEWS = {
  augur: { col: 3, row: 3, label: 'Augur (retired)', note: 'Compatibility piece only: a low ivory cap, offering bowl and curved divining staff.' },
  prophet: { col: 6, row: 3, label: 'Prophet', note: 'The approved mitre, solar staff and closed book.' },
  apostle: { col: 9, row: 3, label: 'Apostle', note: 'A compact mitre, closed book and curved ivory crozier.' },
  inquisitor: { col: 4, row: 5, label: 'Inquisitor', note: 'An enamel hood, sealed book and diamond-topped staff.' },
  canoness: { col: 8, row: 5, label: 'Canoness', note: 'An ivory-banded veil, open choir book and halo standard.' },
} as const;
export const CARAVAN_VIEWS = {
  trader: { col: 4, row: 4, label: 'Caravan', note: 'The approved covered wagon on four spoked wheels.' },
  rihlaCaravan: { col: 8, row: 4, label: 'Rihla caravan', note: 'Journey panniers, a rolled carpet and a small pennant on the shared wagon.' },
} as const;
export const EMBARKED_VIEWS = {
  worker: { col: 3, row: 3, label: 'Worker afloat', note: 'Shared transport boat with the worker badge. Move one hex across water.' },
  settler: { col: 6, row: 3, label: 'Settler · embark', note: 'A land pawn at the shore. Move one hex to embark.' },
  warrior: { col: 9, row: 3, label: 'Warrior · landfall', note: 'A transport at the shore. Move one hex to disembark.' },
  horseman: { col: 6, row: 5, label: 'Cavalry afloat', note: 'The same transport carries cavalry; the badge retains its identity.' },
} as const;
export type EquipmentReviewType = keyof typeof EMBARKED_VIEWS | keyof typeof FAITH_VIEWS | keyof typeof CARAVAN_VIEWS | keyof typeof NAVAL_LIGHT_VIEWS | keyof typeof NAVAL_HEAVY_VIEWS | keyof typeof NAVAL_RANGED_VIEWS | keyof typeof POLEARM_VIEWS | keyof typeof RANGED_VIEWS | keyof typeof CAVALRY_VIEWS | keyof typeof MOUNTED_RANGED_VIEWS | keyof typeof SIEGE_VIEWS;
export const UNIT_LINE_REVIEWS = {
  embarked: { label: 'Embarked', base: 'worker', views: EMBARKED_VIEWS },
  faith: { label: 'Religious', base: 'prophet', views: FAITH_VIEWS },
  caravans: { label: 'Caravans', base: 'trader', views: CARAVAN_VIEWS },
  infantry: { label: 'Infantry', base: 'warrior', views: INFANTRY_VIEWS },
  polearm: { label: 'Anti-cavalry', base: 'spearman', views: POLEARM_VIEWS },
  ranged: { label: 'Ranged', base: 'archer', views: RANGED_VIEWS },
  cavalry: { label: 'Cavalry', base: 'horseman', views: CAVALRY_VIEWS },
  mountedRanged: { label: 'Mounted ranged', base: 'horseArcher', views: MOUNTED_RANGED_VIEWS },
  navalLight: { label: 'Light ships', base: 'trireme', views: NAVAL_LIGHT_VIEWS },
  navalHeavy: { label: 'Heavy ships', base: 'warGalley', views: NAVAL_HEAVY_VIEWS },
  navalRanged: { label: 'Ranged ships', base: 'fireShip', views: NAVAL_RANGED_VIEWS },
  siege: { label: 'Siege', base: 'catapult', views: SIEGE_VIEWS },
} as const;

/** New variants select their compact world even when opened directly by URL. */
export function unitReviewGroup(focus: string, requestedGroup?: string | null): UnitReviewGroup {
  if (focus === 'embarked' || (requestedGroup === 'embarked' && Object.prototype.hasOwnProperty.call(EMBARKED_VIEWS, focus))) return 'embarked';
  for (const [id, line] of Object.entries(UNIT_LINE_REVIEWS)) {
    if (id === 'embarked') continue;
    if (focus === id || (Object.prototype.hasOwnProperty.call(line.views, focus) &&
      (focus !== line.base || !UNIT_REVIEW_TYPES.some(type => type === focus) || requestedGroup === id))) return id as UnitReviewGroup;
  }
  return 'representatives';
}

export const UNIT_VIEWS = {
  warrior: { col: 5, row: 3, label: 'Warrior', note: 'Ivory face, a stout wooden club and no shield.' },
  spearman: { col: 7, row: 3, label: 'Spearman', note: 'The simple ivory cap and an upright gilt spear.' },
  archer: { col: 9, row: 3, label: 'Archer', note: 'Bow, string and quiver on the shared turned body.' },
  horseman: { col: 5, row: 5, label: 'Horseman', note: 'An ivory chess-knight bust, enamel seat and straight sword.' },
  horseArcher: { col: 7, row: 5, label: 'Horse archer', note: 'The accepted horse bust with a side bow and quiver.' },
  warElephant: { col: 9, row: 5, label: 'War elephant', note: 'An ivory bust with curled trunk, paired tusks and enamel brow cloth.' },
  scout: { col: 5, row: 7, label: 'Scout', note: 'A hooded cloak and an upright walking staff.' },
  settler: { col: 7, row: 7, label: 'Settler', note: 'A plain pawn and flag, turned toward the map camera.' },
  worker: { col: 9, row: 7, label: 'Worker', note: 'A tapered enamel pawn, ivory finial and pickaxe.' },
  trader: { col: 5, row: 9, label: 'Trader', note: 'An idle covered wagon standing directly on four wheels.' },
  prophet: { col: 7, row: 9, label: 'Prophet', note: 'A religious headpiece, solar staff and book.' },
  greatPerson: { col: 9, row: 9, label: 'Great person', note: 'The shared mantle and laurel, with a real great-person family emblem.' },
} as const satisfies Record<UnitReviewType, { col: number; row: number; label: string; note: string }>;

export const UNIT_CONTEXT_VIEWS = {
  city: { col: 7, row: 12, label: 'City garrison', note: 'A soldier and worker share the approved city courtyard, beside a farm.' },
  hill: { col: 10, row: 12, label: 'Warrior · hills', note: 'The plinth meets the actual hill faces. Move one hex to check the change in elevation.' },
  wagonHills: { col: 12, row: 12, label: 'Trader · hills', note: 'The wagon wheels meet the slope without adding a display pedestal.' },
} as const;
export type UnitReviewContext = keyof typeof UNIT_CONTEXT_VIEWS;
export const UNIT_REVIEW_LEADERS = ['pachacuti', 'taizong', 'hypatiaOfAlexandria'] as const satisfies readonly LeaderId[];
export type UnitReviewLeader = typeof UNIT_REVIEW_LEADERS[number];

/** Real roster ids: the renderer reads Unit.person to select the family. */
export const UNIT_REVIEW_PEOPLE = Object.fromEntries(FAMILIES.map(family => {
  const person = LIVE_GREAT_PERSON_IDS.find(id => greatPersonDef(id).family === family);
  if (!person) throw new Error(`The unit review needs a live ${family}.`);
  return [family, person];
})) as Record<Family, typeof LIVE_GREAT_PERSON_IDS[number]>;

/** An explicitly separate visual-review world; it never touches a game save. */
export function createUnitsFixture(options: { leader?: UnitReviewLeader; family?: Family; group?: UnitReviewGroup } = {}): GameState {
  const leader = options.leader ?? 'pachacuti', family = options.family ?? 'scholar';
  const owner = leaderDef(leader);
  const state = newGame({ seed: 23, sizeName: 'duel', players: [{
    name: owner.name, leader, color: owner.colors.primary, secondary: owner.colors.secondary, isHuman: true,
  }] });
  const line = options.group && options.group !== 'representatives' ? UNIT_LINE_REVIEWS[options.group] : null;
  const embarked = options.group === 'embarked';
  const naval = embarked || (options.group?.startsWith('naval') ?? false);
  state.map = createMap({ width: line ? 14 : 16, height: line ? 10 : 16, terrain: naval ? 'coast' : 'grassland' });
  state.units = []; state.cities = []; state.camps = []; state.nextEntityId = 1;
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  const tile = (col: number, row: number): Tile => getTileAt(state.map, col, row)!;
  if (line) {
    for (const ground of state.map.tiles) {
      ground.moisture = .55;
      if (naval && (ground.col <= 1 || ground.col >= 12)) ground.terrain = 'grassland';
      if (ground.col <= 1 && ground.row >= 6) ground.feature = 'forest';
      if (ground.col >= (naval ? 12 : 11) && ground.row === 7) ground.hills = true;
    }
    if (embarked) {
      state.players[0]!.techsResearched.push('sailing', 'wayfinding');
      tile(6, 3).terrain = 'grassland';
      tile(9, 4).terrain = 'grassland';
    }
    for (const [type, view] of Object.entries(line.views)) {
      createUnit(state, 0, type as UnitTypeId, view.col, view.row);
    }
    setUnitsFixtureVisibility(state, false);
    return state;
  }
  for (const ground of state.map.tiles) {
    ground.moisture = .55;
    // The sea and small woods frame the specimens without obscuring them.
    if (ground.col >= 14) ground.terrain = ground.col === 14 ? 'coast' : 'ocean';
    if (ground.col <= 2 && ground.row >= 9 && ground.row <= 13) ground.feature = 'forest';
  }
  for (const col of [10, 11, 12]) tile(col, 12).hills = true;
  const town = foundCityAt(state, 0, tile(7, 12));
  town.population = 4; town.buildings.push('palisade');
  state.tileOwner.fill(town.id);
  state.players[0]!.techsResearched.push('agriculture');
  tile(5, 12).resource = 'wheat';
  const refusal = improvementErrorAt(state, 0, tile(5, 12), 'farm');
  if (refusal) throw new Error(`Invalid unit-review farm: ${refusal}`);
  tile(5, 12).improvement = 'farm';
  for (const type of UNIT_REVIEW_TYPES) {
    const view = UNIT_VIEWS[type];
    createUnit(state, 0, type, view.col, view.row, type === 'greatPerson' ? UNIT_REVIEW_PEOPLE[family] : undefined);
  }
  createUnit(state, 0, 'warrior', 7, 12);
  createUnit(state, 0, 'worker', 7, 12);
  createUnit(state, 0, 'warrior', 10, 12);
  createUnit(state, 0, 'trader', 12, 12);
  setUnitsFixtureVisibility(state, false);
  return state;
}

export function setUnitsFixtureVisibility(state: GameState, remembered: boolean): void {
  for (const grid of state.visibility) grid.fill(remembered ? EXPLORED : VISIBLE);
}

/** Same route-before-command and walked-prefix contract as the game's controls. */
export function moveUnitsFixtureUnit(state: GameState, unitId: number) {
  const unit = state.units.find(piece => piece.id === unitId);
  if (!unit) return { ok: false as const, error: 'This specimen is no longer in the review.' };
  const from: Cell = { col: unit.col, row: unit.row };
  const target = { col: from.col, row: from.row + 1 };
  const ground = getTileAt(state.map, target.col, target.row);
  const route = ground ? findPath(state, unit, ground) ?? [] : [];
  const result = applyCommand(state, { type: 'moveUnit', playerId: unit.ownerId, unitId, target });
  if (!result.ok) return result;
  return { ok: true as const, unitId, from, walked: walkedPrefix(route, unit) };
}
