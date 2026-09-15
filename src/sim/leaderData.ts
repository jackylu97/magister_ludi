/**
 * The leaders: a **start bias**, **two abilities**, a **unique unit** and a
 * **unique building**.
 *
 * `docs/leaders.md` "The second cut — fixed identity" is the sheet — thirteen
 * figures, each with two lines live from the first turn and one soldier and one
 * building nobody else may raise — and `docs/flags.md` (xxxx) is the ruling that
 * built it. The first cut's deck of twelve drafted cards a figure is **gone**
 * (batch L6a): a leader is a known quantity from the table, the way Civ's are,
 * and the per-age choice this game already asks five times over did not need a
 * sixth. Two halves of one row, and they are read by two different halves of the
 * game:
 *
 * **The map's half** (batch M1, ruled in `docs/flags.md` (cccc) as **three
 * stages**), each riding a pass that already exists:
 *
 *   1. the ground a seat is given (`startBias.terrain` and `startBias.wants`,
 *      read by `startPositions.ts` — a soft score and, over it, a hard want with
 *      a fallback);
 *   2. what grows near it (`startBias.resources` and `startBias.luxuries`, read
 *      by the scatter and by the continent's deal in `resources.ts`);
 *   3. what the fairness pass furnishes it with (`startBias.furnish`, read by
 *      `ensureStartFurnishing`) — an improvement kind, or one row by name where
 *      the figure's need is that row.
 *
 * **The rules' half** (batch L6a): `abilities` is a pair of ordinary
 * `CardEffect` lists, both live for the seat from turn one, and `unit` and
 * `building` name the two rows this figure alone may raise. The abilities reach
 * the game through `liveEffects`, which is the whole point of writing them in
 * the card vocabulary: a leader's line is read by the same evaluator that reads
 * a doctrine's, and a fourteenth leader is a JSON row. The uniques reach it
 * through `isUnlocked`, which asks the seat's figure and then the row's own tech
 * gate — a unique arrives when its technology does, and there is no age
 * machinery anywhere in the system.
 *
 * A row is data and nothing else. The weights, the multipliers, the kinds and
 * every figure on every card live in `data/leaders.json`; the code holds
 * algorithms and no numbers, which is the same division `mapgen.json` and
 * `mapgen.ts` keep.
 *
 * **A leaf.** Nothing here imports a pass or a verb, so the modules that read a
 * bias (`startPositions.ts`, `resources.ts`), the evaluator that folds a figure's
 * abilities and the gate that opens its uniques can all name it without closing a
 * load-time cycle. The one import that would close one — the card vocabulary —
 * is **type-only**, which is the arrangement `religionData.ts` already keeps with
 * the evaluator and for the same reason. The validation below runs at module
 * load, so a mistyped terrain, an unknown resource or a figure naming a row
 * nobody has heard of is a boot error rather than a line that silently never
 * fires.
 */

import leadersJson from '../../data/leaders.json';

import { BUILDING_IDS, type BuildingId, buildingDef } from './buildingData';
import {
  IMPROVEMENT_IDS,
  type ImprovementId,
  improvementDef,
  improvementForResource,
} from './improvementData';
import { RESOURCE_IDS, type ResourceId, resourceDef } from './resourceData';
import type { CardDefBase, CardEffect } from './statecraftData';
import { type TechAge, techAgeBands } from './techData';
import { FEATURE_IDS, TERRAIN_IDS, type TerrainId } from './terrainData';
import { UNIT_TYPE_IDS, type UnitTypeId, unitDef } from './unitData';

/**
 * What a terrain weight may name: a terrain, a feature, or one of the two facts
 * a hex carries beside them.
 *
 * A closed vocabulary rather than a free string, for `HillsWaiver`'s reason: a
 * typo in the sheet is a load error and not a line that quietly never scores.
 * `hills` and `river` are here because neither is a terrain — a hill is a flag
 * on a grassland and a river is a set of edges — and both are exactly what a
 * leader's ground is described in.
 */
export type StartBiasKey = TerrainId | 'forest' | 'jungle' | 'oasis' | 'floodplain' | 'hills' | 'river';

/** Every key a `terrain` block may use, in the order the lines are printed. */
export const START_BIAS_KEYS: readonly StartBiasKey[] = [
  ...TERRAIN_IDS,
  ...(FEATURE_IDS.filter((id) => id !== 'none') as StartBiasKey[]),
  'hills',
  'river',
];

/**
 * One leader's pull on the world it starts in. Every field optional: a leader
 * with no bias at all is a legal row, and it is exactly what an unbiased seat
 * scores.
 */
export interface StartBias {
  /**
   * Weight per matching hex in the site and its scored rings, keyed by ground.
   *
   * Negative is lawful and means *away from* — Modu's steppe reads "grassland
   * and plains, away from hills" and says so with a minus rather than with a
   * second field.
   */
  terrain?: Partial<Record<StartBiasKey, number>>;
  /**
   * Multipliers on the scatter's **tile** draw, within
   * `resources.startBiasRadius` of this leader's own start. A bonus or
   * strategic row; a luxury is dealt rather than scattered and belongs below.
   */
  resources?: Partial<Record<ResourceId, number>>;
  /**
   * Multipliers on the **continent's hand**: a continent seating this leader
   * draws these kinds more heavily. The cap and the hostability filter are
   * untouched — see `dealContinentLuxuries`.
   */
  luxuries?: Partial<Record<ResourceId, number>>;
  /**
   * What this leader's start is furnished with: one suitable resource per
   * entry, within `resources.startFurnishRadius`.
   *
   * An entry is an **improvement kind** — "plantations and camps", which is what
   * Mithridates' own text pays on, and which wine or which deer is the ground's
   * business — **or a resource row** by name, for the figure whose need is that
   * row and no sibling of it. Modu's steppe is the case: `pasture` would furnish
   * the first pastured row the table lists, and cattle are not horses.
   */
  furnish?: FurnishEntry[];
  /**
   * The ground this figure will not do without, if the map has any going.
   *
   * A **hard want with a fallback**, and both halves are the design (M1b). The
   * soft score measured out: a capped weight moves the odds a few points and
   * cannot deliver a need — Pachacuti found a mountain within two hexes on a
   * fifth of seeds biased or not, because a mountain is worth the same handful
   * of points wherever it is and the ceiling would not let it be worth more.
   * A want is asked as a *filter over the sites the chooser already stands
   * behind*: the seat takes its best-scoring accepted site that meets every
   * want, and where the map offers none it takes the soft-scored best instead.
   *
   * So it is **never a rejection** — no map is refused, no seat goes unseated,
   * and every sweep that proves a roster seats legally still holds — and it is
   * never a guarantee either. The figure asks; the ground answers.
   */
  wants?: StartWants;
}

/** An improvement kind, or one resource row by name. See `StartBias.furnish`. */
export type FurnishEntry = ImprovementId | ResourceId;

/**
 * The wants vocabulary: what may be asked for, and how much of it.
 *
 * A closed set of keys for `START_BIAS_KEYS`' reason: a typo is a load error
 * rather than a need that silently never fires. Each carries one number, and
 * `START_WANT_MEASURE` says what that number counts — a **radius** for the
 * `…Within` keys ("a mountain within two hexes", one such hex in reach and the
 * site's own counts), a **count** for the `…Beside` ones ("three arid hexes of
 * the six touching this one").
 *
 * The two shapes are two different asks and neither says the other. A radius is
 * *is there any of this near me*; a count of neighbours is *am I standing in
 * it*. A figure that wants a whole neighbourhood of something can still say so
 * with a terrain weight, which is what weights are for — but a weight is capped
 * and a need is not, which is the whole reason wants exist (`docs/flags.md`
 * (cccc), and (uuuu) for the counting half).
 */
export interface StartWants {
  /** A mountain in reach — the terraces' own ground. */
  mountainWithin?: number;
  /** A river hex in reach. */
  riverWithin?: number;
  /** A river hex **or** a floodplain — the valley, either way it was made. */
  riverOrFloodplainWithin?: number;
  /**
   * Dry country in reach: a desert hex, or an oasis or a floodplain.
   *
   * The three faces of one place, which is why they are one want. Desert is
   * `hostileTerrain` and a site *on* it is refused outright, and a site with too
   * much of it in the rings is refused too (`maxHostileRingShare`) — so what
   * this can ever find is a liveable hex **beside** the sand, which is the Nile
   * and is exactly the ask (the user, of Akhenaten: "should spawn by desert").
   * The floodplain and the oasis are here beside the sand because both are what
   * desert becomes where there is water, and a figure who wants the one wants
   * the others.
   */
  aridWithin?: number;
  /**
   * This many of the **six hexes touching the site** are dry country — the same
   * three faces `aridWithin` reads, asked as "am I standing in it" rather than
   * as "is there any of it about".
   *
   * Ruled 2026-09-11 (`docs/flags.md` (uuuu), the user: *"i notice akhenaten
   * rarely spawns in desert, could we give him a desert start bias?"*). The
   * radius want could not deliver that and the measurement said so: one arid hex
   * anywhere in two rings satisfies `aridWithin 2`, which is a river valley with
   * a dune in sight — the seat Akhenaten kept getting. Nothing about a radius
   * can ask for more without asking for it further away, so the count is a
   * second shape rather than a bigger number.
   *
   * The ring rather than the site itself, because the site itself may not be
   * desert: desert is `hostileTerrain` and a start on it is refused outright.
   * What a figure of the sand can have is the last liveable hex before it, which
   * is the Nile, and "three of my six neighbours are sand" is how a map says so.
   */
  aridBeside?: number;
  /** Grassland in reach. */
  grasslandWithin?: number;
  /** A hex a pasture could ever stand on: flat grassland or plains. */
  pastureGroundWithin?: number;
  /**
   * Salt water in reach — a coast or an ocean hex.
   *
   * The sea's own want (batch L6a, for Zheng He and Hypatia). A `coast` terrain
   * *weight* already existed and is what Al-Ma'mun's mild coast is written with,
   * but a weight is capped and a need is not, and a figure whose whole identity
   * is a fleet may not be seated a fortnight's march from water. Asked at radius
   * 1 it means "this town will have a harbour".
   *
   * A lake is deliberately not salt water: it floats no fleet out of the bay,
   * and the figure who wants one says `lakeWithin`.
   */
  coastalWithin?: number;
  /**
   * A lake hex in reach.
   *
   * Its own want rather than a face of `riverOrFloodplainWithin` (batch L6a, for
   * Nezahualcoyotl), because the two are different places: the valley want is
   * about moving water and the ground it lays down, and a lake is a basin with a
   * shore — which is what the engineer of the dikes of Texcoco was standing on.
   * A figure who wants both says both, and Nezahualcoyotl does.
   */
  lakeWithin?: number;
}

/** Every want key, in the order they are asked and printed. */
export const START_WANT_KEYS: readonly (keyof StartWants)[] = [
  'mountainWithin',
  'riverWithin',
  'riverOrFloodplainWithin',
  'aridWithin',
  'aridBeside',
  'grasslandWithin',
  'pastureGroundWithin',
  'coastalWithin',
  'lakeWithin',
];

/** What a want's one number counts: how far away, or how many of them. */
export type StartWantMeasure = 'radius' | 'count';

/**
 * Which of the two each want is — declared beside the vocabulary rather than
 * switched on where it is read.
 *
 * One table, three readers: the chooser (`siteMeetsWants`), the lobby's tick
 * line, and the reference's own sync test. A want added without a row here fails
 * to compile, which is the same bargain `START_WANT_KEYS` makes about spelling.
 */
export const START_WANT_MEASURE: Readonly<Record<keyof StartWants, StartWantMeasure>> = {
  mountainWithin: 'radius',
  riverWithin: 'radius',
  riverOrFloodplainWithin: 'radius',
  aridWithin: 'radius',
  aridBeside: 'count',
  grasslandWithin: 'radius',
  pastureGroundWithin: 'radius',
  coastalWithin: 'radius',
  lakeWithin: 'radius',
};

/**
 * How many wants a seat carries — the key to the seating order.
 *
 * The seats with the most needs choose first (`chooseStartPositionsFor`), so a
 * figure with two hard wants is not left picking over what four flexible seats
 * have already taken. A count rather than a weighting because the question is
 * "how constrained is this chair", and a chair with two needs is more
 * constrained than a chair with one however the needs are phrased.
 */
export function wantCount(bias: StartBias | undefined): number {
  const wants = bias?.wants;
  if (!wants) return 0;
  return START_WANT_KEYS.filter((key) => wants[key] !== undefined).length;
}

/**
 * Does this furnishing entry name this resource row?
 *
 * The one rule, read by the pass that plants (`ensureStartFurnishing`), the
 * report that prints what is standing there, and the tests. Improvement kinds
 * and resource ids share no name, so one string decides it.
 */
export function furnishMatches(entry: FurnishEntry, id: ResourceId): boolean {
  return entry === id || improvementForResource(id) === entry;
}

// --- the two abilities -------------------------------------------------------

/**
 * **One of a figure's two abilities** (batch L6a, `docs/leaders.md` "The
 * thirteen" — the table is the spec of record and a sync test holds the two
 * together).
 *
 * A card in all but class: a name, the rule in words, and a list of ordinary
 * `CardEffect`s. There is no column, no age, no cost and nothing to choose — an
 * ability is simply *true* for the seat from the turn it sits down, which is the
 * whole of what the second cut changed. The vocabulary is the cards' for the
 * reason it always was: a figure's line is folded, described, appraised and
 * printed by exactly the machinery that folds a doctrine's.
 *
 * `id` is the figure-local key the Compendium anchors on and the describers name
 * the ability by; it is unique across the whole sheet (checked at load), so a
 * screen may hold one without holding the figure beside it.
 *
 * A clause the vocabulary cannot yet say goes in `deferred`, never bent into a
 * near-fit — the rule that repeats across beliefs, legacies and wonders.
 */
export interface LeaderAbility {
  id: LeaderAbilityId;
  /** The name the table gives it, in italics there. */
  name: string;
  /** The ratified rules text, for the screen. The effects are the truth. */
  text: string;
  /** Live for as long as the seat plays this figure — which is always. */
  effects: CardEffect[];
  /** Named halves of the text that are deliberately absent. Player prose. */
  deferred?: string[];
  /** Something to know about a clause that *is* here. Player prose. */
  note?: string;
}

/**
 * **Every ability the sheet names**, written down.
 *
 * Written rather than derived, and for `BuildingId`'s reason exactly: a JSON
 * module widens a string *value* to `string` (only its keys stay literal), so a
 * union inferred off `abilities` would be `string` and would swallow every other
 * `CardId` with it. The load validator below checks this union against the sheet
 * in both directions.
 */
export type LeaderAbilityId =
  // Pachacuti
  | 'qhapaqNan'
  | 'goldOfThePeaks'
  // Emperor Taizong
  | 'theMandate'
  | 'garrisonTowns'
  // Modu Chanyu
  | 'steppeRiders'
  | 'theHerds'
  // Akhenaten
  | 'greatWorks'
  | 'nilesGift'
  // Al-Ma'mun
  | 'mutazila'
  | 'theHouseOfWisdom'
  // Mithridates VI
  | 'poisonKing'
  | 'grovesAndHunt'
  // Joan of Arc
  | 'theVoices'
  | 'theMaid'
  // Mansa Musa
  | 'goldOfWangara'
  | 'theHajj'
  // Zheng He
  | 'treasureFleet'
  | 'tributeOfTheWesternOcean'
  // Nezahualcoyotl
  | 'theDikes'
  | 'flowerAndSong'
  // Hypatia
  | 'theMuseion'
  | 'theCommentaries'
  // Hildegard of Bingen
  | 'theRites'
  | 'symphonia'
  // Ibn Battuta
  | 'guestAtEveryCourt'
  | 'theRihla';

/**
 * **The two colours a figure wears** (batch H7, `docs/flags.md` (oooo); the table
 * "## The colours" in `docs/leaders.md` is the spec of record and a sync test
 * holds the two together).
 *
 * Civ's reading, and it is the whole of what the pair means: the **primary** is
 * the *field* — the territory line, the sculpt of a piece, a banner's rim, a
 * canton's ground — and the **secondary** is the *device and the trim* — the
 * charge on the canton, a piece's outline, the border's inner stitch. Nothing
 * else in the game decides which of the two a surface takes; a surface asks
 * `seatInks` (`src/art/seatInks.ts`) and paints the answer.
 *
 * `names` is the pair said in words, for the shelf that prints "Its colours are
 * maroon and sun gold". It is carried on the row rather than derived from the
 * hexes because "sun gold" is not a thing arithmetic can recover from `#e0b21a`,
 * and the words are the doc's own first cell — sync-tested beside the hexes.
 *
 * **Presentational, all the way down.** The simulation never reads either hex:
 * a figure's pair reaches a game by being copied onto the seat's spec at the
 * table (`seatLeaders`), exactly as a charge is, and `PlayerSpec.color` /
 * `PlayerSpec.secondary` are what every surface then reads. See the Heraldry
 * trap in `CLAUDE.md`: config, never state.
 */
export interface LeaderColors {
  /** The field. A `#rrggbb` string; validated at load. */
  primary: string;
  /** The device and the trim. A `#rrggbb` string; validated at load. */
  secondary: string;
  /** The pair in words, primary first — the doc table's own first cells. */
  names: [string, string];
}

/** A `#rrggbb` string and nothing else. The one shape a colour row may take. */
const HEX_COLOR = /^#[0-9a-f]{6}$/;

export interface LeaderDef {
  /** The figure's name, as every surface prints it. */
  name: string;
  /**
   * **The towns this figure founds**, in order of importance — the empire it
   * ruled, or the age it ruled in (`docs/flags.md` (pppp)).
   *
   * Fifteen or so a figure, and the table in `docs/leaders.md` "The cities" is
   * the spec of record: the rows are the user's to retune and a sync test holds
   * the doc and the sheet together. Read by `nextCityName` alone, which walks
   * this list ahead of the plain one and skips any name a standing town already
   * wears — so an empire under a figure is named after the empire, and the
   * invented list is the fallback for a seat sitting under nobody.
   *
   * Data, like everything else on a row: a fourteenth figure is fifteen more
   * strings and no edit here.
   */
  cities: readonly string[];
  /** The two inks this figure's seat wears. See `LeaderColors`. */
  colors: LeaderColors;
  startBias: StartBias;
  /**
   * **The two lines this seat holds from the first turn.** Exactly two — the
   * table's own count, checked at load, and the reason the landing screen fits a
   * whole figure in four lines.
   */
  abilities: [LeaderAbility, LeaderAbility];
  /**
   * **The soldier nobody else may raise**, and **the second thing nobody else
   * may raise** — a building, or a work of the ground.
   *
   * A declaration and not a rule: the row itself carries `unlockedByLeader`, and
   * `isUnlocked` (`tech.ts`) asks this pair whether *this* seat's figure names
   * the row before it asks the tree whether the technology has come. So a unique
   * arrives when its technology does — the one gate every other row already
   * passes through — and a row named by nobody is simply a bench.
   *
   * **The second may be an improvement** (batch L8, `docs/flags.md` (bbbbb)).
   * The user, playtesting Pachacuti: *"originally, i was imagining that
   * terraces would be a unique farm, not a building in the city"* — so a figure
   * carries a unit and **at least one** of a hall and a work of the ground, the
   * validator says exactly that, and the one figure who trades his hall for a
   * field has `improvement` where the other twelve have `building`. Three kinds
   * of unique, one rule each way round: no row is claimed by two figures, and
   * every row a figure claims carries its own `unlockedByLeader`.
   */
  unit: UnitTypeId;
  building?: BuildingId;
  /** The work of the ground nobody else may lay. See `building` above. */
  improvement?: ImprovementId;
  /**
   * The device on the canton, or absent for the seat-order fallback.
   *
   * Uninterpreted config beside `colors`, exactly as `PlayerSpec.charge` is —
   * see the Heraldry trap in `CLAUDE.md`. No figure carries one today; the field
   * is here so that giving one a device is a JSON edit.
   */
  charge?: string;
}

interface LeaderTable {
  leaders: Record<string, LeaderDef>;
}

const LEADER_DATA = leadersJson as unknown as LeaderTable;

/**
 * Every figure the sheet names — read off the JSON's keys, exactly as
 * `ResourceId` is, so a seventh leader is a new member of this type with no
 * edit here.
 */
export type LeaderId = keyof typeof leadersJson.leaders & string;

/** Every leader id, in sheet order. The roster's own order. */
export const LEADER_IDS: readonly LeaderId[] = Object.keys(LEADER_DATA.leaders) as LeaderId[];

export function isLeaderId(value: unknown): value is LeaderId {
  return typeof value === 'string' && value in LEADER_DATA.leaders;
}

export function leaderDef(id: LeaderId): LeaderDef {
  const def = LEADER_DATA.leaders[id];
  if (!def) throw new Error(`Unknown leader "${id}"`);
  return def;
}

/** The bias a seat carries, or `undefined` when it sits under no figure at all. */
export function startBiasOf(leader: LeaderId | undefined): StartBias | undefined {
  return leader === undefined ? undefined : leaderDef(leader).startBias;
}

/**
 * **Every ability, by id**, and which figure holds it.
 *
 * Built off the sheet at load, and the register the validator checks
 * `LeaderAbilityId` against in both directions: an ability added to
 * `data/leaders.json` and not to the union is a boot error rather than a line
 * nothing can name.
 */
const LEADER_ABILITIES = new Map<string, { ability: LeaderAbility; leader: LeaderId }>();
for (const leader of LEADER_IDS) {
  for (const ability of leaderDef(leader).abilities) {
    LEADER_ABILITIES.set(ability.id, { ability, leader });
  }
}

/** Every ability id, in sheet order: by figure, then first line and second. */
export const LEADER_ABILITY_IDS: readonly LeaderAbilityId[] = LEADER_IDS.flatMap((leader) =>
  leaderDef(leader).abilities.map((ability) => ability.id),
);

export function isLeaderAbilityId(value: unknown): value is LeaderAbilityId {
  return typeof value === 'string' && LEADER_ABILITIES.has(value);
}

export function leaderAbility(id: LeaderAbilityId): LeaderAbility {
  const held = LEADER_ABILITIES.get(id);
  if (!held) throw new Error(`Unknown leader ability "${id}"`);
  return held.ability;
}

/** Which figure's sheet holds this ability. For the book and the spectator. */
export function leaderAbilityHome(id: LeaderAbilityId): LeaderId {
  const held = LEADER_ABILITIES.get(id);
  if (!held) throw new Error(`Unknown leader ability "${id}"`);
  return held.leader;
}

/**
 * **Does this figure's sheet name this row?** The whole of a unique's gate.
 *
 * Asked by `isUnlocked` (`tech.ts`) of a row carrying `unlockedByLeader`, and by
 * nothing else. A row nobody names answers `false` for every seat, which is what
 * a bench is: the Tambo and the Qollqa and the rest of the first cut's pieces
 * keep their rules and their prices and wait for a figure to claim them.
 */
export function leaderOpensUnit(leader: LeaderId | undefined, type: UnitTypeId): boolean {
  return leader !== undefined && leaderDef(leader).unit === type;
}

export function leaderOpensBuilding(leader: LeaderId | undefined, id: BuildingId): boolean {
  return leader !== undefined && leaderDef(leader).building === id;
}

/**
 * The third kind's gate (batch L8), asked by `improvementLeaderError`
 * (`improvements.ts`) and by nothing else. A figure with no `improvement` on its
 * sheet answers `false` for every row, which is what the twelve who keep a hall
 * are: they open no ground of their own.
 */
export function leaderOpensImprovement(
  leader: LeaderId | undefined,
  id: ImprovementId,
): boolean {
  return leader !== undefined && leaderDef(leader).improvement === id;
}

/**
 * **Whose ground this is**, for the one sentence a refusal prints: the name of
 * the figure whose sheet claims this row, or `null` for a row on the bench.
 *
 * Read off the sheet rather than written into the refusal, so the day a row
 * changes hands the sentence follows it — and so that a row parked for a figure
 * nobody has drawn yet is refused honestly rather than credited to somebody.
 */
export function leaderThatOpensImprovement(id: ImprovementId): string | null {
  for (const leader of LEADER_IDS) {
    if (leaderDef(leader).improvement === id) return leaderDef(leader).name;
  }
  return null;
}

/**
 * **What age opens a unit the tree does not name**, or `undefined` when nothing
 * in the tables says.
 *
 * The user's ruling of 2026-09-11 (`docs/flags.md` (qqqq), point 3): *"a unit no
 * technology names is priced by the age of the row that opens it"*. `unitUpkeep`
 * (`upkeep.ts`) charges an army by the age of its unlocking node — "the price is
 * the age", its own docblock — and a figure's unique has no node at all, so
 * every one of them was free to keep. This is the second source that reading
 * falls to, and the whole of what it adds.
 *
 * One clause now, where the first cut had two: **the age the row's own column
 * belongs to** — the band `techAgeBands` puts that column in. This is
 * `docs/production-costs.md`'s reading of the same field said one ledger over: a
 * row the tree does not name is already *priced* in hammers off its own `column`
 * (`priceColumn` in `cities.ts`), and a column is a position in the tree whether
 * or not a node stands on it. It answers for every `unlockedByLeader` row, for
 * the Templars whom a belief opens and no belief dates, and for the parked hulls
 * (`awaitsTech`) the tree has yet to reach.
 *
 * The deck row that used to sit ahead of it is gone with the deck (batch L6a).
 * It said the same thing twice for a unique — every one of them carried a column
 * of its own as well, because the price fold has always needed one — and there
 * is no longer anything that dates a row except the row.
 *
 * It deliberately does **not** ask the tree first. The tree is `unitUpkeep`'s
 * own first clause and stays there — this function's whole contract is "the
 * technology said nothing; who else did?" — so there is one statement of the
 * standard reading and one of the fallback, and neither is a copy of the other.
 *
 * **Why it lives here.** The roster and the chart are leaves this module already
 * imports. Anywhere else — `unitData.ts`, `techData.ts` — would have to import
 * `leaderData.ts`, which imports both of them back, and the cycle would come out
 * empty under the dev server's module runner (CLAUDE.md's trap). `upkeep.ts` is
 * downstream of all three and imports this by name.
 *
 * Memoised off the tables, which never move at runtime: `explainUnitUpkeep`
 * prices every piece an empire holds every turn, and a rebuild of the chart's
 * bands per soldier is a sweep nobody asked for.
 */
export function ageThatOpens(type: UnitTypeId): TechAge | undefined {
  openerAges ??= computeOpenerAges();
  return openerAges.get(type);
}

let openerAges: Map<UnitTypeId, TechAge> | null = null;

function computeOpenerAges(): Map<UnitTypeId, TechAge> {
  const ages = new Map<UnitTypeId, TechAge>();
  for (const type of UNIT_TYPE_IDS) {
    const column = unitDef(type).column;
    if (column === undefined) continue;
    const age = ageOfColumn(column);
    if (age !== undefined) ages.set(type, age);
  }
  return ages;
}

/**
 * Which age owns a column of the chart.
 *
 * `techAgeBands` is the reading of record — the ages own disjoint runs of
 * columns by construction since the banding — and a column past the last run
 * belongs to the last age there is: a row parked beyond the tree's edge
 * (`awaitsTech`) is a row of the furthest age the game has, not a row of no age.
 */
function ageOfColumn(column: number): TechAge | undefined {
  const bands = techAgeBands();
  for (const band of bands) if (column >= band.from && column <= band.to) return band.age;
  return bands[bands.length - 1]?.age;
}

/**
 * An ability as a card, for `anyCardDef` and every describer behind it.
 *
 * The conversion is the whole reason an ability is written in the card
 * vocabulary: the Ledger, the Compendium and the bot's appraisal all read a
 * figure's line through the machinery that reads a doctrine's, and none of them
 * learns the word "leader" to do it. No `flavor` — an ability is a rule a seat
 * holds rather than a card it was dealt, and the figure's own page carries
 * whatever there is to say about it.
 */
export function leaderAbilityDef(id: LeaderAbilityId): CardDefBase {
  const ability = leaderAbility(id);
  const def: CardDefBase = {
    name: ability.name,
    flavor: '',
    text: ability.text,
    effects: ability.effects,
  };
  if (ability.deferred !== undefined) def.deferred = ability.deferred;
  if (ability.note !== undefined) def.note = ability.note;
  return def;
}

/**
 * **Both of a figure's lines, folded into one law.**
 *
 * `liveEffects`' leader source asks this and nothing else, so "a figure is its
 * two abilities" is stated once. The uniques are deliberately *not* here: a
 * unique is a gate on a row (`leaderOpensUnit`), never an `unlocksUnit` effect
 * in the ledger, because the row's own technology still has to arrive and an
 * effect in the law would say it had already.
 */
export function leaderAbilityEffects(leader: LeaderId): CardEffect[] {
  return leaderDef(leader).abilities.flatMap((ability) => ability.effects);
}

/** Does this bias ask the world for anything? An empty one is not a bias. */
export function biasIsEmpty(bias: StartBias | undefined): boolean {
  if (!bias) return true;
  return (
    Object.keys(bias.terrain ?? {}).length === 0 &&
    Object.keys(bias.resources ?? {}).length === 0 &&
    Object.keys(bias.luxuries ?? {}).length === 0 &&
    (bias.furnish ?? []).length === 0 &&
    wantCount(bias) === 0
  );
}

// --- the load validator -------------------------------------------------------
// At module load, so a sheet that names a terrain nobody has heard of is a boot
// error. A weight that silently never fires is the failure mode this whole file
// exists to prevent: a designer would read the row and believe it.
for (const id of LEADER_IDS) {
  const def = LEADER_DATA.leaders[id]!;
  const where = `leaders.json: ${id}`;
  if (typeof def.name !== 'string' || def.name.length === 0) {
    throw new Error(`${where} has no name`);
  }
  // **The towns.** A figure with no list would silently fall through to the
  // invented names and twin with every other leaderless seat, which is the very
  // thing (pppp) ruled against — so an empty list is a boot error. A name twice
  // in one row is the same failure quieter: `nextCityName` skips a name already
  // standing, so the duplicate could never be reached and the row would read as
  // fifteen towns while founding fourteen.
  if (!Array.isArray(def.cities) || def.cities.length === 0) {
    throw new Error(`${where} names no cities`);
  }
  const seen = new Set<string>();
  for (const city of def.cities) {
    if (typeof city !== 'string' || city.length === 0) {
      throw new Error(`${where} names a city that is not a name`);
    }
    if (seen.has(city)) throw new Error(`${where} names the city "${city}" twice`);
    seen.add(city);
  }
  // The pair, checked here for the same reason a terrain key is: a colour that
  // is not a colour reaches the board as `NaN` and paints black, and nobody
  // would find it. Lower-cased hex only — `playerPieceColor`'s table is keyed
  // that way, and a `#ABC` or a `rebeccapurple` would fall silently through to
  // the seat's palette ink and look like the figure had no colours at all.
  const colors = def.colors;
  if (!colors || typeof colors !== 'object') throw new Error(`${where} wears no colours`);
  for (const half of ['primary', 'secondary'] as const) {
    const hex = colors[half];
    if (typeof hex !== 'string' || !HEX_COLOR.test(hex)) {
      throw new Error(`${where} wears "${String(hex)}" as its ${half}, which is no colour`);
    }
  }
  if (colors.primary === colors.secondary) {
    throw new Error(`${where} wears one colour twice — a device in the field's own ink`);
  }
  if (
    !Array.isArray(colors.names) ||
    colors.names.length !== 2 ||
    colors.names.some((word) => typeof word !== 'string' || word.length === 0)
  ) {
    throw new Error(`${where} does not say its colours in words`);
  }
  const bias = def.startBias ?? {};
  for (const key of Object.keys(bias.terrain ?? {})) {
    if (!START_BIAS_KEYS.includes(key as StartBiasKey)) {
      throw new Error(`${where} weights unknown ground "${key}"`);
    }
  }
  for (const key of Object.keys(bias.resources ?? {})) {
    if (!RESOURCE_IDS.includes(key as ResourceId)) {
      throw new Error(`${where} names unknown resource "${key}"`);
    }
    if (resourceDef(key as ResourceId).kind === 'luxury') {
      // A luxury is *dealt* per continent and never scattered on its own, so a
      // multiplier here would be a number nothing reads. It belongs in
      // `luxuries`, which is the deal's own dial.
      throw new Error(`${where} biases the luxury "${key}" in resources`);
    }
  }
  for (const key of Object.keys(bias.luxuries ?? {})) {
    if (!RESOURCE_IDS.includes(key as ResourceId)) {
      throw new Error(`${where} names unknown luxury "${key}"`);
    }
    if (resourceDef(key as ResourceId).kind !== 'luxury') {
      throw new Error(`${where} biases the non-luxury "${key}" in luxuries`);
    }
  }
  for (const entry of bias.furnish ?? []) {
    // Asked of the table rather than of a list of names here: an entry is worth
    // furnishing only if some row answers to it — a kind that opens one, or a
    // row by its own name — and that mapping is `improvements.json`'s.
    const opens = RESOURCE_IDS.some((resource) => furnishMatches(entry, resource));
    if (!opens) throw new Error(`${where} furnishes "${entry}", which names no resource`);
  }
  for (const key of Object.keys(bias.wants ?? {})) {
    if (!START_WANT_KEYS.includes(key as keyof StartWants)) {
      throw new Error(`${where} wants unknown ground "${key}"`);
    }
    const within = (bias.wants as Record<string, unknown>)[key];
    if (typeof within !== 'number' || !Number.isFinite(within) || within < 0) {
      throw new Error(`${where} wants "${key}" at no honest distance`);
    }
  }

  // --- the two abilities and the two uniques ---------------------------------
  // The same discipline one field over. A sheet that names a unit nobody has
  // heard of, or a figure with three lines where the second cut promises two, is
  // a boot error rather than a line that quietly never fires.
  const abilities = def.abilities;
  if (!Array.isArray(abilities) || abilities.length !== 2) {
    throw new Error(`${where} does not carry exactly two abilities`);
  }
  for (const ability of abilities) {
    const at = `${where} ability "${ability.id}"`;
    if (!LEADER_ABILITIES.has(ability.id)) throw new Error(`${at} is not in LeaderAbilityId`);
    if (typeof ability.name !== 'string' || ability.name.length === 0) {
      throw new Error(`${at} has no name`);
    }
    if (typeof ability.text !== 'string' || ability.text.length === 0) {
      throw new Error(`${at} prints no rule`);
    }
    if (!Array.isArray(ability.effects)) throw new Error(`${at} has no effects list`);
    // **An ability that does nothing at all says so.** Deferring a whole text is
    // lawful — the vocabulary carries no way to say some of what the sheet wants
    // — but a line that neither acts nor admits to it is a promise the game
    // never keeps, and a player would read the row and believe it.
    if (ability.effects.length === 0 && (ability.deferred ?? []).length === 0) {
      throw new Error(`${at} does nothing and does not say so`);
    }
  }
  // **The uniques, and the marker that makes them uniques.** A row this figure
  // names without `unlockedByLeader` on it is a row the tree opens for everybody
  // — the failure that reads as "my rival built my Gendarme" and that nothing
  // downstream could catch, since `isUnlocked` would never be asked.
  if (!UNIT_TYPE_IDS.includes(def.unit)) {
    throw new Error(`${where} raises the unknown unit "${String(def.unit)}"`);
  }
  if (unitDef(def.unit).unlockedByLeader !== true) {
    throw new Error(`${where} raises "${def.unit}", which is not marked as a figure's own`);
  }
  // **A soldier and at least one of the other two** (batch L8). The second cut
  // promised four lines and the fourth is a thing nobody else may build; which
  // *kind* of thing is the figure's business, and a figure with neither would
  // be a face with a line missing.
  if (def.building === undefined && def.improvement === undefined) {
    throw new Error(`${where} raises nothing but a soldier`);
  }
  if (def.building !== undefined) {
    if (!BUILDING_IDS.includes(def.building)) {
      throw new Error(`${where} raises the unknown building "${String(def.building)}"`);
    }
    if (buildingDef(def.building).unlockedByLeader !== true) {
      throw new Error(`${where} raises "${def.building}", which is not marked as a figure's own`);
    }
  }
  if (def.improvement !== undefined) {
    if (!IMPROVEMENT_IDS.includes(def.improvement)) {
      throw new Error(`${where} lays the unknown improvement "${String(def.improvement)}"`);
    }
    if (improvementDef(def.improvement).unlockedByLeader !== true) {
      throw new Error(`${where} lays "${def.improvement}", which is not marked as a figure's own`);
    }
  }
}

// **One unique, one figure.** Two figures naming the same row would give a
// player a piece they could not account for, and `leaderOpensUnit` would answer
// yes to a seat whose sheet a screen never showed it.
const CLAIMED_UNITS = new Set<string>();
const CLAIMED_BUILDINGS = new Set<string>();
const CLAIMED_IMPROVEMENTS = new Set<string>();
for (const id of LEADER_IDS) {
  const def = LEADER_DATA.leaders[id]!;
  if (CLAIMED_UNITS.has(def.unit)) throw new Error(`two figures raise the unit "${def.unit}"`);
  CLAIMED_UNITS.add(def.unit);
  if (def.building !== undefined) {
    if (CLAIMED_BUILDINGS.has(def.building)) {
      throw new Error(`two figures raise the building "${def.building}"`);
    }
    CLAIMED_BUILDINGS.add(def.building);
  }
  if (def.improvement !== undefined) {
    if (CLAIMED_IMPROVEMENTS.has(def.improvement)) {
      throw new Error(`two figures lay the improvement "${def.improvement}"`);
    }
    CLAIMED_IMPROVEMENTS.add(def.improvement);
  }
}

// One id, one ability. The other direction — a member of `LeaderAbilityId` no
// sheet row carries — is a type, so it is pinned by the register test reading
// this file's own source (`test/sim/leaders.test.ts`).
if (LEADER_ABILITY_IDS.length !== LEADER_ABILITIES.size) {
  throw new Error('leaders.json names the same ability id twice');
}
