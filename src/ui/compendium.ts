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
 * luxury), `techGifts` (`techUnlocks.ts`), `unitRosterCost` (`cities.ts`).
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
 * in-game hover cards too, so where a card says "authority capacity" the
 * Compendium *glosses* the word on its shelf's lead page and leaves the card
 * alone.
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
 * A game is **taken nowhere** in here, and that is what makes the second mount
 * possible: nothing on these cards is a fact about a seat. The last place a live
 * game could have said more was a unit's price — `explainUnitCost` folds the
 * settler ladder and an empire's law into it — and the Compendium prints
 * that fold's **first two lines only** — the roster's own price, which is a
 * fact about the row's size and the tree's column rather than about any seat.
 * See `unitRosterCost` (`cities.ts`).
 *
 * A **building's** price is printed whole, and the difference is the point: it
 * is `buildingProductionCost`, the fold of the row's size and its column,
 * which is what any town in any empire is charged — with **one** exception,
 * declared here rather than hidden. A `oncePerEmpire` row (the Forum, the three
 * great works, the Opus) costs more the more cities the empire holds since
 * 2026-09-07 (`docs/flags.md` item dd), so the book asks the fold with no seat
 * and gets the **breakeven** reading: the figure an empire of
 * `production.uniqueCostBreakeven` cities pays, which is the row's own sized
 * price and the honest neutral quote for a page that describes rows rather than
 * a game. The city panel, which has a seat, prints what that seat is charged.
 *
 * Every entry has a stable id
 * ---------------------------
 * `unit:swordsman`, `tech:ironWorking`, `order:bloodedSpears` — the section's
 * name, a colon, the table's own key. It is the element's DOM id, the URL hash
 * the overlay honours when it opens, and the argument `open` takes, so a keyword
 * anywhere else in the interface can point at a definition later without this
 * file growing a second address space.
 */

import { charterIconPath, charterWorkIcons } from '../art/charterWorkIcons';
import {
  BUILDING_IDS,
  type BuildingDef,
  type BuildingId,
  buildingDef,
  isWonder,
} from '../sim/buildingData';
import { buildingProductionCost, explainBuildingCost, unitRosterCost } from '../sim/cities';
import {
  type Family,
  GREAT_PERSON_IDS,
  type GreatPersonId,
  greatPersonDef,
} from '../sim/greatPeopleData';
import {
  IMPROVEMENT_IDS,
  type HillsWaiver,
  type ImprovementDef,
  type ImprovementId,
  improvementDef,
  improvementForResource,
  isGreatPersonWork,
  isUniqueImprovement,
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
import { isLendableResource } from '../sim/deals';
import { describeResourceSignature } from '../sim/resourceEffects';
import { RULES } from '../sim/rulesData';
import {
  type RefKind,
  SLOT_WORDS,
  anyCardDef,
  cityScopeWords,
  describeBuildingRow,
  describeCard,
  describeFamilyVerb,
  describeTraitLines,
  describeUnitRow,
  EMPIRE_BUILDING_WORDS,
  filterWords,
  ref,
  stripRefs,
  tileConditionWords,
} from '../sim/statecraft';
import {
  abilityConcept,
  abilityNote,
  renewalNote,
  techRuleClauses,
  techRuleFullClauses,
  techRuleLines,
  techRuleName,
  techRuleNote,
  techsWithNamedRules,
} from './techRuleWords';
import {
  type CityScope,
  DECK_IDS,
  DOCTRINE_IDS,
  type DoctrineDef,
  type DoctrineId,
  ORDER_IDS,
  type OrderId,
  type OrderRarity,
  cardThatOpensImprovement,
  charterThatOpensImprovement,
  doctrineDef,
  orderDef,
  orderIsDealt,
  orderType,
} from '../sim/statecraftData';
import {
  BAND_NUMERAL,
  RARITY_MARK,
  RARITY_WORD,
  TYPE_WORD,
  deckWord,
  orderPayoff,
  orderSuitFace,
} from './deckBadges';
import { gatingTech } from '../sim/tech';
import {
  ABILITY_TECH,
  ALL_TECH_IDS,
  CHARTER_TECH_IDS,
  TECH_IDS,
  type TechId,
  isAbilityId,
  techDef,
} from '../sim/techData';
import {
  LEADER_ABILITY_IDS,
  LEADER_IDS,
  type LeaderId,
  leaderAbilityHome,
  leaderDef,
  leaderThatOpensImprovement,
} from '../sim/leaderData';
import { LEADER_STEP_WORDS, type LeaderRowKind, leaderOpeningWords } from './leaderSelect';
import { type TechGift, techGifts } from '../sim/techUnlocks';
import { TILE_YIELD_KEYS, type TileYieldSpec, readTileYield, terrainDef } from '../sim/terrainData';
import { TRIUMPH_IDS, type TriumphId, triumphDef } from '../sim/triumphData';
import {
  UNIT_TYPE_IDS,
  type UnitDef,
  type UnitTypeId,
  requiredResourcesOf,
  unitDef,
} from '../sim/unitData';
import { buildingUpkeep, unitUpkeep } from '../sim/upkeep';
import { CARD_LINE_NAME, lineOf } from './cardLine';
import { charterOpening } from './charterTech';
import { type SuitFace, suitMarksNode } from './suitFace';
import { setDescriptorText } from './keywords';
import { renderPamphletBody } from './pamphlet';
import { SHELF_INTROS } from './compendiumShelves';
import { CONCEPT_ENTRIES, INTRO_ENTRIES } from './compendiumText';
import { HAMMER, YIELD_GLYPH, eraWord, figure, percentFigure, signedFigure } from './figures';
import {
  type BeadCardId,
  BEAD_ENDEAVOUR_IDS,
  BEAD_FEAT_IDS,
  BEAD_GRANT_IDS,
  BEAD_QUEST_IDS,
  BEAD_RECKONING_IDS,
  BEAD_RULES,
  anyBeadDef,
} from '../sim/beadData';
import { BEAD_FAMILY_MARK, deckEraWord } from './beadsScreen';
import { MALICE_IDS, type MaliceId, maliceDef } from '../sim/maliceData';
import {
  WAGER_AGES,
  WAGER_IDS,
  type WagerId,
  wagerAgeIndex,
  wagerBar,
  wagerDealtInAge,
  wagerDef,
} from '../sim/wagerData';
import { BEAD_GLYPH, beadMarkNode } from './newsMark';
import { WAGER_LINE_NAME } from './wagerSheet';
import { describeBeadBoon } from '../sim/beads';
import { AXIS_MARK } from './religionScreen';
import { riteTeachingCard } from '../sim/religion';
import { resourceMarkNode } from './resourceMark';
import { setYieldText } from './yieldMark';
import { SCALER_LABEL } from './scalerFigure';
import { scalerStartFace } from './scalerValue';
import { element, withArticle } from './dom';
import { createModalShell } from './modalShell';

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
  // **The named rules** (batch L1, `docs/audit/legibility.md` §2): a technology
  // whose rules run past the star chart's bar prints one named rule instead, and
  // this is where that name goes — the whole of the rule, and the node's own
  // paragraph under it. Beside the technologies, because that is what a reader
  // arrives from.
  | 'rule'
  | 'order'
  | 'doctrine'
  | 'belief'
  | 'rite'
  | 'greatPerson'
  | 'triumph'
  | 'bead'
  // **The wager and the malice** (batch G3, `docs/wager.md` §4/§8). Two shelves
  // rather than one, and the split is the same one the tables keep: a wager is a
  // bar you stake on and a malice is what a missed bar seats in your council.
  // The deck was owed a shelf from G2 — every other data table in the game has
  // one — and the malice's arrives with it, which is what made the two one pass.
  | 'wager'
  | 'malice'
  // **The leaders** (batch L2a, `docs/flags.md` (dddd)). One shelf rather than
  // two: a figure's own line and the twelve cards of its deck are the same
  // choice made at the same moment, and a reader deciding who to play needs them
  // on one page.
  | 'leader'
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
type CompendiumMark =
  | { kind: 'badge'; badge: string }
  | { kind: 'charter'; id: string }
  | { kind: 'resource'; resource: ResourceId }
  // An Order's A3 marks (batch C1, `suitFace.ts`): its type's ink as a stripe,
  // its deck's suit and its rarity's small mark — the collection row's own
  // marks, so a card reads the same in the book as in the hand that holds it.
  // Still no new icon: the suits exist because a dealt card needed them, and
  // the book borrows them rather than keeping a shelf glyph of its own.
  | { kind: 'suit'; face: SuitFace }
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
  /**
   * **Whether this card is dealt at all**, and why not — the sentence that has
   * to be read before the rules under it, not after.
   *
   * A third weight rather than a `note`, because it is a different kind of
   * fact: a note qualifies a rule the card *has*, and this says the card is not
   * in play. Set on the opening clause of a withdrawn row and of a row the game
   * has not built yet (`orderStanding`), and drawn as a banded line at the head
   * of the card rather than as one more bullet in the list.
   */
  standing?: boolean;
}

/** One card of the reference. */
export interface CompendiumEntry {
  /** `unit:swordsman`. The DOM id, the URL hash and `open`'s argument. */
  id: string;
  section: CompendiumSectionId;
  name: string;
  /**
   * **The sub-shelf this entry is filed under**, or absent for a shelf that
   * has none (most shelves; an ordinary unit, building or improvement; and
   * every Technologies entry but the charter technologies, Scientific batch
   * S12).
   *
   * A shelf, not a section: the Orders shelf is six decks, the cards two decks
   * share, the cards any leader may draw and the withdrawn rows behind them —
   * and those are four hundred-odd cards a reader cannot scroll through
   * hoping. They are **not** sections, because a section is the head of an
   * entry's id (`sectionOfId`) and an Order's address is `order:<row>` for
   * good: every keyword mark in the book, every hash a player has bookmarked
   * and every deep link the interface makes points at it. So the grouping is
   * *inside* a shelf — a heading in the body and a jump in the index — and the
   * anchor never moves.
   *
   * The entries of one group must be contiguous: `compendiumSections` pushes
   * them that way, and the body prints a heading when the name changes.
   */
  group?: string;
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
  ['rule', 'Rules'],
  ['order', 'Orders'],
  ['doctrine', 'Doctrines'],
  ['belief', 'Beliefs'],
  ['rite', 'Rites'],
  ['greatPerson', 'Great People'],
  ['triumph', 'Triumphs'],
  ['bead', 'The Bead Race'],
  ['wager', 'The Wager'],
  ['malice', 'Malices'],
  ['leader', 'Leaders'],
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
 * Why a row's `requiresHills` may be waived, in a first-time player's words —
 * one phrase per reason, and the whole union.
 *
 * A table rather than the ternary this used to be: a third reason lived here
 * between L3c and L8 — a town that had cut steps into its hillsides — and an
 * `else` arm would have printed the resource's sentence for it. It went out
 * with the hall (`docs/flags.md` (bbbbb)) and the table stays, because the
 * lesson outlives the row. Each phrase completes the opening the caller picks
 * off `requiresHills` — "Hills are allowed where the hex …" for a row that
 * wants flat ground, "Flat ground is allowed where the hex …" for one that
 * wants hills.
 */
const HILLS_WAIVER_WORDS: Record<HillsWaiver, string> = {
  freshwater: 'is beside fresh water',
  ownResource: 'carries a resource this improvement gives access to',
};

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

// --- what opens a thing -----------------------------------------------------

/**
 * **Every entry for a thing the tree opens names its technology, as a link**
 * (the user, 2026-09-16, `docs/flags.md` (gggggg), C1): *"please revise the
 * compendium to include which technology unlocks a given building/unit/wonder
 * etc"*. The shelves used to print an "Unlocked by" *row* — a bare name in the
 * figures column, dropped outright for a row no node names, so a charter
 * building or a figure's soldier said nothing at all about how one comes by it.
 * The row is a clause now, and the clause has three properties the row could
 * not: the technology is a keyword ref, so a reader is one press from the node;
 * a row nothing in the tree opens says who *does* open it; and every kind of
 * thing says it in the same place and the same first word, so a reader who has
 * met one entry knows where to look on the next.
 *
 * **One reverse reading, never a second table.** Which node opens a row is the
 * tree's own `unlocks` inverted (`UNIT_UNLOCK_TECH` / `BUILDING_UNLOCK_TECH`,
 * `techData.ts`), asked through `gatingTech` — the same lookup `isUnlocked`
 * gates the queue with and the cost fold prices a column from
 * (`buildingCostColumn`, `cities.ts`), down to the same fallback: a
 * `worldUnlockTech` counts as the row's node, because the Opus belongs to
 * Alchemy's column whichever empire reaches it. An improvement carries its gate
 * on its own row (`requiresTech`), a rite is an ability the node hands over
 * (`ABILITY_TECH`), and both are read where the sim reads them.
 *
 * **Who else opens a thing.** The clauses are `isUnlocked`'s arms said out loud,
 * in that function's order: a card (`unlockedByCard`, and the card is found by
 * walking every class that may carry `unlocksBuilding`/`unlocksUnit` — a walk
 * of the cards, exactly as `laterGifts` walks the tree), a figure
 * (`unlockedByLeader`, the leader found on its own sheet), a placed or granted
 * row, a great person's renown, a hull the tree has not reached yet, and — last,
 * because it is what the tree's silence means — "from the start".
 *
 * `OPENING_WORDS` is the first word of every such clause: the test that pins
 * "exactly one opening line per entry" finds the line by it, and a describer
 * clause or a data note that happened to begin the same way would fail there
 * rather than pass as a second opening.
 */
export const OPENING_WORDS: readonly string[] = ['Unlocked ', 'Withdrawn: '];

/**
 * `[[tech:mathematics|Mathematics]]`. Every technology has a page, the
 * charter technologies included since Scientific batch S12 (`charterTechEntry`),
 * so every technology is named with a mark.
 */
function techRef(id: TechId): string {
  return ref('tech', id, techDef(id).name);
}

/**
 * The charter that opens a charter technology, as a mark to its card, or
 * `null` when no live charter names it. `charterOpening` (`charterTech.ts`) is
 * the star chart's own reading of the same question, so the chart's hover card
 * and the book name the same charter.
 */
function charterRef(tech: TechId): string | null {
  const charter = charterOpening(tech, undefined);
  return charter === null ? null : ref('order', charter, orderDef(charter).name);
}

/**
 * The words after a charter technology's name in an opening line: which charter
 * a reader must draft before the technology can be researched. Empty for an
 * ordinary technology.
 */
function charterTechWords(tech: TechId): string {
  if (techDef(tech).charter !== true) return '';
  const charter = charterRef(tech);
  return charter === null
    ? ', a charter technology'
    : `, a charter technology that only an empire holding ${charter} may research`;
}

/**
 * "Iron", or "Horses or Camels" — a row's resource list, each name a link to
 * that resource's own page.
 *
 * `eitherResourceWords` (`tech.ts`) is the same phrase in plain words, and it
 * stays that way: it is what the reducer's refusal prints, and a refusal arrives
 * on a toast and a context card where a keyword mark would be stripped anyway.
 * The book is the one surface where a reader wanting to know what obsidian *is*
 * should be one click from finding out, so it joins the two halves itself. The
 * word between them is the refusal's, so the two describe one rule.
 */
function resourceRefWords(ids: readonly ResourceId[]): string {
  const names = ids.map((id) => ref('resource', id, resourceDef(id).name));
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]!}`;
}

/**
 * `[[leader:pachacuti|Pachacuti]]`. The Leaders shelf anchors its pages
 * `leader:<id>` (`compendiumId`), so the mark is already an address the book
 * honours; `RefKind` has simply never needed the kind, because no describer
 * names a figure — the cast is the one place a leader is named as a keyword,
 * and widening the union is `describers.ts`'s decision (outside this pass).
 */
function leaderRef(id: LeaderId): string {
  return ref('leader' as RefKind, id, leaderDef(id).name);
}

/** The figure whose sheet claims a row, or `null` for a row on the bench. */
function leaderThatOpens(kind: LeaderRowKind, id: string): LeaderId | null {
  for (const leader of LEADER_IDS) {
    const def = leaderDef(leader);
    const named =
      kind === 'unit' ? def.unit : kind === 'building' ? def.building : def.improvement;
    if (named === id) return leader;
  }
  return null;
}

/**
 * One class of card that may hand a row over, with the words its ref is said
 * in. Walked in this order, which is `anyCardDef`'s own: the law first, then
 * the faith, then a figure's line.
 */
const OPENING_CARD_CLASSES: readonly {
  ids: readonly string[];
  kind: RefKind;
  noun: string;
  /** The page a card of this class is anchored on — a leader's line is on its leader's. */
  anchor?: (id: string) => string;
}[] = [
  { ids: ORDER_IDS, kind: 'order', noun: 'the Order' },
  { ids: DOCTRINE_IDS, kind: 'doctrine', noun: 'the Doctrine' },
  { ids: ALL_BELIEF_IDS, kind: 'belief', noun: 'the belief' },
  { ids: CONSECRATION_IDS, kind: 'belief', noun: 'the consecration' },
  {
    ids: LEADER_ABILITY_IDS,
    kind: 'leader' as RefKind,
    noun: 'the leader',
    anchor: (id) => leaderAbilityHome(id as Parameters<typeof leaderAbilityHome>[0]),
  },
  // **A technology that opens a row early** (Scientific batch S5: Surveying's
  // `unlocksBuilding` opens the Aqueduct before Engineering). A technology is
  // a card class too (`anyCardDef`), and it is walked last, so a card that
  // opens the same row is named first. `openedByCard` words this kind as
  // research, not as a card.
  { ids: ALL_TECH_IDS, kind: 'tech', noun: 'the technology' },
];

/**
 * Is this row a second way into a faith house (batch DT15, The House of Worship)? A
 * follower belief is the house's own door, and the line and the note below are about
 * that door. A scoped row on a `followingOnly` building opens it in some towns as
 * well, so `secondDoorWords` adds it to the line instead.
 */
function isSecondDoor(effect: { building: BuildingId; scope?: CityScope }): boolean {
  return effect.scope !== undefined && buildingDef(effect.building).followingOnly === true;
}

/** The sentence that names a house's second door, or nothing for a row with none. */
function secondDoorWords(id: string): string {
  for (const card of DOCTRINE_IDS) {
    const def = doctrineDef(card);
    if (def.retired === true) continue;
    for (const effect of def.effects) {
      if (effect.kind !== 'unlocksBuilding' || effect.building !== id || !isSecondDoor(effect)) continue;
      const towns = cityScopeWords(effect.scope!).replace(/^every /, 'any ');
      return ` The Doctrine ${ref('doctrine', card, def.name)} also opens it in ${towns}.`;
    }
  }
  return '';
}

/**
 * The card that opens a row — its ref, the noun it is said with and the id of
 * the page the ref points at — or `null`.
 */
function cardThatOpens(
  kind: 'unit' | 'building',
  id: string,
): { ref: string; noun: string; kind: RefKind; anchor: string; charter?: boolean } | null {
  // **A charter's own grant** (`OrderDef.charter.unlocks`). A charter opens its
  // row through this field and not through an `unlocksUnit` or
  // `unlocksBuilding` effect, so the walk below did not find it and thirteen
  // pages said "a card" where the charter has a name (the pass of 2026-11-21).
  // Asked first: a charter is held for the whole game, which is the stronger
  // of two ways in.
  for (const card of ORDER_IDS) {
    const def = orderDef(card);
    if (def.retired === true || def.charter === undefined) continue;
    const named = kind === 'unit' ? def.charter.unlocks.unit : def.charter.unlocks.building;
    if (named !== id) continue;
    return { ref: ref('order', card, def.name), noun: 'the Order', kind: 'order', anchor: card, charter: true };
  }
  for (const cardClass of OPENING_CARD_CLASSES) {
    for (const card of cardClass.ids) {
      const def = anyCardDef(card as Parameters<typeof anyCardDef>[0]);
      // A withdrawn card opens nothing any more — `retired` rows leave every
      // pool — and a row it alone named is a row the fallback below answers for.
      if ((def as { retired?: boolean }).retired === true) continue;
      const opens = def.effects.some(
        (effect) =>
          (kind === 'building' &&
            effect.kind === 'unlocksBuilding' &&
            effect.building === id &&
            !isSecondDoor(effect)) ||
          (kind === 'unit' && effect.kind === 'unlocksUnit' && effect.unit === id),
      );
      if (!opens) continue;
      const anchor = cardClass.anchor === undefined ? card : cardClass.anchor(card);
      const name =
        cardClass.anchor === undefined ? def.name : leaderDef(anchor as LeaderId).name;
      return {
        ref: ref(cardClass.kind, anchor, name),
        noun: cardClass.noun,
        kind: cardClass.kind,
        anchor,
      };
    }
  }
  return null;
}

/**
 * "Unlocked by researching [[tech:…]]." — the line for a row the tree names.
 * A charter technology also names the charter that opens it (Scientific batch
 * S12), because a reader cannot research it without that card.
 */
function openedByTech(tech: TechId): CompendiumClause {
  return { text: `Unlocked by researching ${techRef(tech)}${charterTechWords(tech)}.` };
}

/**
 * The opening line of a figure's row. `leaderOpeningWords` is the leader face's
 * own phrase for the same fact ("with Steel" · "with Æra IV"), reused so the
 * face and the shelf cannot date one soldier two ways; the sentence after it is
 * the refusal's ("belongs to another realm's leader", `buildError`) in the
 * book's voice — and it is the sentence `test/sim/leaders.test.ts` reads.
 */
function openedByLeader(kind: LeaderRowKind, id: string): CompendiumClause {
  const leader = leaderThatOpens(kind, id);
  if (leader === null) {
    return { text: 'Unlocked for no leader yet: nobody can build this.' };
  }
  return { text: `Unlocked for ${leaderRef(leader)} alone, ${leaderOpeningWords(kind, id)}.` };
}

/**
 * The opening line of a row a card hands over. The second arm is `isUnlocked`'s
 * dormant one — a row named by a node *and* a card — kept so it would read
 * truthfully the day a row has both ways in.
 */
function openedByCard(kind: 'unit' | 'building', id: string, gate: TechId | null): CompendiumClause {
  const card = cardThatOpens(kind, id);
  // A technology that opens the row early is research, so the line names the
  // tree's own node first and the early one after it, with its charter.
  if (card?.kind === 'tech') {
    const early = card.anchor as TechId;
    const earlyWords = `${techRef(early)}${charterTechWords(early)}`;
    return {
      text:
        gate === null
          ? `Unlocked by researching ${earlyWords}.`
          : `Unlocked by researching ${techRef(gate)}, or earlier by researching ${earlyWords}.`,
    };
  }
  // No live card names the row: the card that opened it is withdrawn, so
  // nobody can get it now.
  if (card === null) {
    return { text: 'Unlocked by a card that is withdrawn: nobody can get this now.' };
  }
  const by = `${card.noun} ${card.ref}`;
  return {
    text:
      gate === null
        ? `Unlocked by ${by}, not by any technology.${secondDoorWords(id)}`
        : `Unlocked by ${by}, or by researching ${techRef(gate)}.`,
  };
}

/** "Unlocked from the start" — what the tree's silence means for an ordinary row. */
const OPENED_FROM_THE_START: CompendiumClause = { text: 'Unlocked from the start.' };

/**
 * What opens a queue row — a unit, a building or a wonder — as one clause.
 *
 * The arms are `isUnlocked`'s (`tech.ts`), asked in its order, so the book and
 * the gate cannot disagree about which door a row waits behind. A withdrawn row
 * is said first, because "never again" outranks every other thing there is to
 * say about it (`buildError`'s own order).
 */
function queueOpening(kind: 'unit' | 'building', id: UnitTypeId | BuildingId): CompendiumClause {
  const unit = kind === 'unit' ? unitDef(id as UnitTypeId) : null;
  const building = kind === 'building' ? buildingDef(id as BuildingId) : null;
  const gate = gatingTech(kind, id) ?? building?.worldUnlockTech ?? null;
  if ((unit ?? building)?.retired === true) {
    return { text: 'Withdrawn: nobody can build or buy this.' };
  }
  // A row the tree does not reach (`awaitsTech`) is refused by the queue and
  // by the bank. It is asked before the other doors, because a building with
  // this marker and no technology read "from the start" (the Hall of Deeds).
  if ((unit ?? building)?.awaitsTech === true) {
    return { text: 'Unlocked by nothing yet: no technology reaches this, and nobody can build it.' };
  }
  if ((unit ?? building)?.unlockedByCard === true) return openedByCard(kind, id, gate);
  if ((unit ?? building)?.unlockedByLeader === true) return openedByLeader(kind, id);
  // A row that arrives by an act rather than a queue still credits the node
  // that names it — the Town Charter is Colonial Charters' gift, and the tree's
  // own list says so — with how it arrives said in the same breath.
  const arrives = (how: string): CompendiumClause =>
    gate === null
      ? { text: `Unlocked by no technology: it is ${how}.` }
      : { text: `Unlocked by researching ${techRef(gate)}. It is ${how}.` };
  if (building?.placed === true) return arrives('placed, and it cannot be built or bought');
  if (building?.grantedOnly === true) return arrives('granted, and it cannot be built or bought');
  if (unit?.greatWork === true) {
    return { text: 'Unlocked by renown, not by any technology.' };
  }
  if (gate !== null) {
    // The world's door rather than the empire's (`worldUnlockTech`, Entry
    // LVIII): the same node, and the clause under it says whose research counts.
    return building?.worldUnlockTech !== undefined && gatingTech(kind, id) === null
      ? { text: `Unlocked by ${techRef(gate)}, whichever empire in the world researches it.` }
      : openedByTech(gate);
  }
  return OPENED_FROM_THE_START;
}

/** What opens an improvement: its own row's gate, a figure, or the hand that lays it. */
function improvementOpening(id: ImprovementId): CompendiumClause {
  const def = improvementDef(id);
  if (def.unlockedByLeader === true) return openedByLeader('improvement', id);
  if (def.tended || def.unlockedByCard) {
    const charter = charterThatOpensImprovement(id);
    if (charter) return { text: `Unlocked by drafting the Order ${ref('order', charter, orderDef(charter).name)}.` };
    const seated = cardThatOpensImprovement(id);
    if (seated) return { text: `Unlocked while the Order ${ref('order', seated, orderDef(seated).name)} is in a chair.` };
    return { text: 'Unlocked by its retired charter if you already hold it.' };
  }
  if (def.greatPerson !== undefined) {
    // **`greatPerson` names the family, and the family is not always a great
    // person's** — the hand is read off the row, as `plantingHandOf` reads it.
    return {
      text:
        def.greatPerson === 'prophet'
          ? 'Unlocked by no technology: only a prophet builds it.'
          : 'Unlocked by no technology: only a great person builds it.',
    };
  }
  if (def.requiresTech !== undefined) return openedByTech(def.requiresTech);
  return OPENED_FROM_THE_START;
}

/**
 * What opens a rite: the node that hands the verb over. A rite's id is an
 * ability id (`unlocks.abilities`), so the tree's own inverted table answers
 * first and the row's `tech` is the same fact one table over.
 */
function riteOpening(id: RiteId): CompendiumClause {
  const def = riteDef(id);
  if (def.retired === true) {
    return { text: 'Withdrawn: no city can say this rite.' };
  }
  // **A card-taught rite** (`RiteDef.byCard`, the Devotion deck): the Order
  // whose charter or seated grant teaches it, never a node. Which Order is the
  // simulation's own reading (`riteTeachingCard`), the one the faith screen
  // and the city screen name too.
  if (def.byCard === true) {
    const card = riteTeachingCard(id);
    const by = card === null ? 'a card' : `the Order ${ref('order', card, orderDef(card).name)}`;
    return { text: `Unlocked by ${by}, not by any technology.` };
  }
  const gate = (isAbilityId(id) ? ABILITY_TECH.get(id) : undefined) ?? def.tech;
  return openedByTech(gate);
}

// --- units ------------------------------------------------------------------

/**
 * **The standard every generated entry follows** (the Compendium pass of
 * 2026-11-21, `docs/plans/compendium-pass-2026-11-21.md`). The user: *"The
 * descriptions are also way too wordy. Could you take a pass at the compendium
 * entries, make them less wordy, and remove information that isn't useful, and
 * add in things players need to know?"*
 *
 * An entry answers four questions, in this order:
 *
 *   1. what it is: the name and the eyebrow;
 *   2. what it does: the figures as rows, then every effect of the row as a
 *      clause, worded by the simulation's describers;
 *   3. how you get it: the cost rows, then one opening line that names the
 *      technology, leader or card;
 *   4. what it leads to: the upgrade rows and the links.
 *
 * Three rules keep an entry short:
 *
 *   - A sentence that is true of every entry of a kind is not on the entry. It
 *     is on the kind's lead page (`compendiumShelves.ts`), one time.
 *   - A marker on a row prints one short sentence, and a figure in it comes
 *     from the data.
 *   - A row that is not in the game says so in its first clause, and its page
 *     is filed under the last heading of its shelf.
 */

/** `[[unit:swordsman|Swordsman]]`. */
function unitRef(id: UnitTypeId): string {
  return ref('unit', id, unitDef(id).name);
}

/** `[[building:barracks|Barracks]]`, on the shelf the row is filed on. */
function buildingRef(id: BuildingId): string {
  return ref(isWonder(id) ? 'wonder' : 'building', id, buildingDef(id).name);
}

/** `[[improvement:farm|Farm]]`. */
function improvementRef(id: ImprovementId): string {
  return ref('improvement', id, improvementDef(id).name);
}

/**
 * The headings a shelf of rows is filed under, after its ordinary rows. A
 * reader who wants a leader's unit finds every such unit in one place, and a
 * row nobody can get is behind the rows a player can use.
 */
const LEADER_GROUP = 'Unique to one leader';
const CARD_GROUP = 'Opened by a card';
const WORKS_GROUP = 'Works of great people';
const ABSENT_GROUP = 'Not in the game';

/** The order the headings above stand in on a shelf. Ordinary rows come first. */
const ROW_GROUPS: readonly (string | undefined)[] = [
  undefined,
  LEADER_GROUP,
  CARD_GROUP,
  WORKS_GROUP,
  ABSENT_GROUP,
];

/**
 * Is this unit out of the game? Four markers answer: a withdrawn row
 * (`retired`), a row the technology tree does not reach (`awaitsTech`), a
 * leader's row that no leader holds, and a row whose card is withdrawn. Each
 * was printed before as an ordinary page with one line near the end, so a
 * reader took the unit for a thing they could build.
 */
function unitIsAbsent(type: UnitTypeId): boolean {
  const def = unitDef(type);
  if (def.retired === true || def.awaitsTech === true) return true;
  if (def.unlockedByLeader === true && leaderThatOpens('unit', type) === null) return true;
  return def.unlockedByCard === true && cardThatOpens('unit', type) === null;
}

/** The heading a unit's page is filed under. See `ROW_GROUPS`. */
function unitGroup(type: UnitTypeId): string | undefined {
  const def = unitDef(type);
  if (unitIsAbsent(type)) return ABSENT_GROUP;
  if (def.unlockedByLeader === true) return LEADER_GROUP;
  if (def.unlockedByCard === true) return CARD_GROUP;
  return undefined;
}

/**
 * The units that upgrade to each unit: `UnitDef.upgradesTo` read backwards,
 * built on first use. A unit nobody can get is left out, so a page never names
 * a way in that the game does not have.
 */
let upgradeSources: Partial<Record<UnitTypeId, UnitTypeId[]>> | null = null;

function upgradesFrom(type: UnitTypeId): readonly UnitTypeId[] {
  if (upgradeSources === null) {
    const index: Partial<Record<UnitTypeId, UnitTypeId[]>> = {};
    for (const from of UNIT_TYPE_IDS) {
      const to = unitDef(from).upgradesTo;
      if (to === undefined || unitIsAbsent(from)) continue;
      (index[to] ??= []).push(from);
    }
    upgradeSources = index;
  }
  return upgradeSources[type] ?? [];
}

/**
 * The acts a prophet's charges pay for, in the order its sheet lists them.
 * The cost of each is `rules.religion.prophetCosts`, read by the caller.
 */
const PROPHET_ACT_WORDS: readonly (readonly [keyof typeof RULES.religion.prophetCosts, string])[] = [
  ['foundReligion', ref('concept', 'foundingReligion', 'found a religion')],
  ['plantHolySite', `plant a further ${ref('improvement', 'holySite', 'holy site')}`],
  ['gainBelief', 'draw a belief'],
  ['proclaim', `${ref('concept', 'proclamation', 'proclaim')} the faith`],
  ['empireRite', `say a ${ref('rite', 'about', 'rite')} over every city`],
];

/**
 * What a unit's markers mean, one short sentence a marker.
 *
 * Every marker is a field whose presence is the rule (`CLAUDE.md`: nothing in
 * `src/sim/` compares a unit type against a name), and this is the one place
 * those fields are read back as words. A sentence says only what this unit
 * does that other units do not. The rules every unit of a kind shares (how a
 * ship moves, how a charge is spent, how a resource copy is held, exploring on
 * its own) are on the lead page of the shelf. Every figure is read from
 * `RULES`.
 */
function unitMarkers(def: UnitDef): CompendiumClause[] {
  const out: CompendiumClause[] = [];
  // The page of the whole system, which a religious unit points at in place of
  // explaining it (the user, 2026-11-21: "maybe just a line that says: see
  // 'faith and religion'").
  const seeFaith = { text: `See ${ref('concept', 'religion', 'Faith and religion')}.` };
  const proclaim = ref('concept', 'proclamation', 'proclaim');
  if (def.foundsCity) out.push({ text: 'Founds a city. Is used up when it does.' });
  if (def.haltsGrowth) {
    out.push({
      text: 'Stops its city storing food for growth while it is first in the build queue.',
    });
  }
  if (def.prophesies === true) {
    const costs = RULES.religion.prophetCosts;
    const acts = PROPHET_ACT_WORDS.map(([verb, words]) => `${words} ${figure(costs[verb])}`);
    out.push({
      text: `Spends charges on its acts: ${acts.join(', ')}. Is used up when it has no charges left.`,
    });
    out.push(seeFaith);
  }
  if (def.proclaims === true) {
    out.push({
      text: `Spends one charge on each act: ${proclaim} the faith over a small area, heal your units beside it, or leave ${withArticle(buildingRef('relic'))} in a city with ${withArticle(buildingRef('cathedral'))}.`,
    });
    out.push(seeFaith);
  }
  if (def.purges === true) {
    const faith = RULES.religion;
    out.push({
      text: `Purges: every rival religion loses ${figure(faith.purgeLump)} pressure in each city within ${figure(faith.purgeRange)} hexes. Is used up when it does.`,
    });
    out.push({
      text: `Gives ${signedFigure(faith.inquisitorAuraStrength)} combat strength to your units within ${figure(faith.inquisitorAuraRange)} ${plural(faith.inquisitorAuraRange, 'hex', 'hexes')}. A second inquisitor adds nothing.`,
    });
    out.push(seeFaith);
  }
  if (def.greatWork === true) {
    out.push({
      text: 'Does the act of its family, or builds the work of its family. Is used up when it does.',
    });
  }
  if (def.routeOnly === true) {
    out.push({
      text: 'Comes with a route you hire on the Trade screen. It is not built and not bought in a city.',
    });
  }
  if (def.trades === true) {
    out.push({
      text: 'Walks between the two cities of its route and lays road on every land hex it crosses.',
    });
    out.push({
      text: 'Is plundered when an enemy melee unit attacks it: the caravan is destroyed, its route ends, and the attacker takes the cargo.',
    });
  }
  // The user's own wording for the Scout's line, 2026-11-21.
  if (def.ignoresTerrainCost === true) out.push({ text: 'Ignores terrain costs to movement.' });
  if (def.ignoresHillCost === true) out.push({ text: 'Ignores the movement cost of hills.' });
  // The ship's own clauses. Each is asked of a marker on the row (`hitAndRun`,
  // `blockades`), never of a class name. `bombard` prints nothing here: its
  // bonus is a combat line, which `describeUnitRow` words.
  if (def.hitAndRun === true) {
    const naval = RULES.naval;
    out.push({
      text: `Keeps its movement after an attack, less ${figure(naval.hitAndRunCost)}. Attacks one time a turn.`,
    });
    out.push({
      text: `Escorts a land unit on its hex at sea: that unit defends with this ship’s strength if it is higher, and does not lose the ${figure(naval.atSeaPenalty)} strength a unit at sea loses.`,
    });
  }
  if (def.blockades === true) {
    const naval = RULES.naval;
    out.push({
      text: `Gains ${signedFigure(naval.lineBonusPerHull)} combat strength for each friendly ship of its kind beside it, to at most ${signedFigure(naval.lineBonusMax)}.`,
    });
    out.push({
      text: 'Blockades an enemy harbour beside it: the water around the ship is closed for a siege, and the trade routes of the city pay nothing.',
    });
  }
  if (def.mirrors !== undefined) {
    out.push({
      text: `Takes the strength of the best ${filterWords({ modelClass: def.mirrors.modelClass }).replace(/s$/, '')} your empire can build on the day you buy it. Costs ${figure(def.mirrors.costPercent)}% of the production cost of that unit.`,
    });
  }
  if (def.minCityPop > 0) {
    out.push({ text: `Needs a city of ${figure(def.minCityPop)} or more citizens to build it.` });
  }
  return out;
}

/**
 * How a unit with its own bank is bought, as one sentence, or `null` for a
 * unit that is built. The currency, the building the city needs and the rise
 * in price are the row's own (`UnitPurchaseSpec`).
 */
function unitPurchaseWords(def: UnitDef): string | null {
  const spec = def.purchase;
  if (spec === undefined) return null;
  const needs = spec.building === undefined ? '' : ` that has ${withArticle(buildingRef(spec.building))}`;
  const rise =
    spec.increment === undefined || spec.increment === 0
      ? ''
      : ` Each purchase raises the price of the next by ${figure(spec.increment)}.`;
  return spec.exclusive === true
    ? `Bought with ${spec.currency} in a city${needs}. Cannot be built.${rise}`
    : `Can also be bought with ${spec.currency} in a city${needs}.${rise}`;
}

function unitEntry(type: UnitTypeId): CompendiumEntry {
  const def = unitDef(type);
  // Three kinds of row have no production price: a great person is recruited
  // with renown, a row that names its own bank exclusively is bought, and a
  // caravan comes with the route it carries (`buildError` refuses all three).
  const unbuildable =
    def.greatWork === true || def.purchase?.exclusive === true || def.routeOnly === true;
  // `unitRosterCost` is the size line and the column line of `explainUnitCost`,
  // which take no game. What a city pays more than that is said on the lead
  // page of the shelf.
  const priced = unbuildable ? '' : `${figure(unitRosterCost(type))}${YIELD_GLYPH.production}`;
  const wants = requiredResourcesOf(def);
  const absent = unitIsAbsent(type);
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
    ...row('Charges', def.charges === undefined ? '' : figure(def.charges)),
    ...row('Production cost', priced),
    ...row(
      'Purchase cost',
      // A row that mirrors another has no figure of its own to print: its
      // price is a share of another unit's, and `unitMarkers` says the share.
      def.purchase === undefined || def.purchase.cost === undefined
        ? ''
        : `${figure(def.purchase.cost)} ${def.purchase.currency}`,
    ),
    // Always a row, and `None` when it costs nothing: an absent upkeep would
    // read as a figure the page forgot (Entry XLI).
    ...row('Upkeep each turn', upkeepRow(unitUpkeep(type))),
    // One copy of either resource will do, so the names are joined by "or"
    // (`resourceRefWords`). The rule that the unit holds the copy is on the
    // lead page of the shelf and on each strategic resource.
    ...row('Needs a copy of', resourceRefWords(wants)),
    ...row('Upgrades from', upgradesFrom(type).map(unitRef).join(', ')),
    ...row('Upgrades to', def.upgradesTo === undefined ? '' : unitRef(def.upgradesTo)),
  ];
  const clauses: CompendiumClause[] = [];
  // What it does: the markers, then the row's own combat lines and effects in
  // the simulation's words (`describeUnitRow`). This is where a leader's unit
  // says its special ability.
  clauses.push(...unitMarkers(def));
  clauses.push(
    ...describeUnitRow(type).map((entry) => ({ text: entry.text, deferred: entry.deferred })),
  );
  // How you get it: the bank, then the one opening line.
  // A unit that is not in the game says so in the opening line, and the line
  // is drawn as a band.
  const bought = absent ? null : unitPurchaseWords(def);
  if (bought !== null) clauses.push({ text: bought });
  clauses.push({ ...queueOpening('unit', type), ...(absent ? { standing: true } : {}) });
  // The row's own note: a fact a player needs that no field of the row can
  // print. The notes were rewritten on 2026-11-21 (the user: "Please rewrite
  // the notes, yes"), and a note that said a generated line again was deleted,
  // so what is left is printed, after the effects.
  if (def.note !== undefined && !absent) clauses.push({ text: def.note, note: true });
  for (const waiting of def.deferred ?? []) clauses.push({ text: waiting, deferred: true });
  return {
    id: compendiumId('unit', type),
    section: 'unit',
    name: def.name,
    group: unitGroup(type),
    eyebrow: `${def.category} unit`,
    mark: { kind: 'badge', badge: badgeClassOf(def) },
    rows,
    clauses,
    flavor: null,
  };
}

// --- buildings and wonders --------------------------------------------------

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
    case 'trueCapital':
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
    case 'terrainBeside':
      return `a city built on or next to ${site.terrain}`;
    case 'hasImprovement':
      return `a city with ${withArticle(improvementDef(site.improvement).name)} inside its borders`;
    // The two composites, and the only ones the scope vocabulary has — see
    // `CityScope`. A conjunction reads as a list and a disjunction as a choice,
    // which is the whole difference a player needs: the Stable wants a pasture
    // **or** a camp, and a wonder that wanted both would say so.
    case 'all':
      return words(site.of.map(scopeWords));
    case 'any':
      return site.of.map(scopeWords).join(' or ');
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
 *
 * **Gated lines only.** The lines a building pays from the day it is raised are
 * said by the row's own describer (`describeBuildingRow`), which is where they
 * moved with the charters' pass of 2026-09-05: no technology hands one over, so
 * nothing about them is a *later* gift, and printing them twice on one shelf was
 * the price of this page having its own copy of the sentence.
 */
function laterGifts(id: BuildingId): CompendiumClause[] {
  return (laterGiftIndex()[id] ?? []).map((clause) => ({ ...clause }));
}

/**
 * The clauses `laterGifts` hands out, grouped by building, built on first use
 * and kept for the life of the page.
 *
 * Why an index: `techGifts(tech)` walks every building, improvement and
 * resource row, and asking it again for every tech once per building made this
 * one helper about four fifths of the Compendium's whole generation time
 * (measured 2026-10-06 in Node: about 1.6 s of 2.1 s over ten generations).
 * Walking the tree once gives the same clauses in the same order, because the
 * outer loop is still `TECH_IDS` order. The tables are static data, so nothing
 * during a game can make the index stale.
 */
let laterGiftClauses: Partial<Record<BuildingId, CompendiumClause[]>> | null = null;

function laterGiftIndex(): Partial<Record<BuildingId, CompendiumClause[]>> {
  if (laterGiftClauses !== null) return laterGiftClauses;
  const index: Partial<Record<BuildingId, CompendiumClause[]>> = {};
  for (const tech of TECH_IDS) {
    for (const gift of techGifts(tech)) {
      if (gift.kind !== 'buildingTileYield') continue;
      (index[gift.id] ??= []).push({ text: `${techDef(tech).name}: ${giftWords(gift)}` });
    }
  }
  laterGiftClauses = index;
  return index;
}

/**
 * **A row's own cost premium** (`BuildingDef.costPercent`, Scientific batch
 * S4: the Mouseion), as the amount and its share ("+40⚙ (+30%)"), or empty
 * for a row with none.
 *
 * The amount is the premium line of the cost fold with no empire in hand
 * (`explainBuildingCost`). That fold puts the premium last, and with no empire
 * there is no line after it, so the last line is the premium. The production
 * cost row above it is the fold's total, the premium included.
 */
function costPremiumFigures(id: BuildingId): string {
  const percent = buildingDef(id).costPercent ?? 0;
  if (percent === 0) return '';
  const lines = explainBuildingCost(id);
  const premium = lines.length > 1 ? lines[lines.length - 1]! : null;
  if (premium === null || premium.amount === 0) return '';
  return `${signedFigure(premium.amount)}${YIELD_GLYPH.production} (${percentFigure(percent)})`;
}

/**
 * Is this building row out of the game? A leader's building that no leader
 * holds, a row the technology tree does not reach (`awaitsTech`), and a row
 * whose card is withdrawn. A withdrawn row (`retired`) has no page at all.
 */
function buildingIsAbsent(id: BuildingId): boolean {
  const def = buildingDef(id);
  if (def.awaitsTech === true) return true;
  if (def.unlockedByLeader === true && leaderThatOpens('building', id) === null) return true;
  return def.unlockedByCard === true && cardThatOpens('building', id) === null;
}

/** The heading a building's page is filed under. See `ROW_GROUPS`. */
function buildingGroup(id: BuildingId): string | undefined {
  const def = buildingDef(id);
  if (buildingIsAbsent(id)) return ABSENT_GROUP;
  if (def.unlockedByLeader === true) return LEADER_GROUP;
  // A row the tree also names (the Aqueduct, which a charter technology opens
  // early) is an ordinary row with a second way in.
  if (def.unlockedByCard === true && gatingTech('building', id) === null) return CARD_GROUP;
  return undefined;
}

/**
 * What a building's markers mean, one short sentence a marker.
 *
 * These are the facts about getting or keeping the building that
 * `describeBuildingRow` leaves out on purpose (its docblock: the gates are the
 * Compendium's to state). A fact every wonder shares is on the lead page of
 * the Wonders shelf, not here.
 */
function buildingMarkers(id: BuildingId): CompendiumClause[] {
  const def = buildingDef(id);
  const out: CompendiumClause[] = [];
  // The class first, then its limit: a card that asks for "an empire building"
  // means this class, and the limit is the rule a player plans around. The
  // class's sentence is the describers' own and links to the Concepts page
  // (the user, 2026-11-19).
  // One bullet (the user, 2026-11-21): the limit, then the loss. A row with the
  // limit and without the class says the limit alone.
  if (def.empireBuilding === true) {
    out.push({ text: EMPIRE_BUILDING_WORDS.entry, note: true });
  } else if (def.oncePerEmpire === true) {
    out.push({ text: 'Your empire can build only one.', note: true });
  }
  if (def.publicWork === true) {
    out.push({ text: 'A public work: a card that counts public works counts this.', note: true });
  }
  if (def.waters === true) {
    out.push({
      text: 'A city not beside fresh water grows more slowly until this is built.',
      note: true,
    });
  }
  if (def.easesUnrest === true) {
    out.push({ text: 'A city in unrest that holds this settles faster.', note: true });
  }
  if (def.consecrated === true) {
    out.push({
      text: 'When it is finished, the city gets one consecration, picked at random. The consecrations are at the end of the Beliefs shelf.',
      note: true,
    });
  }
  if (def.faithBuysWonders === true) {
    out.push({ text: 'This city can buy a wonder with faith.', note: true });
  }
  if (def.restoresMovementOn !== undefined) {
    out.push({
      text: `Your military units get all their movement back each time they stop on ${withArticle(improvementRef(def.restoresMovementOn))} inside the borders of this city.`,
      note: true,
    });
  }
  if (def.queueFloor !== undefined) {
    out.push({
      text: `The build queue of this city must always hold ${figure(def.queueFloor)} or more things.`,
      note: true,
    });
  }
  // A row a card opens: what happens when the card leaves. A charter is never
  // seated and is held for the whole game, so it has nothing to say here. A
  // belief's rule is the town's, and the describer says it (`followingOnly`).
  if (def.unlockedByCard === true) {
    const card = cardThatOpens('building', id);
    if (card?.kind === 'order' && card.charter !== true) {
      out.push({
        text: 'You can build this only while that Order is in a chair. One you have built stays.',
        note: true,
      });
    } else if (card?.kind === 'doctrine') {
      out.push({
        text: 'You can build this once you hold that Doctrine, which you keep for the whole game.',
        note: true,
      });
    }
  }
  if (def.acceptsContributions === true) {
    out.push({
      text: 'While this is first in the build queue of a city, you can pay gold or faith toward it.',
      note: true,
    });
  }
  if (def.endsTheGame === true) {
    // The bead gate is read from `BEAD_RULES`, so a new threshold changes this
    // sentence and no prose.
    out.push({
      text: `You can begin it only while you hold ${figure(BEAD_RULES.threshold)} beads. The empire that finishes it wins the game.`,
      note: true,
    });
  }
  return out;
}

function buildingEntry(id: BuildingId): CompendiumEntry {
  const def = buildingDef(id);
  const wonder = isWonder(id);
  // A row nobody builds has no price to print: a granted row and a placed row
  // are refused by the queue and by the bank (`buildError`, `purchaseError`).
  const unbuildable = def.grantedOnly === true || def.placed === true;
  const rows: CompendiumRow[] = [
    ...row(
      'Production cost',
      unbuildable ? '' : `${figure(buildingProductionCost(id))}${YIELD_GLYPH.production}`,
    ),
    ...row('Cost premium', costPremiumFigures(id)),
    // `None` rather than an omission, as on the unit shelf. A wonder reads
    // `None` on purpose: a wonder has no upkeep.
    ...row('Upkeep each turn', upkeepRow(buildingUpkeep(id))),
    ...row('Can only be built in', siteRequirement(def)),
    // The chain (`BuildingDef.requiresBuilding`): the building that must
    // already stand in the same city, as a link to its page.
    ...row(
      'Needs standing here',
      def.requiresBuilding === undefined ? '' : buildingRef(def.requiresBuilding),
    ),
  ];
  // What it does, in the simulation's own words. `describeBuildingRow` carries
  // the yields, the renown, the trade routes, the production bonus and every
  // effect and field of the row, so the page prints none of them a second time
  // as a row (the pass of 2026-11-21: each was printed two times before). The
  // clauses lead the page because an Order that unlocks a building prints the
  // same list on its own face, and the two must not differ.
  const clauses: CompendiumClause[] = describeBuildingRow(id).map((entry) => ({
    text: entry.text,
    deferred: entry.deferred,
  }));
  // How you get it: the one opening line. A row that is not in the game says
  // so in this line, and the line is drawn as a band.
  clauses.push({ ...queueOpening('building', id), ...(buildingIsAbsent(id) ? { standing: true } : {}) });
  // What technologies later do for this building: the lines that pay the
  // building's ground more, read out of `techGifts`.
  clauses.push(...laterGifts(id));
  clauses.push(...buildingMarkers(id));
  // The row's own note: a fact a player needs that no field of the row can
  // print (the Temple's guard against other religions, the Relic's limit). The
  // notes were rewritten on 2026-11-21, and a note that said the generated
  // lines again was deleted from the data.
  if (def.note !== undefined && !buildingIsAbsent(id)) {
    clauses.push({ text: def.note, note: true });
  }
  return {
    id: compendiumId(wonder ? 'wonder' : 'building', id),
    section: wonder ? 'wonder' : 'building',
    name: def.name,
    group: buildingGroup(id),
    eyebrow: `${def.category} ${wonder ? 'wonder' : 'building'}`,
    mark: charterWorkIcons[id] ? { kind: 'charter', id } : { kind: 'glyph', glyph: wonder ? '✶' : '▣' },
    rows,
    clauses,
    flavor: null,
  };
}

// --- improvements -----------------------------------------------------------

/** Is this improvement out of the game? A leader's row that no leader holds. */
function improvementIsAbsent(id: ImprovementId): boolean {
  const def = improvementDef(id);
  return def.unlockedByLeader === true && leaderThatOpens('improvement', id) === null;
}

/** The heading an improvement's page is filed under. See `ROW_GROUPS`. */
function improvementGroup(id: ImprovementId): string | undefined {
  const def = improvementDef(id);
  if (improvementIsAbsent(id)) return ABSENT_GROUP;
  if (def.unlockedByLeader === true) return LEADER_GROUP;
  if (def.tended === true || def.unlockedByCard === true) return CARD_GROUP;
  if (def.greatPerson !== undefined) return WORKS_GROUP;
  return undefined;
}

/**
 * What an improvement's markers mean, one short sentence a marker, in the
 * order a player asks: where it may stand, what it does there, what it counts
 * as.
 */
function improvementMarkers(id: ImprovementId): CompendiumClause[] {
  const def = improvementDef(id);
  const out: CompendiumClause[] = [];
  // A great person's work stands on any land hex but a mountain. The holy site
  // has its own rules for where a prophet may build it, which the prophet's
  // sheet states, so the sentence is not said for it.
  if (def.greatPerson !== undefined && def.greatPerson !== 'prophet') {
    out.push({ text: 'Can be built on any land hex that is not a mountain.' });
  }
  if (def.hillsIf !== undefined && def.hillsIf.length > 0) {
    // The waiver forgives the ground the row refuses, so the opening is read
    // off `requiresHills`: the farm wants flat ground and the waiver gives it a
    // hill; the mine wants hills and the waiver gives it flat ground.
    const allowed = def.requiresHills === true ? 'Flat ground is' : 'Hills are';
    out.push({
      text: `${allowed} allowed where the hex ${eitherWords(
        def.hillsIf.map((why) => HILLS_WAIVER_WORDS[why]),
      )}.`,
    });
  }
  if (def.adjacentImprovement !== undefined) {
    const near = def.adjacentImprovement;
    out.push({
      text: `Can also be built on ${eitherWords(near.terrain.map((terrain) => terrain))} when a hex next to it has ${withArticle(improvementRef(near.improvement))}.`,
    });
  }
  if (isUniqueImprovement(id)) out.push({ text: 'Counts as a unique improvement.' });
  if (def.requiresDryGround) out.push({ text: 'Needs land without fresh water.' });
  if (def.requiresRiver) out.push({ text: 'Needs a river along this hex.' });
  if (def.renown) out.push({ text: `Adds ${figure(def.renown.amount)} renown per turn toward great ${def.renown.family}s.` });
  if (def.perNeighbour) {
    const { on, yields } = def.perNeighbour;
    out.push({ text: `Gains ${tileYieldFigures({ food: 0, production: 0, gold: 0, ...yields })} for each neighbouring ${tileConditionWords(on)}.` });
  }
  if (def.givesNeighbours) {
    const { on, yields } = def.givesNeighbours;
    out.push({ text: `Each neighbouring ${tileConditionWords(on)} gains ${tileYieldFigures({ food: 0, production: 0, gold: 0, ...yields })}.` });
  }
  if (def.requiresAdjacentMountain === true) out.push({ text: 'Needs a mountain next to it.' });
  if (def.requiresAdjacentHighGround) out.push({ text: 'Needs a hill or mountain next to it.' });
  if (def.landBeside !== undefined) {
    out.push({ text: `Needs ${figure(def.landBeside)} or more of your land hexes next to it.` });
  }
  if (def.beyondBorders !== undefined) {
    out.push({
      text: `Built only on unowned ground with no improvement, at most ${figure(def.beyondBorders)} ${plural(def.beyondBorders, 'hex', 'hexes')} outside your borders.`,
    });
  }
  if (def.onePerTown === true) out.push({ text: 'A city can have only one inside its borders.' });
  if (def.countsAs !== undefined) {
    out.push({
      text: `Counts as ${withArticle(improvementRef(def.countsAs))}: everything that pays on one pays on this.`,
    });
  }
  if (def.claimsNeighbours === true) {
    out.push({ text: 'Claims its hex and every hex next to it for your empire.' });
  }
  if (def.claimsUnowned !== undefined) {
    out.push({
      text: `Claims its hex and every unowned hex within ${figure(def.claimsUnowned)} ${plural(def.claimsUnowned, 'hex', 'hexes')} for your nearest city. A city founded on it keeps that land.`,
    });
  }
  if (def.watersAllNeighbours) {
    out.push({ text: 'The neighbouring hexes have fresh water.' });
  } else if (def.watersBeside === true) {
    out.push({
      text: 'Your farms on the hexes next to it count as having fresh water. It waters only your own farms.',
    });
  }
  if (def.copiesNeighbours === true) {
    out.push({
      text: 'Yields what each hex around it yields. Only hexes inside your borders count, and never a city or another of its kind. It pays only while a citizen works it.',
    });
  }
  if (def.yieldsAs !== undefined) {
    const work = improvementDef(def.yieldsAs.improvement).name.toLowerCase();
    const ground = terrainDef(def.yieldsAs.terrain).name.toLowerCase();
    out.push({
      text: `Yields as ${withArticle(work)} on ${ground}, without the bonus for fresh water. The hex stays water for every other rule.`,
    });
  }
  if (def.tended === true) {
    out.push({
      text: 'Cards count its hex as wild land. It cannot be pillaged, and it gives access to no resource.',
    });
  }
  // **A great person's work** (`isGreatPersonWork`): the five works a great
  // person builds, the holy site, and a row that sets `countsAsGreatWork` (the
  // Paradise Garden, which a worker builds). The user, 2026-11-21: "Paradise
  // gardens for example, should have an entry noting they count as great
  // people." The two sentences are what the predicate does in the simulation:
  // every count of works reads it (cards, legacies, commissions, a capture's
  // riders), and `openedResource` gives a work the resource under it.
  if (isGreatPersonWork(id)) {
    out.push({
      text:
        def.greatPerson === undefined
          ? 'Counts as a great person’s work, though a worker builds it: every card, legacy and commission that counts works counts this.'
          : def.greatPerson === 'prophet'
            ? 'Counts as a great person’s work: every card, legacy and commission that counts works counts this.'
            : 'A great person’s work: every card, legacy and commission that counts works counts this.',
    });
    out.push({
      text: 'It gives access to a resource on its hex, and it can be built on a resource that asks for another improvement.',
    });
  }
  // What technologies later add to it (`ImprovementDef.upgrades`), named by the
  // technology. The technology's own page said this, and the improvement's did
  // not.
  for (const upgrade of def.upgrades ?? []) {
    const water = upgrade.requiresFreshwater === true ? ' beside fresh water' : '';
    out.push({ text: `${techRef(upgrade.tech)}: ${tileYieldFigures(upgrade.add)}${water}.` });
  }
  return out;
}

function improvementEntry(id: ImprovementId): CompendiumEntry {
  const def: ImprovementDef = improvementDef(id);
  // A row that may stand only on the resources it gives access to prints the
  // list one time, under a label that says both.
  const opens = def.improvesResource ?? [];
  const only = def.requiresResource ?? [];
  const sameList = only.length > 0 && only.length === opens.length && only.every((one) => opens.includes(one));
  const resourceRefs = (ids: readonly ResourceId[]): string =>
    ids.map((resource) => ref('resource', resource, resourceDef(resource).name)).join(', ');
  const rows: CompendiumRow[] = [
    ...row('Adds to the hex', tileYieldFigures(def.yields)),
    ...row('Happiness', def.happiness === undefined ? '' : signedFigure(def.happiness)),
    ...row('Defence for units on it', def.defense === undefined ? '' : signedFigure(def.defense)),
    ...row('Work charges used', def.greatPerson !== undefined ? '' : figure(def.chargeCost)),
    ...row('Built by', def.greatPerson === undefined ? '' : withArticle(def.greatPerson)),
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
    ...(sameList
      ? row('Built only on, and gives access to', resourceRefs(opens))
      : [...row('Built only on', resourceRefs(only)), ...row('Gives access to', resourceRefs(opens))]),
  ];
  const clauses: CompendiumClause[] = improvementMarkers(id);
  // How you get it: the row's own technology, the leader, the card, or the
  // great person who builds it.
  clauses.push({ ...improvementOpening(id), ...(improvementIsAbsent(id) ? { standing: true } : {}) });
  // The parts of the row's design the game does not have yet, struck through.
  for (const waiting of def.deferred ?? []) clauses.push({ text: waiting, deferred: true });
  // Whose row this is, read off the roster so a row that changes hands changes
  // the eyebrow with it.
  const whoseRow = def.unlockedByLeader === true ? leaderThatOpensImprovement(id) : null;
  return {
    id: compendiumId('improvement', id),
    section: 'improvement',
    name: def.name,
    group: improvementGroup(id),
    eyebrow:
      def.greatPerson === 'prophet'
        ? 'improvement built by a prophet'
        : def.greatPerson !== undefined
          ? 'improvement built by a great person'
          : whoseRow !== null
          ? `improvement, ${whoseRow}'s alone`
          : 'improvement',
    mark: charterWorkIcons[id] ? { kind: 'charter', id } : { kind: 'glyph', glyph: def.emoji },
    rows,
    clauses,
    flavor: null,
  };
}

// --- resources --------------------------------------------------------------

/**
 * The units that need a copy of each resource: `requiredResourcesOf` read
 * backwards, built on first use. A unit nobody can get is left out.
 */
let resourceUsers: Partial<Record<ResourceId, UnitTypeId[]>> | null = null;

function unitsThatNeed(id: ResourceId): readonly UnitTypeId[] {
  if (resourceUsers === null) {
    const index: Partial<Record<ResourceId, UnitTypeId[]>> = {};
    for (const unit of UNIT_TYPE_IDS) {
      if (unitIsAbsent(unit)) continue;
      for (const resource of requiredResourcesOf(unitDef(unit))) (index[resource] ??= []).push(unit);
    }
    resourceUsers = index;
  }
  return resourceUsers[id] ?? [];
}

function resourceEntry(id: ResourceId): CompendiumEntry {
  const def: ResourceDef = resourceDef(id);
  const opener = improvementForResource(id);
  // Copies per seam (`copiesPerSource`): only a strategic row has a quantity.
  const copies = def.copiesPerSource;
  const rows: CompendiumRow[] = [
    ...row('Adds to the hex', tileYieldFigures(def.yields)),
    ...row('Terrain', eitherWords(def.validTerrain.map((terrain) => terrain))),
    ...row('Features', eitherWords((def.validFeatures ?? []).map((feature) => feature))),
    ...row('Flat or hills', def.hills === undefined ? '' : def.hills ? 'hills' : 'flat'),
    // Until this technology is researched the resource is not drawn, pays
    // nothing and cannot be used. The lead page of the shelf says so one time.
    ...row('Revealed by', def.requiresTech === undefined ? '' : techRef(def.requiresTech)),
    ...row('Needs improvement', opener === null ? '' : improvementRef(opener)),
    ...row(
      'Copies per seam',
      copies === undefined ? '' : copies[0] === copies[1] ? `${copies[0]}` : `${copies[0]}–${copies[1]}`,
    ),
    ...row('Units that need a copy', unitsThatNeed(id).map(unitRef).join(', ')),
  ];
  const clauses: CompendiumClause[] = describeResourceSignature(id).map((line) => ({
    text:
      line.fromAge === undefined ? line.text : `${line.text}, from ${ageWord(line.fromAge)} onward`,
  }));
  // One copy is enough for the bonus (the user, 2026-09-18: *"players gain this
  // bonus for having at least one copy, only applies once regardless of number
  // of copies"*). Said on every row that has a bonus, because a reader cannot
  // tell it from the effect.
  if (clauses.length > 0) {
    clauses.push({
      text: 'Your empire needs only a single improved copy for this. More copies add nothing to it.',
      note: true,
    });
  }
  if (def.kind === 'strategic') {
    // The trade sentence is asked of the simulation's own rule
    // (`isLendableResource`, `deals.ts`), so it leaves this page on the day a
    // strategic resource can be traded.
    const trade = isLendableResource(id) ? '' : ' A strategic resource cannot be traded away.';
    clauses.push({
      text: `A unit that needs this holds one copy for as long as it lives.${trade}`,
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
function giftWords(gift: TechGift, linked = false): string {
  // On a charter technology's page each thing it opens is a link to that
  // thing's own page (the user, 2026-11-21: "this should link to the qanat").
  // The tree's own technologies keep the plain name, which is the star chart's
  // line.
  if (linked) {
    const mark =
      gift.kind === 'unit'
        ? unitRef(gift.id)
        : gift.kind === 'building'
          ? buildingRef(gift.id)
          : gift.kind === 'improvement'
            ? improvementRef(gift.id)
            : gift.kind === 'ability' && (RITE_IDS as readonly string[]).includes(gift.id)
              ? ref('rite', gift.id, gift.name)
              : null;
    if (mark !== null) return giftWords({ ...gift, name: mark });
  }
  if (gift.kind === 'unit') {
    // Priced out of the bank that actually buys one. A row that names its own
    // bank exclusively is never built (`buildError`), and its `cost` field is a
    // zero nobody pays — printing it as a hammer figure told a reader the augur
    // was free.
    const def = unitDef(gift.id);
    const price =
      def.purchase !== undefined && def.purchase.exclusive === true && def.purchase.cost !== undefined
        ? `${figure(def.purchase.cost)} ${def.purchase.currency}`
        : `${figure(unitRosterCost(gift.id))}${YIELD_GLYPH.production}`;
    return `New unit: ${gift.name} — ${price}`;
  }
  if (gift.kind === 'building') {
    // The tree hands wonders over on the same list as ordinary buildings, and a
    // reader deciding what to research wants to know which is which: one is a
    // thing every city may raise and the other is a race against the world.
    const kind = isWonder(gift.id) ? 'New wonder' : 'New building';
    return `${kind}: ${gift.name} — ${figure(buildingProductionCost(gift.id))}${YIELD_GLYPH.production}`;
  }
  if (gift.kind === 'improvement') {
    const charges = improvementDef(gift.id).chargeCost;
    return `New improvement: ${gift.name} — ${figure(charges)} work ${plural(charges, 'charge')}`;
  }
  if (gift.kind === 'reveal') return `Reveals the resource ${gift.name} on the map`;
  // **A renewal is the star chart's own line** (batch TT3, `docs/flags.md`
  // (kkkkkkk)): the improvement, then what it adds, "Farm +1🌾 on fresh water".
  // The node face, the hover card and this page print the same words, from the
  // same composer (`renewalNote`).
  if (gift.kind === 'renewal') return `${gift.name} ${renewalNote(gift)}`;
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
  // **An ability, in the hover card's words** (batch TT3): its name, then its
  // line (`abilityNote`), "New ability: Sea Legs — Soldiers cross coast and
  // lakes". A verb whose rule is a game term is its name alone, as a keyword to
  // that term's page (Siege).
  const concept = abilityConcept(gift);
  if (concept !== null) return `New ability: ${ref('concept', concept, gift.name)}`;
  const note = abilityNote(gift);
  return note === '' ? `New ability: ${gift.name}` : `New ability: ${gift.name} — ${note}`;
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
  // print. A node over the bar returns one *named rule*, which is a keyword ref
  // into the Rules shelf — the same clause the card prints, so the reader who
  // followed the name off the chart lands on the page it points at. Every other
  // gift is one clause, as it always was.
  const clauses: CompendiumClause[] = techGifts(id).flatMap((gift) =>
    gift.kind === 'techEffect'
      ? techRuleClauses(gift.id).map((text) => ({ text }))
      : [{ text: giftWords(gift) }],
  );
  if (clauses.length === 0) {
    clauses.push({ text: 'Unlocks nothing by itself. It is a step toward later technologies.' });
  }
  // **The note, under the rules** (batch L1, §2): the row's own paragraph, in
  // the italic a standing caveat is printed in, exactly as an Order's `note` is
  // on its shelf. It stopped being the face when the ruling of 2026-09-08 asked
  // for figures on the chart, and this is where it went — every node that
  // carries one, including the ones that hand over no rule at all and therefore
  // had nowhere to print it.
  for (const line of techRuleNote(id)) clauses.push({ text: line, note: true });
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

/**
 * The heading the charter technologies are filed under, at the end of the
 * Technologies shelf (Scientific batch S12). The tree's own technologies carry
 * no heading, so the shelf reads as the tree and then this one group.
 */
export const CHARTER_TECH_GROUP = 'Charter technologies';

/**
 * **A charter technology's price, before any card changes it**: the first line
 * of `explainTechCost` (`tech.ts`), the column price. Since batch DS9 a charter
 * technology costs the ordinary price (`docs/flags.md` item (hhhhhhh)), so the
 * premium line the page printed is gone.
 *
 * The book takes no game, and `explainTechCost` needs one to read the cards an
 * empire holds, so the line is read here from the row.
 * `test/ui/compendiumCharterTechs.test.ts` checks it against `explainTechCost`
 * for a seat that holds no card, so the book and the price the game charges
 * cannot drift apart.
 */
export function charterTechPrice(id: TechId): number {
  return techDef(id).cost;
}

/**
 * **One charter technology's page** (Scientific batch S12): a technology only
 * an empire holding its charter may research (`TechDef.charter`).
 *
 * Generated from the row, like `techEntry`, with three differences:
 *
 *   - **The first clause names the charter** that opens it, as a mark to the
 *     card's page. `charterOpening` (`charterTech.ts`) is the star chart's
 *     reading of the same question.
 *   - **The price is printed** before any card (`charterTechPrice`): the
 *     column price, which since batch DS9 is the whole price. The star chart
 *     prints the lines for an empire with its cards in them.
 *   - **What knowing it gives is said in full**, its rules and its line traits
 *     both, never as a named rule. The words are the star chart's short lines
 *     (batch TT3): `techRuleLines` for the rules, and `describeTraitLines` for
 *     each trait with the trait's name in front, "Hoplite: Spearman to Pikeman
 *     +2 combat strength". A note under them says that a trait is kept through
 *     every upgrade, as the hover card's heading does.
 *
 * What it opens (buildings and improvements) is `techGifts` in the tree's own
 * words (`giftWords`), as on every other technology's page.
 */
function charterTechEntry(id: TechId): CompendiumEntry {
  const def = techDef(id);
  const price = charterTechPrice(id);
  const science = YIELD_GLYPH.science;
  const rows: CompendiumRow[] = [
    ...row('Research cost', `${figure(price)}${science}`),
    ...row('Requires first', words(def.prereqs.map((prereq) => techDef(prereq).name))),
  ];
  const charter = charterRef(id);
  const clauses: CompendiumClause[] = [
    {
      text:
        charter === null
          ? 'This technology’s charter has been withdrawn from the draft.'
          : `Opened by drafting ${charter}. Only an empire that holds that charter may research it.`,
    },
    ...techGifts(id)
      .filter((gift) => gift.kind !== 'techEffect')
      .map((gift) => ({ text: giftWords(gift, true) })),
    // Copied into the book's own clauses, which `entryNode` prints through
    // `setDescriptorText`, as `cardClauses` does for a card.
    ...techRuleLines(id).map((entry) => ({ text: entry.text, deferred: entry.deferred })),
    ...(def.traits ?? []).flatMap((trait) =>
      describeTraitLines(trait).map((entry) => ({
        text: `${trait.name}: ${entry.text}`,
        deferred: entry.deferred,
      })),
    ),
  ];
  if (clauses.length === 1) {
    clauses.push({ text: 'Unlocks nothing by itself.' });
  }
  for (const line of techRuleNote(id)) clauses.push({ text: line, note: true });
  if ((def.traits ?? []).length > 0) {
    clauses.push({ text: 'A line trait stays with its units through every upgrade.', note: true });
  }
  // What is true of every charter technology (its price is the ordinary one,
  // it does not count toward an age) is on the Technology page of the Concepts
  // shelf, one time, and not on each of these pages.
  return {
    id: compendiumId('tech', id),
    section: 'tech',
    name: def.name,
    group: CHARTER_TECH_GROUP,
    eyebrow: `${ageWord(def.age)} charter technology`,
    mark: { kind: 'glyph', glyph: def.glyph },
    rows,
    clauses,
    flavor: def.flavor ?? null,
  };
}

/**
 * One **named rule** — the page a node's `[[rule:…]]` clause points at.
 *
 * Generated, like every other entry on a generated shelf: the clauses are the
 * node's own rules read by the describer the card is read by
 * (`techRuleFullClauses`), and the paragraph is the row's `note`. Nothing here
 * is prose written about a number, which is the shelf rule this page had to be
 * built to obey — the reason the entry exists at all is that these rules are
 * *too long* for the chart, and a page that re-said them in a second voice would
 * have been the drift the Compendium's docblock forbids.
 *
 * The row that names it is quoted as a figure, because "which technology is
 * this?" is the first thing a reader who arrived by keyword asks.
 */
function ruleEntry(id: TechId): CompendiumEntry {
  const def = techDef(id);
  const clauses: CompendiumClause[] = techRuleFullClauses(id).map((text) => ({ text }));
  for (const line of techRuleNote(id)) clauses.push({ text: line, note: true });
  return {
    id: compendiumId('rule', id),
    section: 'rule',
    name: techRuleName(id),
    eyebrow: `${ageWord(def.age)} rule`,
    mark: { kind: 'glyph', glyph: '§' },
    rows: row('Comes from', def.name),
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
 * The three rungs, **with the mark the card in the hand wears** (U1).
 *
 * This shelf used to soften the field to "often · less often · seldom", on the
 * argument that "common" reads as a judgement about a card rather than a
 * statement about a deck. That argument held while rarity lived here and
 * nowhere else. It does not survive the ruling that put the field on the card
 * face: a player who has just been dealt a chip saying Rare and then looks the
 * card up must find the same word, or the book and the hand are two vocabularies
 * for one fact. So the words are `deckBadges.ts`' — one table, four surfaces —
 * and the ● ◆ ○ that leads them is the doc's own Rarity column
 * (`docs/orders-and-doctrines.md` §Rarity), which is also the sync test's.
 *
 * Nothing here invents a figure: the exact weights are a balance dial
 * (`rarityWeights`), and a card that printed one would be a card that lies the
 * day it is retuned.
 */
function rarityFigure(rarity: OrderRarity): string {
  return `${RARITY_MARK[rarity]} ${RARITY_WORD[rarity]}`;
}

/**
 * **The five bands in plain words** (`Band`, `statecraftData.ts`; the deck
 * sheets' Tier 0 to Tier IV). Band 3 was "final" until band 4 was added in the
 * deck implementation's foundation batch; it is "advanced" now, and "final"
 * names the new last band.
 *
 * `rarityFigure`'s argument, one field over. A band is a rung of the draft
 * ladder crossed with an age, and the row printed the rung's *number* — which
 * is an index into a table the player has never seen, and a digit on a card
 * that claims nothing. The five names are plain English and the Orders shelf's
 * lead page defines them once; nothing here restates the rule, because the two
 * halves of it (how many drafts, which age) are live data and a sentence that
 * named either would go stale on the next pass.
 */
const BAND_WORDS: readonly string[] = ['early', 'middle', 'late', 'advanced', 'final'];

/**
 * **Why a card a reader can read is a card they cannot draw**, or nothing.
 *
 * Two different silences, and a shelf that ran them together would be telling
 * the same lie about both. A **withdrawn** row is one the design took out: it
 * was dealt once, an empire that holds one holds it still, and nothing is
 * coming. A **deferred** row is one the design is waiting for: its sentence is
 * ratified, the shape it needs does not exist yet, and it joins the draft the
 * day it does. `orderIsDealt` is the simulation's own answer to "is this on a
 * shelf at all" and this reads it rather than re-deciding, so the pool, the
 * doc-sync and the book cannot drift apart.
 *
 * Generated off the row, never listed by hand: there are a great many deferred
 * rows today and there will be fewer every batch, and a list of names here
 * would be wrong within the week.
 */
function orderStanding(def: ReturnType<typeof orderDef>): CompendiumClause[] {
  if (def.retired === true) {
    return [
      {
        text: 'Withdrawn: this card is no longer dealt in any draft. An empire that took one before it was withdrawn keeps it, and it still pays what it says.',
        standing: true,
      },
    ];
  }
  // A commission (batch C) is dealt for its goal and reward, with no effects,
  // and so is a card whose whole text is a grant on the draft (Dominion batch
  // D5's The Sword of State and The Cleruchy).
  if (
    def.effects.length === 0 &&
    def.charter === undefined &&
    def.commission === undefined &&
    def.onDraft === undefined
  ) {
    return [
      {
        text: 'Not dealt yet: everything this card asks for has been agreed, and the game cannot do all of it yet. It is printed here so you can read it; it is in no deck until the rule underneath it is built.',
        standing: true,
      },
    ];
  }
  if (def.effects.length === 0 && def.deferred !== undefined) {
    return [
      {
        text: 'Not dealt yet: this charter opens something the game has not drawn up. It is printed here so you can read it; it joins the decks when the thing it opens exists.',
        standing: true,
      },
    ];
  }
  return [];
}

/**
 * **The shelf a card is filed under** — the Orders shelf's four kinds of
 * heading, in the order the body prints them.
 *
 * A card's home is its `decks` field and nothing else. One deck files it under
 * that deck; **two decks file it once**, under the shelf that is about being of
 * two decks, because the design doc's own catalogue does exactly that (its
 * "Cross-type cards" is a table of its own, not two entries in two tables) and
 * because a card printed twice would be a card with two anchors, which is the
 * one thing an address may never have. No deck at all is the generic pool, a
 * card of nobody's that everybody may draw. And a withdrawn row is none of
 * these: it goes behind them all, whatever its decks say, because a live
 * catalogue that had a retired row mixed into it would be a catalogue that
 * lies.
 */
const CROSS_GROUP = 'Cards two decks share';
const GENERIC_GROUP = 'Cards any leader may draw';
const WITHDRAWN_GROUP = 'Withdrawn cards';

function orderGroup(def: ReturnType<typeof orderDef>): string {
  if (def.retired === true) return WITHDRAWN_GROUP;
  if (def.decks.length === 0) return GENERIC_GROUP;
  if (def.decks.length > 1) return CROSS_GROUP;
  return deckWord(def.decks[0]!);
}

/** The Orders shelf's headings, in the order the body prints them. */
const ORDER_GROUPS: readonly string[] = [
  ...DECK_IDS.map(deckWord),
  CROSS_GROUP,
  GENERIC_GROUP,
  WITHDRAWN_GROUP,
];

function orderEntry(id: OrderId): CompendiumEntry {
  const def = orderDef(id);
  return {
    id: compendiumId('order', id),
    section: 'order',
    name: def.name,
    group: orderGroup(def),
    // The deck is the card's home since the decks rework (D1a); the old office
    // and pool print only where a retired row still carries them. A row that is
    // on no shelf says so here as well as in its first clause, because the
    // eyebrow is the line a reader skimming a shelf actually reads.
    //
    // **The words are `orderPayoff`'s** (U1), lowercased for the house's small
    // caps and not composed again here. This page joined `decks` itself until
    // the ruling, which is one door too many for one sentence: the eyebrow on a
    // dealt card and the eyebrow on its page are the same line and must come
    // out of the same function, or the day a cross-type's separator changes it
    // changes on one of them.
    //
    // The standing is joined with a dash rather than the middle dot, because the
    // dot is already the separator *inside* the name — "dominion · expansionist
    // order" is one phrase, and a third dot after it would read as a third deck.
    eyebrow: [
      orderPayoff(id).toLowerCase(),
      ...(def.retired === true ? ['withdrawn'] : orderIsDealt(id) ? [] : ['not dealt yet']),
    ].join(' — '),
    // **The card's A3 marks** (batch C1): the type's ink, the deck's suit and
    // the rarity's mark, out of the one function every surface draws an Order
    // from. A card two decks share shows both suits here as it does in a hand,
    // and a card of no deck the seal.
    mark: { kind: 'suit', face: orderSuitFace(id) },
    rows: [
      // **Its type** (batch C1), which is the ink its face is drawn in. A
      // withdrawn row has none and says nothing here; a live row of a deck not
      // yet sorted says "Unsorted", because its ink borrows Wildcard's.
      ...(def.retired === true ? [] : row('Type', TYPE_WORD[orderType(id)])),
      // The deck is the eyebrow's and the shelf's; what the row adds is the two
      // facts about the draw that are nowhere else — when the card can first
      // turn up, and how often it does when it can.
      // A card dealt in two bands names both (`OrderDef.lastBand`, Double Time).
      ...row(
        'Band',
        def.lastBand === undefined || def.lastBand === def.band
          ? (BAND_WORDS[def.band] ?? '')
          : `${BAND_WORDS[def.band] ?? ''} ${def.lastBand === def.band + 1 ? 'and' : 'to'} ${BAND_WORDS[def.lastBand] ?? ''}`,
      ),
      ...(def.slot === undefined ? [] : row('Slot it fitted', def.slot)),
      ...(def.pool === undefined ? [] : row('Draft pool, retired', def.pool)),
      // **How often it turns up** (the levelling ruling of 2026-09-04). A draft
      // weighs its bag by this and by nothing else, and passing on a hand
      // raises what the next one is likely to hold — so a player who is told
      // the pass buys rarer cards has to be able to find out which cards those
      // are. The mark and the word the dealt card wears, off one table.
      ...row('Rarity', rarityFigure(def.rarity)),
      ...lineRow(def),
      // **A Scaler's value before its first gain** (batch DS8): the figure its
      // face shows on the draft, in place of a sentence about where it starts.
      ...row(SCALER_LABEL, scalerStartFace(id)?.figure ?? ''),
    ],
    // Why it is not dealt first, then what it does: the standing of the card
    // before its rules, because a reader who does not know the card is out of
    // the deck reads every clause under it as a promise. A charter's rule, that
    // it takes no chair, is its keyword's since batch DS8: the keyword is the
    // card's first clause, and the keyword's own page says the rule.
    clauses: [...orderStanding(def), ...cardClauses(id, def.note)],
    flavor: def.flavor.length === 0 ? null : def.flavor,
  };
}

/**
 * What a Doctrine's offer asks of a seat, read off the row's gates (batch DT5),
 * or nothing when it asks nothing. A gate prints no words on the card, because a
 * seat that fails it is never shown the card, so this page is where a player
 * planning ahead finds it.
 */
function doctrineNeeds(def: DoctrineDef): string {
  const needs: string[] = [];
  if (def.needsTendedWork === true) needs.push('a charter that opens a unique improvement');
  if (def.needsReligion === true) needs.push('a religion whose holy city you hold');
  return needs.join(' · ');
}

function doctrineEntry(id: DoctrineId): CompendiumEntry {
  const def = doctrineDef(id);
  // **A deck's Doctrine** (batch C3) says its deck and its tier, the way its
  // sheet does; the adoption that offers it is read off the row (`tier`, the
  // government tier its band pairs with). **A pre-rework Doctrine** is
  // withdrawn — it was taken at an adoption before the decks — and its page
  // says so, read off the row like every other standing.
  const deck = def.decks.length > 0;
  const decks = def.decks.map(deckWord).join(' · ');
  return {
    id: compendiumId('doctrine', id),
    section: 'doctrine',
    name: def.name,
    eyebrow: def.retired === true ? 'doctrine — withdrawn' : deck ? `${decks.toLowerCase()} doctrine` : 'doctrine',
    mark: { kind: 'glyph', glyph: '✦' },
    rows: deck
      ? [
          ...row('Deck', decks),
          ...row('Tier', BAND_NUMERAL[def.band]),
          ...row('Offered when you adopt', `a tier ${def.tier} government`),
          ...row('Needs', doctrineNeeds(def)),
        ]
      : [...row('Government tier', figure(def.tier)), ...lineRow(def)],
    clauses: [
      ...(def.retired === true
        ? [
            {
              text: 'Withdrawn: this Doctrine is from before the decks and is offered to nobody. An empire that took it keeps it, and it still pays what it says.',
              standing: true,
            },
          ]
        : []),
      ...cardClauses(id, def.note),
    ],
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

/**
 * Who may say a rite, as the shelf's "Performed by" row prints it.
 *
 * Any of the empire's cities, with no building needed (`riteError` asks for
 * none; a Chapel only adds culture when a rite is said in its town). A rite
 * with a lasting half may also be said by a prophet over every city at once
 * (`empireRiteError`); one that only acts at once (`RiteDef.atOnce`, the
 * offering and the restoring) is said by one city and never over the realm.
 */
function ritePerformedBy(id: RiteId): string {
  const def = riteDef(id);
  if (def.retired === true) return 'nobody — withdrawn';
  if (def.atOnce !== undefined) return 'any of your cities';
  return 'any of your cities, or a prophet over all of them';
}

function riteEntry(id: RiteId): CompendiumEntry {
  const def = riteDef(id);
  const clauses: CompendiumClause[] = [];
  clauses.push(...cardClauses(id, def.note));
  // **What opens it** (C1): the node that hands the verb over, linked — the
  // "Unlocked by" row this table used to end on.
  clauses.push(riteOpening(id));
  return {
    id: compendiumId('rite', id),
    section: 'rite',
    name: def.name,
    eyebrow: 'rite',
    mark: { kind: 'glyph', glyph: '☩' },
    rows: [
      // **A rite is performed by a city** since the fewer-things pass, so there
      // is no target word to print at all: the row says who says it.
      ...row('Performed by', ritePerformedBy(id)),
      // The duration, said once (batch UX8b): this row is the shelf's only
      // statement of it, so no "Kept for" clause repeats it below. The row's
      // own figure, because the shelf describes the table rather than an
      // empire; what an amplifier makes of it is the faith screen's figure.
      ...row(
        'Duration',
        def.duration === undefined
          ? ''
          : `${figure(def.duration)} ${def.duration === 1 ? 'turn' : 'turns'}`,
      ),
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
    return `${figure(great.actGainTurns)} turns of your empire’s science, added to the technology you are researching.`;
  }
  if (family === 'engineer') {
    return `${figure(great.engineerHammers)}${YIELD_GLYPH.production} for a city, multiplied by the age of your empire. It grows with every technology you research.`;
  }
  if (family === 'merchant') {
    return `${figure(great.actGainTurns)} turns of your empire’s gold income, added to your treasury.`;
  }
  if (family === 'artist') {
    return `${figure(great.actGainTurns)} turns of your empire’s culture toward your next draft, and ${signedFigure(great.artistHappiness)} happiness in the city for ${figure(great.artistTurns)} turns.`;
  }
  return `${signedFigure(great.generalCombat)} combat strength for every unit of yours within ${figure(great.generalRadius)} hexes, for ${figure(great.generalTurns)} turns.`;
}

function greatPersonEntry(id: GreatPersonId): CompendiumEntry {
  const def = greatPersonDef(id);
  // **The family's own verbs head both clauses** (the user, 2026-09-09): the
  // book names the verb the button names, so a player who read the entry
  // recognises the row on the sheet. `describeFamilyVerb` is the one reading —
  // and the work's clause carries its improvement as a keyword, which is what
  // an entry that mentions another entry does everywhere else in this file.
  const clauses: CompendiumClause[] = [
    { text: `${describeFamilyVerb(def.family, 'act')}: ${familyAct(def.family)}` },
    { text: `Or: ${describeFamilyVerb(def.family, 'work')}.` },
  ];
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
      { label: 'Beads that open the Magnum Opus', figures: figure(BEAD_RULES.threshold) },
    ],
    clauses: [
      {
        text: 'A full rod is what opens the Magnum Opus: until you hold that many beads, you cannot begin the great work that ends the game.',
      },
      {
        text: 'The last bead of all is golden, and only the Magnum Opus mints it. Its slot sits empty on every rod for the whole game.',
      },
      {
        text: 'Beads are minted two ways: by keeping a wager the age set you, and by the handful of things that hand one over outright.',
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
  // **A withdrawn row keeps its page and says so**, which is the ruling's own
  // reading of what "kept for the record" means: a bead somebody earned in an
  // older game still has to be a page somewhere. The book's other kinds are not
  // consistent about this — a withdrawn building has no page at all, a withdrawn
  // Order has an ordinary one — and the simplest thing that is true of every
  // bead is a note, on the retired rite's precedent one shelf over ("nobody —
  // withdrawn"). It reads off the field rather than off a list of ids, so the
  // day another row is withdrawn its page says so with no edit here.
  if (def.retired === true) {
    clauses.push({
      text: 'Withdrawn: this is no longer dealt, raced for or earned. A game that earned the bead before it was withdrawn keeps it.',
      note: true,
    });
  }

  // A **repeatable** reward says so instead of saying "once per empire", which
  // would be the eyebrow contradicting the card underneath it: the four bead
  // Orders mint theirs every time the deed is done (`BeadGrantDef.repeatable`).
  const kindWord =
    kind === 'grant' && (def as { repeatable?: boolean }).repeatable === true
      ? 'a reward, every time it is earned'
      : BEAD_KIND_WORD[kind];
  // A withdrawn row is never dealt, so its eyebrow must not say which age deals
  // it. It says what class of thing it was and that it is gone.
  const scope = def.retired === true
    ? `${kindWord}, withdrawn`
    : kind === 'feat'
      ? (def as { once: 'game' | 'age' }).once === 'age'
        ? 'a first in the world, once in each age'
        : 'a first in the world, once per game'
      : age === null
        ? kindWord
        : `${kindWord}, dealt in ${deckEraWord(age)}`;

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

/**
 * One card of the wager deck (batch G3; owed since G2, `docs/wager.md` §8).
 *
 * Every other data table in the game has a shelf and this one did not, which is
 * the whole reason it is here — the rows already carry a `note` written for a
 * reader and the bars are the balance. Nothing on the page is prose about a
 * number: the sentence is the row's own, and the figures are the row's own,
 * interpolated.
 */
function wagerEntry(id: WagerId): CompendiumEntry {
  const def = wagerDef(id);
  const family = BEAD_FAMILY_MARK[def.family];
  const clauses: CompendiumClause[] = [{ text: def.note }];
  for (const line of def.deferred ?? []) clauses.push({ text: line, deferred: true });
  // A compound card's bar is *how many of its clauses hold at once*, so the ages
  // carry the clauses' own figures rather than one number that would mean
  // nothing on its own. Joined the way the worksheet joins them.
  const barsAt = (age: number): string =>
    def.reads.shape === 'clauses'
      ? def.reads.clauses
          .map((clause) => figure(clause.bars[wagerAgeIndex(age)] ?? 0))
          .join(' · ')
      : figure(wagerBar(id, age));
  const rows: CompendiumRow[] = [{ label: 'Family', figures: family.word }];
  for (const age of WAGER_AGES) {
    if (!wagerDealtInAge(id, age)) continue;
    rows.push({ label: `The bar in ${deckEraWord(age as never)}`, figures: barsAt(age) });
  }
  const kindWord = def.kind === 'flow' ? 'counted across the age' : 'read off the board';
  return {
    id: compendiumId('wager', id),
    section: 'wager',
    name: def.name,
    eyebrow: `${WAGER_LINE_NAME[def.line]} · a bar ${kindWord}`,
    mark: { kind: 'glyph', glyph: family.glyph },
    rows,
    clauses,
    flavor: null,
  };
}

/**
 * One leader (batch L2a; the second cut, L6a, `docs/leaders.md` "The thirteen").
 *
 * **One page a figure**, and since the second cut the page is short enough to
 * read at the table: two abilities live from the first turn, the one soldier and
 * the one building nobody else may raise, the towns and the pair of inks. That
 * is the whole of what a figure is, which is the point of the second cut — a
 * leader you can know before you meet it.
 *
 * Every rules clause comes out of `describeCard`, the same describer the
 * Ledger's own lines come out of, so nothing here is hand-written prose about a
 * number (CLAUDE.md's rule for this file). The only words this function writes
 * are the headings, and those carry no figures, which is why they may be written
 * at all. The uniques are named through `ref()` so the book links to their own
 * entries rather than restating their rows.
 */
/** "leader · Commerce · Devotion": the decks a leader draws Orders from. */
function leaderDecksWords(id: LeaderId): string {
  const decks = leaderDef(id).decks;
  return decks === undefined ? 'leader · every deck' : ['leader', ...decks.map(deckWord)].join(' · ');
}

function leaderEntry(id: LeaderId): CompendiumEntry {
  const def = leaderDef(id);
  const clauses: CompendiumClause[] = [
    // **The colours, said in words** (batch H7, `docs/flags.md` (oooo)). The
    // shelf is the one surface where a figure's pair cannot be *shown* — an
    // entry is prose and a keyword ref, not a swatch — so it is named instead,
    // off the row's own `colors.names`, which is the doc table's first cell.
    { text: `${LEADER_STEP_WORDS.rules}:`, note: true },
  ];
  for (const ability of def.abilities) {
    clauses.push({ text: `${ability.name}:`, note: true });
    clauses.push(...cardClauses(ability.id));
  }
  // **The two rows only this figure may raise.** Under the abilities, because
  // an ability is true the moment you sit down and a unique waits on its own
  // technology — which is the one thing a reader has to be told about it, and is
  // said here rather than restated from the row's own page.
  clauses.push({ text: 'Only this leader can build:', note: true });
  // The second row is a hall for twelve of the thirteen and a **work of the
  // ground** for the one (batch L8) — read off the sheet, so the sentence names
  // whichever it is and the shelf never has to know which.
  const second =
    def.improvement !== undefined
      ? ref('improvement', def.improvement, improvementDef(def.improvement).name)
      : ref('building', def.building!, buildingDef(def.building!).name);
  clauses.push({
    text: `${ref('unit', def.unit, unitDef(def.unit).name)}, ${leaderOpeningWords('unit', def.unit)}.`,
  });
  clauses.push({
    text: `${second}, ${leaderOpeningWords(def.improvement !== undefined ? 'improvement' : 'building', (def.improvement ?? def.building)!)}.`,
  });
  // **The towns** (batch L5, `docs/flags.md` (pppp)). Last, because it is the
  // last thing a player choosing at the table wants and the first thing they
  // will see on the board. One plain clause off the row itself: the names are
  // the sheet's, in the sheet's order, and nothing here interprets them.
  clauses.push({
    text: `Colours: ${def.colors.names[0]} and ${def.colors.names[1]}. Cities, in the order you found them: ${[...def.cities].join(', ')}.`,
    note: true,
  });
  return {
    id: compendiumId('leader', id),
    section: 'leader',
    name: def.name,
    eyebrow: leaderDecksWords(id),
    mark: { kind: 'glyph', glyph: '♛' },
    rows: [],
    clauses,
    flavor: null,
  };
}

/**
 * One malice (batch G3, `docs/wager.md` §4).
 *
 * The row's `note` leads — what it does to your realm, in a first-time player's
 * words — and the clauses under it are the card's own effects through
 * `describeCard`, the same describer the chair's hover and the Ledger's line
 * come out of. A malice is a card in every sense the vocabulary cares about, so
 * its page is built exactly as an Order's is; what its eyebrow says instead of a
 * pool is the chair it takes, because that is the half of the punishment the
 * effect does not state.
 */
function maliceEntry(id: MaliceId): CompendiumEntry {
  const def = maliceDef(id);
  const clauses: CompendiumClause[] = [{ text: def.note }, ...cardClauses(id)];
  return {
    id: compendiumId('malice', id),
    section: 'malice',
    name: def.name,
    eyebrow: `a malice, in ${withArticle(SLOT_WORDS[def.chair])} chair`,
    mark: { kind: 'glyph', glyph: '✕' },
    rows: [],
    clauses,
    flavor: def.flavor,
  };
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
        // A big city used to demand a surcharge on top of that, for crowding.
        // The rule is gone (2026-09-09, `docs/flags.md` item (kkk)) and so is
        // the sentence: what a town asks for is what its citizens ask for, and
        // the book prints one rule where the ledger charges one line.
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
        { label: 'A city you captured costs', figures: signedFigure(-authority.capturedCity) },
        ...ladderRows(RULES.meters.tiers),
      ],
      clauses: [
        {
          text: 'Authority is one figure for your whole empire: your capacity to govern, minus what your cities cost to govern. While it is positive your empire gets a percentage bonus, in the steps listed above; while it is negative it gets a penalty.',
        },
        {
          text: 'A city you founded costs the same on the coast as inland. A city you captured always counts as captured.',
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
        { label: 'Hiring a route costs', figures: `${figure(trade.routePriceBase)} gold` },
        {
          label: 'Each route you have running adds',
          figures: `${signedFigure(trade.routePricePerRunningRoute)} gold`,
        },
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
          text: 'Distance is measured in turns of a trader’s own travel between the two cities, so a road puts more cities in reach and a mountain range puts fewer — it is a fact about the pair, not about where your trader happens to be standing. Both ends of a route become trading posts, permanently.',
        },
        {
          text: 'Only one route may run between any pair of your cities, in either direction. The route belongs to the trader carrying it, so an enemy that kills a loaded trader takes its cargo and ends the route.',
        },
        {
          text: 'A route has no end date. It runs until you cancel it, or until a war between the two cities, a plundered caravan or a lost city ends it. You can cancel a route only after its caravan has reached the destination once. A cancelled route leaves its caravan idle, and the next route you send uses it.',
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
 * **It takes no game at all** since batch P1. The one figure that ever moved
 * under a live board was a unit's roster price, and the production standard made
 * that a fact about the row and the tree (`unitRosterCost`, `cities.ts`) rather
 * than about a seat — so the claim `compendium.html` rests on is now true by
 * signature instead of by inspection.
 */
export function compendiumSections(): CompendiumSection[] {
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
  // **Ordinary rows first, then the headings** (`ROW_GROUPS`): the rows of one
  // leader, the rows a card opens, the works of great people, and last the
  // rows nobody can get. File order inside each, so the book's order is still
  // the data's. An entry's id does not move with its heading.
  const filed = (entries: CompendiumEntry[]): CompendiumEntry[] =>
    entries
      .map((entry, index) => ({ entry, index }))
      .sort(
        (a, b) =>
          ROW_GROUPS.indexOf(a.entry.group) - ROW_GROUPS.indexOf(b.entry.group) || a.index - b.index,
      )
      .map(({ entry }) => entry);
  for (const entry of filed(UNIT_TYPE_IDS.map(unitEntry))) push(entry);
  // **A withdrawn row has no page.** The fewer-things pass cut twelve ordinary
  // buildings and kept their rows so that a save which raised one still replays
  // (`BuildingDef.retired`); a reference that still described a Mint would be
  // teaching a build nobody can make. The reading is the shelf's, not the row's
  // — the data keeps the Mint, the book forgets it.
  const buildings = BUILDING_IDS.filter((id) => buildingDef(id).retired !== true).map(buildingEntry);
  for (const entry of filed(buildings)) push(entry);
  for (const entry of filed(IMPROVEMENT_IDS.map(improvementEntry))) push(entry);
  for (const id of RESOURCE_IDS) push(resourceEntry(id));
  // Age order, then the table's own order inside an age: a reference is read
  // forwards through the tree, which is not the order `techs.json` happens to
  // list its rows in.
  for (const age of [...new Set(TECH_IDS.map((id) => techDef(id).age))].sort((a, b) => a - b)) {
    for (const id of TECH_IDS) if (techDef(id).age === age) push(techEntry(id));
  }
  // The charter technologies (Scientific batch S12), after the tree under one
  // heading of their own, in age order and then file order. They are not on
  // the tree every empire climbs, so they are not mixed into it.
  const charterTechs = [...CHARTER_TECH_IDS].sort((a, b) => techDef(a).age - techDef(b).age);
  for (const id of charterTechs) push(charterTechEntry(id));
  // The named rules, in the tree's own order — the pages the star chart's node
  // cards point at when a node's rules will not fit on one. See `ruleEntry`.
  for (const id of techsWithNamedRules(TECH_IDS)) push(ruleEntry(id));
  // **Grouped by deck, banded inside it, withdrawn at the back** (D1c). Four
  // hundred live rows and two hundred-odd withdrawn ones are not a list; they
  // are a catalogue, and a catalogue needs shelves. So the deck a card belongs
  // to decides the heading (`orderGroup`), the band decides the order under it
  // — which is the order a player meets the cards in, since a band is when a
  // card can first be dealt — and the row's own file order breaks the tie, so
  // the book's order is still the data's own wherever the data has one.
  //
  // Sorted rather than bucketed by hand, over a **copy**: `ORDER_IDS` is the
  // simulation's list and a shelf that sorted it in place would quietly
  // reorder every pool in the game.
  const orderRank = (id: OrderId): number => ORDER_GROUPS.indexOf(orderGroup(orderDef(id)));
  const orderIds = [...ORDER_IDS]
    .map((id, index) => ({ id, index }))
    .sort(
      (a, b) =>
        orderRank(a.id) - orderRank(b.id) ||
        orderDef(a.id).band - orderDef(b.id).band ||
        a.index - b.index,
    );
  for (const { id } of orderIds) push(orderEntry(id));
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
  // **The wager deck and the malice deck** (batch G3): the two tables that were
  // walked by no shelf. In file order, like every other generated shelf, so the
  // book's order is the data's own.
  for (const id of WAGER_IDS) push(wagerEntry(id));
  for (const id of MALICE_IDS) push(maliceEntry(id));
  // **The leaders** (batch L2a): one page a figure, carrying its own line and
  // all twelve cards of its deck. In sheet order, like every other generated
  // shelf, so the book's order is the data's own.
  for (const id of LEADER_IDS) push(leaderEntry(id));
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

/**
 * The sub-shelves of one section, in the order its entries stand in, with the
 * count under each.
 *
 * Derived from the entries rather than declared beside them, for the reason
 * every list in this file is derived: a heading that could disagree with what
 * is under it is a heading that eventually will. A section whose entries carry
 * no `group` comes back empty, and the index and the body both draw nothing.
 * Five shelves have groups. The Orders shelf has a heading for each deck. On
 * the Technologies shelf only the charter technologies carry one. The Units,
 * Buildings and Improvements shelves put their ordinary rows first and then
 * the headings of `ROW_GROUPS`.
 *
 * Pure and exported for the same reason `compendiumView` is: this suite has no
 * jsdom, and "did the search leave a heading with nothing under it" has to be a
 * question somebody can ask without a browser.
 */
interface CompendiumGroup {
  name: string;
  count: number;
}

export function compendiumGroups(section: CompendiumSection): CompendiumGroup[] {
  const out: CompendiumGroup[] = [];
  for (const entry of section.entries) {
    if (entry.group === undefined) continue;
    const last = out[out.length - 1];
    if (last !== undefined && last.name === entry.group) last.count += 1;
    else out.push({ name: entry.group, count: 1 });
  }
  return out;
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
interface CompendiumViewState {
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
interface CompendiumShow {
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

/** The mark, drawn the way its own kind is always drawn. See `CompendiumMark`. */
function markNode(mark: CompendiumMark): HTMLElement {
  if (mark.kind === 'resource') {
    const box = element('span', 'cmp-mark');
    box.append(resourceMarkNode(mark.resource));
    return box;
  }
  if (mark.kind === 'badge' || mark.kind === 'charter') {
    const box = element('span', 'cmp-mark cmp-mark-badge');
    const img = document.createElement('img');
    img.src = mark.kind === 'charter' ? charterIconPath(mark.id) : `/sprites/icons/${mark.badge}.svg`;
    img.alt = '';
    box.append(img);
    return box;
  }
  if (mark.kind === 'suit') {
    // The row's marks, drawn by the one printer (`suitMarksNode`): the ink
    // stripe, the suit and the rarity's mark, the same as the collection row.
    const box = element('span', 'cmp-mark cmp-mark-suit');
    box.append(suitMarksNode(mark.face));
    return box;
  }
  const box = element('span', 'cmp-mark');
  // The bead's character is drawn as the glass bead on its wire (batch SS1).
  if (mark.glyph === BEAD_GLYPH) {
    box.append(beadMarkNode());
    return box;
  }
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
  // What kind of thing the entry is, as a fact under its name (batch SS1).
  titles.append(element('h4', 'cmp-entry-name', entry.name));
  titles.append(element('p', 'eyebrow cmp-eyebrow', entry.eyebrow));
  head.append(titles);
  card.append(head);

  if (entry.rows.length > 0) {
    const list = element('ul', 'cmp-rows ledger');
    for (const line of entry.rows) {
      const item = element('li', 'cmp-row');
      item.append(element('span', 'cmp-row-label', line.label));
      const value = element('span', 'cmp-row-value');
      // `setDescriptorText` and not `setYieldText`: a row may name a thing the
      // book has a page about ("Upgrades to", "Needs standing here"), and it
      // draws the yield glyphs the same way.
      setDescriptorText(value, line.figures);
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
        line.standing === true
          ? 'cmp-clause cmp-clause-standing'
          : line.deferred === true
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
interface CompendiumView {
  /** Shows the section an entry belongs to, and marks that entry. */
  show(entryId: string | null): void;
  /** Which entry is marked, or `null`. */
  current(): string | null;
}

/** How long the search waits after the last keystroke before it redraws. */
const SEARCH_SETTLE_MS = 120;

interface CompendiumViewOptions {
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

  // Generated once per mount. Every entry is read off static data tables and
  // nothing on it depends on a game, so a mount never needs to regenerate.
  const sections: readonly CompendiumSection[] = compendiumSections();
  let openSection: CompendiumSectionId = SECTION_NAMES[0]![0];
  let marked: string | null = null;

  /** The id a group's heading carries, so the index's jump is one lookup. */
  function groupAnchor(section: CompendiumSectionId, name: string): string {
    return `cmp-group-${section}-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  }

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
      // **The open shelf's sub-shelves**, under its own row and nowhere else.
      // A shelf of six hundred cards is not a thing anybody scrolls; the six
      // decks are how a reader gets to the one they play, and they are listed
      // where the reader is already looking rather than as a second control
      // over the body. Only the open shelf's, because an index that unfolded
      // every shelf's groupings at once would be a longer list than the book.
      if (section.id === openSection) {
        const groups = compendiumGroups(section);
        if (groups.length > 0) {
          const nest = element('ul', 'cmp-groups');
          for (const group of groups) {
            const jump = element('button', 'cmp-group-jump') as HTMLButtonElement;
            jump.type = 'button';
            jump.append(element('span', 'cmp-group-jump-name', group.name));
            jump.append(element('span', 'cmp-section-count', figure(group.count)));
            jump.addEventListener('click', () => {
              document
                .getElementById(groupAnchor(section.id, group.name))
                ?.scrollIntoView({ block: 'start' });
            });
            const nested = element('li');
            nested.append(jump);
            nest.append(nested);
          }
          item.append(nest);
        }
      }
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
    // A heading whenever the group changes, which is what makes the shelf a
    // catalogue rather than a list. `compendiumSections` pushes a group's
    // entries contiguously, so "changed" is the whole of the rule.
    let group: string | undefined;
    for (const entry of section.entries) {
      if (entry.group !== undefined && entry.group !== group) {
        group = entry.group;
        const heading = element('h4', 'cmp-group-head', entry.group);
        heading.id = groupAnchor(section.id, entry.group);
        body.append(heading);
      }
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

  // The search redraws once typing pauses rather than on every keystroke. A
  // redraw of a big shelf (the Orders shelf is thousands of nodes) costs more
  // than the gap between two keys, so redrawing per key made the field lag
  // behind the typing and drew results nobody would read.
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  function cancelSearchDraw(): void {
    if (searchTimer !== null) clearTimeout(searchTimer);
    searchTimer = null;
  }
  search.addEventListener('input', () => {
    marked = null;
    cancelSearchDraw();
    searchTimer = setTimeout(() => {
      searchTimer = null;
      draw();
    }, SEARCH_SETTLE_MS);
  });

  function show(entryId: string | null): void {
    if (entryId === null) {
      marked = null;
      cancelSearchDraw();
      draw();
      return;
    }
    const landing = compendiumShow(sections, search.value, entryId);
    if (landing === null) return;
    if (landing.clearSearch) search.value = '';
    openSection = landing.openSection;
    marked = landing.marked;
    cancelSearchDraw();
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

interface CompendiumOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  trigger?: HTMLElement;
  /** Shuts whatever else the HUD has up. The screens' standing contract. */
  onOpen?: () => void;
}

/**
 * The Compendium as a screen: the parchment sheets' paper, on the parchment
 * sheets' frame (`modalShell.ts`) — `hidden` is the whole of the screen state,
 * the ×, Escape and a press on the ground arrive at one `close`, and opening it
 * closes whatever else was up.
 *
 * Built once and never rebuilt on open, unlike the Statecraft and Religion
 * sheets: nothing on these cards is a fact about a seat or a turn, so there is
 * nothing for an open to re-derive. Even a unit's price is the empire-free
 * `unitRosterCost`. Opening used to regenerate every entry anyway, which cost
 * about 100 ms per open in Chrome (browser audit 2026-10-06, finding 5); a
 * reopen now only redraws the shelf, under 10 ms.
 *
 * `main.ts` builds this on the first open, through a dynamic import, so the
 * module and the generation stay off the page's load (see `lazyScreen.ts`).
 */
export function createCompendium(options: CompendiumOptions): Compendium {
  const { overlay, body, closeButton, trigger } = options;
  const view = renderCompendium(body);

  /** The entry a `#…` in the address bar names, or `null`. */
  function hashEntry(): string | null {
    const hash = window.location.hash.replace(/^#/, '');
    return hash.length > 0 && sectionOfId(hash) !== null ? hash : null;
  }

  /** The entry the next opening should turn to, or `undefined` for the default. */
  let wanted: string | undefined;

  /**
   * The frame (`modalShell.ts`) — `hidden` is the whole of the screen state, the
   * ×, Escape and a press on the ground all arrive at one `close`, and the
   * keyboard goes to the × and comes back to the control that opened it.
   *
   * Two things about this one are not the other seven's.
   *
   * **No `body`.** The book's two panes are built once at construction rather
   * than on each open (see the docblock above), so there is nothing to empty and
   * emptying it would take the book apart.
   *
   * **The disposer is the page's, not a game's.** `main.ts` deliberately never
   * disposes this screen: it is a property of the page, built at module scope
   * beside the help sheet, reachable from the controls card before anything has
   * been started. Disposing it would unbind its Escape for the rest of the
   * session.
   */
  const shell = createModalShell({
    overlay,
    closeButton,
    trigger,
    onOpen: () => options.onOpen?.(),
    draw: () => {
      // With no id and no hash to honour, the book opens on the Introduction's
      // first page rather than wherever the index happens to start.
      view.show(wanted ?? hashEntry() ?? DEFAULT_ENTRY);
    },
  });

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open(entryId?: string): void {
      wanted = entryId;
      shell.open();
      wanted = undefined;
    },
    close: shell.close,
    toggle: shell.toggle,
    dispose: shell.dispose,
  };
}
