/**
 * The leaders: a **start bias**, a **bonus** and a **deck**.
 *
 * `docs/leaders.md` is the sheet — six figures, each with one line that is live
 * from the first turn and four rows of three cards, a passive and a boon and a
 * unique per age — and `docs/flags.md` (dddd) is the ruling that built it. Two
 * halves of one row, and they are read by two different halves of the game:
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
 * **The rules' half** (batch L2a): `bonus` is a list of ordinary `CardEffect`s
 * that is live for the seat from turn one, and `deck` is four rows of three
 * cards — the draft `leaders.ts` deals when the seat's *own* age turns. Both
 * reach the game through `liveEffects`, which is the whole point of writing them
 * in the card vocabulary: a leader's line is read by the same evaluator that
 * reads a doctrine's, and a seventh leader is a JSON row.
 *
 * A row is data and nothing else. The weights, the multipliers, the kinds and
 * every figure on every card live in `data/leaders.json`; the code holds
 * algorithms and no numbers, which is the same division `mapgen.json` and
 * `mapgen.ts` keep.
 *
 * **A leaf.** Nothing here imports a pass or a verb, so the modules that read a
 * bias (`startPositions.ts`, `resources.ts`), the evaluator that folds a bonus
 * and the draft that deals a deck can all name it without closing a load-time
 * cycle. The three imports that would close one — the card vocabulary, the bead
 * boon's shapes and the completion grant's — are **type-only**, which is the
 * arrangement `religionData.ts` already keeps with the evaluator and for the
 * same reason. The validation below runs at module load, so a mistyped terrain,
 * an unknown resource or a card whose `unlocks` names a row nobody has heard of
 * is a boot error rather than a line that silently never fires.
 */

import leadersJson from '../../data/leaders.json';

import type { BeadWindfall } from './beadData';
import { BUILDING_IDS, type BuildingId, type CompletionGrant } from './buildingData';
import { type ImprovementId, improvementForResource } from './improvementData';
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

// --- the deck -----------------------------------------------------------------

/**
 * **Which column of the age's row a card sits in** — and nothing more.
 *
 * A row of the sheet is one passive, one boon and one unique, in that order
 * (`docs/leaders.md`), and this word says which is which so a screen can lay the
 * three out in the three inks without reading the effects. It is deliberately
 * *not* the mechanism: what a card actually does is `effects` (live while held),
 * `boon` (paid once, on the pick) and `unlocks` (a row the seat may now build),
 * and a card may carry more than one of them. The Mit'a is written as a boon and
 * pays a permanent step of authority, because that is what "gain three
 * authority" means in a game where authority is a capacity — bending it into a
 * lump would have been a second, quieter rule about what the column implies.
 */
export type LeaderCardKind = 'passive' | 'boon' | 'unique';

/** The four rows of a deck, keyed as the sheet keys them. */
export type LeaderDeckAge = '1' | '2' | '3' | '4';

/**
 * **What a card hands over the instant it is taken.**
 *
 * The bead's own one-shot vocabulary, reused whole rather than restated: a lump
 * is a `BeadWindfall` (which voice, how much, and which towns — the only shape
 * in the game that can say *a citizen in every city*), and a thing handed over
 * is a `CompletionGrant` (a named piece, a great person, a technology, a draft),
 * which is the union a wonder's completion already speaks. Both are paid through
 * the seams that already pay them (`payWindfall` and `payGrants`), so a leader's
 * boon is announced, banked and settled by exactly the machinery a bead and a
 * wonder go through, and this file learns nothing about baskets.
 *
 * A card with neither is a card whose boon is deferred — `moduHorseLords`, whose
 * text asks for a resource to be revealed and a pasture to be laid, and the
 * vocabulary carries neither. It says so in `deferred` rather than being bent
 * into something adjacent (CLAUDE.md rule 7, and the cards trap's "always defer,
 * never bend").
 */
export interface LeaderBoon {
  /** A lump of a voice, and which towns take it. */
  windfall?: BeadWindfall;
  /** Things handed over — a piece, a name, a technology, a draft. */
  grants?: CompletionGrant[];
}

/** A row this card opens for the seat that took it. See `LeaderCard.unlocks`. */
export interface LeaderUnlocks {
  unit?: UnitTypeId;
  building?: BuildingId;
}

/**
 * One card of one leader's deck.
 *
 * `CardDefBase`'s shape with two fields loosened and three added, and each
 * difference is the deck's own: `effects` is optional (a card whose whole text
 * is deferred declares none), `text` is required (every leader card prints its
 * rule, where a doctrine may not), and `boon`, `unlocks` and `id` are the three
 * things a doctrine has no use for. `leaderCardDef` is the conversion the
 * evaluator's `anyCardDef` reads, so a leader card is described by the same
 * describers that describe an Order.
 */
export interface LeaderCard {
  id: LeaderCardId;
  name: string;
  kind: LeaderCardKind;
  /** One line in the voice of the tech tree's aphorisms. Never a rule. */
  flavor: string;
  /** The ratified rules text, for the screen. The effects are the truth. */
  text: string;
  /** Live for as long as the seat holds the card. Absent is none. */
  effects?: CardEffect[];
  /** Paid once, the turn the card is taken. */
  boon?: LeaderBoon;
  /**
   * The row this card opens — a unit or a building carrying `unlockedByLeader`.
   *
   * The *declaration*, and the `unlocksUnit` / `unlocksBuilding` effect is
   * derived from it (`leaderCardEffects`) rather than written beside it, so
   * there is one place a unique names its row and no way for the two to
   * disagree. Availability is then the ordinary question `isUnlocked` asks of
   * the cards, and nothing in `src/sim/` compares a row against a name.
   */
  unlocks?: LeaderUnlocks;
  /** Named halves of the text that are deliberately absent. Player prose. */
  deferred?: string[];
  /** Something to know about a clause that *is* here. Player prose. */
  note?: string;
}

/** A leader's own line, live from the first turn. See `LeaderDef.bonus`. */
export interface LeaderBonus {
  text: string;
  effects: CardEffect[];
  deferred?: string[];
}

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
   * Data, like everything else on a row: a seventh figure is fifteen more
   * strings and no edit here.
   */
  cities: readonly string[];
  /** The two inks this figure's seat wears. See `LeaderColors`. */
  colors: LeaderColors;
  startBias: StartBias;
  /** The one line this seat holds from turn one, whatever it drafts. */
  bonus: LeaderBonus;
  /** Three cards an age, dealt when *this seat's* age turns. */
  deck: Record<LeaderDeckAge, [LeaderCard, LeaderCard, LeaderCard]>;
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
 * **Every card the six decks hold**, written down.
 *
 * Written rather than derived, and for `BuildingId`'s reason exactly: a JSON
 * module widens a string *value* to `string` (only its keys stay literal), so a
 * union inferred off `deck` would be `string` and would swallow every other
 * `CardId` with it. The load validator below checks this union against the sheet
 * in both directions, so a card added to `data/leaders.json` and not to this
 * list is a boot error rather than a card nothing can name.
 */
export type LeaderCardId =
  // Pachacuti
  | 'pachacutiCorvee'
  | 'pachacutiMita'
  | 'pachacutiTerraces'
  | 'pachacutiQhapaqNan'
  | 'pachacutiMaster'
  | 'pachacutiSlinger'
  | 'pachacutiTribute'
  | 'pachacutiStorehouses'
  | 'pachacutiTambo'
  | 'pachacutiHighlands'
  | 'pachacutiLevy'
  | 'pachacutiQollqa'
  // Emperor Taizong
  | 'taizongYangtze'
  | 'taizongMandate'
  | 'taizongFubing'
  | 'taizongGarrisons'
  | 'taizongXuanwu'
  | 'taizongExamination'
  | 'taizongKhagan'
  | 'taizongTribute'
  | 'taizongCavalry'
  | 'taizongPoets'
  | 'taizongMuster'
  | 'taizongPostRoad'
  // Modu Chanyu
  | 'moduHerds'
  | 'moduHorseLords'
  | 'moduWhistlingArrow'
  | 'moduRaiders'
  | 'moduGreatRaid'
  | 'moduHordeCamp'
  | 'moduSkyRite'
  | 'moduGeneral'
  | 'moduHorseArcher'
  | 'moduTribute'
  | 'moduSilk'
  | 'moduGuard'
  // Akhenaten
  | 'akhenatenRites'
  | 'akhenatenVoice'
  | 'akhenatenObelisk'
  | 'akhenatenDesert'
  | 'akhenatenCourt'
  | 'akhenatenKhopesh'
  | 'akhenatenMillions'
  | 'akhenatenWorks'
  | 'akhenatenSunCourt'
  | 'akhenatenFaithful'
  | 'akhenatenConversion'
  | 'akhenatenValley'
  // Al-Ma'mun
  | 'almamunDevotion'
  | 'almamunNewCity'
  | 'almamunHouse'
  | 'almamunTranslators'
  | 'almamunAlmagest'
  | 'almamunMihna'
  | 'almamunMutazila'
  | 'almamunPurse'
  | 'almamunCamel'
  | 'almamunOrdinance'
  | 'almamunEnquiry'
  | 'almamunPaperMill'
  // Mithridates VI
  | 'mithridatesGroves'
  | 'mithridatesCourt'
  | 'mithridatesPeltast'
  | 'mithridatesFriends'
  | 'mithridatesPhysician'
  | 'mithridatesMithridatium'
  | 'mithridatesRoads'
  | 'mithridatesGeneral'
  | 'mithridatesChariot'
  | 'mithridatesPoison'
  | 'mithridatesTongues'
  | 'mithridatesHold';

/** The four rows, in order. Iteration order for every walk over a deck. */
export const LEADER_DECK_AGES: readonly LeaderDeckAge[] = ['1', '2', '3', '4'];

/** The row of a leader's deck an age asks for. `TechAge` is the same four. */
export function deckAgeOf(age: TechAge): LeaderDeckAge {
  return String(age) as LeaderDeckAge;
}

/** Every leader card, in sheet order: by leader, then by age, then by column. */
export const LEADER_CARD_IDS: readonly LeaderCardId[] = LEADER_IDS.flatMap((leader) =>
  LEADER_DECK_AGES.flatMap((age) => leaderDef(leader).deck[age].map((card) => card.id)),
);

const LEADER_CARDS = new Map<string, { card: LeaderCard; leader: LeaderId; age: LeaderDeckAge }>();
for (const leader of LEADER_IDS) {
  for (const age of LEADER_DECK_AGES) {
    for (const card of leaderDef(leader).deck[age]) LEADER_CARDS.set(card.id, { card, leader, age });
  }
}

export function isLeaderCardId(value: unknown): value is LeaderCardId {
  return typeof value === 'string' && LEADER_CARDS.has(value);
}

export function leaderCard(id: LeaderCardId): LeaderCard {
  const held = LEADER_CARDS.get(id);
  if (!held) throw new Error(`Unknown leader card "${id}"`);
  return held.card;
}

/** Which figure's deck holds this card, and which of its four rows. */
export function leaderCardHome(id: LeaderCardId): { leader: LeaderId; age: LeaderDeckAge } {
  const held = LEADER_CARDS.get(id);
  if (!held) throw new Error(`Unknown leader card "${id}"`);
  return { leader: held.leader, age: held.age };
}

/**
 * **What age opens a unit the tree does not name**, or `undefined` when nothing
 * in the tables says.
 *
 * The user's ruling of 2026-09-11 (`docs/flags.md` (qqqq), point 3): *"a unit no
 * technology names is priced by the age of the row that opens it"*. `unitUpkeep`
 * (`upkeep.ts`) charges an army by the age of its unlocking node — "the price is
 * the age", its own docblock — and a leader's unique has no node at all, so
 * every one of the ten was free to keep. This is the second source that reading
 * falls to, and the whole of what it adds.
 *
 * Two clauses, in precedence, and each is a different sentence:
 *
 *   · **the deck row that hands the piece over** (`leaderCardHome(card).age`).
 *     The most particular answer there is: the Fubing is an Æra I card of
 *     Taizong's deck, so the Fubing is an Æra I soldier and costs what an Æra I
 *     spearman costs. A card says *when* it is dealt, which is exactly the
 *     statement a technology makes about the row it unlocks;
 *   · **the age the row's own column belongs to** — the band `techAgeBands`
 *     puts that column in. This is `docs/production-costs.md`'s reading of the
 *     same field said one ledger over: a row the tree does not name is already
 *     *priced* in hammers off its own `column` (`priceColumn` in `cities.ts`),
 *     and a column is a position in the tree whether or not a node stands on it.
 *     It answers for the Templars, whom a belief opens and no belief dates, and
 *     for the parked hulls (`awaitsTech`) the tree has yet to reach.
 *
 * It deliberately does **not** ask the tree first. The tree is `unitUpkeep`'s
 * own first clause and stays there — this function's whole contract is "the
 * technology said nothing; who else did?" — so there is one statement of the
 * standard reading and one of the fallback, and neither is a copy of the other.
 *
 * **Why it lives here.** The decks are this module's; the roster and the chart
 * are leaves it already imports. Anywhere else — `unitData.ts`, `techData.ts` —
 * would have to import `leaderData.ts`, which imports both of them back, and the
 * cycle would come out empty under the dev server's module runner (CLAUDE.md's
 * trap). `upkeep.ts` is downstream of all three and imports this by name.
 *
 * Memoised off the tables, which never move at runtime: `explainUnitUpkeep`
 * prices every piece an empire holds every turn, and a walk of the decks and a
 * rebuild of the chart's bands per soldier is a sweep nobody asked for.
 */
export function ageThatOpens(type: UnitTypeId): TechAge | undefined {
  openerAges ??= computeOpenerAges();
  return openerAges.get(type);
}

let openerAges: Map<UnitTypeId, TechAge> | null = null;

function computeOpenerAges(): Map<UnitTypeId, TechAge> {
  const ages = new Map<UnitTypeId, TechAge>();
  // The column band first, so a deck row below overwrites it: the card that
  // hands a piece over is the more particular answer, and a unique carries both
  // a deck row and a column of its own.
  for (const type of UNIT_TYPE_IDS) {
    const column = unitDef(type).column;
    if (column === undefined) continue;
    const age = ageOfColumn(column);
    if (age !== undefined) ages.set(type, age);
  }
  for (const id of LEADER_CARD_IDS) {
    const opened = leaderCard(id).unlocks?.unit;
    if (opened === undefined) continue;
    ages.set(opened, Number(leaderCardHome(id).age) as TechAge);
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
 * **Everything a held card puts into the law**, effects and unlock together.
 *
 * The one reading, and the reason `unlocks` is a declaration rather than a
 * second copy of an effect: a unique's row is named once on the card and the
 * `unlocksUnit` / `unlocksBuilding` shape is composed here, so `cardUnlocksUnit`
 * answers a leader's card by walking the same list it walks for a belief and
 * `isUnlocked` never learns the word "leader".
 *
 * Composed fresh each call rather than memoised: the lists are three deep and
 * the memo that matters is `liveEffects`', one level up, keyed on the state's
 * own revision.
 */
export function leaderCardEffects(card: LeaderCard): CardEffect[] {
  const list: CardEffect[] = [...(card.effects ?? [])];
  if (card.unlocks?.unit !== undefined) {
    list.push({ kind: 'unlocksUnit', unit: card.unlocks.unit });
  }
  if (card.unlocks?.building !== undefined) {
    list.push({ kind: 'unlocksBuilding', building: card.unlocks.building });
  }
  return list;
}

/** A leader card as a card, for `anyCardDef` and every describer behind it. */
export function leaderCardDef(id: LeaderCardId): CardDefBase {
  const card = leaderCard(id);
  const def: CardDefBase = {
    name: card.name,
    flavor: card.flavor,
    text: card.text,
    effects: leaderCardEffects(card),
  };
  if (card.deferred !== undefined) def.deferred = card.deferred;
  if (card.note !== undefined) def.note = card.note;
  return def;
}

/** A leader's own line as a card, for the same reason `leaderCardDef` exists. */
export function leaderBonusDef(id: LeaderId): CardDefBase {
  const def = leaderDef(id);
  const card: CardDefBase = {
    name: def.name,
    flavor: '',
    text: def.bonus.text,
    effects: def.bonus.effects,
  };
  if (def.bonus.deferred !== undefined) card.deferred = def.bonus.deferred;
  return card;
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

  // --- the deck ---------------------------------------------------------------
  // The same discipline one field over. A card that names a unit nobody has
  // heard of, or a row of two cards where the sheet promises three, is a boot
  // error rather than a draft that quietly deals a hand nobody can answer.
  if (typeof def.bonus?.text !== 'string' || def.bonus.text.length === 0) {
    throw new Error(`${where} has no bonus text`);
  }
  if (!Array.isArray(def.bonus.effects)) throw new Error(`${where} has no bonus effects`);
  for (const age of LEADER_DECK_AGES) {
    const row = def.deck?.[age];
    if (!Array.isArray(row) || row.length !== 3) {
      throw new Error(`${where} deals no three cards in Æra ${age}`);
    }
    // The columns are the sheet's own order — a passive, a boon, a unique —
    // because a screen lays the three out in three inks and reads the order
    // rather than searching the row for a kind.
    const kinds = row.map((card) => card.kind).join(',');
    if (kinds !== 'passive,boon,unique') {
      throw new Error(`${where} Æra ${age} is dealt as ${kinds}`);
    }
    for (const card of row) {
      const at = `${where} card "${card.id}"`;
      if (!LEADER_CARDS.has(card.id)) throw new Error(`${at} is not in LeaderCardId`);
      if (typeof card.name !== 'string' || card.name.length === 0) {
        throw new Error(`${at} has no name`);
      }
      if (typeof card.text !== 'string' || card.text.length === 0) {
        throw new Error(`${at} prints no rule`);
      }
      if (card.unlocks?.unit !== undefined && !UNIT_TYPE_IDS.includes(card.unlocks.unit)) {
        throw new Error(`${at} opens the unknown unit "${card.unlocks.unit}"`);
      }
      if (card.unlocks?.building !== undefined && !BUILDING_IDS.includes(card.unlocks.building)) {
        throw new Error(`${at} opens the unknown building "${card.unlocks.building}"`);
      }
      // **A card that does nothing at all says so.** Deferring a whole text is
      // lawful (the vocabulary carries no way to reveal a resource), but a card
      // that neither acts nor admits to it is a promise the game never keeps.
      const acts =
        (card.effects ?? []).length > 0 ||
        card.unlocks !== undefined ||
        card.boon?.windfall !== undefined ||
        (card.boon?.grants ?? []).length > 0;
      if (!acts && (card.deferred ?? []).length === 0) {
        throw new Error(`${at} does nothing and does not say so`);
      }
    }
  }
}

// One id, one card. The other direction — a member of `LeaderCardId` no sheet
// row carries — is a type, so it is pinned by the register test reading this
// file's own source (`test/sim/leaders.test.ts`).
if (LEADER_CARD_IDS.length !== LEADER_CARDS.size) {
  throw new Error('leaders.json deals the same card id twice');
}
