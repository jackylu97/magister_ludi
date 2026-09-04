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
 * One voice, and it is the beginner's
 * -----------------------------------
 * The strings this file *composes* around those figures — an eyebrow, a row
 * label, the sentence a presence-is-the-marker field turns into — are held to
 * `compendiumText.ts`'s voice (user ruling, 2026-08-27): plain and matter-of-fact,
 * written for somebody who has never played a game like this, terms explained
 * before they are used, no metaphor and no address. A row label says what the
 * number *is* ("Combat strength", not "Strength"); an eyebrow says what kind of
 * thing the card is ("civilian unit", not "civilian"). What this file may **not**
 * do is restate a describer: `describeCard` is the game's own words and feeds the
 * in-game hover cards too, so where a card says "writ" the Compendium *glosses*
 * the word on its shelf's lead page and leaves the card alone.
 *
 * Every generated shelf opens on a page of prose (`compendiumShelves.ts`) that
 * says what that kind of thing is, how you come by one, and where you use it —
 * the one question a card built out of a data row cannot answer about itself.
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
  ALL_BELIEF_IDS,
  type BeliefId,
  CONSECRATION_IDS,
  type ConsecrationId,
  type ReligionBeliefPool,
  RITE_IDS,
  type RiteId,
  beliefDef,
  beliefPoolOf,
  consecrationDef,
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
import { describeCard, stripRefs, tileConditionWords } from '../sim/statecraft';
import { techRuleClauses } from './techRuleWords';
import {
  type CityScope,
  DOCTRINE_IDS,
  type DoctrineId,
  ORDER_IDS,
  type OrderId,
  type OrderRarity,
  doctrineDef,
  orderDef,
} from '../sim/statecraftData';
import type { GameState } from '../sim/state';
import { gatingTech } from '../sim/tech';
import { TECH_IDS, type TechId, techDef } from '../sim/techData';
import { type TechGift, techGifts } from '../sim/techUnlocks';
import { TILE_YIELD_KEYS, type TileYieldSpec, readTileYield } from '../sim/terrainData';
import { TRIUMPH_IDS, type TriumphId, triumphDef } from '../sim/triumphData';
import {
  UNIT_TYPE_IDS,
  type UnitDef,
  type UnitTypeId,
  isCombatant,
  isExplorer,
  isNaval,
  unitDef,
} from '../sim/unitData';
import { buildingUpkeep, unitUpkeep } from '../sim/upkeep';
import { CARD_LINE_NAME, lineOf } from './cardLine';
import { setDescriptorText } from './keywords';
import { renderPamphletBody } from './pamphlet';
import { SHELF_INTROS } from './compendiumShelves';
import { CONCEPT_ENTRIES, INTRO_ENTRIES } from './compendiumText';
import { HAMMER, YIELD_GLYPH, eraWord, figure, percentFigure, signedFigure } from './figures';
import {
  type BeadCardId,
  BEAD_DECK_AGES,
  BEAD_ENDEAVOUR_IDS,
  BEAD_FEAT_IDS,
  BEAD_GRANT_IDS,
  BEAD_QUEST_IDS,
  BEAD_RECKONING_IDS,
  BEAD_RULES,
  anyBeadDef,
  beadHandSize,
} from '../sim/beadData';
import { BEAD_FAMILY_MARK, deckEraWord } from './beadsScreen';
import { describeBeadBoon } from '../sim/beads';
import { AXIS_MARK, riteGrantWords } from './religionScreen';
import { resourceMarkNode } from './resourceMark';
import { setYieldText } from './yieldMark';

// --- the model --------------------------------------------------------------

/** The shelves, in the order the index lists them. */
export type CompendiumSectionId =
  | 'intro'
  | 'concept'
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
  | 'bead'
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
  /**
   * True for a page of **prose**: `clauses` is paragraphs rather than the card
   * vocabulary's bullet list, and prints as one `<p>` per clause. Two kinds of
   * page set it — the two written shelves (`compendiumText.ts`) and the lead
   * page every generated shelf opens on (`compendiumShelves.ts`) — and it is
   * also what widens the index's search to an entry's own text, which is what a
   * reader typing "pantheon" needs. Every entry built from a data row leaves it
   * unset.
   */
  written?: boolean;
  /**
   * True for the printed pamphlet's one page (`pamphlet.ts`): `clauses` still
   * carries every paragraph so the search reaches the prose, but the card is
   * drawn by `renderPamphletBody` — sections, panels and captions — rather
   * than as the flat paragraphs `written` prints.
   */
  pamphlet?: boolean;
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
  ['intro', 'Introduction'],
  ['concept', 'Concepts'],
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
  ['bead', 'The Bead Race'],
  ['meter', 'The Meters'],
  ['trade', 'Trade'],
];

/** `unit:swordsman`. The one place an entry id is composed. */
export function compendiumId(section: CompendiumSectionId, id: string): string {
  return `${section}:${id}`;
}

/**
 * Where the book opens with no id and no hash to honour — both mounts' default.
 * The Introduction's first page, ahead of whatever the index happens to start
 * with.
 */
export const DEFAULT_ENTRY = compendiumId('intro', 'howToPlay');

/** A row, dropped entirely when it has no figure to carry. */
function row(label: string, figures: string): CompendiumRow[] {
  return figures.length === 0 ? [] : [{ label, figures }];
}

/**
 * What a unit or a building costs to keep, as the shelves print it.
 *
 * `None` rather than an empty string, because `row` drops an empty one and this
 * is the rare figure whose zero is the interesting answer — see the callers.
 */
function upkeepRow(gold: number): string {
  return gold <= 0 ? 'None' : `${figure(gold)}${YIELD_GLYPH.gold}`;
}

/** A tile yield in glyphs — `+2🌾 +1⚙`, or empty when it pays nothing. */
function tileYieldFigures(spec: TileYieldSpec): string {
  const value = readTileYield(spec);
  return TILE_YIELD_KEYS.filter((key) => value[key] !== 0)
    .map((key) => `${signedFigure(value[key])}${YIELD_GLYPH[key]}`)
    .join(' ');
}

/**
 * The Æra a thing belongs to, in the numerals the star chart uses.
 *
 * The table itself moved to `figures.ts` when the Beads screen became the third
 * surface that names an age — this file keeps the name it reads by, and there is
 * still one implementation of the numerals.
 */
const ageWord = eraWord;

/** `Bronze Working`, or empty for a thing the tree gates on nothing. */
function techName(id: TechId | null | undefined): string {
  return id === null || id === undefined ? '' : techDef(id).name;
}

/**
 * "charge" or "charges", off the figure that precedes it.
 *
 * A plural is grammar rather than a claim about the game, so it is composed the
 * same way every other reading of a number here is: from the number. Written as
 * a helper because the alternative — a literal `'1'` to compare against — is the
 * one thing the digit rule forbids, and because "1 charges" shipped for a while.
 */
function plural(count: number, singular: string, many = `${singular}s`): string {
  return Math.abs(count) === 1 ? singular : many;
}

/**
 * "a Landmark", "an Academy" — the indefinite article, off the name.
 *
 * `plural`'s sibling and the same argument: a sentence composed around a data
 * row still has to be grammatical, and "a Academy" is the version that shipped.
 * The vowel test is the crude one on purpose; every name it is asked about is an
 * improvement's, and the table has no "a university" trap in it.
 */
function withArticle(name: string): string {
  return `${'aeiouAEIOU'.includes(name[0] ?? '') ? 'an' : 'a'} ${name}`;
}

/** A list in words, with the last pair joined by `join`. */
function joined(parts: readonly string[], join: string): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(', ')} ${join} ${parts[parts.length - 1]!}`;
}

/** A list in words, with the last pair joined by "and". */
function words(parts: readonly string[]): string {
  return joined(parts, 'and');
}

/**
 * A list of *alternatives*, with the last pair joined by "or".
 *
 * `words`' sibling, and the distinction is a rule rather than a preference:
 * `hillsIf` is a disjunction — `hillsWaived` (`improvements.ts`) returns on the
 * first reason that holds — and printing it with "and" said a farm needed fresh
 * water *and* its own resource to take a hillside, which is twice as strict as
 * the game.
 */
function eitherWords(parts: readonly string[]): string {
  return joined(parts, 'or');
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
  if (def.consecrates === true || def.purges === true) return 'religious';
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
  if (def.foundsCity) out.push({ text: 'Founds a city. The unit is used up doing it.' });
  // Auto-explore (2026-08-30): said off the same kind-not-name test the
  // reducer refuses with (`autoExploreError` in `explore.ts`), so the book and
  // the button cannot drift about who may range ahead.
  if (isCombatant(def) || isExplorer(def)) {
    out.push({
      text: 'Can be set to explore on its own: it seeks out unexplored land until there is none it can reach, and any other order calls it back.',
    });
  }
  if (def.haltsGrowth) {
    out.push({
      text: 'A city stores no food toward its next citizen while one of these is at the front of its build queue.',
    });
  }
  if (
    def.charges !== undefined &&
    def.consecrates !== true &&
    def.greatWork !== true &&
    def.prophesies !== true &&
    def.purges !== true
  ) {
    out.push({
      text: `Carries ${def.charges} work ${plural(def.charges, 'charge')}. Building an improvement spends one or more of them, and the unit is used up when they run out.`,
    });
  }
  if (def.consecrates === true) {
    out.push({
      text: 'One deed, and it uses up the whole unit: perform a rite on a city, or add a belief to your pantheon. Whichever it is, it spends the augur’s whole turn as well.',
    });
  }
  // The **prophet**, and it is `consecrates`' sibling in every respect: a marker
  // on the row rather than a name anything compares against, and a charge count
  // that has to be said in its own vocabulary or it reads as spadework — the
  // clause above it would otherwise claim a prophet digs mines.
  if (def.prophesies === true) {
    out.push({
      text: 'One deed, and it uses up the whole unit: found your religion where it stands, draw another belief for a religion you already have, proclaim your faith over the land around it, or give one of your religion’s pools back to be drawn again.',
    });
    out.push({
      text: 'Founding raises the holy site that anchors the faith, out of the gods you already keep, and opens two belief drafts — the second offered the moment the first is answered. Later prophets fill the follower beliefs first and the enhancer beliefs after them, and the enhancers wait on a technology.',
    });
  }
  // The **inquisitor**, `prophesies`' third sibling: a marker on the row, and a
  // charge that is neither spadework nor a rite.
  if (def.purges === true) {
    out.push({
      text: 'One deed, and it uses up the whole unit: the purge. Every rival faith loses the pressure it has banked on every town nearby, and where that is not enough, believers of those faiths are turned back to following nothing at all. The faith your own realm keeps is spared.',
    });
    out.push({
      text: 'While it stands, friendly units on the hexes beside it fight harder. A second inquisitor beside the same soldiers adds nothing.',
    });
  }
  if (def.greatWork === true) {
    out.push({
      text: 'Great people are not built and not bought. They are recruited with renown.',
    });
    out.push({
      text: 'Use it once for its family’s immediate effect, or have it build its family’s special improvement. Either way the unit is used up.',
    });
  }
  if (def.trades === true) {
    out.push({
      text: 'Select it and choose Start route. Pick any available route in the Trade screen; the trader moves to the origin city and begins. It builds road on every hex it walks over.',
    });
  }
  if (def.ignoresTerrainCost === true) {
    out.push({ text: 'Rough ground does not slow it: every hex it can enter costs it the same.' });
  }
  /**
   * The ship's clauses, in the order a player meets them: where it may be, then
   * what its own line does that the others do not.
   *
   * Every one is asked of a **marker on the row** rather than of a class name —
   * `isNaval`, `hitAndRun`, `blockades`, `bombard` — so a thirteenth hull is a
   * JSON row here as everywhere else, and the words are the plain ones (hard
   * rule 7): a *ship*, the *coast*, a *harbour*, never "naval", "hull class" or
   * "blockade radius". Numbers stay out of the prose and are on the rows above.
   */
  if (isNaval(def)) {
    out.push({
      text: 'A ship. It sails on the coast and can come ashore only in one of your own cities that stands on the coast, where it can be built and where it can rest.',
    });
    out.push({
      text: 'It shares a hex with one land unit at sea — the unit it is escorting — and never with another ship.',
    });
  }
  if (def.hitAndRun === true) {
    out.push({
      text: 'Attacking does not end its turn: it pays a little movement for the blow and can sail away with the rest. It still attacks only once a turn.',
    });
    out.push({
      text: 'A land unit sharing its hex out at sea defends with this ship’s strength instead of its own.',
    });
  }
  if (def.blockades === true) {
    out.push({
      text: 'Standing beside a friendly ship of its own kind makes both of them stronger, up to a limit.',
    });
    out.push({
      text: 'Sitting in the mouth of an enemy harbour closes it: the city is cut off as though an army stood around it, and its trade routes pay nothing while the ship is there.',
    });
  }
  if (def.bombard === true) {
    out.push({
      text: 'Built to batter walls. It is worth more attacking a city than anything else, and it can knock the walls down from a distance without being struck back.',
    });
  }
  if (def.awaitsTech === true) {
    out.push({
      text: 'Nothing you can research reaches this yet. It cannot be built or bought.',
    });
  }
  if (def.requiresResource !== undefined) {
    out.push({
      text: `Your empire must control improved ${resourceDef(def.requiresResource).name} to build one.`,
    });
  }
  if (def.minCityPop > 0) {
    out.push({
      text: `Only a city of ${def.minCityPop} or more citizens can build one.`,
    });
  }
  if (def.upgradesTo !== undefined) {
    out.push({
      text: `Upgrades to a ${unitDef(def.upgradesTo).name} once you research the technology that unlocks one.`,
    });
    // The other half of the same rule, and the half a player planning a queue
    // needs: the older piece is not merely surpassed, it leaves the build list
    // the moment the better one can actually be fielded. Said in the successor's
    // own terms rather than as a rule about lists, and the strategic-resource
    // exception is said here too because it is the one thing that keeps the old
    // row on offer (`buildError`, `upgradeTargetForType`).
    const wants = unitDef(def.upgradesTo).requiresResource;
    out.push({
      text:
        wants === undefined
          ? `Once you can build the ${unitDef(def.upgradesTo).name}, this is no longer offered.`
          : `Once you can build the ${unitDef(def.upgradesTo).name}, this is no longer offered — until then, with no improved ${resourceDef(wants).name} to hand, it stays on the list.`,
    });
  }
  if (def.purchase !== undefined) {
    // `exclusive` is the clause `buildError` actually enforces ("not built —
    // bought"), so the sentence that says a queue will refuse one is written
    // only where the sim refuses one. A row that merely names a second bank
    // still gets the first half, which is all that is true of it.
    out.push({
      text:
        def.purchase.exclusive === true
          ? `Bought in a city with ${def.purchase.currency}. It cannot be put in a build queue and cannot be bought with gold.`
          : `Can be bought in a city with ${def.purchase.currency}.`,
    });
  }
  return out;
}

function unitEntry(state: GameState | null, type: UnitTypeId): CompendiumEntry {
  const def = unitDef(type);
  const gate = gatingTech('unit', type);
  // Two rows have no production price to print, and for the same reason in both
  // cases: `buildError` refuses the queue. A great person is recruited with
  // renown, and a unit whose roster row names its own bank exclusively (the
  // augur's faith) is bought or not at all — a hammer figure beside either would
  // be the card promising a queue row the reducer will not take.
  const unbuildable = def.greatWork === true || def.purchase?.exclusive === true;
  const priced = unbuildable ? '' : `${figure(rosterCost(state, type))}${YIELD_GLYPH.production}`;
  const rows: CompendiumRow[] = [
    ...row('Combat strength', def.combatStrength > 0 ? figure(def.combatStrength) : ''),
    ...row(
      'Ranged strength',
      def.rangedStrength === undefined
        ? ''
        : `${figure(def.rangedStrength)} at a range of ${figure(def.range ?? 0)}`,
    ),
    ...row('Movement points', figure(def.movement)),
    ...row('Sight in hexes', figure(def.sight)),
    ...row('Health', figure(def.maxHp)),
    ...row('Production cost', priced),
    ...row(
      'Purchase cost',
      def.purchase === undefined ? '' : `${figure(def.purchase.cost)} ${def.purchase.currency}`,
    ),
    // Always a row, and `None` rather than an omission (Entry XLI). The other
    // rows in this table are dropped when they are empty because an absent
    // figure means "this is not that kind of unit"; an absent upkeep would mean
    // the book forgot, and "a scout costs nothing to keep" is one of the more
    // useful sentences on the shelf.
    ...row('Upkeep each turn', upkeepRow(unitUpkeep(type))),
    ...row('Unlocked by', techName(gate)),
  ];
  const clauses = unitMarkers(def);
  if (!unbuildable) {
    clauses.push({
      text:
        'This is the price on the roster, and a city may pay more than it. Each settler costs ' +
        'more than the last one you built, units of a later age cost more, and some cards ' +
        'change the price. The city screen shows the figure your city will actually pay.',
      note: true,
    });
  }
  return {
    id: compendiumId('unit', type),
    section: 'unit',
    name: def.name,
    eyebrow: `${def.category} unit`,
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
 * A site requirement in words a reader has met before.
 *
 * One branch per `CityScope`, because the scope's own test *name* is not a
 * sentence: `onTerrain` said "on terrain" and dropped the terrain, which is the
 * word that mattered. A composite names each of its parts, which is the only
 * reading that stays honest when a row asks for two things at once.
 * `siteWords` in `tech.ts` is the sim's version of this and is not exported —
 * see the report; what it says is the *refusal* ("The Colossus wants a
 * harbour"), and a reference card wants the requirement rather than the excuse.
 */
function scopeWords(site: CityScope): string {
  // A callback rather than a `$1` replacement, for the reason the whole module
  // exists: `test/ui/compendium.test.ts` refuses a digit in any string this file
  // prints from, and a back-reference is a digit in a string. It is the fallback
  // for a scope this switch has not been taught, so a shape added to `CityScope`
  // degrades to its own name rather than to silence.
  const named = (test: string): string =>
    test.replace(/[A-Z]/g, (letter) => ` ${letter}`).toLowerCase();
  switch (site.test) {
    case 'coastal':
      return 'a coastal city';
    case 'freshwater':
      return 'a city beside fresh water';
    case 'notFreshwater':
      return 'a city not beside fresh water';
    case 'mountainAdjacent':
      return 'a city next to a mountain';
    case 'frontier':
      return 'a city with another empire’s land nearby';
    case 'captured':
      return 'a city you captured';
    case 'capital':
      return 'your capital';
    case 'populationAtLeast':
      return `a city of ${figure(site.value)} or more citizens`;
    case 'populationAtMost':
      return `a city of ${figure(site.value)} or fewer citizens`;
    case 'adjacentImprovement':
      return `a city next to ${withArticle(improvementDef(site.improvement).name)}`;
    case 'holding':
      return `a city that controls ${words(site.resources.map((id) => resourceDef(id).name))}`;
    case 'holdingCategory':
      return `a city that controls a ${site.category} resource`;
    case 'hasBuilding':
      return `a city with a ${buildingDef(site.building).name}`;
    case 'onTerrain':
      return `a city built on ${site.terrain}`;
    // `all` is the only composite the scope vocabulary has, deliberately — see
    // `CityScope`. So one branch covers every conjunction a row can carry.
    case 'all':
      return words(site.of.map(scopeWords));
    default:
      return named((site as { test: string }).test);
  }
}

function siteRequirement(def: BuildingDef): string {
  return def.requiresSite === undefined ? '' : scopeWords(def.requiresSite);
}

/**
 * Every technology that later improves **this building**, said in the star
 * chart's own words and named by the node that hands it over.
 *
 * The inverse of `techGifts`, walked rather than kept in a second table: the
 * tree is written forwards because that is how a designer reads it, and the
 * question a building's shelf asks ("what does anybody ever do for me?") is the
 * other way round. `TECH_IDS` order, so two buildings improved by the same node
 * list it at the same point and a reader comparing them is comparing like with
 * like.
 *
 * One gift kind qualifies since the renewals axe (2026-09-04): the tile line
 * that pays the *ground the city works* more. A `buildingRenewal` that paid the
 * city's own totals stood beside it until the user ruled that free growth dead.
 * The clause is `giftWords`' sentence with the naming technology in front,
 * because "when" is the whole of what a reader wants and the gift itself cannot
 * say it.
 */
function laterGifts(id: BuildingId): CompendiumClause[] {
  const clauses: CompendiumClause[] = [];
  // The lines this building pays on the ground **from the day it is raised**.
  // No technology hands these over, so `techGifts` never sees them and nothing
  // anywhere printed the figure — the Lighthouse's food on water was a sentence
  // in its `note` and a number in the simulation, with nothing joining them.
  // Worded through the same describer the gated ones use, by handing it the
  // gift shape it already words.
  for (const line of buildingDef(id).tileYields ?? []) {
    if (line.requiresTech !== undefined) continue;
    clauses.push({
      text: giftWords({
        kind: 'buildingTileYield',
        id,
        name: buildingDef(id).name,
        glyph: '▣',
        add: line.add,
        on: line.on,
      }),
    });
  }
  for (const tech of TECH_IDS) {
    for (const gift of techGifts(tech)) {
      if (gift.kind !== 'buildingTileYield') continue;
      if (gift.id !== id) continue;
      clauses.push({ text: `${techDef(tech).name}: ${giftWords(gift)}` });
    }
  }
  return clauses;
}

function buildingEntry(id: BuildingId): CompendiumEntry {
  const def = buildingDef(id);
  const wonder = isWonder(id);
  const gate = gatingTech('building', id);
  const rows: CompendiumRow[] = [
    ...row('Production cost', `${figure(def.cost)}${YIELD_GLYPH.production}`),
    ...row('Yields each turn', buildingYieldFigures(def)),
    ...row(
      'Science per citizen',
      def.sciencePerPop === 0 ? '' : `${figure(def.sciencePerPop)}${YIELD_GLYPH.science}`,
    ),
    ...row('Trade route slots', def.routeSlots === undefined ? '' : signedFigure(def.routeSlots)),
    ...row(
      'Production bonus',
      def.productionBonus === undefined
        ? ''
        : `${percentFigure(def.productionBonus.percent)} toward ${def.productionBonus.category}s`,
    ),
    ...row(
      'Renown',
      def.renown === undefined
        ? ''
        : words([
            `${signedFigure(def.renown.perTurn)} per turn`,
            ...(def.renown.onComplete === undefined
              ? []
              : [`${signedFigure(def.renown.onComplete)} when it is finished`]),
          ]),
    ),
    ...row('Renown counts toward', def.renown?.family ?? ''),
    // The unit shelf's row, one grade over. A wonder reads `None` here on
    // purpose: a marvel is not a payroll, and that is a design decision worth
    // printing rather than a gap.
    ...row('Upkeep each turn', upkeepRow(buildingUpkeep(id))),
    ...row('Can only be built in', siteRequirement(def)),
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
          ? `${signedFigure(stat.amount)} to the city’s defence strength`
          : `${signedFigure(stat.amount)} to how far the city sees`,
    });
  }
  // **What technologies later do for this building**, which is the half of a
  // building the tech card stopped telling (the playtest notes, 2026-09-03: the
  // star chart's "Buildings pay new ground" heading was a fact about a harbour
  // filed under a technology). The one kind of later gift left — the line that
  // pays the building's *ground* more — is read out of `techGifts` and worded by
  // `giftWords`, the star chart's own describer, so this shelf cannot come to
  // disagree with that card about the same row.
  clauses.push(...laterGifts(id));
  if (def.note !== undefined) clauses.push({ text: def.note, note: true });
  if (wonder) {
    clauses.push({
      text: 'Only one player in the game can build this, and it cannot be bought with gold.',
      note: true,
    });
  }
  // The two endgame markers, in a first-time player's words. Read off the row
  // rather than written into each note, so a fifth capstone says the same thing
  // without anybody remembering to type it again.
  if (def.oncePerEmpire === true) {
    clauses.push({ text: 'You may have only one of these, in one of your cities.', note: true });
  }
  if (def.worldUnlockTech !== undefined) {
    clauses.push({
      text: `Nobody can begin one until some empire in the world has researched ${techDef(def.worldUnlockTech).name}. After that, everybody can.`,
      note: true,
    });
  }
  // The dry-settle ruling's other half, read off the row rather than written
  // into the aqueduct's note: a town away from fresh water grows slowly until
  // something waters it, and the day a second row waters one it says this
  // without anybody remembering to type it again.
  if (def.waters === true) {
    clauses.push({
      text: 'A city that is not beside fresh water grows more slowly until this is built in it.',
      note: true,
    });
  }
  if (def.acceptsContributions === true) {
    clauses.push({
      text: 'While this is at the front of a city’s build list, you may pour gold or faith into it to hurry it along.',
      note: true,
    });
  }
  if (def.endsTheGame === true) {
    clauses.push({
      text: 'Finishing it ends the game: the last measures of the age are taken, and whoever holds the most beads wins — a tie going to whoever raised it.',
      note: true,
    });
  }
  return {
    id: compendiumId(wonder ? 'wonder' : 'building', id),
    section: wonder ? 'wonder' : 'building',
    name: def.name,
    eyebrow: `${def.category} ${wonder ? 'wonder' : 'building'}`,
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
    ...row('Adds to the hex', tileYieldFigures(def.yields)),
    ...row('Work charges used', figure(def.chargeCost)),
    ...row('Unlocked by', techName(def.requiresTech)),
    ...row('Terrain', eitherWords((def.validTerrain ?? []).map((terrain) => terrain))),
    ...row(
      'Terrain, beside fresh water',
      eitherWords((def.freshwaterTerrain ?? []).map((terrain) => terrain)),
    ),
    ...row('Features', eitherWords((def.validFeatures ?? []).map((feature) => feature))),
    ...row(
      'Flat or hills',
      def.requiresHills === undefined ? '' : def.requiresHills ? 'hills' : 'flat',
    ),
    ...row(
      'Gives access to',
      words((def.improvesResource ?? []).map((resource) => resourceDef(resource).name)),
    ),
    ...row(
      'Defence for units on it',
      def.defense === undefined ? '' : signedFigure(def.defense),
    ),
    ...row('Built by', def.greatPerson ?? ''),
  ];
  const clauses: CompendiumClause[] = [];
  if (def.hillsIf !== undefined && def.hillsIf.length > 0) {
    clauses.push({
      text: `Hills are allowed where the hex ${eitherWords(
        def.hillsIf.map((why) =>
          why === 'freshwater'
            ? 'is beside fresh water'
            : 'carries a resource this improvement gives access to',
        ),
      )}.`,
    });
  }
  if (def.requiresResource !== undefined && def.requiresResource.length > 0) {
    clauses.push({
      text: `Can only be built on ${eitherWords(
        def.requiresResource.map((resource) => resourceDef(resource).name),
      )}.`,
    });
  }
  if (def.adjacentImprovement !== undefined) {
    const near = def.adjacentImprovement;
    clauses.push({
      text: `Can also be built on ${eitherWords(near.terrain.map((terrain) => terrain))} when a hex next to it already has ${withArticle(improvementDef(near.improvement).name)}.`,
    });
  }
  if (def.clearsClutter) {
    clauses.push({ text: 'Clears the loose plants and stones drawn on the hex.' });
  }
  if (def.claimsNeighbours === true) {
    clauses.push({ text: 'Claims the hex it stands on and every hex next to it for your empire.' });
  }
  if (def.greatPerson !== undefined) {
    // **`greatPerson` names the family, and the family is not always a great
    // person's.** Since the prophet joined that field (`WorkFamily`), the flat
    // sentence would have claimed a holy site is built by a scholar — so the
    // hand is read off the row rather than assumed, exactly as the sim reads it
    // (`plantingHandOf`).
    clauses.push({
      text:
        def.greatPerson === 'prophet'
          ? 'Only a prophet can plant this, and a prophet can build nothing else.'
          : 'Only a great person can build this, and a great person can build nothing else.',
      note: true,
    });
  }
  // The halves this row's design has and the game does not, struck through, the
  // way a card's are (`CardDefBase.deferred`). Last, because a reader wants what
  // the thing *does* before what it does not do yet.
  for (const waiting of def.deferred ?? []) clauses.push({ text: waiting, deferred: true });
  return {
    id: compendiumId('improvement', id),
    section: 'improvement',
    name: def.name,
    eyebrow:
      def.greatPerson === undefined ? 'improvement' : 'improvement built by a great person',
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
    ...row('Adds to the hex', tileYieldFigures(def.yields)),
    ...row('Terrain', eitherWords(def.validTerrain.map((terrain) => terrain))),
    ...row('Features', eitherWords((def.validFeatures ?? []).map((feature) => feature))),
    ...row('Flat or hills', def.hills === undefined ? '' : def.hills ? 'hills' : 'flat'),
    ...row('Revealed by', techName(def.requiresTech)),
    ...row('Needs improvement', opener === null ? '' : improvementDef(opener).name),
  ];
  const clauses: CompendiumClause[] = describeResourceSignature(id).map((line) => ({
    text:
      line.fromAge === undefined
        ? line.text
        : `${line.text} — from ${ageWord(line.fromAge)} onward`,
  }));
  if (def.requiresTech !== undefined) {
    clauses.push({
      text:
        'Until you have researched the technology above, this resource is invisible to you: ' +
        'it is not drawn on the map, the hex is not paid for it, and it cannot be used.',
      note: true,
    });
  }
  return {
    id: compendiumId('resource', id),
    section: 'resource',
    name: def.name,
    eyebrow: `${def.kind} resource`,
    mark: { kind: 'resource', resource: id },
    rows,
    clauses,
    flavor: null,
  };
}

// --- technologies -----------------------------------------------------------

/** One gift of a technology, in the words the star chart's own card uses. */
function giftWords(gift: TechGift): string {
  if (gift.kind === 'unit') {
    // Priced out of the bank that actually buys one. A row that names its own
    // bank exclusively is never built (`buildError`), and its `cost` field is a
    // zero nobody pays — printing it as a hammer figure told a reader the augur
    // was free.
    const def = unitDef(gift.id);
    const price =
      def.purchase !== undefined && def.purchase.exclusive === true
        ? `${figure(def.purchase.cost)} ${def.purchase.currency}`
        : `${figure(def.cost)}${YIELD_GLYPH.production}`;
    return `New unit: ${gift.name} — ${price}`;
  }
  if (gift.kind === 'building') {
    // The tree hands wonders over on the same list as ordinary buildings, and a
    // reader deciding what to research wants to know which is which: one is a
    // thing every city may raise and the other is a race against the world.
    const kind = isWonder(gift.id) ? 'New wonder' : 'New building';
    return `${kind}: ${gift.name} — ${figure(buildingDef(gift.id).cost)}${YIELD_GLYPH.production}`;
  }
  if (gift.kind === 'improvement') {
    const charges = improvementDef(gift.id).chargeCost;
    return `New improvement: ${gift.name} — ${figure(charges)} work ${plural(charges, 'charge')}`;
  }
  if (gift.kind === 'reveal') return `Reveals the resource ${gift.name} on the map`;
  if (gift.kind === 'renewal') {
    return `${gift.name} improvements you already have now add ${tileYieldFigures({
      food: gift.add.food ?? 0,
      production: gift.add.production ?? 0,
      gold: gift.add.gold ?? 0,
      science: gift.add.science,
      culture: gift.add.culture,
      faith: gift.add.faith,
    })}`;
  }
  if (gift.kind === 'buildingTileYield') {
    // **Which** hexes, said by the card's own describer (`tileConditionWords`,
    // `statecraft.ts`) rather than as "certain hexes" — the reader of a
    // building's shelf is asking exactly that question, and a second wording of
    // the same conditions is the drift this module exists to avoid.
    return `${gift.name} buildings now add ${tileYieldFigures({
      food: gift.add.food ?? 0,
      production: gift.add.production ?? 0,
      gold: gift.add.gold ?? 0,
      science: gift.add.science,
      culture: gift.add.culture,
      faith: gift.add.faith,
    })} to every ${tileConditionWords(gift.on)} the city works`;
  }
  if (gift.kind === 'project') return `New city project: ${gift.name}`;
  // A node's own rules (`TechDef.effects`, the tree pass of 2026-08-30). Said in
  // the vocabulary every other card is said in — `describeCard` answers for a
  // technology now, because a technology **is** a card — rather than in a second
  // table of words that could disagree with the star chart's.
  if (gift.kind === 'techEffect') {
    // **The same words the star chart's card prints**, from the same function
    // (`techRuleClauses`), which is the whole reason that function is not
    // written inside either surface: a node whose rules read one way on the
    // hover card and another way on this shelf is the second vocabulary this
    // module exists to prevent. One clause per entry — the caller splits them
    // into their own lines, exactly as the card does.
    const said = techRuleClauses(gift.id);
    return said.length > 0 ? said.join(' ') : `Changes the rules: ${gift.name}`;
  }
  return `New ability: ${gift.name}`;
}

function techEntry(id: TechId): CompendiumEntry {
  const def = techDef(id);
  const rows: CompendiumRow[] = [
    ...row('Research cost', `${figure(def.cost)}${YIELD_GLYPH.science}`),
    ...row('Requires first', words(def.prereqs.map((prereq) => techDef(prereq).name))),
  ];
  // **A node's own rules are one clause each**, exactly as they are on the star
  // chart's card (the playtest notes, 2026-09-03). `techRuleClauses` already
  // returns them split at the boundaries their author wrote, so the shelf lays
  // them out rather than joining them back into a paragraph the card refuses to
  // print. Every other gift is one clause, as it always was.
  const clauses: CompendiumClause[] = techGifts(id).flatMap((gift) =>
    gift.kind === 'techEffect'
      ? techRuleClauses(gift.id).map((text) => ({ text }))
      : [{ text: giftWords(gift) }],
  );
  if (clauses.length === 0) {
    clauses.push({ text: 'Unlocks nothing by itself. It is a step toward later technologies.' });
  }
  return {
    id: compendiumId('tech', id),
    section: 'tech',
    name: def.name,
    eyebrow: `${ageWord(def.age)} technology`,
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

/**
 * The named line a card belongs to, or nothing.
 *
 * `'none'` is a card that joins no line (see `CARD_LINE_NAME`), and a row
 * reading "no line" is a row that has told the reader nothing — so the line is
 * simply absent from a neutral card, the way every other empty figure here is.
 */
function lineRow(def: Parameters<typeof lineOf>[0]): CompendiumRow[] {
  const line = lineOf(def);
  return row('Card line', line === 'none' ? '' : CARD_LINE_NAME[line]);
}

/**
 * The three rungs in a first-time player's words.
 *
 * `OrderDef.rarity`'s own names are the draw's, and "common" is a word that
 * reads as a judgement about a card rather than a statement about a deck — so
 * the shelf says what the weight *does* instead. Nothing here invents a figure:
 * the exact weights are a balance dial (`rarityWeights`), and a card that
 * printed one would be a card that lies the day it is retuned.
 */
const RARITY_WORDS: Record<OrderRarity, string> = {
  common: 'often',
  uncommon: 'less often',
  rare: 'seldom',
};

function orderEntry(id: OrderId): CompendiumEntry {
  const def = orderDef(id);
  return {
    id: compendiumId('order', id),
    section: 'order',
    name: def.name,
    eyebrow: `${def.slot} order`,
    mark: { kind: 'glyph', glyph: '❧' },
    rows: [
      ...row('Slot it fits', def.slot),
      ...row('Draft pool', def.pool),
      // **How often it turns up** (the levelling ruling of 2026-09-04). A draft
      // weighs its bag by this and by nothing else, and passing on a hand
      // raises what the next one is likely to hold — so a player who is told
      // the pass buys rarer cards has to be able to find out which cards those
      // are. One word, off the row, in the draw's own vocabulary.
      ...row('How often it is dealt', RARITY_WORDS[def.rarity]),
      ...lineRow(def),
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
    eyebrow: 'doctrine',
    mark: { kind: 'glyph', glyph: '✦' },
    rows: [...row('Government tier', figure(def.tier)), ...lineRow(def)],
    clauses: cardClauses(id, def.note),
    flavor: def.flavor.length === 0 ? null : def.flavor,
  };
}

/**
 * What each of the three pools is called on a card's eyebrow, and who a belief
 * drawn from it pays.
 *
 * A belief is one id space across three bags (`BeliefId`), and *which bag* is
 * the only thing about a belief a reader cannot work out from its clauses: the
 * three are drawn by different agents, at different moments, and — the part that
 * matters — **paid to different people**. A god pays the empire that keeps it; a
 * follower belief applies in every city that follows the faith and pays whoever
 * owns that city, a rival included; an enhancer pays whoever holds the faith's
 * holy city. A shelf that printed all three under one word would be hiding the
 * one distinction the pools exist for.
 */
const BELIEF_POOL_WORD: Readonly<Record<'pantheon' | ReligionBeliefPool, string>> = {
  pantheon: 'a god — pays the empire that keeps it',
  follower: 'follower belief — applies in every city that follows',
  enhancer: 'enhancer belief — bends how a faith spreads, and pays its holy city',
};

function beliefEntry(id: BeliefId): CompendiumEntry {
  const def = beliefDef(id);
  return {
    id: compendiumId('belief', id),
    section: 'belief',
    name: def.name,
    // `beliefPoolOf` is the data's own answer — `null` for the pantheon — so a
    // row moved between bags moves its eyebrow with it.
    eyebrow: BELIEF_POOL_WORD[beliefPoolOf(id) ?? 'pantheon'],
    mark: { kind: 'glyph', glyph: AXIS_MARK[def.axis].glyph },
    rows: [],
    clauses: cardClauses(id, def.note),
    flavor: def.flavor.length === 0 ? null : def.flavor,
  };
}

/**
 * One cathedral patron (design ledger Entry LV).
 *
 * On the beliefs shelf rather than on a shelf of its own, for that shelf's own
 * stated reason: a consecration is a card of the same vocabulary out of the same
 * data file, read by the same describer, and the **eyebrow** is what says which
 * bag a row came from. Five rows do not earn a shelf; what they earn is a word
 * that says how they are acquired, because that is the one thing about a
 * consecration a reader cannot work out from its clauses — you do not choose it.
 *
 * Every printed word is the row's own (`cardClauses` over `anyCardDef`), exactly
 * as a belief's is: no hand-written prose about a number.
 */
function consecrationEntry(id: ConsecrationId): CompendiumEntry {
  const def = consecrationDef(id);
  return {
    id: compendiumId('belief', id),
    section: 'belief',
    name: def.name,
    eyebrow: 'consecration — rolled when a cathedral is finished',
    mark: { kind: 'glyph', glyph: '☩' },
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
    eyebrow: 'rite',
    mark: { kind: 'glyph', glyph: '☩' },
    rows: [
      // **A redraw is performed on nothing standing anywhere.** Its row carries
      // `target: 'here'` because that is the shape for "no hex", and printing
      // that word would tell a reader to walk somewhere. What it acts on is the
      // pantheon, so that is what the row says. Every other rite answers off the
      // data as before.
      ...row('Performed on', def.redraws === undefined ? def.target : 'your pantheon'),
      ...row('Duration', def.duration === undefined ? '' : `${figure(def.duration)} turns`),
      ...row('Unlocked by', techName(def.tech)),
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
    return `Use it once: it adds ${figure(great.actGainTurns)} turns of your empire’s science to the technology you are researching.`;
  }
  if (family === 'engineer') {
    return `Use it once: it adds ${figure(great.engineerHammers)}${YIELD_GLYPH.production} to a city’s production, multiplied by the age your empire has reached — and it grows with every technology you research.`;
  }
  if (family === 'merchant') {
    return `Use it once: it adds ${figure(great.merchantGold)}${YIELD_GLYPH.gold} to your treasury, multiplied by the age your empire has reached — and it grows with every technology you research.`;
  }
  if (family === 'artist') {
    return `Use it once: it adds ${figure(great.actGainTurns)} turns of your empire’s culture toward your next draft, and gives the city ${signedFigure(great.artistHappiness)} happiness for ${figure(great.artistTurns)} turns.`;
  }
  return `Use it once: every unit within ${figure(great.generalRadius)} hexes gains ${signedFigure(great.generalCombat)} combat strength for ${figure(great.generalTurns)} turns.`;
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
  if (work.length > 0) {
    clauses.push({
      text: `Or send it to a hex to build ${withArticle(work)}, which also uses it up.`,
    });
  }
  clauses.push(...cardClauses(id));
  // The kernel is **biography, not a rule**, and a note clause in the rules
  // column reads as a footnote to one (copy pass, 2026-08-28). The two words in
  // front are the whole of the fix — the same argument as the flavour label,
  // for a line that is not quite flavour either.
  clauses.push({ text: `Who they were: ${def.kernel}`, note: true });
  return {
    id: compendiumId('greatPerson', id),
    section: 'greatPerson',
    name: def.name,
    eyebrow: `${def.family}, ${ageWord(def.age)}`,
    mark: { kind: 'badge', badge: 'greatPerson' },
    rows: [...row('Strength rating', def.tier)],
    clauses,
    flavor: def.epigram.length === 0 ? null : def.epigram,
  };
}

// --- triumphs ---------------------------------------------------------------

/** How often a triumph may be earned. */
const SCOPE_WORD: Record<string, string> = {
  once: 'earned once per game',
  perAge: 'earned once per age',
  contested: 'earned once per age, by the first player only',
  perEvent: 'earned every time',
};

function triumphEntry(id: TriumphId): CompendiumEntry {
  const def = triumphDef(id);
  const clauses: CompendiumClause[] = [];
  // **What earned it, first**, and it is the row's own sentence rather than one
  // written here — `TriumphDef.text`, the same line the Triumph sheet prints, so
  // the card that announces one and the shelf that lists them cannot say two
  // different things about the same trigger (user ruling, 2026-08-28).
  clauses.push({ text: def.text });
  if (def.deferred !== undefined) clauses.push({ text: def.deferred, deferred: true });
  return {
    id: compendiumId('triumph', id),
    section: 'triumph',
    name: def.name,
    eyebrow: SCOPE_WORD[def.scope] ?? def.scope,
    mark: { kind: 'glyph', glyph: '✵' },
    rows: [
      ...row('Renown awarded', signedFigure(def.pays)),
      ...row('Renown counts toward', def.family ?? ''),
    ],
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
        ? `At ${signedFigure(step.whenAtOrAbove)} or more`
        : step.whenAtOrBelow !== undefined
          ? `At ${signedFigure(step.whenAtOrBelow)} or less`
          : `Below ${signedFigure(step.whenBelow ?? 0)}`,
    figures: percentFigure(step.percent),
  }));
}

// --- the Bead Race ----------------------------------------------------------

/**
 * The rules of the race, from the rules row and nowhere else.
 *
 * The threshold and the two hand sizes are the only figures the Bead Race has
 * that are not on a card, and they are exactly the two a player needs before any
 * card means anything. Read off `BEAD_RULES` so a retuned threshold rewrites this
 * page and no prose above it.
 */
function beadRulesEntry(): CompendiumEntry {
  return {
    id: compendiumId('bead', 'rules'),
    section: 'bead',
    name: 'The rules of the race',
    eyebrow: 'the reckoning',
    mark: { kind: 'glyph', glyph: '◉' },
    rows: [
      { label: 'Beads that win the game', figures: figure(BEAD_RULES.threshold) },
      ...BEAD_DECK_AGES.map((age) => ({
        label: `Cards on the table in ${deckEraWord(age)}`,
        figures: figure(beadHandSize(age)),
      })),
      { label: 'Turns between deals', figures: figure(BEAD_RULES.dealEveryTurns) },
    ],
    clauses: [
      {
        text: 'The last bead of all is golden, and only the Magnum Opus mints it. Its slot sits empty on every rod for the whole game.',
      },
      {
        text: 'A hand is a set of open slots. When a card is claimed it leaves the table, and the deck fills the gap on the next deal.',
      },
    ],
    flavor: null,
  };
}

/** One bead card — a feat, a race project, a quest, a reckoning or a reward. */
function beadEntry(id: BeadCardId): CompendiumEntry {
  const { kind, def } = anyBeadDef(id);
  const age = 'age' in def && typeof def.age === 'number' ? def.age : null;
  const boon = 'boon' in def ? def.boon : undefined;
  const family = BEAD_FAMILY_MARK[def.family];
  const clauses: CompendiumClause[] = [{ text: def.text }];
  // A reward has no deed, so its own sentence leads: what hands it over.
  if ('source' in def && typeof def.source === 'string') {
    clauses.unshift({ text: def.source });
  }
  // What it pays, in the words the Beads screen prints; then the halves of the
  // ratified card this build has not made, and the reason a row is unreachable.
  // Spread rather than rebuilt: a `CardClause` *is* a `CompendiumClause` minus
  // the note flag, and copying it field by field is how a deferred half comes to
  // be dropped the day the vocabulary grows one.
  for (const paid of describeBeadBoon(boon ?? {})) clauses.push({ ...paid });
  for (const line of def.deferred ?? []) clauses.push({ text: line, deferred: true });
  if (def.dormant !== undefined) clauses.push({ text: def.dormant, note: true });

  const scope =
    kind === 'feat'
      ? (def as { once: 'game' | 'age' }).once === 'age'
        ? 'a first in the world, once in each age'
        : 'a first in the world, once per game'
      : age === null
        ? BEAD_KIND_WORD[kind]
        : `${BEAD_KIND_WORD[kind]}, dealt in ${deckEraWord(age)}`;

  const rows: CompendiumRow[] = [{ label: 'Family', figures: family.word }];
  if (kind === 'endeavour') {
    rows.push({ label: 'Production cost', figures: `${figure((def as { cost: number }).cost)}${HAMMER}` });
  }
  return {
    id: compendiumId('bead', id),
    section: 'bead',
    name: def.name,
    eyebrow: scope,
    mark: { kind: 'glyph', glyph: family.glyph },
    rows,
    clauses,
    flavor: 'flavor' in def && typeof def.flavor === 'string' ? def.flavor : null,
  };
}

/** What class of row a bead card came off, in a player's word. */
const BEAD_KIND_WORD: Record<string, string> = {
  feat: 'a first in the world',
  endeavour: 'a race project',
  quest: 'a deed',
  reckoning: 'the age’s snapshot',
  grant: 'a reward, once per empire',
};

function beadEntries(): CompendiumEntry[] {
  return [
    beadRulesEntry(),
    ...BEAD_FEAT_IDS.map(beadEntry),
    ...BEAD_ENDEAVOUR_IDS.map(beadEntry),
    ...BEAD_QUEST_IDS.map(beadEntry),
    ...BEAD_RECKONING_IDS.map(beadEntry),
    // The fifth class (Entry LVIII): the beads a thing hands over. Last, because
    // they are never dealt and a reader looking for the table's cards wants the
    // four that are.
    ...BEAD_GRANT_IDS.map(beadEntry),
  ];
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
      eyebrow: 'empire-wide meter',
      mark: { kind: 'glyph', glyph: '☺' },
      rows: [
        { label: 'Your palace supplies', figures: signedFigure(happiness.palace) },
        {
          label: 'Each different improved luxury supplies',
          figures: signedFigure(happiness.perUniqueLuxury),
        },
        { label: 'Each citizen demands', figures: signedFigure(-happiness.demandPerPop) },
        ...ladderRows(RULES.meters.tiers),
      ],
      clauses: [
        {
          text: 'Happiness is one figure for your whole empire: everything that supplies it, minus everything that demands it. While it is positive your empire gets a percentage bonus to its yields, in the steps listed above; while it is negative it gets a penalty.',
        },
        {
          text: `Every citizen in every city demands ${figure(happiness.demandPerPop)}.`,
        },
        // The crowding surcharge is spoken for iff the ledger is charging it:
        // the weight went to 0 on 2026-09-01 (Entry LVI) and back on with the
        // 9/3 playtest ruling, and the sentence follows the number both ways,
        // so the book never describes a rule the ledger is not charging.
        ...(happiness.crowdingWeight > 0
          ? [
              {
                text: `A city larger than ${figure(happiness.crowdingFrom)} citizens demands more on top of that, for crowding: ${figure(happiness.crowdingWeight)} × (size − ${figure(happiness.crowdingFrom)}), raised to the power of ${figure(happiness.crowdingExponent)}.`,
              },
            ]
          : []),
        {
          text: `However far the steps above go, the bonus or penalty never passes ${percentFigure(RULES.meters.tierClamp)}.`,
        },
        {
          text: 'Negative happiness also slows growth, on a steeper set of steps of its own. It reduces a city’s spare food only, so even the worst step stops a city growing rather than starving it.',
        },
        ...ladderRows(RULES.meters.growthStifle).map((entry) => ({
          text: `Happiness ${entry.label.toLowerCase()}: spare food toward growth ${entry.figures}.`,
        })),
      ],
      flavor: null,
    },
    {
      id: compendiumId('meter', 'authority'),
      section: 'meter',
      name: 'Authority',
      eyebrow: 'empire-wide meter',
      mark: { kind: 'glyph', glyph: '⚖' },
      rows: [
        { label: 'Your palace supplies', figures: signedFigure(authority.palaceCapacity) },
        { label: 'Each age you have reached supplies', figures: signedFigure(authority.perAge) },
        { label: 'Your capital costs', figures: signedFigure(-authority.capital) },
        { label: 'A city you founded costs', figures: signedFigure(-authority.foundedCity) },
        { label: 'A coastal city you founded costs', figures: signedFigure(-authority.coastalCity) },
        { label: 'A city you captured costs', figures: signedFigure(-authority.capturedCity) },
        ...ladderRows(RULES.meters.tiers),
      ],
      clauses: [
        {
          text: 'Authority is one figure for your whole empire: your capacity to govern, minus what your cities cost to govern. While it is positive your empire gets a percentage bonus, in the steps listed above; while it is negative it gets a penalty. Some cards call it your writ.',
        },
        {
          text: 'A coastal city costs less than an inland one, but it still costs something. A city you captured always counts as captured, coastal or not.',
        },
        ...ladderRows(RULES.meters.borderFreeze).map((entry) => ({
          text: `Authority ${entry.label.toLowerCase()}: culture toward new border hexes ${entry.figures}. An empire past its authority stops claiming ground, and cannot buy hexes with gold either.`,
        })),
      ],
      flavor: null,
    },
    {
      id: compendiumId('meter', 'growth'),
      section: 'meter',
      name: 'Growth',
      eyebrow: 'how cities gain citizens',
      mark: { kind: 'glyph', glyph: YIELD_GLYPH.food },
      rows: [
        {
          label: 'Each citizen eats',
          figures: `${figure(cities.foodPerCitizen)}${YIELD_GLYPH.food}`,
        },
        { label: 'Food stored for the first growth', figures: figure(cities.growthBase) },
        { label: 'Added per citizen already there', figures: figure(cities.growthLinear) },
        { label: 'Exponent of the growth curve', figures: figure(cities.growthExponent) },
        {
          label: 'A city shrinks when its store reaches',
          figures: signedFigure(cities.starvationShrinksAt),
        },
      ],
      clauses: [
        {
          text: `A city eats ${figure(cities.foodPerCitizen)}${YIELD_GLYPH.food} per citizen every turn. Whatever food is left over is stored, and when the store is full the city gains a citizen and the store is emptied.`,
        },
        {
          text: `A city needs ${figure(cities.growthBase)} stored to gain its second citizen. Each citizen it already has adds ${figure(cities.growthLinear)} to the figure for the next one, and a rising amount at the exponent above is added on top — so a small city grows quickly and a large one slowly.`,
        },
        {
          text: `If a city eats more than it produces the store falls, and a store that reaches ${signedFigure(cities.starvationShrinksAt)} costs the city a citizen. The store is emptied either way, and a city never falls below its last citizen.`,
        },
        {
          text: `A city can work hexes up to ${figure(cities.workRadius)} rings away, claims up to ${figure(cities.claimRadius)} rings, and must be founded at least ${figure(cities.minCitySpacing)} hexes from another city.`,
        },
      ],
      flavor: null,
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
      name: 'Trade routes',
      eyebrow: 'what a trader sets up',
      mark: { kind: 'badge', badge: 'trader' },
      rows: [
        { label: 'A route lasts', figures: `${figure(trade.routeTurns)} turns` },
        {
          label: 'Furthest a destination may be',
          figures: `${figure(trade.rangeTurns)} turns of travel`,
        },
        {
          label: 'Each trading post adds to that',
          figures: `${signedFigure(trade.postRangeTurns)} turns`,
        },
        {
          label: `Citizens needed per ${YIELD_GLYPH.gold}`,
          figures: figure(trade.goldPerCombinedPop),
        },
      ],
      clauses: [
        {
          // The direction is the user's reversal of 2026-08-27 (`trade.ts`,
          // `explainRouteYield`): the **origin's** buildings set the figure and
          // the **destination** banks it, which is why a well-built capital is
          // worth sending routes *out* of. Pinned in `test/ui/compendium.test.ts`
          // because it is a sentence that reads plausibly backwards.
          text: 'A route pays the city it goes to, every turn. How much food and production it pays depends on the buildings in the city it came from, so a route out of a well-built capital is what feeds a young city.',
        },
        {
          text: `Each food, culture or science building in the origin city is worth a point of ${YIELD_GLYPH.food}. Each production, military or gold building there is worth a point of ${YIELD_GLYPH.production}. The gold is counted differently: a point of ${YIELD_GLYPH.gold} for every ${figure(trade.goldPerCombinedPop)} citizens across the two cities together.`,
        },
        {
          text: 'Distance is measured in turns of a trader’s own travel between the two cities, so a road puts more cities in reach and a mountain range puts fewer — it is a fact about the pair, not about where your trader happens to be standing. Both ends of a finished route become trading posts, permanently.',
        },
        {
          text: 'Only one route may run between any pair of your cities, in either direction. The route belongs to the trader carrying it, so an enemy that kills a loaded trader takes its cargo and ends the route.',
        },
      ],
      flavor: null,
    },
    {
      id: compendiumId('trade', 'connections'),
      section: 'trade',
      name: 'City connections',
      eyebrow: 'gold from a road to the capital',
      mark: { kind: 'glyph', glyph: YIELD_GLYPH.gold },
      rows: [
        {
          label: `Citizens per ${YIELD_GLYPH.gold} each turn`,
          figures: figure(trade.connectionPerPop),
        },
        {
          label: `Road hexes per ${YIELD_GLYPH.gold} of upkeep`,
          figures: figure(trade.roadsPerMaintenance),
        },
      ],
      clauses: [
        {
          text: `Any city other than your capital that is joined to the capital by road pays you a point of ${YIELD_GLYPH.gold} for every ${figure(trade.connectionPerPop)} of its citizens, every turn. This is separate from trade routes and needs no trader standing anywhere.`,
        },
        {
          text: 'The road may cross your own territory or land nobody owns, but never a rival’s. A city centre counts as a piece of road, so the road only has to reach the city.',
        },
        {
          text: `Roads are not free: you pay a point of ${YIELD_GLYPH.gold} of upkeep for every ${figure(trade.roadsPerMaintenance)} hexes of road your own traders laid.`,
        },
      ],
      flavor: null,
    },
    {
      id: compendiumId('trade', 'roads'),
      section: 'trade',
      name: 'Roads',
      eyebrow: 'moving on roads',
      mark: { kind: 'glyph', glyph: '⌇' },
      rows: [
        {
          label: 'Moving from road to road costs',
          figures: `${figure(thirds)} ${plural(thirds, 'third')} of a movement point`,
        },
        {
          label: 'Plundering a loaded trader pays',
          figures: tileYieldFigures({
            food: trade.pillageBounty.food,
            production: trade.pillageBounty.production,
            gold: trade.pillageBounty.gold,
          }),
        },
      ],
      clauses: [
        {
          text: 'A road replaces the cost of the ground rather than discounting it, so a forested hill with a road on it costs the same as any other road hex. Both hexes must have road for the cheap step.',
        },
        {
          text: 'Traders build road under their feet as they travel. Roads are permanent, and any unit of any player can use one; the player whose trader laid a hex of road is the one who pays upkeep for it.',
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
  // Every *generated* shelf opens on its lead page (`compendiumShelves.ts`), so
  // the first card a reader meets on a shelf says what the shelf is about
  // before the first card built out of a data row says what one costs. Seeded
  // here rather than pushed by each builder because it is a fact about the
  // shelf and not about any row on it; the two written shelves have no key and
  // start empty, as they are already prose.
  for (const [id] of SECTION_NAMES) {
    const intro = SHELF_INTROS[id];
    byId.set(id, intro === undefined ? [] : [intro]);
  }
  const push = (entry: CompendiumEntry): void => {
    byId.get(entry.section)!.push(entry);
  };

  for (const entry of INTRO_ENTRIES) push(entry);
  for (const entry of CONCEPT_ENTRIES) push(entry);
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
  // **All three pools**, in `ALL_BELIEF_IDS`' own order — the pantheon's gods,
  // then the follower beliefs, then the enhancers. One shelf rather than three,
  // because they are one id space read by one describer; the eyebrow is what
  // says which bag a row came out of (see `BELIEF_POOL_WORD`).
  for (const id of ALL_BELIEF_IDS) push(beliefEntry(id));
  // And the cathedral's five patrons, last on the shelf: they are cards of the
  // same vocabulary out of the same file, and the one thing that separates them
  // from a belief is that nobody picks one. See `consecrationEntry`.
  for (const id of CONSECRATION_IDS) push(consecrationEntry(id));
  for (const id of RITE_IDS) push(riteEntry(id));
  for (const id of GREAT_PERSON_IDS) push(greatPersonEntry(id));
  for (const id of TRIUMPH_IDS) push(triumphEntry(id));
  for (const entry of beadEntries()) push(entry);
  for (const entry of meterEntries()) push(entry);
  for (const entry of tradeEntries()) push(entry);

  return SECTION_NAMES.map(([id, name]) => ({ id, name, entries: byId.get(id)! }));
}

/**
 * Whether one entry answers to `needle`, already trimmed and case-folded.
 *
 * A plain substring over the entry's **name** for the generated shelves — the
 * brief's own rule, and the honest one for an index: a player typing "iron" is
 * looking for a heading, not for every card that mentions iron in a clause. The
 * two written shelves are the stated exception: their headings are essay
 * titles ("Trade and roads"), not the table's own keyword, so a reader typing
 * "caravan" is looking for the *paragraph* — `entry.written` widens the search
 * to the prose itself.
 */
function entryMatches(entry: CompendiumEntry, needle: string): boolean {
  if (entry.name.toLowerCase().includes(needle)) return true;
  if (entry.written !== true) return false;
  // **Stripped**, because a search is over words. A clause's marks carry the
  // *ids* of the things it names (`[[building:granary|a Granary]]`), and a
  // reader typing "building" is not asking for every card that happens to name
  // one — they would get the whole shelf, matched on plumbing.
  return entry.clauses.some((clause) => stripRefs(clause.text).toLowerCase().includes(needle));
}

/**
 * The sections with every entry that does not match `query` removed.
 *
 * `entryMatches` decides the one entry; a section that matches nothing keeps
 * its row and comes back empty, so the index never reflows under the cursor.
 */
export function filterSections(
  sections: readonly CompendiumSection[],
  query: string,
): CompendiumSection[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return sections.map((section) => ({ ...section }));
  return sections.map((section) => ({
    ...section,
    entries: section.entries.filter((entry) => entryMatches(entry, needle)),
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

  if (entry.pamphlet === true) {
    // The pamphlet's page is the leaflet itself, drawn by its own printer —
    // sections, screenshots, captions. Its clauses are for the search alone;
    // printing them here as well would say everything twice.
    const leaf = element('div', 'cmp-pamphlet');
    renderPamphletBody(leaf);
    card.append(leaf);
  } else if (entry.clauses.length > 0 && entry.written === true) {
    // The two written shelves' shape: prose, not the card vocabulary's marked
    // list, so a paragraph per clause rather than a bullet.
    const prose = element('div', 'cmp-written');
    for (const line of entry.clauses) {
      const paragraph = element('p', 'cmp-written-p');
      // `setDescriptorText` rather than `setYieldText`: a clause may name a
      // thing the book has a page about, and the book is where a keyword most
      // obviously wants to be a link. Nothing on a card answers a click, so
      // every keyword here is a live one.
      setDescriptorText(paragraph, line.text);
      prose.append(paragraph);
    }
    card.append(prose);
  } else if (entry.clauses.length > 0) {
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
      setDescriptorText(item, line.text);
      list.append(item);
    }
    card.append(list);
  }

  if (entry.flavor !== null) {
    // Labelled, not merely italic (user ruling, 2026-08-27). A card's epigram is
    // the *card's own* writing and stays exactly as its data row wrote it — but
    // a reader who has just been handed four sentences of rules in this voice
    // will otherwise read the fifth as a fifth rule. The word is the whole of
    // the fix, and it is the one place a flavour line is marked as such.
    const line = element('p', 'cmp-flavor');
    line.append(element('span', 'cmp-flavor-label', 'Flavour'));
    line.append(document.createTextNode(entry.flavor));
    card.append(line);
  }
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
      body.append(element('p', 'hint', 'Nothing on this shelf matches that search.'));
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
    // With no id and no hash to honour, the book opens on the Introduction's
    // first page rather than wherever the index happens to start.
    view.show(entryId ?? hashEntry() ?? DEFAULT_ENTRY);
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
