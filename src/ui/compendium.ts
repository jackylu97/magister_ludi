/**
 * The Compendium: every table in the game, read back to the player in the words
 * the simulation already uses.
 *
 * The one rule this file is built around, and the reason it is worth a module of
 * its own: **nothing here is hand-written prose about a number.** Every figure
 * comes out of a data row or an evaluator, and every sentence about what a thing
 * *does* comes out of a describer the game already ships — `describeCard`
 * (`statecraft.ts`, the one place a card effect becomes words),
 * `describeResourceSignature` (`resourceEffects.ts`, the same bargain for a
 * luxury), `techGifts` (`techUnlocks.ts`), `explainUnitCost` (`cities.ts`).
 * A reference page that paraphrased would be a second vocabulary for the same
 * rules, and a second vocabulary drifts on the first balance pass — which is
 * exactly the failure the hover card, the offer card and the city panel are all
 * built to avoid. `test/ui/compendium.test.ts` holds it by reading this source:
 * no string literal in this file may contain a digit.
 *
 * One module, two mounts
 * ----------------------
 * `renderCompendium` builds the two panes into whatever element it is handed.
 * `createCompendium` wraps that in the game's overlay contract (`hidden` is the
 * whole of the screen state, Escape closes, the landing clears it); the
 * standalone page (`compendium.html`, `src/compendiumPage/`) calls the same
 * function on a page with no game behind it. There is no second renderer,
 * because there is no second reference.
 *
 * A game is **optional** everywhere in here, and that is what makes the second
 * mount possible: nothing on these cards is a fact about a seat. The single
 * place a live game would say more is a unit's price — `explainUnitCost` folds
 * the settler ladder and an empire's law into it — and the Compendium prints
 * that fold's **first line only**, the roster's own price, which is the same
 * figure with or without a state. See `rosterCost`.
 *
 * Every entry has a stable id
 * ---------------------------
 * `unit:swordsman`, `tech:ironWorking`, `order:bloodedSpears` — the section's
 * name, a colon, the table's own key. It is the element's DOM id, the URL hash
 * the overlay honours when it opens, and the argument `open` takes, so a keyword
 * anywhere else in the interface can point at a definition later without this
 * file growing a second address space.
 */

import {
  BUILDING_IDS,
  type BuildingDef,
  type BuildingId,
  buildingDef,
  isWonder,
} from '../sim/buildingData';
import { explainUnitCost } from '../sim/cities';
import {
  type Family,
  GREAT_PERSON_IDS,
  type GreatPersonId,
  greatPersonDef,
} from '../sim/greatPeopleData';
import {
  IMPROVEMENT_IDS,
  type ImprovementDef,
  type ImprovementId,
  improvementDef,
  improvementForResource,
} from '../sim/improvementData';
import {
  BELIEF_IDS,
  type BeliefId,
  RITE_IDS,
  type RiteId,
  beliefDef,
  riteDef,
} from '../sim/religionData';
import {
  RESOURCE_IDS,
  type ResourceDef,
  type ResourceId,
  resourceDef,
} from '../sim/resourceData';
import { describeResourceSignature } from '../sim/resourceEffects';
import { RULES } from '../sim/rulesData';
import { describeCard } from '../sim/statecraft';
import {
  DOCTRINE_IDS,
  type DoctrineId,
  ORDER_IDS,
  type OrderId,
  doctrineDef,
  orderDef,
} from '../sim/statecraftData';
import type { GameState } from '../sim/state';
import { gatingTech } from '../sim/tech';
import { TECH_IDS, type TechId, techDef } from '../sim/techData';
import { type TechGift, techGifts } from '../sim/techUnlocks';
import { TILE_YIELD_KEYS, type TileYieldSpec, readTileYield } from '../sim/terrainData';
import { TRIUMPH_IDS, type TriumphId, triumphDef } from '../sim/triumphData';
import { UNIT_TYPE_IDS, type UnitDef, type UnitTypeId, unitDef } from '../sim/unitData';
import { CARD_LINE_NAME, lineOf } from './cardLine';
import { YIELD_GLYPH, figure, percentFigure, signedFigure } from './figures';
import { AXIS_MARK, riteGrantWords } from './religionScreen';
import { resourceMarkNode } from './resourceMark';
import { setYieldText } from './yieldMark';

// --- the model --------------------------------------------------------------

/** The fourteen shelves, in the order the index lists them. */
export type CompendiumSectionId =
  | 'unit'
  | 'building'
  | 'wonder'
  | 'improvement'
  | 'resource'
  | 'tech'
  | 'order'
  | 'doctrine'
  | 'belief'
  | 'rite'
  | 'greatPerson'
  | 'triumph'
  | 'meter'
  | 'trade';

/**
 * The mark an entry wears, as a *description* rather than as a node.
 *
 * Three kinds because the interface already draws marks three ways and this page
 * introduces none of its own (the brief: "no new icons beyond what exists"): a
 * unit wears the badge SVG its piece wears, a resource is drawn by the one
 * printer resources are always drawn by (`resourceMark.ts`), and everything else
 * carries the glyph its own table declares. Kept as data so the entry model is
 * testable with no DOM — this suite has no jsdom, which is `figures.ts`' reason
 * and `offerSpread`'s.
 */
export type CompendiumMark =
  | { kind: 'badge'; badge: string }
  | { kind: 'resource'; resource: ResourceId }
  | { kind: 'glyph'; glyph: string };

/** One figure of an entry: a label and the number, as it is written. */
export interface CompendiumRow {
  label: string;
  /** Composed in `YIELD_GLYPH`, printed through `setYieldText`. Never empty. */
  figures: string;
}

/** One sentence about what a thing does. `describeCard`'s clause, widened. */
export interface CompendiumClause {
  text: string;
  /** A half of the ratified text this build does not implement. Struck through. */
  deferred?: boolean;
  /** A standing caveat on what it *does* do. Italic, never struck. */
  note?: boolean;
}

/** One card of the reference. */
export interface CompendiumEntry {
  /** `unit:swordsman`. The DOM id, the URL hash and `open`'s argument. */
  id: string;
  section: CompendiumSectionId;
  name: string;
  /** What kind of thing this is, in the card's eyebrow. Never empty. */
  eyebrow: string;
  mark: CompendiumMark | null;
  rows: CompendiumRow[];
  clauses: CompendiumClause[];
  /** One line in the voice of the tech tree's aphorisms, or null. Flavour. */
  flavor: string | null;
}

export interface CompendiumSection {
  id: CompendiumSectionId;
  name: string;
  entries: CompendiumEntry[];
}

// --- small composers --------------------------------------------------------

/**
 * The names of the shelves. A list rather than a record so the index's order is
 * the data's own, exactly as every id list in `src/sim/` is file order.
 */
const SECTION_NAMES: readonly (readonly [CompendiumSectionId, string])[] = [
  ['unit', 'Units'],
  ['building', 'Buildings'],
  ['wonder', 'Wonders'],
  ['improvement', 'Improvements'],
  ['resource', 'Resources'],
  ['tech', 'Technologies'],
  ['order', 'Orders'],
  ['doctrine', 'Doctrines'],
  ['belief', 'Beliefs'],
  ['rite', 'Rites'],
  ['greatPerson', 'Great People'],
  ['triumph', 'Triumphs'],
  ['meter', 'The Meters'],
  ['trade', 'Trade'],
];

/** `unit:swordsman`. The one place an entry id is composed. */
export function compendiumId(section: CompendiumSectionId, id: string): string {
  return `${section}:${id}`;
}

/** A row, dropped entirely when it has no figure to carry. */
function row(label: string, figures: string): CompendiumRow[] {
  return figures.length === 0 ? [] : [{ label, figures }];
}

/** A tile yield in glyphs — `+2🌾 +1⚙`, or empty when it pays nothing. */
function tileYieldFigures(spec: TileYieldSpec): string {
  const value = readTileYield(spec);
  return TILE_YIELD_KEYS.filter((key) => value[key] !== 0)
    .map((key) => `${signedFigure(value[key])}${YIELD_GLYPH[key]}`)
    .join(' ');
}

/** The Æra a technology sits in, in the numerals the star chart uses. */
function ageWord(age: number): string {
  return `Æra ${'I'.repeat(Math.max(1, Math.round(age)))}`;
}

/** `Bronze Working`, or empty for a thing the tree gates on nothing. */
function techName(id: TechId | null | undefined): string {
  return id === null || id === undefined ? '' : techDef(id).name;
}

/** A list in words, with the last pair joined by "and". */
function words(parts: readonly string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]!}`;
}

/**
 * The badge class a unit's piece wears.
 *
 * **The two clauses of `badgeClassFor` (`render3d/board3d.ts`) that are facts
 * about the unit row**, and deliberately not its third. That function is the
 * board's own answer and would be the right one to call, but it lives behind the
 * 3D renderer — importing it would pull Three.js into a reference page that
 * draws nothing — and its third clause reads `data/view3d.json`, which is a
 * look-and-feel file splitting one sculpt's badge into two. `badgeClassFor`
 * itself argues that clause belongs last precisely because it is about drawings;
 * a page with no board is the one caller entitled to stop before it.
 */
function badgeClassOf(def: UnitDef): string {
  if (def.greatWork === true) return 'greatPerson';
  if (def.consecrates === true) return 'religious';
  return def.modelClass;
}

/**
 * What the roster charges for one of these, before anything an empire does to
 * the price.
 *
 * `explainUnitCost`'s **first line** when there is a game to ask, and the row's
 * own `cost` when there is not — which is the same number by construction (that
 * line *is* `def.cost`; the ladder, the age band and the empire's law are the
 * three lines under it). Asked of seat zero because the roster line is the one
 * line of that fold which is not a fact about a seat, and the card says so in
 * the sentence beneath it.
 */
function rosterCost(state: GameState | null, type: UnitTypeId): number {
  if (state === null) return unitDef(type).cost;
  return explainUnitCost(state, 0, type)[0]?.amount ?? unitDef(type).cost;
}

// --- units ------------------------------------------------------------------

/**
 * What a unit's markers *mean*, spelled out.
 *
 * Every one of them is a presence-is-the-marker field (`CLAUDE.md`: nothing in
 * `src/sim/` compares a unit type against `"settler"`), so this is the one place
 * in the interface where those fields are read back as sentences rather than as
 * behaviour. They are listed in the order a player meets them: what it is for,
 * then what it costs to keep, then what the ground does to it.
 */
function unitMarkers(def: UnitDef): CompendiumClause[] {
  const out: CompendiumClause[] = [];
  if (def.foundsCity) out.push({ text: 'Founds a city, and is spent doing it' });
  if (def.haltsGrowth) {
    out.push({ text: 'A city banks no food toward growth while one is at the front of its queue' });
  }
  if (def.charges !== undefined && def.consecrates !== true && def.greatWork !== true) {
    out.push({ text: `${def.charges} charges of spadework, one improvement each` });
  }
  if (def.consecrates === true) {
    out.push({
      text: `${def.charges ?? 0} charges of rites — or the whole of it, spent consecrating one god`,
    });
  }
  if (def.greatWork === true) {
    out.push({ text: 'Called, never built: no city queues one and no bank buys one' });
    out.push({ text: 'Spends itself on its family’s act, or plants its family’s work' });
  }
  if (def.trades === true) {
    out.push({ text: 'Carries a trade route between two of your cities, and lays road as it walks' });
  }
  if (def.ignoresTerrainCost === true) {
    out.push({ text: 'Every passable hex costs it the same, whatever grows on it' });
  }
  if (def.requiresResource !== undefined) {
    out.push({ text: `Needs ${resourceDef(def.requiresResource).name} under your control` });
  }
  if (def.minCityPop > 0) {
    out.push({ text: `Only a city of ${def.minCityPop} people or more may build one` });
  }
  if (def.upgradesTo !== undefined) {
    out.push({ text: `Becomes a ${unitDef(def.upgradesTo).name} when its technology lands` });
  }
  if (def.purchase !== undefined) {
    out.push({
      text: `Bought with ${def.purchase.currency} alone — never with the treasury`,
    });
  }
  return out;
}

function unitEntry(state: GameState | null, type: UnitTypeId): CompendiumEntry {
  const def = unitDef(type);
  const gate = gatingTech('unit', type);
  // A great person is neither built nor bought — it is *called* — so there is no
  // roster line to print for one, and printing a hammer price would be the card
  // promising a queue row that `buildError` refuses.
  const priced =
    def.greatWork === true ? '' : `${figure(rosterCost(state, type))}${YIELD_GLYPH.production}`;
  const rows: CompendiumRow[] = [
    ...row('Strength', def.combatStrength > 0 ? figure(def.combatStrength) : ''),
    ...row(
      'Ranged',
      def.rangedStrength === undefined
        ? ''
        : `${figure(def.rangedStrength)} at ${figure(def.range ?? 0)}`,
    ),
    ...row('Movement', figure(def.movement)),
    ...row('Sight', figure(def.sight)),
    ...row('Health', figure(def.maxHp)),
    ...row('Roster cost', priced),
    ...row(
      'Bought for',
      def.purchase === undefined ? '' : `${figure(def.purchase.cost)} ${def.purchase.currency}`,
    ),
    ...row('Unlocked by', techName(gate)),
  ];
  const clauses = unitMarkers(def);
  if (def.greatWork !== true) {
    clauses.push({
      text:
        'The roster price is what a city starts from: an escalating type climbs with every ' +
        'expansion already bought, the age band multiplies it, and an empire’s law moves it ' +
        'again — the city panel prints that whole fold.',
      note: true,
    });
  }
  return {
    id: compendiumId('unit', type),
    section: 'unit',
    name: def.name,
    eyebrow: def.category,
    mark: { kind: 'badge', badge: badgeClassOf(def) },
    rows,
    clauses,
    flavor: null,
  };
}

// --- buildings and wonders --------------------------------------------------

/** The six flat voices a building pays, as one figure. */
function buildingYieldFigures(def: BuildingDef): string {
  return tileYieldFigures({
    food: def.food,
    production: def.production,
    gold: def.gold,
    science: def.science,
    culture: def.culture,
    faith: def.faith,
  });
}

/**
 * A site requirement in words.
 *
 * The scope's own test names itself; a composite names each of its parts, which
 * is the only reading that stays honest when a row asks for two things at once.
 * `siteWords` in `tech.ts` is the sim's version of this and is not exported —
 * see the report; what it says is the *refusal* ("The Colossus wants a
 * harbour"), and a reference card wants the requirement rather than the excuse.
 */
function siteRequirement(def: BuildingDef): string {
  const site = def.requiresSite;
  if (site === undefined) return '';
  // A callback rather than a `$1` replacement, for the reason the whole module
  // exists: `test/ui/compendium.test.ts` refuses a digit in any string this file
  // prints from, and a back-reference is a digit in a string.
  const named = (test: string): string =>
    test.replace(/[A-Z]/g, (letter) => ` ${letter}`).toLowerCase();
  // `all` is the only composite the scope vocabulary has, deliberately — see
  // `CityScope`. So one branch covers every shape a row can carry.
  if (site.test === 'all') return words(site.of.map((part) => named(part.test)));
  return named(site.test);
}

function buildingEntry(id: BuildingId): CompendiumEntry {
  const def = buildingDef(id);
  const wonder = isWonder(id);
  const gate = gatingTech('building', id);
  const rows: CompendiumRow[] = [
    ...row('Cost', `${figure(def.cost)}${YIELD_GLYPH.production}`),
    ...row('Pays', buildingYieldFigures(def)),
    ...row(
      'Science per citizen',
      def.sciencePerPop === 0 ? '' : `${figure(def.sciencePerPop)}${YIELD_GLYPH.science}`,
    ),
    ...row('Trade routes', def.routeSlots === undefined ? '' : signedFigure(def.routeSlots)),
    ...row(
      'Toward',
      def.productionBonus === undefined
        ? ''
        : `${percentFigure(def.productionBonus.percent)} ${def.productionBonus.category}`,
    ),
    ...row(
      'Renown',
      def.renown === undefined
        ? ''
        : words([
            `${signedFigure(def.renown.perTurn)} a turn`,
            ...(def.renown.onComplete === undefined
              ? []
              : [`${signedFigure(def.renown.onComplete)} on completion`]),
          ]),
    ),
    ...row('Feeds', def.renown?.family ?? ''),
    ...row('Needs', siteRequirement(def)),
    ...row('Unlocked by', techName(gate)),
  ];
  const clauses: CompendiumClause[] = describeCard(id).map((entry) => ({
    text: entry.text,
    deferred: entry.deferred,
  }));
  if (def.cityStat !== undefined) {
    const stat = def.cityStat;
    // A wall a card raises and a wall a town built are the same fact about the
    // same city (`buildingEffects.ts`), so this reads the same two words a
    // card's `cityStat` clause does — the shape is that one minus its scope.
    clauses.push({
      text:
        stat.stat === 'defense'
          ? `${signedFigure(stat.amount)} to whoever defends the walls`
          : `${signedFigure(stat.amount)} to how far the town sees`,
    });
  }
  if (def.note !== undefined) clauses.push({ text: def.note, note: true });
  if (wonder) {
    clauses.push({
      text: 'One of these stands in the whole world, ever. It is never for sale.',
      note: true,
    });
  }
  return {
    id: compendiumId(wonder ? 'wonder' : 'building', id),
    section: wonder ? 'wonder' : 'building',
    name: def.name,
    eyebrow: def.category,
    mark: { kind: 'glyph', glyph: wonder ? '✶' : '▣' },
    rows,
    clauses,
    flavor: null,
  };
}

// --- improvements -----------------------------------------------------------

function improvementEntry(id: ImprovementId): CompendiumEntry {
  const def: ImprovementDef = improvementDef(id);
  const rows: CompendiumRow[] = [
    ...row('Pays', tileYieldFigures(def.yields)),
    ...row('Charges', figure(def.chargeCost)),
    ...row('Unlocked by', techName(def.requiresTech)),
    ...row('Terrain', words((def.validTerrain ?? []).map((terrain) => terrain))),
    ...row(
      'Terrain, watered',
      words((def.freshwaterTerrain ?? []).map((terrain) => terrain)),
    ),
    ...row('Features', words((def.validFeatures ?? []).map((feature) => feature))),
    ...row(
      'Ground',
      def.requiresHills === undefined ? '' : def.requiresHills ? 'hills' : 'flat',
    ),
    ...row(
      'Opens',
      words((def.improvesResource ?? []).map((resource) => resourceDef(resource).name)),
    ),
    ...row('Defense', def.defense === undefined ? '' : signedFigure(def.defense)),
    ...row('Planted by', def.greatPerson ?? ''),
  ];
  const clauses: CompendiumClause[] = [];
  if (def.hillsIf !== undefined && def.hillsIf.length > 0) {
    clauses.push({
      text: `High ground is forgiven where the hex ${words(
        def.hillsIf.map((why) =>
          why === 'freshwater' ? 'can drink' : 'carries a resource this improvement opens',
        ),
      )}`,
    });
  }
  if (def.requiresResource !== undefined && def.requiresResource.length > 0) {
    clauses.push({
      text: `Only on ${words(def.requiresResource.map((resource) => resourceDef(resource).name))}`,
    });
  }
  if (def.clearsClutter) clauses.push({ text: 'Ploughs the hex’s own scatter under' });
  if (def.claimsNeighbours === true) {
    clauses.push({ text: 'Claims the hex it stands on and the ring around it' });
  }
  if (def.greatPerson !== undefined) {
    clauses.push({
      text: 'A worker may not lay a great person’s work, and a great person lays nothing else.',
      note: true,
    });
  }
  return {
    id: compendiumId('improvement', id),
    section: 'improvement',
    name: def.name,
    eyebrow: def.greatPerson === undefined ? 'improvement' : 'a great work',
    mark: { kind: 'glyph', glyph: def.emoji },
    rows,
    clauses,
    flavor: null,
  };
}

// --- resources --------------------------------------------------------------

function resourceEntry(id: ResourceId): CompendiumEntry {
  const def: ResourceDef = resourceDef(id);
  const opener = improvementForResource(id);
  const rows: CompendiumRow[] = [
    ...row('Pays', tileYieldFigures(def.yields)),
    ...row('Terrain', words(def.validTerrain.map((terrain) => terrain))),
    ...row('Features', words((def.validFeatures ?? []).map((feature) => feature))),
    ...row('Ground', def.hills === undefined ? '' : def.hills ? 'hills' : 'flat'),
    ...row('Revealed by', techName(def.requiresTech)),
    ...row('Opened by', opener === null ? '' : improvementDef(opener).name),
  ];
  const clauses: CompendiumClause[] = describeResourceSignature(id).map((line) => ({
    text: line.fromAge === undefined ? line.text : `${line.text} — ${ageWord(line.fromAge)}`,
  }));
  if (def.requiresTech !== undefined) {
    clauses.push({
      text:
        'An empire that cannot name it is not paid for it: the mark, the access and the ' +
        'hex’s own yield all arrive together, on the reveal.',
      note: true,
    });
  }
  return {
    id: compendiumId('resource', id),
    section: 'resource',
    name: def.name,
    eyebrow: def.kind,
    mark: { kind: 'resource', resource: id },
    rows,
    clauses,
    flavor: null,
  };
}

// --- technologies -----------------------------------------------------------

/** One gift of a technology, in the words the star chart's own card uses. */
function giftWords(gift: TechGift): string {
  if (gift.kind === 'unit') return `${gift.name} — ${figure(unitDef(gift.id).cost)}${YIELD_GLYPH.production}`;
  if (gift.kind === 'building') {
    return `${gift.name} — ${figure(buildingDef(gift.id).cost)}${YIELD_GLYPH.production}`;
  }
  if (gift.kind === 'improvement') {
    return `${gift.name} — ${figure(improvementDef(gift.id).chargeCost)} charges`;
  }
  if (gift.kind === 'reveal') return `${gift.name} — named at last`;
  if (gift.kind === 'renewal' || gift.kind === 'buildingRenewal') {
    return `${gift.name} — ${tileYieldFigures({
      food: gift.add.food ?? 0,
      production: gift.add.production ?? 0,
      gold: gift.add.gold ?? 0,
      science: gift.add.science,
      culture: gift.add.culture,
      faith: gift.add.faith,
    })}`;
  }
  if (gift.kind === 'buildingTileYield') {
    return `${gift.name} — ${tileYieldFigures({
      food: gift.add.food ?? 0,
      production: gift.add.production ?? 0,
      gold: gift.add.gold ?? 0,
      science: gift.add.science,
      culture: gift.add.culture,
      faith: gift.add.faith,
    })} on the ground`;
  }
  return gift.name;
}

function techEntry(id: TechId): CompendiumEntry {
  const def = techDef(id);
  const rows: CompendiumRow[] = [
    ...row('Cost', `${figure(def.cost)}${YIELD_GLYPH.science}`),
    ...row('Wants', words(def.prereqs.map((prereq) => techDef(prereq).name))),
  ];
  const clauses: CompendiumClause[] = techGifts(id).map((gift) => ({ text: giftWords(gift) }));
  if (clauses.length === 0) clauses.push({ text: 'Hands over nothing on its own' });
  return {
    id: compendiumId('tech', id),
    section: 'tech',
    name: def.name,
    eyebrow: ageWord(def.age),
    mark: { kind: 'glyph', glyph: def.glyph },
    rows,
    clauses,
    flavor: def.flavor ?? null,
  };
}

// --- the cards --------------------------------------------------------------

/**
 * A card's clauses, its unbuilt halves and its standing caveat.
 *
 * `describeCard` already carries the deferred halves for every one of its seven
 * classes, so this only adds `note` — which is a field on the row rather than an
 * effect, and is printed in italics rather than struck through: the difference
 * between "this clause is missing" and "this clause is here and there is
 * something to know about it".
 */
function cardClauses(id: Parameters<typeof describeCard>[0], note?: string): CompendiumClause[] {
  const out: CompendiumClause[] = describeCard(id).map((entry) => ({
    text: entry.text,
    deferred: entry.deferred,
  }));
  if (note !== undefined) out.push({ text: note, note: true });
  return out;
}

function orderEntry(id: OrderId): CompendiumEntry {
  const def = orderDef(id);
  return {
    id: compendiumId('order', id),
    section: 'order',
    name: def.name,
    eyebrow: 'an order',
    mark: { kind: 'glyph', glyph: '❧' },
    rows: [
      ...row('Slot', def.slot),
      ...row('Pool', def.pool),
      ...row('Thread', CARD_LINE_NAME[lineOf(def)]),
    ],
    clauses: cardClauses(id, def.note),
    flavor: def.flavor.length === 0 ? null : def.flavor,
  };
}

function doctrineEntry(id: DoctrineId): CompendiumEntry {
  const def = doctrineDef(id);
  return {
    id: compendiumId('doctrine', id),
    section: 'doctrine',
    name: def.name,
    eyebrow: 'a doctrine',
    mark: { kind: 'glyph', glyph: '✦' },
    rows: [...row('Tier', figure(def.tier)), ...row('Thread', CARD_LINE_NAME[lineOf(def)])],
    clauses: cardClauses(id, def.note),
    flavor: def.flavor.length === 0 ? null : def.flavor,
  };
}

function beliefEntry(id: BeliefId): CompendiumEntry {
  const def = beliefDef(id);
  return {
    id: compendiumId('belief', id),
    section: 'belief',
    name: def.name,
    eyebrow: 'a god',
    mark: { kind: 'glyph', glyph: AXIS_MARK[def.axis].glyph },
    rows: [],
    clauses: cardClauses(id, def.note),
    flavor: def.flavor.length === 0 ? null : def.flavor,
  };
}

function riteEntry(id: RiteId): CompendiumEntry {
  const def = riteDef(id);
  const clauses: CompendiumClause[] = [];
  const grant = riteGrantWords(id);
  if (grant.length > 0) clauses.push({ text: grant });
  clauses.push(...cardClauses(id, def.note));
  return {
    id: compendiumId('rite', id),
    section: 'rite',
    name: def.name,
    eyebrow: 'a rite',
    mark: { kind: 'glyph', glyph: '☩' },
    rows: [
      ...row('Aimed at', def.target),
      ...row('Lasts', def.duration === undefined ? '' : `${figure(def.duration)} turns`),
      ...row('Taught by', techName(def.tech)),
    ],
    clauses,
    flavor: def.flavor.length === 0 ? null : def.flavor,
  };
}

// --- great people -----------------------------------------------------------

/**
 * What one family's **act** pays, off `rules.greatPeople`.
 *
 * The verbs a great person is spent on, and the reason this is a sentence per
 * family rather than a table: each figure is paid into a *different* bucket
 * (Entry XVIII's five seams), and a column of bare numbers would say they were
 * the same currency.
 */
function familyAct(family: Family): string {
  const great = RULES.greatPeople;
  if (family === 'scholar') {
    return `Its act pays ${percentFigure(great.scholarShare * 100)} of the technology being researched.`;
  }
  if (family === 'engineer') {
    return `Its act pays ${figure(great.engineerHammers)}${YIELD_GLYPH.production} into a city, multiplied by the empire’s era.`;
  }
  if (family === 'merchant') {
    return `Its act pays ${figure(great.merchantGold)}${YIELD_GLYPH.gold} into the treasury, multiplied by the empire’s era.`;
  }
  if (family === 'artist') {
    return `Its act pays ${figure(great.artistCulture)}${YIELD_GLYPH.culture} toward the next draft, and hangs ${signedFigure(great.artistHappiness)} happiness on the town for ${figure(great.artistTurns)} turns.`;
  }
  return `Its act hangs ${signedFigure(great.generalCombat)} strength on every piece within ${figure(great.generalRadius)} hexes for ${figure(great.generalTurns)} turns.`;
}

/** The work a family plants, named off the improvement table's own inverse. */
function familyWork(family: Family): string {
  for (const id of IMPROVEMENT_IDS) {
    if (improvementDef(id).greatPerson === family) return improvementDef(id).name;
  }
  return '';
}

function greatPersonEntry(id: GreatPersonId): CompendiumEntry {
  const def = greatPersonDef(id);
  const clauses: CompendiumClause[] = [{ text: familyAct(def.family) }];
  const work = familyWork(def.family);
  if (work.length > 0) clauses.push({ text: `Or it plants a ${work} and is spent doing it.` });
  clauses.push(...cardClauses(id));
  clauses.push({ text: def.kernel, note: true });
  return {
    id: compendiumId('greatPerson', id),
    section: 'greatPerson',
    name: def.name,
    eyebrow: `${def.family} · ${ageWord(def.age)}`,
    mark: { kind: 'badge', badge: 'greatPerson' },
    rows: [...row('Tier', def.tier)],
    clauses,
    flavor: def.epigram.length === 0 ? null : def.epigram,
  };
}

// --- triumphs ---------------------------------------------------------------

/** How often a triumph may be had, in the words the renown card uses. */
const SCOPE_WORD: Record<string, string> = {
  once: 'once, ever',
  perAge: 'once an era',
  contested: 'once an era, first empire only',
  perEvent: 'every time',
};

function triumphEntry(id: TriumphId): CompendiumEntry {
  const def = triumphDef(id);
  const clauses: CompendiumClause[] = [];
  if (def.deferred !== undefined) clauses.push({ text: def.deferred, deferred: true });
  return {
    id: compendiumId('triumph', id),
    section: 'triumph',
    name: def.name,
    eyebrow: SCOPE_WORD[def.scope] ?? def.scope,
    mark: { kind: 'glyph', glyph: '✵' },
    rows: [...row('Pays', signedFigure(def.pays)), ...row('Feeds', def.family ?? '')],
    clauses,
    flavor: def.epigram.length === 0 ? null : def.epigram,
  };
}

// --- the meters and trade ---------------------------------------------------

/** A ladder of rungs — the bonus tiers, the growth stifle, the border freeze. */
function ladderRows(steps: readonly { whenAtOrAbove?: number; whenAtOrBelow?: number; whenBelow?: number; percent: number }[]): CompendiumRow[] {
  return steps.map((step) => ({
    label:
      step.whenAtOrAbove !== undefined
        ? `at or above ${signedFigure(step.whenAtOrAbove)}`
        : step.whenAtOrBelow !== undefined
          ? `at or below ${signedFigure(step.whenAtOrBelow)}`
          : `below ${signedFigure(step.whenBelow ?? 0)}`,
    figures: percentFigure(step.percent),
  }));
}

function meterEntries(): CompendiumEntry[] {
  const happiness = RULES.meters.happiness;
  const authority = RULES.meters.authority;
  const cities = RULES.cities;
  return [
    {
      id: compendiumId('meter', 'happiness'),
      section: 'meter',
      name: 'Happiness',
      eyebrow: 'supply against demand',
      mark: { kind: 'glyph', glyph: '☺' },
      rows: [
        { label: 'The palace supplies', figures: signedFigure(happiness.palace) },
        {
          label: 'Each unique improved luxury',
          figures: signedFigure(happiness.perUniqueLuxury),
        },
        { label: 'Each citizen demands', figures: signedFigure(-happiness.demandPerPop) },
        ...ladderRows(RULES.meters.tiers),
      ],
      clauses: [
        {
          text: `A city of n people demands ${figure(happiness.demandPerPop)} apiece, and crowds beyond ${figure(happiness.crowdingFrom)}: ${figure(happiness.crowdingWeight)} × (n − ${figure(happiness.crowdingFrom)}) raised to ${figure(happiness.crowdingExponent)}, on top.`,
        },
        {
          text: `The tiers above are capped at ${percentFigure(RULES.meters.tierClamp)} however deep the ladder grows.`,
        },
        {
          text: 'A deficit also stifles growth, on a steeper ladder of its own — it multiplies food *surplus* only, so the worst rung stalls a town and still cannot starve a citizen.',
        },
        ...ladderRows(RULES.meters.growthStifle).map((entry) => ({
          text: `Growth surplus ${entry.label}: ${entry.figures}`,
        })),
      ],
      flavor: 'How the empire feels about what it has taken.',
    },
    {
      id: compendiumId('meter', 'authority'),
      section: 'meter',
      name: 'Authority',
      eyebrow: 'capacity against what is held',
      mark: { kind: 'glyph', glyph: '⚖' },
      rows: [
        { label: 'The palace supplies', figures: signedFigure(authority.palaceCapacity) },
        { label: 'Each era advanced supplies', figures: signedFigure(authority.perAge) },
        { label: 'The capital costs', figures: signedFigure(-authority.capital) },
        { label: 'A city you founded costs', figures: signedFigure(-authority.foundedCity) },
        { label: 'A coastal one costs', figures: signedFigure(-authority.coastalCity) },
        { label: 'One taken by force costs', figures: signedFigure(-authority.capturedCity) },
        ...ladderRows(RULES.meters.tiers),
      ],
      clauses: [
        {
          text: 'The coastal discount is a discount and never an exemption, and a seized harbour is a thing you seized — capture outranks it.',
        },
        ...ladderRows(RULES.meters.borderFreeze).map((entry) => ({
          text: `Border culture ${entry.label}: ${entry.figures}. An empire that has over-reached stops taking ground, and buying it is barred with it.`,
        })),
      ],
      flavor: 'What the writ will bear.',
    },
    {
      id: compendiumId('meter', 'growth'),
      section: 'meter',
      name: 'Growth',
      eyebrow: 'the basket a citizen fills',
      mark: { kind: 'glyph', glyph: YIELD_GLYPH.food },
      rows: [
        { label: 'Each citizen eats', figures: `${figure(cities.foodPerCitizen)}${YIELD_GLYPH.food}` },
        { label: 'The first citizen’s basket', figures: figure(cities.growthBase) },
        { label: 'Linear term', figures: figure(cities.growthLinear) },
        { label: 'Exponent', figures: figure(cities.growthExponent) },
        { label: 'Starves at', figures: figure(cities.starvationShrinksAt) },
      ],
      clauses: [
        {
          text: `The basket a town's first citizen fills holds ${figure(cities.growthBase)}. Each citizen already standing adds ${figure(cities.growthLinear)} to the next one's, and a rising term at the exponent above is added on top — so a small town grows quickly and a large one slowly, which is what keeps happiness a vertical limit rather than a tax.`,
        },
        {
          text: `A basket that falls to ${figure(cities.starvationShrinksAt)} costs the town a citizen. It is emptied either way, and population never falls below the last one.`,
        },
        {
          text: `A town works ${figure(cities.workRadius)} rings of ground, claims ${figure(cities.claimRadius)}, and must stand ${figure(cities.minCitySpacing)} hexes from the next.`,
        },
      ],
      flavor: 'Nothing grows without a surplus, and nothing keeps a surplus without room.',
    },
  ];
}

function tradeEntries(): CompendiumEntry[] {
  const trade = RULES.trade;
  const thirds = RULES.movement.roadCostThirds;
  return [
    {
      id: compendiumId('trade', 'routes'),
      section: 'trade',
      name: 'Caravans',
      eyebrow: 'one route to a partner',
      mark: { kind: 'badge', badge: 'trader' },
      rows: [
        { label: 'A route runs for', figures: `${figure(trade.routeTurns)} turns` },
        { label: 'A partner may be', figures: `${figure(trade.rangeTurns)} turns away` },
        { label: 'Each trading post adds', figures: `${signedFigure(trade.postRangeTurns)} turns` },
        {
          label: `People per ${YIELD_GLYPH.gold}`,
          figures: figure(trade.goldPerCombinedPop),
        },
      ],
      clauses: [
        {
          text: 'The origin is paid and the destination is counted, so a small town sends to the capital and brings the capital’s goods home.',
        },
        {
          text: `A route pays a point of ${YIELD_GLYPH.food} for every food, culture or science building standing at its destination, a point of ${YIELD_GLYPH.production} for every production, military or gold one, and a point of ${YIELD_GLYPH.gold} for every ${figure(trade.goldPerCombinedPop)} people across the two towns.`,
        },
        {
          text: 'Range is measured in turns of the caravan’s own march, so a road extends it and a mountain range shortens it. Both ends become trading posts, permanently.',
        },
        {
          text: 'One route per pair, in either direction, and a route lives on the piece carrying it — killing a laden caravan plunders it.',
        },
      ],
      flavor: 'A road is a promise between two towns.',
    },
    {
      id: compendiumId('trade', 'connections'),
      section: 'trade',
      name: 'City connections',
      eyebrow: 'what a road home is worth',
      mark: { kind: 'glyph', glyph: YIELD_GLYPH.gold },
      rows: [
        {
          label: `People per ${YIELD_GLYPH.gold}`,
          figures: figure(trade.connectionPerPop),
        },
        {
          label: `Road hexes per ${YIELD_GLYPH.gold} of upkeep`,
          figures: figure(trade.roadsPerMaintenance),
        },
      ],
      clauses: [
        {
          text: `Every non-capital city joined to the capital by road pays its empire a point of ${YIELD_GLYPH.gold} for every ${figure(trade.connectionPerPop)} of its people, every turn.`,
        },
        {
          text: 'The fill crosses your own ground and nobody’s, never a rival’s, and a city centre is a junction — the road has only to reach the gates.',
        },
        {
          text: `Upkeep is charged on the roads your own caravans laid: a point of ${YIELD_GLYPH.gold} for every ${figure(trade.roadsPerMaintenance)} hexes of them.`,
        },
      ],
      flavor: null,
    },
    {
      id: compendiumId('trade', 'roads'),
      section: 'trade',
      name: 'Roads',
      eyebrow: 'what a highway costs to walk',
      mark: { kind: 'glyph', glyph: '⌇' },
      rows: [
        {
          label: 'A road step costs',
          figures: `${figure(thirds)} thirds of a point`,
        },
        {
          label: 'Plundering a laden caravan pays',
          figures: tileYieldFigures({
            food: trade.pillageBounty.food,
            production: trade.pillageBounty.production,
            gold: trade.pillageBounty.gold,
          }),
        },
      ],
      clauses: [
        {
          text: 'A road step replaces the ground’s own price rather than discounting it — a wooded hill on a highway is a road, not a cheaper hill.',
        },
        {
          text: 'Caravans lay road under their feet as they walk, and the seat that laid a hex is the seat charged upkeep for it.',
        },
      ],
      flavor: null,
    },
  ];
}

// --- the whole reference ----------------------------------------------------

/**
 * Every section, every entry — the whole book.
 *
 * `state` is optional and changes exactly one figure (see `rosterCost`); the
 * standalone page passes nothing and gets the same book.
 */
export function compendiumSections(state: GameState | null = null): CompendiumSection[] {
  const byId = new Map<CompendiumSectionId, CompendiumEntry[]>();
  for (const [id] of SECTION_NAMES) byId.set(id, []);
  const push = (entry: CompendiumEntry): void => {
    byId.get(entry.section)!.push(entry);
  };

  for (const id of UNIT_TYPE_IDS) push(unitEntry(state, id));
  for (const id of BUILDING_IDS) push(buildingEntry(id));
  for (const id of IMPROVEMENT_IDS) push(improvementEntry(id));
  for (const id of RESOURCE_IDS) push(resourceEntry(id));
  // Age order, then the table's own order inside an age: a reference is read
  // forwards through the tree, which is not the order `techs.json` happens to
  // list its rows in.
  for (const age of [...new Set(TECH_IDS.map((id) => techDef(id).age))].sort((a, b) => a - b)) {
    for (const id of TECH_IDS) if (techDef(id).age === age) push(techEntry(id));
  }
  for (const id of ORDER_IDS) push(orderEntry(id));
  for (const id of DOCTRINE_IDS) push(doctrineEntry(id));
  for (const id of BELIEF_IDS) push(beliefEntry(id));
  for (const id of RITE_IDS) push(riteEntry(id));
  for (const id of GREAT_PERSON_IDS) push(greatPersonEntry(id));
  for (const id of TRIUMPH_IDS) push(triumphEntry(id));
  for (const entry of meterEntries()) push(entry);
  for (const entry of tradeEntries()) push(entry);

  return SECTION_NAMES.map(([id, name]) => ({ id, name, entries: byId.get(id)! }));
}

/**
 * The sections with every entry that does not match `query` removed.
 *
 * A plain substring over the entry's **name**, case-folded — the brief's own
 * rule, and the honest one for an index: a player typing "iron" is looking for a
 * heading, not for every card that mentions iron in a clause. A section that
 * matches nothing keeps its row and comes back empty, so the index never
 * reflows under the cursor.
 */
export function filterSections(
  sections: readonly CompendiumSection[],
  query: string,
): CompendiumSection[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return sections.map((section) => ({ ...section }));
  return sections.map((section) => ({
    ...section,
    entries: section.entries.filter((entry) => entry.name.toLowerCase().includes(needle)),
  }));
}

/** `unit:swordsman` → its section, or `null` for anything that is not an id. */
export function sectionOfId(id: string): CompendiumSectionId | null {
  const head = id.split(':')[0];
  const found = SECTION_NAMES.find(([section]) => section === head);
  return found === undefined ? null : found[0];
}

// --- what the two panes show ------------------------------------------------

/**
 * The whole of the view's state, derived. See `compendiumView`.
 */
export interface CompendiumViewState {
  /** The book with the search applied. Every shelf keeps its row. */
  sections: CompendiumSection[];
  /** The shelf the body is showing. */
  openSection: CompendiumSectionId;
}

/**
 * What the index and the body show, given the book, the search box and whichever
 * shelf the reader last picked.
 *
 * Pure, and split out of the renderer for `offerSpread`'s reason and
 * `tileYieldLines`': this suite has no jsdom, and the half of a screen that can
 * be *quietly wrong* — which shelf is open after a search empties the one you
 * were reading — has to be a function somebody can call.
 *
 * The one rule it carries: a search that empties the open shelf **moves to the
 * first shelf that has something**, rather than leaving the reader looking at a
 * blank page beside an index full of matches. Every shelf keeps its row either
 * way, so the index never reflows under the cursor.
 */
export function compendiumView(
  book: readonly CompendiumSection[],
  query: string,
  openSection: CompendiumSectionId,
): CompendiumViewState {
  const sections = filterSections(book, query);
  const open = sections.find((section) => section.id === openSection);
  if (open !== undefined && open.entries.length > 0) return { sections, openSection };
  const first = sections.find((section) => section.entries.length > 0);
  return { sections, openSection: first?.id ?? openSection };
}

/** What `show(entryId)` does to the view. See `compendiumShow`. */
export interface CompendiumShow {
  openSection: CompendiumSectionId;
  marked: string;
  /**
   * True when the search box has to be emptied for the card to be reachable.
   *
   * A deep link **outranks a filter**: the caller asked for one entry by name,
   * and a search that hid it would be the address failing silently.
   */
  clearSearch: boolean;
}

/**
 * Where a deep link lands: which shelf opens, which card is marked, and whether
 * the search box is in the way.
 *
 * `null` for anything that is not an entry id at all — a stale hash, a section
 * name on its own, somebody's `#top`. The address bar is an open string space
 * and this is the one place that is decided.
 */
export function compendiumShow(
  book: readonly CompendiumSection[],
  query: string,
  entryId: string,
): CompendiumShow | null {
  const section = sectionOfId(entryId);
  if (section === null) return null;
  const shelf = book.find((entry) => entry.id === section);
  if (shelf === undefined || !shelf.entries.some((entry) => entry.id === entryId)) return null;
  const visible = filterSections(book, query)
    .find((entry) => entry.id === section)
    ?.entries.some((entry) => entry.id === entryId);
  return { openSection: section, marked: entryId, clearSearch: visible !== true };
}

// --- the DOM half -----------------------------------------------------------

function element(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The mark, drawn the way its own kind is always drawn. See `CompendiumMark`. */
function markNode(mark: CompendiumMark): HTMLElement {
  if (mark.kind === 'resource') {
    const box = element('span', 'cmp-mark');
    box.append(resourceMarkNode(mark.resource));
    return box;
  }
  if (mark.kind === 'badge') {
    const box = element('span', 'cmp-mark cmp-mark-badge');
    const img = document.createElement('img');
    img.src = `/sprites/icons/${mark.badge}.svg`;
    img.alt = '';
    box.append(img);
    return box;
  }
  const box = element('span', 'cmp-mark');
  setYieldText(box, mark.glyph);
  return box;
}

/** One entry, as a card. The element carries the entry id, and that is the id. */
function entryNode(entry: CompendiumEntry): HTMLElement {
  const card = element('article', 'cmp-entry');
  card.id = entry.id;
  card.dataset.entry = entry.id;

  const head = element('div', 'cmp-entry-head');
  if (entry.mark !== null) head.append(markNode(entry.mark));
  const titles = element('div', 'cmp-entry-titles');
  titles.append(element('p', 'eyebrow cmp-eyebrow', entry.eyebrow));
  titles.append(element('h4', 'cmp-entry-name', entry.name));
  head.append(titles);
  card.append(head);

  if (entry.rows.length > 0) {
    const list = element('ul', 'cmp-rows ledger');
    for (const line of entry.rows) {
      const item = element('li', 'cmp-row');
      item.append(element('span', 'cmp-row-label', line.label));
      const value = element('span', 'cmp-row-value');
      setYieldText(value, line.figures);
      item.append(value);
      list.append(item);
    }
    card.append(list);
  }

  if (entry.clauses.length > 0) {
    const list = element('ul', 'cmp-clauses');
    for (const line of entry.clauses) {
      const item = element(
        'li',
        line.deferred === true
          ? 'cmp-clause cmp-clause-deferred'
          : line.note === true
            ? 'cmp-clause cmp-clause-note'
            : 'cmp-clause',
      );
      setYieldText(item, line.text);
      list.append(item);
    }
    card.append(list);
  }

  if (entry.flavor !== null) card.append(element('p', 'cmp-flavor', entry.flavor));
  return card;
}

/** What a mounted Compendium can be told. Both mounts drive it through this. */
export interface CompendiumView {
  /** Shows the section an entry belongs to, and marks that entry. */
  show(entryId: string | null): void;
  /** Which entry is marked, or `null`. */
  current(): string | null;
  /** Rebuilds off the current state. Cheap; nothing here is stored. */
  refresh(): void;
}

export interface CompendiumViewOptions {
  /** The live game, when there is one. `null` on the standalone page. */
  getState?: () => GameState | null;
  /** Called whenever the marked entry changes — the page writes the hash. */
  onSelect?: (entryId: string) => void;
}

/**
 * Builds the index and the body into `root`, and hands back the controller.
 *
 * The two panes and nothing else: the overlay's chrome (its header, its close
 * button, its Escape) belongs to whoever is mounting, because the two mounts
 * genuinely differ — one is a screen over a board and one is a page in a tab.
 */
export function renderCompendium(
  root: HTMLElement,
  options: CompendiumViewOptions = {},
): CompendiumView {
  const getState = options.getState ?? ((): GameState | null => null);
  root.classList.add('cmp');
  root.replaceChildren();

  const index = element('nav', 'cmp-index');
  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'cmp-search';
  search.placeholder = 'Search the Compendium';
  search.setAttribute('aria-label', 'Search the Compendium');
  search.spellcheck = false;
  index.append(search);
  const sectionList = element('ul', 'cmp-sections');
  index.append(sectionList);
  root.append(index);

  const body = element('div', 'cmp-body');
  root.append(body);

  let sections: CompendiumSection[] = compendiumSections(getState());
  let openSection: CompendiumSectionId = SECTION_NAMES[0]![0];
  let marked: string | null = null;

  function drawIndex(list: readonly CompendiumSection[]): void {
    sectionList.replaceChildren();
    for (const section of list) {
      const item = element('li');
      const button = element('button', 'cmp-section') as HTMLButtonElement;
      button.type = 'button';
      button.dataset.section = section.id;
      button.append(element('span', 'cmp-section-name', section.name));
      button.append(element('span', 'cmp-section-count', figure(section.entries.length)));
      button.disabled = section.entries.length === 0;
      button.classList.toggle('is-current', section.id === openSection);
      button.addEventListener('click', () => {
        openSection = section.id;
        marked = null;
        draw();
      });
      item.append(button);
      sectionList.append(item);
    }
  }

  function drawBody(list: readonly CompendiumSection[]): void {
    body.replaceChildren();
    const section = list.find((entry) => entry.id === openSection);
    if (section === undefined) return;
    body.append(element('h3', 'cmp-body-head', section.name));
    if (section.entries.length === 0) {
      body.append(element('p', 'hint', 'Nothing here answers to that.'));
      return;
    }
    for (const entry of section.entries) {
      const card = entryNode(entry);
      card.classList.toggle('is-current', entry.id === marked);
      body.append(card);
    }
  }

  function draw(): void {
    // Every decision this function makes is `compendiumView`'s; what is left
    // here is turning it into nodes.
    const view = compendiumView(sections, search.value, openSection);
    openSection = view.openSection;
    drawIndex(view.sections);
    drawBody(view.sections);
  }

  search.addEventListener('input', () => {
    marked = null;
    draw();
  });

  function show(entryId: string | null): void {
    if (entryId === null) {
      marked = null;
      draw();
      return;
    }
    const landing = compendiumShow(sections, search.value, entryId);
    if (landing === null) return;
    if (landing.clearSearch) search.value = '';
    openSection = landing.openSection;
    marked = landing.marked;
    draw();
    // The entry id **is** the element id (see `entryNode`), which is the whole
    // of what makes a deep link one lookup rather than a search.
    document.getElementById(landing.marked)?.scrollIntoView({ block: 'start' });
    options.onSelect?.(landing.marked);
  }

  draw();

  return {
    show,
    current: () => marked,
    refresh: () => {
      sections = compendiumSections(getState());
      draw();
    },
  };
}

// --- the overlay ------------------------------------------------------------

export interface Compendium {
  readonly isOpen: boolean;
  /** Opens, at `entryId` when one is named and at the URL hash when it is not. */
  open(entryId?: string): void;
  close(): void;
  toggle(): void;
  dispose(): void;
}

export interface CompendiumOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  trigger?: HTMLElement;
  getState?: () => GameState | null;
  /** Shuts whatever else the HUD has up. The screens' standing contract. */
  onOpen?: () => void;
}

/**
 * The Compendium as a screen: the star chart's class, with the same keyboard
 * contract (`hidden` is the whole of the screen state, Escape closes it, the ×
 * and a click on the ground do the same, opening it closes whatever else was
 * up).
 *
 * Built once and never rebuilt on open, unlike the Statecraft and Religion
 * sheets: nothing on these cards is a fact about a seat or a turn, so there is
 * nothing for an open to re-derive. `refresh` exists for the one figure that
 * could move under a live game (a unit's roster price, if a card ever cheapened
 * one) and is called on open, which costs one pass over the tables.
 */
export function createCompendium(options: CompendiumOptions): Compendium {
  const { overlay, body, closeButton, trigger } = options;
  const view = renderCompendium(body, { getState: options.getState });

  function isOpen(): boolean {
    return !overlay.hidden;
  }

  function setExpanded(): void {
    trigger?.setAttribute('aria-expanded', String(isOpen()));
  }

  /** The entry a `#…` in the address bar names, or `null`. */
  function hashEntry(): string | null {
    const hash = window.location.hash.replace(/^#/, '');
    return hash.length > 0 && sectionOfId(hash) !== null ? hash : null;
  }

  function open(entryId?: string): void {
    options.onOpen?.();
    overlay.hidden = false;
    setExpanded();
    view.refresh();
    const wanted = entryId ?? hashEntry();
    if (wanted !== null && wanted !== undefined) view.show(wanted);
  }

  function close(): void {
    overlay.hidden = true;
    setExpanded();
  }

  function onKey(event: KeyboardEvent): void {
    if (!isOpen()) return;
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
  }

  function onGround(event: MouseEvent): void {
    if (event.target === overlay) close();
  }

  closeButton.addEventListener('click', close);
  overlay.addEventListener('mousedown', onGround);
  window.addEventListener('keydown', onKey, true);
  setExpanded();

  return {
    get isOpen(): boolean {
      return isOpen();
    },
    open,
    close,
    toggle: () => {
      if (isOpen()) close();
      else open();
    },
    dispose: () => {
      closeButton.removeEventListener('click', close);
      overlay.removeEventListener('mousedown', onGround);
      window.removeEventListener('keydown', onKey, true);
    },
  };
}
